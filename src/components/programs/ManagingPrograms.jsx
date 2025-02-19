import React, { useEffect, useState } from "react";
import { FaSquarePlus } from "react-icons/fa6";
import FormProgram from "./FormProgram";
import ProgramList from "./ProgramList";
import ProgramDetails from "./ProgramDetails";
import DeviceDetails from "./DeviceDetails";
import styles from "../styles/ManagingPrograms.module.css";

const ManagingPrograms = ({ enumsData, modal, charge, chargePrograms = () => {} }) => {
  // Controla la visualización del Modal
  const [showProgramModal, setShowProgramModal] = useState(false);
  // Programa seleccionado (para ver detalles)
  const [selectedProgram, setSelectedProgram] = useState(null);
  // Dispositivo seleccionado
  const [selectedDevice, setSelectedDevice] = useState(null);
  // Programa en edición (si no es null, se edita)
  const [editingProgram, setEditingProgram] = useState(null);

  // Lista ordenada de programas
  const [sortedPrograms, setSortedPrograms] = useState([]);

  useEffect(() => {
    if (enumsData?.programs) {
      const sorted = [...enumsData.programs].sort((a, b) => a.area.localeCompare(b.area));
      setSortedPrograms(sorted);
    }
  }, [enumsData]);

  // Crear un programa nuevo
  const openCreateProgram = () => {
    setEditingProgram(null);
    setShowProgramModal(true);
  };

  // Editar un programa existente
  const openEditProgram = (programId) => {
    const program = enumsData.programs.find((p) => p._id === programId);
    if (program) {
      setEditingProgram(program);
      setShowProgramModal(true);
    }
  };

  const closeFormModal = () => {
    setShowProgramModal(false);
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <h2>GESTIÓN DE PROGRAMAS Y DISPOSITIVOS</h2>
          <FaSquarePlus onClick={openCreateProgram} style={{ cursor: "pointer" }} />
        </div>

        {/* Modal: Crear/Editar Programa */}
        {showProgramModal && (
          <FormProgram
            program={editingProgram}
            enumsData={enumsData}
            modal={modal}
            charge={charge}
            closeModal={closeFormModal}
          />
        )}

        <div>
          {selectedDevice ? (
            // -- VISTA DETALLES DE DISPOSITIVO --
            <DeviceDetails
              device={selectedDevice}
              onClose={() => setSelectedDevice(null)}
            />
          ) : selectedProgram ? (
            // -- VISTA DETALLES DE PROGRAMA --
            <ProgramDetails
              program={selectedProgram}
              onClose={() => setSelectedProgram(null)}
              onEditProgram={openEditProgram}
              onSelectDevice={(device) => setSelectedDevice(device)}
              modal={modal}
              charge={charge}
            />
          ) : (
            // -- LISTA DE PROGRAMAS --
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
