import { useEffect, useState } from "react";
import PanelEnum from "./panelEnum";
import { createData, getData, deleteData, createSubData, deleteSubData } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import styles from '../styles/panelRoot.module.css';

const PanelRoot=({charge})=>{
    const [enums, setEnums]=useState(null)
    const [optionSelected, setOptionSelected]=useState(null)
    const [enumSelected, setEnumSelected]=useState(null)
    const [programSelected, setProgramSelected]=useState(null)

    const cargarDatos=async ()=>{
        const enumsData = await getData();
        if(!enumsData.error){
        let auxEnums={}
        auxEnums['jobs']=enumsData.jobs
        auxEnums['provinces']=enumsData.provinces
        auxEnums['work_schedule']=enumsData.work_schedule
        auxEnums['studies']=enumsData.studies
        setEnums(auxEnums)    
        charge(false)
        } else {
            modal('Error','Servicio no disponible, porfavor inténtelo más tarde')
            navigate('/')
            charge(false)
        }
    }

    useEffect(()=>{
        charge(true)
        cargarDatos();
    },[])

    const addEnum=async (type, data)=>{
        const token=getToken();
        const auxData={
            type:type,
            name:data
        }
        const addData=await createData(token, auxData);
        if (!addData.error){
            charge(true)
            cargarDatos();  
        }
    }

    const delEnum=async(type,data)=>{
        const token=getToken();
        const auxData={
            type:type,
            id:data
        }
        const deleteDataAux=await deleteData(token, auxData);
        if (!deleteDataAux.error){
            charge(true)
            cargarDatos();  
        }
    }

    const createSubCategory=async (id,name, type)=>{
        const token=getToken();
        const auxData={
            type:type,
            id:id,
            name:name
        }
        const response=await createSubData(token, auxData);
        if (!response.error){
            charge(true)
            cargarDatos();  
        }
    }

    const delSubCategory=async(id,idCategory, type)=>{
        const token=getToken();
        const auxData={
            type:type,
            id:id,
            idCategory:idCategory
        }
        const deleteDataAux=await deleteSubData(token, auxData);
        if (!deleteDataAux.error){
            charge(true)
            cargarDatos();  
        }
    }

    const handleChange = (event) => {
        setEnumSelected(event.target.value);
      };

    return <div className={styles.contenedor}>
        <h2>Panel de root</h2>
        <div className={styles.menuOpciones}>
            <button onClick={()=>setOptionSelected('enums')}>Enums</button>
            <button onClick={()=>setOptionSelected('programs')}>Programas y dispositivos</button>
            <button onClick={()=>setOptionSelected('employers')}>Trabajadores</button>
        </div>
        {optionSelected!=null && optionSelected=='enums' &&
        <div>
            <label htmlFor="enum">ENUMS</label>
            <select id='enum' name="enum" onChange={handleChange} value={enumSelected}>
                <option value="Jobs">Trabajos disponibles</option>
                <option value="Provinces">Provincias y zonas</option>
                <option value="Work_schedule">Horarios disponibles</option>
                <option value="Studies">Estudios disponibles</option>
                <option value="Finantial">Financiación</option>
            </select>
            
            {enums!=null && enumSelected!=null && <PanelEnum type={enumSelected} addEnum={(type,data)=>addEnum(type,data)} data={enums[enumSelected.toLowerCase()]} delEnum={(type,data)=>delEnum(type,data)} createSubCategory={(id,name, type)=>createSubCategory(id,name, type)}  delSubCategory={(idCategoria, text, type)=>delSubCategory(idCategoria, text, type)}></PanelEnum>}
            
        </div>
        }
        {optionSelected!=null && optionSelected=='programs' &&
        <div>
            <button>Añadir Programa</button>
        </div>
        
        }
        {optionSelected!=null && <button onClick={()=>setOptionSelected(null)} className="tomato">Cerrar</button>}
        
    </div>
}

export default PanelRoot;