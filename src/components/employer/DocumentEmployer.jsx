import { useState } from "react";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6"; 
import styles from '../styles/documentEmployer.module.css';
import { AiOutlineCloudDownload, AiOutlineCloudUpload  } from "react-icons/ai";
import { CiFileOn, CiFileOff  } from "react-icons/ci";
import React, { useRef } from 'react';
import { deepClone } from "../../lib/utils";
import { editUser, getFile } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

// documentos
const DocumentEmployer = ({ user,modal, charge, changeUser }) => {
// Estado local para los documentos cargados
    const [error, setErrores] = useState(''); // Estado local para los errores de validación

    const fileInputRefs = useRef({});
    // Campos de archivo
    const fileFields = [
        { label: 'Curriculum', name: 'cv' },
        { label: 'Certificado de delitos sexuales', name: 'sexualOffenseCertificate' },
        { label: 'Modelo 145', name: 'model145' },
        { label: 'Prevención de incendios', name: 'firePrevention' },
        { label: 'Contrato', name: 'contract' },
        { label: 'Vida Laboral', name: 'employmentHistory' },
        { label: 'Protección de datos', name: 'dataProtection' },
        { label: 'Canal Ético', name: 'ethicalChannel' },
        { label: 'DNI', name: 'dniCopy' }
    ];

    const downloadFile=async (name)=>{
        let auxErrores=''
        setErrores(auxErrores)
        charge(true)
        const token=getToken();
        const nameFile=`${user._id}-${name}`
        let response='';
        const link = document.createElement('a');
        try {
          response= await getFile(nameFile, token)  
          link.href = response.url;
          link.download = `${user.firstName}_${user.lastName}_${name}.pdf`
          // Simular clic para descargar el archivo
          link.click();
          URL.revokeObjectURL(response.url);
        } catch (error) {
            charge(false)
            modal('Error', 'No se ha podido encontrar el archivo, inténtelo más tarde')  
        }
          // Liberar la URL del objeto una vez completada la descarga
          charge(false)
    }


    const uploadFile=async (name,file)=>{
        charge(true)
        const token=getToken();
        const dataAux={
            _id:user._id
        }
        dataAux[name]=file
        const response= await editUser(dataAux, token)
        if(!response.error) {
         changeUser(response)
         modal('Documento subido', `El documento "${name}" se ha subido con éxito`)   
        } else {
            modal('Error', `El documento "${name}" no se ha podido subir`) 
        }
        
        charge(false)

    }
    // Maneja el cambio de archivos
    const handleChangeFile = (e) => {
        const { name, files } = e.target;
        let auxErrores=''
        const file = files[0]; // Asumiendo que solo se selecciona un archivo

        // Verifica que se haya seleccionado un archivo
        if (!file) {
            auxErrores=`${name}: No hay archivo`

            setErrores(auxErrores)
            return;
        }

        // Verificar que el archivo es un PDF
        if (file.type !== "application/pdf") {
            auxErrores=`${name}: Debe ser un pdf`

            setErrores(auxErrores)
            return;
        }

        // Verificar que el tamaño del archivo no exceda los 10MB (10 * 1024 * 1024 bytes)
        const maxFileSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxFileSize) {
            auxErrores= `${name}: No puede ser mayor a 10mb`;

            setErrores(auxErrores)
            return;
        }


        // Si el archivo es válido, realizar la llamada a la función upload
        uploadFile(name, file);
    };

    const handleIconClick = (name) => {
        if (fileInputRefs.current[name]) {
          fileInputRefs.current[name].click(); // Simula el clic en el input
        }
      };


    return (
        <div className={styles.contenedor}>
            <h2>DOCUMENTOS</h2>
            {fileFields.map(({ label, name }) => (
                <div key={name} >
                    {(user && user[name]) ? <CiFileOn color="GREEN" onClick={()=>downloadFile(name)}/> : <CiFileOff color="tomato" />}
                    <AiOutlineCloudUpload onClick={() => handleIconClick(name)}/>
                    
                    <input
                        type="file"
                        id={name}
                        name={name}
                        ref={(el) => fileInputRefs.current[name] = el} // Asigna la referencia
                        style={{ display: 'none' }} // Oculta el input
                        onChange={handleChangeFile}
                    />
                    <label htmlFor={name}>
                        {label} 
                    </label>
                    
                    
                </div>
            ))}
            <span className="errorSpan">{error}</span>
            
        </div>
    );
};

export default DocumentEmployer;