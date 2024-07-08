import styles from '../styles/menuStart.module.css';
import { FaUserCircle, FaEnvelope } from "react-icons/fa";
import { useLogin } from '../../hooks/useLogin';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { FaEarthEurope } from "react-icons/fa6";
import { GrDocumentUser } from "react-icons/gr";
import { AiOutlineEuro } from "react-icons/ai";
import ManagingResumenes from '../cv/ManagingResumes';
import ManagingSocial from '../social/ManagingSocial';
import ManagingPayroll from '../payroll/ManagingPayroll';
import { BagProvider } from '../../context/BagProvider'


const WorkerMenu = ({modal}) => {
    const [action, setAction] = useState(null)

    if(action!=null){
        if (action=='cv') return <BagProvider><ManagingResumenes closeAction={()=>setAction(null)} modalC={(title, message)=>modal(title, message)}/></BagProvider>;
        if( action=='socialForm') return <ManagingSocial closeAction={()=>setAction(null)} modalC={(title, message)=>modal(title, message)}/>;
        if( action=='payroll') return <ManagingPayroll closeAction={()=>setAction(null)} modalC={(title, message)=>modal(title, message)}/>;
    } else return (
        <>
        <div className={styles.contenedor}>
            <button onClick={()=>setAction('cv')}><GrDocumentUser/> GESTIONAR CV</button>
            <button onClick={()=>setAction('socialForm')}><FaEarthEurope/> IMPACTO SOCIAL</button>    
            <button onClick={()=>setAction('payroll')}><AiOutlineEuro/> GESTIONAR NÓMINAS</button>
        </div>
        <div>

        </div>
        </>   
    )
}

export default WorkerMenu;