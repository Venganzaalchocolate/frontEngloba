import React, { useEffect, useRef, useState } from "react";
import ModalForm from "../globals/ModalForm.jsx";
import { getToken } from "../../lib/serviceToken";
import { confirmSignature, requestSignature } from "../../lib/data";

const OfficialDocSignDigital = ({
  user,
  documentation,
  charge,
  modal,
  onClose,
  folderId,
  onSigned,
}) => {
  const [fileId, setFileId] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorText, setErrorText] = useState(null);

  const userId = user?._id;
  const docId = documentation?._id;

  const hasRequestedRef = useRef(false);
  const lastDocIdRef = useRef(null);

  useEffect(() => {
    if (!userId || !docId) return;

    if (lastDocIdRef.current !== docId) {
      lastDocIdRef.current = docId;
      hasRequestedRef.current = false;
      setFileId(null);
      setErrorText(null);
    }

    if (hasRequestedRef.current) return;
    hasRequestedRef.current = true;

    const startRequest = async () => {
      charge?.(true);

      const token = getToken();
      const resp = await requestSignature(
        {
          userId,
          docType: "recibi",
          docId,
          meta: {
            folderId: folderId || null,
            description: `Conforme a recibido y leído ${documentation?.name || "el documento"}.`,
          },
        },
        token
      );

      charge?.(false);

      if (!resp || resp.error) {
        modal?.(
          "Error al iniciar la firma",
          resp?.message || "No se ha podido iniciar el proceso de firma digital."
        );
        onClose?.();
        return;
      }

      const nextFileId = resp.fileId || resp.data?.fileId;
      if (!nextFileId) {
        modal?.(
          "Error",
          "No se ha recibido el identificador del archivo para la firma."
        );
        onClose?.();
        return;
      }

      setFileId(nextFileId);

      modal?.(
        "Código enviado",
        "Hemos enviado un código de verificación al correo asociado. Introdúcelo para completar la firma del recibí."
      );
    };

    startRequest();
  }, [userId, docId, documentation?.name, folderId]);

  const handleSubmit = async (values) => {
    if (!userId || !fileId || isSubmitting) return;

    const code = String(values.code || "").trim();
    if (!code) {
      setErrorText("Debes introducir el código de verificación.");
      return;
    }

    setIsSubmitting(true);
    setErrorText(null);
    charge?.(true);

    const token = getToken();
    const resp = await confirmSignature(
      {
        userId,
        fileId,
        code,
        docType: "recibi",
      },
      token
    );

    setIsSubmitting(false);
    charge?.(false);

    if (!resp || resp.error) {
      setErrorText(
        resp?.message || "No se ha podido verificar el código de firma."
      );
      return;
    }

    modal?.(
      "Firma completada",
      `El recibí de "${documentation?.name || "documento"}" se ha firmado correctamente.`
    );

    if (typeof onSigned === "function") onSigned(resp?.data || null);
    onClose();
  };

  return (
    <ModalForm
      title={`Firmar recibí: ${documentation?.name || "documento"}`}
      message="Introduce el código de verificación que has recibido por correo para completar la firma digital del recibí."
      fields={[
        {
          name: "code",
          label: "Código de verificación",
          type: "text",
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

export default OfficialDocSignDigital;