// src/components/stats/StatsHeadcount.jsx
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
  RadialBarChart,
  RadialBar,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

import { currentHeadcountStats } from '../../lib/data';
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
  const str = String(value);
  return str;
}


export default function StatsHeadcount({ charge, modal, enumsData }) {
  const [stats, setStats] = useState(null);
  const [selectedProgramId, setSelectedProgramId] = useState(null);

  // Filtros internos
  const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
  const [apafaInput, setApafaInput] = useState('false'); // '', 'true', 'false'

  const { provincesIndex = {}, jobsIndex = {} } = enumsData || {};

  // Años desde 2024 hasta el año actual
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
    setSelectedProgramId(null);

    const token = getToken();
    const datos = { ...extraFilters };
    const data = await currentHeadcountStats(datos, token);

    if (data?.error) {
      modal('Error', data.message || 'Error al cargar estadísticas');
      setStats(null);
      charge(false);
      return;
    }

    setStats(data);
    charge(false);
  };

  // Carga inicial
  useEffect(() => {
    loadStats({ year: new Date().getFullYear().toString(), apafa: 'false' });
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

  // Si aún no tenemos stats, usamos objetos/arrays vacíos
  const {
    totals = {},
    byArea = [],
    byProgram = [],
    byProvince = [],
    byGender = [],
    byDispositive = [],
    byProgramGender = [],
    byDispositiveGender = [],
    byJobDispositive = [],
  } = stats || {};

  // ---------- DATA PARA GRÁFICO RADIAL POR PROFESIÓN ----------
const jobsBarData = useMemo(() => {
  if (!byJobDispositive || !byJobDispositive.length) return [];

  const acc = new Map();

  byJobDispositive.forEach((row) => {
    const jobId = row.jobId;
    if (!jobId) return;
    const prev = acc.get(jobId) || 0;
    acc.set(jobId, prev + (row.headcount || 0));
  });

  // Ordenamos de mayor a menor para que las profesiones más numerosas queden arriba
  const entries = Array.from(acc.entries()).sort((a, b) => b[1] - a[1]);

  return entries.map(([jobId, headcount], idx) => {
    const jobInfo = jobsIndex[jobId];
    return {
      jobId,
      name: jobInfo?.name || 'Sin puesto',
      headcount,
      fill: JOB_COLORS[idx % JOB_COLORS.length],
    };
  });
}, [byJobDispositive, jobsIndex]);



  // ---------- DATA PARA GRÁFICO DE GÉNERO ----------
  const genderChartData = (byGender || []).map((g) => ({
    code: g.gender || 'noinfo',
    label: mapGenderLabel(g.gender),
    headcount: g.headcount || 0,
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

  // ---------- DATA PARA GRÁFICO DE PROVINCIA ----------
  const provinceChartData = (byProvince || []).map((prov) => {
    const pInfo = provincesIndex[prov.provinceId] || null;
    const label = pInfo?.name || 'Sin provincia';
    return {
      provinceId: prov.provinceId,
      name: label,
      headcount: prov.headcount || 0,
    };
  });

  // Dispositivos del programa seleccionado
  const dispositivesForProgram = selectedProgramId
    ? (byDispositive || []).filter(
        (d) => String(d.programId) === String(selectedProgramId)
      )
    : [];

  // Distribución por género en el programa seleccionado
  const genderBySelectedProgram =
    selectedProgramId && byProgramGender && byProgramGender.length
      ? byProgramGender.filter(
          (row) => String(row.programId) === String(selectedProgramId)
        )
      : [];

  // Distribución por género por dispositivo dentro del programa seleccionado
  const genderByDispositiveForProgram =
    selectedProgramId && byDispositiveGender && byDispositiveGender.length
      ? byDispositiveGender.filter(
          (row) => String(row.programId) === String(selectedProgramId)
        )
      : [];

  // Matriz por dispositivo: una fila por dispositivo, columnas dinámicas de género
  const dispositiveGenderMatrix = buildDispositiveGenderMatrix(
    genderByDispositiveForProgram
  );

  // Distribución por profesión y dispositivo dentro del programa seleccionado
  const jobsByDispositiveForProgram =
    selectedProgramId && byJobDispositive && byJobDispositive.length
      ? byJobDispositive.filter(
          (row) => String(row.programId) === String(selectedProgramId)
        )
      : [];

  const dispositiveJobMatrix = buildJobDispositiveMatrix(
    jobsByDispositiveForProgram,
    provincesIndex,
    jobsIndex
  );

  const hasStats = Boolean(stats);

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Plantilla actual</h2>

      {/* Filtros internos */}
      <form className={styles.filters} onSubmit={handleApplyFilters}>
        <div className={styles.filterGroup}>
          <label className={styles.filterLabel}>
            Año de referencia
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
            APAFA / Engloba
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

      <p className={styles.subtitle}>
        Foto de la plantilla activa (periodos vigentes). Puedes filtrar por año y por
        pertenencia a APAFA.
      </p>

      {!hasStats && (
        <p className={styles.warning}>
          No se han podido cargar los datos de forma completa. Se muestran valores vacíos.
        </p>
      )}

      {/* Tarjetas resumen */}
      <div className={styles.cards}>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Plantilla total</span>
          <span className={styles.cardValue}>{totals?.headcount ?? 0}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>FTE estimado</span>
          <span className={styles.cardValue}>
            {Number(totals?.fte ?? 0).toFixed(1)}
          </span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Áreas con personal</span>
          <span className={styles.cardValue}>{byArea?.length ?? 0}</span>
        </div>
        <div className={styles.card}>
          <span className={styles.cardLabel}>Programas con personal</span>
          <span className={styles.cardValue}>{byProgram?.length ?? 0}</span>
        </div>
      </div>

      {/* Distribución global por profesión (radial) */}
{/* Distribución global por profesión (barras) */}
<div className={styles.chartBlock}>
  <h3 className={styles.blockTitle}>Distribución global por profesión</h3>

  {jobsBarData && jobsBarData.length > 0 ? (
    <div className={styles.chartWrapper}>
    <ResponsiveContainer width="100%" height={400}>
  <BarChart
    data={jobsBarData}
    margin={{ top: 8, right: 16, bottom: 60, left: 16 }}
  >
    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />

    {/* Eje X: profesiones */}
    <XAxis
      type="category"
      dataKey="name"
      interval={0}
      tickFormatter={formatJobLabel}
      tick={{ fontSize: 11 }}
      angle={-35}
      textAnchor="end"
      height={150}
    />

    {/* Eje Y: headcount */}
    <YAxis type="number" />

    <Tooltip />

    <Bar dataKey="headcount">
      {jobsBarData.map((entry) => (
        <Cell
          key={entry.jobId}
          fill={entry.fill}
        />
      ))}
    </Bar>
  </BarChart>
</ResponsiveContainer>

      {/* Leyenda de colores */}
      {/* Distribución global por profesión */}


      {/* Tabla debajo del gráfico */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Profesión</th>
              <th>Headcount</th>
            </tr>
          </thead>
          <tbody>
            {jobsBarData.map((job) => (
              <tr key={job.jobId || job.name}>
                <td>{job.name}</td>
                <td>{job.headcount}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>


    </div>
  ) : (
    <p className={styles.empty}>No hay datos de profesiones.</p>
  )}
</div>


      {/* Tabla + gráfico por provincia */}
      <div className={styles.tableBlock}>
        <h3 className={styles.blockTitle}>Plantilla por provincia</h3>
        {byProvince && byProvince.length > 0 ? (
          <div className={styles.provinceLayout}>
            {/* Gráfico */}
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={provinceChartData}
                  layout="vertical"
                  margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                >
                  <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                  <XAxis type="number" />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={120}
                    interval={0}
                  />
                  <Tooltip />
                  <Bar dataKey="headcount" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Tabla */}
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Provincia</th>
                    <th>Headcount</th>
                    <th>FTE</th>
                  </tr>
                </thead>
                <tbody>
                  {byProvince.map((prov) => {
                    const pInfo = provincesIndex[prov.provinceId] || null;
                    const label = pInfo?.name || 'Sin provincia';

                    return (
                      <tr key={prov.provinceId || 'no-prov'}>
                        <td>{label}</td>
                        <td>{prov.headcount}</td>
                        <td>{Number(prov.fte ?? 0).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de provincia.</p>
        )}
      </div>

      {/* Distribución global por género: donut + tabla */}
      <div className={styles.dualBlock}>
        <h3 className={styles.blockTitle}>Distribución global por género</h3>

        {byGender && byGender.length > 0 ? (
          <div className={styles.dualBlockInner}>
            {/* Donut de género */}
            <div className={styles.chartWrapper}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={genderChartData}
                    dataKey="headcount"
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

            {/* Tabla detalle */}
            <div className={styles.tableWrapperSmall}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Género</th>
                    <th>Headcount</th>
                    <th>FTE</th>
                  </tr>
                </thead>
                <tbody>
                  {byGender.map((g) => (
                    <tr key={g.gender || 'sin'}>
                      <td>{mapGenderLabel(g.gender)}</td>
                      <td>{g.headcount}</td>
                      <td>{Number(g.fte ?? 0).toFixed(1)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de género.</p>
        )}
      </div>

      {/* Gráfico por área */}
      <div className={styles.chartBlock}>
        <h3 className={styles.blockTitle}>Distribución por área de programa</h3>
        {byArea && byArea.length > 0 ? (
          <div className={styles.chartWrapper}>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byArea}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="area" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="headcount" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        ) : (
          <p className={styles.empty}>No hay datos de área disponibles.</p>
        )}
      </div>

      {/* Tabla por programa (clicable para ver dispositivos) */}
      <div className={styles.tableBlock}>
        <h3 className={styles.blockTitle}>Plantilla por programa</h3>
        {byProgram && byProgram.length > 0 ? (
          <>
            <p className={styles.helperText}>
              Haz clic en un programa para ver el detalle de sus dispositivos y la
              distribución por género.
            </p>
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Programa</th>
                    <th>Área</th>
                    <th>Total</th>
                    <th title="Full-Time Equivalent (equivalente a jornada completa)">
                      FTE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {byProgram.map((p) => {
                    const isSelected =
                      selectedProgramId &&
                      String(selectedProgramId) === String(p.programId);

                    return (
                      <tr
                        key={p.programId || p.programName}
                        onClick={() =>
                          setSelectedProgramId(
                            isSelected ? null : p.programId || null
                          )
                        }
                        className={styles.rowClickable}
                        data-selected={isSelected ? 'true' : 'false'}
                      >
                        <td>{p.programName || 'Sin programa'}</td>
                        <td>{p.area || 'Sin área'}</td>
                        <td>{p.headcount}</td>
                        <td>{Number(p.fte ?? 0).toFixed(1)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className={styles.empty}>No hay programas con personal activo.</p>
        )}
      </div>

      {/* Tabla por dispositivo */}
      <div className={styles.tableBlock}>
        <h3 className={styles.blockTitle}>Plantilla por dispositivo</h3>

        {!selectedProgramId && (
          <p className={styles.helperText}>
            Selecciona un programa de la tabla anterior para ver sus dispositivos.
          </p>
        )}

        {selectedProgramId && dispositivesForProgram.length === 0 && (
          <p className={styles.empty}>
            El programa seleccionado no tiene dispositivos con personal activo según los
            filtros aplicados.
          </p>
        )}

        {selectedProgramId && dispositivesForProgram.length > 0 && (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Dispositivo</th>
                  <th>Provincia</th>
                  <th>Headcount</th>
                  <th>FTE</th>
                </tr>
              </thead>
              <tbody>
                {dispositivesForProgram.map((d) => {
                  const provInfo = provincesIndex[d.provinceId] || null;
                  const label = provInfo?.name || 'Sin provincia';

                  return (
                    <tr key={d.dispositiveId || d.dispositiveName}>
                      <td>{d.dispositiveName || 'Sin nombre'}</td>
                      <td>{label}</td>
                      <td>{d.headcount}</td>
                      <td>{Number(d.fte ?? 0).toFixed(1)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Distribución por género en el programa seleccionado */}
      <div className={styles.tableBlock}>
        <h3 className={styles.blockTitle}>
          Distribución por género en el programa seleccionado
        </h3>
        {!selectedProgramId && (
          <p className={styles.helperText}>
            Selecciona un programa para ver la distribución por género.
          </p>
        )}

        {selectedProgramId && genderBySelectedProgram.length === 0 && (
          <p className={styles.empty}>
            No hay datos de género específicos para este programa con los filtros
            aplicados.
          </p>
        )}

        {selectedProgramId && genderBySelectedProgram.length > 0 && (
          <div className={styles.tableWrapperSmall}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Género</th>
                  <th>Headcount</th>
                  <th>FTE</th>
                </tr>
              </thead>
              <tbody>
                {genderBySelectedProgram.map((row) => (
                  <tr key={row.gender || 'sin'}>
                    <td>{mapGenderLabel(row.gender)}</td>
                    <td>{row.headcount}</td>
                    <td>{Number(row.fte ?? 0).toFixed(1)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Distribución por género por dispositivo en el programa seleccionado */}
      <div className={styles.tableBlock}>
        <h3 className={styles.blockTitle}>
          Distribución por género por dispositivo (programa seleccionado)
        </h3>

        {!selectedProgramId && (
          <p className={styles.helperText}>
            Selecciona un programa para ver la distribución por género en sus
            dispositivos.
          </p>
        )}

        {selectedProgramId &&
          (!dispositiveGenderMatrix.rows ||
            dispositiveGenderMatrix.rows.length === 0) && (
            <p className={styles.empty}>
              No hay datos de género por dispositivo para el programa seleccionado con
              los filtros actuales.
            </p>
          )}

        {selectedProgramId &&
          dispositiveGenderMatrix.rows &&
          dispositiveGenderMatrix.rows.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Dispositivo</th>
                    <th>Provincia</th>
                    {dispositiveGenderMatrix.genderCodes.map((g) => (
                      <th key={g}>{mapGenderLabel(g)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {dispositiveGenderMatrix.rows.map((row) => {
                    const pInfo = provincesIndex[row.provinceId] || null;
                    const label = pInfo?.name || 'Sin provincia';

                    return (
                      <tr key={row.dispositiveId || row.dispositiveName}>
                        <td>{row.dispositiveName}</td>
                        <td>{label}</td>
                        {dispositiveGenderMatrix.genderCodes.map((g) => {
                          const d = row.genders[g] || { headcount: 0 };
                          return <td key={g}>{d.headcount}</td>;
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {/* Distribución por profesión y dispositivo en el programa seleccionado */}
      <div className={styles.tableBlock}>
        <h3 className={styles.blockTitle}>
          Distribución por profesión y dispositivo (programa seleccionado)
        </h3>

        {!selectedProgramId && (
          <p className={styles.helperText}>
            Selecciona un programa para ver la distribución por profesión en sus
            dispositivos.
          </p>
        )}

        {selectedProgramId &&
          (!dispositiveJobMatrix.rows ||
            dispositiveJobMatrix.rows.length === 0) && (
            <p className={styles.empty}>
              No hay datos de profesiones por dispositivo para el programa seleccionado
              con los filtros actuales.
            </p>
          )}

        {selectedProgramId &&
          dispositiveJobMatrix.rows &&
          dispositiveJobMatrix.rows.length > 0 && (
            <div className={styles.tableWrapper}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Dispositivo</th>
                    <th>Provincia</th>
                    {dispositiveJobMatrix.jobIds.map((jobId) => {
                      const jobInfo = jobsIndex[jobId];
                      return (
                        <th key={jobId}>{jobInfo?.name || 'Sin puesto'}</th>
                      );
                    })}
                  </tr>
                </thead>
                <tbody>
                  {dispositiveJobMatrix.rows.map((row) => (
                    <tr key={row.dispositiveId || row.dispositiveName}>
                      <td>{row.dispositiveName}</td>
                      <td>{row.provinceLabel}</td>
                      {dispositiveJobMatrix.jobIds.map((jobId) => {
                        const cell = row.jobs[jobId] || { headcount: 0 };
                        return <td key={jobId}>{cell.headcount}</td>;
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
  return code;
}

function buildDispositiveGenderMatrix(data) {
  if (!data || !data.length) {
    return { rows: [], genderCodes: [] };
  }

  const map = new Map();
  const gendersSet = new Set();

  data.forEach((row) => {
    const key = String(row.dispositiveId || row.dispositiveName || 'unknown');

    if (!map.has(key)) {
      map.set(key, {
        dispositiveId: row.dispositiveId,
        dispositiveName: row.dispositiveName || 'Sin nombre',
        provinceId: row.provinceId || null,
        genders: {},
      });
    }

    const entry = map.get(key);
    const gCode = row.gender || 'noinfo';

    if (!entry.genders[gCode]) {
      entry.genders[gCode] = { headcount: 0, fte: 0 };
    }
    entry.genders[gCode].headcount += row.headcount || 0;
    entry.genders[gCode].fte += row.fte || 0;

    gendersSet.add(gCode);
  });

  const rows = Array.from(map.values());
  const genderCodes = Array.from(gendersSet);

  return { rows, genderCodes };
}

function buildJobDispositiveMatrix(data, provincesIndex = {}, jobsIndex = {}) {
  if (!data || !data.length) {
    return { rows: [], jobIds: [] };
  }

  const map = new Map();
  const jobIdsSet = new Set();

  data.forEach((row) => {
    const key = String(row.dispositiveId || row.dispositiveName || 'unknown');

    if (!map.has(key)) {
      const provInfo = provincesIndex[row.provinceId] || null;

      map.set(key, {
        dispositiveId: row.dispositiveId,
        dispositiveName: row.dispositiveName || 'Sin nombre',
        provinceId: row.provinceId || null,
        provinceLabel: provInfo?.name || 'Sin provincia',
        jobs: {},
      });
    }

    const entry = map.get(key);
    const jobId = row.jobId ? String(row.jobId) : 'no-job';

    if (!entry.jobs[jobId]) {
      entry.jobs[jobId] = { headcount: 0, fte: 0 };
    }

    entry.jobs[jobId].headcount += row.headcount || 0;
    entry.jobs[jobId].fte += row.fte || 0;

    if (row.jobId) {
      jobIdsSet.add(String(row.jobId));
    }
  });

  const rows = Array.from(map.values());
  const jobIds = Array.from(jobIdsSet);

  return { rows, jobIds };
}
