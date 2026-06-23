import { useEffect, useMemo, useState } from "react";
import {
  FaArrowRightArrowLeft,
  FaArrowsRotate,
  FaDoorOpen,
  FaHouseMedical,
  FaUserPlus,
} from "react-icons/fa6";
import { FaEdit, FaSignOutAlt, FaStickyNote, FaUserEdit } from "react-icons/fa";

import ModalForm from "../globals/ModalForm.jsx";
import ModalConfirmation from "../globals/ModalConfirmation.jsx";
import { getToken } from "../../lib/serviceToken.js";
import { getNationalityLabel } from "../../lib/nationalities.js";
import {
  anideCentroManager,
  anideUsuariaManager,
  anideCentroOccupancy,
} from "../../lib/data.js";

import FormAnideUser from "./FormAnideUser.jsx";
import AnideOccupancyBoard from "./AnideOccupancyBoard.jsx";
import styles from "../styles/anide.module.css";

const todayInput = () => new Date().toISOString().slice(0, 10);

const refId = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value._id || value.id || value.value || "");
  }

  return String(value);
};

const getFieldValue = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value.value || value._id || value.id || "");
  }

  return String(value);
};

const buildFullName = (item = {}) =>
  `${item.firstName || ""} ${item.lastName || ""}`.trim();

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

const isBedAssignable = (bed = {}) => {
  if (bed.active === false) return false;
  if (bed.occupied) return false;

  return !["maintenance", "unusable", "reserved"].includes(bed.status);
};

const getRoomVisualStatus = (room) => {
  if (room.visualStatus) return room.visualStatus;
  if (room.active === false) return "unusable";

  const activeBeds = Number(room.activeBeds ?? 0);
  const occupiedBeds = Number(room.occupiedBeds ?? 0);
  const freeBeds = Number(room.freeBeds ?? 0);

  if (activeBeds === 0) return "unusable";
  if (occupiedBeds === 0) return "free";
  if (freeBeds === 0) return "occupied";

  return "semi";
};

const normalizeRoom = (room = {}) => {
  const camas = Array.isArray(room.camas) ? room.camas : [];

  const activeBeds =
    room.activeBeds ??
    camas.filter((bed) => {
      return (
        bed.active !== false &&
        !["maintenance", "unusable"].includes(bed.status)
      );
    }).length;

  const occupiedBeds =
    room.occupiedBeds ??
    camas.filter((bed) => bed.occupied).length;

  const freeBeds =
    room.freeBeds ??
    camas.filter((bed) => isBedAssignable(bed)).length;

  return {
    ...room,
    camas,
    activeBeds,
    occupiedBeds,
    freeBeds,
    visualStatus: getRoomVisualStatus({
      ...room,
      camas,
      activeBeds,
      occupiedBeds,
      freeBeds,
    }),
  };
};

const normalizeCenter = (data = {}) => {
  const centro = data.centro ? data.centro : data;

  const habitaciones = Array.isArray(data.habitaciones)
    ? data.habitaciones.map(normalizeRoom)
    : Array.isArray(centro.habitaciones)
      ? centro.habitaciones.map(normalizeRoom)
      : [];

  const totalBeds = habitaciones.reduce(
    (acc, room) => acc + Number(room.camas?.length || 0),
    0
  );

  const activeBeds = habitaciones.reduce(
    (acc, room) => acc + Number(room.activeBeds || 0),
    0
  );

  const occupiedBeds = habitaciones.reduce(
    (acc, room) => acc + Number(room.occupiedBeds || 0),
    0
  );

  const freeBeds = habitaciones.reduce(
    (acc, room) => acc + Number(room.freeBeds || 0),
    0
  );

  return {
    ...centro,
    _id: centro._id || data._id,
    name: centro.name || data.name || "",
    province: centro.province || data.province || null,
    active: centro.active !== false,
    habitaciones,
    summary: data.summary || centro.summary || {
      totalRooms: habitaciones.length,
      totalBeds,
      activeBeds,
      occupiedBeds,
      freeBeds,
    },
  };
};

