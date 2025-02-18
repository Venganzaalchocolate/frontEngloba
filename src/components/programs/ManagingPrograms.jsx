import { FaSquarePlus } from "react-icons/fa6";
import styles from "../styles/ManagingPrograms.module.css";
import { useState } from "react";

const ManagingPrograms = ({ enumsData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [programSelected, setProgramSelected] = useState(null);
    const [deviceSelected, setDeviceSelected] = useState(null);

    const openModal = () => {
        setIsModalOpen(true);
    };

    const selectProgram = (id) => {
        setProgramSelected(id);
        setDeviceSelected(null); // Resetear selección de dispositivo
    };

    const selectDevice = (deviceId) => {
        setDeviceSelected(deviceId);
    };

    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <div className={styles.titulo}>
                    <h2>GESTIÓN DE PROGRAMAS Y DISPOSITIVOS</h2>
                    <FaSquarePlus onClick={openModal} />
                    {isModalOpen && <div>Modal Abierto</div>}
                </div>

                <div>
                    {/* Si hay un dispositivo seleccionado, mostramos sus detalles */}
                    {deviceSelected ? (
                        <>
                            <button onClick={() => setDeviceSelected(null)}>Volver a dispositivos</button>
                            <h3>Detalles del Dispositivo</h3>
                            {programSelected &&
                                enumsData.programs
                                    .find((program) => program._id === programSelected)
                                    ?.devices
                                    .find((device) => device._id === deviceSelected) && (
                                    <div className={styles.deviceDetails}>
                                        <h4>Nombre: {enumsData.programs.find(p => p._id === programSelected).devices.find(d => d._id === deviceSelected)?.name}</h4>
                                        <p>Dirección: {enumsData.programs.find(p => p._id === programSelected).devices.find(d => d._id === deviceSelected)?.address || "No disponible"}</p>
                                        <p>Email: {enumsData.programs.find(p => p._id === programSelected).devices.find(d => d._id === deviceSelected)?.email || "No disponible"}</p>
                                        <p>Teléfono: {enumsData.programs.find(p => p._id === programSelected).devices.find(d => d._id === deviceSelected)?.phone || "No disponible"}</p>
                                    </div>
                                )}
                        </>
                    ) : programSelected ? (
                        // Si hay un programa seleccionado, mostramos sus detalles y dispositivos
                        <>
                            <button onClick={() => setProgramSelected(null)}>Volver a programas</button>
                            <h3>Detalles del Programa</h3>
                            {enumsData.programs.find((p) => p._id === programSelected) && (
                                <div className={styles.programDetails}>
                                    <h4>Nombre: {enumsData.programs.find(p => p._id === programSelected)?.name}</h4>
                                    <p>Descripción: {enumsData.programs.find(p => p._id === programSelected)?.description || "No disponible"}</p>
                                    <h4>Dispositivos:</h4>
                                    {enumsData.programs.find((p) => p._id === programSelected)?.devices?.length > 0 ? (
                                        enumsData.programs.find((p) => p._id === programSelected)?.devices.map((device) => (
                                            <div
                                                key={device._id}
                                                className={styles.deviceItem}
                                                onClick={() => selectDevice(device._id)}
                                            >
                                                {device.name}
                                            </div>
                                        ))
                                    ) : (
                                        <p>No hay dispositivos asociados a este programa.</p>
                                    )}
                                </div>
                            )}
                        </>
                    ) : (
                        // Si no hay nada seleccionado, mostramos la lista de programas
                        <>
                            <h3>Lista de Programas</h3>
                            {enumsData?.programs?.length > 0 ? (
                                enumsData.programs.map((x) => (
                                    <div key={x._id} className={styles.programItem} onClick={() => selectProgram(x._id)}>
                                        {x.name}
                                    </div>
                                ))
                            ) : (
                                <p>No hay programas disponibles.</p>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ManagingPrograms;
