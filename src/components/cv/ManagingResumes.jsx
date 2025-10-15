
import React, { useEffect, useState, useMemo, useCallback } from "react";
import { deleteUserCv, getCVs,  offerList, getusercvs, getuserscvs, offerUpdate } from "../../lib/data";
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
     const [urlCv, setUrlCv] = useState({ url: null, loading: false, error: null });
    const [userSelected, setUserSelected] = useState(null);
    const [userSelectedOffer, setUserSelectedOffer]=useState(null)
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

const listOffers = useMemo(() => {
  const offers = enumsEmployer?.offers ?? [];
  const jobsIndex = enumsEmployer?.jobsIndex ?? {};
  const programsIndex = enumsEmployer?.programsIndex ?? {};

  return offers.map((o) => {
    const jobName = jobsIndex?.[o?.jobId]?.name ?? "Puesto sin nombre";
    const programName = programsIndex?.[o?.dispositive?.dispositiveId]?.name ?? "Programa sin nombre";
    const jobTitle = [jobName, programName].filter(Boolean).join(" — ");

    return { ...o, jobTitle }; // ← añadimos el campo derivado
  });
}, [
  enumsEmployer?.offers,
]);
    // Derivar una versión debounced de los filtros
    const debouncedFilters = useDebounce(filters, 300);



    // Cargar usuarios cuando cambie la página, el tamaño de página, los filtros debounced o el schedule
    useEffect(() => {
        if (logged.isLoggedIn) {
            loadUsers();
        } else {
            navigate('/');
        }
    }, [debouncedFilters, page, limit]);

    // Función para cargar los filtros de la página actual
    const loadUsers = async (filters=false) => {
        charge(true);

        try {
            let data = null;
            const token = getToken();

            let auxFilters = (!!filters)?filters:{ ...debouncedFilters };
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
        setUrlCv({ url: null, loading: false, error: null });
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
        setUrlCv({ url: null, loading: false, error: null });
        setUserSelected(null)
        const { name, value } = event.target;
        setFilters(prevFilters => ({
            ...prevFilters,
            [name]: value
        }));
    }, []);

    // Función para aplicar los filtros
    const resetFilters = useCallback(() => {
        setUserSelectedOffer(null)  
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
  // Si vuelves a hacer clic en el mismo usuario: cierra panel
  if (userSelected?._id === userData._id) {
    setUserSelected(null);
    setUrlCv({ url: null, loading: false, error: null });
    return;
  }

  // Muestra los datos del usuario al instante
  setUserSelected(userData);

  // Pone el visor PDF en "cargando" mientras se pide el blob
  setUrlCv({ url: null, loading: true, error: null });

  try {
    const token = getToken();
    const cvData = await getCVs(id, token); // esperado: { url: 'blob:...' }

    if (cvData?.error || !cvData?.url) {
      setUrlCv({
        url: null,
        loading: false,
        error: cvData?.message || 'No se pudo cargar el PDF',
      });
      return;
    }

    setUrlCv({ url: cvData.url, loading: false, error: null });
  } catch (err) {
    setUrlCv({
      url: null,
      loading: false,
      error: err?.message || 'Ocurrió un error inesperado.',
    });
  }
}, [userSelected]);


    const changeUser = useCallback((userModify) => {
        setUsers(prevUsers => prevUsers.map(user => user._id === userModify._id ? userModify : user));
        if (userSelected && userSelected._id === userModify?._id) {
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
            const data={
                offerId:offerAux._id,
                userCv:offerAux.userCv
                }
            const token = getToken();
            const upOffer = await offerUpdate(data, token);  
            if(upOffer.error) modal('Error', 'No se ha podido eliminar al usuario de la oferta')
            else changeOffer(upOffer); // Actualiza la oferta en el estado principal
        };


    const viewUserOffer=(data)=>{
        if(Array.isArray(data)){
            setUsers(data)
            setUserSelectedOffer(null) 
            setUserSelected(null)
        } else{
          setUserSelectedOffer(data)  
        }
        
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
                resetFilters={resetFilters}

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
