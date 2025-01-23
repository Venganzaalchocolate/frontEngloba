// import React, { useState, useEffect } from "react";
// import "../styles/modalForm.css"; // Ajusta la ruta si difiere en tu proyecto

// const ModalForm = ({ title, message, fields, onSubmit, onClose, }) => {
//   // =========================================
//   // CONSTANTES DE VALIDACIÓN
//   // =========================================
//   const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB en bytes
//   const ALLOWED_FILE_TYPES = ["application/pdf"]; // Tipos de archivo permitidos

//   // =========================================
//   // ESTADOS
//   // =========================================

//   // Inicializa el estado de los valores de cada campo
//   const [formData, setFormData] = useState(() => {
//     return fields.reduce((acc, field) => {
//       // Para campos tipo "file", iniciamos en null
//       // Para otros, usamos field.defaultValue o un string vacío
//       acc[field.name] = field.type === "file" ? null : (field.defaultValue || "");
//       return acc;
//     }, {});
//   });

//   // Maneja los errores de validación (por campo)
//   const [errors, setErrors] = useState({});

//   // Controla la validez global del formulario (para habilitar/deshabilitar botón)
//   const [isValidForm, setIsValidForm] = useState(false);

//   // =========================================
//   // EFECTO: CALCULAR VALIDEZ DEL FORMULARIO
//   // =========================================
//   useEffect(() => {
//     // Verifica si existe algún error activo
//     const hasErrors = Object.values(errors).some(
//       (error) => error !== null && error !== ""
//     );

//     // Revisa si todos los campos requeridos están completados
//     const allRequiredFilled = fields.every((field) => {
//       if (!field.required) return true; // Si no es requerido, omitimos

//       // Para campos tipo "file", su valor en formData debe ser != null
//       if (field.type === "file") {
//         return formData[field.name] !== null;
//       }
//       // Para otros tipos, el valor no puede estar vacío
//       return formData[field.name] !== "";
//     });

//     // Conclusión: formulario válido si no hay errores y todos los requeridos están llenos
//     setIsValidForm(!hasErrors && allRequiredFilled);
//   }, [errors, formData, fields]);

//   // =========================================
//   // MANEJAR CAMBIOS EN LOS INPUTS
//   // =========================================
//   const handleChange = (event) => {
//     const { name, value, files } = event.target;

//     // Si es un campo de tipo "file" (FileList)
//     if (files) {
//       const file = files[0];

//       // Caso: usuario canceló y no seleccionó archivo
//       if (!file) {
//         setErrors((prev) => ({
//           ...prev,
//           [name]: "Debes seleccionar un archivo."
//         }));
//         setFormData((prev) => ({ ...prev, [name]: null }));
//         return;
//       }

//       // Validar tipo de archivo
//       if (!ALLOWED_FILE_TYPES.includes(file.type)) {
//         setErrors((prev) => ({
//           ...prev,
//           [name]: "Solo se permiten archivos PDF."
//         }));
//         setFormData((prev) => ({ ...prev, [name]: null }));
//         return;
//       }

//       // Validar tamaño del archivo
//       if (file.size > MAX_FILE_SIZE) {
//         const sizeMB = MAX_FILE_SIZE / (1024 * 1024);
//         setErrors((prev) => ({
//           ...prev,
//           [name]: `El archivo debe ser menor a ${sizeMB} MB.`
//         }));
//         setFormData((prev) => ({ ...prev, [name]: null }));
//         return;
//       }

//       // Pasa todas las validaciones => limpia el error y guarda el archivo
//       setErrors((prev) => ({
//         ...prev,
//         [name]: ""
//       }));
//       setFormData((prev) => ({
//         ...prev,
//         [name]: file
//       }));

//     } else {

//       // Para campos que NO son "file"
//       const fieldConfig = fields.find((f) => f.name === name);

//       // Valida si el campo es requerido y está vacío
//       if (fieldConfig?.required && !value) {
//         setErrors((prev) => ({
//           ...prev,
//           [name]: "Este campo es obligatorio."
//         }));
//       } else {

//         // Si la propiedad isValid es una función, la invocamos
//         if (typeof fieldConfig?.isValid === "function") {
          
//           const errorMsg = fieldConfig.isValid(value);
//           if (errorMsg) {
//             // Si la función devolvió un string con error, lo seteamos
//             setErrors((prev) => ({
//               ...prev,
//               [name]: errorMsg
//             }));
//           } else {
//             // Si la función devolvió "", está OK
//             setErrors((prev) => ({
//               ...prev,
//               [name]: ""
//             }));
//           }
//         } else {
//           // Si no hay función de validación extra, limpiamos error
//           setErrors((prev) => ({
//             ...prev,
//             [name]: ""
//           }));
//         }
//       }

