import { useEffect, useMemo, useState } from "react";
import { FaLayerGroup } from "react-icons/fa6";

import {
  moodleInfo,
  moodleManageCourseEnrolments,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import MoodleTargetSelector from "./MoodleTargetSelector";
import styles from "../styles/ManagingMoodle.module.css";

const EMPTY_TARGETS = {
  userIds: [],
  filters: {
    allActive: false,
    dispositiveIds: [],
    positionIds: [],
    areas: [],
  },
};

const MoodleCourseEnrolments = ({ modal, charge, enumsData }) => {
  const [operation, setOperation] = useState("enrol");
  const [courseId, setCourseId] = useState("");
  const [courses, setCourses] = useState([]);
  const [roleId, setRoleId] = useState("");
  const [courseRoles, setCourseRoles] = useState([]);
  const [targets, setTargets] = useState(EMPTY_TARGETS);
  const [result, setResult] = useState(null);

  const selectedCourse = useMemo(() => {
    return courses.find((course) => String(course.id) === String(courseId));
  }, [courses, courseId]);

  useEffect(() => {
    const loadInfo = async () => {
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

      const roles = Array.isArray(data?.courseRoles) ? data.courseRoles : [];
      const moodleCourses = Array.isArray(data?.courses) ? data.courses : [];

      setCourseRoles(roles);
      setCourses(moodleCourses);

      if (roles.length) {
        setRoleId(
          String(
            roles.find((role) => role.key === "student")?.id || roles[0].id
          )
        );
      }

      if (moodleCourses.length) {
        setCourseId(String(moodleCourses[0].id));
      }
    };

    loadInfo();
  }, []);

  const hasTargets = () => {
    const filters = targets.filters || {};

    return (
      targets.userIds?.length ||
      filters.allActive ||
      filters.dispositiveIds?.length ||
      filters.positionIds?.length ||
      filters.areas?.length
    );
  };

  const submit = async () => {
    if (!courseId) {
      modal("Falta el curso", "Selecciona un curso de Moodle.");
      return;
    }

    if (!roleId) {
      modal("Falta el rol", "Selecciona el rol Moodle para este curso.");
      return;
    }

    if (!hasTargets()) {
      modal(
        "Faltan destinatarios",
        "Selecciona al menos un trabajador, dispositivo, puesto, área o la plantilla activa."
      );
      return;
    }

    const token = getToken();

    charge(true);

    const data = await moodleManageCourseEnrolments(
      {
        operation,
        courseId: Number(courseId),
        roleId: Number(roleId),
        userIds: targets.userIds,
        filters: targets.filters,
      },
      token
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error en Moodle",
        data.message || "No se ha podido completar la operación."
      );
      return;
    }

    setResult(data);

    modal(
      "Operación completada",
      operation === "enrol"
        ? `Se han matriculado ${data.affected || 0} usuario(s).`
        : `Se han desmatriculado ${data.affected || 0} usuario(s).`
    );
  };

  return (
    <div className={styles.card}>
      <div>
        <h3>
          <FaLayerGroup /> Gestionar matriculación
        </h3>
        <p>
          Selecciona el curso, el rol y los destinatarios para matricular o
          desmatricular trabajadores en Moodle.
        </p>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Curso Moodle</span>
          <select
            value={courseId}
            onChange={(event) => {
              setCourseId(event.target.value);
              setResult(null);
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

        <label className={styles.field}>
          <span>Operación</span>
          <select
            value={operation}
            onChange={(event) => {
              setOperation(event.target.value);
              setResult(null);
            }}
          >
            <option value="enrol">Matricular</option>
            <option value="unenrol">Desmatricular</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Rol en el curso</span>
          <select
            value={roleId}
            onChange={(event) => {
              setRoleId(event.target.value);
              setResult(null);
            }}
          >
            <option value="">Selecciona rol</option>

            {courseRoles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedCourse && (
        <p>
          La acción se aplicará sobre:{" "}
          <strong>
            {selectedCourse.displayName ||
              selectedCourse.fullname ||
              selectedCourse.shortname}
          </strong>
        </p>
      )}

      <MoodleTargetSelector
        value={targets}
        onChange={(nextTargets) => {
          setTargets(nextTargets);
          setResult(null);
        }}
        enumsData={enumsData}
        modal={modal}
        styles={styles}
      />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.accessButton}
          onClick={submit}
        >
          {operation === "enrol"
            ? "Matricular en curso"
            : "Desmatricular del curso"}
        </button>
      </div>

      {result && (
        <div className={styles.resultBox}>
          <h4>Resultado</h4>

          <p>
            Seleccionados: <strong>{result.selected || 0}</strong>
          </p>

          <p>
            Afectados en Moodle: <strong>{result.affected || 0}</strong>
          </p>

          {!!result.skipped?.length && (
            <p>
              Omitidos: <strong>{result.skipped.length}</strong>
            </p>
          )}

          {!!result.errors?.length && (
            <div>
              <p>
                Errores: <strong>{result.errors.length}</strong>
              </p>

              <ul>
                {result.errors.map((error) => (
                  <li key={error.userId}>
                    {error.userId}: {error.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default MoodleCourseEnrolments;