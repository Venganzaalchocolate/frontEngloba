import React, { useEffect, Suspense, useRef, useState } from 'react';
import styles from '../styles/cvPanel.module.css';

// Iconos
import { FaPhoneAlt } from "react-icons/fa";
import { MdVideoCall } from "react-icons/md";
import { IoPersonSharp, IoBagAdd, IoBagCheck } from "react-icons/io5";
import { FaRegEdit, FaCalendarAlt } from "react-icons/fa";
import { BsBookmarkPlusFill } from "react-icons/bs";
import { PiPersonFill } from "react-icons/pi";
import { RiDeleteBin6Line } from "react-icons/ri";
import { BsExclamationOctagon, BsExclamationOctagonFill } from "react-icons/bs";
import { GoStar, GoStarFill } from "react-icons/go";

// Componentes
import VisualizadorPDF from "./GoogleView.jsx";
import ToHireEmployee from './ToHireEmployee.jsx';
import ModalForm from '../globals/ModalForm.jsx';
import FormJobUp from '../globals/FormJobUp.jsx';
import CandidateStatusIcons from './CandidateStatusIcons.jsx';
import InfoUser from './infoUser.jsx';

// Utils
import { infoUser, lastHiringForUser, modifyUser, offerUpdate } from "../../lib/data";
import { deepClone, formatDatetime, titleCaseES } from "../../lib/utils";
import { useLogin } from '../../hooks/useLogin';
import { getToken } from "../../lib/serviceToken";
import { useOffer } from '../../hooks/useOffer.jsx';


