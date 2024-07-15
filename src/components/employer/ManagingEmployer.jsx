import { useState } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import FormCreateEmployers from './FormCreateEmployer';
import ViewEmployers from './ViewEmployers';

const ManagingEmployer =()=>{
    const [action, setAction]=useState(null)

    return <div className={styles.contenedor}>
        <div>
            <h2>GESTIONAR TRABAJADOR</h2>
            <div>
                <button onClick={()=>setAction('create')}>Crear Oferta</button> 
                <button  onClick={()=>setAction('edit')}>Editar Ofertas</button> 
                <button  onClick={()=>setAction('view')}>Ver Ofertas</button> 
            </div>  
        </div>
        <div className={styles.contenido}>
            {action=='create' && <FormCreateEmployers/>}
            {action=='view' && <ViewEmployers/>}
        </div>
        
    </div>
    
}


export default ManagingEmployer;