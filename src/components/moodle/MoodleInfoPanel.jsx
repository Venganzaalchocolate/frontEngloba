import { useEffect, useMemo, useState } from "react";
import {
  FaChalkboardUser,
  FaCircleInfo,
  FaTrash,
  FaUserShield,
} from "react-icons/fa6";

import {
  moodleInfo,
  moodleManageSystemRole,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import styles from "../styles/ManagingMoodle.module.css";

const EMPTY_FILTERS = {
  allActive: false,
  dispositiveIds: [],
  positionIds: [],
  areas: [],
};

const AREA_LABELS = {
  igualdad: "Igualdad",
  "desarrollo comunitario": "Desarrollo comunitario",
  lgtbiq: "LGTBIQ",
  "infancia y juventud": "Infancia y juventud",
  "personas con discapacidad": "Personas con discapacidad",
  mayores: "Mayores",
  migraciones: "Migraciones",
  "no identificado": "No identificado",
};

const formatDate = (value) => {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const getUserName = (user) => {
  return (
    user.fullname ||
    `${user.firstname || ""} ${user.lastname || ""}`.trim() ||
    user.email ||
    user.username ||
    `Usuario Moodle ${user.id}`
  );
};

const getProgramName = (programId, enumsData) => {
  const program = enumsData?.programsIndex?.[String(programId || "")];
  return program?.acronym || program?.name || "";
};

const getDispositiveLabel = (dispositiveId, enumsData) => {
  const dispositive = enumsData?.dispositiveIndex?.[String(dispositiveId || "")];

  if (!dispositive) return String(dispositiveId);

  const programName = getProgramName(dispositive.program, enumsData);

  return `${dispositive.name || dispositiveId}${
    programName ? ` [${programName}]` : ""
  }`;
};

const getPositionLabel = (positionId, enumsData) => {
  const position = enumsData?.jobsIndex?.[String(positionId || "")];

  return position?.name || String(positionId);
};

const getCriteriaLabels = (assignment, enumsData) => {
  const criteria = [];
  const userIds = assignment?.criteria?.userIds || [];
  const filters = assignment?.criteria?.filters || {};

  if (filters.allActive) {
    criteria.push({
      tag: "Plantilla",
      label: "Toda la plantilla activa",
    });
  }

  if (userIds.length) {
    criteria.push({
      tag: "Trabajador",
      label:
        userIds.length === 1
          ? "1 trabajador individual"
          : `${userIds.length} trabajadores individuales`,
    });
  }

  (filters.dispositiveIds || []).forEach((dispositiveId) => {
    criteria.push({
      tag: "Dispositivo",
      label: getDispositiveLabel(dispositiveId, enumsData),
    });
  });

  (filters.positionIds || []).forEach((positionId) => {
    criteria.push({
      tag: "Puesto",
      label: getPositionLabel(positionId, enumsData),
    });
  });

  (filters.areas || []).forEach((area) => {
    criteria.push({
      tag: "Área",
      label: AREA_LABELS[String(area)] || String(area),
    });
  });

  return criteria.length
    ? criteria
    : [
        {
          tag: "Criterio",
          label: "Sin criterio guardado",
        },
      ];
};

const AssignmentList = ({
  title,
  assignments,
  enumsData,
  emptyMessage,
  onRefresh,
}) => {
  const items = Array.isArray(assignments) ? assignments : [];

  return (
    <div className={styles.resultBox}>
      <div className={styles.selectorHeader}>
        <div>
          <h4>{title}</h4>
          <p>
            Estas reglas vienen de BackEngloba. Se muestra el resumen para no
            cargar listas masivas de usuarios.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={onRefresh}
        >
          Actualizar
        </button>
      </div>

      {items.length ? (
        <ul>
          {items.map((assignment) => {
            const criteria = getCriteriaLabels(assignment, enumsData);

            return (
              <li key={assignment._id}>
                <div>
                  <strong>
                    {assignment.roleName || `Rol ${assignment.roleId}`}
                  </strong>
                  {" · "}
                  <span>{assignment.affectedCount || 0} usuario(s)</span>

                  {assignment.createdAt && (
                    <>
                      {" · "}
                      <span>{formatDate(assignment.createdAt)}</span>
                    </>
                  )}
                </div>

                <div className={styles.criteriaList}>
                  {criteria.map((criterion, index) => (
                    <div
                      key={`${assignment._id}-${criterion.tag}-${criterion.label}-${index}`}
                      className={styles.criteriaChip}
                    >
                      <div>
                        <span className={styles.criteriaTag}>
                          {criterion.tag}
                        </span>
                        <strong>{criterion.label}</strong>
                      </div>
                    </div>
                  ))}
                </div>

                {!!assignment.skippedCount && (
                  <p>Omitidos: {assignment.skippedCount}</p>
                )}

                {!!assignment.errorCount && (
                  <p>Errores: {assignment.errorCount}</p>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p>{emptyMessage}</p>
      )}
    </div>
  );
};

const MoodleInfoPanel = ({
  modal,
  charge,
  enumsData,
  canManageMoodleRoles,
  canManageMoodleEnrolments,
}) => {
  const [courses, setCourses] = useState([]);
  const [courseRoles, setCourseRoles] = useState([]);
  const [systemRoles, setSystemRoles] = useState([]);

  const [systemRoleId, setSystemRoleId] = useState("");
  const [systemRoleUsers, setSystemRoleUsers] = useState([]);
  const [systemRoleAssignments, setSystemRoleAssignments] = useState([]);

  const [courseId, setCourseId] = useState("");
  const [courseView, setCourseView] = useState("");
  const [courseUsers, setCourseUsers] = useState([]);
  const [courseAssignments, setCourseAssignments] = useState([]);

  const selectedSystemRole = useMemo(() => {
    return systemRoles.find((role) => String(role.id) === String(systemRoleId));
  }, [systemRoles, systemRoleId]);

  const selectedCourse = useMemo(() => {
    return courses.find((course) => String(course.id) === String(courseId));
  }, [courses, courseId]);

  const courseRoleNameById = useMemo(() => {
    return courseRoles.reduce((acc, role) => {
      acc[String(role.id)] = role.name;
      return acc;
    }, {});
  }, [courseRoles]);

  const loadSystemRoleData = async (nextRoleId = systemRoleId) => {
    if (!nextRoleId) return;

    const token = getToken();

    charge(true);

    const data = await moodleInfo(
      {
        lists: ["systemRoleUsers", "systemRoleAssignments"],
        roleId: Number(nextRoleId),
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se ha podido cargar la información del rol."
      );
      return;
    }

    setSystemRoleUsers(
      Array.isArray(data?.systemRoleUsers) ? data.systemRoleUsers : []
    );

    setSystemRoleAssignments(
      Array.isArray(data?.systemRoleAssignments)
        ? data.systemRoleAssignments
        : []
    );
  };

  const loadCourseAssignments = async (nextCourseId = courseId) => {
    if (!nextCourseId) return;

    const token = getToken();

    charge(true);

    const data = await moodleInfo(
      {
        lists: ["courseAssignments"],
        courseId: Number(nextCourseId),
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message ||
          "No se han podido cargar las asignaciones guardadas del curso."
      );
      return;
    }

    setCourseAssignments(
      Array.isArray(data?.courseAssignments) ? data.courseAssignments : []
    );
  };

  const loadBaseInfo = async () => {
    const token = getToken();

    charge(true);

    const data = await moodleInfo(
      {
        lists: ["courses", "roles"],
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se ha podido cargar la información de Moodle."
      );
      return;
    }

    const nextCourses = Array.isArray(data?.courses) ? data.courses : [];
    const nextCourseRoles = Array.isArray(data?.courseRoles)
      ? data.courseRoles
      : [];
    const nextSystemRoles = Array.isArray(data?.systemRoles)
      ? data.systemRoles
      : [];

    setCourses(nextCourses);
    setCourseRoles(nextCourseRoles);
    setSystemRoles(nextSystemRoles);

    if (nextCourses.length) {
      const firstCourseId = String(nextCourses[0].id);
      setCourseId(firstCourseId);
      await loadCourseAssignments(firstCourseId);
    }

    if (nextSystemRoles.length) {
      const firstRoleId = String(nextSystemRoles[0].id);
      setSystemRoleId(firstRoleId);
      await loadSystemRoleData(firstRoleId);
    }
  };

  const loadCourseUsers = async (nextView = courseView) => {
    if (!courseId) {
      modal("Falta el curso", "Selecciona un curso de Moodle.");
      return;
    }

    const listsByView = {
      all: "courseUsers",
      teachers: "courseTeachers",
      students: "courseStudents",
    };

    const listName = listsByView[nextView];

    if (!listName) return;

    const token = getToken();

    charge(true);

    const data = await moodleInfo(
      {
        lists: [listName],
        courseId: Number(courseId),
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se ha podido cargar la lista del curso."
      );
      return;
    }

    setCourseView(nextView);
    setCourseUsers(Array.isArray(data?.[listName]) ? data[listName] : []);
  };

  const removeSystemRole = async (user) => {
    if (!systemRoleId) return;

    if (!user.idnumber) {
      modal(
        "No se puede quitar el rol",
        "Este usuario de Moodle no está vinculado a un trabajador de BackEngloba mediante idnumber."
      );
      return;
    }

    const name = getUserName(user);

    const confirmed = window.confirm(
      `¿Quitar el rol "${selectedSystemRole?.name || "Moodle"}" a ${name}?`
    );

    if (!confirmed) return;

    const token = getToken();

    charge(true);

    const data = await moodleManageSystemRole(
      {
        operation: "unassign",
        roleId: Number(systemRoleId),
        userIds: [user.idnumber],
        filters: EMPTY_FILTERS,
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se ha podido quitar el rol."
      );
      return;
    }

    modal(
      "Rol retirado",
      `Se ha quitado el rol a ${data.affected || 0} usuario(s).`
    );

    await loadSystemRoleData(systemRoleId);
  };

  useEffect(() => {
    loadBaseInfo();
  }, []);

  return (
    <div className={styles.card}>
      <div>
        <h3>
          <FaCircleInfo /> Información Moodle
        </h3>
        <p>
          Consulta las reglas aplicadas desde BackEngloba y, solo cuando lo
          necesites, carga la lista real de usuarios en Moodle.
        </p>
      </div>

      {canManageMoodleRoles && (
        <>
          <div className={styles.resultBox}>
            <h4>
              <FaUserShield /> Roles globales
            </h4>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Rol Moodle</span>
                <select
                  value={systemRoleId}
                  onChange={async (event) => {
                    const nextRoleId = event.target.value;

                    setSystemRoleId(nextRoleId);
                    setSystemRoleUsers([]);
                    setSystemRoleAssignments([]);

                    await loadSystemRoleData(nextRoleId);
                  }}
                >
                  <option value="">Selecciona rol</option>

                  {systemRoles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </div>

          <AssignmentList
            title="Reglas guardadas para este rol"
            assignments={systemRoleAssignments}
            enumsData={enumsData}
            emptyMessage="Todavía no hay reglas guardadas para este rol."
            onRefresh={() => loadSystemRoleData(systemRoleId)}
          />

          <div className={styles.resultBox}>
            <div className={styles.selectorHeader}>
              <div>
                <h4>Usuarios actuales con este rol en Moodle</h4>
                <p>
                  Esta lista viene directamente de Moodle. La papelera quita el
                  rol a ese usuario concreto.
                </p>
              </div>

              <button
                type="button"
                className={styles.secondaryButton}
                onClick={() => loadSystemRoleData(systemRoleId)}
                disabled={!systemRoleId}
              >
                Actualizar
              </button>
            </div>

            {systemRoleUsers.length ? (
              <ul>
                {systemRoleUsers.map((user) => {
                  const name = getUserName(user);

                  return (
                    <li key={user.id}>
                      <span>
                        <strong>{name}</strong>
                        {user.email ? ` · ${user.email}` : ""}
                      </span>

                      <button
                        type="button"
                        className={styles.secondaryButton}
                        onClick={() => removeSystemRole(user)}
                        title="Quitar rol"
                      >
                        <FaTrash />
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p>No hay usuarios con este rol.</p>
            )}
          </div>
        </>
      )}

      {canManageMoodleEnrolments && (
        <>
          <div className={styles.resultBox}>
            <h4>
              <FaChalkboardUser /> Cursos
            </h4>

            <div className={styles.formGrid}>
              <label className={styles.field}>
                <span>Curso Moodle</span>
                <select
                  value={courseId}
                  onChange={async (event) => {
                    const nextCourseId = event.target.value;

                    setCourseId(nextCourseId);
                    setCourseUsers([]);
                    setCourseView("");
                    setCourseAssignments([]);

                    await loadCourseAssignments(nextCourseId);
                  }}
                >
                  <option value="">Selecciona curso</option>

                  {courses.map((course) => (
                    <option key={course.id} value={course.id}>
                      {course.displayName || course.fullname || course.shortname}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            {selectedCourse && (
              <p>
                Curso seleccionado:{" "}
                <strong>
                  {selectedCourse.displayName ||
                    selectedCourse.fullname ||
                    selectedCourse.shortname}
                </strong>
              </p>
            )}
          </div>

          <AssignmentList
            title="Reglas guardadas para este curso"
            assignments={courseAssignments}
            enumsData={enumsData}
            emptyMessage="Todavía no hay reglas guardadas para este curso."
            onRefresh={() => loadCourseAssignments(courseId)}
          />

          <div className={styles.resultBox}>
            <div className={styles.selectorHeader}>
              <div>
                <h4>Usuarios actuales en Moodle</h4>
                <p>
                  Esta consulta puede devolver muchos usuarios. Cárgala solo
                  cuando necesites revisar el estado real del curso.
                </p>
              </div>
            </div>

            <div className={styles.actions}>
              <button
                type="button"
                className={
                  courseView === "teachers"
                    ? styles.accessButton
                    : styles.secondaryButton
                }
                onClick={() => loadCourseUsers("teachers")}
                disabled={!courseId}
              >
                Ver profesores
              </button>

              <button
                type="button"
                className={
                  courseView === "students"
                    ? styles.accessButton
                    : styles.secondaryButton
                }
                onClick={() => loadCourseUsers("students")}
                disabled={!courseId}
              >
                Ver alumnos
              </button>

              <button
                type="button"
                className={
                  courseView === "all"
                    ? styles.accessButton
                    : styles.secondaryButton
                }
                onClick={() => loadCourseUsers("all")}
                disabled={!courseId}
              >
                Ver todos
              </button>
            </div>

            {courseView && (
              <p>
                Mostrando:{" "}
                <strong>
                  {courseView === "teachers"
                    ? "profesores"
                    : courseView === "students"
                      ? "alumnos"
                      : "todos los usuarios"}
                </strong>
              </p>
            )}

            {courseUsers.length ? (
              <div>
                <p>
                  Total: <strong>{courseUsers.length}</strong>
                </p>

                <ul>
                  {courseUsers.map((user) => {
                    const name = getUserName(user);

                    const roles = Array.isArray(user.roles)
                      ? user.roles
                          .map(
                            (role) =>
                              courseRoleNameById[String(role.roleid)] ||
                              role.shortname ||
                              role.name
                          )
                          .filter(Boolean)
                      : [];

                    return (
                      <li key={user.id}>
                        <strong>{name}</strong>
                        {user.email ? ` · ${user.email}` : ""}
                        {roles.length ? ` · ${roles.join(", ")}` : ""}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p>
                Pulsa “Ver profesores”, “Ver alumnos” o “Ver todos” para cargar
                la lista real desde Moodle.
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MoodleInfoPanel;