
import { useEffect, useState } from 'react';
import { validEmail, validJobs, validNumber, validText } from '../../lib/valid';
import styles from '../styles/form.module.css';
import { Link } from 'react-router-dom';
import { textErrors } from '../../lib/textErrors';
import {  sendFormCv, getData } from '../../lib/data';




const FormJob = () => {
    const [file, setFile]=useState(null)
    const [enums, setEnums]=useState(null)
    const [jobs, setJobs]=useState(null)
    const [datos,setDatos]=useState({
        name: null,
        email: null,
        phone: null,
        jobs:null,
        provinces: null,
        work_schedule:null
        
    })
    const [errores, setError] = useState({
        name: null,
        email: null,
        phone: null,
        jobs:null,
        provinces: null,
        work_schedule:null
    })

    useEffect(()=>{
        const cargarDatos=async ()=>{
            const enumsData = await getData();
            let auxEnums={}
            auxEnums['jobs']=enumsData.jobs
            auxEnums['provinces']=enumsData.provinces
            auxEnums['work_schedule']=enumsData.work_schedule
            setEnums(auxEnums)
        }
        cargarDatos();
    },[])

    const handleChangeFile =(e)=>{
        setFile(e.target.files[0])
    }

    const handleChange = (e) => {
        
        let auxErrores = { ...errores }
        let auxDatos= {...datos}
        auxErrores['mensajeError'] = null
        let valido = false;
        if (e.target.name == 'name') valido = validText(e.target.value, 3, 100)
        if (e.target.name == 'email') valido = validEmail(e.target.value)
        if (e.target.name == 'phone') valido = validNumber(e.target.value)

        auxDatos[e.target.name]=e.target.value
        setDatos(auxDatos)

        if (!valido) {
            auxErrores[e.target.name] = textErrors(e.target.name)
        } else {
            auxErrores[e.target.name] = null
        }
        setError(auxErrores)
    }

    const send = async () => {

        let valido = true;
        let auxErrores = { ...errores }
        if(file==null){
           auxErrores['file'] = textErrors('vacio') 
           valido=false
        } 
        for (const key in datos) {
            if (datos[key] == null) {
                auxErrores[key] = textErrors('vacio')
                setError(auxErrores)
                valido = false;
            }
        }

        

        if (valido) {
            const sendForm = await sendFormCv(datos, file);
            if (sendForm.error) {
                let auxErrores = { ...errores }
                auxErrores['mensajeError'] = sendForm.message;
                setError(auxErrores)
            } else {
                
            }
        } 
    }


    return (
        <div className={styles.contenedorLogin}>
            <div>
                <img src="/graphic/imagotipo_blanco_malva_descriptor.png" alt="logotipo engloba" />
            </div>
            <div  className={styles.contenedorForm}>
                <div>
                    <label htmlFor="name">Nombre</label>
                    <input type="text" id='name' name='name'onChange={(e)=>handleChange(e)} value={datos.name}/>
                    <span className='errorSpan'>{errores.name}</span>
                </div>
                <div>
                    <label htmlFor="email">Email</label>
                    <input type="email" id='email' name='email'onChange={(e)=>handleChange(e)} value={datos.email}/>
                    <span className='errorSpan'>{errores.email}</span>
                </div>
                <div>
                    <label htmlFor="phone">Phone</label>
                    <input type="text" id='phone' name='phone'onChange={(e)=>handleChange(e)} value={datos.phone}/>
                    <span className='errorSpan'>{errores.phone}</span>
                </div>
                {!!enums && 
                <div>
                    <label htmlFor="jobs">Puesto de interés</label>
                    <select id='jobs' name='jobs'onChange={(e)=>handleChange(e)} value={datos.jobs}>
                    <option>Selecciona una opción</option>
                        {enums.jobs.map((x)=>{
                            return <option value={x}>{x}</option>
                        })}
                    </select>
                    <span className='errorSpan'>{errores.jobs}</span>
                </div>
                }
                {!!enums && 
                <div>
                    <label htmlFor="provinces">Provincias</label>
                    <select id='provinces' name='provinces'onChange={(e)=>handleChange(e)} value={datos.provinces}>
                    <option>Selecciona una opción</option>
                        {enums.provinces.map((x)=>{
                            return <option value={x}>{x}</option>
                        })}
                    </select>
                    <span className='errorSpan'>{errores.provinces}</span>
                </div>
                }
                {!!enums && 
                <div>
                    <label htmlFor="work_schedule">Disponibilidad Horaria</label>
                    <select id='work_schedule' name='work_schedule'onChange={(e)=>handleChange(e)} value={datos.work_schedule}>
                    <option>Selecciona una opción</option>
                        {enums.work_schedule.map((x)=>{
                            return <option value={x}>{x}</option>
                        })}
                    </select>
                    <span className='errorSpan'>{errores.work_schedule}</span>
                </div>
                }
                <div className={styles.inputGrande}>
                    <label htmlFor="about">Sobre mi</label>
                    <textarea type="text" id='about' name='about'onChange={(e)=>handleChange(e)} value={datos.about}/>
                    <span className='errorSpan'>{errores.about}</span>
                </div>
                <div>
                    <label htmlFor="offer">Código de oferta (Si procede)</label>
                    <input type="text" id='offer' name='offer'onChange={(e)=>handleChange(e)} value={datos.offer}/>
                    <span className='errorSpan'>{errores.offer}</span>
                </div>
                <div>
                    <label htmlFor="job_exchange">En caso de optar a una oferta ¿Quieres formar parte de futuros procesos de selección?</label>
                    <div><input type="radio" id='job_exchange' name='job_exchange'onChange={(e)=>handleChange(e)} value={true} checked/>Si</div>
                    <div><input type="radio" id='job_exchange' name='job_exchange'onChange={(e)=>handleChange(e)} value={false}/>No</div>
                    <span className='errorSpan'>{errores.job_exchange}</span>
                </div>
                <div className={styles.inputGrande}>
                    <input type="file" id='file' name='file' onChange={(e)=>handleChangeFile(e)}/>
                    <span className='errorSpan'>{errores.file}</span>
                </div>
                <button onClick={()=>send()}>
                    Enviar Formulario
                </button>
                <Link to={'/'}>
                    <button>Cancelar</button>
                </Link>
                <span className='errorSpan'>{errores.mensajeError}</span>
            </div>
        </div>
    )
}

export default FormJob;