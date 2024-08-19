import React, { useState } from 'react';
import { useJobFormData } from '../../hooks/useJobFormData';
import { sendFormCv } from '../../lib/data';
import { validEmail, validNumber, validText } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';
import styles from '../styles/formJob.module.css';
import { Link, useNavigate } from 'react-router-dom';
import SelectionOption from './SelectionOption'; // Importar el componente
import SelectedJobs from './SelectedJobs'; // Importar el componente

const FormJob = ({ modal, charge, user = null, changeUser = null }) => {
    const [file, setFile] = useState(null);
    const [multipleData, setMultipleData] = useState({
        studies: user ? user.studies : [],
        provinces: user ? user.provinces : [],
        jobs: user ? user.jobs : [],
        work_schedule: user ? user.work_schedule : [],
    });
    const [datos, setDatos] = useState({
        name: (user != null) ? user.name : null, 
        email: (user != null) ? user.email : null, 
        phone: (user != null) ? user.phone : null, 
        jobs: null, 
        provinces: null, 
        work_schedule: (user != null) ? user.work_schedule[0] : null, 
        studies: null, 
        terms: (user != null) ? '' : null, 
        about: (user != null) ? user.about : "", 
        id: (user != null) ? user._id : "" 
    });
    const [errores, setError] = useState({
        name: null, 
        email: null, 
        phone: null, 
        jobs: null, 
        provinces: null, 
        work_schedule: null, 
        studies: null, 
        terms: null 
    });

    const navigate = useNavigate();
    const { enums, offer } = useJobFormData(charge, modal);

    const handleChangeFile = (e) => {
        if (e.target.files[0].type === 'application/pdf') {
            setError({ ...errores, file: null });
            setFile(e.target.files[0]);
        } else {
            setError({ ...errores, file: textErrors('fileError') });
        }
    };

    const handleChange = (e) => {
        let auxErrores = { ...errores }; 
        let auxDatos = { ...datos }; 
        auxErrores['mensajeError'] = null; 
        let valido = false;

        // Validar según el tipo de input
        if (e.target.name == 'name') valido = validText(e.target.value, 3, 100); 
        if (e.target.name == 'email') valido = validEmail(e.target.value); 
        if (e.target.name == 'phone') valido = validNumber(e.target.value);
        
        auxDatos[e.target.name] = e.target.value; 
        setDatos(auxDatos);

        // Manejo de errores
        if (!valido) {
            auxErrores[e.target.name] = textErrors(e.target.name); 
        } else {
            auxErrores[e.target.name] = null; 
        }
        setError(auxErrores);
    }

    const addOption = (e, type) => {
        const value = e.target.value;
        const newData = { ...multipleData };
        let auxErrores = { ...errores };
        auxErrores[type] = null;

        if (!newData[type].includes(value) && value != null && value != 'x') {
            newData[type].push(value);
            setMultipleData({ ...newData });
        }

        setDatos({
            ...datos,
            [e.target.name]: 'x' // Limpiar el valor del select
        });

        setError(auxErrores);
    };

    const removeOption = (type, i) => {
        const newData = { ...multipleData };
        newData[type].splice(i, 1);
        setMultipleData({ ...newData });
    };

    const send = async () => {
        let valido = true;
        const keyAux = ['jobs', 'studies', 'provinces']; 
        let auxErrores = { ...errores };

        // Validar si el archivo es requerido y no está presente
        if (file == null && user == null) {
            auxErrores['file'] = textErrors('vacio');
            valido = false;
        }

        // Validar campos obligatorios
        for (const key in datos) {
            if (datos[key] == null && !keyAux.includes(key) && key != 'about') {
                auxErrores[key] = textErrors('vacio');
                setError(auxErrores);
                valido = false;
            }
        }

        // Verificar si hay errores previos
        for (const key2 in errores) {
            if (errores[key2] != null) {
                valido = false;
            }
        }

        // Validar que las opciones múltiples no estén vacías
        keyAux.map((x) => {
            if (multipleData[x].length == 0) {
                auxErrores[x] = textErrors('vacio');
                setError(auxErrores);
                valido = false;
            }
        });

        // Si todo es válido, enviar el formulario
        if (valido) {
            charge(true);
            const auxDatos = { ...datos };
            auxDatos['name'] = auxDatos['name'].toLowerCase();
            auxDatos['email'] = auxDatos['email'].toLowerCase();
            auxDatos.jobs = multipleData.jobs;
            auxDatos.provinces = multipleData.provinces;
            auxDatos.studies = multipleData.studies;
            auxDatos.work_schedule = [auxDatos.work_schedule];
            if (!!offer) auxDatos['offer'] = offer._id;

            // Enviar el formulario al servidor
            const sendForm = (user == null ? await sendFormCv(auxDatos, file) : await sendFormCv(auxDatos, file, true));
            if (sendForm.error) {
                let auxErrores = { ...errores };
                auxErrores['mensajeError'] = sendForm.message;
                setError(auxErrores);
                charge(false);
            } else {
                if (user != null) changeUser(sendForm);
                charge(false);
                modal('CV enviado', (user != null) ? "Curriculum modificado con éxito" : "Curriculum enviado con éxito");
                if(user==null) window.location.href='https://engloba.org.es';
            }
        }
    }

    return (
        <div className={user ? `${styles.contenedor} ${styles.contendorEditar}` : styles.contenedor}>
            {!user && (
                <div>
                    <img src="/graphic/logotipo_blanco.png" alt="logotipo engloba" />
                </div>
            )}
            {offer && (
                <div className={styles.tituloOferta}>
                    <h2>Oferta: {offer.job_title}</h2>
                </div>
            )}
            <div className={styles.contenedorForm}>
                <div>
                    <label htmlFor="name">Nombre</label>
                    <input type="text" id="name" name="name" onChange={handleChange} value={datos.name} />
                    <span className="errorSpan">{errores.name}</span>
                </div>
                <div>
                    <label htmlFor="email">Email</label>
                    <input type="email" id="email" name="email" onChange={handleChange} value={datos.email} />
                    <span className="errorSpan">{errores.email}</span>
                </div>
                <div>
                    <label htmlFor="phone">Teléfono</label>
                    <input type="text" id="phone" name="phone" onChange={handleChange} value={datos.phone} />
                    <span className="errorSpan">{errores.phone}</span>
                </div>
                {enums && (
                    <>
                        <div>
                            <label htmlFor="work_schedule">Disponibilidad Horaria</label>
                            <select id="work_schedule" name="work_schedule" onChange={handleChange} value={datos.work_schedule}>
                                <option>Selecciona una opción</option>
                                {enums.work_schedule.map((x) => (
                                    <option value={x.name} key={x.name}>
                                        {x.name}
                                    </option>
                                ))}
                            </select>
                            <span className="errorSpan">{errores.work_schedule}</span>
                        </div>
                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption
                                type="jobs"
                                label="Puestos de interés"
                                enums={enums}
                                datos={datos}
                                addOption={addOption}
                            />
                            <SelectedJobs data={multipleData} type="jobs" errores={errores} removeOption={removeOption} />
                        </div>
                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption
                                type="studies"
                                label="Estudios realizados"
                                enums={enums}
                                datos={datos}
                                addOption={addOption}
                            />
                            <SelectedJobs data={multipleData} type="studies" errores={errores} removeOption={removeOption} />
                        </div>
                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption
                                type="provinces"
                                label="Lugares de interés"
                                enums={enums}
                                datos={datos}
                                addOption={addOption}
                            />
                            <SelectedJobs data={multipleData} type="provinces" errores={errores} removeOption={removeOption} />
                        </div>
                    </>
                )}
                <div className={styles.inputGrande}>
                    <label htmlFor="about">Sobre mí</label>
                    <textarea id="about" name="about" onChange={handleChange} value={datos.about} placeholder="Háblanos de ti" />
                    <span className="errorSpan">{errores.about}</span>
                </div>
                <div className={styles.inputGrande}>
                    <input type="file" id="file" name="file" onChange={handleChangeFile} />
                    <span className="errorSpan">{errores.file}</span>
                </div>
                {!user && (
                    <div className={styles.terminos}>
                        <input type="checkbox" id="terms" name="terms" value="accepted" onChange={handleChange} />
                        <label htmlFor="terms">
                            Aceptar términos y condiciones: <Link to="https://engloba.org.es/privacidad">política de privacidad</Link>
                        </label>
                        <span className="errorSpan">{errores.terms}</span>
                    </div>
                )}
                <div className={styles.botones}>
                    <button onClick={send}>{user ? 'Guardar Cambios' : 'Enviar Formulario'}</button>
                    {!user && (
                        <Link to="/">
                            <button>Cancelar</button>
                        </Link>
                    )}
                </div>
                <span className="errorSpan">{errores.mensajeError}</span>
            </div>
        </div>
    );
};

export default FormJob;
