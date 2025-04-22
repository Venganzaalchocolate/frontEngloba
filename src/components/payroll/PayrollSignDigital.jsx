import React, { useState } from 'react';
import { getToken } from '../../lib/serviceToken';
import { requestSignature, confirmSignature } from '../../lib/data';
import ModalForm from '../globals/ModalForm';

export default function PayrollSignDigital({
  user, docType, docId, meta,
  charge, changeUser, modal, onClose
}) {
  const [step, setStep]   = useState('request'); // 'request' o 'verify'
  const [fileId, setFileId] = useState(null);
  const [error, setError]   = useState(null);

  // Paso 1: solicitar el código exactamente cuando abrimos el modal
  const handleRequest = async () => {
    charge(true);
    setError(null);
    try {
      const token = getToken();
      const body = { userId: user._id, docType, docId, meta };
      const resp = await requestSignature(body, token);
      if (resp.fileId) {
        setFileId(resp.fileId);
        setStep('verify');
        modal('Código enviado', 'Revisa tu correo y escribe el código.');
      } else {
        setError('No recibimos ningún identificador.');
      }
    } catch (e) {
      setError(e.message || 'Error al solicitar el código');
    } finally {
      charge(false);
    }
  };

  // Paso 2: verificar el código
  const handleVerify = async ({ code }) => {
    charge(true);
    setError(null);
    try {
      const token = getToken();
      const payload = { userId: user._id, fileId, code };
      const resp = await confirmSignature(payload, token);
      if (resp.data) {
        modal('Éxito', 'Documento firmado correctamente');
        changeUser(resp.data.user || resp.data);
        onClose();
      } else {
        setError('No pudimos completar la firma.');
      }
    } catch (e) {
      setError(e.message || 'Error al verificar el código');
    } finally {
      charge(false);
    }
  };

  // Cuando el modal se renderiza por primera vez, disparamos la petición
  // (es un clic en el padre el que abre este componente)
  React.useEffect(() => {
    handleRequest();
  }, []); // SOLO se ejecuta una vez

  return (
    <ModalForm
      title={step === 'request' ? 'Solicitando código...' : 'Verificar código'}
      message={
        error
          ? error
          : step === 'request'
            ? 'Enviando código, espera…'
            : 'Introduce el código que recibiste por correo.'
      }
      fields={step === 'verify' ? [{ name: 'code', label: 'Código de verificación', type: 'text', required: true }] : []}
      onSubmit={step === 'verify' ? handleVerify : null}
      onClose={onClose}
      disabled={step === 'request'}
    />
  );
}
