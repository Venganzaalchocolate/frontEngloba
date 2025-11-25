import { useState, useMemo } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { auditInfoDevice, auditDocumentDispo } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaUserAlt,
  FaTimesCircle,
  FaClock,
} from "react-icons/fa";
import { RiBuilding2Line } from "react-icons/ri";
import { MdEmail, MdOutlinePhoneAndroid, MdLocationPin } from "react-icons/md";
import { FaNetworkWired } from "react-icons/fa";
import { AiFillFolderOpen } from "react-icons/ai";
import { TbFileTypeXml } from "react-icons/tb";

// 👇 Ajusta la ruta si tu GenericXLSExport está en otro sitio
import GenericXLSExport from "../globals/GenericXLSExport.jsx";

export default function DeviceInfoAuditPanel({ modal, charge, enumsData }) {
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedFieldsDocumentation, setSelectedFieldsDocumentation] =
    useState([]);
  const [results, setResults] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState(null);

  const [type, setType] = useState("doc"); // "info" | "doc"
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const pageSize = 30;

  // 🔹 Config para el modal de exportación
  const [exportConfig, setExportConfig] = useState(null);

  const FIELDS = [
    { value: "name", label: "Nombre" },
    { value: "email", label: "Correo" },
    { value: "phone", label: "Teléfono" },
    { value: "address", label: "Dirección" },
    { value: "responsible", label: "Responsables" },
    { value: "coordinators", label: "Coordinadores" },
    { value: "groupWorkspace", label: "Workspace" },
    { value: "program", label: "Programa asociado" },
  ];

  const DOCUMENTATION_OFICIAL =
    enumsData?.documentation?.filter((x) => x.model === "Dispositive") || [];

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

  // Índice rápido de dispositivos
  const dispositiveIndex = enumsData?.dispositiveIndex || {};

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
    setSelectedDevice(null);
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
    if (
      selectedFields.length === 0 &&
      selectedFieldsDocumentation.length === 0
    ) {
      return modal(
        "Campos requeridos",
        "Selecciona algún campo o documentación."
      );
    }

    charge(true);
    const token = getToken();
    let res = null;

    // === MODO INFO: usa paginación (back) ===
    if (isInfoMode && selectedFields.length > 0) {
      res = await auditInfoDevice(
        { fields: selectedFields, page: newPage, limit: pageSize },
        token
      );

      if (res?.error) {
        modal("Error", res.message || "Error en auditoría de dispositivos");
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

    // === MODO DOC: auditDocumentDispo devuelve { missing, expired } (todo sin paginación) ===
    if (isDocMode && selectedFieldsDocumentation.length > 0) {
      res = await auditDocumentDispo(
        { docs: selectedFieldsDocumentation },
        token
      );

      if (res?.error) {
        modal(
          "Error",
          res.message || "Error en auditoría de documentación de dispositivos"
        );
        charge(false);
        return;
      }

      const { missing = [], expired = [] } = res;

      // Agrupamos por dispositivo
      const devicesMap = new Map();

      const ensureDevice = (dispositiveId) => {
        const idStr = dispositiveId.toString();
        if (!devicesMap.has(idStr)) {
          const base = dispositiveIndex[idStr] || {};
          devicesMap.set(idStr, {
            _id: idStr,
            name: base.name || idStr,
            program: base.program || null, // si tu enumsData.dispositiveIndex ya trae program
            documentationStatus: [],
          });
        }
        return devicesMap.get(idStr);
      };

      // Missing
      for (const m of missing) {
        const device = ensureDevice(m.dispositiveId);
        const doc = documentationIndex[m.documentationId?.toString()] || {};
        device.documentationStatus.push({
          state: "missing",
          documentationId: m.documentationId,
          name: doc.name || m.documentationId?.toString(),
        });
      }

      // Expired
      for (const e of expired) {
        const device = ensureDevice(e.dispositiveId);
        const doc = documentationIndex[e.documentationId?.toString()] || {};
        device.documentationStatus.push({
          state: "expired",
          documentationId: e.documentationId,
          name: doc.name || e.documentationId?.toString(),
          lastFileDate: e.lastFileDate,
          durationDays: e.durationDays,
          daysPassed: e.daysPassed,
        });
      }

      const devicesArray = Array.from(devicesMap.values());

      // 🔹 PAGINACIÓN EN EL FRONT PARA DOCUMENTACIÓN
      const total = devicesArray.length;
      setResults(devicesArray);
      setTotalResults(total);
      setTotalPages(total > 0 ? Math.ceil(total / pageSize) : 1);
      setPage(1);
      setHasSearched(true);
      charge(false);
      return;
    }

    charge(false);
  };

  // 🔹 PAGINACIÓN UNIFICADA (INFO: back / DOC: front)
  const changePage = (p) => {
    if (p < 1 || p > totalPages) return;

    if (isInfoMode) {
      setPage(p);
      runAudit(p); // vuelve a pedir al back
    } else {
      // doc → solo cambiar página, los datos ya están en results
      setPage(p);
    }
  };

  const selectDevice = (id) =>
    setSelectedDevice((prev) => (prev === id ? null : id));

  const getDocGroups = (device) => {
    const status = device.documentationStatus || [];
    return {
      missing: status.filter((d) => d.state === "missing"),
      expired: status.filter((d) => d.state === "expired"),
    };
  };

  // 🔹 Resultados visibles según página (para doc se hace slice en front)
  const visibleResults =
    totalResults > pageSize
      ? results.slice((page - 1) * pageSize, page * pageSize)
      : results;

  /* =========================================================
     CONFIGURACIÓN DE CAMPOS PARA EXPORTAR A EXCEL
     (distinta para INFO y DOC, pero usando GenericXLSExport)
  ========================================================= */

  // Campos para export INFO (dispositivos con datos generales)
  const deviceInfoExportFields = [
    {
      key: "name",
      label: "Nombre dispositivo",
      type: "text",
    },
    {
      key: "programName",
      label: "Programa",
      type: "text",
      transform: (value, row) => row.program?.name || "",
    },
    {
      key: "email",
      label: "Correo",
      type: "text",
    },
    {
      key: "phone",
      label: "Teléfono",
      type: "text",
    },
    {
      key: "address",
      label: "Dirección",
      type: "text",
    },
    {
      key: "groupWorkspace",
      label: "Workspace (grupo)",
      type: "boolean",
    },
    {
      key: "responsible",
      label: "Responsables",
      type: "text",
      transform: (value, row) =>
        (value || [])
          .map((r) => `${r.firstName || ""} ${r.lastName || ""}`.trim())
          .filter(Boolean)
          .join(" | "),
    },
    {
      key: "coordinators",
      label: "Coordinadores",
      type: "text",
      transform: (value, row) =>
        (value || [])
          .map((c) => `${c.firstName || ""} ${c.lastName || ""}`.trim())
          .filter(Boolean)
          .join(" | "),
    },
  ];

  // Campos para export DOC (dispositivos + resumen de documentación)
  const deviceDocExportFields = [
    {
      key: "name",
      label: "Nombre dispositivo",
      type: "text",
    },
    {
      key: "program",
      label: "Programa",
      type: "text",
      transform: (value, row) => row.program?.name || "",
    },
    {
      key: "docs_missing",
      label: "Documentos faltantes",
      type: "text",
      transform: (value, row) => {
        const status = row.documentationStatus || [];
        const missing = status.filter((d) => d.state === "missing");
        if (!missing.length) return "";
        return missing.map((d) => d.name).join(" | ");
      },
    },
    {
      key: "docs_expired",
      label: "Documentos caducados",
      type: "text",
      transform: (value, row) => {
        const status = row.documentationStatus || [];
        const expired = status.filter((d) => d.state === "expired");
        if (!expired.length) return "";
        return expired
          .map((d) =>
            typeof d.daysPassed === "number"
              ? `${d.name} (hace ${d.daysPassed} días)`
              : d.name
          )
          .join(" | ");
      },
    },
  ];

  /* =========================================================
     HANDLERS DE EXPORTACIÓN
     - INFO: re-llama al back para todas las páginas
     - DOC: usa todos los results en memoria
     El Excel SIEMPRE contiene todos los registros, sin paginar.
  ========================================================= */

  const handleExportClick = async () => {
    if (!hasSearched || results.length === 0) {
      modal(
        "Sin datos",
        "Primero ejecuta la auditoría para tener resultados que exportar."
      );
      return;
    }

    // MODO INFO → re-fetch de todas las páginas para tener TODOS los dispositivos con error
    if (isInfoMode) {
      if (!selectedFields.length) {
        modal(
          "Sin campos",
          "Selecciona primero los campos a auditar antes de exportar."
        );
        return;
      }

      try {
        charge(true);
        const token = getToken();

        let allResults = [];
        // Si ya sabemos que hay más de una página, iteramos; si no, usamos los actuales.
        if (totalPages > 1) {
          for (let p = 1; p <= totalPages; p++) {
            const res = await auditInfoDevice(
              { fields: selectedFields, page: p, limit: pageSize },
              token
            );
            if (res?.error) {
              throw new Error(
                res.message || "Error al obtener datos para exportar."
              );
            }
            allResults = allResults.concat(res.results || []);
          }
        } else {
          // Solo una página → los results actuales ya son todos
          allResults = results.slice();
        }

        setExportConfig({
          data: allResults,
          fields: deviceInfoExportFields,
          fileName: "auditoria_dispositivos_info.xlsx",
          modalTitle: "Exportar auditoría de dispositivos",
          modalMessage: "Selecciona las columnas que quieres incluir en el Excel:",
        });
      } catch (err) {
        console.error(err);
        modal(
          "Error",
          err.message || "Error al preparar los datos para Excel."
        );
      } finally {
        charge(false);
      }
      return;
    }

    // MODO DOC → ya tenemos todos los dispositivos con errores en `results`
    if (isDocMode) {
      setExportConfig({
        data: results, // TODOS los dispositivos con errores, sin paginar
        fields: deviceDocExportFields,
        fileName: "auditoria_dispositivos_documentacion.xlsx",
        modalTitle: "Exportar documentación de dispositivos",
        modalMessage: "Selecciona las columnas que quieres incluir en el Excel:",
      });
    }
  };

  return (
    <div className={styles.panel}>
      <h3>
        Auditoría de Dispositivos{" "}
        <div>
                   <button onClick={() => runAudit(1)} className={styles.runButton}>
                  Ejecutar auditoría
                </button>

        {hasSearched && results.length > 0 && (
          <button
            type="button"
            className={styles.runButton}
            style={{ marginLeft: "1rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
            onClick={handleExportClick}
          >
            <TbFileTypeXml />
            Exportar a Excel
          </button>
        )}       
        </div>

      </h3>

      <h4>Selecciona campos a auditar</h4>
      <div className={styles.buttonSelection}>
        <button
          onClick={() => resetStateForModeChange("info")}
          style={
            isInfoMode
              ? { opacity: 1, fontWeight: 600 }
              : { opacity: 0.6, fontWeight: 400 }
          }
        >
          Información
        </button>
        <button
          onClick={() => resetStateForModeChange("doc")}
          style={
            isDocMode
              ? { opacity: 1, fontWeight: 600 }
              : { opacity: 0.6, fontWeight: 400 }
          }
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
        </div>
      )}

      <div className={styles.results}>
        {/* Paginación (INFO: back, DOC: front) */}
        {totalResults > pageSize && (
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

        {hasSearched && visibleResults.length === 0 && (
          <p>No se encontraron dispositivos.</p>
        )}

        {visibleResults.map((d) => {
          const expanded = selectedDevice === d._id;
          const { missing, expired } = isDocMode
            ? getDocGroups(d)
            : { missing: [], expired: [] };

          return (
            <div key={d._id} className={styles.resultCard}>
              {/* HEADER */}
              <div className={styles.resultH}>
                <h4>
                  <RiBuilding2Line /> {d.name}
                </h4>

                {expanded ? (
                  <FaAngleDoubleUp onClick={() => selectDevice(d._id)} />
                ) : (
                  <FaAngleDoubleDown onClick={() => selectDevice(d._id)} />
                )}
              </div>

              {/* CONTENIDO */}
              <div
                className={
                  expanded ? styles.expandContent : styles.collapseContent
                }
              >
                {isInfoMode && (
                  <>
                    {/* BLOQUE AZUL (infoUser) */}
                    <div className={styles.infoUser}>
                      <p>
                        <AiFillFolderOpen /> Programa:{" "}
                        {d.program?.name || "No disponible"}
                      </p>
                      <p>
                        <MdEmail /> {d.email || "No disponible"}
                      </p>
                      <p>
                        <MdOutlinePhoneAndroid /> {d.phone || "No disponible"}
                      </p>
                      <p>
                        <MdLocationPin /> {d.address || "No disponible"}
                      </p>
                      <p>
                        <FaNetworkWired /> Email de grupo:{" "}
                        {!!d.groupWorkspace ? "Sí" : "No disponible"}
                      </p>
                    </div>

                    {/* RESPONSABLES */}
                    {Array.isArray(d.responsible) &&
                    d.responsible.length > 0 ? (
                      <div className={styles.boxDispositive}>
                        <h4>RESPONSABLES DE DISPOSITIVO</h4>
                        <ul>
                          {d.responsible.map((r) => (
                            <li key={r._id}>
                              <FaUserAlt /> {r.firstName} {r.lastName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p>No tiene responsables</p>
                    )}

                    {/* COORDINADORES */}
                    {Array.isArray(d.coordinators) &&
                    d.coordinators.length > 0 ? (
                      <div className={styles.boxDispositive}>
                        <h4>COORDINADORES DE DISPOSITIVO</h4>
                        <ul>
                          {d.coordinators.map((c) => (
                            <li key={c._id}>
                              <FaUserAlt /> {c.firstName} {c.lastName}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p>No tiene coordinadores</p>
                    )}
                  </>
                )}

                {isDocMode && (
                  <div className={styles.boxDispositive}>
                    <h4>DOCUMENTACIÓN</h4>

                    {/* FALTANTE */}
                    <p>DOCUMENTACIÓN FALTANTE</p>
                    <ul>
                      {missing.length === 0 ? (
                        <li>— Ningún documento faltante</li>
                      ) : (
                        missing.map((doc, idx) => (
                          <li key={`${doc.documentationId}-${idx}`}>
                            <FaTimesCircle style={{ color: "#d9534f" }} />{" "}
                            {doc.name}
                          </li>
                        ))
                      )}
                    </ul>

                    {/* CADUCADA */}
                    <p>DOCUMENTACIÓN CADUCADA</p>
                    <ul>
                      {expired.length === 0 ? (
                        <li>— Ningún documento caducado</li>
                      ) : (
                        expired.map((doc, idx) => (
                          <li key={`${doc.documentationId}-${idx}`}>
                            <FaClock style={{ color: "#f0ad4e" }} /> {doc.name}{" "}
                            {doc.daysPassed > 0
                              ? `(caducó hace ${doc.daysPassed} días)`
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

      {/* MODAL DE EXPORTACIÓN GENÉRICO */}
      {exportConfig && (
        <GenericXLSExport
          data={exportConfig.data}
          fields={exportConfig.fields}
          fileName={exportConfig.fileName}
          modalTitle={exportConfig.modalTitle}
          modalMessage={exportConfig.modalMessage}
          onClose={() => setExportConfig(null)}
        />
      )}
    </div>
  );
}
