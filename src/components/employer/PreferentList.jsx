import { useMemo, useState } from "react";
import { FaTrashAlt, FaEdit } from "react-icons/fa";
import styles from "../styles/preferentsList.module.css";

export default function PreferentsList({ preferentsInfoUser, onEdit, onDelete, enumsData }) {
  const [showHistory, setShowHistory] = useState(false);
  const items = preferentsInfoUser ?? [];

  const tsFromObjectId = (id) => new Date(parseInt(String(id).slice(0, 8), 16) * 1000);
  const fmt = (d) =>
    d
      ? d.toLocaleString("es-ES", { year:"numeric", month:"2-digit", day:"2-digit", hour:"2-digit", minute:"2-digit" })
      : "—";

  const traslados = useMemo(
    () => items.filter(p => p.type === "traslado"),
    [items]
  );

  const active = useMemo(() => {
    const act = traslados.filter(p => p.active !== false);
    if (!act.length) return null;
    return act.slice().sort((a,b) => {
      const da = new Date(a.createdAt ?? tsFromObjectId(a._id));
      const db = new Date(b.createdAt ?? tsFromObjectId(b._id));
      return db - da;
    })[0];
  }, [traslados]);

  const inactive = useMemo(() => {
    return traslados
      .filter(p => p.active === false)
      .slice()
      .sort((a,b) => {
        const da = new Date(a.createdAt ?? tsFromObjectId(a._id));
        const db = new Date(b.createdAt ?? tsFromObjectId(b._id));
        return db - da;
      });
  }, [traslados]);

  const CardActivo = ({ pref }) => {
    const jobNames = (pref.jobs || [])
      .map(jid => enumsData.jobsIndex[jid]?.name)
      .filter(Boolean).join(", ") || "—";

    const provinceNames = (pref.provinces || [])
      .map(pid => enumsData.provincesIndex[pid]?.name)
      .filter(Boolean).join(", ") || "—";

    const created = new Date(pref.createdAt ?? tsFromObjectId(pref._id));

    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>Traslado activo</span>
          <span className={styles.actions}>
            <button title="Editar" onClick={() => onEdit(pref)}><FaEdit/></button>
            <button title="Eliminar" onClick={() => onDelete(pref)}><FaTrashAlt/></button>
          </span>
        </div>
        <div className={styles.cardBody}>
          <p><b>Provincias:</b> {provinceNames}</p>
          <p><b>Puestos:</b> {jobNames}</p>
          <p><b>Fecha:</b> {fmt(created)}</p>
        </div>
      </div>
    );
  };

  if (items.length === 0) return null;

  return (
    <div className={styles.wrapper}>
      {/* Activo */}
      <div className={styles.activeGrid}>
        {active ? <CardActivo pref={active} /> : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Traslado activo</span>
            </div>
            <div className={styles.cardBody}><p>No hay traslado activo.</p></div>
          </div>
        )}
      </div>

      {/* Botón histórico */}
      <div className={styles.historyBar}>
        <button
          type="button"
          className={styles.historyBtn}
          onClick={() => setShowHistory(s => !s)}
        >
          {showHistory ? "Ocultar histórico" : "Ver histórico"}
        </button>
      </div>

      {/* Histórico en tabla */}
{showHistory && inactive.length > 0 && (
  <div className={styles.historyTableWrapper}>
    <table className={styles.historyTable}>
      <thead>
        <tr>
          <th>Provincias</th>
          <th>Puestos</th>
          <th>Fecha</th>
        </tr>
      </thead>
      <tbody>
        {inactive.map(pref => {
          const jobNames = (pref.jobs || [])
            .map(jid => enumsData.jobsIndex[jid]?.name)
            .filter(Boolean).join(", ") || "—";
          const provinceNames = (pref.provinces || [])
            .map(pid => enumsData.provincesIndex[pid]?.name)
            .filter(Boolean).join(", ") || "—";
          const created = new Date(pref.createdAt ?? tsFromObjectId(pref._id));

          return (
            <tr key={pref._id}>
              <td data-label="Provincias">{provinceNames}</td>
              <td data-label="Puestos">{jobNames}</td>
              <td data-label="Fecha">{fmt(created)}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
)}

      {showHistory && inactive.length === 0 && (
        <p className={styles.emptyHistory}>No hay histórico disponible.</p>
      )}
    </div>
  );
}
