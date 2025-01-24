import { useEffect, useState } from 'react';
import styles from '../styles/ManagingMySelf.module.css';
import { useLogin } from '../../hooks/useLogin.jsx';

import InfoEmployer from '../employer/InfoEmployer.jsx';
import DocumentEmployerMiscelanea from '../employer/DocumentEmployerMiscelanea.jsx';
import Payrolls from '../payroll/Payrolls.jsx';

const ManagingMySelf = ({ modal, charge, listResponsability }) => {
    const { logged } = useLogin();
    const [isEditing, setIsEditing] = useState(false);  // Estado de edición
    const [currentUser, setCurrentUser] = useState(logged.user);  // Por defecto, mostramos el usuario logueado
    
    // Usamos useEffect para actualizar el usuario cuando logged.user cambie
    useEffect(() => {
        setCurrentUser(logged.user);  // Actualiza currentUser cuando logged.user cambia
    }, [logged.user]);

    const changeUser=(user)=>{
        setCurrentUser(user)
    }

    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <div className={styles.titulo}>
                    <h2>Mi Perfil</h2>
                </div>
                <div className={styles.componentes}>
                <InfoEmployer listResponsability={listResponsability} user={currentUser} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)}/>
                <DocumentEmployerMiscelanea listResponsability={listResponsability} user={currentUser} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)}/>
                <Payrolls user={logged.user} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)} listResponsability={listResponsability}/>
                </div> 
            </div>
        </div>
    );
};

export default ManagingMySelf;
