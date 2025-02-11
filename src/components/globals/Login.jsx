import styles from '../styles/form.module.css';
import { Link, useNavigate } from 'react-router-dom';
import { useLogin } from '../../hooks/useLogin';
import { textErrors } from '../../lib/textErrors';
import { useState } from 'react';
import { validEmail } from '../../lib/valid';
import { loginUserCode, tokenGenerate } from '../../lib/data';
import { saveToken } from '../../lib/serviceToken';
import { deepClone } from '../../lib/utils';
import Modal from './Modal'; // Asegúrate de que la ruta sea correcta

const Login = ({ charge }) => {
  const { changeLogged } = useLogin();
  const [code, setCode] = useState(false);
  const [datos, setDatos] = useState({
    email: '',
    code: '',
  });
  const [errores, setError] = useState({
    email: null,
    mensajeError: null
  });
  const [modalData, setModalData] = useState({
    open: false,
    title: '',
    message: ''
  });

  const navigate = useNavigate();

  // Función simplificada para manejar cambios en los inputs
  const handleChange = (e) => {
    const { name, value } = e.target;

    // Actualizamos el estado de datos
    setDatos((prev) => ({ ...prev, [name]: value }));

    // Si el campo es email, validamos y actualizamos el error correspondiente
    if (name === 'email') {
      if (!validEmail(value)) {
        setError((prev) => ({ ...prev, email: textErrors('email') }));
      } else {
        setError((prev) => ({ ...prev, email: null }));
      }
    }
    // Si hay error general, lo limpiamos
    setError((prev) => ({ ...prev, mensajeError: null }));
  };

  const login = async () => {
    // Validamos que se haya ingresado un email
    if (!datos.email || datos.email.trim() === '') {
      setError((prev) => ({ ...prev, email: textErrors('vacio') }));
      return;
    }
    // Si el email no es válido, no se procede
    if (!validEmail(datos.email)) {
      return;
    }

    charge(true);
    // Llamamos a loginUserCode ya que no hay contraseña en este flujo
    const loginResult = await loginUserCode(datos.email);
    if (!loginResult.error && loginResult.message) {
      // Guardamos el userId enviado por el back y activamos el modo código
      const auxData = deepClone(datos);
      auxData['userId'] = loginResult.userId;
      setDatos(auxData);
      setCode(true);
      // Abrimos el modal informativo
      setModalData({
        open: true,
        title: "Código Enviado",
        message: "Se ha enviado un código a tu email. Tienes 5 minutos para usarlo."
      });
    } else {
      setError((prev) => ({ ...prev, mensajeError: loginResult.message }));
    }
    charge(false);
  };

  const verifyCode = async () => {
    charge(true);
    const loginResult = await tokenGenerate(datos);
    if (loginResult.error) {
      setError((prev) => ({ ...prev, mensajeError: loginResult.message }));
      charge(false);
    } else {
      charge(false);
      changeLogged(loginResult.user);
      saveToken(loginResult.token);
      navigate('/');
    }
  };

  return (
    <>
      <div className={styles.contenedorLogin}>
        <div>
          <img src="/graphic/logotipo_blanco.png" alt="logotipo engloba" />
        </div>
        <div className={styles.contenedorForm}>
          {code ? (
            <>
              <div className={styles.inputs}>
                <label htmlFor="code">Código</label>
                <input
                  type="text"
                  id="code"
                  name="code"
                  onChange={handleChange}
                  value={datos.code}
                />
                {!!errores.code && <span className="errorSpan">{errores.code}</span>}
              </div>
              <div className={styles.cajabotones}>
                <button onClick={verifyCode}>Enviar</button>
                <button onClick={login} className="tomato">
                  Reintentar
                </button>
              </div>
            </>
          ) : (
            <>
              <div className={styles.inputs}>
                <label htmlFor="email">Email</label>
                <div className={styles.email}>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    onChange={handleChange}
                    value={datos.email}
                  />
                </div>
                {!!errores.email && <span className="errorSpan">{errores.email}</span>}
              </div>
              <div className={styles.cajabotones}>
                <button onClick={login}>Entrar</button>
                <Link to={'/'}>
                  <button className="tomato">Cancelar</button>
                </Link>
              </div>
              {!!errores.mensajeError && <span className="errorSpan">{errores.mensajeError}</span>}
            </>
          )}
        </div>
      </div>

      {modalData.open && (
        <Modal
          data={modalData}
          closeModal={() => setModalData((prev) => ({ ...prev, open: false }))}
        />
      )}
    </>
  );
};

export default Login;
