// Configuración de campos para el formulario de nóminas

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

export const getPayrollFields = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const years = [];
  for (let y = currentYear + 1; y >= currentYear - 5; y -= 1) {
    years.push({ value: y, label: String(y) });
  }

  return [
    {
      name: 'payrollYear',
      label: 'Año',
      type: 'select',
      required: true,
      defaultValue: currentYear,
      options: years,
    },
    {
      name: 'payrollMonth',
      label: 'Mes',
      type: 'select',
      required: true,
      defaultValue: currentMonth,
      options: MONTHS,
    },
    {
      name: 'file',
      label: 'Archivo PDF',
      type: 'file',
      required: true,
      accept: 'application/pdf',
    },
  ];
};
