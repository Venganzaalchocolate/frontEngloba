import React, { useEffect, useState } from "react";
import { FaEdit, FaTrash, FaPlus, FaEye, } from "react-icons/fa";
import { FaFileCircleMinus } from "react-icons/fa6";
import { getFileDrive } from "../../lib/data";
import ModalConfirmation from "../globals/ModalConfirmation";
import EnumFormDocumentation from "./EnumFormDocumentation";
import styles from "../styles/EnumCRUD.module.css";
import { getToken } from "../../lib/serviceToken.js";

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

  const [preview, setPreview] = useState(null); // { url, title }
  const [loadingId, setLoadingId] = useState(null);

  const revokePreviewUrl = (url) => {
    if (url && typeof url === "string" && url.startsWith("blob:")) {
      URL.revokeObjectURL(url);
    }
  };

  const closePreview = () => {
    revokePreviewUrl(preview?.url);
    setPreview(null);
  };

  // ✅ cleanup si el componente se desmonta
  useEffect(() => {
    return () => revokePreviewUrl(preview?.url);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePreview = async (item) => {
    if (!item?.modeloPDF) return;
    if (loadingId === item._id) return;

    const token = getToken();
    if (!token) {
      modal("Sesión caducada", "Vuelve a iniciar sesión para ver el archivo.");
      return;
    }

    try {
      setLoadingId(item._id);

      const res = await getFileDrive({ idFile: item.modeloPDF }, token);

      if (res?.error || !res?.url) {
        modal("Error", res?.message || "No se pudo cargar el archivo.");
        return;
      }

      // ✅ revocar preview anterior antes de mostrar uno nuevo
      revokePreviewUrl(preview?.url);

      setPreview({ url: res.url, title: item.name || "Modelo PDF" });
    } catch (e) {
      modal("Error", "No se pudo cargar el archivo.");
    } finally {
      setLoadingId(null);
    }
  };

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
      message: (item.name) ?`¿Eliminar el documento "${item.name}"?`:`¿Eliminar el archivo asociado?`,
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

                        {item.modeloPDF && (
                          <>
                          <button
                            className={`${styles.iconBtn} ${styles.view}`}
                            title="Ver modelo PDF"
                            onClick={() => handlePreview(item)}
                            disabled={loadingId === item._id}
                          >
                            <FaEye />
                          </button>
                          <button className={`${styles.btnEliminar}`} onClick={()=>handleDelete({id:item._id,modeloPDF:item.modeloPDF})}>
                          <FaFileCircleMinus/>
                </button>
                          </>
                          
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

      {preview && (
        <div className={styles.modalOverlay} onClick={closePreview}>
          <div className={styles.modalCard} onClick={(e) => e.stopPropagation()}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 12,
              }}
            >
              <h3 className={styles.formTitle} style={{ margin: 0 }}>
                {preview.title}
              </h3>

              <div style={{ display: "flex", gap: 8 }}>
                <button
                  onClick={() => window.open(preview.url, "_blank", "noopener,noreferrer")}
                >
                  Abrir
                </button>
                <button className={`${styles.btn} ${styles.btnGhost}`} onClick={closePreview}>
                  Cerrar
                </button>
                
              </div>
            </div>

            <div style={{ marginTop: 12, height: "70vh" }}>
              <iframe
                title="modeloPDF"
                src={preview.url}
                style={{ width: "100%", height: "100%", border: 0, borderRadius: 12 }}
              />
            </div>
          </div>
        </div>
      )}

      {confirm && <ModalConfirmation {...confirm} />}
    </div>
  );
}
