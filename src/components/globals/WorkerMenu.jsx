import styles from '../styles/menuStart.module.css';

import ManagingResumenes from '../cv/ManagingResumes';
import ManagingSocial from '../social/ManagingSocial';
import ManagingPayroll from '../payroll/ManagingPayroll';
import { BagProvider } from '../../context/BagProvider'
import { useMenuWorker } from '../../hooks/useMenuWorker';
import OfferJobsPanel from '../offerJobs/OfferJobsPanel';
import { useLogin } from '../../hooks/useLogin';
import ManagingPrograms from '../programs/ManagingPrograms';
import ManagingEmployer from '../employer/ManagingEmployer';
import PanelRoot from '../root/panelRoot';
import ManagingMySelf from '../myself/ManagingMySelf';
import { useEffect, useState } from 'react';
import { getDataEmployer, getDispositiveResponsable } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';

const WorkerMenu = ({modal, charge}) => {
    const {MenuWorker,changeMenuWorker} =useMenuWorker()
    const { logged } = useLogin()
    const [listResponsability, setlistResponsability]=useState({})

    const chargeResponsability=async()=>{
        const token= getToken();
        const idUser=logged.user._id
        const dataAux={_id:idUser}
        const responsability = await getDispositiveResponsable(dataAux,token);
        setlistResponsability(responsability)
        }

    useEffect(()=>{
        chargeResponsability();
    },[])


    if(MenuWorker!=null){
        if (MenuWorker=='cv') return <ManagingResumenes closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
        if( MenuWorker=='socialForm') return <ManagingSocial closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)}/>;
        if( MenuWorker=='payroll') return <ManagingPayroll listResponsability={listResponsability} closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
        if( MenuWorker=='offersJobs') return <OfferJobsPanel closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message) } charge={(x)=>charge(x)}/>;
        if( MenuWorker=='programs') return <ManagingPrograms closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
        if( MenuWorker=='employer') return <ManagingEmployer listResponsability={listResponsability} closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
        if( MenuWorker=='myself') return <ManagingMySelf closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
        if( MenuWorker=='root') return <PanelRoot closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
    } else return (
        <div className={styles.contenedor} id={styles.contenedorWorkerMenu}>
            <div>
                <h2>Bienvenido, {logged.user.firstName}</h2>
                
                {logged.user.role=='root' &&
                <>
                    <button onClick={()=>changeMenuWorker('cv')}>SOLICITUDES DE EMPLEO</button>
                    <button onClick={()=>changeMenuWorker('socialForm')}> IMPACTO SOCIAL</button>    
                    <button onClick={()=>changeMenuWorker('payroll')}> GESTIONAR NÓMINAS</button>
                    <button onClick={()=>changeMenuWorker('offersJobs')}> GESTIONAR OFERTAS</button>
                    <button onClick={()=>changeMenuWorker('employer')}>GESTIONAR TRABAJADORES</button>
                    <button onClick={()=>changeMenuWorker('programs')}>GESTIONAR PROGRAMAS Y DISPOSITVOS</button>
                    <button onClick={()=>changeMenuWorker('root')}> PANEL ROOT</button>
                    <button onClick={()=>changeMenuWorker('myself')}>Mi Perfil</button>
                </>
                
                }
                {logged.user.email=='responsable@engloba.org.es' &&
                <>
                    <button onClick={()=>changeMenuWorker('cv')}>SOLICITUDES DE EMPLEO</button>
                    <button onClick={()=>changeMenuWorker('offersJobs')}> GESTIONAR OFERTAS</button>
                </>
                }
                {listResponsability.length>0 
                ?
                    <>
                        <button onClick={()=>changeMenuWorker('cv')}>SOLICITUDES DE EMPLEO</button>
                        <button onClick={()=>changeMenuWorker('offersJobs')}> GESTIONAR OFERTAS</button>
                        <button onClick={()=>changeMenuWorker('employer')}>GESTIONAR TRABAJADORES</button>
                    </>
                :
                    <button onClick={()=>changeMenuWorker('payroll')}> GESTIONAR NÓMINAS</button>
                }
                

            </div>
            
        </div>

    )
}

export default WorkerMenu;