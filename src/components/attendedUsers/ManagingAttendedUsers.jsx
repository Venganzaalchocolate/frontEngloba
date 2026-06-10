import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/ManagingEmployer.module.css";
import { FaCloudArrowUp, FaSquarePlus, FaUserPlus } from "react-icons/fa6";
import { TbFileTypeXml } from "react-icons/tb";
import { FaEdit, FaEye, FaHistory, FaFileDownload, FaTrashAlt } from "react-icons/fa";
import ExcelJS from "exceljs";

import { useDebounce } from "../../hooks/useDebounce.jsx";
import { useLogin } from "../../hooks/useLogin.jsx";
import { getToken } from "../../lib/serviceToken.js";
import { capitalizeWords } from "../../lib/utils.js";

import ModalForm from "../globals/ModalForm.jsx";
import ModalConfirmation from "../globals/ModalConfirmation";
import FiltersAttendedUsers from "./FiltersAttendedUsers.jsx";
import FormAttendedUser from "./FormAttendedUser.jsx";
import { NATIONALITIES, getNationalityLabel } from "../../lib/nationalities.js";

import {
  attendedUserCreate,
  attendedUserList,
  attendedUserUpdate,
  attendedUserCloseChronology,
  attendedUserImportExcel,
  attendedUserOpenChronology,
  attendedUserGet,
  attendedUserExport,
  attendedUserDelete,
  updateDispositive,
} from "../../lib/data";
import { useMenuWorker } from "../../hooks/useMenuWorker.jsx";

const INITIAL_FILTERS = {
  q: "",
  documentId: "",
  firstName: "",
  lastName: "",
  nationality: "",
  gender: "",
  active: "total",
  onlyActiveStays: "true",
};

const PROTECTED_DATA = ["68aee343f80f1cd5a5de406d"];

