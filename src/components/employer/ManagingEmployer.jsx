import { useCallback, useEffect, useState } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import { FaSquarePlus } from "react-icons/fa6";
import Filters from "./Filters";
import { useDebounce } from '../../hooks/useDebounce.jsx';
import { useLogin } from '../../hooks/useLogin.jsx';
import { getDataEmployer, getusers } from '../../lib/data';
import { getToken } from '../../lib/serviceToken.js';
import ViewEmployers from './ViewEmployers.jsx';
import { deepClone } from '../../lib/utils.js';
import FormCreateEmployer from './FormCreateEmployer';
import DeleteEmployer from './DeleteEmployer.jsx';

const ManagingEmployer = ({ modal, charge, listResponsability, enumsData }) => {
  const { logged } = useLogin();
  const isRootOrGlobal =
    logged?.user?.role === 'root' || logged?.user?.role === 'global';

  const [isModalOpen, setIsModalOpen] = useState(false);
  // Aquí guardamos los "enums" (programas, provincias, etc.)
  const [enumsEmployer, setEnumsEmployer] = useState(enumsData);

  // Función para recargar los "enums" desde servidor
  const chargeEnums = useCallback(async () => {
    try {
      const data = await getDataEmployer();
      setEnumsEmployer(data);
      return data;
    } catch (error) {
      modal('Error', error.message || 'Ocurrió un error recargando datos.');
      return null;
    }
  }, [modal]);

  const [userSelected, setUserSelected] = useState(null);
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  // Responsabilidad seleccionada por el usuario (solo si no eres root/global)
  const [selectedResponsibility, setSelectedResponsibility] = useState(null);

  // Filtros por default
  const [filters, setFilters] = useState({
    firstName: '',
    email: '',
    phone: '',
  });

  // Filtros con debounce
  const debouncedFilters = useDebounce(filters, 300);

  // ==================================================
  // =============== LÓGICA DE RESPONSABILIDAD ========
  // ==================================================

  // Convertimos listResponsability en array de opciones
  const getResponsibilityOptions = () => {
    const options = [];
    listResponsability.forEach((item) => {
      // Si es responsable de programa
      if (item.isProgramResponsible) {
        const label = `(Programa) ${item.programName}`;
        const valueObj = {
          type: "program",
          programId: item.idProgram
        };
        const value = JSON.stringify(valueObj);
        options.push({ label, value });
      }
      // Si es responsable (o coordinador) de un dispositivo
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

  // Manejo automático de responsabilidad si NO eres root/global
  useEffect(() => {
    if (!isRootOrGlobal) {
      if (!listResponsability || listResponsability.length === 0) {
        // Sin acceso
        setSelectedResponsibility(null);
      } else if (listResponsability.length === 1) {
        // Autoseleccionar
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

  // =====================================================
  // =============== CARGA DE USUARIOS ===================
  // =====================================================
  const loadUsers = async (showLoader = false) => {
    if (showLoader) charge(true);
    try {
      const token = getToken();
      let auxFilters = { ...debouncedFilters };
      for (let key in auxFilters) {
        if (auxFilters[key] === "") {
          delete auxFilters[key];
        }
      }

      // Si NO eres root/global, aplicamos restricciones
      if (!isRootOrGlobal) {
        if (!selectedResponsibility) {
          // Si no hay selección de responsabilidad, no cargamos
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

      const data = await getusers(page, limit, auxFilters, token);
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

  // ====================================================
  // ============= MANEJADORES DE PAGINACIÓN Y FILTROS ==
  // ====================================================

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

  // ====================================================
  // ============= MANEJO DE MODAL Y USERS LOCALES ======
  // ====================================================

  const closeModal = () => {
    setIsModalOpen(false);
  };
  const openModal = () => {
    setIsModalOpen(true);
  };

  // Actualiza un user en la lista (para no recargar todo)
  const changeUserLocally = (u) => {
    const aux = deepClone(users);
    aux.forEach((x, i) => {
      if (x._id === u._id) aux[i] = u;
    });
    setUserSelected(u);
    setUsers(aux);
  };

  // ====================================================
  // ============= RENDER LÓGICA ========================
  // ====================================================

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
      const options = [];
      listResponsability.forEach((item) => {
        if (item.isProgramResponsible) {
          options.push({
            label: `(Programa) ${item.programName}`,
            value: JSON.stringify({
              type: "program",
              programId: item.idProgram
            })
          });
        }
        if (item.isDeviceResponsible || item.isDeviceCoordinator) {
          options.push({
            label: `(Dispositivo) ${item.dispositiveName} [${item.programName}]`,
            value: JSON.stringify({
              type: "device",
              programId: item.idProgram,
              deviceId: item.dispositiveId
            })
          });
        }
      });

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
              {isModalOpen && (
                <FormCreateEmployer
                  selectedResponsibility={selectedResponsibility}
                  enumsData={enumsEmployer}
                  modal={modal}
                  charge={charge}
                  closeModal={closeModal}
                  chargeUser={() => loadUsers(true)}
                />
              )}
            </div>

            {/* Paginación si eres root/global */}
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
              // Si no eres root/global => mostrar select "Activo"
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
            {/* Solo mostramos Filtros si eres root/global */}
            {isRootOrGlobal && (
              <Filters
                filters={filters}
                enums={enumsEmployer} // se pasa enumsEmployer
                handleFilterChange={handleFilterChange}
                resetFilters={resetFilters}
                setFilters={setFilters}
              />
            )}

            <div className={styles.containerTableContainer}>
              <div>
                {/* Cabecera de la tabla */}
                <div
                  className={styles.tableContainer}
                  id={styles.cabeceraTabla}
                >
                  <div className={styles.tableCell}>Nombre</div>
                  <div className={styles.tableCell}>Apellidos</div>
                  <div className={styles.tableCellStatus}>Status</div>
                </div>

                {/* Listado de usuarios */}
                {users.map((user) => {
                  // Filtrar usuarios apafa si no tienes permisos
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
                          <div>holi</div>
                          // <ViewEmployers
                          //   listResponsability={listResponsability}
                          //   chargeEnums={chargeEnums}
                          //   enumsData={enumsEmployer}
                          //   user={userSelected}
                          //   modal={modal}
                          //   charge={charge}
                          //   changeUser={(x) => changeUserLocally(x)}
                          //   chargeUser={() => loadUsers(true)}
                          // />
                        )}
                      </div>

                      {/* Si eres root y no hay usuario seleccionado => botón de borrar */}
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
