import React, { useEffect, useState } from "react";
import { getToken } from "../../lib/serviceToken";
import {
  getFileDrive,
  createFileDrive,
  updateFileDrive,
  deleteFileDrive
} from "../../lib/data";

import ModalForm from "./ModalForm";
import ModalConfirmation from "./ModalConfirmation";

import { validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { calcularTiempoRestante, formatDate } from "../../lib/utils";

import { FaTrash } from "react-icons/fa6";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn } from "react-icons/ci";

import styles from "../styles/documentMiscelanea.module.css";
import { BsPlusSquare } from "react-icons/bs";

/**
 * @param {Object} props
 * @param {Object} props.data - El objeto user, program o device
 * @param {String} props.modelName - "User", "Program" o "Device"
 * @param {String} [props.parentId] - En caso de modelo "Device", se debe pasar el _id del programa padre.
 * @param {Array} props.officialDocs - Lista de documentos oficiales
 * @param {Function} props.modal - Para mostrar mensajes
 * @param {Function} props.charge - Para mostrar/ocultar loader
 * @param {Function} props.onChange - Callback para actualizar el padre cuando se sube/edita/borra
 * @param {Boolean} [props.authorized] - Controla si se muestra la parte de edición
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
}) => {
  // 1) Extraer/transformar los archivos en un array normalizado
  const [normalizedFiles, setNormalizedFiles] = useState([]);
  useEffect(() => {
    const tranformData = transformFiles(data, modelName);
    setNormalizedFiles(tranformData);
  }, [data, modelName]);



  // =============== ESTADOS para modales ===============
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });

  // 2) Agrupar documentos oficiales con sus archivos (antes usábamos .find)
  const officialDocumentsToShow = officialDocs.map((doc) => {
    const filesForDoc = normalizedFiles.filter(
      f => f.originDocumentation?.toString() === doc._id.toString()
    );
    return { doc, files: filesForDoc };
  });


  // 3) Agrupar los tipos de documentos oficiales por categoría
  const officialByCategory = officialDocumentsToShow.reduce((acc, { doc, files }) => {
    const cat = doc.categoryFiles || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ doc, files });
    return acc;
  }, {});

  const extraFiles = normalizedFiles.filter(f => !f.originDocumentation);

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
  const handleUploadOfficialFromSelect = (presetDocId = "") => {
    // 1) encontrar el doc preseleccionado
  const selectedDoc = officialDocs.find(d => d._id.toString() === presetDocId.toString());
  const todayStr = new Date().toISOString().split('T')[0];
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
          disabled:(presetDocId)?true:false,
          defaultValue: presetDocId,
          options: [
            { value: "", label: "Seleccione una opción" },
            ...officialDocs.map((d) => ({ value: d._id, label: d.label })),
          ],
        },
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          // IMPORTANTE: la fecha es obligatoria si doc.date === true
          label: "Fecha de expedición",
          required: selectedDoc?.date === true || false,
          name: "date",
          type: "date",
          defaultValue:todayStr
          // No marcamos "required" global, pero haremos la validación
          // en el onSubmit según doc.date === true
        },

      ],
      onSubmit: async ({ docId, file, date }) => {
        try {
          charge(true);
          // 1) Determinar si el doc requerido tiene date == true
          const selectedDoc = officialDocs.find(
            (d) => d._id.toString() === docId.toString()
          );
          if (!selectedDoc) {
            modal("Error", "No se encontró el tipo de documento seleccionado.");
            return;
          }

          // 2) Si date == true, forzamos fecha obligatoria y (opcional) validamos >= hoy
          if (selectedDoc.date === true) {
            if (!date) {
              modal(
                "Error",
                `El documento "${selectedDoc.label}" requiere fecha obligatoria.`
              );
              return;
            }
            // const today = new Date();
            // today.setHours(0, 0, 0, 0);
            // const chosenDate = new Date(date);
            // if (chosenDate > today) {
            //   modal(
            //     "Error",
            //     `La fecha del documento "${selectedDoc.label}" no puede ser posterior a hoy.`
            //   );
            //   return;
            // }
          }

          // 3) Validación para Device con parentId
          if (modelName.toLowerCase() === "device" && !parentId) {
            modal("Error", "Falta el idModel (parentId) para el dispositivo.");
            return;
          }

          // 4) Subir o actualizar
          
          const token = getToken();

          // Ver si ya existe un doc oficial de este tipo
          const already = officialDocumentsToShow.find(
            ({ doc, file: existingF }) =>
              doc._id.toString() === docId.toString() && existingF
          );
          const isUpdating = false;

          // Preparar payload
          const payload = {
            file,
            originModel: modelName,
            idModel: modelName.toLowerCase() === "device" ? parentId : data._id,
            ...(modelName.toLowerCase() === "device" ? { deviceId: data._id } : {}),
            originDocumentation: docId,
            date,
            description: selectedDoc.label, // Por defecto, la descripción se asocia al label
            category: selectedDoc.categoryFiles || ''
          };

          

          let updatedData;
           updatedData = await createFileDrive(payload, token);


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
    
    const todayStr = new Date().toISOString().split('T')[0];
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
        { label: "Fecha (opcional)", name: "date", type: "date", defaultValue:todayStr },
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
    <div className={styles.contenedorDocument}>
      <h2>DOCUMENTOS</h2>

      {/* Documentación Oficial */}
      <h3 className={styles.titulin}>
        Documentación Oficial
      </h3>
      <div className={styles.contentDocumentOficial}>
        {officialDocumentsToShow.length === 0 && (
          <p>No hay documentación oficial configurada.</p>
        )}

        {Object.entries(officialByCategory).map(([category, docsArray]) => (
          <div key={category} className={styles.categoryGroup}>
            <h4 className={styles.categoryTitle}>{category}</h4>
            {docsArray.map(({ doc, files }) => (
              
              <div key={doc._id} className={(doc.model=='antiguomodelo')?styles.officialDocGroupUser:styles.officialDocGroup}>
                <label className={styles.docLabel}>{doc.label} {authorized &&
                  <AiOutlineCloudUpload
                    className={styles.uploadButton}
                    onClick={()=>handleUploadOfficialFromSelect(doc._id)}
                  />
                }</label>
                {files.length !== 0 && (
                  files.map(file => (
                    <div key={file._id} className={styles.fileRow}>
                      {file.date && ( <div className={styles.infoFile}>
                          <div className={styles.dateFile}>
                            <p>{`Fecha: ${formatDate(file.date)}`}</p>
                          </div>
                        
                      </div>
                      )}
                      <CiFileOn className={styles.fileOn} onClick={() => handleDownloadFile(file)} />
                      {authorized && <FaTrash className={styles.trash} onClick={() => handleDeleteFile(file)} />}
                      {/* resto de info (fecha, tiempo restante) */}
                    </div>
                  ))
                )}
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Documentos misceláneos */}
      <h3 className={styles.titulin}>
        Documentación Complementaria
        {authorized &&
          <AiOutlineCloudUpload
            className={styles.uploadButton}
            onClick={handleFileUploadExtra}
          />
        }
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
              {authorized && (
                <>
                  <AiOutlineCloudUpload
                    onClick={() => handleUpdateFileExtra(fileObj)}
                    style={{ cursor: "pointer", marginLeft: "0.5rem" }}
                  />
                  <FaTrash
                    onClick={() => handleDeleteFile(fileObj)}
                    style={{ cursor: "pointer", marginLeft: "0.5rem" }}
                  />
                </>
              )}
            </div>

            <div className={styles.infoFile}>
            {fileObj.date && (
                <div className={styles.dateFile}>
                  <p>{`Fecha: ${formatDate(fileObj.date)}`}</p>
                </div>
              )}
              <label>{fileObj.fileLabel || "Documento adicional"}</label>
              
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
          message={`¿Eliminar "${deleteModal.file?.fileLabel || deleteModal.file?.description}"?`}
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
    // Para Device, se espera que data.files sea un array de Filedrive
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

export default DocumentMiscelaneaGeneric;
