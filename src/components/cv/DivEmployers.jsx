import React from 'react';

// Importar iconos de react-icons (ajusta según tu caso)
import { FaCheckCircle, FaTimesCircle, FaRegEyeSlash, FaEye } from 'react-icons/fa';
import { GoStarFill, GoStar } from 'react-icons/go';
import { BsExclamationOctagonFill, BsExclamationOctagon } from 'react-icons/bs';
import { FaWheelchair } from "react-icons/fa6";

// Importa tu componente CvPanel (ajusta la ruta según tu estructura)
import CvPanel from './CvPanel';

// Importa tus estilos (ajusta las rutas y nombres según tu proyecto)
import styles from '../styles/managingResumenes.module.css';
import stylesTooltip from '../styles/tooltip.module.css';
import { FaHouseUser } from "react-icons/fa";
/**
 * Este componente mostrará la lista de usuarios, con la lógica de mapeo que antes tenías en createDivEmployer.
 * @param {Array} users - Lista de usuarios
 * @param {String} keySuffix - Sufijo para las keys (ej: "bag")
 * @param {Function} checkUser - Función que retorna la clase CSS a usar
 * @param {Function} lookCV - Función para manejar el click y mostrar el CV
 * @param {Function} formatDatetime - Función para formatear la fecha
 * @param {Object} userSelected - Usuario actualmente seleccionado
 * @param {any} charge - Prop que usas dentro del CvPanel (si aplica)
 * @param {String} urlCv - URL del CV (para el panel)
 * @param {Function} changeUser - Función para actualizar el usuario (en CvPanel)
 * @param {Boolean} modal - Estado de un modal (si aplica)
 * @param {Function} deleteUser - Función para eliminar el usuario (si aplica)
 * @param {Object} enumsEmployer - Objeto con enumeraciones para el empleador
 */
function DivEmployers({
  users = [],
  keySuffix = '',
  checkUser,
  lookCV,
  formatDatetime,
  userSelected,
  charge,
  urlCv,
  changeUser,
  modal,
  deleteUser,
  enumsEmployer,
  offerSelected, 
  changeOffer,
  modalBagView, 
  listOffers,
  chargeOffers
}) 


{
  
  return (
    <>
      {users.length > 0 &&
        users.map((user) => (
          <div key={user._id + keySuffix}>
            {/* Fila principal con la información del usuario */}
            <div className={checkUser(user)} onClick={() => lookCV(user._id, user)}>
              <div className={`${styles.tableCell} ${styles.capitalize}`}>{
              (user?.workedInEngloba) && <span className={stylesTooltip.tooltip}>
                <FaHouseUser className={styles.iconworkedInEngloba}/>
                <span className={stylesTooltip.tooltiptext}>
                    Ha trabajado o trabaja en Engloba
                </span>
                </span>}
              
              
              {user.name}</div>
              <div className={styles.tableCell}>{user.email}</div>
              <div className={styles.tableCell}>{user.phone}</div>
              <div className={styles.tableCell}>{user.jobs.join(', ')}</div>
              <div className={styles.tableCell}>{user.studies.join(', ')}</div>
              <div className={styles.tableCell}>
                {user.provinces.length !== 11 ? user.provinces.join(', ') : 'Todas'}
              </div>
              <div className={styles.tableCell}>
           
                {user.offer != null ? (
                  <span className={stylesTooltip.tooltip}>
                    <FaCheckCircle />
                    <span className={stylesTooltip.tooltiptext}>
                    {listOffers.find((x) => x._id === user.offer)?.job_title || 'Oferta desconocida'}

                    </span>
                  </span>
                ) : (
                  <span className={stylesTooltip.tooltip}>
                    <FaTimesCircle />
                    <span className={stylesTooltip.tooltiptext}>
                      No asociado a una oferta
                    </span>
                  </span>
                )}
              </div>
              <div className={styles.tableCell}>
                <span className={stylesTooltip.tooltip}>
                  {user.numberCV}
                  <span className={stylesTooltip.tooltiptext}>Versión</span>
                </span>
              </div>
              <div className={styles.tableCell}>
                {user.view ? (
                  <span className={stylesTooltip.tooltip}>
                    <FaEye />
                    <span className={stylesTooltip.tooltiptext}>Visto</span>
                  </span>
                ) : (
                  <span className={stylesTooltip.tooltip}>
                    <FaRegEyeSlash />
                    <span className={stylesTooltip.tooltiptext}>No Visto</span>
                  </span>
                )}
                {user.favorite ? (
                  <span className={stylesTooltip.tooltip}>
                    <GoStarFill />
                    <span className={stylesTooltip.tooltiptext}>Favorito</span>
                  </span>
                ) : (
                  <span className={stylesTooltip.tooltip}>
                    <GoStar />
                    <span className={stylesTooltip.tooltiptext}>No Favorito</span>
                  </span>
                )}
                {user.reject ? (
                  <span className={stylesTooltip.tooltip}>
                    <BsExclamationOctagonFill />
                    <span className={stylesTooltip.tooltiptext}>Rechazado</span>
                  </span>
                ) : (
                  <span className={stylesTooltip.tooltip}>
                    <BsExclamationOctagon />
                    <span className={stylesTooltip.tooltiptext}>No Rechazado</span>
                  </span>
                )}
                {user.disability>0 && (
                  <span className={stylesTooltip.tooltip}>
                    <FaWheelchair  />
                    <span className={stylesTooltip.tooltiptext}>Tiene {user.disability}% de discapacidad</span>
                  </span>
                )}
              </div>
              <div className={styles.tableCell}>{formatDatetime(user.date)}</div>
            </div>
       
            {/* Renderiza el panel si el usuario está seleccionado */}
            {userSelected && userSelected._id === user._id && (
              <CvPanel
              chargeOffers={chargeOffers}
                modalBagView={modalBagView}
                charge={charge}
                urlpdf={urlCv}
                user={userSelected}
                changeUser={changeUser}
                modal={modal}
                deleteUser={deleteUser}
                offers={listOffers}
                enumsEmployer={enumsEmployer}
                offerSelected={offerSelected} 
                changeOffer={(x)=>changeOffer(x)}
              />
            )}
          </div>
        ))}
    </>
  );
}

export default DivEmployers;
