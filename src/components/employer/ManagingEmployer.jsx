import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import styles from '../styles/ManagingEmployer.module.css';
import { FaSquarePlus, FaBell } from "react-icons/fa6";
import { RiUserSharedFill } from 'react-icons/ri';
import { TbFileTypeXml } from "react-icons/tb";

import Filters from "./Filters";

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
import SesameEmployeeContext from '../sesame/SesameEmployeeContext.jsx';

import perfil92 from "../../assets/perfil_92.png";

const ManagingEmployer = ({ modal, charge, listResponsability = [], enumsData }) => {
  const { logged } = useLogin();
  const loggedUser = logged?.user || {};
  const role = loggedUser?.role;

  const isRootOrGlobal = role === 'root' || role === 'global' || role === 'rrhh';

  const apafaUser =
    loggedUser?.apafa === false ||
    loggedUser?._id === '67d80ef5f093b4a61894b881' ||
    role === 'root'
      ? 'no'
      : 'si';

  const [userSelected, setUserSelected] = useState(null);
  const [isRelocateOpen, setIsRelocateOpen] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectOptionMenuEmployee, setselectOptionMenuEmployee] = useState('mis-datos');

  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  const [users, setUsers] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [userXLS, setUsersXls] = useState(null);

  const [filters, setFilters] = useState({
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
    workSchedule: '',
    gender: '',
    fostered: '',
    disability: '',
    role: '',
  });

  const debouncedFilters = useDebounce(filters, 300);

  const thumbsCacheRef = useRef({});
  const [thumbByUserId, setThumbByUserId] = useState({});

  const normId = (id) => String(id || '');

  const refId = (value) => {
    if (!value) return '';
    if (typeof value === 'object') return String(value._id || value.id || '');
    return String(value);
  };

  const extractDataUrl = (photoValue) => {
    if (!photoValue) return '';
    if (typeof photoValue === 'string') return photoValue;
    return photoValue?.dataUrl || '';
  };

  const userScope = useMemo(() => {
    const fullProgramIds = new Set();
    const visibleProgramIds = new Set();
    const allowedDeviceIds = new Set();

    listResponsability.forEach((item) => {
      const programId = item?.idProgram ? String(item.idProgram) : '';
      const deviceId = item?.dispositiveId ? String(item.dispositiveId) : '';

      const fullProgramAccess =
        item?.isProgramResponsible ||
        item?.isProgramCoordinator ||
        item?.isProgramSupervisor;

      const deviceAccess =
        item?.isDeviceResponsible ||
        item?.isDeviceCoordinator ||
        item?.isDeviceSupervisor;

      if (fullProgramAccess && programId) {
        fullProgramIds.add(programId);
        visibleProgramIds.add(programId);
      }

      if (deviceAccess && deviceId) {
        allowedDeviceIds.add(deviceId);
        if (programId) visibleProgramIds.add(programId);
      }
    });

    return {
      fullProgramIds: [...fullProgramIds],
      visibleProgramIds: [...visibleProgramIds],
      allowedDeviceIds: [...allowedDeviceIds],
    };
  }, [listResponsability]);

  const getAllowedDeviceIdsForFilters = useCallback((currentFilters = {}) => {
    if (isRootOrGlobal) return [];

    const dispositives = Object.entries(enumsData?.dispositiveIndex || {}).map(([id, d]) => ({
      _id: id,
      ...d,
    }));

    return dispositives
      .filter((d) => {
        const deviceId = String(d?._id || '');
        const programId = refId(d?.program);
        const provinceId = refId(d?.province);

        if (currentFilters.programId && String(currentFilters.programId) !== programId) return false;
        if (currentFilters.provinces && String(currentFilters.provinces) !== provinceId) return false;
        if (currentFilters.dispositive && String(currentFilters.dispositive) !== deviceId) return false;

        if (userScope.fullProgramIds.includes(programId)) return true;

        return userScope.allowedDeviceIds.includes(deviceId);
      })
      .map((d) => String(d._id));
  }, [
    isRootOrGlobal,
    enumsData?.dispositiveIndex,
    userScope.fullProgramIds,
    userScope.allowedDeviceIds,
  ]);

  const cleanFilters = useCallback((sourceFilters = {}) => {
    const auxFilters = { ...sourceFilters };

    Object.keys(auxFilters).forEach((key) => {
      if (auxFilters[key] === '' || auxFilters[key] === undefined || auxFilters[key] === null) {
        delete auxFilters[key];
      }
    });

    return auxFilters;
  }, []);

  const applyScopeToFilters = useCallback((sourceFilters = {}) => {
    const auxFilters = cleanFilters(sourceFilters);

    if (isRootOrGlobal) return auxFilters;

    const allowedDeviceIds = getAllowedDeviceIdsForFilters(auxFilters);

    if (!allowedDeviceIds.length) return null;

    if (auxFilters.dispositive) {
      if (!allowedDeviceIds.includes(String(auxFilters.dispositive))) return null;
      return auxFilters;
    }

    auxFilters.allowedDispositiveIds = allowedDeviceIds;
    return auxFilters;
  }, [cleanFilters, getAllowedDeviceIdsForFilters, isRootOrGlobal]);

  const loadUsers = useCallback(async (params = {}) => {
    const options = typeof params === 'boolean'
      ? {
          showLoader: params,
          currentFilters: debouncedFilters,
          currentPage: page,
          currentLimit: limit,
        }
      : {
          showLoader: params.showLoader ?? false,
          currentFilters: params.currentFilters ?? debouncedFilters,
          currentPage: params.currentPage ?? page,
          currentLimit: params.currentLimit ?? limit,
        };

    const { showLoader, currentFilters, currentPage, currentLimit } = options;

    if (showLoader) charge(true);

    try {
      const token = getToken();
      const auxFilters = applyScopeToFilters(currentFilters);

      if (!auxFilters) {
        setUsers([]);
        setTotalPages(0);
        return;
      }

      const data = await getusers(currentPage, currentLimit, auxFilters, token);

      if (data.error) {
        modal("Error", data.message);
        return;
      }

      const normalizedUsers = (data.users || []).map((user) => ({
        ...user,
        firstName: capitalizeWords(user.firstName),
        lastName: capitalizeWords(user.lastName),
      }));

      setUsers(normalizedUsers);
      setTotalPages(data.totalPages || 0);
    } catch (error) {
      modal('Error', error.message || 'Ocurrió un error inesperado.');
    } finally {
      if (showLoader) charge(false);
    }
  }, [
    debouncedFilters,
    page,
    limit,
    applyScopeToFilters,
  ]);

  const refreshThumbForUser = useCallback(async (userId) => {
    try {
      const token = getToken();
      const id = normId(userId);
      const resp = await profilePhotoGetBatch({ userIds: [id], size: "thumb" }, token);

      if (resp?.error) return;

      const dataUrl = extractDataUrl(resp?.photos?.[id]);
      if (!dataUrl) return;

      thumbsCacheRef.current[id] = dataUrl;
      setThumbByUserId((prev) => ({ ...prev, [id]: dataUrl }));
    } catch {}
  }, []);

  const loadThumbsForUsers = useCallback(async (usersList, signal) => {
    const token = getToken();
    const ids = (usersList || []).map((u) => normId(u?._id)).filter(Boolean);
    const cache = thumbsCacheRef.current;
    const missing = ids.filter((id) => !cache[id]);

    if (!missing.length) {
      setThumbByUserId({ ...cache });
      return;
    }

    const resp = await profilePhotoGetBatch({ userIds: missing, size: "thumb" }, token, signal);
    if (resp?.error) return;

    const photos = resp?.photos || {};

    missing.forEach((id) => {
      const dataUrl = extractDataUrl(photos?.[id]);
      if (dataUrl) cache[id] = dataUrl;
    });

    setThumbByUserId({ ...cache });
  }, []);

  useEffect(() => {
    setFilters((prev) => {
      if (prev.apafa === apafaUser) return prev;
      return { ...prev, apafa: apafaUser };
    });
  }, [apafaUser]);

