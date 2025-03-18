import { DateTime } from 'luxon';


export const formatDatetime=(date)=>{
    const dateAux=DateTime.fromISO(date)
    .toFormat('dd-MM-yyyy HH:mm:ss');
    return dateAux
}

export const formatDate=(date)=>{
    const dateAux=DateTime.fromISO(date)
    .toFormat('dd-MM-yyyy');
    return dateAux
}

export const deepClone = (obj) => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Si es una instancia de File, la devolvemos tal cual (no clonamos)
    if (obj instanceof File) {
        return obj;
    }

    const copy = Array.isArray(obj) ? [] : {};
    for (const key in obj) {
        if (obj.hasOwnProperty(key)) {
            copy[key] = deepClone(obj[key]);  // Recursión para copiar sub-objetos
        }
    }
    return copy;
};

export const splitName=(fullName)=>{
    // Quitar espacios sobrantes al inicio y al final
    const trimmed = fullName.trim();
  
    // Dividir por espacios (uno o más)
    const parts = trimmed.split(/\s+/);
  
    // El primer elemento será el "firstName"
    const firstName = parts.shift() || "";
  
    // El resto de las partes (si las hay) se unen como "lastName"
    const lastName = parts.join(" ") || "";
  
    return { firstName, lastName };
  }

  export const  getJobIdFromNameOffer=(nameOffer, jobsIndex)=>{
    if (!nameOffer) return null;
  
    // 1) Separar la parte antes del guion si existe
    //    "Atención Sociosanitaria - Almería Norte"
    //    => ["Atención Sociosanitaria", "Almería Norte"]
    const [jobName] = nameOffer.split("-").map((x) => x.trim());
    // jobName = "Atención Sociosanitaria"
  
    // 2) Buscar en jobsIndex un objeto cuyo job.name coincida EXACTAMENTE
    //    con jobName
    //    Object.entries(jobsIndex) => [ [key, {name, _id}], [key2, {name, _id}]... ]
    const found = Object.entries(jobsIndex).find(
      ([, job]) => job.name === jobName
    );
  
    if (!found) {
      // No se encontró trabajo con ese nombre
      return null;
    }
  
    // found = [ "66a765e946af20840262d1da", { name:"Atención Sociosanitaria", ... } ]
    // El primer elemento del array es la key (ID)
    const jobId = found[0];
    return jobId;
  }

  export function capitalizeWords(str) {
    return str
      .split(' ')                     // Separa el string en palabras
      .map(word => 
        word.length > 0 
          ? word[0].toUpperCase() + word.slice(1).toLowerCase() 
          : word
      )
      .join(' ');                     // Une las palabras de nuevo en un string
  }


