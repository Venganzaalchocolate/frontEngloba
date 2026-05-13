import { useEffect, useState } from "react";
import styles from "../styles/infoSesameOffice.module.css";
import {
  postSesameGetOfficeEmployees,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

const InfoSesameOffice = ({ modal, charge, workplace, onCreateSesameOffice }) => {
  const [workers, setWorkers] = useState([]);

  const officeId = workplace?.officeIdSesame || null;

  const loadSesameOffice = async () => {
    if (!officeId) {
      setWorkers([]);
      return;
    }

    charge(true);

    const workersRes = await postSesameGetOfficeEmployees({ officeId }, getToken());

    if (workersRes?.error) {
      modal("Error", workersRes.message || "No se pudieron cargar los trabajadores del centro.");
      setWorkers([]);
      charge(false);
      return;
    }

    setWorkers(Array.isArray(workersRes?.employees) ? workersRes.employees : []);
    charge(false);
  };

  useEffect(() => {
    loadSesameOffice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [officeId]);

  if (!officeId) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Oficina Sesame asociada</label>

          <p className={styles.fieldTextEmpty}>
            Este centro de trabajo todavía no tiene oficina creada en Sesame.
          </p>

          <button
            type="button"
            className={styles.btnCreateOffice}
            onClick={() => onCreateSesameOffice?.(workplace)}
          >
            Crear oficina en Sesame
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>Oficina Sesame asociada</label>
        <p className={styles.fieldTextStatic}>{workplace?.name || "—"}</p>
      </div>

      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>Trabajadores del centro</label>

        {workers.length > 0 ? (
          workers.map((worker, index) => (
            <div className={styles.boxPerson} key={worker.employeeId || worker.userId || index}>
              <p
                className={styles.fieldText}
                onClick={() =>
                  modal(worker.fullName || "Trabajador", [
                    `Email: ${worker.email || "—"}`,
                    `Estado: ${worker.workStatus || "—"}`,
                    `Principal: ${worker.isMainOffice ? "Sí" : "No"}`,
                  ])
                }
              >
                {worker.fullName || "Sin nombre"}
              </p>
            </div>
          ))
        ) : (
          <p className={styles.fieldTextEmpty}>No hay trabajadores en este centro.</p>
        )}
      </div>
    </div>
  );
};

export default InfoSesameOffice;