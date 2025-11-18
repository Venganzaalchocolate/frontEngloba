import { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { auditActiveLeaves } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

export default function LeavesAuditPanel({ enumsData, modal, charge }) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [apafa, setApafa] = useState("todos");
  const [employment, setEmployment] = useState("activos");
  const [results, setResults] = useState([]);

  const TYPES = Object.values(enumsData.leavesIndex || {}).map((lt) => ({
    value: lt._id,
    label: lt.name,
  }));

  const toggleType = (id) =>
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const runAudit = async () => {
    charge(true);
    const token = getToken();

    const res = await auditActiveLeaves(
      {
        leaveTypes: selectedTypes,
        apafa,
        employmentStatus: employment,
      },
      token
    );

    if (res?.error) {
      charge(false);
      return modal("Error", res.message || "Error en auditoría de bajas");
    }

    setResults(res || []);
    charge(false);
  };

  return (
    <div className={styles.panel}>
      <h3>Trabajadores Actualmente de Baja</h3>

      {/* Tipos de baja */}
      <div className={styles.fieldSelector}>
        {TYPES.map((t) => (
          <label key={t.value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedTypes.includes(t.value)}
              onChange={() => toggleType(t.value)}
            />
            {t.label}
          </label>
        ))}
      </div>

      {/* Filtros */}
      <div className={styles.controls}>
        <div>
          <label>APAFA:</label>
          <select value={apafa} onChange={(e) => setApafa(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="si">Solo APAFA</option>
            <option value="no">No APAFA</option>
          </select>
        </div>

        <div>
          <label>Situación laboral:</label>
          <select
            value={employment}
            onChange={(e) => setEmployment(e.target.value)}
          >
            <option value="activos">Activos</option>
            <option value="inactivos">Inactivos</option>
            <option value="todos">Todos</option>
          </select>
        </div>

        <button onClick={runAudit} className={styles.runButton}>
          Ejecutar auditoría
        </button>
      </div>

      {/* Resultados */}
      <div className={styles.results}>
        {results.length === 0 && (
          <p>No se encontraron trabajadores actualmente de baja</p>
        )}

        {results.map((u) => (
          <div key={u._id} className={styles.resultCard}>
            <h4>
              {u.firstName} {u.lastName}
            </h4>
            <p>DNI: {u.dni}</p>

            {u.leave && (
              <p>
                Tipo de baja:{" "}
                {enumsData.leavesIndex[u.leave.leaveType]?.name || "—"}
              </p>
            )}

            {u.currentDevice ? (
              <p>Dispositivo: {u.currentDevice.name}</p>
            ) : (
              <p>Sin dispositivo actual</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
