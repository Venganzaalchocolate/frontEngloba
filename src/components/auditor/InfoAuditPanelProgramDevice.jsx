import React, { useEffect, useState, useMemo } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
import { FaSquareCaretDown, FaSquareCaretUp } from 'react-icons/fa6';
import { FaCircleExclamation, FaServer } from 'react-icons/fa6';
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

/** OPTIONAL FIELDS DEFINITION **/
export const OPTIONAL_FIELDS_INFO_PROGRAM = [
  { value: 'area', label: 'Área' },
  { value: 'responsible', label: 'Responsable(s)' },
  { value: 'finantial', label: 'Financiación' },
  { value: 'about.description', label: 'Descripción' },
  { value: 'about.objectives', label: 'Objetivos' },
  { value: 'about.profile', label: 'Perfil' },
];

export const OPTIONAL_FIELDS_INFO_DEVICE = [
  { value: 'name', label: 'Nombre dispositivo' },
  { value: 'address', label: 'Dirección' },
  { value: 'email', label: 'Email' },
  { value: 'phone', label: 'Teléfono' },
  { value: 'responsible', label: 'Responsable(s)' },
  { value: 'province', label: 'Provincia' },
  { value: 'coordinators', label: 'Coordinador(es)' },
];

/***************** UTILITIES *****************/
/**
 * Deep get util allowing dotted paths like "about.description"  */
const getValue = (obj, path) => {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, key) => (acc ? acc[key] : undefined), obj);
};

const display = (val) =>
  val !== null && val !== undefined && val !== '' && !(Array.isArray(val) && val.length === 0)
    ? val
    : 'No existe información';

