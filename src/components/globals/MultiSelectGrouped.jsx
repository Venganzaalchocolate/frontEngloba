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

const getVisible = (opts) => (opts ?? []).filter((o) => o.public !== false);

function MultiSelectGrouped({ label, enums = [], selected = [], onAdd, onRemove, disabled }) {
  const id = useId();

  // Set con los IDs seleccionados
  const selectedSet = useMemo(() => new Set((selected || []).map(String)), [selected]);

  /**
   * Indexamos todos los elementos seleccionables (subcategorías si existen; si no,
   * la categoría raíz)
   * itemIndex: Map<idStr, { id, name, parentName }>
   */
  const itemIndex = useMemo(() => {
    const map = new Map();
    for (const cat of enums) {
      const catName = cat?.name ?? 'Otros';
      const subs = getVisible(cat?.subcategories);
      if (subs.length) {
        for (const s of subs) {
          if (!s || s.public === false) continue;
          const idStr = String(s._id ?? s.id ?? s.value ?? s.name);
          map.set(idStr, { id: idStr, name: s.name, parentName: catName });
        }
      } else if (cat?.public !== false) {
        // categoría sin subcategorías (o no visibles) → seleccionable
        const idStr = String(cat._id ?? cat.id ?? cat.value ?? cat.name);
        map.set(idStr, { id: idStr, name: catName, parentName: catName });
      }
    }
    return map;
  }, [enums]);

  // Total de opciones disponibles (para deshabilitar el select si no quedan)
  const totalOptions = useMemo(() => itemIndex.size, [itemIndex]);

  // Agrupamos los IDs seleccionados por su categoría padre
  const groups = useMemo(() => {
    const acc = {};
    for (const rawId of selected || []) {
      const idStr = String(rawId);
      const entry = itemIndex.get(idStr);
      if (!entry) continue; // seleccionado que ya no existe en enums visibles
      const parent = entry.parentName || 'Otros';
      (acc[parent] ||= []).push(entry);
    }
    return acc;
  }, [selected, itemIndex]);

  // Añadir nuevo id desde el <select>
  const handleAdd = useCallback(
    (e) => {
      const v = e.target.value;
      if (v !== 'x' && !selectedSet.has(v)) onAdd?.(v);
      e.target.value = 'x';
    },
    [onAdd, selectedSet]
  );

  const hasAnyLeft = selectedSet.size < totalOptions;

  return (
    <div className={cls.multi}>
      <div className={cls.multiHeader}>
        <label htmlFor={id} className={cls.label}>
          {label}
        </label>
        <select
          id={id}
          className={`${cls.control} ${cls.multiSelect}`}
          onChange={handleAdd}
          defaultValue="x"
          disabled={disabled || !hasAnyLeft}
        >
          <option value="x">Añadir…</option>

          {enums.map((cat) => {
            const visibleSubs = getVisible(cat.subcategories);
            const options =
              visibleSubs.length > 0
                ? visibleSubs
                : cat.public !== false
                ? [cat] // categoría seleccionable si no tiene subcategorías visibles
                : [];

            return (
              <optgroup key={cat.name} label={cat.name}>
                {options.map((opt) => {
                  const idStr = String(opt._id ?? opt.id ?? opt.value ?? opt.name);
                  const optName = opt.name;
                  const disabledOpt = selectedSet.has(idStr);
                  return (
                    <option key={idStr} value={idStr} disabled={disabledOpt}>
                      {optName}
                    </option>
                  );
                })}
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
                {items.map((it) => (
                  <MemoChip key={it.id} value={it.id} label={it.name} onRemove={onRemove} />
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
