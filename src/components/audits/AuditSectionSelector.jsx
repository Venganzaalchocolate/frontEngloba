import React from "react";
import styles from "../styles/ManagingAuditors.module.css";
import { FaUserCheck, FaBuilding, FaLaptopHouse, FaUserInjured } from "react-icons/fa";

const options = [
  { key: "users-info", label: "Datos de usuarios", icon: <FaUserCheck /> },
  { key: "programs-info", label: "Datos de programas", icon: <FaBuilding /> },
  { key: "devices-info", label: "Datos de dispositivos", icon: <FaLaptopHouse /> },
  { key: "leaves", label: "Bajas activas", icon: <FaUserInjured /> }
];

export default function AuditSectionSelector({ selected, setSelected }) {
  return (
    <div className={styles.selectorBar}>
      {options.map(op => (
        <button
          key={op.key}
          className={selected === op.key ? styles.activeButton : styles.button}
          onClick={() => setSelected(op.key)}
        >
          <span className={styles.icon}>{op.icon}</span>
          {op.label}
        </button>
      ))}
    </div>
  );
}
