import React from 'react';
import ModalForm from '../globals/ModalForm';

/**
 * Modal para editar un leavePeriod existente
 */
const LeavePeriodEdit = ({ leavePeriod, enums, onClose, onSave }) => {
  if (!leavePeriod) return null;

  // Helper para YYYY-MM-DD
  const dateToInput = (date) => {
    if (!date) return '';
    return new Date(date).toISOString().split('T')[0];
  };

  // Opciones para leaveType
  const leaveTypeOptions = (enums.leavetype || []).map((lt) => ({
    value: lt._id,
    label: lt.name,
  }));

  const fields = [
    {
      name: 'startLeaveDate',
      label: 'Fecha de Inicio',
      type: 'date',
      required: true,
      defaultValue: dateToInput(leavePeriod.startLeaveDate),
    },
    {
      name: 'expectedEndLeaveDate',
      label: 'Fecha Prevista de Fin',
      type: 'date',
      required: false,
      defaultValue: dateToInput(leavePeriod.expectedEndLeaveDate),
    },
    {
      name: 'actualEndLeaveDate',
      label: 'Fecha Real de Fin',
      type: 'date',
      required: false,
      defaultValue: dateToInput(leavePeriod.actualEndLeaveDate),
    },
    {
      name: 'leaveType',
      label: 'Tipo de Baja/Excedencia',
      type: 'select',
      required: true,
      defaultValue: leavePeriod.leaveType || '',
      options: [
        { value: '', label: 'Selecciona una opción' },
        ...leaveTypeOptions
      ],
    },
  ];

  const handleSubmit = (formData) => {
    // Creamos el leavePeriod ACTUALIZADO
    const updatedLeave = {
      ...leavePeriod,
      startLeaveDate: formData.startLeaveDate
        ? new Date(formData.startLeaveDate).toISOString()
        : null,
      expectedEndLeaveDate: formData.expectedEndLeaveDate
        ? new Date(formData.expectedEndLeaveDate).toISOString()
        : null,
      actualEndLeaveDate: formData.actualEndLeaveDate
        ? new Date(formData.actualEndLeaveDate).toISOString()
        : null,
      leaveType: formData.leaveType,
    };

    // Llamamos a onSave => el padre de este modal (LeavePeriods) => onUpdateLeavePeriod
    onSave(updatedLeave);
  };

  return (
    <ModalForm
      title="Editar Baja/Excedencia"
      message="Modifica los campos necesarios"
      fields={fields}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
};

export default LeavePeriodEdit;
