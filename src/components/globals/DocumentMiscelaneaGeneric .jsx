import React, { useEffect, useState } from "react";
import { getToken } from "../../lib/serviceToken";
import {
  getFileDrive,
  createFileDrive,
  updateFileDrive,
  deleteFileDrive
} from "../../lib/data";

import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";

import { validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { formatDate } from "../../lib/utils";

import { FaTrash } from "react-icons/fa6";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn, CiFileOff } from "react-icons/ci";

import styles from "../styles/documentMiscelanea.module.css";

/**
 * @param {Object} props
 * @param {Object} props.data - El objeto user, program o device
 * @param {String} props.modelName - "User", "Program" o "Device"
 * @param {String} [props.parentId] - En caso de modelo "Device", se debe pasar el _id del programa padre.
 * @param {Array} props.officialDocs - Lista de documentos oficiales
 * @param {Function} props.modal - Para mostrar mensajes
 * @param {Function} props.charge - Para mostrar/ocultar loader
 * @param {Function} props.onChange - Callback para actualizar el padre cuando se sube/edita/borra
 */
function DocumentMiscelaneaGeneric({
  data,
  modelName,
  officialDocs,
  modal,
  charge,
  onChange,
  parentId = null
}) {
  // 1) Extraer/transformar los archivos en un array normalizado
  const [normalizedFiles, setNormalizedFiles] = useState([]);

  useEffect(() => {
    setNormalizedFiles(transformFiles(data, modelName));
  }, [data, modelName]);

  
  // =============== ESTADOS para modales ===============
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });

  // 2) Separar en oficiales vs misceláneos
  const officialDocumentsToShow = officialDocs.map((doc) => {
    const fileFound = normalizedFiles.find(
      (f) =>
        f.originDocumentation?.toString() === doc._id.toString()
    );
    return { doc, file: fileFound };
  });
  const extraFiles = normalizedFiles.filter((f) => !f.originDocumentation);

  // ==================================================
  // ============== DESCARGA DE ARCHIVO ===============
  // ==================================================
  const handleDownloadFile = async (fileObj) => {
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
      // Descargar
      const link = document.createElement("a");
      link.href = response.url;
      const finalName = fileObj.fileLabel || fileObj.description || "documento.pdf";
      link.download = `${finalName}.pdf`;
      link.click();
      URL.revokeObjectURL(response.url);
    } catch (err) {
      console.log(err);
      modal("Error", "No se pudo descargar el archivo.");
    } finally {
      charge(false);
    }
  };

  // ==================================================
  // ============== ELIMINAR ARCHIVO ==================
  // ==================================================
  const handleDeleteFile = (fileObj) => {
    setDeleteModal({ open: true, file: fileObj });
  };
  const confirmDeleteFile = async () => {
    const fileObj = deleteModal.file;
    if (!fileObj) return;
    try {
      charge(true);
      const token = getToken();
      // Validación: para Device se requiere parentId
      if (modelName.toLowerCase() === "device" && !parentId) {
        modal("Error", "Falta el idModel (parentId) para el dispositivo.");
        return;
      }
      // Armar payload
      const payload = {
        fileId: fileObj._id, // Filedrive._id
        originModel: modelName,
        idModel: modelName.toLowerCase() === "device" ? parentId : data._id,
        ...(modelName.toLowerCase() === "device" ? { deviceId: data._id } : {})
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
  // ==== SUBIR/ACTUALIZAR DOCUMENTOS OFICIALES ========
  // ==================================================
  const handleUploadOfficialFromSelect = () => {
    setFormConfig({
      title: `Subir documentación oficial (${modelName})`,
      message: "Seleccione el tipo, suba el archivo y, opcionalmente, indique fecha:",
      fields: [
        {
          label: "Tipo de documento oficial",
          name: "docId",
          type: "select",
          required: true,
          options: [
            { value: "", label: "Seleccione una opción" },
            ...officialDocs.map((d) => ({ value: d._id, label: d.label })),
          ],
        },
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        { label: "Fecha (opcional)", name: "date", type: "date" },
      ],
      onSubmit: async ({ docId, file, date }) => {
        try {
          // Validación: para Device se requiere parentId
          if (modelName.toLowerCase() === "device" && !parentId) {
            modal("Error", "Falta el idModel (parentId) para el dispositivo.");
            return;
          }
          charge(true);
          const token = getToken();
          const already = officialDocumentsToShow.find(
            ({ doc, file: existingF }) =>
              doc._id.toString() === docId.toString() && existingF
          );
          const isUpdating = !!already?.file;

          const payload = {
            file,
            originModel: modelName,
            idModel: modelName.toLowerCase() === "device" ? parentId : data._id,
            ...(modelName.toLowerCase() === "device" ? { deviceId: data._id } : {}),
            originDocumentation: docId,
            date,
            description:
              (officialDocs.find(
                (d) => d._id.toString() === docId.toString()
              )?.label) || "",
          };

          let updatedData;
          if (isUpdating) {
            payload.fileId = already.file._id;
            updatedData = await updateFileDrive(payload, token);
          } else {
            updatedData = await createFileDrive(payload, token);
          }
          if (!updatedData || updatedData.error) {
            modal(
              "Error",
              updatedData?.message || "No se pudo subir/actualizar el archivo."
            );
            return;
          }
          onChange(updatedData);
          modal(
            "Documento oficial",
            isUpdating
              ? "Documento actualizado con éxito."
              : "Documento subido con éxito."
          );
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
  // ==== SUBIR DOCUMENTOS MISCELÁNEOS ================
  // ==================================================
  const handleFileUploadExtra = () => {
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
        { label: "Fecha (opcional)", name: "date", type: "date" },
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
          // Validación: para Device se requiere parentId
          if (modelName.toLowerCase() === "device" && !parentId) {
            modal("Error", "Falta el idModel (parentId) para el dispositivo.");
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
            description: description || fileName,
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
  // ====== ACTUALIZAR DOCUMENTOS MISCELÁNEOS =========
  // ==================================================
  const handleUpdateFileExtra = (fileObj) => {
    setFormConfig({
      title: `Actualizar documento: ${fileObj.fileLabel || fileObj.description}`,
      message: "Seleccione un archivo nuevo (opcional) y modifique lo que desee:",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: false },
        { label: "Nombre del documento", name: "fileName", type: "text", required: false },
        { label: "Fecha (opcional)", name: "date", type: "date", required: false },
        { label: "Descripción (opcional)", name: "description", type: "text", required: false },
      ],
      onSubmit: async ({ file, fileName, date, description }) => {
        try {
          // Validación: para Device se requiere parentId
          if (modelName.toLowerCase() === "device" && !parentId) {
            modal("Error", "Falta el idModel (parentId) para el dispositivo.");
            return;
          }
          charge(true);
          const token = getToken();
          const payload = {
            fileId: fileObj._id,
            originModel: modelName,
            idModel: modelName.toLowerCase() === "device" ? parentId : data._id,
            ...(modelName.toLowerCase() === "device" ? { deviceId: data._id } : {}),
            description: description || fileObj.description,
          };
          if (file) payload.file = file;
          if (fileName) {
            payload.fileName = fileName.trim();
            payload.fileLabel = fileName.trim();
          }
          if (date) payload.date = date;

          const updatedData = await updateFileDrive(payload, token);
          if (!updatedData || updatedData.error) {
            modal("Error", updatedData?.message || "No se pudo actualizar el archivo.");
            return;
          }
          onChange(updatedData);
          modal(
            "Documento actualizado",
            `El documento "${fileName || fileObj.fileLabel || fileObj.description}" se actualizó.`
          );
        } catch (err) {
          modal("Error", "No se pudo actualizar el archivo.");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  return (
    <div className={styles.contenedor}>
      <h2>DOCUMENTOS</h2>

      {/* Documentación Oficial */}
      <h3 className={styles.titulin}>
        Documentación Oficial
        <AiOutlineCloudUpload
          className={styles.uploadButton}
          onClick={handleUploadOfficialFromSelect}
        />
      </h3>
      <div className={styles.contentDocumentOficial}>
        {officialDocumentsToShow.length === 0 && (
          <p>No hay documentación oficial configurada.</p>
        )}
        {officialDocumentsToShow.map(({ doc, file }) => (
          <div key={doc._id} className={styles.fileRow}>
            {file ? (
              <div className={styles.iconos}>
                <CiFileOn
                  color="green"
                  onClick={() => handleDownloadFile(file)}
                  style={{ cursor: "pointer" }}
                />
                <FaTrash
                  onClick={() => handleDeleteFile(file)}
                  style={{ cursor: "pointer", marginLeft: "0.5rem" }}
                />
              </div>
            ) : (
              <div className={styles.iconos}>
                <CiFileOff
                  color="tomato"
                  onClick={handleUploadOfficialFromSelect}
                  style={{ cursor: "pointer" }}
                />
              </div>
            )}

            <div className={styles.infoFile}>
              <label>{doc.label}</label>
              {file?.date && (
                <div className={styles.dateFile}>
                  <p>{`Válido hasta: ${formatDate(file.date)}`}</p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Documentos misceláneos */}
      <h3 className={styles.titulin}>
        Documentación Complementaria
        <AiOutlineCloudUpload
          className={styles.uploadButton}
          onClick={handleFileUploadExtra}
        />
      </h3>
      <div className={styles.contentDocument}>
        {extraFiles.length === 0 && <p>No hay archivos adicionales subidos.</p>}
        {extraFiles.map((fileObj) => (
          <div key={fileObj._id} className={styles.fileRow}>
            <div className={styles.iconos}>
              <CiFileOn
                color="green"
                onClick={() => handleDownloadFile(fileObj)}
                style={{ cursor: "pointer" }}
              />
              <AiOutlineCloudUpload
                onClick={() => handleUpdateFileExtra(fileObj)}
                style={{ cursor: "pointer", marginLeft: "0.5rem" }}
              />
              <FaTrash
                onClick={() => handleDeleteFile(fileObj)}
                style={{ cursor: "pointer", marginLeft: "0.5rem" }}
              />
            </div>

            <div className={styles.infoFile}>
              <label>{fileObj.fileLabel || "Documento adicional"}</label>
              {fileObj.date && (
                <div className={styles.dateFile}>
                  <p>{`Válido hasta: ${formatDate(fileObj.date)}`}</p>
                </div>
              )}
            </div>
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
        />
      )}

      {/* Modal confirmación borrado */}
      {deleteModal.open && (
        <ModalConfirmation
          title="Confirmar eliminación"
          message={`¿Eliminar "${
            deleteModal.file?.fileLabel || deleteModal.file?.description
          }"?`}
          onConfirm={confirmDeleteFile}
          onCancel={cancelDeleteFile}
        />
      )}
    </div>
  );
}

export default DocumentMiscelaneaGeneric;

/**
 * Función auxiliar para transformar el array de archivos
 * dependiendo del modelo.
 */
function transformFiles(data, modelName) {
  if (!data) return [];
  if (modelName === "User") {
    // Para User, se espera data.files como [{ filesId: { ... } }, ...]
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
          idDrive: f.idDrive
        };
      })
      .filter(Boolean);
  } else if (modelName === "Device") {
    // Para Device, se espera que data.files sea un array de documentos Filedrive
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
          idDrive: f.idDrive
        };
      })
      .filter(Boolean);
  } else {
    // Para Program, se espera que data.files sea un array similar a Device
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
          idDrive: f.idDrive
        };
      })
      .filter(Boolean);
  }
}
