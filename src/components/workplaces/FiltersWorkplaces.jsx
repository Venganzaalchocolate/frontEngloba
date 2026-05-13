// components/workplace/FiltersWorkplaces.jsx

import { useMemo, useState, useRef, useEffect } from 'react';
import styles from "../styles/filtersWorkplaces.module.css";

const FiltersWorkplaces = ({
  filters,
  enumsData,
  handleFilterChange,
  resetFilters,
}) => {
  // ======================================================
  // ESTADOS LOCALES PARA LOS TYPEAHEAD
  // ======================================================
  // pd = program device/program dropdown
  // dd = dispositive dropdown
  // Guardan el texto escrito en los inputs y si el desplegable está abierto.
  const [pdQuery, setPdQuery] = useState('');
  const [pdOpen, setPdOpen] = useState(false);

  const [ddQuery, setDdQuery] = useState('');
  const [ddOpen, setDdOpen] = useState(false);

  // ======================================================
  // REFS PARA DETECTAR CLICK FUERA
  // ======================================================
  // Sirven para cerrar los desplegables cuando se hace click fuera del input/lista.
  const programSearchWrapRef = useRef(null);
  const deviceSearchWrapRef = useRef(null);

  // ======================================================
  // HELPERS
  // ======================================================

  // Normaliza texto para búsquedas:
  // - convierte a string
  // - quita tildes
  // - pasa a minúsculas
  const norm = (s) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  // Convierte un índice tipo:
  // {
  //   "id1": { name: "..." },
  //   "id2": { name: "..." }
  // }
  // en un array tipo:
  // [
  //   { _id: "id1", name: "..." },
  //   { _id: "id2", name: "..." }
  // ]
  const toArrayFromIndex = (idxObj) =>
    Object.entries(idxObj || {}).map(([id, val]) => ({ _id: id, ...val }));

  // Texto principal que se muestra para un programa.
  // Si tiene acronym, muestra acronym. Si no, name.
  const programDisplay = (p) => p?.acronym || p?.name || '';

  // Nombre completo del programa.
  const programName = (p) => p?.name || '';

  // ======================================================
  // CERRAR DROPDOWNS AL CLICAR FUERA
  // ======================================================
  useEffect(() => {
    const onDocClick = (e) => {
      // Si el click no está dentro del buscador de programas, cierra programas.
      if (!programSearchWrapRef.current?.contains(e.target)) {
        setPdOpen(false);
      }

      // Si el click no está dentro del buscador de dispositivos, cierra dispositivos.
      if (!deviceSearchWrapRef.current?.contains(e.target)) {
        setDdOpen(false);
      }
    };

    document.addEventListener('mousedown', onDocClick);

    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // ======================================================
  // OPCIONES DE PROVINCIA
  // ======================================================
  // Genera las opciones del select de provincia a partir de provincesIndex.
  const provinceOptions = useMemo(() => {
    return Object.entries(enumsData?.provincesIndex || {})
      .map(([id, p]) => ({
        value: id,
        label: p.name,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [enumsData?.provincesIndex]);

  // ======================================================
  // PROGRAMAS Y DISPOSITIVOS EN FORMATO ARRAY
  // ======================================================
  // Convierte programsIndex en array para poder mapear, ordenar y filtrar.
  const programsArray = useMemo(() => {
    return toArrayFromIndex(enumsData?.programsIndex);
  }, [enumsData?.programsIndex]);

  // Convierte dispositiveIndex en array para poder mapear, ordenar y filtrar.
  const dispositivesArray = useMemo(() => {
    return toArrayFromIndex(enumsData?.dispositiveIndex);
  }, [enumsData?.dispositiveIndex]);

  // ======================================================
  // PROGRAMAS PARA EL TYPEAHEAD
  // ======================================================
  // Crea una lista plana de programas con los datos que necesita el buscador.
  const flatPrograms = useMemo(() => {
    return programsArray
      .map((p) => ({
        id: p?._id,
        programId: p?._id,

        // Lo que se verá en grande en la lista.
        display: programDisplay(p),

        // Nombre completo, se muestra debajo.
        name: programName(p),

        // Texto contra el que se busca.
        searchable: `${p?.name || ''} ${p?.acronym || ''}`,
      }))
      .filter((p) => p.id)
      .sort((a, b) => a.display.localeCompare(b.display, 'es'));
  }, [programsArray]);

  // Resultados del buscador de programas.
  // Si no hay texto, muestra los primeros 50.
  // Si hay texto, filtra por nombre o acrónimo.
  const pdResults = useMemo(() => {
    const q = norm(pdQuery);

    if (!q) return flatPrograms.slice(0, 50);

    return flatPrograms
      .filter((it) => norm(it.searchable).includes(q))
      .slice(0, 50);
  }, [pdQuery, flatPrograms]);

  // Al seleccionar un programa:
  // - escribe el programa en el input
  // - cierra el desplegable
  // - cambia el filtro programId
  // - limpia el dispositivo seleccionado
  const selectPd = (item) => {
    setPdQuery(item.display);
    setPdOpen(false);

    handleFilterChange({
      target: {
        name: 'programId',
        value: item.programId || '',
      },
    });

    handleFilterChange({
      target: {
        name: 'dispositive',
        value: '',
      },
    });

    setDdQuery('');
  };

  // ======================================================
  // DISPOSITIVOS PARA EL TYPEAHEAD
  // ======================================================
  // Crea una lista plana de dispositivos con su programa asociado.
  const flatDevices = useMemo(() => {
    return dispositivesArray
      .map((d) => {
        // Aquí se intenta sacar el id del programa asociado al dispositivo.
        // Puede venir como d.program, d.program._id o d.programId según el formato.
        const programId = d?.program?._id || d?.program || d?.programId || '';

        // Buscamos el programa en programsIndex para mostrar su acrónimo/nombre.
        const p = enumsData?.programsIndex?.[programId];

        return {
          id: d?._id,
          programId,

          // Nombre del dispositivo.
          display: d?.name || '',

          // Texto contra el que se busca.
          searchable: `${d?.name || ''} ${programDisplay(p)} ${programName(p)}`,

          // Datos del programa para mostrar en la segunda línea.
          programDisplay: programDisplay(p),
          programName: programName(p),
        };
      })
      .filter((d) => d.id)
      .sort((a, b) => a.display.localeCompare(b.display, 'es'));
  }, [dispositivesArray, enumsData?.programsIndex]);

  // Resultados del buscador de dispositivos.
  const ddResults = useMemo(() => {
    const q = norm(ddQuery);
    const searching = q.length > 0;

    // Si NO estás escribiendo y hay un programa seleccionado,
    // muestra solo los dispositivos de ese programa.
    //
    // Si estás escribiendo, busca globalmente entre todos los dispositivos.
    const base =
      !searching && filters.programId
        ? flatDevices.filter((d) => String(d.programId) === String(filters.programId))
        : flatDevices;

    if (!searching) return base.slice(0, 50);

    return base
      .filter((d) => norm(d.searchable).includes(q))
      .slice(0, 50);
  }, [ddQuery, flatDevices, filters.programId]);

  // Al seleccionar un dispositivo:
  // - escribe el nombre del dispositivo en el input
  // - cierra el desplegable
  // - cambia el filtro dispositive
  // - sincroniza también el programa si pertenece a otro programa
  const selectDevice = (item) => {
    setDdQuery(item.display);
    setDdOpen(false);

    handleFilterChange({
      target: {
        name: 'dispositive',
        value: item.id || '',
      },
    });

    if (String(filters.programId || '') !== String(item.programId || '')) {
      const p = enumsData?.programsIndex?.[item.programId];

      handleFilterChange({
        target: {
          name: 'programId',
          value: item.programId || '',
        },
      });

      setPdQuery(programDisplay(p));
    }
  };

  // ======================================================
  // SINCRONIZAR INPUTS CON FILTROS
  // ======================================================
  // Esto mantiene los inputs sincronizados cuando los filtros cambian desde fuera,
  // por ejemplo al resetear filtros o al cargar un estado inicial.
  useEffect(() => {
    // Sincroniza input de programa.
    if (filters.programId) {
      const p = enumsData?.programsIndex?.[filters.programId];
      setPdQuery(programDisplay(p));
    } else {
      setPdQuery('');
    }

    // Sincroniza input de dispositivo.
    if (filters.dispositive) {
      const d = enumsData?.dispositiveIndex?.[filters.dispositive];
      setDdQuery(d?.name || '');
    } else {
      setDdQuery('');
    }
  }, [
    filters.programId,
    filters.dispositive,
    enumsData?.programsIndex,
    enumsData?.dispositiveIndex,
  ]);

  // ======================================================
  // RESET LOCAL + RESET PADRE
  // ======================================================
  const handleReset = () => {
    setPdQuery('');
    setDdQuery('');
    setPdOpen(false);
    setDdOpen(false);

    resetFilters();
  };

  // ======================================================
  // RENDER
  // ======================================================
return (
  <div className={styles.contenedorfiltro}>
    <div className={styles.contenedorfiltroOpciones}>
      <div className={`${styles.filterField} ${styles.filterFull}`}>
        <label htmlFor="q">Buscar:</label>
        <input
          type="text"
          id="q"
          name="q"
          value={filters.q || ''}
          onChange={handleFilterChange}
          placeholder="Nombre, dirección, municipio, CP..."
        />
      </div>

      <div className={styles.filterField}>
        <label htmlFor="province">Provincia:</label>
        <select
          id="province"
          name="province"
          value={filters.province || ''}
          onChange={handleFilterChange}
        >
          <option value="">Todas</option>
          {provinceOptions.map((item) => (
            <option value={item.value} key={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div className={styles.filterField}>
        <label htmlFor="pdSearch">Programa:</label>

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

              if (!e.target.value) {
                handleFilterChange({ target: { name: 'programId', value: '' } });
                handleFilterChange({ target: { name: 'dispositive', value: '' } });
                setDdQuery('');
              }
            }}
            onFocus={() => setPdOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && pdResults[0]) {
                e.preventDefault();
                selectPd(pdResults[0]);
              }

              if (e.key === 'Escape') setPdOpen(false);
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
                setPdQuery('');
                setDdQuery('');
                handleFilterChange({ target: { name: 'programId', value: '' } });
                handleFilterChange({ target: { name: 'dispositive', value: '' } });
              }}
              aria-label="Limpiar búsqueda de programa"
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

      <div className={styles.filterField}>
        <label htmlFor="ddSearch">Dispositivo:</label>

        <div className={styles.pdSearchWrap} ref={deviceSearchWrapRef}>
          <input
            id="ddSearch"
            type="text"
            className={styles.pdSearchInput}
            placeholder={
              filters.programId
                ? 'Busca dispositivo del programa…'
                : 'Escribe para buscar dispositivos…'
            }
            value={ddQuery}
            onChange={(e) => {
              setDdQuery(e.target.value);
              setDdOpen(true);

              if (filters.programId) {
                handleFilterChange({ target: { name: 'programId', value: '' } });
                setPdQuery('');
              }

              if (!e.target.value) {
                handleFilterChange({ target: { name: 'dispositive', value: '' } });
              }
            }}
            onFocus={() => setDdOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && ddResults[0]) {
                e.preventDefault();
                selectDevice(ddResults[0]);
              }

              if (e.key === 'Escape') setDdOpen(false);
            }}
            role="combobox"
            aria-expanded={ddOpen}
            aria-controls="ddSearchList"
            aria-autocomplete="list"
          />

          {!!ddQuery && (
            <p
              className={styles.pdClearBtn}
              onClick={() => {
                setDdQuery('');
                handleFilterChange({ target: { name: 'dispositive', value: '' } });
              }}
              aria-label="Limpiar búsqueda de dispositivo"
            >
              ×
            </p>
          )}

          {ddOpen && ddResults.length > 0 && (
            <ul id="ddSearchList" className={styles.pdSearchList} role="listbox">
              {ddResults.map((item, i) => (
                <li key={item.id} role="option" aria-selected={i === 0}>
                  <p className={styles.pdSearchItem} onClick={() => selectDevice(item)}>
                    <span className={styles.pdLabel}>{item.display}</span>
                    <span className={styles.pdLabelName}>
                      {item.programDisplay || item.programName}
                    </span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className={styles.filterField}>
        <label htmlFor="active">Estado:</label>
        <select
          id="active"
          name="active"
          value={filters.active || 'total'}
          onChange={handleFilterChange}
        >
          <option value="total">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>
    </div>

    <div className={styles.filterActions}>
      <button type="button" onClick={handleReset}>
        Reset Filtros
      </button>
    </div>
  </div>
);
};

export default FiltersWorkplaces;