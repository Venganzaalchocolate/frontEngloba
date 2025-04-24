import React, { useState } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { updateProgram } from "../../lib/data"; // Se reemplaza updateProgramCronology por updateProgram
import { getToken } from "../../lib/serviceToken";
import { FaSquarePlus } from "react-icons/fa6";
import { FaEdit, FaTrashAlt, FaLockOpen, FaLock } from "react-icons/fa";
import styles from "../styles/ManagingPrograms.module.css";


const CronologyManager = ({ program, modal, charge, handleProgramSaved, authorized }) => {
    const [showModal, setShowModal] = useState(false);
    const [formType, setFormType] = useState("add"); // "add" o "edit"
    const [currentCronology, setCurrentCronology] = useState(null);
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [itemToDelete, setItemToDelete] = useState(null);

    const openAddCronology = () => {
        setFormType("add");
        setCurrentCronology({ open: "", closed: "" });
        setShowModal(true);
    };

    const openEditCronology = (cronItem) => {
        setFormType("edit");
        setCurrentCronology(cronItem);
        setShowModal(true);
    };

    // Al hacer clic en eliminar se solicita confirmación
    const requestDeleteCronology = (cronItem) => {
        setItemToDelete(cronItem);
        setShowConfirmModal(true);
    };

    const confirmDeleteCronology = async () => {
        try {
            charge(true);
            const token = getToken();
            const payload = {
                id: program._id,
                cronology: { _id: itemToDelete._id },
                type: "delete",
            };
            const result = await updateProgram(payload, token);
            if (result.error) {
                modal("Error", result.message || "No se pudo eliminar la cronología");
            } else {
                handleProgramSaved(result);
                modal("Cronología", "Cronología eliminada con éxito");
            }
        } catch (error) {
            modal("Error", error.message || "Error eliminando cronología");
        } finally {
            charge(false);
            setShowConfirmModal(false);
            setItemToDelete(null);
        }
    };

    const cancelDeleteCronology = () => {
        setShowConfirmModal(false);
        setItemToDelete(null);
    };

    const handleSubmit = async (formData) => {
        try {
            charge(true);
            const token = getToken();
            let payload = { id: program._id, type: formType === "add" ? "add" : "edit" };
            payload.cronology =
                formType === "edit" && currentCronology?._id
                    ? { ...formData, _id: currentCronology._id }
                    : formData;
            const result = await updateProgram(payload, token);
            if (result.error) {
                modal("Error", result.message || "No se pudo actualizar la cronología");
            } else {
                handleProgramSaved(result);
                modal(
                    "Cronología",
                    formType === "add" ? "Cronología agregada" : "Cronología editada"
                );
            }
            setShowModal(false);
        } catch (error) {
            modal("Error", error.message || "Error actualizando cronología");
        } finally {
            charge(false);
        }
    };

    const fields = [
        {
            name: "open",
            label: "Fecha de apertura",
            type: "date",
            required: true,
            defaultValue: currentCronology?.open
                ? new Date(currentCronology.open).toISOString().substr(0, 10)
                : "",
        },
        {
            name: "closed",
            label: "Fecha de cierre",
            type: "date",
            required: false,
            defaultValue: currentCronology?.closed
                ? new Date(currentCronology.closed).toISOString().substr(0, 10)
                : "",
        },
    ];

    return (
        <div className={styles.cronologyContenedor}>
            <h3>Cronología {authorized && <FaSquarePlus onClick={openAddCronology} />} </h3>
            {program.cronology && program.cronology.length > 0 ? (
                program.cronology.map((item) => (
                    <div key={item._id} className={styles.cronologyItem}>
                        
                        <div>
                            <p><FaLockOpen /> {new Date(item.open).toLocaleDateString()}</p>
                            <p><FaLock /> {item.closed ? new Date(item.closed).toLocaleDateString() : "N/A"}</p>
                        </div>
                        {authorized && 
                        <div>
                            <FaEdit onClick={() => openEditCronology(item)} />
                            <FaTrashAlt onClick={() => requestDeleteCronology(item)} />
                        </div>
                        }
                        
                    </div>
                ))
            ) : (
                <p>No existe cronología actualmente</p>
            )}

            {showModal && (
                <ModalForm
                    title={formType === "add" ? "Añadir cronología" : "Editar cronología"}
                    message={
                        formType === "add"
                            ? "Complete los datos de la cronología."
                            : "Modifique los datos de la cronología."
                    }
                    fields={fields}
                    onSubmit={handleSubmit}
                    onClose={() => setShowModal(false)}
                />
            )}

            {showConfirmModal && (
                <ModalConfirmation
                    title="Eliminar Cronología"
                    message="¿Estás seguro que deseas eliminar esta cronología?"
                    onConfirm={confirmDeleteCronology}
                    onCancel={cancelDeleteCronology}
                />
            )}
        </div>
    );
};

export default CronologyManager;
