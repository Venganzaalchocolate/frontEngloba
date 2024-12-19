import React, { useEffect, useState } from 'react';
import { FaSave } from "react-icons/fa";
import { MdEditOff } from "react-icons/md";
import styles from '../styles/hiringperiods.module.css';
import { getDataEmployer } from '../../lib/data';

const HiringPeriodNew = ({ enumsData = null, save = null, close }) => {
    const [enums, setEnums] = useState({});
    const [hiringNew, setHiringNew] = useState({
        startDate: null,
        endDate: null,
        workShift: {
            type: null
        },
        position: null,
        device: null,
        active:true
    });
    const [errores, setErrores] = useState({});

    // Carga los datos de los enums si no son proporcionados por props
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

        // Actualiza el estado para el input correspondiente
        if (id.includes("workShift")) {
            setHiringNew((prev) => ({
                ...prev,
                workShift: {
                    ...prev.workShift,
                    type: value
                }
            }));
        } else {
            setHiringNew((prev) => ({
                ...prev,
                [id]: value
            }));
        }
    };

    const validateForm = () => {
        const errors = {};

        if (!hiringNew.startDate) errors['startDate'] = "La fecha de inicio es obligatoria.";
        if (!hiringNew.endDate) errors['endDate'] = "La fecha de fin es obligatoria.";
        if (hiringNew.startDate && hiringNew.endDate && new Date(hiringNew.startDate) > new Date(hiringNew.endDate)) {
            errors['endDate'] = "La fecha de fin debe ser posterior a la fecha de inicio.";
        }
        if (!hiringNew.device) errors['device'] = "Debe seleccionar un dispositivo.";
        if (!hiringNew.workShift.type) errors['workShift.type'] = "Debe seleccionar un tipo de jornada.";
        if (!hiringNew.position) errors['position'] = "Debe seleccionar un puesto.";

        setErrores(errors);
        return Object.keys(errors).length === 0;
    };

    const saveAndReset = () => {
        if (!validateForm()) return;
        if (save != null) {
            save(hiringNew, 'create');
        }
        // Resetea el formulario
        setHiringNew({
            startDate: null,
            endDate: null,
            workShift: {
                type: null
            },
            position: null,
            device: null,
            active:true,
        });
        setErrores({});
    };

    return (
        <div className={styles.cajaperiodoNuevoCabecera}>
            <h3>Añadir Periodo de Contratación</h3>
            <div className={styles.cajaperiodo}>
                <div className={styles.periodo}>
                    <div className={styles.fechainicio}>
                        <label htmlFor='startDate'>Fecha de Inicio</label>
                        <input
                            type="date"
                            id="startDate"
                            name="startDate"
                            value={hiringNew.startDate || ''}
                            onChange={handleChange}
                        />
                    </div>
                    <div className={styles.fechainicio}>
                        <label htmlFor='endDate'>Fecha de Fin</label>
                        <input
                            type="date"
                            id="endDate"
                            name="endDate"
                            value={hiringNew.endDate || ''}
                            onChange={handleChange}
                        />
                    </div>

                    <div className={styles.dispositivo}>
                        <label htmlFor='Device'>Dispositivo</label>
                        <select
                            id="device"
                            name="device"
                            value={hiringNew.device || ''}
                            onChange={handleChange}
                        >
                            <option value="">Selecciona una opción</option>
                            {!!enums.programs && enums.programs.map((program) => (
                                <optgroup key={program._id} label={program.name}>
                                    {program.devices.map((device) => (
                                        <option key={device._id} value={device._id}>
                                            {device.name}
                                        </option>
                                    ))}
                                </optgroup>
                            ))}
                        </select>
                    </div>
                    <div className={styles.jornada}>
                        <label htmlFor='workShift.type'>Jornada</label>
                        <select
                            id="workShift.type"
                            name="workShift.type"
                            value={hiringNew.workShift.type || ''}
                            onChange={handleChange}
                        >
                            <option value="">Selecciona una opción</option>
                            <option value="completa">Completa</option>
                            <option value="parcial">Parcial</option>
                        </select>
                    </div>
                    <div className={styles.jornada}>
                        <label htmlFor='category'>Categoria</label>
                        <select
                            id="category"
                            name="category"
                            value={hiringNew.category || ''}
                            onChange={handleChange}
                        >
                            <option value="">Selecciona una opción</option>
                            <option value="1">Categoria 1</option>
                            <option value="2">Categoria 2</option>
                            <option value="3">Categoria 3</option>
                        </select>
                    </div>

                    <div className={styles.posicion}>
                        <label htmlFor='position'>Cargo</label>
                        <select
                            id="position"
                            name="position"
                            value={hiringNew.position || ''}
                            onChange={handleChange}
                        >
                            <option value="">Selecciona una opción</option>
                            {!!enums.jobs && enums.jobs.map((job) => (
                                job.subcategories ? (
                                    <optgroup key={job._id} label={job.name}>
                                        {job.subcategories.map((subcategory) => (
                                            <option key={subcategory._id} value={subcategory._id}>
                                                {subcategory.name}
                                            </option>
                                        ))}
                                    </optgroup>
                                ) : (
                                    <option key={job._id} value={job._id}>
                                        {job.name}
                                    </option>
                                )
                            ))}
                        </select>
                    </div>
                    
                    
                </div>
                <div className={styles.buttonsContainer}>
                        <button onClick={saveAndReset}>Guardar</button>
                        <button className='tomato' onClick={close}>Cancelar</button>
                </div>
                <div className={styles.errorsContainer}>
                    {Object.keys(errores).map((key) => (
                        <div key={key} className="errorSpan">
                            {errores[key]}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default HiringPeriodNew;
