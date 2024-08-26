import React from 'react';
import { useState } from "react"
import styles from '../styles/cvPanel.module.css';
import { FaPhoneAlt } from "react-icons/fa";
import { MdVideoCall } from "react-icons/md";
import { IoPersonSharp } from "react-icons/io5";
import { FaEye } from "react-icons/fa";
import { FaRegEyeSlash } from "react-icons/fa6";
import { GoStar } from "react-icons/go";
import { GoStarFill } from "react-icons/go";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { deleteUserCv, modifyUser } from "../../lib/data";
import { BsExclamationOctagon } from "react-icons/bs";
import { formatDatetime } from "../../lib/utils";
import { useLogin } from '../../hooks/useLogin';
import BagPanel from "./BagPanel";
import { useBag } from "../../hooks/useBag.jsx";
import VisualizadorPDF from "./GoogleView.jsx";
import { FaRegEdit, FaCalendarAlt   } from "react-icons/fa";
import FormJob from "../globals/FormJob.jsx";
import { getToken } from '../../lib/serviceToken.js';
import { BsBookmarkPlusFill } from "react-icons/bs";
import { PiPersonFill } from "react-icons/pi";



const CvPanel = ({ urlpdf, user, changeUser, modal, charge, deleteUser}) => {
    const {logged} = useLogin()
    const {Bag, schedule}= useBag()
    const [typeComment, setTypeComment] = useState(null)
    const [textComment, setTextComment] = useState('')
    const [panelEditUser, setPanelEditUser]=useState(false)
    const [deletePanel, setDeletePanel]=useState(false)


    const saveComment = async () => {
        if (textComment != '' && typeComment != null) {
            const textAux = {
                _id:user._id,
                id:logged.user._id,
                nameUserComment:logged.user.firstName,
                [typeComment]: textComment,
                
            }
            const response = await modifyUser(textAux);
            if(!response.error){
                changeUser(response)   
                modal('Comentario', 'Comentario guardado con éxito')
                setTextComment('')
                setTypeComment(null)
            } else {
                modal('Comentario', 'Error al guardar el comentario, vuelve a intentarlo más tarde')
            }
            
        }
    }

    const deleteCv=async ()=>{
        deleteUser()
    }

    const changeStatus=async (typeStatus)=>{
        const textAux={
            _id:user._id,
            id:logged.user._id,
            nameUserComment:logged.user.name,
            [typeStatus]:(user[typeStatus]==null)?logged.user._id:null
        }
        const response = await modifyUser(textAux);
        if(!response.error)changeUser(response)
    }

    const handleChange = (e) => {
        setTextComment(e.target.value)
    }

    const handleChangeType=(type)=>{
        setTypeComment(type)
        setTextComment('')
    }

    const viewPanelEditUser=()=>{
        setPanelEditUser(!panelEditUser)
    }

    const deleteCvPanel=(state)=>{
        setDeletePanel(state)
    }

    if(user){
        return (

            <div className={styles.contenedorCV}>
                <div className={styles.comments}>
                    <div className={styles.iconos}>
                        {(user.view!=null) ? <FaEye color="white" onClick={()=>changeStatus('view')} /> : <FaRegEyeSlash onClick={()=>changeStatus('view')}/>}
                        {(user.favorite!=null) ? <GoStarFill color='yellow' onClick={()=>changeStatus('favorite')}></GoStarFill> : <GoStar onClick={()=>changeStatus('favorite')}></GoStar>}
                        {(user.reject!=null) ? <BsExclamationOctagonFill color="tomato" onClick={()=>changeStatus('reject')}/>: <BsExclamationOctagon  onClick={()=>changeStatus('reject')}/>}
                        <FaRegEdit  onClick={()=>viewPanelEditUser()}/>
                        {Bag!=null && !schedule && <BagPanel userSelected={user}/>}
                        {logged.user.role=='root' && <button className='tomato' onClick={()=>deleteCvPanel(true)}>Eliminar CV</button>}
                    </div>
                    {deletePanel && <div className={styles.deletePanel}>
                        <p>¿Estas seguro? No seas cafre !!!!</p>
                        <button onClick={()=>deleteCv(user)}>Si, lo he meditado toda la noche</button>
                        <button onClick={()=>deleteCvPanel(false)}>No, hoy no me he tomado el café</button>
                    </div> }
                    {!!panelEditUser && <div className={styles.contenedorEditar}>
                        <h2 className={styles.cerrar}>Editar Información <button className="tomato" onClick={()=>viewPanelEditUser()}>Cerrar</button></h2> 
                        <FormJob 
                        charge={()=>charge()}   
                        modal={(title, message) => modal(title, message)}
                        user={user}
                        changeUser={(x)=>changeUser(x)}
                        />
                        
                        </div>}
                    {Bag!=null && schedule &&
                    <div className={styles.boxComments}>
                        <h2>Comentarios</h2>
                        <div>
                            <div className={styles.iconos}>
                                <FaPhoneAlt onClick={() => handleChangeType('commentsPhone')}></FaPhoneAlt>
                                <MdVideoCall onClick={() => handleChangeType('commentsVideo')}></MdVideoCall>
                                <IoPersonSharp onClick={() => handleChangeType('commentsInperson')}></IoPersonSharp>
                            </div>
                            {typeComment != null &&
                                <div className={styles.contentComment}>
                                    <h4>Entrevista {(typeComment == 'commentsPhone') ? 'por Telefónica' : (typeComment == 'commentsVideo') ? 'por Videollamada' : 'en Persona'}</h4>
                                    <textarea name="comentarios" id="comentarios" value={textComment} onChange={(e) => handleChange(e)}></textarea>
                                    <button onClick={() => saveComment()}>Guardar Comentarios</button>
                                    <button onClick={() => setTypeComment(null)}>Cancelar</button>
                                </div>}
                        </div>
                    </div>
                    }
                    <div className={styles.boxComments}>
                        <h2>Notas <BsBookmarkPlusFill onClick={() => handleChangeType('notes')}></BsBookmarkPlusFill></h2>
                        <div>
                            {typeComment != null &&
                                <div className={styles.contentComment}>
                                    <h4>Añadir nota</h4>
                                    <textarea name="comentarios" id="comentarios" value={textComment} onChange={(e) => handleChange(e)}></textarea>
                                    <button onClick={() => saveComment()}>Guardar Nota</button>
                                    <button onClick={() => setTypeComment(null)}>Cancelar</button>
                                </div>}
                                {!user.notes && <p>No hay notas todavía</p>}
                                {!!user.notes && user.notes.map((x)=>{ return <div key={`notes${x._id}`} className={styles.commentBox}>
                                    <p><PiPersonFill /> {x.nameUser}</p>
                                    <p><FaCalendarAlt/> {formatDatetime(x.date)}</p>
                                    <p>{x.message}</p>
                                </div>
                                })}
                        </div>
                    </div>
                    
                    {!!user.about &&
                            <div className={styles.about}>
                                <h3>Sobre mi</h3>
                                <p>{user.about}</p>
                            </div>
                    }
                    <h2>COMENTARIOS ANTERIORES</h2>
                    {!user.commentsPhone && !user.commentsVideo && !user.commentsInperson && <p>No hay comentarios todavía</p>}
                    {!!user.commentsPhone &&
                            <div className={styles.about}>
                                <h3>Entrevistas Teléfonicas</h3>
                                {user.commentsPhone.map((x)=>{ return <div key={`commentsPhone${x._id}`} className={styles.commentBox}>
                                    <p><PiPersonFill /> {x.nameUser}</p>
                                    <p><FaCalendarAlt/> {formatDatetime(x.date)}</p>
                                    <p>{x.message}</p>
                                </div>
                                })}
                            </div>
                    }
                    {!!user.commentsVideo &&
                            <div className={styles.about}>
                                <h3>Entrevistas Videollamada</h3>
                                {user.commentsVideo.map((x)=>{ return <div key={`commentsVideo${x._id}`} className={styles.commentBox}>
                                    <p><PiPersonFill /> {x.nameUser}</p>
                                    <p><FaCalendarAlt/> {formatDatetime(x.date)}</p>
                                    <p>{x.message}</p>
                                </div>
                                })}
                            </div>
                    }
                    {!!user.commentsInperson &&
                            <div className={styles.about}>
                                <h3>Entrevistas en Persona</h3>
                                {user.commentsInperson.map((x)=>{ return <div key={`commentsInperson${x._id}`} className={styles.commentBox}>
                                    <p><PiPersonFill /> {x.nameUser}</p>
                                    <p><FaCalendarAlt/> {formatDatetime(x.date)}</p>
                                    <p>{x.message}</p>
                                </div>
                                })}
                            </div>
                    }
                                
    
    
                </div>
                {(urlpdf!=null)? <VisualizadorPDF url={urlpdf.url}></VisualizadorPDF>:<div>No se ha podido cargar el PDF</div>}
            </div>
        )
    } 

}

export default React.memo(CvPanel, (prevProps, nextProps) => {
    // Si las props son iguales, evita re-renderizado
    return (
        prevProps.urlpdf === nextProps.urlpdf &&
        prevProps.user === nextProps.user &&
        prevProps.charge === nextProps.charge &&
        prevProps.modal === nextProps.modal &&
        prevProps.changeUser === nextProps.changeUser
    );
});