import { useCallback, useEffect, useState } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import { FaSquarePlus, FaBell  } from "react-icons/fa6";
import Filters from "./Filters";
import { useDebounce } from '../../hooks/useDebounce.jsx';
import { useLogin } from '../../hooks/useLogin.jsx';
import { currentStatusEmployee, getusers, getusersnotlimit,getpendingrequest } from '../../lib/data';

import { getToken } from '../../lib/serviceToken.js';
import { capitalizeWords, deepClone } from '../../lib/utils.js';
import FormCreateEmployer from './FormCreateEmployer';
import DeleteEmployer from './DeleteEmployer.jsx';
import InfoEmployer from './InfoEmployer.jsx';
import ResponsabilityAndCoordination from './ResponsabilityAndCoordination.jsx';
import Payrolls from '../payroll/Payrolls.jsx';
import VacationDays from './VacationDays.jsx';
// import Hiringperiods from './HiringsPeriods.jsx';
import HiringPeriodsV2 from './HiringPeriodsV2.jsx';
import { TbFileTypeXml } from "react-icons/tb";
import { FaPersonCircleMinus, FaBusinessTime } from "react-icons/fa6";
import CreateDocumentXLS from './CreateDocumentXLS.jsx';
import DocumentMiscelaneaGeneric from '../globals/DocumentMiscelaneaGeneric.jsx';
import FilterStatus from './FilterStatus.jsx';
import PreferentsEmployee from './PreferentsEmployee.jsx';
import MenuOptionsEmployee from './MenuOptionsEmployee.jsx';
import { useMemo } from 'react';
import SupervisorChangeRequests from './SupervisorChangeRequests.jsx';



