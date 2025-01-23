import { useEffect, useState } from "react";
import styles from '../styles/infoEmployer.module.css';
import { FaEdit } from "react-icons/fa";
import { validateBankAccount, validateDNIorNIE, validateSocialSecurityNumber, validEmail, validNumber, validPassword, validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { getToken } from "../../lib/serviceToken";
import { editUser } from "../../lib/data";
import { deepClone } from "../../lib/utils";

const InfoEmployer = ({ user,modal, charge, changeUser, listResponsability }) => {
    const [isEditing, setIsEditing] = useState(false); // Controla si estamos en modo de edición
    const [datos, setDatos] = useState(user); // Estado local para los datos del usuario
    const [errores, setErrores] = useState({}); // Estado local para los errores


    // Maneja los cambios en los campos de texto
    const handleChange = (e) => {
        const { name, value } = e.target;
        let auxErrores = { ...errores };
        let auxDatos = { ...datos };
        auxErrores['mensajeError'] = null; 
        let valido = false;
    
        // Validar según el tipo de input
        if (name === 'firstName') {
            valido = validText(value, 3, 100); // Por ejemplo, longitud entre 3 y 100 caracteres
        } else if (name === 'email') {
            valido = validEmail(value); // Valida formato de email
        } else if (name === 'phone') {
            valido = validNumber(value); // Valida que sea un número válido
        } else if (name ==='dni'){
            if(value!='') {
                valido = validateDNIorNIE(value) 
            } else {
               auxErrores['dni']=null; 
               valido=true; 
            }
        } else if (name==='bankAccountNumber'){
            if(value!='') {
                valido = validateBankAccount(value)
            } else {
               auxErrores['bankAccountNumber']=null; 
               valido=true; 
            }
            
        } else if (name==='socialSecurityNumber'){
            if(value!='') {
                valido = validateSocialSecurityNumber(value)
            } else {
               auxErrores['socialSecurityNumber']=null; 
               valido=true; 
            }
        } else if(name=='pass'){
            
            if(value!='') {
                valido = validPassword(value)
            } else {
               auxErrores['pass']=null; 
               valido=true; 
            }
        }

        // Actualizar el campo en los datos
        auxDatos[name] = value;
        setDatos(auxDatos);
        // Manejo de errores basado en la validación
        if (!valido) {
            auxErrores[name] = textErrors(name); // Función que genera mensajes de error específicos
        } else {
            auxErrores[name] = null; // Limpia el error si es válido
        }
        // Actualiza los errores
        setErrores(auxErrores);
    };
    

    // Función para validar los campos
    const validateFields = () => {
        const newErrors = {};
        const datosAux= deepClone(datos)


        for (let key in errores) {
            if (errores.hasOwnProperty(key)) {
                if(errores[key]!=null && datosAux[key]!=''){
                return false  
                } 
            }
        }
        if (!datos.firstName) newErrors.firstName = 'El nombre es requerido.';
        if (!datos.email) newErrors.email = 'El email es requerido.';
        if (!datos.phone) newErrors.phone = 'El teléfono es requerido.';

        setErrores(newErrors)
         // Actualizamos los errores
        return Object.keys(newErrors).length === 0; // Si no hay errores, devuelve true
    };

    // Maneja la activación del modo de edición
    const handleEdit = () => {
        setIsEditing(!isEditing);
    };

    // Maneja el guardado de los cambios
    const handleSave = async () => {
        if (validateFields()) {
            setIsEditing(false);
            const token = getToken();
            charge(true)
            const response = await editUser(datos, token);
            if(!response.error){
              changeUser(datos)  
            }
            modal('Editar Usuario', 'Usuario editado con éxito')
            charge(false)

            // Aquí podrías hacer algo más, como emitir un evento al padre si fuera necesario
        } 
    };

    // Campos del formulario
    const textFields = [
        ['firstName', 'Nombre'],
        ['lastName', 'Apellidos'],
        ['dni', 'DNI'],
        ['email', 'Email'],
        ['phone', 'Teléfono'],
        ['employmentStatus', 'Estado Laboral'],
        ['socialSecurityNumber', 'Número de Seguridad Social'],
        ['bankAccountNumber', 'Número de Cuenta Bancaria'],
    ];

    const reset=()=>{
        setErrores({})
        handleEdit();
        setDatos(user)
    }

    const boton=()=>{
        if(!!listResponsability && listResponsability.length<1) return ''
        const component= !isEditing ? (
            <FaEdit onClick={handleEdit}></FaEdit>
        ) : (
            <>
            <button onClick={handleSave}>Guardar</button>
            <button onClick={reset}>Cancelar</button>
            </>
            
        )
        return component
    }

    return (
        <div className={styles.contenedor}>
            <h2>DATOS {boton()}</h2>
            {textFields.map((field) => (
                
                <div key={field[0]} >
                    <label htmlFor={field[0]}>{field[1]}</label>
                    <input
                        type="text"
                        id={field[0]}
                        name={field[0]}
                        value={datos[field[0]] || ''}
                        onChange={handleChange}
                        disabled={(field[0]=='employmentStatus')?true:!isEditing}
                    />
                    
                    {errores[field[0]] && <span className="errorSpan">{errores[field[0]]}</span>}
                </div>
            ))}
            <div className={styles.contenedorBotones}>
                    
            </div>
            
        </div>
    );
};

export default InfoEmployer;