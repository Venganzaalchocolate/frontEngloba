// src/components/enums/enumsConfig.js

export const ENUM_OPTIONS = [
  { key: "documentation", label: "Documentación" },
  { key: "studies", label: "Estudios" },
  { key: "jobs", label: "Trabajos" },
  { key: "provinces", label: "Provincias" },
  { key: "work_schedule", label: "Horarios" },
  { key: "finantial", label: "Financiación" },
  { key: "leavetype", label: "Excedencias" },
  { key: "entity", label: "Entidades" },
];

export const NO_SUB_ENUMS = [
  "documentation",
  "leavetype",
  "work_schedule",
  "finantial",
  "entity",
];

export const ENUM_LABEL = ENUM_OPTIONS.reduce((acc, it) => {
  acc[it.key] = it.label;
  return acc;
}, {});