import { useEffect, useState } from 'react';
import { validEmail, validJobs, validNumber, validText } from '../../lib/valid';
import styles from '../styles/formJob.module.css';
import { Link, useNavigate } from 'react-router-dom';
import { textErrors } from '../../lib/textErrors';
import { sendFormCv, getData } from '../../lib/data';

const FormJob = ({ modal, charge }) => {
    const [file, setFile] = useState(null);
    const [multipleData, setMultipleData] = useState({ studies: [], provinces: [], jobs: [], work_schedule: [] });
    const [enums, setEnums] = useState({ studies: [], provinces: [], jobs: [], work_schedule: [] });
    const [datos, setDatos] = useState({
        name: null,
        email: null,
        phone: null,
        jobs: null,
        provinces: null,
        work_schedule: null,
        studies: null
    });
    const [errores, setError] = useState({
        name: null,
        email: null,
        phone: null,
        jobs: null,
        provinces: null,
        work_schedule: null,
        studies: null
    });

    const navigate = useNavigate();

    useEffect(() => {
        charge(true);
        const cargarDatos = async () => {
            const enumsData = await getData();

            if (!enumsData.error) {
                let auxEnums = {};
                auxEnums['jobs'] = enumsData.jobs;
                auxEnums['provinces'] = enumsData.provinces;
                auxEnums['work_schedule'] = enumsData.work_schedule;
                auxEnums['studies'] = enumsData.studies;
                setEnums(auxEnums);
                charge(false);
            } else {
                modal('Error', 'Servicio no disponible, por favor inténtelo más tarde');
                navigate('/');
                charge(false);
            }
        }
        cargarDatos();
    }, []);

    const handleChangeFile = (e) => {
        setFile(e.target.files[0]);
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
    }

    const removeOption = (type, i) => {
        const newData = { ...multipleData };
        newData[type].splice(i, 1);
        setMultipleData({ ...newData });
    }

    const handleChange = (e) => {
        let auxErrores = { ...errores };
        let auxDatos = { ...datos };
        auxErrores['mensajeError'] = null;
        let valido = false;
        if (e.target.name == 'name') valido = validText(e.target.value, 3, 100);
        if (e.target.name == 'email') valido = validEmail(e.target.value);
        if (e.target.name == 'phone') valido = validNumber(e.target.value);

        auxDatos[e.target.name] = e.target.value;
        setDatos(auxDatos);

        if (!valido) {
            auxErrores[e.target.name] = textErrors(e.target.name);
        } else {
            auxErrores[e.target.name] = null;
        }
        setError(auxErrores);
    }

    const send = async () => {
        let valido = true;
        let auxErrores = { ...errores };
        if (file == null) {
            auxErrores['file'] = textErrors('vacio');
            valido = false;
        }
        for (const key in datos) {
            if (datos[key] == null) {
                auxErrores[key] = textErrors('vacio');
                setError(auxErrores);
                valido = false;
            }
        }

        if (!multipleData.jobs.length > 0) auxErrores['jobs'] = textErrors('vacio'), valido = false;
        if (!multipleData.provinces.length > 0) auxErrores['provinces'] = textErrors('vacio'), valido = false;
        if (!multipleData.studies.length > 0) auxErrores['studies'] = textErrors('vacio'), valido = false;

        if (valido) {
            charge(true);
            const auxDatos = { ...datos };
            auxDatos.jobs = multipleData.jobs;
            auxDatos.provinces = multipleData.provinces;
            auxDatos.studies = multipleData.studies;
            auxDatos.work_schedule = [auxDatos.work_schedule];
            const sendForm = await sendFormCv(auxDatos, file);
            if (sendForm.error) {
                let auxErrores = { ...errores };
                auxErrores['mensajeError'] = sendForm.message;
                setError(auxErrores);
                charge(false);
            } else {
                charge(false);
                modal('CV enviado', "Curriculum enviado con éxito");
                navigate('/');
            }
        }
    }

    const SelectionOption = ({type, label}) => {
        return ( <div>
            <label htmlFor={type}>{label}</label>
            <select id={type} name={type} onChange={(e) => addOption(e, type)} value={datos.jobs}>
                <option value={'x'}>Selecciona una opción</option>
                {enums[type].map((x) => {
                    if (x.subcategories != undefined && x.subcategories.length > 0) {
                        return (
                            <optgroup label={x.name} key={x.name}>
                                {x.subcategories.map((y) => (
                                    <option value={y.name} key={y.name}>{y.name}</option>
                                ))}
                            </optgroup>
                        );
                    } else {
                        return <option value={x.name} key={x.name}>{x.name}</option>
                    }
                })}
            </select>
        </div>
        )
    }

    const SelectedJobs = ({ data, type, errores }) => {
        return (
            <div>
                <label>Seleccionados:</label>
                <ul>
                    {data[type].map((x, i) => (
                        <li key={`${type}-${i}`}>
                            <p>{x}</p>
                            <button onClick={() => removeOption(type, i)}>X</button>
                        </li>
                    ))}
                    {errores[type] != null && <li><span className='errorSpan'>{errores[type]}</span></li>}
                </ul>
            </div>
        );
    }

    return (
        <div className={styles.contenedor}>
            <div>
                <img src="/graphic/imagotipo_blanco_malva_descriptor.png" alt="logotipo engloba" />
            </div>
            <div className={styles.contenedorForm}>
                <div>
                    <label htmlFor="name">Nombre</label>
                    <input type="text" id='name' name='name' onChange={(e) => handleChange(e)} value={datos.name} />
                    <span className='errorSpan'>{errores.name}</span>
                </div>
                <div>
                    <label htmlFor="email">Email</label>
                    <input type="email" id='email' name='email' onChange={(e) => handleChange(e)} value={datos.email} />
                    <span className='errorSpan'>{errores.email}</span>
                </div>
                <div>
                    <label htmlFor="phone">Phone</label>
                    <input type="text" id='phone' name='phone' onChange={(e) => handleChange(e)} value={datos.phone} />
                    <span className='errorSpan'>{errores.phone}</span>
                </div>
                {!!enums &&
                    <>
                        <div>
                            <label htmlFor="work_schedule">Disponibilidad Horaria</label>
                            <select id='work_schedule' name='work_schedule' onChange={(e) => handleChange(e)} value={datos.work_schedule}>
                                <option>Selecciona una opción</option>
                                {enums.work_schedule.map((x) => {
                                    return <option value={x.name} key={x.name}>{x.name}</option>
                                })}
                            </select>
                            <span className='errorSpan'>{errores.work_schedule}</span>
                        </div>
                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption type={'jobs'} label={'Puestos de interés'}/>
                            <SelectedJobs data={multipleData} type={'jobs'} errores={errores}></SelectedJobs>
                        </div>

                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption type={'studies'} label={'Estudios realizados'}></SelectionOption>
                            <SelectedJobs data={multipleData} type={'studies'} errores={errores}></SelectedJobs>
                        </div>

                        <div className={styles.contenedorSelectionMultiple}>
                            <SelectionOption type={'provinces'} label={'Lugares de interés'}></SelectionOption>
                            <SelectedJobs data={multipleData} type={'provinces'} errores={errores}></SelectedJobs>
                        </div>
                    </>
                }
                <div className={styles.inputGrande}>
                    <label htmlFor="about">Sobre mi</label>
                    <textarea type="text" id='about' name='about' onChange={(e) => handleChange(e)} value={datos.about} placeholder='Háblanos de ti' />
                    <span className='errorSpan'>{errores.about}</span>
                </div>
                <div className={styles.inputGrande}>
                    <input type="file" id='file' name='file' onChange={(e) => handleChangeFile(e)} />
                    <span className='errorSpan'>{errores.file}</span>
                </div>
                <div className={styles.botones}>
                    <button onClick={() => send()}>
                        Enviar Formulario
                    </button>
                    <Link to={'/'}>
                        <button>Cancelar</button>
                    </Link>
                </div>

                <span className='errorSpan'>{errores.mensajeError}</span>
            </div>
        </div>
    )
}

export default FormJob;
