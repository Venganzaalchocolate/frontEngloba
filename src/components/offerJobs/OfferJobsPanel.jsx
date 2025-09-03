import { useEffect, useState, useMemo } from 'react';
import styles from '../styles/offerJobsPanel.module.css';
import ViewJobs from './ViewJobs';
import FiltersOffers from './FiltersOffers'; // <-- El nuevo componente de filtros
import { getOfferJobs } from '../../lib/data';
import { FaSquarePlus } from "react-icons/fa6";
import { getToken } from '../../lib/serviceToken';
import FormOffer from './FormOffer.jsx';
import JobDetails from './JobDetails.jsx';
import { useOffer } from "../../hooks/useOffer";

const OfferJobsPanel = ({ modal, charge, enumsData, chargeOffers = () => {} }) => {

  const [action, setAction] = useState(null);
  const [offerSelected, setOfferSelected] = useState(null);
  const [offers, setOffers] = useState([]);

  // Estado de filtros: año, mes, provincia, programId, deviceId, etc.
  const [filters, setFilters] = useState({
    year: "",
    month: "",
    province: "",
    programId: "",
    deviceId: "",
    active:'si'
  });

  // Función para resetear filtros
  const resetFilters = () => {
    setFilters({
      year: "",
      month: "",
      province: "",
      programId: "",
      deviceId: "",
      active:'si'
    });
  };

  // Cargar datos de ofertas desde el backend
  const cargarDatos = async () => {
    charge(true);
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
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Seleccionar una oferta y mostrar detalles
  const offerSelect = (offer) => {
    setAction(null); // No está en modo creación/edición
    setOfferSelected(offer);
  };

  // Cambiar a modo de creación
  const changeAction = () => {
    setOfferSelected(null);
    setAction('create');
  };

    /* ---------- Añadir / actualizar una oferta ---------- */
const upsertOffer = (offer) => {
  setOffers(prev => {
    const exists = prev.some(o => o._id === offer._id);
    return exists
      ? prev.map(o => (o._id === offer._id ? offer : o))
      : [...prev, offer];
  });

  chargeOffers(offer);   // solo sincroniza enumsEmployer
  setOfferSelected(null);
};


  // Volver al panel principal
  const back = () => {
    setOfferSelected(null);
    setAction(null);
  };

  // --------------------------------------------------
  //  Filtrado de ofertas en base a "filters"
  // --------------------------------------------------
const filteredOffers = useMemo(() => {
  if (!offers || offers.length === 0) return [];

  return offers.filter((offer) => {
    const offerYear = new Date(offer.createdAt).getFullYear();
    const offerMonth = new Date(offer.createdAt).getMonth() + 1;

    if (filters.year && +filters.year !== offerYear) return false;
    if (filters.month && +filters.month !== offerMonth) return false;
    if (filters.province && filters.province !== offer.province) return false;
    if (filters.programId && filters.programId !== offer.dispositive.programId) return false;
    if (filters.deviceId && filters.deviceId !== offer.dispositive.dispositiveId) return false;

    if (filters.active === 'si')  return !!offer.active;
    if (filters.active === 'no')  return !offer.active;
    return true; // <- imprescindible cuando está vacío u otro valor
  });
}, [offers, filters]);


  
  return (
    <>
      <div className={styles.contenedor}>
        <div className={styles.contenido}>
          {/* Título y botón para crear nueva oferta */}
          <div className={styles.titulo}>
            <h2>GESTIÓN DE OFERTAS</h2>
            <FaSquarePlus onClick={changeAction} />
          </div>

          {/* Aquí incluimos el panel de filtros solo para root */}

          <FiltersOffers
            filters={filters}
            setFilters={setFilters}
            offers={offers}
            enumsData={enumsData}
            resetFilters={resetFilters}
          />

          <div className={styles.caja}>
            <ViewJobs
              enumsData={enumsData}
              charge={charge}
              offerSelect={offerSelect}
              offers={filteredOffers}  
              changeOffers={chargeOffers}
            />
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
          changeOffers={upsertOffer}
        />
      )}

      {/* Mostrar formulario de creación */}
       {action === 'create' && (
        <FormOffer
          offer={null}
          closeModal={back}
          enumsData={enumsData}
          modal={modal}
          charge={charge}
          changeOffers={upsertOffer}
        />
      )}
    </>
  );
};

export default OfferJobsPanel;
