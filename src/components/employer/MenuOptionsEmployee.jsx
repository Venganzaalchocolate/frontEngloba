import { FaClock, FaPaperPlane } from 'react-icons/fa';
import styles from '../styles/MenuOptionsEmployee.module.css';
import { FaUser, FaUserShield, FaFileLines, FaMoneyCheckDollar, FaUmbrellaBeach, FaFileContract } from "react-icons/fa6";
import { TbStatusChange } from "react-icons/tb";
import { useLogin } from '../../hooks/useLogin';

export default function MenuOptionsEmployee({ current, onSelect }) {
  const { logged } = useLogin();

  let menuItems = [
    { key: "mis-datos", label: "Información Personal", icon: <FaUser /> },
    { key: "resp-coord", label: "Responsabilidad y Coordinación", icon: <FaUserShield /> },
    { key: "documentacion", label: "Documentación", icon: <FaFileLines /> },
    { key: "nominas", label: "Nóminas", icon: <FaMoneyCheckDollar /> },
    { key: "vacaciones", label: "Vacaciones", icon: <FaUmbrellaBeach /> },
    { key: "contratos", label: "Periodos de contratación - Bajas/Excedencias", icon: <FaFileContract /> },
    { key: "preferencias", label: "Traslados Reincorporaciones", icon: <FaPaperPlane /> },
    { key: "solicitudes", label: "Solicitudes", icon: <TbStatusChange /> },
    { key: "controltime", label: "Control Horario (sesame)", icon: <FaClock /> }
  ];

  const responsable = ["mis-datos", "documentacion", "vacaciones", "contratos", "preferencias", "solicitudes", "controltime", "nominas"];
  const rrhh = ["nominas", "mis-datos", "documentacion", "contratos", "preferencias", "controltime", "vacaciones"];
  const global = [...responsable, "resp-coord", "nominas"];
  const auditor=["mis-datos", "documentacion", "contratos"]

  const role = logged?.user?.role;

  menuItems = menuItems.filter((x) => {
    if (role === 'root') return true;
    if (role === 'global') return global.includes(x.key);
    if (role === 'rrhh') return rrhh.includes(x.key);
    if (role==='auditor') return auditor.includes(x.key);
    return responsable.includes(x.key);
  });

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