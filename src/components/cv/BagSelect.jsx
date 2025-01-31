import React, { useEffect, useState } from 'react';
import ModalForm from "../globals/ModalForm";
import { useBag } from "../../hooks/useBag.jsx";
import { getBags } from '../../lib/data';
import { getToken } from "../../lib/serviceToken";

const BagSelect=({offers, closeModal})=>{
    const { changeBag } = useBag();
    const [ process, setProcess]=useState([]);

    const optionsSelect = async () => {
        const token = getToken();
        const processAux = await getBags(token);
        if(processAux.error){
          closeModal()  
        }else {
          setProcess(processAux)  
        }
    }
    
    useEffect(() => {
        optionsSelect();
    }, [])


    const handleSubmit=(formData)=>{
        const dataBag=formData.bag.split('%')
        const bagAux=process.filter((x)=>x._id==dataBag[0])[0]
        const nameOffer=dataBag[1]
        changeBag({nameOffer:nameOffer, process:bagAux})
        closeModal()
    }



    const buildFields = () => {
        let bagOptions = [];
    if (!!offers) {
      bagOptions = offers.map(offer =>
         ({
          value: offer.bag+'%'+offer.job_title,
          label: offer.job_title
        }))
    }

        return [
          // =========== DATOS DE OFERTAS ===========
          {
            name: "bag",
            label: "Ofertas de Empleo",
            type: "select",
            required: true,
            options: [
              { value: "", label: "Seleccione una opción" },
              ...bagOptions], // a partir de enumsData.jobs
          },
        ];
      };
    

      // 3) Preparamos los fields
  const fields = buildFields();


    return (
        <ModalForm
          title="Oferta de empleo"
          message="Selecciona una oferta de empleo"
          fields={fields}
          onSubmit={handleSubmit}
          onClose={closeModal}
        />
    );
}

export default BagSelect;