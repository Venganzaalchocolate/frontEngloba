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

const WorkerMenu = ({modal, charge}) => {
    const {MenuWorker,changeMenuWorker} =useMenuWorker()
    const { logged } = useLogin()
    if(MenuWorker!=null){
        if (MenuWorker=='cv') return <ManagingResumenes closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
        if( MenuWorker=='socialForm') return <ManagingSocial closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)}/>;
        if( MenuWorker=='payroll') return <ManagingPayroll closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)}/>;
        if( MenuWorker=='offersJobs') return <OfferJobsPanel closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message) } charge={(x)=>charge(x)}/>;
        if( MenuWorker=='programs') return <ManagingPrograms closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
        if( MenuWorker=='employer') return <ManagingEmployer closeAction={()=>changeMenuWorker(null)} modal={(title, message)=>modal(title, message)} charge={(x)=>charge(x)}/>;
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
                </>
                
                }
                {logged.user.role!='root' &&
                <>
                    <button onClick={()=>changeMenuWorker('cv')}> GESTIONAR CURRICULUMS</button>
                    <button onClick={()=>changeMenuWorker('offersJobs')}> GESTIONAR OFERTAS</button>
                </>
                
                }
                

            </div>
            
        </div>

    )
}

export default WorkerMenu;