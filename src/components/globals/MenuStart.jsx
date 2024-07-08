import styles from '../styles/menuStart.module.css';
import { Link } from 'react-router-dom';



const MenuStart = () => {
    return (
        <div className={styles.contenedor}>
            <div>
                <img src="/graphic/imagotipo_blanco_malva_descriptor.png" alt="logotipo engloba" />
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
                <Link to={'/contacto'}>
                        <p>Contacto</p>   
                </Link>
            </div>
        </div>
    )
}

export default MenuStart;