import React, { useEffect, useState } from 'react';
import { FaSave } from "react-icons/fa";
import { MdEditOff } from "react-icons/md";
import styles from '../styles/hiringperiods.module.css';
import { getDataEmployer } from '../../lib/data';

const LeavePeriodNew = ({ enumsData = null, saveHiring = null, close, idHiring }) => {
    const [enums, setEnums] = useState({});
    const [leaveNew, setLeaveNew] = useState({
        idHiring: idHiring,
        leaveNew: {
            leaveType: null,
            startLeaveDate: null,
            expectedEndLeaveDate: null,
            actualEndLeaveDate: null,
            active:true,
        }
    });
    const [errors, setErrors] = useState({});

    const chargeData = async () => {
        const dataEnum = await getDataEmployer();
        setEnums(dataEnum);
    };

    useEffect(() => {
        if (enumsData) {
            setEnums(enumsData);
        } else {
            chargeData();
        }
    }, [enumsData]);

    const handleChange = (e) => {
        const { id, value } = e.target;

        // Actualiza los valores anidados dentro de leaveNew.leaveNew
        setLeaveNew((prev) => ({
            ...prev,
            leaveNew: {
                ...prev.leaveNew,
                [id]: value
            }
        }));
    };

    const validateForm = () => {
        const errors = {};

        if (!leaveNew.leaveNew.leaveType) errors['leaveType'] = "Debe seleccionar un tipo de excedencia.";
        if (!leaveNew.leaveNew.startLeaveDate) errors['startLeaveDate'] = "La fecha de inicio es obligatoria.";
        if (
            leaveNew.leaveNew.startLeaveDate &&
            leaveNew.leaveNew.expectedEndLeaveDate &&
            new Date(leaveNew.leaveNew.startLeaveDate) > new Date(leaveNew.leaveNew.expectedEndLeaveDate)
        ) {
            errors['expectedEndLeaveDate'] = "La fecha de fin prevista debe ser posterior a la fecha de inicio.";
        }

        setErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const saveAndReset = (data, type) => {
        if (!validateForm()) return;
        if (saveHiring != null) {
            saveHiring(data, type);
        }
        // Resetea el formulario
        setLeaveNew({
            idHiring: idHiring,
            leaveNew: {
                leaveType: null,
                startLeaveDate: null,
                expectedEndLeaveDate: null,
                actualEndLeaveDate: null,
                active:true
            }
        });
        setErrors({});
    };

    return (
        <div className={styles.cajaperiodoNuevoCabeceraLeaves}>
            <h3>Añadir Período de Excedencia</h3>
            <div className={styles.cajaperiodo}>
                <div className={styles.periodo}>
                    <div className={styles.fechainicio}>
                        <label htmlFor='startLeaveDate'>Fecha de Inicio</label>
                        <input
                            type="date"
                            id="startLeaveDate"
                            name="startLeaveDate"
                            value={leaveNew.leaveNew.startLeaveDate || ''}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.fechainicio}>
                        <label htmlFor='expectedEndLeaveDate'>Fecha de Fin Prevista</label>
                        <input
                            type="date"
                            id="expectedEndLeaveDate"
                            name="expectedEndLeaveDate"
                            value={leaveNew.leaveNew.expectedEndLeaveDate || ''}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.fechainicio}>
                        <label htmlFor='actualEndLeaveDate'>Fecha de Fin Real</label>
                        <input
                            type="date"
                            id="actualEndLeaveDate"
                            name="actualEndLeaveDate"
                            value={leaveNew.leaveNew.actualEndLeaveDate || ''}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.excedencia}>
                        <label htmlFor='leaveType'>Tipo de Excedencia</label>
                        <select
                            id="leaveType"
                            name="leaveType"
                            value={leaveNew.leaveNew.leaveType || ''}
                            onChange={handleChange}
                        >
                            <option value="">Selecciona una opción</option>
                            {!!enums.leavetype && enums.leavetype.map((type) => (
                                <option key={type._id} value={type._id}>
                                    {type.name}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>
                <div className={styles.buttonsContainer}>
                    <button onClick={()=>saveAndReset(leaveNew, 'createLeave')}>Guardar</button>
                    <button className='tomato' onClick={close}>Cancelar</button>
                </div>
                <div className={styles.errorsContainer}>
                    {Object.keys(errors).map((key) => (
                        <div key={key} className="errorSpan">
                            {errors[key]}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default LeavePeriodNew;

