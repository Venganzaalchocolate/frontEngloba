import React, { useState } from "react";
import styles from "../styles/ProgramTabs.module.css";
import InfoProgramOrDispositive from "./InfoProgramOrDispositive";
import DocsProgramOrDispositive from "./DocsProgramOrDispositive";
const ProgramTabs = ({
  modal,
  charge,
  listResponsability,
  enumsData,
  info,
  onSelect,
  searchUsers,
  onManageCronology
}) => {
  const [activeTab, setActiveTab] = useState("info"); // "info" | "docs"

  const isProgram = info?.type === "program";
  const typeLabel = isProgram ? "Programa" : "Dispositivo";
  return (
    <div className={styles.container}>
      {/* === TABS HEADER === */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${activeTab === "info" ? styles.active : ""}`}
          onClick={() => setActiveTab("info")}
        >
          Información del {typeLabel} {!!(info) ?info.acronym || info.name: ''}
        </button>
        <button
          className={`${styles.tab} ${activeTab === "docs" ? styles.active : ""}`}
          onClick={() => setActiveTab("docs")}
        >
          Documentación del {typeLabel}  {!!(info) ?info.acronym || info.name: ''}
        </button>
      </div>

      {/* === TAB CONTENT === */}
      <div className={styles.content}>
        {activeTab === "info" ? (
          <InfoProgramOrDispositive
            modal={modal}
            charge={charge}
            listResponsability={listResponsability}
            enumsData={enumsData}
            info={info}
            onSelect={onSelect}
            searchUsers={searchUsers}
            onManageCronology={onManageCronology}
          />
        ) : (
          <DocsProgramOrDispositive
            modal={modal}
            charge={charge}
            info={info}
          />
        )}
      </div>
    </div>
  );
};

export default ProgramTabs;
