// src/components/permissions/PermissionsUserFilters.jsx

import styles from "../styles/permissions.module.css";

const normId = (v) => String(v || "");

export default function PermissionsUserFilters({
  qUser,
  onChange,
  onReset,
  usersState,
  selectedUser,
  onPickUser,
}) {
  const items = Array.isArray(usersState?.items) ? usersState.items : [];
  const loading = !!usersState?.loading;
  const error = usersState?.error || "";

  return (
    <div className={styles.contenedorfiltro}>
      <div className={styles.filtroBuscar}>
        <label htmlFor="qUser">Buscar usuario</label>
        <div className={styles.pdSearchWrap}>
          <input
            id="qUser"
            type="text"
            className={styles.pdSearchInput}
            value={qUser}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Nombre, apellidos, dni, email..."
          />
        </div>
      </div>

      <div>
        <button type="button" onClick={onReset}>Reset</button>
      </div>

      <div className={styles.userList}>
        {!qUser.trim() && <div className={styles.muted}>Escribe arriba para buscar usuarios…</div>}
        {loading && <div className={styles.muted}>Buscando…</div>}
        {!!error && <div className={styles.error}>{error}</div>}

        {!loading && !error && qUser.trim() && items.length === 0 && (
          <div className={styles.muted}>Sin resultados</div>
        )}

        {items.map((u) => {
          const id = u?._id || u?.id;
          const activeId = selectedUser?._id || selectedUser?.id;
          const isActive = normId(activeId) === normId(id);

          const label =`${u?.firstName || ""} ${u?.lastName || ""}`.trim()

          return (
            <button
              key={id}
              className={(!isActive)? styles.userRow:styles.userRowActive}
              onClick={() => onPickUser?.(u)}
            >
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}