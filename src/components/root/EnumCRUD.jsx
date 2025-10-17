// src/components/EnumCRUD.jsx
import React, { useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash } from "react-icons/fa";
import styles from "../styles/EnumCRUD.module.css";


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

/** Icono de visibilidad solo si el valor es booleano */
const Eye = ({ val }) => {
  if (typeof val !== "boolean") return null;
  return val ? <FaEye className={styles.eye} /> : <FaEyeSlash className={styles.eye} />;
};

/** Formulario reutilizable para crear/editar según tipo */
function EnumForm({ enumKey, item, onCancel, onSubmit, enumsData }) {
  const [form, setForm] = useState(() => {
    const base = { name: item?.name ?? "" };

    if (enumKey === "jobs") {
      base.public = item?.public ? "si" : "no";
    }

    if (enumKey === "documentation") {
      base.date = item?.date ? "si" : "no";
      base.requiresSignature = item?.requiresSignature ? "si" : "no";
      base.model = item?.model || "";
      base.duration = item?.duration || 0;
      base.categoryFiles = item?.categoryFiles || "";
    }

    return base;
  });

  const label = ENUM_LABEL[enumKey] || enumKey;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = () => {
    if (!form.name || !form.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    if (enumKey === "documentation") {
      if (!form.model) {
        alert("El campo 'Sección (model)' es obligatorio");
        return;
      }
      if (form.date === "si") {
        const d = Number(form.duration || 0);
        if (!Number.isFinite(d) || d <= 0) {
          alert("Duración es obligatoria y debe ser mayor que 0 cuando el documento tiene fecha.");
          return;
        }
      }
    }
    onSubmit(form);
  };

  return (
    <div className={styles.modalCard}>
      <h3 className={styles.formTitle}>{item ? "Editar" : "Crear"} {label}</h3>

      <div className={styles.field}>
        <label className={styles.label}>Nombre</label>
        <input
          className={styles.input}
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nombre"
        />
      </div>

      {enumKey === "jobs" && (
        <div className={styles.field}>
          <label className={styles.label}>Público</label>
          <select
            className={styles.select}
            name="public"
            value={form.public}
            onChange={handleChange}
          >
            <option value="si">Si</option>
            <option value="no">No</option>
          </select>
        </div>
      )}

      {enumKey === "documentation" && (
        <>
          <div className={styles.field}>
            <label className={styles.label}>¿Tiene fecha?</label>
            <select
              className={styles.select}
              name="date"
              value={form.date}
              onChange={handleChange}
            >
              <option value="si">Si</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>¿Requiere firma?</label>
            <select
              className={styles.select}
              name="requiresSignature"
              value={form.requiresSignature}
              onChange={handleChange}
            >
              <option value="si">Si</option>
              <option value="no">No</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Sección</label>
            <select
              className={styles.select}
              name="model"
              value={form.model}
              onChange={handleChange}
            >
              <option value="">Seleccione una opción</option>
              <option value="Program">Programas y Dispositivos</option>
              <option value="User">Trabajadores</option>
            </select>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Duración (días) — requerido si tiene fecha</label>
            <input
              type="number"
              className={styles.number}
              name="duration"
              value={form.duration}
              onChange={handleChange}
              placeholder="0"
              min="0"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Categoría del archivo</label>
            <select
              className={styles.select}
              name="categoryFiles"
              value={form.categoryFiles}
              onChange={handleChange}
            >
              <option value="">Seleccione una opción</option>
              {(enumsData?.categoryFiles ?? []).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </>
      )}

      <div className={styles.modalBtns}>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>Cancelar</button>
        <button className={`${styles.btn} ${styles.btnBlue}`} onClick={handleSubmit}>
          {item ? "Guardar" : "Crear"}
        </button>
      </div>
    </div>
  );
}

/** Formulario para crear subcategoría (usa 'public' solo en jobs) */
function SubcategoryForm({ enumKey, parent, onCancel, onSubmit }) {
  const [form, setForm] = useState({ name: "", public: "si" });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      alert("El nombre es obligatorio");
      return;
    }
    onSubmit(form);
  };

  return (
    <div className={styles.modalCard}>
      <h3 className={styles.formTitle}>
        Añadir subcategoría a: <span style={{fontWeight:400}}>{parent?.name}</span>
      </h3>

      <div className={styles.field}>
        <label className={styles.label}>Nombre</label>
        <input
          className={styles.input}
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Nombre de subcategoría"
        />
      </div>

      {enumKey === "jobs" && (
        <div className={styles.field}>
          <label className={styles.label}>Pública</label>
          <select
            className={styles.select}
            name="public"
            value={form.public}
            onChange={handleChange}
          >
            <option value="si">Si</option>
            <option value="no">No</option>
          </select>
        </div>
      )}

      <div className={styles.modalBtns}>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>Cancelar</button>
        <button className={`${styles.btn} ${styles.btnBlue}`} onClick={handleSubmit}>Crear</button>
      </div>
    </div>
  );
}

