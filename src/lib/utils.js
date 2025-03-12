import { DateTime } from 'luxon';


export const formatDatetime=(date)=>{
    const dateAux=DateTime.fromISO(date)
    .toFormat('dd-MM-yyyy HH:mm:ss');
    return dateAux
}

export const formatDate=(date)=>{
  console.log(date)
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



// Ejemplo en un entorno con bundler (React, Vue, etc.):
import ExcelJS from 'exceljs';


export async function downloadXlsxFromUsers(users) {
  // 1) Crea un nuevo workbook y una hoja llamada "Users"
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Users");

  // 2) Define columnas con encabezados y "keys"
  worksheet.columns = [
    { header: "Nombre",   key: "firstName",  width: 20 },
    { header: "Apellidos",    key: "lastName",   width: 20 },
    { header: "DNI",         key: "dni",        width: 15 },
    { header: "StartDate",   key: "startDate",  width: 15 },
    { header: "Dispositivo",  key: "deviceName", width: 20 },
    { header: "Programa", key: "programName",width: 20 },
    { header: "Puesto",    key: "position",   width: 25 }
  ];

  // 3) Recorre los usuarios y sus periodos, creando filas
  users.forEach((user) => {
    (user.hiringPeriods || []).forEach((period) => {
      // Combina jobName y subcategoryName en una sola cadena, si existen
      let positionValue = "";
      if (period.position) {
        const subcatName = period.position.subcategoryName || "";
        const jobName    = period.position.jobName || "";
        // Ejemplo: "Subcategoría (JobName)", o simplemente uno si el otro no existe
        if (subcatName && jobName) {
          positionValue = `${subcatName} (${jobName})`;
        } else {
          positionValue = subcatName || jobName;  // el que exista
        }
      }

      worksheet.addRow({
        firstName:  user.firstName,
        lastName:   user.lastName,
        dni:        user.dni,
        startDate:  formatDate(period.startDate) || "",
        deviceName: period.device?.deviceName   || "",
        programName: period.device?.programName || "",
        position:   positionValue
      });
    });
  });

  // 4) Genera un ArrayBuffer con el contenido .xlsx
  const buffer = await workbook.xlsx.writeBuffer();

  // 5) Crea un Blob y fuerza la descarga
  const blob = new Blob([buffer], { type: "application/octet-stream" });
  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");
  link.href = url;
  link.download = "listado_de_empleados.xlsx"; 
  document.body.appendChild(link);
  link.click();

  // Limpieza
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