const ManagingEmployer = ({
  modal,
  charge,
  listResponsability,
  enumsData,           // <-- YA NO copiamos en un useState
  closeAction,
}) => {
  const { logged } = useLogin();
  const isRootOrGlobal =
    logged?.user?.role === 'root' || (logged?.user?.role === 'global');
  const apafaUser = (logged.user.apafa == false || logged.user._id == '67d80ef5f093b4a61894b881' || logged?.user?.role === 'root') ? 'no' : 'si'
  // Usuario seleccionado al hacer click en la lista
  const [userSelected, setUserSelected] = useState(null);

  // Paginación
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // Lista de usuarios devueltos por la API
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  const [userStatusMap, setUserStatusMap] = useState({});
  const [selectOptionMenuEmployee, setselectOptionMenuEmployee] = useState('mis-datos')


  // Si NO eres root/global, podrás filtrar según una responsabilidad concreta
  const [selectedResponsibility, setSelectedResponsibility] = useState(null);

  // Filtros de búsqueda
  const [filters, setFilters] = useState({
    firstName: '',
    email: '',
    phone: '',
    apafa: apafaUser,
    status: 'total',
  });

  // Filtros con debounce
  const debouncedFilters = useDebounce(filters, 300);

  // Estado para abrir/cerrar modal de crear empleado
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [userXLS, setUsersXls] = useState(false)

  // ==================================================
  // ========== LÓGICA DE PETICIONES PENDIENTES ============
  // ==================================================

const [pendingMap, setPendingMap] = useState({});

const loadPendingFlags = async (ids, token) => {
  if (!ids?.length) { setPendingMap({}); return; }

  // pedimos solo las pendientes de estos usuarios
  const res = await getpendingrequest({ userIds: ids, status: 'pending' }, token);

  // normalizamos distintas formas de respuesta
  const list =
    Array.isArray(res?.data?.data) ? res.data.data :
    Array.isArray(res?.data) ? res.data :
    Array.isArray(res) ? res : [];

  // si ya viene agregado → { items:[{userId,count}] }
  const items = Array.isArray(res?.items) ? res.items : null;

  const map = {};
  if (items) {
    for (const it of items) {
      const uid = String(it.userId);
      map[uid] = { count: Number(it.count || 0) };
    }
  } else {
    // lista de requests → agrupamos por usuario
    for (const r of list) {
      const uid = String(
        r.userId || r.user || r.idUser || r?.idUser?._id || r?.user?._id
      );
      if (!uid) continue;
      map[uid] = { count: (map[uid]?.count || 0) + 1 };
    }
  }
  setPendingMap(map);
};

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

      // ➊ pedir estado actual al backend para los usuarios de la página
const ids = (data.users || []).map(u => u._id);

// ➋ flags de peticiones pendientes
if (ids.length) {
  await loadPendingFlags(ids, token);
}
      let statusMap = {};
      if (ids.length) {
        const resStatus = await currentStatusEmployee({ userIds: ids }, token);
        const items = resStatus?.items || [];
        statusMap = Object.fromEntries(items.map(it => [String(it.userId), it]));
      }
      setUserStatusMap(statusMap);

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



  const { activeUsers, onLeaveUsers } = useMemo(() => {
    const active = [];
    const leave = [];

    for (const u of users) {
      const st = userStatusMap[String(u._id)];
      (st?.isOnLeave ? leave : active).push(u);
    }

    active.sort((a, b) =>
      (a.lastName || '').localeCompare(b.lastName || '', 'es', { sensitivity: 'base' }) ||
      (a.firstName || '').localeCompare(b.firstName || '', 'es', { sensitivity: 'base' })
    );

    leave.sort((a, b) => {
      const ax = userStatusMap[String(a._id)]?.replacement?.leave?.startLeaveDate;
      const bx = userStatusMap[String(b._id)]?.replacement?.leave?.startLeaveDate;
      const t = (bx ? new Date(bx).getTime() : 0) - (ax ? new Date(ax).getTime() : 0);
      if (t !== 0) return t;
      return (a.lastName || '').localeCompare(b.lastName || '', 'es', { sensitivity: 'base' });
    });

    return { activeUsers: active, onLeaveUsers: leave };
  }, [users, userStatusMap]);


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
    if (apafaUser == 'no') {
      setFilters((prevFilters) => ({
        ...prevFilters,
        [name]: value || ''
      }));
    } else if (apafaUser == 'si' && name != 'apafa') {
      setFilters((prevFilters) => ({
        ...prevFilters,
        [name]: value || ''
      }));
    }

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
      status: 'total',
      provinces: '',
      apafa: apafaUser,
      position: ''

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
// Refresca el contador de pendientes solo para 1 usuario y MERGE con el mapa actual
  const refreshPendingFlagForUser = async (userId) => {
  try {
    const token = getToken();
    const res = await getpendingrequest({ userIds: [userId], status: 'pending' }, token);

    const list =
      Array.isArray(res?.data?.data) ? res.data.data :
      Array.isArray(res?.data) ? res.data :
      Array.isArray(res) ? res : [];

    const items = Array.isArray(res?.items) ? res.items : null;

    let count = 0;
    if (items) {
      count = Number(items.find(it => String(it.userId) === String(userId))?.count || 0);
    } else {
      for (const r of list) {
        const uid = String(
          r.userId || r.user || r.idUser || r?.idUser?._id || r?.user?._id
        );
        if (String(uid) === String(userId)) count++;
      }
    }

    setPendingMap(prev => ({ ...prev, [String(userId)]: { count } }));
  } catch (_) {
    // silencioso
  }
};

  // ==================================================
  // ========== ACTUALIZAR USUARIO LOCALMENTE =========
  // ==================================================
const changeUserLocally = (updatedUser) => {
  const aux = deepClone(users);
  let upUs=false
  aux.forEach((x, i) => {
    if (x._id === updatedUser._id) {
      aux[i] = updatedUser;
      upUs=true
    }
  });
  setUserSelected(updatedUser);
  if(!upUs && !!updatedUser._id) aux.push(updatedUser)
  setUsers(aux);

  // 🔁 Actualiza el indicador de peticiones pendientes para este usuario
  refreshPendingFlagForUser(updatedUser._id);
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
      if (!!selectedResponsibility) {
        const resp = JSON.parse(selectedResponsibility);
        if (resp.type === "program") {
          auxFilters.programId = resp.programId;
        } else if (resp.type === "device") {
          auxFilters.programId = resp.programId;
          auxFilters.dispositive = resp.deviceId;
        }
      }

      const data = await getusersnotlimit(auxFilters, token);
      if (!data || !data.users || data.users.length == 0) {
        throw new Error("No se recibieron datos de usuarios");
      }
      return data.users
    } catch (err) {
      console.log(err)
      modal("Error", "Error al obtener usuarios o generar Excel");
    } finally {
      charge(false);
    }
  };
  const openXlsForm = async () => {
    const userAll = await getUserNotLimit();
    setUsersXls(userAll)
  }


  const menuConfig = {
    "mis-datos": [(user) => <InfoEmployer listResponsability={listResponsability} key="info" user={user} modal={modal} charge={charge} enumsData={enumsData} chargeUser={() => loadUsers(true)} changeUser={(x) => changeUserLocally(x)} />],
    "resp-coord": [(user) => (<ResponsabilityAndCoordination key="resp-coord" user={user} modal={modal} charge={charge} enumsData={enumsData}  />),],
    "documentacion": [(user) => <DocumentMiscelaneaGeneric key="docs" data={user} modelName="User" modal={modal} charge={charge} authorized={true} enumsData={enumsData} categoryFiles={enumsData.categoryFiles} officialDocs={enumsData.documentation.filter(x => x.model === "User")} onChange={(x) => changeUserLocally(x)} />],
    "nominas": [(user) => <Payrolls key="payrolls" user={user} modal={modal} charge={charge} listResponsability={listResponsability} changeUser={(x) => changeUserLocally(x)} />],
    "vacaciones": [(user) => <VacationDays key="vac" user={user} modal={modal} charge={charge} changeUser={(x) => changeUserLocally(x)} />],
    "contratos": [(user) => <HiringPeriodsV2  key="hiring" user={user} modal={modal} charge={charge} enumsData={enumsData} chargeUser={() => loadUsers(true)} changeUser={(x) => changeUserLocally(x)} />],
    "solicitudes": [(user)=> <SupervisorChangeRequests key="scr" changeUserLocally={changeUserLocally} userId={user._id} approverId={logged.user._id} modal={modal} charge={charge} enumsData={enumsData} onUserUpdated={(u) => changeUserLocally(u)}/>], 
    "preferencias": [(user) => <PreferentsEmployee key="pref" user={user} modal={modal} charge={charge} enumsData={enumsData} authorized={logged.user._id} />] 
    };


