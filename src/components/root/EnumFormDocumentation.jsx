// EnumFormDocumentation.jsx
import React, { useMemo, useState } from "react";
import styles from "../styles/EnumCRUD.module.css";

export default function EnumFormDocumentation({ item, onCancel, onSubmit, enumsData, modal }) {
  if (!enumsData) return null;

  const categories = useMemo(() => {
    const base = Array.isArray(enumsData?.categoryFiles) ? enumsData.categoryFiles : [];
    const pre =
      item?.categoryFiles && !base.includes(item.categoryFiles) ? [...base, item.categoryFiles] : base;
    return Array.from(new Set(pre));
  }, [enumsData, item?.categoryFiles]);

  const [form, setForm] = useState(() => ({
    name: item?.name ?? "",
    date: item?.date ? "si" : "no",
    requiresSignature: item?.requiresSignature ? "si" : "no",
    model: item?.model || "",
    duration: item?.duration || 0,
    categoryFiles: item?.categoryFiles || "",
    file: null, // ✅ NUEVO
  }));

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleFileChange = (e) => {
    const f = e.target.files?.[0] || null;
    setForm((s) => ({ ...s, file: f }));
  };

  const handleSubmit = () => {
    if (!form.name.trim()) {
      modal("Campo obligatorio", "El nombre del documento es obligatorio.");
      return;
    }
    if (!form.model) {
      modal("Campo obligatorio", "Debe seleccionar una sección (Programas, Dispositivos o Trabajadores).");
      return;
    }
    if (form.date === "si") {
      const d = Number(form.duration || 0);
      if (!Number.isFinite(d) || d <= 0) {
        modal("Valor incorrecto", "La duración debe ser mayor que 0 cuando el documento tiene fecha.");
        return;
      }
    }
    // categoryFiles opcional (si quieres hacerlo obligatorio, valida aquí)
    onSubmit(form); // ✅ incluye form.file
  };

  return (
    <div className={styles.modalCard}>
      <h3 className={styles.formTitle}>{item?.name ? "Editar" : "Crear"} Documentación</h3>

      <div className={styles.field}>
        <label className={styles.label}>Nombre</label>
        <input className={styles.input} name="name" value={form.name} onChange={handleChange} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>¿Tiene fecha?</label>
        <select className={styles.select} name="date" value={form.date} onChange={handleChange}>
          <option value="si">Sí</option>
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
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Sección</label>
        <select className={styles.select} name="model" value={form.model} onChange={handleChange}>
          <option value="">Seleccione una opción</option>
          <option value="Program">Programas</option>
          <option value="Dispositive">Dispositivos</option>
          <option value="User">Trabajadores</option>
        </select>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Categoría del archivo</label>
        <select className={styles.select} name="categoryFiles" value={form.categoryFiles} onChange={handleChange}>
          <option value="">Seleccione una opción</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {form.date === "si" && (
        <div className={styles.field}>
          <label className={styles.label}>Duración (días)</label>
          <input
            type="number"
            className={styles.number}
            name="duration"
            value={form.duration}
            onChange={handleChange}
            min="0"
          />
        </div>
      )}

      {/* ✅ NUEVO: subir modelo PDF */}
      <div className={styles.field}>
        <label className={styles.label}>
          Modelo (PDF) {item?.modeloPDF ? "(ya hay uno, puedes reemplazarlo)" : "(opcional)"}
        </label>
        <input
          className={styles.input}
          type="file"
          accept="application/pdf"
          onChange={handleFileChange}
        />
        {form.file && (
          <div style={{ fontSize: ".85rem", color: "#6b7280", marginTop: 6 }}>
            Archivo: {form.file.name}
          </div>
        )}
      </div>

      <div className={styles.modalBtns}>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>Cancelar</button>
        <button className={`${styles.btn} ${styles.btnBlue}`} onClick={handleSubmit}>
          {item?.name ? "Guardar" : "Crear"}
        </button>
      </div>
    </div>
  );
}
