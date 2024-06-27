import React, { useState } from 'react';
import ReactDOM from 'react-dom';
import styles from '../styles/modal.module.css';
import { useNavigate } from 'react-router-dom';

const Modal = ({ message }) => {
    const navigate = useNavigate();

  // Use a state variable to control modal visibility
  const [showModal, setShowModal] = useState(true);

  // Function to close the modal
  const closeModal = () => {
    navigate('/')
    setShowModal(false);
  };

 
    if(showModal) return (
        <div className={styles.modal}>
          <div className={styles.modalcontent}>
            <span className={styles.closebutton} onClick={closeModal}>&times;</span>
            <p className={styles.modalmessage}>{message}</p>
            <button onClick={()=>setShowModal(false)}>Cerrar</button>
          </div>
        </div>
)

};

export default Modal;
