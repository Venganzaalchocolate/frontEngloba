import React, { useState } from "react";
import styles from "../styles/ProgramTabs.module.css";
import InfoProgramOrDispositive from "./InfoProgramOrDispositive";
import DocsProgramOrDispositive from "./DocsProgramOrDispositive";
import WorkspaceProgramOrDispositive from "./WorkspaceProgramOrDispositive";

const ProgramTabs = ({
  modal,
  charge,
  listResponsability,
  enumsData,
  info,
  onSelect,
  searchUsers,
  onManageCronology,
  changeActive,
  deviceWorkers
}) => {
  const [activeTab, setActiveTab] = useState("info"); // "info" | "docs" | "workspace"

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
          <p>Información del {typeLabel}</p>
          <p>{info ? info.acronym || info.name : ""}</p>
        </button>

        <button
          className={`${styles.tab} ${activeTab === "docs" ? styles.active : ""}`}
          onClick={() => setActiveTab("docs")}
        >
          <p>Documentación del {typeLabel}</p>
          <p>{info ? info.acronym || info.name : ""}</p>
        </button>

        <button
          className={`${styles.tab} ${activeTab === "workspace" ? styles.active : ""}`}
          onClick={() => setActiveTab("workspace")}
        >
          <p>Workspace del {typeLabel}</p>
          <p>{info ? info.acronym || info.name : ""}</p>
        </button>
      </div>

      {/* === TAB CONTENT === */}
      <div className={styles.content}>
        {activeTab === "info" && (
          <InfoProgramOrDispositive
            modal={modal}
            charge={charge}
            listResponsability={listResponsability}
            enumsData={enumsData}
            info={info}
            onSelect={onSelect}
            searchUsers={searchUsers}
            onManageCronology={onManageCronology}
            changeActive={changeActive}
            deviceWorkers={deviceWorkers}
          />
        )}

        {activeTab === "docs" && (
          <DocsProgramOrDispositive
            modal={modal}
            charge={charge}
            info={info}
          />
        )}

        {activeTab === "workspace" && (
          <WorkspaceProgramOrDispositive
            modal={modal}
            charge={charge}
            info={info}
            deviceWorkers={deviceWorkers}
          />
        )}
      </div>
    </div>
  );
};

export default ProgramTabs;
