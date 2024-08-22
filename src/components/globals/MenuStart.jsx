import styles from '../styles/menuStart.module.css';
import { Link } from 'react-router-dom';



const MenuStart = () => {
    return (
        <div className={styles.contenedor}>
            <div>
                <img src="/graphic/logotipo_blanco.png" alt="logotipo engloba" />
            </div>
            <div className={styles.menu}>
                <Link to={'/login'}>
                    <button>LOGIN</button>
                </Link>
                <Link to={'/trabajaconnosotros'}>
                    <button>TRABAJA CON NOSOTROS</button>
                </Link>
                <Link to={'/ofertas'}>
                    <button>OFERTAS DE EMPLEO</button>
                </Link>
                <a href="mailto:comunicacion@engloba.org.es?subject=app">CONTACTO</a>   
            </div>
        </div>
    )
}

export default MenuStart;