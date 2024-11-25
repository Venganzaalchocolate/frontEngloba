import { useEffect, useState } from 'react';
import styles from '../styles/ManagingMySelf.module.css';
import { useLogin } from '../../hooks/useLogin.jsx';
import MySelfForm from './MySelfForm.jsx';

const ManagingMySelf = ({ modal, charge }) => {
    const { logged } = useLogin();
    const [isEditing, setIsEditing] = useState(false);  // Estado de edición
    const [currentUser, setCurrentUser] = useState(logged.user);  // Por defecto, mostramos el usuario logueado

    
    // Usamos useEffect para actualizar el usuario cuando logged.user cambie
    useEffect(() => {
        setCurrentUser(logged.user);  // Actualiza currentUser cuando logged.user cambia
    }, [logged.user]);

    const handleCreateAction = () => {
        setCurrentUser(null);  // Al crear un nuevo responsable, vaciamos los campos
        setIsEditing(true);    // Activamos el modo edición
    };

    const handleCloseForm = () => {
        setCurrentUser(logged.user);  // Al cerrar el formulario, volvemos al usuario logueado
        setIsEditing(false);  // Desactivamos el modo edición
    };

    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <div className={styles.titulo}>
                    <h2>Mi Perfil</h2>
                    {logged.user.email === 'responsable@engloba.org.es' && (
                        <button onClick={handleCreateAction}>Crear responsable</button>
                    )}
                </div>

                <div className={styles.caja}>
                    <MySelfForm 
                        modal={modal} 
                        charge={charge} 
                        user={currentUser}  // Pasamos el usuario o null si es para crear uno nuevo
                        isEditing={isEditing} 
                        setIsEditing={setIsEditing} 
                        closeForm={handleCloseForm} 
                    />
                </div>
            </div>
        </div>
    );
};

export default ManagingMySelf;
