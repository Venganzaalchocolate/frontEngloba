import React, { useEffect, useState } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaTrashAlt, FaEdit, FaPlusSquare, FaSave } from "react-icons/fa";
import { MdEditOff } from "react-icons/md";
import { deepClone } from '../../lib/utils';
import LeavePeriods from './LeavePeriods';
import LeavePeriodNew from './LeavePeriodNew';
import ModalConfirmation from '../globals/ModalConfirmation';
import ModalForm from '../globals/ModalForm'; // <-- IMPORTA EL MODAL PARA MOSTRAR INFO
import { getToken } from '../../lib/serviceToken';
import { infoUser } from '../../lib/data';

const HiringList = ({ hirings, enums, saveHiring }) => {
  const [isEditing, setIsEditing] = useState(null); // Controla si estamos en modo de edición
  const [errores, setErrores] = useState('');
  const [hiringsEditing, setHiringsEditing] = useState([]);
  const [buttonCreateLeave, setButtonCreateLeave] = useState(false);
  // =========== CONFIRMACIÓN MODAL ===========
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // NUEVOS ESTADOS PARA EL MODAL DE INFO LEAVE
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoLeaveData, setInfoLeaveData] = useState(null);

  const handleDelete = () => {
    setShowConfirmModal(true);
  };

  const onConfirm = () => {
    //FUNCION QUE LLAMA A LA BBDD Y REALIZA EL DELETE
    deleteHirindorLeave(showConfirmModal);
    setShowConfirmModal(false);
  };

  const onCancel = () => {
    // Cancelar la acción
    setShowConfirmModal(false);
  };

  // ============================================
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

  useEffect(() => {
    hirings.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    setHiringsEditing(hirings);
  }, [hirings]);

  const saveAndReset = () => {
    setIsEditing(null);
    saveHiring(hiringsEditing, 'put');
  };

  const handleChange = (e) => {
    let value = e.target.value;
    // Necesitamos cambiar las fechas a isoString para poder procesarlas con los inputs
    if (e.target.type === "date") value = new Date(value).toISOString();
    // El id lo convertimos en array para poder coger los indices necesarios
    const dataAuxPosition = e.target.id.split('-');
    let dataAux = deepClone(hiringsEditing);

    if (dataAuxPosition[2] === 'leavePeriods') {
      const leaveIndex = dataAuxPosition[3];
      const field = dataAuxPosition[4];
      // Actualizar el valor en el estado para el leavePeriod correspondiente
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]][leaveIndex][field] = value;
    } else {
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]] = value;
    }
    setHiringsEditing(dataAux);
  };

  const editCancel = () => {
    setIsEditing(false);
    setHiringsEditing(hirings);
  };

  const editHiring = (id) => {
    setHiringsEditing(hirings);
    setIsEditing(id);
  };

  const deleteHirindorLeave = (id) => {
    let value = false;
    const dataAuxPosition = id.split('-');
    let dataAux = deepClone(hiringsEditing);
    if (dataAuxPosition[2] === 'leavePeriods') {
      const leaveIndex = dataAuxPosition[3];
      const field = dataAuxPosition[4];
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]][leaveIndex][field] = value;
    } else {
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]] = value;
    }
    saveHiring(dataAux, 'put');
  };

  // MODIFICACIÓN DE chargeInfoLeave PARA ABRIR EL MODAL CON LOS DATOS
  const chargeInfoLeave = async (idUser) => {
    const token = getToken();
    const dataUserLeave = await infoUser(token, { id: idUser });
  
    // Filtrar los hiringPeriods activos y sin endDate
    const openHiringPeriods = dataUserLeave.hiringPeriods.filter(h => h.active && !h.endDate);
  
    // Recopilar todos los leavePeriods activos y abiertos (sin actualEndLeaveDate) de esos hiringPeriods
    const allOpenLeavePeriods = openHiringPeriods.reduce((acc, hiring) => {
      if (Array.isArray(hiring.leavePeriods)) {
        const openLeaves = hiring.leavePeriods.filter(lp => lp.active && !lp.actualEndLeaveDate);
        return acc.concat(openLeaves);
      }
      return acc;
    }, []);
  
    // Ordenar los leavePeriods abiertos por startLeaveDate de forma descendente
    allOpenLeavePeriods.sort((a, b) => new Date(b.startLeaveDate) - new Date(a.startLeaveDate));
  
    // Función auxiliar para formatear la fecha en DD/MM/AAAA
    const formatDate = (date) => {
      if (!date) return '';
      const d = new Date(date);
      const day = d.getDate().toString().padStart(2, '0');
      const month = (d.getMonth() + 1).toString().padStart(2, '0');
      const year = d.getFullYear();
      return `${day}/${month}/${year}`;
    };
  
    // Crear objeto infoLeave con datos comunes y un array de leavePeriods formateados
    const infoLeave = {
      name: dataUserLeave.firstName + ' ' + dataUserLeave.lastName,
      dni: dataUserLeave.dni,
      leavePeriods: allOpenLeavePeriods.map(lp => ({
        startLeaveDate: formatDate(lp.startLeaveDate),
        expectedEndLeaveDate: formatDate(lp.expectedEndLeaveDate),
        reason: (() => {
          const leaveEnum = enums.leavetype.find(e => e._id.toString() === lp.leaveType.toString());
          return leaveEnum ? leaveEnum.name : '';
        })()
      }))
    };
  
    // Actualizar estado para mostrar el modal con infoLeave
    setInfoLeaveData(infoLeave);
    setShowInfoModal(true);
  };
  

  return (
    <>
      {/* Mapeamos cada hiringPeriod en su propia tabla */}
      {hiringsEditing.map((hiringPeriod, i) => {
        if (!hiringPeriod.active) return null; // No mostrar si no está activo

        return (
          <div key={hiringPeriod._id} className={(!!hiringPeriod.reason.replacement) ? styles.tableResponsiveReason : styles.tableResponsive}>
            {!!hiringPeriod.reason.replacement &&
              <h3>
                Periodo de sustitución{" "}
                <button onClick={() => chargeInfoLeave(hiringPeriod.reason.user)}>
                  Información sustitución
                </button>
              </h3>
            }
            <table className={styles.myTable}>
              <thead>
                <tr>
                  <th>Inicio</th>
                  <th>Fin</th>
                  <th>Dispositivo</th>
                  <th>Jornada</th>
                  <th>Puesto</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  {/* INICIO */}
                  <td data-label="Inicio">
                    <input
                      type="date"
                      id={`${i}-${hiringPeriod._id}-startDate`}
                      value={
                        hiringPeriod.startDate
                          ? new Date(hiringPeriod.startDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={handleChange}
                      disabled={isEditing !== hiringPeriod._id}
                    />
                    {errores[`${hiringPeriod._id}-fechaInicio`] && (
                      <span className="errorSpan">
                        {errores[`${hiringPeriod._id}-fechaInicio`]}
                      </span>
                    )}
                  </td>

                  {/* FIN */}
                  <td data-label="Fin">
                    <input
                      type="date"
                      id={`${i}-${hiringPeriod._id}-endDate`}
                      value={
                        hiringPeriod.endDate
                          ? new Date(hiringPeriod.endDate).toISOString().split('T')[0]
                          : ''
                      }
                      onChange={handleChange}
                      disabled={isEditing !== hiringPeriod._id}
                    />
                    {errores[`${hiringPeriod._id}-endDate`] && (
                      <span className="errorSpan">
                        {errores[`${hiringPeriod._id}-endDate`]}
                      </span>
                    )}
                  </td>

                  {/* DISPOSITIVO */}
                  <td data-label="Dispositivo">
                    <select
                      id={`${i}-${hiringPeriod._id}-device`}
                      value={hiringPeriod.device}
                      onChange={handleChange}
                      disabled={isEditing !== hiringPeriod._id}
                    >
                      <option>Selecciona una opción</option>
                      {enums['programs']?.map(program => (
                        <optgroup key={program._id} label={program.name}>
                          {program.devices.map(dev => (
                            <option key={dev._id} value={dev._id}>
                              {dev.name}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </td>

                  {/* JORNADA */}
                  <td data-label="Jornada">
                    <select
                      id={`${i}-${hiringPeriod._id}-workShift.type`}
                      value={hiringPeriod.workShift.type}
                      onChange={handleChange}
                      disabled={isEditing !== hiringPeriod._id}
                    >
                      <option>Selecciona una opción</option>
                      <option value="completa">Completa</option>
                      <option value="parcial">Parcial</option>
                    </select>
                  </td>

                  {/* PUESTO */}
                  <td data-label="Puesto">
                    <select
                      id={`${i}-${hiringPeriod._id}-position`}
                      value={hiringPeriod.position}
                      onChange={handleChange}
                      disabled={isEditing !== hiringPeriod._id}
                    >
                      <option>Selecciona una opción</option>
                      {enums['jobs']?.map((job) => {
                        if (job.subcategories) {
                          return (
                            <optgroup key={job._id} label={job.name}>
                              {job.subcategories.map((sub) => (
                                <option key={sub._id} value={sub._id}>
                                  {sub.name}
                                </option>
                              ))}
                            </optgroup>
                          );
                        }
                        return (
                          <option key={job._id} value={job._id}>
                            {job.name}
                          </option>
                        );
                      })}
                    </select>
                  </td>

                  {/* ACCIONES */}
                  <td data-label="Acciones">
                    <FaPlusSquare
                      style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                      onClick={() => setButtonCreateLeave(hiringPeriod._id)}
                    />
                    {isEditing === hiringPeriod._id ? (
                      <>
                        <MdEditOff
                          style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                          onClick={editCancel}
                        />
                        <FaSave
                          style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                          onClick={saveAndReset}
                        />
                      </>
                    ) : (
                      <FaEdit
                        style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                        onClick={() => editHiring(hiringPeriod._id)}
                      />
                    )}
                    <FaTrashAlt
                      style={{ cursor: 'pointer' }}
                      onClick={() =>
                        setShowConfirmModal(`${i}-${hiringPeriod._id}-active`)
                      }
                    />
                  </td>
                </tr>

                {/* LeavePeriods activos */}
                {hiringPeriod.leavePeriods &&
                  hiringPeriod.leavePeriods.filter((lp) => lp.active).length > 0 && (
                    <tr>
                      <td colSpan={6}>
                        <LeavePeriods
                          leavePeriods={hiringPeriod.leavePeriods}
                          handleChange={handleChange}
                          isEditing={isEditing}
                          hiringPeriodId={hiringPeriod._id}
                          saveAndReset={saveAndReset}
                          editCancel={editCancel}
                          editHiring={(x) => editHiring(x)}
                          enums={enums}
                          positionHiring={i}
                          deleteHirindorLeave={(x) => setShowConfirmModal(x)}
                        />
                      </td>
                    </tr>
                  )}
              </tbody>
            </table>
          </div>
        );
      })}

      {errores && <p style={{ color: 'red' }}>{errores}</p>}
      {showConfirmModal && modalConfirmation()}
      {buttonCreateLeave && (
        <LeavePeriodNew
          enumsData={enums}
          saveHiring={(leave, type) => saveHiring(leave, type)}
          close={() => setButtonCreateLeave(false)}
          idHiring={buttonCreateLeave}
        />
      )}

      {/* Modal para mostrar infoLeave en modo solo lectura */}
      {showInfoModal && infoLeaveData && (
        <ModalForm
          title="Información"
          message="Datos del periodo de baja/excedencia"
          fields={
            infoLeaveData.leavePeriods && infoLeaveData.leavePeriods.length > 0
              ? [
                  {
                    name: "name",
                    label: "Nombre",
                    defaultValue: infoLeaveData.name,
                    disabled: true
                  },
                  {
                    name: "dni",
                    label: "DNI",
                    defaultValue: infoLeaveData.dni,
                    disabled: true
                  },
                  // Por cada leavePeriod, se crea una sección y campos individuales
                  ...infoLeaveData.leavePeriods.flatMap((lp, index) => [
                    { name: `section-${index}`, label: `Periodo de baja/excedencia ${index + 1}`, type: "section" },
                    { name: `startLeaveDate-${index}`, label: "Inicio", defaultValue: lp.startLeaveDate, disabled: true },
                    { name: `expectedEndLeaveDate-${index}`, label: "Fin Previsto", defaultValue: lp.expectedEndLeaveDate, disabled: true },
                    { name: `reason-${index}`, label: "Motivo", defaultValue: lp.reason, disabled: true }
                  ])
                ]
              : [
                  {
                    name: "name",
                    label: "Nombre",
                    defaultValue: infoLeaveData.name,
                    disabled: true
                  },
                  {
                    name: "dni",
                    label: "DNI",
                    defaultValue: infoLeaveData.dni,
                    disabled: true
                  },
                  {
                    name: "mensaje",
                    label: "Información",
                    defaultValue: "No hay datos del periodo de baja o excedencia",
                    disabled: true
                  }
                ]
          }
          onSubmit={() => setShowInfoModal(false)}
          onClose={() => setShowInfoModal(false)}
        />
      )}

    </>
  );
};

export default HiringList;
