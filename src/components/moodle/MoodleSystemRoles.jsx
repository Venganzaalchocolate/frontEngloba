import { useEffect, useState } from "react";
import { FaUserShield } from "react-icons/fa6";

import {
  moodleInfo,
  moodleManageSystemRole,
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

const MoodleSystemRoles = ({ modal, charge, enumsData }) => {
  const [operation, setOperation] = useState("assign");
  const [roleId, setRoleId] = useState("");
  const [systemRoles, setSystemRoles] = useState([]);
  const [targets, setTargets] = useState(EMPTY_TARGETS);
  const [result, setResult] = useState(null);

  useEffect(() => {
    const loadRoles = async () => {
      const token = getToken();

      charge(true);

      const data = await moodleInfo(
        {
          lists: ["roles"],
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

      const roles = Array.isArray(data?.systemRoles) ? data.systemRoles : [];

      setSystemRoles(roles);

      if (roles.length) {
        setRoleId(String(roles[0].id));
      }
    };

    loadRoles();
  }, []);

  const hasTargets = () => {
    const filters = targets.filters || {};

    return (
      targets.userIds?.length ||
      filters.dispositiveIds?.length ||
      filters.positionIds?.length ||
      filters.areas?.length
    );
  };

  const submit = async () => {
    if (!roleId) {
      modal("Falta el rol", "Selecciona el rol de sistema Moodle.");
      return;
    }

    if (!hasTargets()) {
      modal(
        "Faltan destinatarios",
        "Selecciona al menos un trabajador, dispositivo, puesto o área."
      );
      return;
    }

    const token = getToken();

    charge(true);

    const data = await moodleManageSystemRole(
      {
        operation,
        roleId: Number(roleId),
        userIds: targets.userIds,
        filters: {
          ...targets.filters,
          allActive: false,
        },
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
      operation === "assign"
        ? `Se ha asignado el rol a ${data.affected || 0} usuario(s).`
        : `Se ha retirado el rol a ${data.affected || 0} usuario(s).`
    );
  };

  return (
    <div className={styles.card}>
      <div>
        <h3>
          <FaUserShield /> Gestionar roles Moodle
        </h3>
        <p>
          Asigna o retira permisos globales de Moodle. La información de reglas
          guardadas y usuarios actuales aparece arriba.
        </p>
      </div>

      <div className={styles.formGrid}>
        <label className={styles.field}>
          <span>Operación</span>
          <select
            value={operation}
            onChange={(event) => {
              setOperation(event.target.value);
              setResult(null);
            }}
          >
            <option value="assign">Asignar rol</option>
            <option value="unassign">Quitar rol</option>
          </select>
        </label>

        <label className={styles.field}>
          <span>Rol Moodle</span>
          <select
            value={roleId}
            onChange={(event) => {
              setRoleId(event.target.value);
              setResult(null);
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

      <MoodleTargetSelector
        value={targets}
        onChange={(nextTargets) => {
          setTargets(nextTargets);
          setResult(null);
        }}
        enumsData={enumsData}
        modal={modal}
        styles={styles}
        allowAllActive={false}
      />

      <div className={styles.actions}>
        <button
          type="button"
          className={styles.accessButton}
          onClick={submit}
        >
          {operation === "assign" ? "Asignar rol Moodle" : "Quitar rol Moodle"}
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

export default MoodleSystemRoles;