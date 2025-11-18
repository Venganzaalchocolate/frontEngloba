import { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";

// ✔ COMPONENTES NUEVOS
import AuditDashboard from "./AuditDashboard";
import AuditSectionSelector from "./AuditSectionSelector";

import UserInfoAuditPanel from "./UserInfoAuditPanel";
import ProgramInfoAuditPanel from "./ProgramInfoAuditPanel";
import DeviceInfoAuditPanel from "./DeviceInfoAuditPanel";
import LeavesAuditPanel from "./LeavesAuditPanel";

export default function ManagingAuditors({ modal, charge, enumsData }) {
  const [selected, setSelected] = useState("info-users");

  const options = [
    { key: "info-users", label: "Info trabajadores" },
    { key: "info-programs", label: "Info programas" },
    { key: "info-devices", label: "Info dispositivos" },
    { key: "leaves", label: "Trabajadores de baja" },
  ];

  const renderPanel = () => {
    switch (selected) {
      case "info-users":
        return (
          <UserInfoAuditPanel
            modal={modal}
            charge={charge}
            enumsData={enumsData}
          />
        );

      case "info-programs":
        return (
          <ProgramInfoAuditPanel
            modal={modal}
            charge={charge}
            enumsData={enumsData}
          />
        );

      case "info-devices":
        return (
          <DeviceInfoAuditPanel
            modal={modal}
            charge={charge}
            enumsData={enumsData}
          />
        );

      case "leaves":
        return (
          <LeavesAuditPanel modal={modal} charge={charge} enumsData={enumsData} />
        );

      default:
        return <AuditDashboard />;
    }
  };

  return (
    <div className={styles.wrapper}>
      <h2 className={styles.title}>Auditoría de Datos</h2>

      {/* Selector de secciones */}
      <AuditSectionSelector
  options={options}
  selected={selected}
  onSelect={setSelected}   // ← DEBE SER setSelected (la función de useState)
/>

      {/* Panel activo */}
      <div className={styles.panelContainer}>{renderPanel()}</div>
    </div>
  );
}
