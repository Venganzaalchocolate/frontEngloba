import { DateTime } from 'luxon';


export const formatDatetime=(date)=>{
    const dateAux=DateTime.fromISO(date)
    .toFormat('dd-MM-yyyy HH:mm:ss');
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
