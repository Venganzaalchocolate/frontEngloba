import { useEffect, useState } from "react";
import PanelEnum from "./panelEnum";
import ProgramManagement from "./ProgramManagement";
import { getData, getPrograms, createData, deleteData, createSubData, deleteSubData } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import styles from '../styles/panelRoot.module.css';

const PanelRoot = ({ charge }) => {
    const [enums, setEnums] = useState(null);
    const [optionSelected, setOptionSelected] = useState(null);
    const [enumSelected, setEnumSelected] = useState(null);
    const [programs, setPrograms] = useState(null);

    const cargarDatos = async () => {
        const enumsData = await getData();
        const programsData = await getPrograms();
        if (!enumsData.error && !programsData.error) {
            setEnums({
                jobs: enumsData.jobs,
                provinces: enumsData.provinces,
                work_schedule: enumsData.work_schedule,
                studies: enumsData.studies,
                finantial: enumsData.finantial
            });
            setPrograms(programsData);
            charge(false);
        } else {
            // Manejar error
            charge(false);
        }
    };

    useEffect(() => {
        charge(true);
        cargarDatos();
    }, []);

    const addEnum = async (type, name) => {
        const token = getToken();
        const auxData = { type, name };
        console.log(auxData)
        const result = await createData(token, auxData);
        if (!result.error) {
            cargarDatos();
        }
    };

    const delEnum = async (type, id) => {
        const token = getToken();
        const auxData = { type, id };
        const result = await deleteData(token, auxData);
        if (!result.error) {
            cargarDatos();
        }
    };

    const createSubCategory = async (id, name, type) => {
        const token = getToken();
        const auxData = { type, id, name };
        const result = await createSubData(token, auxData);
        if (!result.error) {
            cargarDatos();
        }
    };

    const delSubCategory = async (id, idCategory, type) => {
        const token = getToken();
        const auxData = { type, id, idCategory };
        const result = await deleteSubData(token, auxData);
        if (!result.error) {
            cargarDatos();
        }
    };

    const handleEnumChange = (e) => {
        setEnumSelected(e.target.value);
    };

    return (
        <div className={styles.contenedor}>
            <h2>Panel de root</h2>
            <div className={styles.menuOpciones}>
                <button onClick={() => setOptionSelected('enums')}>Enums</button>
                <button onClick={() => setOptionSelected('programs')}>Programas y dispositivos</button>
                <button onClick={() => setOptionSelected('employers')}>Trabajadores</button>
            </div>

            {optionSelected === 'enums' && enums && (
                <div>
                    <label htmlFor="enumSelect">Selecciona un Enum:</label>
                    <select id="enumSelect" value={enumSelected} onChange={handleEnumChange}>
                        <option value="">--Seleccionar--</option>
                        <option value="jobs">Trabajos disponibles</option>
                        <option value="provinces">Provincias y zonas</option>
                        <option value="work_schedule">Horarios disponibles</option>
                        <option value="studies">Estudios disponibles</option>
                        <option value="finantial">Financiación</option>
                    </select>

                    {enumSelected && (
                        <PanelEnum
                            type={enumSelected}
                            addEnum={addEnum}
                            data={enums[enumSelected]}
                            delEnum={delEnum}
                            createSubCategory={createSubCategory}
                            delSubCategory={delSubCategory}
                        />
                    )}
                </div>
            )}

            {optionSelected === 'programs' && (
                <ProgramManagement
                    enums={enums}
                    programs={programs}
                    cargarDatos={cargarDatos}
                    charge={charge}
                />
            )}

            {optionSelected && <button onClick={() => setOptionSelected(null)} className="tomato">Cerrar</button>}
        </div>
    );
};

export default PanelRoot;
