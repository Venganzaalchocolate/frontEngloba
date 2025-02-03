import React, { useEffect, useState } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaTrashAlt, FaEdit, FaPlusSquare, FaSave } from "react-icons/fa";
import { MdEditOff } from "react-icons/md";
import { deepClone } from '../../lib/utils';
import LeavePeriods from './LeavePeriods';
import LeavePeriodNew from './LeavePeriodNew';
import ModalConfirmation from '../globals/ModalConfirmation';

const HiringList = ({ hirings, enums, saveHiring }) => {
  const [isEditing, setIsEditing] = useState(null); // Controla si estamos en modo de edición
  const [errores, setErrores] = useState('');
  const [hiringsEditing, setHiringsEditing] = useState([])
  const [buttonCreateLeave, setButtonCreateLeave] = useState(false)
  // =========== CONFIRMACIÓN MODAL ===========
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleDelete = () => {
    setShowConfirmModal(true);
  };

  const onConfirm = () => {
    //FUNCION QUE LLAMA A LA BBDD Y REALIZA EL DELETE
    deleteHirindorLeave(showConfirmModal)
    setShowConfirmModal(false);
  };

  const onCancel = () => {
    // Cancelar la acción
    setShowConfirmModal(false);
  };
  // ============================================
  const modalConfirmation = () => {
    const type = (showConfirmModal.split('-')[2] == 'leavePeriods') ? 'excedencia' : 'contratación'
    const title = `Eliminar periodo de ${type}`
    const messageAux = `¿Estás seguro de que deseas eliminar este periodo de ${type}?`
    return (
      <ModalConfirmation
        title={title}
        message={messageAux}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
  }

  useEffect(() => {
    hirings.sort((a, b) => new Date(b.startDate) - new Date(a.startDate));
    setHiringsEditing(hirings)
  }, [hirings])

  const saveAndReset = () => {
    setIsEditing(null)
    saveHiring(hiringsEditing, 'put')
  }

  const handleChange = (e) => {
    let value = e.target.value;
    // necesitamos cambiar las fechas a isoString para poder procesarlas con los inputs
    if (e.target.type === "date") value = new Date(value).toISOString();
    // el id lo convertimos en array para poder coger los indices necesarios
    const dataAuxPosition = e.target.id.split('-');
    let dataAux = deepClone(hiringsEditing);

    if (dataAuxPosition[2] === 'leavePeriods') {
      const leaveIndex = dataAuxPosition[3];
      const field = dataAuxPosition[4];
      // el id de los campos tiene las posición del objeto para poderlo modificar, tanto los periodos de contratación como las bajas
      const leavePeriod = dataAux[dataAuxPosition[0]][dataAuxPosition[2]][leaveIndex];

      if (field === 'startLeaveDate') {
        // Validar si las fechas de fin son anteriores a la nueva fecha de inicio
        const expectedEndLeaveDate = leavePeriod.expectedEndLeaveDate ? new Date(leavePeriod.expectedEndLeaveDate) : null;
        const actualEndLeaveDate = leavePeriod.actualEndLeaveDate ? new Date(leavePeriod.actualEndLeaveDate) : null;

        if (expectedEndLeaveDate && expectedEndLeaveDate < new Date(value)) {
          setErrores("La fecha de fin prevista debe ser posterior a la fecha de inicio.");
        } else {
          setErrores('');
        }

        if (actualEndLeaveDate && actualEndLeaveDate < new Date(value)) {
          setErrores("La fecha de fin prevista debe ser posterior a la fecha de inicio.");
        } else {
          setErrores('');
        }
      }

      // Actualizar el valor en el estado
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]][leaveIndex][field] = value;
    } else {
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]] = value;

    }
    setHiringsEditing(dataAux);
  };


  const editCancel = () => {
    setIsEditing(false)
    setHiringsEditing(hirings)
  }

  const editHiring = (id) => {
    setHiringsEditing(hirings)
    setIsEditing(id)
  }


  const deleteHirindorLeave = (id) => {
    let value = false;
    const dataAuxPosition = id.split('-');
    let dataAux = deepClone(hiringsEditing);
    if (dataAuxPosition[2] === 'leavePeriods') {
      const leaveIndex = dataAuxPosition[3];
      const field = dataAuxPosition[4];
      // Actualizar el valor en el estado
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]][leaveIndex][field] = value;
    } else {
      dataAux[dataAuxPosition[0]][dataAuxPosition[2]] = value;

    }
    saveHiring(dataAux, 'put')
  }

  return (
    <>
      {/* Mapeamos cada hiringPeriod en su propia tabla */}
      {hiringsEditing.map((hiringPeriod, i) => {
        if (!hiringPeriod.active) return null; // Si el periodo no está activo, no lo mostramos

        return (
          <div key={hiringPeriod._id} className={styles.tableResponsive}>
            {/* Título o identificador si quieres */}
            {/* <h3>Contratación {i+1}</h3> */}

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
                      {enums['programs']?.map(program => {
                        return (
                          <optgroup key={program._id} label={program.name}>
                            {program.devices.map(dev => {
                              return (
                                <option key={dev._id} value={dev._id}>
                                  {dev.name}
                                </option>
                              )
                            })}
                          </optgroup>
                        )
                      })}

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
                              {job.subcategories.map((sub) => {
                                // en este apartado aun que hiringPeriod.position==sub._id no me muestra el nombre correctamente, ¿porque?
                                return (
                                  <option key={sub._id} value={sub._id}>
                                    {sub.name}
                                  </option>
                                )
                              })}
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

                {/* Form nuevo LeavePeriod, si se pulsa el botón + */}
                
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

      {/* Mensaje de errores globales */}
      {errores && <p style={{ color: 'red' }}>{errores}</p>}
      {/* Modal confirmación */}
      {showConfirmModal && modalConfirmation()}

      {buttonCreateLeave && (
                      <LeavePeriodNew
                        enumsData={enums}
                        saveHiring={(leave, type) => saveHiring(leave, type)}
                        close={() => setButtonCreateLeave(false)}
                        idHiring={buttonCreateLeave}
                      />
                )}

    </>
  );
};

export default HiringList;