import { formatDate } from "../../lib/utils";
import styles from '../styles/viewOfferJobs.module.css';
import { getToken } from "../../lib/serviceToken";
import { updateOffer } from "../../lib/data";
import { useLogin } from '../../hooks/useLogin';
import { FaAdjust } from "react-icons/fa";

const ViewJobs = ({ charge, offerSelect, offers, changeOffers, enumsData }) => {
  const { logged } = useLogin(); // por si necesitas el rol

  const changeStatusOffer = async (status, id) => {
    charge(true);
    const token = getToken();
    const auxData = { id, active: status };
    const offerNew = await updateOffer(auxData, token);
    changeOffers(offerNew);
    charge(false);
  };

  const viewOffer = (offer) => {
    offerSelect(offer);
  };

  return (
    <div className={styles.contenedorOferta}>
      <div className={styles.cardContainer}>
        {offers.length === 0 ? (
          <p>No hay ofertas disponibles.</p>
        ) : (
          offers.map((offer) => {
            // Obtener la info de programa/dispositivo
            const programa = enumsData.programsIndex[offer.dispositive.programId];
            const dispositivo = enumsData.programsIndex[offer.dispositive.dispositiveId];

            return (
              <div key={offer._id} className={styles.card}>
                <div className={styles.cardToolBar}>
                
                 <p>Tipo: {offer.type=='internal' ? "Interna" : "Pública"}</p>
                 <FaAdjust color={(offer.active )?'lightgreen':'tomato'}/>  
                </div>
                

                <h3 className={styles.cardTitle}>{offer.functions}</h3>
               
                <p className={styles.cardInfo}>
                  <strong>Localidad:</strong> {offer.location}
                </p>
                <p className={styles.cardInfo}>
                  <strong>Provincia:</strong> {offer.province}
                </p>
                <p className={styles.cardInfo}>
                  <strong>Programa:</strong> {programa?.name}
                </p>
                <p className={styles.cardInfo}>
                  <strong>Dispositivo:</strong> {dispositivo?.name}
                </p>
                <p className={styles.cardInfo}>
                  <strong>Creado:</strong> {formatDate(offer.createdAt)}
                </p>
                <div className={styles.cardActions}>
                <button
                    className={offer.active ? 'tomato' : ''}
                    onClick={() => changeStatusOffer(offer.active ? 'no' : 'si', offer._id)}
                  >
                    {offer.active ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    className={styles.viewButton}
                    onClick={() => viewOffer(offer)}
                  >
                    Ver Detalles
                  </button>
                  {/* Botón de cambiar estado */}
                  
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default ViewJobs;