//       setFormData((prev) => ({
//         ...prev,
//         [name]: value
//       }));


//     }
//   };

//   // =========================================
//   // MANEJAR ENVÍO DE FORMULARIO
//   // =========================================
//   const handleSubmit = (event) => {
//     event.preventDefault();

//     // Validación final: revisa campos requeridos
//     let newErrors = { ...errors }; // Copiamos los errores actuales
    
//     fields.forEach((field) => {
//       if (field.required) {
//         // campo tipo file
//         if (field.type === "file" && !formData[field.name]) {
//           newErrors[field.name] = "Este campo es obligatorio.";
//         }
//         // campo normal
//         if (["text", "select", "date"].includes(field.type) || !field.type) {
//           if (!formData[field.name]) {
//             newErrors[field.name] = "Este campo es obligatorio.";
//           }
//         }
//       }
//     });

//     setErrors(newErrors);

//     // Verificar si al menos un error persiste
//     const hasErrors = Object.values(newErrors).some(
//       (error) => error !== null && error !== "" && error!==true
//     );

//     if (hasErrors) {
//       // Si hay errores, NO llamamos onSubmit; solo mostramos errores debajo de los campos
//       return;
//     }

//     // Si todo está bien:
//     onSubmit(formData);
//     //onClose();
//   };

//   // =========================================
//   // RENDER
//   // =========================================
//   return (
//     // Usamos IDs y clases para mayor especificidad
//     <div id="modalVentana" className="modalVentana">
//       <div id="modalContenedor" className="modalContenedor">
//         <h3 id="modalTitle" className="modalTitle">{title}</h3>
//         {message && <p>{message}</p>}

//         <form onSubmit={handleSubmit}>
//           {fields.map((field, index) => (
//             <div
//               key={index}
//               id="modalInputGroup"
//               className="modalInputGroup"
//             >
//               {/* Etiqueta del campo */}
//               <label htmlFor={field.name}>
//                 {field.label}
//                 {/* Si es requerido, podemos mostrar un asterisco */}
//                 {field.required && <span style={{ color: 'red', marginLeft: 4 }}>*</span>}
//               </label>

//               {/* ======== CAMPO TIPO FILE ======== */}
//               {field.type === "file" && (
//                 <>
//                   <div id="modalFileInputWrapper" className="modalFileInputWrapper">
//                     <label
//                       htmlFor={field.name}
//                       id="modalFileButton"
//                       className="modalFileButton"
//                     >
//                       EXAMINAR...
//                     </label>
//                     <input
//                       id={field.name}
//                       name={field.name}
//                       type="file"
//                       className="modalHiddenInput"
//                       onChange={handleChange}
//                       accept="application/pdf"
//                     />
//                     {/* Mostrar nombre del archivo truncado si está seleccionado */}
//                     {formData[field.name] && (
//                       <span id="modalFileName" className="modalFileName">
//                         {formData[field.name].name}
//                       </span>
//                     )}
//                   </div>
//                   {/* Error debajo del campo */}
//                   {errors[field.name] && (
//                     <p className="modalError">{errors[field.name]}</p>
//                   )}
//                 </>
//               )}

//               {/* ======== CAMPO TIPO SELECT ======== */}
//               {field.type === "select" && (
//                 <>
//                   <select
//                     id={field.name}
//                     name={field.name}
//                     value={formData[field.name] || ""}
//                     onChange={handleChange}
//                   >
//                     {/* Opción vacía al inicio si deseas */}
//                     {field.options.map((option, optIndex) => (
//                       <option key={optIndex} value={option.value}>
//                         {option.label}
//                       </option>
//                     ))}
//                   </select>
//                   {/* Error */}
//                   {errors[field.name] && (
//                     <p className="modalError">{errors[field.name]}</p>
//                   )}
//                 </>
//               )}

//               {/* ======== CAMPO TIPO DATE ======== */}
//               {field.type === "date" && (
//                 <>
//                   <input
//                     id={field.name}
//                     name={field.name}
//                     type="date"
//                     value={formData[field.name] || ""}
//                     onChange={handleChange}
//                   />
//                   {/* Error */}
//                   {errors[field.name] && (
//                     <p className="modalError">{errors[field.name]}</p>
//                   )}
//                 </>
//               )}

