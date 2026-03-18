import React, { useState, useEffect, useRef } from "react";
import styles from "../styles/modalForm.module.css";
import MultiSelectChips from "./MultiSelectChips";
import AsyncSearchSelect from "./AsyncSearchSelect";


const ModalForm = ({ title, message, fields, onSubmit, onClose, modal = () => { } }) => {
  // =========== CONSTANTES ===============
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
  const ALLOWED_FILE_TYPES = ["application/pdf"];
  const [showDropdown, setShowDropdown] = useState({}); // Para múltiples desplegables
  const [searchTerm, setSearchTerm] = useState({});

  // ——— Config del detector ———
  const capsWarnedAtRef = useRef({});
  const CAPS_MIN_STREAK = 6;        // 6 o más letras seguidas en mayúscula
  const CAPS_MIN_RATIO = 0.75;     // 75% o más del texto en mayúsculas
  const CAPS_MIN_LEN = 8;       // evalúa a partir de 12 letras escritas
  const CAPS_COOLDOWN_MS = 15000;   // no avisar más de 1 vez/15s por campo

  // Detecta si el texto “grita”
  const shouldWarnCaps = (text) => {
    if (!text) return false;
    // Solo letras (Unicode): \p{L}
    const letters = [...text].filter(ch => /\p{L}/u.test(ch));
    if (letters.length < CAPS_MIN_LEN) return false;

    let uppers = 0, cur = 0, maxStreak = 0;
    for (const ch of letters) {
      const isUpper = ch === ch.toLocaleUpperCase() && ch !== ch.toLocaleLowerCase();
      if (isUpper) {
        uppers++; cur++; if (cur > maxStreak) maxStreak = cur;
      } else {
        cur = 0;
      }
    }
    const ratio = uppers / letters.length;
    return maxStreak >= CAPS_MIN_STREAK || ratio >= CAPS_MIN_RATIO;
  };

  // =========== ESTADOS ===============
  const [formData, setFormData] = useState(() =>
    fields.reduce((acc, field) => {
      if (field.type === "section") return acc;
      if (field.type === "file") { acc[field.name] = null; return acc; }
      if (field.type === "selectMultiple" || field.type === "checkboxGroup" || field.type === "multiChips") {
        acc[field.name] = Array.isArray(field.defaultValue) ? field.defaultValue : [];
        return acc;
      }
      acc[field.name] = field.defaultValue ?? "";
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
      if (field.type === "section" || !field.required) return true;
      const v = formData[field.name];
      if (field.type === "file") return v !== null;
      if (field.type === "selectMultiple" || field.type === "checkboxGroup" || field.type === "multiChips") {
        return Array.isArray(v) && v.length > 0;
      }
      return v !== "" && v !== undefined && v !== null;
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
    const nextFormData = { ...formData, [name]: value };

    if (fieldConfig?.required && !value) {
      setErrors((prev) => ({ ...prev, [name]: "Este campo es obligatorio." }));
    } else {
      if (typeof fieldConfig?.isValid === "function") {
        const errorMsg = fieldConfig.isValid(value, nextFormData);
        setErrors((prev) => ({ ...prev, [name]: errorMsg }));
      } else {
        setErrors((prev) => ({ ...prev, [name]: "" }));
      }
    }

    // ——— Anti-mayúsculas...
    const isTextual = fieldConfig && (fieldConfig.type === "text" || fieldConfig.type === "textarea");
    if (isTextual && fieldConfig.capsGuard && typeof value === "string") {
      const now = Date.now();
      const last = capsWarnedAtRef.current[name] || 0;
      if (shouldWarnCaps(value) && now - last > CAPS_COOLDOWN_MS) {
        capsWarnedAtRef.current[name] = now;
        if (typeof modal === "function") {
          modal(
            "Evita escribir en MAYÚSCULAS",
            "Has escrito demasiadas mayúsculas seguidas. Por favor, usa mayúsculas solo al inicio de frases o en nombres propios 😊"
          );
        }
      }
    }

    setFormData(nextFormData);
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
      if (field.type === "section" || !field.required) return;

      if (field.type === "file" && !formData[field.name]) {
        newErrors[field.name] = "Este campo es obligatorio.";
      }

      if (["text", "select", "date"].includes(field.type) || !field.type) {
        if (!formData[field.name]) newErrors[field.name] = "Este campo es obligatorio.";
      }

      if (field.type === "selectMultiple" || field.type === "checkboxGroup" || field.type === "multiChips") {
        const v = formData[field.name];
        if (!Array.isArray(v) || v.length === 0) {
          newErrors[field.name] = "Este campo es obligatorio.";
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

  const applySearchFilter = (options, term = "") => {
    if (!term) return options;                      // sin texto → sin filtrar
    const lc = term.toLowerCase();

    return options.flatMap((opt) => {
      // 2.1 optgroup
      if (opt.subcategories && opt.subcategories.length) {
        const subs = opt.subcategories.filter(
          (sub) =>
            (sub.public ?? true) &&
            sub.label.toLowerCase().includes(lc)
        );
        return subs.length ? [{ ...opt, subcategories: subs }] : [];
      }
      // 2.2 opción normal
      const isVisible =
        (opt.public ?? true) && opt.label.toLowerCase().includes(lc);
      return isVisible ? [opt] : [];
    });
  };


  useEffect(() => {
    setFormData((prev) => {
      let changed = false;
      const next = { ...prev };

      fields.forEach((field) => {
        if (field.type !== "select" || !field.firstSelect) return; // ← Clave

        const curVal = next[field.name];
        const isEmpty = curVal === "" || curVal === null || curVal === undefined;

        if (isEmpty && Array.isArray(field.options) && field.options.length) {
          // Primera opción con value distinto de "" (optgroups incluidos)
          const firstRealOption = (() => {
            for (const opt of field.options) {
              if (opt.subcategories?.length) {
                const sub = opt.subcategories.find((s) => s.value !== "");
                if (sub) return sub;
              } else if (opt.value !== "") {
                return opt;
              }
            }
            return null;
          })();

          if (firstRealOption) {
            next[field.name] = firstRealOption.value;
            changed = true;
            setErrors((e) => ({ ...e, [field.name]: "" }));
          }
        }
      });

      return changed ? next : prev;
    });
  }, [fields]);
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
                    {/* ——— 3.1 Input de búsqueda (se muestra si hay muchas opciones o campo.searchable ——— */}
                    {(field.searchable ||
                      filterOptions(field.options).length > 15) && (field?.disabled != true) && (field?.searchable != false) && (

                        <input
                          type="text"
                          className={styles.searchInput}
                          placeholder="Buscar…"
                          value={searchTerm[field.name] || ""}
                          onChange={(e) => {
                            const term = e.target.value;

                            // 1· actualizamos el texto que muestra el buscador
                            setSearchTerm((prev) => ({ ...prev, [field.name]: term }));

                            // 2· calculamos las opciones visibles con tu misma lógica
                            const visibles = applySearchFilter(
                              filterOptions(field.options),
                              term
                            );

                            // 3· si hay al menos una coincidencia -> elegimos la primera
                            if (visibles.length) {
                              const first =
                                visibles[0].subcategories?.length
                                  ? visibles[0].subcategories[0]
                                  : visibles[0];

                              setFormData((prev) => ({ ...prev, [field.name]: first.value }));
                              setErrors((prev) => ({ ...prev, [field.name]: "" }));
                            } else {
                              // 4· sin coincidencias -> limpiamos selección (lo deja como no válido)
                              setFormData((prev) => ({ ...prev, [field.name]: "" }));
                            }
                          }}
                        />
                      )}

                    {/* ——— 3.2 Select con las opciones filtradas ——— */}
                    <select
                      name={field.name}
                      value={formData[field.name] ?? ""}
                      onChange={handleChange}
                      disabled={field.disabled}
                    >
                        {/* Placeholder fijo */}
                    <option value="" disabled>
                      Seleccione una opción
                    </option>
                      {applySearchFilter(
                        filterOptions(field.options),
                        searchTerm[field.name] || ""
                      ).map((option, optIndex) => {
                        // Mantiene tu soporte de optgroup
                        if (option.subcategories && option.subcategories.length) {
                          return (
                            <optgroup
                              key={option.value || optIndex}
                              label={option.label || option.name}
                            >
                              {option.subcategories.map((sub, subIdx) => (
                                <option key={sub.value || subIdx} value={sub.value}>
                                  {sub.label}
                                </option>
                              ))}
                            </optgroup>
                          );
                        }
                        return (
                          <option key={option.value || optIndex} value={option.value}>
                            {option.label}
                          </option>
                        );
                      })}
                    </select>

                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </>
                )}
                {/* Campo TIPO CHECKBOX GROUP (varios checkboxes para múltiples opciones)*/}
                {field.type === "checkboxGroup" && (
                  <div className={styles.checkboxGroupWrapper}>
                    {field.options.map((option, optIndex) => {
                      // Filtramos opciones "public" si es necesario, o simplemente las mostramos
                      if (option.public === false) return null;

                      const checked = formData[field.name]?.includes(option.value);
                      return (
                        <label key={option.value || optIndex} className={styles.checkboxOption}>
                          <input
                            type="checkbox"
                            name={field.name}
                            value={option.value}
                            checked={checked}
                            onChange={() => {
                              // Reutilizamos la misma lógica para agregar/quitar valores del array
                              handleChangeMultiple(field.name, option.value);
                            }}
                          />
                          <span className={styles.textoLabelCheck}>{option.label}</span>
                        </label>
                      );
                    })}

                    {/* Mostramos errores si existen */}
                    {errors[field.name] && (
                      <p className={styles.modalError}>{errors[field.name]}</p>
                    )}
                  </div>
                )}

                {/* NUEVO: Campo multiSelectGrouped (chips agrupados estilo ofertas) */}





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
                                      className={`${styles.selectMultipleOption} ${formData[field.name]?.includes(sub.value)
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
                                  className={`${styles.selectMultipleOption} ${formData[field.name]?.includes(option.value)
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
                {field.type === "info" && (
                  <div key={index} className={styles.modalInfoText}>
                    {field.content}
                  </div>
                )}
                {field.type === "multiChips" && (
                  <>
                    <MultiSelectChips
                      options={field.options || []} 
                      value={Array.isArray(formData[field.name]) ? formData[field.name] : []}
                      onChange={(next) => {
                        setFormData(prev => ({ ...prev, [field.name]: next }));
                        setErrors(prev => ({
                          ...prev,
                          [field.name]: (field.required && (!next || next.length === 0)) ? "Este campo es obligatorio." : ""
                        }));
                      }}
                      placeholder={field.placeholder || "Escribe y pulsa Enter para añadir…"}
                      hint={field.hint}
                      disabled={field.disabled}
                      max={field.max}
                    />
                    {errors[field.name] && <p className={styles.modalError}>{errors[field.name]}</p>}
                  </>
                )}

                {field.type === "async-search-select" && (
  <AsyncSearchSelect
    key={field.name}
    field={field}
    onChange={handleChange} // ✅ el componente ya genera el evento compatible
  />
)}

                {/* Otros tipos: text, email, etc. */}
                {!["file", "select", "date", "textarea", "selectMultiple", "checkboxGroup", "info", "multiChips", "async-search-select"].includes(
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
