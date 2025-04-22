import React, { useState } from 'react';
import styles from '../styles/payrollsEmployer.module.css';
import { FaSquarePlus } from 'react-icons/fa6';
import { getToken } from '../../lib/serviceToken';
import { updatePayroll } from '../../lib/data';
import { useLogin } from '../../hooks/useLogin.jsx';
import PayrollList from './PayrollList.jsx';
import PayrollModalForm from './PayrollModalForm.jsx';
import PayrollSignDigital from './PayrollSignDigital.jsx';

const Payrolls = ({ user, modal, charge, changeUser, listResponsability, title = true }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [signTarget, setSignTarget] = useState(null);
  const { logged } = useLogin();

  const closeModal = () => {
    setShowUploadModal(false);
    setSignTarget(null);
  };

  // Borrar nómina existente
  const deletePayroll = async (payrollId) => {
    charge(true);
    const token = getToken();
    const payload = { userId: user._id, idPayroll:payrollId, type: 'delete' };
    const data = await updatePayroll(payload, token);
    if (!data.error) {
      modal('Borrar Nómina', 'Nómina borrada con éxito');
      changeUser(data);
    } else {
      modal('Error al borrar nómina', data.message || 'No se pudo borrar');
    }
    charge(false);
  };

  // Descargar PDF de nómina
  const downloadPayroll = async (fileId, fileName) => {
    charge(true);
    const token = getToken();
    const payload = { userId: user._id, pdf: fileId, type: 'get' };
    try {
      const resp = await updatePayroll(payload, token);
      const link = document.createElement('a');
      link.href = resp.url;
      link.download = `Nomina_${user.firstName}_${user.lastName}_${fileName}.pdf`;
      link.click();
      URL.revokeObjectURL(resp.url);
    } catch {
      modal('Error', 'No se pudo descargar la nómina.');
    } finally {
      charge(false);
    }
  };

  // Abrir modal para firma de nómina
  const signPayroll = (payroll) => setSignTarget(payroll);

  return (
    <div className={title ? styles.contenedor : styles.contenedorModuloNominas}>
      {title && (
        <h2>
          NÓMINAS <FaSquarePlus onClick={() => setShowUploadModal(true)} />
        </h2>
      )}

      {/* Modal nuevo CV */}
      {showUploadModal && (
        <PayrollModalForm
          user={user}
          modal={modal}
          charge={charge}
          changeUser={changeUser}
          onClose={closeModal}
        />
      )}

      {/* Lista de nóminas con acciones */}
      <PayrollList
        userId={user._id}
        payrolls={user.payrolls}
        deletePayroll={deletePayroll}
        downloadPayroll={downloadPayroll}
        listResponsability={listResponsability}
        signPayroll={signPayroll}
      />

      {/* Modal firma digital */}
      {signTarget && (
        <PayrollSignDigital
          user={user}
          docType="payroll"
          docId={signTarget.pdf}
          meta={{id:signTarget._id, year: signTarget.payrollYear, month: signTarget.payrollMonth }}
          charge={charge}
          changeUser={changeUser}
          modal={modal}
          onClose={closeModal}
        />
      )}
    </div>
  );
};

export default Payrolls;