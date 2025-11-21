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
import { GiHealthNormal } from "react-icons/gi";
import { MdContactPhone, MdEmail, MdOutlineUpdate, MdUpdateDisabled } from "react-icons/md";
import { formatDate } from "../../lib/utils";
import { FaUserInjured } from "react-icons/fa6";

export default function LeavesAuditPanel({ enumsData, modal, charge }) {
  const [selectedTypes, setSelectedTypes] = useState([]);
  const [apafa, setApafa] = useState("todos");
  const [employment, setEmployment] = useState("activos");

  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const pageSize = 30;

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

    charge(false);
  };

  const changePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    runAudit(p);
  };

  const toggleUser = (id) =>
    setSelectedUser((prev) => (prev === id ? null : id));

  return (
    <div className={styles.panel}>
      <h3>
        Auditoría de Bajas{" "}
        <button onClick={() => runAudit(1)} className={styles.runButton}>
          Ejecutar auditoría
        </button>
      </h3>

      {/* SELECCIÓN DE TIPOS */}
      {/* CAMPOS */}
      <h4>Selecciona campos a auditar</h4>
      <div className={styles.fieldSelector}>
        {TYPES.map((t) => (
          <div>
            <input
              type="checkbox"
              checked={selectedTypes.includes(t.value)}
              onChange={() => toggleType(t.value)}
            />
            <label key={t.value} className={styles.checkboxOption}>{t.label}</label>
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

        {results.length === 0 && <p>No hay resultados.</p>}

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
                  <p><GiHealthNormal /> DNI: {u.dni || "—"}</p>
                  <p><MdEmail /> {u.email || "—"}</p>
                  <p><MdContactPhone /> {u.phone || "—"}</p>
                  <p><FaBirthdayCake /> Baja desde: {formatDate(leave.startLeaveDate)}</p>
                </div>

                {/* BLOQUE 3 – INFORMACIÓN DE LA BAJA */}
                <div className={styles.boxLeave}>
                  <p><FaUserInjured /> {enumsData.leavesIndex[leave.leaveType]?.name || "—"}</p>
                  <p><MdOutlineUpdate /> Inicio: {formatDate(leave.startLeaveDate)}</p>
                  <p><MdUpdateDisabled /> Fin previsto: {formatDate(leave.expectedEndLeaveDate)}</p>

                </div>

                {/* PERIODOS ACTIVOS (MISMA ESTRUCTURA QUE USERINFO) */}
                {hiring.length > 0 ? (
                  hiring.map((h) => (
                    <div key={h._id} className={styles.boxDispositive}>

                      <p><FaFolderOpen /> {h.programName || "Sin programa"}</p>

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

                      <p><FaVestPatches /> {enumsData.jobsIndex?.[h.position]?.name || ""}</p>

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
    </div>
  );
}
