import { useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/ManagingEmployer.module.css";

const FiltersCommunicationPublications = ({
  filters,
  programs,
  dispositives,
  handleFilterChange,
  resetFilters,
}) => {
  const [programQuery, setProgramQuery] = useState("");
  const [programOpen, setProgramOpen] = useState(false);
  const [dispositiveQuery, setDispositiveQuery] = useState("");
  const [dispositiveOpen, setDispositiveOpen] = useState(false);

  const programSearchRef = useRef(null);
  const dispositiveSearchRef = useRef(null);

  const normalize = (value) =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const getReferenceId = (value) => {
    if (!value) return "";
    if (typeof value === "object") return String(value._id || "");
    return String(value);
  };

  useEffect(() => {
    const closeSearches = (event) => {
      if (!programSearchRef.current?.contains(event.target)) {
        setProgramOpen(false);
      }

      if (!dispositiveSearchRef.current?.contains(event.target)) {
        setDispositiveOpen(false);
      }
    };

    document.addEventListener("mousedown", closeSearches);

    return () => {
      document.removeEventListener("mousedown", closeSearches);
    };
  }, []);

  const programResults = useMemo(() => {
    const query = normalize(programQuery);

    const items = programs
      .map((program) => ({
        id: String(program._id),
        display: program.acronym || program.name,
        name: program.name || "",
        searchable: `${program.acronym || ""} ${program.name || ""}`,
      }))
      .sort((a, b) => a.display.localeCompare(b.display, "es"));

    if (!query) return items.slice(0, 50);

    return items
      .filter((item) => normalize(item.searchable).includes(query))
      .slice(0, 50);
  }, [programQuery, programs]);

  const dispositiveResults = useMemo(() => {
    const query = normalize(dispositiveQuery);

    let items = dispositives
      .map((dispositive) => {
        const programId = getReferenceId(dispositive.program);
        const program = programs.find(
          (item) => String(item._id) === programId
        );

        return {
          id: String(dispositive._id),
          programId,
          display: dispositive.name || "",
          programDisplay: program?.acronym || program?.name || "",
          searchable: `${dispositive.name || ""} ${
            program?.acronym || ""
          } ${program?.name || ""}`,
        };
      })
      .sort((a, b) => a.display.localeCompare(b.display, "es"));

    if (filters.program) {
      items = items.filter(
        (item) => item.programId === String(filters.program)
      );
    }

    if (!query) return items.slice(0, 50);

    return items
      .filter((item) => normalize(item.searchable).includes(query))
      .slice(0, 50);
  }, [dispositiveQuery, dispositives, programs, filters.program]);

  useEffect(() => {
    if (filters.program) {
      const program = programs.find(
        (item) => String(item._id) === String(filters.program)
      );

      setProgramQuery(program?.acronym || program?.name || "");
    } else {
      setProgramQuery("");
    }

    if (filters.dispositive) {
      const dispositive = dispositives.find(
        (item) => String(item._id) === String(filters.dispositive)
      );

      setDispositiveQuery(dispositive?.name || "");
    } else {
      setDispositiveQuery("");
    }
  }, [
    filters.program,
    filters.dispositive,
    programs,
    dispositives,
  ]);

  const selectProgram = (program) => {
    setProgramQuery(program.display);
    setProgramOpen(false);
    setDispositiveQuery("");
    setDispositiveOpen(false);

    handleFilterChange({
      patch: {
        program: program.id,
        dispositive: "",
      },
    });
  };

  const selectDispositive = (dispositive) => {
    const program = programs.find(
      (item) => String(item._id) === dispositive.programId
    );

    setDispositiveQuery(dispositive.display);
    setDispositiveOpen(false);
    setProgramQuery(program?.acronym || program?.name || "");

    handleFilterChange({
      patch: {
        program: dispositive.programId,
        dispositive: dispositive.id,
      },
    });
  };

  const clearProgram = () => {
    setProgramQuery("");
    setDispositiveQuery("");
    setProgramOpen(false);
    setDispositiveOpen(false);

    handleFilterChange({
      patch: {
        program: "",
        dispositive: "",
      },
    });
  };

  const clearDispositive = () => {
    setDispositiveQuery("");
    setDispositiveOpen(false);

    handleFilterChange({
      patch: {
        dispositive: "",
      },
    });
  };

  const resetAll = () => {
    setProgramQuery("");
    setDispositiveQuery("");
    setProgramOpen(false);
    setDispositiveOpen(false);
    resetFilters();
  };

  return (
    <div className={styles.contenedorfiltro}>
      <div className={styles.filtroBuscar}>
        <label htmlFor="search">Buscar:</label>
        <input
          id="search"
          name="search"
          type="text"
          value={filters.search}
          onChange={handleFilterChange}
          placeholder="Título de la publicación..."
        />
      </div>

      <div>
        <label htmlFor="status">Estado:</label>
        <select
          id="status"
          name="status"
          value={filters.status}
          onChange={handleFilterChange}
        >
          <option value="">Todos</option>
          <option value="draft">Borrador</option>
          <option value="scheduled">Programada</option>
          <option value="partial">Publicación parcial</option>
          <option value="complete">Publicación completa</option>
          <option value="error">Error</option>
        </select>
      </div>

      <div>
        <label htmlFor="medium">Medio:</label>
        <select
          id="medium"
          name="medium"
          value={filters.medium}
          onChange={handleFilterChange}
        >
          <option value="all">Todos</option>
          <option value="both">WordPress e Instagram</option>
          <option value="wordpress">Solo WordPress</option>
          <option value="instagram">Solo Instagram</option>
          <option value="pending">Sin publicar</option>
        </select>
      </div>

      <div>
        <label htmlFor="programSearch">Programa:</label>

        <div
          className={styles.pdSearchWrap}
          ref={programSearchRef}
        >
          <input
            id="programSearch"
            type="text"
            className={styles.pdSearchInput}
            placeholder="Escribe para buscar programas…"
            value={programQuery}
            onChange={(event) => {
              setProgramQuery(event.target.value);
              setProgramOpen(true);
            }}
            onFocus={() => setProgramOpen(true)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && programResults[0]) {
                event.preventDefault();
                selectProgram(programResults[0]);
              }

              if (event.key === "Escape") {
                setProgramOpen(false);
              }
            }}
            role="combobox"
            aria-expanded={programOpen}
            aria-controls="communicationProgramList"
            aria-autocomplete="list"
          />

          {!!programQuery && (
            <p
              className={styles.pdClearBtn}
              onClick={clearProgram}
              aria-label="Limpiar programa"
            >
              ×
            </p>
          )}

          {programOpen && programResults.length > 0 && (
            <ul
              id="communicationProgramList"
              className={styles.pdSearchList}
              role="listbox"
            >
              {programResults.map((program, index) => (
                <li
                  key={program.id}
                  role="option"
                  aria-selected={index === 0}
                >
                  <p
                    className={styles.pdSearchItem}
                    onClick={() => selectProgram(program)}
                  >
                    <span className={styles.pdLabel}>
                      {program.display}
                    </span>

                    <span className={styles.pdLabelName}>
                      {program.name}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="dispositiveSearch">Dispositivo:</label>

        <div
          className={styles.pdSearchWrap}
          ref={dispositiveSearchRef}
        >
          <input
            id="dispositiveSearch"
            type="text"
            className={styles.pdSearchInput}
            placeholder={
              filters.program
                ? "Busca un dispositivo del programa…"
                : "Escribe para buscar dispositivos…"
            }
            value={dispositiveQuery}
            onChange={(event) => {
              setDispositiveQuery(event.target.value);
              setDispositiveOpen(true);
            }}
            onFocus={() => setDispositiveOpen(true)}
            onKeyDown={(event) => {
              if (
                event.key === "Enter" &&
                dispositiveResults[0]
              ) {
                event.preventDefault();
                selectDispositive(dispositiveResults[0]);
              }

              if (event.key === "Escape") {
                setDispositiveOpen(false);
              }
            }}
            role="combobox"
            aria-expanded={dispositiveOpen}
            aria-controls="communicationDispositiveList"
            aria-autocomplete="list"
          />

          {!!dispositiveQuery && (
            <p
              className={styles.pdClearBtn}
              onClick={clearDispositive}
              aria-label="Limpiar dispositivo"
            >
              ×
            </p>
          )}

          {dispositiveOpen &&
            dispositiveResults.length > 0 && (
              <ul
                id="communicationDispositiveList"
                className={styles.pdSearchList}
                role="listbox"
              >
                {dispositiveResults.map(
                  (dispositive, index) => (
                    <li
                      key={dispositive.id}
                      role="option"
                      aria-selected={index === 0}
                    >
                      <p
                        className={styles.pdSearchItem}
                        onClick={() =>
                          selectDispositive(dispositive)
                        }
                      >
                        <span className={styles.pdLabel}>
                          {dispositive.display}
                        </span>

                        <span
                          className={styles.pdLabelName}
                        >
                          {dispositive.programDisplay}
                        </span>
                      </p>
                    </li>
                  )
                )}
              </ul>
            )}
        </div>
      </div>

      <div>
        <label htmlFor="dateFrom">Desde:</label>
        <input
          id="dateFrom"
          name="dateFrom"
          type="date"
          value={filters.dateFrom}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="dateTo">Hasta:</label>
        <input
          id="dateTo"
          name="dateTo"
          type="date"
          value={filters.dateTo}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <button type="button" onClick={resetAll}>
          Reset filtros
        </button>
      </div>
    </div>
  );
};

export default FiltersCommunicationPublications;