// src/components/permissions/PermissionsScopeUnified.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/permissions.module.css";
import { getToken } from "../../lib/serviceToken";

import {
  userScopeList,
  userScopeUpsert,
  userScopeUpdate,
  userScopeDelete,
} from "../../lib/data";

import ModalConfirmation from "../globals/ModalConfirmation";
import FormUserScope from "./FormUserScope.jsx";

import {
  RESOURCE_TYPES,
  RESOURCE_ROLES,
  RESOURCE_TYPE_LABEL,
  RESOURCE_ROLE_LABEL,
  AREA_FALLBACK,
} from "./permissionsLabels";

const asBool = (v) => (v === "true" ? true : v === "false" ? false : undefined);
const normId = (v) => String(v || "");
const isoDay = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

const resolveProvinceLabel = (enumsData, provinceId) => {
  if(!!provinceId?.name) return provinceId?.name
  const p = enumsData?.provincesIndex?.[provinceId];
  return p?.name 
};

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

function resolveResourceLabel(enumsData, type, doc) {
  const t = String(type || "");
  if (!t) return "—";

  if (t === "area") {
    const rid = String(doc?.resourceKey || "").trim();
    if (!rid) return "—";
    const opt = (Array.isArray(AREA_FALLBACK) ? AREA_FALLBACK : []).find(
      (x) => String(x.value) === rid
    );
    return opt?.label || rid;
  }

  const rid = String(doc?.resourceId || "").trim();
  if (!rid) return "—";

  if (t === "program") {
    const p = enumsData?.programsIndex?.[rid];
    return p?.name || p?.label || p?.title || rid;
  }
  if (t === "dispositive") {
    const d = enumsData?.dispositiveIndex?.[rid];
    return d?.name || d?.label || d?.title || rid;
  }
  if (t === "province") {
    const pr = enumsData?.provincesIndex?.[rid];
    return pr?.name || pr?.label || pr?.title || rid;
  }

  return rid;
}

function renderUserLabel(u) {
  if (u && typeof u === "object") {
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return name || u.email || String(u._id || "");
  }
  return String(u || "—");
}

