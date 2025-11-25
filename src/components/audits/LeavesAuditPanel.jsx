import { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { auditActiveLeaves } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaBirthdayCake,
  FaFolderOpen,
  FaVestPatches,
} from "react-icons/fa";

import { RiBuilding2Line } from "react-icons/ri";
import {
  GiHealthNormal
} from "react-icons/gi";
import {
  MdContactPhone,
  MdEmail,
  MdOutlineUpdate,
  MdUpdateDisabled,
} from "react-icons/md";
import { FaUserInjured } from "react-icons/fa6";
import { TbFileTypeXml } from "react-icons/tb";

// 👇 Ajusta la ruta si tu GenericXLSExport está en otro sitio
import GenericXLSExport from "../globals/GenericXLSExport.jsx";

import { formatDate } from "../../lib/utils";

export default function LeavesAuditPanel({ enumsData, modal, charge }) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [apafa, setApafa] = useState("todos");
  const [employment, setEmployment] = useState("activos");

  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const pageSize = 30;

  // 🔹 Config para el modal de exportación
  const [exportConfig, setExportConfig] = useState(null);

  const rawTypes = enumsData.leavesIndex || {};

  const TYPES = Object.entries(rawTypes).map(([id, lt]) => ({
    value: lt._id || id,
    label: lt.name,
  }));
  

  const toggleType = (id) =>
    setSelectedTypes((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );

  const runAudit = async (newPage = page) => {
    charge(true);

    const token = getToken();

    const res = await auditActiveLeaves(
      {
        leaveTypes: selectedTypes,
        apafa,
        employmentStatus: employment,
        page: newPage,
        limit: pageSize,
      },
      token
    );

    if (res?.error) {
      charge(false);
      return modal("Error", res.message || "Error en auditoría de bajas");
    }

    setResults(res.results || []);
    setPage(res.page || 1);
    setTotalPages(res.totalPages || 1);
    setTotalResults(res.totalResults || 0);
    setHasSearched(true);

    charge(false);
  };

  const changePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    runAudit(p);
  };

  const toggleUser = (id) =>
    setSelectedUser((prev) => (prev === id ? null : id));

  /* =========================================================
     CAMPOS PARA EXPORTAR A EXCEL
     (una fila por baja activa)
  ========================================================= */
