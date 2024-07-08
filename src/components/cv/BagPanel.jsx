import { useEffect, useState } from 'react';
import styles from '../styles/bag.module.css';
import {  getBags, addEmployerBag } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';
import { IoBagAdd } from "react-icons/io5";
import { dateAndHour } from '../../lib/utils';
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
            if (x._id==userSelected._id) setInBag(true)
          })  
        }

    })

    const addEmployer = async () => {
        if (data._id != null && data.user!=null) {
            const token = getToken();
            const response = await addEmployerBag(data, token);
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
        {(inBag) ?<IoBagCheck color='lightgreen'></IoBagCheck>:<IoBagAdd onClick={() => viewBagEmployer()}></IoBagAdd>}
        {
            !!view && Bag!=null && <div className={styles.ventana}>
                <div className={styles.contenedor}>
                    <h2>Añadir a la Bolsa {Bag.name}</h2>
                    <p>¿Desea añadir este cv a la bolsa '{Bag.name}'?</p>
                    
                    <div>
                        <button onClick={() => addEmployer()}>Añadir</button>
                        <button onClick={() => viewBagEmployer()}>Cancelar</button>
                    </div>

                </div>

            </div>
        }
    </div>
}

export default BagPanel;