import React from "react";
import styles from '../styles/ManagingEmployer.module.css';

const FilterStatus = ({ filters, enums, handleFilterChange, resetFilters}) => {
    return (
        <div className={styles.contenedorfiltro}>
            {!!enums &&              
                    <div>
                        <label htmlFor="status">Status</label>
                        <select id='status' name='status' onChange={handleFilterChange} value={filters.status}>
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
