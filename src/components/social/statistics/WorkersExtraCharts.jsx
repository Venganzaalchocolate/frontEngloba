import {
  ResponsiveContainer, BarChart, Bar,
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LabelList
} from 'recharts';
import styles from '../../styles/WorkersCharts.module.css';
import useWorkersExtraStats from './useWorkersExtraStats';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#AA46BE'];

export default function WorkersExtraCharts({ filters, modal, charge }) {
  const { pyramid, pieGender, hiredEnded, workShift, tenure } =
    useWorkersExtraStats(filters, modal, charge);

  // mientras llega la 1ª respuesta mostramos un loader ligero
  if (!pyramid && !pieGender && !hiredEnded && !workShift && !tenure) {
    return <p className={styles.loading}>Cargando…</p>;
  }

  // ─── tiny helper ───────────────
  const hasData = d => Array.isArray(d) ? d.length > 0 : !!d; // admite arrays u objetos
  const translatedPieGender = pieGender.map(item => {
  const keyTranslated = item.key === 'male'
    ? 'Hombres'
    : item.key === 'female'
    ? 'Mujeres'
    : item.key;
  return { ...item, key: keyTranslated };
});

  return (
    <div className={styles.grid}>
      {/* 1 · Pirámide de edad -------------------------------------------- */}
      {hasData(pyramid) && (
        <ChartCard title="Pirámide de edad">
          <ResponsiveContainer height={300}>
            <AreaChart data={pyramid} margin={{ bottom: 30 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="age"
                label={{
                  value: 'Años',
                  position: 'insideBottom', // o 'bottom'
                  dy: 20,                    // separa la etiqueta del eje; ajusta a tu gusto
                  style: { textAnchor: 'middle' }
                }}
              />
              <YAxis
                label={{
                  value: 'Número de personas',
                  angle: -90,
                  position: 'insideLeft',
                  style: { textAnchor: 'middle' }
                }}
              />
              <Tooltip />
              <Area
                type="monotone"
                dataKey="male"
                name="Hombres"
                stackId="1"
                fill="#0088FE"
                stroke="#0088FE"
              />
              <Area
                type="monotone"
                dataKey="female"
                name="Mujeres"
                stackId="1"
                fill="#FF8042"
                stroke="#FF8042"
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 2 · Género ------------------------------------------------------- */}
      {hasData(pieGender) && (
        <ChartCard title="Distribución por género">
          <ResponsiveContainer height={300}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
  data={translatedPieGender}
  dataKey="value"
  nameKey="key"
  cx="50%" cy="50%"
  outerRadius={90}
  label={({ key, percent }) => `${key} ${(percent * 100).toFixed(0)}%`}
>
  {translatedPieGender.map((_, i) => (
    <Cell key={i} fill={COLORS[i % COLORS.length]} />
  ))}
</Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 3 · Altas vs Bajas ---------------------------------------------- */}
      {hasData(hiredEnded) && (
        <ChartCard title="Altas vs Bajas">
          <ResponsiveContainer height={260} >
            <LineChart data={hiredEnded}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={d => `${d.year}-${String(d.month).padStart(2, '0')}`} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey="hired" stroke="#00C49F" strokeWidth={2} />
              <Line type="monotone" dataKey="ended" stroke="#FF8042" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 4 · Jornada ------------------------------------------------------ */}
      {hasData(workShift) && (
        <ChartCard title="Tipo de jornada">
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Tooltip />
              <Legend />
              <Pie
                data={workShift}
                dataKey="total"
                nameKey="type"
                cx="50%" cy="50%"
                outerRadius={90}
                label={({ type, percent }) => `${type} ${(percent * 100).toFixed(0)}%`}
              >
                {workShift.map((_, i) => (
                  <Cell key={i} fill={COLORS[i % COLORS.length]} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      )}

      {/* 5 · Antigüedad --------------------------------------------------- */}
      {hasData(tenure) && (
        <ChartCard title="Antigüedad (años)">
          <ResponsiveContainer height={300}>
  <BarChart
    data={tenure}
    margin={{ top: 25, right: 30, left: 30, bottom: 40 }} // ← aquí va el margin
  >
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis
      dataKey="bucket"
      label={{
        value: 'Antigüedad en Años',
        position: 'insideBottom',
        dy: 25, // más separación para asegurarte de que se vea
        style: { textAnchor: 'middle' }
      }}
    />
    <YAxis
      label={{
        value: 'Número de personas',
        angle: -90,
        position: 'insideLeft',
        style: { textAnchor: 'middle' }
      }}
    />
    <Tooltip />
    <Bar dataKey="total" fill="#8884d8">
      <LabelList dataKey="total" position="top" />
    </Bar>
  </BarChart>
</ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────── */
function ChartCard({ title, children }) {
  return (
    <div className={styles.card}>
      <h3>{title}</h3>
      {children}
    </div>
  );
}