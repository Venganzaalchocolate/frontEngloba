import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import styles from "../styles/organizationChart.module.css";
import { organizationChart } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

const fullName = (u) =>
    `${u?.firstName || ""} ${u?.lastName || ""}`.trim() || u?.fullName || "Sin nombre";

const uniqueById = (arr = []) => {
    const map = new Map();
    arr.forEach((x) => {
        if (!x?._id) return;
        map.set(String(x._id), x);
    });
    return [...map.values()];
};

const sortPeople = (arr = []) =>
    [...arr].sort((a, b) =>
        `${a?.lastName || ""} ${a?.firstName || ""}`.localeCompare(
            `${b?.lastName || ""} ${b?.firstName || ""}`,
            "es",
            { sensitivity: "base" }
        )
    );

const sortDevices = (arr = []) =>
    [...arr].sort((a, b) =>
        `${a?.name || ""}`.localeCompare(`${b?.name || ""}`, "es", {
            sensitivity: "base",
        })
    );

const normalizeText = (v = "") =>
    String(v)
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();

function RolePill({ children, variant = "default" }) {
    return <span className={`${styles.rolePill} ${styles[`pill_${variant}`]}`}>{children}</span>;
}

function UserMiniCard({ user, variant = "default" }) {
    return (
        <div className={`${styles.userMiniCard} ${styles[`userMiniCard_${variant}`]}`}>
            <div className={styles.userMiniName}>{fullName(user)}</div>
            {!!user?.email && <div className={styles.userMiniEmail}>{user.email}</div>}
        </div>
    );
}

