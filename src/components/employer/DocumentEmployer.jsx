import { useState } from "react";
import { AiOutlineCloudDownload, AiOutlineCloudUpload, AiOutlinePlus } from "react-icons/ai";
import { CiFileOn, CiFileOff } from "react-icons/ci";
import styles from '../styles/documentEmployer.module.css';
import React from 'react';
import { formatDate } from "../../lib/utils";
import { editUser, getFileUser } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import ModalForm from '../globals/ModalForm';
import { isNotFutureDate, isNotFutureDateString, isNotFutureDateStringMsg, validateDNIorNIE, validNumber } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";

// Componente principal para la gestión de documentos
const DocumentEmployer = ({ user, modal, charge, changeUser }) => {
  const [error, setErrores] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);

  // Documentos predefinidos
  const fileFields = [
    { label: 'Curriculum', name: 'cv', date: false },
    { label: 'Certificado de delitos sexuales', name: 'sexualOffenseCertificate', date: false },
    { label: 'Modelo 145', name: 'model145', date: false },
    { label: 'Prevención de incendios', name: 'firePrevention', date: true },
    { label: 'Contrato', name: 'contract', date: false },
    { label: 'Vida Laboral', name: 'employmentHistory', date: false },
    { label: 'Protección de datos', name: 'dataProtection', date: false },
    { label: 'Canal Ético', name: 'ethicalChannel', date: false },
    { label: 'DNI', name: 'dniCopy', date: false }
  ];

  // Descarga un archivo (buscando en user.files por fileTag)
  const downloadFile = async (name) => {
    setErrores('');
    charge(true);
    const token = getToken();
    // Se busca el archivo por fileTag
    const fileObj = user?.files?.find(file => file.fileTag === name);
    if (!fileObj) {
      modal('Error', 'Archivo no encontrado');
      charge(false);
      return;
    }
    // Se asume que el backend devuelve el id del archivo en fileName
    const idFile = fileObj.fileName;
    const idUser = user._id;
    const response = await getFileUser(idUser, idFile, token).catch(() => {
      charge(false);
      modal('Error', 'No se ha podido encontrar el archivo, inténtelo más tarde');
    });
    if (response) {
      const link = document.createElement('a');
      link.href = response.url;
      link.download = `${user.firstName}_${user.lastName}_${name}.pdf`;
      link.click();
      URL.revokeObjectURL(response.url);
    }
    charge(false);
  };

  // Sube un archivo al servidor asociado al usuario
  // Se utiliza tanto para documentos predefinidos como para extra
  const uploadFile = async (name, file, date) => {
    charge(true);
    const token = getToken();
    const dataAux = { _id: user._id };
    dataAux['files'] = [];
    // Se envía el archivo junto con el nombre (que servirá de identificador, fileTag)
    dataAux['files'].push(
      date
        ? { file, date, nameFile: name }
        : { file, nameFile: name }
    );

    try {
      const response = await editUser(dataAux, token);
      if (!response.error) {
        changeUser(response);
        modal('Documento subido', `El documento "${name}" se ha subido con éxito`);
      } else {
        modal('Error', `El documento "${name}" no se ha podido subir`);
      }
    } catch (error) {
      modal('Error', 'Hubo un problema al subir el documento.');
    }
    charge(false);
  };

  // Abre el modal para subir uno de los documentos predefinidos
  const handleFileUpload = (field) => {
    setFormConfig({
      title: `Subir ${field.label}`,
      message: 'Por favor, complete los siguientes campos:',
      fields: [
        { label: 'Archivo', name: 'file', type: 'file'},
        field.date && { label: 'Fecha', name: 'date', type: 'date' },
      ].filter(Boolean),
      onSubmit: (formData) => {
        const { file, date } = formData;
        if (file) {
          // Se utiliza el "name" predefinido
          uploadFile(field.name, file, date);
        } else {
          modal('Error', 'Debe seleccionar un archivo para continuar.');
        }
        setIsModalOpen(false);
      },
    });
    setIsModalOpen(true);
  };

  // Abre el modal para subir un documento extra (no predefinido)
  const handleExtraFileUpload = () => {
    setFormConfig({
      title: 'Subir documentación adicional',
      message: 'Complete los siguientes campos para añadir un documento extra:',
      fields: [
        { label: 'Nombre del documento', name: 'docName', type: 'text', required: true },
        { label: 'Archivo', name: 'file', type: 'file', required: true  },
        { label: 'Fecha (opcional)', 
            name: 'date', 
            type: 'date',  
            isValid: (x)=>{return 'x'},
        }
      ],
      onSubmit: (formData) => {
        const { docName, file, date } = formData;
        if (docName && file) {
          // Se utiliza el nombre ingresado por el usuario como identificador (fileTag)
          uploadFile(docName, file, date);
        } else {
          modal('Error', 'Debe completar los campos requeridos.');
        }
        setIsModalOpen(false);
      }
    });
    setIsModalOpen(true);
  };

  // Se extraen de user.files aquellos documentos que no estén en la lista predefinida
  const extraFiles = user?.files?.filter(file =>
    !fileFields.some(field => field.name === file.fileTag)
  ) || [];

  return (
    <div className={styles.contenedor}>
      <h2>DOCUMENTOS</h2>
      {/* Documentos predefinidos */}
      {fileFields.map(({ label, name, date }) => {
        const fileFound = user?.files?.find(file => file.fileTag === name);
        return (
          <div key={name} className={styles.fileItem}>
            {fileFound
              ? <CiFileOn color="green" onClick={() => downloadFile(name)} />
              : <CiFileOff color="tomato" />
            }
            <AiOutlineCloudUpload onClick={() => handleFileUpload({ label, name, date })} />
            <div className={styles.infoFile}>
              <label htmlFor={name}>{label}</label>
              {fileFound?.date && (
                <div className={styles.dateFile}>
                  <p>{`Válido hasta: ${formatDate(fileFound.date)}`}</p>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {/* Sección para documentos extra */}
      {extraFiles.length > 0 && (
        <div className={styles.extraFilesSection}>
          <h3>Documentación adicional</h3>
          <div>
           {extraFiles.map((file) => (
            <div key={file.fileTag} className={styles.fileItem}>
              <CiFileOn color="green" onClick={() => downloadFile(file.fileTag)} />
              <div className={styles.infoFile}>
                <label htmlFor={file.fileTag}>{file.fileTag}</label>
                {file.date && (
                  <div className={styles.dateFile}>
                    <p>{`Válido hasta: ${formatDate(file.date)}`}</p>
                  </div>
                )}
              </div>
            </div>
          ))} 
          </div>
          
        </div>
      )}

      {/* Botón para agregar un documento extra */}
      <button className={styles.extraUploadBtn} onClick={handleExtraFileUpload}>
        Subir Documentos
      </button>

      <span className="errorSpan">{error}</span>

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

export default DocumentEmployer;
