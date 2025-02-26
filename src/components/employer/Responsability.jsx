import { useEffect, useState, useCallback, useMemo } from 'react';
import styles from '../styles/responsability.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { getToken } from "../../lib/serviceToken";
import { responsibles } from "../../lib/data";
import { useLogin } from '../../hooks/useLogin';

const Responsability = ({
  user,
  modal,
  charge,
  enumsData,
  chargePrograms
}) => {
  const [listResponsabilities, setListResponsabilities] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  const { logged } = useLogin()

  // =====================================================
  // Cargar la lista de responsabilidades (programas + dispositivos)
  // =====================================================
  useEffect(() => {
    if (!enumsData || !enumsData.programs) {
      setListResponsabilities([]);
      return;
    }

    // Construimos un array con todos los programas y los dispositivos
    // donde el usuario sea 'responsable'
    const responsibilities = [];

    // 1. Recorrer todos los programas
    enumsData.programs.forEach(program => {
      // Si es responsable del programa
      if (Array.isArray(program.responsible) && program.responsible.includes(user._id)) {
        responsibilities.push({
          ...program,
          type: 'program'
        });
      }

      // 2. Recorrer dispositivos del programa
      if (Array.isArray(program.devices)) {
        program.devices.forEach(device => {
          if (
            Array.isArray(device.responsible) &&
            device.responsible.includes(user._id)
          ) {
            responsibilities.push({
              ...device,
              type: 'device',
              programId: program._id,     // para saber a cuál programa pertenece
              programName: program.name   // opcional, si quieres mostrarlo
            });
          }
        });
      }
    });

    setListResponsabilities(responsibilities);
  }, [enumsData, user._id]);

  // =====================================================
  // Eliminar responsabilidad (confirmación)
  // =====================================================
  const handleDelete = useCallback((id) => {
    setConfirmId(id);
  }, []);

  const onConfirm = useCallback(() => {
    deleteResponsability(confirmId);
    setConfirmId(null);
  }, [confirmId]);

  const onCancel = useCallback(() => {
    setConfirmId(null);
  }, []);

  const deleteResponsability = async (responsabilityId) => {
    charge(true);
    const item = listResponsabilities.find(r => r._id === responsabilityId);
    if (!item) {
      modal("Error", "No se encontró el elemento a eliminar.");
      charge(false);
      return;
    }

    const token = getToken();
    let payload = {};

    // Miramos si es 'program' o 'device'
    if (item.type === 'program') {
      payload = {
        type: "program",
        action: "remove",
        programId: item._id,
        responsibleId: user._id
      };
    } else if (item.type === 'device') {
      payload = {
        type: "device",
        action: "remove",
        programId: item.programId,
        deviceId: item._id,
        responsibleId: user._id
      };
    } else {
      modal("Error", "Tipo de responsabilidad desconocido.");
      charge(false);
      return;
    }

    // Llamamos a la API
    const result = await responsibles(payload, token);
    if (result.error) {
      modal("Error", result.message || "No se pudo eliminar la responsabilidad.");
    } else {
      modal(
        "Responsabilidad Eliminada",
        "Se ha eliminado correctamente la responsabilidad."
      );
      // Actualizar enums en el padre (programas / dispositivos)
      chargePrograms(result);
    }
    charge(false);
  };

  // =====================================================
  // Añadir responsabilidad (modal y formulario)
  // =====================================================
  const closeModal = useCallback(() => {
    setOpenModal(false);
  }, []);

  const openModalAdd = useCallback(() => {
    setOpenModal(true);
  }, []);

  // Crear opciones del select
  const buildFields = useCallback(() => {
    // Lista de opciones para "responsibility"
    // combinando programas + dispositivos
    const options = [
      { value: "", label: "Seleccione Programa o Dispositivo" }
    ];

    if (!enumsData || !enumsData.programs) {
      return [
        {
          name: "responsibility",
          label: "Responsabilidad",
          type: "select",
          required: true,
          options
        }
      ];
    }

    enumsData.programs.forEach(program => {
      // Opción de programa
      options.push({
        value: `program:${program._id}`,
        label: `(Programa) ${program.name}`
      });

      // Opciones de dispositivos
      (program.devices || []).forEach(device => {
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
  }, [enumsData]);

  const fields = useMemo(() => buildFields(), [buildFields]);

  // Procesar el envío del formulario
  const handleSubmitAdd = async (formData) => {
    charge(true);
    const selectedValue = formData.responsibility;
    if (!selectedValue) {
      modal("Error", "Debe seleccionar una opción válida.");
      charge(false);
      return;
    }

    const parts = selectedValue.split(":"); 
    // Ej: ["program", <programId>] 
    // o  ["device", <programId>, <deviceId>]
    const type = parts[0];
    const token = getToken();
    let payload = {};

    if (type === "program") {
      payload = {
        type: "program",
        action: "add",
        programId: parts[1],
        responsible: user._id
      };
    } else if (type === "device") {
      payload = {
        type: "device",
        action: "add",
        programId: parts[1],
        deviceId: parts[2],
        responsible: user._id
      };
    } else {
      modal("Error", "Selección inválida: no se reconoce el tipo.");
      charge(false);
      return;
    }

    const result = await responsibles(payload, token);
    if (result.error) {
      modal("Error", result.message || "No se pudo añadir la responsabilidad.");
    } else {
      modal(
        "Responsable Añadido",
        "El usuario se ha añadido correctamente como responsable."
      );
      // Mandamos al padre la data nueva para refrescar
      chargePrograms(result);
      closeModal();
    }
    charge(false);
  };

  // =====================================================
  // Render
  // =====================================================
  return (
    <>
      <div className={styles.contenedor}>
        <h2>
          Responsabilidades
          {(logged.user.role=='global' || logged.user.role=='root') &&
          <FaSquarePlus
            onClick={openModalAdd}
            style={{ cursor: "pointer" }}
          />
          }
          
        </h2>

        <div className={styles.contenedorBotones}>
          {listResponsabilities.length > 0 ? (
            <ul>
              {listResponsabilities.map(item => {
                // Identificar el tipo para mostrar en la interfaz
                // (Programa) / (Dispositivo)
                let tipoLabel = "Programa";
                if (item.type === "device") {
                  tipoLabel = "Dispositivo";
                }

                return (
                  <li key={item._id} className={styles.dispositivos}>
                    <p>
                      [{tipoLabel}] {item.name}
                      {item.type === "device" && item.programName
                        ? ` (Pertenece a: ${item.programName})`
                        : ""}
                    </p>
                    {(logged.user.role=='global' || logged.user.role=='root') &&
                     <span>
                      <FaTrashAlt
                        onClick={() => handleDelete(item._id)}
                        style={{ cursor: "pointer" }}
                      />
                    </span>
                    }
                   
                  </li>
                );
              })}
            </ul>
          ) : (
            <p>No es responsable de ningún programa o dispositivo</p>
          )}
        </div>
      </div>

      {/* Modal para añadir responsabilidad */}
      {openModal && (
        <ModalForm
          title="Añadir Responsabilidad"
          message="Seleccione un programa o dispositivo"
          fields={fields}
          onSubmit={handleSubmitAdd}
          onClose={closeModal}
        />
      )}

      {/* Modal de confirmación para eliminar */}
      {confirmId && (() => {
        const item = listResponsabilities.find(el => el._id === confirmId);
        if (!item) return null;
        const tipo = item.type === 'program' ? 'programa' : 'dispositivo';
        const messageAux = `¿Estás seguro de que deseas que ${user.firstName} ${user.lastName} deje de ser responsable de este ${tipo}: ${item.name}?`;

        return (
          <ModalConfirmation
            title="Eliminar responsabilidad"
            message={messageAux}
            onConfirm={onConfirm}
            onCancel={onCancel}
          />
        );
      })()}
    </>
  );
};

export default Responsability;
