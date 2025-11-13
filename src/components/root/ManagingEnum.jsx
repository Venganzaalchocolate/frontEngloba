import React, { useCallback, useEffect, useMemo, useState } from "react";
import EnumDocumentationCRUD from "./EnumDocumentationCRUD";
import { EnumCRUD } from "./EnumCRUD";
import ModalConfirmation from "../globals/ModalConfirmation";
import styles from "../styles/enumStyleManaging.module.css";

import {
  createData,
  changeData,
  deleteData,
  createSubData,
  deleteSubData,
} from "../../lib/data";

/* ===============================
   OPCIONES Y CONFIGURACIÓN
================================= */
export const ENUM_OPTIONS = [
  { key: "documentation", label: "Documentación" },
  { key: "studies", label: "Estudios" },
  { key: "jobs", label: "Trabajos" },
  { key: "provinces", label: "Provincias" },
  { key: "work_schedule", label: "Horarios" },
  { key: "finantial", label: "Financiación" },
  { key: "leavetype", label: "Excedencias" },
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

/* ===============================
   FUNCIONES AUXILIARES
================================= */
const indexToTree = (index = {}) => {
  const roots = [];
  const byId = {};

  Object.entries(index).forEach(([id, v]) => {
    byId[id] = {
      _id: id,
      name: v.name || "",
      subcategories: [],
      ...(typeof v.public === "boolean" ? { public: v.public } : {}),
      _meta: { ...v },
    };
  });

  Object.entries(index).forEach(([id, v]) => {
    if (v.isSub && v.parent != null) {
      const parentId = String(v.parent);
      if (byId[parentId] && byId[id]) {
        byId[parentId].subcategories.push(byId[id]);
      }
    }
  });

  Object.entries(index).forEach(([id, v]) => {
    if (v.isRoot) roots.push(byId[id]);
  });

  roots.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));
  roots.forEach((r) =>
    r.subcategories.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }))
  );

  return roots;
};

