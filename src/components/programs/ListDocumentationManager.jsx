import React, { useState } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { updateProgram } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

import styles from "../styles/ListDocumentation.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";

const ListDocumentationManager = ({ program, modal, charge, handleProgramSaved, enumsData }) => {
    const [showModal, setShowModal] = useState(false);
    const [docType, setDocType] = useState(""); // "program" o "device"
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null); // Aquí se guardará el ID de la documentación
    const [deleteDocType, setDeleteDocType] = useState("");

    // Abre el modal para agregar documentación esencial según el tipo
    const openAddDocumentation = (type) => {
        setDocType(type);
        setShowModal(true);
    };

    // Solicita confirmación para eliminar un elemento
    const requestDeleteDocumentation = (docId, type) => {
        setItemToDelete(docId);
        setDeleteDocType(type);
        setShowConfirmModal(true);
    };

    // Envía la selección del select para agregar documentación esencial
    const handleSubmitDocumentation = async (formData) => {
        try {
            charge(true);
            const token = getToken();
            // Se envía el id de la documentación seleccionado en la propiedad correspondiente
            const payload = {
                id: program._id,
                type: "add"
            };
            if (docType === "program") {
                payload.essentialDocumentationProgram = formData.documentationId;
            } else {
                payload.essentialDocumentationDevice = formData.documentationId;
            }
            console.log(payload);
            const result = await updateProgram(payload, token);
            if (result.error) {
                modal("Error", result.message || "No se pudo agregar la documentación esencial");
            } else {
                handleProgramSaved(result);
                modal("Documentación", "Documentación esencial agregada exitosamente");
            }
        } catch (error) {
            modal("Error", error.message || "Error al agregar documentación esencial");
        } finally {
            charge(false);
            setShowModal(false);
        }
    };

    // Confirma y ejecuta la eliminación de un elemento
    const confirmDeleteDocumentation = async () => {
        try {
            charge(true);
            const token = getToken();
            const payload = {
                id: program._id,
                type: "delete"
            };
            if (deleteDocType === "program") {
                payload.essentialDocumentationProgram = itemToDelete;
            } else {
                payload.essentialDocumentationDevice = itemToDelete;
            }
            const result = await updateProgram(payload, token);
            if (result.error) {
                modal("Error", result.message || "No se pudo eliminar la documentación esencial");
            } else {
                handleProgramSaved(result);
                modal("Documentación", "Documentación esencial eliminada exitosamente");
            }
        } catch (error) {
            modal("Error", error.message || "Error al eliminar documentación esencial");
        } finally {
            charge(false);
            setShowConfirmModal(false);
            setItemToDelete(null);
            setDeleteDocType("");
        }
    };

    const cancelDeleteDocumentation = () => {
        setShowConfirmModal(false);
        setItemToDelete(null);
        setDeleteDocType("");
    };

    // Campos del formulario: se utiliza un select con opciones provenientes de enumsData.documentation.
    // Se añade primero una opción "Selecciona una opción" que no se puede seleccionar.
    const fields = [
        {
            name: "documentationId",
            label: "Documentación",
            type: "select",
            required: true,
            options: [
                { value: "", label: "Selecciona una opción", disabled: true },
                ...(enumsData && enumsData.documentation
                    ? enumsData.documentation.map(doc => ({ value: doc._id, label: doc.name }))
                    : [])
            ]
        }
    ];

    // Función para obtener el label de la documentación a partir del ID
    const getDocumentationLabel = (docId) => {
        if (enumsData && enumsData.documentation) {
            const doc = enumsData.documentation.find(d => d._id === docId);
            return doc ? doc.name : docId;
        }
        return docId;
    };

    return (
        <div className={styles.contenedor}>
            <div className={styles.listContenedor}>
                <h2 className={styles.titulo}>Documentación Esencial</h2>

                {/* Sección para documentación esencial del Programa */}
                <div className={styles.section}>
                    <h4>
                        Programa
                        <FaSquarePlus onClick={() => openAddDocumentation("program")} style={{ cursor: "pointer" }} />
                    </h4>
                    {program.essentialDocumentationProgram && program.essentialDocumentationProgram.length > 0 ? (
                        program.essentialDocumentationProgram.map((docId) => (
                            <div key={docId} className={styles.listItem}>
                                <div>
                                    <p>{getDocumentationLabel(docId)}</p>
                                </div>
                                <div>
                                    <FaTrashAlt onClick={() => requestDeleteDocumentation(docId, "program")} style={{ cursor: "pointer" }} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No existe documentación esencial para el programa</p>
                    )}
                </div>

                {/* Sección para documentación esencial del Dispositivo */}
                <div className={styles.section}>
                    <h4>
                        Dispositivo
                        <FaSquarePlus onClick={() => openAddDocumentation("device")} style={{ cursor: "pointer" }} />
                    </h4>
                    {program.essentialDocumentationDevice && program.essentialDocumentationDevice.length > 0 ? (
                        program.essentialDocumentationDevice.map((docId) => (
                            <div key={docId} className={styles.listItem}>
                                <div>
                                    <p>{getDocumentationLabel(docId)}</p>
                                </div>
                                <div>
                                    <FaTrashAlt onClick={() => requestDeleteDocumentation(docId, "device")} style={{ cursor: "pointer" }} />
                                </div>
                            </div>
                        ))
                    ) : (
                        <p>No existe documentación esencial para el dispositivo</p>
                    )}
                </div>

                {showModal && (
                    <ModalForm
                        title="Añadir Documentación Esencial"
                        message="Seleccione la documentación esencial"
                        fields={fields}
                        onSubmit={handleSubmitDocumentation}
                        onClose={() => setShowModal(false)}
                    />
                )}

                {showConfirmModal && (
                    <ModalConfirmation
                        title="Eliminar Documentación Esencial"
                        message="¿Estás seguro que deseas eliminar esta documentación esencial?"
                        onConfirm={confirmDeleteDocumentation}
                        onCancel={cancelDeleteDocumentation}
                    />
                )}
            </div>
        </div>
    );
};

export default ListDocumentationManager;