useEffect(() => {
  if (!logged?.isLoggedIn) return;

  loadUsers({
    showLoader: true,
    currentFilters: debouncedFilters,
    currentPage: page,
    currentLimit: limit,
  });
}, [logged?.isLoggedIn, debouncedFilters, page, limit, loadUsers]);

  useEffect(() => {
    if (!logged?.isLoggedIn || !users?.length) return;

    const ac = new AbortController();
    loadThumbsForUsers(users, ac.signal).catch(() => {});
    return () => ac.abort();
  }, [users, logged?.isLoggedIn, loadThumbsForUsers]);

  const { activeUsers, onLeaveUsers } = useMemo(() => {
    const active = [];
    const leave = [];

    users.forEach((u) => {
      if (u.isOnLeave) leave.push(u);
      else active.push(u);
    });

    const sortByName = (a, b) =>
      (a.lastName || '').localeCompare(b.lastName || '', 'es', { sensitivity: 'base' }) ||
      (a.firstName || '').localeCompare(b.firstName || '', 'es', { sensitivity: 'base' });

    active.sort(sortByName);
    leave.sort(sortByName);

    return { activeUsers: active, onLeaveUsers: leave };
  }, [users]);

  const handlePageChange = useCallback((newPage) => setPage(newPage), []);

  const handleLimitChange = useCallback((event) => {
    setLimit(parseInt(event.target.value, 10));
    setPage(1);
  }, []);

