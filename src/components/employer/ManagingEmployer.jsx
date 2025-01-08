import { useCallback, useEffect, useState } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import FormCreateEmployers from './FormCreateEmployer';
import { FaSquarePlus } from "react-icons/fa6";
import Filters from "./Filters";
import { useDebounce } from '../../hooks/useDebounce.jsx';
import { useLogin } from '../../hooks/useLogin.jsx';
import { getDataEmployer, getDispositiveResponsable, getusers } from '../../lib/data';
import { getToken } from '../../lib/serviceToken.js';
import ViewEmployers from './ViewEmployers.jsx';
import { deepClone } from '../../lib/utils.js';

const ManagingEmployer = ({ modal, charge }) => {
    const { logged, changeLogged, logout } = useLogin();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [enums, setEnums] = useState(null);
    const [enumsEmployer, setEnumsEmployer] = useState(null);
    const [userSelected, setUserSelected] = useState(null);
    const [limit, setLimit] = useState(50);
    const [page, setPage] = useState(1);
    const [users, setUsers] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [dispositiveNow, setDispositiveNow] = useState(null)
    const [listDispositive, setListDispositive] = useState([])
    const [filters, setFilters] = useState({
        firstName: '',
        email: '',
        phone: '',
    });

    // Derivar una versión debounced de los filtros
    const debouncedFilters = useDebounce(filters, 300);

    const chargeUser=()=>{
        if (logged.isLoggedIn) {
            if(logged.user.role=='root' || logged.user.role=='global') loadUsers();
            else loadDispositive();
        } else {
            navigate('/login');
        }
    }

    useEffect(() => {
        chargeUser();
    }, [debouncedFilters, page, limit]);


    useEffect(() => {
        if (dispositiveNow != null) {
            loadUsers(true)
        }
    }, [dispositiveNow])


    const changeAction = () => {
        setIsModalOpen(true); // Abre el modal
    };

    const closeModal = () => {
        setIsModalOpen(false); // Cierra el modal
    };

    const loadDispositive = async () => {
        
        charge(true)
        const token = getToken();
        const id = logged.user._id;
        const disp = await getDispositiveResponsable({ _id: id }, token)
        const allDevices = disp.flatMap(program => program.devices);
        if (allDevices.length > 1) setListDispositive(allDevices);
        else setDispositiveNow(allDevices[0])
        charge(false)
    }

    const chargeEnums=async()=>{
        const enumsData = await getDataEmployer();
        setEnumsEmployer(enumsData)
        return enumsData
    }

    const loadUsers = async (filter = false) => {
        charge(true);
        try {
            let data = null;
            const token = getToken();
            let auxFilters = { ...debouncedFilters };
            for (let key in auxFilters) {
                if (auxFilters[key] === "") {
                    delete auxFilters[key];
                }
            }

            if (!!filter) auxFilters['dispositiveNow'] = dispositiveNow
            data = await getusers(page, limit, auxFilters, token);

            const enumsData=await chargeEnums();
            if (!enumsData.error) {
                let auxEnums = {
                    provinces: enumsData.provinces,
                    programs: enumsData.programs,
                    status: enumsData.status
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
        setUserSelected(null);
        const { name, value } = event.target;
        if (name === 'programId') {
            setFilters(prevFilters => ({
                ...prevFilters,
                [name]: value,
                ['dispositive']: null
            }));
        } else {
            setFilters(prevFilters => ({
                ...prevFilters,
                [name]: value,
            }));
        }
    }, []);

    // Función para aplicar los filtros
    const resetFilters = useCallback(() => {
        setUserSelected(null);
        setFilters({
            firstName: '',
            lastName: '',
            dni: '',
            email: '',
            phone: '',
            dispositive: '',
            programId: '',
            status: '',
            provinces: ''
        });
    }, []);

    const handleChange = (e) => {
        setDispositiveNow(e.target.value);  // Actualizamos el estado con el valor seleccionado
    };

    const changeUser=(user)=>{
        let auxUser=deepClone(users)
        auxUser.map((x, i, a)=>{
            if(x._id==user._id) a[i]=user
        })
        setUserSelected(user)
        setUsers(auxUser)
    }


    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                {(!dispositiveNow && listDispositive.length > 0)
                    ? <div className={styles.cajaSeleccion}>
                        <h2>Selecciona un dispositivo</h2>
                        <select name='dispositiveNow' value={dispositiveNow} onChange={handleChange}>
                            <option value="">Selecciona un dispositivo</option>  {/* Primera opción */}
                            {listDispositive.map(x => (
                                <option key={x._id} value={x._id}>{x.name}</option>
                            ))}
                        </select>
                    </div>
                    : <>
                        <div className={styles.titulo}>
                            <div>
                            <h2>GESTIÓN DE EMPLEADOS</h2>
                            <FaSquarePlus onClick={changeAction} />
                            {isModalOpen &&
                                <FormCreateEmployers enumsData={enumsEmployer} modal={modal} charge={charge} user={userSelected} closeModal={closeModal} chargeUser={chargeUser}/>
                            }
                            </div>
                           
                            {(logged.user.role == 'root' || logged.user.role == 'global') ?
                                <div className={styles.paginacion}>
                                    <div>
                                    <label htmlFor="limit">Usuarios por página:</label>
                                    <select id="limit" value={limit} onChange={handleLimitChange}>
                                        <option value={5}>5</option>
                                        <option value={10}>10</option>
                                        <option value={20}>20</option>
                                        <option value={50}>50</option>
                                    </select>    
                                    </div>
                                    
                                    <div>
                                     <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                                        {'<'}
                                    </button>
                                    <span>Página {page}</span>
                                    <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
                                        {'>'}
                                    </button>   
                                    </div>
                                    
                                </div>
                                : <div className={styles.cajaSeleccionActiva}>
                                    <h4>Dispositivo Activo</h4>
                                    <select name='dispositiveNow' value={dispositiveNow} onChange={handleChange}>
                                        <option value="">Selecciona un dispositivo</option>  {/* Primera opción */}
                                        {listDispositive.map(x => (
                                            <option key={x._id} value={x._id}>{x.name}</option>
                                        ))}
                                    </select>
                                </div>


                            }


                        </div>
                        <div className={styles.caja}>
                            {(logged.user.role == 'root' || logged.user.role == 'global') &&
                                <Filters
                                    filters={filters}
                                    enums={enums}
                                    handleFilterChange={handleFilterChange}
                                    resetFilters={resetFilters}
                                    setFilters={setFilters}
                                />
                            }
                            

                            <div className={styles.containerTableContainer}>
                                <div>
                                    <div className={styles.tableContainer} id={styles.cabeceraTabla}>
                                        <div className={styles.tableCell}>Nombre</div>
                                        <div className={styles.tableCell}>Apellidos</div>
                                        <div className={styles.tableCellStatus}>Status</div>
                                    </div>
                                    {users.map(user => (
                                        //<div key={user._id} onClick={()=>(userSelected==null || user._id!=userSelected._id)?setUserSelected(user):setUserSelected(null)}>

                                        <div key={user._id} onClick={()=>(setUserSelected(user))}>
                                            <div className={styles.tableContainer}>
                                                <div className={styles.tableCell}>{user.firstName}</div>
                                                <div className={styles.tableCell}>{user.lastName}</div>
                                                <div className={styles.tableCellStatus}>{user.employmentStatus}</div>
                                            </div>
                                            {userSelected!=null && userSelected._id === user._id &&
                                            <ViewEmployers chargeEnums={chargeEnums} enumsData={enumsEmployer} user={userSelected} modal={modal} charge={charge} changeUser={(x)=>changeUser(x)}/>
                                            }
                                       
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </>
                }

            </div>
        </div>
    );
}

export default ManagingEmployer;
