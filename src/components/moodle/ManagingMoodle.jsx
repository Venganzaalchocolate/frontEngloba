import { useMemo, useState } from "react";
import { FaGraduationCap } from "react-icons/fa6";

import { useLogin } from "../../hooks/useLogin";
import styles from "../styles/ManagingMoodle.module.css";

import MoodleAccessCard from "./MoodleAccessCard";
import MoodleCourseEnrolments from "./MoodleCourseEnrolments";
import MoodleSystemRoles from "./MoodleSystemRoles";
import MoodleInfoPanel from "./MoodleInfoPanel";

const AUTHORIZED_EMAILS = [
  "santiago.ruizgalacho@engloba.org.es",
  "juanluis.crucessolis@engloba.org.es",
  "pablo.aragonsalguero@engloba.org.es",
  "alba.izquierdopavon@engloba.org.es",
  "web@engloba.org.es",
];

const hasRealResponsability = (list = []) =>
  list.some(
    (item) =>
      item?.isProgramResponsible ||
      item?.isProgramCoordinator ||
      item?.isProgramSupervisor ||
      item?.isDeviceResponsible ||
      item?.isDeviceCoordinator ||
      item?.isDeviceSupervisor
  );

const ManagingMoodle = ({ modal, charge, enumsData, listResponsability }) => {
  const { logged } = useLogin();

  const [activeTab, setActiveTab] = useState("access");

  const authorized = useMemo(() => {
    return AUTHORIZED_EMAILS.includes(logged?.user?.email);
  }, [logged?.user?.email]);

  const isEmployee = logged?.user?.role === "employee";

  const userHasRealResponsability = useMemo(() => {
    return hasRealResponsability(listResponsability || []);
  }, [listResponsability]);

  const canManageMoodleRoles = !isEmployee;

  const canManageMoodleEnrolments =
    !isEmployee || userHasRealResponsability;


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
              Gestiona el acceso a Moodle, la matriculación de trabajadores y
              los permisos de creación de cursos.
            </p>
          </div>
        </div>

        <div className={styles.tabs}>
          <button
            type="button"
            className={activeTab === "access" ? styles.tabActive : styles.tab}
            onClick={() => setActiveTab("access")}
          >
            Acceso
          </button>

          {canManageMoodleEnrolments && (
            <button
              type="button"
              className={
                activeTab === "enrolments" ? styles.tabActive : styles.tab
              }
              onClick={() => setActiveTab("enrolments")}
            >
              Matriculación
            </button>
          )}

          {canManageMoodleRoles && (
            <button
              type="button"
              className={activeTab === "roles" ? styles.tabActive : styles.tab}
              onClick={() => setActiveTab("roles")}
            >
              Roles Moodle
            </button>
          )}
        </div>

        {activeTab === "access" && (
          <MoodleAccessCard
            modal={modal}
            charge={charge}
            authorized={authorized}
            canManageMoodleEnrolments={canManageMoodleEnrolments}
          />
        )}

        {activeTab === "enrolments" && canManageMoodleEnrolments && (
  <>
    <MoodleInfoPanel
      modal={modal}
      charge={charge}
      enumsData={enumsData}
      canManageMoodleRoles={false}
      canManageMoodleEnrolments={true}
    />

    <MoodleCourseEnrolments
      modal={modal}
      charge={charge}
      enumsData={enumsData}
    />
  </>
)}

{activeTab === "roles" && canManageMoodleRoles && (
  <>
    <MoodleInfoPanel
      modal={modal}
      charge={charge}
      enumsData={enumsData}
      canManageMoodleRoles={true}
      canManageMoodleEnrolments={false}
    />

    <MoodleSystemRoles
      modal={modal}
      charge={charge}
      enumsData={enumsData}
    />
  </>
)}
      </div>
    </div>
  );
};

export default ManagingMoodle;