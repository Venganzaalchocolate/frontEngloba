// FiltersOffers.jsx
import React, { useMemo } from "react";

// Iconos (mismos que en tu ejemplo de Filters)
import { TbEyeDotted, TbEyeClosed, TbEyeFilled } from "react-icons/tb";
import {
  BsExclamationOctagonFill,
  BsExclamationLg,
  BsExclamationOctagon,
  BsStarHalf,
  BsStarFill,
  BsStar
} from "react-icons/bs";

// Estilos: reutilizamos el mismo .module.css (y tooltip si lo necesitas)
import styles from "../styles/managingResumenes.module.css";
import stylesTooltip from "../styles/tooltip.module.css";
import { useLogin } from "../../hooks/useLogin";

/**
 * Componente para filtrar ofertas.
 * @param {Object} props
 * @param {Object} props.filters - Estado de filtros (ej: { year, month, province, programId, deviceId, view, favorite, reject })
 * @param {function} props.setFilters - Función para actualizar el estado de filtros en el padre
 * @param {Array} props.offers - Listado de ofertas (para extraer años disponibles)
 * @param {Object} props.enumsData - Datos enumerados (programs, provinces, programsIndex, etc.)
 * @param {function} props.resetFilters - Función para reiniciar los filtros a valores vacíos
 */
