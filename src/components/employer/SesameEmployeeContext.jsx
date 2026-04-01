import { useEffect, useMemo, useState } from "react";
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
import { FaRotate, FaSquarePlus } from "react-icons/fa6";
import { getToken } from "../../lib/serviceToken";
import {
  postSesameDeleteEmployeeOfficeAssignation,
  postSesameDeleteEmployeeOfficeRole,
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
  postSesameTransferDepartment,
  postSesameToggleEmployeeForUser,
  postSesameInviteEmployeeForUser,
} from "../../lib/data";
import ModalConfirmation from "../globals/ModalConfirmation";
import ModalForm from "../globals/ModalForm";
import FormSesameOfficeAssignation from "../sesame/FormSesameOfficeAssignation";
import FormSesameOfficeManagerAssignation from "../sesame/FormSesameOfficeManagerAssignation";

const safeText = (value, fallback = "—") => {
  if (value === null || value === undefined || value === "") return fallback;
  return String(value);
};

const buildFullName = (item) => {
  if (!item) return "—";
  return (
    [item.firstName, item.lastName].filter(Boolean).join(" ").trim() ||
    item.fullName ||
    "—"
  );
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
  const [showAddManagedOfficeModal, setShowAddManagedOfficeModal] = useState(false);

  const [deleteOfficeCtx, setDeleteOfficeCtx] = useState(null);
  const [deleteManagedOfficeCtx, setDeleteManagedOfficeCtx] = useState(null);
  const [deleteWorkerCtx, setDeleteWorkerCtx] = useState(null);
  const [deleteDepartmentCtx, setDeleteDepartmentCtx] = useState(null);
  const [managerOptions, setManagerOptions] = useState({
    loading: false,
    options: [],
  });

  const [viewWorkersCtx, setViewWorkersCtx] = useState(null);
  const [viewWorkersData, setViewWorkersData] = useState({
    loading: false,
    title: "",
    employees: [],
  });

  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);
  const [addWorkerCtx, setAddWorkerCtx] = useState(null);

  const [showChangeManagersModal, setShowChangeManagersModal] = useState(false);
  const [changeManagersCtx, setChangeManagersCtx] = useState(null);

  const [showTransferDepartmentModal, setShowTransferDepartmentModal] = useState(false);
  const [transferDepartmentCtx, setTransferDepartmentCtx] = useState(null);

  const employeeId = user?._id || "";

  const managedDepartments = useMemo(
    () =>
      Array.isArray(contextData?.roles?.managedDepartments)
        ? contextData.roles.managedDepartments
        : [],
    [contextData]
  );



  const managedOffices = useMemo(
    () =>
      Array.isArray(contextData?.roles?.managedOffices)
        ? contextData.roles.managedOffices
        : [],
    [contextData]
  );

  const isAdmin = !!contextData?.roles?.admin;

  const office = contextData?.office || null;

  const officeAssignations = Array.isArray(contextData?.officeAssignations)
    ? contextData.officeAssignations
    : [];

  const departmentAssignations = Array.isArray(contextData?.departmentAssignations)
    ? contextData.departmentAssignations
    : [];

  const absencesManagers = useMemo(
    () =>
      Array.isArray(contextData?.managers?.absencesManagement)
        ? contextData.managers.absencesManagement
        : [],
    [contextData]
  );

  const checksManagers = useMemo(
    () =>
      Array.isArray(contextData?.managers?.checksManageRequestsAndIncidences)
        ? contextData.managers.checksManageRequestsAndIncidences
        : [],
    [contextData]
  );

  const dispositiveByOfficeId = useMemo(() => {
    const index = {};
    const dispositives = Object.values(enumsData?.dispositiveIndex || {});

    dispositives.forEach((item) => {
      if (item?.officeIdSesame) {
        index[String(item.officeIdSesame)] = item;
      }
    });
    return index;
  }, [enumsData?.dispositiveIndex]);

  const loadEligibleManagers = async (employee) => {

    if (!employee?.employeeId) {
      setManagerOptions({ loading: false, options: [] });
      return;
    }

    try {
      setManagerOptions({ loading: true, options: [] });

      const token = getToken();
      const res = await searchSesameEligibleManagersByEmployee(
        { employeeIdSesame: employee.employeeId, query: "" },
        token
      );

      const users = res?.users || [];

      const options = users
        .filter((u) => !!u?._id)
        .map((u) => ({
          value: u._id,
          label: `${u.firstName || ""} ${u.lastName || ""} (${u.email || "sin email"})`,
        }));

      setManagerOptions({
        loading: false,
        options,
      });
    } catch (error) {
      setManagerOptions({ loading: false, options: [] });
      modal("Error", error.message || "No se pudieron cargar los responsables");
    }
  };

  const managedOfficesResolved = useMemo(() => {
    return managedOffices.map((item) => {
      const dispositive = dispositiveByOfficeId[String(item.affectedEntityId)] || null;
      const program = dispositive?.program
        ? enumsData?.programsIndex?.[String(dispositive.program)] || null
        : null;
      const province = dispositive?.province
        ? enumsData?.provincesIndex?.[String(dispositive.province)] || null
        : null;

      return {
        ...item,
        dispositive,
        program,
        province,
      };
    });
  }, [
    managedOffices,
    dispositiveByOfficeId,
    enumsData?.programsIndex,
    enumsData?.provincesIndex,
  ]);

  const managedDepartmentsResolved = useMemo(() => {
    return managedDepartments.map((item) => ({
      ...item,
      name:
        item?.entityName ||
        item?.raw?.entityName ||
        item?.raw?.department?.name ||
        item?.departmentName ||
        item?.affectedEntityId,
    }));
  }, [managedDepartments]);

  const loadContext = async () => {
    if (!user?._id || !user?.userIdSesame) {
      setContextData(null);
      return;
    }

    try {
      setLoadingLocal(true);
      charge(true);

      const token = getToken();

      const res = await postSesameGetEmployeeContext({ employeeId }, token);

      if (res?.error) {
        throw new Error(res.message || "No se pudo obtener el contexto de Sesame");
      }

      setContextData(res || null);
    } catch (error) {
      setContextData(null);
      modal("Error", error.message || "No se pudo obtener el contexto de Sesame");
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
    const token = getToken();

    if (!query || query.trim().length < 3) return [];

    const res = await searchusername({ query }, token);
    const users = res?.users || [];

    return users
      .filter((u) => !!u?.userIdSesame)
      .map((u) => ({
        value: u._id,
        label: `${u.firstName || ""} ${u.lastName || ""} (${u.email || "sin email"})`,
      }));
  };

  const searchEligibleManagers = async (query, employee) => {
    const token = getToken();

    if (!query || query.trim().length < 3 || !employee?.employeeId) return [];

    const res = await searchSesameEligibleManagersByEmployee(
      { employeeIdSesame: employee.employeeId, query },
      token
    );

    const users = res?.users || [];

    return users
      .filter((u) => !!u?.userIdSesame)
      .map((u) => ({
        value: u._id,
        label: `${u.firstName || ""} ${u.lastName || ""} (${u.email || "sin email"})`,
      }));
  };

  const handleDeleteManagedOfficeRole = (item) => {
    if (!item?.id) {
      modal("Error", "No se encontró la asignación del rol");
      return;
    }
    setDeleteManagedOfficeCtx(item);
  };

  const doDeleteManagedOfficeRole = async (item) => {
    const assignationId = item?.id || false;

    if (!assignationId) {
      setDeleteManagedOfficeCtx(null);
      modal("Error", "No se puede quitar el rol del centro");
      return;
    }

    try {
      charge(true);

      const token = getToken();
      const res = await postSesameDeleteEmployeeOfficeRole(
        { assignationId },
        token
      );

      if (res?.error) {
        throw new Error(res.message || "No se pudo eliminar el rol del centro");
      }

      setDeleteManagedOfficeCtx(null);
      await loadContext();
      modal(
        "Rol eliminado",
        "El rol de responsable de centro se ha eliminado correctamente"
      );
    } catch (error) {
      modal("Error", error.message || "No se pudo eliminar el rol del centro");
    } finally {
      charge(false);
    }
  };

  const hasSesameLinked = !!user?.userIdSesame;
  const sesameStatus = String(contextData?.employee?.status || "").toLowerCase();

  const sesameActionLabel = !hasSesameLinked
    ? "Crear"
    : sesameStatus === "active"
      ? "Inactivar"
      : "Activar";

const handleToggleSesameEmployee = async () => {
  try {
    charge(true);
    const token = getToken();

    const res = await postSesameToggleEmployeeForUser({ userId: employeeId }, token);

    if (res?.error) throw new Error(res.message || "No se pudo cambiar el estado en Sesame");

    if (res?.sesameId && (!user?.userIdSesame || String(user.userIdSesame) !== String(res.sesameId))) {
      changeUser?.({ ...user, userIdSesame: res.sesameId });
    }

    await loadContext();

    const action = res?.action || "";
    const message =
      action === "created"
        ? "El usuario se ha creado en Sesame correctamente."
        : action === "enabled"
          ? "El usuario se ha activado en Sesame correctamente."
          : action === "disabled"
            ? "El usuario se ha inactivado en Sesame correctamente."
            : "La operación se ha realizado correctamente.";

    modal("Sesame", message);
  } catch (error) {
    modal("Error", error.message || "No se pudo cambiar el estado en Sesame");
  } finally {
    charge(false);
  }
};

  const handleInviteSesameEmployee = async () => {
  try {
    charge(true);
    const token = getToken();

    const res = await postSesameInviteEmployeeForUser({ userId: employeeId }, token);

    if (res?.error) throw new Error(res.message || "No se pudo enviar la invitación");

    if (res?.sesameId && (!user?.userIdSesame || String(user.userIdSesame) !== String(res.sesameId))) {
      changeUser?.({ ...user, userIdSesame: res.sesameId });
    }

    await loadContext();
    modal("Invitación enviada", "La invitación de Sesame se ha enviado correctamente.");
  } catch (error) {
    modal("Error", error.message || "No se pudo enviar la invitación");
  } finally {
    charge(false);
  }
};

  const handleDeleteOfficeAssignation = (item) => {
    if (!item?.id || !user?._id) {
      modal("Error", "No se puede borrar el centro");
      return;
    }

    setDeleteOfficeCtx(item);
  };

  const doDeleteOfficeAssignation = async (item) => {
    const employeeIdM = employeeId || false;
    const officeId = item?.id || false;

    if (!employeeIdM || !officeId) {
      setDeleteOfficeCtx(null);
      modal("Error", "No se puede borrar el centro");
      return;
    }

    try {
      charge(true);

      const token = getToken();
      const res = await postSesameDeleteEmployeeOfficeAssignation(
        { employeeId: employeeIdM, officeId },
        token
      );

      if (res?.error) {
        throw new Error(res.message || "No se pudo eliminar la asignación del centro");
      }

      setDeleteOfficeCtx(null);
      await loadContext();
      modal(
        "Centro eliminado",
        "La asignación del centro se ha eliminado correctamente"
      );
    } catch (error) {
      modal("Error", error.message || "No se pudo eliminar la asignación del centro");
    } finally {
      charge(false);
    }
  };

  const openWorkersSection = async ({ type, id, title }) => {
    if (!id) {
      modal("Error", "No se encontró el identificador");
      return;
    }

    try {
      setViewWorkersCtx({ type, id, title });
      setViewWorkersData({
        loading: true,
        title,
        employees: [],
      });

      charge(true);
      const token = getToken();

      const res =
        type === "office"
          ? await postSesameGetOfficeEmployees({ officeId: id }, token)
          : await postSesameGetDepartmentEmployees({ departmentId: id }, token);

      if (res?.error) {
        throw new Error(res.message || "No se pudieron cargar los trabajadores");
      }

      setViewWorkersData({
        loading: false,
        title,
        employees: Array.isArray(res?.employees) ? res.employees : [],
      });
    } catch (error) {
      setViewWorkersCtx(null);
      setViewWorkersData({
        loading: false,
        title: "",
        employees: [],
      });
      modal("Error", error.message || "No se pudieron cargar los trabajadores");
    } finally {
      charge(false);
    }
  };

  const closeWorkersSection = () => {
    setViewWorkersCtx(null);
    setViewWorkersData({
      loading: false,
      title: "",
      employees: [],
    });
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
    try {
      charge(true);
      const token = getToken();

      if (!addWorkerCtx?.id) {
        throw new Error("No se encontró el centro o departamento");
      }

      if (!formData?.userId) {
        throw new Error("Debes seleccionar una persona");
      }

      const res =
        addWorkerCtx.type === "office"
          ? await postSesameAssignOfficeEmployee(
            {
              officeId: addWorkerCtx.id,
              userId: formData.userId,
              isMainOffice: false,
            },
            token
          )
          : await postSesameAssignDepartmentEmployee(
            {
              departmentId: addWorkerCtx.id,
              userId: formData.userId,
            },
            token
          );

      if (res?.error) {
        throw new Error(res.message || "No se pudo añadir el trabajador");
      }

      modal("Trabajador añadido", "La persona se ha añadido correctamente.");
      setShowAddWorkerModal(false);
      setAddWorkerCtx(null);

      if (
        viewWorkersCtx?.id === addWorkerCtx.id &&
        viewWorkersCtx?.type === addWorkerCtx.type
      ) {
        await openWorkersSection(viewWorkersCtx);
      }
    } catch (error) {
      modal("Error", error.message || "No se pudo añadir el trabajador");
    } finally {
      charge(false);
    }
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
    try {
      charge(true);
      const token = getToken();

      if (!changeManagersCtx?.employee?.employeeId) {
        throw new Error("No se encontró el empleado");
      }

      const res = await postSesameUpdateEmployeeManagersByEmployee(
        {
          employeeIdSesame: changeManagersCtx.employee.employeeId,
          absencesManagerUserId: formData.absencesManagerUserId || null,
          checksManagerUserId: formData.checksManagerUserId || null,
        },
        token
      );

      if (res?.error) {
        throw new Error(res.message || "No se pudieron cambiar los responsables");
      }

      modal(
        "Responsables actualizados",
        "Los responsables de vacaciones y fichajes se han actualizado correctamente."
      );

      setShowChangeManagersModal(false);
      setChangeManagersCtx(null);

      if (viewWorkersCtx) {
        await openWorkersSection(viewWorkersCtx);
      }

      await loadContext();
    } catch (error) {
      modal("Error", error.message || "No se pudieron cambiar los responsables");
    } finally {
      charge(false);
    }
  };

  const handleCreateDepartment = async () => {
    try {
      charge(true);
      const token = getToken();

      const res = await postSesameCreateDepartmentForUser({ userId: employeeId }, token);

      if (res?.error) {
        throw new Error(res.message || "No se pudo crear el departamento");
      }

      await loadContext();
      modal("Departamento creado", "El departamento se ha creado correctamente.");
    } catch (error) {
      modal("Error", error.message || "No se pudo crear el departamento");
    } finally {
      charge(false);
    }
  };

  const handleDeleteDepartment = (item) => {
    if (!item?.affectedEntityId) {
      modal("Error", "No se encontró el departamento");
      return;
    }

    setDeleteDepartmentCtx(item);
  };

  const doDeleteDepartment = async (item) => {
    try {
      charge(true);
      const token = getToken();

      const res = await postSesameDeleteDepartment(
        {
          departmentId: item.affectedEntityId,
          userId: employeeId,
        },
        token
      );

      if (res?.error) {
        throw new Error(res.message || "No se pudo eliminar el departamento");
      }

      setDeleteDepartmentCtx(null);

      if (viewWorkersCtx?.type === "department" && viewWorkersCtx?.id === item.affectedEntityId) {
        closeWorkersSection();
      }

      await loadContext();
      modal("Departamento eliminado", "El departamento se ha eliminado correctamente.");
    } catch (error) {
      modal("Error", error.message || "No se pudo eliminar el departamento");
    } finally {
      charge(false);
    }
  };

  const openTransferDepartmentModal = (item) => {
    if (!item?.affectedEntityId) {
      modal("Error", "No se encontró el departamento");
      return;
    }

    setTransferDepartmentCtx(item);
    setShowTransferDepartmentModal(true);
  };

  const handleTransferDepartment = async (formData) => {
    try {
      charge(true);
      const token = getToken();

      if (!transferDepartmentCtx?.affectedEntityId) {
        throw new Error("No se encontró el departamento");
      }

      if (!formData?.toUserId) {
        throw new Error("Debes seleccionar una persona");
      }

      const res = await postSesameTransferDepartment(
        {
          fromDepartmentId: transferDepartmentCtx.affectedEntityId,
          fromUserId: employeeId,
          toUserId: formData.toUserId,
          deleteOldDepartment: !!formData.deleteOldDepartment,
        },
        token
      );

      if (res?.error) {
        throw new Error(res.message || "No se pudo trasladar el departamento");
      }

      setShowTransferDepartmentModal(false);
      setTransferDepartmentCtx(null);

      if (
        viewWorkersCtx?.type === "department" &&
        viewWorkersCtx?.id === transferDepartmentCtx.affectedEntityId
      ) {
        closeWorkersSection();
      }

      await loadContext();
      modal("Departamento trasladado", "El departamento se ha trasladado correctamente.");
    } catch (error) {
      modal("Error", error.message || "No se pudo trasladar el departamento");
    } finally {
      charge(false);
    }
  };

  const handleDeleteWorker = (employee) => {
    if (!employee?.userId || !viewWorkersCtx?.id || !viewWorkersCtx?.type) {
      modal("Error", "No se puede quitar este trabajador");
      return;
    }

    setDeleteWorkerCtx(employee);
  };

  const doDeleteWorker = async (employee) => {
    try {
      charge(true);
      const token = getToken();

      let res = null;

      if (viewWorkersCtx?.type === "office") {
        res = await postSesameDeleteOfficeEmployee(
          {
            officeId: viewWorkersCtx.id,
            userId: employee.userId,
          },
          token
        );
      } else if (viewWorkersCtx?.type === "department") {
        res = await postSesameDeleteDepartmentEmployee(
          {
            departmentId: viewWorkersCtx.id,
            userId: employee.userId,
          },
          token
        );
      } else {
        throw new Error("Tipo de scope no válido");
      }

      if (res?.error) {
        throw new Error(res.message || "No se pudo quitar el trabajador");
      }

      setDeleteWorkerCtx(null);
      await openWorkersSection(viewWorkersCtx);
      modal("Trabajador eliminado", "La persona se ha quitado correctamente.");
    } catch (error) {
      modal("Error", error.message || "No se pudo quitar el trabajador");
    } finally {
      charge(false);
    }
  };



  return (
    <>
      {showAddOfficeModal && (
        <FormSesameOfficeAssignation
          user={user}
          enumsData={enumsData}
          modal={modal}
          charge={charge}
          closeModal={() => setShowAddOfficeModal(false)}
          onSaved={loadContext}
        />
      )}

      {showAddManagedOfficeModal && (
        <FormSesameOfficeManagerAssignation
          user={user}
          enumsData={enumsData}
          modal={modal}
          charge={charge}
          closeModal={() => setShowAddManagedOfficeModal(false)}
          onSaved={loadContext}
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

      {showTransferDepartmentModal && (
        <ModalForm
          title="Trasladar departamento"
          message={`Selecciona la persona a la que quieres trasladar el departamento "${safeText(
            transferDepartmentCtx?.name,
            transferDepartmentCtx?.affectedEntityId
          )}"`}
          fields={[
            {
              name: "toUserId",
              label: "Nuevo responsable",
              type: "async-search-select",
              placeholder: "Escribe al menos 3 letras...",
              required: true,
              loadOptions: searchUsers,
            },
            {
              name: "deleteOldDepartment",
              label: "Eliminar departamento antiguo después del traslado",
              type: "select",
              required: true,
              options: [
                { value: false, label: "No" },
                { value: true, label: "Sí" },
              ],
              defaultValue: false,
            },
          ]}
          onSubmit={handleTransferDepartment}
          onClose={() => {
            setShowTransferDepartmentModal(false);
            setTransferDepartmentCtx(null);
          }}
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
              required: false,
              options: [
                { value: "", label: "Sin responsable" },
                ...managerOptions.options,
              ],
            },
            {
              name: "checksManagerUserId",
              label: "Responsable de fichajes",
              type: "select",
              required: false,
              options: [
                { value: "", label: "Sin responsable" },
                ...managerOptions.options,
              ],
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
            {contextData?.employee?.status=='active' &&
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
            }
            
          </div>
        </div>

        {!hasSesameLinked && (
          <div className={styles.empty}>
            Este usuario no tiene userIdSesame asociado. Puedes crearlo o enviar invitación desde los botones superiores.
          </div>
        )}
        {hasSesameLinked && contextData && (
          <>

            <div className={styles.summary}>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Empleado Sesame</span>
                <span className={styles.summaryValue}>
                  {safeText(contextData?.employee?.fullName)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Email</span>
                <span className={styles.summaryValue}>
                  {safeText(contextData?.employee?.email)}
                </span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.label}>Admin</span>
                <span className={styles.value}>{isAdmin ? "Sí" : "No"}</span>
              </div>
              <div className={styles.summaryItem}>
                <span className={styles.summaryLabel}>Estado</span>
                <span className={styles.summaryValue}>
                  {safeText(contextData?.employee?.status)}
                </span>
              </div>
            </div>

            {contextData?.employee?.status=='active' && 
            <div className={styles.grid}>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <FaBuilding />
                  <h3>Centro principal de fichaje</h3>
                </div>

                {office ? (
                  <div className={styles.infoBlock}>
                    <div className={styles.row}>
                      <span className={styles.label}>Nombre</span>
                      <span className={styles.value}>{safeText(office.name)}</span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.label}>Zona horaria</span>
                      <span className={styles.value}>
                        {safeText(office.defaultEmployeesDateTimeZone)}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.label}>Oficina principal</span>
                      <span className={styles.value}>
                        {office.isMainOffice ? "Sí" : "No"}
                      </span>
                    </div>
                    <div className={styles.row}>
                      <span className={styles.label}>Eliminada en Sesame</span>
                      <span className={styles.value}>
                        {office.isDeleted ? "Sí" : "No"}
                      </span>
                    </div>
                  </div>
                ) : (
                  <div className={styles.emptySmall}>
                    No hay centro principal asignado.
                  </div>
                )}

                <div className={styles.subSection}>
                  <div className={styles.subSectionHeader}>
                    <h4>Otras asignaciones de centro</h4>
                    <button
                      type="button"
                      className={styles.inlineAddButton}
                      onClick={() => setShowAddOfficeModal(true)}
                      disabled={loadingLocal}
                    >
                      <FaSquarePlus />
                      Añadir
                    </button>
                  </div>

                  {officeAssignations.length > 0 ? (
                    <div className={styles.list}>
                      {officeAssignations.map((item) => (
                        <div
                          key={item.assignationId || item.id}
                          className={styles.listItem}
                        >
                          <div className={styles.listItemMain}>
                            <span className={styles.listTitle}>
                              {safeText(item.name)}
                            </span>
                          </div>

                          <div className={styles.listItemActions}>
                            <span className={styles.badge}>
                              {item.isMainOffice ? "Principal" : "Secundaria"}
                            </span>

                            <FaTrashAlt
                              className={styles.iconDelete}
                              title="Quitar centro"
                              onClick={() => handleDeleteOfficeAssignation(item)}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptySmall}>
                      No hay más asignaciones de centro.
                    </div>
                  )}
                </div>
              </section>
              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <FaBuilding />
                  <h3>Departamentos a los que pertenece</h3>
                </div>

                {departmentAssignations.length > 0 ? (
                  <div className={styles.list}>
                    {departmentAssignations.map((item) => (
                      <div
                        key={item.assignationId || item.id}
                        className={styles.listItem}
                      >
                        <div className={styles.listItemMain}>
                          <span className={styles.listTitle}>
                            {safeText(item.name, item.id)}
                          </span>
                        </div>

                        <div className={styles.listItemActions}>
                          <span className={styles.badge}>Pertenece</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptySmall}>
                    No pertenece a ningún departamento.
                  </div>
                )}
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <FaUserClock />
                  <h3>Responsables de vacaciones</h3>
                  <button
                    type="button"
                    className={styles.inlineAddButton}
                    onClick={openChangeManagersModalForCurrentEmployee}
                  >
                    <FaExchangeAlt />
                    Cambiar
                  </button>
                </div>

                {absencesManagers.length > 0 ? (
                  <div className={styles.list}>
                    {absencesManagers.map((manager) => (
                      <div key={manager.id} className={styles.listItem}>
                        <div className={styles.listItemMain}>
                          <span className={styles.listTitle}>
                            {buildFullName(manager)}
                          </span>
                          <span className={styles.listText}>
                            {safeText(manager.email)}
                          </span>
                        </div>
                        <span className={styles.badge}>
                          {safeText(manager.workStatus, "—")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptySmall}>
                    No hay responsables de vacaciones asignados.
                  </div>
                )}
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <FaUserTie />
                  <h3>Responsables de fichajes e incidencias</h3>
                  <button
                    type="button"
                    className={styles.inlineAddButton}
                    onClick={openChangeManagersModalForCurrentEmployee}
                  >
                    <FaExchangeAlt />
                    Cambiar
                  </button>
                </div>

                {checksManagers.length > 0 ? (
                  <div className={styles.list}>
                    {checksManagers.map((manager) => (
                      <div key={manager.id} className={styles.listItem}>
                        <div className={styles.listItemMain}>
                          <span className={styles.listTitle}>
                            {buildFullName(manager)}
                          </span>
                          <span className={styles.listText}>
                            {safeText(manager.email)}
                          </span>
                        </div>
                        <span className={styles.badge}>
                          {safeText(manager.workStatus, "—")}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptySmall}>
                    No hay responsables de fichajes asignados.
                  </div>
                )}
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <FaBullseye />
                  <h3>Centros que gestiona</h3>
                  <button
                    type="button"
                    className={styles.addButton}
                    onClick={() => setShowAddManagedOfficeModal(true)}
                    disabled={loadingLocal}
                  >
                    <FaSquarePlus />
                    Añadir
                  </button>
                </div>

                {managedOffices.length > 0 ? (
                  <div className={styles.list}>
                    {managedOfficesResolved.map((item) => (
                      <div key={item.id} className={styles.listItem}>
                        <div className={styles.listItemMain}>
                          <span className={styles.listTitle}>
                            {safeText(item.dispositive?.name)}
                          </span>
                          <span className={styles.listText}>
                            Rol: {safeText(item.role?.name)}
                          </span>
                          <span className={styles.listText}>
                            Programa: {safeText(item.program?.name)}
                          </span>
                          <span className={styles.listText}>
                            Provincia: {safeText(item.province?.name)}
                          </span>

                          <div className={styles.listItemActions}>
                            <button
                              type="button"
                              className={styles.inlineAddButton}
                              onClick={() =>
                                openWorkersSection({
                                  type: "office",
                                  id: item.affectedEntityId,
                                  title: `Trabajadores de ${safeText(item.dispositive?.name)}`,
                                })
                              }
                            >
                              Ver trabajadores
                            </button>

                            <button
                              type="button"
                              className={styles.inlineAddButton}
                              onClick={() =>
                                openAddWorkerModal({
                                  type: "office",
                                  id: item.affectedEntityId,
                                  title: `Añadir trabajador a ${safeText(item.dispositive?.name)}`,
                                })
                              }
                            >
                              <FaUserPlus />
                              Añadir trabajador
                            </button>
                          </div>
                        </div>

                        <div className={styles.listItemActions}>
                          <span className={styles.badge}>Gestiona</span>

                          <FaTrashAlt
                            className={styles.iconDelete}
                            title="Quitar rol de responsable de centro"
                            onClick={() => handleDeleteManagedOfficeRole(item)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptySmall}>
                    No gestiona ningún centro.
                  </div>
                )}
              </section>

              <section className={styles.card}>
                <div className={styles.cardHeader}>
                  <FaBullseye />
                  <h3>Departamentos que gestiona</h3>

                  {managedDepartmentsResolved.length === 0 && (
                    <button
                      type="button"
                      className={styles.addButton}
                      onClick={handleCreateDepartment}
                      disabled={loadingLocal}
                    >
                      <FaSquarePlus />
                      Crear departamento
                    </button>
                  )}
                </div>

                {managedDepartmentsResolved.length > 0 ? (
                  <div className={styles.list}>
                    {managedDepartmentsResolved.map((item) => (
                      <div key={item.id} className={styles.listItem}>

                        <div className={styles.listItemMain}>
                          <span className={styles.listTitle}>
                            {safeText(item.name, item.affectedEntityId)}
                          </span>
                          <span className={styles.listText}>
                            Rol: {safeText(item.role?.name)}
                          </span>
                          <span className={styles.listText}>
                            DepartmentId: {safeText(item.affectedEntityId)}
                          </span>

                          <div className={styles.listItemActions}>
                            <button
                              type="button"
                              className={styles.inlineAddButton}
                              onClick={() =>
                                openWorkersSection({
                                  type: "department",
                                  id: item.affectedEntityId,
                                  title: `Trabajadores del departamento ${safeText(
                                    item.name,
                                    item.affectedEntityId
                                  )}`,
                                })
                              }
                            >
                              Ver trabajadores
                            </button>

                            <button
                              type="button"
                              className={styles.inlineAddButton}
                              onClick={() =>
                                openAddWorkerModal({
                                  type: "department",
                                  id: item.affectedEntityId,
                                  title: `Añadir trabajador al departamento ${safeText(
                                    item.name,
                                    item.affectedEntityId
                                  )}`,
                                })
                              }
                            >
                              <FaUserPlus />
                              Añadir trabajador
                            </button>

                            <button
                              type="button"
                              className={styles.inlineAddButton}
                              onClick={() => openTransferDepartmentModal(item)}
                            >
                              <FaExchangeAlt />
                              Trasladar
                            </button>
                          </div>
                        </div>

                        <div className={styles.listItemActions}>
                          <span className={styles.badge}>Gestiona</span>

                          <FaTrashAlt
                            className={styles.iconDelete}
                            title="Eliminar departamento"
                            onClick={() => handleDeleteDepartment(item)}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={styles.emptySmall}>
                    No gestiona ningún departamento.
                  </div>
                )}
              </section>

              {viewWorkersCtx && (
                <section className={styles.card}>
                  <div className={styles.cardHeader}>
                    <FaUserTie />
                    <h3>{safeText(viewWorkersData.title, "Trabajadores")}</h3>

                    <button
                      type="button"
                      className={styles.refreshButton}
                      onClick={closeWorkersSection}
                    >
                      Cerrar
                    </button>
                  </div>

                  {viewWorkersData.loading ? (
                    <div className={styles.emptySmall}>Cargando trabajadores...</div>
                  ) : viewWorkersData.employees.length > 0 ? (
                    <div className={styles.list}>
                      {viewWorkersData.employees.map((employee) => (
                        <div
                          key={employee.employeeId || employee.id}
                          className={styles.listItem}
                        >
                          <div className={styles.listItemMain}>
                            <span className={styles.listTitle}>
                              {safeText(employee.fullName)}
                            </span>
                            <span className={styles.listText}>
                              {safeText(employee.email)}
                            </span>
                          </div>

                          <div className={styles.listItemActions}>
                            {employee.isMainOffice && (
                              <span className={styles.badge}>Principal</span>
                            )}

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
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className={styles.emptySmall}>
                      No hay trabajadores asociados.
                    </div>
                  )}
                </section>
              )}
            </div>
            }
          </>)}
      </div>

      {deleteManagedOfficeCtx && (
        <ModalConfirmation
          title="Quitar centro gestionado"
          message={`¿Seguro que quieres quitar el rol de responsable del centro "${deleteManagedOfficeCtx?.dispositive?.name || deleteManagedOfficeCtx?.affectedEntityId}"?`}
          onConfirm={() => doDeleteManagedOfficeRole(deleteManagedOfficeCtx)}
          onCancel={() => setDeleteManagedOfficeCtx(null)}
        />
      )}

      {deleteOfficeCtx && (
        <ModalConfirmation
          title="Quitar centro de fichaje"
          message={`¿Seguro que quieres quitar el centro "${deleteOfficeCtx.name}"?`}
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

      {deleteDepartmentCtx && (
        <ModalConfirmation
          title="Eliminar departamento"
          message={`¿Seguro que quieres eliminar el departamento "${deleteDepartmentCtx?.name || deleteDepartmentCtx?.affectedEntityId}"?`}
          onConfirm={() => doDeleteDepartment(deleteDepartmentCtx)}
          onCancel={() => setDeleteDepartmentCtx(null)}
        />
      )}
    </>
  );
}