import { useState } from "react";
import { FaArrowUpRightFromSquare } from "react-icons/fa6";

import { moodleLaunch, moodleTest } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import styles from "../styles/ManagingMoodle.module.css";

const MoodleAccessCard = ({
  modal,
  charge,
  authorized,
  canManageMoodleEnrolments,
}) => {
  const [opening, setOpening] = useState(false);

  const openMoodle = async () => {
    if (opening) return;
    if (!authorized) return;

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

  const checkMoodleConnection = async () => {
    const token = getToken();

    charge(true);
    const data = await moodleTest(token);
    charge(false);

    if (data?.error) {
      modal(
        "Error de conexión con Moodle",
        data.message || "No se ha podido conectar con Moodle."
      );
      return;
    }

    modal(
      "Conexión correcta",
      "Se ha podido conectar correctamente con Moodle."
    );
  };

  return (
    <div className={styles.card}>
      <div>
        <h3>Plataforma de Formación</h3>
        <p>
          El acceso se realiza con tu cuenta de Asociación Engloba. No necesitas
          crear ni recordar otra contraseña.
        </p>
      </div>

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.accessButton}
          onClick={openMoodle}
          disabled={opening || !authorized}
        >
          <FaArrowUpRightFromSquare />
          {opening ? "Abriendo Formación..." : "Acceder a Formación"}
        </button>

        {canManageMoodleEnrolments && (
          <button
            type="button"
            className={styles.secondaryButton}
            onClick={checkMoodleConnection}
            disabled={!authorized}
          >
            Probar conexión
          </button>
        )}
      </div>
    </div>
  );
};

export default MoodleAccessCard;