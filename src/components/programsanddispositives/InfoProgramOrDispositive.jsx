import React, { useMemo } from "react";
import styles from "../styles/infoPrgramOrDispositive.module.css";
import { formatDate } from "../../lib/utils";

const InfoProgramOrDispositive = ({
  modal,
  charge,
  listResponsability,
  enumsData,
  info,
  onSelect,
}) => {
  if (!info) {
    return (
      <div className={styles.contenedor}>
        <h2>INFORMACIÓN</h2>
        <p style={{ color: "#666" }}>Selecciona un programa o dispositivo.</p>
      </div>
    );
  }

  const isProgram = info?.type === "program";
  const typeLabel = isProgram ? "Programa" : "Dispositivo";

  // Normalizar responsables y coordinadores
  const responsables = useMemo(() => {
    const list = info?.responsible || [];
    if (!list.length) return [];
    return list.map((r) =>
      typeof r === "string"
        ? enumsData?.employeesIndex?.[r]
          ? `${enumsData.employeesIndex[r].firstName} ${enumsData.employeesIndex[r].lastName}`
          : r
        : `${r.firstName} ${r.lastName}`
    );
  }, [info, enumsData]);

  const coordinadores = useMemo(() => {
    const list = info?.coordinators || [];
    if (!list.length) return [];
    return list.map((r) =>
      typeof r === "string"
        ? enumsData?.employeesIndex?.[r]
          ? `${enumsData.employeesIndex[r].firstName} ${enumsData.employeesIndex[r].lastName}`
          : r
        : `${r.firstName} ${r.lastName}`
    );
  }, [info, enumsData]);

  // 🔍 Obtener dispositivos asociados al programa desde enumsData.dispositiveIndex
  const dispositivos = useMemo(() => {
    if (!isProgram) return [];
    const all = Object.values(enumsData?.dispositiveIndex || {});
    return all.filter((d) => d.program === info._id);
  }, [info, enumsData, isProgram]);

  const selectDispositive = (x) => {
    const data = { ...x, type: "dispositive" };
    onSelect(data);
  };

  return (
    <div className={styles.contenedor}>
      <h2>INFORMACIÓN DEL {typeLabel.toUpperCase()}</h2>

      {/* Nombre */}
      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>Nombre</label>
        <input
          type="text"
          value={info.name || ""}
          disabled
          className={styles.field}
        />
      </div>

      {/* Acrónimo o Dirección */}
      {isProgram ? (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Acrónimo</label>
          <input
            type="text"
            value={info.acronym || ""}
            disabled
            className={styles.field}
          />
        </div>
      ) : (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Dirección</label>
          <input
            type="text"
            value={info.address || ""}
            disabled
            className={styles.field}
          />
        </div>
      )}

      {/* Área o Provincia */}
      {isProgram ? (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Área</label>
          <input
            type="text"
            value={info.area || ""}
            disabled
            className={styles.field}
          />
        </div>
      ) : (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Provincia</label>
          <input
            type="text"
            value={
              enumsData?.provincesIndex?.[info.province]?.name ||
              info.province ||
              ""
            }
            disabled
            className={styles.field}
          />
        </div>
      )}

      {/* Responsables */}
      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>Responsables</label>
        {responsables.length > 0 ? (
          responsables.map((r, i) => (
            <p key={i} className={styles.fieldText}>
              {r}
            </p>
          ))
        ) : (
          <p className={styles.fieldTextEmpty}>Sin responsables</p>
        )}
      </div>

      {/* Coordinadores */}
      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>Coordinadores</label>
        {coordinadores.length > 0 ? (
          coordinadores.map((r, i) => (
            <p key={i} className={styles.fieldText}>
              {r}
            </p>
          ))
        ) : (
          <p className={styles.fieldTextEmpty}>Sin coordinadores</p>
        )}
      </div>

      {/* Descripción / Objetivos / Perfil (solo programa) */}
      {isProgram && (
        <>
          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Descripción</label>
            <textarea
              value={info?.about?.description || ""}
              disabled
              className={styles.textarea}
              rows={6}
            />
          </div>

          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Objetivos</label>
            <textarea
              value={info?.about?.objectives || ""}
              disabled
              className={styles.textarea}
              rows={6}
            />
          </div>

          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Perfil</label>
            <textarea
              value={info?.about?.profile || ""}
              disabled
              className={styles.textarea}
              rows={4}
            />
          </div>
        </>
      )}

      {/* Dispositivos asociados al programa */}
      {isProgram && (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Dispositivos asociados</label>
          {dispositivos.length > 0 ? (
            <ul className={styles.list}>
              {dispositivos.map((d) => (
                <li
                  key={d._id}
                  className={styles.listItem}
                  onClick={() => selectDispositive(d)}
                >
                  <strong>{d.name}</strong>
                  {d.address && (
                    <span className={styles.subtext}>{d.address}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.fieldTextEmpty}>
              No hay dispositivos asociados
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default InfoProgramOrDispositive;