import { FaPaperPlane } from 'react-icons/fa';
import styles from '../styles/MenuOptionsEmployee.module.css';

import { FaUser, FaUserShield, FaFileLines, FaMoneyCheckDollar, FaUmbrellaBeach, FaFileContract} from "react-icons/fa6";
import { TbStatusChange } from "react-icons/tb";

const menuItems = [
  { key: "mis-datos", label: "Información Personal", icon: <FaUser /> },
  { key: "resp-coord", label: "Responsabilidad y Coordinación", icon: <FaUserShield /> },
  { key: "documentacion", label: "Documentación", icon: <FaFileLines /> },
  { key: "nominas", label: "Nóminas", icon: <FaMoneyCheckDollar /> },
  { key: "vacaciones", label: "Vacaciones", icon: <FaUmbrellaBeach /> },
  { key: "contratos", label: "Periodos de contratación", icon: <FaFileContract /> },
  { key: "preferencias", label: "Traslados Reincorporaciones", icon: <FaPaperPlane /> },
  { key: "solicitudes", label: "Solicitudes", icon: <TbStatusChange /> }
];


export default function MenuOptionsEmployee({ current, onSelect }) {
  return (
    <div className={styles.divContenedor}>
      <ul>
        {menuItems.map((item) => (
          <li
            key={item.key}
            className={current === item.key ? styles.active : ""}
            onClick={() => onSelect(item.key)}
          >
            <span className={styles.icon}>{item.icon}</span>
            <span>{item.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}