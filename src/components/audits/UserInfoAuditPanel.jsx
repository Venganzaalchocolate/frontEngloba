import { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { auditInfoUser } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

import {
  FaAddressCard, FaAngleDoubleDown, FaAngleDoubleUp, FaBirthdayCake,
  FaRegArrowAltCircleLeft,
  FaRegArrowAltCircleRight,
  FaUserAlt
} from "react-icons/fa";
import { RiBuilding2Line } from "react-icons/ri";
import { FaFolderOpen } from "react-icons/fa";
import { MdEmail, MdOutlinePhoneAndroid } from "react-icons/md";
import { FaVestPatches } from "react-icons/fa6";
import { BsBank2 } from "react-icons/bs";
import { GiHealthNormal } from "react-icons/gi";
import { MdContactPhone } from "react-icons/md";
import { formatDate } from "../../lib/utils";

export default function UserInfoAuditPanel({ enumsData, modal, charge }) {
  const [selectedFields, setSelectedFields] = useState([]);
  const [apafa, setApafa] = useState("no");
  const [employment, setEmployment] = useState("activos");

  const [results, setResults] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalResults, setTotalResults] = useState(0);

  const pageSize = 30;

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

  const toggle = (f) => {
    setSelectedFields((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  /* ======================================================
        EJECUTAR AUDITORÍA (con paginación real)
     ====================================================== */
  const runAudit = async (newPage = page) => {
    if (selectedFields.length === 0) {
      modal("Sin Valores", "Debe seleccionar una o varias casillas");
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

    charge(false);
  };

  /* ======================================================
        CAMBIAR PÁGINA (vuelve a pedir datos al backend)
     ====================================================== */
  const changePage = (p) => {
    if (p < 1 || p > totalPages) return;
    setPage(p);
    runAudit(p);
  };

  const selectUser = (id) => {
    setSelectedUser((prev) => (prev === id ? null : id));
  };

  return (
    <div className={styles.panel}>
      <h3>Auditoría de empleados <button onClick={() => runAudit(1)} className={styles.runButton}>
        Ejecutar auditoría
      </button></h3>
      <h4>Selecciona campos que sea auditar</h4>

      {/* Campos */}
      <div className={styles.fieldSelector}>
        {FIELDS.map((f) => (
          <div>
            <input
              type="checkbox"
              checked={selectedFields.includes(f.value)}
              onChange={() => toggle(f.value)}
            />
            <label key={f.value} className={styles.checkboxOption}>{f.label}</label>
          </div>
        ))}
      </div>

      {/* Controles */}
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



      {/* Resultados */}
      <div className={styles.results}>
        {results.length === 0 && <p>No hay resultados.</p>}

        {/* PAGINACIÓN */}
        {totalResults > pageSize && (
          <div className={styles.pagination}>
            <FaRegArrowAltCircleLeft className={(page === 1) ? styles.disabled : ''} onClick={() => changePage(page - 1)} />
            <span>
              Página {page} de {totalPages} — {totalResults} resultados
            </span>
            <FaRegArrowAltCircleRight className={(page === totalPages) ? styles.disabled : ''} onClick={() => changePage(page + 1)} />
          </div>
        )}

        {/* LISTA DE RESULTADOS */}
        {results.map((u) => (
          <div key={u._id} className={styles.resultCard}>
            <div className={styles.resultH}>
              <h4>{u.firstName} {u.lastName}</h4>
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
              <div className={styles.infoUser}>
                <p><FaAddressCard /> {u.dni || "—"}</p>
                <p><MdEmail /> {u.email || "—"}</p>
                <p><MdContactPhone /> {u.phone || "No disponible"}</p>
                <p><MdOutlinePhoneAndroid /> {u.phoneJob?.number || "No disponible"}</p>
                <p><FaBirthdayCake /> {formatDate(u.birthday) || "No disponible"}</p>
                <p><BsBank2 /> {u.bankAccountNumber || "No disponible"}</p>
                <p><GiHealthNormal /> {u.socialSecurityNumber || "No disponible"}</p>
              </div>

              {Array.isArray(u.currentHiring) && u.currentHiring.length > 0 ? (
                u.currentHiring.map((x) => (
                  <div className={styles.boxDispositive}>
                    <p><FaFolderOpen /> {x.programName || ""}</p>

                    {/* Responsables del Programa */}
                    {x.programResponsibles.length > 0 ? (
                      <div className={styles.boxNameRC}>
                        <p>RESPONSABLES DE PROGRAMA</p>
                        <ul>{x.programResponsibles.map((y) => <li><FaUserAlt /> {y.name}</li>)}</ul>
                      </div>
                    ) : (
                      <p>No tiene responsable</p>
                    )}

                    <p className={styles.textNameDispositive}>
                      <RiBuilding2Line /> {x.deviceName || ""}
                    </p>

                    <p>
                      <FaVestPatches /> {enumsData?.jobsIndex[x.position]?.name || ""}
                    </p>

                    {/* Responsables del dispositivo */}
                    {x.responsibles.length > 0 ? (
                      <div className={styles.boxNameRC}>
                        <p>RESPONSABLES DE DISPOSITIVO</p>
                        <ul>{x.responsibles.map((y) => <li>{y.name}</li>)}</ul>
                      </div>
                    ) : (
                      <p>No tiene responsable</p>
                    )}

                    {/* Coordinadores */}
                    {x.coordinators.length > 0 ? (
                      <div className={styles.boxNameRC}>
                        <p>COORDINADORES DE DISPOSITIVO</p>
                        <ul>{x.coordinators.map((y) => <li>{y.name}</li>)}</ul>
                      </div>
                    ) : (
                      <p>No tiene responsable</p>
                    )}
                  </div>
                ))
              ) : (
                <p>Sin periodo activo</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