const ManagingAttendedUsers = ({
  modal,
  charge,
  enumsData,
  listResponsability = [],
}) => {
  const { logged } = useLogin();
  const { changeMenuWorker } = useMenuWorker();

  const role = logged?.user?.role;
  const isRootOrGlobal = role === "root" || role === "global" || role === "rrhh";

  const importFileInputRef = useRef(null);
  const silentNextLoadRef = useRef(false);
  const [capacityCheckDevice, setCapacityCheckDevice] = useState(null);

  const [scope, setScope] = useState(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState("");

  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  const [formMode, setFormMode] = useState("");
  const [editingDoc, setEditingDoc] = useState(null);

  const [checkDocumentModalOpen, setCheckDocumentModalOpen] = useState(false);
  const [creatingDocumentId, setCreatingDocumentId] = useState("");

  const [scopeModalOpen, setScopeModalOpen] = useState(false);
  const [notesDoc, setNotesDoc] = useState(null);
  const [closeStayDoc, setCloseStayDoc] = useState(null);
  const [openStayDoc, setOpenStayDoc] = useState(null);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  const [deleteDoc, setDeleteDoc] = useState(null);

  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const debouncedFilters = useDebounce(filters, 300);

  const getStayDeviceId = (stay) => {
    if (!stay?.dispositive) return "";

    if (typeof stay.dispositive === "object") {
      return String(stay.dispositive._id || stay.dispositive.id || "");
    }

    return String(stay.dispositive);
  };

  const refId = (value) => {
    if (!value) return "";
    if (typeof value === "object") return String(value._id || value.id || value.value || "");
    return String(value);
  };

  const getFieldValue = (value) => {
    if (!value) return "";
    if (typeof value === "object") return String(value.value || value._id || value.id || "");
    return String(value);
  };

  const formatDate = (date) => {
    if (!date) return "—";
    const d = new Date(date);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-ES");
  };

  const genderLabel = (gender) => {
    switch (gender) {
      case "male":
        return "Hombre";
      case "female":
        return "Mujer";
      case "others":
        return "Otros";
      case "nonBinary":
        return "No binario";
      default:
        return "—";
    }
  };

  const getProgramLabel = (programId) => {
    const id = refId(programId);
    const p = enumsData?.programsIndex?.[id];
    return p?.acronym || p?.name || "—";
  };

  const getDeviceLabel = (deviceId) => {
    const id = refId(deviceId);
    const d = enumsData?.dispositiveIndex?.[id];
    return d?.name || "—";
  };

  const hasModuleAccess = (item, moduleName) =>
    item?.canAccessModuleScope && item?.module === moduleName;

  const hasProgramAccess = (item) =>
    item?.isProgramResponsible ||
    item?.isProgramCoordinator ||
    item?.isProgramSupervisor ||
    (hasModuleAccess(item, "attendedUsers") && item?.scopeType === "program");

  const hasDeviceAccess = (item) =>
    item?.isDeviceResponsible ||
    item?.isDeviceCoordinator ||
    item?.isDeviceSupervisor ||
    (hasModuleAccess(item, "attendedUsers") && item?.scopeType === "dispositive");

  const availableDevices = useMemo(() => {
    const map = new Map();

    if (isRootOrGlobal) {
      Object.entries(enumsData?.dispositiveIndex || {}).forEach(([id, d]) => {
        if (d?.active === false) return;

        const programId = refId(d?.program);

        map.set(id, {
          value: id,
          label: `${d?.name || "Dispositivo"}${programId ? ` [${getProgramLabel(programId)}]` : ""}`,
          programId,
        });
      });

      return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
    }

    listResponsability.forEach((item) => {
      const programId = item?.idProgram ? String(item.idProgram) : "";
      const directDeviceId = item?.dispositiveId ? String(item.dispositiveId) : "";

      if (hasProgramAccess(item) && programId) {
        Object.entries(enumsData?.dispositiveIndex || {}).forEach(([id, d]) => {
          if (d?.active === false) return;
          if (refId(d?.program) !== programId) return;

          map.set(id, {
            value: id,
            label: `${d?.name || "Dispositivo"} [${item.programAcronym || item.programName || getProgramLabel(programId)}]`,
            programId,
          });
        });
      }

      if (hasDeviceAccess(item) && directDeviceId) {
        const d = enumsData?.dispositiveIndex?.[directDeviceId];
        const deviceProgramId = refId(d?.program) || programId;

        map.set(directDeviceId, {
          value: directDeviceId,
          label: `${d?.name || item.dispositiveName || "Dispositivo"} [${item.programAcronym || item.programName || getProgramLabel(deviceProgramId)}]`,
          programId: deviceProgramId,
        });
      }
    });

    return [...map.values()].sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [isRootOrGlobal, enumsData, listResponsability]);

  const allowedDeviceIds = useMemo(
    () => availableDevices.map((d) => d.value),
    [availableDevices]
  );

  const allowedDeviceIdsKey = useMemo(
    () => allowedDeviceIds.join("|"),
    [allowedDeviceIds]
  );

  const selectedDeviceName = selectedDeviceId ? getDeviceLabel(selectedDeviceId) : "";

  const selectedDevice = selectedDeviceId
    ? enumsData?.dispositiveIndex?.[selectedDeviceId]
    : null;

  const selectedDeviceProgramId = refId(selectedDevice?.program);

  const isProtectedSelectedDevice = PROTECTED_DATA.includes(selectedDeviceProgramId);

  const getProtectedDeviceCode = () => {
    const code =
      selectedDevice?.acronym ||
      selectedDevice?.code ||
      selectedDevice?.name ||
      "DISPOSITIVO";

    return String(code)
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .slice(0, 12);
  };

  const buildProtectedDocumentId = () => {
    const random = Math.random().toString(36).slice(2, 7).toUpperCase();
    return `${getProtectedDeviceCode()}-${Date.now()}-${random}`;
  };

  const applyProtectedDataIfNeeded = (payload) => {
    if (!isProtectedSelectedDevice || formMode !== "create") return payload;

    return {
      ...payload,
      documentId: payload.documentId || buildProtectedDocumentId(),
      firstName: "Anónimo",
      lastName: "Anónimo",
    };
  };

  const selectedDeviceCapacity = Number.isFinite(Number(selectedDevice?.serviceType?.capacity))
    ? Number(selectedDevice.serviceType.capacity)
    : 0;

  const isSelectedDeviceResidential = Boolean(selectedDevice?.serviceType?.residencial);

  const attendedUsersCount = items.filter((item) => item.visibleStayIsActive).length;

  const availablePlaces =
    isSelectedDeviceResidential && selectedDeviceCapacity > 0
      ? Math.max(selectedDeviceCapacity - attendedUsersCount, 0)
      : null;

  const scopeReady = !!scope && (scope === "all" || !!selectedDeviceId);
  const canCreateOrImport = scope === "device" && !!selectedDeviceId;
  const canOpenStay = availableDevices.length > 0;

  const filtersPayload = useMemo(() => {
    const payload = {
      q: debouncedFilters.q || undefined,
      documentId: debouncedFilters.documentId || undefined,
      firstName: debouncedFilters.firstName || undefined,
      lastName: debouncedFilters.lastName || undefined,
      nationality: debouncedFilters.nationality || undefined,
      gender: debouncedFilters.gender || undefined,
      onlyActiveStays: debouncedFilters.onlyActiveStays === "true",
    };

    if (debouncedFilters.active === "active") payload.active = true;
    if (debouncedFilters.active === "inactive") payload.active = false;

    if (scope === "device") {
      payload.dispositive = selectedDeviceId;
    }

    if (scope === "all") {
      payload.allowedDispositiveIds = allowedDeviceIdsKey
        ? allowedDeviceIdsKey.split("|")
        : [];
    }

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined || payload[key] === "") delete payload[key];
    });

    return payload;
  }, [debouncedFilters, scope, selectedDeviceId, allowedDeviceIdsKey]);

  const normalizeDoc = (doc) => {
    const stays = Array.isArray(doc?.stays) ? doc.stays : [];

    const activeStays = stays.filter((s) => s?.active);

    const scopedActiveStay =
      selectedDeviceId
        ? stays.find((s) => s?.active && getStayDeviceId(s) === String(selectedDeviceId))
        : null;

    const scopedLastStay =
      selectedDeviceId
        ? [...stays].reverse().find((s) => getStayDeviceId(s) === String(selectedDeviceId))
        : null;

    const lastActiveStay = activeStays[0] || null;
    const lastStay = stays[stays.length - 1] || null;

    const visibleStay = scopedActiveStay || scopedLastStay || lastActiveStay || lastStay;
    const visibleStayIsActive = !!visibleStay?.active;

    const activeDispositive =
      visibleStay?.dispositive?._id ||
      visibleStay?.dispositive ||
      "";

    const activeProgram =
      visibleStay?.program?._id ||
      visibleStay?.program ||
      "";

    return {
      ...doc,
      documentId: doc?.documentId || "",
      firstName: doc?.firstName ? capitalizeWords(doc.firstName) : "",
      lastName: doc?.lastName ? capitalizeWords(doc.lastName) : "",
      aliases: Array.isArray(doc?.aliases) ? doc.aliases : [],
      stays,
      activeStay: scopedActiveStay || lastActiveStay,
      activeStays,
      visibleStay,
      visibleStayIsActive,
      activeDispositive,
      activeProgram,
    };
  };

  const loadList = useCallback(async (showLoader = true) => {
    if (!scopeReady) return;

    if (!allowedDeviceIdsKey) {
      setItems([]);
      setTotalPages(0);
      return;
    }

    if (showLoader) charge(true);

    try {
      const token = getToken();
      const data = await attendedUserList(page, limit, filtersPayload, token);

      if (data?.error) {
        modal("Error", data.message || "No se pudo cargar el listado");
        return;
      }

      const raw = data?.users || data?.data?.users || [];
      const pages = data?.totalPages || data?.data?.totalPages || 0;

      setItems(raw.map(normalizeDoc));
      setTotalPages(pages);
    } catch (e) {
      modal("Error", e?.message || "Ocurrió un error inesperado");
    } finally {
      if (showLoader) charge(false);
    }
  }, [
    scopeReady,
    allowedDeviceIdsKey,
    page,
    limit,
    filtersPayload,
  ]);

  useEffect(() => {
    if (!logged?.isLoggedIn) return;

    if (!scopeReady) {
      setScopeModalOpen(true);
      return;
    }

    const showLoader = !silentNextLoadRef.current;
    silentNextLoadRef.current = false;

    loadList(showLoader);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    logged?.isLoggedIn,
    scopeReady,
    page,
    limit,
    filtersPayload,
    allowedDeviceIdsKey,
  ]);

  const refreshHistoricalList = async () => {
    const alreadyHistorical =
      filters.active === "total" &&
      filters.onlyActiveStays === "false";

    const alreadyFirstPage = page === 1;

    if (alreadyHistorical && alreadyFirstPage) {
      await loadList(false);
      return;
    }

    silentNextLoadRef.current = true;

    if (!alreadyFirstPage) {
      setPage(1);
    }

    if (!alreadyHistorical) {
      setFilters((prev) => ({
        ...prev,
        active: "total",
        onlyActiveStays: "false",
      }));
    }
  };

  const scopeFields = useMemo(() => [
    {
      name: "mode",
      label: "Modo de trabajo",
      type: "select",
      required: true,
      defaultValue: scope || "",
      options: [
        { value: "", label: "Selecciona una opción" },
        { value: "all", label: "Trabajar con todos mis dispositivos" },
        { value: "device", label: "Trabajar con un dispositivo concreto" },
      ],
    },
    {
      name: "dispositive",
      label: "Dispositivo",
      type: "select",
      required: true,
      searchable: true,
      defaultValue: selectedDeviceId || "",
      showIf: (data) => data.mode === "device",
      options: [
        { value: "", label: "Selecciona un dispositivo" },
        ...availableDevices,
      ],
    },
  ], [availableDevices, scope, selectedDeviceId]);

  const submitCapacityCheck = async (values) => {
    if (!capacityCheckDevice?._id) return;

    const knowsCapacity =
      values.knowsCapacity === true || values.knowsCapacity === "true";

    if (!knowsCapacity) {
      setCapacityCheckDevice(null);
      return;
    }

    const capacity = Number.isFinite(Number(values.capacity))
      ? Number(values.capacity)
      : 0;

    if (capacity <= 0) {
      modal("Número no válido", "Introduce una cantidad mayor que 0.");
      return;
    }

    try {
      charge(true);

      const res = await updateDispositive(
        {
          dispositiveId: capacityCheckDevice._id,
          serviceType: {
            residencial: true,
            capacity,
          },
        },
        getToken()
      );

      if (!res || res.error) {
        modal("Error", res?.message || "No se pudo actualizar el número de plazas.");
        return;
      }

      setCapacityCheckDevice(null);
      modal("Dispositivo actualizado", "Número de plazas actualizado correctamente.");
    } catch (err) {
      modal("Error", err?.message || "No se pudo actualizar el número de plazas.");
    } finally {
      charge(false);
    }
  };

  const submitScope = async (values) => {
    const dispositiveId = getFieldValue(values.dispositive);

    if (values.mode === "device" && !dispositiveId) {
      modal("Dispositivo requerido", "Debes seleccionar un dispositivo concreto.");
      return;
    }

    if (values.mode === "all") {
      const sameScope = scope === "all";

      setScope("all");
      setSelectedDeviceId("");
      setScopeModalOpen(false);

      if (sameScope) {
        await loadList(false);
        return;
      }

      setPage(1);
      setItems([]);
      setTotalPages(0);
      return;
    }

    if (values.mode === "device") {
      const sameDevice = scope === "device" && selectedDeviceId === dispositiveId;
      const device = enumsData?.dispositiveIndex?.[dispositiveId];

      setScope("device");
      setSelectedDeviceId(dispositiveId);
      setScopeModalOpen(false);

      const isResidential = Boolean(device?.serviceType?.residencial);
      const capacity = Number(device?.serviceType?.capacity || 0);

      if (isResidential && capacity === 0) {
        setCapacityCheckDevice({
          _id: dispositiveId,
          name: device?.name || "Dispositivo seleccionado",
        });
      }

      if (sameDevice) {
        await loadList(false);
        return;
      }

      setPage(1);
      setItems([]);
      setTotalPages(0);
    }
  };

  const handleLimitChange = (e) => {
    setLimit(parseInt(e.target.value, 10));
    setPage(1);
  };

  const handlePageChange = (nextPage) => {
    setPage(nextPage);
  };

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;

    setPage(1);
    setFilters((prev) => ({
      ...prev,
      [name]: value || "",
    }));
  }, []);

  const resetFilters = useCallback(() => {
    setPage(1);
    setFilters(INITIAL_FILTERS);
  }, []);

  const openCreate = () => {
    if (!canCreateOrImport) {
      modal(
        "Selecciona un dispositivo",
        "Para crear un usuario atendido debes trabajar con un único dispositivo concreto."
      );
      return;
    }

    setEditingDoc(null);

    if (isProtectedSelectedDevice) {
      setCreatingDocumentId(buildProtectedDocumentId());
      setCheckDocumentModalOpen(false);
      setFormMode("create");
      return;
    }

    setCreatingDocumentId("");
    setCheckDocumentModalOpen(true);
  };

  const openEdit = (doc) => {
    setEditingDoc(doc);
    setFormMode("edit");
  };

  const closeForm = () => {
    setEditingDoc(null);
    setCreatingDocumentId("");
    setFormMode("");
  };

  const onSubmitForm = async (payload) => {
    try {
      charge(true);

      const token = getToken();
      const cleanPayload = applyProtectedDataIfNeeded(payload);

      const resp =
        formMode === "edit"
          ? await attendedUserUpdate(cleanPayload, token)
          : await attendedUserCreate(cleanPayload, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo guardar");
        return;
      }

      closeForm();
      await loadList(false);

      modal(
        "Usuarios atendidos",
        formMode === "edit" ? "Usuario actualizado" : "Usuario creado"
      );
    } catch (e) {
      modal("Error", e?.message || "No se pudo guardar");
    } finally {
      charge(false);
    }
  };

  const submitCloseStay = async (values) => {
    const stayId = closeStayDoc?.visibleStayIsActive
      ? closeStayDoc?.visibleStay?._id
      : null;

    if (!closeStayDoc?._id || !stayId) {
      modal("Error", "No se ha encontrado una estancia activa para cerrar.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const resp = await attendedUserCloseChronology({
        id: closeStayDoc._id,
        stayId,
        endDate: values.endDate,
      }, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo dar de baja");
        return;
      }

      setCloseStayDoc(null);
      await refreshHistoricalList();

      modal(
        "Usuarios atendidos",
        "Baja registrada correctamente. Se ha cambiado el filtro a histórico completo."
      );
    } catch (e) {
      modal("Error", e?.message || "No se pudo dar de baja");
    } finally {
      charge(false);
    }
  };

  const submitOpenStay = async (values) => {
    const dispositiveId = getFieldValue(values.dispositive) || selectedDeviceId;

    if (!openStayDoc?._id || !dispositiveId) {
      modal("Error", "Debes seleccionar un dispositivo para dar de alta.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const resp = await attendedUserOpenChronology({
        id: openStayDoc._id,
        dispositive: dispositiveId,
        startDate: values.startDate,
        notes: values.notes || "",
      }, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo dar de alta");
        return;
      }

      setOpenStayDoc(null);
      await refreshHistoricalList();

      modal("Usuarios atendidos", "Alta registrada correctamente");
    } catch (e) {
      modal("Error", e?.message || "No se pudo dar de alta");
    } finally {
      charge(false);
    }
  };

  const submitNotes = async (values) => {
    if (!notesDoc?._id) return;

    try {
      charge(true);

      const token = getToken();

      const resp = await attendedUserUpdate({
        _id: notesDoc._id,
        notes: values.notes || "",
      }, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudieron guardar las notas");
        return;
      }

      setNotesDoc(null);
      await loadList(false);

      modal("Usuarios atendidos", "Notas actualizadas");
    } catch (e) {
      modal("Error", e?.message || "No se pudieron guardar las notas");
    } finally {
      charge(false);
    }
  };

  const submitCheckDocument = async (values) => {
    const documentId = String(values.documentId || "")
      .replace(/[^a-zA-Z0-9]/g, "")
      .toUpperCase()
      .trim();

    if (!documentId) {
      modal("Documento requerido", "Debes introducir un documento válido.");
      return;
    }

    try {
      charge(true);

      const token = getToken();
      const datos = { documentId: documentId };

      const resp = await attendedUserGet(datos, token);

      if (resp?.error) {
        const message = String(resp.message || "").toLowerCase();

        const isNotFound =
          message.includes("no encontrado") ||
          message.includes("not found") ||
          resp.status === 404;

        if (!isNotFound) {
          modal("Error", resp.message || "No se pudo comprobar el documento.");
          return;
        }

        setCreatingDocumentId(documentId);
        setEditingDoc(null);
        setFormMode("create");
        setCheckDocumentModalOpen(false);
        return;
      }

      const existingUser = resp?.user || resp?.data || resp;

      if (!existingUser?._id) {
        setCreatingDocumentId(documentId);
        setEditingDoc(null);
        setFormMode("create");
        setCheckDocumentModalOpen(false);
        return;
      }

      const normalized = normalizeDoc(existingUser);

      setCheckDocumentModalOpen(false);
      setOpenStayDoc(normalized);

      modal(
        "Usuario ya existente",
        [
          `Ya existe una persona con el documento ${documentId}.`,
          "No se creará un usuario nuevo. Puedes registrar una nueva alta en el dispositivo seleccionado.",
        ]
      );
    } catch (e) {
      modal("Error", e?.message || "No se pudo comprobar el documento.");
    } finally {
      charge(false);
    }
  };

  const submitDownloadXls = async (values) => {
    const getStayProgramId = (stay) => {
      if (!stay?.program) return "";
      if (typeof stay.program === "object") return String(stay.program._id || stay.program.id || "");
      return String(stay.program);
    };

    const getStayProvinceName = (stay) => {
      if (!stay?.province) return "";
      if (typeof stay.province === "object") return stay.province.name || "";
      return enumsData?.provincesIndex?.[stay.province]?.name || "";
    };

    const getAge = (birthday) => {
      if (!birthday) return "";

      const birth = new Date(birthday);
      if (Number.isNaN(birth.getTime())) return "";

      const today = new Date();
      let age = today.getFullYear() - birth.getFullYear();
      const monthDiff = today.getMonth() - birth.getMonth();

      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
        age -= 1;
      }

      return age;
    };

    const toExcelDate = (date) => {
      if (!date) return "";
      const d = new Date(date);
      if (Number.isNaN(d.getTime())) return "";
      return d;
    };

    const getExportAllowedDeviceIds = () => {
      if (scope === "device" && selectedDeviceId) return [selectedDeviceId];
      if (scope === "all") return allowedDeviceIds;
      return [];
    };

    const exportMode = values.exportMode || "active";
    const onlyActive = exportMode === "active";
    const exportDeviceIds = getExportAllowedDeviceIds();

    if (!exportDeviceIds.length) {
      modal("Sin dispositivos", "No hay dispositivos disponibles para exportar.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const payload = {
        ...filtersPayload,
        onlyActiveStays: onlyActive,
      };

      if (scope === "device") {
        payload.dispositive = selectedDeviceId;
        delete payload.allowedDispositiveIds;
      }

      if (scope === "all") {
        payload.allowedDispositiveIds = exportDeviceIds;
        delete payload.dispositive;
      }

      const resp = await attendedUserExport(payload, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo obtener la información para exportar.");
        return;
      }

      const users = resp?.users || resp?.data?.users || [];

      if (!users.length) {
        modal("Sin datos", "No hay usuarios atendidos para exportar con estos filtros.");
        return;
      }

      const workbook = new ExcelJS.Workbook();
      workbook.creator = "Engloba";
      workbook.created = new Date();

      const sheet = workbook.addWorksheet("Usuarios atendidos");

      sheet.columns = [
        { header: "Documento", key: "documentId", width: 18 },
        { header: "Nombre", key: "firstName", width: 24 },
        { header: "Apellidos", key: "lastName", width: 32 },
        { header: "Fecha nacimiento", key: "birthday", width: 18 },
        { header: "Edad", key: "age", width: 10 },
        { header: "Nacionalidad", key: "nationality", width: 24 },
        { header: "Género", key: "gender", width: 16 },
        { header: "Dispositivo", key: "device", width: 32 },
        { header: "Programa", key: "program", width: 24 },
        { header: "Provincia", key: "province", width: 20 },
        { header: "Fecha alta", key: "startDate", width: 18 },
        { header: "Fecha baja", key: "endDate", width: 18 },
        { header: "Estado estancia", key: "stayStatus", width: 18 },
        { header: "Notas persona", key: "userNotes", width: 45 },
        { header: "Notas estancia", key: "stayNotes", width: 45 },
      ];

      sheet.getRow(1).font = { bold: true };

      const exportDeviceSet = new Set(exportDeviceIds.map(String));

      users.forEach((user) => {
        const stays = Array.isArray(user.stays) ? user.stays : [];

        const filteredStays = stays.filter((stay) => {
          const deviceId = getStayDeviceId(stay);

          if (!exportDeviceSet.has(deviceId)) return false;
          if (onlyActive && !stay.active) return false;

          return true;
        });

        filteredStays.forEach((stay) => {
          const deviceId = getStayDeviceId(stay);
          const programId = getStayProgramId(stay);

          sheet.addRow({
            documentId: user.documentId || "",
            firstName: capitalizeWords(user.firstName || ""),
            lastName: capitalizeWords(user.lastName || ""),
            birthday: toExcelDate(user.birthday),
            age: getAge(user.birthday),
            nationality: getNationalityLabel(user.nationality),
            gender: genderLabel(user.gender),
            device: stay?.dispositive?.name || getDeviceLabel(deviceId),
            program: stay?.program?.acronym || stay?.program?.name || getProgramLabel(programId),
            province: getStayProvinceName(stay),
            startDate: toExcelDate(stay.startDate),
            endDate: toExcelDate(stay.endDate),
            stayStatus: stay.active ? "Activa" : "Finalizada",
            userNotes: user.notes || "",
            stayNotes: stay.notes || "",
          });
        });
      });

      if (sheet.rowCount === 1) {
        modal("Sin datos", "No hay estancias que coincidan con el ámbito y tipo de exportación seleccionado.");
        return;
      }

      sheet.getColumn("D").numFmt = "dd/mm/yyyy";
      sheet.getColumn("K").numFmt = "dd/mm/yyyy";
      sheet.getColumn("L").numFmt = "dd/mm/yyyy";

      sheet.eachRow((row) => {
        row.eachCell((cell) => {
          cell.alignment = {
            vertical: "middle",
            wrapText: true,
          };
        });
      });

      const summarySheet = workbook.addWorksheet("Resumen");
      summarySheet.columns = [
        { header: "Campo", key: "field", width: 28 },
        { header: "Valor", key: "value", width: 60 },
      ];

      summarySheet.addRows([
        {
          field: "Ámbito",
          value: scope === "device" ? selectedDeviceName : "Todos mis dispositivos",
        },
        {
          field: "Tipo de exportación",
          value: onlyActive ? "Solo estancias activas" : "Histórico completo",
        },
        {
          field: "Fecha de exportación",
          value: new Date().toLocaleString("es-ES"),
        },
        {
          field: "Filas exportadas",
          value: sheet.rowCount - 1,
        },
      ]);

      summarySheet.getRow(1).font = { bold: true };

      const buffer = await workbook.xlsx.writeBuffer();
      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const safeScopeName = (scope === "device" ? selectedDeviceName : "todos_mis_dispositivos")
        .replace(/[\\/:*?"<>|]/g, "")
        .replace(/\s+/g, "_");

      const suffix = onlyActive ? "activos" : "historico";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");

      a.href = url;
      a.download = `usuarios_atendidos_${safeScopeName}_${suffix}.xlsx`;
      a.click();

      URL.revokeObjectURL(url);
      setExportModalOpen(false);
    } catch (err) {
      modal("Error", err?.message || "No se pudo generar el Excel.");
    } finally {
      charge(false);
    }
  };

  const downloadTemplate = async () => {
    if (!canCreateOrImport) {
      modal(
        "Selecciona un dispositivo",
        "La plantilla solo se puede generar cuando trabajas con un único dispositivo concreto."
      );
      return;
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Engloba";
    workbook.created = new Date();

    const sheet = workbook.addWorksheet("Usuarios atendidos");

    sheet.columns = [
      { header: "Documento", key: "documentId", width: 18 },
      { header: "Nombre", key: "firstName", width: 24 },
      { header: "Apellidos", key: "lastName", width: 32 },
      { header: "Fecha nacimiento", key: "birthday", width: 18 },
      { header: "Nacionalidad", key: "nationality", width: 28 },
      { header: "Género", key: "gender", width: 18 },
      { header: "Fecha alta", key: "startDate", width: 18 },
      { header: "Notas", key: "notes", width: 45 },
    ];

    sheet.getRow(1).font = { bold: true };

    sheet.addRow({
      documentId: isProtectedSelectedDevice ? "Se generará automáticamente" : "X1234567A",
      firstName: isProtectedSelectedDevice ? "Anónimo" : "Nombre ejemplo",
      lastName: isProtectedSelectedDevice ? "Anónimo" : "Apellidos ejemplo",
      birthday: new Date(2000, 0, 1),
      nationality: "España",
      gender: "Hombre",
      startDate: new Date(),
      notes: "Notas opcionales",
    });

    const nationalitySheet = workbook.addWorksheet("Nacionalidades");
    nationalitySheet.state = "veryHidden";

    NATIONALITIES.forEach((item, index) => {
      nationalitySheet.getCell(`A${index + 1}`).value = item.label;
    });

    sheet.getColumn("D").numFmt = "dd/mm/yyyy";
    sheet.getColumn("G").numFmt = "dd/mm/yyyy";

    const lastValidationRow = 1000;

    for (let row = 2; row <= lastValidationRow; row++) {
      sheet.getCell(`D${row}`).dataValidation = {
        type: "date",
        operator: "between",
        formulae: [new Date(1900, 0, 1), new Date(2100, 11, 31)],
        allowBlank: false,
        showErrorMessage: true,
        errorTitle: "Fecha de nacimiento obligatoria",
        error: "Introduce la fecha de nacimiento en formato dd/mm/aaaa.",
      };

      sheet.getCell(`E${row}`).value = "España";

      sheet.getCell(`E${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: [`=Nacionalidades!$A$1:$A$${NATIONALITIES.length}`],
        showErrorMessage: true,
        errorTitle: "Nacionalidad obligatoria",
        error: "Selecciona una nacionalidad del desplegable.",
      };

      sheet.getCell(`F${row}`).dataValidation = {
        type: "list",
        allowBlank: false,
        formulae: ['"Hombre,Mujer,Otros,No binario"'],
        showErrorMessage: true,
        errorTitle: "Género obligatorio",
        error: "Selecciona Hombre, Mujer, Otros o No binario.",
      };

      sheet.getCell(`G${row}`).dataValidation = {
        type: "date",
        operator: "between",
        formulae: [new Date(1900, 0, 1), new Date(2100, 11, 31)],
        allowBlank: false,
        showErrorMessage: true,
        errorTitle: "Fecha de alta obligatoria",
        error: "Introduce la fecha de alta en formato dd/mm/aaaa.",
      };
    }

    const infoSheet = workbook.addWorksheet("Instrucciones");

    infoSheet.columns = [
      { header: "Campo", key: "field", width: 24 },
      { header: "Indicaciones", key: "help", width: 90 },
    ];

    infoSheet.addRows([
      {
        field: "Dispositivo",
        help: `Esta plantilla se importará en el dispositivo: ${selectedDeviceName}`,
      },
      {
        field: "Documento",
        help: isProtectedSelectedDevice
          ? "En este dispositivo protegido, el documento se generará automáticamente al importar o crear."
          : "Obligatorio y único. Puede ser DNI, NIE, pasaporte u otro identificador.",
      },
      {
        field: "Nombre",
        help: isProtectedSelectedDevice
          ? "En este dispositivo protegido, se guardará automáticamente como Anónimo."
          : "Obligatorio.",
      },
      {
        field: "Apellidos",
        help: isProtectedSelectedDevice
          ? "En este dispositivo protegido, se guardará automáticamente como Anónimo."
          : "Obligatorio.",
      },
      {
        field: "Fecha nacimiento",
        help: "Obligatorio. Usar formato dd/mm/aaaa.",
      },
      {
        field: "Nacionalidad",
        help: "Obligatoria. Debe seleccionarse desde el desplegable.",
      },
      {
        field: "Género",
        help: "Obligatorio. Seleccionar una de estas opciones: Hombre, Mujer, Otros, No binario.",
      },
      {
        field: "Fecha alta",
        help: "Obligatorio. Usar formato dd/mm/aaaa. Será la fecha de alta en el dispositivo seleccionado.",
      },
      {
        field: "Notas",
        help: "Campo opcional.",
      },
    ]);

    infoSheet.getRow(1).font = { bold: true };

    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    const safeDeviceName = (selectedDeviceName || "dispositivo")
      .replace(/[\\/:*?"<>|]/g, "")
      .replace(/\s+/g, "_");

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");

    a.href = url;
    a.download = `plantilla_usuarios_atendidos_${safeDeviceName}.xlsx`;
    a.click();

    URL.revokeObjectURL(url);
  };

  const downloadXls = () => {
    if (!scopeReady) {
      modal("Ámbito requerido", "Selecciona primero un ámbito de trabajo.");
      return;
    }

    if (!allowedDeviceIds.length) {
      modal("Sin dispositivos", "No tienes dispositivos disponibles para exportar.");
      return;
    }

    setExportModalOpen(true);
  };

  const openImportExcel = () => {
    if (!canCreateOrImport) {
      modal(
        "Selecciona un dispositivo",
        "Solo puedes importar usuarios cuando trabajas con un único dispositivo concreto."
      );
      return;
    }

    importFileInputRef.current?.click();
  };

  const handleImportExcel = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";

    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      modal("Archivo no válido", "Debes subir un archivo .xlsx generado desde la plantilla.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const resp = await attendedUserImportExcel({
        dispositive: selectedDeviceId,
        file,
      }, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo importar el Excel");
        return;
      }

      if (resp?.imported === false || resp?.errors?.length) {
        const errorsText = (resp.errors || [])
          .slice(0, 15)
          .map((err) => err.message || `Fila ${err.row}: error`)
          .join("\n");

        modal(
          "Excel con errores",
          errorsText || "El archivo contiene errores y no se ha importado."
        );
        return;
      }

      await loadList(false);

      modal(
        "Importación completada",
        `Se han creado ${resp?.created || 0} usuarios atendidos.`
      );
    } catch (err) {
      modal("Error", err?.message || "No se pudo importar el Excel");
    } finally {
      charge(false);
    }
  };

  const showAliases = (item) => {
    const aliases = Array.isArray(item.aliases) ? item.aliases : [];

    if (!aliases.length) {
      modal(
        `Histórico de nombres - ${item.firstName} ${item.lastName}`,
        "No hay nombres anteriores registrados."
      );
      return;
    }

    const messages = aliases.map((alias, i) => {
      const name = `${alias.firstName || ""} ${alias.lastName || ""}`.trim();
      const date = alias?.changedAt ? formatDate(alias.changedAt) : "Sin fecha";
      const reason = alias?.reason ? `Motivo: ${alias.reason}` : "Sin motivo indicado";

      return `${i + 1}. ${name} · ${date} · ${reason}`;
    });

    modal(
      `Histórico de nombres - ${item.firstName} ${item.lastName}`,
      messages
    );
  };

  const showHistoryCronology = (item) => {
    const stays = Array.isArray(item.stays) ? item.stays : [];

    if (!stays.length) {
      modal(
        `Histórico de altas/bajas - ${item.firstName} ${item.lastName}`,
        "No hay estancias registradas."
      );
      return;
    }

    const getStayDeviceName = (stay) => {
      if (!stay?.dispositive) return "Dispositivo no indicado";

      if (typeof stay.dispositive === "object") {
        return stay.dispositive.name || getDeviceLabel(stay.dispositive._id);
      }

      return getDeviceLabel(stay.dispositive);
    };

    const getStayProgramName = (stay) => {
      if (!stay?.program) return "Programa no indicado";

      if (typeof stay.program === "object") {
        return stay.program.acronym || stay.program.name || getProgramLabel(stay.program._id);
      }

      return getProgramLabel(stay.program);
    };

    const getStayProvinceName = (stay) => {
      if (!stay?.province) return "";

      if (typeof stay.province === "object") {
        return stay.province.name || "";
      }

      return enumsData?.provincesIndex?.[stay.province]?.name || "";
    };

    const sortedStays = [...stays].sort((a, b) => {
      const dateA = a?.startDate ? new Date(a.startDate).getTime() : 0;
      const dateB = b?.startDate ? new Date(b.startDate).getTime() : 0;
      return dateB - dateA;
    });

    const messages = sortedStays.map((stay, i) => {
      const device = getStayDeviceName(stay);
      const program = getStayProgramName(stay);
      const province = getStayProvinceName(stay);

      const startDate = formatDate(stay.startDate);
      const endDate = stay.endDate ? formatDate(stay.endDate) : "Actualmente activo/a";
      const status = stay.active ? "Activo/a" : "Finalizado/a";

      const title = `${i + 1}. ${device}`;
      const context = `${program}${province ? ` · ${province}` : ""}`;
      const dates = `Alta: ${startDate} · Baja: ${endDate}`;
      const state = `Estado: ${status}`;
      const notes = stay.notes ? `Notas: ${stay.notes}` : null;

      return notes
        ? [title, context, dates, state, notes]
        : [title, context, dates, state];
    });

    modal(
      `Histórico de altas/bajas - ${item.firstName} ${item.lastName}`,
      messages
    );
  };

  const openDeleteUserAttended = (item) => {
    if (!item?._id) return;

    if (!item.visibleStay?._id && !selectedDeviceId && !item.activeDispositive) {
      modal("Error", "No se ha encontrado la estancia o dispositivo a borrar.");
      return;
    }

    setDeleteDoc(item);
  };

  const confirmDeleteUserAttended = async () => {
    if (!deleteDoc?._id) return;

    const stayId = deleteDoc?.visibleStay?._id || "";
    const dispositive =
      getStayDeviceId(deleteDoc?.visibleStay) ||
      selectedDeviceId ||
      deleteDoc?.activeDispositive ||
      "";

    if (!stayId && !dispositive) {
      modal("Error", "No se ha encontrado la estancia o dispositivo a borrar.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const resp = await attendedUserDelete(
        {
          id: deleteDoc._id,
          stayId,
          dispositive,
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo borrar el usuario atendido.");
        return;
      }

      setDeleteDoc(null);
      await loadList(false);

      modal(
        "Usuarios atendidos",
        resp?.message || "Borrado realizado correctamente."
      );
    } catch (e) {
      modal("Error", e?.message || "No se pudo borrar el usuario atendido.");
    } finally {
      charge(false);
    }
  };

  const closeScopeModal = () => {
    if (scopeReady) {
      setScopeModalOpen(false);
      return;
    }

    changeMenuWorker(null);
  };

  const renderRow = (item) => {
    const stay = item.visibleStay;

    return (
      <div className={styles.containerEmployer} key={item._id}>
        <div>
          <div className={styles.tableContainer}>
            <div className={styles.tableCell}>{item.documentId || "—"}</div>
            <div className={styles.tableCell}>{item.firstName}</div>
            <div className={styles.tableCell}>{item.lastName}</div>
            <div className={styles.tableCell}>{formatDate(item.birthday)}</div>

            <div className={styles.tableCell}>
              {getNationalityLabel(item.nationality)}
            </div>

            <div className={styles.tableCell}>{genderLabel(item.gender)}</div>

            <div className={styles.tableCell}>
              {item.activeDispositive ? getDeviceLabel(item.activeDispositive) : "—"}
            </div>

            <div className={styles.tableCell}>
              {item.activeProgram ? getProgramLabel(item.activeProgram) : "—"}
            </div>

            <div className={styles.tableCell}>
              {stay?.startDate ? formatDate(stay.startDate) : "—"}
            </div>

            <div className={styles.tableCell}>
              {item.visibleStayIsActive ? (
                <button onClick={() => setCloseStayDoc(item)}>
                  Dar baja
                </button>
              ) : stay?.endDate ? (
                formatDate(stay.endDate)
              ) : (
                "—"
              )}
            </div>

            <div className={styles.tableCell}>
              <button onClick={() => setNotesDoc(item)}>
                {item.notes ? "Ver notas" : "Añadir nota"}
              </button>
            </div>

            <div className={styles.tableCellStatus}>
              <FaEdit
                onClick={() => openEdit(item)}
                title="Editar"
                style={{ cursor: "pointer" }}
              />

              <FaEye
                onClick={() => showAliases(item)}
                title="Histórico de nombres"
                style={{ cursor: "pointer" }}
              />

              <FaHistory
                onClick={() => showHistoryCronology(item)}
                title="Histórico de altas/bajas"
                style={{ cursor: "pointer" }}
              />

              {!item.visibleStayIsActive && canOpenStay && (
                <FaUserPlus
                  onClick={() => setOpenStayDoc(item)}
                  title="Dar alta"
                  style={{ cursor: "pointer" }}
                />
              )}

              <FaTrashAlt
                onClick={() => openDeleteUserAttended(item)}
                title="Borrar usuario o estancia"
                style={{ cursor: "pointer" }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>USUARIOS ATENDIDOS</h2>

            <FaSquarePlus
              onClick={openCreate}
              title="Crear usuario atendido"
              style={{ cursor: "pointer" }}
            />

            <TbFileTypeXml
              onClick={downloadXls}
              title="Descargar Excel"
              style={{ cursor: "pointer" }}
            />

            <FaCloudArrowUp
              onClick={openImportExcel}
              title="Importar usuarios desde Excel"
              style={{ cursor: "pointer" }}
            />

            <FaFileDownload
              onClick={downloadTemplate}
              title="Descargar plantilla Excel"
              style={{ cursor: "pointer" }}
            />

            <input
              ref={importFileInputRef}
              type="file"
              accept=".xlsx"
              onChange={handleImportExcel}
              style={{ display: "none" }}
            />
          </div>

          <div className={styles.cajaSeleccionActiva}>
            <h4>Ámbito activo</h4>

            <p>
              {scope === "all" ? (
                "Todos mis dispositivos"
              ) : selectedDeviceId ? (
                <>
                  {getDeviceLabel(selectedDeviceId)}
                  {isProtectedSelectedDevice && (
                    <>
                      {" "}
                      · Datos protegidos
                    </>
                  )}
                  {availablePlaces !== null && (
                    <>
                      {" "}
                      · Plazas disponibles: {availablePlaces} / {selectedDeviceCapacity}
                    </>
                  )}
                </>
              ) : (
                "Sin seleccionar"
              )}
            </p>

            <button onClick={() => setScopeModalOpen(true)}>
              Cambiar ámbito
            </button>
          </div>
        </div>

        <div className={styles.caja}>
          <FiltersAttendedUsers
            filters={filters}
            handleFilterChange={handleFilterChange}
            resetFilters={resetFilters}
          />

          <div className={styles.paginacion}>
            <div>
              <label htmlFor="limit">Items por página:</label>

              <select id="limit" value={limit} onChange={handleLimitChange}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div>
              <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                {"<"}
              </button>

              <span>Página {page}</span>

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || totalPages === 0}
              >
                {">"}
              </button>
            </div>
          </div>

          <div className={styles.containerTableContainer}>
            <div>
              <div className={styles.tableContainer} id={styles.cabeceraTabla}>
                <div className={styles.tableCell}>Documento</div>
                <div className={styles.tableCell}>Nombre</div>
                <div className={styles.tableCell}>Apellidos</div>
                <div className={styles.tableCell}>Nacimiento</div>
                <div className={styles.tableCell}>Nacionalidad</div>
                <div className={styles.tableCell}>Género</div>
                <div className={styles.tableCell}>Dispositivo</div>
                <div className={styles.tableCell}>Programa</div>
                <div className={styles.tableCell}>Alta</div>
                <div className={styles.tableCell}>Baja</div>
                <div className={styles.tableCell}>Notas</div>
                <div className={styles.tableCellStatus}>Acciones</div>
              </div>

              {items.map(renderRow)}

              {!items.length && (
                <div className={styles.tableContainer}>
                  <div className={styles.tableCell}>
                    {scopeReady
                      ? "No hay usuarios atendidos con estos filtros."
                      : "Selecciona un ámbito de trabajo para comenzar."}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {scopeModalOpen && (
          <ModalForm
            title="Ámbito de trabajo"
            message="Selecciona si quieres trabajar con todos tus dispositivos o con uno concreto."
            fields={scopeFields}
            onSubmit={submitScope}
            onClose={closeScopeModal}
            modal={modal}
          />
        )}

        {!!formMode && (
          <FormAttendedUser
            mode={formMode}
            doc={editingDoc}
            initialDocumentId={creatingDocumentId}
            fixedDispositiveId={selectedDeviceId}
            protectedMode={isProtectedSelectedDevice && formMode === "create"}
            modal={modal}
            onSubmit={onSubmitForm}
            onClose={closeForm}
          />
        )}

        {checkDocumentModalOpen && (
          <ModalForm
            title="Comprobar documento"
            message="Introduce el documento de la persona atendida antes de crearla."
            fields={[
              {
                name: "documentId",
                label: "Documento",
                type: "text",
                required: true,
                defaultValue: "",
              },
            ]}
            onSubmit={submitCheckDocument}
            onClose={() => setCheckDocumentModalOpen(false)}
            modal={modal}
          />
        )}

        {!!closeStayDoc && (
          <ModalForm
            title="Dar de baja"
            message={`Vas a dar de baja a ${closeStayDoc.firstName} ${closeStayDoc.lastName} en su estancia actual.`}
            fields={[
              {
                name: "endDate",
                label: "Fecha de baja",
                type: "date",
                required: true,
                defaultValue: new Date().toISOString().slice(0, 10),
              },
            ]}
            onSubmit={submitCloseStay}
            onClose={() => setCloseStayDoc(null)}
            modal={modal}
          />
        )}

        {!!openStayDoc && (
          <ModalForm
            title="Dar de alta"
            message={`Vas a abrir una nueva estancia para ${openStayDoc.firstName} ${openStayDoc.lastName}.`}
            fields={[
              {
                name: "dispositive",
                label: "Dispositivo",
                type: "select",
                required: true,
                searchable: true,
                defaultValue: selectedDeviceId || "",
                options: [
                  { value: "", label: "Selecciona un dispositivo" },
                  ...availableDevices,
                ],
              },
              {
                name: "startDate",
                label: "Fecha de alta",
                type: "date",
                required: true,
                defaultValue: new Date().toISOString().slice(0, 10),
              },
              {
                name: "notes",
                label: "Notas de la estancia",
                type: "textarea",
                required: false,
                defaultValue: "",
              },
            ]}
            onSubmit={submitOpenStay}
            onClose={() => setOpenStayDoc(null)}
            modal={modal}
          />
        )}

        {exportModalOpen && (
          <ModalForm
            title="Descargar Excel"
            message="Selecciona qué información quieres exportar."
            fields={[
              {
                name: "exportMode",
                label: "Tipo de exportación",
                type: "select",
                required: true,
                defaultValue: "active",
                options: [
                  { value: "active", label: "Solo usuarios con estancia activa en este ámbito" },
                  { value: "history", label: "Histórico completo del ámbito seleccionado" },
                ],
              },
            ]}
            onSubmit={submitDownloadXls}
            onClose={() => setExportModalOpen(false)}
            modal={modal}
          />
        )}

        {!!notesDoc && (
          <ModalForm
            title={`Notas - ${notesDoc.firstName} ${notesDoc.lastName}`}
            fields={[
              {
                name: "notes",
                label: "Notas",
                type: "textarea",
                required: false,
                defaultValue: notesDoc.notes || "",
              },
            ]}
            onSubmit={submitNotes}
            onClose={() => setNotesDoc(null)}
            modal={modal}
          />
        )}

        {!!deleteDoc && (
          <ModalConfirmation
            title="Confirmar borrado"
            message={
              `Vas a borrar a ${deleteDoc.firstName} ${deleteDoc.lastName} del dispositivo ${getDeviceLabel(
                getStayDeviceId(deleteDoc.visibleStay) ||
                selectedDeviceId ||
                deleteDoc.activeDispositive
              )}. Si la persona tiene historial en otros dispositivos, solo se borrará esta estancia. Si solo tiene estancias en este dispositivo, se borrará el usuario completo.`
            }
            onConfirm={confirmDeleteUserAttended}
            onCancel={() => setDeleteDoc(null)}
          />
        )}

        {!!capacityCheckDevice && (
          <ModalForm
            title="Número de plazas no indicado"
            message={`El dispositivo "${capacityCheckDevice.name}" es residencial, pero tiene 0 plazas registradas.`}
            fields={[
              {
                name: "knowsCapacity",
                label: "¿Conoces el número de plazas totales?",
                type: "select",
                required: true,
                defaultValue: "",
                options: [
                  { value: "", label: "Seleccione una opción" },
                  { value: true, label: "Sí" },
                  { value: false, label: "No lo sé" },
                ],
              },
              {
                name: "capacity",
                label: "Número de plazas / usuarios",
                type: "number",
                required: true,
                defaultValue: "",
                showIf: (data) => data.knowsCapacity === true || data.knowsCapacity === "true",
              },
            ]}
            onSubmit={submitCapacityCheck}
            onClose={() => setCapacityCheckDevice(null)}
            modal={modal}
          />
        )}
      </div>
    </div>
  );
};

export default ManagingAttendedUsers;