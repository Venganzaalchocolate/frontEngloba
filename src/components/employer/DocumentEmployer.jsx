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
const DocumentEmployer = ({ user, modal, charge, changeUser }) => {
    const [error, setErrores] = useState(''); // Estado local para manejar errores
    const [isModalOpen, setIsModalOpen] = useState(false); // Controla la visibilidad del modal
    const [formConfig, setFormConfig] = useState(null); // Configuración dinámica para el formulario modal

    // Lista de documentos con su configuración básica
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

    // Descarga un archivo específico asociado al usuario
    const downloadFile = async (name) => {
        setErrores('');
        charge(true); // Muestra un indicador de carga
        const token = getToken();
        const idFile = user.files.filter((file) => file.fileTag == name)[0].fileName;
        const idUser = user._id
        const response = await getFileUser(idUser, idFile, token).catch(() => {
            charge(false);
            modal('Error', 'No se ha podido encontrar el archivo, inténtelo más tarde');
        })
        const link = document.createElement('a');
        link.href = response.url;
        link.download = `${user.firstName}_${user.lastName}_${name}.pdf`;
        link.click();
        URL.revokeObjectURL(response.url);
        charge(false); // Oculta el indicador de carga
    };

    // Sube un archivo al servidor asociado al usuario
    const uploadFile = async (name, file, date) => {
        charge(true); // Muestra un indicador de carga
        const token = getToken();
        const dataAux = { _id: user._id };
        dataAux['files'] = []
        dataAux['files'].push((date) ? { file, date, nameFile: name } : { file, nameFile: name })

        try {
            const response = await editUser(dataAux, token);
            if (!response.error) {
                changeUser(response); // Actualiza el estado del usuario en el componente padre
                modal('Documento subido', `El documento "${name}" se ha subido con éxito`);
            } else {
                modal('Error', `El documento "${name}" no se ha podido subir`);
            }
        } catch (error) {
            modal('Error', 'Hubo un problema al subir el documento.');
        }
        charge(false); // Oculta el indicador de carga
    };

    // Abre el modal para subir un archivo y configura los campos del formulario
    const handleFileUpload = (field) => {
        const selectOptions = fileFields.map(({ name, label }) => ({
            value: name,
            label: label,
        }));

        setFormConfig({
            title: `Subir ${field.label}`, // Título dinámico para el modal
            message: 'Por favor, complete los siguientes campos:', // Mensaje de ayuda
            fields: [
                { label: 'Archivo', name: 'file', type: 'file' }, // Campo para seleccionar el archivo
                field.date && { label: 'Fecha', name: 'date', type: 'date' }, // Campo opcional para la fecha
            ].filter(Boolean),
            onSubmit: (formData) => { // Lógica para manejar el envío del formulario
                const { file, date } = formData;

                // Llama a la función de subida solo si el archivo está seleccionado
                if (file) {
                    uploadFile(field.name, file, date);
                } else {
                    modal('Error', 'Debe seleccionar un archivo para continuar.');
                }

                setIsModalOpen(false); // Cierra el modal
            },
        });

        setIsModalOpen(true); // Abre el modal
    };


    return (
        <div className={styles.contenedor}>
            <h2>DOCUMENTOS</h2>
            {/* Mapeo de los campos de archivo para mostrar botones de descarga y subida */}
            {fileFields.map(({ label, name, date }) => {
                // Encontrar el archivo en user.files
                const fileFound = user?.files?.find(file => file.fileTag === name);

                return (
                    <div key={name}>
                        {/* Icono de estado del archivo: CiFileOn si existe, CiFileOff si no */}
                        {fileFound
                            ? <CiFileOn color="GREEN" onClick={() => downloadFile(name)} />
                            : <CiFileOff color="tomato" />
                        }

                        {/* Botón para subir archivo */}
                        <AiOutlineCloudUpload onClick={() => handleFileUpload({ label, name, date })} />

                        <div className={styles.infoFile}>
                            <label htmlFor={name}>{label}</label>

                            {/* Mostrar fecha si existe */}
                            {fileFound?.date && (
                                <div className={styles.dateFile}>
                                    <p>{`Valido hasta: ${formatDate(fileFound.date)}`}</p>
                                </div>
                            )}
                        </div>
                    </div>
                );
            })}
            <span className="errorSpan">{error}</span>

            {/* Modal dinámico para formularios */}
            {isModalOpen && formConfig && (
                <ModalForm
                    title={formConfig.title} // Título dinámico del formulario
                    message={formConfig.message} // Mensaje de ayuda
                    fields={formConfig.fields} // Campos configurados dinámicamente
                    onSubmit={formConfig.onSubmit} // Lógica para manejar el envío del formulario
                    onClose={() => setIsModalOpen(false)} // Cierra el modal
                />
            )}
        </div>
    );
};

export default DocumentEmployer;

