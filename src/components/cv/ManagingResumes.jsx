import React, { useEffect, useState, useMemo, useCallback } from "react";
import { deleteUserCv, getCVs, getData, getusercvs } from "../../lib/data";
import styles from '../styles/managingResumenes.module.css';
import stylesTooltip from '../styles/tooltip.module.css';
import { FaEye, FaCheckCircle, FaTimesCircle, FaRegEyeSlash } from "react-icons/fa";
import { GoStar, GoStarFill } from "react-icons/go";
import { BsExclamationOctagonFill, BsExclamationLg, BsExclamationOctagon, BsStarHalf, BsStarFill, BsStar } from "react-icons/bs";
import { TbEyeDotted, TbEyeClosed, TbEyeFilled } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from '../../hooks/useLogin.jsx';
import CvPanel from "./CvPanel";
import BagCreate from "./BagCreate.jsx";
import { useBag } from "../../hooks/useBag.jsx";
import { formatDatetime } from "../../lib/utils.js";
import { useDebounce } from "../globals/useDebounce.jsx";


const ManagingResumenes = ({ modal, charge }) => {
    const { logged, changeLogged, logout } = useLogin();
    const { Bag, schedule } = useBag();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50); // Tamaño de página por defecto
    const [users, setUsers] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [enums, setEnums] = useState(null);
    const [urlCv, setUrlCv] = useState(null);
    const [userSelected, setUserSelected] = useState(null);
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        phone: '',
        jobs: '',
        provinces: '',
        work_schedule: '',
        view: '',
        offer: '',
        studies: '',
        favorite: '',
        reject: '',
    });

    // Derivar una versión debounced de los filtros
    const debouncedFilters = useDebounce(filters, 300);

    // Cargar usuarios cuando cambie la página, el tamaño de página, los filtros debounced o el schedule
    useEffect(() => {
        if (logged.isLoggedIn) {
            loadUsers();
        } else {
            navigate('/login');
        }
    }, [debouncedFilters, page, limit, schedule]);

    // Función para cargar los filtros de la página actual
    const loadUsers = async () => {
        charge(true);

        try {
            let data = null;
            const token = getToken();

            if (Bag != null && !!schedule) {
                const ids = { users: Bag.userCv };
                data = await getusercvs(page, limit, ids, token);
            } else {
                let auxFilters = { ...debouncedFilters };
                for (let key in auxFilters) {
                    if (auxFilters[key] === "") {
                        delete auxFilters[key];
                    }
                }

                data = await getusercvs(page, limit, auxFilters, token);
            }

            const enumsData = await getData();
            if (!enumsData.error) {
                let auxEnums = {
                    jobs: enumsData.jobs,
                    provinces: enumsData.provinces,
                    work_schedule: enumsData.work_schedule,
                    studies: enumsData.studies,
                    offer: enumsData.offer,
                };
                setEnums(auxEnums);
            }

            if (data.error) {
                charge(false);
                modal('Error', data.message);
            } else {
                setUsers(data.users); // Establece los usuarios recuperados
                setTotalPages(data.totalPages); // Establece el número total de páginas
                charge(false);
            }
        } catch (error) {
            charge(false);
            modal('Error', error.message || 'Ocurrió un error inesperado.');
        }
    };

    // Resetear URL y usuario seleccionado cuando cambie el Bag
    useEffect(() => {
        setUrlCv(null);
        setUserSelected(null);
        setPage(1);
    }, [Bag]);

    const deleteUser=async ()=>{
        if(userSelected._id){
            const token=getToken()
            const responseDelete = await deleteUserCv(token,{_id:userSelected._id});
            if(!responseDelete.error){
              modal('Eliminado', 'Usuario eliminado con Éxito')  
              const userAux=users.filter((x)=>x._id!=userSelected._id)
              setUserSelected(null)
              setUsers(userAux)
            } 
            if(responseDelete.error) modal('Eliminado', 'Usuario no se ha podido eliminar')
            
        }
    }

    // Función para manejar el cambio de página
    const handlePageChange = useCallback((newPage) => {
        setPage(newPage);
    }, []);

    // Función para manejar el cambio de tamaño de página
    const handleLimitChange = useCallback((event) => {
        const newLimit = parseInt(event.target.value, 10);
        setLimit(newLimit);
        setPage(1); // Resetear a la primera página al cambiar el tamaño de página
    }, []);

    // Función para manejar el cambio en los filtros
    const handleFilterChange = useCallback((event) => {
        setPage(1);
        setUrlCv(null);
        setUserSelected(null)
        const { name, value } = event.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    }, []);

    // Función para aplicar los filtros
    const resetFilters = useCallback(() => {
        setUserSelected(null);
        setFilters({
            name: '',
            email: '',
            phone: '',
            jobs: '',
            provinces: '',
            work_schedule: '',
            view: '',
            offer: '',
            studies: '',
            favorite: '',
            reject: '',
        });
    }, []);

    const lookCV = useCallback(async (id, userData) => {
        charge(true);

        if (userSelected && userSelected._id === userData._id) {
            setUrlCv(null);
            setUserSelected(null);
            charge(false);
        } else {
            try {
                const token = getToken();
                const cvData = await getCVs(id, token);
                if (!cvData.error) {
                    setUrlCv(cvData);
                    setUserSelected(userData);
                } else {
                    modal('Error', cvData.message);
                }
            } catch (error) {
                modal('Error', error.message || 'Ocurrió un error inesperado.');
            } finally {
                charge(false);
            }
        }
    }, [userSelected]);

    const changeUser = useCallback((userModify) => {
        setUsers(prevUsers => prevUsers.map(user => user._id === userModify._id ? userModify : user));
        if (userSelected && userSelected._id === userModify._id) {
            setUserSelected(userModify);
        }
    }, [userSelected]);

    const checkUser = useCallback((userInfo) => {
        if (userInfo.reject != null) return styles.rejected; // Asegúrate de tener una clase CSS para esto
        if (Bag != null && !!Bag.userCv) {
            const user = Bag.userCv.find(x => x === userInfo._id);
            if (user !== undefined) {
                return styles.selected; // Asegúrate de tener una clase CSS para esto
            }
        }
        // if(logged.user.role=='root' && userInfo.favorite != null) return styles.favoriteRoot;
        if (userInfo.favorite != null) return styles.favorite;
        return styles.tableRow; // Clase por defecto
    }, [Bag]);

    const filteredUsers = useMemo(() => {
        return users.filter(user => {
            // Filtro por nombre
            if (debouncedFilters.name && !user.name.toLowerCase().includes(debouncedFilters.name.toLowerCase())) {
                return false;
            }
            // Filtro por email
            if (debouncedFilters.email && !user.email.toLowerCase().includes(debouncedFilters.email.toLowerCase())) {
                return false;
            }
            // Filtro por trabajos (jobs)
            if (debouncedFilters.jobs && !user.jobs.includes(debouncedFilters.jobs)) {
                return false;
            }
            // Filtro por provincias
            if (debouncedFilters.provinces && !user.provinces.includes(debouncedFilters.provinces)) {
                return false;
            }
            // Si pasa todos los filtros, devolver true
            return true;
        });
    }, [users, debouncedFilters]);
    

    return (
        <div className={styles.contenedor}>
            <div className={styles.paginacion}>
                <h2>Gestión de Curriculums</h2>
                <div>
                    <label htmlFor="limit">Usuarios por página:</label>
                    <select id="limit" value={limit} onChange={handleLimitChange}>
                        <option value={5}>5</option>
                        <option value={10}>10</option>
                        <option value={20}>20</option>
                        <option value={50}>50</option>
                    </select>
                    <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                        {'<'}
                    </button>
                    <span>Página {page}</span>
                    <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
                        {'>'}
                    </button>
                    <BagCreate />
                </div>
            </div>
            {Bag != null && !schedule && <h2 id={styles.tituloProcesoActivo}>Selección activa: {Bag.name}</h2>}
            {Bag != null && !!schedule && <h2 id={styles.tituloProcesoActivo}>Entrevistas: {Bag.name}</h2>}
            {!schedule &&
                <div className={styles.contenedorfiltro}>
                    <div>
                        <label htmlFor="name">Nombre:</label>
                        <input type="text" id="name" name="name" value={filters.name} onChange={handleFilterChange} />
                    </div>
                    <div>
                        <label htmlFor="email">Email:</label>
                        <input type="text" id="email" name="email" value={filters.email} onChange={handleFilterChange} />
                    </div>


                    {!!enums &&
                        <>
                            <div>
                                <label htmlFor="offer">Oferta:</label>
                                <select name="offer" id="offer" onChange={handleFilterChange} value={filters.offer}>
                                    <option value={''}>Selecciona una opción</option>
                                    {enums.offer.map((x) => {
                                        return <option value={x._id}>{x.job_title}</option>
                                    })}
                                </select>
                            </div>
                            <div>
                                <label htmlFor="work_schedule">Disponibilidad Horaria</label>
                                <select id='work_schedule' name='work_schedule' onChange={handleFilterChange} value={filters.work_schedule}>
                                    <option value={''}>Selecciona una opción</option>
                                    {enums.work_schedule.map((x) => {
                                        return <option value={x.name}>{x.name}</option>
                                    })}
                                </select>
                            </div>
                            <div className={styles.contenedorSelectionMultiple}>
                                <div>
                                    <label htmlFor="jobs">Puesto de interés</label>
                                    <select id='jobs' name='jobs' onChange={handleFilterChange} value={filters.jobs}>
                                        <option value={''}>Selecciona una opción</option>
                                        {enums.jobs.map((x) => {
                                            if (x.subcategories != undefined && x.subcategories.length > 0) {

                                                return <optgroup label={x.name}>
                                                    {x.subcategories != undefined && x.subcategories.map((y) => {
                                                        return <option value={y.name}>{y.name}</option>
                                                    })}
                                                </optgroup>
                                            }
                                            else {
                                                return <option value={x.name}>{x.name}</option>
                                            }


                                        })}
                                    </select>
                                    <div>

                                    </div>

                                </div>

                            </div>

                            <div className={styles.contenedorSelectionMultiple}>
                                <div>
                                    <label htmlFor="studies">Estudios realizados</label>
                                    <select id='studies' name='studies' onChange={handleFilterChange} value={filters.studies}>
                                        <option value={''}>Selecciona una opción</option>
                                        {enums.studies.map((x) => {
                                            if (x.subcategories != undefined && x.subcategories.length > 0) {

                                                return <optgroup label={x.name}>
                                                    {x.subcategories != undefined && x.subcategories.map((y) => {
                                                        return <option value={y.name}>{y.name}</option>
                                                    })}
                                                </optgroup>
                                            }
                                            else {
                                                return <option value={x.name}>{x.name}</option>
                                            }


                                        })}
                                    </select>
                                    <div>

                                    </div>

                                </div>

                            </div>

                            <div className={styles.contenedorSelectionMultiple}>
                                <div>
                                    <label htmlFor="provinces">Provincias</label>
                                    <select id='provinces' name='provinces' onChange={handleFilterChange} value={filters.provinces}>
                                        <option value={''}>Selecciona una opción</option>
                                        {enums.provinces.map((x) => {
                                            if (x.subcategories != undefined && x.subcategories.length > 0) {

                                                return <optgroup label={x.name}>
                                                    {x.subcategories != undefined && x.subcategories.map((y) => {
                                                        return <option value={y.name}>{y.name}</option>
                                                    })}
                                                </optgroup>
                                            }
                                            else {
                                                return <option value={x.name}>{x.name}</option>
                                            }

                                        })}

                                    </select>
                                    <div>

                                    </div>

                                </div>

                            </div>
                        </>
                    }


                    <div className={styles.cajaIconosFiltro}>
                        <div>
                            <span className={stylesTooltip.tooltip}>
                                {filters.view == '' && <TbEyeDotted onClick={() => setFilters(prevFilters => ({ ...prevFilters, view: '1' }))} />}
                                {filters.view == '1' && <TbEyeFilled onClick={() => setFilters(prevFilters => ({ ...prevFilters, view: '0' }))} />}
                                {filters.view == '0' && <TbEyeClosed onClick={() => setFilters(prevFilters => ({ ...prevFilters, view: '' }))} />}
                                <span className={stylesTooltip.tooltiptext}>{(filters.view == '1') ? 'Vistos' : (filters.view == '0') ? 'No Vistos' : 'todos'}</span></span>

                        </div>
                        <div>
                            <span className={stylesTooltip.tooltip}>
                                {filters.favorite == '' && <BsStarHalf onClick={() => setFilters(prevFilters => ({ ...prevFilters, favorite: '1' }))} />}
                                {filters.favorite == '1' && <BsStarFill onClick={() => setFilters(prevFilters => ({ ...prevFilters, favorite: '0' }))} />}
                                {filters.favorite == '0' && <BsStar onClick={() => setFilters(prevFilters => ({ ...prevFilters, favorite: '' }))} />}
                                <span className={stylesTooltip.tooltiptext}>{(filters.favorite == '1') ? 'Favoritos' : (filters.favorite == '0') ? 'No Favoritos' : 'todos'}</span></span>
                        </div>
                        <div>
                            <span className={stylesTooltip.tooltip}>
                                {filters.reject == '' && <BsExclamationLg onClick={() => setFilters(prevFilters => ({ ...prevFilters, reject: '0' }))} />}
                                {filters.reject == '0' && <BsExclamationOctagon onClick={() => setFilters(prevFilters => ({ ...prevFilters, reject: '1' }))} />}
                                {filters.reject == '1' && <BsExclamationOctagonFill onClick={() => setFilters(prevFilters => ({ ...prevFilters, reject: '' }))} />}
                                <span className={stylesTooltip.tooltiptext}>{(filters.reject == '1') ? 'Rechazados' : (filters.reject == '0') ? 'No Rechazados' : 'Todos'}</span></span>
                        </div>

                    </div>

                    <div>
                        <button onClick={resetFilters}>Reset Filtros</button>
                    </div>

                </div>
            }


            <div className={styles.tableContainer}>
                <div className={`${styles.tableRow} ${styles.header}`}>
                    <div className={styles.tableCell}>Nombre</div>
                    <div className={styles.tableCell}>Email</div>
                    <div className={styles.tableCell}>Teléfono</div>
                    <div className={styles.tableCell}>Puesto al que oferta</div>
                    <div className={styles.tableCell}>Estudios</div>
                    <div className={styles.tableCell}>Provincias</div>
                    <div className={styles.tableCell}></div>
                    <div className={styles.tableCell}>V</div>
                    <div className={styles.tableCell}></div>
                    <div className={styles.tableCell}>Fecha</div>
                </div>
                {filteredUsers.map(user => (
                    <div key={user._id} >
                        <div className={checkUser(user)} onClick={() => lookCV(user._id, user)}>
                            <div className={`${styles.tableCell} ${styles.capitalize}`}>{user.name}</div>
                            <div className={styles.tableCell}>{user.email}</div>
                            <div className={styles.tableCell}>{user.phone}</div>
                            <div className={styles.tableCell}>{user.jobs.join(', ')}</div>
                            <div className={styles.tableCell}>{user.studies.join(', ')}</div>
                            <div className={styles.tableCell}>{(user.provinces.length != 11) ? user.provinces.join(', ') : 'Todas'}</div>
                            <div className={styles.tableCell}>{(user.offer != null)
                                ? <span className={stylesTooltip.tooltip}><FaCheckCircle /><span className={stylesTooltip.tooltiptext}>{user.offer.job_title}</span></span>
                                : <span className={stylesTooltip.tooltip}><FaTimesCircle /><span className={stylesTooltip.tooltiptext}>No asociado a una oferta</span></span>}</div>
                            <div className={styles.tableCell}><span className={stylesTooltip.tooltip}>{user.numberCV}<span className={stylesTooltip.tooltiptext}>Versión</span></span></div>
                            <div className={styles.tableCell}>{
                                (user.view)
                                    ? <span className={stylesTooltip.tooltip}><FaEye /><span className={stylesTooltip.tooltiptext}>Visto</span></span>
                                    : <span className={stylesTooltip.tooltip}><FaRegEyeSlash /><span className={stylesTooltip.tooltiptext}>No Visto</span></span>}{
                                    (user.favorite)
                                        ? <span className={stylesTooltip.tooltip}><GoStarFill /><span className={stylesTooltip.tooltiptext}>Favorito</span></span>
                                        : <span className={stylesTooltip.tooltip}><GoStar /><span className={stylesTooltip.tooltiptext}>No Favorito</span></span>}{
                                    (user.reject)
                                        ? <span className={stylesTooltip.tooltip}><BsExclamationOctagonFill /><span className={stylesTooltip.tooltiptext}>Rechazado</span></span>
                                        : <span className={stylesTooltip.tooltip}><BsExclamationOctagon /><span className={stylesTooltip.tooltiptext}>No Rechazado</span></span>}
                            </div>
                            <div className={styles.tableCell}>{formatDatetime(user.date)}</div>
                        </div>
                        {userSelected != null && userSelected._id == user._id &&
                            <CvPanel
                                charge={() => charge()}
                                urlpdf={urlCv}
                                user={userSelected}
                                changeUser={(x) => changeUser(x)}
                                modal={(title, message) => modal(title, message)}
                                deleteUser={()=>deleteUser()}
                                >
                            </CvPanel>
                        }
                    </div>
                ))}


            </div>
        </div>

    );
};


export default ManagingResumenes