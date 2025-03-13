import React, { useEffect, useState } from "react";
import { FaEdit } from "react-icons/fa";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";
import DocumentMiscelaneaGeneric from "../globals/DocumentMiscelaneaGeneric ";
import styles from "../styles/ManagingPrograms.module.css";
import { getToken } from "../../lib/serviceToken";
import { usersName } from "../../lib/data";

const DeviceDetails = ({
  device,
  program,           // Información del programa padre
  enumsData,
  modal,
  charge,
  onClose,
  handleProgramSaved,
  onEditDevice,      // Callback para editar el dispositivo
  onChangeStatus,    // Opcional para cambiar el estado
}) => {
  if (!device) return null;

  const [responsibles, setResponsibles] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [provinceName, setProvinceName] = useState("No disponible");

  useEffect(() => {
    // Cargar responsables (IDs a objetos con nombres)
    if (device.responsible && device.responsible.length > 0) {
      const loadResponsibles = async () => {
        try {
          const token = getToken();
          const users = await usersName({ ids: device.responsible }, token);
          if (users && Array.isArray(users)) {
            setResponsibles(users);
          }
        } catch (error) {
          console.error("Error cargando responsables:", error);
        }
      };
      loadResponsibles();
    }

    // Cargar coordinadores
    if (device.coordinators && device.coordinators.length > 0) {
      const loadCoordinators = async () => {
        try {
          const token = getToken();
          const users = await usersName({ ids: device.coordinators }, token);
          if (users && Array.isArray(users)) {
            setCoordinators(users);
          }
        } catch (error) {
          console.error("Error cargando coordinadores:", error);
        }
      };
      loadCoordinators();
    }

    // Buscar la provincia usando el id de device.province y los datos de enumsData.provinces
    if (device.province && enumsData && enumsData.provinces) {
      const foundProvince = enumsData.provinces.find(
        (p) => p._id === device.province
      );
      setProvinceName(foundProvince ? foundProvince.name : "No disponible");
    } else {
      setProvinceName("No disponible");
    }
  }, [device, enumsData]);

  // Función para disparar la edición: se llama al callback pasando el objeto completo
  const handleEdit = () => {
    if (onEditDevice) onEditDevice(device);
  };

  // Función para cambiar el estado del dispositivo
  const changeStatus = (current) => {
    if (onChangeStatus) {
      onChangeStatus(device, !current);
    }
  };

  return (
    <div className={styles.programInfoContainer}>
      <div className={styles.containerInfo}>
        <h2>
          {device.name || "Nombre del Dispositivo"}
          {"  "}
          <FaEdit
            onClick={handleEdit}
            style={{ cursor: "pointer", marginLeft: "1rem" }}
          />
          {device.active ? (
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
              <span className={styles.titulines}>Email: </span>
              {device.email || "No disponible"}
            </p>
            <p>
              <span className={styles.titulines}>Dirección: </span>
              {device.address || "No disponible"}
            </p>
            <p>
              <span className={styles.titulines}>Teléfono: </span>
              {device.phone || "No disponible"}
            </p>
            <p>
              <span className={styles.titulines}>Provincia: </span>
              {provinceName}
            </p>
          </div>

          <div>
            <h3>Responsables</h3>
            {responsibles.length > 0 ? (
              responsibles.map((r) => (
                <p key={r._id}>
                  {r.firstName} {r.lastName}
                </p>
              ))
            ) : (
              <p>No hay responsables asignados</p>
            )}

            <h4>Coordinadores</h4>
            {coordinators.length > 0 ? (
              coordinators.map((c) => (
                <p key={c._id}>
                  {c.firstName} {c.lastName}
                </p>
              ))
            ) : (
              <p>No hay coordinadores asignados</p>
            )}
          </div>
        </div>
      </div>

      <DocumentMiscelaneaGeneric
        data={device}
        modelName="Device"
        parentId={program._id}  // <-- Agregar el parentId para dispositivos
        officialDocs={enumsData.documentation.filter((doc) =>
          program?.essentialDocumentationDevice?.includes(doc._id)
        )}
        modal={modal}
        charge={charge}
        onChange={(updatedDevice) => {
          if (handleProgramSaved) {
            handleProgramSaved(updatedDevice);
          }
        }}
      />

      <button onClick={onClose} className={styles.backButton}>
        Volver
      </button>
    </div>
  );
};

export default DeviceDetails;
