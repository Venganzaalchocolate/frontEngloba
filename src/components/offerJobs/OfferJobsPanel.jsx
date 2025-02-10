import { useEffect, useState } from 'react';
import styles from '../styles/offerJobsPanel.module.css';
import ViewJobs from './ViewJobs';
import { getOfferJobs } from '../../lib/data';
import { FaSquarePlus } from "react-icons/fa6";
import { getToken } from '../../lib/serviceToken';
import FormOffer from './FormOffer.jsx';
import JobDetails from './JobDetails.jsx';

const OfferJobsPanel = ({ modal, charge, enumsData }) => {
    const [action, setAction] = useState(null);
    const [offerSelected, setOfferSelected] = useState(null);
    const [offers, setOffers] = useState(null);

    const cargarDatos = async () => {
        const token = getToken();
        const data = await getOfferJobs(token);
        if (!data.error) {
            setOffers(data);
        } else {
            modal('Error', 'Servicio no disponible, por favor inténtelo más tarde');
        }
        charge(false);
    };

    useEffect(() => {
        charge(true);
        
        cargarDatos();
    }, []);

    // Seleccionar una oferta y mostrar detalles
    const offerSelect = (offer) => {
        setAction(null); // No está en modo edición
        setOfferSelected(offer);
    };

    // Cambiar a modo de creación
    const changeAction = () => {
        setOfferSelected(null);
        setAction('create');
    };

    // Actualizar lista de ofertas tras edición o creación
    const changeOffers = (offer) => {
        let exists = false;
        const offersAux = [...offers];
        offersAux.forEach((x, i, a) => {
            if (x._id === offer._id) {
                a[i] = offer;
                exists = true;
            }
        });
        if (!exists) offersAux.push(offer);
        setOfferSelected(null);
        setOffers(offersAux);
    };

    // Volver al panel principal
    const back = () => {
        setOfferSelected(null);
        setAction(null);
    };

    return (
        <>
            <div className={styles.contenedor}>
                <div className={styles.contenido}>
                    <div className={styles.titulo}>
                        <h2>GESTIÓN DE OFERTAS</h2>
                        <FaSquarePlus onClick={changeAction} />
                    </div>
                    <div className={styles.caja}>
                        {!!offers && <ViewJobs enumsData={enumsData} charge={charge} offerSelect={offerSelect} offers={offers} changeOffers={changeOffers} />}
                    </div>
                </div>
            </div>

            {/* Mostrar detalles de la oferta con JobDetails */}
            {offerSelected && (
                <JobDetails
                    offer={offerSelected}
                    onClose={back}
                    enumsData={enumsData}
                    modal={modal}
                    charge={charge}
                    changeOffers={changeOffers}
                />
            )}

            {/* Mostrar formulario de creación */}
            {action === 'create' && (
                <FormOffer
                    
                    offer={null}  // En modo creación no hay oferta previa
                    closeModal={back}
                    enumsData={enumsData}
                    modal={modal}
                    charge={charge}
                    changeOffers={changeOffers}
                />
            )}
        </>
    );
};

export default OfferJobsPanel;
