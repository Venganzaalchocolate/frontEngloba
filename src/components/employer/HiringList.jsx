import { useEffect, useState } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaTrashAlt, FaEdit, FaPlusSquare, FaSave } from "react-icons/fa";
import { MdEditOff } from "react-icons/md";
import { deepClone } from '../../lib/utils';
import LeavePeriods from './LeavePeriods';
import LeavePeriodNew from './LeavePeriodNew';
import ModalConfirmation from '../globals/ModalConfirmation';

const  HiringList = ({ hirings, enums, saveHiring }) => {
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
    const modalConfirmation=()=>{
        const type=(showConfirmModal.split('-')[2]=='leavePeriods')?'excedencia':'contratación'
        const title=`Eliminar periodo de ${type}`
        const messageAux=`¿Estás seguro de que deseas eliminar este periodo de ${type}?`
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


    const deleteHirindorLeave=(id)=>{
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
            {hiringsEditing
                .map((hiringPeriod, i, a) => {
                    if (hiringPeriod.active) {
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
                                        disabled={(isEditing == hiringPeriod._id) ? false : true}
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
                                        disabled={(isEditing == hiringPeriod._id) ? false : true}
                                    />
                                    {errores[`${hiringPeriod._id}-endDate`] && <span className="errorSpan">{errores[`${hiringPeriod._id}-endDate`]}</span>}
                                </div>

                                <div className={styles.dispositivo}>
                                    <select
                                        id={`${i}-${hiringPeriod._id}-device`}
                                        name={`${hiringPeriod._id}-device`}
                                        disabled={(isEditing == hiringPeriod._id) ? false : true}
                                        value={hiringPeriod.device}
                                        onChange={handleChange}
                                    >
                                        <option>Selecciona una opción</option>
                                        {!!enums['programs'] && enums['programs'].map((x) => {
                                            return <optgroup label={x.name}>
                                                {x.devices.map((x) => {
                                                    return <option value={x._id} selected={(x._id == hiringPeriod.device) ? true : false}>{x.name}</option>
                                                })}
                                            </optgroup>
                                        })}
                                    </select>
                                </div>
                                <div className={styles.jornada}>
                                    <select
                                        id={`${i}-${hiringPeriod._id}-workShift.type`}
                                        name={`${hiringPeriod._id}-workShift.type`}
                                        disabled={(isEditing == hiringPeriod._id) ? false : true}
                                        value={hiringPeriod.workShift.type}
                                        onChange={handleChange}
                                    >
                                        <option>Selecciona una opción</option>
                                        <option value={'completa'} selected={('completa' == hiringPeriod.workShift.type) ? true : false}>Completa</option>
                                        <option value={'parcial'} selected={('parcial' == hiringPeriod.workShift.type) ? true : false}>Parcial</option>
                                    </select>
                                </div>

                                <div className={styles.posicion}>
                                    <select
                                        id={`${i}-${hiringPeriod._id}-position`}
                                        name={`${hiringPeriod._id}-position`}
                                        disabled={(isEditing == hiringPeriod._id) ? false : true}
                                        value={hiringPeriod.position}
                                        onChange={handleChange}
                                    >
                                        <option>Selecciona una opción</option>
                                        {!!enums['jobs'] && enums['jobs'].map((x) => {

                                            if (!!x.subcategories) {
                                                return <optgroup label={x.name}>
                                                    {x['subcategories'].map((x) => {
                                                        return <option value={x._id} selected={(x._id == hiringPeriod.position) ? true : false}>{x.name}</option>
                                                    })}
                                                </optgroup>
                                            } else {
                                                return <option value={x._id}>{x.name}</option>
                                            }


                                        })}
                                    </select>
                                </div>
                                <div className={styles.iconos}>
                                    <FaPlusSquare onClick={() => setButtonCreateLeave(hiringPeriod._id)}></FaPlusSquare>
                                    {(isEditing == hiringPeriod._id) ? <>
                                        <MdEditOff onClick={() => editCancel()} />
                                        <FaSave onClick={() => saveAndReset()}></FaSave>
                                    </>
                                        : <FaEdit onClick={() => editHiring(hiringPeriod._id)}></FaEdit>}
                                    <FaTrashAlt onClick={()=>setShowConfirmModal(`${i}-${hiringPeriod._id}-active`)}></FaTrashAlt>
                                </div>
                            </div>
                            {buttonCreateLeave && buttonCreateLeave == hiringPeriod._id &&
                            <LeavePeriodNew 
                                enumsData={enums} 
                                saveHiring={(leave, type) => saveHiring(leave, type)} 
                                close={() => setButtonCreateLeave(false)} 
                                idHiring={hiringPeriod._id} 
                            />
                            }

                            {!!hiringPeriod.leavePeriods &&  hiringPeriod.leavePeriods.filter(lp => lp.active).length > 0 && 
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
                                    deleteHirindorLeave={(x)=>setShowConfirmModal(x)}
                                />
                            }

                            <div>

                            </div>
                        </div>
                    }

                })}
        </div>
        {showConfirmModal && modalConfirmation()}
        </>
        
    );
};

export default HiringList;
