import React, { useEffect, useState } from 'react';
import { getPrograms } from '../../lib/data';
import styles from '../styles/SelectDispositive.module.css';  

const SelectDispositive = ({ onDeviceSelect }) => {
    const [programs, setPrograms] = useState([]); // Guardar los programas obtenidos
    const [selectedProgram, setSelectedProgram] = useState(null); // Guardar el programa seleccionado
    const [devices, setDevices] = useState([]); // Guardar los dispositivos del programa seleccionado
    const [selectedDevice, setSelectedDevice] = useState(null); // Guardar el dispositivo seleccionado
    const [nameSelected, setNameSelected] = useState(null);

    // Función para obtener los programas al renderizar el componente
    useEffect(() => {
        const fetchPrograms = async () => {
            const programsData = await getPrograms();
            setPrograms(programsData);
        };
        fetchPrograms();
    }, []);

    // Manejar cuando el usuario selecciona un programa
    const handleProgramChange = (e) => {
        const selectedProgramId = e.target.value;
        const program = programs.find(p => p._id === selectedProgramId);
        setSelectedProgram(program);
        setDevices(program ? program.devices : []); // Asumimos que el programa tiene un campo 'devices'
        setSelectedDevice(null); // Reseteamos el dispositivo seleccionado
        onDeviceSelect(null); // Reseteamos el dispositivo seleccionado en el componente padre
    };

    // Manejar cuando el usuario selecciona un dispositivo
    const handleDeviceChange = (e) => {
        const deviceId = e.target.value;
        const deviceSelectedName=selectedProgram.devices.filter((x)=>x._id==deviceId)[0].name
        setSelectedDevice(deviceId);
        onDeviceSelect(deviceId, deviceSelectedName); // Envía la información al componente padre inmediatamente
    };

    return (
        <div className={styles.contenedor}>
            <div>
                <label htmlFor="programs">Selecciona un programa:</label>
                <select id="programs" onChange={handleProgramChange}>
                    <option value="">-- Selecciona un programa --</option>
                    {programs.map(program => (
                        <option key={program._id} value={program._id}>
                            {program.name}
                        </option>
                    ))}
                </select>
            </div>

            {devices.length > 0 && (
                <div>
                    <label htmlFor="devices">Selecciona un dispositivo:</label>
                    <select id="devices" onChange={handleDeviceChange}>
                        <option value="">-- Selecciona un dispositivo --</option>
                        {devices.map(device => (
                            <option key={device._id} value={device._id}>
                                {device.name}
                            </option>
                        ))}
                    </select>
                </div>
            )}
        </div>
    );
};

export default SelectDispositive;
