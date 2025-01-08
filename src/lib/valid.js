
export const validEmail = (email) => {
  // Expresión regular para validar una dirección de correo electrónico
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  // Verificar si el correo electrónico coincide con la expresión regular
  return emailRegex.test(email);
};

export const validPassword = (pass) => {
  if (pass == undefined) return false
  // Verificar si la contraseña tiene al menos 8 caracteres
  if (pass.length <= 8) {
    return false;
  }

  // Verificar si la contraseña contiene al menos una letra minúscula
  if (!/[a-z]/.test(pass)) {
    return false;
  }
  // Verificar si la contraseña contiene al menos una letra mayúscula
  if (!/[A-Z]/.test(pass)) {
    return false;
  }
  // Verificar si la contraseña contiene al menos un número
  if (!/\d/.test(pass)) {
    return false;
  }
  // Verificar si la contraseña contiene al menos un carácter especial
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pass)) {
    return false;
  }
  // La contraseña cumple con todos los criterios
  return true;
};

export const validText=(texto, longitudMinima, longitudMaxima, numerosycaracteresespeciales=false)=>{
  // Verificar la longitud del texto
  if (texto.length < longitudMinima || texto.length > longitudMaxima) {
      return false;
  }

  // Definir la expresión regular para caracteres permitidos (letras, números y espacios)
  const regex =(numerosycaracteresespeciales) ?/^[a-zA-ZÀ-ÿ0-9\s,.º:/()-]+$/:/^[a-zA-ZÀ-ÿ\s]+$/;
  return regex.test(texto);
}

export const validPasswordRepeat=(str1,str2)=>{
  return str1 === str2;
}

export const validUser=(respuesta)=>{
  if(respuesta.error && respuesta.message.includes('token')) return false;
  return respuesta
}


export const validJobs=(job)=>{
  return true
}

export const validNumber = (texto) => {
  let regex = /^[1-9][0-9]{8}$/;
  return regex.test(texto);
}

export const validDecimalNumber=(texto)=>{
  const regex =/^[0-9]+(\.[0-9]+)?$/;
  return regex.test(texto);
}

export const validCategory=(categorias, texto)=>{
  const texAux=texto.replace(/\s+/g, '').charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
  return categorias.includes(texAux)
}

export const validateDNIorNIE = (value) => {
  // Eliminar posibles espacios o guiones y convertir a mayúsculas
  value = value.trim().toUpperCase();

  // Expresión regular para validar formato
  const dniPattern = /^[0-9]{8}[A-Z]$/;
  const niePattern = /^[XYZ][0-9]{7}[A-Z]$/;

  // Array de letras correctas para el DNI/NIE
  const letras = ['T', 'R', 'W', 'A', 'G', 'M', 'Y', 'F', 'P', 'D', 'X', 'B', 'N', 'J', 'Z', 'S', 'Q', 'V', 'H', 'L', 'C', 'K', 'E'];

  // Si es un DNI
  if (dniPattern.test(value)) {
      const dniNumber = parseInt(value.substring(0, 8), 10); // Extraemos los 8 dígitos
      const dniLetter = value.charAt(8); // Extraemos la letra final
      return dniLetter === letras[dniNumber % 23]; // Validamos si la letra es correcta
  }

  // Si es un NIE
  if (niePattern.test(value)) {
      let nieNumber = value.substring(1, 8); // Extraemos los 7 dígitos
      const nieLetter = value.charAt(8); // Extraemos la letra final
      const niePrefix = value.charAt(0); // Letra inicial (X, Y, Z)

      // Convertimos el prefijo del NIE a un número equivalente
      switch (niePrefix) {
          case 'X':
              nieNumber = '0' + nieNumber;
              break;
          case 'Y':
              nieNumber = '1' + nieNumber;
              break;
          case 'Z':
              nieNumber = '2' + nieNumber;
              break;
      }

      const nieNumberInt = parseInt(nieNumber, 10);
      return nieLetter === letras[nieNumberInt % 23]; // Validamos si la letra es correcta
  }

  // Si no cumple el formato de DNI o NIE, es inválido
  return false;
};

