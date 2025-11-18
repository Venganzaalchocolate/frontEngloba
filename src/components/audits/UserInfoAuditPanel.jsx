import React, { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";

import { auditInfoUser } from "../../lib/data"; // ✔ tu helper real
import { getToken } from "../../lib/serviceToken";

export default function UserInfoAuditPanel({ enumsData, modal, charge }) {
  const [selectedFields, setSelectedFields] = useState([]);
  const [apafa, setApafa] = useState("todos");
  const [employment, setEmployment] = useState("activos");
  const [results, setResults] = useState([]);

  // 👇 Estos son los campos permitidos por el back
  const FIELD_OPTIONS = [
    { value: "dni", label: "DNI" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Teléfono" },
    { value: "bankAccountNumber", label: "Cuenta bancaria" },
    { value: "socialSecurityNumber", label: "Seguridad Social" },
    { value: "studies", label: "Estudios" },
    { value: "notes", label: "Notas" },
    { value: "cv", label: "CV" },
  ];

  // ---------------------------------------------------
  // Ejecutar auditoría
  // ---------------------------------------------------
  const runAudit = async () => {
    try {
      charge(true);

      const payload = {
        fields: selectedFields,
        apafa,
        employmentStatus: employment,
      };
      const token=getToken()
      const res = await auditInfoUser(payload, token);
      if (res.error) {
        modal("Error", res.message || "No se pudo obtener la auditoría");
        return;
      }

      setResults(res);
    } catch (err) {
      modal("Error", err.message || "Error inesperado");
    } finally {
      charge(false);
    }
  };

  return (
    <div className={styles.panel}>
      <h3>Auditoría de información de empleados</h3>

      {/* --------------------------------------------- */}
      {/* SELECCIÓN DE CAMPOS */}
      {/* --------------------------------------------- */}
      <div className={styles.fieldSelector}>
        <h4>Campos a revisar</h4>

        {FIELD_OPTIONS.map((f) => (
          <label key={f.value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedFields.includes(f.value)}
              onChange={() =>
                setSelectedFields((prev) =>
                  prev.includes(f.value)
                    ? prev.filter((x) => x !== f.value)
                    : [...prev, f.value]
                )
              }
            />
            {f.label}
          </label>
        ))}
      </div>

      {/* --------------------------------------------- */}
      {/* CONTROLES DE FILTRO */}
      {/* --------------------------------------------- */}
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
          <label>Estado laboral:</label>
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

      {/* --------------------------------------------- */}
      {/* RESULTADOS */}
      {/* --------------------------------------------- */}
      <div className={styles.results}>
        {results.length === 0 ? (
          <p>No hay resultados</p>
        ) : (
          <ul>
            {results.map((u) => (
              <li key={u._id} className={styles.resultItem}>
                <strong>
                  {u.firstName} {u.lastName}
                </strong>{" "}
                — {u.dni}
                <br />
                <small>
                  {Array.isArray(u.currentHiring) && u.currentHiring.length > 0
                    ? u.currentHiring
                        .map(
                          (p) =>
                            `${p.programName || "?"} – ${
                              p.positionName || ""
                            }`
                        )
                        .join(", ")
                    : "Sin periodo activo"}
                </small>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
