import React from 'react';
import ModalForm from '../globals/ModalForm.jsx';
import { getPayrollFields } from './payrollFields.jsx';
import { getToken } from '../../lib/serviceToken';
import { updatePayroll } from '../../lib/data';

const PayrollModalForm = ({
  userId,
  modal,
  charge,
  onClose,
  onPayrollsChange,
}) => {
  const fields = getPayrollFields();

  const handleSubmit = async (formValues) => {
    if (!userId) {
      modal('Error', 'No se ha encontrado el usuario.');
      return;
    }

    const { payrollYear, payrollMonth, file } = formValues;

    const yearNum = Number(payrollYear);
    const monthNum = Number(payrollMonth);

    if (
      !Number.isInteger(yearNum) ||
      !Number.isInteger(monthNum) ||
      monthNum < 1 ||
      monthNum > 12
    ) {
      modal('Error', 'Mes o año de nómina no válidos.');
      return;
    }

    const now = new Date();
    const payrollDate = new Date(yearNum, monthNum - 1, 1);
    if (payrollDate > now) {
      modal('Error', 'No puedes subir nóminas de meses futuros.');
      return;
    }

    if (!file) {
      modal('Error', 'Debes adjuntar un archivo PDF.');
      return;
    }

    charge(true);

    const token = getToken();
    const payload = {
      userId,
      type: 'create',
      payrollYear: yearNum,
      payrollMonth: monthNum,
      pdf: file ,
    };

    const data = await updatePayroll(payload, token);


    if (!data || data.error) {
      charge(false)
        modal(
          'Error al subir nómina',
          data?.message || 'No se ha podido subir la nómina.'
        );
      return;
    }

    if (typeof onPayrollsChange === 'function') {
      const next = Array.isArray(data.payrolls) ? data.payrolls : [];
      onPayrollsChange(next);
    }


      charge(false)
      modal('Nómina subida', 'La nómina se ha subido correctamente.');
    

    if (onClose) onClose();
  };

  return (
    <ModalForm
      title="Subir nómina"
      message="Selecciona el mes, el año y el archivo PDF de la nómina."
      fields={fields}
      onSubmit={handleSubmit}
      onClose={onClose}
      modal={modal}
    />
  );
};

export default PayrollModalForm;
