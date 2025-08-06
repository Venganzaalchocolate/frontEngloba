import { memo, useMemo, useCallback, useId } from 'react';
import cls from '../styles/formJobUp.module.css';

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

const getVisible = (opts) => (opts ?? []).filter(o => o.public !== false);

function MultiSelectGrouped({ label, enums = [], selected = [], onAdd, onRemove, disabled }) {
  const id = useId();

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const parentBySub = useMemo(() => {
    const map = new Map();
    for (const cat of enums) {
      const subs = getVisible(cat.subcategories);
      if (subs.length) {
        for (const s of subs) map.set(s.name, cat.name);
      } else if (cat.public !== false) {
        // categoría sin subcategorías (o sin visibles)
        map.set(cat.name, 'Otros');
      }
    }
    return map;
  }, [enums]);

  const groups = useMemo(() => {
    const acc = {};
    for (const name of selected) {
      if (!parentBySub.has(name)) continue; // si no es visible, no se muestra
      const parent = parentBySub.get(name) ?? 'Otros';
      (acc[parent] ||= []).push(name);
    }
    return acc;
  }, [selected, parentBySub]);

  const totalOptions = useMemo(() => {
    let count = 0;
    for (const cat of enums) {
      const subs = getVisible(cat.subcategories);
      count += subs.length || (cat.public !== false ? 1 : 0);
    }
    return count;
  }, [enums]);

  const handleAdd = useCallback((e) => {
    const v = e.target.value;
    if (v !== 'x' && !selectedSet.has(v)) onAdd(v);
    e.target.value = 'x';
  }, [onAdd, selectedSet]);

  const hasAnyLeft = selectedSet.size < totalOptions;

  return (
    <div className={cls.multi}>
      <div className={cls.multiHeader}>
        <label htmlFor={id} className={cls.label}>{label}</label>
        <select
          id={id}
          className={`${cls.control} ${cls.multiSelect}`}
          onChange={handleAdd}
          defaultValue="x"
          disabled={disabled || !hasAnyLeft}
        >
          <option value="x">Añadir…</option>
          {enums.map(cat => {
            const visibleSubs = getVisible(cat.subcategories);
            const options = visibleSubs.length ? visibleSubs : (cat.public !== false ? [cat] : []);
            return (
              <optgroup key={cat.name} label={cat.name}>
                {options.map(opt => (
                  <option key={opt.name} value={opt.name} disabled={selectedSet.has(opt.name)}>
                    {opt.name}
                  </option>
                ))}
              </optgroup>
            );
          })}
        </select>
      </div>

      <div className={cls.groups}>
        {Object.keys(groups).length === 0 ? (
          <div className={cls.group}>
            <span className={cls.groupTitle}>Sin elementos seleccionados</span>
          </div>
        ) : (
          Object.entries(groups).map(([parent, items]) => (
            <div key={parent} className={cls.group}>
              <span className={cls.groupTitle}>{parent}</span>
              <div className={cls.chips}>
                {items.map(name => (
                  <MemoChip key={name} name={name} onRemove={onRemove} />
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default memo(MultiSelectGrouped);
