import React, { useState } from "react";
import styles from "../styles/ManagingAuditors.module.css";

import AuditSectionSelector from "./AuditSectionSelector";


import ProgramInfoAuditPanel from "./ProgramInfoAuditPanel";
import DeviceInfoAuditPanel from "./DeviceInfoAuditPanel";
import LeavesAuditPanel from "./LeavesAuditPanel";
import UserInfoAuditPanel from "./UserInfoAuditPanel";

export default function AuditDashboard({ enumsData, modal, charge }) {
  const [section, setSection] = useState("users-info");

  const panels = {
    "users-info": <UserInfoAuditPanel enumsData={enumsData} modal={modal} charge={charge} />,
    "programs-info": <ProgramInfoAuditPanel enumsData={enumsData} modal={modal} charge={charge} />,
    "devices-info": <DeviceInfoAuditPanel enumsData={enumsData} modal={modal} charge={charge} />,
    "leaves": <LeavesAuditPanel enumsData={enumsData} modal={modal} charge={charge} />,
  };

  return (
    <div className={styles.container}>
      <h2>AUDITORÍA GENERAL</h2>

      <AuditSectionSelector selected={section} setSelected={setSection} />

      <div className={styles.panelContainer}>
        {panels[section]}
      </div>
    </div>
  );
}
