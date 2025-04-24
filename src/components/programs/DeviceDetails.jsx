import React, { useEffect, useState } from "react";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";
import DocumentMiscelaneaGeneric from "../globals/DocumentMiscelaneaGeneric.jsx";
import styles from "../styles/ManagingPrograms.module.css";
import { getToken } from "../../lib/serviceToken";
import { deleteDispositive, usersName } from "../../lib/data";
import { useLogin } from "../../hooks/useLogin";
import ModalConfirmation from "../globals/ModalConfirmation.jsx";

const DeviceDetails = ({
  device,
  program,           // Información del programa padre
  enumsData,
  modal,
  charge,
  handleProgramSaved,
  onEditDevice,      // Callback para editar el dispositivo
  onChangeStatus,    // Opcional para cambiar el estado
  listResponsability,
  close
}) => {
  if (!device) return null;

  const [responsibles, setResponsibles] = useState([]);
  const [coordinators, setCoordinators] = useState([]);
  const [provinceName, setProvinceName] = useState("No disponible");
  const [showModal, setShowModal] = useState(false)
  const { logged } = useLogin();


  const loadResponsibles = async () => {
    charge(true)
    if (device.responsible && device.responsible.length > 0) {
      const token = getToken();
      const users = await usersName({ ids: device.responsible }, token);
      if (users && Array.isArray(users)) {
        setResponsibles(users);
      }

    };
    charge(false)
  }

  useEffect(() => {
    // Cargar responsables (IDs a objetos con nombres)
    loadResponsibles();
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

  const handleConfirm = async () => {
    setShowModal(false)
    charge(true)
    const token = getToken();
    const updateProgram = await deleteDispositive({ programId: program._id, dispositiveId: device._id }, token)
    if (!updateProgram.error) {
      handleProgramSaved(updateProgram);
      modal('Dispositivo Borrado', `Dispositivo ${device.name} borrado con éxito`)
      close();
    } else {
      modal('Dispositivo No Borrado', `El dispositivo ${device.name} no se ha podido borrar`)
    }
    charge(false)
  }

  const handleCancel = () => {
    setShowModal(false)
  }

  return (
    <div className={styles.programInfoContainer}>
      <div className={styles.containerInfo}>
        <h2>
          {device.name || "Nombre del Dispositivo"}
          {console.log(listResponsability)}
          {console.log(device)}
          {(logged.user.role === "root" || logged.user.role === "global") ||
            listResponsability.some(ob =>
              (ob.dispositiveId === device._id && (ob.isDeviceCoordinator || ob.isDeviceResponsible)) ||
              (String(ob.idProgram) === String(device.idProgramFather))
            )
            && (
              <FaEdit
                onClick={handleEdit}
                style={{ cursor: "pointer", marginLeft: "1rem" }}
              />
            )}
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
          {(logged.user.role === "root" || logged.user.role === "global") ||
            listResponsability.some(ob =>
              (ob.dispositiveId === device._id && (ob.isDeviceCoordinator || ob.isDeviceResponsible)) ||
              (String(ob.idProgram) === String(device.idProgramFather))
            )
            &&
          <FaTrashAlt onClick={() => setShowModal(true)} />}
          {showModal && (
            <ModalConfirmation
              title="Eliminar Dispositivo"
              message={(responsibles.length > 0)
                ? `¿Estás seguro de que quieres eliminar  el dispositivo ${device.name}? Tenga en cuenta que tiene responsables asociados a él`
                : (coordinators.length > 0)
                  ? `¿Estás seguro de que quieres eliminar  el dispositivo ${device.name}? Tenga en cuenta que tiene coordinadores asociados a él`
                  : `¿Estás seguro de que quieres eliminar  el dispositivo ${device.name}?`}
              onConfirm={handleConfirm}
              onCancel={handleCancel}
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

      {((logged.user.role === "root" || logged.user.role === "global") || listResponsability.some(ob => ob.dispositiveId === device._id && (ob.isDeviceCoordinator || ob.isDeviceResponsible))) && (
        <DocumentMiscelaneaGeneric
          categoryFiles={enumsData.categoryFiles}
          data={device}
          modelName="Device"
          parentId={program._id}  // <-- Agregar el parentId para dispositivos
          officialDocs={enumsData.documentation.filter((doc) =>
            program?.essentialDocumentationDevice?.includes(doc._id)
          )}
          modal={modal}
          charge={charge}
          authorized={true}
          onChange={(updatedDevice) => {
            if (handleProgramSaved) {
              handleProgramSaved(updatedDevice);
            }
          }}
        />
      )}

    </div>
  );
};

export default DeviceDetails;
