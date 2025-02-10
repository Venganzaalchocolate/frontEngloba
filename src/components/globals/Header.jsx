
import styles from '../styles/header.module.css';
import { FaUserCircle, FaEnvelope  } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useLogin';
import { FiAlignJustify } from "react-icons/fi";
import { useState } from 'react';
import { useMenuWorker } from '../../hooks/useMenuWorker';
import { RiCloseLargeFill } from "react-icons/ri";
import { FaUserAlt } from "react-icons/fa";
import stylesTooltip from '../styles/tooltip.module.css';
import { useOffer } from '../../hooks/useOffer';



const Header = () => {
    const [viewMenu, setViewMenu]=useState(false)
    const {logout, logged } = useLogin()
    const {changeMenuWorker, MenuWorker} =useMenuWorker()
    const {changeOffer}=useOffer()

    const changeOption=(option)=>{
        changeOffer(null)
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
            
        </header>
    )
}

export default Header;