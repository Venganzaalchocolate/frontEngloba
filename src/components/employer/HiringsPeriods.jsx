import { useEffect, useState } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import { getToken } from '../../lib/serviceToken.js';
import HiringList from './HiringList.jsx';
import HiringPeriodNew from './HiringPeriodNew.jsx'; // <-- nuevo
import { getDataEmployer, getPrograms, hirings } from '../../lib/data.js';
import { useLogin } from '../../hooks/useLogin.jsx';

const Hiringperiods = ({ user, modal, charge, changeUser,enumsData,chargeUser}) => {
    const [buttonCreateHiring, setButtonCreateHiring] = useState(false);
    const { logged } = useLogin();
    /**
     * Función principal para guardar/actualizar hiring.
     * Se llamará con 'create', 'delete', etc.
     */
    const saveHiring = async (hiringData, type) => {
        const token = getToken();
        let dataSave = {};

        if (type === 'createLeave') {
            dataSave = {
                userId: user._id,
                type: type,
                hirindId: hiringData.idHiring,
                leave: hiringData.leaveNew
            };
        } else if (type === 'delete') {
            dataSave = {
                userId: user._id,
                type: type,
                hirindId: hiringData._id,
            };
        } else if (type === 'deleteLeave') {
            dataSave = {
                userId: user._id,
                type: type,
                hirindId: hiringData._id,
                leaveId: hiringData.leaveId
            };
        } else if (type === 'updateLeave') {
            // hiringData DEBE traer ._id (del leavePeriod), .startLeaveDate, etc.
            // además de .hiringPeriodId (el padre o LeavePeriods se lo pasa)
            dataSave = {
              userId: user._id,
              type: 'updateLeave',
              hirindId: hiringData.hiringPeriodId,  // OJO: Asegúrate que lo tengas
              leaveUpdated: {
                _id: hiringData._id,
                startLeaveDate: hiringData.startLeaveDate,
                expectedEndLeaveDate: hiringData.expectedEndLeaveDate,
                actualEndLeaveDate: hiringData.actualEndLeaveDate,
                leaveType: hiringData.leaveType
              }
            };
          }  else {
            // Para type === 'create' u otros
            dataSave = {
                userId: user._id,
                type: type,
                hirings: hiringData
            };
        }

        charge(true); // mostrar indicador de carga?
        const userNow = await hirings(dataSave, token);
        charge(false);

        if (!userNow.error) {
            modal('Periodo guardado', 'Periodo guardado con éxito');
            changeUser(userNow); // Actualizar el estado del user
            chargeUser();
        } else {
            modal('Error', userNow.message);
            setButtonCreateHiring(false);
        }
    };

    return (
        <>
         <div className={styles.contenedor}>
            <h2>
                PERIODOS DE CONTRATACIÓN
                {(logged.user.role=='global' || logged.user.role=='root') && <FaSquarePlus onClick={() => setButtonCreateHiring(true)} />}
                
            </h2>
            
            {/* Si buttonCreateHiring es true, mostramos el nuevo modal */}
           

            {/* Lista con HiringList */}
            <HiringList
              hirings={user.hiringPeriods}
              enums={enumsData}
              saveHiring={(x, y) => saveHiring(x, y)}
              
            />
        </div>
         {buttonCreateHiring && (
            <HiringPeriodNew
                user={user}
                enumsData={enumsData}               // pasamos enumerados si ya cargaron
                save={(x, y) => saveHiring(x, y)} // llamamos a la misma función
                onClose={() => setButtonCreateHiring(false)}
            />
        )}
        </>
       
    );
};

export default Hiringperiods;
