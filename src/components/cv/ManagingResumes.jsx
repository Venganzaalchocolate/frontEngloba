import { useEffect, useState } from "react"
import { getCVs, getData, getusercvs } from "../../lib/data";
import styles from '../styles/managingResumenes.module.css';
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


// 
const ManagingResumenes = ({ modalC, charge }) => {
    const { logged, changeLogged, logout } = useLogin()
    const {Bag, schedule}= useBag()
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
        offer: ''
    });

    useEffect(()=>{
        (users!=0)? charge(true):charge(false)
    },[])

    // Función para cargar los datos de la página actual
    const loadUsers = async () => {
        charge(true)
        try {
            let data=null
            const token = getToken();
           
            if(Bag!=null && !!schedule){

                const ids={ users: Bag.userCv }
                data = await getusercvs(page, limit, ids, token);
            } else{
                data = await getusercvs(page, limit, filters, token); 
            }
            
            const enumsData = await getData();
            let auxEnums = {}
            auxEnums['jobs'] = enumsData.jobs
            auxEnums['provinces'] = enumsData.provinces
            auxEnums['work_schedule'] = enumsData.work_schedule
            setEnums(auxEnums)
            if (data.error) {
                console.error('Error al cargar usuarios:', data.message);
            } else {
                setUsers(data.users); // Establece los usuarios recuperados
                setTotalPages(data.totalPages); // Establece el número total de páginas
                charge(false)
            }
        } catch (error) {
            console.error('Error en la solicitud:', error);
        }
    };

    
    useEffect(()=>{
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
            offer: ''
        })); // Reiniciar a la primera página al aplicar los filtros
    };

    const lookCV = async (id, userData) => {

        charge(true)

        if(userSelected==userData){
            setUrlCv(null)
            setUserSelected(null);   
            charge(false)
        } else{
            const token = getToken();
            const cvData = await getCVs(id, token);
            setUrlCv(cvData)
            setUserSelected(userData);
            charge(false)
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
                    </select>
                    <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                    {'<'}
                    </button>
                    <span>Página {page}</span>
                    <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
                    {'>'}
                    </button>
                    <BagCreate/>
                </div>
            </div>
            {Bag!=null && !schedule &&<h2 id={styles.tituloProcesoActivo}>Selección activa: {Bag.name}</h2>}
            {Bag!=null && !!schedule &&<h2 id={styles.tituloProcesoActivo}>Entrevistas: {Bag.name}</h2>}
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
            <div>
                <label htmlFor="view">Visto</label>
                <select id='view' name='view' onChange={handleFilterChange} value={filters.view}>
                    <option>Selecciona una opción</option>
                    <option value={`true`}>Si</option>
                    <option value={`false`}>No</option>
                </select>
            </div>

            {!!enums &&
                <div>
                    <label htmlFor="jobs">Puestos</label>
                    <select id='jobs' name='jobs' onChange={handleFilterChange} value={filters.jobs}>
                        <option key='selectJob'>Selecciona una opción</option>
                        {enums.jobs.map((x) => {
                            return <option value={x} key={`SelectJob${x}`}>{x}</option>
                        })}
                    </select>
                </div>
            }
            {!!enums &&
                <div>
                    <label htmlFor="provinces">Provincias</label>
                    <select id='provinces' name='provinces' onChange={handleFilterChange} value={filters.provinces}>
                        <option key='selectProvinces'>Selecciona una opción</option>
                        {enums.provinces.map((x) => {
                            return <option value={x} key={`selectProvinces${x}`}>{x}</option>
                        })}
                    </select>
                </div>
            }
            {!!enums &&
                <div>
                    <label htmlFor="work_schedule">Horario</label>
                    <select id='work_schedule' name='work_schedule' onChange={handleFilterChange} value={filters.work_schedule}>
                        <option key='selectSchedule'>Selecciona una opción</option>
                        {enums.work_schedule.map((x) => {
                            return <option key={`selectSchedule${x}`} value={x}>{x}</option>
                        })}
                    </select>
                </div>
            }



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
                    <div className={styles.tableCell}>Provincias</div>
                    <div className={styles.tableCell}>Oferta</div>
                    <div className={styles.tableCell}>Version</div>
                    <div className={styles.tableCell}>Visto</div>
                </div>
                 {users.map(user => (
                        <div key={user._id} >
                            <div className={`${styles.tableRow} ${(Bag!=null && !!Bag.userCv && Bag.userCv.find(x => x === user._id)) ? 'green' : ''}`} onClick={() => lookCV(user._id, user)}>
                                <div className={styles.tableCell}>{user.name}</div>
                                <div className={styles.tableCell}>{user.email}</div>
                                <div className={styles.tableCell}>{user.phone}</div>
                                <div className={styles.tableCell}>{user.jobs}</div>
                                <div className={styles.tableCell}>{user.provinces}</div>
                                <div className={styles.tableCell}>{user.offer}</div>
                                <div className={styles.tableCell}>{user.numberCV}</div>
                                <div className={styles.tableCell}>{(user.view) ? <FaEye /> : <FaRegEyeSlash />}</div>
                            </div>
                            {userSelected!=null && userSelected._id == user._id &&
                                <CvPanel
                                    urlpdf={urlCv}
                                    user={userSelected}
                                    changeUser={(x) => setUserSelected(x)}
                                    modal={(title, message) => modalC(title, message)}>
                                </CvPanel>
                            }
                        </div>
                    ))}
                

            </div>
        </div>

    );
};


export default ManagingResumenes