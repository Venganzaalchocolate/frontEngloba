import React, { useEffect, useState, useMemo } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
import { FaCircleExclamation } from 'react-icons/fa6';
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

/* ---------- DEFINICIÓN DE CAMPOS OPCIONALES ---------- */
export const OPTIONAL_FIELDS_INFO_PROGRAM = [
  { value: 'area',               label: 'Área' },
  { value: 'responsible',        label: 'Responsable(s)' },
  { value: 'finantial',          label: 'Financiación' },
  { value: 'about.description',  label: 'Descripción' },
  { value: 'about.objectives',   label: 'Objetivos' },
  { value: 'about.profile',      label: 'Perfil' },
];

export const OPTIONAL_FIELDS_INFO_DEVICE = [
  { value: 'name',         label: 'Nombre dispositivo' },
  { value: 'address',      label: 'Dirección' },
  { value: 'email',        label: 'Email' },
  { value: 'phone',        label: 'Teléfono' },
  { value: 'responsible',  label: 'Responsable(s)' },
  { value: 'province',     label: 'Provincia' },
  { value: 'coordinators', label: 'Coordinador(es)' },
];

/* ---------- UTILIDADES ---------- */
const getValue = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);

/* ---------- COMPONENTE PRINCIPAL ---------- */
const InfoAuditPanelProgramDevice = ({
  selectedProgramFields,
  setSelectedProgramFields,
  selectedDeviceFields,
  setSelectedDeviceFields,
  result,
  runAudit,
}) => {
  const [showExport,        setShowExport]        = useState(false);
  const [showExportPerProg, setShowExportPerProg] = useState(false);

  /* Ejecutar auditoría cuando cambien los check-boxes */
  useEffect(() => {
    if (selectedProgramFields.length || selectedDeviceFields.length) runAudit();
  }, [selectedProgramFields, selectedDeviceFields]);

  /* -------- Enriquecer programas para exportación -------- */
  const enrichedPrograms = useMemo(() => {
    if (!Array.isArray(result)) return [];
    return result.map((p) => {
      const programMissing = selectedProgramFields.filter((k) => {
        const v = getValue(p, k);
        return Array.isArray(v) ? v.length === 0 : v == null || v === '';
      });
      const devicesWithMissing = (p.devices || []).map((d) => {
        const missingDevice = selectedDeviceFields.filter((k) => {
          const v = getValue(d, k);
          return Array.isArray(v) ? v.length === 0 : v == null || v === '';
        });
        return {
          ...(d.toObject?.() || d),
          missingDevice: missingDevice.map(
            (k) => OPTIONAL_FIELDS_INFO_DEVICE.find((o) => o.value === k)?.label || k
          ),
        };
      });
      return {
        ...p,
        programMissing: programMissing.map(
          (k) => OPTIONAL_FIELDS_INFO_PROGRAM.find((o) => o.value === k)?.label || k
        ),
        devicesWithMissing,
      };
    });
  }, [result, selectedProgramFields, selectedDeviceFields]);

  /* -------- Columnas XLS -------- */
  const xlsFieldDefs = useMemo(
    () => [
      { key: 'name',  label: 'Programa', type: 'text' },
      { key: 'acronym', label: 'Siglas', type: 'text' },
      { key: 'area', label: 'Área', type: 'text' },
      { key: 'responsible', label: 'Responsable(s)', type: 'array' },
      { key: 'finantial', label: 'Financiación', type: 'array' },
      { key: 'about.description', label: 'Descripción', type: 'text' },
      { key: 'about.objectives', label: 'Objetivos', type: 'text' },
      { key: 'about.profile', label: 'Perfil', type: 'text' },
      { key: 'programMissing', label: 'Documentación programa faltante', type: 'array' },
      { key: 'deviceCount', label: 'Nº dispositivos', type: 'text' },
    ],
    []
  );

  /* -------- Export XLS por programa -------- */
  const handleExportPerProgram = async (rows, keys) => {
    const zip = new JSZip();
    for (const prog of rows) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Programa');
      ws.columns = xlsFieldDefs
        .filter((def) => keys.includes(def.key))
        .map((def) => ({ header: def.label, key: def.key, width: 25 }));
      ws.addRow({ ...prog, deviceCount: prog.devicesWithMissing.length });
      const wsDev = wb.addWorksheet('Dispositivos');
      wsDev.columns = OPTIONAL_FIELDS_INFO_DEVICE
        .map((def) => ({ header: def.label, key: def.value, width: 25 }))
        .concat([{ header: 'Campos faltantes', key: 'missingDevice', width: 40 }]);
      prog.devicesWithMissing.forEach((d) => wsDev.addRow({ ...d }));
      const buf = await wb.xlsx.writeBuffer();
      zip.file(`${prog.acronym || prog.name}.xlsx`, buf);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'programas_auditoria.zip');
    setShowExportPerProg(false);
  };

  /* ======================= RENDER ======================= */
  return (
    <>
      <h3>Elige campos de Programa y Dispositivos a auditar</h3>

      {/* CHECK-BOXES */}
      <div className={styles.checkboxGroupDual}>
        <fieldset className={styles.fieldsetCheckbox}>
          <legend>Programa</legend>
          {OPTIONAL_FIELDS_INFO_PROGRAM.map(({ value, label }) => (
            <label key={value} className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={selectedProgramFields.includes(value)}
                onChange={() =>
                  setSelectedProgramFields((prev) =>
                    prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
                  )
                }
              />
              {label}
            </label>
          ))}
        </fieldset>

        <fieldset className={styles.fieldsetCheckbox}>
          <legend>Dispositivos</legend>
          {OPTIONAL_FIELDS_INFO_DEVICE.map(({ value, label }) => (
            <label key={value} className={styles.checkboxOption}>
              <input
                type="checkbox"
                checked={selectedDeviceFields.includes(value)}
                onChange={() =>
                  setSelectedDeviceFields((prev) =>
                    prev.includes(value) ? prev.filter((f) => f !== value) : [...prev, value]
                  )
                }
              />
              {label}
            </label>
          ))}
        </fieldset>
      </div>

      {/* RESULTADOS */}
      {result && (selectedProgramFields.length>0 || selectedDeviceFields.length>0) && (
        <div className={styles.auditResult}>
          {/* PROGRAMAS */}
          {selectedProgramFields.length > 0 && (
            <>
              <h4 className={styles.sectionTitle}>PROGRAMAS</h4>
              {Array.isArray(result) ? (
                (() => {
                  const programsMissing = result.filter((p) =>
                    OPTIONAL_FIELDS_INFO_PROGRAM.some(
                      (f) =>
                        selectedProgramFields.includes(f.value) &&
                        (() => {
                          const v = getValue(p, f.value);
                          return Array.isArray(v) ? v.length === 0 : v == null || v === '';
                        })()
                    )
                  );

                  if (programsMissing.length === 0) {
                    return <p>No hay programas con los campos seleccionados vacíos.</p>;
                  }

                  return (
                    <ul className={styles.ulBlock}>
                      {programsMissing.map((p) => {
                        const labels = OPTIONAL_FIELDS_INFO_PROGRAM
                          .filter(
                            (f) =>
                              selectedProgramFields.includes(f.value) &&
                              (() => {
                                const v = getValue(p, f.value);
                                return Array.isArray(v) ? v.length === 0 : v == null || v === '';
                              })()
                          )
                          .map((f) => f.label);

                        return (
                          <li key={p._id} className={styles.auditItem}>
                            <strong className={styles.userName}>{p.name}</strong>{' '}
                            - <span className={styles.infoText}>{labels.join(', ')}</span>
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
            </>
          )}

          {/* DISPOSITIVOS */}
          {selectedDeviceFields.length > 0 && (
            <>
              <h4 className={styles.sectionTitle}>DISPOSITIVOS</h4>
              {Array.isArray(result) ? (
                (() => {
                  const devicesMissing = result
                    .flatMap((p) =>
                      (p.devices || []).map((d) => ({ ...d, programName: p.name }))
                    )
                    .filter((d) =>
                      OPTIONAL_FIELDS_INFO_DEVICE.some(
                        (f) =>
                          selectedDeviceFields.includes(f.value) &&
                          (() => {
                            const v = getValue(d, f.value);
                            return Array.isArray(v) ? v.length === 0 : v == null || v === '';
                          })()
                      )
                    );

                  if (devicesMissing.length === 0) {
                    return <p>No hay dispositivos con los campos seleccionados vacíos.</p>;
                  }

                  return (
                    <ul className={styles.ulBlock}>
                      {devicesMissing.map((d, idx) => {
                        const labels = OPTIONAL_FIELDS_INFO_DEVICE
                          .filter(
                            (f) =>
                              selectedDeviceFields.includes(f.value) &&
                              (() => {
                                const v = getValue(d, f.value);
                                return Array.isArray(v) ? v.length === 0 : v == null || v === '';
                              })()
                          )
                          .map((f) => f.label);

                        return (
                          <li key={d._id || idx} className={styles.auditItemNested}>
                            <strong>{d.name || '—'}</strong>{' '}
                            <em>(Programa: {d.programName})</em>{' '}
                            - <span className={styles.infoText}>{labels.join(', ')}</span>
                          </li>
                        );
                      })}
                    </ul>
                  );
                })()
              ) : null}
            </>
          )}

          {/* BOTONES EXPORT */}
          {Array.isArray(result) && enrichedPrograms.length > 0 && (
            <div className={styles.exportButtons}>
              <button onClick={() => setShowExport(true)}>Exportar XLS (todo junto)</button>
              <button onClick={() => setShowExportPerProg(true)}>Exportar XLS por programa</button>
            </div>
          )}

          {/* MODALES EXPORT */}
          {showExport && (
            <GenericXLSExport
              data={enrichedPrograms.map((p) => ({
                ...p,
                deviceCount: p.devicesWithMissing.length,
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

export default InfoAuditPanelProgramDevice;
