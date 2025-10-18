import { useEffect, useMemo, useState } from 'react';
import styles from '../styles/managingResumenes.module.css';
import OfferSelect from './OfferSelect';
import { getToken } from '../../lib/serviceToken';
import { getusercvdniorphone, getuserscvs, preferentFilter } from '../../lib/data';
import { BsFillBagDashFill } from "react-icons/bs";
import { FaBriefcase, FaBuilding } from 'react-icons/fa6';
import FormOffer from '../offerJobs/FormOffer';

const ContainerOffer = ({
  Offer,
  changeOffer,
  changeOffers,
  enumsData,
  modal,
  charge,
  viewUserOffer,
  deleteUserInOffer,
  resetFilters
}) => {
  const [creating, setCreating] = useState(false);
  const [bagUsers, setBagUsers] = useState([]);
  const [solicitants, setSolicitants] = useState([]);
  const [preferentUsers, setPreferentUsers] = useState([]);

  const [showCandidatesList, setShowCandidatesList] = useState(false);
  const [showSolicitantsList, setShowSolicitantsList] = useState(false);

  const toggleList = (kind) => {
    if (kind === 'candidates') {
      if (showCandidatesList) {
        resetFilters?.();
        setShowCandidatesList(false);
      } else {
        viewUserOffer(Array.isArray(bagUsers) ? bagUsers : []);
        setShowCandidatesList(true);
        setShowSolicitantsList(false);
      }
    } else if (kind === 'solicitants') {
      if (showSolicitantsList) {
        resetFilters?.();
        setShowSolicitantsList(false);
      } else {
        viewUserOffer(Array.isArray(solicitants) ? solicitants : []);
        setShowSolicitantsList(true);
        setShowCandidatesList(false);
      }
    }
  };

  useEffect(() => {
    resetFilters?.();
    setShowCandidatesList(false);
    setShowSolicitantsList(false);
  }, [Offer?._id]);

  // --------- Helpers para programa y provincia desde la nueva estructura ---------
  const getProgramId = (offer) => {
    const dispId = offer?.dispositive?.dispositiveId;
    const fallbackProgram = dispId ? enumsData?.dispositiveIndex?.[dispId]?.program : undefined;
    return offer?.dispositive?.programId || fallbackProgram || null;
  };

  const getProvinceId = (offer) => {
    const dispId = offer?.dispositive?.newDispositiveId;
    return dispId ? enumsData?.dispositiveIndex?.[dispId]?.province || null : null;
  };

  
  /* --------- Carga preferentes (provincia + jobId) --------- */
  useEffect(() => {
    const fetchPreferents = async () => {

      const provinceId = getProvinceId(Offer);

      if (!provinceId || !Offer?.jobId) {
        setPreferentUsers([]);
        return;
      }
      try {
        const token = getToken();
        const data = { provinces: [provinceId], jobs: [Offer.jobId], active: true };
        
        const res = await preferentFilter(data, token);
        setPreferentUsers(Array.isArray(res) ? res : []);
      } catch (e) {
        setPreferentUsers([]);
      }
    };
    if (Offer) fetchPreferents();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [Offer?._id, Offer?.jobId]); // Offer cambia => recomputa

  /* --------- Carga cvs asociados a la oferta --------- */
  useEffect(() => {
    const fetchUsers = async () => {
      const token = getToken();
      try {
        
        const [usersBag, usersSolic] = await Promise.all([
          Array.isArray(Offer?.userCv) && Offer.userCv.length
            ? getuserscvs({ ids: Offer.userCv }, token)
            : Promise.resolve([]),
          Array.isArray(Offer?.solicitants) && Offer.solicitants.length
            ? getuserscvs({ ids: Offer.solicitants }, token)
            : Promise.resolve([]),
        ]);
        setBagUsers(Array.isArray(usersBag) ? usersBag : []);
        setSolicitants(Array.isArray(usersSolic) ? usersSolic : []);
      } catch (e) {
        modal('Error', 'Error al cargar la lista de candidatos y solicitantes');
        setBagUsers([]);
        setSolicitants([]);
      }
    };
    if (Offer) fetchUsers();
  }, [Offer?.userCv, Offer?.solicitants, modal]);

  const listOffers = useMemo(() => enumsData?.offers || [], [enumsData?.offers]);

  const handleClickPreferent = async (user) => {
    if (!user?.dni) {
      modal("Error", "El usuario no tiene DNI registrado.");
      return;
    }
    const candidatos = await getusercvdniorphone({ dni: user.dni });
    if (!Array.isArray(candidatos) || candidatos.length === 0) {
      modal(
        "Usuario sin solicitud",
        `El usuario ${user.firstName} ${user.lastName} (${user.dni}) no tiene una solicitud de empleo registrada. Debes crearla antes de poder añadirlo.`
      );
      return;
    }
    viewUserOffer(candidatos[0]);
  };

  const handleSaveOffer = (savedOffer) => {
    changeOffers(savedOffer);
    changeOffer(savedOffer);
    setCreating(false);
  };

  // --------- Datos para cabecera de oferta seleccionada ---------
  const selectedProgramId = Offer ? getProgramId(Offer) : null;
  const selectedDispositiveId = Offer?.dispositive?.newDispositiveId || null;
  const selectedProgramName = selectedProgramId ? (enumsData?.programsIndex?.[selectedProgramId]?.name || '') : '';
  const selectedDispositiveName = selectedDispositiveId ? (enumsData?.dispositiveIndex?.[selectedDispositiveId]?.name || '') : '';

  return (
    <div className={styles.containerOffer}>
      <h3>OFERTAS DE EMPLEO</h3>

      {Offer ? (
        <div>
          <p>OFERTA SELECCIONADA</p>
          <div className={styles.offerSelected}>
            <h4>
              <FaBriefcase />{" "}
              <span>{enumsData?.jobsIndex?.[Offer.jobId]?.name || '—'} - {Offer?.location}</span>
            </h4>
            <h4>
              <FaBuilding />{" "}
              <span>
                {selectedDispositiveName || selectedProgramName || ""}
              </span>
            </h4>
          </div>

          <button
            className={styles.buttonsOfferSelected}
            onClick={() => changeOffer(null)}
          >
            Salir
          </button>

          {/* Preferentes */}
          {preferentUsers.length > 0 ? (
            <div className={styles.listaCandidatos}>
              <h5>Preferentes</h5>
              {preferentUsers.map((pref) => {
                const u = pref.user || {};
                const fullName =
                  [u.firstName, u.lastName].filter(Boolean).join(" ") || "—";
                return (
                  <div key={pref._id} className={styles.candidato}>
                    <button
                      type="button"
                      className={styles.nombreCandidato}
                      onClick={() => handleClickPreferent(u)}
                      title={`${fullName} (${u.dni || "s/dni"})`}
                    >
                      {fullName}
                    </button>
                    <div className={styles.cajaInfoCandidatos}>
                      {u.dni && <span className={styles.dniTag}>{u.dni}</span>}
                      <span
                        className={
                          pref.type === "traslado"
                            ? styles.badgeTraslado
                            : styles.badgeReincorporacion
                        }
                      >
                        {pref.type}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className={styles.emptyState}>
              No hay personas preferentes para esta provincia/puesto.
            </div>
          )}

          {/* Candidatos */}
          {Offer?.userCv?.length ? (
            <div className={styles.listaCandidatos}>
              <h5>
                Candidatos{" "}
                <button
                  type="button"
                  onClick={() => toggleList('candidates')}
                  disabled={!Array.isArray(bagUsers) || bagUsers.length === 0}
                  aria-pressed={showCandidatesList}
                  className={`${showCandidatesList ? 'tomato' : ''}`}
                >
                  {showCandidatesList ? 'Cerrar lista' : 'Mostrar lista detallada'}
                </button>
              </h5>
              {Array.isArray(bagUsers) && bagUsers.length > 0 ? (
                bagUsers.map((u) => {
                  const candidateName =
                    u.name ||
                    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                    "—";
                  return (
                    <div key={u._id} className={styles.candidatoNoPreferente}>
                      <button
                        type="button"
                        className={styles.nombreCandidato}
                        onClick={() => viewUserOffer(u)}
                        title={candidateName}
                      >
                        {candidateName}
                      </button>
                      <BsFillBagDashFill
                        onClick={() => deleteUserInOffer(u._id)}
                      />
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>Cargando candidatos…</div>
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              Esta oferta no tiene ningún candidato todavía
            </div>
          )}

          {/* Solicitantes */}
          {Offer?.solicitants?.length ? (
            <div className={styles.listaCandidatos}>
              <h5>
                Solicitantes{" "}
                <button
                  type="button"
                  onClick={() => toggleList('solicitants')}
                  disabled={!Array.isArray(solicitants) || solicitants.length === 0}
                  aria-pressed={showSolicitantsList}
                  className={`${showSolicitantsList ? 'tomato' : ''}`}
                >
                  {showSolicitantsList ? 'Cerrar lista' : 'Mostrar lista detallada'}
                </button>
              </h5>
              {Array.isArray(solicitants) && solicitants.length > 0 ? (
                solicitants.map((u) => {
                  const name =
                    u.name ||
                    [u.firstName, u.lastName].filter(Boolean).join(" ") ||
                    "—";
                  return (
                    <div key={u._id} className={styles.candidato}>
                      <button
                        type="button"
                        className={styles.nombreCandidato}
                        onClick={() => viewUserOffer(u)}
                        title={name}
                      >
                        {name}
                      </button>
                    </div>
                  );
                })
              ) : (
                <div className={styles.emptyState}>Cargando solicitantes…</div>
              )}
            </div>
          ) : (
            <div className={styles.emptyState}>
              Esta oferta no tiene solicitantes todavía
            </div>
          )}
        </div>
      ) : (
        <div>
          <button
            className={styles.botonCrearOferta}
            onClick={() => setCreating(true)}
          >
            Crear Oferta
          </button>
          <p>O selecciona la oferta sobre la que quieres trabajar</p>

          <OfferSelect
            offers={listOffers}
            enumsData={enumsData}
            closeModal={() => {}}
            type="select"
            list
            onChosen={changeOffer}
            modal={modal}
          />
        </div>
      )}

      {creating && (
        <FormOffer
          enumsData={enumsData}
          modal={modal}
          charge={charge}
          closeModal={() => setCreating(false)}
          changeOffers={handleSaveOffer}
        />
      )}
    </div>
  );
};

export default ContainerOffer;
