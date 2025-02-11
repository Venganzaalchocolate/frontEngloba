import { useEffect, useState } from "react";
import styles from '../styles/infoEmployer.module.css';
import { FaEdit } from "react-icons/fa";
import {
  validateBankAccount,
  validateDNIorNIE,
  validateSocialSecurityNumber,
  validEmail,
  validNumber,
  validPassword,
  validText
} from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { getToken } from "../../lib/serviceToken";
import { editUser } from "../../lib/data";
import { deepClone } from "../../lib/utils";
import { useLogin } from '../../hooks/useLogin';

const InfoEmployer = ({ user, modal, charge, changeUser, listResponsability, enumsData }) => {
  // Convertimos el campo "fostered" boolean a "si"/"no" para manejarlo en el frontend como string
  const initialState = {
    ...user,
    fostered: user.fostered ? 'si' : 'no'  // Aseguramos que siempre sea 'si' o 'no'
  };

  const [isEditing, setIsEditing] = useState(false);      // Modo edición
  const [datos, setDatos] = useState(initialState);       // Estado local para los datos (incluye fostered='si'|'no')
  const [errores, setErrores] = useState({});             // Errores locales
  const { logged } = useLogin();

  // Maneja cambios en los campos
  const handleChange = (e) => {
    let { name, value, type, checked } = e.target;
    let auxErrores = { ...errores };
    let auxDatos = { ...datos };
    auxErrores['mensajeError'] = null;
    let valido = true; // Suponemos que es válido hasta que alguna validación falle.

    // Si es un select de fostered, simplemente asignamos el valor "si" / "no"
    // Si es un checkbox (si tuvieras alguno más), haríamos:
    // if (type === 'checkbox') { ... } -- pero aquí no lo necesitamos para fostered
    // Manejamos anidación en fields (p.ej. disability.percentage)
    if (name.includes('.')) {
      const [parentKey, childKey] = name.split('.');
      if (!auxDatos[parentKey]) {
        auxDatos[parentKey] = {};
      }
      auxDatos[parentKey][childKey] = value;

      // Validaciones específicas para disability.percentage
      if (parentKey === 'disability' && childKey === 'percentage') {
        valido = validNumber(value);
        auxErrores[name] = valido ? null : textErrors('disPercentage');
      }
    } else {
      // Validaciones de nivel superior
      if (name === 'firstName') {
        valido = validText(value, 3, 100);
        auxErrores[name] = !valido ? textErrors(name) : null;
      } else if (name === 'email') {
        valido = validEmail(value);
        auxErrores[name] = !valido ? textErrors(name) : null;
      } else if (name === 'phone') {
        valido = validNumber(value);
        auxErrores[name] = !valido ? textErrors(name) : null;
      } else if (name === 'dni') {
        if (value !== '') {
          valido = validateDNIorNIE(value);
          auxErrores[name] = !valido ? textErrors(name) : null;
        } else {
          auxErrores[name] = null;
        }
      } else if (name === 'bankAccountNumber') {
        if (value !== '') {
          valido = validateBankAccount(value);
          auxErrores[name] = !valido ? textErrors(name) : null;
        } else {
          auxErrores[name] = null;
        }
      } else if (name === 'socialSecurityNumber') {
        if (value !== '') {
          valido = validateSocialSecurityNumber(value);
          auxErrores[name] = !valido ? textErrors(name) : null;
        } else {
          auxErrores[name] = null;
        }
      } else if (name === 'pass') {
        if (value !== '') {
          valido = validPassword(value);
          auxErrores[name] = !valido ? textErrors(name) : null;
        } else {
          auxErrores[name] = null;
        }
      } else {
        // 'gender', 'fostered', etc. sin validaciones específicas
        auxErrores[name] = null;
      }
      auxDatos[name] = value;
    }

    setDatos(auxDatos);
    setErrores(auxErrores);
  };

  // Validar campos requeridos
  const validateFields = () => {
    const newErrors = {};

    // Si hay errores activos en 'errores', retornamos false
    for (let key in errores) {
      if (errores[key] != null && datos[key] !== '') {
        return false;
      }
    }

    if (!datos.firstName) newErrors.firstName = 'El nombre es requerido.';
    if (!datos.email) newErrors.email = 'El email es requerido.';
    if (!datos.phone) newErrors.phone = 'El teléfono es requerido.';

    setErrores(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Cambiar modo edición
  const handleEdit = () => {
    setIsEditing(!isEditing);
  };

  // Guardar
  const handleSave = async () => {
    if (validateFields()) {
      setIsEditing(false);
      charge(true);

      // En este punto 'datos.fostered' es "si" o "no".
      // Se envía tal cual al back. El back lo procesará a true/false.
      const token = getToken();
      const response = await editUser(datos, token);
      if (!response.error) {
        changeUser(datos);
      }
      modal('Editar Usuario', 'Usuario editado con éxito');
      charge(false);
    }
  };

  // Cancelar edición
  const reset = () => {
    setErrores({});
    setIsEditing(false);
    // Restauramos al usuario original (convirtiéndolo otra vez a si/no)
    setDatos({
      ...user,
      fostered: user.fostered ? 'si' : 'no'
    });
  };

  // Botón editar/guardar
  const boton = () => {
    if (!!listResponsability && listResponsability.length < 1) return '';
    return !isEditing ? (
      <FaEdit onClick={handleEdit} />
    ) : (
      <>
        <button onClick={handleSave}>Guardar</button>
        <button onClick={reset}>Cancelar</button>
      </>
    );
  };

  // Campos de texto top-level
  const textFields = [
    ['firstName', 'Nombre'],
    ['lastName', 'Apellidos'],
    ['dni', 'DNI'],
    ['email', 'Email'],
    ['phone', 'Teléfono'],
    ['employmentStatus', 'Estado Laboral'],
    ['socialSecurityNumber', 'Número de Seguridad Social'],
    ['bankAccountNumber', 'Número de Cuenta Bancaria']
  ];

  return (
    <div className={styles.contenedor}>
      <h2>DATOS {boton()}</h2>
      
      {/* Campos simples */}
      {textFields.map(([fieldName, label]) => (
        <div key={fieldName}>
          <label htmlFor={fieldName}>{label}</label>
          {(fieldName === 'employmentStatus' &&
            (logged.user.role === 'global' || logged.user.role === 'root')) ? (
            <select
              id={fieldName}
              name={fieldName}
              value={datos[fieldName] || ''}
              onChange={handleChange}
              disabled={!isEditing}
            >
              {enumsData.status.map((x) => (
                <option value={x} key={x}>{x}</option>
              ))}
            </select>
          ) : (
            <input
              type="text"
              id={fieldName}
              name={fieldName}
              value={datos[fieldName] || ''}
              onChange={handleChange}
              disabled={fieldName === 'employmentStatus' ? true : !isEditing}
            />
          )}
          {errores[fieldName] && (
            <span className="errorSpan">{errores[fieldName]}</span>
          )}
        </div>
      ))}

      {/* Género */}
      <div>
        <label htmlFor="gender">Género</label>
        <select
          id="gender"
          name="gender"
          value={datos.gender || ''}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="">Seleccionar</option>
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
        </select>
        {errores.gender && <span className="errorSpan">{errores.gender}</span>}
      </div>

      {/* Extutelado: select "si" / "no" */}
      <div>
        <label htmlFor="fostered">Extutelado</label>
        <select
          id="fostered"
          name="fostered"
          value={datos.fostered || 'no'}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        {errores.fostered && <span className="errorSpan">{errores.fostered}</span>}
      </div>

      {/* Mostrar u ocultar campos de discapacidad:
          - Si estamos editando, siempre.
          - Si no estamos editando, solo si el porcentaje > 0
      */}
      {(isEditing || (datos?.disability?.percentage || 0) > 0) && (
        <>
          <div>
            <label htmlFor="disability.percentage">Porcentaje de Discapacidad</label>
            <input
              type="number"
              id="disability.percentage"
              name="disability.percentage"
              value={datos?.disability?.percentage || ''}
              onChange={handleChange}
              disabled={!isEditing}
            />
            {errores['disability.percentage'] && (
              <span className="errorSpan">{errores['disability.percentage']}</span>
            )}
          </div>

          <div>
            <label htmlFor="disability.notes">Notas sobre la discapacidad</label>
            <input
              type="text"
              id="disability.notes"
              name="disability.notes"
              value={datos?.disability?.notes || ''}
              onChange={handleChange}
              disabled={!isEditing}
            />
            {errores['disability.notes'] && (
              <span className="errorSpan">{errores['disability.notes']}</span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default InfoEmployer;
