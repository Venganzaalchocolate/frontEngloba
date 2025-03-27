// ./HiringPeriodEdit.jsx
import React from "react";
import ModalForm from "../globals/ModalForm";

/**
 * Este componente abre un Modal con los datos del hiringPeriod
 * para que el usuario pueda modificarlo (startDate, endDate, device, etc).
 * Al hacer Submit, retorna los datos actualizados.
 */
const HiringPeriodEdit = ({ hiringPeriod, enums, onClose, onSave, infoDNI }) => {
  if (!hiringPeriod) return null;

  // Generamos las opciones a partir de enums
  const deviceOptions = [];
  if (enums?.programs) {
    enums.programs.forEach(program => {
      program.devices.forEach(device => {
        deviceOptions.push({
          value: device._id,
          label: device.name
        });
      });
    });
  }

  const positionOptions = [];
  if (enums?.jobs) {
    enums.jobs.forEach(job => {
      if (job.subcategories) {
        job.subcategories.forEach(sub => {
          positionOptions.push({
            value: sub._id,
            label: sub.name
          });
        });
      } else {
        positionOptions.push({
          value: job._id,
          label: job.name
        });
      }
    });
  }

  const buildFields = () => {
    return [
      {
        name: "startDate",
        label: "Fecha de Inicio",
        type: "date",
        required: true,
        defaultValue: hiringPeriod.startDate
          ? new Date(hiringPeriod.startDate).toISOString().split("T")[0]
          : ""
      },
      {
        name: "endDate",
        label: "Fecha de Fin",
        type: "date",
        required: false,
        defaultValue: hiringPeriod.endDate
          ? new Date(hiringPeriod.endDate).toISOString().split("T")[0]
          : ""
      },
      {
        name: "device",
        label: "Dispositivo",
        type: "select",
        required: true,
        defaultValue: hiringPeriod.device || "",
        options: [
          { value: "", label: "Seleccione un dispositivo" },
          ...deviceOptions
        ]
      },
      {
        name: "workShift.type",
        label: "Jornada",
        type: "select",
        required: true,
        defaultValue: hiringPeriod.workShift?.type || "",
        options: [
          { value: "", label: "Seleccione un tipo de jornada" },
          { value: "completa", label: "Completa" },
          { value: "parcial", label: "Parcial" },
        ]
      },
      {
        name: "position",
        label: "Puesto",
        type: "select",
        required: true,
        defaultValue: hiringPeriod.position || "",
        options: [
          { value: "", label: "Seleccione un puesto" },
          ...positionOptions
        ]
      },
      {
        name: "category",
        label: "Categoría",
        type: "text",
        required: false,
        defaultValue: hiringPeriod.category || ""
      },
      {
        name: "reason.dni",
        label: "DNI sustitución (si aplica)",
        type: "text",
        required: false,
        defaultValue: infoDNI?.dni || ""
      }
    ];
  };


  const handleSubmit = (formData) => {
    // Validaciones extras, si quieres
    // (por ejemplo, que startDate <= endDate)

    // Creamos un nuevo objeto con la info actualizada
    const updatedHiringPeriod = {
      ...hiringPeriod,
      startDate: formData.startDate ? new Date(formData.startDate).toISOString() : null,
      endDate: formData.endDate ? new Date(formData.endDate).toISOString() : null,
      device: formData.device,
      workShift: {
        ...hiringPeriod.workShift,
        type: formData["workShift.type"]
      },
      position: formData.position,
      category: formData.category,
      reason: {
        ...hiringPeriod.reason,
        dni: formData["reason.dni"]
      }
    };
    // Notificamos al padre que se guarde (API, estado, etc.)
    onSave(updatedHiringPeriod);
  };

  return (
    <ModalForm
      title="Editar Periodo de Contratación"
      message="Modifica los campos necesarios"
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
};

export default HiringPeriodEdit;
