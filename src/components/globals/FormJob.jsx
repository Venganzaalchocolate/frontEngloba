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
        name: user?.name || '',
        email: user?.email || '',
        phone: user?.phone || '',
        jobs: null,
        provinces: null,
        work_schedule: user?.work_schedule?.[0] || '',
        studies: null,
        terms: user ? '' : null,
        about: user?.about || '',
        id: user?._id || '',
    });
    const [errores, setError] = useState({});
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
        const { name, value } = e.target;
        const validationMap = {
            name: validText(value, 3, 100),
            email: validEmail(value),
            phone: validNumber(value),
        };

        setDatos({ ...datos, [name]: value });
        setError({
            ...errores,
            [name]: validationMap[name] ? null : textErrors(name),
        });
    };

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
        const requiredFields = ['name', 'email', 'phone', 'work_schedule', 'terms'];
        let isValid = requiredFields.every((field) => datos[field] !== null);
        if (!file && !user) isValid = false;

        if (isValid) {
            charge(true);
            const sendForm = await sendFormCv(
                {
                    ...datos,
                    jobs: multipleData.jobs,
                    provinces: multipleData.provinces,
                    studies: multipleData.studies,
                    work_schedule: [datos.work_schedule],
                    offer: offer?._id,
                },
                file,
                !!user
            );

            if (sendForm.error) {
                setError({ ...errores, mensajeError: sendForm.message });
                charge(false);
            } else {
                if (user) changeUser(sendForm.data);
                charge(false);
                modal('CV enviado', user ? "Curriculum modificado con éxito" : "Curriculum enviado con éxito");
                navigate('/');
            }
        }
    };

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
