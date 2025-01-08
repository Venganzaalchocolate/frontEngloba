// Payrolls.jsx

import { useState } from 'react';
import styles from '../styles/payrollsEmployer.module.css';
import { FaSquarePlus } from "react-icons/fa6";

import PayrollList from './PayrollList.jsx';
import PayrollModalForm from './PayrollModalForm.jsx'; // <--- nuevo
import { getToken } from '../../lib/serviceToken.js';
import { updatePayroll } from '../../lib/data.js';

const Payrolls = ({ user, modal, charge, changeUser }) => {
  // Estado para mostrar u ocultar el modal
  const [showModal, setShowModal] = useState(false);

  // Función para cerrar el modal
  const closeModal = () => setShowModal(false);

  const deletePayroll = async (id, pdf) => {
    let datosAux = {};
    const token = getToken();
    datosAux['userId'] = user._id;
    datosAux['idPayroll'] = id;
    datosAux['type'] = 'delete';
    datosAux['pdf'] = pdf;
    const data = await updatePayroll(datosAux, token);
    if (!data.error) {
        modal('Borrar Nómina', 'Nómina borrada con éxito');
        changeUser(data)
    }
};
const downloadPayroll = async (id,namePdf) => {
    // Activar indicador de carga
    charge(true);

    const token = getToken();
    const datosAux = {
        userId: user._id,
        pdf: id,
        type: 'get'
    };

    try {
        // Obtener el archivo y su nombre desde el servidor
        const response = await updatePayroll(datosAux, token);

        const link = document.createElement('a');
        link.href = response.url;
        link.download = `Nomina_${user.firstName}_${user.lastName}_${namePdf}.pdf`;
        link.click();
        URL.revokeObjectURL(response.url);
        charge(false); // Oculta el indicador de carga
    } catch (error) {
        // Mostrar mensaje de error si no se pudo descargar
        modal('Error', 'No se ha podido encontrar el archivo, inténtelo más tarde');
    } finally {
        // Siempre ocultar el indicador de carga
        charge(false);
    }
};

  return (
    <div className={styles.contenedor}>
      <h2>
        NÓMINAS 
        <FaSquarePlus onClick={() => setShowModal(true)} />
      </h2>

      {/* Si showModal es true, mostramos el PayrollModalForm */}
      {showModal && (
        <PayrollModalForm
          user={user}
          modal={modal}
          charge={charge}
          changeUser={changeUser}
          onClose={closeModal}
        />
      )}

      {/* Lista de nóminas */}
      <PayrollList
        payrolls={user.payrolls}
        deletePayroll={deletePayroll}
        downloadPayroll={downloadPayroll}
      />
    </div>
  );
};

export default Payrolls;