/* ===============================
   COMPONENTE PRINCIPAL
================================= */
export default function ManagingEnum({ chargeEnums, charge, enumsData, modal }) {
  const [selectedKey, setSelectedKey] = useState("studies");
  const [crudData, setCrudData] = useState({});
  const [confirm, setConfirm] = useState(null);

  const getToken = () => {
    try {
      const raw = localStorage.getItem("token");
      return raw ? raw.replace(/^"|"$/g, "") : null;
    } catch {
      return null;
    }
  };

  /* Normalización de datos */
useEffect(() => {
    // ⛑️ Si aún no ha llegado enumsData, inicializamos vacío y salimos
    if (!enumsData) {
      setCrudData({
        jobs: [],
        provinces: [],
        leavetype: [],
        studies: [],
        work_schedule: [],
        finantial: [],
        documentation: [],
        categoryFiles: [],
      });
      return;
    }

    const normalized = {
      // ⛑️ Nunca expandir si pudiera ser undefined
      jobs: enumsData.jobsIndex ? indexToTree(enumsData.jobsIndex) : (enumsData.jobs || []),
      provinces: enumsData.provincesIndex ? indexToTree(enumsData.provincesIndex) : (enumsData.provinces || []),
      leavetype: enumsData.leavesIndex ? indexToTree(enumsData.leavesIndex) : (enumsData.leavetype || []),
      studies: enumsData.studiesIndex ? indexToTree(enumsData.studiesIndex) : (enumsData.studies || []),

      work_schedule: enumsData.work_schedule || [],
      finantial: enumsData.finantial || [],
      documentation: enumsData.documentation || [],
      categoryFiles: Array.isArray(enumsData.categoryFiles) ? enumsData.categoryFiles : [],
    };

    setCrudData(normalized);
  }, [enumsData]);


  const selectedData = useMemo(() => crudData[selectedKey] || [], [crudData, selectedKey]);

  const groupedDocs = useMemo(() => {
    const docs = crudData.documentation || [];
    const grouped = {};
    docs.forEach((doc) => {
      const model = doc.model || "Sin modelo";
      const cat = doc.categoryFiles || "Sin categoría";
      if (!grouped[model]) grouped[model] = {};
      if (!grouped[model][cat]) grouped[model][cat] = [];
      grouped[model][cat].push(doc);
    });
    return grouped;
  }, [crudData.documentation]);

  /* ===============================
     FUNCIONES CRUD CON SPINNER
  ================================ */
  const runWithSpinner = useCallback(
    async (fn) => {
      try {
        charge(true);
        const res = await fn();
        await chargeEnums?.();
        return res;
      } catch (err) {
        modal("Error", "Ha ocurrido un problema con la operación.");
      } finally {
        charge(false);
      }
    },
    [chargeEnums, charge, modal]
  );

  /* ===============================
     HANDLERS CRUD
  ================================ */
  const handleCreate = async (form) => {
    const payload = buildCreatePayload(selectedKey, form);
    if (selectedKey === "documentation" && payload.date === "si" && (!payload.duration || payload.duration <= 0)) {
      modal("Campo obligatorio", "Duración debe ser mayor que 0 cuando el documento tiene fecha.");
      return;
    }
    await runWithSpinner(() => createData(getToken(), payload));
  };

  const handleEdit = async (itemOrParent, form, extra) => {
    const payload = buildEditPayload(selectedKey, itemOrParent, form, extra);
    if (selectedKey === "documentation" && payload.date === "si" && (!payload.duration || payload.duration <= 0)) {
      modal("Campo obligatorio", "Duración debe ser mayor que 0 cuando el documento tiene fecha.");
      return;
    }
    await runWithSpinner(() => changeData(getToken(), payload));
  };

  const handleDelete = (item) => {
    setConfirm({
      title: "Confirmar eliminación",
      message: `¿Seguro que deseas eliminar "${item.name}"?`,
      onConfirm: async () => {
        await runWithSpinner(() => deleteData(getToken(), { id: item._id, type: selectedKey }));
        setConfirm(null);
      },
      onCancel: () => setConfirm(null),
    });
  };

  const handleAddSubcategory = async (parent, form) => {
    const payload = { id: parent._id, type: selectedKey, name: form.name?.trim() };
    if (selectedKey === "jobs") payload.public = form.public;
    await runWithSpinner(() => createSubData(getToken(), payload));
  };

  const handleDeleteSubcategory = (parent, sc) => {
    setConfirm({
      title: "Confirmar eliminación",
      message: `¿Eliminar subcategoría "${sc.name}"?`,
      onConfirm: async () => {
        const payload = { id: parent._id, idCategory: sc._id, type: selectedKey };
        await runWithSpinner(() => deleteSubData(getToken(), payload));
        setConfirm(null);
      },
      onCancel: () => setConfirm(null),
    });
  };

  /* ===============================
     RENDER
  ================================ */
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

      {selectedKey === "documentation" ? (
        <EnumDocumentationCRUD
          data={groupedDocs}
          enumsData={crudData}
          onCreate={handleCreate}
          onEdit={(item, form) => handleEdit(item, form)}
          onDelete={handleDelete}
          modal={modal}
        />
      ) : (
        <EnumCRUD
          selectedKey={selectedKey}
          data={selectedData}
          onCreate={handleCreate}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onAddSubcategory={handleAddSubcategory}
          onDeleteSubcategory={handleDeleteSubcategory}
          enumsData={crudData}
          modal={modal}
        />
      )}

      {confirm && <ModalConfirmation {...confirm} />}
    </div>
  );
}

/* ===============================
   HELPERS DE PAYLOAD
================================= */
function buildCreatePayload(enumKey, form) {
  const payload = { type: enumKey, name: form.name?.trim() };
  if (enumKey === "jobs") payload.public = form.public;
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
  const payload = { id: itemOrParent._id, type: enumKey, name: form.name?.trim() };
  if (extra.subId) payload.subId = extra.subId;
  if (enumKey === "jobs") payload.public = form.public;
  if (enumKey === "documentation") {
    payload.date = form.date;
    payload.model = form.model;
    payload.categoryFiles = form.categoryFiles || "";
    payload.requiresSignature = form.requiresSignature === "si";
    if (form.date === "si") payload.duration = Number(form.duration || 0);
  }
  return payload;
}