const FiltersOffers = ({
  filters,
  setFilters,
  offers,
  enumsData,
  resetFilters
}) => {
  // Desestructuramos algo de enumsData para mayor legibilidad
  const { provinces = [], programs = [] } = enumsData || {};
  const { logged } = useLogin(); // por si necesitas el rol

  // 1. Obtener años disponibles de las ofertas:
  const uniqueYears = useMemo(() => {
    if (!offers || offers.length === 0) return [];
    const yearsSet = new Set();
    offers.forEach((offer) => {
      const year = new Date(offer.createdAt).getFullYear();
      yearsSet.add(year);
    });
    return [...yearsSet].sort((a, b) => a - b); // Orden de menor a mayor
  }, [offers]);

  // Manejador genérico para inputs/select
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  // Si quieres "limpiar" el dispositivo cuando cambias de programa,
  // puedes hacerlo con un useEffect o con un custom handler, ejemplo:
  //
  // const handleProgramChange = (e) => {
  //   setFilters((prev) => ({
  //     ...prev,
  //     programId: e.target.value,
  //     deviceId: "" // opcional: limpiar el dispositivo
  //   }));
  // };
  const meses=['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']

  return (logged.user.role=='root') && (
    <div className={styles.contenedorfiltro}>
      <h3>FILTROS DE OFERTAS</h3>

      {/* Año */}
      <div>
        <label htmlFor="year">Año:</label>
        <select
          id="year"
          name="year"
          value={filters.year || ""}
          onChange={handleFilterChange}
        >
          <option value="">Todos</option>
          {uniqueYears.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </div>

      {/* Mes */}
      <div>
        <label htmlFor="month">Mes:</label>
        <select
          id="month"
          name="month"
          value={filters.month || ""}
          onChange={handleFilterChange}
        >
          <option value="">Todos</option>
          {Array.from({ length: 12 }).map((_, i) => {
            const mes = i + 1;
            return (
              <option key={mes} value={mes}>
                {meses[i]}
              </option>
            );
          })}
        </select>
      </div>

      {/* Provincia */}
      <div>
        <label htmlFor="province">Provincia:</label>
        <select
          id="province"
          name="province"
          value={filters.province || ""}
          onChange={handleFilterChange}
        >
          <option value="">Todas</option>
          {provinces.map((p) => {
            if (p.subcategories && p.subcategories.length > 0) {
              return (
                <optgroup label={p.name} key={p._id}>
                  {p.subcategories.map((sub) => (
                    <option key={sub._id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </optgroup>
              );
            } else {
              return (
                <option key={p._id} value={p.name}>
                  {p.name}
                </option>
              );
            }
          })}
        </select>
      </div>

      {/* Programa */}
      <div>
        <label htmlFor="programId">Programa:</label>
        <select
          id="programId"
          name="programId"
          value={filters.programId || ""}
          onChange={handleFilterChange}
        >
          <option value="">Todos</option>
          {programs.map((prog) => (
            <option key={prog._id} value={prog._id}>
              {prog.name}
            </option>
          ))}
        </select>
      </div>

      {/* Dispositivo */}
      {/* Tomamos la lista de 'programsIndex' si quieres mostrar todos, o filtrar según 'programId' */}
      <div>
        <label htmlFor="deviceId">Dispositivo:</label>
        <select
          id="deviceId"
          name="deviceId"
          value={filters.deviceId || ""}
          onChange={handleFilterChange}
        >
          <option value="">Todos</option>
          {Object.values(enumsData?.programsIndex || {})
            .filter((x) => x.type === "device")
            .map((dev) => (
              <option key={dev._id} value={dev._id}>
                {dev.name}
              </option>
            ))}
        </select>
      </div>

      {/* Iconos para 'view', 'favorite' y 'reject', igual que en tu Filter original */}
      <div className={styles.cajaIconosFiltro}>
        {/* View */}
        <div>
          <span className={stylesTooltip.tooltip}>
            {filters.view === "" && (
              <TbEyeDotted
                onClick={() =>
                  setFilters((prev) => ({ ...prev, view: "1" }))
                }
              />
            )}
            {filters.view === "1" && (
              <TbEyeFilled
                onClick={() =>
                  setFilters((prev) => ({ ...prev, view: "0" }))
                }
              />
            )}
            {filters.view === "0" && (
              <TbEyeClosed
                onClick={() =>
                  setFilters((prev) => ({ ...prev, view: "" }))
                }
              />
            )}
            <span className={stylesTooltip.tooltiptext}>
              {filters.view === "1"
                ? "Vistos"
                : filters.view === "0"
                ? "No Vistos"
                : "Todos"}
            </span>
          </span>
        </div>

        {/* Favorite */}
        <div>
          <span className={stylesTooltip.tooltip}>
            {filters.favorite === "" && (
              <BsStarHalf
                onClick={() =>
                  setFilters((prev) => ({ ...prev, favorite: "1" }))
                }
              />
            )}
            {filters.favorite === "1" && (
              <BsStarFill
                onClick={() =>
                  setFilters((prev) => ({ ...prev, favorite: "0" }))
                }
              />
            )}
            {filters.favorite === "0" && (
              <BsStar
                onClick={() =>
                  setFilters((prev) => ({ ...prev, favorite: "" }))
                }
              />
            )}
            <span className={stylesTooltip.tooltiptext}>
              {filters.favorite === "1"
                ? "Favoritos"
                : filters.favorite === "0"
                ? "No Favoritos"
                : "Todos"}
            </span>
          </span>
        </div>

        {/* Reject */}
        <div>
          <span className={stylesTooltip.tooltip}>
            {filters.reject === "" && (
              <BsExclamationLg
                onClick={() =>
                  setFilters((prev) => ({ ...prev, reject: "0" }))
                }
              />
            )}
            {filters.reject === "0" && (
              <BsExclamationOctagon
                onClick={() =>
                  setFilters((prev) => ({ ...prev, reject: "1" }))
                }
              />
            )}
            {filters.reject === "1" && (
              <BsExclamationOctagonFill
                onClick={() =>
                  setFilters((prev) => ({ ...prev, reject: "" }))
                }
              />
            )}
            <span className={stylesTooltip.tooltiptext}>
              {filters.reject === "1"
                ? "Rechazados"
                : filters.reject === "0"
                ? "No Rechazados"
                : "Todos"}
            </span>
          </span>
        </div>
      </div>

      {/* Botón para resetear todos los filtros */}
      <div>
        <button onClick={resetFilters}>Reset Filtros</button>
      </div>
    </div>
  )
};

export default FiltersOffers;
