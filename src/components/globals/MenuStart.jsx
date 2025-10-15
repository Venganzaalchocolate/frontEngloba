import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import styles from "../styles/menuStart.module.css";
import { LuLogIn, LuBriefcase, LuListChecks, LuMail, LuLoader, } from "react-icons/lu";

// hooks y librerías que ya usas en Login
import { useLogin } from "../../hooks/useLogin";
import { textErrors } from "../../lib/textErrors";
import { validEmail } from "../../lib/valid";
import { loginUserCode, tokenGenerate } from "../../lib/data";
import { saveToken } from "../../lib/serviceToken";
import { deepClone } from "../../lib/utils";
import Modal from "./Modal";

const MenuStart = () => {
  const navigate = useNavigate();
  const { changeLogged } = useLogin();

  // estados del login inline
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [codeMode, setCodeMode] = useState(false);
  const [datos, setDatos] = useState({ email: "", code: "" });
  const [errores, setErrores] = useState({ email: null, code: null, mensajeError: null });
  const [modalData, setModalData] = useState({ open: false, title: "", message: "" });

  const toggleLogin = () => {
    setLoginOpen((v) => !v);
    // al abrir, enfocaremos el input por accesibilidad (opcional con ref)
  };
const handleChange = (e) => {
  const { name, value } = e.target;

  // Actualiza los datos
  setDatos((prev) => ({ ...prev, [name]: value }));

  // Limpia errores del campo que estás tocando
  setErrores((prev) => ({ ...prev, [name]: null, mensajeError: null }));

  if (name === "email") {
    const emailLocal = (value || "").trim();
    const emailWithDomain = emailLocal ? `${emailLocal}@engloba.org.es` : "";
    if (!emailLocal || !validEmail(emailWithDomain)) {
      setErrores((prev) => ({ ...prev, email: textErrors(emailLocal ? "email" : "vacio") }));
    }
  }

  if (name === "code") {
    // Si quieres, puedes validar que sea numérico o longitud
    setErrores((prev) => ({ ...prev, code: null }));
  }
};

const login = async () => {
  let emailAux = datos.email || "";
  emailAux = emailAux.trim();                 // ← guarda el trim
  if (!emailAux) {
    setErrores((prev) => ({ ...prev, email: textErrors("vacio") }));
    return;
  }
  const emailWithDomain = `${emailAux}@engloba.org.es`;
  if (!validEmail(emailWithDomain)) return;

  setLoading(true);
  const loginResult = await loginUserCode(emailWithDomain);

    if (!loginResult.error && loginResult.message) {
      const aux = deepClone(datos);
      aux["userId"] =loginResult.userId;
      aux["email"]=emailAux;
      setDatos(aux);
      setCodeMode(true);
      setModalData({
        open: true,
        title: "Código enviado",
        message: "Se ha enviado un código a tu email. Tienes 5 minutos para usarlo.",
      });
    } else {
      setErrores((prev) => ({ ...prev, mensajeError: loginResult.message }));
    }
    setLoading(false);
  };

  const verifyCode = async () => {
    setLoading(true);
    const loginResult = await tokenGenerate(datos);
    if (loginResult.error) {
      setErrores((prev) => ({ ...prev, mensajeError: loginResult.message }));
      setLoading(false);
    } else {
      setLoading(false);
      changeLogged(loginResult.user);
      saveToken(loginResult.token);
      // cerramos inline login y navegamos al home
      setLoginOpen(false);
      navigate("/");
    }
  };

  const onKeyDownEnter = (e) => {
    if (e.key === "Enter") {
      codeMode ? verifyCode() : login();
    }
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <div className={styles.areas}>
          <div className={styles.igualdad}></div>
          <div className={styles.infancia}></div>
          <div className={styles.mayores}></div>
          <div className={styles.lgtbi}></div>
          <div className={styles.desarrollo}></div>
          <div className={styles.discapacidad}></div>
        </div>

        <div className={styles.areaMenu}>
          <div className={styles.logo}>
            <img src="public/graphic/logotipo.png" alt="logoEngloba" />
            <p>Integración Laboral, Educativa y Social</p>
          </div>

          <div className={styles.menu}>
            <nav className={styles.menuPrimer} aria-label="Acciones principales">
              {/* Iniciar sesión → toggle del login inline */}

              <span className={styles.menuText} onClick={toggleLogin}>
                <LuLogIn className={styles.icon} /> Iniciar sesión
              </span>


              {/* Panel de login inline */}
              {loginOpen && (
                <div
                  id="login-inline-panel"
                  className={styles.loginInline}
                  role="region"
                  aria-label="Formulario de acceso"
                >
                  {!codeMode ? (
                    <>
                      <div className={styles.inputs}>
                        <label htmlFor="inline-email">Email</label>
                        <div className={styles.email}>
                          <input
                            type="email"
                            id="inline-email"
                            name="email"
                            placeholder="nombre.apellidos"
                            value={datos.email}
                            onChange={handleChange}
                            onKeyDown={onKeyDownEnter}
                            autoComplete="email"
                            inputMode="email"
                          />
                          <p className={styles.colaEmail}>@engloba.org.es</p>
                        </div>
                        {!!errores.email && (
                          <span className={styles.errorSpan} role="alert" aria-live="polite">
                            {errores.email}
                          </span>
                        )}
                      </div>
                      <div className={styles.cajabotones}>
                        <button onClick={login} disabled={loading}>
                          {loading ? (
                            <>
                              <LuLoader className={styles.spin} aria-hidden="true" /> Enviando…
                            </>
                          ) : (
                            "Entrar"
                          )}
                        </button>
                        <button
                          className="tomato"
                          type="button"
                          onClick={() => {
                            setLoginOpen(false);
                            // reseteo suave
                            setCodeMode(false);
                            setDatos({ email: "", code: "" });
                            setErrores({ email: null, code: null, mensajeError: null });
                          }}
                        >
                          Cancelar
                        </button>
                      </div>
                      {!!errores.mensajeError && (
                        <span className={styles.errorSpan} role="alert" aria-live="assertive">
                          {errores.mensajeError}
                        </span>
                      )}
                    </>
                  ) : (
                    <>
                      <div className={styles.inputs}>
                        <label htmlFor="inline-code">Código</label>
                        <div className={styles.email}>

                          <input
                            type="text"
                            id="inline-code"
                            name="code"
                            placeholder="Introduce el código"
                            value={datos.code}
                            onChange={handleChange}
                            onKeyDown={onKeyDownEnter}
                            inputMode="numeric"
                          />
                        </div>

                        {!!errores.mensajeError && (
                          <span className={styles.errorSpan} role="alert" aria-live="assertive">
                            {errores.mensajeError}
                          </span>
                        )}
                      </div>
                      <div className={styles.cajabotones}>
                        <button onClick={verifyCode} disabled={loading}>
                          {loading ? (
                            <>
                              <LuLoader className={styles.spin} aria-hidden="true" /> Verificando…
                            </>
                          ) : (
                            "Enviar"
                          )}
                        </button>
                        <button
                          className="btn-outline-secondary"
                          type="button"
                          onClick={() => {
                            // reintentar: vuelve a solicitar código
                            setCodeMode(false);
                            login();
                          }}
                          disabled={loading}
                        >
                          Reintentar
                        </button>
                        <button
                          className="tomato"
                          type="button"
                          onClick={() => {
                            setLoginOpen(false);
                            // reseteo suave
                            setCodeMode(false);
                            setDatos({ email: "", code: "" });
                            setErrores({ email: null, code: null, mensajeError: null });
                          }}
                        >
                          Cancelar
                        </button>
                      </div>

                    </>
                  )}
                </div>
              )}

              {/* resto de opciones del menú */}
              <Link to="/trabajaconnosotros" className={styles.menuItem}>
                <span className={styles.menuText}>
                  <LuBriefcase className={styles.icon} /> Trabaja con nosotros
                </span>
              </Link>

              <Link to="/ofertas" className={styles.menuItem}>
                <span className={styles.menuText}>
                  <LuListChecks className={styles.icon} /> Ofertas de empleo
                </span>
              </Link>

              <a
                href="mailto:comunicacion@engloba.org.es?subject=app"
                className={styles.menuItem}
              >
                <span className={styles.menuText}>
                  <LuMail className={styles.icon} /> Contacta
                </span>
              </a>
            </nav>
          </div>
        </div>
      </div>

      <div className={styles.imagen}>
        <picture>
          <source
            type="image/webp"
            srcSet="/img/people-480.webp 480w, /img/people-768.webp 768w, /img/people-1200.webp 1200w, /img/people-1600.webp 1600w"
            sizes="100vw"
          />
          <img
            src="/img/people-1200.jpg"
            alt="Grupo de personas"
            width={1600}
            height={1071}
            loading="lazy"
            decoding="async"
            fetchPriority="low"   // ← camelCase en React
          />
        </picture>
      </div>

      {modalData.open && (
        <Modal
          data={modalData}
          closeModal={() => setModalData((prev) => ({ ...prev, open: false }))}
        />
      )}
    </div>
  );
};

export default MenuStart;
