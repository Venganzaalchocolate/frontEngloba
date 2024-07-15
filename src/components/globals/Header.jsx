
import styles from '../styles/header.module.css';
import { FaUserCircle, FaEnvelope  } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useLogin';
import { FiAlignJustify } from "react-icons/fi";
import { useState } from 'react';
import { useMenuWorker } from '../../hooks/useMenuWorker';
import { RiCloseLargeFill } from "react-icons/ri";



const Header = () => {
    const [viewMenu, setViewMenu]=useState(false)
    const { logged, logout } = useLogin()
    const {MenuWorker,changeMenuWorker} =useMenuWorker()

    return (
        <header className={styles.header}>
            <div className={styles.contenedorLogotipo}>
                <img src="/graphic/logotipo_blanco.png" alt="logotipo Engloba"/>
            </div>
            <div  className={styles.contenedorIconos}>
                <button onClick={()=>logout()}>Cerrar Sesión</button>
                <FaEnvelope />
                {(viewMenu)?<RiCloseLargeFill  onClick={()=>setViewMenu(!viewMenu)}/>:<FiAlignJustify onClick={()=>setViewMenu(!viewMenu)}></FiAlignJustify>}
            </div>
            {viewMenu &&
            <div className={styles.menuHeader}>
                <ul>
                    <li onClick={()=>changeMenuWorker('cv')}>GESTION CV</li>
                    <li onClick={()=>changeMenuWorker('socialForm')}>IMPACTO SOCIAL</li>
                    <li onClick={()=>changeMenuWorker('payroll')}>GESTION NOMINAS</li>
                    <li onClick={()=>changeMenuWorker('offersJobs')}>GESTION OFERTAS</li>
                    <li onClick={()=>changeMenuWorker('employer')}>GESTION TRABAJADORES</li>
                    <li onClick={()=>changeMenuWorker('programs')}>GESTIONAR PROGRAMAS Y DISPOSITVOS</li>
                </ul>
            </div>
            }
        </header>
    )
}

export default Header;