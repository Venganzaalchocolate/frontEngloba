import styles from '../styles/ManagingEmployer.module.css';

const Filters = ({ filters, enums, handleFilterChange, resetFilters}) => {
    return (
        <div className={styles.contenedorfiltro}>
            <div>
                <label htmlFor="firstName">Nombre:</label>
                <input type="text" id="firstName" name="firstName" value={filters.firstName} onChange={handleFilterChange} />
            </div>
            <div>
                <label htmlFor="lastName">Apellidos:</label>
                <input type="text" id="lastName" name="lastName" value={filters.lastName} onChange={handleFilterChange} />
            </div>
            <div>
                <label htmlFor="email">Email:</label>
                <input type="text" id="email" name="email" value={filters.email} onChange={handleFilterChange} />
            </div>
            <div>
                <label htmlFor="dni">DNI:</label>
                <input type="text" id="dni" name="dni" value={filters.dni} onChange={handleFilterChange} />
            </div>

            {!!enums &&
                <>
                <div>
                        <label htmlFor="position">Puesto de trabajo</label>
                        <select id='position' name='position' onChange={handleFilterChange} value={filters.position}>
                            <option value={''}>Selecciona una opción</option>
                            {enums.jobs.map((x) => {
                                if (x.subcategories != undefined && x.subcategories.length > 0) {
                                    return <optgroup label={x.name} key={x.name}>
                                        {x.subcategories.map((y) => {
                                            return <option value={y._id} key={y.name}>{y.name}</option>
                                        })}
                                    </optgroup>
                                }
                                else {
                                    return <option value={x._id} key={x.name}>{x.name}</option>
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
                                            return <option value={y._id} key={y.name}>{y.name}</option>
                                        })}
                                    </optgroup>
                                }
                                else {
                                    return <option value={x._id} key={x.name}>{x.name}</option>
                                }
                            })}
                        </select>
                    </div>

                    

                    <div>
                        <label htmlFor="status">Status</label>
                        <select id='status' name='status' onChange={handleFilterChange} value={filters.status}>
                            <option value={'total'} key={'total'}>Activos y En periodo de contratación</option>
                            {enums.status.map((x) => {
                                return <option value={x} key={x}>{x}</option>
                            })}
                        </select>
                    </div>

                    <div>
                        <label htmlFor='programId'>Programa:</label>
                        <div>
                            <select id='programId' name='programId' onChange={handleFilterChange} value={filters.programId}>
                                <option>Selecciona una opción</option>
                                {enums.programs.map((x) => {
                                    return <option value={x._id} key={`SelectProgram${x._id}`}>{x.name}</option>
                                })}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor='dispositive'>Dispositivo:</label>
                        <div>
                            <select id='dispositive' name='dispositive' onChange={handleFilterChange} value={handleFilterChange.dispositive}>
                                <option >Selecciona una opción</option>
                                {enums.programs.filter((x) => x._id == filters.programId).map((x) => {
                                    return x.devices.map((y) => {
                                        return <option value={y._id} key={`SelectDispositive${y._id}`}>{y.name}</option>
                                    })

                                })}
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor='apafa'>APAFA:</label>
                        <div>
                            
                            <select id='apafa' name='apafa' onChange={handleFilterChange} value={filters.apafa} >
                                <option value='no'>No</option>
                                <option value='si'>Si</option>
                                
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor='gender'>Genero:</label>
                        <div>
                            <select id='gender' name='gender' onChange={handleFilterChange} value={handleFilterChange.gender}>
                                <option value={''}>Selecciona una opción</option>
                                <option value='female'>Mujer</option>
                                <option value='male'>Hombre</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor='fostered'>Extutelado:</label>
                        <div>
                            <select id='fostered' name='fostered' onChange={handleFilterChange} value={handleFilterChange.fostered}>
                                <option value={''}>Selecciona una opción</option>
                                <option value='si'>Si</option>
                                <option value='no'>No</option>
                            </select>
                        </div>
                    </div>
                    <div>
                        <label htmlFor='disability'>Discapacidad:</label>
                        <div>
                            <select id='disability' name='disability' onChange={handleFilterChange} value={handleFilterChange.disability}>
                                <option value={''}>Selecciona una opción</option>
                                <option value='si'>Si</option>
                                <option value='no'>No</option>
                            </select>
                        </div>
                    </div>


                </>
            }


            <div>
                <button onClick={resetFilters}>Reset Filtros</button>
            </div>
        </div>
    );
};

export default Filters;
