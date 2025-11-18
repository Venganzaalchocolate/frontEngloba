import { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { auditInfoDevice } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

export default function DeviceInfoAuditPanel({ modal, charge }) {
  const [selectedFields, setSelectedFields] = useState([]);
  const [results, setResults] = useState([]);

  const FIELDS = [
    { value: "name", label: "Nombre" },
    { value: "email", label: "Correo" },
    { value: "phone", label: "Teléfono" },
    { value: "responsible", label: "Responsables" },
    { value: "coordinators", label: "Coordinadores" },
    { value: "groupWorkspace", label: "Workspace" }
  ];

  const toggle = (f) =>
    setSelectedFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );

  const runAudit = async () => {
    charge(true);
    const token = getToken();
    const res = await auditInfoDevice({ fields: selectedFields }, token);

    if (res?.error) {
      charge(false);
      return modal("Error", res.message || "Error en auditoría");
    }

    setResults(res || []);
    charge(false);
  };

  return (
    <div className={styles.panel}>
      <h3>Auditoría de Dispositivos</h3>

      <div className={styles.fieldSelector}>
        {FIELDS.map((f) => (
          <label key={f.value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedFields.includes(f.value)}
              onChange={() => toggle(f.value)}
            />
            {f.label}
          </label>
        ))}
      </div>

      <button onClick={runAudit} className={styles.runButton}>
        Ejecutar auditoría
      </button>

      <div className={styles.results}>
        {results.length === 0 && <p>No se encontraron dispositivos.</p>}

        {results.map((d) => (
          <div key={d._id} className={styles.resultCard}>
            <h4>{d.name}</h4>
            <p>Programa: {d.program?.name || "—"}</p>
            <p>Responsables: {d.responsible?.length || 0}</p>
            <p>Coordinadores: {d.coordinators?.length || 0}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
