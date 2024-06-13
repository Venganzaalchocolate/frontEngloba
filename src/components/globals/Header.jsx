
import styles from '../styles/header.module.css';
import { FaUserCircle, FaEnvelope   } from "react-icons/fa";
import { Link } from 'react-router-dom';
import { useLogin } from '../../hooks/useLogin';



const Header = () => {
    const { logged } = useLogin()

    return (
        <header className={styles.header}>
            <div className={styles.contenedorLogotipo}>
                <img src="/graphic/logotipo_blanco.png" alt="logotipo Engloba"/>
            </div>
            <div  className={styles.contenedorIconos}>
                <FaUserCircle/>
                <FaEnvelope />
            </div>
        </header>
    )
}

export default Header;