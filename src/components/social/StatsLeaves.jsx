import { useEffect, useMemo, useState } from 'react';
import styles from '../styles/StatsHeadcount.module.css';
import { getLeavesStats } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';
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

const CHART_COLORS = [
    '#7B68EE',
    '#FF8DA1',
    '#4FC3F7',
    '#81C784',
    '#FFB74D',
    '#BA68C8',
    '#64B5F6',
    '#FFD54F',
];

export default function StatsLeaves({ charge, modal, enumsData }) {
    const [stats, setStats] = useState(null);

const [yearInput, setYearInput] = useState(new Date().getFullYear().toString());
const [monthInput, setMonthInput] = useState('');
const [apafaInput, setApafaInput] = useState('');
const [activeOnlyInput, setActiveOnlyInput] = useState('true');
const [programIdInput, setProgramIdInput] = useState('');
const [deviceIdInput, setDeviceIdInput] = useState('');
const [leaveTypeIdInput, setLeaveTypeIdInput] = useState('');

    const programsIndex = enumsData?.programsIndex || {};
    const dispositiveIndex = enumsData?.dispositiveIndex || {};
    const provincesIndex = enumsData?.provincesIndex || {};
    const leavesIndex = enumsData?.leavesIndex || {};

    const yearOptions = useMemo(() => {
        const currentYear = new Date().getFullYear();
        const arr = [];
        for (let y = 2024; y <= currentYear; y += 1) arr.push(y);
        return arr;
    }, []);

    const monthOptions = [
        { value: '01', label: 'Enero' },
        { value: '02', label: 'Febrero' },
        { value: '03', label: 'Marzo' },
        { value: '04', label: 'Abril' },
        { value: '05', label: 'Mayo' },
        { value: '06', label: 'Junio' },
        { value: '07', label: 'Julio' },
        { value: '08', label: 'Agosto' },
        { value: '09', label: 'Septiembre' },
        { value: '10', label: 'Octubre' },
        { value: '11', label: 'Noviembre' },
        { value: '12', label: 'Diciembre' },
    ];

    const loadStats = async (extraFilters = {}) => {
        charge(true);
        setStats(null);

        const token = getToken();
        const data = await getLeavesStats(extraFilters, token);

        if (data?.error) {
            modal('Error', data.message || 'Error al cargar estadísticas de bajas y excedencias');
            setStats(null);
            charge(false);
            return;
        }

        setStats(data);
        charge(false);
    };

    useEffect(() => {
        loadStats({
            year: new Date().getFullYear().toString(),
            activeOnly: 'true'
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleApplyFilters = (e) => {
        e.preventDefault();

        const filters = {};
        if (yearInput) filters.year = String(yearInput);
        if (monthInput) filters.month = String(monthInput);
        if (apafaInput === 'true' || apafaInput === 'false') filters.apafa = apafaInput;
        if (activeOnlyInput === 'true' || activeOnlyInput === 'false') filters.activeOnly = activeOnlyInput;
        if (programIdInput) filters.programId = programIdInput;
        if (deviceIdInput) filters.deviceId = deviceIdInput;
        if (leaveTypeIdInput) filters.leaveTypeId = leaveTypeIdInput;

        loadStats(filters);
    };

    const {
        totals = {
            totalCases: 0,
            activeCases: 0,
            uniqueUsers: 0,
            totalDays: 0,
            averageDays: 0
        },
        byType = [],
        byProgram = [],
        byDispositive = [],
        detail = []
    } = stats || {};

    const programOptions = useMemo(() => {
        return Object.entries(programsIndex)
            .map(([id, value]) => ({
                value: id,
                label: value?.name || 'Sin nombre'
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [programsIndex]);

    const leaveTypeOptions = useMemo(() => {
    return Object.entries(leavesIndex)
        .map(([id, value]) => ({
            value: id,
            label: value?.name || 'Sin tipo'
        }))
        .sort((a, b) => a.label.localeCompare(b.label));
}, [leavesIndex]);

    const deviceOptions = useMemo(() => {
        const rows = Object.entries(dispositiveIndex).map(([id, value]) => ({
            value: id,
            ...value
        }));

        const filtered = programIdInput
            ? rows.filter((d) => String(d.program) === String(programIdInput))
            : rows;

        return filtered
            .map((d) => ({
                value: d.value,
                label: d.name || 'Sin nombre'
            }))
            .sort((a, b) => a.label.localeCompare(b.label));
    }, [dispositiveIndex, programIdInput]);

    const dispositivesForSelectedProgram = useMemo(() => {
        if (!programIdInput) return byDispositive || [];
        return (byDispositive || []).filter((row) => String(row.programId) === String(programIdInput));
    }, [byDispositive, programIdInput]);

    const hasStats = stats !== null;

    const activeVsClosedData = [
        {
            name: 'Activas',
            value: totals.activeCases || 0,
        },
        {
            name: 'Cerradas',
            value: Math.max(0, (totals.totalCases || 0) - (totals.activeCases || 0)),
        },
    ];

    const byTypeChartData = (byType || [])
        .slice()
        .sort((a, b) => (b.totalCases || 0) - (a.totalCases || 0))
        .map((row, idx) => ({
            name: row.leaveTypeName || leavesIndex[row.leaveTypeId]?.name || 'Sin tipo',
            totalCases: row.totalCases || 0,
            fill: CHART_COLORS[idx % CHART_COLORS.length],
        }));

    const byProgramChartData = (byProgram || [])
        .slice()
        .sort((a, b) => (b.totalCases || 0) - (a.totalCases || 0))
        .slice(0, 10)
        .map((row, idx) => ({
            name: row.programName || programsIndex[row.programId]?.name || 'Sin programa',
            totalCases: row.totalCases || 0,
            activeCases: row.activeCases || 0,
            fill: CHART_COLORS[idx % CHART_COLORS.length],
        }));

    const topDispositiveData = (byDispositive || [])
        .slice()
        .sort((a, b) => {
            const diff = (b.totalCases || 0) - (a.totalCases || 0);
            if (diff !== 0) return diff;
            return String(a.dispositiveName || '').localeCompare(String(b.dispositiveName || ''));
        })
        .slice(0, 10);

    const topDispositiveChartData = topDispositiveData.map((row, idx) => ({
  name: row.dispositiveName || dispositiveIndex[row.dispositiveId]?.name || 'Sin dispositivo',
  totalCases: row.totalCases || 0,
  activeCases: row.activeCases || 0,
  fill: CHART_COLORS[idx % CHART_COLORS.length],
}));

    return (
        <div className={styles.wrapper}>
            <h2 className={styles.title}>Bajas y Excedencias</h2>

            <form className={styles.filters} onSubmit={handleApplyFilters}>
                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        Año
                        <select
                            className={styles.filterSelect}
                            value={yearInput}
                            onChange={(e) => setYearInput(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {yearOptions.map((y) => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        Mes
                        <select
                            className={styles.filterSelect}
                            value={monthInput}
                            onChange={(e) => setMonthInput(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {monthOptions.map((m) => (
                                <option key={m.value} value={m.value}>{m.label}</option>
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

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        Estado
                        <select
                            className={styles.filterSelect}
                            value={activeOnlyInput}
                            onChange={(e) => setActiveOnlyInput(e.target.value)}
                        >
                            <option value="">Todos</option>
                            <option value="true">Solo activas</option>
                            <option value="false">Solo cerradas</option>
                        </select>
                    </label>
                </div>

                <div className={styles.filterGroup}>
    <label className={styles.filterLabel}>
        Tipo de baja / excedencia
        <select
            className={styles.filterSelect}
            value={leaveTypeIdInput}
            onChange={(e) => setLeaveTypeIdInput(e.target.value)}
        >
            <option value="">Todos</option>
            {leaveTypeOptions.map((item) => (
                <option key={item.value} value={item.value}>
                    {item.label}
                </option>
            ))}
        </select>
    </label>
</div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        Programa
                        <select
                            className={styles.filterSelect}
                            value={programIdInput}
                            onChange={(e) => {
                                setProgramIdInput(e.target.value);
                                setDeviceIdInput('');
                            }}
                        >
                            <option value="">Todos</option>
                            {programOptions.map((p) => (
                                <option key={p.value} value={p.value}>{p.label}</option>
                            ))}
                        </select>
                    </label>
                </div>

                <div className={styles.filterGroup}>
                    <label className={styles.filterLabel}>
                        Dispositivo
                        <select
                            className={styles.filterSelect}
                            value={deviceIdInput}
                            onChange={(e) => setDeviceIdInput(e.target.value)}
                        >
                            <option value="">Todos</option>
                            {deviceOptions.map((d) => (
                                <option key={d.value} value={d.value}>{d.label}</option>
                            ))}
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

            <div className={styles.cards}>
                <div className={styles.card}>
                    <span className={styles.cardLabel}>Casos totales</span>
                    <span className={styles.cardValue}>{totals.totalCases ?? 0}</span>
                </div>

                <div className={styles.card}>
                    <span className={styles.cardLabel}>Casos activos</span>
                    <span className={styles.cardValue}>{totals.activeCases ?? 0}</span>
                </div>

                <div className={styles.card}>
                    <span className={styles.cardLabel}>Personas afectadas</span>
                    <span className={styles.cardValue}>{totals.uniqueUsers ?? 0}</span>
                </div>

                <div className={styles.card}>
                    <span className={styles.cardLabel}>Días acumulados</span>
                    <span className={styles.cardValue}>{totals.totalDays ?? 0}</span>
                </div>

                <div className={styles.card}>
                    <span className={styles.cardLabel}>Duración media</span>
                    <span className={styles.cardValue}>{Number(totals.averageDays ?? 0).toFixed(1)}</span>
                </div>
            </div>

            <div className={styles.dualBlock}>
                <h3 className={styles.blockTitle}>Resumen visual</h3>

                <div className={styles.dualBlockInner}>
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={260}>
                            <PieChart>
                                <Pie
                                    data={activeVsClosedData}
                                    dataKey="value"
                                    nameKey="name"
                                    innerRadius={60}
                                    outerRadius={90}
                                    paddingAngle={3}
                                >
                                    {activeVsClosedData.map((entry, idx) => (
                                        <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip />
                                <Legend layout="vertical" align="right" verticalAlign="middle" />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>

                    <div className={styles.tableWrapperSmall}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Estado</th>
                                    <th>Casos</th>
                                </tr>
                            </thead>
                            <tbody>
                                {activeVsClosedData.map((row) => (
                                    <tr key={row.name}>
                                        <td>{row.name}</td>
                                        <td>{row.value}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
            <div className={styles.chartBlock}>
                <h3 className={styles.blockTitle}>Casos por tipo de baja</h3>

                {byTypeChartData.length > 0 ? (
                    <>
                        <div className={styles.chartWrapper}>
                            <ResponsiveContainer width="100%" height={360}>
                                <BarChart
                                    data={byTypeChartData}
                                    margin={{ top: 8, right: 16, bottom: 80, left: 16 }}
                                >
                                    <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                                    <XAxis
                                        dataKey="name"
                                        interval={0}
                                        angle={-25}
                                        textAnchor="end"
                                        height={90}
                                        tick={{ fontSize: 11 }}
                                    />
                                    <YAxis />
                                    <Tooltip />
                                    <Bar dataKey="totalCases">
                                        {byTypeChartData.map((entry, idx) => (
                                            <Cell key={`${entry.name}-${idx}`} fill={entry.fill} />
                                        ))}
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </>
                ) : (
                    <p className={styles.empty}>No hay datos por tipo para representar.</p>
                )}
            </div>
            <div className={styles.tableBlock}>
                <h3 className={styles.blockTitle}>Distribución por tipo</h3>
                {byType.length > 0 ? (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Tipo</th>
                                    <th>Casos</th>
                                    <th>Activas</th>
                                    <th>Personas</th>
                                    <th>Días acumulados</th>
                                    <th>Duración media</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byType.map((row) => (
                                    <tr key={row.leaveTypeId || row.leaveTypeName}>
                                        <td>{row.leaveTypeName || leavesIndex[row.leaveTypeId]?.name || 'Sin tipo'}</td>
                                        <td>{row.totalCases ?? 0}</td>
                                        <td>{row.activeCases ?? 0}</td>
                                        <td>{row.uniqueUsers ?? 0}</td>
                                        <td>{row.totalDays ?? 0}</td>
                                        <td>{Number(row.averageDays ?? 0).toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className={styles.empty}>No hay datos por tipo.</p>
                )}
            </div>
            <div className={styles.chartBlock}>
                <h3 className={styles.blockTitle}>Top 10 programas con más casos</h3>

                {byProgramChartData.length > 0 ? (
                    <div className={styles.chartWrapper}>
                        <ResponsiveContainer width="100%" height={420}>
                            <BarChart
                                data={byProgramChartData}
                                layout="vertical"
                                margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
                            >
                                <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
                                <XAxis type="number" />
                                <YAxis
                                    type="category"
                                    dataKey="name"
                                    width={260}
                                    interval={0}
                                    tick={{ fontSize: 11 }}
                                />
                                <Tooltip />
                                <Bar dataKey="totalCases">
                                    {byProgramChartData.map((entry, idx) => (
                                        <Cell key={`${entry.name}-${idx}`} fill={entry.fill} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                ) : (
                    <p className={styles.empty}>No hay datos por programa para representar.</p>
                )}
            </div>

<div className={styles.chartBlock}>
  <h3 className={styles.blockTitle}>Top 10 dispositivos con más casos</h3>

  {topDispositiveChartData.length > 0 ? (
    <div className={styles.chartWrapper}>
      <ResponsiveContainer width="100%" height={420}>
        <BarChart
          data={topDispositiveChartData}
          layout="vertical"
          margin={{ top: 8, right: 16, bottom: 8, left: 16 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal vertical={false} />
          <XAxis type="number" />
          <YAxis
            type="category"
            dataKey="name"
            width={280}
            interval={0}
            tick={{ fontSize: 11 }}
          />
          <Tooltip />
          <Bar dataKey="totalCases">
            {topDispositiveChartData.map((entry, idx) => (
              <Cell key={`${entry.name}-${idx}`} fill={entry.fill} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  ) : (
    <p className={styles.empty}>No hay datos de dispositivos para representar.</p>
  )}
</div>
            <div className={styles.tableBlock}>
                <h3 className={styles.blockTitle}>Impacto por programa</h3>
                {byProgram.length > 0 ? (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Programa</th>
                                    <th>Área</th>
                                    <th>Casos</th>
                                    <th>Activas</th>
                                    <th>Personas</th>
                                    <th>Días acumulados</th>
                                    <th>Duración media</th>
                                </tr>
                            </thead>
                            <tbody>
                                {byProgram.map((row) => (
                                    <tr key={row.programId || row.programName}>
                                        <td>{row.programName || programsIndex[row.programId]?.name || 'Sin programa'}</td>
                                        <td>{row.area || programsIndex[row.programId]?.area || 'Sin área'}</td>
                                        <td>{row.totalCases ?? 0}</td>
                                        <td>{row.activeCases ?? 0}</td>
                                        <td>{row.uniqueUsers ?? 0}</td>
                                        <td>{row.totalDays ?? 0}</td>
                                        <td>{Number(row.averageDays ?? 0).toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className={styles.empty}>No hay datos por programa.</p>
                )}
            </div>

            <div className={styles.tableBlock}>
                <h3 className={styles.blockTitle}>
                    Impacto por dispositivo {programIdInput ? '(programa seleccionado)' : ''}
                </h3>

                {dispositivesForSelectedProgram.length > 0 ? (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Dispositivo</th>
                                    <th>Programa</th>
                                    <th>Provincia</th>
                                    <th>Casos</th>
                                    <th>Activas</th>
                                    <th>Personas</th>
                                    <th>Días acumulados</th>
                                    <th>Duración media</th>
                                </tr>
                            </thead>
                            <tbody>
                                {dispositivesForSelectedProgram.map((row) => (
                                    <tr key={row.dispositiveId || `${row.programId}-${row.dispositiveName}`}>
                                        <td>{row.dispositiveName || dispositiveIndex[row.dispositiveId]?.name || 'Sin dispositivo'}</td>
                                        <td>{row.programName || programsIndex[row.programId]?.name || 'Sin programa'}</td>
                                        <td>{provincesIndex[row.provinceId]?.name || 'Sin provincia'}</td>
                                        <td>{row.totalCases ?? 0}</td>
                                        <td>{row.activeCases ?? 0}</td>
                                        <td>{row.uniqueUsers ?? 0}</td>
                                        <td>{row.totalDays ?? 0}</td>
                                        <td>{Number(row.averageDays ?? 0).toFixed(1)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className={styles.empty}>No hay datos por dispositivo.</p>
                )}
            </div>

            <div className={styles.tableBlock}>
                <h3 className={styles.blockTitle}>Detalle de casos</h3>
                {detail.length > 0 ? (
                    <div className={styles.tableWrapper}>
                        <table className={styles.table}>
                            <thead>
                                <tr>
                                    <th>Trabajador/a</th>
                                    <th>DNI</th>
                                    <th>Tipo</th>
                                    <th>Inicio</th>
                                    <th>Fin previsto</th>
                                    <th>Fin real</th>
                                    <th>Activa</th>
                                    <th>Días</th>
                                    <th>Programa</th>
                                    <th>Dispositivo</th>
                                    <th>Provincia</th>
                                </tr>
                            </thead>
                            <tbody>
                                {detail.map((row) => (
                                    <tr key={row.leaveId}>
                                        <td>{row.fullName || 'Sin nombre'}</td>
                                        <td>{row.dni || '-'}</td>
                                        <td>{row.leaveTypeName || leavesIndex[row.leaveTypeId]?.name || 'Sin tipo'}</td>
                                        <td>{formatDate(row.startLeaveDate)}</td>
                                        <td>{formatDate(row.expectedEndLeaveDate)}</td>
                                        <td>{formatDate(row.actualEndLeaveDate)}</td>
                                        <td>{row.active ? 'Sí' : 'No'}</td>
                                        <td>{row.durationDays ?? 0}</td>
                                        <td>{row.programName || programsIndex[row.programId]?.name || 'Sin programa'}</td>
                                        <td>{row.dispositiveName || dispositiveIndex[row.dispositiveId]?.name || 'Sin dispositivo'}</td>
                                        <td>{provincesIndex[row.provinceId]?.name || 'Sin provincia'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className={styles.empty}>No hay detalle de casos.</p>
                )}
            </div>
        </div>
    );
}

function formatDate(value) {
    if (!value) return '-';
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('es-ES');
}