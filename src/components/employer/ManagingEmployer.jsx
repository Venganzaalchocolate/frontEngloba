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

/**
 * Ejemplo de listResponsability:
 * [
 *   {
 *     "idProgram": "66c433e93213e72d7e253e15",
 *     "programName": "Dispositivos de Emergencia",
 *     "isProgramResponsible": false,
 *     "dispositiveName": "DE Estepona",
 *     "dispositiveId": "679b363108f2794750cb9936",
 *     "isDeviceResponsible": true,
 *     "isDeviceCoordinator": false
 *   },
 *   ...
 * ]
 */

const ManagingEmployer = ({ modal, charge, listResponsability, enumsData }) => {
  const { logged } = useLogin();
  const isRootOrGlobal = (logged.user.role === 'root' || logged.user.role === 'global');

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [enums, setEnums] = useState(null);
  const [enumsEmployer, setEnumsEmployer] = useState(enumsData);
  const [userSelected, setUserSelected] = useState(null);
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  // Análogo a "dispositiveNow", pero guardamos un objeto con info:
  // { type: 'program'|'device', programId, deviceId (opcional) }
  const [selectedResponsibility, setSelectedResponsibility] = useState(null);

  const [filters, setFilters] = useState({
    firstName: '',
    email: '',
    phone: '',
  });

  const debouncedFilters = useDebounce(filters, 300);

  // Cargar enums (programs, provinces, etc.)
  const chargeEnums = useCallback(async () => {
    const enumsData = await getDataEmployer();
    setEnumsEmployer(enumsData);
    return enumsData;
  }, []);

  useEffect(() => {
    const init = async () => {
      if (!enumsData.error) {
        setEnums({
          provinces: enumsData.provinces,
          programs: enumsData.programs,
          status: enumsData.status,
        });
      }
    };
    init();
  }, []);

  // ==================================================
  // =============== LÓGICA DE RESPONSABILIDAD ========
  // ==================================================

  // Convertimos listResponsability en opciones de "program" o "device":
  // Mismo approach que tu "SelectDispositive", pero unificado
  const getResponsibilityOptions = () => {
    const options = [];

    listResponsability.forEach((item) => {
      // Si es responsable de programa
      if (item.isProgramResponsible) {
        // Podemos concatenar "programId" con "type"
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

    // Filtrar duplicados, si quieres. 
    // O dejar así, por si un item puede ser a la vez device y program en la misma row.
    return options;
  };

  // Si NO eres root/global, forzamos la selección
  // 1) Si listResponsability.length === 0 => no tienes acceso
  // 2) Si listResponsability.length === 1 => autoseleccionamos
  // 3) Si >1 => mostramos select
  useEffect(() => {
    if (!isRootOrGlobal) {
      if (!listResponsability || listResponsability.length === 0) {
        // Sin acceso
        setSelectedResponsibility(null);
      } else if (listResponsability.length === 1) {
        // Autoseleccionar
        const item = listResponsability[0];
        if (item.isProgramResponsible) {
          setSelectedResponsibility(JSON.stringify({
            type: "program",
            programId: item.idProgram
          }));
        } else if (item.isDeviceResponsible || item.isDeviceCoordinator) {
          setSelectedResponsibility(JSON.stringify({
            type: "device",
            programId: item.idProgram,
            deviceId: item.dispositiveId
          }));
        }
      }
      // Si hay más de uno, lo gestionamos en el render. 
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

      // Si eres root/global, no restringimos nada
      if (!isRootOrGlobal) {
        // Comprobamos selectedResponsibility
        if (!selectedResponsibility) {
          // Sin selección => no cargamos nada
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

  // Cada vez que cambien los filtros, la pag, la limit, la selectedResponsibility => recargamos
  useEffect(() => {
    if (logged.isLoggedIn) {
      loadUsers(true);
    }
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
    setFilters(prevFilters => ({
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

  const changeUserLocally = (u) => {
    let aux = deepClone(users);
    aux.forEach((x, i) => {
      if (x._id === u._id) aux[i] = u;
    });
    setUserSelected(u);
    setUsers(aux);
  };

  // ====================================================
  // ============= RENDER LÓGICA ========================
  // ====================================================

  // 1) Si NO eres root/global y hay multiples responsabilidades, pedimos selección
  if (!isRootOrGlobal) {
    // Si no tienes ninguna
    if (!listResponsability || listResponsability.length === 0) {
      return (
        <div className={styles.contenedor}>
          <div className={styles.contenido}>
            <h2>No tienes programas o dispositivos asignados.</h2>
          </div>
        </div>
      );
    }

    // Si tienes varias y no has seleccionado => mostramos un select 
    // (si length===1 lo autoseleccionamos en el useEffect)
    if (listResponsability.length > 1 && !selectedResponsibility) {
      const options = [];
      // Recorremos listResponsability y generamos <option>
      listResponsability.forEach((item, idx) => {
        // Chequeamos si es un programa o dispositivo
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
            <select onChange={handleSelectResponsibility} defaultValue="" className={styles.selectInicial}>
              <option value="">Seleccionar una opción</option>
              {options.map((opt, i) => (
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    // Si llegamos aquí y no se ha seleccionado => no renderizamos la lista
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
              {isModalOpen &&
                <FormCreateEmployer
                  enumsData={enumsEmployer}
                  modal={modal}
                  charge={charge}
                  closeModal={closeModal}
                  chargeUser={() => loadUsers(true)}
                />
              }
            </div>

            {/* 
              Si root/global => paginación
              Si NO, muestra la "cajaSeleccionActiva" (o nada) 
            */}
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
                  <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>{'<'}</button>
                  <span>Página {page}</span>
                  <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>{'>'}</button>
                </div>
              </div>
            ) : (
              // Para roles "employer", mostramos un select de "activo" 
              // si quieres mantener tu "cajaSeleccionActiva"
              // O un label "Seleccionado" con el item actual
              <div className={styles.cajaSeleccionActiva}>
                <h4>Activo</h4>
                {/* 
                  Extra: Permitimos cambiar la responsibility en caliente 
                  (opcional). Si no lo quieres, quita este <select>. 
                */}
                <select
                  onChange={handleSelectResponsibility}
                  value={selectedResponsibility || ""}
                >
                  {getResponsibilityOptions().map((opt, i) => (
                    <option key={i} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
            )}

          </div>

          <div className={styles.caja}>
            {(isRootOrGlobal) && (
              <Filters
                filters={filters}
                enums={enums}
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

                {users.map(user => (
                  <div key={user._id}>
                    <div
                      className={styles.tableContainer}
                      onClick={() => (userSelected == null || userSelected._id !== user._id)
                        ? setUserSelected(user)
                        : setUserSelected(null)
                      }
                    >
                      <div className={styles.tableCell}>{user.firstName}</div>
                      <div className={styles.tableCell}>{user.lastName}</div>
                      <div className={styles.tableCellStatus}>{user.employmentStatus}</div>
                    </div>

                    {userSelected && userSelected._id === user._id && (
                      <ViewEmployers
                        listResponsability={listResponsability}
                        chargeEnums={chargeEnums}
                        enumsData={enumsEmployer}
                        user={userSelected}
                        modal={modal}
                        charge={charge}
                        changeUser={(x) => changeUserLocally(x)}
                        chargeUser={() => loadUsers(true)}
                      />
                    )}
                  </div>
                ))}

              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
};

export default ManagingEmployer;
