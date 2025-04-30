// components/ProgramAuditPanel.jsx
import React, { useEffect } from 'react';
import styles from '../styles/ManagingAuditors.module.css';
export const OPTIONAL_PROGRAM_FIELDS = [
  { value: 'name', label: 'Nombre del programa' },
  { value: 'description', label: 'Descripción' },
  { value: 'devices', label: 'Dispositivos asociados' },
  // …otros campos opcionales…
];

const ProgramAuditPanel = ({
  selectedFields,
  setSelectedFields,
  loading,
  result,
  getValue,
  runAudit
}) => {
  useEffect(() => {
    if (selectedFields.length) runAudit();
  }, [selectedFields]);

  return (
    <>
      <h3>Elige campos de Programa a auditar</h3>
      <div className={styles.checkboxGroup}>
        {OPTIONAL_PROGRAM_FIELDS.map(({ value, label }) => (
          <label key={value} className={styles.checkboxOption}>
            <input
              type="checkbox"
              checked={selectedFields.includes(value)}
              onChange={() => {
                setSelectedFields(prev =>
                  prev.includes(value)
                    ? prev.filter(f => f !== value)
                    : [...prev, value]
                );
              }}
            />
            {label}
          </label>
        ))}
      </div>

      {result && (
        <div className={styles.auditResult}>
          {Array.isArray(result) && result.length > 0 ? (
            <>
              <h4>Programas con campos vacíos:</h4>
              <ul>
                {result.map(p => {
                  const missing = selectedFields.filter(field => {
                    const v = getValue(p, field);
                    if (Array.isArray(v)) return v.length === 0;
                    return v == null || v === '';
                  });
                  return (
                    <li key={p._id}>
                      {p.name} ({p._id})<br/>
                      <em>Faltan:</em> {missing
                        .map(f => OPTIONAL_PROGRAM_FIELDS.find(o => o.value === f)?.label || f)
                        .join(', ')}
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p>No se encontraron programas con estos campos vacíos.</p>
          )}
        </div>
      )}
    </>
  );
};

export default ProgramAuditPanel;
