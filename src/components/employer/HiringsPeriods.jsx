import { useEffect, useState } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import { getToken } from '../../lib/serviceToken.js';
import HiringList from './HiringList.jsx';
import { getDataEmployer, getPrograms, hirings } from '../../lib/data.js';

const Hiringperiods = ({ user, modal, charge, changeUser }) => {
    const [enums, setEnums]=useState({})

    const updateEnums=async()=>{
        const dataEnum=await getDataEmployer();
        console.log(dataEnum)
        setEnums(dataEnum)
    }

    useEffect(()=>{
        updateEnums();
    },[])

    const saveHiring=async (hiringData, type)=>{
        const token=getToken();
        const dataSave={
            userId:user._id,
            type: type,
            hirings:hiringData
        }
        const response= await hirings(dataSave, token)
        console.log(response)
        if(!response.error){
           changeUser(response) 
        }
        
    }

    return (
        <div className={styles.contenedor}>
            <h2>PERIODOS DE CONTRATACIÓN <FaSquarePlus onClick={() => setUpW(!upW)} /></h2>
            <HiringList hirings={user.hiringPeriods} enums={enums} saveHiring={(x,y)=>saveHiring(x,y)}/>
        </div>
    );
};

export default Hiringperiods;