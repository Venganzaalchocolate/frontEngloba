import { useState, useMemo } from "react";
import { deepClone } from "../../lib/utils";
import { rehireEmployee, offerUpdate, hiringCreate, editUser } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { useOffer } from "../../hooks/useOffer";
import FormCreateEmployer from "../employer/FormCreateEmployer";
import OfferSelect from "./OfferSelect";
import { splitName } from "../../lib/utils";
import RehireEmployee from "./RehireEmployee";
import ModalConfirmation from "../globals/ModalConfirmation";


const ToHireEmployee = ({
  userSelected,
  enumsEmployer,
  modal,
  charge,
  chargeOffers,
  changeUser,
}) => {
  const { Offer, changeOffer } = useOffer();
  const [step, setStep] = useState(null); // null │ "select" │ "hire" │ "rehire"
  const [showConfirmation, setShowConfirmation] = useState(false);

  // ------ helpers ------
// Id del dispositivo (nuevo) de una oferta
 const getOfferDeviceId = (o) =>
  o?.dispositive?.newDispositiveId ?? null;

  /* ---------- click “Contratar” ---------- */
  const handleClick = async () => {
    if (!Offer) {
      setStep("select");
      return;
    }

  

    const alreadyInOffer = Offer.userCv?.includes(userSelected._id);

    if (!alreadyInOffer) {
      // 1) Añadir el usuario a la oferta seleccionada
      const token = getToken();
      const data = {
        offerId: Offer._id,
        userCv: [...(Offer.userCv || []), userSelected._id],
      };
      const updatedOffer = await offerUpdate(data, token);

      // 2) Propagar cambios
      changeOffer(updatedOffer);
      chargeOffers(updatedOffer);
    }

    // 3) Siguiente paso
    (userSelected?.workedInEngloba?.status) ? setStep("rehire") : setStep("hire");
  };

  /* ---------- callback del selector ---------- */
  const handleOfferChosen = (chosen) => {
    changeOffer(chosen);
    if (userSelected?.workedInEngloba?.status) setStep("rehire");
    else setStep("hire");
  };

  /* ---------- Guardado de REHIRE ---------- */
  const handleRehireSave = async (hiringNew) => {
    charge(true);
    const token = getToken();

    const data = { ...hiringNew, idUser: userSelected.workedInEngloba.idUser };
    const created = await hiringCreate(data, token);
    if (created?.error) {
      modal?.("Error recontratando", created.message || "No se pudo completar la recontratación.");
      charge(false);
      return;
    } else {
      const dataActive = {
        _id: userSelected.workedInEngloba.idUser,
        employmentStatus: "en proceso de contratación",
      };
      const activeUser = await editUser(dataActive, token);
      if (activeUser?.error)
        modal("Error", "Se ha creado el periodo de contratación pero no se ha podido cambiar el status del trabajador");

      setShowConfirmation(true);
      modal?.(
        "Recontratación creada",
        "Se ha abierto un nuevo periodo de contratación y el estado se ha puesto en 'en proceso de contratación'."
      );
    }
    charge(false);
    setStep(null);
  };

  /* ---------- datos para FormCreateEmployer ---------- */
  const userAux = useMemo(() => {
    if (!Offer) return null;

    const { firstName, lastName } = splitName(userSelected.name);
    const deviceId = getOfferDeviceId(Offer);
    return {
      firstName: userSelected.firstName || firstName,
      lastName: userSelected.lastName || lastName,
      dni: userSelected.dni || "",
      email: userSelected.email,
      phone: userSelected.phone,
      role: "employee",
      fostered: userSelected.fostered,
      gender: userSelected.gender,
      disability: { percentage: userSelected.disability },
      hiringPeriods: [
        {
          startDate: new Date(),
          dispositiveId: deviceId,          // ← NUEVO id del Dispositivo (fallback a legacy si no hay)
          position: Offer?.jobId || null,
          active: true,
        },
      ],
      ...(userSelected.offer && { offer: userSelected.offer }),
      ...(userSelected.studiesId && {
        studiesId: userSelected.studiesId,
      }),
    };
  }, [Offer, userSelected, enumsEmployer]);

  const handleConfirmOfferChange = async (deactivate) => {
    charge(true);
    if (deactivate && Offer?._id) {
      const token = getToken();
      const updated = await offerUpdate({ offerId: Offer._id, active: false }, token);
      if (updated?.error) modal("Error", "No se ha podido desactivar la oferta");
      chargeOffers(updated);
      changeOffer(null);
    }
    setShowConfirmation(false);
    charge(false);
  };


  /* ---------- render ---------- */
  return (
    <>
      <button className="tomato" onClick={handleClick}>
        {!Offer?'Selecciona Oferta':'Contratar'}
      </button>

      {showConfirmation && (
        <ModalConfirmation
          title="Desactivar oferta"
          message="¿Quieres desactivar la oferta?"
          onConfirm={() => handleConfirmOfferChange(true)}
          onCancel={() => handleConfirmOfferChange(false)}
        />
      )}

      {step === "select" && (
        <OfferSelect
          userSelected={userSelected}
          onChosen={handleOfferChosen}
          enumsData={enumsEmployer}
          closeModal={() => setStep(null)}
          modal={modal}
          
        />
      )}

      {step === "hire" && userAux && (
        <FormCreateEmployer
          enumsData={enumsEmployer}
          modal={modal}
          charge={charge}
          chargeOffers={chargeOffers}
          user={userAux}
          lockedFields={["email", "phone", "role", "dispositiveId", "position"]}
          closeModal={() => setStep(null)}
          changeUser={(x) => changeUser(x)}
          offerId={Offer?.userCv?.includes(userSelected._id) ? Offer._id : null}
        />
      )}

      {step === "rehire" && Offer && (
        <RehireEmployee
          enumsEmployer={enumsEmployer}
          offer={Offer}
          lockedFields={["device", "position"]}
          save={handleRehireSave}
          onClose={() => setStep(null)}
          modal={modal}
        />
      )}
    </>
  );
};

export default ToHireEmployee;