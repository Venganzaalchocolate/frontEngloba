import styles from '../styles/ManagingEmployer.module.css';
import { useMemo, useState, useRef, useEffect } from 'react';

const Filters = ({ filters, enums: enumsEmployer, handleFilterChange, resetFilters, listResponsability }) => {
  // PROGRAM (pd*) y DEVICE (dd*) typeahead
  const [pdQuery, setPdQuery] = useState('');
  const [pdOpen, setPdOpen] = useState(false);
  const [ddQuery, setDdQuery] = useState('');
  const [ddOpen, setDdOpen] = useState(false);

  // RESPONSABILIDADES (resp*)
  const [respOpen, setRespOpen] = useState(false);
  const [respQuery, setRespQuery] = useState('');

  const programSearchWrapRef = useRef(null);
  const deviceSearchWrapRef = useRef(null);
  const respSearchWrapRef = useRef(null);

  // Cerrar dropdowns al clicar fuera
  useEffect(() => {
    const onDocClick = (e) => {
      if (!programSearchWrapRef.current?.contains(e.target)) setPdOpen(false);
      if (!deviceSearchWrapRef.current?.contains(e.target)) setDdOpen(false);
      if (!respSearchWrapRef.current?.contains(e.target)) setRespOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);




  // ======================
  // Helpers
  // ======================
  const norm = (s) =>
    (s || '').toString().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  const toArrayFromIndex = (idxObj) =>
    Object.entries(idxObj || {}).map(([id, val]) => ({ _id: id, ...val }));

  const programDisplay = (p) => (p ? p.acronym : '');
  const programName = (p) => (p ? p.name : '');

  // Generar opciones según listResponsability (formato JSON string)
  const getResponsibilityOptions = () => {
    const options = [];
    listResponsability.forEach((item) => {
      if (item.isProgramResponsible) {
        const label = `(Programa) ${item.programName}`;
        const valueObj = {
          type: 'program',
          programId: item.idProgram,
        };
        const value = JSON.stringify(valueObj);
        options.push({ label, value });
      }
      if (item.isDeviceResponsible || item.isDeviceCoordinator) {
        const label = `(Dispositivo) ${item.dispositiveName} [${item.programName}]`;
        const valueObj = {
          type: 'device',
          programId: item.idProgram,
          deviceId: item.dispositiveId,
        };
        const value = JSON.stringify(valueObj);
        options.push({ label, value });
      }
    });
    return options;
  };

  // ======================
  // DATA desde enumsEmployer
  // ======================
  const statusList = Array.isArray(enumsEmployer?.status) ? enumsEmployer.status : [];
  const programsArray = toArrayFromIndex(enumsEmployer?.programsIndex);
  const dispositivesArray = toArrayFromIndex(enumsEmployer?.dispositiveIndex);
  const schedulesList = Array.isArray(enumsEmployer?.work_schedule)
    ? enumsEmployer.work_schedule
    : [];

  // Provincias agrupadas (root + subs)
  const provincesGroups = useMemo(() => {
    const idx = enumsEmployer?.provincesIndex || {};
    const entries = Object.entries(idx);
    const roots = entries.filter(([, v]) => v?.isRoot);
    return roots.map(([rootId, root]) => {
      const subs = entries
        .filter(([, v]) => v?.isSub && v?.parent === rootId)
        .map(([id, v]) => ({ _id: id, name: v.name }));
      return { _id: rootId, name: root.name, subcategories: subs };
    });
  }, [enumsEmployer?.provincesIndex]);

  const jobsGroups = useMemo(() => {
    const idx = enumsEmployer?.jobsIndex || {};
    const entries = Object.entries(idx);
    const roots = entries.filter(([, v]) => v?.isRoot);
    return roots.map(([rootId, root]) => {
      const subs = entries
        .filter(([, v]) => v?.isSub && v?.parent === rootId)
        .map(([id, v]) => ({ _id: id, name: v.name }));
      return { _id: rootId, name: root.name, subcategories: subs };
    });
  }, [enumsEmployer?.jobsIndex]);

  // ======================
  // Programas (typeahead)
  // ======================
  const flatPrograms = useMemo(() => {
    return programsArray
      .map((p) => ({
        type: 'program',
        id: p?._id,
        programId: p?._id,
        display: programDisplay(p),
        name: programName(p),
        searchable: `${p?.name || ''} ${p?.acronym || ''}`,
      }))
      .sort((a, b) => a.display.localeCompare(b.display, 'es'));
  }, [programsArray]);

  const pdResults = useMemo(() => {
    const q = norm(pdQuery);
    if (!q) return flatPrograms.slice(0, 50);
    return flatPrograms.filter((it) => norm(it.searchable).includes(q)).slice(0, 50);
  }, [pdQuery, flatPrograms]);

  const selectPd = (item) => {
    setPdQuery(item.display);
    setPdOpen(false);
    // Establece programa y limpia dispositivo
    handleFilterChange({ target: { name: 'programId', value: item.programId || '' } });
    handleFilterChange({ target: { name: 'dispositive', value: '' } });
    setDdQuery('');
  };

  // ======================
  // Dispositivos (typeahead)
  // ======================
  const flatDevices = useMemo(() => {
    return dispositivesArray
      .map((d) => {
        const p = enumsEmployer?.programsIndex?.[d.program];
        return {
          type: 'device',
          id: d?._id,
          programId: d?.program || '',
          display: d?.name || '',
          searchable: `${d?.name || ''} ${programDisplay(p)}`,
          programDisplay: programDisplay(p),
          programName: programName(p),
        };
      })
      .sort((a, b) => a.display.localeCompare(b.display, 'es'));
  }, [dispositivesArray, enumsEmployer?.programsIndex]);

  const ddResults = useMemo(() => {
    const q = norm(ddQuery);
    const searching = q.length > 0;

    // si NO buscas por texto y hay programa, filtra por programa;
    // si buscas por texto, ignora programa (búsqueda global)
    const base =
      !searching && filters.programId
        ? flatDevices.filter((d) => String(d.programId) === String(filters.programId))
        : flatDevices;

    if (!searching) return base.slice(0, 50);
    return base.filter((d) => norm(d.searchable).includes(q)).slice(0, 50);
  }, [ddQuery, flatDevices, filters.programId]);

  const selectDevice = (item) => {
    setDdQuery(item.display);
    setDdOpen(false);

    // Fijar dispositivo
    handleFilterChange({ target: { name: 'dispositive', value: item.id || '' } });

    // Si el programa no coincide, sincronizarlo
    if (String(filters.programId || '') !== String(item.programId || '')) {
      const p = enumsEmployer?.programsIndex?.[item.programId];
      handleFilterChange({ target: { name: 'programId', value: item.programId || '' } });
      setPdQuery(programDisplay(p));
    }
  };

  // ======================
  // Responsabilidades (dropdown tipo dispositivo)
  // ======================
  const responsibilityItems = useMemo(() => {
    const options = getResponsibilityOptions();
    return options
      .map((opt) => {
        try {
          const parsed = JSON.parse(opt.value);

          if (parsed.type === 'device') {
            const d = enumsEmployer?.dispositiveIndex?.[parsed.deviceId];
            const p = enumsEmployer?.programsIndex?.[parsed.programId];

            return {
              type: 'device',
              id: parsed.deviceId,
              programId: parsed.programId,
              display: d?.name || '(Dispositivo sin nombre)',
              programDisplay: programDisplay(p) || programName(p) || '',
              rawValue: opt.value,
            };
          }

          if (parsed.type === 'program') {
            const p = enumsEmployer?.programsIndex?.[parsed.programId];

            return {
              type: 'program',
              id: parsed.programId,
              programId: parsed.programId,
              display: programName(p) || '(Programa)',
              programDisplay: programDisplay(p) || '',
              rawValue: opt.value,
            };
          }

          return null;
        } catch {
          return null;
        }
      })
      .filter(Boolean);
  }, [listResponsability, enumsEmployer?.dispositiveIndex, enumsEmployer?.programsIndex]);

    // Sincronizar inputs de Programa / Dispositivo / Responsabilidades
  // a partir de los filtros actuales
  useEffect(() => {
    // --- Programa ---
    if (filters.programId) {
      const p = enumsEmployer?.programsIndex?.[filters.programId];
      setPdQuery(programDisplay(p) || '');
    } else {
      setPdQuery('');
    }

    // --- Dispositivo ---
    if (filters.dispositive) {
      const d = enumsEmployer?.dispositiveIndex?.[filters.dispositive];
      setDdQuery(d?.name || '');
    } else {
      setDdQuery('');
    }

    // --- Responsabilidades (texto del input) ---
    let match = null;

    // 1) Si hay dispositivo seleccionado, buscamos ese dispositivo
    if (filters.dispositive) {
      match = responsibilityItems.find(
        (item) =>
          item.type === 'device' &&
          String(item.id) === String(filters.dispositive)
      );
    }

    // 2) Si no hay match por dispositivo, probamos por programa
    if (!match && filters.programId) {
      match = responsibilityItems.find(
        (item) =>
          item.type === 'program' &&
          String(item.programId) === String(filters.programId)
      );
    }

    setRespQuery(match ? match.display : '');
  }, [
    filters.programId,
    filters.dispositive,
    enumsEmployer?.programsIndex,
    enumsEmployer?.dispositiveIndex,
    responsibilityItems,
  ]);

  const selectResponsibility = (item) => {
    setRespQuery(item.display);
    setRespOpen(false);

    // guarda el value “crudo” en filtros
    handleFilterChange({
      target: { name: 'responsibility', value: item.rawValue },
    });

    if (item.type === 'program') {
      const p = enumsEmployer?.programsIndex?.[item.programId];
      handleFilterChange({ target: { name: 'programId', value: item.programId || '' } });
      handleFilterChange({ target: { name: 'dispositive', value: '' } });

      setPdQuery(programDisplay(p));
      setDdQuery('');
    }

    if (item.type === 'device') {
      const p = enumsEmployer?.programsIndex?.[item.programId];

      handleFilterChange({ target: { name: 'programId', value: item.programId || '' } });
      handleFilterChange({ target: { name: 'dispositive', value: item.id || '' } });

      setPdQuery(programDisplay(p));
      setDdQuery(item.display);
    }
  };



  // ======================
  // Render options con categorías (jobs / provinces)
  // ======================
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
  // RENDER
  // ======================
  return (
    <div className={styles.contenedorfiltro}>
      {/* Texto libre */}
      <div>
        <label htmlFor="firstName">Nombre:</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={filters.firstName}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="lastName">Apellidos:</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={filters.lastName}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="text"
          id="email"
          name="email"
          value={filters.email}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="dni">DNI:</label>
        <input
          type="text"
          id="dni"
          name="dni"
          value={filters.dni}
          onChange={handleFilterChange}
        />
      </div>

      {/* Puesto de trabajo (jobsIndex) */}
      <div>
        <label htmlFor="position">Puesto de trabajo</label>
        <select id="position" name="position" onChange={handleFilterChange} value={filters.position}>
          <option value="">Selecciona una opción</option>
          {renderCategoryOptionsById(jobsGroups)}
        </select>
      </div>

      {/* Provincias (provincesIndex) */}
      <div>
        <label htmlFor="provinces">Provincias</label>
        <select id="provinces" name="provinces" onChange={handleFilterChange} value={filters.provinces}>
          <option value="">Selecciona una opción</option>
          {renderCategoryOptionsById(provincesGroups)}
        </select>
      </div>

      {/* Status */}
      <div>
        <label htmlFor="status">Status</label>
        <select id="status" name="status" onChange={handleFilterChange} value={filters.status}>
          <option value="total" key="total">
            Activos y En periodo de contratación
          </option>
          {statusList.map((x) => (
            <option value={x} key={x}>
              {x}
            </option>
          ))}
        </select>
      </div>

      {/* Horario de trabajo (work_schedule) */}
      <div>
        <label htmlFor="workSchedule">Horario</label>
        <select
          id="workSchedule"
          name="workSchedule"
          onChange={handleFilterChange}
          value={filters.workSchedule || ''}
        >
          <option value="">Cualquiera</option>
          {schedulesList.map((s) => (
            <option value={s._id} key={s._id}>
              {s.name}
            </option>
          ))}
        </select>
      </div>

      {/* Responsabilidades (dropdown tipo dispositivo) */}
      <div>
        <label htmlFor="respSearch">Responsabilidades:</label>
        <div className={styles.pdSearchWrap} ref={respSearchWrapRef}>
          <input
            id="respSearch"
            type="text"
            className={styles.pdSearchInput}
            placeholder={
              responsibilityItems.length
                ? 'Selecciona programa o dispositivo…'
                : 'No tienes responsabilidades asignadas'
            }
            value={respQuery}
            readOnly
            onFocus={() => responsibilityItems.length && setRespOpen(true)}
            onClick={() => {
              if (responsibilityItems.length) {
                setRespOpen(true);   // siempre abre, nunca hace toggle
              }
            }}
            role="combobox"
            aria-expanded={respOpen}
            aria-controls="respSearchList"
            aria-autocomplete="list"
          />

          {!!respQuery && responsibilityItems.length > 0 && (
            <p
              className={styles.pdClearBtn}
              onClick={() => {
                setRespQuery('');
                setRespOpen(false);
                handleFilterChange({ target: { name: 'responsibility', value: '' } });
                handleFilterChange({ target: { name: 'programId', value: '' } });
                handleFilterChange({ target: { name: 'dispositive', value: '' } });
              }}
              aria-label="Limpiar selección de responsabilidad"
            >
              ×
            </p>
          )}

          {respOpen && responsibilityItems.length > 0 && (
            <ul id="respSearchList" className={styles.pdSearchList} role="listbox">
              {responsibilityItems.map((item) => (
                <li key={`${item.type}-${item.id}`} role="option" aria-selected={false}>
                  <p
                    className={styles.pdSearchItem}
                    onClick={() => selectResponsibility(item)}
                  >
                    <span className={styles.pdLabel}>{item.display}</span>
                    <span className={styles.pdLabelName}>{item.programDisplay}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Programa (typeahead) */}
      <div>
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
                handleFilterChange({ target: { name: 'programId', value: '' } });
                handleFilterChange({ target: { name: 'dispositive', value: '' } });
                setDdQuery('');
              }}
              aria-label="Limpiar búsqueda de programa"
            >
              ×
            </p>
          )}

          {pdOpen && pdResults.length > 0 && (
            <ul id="pdSearchList" className={styles.pdSearchList} role="listbox">
              {pdResults.map((item, i) => (
                <li key={`${item.type}-${item.id}`} role="option" aria-selected={i === 0}>
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

      {/* Dispositivo (typeahead) */}
      <div>
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
              const val = e.target.value;
              setDdQuery(val);
              setDdOpen(true);
              // si hay programa seleccionado, quítalo al empezar a escribir
              if (filters.programId) {
                handleFilterChange({ target: { name: 'programId', value: '' } });
                setPdQuery('');
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
                handleFilterChange({ target: { name: 'programId', value: '' } });
                setPdQuery('');
              }}
              aria-label="Limpiar búsqueda de dispositivo"
            >
              ×
            </p>
          )}

          {ddOpen && ddResults.length > 0 && (
            <ul id="ddSearchList" className={styles.pdSearchList} role="listbox">
              {ddResults.map((item, i) => (
                <li key={`${item.type}-${item.id}`} role="option" aria-selected={i === 0}>
                  <p className={styles.pdSearchItem} onClick={() => selectDevice(item)}>
                    <span className={styles.pdLabel}>{item.display}</span>
                    <span className={styles.pdLabelName}>{item.programDisplay}</span>
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Otros filtros */}
      <div>
        <label htmlFor="apafa">APAFA:</label>
        <div>
          <select id="apafa" name="apafa" onChange={handleFilterChange} value={filters.apafa}>
            <option value="no">No</option>
            <option value="si">Si</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="gender">Género:</label>
        <div>
          <select id="gender" name="gender" onChange={handleFilterChange} value={filters.gender}>
            <option value="">Selecciona una opción</option>
            <option value="female">Mujer</option>
            <option value="male">Hombre</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="fostered">Extutelado:</label>
        <div>
          <select id="fostered" name="fostered" onChange={handleFilterChange} value={filters.fostered}>
            <option value="">Selecciona una opción</option>
            <option value="si">Si</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="disability">Discapacidad:</label>
        <div>
          <select id="disability" name="disability" onChange={handleFilterChange} value={filters.disability}>
            <option value="">Selecciona una opción</option>
            <option value="si">Si</option>
            <option value="no">No</option>
          </select>
        </div>
      </div>

      {/* Reset */}
      <div>
        <button
          onClick={() => {
            setPdQuery('');
            setDdQuery('');
            setRespQuery('');
            handleFilterChange({ target: { name: 'programId', value: '' } });
            handleFilterChange({ target: { name: 'dispositive', value: '' } });
            handleFilterChange({ target: { name: 'responsibility', value: '' } });
            resetFilters();
          }}
        >
          Reset Filtros
        </button>
      </div>
    </div>
  );
};

export default Filters;
