import React, { useMemo, useCallback } from "react";
import { TbEyeDotted, TbEyeClosed, TbEyeFilled } from "react-icons/tb";
import { BsExclamationOctagonFill, BsExclamationLg, BsExclamationOctagon, BsStarHalf, BsStarFill, BsStar } from "react-icons/bs";
import styles from '../styles/managingResumenes.module.css';
import stylesTooltip from '../styles/tooltip.module.css';
import { FaWheelchair } from "react-icons/fa6";

const Filters = ({ filters, enums, handleFilterChange, resetFilters, setFilters, listOffers }) => {

    return (
        <div className={styles.contenedorfiltro}>
        <h3>FILTROS</h3>
            <div>
                <label htmlFor="name">Nombre:</label>
                <input type="text" id="name" name="name" value={filters.name} onChange={handleFilterChange} />
            </div>
            <div>
                <label htmlFor="email">Email:</label>
                <input type="text" id="email" name="email" value={filters.email} onChange={handleFilterChange} />
            </div>

            {!!listOffers && !!enums &&
                <>
                    <div>
                        <label htmlFor="offer">Oferta:</label>
                        <select name="offer" id="offer" onChange={handleFilterChange} value={filters.offer}>
                            <option value={''}>Selecciona una opción</option>
                            {listOffers.map((x) => {
                                return <option value={x._id} key={x._id}>{x.job_title}</option>
                            })}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="work_schedule">Disponibilidad Horaria</label>
                        <select id='work_schedule' name='work_schedule' onChange={handleFilterChange} value={filters.work_schedule}>
                            <option value={''}>Selecciona una opción</option>
                            {enums.work_schedule.map((x) => {
                                return <option value={x.name} key={x.name}>{x.name}</option>
                            })}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="jobs">Puesto de interés</label>
                        <select id='jobs' name='jobs' onChange={handleFilterChange} value={filters.jobs}>
                            <option value={''}>Selecciona una opción</option>
                            {enums.jobs.map((x) => {
                                if (x.subcategories != undefined && x.subcategories.length > 0) {
                                    return <optgroup label={x.name} key={x.name}>
                                        {x.subcategories.map((y) => {
                                            return <option value={y.name} key={y.name}>{y.name}</option>
                                        })}
                                    </optgroup>
                                }
                                else {
                                    return <option value={x.name} key={x.name}>{x.name}</option>
                                }
                            })}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="studies">Estudios realizados</label>
                        <select id='studies' name='studies' onChange={handleFilterChange} value={filters.studies}>
                            <option value={''}>Selecciona una opción</option>
                            {enums.studies.map((x) => {
                                if (x.subcategories != undefined && x.subcategories.length > 0) {
                                    return <optgroup label={x.name} key={x.name}>
                                        {x.subcategories.map((y) => {
                                            return <option value={y.name} key={y.name}>{y.name}</option>
                                        })}
                                    </optgroup>
                                }
                                else {
                                    return <option value={x.name} key={x.name}>{x.name}</option>
                                }
                            })}
                        </select>
                    </div>

                    <div>
                        <label htmlFor="provinces">Provincias</label>
                        <select id='provinces' name='provinces' onChange={handleFilterChange} value={filters.provinces}>
                            <option value={''}>Selecciona una opción</option>
                            {enums.provinces.map((x) => {
                                if (x.subcategories != undefined && x.subcategories.length > 0) {
                                    return <optgroup label={x.name} key={x.name}>
                                        {x.subcategories.map((y) => {
                                            return <option value={y.name} key={y.name}>{y.name}</option>
                                        })}
                                    </optgroup>
                                }
                                else {
                                    return <option value={x.name} key={x.name}>{x.name}</option>
                                }
                            })}
                        </select>
                    </div>
                </>
            }

            <div className={styles.cajaIconosFiltro}>
                <div>
                    <span className={stylesTooltip.tooltip}>
                        {filters.view === '' && <TbEyeDotted onClick={() => setFilters(prevFilters => ({ ...prevFilters, view: '1' }))} />}
                        {filters.view === '1' && <TbEyeFilled onClick={() => setFilters(prevFilters => ({ ...prevFilters, view: '0' }))} />}
                        {filters.view === '0' && <TbEyeClosed onClick={() => setFilters(prevFilters => ({ ...prevFilters, view: '' }))} />}
                        <span className={stylesTooltip.tooltiptext}>{(filters.view === '1') ? 'Vistos' : (filters.view === '0') ? 'No Vistos' : 'todos'}</span>
                    </span>
                </div>
                <div>
                    <span className={stylesTooltip.tooltip}>
                        {filters.favorite === '' && <BsStarHalf onClick={() => setFilters(prevFilters => ({ ...prevFilters, favorite: '1' }))} />}
                        {filters.favorite === '1' && <BsStarFill onClick={() => setFilters(prevFilters => ({ ...prevFilters, favorite: '0' }))} />}
                        {filters.favorite === '0' && <BsStar onClick={() => setFilters(prevFilters => ({ ...prevFilters, favorite: '' }))} />}
                        <span className={stylesTooltip.tooltiptext}>{(filters.favorite === '1') ? 'Favoritos' : (filters.favorite === '0') ? 'No Favoritos' : 'todos'}</span>
                    </span>
                </div>
                <div>
                    <span className={stylesTooltip.tooltip}>
                        {filters.reject === '' && <BsExclamationLg onClick={() => setFilters(prevFilters => ({ ...prevFilters, reject: '0' }))} />}
                        {filters.reject === '0' && <BsExclamationOctagon onClick={() => setFilters(prevFilters => ({ ...prevFilters, reject: '1' }))} />}
                        {filters.reject === '1' && <BsExclamationOctagonFill onClick={() => setFilters(prevFilters => ({ ...prevFilters, reject: '' }))} />}
                        <span className={stylesTooltip.tooltiptext}>{(filters.reject === '1') ? 'Rechazados' : (filters.reject === '0') ? 'No Rechazados' : 'Todos'}</span>
                    </span>
                </div>
                <div>
                
                    <span className={stylesTooltip.tooltip}>
                        {filters.disability === 0 && <FaWheelchair   onClick={() => setFilters(prevFilters => ({ ...prevFilters, disability: 1 }))} />}
                        {filters.disability >0  && <FaWheelchair color='forestgreen' onClick={() => setFilters(prevFilters => ({ ...prevFilters, disability: 0 }))} />}
                        <span className={stylesTooltip.tooltiptext}>{(filters.disability >0) ? 'Con discapacidad' :  'Sin Discapacidad'}</span>
                    </span>
                </div>
            </div>

            <div>
                <button onClick={resetFilters}>Reset Filtros</button>
            </div>
        </div>
        
    );
};

export default Filters;
