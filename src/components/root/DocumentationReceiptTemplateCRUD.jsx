import React, { useMemo, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash, FaDownload } from "react-icons/fa";
import ModalConfirmation from "../globals/ModalConfirmation";
import styles from "../styles/EnumCRUD.module.css";

import {
  documentationReceiptTemplatePreview
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";



const emptyQuestion = () => ({
  key: "",
  label: "",
  type: "yesno",
  required: true,
  yesText: "",
  noText: "",
  blocksSignatureIfAnswer: "",
  blockMessage: "",
  order: 1,
});

function TemplateForm({ item, docs, onCancel, onSubmit, modal }) {
  const [form, setForm] = useState(() => ({
    documentationId: item?.documentationId?._id || item?.documentationId || "",
    active: item?.active === false ? "no" : "si",
    title: item?.title || "Declaración responsable",
    introText: item?.introText || "",
    finalText: item?.finalText || "Y para que así conste, firma digitalmente el presente recibí.",
    questions: item?.questions?.length
      ? item.questions.map((q, i) => ({
          ...q,
          order: q.order || i + 1,
          required: q.required === false ? "no" : "si",
          blocksSignatureIfAnswer: q.blocksSignatureIfAnswer || "",
        }))
      : [emptyQuestion()],
  }));

  const sortedDocs = useMemo(() => {
  return [...(docs || [])].sort((a, b) => {
    const modelA = a.model || "";
    const modelB = b.model || "";
    const catA = a.categoryFiles || "";
    const catB = b.categoryFiles || "";
    const nameA = a.name || "";
    const nameB = b.name || "";

    return (
      modelA.localeCompare(modelB, "es", { sensitivity: "base" }) ||
      catA.localeCompare(catB, "es", { sensitivity: "base" }) ||
      nameA.localeCompare(nameB, "es", { sensitivity: "base" })
    );
  });
}, [docs]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((s) => ({ ...s, [name]: value }));
  };

  const handleQuestionChange = (index, name, value) => {
    setForm((s) => ({
      ...s,
      questions: s.questions.map((q, i) => i === index ? { ...q, [name]: value } : q),
    }));
  };

  const addQuestion = () => {
    setForm((s) => ({
      ...s,
      questions: [...s.questions, { ...emptyQuestion(), order: s.questions.length + 1 }],
    }));
  };

  const removeQuestion = (index) => {
    setForm((s) => ({
      ...s,
      questions: s.questions.filter((_, i) => i !== index).map((q, i) => ({ ...q, order: i + 1 })),
    }));
  };


  const handleSubmit = () => {
    if (!form.documentationId) return modal("Campo obligatorio", "Debes seleccionar un documento.");
    if (!form.title.trim()) return modal("Campo obligatorio", "El título de la plantilla es obligatorio.");
    if (!Array.isArray(form.questions) || form.questions.length === 0) return modal("Campo obligatorio", "Debes añadir al menos una pregunta.");

    for (const q of form.questions) {
      if (!q.label?.trim()) return modal("Campo obligatorio", "Todas las preguntas deben tener texto.");
      if (!q.yesText?.trim() && !q.noText?.trim()) return modal("Campo obligatorio", `La pregunta "${q.label}" debe tener al menos texto para Sí o para No.`);
      if (q.blocksSignatureIfAnswer && !q.blockMessage?.trim()) return modal("Campo obligatorio", `Si una respuesta bloquea la firma, añade un mensaje de bloqueo en "${q.label}".`);
    }

    onSubmit({
      ...form,
      active: form.active === "si",
      questions: form.questions.map((q, i) => ({
        key: q.key?.trim(),
        label: q.label?.trim(),
        type: "yesno",
        required: q.required !== "no",
        yesText: q.yesText?.trim() || "",
        noText: q.noText?.trim() || "",
        blocksSignatureIfAnswer: q.blocksSignatureIfAnswer || null,
        blockMessage: q.blockMessage?.trim() || "",
        order: Number(q.order || i + 1),
      })),
    });
  };

  return (
    <div className={`${styles.modalCard} ${styles.receiptTemplateModal}`}>
      <h3 className={styles.formTitle}>{item ? "Editar" : "Crear"} plantilla de recibí</h3>

      <div className={styles.field}>
        <label className={styles.label}>Documento</label>
        <select className={styles.select} name="documentationId" value={form.documentationId} onChange={handleChange} disabled={!!item}>
          <option value="">Seleccione un documento</option>
          {sortedDocs.map((doc) => (
  <option key={doc._id} value={doc._id}>
    {doc.model || "Sin sección"} - {doc.categoryFiles || "Sin categoría"} - {doc.name}
  </option>
))}
        </select>
      </div>

      <div className={styles.receiptInlineFields}>
        <div className={styles.field}>
          <label className={styles.label}>Activa</label>
          <select className={styles.select} name="active" value={form.active} onChange={handleChange}>
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Título del recibí</label>
          <input className={styles.input} name="title" value={form.title} onChange={handleChange} />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Texto inicial</label>
        <textarea className={`${styles.input} ${styles.receiptTextarea}`} name="introText" value={form.introText} onChange={handleChange} rows={3} />
      </div>

      <div className={styles.field}>
        <label className={styles.label}>Texto final</label>
        <textarea className={`${styles.input} ${styles.receiptTextarea}`} name="finalText" value={form.finalText} onChange={handleChange} rows={3} />
      </div>

      <div className={styles.receiptQuestionsHeader}>
        <h3 className={styles.h2}>Preguntas</h3>
        <button className={styles.btnPrimary} onClick={addQuestion} type="button"><FaPlus /> Añadir pregunta</button>
      </div>

      {form.questions.map((q, index) => (
        <div key={index} className={`${styles.card} ${styles.receiptQuestionCard}`}>
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>Pregunta {index + 1}</div>
            {form.questions.length > 1 && (
              <button className={`${styles.iconBtn} ${styles.del}`} onClick={() => removeQuestion(index)} type="button"><FaTrash /></button>
            )}
          </div>

          <div className={styles.receiptInlineFields}>
            <div className={styles.field}>
              <label className={styles.label}>Key interna opcional</label>
              <input className={styles.input} value={q.key || ""} onChange={(e) => handleQuestionChange(index, "key", e.target.value)} placeholder="Si lo dejas vacío, el backend la genera" />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Obligatoria</label>
              <select className={styles.select} value={q.required === "no" || q.required === false ? "no" : "si"} onChange={(e) => handleQuestionChange(index, "required", e.target.value)}>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>Pregunta visible</label>
            <input className={styles.input} value={q.label || ""} onChange={(e) => handleQuestionChange(index, "label", e.target.value)} />
          </div>

          <div className={styles.receiptInlineFields}>
            <div className={styles.field}>
              <label className={styles.label}>Texto si responde Sí</label>
              <textarea className={`${styles.input} ${styles.receiptTextarea}`} value={q.yesText || ""} onChange={(e) => handleQuestionChange(index, "yesText", e.target.value)} rows={3} />
            </div>

            <div className={styles.field}>
              <label className={styles.label}>Texto si responde No</label>
              <textarea className={`${styles.input} ${styles.receiptTextarea}`} value={q.noText || ""} onChange={(e) => handleQuestionChange(index, "noText", e.target.value)} rows={3} />
            </div>
          </div>

          <div className={styles.receiptInlineFields}>
            <div className={styles.field}>
              <label className={styles.label}>Bloqueo de firma</label>
              <select className={styles.select} value={q.blocksSignatureIfAnswer || ""} onChange={(e) => handleQuestionChange(index, "blocksSignatureIfAnswer", e.target.value)}>
                <option value="">No bloquea</option>
                <option value="yes">Bloquea si responde Sí</option>
                <option value="no">Bloquea si responde No</option>
              </select>
            </div>

            {q.blocksSignatureIfAnswer && (
              <div className={styles.field}>
                <label className={styles.label}>Mensaje de bloqueo</label>
                <textarea className={`${styles.input} ${styles.receiptTextareaSmall}`} value={q.blockMessage || ""} onChange={(e) => handleQuestionChange(index, "blockMessage", e.target.value)} rows={2} />
              </div>
            )}
          </div>
        </div>
      ))}

      <div className={styles.modalBtns}>
        <button className={`${styles.btn} ${styles.btnGhost}`} onClick={onCancel}>Cancelar</button>
        <button className={`${styles.btn} ${styles.btnBlue}`} onClick={handleSubmit}>{item ? "Guardar" : "Crear"}</button>
      </div>
    </div>
  );
}
export default function DocumentationReceiptTemplateCRUD({ data, docs, onCreateOrUpdate, onDelete, onToggle, modal }) {
  const [mode, setMode] = useState(null);
  const [current, setCurrent] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const docsById = useMemo(() => {
    const out = {};
    docs.forEach((d) => { out[String(d._id)] = d; });
    return out;
  }, [docs]);

  const handleDownloadPreview = async (item) => {
    const token = getToken();
    if (!token) {
      modal("Sesión caducada", "Vuelve a iniciar sesión para descargar el recibí de prueba.");
      return;
    }

    const documentationId = item.documentationId?._id || item.documentationId;
    const res = await documentationReceiptTemplatePreview({ documentationId }, token);

    if (res?.error || !res?.url) {
      modal("Error", res?.message || "No se pudo generar el recibí de prueba.");
      return;
    }

    window.open(res.url, "_blank", "noopener,noreferrer");

    setTimeout(() => {
      URL.revokeObjectURL(res.url);
    }, 60000);
  };

  const close = () => {
    setMode(null);
    setCurrent(null);
  };

  const startCreate = () => {
    setCurrent(null);
    setMode("create");
  };

  const startEdit = (item) => {
    setCurrent(item);
    setMode("edit");
  };

  const handleDelete = (item) => {
    setConfirm({
      title: "Confirmar eliminación",
      message: `¿Eliminar la plantilla "${item.title}"?`,
      onConfirm: () => {
        onDelete(item);
        setConfirm(null);
      },
      onCancel: () => setConfirm(null),
    });
  };

  return (
    <div className={styles.list}>
      <div className={styles.header}>
        <h2 className={styles.h2}>Plantillas de recibí</h2>
        <button className={styles.btnPrimary} onClick={startCreate}><FaPlus /> Nueva plantilla</button>
      </div>

      {(!data || data.length === 0) && <p className={styles.empty}>No hay plantillas registradas.</p>}

{(data || []).map((item) => {
  const doc = item.documentationId?._id ? item.documentationId : docsById[String(item.documentationId)];

  return (
    <div key={item._id} className={styles.card}>
      <div className={styles.cardHead}>
        <div className={styles.cardTitle}>
  <span>{item.title}</span>
  {item.active ? <FaEye className={styles.eye} /> : <FaEyeSlash className={styles.eye} />}
  <span className={styles.badgeFecha}>{item.questions?.length || 0} preguntas</span>
</div>

        <div className={styles.actions}>
  <button
    className={`${styles.iconBtn} ${styles.addSub}`}
    onClick={() => handleDownloadPreview(item)}
    title="Ver recibí de prueba"
  >
    <FaDownload />
  </button>

  <button className={`${styles.iconBtn} ${styles.addSub}`} onClick={() => onToggle(item)}>
    {item.active ? "Desactivar" : "Activar"}
  </button>

  <button className={`${styles.iconBtn} ${styles.edit}`} onClick={() => startEdit(item)}>
    <FaEdit />
  </button>

  <button className={`${styles.iconBtn} ${styles.del}`} onClick={() => handleDelete(item)}>
    <FaTrash />
  </button>
</div>
      </div>

      <div className={styles.receiptDocName}>Documento: {doc?.name || "Documento no encontrado"}</div>
    </div>
  );
})}

      {mode && (
        <div className={`${styles.modalOverlay} ${styles.receiptModalOverlay}`}>
          <TemplateForm item={current} docs={docs} onCancel={close} modal={modal} onSubmit={(form) => {
            onCreateOrUpdate(form);
            close();
          }} />
        </div>
      )}

      {confirm && <ModalConfirmation {...confirm} />}
    </div>
  );
}