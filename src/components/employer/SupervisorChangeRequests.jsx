import { useEffect, useMemo, useState } from "react";
import styles from "../styles/SupervisorChangeRequests.module.css";
import { getToken } from "../../lib/serviceToken";
import {
  getmychangerequest,
  approvechangerequest,
  rejectchangerequest,
  infoDocumentationUnifed,
  getFileDrive,
} from "../../lib/data";
import { formatDate } from "../../lib/utils";

export default function SupervisorChangeRequests({
  userId,
  approverId,   // logged.user._id
  modal,
  charge,
  enumsData,
  changeUserLocally,
}) {
  const [items, setItems] = useState([]);
  const [notes, setNotes] = useState({});
  const [showHistory, setShowHistory] = useState(false);

  // estado de documentos por solicitud
  const [docsByReq, setDocsByReq] = useState({});   // { [reqId]: Doc[] }
  const [docsLoading, setDocsLoading] = useState({});// { [reqId]: boolean }

  // ==================== helpers de UI ====================
  const studiesMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(enumsData?.studies)) {
      for (const cat of enumsData.studies) {
        if (Array.isArray(cat?.subcategories) && cat.subcategories.length) {
          for (const sub of cat.subcategories) map.set(String(sub._id), sub.name);
        } else if (cat?._id) {
          map.set(String(cat._id), cat.name);
        }
      }
    }
    return map;
  }, [enumsData]);

  // justo debajo de const studiesMap = useMemo(...)
