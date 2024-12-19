import { useEffect, useState } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import { getToken } from '../../lib/serviceToken.js';
import HiringList from './HiringList.jsx';
import { getDataEmployer, getPrograms, hirings } from '../../lib/data.js';
import HiringPeriodNew from './HiringPeriodNew.jsx';

const Hiringperiods = ({ user, modal, charge, changeUser }) => {
    const [enums, setEnums] = useState({})
    const [buttonCreateHiring, setButtonCreateHiring] = useState(false)
    
    

    const updateEnums = async () => {
        const dataEnum = await getDataEmployer();
        setEnums(dataEnum)
    }

    useEffect(() => {
        updateEnums();
    }, [])

    const saveHiring = async (hiringData, type) => {
        const token = getToken();
        let dataSave={}
        if(type=='createLeave'){
            dataSave = {
                userId: user._id,
                type: type,
                hirindId:hiringData.idHiring,
                leave: hiringData.leaveNew
            } 
        } else if(type=='delete'){
            dataSave = {
                userId: user._id,
                type: type,
                hirindId:hiringData._id,
            } 
        } else if(type=='deleteLeave'){
            dataSave = {
                userId: user._id,
                type: type,
                hirindId:hiringData._id,
                leaveId: hiringData.leaveId
            }
        }else {
            dataSave = {
                userId: user._id,
                type: type,
                hirings: hiringData
            }    
        }
        
        const userNow = await hirings(dataSave, token)
        if (!userNow.error) {
            modal('Periodo guardado', 'Periodo guardado con éxito')
            changeUser(userNow)
        } else{
            modal('Error', 'Error al guardar el periodo')
            setButtonCreateHiring(false)
        }

    }

    return (
        <div className={styles.contenedor}>
            <h2>PERIODOS DE CONTRATACIÓN <FaSquarePlus onClick={() => setButtonCreateHiring(true)} /></h2>
            {buttonCreateHiring &&
                <HiringPeriodNew enumsData={enums} save={(x, y) => saveHiring(x, y)} close={()=>setButtonCreateHiring(false)}></HiringPeriodNew>
            }
            <HiringList hirings={user.hiringPeriods} enums={enums} saveHiring={(x, y) => saveHiring(x, y)} />
        </div>
    );
};

export default Hiringperiods;