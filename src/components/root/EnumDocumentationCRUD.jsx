import React, { useState } from "react";
import { FaEdit, FaTrash, FaPlus } from "react-icons/fa";
import ModalConfirmation from "../globals/ModalConfirmation";
import EnumFormDocumentation from "./EnumFormDocumentation";
import styles from "../styles/EnumCRUD.module.css";

export default function EnumDocumentationCRUD({
  data,
  onEdit,
  onDelete,
  onCreate,
  enumsData,
  modal,
}) {
  const [mode, setMode] = useState(null); // 'edit' | 'create'
  const [current, setCurrent] = useState(null);
  const [confirm, setConfirm] = useState(null);

  const close = () => {
    setMode(null);
    setCurrent(null);
  };

  const startEdit = (item) => {
    setCurrent(item);
    setMode("edit");
  };

  const startCreate = (model = "", categoryFiles = "") => {
    setCurrent(model && categoryFiles ? { model, categoryFiles } : null);
    setMode("create");
  };

  const handleDelete = (item) => {
    setConfirm({
      title: "Confirmar eliminación",
      message: `¿Eliminar el documento "${item.name}"?`,
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
        <h2 className={styles.h2}>Gestionar Documentación</h2>
        <button className={styles.btnPrimary} onClick={() => startCreate()}>
          <FaPlus /> Nuevo documento
        </button>
      </div>

      {Object.keys(data).length === 0 && (
        <p className={styles.empty}>No hay documentos registrados.</p>
      )}

      {Object.entries(data).map(([model, cats]) => (
        <div key={model} className={styles.modelGroup}>
          <h3 className={styles.modelTitle}>
            Sección: <span>{model}</span>
          </h3>

          {Object.entries(cats).map(([cat, docs]) => (
            <div key={cat} className={styles.categoryGroup}>
              <div className={styles.categoryHeader}>
                <h4 className={styles.categoryTitle}>
                  {cat} <span className={styles.count}>({docs.length})</span>
                </h4>
                <button
                  className={`${styles.iconBtn} ${styles.addSub}`}
                  onClick={() => startCreate(model, cat)}
                >
                  <FaPlus />
                </button>
              </div>

              {docs.length === 0 ? (
                <p className={styles.emptyCategory}>No hay documentos en esta categoría.</p>
              ) : (
                docs.map((item) => (
                  <div key={item._id} className={styles.card}>
                    <div className={styles.cardHead}>
                      <div className={styles.cardTitle}>
                        {item.name}
                        {item.requiresSignature && (
                          <span className={styles.badgeFirma}>Firma</span>
                        )}
                        {item.date && (
                          <span className={styles.badgeFecha}>
                            {item.duration ? `${item.duration} días` : "Con fecha"}
                          </span>
                        )}
                      </div>
                      <div className={styles.actions}>
                        <button
                          className={`${styles.iconBtn} ${styles.edit}`}
                          onClick={() => startEdit(item)}
                        >
                          <FaEdit />
                        </button>
                        <button
                          className={`${styles.iconBtn} ${styles.del}`}
                          onClick={() => handleDelete(item)}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          ))}
        </div>
      ))}

      {mode && (
        <div className={styles.modalOverlay}>
          <EnumFormDocumentation
            item={current}
            onCancel={close}
            onSubmit={(form) => {
              if (mode === "edit") onEdit(current, form);
              else onCreate(form);
              close();
            }}
            enumsData={enumsData}
            modal={modal}
          />
        </div>
      )}

      {confirm && <ModalConfirmation {...confirm} />}
    </div>
  );
}
