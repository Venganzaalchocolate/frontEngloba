import { DateTime } from 'luxon';
import { useState, useEffect } from 'react';


export const formatDatetime = (date) => {
  const dateAux = DateTime.fromISO(date)
    .toFormat('dd-MM-yyyy HH:mm:ss');
  return dateAux
}

export const formatDate = (date) => {
  const dateAux = DateTime.fromISO(date)
  if(dateAux?.invalid) return 'No disponible'
  else return dateAux.toFormat('dd-MM-yyyy');
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

export const splitName = (fullName) => {
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

export const getJobIdFromNameOffer = (nameOffer, jobsIndex) => {
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


export function calcularTiempoRestante(dateString, durationDays) {
  const fechaExpedicion = new Date(dateString);
  const fechaVencimiento = new Date(
    fechaExpedicion.getTime() + durationDays * 24 * 60 * 60 * 1000
  );

  // "Hoy" sin horas
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);

  // Fecha de vencimiento sin horas
  fechaVencimiento.setHours(0, 0, 0, 0);

  // Si el documento ya venció
  if (fechaVencimiento <= hoy) {
    return "El documento ya venció o vence hoy";
  }

  // Diferencias iniciales
  let anios = fechaVencimiento.getFullYear() - hoy.getFullYear();
  let meses = fechaVencimiento.getMonth() - hoy.getMonth();
  let dias = fechaVencimiento.getDate() - hoy.getDate();

  // Ajustes
  if (dias < 0) {
    meses -= 1;
    const mesAnterior = new Date(
      fechaVencimiento.getFullYear(),
      fechaVencimiento.getMonth(),
      0
    ).getDate();
    dias = mesAnterior + dias;
  }

  if (meses < 0) {
    anios -= 1;
    meses += 12;
  }

  // Construcción del mensaje
  const partes = [];
  if (anios > 0) partes.push(`${anios} año${anios > 1 ? "s" : ""}`);
  if (meses > 0) partes.push(`${meses} mes${meses > 1 ? "es" : ""}`);
  if (dias > 0) partes.push(`${dias} día${dias > 1 ? "s" : ""}`);

  return partes.length ? partes.join(" ") : "Menos de un día restante";
}

export const obtenerNombreMes = (numeroMes) => {
  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  if (numeroMes >= 1 && numeroMes <= 12) {
    return meses[numeroMes - 1];
  } else {
    return "Número de mes inválido";
  }
}

export default function useDebounce(value, delay = 400) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);

  return debounced;
}



// ————————————————————————————————————————————————————————————————————————
// UTIL: Construir email de Workspace para un usuario
//    basándose en firstName.lastName@DOMAIN
// ————————————————————————————————————————————————————————————————————————

export const DOMAIN = 'engloba.org.es';

export function buildUserEmail(user) {
  const first = (user.firstName || '').trim().toLowerCase();
  const last = (user.lastName || '').trim().toLowerCase();
  const normalizedFirst = first
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
  const normalizedLast = last
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
  return `${normalizedFirst}.${normalizedLast}@${DOMAIN}`;
}

export function formatESPhone(value) {
  if (value == null) return "";

  // 1) Solo dígitos
  let d = String(value).replace(/\D+/g, "");

  // 2) Quita prefijo internacional español opcional: +34, 0034, 34
  d = d.replace(/^(?:00)?34/, "");

  // 3) Nos quedamos con máximo 9 dígitos (formato nacional)
  d = d.slice(0, 9);

  // 4) Agrupar 3-2-2-2 de forma progresiva (mientras se escribe)
  const parts = [];
  if (d.length > 0) parts.push(d.slice(0, Math.min(3, d.length)));
  if (d.length > 3) parts.push(d.slice(3, Math.min(5, d.length)));
  if (d.length > 5) parts.push(d.slice(5, Math.min(7, d.length)));
  if (d.length > 7) parts.push(d.slice(7, Math.min(9, d.length)));

  return parts.join(" ");
}


export function compact(s) {
  if (typeof s !== 'string' && !(s instanceof String)) return '';
  const txt = String(s);
  return txt
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9 ]/g, ' ')       // deja solo letras/números/espacio
    .trim()
    .split(/\s+/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

export const buildOptionsFromIndex = (idx, { onlySub = false } = {}) => {
  if (!idx || typeof idx !== "object") return [];

  // Claves a excluir cuando NO usamos onlySub
  const EXCLUDED_KEYS = new Set([
    "66a7366208bebc63c0f8992d", // Almería (root)
    "66a7369b08bebc63c0f89a05", // Málaga (root)
  ]);

  return Object.entries(idx)
    .filter(([key, obj]) => {
      if (onlySub) {
        // Solo subcategorías marcadas con isSub
        return !!obj?.isSub;
      }

      // Caso general: excluir las raíces por key
      if (EXCLUDED_KEYS.has(String(key))) return false;

      return true;
    })
    .map(([value, obj]) => ({
      value,
      label: obj?.name || "(sin nombre)",
    }))
    .sort((a, b) =>
      a.label.localeCompare(b.label, "es", { sensitivity: "base" })
    );
};

  export const sanitize = (text) =>
  String(text || "")
    .normalize("NFD")                          // quitar acentos
    .replace(/[\u0300-\u036f]/g, "")           // limpiar caracteres combinados
    .replace(/[^a-zA-Z0-9_\-]/g, "_")          // solo permitir A-Z 0-9 _ -
    .replace(/_+/g, "_")                       // evitar ___ repetidos
    .trim()
    .slice(0, 60);                             // límite razonable
