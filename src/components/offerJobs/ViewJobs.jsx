import { useEffect, useState } from "react";
import { getOfferJobs, updateOffer } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

import styles from '../styles/viewOfferJobs.module.css';
import { formatDate, formatDatetime } from "../../lib/utils";
import { useLogin } from '../../hooks/useLogin';

const ViewJobs=({ charge, offerSelect, offers, changeOffers, enumsData})=>{

    const changeStatusOffer = async (status, id) => {
        charge(true);
        const token = getToken();
        const auxData = { id, active: status };
        const offerNew = await updateOffer(auxData, token);
        console.log(offerNew)
        changeOffers(offerNew);
        charge(false);
    };

    const viewOffer = (offer) => {
        offerSelect(offer);
    };

    

    return <div className={styles.contenedorOferta}>
            <div className={styles.cardContainer}>
            {offers.length === 0 ? (
                <p>No hay ofertas disponibles.</p>
            ) : (
                offers.map((offer) => {
                    const programa=enumsData.programsIndex[offer.dispositive.programId];
                    const dispositive=enumsData.programsIndex[offer.dispositive.dispositiveId];
                  return (
                    <div key={offer._id} className={styles.card}>
                        <h3 className={styles.cardTitle}>{offer.functions}</h3>
                        <p className={styles.cardInfo}>
                            <strong>Ubicación:</strong> {offer.location}, {offer.province}
                        </p>
                        <p className={styles.cardInfo}>
                            <strong>Programa:</strong> {programa.name}
                        </p>
                        <p className={styles.cardInfo}>
                            <strong>Dispositivo:</strong> {dispositive.name}
                        </p>
                        <p className={styles.cardStatus}>
                            <strong>Estado:</strong>{" "}
                            <span className={offer.active ? styles.active : styles.inactive}>
                                {offer.active ? "Activo" : "Inactivo"}
                            </span>
                        </p>
                        <p className={styles.cardInfo}>
                            <strong>Creado:</strong> {formatDate(offer.createdAt) }
                        </p>
                        <div className={styles.cardActions}>
                            <button className={styles.viewButton} onClick={() => viewOffer(offer)}>
                                Ver Detalles
                            </button>
                            <button
                                className={offer.active ? 'tomato' : ''}
                                onClick={() => changeStatusOffer((offer.active)?'no':'si', offer._id)}
                            >
                                {offer.active ? "Desactivar" : "Activar"}
                            </button>
                        </div>
                    </div>
                )  
                })
            )}
        </div>

        
    </div>
}

export default ViewJobs;