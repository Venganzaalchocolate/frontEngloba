import { useEffect, useState } from "react"
import { getCVs, getData, getusercvs } from "../../lib/data";
import styles from '../styles/managingResumenes.module.css';
import { FaEye } from "react-icons/fa";
import PdfV from "./PdfV";
import { FaCheck } from "react-icons/fa";
import { FaRegEyeSlash } from "react-icons/fa6";
import { IoNewspaperSharp } from "react-icons/io5";




// 
const ManagingResumenes = ({ closeAction }) => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10); // Tamaño de página por defecto
    const [users, setUsers] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [enums, setEnums] = useState(null)
    const [urlCv, setUrlCv]=useState(null)
    const [userSelected, setUserSelected]=useState(null)
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

    // Función para cargar los datos de la página actual
    const loadUsers = async () => {
        try {
            const data = await getusercvs(page, limit, filters);
            const enumsData = await getData();
            let auxEnums = {}
            auxEnums['jobs'] = enumsData.jobs
            auxEnums['provinces'] = enumsData.provinces
            auxEnums['work_schedule'] = enumsData.work_schedule
            setEnums(auxEnums)
            if (data.error) {
                console.error('Error al cargar usuarios:', data.error);
            } else {
                setUsers(data.users); // Establece los usuarios recuperados
                setTotalPages(data.totalPages); // Establece el número total de páginas
            }
        } catch (error) {
            console.error('Error en la solicitud:', error);
        }
    };


    // Cargar usuarios cuando cambie la página, el tamaño de página o los filtros
    useEffect(() => {
        loadUsers();
    }, [page, limit, filters]);

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

    const lookCV=async (id, userData)=>{
        const cvData=await getCVs(id);
        console.log(cvData)
        setUrlCv(cvData)
        setUserSelected(userData);
    }

    return (
        <div className={styles.contenedor}>
            <h2>Listado de Usuarios</h2>
            <div>
                <label htmlFor="limit">Usuarios por página:</label>
                <select id="limit" value={limit} onChange={handleLimitChange}>
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={20}>20</option>
                </select>
            </div>

            <div className={styles.contenedorfiltro}>
                <h3>Filtros</h3>
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
                        <option value={true}>Si</option>
                        <option value={false}>No</option>
                    </select>
                </div>

                {!!enums &&
                    <div>
                        <label htmlFor="jobs">Puestos</label>
                        <select id='jobs' name='jobs' onChange={handleFilterChange} value={filters.jobs}>
                            <option>Selecciona una opción</option>
                            {enums.jobs.map((x) => {
                                return <option value={x}>{x}</option>
                            })}
                        </select>
                    </div>
                }
                {!!enums &&
                    <div>
                        <label htmlFor="provinces">Provincias</label>
                        <select id='provinces' name='provinces' onChange={handleFilterChange} value={filters.provinces}>
                            <option>Selecciona una opción</option>
                            {enums.provinces.map((x) => {
                                return <option value={x}>{x}</option>
                            })}
                        </select>
                    </div>
                }
                {!!enums &&
                    <div>
                        <label htmlFor="work_schedule">Horario</label>
                        <select id='work_schedule' name='work_schedule' onChange={handleFilterChange} value={filters.work_schedule}>
                            <option>Selecciona una opción</option>
                            {enums.work_schedule.map((x) => {
                                return <option value={x}>{x}</option>
                            })}
                        </select>
                    </div>
                }

                

                <div>
                    <button onClick={resetFilters}>Reset Filtros</button>
                </div>

            </div>

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
                <div className={styles.tableCell}>Ver Curriculum</div>
            </div>
            {users.map(user => (
                <>
                <div className={styles.tableRow} key={user._id}>
                    <div className={styles.tableCell}>{user.name}</div>
                    <div className={styles.tableCell}>{user.email}</div>
                    <div className={styles.tableCell}>{user.phone}</div>
                    <div className={styles.tableCell}>{user.jobs}</div>
                    <div className={styles.tableCell}>{user.provinces}</div>
                    <div className={styles.tableCell}>{user.offer}</div>
                    <div className={styles.tableCell}>{user.numberCV}</div>
                    <div className={styles.tableCell}>{(user.view)?<FaEye/>:<FaRegEyeSlash/>}</div>
                    <div className={styles.tableCell}>
                        <IoNewspaperSharp onClick={()=>lookCV(user._id, user)}></IoNewspaperSharp>
                    </div>
                </div>
                {urlCv!=null && userSelected._id==user._id && 
                <div className={styles.contenedorCV}>
                    <div>
                        <div>
                            <h2>Comentarios</h2>
                            <textarea name="comentarios" id="comentarios"></textarea>   
                            <button>Guardar Comentarios</button> 
                        </div>
                        <div>
                            <label htmlFor="visto">Visto</label>
                            <input type="checkbox" name="visto" id="visto"/>
                        </div>

                    </div>
                    <PdfV url={urlCv.url}></PdfV>
                    
                </div>}
                </>
                
            ))}
            
        </div>
            <div>
                <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                    Anterior
                </button>
                <span>Página {page}</span>
                <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
                    Siguiente
                </button>
            </div>
        </div>
    );
};


export default ManagingResumenes