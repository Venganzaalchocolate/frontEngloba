// src/components/permissions/PermissionsProfile.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/permissions.module.css";
import { getToken } from "../../lib/serviceToken";

import {
  // PROFILES
  permissionProfileList,
  permissionProfileToggle,
  permissionProfileDeleteHard,

  // asignar a usuario
  searchusername,
  userProfileAssignmentUpsert,
  userProfileAssignmentList,
  userProfileAssignmentDeleteHard,
  userProfileAssignmentUpdate,

  // asignar a alcance (links)
  scopeProfileLinkList,
  scopeProfileLinkUpsert,
  scopeProfileLinkDeleteHard,
  scopeProfileLinkUpdate,
} from "../../lib/data";

import {
  FRONT_MODULE_LABELS,
  MODULE_ACTION_LABELS,
  RESOURCE_TYPES,
  RESOURCE_ROLES,
  RESOURCE_TYPE_LABEL,
  RESOURCE_ROLE_LABEL,
} from "./permissionsLabels";

import ModalConfirmation from "../globals/ModalConfirmation";
import ModalForm from "../globals/ModalForm";
import FormPermissionProfile from "./FormPermissionProfile.jsx";

const asBool = (v) => (v === "true" ? true : v === "false" ? false : undefined);
const normId = (v) => String(v || "");
const isoDay = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");

function useRun(charge, setError) {
  return useCallback(
    async (fn) => {
      charge?.(true);
      setError("");
      return Promise.resolve()
        .then(fn)
        .catch((e) => {
          setError(e?.message || "Error");
          throw e;
        })
        .finally(() => charge?.(false));
    },
    [charge, setError]
  );
}

