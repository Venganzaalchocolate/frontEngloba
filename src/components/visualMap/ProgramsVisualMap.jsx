import { useEffect, useMemo, useRef, useState } from 'react';
import html2canvas from 'html2canvas';
import styles from '../styles/programsVisualMap.module.css';
import { getProgramsAndDispositiveEnums } from '../../lib/data';

const COVER_IMAGE = '/img/personas.jpg';
const FOOTER_LOGO = '/graphic/logotipo.png';

const AREA_CONFIG = {
    'infancia y juventud': {
        label: 'Infancia y juventud',
        logo: '/img/logo_infancia_y_juventud.png',
        color: '#BEC3F4',
        soft: '#F3F4FF'
    },
    igualdad: {
        label: 'Igualdad',
        logo: '/img/logo_igualdad.png',
        color: '#4F529F',
        soft: '#E7E8F6'
    },
    'personas con discapacidad': {
        label: 'Personas con discapacidad',
        logo: '/img/logo_personas_con_discapacidad.png',
        color: '#F5B136',
        soft: '#FFF4D8'
    },
    'desarrollo comunitario': {
        label: 'Desarrollo comunitario',
        logo: '/img/logo_desarrollo_comunitario.png',
        color: '#F3853A',
        soft: '#FFF0E7'
    },
    migraciones: {
        label: 'Migraciones',
        logo: '/img/logo_migraciones.png',
        color: '#19A8C2',
        soft: '#E6F8FB'
    },
    mayores: {
        label: 'Mayores',
        logo: '/img/logo_mayores.png',
        color: '#94AA51',
        soft: '#F0F4E4'
    },
    lgtbiq: {
        label: 'LGTBIQ+',
        logo: '/img/logo_lgtbiq.png',
        color: '#E08FA7',
        soft: '#FCEAF0'
    }
};

const AREA_ORDER = [
    'infancia y juventud',
    'igualdad',
    'personas con discapacidad',
    'desarrollo comunitario',
    'migraciones',
    'mayores',
    'lgtbiq'
];

const normalizeText = (value = '') => value
    .toString()
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');

const normalizeAreaKey = (value = '') => {
    const normalized = normalizeText(value);

    if (normalized.includes('infancia')) return 'infancia y juventud';
    if (normalized.includes('igualdad')) return 'igualdad';
    if (normalized.includes('discapacidad')) return 'personas con discapacidad';
    if (normalized.includes('desarrollo')) return 'desarrollo comunitario';
    if (normalized.includes('migraciones')) return 'migraciones';
    if (normalized.includes('mayores')) return 'mayores';
    if (normalized.includes('lgtbi')) return 'lgtbiq';
    if (normalized.includes('general')) return 'general';

    return normalized;
};

const getIndexArray = (index) => Object.values(index || {});

const isActiveProgram = (program) => {
    return program.active !== false && program.type === 'program';
};

const isActiveDispositive = (dispositive) => {
    return dispositive.active !== false && dispositive.type === 'dispositive';
};

const shouldHideProgram = (program) => {
    const name = normalizeText(program.name);
    const area = normalizeAreaKey(program.area);

    if (!name) return true;
    if (name === 'prueba') return true;
    if (name.includes('engloba gestion')) return true;
    if (area === 'general') return true;

    return false;
};

const getAreaOrder = (areaKey) => {
    const index = AREA_ORDER.indexOf(areaKey);
    return index === -1 ? 999 : index;
};

const getToday = () => new Date().toLocaleDateString('es-ES');

const preloadImage = (src) => {
    return new Promise((resolve) => {
        if (!src) {
            resolve();
            return;
        }

        const image = new Image();

        image.onload = resolve;
        image.onerror = resolve;
        image.src = src;
    });
};

const preloadImages = async (sources = []) => {
    const uniqueSources = [...new Set(sources.filter(Boolean))];
    await Promise.all(uniqueSources.map(preloadImage));
};

