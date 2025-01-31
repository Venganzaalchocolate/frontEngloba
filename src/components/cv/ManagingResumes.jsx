
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { deleteUserCv, getCVs, getData, getusercvs, getuserscvs } from "../../lib/data";
import styles from '../styles/managingResumenes.module.css';
import { useNavigate } from "react-router-dom";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from '../../hooks/useLogin.jsx';
// import BagCreate from "./BagCreate.jsx";
import { useDebounce } from "../../hooks/useDebounce.jsx"
import { useBag } from "../../hooks/useBag.jsx";
import { formatDatetime } from "../../lib/utils.js";
import Filters from "./Filters"; // Importa el nuevo componente
import BagSelect from "./BagSelect.jsx";
import DivEmployers from "./DivEmployers.jsx";

const ManagingResumenes = ({ modal, charge, enumsEmployer }) => {
    const { logged, changeLogged, logout } = useLogin();
    const { Bag, schedule, changeBag } = useBag();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50); // Tamaño de página por defecto
    const [users, setUsers] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [enums, setEnums] = useState(null);
    const [urlCv, setUrlCv] = useState(null);
    const [userSelected, setUserSelected] = useState(null);
    const [modalBag, setModalBag] = useState(false)
    const [bagUsers, setBagUsers]=useState([])
    const [seeUserBag, setseeUsaerBag]=useState(false)
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
                const ids = { users: Bag.process.userCv };
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

    const deleteUser = async () => {
        if (userSelected._id) {
            const token = getToken()
            const responseDelete = await deleteUserCv(token, { _id: userSelected._id });
            if (!responseDelete.error) {
                modal('Eliminado', 'Usuario eliminado con Éxito')
                const userAux = users.filter((x) => x._id != userSelected._id)
                setUserSelected(null)
                setUsers(userAux)
            }
            if (responseDelete.error) modal('Eliminado', 'Usuario no se ha podido eliminar')

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
        if (Bag != null && !!Bag.process.userCv) {
            const user = Bag.process.userCv.find(x => x === userInfo._id);
            if (user !== undefined) {
                return styles.selected; // Asegúrate de tener una clase CSS para esto
            }
        }
        // if(logged.user.role=='root' && userInfo.favorite != null) return styles.favoriteRoot;
        if (userInfo.favorite != null) return styles.favorite;
        return styles.tableRow; // Clase por defecto
    }, [Bag]);

    //p

    const bagUsersData=async()=>{
        const token=getToken();
        if(!!Bag && Bag.process.userCv && Bag.process.userCv.length>0){
            const data={
                ids:Bag.process.userCv
            }
         const users= await getuserscvs(data,token)   
         setBagUsers(users)
        }  else {
            setBagUsers([])
        }
    }

    const userBag=async ()=>{
        if(!seeUserBag){
          await bagUsersData(); 
          setseeUsaerBag(true) 
        } else {
            setseeUsaerBag(false)
        }
        
    }


    return (
        <div className={styles.contenedor}>
            <div className={styles.paginacion}>
                <h2>Solicitudes de Empleo</h2>
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

                </div>

            </div>

            {!schedule &&
                <Filters
                    filters={filters}
                    enums={enums}
                    handleFilterChange={handleFilterChange}
                    resetFilters={resetFilters}
                    setFilters={setFilters}
                />
            }

            <div className={styles.cajaOfertas}>
                {Bag != null && <h2 className={styles.tituloProcesoActivo}>Selección activa: {Bag.nameOffer}</h2>}
                <div className={styles.cajaOfertasBotones}>
                    {modalBag ? <BagSelect offers={enums.offer} closeModal={() => setModalBag(false)} /> : <button onClick={() => setModalBag(true)}>{(Bag != null) ? 'Cambiar Oferta' : 'Selecciona una oferta'}</button>}
                    {(Bag != null) && <button onClick={() => changeBag(null)}>Salir de la oferta</button>}
                    {(Bag != null) && !!Bag.process.userCv &&
                    <button onClick={()=>userBag()}>Ver Personas añadidas</button>
                    }
                    
                </div>
                {Bag != null && (
  <div className={styles.cvAddBolsa}>
    <p>
      Nº de CV añadidos a la oferta:
      {!!Bag.process.userCv ? Bag.process.userCv.length : '0'}
    </p>
    
    {/* Mapeo de los usuarios que están en Bag.process.userCv */}
    {
        seeUserBag &&  <DivEmployers
        users={bagUsers}
        keySuffix="bag"
        checkUser={checkUser}
        lookCV={lookCV}
        formatDatetime={formatDatetime}
        userSelected={userSelected}
        charge={charge}
        urlCv={urlCv}
        changeUser={changeUser}
        modal={modal}
        deleteUser={deleteUser}
        enums={enums}
        enumsEmployer={enumsEmployer}
    />
    }
   
    
  </div>
)}


            </div>

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
                
                <DivEmployers
        users={users}
        keySuffix="bag"
        checkUser={checkUser}
        lookCV={lookCV}
        formatDatetime={formatDatetime}
        userSelected={userSelected}
        charge={charge}
        urlCv={urlCv}
        changeUser={changeUser}
        modal={modal}
        deleteUser={deleteUser}
        enums={enums}
        enumsEmployer={enumsEmployer}
    />
                


            </div>
            <div className={styles.paginacion}>
                <h2>Solicitudes de Empleo</h2>
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
                </div>
            </div>
        </div>

    );
};


export default ManagingResumenes
