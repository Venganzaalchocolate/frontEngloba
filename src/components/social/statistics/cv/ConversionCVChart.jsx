// statistics/cv/ConversionCVChart.jsx
import { useEffect, useState, useMemo } from 'react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

import { stCvConversion } from '../../../../lib/data';
import { getToken } from '../../../../lib/serviceToken';
import styles from '../../../styles/CvStatsDashboard.module.css';

const MONTHS_ES = [
  'Ene',
  'Feb',
  'Mar',
  'Abr',
  'May',
  'Jun',
  'Jul',
  'Ago',
  'Sep',
  'Oct',
  'Nov',
  'Dic',
];

export default function ConversionCVChart({ modal, charge }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [rows, setRows] = useState([]);
  const [years, setYears] = useState([]);

  /* ───── carga ───────────────────────────────────────────── */
  useEffect(() => {
    const load = async () => {
      charge(true);
      try {
        const { data, years: yList } = await stCvConversion(
          { year },
          getToken()
        );

        setRows(data || []);
        if (Array.isArray(yList)) setYears(yList);
      } catch (e) {
        modal('Error', e.message || 'Error conversión');
      } finally {
        charge(false);
      }
    };
    load();
  }, [year, modal, charge]);

  /* ───── preparar datos para Recharts ───────────────────── */
  const chartData = useMemo(() => {
    if (!rows.length) return [];
    return rows.map(r => ({
      ...r,
      label: MONTHS_ES[parseInt(r.period.month, 10) - 1] || r.period.month,
    }));
  }, [rows]);

  /* ───── resumen global ──────────────────────────────────── */
  const global = useMemo(() => {
    if (!rows.length) return '';
    const hired = rows.reduce((s, r) => s + r.hiredCv, 0);
    const total = rows.reduce((s, r) => s + r.totalCv, 0);
    return total ? `${((hired / total) * 100).toFixed(1)}%` : '';
  }, [rows]);

  /* ───── render ──────────────────────────────────────────── */
  return (
    <div className={styles.chartBox}>
      {/* encabezado + controles */}
      <div className={styles.sectionHeader}>
        <h3>Conversión CV → contratado {global && `(${global})`}</h3>

        <div className={styles.controls}>
          {years.length > 0 && (
            <select
              className={styles.select}
              value={year}
              onChange={e => setYear(e.target.value)}
            >
              {years.map(y => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* gráfico */}
      {chartData.length ? (
        <div className={styles.chartWrapper}>
          <ResponsiveContainer>
            <ComposedChart data={chartData}>
              <defs>
                <linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#ff7300" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#ff7300" stopOpacity={0.3} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />

              {/* eje izquierdo: ratio 0-1 */}
              <YAxis
                yAxisId="left"
                domain={[0, 1]}
                tickFormatter={v => `${(v * 100).toFixed(0)}%`}
              />

              {/* eje derecho: totales */}
              <YAxis yAxisId="right" orientation="right" />

              <Tooltip
                formatter={(value, name) => {
                  if (name === 'Ratio') {
                    return `${(value * 100).toFixed(1)} %`;
                  }
                  return value;
                }}
                labelFormatter={l => `${l} ${year}`}
              />

              <Legend />

              {/* barras totales */}
              <Bar
                yAxisId="right"
                dataKey="totalCv"
                name="CV recibidos"
                barSize={20}
                fill="#8884d8"
                radius={[4, 4, 0, 0]}
              />
              <Bar
                yAxisId="right"
                dataKey="hiredCv"
                name="Contratados"
                barSize={20}
                fill="#82ca9d"
                radius={[4, 4, 0, 0]}
              />

              {/* línea ratio */}
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="conversionRate"
                name="Ratio"
                stroke="url(#lineGrad)"
                strokeWidth={3}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className={styles.noData}>Sin datos</p>
      )}
    </div>
  );
}
