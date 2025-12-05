import React, { useEffect, useState } from 'react';
import styles from '../styles/payrollsEmployer.module.css';
import { FaSquarePlus } from 'react-icons/fa6';
import { getToken } from '../../lib/serviceToken';
import { downloadPayrollsZip, updatePayroll } from '../../lib/data';
import { useLogin } from '../../hooks/useLogin.jsx';
import PayrollList from './PayrollList.jsx';
import PayrollModalForm from './PayrollModalForm.jsx';
import PayrollSignDigital from './PayrollSignDigital.jsx';
import { sanitize } from '../../lib/utils.js';

const Payrolls = ({ user, modal, charge, listResponsability, title = true }) => {
  const { logged } = useLogin();

  const [payrolls, setPayrolls] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [signTarget, setSignTarget] = useState(null);

  const userId = user?._id;

  const closeAllModals = () => {
    setShowUploadModal(false);
    setSignTarget(null);
  };

  // Cargar nóminas al montar el componente o cuando cambie el usuario
  useEffect(() => {
    if (!userId) {
      setPayrolls([]);
      return;
    }

    let isMounted = true;

    const fetchPayrolls = async () => {
      charge(true);

      const token = getToken();
      const payload = { userId, type: 'list' };
      const data = await updatePayroll(payload, token);

      if (!isMounted) {
        charge(false);
        return;
      }

      if (!data || data.error) {
        modal(
            'Error al cargar nóminas',
            data?.message || 'No se pudieron cargar las nóminas.'
          );
        setPayrolls([]);
      } else {
        const next = Array.isArray(data.payrolls) ? data.payrolls : [];
        setPayrolls(next);
      }

      charge(false);
    };

    fetchPayrolls();

    return () => {
      isMounted = false;
    };
  }, [userId]);

  // Borrar nómina existente
  const handleDeletePayroll = async (payrollId) => {
    if (!userId || !payrollId) return;

    charge(true);

    const token = getToken();
    const payload = { userId, idPayroll: payrollId, type: 'delete' };
    const data = await updatePayroll(payload, token);

    

    if (!data || data.error) {
      charge(false);
      modal(
          'Error al borrar nómina',
          data?.message || 'No se pudo borrar la nómina.'
        );
      
      return;
    }

    const next = Array.isArray(data.payrolls) ? data.payrolls : [];
    setPayrolls(next);

    charge(false);
    modal('Borrar nómina', 'Nómina borrada con éxito.');
    
  };

  // Descargar PDF de una nómina
  const handleDownloadPayroll = async (fileId, fileName) => {
    if (!userId || !fileId) return;

    charge(true);

    const token = getToken();
    const payload = { userId, pdf: fileId, type: 'get' };
    const data = await updatePayroll(payload, token);


    if (!data || data.error || !data.url) {
      charge(false)
      modal('Error', data?.message || 'No se pudo descargar la nómina.');
      return;
    }

    const link = document.createElement('a');
    link.href = data.url;

    const safeFirst = sanitize(user?.firstName || 'Trabajador');
    const safeLast = sanitize(user?.lastName || '');
    const baseName = fileName || `${safeFirst}_${safeLast}`;
    charge(false)
    link.download = `Nomina_${baseName}.pdf`;
    link.click();
    URL.revokeObjectURL(data.url);
  };

  // Descargar todas las nóminas en un ZIP
  const handleDownloadAllPayrolls = async () => {
    if (!userId) return;

    charge(true);

    const token = getToken();
    const blob = await downloadPayrollsZip(userId, token);



    if (!blob || blob.error) {
      charge(false);
        modal(
          'Error',
          blob?.message || 'No se pudieron descargar todas las nóminas.'
        );
      
      return;
    }

    const url = URL.createObjectURL(blob);
    const safeFirst = sanitize(user?.firstName || 'Trabajador');
    const safeLast = sanitize(user?.lastName || '');
    const a = document.createElement('a');
    a.href = url;
    charge(false);
    a.download = `Nominas_${safeFirst}_${safeLast}.zip`;
    a.click();

    URL.revokeObjectURL(url);
  };

  // Abrir modal para firma de nómina
  const handleSignPayroll = (payroll) => {
    setSignTarget(payroll);
  };

  const canManage =
    logged?.user?.role === 'global' || logged?.user?.role === 'root';

  return (
    <div className={title ? styles.contenedor : styles.contenedorModuloNominas}>
      {title && (
        <h2>
          NÓMINAS
          {canManage && (
            <>
              <FaSquarePlus
                tabIndex={0}
                role="button"
                aria-label="Subir nómina"
                onKeyDown={(e) =>
                  (e.key === 'Enter' || e.key === ' ') &&
                  setShowUploadModal(true)
                }
                onClick={() => setShowUploadModal(true)}
              />
              <button
                type="button"
                className={styles.downloadAll}
                onClick={handleDownloadAllPayrolls}
              >
                Descargar todas
              </button>
            </>
          )}
        </h2>
      )}

      {showUploadModal && (
        <PayrollModalForm
          userId={userId}
          modal={modal}
          charge={charge}
          onClose={closeAllModals}
          onPayrollsChange={setPayrolls}
        />
      )}

      <PayrollList
        payrolls={payrolls}
        deletePayroll={handleDeletePayroll}
        downloadPayroll={handleDownloadPayroll}
        listResponsability={listResponsability}
        signPayroll={handleSignPayroll}
        userId={userId}
      />

      {signTarget && (
        <PayrollSignDigital
          user={user}
          docType="payroll"
          docId={signTarget.pdf}
          meta={{
            id: signTarget._id,
            year: signTarget.payrollYear,
            month: signTarget.payrollMonth,
          }}
          charge={charge}
          modal={modal}
          onClose={closeAllModals}
          onPayrollsChange={setPayrolls}
        />
      )}
    </div>
  );
};

export default Payrolls;
