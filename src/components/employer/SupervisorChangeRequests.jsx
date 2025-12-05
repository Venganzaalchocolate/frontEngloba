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
  // { [reqId]: { [dateKey]: number | '' } }


  const [timeOffOverrides, setTimeOffOverrides] = useState({});

  // estado de documentos por solicitud
  const [docsByReq, setDocsByReq] = useState({});   // { [reqId]: Doc[] }
  const [docsLoading, setDocsLoading] = useState({});// { [reqId]: boolean }

  const handleChangeTimeOffHours = (reqId, dateKey, value) => {
  setTimeOffOverrides((prev) => {
    const next = { ...prev };
    const keyReq = String(reqId);
    const byReq = { ...(next[keyReq] || {}) };

    let val = value;

    // Si el campo se queda vacío (borras para escribir otro número),
    // guardamos "" para que el input se vea vacío y puedas volver a teclear.
    if (val === "" || val === null || val === undefined) {
      byReq[dateKey] = "";
      next[keyReq] = byReq;
      return next;
    }

    // Normalizar coma/punto
    if (typeof val === "string") {
      val = val.replace(",", ".");
    }

    const hours = Number(val);

    // Valor inválido → no tocamos nada (se queda el estado anterior)
    if (Number.isNaN(hours) || hours < 0) {
      return prev;
    }

    byReq[dateKey] = hours;
    next[keyReq] = byReq;
    return next;
  });
};





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

  // Documentación oficial por id (para histórico)
  const officialById = useMemo(() => {
    const m = new Map();
    (enumsData?.documentation || []).forEach((d) => m.set(String(d._id), d));
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

  // Detectar si una solicitud es de vacaciones/asuntos propios
  const isTimeOffRequest = (r) =>
    r?.timeOff &&
    Array.isArray(r.timeOff.entries) &&
    r.timeOff.entries.length > 0;

  // Construir info de texto y fechas únicas para una solicitud de timeOff
  const buildTimeOffInfo = (timeOff) => {
    if (!timeOff || !Array.isArray(timeOff.entries)) {
      return { label: "", dates: [] };
    }

    const uniqueDates = Array.from(
      new Set(
        timeOff.entries
          .map((e) => (e?.date ? new Date(e.date) : null))
          .filter((d) => d && !Number.isNaN(d.getTime()))
          .map((d) => d.toISOString().slice(0, 10))
      )
    ).sort();

    const label =
      timeOff.kind === "personal"
        ? "DÍAS DE ASUNTOS PROPIOS SOLICITADOS"
        : "DÍAS DE VACACIONES SOLICITADOS";

    return { label, dates: uniqueDates };
  };

  const getTimeOffEntries = (req) => {
    if (!req?.timeOff || !Array.isArray(req.timeOff.entries)) return [];
    return req.timeOff.entries
      .filter((e) => e?.date)
      .map((e) => {
        const d = new Date(e.date);
        if (Number.isNaN(d.getTime())) return null;
        const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
        return {
          key,               // ← la usaremos para mostrar
          date: d,
          rawDate: e.date,
          hours: typeof e.hours === "number" ? e.hours : 7.5,
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.date - b.date);
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
        showDescription: !d.isTemp, // puedes ajustar si quieres
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
      .filter((r) => r.status === "pending" && (r.uploads?.length || 0) > 0)
      .map((r) => String(r._id));

    for (const reqId of pendWithUploads) {
      if (!docsByReq[reqId] && !docsLoading[reqId]) {
        fetchDocsForRequest(reqId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

const handleRemoveTimeOffDay = (reqId, dateKey) => {
  setTimeOffOverrides((prev) => {
    const keyReq = String(reqId);
    const prevForReq = prev[keyReq] || {};
    // Marcamos ese día con 0 horas → es la forma "oficial" de quitarlo
    const nextForReq = { ...prevForReq, [dateKey]: 0 };
    return { ...prev, [keyReq]: nextForReq };
  });
};


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
      const payload = { requestId: id, approverId, note: notes[id] || "" };

      // si la solicitud es de vacaciones/asuntos propios, añadimos override
      const req = items.find((r) => String(r._id) === String(id));
      if (req && isTimeOffRequest(req)) {
  const entries = getTimeOffEntries(req);
  const overridesForReq = timeOffOverrides[String(id)] || {};

  const overrideEntries = entries.map((e) => {
    const rawOverride = overridesForReq[e.key];

    let h;

    if (rawOverride === "" || rawOverride === undefined) {
      // Campo vacío o sin tocar → dejamos las horas originales
      h = e.hours;
    } else {
      // Override numérico o 0 (0 = eliminar ese día)
      h = Number(rawOverride);
      if (!Number.isFinite(h) || h < 0) h = 0;
    }

    return { date: e.rawDate, hours: h };
  });

  payload.timeOffOverride = {
    kind: req.timeOff.kind,  // "vacation" | "personal"
    entries: overrideEntries,
  };
}

      const res = await approvechangerequest(payload, token);


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
      setTimeOffOverrides((prev) => {
        const next = { ...prev };
        delete next[String(id)];
        return next;
      });

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

  const nameDocumentation = (id) => {
    if (!id) return "";
    const documentationData = enumsData.documentation.filter((x) => id == x._id);
    return documentationData[0]?.name;
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
          <p className={styles.empty}>
            No hay solicitudes pendientes para este usuario.
          </p>
        )}

        {pending.map((req) => {
          const reqId = String(req._id);
          const list = docsByReq[reqId] || [];
          const isLoadingDocs = !!docsLoading[reqId];
          const idDocumentation = req.uploads?.[0]?.originDocumentation;
          const nameDocumentationAux = idDocumentation
            ? nameDocumentation(idDocumentation)
            : "";

          const { label: timeOffLabel, dates: timeOffDates } = buildTimeOffInfo(
            req.timeOff
          );

          return (
            <div key={req._id} className={styles.card}>
              <div className={styles.header}>
                {statusChip(req.status)}
                <span className={styles.meta}>
                  Enviada: {fmtDate(req.submittedAt)}
                </span>
              </div>

              {req.note && (
                <p className={styles.note}>Nota del usuario: {req.note}</p>
              )}

              {/* Cambios de datos */}
              {(req.changes?.length || 0) > 0 && (
                <ul className={styles.changes}>
                  {req.changes.map((c, i) => (
                    <li key={i} className={styles.changeRow}>
                      <span className={styles.path}>{labelFor(c.path)}</span>
                      <span className={styles.arrow}>→</span>
                      <div className={styles.values}>
                        <span className={styles.from}>
                          {fmtValue(c.path, c.from)}
                        </span>
                        <span className={styles.sep}>→</span>
                        <span className={styles.to}>
                          {fmtValue(c.path, c.to)}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}

              {/* Bloque de vacaciones / asuntos propios */}
              {/* Vacaciones / asuntos propios */}
              {req.timeOff &&
  Array.isArray(req.timeOff.entries) &&
  req.timeOff.entries.length > 0 && (() => {
    const reqId = String(req._id);
    const allEntries = getTimeOffEntries(req);           // [{ key, date, hours }]
    const overrides = timeOffOverrides[reqId] || {};

    // Solo ocultamos los que el responsable ha marcado explícitamente con 0 horas
    const visibleEntries = allEntries.filter((e) => {
      const ov = overrides[e.key];

      // 0 significa "borrar este día"
      if (ov === 0) return false;

      // "" o undefined → usa las horas originales para decidir visibilidad
      if (ov === "" || ov === undefined) {
        return (e.hours || 0) > 0;
      }

      // Override numérico
      return Number(ov) > 0;
    });

    return (
      <>
        <h4 className={styles.sectionTitle}>
          {req.timeOff.kind === "vacation"
            ? "DÍAS DE VACACIONES SOLICITADOS"
            : "DÍAS DE ASUNTOS PROPIOS SOLICITADOS"}
        </h4>

        {visibleEntries.length === 0 ? (
          <p className={styles.empty}>
            No hay días seleccionados. Si apruebas así, no se aplicará ningún día.
          </p>
        ) : (
          <ul className={styles.changes}>
            {visibleEntries.map((e) => {
              const overrideRaw = overrides[e.key];
              // Para el input:
              // - undefined → mostramos las horas originales
              // - "" → mostramos vacío (estás editando)
              // - número → mostramos el número override
              const currentHours =
                overrideRaw === undefined ? e.hours : overrideRaw;

              return (
                <li key={e.key} className={styles.changeRow}>
                  {/* Fecha */}
                  <span className={styles.path}>{fmtDate(e.key)}</span>

                  {/* Horas editables */}
                  <input
                    type="number"
                    min={0}
                    max={24}
                    step={0.5}
                    className={styles.hourInput}
                    value={currentHours}
                    onChange={(ev) =>
                      handleChangeTimeOffHours(
                        reqId,
                        e.key,
                        ev.target.value
                      )
                    }
                  />
                  <span className={styles.to}>horas</span>

                  {/* Botón para quitar el día */}
                  <button
                    type="button"
                    className={styles.btnGhost}
                    onClick={() => handleRemoveTimeOffDay(reqId, e.key)}
                  >
                    Quitar día
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p className={styles.note}>
          Puedes ajustar las horas por día o quitar un día con el botón
          “Quitar día” antes de aprobar. Los días que marques con 0 horas
          no se aplicarán.
        </p>
      </>
    );
  })()}



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
                              <span>Tipo:</span>{" "}
                              {list[0].category === "Oficial"
                                ? "Oficial"
                                : "Varios"}
                            </p>
                            <p className={styles.to}>
                              <span>
                                {list[0].category === "Oficial"
                                  ? "Subtipo: "
                                  : "Nombre del documento:"}{" "}
                              </span>
                              {list[0].category === "Oficial"
                                ? nameDocumentationAux
                                : list[0].fileLabel}
                            </p>
                            {list[0].date && (
                              <p className={styles.to}>
                                <span>Fecha:</span>{" "}
                                {fmtDate(list[0].date)}
                              </p>
                            )}
                            {list[0].showDescription && (
                              <p className={styles.to}>
                                <span>Descripción:</span>{" "}
                                {list[0].description}
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
                  onChange={(e) =>
                    setNotes((m) => ({ ...m, [req._id]: e.target.value }))
                  }
                />
                <div className={styles.btns}>
                  <button
                    className={styles.btnApprove}
                    onClick={() => onApprove(req._id)}
                  >
                    Aprobar
                  </button>
                  <button
                    className={styles.btnReject}
                    onClick={() => onReject(req._id)}
                  >
                    Rechazar
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <button
        className={styles.historyBtn}
        onClick={() => setShowHistory((s) => !s)}
      >
        {showHistory ? "Ocultar histórico" : "Ver histórico"}
      </button>

      {showHistory && (
        <div className={styles.historyWrapper}>
          <h3 className={styles.title}>Histórico de solicitudes</h3>
          {history.length === 0 && (
            <p className={styles.empty}>No hay histórico disponible.</p>
          )}

          {history.map((req) => {
            const { label: timeOffLabel, dates: timeOffDates } =
              buildTimeOffInfo(req.timeOff);

            return (
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

                {req.note && (
                  <p className={styles.note}>
                    Nota del usuario: {req.note}
                  </p>
                )}

                {(req.changes?.length || 0) > 0 && (
                  <ul className={styles.changes}>
                    {req.changes.map((c, i) => (
                      <li key={i} className={styles.changeRow}>
                        <span className={styles.path}>
                          {labelFor(c.path)}
                        </span>
                        <span className={styles.arrow}>→</span>
                        <div className={styles.values}>
                          <span className={styles.from}>
                            {fmtValue(c.path, c.from)}
                          </span>
                          <span className={styles.sep}>→</span>
                          <span className={styles.to}>
                            {fmtValue(c.path, c.to)}
                          </span>
                        </div>
                      </li>
                    ))}
                  </ul>
                )}

                {/* Histórico de vacaciones / asuntos propios */}
                {isTimeOffRequest(req) && (
                  <div className={styles.timeOffBlock}>
                    <h4 className={styles.sectionTitle}>{timeOffLabel}</h4>
                    {timeOffDates.length === 0 ? (
                      <p className={styles.empty}>
                        No hay días válidos en esta solicitud.
                      </p>
                    ) : (
                      <ul className={styles.changes}>
                        {timeOffDates.map((d) => (
                          <li key={d} className={styles.changeRow}>
                            <span className={styles.to}>{fmtDate(d)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {(req.uploads || []).length > 0 && (
                  <div className={styles.valuesDoc}>
                    {(() => {
                      const u = req.uploads[0] || {};
                      const isOfficial = !!u.originDocumentation;
                      const off = isOfficial
                        ? officialById.get(String(u.originDocumentation))
                        : null;

                      const name = isOfficial
                        ? off?.name || "Documento oficial"
                        : u.labelFile || "Documento";
                      return (
                        <>
                          <p className={styles.to}>
                            <span>Tipo:</span>{" "}
                            {isOfficial ? "Oficial" : "Varios"}
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
                              <span>Descripción:</span>{" "}
                              {u.description || ""}
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
                        <strong>Nota del responsable:</strong>{" "}
                        {req.decision.note}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
