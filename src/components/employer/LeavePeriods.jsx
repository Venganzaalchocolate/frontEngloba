import { useEffect, useState } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaTrashAlt, FaEdit, FaPlusSquare, FaSave } from "react-icons/fa";
import { MdEditOff } from "react-icons/md";
import { deepClone } from '../../lib/utils';
import LeavePeriodNew from './LeavePeriodNew';

const LeavePeriods=({leavePeriods, handleChange, isEditing, hiringPeriodId, saveAndReset, editCancel, editHiring, positionHiring, enums, deleteHirindorLeave})=>{
        return (
            <div className={styles.leaves}>
            <div className={styles.cajaleaveCabecera}>
                <div className={styles.periodo}>
                    <div className={styles.fechainicio}>Inicio</div>
                    <div className={styles.fechainicio}>Prevista</div>
                    <div className={styles.fechainicio}>Fin</div>
                    <div className={styles.posicion}>Descripción</div>
                    
                </div>
            </div>
            
            
            {leavePeriods.map((period, ip, a) => {
                if(period.active){
                return <div className={styles.leave}>
                    <div className={styles.fechainicio}>
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
                            disabled={(isEditing == period._id) ? false : true}
                        />
                        
                    </div>
                    <div className={styles.fechainicio}>
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
                            disabled={(isEditing == period._id) ? false : true}
                        />
                       

                    </div>
                    <div className={styles.fechainicio}>
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
                            disabled={(isEditing == period._id) ? false : true}
                        />
                        

                    </div>
                    <div className={styles.posicion}>
                        <select
                            id={`${positionHiring}-${hiringPeriodId}-leavePeriods-${ip}-leaveType`}
                            name={`${hiringPeriodId}-leavePeriods-${ip}-leaveType`}
                            disabled={(isEditing == period._id) ? false : true}
                            value={period.leaveType}
                            onChange={handleChange}
                        >
                            <option>Selecciona una opción</option>
                            {!!enums['leavetype'] && enums['leavetype'].map((x) => {
                               
                                return <option value={x._id} selected={(x._id == period.leaveType) ? true : false}>{x.name}</option>
                            })}
                        </select>
                    </div>

                    <div className={styles.iconos}>
                        {(isEditing == period._id) ? <>
                            <MdEditOff onClick={() => editCancel()} />
                            <FaSave onClick={() => saveAndReset()}></FaSave>
                        </>
                            : <FaEdit onClick={() => editHiring(period._id)}></FaEdit>}
                        <FaTrashAlt onClick={() => deleteHirindorLeave(`${positionHiring}-${hiringPeriodId}-leavePeriods-${ip}-active`)}></FaTrashAlt>
                    </div>
                </div>
                }
            })}
        </div>
        )

}

export default LeavePeriods;