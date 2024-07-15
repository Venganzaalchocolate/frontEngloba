import { useState } from 'react';
import styles from '../styles/offerJobsPanel.module.css';
import FormCreateJob from './FormCreateJob';
import ViewJobs from './ViewJobs';

const OfferJobsPanel =({modal, charge})=>{
    const [action, setAction]=useState(null)

    return <div className={styles.contenedor}>
        <div>
            <h2>Panel de ofertas</h2>
            <div>
                <button onClick={()=>setAction('create')}>Crear Oferta</button> 
                <button  onClick={()=>setAction('view')}>Ver Ofertas</button> 
            </div>  
        </div>
        <div className={styles.contenido}>
            {action=='create' && <FormCreateJob modal={(title, message)=>modal(title, message)} back={()=>setAction(null)} charge={(x)=>charge(x)} ></FormCreateJob>}
            {(action=='view' || action==null) && <ViewJobs modal={(title, message)=>modal(title, message)} back={()=>setAction(null)} charge={(x)=>charge(x)}></ViewJobs>}
        </div>
        
    </div>
    
}

export default OfferJobsPanel;