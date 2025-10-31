import React, { useState, useEffect } from "react";
import styles from "../styles/modalForm.module.css";
import useDebounce from "../../lib/utils";

const AsyncSearchSelect = ({ field, onChange }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [options, setOptions] = useState([]);
  const [loading, setLoading] = useState(false);
  const debouncedSearch = useDebounce(searchTerm, 400); // ⏳ retrasa la búsqueda

  // 🔎 Efecto que lanza la búsqueda cuando cambian las letras (y se cumplen 3+)
  useEffect(() => {
    const fetchData = async () => {
      if (!debouncedSearch || debouncedSearch.length < 3) {
        setOptions([]);
        return;
      }
      setLoading(true);
      try {
        const res = await field.loadOptions(debouncedSearch);
        setOptions(res || []);
      } catch (e) {
        console.error("Error cargando opciones:", e);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [debouncedSearch, field.loadOptions]);

  return (
    <div className={styles.modalInputGroup}>
      <input
        type="text"
        placeholder={field.placeholder || "Buscar..."}
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className={styles.searchInput}
      />
      {loading && <p className={styles.helperText}>Buscando...</p>}
      {options.length > 0 && (
        <select
          onChange={(e) =>
            onChange({
              target: {
                name: field.name,
                value: e.target.value,
              },
            })
          }
          required={field.required}
          className={styles.select}
        >
          <option value="">Seleccione</option>
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      )}
    </div>
  );
};

export default AsyncSearchSelect;
