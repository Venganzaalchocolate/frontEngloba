import { useMemo, useState, useEffect } from "react";
import { RiBuilding2Line } from "react-icons/ri";
import { FaFolderOpen } from "react-icons/fa";
import styles from "../styles/menuProgramsDispositive.module.css";

const MenuProgramsDispositive = ({
    active,
    onSelect,
    modal,
    charge,
    listResponsability,
    enumsData,
}) => {
    const { programsIndex, dispositiveIndex } = enumsData;
    const [expanded, setExpanded] = useState(null);
    const [query, setQuery] = useState("");


    const norm = (s) =>
        (s || "")
            .toString()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();

    // Filtrado
    const programsWithDevices = useMemo(() => {
        const q = norm(query);
        const result = {};

        Object.values(programsIndex).forEach((program) => {
            const progName = program.name || "";
            const progAcr = program.acronym || "";
            const progMatch = !q || norm(`${progName} ${progAcr}`).includes(q);

            const allDevices = Object.values(dispositiveIndex).filter(
                (d) => d.program === program._id
            );

            const filteredDevices = q
                ? allDevices.filter((d) =>
                    norm(`${d.name} ${program.name} ${program.acronym}`).includes(q)
                )
                : allDevices;

            if (progMatch || filteredDevices.length > 0) {
                result[program._id] = {
                    ...program,
                    dispositives: filteredDevices,
                };
            }
        });

        return result;
    }, [programsIndex, dispositiveIndex, query]);

    // Expandir automáticamente si hay búsqueda
    useEffect(() => {
        if (query) {
            setExpanded("ALL");
        } else {
            setExpanded(null);
        }
    }, [query]);

    const activeProgramOrDispositive=(x)=>{
        setExpanded(x._id)
        onSelect?.(x);
    }
 
    return (
        <div className={styles.divContenedor}>
            {/*  Buscador */}
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

            {/* Listado */}
            <ul>
                {Object.values(programsWithDevices).map((program) => {
                    const isExpanded =
                        expanded === "ALL" || expanded === program._id || query.length > 0;
                    return (
                        <li key={program._id} className={`${styles.programItem}`}  >
                            <span className={styles.programLabel} onClick={() =>(expanded === program._id && !query ? setExpanded(null) : activeProgramOrDispositive(program))}>
                                <span className={styles.icon}>
                                    <FaFolderOpen className={`${active?._id === program._id ? styles.activeProgram : ""}`}/>
                                </span>
                                <span className={styles.acronym}> {(!!program?.acronym)?program.acronym:program.name}</span>
                                <span className={styles.name}> ({program.name})</span>
                                
                            </span>

                            {isExpanded && (
                                <ul className={styles.deviceList}>
                                    {program.dispositives.map((d) => (
                                        <li
                                            key={d._id}
                                            className={`${styles.deviceItem} ${active?._id === d._id ? styles.active : ""
                                                }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onSelect?.(d);
                                            }}
                                        >
                                            <span className={styles.iconSmall}>
                                                <RiBuilding2Line />
                                                
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
