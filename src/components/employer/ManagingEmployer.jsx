import { useCallback, useEffect, useState } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import Filters from "./Filters";
import { useDebounce } from '../../hooks/useDebounce.jsx';
import { useLogin } from '../../hooks/useLogin.jsx';
import { getusers, getusersnotlimit } from '../../lib/data';
import { getToken } from '../../lib/serviceToken.js';
import { capitalizeWords, deepClone } from '../../lib/utils.js';
import FormCreateEmployer from './FormCreateEmployer';
import DeleteEmployer from './DeleteEmployer.jsx';
import InfoEmployer from './InfoEmployer.jsx';
import Responsability from './Responsability.jsx';
import Coordination from './Coordination.jsx';
import Payrolls from '../payroll/Payrolls.jsx';
import VacationDays from './VacationDays.jsx';
import Hiringperiods from './HiringsPeriods.jsx';
import { TbFileTypeXml } from "react-icons/tb";
import DocumentMiscelaneaGeneric from '../globals/DocumentMiscelaneaGeneric .jsx';
import { FaPersonCircleMinus, FaBusinessTime } from "react-icons/fa6";
import CreateDocumentXLS from './CreateDocumentXLS.jsx';




function getUserStatuses(users) {
  const now = new Date();
  return users.reduce((acc, user) => {
    if (!user.hiringPeriods || !Array.isArray(user.hiringPeriods)) {
      return acc;
    }
    // Filtrar los hiringPeriods activos y "abiertos" (sin endDate o endDate futura)
    const activePeriods = user.hiringPeriods.filter(period => {
      return period.active && (!period.endDate || new Date(period.endDate) > now);
    });
    if (activePeriods.length === 0) return acc;

    // Verificar si alguno de estos períodos tiene un leavePeriod abierto
    const isOnLeave = activePeriods.some(period =>
      (period.leavePeriods || []).some(lp => lp.active && !lp.actualEndLeaveDate)
    );
    // Verificar si alguno de estos períodos es por sustitución
    const isSubstituting = activePeriods.some(period =>
      period.reason && period.reason.replacement === true
    );

    if (isOnLeave) {
      acc.push({ idUsuario: user._id, tipo: "baja" });
    } else if (isSubstituting) {
      acc.push({ idUsuario: user._id, tipo: "sustitucion" });
    }
    return acc;
  }, []);
}


