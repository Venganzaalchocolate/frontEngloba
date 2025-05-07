import React, { useEffect, useState, useMemo } from 'react';
import {
  FaCircleExclamation,
  FaHourglassEnd,
  FaSquareCaretDown,
  FaSquareCaretUp
} from 'react-icons/fa6';
import styles from '../styles/ManagingAuditors.module.css';
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { getToken } from '../../lib/serviceToken';
import { usersName } from '../../lib/data';

const display = val => val !== null && val !== undefined && val !== '' ? val : 'No existe información';

const InfoAuditPanelDeviceDocs = ({
  enumsData,
  selectedDocumentationFields,
  setSelectedDocumentationFields,
  result,
  runAudit,
  charge
}) => {
  const [deviceSelected, setDeviceSelected] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showExportByDevice, setShowExportByDevice] = useState(false);
  const [userMap, setUserMap] = useState({});

  // Cargar usuarios (responsables y coordinadores)
  useEffect(() => {
    if (!Array.isArray(result)) {
      setUserMap({});
      return;
    }

    const token = getToken();
    const allIds = Array.from(new Set(
      result.flatMap(device =>
        [...(device.responsible || []), ...(device.coordinators || [])]
      )
    ));

    if (allIds.length === 0) {
      setUserMap({});
      return;
    }

    usersName({ ids: allIds }, token)
      .then(users => {
        const map = {};
        users.forEach(u => { map[u._id] = `${u.firstName} ${u.lastName}`; });
        setUserMap(map);
      })
      .catch(() => setUserMap({}));
  }, [result]);

  // Documentación oficial para dispositivos
  const officialDocs = useMemo(() => {
    if (!enumsData?.documentation) return [];
    return enumsData.documentation
      .filter(d => d.model === 'Program')
      .map(d => ({ value: d._id.toString(), label: d.label }));
  }, [enumsData]);

  // Disparar auditoría al seleccionar documentos
  useEffect(() => {
    if (selectedDocumentationFields.length > 0) {
      runAudit({ docIds: selectedDocumentationFields });
    }
    setDeviceSelected(null);
  }, [selectedDocumentationFields]);

  const mapDocsToLabels = (docIds, docs) =>
    docIds.map(docId => {
      const idStr = docId.toString();
      const doc = docs.find(o => o.value === idStr);
      return doc ? doc.label : idStr;
    });

  const enrichedDevices = useMemo(() => {
    if (!Array.isArray(result)) return [];

    return result.map(device => ({
      ...device,
      missingDocs: mapDocsToLabels(device.missingDocs || [], officialDocs),
      expiredDocs: mapDocsToLabels(device.expiredDocs || [], officialDocs),
      responsibleNames: (device.responsible || []).map(id => userMap[id] || 'Desconocido'),
      coordinatorNames: (device.coordinators || []).map(id => userMap[id] || 'Desconocido')
    }));
  }, [result, officialDocs, userMap]);

  const xlsFieldDefs = [
    { key: 'name', label: 'Nombre del Dispositivo', type: 'text' },
    { key: 'responsibleNames', label: 'Responsables', type: 'array' },
    { key: 'coordinatorNames', label: 'Coordinadores', type: 'array' },
    { key: 'missingDocs', label: 'Documentos faltantes', type: 'array' },
    { key: 'expiredDocs', label: 'Documentos caducados', type: 'array' }
  ];

  const handleExportByDevice = async rows => {
    const zip = new JSZip();

    for (const device of rows) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Dispositivo');

      ws.columns = xlsFieldDefs.map(def => ({
        header: def.label,
        key: def.key,
        width: 25
      }));

      ws.addRow({
        name: device.name,
        responsibleNames: device.responsibleNames.join(', '),
        coordinatorNames: device.coordinatorNames.join(', '),
        missingDocs: device.missingDocs.join(', '),
        expiredDocs: device.expiredDocs.join(', ')
      });

      const buf = await wb.xlsx.writeBuffer();
      zip.file(`${device.name}.xlsx`, buf);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'dispositivos_auditoria.zip');
    setShowExportByDevice(false);
  };

  const changeDeviceSelected = d => {
    if (deviceSelected?._id === d._id) {
      setDeviceSelected(null);
    } else {
      setDeviceSelected(d);
    }
  };

  return (
    <>
      <h3>Elige documentos esenciales de Dispositivo a auditar</h3>
      <fieldset className={styles.fieldsetCheckbox}>
        {officialDocs.map(({ value, label }) => (
          <label key={value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedDocumentationFields.includes(value)}
              onChange={() =>
                setSelectedDocumentationFields(prev =>
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

      {result && selectedDocumentationFields.length > 0 && (
        <div className={styles.auditResult}>
          <h4 className={styles.sectionTitle}>
            DISPOSITIVOS{' '}
            <button onClick={() => setShowExport(true)}>Exportar XLS</button>{' '}
            <button onClick={() => setShowExportByDevice(true)}>Exportar ZIP por Dispositivo</button>
          </h4>

          {enrichedDevices.length > 0 ? (
            <ul className={styles.ulBlock}>
              {enrichedDevices.map(d => (
                <li key={d._id} className={styles.auditItem}>
                  <div className={styles.auditHeader}>
                    {deviceSelected?._id === d._id ? (
                      <FaSquareCaretUp onClick={() => changeDeviceSelected(d)} />
                    ) : (
                      <FaSquareCaretDown onClick={() => changeDeviceSelected(d)} />
                    )}
                    <span className={styles.programName}>{d.name}</span>
                  </div>

                  {d.missingDocs?.length > 0 && (
                    <div className={styles.auditBody}>
                      <div className={styles.infoRowMissing}>
                        <FaCircleExclamation />
                        <span className={styles.infoText}>
                          Documentos faltantes: {d.missingDocs.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {d.expiredDocs?.length > 0 && (
                    <div className={styles.auditBody}>
                      <div className={styles.infoRowMissingTime}>
                        <FaHourglassEnd />
                        <span className={styles.infoText}>
                          Documentos caducados: {d.expiredDocs.join(', ')}
                        </span>
                      </div>
                    </div>
                  )}

                  {deviceSelected?._id === d._id && (
                    <div className={styles.infoAditional}>
                      <h4>{display(d.name)}</h4>
                      <p><strong>Responsables:</strong> {d.responsibleNames.join(', ')}</p>
                      <p><strong>Coordinadores:</strong> {d.coordinatorNames.join(', ')}</p>
                      <p><strong>Documentos Faltantes:</strong> {d.missingDocs.length ? d.missingDocs.join(', ') : 'Ninguno'}</p>
                      <p><strong>Documentos Caducados:</strong> {d.expiredDocs.length ? d.expiredDocs.join(', ') : 'Ninguno'}</p>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay dispositivos con documentos faltantes ni caducados.</p>
          )}

          {showExport && (
            <GenericXLSExport
              data={enrichedDevices}
              fields={xlsFieldDefs}
              fileName="dispositivos_auditoria.xlsx"
              modalTitle="Exportar Dispositivos a XLS"
              modalMessage="Selecciona columnas para el XLS:"
              onClose={() => setShowExport(false)}
            />
          )}

          {showExportByDevice && (
            <GenericXLSExport
              data={enrichedDevices}
              fields={xlsFieldDefs}
              modalTitle="XLS por Dispositivo"
              modalMessage="Generando un archivo XLS por dispositivo..."
              onExport={handleExportByDevice}
              onClose={() => setShowExportByDevice(false)}
            />
          )}
        </div>
      )}
    </>
  );
};

export default InfoAuditPanelDeviceDocs;
