import React, { useState, useEffect } from 'react';
import { 
    createProgram, 
    getPrograms, 
    updateProgram, 
    deleteProgram, 
    createDispositive, 
    updateDispositive, 
    deleteDispositive 
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import styles from '../styles/panelRoot.module.css';

const ProgramManagementPanel = ({ enums }) => {
    const [programs, setPrograms] = useState([]);
    const [programData, setProgramData] = useState({
        name: '',
        acronym: '',
        funding: ''
    });
    const [dispositiveData, setDispositiveData] = useState({
        name: '',
        address: '',
        responsible: ''
    });
    const [selectedProgram, setSelectedProgram] = useState(null);
    const [selectedDispositive, setSelectedDispositive] = useState(null);
    const [editMode, setEditMode] = useState(false);
    const [activeCreateProgram, setActiveCreateProgram] = useState(false); // Estado para crear programa
    const [activeCreateDispositive, setActiveCreateDispositive] = useState(null); // Estado para crear dispositivo
    const [activeEditProgram, setActiveEditProgram] = useState(null);  // Estado para editar programa
    const [activeEditDispositive, setActiveEditDispositive] = useState(null); // Estado para editar dispositivo
    const [confirmDeleteProgram, setConfirmDeleteProgram] = useState(null); // Estado para confirmar borrado de programa
    const [confirmDeleteDispositive, setConfirmDeleteDispositive] = useState(null); // Estado para confirmar borrado de dispositivo

    useEffect(() => {
        loadPrograms();
    }, []);

    const loadPrograms = async () => {
        const token = getToken();
        const result = await getPrograms(token);
        if (!result.error) {
            setPrograms(result);
        }
    };

    const handleChangeProgramData = (e) => {
        setProgramData({
            ...programData,
            [e.target.name]: e.target.value
        });
    };

    const handleChangeDispositiveData = (e) => {
        setDispositiveData({
            ...dispositiveData,
            [e.target.name]: e.target.value
        });
    };

    const handleProgramCreate = async () => {
        const token = getToken();
        const result = await createProgram(programData, token);
        if (!result.error) {
            setProgramData({ name: '', acronym: '', funding: '' });
            setActiveCreateProgram(false);
            loadPrograms();
        }
    };

    const handleProgramUpdate = async () => {
        console.log(selectedProgram)

        const token = getToken();
        const result = await updateProgram({ _id: selectedProgram._id, ...programData }, token);
        if (!result.error) {
            setProgramData({ name: '', acronym: '', funding: '' });
            setSelectedProgram(null);
            setEditMode(false);
            setActiveEditProgram(null);
            loadPrograms();
        }
    };
    

    const handleProgramDelete = async (programId) => {
        const token = getToken();
        const result = await deleteProgram({ id: programId }, token);
        if (!result.error) {
            loadPrograms();
            setSelectedProgram(null);
            setConfirmDeleteProgram(null);
        }
    };

    const handleDispositiveCreate = async (program) => {
        const token = getToken();
        const result = await createDispositive({ ...dispositiveData, _id: program._id }, token);
        if (!result.error) {
            setDispositiveData({ name: '', address: '', responsible: '' });
            setActiveCreateDispositive(null);
            loadPrograms();
        }
    };

    const handleDispositiveUpdate = async (program) => {
        const token = getToken();
        const result = await updateDispositive({ programId: program._id, dispositiveId: selectedDispositive._id, ...dispositiveData }, token);
        if (!result.error) {
            setDispositiveData({ name: '', address: '', responsible: '' });
            setSelectedDispositive(null);
            setActiveEditDispositive(null);
            loadPrograms();
        }
    };

    const handleDispositiveDelete = async (program,device) => {
        const token = getToken();
        const result = await deleteDispositive({ programId: program._id, dispositiveId:device._id }, token);
        if (!result.error) {
            loadPrograms();
            setConfirmDeleteDispositive(null);
        }
    };

    const createDispositiveButton=(program)=>{
        setSelectedProgram(program);
        setDispositiveData({ name: '', address: '', responsible: '' });
        setActiveCreateDispositive(program._id);
        setEditMode(false);
        setActiveEditDispositive(null);
        setConfirmDeleteDispositive(null); // Cerrar confirmación de borrado de dispositivo si estaba abierta
    }

    const editProgram=(program)=>{
        setSelectedProgram(program);
        setProgramData({ name: program.name, acronym: program.acronym, funding: program.funding });
        setEditMode(true);
        setActiveEditProgram(program._id);
        setConfirmDeleteProgram(null); // Cerrar confirmación de borrado si estaba abierta
        setActiveCreateDispositive(null); // Cerrar creación de dispositivo si estaba abierta
    }

    const editDispositiveButton=(program, device)=>{
            setSelectedProgram(program)
            setSelectedDispositive(device);
            setDispositiveData({ name: device.name, address: device.address, responsible: device.responsible });
            setEditMode(true);
            setActiveEditDispositive(device._id);
            setConfirmDeleteDispositive(null); // Cerrar confirmación de borrado si estaba abierta
        
    }

    const renderTree = () => {
        return programs.map(program => (
            <div key={program._id} className={styles.programContainer}>
                <div className={styles.programHeader}>
                    <span>{program.name}</span>
                    <button onClick={() => editProgram(program)}>Editar</button>
                    <button onClick={() => setConfirmDeleteProgram(program._id)}>Borrar</button>
                    <button onClick={() => createDispositiveButton(program)}>Crear Dispositivo</button>
                </div>

                {confirmDeleteProgram === program._id && (
                    <div className={styles.confirmDelete}>
                        <p>¿Estás seguro de que quieres borrar este programa?</p>
                        <button onClick={() => handleProgramDelete(program._id)}>Sí</button>
                        <button onClick={() => setConfirmDeleteProgram(null)}>No</button>
                    </div>
                )}

                {activeEditProgram === program._id && editMode && (
                    <div className={styles.formContainer}>
                        <h3>Editar Programa</h3>
                        <input type="text" name="name" placeholder="Nombre" value={programData.name} onChange={handleChangeProgramData} />
                        <input type="text" name="acronym" placeholder="Acrónimo" value={programData.acronym} onChange={handleChangeProgramData} />
                        <select name="funding" value={programData.funding} onChange={handleChangeProgramData}>
                            <option value="">Selecciona una financiación</option>
                            {enums.finantial && enums.finantial.map(fund => (
                                <option key={fund._id} value={fund._id}>{fund.name}</option>
                            ))}
                        </select>
                        <button onClick={handleProgramUpdate}>Actualizar Programa</button>
                        <button onClick={() => {
                            setActiveEditProgram(null);
                            setEditMode(false);
                        }}>Cerrar</button>
                    </div>
                )}

                {activeCreateDispositive === program._id && (
                    <div className={styles.formContainer}>
                        <h3>Crear Dispositivo</h3>
                        <input type="text" name="name" placeholder="Nombre del Dispositivo" value={dispositiveData.name} onChange={handleChangeDispositiveData} />
                        <input type="text" name="address" placeholder="Dirección" value={dispositiveData.address} onChange={handleChangeDispositiveData} />
                        <input type="text" name="responsible" placeholder="Responsable" value={dispositiveData.responsible} onChange={handleChangeDispositiveData} />
                        <button onClick={()=>handleDispositiveCreate(program)}>Crear Dispositivo</button>
                        <button onClick={() => setActiveCreateDispositive(null)}>Cerrar</button>
                    </div>
                )}

                <div className={styles.deviceList}>
                    {program.devices.map(device => (
                        <div key={device._id} className={styles.deviceItem}>
                            <span>{device.name}</span>
                            <button onClick={() => editDispositiveButton(program,device)}>Editar</button>
                            <button onClick={() => setConfirmDeleteDispositive(device._id)}>Borrar</button>

                            {confirmDeleteDispositive === device._id && (
                                <div className={styles.confirmDelete}>
                                    <p>¿Estás seguro de que quieres borrar este dispositivo?</p>
                                    <button onClick={() => handleDispositiveDelete(program,device)}>Sí</button>
                                    <button onClick={() => setConfirmDeleteDispositive(null)}>No</button>
                                </div>
                            )}

                            {activeEditDispositive === device._id && editMode && (
                                <div className={styles.formContainer}>
                                    <h3>Editar Dispositivo</h3>
                                    <input type="text" name="name" placeholder="Nombre" value={dispositiveData.name} onChange={handleChangeDispositiveData} />
                                    <input type="text" name="address" placeholder="Dirección" value={dispositiveData.address} onChange={handleChangeDispositiveData} />
                                    <input type="text" name="responsible" placeholder="Responsable" value={dispositiveData.responsible} onChange={handleChangeDispositiveData} />
                                    <button onClick={()=>handleDispositiveUpdate(program)}>Actualizar Dispositivo</button>
                                    <button onClick={() => {
                                        setActiveEditDispositive(null);
                                        setEditMode(false);
                                    }}>Cerrar</button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        ));
    };

    return (
        <div className={styles.panelContainer}>
            <h3>Gestión de Programas y Dispositivos</h3>
            <button onClick={() => {
                setSelectedProgram(null);
                setProgramData({ name: '', acronym: '', funding: '' });
                setEditMode(false);
                setActiveEditProgram(null);
                setActiveCreateProgram(true);
            }}>Crear Programa</button>

            {activeCreateProgram && (
                <div className={styles.formContainer}>
                    <h3>Crear Programa</h3>
                    <input type="text" name="name" placeholder="Nombre del Programa" value={programData.name} onChange={handleChangeProgramData} />
                    <input type="text" name="acronym" placeholder="Acrónimo" value={programData.acronym} onChange={handleChangeProgramData} />
                    <select name="funding" value={programData.funding} onChange={handleChangeProgramData}>
                        <option value="">Selecciona una financiación</option>
                        {enums.finantial && enums.finantial.map(fund => (
                            <option key={fund._id} value={fund._id}>{fund.name}</option>
                        ))}
                    </select>
                    <button onClick={handleProgramCreate}>Crear Programa</button>
                    <button onClick={() => setActiveCreateProgram(false)}>Cerrar</button>
                </div>
            )}

            {renderTree()}
        </div>
    );
};

export default ProgramManagementPanel;