/** Lista + acciones CRUD */
export const EnumCRUD = ({
  selectedKey,
  data,
  onCreate,
  onEdit,
  onDelete,
  onAddSubcategory,
  onDeleteSubcategory,
  enumsData,
}) => {
  const label = ENUM_LABEL[selectedKey] || selectedKey;
  const allowSub = !NO_SUB_ENUMS.includes(selectedKey);

  const [mode, setMode] = useState(null); // 'create' | 'edit' | 'sub'
  const [current, setCurrent] = useState(null); // item actual

  const close = () => { setMode(null); setCurrent(null); };
  const startCreate = () => { setMode("create"); setCurrent(null); };
  const startEdit = (item) => { setMode("edit"); setCurrent(item); };
  const startAddSub = (parent) => { setMode("sub"); setCurrent(parent); };

  const handleCreate = (formData) => { onCreate(formData); close(); };
  const handleEdit = (formData) => { onEdit(current, formData); close(); };
  const handleAddSub = (formData) => { onAddSubcategory(current, formData); close(); };

  return (
    <div>
      <div className={styles.header}>
        <h2 className={styles.h2}>Gestionar: {label}</h2>
        <button className={styles.btnPrimary} onClick={startCreate}>
          <FaPlus /> Nuevo
        </button>
      </div>

      <div className={styles.list}>
        {(data ?? []).map((item) => (
          <div key={item._id} className={styles.card}>
            <div className={styles.cardHead}>
              <div className={styles.cardTitle}>
                <span>{item.name}</span>
                {selectedKey === "jobs" && <Eye val={item.public} />}
              </div>
              <div className={styles.actions}>
                {allowSub && (
                  <button className={`${styles.iconBtn} ${styles.addSub}`} onClick={() => startAddSub(item)}>
                    + Sub
                  </button>
                )}
                <button className={`${styles.iconBtn} ${styles.edit}`} onClick={() => startEdit(item)}>
                  <FaEdit />
                </button>
                <button className={`${styles.iconBtn} ${styles.del}`} onClick={() => onDelete(item)}>
                  <FaTrash />
                </button>
              </div>
            </div>

            {allowSub && (item.subcategories?.length > 0) && (
              <div className={styles.subList}>
                <ul>
                  {item.subcategories.map((sc) => (
                    <li key={sc._id} className={styles.subItem}>
                      <div>
                        {sc.name}
                        {selectedKey === "jobs" && <Eye val={sc.public} />}
                      </div>
                      <div className={styles.actions}>
                        <button className={`${styles.iconBtn} ${styles.edit}`}
                          onClick={() => startEdit({ ...item, _sub: sc })}>
                          <FaEdit />
                        </button>
                        <button className={`${styles.iconBtn} ${styles.del}`}
                          onClick={() => onDeleteSubcategory(item, sc)}>
                          <FaTrash />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}

        {(!data || data.length === 0) && (
          <div style={{fontSize:'.875rem', color:'#6b7280'}}>No hay datos.</div>
        )}
      </div>

      {mode && (
        <div className={styles.modalOverlay}>
          {mode === "create" && (
            <EnumForm
              enumKey={selectedKey}
              item={null}
              onCancel={close}
              onSubmit={handleCreate}
              enumsData={enumsData}
            />
          )}
          {mode === "edit" && (
            current?._sub ? (
              <EnumForm
                enumKey={selectedKey}
                item={current._sub}
                onCancel={close}
                onSubmit={(form) => { onEdit(current, form, { subId: current._sub._id }); close(); }}
                enumsData={enumsData}
              />
            ) : (
              <EnumForm
                enumKey={selectedKey}
                item={current}
                onCancel={close}
                onSubmit={handleEdit}
                enumsData={enumsData}
              />
            )
          )}
          {mode === "sub" && (
            <SubcategoryForm
              enumKey={selectedKey}
              parent={current}
              onCancel={close}
              onSubmit={handleAddSub}
            />
          )}
        </div>
      )}
    </div>
  );
}

export default EnumCRUD;
