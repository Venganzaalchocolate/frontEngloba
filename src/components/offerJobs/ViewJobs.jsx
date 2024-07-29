import { useEffect, useState } from "react";
import { getOfferJobs, updateOffer } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import FormCreateJob from "./FormCreateJob";
import styles from '../styles/viewOfferJobs.module.css';
import { dateAndHour } from "../../lib/utils";

const ViewJobs=({enums, modal, charge, back})=>{
    const [offers, setOffers]=useState(null)
    const [offerSelected,setOfferSelected]=useState(null)

    const cargarDatos=async()=>{
        charge(true)
        const token=getToken()
        const data=await getOfferJobs(token)
        setOffers(data)
        charge(false)
    }

    useEffect(()=>{
        cargarDatos();
    },[offerSelected])

    const changeStatusOffer=async (status, id)=>{
        const token=getToken();
        const auxData={
            id:id,
            active:status
        }
        const changeStatusData= await updateOffer(auxData, token)
        cargarDatos();
    }

    const viewOffer=(id)=>{
        const auxOfferSelected=offers.filter((x)=>x._id==id)
        setOfferSelected(auxOfferSelected[0])
    }

    return <div className={styles.contenedorOferta}>
        {offers!=null && offerSelected==null &&
        offers.map((x)=>{
            return <div   className={styles.oferta}>
                <div onClick={()=>viewOffer(x._id) }>
                    <h3>{x.job_title}</h3>
                    <p>{dateAndHour(x.date)}</p>   
                </div>
                <button onClick={()=>changeStatusOffer(!x.active, x._id)} className={(x.active)?'tomato':"green"}>{(!x.active)?'Activar':"Deshabilitar"}</button>
            </div>
        })
        }
        {offers!=null && offerSelected!=null &&
            <div>
                <FormCreateJob enums={enums} back={()=>setOfferSelected(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)} datosOferta={offerSelected}></FormCreateJob>
                <button onClick={()=>setOfferSelected(null)}>Volver</button>
            </div>
        }
    </div>
}

export default ViewJobs;