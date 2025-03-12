import React, { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa6";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn, CiFileOff } from "react-icons/ci";
import stylesTooltip from '../styles/tooltip.module.css';

// import styles from "../styles/documentProgram.module.css";
import styles from "../styles/documentMiscelanea.module.css";
// Utilidades y servicios
import { formatDate } from "../../lib/utils";
import { getToken } from "../../lib/serviceToken";
import {
  createFileDrive,
  getFileDrive,
  updateFileDrive,
  deleteFileDrive,
} from "../../lib/data";

// Componentes de Modal
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";

const DocumentMiscelanea = ({ user, enumsData, modal, charge, changeUser }) => {
    console.log(user)
  // Estado local con la lista de archivos (para render inmediato)
  const [documentationFiles, setDocumentationFiles] = useState(user.files || []);

  // Estado para el modal y configuración del formulario
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });

  // Actualiza el estado local cuando cambia user.files
  useEffect(() => {
    setDocumentationFiles(user.files || []);
  }, [user.files]);

  // --- CRUCE DE DATOS DE DOCUMENTACIÓN OFICIAL ---
  // Se extraen de enumsData los documentos oficiales para el modelo "User"
  const officialDocsFromEnums =
    (enumsData && enumsData.documentation
      ? enumsData.documentation.filter((doc) => doc.model === "User")
      : []) || [];

  // Para cada documento oficial, se busca si el usuario ya tiene un archivo asociado
  const officialDocumentsToShow = officialDocsFromEnums.map((doc) => {
    const file = documentationFiles.find(
      (file) =>
        file.filesId &&
        file.filesId.originDocumentation &&
        file.filesId.originDocumentation.toString() === doc._id.toString()
    );
    return { doc, file }; // file es null si no hay archivo
  });

  // Los archivos misceláneos son los que no tienen originDocumentation en filesId
  const extraFiles = documentationFiles.filter(
    (file) => !file.filesId || !file.filesId.originDocumentation
  );

  // ========================================
  //   DESCARGA DE ARCHIVOS
  // ========================================
  const handleDownloadFile = async (fileObj) => {
    // Se utiliza filesId.idDrive para obtener la URL
    if (!fileObj.filesId?.idDrive) {
      modal("Error", "No se ha encontrado el archivo.");
      return;
    }
    try {
      charge(true);
      const token = getToken();
      const response = await getFileDrive({ idFile: fileObj.filesId.idDrive }, token);
      if (!response?.url) {
        modal("Error", "No se pudo descargar el archivo (URL no disponible).");
        return;
      }
      const link = document.createElement("a");
      link.href = response.url;
      link.download =
      fileObj.filesId.fileLabel || fileObj.filesId.description
          ? `${user.firstName}_${user.lastName}-${fileObj.filesId.description}.pdf`
          : "documento.pdf";
      link.click();
      URL.revokeObjectURL(response.url);
    } catch (error) {
      modal("Error", "No se pudo descargar el archivo");
    } finally {
      charge(false);
    }
  };

  // ========================================
  //   ELIMINACIÓN DE ARCHIVOS
  // ========================================
  const handleDeleteFile = (fileObj) => {
    setDeleteModal({ open: true, file: fileObj });
  };

  const confirmDeleteFile = async () => {
    const fileObj = deleteModal.file;
    if (!fileObj) return;
    try {
      charge(true);
      const token = getToken();
      // Si el objeto tiene 'filesId', usamos ese _id; de lo contrario, usamos fileObj._id
      const fileId = fileObj.filesId ? fileObj.filesId._id : fileObj._id;
      // El backend devuelve el usuario actualizado
      const updatedUser = await deleteFileDrive({ fileId }, token);
      if (!updatedUser || updatedUser.error) {
        modal("Error", updatedUser?.message || "No se pudo eliminar el archivo.");
        return;
      }
      changeUser(updatedUser);
      modal(
        "Archivo eliminado",
        `El archivo "${fileObj.filesId.fileName || fileObj.filesId.description}" se ha eliminado.`
      );
    } catch (error) {
      modal("Error", "Hubo un problema al eliminar el archivo.");
    } finally {
      charge(false);
      setDeleteModal({ open: false, file: null });
    }
  };
  

  const cancelDeleteFile = () => {
    setDeleteModal({ open: false, file: null });
  };

  // ========================================
  //   SUBIR / ACTUALIZAR DOCUMENTOS OFICIALES DESDE SELECT
  // ========================================
  // Esta función abre un modal con un select para elegir el tipo de documento oficial.
  const handleUploadOfficialFromSelect = () => {
    setFormConfig({
      title: "Subir documentación oficial",
      message:
        "Seleccione el tipo de documento oficial, suba el archivo y, opcionalmente, indique una fecha:",
      fields: [
        {
          label: "Tipo de documento oficial",
          name: "docId",
          type: "select",
          required: true,
          options: [
            { value: "", label: "Seleccione una opción" },
            ...officialDocsFromEnums.map((doc) => ({
              value: doc._id,
              label: doc.label,
            })),
          ],
        },
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        { label: "Fecha (opcional)", name: "date", type: "date", required: false },
      ],
      onSubmit: async (values) => {
        const { docId, file, date } = values;
        try {
          charge(true);
          const token = getToken();
          const selectedDoc = officialDocsFromEnums.find(
            (doc) => doc._id.toString() === docId.toString()
          );
          const payload = {
            file,
            originModel: "User",
            idModel: user._id,
            originDocumentation: docId,
            date,
            notes: "",
            description: selectedDoc ? selectedDoc.label : "",
          };
  
          // Comprueba si ya existe un archivo para este documento oficial
          const existingEntry = officialDocumentsToShow.find(
            ({ doc }) => doc._id.toString() === docId.toString()
          );
  
          let updatedUser;
          if (existingEntry && existingEntry.file) {
            payload.fileId = existingEntry.file.filesId._id;
            updatedUser = await updateFileDrive(payload, token);
          } else {
            // Es creación
            updatedUser = await createFileDrive(payload, token);
          }
  
          if (!updatedUser || updatedUser.error) {
            modal("Error", updatedUser?.message || "No se pudo subir el archivo.");
            return;
          }
          changeUser(updatedUser);
          modal(
            "Documento oficial",
            existingEntry && existingEntry.file
              ? "El documento oficial se actualizó correctamente."
              : "El documento oficial se subió correctamente."
          );
        } catch (error) {
          modal("Error", "No se pudo subir el archivo.");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });
    setIsModalOpen(true);
  };
  

  // ========================================
  //   SUBIR DOCUMENTOS MISCELÁNEOS
  // ========================================
  const handleFileUploadExtra = () => {
    setFormConfig({
      title: "Subir documento adicional",
      message: "Complete los campos para subir un documento no oficial.",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          label: "Nombre del documento",
          name: "fileName",
          type: "text",
          placeholder: "Ej: Informe Financiero, Cláusulas Legales...",
          required: true,
          isValid: (texto) => {
            const isOk = validText(texto, 0, 100, true);  // por ejemplo min 2, max 100
            return isOk ? "" : textErrors("nameFile");
        }
          
        },
        { label: "Fecha (opcional)", name: "date", type: "date", required: false, },
        { label: "Descripción (opcional)", name: "description", type: "text", required: false,   
            isValid: (texto) => {
                  const isOk = validText(texto, 0, 200, true);  // por ejemplo min 2, max 100
                  return isOk ? "" : textErrors("descriptionFile");
            }},
      ],
      onSubmit: async ({ file, fileName, date, description }) => {
        if (!file) {
          modal("Error", "Debe seleccionar un archivo (PDF).");
          return;
        }
        if (!fileName) {
          modal("Error", "Debe indicar un nombre para el documento.");
          return;
        }
        try {
          charge(true);
          const token = getToken();
          const payloadCreate = {
            file,
            originModel: "User",
            idModel: user._id,
            fileName,
            fileLabel: fileName.trim(),
            date,
            notes: "",
            description: description || fileName,
            // Al no incluir originDocumentation, se considera misceláneo.
          };
          const updatedUser = await createFileDrive(payloadCreate, token);
          if (!updatedUser || updatedUser.error) {
            modal("Error", updatedUser?.message || "No se pudo subir el archivo.");
            return;
          }
          changeUser(updatedUser);
          modal("Documento subido", `El documento "${fileName}" se subió con éxito.`);
        } catch (error) {
          modal("Error", "No se pudo subir el archivo.");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  // ========================================
  //   ACTUALIZAR DOCUMENTOS MISCELÁNEOS
  // ========================================
  const handleUpdateFileExtra = (fileObj) => {
    setFormConfig({
      title: `Actualizar documento: ${fileObj.fileLabel || fileObj.description}`,
      message: "Seleccione un archivo nuevo (opcional) y modifique los campos que desee:",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: false },
        {
          label: "Nombre del documento",
          name: "fileName",
          type: "text",
          placeholder: "Ej: Informe Financiero...",
          required: false,
        },
        { label: "Fecha (opcional)", name: "date", type: "date", required: false },
        { label: "Descripción (opcional)", name: "description", type: "text", required: false },
      ],
      onSubmit: async ({ file, fileName, date, description }) => {
        try {
          charge(true);
          const token = getToken();
          const payloadUpdate = {
            fileId: fileObj.filesId._id,
            originModel: "User",
            idModel: user._id,
            notes: fileObj.notes || "",
            description: description || fileObj.description || "Documento adicional",
          };
          if (file) payloadUpdate.file = file;
          if (fileName) {
            payloadUpdate.fileName = fileName;
            payloadUpdate.fileLabel = fileName.trim();
          }
          if (date) payloadUpdate.date = date;

          

          const updatedUser = await updateFileDrive(payloadUpdate, token);
          if (!updatedUser || updatedUser.error) {
            modal("Error", updatedUser?.message || "No se pudo actualizar el archivo.");
            return;
          }
          changeUser(updatedUser);
          modal(
            "Documento actualizado",
            `El documento "${fileName || fileObj.fileLabel || fileObj.description}" se ha actualizado con éxito.`
          );
        } catch (error) {
          console.log(error)
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

      {/* Sección de documentación oficial con botón de acción */}
        <h3 className={styles.titulin}>Documentación Oficial <AiOutlineCloudUpload  className={styles.uploadButton} onClick={handleUploadOfficialFromSelect}/></h3>
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
                onClick={() => handleUploadOfficialFromSelect()}
                style={{ cursor: "pointer" }}
              />
            </div>
          )}
          <div className={styles.infoFile}>
            <label>{doc.label}</label>
            {file && file.filesId.date && (
              <div className={styles.dateFile}>
                <p>{`Válido hasta: ${formatDate(file.filesId.date)}`}</p>
                
              </div>
              
            )}
          </div>
          
        </div>
      ))}
      </div>
      

      {/* Sección de documentación complementaria */}
      <h3 className={styles.titulin}>Documentación Complementaria <AiOutlineCloudUpload className={styles.uploadButton} onClick={handleFileUploadExtra}/></h3>
      
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
            <label>

              {fileObj.filesId?.fileLabel || "Documento adicional"}
                    <p >{fileObj.filesId?.label}</p>

            </label>
            {fileObj.filesId.date && (
              <div className={styles.dateFile}>
                <p>{`Válido hasta: ${formatDate(fileObj.filesId.date)}`}</p>
              </div>
            )}
          </div>
        </div>
      ))}
      </div>
     

      {/* Modal para crear/editar archivos */}
      {isModalOpen && formConfig && (
        <ModalForm
          title={formConfig.title}
          message={formConfig.message}
          fields={formConfig.fields}
          onSubmit={formConfig.onSubmit}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Modal para confirmar eliminación */}
      {deleteModal.open && (
        <ModalConfirmation
          title="Confirmar eliminación"
          message={`¿Estás seguro de eliminar "${
            deleteModal.file?.fileLabel || deleteModal.file?.description
          }"?`}
          onConfirm={confirmDeleteFile}
          onCancel={cancelDeleteFile}
        />
      )}
    </div>
  );
};

export default DocumentMiscelanea;