export default function ProgramsVisualMap({ enumsData, charge }) {
    const landscapeRef = useRef(null);

    const [openProgramId, setOpenProgramId] = useState(null);
    const [imagesReady, setImagesReady] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [mapEnumsData, setMapEnumsData] = useState(null);

    const data = enumsData || mapEnumsData;

    useEffect(() => {
        let mounted = true;

        const loadProgramsMapData = async () => {
            if (enumsData) {
                setMapEnumsData(null);
                return;
            }

            if (typeof charge === 'function') charge(true);

            try {
                const result = await getProgramsAndDispositiveEnums();

                if (mounted) {
                    setMapEnumsData(result);
                }
            } catch (error) {
                console.error('Error cargando programas y dispositivos:', error);
            } finally {
                if (typeof charge === 'function') charge(false);
            }
        };

        loadProgramsMapData();

        return () => {
            mounted = false;
        };
    }, [enumsData]);

    const dispositivesByProgram = useMemo(() => {
        const dispositives = getIndexArray(data?.dispositiveIndex)
            .filter(isActiveDispositive);

        return dispositives.reduce((acc, dispositive) => {
            if (!dispositive.program) return acc;

            if (!acc[dispositive.program]) acc[dispositive.program] = [];

            acc[dispositive.program].push({
                _id: dispositive._id,
                name: dispositive.name,
                province: data?.provincesIndex?.[dispositive.province]?.name || ''
            });

            return acc;
        }, {});
    }, [data]);

    const totalDispositives = useMemo(() => {
        return Object.values(data?.dispositiveIndex || {})
            .filter((dispositive) => (
                dispositive.active !== false &&
                dispositive.type === 'dispositive'
            ))
            .length;
    }, [data]);

    const groupedAreas = useMemo(() => {
        const programs = getIndexArray(data?.programsIndex)
            .filter(isActiveProgram)
            .filter((program) => !shouldHideProgram(program));

        const grouped = programs.reduce((acc, program) => {
            const areaKey = normalizeAreaKey(program.area);

            if (!AREA_CONFIG[areaKey]) {
                console.log('Área no reconocida:', areaKey, program);
                return acc;
            }

            if (!acc[areaKey]) {
                acc[areaKey] = {
                    key: areaKey,
                    ...AREA_CONFIG[areaKey],
                    programs: []
                };
            }

            acc[areaKey].programs.push({
                _id: program._id,
                name: program.name,
                acronym: program.acronym,
                dispositives: (dispositivesByProgram[program._id] || [])
                    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
            });

            return acc;
        }, {});

        return Object.values(grouped)
            .map((area) => ({
                ...area,
                programs: area.programs.sort((a, b) => a.name.localeCompare(b.name, 'es'))
            }))
            .sort((a, b) => getAreaOrder(a.key) - getAreaOrder(b.key));
    }, [data, dispositivesByProgram]);

    const totalPrograms = useMemo(() => {
        return groupedAreas.reduce((acc, area) => acc + area.programs.length, 0);
    }, [groupedAreas]);

    const imageSources = useMemo(() => {
        return [
            COVER_IMAGE,
            FOOTER_LOGO,
            ...groupedAreas.map((area) => area.logo)
        ];
    }, [groupedAreas]);

    useEffect(() => {
        let mounted = true;

        if (!data) {
            setImagesReady(false);
            return () => {
                mounted = false;
            };
        }

        setImagesReady(false);

        preloadImages(imageSources).then(() => {
            if (mounted) setImagesReady(true);
        });

        return () => {
            mounted = false;
        };
    }, [data, imageSources]);

    useEffect(() => {
        if (typeof charge !== 'function') return;

        charge(!data || !imagesReady || exporting);

        return () => charge(false);
    }, [data, imagesReady, exporting]);

    const exportImage = async (ref, fileName = 'programas-activos-horizontal.png') => {
        if (!ref.current || !data || !imagesReady || exporting) return;

        try {
            setExporting(true);

            const element = ref.current;

            const canvas = await html2canvas(element, {
                scale: 2,
                backgroundColor: '#ffffff',
                useCORS: true,
                scrollX: 0,
                scrollY: 0,
                width: element.scrollWidth,
                height: element.scrollHeight,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            const image = canvas.toDataURL('image/png');

            const link = document.createElement('a');
            link.href = image;
            link.download = fileName;
            link.click();
        } catch (error) {
            console.error('Error exportando imagen:', error);
        } finally {
            setExporting(false);
        }
    };

    return (
        <section className={styles.contenedor}>
            <div className={styles.actions}>
                <button
                    type="button"
                    onClick={() => exportImage(landscapeRef, 'programas-activos-horizontal.png')}
                    disabled={!data || !imagesReady || exporting}
                >
                    {!data && 'Cargando datos...'}
                    {data && !imagesReady && 'Cargando imágenes...'}
                    {data && imagesReady && exporting && 'Exportando...'}
                    {data && imagesReady && !exporting && 'Exportar imagen'}
                </button>
            </div>

            {data && imagesReady && (
                <ProgramsInfographicView
                    areas={groupedAreas}
                    totalPrograms={totalPrograms}
                    totalDispositives={totalDispositives}
                    openProgramId={openProgramId}
                    setOpenProgramId={setOpenProgramId}
                />
            )}

            {data && imagesReady && (
                <div className={styles.exportHidden}>
                    <ProgramsInfographicView
                        refProp={landscapeRef}
                        areas={groupedAreas}
                        totalPrograms={totalPrograms}
                        totalDispositives={totalDispositives}
                        exportMode
                    />
                </div>
            )}
        </section>
    );
}

function ProgramsInfographicView({
    refProp,
    areas,
    totalPrograms,
    totalDispositives,
    exportMode = false,
    openProgramId,
    setOpenProgramId
}) {
    const handleProgramClick = (program) => {
        if (exportMode) return;
        if (!program.dispositives.length) return;

        setOpenProgramId((current) => current === program._id ? null : program._id);
    };

    return (
        <article
            ref={refProp}
            className={`${styles.sheet} ${styles.sheetLandscape} ${exportMode ? styles.sheetExport : ''}`}
        >
            <header
                className={styles.cover}
                style={{ '--cover-image': `url("${COVER_IMAGE}")` }}
            >
                <div className={styles.coverOverlay} />

                <div className={styles.coverTitle}>
                    <span />

                    <div>
                        <p>Áreas</p>
                    </div>
                </div>

                <div className={styles.coverStats}>
                    <div className={styles.coverStatsMain}>
                        <strong>{totalPrograms}</strong>
                        <span>programas activos</span>
                    </div>

                    <div className={styles.coverStatsSecondary}>
                        <strong>{totalDispositives}</strong>
                        <span>dispositivos activos</span>
                    </div>

                    <small>Actualizado el {getToday()}</small>
                </div>
            </header>

            <main className={styles.areaColumns}>
                {areas.map((area) => (
                    <section
                        key={area.key}
                        className={styles.areaBlock}
                        style={{
                            '--area-color': area.color,
                            '--area-soft': area.soft
                        }}
                    >
                        <div className={styles.areaLogoBox}>
                            <img src={area.logo} alt={area.label} />
                        </div>

                        <div className={styles.programsList}>
                            {area.programs.map((program) => {
                                const isOpen = openProgramId === program._id;
                                const hasDispositives = program.dispositives.length > 0;

                                return (
                                    <div
                                        key={program._id}
                                        className={`${styles.programWrapper} ${isOpen ? styles.programWrapperOpen : ''}`}
                                    >
                                        <button
                                            type="button"
                                            className={`${styles.programItem} ${hasDispositives && !exportMode ? styles.programItemClickable : ''}`}
                                            onClick={() => handleProgramClick(program)}
                                            disabled={exportMode || !hasDispositives}
                                            title={hasDispositives && !exportMode ? 'Ver dispositivos' : ''}
                                        >
                                            <span className={`${styles.triangle} ${isOpen ? styles.triangleOpen : ''}`}>
                                                ▶
                                            </span>

                                            <p>
                                                {program.acronym && <strong>{program.acronym}: </strong>}
                                                {program.name}
                                            </p>

                                            {hasDispositives && !exportMode && (
                                                <em>{program.dispositives.length}</em>
                                            )}
                                        </button>

                                        {!exportMode && hasDispositives && (
                                            <div
                                                className={`${styles.dispositivesPanel} ${isOpen ? styles.dispositivesPanelOpen : ''}`}
                                            >
                                                <div className={styles.dispositivesList}>
                                                    {program.dispositives.map((dispositive) => (
                                                        <div
                                                            key={dispositive._id}
                                                            className={styles.dispositiveItem}
                                                        >
                                                            <span />

                                                            <p>
                                                                {dispositive.name}

                                                                {dispositive.province && (
                                                                    <small>{dispositive.province}</small>
                                                                )}
                                                            </p>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>

                        <div className={styles.areaFooterBar} />
                    </section>
                ))}
            </main>

            <footer className={styles.sheetFooter}>
                <img
                    src={FOOTER_LOGO}
                    alt="Asociación Engloba"
                    className={styles.footerLogo}
                />

                <span>Ecosistema de programas activos por áreas de actuación</span>
            </footer>
        </article>
    );
}