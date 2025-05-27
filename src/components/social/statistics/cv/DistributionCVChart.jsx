import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { stCvDistribution } from '../../../../lib/data';
import { getToken }         from '../../../../lib/serviceToken';
import styles from '../../../styles/CvStatsDashboard.module.css';

/* ─── constantes UI ─── */
const FIELD_OPTS = [
  { value: 'provinces',     label: 'Provincias'       },
  { value: 'jobs',          label: 'Puestos deseados'  },
  { value: 'studies',       label: 'Estudios'          },
  { value: 'work_schedule', label: 'Horario preferido' }
];
const GRAN_OPTS = [
  { value: 'month', label: 'Mensual' },
  { value: 'year',  label: 'Anual'   }
];

export default function DistributionCVChart({ enumsData, modal, charge }) {
  // Helper para mostrar provincias con su nombre
  const provName = useMemo(() => {
    const dict = {};
    enumsData?.provinces?.forEach(p => { dict[p._id] = p.name; });
    return v => dict[v] ?? v ?? '(sin dato)';
  }, [enumsData]);

  // Selectores de campo y granularidad
  const [field, setField] = useState('provinces');
  const [gran,  setGran]  = useState('month');

  // Año y mes seleccionados
  const now = useMemo(() => new Date(), []);
  const [year,  setYear]  = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth()+1).padStart(2, '0'));

  // Meta (años y meses disponibles) y datos de distribución
  const [listYears, setListYears]=useState([])
  const [listMonths, setListMonths]= useState([])
  const [data,     setData]     = useState([]);
  const [meta, setMeta]=useState(null)
  // Función que carga tanto meta como datos
  const loadData = useCallback(async () => {
    charge(true);
    try {
      const token = getToken();
       const body = {
      field,
      granularity: gran,
      year,
    };
    if(gran=='month')body['month']=month
      // El backend devuelve { distribution: [...], meta: { years, monthsByYear } }
      const raw = await stCvDistribution(body, token);
      // Actualizar meta y datos
      setListYears(raw.meta.years);
       if(year) setListMonths(raw.meta.monthsByYear[parseInt(year)]) 
      setMeta(raw.meta)
        
        
      // Mapear nombres de provincias si corresponde
      const dist = raw.distribution[0].distribution.map(d => ({
        name: field === 'provinces' ? provName(d.value) : d.value,
        total: d.total
      }));
      setData(dist);
    } catch (err) {
      modal('Error', err.message || 'No se pudo cargar la distribución');
    } finally {
      charge(false);
    }
  }, [field, gran, year, month, provName]);

  // Cargar al cambio de campo, granularidad, año o mes
  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleChangeYear=(y)=>{
    const list=meta.monthsByYear[parseInt(y)]
    setMonth(list[0])
    setYear(y)
    
  }


  return (
    <div className={styles.chartBox}>
      <div className={styles.sectionHeader}>
        <h3>Distribución CV</h3>

        {/* Selector de campo */}
        <select
          className={styles.select}
          value={field}
          onChange={e => setField(e.target.value)}
        >
          {FIELD_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Selector de granularidad */}
        <select
          className={styles.select}
          value={gran}
          onChange={e => setGran(e.target.value)}
        >
          {GRAN_OPTS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        {/* Selector de año */}
        {!!listYears &&
          <select
          className={styles.select}
          value={year}
          onChange={e =>handleChangeYear(e.target.value)}
        >
          {listYears.map(y => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>
        }
      

        {/* Selector de mes (solo si granularidad=month) */}
       {gran === 'month' && listMonths && (
  <select
    className={styles.select}
    value={month}
    onChange={e => setMonth(e.target.value)}
  >
    {listMonths.map(m => (
      <option key={m} value={m}>{m}</option>
    ))}
  </select>
)}
      </div>

      {/* Gráfico */}
      {data.length ? (
        <div className={styles.chartWrapper}>
          <ResponsiveContainer>
            <BarChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="name"
                interval={0}
                angle={-30}
                textAnchor="end"
                height={90}
                tick={{ fontSize: 10 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Legend />
              <Bar dataKey="total" fill="#82ca9d" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className={styles.noData}>Sin datos</p>
      )}
    </div>
  );
}
