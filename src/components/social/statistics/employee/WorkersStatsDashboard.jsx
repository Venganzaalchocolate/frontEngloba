// statistics/employee/WorkersStatsDashboard.jsx
import { useState, useMemo, useEffect } from 'react';
import WorkersOverviewCards from './WorkersOverviewCards';
import WorkersExtraCharts from './WorkersExtraCharts';

import styles from '../../../styles/CvStatsDashboard.module.css';

import { getToken } from '../../../../lib/serviceToken';
import { stgetWorkersStats } from '../../../../lib/data';

/* ────────────────────────────────────────────────────────────────
 * Hook:  useWorkersExtraStats
 *        → devuelve audit, pyramid, pieGender, hiredEnded, workShift, tenure
 *        usando SOLO el endpoint unificado /stats/workers
 * ──────────────────────────────────────────────────────────────── */
function useWorkersExtraStats(filters, modal, charge) {
  const [state, setState] = useState({
    audit: null,
    pyramid: null,
    pieGender: null,
    hiredEnded: null,
    workShift: null,
    tenure: null,
  });

  useEffect(() => {
    let cancel = false;

    (async () => {
      charge(true);
      try {
        const token = getToken();
        const resp = await stgetWorkersStats(filters, token); // ← una sola request

        if (cancel) return;
        if (resp?.error) {
          throw new Error(resp.error || 'Respuesta incorrecta del servidor');
        }

        setState({
          audit: resp.audit ?? null,
          pyramid: resp.pyramid ?? null,
          pieGender: resp.pie?.gender ?? null,
          hiredEnded: resp.hiredEnded ?? null,
          workShift: resp.workShift ?? null,
          tenure: resp.tenure ?? null,
        });
      } catch (err) {
        if (!cancel) {
          modal('Error', err.message || 'No se pudieron cargar estadísticas');
        }
      } finally {
        if (!cancel) charge(false);
      }
    })();

    // stringify → fuerza el efecto cuando cambien los filtros
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(filters)]);

  return state;
}

/* ────────────────────────────────────────────────────────────────
 * Componente: WorkersStatsDashboard
 * ──────────────────────────────────────────────────────────────── */
const MONTHS = [
  ['', 'Mes'],
  ...Array.from({ length: 12 }, (_, i) => {
    const v = String(i + 1).padStart(2, '0');
    return [v, v];
  }),
];

const THIS_YEAR = new Date().getFullYear();
const START_YEAR = 2024;
const YEARS = [
  ['', 'Año'],
  ...Array.from({ length: THIS_YEAR - START_YEAR + 1 }, (_, i) => {
    const year = START_YEAR + i;
    return [String(year), String(year)];
  }),
];

export default function WorkersStatsDashboard({ enumsData, modal, charge }) {
  /* ─────────────  filtros  ───────────────────────────────────── */
  const [year, setYear] = useState('');
  const [month, setMonth] = useState('');
  const [programId, setProgramId] = useState('');
  const [deviceId, setDeviceId] = useState('');
  const [apafa, setApafa] = useState('no');

  const programIndex = enumsData?.programsIndex ?? {};

  /* programas disponibles */
  const programs = useMemo(() => {
    return Object.values(programIndex)
      .filter(p => p.type === 'program')
      .filter(p => {
        const name = (p.name || '').toLowerCase();
        if (apafa === 'si') return name.includes('apafa');
        if (apafa === 'no') return !name.includes('apafa');
        return true;
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
        const name = (d.name || '').toLowerCase();
        if (apafa === 'si') return name.includes('apafa');
        if (apafa === 'no') return !name.includes('apafa');
        return true;
      })
      .map(d => ({ _id: d._id, name: d.name }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [programId, programIndex, apafa]);

  /* cuerpo que enviamos al backend */
  const filters = useMemo(() => {
    const body = {};
    if (year) body.year = Number(year);
    if (month) body.month = Number(month);
    if (programId) body.programId = programId;
    if (deviceId) body.deviceId = deviceId;
    if (apafa) body.apafa = apafa; // 'si' | 'no' | 'todos' → filtrado en el back
    return body;
  }, [year, month, programId, deviceId, apafa]);

  /* reset */
  const resetFilters = () => {
    setYear('');
    setMonth('');
    setProgramId('');
    setDeviceId('');
    setApafa('no');
  };

  /* ─────────────  carga de stats extra con el nuevo hook  ─────── */
  const extraStats = useWorkersExtraStats(filters, modal, charge);

  /* ─────────────  UI  ─────────────────────────────────────────── */
  return (
    <div className={styles.container}>
      <h2>ESTADÍSTICAS PERSONAL</h2>

      <div className={styles.controls}>
        <h3>FILTROS</h3>

        {/* Año */}
        <select
          className={styles.select}
          value={year}
          onChange={e => {
            setYear(e.target.value);
            if (!e.target.value) setMonth('');
          }}
        >
          {YEARS.map(([v, l]) => (
            <option key={v || 'all'} value={v}>
              {l}
            </option>
          ))}
        </select>

        {/* Mes (solo si hay año) */}
        {!!year && (
          <select
            className={styles.select}
            value={month}
            disabled={!year}
            onChange={e => setMonth(e.target.value)}
          >
            {MONTHS.map(([v, l]) => (
              <option key={v || 'all'} value={v}>
                {l}
              </option>
            ))}
          </select>
        )}

        {/* Programa */}
        <select
          className={styles.select}
          value={programId}
          onChange={e => {
            setProgramId(e.target.value);
            setDeviceId('');
          }}
        >
          <option value=''>Todos los programas</option>
          {programs.map(p => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        {/* Dispositivo */}
        <select
          className={styles.select}
          value={deviceId}
          disabled={!programId}
          onChange={e => setDeviceId(e.target.value)}
        >
          <option value=''>Todos los dispositivos</option>
          {devices.map(d => (
            <option key={d._id} value={d._id}>
              {d.name}
            </option>
          ))}
        </select>

        {/* APAFA / ENGLOBA */}
        <select
          className={styles.select}
          value={apafa}
          onChange={e => setApafa(e.target.value)}
        >
          <option value='todos'>Todos incluido APAFA</option>
          <option value='si'>Solo APAFA</option>
          <option value='no'>Solo ENGLOBA</option>
        </select>

        <button onClick={resetFilters}>Reset filtros</button>
      </div>

      <WorkersOverviewCards data={extraStats.audit} />
      <WorkersExtraCharts data={extraStats} />
    </div>
  );
}
