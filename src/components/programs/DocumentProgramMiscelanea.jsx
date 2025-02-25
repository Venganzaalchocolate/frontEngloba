import { useState } from "react";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";
import styles from '../styles/documentProgram.module.css';
import { AiOutlineCloudDownload, AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn, CiFileOff } from "react-icons/ci";
import React from 'react';
import { formatDate } from "../../lib/utils";
import { getToken } from "../../lib/serviceToken";
import ModalForm from '../globals/ModalForm';

const DocumentProgramMiscelanea = ({ program, modal, charge, changeProgram, enumsData }) => {
  const [error, setError] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);

  // Se obtienen los documentos oficiales cruzando el id con los enums
  const officialDocs = (program.essentialDocumentationProgram || [])
    .map(docId => {
      const enumDoc = enumsData.documentation.find(doc => doc._id === docId);
      return enumDoc;
    })
    .filter(Boolean);

  // Los archivos extra son aquellos que NO pertenecen a los documentos oficiales (según el fileTag)
  const extraFiles = (program?.files || []).filter(
    (fileObj) => !officialDocs.some((doc) => doc.name === fileObj.fileTag)
  );

  /**
   * DESCARGA
   * --------
   * Descarga un archivo buscando en program.files por fileTag
   */
  const downloadFile = async (fileTag) => {
    setError('');
    charge(true);
    const token = getToken();

    try {
      // Buscar el archivo dentro de program.files
      const fileData = program.files?.find(file => file.fileTag === fileTag);
      if (!fileData) {
        modal('Error', 'No se ha encontrado un archivo con ese identificador.');
        charge(false);
        return;
      }
      const fileId = fileData.fileName;
      const programId = program._id;
      // const response = await getFileProgram(programId, fileId, token);
      const response = ''; // Simulación de respuesta
      if (!response?.url) {
        modal('Error', 'No se ha podido descargar el archivo. Intente más tarde.');
        charge(false);
        return;
      }
      const link = document.createElement('a');
      link.href = response.url;
      link.download = `${program.name}_${fileTag}.pdf`;
      link.click();
      URL.revokeObjectURL(response.url);
    } catch (err) {
      modal('Error', 'No se ha podido descargar el archivo. Intente más tarde.');
    }
    charge(false);
  };

  /**
   * SUBIDA
   * ------
   * Sube un archivo al servidor asociado al programa
   */
  const uploadFile = async (fileTag, file, date) => {
    charge(true);
    const token = getToken();
    const dataAux = { _id: program._id, files: [] };
    if (date) {
      dataAux.files.push({ file, date, nameFile: fileTag });
    } else {
      dataAux.files.push({ file, nameFile: fileTag });
    }
    try {
      // const response = await editProgram(dataAux, token);
      const response = ''; // Simulación de respuesta
      if (!response.error) {
        changeProgram(response);
        modal('Documento subido', `El documento "${fileTag}" se ha subido con éxito.`);
      } else {
        modal('Error', `El documento "${fileTag}" no se ha podido subir.`);
      }
    } catch (error) {
      modal('Error', 'Hubo un problema al subir el documento.');
    }
    charge(false);
  };

  /**
   * ABRE MODAL PARA SUBIR UN ARCHIVO "OFICIAL"
   */
  const handleFileUpload = (doc) => {
    setFormConfig({
      title: `Subir ${doc.label}`,
      message: 'Por favor, seleccione el archivo y la fecha si procede:',
      fields: [
        { label: 'Archivo (PDF)', name: 'file', type: 'file', required: true },
        doc.date && {
          label: 'Fecha de validez (opcional)',
          name: 'date',
          type: 'date',
          required: false
        }
      ].filter(Boolean),
      onSubmit: (formData) => {
        const { file, date } = formData;
        if (!file) {
          modal('Error', 'Debe seleccionar un archivo para continuar.');
          return;
        }
        uploadFile(doc.name, file, date);
        setIsModalOpen(false);
      },
    });
    setIsModalOpen(true);
  };

  /**
   * ABRE MODAL PARA SUBIR UN ARCHIVO NUEVO (EXTRA)
   */
  const handleNewFileUpload = () => {
    setFormConfig({
      title: 'Subir documento adicional',
      message: 'Complete los campos para subir un documento no listado oficialmente.',
      fields: [
        { label: 'Archivo (PDF)', name: 'file', type: 'file', required: true },
        {
          label: 'Identificador (fileTag)',
          name: 'fileTag',
          type: 'text',
          placeholder: 'Ej: informeFinanciero, clausulasLegales, etc.',
          required: true,
        },
        {
          label: 'Fecha (opcional)',
          name: 'date',
          type: 'date',
          required: false
        }
      ],
      onSubmit: (formData) => {
        const { file, fileTag, date } = formData;
        if (!file) {
          modal('Error', 'Debe seleccionar un archivo para continuar.');
          return;
        }
        if (!fileTag) {
          modal('Error', 'Debe indicar un identificador para el documento.');
          return;
        }
        uploadFile(fileTag, file, date);
        setIsModalOpen(false);
      },
    });
    setIsModalOpen(true);
  };

  return (
    <div className={styles.contenedor}>
      <h2>DOCUMENTOS DEL PROGRAMA</h2>

      {/* Documentos oficiales */}
      {officialDocs.length > 0 ? (
        officialDocs.map((doc) => {
          const fileFound = program.files?.find(f => f.fileTag === doc.name);
          return (
            <div key={doc._id} className={styles.fileRow}>
              {fileFound
                ? <CiFileOn color="green" onClick={() => downloadFile(doc.name)} />
                : <CiFileOff color="tomato" />}
              <AiOutlineCloudUpload onClick={() => handleFileUpload(doc)} />
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
        <p>No existe documentación esencial para el programa</p>
      )}

      {/* Documentos adicionales */}
      <h2>DOCUMENTACIÓN COMPLEMENTARIA</h2>
      <AiOutlineCloudUpload onClick={handleNewFileUpload} style={{ cursor: "pointer" }} />
      {extraFiles.length === 0 && <p>No hay archivos adicionales subidos.</p>}
      {extraFiles.map((fileObj, index) => (
        <div key={index} className={styles.fileRow}>
          <CiFileOn color="green" onClick={() => downloadFile(fileObj.fileTag)} />
          <div className={styles.infoFile}>
            <label>{fileObj.fileTag}</label>
            {fileObj.date && (
              <div className={styles.dateFile}>
                <p>{`Válido hasta: ${formatDate(fileObj.date)}`}</p>
              </div>
            )}
          </div>
        </div>
      ))}

      {/* Muestra errores si existen */}
      {error && <span className={styles.errorSpan}>{error}</span>}

      {/* Modal dinámico */}
      {isModalOpen && formConfig && (
        <ModalForm
          title={formConfig.title}
          message={formConfig.message}
          fields={formConfig.fields}
          onSubmit={formConfig.onSubmit}
          onClose={() => setIsModalOpen(false)}
        />
      )}
    </div>
  );
};

export default DocumentProgramMiscelanea;
