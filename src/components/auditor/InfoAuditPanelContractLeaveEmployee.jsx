import React, { useEffect, useMemo, useState } from 'react'
import styles from '../styles/ManagingAuditors.module.css'
import { FaSquareCaretDown, FaSquareCaretUp, FaCircleExclamation, FaHouse, FaCalendarCheck } from 'react-icons/fa6'
import GenericXLSExport from '../globals/GenericXLSExport'
import JSZip from 'jszip'
import { saveAs } from 'file-saver'
import ExcelJS from 'exceljs'
import { getDispositiveInfo } from './auditUtils'
import { FaCalendarTimes } from "react-icons/fa";

/* Campos de baja / excedencia (leavePeriods) que puede auditar el back */
export const LEAVE_FIELDS = [
  { value: 'expectedEndLeaveDate', label: 'Fecha de Fin prevista' },
  { value: 'actualEndLeaveDate', label: 'Fecha de Fin real' },
  { value: 'actualEndLeaveDateSin', label: 'Fecha de Fin real (Sin Excedencia Voluntaria)' }
]

const formatDate = iso => {
  const d = new Date(iso)
  return isNaN(d) ? '—' : d.toLocaleDateString('es-ES')
}

const display = v => (v ?? '') !== '' && v !== null ? v : '—'



