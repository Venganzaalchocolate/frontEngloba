import { useEffect, useState, useMemo } from 'react';
import styles from '../styles/offerJobsPanel.module.css';
import ViewJobs from './ViewJobs';
import FiltersOffers from './FiltersOffers'; // <-- El nuevo componente de filtros
import { getOfferJobs } from '../../lib/data';
import { FaSquarePlus } from "react-icons/fa6";
import { getToken } from '../../lib/serviceToken';
import FormOffer from './FormOffer.jsx';
import JobDetails from './JobDetails.jsx';

const OfferJobsPanel = ({ modal, charge, enumsData }) => {
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

  // --------------------------------------------------
  //  Filtrado de ofertas en base a "filters"
  // --------------------------------------------------
  const filteredOffers = useMemo(() => {
    if (!offers || offers.length === 0) return [];

    return offers.filter((offer) => {
      const offerYear = new Date(offer.createdAt).getFullYear();
      const offerMonth = new Date(offer.createdAt).getMonth() + 1;
      
      // Filtro por año (si hay uno seleccionado)
      if (filters.year && parseInt(filters.year) !== offerYear) {
        return false;
      }
      // Filtro por mes (si hay uno seleccionado)
      if (filters.month && parseInt(filters.month) !== offerMonth) {
        return false;
      }
      // Filtro por provincia
      if (filters.province && filters.province !== offer.province) {
        return false;
      }
      // Filtro por programa
      if (filters.programId && filters.programId !== offer.dispositive.programId) {
        return false;
      }
      // Filtro por dispositivo
      if (filters.deviceId && filters.deviceId !== offer.dispositive.dispositiveId) {
        return false;
      }

      if(filters.active=='si' &&  offer.active){
       return true; 
      }
      
      if(filters.active=='no' &&  !offer.active){
        return true; 
       }
      
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
              changeOffers={changeOffers}
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
