import React from "react";
import {
  BsExclamationOctagonFill,
  BsExclamationLg,
  BsExclamationOctagon,
  BsStarHalf,
  BsStarFill,
  BsStar
} from "react-icons/bs";
import styles from '../styles/managingResumenes.module.css';
import stylesTooltip from '../styles/tooltip.module.css';
import { FaWheelchair } from "react-icons/fa6";

const Filters = ({
  filters,
  enums: enumsEmployer,
  handleFilterChange,
  resetFilters,
  setFilters,
  listOffers
}) => {
  // work_schedule puede venir como array de strings u objetos {name}
  const workSchedule = Array.isArray(enumsEmployer?.work_schedule)
    ? enumsEmployer.work_schedule.map((w) =>
        typeof w === "string" ? { value: w, label: w } : { value: w.name, label: w.name }
      )
    : [];

  // Índices id -> nodo
  const jobsIndex       = enumsEmployer?.jobsIndex || {};
  const studiesIndex    = enumsEmployer?.studiesIndex || {};
  const provincesIndex  = enumsEmployer?.provincesIndex || {};

  // Construye grupos (optgroup) a partir de un índice con raíz/subcategorías.
  // - Si una raíz tiene hijos -> optgroup con sus hojas.
  // - Si una raíz no tiene hijos -> opción simple de la raíz.
  // - Si aparece un nodo que no es root ni sub -> opción simple.
  const buildGroupedOptionsFromIndex = (idx) => {
    const entries = Object.entries(idx); // [id, meta]
    if (!entries.length) return { groups: [], singles: [] };

    // hijos por parent
    const byParent = new Map();
    // raíces detectadas
    const roots = [];

    for (const [id, meta] of entries) {
      const parent = meta?.parent;
      if (meta?.isSub && parent) {
        if (!byParent.has(parent)) byParent.set(parent, []);
        byParent.get(parent).push({ id, name: meta.name });
      }
    }

    for (const [id, meta] of entries) {
      if (meta?.isRoot) roots.push({ id, name: meta.name });
    }

    const groups = [];
    const singles = [];

    // Raíces: si tienen hijos → grupo; si no, single
    for (const r of roots) {
      const children = byParent.get(r.id) || [];
      if (children.length > 0) {
        groups.push({
          label: r.name,
          options: children
            .sort((a, b) => a.name.localeCompare(b.name))
            .map((c) => ({ value: c.id, label: c.name }))
        });
      } else {
        singles.push({ value: r.id, label: r.name });
      }
    }

    // Nodos “huérfanos” (ni root ni sub): también como single
    for (const [id, meta] of entries) {
      const isRoot = !!meta?.isRoot;
      const isSub = !!meta?.isSub;
      if (!isRoot && !isSub) {
        singles.push({ value: id, label: meta.name });
      }
    }

    // Dedupe de singles (por si root sin hijos coincide con un huérfano)
    const seen = new Set();
    const singlesDedup = singles.filter(({ value }) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    }).sort((a, b) => a.label.localeCompare(b.label));

    return { groups, singles: singlesDedup };
  };

  const { groups: jobGroups, singles: jobSingles } = buildGroupedOptionsFromIndex(jobsIndex);
  const { groups: studyGroups, singles: studySingles } = buildGroupedOptionsFromIndex(studiesIndex);
  const { groups: provGroups, singles: provSingles } = buildGroupedOptionsFromIndex(provincesIndex);

  const renderGrouped = (groups, singles) => (
    <>
      {groups.map((g) => (
        <optgroup label={g.label} key={`grp-${g.label}`}>
          {g.options.map((opt) => (
            <option value={opt.value} key={opt.value}>{opt.label}</option>
          ))}
        </optgroup>
      ))}
      {singles.map((opt) => (
        <option value={opt.value} key={opt.value}>{opt.label}</option>
      ))}
    </>
  );

  return (
    <div className={styles.contenedorfiltro}>
      <h3>FILTROS</h3>

      <div>
        <label htmlFor="name">Nombre:</label>
        <input type="text" id="name" name="name" value={filters.name || ''} onChange={handleFilterChange} />
      </div>

      <div>
        <label htmlFor="email">Email:</label>
        <input type="text" id="email" name="email" value={filters.email || ''} onChange={handleFilterChange} />
      </div>

      {!!listOffers && (
        <>
          <div>
            <label htmlFor="work_schedule">Disponibilidad Horaria</label>
            <select
              id="work_schedule"
              name="work_schedule"
              onChange={handleFilterChange}
              value={filters.work_schedule || ''}
            >
              <option value="">Selecciona una opción</option>
              {workSchedule.map((x) => (
                <option value={x.value} key={x.value}>{x.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="jobsId">Puesto de interés</label>
            <select
              id="jobsId"
              name="jobsId"            // ← NUEVO: filtramos por ID
              onChange={handleFilterChange}
              value={filters.jobsId || ''}   // ← NUEVO: valor es ID
            >
              <option value="">Selecciona una opción</option>
              {renderGrouped(jobGroups, jobSingles)}
            </select>
          </div>

          <div>
            <label htmlFor="studiesId">Estudios realizados</label>
            <select
              id="studiesId"
              name="studiesId"         // ← NUEVO
              onChange={handleFilterChange}
              value={filters.studiesId || ''} // ← NUEVO
            >
              <option value="">Selecciona una opción</option>
              {renderGrouped(studyGroups, studySingles)}
            </select>
          </div>

          <div>
            <label htmlFor="provincesId">Provincias</label>
            <select
              id="provincesId"
              name="provincesId"        // ← NUEVO
              onChange={handleFilterChange}
              value={filters.provincesId || ''} // ← NUEVO
            >
              <option value="">Selecciona una opción</option>
              {renderGrouped(provGroups, provSingles)}
            </select>
          </div>

          <div>
            <label htmlFor="fostered">¿Extutelado?</label>
            <select id="fostered" name="fostered" value={filters.fostered || ''} onChange={handleFilterChange}>
              <option value="">Selecciona una opción</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </select>
          </div>
        </>
      )}

      <div className={styles.cajaIconosFiltro}>
        <div>
          <span className={stylesTooltip.tooltip}>
            {filters.favorite === '' && <BsStarHalf onClick={() => setFilters(prev => ({ ...prev, favorite: '1' }))} />}
            {filters.favorite === '1' && <BsStarFill onClick={() => setFilters(prev => ({ ...prev, favorite: '0' }))} />}
            {filters.favorite === '0' && <BsStar onClick={() => setFilters(prev => ({ ...prev, favorite: '' }))} />}
            <span className={stylesTooltip.tooltiptext}>
              {filters.favorite === '1' ? 'Favoritos' : filters.favorite === '0' ? 'No Favoritos' : 'Todos'}
            </span>
          </span>
        </div>

        <div>
          <span className={stylesTooltip.tooltip}>
            {filters.reject === '' && <BsExclamationLg onClick={() => setFilters(prev => ({ ...prev, reject: '0' }))} />}
            {filters.reject === '0' && <BsExclamationOctagon onClick={() => setFilters(prev => ({ ...prev, reject: '1' }))} />}
            {filters.reject === '1' && <BsExclamationOctagonFill onClick={() => setFilters(prev => ({ ...prev, reject: '' }))} />}
            <span className={stylesTooltip.tooltiptext}>
              {filters.reject === '1' ? 'Rechazados' : filters.reject === '0' ? 'No Rechazados' : 'Todos'}
            </span>
          </span>
        </div>

        <div>
          <span className={stylesTooltip.tooltip}>
            {(+filters.disability || 0) === 0
              ? <FaWheelchair onClick={() => setFilters(prev => ({ ...prev, disability: 1 }))} />
              : <FaWheelchair onClick={() => setFilters(prev => ({ ...prev, disability: 0 }))} />
            }
            <span className={stylesTooltip.tooltiptext}>
              {(+filters.disability || 0) > 0 ? 'Con discapacidad' : 'Sin Discapacidad'}
            </span>
          </span>
        </div>
      </div>

      <div>
        <button className={styles.resetFiltrosBtn} onClick={resetFilters}>Reset Filtros</button>
      </div>
    </div>
  );
};

export default Filters;
