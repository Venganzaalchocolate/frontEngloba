import { useEffect, useState } from "react";
import styles from "../styles/infoSesameOffice.module.css";
import {
  postSesameGetOfficeManagers,
  postSesameGetOfficeEmployees,
  postSesameAssignOfficeEmployee,
  postSesameDeleteOfficeEmployee,
  postSesameAssignEmployeeOfficeRole,
  postSesameDeleteEmployeeOfficeRole,
  searchusername,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { FaTrash } from "react-icons/fa6";
import { BsPersonFillAdd } from "react-icons/bs";

const InfoSesameOffice = ({ modal, charge, info, onCreateSesameOffice }) => {
  const [managers, setManagers] = useState([]);
  const [workers, setWorkers] = useState([]);

  const [showAddManagerModal, setShowAddManagerModal] = useState(false);
  const [showAddWorkerModal, setShowAddWorkerModal] = useState(false);

  const [confirmDeleteManager, setConfirmDeleteManager] = useState({
    show: false,
    manager: null,
  });

  const [confirmDeleteWorker, setConfirmDeleteWorker] = useState({
    show: false,
    worker: null,
  });

  const officeId = info?.officeIdSesame || null;

  const searchUsersSesame = async (query) => {
    if (!query || query.trim().length < 3) return [];

    const token = getToken();
    const res = await searchusername({ query }, token);
    const users = res?.users || [];

    return users
      .filter((u) => !!u?._id && !!u?.userIdSesame)
      .map((u) => ({
        value: u._id,
        label: `${u.firstName || ""} ${u.lastName || ""} (${u.email || "sin email"})`,
      }));
  };

  const loadManagers = async () => {
    if (!officeId) {
      setManagers([]);
      return;
    }

    try {
      charge(true);
      const token = getToken();
      const res = await postSesameGetOfficeManagers({ officeId }, token);

      if (res?.error) throw new Error(res.message || "No se pudieron cargar los responsables");

      setManagers(Array.isArray(res) ? res : []);
    } catch (error) {
      setManagers([]);
      modal("Error", error.message || "No se pudieron cargar los responsables");
    } finally {
      charge(false);
    }
  };

  const loadWorkers = async () => {
    if (!officeId) {
      setWorkers([]);
      return;
    }

    try {
      charge(true);
      const token = getToken();
      const res = await postSesameGetOfficeEmployees({ officeId }, token);

      if (res?.error) throw new Error(res.message || "No se pudieron cargar los trabajadores");

      setWorkers(Array.isArray(res?.employees) ? res.employees : []);
    } catch (error) {
      setWorkers([]);
      modal("Error", error.message || "No se pudieron cargar los trabajadores");
    } finally {
      charge(false);
    }
  };

  const loadAll = async () => {
    await Promise.all([loadManagers(), loadWorkers()]);
  };

  useEffect(() => {
    if (!officeId) {
      setManagers([]);
      setWorkers([]);
      return;
    }
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeId]);

  const handleAddManager = async (formData) => {
    try {
      charge(true);

      if (!officeId) throw new Error("Este dispositivo no tiene centro asociado en Sesame");
      if (!formData?.userId) throw new Error("Debes seleccionar una persona");

      const token = getToken();
      const res = await postSesameAssignEmployeeOfficeRole(
        {
          employeeId: formData.userId,
          officeId,
        },
        token
      );

      if (res?.error) throw new Error(res.message || "No se pudo añadir el responsable");

      setShowAddManagerModal(false);
      await loadManagers();
      modal("Actualizado", "Responsable del centro añadido correctamente");
    } catch (error) {
      modal("Error", error.message || "No se pudo añadir el responsable");
    } finally {
      charge(false);
    }
  };

  const handleDeleteManager = async () => {
    try {
      charge(true);

      const manager = confirmDeleteManager.manager;
      if (!manager?.roleAssignationIdSesame) {
        throw new Error("No se encontró la asignación del responsable");
      }

      const token = getToken();
      const res = await postSesameDeleteEmployeeOfficeRole(
        { assignationId: manager.roleAssignationIdSesame },
        token
      );

      if (res?.error) throw new Error(res.message || "No se pudo eliminar el responsable");

      setConfirmDeleteManager({ show: false, manager: null });
      await loadManagers();
      modal("Actualizado", "Responsable del centro eliminado correctamente");
    } catch (error) {
      modal("Error", error.message || "No se pudo eliminar el responsable");
    } finally {
      charge(false);
    }
  };

  const handleAddWorker = async (formData) => {
    try {
      charge(true);

      if (!officeId) throw new Error("Este dispositivo no tiene centro asociado en Sesame");
      if (!formData?.userId) throw new Error("Debes seleccionar una persona");

      const token = getToken();
      const res = await postSesameAssignOfficeEmployee(
        {
          officeId,
          userId: formData.userId,
          isMainOffice: false,
        },
        token
      );

      if (res?.error) throw new Error(res.message || "No se pudo añadir el trabajador");

      setShowAddWorkerModal(false);
      await loadWorkers();
      modal("Actualizado", "Trabajador añadido correctamente");
    } catch (error) {
      modal("Error", error.message || "No se pudo añadir el trabajador");
    } finally {
      charge(false);
    }
  };

  const handleDeleteWorker = async () => {
    try {
      charge(true);

      const worker = confirmDeleteWorker.worker;
      if (!worker?.userId) throw new Error("No se encontró el usuario");
      if (!officeId) throw new Error("No se encontró el centro");

      const token = getToken();
      const res = await postSesameDeleteOfficeEmployee(
        {
          officeId,
          userId: worker.userId,
        },
        token
      );

      if (res?.error) throw new Error(res.message || "No se pudo eliminar el trabajador");

      setConfirmDeleteWorker({ show: false, worker: null });
      await loadWorkers();
      modal("Actualizado", "Trabajador eliminado correctamente");
    } catch (error) {
      modal("Error", error.message || "No se pudo eliminar el trabajador");
    } finally {
      charge(false);
    }
  };

  if (!officeId) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Centro Sesame asociado</label>
          <p className={styles.fieldTextEmpty}>Este dispositivo no tiene centro de Sesame asociado.</p>

          <button
            type="button"
            className={styles.btnCreateOffice}
            onClick={() => onCreateSesameOffice?.(info)}
          >
            Crear centro en Sesame
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>Centro Sesame asociado</label>
        <p className={styles.fieldTextStatic}>{info?.name || "—"}</p>
      </div>

      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>
          Responsables del centro
          <BsPersonFillAdd onClick={() => setShowAddManagerModal(true)} />
        </label>

        {managers.length > 0 ? (
          managers.map((manager, index) => (
            <div className={styles.boxPerson} key={manager.roleAssignationIdSesame || manager.userId || index}>
              <p
                className={styles.fieldText}
                onClick={() =>
                  modal(manager.fullName || "Responsable", [
                    `Email: ${manager.email || "—"}`,
                    `Rol: ${manager.roleName || "—"}`,
                  ])
                }
              >
                {manager.fullName || "Sin nombre"}
              </p>

              <FaTrash
                className={styles.trash}
                onClick={() =>
                  setConfirmDeleteManager({
                    show: true,
                    manager,
                  })
                }
              />
            </div>
          ))
        ) : (
          <p className={styles.fieldTextEmpty}>No hay responsables en este centro</p>
        )}
      </div>

      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>
          Trabajadores del centro
          <BsPersonFillAdd onClick={() => setShowAddWorkerModal(true)} />
        </label>

        {workers.length > 0 ? (
          workers.map((worker, index) => (
            <div className={styles.boxPerson} key={worker.employeeId || worker.userId || index}>
              <p
                className={styles.fieldText}
                onClick={() =>
                  modal(worker.fullName || "Trabajador", [
                    `Email: ${worker.email || "—"}`,
                    `Estado: ${worker.workStatus || "—"}`,
                    `Principal: ${worker.isMainOffice ? "Sí" : "No"}`,
                  ])
                }
              >
                {worker.fullName || "Sin nombre"}
              </p>

              <FaTrash
                className={styles.trash}
                onClick={() =>
                  setConfirmDeleteWorker({
                    show: true,
                    worker,
                  })
                }
              />
            </div>
          ))
        ) : (
          <p className={styles.fieldTextEmpty}>No hay trabajadores en este centro</p>
        )}
      </div>

      {showAddManagerModal && (
        <ModalForm
          title="Añadir responsable del centro"
          message="Busca y selecciona la persona que quieres añadir como responsable del centro en Sesame."
          fields={[
            {
              name: "userId",
              label: "Persona",
              type: "async-search-select",
              placeholder: "Escribe al menos 3 letras...",
              required: true,
              loadOptions: searchUsersSesame,
            },
          ]}
          onSubmit={handleAddManager}
          onClose={() => setShowAddManagerModal(false)}
          modal={modal}
        />
      )}

      {showAddWorkerModal && (
        <ModalForm
          title="Añadir trabajador al centro"
          message="Busca y selecciona la persona que quieres añadir al centro en Sesame."
          fields={[
            {
              name: "userId",
              label: "Persona",
              type: "async-search-select",
              placeholder: "Escribe al menos 3 letras...",
              required: true,
              loadOptions: searchUsersSesame,
            },
          ]}
          onSubmit={handleAddWorker}
          onClose={() => setShowAddWorkerModal(false)}
          modal={modal}
        />
      )}

      {confirmDeleteManager.show && (
        <ModalConfirmation
          title="Eliminar responsable del centro"
          message={`¿Seguro que deseas eliminar a "${confirmDeleteManager.manager?.fullName || "esta persona"}" como responsable del centro?`}
          onConfirm={handleDeleteManager}
          onCancel={() => setConfirmDeleteManager({ show: false, manager: null })}
        />
      )}

      {confirmDeleteWorker.show && (
        <ModalConfirmation
          title="Eliminar trabajador del centro"
          message={`¿Seguro que deseas quitar a "${confirmDeleteWorker.worker?.fullName || "esta persona"}" de este centro?`}
          onConfirm={handleDeleteWorker}
          onCancel={() => setConfirmDeleteWorker({ show: false, worker: null })}
        />
      )}
    </div>
  );
};

export default InfoSesameOffice;