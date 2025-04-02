// Payrolls.jsx

import { useState } from 'react';
import styles from '../styles/payrollsEmployer.module.css';
import { FaSquarePlus } from "react-icons/fa6";

import PayrollList from './PayrollList.jsx';
import PayrollModalForm from './PayrollModalForm.jsx'; // <--- nuevo
import { getToken } from '../../lib/serviceToken.js';
import { updatePayroll } from '../../lib/data.js';
import PayrollSign from './PayrollSign.jsx';
import { useLogin } from '../../hooks/useLogin.jsx';

const Payrolls = ({ user, modal, charge, changeUser, listResponsability, title=true }) => {
  // Estado para mostrar u ocultar el modal
  const [showModal, setShowModal] = useState(false);
  const [showModalSign, setShowModalSign] = useState(false);
  const { logged } = useLogin();

  // Función para cerrar el modal
  const closeModal = () => {
    setShowModal(false);
    setShowModalSign(false);
  }

  const deletePayroll = async (idPayroll) => {
    charge(true);
    let datosAux = {};
    const token = getToken();
    datosAux['userId'] = user._id;
    datosAux['idPayroll'] = idPayroll;
    datosAux['type'] = 'delete';
    const data = await updatePayroll(datosAux, token);
    if (!data.error) {
      modal('Borrar Nómina', 'Nómina borrada con éxito');
      changeUser(data)
    } else {
      modal('Error al borrar la Nómina', 'No se ha podido borrar la nómina');
    }
    charge(false);
  };
  const downloadPayroll = async (id, namePdf) => {
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

  const signPayroll = (payroll) => {
    setShowModalSign(payroll)
  }

  return (
    <div className={(title)?styles.contenedor:styles.contenedorModuloNominas}>
      {
        title && <h2>
        NÓMINAS
        <FaSquarePlus onClick={() => setShowModal(true)} />
      </h2>
      }
      

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
        userId={user._id}
        payrolls={user.payrolls}
        deletePayroll={deletePayroll}
        downloadPayroll={downloadPayroll}
        listResponsability={listResponsability}
        signPayroll={signPayroll}
      />

      {showModalSign && (
        <PayrollSign
          user={user}
          modal={modal}
          charge={charge}
          changeUser={changeUser}
          onClose={closeModal}
          payroll={showModalSign}
        />
      )}
    </div>
  );
};

export default Payrolls;
