import { useState, useMemo, useRef } from "react";
import styles from "./../styles/multiSelectChips.module.css";

export default function MultiSelectChips({
  options = [],              // [{ value, label }]
  value = [],                // string[]
  onChange,                  // (next: string[]) => void
  placeholder = "Escribe para buscar…",
  hint,
  max,
  allowDuplicates = false,
  disabled = false,
}) {
  const [term, setTerm] = useState("");
  const selectRef = useRef(null);

  const selectedSet = useMemo(() => new Set(value), [value]);

  const filtered = useMemo(() => {
    let base = term
      ? options.filter(o =>
        (o.label || "").toLowerCase().includes(term.toLowerCase())
      )
      : options;

    if (!allowDuplicates) {
      base = base.filter(o => !selectedSet.has(o.value));
    }
    return base;
  }, [options, term, allowDuplicates, selectedSet]);

  const add = (val) => {
    if (disabled || !val) return;
    if (max && value.length >= max) return;
    if (!allowDuplicates && selectedSet.has(val)) return;

    onChange?.([...value, val]);
    setTerm("");
    selectRef.current?.blur();
  };

  const remove = (val) => {
    onChange?.(value.filter(v => v !== val));
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      if (filtered.length > 0) add(filtered[0].value);
    }
    if (e.key === "Backspace" && !term && value.length) {
      e.preventDefault();
      remove(value[value.length - 1]);
    }
  };

  if(disabled){
    return 
  }else {
    
  }
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

      {/* SELECT NATIVO (contraído) */}
      <select
        ref={selectRef}
        value=""                                   // sin selección real
        onChange={(e) => add(e.target.value)}
        disabled={disabled || (term && filtered.length === 0)}
      >
        {/* Placeholder con texto; se oculta del desplegable si hay búsqueda */}
        <option
          value=""
          disabled
          hidden={!!term}
          aria-hidden={!!term}
          style={{ display: term ? "none" : undefined }} // fallback cross-browser
        >
          {(term && filtered.length > 0) ? filtered[0].label : 'Selecciona una opción'}
        </option>

        {term && filtered.length === 0 && (
          <option value="" disabled>Sin coincidencias</option>
        )}

        {filtered.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* CHIPS SELECCIONADAS */}
      <div className={styles.selectedArea}>
        {value.length === 0 && (
          <span className={styles.emptyHint}>
            {hint || "No hay elementos seleccionados."}
          </span>
        )}
        {value.map((val) => {
          const opt = options.find(o => o.value === val);
          const label = opt?.label ?? val;
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
