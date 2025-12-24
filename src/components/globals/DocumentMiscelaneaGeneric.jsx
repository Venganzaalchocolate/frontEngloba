import React, { useCallback, useEffect, useRef, useState } from "react";
import { getToken } from "../../lib/serviceToken";
import {
  getFileDrive,
  createFileDrive,
  updateFileDrive,
  deleteFileDrive,
  createChangeRequest,
  downloadZipFiles,
  listFile
} from "../../lib/data";

import ModalForm from "./ModalForm";
import ModalConfirmation from "./ModalConfirmation";

import { validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { compact, formatDate, sanitize } from "../../lib/utils";

import { FaRegClock, FaTrash } from "react-icons/fa6";
import { AiOutlineCloudUpload } from "react-icons/ai";
import { CiFileOn } from "react-icons/ci";

import styles from "../styles/documentMiscelanea.module.css";

import { BsCheckCircleFill } from "react-icons/bs";
import { MdWarningAmber } from "react-icons/md";
/**
 * @param {Object} props
 * @param {Object} props.data - El objeto user, program o device
 * @param {String} props.modelName - "User", "Program" o "Device"
 * @param {String} [props.parentId] - En caso de modelo "Device", se debe pasar el _id del programa padre.
 * @param {Array} props.officialDocs - Lista de documentos oficiales (con { _id, name, date?:bool, categoryFiles?:string })
 * @param {Function} props.modal - Para mostrar mensajes
 * @param {Function} props.charge - Para mostrar/ocultar loader
 * @param {Function} props.onChange - Callback para actualizar el padre cuando se sube/edita/borra
 * @param {Boolean} [props.authorized] - true = supervisor/HR (sube directo). false = empleado (solicita).
 * @param {Function} [props.onRequestCreated] - Notifica CR optimista/real al padre (para MyChangeRequests)
 */
const DocumentMiscelaneaGeneric = ({
  data,
  modelName,
  officialDocs,
  modal,
  charge,
  authorized = false,
  onRequestCreated = () => { },
}) => {
  // 1) Archivos normalizados del modelo
  const [normalizedFiles, setNormalizedFiles] = useState([]);

  useEffect(() => {
    if (!data?._id || !modelName) {
      setNormalizedFiles([]);
      return;
    }

    let isMounted = true;

    const fetchFiles = async () => {

        charge?.(true);
        const token = getToken();
        const res = await listFile(
          { originModel: modelName, idModel: data._id },
          token
        );

        

        if(res.error){
        charge?.(false);
        modal?.("Error", "No se pudieron cargar los documentos.");
        if (isMounted) setNormalizedFiles([]);  
        } else{
          const items = res?.items || res || [];
          if (!isMounted) return;
          setNormalizedFiles(transformFiles(items));
          charge?.(false);
        } 
    };

    fetchFiles();
    return () => {
      isMounted = false;
    };
  }, [data?._id, modelName]);

  // 2) Modales
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formConfig, setFormConfig] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ open: false, file: null });

  const [isGeneratingZip, setIsGeneratingZip] = useState(false);
  const abortZipRef = useRef(null);

  const handleDownloadAllZip = async () => {
    startZipDownload();
  };

  const cancelZipGeneration = () => {
    if (abortZipRef.current) {
      abortZipRef.current.abort();
    }
    setIsGeneratingZip(false);
  };

    // Extrae la lista de Filedrive desde el "padre" devuelto por el back
  const syncFromParent = useCallback(
    (parent) => {
      if (!parent) {
        setNormalizedFiles([]);
        return;
      }

      let filesDocs = [];

      if (modelName === "User") {
        // User: files = [{ filesId: <Filedrive> }]
        filesDocs = (parent.files || [])
          .map((f) => f.filesId)
          .filter(Boolean);
      } else {
        // Program / Dispositive: files = [<Filedrive>]
        filesDocs = parent.files || [];
      }

      setNormalizedFiles(transformFiles(filesDocs));
    },
    [modelName]
  );


  // 3) Agrupar oficiales con sus archivos
  const officialDocumentsToShow = (officialDocs || []).map((doc) => {
    const filesForDoc = normalizedFiles.filter(
      (f) => f.originDocumentation?.toString() === doc._id.toString()
    );
    return { doc, files: filesForDoc };
  });

  // 4) Por categoría
  const officialByCategory = officialDocumentsToShow.reduce((acc, { doc, files }) => {
    const cat = doc.categoryFiles || "Sin categoría";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push({ doc, files });
    return acc;
  }, {});

  // 5) Miscelánea (sin originDocumentation)
  const extraFiles = normalizedFiles.filter((f) => !f.originDocumentation);

  // ========= Helpers Optimismo =========
  const emitOptimisticCR = ({
    file,
    fileName,
    date,
    description,
    note,
    originDocumentation,
    category,
    type = "user-extra-doc",
  }) => {
    const clientId = `tmp-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const label = (fileName || file?.name || "Documento").trim();
    const desc = (description || label).trim();



    const optimisticCR = {
      _id: clientId,
      userId: data._id,
      status: "pending",
      submittedAt: new Date().toISOString(),
      note: note || "",
      changes: [],
      uploads: [
        {
          _id: `u-${clientId}`,
          type,
          originDocumentation: originDocumentation || undefined,
          category: category || (originDocumentation ? "Oficial" : "Varios"),
          date: date || null,
          description: desc,
          originalName: file?.name || label,
          labelFile: label,
        },
      ],
    };
    if (typeof onRequestCreated === "function") onRequestCreated(optimisticCR);
    return clientId;
  };

  // ==================================================
  // ============== DESCARGA DE ARCHIVO ===============
  // ==================================================
  const handleDownloadFile = async (docOrFalse, fileObj, model=false) => {
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
      const link = document.createElement("a");
      link.href = response.url;
      // Nombre: <DocLabel>-<Nombre_Apellidos>.pdf
      let finalName = ''
      if(!model){
      const nameFileAux = !docOrFalse ? compact(fileObj.fileLabel) : compact(docOrFalse.name);
      const nameUserAux = compact(data.firstName);
      const lastUserAux = compact(data.lastName);
      finalName = `${nameFileAux}-${nameUserAux}_${lastUserAux}`;
      } else if(model){
        finalName=`modelo_${docOrFalse}`
      }
      

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
  const handleDeleteFile = (fileObj) => setDeleteModal({ open: true, file: fileObj });

  const confirmDeleteFile = async () => {
    const fileObj = deleteModal.file;
    if (!fileObj) return;
    try {
      charge(true);
      const token = getToken();
      const payload = {
        fileId: fileObj._id,
        originModel: modelName,
        idModel: data._id,
      };
      const updatedData = await deleteFileDrive(payload, token);
      if (!updatedData || updatedData.error) {
        modal("Error", updatedData?.message || "No se pudo eliminar el archivo.");
        return;
      }
      //en vez de hacer el onChange quieor una funcion que setNormalizedFiles(transformFiles(updatedData.files o updateData.files.filesId si es user etc));
      syncFromParent(updatedData);
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
  // ==== SUBIR OFICIAL (RESPONSABLE) DIRECTO =========
  // ==================================================
  const handleUploadOfficialFromSelect = (presetDocId = "") => {
    const selectedDoc = (officialDocs || []).find(
      (d) => d._id.toString() === presetDocId.toString()
    );
    const todayStr = new Date().toISOString().split("T")[0];

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
          disabled: !!presetDocId,
          defaultValue: presetDocId,
          options: [
            { value: "", label: "Seleccione una opción" },
            ...(officialDocs || []).map((d) => ({ value: d._id, label: d.name })),
          ],
        },
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          label: "Fecha de expedición",
          required: selectedDoc?.date === true || false,
          name: "date",
          type: "date",
          defaultValue: todayStr,
        },
      ],
      onSubmit: async ({ docId, file, date }) => {
        try {
          charge(true);
          const chosen = (officialDocs || []).find(
            (d) => d._id.toString() === docId.toString()
          );
          if (!chosen) {
            modal("Error", "No se encontró el tipo de documento seleccionado.");
            return;
          }
          if (chosen.date === true && !date) {
            modal("Error", `El documento "${chosen.name}" requiere fecha obligatoria.`);
            return;
          }

          const token = getToken();
          const payload = {
            file,
            originModel: modelName,
            idModel: data._id,
            originDocumentation: docId, // ← OFICIAL
            date,
            description: chosen.name,
            category: chosen.categoryFiles || "Oficial",
          };

          const updatedData = await createFileDrive(payload, token);
          if (!updatedData || updatedData.error) {
            modal("Error", updatedData?.message || "No se pudo subir el archivo.");
            return;
          }

          syncFromParent(updatedData);
          modal("Documento oficial", "Documento subido con éxito.");
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
  // ==== SOLICITAR OFICIAL (EMPLEADO) por doc ========
  //   ⚠️ SIN label ni descripción (los pone el back en adopción)
  //   Mandamos originDocumentation para que al aprobar
  //   se cree Filedrive con ese vínculo (y salga en “Curriculum” etc.)
  // ==================================================
  const handleRequestOfficialUpload = (doc) => {
    const todayStr = new Date().toISOString().split("T")[0];

    setFormConfig({
      title: `Solicitar subida: ${doc.name}`,
      message:
        "Adjunta el PDF. Si el documento requiere fecha, introdúcela. Tu responsable revisará la petición.",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          label: "Fecha de expedición",
          name: "date",
          type: "date",
          required: !!doc.date, // obligatorio si el doc lo requiere
          defaultValue: todayStr,
        },
        { label: "Nota para el responsable (opcional)", name: "note", type: "textarea" },
      ],
      onSubmit: async ({ file, date, note }) => {
        if (!file) {
          modal("Error", "Debes adjuntar un PDF.");
          return;
        }

        const token = getToken();
        const noteText = `Solicitud de documentación oficial: ${doc.name}`;

        // Optimista (sin label/descr en meta; se mostrará con doc.name)
        const clientId = emitOptimisticCR({
          file,
          fileName: doc.name, // solo para pintar optimista
          date: date || null,
          description: doc.name, // solo optimista
          note: note || noteText,
          originDocumentation: doc._id,
          category: doc.categoryFiles || "Oficial",
          type: "user-official-doc",
        });

        try {
          charge(true);

          // Real: IMPORTANTE -> enviar originDocumentation en meta
          // y NO enviar labelFile/description para oficiales.
          const resp = await createChangeRequest(
            {
              userId: data._id,
              note: note || noteText,
              changes: [],
              uploads: [
                {
                  file, // el fichero real
                  originDocumentation: doc._id,         // ← clave para que quede en “Curriculum”
                  category: doc.categoryFiles || "Oficial",
                  date: date || null,
                  type: "user-official-doc",
                },
              ],
            },
            token
          );

          const created = resp?.data && resp?.data?._id ? resp.data : resp;
          if (!created || created.error) {
            throw new Error(created?.message || "No se pudo crear la solicitud");
          }

          // Reemplazar optimista por la CR real
          if (typeof onRequestCreated === "function") {
            onRequestCreated({ ...created, __replaceClientId: clientId });
          }
          modal("Solicitud enviada", "Tu petición de documento oficial está pendiente.");
        } catch (e) {
          // Retirar optimista si falla
          if (typeof onRequestCreated === "function") {
            onRequestCreated({ __deleteOptimistic: clientId });
          }
          modal("Error", e?.message || "No se pudo crear la solicitud");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });

    setIsModalOpen(true);
  };

  // ==================================================
  // ==== SUBIR MISCELÁNEO (RESPONSABLE) DIRECTO ======
  // ==================================================
  const handleFileUploadExtra = () => {
    const todayStr = new Date().toISOString().split("T")[0];
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
        { label: "Fecha (opcional)", name: "date", type: "date", defaultValue: todayStr },
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
          if (!authorized) {
            modal("Permisos insuficientes", "Esta acción requiere permisos de edición.");
            return;
          }

          charge(true);
          const token = getToken();
          const payload = {
            file,
            originModel: modelName,
            idModel: data._id,
            fileName: fileName.trim(),
            fileLabel: fileName.trim(),
            date,
            description: (description || fileName).trim(),
          };
          const updatedData = await createFileDrive(payload, token);
          if (!updatedData || updatedData.error) {
            modal("Error", updatedData?.message || "No se pudo subir el archivo.");
            return;
          }
          syncFromParent(updatedData);
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
  // ====== ACTUALIZAR MISCELÁNEO =====================
  //   * Empleado => CR con optimismo
  //   * Supervisor => updateFileDrive directo
  // ==================================================
  const handleUpdateFileExtra = (fileObj) => {
    setFormConfig({
      title: `Actualizar documento: ${fileObj.fileLabel || fileObj.description || "Documento"}`,
      message: "Seleccione un archivo nuevo (opcional) y modifique lo que desee:",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: false },
        { label: "Nombre del documento", name: "fileName", type: "text", required: false },
        { label: "Fecha (opcional)", name: "date", type: "date", required: false },
        { label: "Descripción (opcional)", name: "description", type: "text", required: false },
      ],
      onSubmit: async ({ file, fileName, date, description }) => {
        // Empleado: petición con CR
        if (!authorized) {
          if (!file) {
            modal("Error", "Debes adjuntar un PDF.");
            return;
          }
          const token = getToken();
          const descFinal = (description || fileName || file.name || "Documento").trim();
          const noteText = `Solicitud de actualización de documentación complementaria${fileName ? `: ${fileName}` : ""}`;

          const clientId = emitOptimisticCR({
            file,
            fileName: fileName || file.name,
            date: date || null,
            description: descFinal,
            note: noteText,
            category: "Varios",
            type: "user-extra-doc",
          });

          try {
            charge(true);
            const resp = await createChangeRequest(
              {
                userId: data._id,
                note: noteText,
                changes: [],
                uploads: [
                  {
                    file,
                    category: "Varios",
                    date: date || null,
                    description: descFinal,
                    labelFile: (fileName || file.name || "Documento").trim(),
                    type: "user-extra-doc",
                  },
                ],
              },
              token
            );

            const created = resp?.data && resp?.data?._id ? resp.data : resp;
            if (!created || created.error) {
              throw new Error(created?.message || "No se pudo crear la solicitud");
            }

            if (typeof onRequestCreated === "function") {
              onRequestCreated({ ...created, __replaceClientId: clientId });
            }
            modal("Solicitud enviada", "Tu petición queda pendiente de aprobación.");
          } catch (err) {
            if (typeof onRequestCreated === "function") {
              onRequestCreated({ __deleteOptimistic: clientId });
            }
            modal("Error", err?.message || "No se pudo crear la solicitud");
          } finally {
            charge(false);
            setIsModalOpen(false);
          }
          return;
        }

        // Supervisor: directo
        try {
          charge(true);
          const token = getToken();
          const payload = {
            fileId: fileObj._id,
            originModel: modelName,
            idModel: data._id,
            description: (description ?? fileObj.description) || "",
          };
          if (fileName && fileName.trim()) {
            payload.fileName = fileName.trim();
            payload.fileLabel = fileName.trim();
          }
          if (date) payload.date = date;
          if (file) payload.file = file;

          const updatedData = await updateFileDrive(payload, token);
          if (!updatedData || updatedData.error) {
            throw new Error(updatedData?.message || "No se pudo actualizar el archivo.");
          }
          //en vez del onChange quieor una funcion que actualice 
          syncFromParent(updatedData);
          modal(
            "Documento actualizado",
            `El documento "${fileName || fileObj.fileLabel || fileObj.description || "Documento"}" se actualizó.`
          );
          setIsModalOpen(false);
        } catch (err) {
          modal("Error", err?.message || "No se pudo procesar la acción.");
        } finally {
          charge(false);
        }
      },
    });
    setIsModalOpen(true);
  };

  // ==================================================
  // ====== PETICIÓN MISCELÁNEA (EMPLEADO) ============
  // ==================================================
  const handleRequestUpload = () => {
    const todayStr = new Date().toISOString().split("T")[0];

    setFormConfig({
      title: "Solicitar subida de documento",
      message: "Adjunta el PDF y completa los metadatos. Un responsable revisará la petición.",
      fields: [
        { label: "Archivo (PDF)", name: "file", type: "file", required: true },
        {
          label: "Nombre del documento",
          name: "fileName",
          type: "text",
          placeholder: "Ej: Curso PRL 20h",
        },
        { label: "Fecha (opcional)", name: "date", type: "date", defaultValue: todayStr },
        { label: "Descripción (opcional)", name: "description", type: "text" },
        { label: "Nota para el responsable (opcional)", name: "note", type: "textarea" },
      ],
      onSubmit: async ({ file, fileName, date, description, note }) => {
        if (!file) {
          modal("Error", "Debes adjuntar un PDF.");
          return;
        }

        const token = getToken();
        const label = (fileName || file.name || "Documento").trim();
        const descFinal = (description || label).trim();
        const noteText = `Solicitud de actualización de documentación complementaria${fileName ? `: ${fileName}` : ""}`;

        // Optimista
        const clientId = emitOptimisticCR({
          file,
          fileName: label,
          date: date || null,
          description: descFinal,
          note: note || noteText,
          category: "Varios",
          type: "user-extra-doc",
        });

        try {
          charge(true);
          // Real
          const resp = await createChangeRequest(
            {
              userId: data._id,
              note: note || noteText,
              changes: [],
              uploads: [
                {
                  file,
                  category: "Varios",
                  date: date || null,
                  description: descFinal,
                  labelFile: label,
                  type: "user-extra-doc",
                },
              ],
            },
            token
          );

          const created = resp?.data && resp?.data?._id ? resp.data : resp;
          if (!created || created.error) {
            throw new Error(created?.message || "No se pudo crear la solicitud");
          }

          if (typeof onRequestCreated === "function") {
            onRequestCreated({ ...created, __replaceClientId: clientId });
          }

          modal("Solicitud enviada", "Tu petición de documento está pendiente de revisión.");
        } catch (e) {
          if (typeof onRequestCreated === "function") {
            onRequestCreated({ __deleteOptimistic: clientId });
          }
          modal("Error", e?.message || "No se pudo crear la solicitud");
        } finally {
          charge(false);
          setIsModalOpen(false);
        }
      },
    });

    setIsModalOpen(true);
  };
  function getRenewalInfo(files, renewalDays = 365) {
    if (!Array.isArray(files) || files.length === 0) return null;

    // Filtra solo archivos con fecha válida
    const validFiles = files.filter((f) => {
      if (!f?.date) return false;
      const d = new Date(f.date);
      return !isNaN(d.getTime());
    });
    if (validFiles.length === 0) return null;

    // Ordena de más reciente a más antiguo
    const sorted = [...validFiles].sort(
      (a, b) => new Date(b.date) - new Date(a.date)
    );

    const last = sorted[0];
    const lastDate = new Date(last.date);
    const today = new Date();

    const diffDays = Math.floor((today - lastDate) / (1000 * 60 * 60 * 24));
    const remaining = Math.max(renewalDays - diffDays, 0);

    return {
      lastDate: !isNaN(lastDate.getTime()) ? lastDate : null,
      diffDays,
      remaining,
    };
  }



  const startZipDownload = async () => {
    try {
      setIsGeneratingZip(true);

      const controller = new AbortController();
      abortZipRef.current = controller;

      const token = getToken();
      const fileIds = normalizedFiles.map((f) => f._id);

      if (fileIds.length === 0) {
        modal("Sin archivos", "No hay archivos para descargar.");
        setIsGeneratingZip(false);
        return;
      }

      // 🔥 Petición al backend con posibilidad de cancelar
      const blob = await downloadZipFiles(fileIds, token, controller.signal);

      if (blob?.error) {
        modal("Error", blob.message || "No se pudo generar el ZIP.");
        setIsGeneratingZip(false);
        return;
      }

      // 🟩 Forzar descarga
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      let baseName = "documentacion";

if (data?.firstName && data?.lastName && data?.dni) {
  baseName = `${sanitize(data.firstName)}_${sanitize(data.lastName)}_${sanitize(data.dni)}`;
} else if (data?.name) {
  baseName = sanitize(data.name);
}

const nameZip = `${baseName}_documentacion.zip`;
      a.download = nameZip;
      a.click();
      URL.revokeObjectURL(url);

    } catch (err) {
      if (err.name === "AbortError") {
        modal("Cancelado", "La descarga del ZIP ha sido cancelada.");
      } else {
        modal("Error", err.message || "No se pudo descargar el ZIP.");
      }
    } finally {
      setIsGeneratingZip(false);
    }
  };


  // ====================== RENDER ======================
  return (
    <div className={styles.contenedorDocument}>
      <h2>DOCUMENTOS       <button
        className={styles.downloadAll}
        onClick={handleDownloadAllZip}
      >
        Descargar todo en ZIP
      </button></h2>


      {/* Documentación Oficial */}
      <h3 className={styles.titulin}>Documentación Oficial</h3>
      <div className={styles.contentDocumentOficial}>
        {officialDocumentsToShow.length === 0 && <p>No hay documentación oficial configurada.</p>}

        {Object.entries(officialByCategory).map(([category, docsArray]) => (
          <div key={category} className={styles.categoryGroup}>
            <h4 className={styles.categoryTitle}>{category}</h4>

            {docsArray.map(({ doc, files }) => {
            
              const renewal = getRenewalInfo(files, doc.duration || 365); // ← 365 días por defecto

              return (
                <div
                  key={doc._id}
                  className={doc.model === "antiguomodelo" ? styles.officialDocGroupUser : styles.officialDocGroup}
                >
                  <div className={styles.docHeader}>
                    <label
                      className={styles.docLabeluploadButton}
                      onClick={
                        authorized
                          ? () => handleUploadOfficialFromSelect(doc._id)
                          : () => handleRequestOfficialUpload(doc)
                      }
                      title={
                        authorized
                          ? "Subir documento oficial"
                          : "Solicitar subida de este documento oficial"
                      }
                    >
                      {doc.name} <AiOutlineCloudUpload />
                    </label>
                      {
                        doc.modeloPDF && <button onClick={()=>{handleDownloadFile(doc.name, {idDrive:doc.modeloPDF}, true)}}>Descargar Modelo</button>
                      }
                    {/* Indicador de fecha */}
                    {doc.date && renewal && renewal.lastDate && (
                      <div
                        className={`${styles.renewalStatus} ${renewal.remaining > 0 ? styles.ok : styles.expired
                          }`}
                      >
                        {renewal.remaining > 0 ? (
                          <>
                            <FaRegClock className={styles.icon} />
                            <span>
                              Próxima renovación en{" "}
                              <strong>{renewal.remaining}</strong> días
                            </span>
                          </>
                        ) : (
                          <>
                            <MdWarningAmber className={`${styles.icon} ${styles.iconWarning}`} />
                            <span>¡Documento caducado o pendiente de renovar!</span>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Archivos existentes */}
                  {files.length !== 0 &&
                    files.map((file) => (
                      <div key={file._id} className={styles.fileRow}>
                        {file.date && (
                          <div
                            className={styles.infoFile}
                            onClick={() => handleDownloadFile(doc, file)}
                          >
                            <p>
                              {`Fecha: ${formatDate(file.date)} `}
                              <CiFileOn />
                            </p>
                          </div>
                        )}
                        {authorized && (
                          <FaTrash
                            className={styles.trash}
                            onClick={() => handleDeleteFile(file)}
                          />
                        )}
                      </div>
                    ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Documentos misceláneos */}
      <h3 className={styles.titulin}>
        Documentación Complementaria
        {authorized ? (
          <AiOutlineCloudUpload
            className={styles.uploadButton}
            title={"Subir documento"}
            onClick={handleFileUploadExtra}
          />
        ) : (
          <button className={styles.requestBtn} onClick={handleRequestUpload}>
            Solicitar subida de documento
          </button>
        )}
      </h3>

      <div className={styles.contentDocumentMiscelanea}>
        {extraFiles.length === 0 && <p>No hay archivos adicionales subidos.</p>}

        {extraFiles.map((fileObj) => (
          <div key={fileObj._id} className={styles.fileRow}>
            <div className={styles.infoFile} onClick={() => handleDownloadFile(false, fileObj)}>
              {fileObj.date && (
                <p>
                  {`Fecha: ${formatDate(fileObj.date)} `}
                  <CiFileOn />
                </p>
              )}
              {fileObj.fileLabel || "Documento adicional"}
            </div>

            {authorized && (
              <>
                <AiOutlineCloudUpload
                  className={styles.uploadButton}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleUpdateFileExtra(fileObj);
                  }}
                  title="Actualizar archivo"
                />
                <FaTrash
                  className={styles.trash}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteFile(fileObj);
                  }}
                  title="Eliminar archivo"
                />
              </>
            )}
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
          modal={modal}
        />
      )}

      {/* Modal confirmación borrado */}
      {deleteModal.open && (

        <ModalConfirmation
          title="Confirmar eliminación"
          message={`¿Eliminar "${(!!deleteModal.file.originDocumentation) ? deleteModal.file?.description : deleteModal.file?.fileLabel}"?`}
          onConfirm={confirmDeleteFile}
          onCancel={cancelDeleteFile}
        />
      )}
      {isGeneratingZip && (
        <ModalConfirmation
          title="Generando ZIP..."
          message="Por favor espera mientras se preparan los documentos. Esto puede tardar unos minutos."
          textConfirm="Cancelar"
          onConfirm={cancelZipGeneration}
          deleteCancel={true}   // solo botón 'Cancelar'
        />
      )}
    </div>
  );
};
function transformFiles(files) {
  if (!files) return [];

  const extractOriginId = (od) =>
    typeof od === "object" && od !== null ? od._id : od;

  return (files || [])
    .map((f) => {
      if (!f || !f._id) return null;
      return {
        _id: f._id,
        originDocumentation: extractOriginId(f.originDocumentation),
        date: f.date || null,
        fileLabel: f.fileLabel || f.fileName || "",
        description: f.description || "",
        idDrive: f.idDrive,
      };
    })
    .filter(Boolean);
}



export default DocumentMiscelaneaGeneric;
