import { useEffect, useState} from 'react';
import { validEmail, validJobs, validNumber, validText } from '../../lib/valid';
import styles from '../styles/formJob.module.css';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { textErrors } from '../../lib/textErrors';
import { sendFormCv, getData, getOfferJobId } from '../../lib/data';

const FormJob = ({ modal, charge, user=null, changeUser=null}) => {
    const [file, setFile] = useState(null);
    const { id } = useParams();
    const [offer,setIdOffer]=useState(null)
    const [multipleData, setMultipleData] = useState({ studies: ((user!=null)?user.studies:[]), provinces: ((user!=null)?user.provinces:[]), jobs: ((user!=null)?user.jobs:[]), work_schedule: ((user!=null)?user.work_schedule:[]) });
    const [enums, setEnums] = useState({ studies: [], provinces: [], jobs: [], work_schedule: [] });
    const [datos, setDatos] = useState({
        name: (user!=null)?user.name:null,
        email: (user!=null)?user.email:null,
        phone: (user!=null)?user.phone:null,
        jobs: null,
        provinces: null,
        work_schedule: (user!=null)?user.work_schedule[0]:null,
        studies: null,
        terms:(user!=null)?'':null,
        about:(user!=null)?user.about:"",
        id:(user!=null)?user._id:""
    });
    const [errores, setError] = useState({
        name: null,
        email: null,
        phone: null,
        jobs: null,
        provinces: null,
        work_schedule: null,
        studies: null,
        terms:null
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
                if(!!id){
                  const offerJob=await getOfferJobId({id:id})  
                  if(!!offerJob.error){
                    modal('Error', 'Oferta no disponible, por favor inténtelo más tarde');
                   navigate('/trabajaconnosotros'); 
                  } else setIdOffer(offerJob)
                } 
            } else {
                modal('Error', 'Servicio no disponible, por favor inténtelo más tarde');
                navigate('/');
                charge(false);
            }
        }
        cargarDatos();
    }, []);

    const handleChangeFile = (e) => {
        let auxErrores = { ...errores };
        auxErrores['file']=null
        setError(auxErrores)
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

    const handleChangeCheck=(e)=>{
        let auxErrores = { ...errores };
        auxErrores['terms']=null
        setError(auxErrores)
        let auxDatos = {...datos};
        auxDatos[e.target.name] =(auxDatos[e.target.name]==null)?e.target.value:null;
        setDatos(auxDatos);
    }

    const send = async () => {
        let valido = true;
        const keyAux=['jobs', 'studies', 'provinces']
        let auxErrores = { ...errores };
        if (file == null && user==null) {
            auxErrores['file'] = textErrors('vacio');
            valido = false;
        }


        for (const key in datos) {
            if (datos[key] == null && !keyAux.includes(key) && key!='about') {
                auxErrores[key] = textErrors('vacio');
                setError(auxErrores);
                valido = false;
            }
        }

        for  (const key in errores) {
            if (errores[key] != null) {
                valido = false;
            }
        }

        keyAux.map((x)=>{
            if(multipleData[x].length==0){
                auxErrores[x] = textErrors('vacio');
                setError(auxErrores);
                valido = false; 
            }
        })
        
        if (valido) {
            charge(true);
            const auxDatos = { ...datos };
            auxDatos.jobs = multipleData.jobs;
            auxDatos.provinces = multipleData.provinces;
            auxDatos.studies = multipleData.studies;
            auxDatos.work_schedule = [auxDatos.work_schedule];
            if(!!offer) auxDatos['offer']=offer._id
            const sendForm =(user==null?await sendFormCv(auxDatos, file):await sendFormCv(auxDatos, file, true)) 
            if (sendForm.error) {
                let auxErrores = { ...errores };
                auxErrores['mensajeError'] = sendForm.message;
                setError(auxErrores);
                charge(false);
            } else {
                if(user!=null) changeUser(sendForm.data)
                charge(false);
                modal('CV enviado', (user!=null)?"Curriculum modificado con éxito":"Curriculum enviado con éxito");
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
        <div className={(user==null)?styles.contenedor:`${styles.contenedor} ${styles.contendorEditar}`}>
            {user==null &&
             <div>
                <img src="/graphic/imagotipo_blanco_malva_descriptor.png" alt="logotipo engloba" />
            </div>   
            }
            {!!offer && <div className={styles.tituloOferta}>
                    <h2>Oferta: {offer.job_title}</h2>
                    </div>}
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
                {
                    user==null &&
                    <div className={styles.terminos}>
                        <input type="checkbox" id="terms" name="terms" value="accepted" onChange={(e) => handleChangeCheck(e)}/>
                        <label for="terms">Aceptar términos y condiciones: <Link to={'https://engloba.org.es/privacidad'}>política de privacidad</Link></label>
                        <span className='errorSpan'>{errores.terms}</span>
                    </div>
                }
                
                <div className={styles.botones}>
                    <button onClick={() => send()}>
                        {(user!=null)?"Guardar Cambios":"Enviar Formulario"}
                    </button>
                    {
                        user==null && 
                        <Link to={'/'}>
                            <button>Cancelar</button>
                        </Link>
                    }
                   
                </div>
                <span className='errorSpan'>{errores.mensajeError}</span>
            </div>
        </div>
    )
}

export default FormJob;
