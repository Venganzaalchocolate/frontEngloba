// components/InfoAuditPanel.jsx
import React, { useEffect, useState, useMemo } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
import { OPTIONAL_FIELDS_INFO_EMPLOYEE } from './ManagingAuditors';
import { getDispositiveInfo, getValue } from './auditUtils';
import { FaHouse, FaSquareCaretDown, FaSquareCaretUp } from "react-icons/fa6";
import { FaCircleExclamation } from "react-icons/fa6";
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from "exceljs";

const formatDate = isoString => {
  return (new Date(isoString).toLocaleDateString('es-ES') !== 'Invalid Date')
    ? new Date(isoString).toLocaleDateString('es-ES')
    : 'No existe información';
};

const calculateAge = isoString => {
  if (!isoString) return 'No existe información';
  const birth = new Date(isoString);
  const diffMs = Date.now() - birth.getTime();
  const ageDt = new Date(diffMs);
  const age = Math.abs(ageDt.getUTCFullYear() - 1970);
  return age || 'No existe información';
};

const display = val =>
  val !== null && val !== undefined && val !== '' ? val : 'No existe información';

const InfoAuditPanelEmployee = ({
  selectedFields,
  setSelectedFields,
  result,
  enumsData,       // aquí viene todo enumsData
  runAudit
}) => {
  const [userSelected, setUserSelected] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showExportAll, setShowExportAll] = useState(false);
  const [showExportByDevice, setShowExportByDevice] = useState(false);

  // Construir mapa de id -> nombre (incluye categorías y subcategorías)
  const studiesMap = useMemo(() => {
    const map = {};
    enumsData.studies?.forEach(cat => {
      map[cat._id] = cat.name;
      cat.subcategories?.forEach(sub => {
        map[sub._id] = sub.name;
      });
    });
    return map;
  }, [enumsData.studies]);

  useEffect(() => {
    if (selectedFields.length) runAudit();
  }, [selectedFields]);

  const changeUserSelected = (u) => {
    if (userSelected?._id === u._id) setUserSelected(null);
    else setUserSelected(u);
  };

  const enrichedUsers = useMemo(() => {
    return result?.map(u => {
      const period = u.dispositiveNow?.[0] || {};
      const { deviceName } = getDispositiveInfo(period, enumsData.programsIndex);

      const missing = selectedFields
        .filter(k => {
          const v = getValue(u, k);
          return Array.isArray(v) ? v.length === 0 : v == null || v === '';
        })
        .map(k => OPTIONAL_FIELDS_INFO_EMPLOYEE.find(o => o.value === k)?.label || k);

      return {
        ...u,
        deviceName,                  // <-- aquí
        firstName: u.firstName,
        lastName: u.lastName,
        dni: u.dni,
        birthday: formatDate(u.birthday),
        edad: calculateAge(u.birthday),
        email: u.email,
        phone: u.phone,
        gender: u.gender,
        socialSecurityNumber: u.socialSecurityNumber,
        bankAccountNumber: u.bankAccountNumber,
        studies: (u.studies || []).map(id => studiesMap[id] || 'Desconocido'),
        apafa: u.apafa ? 'Sí' : 'No',
        fostered: u.fostered ? 'Sí' : 'No',
        disabilityPct: u.disability?.percentage ?? '',
        disabilityNotes: u.disability?.notes ?? '',
        documentacionFalta: missing,
      };
    });
  }, [result, selectedFields, studiesMap]);

  // Definición de columnas para el XLS
  const xlsFieldDefs = useMemo(() => [
    { key: 'firstName', label: 'Nombre', type: 'text' },
    { key: 'lastName', label: 'Apellidos', type: 'text' },
    { key: 'dni', label: 'DNI', type: 'text' },
    { key: 'deviceName', label: 'Dispositivo', type: 'text' },
    { key: 'birthday', label: 'Fecha de nacimiento', type: 'text' },
    { key: 'edad', label: 'Edad', type: 'text' },
    { key: 'email', label: 'Email', type: 'text' },
    { key: 'phone', label: 'Teléfono', type: 'text' },
    { key: 'gender', label: 'Género', type: 'text' },
    { key: 'socialSecurityNumber', label: 'NSS', type: 'text' },
    { key: 'bankAccountNumber', label: 'Cuenta Bancaria', type: 'text' },
    { key: 'studies', label: 'Estudios', type: 'array' },
    { key: 'apafa', label: 'APAFA', type: 'text' },
    { key: 'fostered', label: 'Extutelado', type: 'text' },
    { key: 'disabilityPct', label: 'Discapacidad (%)', type: 'text' },
    { key: 'disabilityNotes', label: 'Notas Discapacidad', type: 'text' },
    { key: 'documentacionFalta', label: 'Documentación que falta', type: 'array' },
  ], []);



  // Callback para generar ZIP de XLS por dispositivo
  const handleDeviceExport = async (rows, keys) => {
    // 1. Agrupar usuarios por deviceName
    const groups = rows.reduce((acc, u) => {
      const dev = u.deviceName || 'desconocido';
      (acc[dev] = acc[dev] || []).push(u);
      return acc;
    }, {});

    const zip = new JSZip();
    // 2. Por cada dispositivo, crear un XLSX
    for (const [device, users] of Object.entries(groups)) {
      const workbook = new ExcelJS.Workbook();
      const ws = workbook.addWorksheet('Usuarios');
      // Columnas dinámicas según xlsFieldDefs y keys
      ws.columns = xlsFieldDefs
        .filter(def => keys.includes(def.key))
        .map(def => ({ header: def.label, key: def.key, width: 25 }));
      // Filas por usuario
      users.forEach(u => ws.addRow(u));
      // Buffer y añadir al ZIP
      const buf = await workbook.xlsx.writeBuffer();
      const filename = `${device.replace(/\s+/g, '_')}.xlsx`;
      zip.file(filename, buf);
    }
    // 3. Generar ZIP y descargar
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'por_dispositivo_xls.zip');
    setShowExportByDevice(false);
  };


  return (
    <>
      <h3>Elige campos de Trabajador a auditar</h3>
      <div className={styles.checkboxGroup}>
        {OPTIONAL_FIELDS_INFO_EMPLOYEE.map(({ value, label }) => (
          <label key={value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedFields.includes(value)}
              onChange={() =>
                setSelectedFields(prev =>
                  prev.includes(value)
                    ? prev.filter(f => f !== value)
                    : [...prev, value]
                )
              }
            />
            {label}
          </label>
        ))}
      </div>

      {result && !!selectedFields && selectedFields.length>0 && (
        <div className={styles.auditResult}>
          {Array.isArray(result) && result.length > 0 ? (
            <>
              <h4>EMPLEADOS <button onClick={() => setShowExport(true)}>xml</button> <button onClick={() => setShowExportByDevice(true)}>xml por dispositivo</button></h4>
              <ul className={styles.ulBlock}>
                {result.map(u => {
                  // campos faltantes
                  const missing = selectedFields.filter(f => {
                    const v = getValue(u, f);
                    if (Array.isArray(v)) return v.length === 0;
                    return v == null || v === '';
                  });

                  // dispositivo actual
                  const period = u.dispositiveNow?.[0];
                  const { programName, deviceName } = getDispositiveInfo(
                    period,
                    enumsData.programsIndex
                  );

                  // mapear estudios a nombres
                  const studyNames = Array.isArray(u.studies) && u.studies.length > 0
                    ? u.studies.map(id => studiesMap[id] || 'Desconocido')
                    : [];

                  return (
                    <li key={u._id} className={styles.auditItem}>
                      <div className={styles.auditHeader}>
                        {(!!userSelected && userSelected?._id === u._id) ? <FaSquareCaretUp onClick={() => changeUserSelected(u)} /> : <FaSquareCaretDown onClick={() => changeUserSelected(u)} />}
                        <span className={styles.userName}>
                          {u.firstName} {u.lastName}
                        </span>
                        <span>|</span>
                        <span className={styles.userDni}><strong>DNI:</strong> {u.dni}</span>
                        <span>|</span>
                        <span className={styles.infoText}><FaHouse /> {deviceName || '—'}</span>
                      </div>

                      <div className={styles.auditBody}>
                        <div className={styles.infoRowMissing}>
                          <FaCircleExclamation />
                          <span className={styles.infoText}>
                            {missing
                              .map(f => OPTIONAL_FIELDS_INFO_EMPLOYEE.find(o => o.value === f)?.label || f)
                              .join(', ')
                            }
                          </span>
                        </div>
                      </div>

                      {userSelected?._id === u._id && (
                        <div className={styles.infoAditional}>
                          <h4>{display(u.firstName)} {display(u.lastName)}</h4>
                          <p><strong>DNI:</strong> {display(u.dni)}</p>
                          <p><strong>Fecha de nacimiento:</strong> {formatDate(u.birthday)}</p>
                          <p>
                            <strong>Edad:</strong> {calculateAge(u.birthday)}{' '}
                            {typeof calculateAge(u.birthday) === 'number' ? 'años' : ''}
                          </p>
                          <p><strong>Email:</strong> {display(u.email)}</p>
                          <p><strong>Teléfono:</strong> {display(u.phone)}</p>
                          <p>
                            <strong>Género:</strong> {' '}
                            {u.gender
                              ? u.gender === 'female'
                                ? 'Mujer'
                                : u.gender === 'male'
                                  ? 'Hombre'
                                  : display(u.gender)
                              : 'No existe información'}
                          </p>
                          <p><strong>Número de Seguridad Social:</strong> {display(u.socialSecurityNumber)}</p>
                          <p><strong>Número de cuenta bancaria:</strong> {display(u.bankAccountNumber)}</p>
                          <p>
                            <strong>Estudios:</strong>{' '}
                            {studyNames.length > 0 ? studyNames.join(', ') : 'No existe información'}
                          </p>
                          <p><strong>APAFA:</strong> {u.apafa === true ? 'Sí' : u.apafa === false ? 'No' : 'No existe información'}</p>
                          <p><strong>Extutelado:</strong> {u.fostered === true ? 'Sí' : u.fostered === false ? 'No' : 'No existe información'}</p>

                          {u.disability?.percentage > 0 ? (
                            <>
                              <p><strong>Discapacidad:</strong> {u.disability.percentage}%</p>
                              <p><strong>Notas discapacidad:</strong> {display(u.disability.notes)}</p>
                            </>
                          ) : (
                            <p><strong>Discapacidad:</strong> No tiene discapacidad</p>
                          )}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p>No se encontraron usuarios con estos campos vacíos.</p>
          )}
          {showExport && (
            <GenericXLSExport
              data={enrichedUsers}
              fields={xlsFieldDefs}
              fileName="usuarios_auditoria.xlsx"
              modalTitle="Exportar Usuarios a XLS"
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
              onExport={handleDeviceExport}
              onClose={() => setShowExportByDevice(false)}
            />
          )}

        </div>

      )}

    </>
  );
};

export default InfoAuditPanelEmployee;
