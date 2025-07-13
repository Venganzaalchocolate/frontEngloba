import React, { useState } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { updateOffer } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { useOffer } from "../../hooks/useOffer";
import { deepClone } from "../../lib/utils";
import styles from "./OfferSelect.module.css";       // ← estilos para el <ul>

const OfferSelect = ({
  offers,
  closeModal,
  userSelected,
  type,
  onChosen = () => {},
  list = false,                   // ← NUEVO: valor por defecto = false
}) => {
  const { changeOffer } = useOffer();

  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);

  /* ---------- Lógica común para cualquier modo ---------- */
  const selectOffer = (offerAux) => {
    // 1) ¿Hace falta añadir el user a la oferta?
    if (type !== "select" && userSelected && !offerAux.userCv.includes(userSelected._id)) {
      setSelectedOffer(offerAux);
      setShowConfirmation(true);
      return;
    }

    // 2) No hace falta confirmación → cambiamos oferta y salimos
    changeOffer(offerAux);
    closeModal();
    onChosen(offerAux);
  };

  /* ---------- Handler para el formulario (modo por defecto) ---------- */
  const handleSubmit = (formData) => {
    const offerAux = offers.find((o) => o._id === formData.offer);
    if (offerAux) selectOffer(offerAux);
  };

  /* ---------- Confirmación (modal) ---------- */
  const handleConfirm = async () => {
    let finalOffer = selectedOffer;

    if (userSelected && selectedOffer) {
      let updated = deepClone(selectedOffer);

      if (!updated.userCv.includes(userSelected._id)) {
        updated.userCv.push(userSelected._id);
        updated.id = updated._id;

        const token = getToken();
        updated = await updateOffer(updated, token);
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

  /* ---------- Campos del ModalForm ---------- */
  const fields = [
    {
      name: "offer",
      label: "Ofertas de Empleo",
      type: "select",
      required: true,
      options: [
        { value: "", label: "Seleccione una opción" },
        ...offers.map((o) => ({ value: o._id, label: o.job_title })),
      ],
    },
  ];

  /* ---------- Render ---------- */
  return (
    <>
      {/* Modal de confirmación (lo usamos en ambos modos) */}
      {showConfirmation && (
        <ModalConfirmation
          title="Confirmar selección"
          message={`¿Quieres agregar a ${userSelected.name} a la oferta ${selectedOffer?.job_title}?`}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmation(false)}
        />
      )}


      {/* Modo LISTA ---------------------------------------------------- */}
      {list && (
        <div className={styles.listWrapper}>
          <ul className={styles.list}>
            {offers.map((offer) => (
              <li
                key={offer._id}
                className={styles.chip}
                onClick={() => selectOffer(offer)}
              >
                <p className={styles.function}>{offer.functions}</p>
                <p className={styles.location}>{(offer.location).toUpperCase()} - ({offer.province})</p>
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
          fields={fields}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
      )}
    </>
  );
};

export default OfferSelect;
