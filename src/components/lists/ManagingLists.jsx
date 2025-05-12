import React, { useEffect, useMemo, useState } from 'react';
import ExcelJS        from 'exceljs';
import { saveAs }     from 'file-saver';
import styles         from '../styles/ManagingLists.module.css';
import { listsResponsiblesAndCoordinators } from '../../lib/data';
import { getToken }   from '../../lib/serviceToken';

/* Opciones del selector */
export const LIST_OPTIONS = [
  { value: 'responsible',  label: 'Responsables' },
  { value: 'coordinators', label: 'Coordinadores' },
  { value: 'resAndCorr',   label: 'Responsables y Coordinadores' }
];

/* ------------------------------------------------------------ */
/*  Componente                                                  */
/* ------------------------------------------------------------ */
const ManagingLists = ({ enumsData, modal, charge }) => {
  const [filter, setFilter] = useState(LIST_OPTIONS[0].value);
  const [rows,   setRows]   = useState([]);

  /* ------------------- helpers --------------------------------------- */
  const fullName = r => `${r.firstName ?? ''} ${r.lastName ?? ''}`.trim();

  /*  La API ya nos envía el nombre de la provincia.  
      Si algún día volviera a venir un _id_, intentamos resolverlo
      con enumsData como reserva de seguridad.                        */
  const provinceName = val => {
    if (!val) return 'Sin provincia';
    if (typeof val === 'string') return val.trim();

    if (enumsData?.provinces) {
      for (const p of enumsData.provinces) {
        if (p._id === val) return p.name;
        if (p.subcategories) {
          const sub = p.subcategories.find(s => s._id === val);
          if (sub) return `${p.name} – ${sub.name}`;
        }
      }
    }
    return 'Sin provincia';
  };

  const bodyByFilter = () =>
    filter === 'responsible'
      ? { responsibles: true }
      : filter === 'coordinators'
      ? { coordinators: true }
      : { resAndCorr: true };

  /* ------------------- carga ---------------------------------------- */
  useEffect(() => {
    const load = async () => {
      charge(true);
      try {
        const token = getToken();
        const data  = await listsResponsiblesAndCoordinators(token, bodyByFilter());
        setRows(Array.isArray(data) ? data : []);
      } catch (err) {
        modal('Error', err.message || 'No se pudo obtener la información.');
        setRows([]);
      } finally {
        charge(false);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  /* -------------- agrupar y ordenar por programa -------------------- */
  const grouped = useMemo(() => {
    const ordered = [...rows].sort((a, b) =>
      a.program.localeCompare(b.program, 'es', { sensitivity: 'base' })
    );

    return ordered.reduce((acc, r) => {
      let g = acc.find(x => x.program === r.program);
      if (!g) {
        g = { program: r.program, programResponsibles: [], deviceRows: [] };
        acc.push(g);
      }
      if (r.role === 'responsible-program') g.programResponsibles.push(r);
      else g.deviceRows.push(r);
      return acc;
    }, []);
  }, [rows]);

  /* -------------------- exportaciones ------------------------------- */
  const exportFlatXLS = async () => {
    if (!rows.length) return modal('Aviso', 'No hay datos para exportar.');
    charge(true);
    try {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Listado');
      ws.columns = [
        { header: 'Programa',    key: 'program',  width: 30 },
        { header: 'Dispositivo', key: 'device',   width: 30 },
        { header: 'Provincia',   key: 'province', width: 25 },
        { header: 'Rol',         key: 'role',     width: 20 },
        { header: 'Nombre',      key: 'fullName', width: 30 },
        { header: 'Email',       key: 'email',    width: 30 },
        { header: 'Teléfono',    key: 'phone',    width: 22 }
      ];
      rows.forEach(r =>
        ws.addRow({
          ...r,
          device   : r.device || '',
          province : provinceName(r.province),
          fullName : fullName(r)
        })
      );
      const buf = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buf], { type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        'listado_responsables_coordinadores.xlsx'
      );
    } catch (err) {
      modal('Error', err.message || 'No se pudo generar el XLS.');
    } finally {
      charge(false);
    }
  };

  const exportByProvinceXLS = async () => {
    if (!rows.length) return modal('Aviso', 'No hay datos para exportar.');
    charge(true);
    try {
      const wb = new ExcelJS.Workbook();
      const groupedProv = {};
      rows.forEach(r => {
        const prov = provinceName(r.province);
        (groupedProv[prov] = groupedProv[prov] || []).push(r);
      });

      Object.entries(groupedProv).forEach(([prov, list]) => {
        const ws = wb.addWorksheet((prov || 'Sin provincia').slice(0, 31));
        ws.columns = [
          { header: 'Programa',    key: 'program',  width: 30 },
          { header: 'Dispositivo', key: 'device',   width: 30 },
          { header: 'Rol',         key: 'role',     width: 20 },
          { header: 'Nombre',      key: 'fullName', width: 30 },
          { header: 'Email',       key: 'email',    width: 30 },
          { header: 'Teléfono',    key: 'phone',    width: 22 }
        ];
        list.forEach(r =>
          ws.addRow({
            ...r,
            device   : r.device || '',
            fullName : fullName(r)
          })
        );
      });

      const buf = await wb.xlsx.writeBuffer();
      saveAs(
        new Blob([buf], { type:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
        'listado_por_provincia.xlsx'
      );
    } catch (err) {
      modal('Error', err.message || 'No se pudo generar el XLS.');
    } finally {
      charge(false);
    }
  };

  /* --------------------------- render ------------------------------- */
  return (
    <div className={styles.listContainer}>
      <div className={styles.content}>
        <h3>Listado de Responsables / Coordinadores</h3>

        <select
          className={styles.selector}
          value={filter}
          onChange={e => setFilter(e.target.value)}
        >
          {LIST_OPTIONS.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>

        <div className={styles.sectionButtonExport}>
          <button className={styles.btnExport} onClick={exportFlatXLS}>
            XLS (una hoja)
          </button>
          <button className={styles.btnExport} onClick={exportByProvinceXLS}>
            XLS (por provincia)
          </button>
        </div>

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
                    {/* Encabezado programa */}
                    {g.programResponsibles.length ? (
                      g.programResponsibles.map((pr, i) => (
                        <tr key={`pr-${i}`} className={styles.rowProgram}>
                          <td>{g.program}</td>
                          <td>{provinceName(pr.province)}</td>
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

                    {/* Dispositivos */}
                    {g.deviceRows.map((d, j) => (
                      <tr key={`d-${j}`} className={styles.rowDevice}>
                        <td className={styles.deviceCell}>{d.device}</td>
                        <td>{provinceName(d.province)}</td>
                        <td
                          className={
                            d.role === 'responsible'
                              ? styles.roleDevice
                              : styles.roleCoordinator
                          }
                        >
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
      </div>
    </div>
  );
};

export default ManagingLists;
