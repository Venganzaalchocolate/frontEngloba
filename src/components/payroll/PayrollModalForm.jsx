// PayrollModalForm.jsx

import React from 'react';

import { getPayrollFields } from './payrollFields';
import { getToken } from '../../lib/serviceToken';
import { updatePayroll } from '../../lib/data';
import { parseIfInteger, isNotFutureDate } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';
import ModalForm from '../globals/ModalForm';

export default function PayrollModalForm({ user, modal, changeUser, charge, onClose }) {

  // Este callback se llamará cuando el usuario dé clic en "Aceptar" en el ModalForm
  const handlePayrollSubmit = async (formData) => {
    // `formData` contiene { payrollMonth, payrollYear, pdf } validados por ModalForm.
    
    // Validar si la fecha no es futura
    const month = parseIfInteger(formData.payrollMonth);
    const year = parseIfInteger(formData.payrollYear);
    if (!isNotFutureDate(month, year)) {
      modal('Error', textErrors('futureDate'));
      return;
    }

    // Mostrar indicador de carga
    charge(true);

    try {
      const token = getToken();
      // Prepara los datos para el endpoint
      const payload = {
        userId: user._id,
        type: 'create',
        payrollMonth: month,
        payrollYear: year,
        pdf: formData.pdf,
      };

      const data = await updatePayroll(payload, token);
      if (!data.error) {
        modal('Subir nómina', 'Nómina añadida con éxito');
        changeUser(data); // Actualiza tu estado global de usuario
      } else {
        modal('Error', 'No se pudo subir la nómina.');
      }
    } catch (error) {
      console.log(error)
      modal('Error', 'Ocurrió un problema en el servidor.');
    }

    charge(false);
    onClose(); // Cierra el modal
  };

  return (
    <ModalForm
      title="Subir Nómina"
      message="Por favor, ingrese Mes, Año y un PDF válido (máx. 5MB)."
      fields={getPayrollFields()}   // Campos de la nómina
      onSubmit={handlePayrollSubmit}
      onClose={onClose}
    />
  );
}