const toUserOption = (u) => {
  const id = String(u?._id || "");
  const name = `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || "—";
  const email = u?.email ? ` · ${u.email}` : "";
  return { value: id, label: `${name}${email}` };
};

export default function PermissionsProfile({ modal, charge, enumsData }) {
  // -------------------- LIST FILTERS --------------------
  const [q, setQ] = useState("");
  const [active, setActive] = useState("all");
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

  // filtro usuario (modal propio)
  const [filterUserOpen, setFilterUserOpen] = useState(false);
  const openFilterUser = useCallback(() => setFilterUserOpen(true), []);
  const closeFilterUser = useCallback(() => setFilterUserOpen(false), []);

  const [filterUser, setFilterUser] = useState(null); // {value,label}|null
  const filterUserId = String(filterUser?.value || "").trim();
  const [userCandidatesById, setUserCandidatesById] = useState({});

  // -------------------- UI STATE --------------------
  const [openId, setOpenId] = useState(null);
  const toggleOpen = useCallback((id) => setOpenId((prev) => (prev === id ? null : id)), []);

  const [error, setError] = useState("");
  const run = useRun(charge, setError);

  const [list, setList] = useState({
    items: [],
    page: 1,
    limit: 25,
    total: 0,
    pages: 1,
    loading: false,
  });

  // create/edit perfil
  const [formOpen, setFormOpen] = useState(false);
  const [editingProfile, setEditingProfile] = useState(null);
  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditingProfile(null);
  }, []);

  // confirm
  const [confirm, setConfirm] = useState({
    open: false,
    title: "",
    message: "",
    tone: "danger",
    onConfirm: null,
  });
  const closeConfirm = useCallback(
    () => setConfirm({ open: false, title: "", message: "", tone: "danger", onConfirm: null }),
    []
  );

  // modal asignar usuario (distinto al filtro)
  const [assignUserOpen, setAssignUserOpen] = useState(false);
  const [assignProfile, setAssignProfile] = useState(null);
  const openAssignUser = useCallback((profileDoc) => {
    setAssignProfile(profileDoc || null);
    setAssignUserOpen(true);
  }, []);
  const closeAssignUser = useCallback(() => {
    setAssignUserOpen(false);
    setAssignProfile(null);
  }, []);

  // modal asignar alcance
  const [assignScopeOpen, setAssignScopeOpen] = useState(false);
  const [assignScopeProfile, setAssignScopeProfile] = useState(null);
  const openAssignScope = useCallback((profileDoc) => {
    setAssignScopeProfile(profileDoc || null);
    setAssignScopeOpen(true);
  }, []);
  const closeAssignScope = useCallback(() => {
    setAssignScopeOpen(false);
    setAssignScopeProfile(null);
  }, []);

  // cache detalles por perfil (usuarios + links)
  const [detailsByProfile, setDetailsByProfile] = useState({});

  // -------------------- OPTIONS --------------------
  const provincesOptions = useMemo(() => {
    const idx =
      enumsData?.provincesIndex && typeof enumsData.provincesIndex === "object"
        ? enumsData.provincesIndex
        : {};

    const opts = Object.entries(idx)
      .map(([id, v]) => ({
        value: String(id),
        label: v?.name || v?.label || v?.title || String(id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    return [{ value: "__ALL__", label: "Todas las provincias" }, ...opts];
  }, [enumsData]);

  // evita openId inválido al recargar lista
  useEffect(() => {
    if (!openId) return;
    const exists = Array.isArray(list.items) && list.items.some((x) => x?._id === openId);
    if (!exists) setOpenId(null);
  }, [list.items, openId]);

  // -------------------- ASYNC USER OPTIONS --------------------
  const loadUserOptions = useCallback(async (inputValue) => {
    const q = String(inputValue || "").trim();
    if (!q || q.length < 3) return [];

    const token = getToken();
    const res = await searchusername({ query: q }, token);
    if (!res || res?.error) return [];

    const users = Array.isArray(res) ? res : (res?.users || res?.items || []);
    const opts = users.filter((u) => u?._id).map(toUserOption);

    // cachea para resolver label por id después
    setUserCandidatesById((prev) => {
      const next = { ...prev };
      for (const u of users) {
        const id = String(u?._id || "");
        if (!id) continue;
        next[id] = { label: toUserOption(u).label, user: u };
      }
      return next;
    });

    return opts;
  }, []);

  const userSelectFields = useMemo(
    () => [
      {
        name: "userId",
        label: "Usuario",
        type: "async-search-select",
        placeholder: "Escribe al menos 3 letras…",
        required: true,
        loadOptions: loadUserOptions,
      },
    ],
    [loadUserOptions]
  );

  const assignScopeFields = useMemo(() => {
    const typeOpts = (RESOURCE_TYPES || []).map((t) => ({
      value: t,
      label: RESOURCE_TYPE_LABEL?.[t] || t,
    }));

    const roleOpts = (RESOURCE_ROLES || []).map((r) => ({
      value: r,
      label: RESOURCE_ROLE_LABEL?.[r] || r,
    }));

    return [
      { name: "resourceType", label: "Tipo de recurso", type: "select", required: true, defaultValue: "", options: typeOpts },
      { name: "role", label: "Rol", type: "select", required: true, defaultValue: "", options: roleOpts },
      {
        name: "provinceId",
        label: "Provincia (opcional)",
        type: "select",
        required: true,
        defaultValue: "__ALL__",
        options: provincesOptions,
        searchable: true,
      },
      {
        name: "active",
        label: "Activa",
        type: "select",
        required: true,
        defaultValue: "si",
        options: [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ],
      },
      { name: "note", label: "Nota (opcional)", type: "textarea", required: false, defaultValue: "", capsGuard: true },
    ];
  }, [provincesOptions]);

  // -------------------- FILTER USER: SUBMIT --------------------
  const handleFilterUserSubmit = useCallback((formData) => {
    const raw = formData?.userId;

    const userId =
      typeof raw === "object" ? String(raw?.value || "") : String(raw || "");

    if (!userId) {
      modal?.("Error", "Selecciona un usuario.");
      return;
    }

    const labelFromCache = userCandidatesById?.[userId]?.label;

    setFilterUser({
      value: userId,
      label: labelFromCache || userId, // fallback
    });

    closeFilterUser();
  }, [closeFilterUser, userCandidatesById, modal]);

  // cuando cambias el filtro usuario, resetea page
  useEffect(() => {
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterUserId]);

  // -------------------- LIST LOAD --------------------
  const loadProfileIdsForUser = useCallback(async (userId) => {
    if (!userId) return new Set();
    const token = getToken();

    const res = await userProfileAssignmentList({ userId, page: 1, limit: 2000, active: undefined }, token);
    if (!res || res?.error) throw new Error(res?.message || "Error cargando asignaciones del usuario");

    const items = Array.isArray(res.items) ? res.items : [];
    return new Set(
      items
        .map((a) => String(a?.profileId?._id || a?.profileId || ""))
        .filter(Boolean)
    );
  }, []);

  const loadList = useCallback(
    async (showLoader = false) => {
      const token = getToken();
      const payloadBase = {
        q: (q || "").trim() || undefined,
        active: active === "all" ? undefined : asBool(active),
      };

      const exec = async () => {
        setList((s) => ({ ...s, loading: true }));

        // sin filtro usuario: backend paginado normal
        if (!filterUserId) {
          const res = await permissionProfileList({ ...payloadBase, page, limit }, token);
          if (!res || res?.error) throw new Error(res?.message || "Error cargando perfiles");

          setList({
            items: Array.isArray(res.items) ? res.items : [],
            page: res.page || page,
            limit: res.limit || limit,
            total: res.total || 0,
            pages: res.pages || 1,
            loading: false,
          });
          return;
        }

        // con filtro usuario: filtrado frontend
        const profileIds = await loadProfileIdsForUser(filterUserId);

        if (!profileIds.size) {
          setList({ items: [], page: 1, limit, total: 0, pages: 1, loading: false });
          return;
        }

        const resAll = await permissionProfileList({ ...payloadBase, page: 1, limit: 2000 }, token);
        if (!resAll || resAll?.error) throw new Error(resAll?.message || "Error cargando perfiles");

        const all = Array.isArray(resAll.items) ? resAll.items : [];
        const filtered = all.filter((p) => profileIds.has(String(p?._id || "")));

        const total = filtered.length;
        const pages = Math.max(1, Math.ceil(total / Math.max(1, Number(limit) || 25)));
        const safePage = Math.min(Math.max(1, Number(page) || 1), pages);

        const start = (safePage - 1) * limit;
        const slice = filtered.slice(start, start + limit);

        setList({ items: slice, page: safePage, limit, total, pages, loading: false });
      };

      if (showLoader) return run(exec);
      return Promise.resolve().then(exec).catch((e) => setError(e?.message || "Error"));
    },
    [q, active, page, limit, filterUserId, run, loadProfileIdsForUser]
  );

  useEffect(() => {
    loadList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, active, page, limit, filterUserId]);

  // -------------------- CRUD PERFIL --------------------
  const openCreate = useCallback(() => {
    setEditingProfile(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((doc) => {
    setEditingProfile(doc);
    setFormOpen(true);
  }, []);

  const requestToggle = useCallback(
    (doc) => {
      const id = normId(doc?._id);
      if (!id) return;
      const next = !(doc?.active !== false);

      setConfirm({
        open: true,
        title: next ? "Activar perfil" : "Desactivar perfil",
        message: `${next ? "Se activará" : "Se desactivará"} el perfil "${doc?.name || "—"}" y se sincronizarán usuarios afectados.`,
        tone: "warning",
        onConfirm: async () => {
          closeConfirm();
          await run(async () => {
            const token = getToken();
            const res = await permissionProfileToggle({ id, active: next }, token);
            if (!res || res?.error) throw new Error(res?.message || "Error en toggle");
          });
          await loadList(false);
        },
      });
    },
    [run, closeConfirm, loadList]
  );

  const requestDelete = useCallback(
    (doc) => {
      const id = normId(doc?._id);
      if (!id) return;

      setConfirm({
        open: true,
        title: "Eliminar perfil",
        message: `Se eliminará el perfil "${doc?.name || "—"}" y se sincronizarán usuarios afectados. Esta acción no se puede deshacer.`,
        tone: "danger",
        onConfirm: async () => {
          closeConfirm();
          await run(async () => {
            const token = getToken();
            const res = await permissionProfileDeleteHard({ id }, token);
            if (!res || res?.error) throw new Error(res?.message || "Error eliminando perfil");
          });
          await loadList(false);
        },
      });
    },
    [run, closeConfirm, loadList]
  );

  // -------------------- ASSIGN USER TO PROFILE --------------------
  const handleAssignUserSubmit = useCallback(
    async (formData) => {
      const profileId = normId(assignProfile?._id);
      const userOpt = formData?.userId;
      const userId = typeof userOpt === "object" ? String(userOpt?.value || "") : normId(userOpt);

      if (!profileId) return modal?.("Error", "No hay perfil seleccionado.");
      if (!userId) return modal?.("Error", "Selecciona un usuario.");

      await run(async () => {
        const token = getToken();
        const res = await userProfileAssignmentUpsert({ userId, profileId, active: true, expiresAt: null, note: "" }, token);
        if (!res || res?.error) throw new Error(res?.message || "No se pudo asignar el perfil");
      });

      modal?.("Éxito", "Perfil asignado al usuario.");
      closeAssignUser();
      await loadUsersForProfile(profileId, { reset: true });
    },
    [assignProfile, modal, run, closeAssignUser]
  );

  // -------------------- ASSIGN SCOPE LINK --------------------
  const handleAssignScopeSubmit = useCallback(
    async (formData) => {
      const profileId = normId(assignScopeProfile?._id);
      if (!profileId) return modal?.("Error", "No hay perfil seleccionado.");

      const resourceType = String(formData?.resourceType || "").trim();
      const role = String(formData?.role || "").trim();
      const provinceIdRaw = String(formData?.provinceId || "").trim();

      if (!resourceType) return modal?.("Error", "Selecciona el tipo de recurso.");
      if (!role) return modal?.("Error", "Selecciona el rol.");

      const payload = {
        resourceType,
        role,
        provinceId: !provinceIdRaw || provinceIdRaw === "__ALL__" ? null : provinceIdRaw,
        profileId,
        active: String(formData?.active) !== "no",
        note: String(formData?.note || ""),
      };

      await run(async () => {
        const token = getToken();
        const res = await scopeProfileLinkUpsert(payload, token);
        if (!res || res?.error) throw new Error(res?.message || "No se pudo crear el alcance");
      });

      modal?.("Éxito", "Alcance asignado al perfil.");
      closeAssignScope();
      await loadScopesForProfile(profileId, { reset: true });
    },
    [assignScopeProfile, modal, run, closeAssignScope]
  );

  // -------------------- DETAILS LOADERS --------------------
  const ensureDetails = useCallback((profileId) => {
    setDetailsByProfile((prev) => {
      if (prev[profileId]) return prev;
      return {
        ...prev,
        [profileId]: {
          users: { items: [], page: 1, pages: 1, total: 0, loading: false },
          scopes: { items: [], loading: false },
        },
      };
    });
  }, []);

  const loadUsersForProfile = useCallback(
    async (profileId, { reset = false } = {}) => {
      if (!profileId) return;
      ensureDetails(profileId);

      const nextPage = reset ? 1 : detailsByProfile?.[profileId]?.users?.page || 1;

      setDetailsByProfile((prev) => ({
        ...prev,
        [profileId]: {
          ...prev[profileId],
          users: { ...(prev[profileId]?.users || {}), loading: true, page: nextPage },
        },
      }));

      try {
        const token = getToken();
        const res = await userProfileAssignmentList({ profileId, page: nextPage, limit: 25, active: undefined }, token);
        if (!res || res?.error) throw new Error(res?.message || "Error cargando usuarios asignados");

        const incoming = Array.isArray(res.items) ? res.items : [];
        setDetailsByProfile((prev) => {
          const prevItems = reset ? [] : prev[profileId]?.users?.items || [];
          return {
            ...prev,
            [profileId]: {
              ...prev[profileId],
              users: {
                items: [...prevItems, ...incoming],
                page: res.page || nextPage,
                pages: res.pages || 1,
                total: res.total || 0,
                loading: false,
              },
            },
          };
        });
      } catch (e) {
        setDetailsByProfile((prev) => ({
          ...prev,
          [profileId]: { ...prev[profileId], users: { ...(prev[profileId]?.users || {}), loading: false } },
        }));
        modal?.("Error", e?.message || "Error cargando usuarios asignados");
      }
    },
    [ensureDetails, detailsByProfile, modal]
  );

  const loadScopesForProfile = useCallback(
    async (profileId) => {
      if (!profileId) return;
      ensureDetails(profileId);

      setDetailsByProfile((prev) => ({
        ...prev,
        [profileId]: {
          ...prev[profileId],
          scopes: { ...(prev[profileId]?.scopes || {}), loading: true },
        },
      }));

      try {
        const token = getToken();

        // backend ya filtra por profileId
        const res = await scopeProfileLinkList({ profileId, page: 1, limit: 200, active: undefined }, token);
        if (!res || res?.error) throw new Error(res?.message || "Error cargando alcances");

        const items = Array.isArray(res.items) ? res.items : [];

        setDetailsByProfile((prev) => ({
          ...prev,
          [profileId]: { ...prev[profileId], scopes: { items, loading: false } },
        }));
      } catch (e) {
        setDetailsByProfile((prev) => ({
          ...prev,
          [profileId]: { ...prev[profileId], scopes: { ...(prev[profileId]?.scopes || {}), loading: false } },
        }));
        modal?.("Error", e?.message || "Error cargando alcances");
      }
    },
    [ensureDetails, modal]
  );

  useEffect(() => {
    if (!openId) return;
    const profileId = String(openId);
    ensureDetails(profileId);

    const hasUsers = (detailsByProfile?.[profileId]?.users?.items || []).length > 0;
    const hasScopes = (detailsByProfile?.[profileId]?.scopes?.items || []).length > 0;

    if (!hasUsers) loadUsersForProfile(profileId, { reset: true });
    if (!hasScopes) loadScopesForProfile(profileId);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openId]);

  // -------------------- ACTIONS ON ASSIGNMENTS --------------------
  const removeUserAssignment = useCallback(
    (assignment) => {
      const aid = normId(assignment?._id);
      const profileId = normId(assignment?.profileId?._id || assignment?.profileId || openId);
      if (!aid) return;

      setConfirm({
        open: true,
        title: "Quitar perfil al usuario",
        message: "Se eliminará la asignación de este perfil al usuario.",
        tone: "danger",
        onConfirm: async () => {
          closeConfirm();
          await run(async () => {
            const token = getToken();
            const res = await userProfileAssignmentDeleteHard({ id: aid }, token);
            if (!res || res?.error) throw new Error(res?.message || "No se pudo eliminar la asignación");
          });
          await loadUsersForProfile(profileId, { reset: true });
        },
      });
    },
    [closeConfirm, run, loadUsersForProfile, openId]
  );

  const toggleUserAssignment = useCallback(
    async (assignment) => {
      const aid = normId(assignment?._id);
      const profileId = normId(assignment?.profileId?._id || assignment?.profileId || openId);
      if (!aid) return;

      const next = !(assignment?.active !== false);

      await run(async () => {
        const token = getToken();
        const res = await userProfileAssignmentUpdate({ id: aid, active: next }, token);
        if (!res || res?.error) throw new Error(res?.message || "No se pudo actualizar la asignación");
      });

      await loadUsersForProfile(profileId, { reset: true });
    },
    [run, loadUsersForProfile, openId]
  );

  const deleteScopeRule = useCallback(
    (rule) => {
      const rid = normId(rule?._id);
      const profileId = normId(rule?.profileId?._id || rule?.profileId || openId);
      if (!rid) return;

      setConfirm({
        open: true,
        title: "Eliminar alcance del perfil",
        message: "Se eliminará este enlace (rol → perfil).",
        tone: "danger",
        onConfirm: async () => {
          closeConfirm();
          await run(async () => {
            const token = getToken();
            const res = await scopeProfileLinkDeleteHard({ id: rid }, token);
            if (!res || res?.error) throw new Error(res?.message || "No se pudo eliminar el alcance");
          });
          await loadScopesForProfile(profileId);
        },
      });
    },
    [closeConfirm, run, loadScopesForProfile, openId]
  );

  const toggleScopeRule = useCallback(
    async (rule) => {
      const rid = normId(rule?._id);
      const profileId = normId(rule?.profileId?._id || rule?.profileId || openId);
      if (!rid) return;

      const next = !(rule?.active !== false);

      await run(async () => {
        const token = getToken();
        const res = await scopeProfileLinkUpdate({ id: rid, active: next }, token);
        if (!res || res?.error) throw new Error(res?.message || "No se pudo actualizar el alcance");
      });

      await loadScopesForProfile(profileId);
    },
    [run, loadScopesForProfile, openId]
  );

  // -------------------- UI --------------------
  return (
    <div className={styles.permissionsMain}>
      <div className={styles.headerRow}>
        <div>
          <h3>Perfiles</h3>
          <div className={styles.muted}>Plantillas de permisos por módulo y acciones.</div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.primaryBtn} onClick={openCreate}>
            + Nuevo perfil
          </button>
        </div>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.field}>
          <label className={styles.label}>Buscar</label>
          <input
            className={styles.input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
          />
        </div>

        {/* filtro usuario */}
        <div className={styles.field}>
          <label className={styles.label}>Usuario</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              className={styles.input}
              value={filterUser?.label || ""}
              placeholder="Todos los usuarios"
              readOnly
              onClick={openFilterUser}
              title="Haz clic para elegir usuario"
            />
            <button className={styles.secondaryBtn} onClick={openFilterUser}>
              Buscar
            </button>
            {!!filterUserId && (
              <button
                className={styles.secondaryBtn}
                disabled={!filterUserId}
                onClick={() => setFilterUser(null)}
                title="Quitar filtro"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Estado</label>
          <select
            className={styles.select}
            value={active}
            onChange={(e) => {
              setActive(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todos</option>
            <option value="true">Activos</option>
            <option value="false">Inactivos</option>
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Límite</label>
          <select
            className={styles.select}
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
          >
            {[10, 25, 50, 100].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>&nbsp;</label>
          <button className={styles.secondaryBtn} onClick={() => loadList(true)} disabled={list.loading}>
            Recargar
          </button>
        </div>
      </div>

      {error ? <div className={styles.errorBox}>{error}</div> : null}

      <div className={styles.card}>
        {list.loading ? (
          <div className={styles.muted}>Cargando…</div>
        ) : !list.items.length ? (
          <div className={styles.muted}>No hay perfiles.</div>
        ) : (
          <div className={styles.table}>
            <div className={styles.tableHead}>
              <div>Nombre</div>
              <div>Estado</div>
              <div>Módulos</div>
              <div className={styles.right}>Acciones</div>
            </div>

            {list.items.map((p) => {
              const isActive = p?.active !== false;
              const count = Array.isArray(p?.moduleGrants) ? p.moduleGrants.length : 0;
              const isOpen = openId === p._id;

              const det = detailsByProfile?.[String(p._id)];
              const usersDet = det?.users;
              const scopesDet = det?.scopes;

              return (
                <React.Fragment key={p._id}>
                  <div
                    className={`${styles.tableRow} ${isOpen ? styles.rowOpen : ""}`}
                    onClick={() => toggleOpen(p._id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" || e.key === " ") toggleOpen(p._id);
                    }}
                    title="Haz clic para ver detalles"
                  >
                    <div className={styles.strong}>
                      {p?.name || "—"}
                      <span className={styles.rowChevron}>{isOpen ? "▾" : "▸"}</span>
                    </div>

                    <div>
                      <span className={isActive ? styles.badgeOk : styles.badgeOff}>
                        {isActive ? "Activo" : "Inactivo"}
                      </span>
                    </div>

                    <div className={styles.muted}>{count} módulos</div>

                    <div className={`${styles.right} ${styles.rowActions}`} onClick={(e) => e.stopPropagation()}>
                      <button className={styles.linkBtn} onClick={() => openEdit(p)}>Editar</button>
                      <button className={styles.linkBtnWarn} onClick={() => requestToggle(p)}>
                        {isActive ? "Desactivar" : "Activar"}
                      </button>
                      <button className={styles.linkBtnDanger} onClick={() => requestDelete(p)}>
                        Eliminar
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className={styles.rowDetails} onClick={(e) => e.stopPropagation()}>
                      <div className={styles.headerActions} style={{ marginBottom: 10 }}>
                        <button className={styles.secondaryBtn} onClick={() => openAssignUser(p)}>
                          Asignar a usuario
                        </button>
                        <button className={styles.secondaryBtn} onClick={() => openAssignScope(p)}>
                          Asignar a alcance
                        </button>
                      </div>

                      <div className={styles.detailsGrid}>
                        <div className={styles.detailsBlock}>
                          <div className={styles.detailsTitle}>Descripción</div>
                          <div className={styles.detailsText}>{p?.description?.trim() ? p.description : "—"}</div>
                        </div>

                        <div className={styles.detailsBlock}>
                          <div className={styles.detailsTitle}>Nota interna</div>
                          <div className={styles.detailsText}>{p?.note?.trim() ? p.note : "—"}</div>
                        </div>
                      </div>

                      <div className={styles.detailsBlock}>
                        <div className={styles.detailsTitle}>Permisos por módulo</div>

                        {!Array.isArray(p?.moduleGrants) || p.moduleGrants.length === 0 ? (
                          <div className={styles.detailsText}>—</div>
                        ) : (
                          <div className={styles.grantsList}>
                            {p.moduleGrants.map((g, idx) => {
                              const m = String(g?.module || "");
                              const mLabel = FRONT_MODULE_LABELS?.[m] || m || "—";
                              const actions = Array.isArray(g?.actions) ? g.actions.map(String) : [];

                              const actionsText = actions.includes("*")
                                ? MODULE_ACTION_LABELS?.["*"] || "Todo"
                                : actions.length
                                  ? actions.map((a) => MODULE_ACTION_LABELS?.[a] || a).join(", ")
                                  : "—";

                              const gActive = g?.active !== false;

                              return (
                                <div key={`${m}-${idx}`} className={styles.grantLine}>
                                  <span className={styles.grantModule}>{mLabel}</span>
                                  <span className={styles.grantSep}>·</span>
                                  <span className={styles.grantActions}>{actionsText}</span>
                                  <span className={styles.grantSep}>·</span>
                                  <span className={gActive ? styles.grantOn : styles.grantOff}>
                                    {gActive ? "Grant activo" : "Grant inactivo"}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                      <div className={styles.detailsBlock}>
                        <div className={styles.detailsTitle}>Usuarios con este perfil</div>

                        {usersDet?.loading ? (
                          <div className={styles.muted}>Cargando usuarios…</div>
                        ) : !usersDet?.items?.length ? (
                          <div className={styles.detailsText}>—</div>
                        ) : (
                          <>
                            <div className={styles.grantsList}>
                              {usersDet.items.map((a) => {
                                const u = a?.userId;
                                const name = `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || "—";
                                const email = u?.email ? ` · ${u.email}` : "";
                                const isOn = a?.active !== false;

                                return (
                                  <div key={a._id} className={styles.grantLine}>
                                    <span className={styles.grantModule}>{name}{email}</span>
                                    <span className={styles.grantSep}>·</span>
                                    <span className={isOn ? styles.grantOn : styles.grantOff}>
                                      {isOn ? "Activo" : "Inactivo"}
                                    </span>
                                    {a?.expiresAt ? (
                                      <>
                                        <span className={styles.grantSep}>·</span>
                                        <span className={styles.muted}>Caduca: {isoDay(a.expiresAt)}</span>
                                      </>
                                    ) : null}

                                    <span style={{ marginLeft: "auto" }} />

                                    <button className={styles.linkBtn} onClick={() => toggleUserAssignment(a)}>
                                      {isOn ? "Desactivar" : "Activar"}
                                    </button>
                                    <button className={styles.linkBtnDanger} onClick={() => removeUserAssignment(a)}>
                                      Quitar
                                    </button>
                                  </div>
                                );
                              })}
                            </div>

                            {usersDet.page < usersDet.pages ? (
                              <button
                                className={styles.secondaryBtn}
                                onClick={() => loadUsersForProfile(String(p._id), { reset: false })}
                                disabled={usersDet.loading}
                                style={{ marginTop: 10 }}
                              >
                                Cargar más
                              </button>
                            ) : null}
                          </>
                        )}
                      </div>

                      <div className={styles.detailsBlock}>
                        <div className={styles.detailsTitle}>Alcances que aplican este perfil</div>

                        {scopesDet?.loading ? (
                          <div className={styles.muted}>Cargando alcances…</div>
                        ) : !scopesDet?.items?.length ? (
                          <div className={styles.detailsText}>—</div>
                        ) : (
                          <div className={styles.grantsList}>
                            {scopesDet.items.map((r) => {
                              const t = String(r?.resourceType || "");
                              const rr = String(r?.role || "");
                              const provName = r?.provinceId?.name || "Todas las provincias";
                              const isOn = r?.active !== false;

                              return (
                                <div key={r._id} className={styles.grantLine}>
                                  <span className={styles.grantModule}>
                                    {RESOURCE_TYPE_LABEL?.[t] || t || "—"} · {RESOURCE_ROLE_LABEL?.[rr] || rr || "—"} · {provName}
                                  </span>
                                  <span className={styles.grantSep}>·</span>
                                  <span className={isOn ? styles.grantOn : styles.grantOff}>
                                    {isOn ? "Activa" : "Inactiva"}
                                  </span>

                                  <span style={{ marginLeft: "auto" }} />

                                  <button className={styles.linkBtn} onClick={() => toggleScopeRule(r)}>
                                    {isOn ? "Desactivar" : "Activar"}
                                  </button>
                                  <button className={styles.linkBtnDanger} onClick={() => deleteScopeRule(r)}>
                                    Eliminar
                                  </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })}
          </div>
        )}

        <div className={styles.pagination}>
          <button
            className={styles.secondaryBtn}
            disabled={page <= 1 || list.loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            ←
          </button>
          <div className={styles.muted}>
            Página {list.page} / {list.pages} · {list.total} total
          </div>
          <button
            className={styles.secondaryBtn}
            disabled={page >= list.pages || list.loading}
            onClick={() => setPage((p) => p + 1)}
          >
            →
          </button>
        </div>
      </div>

      {/* modal create/edit */}
      {formOpen ? (
        <FormPermissionProfile
          enumsData={enumsData}
          closeModal={closeForm}
          charge={charge}
          modal={modal}
          profile={editingProfile}
          onSaved={async () => loadList(false)}
        />
      ) : null}

      {/* modal filtro usuario */}
      {filterUserOpen ? (
        <ModalForm
          title="Filtrar por usuario"
          message="Busca y selecciona un usuario para ver solo sus perfiles asignados."
          fields={userSelectFields}
          onSubmit={handleFilterUserSubmit}
          onClose={closeFilterUser}
          modal={modal}
        />
      ) : null}

      {/* modal asignar perfil a usuario */}
      {assignUserOpen && assignProfile?._id ? (
        <ModalForm
          title="Asignar perfil a usuario"
          message={`Perfil: ${assignProfile?.name || "—"} · Busca y selecciona un usuario.`}
          fields={userSelectFields}
          onSubmit={handleAssignUserSubmit}
          onClose={closeAssignUser}
          modal={modal}
        />
      ) : null}

      {/* modal asignar alcance */}
      {assignScopeOpen && assignScopeProfile?._id ? (
        <ModalForm
          title="Asignar alcance al perfil"
          message={`Perfil: ${assignScopeProfile?.name || "—"} · Define el rol (scope) que aplicará este perfil.`}
          fields={assignScopeFields}
          onSubmit={handleAssignScopeSubmit}
          onClose={closeAssignScope}
          modal={modal}
        />
      ) : null}

      {confirm.open ? (
        <ModalConfirmation
          title={confirm.title}
          message={confirm.message}
          tone={confirm.tone}
          onCancel={closeConfirm}
          onConfirm={confirm.onConfirm}
        />
      ) : null}
    </div>
  );
}