import { useEffect, useState } from 'react';
import styles from '../styles/responsability.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt, FaEdit, FaSave } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import { updateDispositive } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';
import ModalConfirmation from '../globals/ModalConfirmation';

const Responsability = ({ user, modal, charge, changeUser, enumsData, chargeEnums }) => {
  const [listDispositive, setListDispositive] = useState([])
  const [openModal, setOpenModal] = useState(false)
  // =========== CONFIRMACIÓN MODAL ===========
  const [showConfirmModal, setShowConfirmModal] = useState(false);

const handleDelete = () => {
  setShowConfirmModal(true);
};

const onConfirm = () => {
  //FUNCION QUE LLAMA A LA BBDD Y REALIZA EL DELETE
  deleteDispositiveResponsable(showConfirmModal)
  setShowConfirmModal(false);
};

const onCancel = () => {
  // Cancelar la acción
  setShowConfirmModal(false);
};
  // ============================================

  const deleteDispositiveResponsable=async(idDispositive)=>{try {
    // Muestra el loader
    charge(true);
    const dataAux=listDispositive.filter((dispositive)=>dispositive._id==idDispositive)[0]

    const programId=dataAux.programId
    const dispositiveId=dataAux._id
    // Construimos el objeto "User" con el primer "hiringPeriod"
    const updateDispositiveData = {
      programId,
      dispositiveId,
      responsible: 'delete',   // ObjectId (Device)
    };


    const token = getToken();
    // Llamar a tu API para guardar en DB
    const result = await updateDispositive(updateDispositiveData, token);

    if (result.error) {
      modal("Error", result.message || "No se pudo eliminar el responsable del dispositivo");
    } else {
      modal("Responsable Añadido", "El usuario ya no es responsable del dispositivo");
      chargeEnums();
      closeModal();
    }
  } catch (error) {
    modal("Error", error.message || "Ocurrió un error al eliminar el responsable del dispositivo");
    closeModal();
  } finally {
    charge(false);
  }
};

  const buildFields = () => {

    // Construimos las opciones de "device" a partir de enumsData.programs
    // 1. Tomamos todos los devices de cada program
    // 2. Creamos un array de { value: device._id, label: device.name }
    let deviceOptions = [];
    if (enumsData?.programs) {
      deviceOptions = enumsData.programs.flatMap(program =>
        program.devices.map(device => ({
          value:  `${program._id}-${device._id}`,
          label: device.name
        }))
      );
    }


    return [
      // =========== DATOS DEL USUARIO ===========
      {
        name: "device",
        label: "Dispositivo",
        type: "select",
        required: true,
        options: [
          { value: "", label: "Seleccione una opción" },
          ...deviceOptions], // a partir de enumsData.programs
      }
    ];
  };


  const responsabilityFor = () => {

    const programs = enumsData.programsIndex
    let listDispositiveAux = []
    for (const idDispositive in programs) {

      if (!!programs[idDispositive].responsible) {
        programs[idDispositive].responsible.map((idPerson) => {
          if (idPerson == user._id) {
            listDispositiveAux.push(programs[idDispositive])
          }
        })
      }
    }
    setListDispositive(listDispositiveAux)
  }

  useEffect(() => {
    responsabilityFor();
    console.log(enumsData)
  }, [enumsData])

  const fields = buildFields();

  const addDispositive = () => {
    return <ModalForm
      title="Añadir Dispositivo"
      message="Seleccione un dispositivo el cual es responsable"
      fields={fields}
      onSubmit={handleSubmit}
      onClose={closeModal}
    />
  }

  const closeModal = () => {
    setOpenModal(false)
  }

  const handleSubmit = async (formData) => {
    try {
      // Muestra el loader
      charge(true);
      const programId=formData.device.split('-')[0]
      const dispositiveId=formData.device.split('-')[1]
      // Construimos el objeto "User" con el primer "hiringPeriod"
      const newDispositive = {
        programId,
        dispositiveId,
        responsible: user._id,   // ObjectId (Device)
      };

      console.log(newDispositive)
      const token = getToken();
      // Llamar a tu API para guardar en DB
      const result = await updateDispositive(newDispositive, token);
      // const result=''
      if (result.error) {
        modal("Error", result.message || "No se pudo añadir el dispositivo");
      } else {
        modal("Responsable Añadido", "El usuario es responsable de un nuevo dispositivo");
        chargeEnums();
        closeModal();
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al añadir el dispositivo");
      closeModal();
    } finally {
      charge(false);
    }
  };

  const modalConfirmation=()=>{
    const dataAux=listDispositive.filter((dispositive)=>dispositive._id==showConfirmModal)[0]
    const messageAux=`¿Estás seguro de que deseas que ${user.firstName} ${user.lastName} deje de ser responsable de ${dataAux.name}?`
    return (
      <ModalConfirmation
        title="Eliminar responsable"
        message={messageAux}
        onConfirm={onConfirm}
        onCancel={onCancel}
      />
    )
  }


  return (
    <>
      <div className={styles.contenedor}>

        <h2>Responsable {<FaSquarePlus onClick={() => setOpenModal(true)} />}</h2>
        <div className={styles.contenedorBotones}>
          {(listDispositive.length > 0)
            ? <ul>
              {listDispositive.map((x) => {
                return <li className={styles.dispositivos}><p>{x.name}</p><span><FaTrashAlt onClick={()=>setShowConfirmModal(x._id)}/></span></li>
              })}
            </ul>

            : <p>No es responsable de ningún dispositivo</p>
          }

        </div>
      </div>
      {!!openModal && addDispositive()}
      {showConfirmModal && modalConfirmation()}

    </>


  );
}

export default Responsability;