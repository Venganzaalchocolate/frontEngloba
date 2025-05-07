import React, { useEffect, useState, useMemo } from 'react';
import {
    FaCircleExclamation,
    FaHourglassEnd,
    FaSquareCaretDown,
    FaSquareCaretUp
} from 'react-icons/fa6';
import styles from '../styles/ManagingAuditors.module.css';
import GenericXLSExport from '../globals/GenericXLSExport';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import ExcelJS from 'exceljs';
import { getToken } from '../../lib/serviceToken';
import { usersName } from '../../lib/data';


const display = val =>
    val !== null && val !== undefined && val !== '' ? val : 'No existe información';

const InfoAuditPanelProgramDocs = ({
    enumsData,
    selectedDocumentationFields,
    setSelectedDocumentationFields,
    result,
    runAudit,
    charge,
    userMap
}) => {
    const [programSelected, setProgramSelected] = useState(null);
    const [showExport, setShowExport] = useState(false);
    const [showExportByProgram, setShowExportByProgram] = useState(false);
    const [responsiblesProgram, setResponsiblesProgram] = useState(null);
    const [localUserMap, setLocalUserMap] = useState({}); // Renombrado para evitar conflicto

    // Obtener nombres de responsables
    useEffect(() => {
        if (!Array.isArray(result)) {
            setLocalUserMap({});
            return;
        }

        const token = getToken();
        const progIds = result.flatMap(p => p.responsible || []);

        if (progIds.length === 0) {
            setLocalUserMap({});
            return;
        }

        usersName({ ids: progIds }, token)
            .then(users => {
                const map = {};
                users.forEach(u => {
                    map[u._id] = `${u.firstName} ${u.lastName}`;
                });
                setLocalUserMap(map);
            })
            .catch(() => setLocalUserMap({}));
    }, [result]);

    const officialDocs = useMemo(() => {
        if (!enumsData?.documentation) return [];
        return enumsData.documentation
            .filter(d => d.model === 'Program')
            .map(d => ({ value: d._id.toString(), label: d.label }));
    }, [enumsData]);

    useEffect(() => {
        if (selectedDocumentationFields.length > 0) {
            runAudit({ docIds: selectedDocumentationFields });
        }
        setProgramSelected(null);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedDocumentationFields]);

    const mapDocsToLabels = (docIds, docs) =>
        docIds.map(docId => {
            const idStr = docId.toString();
            const doc = docs.find(o => o.value === idStr);
            return doc ? doc.label : idStr;
        });

    const enrichedPrograms = useMemo(() => {
        if (!Array.isArray(result)) return [];

        return result.map(program => {
            const missingDocsLabels = mapDocsToLabels(program.missingDocs || [], officialDocs);
            const expiredDocsLabels = mapDocsToLabels(program.expiredDocs || [], officialDocs);
            const responsibleNames = (program.responsible || []).map(id => localUserMap[id] || 'Desconocido');

            return {
                ...program,
                missingDocs: missingDocsLabels,
                expiredDocs: expiredDocsLabels,
                responsibleNames
            };
        });
    }, [result, officialDocs, localUserMap]);

    const xlsFieldDefs = [
        { key: 'name', label: 'Nombre del Programa', type: 'text' },
        { key: 'acronym', label: 'Acrónimo', type: 'text' },
        { key: 'responsibleNames', label: 'Responsables', type: 'array' },
        { key: 'missingDocs', label: 'Documentos faltantes', type: 'array' },
        { key: 'expiredDocs', label: 'Documentos caducados', type: 'array' }
    ];

    const handleExportByProgram = async rows => {
        const zip = new JSZip();

        for (const program of rows) {
            const wb = new ExcelJS.Workbook();
            const ws = wb.addWorksheet('Programa');

            ws.columns = xlsFieldDefs.map(def => ({
                header: def.label,
                key: def.key,
                width: 25
            }));

            ws.addRow({
                name: program.name,
                acronym: program.acronym,
                responsible: (program.responsible || []).map(id => localUserMap[id] || ''),
                missingDocs: program.missingDocs.join(', '),
                expiredDocs: program.expiredDocs.join(', ')
            });

            const buf = await wb.xlsx.writeBuffer();
            zip.file(`${program.acronym || program.name}.xlsx`, buf);
        }

        const blob = await zip.generateAsync({ type: 'blob' });
        saveAs(blob, 'programas_auditoria.zip');
        setShowExportByProgram(false);
    };

    const chargeResponsibles = async ids => {
        charge(true);
        const token = getToken();

        const users = await usersName({ ids }, token);
        if (Array.isArray(users)) setResponsiblesProgram(users);
        charge(false);
    };

    const changeProgramSelected = async p => {

        if (programSelected?._id === p._id) {
            setProgramSelected(null);
        } else {
            setProgramSelected(p);
            if (p.responsible?.length) await chargeResponsibles(p.responsible);
        }
    };

    return (
        <>
            <h3>Elige documentos esenciales a auditar</h3>
            <fieldset className={styles.fieldsetCheckbox}>
                {officialDocs.map(({ value, label }) => (
                    <label key={value} className={styles.checkboxOption}>
                        <input
                            type="checkbox"
                            checked={selectedDocumentationFields.includes(value)}
                            onChange={() =>
                                setSelectedDocumentationFields(prev =>
                                    prev.includes(value)
                                        ? prev.filter(f => f !== value)
                                        : [...prev, value]
                                )
                            }
                        />
                        {label}
                    </label>
                ))}
            </fieldset>

            {result && selectedDocumentationFields.length > 0 && (
                <div className={styles.auditResult}>
                    <h4 className={styles.sectionTitle}>
                        PROGRAMAS{' '}
                        <button onClick={() => setShowExport(true)}>Exportar XLS</button>{' '}
                        <button onClick={() => setShowExportByProgram(true)}>Exportar ZIP por Programa</button>
                    </h4>

                    {enrichedPrograms.length > 0 ? (
                        <ul className={styles.ulBlock}>
                            {enrichedPrograms.map(p => (
                                <li key={p._id} className={styles.auditItem}>
                                    <div className={styles.auditHeader}>
                                        {programSelected?._id === p._id ? (
                                            <FaSquareCaretUp onClick={() => changeProgramSelected(p)} />
                                        ) : (
                                            <FaSquareCaretDown onClick={() => changeProgramSelected(p)} />
                                        )}
                                        <span className={styles.programName}>
                                            {p.name} ({p.acronym})
                                        </span>
                                    </div>
                                    {p.missingDocs?.length > 0 && (
                                        <div className={styles.auditBody}>
                                            <div className={styles.infoRowMissing}>
                                                <FaCircleExclamation />
                                                <span className={styles.infoText}>
                                                    Documentos faltantes: {p.missingDocs.join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {p.expiredDocs?.length > 0 && (
                                        <div className={styles.auditBody}>
                                            <div className={styles.infoRowMissing}>
                                                <FaHourglassEnd />
                                                <span className={styles.infoText}>
                                                    Documentos caducados: {p.expiredDocs.join(', ')}
                                                </span>
                                            </div>
                                        </div>
                                    )}
                                    {programSelected?._id === p._id && (
                                        <div className={styles.infoAditional}>
                                            <h4>{display(p.name)}</h4>
                                            <p>
                                                <strong>Responsable:</strong>{' '}
                                                {(responsiblesProgram || []).length > 0
                                                    ? responsiblesProgram.map(u => (
                                                        <span key={u._id}>{u.firstName} {u.lastName}</span>
                                                    ))
                                                    : ' No existe información'}
                                            </p>
                                            <p>
                                                <strong>Dispositivos:</strong>{' '}
                                                {(p.devices || []).length
                                                    ? p.devices.map(d => <p key={d._id}>{d.name}</p>)
                                                    : ' No tiene dispositivos'}
                                            </p>
                                        </div>
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p>No hay programas con documentos faltantes ni caducados.</p>
                    )}

                    {showExport && (
                        <GenericXLSExport
                            data={enrichedPrograms}
                            fields={xlsFieldDefs}
                            fileName="programas_faltan_documentos.xlsx"
                            modalTitle="Exportar Programas a XLS"
                            modalMessage="Selecciona columnas para el XLS:"
                            onClose={() => setShowExport(false)}
                        />
                    )}

                    {showExportByProgram && (
                        <GenericXLSExport
                            data={enrichedPrograms}
                            fields={xlsFieldDefs}
                            modalTitle="Exportar ZIP por Programa"
                            modalMessage="Generando un archivo XLS para cada programa..."
                            onExport={handleExportByProgram}
                            onClose={() => setShowExportByProgram(false)}
                        />
                    )}
                </div>
            )}
        </>
    );
};

export default InfoAuditPanelProgramDocs;
