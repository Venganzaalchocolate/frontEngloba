import React, { useState } from 'react';
import { FaTrashAlt, FaEdit } from 'react-icons/fa';
import styles from '../styles/hiringperiods.module.css';
import LeavePeriodEdit from './LeavePeriodEdit';

const LeavePeriods = ({
  leavePeriods = [],
  enums,
  positionHiring,
  hiringPeriodId,      // <-- Se recibe del padre para saber cuál hiringPeriod es
  deleteHirindorLeave,
  onUpdateLeavePeriod, // <-- Función del padre => saveHiring(...)
}) => {
  const [leavePeriodToEdit, setLeavePeriodToEdit] = useState(null);

  // Al pulsar "Editar" en un periodo
  const handleEditClick = (period) => {
    setLeavePeriodToEdit(period);
  };

  // Cierra el modal
  const handleCloseModal = () => {
    setLeavePeriodToEdit(null);
  };

  // Guardar cambios: se llama al pulsar "Guardar" dentro del modal
  const handleSave = (updatedLeave) => {
    // IMPORTANTE: agregamos la info del hiringPeriod actual
    updatedLeave.hiringPeriodId = hiringPeriodId;

    // Llamamos a onUpdateLeavePeriod con type="updateLeave"
    onUpdateLeavePeriod(updatedLeave, 'updateLeave');
    setLeavePeriodToEdit(null);
  };

  // Función para mostrar fecha en modo lectura
  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div className={styles.leaveTableWrapper}>
      <h3>BAJAS O EXCEDENCIAS</h3>
      <div className={styles.myLeaveTable}>
        <div className={styles.myLeaveTableHeader}>
          <div className={styles.myLeaveTableCell}>Inicio</div>
          <div className={styles.myLeaveTableCell}>Prevista</div>
          <div className={styles.myLeaveTableCell}>Fin</div>
          <div className={styles.myLeaveTableCell}>Descripción</div>
          <div className={styles.myLeaveTableCell}></div>
        </div>

        <div className={styles.myLeaveTableBody}>
          {leavePeriods.map((period, ip) => {
            if (!period.active) return null; // solo mostrar los LeavePeriods activos

            const start = formatDate(period.startLeaveDate);
            const expEnd = formatDate(period.expectedEndLeaveDate);
            const actualEnd = formatDate(period.actualEndLeaveDate);

            // Buscamos el nombre del tipo de baja/excedencia
            let leaveName = 'No especificado';
            if (enums.leavetype) {
              const foundType = enums.leavetype.find((lt) => lt._id === period.leaveType);
              if (foundType) leaveName = foundType.name;
            }

            return (
              <div className={styles.myLeaveTableRow} key={period._id}>
                <div className={styles.myLeaveTableCell} data-label="Inicio">
                  {start}
                </div>
                <div className={styles.myLeaveTableCell} data-label="Prevista">
                  {expEnd}
                </div>
                <div className={styles.myLeaveTableCell} data-label="Fin">
                  {actualEnd}
                </div>
                <div className={styles.myLeaveTableCell} data-label="Descripción">
                  {leaveName}
                </div>
                <div className={styles.myLeaveTableCell} data-label="Acciones">
                  <div className={styles.cajaAcciones}>
                    {/* Botón "Editar" */}
                    <FaEdit
                      style={{ cursor: 'pointer', marginRight: '0.5rem' }}
                      title="Editar este periodo"
                      onClick={() => handleEditClick(period)}
                    />
                    {/* Botón "Eliminar" */}
                    <FaTrashAlt
                      style={{ cursor: 'pointer' }}
                      title="Eliminar este periodo"
                      onClick={() =>
                        deleteHirindorLeave(
                          `${positionHiring}-${hiringPeriodId}-leavePeriods-${ip}-active`
                        )
                      }
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal de edición (sólo se muestra si leavePeriodToEdit tiene datos) */}
      {leavePeriodToEdit && (
        <LeavePeriodEdit
          leavePeriod={leavePeriodToEdit}
          enums={enums}
          onClose={handleCloseModal}
          onSave={handleSave}
        />
      )}
    </div>
  );
};

export default LeavePeriods;
