// src/components/permissions/ManagingPermissions.jsx
import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/permissions.module.css";
import PermissionsNav from "./PermissionsNav";

import { useDebounce } from "../../hooks/useDebounce.jsx";
import { searchusername } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import PermissionsProfile from "./permissionsProfile.jsx";
import PermissionsScope from "./PermissionsScope.jsx";

export default function ManagingPermissions({ modal, charge, enumsData }) {
  // tabs: profiles | assignments | scope
  const [tab, setTab] = useState("profiles");

  // usuario (solo para assignments/scope)
  const [selectedUser, setSelectedUser] = useState(null);

  // buscador (solo para assignments/scope)
  const [qUser, setQUser] = useState("");
  const debouncedQ = useDebounce(qUser, 200);
  const [usersState, setUsersState] = useState({ items: [], loading: false, error: "" });

  const needsUser = useMemo(() => tab === "assignments", [tab]);

  const clearUsers = useCallback(() => {
    setUsersState({ items: [], loading: false, error: "" });
  }, []);

  const loadUsers = useCallback(async (showLoader = false) => {
    const query = (debouncedQ || "").trim();

    if (!needsUser) return;
    if (!query || query.length < 3) {
      clearUsers();
      return;
    }

    if (showLoader) charge(true);
    setUsersState((s) => ({ ...s, loading: true, error: "" }));

    try {
      const token = getToken();
      const res = await searchusername({ query }, token);

      if (!res || res?.error) {
        setUsersState((s) => ({
          ...s,
          loading: false,
          error: res?.message || "Error buscando usuarios",
        }));
        return;
      }

      const items = Array.isArray(res) ? res : res?.users || res?.items || [];
      setUsersState({ items, loading: false, error: "" });
    } catch (e) {
      setUsersState((s) => ({ ...s, loading: false, error: e.message || "Error" }));
    } finally {
      if (showLoader) charge(false);
    }
  }, [debouncedQ, needsUser, clearUsers]); // NO meter modal/charge

  // cuando entras a perfiles: limpia selección/búsqueda
  useEffect(() => {
    if (!needsUser) {
      setSelectedUser(null);
      setQUser("");
      clearUsers();
    }
  }, [needsUser, clearUsers]);

  // carga usuarios si estás en tabs que lo requieren
  useEffect(() => {
    if (!needsUser) return;
    loadUsers(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedQ, needsUser]);

  // si borras texto, deselecciona usuario
  useEffect(() => {
    if (!needsUser) return;
    if (!(debouncedQ || "").trim()) setSelectedUser(null);
  }, [debouncedQ, needsUser]);

  const onPickUser = useCallback((u) => setSelectedUser(u), []);

  const onSelectTab = useCallback((next) => setTab(next), []);

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div><h2>GESTIÓN DE PERMISOS</h2></div>
        </div>

        <div className={styles.permissionsBox}>
          <div className={styles.lateralBox}>
          <PermissionsNav tab={tab} onSelect={onSelectTab} />
          </div>
          
          <div className={styles.permissionsSidebar}>
            
            
            {tab === "profiles" && (
              <PermissionsProfile
              modal={modal}
              charge={charge}
              enumsData={enumsData}
              />

            )}

            

{tab === "scope" && (
  <PermissionsScope
    modal={modal}
    charge={charge}
    enumsData={enumsData}
    user={selectedUser}          // ✅ opcional: actúa como filtro si existe
    onClearUser={() => setSelectedUser(null)} // ✅ para botón “limpiar filtro”
  />
)}
    
          </div>

          
        </div>
      </div>
    </div>
  );
}