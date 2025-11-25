import { useState, useMemo } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { auditInfoUser, auditDocumentUser } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

import {
  FaAddressCard,
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaBirthdayCake,
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaUserAlt,
} from "react-icons/fa";
import { RiBuilding2Line } from "react-icons/ri";
import { FaFolderOpen } from "react-icons/fa";
import { MdEmail, MdOutlinePhoneAndroid } from "react-icons/md";
import { FaVestPatches } from "react-icons/fa6";
import { BsBank2 } from "react-icons/bs";
import { GiHealthNormal } from "react-icons/gi";
import { MdContactPhone } from "react-icons/md";
import { TbFileTypeXml } from "react-icons/tb";

import { formatDate } from "../../lib/utils";
import GenericXLSExport from "../globals/GenericXLSExport.jsx";

export default function UserInfoAuditPanel({ enumsData, modal, charge }) {
  const [mode, setMode] = useState("info"); // "info" | "doc"

  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedDocs, setSelectedDocs] = useState([]);

  const [apafa, setApafa] = useState("no");
  const [employment, setEmployment] = useState("activos");

  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const [exportConfig, setExportConfig] = useState(null);

  const pageSize = 30;

  /* ==============================
     CAMPOS INFO
  ============================== */
  const FIELDS = [
    { value: "dni", label: "DNI" },
    { value: "email", label: "Email" },
    { value: "phone", label: "Teléfono Personal" },
    { value: "phoneJob", label: "Teléfono Laboral" },
    { value: "bankAccountNumber", label: "Cuenta bancaria" },
    { value: "socialSecurityNumber", label: "Seguridad Social" },
    { value: "studies", label: "Estudios" },
    { value: "birthday", label: "Fecha de Nacimiento" },
  ];

  /* ==============================
     DOCUMENTACIÓN USUARIO
  ============================== */
  const DOCS_OFICIAL =
    enumsData?.documentation?.filter((d) => d.model === "User") || [];

  const DOC_OPTIONS = DOCS_OFICIAL.map((d) => ({
    value: d._id,
    label: d.name,
  }));

  const documentationIndex = useMemo(() => {
    const map = {};
    for (const d of DOCS_OFICIAL) {
      map[d._id.toString()] = d;
    }
    return map;
  }, [DOCS_OFICIAL]);

  /* =========================================================
     CAMPOS EXPORT EXCEL – INFO
  ========================================================= */
  const userInfoExportFields = [
    {
      key: "fullName",
      label: "Nombre completo",
      type: "text",
      transform: (value, row) =>
        `${row.firstName || ""} ${row.lastName || ""}`.trim(),
    },
    {
      key: "dni",
      label: "DNI/NIE",
      type: "text",
    },
    {
      key: "email",
      label: "Email",
      type: "text",
    },
    {
      key: "phone",
      label: "Teléfono personal",
      type: "text",
    },
    {
      key: "phoneJob",
      label: "Teléfono laboral",
      type: "text",
      transform: (value, row) => row.phoneJob?.number || "",
    },
    {
      key: "birthday",
      label: "Fecha de nacimiento",
      type: "text",
      transform: (value, row) =>
        row.birthday ? formatDate(row.birthday) : "",
    },
    {
      key: "bankAccountNumber",
      label: "Cuenta bancaria",
      type: "text",
    },
    {
      key: "socialSecurityNumber",
      label: "Seguridad social",
      type: "text",
    },
    {
      key: "studies",
      label: "Estudios",
      type: "text",
      transform: (value, row) => {
        const studies = row.studies;
        if (!studies) return "";
        const asArray = Array.isArray(studies) ? studies : [studies];
        return asArray
          .map((id) => enumsData?.studiesIndex?.[id]?.name || id)
          .join(" | ");
      },
    },
  ];

  /* =========================================================
     CAMPOS EXPORT EXCEL – DOCUMENTACIÓN
  ========================================================= */
  const userDocExportFields = [
    {
      key: "fullName",
      label: "Nombre completo",
      type: "text",
      transform: (value, row) =>
        `${row.firstName || ""} ${row.lastName || ""}`.trim(),
    },
    {
      key: "dni",
      label: "DNI/NIE",
      type: "text",
    },
    {
      key: "email",
      label: "Email",
      type: "text",
    },
    {
      key: "docs_missing",
      label: "Documentos faltantes",
      type: "text",
      transform: (value, row) => {
        const missing = row.missingDocs || [];
        if (!missing.length) return "";
        return missing
          .map((d) => {
            const doc =
              documentationIndex[d.documentationId?.toString()] || {};
            return (
              doc.name ||
              d.documentationName ||
              d.documentationId?.toString()
            );
          })
          .join(" | ");
      },
    },
    {
      key: "docs_expired",
      label: "Documentos caducados",
      type: "text",
      transform: (value, row) => {
        const expired = row.expiredDocs || [];
        if (!expired.length) return "";
        return expired
          .map((d) => {
            const doc =
              documentationIndex[d.documentationId?.toString()] || {};
            const baseName =
              doc.name ||
              d.documentationName ||
              d.documentationId?.toString();
            if (typeof d.daysPassed === "number") {
              return `${baseName} (caducó hace ${d.daysPassed} días)`;
            }
            return `${baseName} (caducado)`;
          })
          .join(" | ");
      },
    },
  ];

  /* ==============================
     HANDLERS
  ============================== */
  const toggleField = (val) => {
    setSelectedFields((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  };

  const toggleDoc = (val) => {
    setSelectedDocs((prev) =>
      prev.includes(val) ? prev.filter((x) => x !== val) : [...prev, val]
    );
  };

  const resetMode = (newMode) => {
    setMode(newMode);
    setSelectedFields([]);
    setSelectedDocs([]);
    setResults([]);
    setPage(1);
    setTotalPages(1);
    setTotalResults(0);
    setSelectedUser(null);
    setHasSearched(false);
    setExportConfig(null);
  };

  const selectUser = (id) => {
    setSelectedUser((prev) => (prev === id ? null : id));
  };

  /* ==============================
     RENDER CURRENT HIRING (igual que tenías)
  ============================== */
  const renderCurrentHiring = (u) => {
    if (!Array.isArray(u.currentHiring) || u.currentHiring.length === 0) {
      return <p>Sin periodo activo</p>;
    }

    return u.currentHiring.map((x, idx) => (
      <div key={x._id || idx} className={styles.boxDispositive}>
        <p>
          <FaFolderOpen /> {x.programName || ""}
        </p>

        {/* Responsables del Programa */}
        {Array.isArray(x.programResponsibles) &&
        x.programResponsibles.length > 0 ? (
          <div className={styles.boxNameRC}>
            <p>RESPONSABLES DE PROGRAMA</p>
            <ul>
              {x.programResponsibles.map((y, i) => (
                <li key={y._id || i}>
                  <FaUserAlt /> {y.name}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No tiene responsable</p>
        )}

        <p className={styles.textNameDispositive}>
          <RiBuilding2Line /> {x.deviceName || ""}
        </p>

        <p>
          <FaVestPatches />{" "}
          {enumsData?.jobsIndex?.[x.position]?.name || ""}
        </p>

        {/* Responsables del dispositivo */}
        {Array.isArray(x.responsibles) && x.responsibles.length > 0 ? (
          <div className={styles.boxNameRC}>
            <p>RESPONSABLES DE DISPOSITIVO</p>
            <ul>
              {x.responsibles.map((y, i) => (
                <li key={y._id || i}>{y.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No tiene responsable</p>
        )}

        {/* Coordinadores */}
        {Array.isArray(x.coordinators) && x.coordinators.length > 0 ? (
          <div className={styles.boxNameRC}>
            <p>COORDINADORES DE DISPOSITIVO</p>
            <ul>
              {x.coordinators.map((y, i) => (
                <li key={y._id || i}>{y.name}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p>No tiene responsable</p>
        )}
      </div>
    ));
  };

  /* ==============================
     AUDITORÍA INFO (auditInfoUser)
     — paginación en backend
  ============================== */
  const runAuditInfo = async (newPage = page) => {
    if (selectedFields.length === 0) {
      modal("Sin valores", "Debe seleccionar una o varias casillas.");
      return;
    }

    charge(true);
    const token = getToken();

    const payload = {
      fields: selectedFields,
      apafa,
      employmentStatus: employment,
      page: newPage,
      limit: pageSize,
    };

    const res = await auditInfoUser(payload, token);

    if (res?.error) {
      modal("Error", res.message || "No se pudo obtener la auditoría");
      charge(false);
      return;
    }

    setResults(res.results || []);
    setTotalPages(res.totalPages || 1);
    setTotalResults(res.totalResults || 0);
    setPage(res.page || 1);
    setHasSearched(true);

    charge(false);
  };

  /* ==============================
     AUDITORÍA DOCS (auditDocumentUser)
     — SIN paginación en back (front slice)
  ============================== */
  const runAuditDocs = async () => {
    if (selectedDocs.length === 0) {
      modal("Sin documentos", "Debe seleccionar al menos un documento.");
      return;
    }

    charge(true);
    const token = getToken();

    const payload = {
      docs: selectedDocs,
      employment,
      apafa,
      // tracking si lo añades también
    };

    const res = await auditDocumentUser(payload, token);

    if (res?.error) {
      modal("Error", res.message || "Error en auditoría de documentación");
      charge(false);
      return;
    }

    const allUsers = res.users || [];
    const total = res.totalUsersWithErrors || allUsers.length;

    setResults(allUsers);
    setTotalResults(total);
    setTotalPages(total > 0 ? Math.ceil(total / pageSize) : 1);
    setPage(1);
    setHasSearched(true);

    charge(false);
  };

  /* ==============================
     EXPORTAR A EXCEL
  ============================== */
  const handleExportClick = async () => {
    if (!hasSearched || results.length === 0) {
      modal(
        "Sin datos",
        "Primero ejecuta la auditoría para tener resultados que exportar."
      );
      return;
    }

    // MODO INFO → re-fetch todas las páginas
    if (mode === "info") {
      if (!selectedFields.length) {
        modal(
          "Sin valores",
          "Selecciona primero los campos a auditar antes de exportar."
        );
        return;
      }

      try {
        charge(true);
        const token = getToken();

        let allResults = [];

        if (totalPages > 1) {
          for (let p = 1; p <= totalPages; p++) {
            const res = await auditInfoUser(
              {
                fields: selectedFields,
                apafa,
                employmentStatus: employment,
                page: p,
                limit: pageSize,
              },
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
          // Solo una página → usamos lo que ya tenemos
          allResults = results.slice();
        }

        setExportConfig({
          data: allResults,
          fields: userInfoExportFields,
          fileName: "auditoria_empleados_info.xlsx",
          modalTitle: "Exportar auditoría de empleados (información)",
          modalMessage:
            "Selecciona las columnas que quieres incluir en el Excel:",
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

    // MODO DOC → usamos directamente todos los resultados ya en memoria
    if (mode === "doc") {
      if (!selectedDocs.length) {
        modal(
          "Sin documentos",
          "Selecciona primero la documentación a auditar antes de exportar."
        );
        return;
      }

      setExportConfig({
        data: results,
        fields: userDocExportFields,
        fileName: "auditoria_empleados_documentacion.xlsx",
        modalTitle: "Exportar documentación de empleados",
        modalMessage:
          "Selecciona las columnas que quieres incluir en el Excel:",
      });
    }
  };

  /* ==============================
     PAGINACIÓN
     - INFO: llama al back
     - DOC: front-slice
  ============================== */
  const changePage = (p) => {
    if (p < 1 || p > totalPages) return;

    if (mode === "info") {
      setPage(p);
      runAuditInfo(p);
    } else {
      setPage(p); // doc → datos ya en memoria
    }
  };

  // Resultados visibles según página y modo
  const visibleResults =
    mode === "doc" && totalResults > pageSize
      ? results.slice((page - 1) * pageSize, page * pageSize)
      : results;

  return (
    <div className={styles.panel}>
      <h3>
        Auditoría de empleados
        <div>
          <button
            onClick={mode === "info" ? () => runAuditInfo(1) : runAuditDocs}
            className={styles.runButton}
          >
            Ejecutar auditoría
          </button>

          {hasSearched && results.length > 0 && (
            <button
              type="button"
              className={styles.runButton}
              style={{
                marginLeft: "1rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
              onClick={handleExportClick}
            >
              <TbFileTypeXml />
              Exportar a Excel
            </button>
          )}
        </div>
      </h3>

      {/* Selector de modo */}
      <div className={styles.buttonSelection}>
        <button
          onClick={() => resetMode("info")}
          style={
            mode === "info"
              ? { opacity: 1, fontWeight: 600 }
              : { opacity: 0.6, fontWeight: 400 }
          }
        >
          Información
        </button>
        <button
          onClick={() => resetMode("doc")}
          style={
            mode === "doc"
              ? { opacity: 1, fontWeight: 600 }
              : { opacity: 0.6, fontWeight: 400 }
          }
        >
          Documentación
        </button>
      </div>

      {/* ================= MODO INFO ================= */}
      {mode === "info" && (
        <>
          <h4>Selecciona campos que sea auditar</h4>
          <div className={styles.fieldSelector}>
            {FIELDS.map((f) => (
              <div key={f.value}>
                <input
                  type="checkbox"
                  checked={selectedFields.includes(f.value)}
                  onChange={() => toggleField(f.value)}
                />
                <label className={styles.checkboxOption}>{f.label}</label>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ================= MODO DOC ================= */}
      {mode === "doc" && (
        <>
          <h4>Selecciona documentación a auditar</h4>
          <div className={styles.fieldSelector}>
            {DOC_OPTIONS.map((d) => (
              <div key={d.value}>
                <input
                  type="checkbox"
                  checked={selectedDocs.includes(d.value)}
                  onChange={() => toggleDoc(d.value)}
                />
                <label className={styles.checkboxOption}>{d.label}</label>
              </div>
            ))}
          </div>
        </>
      )}

      {/* Controles comunes (apafa / estado laboral) */}
      <div className={styles.controls}>
        <div>
          <label>Usuarios:</label>
          <select value={apafa} onChange={(e) => setApafa(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="si">Solo APAFA</option>
            <option value="no">Solo Engloba</option>
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
      </div>

      {/* ================= RESULTADOS ================= */}
      <div className={styles.results}>
        {/* Paginación */}
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
          <p>No hay resultados.</p>
        )}

        {/* LISTA DE RESULTADOS */}
        {visibleResults.map((u) => (
          <div key={u._id} className={styles.resultCard}>
            <div className={styles.resultH}>
              <h4>
                {u.firstName} {u.lastName}
              </h4>
            {selectedUser === u._id ? (
              <FaAngleDoubleUp onClick={() => selectUser(u._id)} />
            ) : (
              <FaAngleDoubleDown onClick={() => selectUser(u._id)} />
            )}
            </div>

            <div
              className={
                selectedUser === u._id
                  ? styles.expandContent
                  : styles.collapseContent
              }
            >
              {/* DATOS BÁSICOS DE USUARIO */}
              <div className={styles.infoUser}>
                <p>
                  <FaAddressCard title="DNI/NIE" /> {u.dni || "—"}
                </p>
                <p>
                  <MdEmail title="Email" /> {u.email || "—"}
                </p>
                <p>
                  <MdContactPhone title="Teléfono Personal" />{" "}
                  {u.phone || "No disponible"}
                </p>
                <p>
                  <MdOutlinePhoneAndroid title="Teléfono Laboral" />{" "}
                  {u.phoneJob?.number || "No disponible"}
                </p>
                <p>
                  <FaBirthdayCake title="Fecha de nacimiento" />{" "}
                  {formatDate(u.birthday) || "No disponible"}
                </p>
                <p>
                  <BsBank2 title="Número de cuenta bancaria" />{" "}
                  {u.bankAccountNumber || "No disponible"}
                </p>
                <p>
                  <GiHealthNormal title="Número de la seguridad social" />{" "}
                  {u.socialSecurityNumber || "No disponible"}
                </p>
              </div>

              {/* PERÍODOS / DISPOSITIVO / RESPONSABLES */}
              {renderCurrentHiring(u)}

              {/* BLOQUE DE DOCUMENTACIÓN SOLO EN MODO DOC */}
              {mode === "doc" && (
                <div className={styles.boxDispositive}>
                  <h4>DOCUMENTACIÓN</h4>

                  <p>DOCUMENTACIÓN FALTANTE</p>
                  <ul>
                    {(u.missingDocs || []).length === 0 ? (
                      <li>— Ningún documento faltante</li>
                    ) : (
                      u.missingDocs.map((d, idx) => (
                        <li key={`${d.documentationId}-${idx}`}>
                          ❌{" "}
                          {documentationIndex[d.documentationId?.toString()]
                            ?.name || d.documentationName}
                        </li>
                      ))
                    )}
                  </ul>

                  <p>DOCUMENTACIÓN CADUCADA</p>
                  <ul>
                    {(u.expiredDocs || []).length === 0 ? (
                      <li>— Ningún documento caducado</li>
                    ) : (
                      u.expiredDocs.map((d, idx) => (
                        <li key={`${d.documentationId}-${idx}`}>
                          ⏳{" "}
                          {documentationIndex[d.documentationId?.toString()]
                            ?.name || d.documentationName}{" "}
                          {typeof d.daysPassed === "number"
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
        ))}
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
