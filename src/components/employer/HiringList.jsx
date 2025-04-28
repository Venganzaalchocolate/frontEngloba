import React, { useState, useEffect } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaTrashAlt, FaEdit, FaPlusSquare } from "react-icons/fa";
import { deepClone } from '../../lib/utils';
import LeavePeriods from './LeavePeriods';
import LeavePeriodNew from './LeavePeriodNew';
import ModalConfirmation from '../globals/ModalConfirmation';
import ModalForm from '../globals/ModalForm';
import { getToken } from '../../lib/serviceToken';
import { infoUser } from '../../lib/data';
import HiringPeriodEdit from './HiringPeriodEdit'; // <--- nuevo componente para edición en Modal
import { useLogin } from '../../hooks/useLogin.jsx';

const HiringList = ({ hirings, enums, saveHiring }) => {
  // Estado para controlar a cuál hiringPeriod se le abre el modal de edición
  const [hiringPeriodToEdit, setHiringPeriodToEdit] = useState(null);

  // Datos en edición (cuando guardemos, mandamos estos al backend)
  const [hiringsEditing, setHiringsEditing] = useState([]);

  // Controla si mostramos el botón para "LeavePeriodNew"
  const [buttonCreateLeave, setButtonCreateLeave] = useState(false);

  // =========== CONFIRMACIÓN MODAL (el de "¿Seguro deseas borrar?") ===========
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // =========== MODAL de "Información sustitución" ===========
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoLeaveData, setInfoLeaveData] = useState(null);
  const { logged } = useLogin();

  useEffect(() => {
    // Ordenamos los hiringPeriods por fecha de inicio descendente
    const sorted = [...hirings].sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    setHiringsEditing(sorted);
  }, [hirings]);

  // ------------------------------------------------------------------------------
  //                                 BORRAR
  // ------------------------------------------------------------------------------
  const handleDelete = () => {
    setShowConfirmModal(true);
  };

  const onConfirm = () => {
    // Realiza el DELETE en tu backend, etc.
    deleteHirindorLeave(showConfirmModal);
    setShowConfirmModal(false);
  };

  const onCancel = () => {
    setShowConfirmModal(false);
  };

  // elimina un hiringPeriod completo o un leavePeriod
  const deleteHirindorLeave = (id) => {
    const dataAuxPosition = id.split('-');
    let dataAux = deepClone(hiringsEditing);

    if (dataAuxPosition[2] === 'leavePeriods') {
      // borrando un leavePeriod
      const leaveIndex = dataAuxPosition[3];
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]][leaveIndex].active = false;
    } else {
      // borrando el hiringPeriod (poniendo active=false)
      dataAux[dataAuxPosition[0]].active = false;
    }

    // persistimos cambios
    saveHiring(dataAux, 'put');
  };

  const modalConfirmation = () => {
    const type = (showConfirmModal.split('-')[2] === 'leavePeriods') ? 'excedencia' : 'contratación';
    const title = `Eliminar periodo de ${type}`;
    const messageAux = `¿Estás seguro de que deseas eliminar este periodo de ${type}?`;
    return (
      <ModalConfirmation
        title={title}
        message={messageAux}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    );
  };

  // ------------------------------------------------------------------------------
  //                          INFO SUSTITUCIÓN (Modal)
  // ------------------------------------------------------------------------------
  const chargeInfoLeave = (hiringPeriod) => {
    if (!hiringPeriod || !hiringPeriod.reason) {
      console.warn("No hay información de sustitución disponible.");
      return;
    }
  
    const { notes, nameUser, dni } = hiringPeriod.reason;
  
    // Función auxiliar para formatear la fecha
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
  
    const formattedReason = {
      name: nameUser || 'Empleado sustituido',
      dni: dni || '',
      startLeaveDate: notes?.startLeaveDate ? formatDate(notes.startLeaveDate) : '',
      expectedEndLeaveDate: notes?.expectedEndLeaveDate ? formatDate(notes.expectedEndLeaveDate) : '',
      reason: (() => {
        if (!notes?.cause) return '';
        const found = enums.leavetype.find(e => e._id.toString() === notes.cause.toString());
        return found ? found.name : '';
      })()
    };
  
    setInfoLeaveData(formattedReason);
    setShowInfoModal(true);
  };
  

  // ------------------------------------------------------------------------------
  //                            EDICIÓN DE HIRINGPERIOD
  // ------------------------------------------------------------------------------
  const handleEditClick = (hiringPeriod) => {
    // Abre el modal con los datos de este "hiringPeriod"
    setHiringPeriodToEdit(hiringPeriod);
  };

  const handleCloseEditModal = () => {
    setHiringPeriodToEdit(null);
  };

  /**
   * Se llama al guardar el HiringPeriod en el modal de edición.
   * @param {Object} updatedData: datos ya validados proveniente de HiringPeriodEdit
   */
  const handleUpdateHiringPeriod = (updatedData) => {
    // Actualiza la lista en memoria
    const dataAux = deepClone(hiringsEditing);

    const idx = dataAux.findIndex(h => h._id === updatedData._id);
    if (idx >= 0) {
      dataAux[idx] = { ...dataAux[idx], ...updatedData };
    }
    // Llama a tu API / backend
    saveHiring(dataAux, 'put');
    // Cierra el modal
    setHiringPeriodToEdit(null);
  };

  // ------------------------------------------------------------------------------
  //                                  RENDER
  // ------------------------------------------------------------------------------
  return (
    <>
      {hiringsEditing.map((hiringPeriod, i) => {
        if (!hiringPeriod.active) return null; // No mostrar inactivos
        return (
          <div
            key={hiringPeriod._id}
            className={
              hiringPeriod.reason?.replacement
                ? styles.tableResponsiveReason
                : styles.tableResponsive
            }
          >
            {/* Título para sustitución */}
            {hiringPeriod.reason?.replacement && (
              <h3>
                Periodo de sustitución{" "}
                <button onClick={() => chargeInfoLeave(hiringPeriod)}>
                  Información sustitución
                </button>
              </h3>
            )}

            <div className={styles.myTable}>
              {/* Cabecera */}
              <div className={styles.myTableHeader}>
                <div className={styles.myTableCell}>Inicio</div>
                <div className={styles.myTableCell}>Fin</div>
                <div className={styles.myTableCell}>Dispositivo</div>
                <div className={styles.myTableCell}>Jornada</div>
                <div className={styles.myTableCell}>Puesto</div>
                <div className={styles.myTableCell}></div>
              </div>

              {/* Cuerpo */}
              <div className={styles.myTableBody}>
                <div className={styles.myTableRow}>
                  {/* INICIO */}
                  <div
                    data-label="Inicio"
                    className={`${styles.myTableCell} ${styles.fecha}`}
                  >
                    {hiringPeriod.startDate
                      ? new Date(hiringPeriod.startDate).toLocaleDateString()
                      : "-"}
                  </div>
                  {/* FIN */}
                  <div
                    data-label="Fin"
                    className={`${styles.myTableCell} ${styles.fecha}`}
                  >
                    {hiringPeriod.endDate
                      ? new Date(hiringPeriod.endDate).toLocaleDateString()
                      : "-"}
                  </div>
                  {/* DISPOSITIVO */}
                  <div data-label="Dispositivo" className={styles.myTableCell}>
                    <div>
                      {(() => {
                        const deviceId = hiringPeriod.device;
                        let deviceName = "";
                        enums.programs?.forEach((p) => {
                          p.devices.forEach((d) => {
                            if (d._id === deviceId) deviceName = d.name;
                          });
                        });
                        return deviceName || "No asignado";
                      })()}
                    </div>
                  </div>
                  {/* JORNADA */}
                  <div data-label="Jornada" className={styles.myTableCell}>
                    {hiringPeriod.workShift?.type || "-"}
                  </div>
                  {/* PUESTO */}
                  <div data-label="Puesto" className={styles.myTableCell}>
                    {(() => {
                      const posId = hiringPeriod.position;
                      let posName = "";
                      enums.jobs?.forEach((job) => {
                        if (job.subcategories) {
                          job.subcategories.forEach((sub) => {
                            if (sub._id === posId) posName = sub.name;
                          });
                        } else {
                          if (job._id === posId) posName = job.name;
                        }
                      });
                      return posName || "No asignado";
                    })()}
                  </div>
                  {/* ACCIONES */}
                  <div data-label="Acciones" className={styles.myTableCell}>
                    <div className={styles.cajaAcciones}>
                      <button
                        className={styles.botonBaja}
                        style={{ cursor: "pointer", marginRight: "0.5rem" }}
                        title="Añadir Excedencia/Baja"
                        onClick={() => setButtonCreateLeave(hiringPeriod._id)}
                      >
                        Añadir baja/excedencia
                      </button>
                      {(logged.user.role == 'global' || logged.user.role == 'root') &&
                        <FaEdit
                          style={{ cursor: "pointer", marginRight: "0.5rem" }}
                          title="Editar este periodo"
                          onClick={() => handleEditClick(hiringPeriod)}
                        />
                      }
                      {(logged.user.role == 'global' || logged.user.role == 'root') &&
                        <FaTrashAlt
                          style={{ cursor: "pointer" }}
                          title="Eliminar este periodo"
                          onClick={() =>
                            setShowConfirmModal(`${i}-${hiringPeriod._id}-active`)
                          }

                        />
                      }
                    </div>
                  </div>
                </div>

                {/* Bloque para LeavePeriods (si existen) */}
                {hiringPeriod.leavePeriods &&
                  hiringPeriod.leavePeriods.filter((lp) => lp.active).length > 0 && (
                    <div className={styles.myTableRow}>
                      <div className={styles.myTableCell} style={{ gridColumn: "1 / -1" }}>
                        <LeavePeriods
                          leavePeriods={hiringPeriod.leavePeriods}
                          hiringPeriodId={hiringPeriod._id}
                          positionHiring={i}
                          enums={enums}
                          deleteHirindorLeave={(x) => setShowConfirmModal(x)}
                          onUpdateLeavePeriod={(leaveData, actionType) => saveHiring(leaveData, actionType)}
                        />

                      </div>
                    </div>
                  )}
              </div>
            </div>
          </div>
        );
      })}

      {/* Modal para confirmar "borrar" */}
      {showConfirmModal && modalConfirmation()}

      {/* Modal para crear un nuevo LeavePeriod */}
      {buttonCreateLeave && (
        <LeavePeriodNew
          enumsData={enums}
          saveHiring={(leave, type) => saveHiring(leave, type)}
          close={() => setButtonCreateLeave(false)}
          idHiring={buttonCreateLeave}
        />
      )}

      {/* Modal para mostrar info de la persona a la que se sustituye */}
{showInfoModal && infoLeaveData && console.log(infoLeaveData) &&(
  <ModalForm
    title="Información"
    message="Datos del periodo de baja/excedencia"
    fields={[
      {
        name: "name",
        label: "Nombre",
        defaultValue: infoLeaveData.name || '',
        disabled: true
      },
      {
        name: "dni",
        label: "DNI",
        defaultValue: infoLeaveData.dni || '',
        disabled: true
      },
      {
        name: "startLeaveDate",
        label: "Inicio",
        defaultValue: infoLeaveData.startLeaveDate || '',
        disabled: true
      },
      {
        name: "expectedEndLeaveDate",
        label: "Fin previsto",
        defaultValue: infoLeaveData.expectedEndLeaveDate || '',
        disabled: true
      },
      {
        name: "reason",
        label: "Motivo",
        defaultValue: infoLeaveData.reason || '',
        disabled: true
      }
    ]}
    onSubmit={() => setShowInfoModal(false)}
    onClose={() => setShowInfoModal(false)}
  />
)}


      {/* Modal para editar el HiringPeriod actual */}
      {hiringPeriodToEdit && (
        <HiringPeriodEdit
          hiringPeriod={hiringPeriodToEdit}
          enums={enums}
          onClose={handleCloseEditModal}
          onSave={handleUpdateHiringPeriod}
          infoDNI={(hiringPeriodToEdit.reason?.replacement) ? infoLeaveData : null}
        />
      )}
    </>
  );
};

export default HiringList;
