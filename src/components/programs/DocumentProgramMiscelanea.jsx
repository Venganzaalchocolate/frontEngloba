import React, { useEffect, useState } from "react";
import { FaTrash } from "react-icons/fa6";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn, CiFileOff } from "react-icons/ci";

import styles from "../styles/documentProgram.module.css";

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

/**
 * Componente que maneja la documentación (oficial y complementaria) de un programa
 * SIN hacer peticiones extra para listar los archivos.
 *
 * @param {Object}   program - Objeto del programa con `files` ya populados (array de objetos).
 * @param {Function} modal - Para mostrar mensajes de éxito/error.
 * @param {Function} charge - Para activar/desactivar spinner global.
 * @param {Function} handleProgramSaved - Notifica al padre cuando tenemos el nuevo programa desde el server.
 * @param {Object}   enumsData - Datos enumerados (si necesitas documentos oficiales).
 */
const DocumentProgramMiscelanea = ({
  program,
  modal,
  charge,
  handleProgramSaved,
  enumsData,
}) => {
  // Estado local con la lista de archivos (para render inmediato)
  const [documentationFiles, setDocumentationFiles] = useState(program.files || []);

  // Modales para crear/editar/borrar archivos
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });

  /**
   * Cada vez que el padre actualiza `program.files`, sincronizamos la lista local
   */
  useEffect(() => {
    setDocumentationFiles(program.files || []);
  }, [program.files]);

  // ========================================
  //   BLOQUE: DOCUMENTOS OFICIALES (opcional)
  // ========================================
  const officialDocs = (program.essentialDocumentationProgram || [])
    .map((docId) =>
      enumsData?.documentation?.find((doc) => doc._id.toString() === docId.toString())
    )
    .filter(Boolean);

  const getOfficialFile = (docOfficial) => {
    return documentationFiles.find(
      (f) => f.originDocumentation?.toString() === docOfficial._id.toString()
    );
  };

  // Archivos adicionales
  const extraFiles = documentationFiles.filter((fileObj) => {
    if (!fileObj.originDocumentation) return true;
    const isOfficial = officialDocs.some(
      (doc) => doc._id.toString() === fileObj.originDocumentation?.toString()
    );
    return !isOfficial;
  });

  // ========================================
  //   DESCARGA
  // ========================================
  const handleDownloadFile = async (fileObj) => {
    if (!fileObj.idDrive) {
      modal("Error", "No se detecta idDrive para este archivo.");
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

  // ========================================
  //   ELIMINACIÓN
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
      // El backend devolverá el "program" ya actualizado
      const updatedProgram = await deleteFileDrive({ fileId: fileObj._id }, token);

      if (!updatedProgram || updatedProgram.error) {
        modal("Error", updatedProgram?.message || "No se pudo eliminar el archivo.");
        return;
      }

      // Avisamos al padre que tenemos un nuevo programa
      handleProgramSaved(updatedProgram);

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

  // ========================================
  //   SUBIR / ACTUALIZAR ARCHIVOS
  // ========================================
  // 1) Documentos oficiales
  const handleFileUploadOfficial = (doc) => {
    const existingFile = getOfficialFile(doc);

    setFormConfig({
      title: `Subir documento oficial: ${doc.label}`,
      message: "Seleccione el archivo y la fecha (obligatoria):",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        { label: "Fecha", name: "date", type: "date", required: true },
      ],
      onSubmit: async ({ file, date }) => {
        if (!file || !date) {
          modal("Error", "Archivo y fecha son obligatorios para documentos oficiales.");
          return;
        }
        try {
          charge(true);
          const token = getToken();

          if (existingFile) {
            // UPDATE
            const payloadUpdate = {
              fileId: existingFile._id,
              file,
              originModel: "Program",
              idModel: program._id,
              originDocumentation: doc._id,
              date,
              // Rellenar si quieres
              notes: existingFile.notes || "",
              description: existingFile.description || `Documento oficial: ${doc.label}`,
            };
            const updatedProgram = await updateFileDrive(payloadUpdate, token);
            if (!updatedProgram || updatedProgram.error) {
              modal("Error", updatedProgram?.message || "No se pudo actualizar el archivo.");
              return;
            }
            handleProgramSaved(updatedProgram);
            modal("Documento actualizado", `Se actualizó "${doc.label}" con éxito.`);

          } else {
            // CREATE
            const payloadCreate = {
              file,
              originModel: "Program",
              idModel: program._id,
              originDocumentation: doc._id,
              date,
              notes: "",
              description: `Documento oficial: ${doc.label}`,
            };
            const updatedProgram = await createFileDrive(payloadCreate, token);
            if (!updatedProgram || updatedProgram.error) {
              modal("Error", updatedProgram?.message || "No se pudo subir el archivo.");
              return;
            }
            handleProgramSaved(updatedProgram);
            modal("Documento subido", `Se subió "${doc.label}" con éxito.`);
          }
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });

    setIsModalOpen(true);
  };

  // 2) Subir documento adicional
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
            originModel: "Program",
            idModel: program._id,
            fileName,
            fileLabel: fileName.trim(),
            date,
            notes: "",
            description: description || "Documento adicional",
          };
          const updatedProgram = await createFileDrive(payloadCreate, token);
          if (!updatedProgram || updatedProgram.error) {
            modal("Error", updatedProgram?.message || "No se pudo subir el archivo.");
            return;
          }
          handleProgramSaved(updatedProgram);
          modal("Documento subido", `El documento "${fileName}" se subió con éxito.`);
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  // 3) Actualizar un documento complementario
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

          const updatedProgram = await updateFileDrive(payloadUpdate, token);
          if (!updatedProgram || updatedProgram.error) {
            modal("Error", updatedProgram?.message || "No se pudo actualizar el archivo.");
            return;
          }
          handleProgramSaved(updatedProgram);
          modal(
            "Documento actualizado",
            `El documento "${fileName || fileObj.fileLabel || fileObj.description}" se ha actualizado con éxito.`
          );
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  // ================================
  // RENDER
  // ================================
  // Si no hay program cargado, no renderizamos nada.
  if (!program) return null;

  return (
    <div className={styles.contenedor}>
      <h2>DOCUMENTOS DEL PROGRAMA</h2>
      {/* Documentos oficiales */}
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
            <label>{fileObj.fileLabel || fileObj.description || "Documento"}</label>
            {fileObj.date && (
              <div className={styles.dateFile}>
                <p>{`Válido hasta: ${formatDate(fileObj.date)}`}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Modal genérico para subir/editar archivos */}
      {isModalOpen && formConfig && (
        <ModalForm
          title={formConfig.title}
          message={formConfig.message}
          fields={formConfig.fields}
          onSubmit={formConfig.onSubmit}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Modal para confirmar borrado */}
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

export default DocumentProgramMiscelanea;
