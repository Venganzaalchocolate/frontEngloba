// InfoAuditPanelProgram.jsx
import React, { useEffect, useState, useMemo } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
import { FaCircleExclamation, FaSquareCaretDown, FaSquareCaretUp } from 'react-icons/fa6';
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { getToken } from '../../lib/serviceToken';
import { usersName } from '../../lib/data';

export const OPTIONAL_FIELDS_INFO_PROGRAM = [
  { value: 'area', label: 'Área' },
  { value: 'responsible', label: 'Responsable(s)' },
  { value: 'finantial', label: 'Financiación' },
  { value: 'about.description', label: 'Descripción' },
  { value: 'about.objectives', label: 'Objetivos' },
  { value: 'about.profile', label: 'Perfil' },
];

const getValue = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);

const InfoAuditPanelProgram = ({
  selectedProgramFields,
  setSelectedProgramFields,
  result,
  runAudit,
  charge,
  enumsData
}) => {
  const [showExport, setShowExport] = useState(false);
  const [showExportPerProg, setShowExportPerProg] = useState(false);
  const [programSelected, setProgramSelected] = useState(null);
  const [responsiblesProgram, setResponsiblesProgram] = useState(null);
  const [userMap, setUserMap] = useState({});   

  // 1) Agrupar TODOS los IDs y hacer UNA sola llamada
  useEffect(() => {
    if (!Array.isArray(result)) {
      setUserMap({});
      return;
    }
    const token = getToken();

    // IDs de responsables de programa
    const progIds = result.flatMap(p => p.responsible || []);
    // IDs de responsables y coordinadores de dispositivos dentro de cada programa
    const devResIds = result.flatMap(p =>
      (p.devices || []).flatMap(d => d.responsible || [])
    );
    const devCoordIds = result.flatMap(p =>
      (p.devices || []).flatMap(d => d.coordinators || [])
    );

    const allIds = Array.from(new Set([...progIds, ...devResIds, ...devCoordIds]));
    if (allIds.length === 0) {
      setUserMap({});
      return;
    }

    usersName({ ids: allIds }, token)
      .then(users => {
        const map = {};
        users.forEach(u => {
          map[u._id] = `${u.firstName} ${u.lastName}`;
        });
        setUserMap(map);
      })
      .catch(() => setUserMap({}));
  }, [result]);

  useEffect(() => {
    if (selectedProgramFields.length) runAudit();
    setProgramSelected(null);
  }, [selectedProgramFields]);

  const finantialMap = useMemo(() => {
        if (!enumsData?.finantial) return {};
        return enumsData.finantial.reduce((acc, f) => {
          acc[f._id] = f.name;
          return acc;
        }, {});
      }, [enumsData]);

  const enrichedPrograms = useMemo(() => {
    if (!Array.isArray(result)) return [];
    return result.map(p => {
      const finantialNames = (p.finantial || []).map(id => finantialMap[id] || id);
      const programMissing = selectedProgramFields.filter(k => {
        const v = getValue(p, k);
        return Array.isArray(v) ? v.length === 0 : v == null || v === '';
      });
      return {
        
        ...p,
        finantial: finantialNames,
        programMissing: programMissing.map(
          k => OPTIONAL_FIELDS_INFO_PROGRAM.find(o => o.value === k)?.label || k
        ),
        devicesWithMissing: (p.devices || []).map(d => ({
          ...d,
          finantial: (d.finantial || []).map(id => finantialMap[id] || id),
          missingDevice: selectedProgramFields.filter(k => {
            const v = getValue(d, k);
            return Array.isArray(v) ? v.length === 0 : v == null || v === '';
          }).map(
            k => OPTIONAL_FIELDS_INFO_PROGRAM.find(o => o.value === k)?.label || k
          )
        }))
      };
    });
  }, [result, selectedProgramFields]);

  const xlsFieldDefs = [
    { key: 'name', label: 'Programa', type: 'text' },
    { key: 'acronym', label: 'Siglas', type: 'text' },
    { key: 'area', label: 'Área', type: 'text' },
    { key: 'responsible', label: 'Responsable(s)', type: 'array' },
    { key: 'finantial', label: 'Financiación', type: 'array' },
    { key: 'about.description', label: 'Descripción', type: 'text' },
    { key: 'about.objectives', label: 'Objetivos', type: 'text' },
    { key: 'about.profile', label: 'Perfil', type: 'text' },
    { key: 'programMissing', label: 'Doc. faltante', type: 'array' },
    { key: 'deviceCount', label: 'Nº dispositivos', type: 'text' },
  ];

  const handleExportPerProgram = async (rows, keys) => {
    const zip = new JSZip();
    for (const prog of rows) {
      const wb = new ExcelJS.Workbook();

      // Hoja Programa
      const ws = wb.addWorksheet('Programa');
      ws.columns = xlsFieldDefs
        .filter(def => keys.includes(def.key))
        .map(def => ({ header: def.label, key: def.key, width: 25 }));
      ws.addRow({
        ...prog,
        finantial: prog.finantial,
        responsible: (prog.responsible || []).map(id => userMap[id] || ''),
        deviceCount: prog.devicesWithMissing.length,
        programMissing: prog.programMissing
      });

      // Hoja Dispositivos
      const wsDev = wb.addWorksheet('Dispositivos');
      wsDev.columns = OPTIONAL_FIELDS_INFO_PROGRAM
        .map(def => ({ header: def.label, key: def.value, width: 25 }))
        .concat([{ header: 'Campos faltantes', key: 'missingDevice', width: 40 }]);
      prog.devicesWithMissing.forEach(d => {
        wsDev.addRow({
          ...d,
          finantial: d.finantial,
          responsible: (d.responsible || []).map(id => userMap[id] || ''),
          coordinators: (d.coordinators || []).map(id => userMap[id] || ''),
          missingDevice: d.missingDevice
        });
      });

      const buf = await wb.xlsx.writeBuffer();
      zip.file(`${prog.acronym || prog.name}.xlsx`, buf);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'programas_auditoria.zip');
    setShowExportPerProg(false);
  };

  const chargeResponsibles = async ids => {
    charge(true);
    const token = getToken();
    const users = await usersName({ ids: ids.responsibles }, token);
    if (Array.isArray(users)) setResponsiblesProgram(users);
    charge(false);
  };

  const changeProgramSelected = async p => {
    if (programSelected?._id === p._id) {
      setProgramSelected(null);
    } else {
      setProgramSelected(p);
      if (p.responsible?.length) await chargeResponsibles({ responsibles: p.responsible });
    }
  };

  const display = v =>
    v != null && v !== '' ? v : 'No existe información';

  return (
    <>
      <h3>Elige campos de Programa a auditar</h3>
      <fieldset className={styles.fieldsetCheckbox}>
        {OPTIONAL_FIELDS_INFO_PROGRAM.map(({ value, label }) => (
          <label key={value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedProgramFields.includes(value)}
              onChange={() =>
                setSelectedProgramFields(prev =>
                  prev.includes(value)
                    ? prev.filter(f => f !== value)
                    : [...prev, value]
                )
              }
            />
            {label}
          </label>
        ))}
      </fieldset>

      {result && selectedProgramFields.length > 0 && (
        <div className={styles.auditResult}>
          <h4 className={styles.sectionTitle}>
          <p>{result.length}</p> PROGRAMAS{' '}
            <button onClick={() => setShowExport(true)}>xml</button>{' '}
            <button onClick={() => setShowExportPerProg(true)}>xml por programa</button>
          </h4>

          {Array.isArray(result) ? (
            (() => {
              const missing = result.filter(p =>
                OPTIONAL_FIELDS_INFO_PROGRAM.some(f =>
                  selectedProgramFields.includes(f.value) &&
                  (() => {
                    const v = getValue(p, f.value);
                    return Array.isArray(v) ? v.length === 0 : v == null || v === '';
                  })()
                )
              );
              if (!missing.length) return <p>No hay programas con campos vacíos.</p>;
              return (
                <ul className={styles.ulBlock}>
                  {missing.map(p => {
                    const labels = OPTIONAL_FIELDS_INFO_PROGRAM
                      .filter(f =>
                        selectedProgramFields.includes(f.value) &&
                        (() => {
                          const v = getValue(p, f.value);
                          return Array.isArray(v) ? v.length === 0 : v == null || v === '';
                        })()
                      )
                      .map(f => f.label);
                    return (
                      <li key={p._id} className={styles.auditItem}>
                        <div className={styles.auditHeader}>
                          {programSelected?._id === p._id ? (
                            <FaSquareCaretUp onClick={() => changeProgramSelected(p)} />
                          ) : (
                            <FaSquareCaretDown onClick={() => changeProgramSelected(p)} />
                          )}
                          <span className={styles.userName}>{p.name}</span>
                        </div>
                        <div className={styles.auditBody}>
                          <div className={styles.infoRowMissing}>
                            <FaCircleExclamation />
                            <span className={styles.infoText}>{labels.join(', ')}</span>
                          </div>
                        </div>
                        {programSelected?._id === p._id && (
                          <div className={styles.infoAditional}>
                            <h4>{display(p.name)}</h4>
                            <p><strong>Área:</strong> {display(p.area).toUpperCase()}</p>
                            <p>
                              <strong>Responsable:</strong>{' '}
                              {(responsiblesProgram || []).map(u => (
                                <span key={u._id}>{u.firstName} {u.lastName}</span>
                              )) || ' No existe información'}
                            </p>
                            <p>
                              <strong>Dispositivos:</strong>{' '}
                              {(p.devices || []).length
                                ? p.devices.map(d => <p key={d._id}>{d.name}</p>)
                                : ' No tiene dispositivos'}
                            </p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              );
            })()
          ) : (
            <p className={styles.errorMsg}>
              <FaCircleExclamation /> {result.error}
            </p>
          )}
{showExport && (
            <GenericXLSExport
              data={enrichedPrograms.map(p => ({
                ...p,
                responsible: (p.responsible || []).map(id => userMap[id] || ''),
                deviceCount: p.devicesWithMissing.length
              }))}
              fields={xlsFieldDefs}
              fileName="programas_auditoria.xlsx"
              modalTitle="Exportar Programas a XLS"
              modalMessage="Selecciona columnas para el XLS:"
              onClose={() => setShowExport(false)}
            />
          )}

          {showExportPerProg && (
            <GenericXLSExport
              data={enrichedPrograms}
              fields={xlsFieldDefs}
              modalTitle="XLS por Programa"
              modalMessage="Selecciona columnas para cada XLS por programa:"
              onExport={handleExportPerProgram}
              onClose={() => setShowExportPerProg(false)}
            />
          )}
        </div>
      )}
    </>
  );
};

export default InfoAuditPanelProgram;