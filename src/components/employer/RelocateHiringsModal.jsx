// src/components/employer/RelocateHiringsModal.jsx
import React, { useMemo, useState } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { relocateHirings } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { buildOptionsFromIndex } from "../../lib/utils";

const RelocateHiringsModal = ({ modal, charge, close, enumsData, onSuccess = () => {}, resetFilters}) => {
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  const dispositiveOptions = useMemo(() => {
    if (!enumsData?.dispositiveIndex) return [];
    // reaprovechamos tu helper para mantener el mismo estilo
    const base = buildOptionsFromIndex(enumsData.dispositiveIndex);
    return [{ value: "", label: "Seleccione" }, ...base];
  }, [enumsData]);

  const fields = useMemo(
    () => [
      {
        name: "originDispositiveId",
        label: "Dispositivo origen",
        type: "select",
        required: true,
        options: dispositiveOptions,
      },
      {
        name: "targetDispositiveId",
        label: "Dispositivo destino",
        type: "select",
        required: true,
        options: dispositiveOptions,
      },
      {
        name: "startDateNewPeriod",
        label: "Fecha inicio nuevo periodo",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().slice(0, 10),
      },
    ],
    [dispositiveOptions]
  );

  const handleSubmit = (formData) => {
    if (formData.originDispositiveId === formData.targetDispositiveId) {
      modal("Aviso", "El origen y el destino no pueden ser el mismo dispositivo.");
      return;
    }
    setPendingFormData(formData);
    setShowConfirmation(true);
  };

  const runRelocate = async (formData) => {
    try {
      charge(true);
      const token = getToken();
      const res = await relocateHirings( token, formData);
      modal(
        "Reubicación completada",
        `Se han movido ${res?.moved || 0} empleados del dispositivo de origen al destino.`
      );

      onSuccess();
      resetFilters();
      close();
    } catch (e) {
      modal("Error", e?.message || "Ocurrió un error al reubicar el personal.");
    } finally {
      charge(false);
      setShowConfirmation(false);
      setPendingFormData(null);
    }
  };

  const handleConfirm = () => {
    if (!pendingFormData) {
      setShowConfirmation(false);
      return;
    }
    runRelocate(pendingFormData);
  };

  const handleCancelConfirm = () => {
    setShowConfirmation(false);
    setPendingFormData(null);
  };

  return (
    <>
      {showConfirmation && (
        <ModalConfirmation
          title="Confirmar reubicación"
          message="¿Seguro que quieres reubicar al personal con periodos abiertos desde el dispositivo origen al dispositivo destino seleccionado?"
          onConfirm={handleConfirm}
          onCancel={handleCancelConfirm}
        />
      )}

      <ModalForm
        title="Reubicar personal"
        message="Seleccione dispositivo de origen, dispositivo de destino y la fecha de inicio en el nuevo dispositivo. Se moverán todos los periodos abiertos."
        fields={fields}
        onSubmit={handleSubmit}
        onClose={close}
        modal={modal}
      />
    </>
  );
};

export default RelocateHiringsModal;
