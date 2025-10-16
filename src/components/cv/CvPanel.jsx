import React, { useEffect, Suspense } from 'react';
import { useState } from "react"
import styles from '../styles/cvPanel.module.css';
import { FaPhoneAlt } from "react-icons/fa";
import { MdVideoCall } from "react-icons/md";
import { IoBagCheck, IoPersonSharp } from "react-icons/io5";
import { GoStar } from "react-icons/go";
import { GoStarFill } from "react-icons/go";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { infoUser, lastHiringForUser, modifyUser, offerUpdate } from "../../lib/data";
import { BsExclamationOctagon } from "react-icons/bs";
import { deepClone, formatDatetime, titleCaseES } from "../../lib/utils";
import { useLogin } from '../../hooks/useLogin';
const VisualizadorPDF = React.lazy(() => import("./GoogleView.jsx"));
import { FaRegEdit, FaCalendarAlt } from "react-icons/fa";
import { BsBookmarkPlusFill } from "react-icons/bs";
import { PiPersonFill } from "react-icons/pi";
import { IoBagAdd } from "react-icons/io5";
import { RiDeleteBin6Line } from "react-icons/ri";
import ToHireEmployee from './ToHireEmployee.jsx';
import { getToken } from "../../lib/serviceToken";
import { useOffer } from '../../hooks/useOffer.jsx';
import InfoUser from './infoUser.jsx';
import ModalForm from '../globals/ModalForm.jsx';



