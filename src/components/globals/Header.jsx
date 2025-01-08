
import styles from '../styles/header.module.css';
import { FaUserCircle, FaEnvelope  } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useLogin';
import { FiAlignJustify } from "react-icons/fi";
import { useState } from 'react';
import { useMenuWorker } from '../../hooks/useMenuWorker';
import { RiCloseLargeFill } from "react-icons/ri";
import { useBag } from '../../hooks/useBag';
import { FaUserAlt } from "react-icons/fa";
import stylesTooltip from '../styles/tooltip.module.css';



const Header = () => {
    const [viewMenu, setViewMenu]=useState(false)
    const {logout, logged } = useLogin()
    const {resetBag}=useBag()
    const {changeMenuWorker, MenuWorker} =useMenuWorker()

    const changeOption=(option)=>{
        resetBag(); 
        changeMenuWorker(option)
        setViewMenu(false)
    }

    return (
        <header className={styles.header}>
            <div className={styles.contenedorLogotipo}>
                    <img src="/graphic/logotipo_blanco.png" alt="logotipo Engloba" onClick={()=>changeMenuWorker(null)}/>
            </div>
            <div  className={styles.contenedorIconos}>
                {MenuWorker!=null && <button onClick={()=>changeOption(null)}>Volver al menú</button>}
                <span className={stylesTooltip.tooltip}><FaUserAlt onClick={()=>logout()}/><span className={stylesTooltip.tooltiptext}>cerrar sesión</span></span>
                
                
                {/* <FaEnvelope />
                {(viewMenu)?<RiCloseLargeFill  onClick={()=>{resetBag(); setViewMenu(!viewMenu)}}/>:<FiAlignJustify onClick={()=>{resetBag(); setViewMenu(!viewMenu)}}></FiAlignJustify>} */}
            </div>
            {/* {viewMenu && logged.user.role=='root' &&
            <div className={styles.menuHeader}>
                <ul>
                    <li onClick={()=>changeOption('cv')}>GESTION CV</li>
                    <li onClick={()=>changeOption('socialForm')}>IMPACTO SOCIAL</li>
                    <li onClick={()=>changeOption('payroll')}>GESTION NOMINAS</li>
                    <li onClick={()=>changeOption('offersJobs')}>GESTION OFERTAS</li>
                    <li onClick={()=>changeOption('employer')}>GESTION TRABAJADORES</li>
                    <li onClick={()=>changeOption('programs')}>GESTIONAR PROGRAMAS Y DISPOSITVOS</li>
                </ul>
            </div>
            } */}
        </header>
    )
}

export default Header;