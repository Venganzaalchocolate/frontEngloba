import React, { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa6";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn, CiFileOff } from "react-icons/ci";

import styles from "../styles/documentProgram.module.css";

import { formatDate } from "../../lib/utils";
import { getToken } from "../../lib/serviceToken";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";

import {
  createFileDrive,
  getFileDrive,
  infoDocumentation,
  updateFileDrive,
  deleteFileDrive,
} from "../../lib/data";

/**
 * Componente que maneja la documentación (oficial y complementaria) de un programa.
 */
const DocumentProgramMiscelanea = ({
  program,                // Programa actual
  modal,                  // Para lanzar mensajes de éxito/error
  charge,                 // Para activar/desactivar spinner
  changeProgram,          // Función que actualiza el "program" en el padre
  enumsData,              // Datos enumerados (con la info de documentación oficial)
  handleProgramSaved,     // También se llama para actualizar el program en el padre
}) => {
  // Lista local de archivos con más detalle que sólo IDs.
  const [documentationFiles, setDocumentationFiles] = useState([]);

  // Modal de Form para subir/editar archivo
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);

  // Modal de confirmación para borrar
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    file: null,
  });



  // Cada vez que cambie program.files se vuelve a recargar la documentación
  useEffect(() => {
    if (program?.files && program.files.length > 0) {
      fetchDocumentationFiles(program.files);
    } else {
      setDocumentationFiles([]);
    }
  }, []);

  const updateDataLocal=(programNew, file)=>{
    fetchDocumentationFiles(programNew.files);
  }

  /**
   * Carga la info detallada de los archivos.
   */
  const fetchDocumentationFiles = async (idFiles) => {
    //program.files
    try {
      charge(true);
      const token = getToken();
      const response = await infoDocumentation({ filesId: idFiles }, token);
      if (response?.error) {
        modal("Error", response.message || "Error al cargar documentación");
      } else {
        setDocumentationFiles(response);
      }
    } catch (error) {
      modal("Error", "Ocurrió un problema al cargar la documentación");
    } finally {
      charge(false);
    }
  };

  /**
   * Actualiza el program en el componente padre.
   */
  const updateLocalAndParentProgram = (updatedProgram) => {
    // Se notifica al padre y se actualiza el estado global
    handleProgramSaved(updatedProgram);
    changeProgram(updatedProgram);
  };

  /**
   * Documentos oficiales que debería tener el programa.
   */
  const officialDocs = (program.essentialDocumentationProgram || [])
    .map((docId) =>
      enumsData.documentation.find(
        (doc) => doc._id.toString() === docId.toString()
      )
    )
    .filter(Boolean);

  /**
   * Retorna el archivo correspondiente a un documento oficial (si existe).
   */
  const getOfficialFile = (docOfficial) => {
    return documentationFiles.find(
      (f) =>
        f.originDocumentation &&
        f.originDocumentation.toString() === docOfficial._id.toString()
    );
  };

  /**
   * Filtra los archivos que no son oficiales.
   */
  const extraFiles = documentationFiles.filter((fileObj) => {
    if (!fileObj.originDocumentation) return true;
    const isOfficial = officialDocs.some(
      (doc) => doc._id.toString() === fileObj.originDocumentation?.toString()
    );
    return !isOfficial;
  });

  /**
   * Descarga un archivo desde Drive.
   */
  const handleDownloadFile = async (fileObj) => {
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
      link.download = fileObj.fileName
        ? `${fileObj.fileName}.pdf`
        : `${fileObj.description}.pdf`;
      link.click();
      URL.revokeObjectURL(response.url);
    } catch (error) {
      modal("Error", "No se pudo descargar el archivo");
    } finally {
      charge(false);
    }
  };

  /**
   * Abre el modal para confirmar borrado.
   */
  const handleDeleteFile = (fileObj) => {
    setDeleteModal({ open: true, file: fileObj });
  };

  /**
   * Confirma el borrado del archivo.
   */
  const confirmDeleteFile = async () => {
    const fileObj = deleteModal.file;
    if (!fileObj) return;
    try {
      charge(true);
      const token = getToken();
      const response = await deleteFileDrive({ fileId: fileObj._id }, token);
      if (!response || response.error) {
        modal("Error", response?.message || "No se pudo eliminar el archivo.");
        return;
      }
      // Actualizamos el estado local y program.files
      setDocumentationFiles((prev) =>
        prev.filter((doc) => doc._id !== fileObj._id)
      );
      const updatedFiles = (program.files || []).filter(
        (id) => id !== fileObj._id
      );
      const updatedProgram = { ...program, files: updatedFiles };
      updateLocalAndParentProgram(updatedProgram);
      modal(
        "Archivo eliminado",
        `El archivo "${fileObj.fileName || fileObj.description}" se ha eliminado.`
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

  /**
   * Función auxiliar para subir un archivo nuevo.
   */
  const uploadFileDrive = async (data) => {
    try {
      charge(true);
      const token = getToken();
      const response = await createFileDrive(data, token);
      if (response?.error) {
        modal("Error", response?.message || "No se pudo subir el archivo.");
        return null;
      }
      return response;
    } catch (error) {
      modal("Error", "Hubo un problema al subir el documento.");
      return null;
    } finally {
      charge(false);
    }
  };

  /**
   * Función auxiliar para actualizar un archivo existente.
   */
  const updateFileInBackend = async (data) => {
    try {
      charge(true);
      const token = getToken();
      const response = await updateFileDrive(data, token);
      if (response?.error) {
        modal("Error", response?.message || "No se pudo actualizar el archivo.");
        return null;
      }
      return response;
    } catch (error) {
      modal("Error", "Hubo un problema al actualizar el documento.");
      return null;
    } finally {
      charge(false);
    }
  };

  /**
   * Subir o actualizar documento oficial.
   */
  const handleFileUploadOfficial = (doc) => {
    const existingFile = getOfficialFile(doc);
    setFormConfig({
      title: `Subir documento oficial: ${doc.label}`,
      message: "Seleccione el archivo y la fecha (obligatoria):",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        { label: "Fecha", name: "date", type: "date", required: true },
      ],
      onSubmit: async (formData) => {
        const { file, date } = formData;
        if (!file || !date) {
          modal("Error", "Archivo y fecha son obligatorios para documentos oficiales.");
          return;
        }
        let newOrUpdatedFile = null;
        if (existingFile) {
          const payloadUpdate = {
            fileId: existingFile._id,
            file,
            originModel: "Program",
            idModel: program._id,
            originDocumentation: doc._id,
            date,
            notes: existingFile.notes || "",
            description: existingFile.description || `Documento oficial: ${doc.label}`,
          };
          newOrUpdatedFile = await updateFileInBackend(payloadUpdate);
        } else {
          const payloadCreate = {
            file,
            originModel: "Program",
            idModel: program._id,
            originDocumentation: doc._id,
            date,
            notes: "",
            description: `Documento oficial: ${doc.label}`,
          };
          newOrUpdatedFile = await uploadFileDrive(payloadCreate);
        }
        if (!newOrUpdatedFile) return;
        // Actualizamos program.files
        let updatedProgramFiles = [];
        if (existingFile) {
          updatedProgramFiles = program.files.map((fid) =>
            fid === existingFile._id ? newOrUpdatedFile.file._id : fid
          );
        } else {
          updatedProgramFiles = [...(program.files || []), newOrUpdatedFile.file._id];
        }
        const updatedProgram = { ...program, files: updatedProgramFiles };
        updateLocalAndParentProgram(updatedProgram);
        // Actualizamos el estado local para reflejar el nuevo/actualizado archivo
        setDocumentationFiles((prev) => {
          if (existingFile) {
            return prev.map((docu) =>
              docu._id === existingFile._id ? newOrUpdatedFile.file : docu
            );
          } else {
            return [...prev, newOrUpdatedFile.file];
          }
        });
        modal(
          existingFile ? "Documento actualizado" : "Documento subido",
          `El documento oficial "${doc.label}" se ha ${existingFile ? "actualizado" : "subido"} con éxito.`
        );
        setIsModalOpen(false);
      },
    });
    setIsModalOpen(true);
  };

  /**
   * Subir documento adicional (no oficial).
   */
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
        },
        { label: "Fecha (opcional)", name: "date", type: "date", required: false },
        { label: "Descripción (opcional)", name: "description", type: "text", required: false },
      ],
      onSubmit: async (formData) => {
        const { file, fileName, date, description } = formData;
        if (!file) {
          modal("Error", "Debe seleccionar un archivo (PDF).");
          return;
        }
        if (!fileName) {
          modal("Error", "Debe indicar un nombre para el documento.");
          return;
        }
        const payloadCreate = {
          file,
          originModel: "Program",
          idModel: program._id,
          fileName,
          fileLabel: fileName.trim(),
          date,
          notes: "",
          description: description || "Documento adicional",
        };
        const newDataCreate = await uploadFileDrive(payloadCreate);
        if (newDataCreate?.error) return;
        // Actualizamos program.files
        const updatedProgram = {
          ...program,
          files: [...(program.files || []), newDataCreate.file._id],
        };
        updateLocalAndParentProgram(updatedProgram);
        // Agregamos el nuevo archivo al estado local
        setDocumentationFiles((prev) => [...prev, newDataCreate.file]);
        modal("Documento subido", `El documento "${fileName}" se ha subido con éxito.`);
        setIsModalOpen(false);
      },
    });
    setIsModalOpen(true);
  };

  /**
   * Actualiza un documento complementario existente.
   */
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
          placeholder: "Ej: Informe Financiero, ...",
          required: false,
        },
        { label: "Fecha (opcional)", name: "date", type: "date", required: false },
        { label: "Descripción (opcional)", name: "description", type: "text", required: false },
      ],
      onSubmit: async (formData) => {
        const { file, fileName, date, description } = formData;
        const payloadUpdate = {
          fileId: fileObj._id,
          originModel: "Program",
          idModel: program._id,
          notes: fileObj.notes || "",
          description: description || fileObj.description || "Documento adicional",
        };
        if (file) payloadUpdate.file = file;
        if (fileName) {
          payloadUpdate.fileName = fileName;
          payloadUpdate.fileLabel = fileName.trim();
        }
        if (date) payloadUpdate.date = date;
        const updatedDoc = await updateFileInBackend(payloadUpdate);
        if (!updatedDoc) return;
        // Actualizamos el estado local
        setDocumentationFiles((prev) =>
          prev.map((docu) => (docu._id === fileObj._id ? updatedDoc : docu))
        );
        // Actualizamos la referencia en program.files
        const updatedProgramFiles = program.files.map((fid) =>
          fid === fileObj._id ? updatedDoc._id : fid
        );
        const updatedProgram = { ...program, files: updatedProgramFiles };
        updateLocalAndParentProgram(updatedProgram);
        modal(
          "Documento actualizado",
          `El documento "${fileName || fileObj.fileLabel || fileObj.description}" se ha actualizado con éxito.`
        );
        setIsModalOpen(false);
      },
    });
    setIsModalOpen(true);
  };

  if (program) {
    return (
      <div className={styles.contenedor}>
        <h2>DOCUMENTOS DEL PROGRAMA</h2>
        {officialDocs.length > 0 ? (
          officialDocs.map((doc) => {
            const fileFound = getOfficialFile(doc);
            return (
              <div key={doc._id} className={styles.fileRow}>
                {fileFound ? (
                  <>
                    <CiFileOn
                      color="green"
                      onClick={() => handleDownloadFile(fileFound)}
                      style={{ cursor: "pointer" }}
                    />
                    <FaTrash
                      onClick={() => handleDeleteFile(fileFound)}
                      style={{ cursor: "pointer", marginLeft: "0.5rem" }}
                    />
                  </>
                ) : (
                  <CiFileOff color="tomato" />
                )}
                <AiOutlineCloudUpload
                  onClick={() => handleFileUploadOfficial(doc)}
                  style={{ cursor: "pointer", marginLeft: "0.5rem" }}
                />
                <div className={styles.infoFile}>
                  <label>{doc.label}</label>
                  {fileFound?.date && (
                    <div className={styles.dateFile}>
                      <p>{`Válido hasta: ${formatDate(fileFound.date)}`}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <p>No existe documentación esencial configurada en este programa.</p>
        )}
        <h2>
          DOCUMENTACIÓN COMPLEMENTARIA
          <AiOutlineCloudUpload
            onClick={handleFileUploadExtra}
            style={{ cursor: "pointer", marginLeft: "0.5rem" }}
          />
        </h2>
        {extraFiles.length === 0 && <p>No hay archivos adicionales subidos.</p>}
        {extraFiles.map((fileObj) => (
          <div key={fileObj._id} className={styles.fileRow}>
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
            <div className={styles.infoFile}>
              <label>{fileObj.fileLabel || fileObj.description}</label>
              {fileObj.date && (
                <div className={styles.dateFile}>
                  <p>{`Válido hasta: ${formatDate(fileObj.date)}`}</p>
                </div>
              )}
            </div>
          </div>
        ))}
        {isModalOpen && formConfig && (
          <ModalForm
            title={formConfig.title}
            message={formConfig.message}
            fields={formConfig.fields}
            onSubmit={formConfig.onSubmit}
            onClose={() => setIsModalOpen(false)}
          />
        )}
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
  }
  return null;
};

export default DocumentProgramMiscelanea;
