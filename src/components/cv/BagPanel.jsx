import { useEffect, useState } from 'react';
import styles from '../styles/bag.module.css';
import { addEmployerBag, deleteEmployerBag, getBags } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';
import { IoBagAdd } from "react-icons/io5";
import { useBag } from "../../hooks/useBag.jsx";
import { IoBagCheck } from "react-icons/io5";
import BagSelect from './BagSelect.jsx';
import ModalForm from '../globals/ModalForm.jsx';

const BagPanel = ({ userSelected, offers }) => {
    const { Bag, changeBag } = useBag()
    const [inBag, setInBag] = useState(false)
    const [modalBag, setModalBag] = useState(false)
    const [process, setProcess] = useState([]);


    const optionsSelect = async () => {
        const token = getToken();
        const processAux = await getBags(token);
        if (processAux.error) {
            closeModal()
        } else {
            setProcess(processAux)
        }
    }


    useEffect(() => {
        if (!!Bag) {
            Bag.process.userCv.map((x) => {
                if (x == userSelected._id) setInBag(true)
            })
        }
        optionsSelect();
    }, [Bag])


    const handleSubmit=(formData)=>{
        const dataBag=formData.bag.split('%')
        const bagAux=process.filter((x)=>x._id==dataBag[0])[0]
        const nameOffer=dataBag[1]
        const dataBagAux={nameOffer:nameOffer, process:bagAux}
        changeBag(dataBagAux)
        if(!!userSelected)modifyBagEmployer(dataBagAux);
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

    const modifyBagEmployer = async (dataBagAux=null) => {

        let data=null
        console.log(dataBagAux)
        console.log(Bag)
        if(Bag!=null){
            data={
                _id:Bag.process._id,
                user:userSelected
            }  
        } else {
            data={
                _id:dataBagAux.process._id,
                user:userSelected
            } 
        }
        
        if (data!= null && data!= null) {
            
            const token = getToken();
            let response = { error: true };
            if (inBag) response = await deleteEmployerBag(data, token);
            else response = await addEmployerBag(data, token);
            if (!response.error) {
                changeBag({nameOffer:(dataBagAux!=null)
                    ?dataBagAux.nameOffer
                    :Bag.nameOffer, process:response})
            }
        }
    }

    const viewBagEmployer = () => {
        if(Bag==null){
            setModalBag(!modalBag)
            modifyBagEmployer()
        }
        else  modifyBagEmployer()
    }

    const closeModal = () => {
        setModalBag(false)
    }

    return <div>
        {(inBag) ? <IoBagCheck onClick={() => modifyBagEmployer()} color='lightgreen'></IoBagCheck> : <IoBagAdd onClick={() => viewBagEmployer()}></IoBagAdd>}
        {modalBag &&
            <ModalForm
            title="Oferta de empleo"
            message="Selecciona una oferta de empleo"
            fields={fields}
            onSubmit={handleSubmit}
            onClose={closeModal}
          />
        }
    </div>
}

export default BagPanel;