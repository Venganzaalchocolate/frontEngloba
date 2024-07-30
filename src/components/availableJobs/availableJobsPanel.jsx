import { useEffect, useState } from 'react';
import styles from '../styles/availableJobsPanel.module.css';
import {getOfferJobs } from '../../lib/data';
import { useParams } from 'react-router-dom';
import OfferDetail from './OfferDetail';
import { useNavigate } from 'react-router-dom';

const AvailableJobsPanel=({ modal, charge })=>{
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
                console.log(offersActive)
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


    return  <div className={styles.contenedor}>
            <div>
                <img src="/graphic/imagotipo_blanco_malva_descriptor.png" alt="logotipo engloba" />
            </div>
            <div className={styles.contenedorForm}>
                {offerSelected==null && !!offers && offers.map((x)=>{
                    return <div className={styles.contenedorOferta} onClick={()=>selectOffer(x)}>
                                <h2>{x.job_title}</h2>
                                <div className={styles.contenedorInfoOferta}>
                                    <p>{x.province}</p>
                                    <p>({x.location})</p>
                                </div>
                            </div>
                })
                }
                { !!offerSelected && <OfferDetail data={offerSelected} reset={()=>reset()}></OfferDetail>}
            </div>
        </div>

}

export default AvailableJobsPanel;