export default function PermissionsScopeUnified({
  modal,
  charge,
  enumsData,
  user = null, // opcional para filtrar por usuario
  onClearUser,
}) {
  const userId = normId(user?._id);

  // filtros
  const [resourceType, setResourceType] = useState("all");
  const [role, setRole] = useState("all");
  const [active, setActive] = useState("true"); // default: activos
  const [provinceId, setProvinceId] = useState("all"); // opcional
  const [q, setQ] = useState(""); // nota
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);

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

  // modales
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);

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

  const closeForm = useCallback(() => {
    setFormOpen(false);
    setEditing(null);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [userId]);

  const resourceTypeOptions = useMemo(
    () => RESOURCE_TYPES.map((t) => ({ value: t, label: RESOURCE_TYPE_LABEL?.[t] || t })),
    []
  );

  const roleOptions = useMemo(
    () => RESOURCE_ROLES.map((r) => ({ value: r, label: RESOURCE_ROLE_LABEL?.[r] || r })),
    []
  );

  const provinceOptions = useMemo(() => {
    const idx = enumsData?.provincesIndex || {};
    const base = Object.entries(idx)
      .map(([id, v]) => ({
        value: String(id),
        label: v?.name || v?.label || v?.title || String(id),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
    return [{ value: "all", label: "Todas" }, { value: "__NULL__", label: "— Todas (scope=global) —" }, ...base];
  }, [enumsData]);

  const loadList = useCallback(
    async (showLoader = false) => {
      const token = getToken();
      const payload = {
        userId: userId || undefined,
        resourceType: resourceType === "all" ? undefined : resourceType,
        role: role === "all" ? undefined : role,
        active: active === "all" ? undefined : asBool(active),
        // province: "all" => no filtra; "__NULL__" => provinceId=null
        provinceId:
          provinceId === "all"
            ? undefined
            : provinceId === "__NULL__"
            ? null
            : provinceId,
        q: (q || "").trim() || undefined,
        page,
        limit,
      };

      const exec = async () => {
        setList((s) => ({ ...s, loading: true }));
        const res = await userScopeList(payload, token);
        if (!res || res?.error) throw new Error(res?.message || "Error cargando scopes");

        setList({
          items: Array.isArray(res.items) ? res.items : [],
          page: res.page || page,
          limit: res.limit || limit,
          total: res.total || 0,
          pages: res.pages || 1,
          loading: false,
        });
      };

      if (showLoader) return run(exec);
      return Promise.resolve().then(exec).catch((e) => setError(e?.message || "Error"));
    },
    [userId, resourceType, role, active, provinceId, q, page, limit, run]
  );

  useEffect(() => {
    loadList(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, resourceType, role, active, provinceId, q, page, limit]);

  const openCreate = useCallback(() => {
    setEditing(null);
    setFormOpen(true);
  }, []);

  const openEdit = useCallback((doc) => {
    setEditing(doc);
    setFormOpen(true);
  }, []);

  const requestDelete = useCallback(
    (doc) => {
      const id = normId(doc?._id);
      if (!id) return;

      const t = String(doc?.resourceType || "");
      const roleLabel = RESOURCE_ROLE_LABEL?.[doc?.role] || doc?.role || "—";
      const tLabel = RESOURCE_TYPE_LABEL?.[t] || t;
      const rLabel = resolveResourceLabel(enumsData, t, doc);
      const provLabel = resolveProvinceLabel(enumsData, doc?.provinceId);
      const provSuffix = provLabel ? ` · ${provLabel}` : "";

      setConfirm({
        open: true,
        title: "Eliminar scope",
        message: `Se eliminará el scope "${tLabel}: ${rLabel}${provSuffix}" (${roleLabel}).`,
        tone: "danger",
        onConfirm: async () => {
          closeConfirm();
          await run(async () => {
            const token = getToken();
            const res = await userScopeDelete({ id }, token);
            if (!res || res?.error) throw new Error(res?.message || "Error eliminando scope");
          });
          await loadList(false);
        },
      });
    },
    [enumsData, closeConfirm, run, loadList]
  );

  const requestToggle = useCallback(
    (doc) => {
      const id = normId(doc?._id);
      if (!id) return;
      const next = !(doc?.active !== false);

      setConfirm({
        open: true,
        title: next ? "Activar scope" : "Desactivar scope",
        message: `${next ? "Se activará" : "Se desactivará"} el scope.`,
        tone: "warning",
        onConfirm: async () => {
          closeConfirm();
          await run(async () => {
            const token = getToken();
            const res = await userScopeUpdate({ id, active: next }, token);
            if (!res || res?.error) throw new Error(res?.message || "Error en toggle");
          });
          await loadList(false);
        },
      });
    },
    [closeConfirm, run, loadList]
  );

  const onSubmitForm = useCallback(
    async (values) => {
      await run(async () => {
        const token = getToken();

        // normaliza provinceId: "" => null, "__ALL__" => null
        const provinceIdNorm =
          values?.provinceId == null || String(values.provinceId).trim() === "" || String(values.provinceId) === "__ALL__"
            ? null
            : String(values.provinceId).trim();

        if (!values?.isEditing) {
          const payload = {
            userId: values.userId,
            resourceType: values.resourceType,
            role: values.role,
            active: values.active,
            expiresAt: values.expiresAt || null,
            note: values.note || "",
            provinceId: provinceIdNorm,

            // ✅ unified: area -> resourceKey (si tu UserScope lo usa)
            ...(String(values.resourceType) === "area"
              ? { resourceKey: values.resourceKey }
              : values.resourceId
              ? { resourceId: values.resourceId }
              : {}),
          };

          const res = await userScopeUpsert(payload, token);
          if (!res || res?.error) throw new Error(res?.message || "Error guardando scope");
          return;
        }

        const payload = {
          id: values.id,
          role: values.role,
          active: values.active,
          expiresAt: values.expiresAt ?? null,
          note: values.note || "",
          provinceId: provinceIdNorm,
        };

        const res = await userScopeUpdate(payload, token);
        if (!res || res?.error) throw new Error(res?.message || "Error actualizando scope");
      });

      closeForm();
      await loadList(false);
    },
    [run, closeForm, loadList]
  );

  return (
    <div className={styles.permissionsMain}>
      <div className={styles.headerRow}>
        <div>
          <h3>Scopes (UserScope)</h3>
          <div className={styles.muted}>
            {userId ? (
              <>
                Filtrado por usuario: {user?.firstName} {user?.lastName} · {user?.email || "—"}{" "}
                <button className={styles.linkBtn} type="button" onClick={onClearUser}>
                  Quitar filtro
                </button>
              </>
            ) : (
              "Mostrando todos los scopes registrados."
            )}
          </div>
        </div>

        <div className={styles.headerActions}>
          <button className={styles.primaryBtn} onClick={openCreate}>
            + Añadir scope
          </button>
        </div>
      </div>

      <div className={styles.filtersRow}>
        <div className={styles.field}>
          <label className={styles.label}>Tipo</label>
          <select
            className={styles.select}
            value={resourceType}
            onChange={(e) => {
              setResourceType(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todos</option>
            {resourceTypeOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Rol</label>
          <select
            className={styles.select}
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setPage(1);
            }}
          >
            <option value="all">Todos</option>
            {roleOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.field}>
          <label className={styles.label}>Provincia</label>
          <select
            className={styles.select}
            value={provinceId}
            onChange={(e) => {
              setProvinceId(e.target.value);
              setPage(1);
            }}
          >
            {provinceOptions.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
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
          <label className={styles.label}>Buscar nota</label>
          <input
            className={styles.input}
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              setPage(1);
            }}
            placeholder="nota..."
          />
        </div>
      </div>

      <div className={styles.filtersRow} style={{ gridTemplateColumns: "1fr auto auto" }}>
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
          <div className={styles.muted}>No hay scopes.</div>
        ) : (
          <div className={styles.table}>
            <div className={`${styles.tableHead} ${styles.scopeHead}`}>
              <div>Usuario</div>
              <div>Scope</div>
              <div>Rol</div>
              <div>Caduca</div>
              <div>Estado</div>
              <div className={styles.right}>Acciones</div>
            </div>

            {list.items.map((m) => {
              const userObj = m?.userId;
              const userLabel = renderUserLabel(userObj);
              const userEmail = userObj && typeof userObj === "object" ? userObj.email : "";

              const t = String(m?.resourceType || "");
              const tLabel = RESOURCE_TYPE_LABEL?.[t] || t || "—";
              const rLabel = resolveResourceLabel(enumsData, t, m);

              const provLabel = resolveProvinceLabel(enumsData, m?.provinceId);
              const provSuffix = provLabel ? ` · ${provLabel}` : "";

              const roleLabel = RESOURCE_ROLE_LABEL?.[m?.role] || m?.role || "—";
              const expText = m?.expiresAt ? isoDay(m.expiresAt) : "—";
              const isActive = m?.active !== false;

              return (
                <div key={m._id} className={`${styles.tableRow} ${styles.scopeRow}`}>
                  <div className={styles.strong}>
                    {userLabel}
                    {userEmail ? <div className={styles.muted}>{userEmail}</div> : null}
                  </div>

                  <div className={styles.muted}>
                    {tLabel}: {rLabel}
                    {provSuffix}
                  </div>
                  <div className={styles.muted}>{roleLabel}</div>
                  <div className={styles.muted}>{expText}</div>
                  <div>
                    <span className={isActive ? styles.badgeOk : styles.badgeOff}>
                      {isActive ? "Activo" : "Inactivo"}
                    </span>
                  </div>
                  <div className={`${styles.right} ${styles.rowActions}`}>
                    <button className={styles.linkBtn} onClick={() => openEdit(m)}>
                      Editar
                    </button>
                    <button className={styles.linkBtnWarn} onClick={() => requestToggle(m)}>
                      {isActive ? "Desactivar" : "Activar"}
                    </button>
                    <button className={styles.linkBtnDanger} onClick={() => requestDelete(m)}>
                      Eliminar
                    </button>
                  </div>
                </div>
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
            Página {page} / {list.pages} · {list.total} total
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

      {formOpen ? (
        <FormUserScope
          enumsData={enumsData}
          closeModal={closeForm}
          modal={modal}
          fixedUser={userId ? user : null}
          scope={editing}
          onSubmit={onSubmitForm}
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