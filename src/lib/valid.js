import { textErrors } from "./textErrors";

export const validEmail = (email) => {
  // Expresión regular para validar una dirección de correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

export const validPassword = (pass) => {
  if (pass == undefined) return false;
  // Verificar si la contraseña tiene al menos 8 caracteres
  if (pass.length <= 8) return false;
  // Verificar si la contraseña contiene al menos una letra minúscula
  if (!/[a-z]/.test(pass)) return false;
  // Verificar si la contraseña contiene al menos una letra mayúscula
  if (!/[A-Z]/.test(pass)) return false;
  // Verificar si la contraseña contiene al menos un número
  if (!/\d/.test(pass)) return false;
  // Verificar si la contraseña contiene al menos un carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) return false;
  return true;
};

export const validText = (
  texto,
  longitudMinima = 3,
  longitudMaxima = 1000,
  numerosycaracteresespeciales = false
) => {
  // Verificar la longitud del texto
  if (texto.length < longitudMinima || texto.length > longitudMaxima) {
    return false;
  }

  // Definir la expresión regular
  // (Si `numerosycaracteresespeciales` está a true, permitimos letras, números, espacios, y (,.:º)
  const regex = numerosycaracteresespeciales
    ? /^[a-zA-ZÀ-ÿ0-9\s,.'º:/()-]+$/
    : /^[a-zA-ZÀ-ÿ\s]+$/;

  return regex.test(texto);
};

export const validPasswordRepeat = (str1, str2) => {
  return str1 === str2;
};

export const validUser = (respuesta) => {
  if (respuesta.error && respuesta.message.includes("token")) return false;
  return respuesta;
};

export const validJobs = (job) => {
  return true;
};

export const validNumber = (texto) => {
  let regex = /^[1-9][0-9]{8}$/; // 9 dígitos, no empezando por 0
  return regex.test(texto);
};

export const validNumberPercentage = (texto) => {
  let regex = /^(100|[1-9]?[0-9])$/; 
  return regex.test(texto);
};



export const validDecimalNumber = (texto) => {
  const regex = /^[0-9]+(\.[0-9]+)?$/;
  return regex.test(texto);
};



export const validCategory = (categorias, texto) => {
  const texAux =
    texto.replace(/\s+/g, "").charAt(0).toUpperCase() +
    texto.slice(1).toLowerCase();
  return categorias.includes(texAux);
};

export const validateDNIorNIE = (value) => {
  // Eliminar espacios y convertir a mayúsculas
  value = value.trim().toUpperCase();

  // Expresiones regulares
  const dniPattern = /^[0-9]{8}[A-Z]$/;
  const niePattern = /^[XYZ][0-9]{7}[A-Z]$/;

  // Array de letras para el cálculo
  const letras = [
    "T",
    "R",
    "W",
    "A",
    "G",
    "M",
    "Y",
    "F",
    "P",
    "D",
    "X",
    "B",
    "N",
    "J",
    "Z",
    "S",
    "Q",
    "V",
    "H",
    "L",
    "C",
    "K",
    "E",
  ];

  // DNI
  if (dniPattern.test(value)) {
    const dniNumber = parseInt(value.substring(0, 8), 10);
    const dniLetter = value.charAt(8);
    return dniLetter === letras[dniNumber % 23];
  }

  // NIE
  if (niePattern.test(value)) {
    let nieNumber = value.substring(1, 8);
    const nieLetter = value.charAt(8);
    const niePrefix = value.charAt(0);

    switch (niePrefix) {
      case "X":
        nieNumber = "0" + nieNumber;
        break;
      case "Y":
        nieNumber = "1" + nieNumber;
        break;
      case "Z":
        nieNumber = "2" + nieNumber;
        break;
    }
    const nieNumberInt = parseInt(nieNumber, 10);
    return nieLetter === letras[nieNumberInt % 23];
  }

  return false; // no cumple ni DNI ni NIE
};

export const validateBankAccount = (iban) => {
  iban = iban.replace(/\s+/g, "").toUpperCase();
  if (iban.length !== 24) return false;
  const ibanPattern = /^ES\d{22}$/;
  if (!ibanPattern.test(iban)) return false;

  // Mover 4 chars al final
  const rearrangedIban = iban.slice(4) + iban.slice(0, 4);
  const numericIban = rearrangedIban.replace(/[A-Z]/g, (match) => match.charCodeAt(0) - 55);

  const ibanMod97 = BigInt(numericIban) % 97n;
  return ibanMod97 === 1n;
};

export const validateSocialSecurityNumber = (ssn) => {
  return true
};

export const parseIfInteger = (str) => {
  const num = parseInt(str, 10);
  if (!isNaN(num) && num.toString() === str) {
    return num;
  }
  return false;
};

export const validMonth = (str) => {
  const num = parseIfInteger(str);
  if (!num) return false;
  if (num < 1 || num > 12) return false;
  return true;
};

export const validYear = (str) => {
  const num = parseIfInteger(str);
  if (!num) return false;
  const currentYear = new Date().getFullYear();
  if (num < currentYear - 5 || num > currentYear) return false;
  return true;
};

export const isNotFutureDate = (month, year) => {
  if (year == null || month == null) return false;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();

  if (year > currentYear) {
    return false;
  }
  if (year === currentYear && month > currentMonth) {
    return false;
  }
  return true;
};

export const isNotFutureDateString = (dateString) => {
  if (!dateString) return false;

  const parts = dateString.split(/[-/]/);
  if (parts.length !== 2) return false;
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return false;
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  if (year > currentYear) return false;
  if (year === currentYear && month > currentMonth) return false;

  return true;
};

export const isNotFutureDateStringMsg = (dateString) => {
  if (!dateString) return false;

  const parts = dateString.split(/[-/]/);
  if (parts.length !== 2) return textErrors('oldDate');
  const year = parseInt(parts[0], 10);
  const month = parseInt(parts[1], 10);

  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return textErrors('oldDate');
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1;

  if (year > currentYear) return false;
  if (year === currentYear && month > currentMonth) return textErrors('oldDate');

  return true;
};

export function validateField(value, rules = {}) {
  // 1) normaliza si hace falta
  const normalized = typeof rules.normalize === 'function' ? rules.normalize(value) : value;
  const v = (normalized ?? '').toString().trim();

  // 2) reglas genéricas
  if (rules.required && v.length === 0) return rules.messages?.required ?? 'Campo obligatorio';
  if (rules.minLength && v.length < rules.minLength)
    return rules.messages?.minLength ?? `Mínimo ${rules.minLength} caracteres`;
  if (rules.maxLength && v.length > rules.maxLength)
    return rules.messages?.maxLength ?? `Máximo ${rules.maxLength} caracteres`;
  if (rules.pattern && !rules.pattern.test(v))
    return rules.messages?.pattern ?? 'Formato inválido';

  // 3) validadores encadenados (usa tus funciones)
  if (Array.isArray(rules.validators)) {
    for (const { test, message } of rules.validators) {
      try {
        const ok = test(v);
        if (!ok) return message || 'Valor inválido';
      } catch {
        return message || 'Valor inválido';
      }
    }
  }

  // 4) custom único que devuelva string (error) o null (ok)
  if (typeof rules.custom === 'function') {
    const msg = rules.custom(v);
    if (msg) return msg;
  }
  return null;
}

export function validateForm(values, schema, only = null) {
  const errors = {};
  const keys = Array.isArray(only) ? only : Object.keys(schema);
  for (const key of keys) {
    const msg = validateField(values[key], schema[key]);
    if (msg) errors[key] = msg;
  }
  return { errors, valid: Object.keys(errors).length === 0 };
}