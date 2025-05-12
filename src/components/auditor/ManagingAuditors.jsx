import { useEffect, useState } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
import { auditInfoDevice, auditInfoProgram, auditInfoUser, auditDocumentUser, auditDocumentProgram, auditDocumentDevice,auditUserPeriod } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';

import OptionSelector from './OptionSelector';
import InfoAuditPanelEmployee from './InfoAuditPanelEmployee';
import InfoAuditPanelProgram from './InfoAuditPanelProgram';
import InfoAuditPanelDevice from './InfoAuditPanelDevice';
import InfoAuditPanelEmployeeDocs from './InfoAuditPanelEmployeeDocs';
import InfoAuditPanelProgramDocs from './InfoAuditPanelProgramDocs';
import InfoAuditPanelDeviceDocs from './InfoAuditPanelDeviceDocs';
import InfoAuditPanelContractLeaveEmployee from './InfoAuditPanelContractLeaveEmployee';

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
  const [result, setResult] = useState(null);
  const [apafa, setApafa]=useState(false)

  // Trabajadores
  const [selectedEmployeeFields, setSelectedEmployeeFields] = useState([]);
  // Programas
  const [selectedProgramFields, setSelectedProgramFields] = useState([]);
  // Dispositivos
  const [selectedDeviceFields, setSelectedDeviceFields] = useState([]);
  // Documentación
  const [selectedDocumentationFields, setSelectedDocumentationFields]= useState([]);

  const [selectedLeaveFields, setSelectedLeaveFields] = useState([])

  useEffect(() => {
    setSelectedEmployeeFields([]);
    setSelectedProgramFields([]);
    setSelectedDeviceFields([]);
    setResult(null);
    setSelectedDocumentationFields([]);
    setSelectedLeaveFields([]);
  }, [type, subOption, apafa]);


  const optionsType = [
    ['employer', 'Trabajadores'],
    ['program', 'Programas'],
    ['device', 'Dispositivos']
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
      if (subOption === 'info') {
        apiFn   = auditInfoUser;
        payload = { fields: selectedEmployeeFields };
        if (payload.fields.length === 0) return;
      } else if (subOption === 'doc') {
        apiFn   = auditDocumentUser;
        payload = { docIds: selectedDocumentationFields };
        if (payload.docIds.length === 0) return;
       } else if (subOption === 'period') {
        apiFn   = auditUserPeriod;
          payload = {
          leaveFields : selectedLeaveFields
        };
        if (payload.leaveFields.length === 0) return;
      } else {
        return;
      }
    } else if (type === 'program') {
      if (subOption === 'info') {
        apiFn   = auditInfoProgram;
        payload = { programFields: selectedProgramFields };
        if (payload.programFields.length === 0) return;
      } else if (subOption === 'doc') {
        
        apiFn   = auditDocumentProgram;
        payload = { docIds: selectedDocumentationFields };
        if (payload.docIds.length === 0) return;
      } else {
        return;
      }
    }  else if (type === 'device') {
      if (subOption === 'info') {
        if (selectedDeviceFields.length > 0) {
          apiFn = auditInfoDevice;
          payload = { deviceFields: selectedDeviceFields };
        } else {
          return;
        }
      } else if (subOption === 'doc') {
        if (selectedDocumentationFields.length > 0) {
          apiFn = auditDocumentDevice;
          payload = { docIds: selectedDocumentationFields };
        } else {
          return;
        }
      }
    } 


    charge(true);
    try {
      const token = getToken();
      payload['apafa']=apafa
      const data  = await apiFn(payload, token);

      setResult(data);
    } catch (err) {
      setResult({ error: err.message || 'Error' });
    } finally {

      charge(false);
    }
  };

  const getValue = (obj, path) =>
    path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);

  const renderContent = () => {
    if (subOption === 'info') {
      if (type === 'employer') {
        return (
          <InfoAuditPanelEmployee
            selectedFields={selectedEmployeeFields}
            setSelectedFields={setSelectedEmployeeFields}
            result={result}
            getValue={getValue}
            runAudit={runAudit}
            enumsData={enumsData}
          />
        );
      } else if (type === 'program') {
        return (
          <InfoAuditPanelProgram
            selectedProgramFields={selectedProgramFields}
            setSelectedProgramFields={setSelectedProgramFields}
            result={result}
            runAudit={runAudit}
            charge={charge}
            enumsData={enumsData}
          />
        );
      } else if (type === 'device') {
        return (
          <InfoAuditPanelDevice
            selectedDeviceFields={selectedDeviceFields}
            setSelectedDeviceFields={setSelectedDeviceFields}
            result={result}
            runAudit={runAudit}
            charge={charge}
            enumsData={enumsData}
          />
        );
      }
    }

    if (subOption === 'doc') {
      if (type === 'employer') {
        return (
          <InfoAuditPanelEmployeeDocs
            enumsData={enumsData}
            selectedDocumentationFields={selectedDocumentationFields}
            setSelectedDocumentationFields={setSelectedDocumentationFields}
            result={result}
            runAudit={runAudit}
            charge={charge}
          />
        );
      } else if (type === 'program') {
        return (
          <InfoAuditPanelProgramDocs
            enumsData={enumsData}
            selectedDocumentationFields={selectedDocumentationFields}
            setSelectedDocumentationFields={setSelectedDocumentationFields}
            result={result}
            runAudit={runAudit}
            charge={charge}
          />
        );
      } else if (type === 'device') {
        return (
          <InfoAuditPanelDeviceDocs
            enumsData={enumsData}
            selectedDocumentationFields={selectedDocumentationFields}
            setSelectedDocumentationFields={setSelectedDocumentationFields}
            result={result}
            runAudit={runAudit}
            charge={charge}
          />
        );
      }
    }
    if (subOption === 'period') {
      return (
        <InfoAuditPanelContractLeaveEmployee
            enumsData={enumsData}
            selectedLeaveFields={selectedLeaveFields}
            setSelectedLeaveFields={setSelectedLeaveFields}
            result={result}
            runAudit={runAudit}
            charge={charge}
            
          />
      )
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
              setSubOption('info');
            }}
            apafa={apafa}
            onSubClick={v => setSubOption(v)}
            onApafa={a=>setApafa(a)}
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