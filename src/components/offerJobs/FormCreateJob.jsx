
import { useEffect, useState } from 'react';
import { validEmail, validJobs, validNumber, validText } from '../../lib/valid';
import styles from '../styles/formCreateJob.module.css';
import { Link, useNavigate } from 'react-router-dom';
import { textErrors } from '../../lib/textErrors';
import { getData, getPrograms, sendFormCreateOffer, updateOffer } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';
import { useLogin } from '../../hooks/useLogin';
import { dateFormated } from '../../lib/utils';
import BagCreate from '../cv/BagCreate';
import { useBag } from "../../hooks/useBag.jsx";


const FormCreateJob = ({enums, modal, charge, back, datosOferta = null }) => {
    const { logged } = useLogin()
    const { Bag, changeBag } = useBag()
    const [noEditar, setnoEditar] = useState((datosOferta == null) ? false : true)
    const [datos, setDatos] = useState({
        job_title: (datosOferta == null) ? null : datosOferta.job_title,
        essentials_requirements: (datosOferta == null) ? null : datosOferta.essentials_requirements,
        optionals_requirements: (datosOferta == null) ? null : datosOferta.optionals_requirements,
        conditions: (datosOferta == null) ? null : datosOferta.conditions,
        location: (datosOferta == null) ? null : datosOferta.location,
        expected_incorporation_date: (datosOferta == null) ? null : dateFormated(datosOferta.expected_incorporation_date),
        work_schedule: (datosOferta == null) ? null : datosOferta.work_schedule,
        studies: (datosOferta == null) ? null : datosOferta.studies,
        provinces: (datosOferta == null) ? null : datosOferta.province,
        functions: (datosOferta == null) ? null : datosOferta.functions,
        id: (datosOferta == null) ? '' : datosOferta._id,
        date: (datosOferta == null) ? '' : datosOferta.date,
        bag:(datosOferta == null) ? '' : datosOferta.bag
    })



    const [errores, setError] = useState({
        job_title: null,
        essentials_requirements: null,
        optionals_requirements: null,
        conditions: null,
        location: null,
        expected_incorporation_date: null,
        dispositive: null,
        work_schedule: null,
        studies: null,
        provinces: null,
        functions: null,
        bag:null
    })



    const handleChange = (e) => {
        let auxErrores = { ...errores }
        let auxDatos = { ...datos }
        auxErrores['mensajeError'] = null
        let valido = true;
        if(e.target.name=='program') auxDatos['dispositive']=null
        if (e.target.name == 'job_title') valido = validText(e.target.value, 3, 100)
        if (e.target.name == 'location') valido = validText(e.target.value, 3, 100)
        if (e.target.name == 'essentials_requirements') valido = validText(e.target.value, 0, 1000, true)
        if (e.target.name == 'optionals_requirements') valido = validText(e.target.value, 0, 1000, true)
        if (e.target.name == 'conditions') valido = validText(e.target.value, 0, 1000, true)
        auxDatos[e.target.name] = e.target.value
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
        for (const key in datos) {
            if (datos[key] == null || datos[key] == 'noOption') {
                auxErrores[key] = textErrors('vacio')
                setError(auxErrores)
                valido = false;
            }
        }

        if(noEditar && Bag==null) {
            auxErrores['bag']=textErrors('vacio')
            setError(auxErrores)
            valido = false;
        }

        if (valido) {
            charge(true)
            let auxDatos = { ...datos }
            const token = getToken();
            auxDatos['create'] = logged.user._id
            if (!!Bag){
                auxDatos['bag']=Bag._id
            }
            let sendForm = '';
            if (datosOferta != null) sendForm = await updateOffer(auxDatos, token);
            else sendForm = await sendFormCreateOffer(auxDatos, token);
            if (sendForm.error) {
                let auxErrores = { ...errores }
                auxErrores['mensajeError'] = sendForm.message;
                setError(auxErrores)
                charge(false)
            } else {
                charge(false)
                if (datosOferta != null){
                    modal('Oferta Modificada', "Oferta modificada con éxito")
                    back()
                } 
                else{
                  modal('Oferta Creada', "Oferta creada con éxito")  
                  back()

                } 
                

            }
        }
    }

    const editar=()=>{
        changeBag(null)
        setnoEditar(false)
    }


    return (
        <div className={styles.contenedor}>
            <div className={styles.contenedorForm}>
            
                <div>
                    <label htmlFor="job_title">Título de la oferta</label>
                    <input disabled={noEditar} type="text" id='job_title' name='job_title' onChange={(e) => handleChange(e)} value={datos.job_title} placeholder='Ej: Educacor Social en Málaga' />
                    <span className='errorSpan'>{errores.job_title}</span>
                </div>
                
                <div>
                    {!noEditar && <BagCreate offer={true}></BagCreate>}
                    <span className='errorSpan'>{errores.bag}</span>
                </div>
              
                {!!Bag && !noEditar &&
                    <div>
                        <label htmlFor="dispositive">Dispositivo</label>
                        <p>{Bag.dispositive.name}</p>
                    </div>
                }

                {datosOferta!=null && noEditar &&
                    <div>
                        <label htmlFor="dispositive">Dispositivo</label>
                        <p>{datosOferta.bag.dispositive.name}</p>
                    </div>
                }

                
                {!!enums &&
                    <>
                        <div>
                            <label htmlFor="work_schedule">Jornada</label>
                            <select id='work_schedule' name='work_schedule' onChange={(e) => handleChange(e)} value={datos.work_schedule} disabled={noEditar}>
                                <option value={'noOption'} key='work-1'>Selecciona una opción</option>
                                {enums.work_schedule.map((x, i) => {
                                    if (datosOferta != null && datosOferta.work_schedule == x.name) return <option value={x.name} key={`work` + i} selected>{x.name}</option>
                                    else return <option value={x} key={`work` + i}>{x.name}</option>
                                })}
                            </select>
                            <span className='errorSpan'>{errores.work_schedule}</span>
                        </div>
                        <div>
                            <label htmlFor="functions">Funciones</label>
                            <select id='functions' name='functions' onChange={(e) => handleChange(e)} value={datos.funtions} disabled={noEditar}>
                                <option value={'noOption'} key='functions-1'>Selecciona una opción</option>
                                {enums.jobs.map((x, i) => {
                                    if (datosOferta != null && datosOferta.functions == x.name) return <option value={x.name} key={`functions` + i} selected>{x.name}</option>
                                    else return <option value={x.name} key={`functions` + i}>{x.name}</option>
                                })}
                            </select>
                            <span className='errorSpan'>{errores.functions}</span>
                        </div>
                        <div>
                            <label htmlFor="studies">Estudios requeridos</label>
                            <select id='studies' name='studies' onChange={(e) => handleChange(e)} value={datos.studies} disabled={noEditar}>
                                <option value={'noOption'} key='studies-1'>Selecciona una opción</option>
                                {enums.studies.map((x, i) => {
                                    return <option value={x.name} key={`studies` + i}>{x.name}</option>
                                })}
                                <option value={'noRequired'} key={`studies` + 'noRequired'}>No requerido</option>
                            </select>
                            <span className='errorSpan'>{errores.studies}</span>
                        </div>
                        <div>
                            <label htmlFor="provinces">Provincias</label>
                            <select id='provinces' name='provinces' onChange={(e) => handleChange(e)} value={datos.provinces} disabled={noEditar}>
                                <option value={'noOption'} key='provinces-1'>Selecciona una opción</option>
                                {enums.provinces.map((x, i) => {
                                    if (datosOferta != null && datosOferta.province == x.name) return <option value={x.name} key={`provinces` + i} selected>{x.name}</option>
                                    else return <option value={x.name} key={`provinces` + i} >{x.name}</option>
                                })}
                            </select>
                            <span className='errorSpan'>{errores.provinces}</span>
                        </div>
                    </>
                }

                <div>
                    <label htmlFor="location">Localidad</label>
                    <input type="text" id='location' name='location' onChange={(e) => handleChange(e)} value={datos.location} placeholder='Ej: Málaga Centro' disabled={noEditar} />
                    <span className='errorSpan'>{errores.location}</span>
                </div>
                <div>
                    <label htmlFor="expected_incorporation_date">Fecha de incorporación</label>
                    <input type="date" id='expected_incorporation_date' name='expected_incorporation_date' onChange={(e) => handleChange(e)} value={datos.expected_incorporation_date} disabled={noEditar} />
                    <span className='errorSpan'>{errores.expected_incorporation_date}</span>
                </div>
                <div>
                    <label htmlFor="essentials_requirements">Requisitos indispensables</label>
                    <textarea id='essentials_requirements' name='essentials_requirements' onChange={(e) => handleChange(e)} value={datos.essentials_requirements} placeholder='- Tener 2 años de experiencia' disabled={noEditar} />
                    <span className='errorSpan'>{errores.essentials_requirements}</span>
                </div>
                <div>
                    <label htmlFor="optionals_requirements">Requisitos opcionales</label>
                    <textarea id='optionals_requirements' name='optionals_requirements' onChange={(e) => handleChange(e)} value={datos.optionals_requirements} placeholder='- Tener el curso de ...' disabled={noEditar} />
                    <span className='errorSpan'>{errores.optionals_requirements}</span>
                </div>



                <div className={styles.inputGrande}>
                    <label htmlFor="conditions">Condiciones</label>
                    <textarea type="text" id='conditions' name='conditions' onChange={(e) => handleChange(e)} value={datos.conditions} disabled={noEditar} />
                    <span className='errorSpan'>{errores.conditions}</span>
                </div>


                <div className={styles.botones}>
                    {(datosOferta == null) 
                        ? <button onClick={() => send()}>Crear Oferta</button>
                        : (noEditar == false) 
                            ?<button onClick={() => setnoEditar(true)}>Cancelar</button>
                            : null
                    }
                    {datosOferta == null
                        ? <button onClick={() => back()}>Cancelar</button>
                        : (noEditar == false)
                            ? <button onClick={() => send()}>Guardar</button>
                            : <button onClick={() => editar(false)}>Editar</button>
                    }
                </div>
                    

                <span className='errorSpan'>{errores.mensajeError}</span>
            </div>
        </div>
    )
}

export default FormCreateJob;