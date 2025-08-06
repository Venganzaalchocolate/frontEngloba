// components/InfoAuditPanelDevice.jsx
import React, { useEffect, useState, useMemo } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
import { FaCircleExclamation, FaSquareCaretDown, FaSquareCaretUp } from 'react-icons/fa6';
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { getToken } from '../../lib/serviceToken';
import { usersName } from '../../lib/data';

const OPTIONAL_FIELDS_INFO_DEVICE = [
  { value: 'name',         label: 'Nombre dispositivo' },
  { value: 'address',      label: 'Dirección' },
  { value: 'email',        label: 'Email' },
  { value: 'phone',        label: 'Teléfono' },
  { value: 'responsible',  label: 'Responsable(s)' },
  { value: 'province',     label: 'Provincia' },
  { value: 'coordinators', label: 'Coordinador(es)' },
];

const getValue = (obj, path) =>
  path.split('.').reduce((acc, k) => (acc ? acc[k] : undefined), obj);

const InfoAuditPanelDevice = ({
  selectedDeviceFields,
  setSelectedDeviceFields,
  result,
  runAudit,
  charge,
  enumsData
}) => {
  const [userMap, setUserMap] = useState({});
  const [showExportDevice, setShowExportDevice]       = useState(false);
  const [showExportByDevice, setShowExportByDevice]   = useState(false);
  const [deviceSelected, setDeviceSelected]           = useState(null);
  const [responsiblesDevice, setResponsiblesDevice]   = useState(null);
  const [coordinatorsDevice, setCoordinatorsDevice]   = useState(null);

  // 1) Batch–carga de nombres para todos los responsables y coordinadores
  useEffect(() => {
    if (!Array.isArray(result)) {
      setUserMap({});
      return;
    }
    const token = getToken();
    const allIds = Array.from(new Set(
      result.flatMap(p =>
        (p.devices || []).flatMap(d => [
          ...(Array.isArray(d.responsible)  ? d.responsible  : []),
          ...(Array.isArray(d.coordinators) ? d.coordinators : [])
        ])
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

  // 2) Ejecutar auditoría al cambiar selección
  useEffect(() => {
    if (selectedDeviceFields.length) {
      runAudit();
    } else {
      // limpiar resultado si no hay nada seleccionado
      // para evitar mostrar desactualizado
      // (el padre reinicia `result` a null si se cambia de tipo/subOpción)
    }
    setDeviceSelected(null);
    setResponsiblesDevice(null);
    setCoordinatorsDevice(null);
  }, [selectedDeviceFields]);

  // 3) Enriquecer cada dispositivo: añado responsible/coordinators siempre como array
  const enrichedDevices = useMemo(() => {
    if (!Array.isArray(result)) return [];
    return result.flatMap(p =>
      (p.devices || []).map(d => {
        const responsible  = Array.isArray(d.responsible)  ? d.responsible  : [];
        const coordinators = Array.isArray(d.coordinators) ? d.coordinators : [];
        const missingDevice = selectedDeviceFields
          .filter(f => {
            const v = getValue(d, f);
            return Array.isArray(v) ? v.length === 0 : v == null || v === '';
          })
          .map(f => OPTIONAL_FIELDS_INFO_DEVICE.find(o => o.value === f)?.label || f);
        return {
          ...d.toObject?.() ?? d,
          programName: p.name,
          responsible,
          coordinators,
          missingDevice
        };
      })
    );
  }, [result, selectedDeviceFields]);

  // 4) Columnas para XLS
  const xlsFieldDefsDevice = [
    { key: 'name',         label: 'Dispositivo',   type: 'text'  },
    { key: 'programName',  label: 'Programa',      type: 'text'  },
    { key: 'address',      label: 'Dirección',     type: 'text'  },
    { key: 'email',        label: 'Email',         type: 'text'  },
    { key: 'phone',        label: 'Teléfono',      type: 'text'  },
    { key: 'responsible',  label: 'Responsable(s)',type: 'array' },
    { key: 'province',     label: 'Provincia',     type: 'text'  },
    { key: 'coordinators', label: 'Coordinador(es)',type:'array' },
    { key: 'missingDevice',label: 'Campos faltantes', type:'array' },
  ];

  // 5) Exportar ZIP (por cada dispositivo un fichero)
  const handleExportByDevice = async (rows, keys) => {
    const zip = new JSZip();
    for (const d of rows) {
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Dispositivo');
      ws.columns = xlsFieldDefsDevice
        .filter(def => keys.includes(def.key))
        .map(def => ({ header: def.label, key: def.key, width: 25 }));
      ws.addRow({
        ...d,
        responsible:  d.responsible .map(id => userMap[id]  || ''),
        coordinators: d.coordinators.map(id => userMap[id]  || ''),
        province: provinceName(d.province),
        missingDevice: d.missingDevice
      });
      const buf = await wb.xlsx.writeBuffer();
      zip.file(`${d.name.replace(/\s+/g,'_')}.xlsx`, buf);
    }
    const blob = await zip.generateAsync({ type: 'blob' });
    saveAs(blob, 'dispositivos_auditoria.zip');
    setShowExportByDevice(false);
  };

  // 6) Expandir un dispositivo para mostrar detalles
  const changeDeviceSelected = async d => {
    if (deviceSelected?._id === d._id) {
      setDeviceSelected(null);
      setResponsiblesDevice(null);
      setCoordinatorsDevice(null);
    } else {
      setDeviceSelected(d);
      charge(true);
      const token = getToken();
      try {
        const users = await usersName(
          { ids: [...d.responsible, ...d.coordinators] },
          token
        );
        setResponsiblesDevice(
          users.filter(u => d.responsible.includes(u._id))
        );
        setCoordinatorsDevice(
          users.filter(u => d.coordinators.includes(u._id))
        );
      } catch {
        setResponsiblesDevice([]);
        setCoordinatorsDevice([]);
      } finally {
        charge(false);
      }
    }
  };

  const display = v => (v != null && v !== '' ? v : 'No existe información');
  const provinceName = val => {
    if (!val || !enumsData?.provinces) return 'No existe información';
    for (const prov of enumsData.provinces) {
      if (prov._id === val) return prov.name;
      if (prov.subcategories) {
        const sub = prov.subcategories.find(s => s._id === val);
        if (sub) return `${prov.name} – ${sub.name}`;
      }
    }
    return 'No existe información';
  };

  return (
    <>
      <h3>Elige campos de Dispositivo a auditar</h3>
      <fieldset className={styles.fieldsetCheckbox}>
        {OPTIONAL_FIELDS_INFO_DEVICE.map(({ value, label }) => (
          <label key={value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedDeviceFields.includes(value)}
              onChange={() =>
                setSelectedDeviceFields(prev =>
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

      {result && selectedDeviceFields.length > 0 && (
        <div className={styles.auditResult}>
          <h4 className={styles.sectionTitle}>
          <p>{(!!enrichedDevices && enrichedDevices.length>0) ?enrichedDevices.length :''}</p> DISPOSITIVOS{' '}
            <button onClick={() => setShowExportDevice(true)}>xml</button>{' '}
            <button onClick={() => setShowExportByDevice(true)}>xml por dispositivo</button>
          </h4>

          {enrichedDevices.length === 0 ? (
            <p>No hay dispositivos con campos vacíos.</p>
          ) : (
            <ul className={styles.ulBlock}>
              {enrichedDevices.map(d => (
                <li key={d._id} className={styles.auditItem}>
                  <div className={styles.auditHeader}>
                    {deviceSelected?._id === d._id ? (
                      <FaSquareCaretUp onClick={() => changeDeviceSelected(d)} />
                    ) : (
                      <FaSquareCaretDown onClick={() => changeDeviceSelected(d)} />
                    )}
                    <span className={styles.userName}>{d.name}</span>
                  </div>
                  <div className={styles.auditBody}>
                    <div className={styles.infoRowMissing}>
                      <FaCircleExclamation />
                      <span className={styles.infoText}>
                        {d.missingDevice.join(', ')}
                      </span>
                    </div>
                  </div>
                  {deviceSelected?._id === d._id && (
                    <div className={styles.infoAditional}>
                      <h4>{display(d.name)}</h4>
                      <p><strong>Programa:</strong> {display(d.programName)}</p>
                      <p><strong>Dirección:</strong> {display(d.address)}</p>
                      <p><strong>Teléfono:</strong> {display(d.phone)}</p>
                      <p><strong>Email:</strong> {display(d.email)}</p>
                      <p><strong>Provincia:</strong> {provinceName(d.province)}</p>

                      <p><strong>Responsables:</strong></p>
                      {responsiblesDevice?.length > 0
                        ? responsiblesDevice.map(u => (
                            <p key={u._id}>{u.firstName} {u.lastName}</p>
                          ))
                        : <p>No existe información</p>
                      }

                      <p><strong>Coordinadores:</strong></p>
                      {coordinatorsDevice?.length > 0
                        ? coordinatorsDevice.map(u => (
                            <p key={u._id}>{u.firstName} {u.lastName}</p>
                          ))
                        : <p>No existe información</p>
                      }
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}

          {showExportDevice && (
            <GenericXLSExport
              data={enrichedDevices.map(d => ({
                ...d,
                responsible:  d.responsible .map(id => userMap[id]||''),
                coordinators: d.coordinators.map(id => userMap[id]||''),
                province:      provinceName(d.province)
              }))}
              fields={xlsFieldDefsDevice}
              fileName="dispositivos_auditoria.xlsx"
              modalTitle="Exportar Dispositivos a XLS"
              modalMessage="Selecciona columnas para el XLS:"
              onClose={() => setShowExportDevice(false)}
            />
          )}

          {showExportByDevice && (
            <GenericXLSExport
              data={enrichedDevices.map(d => ({
                ...d,
                responsible:  d.responsible .map(id => userMap[id]||''),
                coordinators: d.coordinators.map(id => userMap[id]||''),
                province:      provinceName(d.province)
              }))}
              fields={xlsFieldDefsDevice}
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

export default InfoAuditPanelDevice;
