import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { saveAs } from 'file-saver';
import styles from '../styles/ManagingLists.module.css';
import { listScopedRoles } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';

// -------------------- constants --------------------
export const LIST_OPTIONS = [
  { value: 'responsibles', label: 'Responsables' },
  { value: 'coordinators', label: 'Coordinadores' },
  { value: 'supervisors', label: 'Supervisores' },
  { value: 'allRoles', label: 'Todos los roles' }
];

export default function ManagingLists({ enumsData, modal, charge }) {
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('allRoles');
  const [rows, setRows] = useState([]);
  const [searchPD, setSearchPD] = useState('');
  const [searchNom, setSearchNom] = useState('');
  const [badPD, setBadPD] = useState(false);
  const [badNom, setBadNom] = useState(false);

  const stripAccents = s =>
    String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const wildcardToRegex = str =>
    stripAccents(str.trim())
      .replace(/[.+^${}()|[\]\\]/g, '\\$&')
      .replace(/\*/g, '.*')
      .replace(/\?/g, '.');

  const buildRegex = (pattern, setBadFlag) => {
    if (!pattern) {
      setBadFlag(false);
      return null;
    }
    try {
      return new RegExp(wildcardToRegex(pattern), 'i');
    } catch {
      setBadFlag(true);
      return null;
    }
  };

  const fullName = r => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();

  const provinceName = val => {
    if (!val) return '';
    if (typeof val === 'string') return val.trim();

    if (enumsData?.provinces) {
      for (const p of enumsData.provinces) {
        if (p._id === val) return p.name;
        const sub = p.subcategories?.find(s => s._id === val);
        if (sub) return `${p.name} – ${sub.name}`;
      }
    }

    return '';
  };

  const getRoleLabel = row => {
    const role = row.roleType || row.role || '';
    const scope = row.scopeType || '';

    if (role === 'responsible') {
      return scope === 'program' ? 'Responsable programa' : 'Responsable dispositivo';
    }
    if (role === 'coordinator') {
      return scope === 'program' ? 'Coordinador programa' : 'Coordinador';
    }
    if (role === 'supervisor') {
      return scope === 'program' ? 'Supervisor programa' : 'Supervisor dispositivo';
    }
    return role || '';
  };

  const getRoleClass = row => {
    const role = row.roleType || row.role || '';
    if (role === 'responsible') return styles.roleR;
    if (role === 'coordinator') return styles.roleC;
    if (role === 'supervisor') return styles.roleS || styles.roleProgram || styles.roleC;
    return '';
  };

  const loadData = useCallback(async currentFilter => {
    setLoading(true);
    charge(true);

    try {
      const token = getToken();
      const data = await listScopedRoles({ [currentFilter]: true }, token);
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      modal('Error', err.message || 'No se pudo obtener la información.');
      setRows([]);
    } finally {
      setLoading(false);
      charge(false);
    }
  }, [charge, modal]);

  useEffect(() => {
    loadData(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    loadData(filter);
  }, [filter, loadData]);

  const grouped = useMemo(() => {
    const rePD = buildRegex(searchPD, setBadPD);
    const reNom = buildRegex(searchNom, setBadNom);

    const filtered = rows.filter(r => {
      const hayPD = stripAccents(`${r.program ?? ''} ${r.device ?? ''}`);
      const hayNom = stripAccents(fullName(r));

      const okPD = !rePD || rePD.test(hayPD);
      const okNom = !reNom || reNom.test(hayNom);
      return okPD && okNom;
    });

    return filtered.reduce((acc, r) => {
      const programKey = r.program || 'Sin programa';
      let grp = acc.find(x => x.program === programKey);

      if (!grp) {
        grp = {
          program: programKey,
          programRows: [],
          deviceRows: [],
        };
        acc.push(grp);
      }

      if (r.scopeType === 'program') grp.programRows.push(r);
      else grp.deviceRows.push(r);

      return acc;
    }, []);
  }, [rows, searchPD, searchNom]);

  const exportFlatXLS = () => {
    if (!rows.length) {
      modal('Aviso', 'No hay datos para exportar.');
      return;
    }

    startTransition(async () => {
      charge(true);
      try {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('Listado');

        ws.columns = [
          { header: 'Programa', key: 'program', width: 30 },
          { header: 'Dispositivo', key: 'device', width: 30 },
          { header: 'Provincia', key: 'province', width: 25 },
          { header: 'Ámbito', key: 'scopeType', width: 18 },
          { header: 'Rol', key: 'role', width: 24 },
          { header: 'Nombre', key: 'fullName', width: 30 },
          { header: 'Email', key: 'email', width: 30 },
          { header: 'Teléfono Laboral', key: 'phoneJobNumber', width: 22 },
          { header: 'Teléfono Extensión', key: 'phoneJobExtension', width: 22 },
        ];

        rows.forEach(r =>
          ws.addRow({
            program: r.program || '',
            device: r.device || '',
            province: provinceName(r.province),
            scopeType: r.scopeType === 'program' ? 'Programa' : 'Dispositivo',
            role: getRoleLabel(r),
            fullName: fullName(r),
            email: r.email || '',
            phoneJobNumber: r.phoneJob?.number || '',
            phoneJobExtension: r.phoneJob?.extension || '',
          })
        );

        const buffer = await wb.xlsx.writeBuffer();
        saveAs(
          new Blob([buffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          }),
          'listado_roles_programas_dispositivos.xlsx'
        );
      } catch (err) {
        modal('Error', err.message || 'No se pudo generar el XLS.');
      } finally {
        charge(false);
      }
    });
  };

  const noDisponible = 'No Disponible';
  const reAnywhere = /@engloba\.org\.es/i;

  return (
    <div className={styles.listContainer}>
      <div className={styles.content}>
        <h3>Listado de roles</h3>

        <h4>Filtros:</h4>
        <div className={styles.cajaFiltros}>
          <select
            className={styles.selector}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            disabled={loading}
          >
            {LIST_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Nombre del Programa o Dispositivo"
            value={searchPD}
            onChange={e => {
              setSearchPD(e.target.value);
              setBadPD(false);
            }}
            className={`${styles.inputSearch} ${badPD ? styles.bad : ''}`}
          />

          <input
            type="text"
            placeholder="Nombre de la persona"
            value={searchNom}
            onChange={e => {
              setSearchNom(e.target.value);
              setBadNom(false);
            }}
            className={`${styles.inputSearch} ${badNom ? styles.bad : ''}`}
          />
        </div>

        <div className={styles.sectionButtonExport}>
          <button
            className={styles.btnExport}
            onClick={exportFlatXLS}
            disabled={loading || !rows.length}
          >
            Exportar XLS
          </button>
        </div>

        {grouped.length ? (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Programa / Dispositivo</th>
                  <th>Provincia</th>
                  <th>Ámbito</th>
                  <th>Rol</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono Laboral</th>
                  <th>Teléfono Extensión</th>
                </tr>
              </thead>
              <tbody>
                {grouped.map((g, i) => (
                  <React.Fragment key={`${i}-${g.program}`}>
                    {g.programRows.length ? (
                      g.programRows.map((pr, j) => (
                        <tr key={`pr-${j}-${g.program}`} className={styles.rowProgram}>
                          <td data-label="Programa / Dispositivo">{g.program}</td>
                          <td>{provinceName(pr.province)}</td>
                          <td>Programa</td>
                          <td className={getRoleClass(pr)}>{getRoleLabel(pr)}</td>
                          <td>{fullName(pr)}</td>
                          <td>{reAnywhere.test(pr.email) ? pr.email : 'Sin email coorporativo'}</td>
                          <td>{pr.phoneJob?.number || noDisponible}</td>
                          <td>{pr.phoneJob?.extension || noDisponible}</td>
                        </tr>
                      ))
                    ) : (
                      <tr className={styles.rowProgramSolo}>
                        <td>{g.program}</td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                        <td></td>
                      </tr>
                    )}

                    {g.deviceRows.map((d, j) => (
                      <tr key={`d-${j}-${g.program}-${d.device || 'sin-dispo'}`} className={styles.rowDevice}>
                        <td className={styles.deviceCell}>{d.device || 'Sin dispositivo'}</td>
                        <td>{provinceName(d.province)}</td>
                        <td>Dispositivo</td>
                        <td className={getRoleClass(d)}>{getRoleLabel(d)}</td>
                        <td>{fullName(d)}</td>
                        <td>{reAnywhere.test(d.email) ? d.email : 'Sin email coorporativo'}</td>
                        <td>{d.phoneJob?.number || noDisponible}</td>
                        <td>{d.phoneJob?.extension || noDisponible}</td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}

                {!grouped.length && (
                  <tr>
                    <td colSpan={8} style={{ textAlign: 'center', padding: '1rem' }}>
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <p>No hay resultados</p>
        )}
      </div>
    </div>
  );
}