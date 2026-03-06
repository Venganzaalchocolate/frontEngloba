// src/components/permissions/PermissionsNav.jsx
import React, { useMemo } from "react";
import styles from "../styles/permissions.module.css";
import { FaUser, FaIdBadge } from "react-icons/fa6";
import { FaUsersCog } from "react-icons/fa";

export default function PermissionsNav({ tab, onSelect }) {
  const items = useMemo(
    () => [
      { key: "profiles", label: "Perfiles", icon: <FaIdBadge /> },
      { key: "scope", label: "Alcance", icon: <FaUser /> },
    ],
    []
  );

  return (
    <div className={styles.divContenedor}>
      <ul>
        {items.map((item) => {
          const isActive = tab === item.key;
          return (
            <li
              key={item.key}
              className={isActive ? styles.active : ""}
              onClick={() => onSelect(item.key)}
              role="button"
            >
              <span className={styles.icon}>{item.icon}</span>
              <span>{item.label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}