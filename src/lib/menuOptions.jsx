import { FaUserAlt, FaUserCog } from "react-icons/fa";
import { FaBriefcase, FaChartLine, FaClipboardList, FaPuzzlePiece, FaRegAddressBook, FaToolbox, FaUsers, FaUserShield } from "react-icons/fa6";


/**
 * Devuelve opciones según rol/responsabilidades SIN JSX.
 * icon: referencia a componente (p.ej. FaUsers), NO <FaUsers />
 */
export function getMenuOptions({ role, listResponsability = null } = {}) {
  const base = [
    { key: 'myself',     label: 'Mis datos',               icon: FaUserAlt,        accent: '#0ea5e9' },
  ];

  const global = [
    { key: 'employer',   label: 'Gestionar empleados',     icon: FaUsers,          accent: '#8b5cf6' },
    { key: 'cv',         label: 'Solicitudes de empleo',   icon: FaClipboardList,  accent: '#10b981' },
    { key: 'offersJobs', label: 'Gestionar ofertas',       icon: FaBriefcase,      accent: '#f59e0b' },
    // { key: 'socialForm', label: 'Impacto social',          icon: FaChartLine,      accent: '#22c55e' },
    // { key: 'auditor',    label: 'Auditoría',               icon: FaUserShield,     accent: '#ef4444' },
    // { key: 'programs',   label: 'Programas y dispositivos',icon: FaPuzzlePiece,    accent: '#06b6d4' },
    { key: 'lists', label: 'Listín de contacto', icon: FaRegAddressBook, accent: '#64748b' },
  ];

  const rootOnly = [
    { key: 'root',       label: 'Panel Root',              icon: FaToolbox,        accent: '#d946ef' },
    { key: 'workspace',  label: 'Gestión de Workspace',    icon: FaUserCog,        accent: '#4ade80' },
    { key: 'programs',   label: 'Programas y dispositivos',icon: FaPuzzlePiece,    accent: '#06b6d4' },
  ];

  if (role === 'root')   return [...global, ...rootOnly, ...base];
  if (role === 'global') return [...global, ...base];

  const hasResp = Array.isArray(listResponsability)
    ? listResponsability.length > 0
    : !!(listResponsability && listResponsability.length > 0);

  return hasResp ? [...base, ...global] : base;
}

