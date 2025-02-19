import React from "react";
import styles from "../styles/ManagingPrograms.module.css";

/**
 * DeviceDetails
 * -------------
 * Muestra la información de un dispositivo.
 * Recibe:
 * - device: el dispositivo seleccionado
 * - onClose: callback para volver a la lista de dispositivos
 */
const DeviceDetails = ({ device, onClose }) => {
  if (!device) return null;

  return (
    <>
      <button onClick={onClose}>Volver a dispositivos</button>
      <h3>Detalles del Dispositivo</h3>
      <div className={styles.deviceDetails}>
        <h4>Nombre: {device.name || "Sin nombre"}</h4>
        <p>Dirección: {device.address || "No disponible"}</p>
        <p>Email: {device.email || "No disponible"}</p>
        <p>Teléfono: {device.phone || "No disponible"}</p>
      </div>
    </>
  );
};

export default DeviceDetails;
