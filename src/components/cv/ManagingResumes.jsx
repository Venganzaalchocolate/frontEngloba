
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { deleteUserCv, getCVs, getOfferJobs, getusercvs, getuserscvs, updateOffer } from "../../lib/data";
import styles from '../styles/managingResumenes.module.css';
import { useNavigate } from "react-router-dom";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from '../../hooks/useLogin.jsx';
import { useDebounce } from "../../hooks/useDebounce.jsx"
import { deepClone, formatDatetime } from "../../lib/utils.js";
import Filters from "./Filters"; // Importa el nuevo componente
import DivEmployers from "./DivEmployers.jsx";
import { useOffer } from "../../hooks/useOffer.jsx";
import PageLimit from "./PageLimit.jsx";
import ContainerOffer from "./ContainerOffer.jsx";



const ManagingResumenes = ({ modal, charge, enumsEmployer, chargeOffers }) => {
    const { logged, changeLogged, logout } = useLogin();
    const { Offer, changeOffer } = useOffer();
    const navigate = useNavigate();
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(50); // Tamaño de página por defecto
    const [users, setUsers] = useState([]);
    const [totalPages, setTotalPages] = useState(0);
    const [urlCv, setUrlCv] = useState(null);
    const [userSelected, setUserSelected] = useState(null);
    const [userSelectedOffer, settUserSelectedOffer]=useState(null)
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
        disability: 0,
    });

const listOffers = useMemo(
  () => [...(enumsEmployer?.offers || [])],   // ← SIEMPRE un array nuevo
  [enumsEmployer?.offers]                     //   cuando cambia la prop global
);

    // Derivar una versión debounced de los filtros
    const debouncedFilters = useDebounce(filters, 300);



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
            disability: 0,
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

        const deleteUserInOffer = async (idUser) => {
            let offerAux = deepClone(Offer);
            offerAux['userCv'] = offerAux.userCv.filter((id) => id !== idUser);
            offerAux['id'] = offerAux._id;
            const token = getToken();
            const upOffer = await updateOffer(offerAux, token);  
            
            changeOffer(upOffer); // Actualiza la oferta en el estado principal
        };


    const viewUserOffer=(user)=>{
        settUserSelectedOffer(user)
    }
    
    return (
        <div className={styles.contenedor}>
            <div className={styles.paginacion}>
                <h2>Solicitudes de Empleo</h2>
                <PageLimit limit={limit} handleLimitChange={handleLimitChange} page={page} totalPages={totalPages} handlePageChange={handlePageChange} />

            </div>


            <Filters
                filters={filters}
                listOffers={listOffers}
                enums={enumsEmployer}
                handleFilterChange={handleFilterChange}
                resetFilters={resetFilters}
                setFilters={setFilters}
            />
            <div className={styles.containerOfferAndUsers}>
                <ContainerOffer 
                viewUserOffer={viewUserOffer} 
                deleteUserInOffer={deleteUserInOffer} 
                Offer={Offer} 
                listOffers={listOffers} 
                changeOffer={changeOffer}
                modal={modal}
                charge={charge}
                enumsData={enumsEmployer}
                changeOffers={chargeOffers}

                />
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

                    {!!userSelectedOffer 
                    
                    ?
                    <>
                    <DivEmployers
                        listOffers={listOffers}
                        chargeOffers={chargeOffers}
                        users={[userSelectedOffer]}
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
                    <button className='tomato' onClick={()=>viewUserOffer(null)}>Cerrar Vista</button>
                    </>
                      
                    :
                    <DivEmployers
                        listOffers={listOffers}
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
                }

                    



                </div>
            </div>


            <div className={styles.paginacion}>
                <PageLimit limit={limit} handleLimitChange={handleLimitChange} page={page} totalPages={totalPages} handlePageChange={handlePageChange} />
            </div>
        </div>

    );
};


export default ManagingResumenes
