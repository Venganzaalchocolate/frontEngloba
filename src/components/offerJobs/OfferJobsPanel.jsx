import { useEffect, useState } from 'react';
import styles from '../styles/offerJobsPanel.module.css';
import FormCreateJob from './FormCreateJob';
import ViewJobs from './ViewJobs';
import { getData, getOfferJobs} from '../../lib/data';
import { FaSquarePlus } from "react-icons/fa6";
import { getToken } from '../../lib/serviceToken';

const OfferJobsPanel =({modal, charge})=>{
    const [action, setAction]=useState(null)
    const [enums, setEnums] = useState(null)
    const [offerSelected, setOfferSelected]=useState(null)
    const [offers, setOffers]=useState(null)

    useEffect(()=>{
        charge(true)
        const cargarDatos = async () => {
            const enumsData = await getData();
            const token=getToken();
            const data=await getOfferJobs(token)
            if (!enumsData.error && !data.error) {
                let auxEnums = {}
                auxEnums['jobs'] = enumsData.jobs
                auxEnums['provinces'] = enumsData.provinces
                auxEnums['work_schedule'] = enumsData.work_schedule
                auxEnums['studies'] = enumsData.studies
                setOffers(data)
                setEnums(auxEnums)
                charge(false)
            } else {
                modal('Error', 'Servicio no disponible, porfavor inténtelo más tarde')
                navigate('/')
                charge(false)
            }
        }
        cargarDatos();
    }, [])


    const offerSelect=(offer)=>{
        setAction(null)
        setOfferSelected(offer)
    }

    const changeAction=()=>{
        setOfferSelected(null)
        setAction('create')
    }

    const changeOffers=(offer)=>{
        let exists=false
        const offersAux=[...offers]
        offersAux.map((x,i,a)=>{
            if(x._id==offer._id){
              a[i]=offer;  
              exists=true;
            } 
        })
        if(!exists)offersAux.push(offer)
        setOfferSelected(null)
        setOffers(offersAux)
    }

    const back=()=>{
        setOfferSelected(null)
        setAction(null)
    }


    return <div className={styles.contenedor}>
        <div className={styles.contenido}>
            <div className={styles.titulo}>
                <h2>GESTIÓN DE OFERTAS</h2>
                <FaSquarePlus onClick={()=>changeAction()}/>
            </div>  
            <div className={styles.caja}>
                <ViewJobs charge={(x)=>charge(x)} offerSelect={(x)=>offerSelect(x)} offers={offers}  changeOffers={(offer)=>changeOffers(offer)}></ViewJobs>
                {offerSelected!=null &&
                    <FormCreateJob enums={enums} back={()=>back()} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)} datosOferta={offerSelected} changeOffers={(offer)=>changeOffers(offer)}></FormCreateJob>    
                }
                {
                action=='create' &&
                    <FormCreateJob enums={enums} modal={(title, message)=>modal(title, message)} back={()=>back()} charge={(x)=>charge(x)} changeOffers={(offer)=>changeOffers(offer)}></FormCreateJob>
                }
                
            </div>
        </div>
        
        
    </div>
    
}

export default OfferJobsPanel;