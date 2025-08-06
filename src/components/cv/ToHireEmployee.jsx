import { useState, useMemo } from "react";
import { deepClone } from "../../lib/utils";
import { rehireEmployee, updateOffer } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { useOffer } from "../../hooks/useOffer";
import FormCreateEmployer from "../employer/FormCreateEmployer";
import OfferSelect from "./OfferSelect";
import { getJobIdFromNameOffer, splitName } from "../../lib/utils";
import RehireEmployee from "./RehireEmployee";

const ToHireEmployee = ({
  offers,
  userSelected,
  enumsEmployer,
  modal,
  charge,
  chargeOffers,        // ← seguimos recibiendo el callback global
  changeUser
}) => {
  const { Offer, changeOffer } = useOffer();
  const [step, setStep] = useState(null); // null │ "select" │ "hire"

  /* ---------- click “Contratar” ---------- */
  const handleClick = async () => {

    if (!Offer) {
      // Sin oferta → elegir una
      setStep("select");
      return;
    }

    const alreadyInOffer = Offer.userCv?.includes(userSelected._id);

    if (!alreadyInOffer) {
      /* 1· Añadir el usuario a la oferta seleccionada */
      const token = getToken();
      const upd = {
        ...deepClone(Offer),
        id: Offer._id,
        userCv: [...Offer.userCv, userSelected._id],
      };
      const updatedOffer = await updateOffer(upd, token);

      /* 2· Propagar cambios */
      changeOffer(updatedOffer);   // contexto
      chargeOffers(updatedOffer);  // enumsEmployer.offers
    }

    /* 3· Pasamos al formulario de contratación */
    (userSelected?.workedInEngloba)?setStep("rehire"):setStep("hire");
  };

  /* ---------- callback del selector ---------- */
  const handleOfferChosen = (chosen) => {
    changeOffer(chosen);
    // Si es recontratación, ve directo a rehire; si no, a hire
    if (userSelected?.workedInEngloba) setStep("rehire");
    else setStep("hire");
  };

  const normalizeDni = (s) => String(s || "").replace(/\s+/g, "").toUpperCase();
  /* ---------- Guardado de REHIRE ---------- */
  const handleRehireSave = async (hiringNew) => {
  const token = getToken();

  // Validación básica en cliente (evita viajes innecesarios)
  if (!hiringNew?.device || !hiringNew?.position) {
    modal?.("Datos incompletos", "Faltan el dispositivo o el puesto.");
    return;
  }
  if (!hiringNew?.workShift?.type) {
    modal?.("Datos incompletos", "Selecciona el tipo de jornada.");
    return;
  }

  // Limpia reason si viene vacío
  const hiringClean = {
    ...hiringNew,
    ...(hiringNew.reason?.dni ? {} : { reason: undefined }),
  };

  const payload = {
    dni: normalizeDni(userSelected?.dni),
    hiring: hiringClean, // { startDate, device, workShift:{type,nota}, category, position, active, reason? }
  };

  const result = await rehireEmployee(payload, token);

  if (result?.error) {
    modal?.("Error recontratando", result.message || "No se pudo completar la recontratación.");
    return;
  }

  // El endpoint devuelve el usuario actualizado
  changeUser(result);
  charge?.(result);
  modal?.(
    "Recontratación creada",
    "Se ha abierto un nuevo periodo de contratación y el estado se ha puesto en 'en proceso de contratación'."
  );
  setStep?.(null);
};

  /* ---------- datos para FormCreateEmployer ---------- */
  const userAux = useMemo(() => {
    if (!Offer) return null;

    const { firstName, lastName } = splitName(userSelected.name);
    const idJob = getJobIdFromNameOffer(
      Offer.nameOffer,
      enumsEmployer.jobsIndex
    );

    return {
      firstName: userSelected.firstName || firstName,
      lastName: userSelected.lastName || lastName,
      dni: userSelected.dni || "",
      email: userSelected.email,
      phone: userSelected.phone,
      role: "employee",
      fostered: userSelected.fostered,
      disability: { percentage: userSelected.disability },
      hiringPeriods: [
        {
          startDate: new Date(),
          device: Offer.dispositive.dispositiveId,
          position: idJob,
          active: true,
        },
      ],
      ...(userSelected.offer && { offer: userSelected.offer }),
      ...(userSelected.studies && {
        studies: userSelected.studies.reduce((acc, s) => {
          enumsEmployer.studies.forEach((g) => {
            if (s.trim() === g.name.trim()) acc.push(g._id);
            g.subcategories?.forEach((sub) => {
              if (s.trim() === sub.name.trim()) acc.push(sub._id);
            });
          });
          return acc;
        }, []),
      }),
    };
  }, [Offer, userSelected, enumsEmployer]);

  /* ---------- render ---------- */
  return (
    <>
      <button className="tomato" onClick={handleClick}>
        Contratar
      </button>

      {step === "select" && (
        <OfferSelect
          offers={offers}
          userSelected={userSelected}
          onChosen={handleOfferChosen}
          closeModal={() => setStep(null)}
        />
      )}

      {step === "hire" && userAux && (
        <FormCreateEmployer
          enumsData={enumsEmployer}
          modal={modal}
          charge={charge}
          chargeOffers={chargeOffers}
          user={userAux}
          lockedFields={["email", "phone", "role", "device"]}
          closeModal={() => setStep(null)}
          changeUser={(x) => changeUser(x)}
          offerId={(Offer.userCv?.includes(userSelected._id))?Offer._id:null}
        />
      )}

      {step === "rehire" && Offer && (
        <RehireEmployee
          enumsEmployer={enumsEmployer}
          offer={Offer}
          lockedFields={["device", "position"]}
          save={handleRehireSave}
          onClose={() => setStep(null)}
        />
      )}
    </>
  );
};

export default ToHireEmployee;
