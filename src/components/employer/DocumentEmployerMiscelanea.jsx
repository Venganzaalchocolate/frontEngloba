import { useState } from "react";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";
import styles from '../styles/documentEmployer.module.css';
import { AiOutlineCloudDownload, AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn, CiFileOff } from "react-icons/ci";
import React, { useRef } from 'react';
import { deepClone, formatDate } from "../../lib/utils";
import { editUser, getFile, getFileUser } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import ModalForm from '../globals/ModalForm';

// Componente principal para la gestión de documentos
const DocumentEmployerMiscelanea = ({ user, modal, charge, changeUser }) => {
    const [error, setErrores] = useState(''); // Estado local para manejar errores
    const [isModalOpen, setIsModalOpen] = useState(false); // Controla la visibilidad del modal
    const [formConfig, setFormConfig] = useState(null); // Configuración dinámica para el formulario modal

    // Lista de documentos "oficiales" con su configuración
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

    // ==========
    // DESCARGA
    // ==========
    const downloadFile = async (name) => {
        setErrores('');
        charge(true); // Muestra un indicador de carga
        const token = getToken();

        try {
            // Busca el fileName real dentro de user.files según su fileTag
            const fileData = user.files.find((file) => file.fileTag === name);
            if (!fileData) {
                modal('Error', 'No se ha encontrado el archivo con ese nombre.');
                charge(false);
                return;
            }

            const idFile = fileData.fileName; // Nombre real del archivo en backend
            const idUser = user._id;
            const response = await getFileUser(idUser, idFile, token);

            const link = document.createElement('a');
            link.href = response.url;
            link.download = `${user.firstName}_${user.lastName}_${name}.pdf`; // Nombre de descarga
            link.click();
            URL.revokeObjectURL(response.url);
        } catch (err) {
            modal('Error', 'No se ha podido descargar el archivo. Intente más tarde.');
        }
        
        charge(false); // Oculta el indicador de carga
    };

    // ==========
    // SUBIDA
    // ==========
    const uploadFile = async (fileTag, file, date) => {
        charge(true); // Muestra un indicador de carga
        const token = getToken();
        const dataAux = { _id: user._id, files: [] };

        // Estructura que tu backend espera
        if (date) {
            dataAux.files.push({ file, date, nameFile: fileTag });
        } else {
            dataAux.files.push({ file, nameFile: fileTag });
        }

        try {
            const response = await editUser(dataAux, token);
            if (!response.error) {
                changeUser(response); // Actualiza el estado del usuario en el componente padre
                modal('Documento subido', `El documento "${fileTag}" se ha subido con éxito.`);
            } else {
                modal('Error', `El documento "${fileTag}" no se ha podido subir.`);
            }
        } catch (error) {
            modal('Error', 'Hubo un problema al subir el documento.');
        }
        charge(false); // Oculta el indicador de carga
    };

    // ==========
    // ABRE MODAL PARA SUBIR UN ARCHIVO "OFICIAL"
    // ==========
    const handleFileUpload = (field) => {
        setFormConfig({
            title: `Subir ${field.label}`, // Título del modal
            message: 'Por favor, complete los siguientes campos:',
            fields: [
                { label: 'Archivo', name: 'file', type: 'file', required: true },
                field.date && { label: 'Fecha', name: 'date', type: 'date', required: false },
            ].filter(Boolean),
            onSubmit: (formData) => {
                const { file, date } = formData;
                if (!file) {
                    modal('Error', 'Debe seleccionar un archivo para continuar.');
                    return;
                }
                uploadFile(field.name, file, date);
                setIsModalOpen(false);
            },
        });
        setIsModalOpen(true);
    };

    // ==========
    // ABRE MODAL PARA SUBIR UN ARCHIVO "NUEVO" (EXTRA)
    // ==========
    const handleNewFileUpload = () => {
        setFormConfig({
            title: 'Subir archivo nuevo',
            message: 'Complete los campos para subir un archivo que no figure en la lista oficial.',
            fields: [
                { label: 'Archivo PDF', name: 'file', type: 'file', required: true },
                {
                    label: 'Nombre',
                    name: 'fileTag',
                    type: 'text',
                    placeholder: 'Ej: diplomaCursoX, tituloUniversidad, etc.',
                    required: true
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
                    modal('Error', 'Debe especificar un nombre interno (fileTag).');
                    return;
                }
                // Llamamos a la misma función de subida con el nuevo fileTag
                uploadFile(fileTag, file, date);
                setIsModalOpen(false);
            },
        });
        setIsModalOpen(true);
    };

    // ==========
    // CALCULA ARCHIVOS EXTRA
    // ==========
    // Archivos en `user.files` cuyo `fileTag` NO coincide con ninguno de fileFields[].name
    const extraFiles = (user?.files || []).filter(
        (fileObj) => !fileFields.some((field) => field.name === fileObj.fileTag)
    );

    return (
        <div className={styles.contenedor}>
            <h2>DOCUMENTOS</h2>

            {/* Mapeo de los campos de archivo "oficiales" */}
            {fileFields.map(({ label, name, date }) => {
                // Encontrar si el archivo existe en user.files
                const fileFound = user?.files?.find((f) => f.fileTag === name);

                return (
                    <div key={name}>
                        {/* Icono de estado del archivo: CiFileOn si existe, CiFileOff si no */}
                        {fileFound
                            ? <CiFileOn color="GREEN" onClick={() => downloadFile(name)} />
                            : <CiFileOff color="tomato" />
                        }

                        {/* Botón para subir archivo (oficial) */}
                        <AiOutlineCloudUpload onClick={() => handleFileUpload({ label, name, date })} />

                        <div className={styles.infoFile}>
                            <label htmlFor={name}>{label}</label>

                            {/* Mostrar fecha si existe para ese archivo */}
                            {fileFound?.date && (
                                <div className={styles.dateFile}>
                                    <p>{`Válido hasta: ${formatDate(fileFound.date)}`}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}

            {/* Sección de archivos "extra" */}
            <h2>DOCUMENTACIÓN COMPLEMENTARIA <AiOutlineCloudUpload onClick={handleNewFileUpload} /></h2>
            {extraFiles.length === 0 && (
                <p>No hay archivos adicionales subidos.</p>
            )}
            {extraFiles.map((fileObj, index) => (
                <div key={`extra-${index}`}>
                    <CiFileOn color="GREEN" onClick={() => downloadFile(fileObj.fileTag)} />
                    
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

            {/* Botón para subir un archivo NUEVO (extra) */}

            <span className="errorSpan">{error}</span>

            {/* Modal dinámico para formularios */}
            {isModalOpen && formConfig && (
                <ModalForm
                    title={formConfig.title}    // Título dinámico
                    message={formConfig.message} 
                    fields={formConfig.fields}
                    onSubmit={formConfig.onSubmit}
                    onClose={() => setIsModalOpen(false)}
                />
            )}
        </div>
    );
};

export default DocumentEmployerMiscelanea;