const handleFilterChange = useCallback((eventOrPatch) => {
  setPage(1);
  setUserSelected(null);

  const name = eventOrPatch?.target?.name ?? eventOrPatch?.name;
  const value = eventOrPatch?.target?.value ?? eventOrPatch?.value ?? '';
  const patch = eventOrPatch?.patch;

  if (patch) {
    setFilters((prev) => {
      const next = { ...prev, ...patch };

      if (apafaUser === 'si') next.apafa = prev.apafa;

      Object.keys(next).forEach((key) => {
        if (next[key] === undefined || next[key] === null) next[key] = '';
      });

      return next;
    });

    return;
  }

  if (!name) return;
  if (apafaUser === 'si' && name === 'apafa') return;

  setFilters((prev) => {
    const next = { ...prev, [name]: value || '' };

    if (name === 'programId' || name === 'provinces') {
      next.dispositive = '';
    }

    return next;
  });
}, [apafaUser]);



  const resetFilters = useCallback(() => {
    setPage(1);
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
      workSchedule: '',
      gender: '',
      fostered: '',
      disability: '',
      role: '',
    });
  }, [apafaUser]);

  const closeModal = () => setIsModalOpen(false);
  const openModal = () => setIsModalOpen(true);

  const changeUserLocally = (updatedUser) => {
    setUsers((prev) => {
      let found = false;

      const next = prev.map((u) => {
        if (u._id !== updatedUser._id) return u;

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
      });

      if (!found && updatedUser._id) next.push(updatedUser);
      return next;
    });

    setUserSelected(updatedUser);

    if (updatedUser?.photoProfile?.thumb || updatedUser?.photoProfile?.normal) {
      const id = normId(updatedUser._id);
      delete thumbsCacheRef.current[id];
      refreshThumbForUser(id);
    }
  };

  const getUserNotLimit = async () => {
    try {
      charge(true);

      const token = getToken();
      const auxFilters = applyScopeToFilters(debouncedFilters);

      if (!auxFilters) throw new Error("No tienes dispositivos asignados");

      const data = await getusersnotlimit(auxFilters, token);
      if (!data?.users?.length) throw new Error("No se recibieron datos de usuarios");

      return data.users;
    } catch {
      modal("Error", "Error al obtener usuarios o generar Excel");
      return null;
    } finally {
      charge(false);
    }
  };

  const openXlsForm = async () => {
    const userAll = await getUserNotLimit();
    if (userAll) setUsersXls(userAll);
  };

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
          changeUser={changeUserLocally}
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
          onChange={changeUserLocally}
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
          changeUser={changeUserLocally}
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
          changeUser={changeUserLocally}
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
          changeUser={changeUserLocally}
        />
      ),
    ],
    "solicitudes": [
      (user) => (
        <SupervisorChangeRequests
          key="scr"
          changeUserLocally={changeUserLocally}
          userId={user._id}
          approverId={loggedUser._id}
          modal={modal}
          charge={charge}
          enumsData={enumsData}
          onUserUpdated={changeUserLocally}
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
          authorized={loggedUser._id}
        />
      ),
    ],
    "controltime": [
      (user) => (
        <SesameEmployeeContext
          key="sesame"
          user={user}
          modal={modal}
          charge={charge}
          enumsData={enumsData}
          changeUser={changeUserLocally}
        />
      ),
    ],
  };



  const renderUserRow = (user) => {
    const id = normId(user._id);
    const thumbUrl = thumbByUserId[id];

    const rowClass = user.isOnLeave
      ? `${styles.tableContainer} ${styles.isOnLeave}`
      : styles.tableContainer;

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
            <div className={styles.tableCellPhoto}>
              <img
                src={thumbUrl || perfil92}
                alt=""
                className={styles.photoThumb}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.currentTarget.src = perfil92;
                }}
              />
            </div>

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

        {role === 'root' && !userSelected && (
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

  if (!isRootOrGlobal && !userScope.visibleProgramIds.length && !userScope.allowedDeviceIds.length) {
    return (
      <div className={styles.contenedor}>
        <div className={styles.contenido}>
          <h2>No tienes programas o dispositivos asignados.</h2>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>GESTIÓN DE EMPLEADOS</h2>

            {(role === 'rrhh' || role === 'root') && <FaSquarePlus onClick={openModal} />}

            <TbFileTypeXml onClick={openXlsForm} />

            {!!userXLS && (
              <CreateDocumentXLS
                users={userXLS}
                enumsData={enumsData}
                closeXls={() => setUsersXls(null)}
                modal={modal}
              />
            )}

            {(role === 'rrhh' || role === 'root') && (
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
                selectedResponsibility={null}
                enumsData={enumsData}
                modal={modal}
                charge={charge}
                closeModal={closeModal}
                chargeUser={() => loadUsers(true)}
                changeUser={changeUserLocally}
              />
            )}
          </div>
        </div>

        <div className={styles.caja}>
          <Filters
            filters={filters}
            enums={enumsData}
            handleFilterChange={handleFilterChange}
            resetFilters={resetFilters}
            isRootOrGlobal={isRootOrGlobal}
            userScope={userScope}
          />

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

              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || totalPages === 0}
              >
                {'>'}
              </button>
            </div>
          </div>

          <div className={styles.containerTableContainer}>
            <div>
              <div className={styles.tableContainer} id={styles.cabeceraTabla}>
                <div className={styles.tableCellPhoto}></div>
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
      </div>
    </div>
  );
};

export default ManagingEmployer;