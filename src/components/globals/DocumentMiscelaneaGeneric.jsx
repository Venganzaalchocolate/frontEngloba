import React, { useEffect, useState } from "react";
import { getToken } from "../../lib/serviceToken";
import {
  getFileDrive,
  createFileDrive,
  updateFileDrive,
  deleteFileDrive,
  createChangeRequest,
} from "../../lib/data";

import ModalForm from "./ModalForm";
import ModalConfirmation from "./ModalConfirmation";

import { validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { compact, formatDate } from "../../lib/utils";

import { FaTrash } from "react-icons/fa6";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn } from "react-icons/ci";

import styles from "../styles/documentMiscelanea.module.css";

/**
 * @param {Object} props
 * @param {Object} props.data - El objeto user, program o device
 * @param {String} props.modelName - "User", "Program" o "Device"
 * @param {String} [props.parentId] - En caso de modelo "Device", se debe pasar el _id del programa padre.
 * @param {Array} props.officialDocs - Lista de documentos oficiales (con { _id, name, date?:bool, categoryFiles?:string })
 * @param {Function} props.modal - Para mostrar mensajes
 * @param {Function} props.charge - Para mostrar/ocultar loader
 * @param {Function} props.onChange - Callback para actualizar el padre cuando se sube/edita/borra
 * @param {Boolean} [props.authorized] - true = supervisor/HR (sube directo). false = empleado (solicita).
 * @param {Function} [props.onRequestCreated] - Notifica CR optimista/real al padre (para MyChangeRequests)
 */
