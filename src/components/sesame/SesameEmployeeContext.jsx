import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/sesameEmployeeContext.module.css";
import {
  FaBuilding,
  FaUserTie,
  FaUserClock,
  FaTrashAlt,
  FaBullseye,
  FaUserPlus,
  FaExchangeAlt,
} from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";

import { getToken } from "../../lib/serviceToken";
import {
  postSesameDeleteEmployeeOfficeAssignation,
  postSesameGetEmployeeContext,
  postSesameGetOfficeEmployees,
  postSesameGetDepartmentEmployees,
  searchusername,
  postSesameAssignOfficeEmployee,
  postSesameAssignDepartmentEmployee,
  postSesameUpdateEmployeeManagersByEmployee,
  searchSesameEligibleManagersByEmployee,
  postSesameDeleteOfficeEmployee,
  postSesameDeleteDepartmentEmployee,
  postSesameCreateDepartmentForUser,
  postSesameDeleteDepartment,
  postSesameToggleEmployeeForUser,
  postSesameInviteEmployeeForUser,
  assignDispositiveDepartmentAdminToUser,
  postSesameRemoveDepartmentAdminRoleFromUser,
  postSesameAssignEmployeeToDispositiveScopes,
} from "../../lib/data";

import ModalConfirmation from "../globals/ModalConfirmation";
import ModalForm from "../globals/ModalForm";

const safeText = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const buildFullName = (item) => {
  if (!item) return "—";
  return [item.firstName, item.lastName].filter(Boolean).join(" ").trim() || item.fullName || "—";
};

