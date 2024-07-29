import { useEffect, useState } from 'react';
import styles from '../styles/offerJobsPanel.module.css';
import FormCreateJob from './FormCreateJob';
import ViewJobs from './ViewJobs';
import { getData } from '../../lib/data';

const OfferJobsPanel =({modal, charge})=>{
    const [action, setAction]=useState(null)
    const [enums, setEnums] = useState(null)

    useEffect(()=>{
        charge(true)
        const cargarDatos = async () => {
            const enumsData = await getData();
            if (!enumsData.error) {
                let auxEnums = {}
                auxEnums['jobs'] = enumsData.jobs
                auxEnums['provinces'] = enumsData.provinces
                auxEnums['work_schedule'] = enumsData.work_schedule
                auxEnums['studies'] = enumsData.studies
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

    return <div className={styles.contenedor}>
        <div>
            <h2>Panel de ofertas</h2>
            <div>
                <button onClick={()=>setAction('create')}>Crear Oferta</button> 
                <button  onClick={()=>setAction('view')}>Ver Ofertas</button> 
            </div>  
        </div>
        <div className={styles.contenido}>
            {action=='create' && <FormCreateJob enums={enums} modal={(title, message)=>modal(title, message)} back={()=>setAction(null)} charge={(x)=>charge(x)} ></FormCreateJob>}
            {(action=='view' || action==null) && <ViewJobs enums={enums} modal={(title, message)=>modal(title, message)} back={()=>setAction(null)} charge={(x)=>charge(x)}></ViewJobs>}
        </div>
        
    </div>
    
}

export default OfferJobsPanel;