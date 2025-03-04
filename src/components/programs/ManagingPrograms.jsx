import React, { useEffect, useState } from "react";
import { FaSquarePlus } from "react-icons/fa6";
import FormProgram from "./FormProgram";
import ProgramList from "./ProgramList";
import ProgramDetails from "./ProgramDetails";
import DeviceDetails from "./DeviceDetails";
import styles from "../styles/ManagingPrograms.module.css";

const ManagingPrograms = ({ enumsData, modal, charge, chargePrograms }) => {
  // Controla la visualización del Modal para crear/editar Programas
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
      const sorted = [...enumsData.programs].sort((a, b) =>
        a.area.localeCompare(b.area)
      );
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

  /**
   * Esta función se llama cuando se ha guardado/actualizado un programa
   * (por ejemplo, al crear o editar un programa, o al subir/eliminar un archivo).
   */
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

    // 2) Si el programa que se está visualizando es el guardado, se actualiza
    if (selectedProgram && selectedProgram._id === savedProgram._id) {
      setSelectedProgram(savedProgram);
    }

    // 3) Actualizamos también enumsData.programs a través de chargePrograms
    if (enumsData?.programs) {
      // Reemplazar o agregar en la lista global
      let updatedPrograms = enumsData.programs.map((p) =>
        p._id === savedProgram._id ? savedProgram : p
      );
      if (!updatedPrograms.some((p) => p._id === savedProgram._id)) {
        updatedPrograms.push(savedProgram);
      }
      // Llamamos a chargePrograms para actualizar en el padre
      chargePrograms(updatedPrograms);
    }
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
            handleProgramSaved={(p) => handleProgramSaved(p)}
          />
        )}

        <div>
          {selectedDevice ? (
            /* --------- VISTA DETALLES DE DISPOSITIVO --------- */
            <DeviceDetails
              device={selectedDevice}
              onClose={() => setSelectedDevice(null)}
              handleProgramSaved={(p) => handleProgramSaved(p)}
            />
          ) : selectedProgram ? (
            /* --------- VISTA DETALLES DE PROGRAMA --------- */
            <ProgramDetails
              program={selectedProgram}
              onClose={() => setSelectedProgram(null)}
              onEditProgram={openEditProgram}
              onSelectDevice={(device) => setSelectedDevice(device)}
              modal={modal}
              charge={charge}
              enumsData={enumsData}
              handleProgramSaved={handleProgramSaved}
            />
          ) : (
            /* --------- LISTA DE PROGRAMAS --------- */
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
