import { useState, useMemo } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import {
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaAngleDoubleDown,
  FaAngleDoubleUp,
  FaTimesCircle,
  FaClock,
  FaAddressCard,
} from "react-icons/fa";
import { getToken } from "../../lib/serviceToken";
import { auditPayrolls } from "../../lib/data";
import GenericXLSExport from "../globals/GenericXLSExport.jsx";
import { MdContactPhone, MdEmail, MdOutlinePhoneAndroid } from "react-icons/md";
import { TbFileTypeXml } from "react-icons/tb";

export default function PayrollsAuditPanel({ enumsData, modal, charge }) {
  const [selectedFields, setSelectedFields] = useState(["notSign"]);
  const [apafa, setApafa] = useState("no");
  const [traking, setTraking] = useState("no");
  const [employment, setEmployment] = useState("activos");

  // Configuración para el modal genérico de exportación XLS
  const [exportConfig, setExportConfig] = useState(null);

  const [time, setTime] = useState({
    // OJO: getMonth() va de 0 a 11 → si quieres el mes actual humano, suma 1
    months:
      new Date().getMonth() === 0
        ? [12]
        : [new Date().getMonth() + 1],
    years:
      new Date().getMonth() === 0
        ? [new Date().getFullYear() - 1]
        : [new Date().getFullYear()],
  });

  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [hasSearched, setHasSearched] = useState(false);

  const pageSize = 30;

  const FIELDS = [
    { value: "notSign", label: "Nóminas sin firmar" },
    { value: "notPayroll", label: "Sin nóminas" },
  ];

  const MONTHS = [
    { value: 1, label: "Enero" },
    { value: 2, label: "Febrero" },
    { value: 3, label: "Marzo" },
    { value: 4, label: "Abril" },
    { value: 5, label: "Mayo" },
    { value: 6, label: "Junio" },
    { value: 7, label: "Julio" },
    { value: 8, label: "Agosto" },
    { value: 9, label: "Septiembre" },
    { value: 10, label: "Octubre" },
    { value: 11, label: "Noviembre" },
    { value: 12, label: "Diciembre" },
  ];

  const YEARS = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= currentYear - 5; y--) {
      years.push(y);
    }
    return years;
  }, []);

  const monthLabel = (m) =>
    MONTHS.find((mm) => mm.value === m)?.label || m;

  /* =========================================================
     CAMPOS PARA EXPORTAR A EXCEL (AUDITORÍA NÓMINAS)
  ========================================================= */

  const payrollsExportFields = [
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
      key: "employmentStatus",
      label: "Estado laboral",
      type: "text",
    },
    {
      key: "apafa",
      label: "APAFA",
      type: "text",
      transform: (value, row) =>
        row.apafa === true ? "APAFA" : "Engloba",
    },
    {
      key: "tracking",
      label: "Seguimiento",
      type: "text",
      transform: (value, row) =>
        row.tracking === true ? "Sí" : "No",
    },
    {
      key: "notSignedPayrolls",
      label: "Nóminas sin firmar",
      type: "text",
      transform: (value, row) =>
        (row.notSignedPayrolls || [])
          .map((p) => `${monthLabel(p.month)} ${p.year}`)
          .join(" | "),
    },
    {
      key: "missingPayrolls",
      label: "Meses sin nómina subida",
      type: "text",
      transform: (value, row) =>
        (row.missingPayrolls || [])
          .map((p) => `${monthLabel(p.month)} ${p.year}`)
          .join(" | "),
    },
  ];

  /* =========================================================
     HANDLER EXPORTACIÓN — usa SOLO los resultados en memoria
     (nada de re-llamar al back → más rápido)
  ========================================================= */

  const handleExportClick = () => {
    if (!hasSearched || results.length === 0) {
      modal(
        "Sin datos",
        "Primero ejecuta la auditoría para tener resultados que exportar."
      );
      return;
    }

    if (selectedFields.length === 0) {
      modal(
        "Campos requeridos",
        "Debes seleccionar al menos un criterio (nóminas sin firmar / sin nóminas)."
      );
      return;
    }

    if (!time.months.length || !time.years.length) {
      modal(
        "Tiempo requerido",
        "Debes seleccionar al menos un mes y un año para la auditoría."
      );
      return;
    }

    // Aquí no hay fetch: usamos todos los resultados ya cargados
    setExportConfig({
      data: results, // TODOS los resultados de la auditoría
      fields: payrollsExportFields,
      fileName: "auditoria_nominas.xlsx",
      modalTitle: "Exportar auditoría de nóminas",
      modalMessage:
        "Selecciona las columnas que quieres incluir en el Excel:",
    });
  };

  /* =========================================================
     HANDLERS DE FILTROS
  ========================================================= */

  const toggle = (f) => {
    setSelectedFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const toggleMonth = (month) => {
    setTime((prev) => ({
      ...prev,
      months: prev.months.includes(month)
        ? prev.months.filter((m) => m !== month)
        : [...prev.months, month],
    }));
  };

  const toggleYear = (year) => {
    setTime((prev) => ({
      ...prev,
      years: prev.years.includes(year)
        ? prev.years.filter((y) => y !== year)
        : [...prev.years, year],
    }));
  };

  const changePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p); // paginación SOLO en front
  };

  const selectUser = (id) => {
    setSelectedUser((prev) => (prev === id ? null : id));
  };

  /* =========================================================
     RUN AUDIT — carga TODOS los resultados una sola vez
     y luego paginamos en front
  ========================================================= */

  const runAudit = async () => {
    if (selectedFields.length === 0) {
      modal(
        "Campos requeridos",
        "Debes seleccionar al menos un criterio (nóminas sin firmar / sin nóminas)."
      );
      return;
    }

    if (!time.months.length || !time.years.length) {
      modal(
        "Tiempo requerido",
        "Debes seleccionar al menos un mes y un año para la auditoría."
      );
      return;
    }

    charge(true);
    const token = getToken();

    const payload = {
      selectedFields,
      apafa,
      traking,
      employment,
      time,
      // Pedimos un límite ALTO para traernos todo de golpe
      page: 1,
      limit: 10000,
    };

    const res = await auditPayrolls(payload, token);

    if (res?.error) {
      modal(
        "Error",
        res.message || "No se pudo obtener la auditoría de nóminas"
      );
      charge(false);
      return;
    }

    const allResults = res.results || [];
    const total = allResults.length;
    const pages = total > 0 ? Math.ceil(total / pageSize) : 1;

    setResults(allResults);
    setTotalResults(total);
    setTotalPages(pages);
    setPage(1);
    setHasSearched(true);

    charge(false);
  };

  // Resultados visibles según la página actual (paginación front)
  const visibleResults =
    totalResults > pageSize
      ? results.slice((page - 1) * pageSize, page * pageSize)
      : results;

  return (
    <div className={styles.panel}>
      <h3>
        Auditoría de nóminas{" "}
        <div>
          <button onClick={runAudit} className={styles.runButton}>
            Ejecutar auditoría
          </button>

          {hasSearched && results.length > 0 && (
            <button
              type="button"
              className={styles.runButton}
              onClick={handleExportClick}
              style={{
                marginLeft: "1rem",
                display: "inline-flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <TbFileTypeXml />
              Exportar a Excel
            </button>
          )}
        </div>
      </h3>

      <h4>Selecciona campos que deseas auditar</h4>

      {/* Campos + Tiempo en el mismo selector */}
      <div className={styles.fieldSelector}>
        {/* Campos de auditoría */}
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

        {/* Bloque de tiempo dentro del fieldSelector */}
        <div className={styles.timeBlockWrapper}>
          <div className={styles.timeFilter}>
            <div className={styles.timeBlock}>
              <h4 className={styles.title}>Meses:</h4>
              <div className={styles.chipGroup}>
                {MONTHS.map((m) => (
                  <div key={`month-${m.value}`}>
                    <input
                      type="checkbox"
                      checked={time.months.includes(m.value)}
                      onChange={() => toggleMonth(m.value)}
                    />
                    <label className={styles.checkboxOption}>
                      {m.label}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            <div className={styles.timeBlock}>
              <h4 className={styles.title}>Años:</h4>
              <div className={styles.chipGroup}>
                {YEARS.map((y) => (
                  <div key={`year-${y}`}>
                    <input
                      type="checkbox"
                      checked={time.years.includes(y)}
                      onChange={() => toggleYear(y)}
                    />
                    <label className={styles.checkboxOption}>{y}</label>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Controles extra */}
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

        <div>
          <label>Con seguimiento:</label>
          <select
            value={traking}
            onChange={(e) => setTraking(e.target.value)}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      {/* Resultados */}
      <div className={styles.results}>
        {hasSearched && visibleResults.length === 0 && (
          <p>No hay resultados.</p>
        )}

        {/* PAGINACIÓN */}
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
              {/* Info básica */}
              <div className={styles.infoUser}>
                <p>
                  <FaAddressCard title="DNI/NIE" />{" "}
                  {u.dni || "No disponible"}
                </p>
                <p>
                  <MdEmail title="Email" />{" "}
                  {u.email || "No disponible"}
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
                  Estado laboral:{" "}
                  {u.employmentStatus || "No disponible"}
                </p>
              </div>

              {/* Nóminas sin firmar */}
              {selectedFields.includes("notSign") && (
                <div className={styles.boxDispositive}>
                  <h4>Nóminas sin firmar</h4>
                  <ul>
                    {u.notSignedPayrolls?.length ? (
                      u.notSignedPayrolls.map((p, idx) => (
                        <li key={`ns-${u._id}-${idx}`}>
                          <FaClock style={{ marginRight: 6 }} />
                          {monthLabel(p.month)} {p.year}
                        </li>
                      ))
                    ) : (
                      <li>
                        — Ninguna nómina sin firmar en el periodo
                        seleccionado
                      </li>
                    )}
                  </ul>
                </div>
              )}

              {/* Nóminas no subidas */}
              {selectedFields.includes("notPayroll") && (
                <div className={styles.boxDispositive}>
                  <h4>Meses sin nómina subida</h4>
                  <ul>
                    {u.missingPayrolls?.length ? (
                      u.missingPayrolls.map((p, idx) => (
                        <li key={`mp-${u._id}-${idx}`}>
                          <FaTimesCircle style={{ marginRight: 6 }} />
                          {monthLabel(p.month)} {p.year}
                        </li>
                      ))
                    ) : (
                      <li>
                        — No faltan nóminas en el periodo seleccionado
                      </li>
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
