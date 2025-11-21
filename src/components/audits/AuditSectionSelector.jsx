import styles from "../styles/ManagingAuditors.module.css";
import { FaUserCheck, FaBuilding, FaLaptopHouse, FaUserInjured } from "react-icons/fa";
import { HiDocumentCurrencyEuro } from "react-icons/hi2";

const options = [
  { key: "users-info", label: "Datos de usuarios", icon: <FaUserCheck /> },
  { key: "programs-info", label: "Datos de programas", icon: <FaBuilding /> },
  { key: "devices-info", label: "Datos de dispositivos", icon: <FaLaptopHouse /> },
  { key: "leaves", label: "Bajas activas", icon: <FaUserInjured /> },
  { key: 'payrolls', label:'Nóminas', icon: <HiDocumentCurrencyEuro/>}
];

export default function AuditSectionSelector({ selected, setSelected }) {
  return (
    <div className={styles.divContenedor}>
    <ul className={styles.sidebarList}>
      {options.map((op) => (
        <li key={op.key} className={selected === op.key ? styles.active : ""} onClick={() => setSelected(op.key)}>
            <span className={styles.sidebarIcon}>{op.icon}</span>
            <span>{op.label}</span>
        </li>
      ))}
    </ul>  
    </div>
    
  );
}
