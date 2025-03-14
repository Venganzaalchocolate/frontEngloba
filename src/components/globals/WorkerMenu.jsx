import styles from '../styles/menuStart.module.css';

import ManagingResumenes from '../cv/ManagingResumes';
import ManagingSocial from '../social/ManagingSocial';
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
import FormCreateEmployer from '../employer/FormCreateEmployer';


const WorkerMenu = ({ modal, charge }) => {
    const { MenuWorker, changeMenuWorker } = useMenuWorker()
    const { logged } = useLogin()
    const [listResponsability, setlistResponsability] = useState({})
    const [enumsEmployer, setEnumsEmployer] = useState(null);


    const chargeResponsability = async () => {
        if (logged.user.role != 'root' && logged.user.role != 'global') {
            const token = getToken();
            const idUser = logged.user._id
            const dataAux = { _id: idUser }
            const responsability = await getDispositiveResponsable(dataAux, token);
            setlistResponsability(responsability)
        }
    }

    useEffect(() => {
        chargeResponsability();
        chargeEnums();
    }, [])

    //borrar
    // Cargar enumeraciones desde la API
    const chargeEnums = async () => {
        const enumsData = await getDataEmployer();
        setEnumsEmployer(enumsData);
        return enumsData;
    };

    const chargePrograms = (updatedPrograms) => {
        let updateProgramsList = updatedPrograms;
        if (!Array.isArray(updatedPrograms)) {
          updateProgramsList = enumsEmployer.programs.map(program =>
            program._id === updatedPrograms._id ? updatedPrograms : program
          );
        }
        
        // Aquí se crea un nuevo índice a partir de la lista actualizada
        const updatedIndex = updateProgramsList.reduce((acc, program) => {
          acc[program._id] = {
            ...program,
            devicesIds: program.devices ? program.devices.map(device => device._id) : []
          };
          return acc;
        }, {});
      
        setEnumsEmployer((prev) => ({
          ...prev,
          programs: updateProgramsList,
          programsIndex: updatedIndex
        }));
      };
      
      


        if (MenuWorker != null) {
            if (MenuWorker == 'cv') return <ManagingResumenes chargeEnums={chargeEnums} enumsEmployer={enumsEmployer} closeAction={() => changeMenuWorker(null)} modal={(title, message) => modal(title, message)} charge={(x) => charge(x)} />;
            if (MenuWorker == 'socialForm') return <ManagingSocial closeAction={() => changeMenuWorker(null)} modal={(title, message) => modal(title, message)} />;
            if (MenuWorker == 'offersJobs') return <OfferJobsPanel enumsData={enumsEmployer} closeAction={() => changeMenuWorker(null)} modal={(title, message) => modal(title, message)} charge={(x) => charge(x)} />;
            if (MenuWorker == 'programs') return <ManagingPrograms listResponsability={listResponsability} chargePrograms={chargePrograms} enumsData={enumsEmployer} closeAction={() => changeMenuWorker(null)} modal={(title, message) => modal(title, message)} charge={(x) => charge(x)} />;
            if (MenuWorker == 'employer') return <ManagingEmployer chargePrograms={chargePrograms} enumsData={enumsEmployer} listResponsability={listResponsability} closeAction={() => changeMenuWorker(null)} modal={(title, message) => modal(title, message)} charge={(x) => charge(x)} />;
            if (MenuWorker == 'myself') return <ManagingMySelf enumsData={enumsEmployer} listResponsability={listResponsability} closeAction={() => changeMenuWorker(null)} modal={(title, message) => modal(title, message)} charge={(x) => charge(x)} />;
            if (MenuWorker == 'root') return <PanelRoot chargeEnums={() => chargeEnums()} enumsData={enumsEmployer} closeAction={() => changeMenuWorker(null)} modal={(title, message) => modal(title, message)} charge={(x) => charge(x)} />;
            if (MenuWorker == 'formCreatePersonal') return <FormCreateEmployer enumsData={enumsEmployer} modal={modal} charge={charge} closeModal={() => changeMenuWorker(null)} chargeUser={() => changeMenuWorker(null)} />
        } else return (
            <div className={styles.contenedor} id={styles.contenedorWorkerMenu}>
                <div>
                    <h2>Bienvenido, {logged.user.firstName}</h2>

                    {logged.user.role == 'root'
                        ?
                        <>
                            <button onClick={() => changeMenuWorker('cv')}>SOLICITUDES DE EMPLEO</button>
                            <button onClick={() => changeMenuWorker('socialForm')}> IMPACTO SOCIAL</button>
                            <button onClick={() => changeMenuWorker('offersJobs')}> GESTIONAR OFERTAS</button>
                            <button onClick={() => changeMenuWorker('employer')}>GESTIONAR EMPLEADOS</button>
                            <button onClick={() => changeMenuWorker('programs')}>GESTIONAR PROGRAMAS Y DISPOSITVOS</button>
                            <button onClick={() => changeMenuWorker('root')}> PANEL ROOT</button>
                            <button onClick={() => changeMenuWorker('myself')}>MIS DATOS</button>
                        </>


                        : logged.user.role == 'global'
                            ?
                            <>
                                <button onClick={() => changeMenuWorker('cv')}>SOLICITUDES DE EMPLEO</button>
                                <button onClick={() => changeMenuWorker('offersJobs')}> GESTIONAR OFERTAS</button>
                                <button onClick={() => changeMenuWorker('employer')}>GESTIONAR EMPLEADOS</button>
                                <button onClick={() => changeMenuWorker('myself')}>MIS DATOS</button>
                                <button onClick={() => changeMenuWorker('programs')}>GESTIONAR PROGRAMAS Y DISPOSITVOS</button>
                            </>

                            : listResponsability.length > 0
                                ?
                                <>
                                    <button onClick={() => changeMenuWorker('myself')}>MIS DATOS</button>
                                    <button onClick={() => changeMenuWorker('cv')}>SOLICITUDES DE EMPLEO</button>
                                    <button onClick={() => changeMenuWorker('offersJobs')}>GESTIONAR OFERTAS</button>
                                    <button onClick={() => changeMenuWorker('employer')}>GESTIONAR EMPLEADOS</button>
                                    <button onClick={() => changeMenuWorker('programs')}>GESTIONAR PROGRAMAS Y DISPOSITVOS</button>
                                </>
                                :
                                <>
                                    <button onClick={() => changeMenuWorker('myself')}>MIS DATOS</button>
                                </>

                    }


                </div>

            </div>

        )
    }

    export default WorkerMenu;