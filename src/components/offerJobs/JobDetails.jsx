import { useState } from "react";
import FormOffer from "./FormOffer"; // Ahora usa FormOffer para edición
import styles from "../styles/jobDetails.module.css";

const JobDetails = ({ offer, onClose, charge, modal, changeOffers, enumsData }) => {
    const [isEditing, setIsEditing] = useState(false);

    if (!offer) return null; // No renderizar si no hay oferta seleccionada

    const programa=enumsData.programsIndex[offer.dispositive.programId];
    const dispositive=enumsData.programsIndex[offer.dispositive.dispositiveId];
    return (
        <>
            {/* Mostrar detalles de la oferta cuando no está en modo edición */}
            {!isEditing && (
                <div className={styles.modalOverlay}>
                    <div className={styles.modalContent}>
                        <h2 className={styles.modalTitle}>{offer.functions}</h2>
                        <p className={styles.modalInfo}><strong>Ubicación:</strong> {offer.location}, {offer.province}</p>
                        <p className={styles.modalInfo}><strong>Horario:</strong> {offer.work_schedule}</p>
                        <p className={styles.modalInfo}>
                            <strong>Estado:</strong> 
                            <span className={offer.active ? styles.active : styles.inactive}>
                                {offer.active ? "Activo" : "Inactivo"}
                            </span>
                        </p>
                        <p className={styles.modalInfo}><strong>Programa:</strong> {programa.name }</p>
                        <p className={styles.modalInfo}><strong>Dispositivo:</strong> {dispositive.name }</p>
                        <p className={styles.modalInfo}><strong>Requisitos esenciales:</strong> {offer.essentials_requirements || "No especificado"}</p>
                        <p className={styles.modalInfo}><strong>Requisitos opcionales:</strong> {offer.optionals_requirements || "No especificado"}</p>
                        <p className={styles.modalInfo}><strong>Condiciones:</strong> {offer.conditions || "No especificado"}</p>
                        <p className={styles.modalInfo}><strong>Fecha esperada de incorporación:</strong> {offer.expected_incorporation_date}</p>
                        <p className={styles.modalInfo}><strong>SEPE:</strong> {offer.sepe ? "Sí" : "No"}</p>

                        <div className={styles.modalActions}>
                            <button className={styles.editButton} onClick={() => setIsEditing(true)}>Editar</button>
                            <button className='tomato' onClick={onClose}>Cerrar</button>
                        </div>
                    </div>
                </div>
            )}

            {/* Mostrar `FormOffer` en modo edición cuando se quiere editar */}
            {isEditing && (
                <FormOffer
                    offer={offer}  // Pasar la oferta actual para editarla
                    closeModal={() => setIsEditing(false)}  // Volver a la vista de detalles
                    enumsData={enumsData}
                    modal={modal}
                    charge={charge}
                    changeOffers={changeOffers}
                />
            )}
        </>
    );
};

export default JobDetails;