export const validateBankAccount = (iban) => {
  // Eliminar espacios en blanco y convertir a mayúsculas
  iban = iban.replace(/\s+/g, '').toUpperCase();

  // Comprobar si el IBAN tiene la longitud correcta (24 caracteres)
  if (iban.length !== 24) return false;

  // Comprobar si el IBAN empieza por "ES" (España) y si los caracteres son válidos
  const ibanPattern = /^ES\d{22}$/;
  if (!ibanPattern.test(iban)) return false;

  // Mover los 4 primeros caracteres al final
  const rearrangedIban = iban.slice(4) + iban.slice(0, 4);

  // Convertir letras en números: A=10, B=11, ..., Z=35
  const numericIban = rearrangedIban.replace(/[A-Z]/g, (match) => match.charCodeAt(0) - 55);

  // Validar si el IBAN es divisible por 97
  const ibanMod97 = BigInt(numericIban) % 97n;

  // El IBAN es válido si el resultado es 1
  return ibanMod97 === 1n;
};

export const validateSocialSecurityNumber = (ssn) => {
  // Eliminar posibles espacios en blanco
  ssn = ssn.replace(/\s+/g, '');

  // Comprobar si el número tiene entre 10 y 12 dígitos
  if (!/^\d{10,12}$/.test(ssn)) {
      return false;
  }

  // Extraer los números de la Seguridad Social y los dígitos de control
  const baseNumber = ssn.slice(0, -2); // Primeros 8-10 dígitos
  const controlDigits = parseInt(ssn.slice(-2), 10); // Últimos dos dígitos de control

  // Calcular el número de control correcto
  const expectedControlDigits = parseInt(baseNumber) % 97;

  // El número es válido si los dígitos de control coinciden con el cálculo
  return controlDigits === expectedControlDigits;
};


export const parseIfInteger = (str) => {
  const num = parseInt(str, 10);

  // Verificar si es un número entero y si coincide con el string original
  if (!isNaN(num) && num.toString() === str) {
      return num;  // Devolver el número parseado
  }
  
  return false;  // Si no es un entero, devolver false
};

export const validMonth=(str)=>{
  const num=parseIfInteger(str)
  if(!num) return num
  if(num<1 || num>12) return false
  else return true
}

export const validYear=(str)=>{
  const num=parseIfInteger(str)
  if(!num) return num
  const currentYear = new Date().getFullYear();
  if(num<(currentYear-5) || num>currentYear) return false
  else return true
}

export const isNotFutureDate=(month, year)=>{
  if(year==null || month==null) return false;
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1; // Los meses en JavaScript son de 0 a 11
  const currentYear = currentDate.getFullYear();

  // Verificar si el año es posterior al actual
  if (year > currentYear) {
    return false;
  }

  // Si el año es el actual, verificar el mes
  if (year === currentYear && month > currentMonth) {
    return false;
  }

  return true;
}


export const isNotFutureDateString = (dateString) => {
  // Validar que el string no esté vacío
  if (!dateString) return false;

  // Intentar dividir el string en partes de fecha (asumiendo formato "YYYY-MM" o "YYYY/MM")
  const parts = dateString.split(/[-/]/); // Separar por '-' o '/'
  if (parts.length !== 2) return false; // Esperamos exactamente dos partes (año y mes)

  const year = parseInt(parts[0], 10); // Convertir el año a entero
  const month = parseInt(parts[1], 10); // Convertir el mes a entero

  // Validar que los números sean válidos
  if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
    return false; // Mes inválido o números no válidos
  }

  const currentDate = new Date();
  const currentYear = currentDate.getFullYear();
  const currentMonth = currentDate.getMonth() + 1; // Los meses van de 0 a 11

  // Verificar si el año es posterior al actual
  if (year > currentYear) {
    return false;
  }

  // Si el año es el actual, verificar el mes
  if (year === currentYear && month > currentMonth) {
    return false;
  }

  return true; // Es una fecha válida y no está en el futuro
};
