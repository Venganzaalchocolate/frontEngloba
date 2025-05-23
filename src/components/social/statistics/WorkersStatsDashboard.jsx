// statistics/WorkersStatsDashboard.jsx
import { useState, useMemo } from 'react';
import WorkersOverviewCards from './WorkersOverviewCards';
import WorkersExtraCharts from './WorkersExtraCharts';
import styles from '../../styles/CvStatsDashboard.module.css';
// import styles from '../ ../styles/WorkerStatsDashboard.module.css';


const MONTHS = [
  ['', 'Mes'],                   // ← opción vacía
  ...Array.from({ length: 12 }, (_, i) => [String(i + 1).padStart(2, '0'), String(i + 1).padStart(2, '0')])
];
const THIS_YEAR = new Date().getFullYear();
const START_YEAR = 2024;
const YEARS = [['', 'Año'], ...Array.from(
  { length: THIS_YEAR - START_YEAR + 1 },
  (_, i) => {
    const year = START_YEAR + i;
    return [String(year), String(year)];
  }
)];

export default function WorkersStatsDashboard({ enumsData, modal, charge }) {
  /* state filtros */
  const [year, setYear] = useState('');     // ← vacíos por defecto
  const [month, setMonth] = useState('');
  const [programId, setProgramId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [apafa, setApafa] = useState('no')

  const programIndex = enumsData?.programsIndex ?? {};
  /* programas */
  const programs = useMemo(() => {
    return Object.values(programIndex)
      .filter(p => p.type === 'program')
      .filter(p => {
        const name = p.name.toLowerCase();
        if (apafa === 'si') return name.includes('apafa');
        if (apafa === 'no') return !name.includes('apafa');
        return true; // 'todos'
      })
      .map(p => ({ _id: p._id, name: p.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [programIndex, apafa]);


  /* dispositivos del programa elegido */
  const devices = useMemo(() => {
    if (!programId) return [];
    const prog = programIndex[programId];
    return (prog?.devicesIds || [])
      .map(id => programIndex[id])
      .filter(d => d?.type === 'device')
      .filter(d => {
        const name = d.name.toLowerCase();
        if (apafa === 'si') return name.includes('apafa');
        if (apafa === 'no') return !name.includes('apafa');
        return true;
      })
      .map(d => ({ _id: d._id, name: d.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [programId, programIndex, apafa]);

  /* cuerpo a backend */
  const filters = useMemo(() => {
    const body = {};
    if (year) body.year = Number(year);
    if (month) body.month = Number(month);
    if (programId) body.programId = programId;
    if (deviceId) body.deviceId = deviceId;
    if (apafa) body.apafa = apafa
    return body;
  }, [year, month, programId, deviceId, apafa]);

const resetFilters = () => {
  setYear('');
  setMonth('');
  setProgramId('');
  setDeviceId('');
  setApafa('no'); // o 'todos' si prefieres dejarlo completamente neutro
};
  /* UI */
  return (
    <div className={styles.container}>
      <h2>ESTADÍSTICAS PERSONAL</h2>

      <div className={styles.controls}>
        <h3>FILTROS</h3>
        {/* Año */}
        <select className={styles.select} value={year} onChange={e => { setYear(e.target.value); if (!e.target.value) setMonth(''); }}>
          {YEARS.map(([v, l]) => <option key={v || 'all'} value={v}>{l}</option>)}
        </select>

        {!!year &&
          <select className={styles.select} value={month} disabled={!year} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(([v, l]) => <option key={v || 'all'} value={v}>{l}</option>)}
          </select>
        }


        {/* Programa */}
        <select className={styles.select} value={programId} onChange={e => { setProgramId(e.target.value); setDeviceId(''); }}>
          <option value=''>Todos los programas</option>
          {programs.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
        </select>

        {/* Dispositivo */}
        <select className={styles.select} value={deviceId} disabled={!programId} onChange={e => setDeviceId(e.target.value)}>
          <option value=''>Todos los dispositivos</option>
          {devices.map(d => <option key={d._id} value={d._id}>{d.name}</option>)}
        </select>

        <select className={styles.select} value={apafa} onChange={e => setApafa(e.target.value)}>
          <option value='todos'>Todos incluido APAFA</option>
          <option value='si'>Solo APAFA</option>
          <option value='no'>Solo ENGLOBA</option>
        </select>

        <button onClick={()=>resetFilters()}>
          Reset filtros
        </button>
      </div>

      <WorkersOverviewCards filters={filters} modal={modal} charge={charge} />
      
      <WorkersExtraCharts  filters={filters} modal={modal} charge={charge} />
     {/* aqui se llaman a los nuevos componentes que me muestran los graficos */}
      
    </div>
  );
}
