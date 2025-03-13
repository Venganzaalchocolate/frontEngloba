import React, { useEffect, useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import styles from "../styles/ManagingPrograms.module.css";
import DocumentProgramMiscelanea from "./DocumentProgramMiscelanea";
import FormDevice from "./FormDevice";
import CronologyManager from "./CronologyManager";
import { getToken } from "../../lib/serviceToken";
import { usersName } from "../../lib/data";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";
import ListDocumentationManager from "./ListDocumentationManager";
import { useLogin } from "../../hooks/useLogin";
import DocumentMiscelaneaGeneric from "../globals/DocumentMiscelaneaGeneric ";

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
  const [responsibles, setResponsibles] = useState([]);
  
  const { logged } = useLogin();

  if (!program) return null;

  const chargeResponsibles = async (idsUsers) => {
    const token = getToken();
    const users = await usersName({ ids: idsUsers }, token); // Llamada a la API
    if (users && Array.isArray(users)) {
      setResponsibles(users); // Guarda los responsables en el estado
    }
  };

  useEffect(() => {
    if (program?.responsible?.length > 0) {
      chargeResponsibles(program.responsible);
    }
  }, [program]);

  // Abrir modal para crear dispositivo
  const openCreateDispositive = () => {
    setShowDispositiveModal(true);
  };

  // Cerrar modal
  const closeDispositiveModal = () => {
    setShowDispositiveModal(false);
  };

  // Ejemplo de cambio de status
  const changeStatus = (current) => {
    // Aquí podrías hacer una llamada al servidor para activar/desactivar
    // y luego, por ejemplo, recargar la información en Program.
    console.log(`Cambia status de ${current} a ${!current}`);
  };

  return (
    <div className={styles.programInfoContainer}>
      <div className={styles.containerInfo}>
        <h2>
          {program.acronym?.toUpperCase()}
          <FaEdit
            onClick={() => onEditProgram(program._id)}
            style={{ cursor: "pointer", marginLeft: "1rem" }}
          />
          {program.active ? (
            <FaCircleCheck
              onClick={() => changeStatus(true)}
              style={{ cursor: "pointer", marginLeft: "1rem" }}
            />
          ) : (
            <FaCircleXmark
              onClick={() => changeStatus(false)}
              style={{ cursor: "pointer", marginLeft: "1rem" }}
            />
          )}
        </h2>

        <div className={styles.programDetailInfo}>
          <div>
            <p>
              <span className={styles.titulines}>Nombre:</span>
              {program.name || "No disponible"}
            </p>
            <p>
              <span className={styles.titulines}>Área:</span>
              {program.area || "No disponible"}
            </p>
            {/* Descripción */}
            <p>
              <span className={styles.titulines}>Descripción:<br /></span>
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
              <span className={styles.titulines}>Objetivos:<br /></span>
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
              <span className={styles.titulines}>Perfil:<br /></span>
              {program.about?.profile
                ? program.about.profile.split("\n").map((line, idx) => (
                  <React.Fragment key={idx}>
                    {line}
                    <br />
                  </React.Fragment>
                ))
                : "No disponible"}
            </p>

            {/* Financiación */}
            {!!program.finantial && program.finantial.length > 0 ? (
              <div>
                <span className={styles.titulines}>Financiación:<br /></span>
                <ul>
                  {program.finantial.map((finId) => {
                    const finItem = enumsData?.finantial?.find(
                      (item) => item._id === finId
                    );
                    return (
                      <li key={finId}>
                        {finItem ? finItem.name : finId}
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : (
              <p>No tiene financiación</p>
            )}
          </div>

          <div>
            <div>
              <h3>Responsables del programa</h3>
              {responsibles.length > 0 ? (
                <div>
                  {responsibles.map((x) => (
                    <p key={x._id}>
                      {x.firstName} {x.lastName}
                    </p>
                  ))}
                </div>
              ) : (
                <p>No tiene Responsables</p>
              )}
            </div>

            {/* Componente CronologyManager para añadir, editar y eliminar cronología */}
            <CronologyManager
              program={program}
              modal={modal}
              charge={charge}
              handleProgramSaved={handleProgramSaved}
            />
          </div>
        </div>
      </div>

      <DocumentMiscelaneaGeneric
        data={program}                 // p. ej. user o program
        modelName='Program'            // p. ej. "User" o "Program"
        officialDocs={enumsData.documentation.filter((x)=>x._id==program.essentialDocumentationProgram)}         // Documentos oficiales que se deben mostrar
        modal={modal}
        charge={charge}
        onChange={(x) => handleProgramSaved(x)}
      />

      {(logged.user.role === "root" || logged.user.role === "global") && (
        // Componente ListDocumentationManager para gestionar la documentación esencial
        <ListDocumentationManager
          program={program}
          modal={modal}
          charge={charge}
          handleProgramSaved={handleProgramSaved}
          enumsData={enumsData}
        />
      )}

      <div>
        <h4>
          Dispositivos:
          <FaSquarePlus
            onClick={openCreateDispositive}
            style={{ cursor: "pointer", marginLeft: "0.5rem" }}
          />
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
          handleProgramSaved={handleProgramSaved}
          enumsData={enumsData}
        />
      )}
    </div>
  );
};

export default ProgramDetails;
