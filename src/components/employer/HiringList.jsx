import { useEffect, useState } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaTrashAlt, FaEdit, FaPlusSquare, FaSave } from "react-icons/fa";
import { MdEditOff } from "react-icons/md";
import { deepClone } from '../../lib/utils';

const HiringList = ({ hirings, enums, saveHiring}) => {
    const [isEditing, setIsEditing] = useState(false); // Controla si estamos en modo de edición
    const [errores, setErrores] = useState({});
    const [hiringsEditing, setHiringsEditing]=useState([])

    useEffect(()=>{
        setHiringsEditing(hirings)
    },[])

    const handleChange=(e)=>{
        let value=e.target.value
        if(e.target.type === "date") value=new Date(value).toISOString();
        console.log(value)
        const dataAuxPosition=e.target.id.split('-')
        let dataAux=deepClone(hiringsEditing)
        dataAux[dataAuxPosition[0]][dataAuxPosition[2]]=value
        setHiringsEditing(dataAux)
    }
    
    const editCancel=()=>{
        setIsEditing(false)
        setHiringsEditing(hirings)
    }

    const editHiring=(id)=>{
        setHiringsEditing(hirings)
        setIsEditing(id)
    }


    
    return (
        <div className={styles.listaperiodos}>
            <div className={styles.cajaperiodoCabecera}>
                    <div className={styles.periodo}>
                        <div className={styles.fechainicio}>Inicio</div>
                        <div className={styles.fechafin}>Fin</div>
                        <div className={styles.dispositivo}>Dispositivo</div>
                        <div className={styles.jornada}>Jornada</div>  
                        <div className={styles.posicion}>Puesto</div> 
                    </div>
            </div>
            {hiringsEditing.map((hiringPeriod, i, a)=>{
                return <div className={styles.cajaperiodo}>
                    <div className={styles.periodo}>
                        <div className={styles.fechainicio}>
                            <input
                                type="date"
                                id={`${i}-${hiringPeriod._id}-startDate`}
                                name={`${hiringPeriod._id}-startDate`}
                                value={
                                    hiringPeriod.startDate 
                                        ? new Date(hiringPeriod.startDate).toISOString().split('T')[0] 
                                        : ''
                                }
                                onChange={handleChange}
                                disabled={(isEditing==hiringPeriod._id)?false:true}
                            />
                            {errores[`${hiringPeriod._id}fechaInicio`] && <span className="errorSpan">{errores[`${hiringPeriod._id}fechaInicio`]}</span>}
                        </div>
                        <div className={styles.fechainicio}>
                            <input
                                type="date"
                                id={`${i}-${hiringPeriod._id}-endDate`}
                                name={`${hiringPeriod._id}-endDate`}
                                value={
                                    hiringPeriod.endDate 
                                        ? new Date(hiringPeriod.endDate).toISOString().split('T')[0] 
                                        : ''
                                }
                                onChange={handleChange}
                                disabled={(isEditing==hiringPeriod._id)?false:true}
                            />
                            {errores[`${hiringPeriod._id}-endDate`] && <span className="errorSpan">{errores[`${hiringPeriod._id}-endDate`]}</span>}
                        </div>
                        
                        <div className={styles.dispositivo}>{hiringPeriod.device.name}</div>
                        <div className={styles.jornada}>{hiringPeriod.workShift.type}</div>   
                        <div className={styles.posicion}>{hiringPeriod.position.name}</div>
                        <div className={styles.iconos}>
                            {(isEditing==hiringPeriod._id)?<>
                            <MdEditOff onClick={()=>editCancel()}/>
                            <FaSave onClick={()=>saveHiring(hiringsEditing, 'put')}></FaSave>
                            </>
                            
                            
                            :<FaEdit onClick={()=>editHiring(hiringPeriod._id)}></FaEdit>}
                            <FaTrashAlt></FaTrashAlt>
                        </div>
                    </div>
                    {!!hiringPeriod.leavePeriods && hiringPeriod.leavePeriods.length>0 &&
                        <div className={styles.leaves}>
                            <div className={styles.cajaleaveCabecera}>
                                    <div className={styles.periodo}>
                                        <div className={styles.fechainicio}>Inicio</div>
                                        <div className={styles.fechainicio}>Prevista</div>
                                        <div className={styles.fechainicio}>Fin</div>
                                        <div className={styles.posicion}>Descripción</div>  
                                        <div className={styles.iconos}>
                                        <FaPlusSquare></FaPlusSquare>
                                        </div>
                                    </div>
                            </div>
                            {hiringPeriod.leavePeriods.map((period)=>{
                                return <div className={styles.leave}>
                                            <div className={styles.fechainicio}>{new Date(period.startLeaveDate).toLocaleDateString('es-ES')}</div>
                                            <div className={styles.fechainicio}>{(period.expectedEndLeaveDate)?new Date(period.expectedEndLeaveDate).toLocaleDateString('es-ES'):''}</div>
                                            <div className={styles.fechainicio}>{(period.actualEndLeaveDate)?new Date(period.actualEndLeaveDate).toLocaleDateString('es-ES'):''}</div>
                                            <div className={styles.posicion}>{period.leaveType.name}</div>
                                            <div className={styles.iconos}>
                                                <FaEdit></FaEdit>
                                                <FaTrashAlt></FaTrashAlt>
                                            </div>
                                    </div>
                            })}
                        </div>                  
                    }
                    <div>

                    </div>
                </div>
            })}
        </div>
    );
};

export default HiringList;
