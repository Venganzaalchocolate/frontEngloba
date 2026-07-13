import React, { useMemo, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaEye, FaEyeSlash, FaDownload } from "react-icons/fa";
import ModalConfirmation from "../globals/ModalConfirmation";
import styles from "../styles/EnumCRUD.module.css";

import {
  documentationReceiptTemplatePreview
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";



const emptyBlock = (type = "yesno") => ({
  type,
  key: "",
  label: "",
  content: "",
  required: "si",
  yesText: "",
  noText: "",
  blocksSignatureIfAnswer: "",
  blockMessage: "",
  order: 1,
});
function TemplateForm({
  item,
  docs,
  onCancel,
  onSubmit,
  modal,
}) {
  const [form, setForm] = useState(() => {
    const savedBlocks = item?.blocks?.length
      ? item.blocks
      : (item?.questions || []).map((question) => ({
          ...question,
          type: "yesno",
        }));

    return {
      documentationId:
        item?.documentationId?._id ||
        item?.documentationId ||
        "",

      active:
        item?.active === false ? "no" : "si",

      title:
        item?.title || "Declaración responsable",

      introText:
        item?.introText || "",

      finalText:
        item?.finalText ||
        "Y para que así conste, firma digitalmente el presente documento.",

      blocks: savedBlocks.length
        ? savedBlocks.map((block, index) => ({
            ...emptyBlock(block.type),
            ...block,
            required:
              block.required === false ? "no" : "si",
            blocksSignatureIfAnswer:
              block.blocksSignatureIfAnswer || "",
            order: index + 1,
          }))
        : [emptyBlock()],
    };
  });

  const sortedDocs = useMemo(() => {
    return [...(docs || [])].sort((a, b) => {
      const modelA = a.model || "";
      const modelB = b.model || "";
      const categoryA = a.categoryFiles || "";
      const categoryB = b.categoryFiles || "";
      const nameA = a.name || "";
      const nameB = b.name || "";

      return (
        modelA.localeCompare(modelB, "es", {
          sensitivity: "base",
        }) ||
        categoryA.localeCompare(categoryB, "es", {
          sensitivity: "base",
        }) ||
        nameA.localeCompare(nameB, "es", {
          sensitivity: "base",
        })
      );
    });
  }, [docs]);

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleBlockChange = (
    index,
    name,
    value
  ) => {
    setForm((current) => ({
      ...current,

      blocks: current.blocks.map((block, blockIndex) => {
        if (blockIndex !== index) return block;

        if (name === "type") {
          return {
            ...emptyBlock(value),
            order: block.order,
          };
        }

        return {
          ...block,
          [name]: value,
        };
      }),
    }));
  };

  const addBlock = () => {
    setForm((current) => ({
      ...current,

      blocks: [
        ...current.blocks,
        {
          ...emptyBlock(),
          order: current.blocks.length + 1,
        },
      ],
    }));
  };

  const removeBlock = (index) => {
    setForm((current) => ({
      ...current,

      blocks: current.blocks
        .filter((_, blockIndex) => blockIndex !== index)
        .map((block, blockIndex) => ({
          ...block,
          order: blockIndex + 1,
        })),
    }));
  };

  const moveBlock = (index, direction) => {
    setForm((current) => {
      const newIndex = index + direction;

      if (
        newIndex < 0 ||
        newIndex >= current.blocks.length
      ) {
        return current;
      }

      const blocks = [...current.blocks];

      [blocks[index], blocks[newIndex]] = [
        blocks[newIndex],
        blocks[index],
      ];

      return {
        ...current,

        blocks: blocks.map((block, blockIndex) => ({
          ...block,
          order: blockIndex + 1,
        })),
      };
    });
  };

  const handleSubmit = () => {
    if (!form.documentationId) {
      modal(
        "Campo obligatorio",
        "Debes seleccionar un documento."
      );

      return;
    }

    if (!form.title.trim()) {
      modal(
        "Campo obligatorio",
        "El título de la plantilla es obligatorio."
      );

      return;
    }

    if (!form.blocks.length) {
      modal(
        "Campo obligatorio",
        "Debes añadir al menos un bloque."
      );

      return;
    }

for (const block of form.blocks) {
  if (
    block.type === "text" &&
    !block.label?.trim()
  ) {
    modal(
      "Campo obligatorio",
      `El bloque de texto ${block.order} necesita un título.`
    );

    return;
  }

  if (block.type === "yesno") {
    if (!block.label?.trim()) {
      modal(
        "Campo obligatorio",
        "Todas las preguntas deben tener texto."
      );

      return;
    }

    if (
      !block.yesText?.trim() &&
      !block.noText?.trim()
    ) {
      modal(
        "Campo obligatorio",
        `La pregunta "${block.label}" debe tener al menos texto para Sí o para No.`
      );

      return;
    }

    if (
      block.blocksSignatureIfAnswer &&
      !block.blockMessage?.trim()
    ) {
      modal(
        "Campo obligatorio",
        `Añade el mensaje de bloqueo de "${block.label}".`
      );

      return;
    }
  }

  if (
    block.type !== "yesno" &&
    !block.content?.trim()
  ) {
    modal(
      "Campo obligatorio",
      `El bloque ${block.order} no tiene contenido.`
    );

    return;
  }
}

    onSubmit({
      documentationId: form.documentationId,
      active: form.active === "si",
      title: form.title.trim(),
      introText: form.introText.trim(),
      finalText: form.finalText.trim(),

      blocks: form.blocks.map((block, index) => {
if (block.type !== "yesno") {
  return {
    type: block.type,
    label:
      block.type === "text"
        ? block.label.trim()
        : "",
    content: block.content.trim(),
    order: index + 1,
  };
}

        return {
          type: "yesno",
          key: block.key?.trim() || "",
          label: block.label.trim(),
          required: block.required !== "no",
          yesText: block.yesText?.trim() || "",
          noText: block.noText?.trim() || "",
          blocksSignatureIfAnswer:
            block.blocksSignatureIfAnswer || null,
          blockMessage:
            block.blockMessage?.trim() || "",
          order: index + 1,
        };
      }),
    });
  };

  return (
    <div
      className={`${styles.modalCard} ${styles.receiptTemplateModal}`}
    >
      <h3 className={styles.formTitle}>
        {item ? "Editar" : "Crear"} plantilla de recibí
      </h3>

      <div className={styles.field}>
        <label className={styles.label}>
          Documento
        </label>

        <select
          className={styles.select}
          name="documentationId"
          value={form.documentationId}
          onChange={handleChange}
          disabled={Boolean(item)}
        >
          <option value="">
            Seleccione un documento
          </option>

          {sortedDocs.map((doc) => (
            <option
              key={doc._id}
              value={doc._id}
            >
              {doc.model || "Sin sección"} -{" "}
              {doc.categoryFiles || "Sin categoría"} -{" "}
              {doc.name}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.receiptInlineFields}>
        <div className={styles.field}>
          <label className={styles.label}>
            Activa
          </label>

          <select
            className={styles.select}
            name="active"
            value={form.active}
            onChange={handleChange}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>
            Título del recibí
          </label>

          <input
            className={styles.input}
            name="title"
            value={form.title}
            onChange={handleChange}
          />
        </div>
      </div>

      <div className={styles.field}>
        <label className={styles.label}>
          Texto inicial
        </label>

        <textarea
          className={`${styles.input} ${styles.receiptTextarea}`}
          name="introText"
          value={form.introText}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className={styles.receiptQuestionsHeader}>
        <h3 className={styles.h2}>
          Contenido del recibí
        </h3>

        <button
          className={styles.btnPrimary}
          onClick={addBlock}
          type="button"
        >
          <FaPlus /> Añadir bloque
        </button>
      </div>

      {form.blocks.map((block, index) => (
        <div
          key={index}
          className={`${styles.card} ${styles.receiptQuestionCard}`}
        >
          <div className={styles.cardHead}>
            <div className={styles.cardTitle}>
              Bloque {index + 1}
            </div>

            <div className={styles.actions}>
              <button
                className={styles.iconBtn}
                type="button"
                onClick={() => moveBlock(index, -1)}
                disabled={index === 0}
                title="Subir bloque"
              >
                ↑
              </button>

              <button
                className={styles.iconBtn}
                type="button"
                onClick={() => moveBlock(index, 1)}
                disabled={
                  index === form.blocks.length - 1
                }
                title="Bajar bloque"
              >
                ↓
              </button>

              {form.blocks.length > 1 && (
                <button
                  className={`${styles.iconBtn} ${styles.del}`}
                  onClick={() => removeBlock(index)}
                  type="button"
                  title="Eliminar bloque"
                >
                  <FaTrash />
                </button>
              )}
            </div>
          </div>

          <div className={styles.field}>
            <label className={styles.label}>
              Tipo de bloque
            </label>

            <select
              className={styles.select}
              value={block.type}
              onChange={(event) =>
                handleBlockChange(
                  index,
                  "type",
                  event.target.value
                )
              }
            >
              <option value="yesno">
                Pregunta Sí/No
              </option>

              <option value="text">
                Texto informativo
              </option>

              <option value="note">
                Nota destacada
              </option>
            </select>
          </div>

{block.type !== "yesno" ? (
  <>
    {block.type === "text" && (
      <div className={styles.field}>
        <label className={styles.label}>
          Título del apartado
        </label>

        <input
          className={styles.input}
          value={block.label || ""}
          onChange={(event) =>
            handleBlockChange(
              index,
              "label",
              event.target.value
            )
          }
          placeholder="Ej: Información importante"
        />
      </div>
    )}

    <div className={styles.field}>
      <label className={styles.label}>
        {block.type === "note"
          ? "Contenido de la nota"
          : "Contenido del apartado"}
      </label>

      <textarea
        className={`${styles.input} ${styles.receiptTextarea}`}
        value={block.content || ""}
        onChange={(event) =>
          handleBlockChange(
            index,
            "content",
            event.target.value
          )
        }
        rows={4}
      />
    </div>
  </>
) : (
            <>
              <div className={styles.receiptInlineFields}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Key interna opcional
                  </label>

                  <input
                    className={styles.input}
                    value={block.key || ""}
                    onChange={(event) =>
                      handleBlockChange(
                        index,
                        "key",
                        event.target.value
                      )
                    }
                    placeholder="El backend la genera si está vacía"
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Obligatoria
                  </label>

                  <select
                    className={styles.select}
                    value={
                      block.required === "no" ||
                      block.required === false
                        ? "no"
                        : "si"
                    }
                    onChange={(event) =>
                      handleBlockChange(
                        index,
                        "required",
                        event.target.value
                      )
                    }
                  >
                    <option value="si">Sí</option>
                    <option value="no">No</option>
                  </select>
                </div>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>
                  Pregunta visible
                </label>

                <input
                  className={styles.input}
                  value={block.label || ""}
                  onChange={(event) =>
                    handleBlockChange(
                      index,
                      "label",
                      event.target.value
                    )
                  }
                />
              </div>

              <div className={styles.receiptInlineFields}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Texto si responde Sí
                  </label>

                  <textarea
                    className={`${styles.input} ${styles.receiptTextarea}`}
                    value={block.yesText || ""}
                    onChange={(event) =>
                      handleBlockChange(
                        index,
                        "yesText",
                        event.target.value
                      )
                    }
                    rows={3}
                  />
                </div>

                <div className={styles.field}>
                  <label className={styles.label}>
                    Texto si responde No
                  </label>

                  <textarea
                    className={`${styles.input} ${styles.receiptTextarea}`}
                    value={block.noText || ""}
                    onChange={(event) =>
                      handleBlockChange(
                        index,
                        "noText",
                        event.target.value
                      )
                    }
                    rows={3}
                  />
                </div>
              </div>

              <div className={styles.receiptInlineFields}>
                <div className={styles.field}>
                  <label className={styles.label}>
                    Bloqueo de firma
                  </label>

                  <select
                    className={styles.select}
                    value={
                      block.blocksSignatureIfAnswer || ""
                    }
                    onChange={(event) =>
                      handleBlockChange(
                        index,
                        "blocksSignatureIfAnswer",
                        event.target.value
                      )
                    }
                  >
                    <option value="">
                      No bloquea
                    </option>

                    <option value="yes">
                      Bloquea si responde Sí
                    </option>

                    <option value="no">
                      Bloquea si responde No
                    </option>
                  </select>
                </div>

                {block.blocksSignatureIfAnswer && (
                  <div className={styles.field}>
                    <label className={styles.label}>
                      Mensaje de bloqueo
                    </label>

                    <textarea
                      className={`${styles.input} ${styles.receiptTextareaSmall}`}
                      value={block.blockMessage || ""}
                      onChange={(event) =>
                        handleBlockChange(
                          index,
                          "blockMessage",
                          event.target.value
                        )
                      }
                      rows={2}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      ))}

      <div className={styles.field}>
        <label className={styles.label}>
          Texto final
        </label>

        <textarea
          className={`${styles.input} ${styles.receiptTextarea}`}
          name="finalText"
          value={form.finalText}
          onChange={handleChange}
          rows={3}
        />
      </div>

      <div className={styles.modalBtns}>
        <button
          className={`${styles.btn} ${styles.btnGhost}`}
          onClick={onCancel}
          type="button"
        >
          Cancelar
        </button>

        <button
          className={`${styles.btn} ${styles.btnBlue}`}
          onClick={handleSubmit}
          type="button"
        >
          {item ? "Guardar" : "Crear"}
        </button>
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
  <span className={styles.badgeFecha}>
  {item.blocks?.length ||
    item.questions?.length ||
    0}{" "}
  bloques
</span>
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