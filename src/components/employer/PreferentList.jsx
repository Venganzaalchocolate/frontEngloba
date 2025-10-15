import { useMemo, useState } from "react";
import { FaTrashAlt, FaEdit, FaCalendarAlt } from "react-icons/fa";
import { FaRightLeft } from "react-icons/fa6";
import styles from "../styles/preferentsList.module.css";

export default function PreferentsList({
  preferentsInfoUser,
  onEdit,
  onDelete,
  enumsData,
}) {
  const [showHistory, setShowHistory] = useState(false);
  const items = preferentsInfoUser ?? [];

  const tsFromObjectId = (id) => new Date(parseInt(String(id).slice(0, 8), 16) * 1000);

  const fmt = (d) =>
    d
      ? d.toLocaleString("es-ES", {
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
        })
      : "—";

  // ✅ Unificamos "traslado" y "reincorporacion" en un mismo flujo
  const movimientos = useMemo(
    () => items.filter((p) => p?.type === "traslado" || p?.type === "reincorporacion"),
    [items]
  );

  // Activo más reciente (de cualquier tipo)
  const activo = useMemo(() => {
    const act = movimientos.filter((p) => p.active !== false);
    if (!act.length) return null;
    return act
      .slice()
      .sort((a, b) => {
        const da = new Date(a.createdAt ?? tsFromObjectId(a._id));
        const db = new Date(b.createdAt ?? tsFromObjectId(b._id));
        return db - da;
      })[0];
  }, [movimientos]);

  // Históricos (de ambos tipos)
  const historico = useMemo(() => {
    return movimientos
      .filter((p) => p.active === false)
      .slice()
      .sort((a, b) => {
        const da = new Date(a.createdAt ?? tsFromObjectId(a._id));
        const db = new Date(b.createdAt ?? tsFromObjectId(b._id));
        return db - da;
      });
  }, [movimientos]);

  const getTipoLabel = (type) => (type === "reincorporacion" ? "Reincorporación" : "Traslado");

  const CardActivo = ({ pref }) => {
    const jobNames =
      (pref.jobs || [])
        .map((jid) => enumsData?.jobsIndex?.[jid]?.name)
        .filter(Boolean)
        .join(", ") || "—";

    const provinceNames =
      (pref.provinces || [])
        .map((pid) => enumsData?.provincesIndex?.[pid]?.name)
        .filter(Boolean)
        .join(", ") || "—";

    const created = new Date(pref.createdAt ?? tsFromObjectId(pref._id));

    const auth = pref.authorized;
    const authName = auth ? [auth.firstName, auth.lastName].filter(Boolean).join(" ") : null;
    const authDni = auth?.dni;
    const authEmail = auth?.email;

    const tipoLabel = getTipoLabel(pref.type);

    return (
      <div className={styles.card}>
        <div className={styles.cardHeader}>
          <span className={styles.cardTitle}>
            <FaRightLeft /> {tipoLabel} activo
            <span className={styles.badgeDate}>
              <FaCalendarAlt />
              {fmt(created)}h
            </span>
          </span>

          {authName && (
            <span className={styles.badgeAuth} title={[authDni, authEmail].filter(Boolean).join(" · ")}> 
              Autorizado por:<b> {authName}</b>
            </span>
          )}

          <span className={styles.actions}>
            <FaEdit className={styles.iconAction} onClick={() => onEdit(pref)} />
            <FaTrashAlt className={styles.iconActionDanger} onClick={() => onDelete(pref)} />
          </span>
        </div>

        <div className={styles.cardBody}>
          {authName && (
            <div className={styles.metaRowMobileOnly}>
              <span className={styles.metaLabel}>Autorizado por: </span>
              <span className={styles.badgeAuthInline} title={[authDni, authEmail].filter(Boolean).join(" · ")}>
                {authName}
              </span>
            </div>
          )}

          <div className={styles.gridTwoCols}>
            <div>
              <span className={styles.fieldLabel}>Provincias</span>
              <div className={styles.chipsRow}>
                {provinceNames.split(", ").map((p) => (
                  <span key={p} className={styles.chip}>
                    {p}
                  </span>
                ))}
              </div>
            </div>
            <div>
              <span className={styles.fieldLabel}>Puestos</span>
              <div className={styles.chipsRow}>
                {jobNames.split(", ").map((j) => (
                  <span key={j} className={styles.chip}>
                    {j}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };
//


  return (
    <div className={styles.wrapper}>
      {/* Activo (traslado o reincorporación) */}
      <div className={styles.activeGrid}>
        {activo ? (
          <CardActivo pref={activo} />
        ) : (
          <div className={styles.card}>
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>Movimiento activo</span>
            </div>
            <div className={styles.cardBody}>
              <p>No hay traslado o reincorporación activos.</p>
            </div>
          </div>
        )}
      </div>

      {/* Botón histórico */}
      <div className={styles.historyBar}>
        <button type="button" className={styles.historyBtn} onClick={() => setShowHistory((s) => !s)}>
          {showHistory ? "Ocultar histórico" : "Ver histórico"}
        </button>
      </div>

      {/* Histórico en tabla (ambos tipos) */}
      {showHistory && historico.length > 0 && (
        <div className={styles.historyTableWrapper}>
          <table className={styles.historyTable}>
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Provincias</th>
                <th>Puestos</th>
                <th>Fecha</th>
                <th>Autorizado por</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {historico.map((pref) => {
                const jobNames =
                  (pref.jobs || [])
                    .map((jid) => enumsData?.jobsIndex?.[jid]?.name)
                    .filter(Boolean)
                    .join(", ") || "—";
                const provinceNames =
                  (pref.provinces || [])
                    .map((pid) => enumsData?.provincesIndex?.[pid]?.name)
                    .filter(Boolean)
                    .join(", ") || "—";
                const created = new Date(pref.createdAt ?? tsFromObjectId(pref._id));
                const auth = pref.authorized;
                const authName = auth ? [auth.firstName, auth.lastName].filter(Boolean).join(" ") : "—";

                return (
                  <tr key={pref._id}>
                    <td data-label="Tipo">{getTipoLabel(pref.type)}</td>
                    <td data-label="Provincias">{provinceNames}</td>
                    <td data-label="Puestos">{jobNames}</td>
                    <td data-label="Fecha">{fmt(created)}</td>
                    <td data-label="Autorizado por">{authName}</td>
                    <td data-label="Realizado">{pref.moveDone?'si':'no'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showHistory && historico.length === 0 && (
        <p className={styles.emptyHistory}>No hay histórico disponible.</p>
      )}
    </div>
  );
}
