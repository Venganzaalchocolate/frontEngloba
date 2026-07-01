import { FaUserAlt, FaBed } from "react-icons/fa";
import {
  FaBriefcase,
  FaChartLine,
  FaClipboardList,
  FaPuzzlePiece,
  FaToolbox,
  FaUsers,
  FaUserShield,
  FaSitemap,
  FaHouse,
} from "react-icons/fa6";
import { MdOutlineVolunteerActivism } from "react-icons/md";
import { LiaUsersSolid } from "react-icons/lia";
import { FaHubspot } from "react-icons/fa";
import { SiMoodle } from "react-icons/si";



const MENU = {
  myself: {
    key: "myself",
    label: "Mis datos",
    icon: FaUserAlt,
    accent: "#0ea5e9",
  },
  visualMap: {
    key: "visualMap",
    label: "Mapa Visual",
    icon: FaSitemap,
    accent: "#632be3",
  },
  cv: {
    key: "cv",
    label: "Solicitudes de empleo",
    icon: FaClipboardList,
    accent: "#10b981",
  },
  employer: {
    key: "employer",
    label: "Gestionar empleados",
    icon: FaUsers,
    accent: "#8b5cf6",
  },
  offersJobs: {
    key: "offersJobs",
    label: "Gestionar ofertas",
    icon: FaBriefcase,
    accent: "#f59e0b",
  },
  organizationChart: {
    key: "organizationChart",
    label: "Organigrama",
    icon: FaHubspot,
    accent: "#066dd4",
  },
  socialForm: {
    key: "socialForm",
    label: "Impacto social",
    icon: FaChartLine,
    accent: "#22c55e",
  },
  auditor: {
    key: "auditor",
    label: "Auditoría",
    icon: FaUserShield,
    accent: "#ef4444",
  },
  programs: {
    key: "programs",
    label: "Programas y dispositivos",
    icon: FaPuzzlePiece,
    accent: "#06b6d4",
  },
  volunteer: {
    key: "volunteer",
    label: "Voluntariado",
    icon: MdOutlineVolunteerActivism,
    accent: "#ffb5de",
  },
  workplace: {
    key: "workplace",
    label: "Centro de Trabajo",
    icon: FaHouse,
    accent: "#bde15a",
  },
  root: {
    key: "root",
    label: "Panel Root",
    icon: FaToolbox,
    accent: "#d946ef",
  },
  attendedusers: {
    key: "attendedusers",
    label: "Usuarios Atendidos",
    icon: LiaUsersSolid,
    accent: "#ef9d46",
  },
  anide:{
    key: "anide",
    label: "Gestión de centros UTE Engloba-Anide",
    icon: FaBed,
    accent: "#efa2ff",
  },
  formacion:{
    key:"formacion",
    label: "Formación",
    icon: SiMoodle,
    accent:"#ff5e01"
  }
};

const GROUPS = {
  base: [
    MENU.myself,
    MENU.visualMap,
  ],

  rrhh: [
    MENU.cv,
    MENU.employer,
    MENU.offersJobs,
    MENU.organizationChart,
    MENU.socialForm,
    MENU.auditor,
  ],

  responsible: [
    MENU.employer,
    MENU.cv,
    MENU.offersJobs,
    MENU.socialForm,
    MENU.programs,
    MENU.volunteer,
    MENU.organizationChart,
    MENU.attendedusers,
    MENU.formacion
  ],

  auditor: [
    MENU.auditor,
    MENU.employer,
    MENU.programs,
    MENU.organizationChart,
    MENU.socialForm,
    MENU.workplace,
  ],

  global: [
    MENU.auditor,
    MENU.workplace,
  ],

  rootOnly: [
    MENU.root,
    MENU.anide,
  ],

  attendedUsersOnly: [
    MENU.attendedusers,
  ],

  anideOccupancyManager:[
    MENU.anide
  ]
};

const hasRealResponsability = (list = []) =>
  list.some(
    (item) =>
      item?.isProgramResponsible ||
      item?.isProgramCoordinator ||
      item?.isProgramSupervisor ||
      item?.isDeviceResponsible ||
      item?.isDeviceCoordinator ||
      item?.isDeviceSupervisor
  );

const hasModuleScope = (list = [], moduleName) =>
  list.some(
    (item) =>
      item?.canAccessModuleScope === true &&
      item?.module === moduleName
  );

const uniqueByKey = (items = []) => {
  const map = new Map();

  items.forEach((item) => {
    if (!item?.key) return;
    if (!map.has(item.key)) map.set(item.key, item);
  });

  return [...map.values()];
};

/**
 * Devuelve opciones según rol/responsabilidades SIN JSX.
 * icon: referencia a componente, NO <FaUsers />
 */
export function getMenuOptions({ role, listResponsability = null } = {}) {
  const list = Array.isArray(listResponsability) ? listResponsability : [];

  const userHasRealResponsability = hasRealResponsability(list);
  const userHasAttendedUsersScope = hasModuleScope(list, "attendedUsers");
  const userHasAnideOccupancyManagerScope=hasModuleScope(list, "anideOccupancyManager");

  if (role === "root") {
    return uniqueByKey([
      ...GROUPS.responsible,
      ...GROUPS.global,
      ...GROUPS.rootOnly,
      ...GROUPS.base,
    ]);
  }

  if (role === "global") {
    return uniqueByKey([
      ...GROUPS.responsible,
      ...GROUPS.global,
      ...GROUPS.base,
    ]);
  }

  if (role === "rrhh") {
    return uniqueByKey([
      ...GROUPS.rrhh,
      ...GROUPS.base,
    ]);
  }

  if (role === "auditor") {
    return uniqueByKey([
      ...GROUPS.auditor,
      ...GROUPS.base,
    ]);
  }

  if (userHasRealResponsability) {
    return uniqueByKey([
      ...GROUPS.base,
      ...GROUPS.responsible,
    ]);
  }

  if (userHasAttendedUsersScope) {
    return uniqueByKey([
      ...GROUPS.base,
      ...GROUPS.attendedUsersOnly,
    ]);
  }

  if(userHasAnideOccupancyManagerScope){
        return uniqueByKey([
      ...GROUPS.base,
      ...GROUPS.anideOccupancyManager,
    ]);
  }

  return GROUPS.base;
}

/*
MENU.nuevoModulo = { ... }
GROUPS.nuevoModuloOnly = [MENU.nuevoModulo]
*/