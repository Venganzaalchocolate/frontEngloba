import React, { useEffect, useMemo, useState } from 'react';

// Iconos
import { FaCheckCircle, FaTimesCircle, FaWheelchair, FaHouseUser } from 'react-icons/fa';
import { GoStarFill, GoStar } from 'react-icons/go';
import { BsExclamationOctagonFill, BsExclamationOctagon } from 'react-icons/bs';
import { MdEmail } from "react-icons/md";

// Componentes
import CvPanel from './CvPanel';
import OfferSelect from './OfferSelect';

// Estilos
import styles from '../styles/managingResumenes.module.css';
import stylesTooltip from '../styles/tooltip.module.css';

// Utils
import { formatESPhone } from '../../lib/utils';

/* Helpers */
const idsToNames = (ids, indexObj) => {
  if (!Array.isArray(ids) || !ids.length || !indexObj) return [];
  return ids.map((id) => indexObj?.[id]?.name).filter(Boolean);
};

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
  enumsEmployer,     // { jobsIndex, studiesIndex, provincesIndex, ... }
  offerSelected,
  changeOffer,
  listOffers,
  chargeOffers,
}) {
  const [selectedOfferAndAddUser, setSelectedOfferAndAddUser] = useState(null);

  // Si solo hay 1 resultado, ábrelo automáticamente (evita bucles si ya está seleccionado)
  useEffect(() => {
    if (Array.isArray(users) && users.length === 1) {
      const only = users[0];
      if (!userSelected || userSelected._id !== only._id) {
        lookCV?.(only._id, only);
      }
    }
  }, [users, userSelected, lookCV]);

  // Total de provincias "seleccionables" (hojas): subcategorías + raíces sin hijos
  const totalSelectableProvinces = useMemo(() => {
    const entries = Object.entries(enumsEmployer?.provincesIndex || {}); // [id, { name, parent?, isSub?, isRoot? }]
    if (!entries.length) return 0;

    // ids que son parent de alguien
    const parentIds = new Set(entries.map(([, v]) => v?.parent).filter(Boolean));
    // hoja = isSub || (no parent y no es parent de otros)
    const leaves = entries.filter(([id, v]) => v?.isSub || (!v?.parent && !parentIds.has(id)));
    return leaves.length;
  }, [enumsEmployer?.provincesIndex]);

  const isFavoriteForRow = (user) => {
    if (offerSelected && Array.isArray(offerSelected.favoritesCv)) {
      return offerSelected.favoritesCv.includes(user._id);
    }
    // fallback legacy
    return !!user.favorite;
  };

  const isRejectedForRow = (user) => {
    if (offerSelected && Array.isArray(offerSelected.rejectCv)) {
      return offerSelected.rejectCv.includes(user._id);
    }
    // fallback legacy
    return !!user.reject;
  };

  return (
    <>
      {users.length > 0 &&
        users.map((user) => {
          // Usar NUEVOS campos (fallback a legacy por si acaso)
          const jobsIds = Array.isArray(user.jobsId) ? user.jobsId : (Array.isArray(user.jobs) ? user.jobs : []);
          const studiesIds = Array.isArray(user.studiesId) ? user.studiesId : (Array.isArray(user.studies) ? user.studies : []);
          const provincesIds = Array.isArray(user.provincesId) ? user.provincesId : (Array.isArray(user.provinces) ? user.provinces : []);

          const jobNames = idsToNames(jobsIds, enumsEmployer?.jobsIndex).join(', ') || '—';
          const studyNames = idsToNames(studiesIds, enumsEmployer?.studiesIndex).join(', ') || '—';
          const provinceNames = idsToNames(provincesIds, enumsEmployer?.provincesIndex);
          const provincesText =
            provincesIds?.length
              ? (totalSelectableProvinces && provincesIds.length === totalSelectableProvinces
                ? 'Todas'
                : (provinceNames.join(', ') || '—'))
              : '—';

          // Tooltip de oferta: muestra el job name desde jobsIndex usando offer.jobId
          const offerObj = Array.isArray(listOffers)
            ? listOffers.find((x) => x._id === user.offer)
            : null;
          const offerJobName = offerObj?.jobId
            ? (enumsEmployer?.jobsIndex?.[offerObj.jobId]?.name || 'Oferta')
            : 'Oferta desconocida';

          return (
            <div key={user._id + keySuffix}>
              {/* Fila principal */}
              <div className={checkUser(user)} onClick={() => lookCV(user._id, user)}>
                <div className={styles.tableCell}>
                  <p className={styles.capitalize}>
                    {user?.workedInEngloba?.status && (
                      <span className={stylesTooltip.tooltip}>
                        <FaHouseUser className={styles.iconworkedInEngloba} />
                        <span className={stylesTooltip.tooltiptext}>
                          {user?.workedInEngloba?.active
                            ? 'Trabaja actualmente en Engloba'
                            : 'Ha trabajado anteriormente en Engloba'}
                        </span>
                      </span>
                    )}{' '}
                    {user.name}
                  </p>
                </div>

                <div className={styles.tableCell}>
                  <MdEmail size="1.5rem" onClick={() => modal(`${user.name}`, `${user.email}`)} />
                </div>

                <div className={styles.tableCell}>{formatESPhone(user.phone)}</div>
                <div className={styles.tableCell}>{jobNames}</div>
                <div className={styles.tableCell}>{studyNames}</div>
                <div className={styles.tableCell}>{provincesText}</div>

                <div className={styles.tableCell}>
                  {user.offer != null ? (
                    <span className={stylesTooltip.tooltip}>
                      <FaCheckCircle />
                      <span className={stylesTooltip.tooltiptext}>
                        {offerJobName}
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
                  {/* ⭐ Favorito según oferta seleccionada (o legacy) */}
                  {isFavoriteForRow(user) ? (
                    <span className={stylesTooltip.tooltip}>
                      <GoStarFill />
                      <span className={stylesTooltip.tooltiptext}>
                        {offerSelected ? "Favorito en esta oferta" : "Favorito"}
                      </span>
                    </span>
                  ) : (
                    <span className={stylesTooltip.tooltip}>
                      <GoStar />
                      <span className={stylesTooltip.tooltiptext}>
                        {offerSelected ? "No favorito en esta oferta" : "No Favorito"}
                      </span>
                    </span>
                  )}

                  {/* ⛔ Rechazo según oferta seleccionada (o legacy) */}
                  {isRejectedForRow(user) ? (
                    <span className={stylesTooltip.tooltip}>
                      <BsExclamationOctagonFill />
                      <span className={stylesTooltip.tooltiptext}>
                        {offerSelected ? "Rechazado en esta oferta" : "Rechazado"}
                      </span>
                    </span>
                  ) : (
                    <span className={stylesTooltip.tooltip}>
                      <BsExclamationOctagon />
                      <span className={stylesTooltip.tooltiptext}>
                        {offerSelected ? "No rechazado en esta oferta" : "No Rechazado"}
                      </span>
                    </span>
                  )}

                  {user.disability > 0 && (
                    <span className={stylesTooltip.tooltip}>
                      <FaWheelchair />
                      <span className={stylesTooltip.tooltiptext}>
                        Tiene {user.disability}% de discapacidad
                      </span>
                    </span>
                  )}
                </div>


                <div className={styles.tableCell}>{formatDatetime(user.updatedAt)}</div>
              </div>

              {/* Panel de CV si es el seleccionado */}
              {userSelected && userSelected._id === user._id && (
                <CvPanel
                  chargeOffers={chargeOffers}
                  setSelectedOfferAndAddUser={(u) => setSelectedOfferAndAddUser(u)}
                  charge={charge}
                  urlpdf={urlCv}
                  user={userSelected}
                  changeUser={changeUser}
                  modal={modal}
                  deleteUser={deleteUser}
                  offers={listOffers}
                  enumsEmployer={enumsEmployer}
                  offerSelected={offerSelected}
                  changeOffer={(x) => changeOffer(x)}
                />
              )}

              {selectedOfferAndAddUser && (
                <OfferSelect
                  offers={listOffers}
                  closeModal={() => setSelectedOfferAndAddUser(null)}
                  type="add"
                  userSelected={selectedOfferAndAddUser}
                  enumsData={enumsEmployer}
                  modal={modal}
                />
              )}
            </div>
          );
        })}
    </>
  );
}

export default DivEmployers;
