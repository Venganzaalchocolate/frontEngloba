import { useState } from "react";
import InfoEmployer from "./InfoEmployer";
import DocumentEmployer from "./DocumentEmployer";
import Payrolls from "./Payrolls";
import styles from '../styles/viewEmployer.module.css';
import VacationDays from "./VacationDays";
import Hiringperiods from "./HiringsPeriods";

const ViewEmployers = ({ user, modal, charge, changeUser }) => {

    const handleChangeFile = (e) => {
        const { name, files } = e.target;
        const file = files[0];  // Obtenemos el primer archivo subido
    
        // Verificamos que se haya seleccionado un archivo y que sea un archivo PDF
        if (file && file.type === 'application/pdf') {
            
            // Actualizamos el estado 'datos' añadiendo el archivo
            setDatos((prevDatos) => ({ 
                ...prevDatos, 
                [name]: file 
            }));
    
            // Limpiamos cualquier error asociado
            setError((prevErrores) => ({ 
                ...prevErrores, 
                [name]: null 
            }));
        } else {
            // Si el archivo no es válido, mostramos un mensaje de error
            setError((prevErrores) => ({ 
                ...prevErrores, 
                [name]: textErrors('fileError') 
            }));
        }
    };

    


    return (
        <div className={styles.contenedor}>
            <InfoEmployer user={user} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)}/>
            <DocumentEmployer user={user} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)}/>
            <Payrolls user={user} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)}/>
            <VacationDays  user={user} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)}/>
            <Hiringperiods  user={user} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)}/>
            {/* Otros detalles que quieras mostrar */}
        </div>
    );
};

export default ViewEmployers;