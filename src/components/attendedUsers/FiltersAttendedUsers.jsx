import styles from "../styles/ManagingEmployer.module.css";
import { NATIONALITIES } from "../../lib/nationalities.js";

const FiltersAttendedUsers = ({
  filters,
  handleFilterChange,
  resetFilters,
}) => {
  return (
    <div className={styles.contenedorfiltro}>
      <div className={styles.filtroBuscar}>
        <label htmlFor="q">Buscar:</label>
        <input
          type="text"
          id="q"
          name="q"
          value={filters.q || ""}
          onChange={handleFilterChange}
          placeholder="Documento, nombre, apellidos o alias..."
        />
      </div>

      <div>
        <label htmlFor="documentId">Documento:</label>
        <input
          type="text"
          id="documentId"
          name="documentId"
          value={filters.documentId || ""}
          onChange={handleFilterChange}
          placeholder="DNI, NIE, pasaporte..."
        />
      </div>

      <div>
        <label htmlFor="firstName">Nombre:</label>
        <input
          type="text"
          id="firstName"
          name="firstName"
          value={filters.firstName || ""}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="lastName">Apellidos:</label>
        <input
          type="text"
          id="lastName"
          name="lastName"
          value={filters.lastName || ""}
          onChange={handleFilterChange}
        />
      </div>

      <div>
        <label htmlFor="nationality">Nacionalidad:</label>
        <select
          id="nationality"
          name="nationality"
          value={filters.nationality || ""}
          onChange={handleFilterChange}
        >
          <option value="">Todas</option>
          {NATIONALITIES.map((item) => (
            <option key={item.value} value={item.value}>
              {item.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label htmlFor="gender">Género:</label>
        <select
          id="gender"
          name="gender"
          value={filters.gender || ""}
          onChange={handleFilterChange}
        >
          <option value="">Todos</option>
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
          <option value="others">Otros</option>
          <option value="nonBinary">No binario</option>
        </select>
      </div>

      <div>
        <label htmlFor="active">Estado:</label>
        <select
          id="active"
          name="active"
          value={filters.active || "total"}
          onChange={handleFilterChange}
        >
          <option value="total">Todos</option>
          <option value="active">Activos</option>
          <option value="inactive">Inactivos</option>
        </select>
      </div>

      <div>
        <label htmlFor="onlyActiveStays">Estancia:</label>
        <select
          id="onlyActiveStays"
          name="onlyActiveStays"
          value={filters.onlyActiveStays || "true"}
          onChange={handleFilterChange}
        >
          <option value="true">Solo estancia activa</option>
          <option value="false">Histórico completo</option>
        </select>
      </div>

      <div>
        <button onClick={resetFilters}>Reset Filtros</button>
      </div>
    </div>
  );
};

export default FiltersAttendedUsers;