const CvPanel = ({ modalBagView, urlpdf, user, changeUser, modal, charge, deleteUser, offers, enumsEmployer, chargeOffers, setSelectedOfferAndAddUser, reset }) => {
    const { logged } = useLogin()
    const [typeComment, setTypeComment] = useState(null)
    const [textComment, setTextComment] = useState('')
    const [panelEditUser, setPanelEditUser] = useState(false)
    const [deletePanel, setDeletePanel] = useState(false)
    const [inOffer, setInOffer] = useState(false)
    const { Offer, changeOffer } = useOffer()
    const [infoUserWork, setInfoUserWork] = useState(null)
    const [fieldsModal, setFieldsModal] = useState([]);
    const [loadingFields, setLoadingFields] = useState(false);

    // Cargar campos del modal cuando haya infoUserWork
    useEffect(() => {
        let alive = true;
        (async () => {
            if (!infoUserWork) { setFieldsModal([]); return; }
            setLoadingFields(true);
            try {
                const f = await buildFieldsForModal(infoUserWork); // <- espera al array
                if (alive) setFieldsModal(Array.isArray(f) ? f : []);
            } finally {
                if (alive) setLoadingFields(false);
            }
        })();
        return () => { alive = false; };
    }, [infoUserWork]);

    const infoUserW = async (dni) => {
        const data = { dni: dni }
        const token = getToken()
        const user = await infoUser(token, data)
        setInfoUserWork(user)
    }


    const isCurrentlyActive = (user) => {
        if (!user) return false;
        if (user.employmentStatus !== 'ya no trabaja con nosotros') return true;
    };

    const getLastHiring = async (user) => {
        const token = getToken();
        const infoLastHiring = await lastHiringForUser({ idUser: user._id }, token)
        if (infoLastHiring.error) modal('Error', 'No se ha podido obtener la información del último periodo de contratación')

        return infoLastHiring
    };

    const closeInfoModal = () => setInfoUserWork(null);

    const buildFieldsForModal = async (user) => {
        const last = await getLastHiring(user);
        const activo = isCurrentlyActive(user);
        const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';
      
        const data = [
            { type: 'section', label: 'Infomación básica' },
            { name: 'nombre', label: 'Nombre', type: 'text', defaultValue: `${user.firstName || ''} ${user.lastName || ''}`.trim(), disabled: true },
            { name: 'dni', label: 'DNI', type: 'text', defaultValue: user.dni || '', disabled: true },
            { type: 'info', content: activo ? 'Actualmente trabajando en Engloba' : 'Ya no trabaja en Engloba' },
            { type: 'section', label: 'Último periodo de contratación' },
            { name: 'inicio', label: 'Inicio', type: 'text', defaultValue: last ? fmt(last.startDate) : '—', disabled: true },
            { name: 'fin', label: 'Fin', type: 'text', defaultValue: last?.endDate ? fmt(last.endDate) : (last ? 'Abierto' : '—'), disabled: true },
            { name: 'jornada', label: 'Jornada', type: 'text', defaultValue: last?.workShift?.type || '—', disabled: true },
            { name: 'puesto', label: 'Puesto', type: 'text', defaultValue: enumsEmployer.jobsIndex[last?.position]?.name || '—', disabled: true },
            { name: 'dispositivo', label: 'Dispositivo', type: 'text', defaultValue: enumsEmployer.dispositiveIndex[last?.dispositiveId]?.name || '—', disabled: true },
        ];

        return data
    };


    const isInOffer = () => {
        if (!!Offer) {
            const exist = Offer.userCv.some((idUser) => idUser == user._id)
            setInOffer(exist)
        }

    }



    useEffect(() => {
        isInOffer();
    }, [[Offer, user._id]])

    const saveComment = async () => {
        if (!textComment.trim() || !typeComment) return;

        const textAux = {
            _id: user._id,
            id: logged.user._id,
            nameUser: logged.user.firstName || logged.user.name || '',
            [typeComment]: textComment.trim(),
            ...(Offer ? { offerId: Offer._id } : {}), // opcional
        };

        const response = await modifyUser(textAux);
        if (!response.error) {
            changeUser(response);
            modal('Comentario', 'Comentario guardado con éxito');
            setTextComment('');
            setTypeComment(null);
        } else {
            modal('Comentario', 'Error al guardar el comentario, vuelve a intentarlo más tarde');
        }
    };


    const deleteCv = async () => {
        deleteUser()
    }

    const changeStatus = async (typeStatus) => {
        const textAux = {
            _id: user._id,
            id: logged.user._id,
            nameUserComment: logged.user.name,
            [typeStatus]: (user[typeStatus] == null) ? logged.user._id : null
        }
        const response = await modifyUser(textAux);
        if (!response.error) changeUser(response)
    }

    const handleChange = (e) => {
        setTextComment(e.target.value)
    }

    const handleChangeType = (type) => {
        setTypeComment(prev => (prev === type ? null : type));
        setTextComment('');
    };

    const viewPanelEditUser = () => {
        setPanelEditUser(!panelEditUser)
    }

    const deleteCvPanel = (state) => {
        setDeletePanel(state)
    }

    const addUserInOffer = async () => {
        let offerAux = deepClone(Offer);
        if (!Array.isArray(offerAux.userCv)) {
            offerAux.userCv = [];
        }
        offerAux.userCv.push(user._id);
        const data = {
            offerId: offerAux._id,
            userCv: offerAux.userCv
        }
        const token = getToken();
        const upOffer = await offerUpdate(data, token);
        if (!upOffer.error) {
            changeOffer(upOffer); // Actualiza la oferta en el estado principal
            chargeOffers(upOffer);
            setInOffer(true); // Fuerza la actualización del estado   
        } else {
            modal('Error', 'No se pudo añadir la solicitud a la oferta')
        }

    };


    const deleteUserInOffer = async () => {
        let offerAux = deepClone(Offer);
        offerAux['userCv'] = offerAux.userCv.filter((id) => id !== user._id);
        const data = {
            offerId: offerAux._id,
            userCv: offerAux.userCv
        }

        const token = getToken();
        const upOffer = await offerUpdate(data, token);

        changeOffer(upOffer); // Actualiza la oferta en el estado principal
        chargeOffers(upOffer);
        setInOffer(false); // Fuerza la actualización del estado
    };




    if (user) {
        return (

            <div className={styles.contenedorCV}>
                <div className={styles.comments}>
                    <div className={styles.iconos}>
                        {(user.favorite != null) ? <GoStarFill color='yellow' onClick={() => changeStatus('favorite')}></GoStarFill> : <GoStar onClick={() => changeStatus('favorite')}></GoStar>}
                        {(user.reject != null) ? <BsExclamationOctagonFill color="tomato" onClick={() => changeStatus('reject')} /> : <BsExclamationOctagon onClick={() => changeStatus('reject')} />}
                        {logged.user.role == 'root' && <RiDeleteBin6Line onClick={() => deleteCvPanel(true)}>Eliminar CV</RiDeleteBin6Line>}
                        {logged.user.role == 'root' && <FaRegEdit onClick={() => viewPanelEditUser()} />}
                        {(!Offer)
                            ? <IoBagAdd onClick={() => setSelectedOfferAndAddUser(user)}></IoBagAdd>
                            : (inOffer)
                                ? <IoBagCheck onClick={() => deleteUserInOffer()} color='lightgreen'></IoBagCheck>
                                : <IoBagAdd onClick={() => addUserInOffer()}></IoBagAdd>
                        }


                    </div>
                    {deletePanel && <div className={styles.deletePanel}>
                        <p>¿Estas seguro? No seas cafre !!!!</p>
                        <button onClick={() => deleteCv(user)}>Si, lo he meditado toda la noche</button>
                        <button onClick={() => deleteCvPanel(false)}>No, hoy no me he tomado el café</button>
                    </div>}
                   
                    
                    <div className={styles.cajaBotonesContratar}>
                        <ToHireEmployee changeUser={(x) => changeUser(x)} chargeOffers={chargeOffers} enumsEmployer={enumsEmployer} offers={offers} userSelected={user} modal={(title, message) => modal(title, message)} charge={() => charge()} />
                        {user.workedInEngloba.status && <button className='btn-outline-secondary' onClick={() => infoUserW(user.dni)}>Información del Empleado</button>}
                    </div>

                    <InfoUser user={user} enumsEmployer={enumsEmployer}/>
                    <div className={styles.boxComments}>
                        <h2>Notas <BsBookmarkPlusFill onClick={() => handleChangeType('notes')}></BsBookmarkPlusFill></h2>
                        <div>
                            {typeComment != null && typeComment == 'notes' &&
                                <div className={styles.contentComment}>
                                    <h4>Añadir nota</h4>
                                    <textarea name="comentarios" id="comentarios" value={textComment} onChange={(e) => handleChange(e)}></textarea>
                                    <button onClick={() => saveComment()} disabled={!textComment.trim()}>Guardar Nota</button>
                                    <button onClick={() => setTypeComment(null)}>Cancelar</button>
                                </div>}
                            {!user.notes && <p>No hay notas todavía</p>}
                            {!!user.notes && user.notes.map((x) => {
                                const nameUserNotes = `${titleCaseES(x.userCv.firstName)} ${titleCaseES(x.userCv.lastName)}`
                                return <div key={`notes${x._id}`} className={styles.commentBox}>
                                    <p><PiPersonFill /> {nameUserNotes}</p>
                                    <p><FaCalendarAlt /> {formatDatetime(x.date)}</p>
                                    <p>{x.message}</p>
                                </div>
                            })}
                        </div>
                    </div>

                    <div className={styles.boxComments}>
                        <h2>Comentarios {<><FaPhoneAlt onClick={() => handleChangeType('commentsPhone')} /> <MdVideoCall onClick={() => handleChangeType('commentsVideo')} /> <IoPersonSharp onClick={() => handleChangeType('commentsInperson')} /></>}</h2>
                        <div>
                            {typeComment && typeComment !== 'notes' && (
                                <div className={styles.contentComment}>
                                    <h4>Entrevista {(typeComment == 'commentsPhone') ? 'por Telefónica' : (typeComment == 'commentsVideo') ? 'por Videollamada' : 'en Persona'}</h4>
                                    <textarea name="comentarios" id="comentarios" value={textComment} onChange={(e) => handleChange(e)}></textarea>
                                    <button onClick={saveComment} disabled={!textComment.trim()} >Guardar Comentarios</button>
                                    <button onClick={() => setTypeComment(null)}>Cancelar</button>
                                </div>)}
                            {!user.commentsPhone && !user.commentsVideo && !user.commentsInperson && <p>No hay comentarios todavía</p>}
                            {!!user.commentsPhone &&
                                <div className={styles.about}>
                                    <h3>Entrevistas Teléfonicas</h3>
                                    {user.commentsPhone.map((x) => {
                                        const nameUserPhone = `${titleCaseES(x.userCv.firstName)} ${titleCaseES(x.userCv.lastName)}`
                                        return <div key={`commentsPhone${x._id}`} className={styles.commentBox}>
                                            <p><PiPersonFill /> {nameUserPhone}</p>
                                            <p><FaCalendarAlt /> {formatDatetime(x.date)}</p>
                                            <p>{x.message}</p>
                                        </div>
                                    })}
                                </div>
                            }
                            {!!user.commentsVideo &&
                                <div className={styles.about}>
                                    <h3>Entrevistas Videollamada</h3>
                                    {user.commentsVideo.map((x) => {
                                        const nameUserVideo = `${titleCaseES(x.userCv.firstName)} ${titleCaseES(x.userCv.lastName)}`
                                        return <div key={`commentsVideo${x._id}`} className={styles.commentBox}>
                                            <p><PiPersonFill /> {nameUserVideo}</p>
                                            <p><FaCalendarAlt /> {formatDatetime(x.date)}</p>
                                            <p>{x.message}</p>
                                        </div>
                                    })}
                                </div>
                            }
                            {!!user.commentsInperson &&
                                <div className={styles.about}>
                                    <h3>Entrevistas en Persona</h3>
                                    {user.commentsInperson.map((x) => {
                                        const nameUserInPerson = `${titleCaseES(x.userCv.firstName)} ${titleCaseES(x.userCv.lastName)}`
                                        return <div key={`commentsInperson${x._id}`} className={styles.commentBox}>

                                            <p><PiPersonFill /> {nameUserInPerson}</p>
                                            <p><FaCalendarAlt /> {formatDatetime(x.date)}</p>
                                            <p>{x.message}</p>
                                        </div>
                                    })}
                                </div>
                            }
                            {!!user.about &&
                                <div className={styles.about}>
                                    <h3>Sobre mi</h3>
                                    <p>{user.about}</p>
                                </div>
                            }
                        </div>
                    </div>




                </div>
                <Suspense
                    fallback={
                        <div className={styles.pdfSkeleton}>
                            <div className={styles.spinner} aria-label="Cargando visor…" />
                            <span>Cargando visor…</span>
                        </div>
                    }
                >
                    {urlpdf?.loading ? (
                        <div className={styles.pdfSkeleton}>
                            <div className={styles.spinner} aria-label="Cargando PDF…" />
                            <span>Cargando PDF…</span>
                        </div>
                    ) : urlpdf?.error ? (
                        <div className={styles.pdfEmpty}>{urlpdf.error}</div>
                    ) : urlpdf?.url ? (
                        <VisualizadorPDF url={urlpdf.url} />
                    ) : (
                        <div className={styles.pdfEmpty}>
                            Selecciona un candidato para ver su CV
                        </div>
                    )}
                </Suspense>
                {infoUserWork && (
                    loadingFields ? (
                        <div className={styles.pdfSkeleton}>
                            <div className={styles.spinner} aria-label="Cargando datos…" />
                            <span>Cargando datos…</span>
                        </div>
                    ) : (
                        <ModalForm
                            title="Información laboral"
                            message={null}
                            fields={fieldsModal}          // <- ahora es un array
                            onSubmit={closeInfoModal}
                            onClose={closeInfoModal}
                        />
                    )
                )}
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