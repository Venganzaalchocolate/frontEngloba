import { useState, useMemo, useRef } from "react";
import styles from "./../styles/multiSelectChips.module.css";

export default function MultiSelectChips({
  options = [],              // puede ser plano o agrupado
  value = [],
  onChange,
  placeholder = "Escribe para buscar…",
  hint,
  max,
  allowDuplicates = false,
  disabled = false,
}) {
  const [term, setTerm] = useState("");
  const selectRef = useRef(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  // --- helpers: soportar plano y grupos ---
  const isGroup = (opt) => Array.isArray(opt?.subcategories) && opt.subcategories.length > 0;

  const flatten = useMemo(() => {
    // lista plana con label final (incluye "Padre · Hijo")
    return options.flatMap((opt) => {
      if (isGroup(opt)) {
        const parent = opt.label || opt.name || "";
        return opt.subcategories.map((s) => ({
          value: s.value,
          label: parent ? `${parent} · ${s.label}` : s.label,
          _group: parent,
          _rawLabel: s.label,
          public: s.public,
        }));
      }
      return opt?.value
        ? [{
            value: opt.value,
            label: opt.label,
            _group: null,
            _rawLabel: opt.label,
            public: opt.public,
          }]
        : [];
    });
  }, [options]);

  const filteredFlat = useMemo(() => {
    let base = term
      ? flatten.filter((o) => (o.label || "").toLowerCase().includes(term.toLowerCase()))
      : flatten;

    // respeta "public" si lo usas
    base = base.filter((o) => o.public === undefined || o.public === true);

    if (!allowDuplicates) base = base.filter((o) => !selectedSet.has(o.value));
    return base;
  }, [flatten, term, allowDuplicates, selectedSet]);

  const add = (val) => {
    if (disabled || !val) return;
    if (max && value.length >= max) return;
    if (!allowDuplicates && selectedSet.has(val)) return;

    onChange?.([...value, val]);
    setTerm("");
    selectRef.current?.blur();
  };

  const remove = (val) => {
    onChange?.(value.filter((v) => v !== val));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filteredFlat.length > 0) add(filteredFlat[0].value);
    }
    if (e.key === "Backspace" && !term && value.length) {
      e.preventDefault();
      remove(value[value.length - 1]);
    }
  };

  // --- para el <select>: si NO hay búsqueda, renderiza optgroups reales ---
  const groupsForSelect = useMemo(() => {
    if (term) return null; // con búsqueda usamos lista plana (sin optgroup)
    // normalizamos a estructura con grupos + singles
    const gs = [];
    const singles = [];

    for (const opt of options) {
      if (isGroup(opt)) {
        const label = opt.label || opt.name || "Sin categoría";
        const subs = opt.subcategories
          .filter((s) => (s.public ?? true))
          .map((s) => ({ value: s.value, label: s.label }));

        gs.push({ label, subs });
      } else if (opt?.value) {
        if (opt.public === false) continue;
        singles.push({ value: opt.value, label: opt.label });
      }
    }

    gs.sort((a, b) => a.label.localeCompare(b.label));
    gs.forEach((g) => g.subs.sort((a, b) => a.label.localeCompare(b.label)));
    singles.sort((a, b) => a.label.localeCompare(b.label));

    return { gs, singles };
  }, [options, term]);

  // label chip: usa flatten para mostrar "Padre · Hijo" si aplica
  const labelByValue = useMemo(() => {
    const m = new Map(flatten.map((o) => [o.value, o.label]));
    return m;
  }, [flatten]);

  return (
    <div className={styles.msc} aria-disabled={disabled}>
      {/* BUSCADOR */}
      <input
        type="text"
        className={styles.searchInput}
        value={term}
        placeholder={placeholder}
        onChange={(e) => setTerm(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
      />

      {/* SELECT NATIVO */}
      <select
        ref={selectRef}
        value=""
        onChange={(e) => add(e.target.value)}
        disabled={disabled || (term && filteredFlat.length === 0)}
      >
        <option value="" disabled hidden={!!term}>
          {(term && filteredFlat.length > 0) ? filteredFlat[0].label : "Selecciona una opción"}
        </option>

        {term && filteredFlat.length === 0 && (
          <option value="" disabled>Sin coincidencias</option>
        )}

        {/* Con búsqueda: lista plana (pero con etiqueta "Padre · Hijo") */}
        {term &&
          filteredFlat.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}

        {/* Sin búsqueda: optgroups reales */}
        {!term && groupsForSelect?.gs?.map((g) => (
          <optgroup key={`grp-${g.label}`} label={g.label}>
            {g.subs
              .filter((s) => allowDuplicates || !selectedSet.has(s.value))
              .map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
          </optgroup>
        ))}

        {!term && groupsForSelect?.singles?.map((s) => {
          if (!allowDuplicates && selectedSet.has(s.value)) return null;
          return (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          );
        })}
      </select>

      {/* CHIPS SELECCIONADAS */}
      <div className={styles.selectedArea}>
        {value.length === 0 && (
          <span className={styles.emptyHint}>
            {hint || "No hay elementos seleccionados."}
          </span>
        )}

        {value.map((val) => {
          const label = labelByValue.get(val) ?? val;
          return (
            <span key={val} className={styles.chip} title={label}>
              <span className={styles.chipLabel}>{label}</span>
              {!disabled && (
                <button
                  type="button"
                  className={styles.chipRemove}
                  onClick={() => remove(val)}
                  aria-label={`Quitar ${label}`}
                >
                  ×
                </button>
              )}
            </span>
          );
        })}
      </div>
    </div>
  );
}
