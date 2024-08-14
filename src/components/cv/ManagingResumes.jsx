import { useEffect, useState } from "react"
import { getCVs, getData, getusercvs } from "../../lib/data";
import styles from '../styles/managingResumenes.module.css';
import stylesTooltip from '../styles/tooltip.module.css';
import { FaEye } from "react-icons/fa";
import PdfV from "./PdfV";
import { FaCheck } from "react-icons/fa";
import { FaRegEyeSlash } from "react-icons/fa6";
import { IoNewspaperSharp } from "react-icons/io5";
import { useNavigate } from "react-router-dom";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from '../../hooks/useLogin.jsx';
import CvPanel from "./CvPanel.jsx";
import Modal from "../globals/Modal.jsx";
import BagCreate from "./BagCreate.jsx";
import { useBag } from "../../hooks/useBag.jsx";
import { GoStar } from "react-icons/go";
import { GoStarFill } from "react-icons/go";
import { BsExclamationOctagonFill } from "react-icons/bs";
import { BsExclamationOctagon } from "react-icons/bs";

import { formatDatetime } from "../../lib/utils.js";


// 
const ManagingResumenes = ({ modal, charge }) => {
    const { logged, changeLogged, logout } = useLogin()
    const { Bag, schedule } = useBag()
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10); // Tamaño de página por defecto
    const [users, setUsers] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [enums, setEnums] = useState(null)
    const [urlCv, setUrlCv] = useState(null)
    const [userSelected, setUserSelected] = useState(null)
    const [filters, setFilters] = useState({
        name: '',
        email: '',
        phone: '',
        jobs: '',
        provinces: '',
        work_schedule: '',
        view: '',
        offer: '',
        studies: ''
    });

    useEffect(() => {
        (users != 0) ? charge(true) : charge(false)
    }, [])

    // Función para cargar los filters de la página actual
    const loadUsers = async () => {
        charge(true)
        
        try {
            let data = null
            const token = getToken();

            if (Bag != null && !!schedule) {

                const ids = { users: Bag.userCv }
                data = await getusercvs(page, limit, ids, token);
            } else {
                let auxFilters={...filters}
                for (let key in auxFilters) {
                    if (auxFilters[key] === "") {
                        delete auxFilters[key];
                    }
                }

                data = await getusercvs(page, limit, auxFilters, token);
            }

            const enumsData = await getData();
            if (!enumsData.error) {
                let auxEnums = {}
                auxEnums['jobs'] = enumsData.jobs
                auxEnums['provinces'] = enumsData.provinces
                auxEnums['work_schedule'] = enumsData.work_schedule
                auxEnums['studies'] = enumsData.studies
                setEnums(auxEnums)
            }
            if (data.error) {
                charge(false)
                modal('Error', data.message)
            } else {
                setUsers(data.users); // Establece los usuarios recuperados
                setTotalPages(data.totalPages); // Establece el número total de páginas
                charge(false)
            }
        } catch (error) {
            charge(false)
            modal('Error', error)
        }
    };


    useEffect(() => {
        setUrlCv(null)
        setUserSelected(null)
    }, [Bag])

    // Cargar usuarios cuando cambie la página, el tamaño de página o los filtros
    useEffect(() => {
        if (logged.isLoggedIn) loadUsers();
        else navigate('/login')
    }, [page, limit, filters, schedule]);

    // Función para manejar el cambio de página
    const handlePageChange = (newPage) => {
        setPage(newPage);
    };

    // Función para manejar el cambio de tamaño de página
    const handleLimitChange = (event) => {
        const newLimit = parseInt(event.target.value);
        setLimit(newLimit);
        setPage(1); // Resetear a la primera página al cambiar el tamaño de página
    };

    // Función para manejar el cambio en los filtros
    const handleFilterChange = (event) => {
        setPage(1)
        setUrlCv(null)
        const { name, value } = event.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    };


    // Función para aplicar los filtros
    const resetFilters = () => {
        setFilters(prevFilters => ({
            name: '',
            email: '',
            phone: '',
            jobs: '',
            provinces: '',
            work_schedule: '',
            view: '',
            offer: '',
            studies: '',
        })); // Reiniciar a la primera página al aplicar los filtros
    };

    const lookCV = async (id, userData) => {

        charge(true)

        if (userSelected == userData) {
            setUrlCv(null)
            setUserSelected(null);
            charge(false)
        } else {
            const token = getToken();
            const cvData = await getCVs(id, token);
            if(!cvData.error){
                setUrlCv(cvData)
                setUserSelected(userData);
                charge(false)   
            } else {
                charge(false)
                modal('Error', cvData.message)
            }
            
        }

    }

    const changeUser = (userModify) => {
        let usersAux = [...users]
        usersAux.map((x, i, a) => {
            if (x._id == userModify._id) {
                a[i] = userModify
                setUserSelected(null)
                setUsers(usersAux)
            }
        })
    }

    const checkUser = (userInfo) => {
        if (userInfo.reject != null) return 'tomato'
        if (Bag != null && !!Bag.userCv) {
            const user = Bag.userCv.find(x => x === userInfo._id)
            if (user != undefined) {
                return 'green'
            }
        }
    }

    

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
                    <div>
                        <label htmlFor="offer">Oferta:</label>
                        <input type="text" id="offer" name="offer" value={filters.offer} onChange={handleFilterChange} />
                    </div>

                    {!!enums &&
                        <>
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


                    <div>
                        <label htmlFor="view">Visto</label>
                        <select id='view' name='view' onChange={handleFilterChange} value={filters.view}>
                            <option value={''}>Selecciona una opción</option>
                            <option value={`1`}>Si</option>
                            <option value={`0`}>No</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="favorite">Favoritos</label>                       
                        <select id='favorite' name='favorite' onChange={handleFilterChange} value={filters.favorite}>
                            <option value={''}>Selecciona una opción</option>
                            <option value={`1`}>Si</option>
                            <option value={`0`}>No</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="reject">Rechazados</label>
                        <select id='reject' name='reject' onChange={handleFilterChange} value={filters.reject}>
                            <option value={''}>Selecciona una opción</option>
                            <option value={`1`}>Si</option>
                            <option value={`0`}>No</option>
                        </select>
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
                    <div className={styles.tableCell}>Oferta</div>
                    <div className={styles.tableCell}>V</div>
                    <div className={styles.tableCell}></div>
                    <div className={styles.tableCell}>Fecha</div>
                </div>
                {users.map(user => (
                    <div key={user._id} >

                        <div className={`${styles.tableRow} ${checkUser(user)}`} onClick={() => lookCV(user._id, user)}>
                            <div className={`${styles.tableCell} ${styles.capitalize}`}>{user.name}</div>
                            <div className={styles.tableCell}>{user.email}</div>
                            <div className={styles.tableCell}>{user.phone}</div>
                            <div className={styles.tableCell}>{user.jobs.join(', ')}</div>
                            <div className={styles.tableCell}>{user.studies.join(', ')}</div>
                            <div className={styles.tableCell}>{(user.provinces.length!=11)?user.provinces.join(', '):'Todas'}</div>
                            <div className={styles.tableCell}>{(user.offer != null) ? user.offer.job_title : ''}</div>
                            <div className={styles.tableCell}><span className={stylesTooltip.tooltip}>{user.numberCV}<span className={stylesTooltip.tooltiptext}>Versión</span></span></div>
                            <div className={styles.tableCell}>{
                                (user.view)
                                    ?<span className={stylesTooltip.tooltip}><FaEye /><span className={stylesTooltip.tooltiptext}>Visto</span></span> 
                                    :<span className={stylesTooltip.tooltip}><FaRegEyeSlash /><span className={stylesTooltip.tooltiptext}>No Visto</span></span>  }{
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
                                charge={()=>charge()}
                                urlpdf={urlCv}
                                user={userSelected}
                                changeUser={(x)=>changeUser(x)}
                                modal={(title, message) => modal(title, message)}>
                            </CvPanel>
                        }
                    </div>
                ))}


            </div>
        </div>

    );
};


export default ManagingResumenes