import React, { useMemo } from 'react';
import ModalForm from '../globals/ModalForm';
import { validateDNIorNIE } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';

/* Utilidades */
const todayStr = () => new Date().toISOString().slice(0, 10);


const RehireEmployee=({
  enumsEmployer,
  save,
  onClose,
  offer,
  lockedFields = ["device", "position"],
  modal
})=>{

  // ViewModel derivado de props (sin estados intermedios)
const vm = useMemo(() => {
  if (!enumsEmployer || !offer) return null;

  // usa el nuevo id y cae al legacy si hace falta
  const deviceId = offer?.dispositive?.newDispositiveId;
  const device = enumsEmployer?.dispositiveIndex[deviceId];
  const deviceLabel = device?.name || "";
  const jobId = offer?.jobId || "";
  const jobName = enumsEmployer?.jobsIndex[jobId]?.name || "";

  return {
    deviceId,
    deviceLabel: deviceLabel || "(Dispositivo)",
    positionId: jobId,
    positionLabel: jobName || "(Puesto)",
  };
}, [enumsEmployer, offer]);

  const fields = useMemo(() => {
    if (!vm) return [];
    return [
      { name: "startDate", label: "Fecha Inicio", type: "date", required: true, defaultValue: todayStr() },
      { name: "deviceText", label: "Dispositivo", type: "text", defaultValue: vm.deviceLabel, readOnly: true, disabled: true },
      {
        name: "workShift", label: "Jornada", type: "select", required: true,
        disabled: lockedFields.includes("workShift"),
        options: [
          { value: "", label: "Seleccione" },
          { value: "completa", label: "Completa" },
          { value: "parcial", label: "Parcial" },
        ],
      },
      { name: "positionText", label: "Cargo (puesto)", type: "text", defaultValue: vm.positionLabel, readOnly: true, disabled: true },
      {
        name: "reason",
        label: "DNI trabajador sustituido (si aplica)",
        type: "text",
        isValid: (v) => (v ? (validateDNIorNIE(v) ? "" : textErrors("dni")) : ""),
      },
    ];
  }, [vm, lockedFields]);

  const handleSubmit = async (formData) => {
    if (!vm?.positionId) {
      if (typeof window !== "undefined" && window.alert) {
        window.alert("No se ha podido resolver el puesto");
      }
      return;
    }

    // Soporta tanto formData.reason (string) como formData.reason['reason.dni'] (formas antiguas del ModalForm)
    const reasonDni =
      (formData?.reason && typeof formData.reason === "object" && formData.reason["reason.dni"]) ||
      (typeof formData?.reason === "string" ? formData.reason : "");

    const hiringNew = {
      startDate: formData.startDate,
      dispositiveId: vm.deviceId, // id real al back (nuevo o fallback legacy)
      workShift: { type: formData.workShift, nota: "" },
      position: vm.positionId, // id real al back
      active: true,
      reason: reasonDni ? { dni: reasonDni } : undefined,
    };

    await save(hiringNew);
    onClose();
  };

  if (!vm || !fields.length) return null;

  return (
    <ModalForm
      title="Añadir Periodo de Contratación"
      message="Completa los siguientes campos"
      fields={fields}
      onSubmit={handleSubmit}
      onClose={onClose}
      modal={modal}
    />
  );
}

export default RehireEmployee;