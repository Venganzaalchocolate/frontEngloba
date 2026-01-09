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
import getOptionsEnums from "../../lib/optionsEnums";

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


  // const { groups: jobGroups, singles: jobSingles } = buildGroupedOptionsFromIndex(jobsIndex, {onlyPublic:true});
  // const { groups: studyGroups, singles: studySingles } = buildGroupedOptionsFromIndex(studiesIndex);
  // const { groups: provGroups, singles: provSingles } = buildGroupedOptionsFromIndex(provincesIndex);



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
              {getOptionsEnums(jobsIndex, {onlyPublic:true})}
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
              {getOptionsEnums(studiesIndex)}
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
              {getOptionsEnums(provincesIndex)}
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
