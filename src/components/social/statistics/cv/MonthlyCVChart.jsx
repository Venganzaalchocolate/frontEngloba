// statistics/cv/MonthlyCVChart.jsx
import React, { useEffect, useState, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

import { stCvMonthly } from '../../../../lib/data';
import { getToken } from '../../../../lib/serviceToken';
import styles from '../../../styles/CvStatsDashboard.module.css';

/* ──────────────────────────────────────────────────────────────────
 *  Constantes auxiliares
 * ─────────────────────────────────────────────────────────────── */
const MONTHS = [
  '01',
  '02',
  '03',
  '04',
  '05',
  '06',
  '07',
  '08',
  '09',
  '10',
  '11',
  '12',
];
const MONTH_LABELS = [
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

/* ──────────────────────────────────────────────────────────────────
 *  Componente
 * ─────────────────────────────────────────────────────────────── */
export default function MonthlyCVChart({ modal, charge }) {
  const [years, setYears] = useState([]); // lista de años
  const [selectedYear, setSelectedYear] = useState(null);
  const [rows, setRows] = useState([]); // datos para la gráfica
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    const yearToUse =
      selectedYear || new Date().getFullYear().toString();

    setLoading(true);
    charge(true);
    try {
      const resp = await stCvMonthly(
        { year: yearToUse },
        getToken()
      );

      const yearsList = resp.years ?? [];
      setYears(yearsList);

      // Si no había año seleccionado, fijamos el primero de la lista
      if (!selectedYear && yearsList.length) {
        setSelectedYear(yearsList[0]);
      }

      const counts = resp[yearToUse] ?? {}; // { '01': n, '02': n… }

      // Mapeamos a array completo de 12 meses (rellena con 0 donde falte)
      const data = MONTHS.map((m, idx) => ({
        ym: `${yearToUse}-${m}`,
        monthLabel: MONTH_LABELS[idx],
        total: counts[m] ?? 0,
      }));

      setRows(data);
    } catch (err) {
      modal(
        'Error',
        err.message || 'Error al obtener la serie mensual'
      );
    } finally {
      setLoading(false);
      charge(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedYear]);

  const isEmpty = useMemo(
    () => rows.every(r => r.total === 0),
    [rows]
  );

  return (
    <div className={styles.chartBox}>
      <div className={styles.sectionHeader}>
        <h3>CV recibidos por mes</h3>

        {/* Selector de año */}
        <div className={styles.actions}>
          {years.length > 0 && (
            <select
              className={styles.select}
              value={selectedYear || ''}
              onChange={e => setSelectedYear(e.target.value)}
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

      {/* Cuerpo del componente */}
      {loading ? (
        <p className={styles.loading}>Cargando…</p>
      ) : isEmpty ? (
        <p className={styles.noData}>Sin datos</p>
      ) : (
        <div className={styles.chartWrapper}>
          <ResponsiveContainer>
            <LineChart
              data={rows}
              margin={{ top: 5, right: 15, bottom: 5, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="monthLabel"
                tick={{ fontSize: 10 }}
              />
              <YAxis allowDecimals={false} />
              <Tooltip formatter={v => v.toLocaleString()} />
              <Line
                type="monotone"
                dataKey="total"
                stroke="#3366cc"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
