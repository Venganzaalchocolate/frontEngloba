import { useEffect, useMemo, useState } from "react";
import { FaTrashAlt } from "react-icons/fa";
import {
  FaChalkboardUser,
  FaCircleInfo,
  FaUserShield,
} from "react-icons/fa6";

import {
  moodleInfo,
  moodleManageCourseEnrolments,
  moodleManageSystemRole,
  moodleUndoAssignment,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import ModalConfirmation from "../globals/ModalConfirmation";
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
    const userLabels = userIds.map((user) => {
      if (typeof user === "string") return user;

      const name = `${user.firstName || ""} ${user.lastName || ""}`.trim();

      if (name && user.email) return `${name} · ${user.email}`;
      if (name) return name;
      if (user.email) return user.email;

      return "Trabajador";
    });

    criteria.push({
      tag: userIds.length === 1 ? "Trabajador" : "Trabajadores",
      label:
        userIds.length === 1
          ? userLabels[0]
          : `${userIds.length} trabajadores individuales`,
      items: userIds.length > 1 ? userLabels : [],
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
  onUndo,
}) => {
  const items = Array.isArray(assignments) ? assignments : [];

  return (
    <div className={styles.resultBox}>
      <div className={styles.selectorHeader}>
        <div>
          <h4>{title}</h4>
        </div>
      </div>

      {items.length ? (
        <ul>
          {items.map((assignment) => {
            const criteria = getCriteriaLabels(assignment, enumsData);

            return (
              <li key={assignment._id} className={styles.assignmentRow}>
                <div className={styles.assignmentContent}>
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

                          {!!criterion.items?.length && (
                            <ul className={styles.criteriaSubList}>
                              {criterion.items.map((item, itemIndex) => (
                                <li key={`${criterion.tag}-${item}-${itemIndex}`}>
                                  {item}
                                </li>
                              ))}
                            </ul>
                          )}
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
                </div>

                {onUndo && (
                  <div
                    className={styles.buttonTrash}
                    onClick={() => onUndo(assignment)}
                    title="Retirar regla"
                  >
                    <FaTrashAlt />
                  </div>
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
  moodleBase,
  selectedCourseId,
  setSelectedCourseId,
  selectedSystemRoleId,
  setSelectedSystemRoleId,
}) => {
  const courses = Array.isArray(moodleBase?.courses) ? moodleBase.courses : [];
  const courseRoles = Array.isArray(moodleBase?.courseRoles)
    ? moodleBase.courseRoles
    : [];
  const systemRoles = Array.isArray(moodleBase?.systemRoles)
    ? moodleBase.systemRoles
    : [];

  const [systemRoleUsers, setSystemRoleUsers] = useState([]);
  const [systemRoleAssignments, setSystemRoleAssignments] = useState([]);

  const [courseView, setCourseView] = useState("");
  const [courseUsers, setCourseUsers] = useState([]);
  const [courseAssignments, setCourseAssignments] = useState([]);

  const [systemRoleUserToRemove, setSystemRoleUserToRemove] = useState(null);
  const [courseUserToRemove, setCourseUserToRemove] = useState(null);
  const [assignmentToUndo, setAssignmentToUndo] = useState(null);

  const selectedSystemRole = useMemo(() => {
    return systemRoles.find(
      (role) => String(role.id) === String(selectedSystemRoleId)
    );
  }, [systemRoles, selectedSystemRoleId]);

  const selectedCourse = useMemo(() => {
    return courses.find((course) => String(course.id) === String(selectedCourseId));
  }, [courses, selectedCourseId]);

  const courseRoleNameById = useMemo(() => {
    return courseRoles.reduce((acc, role) => {
      acc[String(role.id)] = role.name;
      return acc;
    }, {});
  }, [courseRoles]);

  const loadSystemRoleData = async (roleId = selectedSystemRoleId) => {
    if (!roleId) return;

    const token = getToken();

    charge(true);

    const data = await moodleInfo(
      {
        lists: ["systemRoleUsers", "systemRoleAssignments"],
        roleId: Number(roleId),
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

  const loadCourseAssignments = async (courseId = selectedCourseId) => {
    if (!courseId) return;

    const token = getToken();

    charge(true);

    const data = await moodleInfo(
      {
        lists: ["courseAssignments"],
        courseId: Number(courseId),
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se han podido cargar las reglas del curso."
      );
      return;
    }

    setCourseAssignments(
      Array.isArray(data?.courseAssignments) ? data.courseAssignments : []
    );
  };

  const loadCourseUsers = async (
    nextView = courseView,
    courseId = selectedCourseId
  ) => {
    if (!courseId || !nextView) return;

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

  const handleChangeSystemRole = (roleId) => {
    setSelectedSystemRoleId(roleId);
    setSystemRoleUsers([]);
    setSystemRoleAssignments([]);
  };

  const handleChangeCourse = (courseId) => {
    setSelectedCourseId(courseId);
    setCourseAssignments([]);
    setCourseUsers([]);
    setCourseView("");
  };

  const getCourseRoleIdForUser = (user) => {
    const roleIds = Array.isArray(user.roles)
      ? user.roles.map((role) => Number(role.roleid))
      : [];

    const allowedRole = courseRoles.find((role) =>
      roleIds.includes(Number(role.id))
    );

    return allowedRole?.id || courseRoles[0]?.id || null;
  };

const openRemoveSystemRoleConfirm = (user) => {
  if (!selectedSystemRoleId) return;

  if (!user.idnumber) {
    modal(
      "No se puede quitar el rol",
      "Este usuario de Moodle no está vinculado a una persona de la plataforma."
    );
    return;
  }

  setSystemRoleUserToRemove(user);
};

  const closeRemoveSystemRoleConfirm = () => {
    setSystemRoleUserToRemove(null);
  };

  const confirmRemoveSystemRole = async () => {
    const user = systemRoleUserToRemove;

    if (!user || !selectedSystemRoleId) return;

    setSystemRoleUserToRemove(null);

    const token = getToken();

    charge(true);

    const data = await moodleManageSystemRole(
      {
        operation: "unassign",
        roleId: Number(selectedSystemRoleId),
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

    modal("Rol retirado", "El rol se ha retirado correctamente.");

    await loadSystemRoleData(selectedSystemRoleId);
  };

  const openRemoveCourseUserConfirm = (user) => {
    if (!selectedCourseId) return;

    if (!user.idnumber) {
      modal(
        "No se puede desmatricular",
        "Este usuario de Moodle no está vinculado a una persona de la plataforma."
      );
      return;
    }

    setCourseUserToRemove(user);
  };

  const closeRemoveCourseUserConfirm = () => {
    setCourseUserToRemove(null);
  };

  const confirmRemoveCourseUser = async () => {
    const user = courseUserToRemove;

    if (!user || !selectedCourseId) return;

    const roleId = getCourseRoleIdForUser(user);

    if (!roleId) {
      setCourseUserToRemove(null);
      modal(
        "No se puede desmatricular",
        "No se ha podido identificar el rol del curso."
      );
      return;
    }

    setCourseUserToRemove(null);

    const token = getToken();

    charge(true);

    const data = await moodleManageCourseEnrolments(
      {
        operation: "unenrol",
        courseId: Number(selectedCourseId),
        roleId: Number(roleId),
        userIds: [user.idnumber],
        filters: EMPTY_FILTERS,
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se ha podido desmatricular al usuario."
      );
      return;
    }

    modal("Matrícula retirada", "La matrícula se ha retirado correctamente.");

    if (courseView) {
      await loadCourseUsers(courseView, selectedCourseId);
    }

    await loadCourseAssignments(selectedCourseId);
  };

  const closeUndoAssignmentConfirm = () => {
    setAssignmentToUndo(null);
  };

  const confirmUndoAssignment = async () => {
    const assignment = assignmentToUndo;

    if (!assignment?._id) return;

    setAssignmentToUndo(null);

    const token = getToken();

    charge(true);

    const data = await moodleUndoAssignment(
      {
        assignmentId: assignment._id,
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se ha podido retirar la regla."
      );
      return;
    }

    modal("Regla retirada", "La regla se ha retirado correctamente.");

    if (assignment.assignmentType === "system-role") {
      await loadSystemRoleData(selectedSystemRoleId);
    }

    if (assignment.assignmentType === "course-enrolment") {
      await loadCourseAssignments(selectedCourseId);

      if (courseView) {
        await loadCourseUsers(courseView, selectedCourseId);
      }
    }
  };

  useEffect(() => {
    if (!canManageMoodleRoles || !selectedSystemRoleId) return;

    loadSystemRoleData(selectedSystemRoleId);
  }, [canManageMoodleRoles, selectedSystemRoleId]);

  useEffect(() => {
    if (!canManageMoodleEnrolments || !selectedCourseId) return;

    setCourseView("");
    setCourseUsers([]);
    loadCourseAssignments(selectedCourseId);
  }, [canManageMoodleEnrolments, selectedCourseId]);

  return (
    <div className={styles.card}>
      <div>
        <h3>
          <FaCircleInfo /> Información Moodle
        </h3>
        <p>Gestión de cursos, matrículas y permisos en Moodle.</p>
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
                  value={selectedSystemRoleId}
                  onChange={(event) => handleChangeSystemRole(event.target.value)}
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
            title="Reglas activas para este rol"
            assignments={systemRoleAssignments}
            enumsData={enumsData}
            emptyMessage="No hay reglas activas para este rol."
            onUndo={(assignment) => setAssignmentToUndo(assignment)}
          />

          <div className={styles.resultBox}>
            <div className={styles.selectorHeader}>
              <div>
                <h4>Usuarios con este rol</h4>
              </div>
            </div>

            {systemRoleUsers.length ? (
              <ul>
                {systemRoleUsers.map((user) => {
                  const name = getUserName(user);

                  return (
                    <li key={user.id} className={styles.userRow}>
                      <span className={styles.userText}>
                        <strong>{name}</strong>
                        {user.email ? ` · ${user.email}` : ""}
                      </span>

                      
                        <FaTrashAlt className={styles.svgTrash} onClick={() => openRemoveSystemRoleConfirm(user)}
                        title="Quitar rol"/>
                      
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
                  value={selectedCourseId}
                  onChange={(event) => handleChangeCourse(event.target.value)}
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
            title="Reglas activas para este curso"
            assignments={courseAssignments}
            enumsData={enumsData}
            emptyMessage="No hay reglas activas para este curso."
            onUndo={(assignment) => setAssignmentToUndo(assignment)}
          />

          <div className={styles.resultBox}>
            <div className={styles.selectorHeader}>
              <div>
                <h4>Usuarios matriculados</h4>
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
                onClick={() => loadCourseUsers("teachers", selectedCourseId)}
                disabled={!selectedCourseId}
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
                onClick={() => loadCourseUsers("students", selectedCourseId)}
                disabled={!selectedCourseId}
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
                onClick={() => loadCourseUsers("all", selectedCourseId)}
                disabled={!selectedCourseId}
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
                      <li key={user.id} className={styles.userRow}>
                        <span className={styles.userText}>
                          <strong>{name}</strong>
                          {user.email ? ` · ${user.email}` : ""}
                          {roles.length ? ` · ${roles.join(", ")}` : ""}
                        </span>

                        
                          <FaTrashAlt className={styles.svgTrash} onClick={() => openRemoveCourseUserConfirm(user)}
                          title="Desmatricular"/>
                       
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p>Selecciona una vista para consultar la matrícula del curso.</p>
            )}
          </div>
        </>
      )}

      {systemRoleUserToRemove && (
        <ModalConfirmation
          title="Quitar rol Moodle"
          message={`¿Seguro que quieres quitar el rol "${
            selectedSystemRole?.name || "Moodle"
          }" a ${getUserName(systemRoleUserToRemove)}?`}
          textConfirm="Quitar rol"
          textCancel="Cancelar"
          onConfirm={confirmRemoveSystemRole}
          onCancel={closeRemoveSystemRoleConfirm}
        />
      )}

      {courseUserToRemove && (
        <ModalConfirmation
          title="Desmatricular usuario"
          message={`¿Seguro que quieres desmatricular a ${getUserName(
            courseUserToRemove
          )}?`}
          textConfirm="Desmatricular"
          textCancel="Cancelar"
          onConfirm={confirmRemoveCourseUser}
          onCancel={closeRemoveCourseUserConfirm}
        />
      )}

      {assignmentToUndo && (
        <ModalConfirmation
          title="Retirar regla"
          message="¿Seguro que quieres retirar esta regla?"
          textConfirm="Retirar"
          textCancel="Cancelar"
          onConfirm={confirmUndoAssignment}
          onCancel={closeUndoAssignmentConfirm}
        />
      )}

      {systemRoleUserToRemove && (
  <ModalConfirmation
    title="Quitar rol Moodle"
    message={`¿Seguro que quieres quitar el rol "${
      selectedSystemRole?.name || "Moodle"
    }" a ${getUserName(systemRoleUserToRemove)}?`}
    textConfirm="Quitar rol"
    textCancel="Cancelar"
    onConfirm={confirmRemoveSystemRole}
    onCancel={closeRemoveSystemRoleConfirm}
  />
)}
    </div>
  );
};

export default MoodleInfoPanel;
