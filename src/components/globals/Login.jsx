import styles from '../styles/form.module.css';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../../hooks/useLogin';
import { textErrors } from '../../lib/textErrors';
import { useState } from 'react';
import { validEmail, validPassword } from '../../lib/valid';
import { loginUser, loginUserCode, tokenGenerate } from '../../lib/data';
import { saveToken } from '../../lib/serviceToken';
import { deepClone } from '../../lib/utils';

const Login = ({ charge }) => {
    const { logged, changeLogged } = useLogin();
    const [code, setCode] = useState(false)
    const [datos, setDatos] = useState({
        email: null,
        password: null,
    });
    const [errores, setError] = useState({
        email: null,
        password: null,
    });

    const navigate = useNavigate();

    const handleChange = (e) => {
        let auxErrores = { ...errores };
        let auxDatos = { ...datos };
        auxErrores['mensajeError'] = null;
        let valido = false;

        if (e.target.name === 'email') valido = validEmail(e.target.value);
        if (e.target.name === 'password') valido = validPassword(e.target.value);

        auxDatos[e.target.name] = e.target.value;
        setDatos(auxDatos);

        if (!valido) {
            auxErrores[e.target.name] = textErrors(e.target.name);
        } else {
            auxErrores[e.target.name] = null;
        }
        setError(auxErrores);
    };

    const login = async () => {
        if (datos.email != "responsable@engloba.org.es") {
            charge(true);
            const login = await loginUserCode(datos.email);

            if (!login.error && login.message) {
                let auxData = deepClone(datos)
                auxData['userId'] = login.userId
                setDatos(auxData)
                setCode(true)
            }
            charge(false);
        } else {
            let valido = true;
            let auxErrores = { ...errores };
            for (const key in datos) {
                if (datos[key] === null) {
                    auxErrores[key] = textErrors('vacio');
                    valido = false;
                }
            }
            setError(auxErrores);

            if (valido) {
                charge(true);
                const login = await loginUser(datos.email, datos.password);
                if (login.error) {
                    auxErrores['mensajeError'] = login.message;
                    setError(auxErrores);
                    charge(false);
                } else {
                    charge(false);
                    changeLogged(login.user);
                    saveToken(login.token);
                    navigate('/');
                }
            }
        }

    };

    const verifyCode = async () => {
        charge(true);
        const login = await tokenGenerate(datos);
        if (login.error) {
            let auxErrores = { ...errores };
            auxErrores['mensajeError'] = login.message;
            setError(auxErrores);
            charge(false);
        } else {
            charge(false);
            changeLogged(login.user);
            saveToken(login.token);
            navigate('/');
        }
    }

    return (
        <div className={styles.contenedorLogin}>
            <div>
                <img src="/graphic/logotipo_blanco.png" alt="logotipo engloba" />
            </div>
            <div className={styles.contenedorForm}>
                {code ?
                    <>
                        <div className={styles.inputs}>
                            <label htmlFor="code">Codigo</label>
                            <input type="text" id="code" name="code" onChange={handleChange} value={datos.code || ''} />
                            {!!errores.code && <span className="errorSpan">{errores.code}</span>}
                        </div>
                        <button onClick={() => verifyCode()}>Enviar</button>
                        <div>
                            {code}
                        </div>
                        <button onClick={() => login()} className='tomato'>Reintentar</button>
                    </>

                    :
                    <>
                        <div className={styles.inputs}>
                            <label htmlFor="email">Email</label>
                            <input type="email" id="email" name="email" onChange={handleChange} value={datos.email || ''} />
                            {!!errores.email && <span className="errorSpan">{errores.email}</span>}
                        </div>
                        <div className={styles.inputs}>
                            <label htmlFor="password">Contraseña</label>
                            <input type="password" id="password" name="password" onChange={handleChange} value={datos.password || ''} />
                            {!!errores.password && <span className="errorSpan">{errores.password}</span>}
                        </div>
                        <button onClick={login}>
                            Entrar
                        </button>
                        <Link to={'/'}>
                            <button>Cancelar</button>
                        </Link>
                        {!!errores.mensajeError && <span className="errorSpan">{errores.mensajeError}</span>}
                    </>

                }





            </div>
        </div>
    );
}

export default Login;
