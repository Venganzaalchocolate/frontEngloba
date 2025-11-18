import React, { useMemo, useState, useEffect } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { offerUpdate } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { useOffer } from "../../hooks/useOffer";
import { deepClone } from "../../lib/utils";
import styles from "../styles/OfferSelect.module.css";
import { FaBriefcase, FaBuilding, FaLocationDot } from "react-icons/fa6";
import { FaSearch } from "react-icons/fa";

const OfferSelect = ({
  closeModal,
  userSelected,
  enumsData,
  type,
  onChosen = () => {},
  list = false,
  modal
}) => {
  const { changeOffer } = useOffer();
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [selectedOffer, setSelectedOffer] = useState(null);
  const [offersMod, setOffersMod] = useState([]);
  const [fieldsForm, setFieldsModal] = useState([]);
  const [searchTerm, setSearchTerm] = useState(""); // 🔍 NUEVO ESTADO

  
  useEffect(() => {

    const getOfferTitle = (o) => {
      const idJob = o?.jobId || "";
      const idDispositive = o?.dispositive?.newDispositiveId || "";
      const job = enumsData?.jobsIndex[idJob]?.name || "";
      const disp = enumsData?.dispositiveIndex[idDispositive]?.name || "";
      const jobTitleAux = `${job} - ${o?.location || ""} - ${disp}`;
      return { jobName: job, dispositiveName: disp, jobTitle: jobTitleAux };
    };

    const mapped = enumsData.offers.map((x) => ({
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
    ];
    setFieldsModal(fieldsAux);
  }, []);

  /* ---------- Filtro de búsqueda ---------- */
/* ---------- Filtro de búsqueda ---------- */
const normalize = (str = "") =>
  str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, ""); // elimina acentos

const filteredOffers = useMemo(() => {
  if (!searchTerm.trim()) return offersMod;
  const term = normalize(searchTerm);

  return offersMod.filter((o) => {
    const job = normalize(o.dataAux?.jobName || "");
    const disp = normalize(o.dataAux?.dispositiveName || "");
    const loc = normalize(o.location || "");
    return job.includes(term) || disp.includes(term) || loc.includes(term);
  });
}, [offersMod, searchTerm]);


  /* ---------- Lógica común ---------- */
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

  const handleSubmit = (formData) => {
    const offerAux = offersMod.find((o) => o._id === formData.offer);
    if (offerAux) selectOffer(offerAux);
  };

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
      {showConfirmation && (
        <ModalConfirmation
          title="Confirmar selección"
          message={`¿Quieres agregar a ${userSelected?.name || "la persona"} a la oferta "${
            selectedOffer?.dataAux.jobTitle || "Oferta"
          }"?`}
          onConfirm={handleConfirm}
          onCancel={() => setShowConfirmation(false)}
        />
      )}

      {/* 🔍 BUSCADOR en modo lista */}
      {list && (
        <div className={styles.listWrapper}>
          <div className={styles.searchBar}>
            <FaSearch />
            <input
              type="text"
              placeholder="Buscar por puesto, dispositivo o provincia..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <ul className={styles.list}>
            {filteredOffers.map((offer) => (
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

      {/* Modo modal con formulario */}
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
