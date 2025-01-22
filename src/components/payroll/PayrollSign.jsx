// PayrollModalForm.jsx

import React from 'react';
import { getToken } from '../../lib/serviceToken';
import { updatePayroll } from '../../lib/data';
import { textErrors } from '../../lib/textErrors';
import ModalForm from '../globals/ModalForm';

export default function PayrollSign({ user, modal, changeUser, charge, onClose, payroll }) {
  console.log('PayrollSign')

  // Este callback se llamará cuando el usuario dé clic en "Aceptar" en el ModalForm
  const handlePayrollSubmit = async (formData) => {
    // `formData` contiene { payrollMonth, payrollYear, pdf } validados por ModalForm.
    // Mostrar indicador de carga
    charge(true);

    try {
      const token = getToken();
      // Prepara los datos para el endpoint
      const payload = {
        userId: user._id,
        type: 'sign',
        payrollMonth: payroll.payrollMonth,
        payrollYear: payroll.payrollYear,
        pdf: formData.pdf,
        idPayroll:payroll._id
      };

      const data = await updatePayroll(payload, token);
      if (!data.error) {
        modal('Subir nómina', 'Nómina añadida con éxito');
        changeUser(data); // Actualiza tu estado global de usuario
      } else {
        modal('Error', 'No se pudo subir la nómina.');
      }

    } catch (error) {

      modal('Error', 'Ocurrió un problema en el servidor.');
    }

    charge(false);
    onClose(); // Cierra el modal
  };

  const getPayrollFields=()=>{
    return (
        [{
            name: 'pdf',
            label: 'PDF de la Nómina',
            type: 'file',
            required: true,
            // NOTA: En tu ModalForm ya manejas la validación de PDF y tamaño (5MB o lo que el componente soporte).
            // Si requieres 10MB, podrías extenderlo en la configuración o en la lógica de ModalForm.
          }]
    )
  }

  return (
    <ModalForm
      title="Subir Nómina Firmada"
      message="Por favor, ingrese un PDF válido (máx. 5MB)."
      fields={getPayrollFields()}   // Campos de la nómina
      onSubmit={handlePayrollSubmit}
      onClose={onClose}
    />
  );
}
