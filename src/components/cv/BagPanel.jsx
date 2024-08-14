import { useEffect, useState } from 'react';
import styles from '../styles/bag.module.css';
import {  addEmployerBag, deleteEmployerBag } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';
import { IoBagAdd } from "react-icons/io5";
import { useBag } from "../../hooks/useBag.jsx";
import { IoBagCheck } from "react-icons/io5";

const BagPanel = ({userSelected}) => {
    const [view, setView] = useState(false)
    const {Bag, changeBag}= useBag()
    const [inBag, setInBag]= useState(false)
    const [data, setData] = useState({
        _id:Bag._id,
        user:userSelected
    })


    useEffect(()=>{
        if(!!Bag.userCv){
          Bag.userCv.map((x)=>{
            if (x==userSelected._id) setInBag(true)
          })  
        }

    })

    const modifyBagEmployer = async () => {
        if (data._id != null && data.user!=null) {
            const token = getToken();
            let response={error:true};
            if(inBag)  response = await deleteEmployerBag(data, token);
            else  response = await addEmployerBag(data, token);
            if (!response.error) {
                changeBag(response)
                setView(null)
            }
        }
    }

    const viewBagEmployer = () => {
        setView(!view)
    }

    return <div>
        {(inBag) ?<IoBagCheck onClick={() => viewBagEmployer()} color='lightgreen'></IoBagCheck>:<IoBagAdd onClick={() => viewBagEmployer()}></IoBagAdd>}
        {
            !!view && Bag!=null && <div className={styles.ventana}>
                <div className={styles.contenedor}>
                    <h2>{(inBag)?'Quitar del':'Añadir al'} {Bag.name}</h2>
                    <p>¿Desea añadir este cv a la bolsa '{Bag.name}'?</p>
                    
                    <div>
                        <button onClick={() => modifyBagEmployer()}>{(inBag)?'Quitar':'Añadir'}</button>
                        <button onClick={() => viewBagEmployer()}>Cancelar</button>
                    </div>

                </div>

            </div>
        }
    </div>
}

export default BagPanel;