// Campos para exportar las bajas activas
const leaveExportFields = [
  // Usuario
  {
    key: "userFullName",
    label: "Nombre completo",
    type: "text",
    transform: (value, row) =>
      `${row.user?.firstName || ""} ${row.user?.lastName || ""}`.trim(),
  },
  {
    key: "dni",
    label: "DNI",
    type: "text",
    transform: (value, row) => row.user?.dni || "",
  },
  {
    key: "email",
    label: "Email",
    type: "text",
    transform: (value, row) => row.user?.email || "",
  },
  {
    key: "phone",
    label: "Teléfono",
    type: "text",
    transform: (value, row) => row.user?.phone || "",
  },

  // Baja
  {
    key: "leaveType",
    label: "Tipo de baja",
    type: "text",
    transform: (value, row) =>
      enumsData?.leavesIndex?.[row.leave?.leaveType]?.name || "",
  },
  {
    key: "startLeaveDate",
    label: "Inicio baja",
    type: "date",
    transform: (value, row) => row.leave?.startLeaveDate || null,
  },
  {
    key: "expectedEndLeaveDate",
    label: "Fin previsto",
    type: "date",
    transform: (value, row) => row.leave?.expectedEndLeaveDate || null,
  },

  // Dispositivo actual (solo responsable de dispositivo)
  {
    key: "deviceName",
    label: "Dispositivo",
    type: "text",
    transform: (value, row) =>
      row.currentHiring?.[0]?.deviceName || "", // primer hiring activo
  },
  {
    key: "deviceResponsibles",
    label: "Responsables de dispositivo",
    type: "text",
    transform: (value, row) => {
      const responsibles = row.currentHiring?.[0]?.responsibles || [];
      if (!responsibles.length) return "";
      return responsibles
        .map((r) => r.name || "")
        .filter(Boolean)
        .join(" | ");
    },
  },
];

  /* =========================================================
     HANDLER EXPORTACIÓN
     - Re-llama a auditActiveLeaves para TODAS las páginas
  ========================================================= */

  const handleExportClick = async () => {
    if (!hasSearched || totalResults === 0) {
      modal(
        "Sin datos",
        "Primero ejecuta la auditoría para tener resultados que exportar."
      );
      return;
    }

    try {
      charge(true);
      const token = getToken();

      let allResults = [];
      
      if (totalPages > 1) {
        for (let p = 1; p <= totalPages; p++) {
          const res = await auditActiveLeaves(
            {
              leaveTypes: selectedTypes,
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
        allResults = results.slice();
      }

setExportConfig({
  data: allResults,
  fields: leaveExportFields,
  fileName: "auditoria_bajas_activas.xlsx",
  modalTitle: "Exportar auditoría de bajas",
  modalMessage: "Selecciona las columnas que quieres incluir en el Excel:",
});
    } catch (err) {
      console.error(err);
      modal("Error", err.message || "Error al preparar los datos para Excel.");
    } finally {
      charge(false);
    }
  };

  return (
    <div className={styles.panel}>
      <h3>
        Auditoría de Bajas{" "}
        <div>
          <button onClick={() => runAudit(1)} className={styles.runButton}>
            Ejecutar auditoría
          </button>

          {hasSearched && totalResults > 0 && (
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

      {/* SELECCIÓN DE TIPOS */}
      <h4>Selecciona campos a auditar</h4>
      <div className={styles.fieldSelector}>
        {TYPES.map((t) => (
          <div key={t.value}>
            <input
              type="checkbox"
              checked={selectedTypes.includes(t.value)}
              onChange={() => toggleType(t.value)}
            />
            <label className={styles.checkboxOption}>{t.label}</label>
          </div>
        ))}
      </div>

      {/* CONTROLES */}
      <div className={styles.controls}>
        <div>
          <label>APAFA:</label>
          <select value={apafa} onChange={(e) => setApafa(e.target.value)}>
            <option value="todos">Todos</option>
            <option value="si">Solo APAFA</option>
            <option value="no">Solo Engloba</option>
          </select>
        </div>

        <div>
          <label>Situación laboral:</label>
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

      {/* RESULTADOS */}
      <div className={styles.results}>
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

        {hasSearched && results.length === 0 && <p>No hay resultados.</p>}

        {results.map((x) => {
          const u = x.user;
          const leave = x.leave;
          const hiring = x.currentHiring || [];

          return (
            <div key={u._id} className={styles.resultCard}>
              <div className={styles.resultH}>
                <h4>
                  {u.firstName} {u.lastName}
                </h4>

                {selectedUser === u._id ? (
                  <FaAngleDoubleUp onClick={() => toggleUser(u._id)} />
                ) : (
                  <FaAngleDoubleDown onClick={() => toggleUser(u._id)} />
                )}
              </div>

              {/* EXPANDIBLE */}
              <div
                className={
                  selectedUser === u._id
                    ? styles.expandContent
                    : styles.collapseContent
                }
              >
                {/* INFO DE USUARIO */}
                <div className={styles.infoUser}>
                  <p>
                    <GiHealthNormal /> DNI: {u.dni || "—"}
                  </p>
                  <p>
                    <MdEmail /> {u.email || "—"}
                  </p>
                  <p>
                    <MdContactPhone /> {u.phone || "—"}
                  </p>
                  <p>
                    <FaBirthdayCake /> Baja desde:{" "}
                    {formatDate(leave.startLeaveDate)}
                  </p>
                </div>

                {/* INFORMACIÓN DE LA BAJA */}
                <div className={styles.boxLeave}>
                  <p>
                    <FaUserInjured />{" "}
                    {enumsData.leavesIndex[leave.leaveType]?.name || "—"}
                  </p>
                  <p>
                    <MdOutlineUpdate /> Inicio:{" "}
                    {formatDate(leave.startLeaveDate)}
                  </p>
                  <p>
                    <MdUpdateDisabled /> Fin previsto:{" "}
                    {formatDate(leave.expectedEndLeaveDate)}
                  </p>
                </div>

                {/* PERIODOS ACTIVOS */}
                {hiring.length > 0 ? (
                  hiring.map((h) => (
                    <div key={h._id} className={styles.boxDispositive}>
                      <p>
                        <FaFolderOpen /> {h.programName || "Sin programa"}
                      </p>

                      {/* RESPONSABLES PROGRAMA */}
                      {h.programResponsibles?.length > 0 ? (
                        <div className={styles.boxNameRC}>
                          <p>RESPONSABLES DE PROGRAMA</p>
                          <ul>
                            {h.programResponsibles.map((pr) => (
                              <li key={pr._id}>{pr.name}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p>No tiene responsable</p>
                      )}

                      <p className={styles.textNameDispositive}>
                        <RiBuilding2Line /> {h.deviceName || "Sin dispositivo"}
                      </p>

                      <p>
                        <FaVestPatches />{" "}
                        {enumsData.jobsIndex?.[h.position]?.name || ""}
                      </p>

                      {/* RESPONSABLES DISPOSITIVO */}
                      {h.responsibles?.length > 0 ? (
                        <div className={styles.boxNameRC}>
                          <p>RESPONSABLES DE DISPOSITIVO</p>
                          <ul>
                            {h.responsibles.map((r) => (
                              <li key={r._id}>{r.name}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p>No tiene responsable</p>
                      )}

                      {/* COORDINADORES DISPOSITIVO */}
                      {h.coordinators?.length > 0 ? (
                        <div className={styles.boxNameRC}>
                          <p>COORDINADORES</p>
                          <ul>
                            {h.coordinators.map((c) => (
                              <li key={c._id}>{c.name}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p>No tiene coordinadores</p>
                      )}
                    </div>
                  ))
                ) : (
                  <p>Sin periodo activo</p>
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
