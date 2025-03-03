import { useCallback, useEffect, useState } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import Filters from "./Filters";
import { useDebounce } from '../../hooks/useDebounce.jsx';
import { useLogin } from '../../hooks/useLogin.jsx';
import { getusers } from '../../lib/data';
import { getToken } from '../../lib/serviceToken.js';
import { capitalizeWords, deepClone } from '../../lib/utils.js';
import FormCreateEmployer from './FormCreateEmployer';
import DeleteEmployer from './DeleteEmployer.jsx';
import InfoEmployer from './InfoEmployer.jsx';
import Responsability from './Responsability.jsx';
import Coordination from './Coordination.jsx';
import DocumentEmployerMiscelanea from './DocumentEmployerMiscelanea.jsx';
import Payrolls from '../payroll/Payrolls.jsx';
import VacationDays from './VacationDays.jsx';
import Hiringperiods from './HiringsPeriods.jsx';

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

  // Si NO eres root/global, podrás filtrar según una responsabilidad concreta
  const [selectedResponsibility, setSelectedResponsibility] = useState(null);

  // Filtros de búsqueda
  const [filters, setFilters] = useState({
    firstName: '',
    email: '',
    phone: '',
  });

  // Filtros con debounce
  const debouncedFilters = useDebounce(filters, 300);

  // Estado para abrir/cerrar modal de crear empleado
  const [isModalOpen, setIsModalOpen] = useState(false);

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
          // No se carga nada si no hay responsabilidad seleccionada
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
      data.users=data.users.map(user => ({
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
      provinces: ''
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

  // 1) Si NO eres root/global y no tienes responsabilidades
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

    // Si no hay selección => no renderiza la lista
    if (!selectedResponsibility) {
      return null;
    }
  }

  // 2) Eres root/global O ya tenemos selectedResponsibility => Render normal
  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <>
          <div className={styles.titulo}>
            <div>
              <h2>GESTIÓN DE EMPLEADOS</h2>
              <FaSquarePlus onClick={openModal} />
              <a className={styles.botonMailto} href="mailto:web@engloba.org.es?subject=MediaJornada&body=Buenas Gustavo, necesito añadir a media jornada <Nombre>, con DNI <DNI>, al dispositivo <dipositivo>, con fecha de inicio <fecha>, puesto <cargo>, Gracias !!! ">
  Añadir media jornada en otro dispositivo
</a>
              {isModalOpen && (
                <FormCreateEmployer
                  selectedResponsibility={selectedResponsibility}
                  enumsData={enumsData}  // en lugar de enumsEmployer
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
                enums={enumsData} // antes se usaba enumsEmployer
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
                  // Filtrar usuario apafa, etc., según permisos
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
                            {user.employmentStatus}
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
                              enumsData={enumsData} // usamos directamente la prop
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
                            <DocumentEmployerMiscelanea
                              user={user}
                              modal={modal}
                              charge={charge}
                              changeUser={(x) => changeUserLocally(x)}
                            />
                            <Payrolls
                              user={user}
                              modal={modal}
                              charge={charge}
                              changeUser={(x) => changeUserLocally(x)}
                              listResponsability={listResponsability}
                            />
                            {/* Si no está en proceso de contratación, etc. */}
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
