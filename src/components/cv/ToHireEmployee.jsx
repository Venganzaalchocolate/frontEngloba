import { useState } from "react";
import { useBag } from "../../hooks/useBag.jsx";
import BagSelect from "./BagSelect";
import FormCreateEmployer from "../employer/FormCreateEmployer";
import { getJobIdFromNameOffer, splitName } from "../../lib/utils.js";

const ToHireEmployee = ({ offers, userSelected, enumsEmployer, modal, charge }) => {
    const [modalBag, setModalBag] = useState(false)
    const { Bag, changeBag } = useBag()


    const toHire = () => {
        if (!Bag) { setModalBag('bag') }
        else {
            setModalBag('create')
        }
    }

    // {
    //   firstName: "María",
    //   lastName: "",
    //   email: "",
    //   dni: "",
    //   phone: "987654321",
    //   role: "employee",
    //   notes: "",
    //   hiringPeriods: [
    //     {
    //       startDate: "2025-01-01",
    //       device: "6788ee629d96d785b703501b",
    //       position: "6783e40181464408ca4a3aee",
    //       active: true
    //     }
    //   ]
    // }

    const { firstName, lastName } = splitName(userSelected.name);

    let userAux={}
    if(Bag!=null){
        const idJob=getJobIdFromNameOffer(Bag.nameOffer, enumsEmployer.jobsIndex);
     
    userAux =
    {
        firstName: firstName,
        lastName: lastName,
        email: userSelected.email,
        phone: userSelected.phone,
        role: "employee",
        hiringPeriods: [
            {
                
                startDate: new Date(),
                device:Bag.process.dispositive.id,
                position:idJob,
                active: true
            }
        ]
    }   
    }
    

    const lockedFields = ['email', 'phone', 'role', 'startDate', 'device']


    return (
        <div>
            <button onClick={() => toHire()}>Contratar</button>
            {modalBag &&
                (modalBag == 'bag')
                ? <BagSelect offers={offers} closeModal={() => setModalBag(false)} />
                : (modalBag == 'create')
                    ? <FormCreateEmployer enumsData={enumsEmployer} modal={modal} charge={charge} user={userAux} closeModal={() => setModalBag(false)} chargeUser={() => { }} lockedFields={lockedFields} />
                    : null
            }
        </div>

    )
}

export default ToHireEmployee;