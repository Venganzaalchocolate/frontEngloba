
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { deleteUserCv, getCVs, getOfferJobs, getusercvs, getuserscvs } from "../../lib/data";
import styles from '../styles/managingResumenes.module.css';
import { useNavigate } from "react-router-dom";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from '../../hooks/useLogin.jsx';
import { useDebounce } from "../../hooks/useDebounce.jsx"
import { formatDatetime } from "../../lib/utils.js";
import Filters from "./Filters"; // Importa el nuevo componente
// import BagSelect from "./BagSelect.jsx";
import DivEmployers from "./DivEmployers.jsx";
import OfferSelect from "./OfferSelect.jsx";
import { useOffer } from "../../hooks/useOffer.jsx";



const ManagingResumenes = ({ modal, charge, enumsEmployer}) => {
    const { logged, changeLogged, logout } = useLogin();
    const { Offer, changeOffer } = useOffer();
    const [listOffers, setListOffers]=useState([]);
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50); // Tamaño de página por defecto
    const [users, setUsers] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [urlCv, setUrlCv] = useState(null);
    const [userSelected, setUserSelected] = useState(null);
    const [modalBag, setModalBag] = useState(false)
    const [bagUsers, setBagUsers] = useState([])
    const [seeUserBag, setseeUsaerBag] = useState(false)
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
        disability:0,
    });
    

    // Derivar una versión debounced de los filtros
    const debouncedFilters = useDebounce(filters, 300);

    const chargeOffers=async ()=>{
        const offers = await getOfferJobs();

        if(!offers.error){
            const offersActive=offers.filter((x)=>x.active)
            setListOffers(offersActive)
        }
    }
    
    useEffect(()=>{
        chargeOffers();
        if (Offer) {
            bagUsersData();  // Recargar usuarios de la nueva oferta
            
        } else {
            setBagUsers([]);  // Vaciar la lista si no hay oferta
        }
        setseeUsaerBag(false);
    },[Offer])

    // Cargar usuarios cuando cambie la página, el tamaño de página, los filtros debounced o el schedule
    useEffect(() => {
        if (logged.isLoggedIn) {
            loadUsers();
        } else {
            navigate('/login');
        }
    }, [debouncedFilters, page, limit]);

    // Función para cargar los filtros de la página actual
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
                data = await getusercvs(page, limit, auxFilters, token);
                

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
    }, []);

   

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
            disability:0,
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
        if (Offer != null && !!Offer.userCv) {
            const user = Offer.userCv.find(x => x === userInfo._id);
            if (user !== undefined) {
                return styles.selected; // Asegúrate de tener una clase CSS para esto
            }
        }
        // if(logged.user.role=='root' && userInfo.favorite != null) return styles.favoriteRoot;
        if (userInfo.favorite != null) return styles.favorite;
        return styles.tableRow; // Clase por defecto
    }, [Offer]);

    //p

    const bagUsersData = async () => {
        const token = getToken();
        if (!!Offer && Offer.userCv && Offer.userCv.length > 0) {
            const data = {
                ids: Offer.userCv
            }
            const users = await getuserscvs(data, token)
            setBagUsers(users)
        } else {
            setBagUsers([])
        }
    }

    const userBag = async () => {
        if (!seeUserBag) {
            await bagUsersData();
            setUserSelected(null)
            setseeUsaerBag(true)
        } else {
            setseeUsaerBag(false)
        }

    }

    const modalOfferView=()=>{
        setModalBag(true)
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


            <Filters
                    filters={filters}
                    listOffers={listOffers}
                    enums={enumsEmployer}
                    handleFilterChange={handleFilterChange}
                    resetFilters={resetFilters}
                    setFilters={setFilters}
            />
            

            <div className={styles.cajaOfertas}>
                {Offer != null && <h2 className={styles.tituloProcesoActivo}>Selección activa: {Offer.job_title}</h2>}
                <div className={styles.cajaOfertasBotones}>
                  
                    {modalBag ? <OfferSelect  offers={listOffers} closeModal={() => setModalBag(false)} userSelected={userSelected} type={'select'}/> : <button onClick={() => modalOfferView()}>{(Offer != null) ? 'Cambiar Oferta' : 'Selecciona una oferta'}</button>}
                    {(Offer != null) && <button onClick={() => changeOffer(null)}>Salir de la oferta</button>}
                    {(Offer != null) && !!Offer.userCv &&
                        <button onClick={() => userBag()}>Ver Personas añadidas</button>
                    }

                </div>
                {Offer != null && (
                    <div className={styles.cvAddBolsa}>
                        <p>
                            Nº de CV añadidos a la oferta:
                            {!!Offer.userCv ? Offer.userCv.length : '0'}
                        </p>

                        {/* Mapeo de los usuarios que están en Bag.process.userCv */}
                        {
                            seeUserBag && <DivEmployers
                                chargeOffers={chargeOffers}
                                listOffers={listOffers}
                                modalBagView={modalOfferView}
                                users={bagUsers}
                                keySuffix="offer"
                                checkUser={checkUser}
                                lookCV={lookCV}
                                formatDatetime={formatDatetime}
                                userSelected={userSelected}
                                charge={charge}
                                urlCv={urlCv}
                                changeUser={changeUser}
                                modal={modal}
                                deleteUser={deleteUser}
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
                listOffers={listOffers}
                modalBagView={modalOfferView}
                chargeOffers={chargeOffers}
                    users={users}
                    keySuffix="offer"
                    checkUser={checkUser}
                    lookCV={lookCV}
                    formatDatetime={formatDatetime}
                    userSelected={userSelected}
                    charge={charge}
                    urlCv={urlCv}
                    changeUser={changeUser}
                    modal={modal}
                    deleteUser={deleteUser}
                    enumsEmployer={enumsEmployer}
                    Offer={Offer}
                    changeOffer={(x) => changeOffer(x)}
           
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
