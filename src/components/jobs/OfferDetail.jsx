import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MdAccessTimeFilled } from "react-icons/md";
import { FaRegCalendarDays } from "react-icons/fa6";
import { FaMapMarkedAlt } from "react-icons/fa";
import styles from '../styles/offerDetails.module.css';

const OfferDetail = ({ data, reset }) => {
  const navigate = useNavigate();

  return (
    <div className={styles.contenedorOferta}>
      {/* Título con "Funciones" si existe */}
      {data.functions && <h2>{data.functions}</h2>}

      {/* Panel de iconos, cada uno se muestra sólo si el campo existe */}
      <div className={styles.contenedorIconos}>
        {data.work_schedule && (
          <div>
            <MdAccessTimeFilled />
            <div>
              <p>JORNADA</p>
              <p>{data.work_schedule}</p>
            </div>
          </div>
        )}

        {data.expected_incorporation_date && (
          <div>
            <FaRegCalendarDays />
            <div>
              <p>INCORPORACIÓN</p>
              <p>{data.expected_incorporation_date}</p>
            </div>
          </div>
        )}

        {data.location && (
          <div>
            <FaMapMarkedAlt />
            <div>
              <p>LOCALIDAD</p>
              <p>{data.location}</p>
            </div>
          </div>
        )}
      </div>

      {/* Campo "Provincia" si existe */}
      {data.province && (
        <div className={styles.campo}>
          <h3>Provincia</h3>
          <p>{data.province}</p>
        </div>
      )}

      {/* Requisitos Esenciales si existen */}
      {data.essentials_requirements && (
        <div className={styles.campoLineas}>
          <h3>Requisitos Esenciales</h3>
          <p>{data.essentials_requirements}</p>
        </div>
      )}

      {/* Requisitos que se valorarán si existen */}
      {data.optionals_requirements && (
        <div className={styles.campoLineas}>
          <h3>Requisitos que se valorarán</h3>
          <p>{data.optionals_requirements}</p>
        </div>
      )}

      {/* Funciones si existen */}
      {data.functions && (
        <div className={styles.campo}>
          <h3>Funciones a desempeñar</h3>
          <p>{data.functions}</p>
        </div>
      )}

      {/* Condiciones si existen */}
      {data.conditions && (
        <div className={styles.campoLineas}>
          <h3>Condiciones</h3>
          <p className={styles.conditions}>{data.conditions}</p>
        </div>
      )}

      {/* Estudios (array) si existe y tiene elementos */}
      {data.studies && data.studies.length > 0 && (
        <div className={styles.campo}>
          <h3>Estudios</h3>
          <ul>
            {data.studies.map((study, idx) => (
              <li key={idx}>{study}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Botones al final (siempre visibles, pero puedes condicionar si quieres) */}
      <div className={styles.contenedorBotones}>
        <button onClick={() => navigate(`/trabajaconnosotros/${data._id}`)}>
          Enviar Curriculum
        </button>
        <button className="tomato" onClick={() => reset()}>
          Cancelar
        </button>
      </div>
    </div>
  );
};

export default OfferDetail;
