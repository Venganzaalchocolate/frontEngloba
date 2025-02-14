import { useEffect, useState } from "react";
import styles from '../styles/infoEmployer.module.css';
import { FaEdit } from "react-icons/fa";
import {
  validateBankAccount,
  validateDNIorNIE,
  validateSocialSecurityNumber,
  validEmail,
  validNumber,
  validText
} from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { getToken } from "../../lib/serviceToken";
import { editUser } from "../../lib/data";
import { deepClone } from "../../lib/utils";
import { useLogin } from '../../hooks/useLogin';

const InfoEmployer = ({ user, modal, charge, changeUser, listResponsability, enumsData, chargeUser=()=>{}}) => {
  // Convertimos fostered boolean a "si"/"no" en el estado inicial
  const initialState = {
    ...user,
    fostered: user.fostered ? 'si' : 'no',
    apafa: user.apafa ? 'si' : 'no',
  };

  // Guardamos una copia inmutable para saber cómo estaban los datos antes de editar
  const [originalData] = useState(() => deepClone(initialState));

  const [isEditing, setIsEditing] = useState(false);
  const [datos, setDatos] = useState(initialState);
  const [errores, setErrores] = useState({});
  const { logged, changeLogged } = useLogin();

  // --- FUNCIONES AUXILIARES ---
  // Cancelar edición: revertir a los datos originales
  const reset = () => {
    setErrores({});
    setIsEditing(false);
    setDatos(deepClone(originalData));
  };

  // Manejo de cambios en campos
  const handleChange = (e) => {
    const { name, value } = e.target;
    const auxErrores = { ...errores };
    const auxDatos = { ...datos };

    auxErrores['mensajeError'] = null;
    let valido = true;

    if (name.includes('.')) {
      // Manejo de campos anidados (ej: "disability.percentage")
      const [parentKey, childKey] = name.split('.');
      if (!auxDatos[parentKey]) {
        auxDatos[parentKey] = {};
      }
      auxDatos[parentKey][childKey] = value;

      // Validación para disability.percentage
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
      if (errores[key] != null && datos[key] !== '') {
        return false;
      }
    }

    // Campos requeridos básicos
    if (!datos.firstName) newErrors.firstName = 'El nombre es requerido.';
    if (!datos.email) newErrors.email = 'El email es requerido.';
    if (!datos.phone) newErrors.phone = 'El teléfono es requerido.';

    setErrores(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Determina qué campos se han modificado comparando "datos" vs "originalData"
  // y mapeando disability -> disPercentage / disNotes
  const getModifiedFields = () => {
    const changed = {};

    // Campos simples
    const fieldsToCompare = [
      'firstName','lastName','dni','email','phone',
      'employmentStatus','socialSecurityNumber','bankAccountNumber',
      'gender','fostered', 'apafa'
    ];

    fieldsToCompare.forEach(field => {
      if (datos[field] !== originalData[field]) {
        changed[field] = datos[field];
      }
    });

    // Para disability, se separan en disPercentage y disNotes
    const oldPercentage = originalData.disability?.percentage || '';
    const oldNotes = originalData.disability?.notes || '';
    const newPercentage = datos.disability?.percentage || '';
    const newNotes = datos.disability?.notes || '';

    if (newPercentage !== oldPercentage) {
      changed.disPercentage = newPercentage;
    }
    if (newNotes !== oldNotes) {
      changed.disNotes = newNotes;
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
      modal('Editar Usuario', 'Usuario editado con éxito');
      if(logged.user==user) changeLogged(response);
      chargeUser();
    } else {
      reset();
      modal('Error al editar', response.message);
    }

    charge(false);
  };

  // Botón de edición/guardado
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

  // Campos de texto principales
  const textFields = [
    ['firstName', 'Nombre'],
    ['lastName', 'Apellidos'],
    ['dni', 'DNI'],
    ['email', 'Email'],
    ['phone', 'Teléfono'],
    ['employmentStatus', 'Estado Laboral'],
    ['socialSecurityNumber', 'Número de Seguridad Social'],
    ['bankAccountNumber', 'Número de Cuenta Bancaria'],
  ];

  return (
    <div className={styles.contenedor}>
      <h2>DATOS {boton()}</h2>
      
      {/* Renderizado de campos simples */}
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
          value={(datos.fostered) || 'no'}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        {errores.fostered && <span className="errorSpan">{errores.fostered}</span>}
      </div>

      <div>
        <label htmlFor="apafa">Apafa</label>
        <select
          id="apafa"
          name="apafa"
          value={datos.apafa || 'no'}
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
