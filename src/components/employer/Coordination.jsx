import { useEffect, useState } from 'react';
import styles from '../styles/responsability.module.css'; // Ajusta el path a tus estilos si quieres
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from '../globals/ModalConfirmation';

// IMPORTANTE: Asegúrate de importar la función que llama a /coordinators
// en lugar de updateDispositive.
import { coordinators } from '../../lib/data'; 
import { getToken } from '../../lib/serviceToken';

const Coordination = ({ user, modal, charge, enumsData, chargeEnums }) => {
  // Dispositivos donde el usuario es coordinador
  const [listCoordination, setListCoordination] = useState([]);

  // Modal para añadir coordinador
  const [openModal, setOpenModal] = useState(false);

  // Modal de confirmación para eliminar coordinador
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  /**
   * Maneja la apertura del ModalConfirmation para eliminar
   */
  const handleDelete = (deviceId) => {
    // Guardamos el _id del dispositivo en estado,
    // para luego usarlo en el ModalConfirmation
    setShowConfirmModal(deviceId);
  };

  /**
   * Confirma la eliminación del usuario como coordinador
   */
  const onConfirm = () => {
    removeCoordinator(showConfirmModal);
    setShowConfirmModal(false);
  };

  /**
   * Cancela la acción de eliminación
   */
  const onCancel = () => {
    setShowConfirmModal(false);
  };

  /**
   * Quita al usuario como coordinador de un dispositivo
   */
  const removeCoordinator = async (deviceId) => {
    // Obtenemos la info del dispositivo desde la lista local
    const dataAux = listCoordination.find((item) => item._id === deviceId);
    if (!dataAux) {
      modal("Error", "No se encontró el dispositivo a eliminar.");
      return;
    }

    try {
      charge(true); // Muestra loader

      // Para saber a qué programa pertenece
      const programId = dataAux.programId;

      // Construimos el payload para "REMOVE"
      const removeData = {
        action: "remove",
        programId,
        deviceId,              // <-- El controlador usa "deviceId"
        coordinatorId: user._id // <-- ID del coordinador a eliminar (usuario actual)
      };

      const token = getToken();
      const result = await coordinators(removeData, token);

      if (result.error) {
        modal("Error", result.message || "No se pudo quitar la coordinación del dispositivo.");
      } else {
        modal("Coordinación Eliminada", "El usuario ya no es coordinador del dispositivo.");
        chargeEnums(); // Refrescamos datos globales
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al quitar la coordinación.");
    } finally {
      charge(false); // Oculta loader
    }
  };

  /**
   * Construye los campos para ModalForm (añadir coordinador)
   */
  const buildFields = () => {
    let deviceOptions = [];
    if (enumsData?.programs) {
      deviceOptions = enumsData.programs.flatMap(program =>
        program.devices.map(device => ({
          // Guardamos en value el programId y el deviceId
          value: `${program._id}-${device._id}`,
          label: device.name
        }))
      );
    }

    return [
      {
        name: "device",
        label: "Dispositivo",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Seleccione una opción" },
          ...deviceOptions
        ],
      }
    ];
  };

  /**
   * Filtra de enumsData.programsIndex todos los dispositivos
   * donde el usuario figure como coordinador (device.coordinators)
   */
  const coordinationFor = () => {
    const programsIndex = enumsData.programsIndex;
    
    const coordinationList = [];

    for (const idDispositive in programsIndex) {
      const item = programsIndex[idDispositive];
      // item.coordinators es un array de userIds
      if (item.coordinators && item.coordinators.includes(user._id)) {
        // Este item representa un dispositivo donde el usuario es coordinador
        coordinationList.push(item);
      }
    }
    setListCoordination(coordinationList);
  };

  useEffect(() => {
    if (enumsData?.programsIndex) {
      coordinationFor();
    }
    // eslint-disable-next-line
  }, [enumsData]);

  /**
   * Renderiza el Modal para añadir coordinador
   */
  const addCoordinatorModal = () => {
    return (
      <ModalForm
        title="Añadir Coordinador"
        message="Seleccione un dispositivo para ser coordinador"
        fields={buildFields()}
        onSubmit={handleSubmitAddCoordinator}
        onClose={closeModal}
      />
    );
  };

  /**
   * Cierra el modal de añadir
   */
  const closeModal = () => {
    setOpenModal(false);
  };

  /**
   * Maneja el submit del ModalForm para añadir al usuario como coordinador
   */
  const handleSubmitAddCoordinator = async (formData) => {
    try {
      charge(true); // Muestra loader

      // Dividimos la string "programId-deviceId"
      const [programId, deviceId] = formData.device.split('-');

      // Construimos el body para "ADD"
      const addData = {
        action: "add",
        programId,
        deviceId,
        coordinators: user._id, // Añadimos al user como coordinador
      };

      const token = getToken();
      const result = await coordinators(addData, token);
      if (result.error) {
        modal("Error", result.message || "No se pudo añadir coordinador al dispositivo.");
      } else {
        modal("Coordinador Añadido", "El usuario es coordinador de un nuevo dispositivo.");
        chargeEnums();
        closeModal();
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al añadir el coordinador al dispositivo.");
    } finally {
      charge(false);
    }
  };

  /**
   * Modal de confirmación para eliminar coordinador
   */
  const modalConfirmation = () => {
    // Obtenemos la data del dispositivo a eliminar
    const dataAux = listCoordination.find((item) => item._id === showConfirmModal);
    if (!dataAux) return null;

    const messageAux = `¿Estás seguro de que deseas que ${user.firstName} ${user.lastName} deje de ser coordinador de ${dataAux.name}?`;

    return (
      <ModalConfirmation
        title="Eliminar coordinación"
        message={messageAux}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  };

  /**
   * Render principal
   */
  return (
    <>
      <div className={styles.contenedor}>
        <h2>
          Coordinación 
          <FaSquarePlus 
            onClick={() => setOpenModal(true)} 
            style={{ cursor: "pointer", marginLeft: "10px" }}
          />
        </h2>

        <div className={styles.contenedorBotones}>
          {listCoordination.length > 0 ? (
            <ul>
              {listCoordination.map((device) => (
                <li key={device._id} className={styles.dispositivos}>
                  <p>{device.name}</p>
                  <span>
                    <FaTrashAlt 
                      onClick={() => handleDelete(device._id)} 
                      style={{ cursor: "pointer" }}
                    />
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p>No es coordinador de ningún dispositivo</p>
          )}
        </div>
      </div>

      {openModal && addCoordinatorModal()}
      {showConfirmModal && modalConfirmation()}
    </>
  );
};

export default Coordination;
