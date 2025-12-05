import React, { useState, useMemo, useCallback } from "react";
import styles from "../styles/infoEmployer.module.css";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import {
  validateBankAccount,
  validateDNIorNIE,
  validEmail,
  validNumber,
  validText,
} from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { getToken } from "../../lib/serviceToken";
import { createChangeRequest, editUser } from "../../lib/data";
import { deepClone, formatDate } from "../../lib/utils";
import { useLogin } from "../../hooks/useLogin";

const InfoEmployer = ({
  user,
  modal,
  charge,
  changeUser,
  listResponsability,
  enumsData,
  chargeUser = () => {},
  soloInfo = false,
  onRequestCreated,
}) => {
  // Estado inicial (booleanos como "si"/"no")
  const initialState = {
    ...user,
    fostered: user.fostered ? "si" : "no",
    apafa: user.apafa ? "si" : "no",
    consetmentDataProtection: user.consetmentDataProtection ? "si" : "no",
    tracking: user.tracking === true ? "si" : "no", // NUEVO: siempre presente
  };


  const [originalData] = useState(() => deepClone(initialState));
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState(initialState);
  const [errores, setErrores] = useState({});
  const { logged, changeLogged } = useLogin();

  const [selectedStudy, setSelectedStudy] = useState("");

  // Supervisión / permisos
  const isSupervisor = Array.isArray(listResponsability)
    ? listResponsability.length > 0
    : Number(listResponsability) > 0;

  const canDirectEdit = isSupervisor || ["global", "root"].includes(logged.user.role);

  // ---------- normalización de studiesIndex (soporta objeto o array)
  const studiesOptions = useMemo(() => {
    const idx = enumsData?.studiesIndex;
    if (!idx) return [];

    // Índice como objeto { [id]: { name, isRoot?, isSub? } }
    return Object.entries(idx)
      .filter(([, v]) => v?.isSub || !v?.isRoot) // evita raíces
      .map(([id, v]) => ({ value: id, label: v?.name || id }));
  }, [enumsData?.studiesIndex]);

  const availableStudiesOptions = useMemo(() => {
    const taken = new Set(Array.isArray(datos.studies) ? datos.studies : []);
    return studiesOptions.filter((o) => !taken.has(o.value));
  }, [datos.studies, studiesOptions]);

  // Helper fecha -> YYYY-MM-DD
  function toInputDate(isoString) {
    if (!isoString) return "";
    const d = new Date(isoString);
    return d.toISOString().slice(0, 10);
  }

  // Handle change con validaciones
  const handleChange = (e) => {
    const { name, value } = e.target;
    const auxErrores = { ...errores };
    const auxDatos = { ...datos };

    auxErrores["mensajeError"] = null;

    if (name.includes(".")) {
      // Campos anidados (p.ej. disability.percentage)
      const [parentKey, childKey] = name.split(".");
      if (!auxDatos[parentKey]) auxDatos[parentKey] = {};
      auxDatos[parentKey][childKey] = value;

      if (parentKey === "disability" && childKey === "percentage") {
        if (value === "") auxErrores[name] = null;
        else auxErrores[name] = validNumber(value) ? null : textErrors("disPercentage");
      } else {
        auxErrores[name] = null;
      }
    } else {
      if (name === "firstName") {
        auxErrores[name] = validText(value, 3, 100) ? null : textErrors(name);
      } else if (name === "email_personal") {
        auxErrores[name] = validEmail(value) ? null : textErrors(name);
      } else if (name === "phone") {
        auxErrores[name] = validNumber(value) ? null : textErrors(name);
      } else if (name === "dni") {
        auxErrores[name] = value ? (validateDNIorNIE(value) ? null : textErrors(name)) : null;
      } else if (name === "bankAccountNumber") {
        auxErrores[name] = value ? (validateBankAccount(value) ? null : textErrors(name)) : null;
      } else if (name === "phoneJobNumber") {
        auxErrores[name] = value ? (validNumber(value) ? null : textErrors("phone")) : null;
      } else if (name === "socialSecurityNumber") {
        auxErrores[name] = null;
      } else {
        auxErrores[name] = null; // gender, fostered, apafa, tracking, etc.
      }
      auxDatos[name] = value;
    }

    setDatos(auxDatos);
    setErrores(auxErrores);
  };

  // Solo estos pueden quedar vacíos al guardar
  const ALLOW_EMPTY = new Set([
    "socialSecurityNumber",
    "bankAccountNumber",
    "phoneJobNumber",
    "phoneJobExtension",
    "disability.percentage",
    "disability.notes",
    "studies",
  ]);

  const REQUIRED_TOP = [
    "firstName",
    "lastName",
    "dni",
    "birthday",
    "employmentStatus",
    "email_personal",
    "gender",
    "fostered",
    "apafa",
    "consetmentDataProtection",
    "phone",
  ];

  const isEmpty = (v) => v == null || String(v).trim() === "";

  // Validar campos antes de guardar
  const validateFields = () => {
    const newErrors = {};

    for (let key in errores) {
      if (errores[key] != null) return false;
    }

    for (const field of REQUIRED_TOP) {
      if (ALLOW_EMPTY.has(field)) continue;
      if (isEmpty(datos[field])) newErrors[field] = textErrors(field) || "Campo requerido.";
    }

    setErrores(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Calcular campos modificados
  const getModifiedFields = () => {
    const changed = {};
    const fieldsToCompare = [
      "firstName",
      "lastName",
      "dni",
      "email_personal",
      "employmentStatus",
      "socialSecurityNumber",
      "bankAccountNumber",
      "gender",
      "fostered",
      "apafa",
      "consetmentDataProtection",
      "role",
      "birthday",
      "phone",
      "tracking", // NUEVO
    ];

    fieldsToCompare.forEach((f) => {
      if (datos[f] !== originalData[f]) changed[f] = datos[f];
    });

    const oldP = originalData.disability?.percentage || "";
    const oldN = originalData.disability?.notes || "";
    const newP = datos.disability?.percentage || "";
    const newN = datos.disability?.notes || "";
    if (newP !== oldP) changed.disPercentage = newP;
    if (newN !== oldN) changed.disNotes = newN;

    if (JSON.stringify(datos.studies) !== JSON.stringify(originalData.studies)) {
      changed.studies = datos.studies;
    }

    const oldJobPhone = originalData.phoneJob?.number || "";
    const newJobPhone = datos.phoneJob?.number ?? datos.phoneJobNumber ?? "";
    if (oldJobPhone !== newJobPhone) changed.phoneJobNumber = newJobPhone;

    const oldJobExt = originalData.phoneJob?.extension || "";
    const newJobExt = datos.phoneJob?.extension ?? datos.phoneJobExtension ?? "";
    if (oldJobExt !== newJobExt) changed.phoneJobExtension = newJobExt;

    return changed;
  };

  // Mapeo modified -> changes (dot paths)
  const toChangeLines = (modified, original) => {
    const map = {
      disPercentage: "disability.percentage",
      disNotes: "disability.notes",
      phoneJobNumber: "phoneJob.number",
      phoneJobExtension: "phoneJob.extension",
    };

    const changes = [];

    for (const key of Object.keys(modified)) {
      const path = map[key] || key;

      let to = modified[key];
      if (["fostered", "apafa", "consetmentDataProtection", "tracking"].includes(path)) {
        if (to === "si") to = true;
        else if (to === "no") to = false;
      }

      const from = path.split(".").reduce((acc, k) => (acc ? acc[k] : undefined), original);

      changes.push({ path, from, to });
    }

    return changes;
  };

  const handleEdit = () => setIsEditing(!isEditing);

  // handleSave modificado (sin stringify)

const handleSave = async () => {
  if (!validateFields()) return;

  const modifiedData = getModifiedFields();
  if (Object.keys(modifiedData).length === 0) {
    setIsEditing(false);
    return;
  }

  setIsEditing(false);
  charge(true);
  const token = getToken();

  try {
    if (canDirectEdit) {
      
      const payload = { ...modifiedData, _id: originalData._id };

      const response = await editUser(payload, token);

      if (!response.error) {
        changeUser(response);
        modal("Editar Usuario", "Usuario editado con éxito");

        if (logged.user._id === user._id) {
          changeLogged(response);
        }

        chargeUser();
      } else {
        throw new Error(response.message || "Error al editar");
      }

    } else {
      const changes = toChangeLines(modifiedData, originalData);

      const payload = {
        userId: originalData._id,
        changes,
        note: "",
      };

      const resp = await createChangeRequest(payload, token);

      if (!resp.error) {
        const created = resp?.data && resp?.data?._id ? resp.data : resp;
        onRequestCreated?.(created);
        modal("Solicitud enviada", "Tu supervisor revisará los cambios");
        setDatos(deepClone(originalData));
      } else {
        throw new Error(resp.message || "No se pudo crear la solicitud");
      }
    }
  } catch (e) {
    setDatos(deepClone(originalData));
    modal("Error", e.message || "No se pudo procesar la operación");
  } finally {
    charge(false);
  }
};


  const reset = () => {
    setErrores({});
    setIsEditing(false);
    setDatos(deepClone(originalData));
  };

  const boton = () => {
    if (soloInfo) return "";
    return !isEditing ? (
      !canDirectEdit ? (
        <button onClick={handleEdit}>Pedir cambios</button>
      ) : (
        <FaEdit onClick={handleEdit} />
      )
    ) : (
      <>
        <button onClick={handleSave}>{canDirectEdit ? "Guardar" : "Enviar solicitud"}</button>
        <button onClick={reset}>Cancelar</button>
      </>
    );
  };

  // ---------- label por id usando índice nuevo si hace falta
  const getStudyLabel = useCallback(
    (id) => {
      const byOption = studiesOptions.find((o) => o.value === id)?.label;
      if (byOption) return byOption;
      const idx = enumsData?.studiesIndex;
      if (idx && !Array.isArray(idx)) return idx?.[id]?.name || id;
      return id;
    },
    [studiesOptions, enumsData?.studiesIndex]
  );

  // Campos de texto principales
  const textFields = [
    ["employmentStatus", "Estado Laboral"],
    ["dni", "DNI"],
    ["firstName", "Nombre"],
    ["lastName", "Apellidos"],
    ["birthday", "Fecha de Nacimiento"],
    ["email", "Email Corporativo"],
    ["email_personal", "Email Personal"],
    ["socialSecurityNumber", "Número de Seguridad Social"],
    ["bankAccountNumber", "Número de Cuenta Bancaria"],
    ["phone", "Teléfono Personal"],
    ["tracking", "Justificación"], // NUEVO
  ];

  // Estudios
  const handleAddStudy = () => {
    if (!selectedStudy) return;
    setDatos((prev) => ({
      ...prev,
      studies: prev.studies ? [...prev.studies, selectedStudy] : [selectedStudy],
    }));
    setSelectedStudy("");
  };

  const handleDeleteStudy = (studyToDelete) => {
    setDatos((prev) => ({
      ...prev,
      studies: prev.studies.filter((s) => s !== studyToDelete),
    }));
  };

  
   return (
    <div className={styles.contenedor}>
      <h2>INFORMACIÓN PERSONAL {boton()}</h2>

      {logged.user.role === "root" && (
        <div className={styles.roleContainer}>
          <label className={styles.roleLabel}>Rol</label>
          <select
            className={styles.role}
            name="role"
            value={datos.role || ""}
            onChange={handleChange}
            disabled={!isEditing}
          >
            <option value="">Seleccionar</option>
            <option value="root">Root</option>
            <option value="global">Global</option>
            <option value="employee">Empleado</option>
            <option value="responsable">Responsable</option>
            <option value="auditor">Auditor</option>
          </select>
        </div>
      )}

      {/* Apafa */}
      <div className={styles.apafaContainer}>
        <label className={styles.apafaLabel}>Apafa</label>
        <select
          className={styles.apafa}
          name="apafa"
          value={datos.apafa || "no"}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        {errores.apafa && <span className={styles.errorSpan}>{errores.apafa}</span>}
      </div>

      {/* Campos principales */}
      {textFields.map(([fieldName, label]) => {
        if (fieldName === "birthday") {
          return (
            <div key={fieldName} className={styles[fieldName + "Container"]}>
              <label className={styles[fieldName + "Label"]}>{label}</label>
              {!isEditing ? (
                <input
                  className={styles[fieldName]}
                  type="text"
                  value={datos[fieldName] ? formatDate(datos[fieldName]) : ""}
                  disabled
                />
              ) : (
                <input
                  className={styles[fieldName]}
                  type="date"
                  name={fieldName}
                  value={toInputDate(datos[fieldName])}
                  onChange={handleChange}
                />
              )}
              {errores[fieldName] && (
                <span className={styles.errorSpan}>{errores[fieldName]}</span>
              )}
            </div>
          );
        }

        const isRootOrGlobal =
          logged.user.role === "global" || logged.user.role === "root";

        let control = null;

        // tracking: select si/no para global/root, resto solo lectura
        if (fieldName === "tracking") {
          if (isRootOrGlobal) {
            control = (
              <select
                className={styles[fieldName]}
                name="tracking"
                value={datos.tracking || "no"}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            );
          } else {
            control = (
              <input
                className={styles[fieldName]}
                type="text"
                value={datos.tracking === "si" ? "Sí" : "No"}
                disabled
              />
            );
          }
        } else if (fieldName === "employmentStatus" && isRootOrGlobal) {
          // Estado laboral: solo editable para global/root
          control = (
            <select
              className={styles[fieldName]}
              name={fieldName}
              value={datos[fieldName] || ""}
              onChange={handleChange}
              disabled={!isEditing}
            >
              {(enumsData?.status || []).map((x) => (
                <option value={x} key={x}>
                  {x}
                </option>
              ))}
            </select>
          );
        } else if (fieldName === "employmentStatus" && !isRootOrGlobal) {
          control = (
            <input
              className={styles[fieldName]}
              type="text"
              value={datos[fieldName] || ""}
              disabled
            />
          );
        } else {
          // Resto de campos: input normal
          control = (
            <input
              className={styles[fieldName]}
              type="text"
              name={fieldName}
              value={datos[fieldName] || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          );
        }

        return (
          <div key={fieldName} className={styles[fieldName + "Container"]}>
            <label className={styles[fieldName + "Label"]}>{label}</label>
            {control}
            {errores[fieldName] && (
              <span className={styles.errorSpan}>{errores[fieldName]}</span>
            )}
          </div>
        );
      })}

      {/* Teléfono laboral y extensión */}
      <div className={styles.phoneJobContainer}>
        <label className={styles.phoneJobLabel}>Teléfono Laboral</label>
        <input
          className={styles.phoneJob}
          type="text"
          name="phoneJobNumber"
          value={datos.phoneJob?.number || datos.phoneJobNumber || ""}
          onChange={handleChange}
          disabled={!isEditing}
        />
        {errores["phoneJobNumber"] && (
          <span className={styles.errorSpan}>{errores["phoneJobNumber"]}</span>
        )}
      </div>

      <div className={styles.phoneJobExtensionContainer}>
        <label className={styles.phoneJobExtensionLabel}>Extensión</label>
        <input
          className={styles.phoneJobExtension}
          type="text"
          name="phoneJobExtension"
          value={datos.phoneJob?.extension || datos.phoneJobExtension || ""}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </div>

      {/* Género */}
      <div className={styles.genderContainer}>
        <label className={styles.genderLabel}>Género</label>
        <select
          className={styles.gender}
          name="gender"
          value={datos.gender || ""}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="">Seleccionar</option>
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
          <option value="others">Otros</option>
          <option value="nonBinary">No binario</option>
        </select>
        {errores.gender && (
          <span className={styles.errorSpan}>{errores.gender}</span>
        )}
      </div>

      {/* Extutelado */}
      <div className={styles.fosteredContainer}>
        <label className={styles.fosteredLabel}>Extutelado</label>
        <select
          className={styles.fostered}
          name="fostered"
          value={datos.fostered || "no"}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        {errores.fostered && (
          <span className={styles.errorSpan}>{errores.fostered}</span>
        )}
      </div>

      {/* Consentimiento PD (solo si es "no" o en edición) */}
      {(isEditing || (!!datos && datos.consetmentDataProtection === "no")) && (
        <div className={styles.consetmentDataProtectionContainer}>
          <label className={styles.consetmentDataProtectionLabel}>
            Consentimiento PD
          </label>
          <select
            className={styles.consetmentDataProtection}
            name="consetmentDataProtection"
            value={datos.consetmentDataProtection || "si"}
            onChange={handleChange}
            disabled={!isEditing}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
          {errores.consetmentDataProtection && (
            <span className={styles.errorSpan}>
              {errores.consetmentDataProtection}
            </span>
          )}
        </div>
      )}

      {/* Discapacidad (solo si hay valor o en edición) */}
      {(isEditing || (datos?.disability?.percentage || 0) > 0) && (
        <>
          <div className={styles.disabilityPercentageContainer}>
            <label className={styles.disabilityPercentageLabel}>
              Porcentaje de Discapacidad
            </label>
            <input
              className={styles.disabilityPercentage}
              type="number"
              name="disability.percentage"
              value={datos?.disability?.percentage || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
            {errores["disability.percentage"] && (
              <span className={styles.errorSpan}>
                {errores["disability.percentage"]}
              </span>
            )}
          </div>

          <div className={styles.disabilityNotesContainer}>
            <label className={styles.disabilityNotesLabel}>
              Notas sobre la discapacidad
            </label>
            <input
              className={styles.disabilityNotes}
              type="text"
              name="disability.notes"
              value={datos?.disability?.notes || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
            {errores["disability.notes"] && (
              <span className={styles.errorSpan}>
                {errores["disability.notes"]}
              </span>
            )}
          </div>
        </>
      )}
      {/* Estudios */}
      <div className={styles.studiesContainer}>
        <label className={styles.studiesLabel}>Estudios</label>
        {!isEditing ? (
          datos.studies?.length ? (
            datos.studies.map((study, i) => (
              <p key={i} className={styles.studyItem}>
                {getStudyLabel(study)}
              </p>
            ))
          ) : (
            <p className={styles.noStudies}>
              No hay información sobre estudios
            </p>
          )
        ) : (
          <>
            <div className={styles.studiesList}>

              {datos.studies?.length ? (
                datos.studies.map((study, i) => (
                  <div key={i} className={styles.studyItem}>
                    <p>{getStudyLabel(study)}</p>
                    <FaTrashAlt
                      onClick={() => handleDeleteStudy(study)}
                      className={styles.trashIcon}
                    />
                  </div>
                ))
              ) : (
                <p className={styles.noStudies}>No hay estudios seleccionados</p>
              )}
            </div>
            <div className={styles.addStudy}>
              <select
                className={styles.studySelect}
                value={selectedStudy}
                onChange={(e) => setSelectedStudy(e.target.value)}
              >
                <option value="">Añadir estudios</option>
                {availableStudiesOptions.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <FaSquarePlus
                onClick={handleAddStudy}
                className={styles.plusIcon}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );

};

export default InfoEmployer;
