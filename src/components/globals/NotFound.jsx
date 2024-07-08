import { useNavigate } from "react-router-dom"
import styles from '../styles/notFound.module.css';

const NotFound=()=>{
    const navigate=useNavigate()
    return <div className={styles.contenedor}>
        <div className={styles.imagen}>
            <h2>Ups.. la página no está</h2>
            <img src="./graphic/not_found.svg" alt="not_found" />
            <button onClick={()=>navigate('/')}>Volver</button>
        </div>
        
    </div>
}

export default NotFound;