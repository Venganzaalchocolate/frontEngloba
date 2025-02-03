import { useEffect, useState } from 'react';
import styles from '../styles/responsability.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { getToken } from "../../lib/serviceToken";
import { responsibles } from "../../lib/data"; // Función que hace fetch a /responsibles

const Responsability = ({ user, modal, charge, enumsData, chargeEnums }) => {
  const [listResponsabilities, setListResponsabilities] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // 1. Abrir modal de confirmación de eliminación
  const handleDelete = (id) => {
    setShowConfirmModal(id);
  };

  // 2. Confirmar la eliminación
  const onConfirm = () => {
    deleteResponsability(showConfirmModal);
    setShowConfirmModal(false);
  };

  // 3. Cancelar la eliminación
  const onCancel = () => {
    setShowConfirmModal(false);
  };

  /**
   * Elimina la responsabilidad (programa o dispositivo)
   */
  const deleteResponsability = async (responsabilityId) => {
    try {
      charge(true); // Muestra loader
      const item = listResponsabilities.find(r => r._id === responsabilityId);
      if (!item) {
        modal("Error", "No se encontró el elemento a eliminar.");
        return;
      }

      const token = getToken();

      // Distinguimos si es un programa o un dispositivo a partir de item.type
      if (item.type === "program") {
        // Eliminar al user como responsable del PROGRAMA
        const payload = {
          type: "program",
          action: "remove",
          programId: item._id,
          responsibleId: user._id
        };
        const result = await responsibles(payload, token);
        if (result.error) {
          modal("Error", result.message || "No se pudo eliminar la responsabilidad de programa.");
        } else {
          modal("Responsabilidad Eliminada", "El usuario ya no es responsable del programa.");
          chargeEnums();
          closeModal();
        }

      } else {
        // Eliminar al user como responsable del DISPOSITIVO
        const payload = {
          type: "device",
          action: "remove",
          programId: item.programId,
          deviceId: item._id,
          responsibleId: user._id
        };
        const result = await responsibles(payload, token);
        if (result.error) {
          modal("Error", result.message || "No se pudo eliminar la responsabilidad del dispositivo.");
        } else {
          modal("Responsable Eliminado", "El usuario ya no es responsable del dispositivo.");
          chargeEnums();
          closeModal();
        }
      }

    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al eliminar la responsabilidad.");
      closeModal();
    } finally {
      charge(false);
    }
  };

  /**
   * Construye las opciones del SELECT (Programas + Dispositivos)
   * Value: "program:<programId>" o "device:<programId>:<deviceId>"
   */
  const buildFields = () => {
    let options = [{ value: "", label: "Seleccione Programa o Dispositivo" }];
    if (!enumsData?.programs) return [
      { name: "responsibility", label: "Responsabilidad", type: "select", required: true, options }
    ];

    // 1. Opciones de PROGRAMAS
    enumsData.programs.forEach(program => {
      options.push({
        value: `program:${program._id}`,
        label: `(Programa) ${program.name}`
      });
    });

    // 2. Opciones de DISPOSITIVOS
    enumsData.programs.forEach(program => {
      program.devices.forEach(device => {
        options.push({
          value: `device:${program._id}:${device._id}`,
          label: `(Dispositivo) ${device.name} [${program.name}]`
        });
      });
    });

    return [
      {
        name: "responsibility",
        label: "Responsabilidad",
        type: "select",
        required: true,
        options
      }
    ];
  };

  /**
   * Filtra de enumsData.programsIndex todos los items (program + device)
   * donde el user figure en "responsible"
   */
  const responsabilityFor = () => {
    if (!enumsData?.programsIndex) return;

    const index = enumsData.programsIndex; // Diccionario con { id -> object }
    const list = [];

    // Recorremos todos los items en programsIndex
    // Si "responsible" existe y contiene user._id, lo añadimos a list
    for (const key in index) {
      const item = index[key];
      if (Array.isArray(item.responsible) && item.responsible.includes(user._id)) {
        list.push(item);
      }
    }

    setListResponsabilities(list);
  };

  /**
   * useEffect: cada vez que cambie enumsData, recargamos la lista
   */
  useEffect(() => {
    responsabilityFor();
    // eslint-disable-next-line
  }, [enumsData]);

  const fields = buildFields();

  /**
   * Muestra el modal para añadir responsabilidad
   */
  const addResponsibilityModal = () => {
    return (
      <ModalForm
        title="Añadir Responsabilidad"
        message="Seleccione un programa o dispositivo"
        fields={fields}
        onSubmit={handleSubmitAdd}
        onClose={closeModal}
      />
    );
  };

  /**
   * Cierra el modal principal
   */
  const closeModal = () => {
    setOpenModal(false);
  };

  /**
   * Maneja el submit para AÑADIR responsabilidad (program/device)
   */
  const handleSubmitAdd = async (formData) => {
    try {
      charge(true);

      const selectedValue = formData.responsibility;
      if (!selectedValue) {
        modal("Error", "Debe seleccionar una opción válida.");
        return;
      }

      const parts = selectedValue.split(":");  // ["program", <programId>] o ["device", <programId>, <deviceId>]
      const type = parts[0];
      const token = getToken();
      let payload = {};

      if (type === "program") {
        const programId = parts[1];
        payload = {
          type: "program",
          action: "add",
          programId,
          responsible: user._id
        };

      } else if (type === "device") {
        const programId = parts[1];
        const deviceId = parts[2];
        payload = {
          type: "device",
          action: "add",
          programId,
          deviceId,
          responsible: user._id
        };

      } else {
        modal("Error", "Selección inválida: no se reconoce el tipo.");
        return;
      }
      // Llamamos al backend
      const result = await responsibles(payload, token);
      if (result.error) {
        modal("Error", result.message || "No se pudo añadir la responsabilidad.");
      } else {
        modal("Responsable Añadido", "El usuario se ha añadido correctamente.");
        chargeEnums();
        closeModal();
      }

    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al añadir la responsabilidad.");
      closeModal();
    } finally {
      charge(false);
    }
  };

  /**
   * Modal de confirmación para eliminar
   */
  const modalConfirmation = () => {
    const item = listResponsabilities.find(el => el._id === showConfirmModal);
    if (!item) return null;

    const prefix = (item.type === "program") ? "programa" : "dispositivo";
    const messageAux = `¿Estás seguro de que deseas que ${user.firstName} ${user.lastName} deje de ser responsable de este ${prefix}: ${item.name}?`;

    return (
      <ModalConfirmation
        title="Eliminar responsabilidad"
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
          Responsabilidades{" "}
          <FaSquarePlus
            onClick={() => setOpenModal(true)}
            style={{ cursor: "pointer" }}
          />
        </h2>
        <div className={styles.contenedorBotones}>
          {listResponsabilities.length > 0 ? (
            <ul>
              {listResponsabilities.map((item) => {
                const tipo = (item.type === "program") ? "Programa" : "Dispositivo";
                return (
                  <li
                    key={`${item._id}-${item.type}`}
                    className={styles.dispositivos}
                  >
                    <p>[{tipo}] {item.name}</p>
                    <span>
                      <FaTrashAlt
                        onClick={() => handleDelete(item._id)}
                        style={{ cursor: "pointer" }}
                      />
                    </span>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No es responsable de ningún programa o dispositivo</p>
          )}
        </div>
      </div>

      {openModal && addResponsibilityModal()}
      {showConfirmModal && modalConfirmation()}
    </>
  );
};

export default Responsability;
