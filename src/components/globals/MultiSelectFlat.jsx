import { memo, useMemo, useCallback, useId } from 'react';
import cls from '../styles/formJobUp.module.css';

function Chip({ label, value, onRemove }) {
  return (
    <span className={cls.chip}>
      {label}
      <button
        type="button"
        className={cls.chipBtn}
        onClick={() => onRemove(value)}
        aria-label={`Quitar ${label}`}
      >
        ×
      </button>
    </span>
  );
}
const MemoChip = memo(Chip);

/** Aplana enums -> [{ id, label }] (únicos por id + ordenados por label) */
function useFlatOptions(enums) {
  return useMemo(() => {
    const map = new Map(); // idStr -> { id, label }

    for (const cat of enums || []) {
      const subs = Array.isArray(cat?.subcategories) ? cat.subcategories : [];

      // Si hay subcategorías, usamos esas; si no, la categoría raíz es seleccionable
      if (subs.length > 0) {
        for (const s of subs) {
          if (!s) continue;
          const idStr = String(s._id ?? s.id ?? s.value ?? s.name);
          const label = s.name ?? '';
          if (idStr && label && !map.has(idStr)) map.set(idStr, { id: idStr, label });
        }
      } else {
        const idStr = String(cat?._id ?? cat?.id ?? cat?.value ?? cat?.name ?? '');
        const label = cat?.name ?? '';
        if (idStr && label && !map.has(idStr)) map.set(idStr, { id: idStr, label });
      }
    }

    return Array.from(map.values()).sort((a, b) => a.label.localeCompare(b.label, 'es'));
  }, [enums]);
}

function MultiSelectFlat({
  label,
  enums = [],
  selected = [],         // Array de IDs (string)
  onAdd,
  onRemove,
  disabled,
  placeholder = 'Añadir…',
}) {
  const id = useId();

  const options = useFlatOptions(enums);
  const selectedSet = useMemo(() => new Set((selected || []).map(String)), [selected]);

  const available = useMemo(
    () => options.filter(o => !selectedSet.has(String(o.id))),
    [options, selectedSet]
  );

  const handleAdd = useCallback((e) => {
    const v = e.target.value;
    if (v !== 'x' && !selectedSet.has(String(v))) onAdd?.(v);
    e.target.value = 'x';
  }, [onAdd, selectedSet]);

  // Para pintar chips: resolvemos label por id; fallback al id si no encontramos
  const selectedEntries = useMemo(() => {
    const byId = new Map(options.map(o => [String(o.id), o]));
    return (selected || []).map((id) => {
      const idStr = String(id);
      const found = byId.get(idStr);
      return { id: idStr, label: found?.label ?? idStr };
    });
  }, [selected, options]);

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
          {available.map(opt => (
            <option key={opt.id} value={opt.id}>{opt.label}</option>
          ))}
        </select>
      </div>

      <div className={cls.groupsS}>
        {selectedEntries.length === 0 ? (
          <div className={cls.group}>
            <span className={cls.groupTitle}>Sin elementos seleccionados</span>
          </div>
        ) : (
          <div className={cls.group}>
            <span className={cls.groupTitle}>{label}</span>
            <div className={cls.chips}>
              {selectedEntries.map(({ id: value, label }) => (
                <MemoChip key={value} value={value} label={label} onRemove={onRemove} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default memo(MultiSelectFlat);