const ManagingAnide = ({ modal, charge, enumsData }) => {
  const [centers, setCenters] = useState([]);
  const [selectedCenterId, setSelectedCenterId] = useState("");
  const [selectedCenterOccupancy, setSelectedCenterOccupancy] = useState(null);

  const [view, setView] = useState("board");
  const [users, setUsers] = useState([]);

  const [centerForm, setCenterForm] = useState(null);
  const [roomForm, setRoomForm] = useState(null);
  const [bedForm, setBedForm] = useState(null);
  const [userForm, setUserForm] = useState(null);

  const [assignStayData, setAssignStayData] = useState(null);
  const [moveStayData, setMoveStayData] = useState(null);
  const [closeStayData, setCloseStayData] = useState(null);
  const [notesModal, setNotesModal] = useState(null);

  const [userFilters, setUserFilters] = useState({
    q: "",
    active: "active",
    centroId: "",
  });

  const provinceOptions = useMemo(() => {
    const index = enumsData?.provincesIndex || {};

    return Object.entries(index)
      .map(([id, item]) => ({
        value: id,
        label: String(item?.name || "Provincia").trim(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [enumsData]);

  const selectedCenter = useMemo(() => {
    return centers.find(
      (center) => String(center._id) === String(selectedCenterId)
    ) || null;
  }, [centers, selectedCenterId]);

  const centerOptions = useMemo(() => {
    return centers.map((center) => ({
      value: center._id,
      label: center.name,
    }));
  }, [centers]);

  const assignedUserIds = useMemo(() => {
    const ids = new Set();

    centers.forEach((center) => {
      (center.habitaciones || []).forEach((room) => {
        (room.camas || []).forEach((bed) => {
          const user = bed?.usuaria;
          const id = user?.usuariaId || user?._id || user?.id;

          if (id) ids.add(String(id));
        });
      });
    });

    return ids;
  }, [centers]);

  const assignUserOptions = useMemo(() => {
    return users
      .filter((user) => !assignedUserIds.has(String(user._id)))
      .map((user) => ({
        value: user._id,
        label: `${buildFullName(user)} · ${user.documentId || "sin doc."}`,
      }));
  }, [users, assignedUserIds]);

  const freeBedsOptions = useMemo(() => {
    const options = [];

    centers.forEach((center) => {
      (center.habitaciones || []).forEach((room) => {
        const normalizedRoom = normalizeRoom(room);

        normalizedRoom.camas.forEach((bed) => {
          if (!isBedAssignable(bed)) return;

          options.push({
            value: `${center._id}|${room._id}|${bed._id}`,
            label: `${center.name} · ${room.name} · ${bed.name}`,
            centroId: center._id,
            province: refId(center.province),
            habitacionId: room._id,
            camaId: bed._id,
          });
        });
      });
    });

    return options;
  }, [centers]);

  const loadCenters = async (showLoader = true, preferredSelectedId = "") => {
    if (showLoader) charge(true);

    try {
      const token = getToken();

      const data = await anideCentroManager(
        {
          type: "list",
          active: true,
          page: 1,
          limit: 200,
        },
        token
      );

      if (data?.error) {
        modal("Error", data.message || "No se pudieron cargar los centros ANIDE");
        return [];
      }

      const raw = data?.items || data?.centers || data || [];
      const baseCenters = Array.isArray(raw) ? raw : [];

      const centersWithOccupancy = await Promise.all(
        baseCenters.map(async (center) => {
          const occupancy = await anideCentroOccupancy(
            { centroId: center._id },
            token
          );

          if (occupancy?.error) {
            return normalizeCenter(center);
          }

          return normalizeCenter(occupancy);
        })
      );

      setCenters(centersWithOccupancy);

      const nextSelectedId =
        preferredSelectedId ||
        selectedCenterId ||
        centersWithOccupancy[0]?._id ||
        "";

      setSelectedCenterId(nextSelectedId);

      setSelectedCenterOccupancy(
        centersWithOccupancy.find(
          (item) => String(item._id) === String(nextSelectedId)
        ) || null
      );

      return centersWithOccupancy;
    } catch (e) {
      modal("Error", e?.message || "No se pudieron cargar los centros ANIDE");
      return [];
    } finally {
      if (showLoader) charge(false);
    }
  };

  const loadUsers = async (showLoader = true, filters = userFilters) => {
    if (showLoader) charge(true);

    try {
      const token = getToken();

      const payload = {
        type: "list",
        q: filters.q || undefined,
        page: 1,
        limit: 100,
      };

      if (filters.active === "active") payload.active = true;
      if (filters.active === "inactive") payload.active = false;
      if (filters.centroId) payload.centroId = filters.centroId;

      Object.keys(payload).forEach((key) => {
        if (payload[key] === undefined || payload[key] === "") delete payload[key];
      });

      const data = await anideUsuariaManager(payload, token);

      if (data?.error) {
        modal("Error", data.message || "No se pudieron cargar las usuarias");
        return [];
      }

      const nextUsers = data?.items || data?.users || [];
      setUsers(nextUsers);

      return nextUsers;
    } catch (e) {
      modal("Error", e?.message || "No se pudieron cargar las usuarias");
      return [];
    } finally {
      if (showLoader) charge(false);
    }
  };

  const refreshAll = async (showLoader = false) => {
    await loadCenters(showLoader, selectedCenterId);
    if (view === "users") await loadUsers(showLoader);
  };

  useEffect(() => {
    loadCenters();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const found = centers.find(
      (item) => String(item._id) === String(selectedCenterId)
    );

    setSelectedCenterOccupancy(found || null);
  }, [centers, selectedCenterId]);

  useEffect(() => {
    if (view === "users") loadUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [view, userFilters]);

  const openCreateCenter = () => {
    setCenterForm({ mode: "create", doc: null });
  };

  const openEditCenter = () => {
    if (!selectedCenter) {
      modal("Centro requerido", "Selecciona un centro para editarlo.");
      return;
    }

    setCenterForm({ mode: "edit", doc: selectedCenter });
  };

  const submitCenter = async (values) => {
    const isEdit = centerForm?.mode === "edit";

    try {
      charge(true);

      const token = getToken();

      const payload = {
        type: isEdit ? "update" : "create",
        name: values.name,
        province: getFieldValue(values.province),
      };

      if (isEdit) payload.centroId = centerForm.doc._id;

      const resp = await anideCentroManager(payload, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo guardar el centro");
        return;
      }

      setCenterForm(null);

      const nextId = isEdit ? centerForm.doc._id : resp?._id || selectedCenterId;
      await loadCenters(false, nextId);

      modal("ANIDE", isEdit ? "Centro actualizado" : "Centro creado");
    } catch (e) {
      modal("Error", e?.message || "No se pudo guardar el centro");
    } finally {
      charge(false);
    }
  };

  const openCreateRoom = () => {
    if (!selectedCenterId) {
      modal("Centro requerido", "Selecciona un centro antes de crear una habitación.");
      return;
    }

    setRoomForm({ mode: "create", centroId: selectedCenterId, doc: null });
  };

  const openEditRoom = (room) => {
    setRoomForm({
      mode: "edit",
      centroId: selectedCenterId,
      doc: room,
    });
  };

  const submitRoom = async (values) => {
    const isEdit = roomForm?.mode === "edit";

    try {
      charge(true);

      const token = getToken();

      const payload = {
        type: isEdit ? "roomUpdate" : "roomAdd",
        centroId: roomForm.centroId,
        name: values.name,
        notes: values.notes || "",
      };

      if (isEdit) {
        payload.habitacionId = roomForm.doc._id;
        payload.active = values.active === true || values.active === "true";
      }

      const resp = await anideCentroManager(payload, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo guardar la habitación");
        return;
      }

      setRoomForm(null);
      await loadCenters(false, selectedCenterId);

      modal("ANIDE", isEdit ? "Habitación actualizada" : "Habitación creada");
    } catch (e) {
      modal("Error", e?.message || "No se pudo guardar la habitación");
    } finally {
      charge(false);
    }
  };

  const openCreateBed = (room) => {
    setBedForm({
      mode: "create",
      centroId: selectedCenterId,
      room,
      doc: null,
    });
  };

  const openEditBed = (room, bed) => {
    setBedForm({
      mode: "edit",
      centroId: selectedCenterId,
      room,
      doc: bed,
    });
  };

  const submitBed = async (values) => {
    const isEdit = bedForm?.mode === "edit";

    try {
      charge(true);

      const token = getToken();

      const payload = {
        type: isEdit ? "bedUpdate" : "bedAdd",
        centroId: bedForm.centroId,
        habitacionId: bedForm.room._id,
        name: values.name,
        status: values.status || "available",
        capacity: Number(values.capacity || 1),
        notes: values.notes || "",
      };

      if (isEdit) {
        payload.camaId = bedForm.doc._id;
        payload.active = values.active === true || values.active === "true";
      }

      const resp = await anideCentroManager(payload, token);

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo guardar la cama");
        return;
      }

      setBedForm(null);
      await loadCenters(false, selectedCenterId);

      modal("ANIDE", isEdit ? "Cama actualizada" : "Cama creada");
    } catch (e) {
      modal("Error", e?.message || "No se pudo guardar la cama");
    } finally {
      charge(false);
    }
  };

  const submitUser = async (payload) => {
    try {
      charge(true);

      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: userForm?.mode === "edit" ? "update" : "create",
          ...payload,
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo guardar la usuaria");
        return;
      }

      setUserForm(null);
      await refreshAll(false);

      modal(
        "ANIDE",
        userForm?.mode === "edit" ? "Usuaria actualizada" : "Usuaria creada"
      );
    } catch (e) {
      modal("Error", e?.message || "No se pudo guardar la usuaria");
    } finally {
      charge(false);
    }
  };

  const openAssignStay = async (center, room, bed) => {
    await loadUsers(false, {
      q: "",
      active: "active",
      centroId: "",
    });

    setAssignStayData({
      center,
      room,
      bed,
    });
  };

  const submitAssignStay = async (values) => {
    const usuariaId = getFieldValue(values.usuariaId);

    if (!assignUserOptions.length) {
      modal(
        "Sin usuarias disponibles",
        "No hay usuarias libres para asignar. Si la usuaria ya está en una cama, usa la opción Trasladar."
      );
      return;
    }

    if (!usuariaId) {
      modal("Usuaria requerida", "Selecciona una usuaria para asignarla a la cama.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: "assignStay",
          usuariaId,
          centroId: assignStayData.center._id,
          province: refId(assignStayData.center.province),
          habitacionId: assignStayData.room._id,
          camaId: assignStayData.bed._id,
          startDate: values.startDate,
          notes: values.notes || "",
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo asignar la cama");
        return;
      }

      setAssignStayData(null);
      await refreshAll(false);

      modal("ANIDE", "Cama asignada correctamente");
    } catch (e) {
      modal("Error", e?.message || "No se pudo asignar la cama");
    } finally {
      charge(false);
    }
  };

  const openMoveStay = (usuaria, currentCenter = null) => {
    setMoveStayData({
      usuaria,
      currentCenter,
    });
  };

  const submitMoveStay = async (values) => {
    const target = freeBedsOptions.find(
      (item) => item.value === getFieldValue(values.targetBed)
    );

    if (!target) {
      modal("Cama requerida", "Selecciona una cama libre de destino.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: "moveStay",
          usuariaId: moveStayData.usuaria.usuariaId || moveStayData.usuaria._id,
          centroId: target.centroId,
          province: target.province,
          habitacionId: target.habitacionId,
          camaId: target.camaId,
          moveDate: values.moveDate,
          notes: values.notes || "",
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo trasladar la usuaria");
        return;
      }

      setMoveStayData(null);
      await refreshAll(false);

      modal("ANIDE", "Traslado registrado correctamente");
    } catch (e) {
      modal("Error", e?.message || "No se pudo trasladar la usuaria");
    } finally {
      charge(false);
    }
  };

  const openCloseStay = (usuaria) => {
    setCloseStayData({
      ...usuaria,
      confirmForm: false,
    });
  };

  const submitCloseStay = async (values) => {
    try {
      charge(true);

      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: "closeStay",
          usuariaId: closeStayData.usuariaId || closeStayData._id,
          endDate: values.endDate,
          notes: values.notes || "",
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo cerrar la estancia");
        return;
      }

      setCloseStayData(null);
      await refreshAll(false);

      modal("ANIDE", "Salida registrada correctamente");
    } catch (e) {
      modal("Error", e?.message || "No se pudo cerrar la estancia");
    } finally {
      charge(false);
    }
  };

  const openUserNotes = async (usuaria) => {
    const usuariaId = usuaria?.usuariaId || usuaria?._id;

    if (!usuariaId) {
      modal("Usuaria no encontrada", "No se ha podido identificar la usuaria.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const data = await anideUsuariaManager(
        {
          type: "get",
          usuariaId,
        },
        token
      );

      if (data?.error) {
        modal("Error", data.message || "No se pudieron cargar las notas de la usuaria");
        return;
      }

      setNotesModal({
        user: data,
        sourceName: usuaria?.name || buildFullName(data),
      });
    } catch (e) {
      modal("Error", e?.message || "No se pudieron cargar las notas de la usuaria");
    } finally {
      charge(false);
    }
  };

  const submitUserNote = async (values) => {
    const currentNotes = String(notesModal?.user?.notes || "").trim();
    const newNote = String(values.newNote || "").trim();

    if (!newNote) {
      modal("Nota requerida", "Escribe una nota antes de guardar.");
      return;
    }

    const date = new Date().toLocaleDateString("es-ES");
    const fullNote = currentNotes
      ? `${currentNotes}\n\n[${date}] ${newNote}`
      : `[${date}] ${newNote}`;

    try {
      charge(true);

      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: "update",
          usuariaId: notesModal.user._id,
          notes: fullNote,
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo guardar la nota");
        return;
      }

      setNotesModal(null);
      await refreshAll(false);

      modal("ANIDE", "Nota añadida correctamente");
    } catch (e) {
      modal("Error", e?.message || "No se pudo guardar la nota");
    } finally {
      charge(false);
    }
  };

  const viewUserNotes = async (usuaria) => {
    const usuariaId = usuaria?.usuariaId || usuaria?._id;

    if (!usuariaId) {
      modal("Usuaria no encontrada", "No se ha podido identificar la usuaria.");
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const data = await anideUsuariaManager(
        {
          type: "get",
          usuariaId,
        },
        token
      );

      if (data?.error) {
        modal("Error", data.message || "No se pudieron cargar las notas de la usuaria");
        return;
      }

      const notes = String(data?.notes || "").trim();

      modal(`Notas de ${usuaria?.name || buildFullName(data)}`, [
        [
          "Notas actuales",
          notes
            ? notes
                .replace(/\s*(\[\d{1,2}\/\d{1,2}\/\d{4}\])/g, "\n\n$1")
                .trim()
            : "Esta usuaria todavía no tiene notas registradas.",
        ],
      ]);
    } catch (e) {
      modal("Error", e?.message || "No se pudieron cargar las notas de la usuaria");
    } finally {
      charge(false);
    }
  };

  const assignUserFields = useMemo(() => [
    {
      name: "usuariaId",
      label: "Usuaria",
      type: "select",
      searchable: true,
      required: true,
      defaultValue: "",
      options: assignUserOptions.length
        ? [{ value: "", label: "Selecciona una usuaria" }, ...assignUserOptions]
        : [
            {
              value: "",
              label: "No hay usuarias libres. Si ya tiene estancia activa, usa Trasladar.",
            },
          ],
    },
    {
      name: "startDate",
      label: "Fecha de entrada",
      type: "date",
      required: true,
      defaultValue: todayInput(),
    },
    {
      name: "notes",
      label: "Notas de estancia",
      type: "textarea",
      required: false,
      defaultValue: "",
    },
  ], [assignUserOptions]);

  const moveFields = useMemo(() => [
    {
      name: "targetBed",
      label: "Cama libre de destino",
      type: "select",
      searchable: true,
      required: true,
      defaultValue: "",
      options: [
        { value: "", label: "Selecciona una cama libre" },
        ...freeBedsOptions,
      ],
    },
    {
      name: "moveDate",
      label: "Fecha de traslado",
      type: "date",
      required: true,
      defaultValue: todayInput(),
    },
    {
      name: "notes",
      label: "Notas",
      type: "textarea",
      required: false,
      defaultValue: "",
    },
  ], [freeBedsOptions]);

  const centerFields = useMemo(() => [
    {
      name: "name",
      label: "Nombre del centro",
      type: "text",
      required: true,
      defaultValue: centerForm?.doc?.name || "",
    },
    {
      name: "province",
      label: "Provincia",
      type: "select",
      searchable: true,
      required: true,
      defaultValue: refId(centerForm?.doc?.province) || "",
      options: [
        { value: "", label: "Selecciona una provincia" },
        ...provinceOptions,
      ],
    },
  ], [centerForm, provinceOptions]);

  const roomFields = useMemo(() => [
    {
      name: "name",
      label: "Nombre de la habitación",
      type: "text",
      required: true,
      defaultValue: roomForm?.doc?.name || "",
    },
    {
      name: "active",
      label: "Activa",
      type: "select",
      required: true,
      defaultValue: roomForm?.doc?.active === false ? "false" : "true",
      showIf: () => roomForm?.mode === "edit",
      options: [
        { value: "true", label: "Sí" },
        { value: "false", label: "No" },
      ],
    },
    {
      name: "notes",
      label: "Notas",
      type: "textarea",
      required: false,
      defaultValue: roomForm?.doc?.notes || "",
    },
  ], [roomForm]);

  const bedFields = useMemo(() => [
    {
      name: "name",
      label: "Nombre de la cama",
      type: "text",
      required: true,
      defaultValue: bedForm?.doc?.name || "",
    },
    {
      name: "status",
      label: "Estado",
      type: "select",
      required: true,
      defaultValue: bedForm?.doc?.status || "available",
      options: [
        { value: "available", label: "Disponible" },
        { value: "reserved", label: "Reservada" },
        { value: "maintenance", label: "Por arreglar" },
        { value: "unusable", label: "Inutilizable" },
      ],
    },
    {
      name: "capacity",
      label: "Capacidad",
      type: "number",
      required: true,
      defaultValue: bedForm?.doc?.capacity || 1,
    },
    {
      name: "active",
      label: "Activa",
      type: "select",
      required: true,
      defaultValue: bedForm?.doc?.active === false ? "false" : "true",
      showIf: () => bedForm?.mode === "edit",
      options: [
        { value: "true", label: "Sí" },
        { value: "false", label: "No" },
      ],
    },
    {
      name: "notes",
      label: "Notas",
      type: "textarea",
      required: false,
      defaultValue: bedForm?.doc?.notes || "",
    },
  ], [bedForm]);

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.wrapper}>
          <div className={styles.header}>
            <div>
              <h2>GESTIÓN ANIDE</h2>
              <p>Mapa visual de ocupación por centros, habitaciones y camas.</p>
            </div>

            <div className={styles.headerActions}>
              <button onClick={openCreateCenter}>
                <FaHouseMedical /> Crear centro
              </button>

              <button onClick={openEditCenter} disabled={!selectedCenterId}>
                <FaEdit /> Editar centro
              </button>

              <button onClick={() => setUserForm({ mode: "create", doc: null })}>
                <FaUserPlus /> Crear usuaria
              </button>

              <button onClick={openCreateRoom} disabled={!selectedCenterId}>
                <FaDoorOpen /> Añadir habitación
              </button>

              <button onClick={() => refreshAll(true)}>
                <FaArrowsRotate /> Actualizar
              </button>
            </div>
          </div>

          <div className={styles.topBar}>
            <div className={styles.selectorBlock}>
              <label>Centro activo</label>

              <select
                value={selectedCenterId}
                onChange={(e) => setSelectedCenterId(e.target.value)}
              >
                <option value="">Selecciona un centro</option>

                {centerOptions.map((center) => (
                  <option key={center.value} value={center.value}>
                    {center.label}
                  </option>
                ))}
              </select>
            </div>

            <div className={styles.viewSwitch}>
              <button
                className={view === "board" ? styles.activeView : ""}
                onClick={() => setView("board")}
              >
                Ocupación
              </button>

              <button
                className={view === "users" ? styles.activeView : ""}
                onClick={() => setView("users")}
              >
                Usuarias
              </button>
            </div>
          </div>

          {view === "board" && (
            <AnideOccupancyBoard
              center={selectedCenterOccupancy}
              centers={centers}
              selectedCenterId={selectedCenterId}
              onSelectCenter={setSelectedCenterId}
              onRoomClick={(center, room) =>
                modal(`${center?.name || ""} · ${room?.name || ""}`, [
                  `Camas activas: ${room?.activeBeds ?? 0}`,
                  `Ocupadas: ${room?.occupiedBeds ?? 0}`,
                  `Libres: ${room?.freeBeds ?? 0}`,
                  room?.notes ? `Notas: ${room.notes}` : "",
                ].filter(Boolean))
              }
              onAssignStay={openAssignStay}
              onEditRoom={openEditRoom}
              onCreateBed={openCreateBed}
              onEditBed={openEditBed}
              onMoveStay={openMoveStay}
              onCloseStay={openCloseStay}
              onViewNotes={viewUserNotes}
              onAddNote={openUserNotes}
            />
          )}

          {view === "users" && (
            <div className={styles.usersPanel}>
              <div className={styles.usersFilters}>
                <input
                  type="text"
                  placeholder="Buscar por nombre, documento..."
                  value={userFilters.q}
                  onChange={(e) =>
                    setUserFilters((prev) => ({ ...prev, q: e.target.value }))
                  }
                />

                <select
                  value={userFilters.centroId}
                  onChange={(e) =>
                    setUserFilters((prev) => ({ ...prev, centroId: e.target.value }))
                  }
                >
                  <option value="">Todos los centros</option>

                  {centerOptions.map((center) => (
                    <option key={center.value} value={center.value}>
                      {center.label}
                    </option>
                  ))}
                </select>

                <select
                  value={userFilters.active}
                  onChange={(e) =>
                    setUserFilters((prev) => ({ ...prev, active: e.target.value }))
                  }
                >
                  <option value="active">Activas</option>
                  <option value="inactive">Inactivas</option>
                  <option value="total">Todas</option>
                </select>
              </div>

              <div className={styles.usersList}>
                {users.map((user) => (
                  <div className={styles.userRow} key={user._id}>
                    <div>
                      <strong>{buildFullName(user)}</strong>
                      <span>{user.documentId || "—"}</span>
                    </div>

                    <div>{getNationalityLabel(user.nationality)}</div>
                    <div>{genderLabel(user.gender)}</div>

                    <div className={styles.userActions}>
                      <button onClick={() => setUserForm({ mode: "edit", doc: user })}>
                        <FaUserEdit /> Editar
                      </button>

                      <button onClick={() => viewUserNotes(user)}>
                        <FaStickyNote /> Ver notas
                      </button>

                      <button onClick={() => openUserNotes(user)}>
                        <FaStickyNote /> Añadir nota
                      </button>

                      <button onClick={() => openMoveStay(user)}>
                        <FaArrowRightArrowLeft /> Trasladar
                      </button>

                      <button onClick={() => openCloseStay(user)}>
                        <FaSignOutAlt /> Salida
                      </button>
                    </div>
                  </div>
                ))}

                {!users.length && (
                  <div className={styles.emptyState}>
                    No hay usuarias con estos filtros.
                  </div>
                )}
              </div>
            </div>
          )}

          {!!centerForm && (
            <ModalForm
              title={centerForm.mode === "edit" ? "Editar centro ANIDE" : "Crear centro ANIDE"}
              message="Indica los datos principales del centro."
              fields={centerFields}
              submitText={centerForm.mode === "edit" ? "Guardar cambios" : "Crear centro"}
              cancelText="Cancelar"
              onSubmit={submitCenter}
              onClose={() => setCenterForm(null)}
              modal={modal}
            />
          )}

          {!!roomForm && (
            <ModalForm
              title={roomForm.mode === "edit" ? "Editar habitación" : "Añadir habitación"}
              message="Configura la habitación del centro seleccionado."
              fields={roomFields}
              submitText={roomForm.mode === "edit" ? "Guardar cambios" : "Crear habitación"}
              cancelText="Cancelar"
              onSubmit={submitRoom}
              onClose={() => setRoomForm(null)}
              modal={modal}
            />
          )}

          {!!bedForm && (
            <ModalForm
              title={bedForm.mode === "edit" ? "Editar cama" : "Añadir cama"}
              message={`Habitación: ${bedForm.room?.name || "—"}`}
              fields={bedFields}
              submitText={bedForm.mode === "edit" ? "Guardar cambios" : "Crear cama"}
              cancelText="Cancelar"
              onSubmit={submitBed}
              onClose={() => setBedForm(null)}
              modal={modal}
            />
          )}

          {!!userForm && (
            <FormAnideUser
              mode={userForm.mode}
              doc={userForm.doc}
              modal={modal}
              onSubmit={submitUser}
              onClose={() => setUserForm(null)}
            />
          )}

          {!!assignStayData && (
            <ModalForm
              title="Asignar cama"
              message={`${assignStayData.center?.name || ""} · ${assignStayData.room?.name || ""} · ${assignStayData.bed?.name || ""}`}
              fields={assignUserFields}
              submitText="Asignar"
              cancelText="Cancelar"
              onSubmit={submitAssignStay}
              onClose={() => setAssignStayData(null)}
              modal={modal}
            />
          )}

          {!!moveStayData && (
            <ModalForm
              title="Trasladar usuaria"
              message="Selecciona una cama libre de destino. Se cerrará la estancia actual y se abrirá una nueva."
              fields={moveFields}
              submitText="Trasladar"
              cancelText="Cancelar"
              onSubmit={submitMoveStay}
              onClose={() => setMoveStayData(null)}
              modal={modal}
            />
          )}

          {!!closeStayData && !closeStayData.confirmForm && (
            <ModalConfirmation
              title="Registrar salida"
              message={`Vas a cerrar la estancia activa de ${closeStayData.name || buildFullName(closeStayData)}.`}
              onConfirm={() => {
                setCloseStayData({
                  ...closeStayData,
                  confirmForm: true,
                });
              }}
              onCancel={() => setCloseStayData(null)}
            />
          )}

          {!!closeStayData?.confirmForm && (
            <ModalForm
              title="Fecha de salida"
              message={`Indica la fecha de salida de ${closeStayData.name || buildFullName(closeStayData)}.`}
              fields={[
                {
                  name: "endDate",
                  label: "Fecha de salida",
                  type: "date",
                  required: true,
                  defaultValue: todayInput(),
                },
                {
                  name: "notes",
                  label: "Notas",
                  type: "textarea",
                  required: false,
                  defaultValue: "",
                },
              ]}
              submitText="Registrar salida"
              cancelText="Cancelar"
              onSubmit={submitCloseStay}
              onClose={() => setCloseStayData(null)}
              modal={modal}
            />
          )}

          {!!notesModal && (
            <ModalForm
              title={`Notas de ${notesModal.sourceName || buildFullName(notesModal.user)}`}
              message="Añade una nueva nota. Se guardará debajo de las anteriores."
              fields={[
                {
                  name: "newNote",
                  label: "Nueva nota",
                  type: "textarea",
                  required: true,
                  defaultValue: "",
                },
              ]}
              submitText="Añadir nota"
              cancelText="Cerrar"
              onSubmit={submitUserNote}
              onClose={() => setNotesModal(null)}
              modal={modal}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default ManagingAnide;