// src/pages/ManagingEnum.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {EnumCRUD} from "./EnumCRUD"
import styles from "../styles/ManagingEnum.module.css";

import {
  createData,
  changeData,
  deleteData,
  createSubData,
  deleteSubData,
} from "../../lib/data"; // <- ajusta la ruta si difiere

// Opciones
export const ENUM_OPTIONS = [
  { key: "documentation", label: "Documentación" },
  { key: "studies",       label: "Estudios" },
  { key: "jobs",          label: "Trabajos" },
  { key: "provinces",     label: "Provincias" },
  { key: "work_schedule", label: "Horarios" },
  { key: "finantial",     label: "Financiación" },
  { key: "leavetype",     label: "Excedencias" },
];

export const NO_SUB_ENUMS = [
  "documentation",
  "leavetype",
  "work_schedule",
  "finantial",
];

export const ENUM_LABEL = ENUM_OPTIONS.reduce((acc, it) => {
  acc[it.key] = it.label;
  return acc;
}, {});

/** Convierte índice plano -> árbol { _id, name, public?, subcategories[] } */
const indexToTree = (index = {}) => {
  const roots = [];
  const byId = {};

  // Nodos base con "public" si existe
  Object.entries(index).forEach(([id, v]) => {
    byId[id] = {
      _id: id,
      name: v.name || "",
      subcategories: [],
      ...(typeof v.public === "boolean" ? { public: v.public } : {}),
      _meta: { ...v },
    };
  });

  // parent -> subs
  Object.entries(index).forEach(([id, v]) => {
    if (v.isSub && v.parent != null) {
      const parentId = String(v.parent);
      if (byId[parentId] && byId[id]) {
        byId[parentId].subcategories.push(byId[id]);
      }
    }
  });

  // raíces
  Object.entries(index).forEach(([id, v]) => {
    if (v.isRoot) roots.push(byId[id]);
  });

  // ordenar
  roots.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  roots.forEach((r) =>
    r.subcategories.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
  );

  return roots;
};

export default function ManagingEnum({ chargeEnums, charge, enumsData }) {
  const [selectedKey, setSelectedKey] = useState("studies");
  const [crudData, setCrudData] = useState({});

  // Token desde localStorage (ajústalo si usas contexto)
  const getToken = () => {
    try {
      const raw = localStorage.getItem("token");
      return raw ? raw.replace(/^"|"$/g, "") : null;
    } catch { return null; }
  };

  // Normaliza índices del back a arrays con subcategorías
  useEffect(() => {
    const normalized = {
      ...enumsData,

      jobs:        enumsData.jobsIndex       ? indexToTree(enumsData.jobsIndex)       : (enumsData.jobs || []),
      provinces:   enumsData.provincesIndex  ? indexToTree(enumsData.provincesIndex)  : (enumsData.provinces || []),
      leavetype:   enumsData.leavesIndex     ? indexToTree(enumsData.leavesIndex)     : (enumsData.leavetype || []),
      studies:     enumsData.studiesIndex    ? indexToTree(enumsData.studiesIndex)    : (enumsData.studies || []),

      work_schedule: enumsData.work_schedule || [],
      finantial:     enumsData.finantial || [],
      documentation: enumsData.documentation || [],

      categoryFiles: enumsData.categoryFiles || [],
    };
    setCrudData(normalized);
  }, [enumsData]);

  const selectedData = useMemo(() => crudData[selectedKey] || [], [crudData, selectedKey]);

  /* -----------------------
     Acciones CRUD (API)
  ------------------------*/
  const runWithSpinner = useCallback(async (fn) => {
    try {
      charge(true);

      const res = await fn();
      await chargeEnums?.(); // recarga del padre si existe
      return res;
    } finally {
      charge(false);
    }
  }, [chargeEnums, charge]);

  // Crear raíz
  const handleCreate = async (form) => {
    const payload = buildCreatePayload(selectedKey, form);

    if (selectedKey === "documentation" && payload.date === "si") {
      if (!payload.duration || payload.duration <= 0) {
        alert("Duración es obligatoria y debe ser mayor que 0 cuando el documento tiene fecha.");
        return;
      }
    }
    await runWithSpinner(() => createData(getToken(), payload));
  };

  // Editar raíz o sub
  const handleEdit = async (itemOrParent, form, extra) => {
    const payload = buildEditPayload(selectedKey, itemOrParent, form, extra);

    if (selectedKey === "documentation" && payload.date === "si") {
      if (!payload.duration || payload.duration <= 0) {
        alert("Duración es obligatoria y debe ser mayor que 0 cuando el documento tiene fecha.");
        return;
      }
    }
    await runWithSpinner(() => changeData(getToken(), payload));
  };

  // Borrar raíz
  const handleDelete = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.name}"?`)) return;
    await runWithSpinner(() => deleteData(getToken(), { id: item._id, type: selectedKey }));
  };

  // Crear subcategoría
  const handleAddSubcategory = async (parent, form) => {
    const payload = {
      id: parent._id,
      type: selectedKey,
      name: form.name?.trim(),
    };
    if (selectedKey === "jobs") {
      payload.public = form.public; // 'si' | 'no'
    }
    await runWithSpinner(() => createSubData(getToken(), payload));
  };

  // Borrar subcategoría
  const handleDeleteSubcategory = async (parent, sc) => {
    if (!window.confirm(`¿Eliminar subcategoría "${sc.name}"?`)) return;
    const payload = {
      id: parent._id,
      idCategory: sc._id,
      type: selectedKey,
    };
    await runWithSpinner(() => deleteSubData(getToken(), payload));
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Gestión de Enums</h1>

      <div className={styles.block}>
        <label className={styles.label}>Tipo</label>
        <select
          className={styles.select}
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          {ENUM_OPTIONS.map((opt) => (
            <option key={opt.key} value={opt.key}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>


      <EnumCRUD
        selectedKey={selectedKey}
        data={selectedData}
        onCreate={handleCreate}
        onEdit={handleEdit}
        onDelete={handleDelete}
        onAddSubcategory={handleAddSubcategory}
        onDeleteSubcategory={handleDeleteSubcategory}
        enumsData={crudData}
      />
    </div>
  );
}

/* -------------------
   Helpers de payload
-------------------- */
function buildCreatePayload(enumKey, form) {
  const payload = {
    type: enumKey,
    name: form.name?.trim(),
  };

  if (enumKey === "jobs") {
    payload.public = form.public; // 'si' | 'no'
  }

  if (enumKey === "documentation") {
    payload.date = form.date;
    payload.model = form.model;
    payload.categoryFiles = form.categoryFiles || "";
    payload.requiresSignature = form.requiresSignature === "si";
    if (form.date === "si") payload.duration = Number(form.duration || 0);
  }
  return payload;
}

function buildEditPayload(enumKey, itemOrParent, form, extra = {}) {
  const payload = {
    id: itemOrParent._id,    // si subId, el back ya usa arrayFilters
    type: enumKey,
    name: form.name?.trim(),
  };

  if (extra.subId) payload.subId = extra.subId;

  if (enumKey === "jobs") {
    payload.public = form.public; // 'si' | 'no'
  }

  if (enumKey === "documentation") {
    payload.date = form.date;
    payload.model = form.model;
    payload.categoryFiles = form.categoryFiles || "";
    payload.requiresSignature = form.requiresSignature === "si";
    if (form.date === "si") payload.duration = Number(form.duration || 0);
  }

  return payload;
}
