import { useEffect, useMemo, useState } from 'react';
import styles from '../styles/managingResumenes.module.css';
import OfferSelect from './OfferSelect';
import { getToken } from '../../lib/serviceToken';
import { getusercvdniorphone, getuserscvs, preferentFilter } from '../../lib/data';
import { FaTrash } from 'react-icons/fa6';
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
}) => {
  const [modalOffer, setModalOffer] = useState(false);
  const [creating, setCreating] = useState(false);
  const [bagUsers, setBagUsers] = useState(null);
  const [preferentUsers, setPreferentUsers] = useState([]);

  /* --------- Carga cvs asociados a la oferta --------- */
  useEffect(() => {
    const fetchUsers = async () => {
      if (!Offer?.userCv?.length) return setBagUsers([]);
      const token = getToken();
      const users = await getuserscvs({ ids: Offer.userCv }, token);
      setBagUsers(users);
    };
    fetchUsers();
  }, [Offer]);

  /* --------- Carga preferentes por provincia/puesto --- */
  useEffect(() => {
    const fetchPreferents = async () => {
      if (!Offer?.provinceId || !Offer?.jobId) {
        setPreferentUsers([]);
        return;
      }
      const token = getToken();
      const data = { provinces: [Offer.provinceId], jobs: [Offer.jobId] };
      const res = await preferentFilter(data, token);
      setPreferentUsers(Array.isArray(res) ? res : []);
    };
    fetchPreferents();
  }, [Offer]);

  const listOffers = useMemo(
    () => enumsData?.offers || [],
    [enumsData?.offers]
  );

  const handleClickPreferent = async (user) => {
  if (!user?.dni) {
    modal("Error", "El usuario no tiene DNI registrado.");
    return;
  }

  // Buscar si existe en la bolsa de candidatos (userCv) por DNI
  const candidatos = await getusercvdniorphone({ dni: user.dni });
  console.log(candidatos)
  if (!Array.isArray(candidatos) || candidatos.length === 0) {
    modal(
      "Usuario sin solicitud",
      `El usuario ${user.firstName} ${user.lastName} (${user.dni}) no tiene una solicitud de empleo registrada. Debes crearla antes de poder añadirlo.`
    );
    return;
  }

  // Si existe, abrimos su ficha
  viewUserOffer(candidatos[0]);
};
  const handleSaveOffer = (savedOffer) => {
    changeOffers(savedOffer);
    changeOffer(savedOffer);
    setCreating(false);
  };

  return (
    <div className={styles.containerOffer}>
      <h3>OFERTAS DE EMPLEO</h3>

      {Offer ? (
        <div>
          <p>OFERTA SELECCIONADA</p>
          <div className={styles.offerSelected}>
            <h4>{Offer.functions}</h4>
            <h4>{Offer.province}</h4>
          </div>

          <div className={styles.buttonsOfferSelected}>
            <button onClick={() => changeOffer(null)}>Salir</button>
          </div>

          {/* Preferentes (nombre + DNI + tipo) */}
          <div className={styles.listaCandidatos}>
            {preferentUsers.length > 0 && (
              <div>
                <h5>Preferentes</h5>
                {preferentUsers.map((pref) => {
                  const u = pref.user || {};
                  const fullName = [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
                  return (
                    <div key={pref._id} className={styles.candidato}>
                      <p
                        className={styles.nombreCandidato}
                        onClick={() => handleClickPreferent(u)}
                        title={`${fullName} (${u.dni || 's/dni'})`}
                      >
                        {fullName}
                        {u.dni && <span className={styles.dniTag}> · {u.dni}</span>}
                      </p>
                      <span
                        className={
                          pref.type === 'traslado'
                            ? styles.badgeTraslado
                            : styles.badgeReincorporacion
                        }
                      >
                        {pref.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Candidatos de la oferta */}
          <div className={styles.listaCandidatos}>
            {Offer?.userCv?.length ? (
              <div>
                <h5>Candidatos</h5>
                {bagUsers?.map((u) => (
                  <div key={u._id} className={styles.candidato}>
                    <p
                      className={styles.nombreCandidato}
                      onClick={() => viewUserOffer(u)}
                    >
                      {u.name}
                    </p>
                    <FaTrash onClick={() => deleteUserInOffer(u._id)} />
                  </div>
                ))}
              </div>
            ) : (
              <p>Esta oferta no tiene ningún candidato todavía</p>
            )}
          </div>
        </div>
      ) : (
        <div>
          <button onClick={() => setCreating(true)}>Crear Oferta</button>
          <p>O selecciona la oferta sobre la que quieres trabajar</p>

          <OfferSelect
            offers={listOffers}
            closeModal={() => {}}
            type="select"
            list
            onChosen={changeOffer}
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
