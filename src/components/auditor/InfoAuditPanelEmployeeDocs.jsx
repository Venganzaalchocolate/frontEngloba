// components/InfoAuditPanelEmployeeDocs.jsx
import React, { useEffect, useState, useMemo } from 'react';
import { FaCircleExclamation, FaSquareCaretDown, FaSquareCaretUp } from 'react-icons/fa6';
import styles from '../styles/ManagingAuditors.module.css';
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

const display = val =>
  val !== null && val !== undefined && val !== '' ? val : 'No existe información';

const InfoAuditPanelEmployeeDocs = ({
  enumsData,
  selectedDocumentationFields,
  setSelectedDocumentationFields,
  result,           // API: auditMissingFieldsDocumentationUser
  runAudit,         // llama a esa API
  charge            // loading toggle
}) => {
  const [userSelected, setUserSelected]             = useState(null);
  const [showExport, setShowExport]                 = useState(false);
  const [showExportByDevice, setShowExportByDevice] = useState(false);

  // 1) Lista de documentos oficiales
  const officialDocs = useMemo(() => {
    if (!enumsData?.documentation) return [];
    return enumsData.documentation
      .filter(d => d.model === 'User')
      .map(d => ({ value: d._id.toString(), label: d.label }));
  }, [enumsData]);

  // 2) Índice de programas/dispositivos para lookup
  const programIndex = enumsData?.programsIndex || {};

  // 3) Disparar auditoría al cambiar selección
  useEffect(() => {
    if (selectedDocumentationFields.length) {
      runAudit({ docIds: selectedDocumentationFields });
    }
    setUserSelected(null);
  }, [selectedDocumentationFields]);

  // 4) Enriquecer usuarios: mapear missingDocs y derivar deviceName
  const enrichedUsers = useMemo(() => {
    if (!Array.isArray(result)) return [];
    return result.map(u => {
      // missingDocs → labels
      const missingLabels = (u.missingDocs || []).map(docId => {
        const idStr = docId.toString();
        const doc   = officialDocs.find(o => o.value === idStr);
        return doc ? doc.label : idStr;
      });

      // deviceName desde dispositiveNow[0].device
      const devEntry = u.dispositiveNow?.[0]?.device;
      const devId    = devEntry?._id?.toString?.() ?? devEntry?.toString?.();
      const deviceName = programIndex[devId]?.name || 'Desconocido';

      return {
        ...u,
        missingDocs: missingLabels,
        deviceName
      };
    });
  }, [result, officialDocs, programIndex]);

  // 5) Definición de columnas para XLS
  const xlsFieldDefs = [
    { key: 'firstName',   label: 'Nombre',              type: 'text'  },
    { key: 'lastName',    label: 'Apellidos',           type: 'text'  },
    { key: 'dni',         label: 'DNI',                 type: 'text'  },
    { key: 'deviceName',  label: 'Dispositivo',         type: 'text'  },
    { key: 'email',       label: 'Email',               type: 'text'  },
    { key: 'phone',       label: 'Teléfono',            type: 'text'  },
    { key: 'missingDocs', label: 'Documentos faltantes',type: 'array' },
  ];

  // Toggle detalle
  const toggleUser = u =>
    setUserSelected(userSelected?._id === u._id ? null : u);

  // 6) Export ZIP por dispositivo
  const handleExportByDevice = async (rows, keys) => {
    const zip = new JSZip();
    const groups = rows.reduce((acc, row) => {
      (acc[row.deviceName] = acc[row.deviceName] || []).push(row);
      return acc;
    }, {});

    for (const [devName, users] of Object.entries(groups)) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Empleados');
      ws.columns = xlsFieldDefs
        .filter(def => keys.includes(def.key))
        .map(def => ({ header: def.label, key: def.key, width: 25 }));

      users.forEach(u => {
        ws.addRow({
          firstName:  u.firstName,
          lastName:   u.lastName,
          dni:        u.dni,
          deviceName: u.deviceName,
          email:      u.email,
          phone:      u.phone,
          missingDocs:u.missingDocs
        });
      });

      const buf = await wb.xlsx.writeBuffer();
      zip.file(`${devName.replace(/\s+/g,'_')}.xlsx`, buf);
    }

    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'empleados_por_dispositivo.zip');
    setShowExportByDevice(false);
  };

  return (
    <>
      <h3>Elige documentos oficiales a auditar</h3>
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
          <p>{enrichedUsers.length}</p> EMPLEADOS{' '}
            <button onClick={() => setShowExport(true)}>xml</button>{' '}
            <button onClick={() => setShowExportByDevice(true)}>
              xml por dispositivo
            </button>
          </h4>

          {enrichedUsers.length > 0 ? (
            <ul className={styles.ulBlock}>
              {enrichedUsers.map(u => (
                <li key={u._id} className={styles.auditItem}>
                  <div className={styles.auditHeader}>
                    {userSelected?._id === u._id ? (
                      <FaSquareCaretUp onClick={() => toggleUser(u)} />
                    ) : (
                      <FaSquareCaretDown onClick={() => toggleUser(u)} />
                    )}
                    <span className={styles.userName}>
                      {u.firstName} {u.lastName}
                    </span>
                    <span className={styles.userDni}>
                      <strong>DNI:</strong> {u.dni}
                    </span>
                  </div>
                  <div className={styles.auditBody}>
                    <div className={styles.infoRowMissing}>
                      <FaCircleExclamation />
                      <span className={styles.infoText}>
                        {u.missingDocs.join(', ')}
                      </span>
                    </div>
                  </div>
                  {userSelected?._id === u._id && (
                    <div className={styles.infoAditional}>
                      <h4>{u.firstName} {u.lastName}</h4>
                      <p><strong>DNI:</strong> {display(u.dni)}</p>
                      <p><strong>Email:</strong> {display(u.email)}</p>
                      <p><strong>Teléfono:</strong> {display(u.phone)}</p>
                      <p><strong>Dispositivo:</strong> {display(u.deviceName)}</p>
                      <p><strong>Documentos faltantes:</strong></p>
                      <ul>
                        {u.missingDocs.map(label => (
                          <li key={label}>{label}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No hay empleados con documentos faltantes.</p>
          )}

          {showExport && (
            <GenericXLSExport
              data={enrichedUsers}
              fields={xlsFieldDefs}
              fileName="empleados_faltan_documentos.xlsx"
              modalTitle="Exportar Empleados a XLS"
              modalMessage="Selecciona columnas para el XLS:"
              onClose={() => setShowExport(false)}
            />
          )}

          {showExportByDevice && (
            <GenericXLSExport
              data={enrichedUsers}
              fields={xlsFieldDefs}
              modalTitle="XLS por Dispositivo"
              modalMessage="Selecciona columnas para cada XLS por dispositivo:"
              onExport={handleExportByDevice}
              onClose={() => setShowExportByDevice(false)}
            />
          )}
        </div>
      )}
    </>
  );
};

export default InfoAuditPanelEmployeeDocs;
