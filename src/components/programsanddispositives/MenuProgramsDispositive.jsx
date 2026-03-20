import { useMemo, useState, useEffect } from "react";
import { FaFolderOpen } from "react-icons/fa";
import styles from "../styles/menuProgramsDispositive.module.css";
import { IoRadioButtonOn } from "react-icons/io5";

const MenuProgramsDispositive = ({
  active,
  onSelect,
  modal,
  charge,
  listResponsability,
  enumsData,
  changeActive,
  isRoot = false,
}) => {
  const { programsIndex = {}, dispositiveIndex = {}, entityIndex = {} } = enumsData || {};
  const [expanded, setExpanded] = useState(null);
  const [query, setQuery] = useState("");
  const [selectedEntity, setSelectedEntity] = useState("all");

  const norm = (s) =>
    (s || "")
      .toString()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();

  const allowedProgramIds = useMemo(() => {
    if (!Array.isArray(listResponsability)) return new Set();

    return new Set(
      listResponsability
        .filter(
          (r) =>
            (r?.isProgramResponsible ||
              r?.isProgramCoordinator ||
              r?.isProgramSupervisor) &&
            r?.idProgram
        )
        .map((r) => String(r.idProgram))
    );
  }, [listResponsability]);

  const allowedDispositiveIds = useMemo(() => {
    if (!Array.isArray(listResponsability)) return new Set();

    return new Set(
      listResponsability
        .filter(
          (r) =>
            (r?.isDeviceResponsible ||
              r?.isDeviceCoordinator ||
              r?.isDeviceSupervisor) &&
            r?.dispositiveId
        )
        .map((r) => String(r.dispositiveId))
    );
  }, [listResponsability]);

  const entityOptions = useMemo(() => {
    return [
      { value: "all", label: "Todas las entidades" },
      ...Object.entries(entityIndex)
        .map(([id, entity]) => ({
          value: String(id),
          label: entity?.name || id,
        }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    ];
  }, [entityIndex]);

  const programsWithDevices = useMemo(() => {
    const q = norm(query);
    const result = {};

    const sortedPrograms = Object.values(programsIndex).sort((a, b) => {
      const aActive = a.active ? 1 : 0;
      const bActive = b.active ? 1 : 0;

      if (aActive !== bActive) return bActive - aActive;
      return (a.name || "").localeCompare(b.name || "", "es");
    });

    sortedPrograms.forEach((program) => {
      const programId = String(program._id);
      const programEntityId =
        typeof program?.entity === "string"
          ? String(program.entity)
          : String(program?.entity?._id || "");

      if (isRoot && selectedEntity !== "all" && programEntityId !== String(selectedEntity)) {
        return;
      }

      const allDevices = Object.values(dispositiveIndex).filter(
        (d) => String(d.program) === programId
      );

      let visibleProgram = false;
      let visibleDevices = [];

      if (isRoot) {
        visibleProgram = true;
        visibleDevices = allDevices;
      } else {
        const hasProgramAccess = allowedProgramIds.has(programId);

        if (hasProgramAccess) {
          visibleProgram = true;
          visibleDevices = allDevices;
        } else {
          visibleDevices = allDevices.filter((d) =>
            allowedDispositiveIds.has(String(d._id))
          );

          visibleProgram = visibleDevices.length > 0;
        }
      }

      if (!visibleProgram) return;

      const progName = program.name || "";
      const progAcr = program.acronym || "";
      const progMatch = !q || norm(`${progName} ${progAcr}`).includes(q);

      let filteredDevices = q
        ? visibleDevices.filter((d) =>
            norm(`${d.name} ${program.name} ${program.acronym}`).includes(q)
          )
        : visibleDevices;

      filteredDevices = filteredDevices.sort((a, b) => {
        const aActive = a.active ? 1 : 0;
        const bActive = b.active ? 1 : 0;

        if (aActive !== bActive) return bActive - aActive;
        return (a.name || "").localeCompare(b.name || "", "es");
      });

      if (progMatch || filteredDevices.length > 0) {
        result[program._id] = {
          ...program,
          dispositives: filteredDevices,
        };
      }
    });

    return result;
  }, [
    programsIndex,
    dispositiveIndex,
    query,
    isRoot,
    allowedProgramIds,
    allowedDispositiveIds,
    selectedEntity,
  ]);

  useEffect(() => {
    if (query) {
      setExpanded("ALL");
    } else {
      setExpanded(null);
    }
  }, [query, selectedEntity]);

  const activeProgramOrDispositive = (x) => {
    setExpanded(x._id);
    onSelect?.(x);
  };

  return (
    <div className={styles.divContenedor}>
      <div className={styles.searchBox}>
        <input
          type="text"
          placeholder="Buscar programa o dispositivo..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={styles.searchInput}
        />
        {query && (
          <button className={styles.clearBtn} onClick={() => setQuery("")}>
            ×
          </button>
        )}
      </div>

      {isRoot && entityOptions.length > 1 && (
        <div className={styles.entityFilterBox}>
          <label htmlFor="selectedEntity">Selecciona entidad</label>
          <select
          id='selectedEntity'
            value={selectedEntity}
            onChange={(e) => setSelectedEntity(e.target.value)}
            className={styles.entitySelect}
          >
            {entityOptions.map((entity) => (
              <option key={entity.value} value={entity.value}>
                {entity.label}
              </option>
            ))}
          </select>
        </div>
      )}

      <ul>
        {Object.values(programsWithDevices).map((program) => {
          const isExpanded =
            expanded === "ALL" || expanded === program._id || query.length > 0;

          return (
            <li
              key={program._id}
              className={
                program.active
                  ? styles.programItem
                  : `${styles.programItem} ${styles.inactive}`
              }
            >
              <span
                className={styles.programLabel}
                onClick={() =>
                  expanded === program._id && !query
                    ? setExpanded(null)
                    : activeProgramOrDispositive(program)
                }
              >
                <span className={styles.icon}>
                  <FaFolderOpen
                    className={active?._id === program._id ? styles.activeProgram : ""}
                  />
                </span>
                <span className={styles.acronym}>
                  {!!program?.acronym ? program.acronym : program.name}
                </span>
                <span className={styles.name}> ({program.name})</span>
              </span>

              {isExpanded && (
                <ul className={styles.deviceList}>
                  {program.dispositives.map((d) => (
                    <li
                      key={d._id}
                      className={`${styles.deviceItem} ${
                        active?._id === d._id ? styles.active : ""
                      }`}
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect?.(d);
                      }}
                    >
                      <span className={styles.iconSmall}>
                        <IoRadioButtonOn
                          className={d.active ? styles.activeDis : styles.inactiveDis}
                        />
                      </span>
                      <span>{d.name}</span>
                    </li>
                  ))}

                  {program.dispositives.length === 0 && (
                    <li className={styles.empty}>No hay dispositivos</li>
                  )}
                </ul>
              )}
            </li>
          );
        })}
      </ul>

      {Object.keys(programsWithDevices).length === 0 && (
        <p className={styles.empty}>No se encontraron resultados.</p>
      )}
    </div>
  );
};

export default MenuProgramsDispositive;