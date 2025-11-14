import React, { useState } from 'react';
import styles from '../styles/payrollsEmployer.module.css';
import { FaSquarePlus } from 'react-icons/fa6';
import { getToken } from '../../lib/serviceToken';
import { downloadPayrollsZip, updatePayroll } from '../../lib/data';
import { useLogin } from '../../hooks/useLogin.jsx';
import PayrollList from './PayrollList.jsx';
import PayrollModalForm from './PayrollModalForm.jsx';
import PayrollSignDigital from './PayrollSignDigital.jsx';
import { sanitize } from '../../lib/utils.js';
import ModalConfirmation from '../globals/ModalConfirmation.jsx';
import { useEffect } from "react";

const Payrolls = ({ user, modal, charge, changeUser, listResponsability, title = true }) => {
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [signTarget, setSignTarget] = useState(null);
  const { logged } = useLogin();
  const [showZipModal, setShowZipModal] = useState(false);
  const [zipAbortController, setZipAbortController] = useState(null);


  const closeModal = () => {
    setShowUploadModal(false);
    setSignTarget(null);
  };

  // Cuando se active el modal → iniciar generador ZIP automáticamente
useEffect(() => {
  if (showZipModal) {
    startZipDownload();
  }
}, [showZipModal]);


  // Borrar nómina existente
  const deletePayroll = async (payrollId) => {
    charge(true);
    const token = getToken();
    const payload = { userId: user._id, idPayroll: payrollId, type: 'delete' };
    const data = await updatePayroll(payload, token);
    if (!data.error) {
      modal('Borrar Nómina', 'Nómina borrada con éxito');
      changeUser(data);
    } else {
      modal('Error al borrar nómina', data.message || 'No se pudo borrar');
    }
    charge(false);
  };

  const handleDownloadAllPayrolls = async () => {
    const token = getToken();
    const controller = new AbortController();
    const signal = controller.signal;

    // Mostrar modal mientras se genera el ZIP
    modal(
      "Generando ZIP...",
      "Por favor espera mientras se preparan todas las nóminas.",
      {
        confirmText: "Cancelar",
        onConfirm: () => controller.abort(),
        isLoading: true,
      }
    );

    try {

      const blob = await downloadPayrollsZip(user._id, token, signal);

      if (blob.error) throw new Error(blob.message);

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");
      a.href = url;


      const nameZip =
        `Nominas_${sanitize(user.firstName)}_${sanitize(user.lastName)}.zip`;

      a.download = nameZip;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      if (e.name === "AbortError") {
        modal("Cancelado", "La descarga ha sido cancelada.");
      } else {
        modal("Error", "No se pudieron descargar todas las nóminas.");
      }
    }
  };

  const cancelZipGeneration = () => {
    if (zipAbortController) {
      zipAbortController.abort();
    }
  };

  const startZipDownload = async () => {
    const controller = new AbortController();
    setZipAbortController(controller);


    const token = getToken();

    try {
      const blob = await downloadPayrollsZip(
        user._id,
        token,
        controller.signal
      );

      if (blob.error) throw new Error(blob.message);

      const url = URL.createObjectURL(blob);

      const nameZip = `Nominas_${sanitize(user.firstName)}_${sanitize(
        user.lastName
      )}.zip`;

      const a = document.createElement("a");
      a.href = url;
      a.download = nameZip;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err.name === "AbortError") {
        modal("Cancelado", "Descarga cancelada por el usuario.");
      } else {
        modal("Error", "No se pudieron descargar todas las nóminas.");
      }
    } finally {
      setShowZipModal(false);
      setZipAbortController(null);
    }
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
          NÓMINAS
          {(logged.user.role == 'global' || logged.user.role == 'root') && (
            <>
              <FaSquarePlus
                tabIndex={0}
                role="button"
                aria-label="Subir nómina"
                onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setShowUploadModal(true)}
                onClick={() => setShowUploadModal(true)}
              />

              {/* NUEVO → Descargar todas */}
              <button
                className={styles.downloadAll}
                onClick={() => setShowZipModal(true)}
              >
                Descargar todas
              </button>
            </>
          )}
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
          meta={{ id: signTarget._id, year: signTarget.payrollYear, month: signTarget.payrollMonth }}
          charge={charge}
          changeUser={changeUser}
          modal={modal}
          onClose={closeModal}
        />
      )}

      {showZipModal && (
        <ModalConfirmation
          title="Generando ZIP..."
          message="Por favor espera mientras se preparan los documentos. Esto puede tardar unos minutos."
          textConfirm="Cancelar"
          onConfirm={cancelZipGeneration}
          deleteCancel={true}   // solo botón 'Cancelar'
        />
      )}
    </div>
  );
};

export default Payrolls;