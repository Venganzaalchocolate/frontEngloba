import { useEffect, useMemo, useState } from "react";
import {
  FaArrowRightArrowLeft,
  FaArrowsRotate,
  FaDoorOpen,
  FaHouseMedical,
  FaPeopleGroup,
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

const isActiveStay = (stay = {}) =>
  stay.active !== false && (!stay.endDate || stay.endDate === null);

const getActiveStay = (person = {}) =>
  (person.staysAnide || []).find((stay) => isActiveStay(stay)) || null;

const getActiveFamilyMembers = (user = {}) =>
  (user.familyMembers || []).filter((member) => member.active !== false);

const getFamilySummary = (user = {}) => {
  const members = user.familyMembers || [];
  const children = members.filter((member) => member.relationship === "child").length;
  const dependents = members.filter((member) => member.relationship === "dependent").length;
  const accommodated = members.filter((member) => !!getActiveStay(member)).length;
  const active = members.filter((member) => member.active !== false).length;

  return {
    total: members.length,
    active,
    children,
    dependents,
    accommodated,
    pending: Math.max(active - accommodated, 0),
  };
};

const familyRelationshipLabel = (relationship) =>
  relationship === "dependent" ? "Persona dependiente" : "Menor";

const getPersonLabel = (person = {}) =>
  `${buildFullName(person) || "Sin nombre"}${person.relationship ? ` · ${familyRelationshipLabel(person.relationship)}` : ""}`;

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
  const [familyMemberForm, setFamilyMemberForm] = useState(null);
  const [expandedFamilyId, setExpandedFamilyId] = useState("");
  const [expandedAliasesId, setExpandedAliasesId] = useState("");
  const [openUserMenuId, setOpenUserMenuId] = useState("");
  const [openFamilyMenuId, setOpenFamilyMenuId] = useState("");
  const [aliasForm, setAliasForm] = useState(null);
  const [returnStayData, setReturnStayData] = useState(null);

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

  const getFreeBedsForCenter = (centroId, excludedBedId = "") =>
    freeBedsOptions.filter((bed) => {
      return (
        String(bed.centroId) === String(centroId) &&
        String(bed.camaId) !== String(excludedBedId)
      );
    });

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

      const previous = userForm?.doc;
      const changedName =
        userForm?.mode === "edit" &&
        previous &&
        (
          String(previous.firstName || "").trim() !== String(payload.firstName || "").trim() ||
          String(previous.lastName || "").trim() !== String(payload.lastName || "").trim()
        );

      // Conservamos el nombre que deja de ser actual para mantener
      // un historial completo de cambios de nombre.
      if (changedName && previous?.firstName) {
        await anideUsuariaManager(
          {
            type: "aliasAdd",
            usuariaId: previous._id,
            firstName: previous.firstName,
            lastName: previous.lastName || "",
            reason: "Cambio de nombre",
          },
          token
        );
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
    const selectedUserId = getFieldValue(values.usuariaId);
    const selectedUser =
      assignStayData?.user ||
      users.find((user) => String(user._id) === String(selectedUserId));

    if (!selectedUser) {
      modal("Usuaria requerida", "Selecciona una usuaria para asignarla a la cama.");
      return;
    }

    const familyMembers = getActiveFamilyMembers(selectedUser);

    // Primera pantalla: seleccionar responsable. Si tiene familia, se pide después
    // una cama para cada familiar activo antes de enviar nada al backend.
    if (!assignStayData?.user && familyMembers.length) {
      setAssignStayData((current) => ({
        ...current,
        user: selectedUser,
        step: "family",
        startDate: values.startDate,
        notes: values.notes || "",
      }));
      return;
    }

    const familyAssignments = familyMembers.map((member) => ({
      familyMemberId: member._id,
      habitacionId: getFieldValue(values[`familyBed_${member._id}`]).split("|")[1],
      camaId: getFieldValue(values[`familyBed_${member._id}`]).split("|")[2],
      notes: "",
    }));

    const invalidFamilyAssignment = familyAssignments.some(
      (item) => !item.habitacionId || !item.camaId
    );

    if (invalidFamilyAssignment) {
      modal("Camas requeridas", "Debes asignar una cama a cada familiar activo.");
      return;
    }

    const selectedBeds = [
      assignStayData?.bed?._id,
      ...familyAssignments.map((item) => item.camaId),
    ].map(String);

    if (new Set(selectedBeds).size !== selectedBeds.length) {
      modal("Camas repetidas", "Cada persona de la unidad familiar necesita una cama distinta.");
      return;
    }

    try {
      charge(true);
      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: "assignStay",
          usuariaId: selectedUser._id,
          centroId: assignStayData.center._id,
          province: refId(assignStayData.center.province),
          habitacionId: assignStayData.room._id,
          camaId: assignStayData.bed._id,
          startDate: assignStayData?.startDate || values.startDate,
          notes: assignStayData?.notes || values.notes || "",
          familyAssignments,
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo asignar la cama");
        return;
      }

      setAssignStayData(null);
      await refreshAll(false);
      modal(
        "ANIDE",
        familyMembers.length
          ? "Unidad familiar asignada correctamente"
          : "Cama asignada correctamente"
      );
    } catch (e) {
      modal("Error", e?.message || "No se pudo asignar la cama");
    } finally {
      charge(false);
    }
  };

  const openMoveStay = async (usuaria, currentCenter = null) => {
    const usuariaId = usuaria?.usuariaId || usuaria?._id;

    if (!usuariaId) {
      modal("Usuaria no encontrada", "No se ha podido identificar a la persona alojada.");
      return;
    }

    try {
      charge(true);

      const token = getToken();
      const fullUser = await anideUsuariaManager(
        {
          type: "get",
          usuariaId,
        },
        token
      );

      if (fullUser?.error) {
        modal(
          "Error",
          fullUser.message || "No se pudo cargar la unidad familiar de la usuaria."
        );
        return;
      }

      setMoveStayData({
        usuaria: fullUser,
        currentCenter,
        familyMemberId: usuaria?.familyMemberId || "",
      });
    } catch (e) {
      modal(
        "Error",
        e?.message || "No se pudo cargar la unidad familiar de la usuaria."
      );
    } finally {
      charge(false);
    }
  };

  const submitMoveStay = async (values) => {
    const user = moveStayData?.usuaria;
    const isFamilyMemberMove = Boolean(moveStayData?.familyMemberId);

    const target =
      moveStayData?.step === "family"
        ? moveStayData.target
        : freeBedsOptions.find(
            (item) => item.value === getFieldValue(values.targetBed)
          );

    if (!target) {
      modal("Cama requerida", "Selecciona una cama libre de destino.");
      return;
    }

    const familyMembers = getActiveFamilyMembers(user);

    // Para mover a un menor/dependiente comprobamos siempre la vivienda de
    // la responsable. `centro` puede llegar poblado como objeto, por eso
    // usamos refId() en vez de String(stay.centro).
    const currentStay = isFamilyMemberMove
      ? getActiveStay(user)
      : getActiveStay(user);

    const currentCentroId = refId(currentStay?.centro);
    const changesCenter =
      Boolean(currentCentroId) &&
      String(currentCentroId) !== String(target.centroId);

    // Una responsable que cambia de vivienda debe trasladar a toda la unidad.
    // Un menor/dependiente nunca puede cambiar de vivienda por separado.
    if (
      isFamilyMemberMove &&
      changesCenter
    ) {
      modal(
        "Traslado no permitido",
        "Un menor o persona dependiente solo puede cambiar de cama o habitación dentro de la vivienda de su responsable."
      );
      return;
    }

    if (
      !isFamilyMemberMove &&
      !moveStayData?.step &&
      changesCenter &&
      familyMembers.length
    ) {
      setMoveStayData((current) => ({
        ...current,
        step: "family",
        target,
        moveDate: values.moveDate,
        notes: values.notes || "",
      }));
      return;
    }

    const familyAssignments =
      moveStayData?.step === "family"
        ? familyMembers.map((member) => {
            const value = getFieldValue(values[`familyBed_${member._id}`]);
            const [, habitacionId, camaId] = value.split("|");

            return {
              familyMemberId: member._id,
              habitacionId,
              camaId,
              notes: "",
            };
          })
        : [];

    if (
      moveStayData?.step === "family" &&
      familyAssignments.some((item) => !item.habitacionId || !item.camaId)
    ) {
      modal(
        "Camas requeridas",
        "Debes asignar una cama a cada familiar activo de la unidad familiar."
      );
      return;
    }

    const allBeds = [target.camaId, ...familyAssignments.map((item) => item.camaId)]
      .filter(Boolean)
      .map(String);

    if (new Set(allBeds).size !== allBeds.length) {
      modal(
        "Camas repetidas",
        "Cada persona de la unidad familiar necesita una cama distinta."
      );
      return;
    }

    try {
      charge(true);

      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: "moveStay",
          usuariaId: user._id,
          familyMemberId: moveStayData?.familyMemberId || undefined,
          centroId: target.centroId,
          province: target.province,
          habitacionId: target.habitacionId,
          camaId: target.camaId,
          moveDate: moveStayData?.moveDate || values.moveDate,
          notes: moveStayData?.notes || values.notes || "",
          familyAssignments,
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo trasladar la usuaria");
        return;
      }

      setMoveStayData(null);
      await refreshAll(false);

      modal(
        "ANIDE",
        moveStayData?.step === "family"
          ? "Unidad familiar trasladada correctamente"
          : "Traslado registrado correctamente"
      );
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
          familyMemberId: closeStayData.familyMemberId || undefined,
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

  const submitFamilyMember = async (values) => {
    const isEdit = familyMemberForm?.mode === "edit";

    try {
      charge(true);
      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: isEdit ? "familyMemberUpdate" : "familyMemberAdd",
          usuariaId: familyMemberForm.usuaria._id,
          familyMemberId: isEdit ? familyMemberForm.member._id : undefined,
          firstName: String(values.firstName || "").trim(),
          lastName: String(values.lastName || "").trim(),
          birthday: values.birthday || null,
          relationship: values.relationship,
          documentId: String(values.documentId || "").trim(),
          notes: values.notes || "",
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo guardar el familiar");
        return;
      }

      setFamilyMemberForm(null);
      await loadUsers(false);
      await loadCenters(false, selectedCenterId);
      modal("ANIDE", isEdit ? "Familiar actualizado" : "Familiar añadido");
    } catch (e) {
      modal("Error", e?.message || "No se pudo guardar el familiar");
    } finally {
      charge(false);
    }
  };

  const openReturnStay = (user, familyMember = null) => {
    if (familyMember && !getActiveStay(user)) {
      modal(
        "Responsable sin alojamiento",
        "Primero debes volver a alojar a la responsable. Después podrás volver a alojar al menor o persona dependiente en esa misma vivienda."
      );
      return;
    }

    setReturnStayData({
      user,
      familyMember,
    });
  };

  const submitReturnStay = async (values) => {
    const target = freeBedsOptions.find(
      (bed) => bed.value === getFieldValue(values.targetBed)
    );

    if (!target) {
      modal("Cama requerida", "Selecciona una cama libre para volver a alojar.");
      return;
    }

    const user = returnStayData?.user;
    const familyMember = returnStayData?.familyMember;

    if (!user?._id) {
      modal("Error", "No se ha podido identificar a la responsable.");
      return;
    }

    if (familyMember) {
      const responsibleStay = getActiveStay(user);

      if (
        !responsibleStay ||
        String(refId(responsibleStay.centro)) !== String(target.centroId)
      ) {
        modal(
          "Vivienda no válida",
          "Un menor o persona dependiente debe volver a alojarse en la misma vivienda de su responsable."
        );
        return;
      }
    }

    try {
      charge(true);

      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: "assignStay",
          usuariaId: user._id,
          familyMemberId: familyMember?._id || undefined,
          centroId: target.centroId,
          province: target.province,
          habitacionId: target.habitacionId,
          camaId: target.camaId,
          startDate: values.startDate,
          notes: values.notes || "",
          familyAssignments: [],
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo volver a alojar.");
        return;
      }

      setReturnStayData(null);
      await refreshAll(false);
      modal(
        "ANIDE",
        familyMember
          ? "Familiar vuelto a alojar correctamente"
          : "Usuaria vuelta a alojar correctamente"
      );
    } catch (e) {
      modal("Error", e?.message || "No se pudo volver a alojar.");
    } finally {
      charge(false);
    }
  };

  const submitAlias = async (values) => {
    try {
      charge(true);

      const token = getToken();

      const resp = await anideUsuariaManager(
        {
          type: "aliasAdd",
          usuariaId: aliasForm.user._id,
          firstName: String(values.firstName || "").trim(),
          lastName: String(values.lastName || "").trim(),
          reason: String(values.reason || "").trim(),
        },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo guardar el nombre en el historial.");
        return;
      }

      setAliasForm(null);
      await loadUsers(false);
      modal("ANIDE", "Nombre añadido al historial correctamente");
    } catch (e) {
      modal("Error", e?.message || "No se pudo guardar el nombre en el historial.");
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
      label: "Usuaria responsable",
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

  const assignFamilyFields = useMemo(() => {
    const user = assignStayData?.user;
    const familyMembers = getActiveFamilyMembers(user);
    const options = getFreeBedsForCenter(
      assignStayData?.center?._id,
      assignStayData?.bed?._id
    ).map((bed) => ({
      value: bed.value,
      label: `${bed.label}`,
    }));

    return familyMembers.map((member) => ({
      name: `familyBed_${member._id}`,
      label: `${getPersonLabel(member)} · cama`,
      type: "select",
      searchable: true,
      required: true,
      defaultValue: "",
      options: [
        { value: "", label: "Selecciona una cama libre" },
        ...options,
      ],
    }));
  }, [assignStayData, freeBedsOptions]);

  const moveFields = useMemo(() => {
    const isFamilyMemberMove = Boolean(moveStayData?.familyMemberId);
    const responsibleStay = getActiveStay(moveStayData?.usuaria);
    const responsibleCentroId = refId(responsibleStay?.centro);

    const availableBeds = isFamilyMemberMove
      ? freeBedsOptions.filter(
          (bed) => String(bed.centroId) === String(responsibleCentroId)
        )
      : freeBedsOptions;

    return [
      {
        name: "targetBed",
        label: isFamilyMemberMove
          ? "Cama libre en la vivienda de la responsable"
          : "Cama libre de destino",
        type: "select",
        searchable: true,
        required: true,
        defaultValue: "",
        options: [
          {
            value: "",
            label: isFamilyMemberMove
              ? availableBeds.length
                ? "Selecciona una cama de la misma vivienda"
                : "No hay camas libres en la vivienda de la responsable"
              : "Selecciona una cama libre",
          },
          ...availableBeds,
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
    ];
  }, [freeBedsOptions, moveStayData]);

  const moveFamilyFields = useMemo(() => {
    const user = moveStayData?.usuaria;
    const target = moveStayData?.target;
    const familyMembers = getActiveFamilyMembers(user);
    const options = getFreeBedsForCenter(target?.centroId, target?.camaId);

    return familyMembers.map((member) => ({
      name: `familyBed_${member._id}`,
      label: `${getPersonLabel(member)} · cama en ${target?.label || "la nueva vivienda"}`,
      type: "select",
      searchable: true,
      required: true,
      defaultValue: "",
      options: [
        { value: "", label: "Selecciona una cama libre" },
        ...options,
      ],
    }));
  }, [moveStayData, freeBedsOptions]);

  const returnStayFields = useMemo(() => {
    const user = returnStayData?.user;
    const familyMember = returnStayData?.familyMember;
    const responsibleStay = getActiveStay(user);
    const availableBeds = familyMember
      ? freeBedsOptions.filter(
          (bed) =>
            String(bed.centroId) === String(refId(responsibleStay?.centro))
        )
      : freeBedsOptions;

    return [
      {
        name: "targetBed",
        label: familyMember
          ? "Cama libre en la vivienda de la responsable"
          : "Cama libre para volver a alojar",
        type: "select",
        searchable: true,
        required: true,
        defaultValue: "",
        options: [
          {
            value: "",
            label: availableBeds.length
              ? "Selecciona una cama libre"
              : "No hay camas disponibles",
          },
          ...availableBeds,
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
        label: "Notas de la nueva estancia",
        type: "textarea",
        required: false,
        defaultValue: "",
      },
    ];
  }, [returnStayData, freeBedsOptions]);

  const familyMemberFields = useMemo(() => {
    const member = familyMemberForm?.member;

    return [
      {
        name: "firstName",
        label: "Nombre",
        type: "text",
        required: true,
        defaultValue: member?.firstName || "",
      },
      {
        name: "lastName",
        label: "Apellidos",
        type: "text",
        required: false,
        defaultValue: member?.lastName || "",
      },
      {
        name: "birthday",
        label: "Fecha de nacimiento",
        type: "date",
        required: false,
        defaultValue: member?.birthday
          ? new Date(member.birthday).toISOString().slice(0, 10)
          : "",
      },
      {
        name: "relationship",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: member?.relationship || "child",
        options: [
          { value: "child", label: "Menor" },
          { value: "dependent", label: "Persona dependiente" },
        ],
      },
      {
        name: "documentId",
        label: "Documento / identificador",
        type: "text",
        required: false,
        defaultValue: member?.documentId || "",
      },
      {
        name: "notes",
        label: "Notas",
        type: "textarea",
        required: false,
        defaultValue: member?.notes || "",
      },
    ];
  }, [familyMemberForm]);

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
                {users.map((user) => {
                  const stay = getActiveStay(user);
                  const hasActiveStay = Boolean(stay);
                  const summary = getFamilySummary(user);
                  const aliases = user.aliases || [];
                  const menuOpen = String(openUserMenuId) === String(user._id);
                  const familyOpen = String(expandedFamilyId) === String(user._id);
                  const aliasesOpen =
                    String(expandedAliasesId) === String(user._id);

                  return (
                    <article
                      className={[
                        styles.userCard,
                        hasActiveStay ? styles.userCardActive : styles.userCardInactive,
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      key={user._id}
                    >
                      <div className={styles.userCardHeader}>
                        <div className={styles.userIdentity}>
                          <div className={styles.userNameLine}>
                            <h3>{buildFullName(user)}</h3>
                            <span
                              className={
                                hasActiveStay
                                  ? styles.statusBadgeActive
                                  : styles.statusBadgeInactive
                              }
                            >
                              {hasActiveStay
                                ? "Alojada"
                                : user.active === false
                                  ? "Salida registrada"
                                  : "Sin alojamiento"}
                            </span>
                          </div>

                          <span className={styles.userDocument}>
                            {user.documentId || "Sin identificador"}
                          </span>

                          <div className={styles.userMeta}>
                            <span>{getNationalityLabel(user.nationality)}</span>
                            <span>{genderLabel(user.gender)}</span>
                          </div>

                          {!!aliases.length && (
                            <button
                              type="button"
                              className={styles.aliasToggle}
                              onClick={() =>
                                setExpandedAliasesId((current) =>
                                  String(current) === String(user._id)
                                    ? ""
                                    : String(user._id)
                                )
                              }
                            >
                              Historial de nombres ({aliases.length})
                              <span>{aliasesOpen ? "▴" : "▾"}</span>
                            </button>
                          )}
                        </div>

                        <div className={styles.userCardActions}>
                          {hasActiveStay ? (
                            <button
                              type="button"
                              className={styles.primaryExitButton}
                              onClick={() => openCloseStay(user)}
                            >
                              <FaSignOutAlt /> Salida
                            </button>
                          ) : (
                            <button
                              type="button"
                              className={styles.primaryReturnButton}
                              onClick={() => openReturnStay(user)}
                            >
                              Volver a alojar
                            </button>
                          )}

                          <div className={styles.actionMenuWrap}>
                            <button
                              type="button"
                              className={styles.menuButton}
                              onClick={() =>
                                setOpenUserMenuId((current) =>
                                  String(current) === String(user._id)
                                    ? ""
                                    : String(user._id)
                                )
                              }
                              title="Más acciones"
                              aria-label={`Más acciones para ${buildFullName(user)}`}
                            >
                              ⋮
                            </button>

                            {menuOpen && (
                              <div className={styles.actionMenu}>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setUserForm({ mode: "edit", doc: user });
                                    setOpenUserMenuId("");
                                  }}
                                >
                                  <FaUserEdit /> Editar datos
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setExpandedFamilyId((current) =>
                                      String(current) === String(user._id)
                                        ? ""
                                        : String(user._id)
                                    );
                                    setOpenUserMenuId("");
                                  }}
                                >
                                  <FaPeopleGroup /> Gestionar familia
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setAliasForm({ user });
                                    setOpenUserMenuId("");
                                  }}
                                >
                                  + Registrar nombre usado
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    viewUserNotes(user);
                                    setOpenUserMenuId("");
                                  }}
                                >
                                  <FaStickyNote /> Ver notas
                                </button>

                                <button
                                  type="button"
                                  onClick={() => {
                                    openUserNotes(user);
                                    setOpenUserMenuId("");
                                  }}
                                >
                                  <FaStickyNote /> Añadir nota
                                </button>

                                {hasActiveStay && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      openMoveStay(user);
                                      setOpenUserMenuId("");
                                    }}
                                  >
                                    <FaArrowRightArrowLeft /> Trasladar
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className={styles.userCardInfo}>
                        <div className={styles.familySummaryCard}>
                          {summary.total ? (
                            <>
                              <strong>
                                {summary.total} {summary.total === 1 ? "persona" : "personas"} a cargo
                              </strong>
                              <span>
                                {summary.children
                                  ? `${summary.children} menores`
                                  : ""}
                                {summary.children && summary.dependents
                                  ? " · "
                                  : ""}
                                {summary.dependents
                                  ? `${summary.dependents} dependientes`
                                  : ""}
                              </span>
                              <span>
                                {summary.accommodated}/{summary.total} alojadas actualmente
                              </span>
                            </>
                          ) : (
                            <>
                              <strong>Sin familiares a cargo</strong>
                              <span>Unidad individual</span>
                            </>
                          )}
                        </div>

                        <button
                          type="button"
                          className={styles.familyManageButton}
                          onClick={() =>
                            setExpandedFamilyId((current) =>
                              String(current) === String(user._id)
                                ? ""
                                : String(user._id)
                            )
                          }
                        >
                          <FaPeopleGroup />
                          {familyOpen ? "Ocultar familia" : "Ver familia"}
                        </button>
                      </div>

                      {aliasesOpen && (
                        <section className={styles.aliasesPanel}>
                          <strong>Historial de nombres</strong>
                          <div className={styles.aliasesList}>
                            {aliases.map((alias) => (
                              <div key={alias._id || `${alias.firstName}-${alias.changedAt}`}>
                                <span>{buildFullName(alias)}</span>
                                <small>
                                  {alias.changedAt
                                    ? new Date(alias.changedAt).toLocaleDateString("es-ES")
                                    : "Fecha no disponible"}
                                  {alias.reason ? ` · ${alias.reason}` : " · Cambio de nombre"}
                                </small>
                              </div>
                            ))}
                          </div>
                        </section>
                      )}

                      {familyOpen && (
                        <section className={styles.familyPanel}>
                          <div className={styles.familyPanelHeader}>
                            <div>
                              <strong>Unidad familiar</strong>
                              <span>
                                Cada familiar ocupa una cama propia dentro de la vivienda de la responsable.
                              </span>
                            </div>

                            <button
                              type="button"
                              onClick={() =>
                                setFamilyMemberForm({
                                  mode: "create",
                                  usuaria: user,
                                  member: null,
                                })
                              }
                            >
                              <FaUserPlus /> Añadir familiar
                            </button>
                          </div>

                          <div className={styles.familyMembersList}>
                            {(user.familyMembers || []).map((member) => {
                              const memberStay = getActiveStay(member);
                              const memberMenuId = `${user._id}:${member._id}`;
                              const memberMenuOpen =
                                String(openFamilyMenuId) === memberMenuId;

                              return (
                                <article
                                  className={[
                                    styles.familyMemberCard,
                                    member.relationship === "dependent"
                                      ? styles.familyMemberDependent
                                      : styles.familyMemberChild,
                                    memberStay
                                      ? styles.familyMemberActive
                                      : styles.familyMemberInactive,
                                  ]
                                    .filter(Boolean)
                                    .join(" ")}
                                  key={member._id}
                                >
                                  <div className={styles.familyMemberIdentity}>
                                    <strong>{buildFullName(member)}</strong>
                                    <span>
                                      {familyRelationshipLabel(member.relationship)}
                                    </span>
                                    <small>
                                      {memberStay
                                        ? "Alojado/a"
                                        : member.active === false
                                          ? "Salida registrada"
                                          : "Pendiente de alojamiento"}
                                    </small>
                                  </div>

                                  <div className={styles.familyMemberActions}>
                                    {memberStay ? (
                                      <button
                                        type="button"
                                        className={styles.memberExitButton}
                                        onClick={() =>
                                          openCloseStay({
                                            usuariaId: user._id,
                                            familyMemberId: member._id,
                                            name: buildFullName(member),
                                          })
                                        }
                                      >
                                        <FaSignOutAlt /> Salida
                                      </button>
                                    ) : (
                                      <button
                                        type="button"
                                        className={styles.memberReturnButton}
                                        onClick={() => openReturnStay(user, member)}
                                      >
                                        {member.active === false
                                          ? "Volver a alojar"
                                          : "Alojar"}
                                      </button>
                                    )}

                                    <div className={styles.actionMenuWrap}>
                                      <button
                                        type="button"
                                        className={styles.menuButton}
                                        onClick={() =>
                                          setOpenFamilyMenuId((current) =>
                                            String(current) === memberMenuId
                                              ? ""
                                              : memberMenuId
                                          )
                                        }
                                        title="Más acciones"
                                        aria-label={`Más acciones para ${buildFullName(member)}`}
                                      >
                                        ⋮
                                      </button>

                                      {memberMenuOpen && (
                                        <div className={styles.actionMenu}>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setFamilyMemberForm({
                                                mode: "edit",
                                                usuaria: user,
                                                member,
                                              });
                                              setOpenFamilyMenuId("");
                                            }}
                                          >
                                            <FaEdit /> Editar datos
                                          </button>

                                          {memberStay && (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                openMoveStay({
                                                  usuariaId: user._id,
                                                  familyMemberId: member._id,
                                                  name: buildFullName(member),
                                                });
                                                setOpenFamilyMenuId("");
                                              }}
                                            >
                                              <FaArrowRightArrowLeft /> Trasladar
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </article>
                              );
                            })}
                          </div>

                          {!(user.familyMembers || []).length && (
                            <div className={styles.familyEmpty}>
                              No hay menores ni personas dependientes registrados.
                            </div>
                          )}
                        </section>
                      )}
                    </article>
                  );
                })}

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
              title={assignStayData.step === "family" ? "Asignar unidad familiar" : "Asignar cama"}
              message={
                assignStayData.step === "family"
                  ? `Asigna una cama a cada persona a cargo de ${buildFullName(assignStayData.user)} dentro de ${assignStayData.center?.name || "la vivienda"}.`
                  : `${assignStayData.center?.name || ""} · ${assignStayData.room?.name || ""} · ${assignStayData.bed?.name || ""}`
              }
              fields={assignStayData.step === "family" ? assignFamilyFields : assignUserFields}
              submitText={assignStayData.step === "family" ? "Asignar unidad" : "Continuar"}
              cancelText="Cancelar"
              onSubmit={submitAssignStay}
              onClose={() => setAssignStayData(null)}
              modal={modal}
            />
          )}

          {!!moveStayData && (
            <ModalForm
              title={moveStayData.step === "family" ? "Trasladar unidad familiar" : "Trasladar usuaria"}
              message={
                moveStayData.step === "family"
                  ? `Como cambia de vivienda, asigna una cama a cada familiar de ${buildFullName(moveStayData.usuaria)}.`
                  : "Selecciona una cama libre de destino. Dentro de la misma vivienda se mueve solo la responsable."
              }
              fields={moveStayData.step === "family" ? moveFamilyFields : moveFields}
              submitText={moveStayData.step === "family" ? "Trasladar unidad" : "Continuar"}
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

          {!!returnStayData && (
            <ModalForm
              title={
                returnStayData.familyMember
                  ? "Volver a alojar familiar"
                  : "Volver a alojar usuaria"
              }
              message={
                returnStayData.familyMember
                  ? `Responsable: ${buildFullName(returnStayData.user)}. El familiar se alojará dentro de la misma vivienda.`
                  : `Selecciona una cama para volver a alojar a ${buildFullName(returnStayData.user)}. Los familiares pueden volver después de forma individual.`
              }
              fields={returnStayFields}
              submitText="Registrar entrada"
              cancelText="Cancelar"
              onSubmit={submitReturnStay}
              onClose={() => setReturnStayData(null)}
              modal={modal}
            />
          )}

          {!!aliasForm && (
            <ModalForm
              title="Registrar nombre usado"
              message={`Registra un nombre que haya usado ${buildFullName(aliasForm.user)}. No modifica su nombre actual; el historial conserva todos los cambios de nombre.`}
              fields={[
                {
                  name: "firstName",
                  label: "Nombre",
                  type: "text",
                  required: true,
                  defaultValue: "",
                },
                {
                  name: "lastName",
                  label: "Apellidos",
                  type: "text",
                  required: false,
                  defaultValue: "",
                },
                {
                  name: "reason",
                  label: "Motivo o contexto",
                  type: "text",
                  required: false,
                  defaultValue: "",
                },
              ]}
              submitText="Guardar en historial"
              cancelText="Cancelar"
              onSubmit={submitAlias}
              onClose={() => setAliasForm(null)}
              modal={modal}
            />
          )}

          {!!familyMemberForm && (
            <ModalForm
              title={
                familyMemberForm.mode === "edit"
                  ? "Editar familiar"
                  : "Añadir familiar"
              }
              message={`Responsable: ${buildFullName(familyMemberForm.usuaria)}`}
              fields={familyMemberFields}
              submitText={
                familyMemberForm.mode === "edit"
                  ? "Guardar cambios"
                  : "Añadir familiar"
              }
              cancelText="Cancelar"
              onSubmit={submitFamilyMember}
              onClose={() => setFamilyMemberForm(null)}
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