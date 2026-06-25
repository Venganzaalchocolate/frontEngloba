import { useState } from "react";
import { FaArrowUpRightFromSquare, FaGraduationCap } from "react-icons/fa6";

import { moodleLaunch } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import styles from "../styles/ManagingMoodle.module.css";

const ManagingMoodle = ({ modal, charge }) => {
  const [opening, setOpening] = useState(false);

  const openMoodle = async () => {
    if (opening) return;

    const moodleWindow = window.open("", "_blank");

    if (!moodleWindow) {
      modal(
        "No se pudo abrir Formación",
        "El navegador ha bloqueado la nueva pestaña. Permite ventanas emergentes para esta aplicación e inténtalo de nuevo."
      );
      return;
    }

    moodleWindow.opener = null;
    moodleWindow.document.title = "Abriendo Formación...";

    setOpening(true);
    charge(true);

    const token = getToken();
    const data = await moodleLaunch(token);

    charge(false);
    setOpening(false);

    if (data?.error || !data?.url) {
      moodleWindow.close();

      modal(
        "No se pudo acceder a Formación",
        data?.message || "No se ha podido preparar el acceso a la plataforma."
      );
      return;
    }

    moodleWindow.location.href = data.url;
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.hero}>
          <div className={styles.icon}>
            <FaGraduationCap />
          </div>

          <div>
            <h2>FORMACIÓN</h2>
            <p>
              Accede a la plataforma de formación de Asociación Engloba,
              consulta tus cursos y continúa tu itinerario.
            </p>
          </div>
        </div>

        <div className={styles.card}>
          <div>
            <h3>Plataforma de Formación</h3>
            <p>
              El acceso se realiza con tu cuenta de Asociación Engloba. No
              necesitas crear ni recordar otra contraseña.
            </p>
          </div>

          <button
            type="button"
            className={styles.accessButton}
            onClick={openMoodle}
            disabled={opening}
          >
            <FaArrowUpRightFromSquare />
            {opening ? "Abriendo Formación..." : "Acceder a Formación"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ManagingMoodle;