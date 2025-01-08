import React from "react";
import "../styles/modalForm.css"; // Ajusta la ruta del CSS según tu proyecto

const ModalConfirmation = ({
  title = "Confirmación",
  message = "¿Estás seguro?",
  onConfirm,
  onCancel,
}) => {
  return (
    <div id="modalVentana" className="modalVentana">
      <div id="modalContenedor" className="modalContenedor">
        {/* Título (opcional) */}
        <h3 className="modalTitle">{title}</h3>

        {/* Mensaje de confirmación */}
        {message && <p>{message}</p>}

        {/* Botones de acción */}
        <div id="modalActions" className="modalActions">
          <button onClick={onConfirm}>Sí</button>
          <button className="tomato" onClick={onCancel}>No</button>
        </div>
      </div>
    </div>
  );
};

export default ModalConfirmation;
