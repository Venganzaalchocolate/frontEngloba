import { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";

import AuditSectionSelector from "./AuditSectionSelector";
import UserInfoAuditPanel from "./UserInfoAuditPanel";
import ProgramInfoAuditPanel from "./ProgramInfoAuditPanel";
import DeviceInfoAuditPanel from "./DeviceInfoAuditPanel";
import LeavesAuditPanel from "./LeavesAuditPanel";
import PayrollsAuditPanel from "./PayrollsAuditPanel";

export default function ManagingAuditors({ modal, charge, enumsData }) {
  const [selected, setSelected] = useState("users-info");

  const options = [
    { key: "users-info", label: "Info trabajadores" },
    { key: "programs-info", label: "Info programas" },
    { key: "devices-info", label: "Info dispositivos" },
    { key: "leaves", label: "Trabajadores de baja" },
    { key: "payrolls", label: "Nominas"}
  ];


  const renderPanel = () => {
    switch (selected) {
      case "users-info":
        return <UserInfoAuditPanel modal={modal} charge={charge} enumsData={enumsData} />;

      case "programs-info":
        return <ProgramInfoAuditPanel modal={modal} charge={charge} enumsData={enumsData} />;

      case "devices-info":
        return <DeviceInfoAuditPanel modal={modal} charge={charge} enumsData={enumsData} />;

      case "leaves":
        return <LeavesAuditPanel modal={modal} charge={charge} enumsData={enumsData} />;

      case "payrolls":
        return <PayrollsAuditPanel modal={modal} charge={charge} enumsData={enumsData} />;

      default:
        return null;
    }
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <>
          <div className={styles.titulo}>
            <div>
              <h2>AUDITORÍA</h2>
            </div>
          </div>
          <div className={styles.cajaContenido}>
            <AuditSectionSelector
              selected={selected}
              setSelected={setSelected}
              options={options}
            />
            {renderPanel()}
          </div>
        </>

      </div>
    </div>
  );
}
