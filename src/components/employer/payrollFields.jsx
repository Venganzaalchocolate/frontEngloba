// payrollFields.js
import { validMonth, validYear, parseIfInteger, isNotFutureDate } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';

export const getPayrollFields = () => {
  const monthOptions = [
    { value: '0', label: 'Selecciona Mes' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' },
  ];

  // Generar años de los últimos 5 años
  const dateNow = new Date();
  const lastFiveYears = Array.from({ length: 5 }, (_, i) => dateNow.getFullYear() - i);
  const yearOptions = [{ value: '0', label: 'Selecciona Año' }].concat(
    lastFiveYears.map((year) => ({ value: String(year), label: String(year) }))
  );

  return [
    {
      name: 'payrollMonth',
      label: 'Mes',
      type: 'select',
      required: true,
      options: monthOptions,
      // Validación personalizada
      validate: (value) => {
        // Verificar que no sea 0
        if (value === '0') return textErrors('vacio');
        if (!validMonth(value)) return textErrors('payrollMonth');
        return null; // si no hay error
      }
    },
    {
      name: 'payrollYear',
      label: 'Año',
      type: 'select',
      required: true,
      options: yearOptions,
      validate: (value) => {
        // Verificar que no sea 0
        if (value === '0') return textErrors('vacio');
        if (!validYear(value)) return textErrors('payrollYear');
        return null;
      }
    },
    {
      name: 'pdf',
      label: 'PDF de la Nómina',
      type: 'file',
      required: true,
      // NOTA: En tu ModalForm ya manejas la validación de PDF y tamaño (5MB o lo que el componente soporte).
      // Si requieres 10MB, podrías extenderlo en la configuración o en la lógica de ModalForm.
    }
  ];
};