export default function SesameEmployeeContext({
  user,
  modal,
  charge,
  enumsData,
  changeUser,
}) {
  const [contextData, setContextData] = useState(null);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [showAddOfficeModal, setShowAddOfficeModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [showChangeManagersModal, setShowChangeManagersModal] = useState(false);
  const [showAssignDispositiveDepartmentModal, setShowAssignDispositiveDepartmentModal] = useState(false);

  const [selectSesameWorkplaceModal, setSelectSesameWorkplaceModal] = useState(false);
  const [pendingSesameDispositiveId, setPendingSesameDispositiveId] = useState(null);

  const [deleteOfficeCtx, setDeleteOfficeCtx] = useState(null);
  const [deleteWorkerCtx, setDeleteWorkerCtx] = useState(null);
  const [deleteDepartmentCtx, setDeleteDepartmentCtx] = useState(null);

  const [viewWorkersCtx, setViewWorkersCtx] = useState(null);
  const [addWorkerCtx, setAddWorkerCtx] = useState(null);
  const [changeManagersCtx, setChangeManagersCtx] = useState(null);

  const [managerOptions, setManagerOptions] = useState({ loading: false, options: [] });
  const [viewWorkersData, setViewWorkersData] = useState({ loading: false, title: "", employees: [] });

  const employeeId = user?._id || "";
  const hasSesameLinked = !!user?.userIdSesame;
  const sesameStatus = String(contextData?.employee?.status || "").toLowerCase();

  const officeAssignations = Array.isArray(contextData?.officeAssignations) ? contextData.officeAssignations : [];
  const departmentAssignations = Array.isArray(contextData?.departmentAssignations) ? contextData.departmentAssignations : [];

  const absencesManagers = useMemo(() => (
    Array.isArray(contextData?.managers?.absencesManagement)
      ? contextData.managers.absencesManagement
      : []
  ), [contextData]);

  const checksManagers = useMemo(() => (
    Array.isArray(contextData?.managers?.checksManageRequestsAndIncidences)
      ? contextData.managers.checksManageRequestsAndIncidences
      : []
  ), [contextData]);

  const managedDepartmentsResolved = useMemo(() => (
    Array.isArray(contextData?.roles?.managedDepartments)
      ? contextData.roles.managedDepartments.map((item) => ({
        ...item,
        name: item?.entityName || item?.raw?.entityName || item?.raw?.department?.name || item?.departmentName || item?.affectedEntityId,
      }))
      : []
  ), [contextData]);

  const personalDepartmentName = useMemo(() => {
    return [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim().toLowerCase();
  }, [user]);

  const hasPersonalDepartment = useMemo(() => {
    if (!personalDepartmentName) return false;

    return managedDepartmentsResolved.some((item) => {
      const departmentName = String(
        item?.name ||
        item?.entityName ||
        item?.raw?.department?.name ||
        ""
      ).trim().toLowerCase();

      return departmentName === personalDepartmentName;
    });
  }, [managedDepartmentsResolved, personalDepartmentName]);

  const officeAssignationsResolved = useMemo(() => {
    const dispositives = Object.values(enumsData?.dispositiveIndex || {});

    const assignedDepartmentIds = new Set(
      departmentAssignations
        .map((item) => item?.id || item?.departmentId)
        .filter(Boolean)
        .map(String)
    );

    return officeAssignations.map((office) => {
      const officeId = String(office?.id || "");

      const linkedDispositives = dispositives
        .filter((device) => {
          if (!device?.departamentSesame) return false;
          if (!assignedDepartmentIds.has(String(device.departamentSesame))) return false;

          const workplaces = Array.isArray(device.workplaces) ? device.workplaces : [];

          return workplaces.some((workplace) =>
            workplace &&
            typeof workplace === "object" &&
            String(workplace.officeIdSesame || "") === officeId
          );
        })
        .map((device) => {
          const program = device.program
            ? enumsData?.programsIndex?.[String(device.program)] || null
            : null;

          return {
            dispositiveId: String(device._id),
            dispositiveName: device.name || "Dispositivo sin nombre",
            departmentId: String(device.departamentSesame),
            programName: program?.acronym || program?.name || "",
          };
        });

      return {
        ...office,
        linkedDispositives,
      };
    });
  }, [officeAssignations, departmentAssignations, enumsData]);

  const getDispositiveWorkplacesWithOffice = useCallback(
    (dispositiveId) => {
      const dispositive = enumsData?.dispositiveIndex?.[String(dispositiveId)] || null;
      const workplaces = Array.isArray(dispositive?.workplaces) ? dispositive.workplaces : [];

      return workplaces
        .filter((workplace) => workplace && typeof workplace === "object")
        .filter((workplace) => workplace?.active !== false)
        .filter((workplace) => !!workplace?.officeIdSesame);
    },
    [enumsData?.dispositiveIndex]
  );

  const sesameDispositiveOptions = useMemo(() => {
    return Object.values(enumsData?.dispositiveIndex || {})
      .filter((item) => item?.active !== false)
      .filter((item) => !!item?.departamentSesame)
      .filter((item) => {
        const workplaces = Array.isArray(item?.workplaces) ? item.workplaces : [];

        return workplaces
          .filter((workplace) => workplace && typeof workplace === "object")
          .some((workplace) => workplace?.active !== false && !!workplace?.officeIdSesame);
      })
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"))
      .map((item) => ({
        value: String(item._id),
        label: `${item.name || "Dispositivo sin nombre"}${item.program ? ` - ${enumsData?.programsIndex?.[String(item.program)]?.name || ""}` : ""
          }`,
      }));
  }, [enumsData?.dispositiveIndex, enumsData?.programsIndex]);

  const sesameWorkplaceOptions = useMemo(() => {
    if (!pendingSesameDispositiveId) return [];

    return getDispositiveWorkplacesWithOffice(pendingSesameDispositiveId)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"))
      .map((workplace) => ({
        value: String(workplace._id),
        label: workplace.name || "Centro de trabajo sin nombre",
      }));
  }, [pendingSesameDispositiveId, getDispositiveWorkplacesWithOffice]);

  const dispositiveDepartmentOptions = useMemo(() => {
    const dispositiveIndex = enumsData?.dispositiveIndex || {};
    const programsIndex = enumsData?.programsIndex || {};
    const provincesIndex = enumsData?.provincesIndex || {};

    return Object.values(dispositiveIndex)
      .filter((item) => item?.active !== false)
      .filter((item) => !!item?.departamentSesame)
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"))
      .map((item) => {
        const programName = item.program
          ? programsIndex[String(item.program)]?.acronym || programsIndex[String(item.program)]?.name || ""
          : "";

        const provinceName = item.province
          ? provincesIndex[String(item.province)]?.name || ""
          : "";

        return {
          value: String(item._id),
          label: [
            item.name || "Dispositivo sin nombre",
            programName,
            provinceName,
          ].filter(Boolean).join(" · "),
        };
      });
  }, [enumsData]);

  const sesameActionLabel = !hasSesameLinked
    ? "Crear"
    : sesameStatus === "active"
      ? "Inactivar"
      : "Activar";

  const loadContext = async (sesameIdOverride = null) => {
    const finalUserIdSesame = sesameIdOverride || user?.userIdSesame;

    if (!user?._id || !finalUserIdSesame) {
      setContextData(null);
      return;
    }

    setLoadingLocal(true);
    charge(true);

    try {
      const res = await postSesameGetEmployeeContext({ employeeId }, getToken());

      if (!res || res.error) {
        setContextData(null);
        modal("Error", res?.message || "No se pudo obtener el contexto de Sesame");
        return;
      }

      setContextData(res);
    } finally {
      charge(false);
      setLoadingLocal(false);
    }
  };

  useEffect(() => {
    loadContext();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [employeeId, user?.userIdSesame]);

  const searchUsers = async (query) => {
    if (!query || query.trim().length < 3) return [];

    const res = await searchusername({ query }, getToken());
    const users = res?.users || [];

    return users
      .filter((u) => !!u?.userIdSesame)
      .map((u) => ({
        value: u._id,
        label: `${u.firstName || ""} ${u.lastName || ""} (${u.email || "sin email"})`,
      }));
  };

  const loadEligibleManagers = async (employee) => {
    if (!employee?.employeeId) {
      setManagerOptions({ loading: false, options: [] });
      return;
    }

    setManagerOptions({ loading: true, options: [] });

    const res = await searchSesameEligibleManagersByEmployee(
      { employeeIdSesame: employee.employeeId, query: "" },
      getToken()
    );

    if (!res || res.error) {
      setManagerOptions({ loading: false, options: [] });
      modal("Error", res?.message || "No se pudieron cargar los responsables");
      return;
    }

    setManagerOptions({
      loading: false,
      options: (res.users || [])
        .filter((u) => !!u?._id)
        .map((u) => ({
          value: u._id,
          label: `${u.firstName || ""} ${u.lastName || ""} (${u.email || "sin email"})`,
        })),
    });
  };

  const handleAssignOfficeFromDispositive = async (formData) => {
    const dispositiveId = formData?.dispositiveId;

    if (!dispositiveId) {
      modal("Error", "Debes seleccionar un dispositivo");
      return;
    }

    const workplaces = getDispositiveWorkplacesWithOffice(dispositiveId);

    if (!workplaces.length) {
      modal("Error", "El dispositivo seleccionado no tiene centros de trabajo con oficina Sesame");
      return;
    }

    if (workplaces.length > 1) {
      setPendingSesameDispositiveId(dispositiveId);
      setShowAddOfficeModal(false);
      setSelectSesameWorkplaceModal(true);
      return;
    }

    charge(true);

    const res = await postSesameAssignEmployeeToDispositiveScopes(
      {
        userId: employeeId,
        dispositiveId,
        workplaceId: String(workplaces[0]._id),
        isMainOffice: officeAssignations.length === 0,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo asignar la oficina y el departamento");
      charge(false);
      return;
    }

    setShowAddOfficeModal(false);
    setPendingSesameDispositiveId(null);

    await loadContext();

    modal("Sesame", "La asignación se ha actualizado correctamente.");
    charge(false);
  };

  const handleSelectSesameWorkplace = async (formData) => {
    if (!pendingSesameDispositiveId || !formData?.workplaceId) {
      modal("Error", "Debes seleccionar un centro de trabajo");
      return;
    }

    charge(true);

    const res = await postSesameAssignEmployeeToDispositiveScopes(
      {
        userId: employeeId,
        dispositiveId: pendingSesameDispositiveId,
        workplaceId: formData.workplaceId,
        isMainOffice: officeAssignations.length === 0,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo asignar la oficina y el departamento");
      charge(false);
      return;
    }

    setSelectSesameWorkplaceModal(false);
    setPendingSesameDispositiveId(null);

    await loadContext();

    modal("Sesame", "La asignación se ha actualizado correctamente.");
    charge(false);
  };

  const handleToggleSesameEmployee = async () => {
    charge(true);

    const res = await postSesameToggleEmployeeForUser({ userId: employeeId }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo cambiar el estado en Sesame");
      charge(false);
      return;
    }

    if (res?.sesameId && (!user?.userIdSesame || String(user.userIdSesame) !== String(res.sesameId))) {
      changeUser?.({ ...user, userIdSesame: res.sesameId });
    }

    await loadContext(res?.sesameId || null);

    const message =
      res?.action === "created"
        ? "El usuario se ha creado en Sesame correctamente."
        : res?.action === "enabled"
          ? "El usuario se ha activado en Sesame correctamente."
          : res?.action === "disabled"
            ? "El usuario se ha inactivado en Sesame correctamente."
            : "La operación se ha realizado correctamente.";

    modal("Sesame", message);
    charge(false);
  };

  const handleInviteSesameEmployee = async () => {
    charge(true);

    const res = await postSesameInviteEmployeeForUser({ userId: employeeId }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo enviar la invitación");
      charge(false);
      return;
    }

    if (res?.sesameId && (!user?.userIdSesame || String(user.userIdSesame) !== String(res.sesameId))) {
      changeUser?.({ ...user, userIdSesame: res.sesameId });
    }

    await loadContext(res?.sesameId || null);
    modal("Invitación enviada", "La invitación de Sesame se ha enviado correctamente.");
    charge(false);
  };

  const handleDeleteOfficeAssignation = (item) => {
    if (!item?.id || !user?._id) {
      modal("Error", "No se puede borrar la asignación");
      return;
    }

    setDeleteOfficeCtx(item);
  };

  const doDeleteOfficeAssignation = async (item) => {
    const officeId = item?.id || false;

    if (!employeeId || !officeId) {
      setDeleteOfficeCtx(null);
      modal("Error", "No se puede borrar la asignación");
      return;
    }

    charge(true);

    const res = await postSesameDeleteEmployeeOfficeAssignation(
      { employeeId, officeId },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo eliminar la asignación");
      charge(false);
      return;
    }

    setDeleteOfficeCtx(null);
    await loadContext();
    modal("Asignación eliminada", "La persona se ha quitado correctamente de esta asignación en Sesame.");
    charge(false);
  };

  const openWorkersSection = async ({ type, id, title, canManageWorkers = true  }) => {
    if (!id) {
      modal("Error", "No se encontró el identificador");
      return;
    }

    setViewWorkersCtx({ type, id, title, canManageWorkers });
    setViewWorkersData({ loading: true, title, employees: [] });
    charge(true);

    const res =
      type === "office"
        ? await postSesameGetOfficeEmployees({ officeId: id }, getToken())
        : await postSesameGetDepartmentEmployees({ departmentId: id }, getToken());

    if (!res || res.error) {
      setViewWorkersCtx(null);
      setViewWorkersData({ loading: false, title: "", employees: [] });
      modal("Error", res?.message || "No se pudieron cargar los trabajadores");
      charge(false);
      return;
    }

    setViewWorkersData({
      loading: false,
      title,
      employees: Array.isArray(res?.employees) ? res.employees : [],
    });

    charge(false);
  };

  const closeWorkersSection = () => {
    setViewWorkersCtx(null);
    setViewWorkersData({ loading: false, title: "", employees: [] });
  };

  const openAddWorkerModal = ({ type, id, title }) => {
    if (!id) {
      modal("Error", "No se encontró el identificador");
      return;
    }

    setAddWorkerCtx({ type, id, title });
    setShowAddWorkerModal(true);
  };

  const handleAddWorker = async (formData) => {
    if (!addWorkerCtx?.id || !formData?.userId) {
      modal("Error", "Debes seleccionar una persona");
      return;
    }

    charge(true);

    const res =
      addWorkerCtx.type === "office"
        ? await postSesameAssignOfficeEmployee(
          { officeId: addWorkerCtx.id, userId: formData.userId, isMainOffice: false },
          getToken()
        )
        : await postSesameAssignDepartmentEmployee(
          { departmentId: addWorkerCtx.id, userId: formData.userId },
          getToken()
        );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo añadir el trabajador");
      charge(false);
      return;
    }

    modal("Trabajador añadido", "La persona se ha añadido correctamente.");
    setShowAddWorkerModal(false);
    setAddWorkerCtx(null);

    if (viewWorkersCtx?.id === addWorkerCtx.id && viewWorkersCtx?.type === addWorkerCtx.type) {
      await openWorkersSection(viewWorkersCtx);
    }

    charge(false);
  };

  const openChangeManagersModal = async (employee) => {
    if (!employee?.employeeId) {
      modal("Error", "No se encontró el empleado");
      return;
    }

    setChangeManagersCtx({ employee });
    await loadEligibleManagers(employee);
    setShowChangeManagersModal(true);
  };

  const openChangeManagersModalForCurrentEmployee = async () => {
    if (!contextData?.employee?.id) {
      modal("Error", "No se encontró el empleado");
      return;
    }

    const employee = {
      employeeId: contextData.employee.id,
      fullName: contextData.employee.fullName,
    };

    setChangeManagersCtx({ employee });
    await loadEligibleManagers(employee);
    setShowChangeManagersModal(true);
  };

  const handleChangeManagers = async (formData) => {
    if (!changeManagersCtx?.employee?.employeeId) {
      modal("Error", "No se encontró el empleado");
      return;
    }

    charge(true);

    const res = await postSesameUpdateEmployeeManagersByEmployee(
      {
        employeeIdSesame: changeManagersCtx.employee.employeeId,
        absencesManagerUserId: formData.absencesManagerUserId || null,
        checksManagerUserId: formData.checksManagerUserId || null,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudieron cambiar los responsables");
      charge(false);
      return;
    }

    modal("Responsables actualizados", "Los responsables de vacaciones y fichajes se han actualizado correctamente.");
    setShowChangeManagersModal(false);
    setChangeManagersCtx(null);

    if (viewWorkersCtx) await openWorkersSection(viewWorkersCtx);
    await loadContext();

    charge(false);
  };

  const handleCreateDepartment = async () => {
    charge(true);

    const res = await postSesameCreateDepartmentForUser({ userId: employeeId }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo crear el departamento");
      charge(false);
      return;
    }

    await loadContext();
    modal("Departamento creado", "El departamento de supervisión se ha creado correctamente.");
    charge(false);
  };

  const handleAssignDispositiveDepartment = async (formData) => {
    if (!employeeId || !formData?.dispositiveId) {
      modal("Error", "Debes seleccionar un dispositivo");
      return;
    }

    charge(true);

    const res = await assignDispositiveDepartmentAdminToUser(
      {
        userId: employeeId,
        dispositiveId: formData.dispositiveId,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo asignar el departamento del dispositivo");
      charge(false);
      return;
    }

    setShowAssignDispositiveDepartmentModal(false);
    await loadContext();

    modal("Departamento asignado", "El departamento del dispositivo se ha asignado correctamente.");

    charge(false);
  };

  const handleDeleteDepartment = (item) => {
    if (!item?.affectedEntityId) {
      modal("Error", "No se encontró el departamento");
      return;
    }

    setDeleteDepartmentCtx(item);
  };

  const doDeleteDepartment = async (item) => {
    const departmentId = item?.affectedEntityId;
    const departmentName = String(item?.name || "").trim().toLowerCase();
    const isPersonalDepartment = departmentName === personalDepartmentName;

    if (!departmentId) {
      setDeleteDepartmentCtx(null);
      modal("Error", "No se encontró el departamento");
      return;
    }

    charge(true);

    const res = isPersonalDepartment
      ? await postSesameDeleteDepartment(
        { departmentId, userId: employeeId },
        getToken()
      )
      : await postSesameRemoveDepartmentAdminRoleFromUser(
        { departmentId, userId: employeeId },
        getToken()
      );

    if (!res || res.error) {
      modal(
        "Error",
        res?.message ||
        (isPersonalDepartment
          ? "No se pudo eliminar el departamento"
          : "No se pudo desvincular el departamento")
      );
      charge(false);
      return;
    }

    setDeleteDepartmentCtx(null);

    if (viewWorkersCtx?.type === "department" && viewWorkersCtx?.id === departmentId) {
      closeWorkersSection();
    }

    await loadContext();

    modal(
      isPersonalDepartment ? "Departamento de supervisión eliminado" : "Departamento desvinculado",
      isPersonalDepartment
        ? "El departamento de supervisión se ha eliminado correctamente."
        : "Se ha quitado la gestión de este departamento correctamente."
    );

    charge(false);
  };

  const handleDeleteWorker = (employee) => {
    if (!employee?.userId || !viewWorkersCtx?.id || !viewWorkersCtx?.type) {
      modal("Error", "No se puede quitar este trabajador");
      return;
    }

    setDeleteWorkerCtx(employee);
  };

  const doDeleteWorker = async (employee) => {
    charge(true);

    const res =
      viewWorkersCtx?.type === "office"
        ? await postSesameDeleteOfficeEmployee(
          { officeId: viewWorkersCtx.id, userId: employee.userId },
          getToken()
        )
        : await postSesameDeleteDepartmentEmployee(
          { departmentId: viewWorkersCtx.id, userId: employee.userId },
          getToken()
        );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo quitar el trabajador");
      charge(false);
      return;
    }

    setDeleteWorkerCtx(null);
    await openWorkersSection(viewWorkersCtx);
    modal("Trabajador eliminado", "La persona se ha quitado correctamente.");
    charge(false);
  };

  const managedDepartmentsSorted = useMemo(() => {
  return [...managedDepartmentsResolved].sort((a, b) => {
    const aIsPersonal = String(a.name || "").trim().toLowerCase() === personalDepartmentName;
    const bIsPersonal = String(b.name || "").trim().toLowerCase() === personalDepartmentName;

    if (aIsPersonal && !bIsPersonal) return -1;
    if (!aIsPersonal && bIsPersonal) return 1;

    return String(a.name || "").localeCompare(String(b.name || ""), "es");
  });
}, [managedDepartmentsResolved, personalDepartmentName]);

  return (
    <>
      {showAddOfficeModal && (
        <ModalForm
          title="Asignar centro y departamento"
          message="Selecciona el dispositivo al que quieres asignar a la persona. Se asignará su centro de trabajo y su departamento en Sesame."
          fields={[
            {
              name: "dispositiveId",
              label: "Dispositivo",
              type: "select",
              required: true,
              options: sesameDispositiveOptions,
            },
          ]}
          onSubmit={handleAssignOfficeFromDispositive}
          onClose={() => setShowAddOfficeModal(false)}
          modal={modal}
        />
      )}

      {selectSesameWorkplaceModal && (
        <ModalForm
          title="Seleccionar centro de trabajo"
          message="Este dispositivo tiene varias oficinas Sesame asociadas. Selecciona a cuál debe asignarse la persona."
          fields={[
            {
              name: "workplaceId",
              label: "Centro de trabajo",
              type: "select",
              required: true,
              options: sesameWorkplaceOptions,
            },
          ]}
          onSubmit={handleSelectSesameWorkplace}
          onClose={() => {
            setSelectSesameWorkplaceModal(false);
            setPendingSesameDispositiveId(null);
          }}
          modal={modal}
        />
      )}

      {showAddWorkerModal && (
        <ModalForm
          title={`Añadir trabajador a ${addWorkerCtx?.type === "office" ? "centro" : "departamento"}`}
          message={addWorkerCtx?.title || "Selecciona una persona"}
          fields={[
            {
              name: "userId",
              label: "Trabajador",
              type: "async-search-select",
              placeholder: "Escribe al menos 3 letras...",
              required: true,
              loadOptions: searchUsers,
            },
          ]}
          onSubmit={handleAddWorker}
          onClose={() => {
            setShowAddWorkerModal(false);
            setAddWorkerCtx(null);
          }}
          modal={modal}
        />
      )}

      {showAssignDispositiveDepartmentModal && (
        <ModalForm
          title="Asignar departamento de dispositivo"
          message="Selecciona el dispositivo cuyo departamento quieres asignar a esta persona."
          fields={[
            {
              name: "dispositiveId",
              label: "Dispositivo",
              type: "select",
              required: true,
              defaultValue: "",
              options: [
                { value: "", label: "Selecciona un dispositivo" },
                ...dispositiveDepartmentOptions,
              ],
            },
          ]}
          onSubmit={handleAssignDispositiveDepartment}
          onClose={() => setShowAssignDispositiveDepartmentModal(false)}
          modal={modal}
        />
      )}

      {showChangeManagersModal && (
        <ModalForm
          title="Cambiar responsables del trabajador"
          message={`Selecciona quién gestionará vacaciones y fichajes de ${safeText(changeManagersCtx?.employee?.fullName)}`}
          fields={[
            {
              name: "absencesManagerUserId",
              label: "Responsable de vacaciones",
              type: "select",
              options: [{ value: "", label: "Sin responsable" }, ...managerOptions.options],
            },
            {
              name: "checksManagerUserId",
              label: "Responsable de fichajes",
              type: "select",
              options: [{ value: "", label: "Sin responsable" }, ...managerOptions.options],
            },
          ]}
          onSubmit={handleChangeManagers}
          onClose={() => {
            setShowChangeManagersModal(false);
            setChangeManagersCtx(null);
          }}
          modal={modal}
        />
      )}

      <div className={styles.contenedor}>
        <div className={styles.header}>
          <h2>CONTEXTO SESAME</h2>

          {user?.employmentStatus === "activo" && (
            <div className={styles.headerActions}>
              <button
                type="button"
                className={styles.inlineAddButton}
                onClick={handleToggleSesameEmployee}
                disabled={!employeeId || loadingLocal}
                title={sesameActionLabel}
              >
                <FaSquarePlus />
                {sesameActionLabel}
              </button>

              {contextData?.employee?.status === "active" && (
                <button
                  type="button"
                  className={styles.inlineAddButton}
                  onClick={handleInviteSesameEmployee}
                  disabled={!employeeId || loadingLocal}
                  title="Enviar invitación"
                >
                  <FaExchangeAlt />
                  Enviar invitación
                </button>
              )}
            </div>
          )}
        </div>

        {!hasSesameLinked && (
          <div className={styles.empty}>
            Este usuario no tiene userIdSesame asociado. Puedes crearlo o enviar invitación desde los botones superiores.
          </div>
        )}

        {hasSesameLinked && contextData && contextData?.employee?.status === "active" && (
          <div className={styles.grid}>
            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <FaBuilding />
                <h3>Centros asignados</h3>

                <button
                  type="button"
                  className={styles.inlineAddButton}
                  onClick={() => setShowAddOfficeModal(true)}
                  disabled={loadingLocal || sesameDispositiveOptions.length === 0}
                >
                  <FaSquarePlus />
                  Añadir
                </button>
              </div>

              {officeAssignationsResolved.length > 0 ? (
                <div className={styles.list}>
                  {officeAssignationsResolved.map((item) => (
                    <div key={item.assignationId || item.id} className={styles.listItem}>
                      <div className={styles.listItemMain}>
                        {item.linkedDispositives?.length > 0 ? (
                          item.linkedDispositives.map((device) => (
                            <div key={device.dispositiveId} className={styles.assignmentBlock}>
                              <div className={styles.assignmentHeader}>
                                <div>
                                  <span className={styles.assignmentTitle}>
                                    {safeText(device.dispositiveName)}
                                  </span>

                                  {device.programName && (
                                    <span className={styles.assignmentProgram}>
                                      Programa {device.programName}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className={styles.assignmentInfo}>
                                <div className={styles.assignmentRow}>
                                  <span className={styles.assignmentLabel}>Oficina de fichaje</span>
                                  <span className={styles.assignmentValue}>{safeText(item.name)}</span>
                                </div>

                                {item.address && (
                                  <div className={styles.assignmentRow}>
                                    <span className={styles.assignmentLabel}>Dirección</span>
                                    <span className={styles.assignmentValue}>{safeText(item.address)}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className={styles.assignmentBlock}>
                            <div className={styles.assignmentHeader}>
                              <div>
                                <span className={styles.assignmentTitle}>Departamento no identificado</span>
                                <span className={styles.assignmentProgram}>Revisar vinculación con dispositivo</span>
                              </div>
                            </div>

                            <div className={styles.assignmentInfo}>
                              <div className={styles.assignmentRow}>
                                <span className={styles.assignmentLabel}>Oficina de fichaje</span>
                                <span className={styles.assignmentValue}>{safeText(item.name)}</span>
                              </div>

                              {item.address && (
                                <div className={styles.assignmentRow}>
                                  <span className={styles.assignmentLabel}>Dirección</span>
                                  <span className={styles.assignmentValue}>{safeText(item.address)}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>

                      <div className={styles.listItemActions}>
                        <span className={styles.badge}>{item.isMainOffice ? "Principal" : "Secundaria"}</span>

                        <FaTrashAlt
                          className={styles.iconDelete}
                          title="Quitar asignación"
                          onClick={() => handleDeleteOfficeAssignation(item)}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.emptySmall}>No hay centros asignados.</div>
              )}
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <FaUserClock />
                <h3>Responsables</h3>

                <button
                  type="button"
                  className={styles.inlineAddButton}
                  onClick={openChangeManagersModalForCurrentEmployee}
                >
                  <FaExchangeAlt />
                  Cambiar
                </button>
              </div>

              <div className={styles.list}>
                <div className={styles.listItem}>
                  <div className={styles.listItemMain}>
                    <span className={styles.listTitle}>Responsable de vacaciones</span>

                    {absencesManagers.length > 0 ? (
                      absencesManagers.map((manager) => (
                        <span key={manager.id} className={styles.listText}>
                          {buildFullName(manager)} · {safeText(manager.email)}
                        </span>
                      ))
                    ) : (
                      <span className={styles.listText}>Sin responsable asignado</span>
                    )}
                  </div>
                </div>

                <div className={styles.listItem}>
                  <div className={styles.listItemMain}>
                    <span className={styles.listTitle}>Responsable de fichajes e incidencias</span>

                    {checksManagers.length > 0 ? (
                      checksManagers.map((manager) => (
                        <span key={manager.id} className={styles.listText}>
                          {buildFullName(manager)} · {safeText(manager.email)}
                        </span>
                      ))
                    ) : (
                      <span className={styles.listText}>Sin responsable asignado</span>
                    )}
                  </div>
                </div>
              </div>
            </section>

            <section className={styles.card}>
              <div className={styles.cardHeader}>
                <FaBullseye />
                <h3>Departamentos que gestiona</h3>

                <div className={styles.headerActions}>
                  {!hasPersonalDepartment && (
                    <button
                      type="button"
                      className={styles.addButton}
                      onClick={handleCreateDepartment}
                      disabled={loadingLocal}
                    >
                      <FaSquarePlus />
                      Crear departamento de supervisión
                    </button>
                  )}

                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={() => setShowAssignDispositiveDepartmentModal(true)}
                    disabled={loadingLocal || dispositiveDepartmentOptions.length === 0}
                  >
                    <FaSquarePlus />
                    Asignar departamento
                  </button>
                </div>
              </div>

              {managedDepartmentsSorted.length > 0 ? (
                <div className={styles.list}>
                  {managedDepartmentsSorted.map((item) => {
                    const isPersonalDepartment = String(item.name || "")
                      .trim()
                      .toLowerCase() === personalDepartmentName;

                    return (
                      <div key={item.id || item.affectedEntityId} className={styles.listItem}>
                        <div className={styles.listItemMain}>
                          <span className={styles.listTitle}>{safeText(item.name, item.affectedEntityId)}</span>
                          <span className={styles.listText}>Rol: {safeText(item.role?.name)}</span>

                          
<div className={styles.listItemActions}>
  <button
    type="button"
    className={styles.inlineAddButton}
    onClick={() =>
      openWorkersSection({
        type: "department",
        id: item.affectedEntityId,
        title: `Trabajadores del departamento ${safeText(item.name, item.affectedEntityId)}`,
        canManageWorkers: isPersonalDepartment,
      })
    }
  >
    Ver trabajadores
  </button>

  {isPersonalDepartment && (
    <button
      type="button"
      className={styles.inlineAddButton}
      onClick={() =>
        openAddWorkerModal({
          type: "department",
          id: item.affectedEntityId,
          title: `Añadir trabajador al departamento ${safeText(item.name, item.affectedEntityId)}`,
        })
      }
    >
      <FaUserPlus />
      Añadir trabajador
    </button>
  )}
</div>
                         
                        </div>

                        <div className={styles.listItemActions}>
                          <span className={styles.badge}>{isPersonalDepartment ? "Personal" : "Gestiona"}</span>

                          <FaTrashAlt
                            className={styles.iconDelete}
                            title={isPersonalDepartment ? "Eliminar departamento de supervisión" : "Desvincular departamento"}
                            onClick={() => handleDeleteDepartment(item)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className={styles.emptySmall}>No gestiona ningún departamento.</div>
              )}
            </section>

            {viewWorkersCtx && (
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <FaUserTie />
                  <h3>{safeText(viewWorkersData.title, "Trabajadores")}</h3>

                  <button type="button" className={styles.refreshButton} onClick={closeWorkersSection}>
                    Cerrar
                  </button>
                </div>

                {viewWorkersData.loading ? (
                  <div className={styles.emptySmall}>Cargando trabajadores...</div>
                ) : viewWorkersData.employees.length > 0 ? (
                  <div className={styles.list}>
                    {viewWorkersData.employees.map((employee) => (
                      <div key={employee.employeeId || employee.id} className={styles.listItem}>
                        <div className={styles.listItemMain}>
                          <span className={styles.listTitle}>{safeText(employee.fullName)}</span>
                          <span className={styles.listText}>{safeText(employee.email)}</span>
                        </div>

                        <div className={styles.listItemActions}>
                          {employee.isMainOffice && <span className={styles.badge}>Principal</span>}

                          {viewWorkersCtx?.canManageWorkers !== false && (
  <>
    <button
      type="button"
      className={styles.inlineAddButton}
      onClick={() => openChangeManagersModal(employee)}
    >
      <FaExchangeAlt />
      Cambiar responsables
    </button>

    <FaTrashAlt
      className={styles.iconDelete}
      title={`Quitar trabajador de ${viewWorkersCtx?.type === "office" ? "centro" : "departamento"}`}
      onClick={() => handleDeleteWorker(employee)}
    />
  </>
)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptySmall}>No hay trabajadores asociados.</div>
                )}
              </section>
            )}
          </div>
        )}
      </div>

      {deleteOfficeCtx && (
        <ModalConfirmation
          title="Quitar asignación"
          message={`¿Seguro que quieres quitar esta asignación de "${deleteOfficeCtx.name}"? También se actualizarán los departamentos vinculados cuando corresponda.`}
          onConfirm={() => doDeleteOfficeAssignation(deleteOfficeCtx)}
          onCancel={() => setDeleteOfficeCtx(null)}
        />
      )}

      {deleteWorkerCtx && (
        <ModalConfirmation
          title="Quitar trabajador"
          message={`¿Seguro que quieres quitar a "${deleteWorkerCtx.fullName}" de este ${viewWorkersCtx?.type === "office" ? "centro" : "departamento"}?`}
          onConfirm={() => doDeleteWorker(deleteWorkerCtx)}
          onCancel={() => setDeleteWorkerCtx(null)}
        />
      )}

      {deleteDepartmentCtx && (() => {
        const isPersonalDepartment = String(deleteDepartmentCtx?.name || "")
          .trim()
          .toLowerCase() === personalDepartmentName;

        return (
          <ModalConfirmation
            title={isPersonalDepartment ? "Eliminar departamento de supervisión" : "Desvincular departamento"}
            message={
              isPersonalDepartment
                ? `¿Seguro que quieres eliminar el departamento de supervisión "${deleteDepartmentCtx?.name || deleteDepartmentCtx?.affectedEntityId}"?`
                : `¿Seguro que quieres dejar de gestionar el departamento "${deleteDepartmentCtx?.name || deleteDepartmentCtx?.affectedEntityId}"? El departamento no se eliminará.`
            }
            onConfirm={() => doDeleteDepartment(deleteDepartmentCtx)}
            onCancel={() => setDeleteDepartmentCtx(null)}
          />
        );
      })()}
    </>
  );
}