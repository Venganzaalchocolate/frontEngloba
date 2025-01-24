import React from 'react';
import { FaTrashAlt, FaEdit, FaSave } from 'react-icons/fa';
import { MdEditOff } from 'react-icons/md';
// Importa tus estilos y variables
import styles from '../styles/hiringperiods.module.css';

const LeavePeriods = ({
  leavePeriods,
  handleChange,
  isEditing,
  hiringPeriodId,
  saveAndReset,
  editCancel,
  editHiring,
  positionHiring,
  enums,
  deleteHirindorLeave
}) => {
  return (
    <div className={styles.leaveTableWrapper}>
        <h3>BAJAS O EXCEDENCIAS</h3>
      {/* Envolver la tabla en un div si quieres controlar overflow o estilos */}
      <table className={styles.myLeaveTable}>
        <thead>
          <tr>
            <th>Inicio</th>
            <th>Prevista</th>
            <th>Fin</th>
            <th>Descripción</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {leavePeriods.map((period, ip) => {
            if (!period.active) return null; // Sólo renderiza si está activo

            return (
              <tr key={period._id}>
                {/* INICIO */}
                <td data-label="Inicio">
                  <input
                    type="date"
                    id={`${positionHiring}-${hiringPeriodId}-leavePeriods-${ip}-startLeaveDate`}
                    name={`${hiringPeriodId}-leavePeriods-${ip}-startLeaveDate`}
                    value={
                      period.startLeaveDate
                        ? new Date(period.startLeaveDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={handleChange}
                    disabled={isEditing !== period._id}
                  />
                </td>

                {/* PREVISTA */}
                <td data-label="Prevista">
                  <input
                    type="date"
                    id={`${positionHiring}-${hiringPeriodId}-leavePeriods-${ip}-expectedEndLeaveDate`}
                    name={`${hiringPeriodId}-leavePeriods-${ip}-expectedEndLeaveDate`}
                    value={
                      period.expectedEndLeaveDate
                        ? new Date(period.expectedEndLeaveDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={handleChange}
                    disabled={isEditing !== period._id}
                  />
                </td>

                {/* FIN */}
                <td data-label="Fin">
                  <input
                    type="date"
                    id={`${positionHiring}-${hiringPeriodId}-leavePeriods-${ip}-actualEndLeaveDate`}
                    name={`${hiringPeriodId}-leavePeriods-${ip}-actualEndLeaveDate`}
                    value={
                      period.actualEndLeaveDate
                        ? new Date(period.actualEndLeaveDate).toISOString().split('T')[0]
                        : ''
                    }
                    onChange={handleChange}
                    disabled={isEditing !== period._id}
                  />
                </td>

                {/* DESCRIPCIÓN (tipo de excedencia) */}
                <td data-label="Descripción">
                  <select
                    id={`${positionHiring}-${hiringPeriodId}-leavePeriods-${ip}-leaveType`}
                    name={`${hiringPeriodId}-leavePeriods-${ip}-leaveType`}
                    value={period.leaveType}
                    onChange={handleChange}
                    disabled={isEditing !== period._id}
                  >
                    <option>Selecciona una opción</option>
                    {!!enums['leavetype'] &&
                      enums['leavetype'].map((x) => (
                        <option
                          key={x._id}
                          value={x._id}
                          // `selected` ya no es necesario si usas `value` en React
                        >
                          {x.name}
                        </option>
                      ))}
                  </select>
                </td>

                {/* ACCIONES */}
                <td data-label="Acciones">
                  {isEditing === period._id ? (
                    <>
                      <MdEditOff
                        style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                        onClick={editCancel}
                      />
                      <FaSave
                        style={{ cursor: 'pointer' }}
                        onClick={saveAndReset}
                      />
                    </>
                  ) : (
                    <FaEdit
                      style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                      onClick={() => editHiring(period._id)}
                    />
                  )}
                  <FaTrashAlt
                    style={{ cursor: 'pointer', marginLeft: '0.5rem' }}
                    onClick={() =>
                      deleteHirindorLeave(
                        `${positionHiring}-${hiringPeriodId}-leavePeriods-${ip}-active`
                      )
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

export default LeavePeriods;