const InfoAuditPanelContractLeaveEmployee = ({
  selectedLeaveFields,
  setSelectedLeaveFields,
  result,          // respuesta del endpoint auditMissingFieldsContractAndLeave
  enumsData,
  runAudit
}) => {

    const jobIndex   = enumsData.jobsIndex   || {};
    const leaveIndex = enumsData.leavesIndex || {};

    const LEAVE_LABELS = LEAVE_FIELDS.reduce((acc, { value, label }) => {
        acc[value] = label;
        return acc;
      }, {});
  /* ------------------------------------------------------------ */
  /* 1. Lanza auditoría al cambiar los checkboxes                  */
  /* ------------------------------------------------------------ */
  useEffect(() => {
    if (selectedLeaveFields.length) runAudit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedLeaveFields])

  
  /* ------------------------------------------------------------ */
  /* 2. Enriquecer + ordenar                                       */
  /* ------------------------------------------------------------ */
  const enriched = useMemo(() => {
    if (!Array.isArray(result)) return [];
  
    /* orden descendente por fecha de inicio de baja */
    const byDescLeaveStart = (a, b) =>
      new Date(b.startLeaveDate || 0) - new Date(a.startLeaveDate || 0);
  
    const users = result.map(u => {
      /* -------- dispositivo actual (dispositiveNow) ------------ */
      const periodNow      = u.dispositiveNow?.[0] || {};
      const { deviceName } = getDispositiveInfo(periodNow, enumsData.programsIndex);
  
      /* -------- enriquecer periodos de contratación ------------- */
      const hiringPeriods = (u.hiringPeriods || []).map(p => {
        const positionName = jobIndex[p.position]?.name || '—';
  
        /* ---- enriquecer y ordenar leavePeriods ----------------- */
        const leavePeriods = (p.leavePeriods || [])
          .map(lp => ({
            ...lp,
            leaveTypeName: leaveIndex[lp.leaveType]?.name || '—',
            /* 👉 traducir campos faltantes a etiquetas legibles */
            missingLeaveLabels: (lp.missingLeaveFields || []).map(
              k => LEAVE_LABELS[k] || k
            )
          }))
          .sort(byDescLeaveStart);
  
        /* --- devolver periodo enriquecido --- */
        return {
          ...p,
          positionName,
          leavePeriods
        };
      });
  
      /* ---- ordenar periodos por la baja más reciente ----------- */
      hiringPeriods.sort((a, b) => {
        const aDate = a.leavePeriods[0]?.startLeaveDate || a.startDate;
        const bDate = b.leavePeriods[0]?.startLeaveDate || b.startDate;
        return new Date(bDate || 0) - new Date(aDate || 0);
      });
  
      /* ---- devolver usuario enriquecido ---- */
      return {
        ...u,
        deviceName,
        fullName: `${u.firstName} ${u.lastName}`.trim(),
        hiringPeriods
      };
    });
  
    /* ---- ordenar usuarios por la baja más reciente ------------- */
    users.sort((a, b) => {
      const aDate = a.hiringPeriods[0]?.leavePeriods[0]?.startLeaveDate;
      const bDate = b.hiringPeriods[0]?.leavePeriods[0]?.startLeaveDate;
      return new Date(bDate || 0) - new Date(aDate || 0);
    });
  
    return users;
  }, [result, enumsData.programsIndex, jobIndex, leaveIndex]);

  /* ------------------------------------------------------------ */
  /* 3. Exportación                                                */
  /* ------------------------------------------------------------ */
  const [showExport, setShowExport] = useState(false)
  const [showExportByUser, setShowExportByUser] = useState(false)

  const xlsFieldDefs = [
    /* ——— básicos de usuario ——— */
    { key: 'firstName',   label: 'Nombre',            type: 'text' },
    { key: 'lastName',    label: 'Apellidos',         type: 'text' },
    { key: 'dni',         label: 'DNI',               type: 'text' },
    { key: 'deviceName',  label: 'Dispositivo',       type: 'text' },
    { key: 'email',       label: 'Email',             type: 'text' },
    { key: 'phone',       label: 'Teléfono',          type: 'text' },
  
    /* ——— datos del periodo ——— */
    { key: 'periodRange', label: 'Periodo',           type: 'text' },
    { key: 'position',    label: 'Puesto',            type: 'text' },
    { key: 'category',    label: 'Categoría',         type: 'text' },
    { key: 'workShift',   label: 'Jornada',           type: 'text' },
    { key: 'periodDevice',label: 'Disp. asignado',    type: 'text' },
  
    /* ——— datos de la baja ——— */
    { key: 'leaveRange',  label: 'Baja',              type: 'text' },
    { key: 'leaveType',   label: 'Tipo de baja',      type: 'text' },
    { key: 'missing',     label: 'Campos faltantes',  type: 'array' }
  ];

  const handleUserExport = async (rows, keys) => {
    const zip = new JSZip()
    for (const u of rows) {
      const wb = new ExcelJS.Workbook()
      const ws = wb.addWorksheet('Auditoría')
      ws.columns = xlsFieldDefs.filter(d => keys.includes(d.key)).map(d => ({ header: d.label, key: d.key, width: 30 }))
      const row = { ...u }
      row.missingLeaveFields = (u.hiringPeriods || []).flatMap(p => (p.leavePeriods || []).flatMap(l => l.missingLeaveFields)).join(', ')
      ws.addRow(row)
      const buf = await wb.xlsx.writeBuffer()
      zip.file(`${u.fullName.replace(/\s+/g, '_')}.xlsx`, buf)
    }
    const blob = await zip.generateAsync({ type: 'blob' })
    saveAs(blob, 'auditoria_bajas.zip')
    setShowExportByUser(false)
  }
  const handleDeviceExport = async (rows, keys) => {
    /* agrupa todas las filas por dispositivo */
    const groups = rows.reduce((acc, r) => {
      const dev = r.deviceName || 'SIN_DISPOSITIVO';
      (acc[dev] = acc[dev] || []).push(r);
      return acc;
    }, {});
  
    /* un XLS por grupo → ZIP */
    const zip = new JSZip();
    for (const [device, list] of Object.entries(groups)) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Auditoría');
      ws.columns = xlsFieldDefs
        .filter(col => keys.includes(col.key))
        .map(col => ({ header: col.label, key: col.key, width: 28 }));
      list.forEach(r => ws.addRow(r));
      const buf = await wb.xlsx.writeBuffer();
      zip.file(`${device.replace(/\s+/g, '_')}.xlsx`, buf);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'auditoria_bajas_por_dispositivo.zip');
    setShowExportByUser(false);   // cierra modal
  };
  /* ------------------------------------------------------------ */
  /* 4. Render                                                     */
  /* ------------------------------------------------------------ */
  const [userOpen, setUserOpen] = useState(null)
  const toggle = u => setUserOpen(prev => (prev?._id === u._id ? null : u))

  const flatRows = enriched.flatMap(u =>
    u.hiringPeriods.length
      ? u.hiringPeriods.flatMap(p =>
          (p.leavePeriods.length ? p.leavePeriods : [null]).map(lp => ({
            /* básicos */
            firstName:  u.firstName,
            lastName:   u.lastName,
            dni:        u.dni,
            deviceName: u.deviceName,
            email:      u.email,
            phone:      u.phone,
  
            /* periodo */
            periodRange : `${formatDate(p.startDate)} - ${p.endDate ? formatDate(p.endDate) : 'Actual'}`,
            position    : p.positionName,
            category    : p.category,
            workShift   : p.workShift?.type,
            periodDevice: u.deviceName || p.device,
  
            /* baja (puede ser null) */
            leaveRange : lp ? `${formatDate(lp.startLeaveDate)} - ${lp.expectedEndLeaveDate ? formatDate(lp.expectedEndLeaveDate) : '—'}` : '—',
            leaveType  : lp ? lp.leaveTypeName : '—',
            missing    : lp ? lp.missingLeaveLabels : []
          }))
        )
      : [
          /* usuario sin periodos (raro, pero cubierto) */
          {
            firstName: u.firstName,
            lastName : u.lastName,
            dni      : u.dni,
            deviceName: u.deviceName,
            email    : u.email,
            phone    : u.phone,
            periodRange : '—',
            position    : '—',
            category    : '—',
            workShift   : '—',
            periodDevice: '—',
            leaveRange  : '—',
            leaveType   : '—',
            missing     : []
          }
        ]
  );

  return (
    <>
      {/* Checkboxes de campos de baja */}
      <h3> Campos de baja / excedencia</h3>
      <fieldset className={styles.fieldsetCheckbox}>
        {LEAVE_FIELDS.map(({ value, label }) => (
          <label key={value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedLeaveFields.includes(value)}
              onChange={() =>
                setSelectedLeaveFields(prev =>
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
  
      {/* Resultados */}
      {selectedLeaveFields.length && enriched.length ? (
        <div className={styles.auditResult}>
          <h4 className={styles.sectionTitle}>
             <p>{enriched.length}</p> BAJAS / EXCEDENCIAS
            <button onClick={() => setShowExport(true)}>xls</button>
            <button onClick={() => setShowExportByUser(true)}>
              xls por dispositivo
            </button>
          </h4>
  
          <ul className={styles.ulBlock}>
            {enriched.map(u => (
              <li key={u._id} className={styles.auditItem}>
                {/* Cabecera usuario */}
                <div className={styles.auditHeader}>
                  {userOpen?._id === u._id ? (
                    <FaSquareCaretUp onClick={() => toggle(u)} />
                  ) : (
                    <FaSquareCaretDown onClick={() => toggle(u)} />
                  )}
                  <span className={styles.userName}>{u.fullName}</span>
                  <span>|</span>
                  <span className={styles.userDni}>
                    <strong>DNI:</strong> {u.dni}
                  </span>
                  <span>|</span>
                  <span className={styles.infoText}>
                    <FaHouse />{' '}
                    <span className={styles.infoTextDeviceName}>
                      {u.deviceName || '—'}
                    </span>
                  </span>
                </div>
  
                {/* Periodos + bajas */}
                {u.hiringPeriods.map(p => (
                  <div key={p._id} className={styles.auditBody}>
                    {p.leavePeriods.map(lp => (
                      <React.Fragment
                        key={`${p._id}-${lp._id}`}
                      >
                        <div className={styles.infoRowPeriod}>
                          <FaCalendarCheck />
                          <p className={styles.infoText}>
                            Periodo
                            <span className={styles.capsulaTime}>
                              INICIO: {formatDate(p.startDate)}
                            </span>
                            <span className={styles.capsulaTime}>
                              FIN: {p.endDate ? formatDate(p.endDate) : 'Actual'}
                            </span>
                          </p>
                        </div>
  
                        <div className={styles.infoRowLeave}>
                          <FaCalendarTimes/>
                          <p className={styles.infoText}>
                            Baja
                            <span className={styles.capsulaTime}>
                              INICIO: {formatDate(lp.startLeaveDate)}
                            </span>
                            <span className={styles.capsulaTime}>
                              FECHA PREVISTA:{' '}
                              {lp.expectedEndLeaveDate
                                ? formatDate(lp.expectedEndLeaveDate)
                                : 'NO DISPONIBLE'}
                            </span>
                            <span className={styles.capsulaTime}>
                              FECHA FIN:{' '}
                              {lp.actualEndLeaveDate
                                ? formatDate(lp.actualEndLeaveDate)
                                : 'NO DISPONIBLE'}
                            </span>
                          </p>
                        </div>
  
                        <div className={styles.infoRowLeave}>
                          <FaCircleExclamation />
                          <p className={styles.infoText}>
                            Falta: {lp.missingLeaveLabels.join(', ')}
                          </p>
                        </div>
                      </React.Fragment>
                    ))}
                  </div>
                ))}
  
                {/* Detalle expandido */}
                {userOpen?._id === u._id && (
                  <div className={styles.infoAditional}>
                    {u.hiringPeriods.map(p => (
                      <div key={p._id} className={styles.periodDetail}>
                        <h3>
                          Periodo {formatDate(p.startDate)} -{' '}
                          {display(p.endDate ? formatDate(p.endDate) : 'Actual')}
                        </h3>
                        <p>
                          <strong>Puesto:</strong>{' '}
                          {display(p.positionName)}
                        </p>
                        <p>
                          <strong>Categoría:</strong>{' '}
                          {display(p.category)}
                        </p>
                        <p>
                          <strong>Jornada:</strong>{' '}
                          {display(p.workShift?.type)}
                        </p>
                        {p.device && (
                          <p>
                            <strong>Dispositivo asignado:</strong>{' '}
                            {u.deviceName || p.device}
                          </p>
                        )}
  
                        {p.leavePeriods.map(lp => (
                          <div
                            key={lp._id}
                            className={styles.periodoBaja}
                          >
                            <h3>
                              Información de la Baja o Excedencia
                            </h3>
                            <p>
                              <strong>Tipo:</strong>{' '}
                              {display(lp.leaveTypeName)}
                            </p>
                            <p>
                              <strong>Inicio:</strong>{' '}
                              {formatDate(lp.startLeaveDate)}
                            </p>
                            <p>
                              <strong>Fin previsto:</strong>{' '}
                              {display(
                                lp.expectedEndLeaveDate
                                  ? formatDate(lp.expectedEndLeaveDate)
                                  : '—'
                              )}
                            </p>
                            <p>
                              <strong>Fin real:</strong>{' '}
                              {display(
                                lp.actualEndLeaveDate
                                  ? formatDate(lp.actualEndLeaveDate)
                                  : '—'
                              )}
                            </p>
                            <p>
                              <strong>Campos faltantes:</strong>{' '}
                              {lp.missingLeaveLabels.join(', ')}
                            </p>
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
  
          {/* Modales exportación */}
          {showExport && (
            <GenericXLSExport
              data={flatRows}
              fields={xlsFieldDefs}
              fileName="auditoria_bajas.xlsx"
              modalTitle="Exportar auditoría a XLS"
              modalMessage="Selecciona columnas para el XLS:"
              onClose={() => setShowExport(false)}
            />
          )}
          {showExportByUser && (
            <GenericXLSExport
              data={flatRows}
              fields={xlsFieldDefs}
              modalTitle="XLS por Dispositivo"
              modalMessage="Selecciona columnas para cada XLS:"
              onExport={handleDeviceExport}
              onClose={() => setShowExportByUser(false)}
            />
          )}
        </div>
      ) : null}
    </>
  );
}

export default InfoAuditPanelContractLeaveEmployee