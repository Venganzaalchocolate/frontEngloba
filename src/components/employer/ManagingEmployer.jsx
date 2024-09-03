import { useCallback, useEffect, useState } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import FormCreateEmployers from './FormCreateEmployer';
import { FaSquarePlus } from "react-icons/fa6";
import Filters from "./Filters";
import { useDebounce } from '../../hooks/useDebounce.jsx';
import { useLogin } from '../../hooks/useLogin.jsx';
import { getDataEmployer, getusers } from '../../lib/data';
import { getToken } from '../../lib/serviceToken.js';

const ManagingEmployer = ({ modal, charge }) => {
    const { logged, changeLogged, logout } = useLogin();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [enums, setEnums] = useState(null);
    const [userSelected, setUserSelected] = useState(null);
    const [limit, setLimit] = useState(50);
    const [page, setPage] = useState(1);
    const [users, setUsers] = useState([]);
    const [totalPages, setTotalPages] = useState(0);

    const [filters, setFilters] = useState({
        firstName: '',
        email: '',
        phone: '',
    });

    // Derivar una versión debounced de los filtros
    const debouncedFilters = useDebounce(filters, 300);

    useEffect(() => {
        if (logged.isLoggedIn) {
            loadUsers();
        } else {
            navigate('/login');
        }
    }, [debouncedFilters, page, limit]);

    const changeAction = () => {
        setIsModalOpen(true); // Abre el modal
    };

    const closeModal = () => {
        setIsModalOpen(false); // Cierra el modal
    };

    const loadUsers = async () => {
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

            data = await getusers(page, limit, auxFilters, token);

            const enumsData = await getDataEmployer();
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

    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <div className={styles.titulo}>
                    <h2>GESTIÓN DE EMPLEADOS</h2>
                    <FaSquarePlus onClick={changeAction} />
                    {isModalOpen && 
                        <FormCreateEmployers modal={modal} charge={charge} user={userSelected} closeModal={closeModal} />
                    }
                    <div className={styles.paginacion}>
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
                    </div>
                </div>
                <div className={styles.caja}>
                    <Filters
                        filters={filters}
                        enums={enums}
                        handleFilterChange={handleFilterChange}
                        resetFilters={resetFilters}
                        setFilters={setFilters}
                    />
                    <div className={styles.containerTableContainer}>
                        <div>
                            <div className={styles.tableContainer} id={styles.cabeceraTabla}>
                                <div className={styles.tableCell}>Nombre</div>
                                <div className={styles.tableCell}>Apellidos</div>
                                <div className={styles.tableCell}>Email</div>
                                <div className={styles.tableCell}>Teléfono</div>
                                <div className={styles.tableCell}>DNI</div>
                                <div className={styles.tableCell}>Status</div>
                            </div>
                            {users.map(user => (
                                <div key={user._id}>
                                    <div className={styles.tableContainer}>
                                        <div className={styles.tableCell}>{user.firstName}</div>
                                        <div className={styles.tableCell}>{user.lastName}</div>
                                        <div className={styles.tableCell}>{user.email}</div>
                                        <div className={styles.tableCell}>{user.phone}</div>
                                        <div className={styles.tableCell}>{user.dni}</div>
                                        <div className={styles.tableCell}>{user.employmentStatus}</div>
                                    </div>
                                    {userSelected != null && userSelected._id === user._id}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ManagingEmployer;