const CvPanel = ({
    urlpdf,
    user,
    changeUser,
    modal,
    charge,
    deleteUser,
    enumsEmployer,
    chargeOffers,
    setSelectedOfferAndAddUser,
}) => {

    const { logged } = useLogin();
    const { Offer, changeOffer } = useOffer();

    const [typeComment, setTypeComment] = useState(null);
    const [textComment, setTextComment] = useState('');
    const [panelEditUser, setPanelEditUser] = useState(false);
    const [deletePanel, setDeletePanel] = useState(false);
    const [infoUserWork, setInfoUserWork] = useState(null);
    const [fieldsModal, setFieldsModal] = useState([]);
    const [loadingFields, setLoadingFields] = useState(false);

    // Para estados globales (favorite + reject)
    const [globalStatusModal, setGlobalStatusModal] = useState(null);

    // Acción diferida si no hay oferta seleccionada
    const [deferredField, setDeferredField] = useState(null);  // favoritesCv | rejectCv | viewCv
    const [deferredUser, setDeferredUser] = useState(null);

    const recordDeferredField = (field, userObj) => {
        setDeferredField(field);
        setDeferredUser(userObj);
    };

    // Cap detector
    const capsWarnedAtRef = useRef(0);
    const CAPS_MIN_STREAK = 6;
    const CAPS_MIN_RATIO = 0.75;
    const CAPS_MIN_LEN = 12;
    const CAPS_COOLDOWN_MS = 15000;


    // -------------------------------------------------------
    // 🔥 REGISTRAR ESTADO FAVORITO / RECHAZO GLOBAL
    // -------------------------------------------------------

    const openFavoriteModal = () => setGlobalStatusModal("favorite");
    const openRejectModal = () => setGlobalStatusModal("reject");

    const saveGlobalStatus = async (reason) => {
        const field = globalStatusModal;
        if (!field) return;

        const wasMarked = Boolean(user[field]);

        // Quitar estado
        if (wasMarked) {
            charge(true);
            const response = await modifyUser({
                _id: user._id,
                id: logged.user._id,
                [field]: null
            });
            charge(false);
            setGlobalStatusModal(null);

            if (!response.error) changeUser(response);
            else modal("Error", "No se pudo actualizar el estado");

            return;
        }

        // Motivo obligatorio
        if (!reason?.trim()) {
            modal("Motivo obligatorio", "Es necesario indicar un motivo.");
            return;
        }

        charge(true);
        const actionName = field === "favorite" ? "FAVORITO GLOBAL" : "RECHAZO GLOBAL";

        const response = await modifyUser({
            _id: user._id,
            id: logged.user._id,
            [field]: logged.user._id,
            notes: `${actionName}: ${reason}`
        });

        charge(false);
        setGlobalStatusModal(null);

        if (!response.error) changeUser(response);
        else modal("Error", "No se pudo actualizar el estado.");
    };

    const clearGlobalStatus = async (field) => {
        charge(true);
        const response = await modifyUser({
            _id: user._id,
            id: logged.user._id,
            [field]: null
        });
        charge(false);

        if (!response.error) changeUser(response);
        else modal("Error", "No se pudo eliminar el estado.");
    };



    // -------------------------------------------------------
    // 🔥 LÓGICA DE OFERTA - ESTADOS FAVORITE/REJECT/VIEW
    // -------------------------------------------------------

    const addUserAutomaticallyToOffer = async (userId) => {
        if (!Offer) return;

        const offerAux = deepClone(Offer);
        if (!Array.isArray(offerAux.userCv)) offerAux.userCv = [];
        if (!Array.isArray(offerAux.solicitants)) offerAux.solicitants = [];

        const isCandidate = offerAux.userCv.includes(userId);
        const isSolicitant = offerAux.solicitants.includes(userId);

        if (isCandidate || isSolicitant) return;

        offerAux.userCv.push(userId);

        const data = { offerId: offerAux._id, userCv: offerAux.userCv };
        const token = getToken();
        const upOffer = await offerUpdate(data, token);

        if (!upOffer.error) {
            changeOffer(upOffer);
            chargeOffers(upOffer);
        } else {
            modal("Error", "No se pudo añadir automáticamente al candidato");
        }
    };

    const updateOfferArray = async (field, userId) => {
        if (!Offer) return setSelectedOfferAndAddUser(user);

        const list = Array.isArray(Offer[field]) ? [...Offer[field]] : [];
        const exists = list.includes(userId);

        const newArr = exists ? list.filter(x => x !== userId) : [...list, userId];

        const data = { offerId: Offer._id, [field]: newArr };
        const token = getToken();

        const upOffer = await offerUpdate(data, token);

        if (!upOffer.error) {
            changeOffer(upOffer);
            chargeOffers(upOffer);
        } else {
            modal("Error", "No se pudo actualizar el estado en la oferta");
        }
    };


    // -------------------------------------------------------
    // 🔥 PROCESAR CAMBIOS DIFERIDOS DESPUÉS DE SELECCIONAR OFERTA
    // -------------------------------------------------------

    useEffect(() => {
        const run = async () => {
            if (!Offer || !deferredField || !deferredUser) return;

            const userId = deferredUser._id;
            const isCandidate = Offer?.userCv?.includes(userId);
            const isSolicitant = Offer?.solicitants?.includes(userId);

            if (!isCandidate && !isSolicitant) {
                await addUserAutomaticallyToOffer(userId);
            }

            await updateOfferArray(deferredField, userId);

            setDeferredField(null);
            setDeferredUser(null);
        };

        run();
    }, [Offer]);


    // -------------------------------------------------------
    // 🔥 INFO USUARIO EN OFERTAS
    // -------------------------------------------------------

    const infoUserW = async (dni) => {
        const token = getToken();
        const dataUser = await infoUser(token, { dni });
        setInfoUserWork(dataUser);
    };

    const buildFieldsForModal = async (userObj) => {
        const last = await lastHiringForUser({ idUser: userObj._id }, getToken());
        const activo = userObj.employmentStatus !== 'ya no trabaja con nosotros';
        const fmt = (d) => d ? new Date(d).toLocaleDateString('es-ES') : '—';

        return [
            { type: 'section', label: 'Información básica' },
            { name: 'nombre', label: 'Nombre', type: 'text', defaultValue: `${userObj.firstName} ${userObj.lastName}`, disabled: true },
            { name: 'dni', label: 'DNI', type: 'text', defaultValue: userObj.dni || '—', disabled: true },
            { type: 'info', content: activo ? 'Actualmente trabajando en Engloba' : 'No trabaja en Engloba' },

            { type: 'section', label: 'Último periodo de contratación' },
            { name: 'inicio', label: 'Inicio', type: 'text', defaultValue: fmt(last?.startDate), disabled: true },
            { name: 'fin', label: 'Fin', type: 'text', defaultValue: fmt(last?.endDate || 'Abierto'), disabled: true },
            { name: 'jornada', label: 'Jornada', type: 'text', defaultValue: last?.workShift?.type || '—', disabled: true },
            { name: 'puesto', label: 'Puesto', type: 'text', defaultValue: enumsEmployer.jobsIndex[last?.position]?.name || '—', disabled: true },
            { name: 'dispositivo', label: 'Dispositivo', type: 'text', defaultValue: enumsEmployer.dispositiveIndex[last?.dispositiveId]?.name || '—', disabled: true },
        ];
    };

    useEffect(() => {
        if (!infoUserWork) return;

        let alive = true;

        (async () => {
            setLoadingFields(true);
            const fields = await buildFieldsForModal(infoUserWork);
            if (alive) setFieldsModal(fields);
            setLoadingFields(false);
        })();

        return () => { alive = false };
    }, [infoUserWork]);


    // -------------------------------------------------------
    // 🔥 NOTAS Y COMENTARIOS DEL CANDIDATO
    // -------------------------------------------------------

    const saveComment = async () => {
        if (!textComment.trim() || !typeComment) return;

        const payload = {
            _id: user._id,
            id: logged.user._id,
            nameUser: logged.user.firstName,
            [typeComment]: textComment.trim(),
            ...(Offer ? { offerId: Offer._id } : {})
        };

        const response = await modifyUser(payload);

        if (!response.error) {
            changeUser(response);
            modal("Comentario guardado", "El comentario se ha guardado correctamente");
        } else {
            modal("Error", "No se pudo guardar el comentario");
        }

        setTextComment('');
        setTypeComment(null);
    };

    const deleteCvConfirm = () => deleteUser();

    const handleChangeType = (type) => {
        setTypeComment(prev => prev === type ? null : type);
        setTextComment('');
    };


    // -------------------------------------------------------
    // 🔥 RENDER FINAL
    // -------------------------------------------------------

    if (!user) return null;

    return (
        <div className={styles.contenedorCV}>
            <div className={styles.comments}>
                <div className={styles.iconos}>

                    {/* ⭐ / ⛔ / 👁 — Estados por oferta */}
                    <CandidateStatusIcons
                        userId={user._id}
                        user={user}
                        Offer={Offer}
                        updateOfferArray={updateOfferArray}
                        onNeedOffer={() => setSelectedOfferAndAddUser(user)}
                        addUserToOffer={addUserAutomaticallyToOffer}
                        onDeferredField={recordDeferredField}
                    />

                    {/* Panel root */}
                    {logged.user.role === "root" && (
                        <>
                            <RiDeleteBin6Line onClick={() => setDeletePanel(true)} />
                            <FaRegEdit onClick={() => setPanelEditUser(true)} />
                        </>
                    )}

                    {/* Añadir manualmente a oferta (legacy) */}
                    {!Offer ? (
                        <IoBagAdd onClick={() => setSelectedOfferAndAddUser(user)} />
                    ) : (
                        <IoBagCheck style={{ color: "lightgreen" }} />
                    )}

                    {/* Estados globales */}
                    <div className={styles.cajaiconosglobales}>
                        {user.reject ? (
                            <BsExclamationOctagonFill
                                className={styles.iconoRechazar}
                                onClick={() => clearGlobalStatus("reject")}
                            />
                        ) : (
                            <BsExclamationOctagon onClick={openRejectModal} />
                        )}

                        {user.favorite ? (
                            <GoStarFill
                                className={styles.iconoFavorito}
                                onClick={() => clearGlobalStatus("favorite")}
                            />
                        ) : (
                            <GoStar onClick={openFavoriteModal} />
                        )}
                    </div>

                </div>

                {/* Confirm delete */}
                {deletePanel && (
                    <div className={styles.deletePanel}>
                        <p>¿Seguro que deseas borrar este CV?</p>
                        <button onClick={deleteCvConfirm}>Sí, borrar</button>
                        <button onClick={() => setDeletePanel(false)}>Cancelar</button>
                    </div>
                )}

                {/* Contratación */}
                <div className={styles.cajaBotonesContratar}>
                    <ToHireEmployee 
                        changeUser={changeUser}
                        chargeOffers={chargeOffers}
                        enumsEmployer={enumsEmployer}
                        offers={[]}
                        userSelected={user}
                        modal={modal}
                        charge={charge}
                    />
                    {user.workedInEngloba?.status && (
                        <button className='btn-outline-secondary' onClick={() => infoUserW(user.dni)}>
                            Información del Empleado
                        </button>
                    )}
                </div>

                {/* Info básica */}
                <InfoUser user={user} enumsEmployer={enumsEmployer} />

                {/* Notas */}
                <div className={styles.boxComments}>
                    <h2>
                        Notas <BsBookmarkPlusFill onClick={() => handleChangeType('notes')} />
                    </h2>

                    {typeComment === 'notes' && (
                        <div className={styles.contentComment}>
                            <h4>Añadir nota</h4>
                            <textarea value={textComment} onChange={(e) => setTextComment(e.target.value)} />
                            <button onClick={saveComment} disabled={!textComment.trim()}>
                                Guardar Nota
                            </button>
                            <button onClick={() => setTypeComment(null)}>Cancelar</button>
                        </div>
                    )}

                    {(!user.notes || user.notes.length === 0) && <p>No hay notas</p>}

                    {user.notes?.map(x => (
                        <div key={x._id} className={styles.commentBox}>
                            <p><PiPersonFill /> {titleCaseES(x.userCv?.firstName)} {titleCaseES(x.userCv?.lastName)}</p>
                            <p><FaCalendarAlt /> {formatDatetime(x.date)}</p>
                            <p>{x.message}</p>
                        </div>
                    ))}
                </div>

                {/* Comentarios */}
                <div className={styles.boxComments}>
                    <h2>
                        Comentarios
                        <FaPhoneAlt onClick={() => handleChangeType('commentsPhone')} />
                        <MdVideoCall onClick={() => handleChangeType('commentsVideo')} />
                        <IoPersonSharp onClick={() => handleChangeType('commentsInperson')} />
                    </h2>

                    {typeComment && typeComment !== 'notes' && (
                        <div className={styles.contentComment}>
                            <h4>Comentario</h4>
                            <textarea value={textComment} onChange={(e) => setTextComment(e.target.value)} />
                            <button onClick={saveComment} disabled={!textComment.trim()}>Guardar</button>
                            <button onClick={() => setTypeComment(null)}>Cancelar</button>
                        </div>
                    )}

                    {/* Listado comentarios */}
                    {['commentsPhone', 'commentsVideo', 'commentsInperson'].map(type => (
                        user[type]?.length > 0 && (
                            <div key={type} className={styles.about}>
                                <h3>{type === 'commentsPhone'
                                    ? 'Entrevistas Telefónicas'
                                    : type === 'commentsVideo'
                                        ? 'Entrevistas Videollamada'
                                        : 'Entrevistas Presenciales'}</h3>

                                {user[type].map(x => (
                                    <div key={x._id} className={styles.commentBox}>
                                        <p><PiPersonFill /> {titleCaseES(x.userCv.firstName)} {titleCaseES(x.userCv.lastName)}</p>
                                        <p><FaCalendarAlt /> {formatDatetime(x.date)}</p>
                                        <p>{x.message}</p>
                                    </div>
                                ))}
                            </div>
                        )
                    ))}

                    {user.about && (
                        <div className={styles.about}>
                            <h3>Sobre mí</h3>
                            <p>{user.about}</p>
                        </div>
                    )}
                </div>
            </div>

            {/* PDF VISOR */}
            <Suspense fallback={
                <div className={styles.pdfSkeleton}>
                    <div className={styles.spinner} />
                    <span>Cargando visor…</span>
                </div>
            }>
                {urlpdf?.loading ? (
                    <div className={styles.pdfSkeleton}>
                        <div className={styles.spinner} />
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

            {/* Modal Info Usuario */}
            {infoUserWork && (
                loadingFields ? (
                    <div className={styles.pdfSkeleton}>
                        <div className={styles.spinner} />
                        <span>Cargando datos…</span>
                    </div>
                ) : (
                    <ModalForm
                        title="Información laboral"
                        fields={fieldsModal}
                        onSubmit={() => setInfoUserWork(null)}
                        onClose={() => setInfoUserWork(null)}
                        modal={modal}
                    />
                )
            )}

            {/* Editar Usuario */}
            {panelEditUser && (
                <FormJobUp
                    modal={modal}
                    charge={charge}
                    user={user}
                    changeUser={(updated) => {
                        changeUser(updated);
                        setPanelEditUser(false);
                    }}
                    closeModalEdit={() => setPanelEditUser(false)}
                />
            )}

            {/* Modal Estados Globales */}
            {globalStatusModal && (
                <ModalForm
                    title={globalStatusModal === "favorite"
                        ? "Candidato Ejemplar"
                        : "Rechazar Globalmente"}
                    message={globalStatusModal === "favorite"
                        ? "Marcar como candidato ejemplar para futuras ofertas."
                        : "Rechazar globalmente al candidato para ofertas actuales y futuras."}
                    fields={[
                        { name: "reason", label: "Motivo", type: "textarea", required: true }
                    ]}
                    onSubmit={(data) => saveGlobalStatus(data.reason)}
                    onClose={() => setGlobalStatusModal(null)}
                    modal={modal}
                />
            )}
        </div>
    );
};

export default React.memo(CvPanel, (prev, next) =>
    prev.urlpdf === next.urlpdf &&
    prev.user === next.user &&
    prev.charge === next.charge &&
    prev.modal === next.modal &&
    prev.changeUser === next.changeUser
);
