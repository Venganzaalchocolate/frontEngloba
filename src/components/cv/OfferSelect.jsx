import React, { useMemo, useState } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { offerUpdate } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { useOffer } from "../../hooks/useOffer";
import { deepClone } from "../../lib/utils";
import styles from "../styles/OfferSelect.module.css";
import { FaBriefcase, FaBuilding, FaLocationDot } from "react-icons/fa6";
import { useEffect } from "react";

const OfferSelect = ({
  offers,
  closeModal,
  userSelected,
  enumsData,
  type,
  onChosen = () => { },
  list = false,
  modal
}) => {
  const { changeOffer } = useOffer();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offersMod, setOffersMod] = useState([])
  const [fieldsForm, setFieldsModal] = useState([])



  useEffect(() => {
    const getOfferTitle = (o) => {
      const idJob = o?.jobId || '';
      const idDispositive = o?.dispositive?.newDispositiveId || ''
      const job = enumsData?.jobsIndex[idJob]?.name;
      const disp = enumsData?.dispositiveIndex[idDispositive]?.name;
      const jobTitleAux = `${job} - ${o?.location} - ${disp}`
      const data={ jobName: job, dispositiveName: disp, jobTitle: jobTitleAux };
   
      return data
    };
    const mapped = offers.map((x) => ({
      ...x,
      dataAux: getOfferTitle(x),
    }));

    setOffersMod(mapped);
 
      const fieldsAux = [
        {
          name: "offer",
          label: "Ofertas de Empleo",
          type: "select",
          required: true,
          options: [
            { value: "", label: "Seleccione una opción" },
            ...mapped.map((o) => ({ value: o._id, label: o.dataAux.jobTitle })),
          ],
        },
      ]
      setFieldsModal(fieldsAux)

  }, [])


  /* ---------- Lógica común para cualquier modo ---------- */
  const selectOffer = (offerAux) => {
    const alreadyIn = (offerAux?.userCv || []).includes(userSelected?._id);
    if (type !== "select" && userSelected && !alreadyIn) {
      setSelectedOffer(offerAux);
      setShowConfirmation(true);
      return;
    }
    changeOffer(offerAux);
    closeModal();
    onChosen(offerAux);
  };

  /* ---------- Handler para el formulario (modo por defecto) ---------- */
  const handleSubmit = (formData) => {
    const offerAux = offersMod.find((o) => o._id === formData.offer);
    if (offerAux) selectOffer(offerAux);
  };

  /* ---------- Confirmación (modal) ---------- */
  const handleConfirm = async () => {
    let finalOffer = selectedOffer;

    if (userSelected && selectedOffer) {
      let updated = deepClone(selectedOffer);
      const list = Array.isArray(updated.userCv) ? updated.userCv : [];

      if (!list.includes(userSelected._id)) {
        list.push(userSelected._id);
        const data = { offerId: updated._id, userCv: list };
        const token = getToken();
        updated = await offerUpdate(data, token);
        changeOffer(updated);
      } else {
        changeOffer(updated);
      }
      finalOffer = updated;
    }

    setShowConfirmation(false);
    closeModal();
    onChosen(finalOffer);
  };


  /* ---------- Render ---------- */
  return (
    <>
      {/* Modal de confirmación */}
      {showConfirmation && (
        <ModalConfirmation
          title="Confirmar selección"
          message={`¿Quieres agregar a ${userSelected?.name || "la persona"
            } a la oferta "${selectedOffer?.dataAux.jobTitle || "Oferta"}"?`}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmation(false)}
        />
      )}

      {list && (
        <div className={styles.listWrapper}>
          <ul className={styles.list}>
            {offersMod.map((offer) => (
              <li
                key={offer._id}
                className={styles.chip}
                onClick={() => selectOffer(offer)}
                title={offer.jobTitle}
                aria-label={`Seleccionar oferta ${offer.jobTitle}`}
              >
                <p>
                  <FaBriefcase /> <span>{offer.dataAux.jobName}</span>
                </p>
                <p>
                  <FaLocationDot /> <span>{offer?.location}</span>
                </p>
                <p>
                  <FaBuilding /> <span>{offer.dataAux.dispositiveName}</span>
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Modo MODAL FORM ---------------------------------------------- */}
      {!list && (
        <ModalForm
          title="Oferta de empleo"
          message="Selecciona una oferta de empleo"
          fields={fieldsForm}
          onSubmit={handleSubmit}
          onClose={closeModal}
          modal={modal} 
        />
      )}
    </>
  );
};

export default OfferSelect;
