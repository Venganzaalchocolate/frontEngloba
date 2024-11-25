import { useState } from 'react';
import styles from '../styles/HiringPeriodForm.module.css';  
import SelectDispositive from '../globals/SelectDispositive';
import { textErrors } from '../../lib/textErrors';
import { deepClone } from '../../lib/utils';

const HiringPeriodForm = ({ onHiringPeriodChange, initialPeriod = {}, isEditing }) => {
    const [hiringPeriod, setHiringPeriod] = useState({
        position: initialPeriod.position || '',
        category: initialPeriod.category || '',
        startDate: initialPeriod.startDate || '',
        workShift: {
            type: initialPeriod.workShift?.type || '',
            note: initialPeriod.workShift?.note || ''
        },
        device: initialPeriod.device || '',
    });

    const [errors, setErrors] = useState({
        position: null,
        category: null,
        startDate: null,
        workShift: {
            type: null,
        },
        device: null
    });

    // Validación básica para cada campo
    const validateField = (name, value) => {
        if (['position', 'category'].includes(name)) {
            return value.length >= 3; // Validar que tenga al menos 3 caracteres
        }
        if (name === 'startDate' || name === 'workShift.type' || name === 'device') {
            return value !== ''; // Validar que no esté vacío
        }
        return true;
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        const newErrors = deepClone(errors);

        // Actualizar los errores según el campo
        if (!validateField(name, value)) {
            if (name.startsWith('workShift')) {
                const subField = name.split('.')[1];
                newErrors.workShift[subField] = textErrors('vacio');
            } else {
                newErrors[name] = textErrors('vacio');
            }
        } else {
            if (name.startsWith('workShift')) {
                const subField = name.split('.')[1];
                newErrors.workShift[subField] = null;
            } else {
                newErrors[name] = null;
            }
        }

        setErrors(newErrors);

        // Actualizar el estado del formulario
        if (name.startsWith('workShift')) {
            const subField = name.split('.')[1];
            setHiringPeriod((prev) => ({
                ...prev,
                workShift: {
                    ...prev.workShift,
                    [subField]: value
                }
            }));
        } else {
            setHiringPeriod((prev) => ({
                ...prev,
                [name]: value
            }));
        }
    };

    const handleAdd = () => {
        let dataAux=deepClone(hiringPeriod)
        let errorsAux=deepClone(errors)
        // Verificar si hay errores
        let valid=true;
        for (const key in dataAux) {
            if (dataAux.hasOwnProperty(key)) {  // Verificar que la propiedad sea del objeto y no heredada
                if(key=='workShift'){
                    if(dataAux['workShift']['type']==''){
                       valid=false 
                       errorsAux['workShift']['type']=textErrors('vacio') 
                    }  
                } else if(dataAux[key]==''){
                    valid=false// Imprime la clave y el valor 
                    errorsAux[key]=textErrors('vacio') 
                }
            }
        }
        // Si no hay errores, enviar los datos al componente padre
        if(valid) onHiringPeriodChange(dataAux);
        else setErrors(errorsAux)
    };

    const changeDeviceSelect=(idDevice ,nameDevice)=>{
        let dataAux=deepClone(hiringPeriod)
        let errorsAux=deepClone(errors)
        dataAux['device']=idDevice
        dataAux['nameDevice']=nameDevice
        errorsAux['device']=null
        setHiringPeriod(dataAux);
        setErrors(errorsAux)

    }

    return (
        <div className={styles.hiringPeriodForm}>
            <h3>Periodo de Contratación</h3>

            <div className={styles.formGroup}>
                <label htmlFor="position">Cargo</label>
                <select
                    id="position"
                    name="position"
                    value={hiringPeriod.position}
                    onChange={handleChange}
                    disabled={!isEditing}
                >
                    <option value="">Selecciona</option>
                    <option value="Directivo">Directivo</option>
                    <option value="Empleado">Empleado</option>
                </select>
                {errors.position && <span className="errorSpan">{errors.position}</span>}
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="category">Categoría</label>
                <select
                    id="category"
                    name="category"
                    value={hiringPeriod.category}
                    onChange={handleChange}
                    disabled={!isEditing}
                >
                    <option value="">Selecciona</option>
                    <option value="grupo 1">Grupo 1</option>
                    <option value="grupo 2">Grupo 2</option>
                    <option value="grupo 3">Grupo 3</option>
                </select>
                {errors.category && <span className="errorSpan">{errors.category}</span>}
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="startDate">Fecha de Inicio</label>
                <input
                    type="date"
                    id="startDate"
                    name="startDate"
                    value={hiringPeriod.startDate}
                    onChange={handleChange}
                    disabled={!isEditing}
                />
                {errors.startDate && <span className="errorSpan">{errors.startDate}</span>}
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="workShift.type">Tipo de Jornada</label>
                <select
                    id="workShift.type"
                    name="workShift.type"
                    value={hiringPeriod.workShift.type}
                    onChange={handleChange}
                    disabled={!isEditing}
                >
                    <option value="">Selecciona</option>
                    <option value="total">Total</option>
                    <option value="parcial">Parcial</option>
                </select>
                {errors.workShift.type && <span className="errorSpan">{errors.workShift.type}</span>}
            </div>

            <div className={styles.formGroup}>
                <label htmlFor="workShift.note">Notas</label>
                <input
                    type="text"
                    id="workShift.note"
                    name="workShift.note"
                    value={hiringPeriod.workShift.note}
                    onChange={handleChange}
                    disabled={!isEditing}
                />
                {errors.workShift.note && <span className="errorSpan">{errors.workShift.note}</span>}
            </div>

            <div className={styles.dispositive}>
                <SelectDispositive onDeviceSelect={(idDevice, nameDevice)=>changeDeviceSelect(idDevice, nameDevice)} />
                {errors.device && <span className="errorSpan">{errors.device}</span>}
            </div>

            <button onClick={handleAdd}>Añadir</button>
        </div>
    );
};

export default HiringPeriodForm;