//               {/* ======== CAMPOS RESTANTES: text, password, email, etc. ======== */}
//               {!["file", "select", "date"].includes(field.type) && (
//                 <>
//                   <input
//                     id={field.name}
//                     name={field.name}
//                     type={field.type || "text"}
//                     value={formData[field.name] || ""}
//                     placeholder={field.placeholder || ""}
//                     onChange={handleChange}
//                   />
//                   {/* Error */}
//                   {errors[field.name] && (
//                     <p className="modalError">{errors[field.name]}</p>
//                   )}
//                 </>
//               )}
//             </div>
//           ))}

//           {/* BOTONES DEL FORMULARIO */}
//           <div id="modalActions" className="modalActions">
//             <button type="submit">Aceptar</button>
//             <button className="tomato" type="button" onClick={onClose}>Cancelar</button>
//           </div>
//         </form>
//       </div>
//     </div>
//   );
// };

// export default ModalForm;

import React, { useState, useEffect } from "react";
import "../styles/modalForm.css"; // Ajusta la ruta si difiere en tu proyecto

const ModalForm = ({ title, message, fields, onSubmit, onClose }) => {
  // =========================================
  // CONSTANTES DE VALIDACIÓN
  // =========================================
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB en bytes
  const ALLOWED_FILE_TYPES = ["application/pdf"]; // Tipos de archivo permitidos

  // =========================================
  // ESTADOS
  // =========================================

  // Inicializa el estado de los valores de cada campo
  // Ignoramos los de tipo "section" porque no son inputs
  const [formData, setFormData] = useState(() => {
    return fields.reduce((acc, field) => {
      if (field.type === "section") {
        return acc; // Nada que inicializar
      }
      acc[field.name] =
        field.type === "file" ? null : field.defaultValue || "";
      return acc;
    }, {});
  });

  // Maneja los errores de validación (por campo)
  const [errors, setErrors] = useState({});

  // Controla la validez global del formulario (SI la quisieras usar)
  // pero no la usaré para deshabilitar el botón
  const [isValidForm, setIsValidForm] = useState(false);

  // =========================================
  // EFECTO: CALCULAR VALIDEZ DEL FORMULARIO
  // =========================================
  useEffect(() => {
    // Verifica si existe algún error activo
    const hasErrors = Object.values(errors).some(
      (error) => error !== null && error !== ""
    );

    // Revisa si todos los campos requeridos están completados
    const allRequiredFilled = fields.every((field) => {
      if (field.type === "section") return true; // Ignorar secciones
      if (!field.required) return true; // Si no es requerido, omite
      // Para campos tipo "file", su valor en formData debe ser != null
      if (field.type === "file") {
        return formData[field.name] !== null;
      }
      // Para otros tipos, no puede estar vacío
      return formData[field.name] !== "";
    });

    // Conclusión: formulario válido si no hay errores y todos los requeridos están llenos
    setIsValidForm(!hasErrors && allRequiredFilled);
  }, [errors, formData, fields]);

  // =========================================
  // MANEJAR CAMBIOS EN LOS INPUTS
  // =========================================
  const handleChange = (event) => {
    const { name, value, files } = event.target;

    // Si es un campo de tipo "file"
    if (files) {
      const file = files[0];

      if (!file) {
        setErrors((prev) => ({
          ...prev,
          [name]: "Debes seleccionar un archivo."
        }));
        setFormData((prev) => ({ ...prev, [name]: null }));
        return;
      }

      // Validar tipo de archivo
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        setErrors((prev) => ({
          ...prev,
          [name]: "Solo se permiten archivos PDF."
        }));
        setFormData((prev) => ({ ...prev, [name]: null }));
        return;
      }

      // Validar tamaño del archivo
      if (file.size > MAX_FILE_SIZE) {
        const sizeMB = MAX_FILE_SIZE / (1024 * 1024);
        setErrors((prev) => ({
          ...prev,
          [name]: `El archivo debe ser menor a ${sizeMB} MB.`
        }));
        setFormData((prev) => ({ ...prev, [name]: null }));
        return;
      }

      // Si pasa todas las validaciones, limpiamos error y guardamos el archivo
      setErrors((prev) => ({
        ...prev,
        [name]: ""
      }));
      setFormData((prev) => ({
        ...prev,
        [name]: file
      }));
    } else {
      // Para campos que no son file
      const fieldConfig = fields.find((f) => f.name === name);

      // Valida si el campo es requerido y está vacío
      if (fieldConfig?.required && !value) {
        setErrors((prev) => ({
          ...prev,
          [name]: "Este campo es obligatorio."
        }));
      } else {
        // Si la propiedad isValid es una función, la invocamos
        if (typeof fieldConfig?.isValid === "function") {
          const errorMsg = fieldConfig.isValid(value);
          if (errorMsg) {
            // Si la función devolvió un string con error, lo seteamos
            setErrors((prev) => ({
              ...prev,
              [name]: errorMsg
            }));
          } else {
            setErrors((prev) => ({
              ...prev,
              [name]: ""
            }));
          }
        } else {
          // Si no hay función extra, limpiamos error
          setErrors((prev) => ({
            ...prev,
            [name]: ""
          }));
        }
      }

      setFormData((prev) => ({
        ...prev,
        [name]: value
      }));
    }
  };

  // =========================================
  // MANEJAR ENVÍO DE FORMULARIO
  // =========================================
  const handleSubmit = (event) => {
    event.preventDefault();

    let newErrors = { ...errors }; 

    // Validación final: revisa campos requeridos
    fields.forEach((field) => {
      if (field.type === "section") return; // Se ignora
      if (field.required) {
        // campo tipo file
        if (field.type === "file" && !formData[field.name]) {
          newErrors[field.name] = "Este campo es obligatorio.";
        }
        // campo normal
        if (["text", "select", "date"].includes(field.type) || !field.type) {
          if (!formData[field.name]) {
            newErrors[field.name] = "Este campo es obligatorio.";
          }
        }
      }
    });

    setErrors(newErrors);

    // Verificar si persiste algún error
    const hasErrors = Object.values(newErrors).some(
      (error) => error !== null && error !== "" && error !== true
    );

    if (hasErrors) {
      // Si hay errores, NO llamamos onSubmit
      return;
    }

    // Si todo está bien:
    onSubmit(formData);
    // onClose(); // Descomenta si deseas cerrar al hacer submit
  };

  // =========================================
  // RENDER
  // =========================================
  return (
    <div id="modalVentana" className="modalVentana">
      <div id="modalContenedor" className="modalContenedor">
        <h3 id="modalTitle" className="modalTitle">{title}</h3>
        {message && <p>{message}</p>}

        <form onSubmit={handleSubmit}>
          {fields.map((field, index) => {
            // Si es "section", solo renderizo un título/separador
            if (field.type === "section") {
              return (
                <h4 key={`section-${index}`} className="modalSectionTitle">
                  {field.label}
                </h4>
              );
            }

            // De lo contrario, renderizamos el input como antes
            return (
              <div
                key={index}
                id="modalInputGroup"
                className="modalInputGroup"
              >
                <label htmlFor={field.name}>
                  {field.label}
                  {field.required && (
                    <span style={{ color: "red", marginLeft: 4 }}>*</span>
                  )}
                </label>

                {/* ======= CAMPO TIPO FILE ======= */}
                {field.type === "file" && (
                  <>
                    <div
                      id="modalFileInputWrapper"
                      className="modalFileInputWrapper"
                    >
                      <label
                        htmlFor={field.name}
                        id="modalFileButton"
                        className="modalFileButton"
                      >
                        EXAMINAR...
                      </label>
                      <input
                        id={field.name}
                        name={field.name}
                        type="file"
                        className="modalHiddenInput"
                        onChange={handleChange}
                        accept="application/pdf"
                      />
                      {/* Mostrar nombre del archivo si está seleccionado */}
                      {formData[field.name] && (
                        <span
                          id="modalFileName"
                          className="modalFileName"
                        >
                          {formData[field.name].name}
                        </span>
                      )}
                    </div>
                    {/* Error para file */}
                    {errors[field.name] && (
                      <p className="modalError">{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* ======= CAMPO TIPO SELECT ======= */}
                {field.type === "select" && (
                  <>
                    <select
                      id={field.name}
                      name={field.name}
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                    >
                      {field.options.map((option, optIndex) => (
                        <option key={optIndex} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    {errors[field.name] && (
                      <p className="modalError">{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* ======= CAMPO TIPO DATE ======= */}
                {field.type === "date" && (
                  <>
                    <input
                      id={field.name}
                      name={field.name}
                      type="date"
                      value={formData[field.name] || ""}
                      onChange={handleChange}
                    />
                    {errors[field.name] && (
                      <p className="modalError">{errors[field.name]}</p>
                    )}
                  </>
                )}

                {/* ======= OTROS TIPOS (text, email, etc.) ======= */}
                {!["file", "select", "date"].includes(field.type) && (
                  <>
                    <input
                      id={field.name}
                      name={field.name}
                      type={field.type || "text"}
                      value={formData[field.name] || ""}
                      placeholder={field.placeholder || ""}
                      onChange={handleChange}
                    />
                    {errors[field.name] && (
                      <p className="modalError">{errors[field.name]}</p>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Botones del formulario */}
          <div id="modalActions" className="modalActions">
            {/* SIN disabled={!isValidForm}, para comportarse como antes */}
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
