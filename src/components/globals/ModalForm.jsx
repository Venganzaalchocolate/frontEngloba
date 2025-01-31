import React, { useState, useEffect } from "react";
import styles from "../styles/modalForm.module.css";

const ModalForm = ({ title, message, fields, onSubmit, onClose }) => {
  // =========== CONSTANTES ===============
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_FILE_TYPES = ["application/pdf"];

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

  // Efecto para calcular validez global
  useEffect(() => {
    const hasErrors = Object.values(errors).some((err) => err !== null && err !== "");
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

    // ARCHIVO
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

    // OTRAS ENTRADAS
    const fieldConfig = fields.find((f) => f.name === name);

    // 1) Requerido y vacío
    if (fieldConfig?.required && !value) {
      setErrors((prev) => ({ ...prev, [name]: "Este campo es obligatorio." }));
    } else {
      // 2) validación isValid
      if (typeof fieldConfig?.isValid === "function") {
        const errorMsg = fieldConfig.isValid(value); // Dev "" o msg error
        setErrors((prev) => ({ ...prev, [name]: errorMsg }));
      } else {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }

    // Actualizar formData
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // =========== MANEJAR SUBMIT ===============
  const handleSubmit = (event) => {
    event.preventDefault();

    let newErrors = { ...errors };

    // Validación final
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
      }
    });

    setErrors(newErrors);

    const hasErrors = Object.values(newErrors).some((err) => err !== null && err !== "");
    if (hasErrors) {
      return;
    }

    // Todo OK
    onSubmit(formData);
  };

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
                  {field.required && <span style={{ color: "red", marginLeft: 4 }}>*</span>}
                </label>

                {/* CAMPO TIPO FILE */}
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

                {/* CAMPO TIPO SELECT */}
                {field.type === "select" && (
                  <>
                    <select
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                      disabled={field.disabled}
                    >
                      {field.options.map((option, optIndex) => (
                        <option key={optIndex} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* CAMPO TIPO DATE */}
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

                {/* OTROS TIPOS: text, email, etc. */}
                {!["file", "select", "date"].includes(field.type) && (
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
            <button className={styles.tomato} type="button" onClick={onClose}>
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ModalForm;