/***************** MAIN COMPONENT *****************/
const InfoAuditPanelProgramDevice = ({
  selectedProgramFields,
  setSelectedProgramFields,
  selectedDeviceFields,
  setSelectedDeviceFields,
  result, // lista de programas ya poblados con devices
  runAudit,
}) => {
  const [programSelected, setProgramSelected] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showExportByProgram, setShowExportByProgram] = useState(false);

  /** Ejecutar auditoría cuando cambien los campos seleccionados **/
  useEffect(() => {
    if (selectedProgramFields.length || selectedDeviceFields.length) runAudit();
  }, [selectedProgramFields, selectedDeviceFields]);

  const changeProgramSelected = (p) => {
    if (programSelected?._id === p._id) setProgramSelected(null);
    else setProgramSelected(p);
  };

  /******** Enriquecer los programas para export ***/
  const enrichedPrograms = useMemo(() => {
    return result?.map((p) => {
      /** program level info */
      const missingProgram = selectedProgramFields.filter((k) => {
        const v = getValue(p, k);
        return Array.isArray(v) ? v.length === 0 : v == null || v === '';
      });

      /** device level info (aggregate) */
      const devicesWithMissing = (p.devices || []).map((d) => {
        const missingDevice = selectedDeviceFields.filter((k) => {
          const v = getValue(d, k);
          return Array.isArray(v) ? v.length === 0 : v == null || v === '';
        });
        return {
          ...d.toObject?.() || d,
          missingDevice: missingDevice.map((k) => OPTIONAL_FIELDS_INFO_DEVICE.find((o) => o.value === k)?.label || k),
        };
      });

      return {
        ...p,
        programMissing: missingProgram.map((k) => OPTIONAL_FIELDS_INFO_PROGRAM.find((o) => o.value === k)?.label || k),
        devicesWithMissing,
      };
    });
  }, [result, selectedProgramFields, selectedDeviceFields]);

  /******** XLS columns definition (flat) ******/
  const xlsFieldDefs = useMemo(
    () => [
      { key: 'name', label: 'Programa', type: 'text' },
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

  /********* Export por programa ***********/
  const handleProgramExport = async (rows, keys) => {
    const zip = new JSZip();
    for (const prog of rows) {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Programa');
      /** columnas dinámicas seleccionadas **/
      ws.columns = xlsFieldDefs
        .filter((def) => keys.includes(def.key))
        .map((def) => ({ header: def.label, key: def.key, width: 25 }));
      ws.addRow({
        ...prog,
        deviceCount: prog.devicesWithMissing.length,
      });

      /** Devices sheet **/
      const wsDev = workbook.addWorksheet('Dispositivos');
      wsDev.columns = OPTIONAL_FIELDS_INFO_DEVICE.map((def) => ({ header: def.label, key: def.value, width: 25 })).concat([
        { header: 'Campos faltantes', key: 'missingDevice', width: 40 },
      ]);
      prog.devicesWithMissing.forEach((d) => {
        wsDev.addRow({ ...d });
      });

      const buf = await workbook.xlsx.writeBuffer();
      const filename = `${prog.acronym || prog.name}.xlsx`;
      zip.file(filename, buf);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'programas_auditoria.zip');
    setShowExportByProgram(false);
  };

  return (
    <>
      <h3>Elige campos de Programa y Dispositivos a auditar</h3>
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

      {result && (selectedProgramFields.length > 0 || selectedDeviceFields.length > 0) && (
        <div className={styles.auditResult}>
          {Array.isArray(result) && result.length > 0 ? (
            <>
              <h4>
                PROGRAMAS
                <button onClick={() => setShowExport(true)}>xls</button>
                <button onClick={() => setShowExportByProgram(true)}>xls por programa</button>
              </h4>

              <ul className={styles.ulBlock}>
                {result.map((p) => {
                  const programMissingLabels = OPTIONAL_FIELDS_INFO_PROGRAM.filter((f) => {
                    const v = getValue(p, f.value);
                    return Array.isArray(v) ? v.length === 0 : v == null || v === '';
                  }).map((f) => f.label);

                  return (
                    <li key={p._id} className={styles.auditItem}>
                      <div className={styles.auditHeader}>
                        {programSelected?._id === p._id ? (
                          <FaSquareCaretUp onClick={() => changeProgramSelected(p)} />
                        ) : (
                          <FaSquareCaretDown onClick={() => changeProgramSelected(p)} />
                        )}
                        <span className={styles.userName}>{p.name}</span>
                        <span>|</span>
                        <span className={styles.infoText}>{p.acronym}</span>
                        <span>|</span>
                        <span className={styles.infoText}>{p.area}</span>
                        <span>|</span>
                        <span className={styles.infoText}>{p.devices?.length || 0} dispositivos</span>
                      </div>

                      <div className={styles.auditBody}>
                        {programMissingLabels.length > 0 && (
                          <div className={styles.infoRowMissing}>
                            <FaCircleExclamation />
                            <span className={styles.infoText}>{programMissingLabels.join(', ')}</span>
                          </div>
                        )}
                      </div>

                      {programSelected?._id === p._id && (
                        <div className={styles.infoAditional}>
                          <h4>{display(p.name)}</h4>
                          <p>
                            <strong>Área:</strong> {display(p.area)}
                          </p>
                          <p>
                            <strong>Responsables:</strong>{' '}
                            {Array.isArray(p.responsible) && p.responsible.length > 0
                              ? p.responsible.map((r) => r?.fullName || r).join(', ')
                              : 'No existe información'}
                          </p>
                          <p>
                            <strong>Financiación:</strong>{' '}
                            {Array.isArray(p.finantial) && p.finantial.length > 0
                              ? p.finantial.map((f) => f?.name || f).join(', ')
                              : 'No existe información'}
                          </p>
                          <p>
                            <strong>Descripción:</strong> {display(p.about?.description)}
                          </p>
                          <p>
                            <strong>Objetivos:</strong> {display(p.about?.objectives)}
                          </p>
                          <p>
                            <strong>Perfil:</strong> {display(p.about?.profile)}
                          </p>

                          <h5>Dispositivos</h5>
                          <ul className={styles.ulBlockNested}>
                            {p.devices?.map((d, idx) => {
                              const deviceMissingLabels = OPTIONAL_FIELDS_INFO_DEVICE.filter((f) => {
                                const v = getValue(d, f.value);
                                return Array.isArray(v) ? v.length === 0 : v == null || v === '';
                              }).map((f) => f.label);

                              return (
                                <li key={d._id || idx} className={styles.auditItemNested}>
                                  <div className={styles.auditHeaderNested}>
                                    <FaServer />
                                    <span className={styles.userName}>{d.name || '—'}</span>
                                  </div>

                                  {deviceMissingLabels.length > 0 && (
                                    <div className={styles.infoRowMissing}>
                                      <FaCircleExclamation />
                                      <span className={styles.infoText}>{deviceMissingLabels.join(', ')}</span>
                                    </div>
                                  )}
                                </li>
                              );
                            })}
                          </ul>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p>No se encontraron programas con estos campos vacíos.</p>
          )}

          {showExport && (
            <GenericXLSExport
              data={enrichedPrograms.map((p) => ({ ...p, deviceCount: p.devicesWithMissing.length }))}
              fields={xlsFieldDefs}
              fileName="programas_auditoria.xlsx"
              modalTitle="Exportar Programas a XLS"
              modalMessage="Selecciona columnas para el XLS:"
              onClose={() => setShowExport(false)}
            />
          )}

          {showExportByProgram && (
            <GenericXLSExport
              data={enrichedPrograms}
              fields={xlsFieldDefs}
              modalTitle="XLS por Programa"
              modalMessage="Selecciona columnas para cada XLS por programa:"
              onExport={handleProgramExport}
              onClose={() => setShowExportByProgram(false)}
            />
          )}
        </div>
      )}
    </>
  );
};

export default InfoAuditPanelProgramDevice;