const renderUserRow = (user) => {
  const userStatus = userStatusMap[String(user._id)];
  const rowClass =
    userStatus?.isOnLeave
      ? `${styles.tableContainer} ${styles.isOnLeave}`
      : userStatus?.isSubstituting
      ? `${styles.tableContainer} ${styles.isSubstituting}`
      : styles.tableContainer;

  return (
    <div className={styles.containerEmployer} key={user._id}>
      <div>
        <div
          className={rowClass}
          onClick={() =>
            !userSelected || userSelected._id !== user._id
              ? setUserSelected(user)
              : setUserSelected(null)
          }
        >
          <div className={styles.tableCell}>{user.firstName}</div>
          <div className={styles.tableCell}>{user.lastName}</div>
           <div className={styles.tableCell}>{(pendingMap[String(user._id)]?.count > 0)&& <FaBell color='tomato'/>}</div>
          <div className={styles.tableCellStatus}>{user.employmentStatus}</div>
        </div>

        {userSelected && userSelected._id === user._id && (
          <div className={styles.contenedorEmployer}>
            <MenuOptionsEmployee
              options={Object.keys(menuConfig)}
              current={selectOptionMenuEmployee}
              onSelect={setselectOptionMenuEmployee}
            />
            {menuConfig[selectOptionMenuEmployee]?.map((Render) =>
              Render(userSelected)
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
};




  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <>
          <div className={styles.titulo}>
            <div>
              <h2>GESTIÓN DE EMPLEADOS</h2>
              {isRootOrGlobal && <FaSquarePlus onClick={openModal} />}
              <TbFileTypeXml onClick={() => openXlsForm()} />
              {!!userXLS && <CreateDocumentXLS users={userXLS} enumsData={enumsData} closeXls={() => setUsersXls(null)} modal={modal}/>}

              {isModalOpen && (
                <FormCreateEmployer
                  selectedResponsibility={selectedResponsibility}
                  enumsData={enumsData}
                  modal={modal}
                  charge={charge}
                  closeModal={closeModal}
                  chargeUser={() => loadUsers(true)}
                  changeUser={changeUserLocally}
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
            {isRootOrGlobal ? (
              <Filters
                filters={filters}
                enums={enumsData}
                handleFilterChange={handleFilterChange}
                resetFilters={resetFilters}
                setFilters={setFilters}
              />
            ) :
              <FilterStatus
                filters={filters}
                enums={enumsData}
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
                  <div className={styles.tableCellCenter}>Peticiones</div>
                  <div className={styles.tableCellStatus}>Status</div>
                </div>
                {/* Activos primero */}
                {activeUsers.map(renderUserRow)}

                {/* Sección “Personal de baja” */}
                {onLeaveUsers.length > 0 && (
                  <>
                    <div className={styles.sectionDivider} />
                    <h3 className={styles.sectionTitle}>PERSONAL DE BAJA</h3>
                    {onLeaveUsers.map(renderUserRow)}
                  </>
                )}

              </div>
            </div>
          </div>
        </>
      </div>
    </div>
  );
};

export default ManagingEmployer;
