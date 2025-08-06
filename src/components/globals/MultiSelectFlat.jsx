// src/components/globals/MultiSelectFlat.jsx
import { memo, useMemo, useCallback, useId } from 'react';
import cls from '../styles/formJobUp.module.css';

/**
 * enums: [{ name, subcategories?: [{ name }] }]
 * selected: array<string>
 * onAdd(name: string), onRemove(name: string)
 */
function Chip({ name, onRemove }) {
  return (
    <span className={cls.chip}>
      {name}
      <button
        type="button"
        className={cls.chipBtn}
        onClick={() => onRemove(name)}
        aria-label={`Quitar ${name}`}
      >
        ×
      </button>
    </span>
  );
}
const MemoChip = memo(Chip);

/** Aplana enums -> ["Madrid", "Barcelona", ...] (únicos + ordenados) */
function useFlatOptions(enums) {
  return useMemo(() => {
    const out = [];
    for (const cat of enums || []) {
      if (cat?.subcategories?.length) {
        for (const s of cat.subcategories) {
          
          if (s?.name) out.push(s.name);
        }
      } else if (cat?.name) {
        out.push(cat.name);
      }
    }
    // Únicos y ordenados (locale ES para tildes)
    return Array.from(new Set(out)).sort((a, b) => a.localeCompare(b, 'es'));
  }, [enums]);
}

function MultiSelectFlat({
  label,
  enums = [],
  selected = [],
  onAdd,
  onRemove,
  disabled,
  placeholder = 'Añadir…',
}) {
  const id = useId();

  const options = useFlatOptions(enums);
  const selectedSet = useMemo(() => new Set(selected), [selected]);
  const available = useMemo(
    () => options.filter(o => !selectedSet.has(o)),
    [options, selectedSet]
  );

  const handleAdd = useCallback((e) => {
    const v = e.target.value;
    if (v !== 'x' && !selectedSet.has(v)) onAdd(v);
    e.target.value = 'x';
  }, [onAdd, selectedSet]);

  return (
    <div className={cls.multi}>
      <div className={cls.multiHeader}>
        <label htmlFor={id} className={cls.label}>{label}</label>
        <select
          id={id}
          className={`${cls.control} ${cls.multiSelect}`}
          onChange={handleAdd}
          defaultValue="x"
          disabled={disabled || available.length === 0}
        >
          <option value="x">{placeholder}</option>
          {available.map(name => (
            <option key={name} value={name}>{name}</option>
          ))}
        </select>
      </div>

      <div className={cls.groupsS}>
        {selected.length === 0 ? (
          <div className={cls.group}>
            <span className={cls.groupTitle}>Sin elementos seleccionados</span>
          </div>
        ) : (
          <div className={cls.group}>
            <span className={cls.groupTitle}>{label}</span>
            <div className={cls.chips}>
              {selected.map(name => (
                <MemoChip key={name} name={name} onRemove={onRemove} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MultiSelectFlat);
