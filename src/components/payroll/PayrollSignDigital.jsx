import React, { useEffect, useRef, useState } from 'react';
import ModalForm from '../globals/ModalForm.jsx';
import { getToken } from '../../lib/serviceToken';
import { confirmSignature, requestSignature } from '../../lib/data';

const PayrollSignDigital = ({
  user,
  docType,
  docId,
  meta,
  charge,
  modal,
  onClose,
  onPayrollsChange,
}) => {
  const [fileId, setFileId] = useState(null);
  const [isRequestDone, setIsRequestDone] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState(null);

  const userId = user?._id;

  // Para evitar que el efecto dispare la petición 2 veces (StrictMode) y
  // controlar cambios de docId.
  const hasRequestedRef = useRef(false);
  const lastDocIdRef = useRef(null);

  // Solicita el código de firma al abrir el modal / cambiar de nómina
  useEffect(() => {
    if (!userId || !docId) return;

    // Si cambia de nómina, reseteamos estado local y banderas
    if (lastDocIdRef.current !== docId) {
      lastDocIdRef.current = docId;
      hasRequestedRef.current = false;
      setFileId(null);
      setIsRequestDone(false);
      setErrorText(null);
    }

    // Si ya hemos lanzado la petición para este docId, no repetir
    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    const startRequest = async () => {
      if (charge) charge(true);

      const token = getToken();
      const payload = {
        userId,
        docType,
        docId,
        meta: meta || {},
      };

      const resp = await requestSignature(payload, token);

      if (charge) charge(false);

      if (!resp || resp.error) {
        if (modal) {
          modal(
            'Error al iniciar la firma',
            resp?.message ||
              'No se ha podido iniciar el proceso de firma digital.'
          );
        }
        if (onClose) onClose();
        return;
      }

      const nextFileId = resp.fileId || resp.data?.fileId;

      if (!nextFileId) {
        if (modal) {
          modal(
            'Error',
            'No se ha recibido el identificador del archivo para la firma.'
          );
        }
        if (onClose) onClose();
        return;
      }

      setFileId(nextFileId);
      setIsRequestDone(true);

      if (modal) {
        modal(
          'Código enviado',
          'Hemos enviado un código de verificación al correo asociado. Introdúcelo para completar la firma.'
        );
      }
    };

    startRequest();
  }, [userId, docId, docType, meta, charge, modal, onClose]);

  const handleSubmit = async (values) => {
    if (!userId || !fileId || isSubmitting) return;

    const code = String(values.code || '').trim();
    if (!code) {
      setErrorText('Debes introducir el código de verificación.');
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);
    if (charge) charge(true);

    const token = getToken();
    const payload = {
      userId,
      fileId,
      code,
      docType,
      meta: meta || {},
    };

    const resp = await confirmSignature(payload, token);

    setIsSubmitting(false);

    if (!resp || resp.error) {
      if (charge) charge(false);
      setErrorText(
        resp?.message || 'No se ha podido verificar el código de firma.'
      );
      return;
    }

    // Para nóminas, actualizamos lista en el padre
    if (docType === 'payroll' && typeof onPayrollsChange === 'function') {
      const nextPayrolls = resp.payrolls || resp.data?.payrolls || [];
      onPayrollsChange(nextPayrolls);
    }

    if (charge) charge(false);

    if (modal) {
      modal(
        'Firma completada',
        'La nómina se ha firmado correctamente de forma digital.'
      );
    }

    if (onClose) onClose();
  };

  return (
    <ModalForm
      title="Firma digital de nómina"
      message="Introduce el código de verificación que has recibido por correo para completar la firma digital."
      fields={[
        {
          name: 'code',
          label: 'Código de verificación',
          type: 'text',
          required: true,
        },
      ]}
      error={errorText}
      onSubmit={handleSubmit}
      onClose={onClose}
      modal={modal}
      isSubmitting={isSubmitting}
    />
  );
};

export default PayrollSignDigital;
