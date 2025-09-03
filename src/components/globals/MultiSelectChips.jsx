import { useState, useMemo, useRef } from "react";
import styles from "./multiSelectChips.module.css";

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
    setTerm("");                         // limpia búsqueda
    if (selectRef.current) {
      selectRef.current.selectedIndex = 0; // vuelve al placeholder
      selectRef.current.blur();            // contrae
    }
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

  // Para controlar el valor del select (siempre “sin selección”)
  const selectValue = "";

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
        value={selectValue}
        onChange={(e) => add(e.target.value)}
        disabled={disabled || (term && filtered.length === 0)}
      >
        {/* Si NO hay término de búsqueda: muestra placeholder arriba */}
        {(!term || term.trim() === "") && (
          <option value="">
        Selecciona una opción
          </option>
        )}

        {/* Si hay término y NO hay resultados: muestra “Sin coincidencias” deshabilitado */}
        {term && filtered.length === 0 && (
          <option value="" disabled>
            Sin coincidencias
          </option>
        )}

        {/* Opciones filtradas (cuando hay o no término) */}
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
