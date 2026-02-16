import { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import { FaSquarePlus, FaBell } from "react-icons/fa6";
import { RiUserSharedFill } from 'react-icons/ri';
import { TbFileTypeXml } from "react-icons/tb";

import Filters from "./Filters";
import FilterStatus from './FilterStatus.jsx';

import { useDebounce } from '../../hooks/useDebounce.jsx';
import { useLogin } from '../../hooks/useLogin.jsx';
import { getusers, getusersnotlimit, profilePhotoGetBatch } from '../../lib/data';
import { getToken } from '../../lib/serviceToken.js';
import { capitalizeWords } from '../../lib/utils.js';

import FormCreateEmployer from './FormCreateEmployer';
import DeleteEmployer from './DeleteEmployer.jsx';
import InfoEmployer from './InfoEmployer.jsx';
import ResponsabilityAndCoordination from './ResponsabilityAndCoordination.jsx';
import Payrolls from '../payroll/Payrolls.jsx';
import VacationDays from './VacationDays.jsx';
import HiringPeriodsV2 from './HiringPeriodsV2.jsx';
import CreateDocumentXLS from './CreateDocumentXLS.jsx';
import DocumentMiscelaneaGeneric from '../globals/DocumentMiscelaneaGeneric.jsx';
import PreferentsEmployee from './PreferentsEmployee.jsx';
import MenuOptionsEmployee from './MenuOptionsEmployee.jsx';
import SupervisorChangeRequests from './SupervisorChangeRequests.jsx';
import RelocateHiringsModal from './RelocateHiringsModal.jsx';
import perfil92 from "../../assets/perfil_92.png";


const ManagingEmployer = ({ modal, charge, listResponsability = [], enumsData, closeAction }) => {
  // =========================
  // AUTH / ROLE
  // =========================
  const { logged } = useLogin();
  const isRootOrGlobal =
    logged?.user?.role === 'root' || logged?.user?.role === 'global';

  const apafaUser =
    logged.user.apafa == false ||
    logged.user._id == '67d80ef5f093b4a61894b881' ||
    logged?.user?.role === 'root'
      ? 'no'
      : 'si';

  // =========================
  // STATE: UI
  // =========================
  const [userSelected, setUserSelected] = useState(null);
  const [isRelocateOpen, setIsRelocateOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const [selectOptionMenuEmployee, setselectOptionMenuEmployee] = useState('mis-datos');

  // paginación
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // lista usuarios
  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  // responsabilidad elegida (SOLO no root/global)
  const [selectedResponsibility, setSelectedResponsibility] = useState(null);

  // XLS
  const [userXLS, setUsersXls] = useState(null);

  // filtros
  const [filters, setFilters] = useState({
    firstName: '',
    email: '',
    phone: '',
    apafa: apafaUser,
    status: 'total',
  });
  const debouncedFilters = useDebounce(filters, 300);

  // // =========================
  // // STATE: thumbs cache
  // // =========================
  // const thumbsCacheRef = useRef({}); // { [userId: string]: dataUrl }
  // const [thumbByUserId, setThumbByUserId] = useState({}); // snapshot para render

  // =========================
  // HELPERS
  // =========================
  const normId = (id) => String(id || '');

  const extractDataUrl = (photoValue) => {
    // soporta: photos[id] = "data:..."  ó  photos[id] = { dataUrl: "data:..." }
    if (!photoValue) return '';
    if (typeof photoValue === 'string') return photoValue;
    return photoValue?.dataUrl || '';
  };

  const getResponsibilityOptions = useCallback(() => {
    const options = [];
    listResponsability.forEach((item) => {
      if (item.isProgramResponsible) {
        options.push({
          label: `(Programa) ${item.programName}`,
          value: JSON.stringify({ type: "program", programId: item.idProgram }),
        });
      }
      if (item.isDeviceResponsible || item.isDeviceCoordinator) {
        options.push({
          label: `(Dispositivo) ${item.dispositiveName} [${item.programName}]`,
          value: JSON.stringify({
            type: "device",
            programId: item.idProgram,
            deviceId: item.dispositiveId,
          }),
        });
      }
    });
    return options;
  }, [listResponsability]);

  // =========================
  // LOADERS
  // =========================
  const loadUsers = useCallback(async (showLoader = false) => {
    if (showLoader) charge(true);

    try {
      const token = getToken();
      let auxFilters = { ...debouncedFilters };

      // quitar vacíos
      for (let key in auxFilters) {
        if (auxFilters[key] === "") delete auxFilters[key];
      }

      // Si NO eres root/global, se fuerza a su responsabilidad
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

      const data = await getusers(page, limit, auxFilters, token);

      const normalizedUsers = (data.users || []).map((user) => ({
        ...user,
        firstName: capitalizeWords(user.firstName),
        lastName: capitalizeWords(user.lastName),
      }));

      if (data.error) {
        modal("Error", data.message);
      } else {
        setUsers(normalizedUsers);
        setTotalPages(data.totalPages || 0);
      }
    } catch (error) {
      modal('Error', error.message || 'Ocurrió un error inesperado.');
    } finally {
      if (showLoader) charge(false);
    }
  }, [debouncedFilters, isRootOrGlobal, limit, page, selectedResponsibility]);

  // const refreshThumbForUser = useCallback(async (userId) => {
  //   try {
  //     const token = getToken();
  //     const id = normId(userId);

  //     const resp = await profilePhotoGetBatch({ userIds: [id], size: "thumb" }, token);
  //     if (resp?.error) return;

  //     const raw = resp?.photos?.[id];
  //     const dataUrl = extractDataUrl(raw);
  //     if (!dataUrl) return;

  //     thumbsCacheRef.current[id] = dataUrl;
  //     setThumbByUserId((prev) => ({ ...prev, [id]: dataUrl }));
  //   } catch (e) {}
  // }, []);

  // const loadThumbsForUsers = useCallback(async (usersList, signal) => {
  //   const token = getToken();
  //   const ids = (usersList || []).map(u => normId(u?._id)).filter(Boolean);

  //   const cache = thumbsCacheRef.current;
  //   const missing = ids.filter(id => !cache[id]);

  //   if (missing.length === 0) {
  //     setThumbByUserId({ ...cache });
  //     return;
  //   }

  //   const resp = await profilePhotoGetBatch(
  //     { userIds: missing, size: "thumb" },
  //     token,
  //     signal
  //   );

  //   if (resp?.error) return;

  //   const photos = resp?.photos || {};
  //   let changed = false;

  //   for (const id of missing) {
  //     const dataUrl = extractDataUrl(photos?.[id]);
  //     if (dataUrl && cache[id] !== dataUrl) {
  //       cache[id] = dataUrl;
  //       changed = true;
  //     }
  //   }

  //   // siempre copia
  //   setThumbByUserId({ ...cache });
  //   return changed;
  // }, []);

  // =========================
  // EFFECTS
  // =========================

  // auto-seleccionar responsabilidad si solo hay una (no root/global)
  useEffect(() => {
    if (isRootOrGlobal) return;

    if (!listResponsability || listResponsability.length === 0) {
      setSelectedResponsibility(null);
      return;
    }

    if (listResponsability.length === 1) {
      const item = listResponsability[0];
      if (item.isProgramResponsible) {
        setSelectedResponsibility(JSON.stringify({ type: "program", programId: item.idProgram }));
      } else if (item.isDeviceResponsible || item.isDeviceCoordinator) {
        setSelectedResponsibility(JSON.stringify({
          type: "device",
          programId: item.idProgram,
          deviceId: item.dispositiveId,
        }));
      }
    }
  }, [isRootOrGlobal, listResponsability]);

  // cargar usuarios
  useEffect(() => {
    if (!logged?.isLoggedIn) return;
    loadUsers(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logged?.isLoggedIn, debouncedFilters, page, limit, selectedResponsibility]);

  // // cargar thumbs (sin IIFE rara)
  // useEffect(() => {
  //   if (!logged?.isLoggedIn) return;
  //   if (!users?.length) return;

  //   const ac = new AbortController();

  //   loadThumbsForUsers(users, ac.signal).catch(() => {});
  //   return () => ac.abort();
  // }, [users, logged?.isLoggedIn, loadThumbsForUsers]);

  // =========================
  // MEMOS
  // =========================
  const { activeUsers, onLeaveUsers } = useMemo(() => {
    const active = [];
    const leave = [];

    for (const u of users) (u.isOnLeave ? leave : active).push(u);

    const sortByName = (a, b) =>
      (a.lastName || '').localeCompare(b.lastName || '', 'es', { sensitivity: 'base' }) ||
      (a.firstName || '').localeCompare(b.firstName || '', 'es', { sensitivity: 'base' });

    active.sort(sortByName);
    leave.sort(sortByName);

    return { activeUsers: active, onLeaveUsers: leave };
  }, [users]);

  // =========================
  // HANDLERS
  // =========================
  const handleSelectResponsibility = (e) => {
    const value = e.target.value || null;
    setSelectedResponsibility(value);
    setPage(1);
    setUserSelected(null);
  };

  const handlePageChange = useCallback((newPage) => setPage(newPage), []);
  const handleLimitChange = useCallback((event) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(1);
  }, []);

  const handleFilterChange = useCallback((event) => {
    setPage(1);
    setUserSelected(null);
    const { name, value } = event.target;

    if (apafaUser === 'no') {
      setFilters((prev) => ({ ...prev, [name]: value || '' }));
    } else if (apafaUser === 'si' && name !== 'apafa') {
      setFilters((prev) => ({ ...prev, [name]: value || '' }));
    }
  }, [apafaUser]);

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
      position: '',
    });
  }, [apafaUser]);

  const closeModal = () => setIsModalOpen(false);
  const openModal = () => setIsModalOpen(true);

  const changeUserLocally = (updatedUser) => {
    setUsers((prev) => {
      let found = false;

      const next = prev.map((u) => {
        if (u._id === updatedUser._id) {
          found = true;
          return {
            ...u,
            ...updatedUser,
            hasPendingRequests:
              typeof updatedUser.hasPendingRequests === "boolean"
                ? updatedUser.hasPendingRequests
                : u.hasPendingRequests,
            isOnLeave:
              typeof updatedUser.isOnLeave === "boolean"
                ? updatedUser.isOnLeave
                : u.isOnLeave,
          };
        }
        return u;
      });

      if (!found && updatedUser._id) next.push(updatedUser);
      return next;
    });

    setUserSelected(updatedUser);

    // // si cambia la foto → invalida cache + recarga
    // if (updatedUser?.photoProfile?.thumb || updatedUser?.photoProfile?.normal) {
    //   const id = normId(updatedUser._id);
    //   delete thumbsCacheRef.current[id];
    //   refreshThumbForUser(id);
    // }
  };

  // =========================
  // XLS
  // =========================
  const getUserNotLimit = async () => {
    try {
      charge(true);
      const token = getToken();
      let auxFilters = { ...debouncedFilters };

      for (let key in auxFilters) {
        if (auxFilters[key] === "") delete auxFilters[key];
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
      if (!data?.users?.length) throw new Error("No se recibieron datos de usuarios");

      return data.users;
    } catch (err) {
      modal("Error", "Error al obtener usuarios o generar Excel");
    } finally {
      charge(false);
    }
  };

  const openXlsForm = async () => {
    const userAll = await getUserNotLimit();
    setUsersXls(userAll);
  };

  // =========================
  // MENÚ LATERAL
  // =========================
  const menuConfig = {
    "mis-datos": [
      (user) => (
        <InfoEmployer
          listResponsability={listResponsability}
          key="info"
          user={user}
          modal={modal}
          charge={charge}
          enumsData={enumsData}
          chargeUser={() => loadUsers(true)}
          changeUser={(x) => changeUserLocally(x)}
        />
      ),
    ],
    "resp-coord": [
      (user) => (
        <ResponsabilityAndCoordination
          key="resp-coord"
          user={user}
          modal={modal}
          charge={charge}
          enumsData={enumsData}
        />
      ),
    ],
    "documentacion": [
      (user) => (
        <DocumentMiscelaneaGeneric
          key="docs"
          data={user}
          modelName="User"
          modal={modal}
          charge={charge}
          authorized={true}
          enumsData={enumsData}
          categoryFiles={enumsData.categoryFiles}
          officialDocs={enumsData.documentation.filter((x) => x.model === "User")}
          onChange={(x) => changeUserLocally(x)}
        />
      ),
    ],
    "nominas": [
      (user) => (
        <Payrolls
          key="payrolls"
          user={user}
          modal={modal}
          charge={charge}
          listResponsability={listResponsability}
          changeUser={(x) => changeUserLocally(x)}
        />
      ),
    ],
    "vacaciones": [
      (user) => (
        <VacationDays
          key="vac"
          user={user}
          modal={modal}
          charge={charge}
          changeUser={(x) => changeUserLocally(x)}
        />
      ),
    ],
    "contratos": [
      (user) => (
        <HiringPeriodsV2
          key="hiring"
          user={user}
          modal={modal}
          charge={charge}
          enumsData={enumsData}
          chargeUser={() => loadUsers(true)}
          changeUser={(x) => changeUserLocally(x)}
        />
      ),
    ],
    "solicitudes": [
      (user) => (
        <SupervisorChangeRequests
          key="scr"
          changeUserLocally={changeUserLocally}
          userId={user._id}
          approverId={logged.user._id}
          modal={modal}
          charge={charge}
          enumsData={enumsData}
          onUserUpdated={(u) => changeUserLocally(u)}
        />
      ),
    ],
    "preferencias": [
      (user) => (
        <PreferentsEmployee
          key="pref"
          user={user}
          modal={modal}
          charge={charge}
          enumsData={enumsData}
          authorized={logged.user._id}
        />
      ),
    ],
  };

  // =========================
  // RENDER HELPERS
  // =========================
  const renderUserRow = (user) => {
    const rowClass = user.isOnLeave
      ? `${styles.tableContainer} ${styles.isOnLeave}`
      : styles.tableContainer;

    const id = normId(user._id);
    // const thumbUrl = thumbByUserId[id];

    return (
      <div className={styles.containerEmployer} key={id}>
        <div>
          <div
            className={rowClass}
            onClick={() =>
              !userSelected || normId(userSelected._id) !== id
                ? setUserSelected(user)
                : setUserSelected(null)
            }
          >
          {/* <div className={styles.tableCellPhoto}>
            <img
              src={thumbUrl || perfil92}
              alt=""
              className={styles.photoThumb}
              loading="lazy"
              decoding="async"
              onError={(e) => {
                // si la URL del usuario falla, ponemos el placeholder
                e.currentTarget.src = perfil92;
              }}
            />
          </div> */}

            <div className={styles.tableCell}>{user.firstName}</div>
            <div className={styles.tableCell}>{user.lastName}</div>
            <div className={styles.tableCell}>
              {user.hasPendingRequests && <FaBell color="tomato" />}
            </div>
            <div className={styles.tableCellStatus}>{user.employmentStatus}</div>
          </div>

          {userSelected && normId(userSelected._id) === id && (
            <div className={styles.contenedorEmployer}>
              <MenuOptionsEmployee
                options={Object.keys(menuConfig)}
                current={selectOptionMenuEmployee}
                onSelect={setselectOptionMenuEmployee}
              />
              {menuConfig[selectOptionMenuEmployee]?.map((Render) => Render(userSelected))}
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

  // =========================
  // RESTRICCIONES POR ROL
  // =========================
  if (!isRootOrGlobal) {
    if (!listResponsability?.length) {
      return (
        <div className={styles.contenedor}>
          <div className={styles.contenido}>
            <h2>No tienes programas o dispositivos asignados.</h2>
          </div>
        </div>
      );
    }

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
                <option key={i} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>
        </div>
      );
    }

    if (!selectedResponsibility) return null;
  }

  // =========================
  // RENDER
  // =========================
  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <>
          <div className={styles.titulo}>
            <div>
              <h2>GESTIÓN DE EMPLEADOS</h2>
              {isRootOrGlobal && <FaSquarePlus onClick={openModal} />}
              <TbFileTypeXml onClick={openXlsForm} />

              {!!userXLS && (
                <CreateDocumentXLS
                  users={userXLS}
                  enumsData={enumsData}
                  closeXls={() => setUsersXls(null)}
                  modal={modal}
                />
              )}

              {isRootOrGlobal && (
                <RiUserSharedFill
                  onClick={() => setIsRelocateOpen(true)}
                  style={{ cursor: "pointer", marginLeft: "10px" }}
                  title="Reubicar personal"
                />
              )}

              {isRelocateOpen && (
                <RelocateHiringsModal
                  enumsData={enumsData}
                  modal={modal}
                  charge={charge}
                  close={() => setIsRelocateOpen(false)}
                  onSuccess={() => loadUsers(true)}
                  resetFilters={resetFilters}
                />
              )}

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
                  <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                    {'<'}
                  </button>
                  <span>Página {page}</span>
                  <button onClick={() => handlePageChange(page + 1)} disabled={page === totalPages}>
                    {'>'}
                  </button>
                </div>
              </div>
            ) : (
              <div className={styles.cajaSeleccionActiva}>
                <h4>Activo</h4>
                <select onChange={handleSelectResponsibility} value={selectedResponsibility || ""}>
                  {getResponsibilityOptions().map((opt, i) => (
                    <option key={i} value={opt.value}>{opt.label}</option>
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
                listResponsability={listResponsability}
              />
            ) : (
              <FilterStatus
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
                  <div className={styles.tableCellCenter}>Peticiones</div>
                  <div className={styles.tableCellStatus}>Status</div>
                </div>

                {activeUsers.map(renderUserRow)}

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
