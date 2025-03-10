import React, { useState, useEffect } from "react";
import styles from "../styles/modalForm.module.css";

const ModalForm = ({ title, message, fields, onSubmit, onClose }) => {
  // =========== CONSTANTES ===============
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_FILE_TYPES = ["application/pdf"];
  const [showDropdown, setShowDropdown] = useState({}); // Para múltiples desplegables

  // =========== ESTADOS ===============
  const [formData, setFormData] = useState(() =>
    fields.reduce((acc, field) => {
      if (field.type === "section") return acc;
      acc[field.name] = field.type === "file" ? null : field.defaultValue || "";
      return acc;
    }, {})
  );
  const [errors, setErrors] = useState({});
  const [isValidForm, setIsValidForm] = useState(false);

  // Efecto para calcular la validez global del formulario
  useEffect(() => {
    const hasErrors = Object.values(errors).some(
      (err) => err !== null && err !== ""
    );
    const allRequiredFilled = fields.every((field) => {
      if (field.type === "section") return true;
      if (!field.required) return true;
      if (field.type === "file") {
        return formData[field.name] !== null;
      }
      return formData[field.name] !== "";
    });

    setIsValidForm(!hasErrors && allRequiredFilled);
  }, [errors, formData, fields]);

  // =========== MANEJAR CAMBIO ===============
  const handleChange = (event) => {
    const { name, value, files } = event.target;

    // CAMPO TIPO FILE
    if (files) {
      const file = files[0];
      if (!file) {
        setErrors((prev) => ({ ...prev, [name]: "Debes seleccionar un archivo." }));
        setFormData((prev) => ({ ...prev, [name]: null }));
        return;
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setErrors((prev) => ({ ...prev, [name]: "Solo se permiten archivos PDF." }));
        setFormData((prev) => ({ ...prev, [name]: null }));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = MAX_FILE_SIZE / (1024 * 1024);
        setErrors((prev) => ({
          ...prev,
          [name]: `El archivo debe ser menor a ${sizeMB} MB.`,
        }));
        setFormData((prev) => ({ ...prev, [name]: null }));
        return;
      }
      setErrors((prev) => ({ ...prev, [name]: "" }));
      setFormData((prev) => ({ ...prev, [name]: file }));
      return;
    }

    // CAMPO TIPO TEXTO, SELECT, ETC.
    const fieldConfig = fields.find((f) => f.name === name);
    if (fieldConfig?.required && !value) {
      setErrors((prev) => ({ ...prev, [name]: "Este campo es obligatorio." }));
    } else {
      if (typeof fieldConfig?.isValid === "function") {
        const errorMsg = fieldConfig.isValid(value);
        setErrors((prev) => ({ ...prev, [name]: errorMsg }));
      } else {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleChangeMultiple = (name, value) => {
    setFormData((prev) => {
      const prevValues = prev[name] || [];
      const newValues = prevValues.includes(value)
        ? prevValues.filter((v) => v !== value)
        : [...prevValues, value];
      setErrors((prevErrors) => ({
        ...prevErrors,
        [name]: newValues.length > 0 ? "" : "Este campo es obligatorio.",
      }));
      return { ...prev, [name]: newValues };
    });
  };

  const toggleDropdown = (name) => {
    setShowDropdown((prev) => ({
      ...prev,
      [name]: !prev[name],
    }));
  };

  // =========== MANEJAR SUBMIT ===============
  const handleSubmit = (event) => {
    event.preventDefault();
    let newErrors = { ...errors };

    fields.forEach((field) => {
      if (field.type === "section") return;
      if (field.required) {
        if (field.type === "file" && !formData[field.name]) {
          newErrors[field.name] = "Este campo es obligatorio.";
        }
        if (["text", "select", "date"].includes(field.type) || !field.type) {
          if (!formData[field.name]) {
            newErrors[field.name] = "Este campo es obligatorio.";
          }
        }
        if (field.type === "selectMultiple") {
          if (!formData[field.name] || formData[field.name].length === 0) {
            newErrors[field.name] = "Este campo es obligatorio.";
          }
        }
      }
    });

    setErrors(newErrors);
    const hasErrors = Object.values(newErrors).some(
      (err) => err !== null && err !== ""
    );
    if (hasErrors) return;
    onSubmit(formData);
  };

  // Función auxiliar para filtrar opciones según la propiedad public:
  // Se muestran si: public es undefined o true.
  const filterOptions = (options) =>
    options.filter((option) => option.public === undefined || option.public === true);

  // =========== RENDER ===============
  return (
    <div className={styles.modalVentana}>
      <div className={styles.modalContenedor}>
        <h3 className={styles.modalTitle}>{title}</h3>
        {message && <p>{message}</p>}

        <form onSubmit={handleSubmit}>
          {fields.map((field, index) => {
            if (field.type === "section") {
              return (
                <h4 key={`section-${index}`} className={styles.modalSectionTitle}>
                  {field.label}
                </h4>
              );
            }
            return (
              <div key={index} className={styles.modalInputGroup}>
                <label>
                  {field.label}
                  {field.required && (
                    <span style={{ color: "red", marginLeft: 4 }}>*</span>
                  )}
                </label>

                {/* Campo TIPO FILE */}
                {field.type === "file" && (
                  <>
                    <div className={styles.modalFileInputWrapper}>
                      <label className={styles.modalFileButton}>
                        EXAMINAR...
                        <input
                          name={field.name}
                          type="file"
                          className={styles.modalHiddenInput}
                          onChange={handleChange}
                          accept="application/pdf"
                        />
                      </label>
                      {formData[field.name] && (
                        <span className={styles.modalFileName}>
                          {formData[field.name].name}
                        </span>
                      )}
                    </div>
                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* Campo TIPO SELECT CON POSIBLE OPTGROUP */}
                {field.type === "select" && (
                  <>
                    <select
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      disabled={field.disabled}
                    >
                      {field.options.map((option, optIndex) => {
                        if (option.subcategories && option.subcategories.length > 0) {
                          const filteredSubs = filterOptions(option.subcategories);
                          if (filteredSubs.length === 0) return null;
                          return (
                            <optgroup
                              key={option.value || optIndex}
                              label={option.label || option.name}
                            >
                              {filteredSubs.map((sub, subIndex) => (
                                <option
                                  key={sub.value || subIndex}
                                  value={sub.value}
                                >
                                  {sub.label}
                                </option>
                              ))}
                            </optgroup>
                          );
                        } else {
                          if (option.public === false) return null;
                          return (
                            <option
                              key={option.value || optIndex}
                              value={option.value}
                            >
                              {option.label}
                            </option>
                          );
                        }
                      })}
                    </select>
                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* Campo TIPO SELECT MULTIPLE CON AGRUPACIÓN */}
                {field.type === "selectMultiple" && (
                  <>
                    <div className={styles.selectMultipleWrapper}>
                      <div
                        className={styles.selectMultipleButton}
                        onClick={() => toggleDropdown(field.name)}
                      >
                        {formData[field.name]?.length > 0
                          ? formData[field.name]
                              .map((val) => {
                                // Buscar en opciones (posible estructura agrupada)
                                let found = null;
                                field.options.forEach((option) => {
                                  if (
                                    option.subcategories &&
                                    option.subcategories.length > 0
                                  ) {
                                    const match = option.subcategories.find(
                                      (sub) =>
                                        sub.value === val &&
                                        (sub.public === undefined || sub.public === true)
                                    );
                                    if (match) found = match.label;
                                  } else {
                                    if (
                                      option.value === val &&
                                      (option.public === undefined || option.public === true)
                                    ) {
                                      found = option.label;
                                    }
                                  }
                                });
                                return found || val;
                              })
                              .join(", ")
                          : "Selecciona opciones"}
                        <span className={styles.arrow}>&#9662;</span>
                      </div>

                      {showDropdown[field.name] && (
                        <div className={styles.selectMultipleDropdown}>
                          {field.options.map((option, idx) => {
                            if (option.subcategories && option.subcategories.length > 0) {
                              const filteredSubs = filterOptions(option.subcategories);
                              if (filteredSubs.length === 0) return null;
                              return (
                                <div key={option.value || idx}>
                                  <strong>{option.label || option.name}</strong>
                                  {filteredSubs.map((sub, subIdx) => (
                                    <div
                                      key={sub.value || subIdx}
                                      className={`${styles.selectMultipleOption} ${
                                        formData[field.name]?.includes(sub.value)
                                          ? styles.selected
                                          : ""
                                      } ${sub.value === "" ? styles.disabled : ""}`}
                                      onClick={() => {
                                        if (sub.value !== "") {
                                          handleChangeMultiple(field.name, sub.value);
                                        }
                                      }}
                                    >
                                      {sub.label}
                                    </div>
                                  ))}
                                </div>
                              );
                            } else {
                              if (option.public === false) return null;
                              return (
                                <div
                                  key={option.value || idx}
                                  className={`${styles.selectMultipleOption} ${
                                    formData[field.name]?.includes(option.value)
                                      ? styles.selected
                                      : ""
                                  } ${option.value === "" ? styles.disabled : ""}`}
                                  onClick={() => {
                                    if (option.value !== "") {
                                      handleChangeMultiple(field.name, option.value);
                                    }
                                  }}
                                >
                                  {option.label}
                                </div>
                              );
                            }
                          })}
                        </div>
                      )}
                    </div>
                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* Campo TIPO DATE */}
                {field.type === "date" && (
                  <>
                    <input
                      name={field.name}
                      type="date"
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      disabled={field.disabled}
                    />
                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* Campo TIPO TEXTAREA */}
                {field.type === "textarea" && (
                  <>
                    <textarea
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      disabled={field.disabled}
                    />
                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* Otros tipos: text, email, etc. */}
                {!["file", "select", "date", "textarea", "selectMultiple"].includes(
                  field.type
                ) && (
                  <>
                    <input
                      name={field.name}
                      type={field.type || "text"}
                      value={formData[field.name] || ""}
                      placeholder={field.placeholder || ""}
                      onChange={handleChange}
                      disabled={field.disabled}
                    />
                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </>
                )}
              </div>
            );
          })}

          <div className={styles.modalActions}>
            <button type="submit">Aceptar</button>
            <button className="tomato" type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalForm;
