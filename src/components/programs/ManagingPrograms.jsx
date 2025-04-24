import React, { useEffect, useState } from "react";
import { FaSquarePlus } from "react-icons/fa6";
import FormProgram from "./FormProgram";
import ProgramList from "./ProgramList";
import ProgramDetails from "./ProgramDetails";
import DeviceDetails from "./DeviceDetails";
import FormDevice from "./FormDevice";
import styles from "../styles/ManagingPrograms.module.css";
import { useLogin } from '../../hooks/useLogin.jsx';

const ManagingPrograms = ({ enumsData, modal, charge, chargePrograms, listResponsability }) => {
  // Modal para crear/editar programas y dispositivos
  const [showProgramModal, setShowProgramModal] = useState(false);
  const [showDeviceModal, setShowDeviceModal] = useState(false);
  
  // Programa y dispositivo seleccionados
  const [selectedProgram, setSelectedProgram] = useState(null);
  const [selectedDevice, setSelectedDevice] = useState(null);
  
  // Programa y dispositivo en edición
  const [editingProgram, setEditingProgram] = useState(null);
  const [editingDevice, setEditingDevice] = useState(null);

  // Lista ordenada de programas
  const [sortedPrograms, setSortedPrograms] = useState([]);
  const { logged } = useLogin();

  useEffect(() => {
    if (enumsData?.programs) {
      const sorted = [...enumsData.programs].sort((a, b) =>
        a.area.localeCompare(b.area)
      );
      setSortedPrograms(sorted);
    }
  }, [enumsData]);

  // Abrir modal para crear un nuevo programa
  const openCreateProgram = () => {
    setEditingProgram(null);
    setShowProgramModal(true);
  };

  // Abrir modal para editar un programa existente
  const openEditProgram = (programId) => {
    const program = enumsData.programs.find((p) => p._id === programId);
    if (program) {
      setEditingProgram(program);
      setShowProgramModal(true);
    }
  };

  const closeProgramModal = () => {
    setShowProgramModal(false);
  };

  // Abrir modal para editar un dispositivo: se recibe el objeto device directamente
  const openEditDevice = (deviceObj) => {
    if (deviceObj) {
      setEditingDevice(deviceObj);
      setShowDeviceModal(true);
    }
  };

  const closeDeviceModal = () => {
    setShowDeviceModal(false);
  };

  const handleProgramSaved = (savedProgram) => {
    setSortedPrograms((prev) => {
      const idx = prev.findIndex((p) => p._id === savedProgram._id);
      if (idx >= 0) {
        const newArr = [...prev];
        newArr[idx] = savedProgram;
        return newArr;
      } else {
        return [...prev, savedProgram];
      }
    });
  
    // Actualiza el programa seleccionado si coincide
    if (selectedProgram && selectedProgram._id === savedProgram._id) {
      setSelectedProgram(savedProgram);
    }
  
    // Si se ha actualizado un dispositivo y éste estaba seleccionado,
    // buscamos dentro de savedProgram.devices el dispositivo actualizado y lo actualizamos.
    if (selectedDevice && savedProgram.devices) {
      const updatedDevice = savedProgram.devices.find(
        (d) => d._id.toString() === selectedDevice._id.toString()
      );
      updatedDevice['idProgramFather']=savedProgram._id
      if (updatedDevice) {
        setSelectedDevice(updatedDevice);
      }
    }
  
    // Actualizamos la lista global de programas
    if (enumsData?.programs) {
      let updatedPrograms = enumsData.programs.map((p) =>
        p._id === savedProgram._id ? savedProgram : p
      );
      if (!updatedPrograms.some((p) => p._id === savedProgram._id)) {
        updatedPrograms.push(savedProgram);
      }
      chargePrograms(updatedPrograms);
    }
  };
  
  const onClose=()=>{
    if(selectedDevice) setSelectedDevice(null);
    else setSelectedProgram(null)
  }


  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <h2>{!!selectedDevice?'GESTIÓN DEL DISPOSITIVO':'GESTIÓN DEL PROGRAMA'} {!selectedDevice &&  (logged.user.role=='global' || logged.user.role=='root') && <FaSquarePlus onClick={openCreateProgram}/>}</h2>
          {(selectedDevice || selectedProgram) && <button onClick={() => onClose()}>Atrás</button>}
        </div>

        {/* Modal: Crear/Editar Programa */}
        {showProgramModal && (
          <FormProgram
            program={editingProgram}
            enumsData={enumsData}
            modal={modal}
            charge={charge}
            closeModal={closeProgramModal}
            handleProgramSaved={handleProgramSaved}
          />
        )}

        {/* Modal: Crear/Editar Dispositivo */}
        {showDeviceModal && (
          <FormDevice
            key={editingDevice ? editingDevice._id : "new-device"}
            device={editingDevice}
            program={selectedProgram}
            enumsData={enumsData}
            modal={modal}
            charge={charge}
            closeModal={closeDeviceModal}
            handleProgramSaved={handleProgramSaved}
          />
        )}

        <div>
          {selectedDevice ? (
            // Vista de detalles de dispositivo
            <DeviceDetails
              close={onClose}
              device={selectedDevice}
              program={selectedProgram} // se pasa el programa padre
              enumsData={enumsData} // datos globales
              modal={modal}
              charge={charge}
              handleProgramSaved={handleProgramSaved}
              onEditDevice={openEditDevice} // callback para editar device
              listResponsability={listResponsability}
            />
          ) : selectedProgram ? (
            // Vista de detalles de programa
            <ProgramDetails
              program={selectedProgram}
              onEditProgram={openEditProgram}
              onSelectDevice={(device) => setSelectedDevice(device)}
              modal={modal}
              charge={charge}
              enumsData={enumsData}
              handleProgramSaved={handleProgramSaved}
              listResponsability={listResponsability}
            />
          ) : (
            // Lista de programas
            <ProgramList
              programs={sortedPrograms}
              onSelectProgram={(program) => setSelectedProgram(program)}
            />
          )}
          
        </div>
        
      </div>
    </div>
  );
};

export default ManagingPrograms;
