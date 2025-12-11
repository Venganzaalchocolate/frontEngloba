// src/components/stats/StatsUserCv.jsx
import { useEffect, useState, useMemo } from 'react';
import styles from '../styles/StatsHeadcount.module.css';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

import { getUserCvStats } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';

const JOB_COLORS = [
  '#7B68EE', // violeta suave
  '#FF8DA1', // rosa pastel
  '#4FC3F7', // azul clarito
  '#81C784', // verde suave
  '#FFB74D', // naranja suave
  '#BA68C8', // lila
  '#64B5F6', // azul medio
  '#FFD54F', // amarillo suave
];

function formatJobLabel(value = '') {
  return String(value);
}

export default function StatsUserCv({ charge, modal, enumsData }) {
  const [stats, setStats] = useState(null);

  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
  const [apafaInput, setApafaInput] = useState(''); // '', 'true', 'false'

  const { provincesIndex = {}, jobsIndex = {}, studiesIndex = {} } = enumsData || {};

  // Años desde 2020 hasta el actual (por si el CV lleva tiempo abierto)
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const arr = [];
    for (let y = 2024; y <= currentYear; y += 1) {
      arr.push(y);
    }
    return arr;
  }, []);

  // ------------------- loader centralizado -------------------
  const loadStats = async (extraFilters = {}) => {
    charge(true);
    setStats(null);

    const token = getToken();
    const datos = { ...extraFilters };
    const data = await getUserCvStats(datos, token);

    if (data?.error) {
      modal('Error', data.message || 'Error al cargar estadísticas de CV');
      setStats(null);
      charge(false);
      return;
    }

    setStats(data);
    charge(false);
  };

  // Carga inicial
  useEffect(() => {
    loadStats({ year: new Date().getFullYear().toString() });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handler del formulario de filtros
  const handleApplyFilters = (e) => {
    e.preventDefault();
    const filters = {};

    if (yearInput) {
      filters.year = String(yearInput);
    }

    if (apafaInput === 'true' || apafaInput === 'false') {
      filters.apafa = apafaInput;
    }

    loadStats(filters);
  };

  const hasStats = Boolean(stats);

  const {
    totals = {
      totalCvs: 0,
      hiredCvs: 0,
      withDisability: 0,
      fostered: 0,
    },
    byGender = [],
    byProvince = [],
    byJob = [],
    byStudies = [],
    byWorkSchedule = [],
    byCreatedYear = [],
    hiresByYearApafa = [],
  } = stats || {};

  // ---------- DATA PROFESIONES (barras horizontales) ----------
  const jobsBarData = useMemo(() => {
    if (!byJob || !byJob.length) return [];

    return byJob
      .slice()
      .sort((a, b) => b.count - a.count)
      .map((row, idx) => {
        const jobInfo = jobsIndex[row.jobId];
        return {
          jobId: row.jobId,
          name: jobInfo?.name || 'Sin puesto',
          count: row.count || 0,
          fill: JOB_COLORS[idx % JOB_COLORS.length],
        };
      });
  }, [byJob, jobsIndex]);

  // ---------- DATA PROVINCIAS ----------
  const provinceChartData = useMemo(
    () =>
      (byProvince || []).map((p) => {
        const info = provincesIndex[p.provinceId] || null;
        return {
          provinceId: p.provinceId,
          name: info?.name || 'Sin provincia',
          count: p.count || 0,
        };
      }),
    [byProvince, provincesIndex]
  );

  // ---------- DATA GÉNERO ----------
  const genderChartData = (byGender || []).map((g) => ({
    code: g.gender || 'noinfo',
    label: mapGenderLabel(g.gender),
    count: g.count || 0,
  }));

  const genderColorMap = {
    male: 'var(--color-morado)',
    female: 'var(--color-chicle)',
    nonBinary: 'var(--color-verde-hoja)',
    others: 'var(--color-naranja)',
    noinfo: 'var(--color-gris-medio)',
    undefined: 'var(--color-gris-medio)',
    null: 'var(--color-gris-medio)',
  };

  // ---------- DATA ESTUDIOS ----------
  const studiesBarData = useMemo(() => {
    if (!byStudies || !byStudies.length) return [];

    return byStudies
      .slice()
      .sort((a, b) => b.count - a.count)
      .map((row, idx) => {
        const stInfo = studiesIndex[row.studyId];
        return {
          studyId: row.studyId,
          name: stInfo?.name || 'Sin estudios',
          count: row.count || 0,
          fill: JOB_COLORS[idx % JOB_COLORS.length],
        };
      });
  }, [byStudies, studiesIndex]);

  // ---------- DATA DISPONIBILIDAD HORARIA ----------
  const workScheduleData = (byWorkSchedule || []).map((w) => ({
    workSchedule: w.workSchedule || 'No informado',
    count: w.count || 0,
  }));

  // ---------- DATA CV POR AÑO DE CREACIÓN ----------
  const createdYearData = (byCreatedYear || []).map((y) => ({
    year: y.year,
    count: y.count || 0,
  }));

  // ---------- DATA CONTRATACIONES POR AÑO Y APAFA (stacked) ----------
  const hiresByYearApafaData = useMemo(() => {
    if (!hiresByYearApafa || !hiresByYearApafa.length) return [];

    const map = new Map();

    hiresByYearApafa.forEach((row) => {
      const year = row.year;
      const isApafa = row.apafa === true;
      const key = String(year);

      if (!map.has(key)) {
        map.set(key, { year, apafaTrue: 0, apafaFalse: 0 });
      }
      const entry = map.get(key);
      if (isApafa) entry.apafaTrue += row.count || 0;
      else entry.apafaFalse += row.count || 0;
    });

    return Array.from(map.values()).sort((a, b) => a.year - b.year);
  }, [hiresByYearApafa]);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Estadísticas de CV recibidos</h2>

      {/* Filtros internos */}
      <form className={styles.filters} onSubmit={handleApplyFilters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>
            Año de contratación (User)
            <select
              className={styles.filterSelect}
              value={yearInput}
              onChange={(e) => setYearInput(e.target.value)}
            >
              <option value="">Todos</option>
              {yearOptions.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>
            APAFA / Engloba (para contrataciones)
            <select
              className={styles.filterSelect}
              value={apafaInput}
              onChange={(e) => setApafaInput(e.target.value)}
            >
              <option value="">Todos</option>
              <option value="true">Solo APAFA</option>
              <option value="false">Solo Engloba</option>
            </select>
          </label>
        </div>

        <button type="submit" className={styles.filterButton}>
          Aplicar filtros
        </button>
      </form>

      {!hasStats && (
        <p className={styles.warning}>
          No se han podido cargar los datos de forma completa. Se muestran valores vacíos.
        </p>
      )}

      {/* Tarjetas resumen */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Total de CV registrados</span>
          <span className={styles.cardValue}>{totals.totalCvs ?? 0}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>CV que han acabado en contratación</span>
          <span className={styles.cardValue}>{totals.hiredCvs ?? 0}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>CV con discapacidad</span>
          <span className={styles.cardValue}>{totals.withDisability ?? 0}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>CV de personas extuteladas</span>
          <span className={styles.cardValue}>{totals.fostered ?? 0}</span>
        </div>
      </div>

      {/* PROFESIONES */}
      <div className={styles.chartBlock}>
        <h3 className={styles.blockTitle}>Distribución por profesión (CV)</h3>

        {jobsBarData && jobsBarData.length > 0 ? (
          <div className={styles.provinceLayout}>
            {/* Gráfico */}
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={500}>
                <BarChart
                  data={jobsBarData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={300}
                    interval={0}
                    tickFormatter={formatJobLabel}
                    tick={{ fontSize: 11 }}
                  />
                  <Tooltip />
                  <Bar dataKey="count">
                    {jobsBarData.map((entry) => (
                      <Cell key={entry.jobId} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Profesión</th>
                    <th>Nº de CV</th>
                  </tr>
                </thead>
                <tbody>
                  {jobsBarData.map((job) => (
                    <tr key={job.jobId || job.name}>
                      <td>{job.name}</td>
                      <td>{job.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de profesión en los CV.</p>
        )}
      </div>

      {/* PROVINCIAS */}
      <div className={styles.tableBlock}>
        <h3 className={styles.blockTitle}>Distribución por provincia (CV)</h3>
        {provinceChartData && provinceChartData.length > 0 ? (
          <div className={styles.provinceLayout}>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={360}>
                <BarChart
                  data={provinceChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                  <XAxis type="number" />
                  <YAxis type="category" dataKey="name" width={140} interval={0} />
                  <Tooltip />
                  <Bar dataKey="count" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Provincia</th>
                    <th>Nº de CV</th>
                  </tr>
                </thead>
                <tbody>
                  {provinceChartData.map((p) => (
                    <tr key={p.provinceId || p.name}>
                      <td>{p.name}</td>
                      <td>{p.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de provincia en los CV.</p>
        )}
      </div>

      {/* GÉNERO */}
      <div className={styles.dualBlock}>
        <h3 className={styles.blockTitle}>Distribución por género (CV)</h3>

        {genderChartData && genderChartData.length > 0 ? (
          <div className={styles.dualBlockInner}>
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={genderChartData}
                    dataKey="count"
                    nameKey="label"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                  >
                    {genderChartData.map((entry) => {
                      const fillColor =
                        genderColorMap[entry.code] || 'var(--color-gris-medio)';
                      return (
                        <Cell
                          key={entry.code || entry.label}
                          fill={fillColor}
                          stroke="var(--color-blanco)"
                          strokeWidth={1}
                        />
                      );
                    })}
                  </Pie>
                  <Tooltip />
                  <Legend
                    layout="vertical"
                    align="right"
                    verticalAlign="middle"
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>

            <div className={styles.tableWrapperSmall}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Género</th>
                    <th>Nº de CV</th>
                  </tr>
                </thead>
                <tbody>
                  {byGender.map((g) => (
                    <tr key={g.gender || 'sin'}>
                      <td>{mapGenderLabel(g.gender)}</td>
                      <td>{g.count}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de género en los CV.</p>
        )}
      </div>

      {/* ESTUDIOS */}
      <div className={styles.chartBlock}>
        <h3 className={styles.blockTitle}>Distribución por estudios</h3>
        {studiesBarData && studiesBarData.length > 0 ? (
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={500}>
              <BarChart
                data={studiesBarData}
                layout="vertical"
                margin={{ top: 8, right: 8, bottom: 8, left: 16 }}
              >
                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                <XAxis type="number" />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={400}
                  interval={0}
                  tick={{ fontSize: 11 }}
                />
                <Tooltip />
                <Bar dataKey="count">
                  {studiesBarData.map((entry) => (
                    <Cell key={entry.studyId} fill={entry.fill} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de estudios en los CV.</p>
        )}
      </div>

      {/* DISPONIBILIDAD HORARIA */}
      <div className={styles.chartBlock}>
        <h3 className={styles.blockTitle}>Disponibilidad horaria declarada</h3>
        {workScheduleData && workScheduleData.length > 0 ? (
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={workScheduleData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="workSchedule" interval={0} tick={{ fontSize: 11 }} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de disponibilidad horaria.</p>
        )}
      </div>

      {/* CV POR AÑO DE CREACIÓN */}
      <div className={styles.chartBlock}>
        <h3 className={styles.blockTitle}>CV recibidos por año</h3>
        {createdYearData && createdYearData.length > 0 ? (
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={createdYearData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de años de recepción de CV.</p>
        )}
      </div>

      {/* CONTRATACIONES POR AÑO Y APAFA */}
      <div className={styles.chartBlock}>
        <h3 className={styles.blockTitle}>
          CV que han acabado en contratación por año y entidad
        </h3>
        {hiresByYearApafaData && hiresByYearApafaData.length > 0 ? (
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={hiresByYearApafaData} margin={{ top: 8, right: 16, bottom: 8, left: 16 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="year" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="apafaTrue" name="Contrataciones APAFA" stackId="a" fill="#81C784" />
                <Bar dataKey="apafaFalse" name="Contrataciones Engloba" stackId="a" fill="#64B5F6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de contrataciones vinculadas a CV.</p>
        )}
      </div>
    </div>
  );
}

function mapGenderLabel(code) {
  if (!code || code === 'noinfo') return 'No informado';
  if (code === 'male') return 'Hombre';
  if (code === 'female') return 'Mujer';
  if (code === 'others') return 'Otros';
  if (code === 'nonBinary') return 'No binario';
  return code || 'No informado';
}
