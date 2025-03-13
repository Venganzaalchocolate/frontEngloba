import { useState } from "react";
import { useOffer } from "../../hooks/useOffer.jsx";
import FormCreateEmployer from "../employer/FormCreateEmployer";
import { getJobIdFromNameOffer, splitName } from "../../lib/utils.js";
import OfferSelect from "./OfferSelect.jsx";

const ToHireEmployee = ({ offers, userSelected, enumsEmployer, modal, charge, chargeOffers }) => {
    const [modalBag, setModalBag] = useState(false)
    const { Offer, changeOffer } = useOffer()

    const toHire = () => {
        if (!Offer || !(Offer.userCv.some((x)=>x==userSelected._id))) { setModalBag('bag') }
        else {
            setModalBag('create')
        }
    }

    const { firstName, lastName } = splitName(userSelected.name);

    let userAux={}
    if(Offer!=null){
        const idJob=getJobIdFromNameOffer(Offer.nameOffer, enumsEmployer.jobsIndex);

    userAux =
    {
        firstName: userSelected.firstName || firstName,
        lastName: userSelected.lastName || lastName,
        dni: userSelected.dni || '',
        email: userSelected.email,
        phone: userSelected.phone,
        role: "employee",
        disability:{
            'percentage':userSelected.disability
        },
        hiringPeriods: [
            {
                
                startDate: new Date(),
                dispositive: Offer.dispositive.dispositiveId,
                position:idJob,
                active: true
            }
        ],
        
    }   
    }

    if (userSelected?.offer) {
        userAux["offer"] = userSelected.offer;
    }
    if (userSelected?.studies) {
        userAux.studies = userSelected.studies.reduce((acc, selectedStudy) => {
          enumsEmployer.studies.forEach((studyGroup) => {
            // Si el estudio seleccionado coincide con el nombre de la categoría principal
            if (selectedStudy.trim() === studyGroup.name.trim()) {
              acc.push(studyGroup._id);
            }
            // Si existen subcategorías, comprobamos en cada una
            if (studyGroup.subcategories && Array.isArray(studyGroup.subcategories)) {
              studyGroup.subcategories.forEach((sub) => {
                if (selectedStudy.trim() === sub.name.trim()) {
                  acc.push(sub._id);
                }
              });
            }
          });
          return acc;
        }, []);
      }
      

    const lockedFields = ['email', 'phone', 'role', 'startDate', 'device']
    

    return (
        <div>
            <button onClick={() => toHire()}>Contratar</button>
            {modalBag &&
                (modalBag == 'bag')
                ? <OfferSelect offers={offers} closeModal={() => setModalBag(false)} userSelected={userSelected} />
                : (modalBag == 'create')
                    ? <FormCreateEmployer chargeOffers={chargeOffers} enumsData={enumsEmployer} modal={modal} charge={charge} user={userAux} closeModal={() => setModalBag(false)} chargeUser={() => { }} lockedFields={lockedFields} />
                    : null
            }
        </div>

    )
}

export default ToHireEmployee;