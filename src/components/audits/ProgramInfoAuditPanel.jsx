import { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { auditInfoProgram } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

export default function ProgramInfoAuditPanel({ modal, charge }) {
  const [selectedFields, setSelectedFields] = useState([]);
  const [results, setResults] = useState([]);

  const FIELDS = [
    { value: "name", label: "Nombre" },
    { value: "acronym", label: "Acrónimo" },
    { value: "responsible", label: "Responsables" },
    { value: "finantial", label: "Financiación" },
    { value: "groupWorkspace", label: "Workspace" },
    { value: "subGroupWorkspace", label: "Subgrupos Workspace" }
  ];

  const toggleField = (f) =>
    setSelectedFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );

  const runAudit = async () => {
    charge(true);
    const token = getToken();
    const res = await auditInfoProgram({ fields: selectedFields }, token);

    if (res?.error) {
      charge(false);
      return modal("Error", res.message || "Error en auditoría");
    }

    setResults(res|| []);
    charge(false);
  };

  return (
    <div className={styles.panel}>
      <h3>Auditoría de Programas</h3>

      <div className={styles.fieldSelector}>
        {FIELDS.map((f) => (
          <label key={f.value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedFields.includes(f.value)}
              onChange={() => toggleField(f.value)}
            />
            {f.label}
          </label>
        ))}
      </div>

      <button onClick={runAudit} className={styles.runButton}>
        Ejecutar auditoría
      </button>

      <div className={styles.results}>
        {results.length === 0 && <p>No se encontraron programas.</p>}

        {results.map((p) => (
          <div key={p._id} className={styles.resultCard}>
            <h4>{p.name}</h4>
            <p>Acrónimo: {p.acronym || "—"}</p>
            <p>Responsables: {p.responsible?.length || 0}</p>
            <p>Financiación: {p.finantial?.length || 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
