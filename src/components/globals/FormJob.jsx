import React, { useState } from 'react';
import { useJobFormData } from '../../hooks/useJobFormData';
import { sendFormCv } from '../../lib/data';
import { validateDNIorNIE, validEmail, validNumber, validText } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';
import styles from '../styles/formJob.module.css';
import { Link, useNavigate } from 'react-router-dom';
import SelectionOption from './SelectionOption';
import SelectedJobs from './SelectedJobs';

const FormJob = ({ modal, charge, user = null, changeUser = null }) => {
    const [file, setFile] = useState(null);

    const [multipleData, setMultipleData] = useState({
        studies: user ? user.studies : [],
        provinces: user ? user.provinces : [],
        jobs: user ? user.jobs : [],
        work_schedule: user ? user.work_schedule : [],
    });

    // Nuevo estado para el checkbox de discapacidad
    const [hasDisability, setHasDisability] = useState(
        user ? (user.disability && user.disability > 0) : false
    );


    const [datos, setDatos] = useState({
        firstName: user ? user.firstName : '', 
        lastName: user ? user.lastName : '', 
        dni: user ? user.dni : '', 
        email: user ? user.email : '', 
        phone: user ? user.phone : '', 
        jobs: null, 
        provinces: null, 
        work_schedule: user ? user.work_schedule[0] : null, 
        studies: null, 
        terms: user ? '' : null, 
        about: user ? user.about : "", 
        id: user ? user._id : "",
        // Nuevo campo disability
        disability: user ? user.disability : 0  
    });

    const [errores, setError] = useState({
        firstName:  null, 
        lastName: null, 
        dni: null,  
        email: null, 
        phone: null, 
        jobs: null, 
        provinces: null, 
        work_schedule: null, 
        studies: null, 
        terms: null,
        // Agregamos la propiedad disability al estado de errores
        disability: null,
        // Mensaje de error global
        mensajeError: null,
        // Error de archivo
        file: null
    });

    const navigate = useNavigate();
    const { enums, offer } = useJobFormData(charge, modal);

    const handleChangeFile = (e) => {
        if (e.target.files[0]?.type === 'application/pdf') {
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

        const { name, value, type } = e.target;

        // Para simplificar, validamos solo ciertos campos por nombre:
        if (name === 'firstName')  valido = validText(value, 3, 100);
        if (name === 'lastName')   valido = validText(value, 3, 100);
        if (name === 'email')      valido = validEmail(value);
        if (name === 'phone')      valido = validNumber(value);
        if (name === 'dni')        valido = validateDNIorNIE(value);

        // Para disability, validamos solo si se ha marcado el checkbox
        if (name === 'disability') {
            // Si no hay valor o no está marcado el checkbox,
            // podemos dejar que `valido = true` para evitar forzar el error.
            // Pero si hasDisability es true, validamos el número
            if (hasDisability) {
                valido = validNumber(value);
                // Ejemplo de validación adicional (0 a 100)
                if (valido && (value < 0 || value > 100)) {
                    valido = false;
                }
            } else {
                valido = true; // no es necesario cuando hasDisability es false
            }
        }

        // Manejo específico para checkbox
        if (type === 'checkbox' && name === 'terms') {
            auxDatos[name] = e.target.checked ? 'accepted' : null;
            // El checkbox en este caso no pasa por el validText, etc.
            // Forzamos a que el campo sea obligatorio
            valido = e.target.checked;
        } else if (type === 'checkbox' && name === 'hasDisability') {
            setHasDisability(e.target.checked);
            // Si se desmarca la discapacidad, forzamos el valor a 0
            if (!e.target.checked) {
                auxDatos.disability = 0;
                auxErrores.disability = null;
            }
            // Devolvemos aquí para no sobrescribir abajo
            setDatos(auxDatos);
            setError(auxErrores);
            return;
        } else {
            // Actualizamos el state con el valor capturado
            auxDatos[name] = value;
        }

        // Manejo de errores
        if (!valido) {
            auxErrores[name] = textErrors(name);
        } else {
            auxErrores[name] = null;
        }

        setDatos(auxDatos);
        setError(auxErrores);
    };

    const addOption = (e, type) => {
        const value = e.target.value;
        const newData = { ...multipleData };
        let auxErrores = { ...errores };
        auxErrores[type] = null;

        if (!newData[type].includes(value) && value !== null && value !== 'x') {
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

        for (const key in datos) {
            if (
              !datos[key] && // en vez de (datos[key] === null)
              !keyAux.includes(key) &&
              key !== 'about' &&
              key !== 'id' &&
              key !== 'disability'
            ) {
              auxErrores[key] = textErrors('vacio');
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
        keyAux.forEach((x) => {
            if (multipleData[x].length === 0) {
                auxErrores[x] = textErrors('vacio');
                valido = false;
            }
        });

        // Validación final de disability si hasDisability es true
        if (hasDisability && (!datos.disability || datos.disability <= 0)) {
            auxErrores['disability'] = textErrors('vacio');
            valido = false;
        }

        setError(auxErrores);

        // Si todo es válido, enviar el formulario
        if (valido) {
            charge(true);
            const auxDatos = { ...datos };
            auxDatos['firstName'] = auxDatos['firstName'].toLowerCase();
            auxDatos['lastName'] = auxDatos['lastName'].toLowerCase();
            auxDatos['dni'] = auxDatos['dni'].toLowerCase();
            auxDatos['email'] = auxDatos['email'].toLowerCase();
            auxDatos.jobs = multipleData.jobs;
            auxDatos.provinces = multipleData.provinces;
            auxDatos.studies = multipleData.studies;
            auxDatos.work_schedule = [auxDatos.work_schedule];

            if (!!offer) auxDatos['offer'] = offer._id;

            // Enviar el formulario al servidor
            const sendForm = (user == null 
                ? await sendFormCv(auxDatos, file) 
                : await sendFormCv(auxDatos, file, true)
            );

            if (sendForm.error) {
                let auxErrores = { ...errores };
                auxErrores['mensajeError'] = sendForm.message;
                setError(auxErrores);
                charge(false);
            } else {
                if (user != null) changeUser(sendForm);
                charge(false);
                modal(
                    'CV enviado', 
                    user != null ? "Curriculum modificado con éxito" : "Curriculum enviado con éxito"
                );
                if(user == null) window.location.href = 'https://engloba.org.es';
            }
        }
    }

    return (
        <div className={user ? `${styles.contenedor} ${styles.contendorEditar}` : styles.contenedor}>
            {/* Si no hay usuario, mostramos el logo */}
            {!user && (
                <div>
                    <img src="/graphic/logotipo_blanco.png" alt="logotipo engloba" />
                </div>
            )}
            
            {/* Si viene oferta, la mostramos */}
            {offer && (
                <div className={styles.tituloOferta}>
                    <h2>Oferta: {offer.job_title}</h2>
                </div>
            )}

            <div className={styles.contenedorForm}>
                <div>
                    <label htmlFor="firstName">Nombre</label>
                    <input
                        type="text"
                        id="firstName"
                        name="firstName"
                        onChange={handleChange}
                        value={datos.firstName}
                    />
                    <span className="errorSpan">{errores.firstName}</span>
                </div>
                <div>
                    <label htmlFor="lastName">Apellidos</label>
                    <input
                        type="text"
                        id="lastName"
                        name="lastName"
                        onChange={handleChange}
                        value={datos.lastName}
                    />
                    <span className="errorSpan">{errores.lastName}</span>
                </div>
                <div>
                    <label htmlFor="dni">DNI/NIE</label>
                    <input
                        type="text"
                        id="dni"
                        name="dni"
                        onChange={handleChange}
                        value={datos.dni}
                    />
                    <span className="errorSpan">{errores.dni}</span>
                </div>
                <div>
                    <label htmlFor="email">Email</label>
                    <input
                        type="email"
                        id="email"
                        name="email"
                        onChange={handleChange}
                        value={datos.email}
                    />
                    <span className="errorSpan">{errores.email}</span>
                </div>
                <div>
                    <label htmlFor="phone">Teléfono</label>
                    <input
                        type="text"
                        id="phone"
                        name="phone"
                        onChange={handleChange}
                        value={datos.phone}
                    />
                    <span className="errorSpan">{errores.phone}</span>
                </div>

               

                {/* Resto de campos */}
                {enums && (
                    <>
                        <div>
                            <label htmlFor="work_schedule">Disponibilidad Horaria</label>
                            <select
                                id="work_schedule"
                                name="work_schedule"
                                onChange={handleChange}
                                value={datos.work_schedule || ''}
                            >
                                <option value="">Selecciona una opción</option>
                                {enums.work_schedule.map((x) => (
                                    <option value={x.name} key={x.name}>
                                        {x.name}
                                    </option>
                                ))}
                            </select>
                            <span className="errorSpan">{errores.work_schedule}</span>
                        </div>

                         {/* Checkbox para discapacidad */}
                <div>
                    <label htmlFor="hasDisability">
                        <input
                            type="checkbox"
                            id="hasDisability"
                            name="hasDisability"
                            checked={hasDisability}
                            onChange={handleChange}
                        />
                        &nbsp;¿Tienes algún grado de discapacidad?
                    </label>
                </div>

                {/* Input para el porcentaje de discapacidad si hasDisability = true */}
                {hasDisability && (
                    <div>
                        <label htmlFor="disability">Porcentaje de discapacidad</label>
                        <input
                            type="number"
                            id="disability"
                            name="disability"
                            onChange={handleChange}
                            value={datos.disability}
                            placeholder="Ej: 33"
                        />
                        <span className="errorSpan">{errores.disability}</span>
                    </div>
                )}

                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption
                                type="jobs"
                                label="Puestos de interés"
                                enums={enums}
                                datos={datos}
                                addOption={addOption}
                            />
                            <SelectedJobs
                                data={multipleData}
                                type="jobs"
                                errores={errores}
                                removeOption={removeOption}
                            />
                        </div>
                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption
                                type="studies"
                                label="Estudios realizados"
                                enums={enums}
                                datos={datos}
                                addOption={addOption}
                            />
                            <SelectedJobs
                                data={multipleData}
                                type="studies"
                                errores={errores}
                                removeOption={removeOption}
                            />
                        </div>
                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption
                                type="provinces"
                                label="Lugares de interés"
                                enums={enums}
                                datos={datos}
                                addOption={addOption}
                            />
                            <SelectedJobs
                                data={multipleData}
                                type="provinces"
                                errores={errores}
                                removeOption={removeOption}
                            />
                        </div>
                    </>
                )}

                <div className={styles.inputGrande}>
                    <label htmlFor="about">Sobre mí</label>
                    <textarea
                        id="about"
                        name="about"
                        onChange={handleChange}
                        value={datos.about}
                        placeholder="Háblanos de ti"
                    />
                    <span className="errorSpan">{errores.about}</span>
                </div>
                <div className={styles.inputGrande}>
                    <input
                        type="file"
                        id="file"
                        name="file"
                        onChange={handleChangeFile}
                    />
                    <span className="errorSpan">{errores.file}</span>
                </div>

                {!user && (
                    <div className={styles.terminos}>
                        <input
                            type="checkbox"
                            id="terms"
                            name="terms"
                            value="accepted"
                            onChange={handleChange}
                        />
                        <label htmlFor="terms">
                            *Aceptar términos y condiciones: &nbsp;
                            <Link to="https://engloba.org.es/privacidad">
                                política de privacidad
                            </Link>
                        </label>
                        <span className="errorSpan">{errores.terms}</span>
                        <span className={styles.conditions}>
                            *Para cumplir con la normativa vigente en protección de datos 
                            de carácter personal, tal y como se indica en la correspondiente 
                            cláusula informativa, tu C.V. se mantendrá en nuestra base de datos 
                            durante un periodo de dos años a contar desde la fecha de entrega, 
                            pasado este tiempo se borrarán tus datos.
                        </span>
                    </div>
                )}

                <div className={styles.botones}>
                    <button onClick={send}>
                        {user ? 'Guardar Cambios' : 'Enviar Formulario'}
                    </button>
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
