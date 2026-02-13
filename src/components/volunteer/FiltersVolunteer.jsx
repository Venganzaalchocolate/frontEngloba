import styles from "../styles/ManagingEmployer.module.css";
import { useMemo, useRef, useState, useEffect } from "react";

const STATE_ENUM = ["no asignado", "activo", "descartado", "pendiente"];

const PROGRAM_AREA_ENUM = [
  "igualdad",
  "desarrollo comunitario",
  "lgtbiq",
  "infancia y juventud",
  "personas con discapacidad",
  "mayores",
];

const FiltersVolunteer = ({
  filters,
  enums,
  handleFilterChange,
  resetFilters,
}) => {
  // PROGRAM (pd*) typeahead
  const [pdQuery, setPdQuery] = useState("");
  const [pdOpen, setPdOpen] = useState(false);
  const programSearchWrapRef = useRef(null);

  // cerrar dropdown al clicar fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!programSearchWrapRef.current?.contains(e.target)) setPdOpen(false);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  // ======================
  // Helpers
  // ======================
  const norm = (s) =>
    (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  // ======================
  // Provincias agrupadas (root/sub)
  // ======================
  const provincesGroups = useMemo(() => {
    const idx = enums?.provincesIndex || {};
    const entries = Object.entries(idx);

    const roots = entries.filter(([, v]) => v?.isRoot);
    return roots.map(([rootId, root]) => {
      const subs = entries
        .filter(([, v]) => v?.isSub && v?.parent === rootId)
        .map(([id, v]) => ({ _id: id, name: v.name }));
      return { _id: rootId, name: root.name, subcategories: subs };
    });
  }, [enums?.provincesIndex]);

  const renderCategoryOptionsById = (cats) =>
    cats.map((x) => {
      if (x.subcategories && x.subcategories.length > 0) {
        return (
          <optgroup label={x.name} key={x._id}>
            {x.subcategories.map((y) => (
              <option value={y._id} key={y._id}>
                {y.name}
              </option>
            ))}
          </optgroup>
        );
      }
      return (
        <option value={x._id} key={x._id}>
          {x.name}
        </option>
      );
    });

  // ======================
  // Programas (typeahead)
  // ======================
  const flatPrograms = useMemo(() => {
    const idx = enums?.programsIndex || {};
    return Object.entries(idx)
      .map(([id, p]) => ({
        type: "program",
        id,
        programId: id,
        display: p?.acronym || p?.name || id,
        name: p?.name || "",
        searchable: `${p?.name || ""} ${p?.acronym || ""}`.trim(),
      }))
      .sort((a, b) => (a.display || "").localeCompare(b.display || "", "es"));
  }, [enums?.programsIndex]);

  const pdResults = useMemo(() => {
    const q = norm(pdQuery);
    if (!q) return flatPrograms.slice(0, 50);
    return flatPrograms.filter((it) => norm(it.searchable).includes(q)).slice(0, 50);
  }, [pdQuery, flatPrograms]);

  const selectPd = (item) => {
    setPdQuery(item.display || "");
    setPdOpen(false);
    handleFilterChange({ target: { name: "programId", value: item.programId || "" } });
  };

  // sincronizar input del typeahead con el filtro actual
  useEffect(() => {
    if (filters.programId) {
      const p = enums?.programsIndex?.[filters.programId];
      setPdQuery(p?.acronym || p?.name || "");
    } else {
      setPdQuery("");
    }
  }, [filters.programId, enums?.programsIndex]);

  // ======================
  // RENDER
  // ======================
  return (
    <div className={styles.contenedorfiltro}>
      <h3>Filtros</h3>

      {/* Búsqueda global (back: q) */}
      <div className={styles.filtroBuscar}>
        <label htmlFor="q">Buscar:</label>
        <input
          type="text"
          id="q"
          name="q"
          value={filters.q || ""}
          onChange={handleFilterChange}
          placeholder="Nombre, apellidos, email, DNI, localidad, teléfono…"
        />
      </div>

      {/* Provincias */}
      <div>
        <label htmlFor="province">Provincia</label>
        <select
          id="province"
          name="province"
          onChange={handleFilterChange}
          value={filters.province || ""}
        >
          <option value="">Selecciona una opción</option>
          {renderCategoryOptionsById(provincesGroups)}
        </select>
      </div>

      {/* Programa (typeahead como empleados) */}
      <div>
        <label htmlFor="pdSearch">Justificación en programas:</label>
        <div className={styles.pdSearchWrap} ref={programSearchWrapRef}>
          <input
            id="pdSearch"
            type="text"
            className={styles.pdSearchInput}
            placeholder="Escribe para buscar programas…"
            value={pdQuery}
            onChange={(e) => {
              setPdQuery(e.target.value);
              setPdOpen(true);
            }}
            onFocus={() => setPdOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && pdResults[0]) {
                e.preventDefault();
                selectPd(pdResults[0]);
              }
              if (e.key === "Escape") setPdOpen(false);
            }}
            role="combobox"
            aria-expanded={pdOpen}
            aria-controls="pdSearchList"
            aria-autocomplete="list"
          />

          {!!pdQuery && (
            <p
              className={styles.pdClearBtn}
              onClick={() => {
                setPdQuery("");
                setPdOpen(false);
                handleFilterChange({ target: { name: "programId", value: "" } });
              }}
              aria-label="Limpiar programa"
            >
              ×
            </p>
          )}

          {pdOpen && pdResults.length > 0 && (
            <ul id="pdSearchList" className={styles.pdSearchList} role="listbox">
              {pdResults.map((item, i) => (
                <li key={item.id} role="option" aria-selected={i === 0}>
                  <p className={styles.pdSearchItem} onClick={() => selectPd(item)}>
                    <span className={styles.pdLabel}>{item.display}</span>
                    <span className={styles.pdLabelName}>{item.name}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Área (back: area) */}
      <div>
        <label htmlFor="area">Área de interés</label>
        <select
          id="area"
          name="area"
          onChange={handleFilterChange}
          value={filters.area || ""}
        >
          <option value="">Selecciona una opción</option>
          {PROGRAM_AREA_ENUM.map((x) => (
            <option key={x} value={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      {/* Estado (back: active boolean u omit) */}
      <div>
        <label htmlFor="active">Tipo</label>
        <select
          id="active"
          name="active"
          onChange={handleFilterChange}
          value={filters.active || "total"}
        >
          <option value="total">Activos e inactivos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

            {/* Estado (back: active boolean u omit) */}
      <div>
        <label htmlFor="active">Estado</label>
        <select
          id="state"
          name="state"
          onChange={handleFilterChange}
          value={filters.state || "todos"}
        >
          <option value={"todos"}>Todos</option>
          {
            STATE_ENUM.map((x)=>{
              return <option value={x}>{x}</option>
            })
          }
          
        </select>
      </div>

      {/* Reset */}
      <div>
        <button
          onClick={() => {
            setPdQuery("");
            setPdOpen(false);
            handleFilterChange({ target: { name: "programId", value: "" } });
            resetFilters();
          }}
        >
          Reset Filtros
        </button>
      </div>
    </div>
  );
};

export default FiltersVolunteer;