const officialById = useMemo(() => {
  const m = new Map();
  (enumsData?.documentation || []).forEach(d => m.set(String(d._id), d));
  return m;
}, [enumsData]);

  const labelFor = (path) => {
    const dict = {
      firstName: "Nombre",
      lastName: "Apellidos",
      dni: "DNI",
      birthday: "Fecha de nacimiento",
      email_personal: "Email personal",
      socialSecurityNumber: "Nº Seguridad Social",
      bankAccountNumber: "Cuenta bancaria",
      phone: "Teléfono personal",
      "phoneJob.number": "Teléfono laboral",
      "phoneJob.extension": "Extensión laboral",
      gender: "Género",
      fostered: "Extutelado",
      apafa: "Apafa",
      consetmentDataProtection: "Consentimiento PD",
      "disability.percentage": "% Discapacidad",
      "disability.notes": "Notas discapacidad",
      studies: "Estudios",
    };
    return dict[path] || path;
  };

  const fmtBool = (v) => (v === true ? "Sí" : v === false ? "No" : "—");
  const fmtDate = (v) => (v ? formatDate(v) : "—");
  const fmtValue = (path, v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (path === "birthday") return fmtDate(v);
    if (["fostered", "apafa", "consetmentDataProtection"].includes(path)) return fmtBool(v);
    if (path === "studies") {
      const arr = Array.isArray(v) ? v : [];
      if (!arr.length) return "—";
      return arr.map((id) => studiesMap.get(String(id)) || String(id)).join(", ");
    }
    if (path === "disability.percentage") return `${v}%`;
    return String(v);
  };

  const fetchAll = async () => {
    charge?.(true);
    try {
      const token = getToken();
      const res = await getmychangerequest({ userId }, token);
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
      setItems(
        list.slice().sort((a, b) => {
          const da = new Date(a.submittedAt || 0);
          const db = new Date(b.submittedAt || 0);
          return db - da;
        })
      );

      // limpiar docs cache al recargar
      setDocsByReq({});
      setDocsLoading({});
    } catch (e) {
      modal?.("Error", e?.message || "No se pudieron cargar las solicitudes");
    } finally {
      charge?.(false);
    }
  };

  useEffect(() => {
    if (userId) fetchAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // ===================== Documentos (enlaces) =====================
  /**
   * /getdocumentationunified devuelve un array con objetos como:
   *  - Finalizados (Filedrive): { _id, idDrive, fileLabel, fileName, category, date, description, isTemp:false }
   *  - Temporales (CR.uploads): { _id:null, idDrive:tempDriveId, labelFile, fileName, category, date, description, isTemp:true }
   */
  const fetchDocsForRequest = async (reqId) => {
    try {
      setDocsLoading((m) => ({ ...m, [reqId]: true }));
      const token = getToken();

      // 1) Traer todo lo de la solicitud
      let docs = await infoDocumentationUnifed({ changeRequestId: reqId }, token);
      if (!Array.isArray(docs)) docs = [];

      // 2) Si alguno finalizado no trae idDrive, completarlo con filesId
      const needFiledriveIds = docs
        .filter((d) => !d.isTemp && !d.idDrive && d._id)
        .map((d) => String(d._id));

      if (needFiledriveIds.length) {
        const filled = await infoDocumentationUnifed({ filesId: needFiledriveIds }, token);
        const byId = new Map(
          (Array.isArray(filled) ? filled : []).map((f) => [String(f._id), f])
        );
        docs = docs.map((d) => {
          if (!d.isTemp && !d.idDrive && d._id && byId.has(String(d._id))) {
            const fd = byId.get(String(d._id));
            return {
              ...d,
              idDrive: fd.idDrive || d.idDrive,
              fileLabel: d.fileLabel || fd.fileLabel,
              description: d.description || fd.description,
            };
          }
          return d;
        });
      }

      // 3) Normalizar para UI
      const ui = docs.map((d, i) => ({
        key: `${reqId}-${i}`,
        fileLabel: d.fileLabel || d.labelFile || d.fileName || "Documento",
        description: d.description || d.fileLabel || d.fileName || "",
        category: d.category || "Varios",
        date: d.date || null,
        isTemp: !!d.isTemp,
        idDrive: d.idDrive || null,
        fileId: d._id || null,
      }));

      setDocsByReq((m) => ({ ...m, [reqId]: ui }));
    } catch (e) {
      modal?.("Error", e?.message || "No se pudieron obtener los documentos");
      setDocsByReq((m) => ({ ...m, [reqId]: [] }));
    } finally {
      setDocsLoading((m) => ({ ...m, [reqId]: false }));
    }
  };

  // Prefetch automático de documentos para todas las solicitudes pendientes con uploads
  useEffect(() => {
    const pendWithUploads = items
      .filter(r => r.status === "pending" && (r.uploads?.length || 0) > 0)
      .map(r => String(r._id));

    for (const reqId of pendWithUploads) {
      if (!docsByReq[reqId] && !docsLoading[reqId]) {
        fetchDocsForRequest(reqId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  // ===== Descarga / Visualización =====
  const handleDownloadDoc = async (doc) => {
    try {
      charge?.(true);
      const token = getToken();

      if (!doc?.idDrive) throw new Error("No hay enlace disponible para descargar.");
      const resp = await getFileDrive({ idFile: doc.idDrive }, token);
      if (!resp?.url) throw new Error("No se pudo obtener URL de descarga.");

      const a = document.createElement("a");
      a.href = resp.url;
      const finalName = (doc.fileLabel || "documento").replace(/\.(pdf)$/i, "");
      a.download = `${finalName}.pdf`;
      a.click();
      URL.revokeObjectURL(resp.url);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo descargar el archivo.");
    } finally {
      charge?.(false);
    }
  };

  const handleViewDoc = async (doc) => {
    try {
      charge?.(true);
      const token = getToken();
      if (!doc?.idDrive) throw new Error("No hay enlace disponible para visualizar.");
      const resp = await getFileDrive({ idFile: doc.idDrive }, token);
      if (!resp?.url) throw new Error("No se pudo obtener URL para visualizar.");
      window.open(resp.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo abrir el archivo.");
    } finally {
      charge?.(false);
    }
  };

  // ===================== aprobar / rechazar =====================
  const onApprove = async (id) => {
    charge?.(true);
    try {
      const token = getToken();
      const res = await approvechangerequest(
        { requestId: id, approverId, note: notes[id] || "" },
        token
      );

      if (!res?.error) changeUserLocally(res);
      setItems((prev) =>
        prev.map((x) =>
          x._id === id
            ? {
              ...x,
              status: "approved",
              decision: {
                decidedBy: approverId,
                decidedAt: new Date().toISOString(),
                note: notes[id] || "",
              },
              appliedAt: new Date().toISOString(),
            }
            : x
        )
      );
      modal?.("Aprobada", "Los cambios han sido aplicados.");
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo aprobar la solicitud");
      fetchAll();
    } finally {
      charge?.(false);
    }
  };

  const onReject = async (id) => {
    charge?.(true);
    try {
      const token = getToken();
      const res = await rejectchangerequest(
        { requestId: id, approverId, note: notes[id] || "" },
        token
      );
      setItems((prev) =>
        prev.map((x) =>
          x._id === id
            ? {
              ...x,
              status: "rejected",
              decision: {
                decidedBy: approverId,
                decidedAt: new Date().toISOString(),
                note: notes[id] || "",
              },
            }
            : x
        )
      );
      if (!res?.error) changeUserLocally(res);
      modal?.("Rechazada", "La solicitud ha sido rechazada.");
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo rechazar la solicitud");
      fetchAll();
    } finally {
      charge?.(false);
    }
  };

  // ===================== split: pendientes/histórico =====================
  const pending = items.filter((r) => r.status === "pending");
  const history = items
    .filter((r) => r.status !== "pending")
    .slice()
    .sort((a, b) => {
      const da = new Date(a.decision?.decidedAt || a.appliedAt || a.submittedAt || 0);
      const db = new Date(b.decision?.decidedAt || b.appliedAt || b.submittedAt || 0);
      return db - da;
    });

  const statusChip = (s) => {
    const cls =
      s === "approved"
        ? styles.approved
        : s === "pending"
          ? styles.pending
          : s === "rejected"
            ? styles.rejected
            : s === "stale"
              ? styles.stale
              : s === "failed"
                ? styles.failed
                : styles.cancelled;
    const txt =
      s === "approved"
        ? "Aprobada"
        : s === "pending"
          ? "Pendiente"
          : s === "rejected"
            ? "Rechazada"
            : s === "stale"
              ? "Caducada"
              : s === "failed"
                ? "Fallida"
                : "Cancelada";
    return <span className={`${styles.chip} ${cls}`}>{txt}</span>;
  };

return (
  <div className={styles.contenedor}>
    <h2>SOLICITUDES</h2>

    {/* Pendientes */}
    <div className={styles.container}>
      <div className={styles.headerBar}>
        <h3 className={styles.title}>Solicitudes de cambio pendientes</h3>
      </div>

      {pending.length === 0 && (
        <p className={styles.empty}>No hay solicitudes pendientes para este usuario.</p>
      )}

      {pending.map((req) => {
        const reqId = String(req._id);
        const list = docsByReq[reqId] || [];
        const isLoadingDocs = !!docsLoading[reqId];

        return (
          <div key={req._id} className={styles.card}>
            <div className={styles.header}>
              {statusChip(req.status)}
              <span className={styles.meta}>Enviada: {fmtDate(req.submittedAt)}</span>
            </div>

            {req.note && <p className={styles.note}>Nota del usuario: {req.note}</p>}

            {/* Cambios de datos */}
            <ul className={styles.changes}>
              {req.changes?.map((c, i) => (
                <li key={i} className={styles.changeRow}>
                  <span className={styles.path}>{labelFor(c.path)}</span>
                  <span className={styles.arrow}>→</span>
                  <div className={styles.values}>
                    <span className={styles.from}>{fmtValue(c.path, c.from)}</span>
                    <span className={styles.sep}>→</span>
                    <span className={styles.to}>{fmtValue(c.path, c.to)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {/* Documentos */}
            {(req.uploads || []).length > 0 && (
              <>
                {isLoadingDocs && <p>Cargando documentos…</p>}

                {!isLoadingDocs && (
                  <ul className={styles.changes}>
                    {list.length === 0 && (
                      <li className={styles.changeRow}>
                        <span className={styles.to}>Sin enlaces</span>
                      </li>
                    )}

                    {list.length > 0 && (
                      <li key={list[0].key} className={styles.changeRow}>
                        <div className={styles.valuesDoc}>
                          <p className={styles.to}>
                            <span>Tipo:</span> {list[0].originDocumentation ? "Oficial" : "Varios"}
                          </p>
                          <p className={styles.to}>
                            <span>Nombre del documento:</span> {list[0].fileLabel}
                          </p>
                          {list[0].date && (
                            <p className={styles.to}>
                              <span>Fecha:</span> {fmtDate(list[0].date)}
                            </p>
                          )}
                          {list[0].showDescription && (
                            <p className={styles.to}>
                              <span>Descripción:</span> {list[0].description}
                            </p>
                          )}
                          {list[0].idDrive ? (
                            <div className={styles.cajabotones}>
                              <button
                                className={styles.linkBtn}
                                onClick={() => handleViewDoc(list[0])}
                              >
                                Ver
                              </button>
                              <button
                                className={styles.linkBtn}
                                onClick={() => handleDownloadDoc(list[0])}
                              >
                                Descargar
                              </button>
                            </div>
                          ) : (
                            <span className={styles.to}>Sin enlaces</span>
                          )}
                        </div>
                      </li>
                    )}
                  </ul>
                )}
              </>
            )}

            <div className={styles.actions}>
              <textarea
                className={styles.noteArea}
                placeholder="Añadir nota (opcional)…"
                value={notes[req._id] || ""}
                onChange={(e) => setNotes((m) => ({ ...m, [req._id]: e.target.value }))}
              />
              <div className={styles.btns}>
                <button className={styles.btnApprove} onClick={() => onApprove(req._id)}>
                  Aprobar
                </button>
                <button className={styles.btnReject} onClick={() => onReject(req._id)}>
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>

    <button className={styles.historyBtn} onClick={() => setShowHistory((s) => !s)}>
      {showHistory ? "Ocultar histórico" : "Ver histórico"}
    </button>

    {showHistory && (
      <div className={styles.historyWrapper}>
        <h3 className={styles.title}>Histórico de solicitudes</h3>
        {history.length === 0 && <p className={styles.empty}>No hay histórico disponible.</p>}

        {history.map((req) => (
          <div key={req._id} className={styles.card}>
            <div className={styles.header}>
              {statusChip(req.status)}
              <span className={styles.meta}>
                Enviada: {fmtDate(req.submittedAt)}
                {req.decision?.decidedAt
                  ? ` · Decidida: ${fmtDate(req.decision.decidedAt)}`
                  : req.appliedAt
                  ? ` · Aplicada: ${fmtDate(req.appliedAt)}`
                  : ""}
              </span>
            </div>

            {req.note && <p className={styles.note}>Nota del usuario: {req.note}</p>}

            <ul className={styles.changes}>
              {req.changes?.map((c, i) => (
                <li key={i} className={styles.changeRow}>
                  <span className={styles.path}>{labelFor(c.path)}</span>
                  <span className={styles.arrow}>→</span>
                  <div className={styles.values}>
                    <span className={styles.from}>{fmtValue(c.path, c.from)}</span>
                    <span className={styles.sep}>→</span>
                    <span className={styles.to}>{fmtValue(c.path, c.to)}</span>
                  </div>
                </li>
              ))}
            </ul>

            {(req.uploads || []).length > 0 && (
              <div className={styles.valuesDoc}>
                {(() => {
                  const u = req.uploads[0] || {};
                  const isOfficial = !!u.originDocumentation;
                  const off = isOfficial ? officialById.get(String(u.originDocumentation)) : null;
                  const name = isOfficial
                    ? (off?.name || "Documento oficial")
                    : (u.labelFile || "Documento");
                  return (
                    <>
                      <p className={styles.to}>
                        <span>Tipo:</span> {isOfficial ? "Oficial" : "Varios"}
                      </p>
                      <p className={styles.to}>
                        <span>Nombre del documento:</span> {name}
                      </p>
                      {u.date && (
                        <p className={styles.to}>
                          <span>Fecha:</span> {fmtDate(u.date)}
                        </p>
                      )}
                      {!isOfficial && (
                        <p className={styles.to}>
                          <span>Descripción:</span> {u.description || ""}
                        </p>
                      )}
                    </>
                  );
                })()}
              </div>
            )}

            {(req.decision?.note || req.error) && (
              <div className={styles.decisionBox}>
                {req.decision?.note && (
                  <p>
                    <strong>Nota del responsable:</strong> {req.decision.note}
                  </p>
                )}
                {req.error && (
                  <p className={styles.error}>
                    <strong>Error técnico:</strong> {req.error}
                  </p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    )}
  </div>
);

}
