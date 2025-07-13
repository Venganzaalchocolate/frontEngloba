import { useEffect, useMemo, useState } from 'react';
import styles from '../styles/managingResumenes.module.css';
import OfferSelect from './OfferSelect';
          // ⬅️  importa el formulario
import { getToken } from '../../lib/serviceToken';
import { getuserscvs } from '../../lib/data';
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
  const [modalOffer, setModalOffer] = useState(false); // para OfferSelect
  const [creating, setCreating] = useState(false);     // NUEVO: crear oferta
  const [bagUsers, setBagUsers] = useState(null);

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

const listOffers = useMemo(
  () => enumsData?.offers || [],
  [enumsData?.offers]
);
  /* --------- callback cuando se guarda una oferta ----- */
  const handleSaveOffer = (savedOffer) => {
    changeOffers(savedOffer);   // actualiza el listado global
    changeOffer(savedOffer);    // la seleccionamos automáticamente
    setCreating(false);         // cierra el modal
  };

  /* --------- Render ---------------------------------- */
  return (
    <div className={styles.containerOffer}>
      <h3>OFERTAS DE EMPLEO</h3>

      {Offer ? (
        /* ——— Con una oferta seleccionada ——— */
        <div>
          <p>OFERTA SELECCIONADA</p>
          <div className={styles.offerSelected}>
            <h4>{Offer.functions}</h4>
            <h4>{Offer.province}</h4>
          </div>

          <div className={styles.buttonsOfferSelected}>
            <button onClick={() => changeOffer(null)}>Salir</button>
          </div>

          <div className={styles.listaCandidatos}>
            {Offer?.userCv.length ? (
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
        /* ——— Sin oferta seleccionada ——— */
        <div>
          <button onClick={() => setCreating(true)}>Crear Oferta</button>
          <p>O selecciona la oferta sobre la que quieres trabajar</p>

          {/* Chips con ofertas existentes */}
          <OfferSelect
            offers={listOffers}
            closeModal={() => {}}
            type="select"
            list
            onChosen={changeOffer}
          />
        </div>
      )}

      {/* Modal de creación / edición */}
      {creating && (
        <FormOffer
          enumsData={enumsData}
          modal={modal}
          charge={charge}
          closeModal={() => setCreating(false)}
          changeOffers={handleSaveOffer} // guarda y selecciona
        />
      )}
    </div>
  );
};

export default ContainerOffer;
