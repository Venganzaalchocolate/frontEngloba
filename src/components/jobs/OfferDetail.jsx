import React, { useState } from 'react';
import styles from '../styles/offerDetails.module.css';
import { useNavigate } from 'react-router-dom';
import { MdAccessTimeFilled } from "react-icons/md";
import { FaRegCalendarDays } from "react-icons/fa6";
import stylesTooltip from '../styles/tooltip.module.css';
import { FaMapMarkedAlt } from "react-icons/fa";

const OfferDetail = ({data, reset}) => {
  const navigate = useNavigate();

  return (
    <div className={styles.contenedorOferta}>
      <h2>{data.job_title}</h2>
      <div className={styles.contenedorIconos}>
        <div>
          <MdAccessTimeFilled/>
          <div>
            <p>JORNADA</p>
            <p>{data.work_schedule}</p>
          </div>
        </div>
        <div>
          <FaRegCalendarDays/>
          <div>
            <p>INCORPORACIÓN</p>
            <p>{data.expected_incorporation_date}</p>
          </div>
          
        </div>
        <div>
          <FaMapMarkedAlt/>
          <div>
            <p>LOCALIDAD</p>
            <p>{data.location}</p>
          </div>
          
        </div>
      </div>
      <div className={styles.campo}>
        <h3>Provincia</h3>
        <p>{data.province}</p>  
      </div>
      <div className={styles.campo}>
        <h3>Requisitos Esenciales</h3>
        <p>{data.essentials_requirements}</p>  
      </div>
      {!!data.optionals_requirements && 
      <div className={styles.campo}>
        <h3>Requisitos que se valorarán</h3>
        <p>{data.optionals_requirements}</p>  
      </div>
      }
      
      <div className={styles.campo}>
        <h3>Funciones a desempeñar</h3>
        <p>{data.functions}</p>  
      </div>
      <div className={styles.campo}>
        <h3>Condiciones</h3>
        <p className={styles.conditions}>{data.conditions}</p>  
      </div>
      <div className={styles.contenedorBotones}>
        <button onClick={()=>navigate(`/trabajaconnosotros/${data._id}`)}>Enviar Curriculum</button>
        <button className='tomato' onClick={()=>reset()}>Cancelar</button>
      </div>
    </div>
  );
};

export default OfferDetail;