function ScopeRolesBlock({
    title,
    subtitle = "",
    supervisors = [],
    responsibles = [],
    coordinators = [],
}) {
    return (
        <div className={styles.scopeRolesBlock}>
            <div className={styles.scopeRolesHeader}>
                <div>
                    <h4>{title}</h4>
                    {!!subtitle && <p>{subtitle}</p>}
                </div>
            </div>

            <div className={styles.supervisorTopBlock}>
                <RolePill variant="supervisor">Supervisores</RolePill>
                <div className={styles.supervisorTopBody}>
                    {supervisors.length ? (
                        sortPeople(supervisors).map((u) => (
                            <UserMiniCard key={`sup-${u._id}`} user={u} variant="supervisor" />
                        ))
                    ) : (
                        <div className={styles.emptyMini}>Sin supervisores</div>
                    )}
                </div>
            </div>

            <div className={styles.scopeRolesGridTwo}>
                <div className={`${styles.roleColumn} ${styles.roleColumn_responsible}`}>
                    <RolePill variant="responsible">Responsables</RolePill>
                    <div className={styles.roleColumnBody}>
                        {responsibles.length ? (
                            sortPeople(responsibles).map((u) => (
                                <UserMiniCard key={`resp-${u._id}`} user={u} variant="responsible" />
                            ))
                        ) : (
                            <div className={styles.emptyMini}>Sin responsables</div>
                        )}
                    </div>
                </div>

                <div className={`${styles.roleColumn} ${styles.roleColumn_coordinator}`}>
                    <RolePill variant="coordinator">Coordinadores</RolePill>
                    <div className={styles.roleColumnBody}>
                        {coordinators.length ? (
                            sortPeople(coordinators).map((u) => (
                                <UserMiniCard key={`coord-${u._id}`} user={u} variant="coordinator" />
                            ))
                        ) : (
                            <div className={styles.emptyMini}>Sin coordinadores</div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StructureView({ programs = [], sectionRefs, highlightKey }) {
    if (!programs.length) {
        return <div className={styles.emptyState}>No hay programas para mostrar.</div>;
    }

    return (
        <div className={styles.structureView}>
            {programs.map((program) => {
                const devices = sortDevices(Array.isArray(program?.dispositives) ? program.dispositives : []);
                const programKey = `program-${program._id}`;

                return (
                    <section
                        key={program._id}
                        className={`${styles.programSection} ${highlightKey === programKey ? styles.highlightSection : ""
                            }`}
                        ref={(el) => {
                            if (el) sectionRefs.current[programKey] = el;
                        }}
                    >
                        <div className={styles.programMainCard}>
                            <div className={styles.programMainHeader}>
                                <div className={styles.programBadge}>Programa</div>
                                <h3>{program?.acronym || program?.name || "Programa"}</h3>
                                {program?.name && program?.acronym && (
                                    <p className={styles.programSubname}>{program.name}</p>
                                )}
                                {!!program?.area && <p className={styles.programArea}>{program.area}</p>}
                            </div>

                            <ScopeRolesBlock
                                title="Equipo del programa"
                                supervisors={uniqueById(program?.supervisors || [])}
                                responsibles={uniqueById(program?.responsibles || [])}
                                coordinators={uniqueById(program?.coordinators || [])}
                            />
                        </div>

                        <div className={styles.devicesColumn}>
                            <div className={styles.devicesColumnTitle}>Dispositivos</div>

                            {devices.length ? (
                                devices.map((device) => {
                                    const deviceKey = `device-${device._id}`;

                                    return (
                                        <div
                                            key={device._id}
                                            className={`${styles.deviceRow} ${highlightKey === deviceKey ? styles.highlightSection : ""
                                                }`}
                                            ref={(el) => {
                                                if (el) sectionRefs.current[deviceKey] = el;
                                            }}
                                        >
                                            <div className={styles.deviceNameRail}>
                                                <div className={styles.deviceConnector} />
                                                <div className={styles.deviceNameBox}>{device?.name || "Dispositivo"}</div>
                                            </div>

                                            <div className={styles.deviceCard}>
                                                <div className={styles.deviceCardHeader}>
                                                    <div className={styles.deviceBadge}>Dispositivo</div>
                                                    <h4>{device?.name || "Dispositivo"}</h4>
                                                    {!!device?.province?.name && <p>{device.province.name}</p>}
                                                </div>

                                                <ScopeRolesBlock
                                                    title="Equipo del dispositivo"
                                                    subtitle={program?.acronym || program?.name || ""}
                                                    supervisors={uniqueById(device?.supervisors || [])}
                                                    responsibles={uniqueById(device?.responsibles || [])}
                                                    coordinators={uniqueById(device?.coordinators || [])}
                                                />
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className={styles.emptyDevices}>Este programa no tiene dispositivos.</div>
                            )}
                        </div>
                    </section>
                );
            })}
        </div>
    );
}

export default function OrganizationChart({ modal, charge }) {
    const [programs, setPrograms] = useState([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState("");
    const [highlightKey, setHighlightKey] = useState("");

    const sectionRefs = useRef({});
    const searchBoxRef = useRef(null);
    const autoScrollTimeoutRef = useRef(null);
    const highlightTimeoutRef = useRef(null);

    const loadChart = useCallback(async () => {
        try {
            setLoading(true);
            charge?.(true);

            const token = getToken();
            const res = await organizationChart({ activeOnly: true }, token);

            if (!res || res.error) {
                modal?.("Error", res?.message || "No se pudo cargar el organigrama.");
                return;
            }

            const sortedPrograms = [...(Array.isArray(res?.programs) ? res.programs : [])].sort((a, b) =>
                `${a?.acronym || a?.name || ""}`.localeCompare(`${b?.acronym || b?.name || ""}`, "es", {
                    sensitivity: "base",
                })
            );

            setPrograms(sortedPrograms);
        } catch (e) {
            modal?.("Error", e?.message || "No se pudo cargar el organigrama.");
        } finally {
            setLoading(false);
            charge?.(false);
        }
    }, []);

    useEffect(() => {
        loadChart();
    }, [loadChart]);

    const searchResults = useMemo(() => {
        const q = normalizeText(search);
        if (!q) return [];

        const result = [];

        programs.forEach((program) => {
            const programText = `${program?.acronym || ""} ${program?.name || ""} ${program?.area || ""}`;
            if (normalizeText(programText).includes(q)) {
                result.push({
                    key: `program-${program._id}`,
                    label: `Programa · ${program?.acronym || program?.name || ""}${program?.name && program?.acronym ? ` (${program.name})` : ""}`,
                    type: "program",
                });
            }

            (program?.dispositives || []).forEach((device) => {
                const deviceText = `${device?.name || ""} ${program?.acronym || ""} ${program?.name || ""} ${device?.province?.name || ""}`;
                if (normalizeText(deviceText).includes(q)) {
                    result.push({
                        key: `device-${device._id}`,
                        label: `Dispositivo · ${device?.name || ""} · ${program?.acronym || program?.name || ""}`,
                        type: "device",
                    });
                }
            });
        });

        return result.slice(0, 12);
    }, [programs, search]);

    const goToSection = useCallback((key) => {
        const el = sectionRefs.current[key];
        if (!el) return;

        const stickyOffset = searchBoxRef.current?.offsetHeight || 100;
        const top = el.getBoundingClientRect().top + window.scrollY - stickyOffset - 16;

        setHighlightKey(key);
        clearTimeout(highlightTimeoutRef.current);
        highlightTimeoutRef.current = setTimeout(() => {
            setHighlightKey("");
        }, 1800);

        window.scrollTo({
            top,
            behavior: "smooth",
        });
    }, []);

    useEffect(() => {
        if (!search.trim()) {
            setHighlightKey("");
            clearTimeout(autoScrollTimeoutRef.current);
            return;
        }

        if (!searchResults.length) return;

        clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = setTimeout(() => {
            goToSection(searchResults[0].key);
        }, 250);

        return () => clearTimeout(autoScrollTimeoutRef.current);
    }, [search, searchResults, goToSection]);

    useEffect(() => {
        return () => {
            clearTimeout(autoScrollTimeoutRef.current);
            clearTimeout(highlightTimeoutRef.current);
        };
    }, []);

    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <div className={styles.wrapper}>
                    <div className={styles.header}>
                        <div>
                            <h2>ORGANIGRAMA</h2>
                            <p>Vista estructurada por programas y dispositivos.</p>
                        </div>

                        <div className={styles.actions}>
                            <button type="button" className={styles.btn} onClick={loadChart}>
                                Recargar
                            </button>
                        </div>
                    </div>

                    <div ref={searchBoxRef} className={styles.stickySearchBox}>
                        <div className={styles.searchInputWrap}>
                            <input
                                type="text"
                                className={styles.searchInput}
                                placeholder="Buscar programa o dispositivo..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />

                            {!!search && (
                                <button
                                    type="button"
                                    className={styles.clearSearchBtn}
                                    onClick={() => setSearch("")}
                                    aria-label="Limpiar búsqueda"
                                >
                                    ×
                                </button>
                            )}
                        </div>

                        {!!search.trim() && !!searchResults.length && (
                            <div className={styles.searchResultsDropdown}>
                                {searchResults.map((item) => (
                                    <button
                                        key={item.key}
                                        type="button"
                                        className={styles.searchResultItem}
                                        onClick={() => goToSection(item.key)}
                                    >
                                        {item.label}
                                    </button>
                                ))}
                            </div>
                        )}

                        {!!search.trim() && !searchResults.length && (
                            <div className={styles.searchResultsDropdown}>
                                <div className={styles.noSearchResults}>No se han encontrado coincidencias.</div>
                            </div>
                        )}
                    </div>

                    <div className={styles.legend}>
                        <span><i className={`${styles.legendDot} ${styles.dotProgram}`} /> Programa</span>
                        <span><i className={`${styles.legendDot} ${styles.dotDispositive}`} /> Dispositivo</span>
                        <span><i className={`${styles.legendDot} ${styles.dotSupervisor}`} /> Supervisor</span>
                        <span><i className={`${styles.legendDot} ${styles.dotResponsible}`} /> Responsable</span>
                        <span><i className={`${styles.legendDot} ${styles.dotCoordinator}`} /> Coordinador</span>
                    </div>

                    <div className={styles.content}>
                        {loading ? (
                            <div className={styles.emptyState}>Cargando organigrama…</div>
                        ) : (
                            <StructureView
                                programs={programs}
                                sectionRefs={sectionRefs}
                                highlightKey={highlightKey}
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}