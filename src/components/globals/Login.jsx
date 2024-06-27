import styles from '../styles/form.module.css';
import { FaUserCircle, FaEnvelope   } from "react-icons/fa";
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../../hooks/useLogin';
import { textErrors } from '../../lib/textErrors';
import { useState } from 'react';
import { validEmail, validPassword } from '../../lib/valid';
import { loginUser } from '../../lib/data';
import { saveToken } from '../../lib/serviceToken';



const Login = () => {
    const { logged,  changeLogged } = useLogin()
    const [datos,setDatos]=useState({
        email: null,
        password: null,
    })
    const [errores, setError] = useState({
        email: null,
        password: null,
    })

    const navigate=useNavigate();

    const handleChange = (e) => {
        let auxErrores = { ...errores }
        let auxDatos= {...datos}
        auxErrores['mensajeError'] = null
        let valido = false;

        if (e.target.name == 'email') valido = validEmail(e.target.value)
        if (e.target.name == 'password')valido = validPassword(e.target.value)

        auxDatos[e.target.name]=e.target.value
        setDatos(auxDatos)
        if (!valido) {
            auxErrores[e.target.name] = textErrors(e.target.name)
        } else {
            auxErrores[e.target.name] = null
        }
        setError(auxErrores)
    }

    const login = async () => {
        let valido = true;
        let auxErrores = { ...errores }
        for (const key in datos) {
            if (datos[key] == null) {
                auxErrores[key] = textErrors('vacio')
                setError(auxErrores)
                valido = false;
            }
        }

        if (valido) {
            const login = await loginUser(datos.email, datos.password).catch((error) => console.log(error));
            if (login.error) {
                let auxErrores = { ...errores }
                auxErrores['mensajeError'] = login.message;
                setError(auxErrores)
            } else {
                changeLogged(login.user)
                saveToken(login.token)
                navigate('/')
            }
        }
    }


    return (
        <div className={styles.contenedorLogin}>
            <div>
                <img src="/graphic/imagotipo_blanco_malva_descriptor.png" alt="logotipo engloba" />
            </div>
            <div  className={styles.contenedorForm}>
                <div className={styles.inputs}>
                    <label htmlFor="email">Email</label>
                    <input type="email" id='email' name='email'onChange={(e)=>handleChange(e)} value={datos.email==null?'':datos.email}/>
                    <span className='errorSpan'>{errores.email}</span>
                </div>
                <div className={styles.inputs}>
                    <label htmlFor="password">Contraseña</label>
                    <input type="password" id='password' name='password' onChange={(e)=>handleChange(e)} value={datos.password==null?'':datos.password}/>
                    <span className='errorSpan'>{errores.password}</span>
                </div>
                <button onClick={()=>login()}>
                    Entrar
                </button>
                <Link to={'/'}>
                    <button>Cancelar</button>
                </Link>
                
            </div>
        </div>
    )
}

export default Login;