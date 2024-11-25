import { useState } from "react";
import { FaTrashAlt, FaEdit, FaSave, FaTimes } from "react-icons/fa";
import styles from "../styles/hiringperiods.module.css";

const LeavePeriodsList = ({ leavePeriods, enums, onSaveLeave, onDeleteLeave }) => {
    const [editingIndex, setEditingIndex] = useState(null);
    const [editedLeave, setEditedLeave] = useState(null);

    const handleInputChange = (field, value) => {
        setEditedLeave(prev => ({ ...prev, [field]: value }));
    };

    const saveChanges = (index) => {
        onSaveLeave(index, editedLeave);
        setEditingIndex(null);
        setEditedLeave(null);
    };

    const cancelEditing = () => {
        setEditingIndex(null);
        setEditedLeave(null);
    };

    const renderEditableField = (value, field, type = "text", className = "") => (
        <input
            type={type}
            value={value || ""}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={className}
        />
    );

    const renderEditableSelect = (value, field, options, className = "") => (
        <select
            value={value || ""}
            onChange={(e) => handleInputChange(field, e.target.value)}
            className={className}
        >
            <option value="">Seleccionar</option>
            {options.map(option => (
                <option key={option._id} value={option._id}>
                    {option.name}
                </option>
            ))}
        </select>
    );

    return (
        <div className={styles.leaves}>
            {/* Cabecera de los leavePeriods */}
            <div className={styles.cajaleaveCabecera}>
                <div className={styles.periodo}>
                    <div className={styles.fechainicio}>Inicio</div>
                    <div className={styles.fechainicio}>Prevista</div>
                    <div className={styles.fechainicio}>Fin</div>
                    <div className={styles.posicion}>Descripción</div>
                </div>
            </div>
            {leavePeriods.map((leave, index) => (
                <div key={index} className={styles.leave}>
                    {editingIndex === index ? (
                        <>
                            {renderEditableField(
                                editedLeave.startLeaveDate || leave.startLeaveDate,
                                "startLeaveDate",
                                "date",
                                styles.fechainicio
                            )}
                            {renderEditableField(
                                editedLeave.expectedEndLeaveDate || leave.expectedEndLeaveDate,
                                "expectedEndLeaveDate",
                                "date",
                                styles.fechainicio
                            )}
                            {renderEditableField(
                                editedLeave.actualEndLeaveDate || leave.actualEndLeaveDate,
                                "actualEndLeaveDate",
                                "date",
                                styles.fechainicio
                            )}
                            {renderEditableSelect(
                                editedLeave.leaveType || leave.leaveType,
                                "leaveType",
                                enums.leavetype,
                                styles.posicion
                            )}
                            <FaSave onClick={() => saveChanges(index)} className={styles.icono} />
                            <FaTimes onClick={cancelEditing} className={styles.icono} />
                        </>
                    ) : (
                        <>
                            <div className={styles.fechainicio}>
                                {new Date(leave.startLeaveDate).toLocaleDateString("es-ES")}
                            </div>
                            <div className={styles.fechainicio}>
                                {leave.expectedEndLeaveDate
                                    ? new Date(leave.expectedEndLeaveDate).toLocaleDateString("es-ES")
                                    : ""}
                            </div>
                            <div className={styles.fechainicio}>
                                {leave.actualEndLeaveDate
                                    ? new Date(leave.actualEndLeaveDate).toLocaleDateString("es-ES")
                                    : ""}
                            </div>
                            <div className={styles.posicion}>{leave.leaveType?.name}</div>
                            <FaEdit
                                onClick={() => {
                                    setEditingIndex(index);
                                    setEditedLeave(leave);
                                }}
                                className={styles.icono}
                            />
                        </>
                    )}
                    <FaTrashAlt onClick={() => onDeleteLeave(index)} className={styles.icono} />
                </div>
            ))}
        </div>
    );
};

export default LeavePeriodsList;
