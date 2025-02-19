import React from "react";
import { FaEdit } from "react-icons/fa";
import styles from "../styles/ManagingPrograms.module.css";
import DocumentProgramMiscelanea from "./DocumentProgramMiscelanea";

/**
 * ProgramDetails
 * --------------
 * Muestra la información de un programa y la lista de dispositivos.
 * Recibe:
 * - program: el programa seleccionado
 * - onClose: callback para volver a la lista de programas
 * - onEditProgram: callback para iniciar la edición
 * - onSelectDevice: callback para cuando se selecciona un dispositivo
 */
const ProgramDetails = ({ program, onClose, onEditProgram, onSelectDevice, modal, charge }) => {
  if (!program) return null;

  return (
    <div className={styles.programInfoContainer}>
      <div>
              <h3>
        {program.acronym.toUpperCase()}{" "}
        <FaEdit onClick={() => onEditProgram(program._id)} style={{ cursor: "pointer" }} />
      </h3>
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

      {/* Dispositivos */}
      <DocumentProgramMiscelanea
        program={program}
        modal={modal}
        charge={charge}
        changeProgram={()=>{}}
      />
      <div>
        <h4>Dispositivos:</h4>
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
    </div>
  );
};

export default ProgramDetails;
