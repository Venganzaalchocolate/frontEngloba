
export const FRONT_MODULES_FALLBACK = [
  "audits","cv","employer","lists","myself","offerJobs","payroll",
  "programsanddispositives","root","social","volunteer","permissions",
];

export const FRONT_MODULE_LABELS = {
  audits: "Auditorías",
  cv: "Solicitudes de Empleo",
  employer: "Empleados",
  lists: "Listados",
  myself: "Mi perfil",
  offerJobs: "Ofertas de Empleo",
  payroll: "Nóminas",
  programsanddispositives: "Programas y dispositivos",
  root: "Root",
  social: "Estadísticas",
  volunteer: "Voluntariado",
  permissions: "Permisos",
};

export const MODULE_ACTIONS_FALLBACK = ["read","manage","approve","reject","export","delete","*"];

export const MODULE_ACTION_LABELS = {
  read: "Lectura",
  manage: "Gestión",
  approve: "Aprobar",
  reject: "Rechazar",
  export: "Exportar",
  delete: "Eliminar",
  "*": "Todo",
};


export const RESOURCE_TYPES = ["program", "dispositive", "province", "area"];
export const RESOURCE_ROLES = ["responsable", "coordinator", "viewer"];

export const RESOURCE_TYPE_LABEL = {
  program: "Programa",
  dispositive: "Dispositivo",
  province: "Provincia",
  area: "Área",
};

export const RESOURCE_ROLE_LABEL = {
  responsable: "Responsable",
  coordinator: "Coordinación",
  viewer: "Visualización",
};

export const AREA_FALLBACK = [
      { value: "igualdad", label: "Igualdad" },
      { value: "Desarrollo comunitario", label: "Desarrollo comunitario" },
      { value: "LGTBIQ+", label: "LGTBIQ+" },
      { value: "Infancia y juventud", label: "Infancia y juventud" },
      { value: "Personas con discapacidad", label: "Personas con discapacidad" },
      { value: "Mayores", label: "Mayores" },
      { value: "migraciones", label: "Migraciones" },
      { value: "no identificado", label: "No identificado" },
    ];