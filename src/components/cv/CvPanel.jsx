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
import { modifyUser } from "../../lib/data";
import { BsExclamationOctagon } from "react-icons/bs";
import { formatDatetime } from "../../lib/utils";
import { useLogin } from '../../hooks/useLogin';
import BagPanel from "./BagPanel";
import { useBag } from "../../hooks/useBag.jsx";
import VisualizadorPDF from "./GoogleView.jsx";
import { FaRegEdit  } from "react-icons/fa";
import FormJob from "../globals/FormJob.jsx";



const CvPanel = ({ urlpdf, user, changeUser, modal, charge}) => {
    const {logged} = useLogin()
    const {Bag, schedule}= useBag()
    const [typeComment, setTypeComment] = useState(null)
    const [textComment, setTextComment] = useState('')
    const [panelEditUser, setPanelEditUser]=useState(false)


    const saveComment = async () => {
        if (textComment != '' && typeComment != null) {
            const textAux = {
                _id:user._id,
                id:logged.user._id,
                nameUserComment:logged.user.name,
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
                    </div>
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
                                {user.commentsPhone.map((x)=> <div key={`commentPhone${x._id}`}>
                                    <p>{x.nameUser}</p>
                                    <p>{formatDatetime(x.date)}</p>
                                    <p>{x.message}</p>
                                </div>
                                )}
                            </div>
                    }
                    {!!user.commentsVideo &&
                            <div className={styles.about}>
                                <h3>Entrevistas Videollamada</h3>
                                {user.commentsVideo.map((x)=> <div key={`commentVideo${x._id}`}>
                                    <p>{x.nameUser}</p>
                                    <p>{formatDatetime(x.date)}</p>
                                    <p>{x.message}</p>
                                </div>
                                )}
                            </div>
                    }
                    {!!user.commentsInperson &&
                            <div className={styles.about}>
                                <h3>Entrevistas en Persona</h3>
                                {user.commentsInperson.map((x)=> <div key={`commentAbout${x._id}`}>
                                    <p>{x.nameUser}</p>
                                    <p>{formatDatetime(x.date)}</p>
                                    <p>{x.message}</p>
                                </div>
                                )}
                            </div>
                    }
                                
    
    
                </div>
                {(urlpdf!=null)? <VisualizadorPDF url={urlpdf.url}></VisualizadorPDF>:<div>No se ha podido cargar el PDF</div>}
            </div>
        )
    } 

}

export default CvPanel;