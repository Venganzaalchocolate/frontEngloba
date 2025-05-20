import React, { useState, useEffect, useMemo, useCallback, startTransition } from 'react';
import ExcelJS from 'exceljs/dist/exceljs.min.js';
import { saveAs } from 'file-saver';
import styles from '../styles/ManagingLists.module.css';
import { listsResponsiblesAndCoordinators } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';

// Opciones del selector de filtro
// -------------------- constants --------------------
export const LIST_OPTIONS = [
  { value: 'responsibles', label: 'Responsables' },
  { value: 'coordinators', label: 'Coordinadores' },
  { value: 'resAndCorr', label: 'Responsables y Coordinadores' }
];


/**
 * Componente principal para gestionar y exportar listas.
 * Entorno Vite + React.
 */
export default function ManagingLists({ enumsData, modal, charge }) {
  const [loading, setLoading] = useState(false);   // nuevo
  // Estado: filtro seleccionado
  const [filter, setFilter] = useState('resAndCorr');
  // Estado: filas de datos
  const [rows, setRows] = useState([]);
  const [searchPD, setSearchPD] = useState('');
  const [searchNom, setSearchNom] = useState('');

  const [badPD, setBadPD] = useState(false);   // flag de regex mal
  const [badNom, setBadNom] = useState(false);
  // Convierte wildcard sencillo a RegExp:  * → .*,  ? → .
  // ——— util para hacer la búsqueda “sin tildes” ———
const stripAccents = s =>
  s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');   // quita diacríticos

// ——— comodines  →  texto-patrón de RegExp ———
const wildcardToRegex = str =>
  stripAccents(str.trim())               // ① borra acentos (y espacios extremos)
    .replace(/[.+^${}()|[\]\\]/g, '\\$&') // ② escapa metacaracteres
    .replace(/\*/g, '.*')                // ③ *  →  .*
    .replace(/\?/g, '.');                // ④ ?  →  .

const buildRegex = (pattern, setBadFlag) => {
  if (!pattern) { setBadFlag(false); return null; }
  try {
    return new RegExp(wildcardToRegex(pattern), 'i');   // flag i = mayúsc./minúsc.
  } catch {
    setBadFlag(true);
    return null;
  }
};
  /**
   * Nombre completo de una persona.
   */
  const fullName = r => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();

  /**
   * Convierte ID o nombre de provincia en texto legible.
   * Usa enumsData solo como reserva.
   */
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

  /**
   * Carga datos desde la API según el filtro.
   * startTransition para no bloquear la UI.
   */
  const loadData = useCallback(async currentFilter => {
    setLoading(true);    // deshabilita select y botón
    charge(true);        // <── tu spinner global

    try {
      const token = getToken();
      const data = await listsResponsiblesAndCoordinators(
        token,
        { [currentFilter]: true }
      );
      setRows(Array.isArray(data) ? data : []);
    } catch (err) {
      modal('Error', err.message || 'No se pudo obtener la información.');
      setRows([]);
    } finally {
      setLoading(false); // vuelve a habilitar
      charge(false);     // <── oculta tu spinner
    }
  }, [charge, modal]);


  // Carga inicial al montar
  useEffect(() => {
    loadData(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recarga cuando cambia filtro
  useEffect(() => {
    loadData(filter);
  }, [filter]);

  /**
   * Agrupa y ordena las filas por programa.
   */
  const grouped = useMemo(() => {
    // compila una sola vez por render
    const rePD = buildRegex(searchPD, setBadPD);
    const reNom = buildRegex(searchNom, setBadNom);

    const filtered = rows.filter(r => {
    // ───── normaliza ambos “haystack” ─────
    const hayPD  = stripAccents(`${r.program} ${r.device ?? ''}`);
    const hayNom = stripAccents(fullName(r));

    const okPD  = !rePD  || rePD.test(hayPD);
    const okNom = !reNom || reNom.test(hayNom);
      return okPD && okNom;
    });
    return filtered.reduce((acc, r) => {
      let grp = acc.find(x => x.program === r.program);
      if (!grp) {
        grp = { program: r.program, programResponsibles: [], deviceRows: [] };
        acc.push(grp);
      }
      if (r.role === 'responsible-program') grp.programResponsibles.push(r);
      else grp.deviceRows.push(r);
      return acc;
    }, []);
  }, [rows, searchPD, searchNom]);

  /**
   * Exporta todas las filas en un único XLS.
   */
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
        { header: 'Rol', key: 'role', width: 22 },
        { header: 'Nombre', key: 'fullName', width: 30 },
        { header: 'Email', key: 'email', width: 30 },
        { header: 'Teléfono', key: 'phone', width: 22 }
      ];
      rows.forEach(r =>
        ws.addRow({
          program: r.program,
          device: r.device || '',
          province: provinceName(r.province),
          role: r.role,
          fullName: fullName(r),
          email: r.email,
          phone: r.phone
        })
      );
      const buffer = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buffer], {
          type:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }),
        'listado_responsables_coordinadores.xlsx'
      );
    } catch (err) {
      modal('Error', err.message || 'No se pudo generar el XLS.');
    } finally {
      charge(false);
    }
  });
};


  return (
    <div className={styles.listContainer}>
      <div className={styles.content}>
        <h3>Listado de Responsables / Coordinadores</h3>

        <h4>Filtros:</h4>
        <div className={styles.cajaFiltros}>
          <select
            className={styles.selector}
            value={filter}
            onChange={e => setFilter(e.target.value)}
            disabled={loading}           // ← deshabilita durante fetch
          >
            {LIST_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          <input
            type="text"
            placeholder="Nombre del Programa o Dispositivo"
            value={searchPD}
            onChange={e => { setSearchPD(e.target.value); setBadPD(false); }}
            className={`${styles.inputSearch} ${badPD ? styles.bad : ''}`}
          />

          <input
            type="text"
            placeholder="Nombre del responsable o coordinador"
            value={searchNom}
            onChange={e => { setSearchNom(e.target.value); setBadNom(false); }}
            className={`${styles.inputSearch} ${badNom ? styles.bad : ''}`}
          />
        </div>


        <div className={styles.sectionButtonExport}>
          <button
            className={styles.btnExport}
            onClick={exportFlatXLS}
            disabled={loading || !rows.length} // no exportar mientras carga
          >
            Exportar XLS
          </button>
        </div>

        {
          grouped.length ?
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Programa / Dispositivo</th>
                  <th>Provincia</th>
                  <th>Rol</th>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Teléfono</th>
                </tr>
              </thead>
              <tbody>
                {grouped.length ? (
                  grouped.map(g => (
                    <React.Fragment key={g.program}>
                      {/* Responsables de programa */}
                      {g.programResponsibles.length ? (
                        g.programResponsibles.map((pr, i) => (
                          <tr key={`pr-${i}`} className={styles.rowProgram}>
                            <td data-label="Program/Dispositivo" >{g.program}</td>
                            <td></td>
                            <td className={styles.roleProgram}>Responsable programa</td>
                            <td>{fullName(pr)}</td>
                            <td>{pr.email}</td>
                            <td>{pr.phone}</td>
                          </tr>
                        ))
                      ) : (
                        <tr className={styles.rowProgramSolo}>
                          <td colSpan={6}>{g.program}</td>
                        </tr>
                      )}

                      {/* Dispositivos y coordinadores */}
                      {g.deviceRows.map((d, j) => (
                        <tr key={`d-${j}`} className={styles.rowDevice}>
                          <td className={styles.deviceCell}>{d.device}</td>
                          <td>{provinceName(d.province)}</td>
                          <td className={(d.role === 'responsible') ? styles.roleR : styles.roleC}>
                            {d.role === 'responsible'
                              ? 'Responsable dispositivo'
                              : 'Coordinador'}
                          </td>
                          <td>{fullName(d)}</td>
                          <td>{d.email}</td>
                          <td>{d.phone}</td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '1rem' }}>
                      Sin datos
                    </td>
                  </tr>
                )}
              </tbody>
            </table>

          </div>
          : <p>No hay resultados</p>
        }


      </div>
    </div>
  );
}
