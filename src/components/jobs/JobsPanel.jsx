import { useEffect, useState } from 'react';
import styles from '../styles/availableJobsPanel.module.css';
import {getOfferJobs } from '../../lib/data';
import { useParams } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import OfferDetail from './OfferDetail';
import { FaArrowLeft } from "react-icons/fa";

const JobsPanel=({ modal, charge })=>{
    const [offers, setOffers]=useState(null)
    const [offerSelected, setOfferSelected]=useState(null)
    const { id } = useParams();
    const navigate = useNavigate();


    useEffect(() => {
        charge(true);
        
        const cargarDatos = async () => {
            const offersData = await getOfferJobs();
            
            if (!offersData.error) {
                const offersActive=offersData.filter((x)=>x.active)
                if(!!id){
                    const offerParam=offersActive.filter((x)=>x._id==id);
                    if(offerParam.length>0){
                      setOfferSelected(offerParam[0])  
                    }
                }
                setOffers(offersActive);
                charge(false);
            } else {
                charge(false);
                modal('Error', 'Servicio no disponible, por favor inténtelo más tarde');
                navigate('/');
            }
            
        }
        cargarDatos();
    }, []);

    const selectOffer=(offer)=>{
        setOfferSelected(offer)
        navigate(`/ofertas/${offer._id}`)
    }

    const reset=()=>{
        setOfferSelected(null)
        navigate(`/ofertas`)
    }

    const handleChange=(e)=>{
        const auxOffer=offers.filter((x)=>{return x._id==e.target.value})
        selectOffer(auxOffer[0])
    }


    return  <div className={styles.contenedor}>
                
                <div className={styles.contenedorForm}>
                    <button className={styles.atras} onClick={()=>navigate(`/`)}><FaArrowLeft/></button>
                
                    <h2>OFERTAS DISPONIBLES</h2>
                    { !!offers && offers.length>0 && offers.map((x)=>{
                        return <div className={(offerSelected && offerSelected._id==x._id) ?`${styles.contenedorOferta} crema`:styles.contenedorOferta} onClick={()=>selectOffer(x)}>
                                    <h2>{x.job_title}</h2>
                                    <p>{x.location}</p>
                                </div>
                        })
                    }
                    <select className={styles.contenedorSelect} onChange={handleChange} >
                    <option value={''}>Selecciona una opción</option>
                    { !!offers && offers.length>0 && offers.map((x)=>{
                        return <option value={x._id}>{x.job_title}</option>
                                
                        })
                    }
                    </select>
                    {!!offers && offers.length==0 && <p>No hay ofertas actualmente</p>}
                    
                </div>
                <div className={styles.contenedorDetalleOferta}>
                    { !!offerSelected && <OfferDetail data={offerSelected} reset={()=>reset()}></OfferDetail>}
                </div>
            </div>

}

export default JobsPanel;