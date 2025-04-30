// components/ManagingAuditors.jsx
import { useEffect, useState } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
import { auditInfoProgram, auditInfoUser } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';

import OptionSelector from './OptionSelector';
import InfoAuditPanelEmployee from './InfoAuditPanelEmployee';
import PlaceholderPanel from './PlaceholderPanel';
import InfoAuditPanelProgramDevice from './InfoAuditPanelProgramDevice';

export const OPTIONAL_FIELDS_INFO_EMPLOYEE = [
  { value: 'birthday', label: 'Fecha de nacimiento' },
  { value: 'socialSecurityNumber', label: 'Número de Seguridad Social' },
  { value: 'bankAccountNumber', label: 'Número de cuenta bancaria' },
  { value: 'consetmentDataProtection', label: 'Consentimiento de Protección de Datos' },
  { value: 'studies', label: 'Estudios' }
];

const ManagingAuditors = ({ modal, charge, listResponsability, enumsData }) => {
  // preseleccionamos Trabajadores → Info
  const [type, setType] = useState('employer');
  const [subOption, setSubOption] = useState('info');

  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

    // Trabajadores
  const [selectedEmployeeFields, setSelectedEmployeeFields] = useState([]);
  // Programas
  const [selectedProgramFields, setSelectedProgramFields] = useState([]);
  // Dispositivos
  const [selectedDeviceFields,  setSelectedDeviceFields]  = useState([]);

  useEffect(() => {
    setSelectedEmployeeFields([]);
    setSelectedProgramFields([]);
    setSelectedDeviceFields([]);
    setResult(null);
  }, [type, subOption]);

  const optionsType = [
    ['employer', 'Trabajadores'],
    ['program', 'Programas y dispositivos']
  ];
  const optionsTypeEmployer = [
    ['info', 'Información Básica'],
    ['doc', 'Documentación'],
    ['period', 'Periodos de contratación']
  ];
  const optionsTypeProgram = [
    ['info', 'Información Básica'],
    ['doc', 'Documentación']
  ];
  const allSubOptions = type === 'employer' ? optionsTypeEmployer : optionsTypeProgram;



  const runAudit = async () => {
    let apiFn, payload;
  
    if (type === 'employer') {
      apiFn   = auditInfoUser;
      payload = { fields: selectedEmployeeFields };
      if (payload.fields.length === 0) return;     // nada que auditar
    } else {
      apiFn   = auditInfoProgram;
      payload = {
        programFields: selectedProgramFields,
        deviceFields:  selectedDeviceFields,
      };
      if (
        payload.programFields.length === 0 &&
        payload.deviceFields.length   === 0
      ) return;
    }
  
    setLoading(true);
    charge(true);
    try {
      const token = getToken();
      const data  = await apiFn(payload, token);
      setResult(data);
    } catch (err) {
      setResult({ error: err.message || 'Error' });
    } finally {
      setLoading(false);
      charge(false);
    }
  };

  const getValue = (obj, path) =>
    path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);

  const renderContent = () => {
    if (subOption === 'info') {
      return type === 'employer' ? (
        <InfoAuditPanelEmployee
        selectedFields={selectedEmployeeFields}
        setSelectedFields={setSelectedEmployeeFields}
          result={result}
          getValue={getValue}
          runAudit={runAudit}
          enumsData={enumsData}
        />
      ) : (
        <InfoAuditPanelProgramDevice
        selectedProgramFields={selectedProgramFields}
        setSelectedProgramFields={setSelectedProgramFields}
        selectedDeviceFields={selectedDeviceFields}
        setSelectedDeviceFields={setSelectedDeviceFields}
        result={result}
        getValue={getValue}
        runAudit={runAudit}
        enumsData={enumsData}
        />
      );
    }
    if (subOption === 'doc') {
      return <PlaceholderPanel title="Documentación">Lógica de Documentación…</PlaceholderPanel>;
    }
    if (subOption === 'period') {
      return <PlaceholderPanel title="Periodos de contratación">Lógica de Periodos…</PlaceholderPanel>;
    }
    return <p>Selecciona una opción para ver el contenido.</p>;
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}><h2>AUDITORÍA</h2></div>
        <div className={styles.optionsContainer}>
          <OptionSelector
            type={type}
            optionsType={optionsType}
            allSubOptions={allSubOptions}
            subOption={subOption}
            onTypeClick={v => {
              if (v === type) return;
              setType(v);
              // por defecto al cambiar de tipo, volvemos a 'info'
              setSubOption('info');
            }}
            onSubClick={v => setSubOption(v)}
          />
          <main className={styles.content}>
            {renderContent()}
          </main>
        </div>
      </div>
    </div>
  );
};

export default ManagingAuditors;
