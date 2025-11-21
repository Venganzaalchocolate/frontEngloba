import { useState, useMemo } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { auditInfoProgram, auditDocumentProgram } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaFolderOpen,
  FaUserAlt,
  FaClock,
  FaTimesCircle,
} from "react-icons/fa";
import { RiBuilding2Line } from "react-icons/ri";

export default function ProgramInfoAuditPanel({ modal, charge, enumsData }) {
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedFieldsDocumentation, setSelectedFieldsDocumentation] = useState([]);
  const [results, setResults] = useState([]);
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [type, setType] = useState("doc"); // "info" | "doc"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const pageSize = 30;

  const FIELDS = [
    { value: "name", label: "Nombre" },
    { value: "acronym", label: "Acrónimo" },
    { value: "responsible", label: "Responsables" },
    { value: "finantial", label: "Financiación" },
    { value: "groupWorkspace", label: "Workspace" },
    { value: "area", label: "Categoría / Área" },
    { value: "about.description", label: "Descripción" },
    { value: "about.objectives", label: "Objetivos" },
    { value: "about.profile", label: "Perfil de participantes" },
  ];

  const DOCUMENTATION_OFICIAL =
    enumsData?.documentation?.filter((x) => x.model === "Program") || [];

  const FIELDS_DOCUMENTATION = DOCUMENTATION_OFICIAL.map((x) => ({
    value: x._id,
    label: x.name,
  }));

  // Índice rápido por id de documentación
  const documentationIndex = useMemo(() => {
    const idx = {};
    for (const doc of DOCUMENTATION_OFICIAL) {
      idx[doc._id?.toString()] = doc;
    }
    return idx;
  }, [DOCUMENTATION_OFICIAL]);

  // Índice rápido de programas (para nombre / siglas)
  const programsIndex = enumsData?.programsIndex || {};

  const isInfoMode = type === "info";
  const isDocMode = type === "doc";

  const resetStateForModeChange = (newType) => {
    setType(newType);
    setSelectedFields([]);
    setSelectedFieldsDocumentation([]);
    setResults([]);
    setPage(1);
    setTotalPages(1);
    setTotalResults(0);
    setSelectedProgram(null);
    setHasSearched(false);
  };

  const toggle = (f) => {
    setSelectedFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
    setSelectedFieldsDocumentation([]);
  };

  const toggleDocumentation = (f) => {
    setSelectedFieldsDocumentation((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
    setSelectedFields([]);
  };

  const runAudit = async (newPage = page) => {
    if (selectedFields.length === 0 && selectedFieldsDocumentation.length === 0) {
      return modal("Campos requeridos", "Selecciona algún campo o documentación.");
    }

    charge(true);
    const token = getToken();
    let res = null;

    // === MODO INFO: usa paginación como antes ===
    if (isInfoMode && selectedFields.length > 0) {
      res = await auditInfoProgram(
        { fields: selectedFields, page: newPage, limit: pageSize },
        token
      );

      if (res?.error) {
        modal("Error", res.message || "Error en auditoría de programas");
        charge(false);
        return;
      }

      setResults(res.results || []);
      setTotalPages(res.totalPages || 1);
      setTotalResults(res.totalResults || 0);
      setPage(res.page || 1);
      setHasSearched(true);
      charge(false);
      return;
    }

    // === MODO DOC: auditDocumentProgram devuelve { missing, expired } ===
    if (isDocMode && selectedFieldsDocumentation.length > 0) {
      res = await auditDocumentProgram(
        { docs: selectedFieldsDocumentation },
        token
      );

      if (res?.error) {
        modal("Error", res.message || "Error en auditoría de documentación de programas");
        charge(false);
        return;
      }

      const { missing = [], expired = [] } = res;

      // Agrupamos por programa
      const programsMap = new Map();

      const ensureProgram = (programId) => {
        const idStr = programId.toString();
        if (!programsMap.has(idStr)) {
          const base = programsIndex[idStr] || {};
          programsMap.set(idStr, {
            _id: idStr,
            acronym: base.acronym || base.name || idStr,
            name: base.name || base.acronym || idStr,
            documentationStatus: [],
          });
        }
        return programsMap.get(idStr);
      };

      // Missing
      for (const m of missing) {
        const program = ensureProgram(m.programId);
        const doc = documentationIndex[m.documentationId?.toString()] || {};
        program.documentationStatus.push({
          state: "missing",
          documentationId: m.documentationId,
          name: doc.name || m.documentationId?.toString(),
        });
      }

      // Expired
      for (const e of expired) {
        const program = ensureProgram(e.programId);
        const doc = documentationIndex[e.documentationId?.toString()] || {};
        program.documentationStatus.push({
          state: "expired",
          documentationId: e.documentationId,
          name: doc.name || e.documentationId?.toString(),
          lastFileDate: e.lastFileDate,
          durationDays: e.durationDays,
          daysPassed: e.daysPassed,
        });
      }

      const programsArray = Array.from(programsMap.values());

      setResults(programsArray);
      setTotalResults(programsArray.length);
      setTotalPages(1);
      setPage(1);
      setHasSearched(true);
      charge(false);
      return;
    }

    charge(false);
  };

  const changePage = (p) => {
    if (!isInfoMode) return; // la paginación solo tiene sentido en modo info
    if (p < 1 || p > totalPages) return;
    setPage(p);
    runAudit(p);
  };

  const selectProgram = (id) =>
    setSelectedProgram((prev) => (prev === id ? null : id));

  const getDocGroups = (program) => {
    const status = program.documentationStatus || [];
    return {
      missing: status.filter((d) => d.state === "missing"),
      expired: status.filter((d) => d.state === "expired"),
      ok: status.filter((d) => d.state === "ok"), // por si en un futuro lo usas
    };
  };

  return (
    <div className={styles.panel}>
      <h3>Auditoría de Programas</h3>

      <h4>Selecciona campos a auditar</h4>
      <div className={styles.buttonSelection}>
        <button
          onClick={() => resetStateForModeChange("info")}
          style={isInfoMode ? { opacity: 1, fontWeight: 600 } : { opacity: 0.6, fontWeight: 400 }}
        >
          Información
        </button>
        <button
          onClick={() => resetStateForModeChange("doc")}
          style={isDocMode ? { opacity: 1, fontWeight: 600 } : { opacity: 0.6, fontWeight: 400 }}
        >
          Documentación
        </button>
      </div>

      {isInfoMode && (
        <div>
          <h4>INFORMACIÓN</h4>
          <div className={styles.fieldSelector}>
            {FIELDS.map((f) => (
              <div key={f.value}>
                <input
                  type="checkbox"
                  checked={selectedFields.includes(f.value)}
                  onChange={() => toggle(f.value)}
                />
                <label className={styles.checkboxOption}>{f.label}</label>
              </div>
            ))}
          </div>
          <button className={styles.runButton} onClick={() => runAudit(1)}>
            Ejecutar auditoría
          </button>
        </div>
      )}

      {isDocMode && (
        <div>
          <h4>DOCUMENTACIÓN</h4>
          <div className={styles.fieldSelector}>
            {FIELDS_DOCUMENTATION.map((f) => (
              <div key={f.value}>
                <input
                  type="checkbox"
                  checked={selectedFieldsDocumentation.includes(f.value)}
                  onChange={() => toggleDocumentation(f.value)}
                />
                <label className={styles.checkboxOption}>{f.label}</label>
              </div>
            ))}
          </div>
          <button className={styles.runButton} onClick={() => runAudit(1)}>
            Ejecutar auditoría
          </button>
        </div>
      )}

      <div className={styles.results}>
        {/* Paginación solo en modo INFO */}
        {isInfoMode && totalResults > pageSize && (
          <div className={styles.pagination}>
            <FaRegArrowAltCircleLeft
              className={page === 1 ? styles.disabled : ""}
              onClick={() => changePage(page - 1)}
            />
            <span>
              Página {page} de {totalPages} — {totalResults} resultados
            </span>
            <FaRegArrowAltCircleRight
              className={page === totalPages ? styles.disabled : ""}
              onClick={() => changePage(page + 1)}
            />
          </div>
        )}

        {hasSearched && results.length === 0 && (
          <p>No se encontraron programas.</p>
        )}

        {results.map((p) => {
          const expanded = selectedProgram === p._id;
          const { missing, expired } = isDocMode ? getDocGroups(p) : { missing: [], expired: [] };

          return (
            <div key={p._id} className={styles.resultCard}>
              <div className={styles.resultH}>
                <h4>
                  <RiBuilding2Line /> {p.acronym || p.name}
                </h4>
                {expanded ? (
                  <FaAngleDoubleUp onClick={() => selectProgram(p._id)} />
                ) : (
                  <FaAngleDoubleDown onClick={() => selectProgram(p._id)} />
                )}
              </div>

              <div className={expanded ? styles.expandContent : styles.collapseContent}>
                {isInfoMode && (
                  <>
                    <div className={styles.infoUser}>
                      <p>
                        <FaFolderOpen /> Nombre Completo: {p.name || "—"}
                      </p>
                      <p>{p?.area?.toUpperCase() || "No disponible"}</p>
                      <p>Email de grupo: {!!p.groupWorkspace ? "Sí" : "No"}</p>
                      <p>Descripción: {!!p.about?.description ? "Sí" : "No"}</p>
                      <p>Objetivos: {!!p.about?.objectives ? "Sí" : "No"}</p>
                      <p>Perfil de usuarios: {!!p.about?.profile ? "Sí" : "No"}</p>
                      <p>Financiación: {p.finantial?.length > 0 ? "Sí" : "No"}</p>
                    </div>

                    {p.responsible?.length > 0 ? (
                      <div className={styles.boxDispositive}>
                        <h4>RESPONSABLES</h4>
                        <ul>
                          {p.responsible.map((r) => (
                            <li key={r._id}>
                              <FaUserAlt /> {r.firstName} {r.lastName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p>No tiene responsables</p>
                    )}
                  </>
                )}

                {isDocMode && (
                  <div className={styles.boxDispositive}>
                    <h4>DOCUMENTACIÓN</h4>

                    <p>DOCUMENTACIÓN FALTANTE</p>
                    <ul>
                      {missing.length === 0 ? (
                        <li>— Ningún documento faltante</li>
                      ) : (
                        missing.map((d, idx) => (
                          <li key={`${d.documentationId}-${idx}`}>
                            <FaTimesCircle style={{ color: "#d9534f" }} /> {d.name}
                          </li>
                        ))
                      )}
                    </ul>

                    <p>DOCUMENTACIÓN CADUCADA</p>
                    <ul>
                      {expired.length === 0 ? (
                        <li>— Ningún documento caducado</li>
                      ) : (
                        expired.map((d, idx) => (
                          <li key={`${d.documentationId}-${idx}`}>
                            <FaClock style={{ color: "#f0ad4e" }} /> {d.name}{" "}
                            {d.daysPassed > 0
                              ? `(caducó hace ${d.daysPassed} días)`
                              : "(caducado)"}
                          </li>
                        ))
                      )}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
