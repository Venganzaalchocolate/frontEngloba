import { useEffect, useState } from "react";
import styles from "../styles/infoEmployer.module.css";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import {
  validateBankAccount,
  validateDNIorNIE,
  validateSocialSecurityNumber,
  validEmail,
  validNumber,
  validText,
} from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { getToken } from "../../lib/serviceToken";
import { editUser } from "../../lib/data";
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
}) => {
  // Convertir booleanos a "si"/"no" en el estado inicial
  const initialState = {
    ...user,
    fostered: user.fostered ? "si" : "no",
    apafa: user.apafa ? "si" : "no",
    consetmentDataProtection: user.consetmentDataProtection ? "si" : "no",
  };

  // Guardamos una copia inmutable para saber cómo estaban los datos antes de editar
  const [originalData] = useState(() => deepClone(initialState));
  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState(initialState);
  const [errores, setErrores] = useState({});
  const { logged, changeLogged } = useLogin();

  // Estado para el select de estudios a agregar
  const [selectedStudy, setSelectedStudy] = useState("");

  // Función auxiliar para generar las opciones de estudios a partir de enumsData
  const getStudiesOptions = () => {
    let studiesOptions = [];
    if (enumsData?.studies) {
      studiesOptions = enumsData.studies.flatMap((x) =>
        x.subcategories
          ? x.subcategories.map((sub) => ({ value: sub._id, label: sub.name }))
          : [{ value: x._id, label: x.name }]
      );
    }
    return studiesOptions;
  };

  // Obtenemos las opciones totales de estudios
  const studiesOptions = getStudiesOptions();

  // Calculamos las opciones disponibles filtrando los estudios ya añadidos
  const availableStudiesOptions = studiesOptions.filter(
    (option) => !datos.studies || !datos.studies.includes(option.value)
  );

  // --- FUNCIONES AUXILIARES ---
  // Cancelar edición: revertir a los datos originales
  const reset = () => {
    setErrores({});
    setIsEditing(false);
    setDatos(deepClone(originalData));
  };

  // Convierte una fecha ISO (o string) a 'YYYY-MM-DD'
function toInputDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  // Ajustamos al huso horario (por si no quieres problemas con UTC).
  // OJO, si tu ISO no es local, tenlo en cuenta. 
  return d.toISOString().slice(0, 10);
}


  // Manejo de cambios en campos generales
  const handleChange = (e) => {
    const { name, value } = e.target;
    const auxErrores = { ...errores };
    const auxDatos = { ...datos };

    auxErrores["mensajeError"] = null;
    let valido = true;

    if (name.includes(".")) {
      // Manejo de campos anidados (ej: "disability.percentage")
      const [parentKey, childKey] = name.split(".");
      if (!auxDatos[parentKey]) {
        auxDatos[parentKey] = {};
      }
      auxDatos[parentKey][childKey] = value;

      // Validación para disability.percentage
      if (parentKey === "disability" && childKey === "percentage") {
        valido = validNumber(value);
        auxErrores[name] = valido ? null : textErrors("disPercentage");
      }
    } else {
      // Validaciones de nivel superior
      if (name === "firstName") {
        valido = validText(value, 3, 100);
        auxErrores[name] = !valido ? textErrors(name) : null;
      } else if (name === "email") {
        valido = validEmail(value);
        auxErrores[name] = !valido ? textErrors(name) : null;
      } else if (name === "phone") {
        valido = validNumber(value);
        auxErrores[name] = !valido ? textErrors(name) : null;
      } else if (name === "dni") {
        if (value !== "") {
          valido = validateDNIorNIE(value);
          auxErrores[name] = !valido ? textErrors(name) : null;
        } else {
          auxErrores[name] = null;
        }
      } else if (name === "bankAccountNumber") {
        if (value !== "") {
          valido = validateBankAccount(value);
          auxErrores[name] = !valido ? textErrors(name) : null;
        } else {
          auxErrores[name] = null;
        }
      } else if (name === "socialSecurityNumber") {
        if (value !== "") {
          valido = true;
          auxErrores[name] = !valido ? textErrors(name) : null;
        } else {
          auxErrores[name] = null;
        }
      } else {
        // gender, fostered, etc. sin validaciones específicas
        auxErrores[name] = null;
      }
      auxDatos[name] = value;
    }

    setDatos(auxDatos);
    setErrores(auxErrores);
  };

  // Validar campos antes de guardar
  const validateFields = () => {
    const newErrors = {};

    // Comprobamos si ya existen errores en "errores"
    for (let key in errores) {
      if (errores[key] != null && datos[key] !== "") {
        return false;
      }
    }

    // Campos requeridos básicos
    if (!datos.firstName) newErrors.firstName = "El nombre es requerido.";
    if (!datos.email) newErrors.email = "El email es requerido.";
    if (!datos.phone) newErrors.phone = "El teléfono es requerido.";

    setErrores(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Determina qué campos se han modificado comparando "datos" vs "originalData"
  // y mapeando disability -> disPercentage / disNotes
  const getModifiedFields = () => {
    const changed = {};

    // Campos simples
    const fieldsToCompare = [
      "firstName",
      "lastName",
      "dni",
      "email",
      "phone",
      "employmentStatus",
      "socialSecurityNumber",
      "bankAccountNumber",
      "gender",
      "fostered",
      "apafa",
      "consetmentDataProtection",
      "role",
      "birthday"
    ];

    fieldsToCompare.forEach((field) => {
      if (datos[field] !== originalData[field]) {
        changed[field] = datos[field];
      }
    });

    // Para disability, se separan en disPercentage y disNotes
    const oldPercentage = originalData.disability?.percentage || "";
    const oldNotes = originalData.disability?.notes || "";
    const newPercentage = datos.disability?.percentage || "";
    const newNotes = datos.disability?.notes || "";

    if (newPercentage !== oldPercentage) {
      changed.disPercentage = newPercentage;
    }
    if (newNotes !== oldNotes) {
      changed.disNotes = newNotes;
    }

    // Agregamos studies si han cambiado
    if (JSON.stringify(datos.studies) !== JSON.stringify(originalData.studies)) {
      changed.studies = datos.studies;
    }

    return changed;
  };

  // Manejo de edición
  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Guardar cambios
  const handleSave = async () => {
    if (!validateFields()) return;

    // Obtenemos sólo los campos modificados
    const modifiedData = getModifiedFields();

    // Para studies, aseguramos que se envíe como un string JSON que representa un array
    if (modifiedData.studies) {
      modifiedData.studies = JSON.stringify(modifiedData.studies);
    }
    // Si no hay cambios, salimos del modo edición
    if (Object.keys(modifiedData).length === 0) {
      setIsEditing(false);
      return;
    }

    // Agregamos _id para que el backend sepa a quién editar
    modifiedData._id = originalData._id;

    setIsEditing(false);
    charge(true);

    const token = getToken();
    const response = await editUser(modifiedData, token);

    if (!response.error) {
      // Actualizamos el usuario global con los datos "datos" (o lo que el back retorne)
      changeUser(response);
      modal("Editar Usuario", "Usuario editado con éxito");
      if (logged.user == user) changeLogged(response);
      chargeUser();
    } else {
      reset();
      modal("Error al editar", response.message);
    }

    charge(false);
  };

  // Botón de edición/guardado
  const boton = () => {
    if (!!listResponsability && listResponsability.length < 1) return "";
    return !isEditing ? (
      <FaEdit onClick={handleEdit} />
    ) : (
      <>
        <button onClick={handleSave}>Guardar</button>
        <button onClick={reset}>Cancelar</button>
      </>
    );
  };

  // Campos de texto principales
  const textFields = [
    ["firstName", "Nombre"],
    ["lastName", "Apellidos"],
    ["dni", "DNI"],
    ["birthday", "Fecha de Nacimiento"],
    ["email", "Email"],
    ["phone", "Teléfono"],
    ["employmentStatus", "Estado Laboral"],
    ["socialSecurityNumber", "Número de Seguridad Social"],
    ["bankAccountNumber", "Número de Cuenta Bancaria"],
  ];

  // Función para agregar un estudio seleccionado
  const handleAddStudy = () => {
    if (selectedStudy !== "") {
      setDatos((prev) => ({
        ...prev,
        studies: prev.studies ? [...prev.studies, selectedStudy] : [selectedStudy],
      }));
      setSelectedStudy("");
    }
  };

  // Función para eliminar un estudio de la lista
  const handleDeleteStudy = (studyToDelete) => {
    setDatos((prev) => ({
      ...prev,
      studies: prev.studies.filter((study) => study !== studyToDelete),
    }));
  };

  // Función auxiliar para obtener el label a partir del _id de estudio
  const getStudyLabel = (studyId) => {
    const study = studiesOptions.find((opt) => opt.value === studyId);
    return study ? study.label : studyId;
  };

  return (
    <div className={styles.contenedor}>
      <h2>
        DATOS {boton()}
      </h2>
  
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
        </select>
        {errores.gender && (
          <span className={styles.errorSpan}>{errores.gender}</span>
        )}
      </div>
  
      {/* Renderizado de cada campo en textFields */}
      {textFields.map(([fieldName, label]) => {
        if (fieldName === "birthday") {
          // Si es 'birthday', mostramos la fecha formateada cuando no se edita
          return (
            <div key={fieldName} className={styles[fieldName + "Container"]}>
              <label className={styles[fieldName + "Label"]}>{label}</label>
  
              {!isEditing ? (
                // Modo lectura: usamos 'formatDate'
                <span className={styles[fieldName]}>
                  {datos[fieldName] ? formatDate(datos[fieldName]) : ""}
                </span>
              ) : (
                // Modo edición: input de tipo date
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
  
        // Para otros campos normales:
        return (
          <div key={fieldName} className={styles[fieldName + "Container"]}>
            <label className={styles[fieldName + "Label"]}>{label}</label>
  
            {fieldName === "employmentStatus" &&
            (logged.user.role === "global" || logged.user.role === "root") ? (
              <select
                className={styles[fieldName]}
                name={fieldName}
                value={datos[fieldName] || ""}
                onChange={handleChange}
                disabled={!isEditing}
              >
                {enumsData.status.map((x) => (
                  <option value={x} key={x}>
                    {x}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className={styles[fieldName]}
                type="text"
                name={fieldName}
                value={datos[fieldName] || ""}
                onChange={handleChange}
                disabled={fieldName === "employmentStatus" ? true : !isEditing}
              />
            )}
  
            {errores[fieldName] && (
              <span className={styles.errorSpan}>{errores[fieldName]}</span>
            )}
          </div>
        );
      })}
  
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
        {errores.apafa && (
          <span className={styles.errorSpan}>{errores.apafa}</span>
        )}
      </div>
  
      {/* Consentimiento de protección de datos */}
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
  
      {/* Campos de discapacidad */}
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
          datos.studies && datos.studies.length > 0 ? (
            datos.studies.map((study, index) => (
              <p key={index} className={styles.studyItem}>
                {getStudyLabel(study)}
              </p>
            ))
          ) : (
            <p className={styles.noStudies}>No hay información sobre estudios</p>
          )
        ) : (
          <>
            <div className={styles.studiesList}>
              {datos.studies && datos.studies.length > 0 ? (
                datos.studies.map((study, index) => (
                  <div key={index} className={styles.studyItem}>
                    <span>{getStudyLabel(study)}</span>
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
                {availableStudiesOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
              <FaSquarePlus onClick={handleAddStudy} className={styles.plusIcon} />
            </div>
          </>
        )}
      </div>
    </div>
  );
  
};

export default InfoEmployer;
