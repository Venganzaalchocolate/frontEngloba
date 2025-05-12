// components/InfoAuditPanelEmployee.jsx
import React, { useEffect, useState, useMemo } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
import { OPTIONAL_FIELDS_INFO_EMPLOYEE } from './ManagingAuditors';
import { getDispositiveInfo, getValue } from './auditUtils';
import {
  FaHouse,
  FaSquareCaretDown,
  FaSquareCaretUp,
  FaCircleExclamation
} from 'react-icons/fa6';
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';

const formatDate = isoString => {
  const d = new Date(isoString);
  return isNaN(d) ? 'No existe información' : d.toLocaleDateString('es-ES');
};

const calculateAge = isoString => {
  if (!isoString) return 'No existe información';
  const birth = new Date(isoString);
  if (isNaN(birth)) return 'No existe información';
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
  enumsData,
  runAudit
}) => {
  const [userSelected, setUserSelected] = useState(null);
  const [showExport, setShowExport] = useState(false);
  const [showExportByDevice, setShowExportByDevice] = useState(false);

  // Ejecutar auditoría al cambiar selección
  useEffect(() => {
    if (selectedFields.length) runAudit();
  }, [selectedFields]);

  // Mapa de estudios id → nombre
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

  // Enriquecer usuarios para render y export
  const enrichedUsers = useMemo(() => {
    if (!Array.isArray(result)) return [];
    return result.map(u => {
      const period = u.dispositiveNow?.[0] || {};
      const { programName, deviceName } = getDispositiveInfo(
        period,
        enumsData.programsIndex
      );
      // Campos faltantes
      const missing = selectedFields
        .filter(k => {
          const v = getValue(u, k);
          return Array.isArray(v) ? v.length === 0 : v == null || v === '';
        })
        .map(
          k =>
            OPTIONAL_FIELDS_INFO_EMPLOYEE.find(o => o.value === k)?.label ||
            k
        );
      return {
        ...u,
        deviceName,
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
        fostered: u.fostered ? 'Sí' : 'No',
        disabilityPct: u.disability?.percentage ?? 0,
        disabilityNotes: u.disability?.notes ?? '',
        documentacionFalta: missing
      };
    });
  }, [
    result,
    selectedFields,
    studiesMap,
    enumsData.programsIndex
  ]);

  // Columnas para XLS
  const xlsFieldDefs = useMemo(
    () => [
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
      { key: 'fostered', label: 'Extutelado', type: 'text' },
      { key: 'disabilityPct', label: 'Discapacidad (%)', type: 'text' },
      { key: 'disabilityNotes', label: 'Notas Discapacidad', type: 'text' },
      {
        key: 'documentacionFalta',
        label: 'Documentación que falta',
        type: 'array'
      }
    ],
    []
  );

  // Exportar por dispositivo (ZIP con XLS por deviceName)
  const handleDeviceExport = async (rows, keys) => {
    const groups = rows.reduce((acc, u) => {
      const dev = u.deviceName || 'desconocido';
      (acc[dev] = acc[dev] || []).push(u);
      return acc;
    }, {});
    const zip = new JSZip();
    for (const [device, users] of Object.entries(groups)) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Usuarios');
      ws.columns = xlsFieldDefs
        .filter(def => keys.includes(def.key))
        .map(def => ({ header: def.label, key: def.key, width: 25 }));
      users.forEach(u => ws.addRow(u));
      const buf = await wb.xlsx.writeBuffer();
      zip.file(`${device.replace(/\s+/g, '_')}.xlsx`, buf);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'por_dispositivo_xls.zip');
    setShowExportByDevice(false);
  };

  const changeUserSelected = u => {
    if (userSelected?._id === u._id) setUserSelected(null);
    else setUserSelected(u);
  };

  return (
    <>
      <h3>Elige campos de Trabajador a auditar</h3>
      <fieldset className={styles.fieldsetCheckbox}>

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
      </fieldset>

      {result && selectedFields.length > 0 && (
        <div className={styles.auditResult}>
          {Array.isArray(enrichedUsers) && enrichedUsers.length > 0 ? (
            <>
              <h4 className={styles.sectionTitle}>
                EMPLEADOS{' '}
                <button onClick={() => setShowExport(true)}>xml</button>{' '}
                <button onClick={() => setShowExportByDevice(true)}>
                  xml por dispositivo
                </button>
              </h4>
              <ul className={styles.ulBlock}>
                {enrichedUsers.map(u => (
                  <li key={u._id} className={styles.auditItem}>
                    <div className={styles.auditHeader}>
                      {userSelected?._id === u._id ? (
                        <FaSquareCaretUp onClick={() => changeUserSelected(u)} />
                      ) : (
                        <FaSquareCaretDown onClick={() => changeUserSelected(u)} />
                      )}
                      <span className={styles.userName}>
                        {u.firstName} {u.lastName}
                      </span>
                      <span>|</span>
                      <span className={styles.userDni}>
                        <strong>DNI:</strong> {u.dni}
                      </span>
                      <span>|</span>
                      <span className={styles.infoText}>
                        <FaHouse /> {u.deviceName || '—'}
                      </span>
                    </div>
                    <div className={styles.auditBody}>
                      <div className={styles.infoRowMissing}>
                        <FaCircleExclamation />
                        <span className={styles.infoText}>
                          {u.documentacionFalta.join(', ')}
                        </span>
                      </div>
                    </div>
                    {userSelected?._id === u._id && (
                      <div className={styles.infoAditional}>
                        <h4>
                          {display(u.firstName)} {display(u.lastName)}
                        </h4>
                        <p>
                          <strong>DNI:</strong> {display(u.dni)}
                        </p>
                        <p>
                          <strong>Fecha de nacimiento:</strong> {u.birthday}
                        </p>
                        <p>
                          <strong>Edad:</strong> {u.edad}
                          {typeof u.edad === 'number' ? ' años' : ''}
                        </p>
                        <p>
                          <strong>Email:</strong> {display(u.email)}
                        </p>
                        <p>
                          <strong>Teléfono:</strong> {display(u.phone)}
                        </p>
                        <p>
                          <strong>Género:</strong>{' '}
                          {u.gender === 'female'
                            ? 'Mujer'
                            : u.gender === 'male'
                              ? 'Hombre'
                              : display(u.gender)}
                        </p>
                        <p>
                          <strong>NSS:</strong>{' '}
                          {display(u.socialSecurityNumber)}
                        </p>
                        <p>
                          <strong>Cuenta Bancaria:</strong>{' '}
                          {display(u.bankAccountNumber)}
                        </p>
                        <p>
                          <strong>Estudios:</strong>{' '}
                          {u.studies.length > 0
                            ? u.studies.join(', ')
                            : 'No existe información'}
                        </p>
                        
                        <p>
                          <strong>Extutelado:</strong> {u.fostered}
                        </p>
                        {u.disabilityPct > 0 ? (
                          <>
                            <p>
                              <strong>Discapacidad:</strong>{' '}
                              {u.disabilityPct}%
                            </p>
                            <p>
                              <strong>Notas Discapacidad:</strong>{' '}
                              {display(u.disabilityNotes)}
                            </p>
                          </>
                        ) : (
                          <p>
                            <strong>Discapacidad:</strong> No tiene
                            discapacidad
                          </p>
                        )}
                      </div>
                    )}
                  </li>
                ))}
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
