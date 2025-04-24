import React, { useEffect, useState } from "react";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import styles from "../styles/ManagingPrograms.module.css";
import FormDevice from "./FormDevice";
import CronologyManager from "./CronologyManager";
import { getToken } from "../../lib/serviceToken";
import { usersName } from "../../lib/data";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";
import ListDocumentationManager from "./ListDocumentationManager";
import { useLogin } from "../../hooks/useLogin";
import DocumentMiscelaneaGeneric from "../globals/DocumentMiscelaneaGeneric.jsx";


const ProgramDetails = ({
  program,
  onEditProgram,
  onSelectDevice,
  modal,
  charge,
  enumsData,
  handleProgramSaved,
  listResponsability
}) => {
  const [showDispositiveModal, setShowDispositiveModal] = useState(false);
  const [responsibles, setResponsibles] = useState([]);
  const [showModal, setShowModal] = useState(false)

  const { logged } = useLogin();

  if (!program) return null;

  const chargeResponsibles = async (idsUsers) => {
    charge(true)
    const token = getToken();
    const users = await usersName({ ids: idsUsers }, token); // Llamada a la API
    if (users && Array.isArray(users)) {
      setResponsibles(users); // Guarda los responsables en el estado
    }
    charge(false)
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


  const groupedDevices = program.devices?.reduce((groups, device) => {
    const province = device.province;
    if (!groups[province]) {
      groups[province] = [];
    }
    groups[province].push(device);
    return groups;
  }, {});

// Función para obtener el nombre a partir del ID (puede ser de provincia o subcategoría)
const getProvinceName = (provinceId, provincesEnum) => {
  for (const province of provincesEnum) {
    // Comprobamos si el ID coincide con la provincia
    if (province._id === provinceId) {
      return province.name.trim();
    }

    // Si la provincia tiene subcategorías, las recorremos
    if (province.subcategories && province.subcategories.length > 0) {
      const subcategory = province.subcategories.find(sub => sub._id === provinceId);
      if (subcategory) {
        return subcategory.name.trim();
      }
    }
  }

  // Si no se encuentra ni en provincias ni en subcategorías, devolvemos el ID original
  return provinceId;
};

const changeDeviceAddIDProgram=(d)=>{
  d['idProgramFather']=program._id
  onSelectDevice(d)
}
 
  return (
    <div className={styles.programInfoContainer}>
      <div className={styles.containerInfo}>
        <h2>
          {program.acronym?.toUpperCase()}
          {((logged.user.role === "root" || logged.user.role === "global") || listResponsability.some(ob => ob.idProgram === program._id && ob.isProgramResponsible)) && (
          <FaEdit
            onClick={() => onEditProgram(program._id)}
            style={{ cursor: "pointer", marginLeft: "1rem" }}
          />
          )}
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
              authorized={((logged.user.role === "root" || logged.user.role === "global") || listResponsability.some(ob => ob.idProgram === program._id && ob.isProgramResponsible))}
              program={program}
              modal={modal}
              charge={charge}
              handleProgramSaved={handleProgramSaved}
            />
          </div>
        </div>
      </div>

      {((logged.user.role === "root" || logged.user.role === "global") || listResponsability.some(ob => ob.idProgram === program._id && ob.isProgramResponsible)) && (
        <DocumentMiscelaneaGeneric
          data={program}                 // p. ej. user o program
          modelName='Program'            // p. ej. "User" o "Program"
          officialDocs={(!!program.essentialDocumentationProgram && program.essentialDocumentationProgram.length>0) ? enumsData.documentation.filter((doc) =>
            program.essentialDocumentationProgram.some(
              (essentialDoc) => essentialDoc === doc._id
            )
          ):[]}         // Documentos oficiales que se deben mostrar
          modal={modal}
          charge={charge}
          onChange={(x) => handleProgramSaved(x)}
          authorized={true}
          categoryFiles={enumsData.categoryFiles}
        />
      )}



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


      <div className={styles.cajaDispositivos}>
        <h2>DISPOSITIVOS {((logged.user.role === "root" || logged.user.role === "global") || listResponsability.some(ob => ob.idProgram === program._id && ob.isProgramResponsible)) && (<FaSquarePlus onClick={() => openCreateDispositive()} />)}</h2>
        {groupedDevices && Object.keys(groupedDevices).length > 0 ? (
          Object.entries(groupedDevices).map(([provinceId, devices]) => (
            <div key={provinceId}>
              {/* Aquí usamos la función para obtener el nombre de la provincia */}
              <h5>{getProvinceName(provinceId, enumsData.provinces)}</h5>
              {devices.map((device) => (
                <div
                  key={device._id}
                  className={styles.deviceItem}
                  onClick={() =>changeDeviceAddIDProgram(device) }
                >
                  {device.name}
                  
                </div>

              ))}
            </div>
          ))
        ) : (
          <p>No hay dispositivos asociados a este programa.</p>
        )}
      </div>




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
