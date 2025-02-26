import { useEffect, useState, useCallback } from 'react';
import styles from '../styles/responsability.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { coordinators } from '../../lib/data';   // Llama a tu endpoint handleCoordinators
import { getToken } from '../../lib/serviceToken';
import { useLogin } from '../../hooks/useLogin';

/**
 * Componente para gestionar la COORDINACIÓN de dispositivos
 * (usando tu backend handleCoordinators, que espera 'programId' y 'deviceId').
 */
const Coordination = ({ user, modal, charge, enumsData, chargePrograms }) => {
  const { logged } = useLogin()
  // Lista de dispositivos donde el usuario es coordinador
  const [listCoordination, setListCoordination] = useState([]);

  // Para abrir/cerrar el Modal de añadir coordinador
  const [openModal, setOpenModal] = useState(false);

  // ID del dispositivo que se va a eliminar la coordinación
  const [confirmId, setConfirmId] = useState(null);

  // =====================================================
  // 1) Calcular la lista de dispositivos donde el usuario es coordinador
  // =====================================================
  useEffect(() => {
    if (!enumsData?.programs) {
      setListCoordination([]);
      return;
    }

    const coordinationList = [];

    // Recorremos todos los programas y sus dispositivos
    enumsData.programs.forEach(program => {
      if (Array.isArray(program.devices)) {
        program.devices.forEach(device => {
          // ¿El usuario aparece en device.coordinators?
          if (
            Array.isArray(device.coordinators) &&
            device.coordinators.includes(user._id)
          ) {
            // Lo añadimos a la lista
            coordinationList.push({
              // Guardamos info útil para la interfaz y para el backend
              _id: device._id,        // ID del dispositivo
              name: device.name,
              programId: program._id, // para saber a qué programa pertenece
              programName: program.name,
            });
          }
        });
      }
    });

    setListCoordination(coordinationList);
  }, [enumsData, user._id]);

  // =====================================================
  // 2) Eliminar coordinación (abrir/cerrar modal confirmación)
  // =====================================================
  const handleDelete = useCallback((deviceId) => {
    setConfirmId(deviceId);
  }, []);

  const onConfirm = useCallback(() => {
    if (confirmId) {
      removeCoordinator(confirmId);
    }
    setConfirmId(null);
  }, [confirmId]);

  const onCancel = useCallback(() => {
    setConfirmId(null);
  }, []);

  /**
   * removeCoordinator:
   *  Quita al usuario (user._id) de coordinators en un dispositivo (deviceId)
   */
  const removeCoordinator = async (deviceId) => {
    const deviceItem = listCoordination.find((d) => d._id === deviceId);
    if (!deviceItem) {
      modal("Error", "No se encontró el dispositivo en la lista de coordinaciones.");
      return;
    }

    try {
      charge(true);
      const token = getToken();

      // Construimos el payload para la API
      const payload = {
        action: "remove",
        programId: deviceItem.programId,
        deviceId: deviceItem._id,
        coordinatorId: user._id,
      };

      const result = await coordinators(payload, token);
      if (result.error) {
        modal("Error", result.message || "No se pudo quitar la coordinación.");
      } else {
        modal("Coordinación Eliminada", "El usuario ya no es coordinador de ese dispositivo.");
        // Refrescamos datos globales (para que se vea reflejado el cambio)
        chargePrograms(result);
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al eliminar la coordinación.");
    } finally {
      charge(false);
    }
  };

  // =====================================================
  // 3) Añadir coordinación (ModalForm)
  // =====================================================
  const openModalAdd = () => {
    setOpenModal(true);
  };

  const closeModal = () => {
    setOpenModal(false);
  };

  /**
   * buildFields: construye los campos del formulario para elegir
   * un dispositivo de la lista "programId-deviceId"
   */
  const buildFields = useCallback(() => {
    // Generamos opciones con todos los dispositivos de todos los programas
    let options = [{ value: "", label: "Seleccione un dispositivo" }];

    if (enumsData?.programs) {
      enumsData.programs.forEach(program => {
        if (program.devices) {
          program.devices.forEach(device => {
            options.push({
              value: `${program._id}:${device._id}`, // 'programId:deviceId'
              label: `(Dispositivo) ${device.name} [${program.name}]`,
            });
          });
        }
      });
    }

    return [
      {
        name: "selectedDevice",
        label: "Dispositivo",
        type: "select",
        required: true,
        options,
      },
    ];
  }, [enumsData]);

  /**
   * handleSubmitAddCoordinator:
   *  Añade al usuario como coordinador en el dispositivo elegido
   */
  const handleSubmitAddCoordinator = async (formData) => {
    const { selectedDevice } = formData;
    if (!selectedDevice) {
      modal("Error", "Debe seleccionar un dispositivo.");
      return;
    }

    try {
      charge(true);
      const token = getToken();

      // Dividimos "programId:deviceId"
      const [programId, deviceId] = selectedDevice.split(":");

      // Payload para "add"
      const payload = {
        action: "add",
        programId,
        deviceId,
        coordinators: user._id, // puede ser un array, pero el back acepta $addToSet
      };

      const result = await coordinators(payload, token);
      if (result.error) {
        modal("Error", result.message || "No se pudo añadir el coordinador.");
      } else {
        modal("Coordinador Añadido", "Se ha asignado correctamente.");
        chargePrograms(result); // recarga para ver el cambio
        closeModal();
      }
    } catch (error) {
      modal("Error", error.message || "Error al añadir coordinador.");
    } finally {
      charge(false);
    }
  };

  // =====================================================
  // 4) Modal de confirmación para la eliminación
  // =====================================================
  const modalConfirmation = () => {
    const deviceItem = listCoordination.find((d) => d._id === confirmId);
    if (!deviceItem) return null;

    const mensaje = `¿Estás seguro de que deseas que ${user.firstName} ${user.lastName} deje de ser coordinador de '${deviceItem.name}' (Programa: ${deviceItem.programName})?`;

    return (
      <ModalConfirmation
        title="Eliminar coordinación"
        message={mensaje}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  };

  // =====================================================
  // Render principal
  // =====================================================
  return (
    <>
      <div className={styles.contenedor}>
        <h2>
          Coordinación 
          {(logged.user.role=='global' || logged.user.role=='root') &&
          <FaSquarePlus 
          onClick={openModalAdd}
          style={{ cursor: "pointer", marginLeft: 10 }}
        />
          }
          
        </h2>

        <div className={styles.contenedorBotones}>
          {listCoordination.length > 0 ? (
            <ul>
              {listCoordination.map(device => (
                <li key={device._id} className={styles.dispositivos}>
                  <p>
                    {device.name}{" "}
                    <small>(Programa: {device.programName})</small>
                  </p>
                  {(logged.user.role=='global' || logged.user.role=='root') &&
                  <span>
                    <FaTrashAlt
                      onClick={() => handleDelete(device._id)}
                      style={{ cursor: "pointer" }}
                    />
                  </span>
                  }
                  
                </li>
              ))}
            </ul>
          ) : (
            <p>No es coordinador de ningún dispositivo</p>
          )}
        </div>
      </div>

      {/* Modal para añadir coordinador */}
      {openModal && (
        <ModalForm
          title="Añadir Coordinador"
          message="Seleccione un dispositivo"
          fields={buildFields()}
          onSubmit={handleSubmitAddCoordinator}
          onClose={closeModal}
        />
      )}

      {/* Modal de confirmación para eliminar coordinador */}
      {confirmId && modalConfirmation()}
    </>
  );
};

export default Coordination;
