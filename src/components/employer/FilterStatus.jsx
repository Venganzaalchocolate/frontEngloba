import React from "react";
import styles from '../styles/ManagingEmployer.module.css';

const FilterStatus = ({ filters, enums, handleFilterChange, resetFilters }) => {
    return (
        <div className={styles.contenedorfiltro}>
            {!!enums &&

                
                    <div className={styles.contenedorfiltroOpciones}>

                        <label htmlFor="firstName">Nombre:</label>
                        <input type="text" id="firstName" name="firstName" value={filters.firstName} onChange={handleFilterChange} />
                        <label htmlFor="lastName">Apellidos:</label>
                        <input type="text" id="lastName" name="lastName" value={filters.lastName} onChange={handleFilterChange} />
                        <label htmlFor="status">Status</label>
                        <select id='status' name='status' onChange={handleFilterChange} value={filters.status}>
                            <option value={'total'} key={'total'}>Activos y En periodo de contratación</option>
                            {enums.status.map((x) => {
                                return <option value={x} key={x}>{x}</option>
                            })}
                        </select>
                    </div>

                
            }


            <div>
                <button onClick={resetFilters}>Reset Filtros</button>
            </div>
        </div>
    );
};

export default FilterStatus;
