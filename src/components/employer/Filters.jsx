import { useEffect, useMemo, useRef, useState } from 'react';
import { useLogin } from '../../hooks/useLogin';
import styles from '../styles/ManagingEmployer.module.css';

const Filters = ({
  filters,
  enums: enumsEmployer,
  handleFilterChange,
  resetFilters,
  isRootOrGlobal = false,
  userScope = {
    fullProgramIds: [],
    visibleProgramIds: [],
    allowedDeviceIds: [],
  },
}) => {
  const { logged } = useLogin();

  const [pdQuery, setPdQuery] = useState('');
  const [pdOpen, setPdOpen] = useState(false);

  const [ddQuery, setDdQuery] = useState('');
  const [ddOpen, setDdOpen] = useState(false);

  const programSearchWrapRef = useRef(null);
  const deviceSearchWrapRef = useRef(null);

  useEffect(() => {
    const onDocClick = (e) => {
      if (!programSearchWrapRef.current?.contains(e.target)) setPdOpen(false);
      if (!deviceSearchWrapRef.current?.contains(e.target)) setDdOpen(false);
    };

    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const norm = (s) =>
    (s || '')
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

  const refId = (value) => {
    if (!value) return '';
    if (typeof value === 'object') return String(value._id || value.id || '');
    return String(value);
  };

  const toArrayFromIndex = (idxObj) =>
    Object.entries(idxObj || {}).map(([id, val]) => ({ _id: id, ...val }));

  const programDisplay = (p) => p?.acronym || '';
  const programName = (p) => p?.name || '';

  const statusList = Array.isArray(enumsEmployer?.status) ? enumsEmployer.status : [];
  const schedulesList = Array.isArray(enumsEmployer?.work_schedule) ? enumsEmployer.work_schedule : [];

  const programsArray = useMemo(
    () => toArrayFromIndex(enumsEmployer?.programsIndex),
    [enumsEmployer?.programsIndex]
  );

  const dispositivesArray = useMemo(
    () => toArrayFromIndex(enumsEmployer?.dispositiveIndex),
    [enumsEmployer?.dispositiveIndex]
  );

  const provincesGroups = useMemo(() => {
    const idx = enumsEmployer?.provincesIndex || {};
    const entries = Object.entries(idx);
    const roots = entries.filter(([, v]) => v?.isRoot);

    return roots.map(([rootId, root]) => {
      const subs = entries
        .filter(([, v]) => v?.isSub && String(v?.parent) === String(rootId))
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
        .filter(([, v]) => v?.isSub && String(v?.parent) === String(rootId))
        .map(([id, v]) => ({ _id: id, name: v.name }));

      return { _id: rootId, name: root.name, subcategories: subs };
    });
  }, [enumsEmployer?.jobsIndex]);

  const flatDevices = useMemo(() => {
    return dispositivesArray
      .filter((d) => {
        if (isRootOrGlobal) return true;

        const deviceId = String(d?._id || '');
        const programId = refId(d?.program);

        if (userScope.fullProgramIds.includes(programId)) return true;

        return userScope.allowedDeviceIds.includes(deviceId);
      })
      .map((d) => {
        const programId = refId(d?.program);
        const provinceId = refId(d?.province);
        const p = enumsEmployer?.programsIndex?.[programId];

        return {
          type: 'device',
          id: String(d?._id || ''),
          programId,
          provinceId,
          display: d?.name || '',
          searchable: `${d?.name || ''} ${programDisplay(p)} ${programName(p)}`,
          programDisplay: programDisplay(p),
          programName: programName(p),
        };
      })
      .sort((a, b) => a.display.localeCompare(b.display, 'es'));
  }, [
    dispositivesArray,
    enumsEmployer?.programsIndex,
    isRootOrGlobal,
    userScope.fullProgramIds,
    userScope.allowedDeviceIds,
  ]);

  const availableProgramIdsByProvince = useMemo(() => {
    if (!filters.provinces) return null;

    return new Set(
      flatDevices
        .filter((d) => String(d.provinceId) === String(filters.provinces))
        .map((d) => String(d.programId))
    );
  }, [flatDevices, filters.provinces]);

  const flatPrograms = useMemo(() => {
    return programsArray
      .filter((p) => {
        const programId = String(p?._id || '');

        if (!isRootOrGlobal && !userScope.visibleProgramIds.includes(programId)) {
          return false;
        }

        if (availableProgramIdsByProvince && !availableProgramIdsByProvince.has(programId)) {
          return false;
        }

        return true;
      })
      .map((p) => ({
        type: 'program',
        id: String(p?._id || ''),
        programId: String(p?._id || ''),
        display: programDisplay(p),
        name: programName(p),
        searchable: `${p?.name || ''} ${p?.acronym || ''}`,
      }))
      .sort((a, b) => a.display.localeCompare(b.display, 'es'));
  }, [
    programsArray,
    isRootOrGlobal,
    userScope.visibleProgramIds,
    availableProgramIdsByProvince,
  ]);

  const pdResults = useMemo(() => {
    const q = norm(pdQuery);
    if (!q) return flatPrograms.slice(0, 50);

    return flatPrograms
      .filter((it) => norm(it.searchable).includes(q))
      .slice(0, 50);
  }, [pdQuery, flatPrograms]);

  const ddResults = useMemo(() => {
    const q = norm(ddQuery);

    let base = flatDevices;

    if (filters.programId) {
      base = base.filter((d) => String(d.programId) === String(filters.programId));
    }

    if (filters.provinces) {
      base = base.filter((d) => String(d.provinceId) === String(filters.provinces));
    }

    if (!q) return base.slice(0, 50);

    return base
      .filter((d) => norm(d.searchable).includes(q))
      .slice(0, 50);
  }, [ddQuery, flatDevices, filters.programId, filters.provinces]);

  useEffect(() => {
    if (filters.programId) {
      const p = enumsEmployer?.programsIndex?.[filters.programId];
      setPdQuery(programDisplay(p) || '');
    } else {
      setPdQuery('');
    }

    if (filters.dispositive) {
      const d = enumsEmployer?.dispositiveIndex?.[filters.dispositive];
      setDdQuery(d?.name || '');
    } else {
      setDdQuery('');
    }
  }, [
    filters.programId,
    filters.dispositive,
    enumsEmployer?.programsIndex,
    enumsEmployer?.dispositiveIndex,
  ]);

const selectPd = (item) => {
  setPdQuery(item.display);
  setPdOpen(false);
  setDdQuery('');

  handleFilterChange({
    patch: {
      programId: item.programId || '',
      dispositive: '',
    },
  });
};

const selectDevice = (item) => {
  setDdQuery(item.display);
  setDdOpen(false);

  const p = enumsEmployer?.programsIndex?.[item.programId];
  setPdQuery(programDisplay(p));

  handleFilterChange({
    patch: {
      programId: item.programId || '',
      dispositive: item.id || '',
    },
  });
};

const clearProgram = () => {
  setPdQuery('');
  setDdQuery('');
  setPdOpen(false);
  setDdOpen(false);

  handleFilterChange({
    patch: {
      programId: '',
      dispositive: '',
    },
  });
};

const clearDevice = () => {
  setDdQuery('');
  setDdOpen(false);

  handleFilterChange({
    name: 'dispositive',
    value: '',
  });
};

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

  const resetAll = () => {
    setPdQuery('');
    setDdQuery('');
    setPdOpen(false);
    setDdOpen(false);
    resetFilters();
  };

  return (
    <div className={styles.contenedorfiltro}>
      <div>
        <label htmlFor="firstName">Nombre:</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={filters.firstName || ''}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="lastName">Apellidos:</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={filters.lastName || ''}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="email">Email:</label>
        <input
          type="text"
          id="email"
          name="email"
          value={filters.email || ''}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="dni">DNI:</label>
        <input
          type="text"
          id="dni"
          name="dni"
          value={filters.dni || ''}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="position">Puesto de trabajo</label>
        <select
          id="position"
          name="position"
          onChange={handleFilterChange}
          value={filters.position || ''}
        >
          <option value="">Selecciona una opción</option>
          {renderCategoryOptionsById(jobsGroups)}
        </select>
      </div>
{
  isRootOrGlobal && <div>
        <label htmlFor="provinces">Provincias</label>
        <select
          id="provinces"
          name="provinces"
          onChange={handleFilterChange}
          value={filters.provinces || ''}
        >
          <option value="">Selecciona una opción</option>
          {renderCategoryOptionsById(provincesGroups)}
        </select>
      </div>
}
      

      <div>
        <label htmlFor="status">Status</label>
        <select
          id="status"
          name="status"
          onChange={handleFilterChange}
          value={filters.status || 'total'}
        >
          <option value="total">Activos y En periodo de contratación</option>
          {statusList.map((x) => (
            <option value={x} key={x}>
              {x}
            </option>
          ))}
        </select>
      </div>


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
              onClick={clearProgram}
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
                : filters.provinces
                  ? 'Busca dispositivo de la provincia…'
                  : 'Escribe para buscar dispositivos…'
            }
            value={ddQuery}
            onChange={(e) => {
              setDdQuery(e.target.value);
              setDdOpen(true);
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
              onClick={clearDevice}
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

      <div>
        <label htmlFor="apafa">APAFA:</label>
        <select
          id="apafa"
          name="apafa"
          onChange={handleFilterChange}
          value={filters.apafa || 'no'}
        >
          <option value="no">No</option>
          <option value="si">Si</option>
        </select>
      </div>

      <div>
        <label htmlFor="gender">Género:</label>
        <select
          id="gender"
          name="gender"
          onChange={handleFilterChange}
          value={filters.gender || ''}
        >
          <option value="">Seleccionar</option>
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
          <option value="others">Otros</option>
          <option value="nonBinary">No binario</option>
        </select>
      </div>

      <div>
        <label htmlFor="fostered">Extutelado:</label>
        <select
          id="fostered"
          name="fostered"
          onChange={handleFilterChange}
          value={filters.fostered || ''}
        >
          <option value="">Selecciona una opción</option>
          <option value="si">Si</option>
          <option value="no">No</option>
        </select>
      </div>

      <div>
        <label htmlFor="disability">Discapacidad:</label>
        <select
          id="disability"
          name="disability"
          onChange={handleFilterChange}
          value={filters.disability || ''}
        >
          <option value="">Selecciona una opción</option>
          <option value="si">Si</option>
          <option value="no">No</option>
        </select>
      </div>

      {logged?.user?.role === 'root' && (
        <div>
          <label htmlFor="role">Rol</label>
          <select
            id="role"
            name="role"
            onChange={handleFilterChange}
            value={filters.role || ''}
          >
            <option value="">Selecciona una opción</option>
            <option value="global">Global</option>
            <option value="root">Root</option>
            <option value="rrhh">RRHH</option>
            <option value="employee">Empleado</option>
            <option value="auditor">Auditor</option>
          </select>
        </div>
      )}

      <div>
        <button onClick={resetAll}>Reset Filtros</button>
      </div>
    </div>
  );
};

export default Filters;