const DocumentMiscelaneaGeneric = ({
  data,
  modelName,
  officialDocs,
  modal,
  charge,
  onChange,
  parentId = null,
  authorized = false,
  onRequestCreated = () => {},
}) => {
  // 1) Archivos normalizados del modelo
  const [normalizedFiles, setNormalizedFiles] = useState([]);
  useEffect(() => {
    setNormalizedFiles(transformFiles(data, modelName));
  }, [data, modelName]);

  // 2) Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });

  // 3) Agrupar oficiales con sus archivos
  const officialDocumentsToShow = (officialDocs || []).map((doc) => {
    const filesForDoc = normalizedFiles.filter(
      (f) => f.originDocumentation?.toString() === doc._id.toString()
    );
    return { doc, files: filesForDoc };
  });

  // 4) Por categoría
  const officialByCategory = officialDocumentsToShow.reduce((acc, { doc, files }) => {
    const cat = doc.categoryFiles || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ doc, files });
    return acc;
  }, {});

  // 5) Miscelánea (sin originDocumentation)
  const extraFiles = normalizedFiles.filter((f) => !f.originDocumentation);

  // ========= Helpers Optimismo =========
  const emitOptimisticCR = ({
    file,
    fileName,
    date,
    description,
    note,
    // oficiales:
    originDocumentation,
    category,
    type = "user-extra-doc",
  }) => {
    const clientId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const label = (fileName || file?.name || "Documento").trim();
    const desc = (description || label).trim();

    const optimisticCR = {
      _id: clientId,
      userId: data._id,
      status: "pending",
      submittedAt: new Date().toISOString(),
      note: note || "",
      changes: [],
      uploads: [
        {
          _id: `u-${clientId}`,
          type,
          originDocumentation: originDocumentation || undefined,
          category: category || (originDocumentation ? "Oficial" : "Varios"),
          date: date || null,
          description: desc,
          originalName: file?.name || label,
          labelFile: label,
        },
      ],
    };
    if (typeof onRequestCreated === "function") onRequestCreated(optimisticCR);
    return clientId;
  };

  // ==================================================
  // ============== DESCARGA DE ARCHIVO ===============
  // ==================================================
  const handleDownloadFile = async (docOrFalse, fileObj) => {
    if (!fileObj?.idDrive) {
      modal("Error", "No se ha encontrado el ID del archivo.");
      return;
    }
    try {
      charge(true);
      const token = getToken();
      const response = await getFileDrive({ idFile: fileObj.idDrive }, token);
      if (!response?.url) {
        modal("Error", "No se pudo descargar el archivo (URL no disponible).");
        return;
      }
      const link = document.createElement("a");
      link.href = response.url;

      // Nombre: <DocLabel>-<Nombre_Apellidos>.pdf
      const nameFileAux = !docOrFalse ? compact(fileObj.fileLabel) : compact(docOrFalse.name);
      const nameUserAux = compact(data.firstName);
      const lastUserAux = compact(data.lastName);
      const finalName = `${nameFileAux}-${nameUserAux}_${lastUserAux}`;

      link.download = `${finalName}.pdf`;
      link.click();
      URL.revokeObjectURL(response.url);
    } catch (err) {
      modal("Error", "No se pudo descargar el archivo.");
    } finally {
      charge(false);
    }
  };

  // ==================================================
  // ============== ELIMINAR ARCHIVO ==================
  // ==================================================
  const handleDeleteFile = (fileObj) => setDeleteModal({ open: true, file: fileObj });

  const confirmDeleteFile = async () => {
    const fileObj = deleteModal.file;
    if (!fileObj) return;
    try {
      charge(true);
      const token = getToken();
      const payload = {
        fileId: fileObj._id,
        originModel: modelName,
        idModel: modelName.toLowerCase() === "device" ? parentId : data._id,
        ...(modelName.toLowerCase() === "device" ? { deviceId: data._id } : {}),
      };
      const updatedData = await deleteFileDrive(payload, token);
      if (!updatedData || updatedData.error) {
        modal("Error", updatedData?.message || "No se pudo eliminar el archivo.");
        return;
      }
      onChange(updatedData);
      modal("Archivo eliminado", "El archivo se ha eliminado con éxito.");
    } catch (err) {
      modal("Error", "Hubo un problema al eliminar el archivo.");
    } finally {
      charge(false);
      setDeleteModal({ open: false, file: null });
    }
  };

  const cancelDeleteFile = () => setDeleteModal({ open: false, file: null });

  // ==================================================
  // ==== SUBIR OFICIAL (RESPONSABLE) DIRECTO =========
  // ==================================================
  const handleUploadOfficialFromSelect = (presetDocId = "") => {
    const selectedDoc = (officialDocs || []).find(
      (d) => d._id.toString() === presetDocId.toString()
    );
    const todayStr = new Date().toISOString().split("T")[0];

    setFormConfig({
      title: `Subir documentación oficial (${modelName})`,
      message:
        "Seleccione el tipo, suba el archivo y, si el documento lo requiere, indique fecha:",
      fields: [
        {
          label: "Tipo de documento oficial",
          name: "docId",
          type: "select",
          required: true,
          disabled: !!presetDocId,
          defaultValue: presetDocId,
          options: [
            { value: "", label: "Seleccione una opción" },
            ...(officialDocs || []).map((d) => ({ value: d._id, label: d.name })),
          ],
        },
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          label: "Fecha de expedición",
          required: selectedDoc?.date === true || false,
          name: "date",
          type: "date",
          defaultValue: todayStr,
        },
      ],
      onSubmit: async ({ docId, file, date }) => {
        try {
          charge(true);
          const chosen = (officialDocs || []).find(
            (d) => d._id.toString() === docId.toString()
          );
          if (!chosen) {
            modal("Error", "No se encontró el tipo de documento seleccionado.");
            return;
          }
          if (chosen.date === true && !date) {
            modal("Error", `El documento "${chosen.name}" requiere fecha obligatoria.`);
            return;
          }

          const token = getToken();
          const payload = {
            file,
            originModel: modelName,
            idModel: modelName.toLowerCase() === "device" ? parentId : data._id,
            ...(modelName.toLowerCase() === "device" ? { deviceId: data._id } : {}),
            originDocumentation: docId, // ← OFICIAL
            date,
            description: chosen.name,
            category: chosen.categoryFiles || "Oficial",
          };

          const updatedData = await createFileDrive(payload, token);
          if (!updatedData || updatedData.error) {
            modal("Error", updatedData?.message || "No se pudo subir el archivo.");
            return;
          }

          onChange(updatedData);
          modal("Documento oficial", "Documento subido con éxito.");
        } catch (err) {
          modal("Error", "No se pudo subir el archivo.");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  // ==================================================
  // ==== SOLICITAR OFICIAL (EMPLEADO) por doc ========
  //   ⚠️ SIN label ni descripción (los pone el back en adopción)
  //   Mandamos originDocumentation para que al aprobar
  //   se cree Filedrive con ese vínculo (y salga en “Curriculum” etc.)
  // ==================================================
  const handleRequestOfficialUpload = (doc) => {
    const todayStr = new Date().toISOString().split("T")[0];

    setFormConfig({
      title: `Solicitar subida: ${doc.name}`,
      message:
        "Adjunta el PDF. Si el documento requiere fecha, introdúcela. Tu responsable revisará la petición.",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          label: "Fecha de expedición",
          name: "date",
          type: "date",
          required: !!doc.date, // obligatorio si el doc lo requiere
          defaultValue: todayStr,
        },
        { label: "Nota para el responsable (opcional)", name: "note", type: "textarea" },
      ],
      onSubmit: async ({ file, date, note }) => {
        if (!file) {
          modal("Error", "Debes adjuntar un PDF.");
          return;
        }

        const token = getToken();
        const noteText = `Solicitud de documentación oficial: ${doc.name}`;

        // Optimista (sin label/descr en meta; se mostrará con doc.name)
        const clientId = emitOptimisticCR({
          file,
          fileName: doc.name, // solo para pintar optimista
          date: date || null,
          description: doc.name, // solo optimista
          note: note || noteText,
          originDocumentation: doc._id,
          category: doc.categoryFiles || "Oficial",
          type: "user-official-doc",
        });

        try {
          charge(true);

          // Real: IMPORTANTE -> enviar originDocumentation en meta
          // y NO enviar labelFile/description para oficiales.
          const resp = await createChangeRequest(
            {
              userId: data._id,
              note: note || noteText,
              changes: [],
              uploads: [
                {
                  file, // el fichero real
                  originDocumentation: doc._id,         // ← clave para que quede en “Curriculum”
                  category: doc.categoryFiles || "Oficial",
                  date: date || null,
                  type: "user-official-doc",
                },
              ],
            },
            token
          );

          const created = resp?.data && resp?.data?._id ? resp.data : resp;
          if (!created || created.error) {
            throw new Error(created?.message || "No se pudo crear la solicitud");
          }

          // Reemplazar optimista por la CR real
          if (typeof onRequestCreated === "function") {
            onRequestCreated({ ...created, __replaceClientId: clientId });
          }
          modal("Solicitud enviada", "Tu petición de documento oficial está pendiente.");
        } catch (e) {
          // Retirar optimista si falla
          if (typeof onRequestCreated === "function") {
            onRequestCreated({ __deleteOptimistic: clientId });
          }
          modal("Error", e?.message || "No se pudo crear la solicitud");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });

    setIsModalOpen(true);
  };

  // ==================================================
  // ==== SUBIR MISCELÁNEO (RESPONSABLE) DIRECTO ======
  // ==================================================
  const handleFileUploadExtra = () => {
    const todayStr = new Date().toISOString().split("T")[0];
    setFormConfig({
      title: `Subir documento adicional (${modelName})`,
      message: "Complete los campos para subir un documento no oficial.",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          label: "Nombre del documento",
          name: "fileName",
          type: "text",
          placeholder: "Ej: Informe, Acuerdo...",
          required: true,
          isValid: (texto) => {
            const isOk = validText(texto, 2, 100, true);
            return isOk ? "" : textErrors("nameFile");
          },
        },
        { label: "Fecha (opcional)", name: "date", type: "date", defaultValue: todayStr },
        {
          label: "Descripción (opcional)",
          name: "description",
          type: "text",
          isValid: (texto) => {
            const isOk = validText(texto, 0, 200, true);
            return isOk ? "" : textErrors("descriptionFile");
          },
        },
      ],
      onSubmit: async ({ file, fileName, date, description }) => {
        try {
          if (!authorized) {
            modal("Permisos insuficientes", "Esta acción requiere permisos de edición.");
            return;
          }

          charge(true);
          const token = getToken();
          const payload = {
            file,
            originModel: modelName,
            idModel: modelName.toLowerCase() === "device" ? parentId : data._id,
            ...(modelName.toLowerCase() === "device" ? { deviceId: data._id } : {}),
            fileName: fileName.trim(),
            fileLabel: fileName.trim(),
            date,
            description: (description || fileName).trim(),
          };
          const updatedData = await createFileDrive(payload, token);
          if (!updatedData || updatedData.error) {
            modal("Error", updatedData?.message || "No se pudo subir el archivo.");
            return;
          }
          onChange(updatedData);
          modal("Documento adicional", `Se subió "${fileName}" con éxito.`);
        } catch (err) {
          modal("Error", "No se pudo subir el archivo.");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  // ==================================================
  // ====== ACTUALIZAR MISCELÁNEO =====================
  //   * Empleado => CR con optimismo
  //   * Supervisor => updateFileDrive directo
  // ==================================================
  const handleUpdateFileExtra = (fileObj) => {
    setFormConfig({
      title: `Actualizar documento: ${fileObj.fileLabel || fileObj.description || "Documento"}`,
      message: "Seleccione un archivo nuevo (opcional) y modifique lo que desee:",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: false },
        { label: "Nombre del documento", name: "fileName", type: "text", required: false },
        { label: "Fecha (opcional)", name: "date", type: "date", required: false },
        { label: "Descripción (opcional)", name: "description", type: "text", required: false },
      ],
      onSubmit: async ({ file, fileName, date, description }) => {
        // Empleado: petición con CR
        if (!authorized) {
          if (!file) {
            modal("Error", "Debes adjuntar un PDF.");
            return;
          }
          const token = getToken();
          const descFinal = (description || fileName || file.name || "Documento").trim();
          const noteText = `Solicitud de actualización de documentación complementaria${fileName ? `: ${fileName}` : ""}`;

          const clientId = emitOptimisticCR({
            file,
            fileName: fileName || file.name,
            date: date || null,
            description: descFinal,
            note: noteText,
            category: "Varios",
            type: "user-extra-doc",
          });

          try {
            charge(true);
            const resp = await createChangeRequest(
              {
                userId: data._id,
                note: noteText,
                changes: [],
                uploads: [
                  {
                    file,
                    category: "Varios",
                    date: date || null,
                    description: descFinal,
                    labelFile: (fileName || file.name || "Documento").trim(),
                    type: "user-extra-doc",
                  },
                ],
              },
              token
            );

            const created = resp?.data && resp?.data?._id ? resp.data : resp;
            if (!created || created.error) {
              throw new Error(created?.message || "No se pudo crear la solicitud");
            }

            if (typeof onRequestCreated === "function") {
              onRequestCreated({ ...created, __replaceClientId: clientId });
            }
            modal("Solicitud enviada", "Tu petición queda pendiente de aprobación.");
          } catch (err) {
            if (typeof onRequestCreated === "function") {
              onRequestCreated({ __deleteOptimistic: clientId });
            }
            modal("Error", err?.message || "No se pudo crear la solicitud");
          } finally {
            charge(false);
            setIsModalOpen(false);
          }
          return;
        }

        // Supervisor: directo
        try {
          charge(true);
          const token = getToken();
          const payload = {
            fileId: fileObj._id,
            originModel: modelName,
            idModel: modelName.toLowerCase() === "device" ? parentId : data._id,
            ...(modelName.toLowerCase() === "device" ? { deviceId: data._id } : {}),
            description: (description ?? fileObj.description) || "",
          };
          if (fileName && fileName.trim()) {
            payload.fileName = fileName.trim();
            payload.fileLabel = fileName.trim();
          }
          if (date) payload.date = date;
          if (file) payload.file = file;

          const updatedData = await updateFileDrive(payload, token);
          if (!updatedData || updatedData.error) {
            throw new Error(updatedData?.message || "No se pudo actualizar el archivo.");
          }
          onChange(updatedData);
          modal(
            "Documento actualizado",
            `El documento "${fileName || fileObj.fileLabel || fileObj.description || "Documento"}" se actualizó.`
          );
          setIsModalOpen(false);
        } catch (err) {
          modal("Error", err?.message || "No se pudo procesar la acción.");
        } finally {
          charge(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  // ==================================================
  // ====== PETICIÓN MISCELÁNEA (EMPLEADO) ============
  // ==================================================
  const handleRequestUpload = () => {
    const todayStr = new Date().toISOString().split("T")[0];

    setFormConfig({
      title: "Solicitar subida de documento",
      message: "Adjunta el PDF y completa los metadatos. Un responsable revisará la petición.",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          label: "Nombre del documento",
          name: "fileName",
          type: "text",
          placeholder: "Ej: Curso PRL 20h",
        },
        { label: "Fecha (opcional)", name: "date", type: "date", defaultValue: todayStr },
        { label: "Descripción (opcional)", name: "description", type: "text" },
        { label: "Nota para el responsable (opcional)", name: "note", type: "textarea" },
      ],
      onSubmit: async ({ file, fileName, date, description, note }) => {
        if (!file) {
          modal("Error", "Debes adjuntar un PDF.");
          return;
        }

        const token = getToken();
        const label = (fileName || file.name || "Documento").trim();
        const descFinal = (description || label).trim();
        const noteText = `Solicitud de actualización de documentación complementaria${fileName ? `: ${fileName}` : ""}`;

        // Optimista
        const clientId = emitOptimisticCR({
          file,
          fileName: label,
          date: date || null,
          description: descFinal,
          note: note || noteText,
          category: "Varios",
          type: "user-extra-doc",
        });

        try {
          charge(true);
          // Real
          const resp = await createChangeRequest(
            {
              userId: data._id,
              note: note || noteText,
              changes: [],
              uploads: [
                {
                  file,
                  category: "Varios",
                  date: date || null,
                  description: descFinal,
                  labelFile: label,
                  type: "user-extra-doc",
                },
              ],
            },
            token
          );

          const created = resp?.data && resp?.data?._id ? resp.data : resp;
          if (!created || created.error) {
            throw new Error(created?.message || "No se pudo crear la solicitud");
          }

          if (typeof onRequestCreated === "function") {
            onRequestCreated({ ...created, __replaceClientId: clientId });
          }

          modal("Solicitud enviada", "Tu petición de documento está pendiente de revisión.");
        } catch (e) {
          if (typeof onRequestCreated === "function") {
            onRequestCreated({ __deleteOptimistic: clientId });
          }
          modal("Error", e?.message || "No se pudo crear la solicitud");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });

    setIsModalOpen(true);
  };

  // ====================== RENDER ======================
  return (
    <div className={styles.contenedorDocument}>
      <h2>DOCUMENTOS</h2>

      {/* Documentación Oficial */}
      <h3 className={styles.titulin}>Documentación Oficial</h3>
      <div className={styles.contentDocumentOficial}>
        {officialDocumentsToShow.length === 0 && <p>No hay documentación oficial configurada.</p>}

        {Object.entries(officialByCategory).map(([category, docsArray]) => (
          <div key={category} className={styles.categoryGroup}>
            <h4 className={styles.categoryTitle}>{category}</h4>

            {docsArray.map(({ doc, files }) => (
              <div
                key={doc._id}
                className={doc.model === "antiguomodelo" ? styles.officialDocGroupUser : styles.officialDocGroup}
              >
                <div className={styles.docHeader}>
                  <label
                    className={styles.docLabeluploadButton}
                    onClick={authorized ? () => handleUploadOfficialFromSelect(doc._id) :  () =>handleRequestOfficialUpload(doc)}
                    title={authorized ? "Subir documento oficial" : "Solicitar subida de este documento oficial"}
                  >
                    {doc.name} <AiOutlineCloudUpload />
                  </label>

                  
                </div>

                {/* Archivos existentes para este doc */}
                {files.length !== 0 &&
                  files.map((file) => (
                    <div key={file._id} className={styles.fileRow}>
                      {file.date && (
                        <div className={styles.infoFile} onClick={() => handleDownloadFile(doc, file)}>
                          <p>
                            {`Fecha: ${formatDate(file.date)} `}
                            <CiFileOn />
                          </p>
                        </div>
                      )}
                      {authorized && (
                        <FaTrash className={styles.trash} onClick={() => handleDeleteFile(file)} />
                      )}
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Documentos misceláneos */}
      <h3 className={styles.titulin}>
        Documentación Complementaria
        {authorized ? (
          <AiOutlineCloudUpload
            className={styles.uploadButton}
            title={"Subir documento"}
            onClick={handleFileUploadExtra}
          />
        ) : (
          <button className={styles.requestBtn} onClick={handleRequestUpload}>
            Solicitar subida de documento
          </button>
        )}
      </h3>

      <div className={styles.contentDocumentMiscelanea}>
        {extraFiles.length === 0 && <p>No hay archivos adicionales subidos.</p>}

        {extraFiles.map((fileObj) => (
          <div key={fileObj._id} className={styles.fileRow}>
            <div className={styles.infoFile} onClick={() => handleDownloadFile(false, fileObj)}>
              {fileObj.date && (
                <p>
                  {`Fecha: ${formatDate(fileObj.date)} `}
                  <CiFileOn />
                </p>
              )}
              {fileObj.fileLabel || "Documento adicional"}
            </div>

            {authorized && (
              <>
                <AiOutlineCloudUpload
                  className={styles.uploadButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateFileExtra(fileObj);
                  }}
                  title="Actualizar archivo"
                />
                <FaTrash
                  className={styles.trash}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(fileObj);
                  }}
                  title="Eliminar archivo"
                />
              </>
            )}
          </div>
        ))}
      </div>

      {/* Modal principal */}
      {isModalOpen && formConfig && (
        <ModalForm
          title={formConfig.title}
          message={formConfig.message}
          fields={formConfig.fields}
          onSubmit={formConfig.onSubmit}
          onClose={() => setIsModalOpen(false)}
          modal={modal}
        />
      )}

      {/* Modal confirmación borrado */}
      {deleteModal.open && (
        
        <ModalConfirmation
          title="Confirmar eliminación"
          message={`¿Eliminar "${(!!deleteModal.file.originDocumentation)?deleteModal.file?.description : deleteModal.file?.fileLabel}"?`}
          onConfirm={confirmDeleteFile}
          onCancel={cancelDeleteFile}
        />
      )}
    </div>
  );
};

function transformFiles(data, modelName) {
  if (!data) return [];
  if (modelName === "User") {
    return (data.files || [])
      .map((item) => {
        if (!item?.filesId) return null;
        const f = item.filesId;
        return {
          _id: f._id,
          originDocumentation: f.originDocumentation,
          date: f.date || null,
          fileLabel: f.fileLabel || "",
          description: f.description || "",
          subDocId: item._id,
          idDrive: f.idDrive,
        };
      })
      .filter(Boolean);
  } else {
    return (data.files || [])
      .map((f) => {
        if (!f || !f._id) return null;
        return {
          _id: f._id,
          originDocumentation: f.originDocumentation,
          date: f.date || null,
          fileLabel: f.fileLabel || "",
          description: f.description || "",
          subDocId: null,
          idDrive: f.idDrive,
        };
      })
      .filter(Boolean);
  }
}

export default DocumentMiscelaneaGeneric;
