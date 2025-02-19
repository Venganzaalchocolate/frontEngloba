import React, { useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import styles from "../styles/ManagingPrograms.module.css";
import DocumentProgramMiscelanea from "./DocumentProgramMiscelanea";
import FormDevice from "./FormDevice"; // <--- IMPORTAMOS
// ... omite otros imports si no corresponden

const ProgramDetails = ({
  program,
  onClose,
  onEditProgram,
  onSelectDevice,
  modal,
  charge,
  enumsData,
  handleProgramSaved
}) => {
  const [showDispositiveModal, setShowDispositiveModal] = useState(false);

  if (!program) return null;

  // Abrir modal para crear dispositivo
  const openCreateDispositive = () => {
    setShowDispositiveModal(true);
  };

  // Cerrar modal
  const closeDispositiveModal = () => {
    setShowDispositiveModal(false);
  };


  return (
    <div className={styles.programInfoContainer}>
      <div className={styles.containerInfo}>
        <h2>
          {program.acronym.toUpperCase()}{" "}
          <FaEdit
            onClick={() => onEditProgram(program._id)}
            style={{ cursor: "pointer" }}
          />
        </h2>
        <div className={styles.programDetailInfo}>
          <p>
            <span className={styles.titulines}>Acrónimo:</span>{" "}
            {program.acronym || "No disponible"}
          </p>
          <p>
            <span className={styles.titulines}>Área:</span>{" "}
            {program.area || "No disponible"}
          </p>
          <p>
            <span className={styles.titulines}>Activo:</span>{" "}
            {program.active ? "Activo" : "Inactivo"}
          </p>
          {/* Descripción */}
          <p>
            <span className={styles.titulines}>Descripción:<br/></span>
            {program.about?.description
              ? program.about.description.split("\n").map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    <br />
                  </React.Fragment>
                ))
              : "No disponible"}
          </p>
          {/* Objetivos */}
          <p>
            <span className={styles.titulines}>Objetivos:<br/></span>
            {program.about?.objectives
              ? program.about.objectives.split("\n").map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    <br />
                  </React.Fragment>
                ))
              : "No disponible"}
          </p>
          {/* Perfil */}
          <p>
            <span className={styles.titulines}>Perfil:<br/></span>
            {program.about?.profile
              ? program.about.profile.split("\n").map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    <br />
                  </React.Fragment>
                ))
              : "No disponible"}
          </p>
        </div>
      </div>

      {/* Documentos asociados al programa */}
      <DocumentProgramMiscelanea
        program={program}
        modal={modal}
        charge={charge}
        changeProgram={() => {}}
        handleProgramSaved={(p)=>handleProgramSaved(p)}
      />

      <div>
        <h4>
          Dispositivos:
          <FaSquarePlus onClick={openCreateDispositive} style={{ cursor: "pointer" }} />
        </h4>
        {program.devices?.length > 0 ? (
          program.devices.map((device) => (
            <div
              key={device._id}
              className={styles.deviceItem}
              onClick={() => onSelectDevice(device)}
            >
              {device.name}
            </div>
          ))
        ) : (
          <p>No hay dispositivos asociados a este programa.</p>
        )}
      </div>

      <button onClick={onClose}>Volver a programas</button>

      {/* Modal para crear Dispositivo */}
      {showDispositiveModal && (
        <FormDevice
          program={program}
          modal={modal}
          charge={charge}
          closeModal={closeDispositiveModal}
          handleProgramSaved={(p)=>handleProgramSaved(p)}
          enumsData={enumsData}
        />
      )}
    </div>
  );
};

export default ProgramDetails;
