import { useEffect, useState } from "react";
import PanelEnum from "./panelEnum";
import { createData, getData, deleteData, createSubData, deleteSubData } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import styles from '../styles/panelRoot.module.css';

const PanelRoot=({charge})=>{
    const [enums, setEnums]=useState(null)

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

    return <div className={styles.contenedor}>
        <h2>Panel de root</h2>
        {enums!=null && !!enums.jobs && <PanelEnum type={'Jobs'} addEnum={(type,data)=>addEnum(type,data)} data={enums.jobs} delEnum={(type,data)=>delEnum(type,data)} createSubCategory={(id,name, type)=>createSubCategory(id,name, type)}  delSubCategory={(idCategoria, text, type)=>delSubCategory(idCategoria, text, type)}></PanelEnum>}
        {enums!=null && !!enums.provinces && <PanelEnum type={'Provinces'} addEnum={(type,data)=>addEnum(type,data)} data={enums.provinces} delEnum={(type,data)=>delEnum(type,data)} createSubCategory={(id,name, type)=>createSubCategory(id,name, type)}  delSubCategory={(idCategoria, text, type)=>delSubCategory(idCategoria, text, type)}></PanelEnum>}
        {enums!=null && !!enums.work_schedule && <PanelEnum type={'Work_schedule'} addEnum={(type,data)=>addEnum(type,data)} data={enums.work_schedule} delEnum={(type,data)=>delEnum(type,data)} createSubCategory={(id,name, type)=>createSubCategory(id,name, type)}  delSubCategory={(idCategoria, text, type)=>delSubCategory(idCategoria, text, type)}></PanelEnum>}
        {enums!=null && !!enums.studies && <PanelEnum type={'Studies'} addEnum={(type,data)=>addEnum(type,data)} data={enums.studies} delEnum={(type,data)=>delEnum(type,data)} createSubCategory={(id,name, type)=>createSubCategory(id,name, type)} delSubCategory={(idCategoria, text, type)=>delSubCategory(idCategoria, text, type)}></PanelEnum>}
    </div>
}

export default PanelRoot;