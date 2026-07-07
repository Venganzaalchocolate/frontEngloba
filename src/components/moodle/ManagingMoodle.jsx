import { useEffect, useMemo, useState } from "react";
import { FaGraduationCap } from "react-icons/fa6";

import { useLogin } from "../../hooks/useLogin";
import { moodleInfo } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
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

  const [moodleBase, setMoodleBase] = useState({
    courses: [],
    courseRoles: [],
    systemRoles: [],
  });

  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedSystemRoleId, setSelectedSystemRoleId] = useState("");

  const [moodleLoaded, setMoodleLoaded] = useState(false);
  const [moodleLoading, setMoodleLoading] = useState(false);

  const [infoPanelRefreshKey, setInfoPanelRefreshKey] = useState(0);

  const ready = useMemo(() => {
    return (
      Boolean(logged?.user) &&
      Boolean(enumsData) &&
      Array.isArray(listResponsability)
    );
  }, [logged?.user, enumsData, listResponsability]);

  const authorized = useMemo(() => {
    if (!ready) return false;

    return AUTHORIZED_EMAILS.includes(logged.user.email);
  }, [ready, logged?.user?.email]);

  const isEmployee = logged?.user?.role === "employee";

  const userHasRealResponsability = useMemo(() => {
    if (!ready) return false;

    return hasRealResponsability(listResponsability);
  }, [ready, listResponsability]);

  const canManageMoodleRoles = ready && !isEmployee;

  const canManageMoodleEnrolments =
    ready && (!isEmployee || userHasRealResponsability);

  const refreshInfoPanel = () => {
    setInfoPanelRefreshKey((prev) => prev + 1);
  };

  const loadMoodleBase = async () => {
    const token = getToken();

    setMoodleLoading(true);
    charge(true);

    const data = await moodleInfo(
      {
        lists: ["courses", "roles"],
      },
      token
    );

    charge(false);
    setMoodleLoading(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se ha podido cargar la información de Moodle."
      );
      return;
    }

    const courses = Array.isArray(data?.courses) ? data.courses : [];
    const courseRoles = Array.isArray(data?.courseRoles)
      ? data.courseRoles
      : [];
    const systemRoles = Array.isArray(data?.systemRoles)
      ? data.systemRoles
      : [];

    setMoodleBase({
      courses,
      courseRoles,
      systemRoles,
    });

    setSelectedCourseId((currentCourseId) => {
      if (currentCourseId) return currentCourseId;
      return courses.length ? String(courses[0].id) : "";
    });

    setSelectedSystemRoleId((currentRoleId) => {
      if (currentRoleId) return currentRoleId;
      return systemRoles.length ? String(systemRoles[0].id) : "";
    });

    setMoodleLoaded(true);
  };

  const handleCourseEnrolmentsChanged = async () => {
    refreshInfoPanel();
  };

  const handleSystemRolesChanged = async () => {
    refreshInfoPanel();
  };

  useEffect(() => {
    if (!ready || moodleLoaded || moodleLoading) return;

    loadMoodleBase();
  }, [ready, moodleLoaded, moodleLoading]);

  useEffect(() => {
    if (!ready) return;

    if (activeTab === "roles" && !canManageMoodleRoles) {
      setActiveTab(canManageMoodleEnrolments ? "enrolments" : "access");
      return;
    }

    if (activeTab === "enrolments" && !canManageMoodleEnrolments) {
      setActiveTab("access");
    }
  }, [
    ready,
    activeTab,
    canManageMoodleRoles,
    canManageMoodleEnrolments,
  ]);

  const canShowMoodleTabs = ready && moodleLoaded;

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>FORMACIÓN</h2>
            <FaGraduationCap />
          </div>

          <p>
            Gestiona el acceso a Moodle, la matriculación de trabajadores y los
            permisos de creación de cursos.
          </p>
        </div>

        {!canShowMoodleTabs ? (
          <div className={styles.card}>
            <p>Cargando Moodle...</p>
          </div>
        ) : (
          <>
            <div className={styles.tabs}>
              <button
                type="button"
                className={
                  activeTab === "access" ? styles.tabActive : styles.tab
                }
                onClick={() => setActiveTab("access")}
              >
                Acceso
              </button>

              {canManageMoodleEnrolments && (
                <button
                  type="button"
                  className={
                    activeTab === "enrolments"
                      ? styles.tabActive
                      : styles.tab
                  }
                  onClick={() => setActiveTab("enrolments")}
                >
                  Matriculación
                </button>
              )}

              {canManageMoodleRoles && (
                <button
                  type="button"
                  className={
                    activeTab === "roles" ? styles.tabActive : styles.tab
                  }
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
                  key={`course-info-${selectedCourseId}-${infoPanelRefreshKey}`}
                  modal={modal}
                  charge={charge}
                  enumsData={enumsData}
                  canManageMoodleRoles={false}
                  canManageMoodleEnrolments={true}
                  moodleBase={moodleBase}
                  selectedCourseId={selectedCourseId}
                  setSelectedCourseId={setSelectedCourseId}
                  selectedSystemRoleId={selectedSystemRoleId}
                  setSelectedSystemRoleId={setSelectedSystemRoleId}
                />

                <MoodleCourseEnrolments
                  modal={modal}
                  charge={charge}
                  enumsData={enumsData}
                  moodleBase={moodleBase}
                  selectedCourseId={selectedCourseId}
                  setSelectedCourseId={setSelectedCourseId}
                  onCourseEnrolmentsChanged={handleCourseEnrolmentsChanged}
                />
              </>
            )}

            {activeTab === "roles" && canManageMoodleRoles && (
              <>
                <MoodleInfoPanel
                  key={`role-info-${selectedSystemRoleId}-${infoPanelRefreshKey}`}
                  modal={modal}
                  charge={charge}
                  enumsData={enumsData}
                  canManageMoodleRoles={true}
                  canManageMoodleEnrolments={false}
                  moodleBase={moodleBase}
                  selectedCourseId={selectedCourseId}
                  setSelectedCourseId={setSelectedCourseId}
                  selectedSystemRoleId={selectedSystemRoleId}
                  setSelectedSystemRoleId={setSelectedSystemRoleId}
                />

                <MoodleSystemRoles
                  modal={modal}
                  charge={charge}
                  enumsData={enumsData}
                  moodleBase={moodleBase}
                  selectedSystemRoleId={selectedSystemRoleId}
                  setSelectedSystemRoleId={setSelectedSystemRoleId}
                  onSystemRolesChanged={handleSystemRolesChanged}
                />
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ManagingMoodle;
