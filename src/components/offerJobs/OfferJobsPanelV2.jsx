import { useEffect, useMemo, useRef, useState } from "react";
import { getToken } from "../../lib/serviceToken";
import { offerList, offerHardDelete, offerUpdate, hiringList, infoUser } from "../../lib/data";
import ModalConfirmation from "../globals/ModalConfirmation";
import ModalForm from "../globals/ModalForm";
import FormOffer from "./FormOffer";
import styles from "../styles/offers.module.css";
import { FaEye, FaEyeSlash, FaSquarePlus } from "react-icons/fa6";
import { FaEdit, FaInfoCircle, FaTrashAlt, FaLockOpen, FaUserFriends } from "react-icons/fa";
import { useLogin } from '../../hooks/useLogin';

const normDni = (dni) => (dni ? String(dni).replace(/\s+/g, '').toUpperCase() : '—');
const humanEmployment = (status) => {
  const s = (status || '').toLowerCase();
  if (s.includes('activo')) return 'Sí';
  if (s.includes('ya no trabaja')) return 'No';
  if (s.includes('proceso')) return 'En proceso';
  return status || '—';
};

const OffersJobsPanelV2 = ({ enumsData, modal, charge }) => {
  const token = getToken();
  const [offers, setOffers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingOffer, setEditingOffer] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toClose, setToClose] = useState(null);
  const [infoOffer, setInfoOffer] = useState(null);
  const { logged } = useLogin();
  const [linkedUsers, setLinkedUsers] = useState(null);

  // ===== helpers de mapeo (NUEVOS índices) =====
  const jobsIndex = enumsData?.jobsIndex || {};
  const programsIndex = enumsData?.programsIndex || {};       // claves = programId
  const dispositiveIndex = enumsData?.dispositiveIndex || {}; // claves = dispositiveId
  const studiesIndex = enumsData?.studiesIndex || {};

  const getFunctionLabel = (o) => jobsIndex?.[o?.jobId]?.name || o?.job_title || "—";
  const fmtDate = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "—");
  const getCvCount = (o) => (
    typeof o?.userCvCount === "number" ? o.userCvCount :
      Array.isArray(o?.userCv) ? o.userCv.length :
        Array.isArray(o?.usersCv) ? o.usersCv.length :
          typeof o?.cvCount === "number" ? o.cvCount : 0
  );
  
  const getDeviceId = (o) => {
    return o.dispositive?.newDispositiveId || "";
  }

  // Ahora el nombre del dispositivo sale de dispositiveIndex (no de programsIndex).
  const getDeviceName = (o) => {
    const id = getDeviceId(o);
   
    const dev = dispositiveIndex?.[id];
    return dev?.name || o?.dispositive?.name || "—";
  };

  const getCreatedDate = (o) => o?.datecreate || o?.date || o?.createdAt || null;

  // ===== cargar listado ACTIVO =====
  useEffect(() => {
    (async () => {
      charge?.(true);
      const res = await offerList({ page: 1, limit: 200, active: true });
      if (res?.error) {
        modal?.("Error", res.message || "No se pudieron cargar las ofertas.");
      } else {
        const docs = res?.docs || res || [];
        const onlyActive = Array.isArray(docs) ? docs.filter(o => o?.active !== false) : [];
        setOffers(onlyActive);
      }
      charge?.(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openLinkedHirings = async (offer) => {
    try {
      charge?.(true);
      const res = await hiringList(
        { selectionProcess: offer._id, page: 1, limit: 200 },
        token
      );
      const periods = Array.isArray(res?.docs) ? res.docs : (Array.isArray(res) ? res : []);
      const userIds = [...new Set(periods.map(p => p?.idUser).filter(Boolean).map(String))];

      const usersArr = await Promise.all(
        userIds.map(async (id) => {
          try {
            const data = await infoUser(token, { id });
            const u = Array.isArray(data) ? data[0] : data;
            return {
              _id: id,
              firstName: u?.firstName,
              lastName: u?.lastName,
              dni: u?.dni,
              employmentStatus: u?.employmentStatus,
            };
          } catch {
            return { _id: id };
          }
        })
      );
      const usersMap = new Map(usersArr.map(u => [String(u._id), u]));

      const rows = periods.map((p) => {
        const u = usersMap.get(String(p.idUser)) || {};
        const name = [u.firstName, u.lastName].filter(Boolean).join(' ') || '—';
        const dni = normDni(u.dni);
        const hiredAt = fmtDate(p.startDate);
        const statusPeriod = p.endDate ? `Fin: ${fmtDate(p.endDate)}` : 'En curso';
        const activeCompany = humanEmployment(u.employmentStatus);
        return {name:name, dni:dni, alta:hiredAt, fin:statusPeriod, active: activeCompany};
      });

      setLinkedUsers({ offer, rows });
    } catch (e) {
      modal?.("Error", e?.message || "No se pudieron cargar las contrataciones vinculadas.");
    } finally {
      charge?.(false);
    }
  };

  // ===== acciones =====
  const openCreate = () => { setEditingOffer(null); setShowForm(true); };
  const openEdit = (offer) => { setEditingOffer(offer); setShowForm(true); };
  const closeForm = () => setShowForm(false);

  const changeOffers = (saved) => {
    setOffers((prev) => {
      const id = String(saved?._id || saved?.id);
      const exists = prev.some((o) => String(o._id || o.id) === id);
      return exists
        ? prev.map((o) => (String(o._id || o.id) === id ? saved : o))
        : [saved, ...prev];
    });
  };

  const confirmDelete = (offer) => setToDelete(offer);
  const confirmClose = (offer) => setToClose(offer);

  const doDelete = async () => {
    try {
      charge?.(true);
      const id = toDelete?._id || toDelete?.id;
      const res = await offerHardDelete({ offerId: id, id }, token);
      if (res?.error) throw new Error(res.message || "No se pudo eliminar la oferta.");
      setOffers((prev) => prev.filter((o) => String(o._id || o.id) !== String(id)));
      modal?.("Oferta", "Oferta eliminada permanentemente.");
    } catch (e) {
      modal?.("Error", e.message);
    } finally {
      setToDelete(null);
      charge?.(false);
    }
  };

  const doClose = async () => {
    try {
      charge?.(true);
      const id = toClose?._id || toClose?.id;
      const res = await offerUpdate({ active: false, offerId: id, id }, token);
      if (res?.error) throw new Error(res.message || "No se pudo cerrar la oferta.");
      setOffers((prev) => prev.filter((o) => String(o._id || o.id) !== String(id)));
      modal?.("Oferta", "Oferta cerrada.");
    } catch (e) {
      modal?.("Error", e.message);
    } finally {
      setToClose(null);
      charge?.(false);
    }
  };

  // ===== INFO =====
  const buildInfoFields = (o) => {
    const fields = [
      { name: "jobLabel", label: "Función", type: "text", defaultValue: getFunctionLabel(o), disabled: true },
      { name: "deviceLabel", label: "Dispositivo", type: "text", defaultValue: getDeviceName(o), disabled: true,  },
    ];
    if (o?.location) fields.push({ name: "location", label: "Ubicación", type: "text", defaultValue: o.location, disabled: true });
    fields.push({ name: "status", label: "Estado", type: "text", defaultValue: (o?.active === false ? "Cerrada" : "Activa"), disabled: true });
    fields.push({ name: "created", label: "Creada", type: "text", defaultValue: fmtDate(getCreatedDate(o)), disabled: true });
    if (o?.updatedAt) fields.push({ name: "updated", label: "Actualizada", type: "text", defaultValue: fmtDate(o.updatedAt), disabled: true });
    fields.push({ name: "cvs", label: "CVs vinculados", type: "text", defaultValue: String(getCvCount(o)), disabled: true });
    if (o?.essentials_requirements) fields.push({ name: "essentials_requirements", label: "Requisitos Esenciales", type: "textarea", defaultValue: o?.essentials_requirements, disabled: true });
    if (o?.optionals_requirements) fields.push({ name: "optionals_requirements", label: "Requisitos Opcionales", type: "textarea", defaultValue: o?.optionals_requirements, disabled: true });
    if (o?.conditions) fields.push({ name: "conditions", label: "Condiciones", type: "textarea", defaultValue: o?.conditions, disabled: true });

    if (o?.studiesId) {
      const nameStudies = o.studiesId.map((x) => studiesIndex?.[x]?.name || x).join(", ");
      fields.push({ name: "studies", label: "Estudios", type: "textarea", defaultValue: nameStudies, disabled: true });
    }
    if (o?.notes) {
      fields.push({ type: "section", label: "Notas" });
      fields.push({ name: "notes", type: "textarea", defaultValue: o.notes, disabled: true });
    }
    return fields;
  };
  const openInfo = (o) => setInfoOffer(o);

  // ======== HISTÓRICO (active:false) + FILTRO Programa/Dispositivo ========
  const [showHistory, setShowHistory] = useState(false);
  const [histItems, setHistItems] = useState([]);
  const [histPage, setHistPage] = useState(1);
  const [histLimit, setHistLimit] = useState("10");
  const [histTotalPages, setHistTotalPages] = useState(1);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Filtros SOLO histórico
  const [histFilters, setHistFilters] = useState({ programId: "", dispositiveId: "" });

  // Combobox Programa/Dispositivo (rehecho con los ÍNDICES)
  const [pdQuery, setPdQuery] = useState("");
  const [pdOpen, setPdOpen] = useState(false);
  const searchWrapRef = useRef(null);
  useEffect(() => {
    const onDocClick = (e) => { if (!searchWrapRef.current?.contains(e.target)) setPdOpen(false); };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);
  const norm = (s) => (s || "").toString().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  // Lista aplanada de programas + dispositivos a partir de programsIndex + dispositiveIndex
  const flatProgDev = useMemo(() => {
    const items = [];

    // Programas
    Object.entries(programsIndex).forEach(([pid, p]) => {
      const acr = p?.acronym || "";
      items.push({
        type: "program",
        id: pid,
        programId: pid,
        display: `${p?.name || pid}${acr ? ` (${acr})` : ""}`,
        searchable: `${p?.name || ""} ${acr}`.trim(),
      });
    });

    // Dispositivos
    Object.entries(dispositiveIndex).forEach(([did, d]) => {
      const prog = programsIndex?.[d?.program] || {};
      const acr = prog?.acronym || "";
      items.push({
        type: "device",
        id: did,
        programId: d?.program || "",
        deviceId: did,
        display: d?.name || did,
        searchable: `${d?.name || ""} ${prog?.name || ""} ${acr}`.trim(),
      });
    });

    return items.sort((a, b) => a.display.localeCompare(b.display, "es"));
  }, [programsIndex, dispositiveIndex]);

  const pdResults = useMemo(() => {
    const q = norm(pdQuery);
    if (!q) return flatProgDev;
    return flatProgDev.filter((it) => norm(it.searchable).includes(q)).slice(0, 30);
  }, [pdQuery, flatProgDev]);

  const handleHistFilterChange = (name, value) => {
    setHistFilters((prev) => ({ ...prev, [name]: value }));
  };

  const clearPd = () => {
    setPdQuery("");
    handleHistFilterChange("programId", "");
    handleHistFilterChange("dispositiveId", "");
    fetchHistory(1, histLimit, { programId: "", dispositiveId: "" });
  };

  const selectPd = (item) => {
    setPdQuery(item.display);
    setPdOpen(false);
    // Siempre programId
    handleHistFilterChange("programId", item.programId);
    // Si es device, guardamos dispositiveId; si es programa, vaciamos dispositiveId
    const deviceVal = item.type === "device" ? item.deviceId : "";
    handleHistFilterChange("dispositiveId", deviceVal);
    fetchHistory(1, histLimit, { programId: item.programId, dispositiveId: deviceVal });
  };

  // Fetch histórico con filtros (mantiene dispositiveId en la query)
  const fetchHistory = async (page = 1, limitOverride = histLimit, filtersArg) => {
    try {
      setLoadingHistory(true);

      const currentFilters = {
        programId: histFilters.programId,
        dispositiveId: histFilters.dispositiveId,
        ...(filtersArg || {}),
      };

      const limitStr = String(limitOverride);
      const isAll = limitStr === "ALL";

      const params = { active: false, sort: "-createdAt" };
      if (!isAll) {
        params.page = page;
        params.limit = Number(limitStr);
      }
      if (currentFilters.programId) params.programId = currentFilters.programId;
      if (currentFilters.dispositiveId) params.dispositiveId = currentFilters.dispositiveId;

      const res = await offerList(params);

      const items = Array.isArray(res?.docs)
        ? res.docs
        : Array.isArray(res?.items)
          ? res.items
          : Array.isArray(res?.data)
            ? res.data
            : [];

      const totalDocsFromServer = Number(res?.total);
      const totalDocs = Number.isFinite(totalDocsFromServer) ? totalDocsFromServer : items.length;

      const limitUsedFromServer = Number(res?.limit);
      const limitUsed = isAll
        ? (Number.isFinite(totalDocsFromServer) ? totalDocs : items.length)
        : Number.isFinite(limitUsedFromServer) && limitUsedFromServer > 0
          ? limitUsedFromServer
          : Number(limitStr) || 10;

      const srvPageFromServer = Number(res?.page);
      const srvPage = isAll
        ? 1
        : Number.isFinite(srvPageFromServer) && srvPageFromServer > 0
          ? srvPageFromServer
          : page;

      setHistItems(items);

      const totalPages = isAll ? 1 : Math.max(1, Math.ceil(totalDocs / limitUsed));
      setHistTotalPages(totalPages);
      setHistPage(Math.min(Math.max(1, srvPage), totalPages));
    } catch {
      modal?.("Error", "No se pudo cargar el histórico de ofertas.");
    } finally {
      setLoadingHistory(false);
    }
  };

  const toggleHistory = () => {
    setShowHistory((prev) => {
      const next = !prev;
      if (next && histItems.length === 0) fetchHistory(1, histLimit);
      return next;
    });
  };

  const handleChangeHistLimit = (e) => {
    const next = e.target.value; // "10" | "30" | "ALL"
    fetchHistory(1, next);
    setHistLimit(next);
  };

  // ===== render =====
  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>OFERTAS</h2>
            <FaSquarePlus title="Nueva oferta" onClick={openCreate} />
          </div>
        </div>

        {/* Tabla activas */}
        <div className={styles.tableWrapper}>
          <table className={styles.table} aria-label="Tabla de ofertas activas">
            <thead>
              <tr>
                <th>Dispositivo</th>
                <th>Función</th>
                <th>Creada</th>
                <th title="Pública o Privada">Tipo de Oferta</th>
                <th className={styles.thAcciones}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {offers.map((o) => {
                const key = o._id || o.id;
                const nameJob = getFunctionLabel(o);
                return (
                  <tr key={key} className={styles.row}>
                    <td className={styles.cell}><span className={styles.device}>{getDeviceName(o)}</span></td>
                    <td className={styles.cell}><span className={styles.function}>{nameJob}</span></td>
                    <td className={`${styles.cell} ${styles.mono}`}>{fmtDate(getCreatedDate(o))}</td>
                    <td className={styles.cell}>
                      <span className={styles.badge} title={o.type === 'internal' ? 'Oferta Privada' : 'Oferta Pública'}>
                        {o.type !== 'internal' ? <FaEye /> : <FaEyeSlash />}
                      </span>
                    </td>
                    <td className={`${styles.cell} ${styles.actions}`}>
                      <FaInfoCircle className={styles.iconAction} title="Ver info" onClick={() => openInfo(o)} />
                      <FaEdit className={styles.iconAction} title="Editar oferta" onClick={() => openEdit(o)} />
                      <FaLockOpen className={styles.iconAction} title="Cerrar oferta" onClick={() => confirmClose(o)} />
                      {logged?.user?.role === 'root' && (
                        <FaTrashAlt className={styles.iconActionDanger} title="Eliminar" onClick={() => confirmDelete(o)} />
                      )}
                    </td>
                  </tr>
                );
              })}
              {offers.length === 0 && (
                <tr><td className={styles.empty} colSpan={5}>No hay ofertas activas.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Histórico */}
        <div className={styles.historyWrapper}>
          <div className={styles.box}>
            <button className={styles.btnHistory} onClick={toggleHistory}>
              {showHistory ? 'Ocultar histórico' : 'Ver histórico (cerradas)'}
            </button>

            {showHistory && (
              <div className={styles.box}>
                {/* Filtro Programa/Dispositivo (combobox) */}
                <div className={styles.pdGroup}>
                  <label htmlFor="histPdSearch" className={styles.pdFieldLabel}>
                    Programa o Dispositivo:
                  </label>

                  <div ref={searchWrapRef} className={styles.pdSearchWrap}>
                    <input
                      id="histPdSearch"
                      type="text"
                      className={styles.pdSearchInput}
                      placeholder="Escribe para buscar…"
                      value={pdQuery}
                      onChange={(e) => { setPdQuery(e.target.value); setPdOpen(true); }}
                      onFocus={() => setPdOpen(true)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && pdResults[0]) { e.preventDefault(); selectPd(pdResults[0]); }
                        if (e.key === 'Escape') setPdOpen(false);
                      }}
                      role="combobox"
                      aria-expanded={pdOpen}
                      aria-controls="histPdList"
                      aria-autocomplete="list"
                    />

                    {!!pdQuery && (
                      <button
                        type="button"
                        className={styles.pdClearBtn}
                        onClick={clearPd}
                        aria-label="Limpiar búsqueda"
                        title="Limpiar búsqueda"
                      >
                        ×
                      </button>
                    )}

                    {pdOpen && pdResults.length > 0 && (
                      <ul id="histPdList" role="listbox" className={styles.pdSearchList}>
                        {pdResults.map((item, i) => (
                          <li key={`${item.type}-${item.id}`} role="option" aria-selected={i === 0}>
                            <p
                              className={styles.pdSearchItem}
                              onClick={() => selectPd(item)}
                              tabIndex={0}
                              onKeyDown={(e) => (e.key === 'Enter' ? selectPd(item) : null)}
                            >
                              <span className={styles.pdBadge}>
                                {item.type === 'program' ? 'Programa' : 'Dispositivo'}
                              </span>
                              <span className={styles.pdLabel}>{item.display}</span>
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>

                {/* Selector de límite */}
                <div className={styles.box}>
                  <label htmlFor="limitHist" className={styles.pageInfo}>Por página:</label>
                  <select
                    id="limitHist"
                    value={histLimit}
                    onChange={handleChangeHistLimit}
                    className={styles.pageBtn}
                  >
                    <option value="10">10</option>
                    <option value="30">30</option>
                    <option value="ALL">Todos</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {showHistory && (
            <div className={styles.tableWrapper}>
              {loadingHistory ? (
                <div className={styles.loading}>Cargando histórico…</div>
              ) : (
                <>
                  <table className={styles.table} aria-label="Tabla de ofertas cerradas">
                    <thead>
                      <tr>
                        <th>Dispositivo</th>
                        <th>Función</th>
                        <th>Cerrada/Actualizada</th>
                        <th title="Pública o Privada">Tipo de Oferta</th>
                        <th className={styles.thAcciones}>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {histItems.map((o) => {
                        const key = o._id || o.id;
                        const nameJob = getFunctionLabel(o);
                        const closedAt = o?.closedAt || o?.deactivatedAt || o?.updatedAt || getCreatedDate(o);
                        
                        return (
                          <tr key={key} className={styles.rowMuted}>
                            <td className={styles.cell}><span className={styles.device}>{getDeviceName(o)}</span></td>
                            <td className={styles.cell}><span className={styles.function}>{nameJob}</span></td>
                            <td className={`${styles.cell} ${styles.mono}`}>{fmtDate(closedAt)}</td>
                            <td className={styles.cell}>
                              <span className={styles.badge} title={o.type === 'internal' ? 'Oferta Privada' : 'Oferta Pública'}>
                                {o.type !== 'internal' ? <FaEye /> : <FaEyeSlash />}
                              </span>
                            </td>
                            <td className={`${styles.cell} ${styles.actions}`}>
                              <FaInfoCircle className={styles.iconAction} title="Ver info" onClick={() => openInfo(o)} />
                              <FaUserFriends className={styles.iconAction} title="Ver contrataciones vinculadas" onClick={() => openLinkedHirings(o)} />
                            </td>
                          </tr>
                        );
                      })}
                      {histItems.length === 0 && (
                        <tr><td className={styles.empty} colSpan={5}>No hay ofertas cerradas.</td></tr>
                      )}
                    </tbody>
                  </table>

                  {/* Paginación */}
                  <div className={styles.pagination} role="navigation" aria-label="Paginación histórico">
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => fetchHistory(histPage - 1)}
                      disabled={histLimit === "ALL" || histPage <= 1}
                      aria-disabled={histLimit === "ALL" || histPage <= 1}
                    >
                      ◀ Anterior
                    </button>
                    <span className={styles.pageInfo}>
                      Página {histLimit === "ALL" ? 1 : histPage} / {histLimit === "ALL" ? 1 : histTotalPages}
                    </span>
                    <button
                      type="button"
                      className={styles.pageBtn}
                      onClick={() => fetchHistory(histPage + 1)}
                      disabled={histLimit === "ALL" || histPage >= histTotalPages}
                      aria-disabled={histLimit === "ALL" || histPage >= histTotalPages}
                    >
                      Siguiente ▶
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {showForm && (
          <FormOffer
            enumsData={enumsData}
            closeModal={closeForm}
            charge={charge}
            modal={modal}
            offer={editingOffer}
            changeOffers={changeOffers}
          />
        )}

        {toDelete && (
          <ModalConfirmation
            title="Eliminar oferta"
            message="¿Seguro que deseas eliminar PERMANENTEMENTE esta oferta?"
            onConfirm={doDelete}
            onCancel={() => setToDelete(null)}
          />
        )}

        {toClose && (
          <ModalConfirmation
            title="Cerrar oferta"
            message="¿Seguro que deseas CERRAR esta oferta? Dejará de estar activa y pasará al histórico."
            onConfirm={doClose}
            onCancel={() => setToClose(null)}
          />
        )}

        {infoOffer && (
          <ModalForm
            title="Información de la oferta"
            message=""
            fields={buildInfoFields(infoOffer)}
            onSubmit={() => setInfoOffer(null)}
            onClose={() => setInfoOffer(null)}
          />
        )}

        {linkedUsers && (
          <ModalForm
            title="Contrataciones vinculadas a la oferta"
            message={`Oferta: ${getFunctionLabel(linkedUsers.offer)} · ${getDeviceName(linkedUsers.offer)} · Resultados: ${Array.isArray(linkedUsers.rows) ? linkedUsers.rows.length : 0}`}
            fields={[
              {
                type: "info",
                content: (
                  <div className={styles.linkedList}>
                    {Array.isArray(linkedUsers.rows) && linkedUsers.rows.length > 0 ? (
                      linkedUsers.rows.map((x, idx) => {
                        const name = x?.name || "—";
                        const dni = x?.dni || "—";
                        const inicio = x?.alta || "—";
                        const periodoTxt = x?.fin || "—";
                        const periodoEnded = typeof periodoTxt === "string" && periodoTxt.toLowerCase().startsWith("fin:");
                        const activoTxt = x?.active || "Desconocido";

                        const activoCls =
                          activoTxt === "Sí"
                            ? styles.badgeOk
                            : activoTxt === "No"
                            ? styles.badgeDanger
                            : activoTxt === "En proceso"
                            ? styles.badgeWarn
                            : styles.badgeMuted;

                        return (
                          <div key={idx} className={styles.linkedCard}>
                            <div className={styles.linkedRow}>
                              <span className={styles.linkedLabel}>Usuario</span>
                              <span className={styles.linkedValue}>{name}</span>
                            </div>

                            <div className={styles.linkedRow}>
                              <span className={styles.linkedLabel}>DNI</span>
                              <span className={`${styles.linkedValue} ${styles.mono}`}>{dni}</span>
                            </div>

                            <div className={styles.linkedRow}>
                              <span className={styles.linkedLabel}>Inicio</span>
                              <span className={`${styles.linkedValue} ${styles.mono}`}>{inicio}</span>
                            </div>

                            <div className={styles.linkedRow}>
                              <span className={styles.linkedLabel}>Periodo</span>
                              <span className={styles.linkedValue}>
                                <span className={`${styles.badge} ${periodoEnded ? styles.badgeMuted : styles.badgeOk}`}>
                                  {periodoTxt}
                                </span>
                              </span>
                            </div>

                            <div className={styles.linkedRow}>
                              <span className={styles.linkedLabel}>Activo en Engloba</span>
                              <span className={styles.linkedValue}>
                                <span className={`${styles.badge} ${activoCls}`}>{activoTxt}</span>
                              </span>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <p className={styles.empty}>Sin resultados</p>
                    )}
                  </div>
                ),
              },
            ]}
            onSubmit={() => setLinkedUsers(null)}
            onClose={() => setLinkedUsers(null)}
          />
        )}
      </div>
    </div>
  );
};

export default OffersJobsPanelV2;
