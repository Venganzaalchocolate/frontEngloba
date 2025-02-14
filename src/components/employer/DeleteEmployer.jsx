import React, { useState } from "react";
import { FaTrashAlt } from "react-icons/fa";

import styles from "../styles/DeleteEmployer.module.css"
import ModalConfirmation from "../globals/ModalConfirmation";
import { getToken } from "../../lib/serviceToken";
import { deleteEmployer } from "../../lib/data";

const DeleteEmployer = ({ user, modal, charge, chargeUser}) => {
  const [showModal, setShowModal] = useState(false);

  // Abre el modal
  const openModal = () => {
    setShowModal(true);
  };

  // Lógica cuando el usuario confirma la eliminación
  const handleConfirm = async () => {
    charge(true)

    // Aquí puedes realizar la lógica para eliminar el usuario
    // Por ejemplo, llamar a tu API o a una función que maneje la eliminación

      // Llamamos a la función recibida por props (o puedes incluir aquí un fetch/axios para tu API)
      const id=user._id;
      const token =getToken();
      const response=await deleteEmployer(token, {id});
      
      if(!response.error && response.deletedCount>0){
        charge(false)
        modal('Trabajador Elminado', `${user.firstName} ${user.lastName} Eliminado con éxito`)
        chargeUser();
      } else{
        charge(false)
        modal('Error', `No se ha podido eliminar a ${user.firstName} ${user.lastName}`)
      }
    

    // Cerramos el modal
    setShowModal(false);
    
  };

  // Lógica cuando el usuario cancela la eliminación
  const handleCancel = () => {
    setShowModal(false);
  };

  return (
    <div style={{ display: "inline-block" }}>
      <FaTrashAlt className={styles.iconDelete} onClick={openModal} style={{ cursor: "pointer" }} />
      
      {/* Si showModal es true, mostramos el modal de confirmación */}
      {showModal && (
        <ModalConfirmation
          title="Eliminar trabajador"
          message={`¿Estás seguro de que quieres eliminar a ${user.firstName} ${user.lastName}?`}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
};

export default DeleteEmployer;

