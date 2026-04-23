import { FaUserAlt, FaUserCog } from "react-icons/fa";
import { FaBriefcase, FaChartLine, FaClipboardList, FaPuzzlePiece, FaRegAddressBook, FaToolbox, FaUsers, FaUserShield, FaLock  } from "react-icons/fa6";
import { MdOutlineVolunteerActivism } from "react-icons/md";

import { FaHubspot } from "react-icons/fa";
/**
 * Devuelve opciones según rol/responsabilidades SIN JSX.
 * icon: referencia a componente (p.ej. FaUsers), NO <FaUsers />
 */
export function getMenuOptions({ role, listResponsability = null } = {}) {
  const base = [
    { key: 'myself',     label: 'Mis datos',               icon: FaUserAlt,        accent: '#0ea5e9' },
  ];

  const rrhh=[
    { key: 'cv',         label: 'Solicitudes de empleo',   icon: FaClipboardList,  accent: '#10b981' },
    { key: 'employer',   label: 'Gestionar empleados',     icon: FaUsers,          accent: '#8b5cf6' },
    { key: 'offersJobs', label: 'Gestionar ofertas',       icon: FaBriefcase,      accent: '#f59e0b' },
    { key: 'organizationChart', label:'Organigrama', icon:FaHubspot, accent: '#066dd4'},
    { key: 'socialForm', label: 'Impacto social',          icon: FaChartLine,      accent: '#22c55e' },
    { key: 'auditor',    label: 'Auditoría',               icon: FaUserShield,     accent: '#ef4444' },
  ]

  const resp=[
    { key: 'employer',   label: 'Gestionar empleados',     icon: FaUsers,          accent: '#8b5cf6' },
    { key: 'cv',         label: 'Solicitudes de empleo',   icon: FaClipboardList,  accent: '#10b981' },
    { key: 'offersJobs', label: 'Gestionar ofertas',       icon: FaBriefcase,      accent: '#f59e0b' },
    { key: 'socialForm', label: 'Impacto social',          icon: FaChartLine,      accent: '#22c55e' },
    { key: 'programs',   label: 'Programas y dispositivos',icon: FaPuzzlePiece,    accent: '#06b6d4' },
    { key: 'volunteer', label: 'Voluntariado', icon: MdOutlineVolunteerActivism, accent: '#ffb5de' },
    { key: 'organizationChart', label:'Organigrama', icon:FaHubspot, accent: '#066dd4'}
  ]

  const auditor=[
    { key: 'auditor',    label: 'Auditoría',               icon: FaUserShield,     accent: '#ef4444' },
    { key: 'employer',   label: 'Gestionar empleados',     icon: FaUsers,          accent: '#8b5cf6' },
    { key: 'programs',   label: 'Programas y dispositivos',icon: FaPuzzlePiece,    accent: '#06b6d4' },
    { key: 'organizationChart', label:'Organigrama', icon:FaHubspot, accent: '#066dd4'},
    { key: 'socialForm', label: 'Impacto social',          icon: FaChartLine,      accent: '#22c55e' },
  ]

  const global = [
    { key: 'auditor',    label: 'Auditoría',               icon: FaUserShield,     accent: '#ef4444' },
  ];

  const rootOnly = [
    { key: 'root',       label: 'Panel Root',              icon: FaToolbox,        accent: '#d946ef' },

    // { key: 'workspace',  label: 'Gestión de Workspace',    icon: FaUserCog,        accent: '#4ade80' },
  ];

  if (role === 'root')   return [...resp,...global,  ...rootOnly, ...base];
  if (role === 'global') return [...resp,...global,  ...base];
  if (role=='rrhh') return [...rrhh,...base]
if (role=='auditor') return [...auditor,...base]


  const hasResp = Array.isArray(listResponsability)
    ? listResponsability.length > 0
    : !!(listResponsability && listResponsability.length > 0);

  return hasResp ? [...base, ...resp] : base;
}

