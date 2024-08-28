import { useEffect, useState } from "react";
import { getOfferJobs, updateOffer } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

import styles from '../styles/viewOfferJobs.module.css';
import { formatDatetime } from "../../lib/utils";
import { useLogin } from '../../hooks/useLogin';

const ViewJobs=({ charge, offerSelect, offers, changeOffers})=>{
    const { logged } = useLogin()

    const changeStatusOffer=async (status, id)=>{
        charge(true)
        const token=getToken();
        const auxData={
            id:id,
            active:status
        }
        const offerNew=await updateOffer(auxData, token)
        changeOffers(offerNew)
        charge(false)
    }

    const viewOffer=(offer)=>{
        offerSelect(offer)
    }

    return <div className={styles.contenedorOferta}>
        {offers!=null && offers.length==0 && <h3>ACTUALMENTE NO HAY OFERTAS ACTIVAS</h3>}
        {offers!=null &&
        offers.map((x)=>{
            return <div   className={styles.oferta}>
                <div onClick={()=>viewOffer(x) }>
                    <h3>{x.job_title}</h3>
                    <p>Fecha de creación: {formatDatetime(x.date)}</p>
                    <div>
                        <div>PROCESO: {x.bag.name}</div>
                    </div>  
                </div>
                {logged.user.role=='root'?<button onClick={()=>changeStatusOffer(!x.active, x._id)} className={(x.active)?'tomato':"green"}>{(!x.active)?'Activar':"Deshabilitar"}</button>:null}
            </div>
        })
        }
        
    </div>
}

export default ViewJobs;