const ManagingEmployer = ({
  modal,
  charge,
  listResponsability,
  enumsData,           // <-- YA NO copiamos en un useState
  chargePrograms,
  closeAction,
}) => {
  const { logged } = useLogin();
  const isRootOrGlobal =
    logged?.user?.role === 'root' || logged?.user?.role === 'global';

  // Usuario seleccionado al hacer click en la lista
  const [userSelected, setUserSelected] = useState(null);

  // Paginación
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // Lista de usuarios devueltos por la API
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  const [usersWithStatus, setUsersWithStatus] = useState([]);



  // Si NO eres root/global, podrás filtrar según una responsabilidad concreta
  const [selectedResponsibility, setSelectedResponsibility] = useState(null);

  // Filtros de búsqueda
  const [filters, setFilters] = useState({
    firstName: '',
    email: '',
    phone: '',
    apafa:'no'
  });

  // Filtros con debounce
  const debouncedFilters = useDebounce(filters, 300);

  // Estado para abrir/cerrar modal de crear empleado
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [userXLS, setUsersXls]=useState(null)
  // ==================================================
  // ========== LÓGICA DE RESPONSABILIDADES ============
  // ==================================================

  // Generar opciones según listResponsability
  const getResponsibilityOptions = () => {
    const options = [];
    listResponsability.forEach((item) => {
      if (item.isProgramResponsible) {
        const label = `(Programa) ${item.programName}`;
        const valueObj = {
          type: "program",
          programId: item.idProgram
        };
        const value = JSON.stringify(valueObj);
        options.push({ label, value });
      }
      if (item.isDeviceResponsible || item.isDeviceCoordinator) {
        const label = `(Dispositivo) ${item.dispositiveName} [${item.programName}]`;
        const valueObj = {
          type: "device",
          programId: item.idProgram,
          deviceId: item.dispositiveId
        };
        const value = JSON.stringify(valueObj);
        options.push({ label, value });
      }
    });
    return options;
  };

  // Auto-seleccionar responsabilidad si no eres root/global
  useEffect(() => {
    if (!isRootOrGlobal) {
      if (!listResponsability || listResponsability.length === 0) {
        setSelectedResponsibility(null);
      } else if (listResponsability.length === 1) {
        const item = listResponsability[0];
        if (item.isProgramResponsible) {
          setSelectedResponsibility(
            JSON.stringify({
              type: "program",
              programId: item.idProgram
            })
          );
        } else if (item.isDeviceResponsible || item.isDeviceCoordinator) {
          setSelectedResponsibility(
            JSON.stringify({
              type: "device",
              programId: item.idProgram,
              deviceId: item.dispositiveId
            })
          );
        }
      }
    }
  }, [isRootOrGlobal, listResponsability]);

  const handleSelectResponsibility = (e) => {
    setSelectedResponsibility(e.target.value || null);
    setPage(1);
    setUserSelected(null);
  };

  // ==================================================
  // =============== CARGA DE USUARIOS =================
  // ==================================================
  const loadUsers = async (showLoader = false) => {
    if (showLoader) charge(true);
    try {
      const token = getToken();
      let auxFilters = { ...debouncedFilters };
      // Borramos los campos vacíos
      for (let key in auxFilters) {
        if (auxFilters[key] === "") {
          delete auxFilters[key];
        }
      }

      // Si NO eres root/global, filtramos por su responsabilidad
      if (!isRootOrGlobal) {
        if (!selectedResponsibility) {
          if (showLoader) charge(false);
          return;
        }
        const resp = JSON.parse(selectedResponsibility);
        if (resp.type === "program") {
          auxFilters.programId = resp.programId;
        } else if (resp.type === "device") {
          auxFilters.programId = resp.programId;
          auxFilters.dispositive = resp.deviceId;
        }
      }

      let data = await getusers(page, limit, auxFilters, token);

      const statuses = getUserStatuses(data.users);
      setUsersWithStatus(statuses);
      data.users = data.users.map(user => ({
        ...user,
        firstName: capitalizeWords(user.firstName),
        lastName: capitalizeWords(user.lastName)
      }));

      if (data.error) {
        modal("Error", data.message);
      } else {
        setUsers(data.users);
        setTotalPages(data.totalPages);
      }
    } catch (error) {
      modal('Error', error.message || 'Ocurrió un error inesperado.');
    } finally {
      if (showLoader) charge(false);
    }
  };



  useEffect(() => {
    if (logged?.isLoggedIn) {
      loadUsers(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, page, limit, selectedResponsibility]);

  // ==================================================
  // ====== MANEJADORES DE PAGINACIÓN Y FILTROS ========
  // ==================================================
  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handleLimitChange = useCallback((event) => {
    const newLimit = parseInt(event.target.value, 10);
    setLimit(newLimit);
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((event) => {
    setPage(1);
    setUserSelected(null);
    const { name, value } = event.target;
    setFilters((prevFilters) => ({
      ...prevFilters,
      [name]: value || ''
    }));
  }, []);

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
      provinces: '',
      apafa:'no'
    });
  }, []);

  // ==================================================
  // =========== MODAL DE CREACIÓN DE EMPLEADO ========
  // ==================================================
  const closeModal = () => {
    setIsModalOpen(false);
  };
  const openModal = () => {
    setIsModalOpen(true);
  };

  // ==================================================
  // ========== ACTUALIZAR USUARIO LOCALMENTE =========
  // ==================================================
  const changeUserLocally = (updatedUser) => {
    const aux = deepClone(users);
    aux.forEach((x, i) => {
      if (x._id === updatedUser._id) {
        aux[i] = updatedUser;
      }
    });
    setUserSelected(updatedUser);
    setUsers(aux);
  };

  // ==================================================
  // ============= RENDER DE LA INTERFAZ ==============
  // ==================================================

  // Si no eres root/global y no tienes responsabilidades
  if (!isRootOrGlobal) {
    if (!listResponsability || listResponsability.length === 0) {
      return (
        <div className={styles.contenedor}>
          <div className={styles.contenido}>
            <h2>No tienes programas o dispositivos asignados.</h2>
          </div>
        </div>
      );
    }

    // Si hay varias responsabilidades y no está elegida => select
    if (listResponsability.length > 1 && !selectedResponsibility) {
      const options = getResponsibilityOptions();
      return (
        <div className={styles.contenedor}>
          <div className={styles.contenido}>
            <h2>Selecciona un Programa o Dispositivo</h2>
            <select
              onChange={handleSelectResponsibility}
              defaultValue=""
              className={styles.selectInicial}
            >
              <option value="">Seleccionar una opción</option>
              {options.map((opt, i) => (
                <option key={i} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    if (!selectedResponsibility) {
      return null;
    }
  }

  const getUserNotLimit = async () => {
    try {
      charge(true);
      const token = getToken();
      let auxFilters = { ...debouncedFilters };

      for (let key in auxFilters) {
        if (auxFilters[key] === "") {
          delete auxFilters[key];
        }
      }

      const data = await getusersnotlimit(auxFilters, token);
      if (!data || !data.users) {
        throw new Error("No se recibieron datos de usuarios");
      }
      return data.users
    } catch (err) {
      modal("Error", "Error al obtener usuarios o generar Excel");
    } finally {
      charge(false);
    }
  };
  const openXlsForm=async ()=>{
    const userAll=await getUserNotLimit();
    setUsersXls(userAll)
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <>
          <div className={styles.titulo}>
            <div>
              <h2>GESTIÓN DE EMPLEADOS</h2>
              <FaSquarePlus onClick={openModal} />
              <TbFileTypeXml onClick={() => openXlsForm()} />
              {(userXLS) && <CreateDocumentXLS users={userXLS} enumsData={enumsData} closeXls={()=>setUsersXls(null)}/>}
              <a
                className={styles.botonMailto}
                href="mailto:web@engloba.org.es?subject=MediaJornada&body=Buenas Gustavo, necesito añadir a media jornada <Nombre>, con DNI <DNI>, al dispositivo <dipositivo>, con fecha de inicio <fecha>, puesto <cargo>, Gracias !!! "
              >
                Añadir media jornada en otro dispositivo
              </a>
              {isModalOpen && (
                <FormCreateEmployer
                  selectedResponsibility={selectedResponsibility}
                  enumsData={enumsData}
                  modal={modal}
                  charge={charge}
                  closeModal={closeModal}
                  chargeUser={() => loadUsers(true)}
                />
              )}
            </div>
            {isRootOrGlobal ? (
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
                  <button
                    onClick={() => handlePageChange(page - 1)}
                    disabled={page === 1}
                  >
                    {'<'}
                  </button>
                  <span>Página {page}</span>
                  <button
                    onClick={() => handlePageChange(page + 1)}
                    disabled={page === totalPages}
                  >
                    {'>'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.cajaSeleccionActiva}>
                <h4>Activo</h4>
                <select
                  onChange={handleSelectResponsibility}
                  value={selectedResponsibility || ""}
                >
                  {getResponsibilityOptions().map((opt, i) => (
                    <option key={i} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className={styles.caja}>
            {isRootOrGlobal && (
              <Filters
                filters={filters}
                enums={enumsData}
                handleFilterChange={handleFilterChange}
                resetFilters={resetFilters}
                setFilters={setFilters}
              />
            )}

            <div className={styles.containerTableContainer}>
              <div>
                <div className={styles.tableContainer} id={styles.cabeceraTabla}>
                  <div className={styles.tableCell}>Nombre</div>
                  <div className={styles.tableCell}>Apellidos</div>
                  <div className={styles.tableCellStatus}>Status</div>
                </div>

                {users.map((user) => {
                  if (
                    user.apafa &&
                    !(
                      logged?.user?.role === 'root' ||
                      logged?.user?.role === 'global' ||
                      logged?.user?.apafa
                    )
                  ) {
                    return null;
                  }

                  const userStatus = usersWithStatus.find(
                    (status) => status.idUsuario === user._id
                  );

                  return (
                    <div className={styles.containerEmployer} key={user._id}>
                      <div>
                        <div
                          className={styles.tableContainer}
                          onClick={() =>
                            !userSelected || userSelected._id !== user._id
                              ? setUserSelected(user)
                              : setUserSelected(null)
                          }
                        >
                          <div className={styles.tableCell}>
                            {user.firstName}
                          </div>
                          <div className={styles.tableCell}>
                            {user.lastName}
                          </div>



                          <div className={styles.tableCellStatus}>
                            {userStatus && <div>
                              {userStatus.tipo === "baja" ? <FaPersonCircleMinus className={styles.baja} /> : <FaBusinessTime className={styles.sus}/>}
                            </div>
                            }
                            <p>{user.employmentStatus}</p>

                          </div>
                        </div>

                        {userSelected && userSelected._id === user._id && (
                          <div className={styles.contenedorEmployer}>
                            <InfoEmployer
                              chargeUser={() => loadUsers(true)}
                              user={user}
                              modal={modal}
                              charge={charge}
                              changeUser={(x) => changeUserLocally(x)}
                              enumsData={enumsData}
                            />
                            <Responsability
                              chargePrograms={chargePrograms}
                              enumsData={enumsData}
                              user={user}
                              modal={modal}
                              charge={charge}
                              changeUser={(x) => changeUserLocally(x)}
                            />
                            <Coordination
                              chargePrograms={chargePrograms}
                              enumsData={enumsData}
                              user={user}
                              modal={modal}
                              charge={charge}
                              changeUser={(x) => changeUserLocally(x)}
                            />
                            <DocumentMiscelaneaGeneric
                              data={user}
                              modelName='User'
                              officialDocs={enumsData.documentation.filter((x) => x.model === 'User')}
                              modal={modal}
                              charge={charge}
                              onChange={(x) => changeUserLocally(x)}
                            />
                            <Payrolls
                              user={user}
                              modal={modal}
                              charge={charge}
                              changeUser={(x) => changeUserLocally(x)}
                              listResponsability={listResponsability}
                            />
                            {user.employmentStatus !== 'en proceso de contratación' &&
                              (user.role !== 'global' || user.role !== 'root') && (
                                <>
                                  <VacationDays
                                    user={user}
                                    modal={modal}
                                    charge={charge}
                                    changeUser={(x) => changeUserLocally(x)}
                                  />
                                  <Hiringperiods
                                    enumsData={enumsData}
                                    user={user}
                                    modal={modal}
                                    charge={charge}
                                    changeUser={(x) => changeUserLocally(x)}
                                    chargeUser={() => loadUsers(true)}
                                  />
                                </>
                              )}
                          </div>
                        )}
                      </div>

                      {logged?.user?.role === 'root' && !userSelected && (
                        <DeleteEmployer
                          user={user}
                          modal={modal}
                          charge={charge}
                          chargeUser={() => loadUsers(true)}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
};

export default ManagingEmployer;
