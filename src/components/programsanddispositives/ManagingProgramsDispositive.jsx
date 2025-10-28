import React, { useState, useMemo } from "react";
import styles from "../styles/ManagingProgramsDispositive.module.css"; // el mismo CSS que ManagingEmployer
import MenuProgramsDispositive from "./MenuProgramsDispositive";
import { getToken } from "../../lib/serviceToken";
import { getDispositiveId, getProgramId } from "../../lib/data";
import InfoProgramOrDispositive from "./InfoProgramOrDispositive";

const ManagingProgramsDispositive = ({ modal, charge, listResponsability,  enumsData, }) => {
  const [select,setSelect]=useState(null)
  const [infoSelect, setInfoSelect]=useState(null)
  const token=getToken();

  const info=async (x)=>{
    let data={}
    charge(true)
    if(x?.type=='program'){
      data=await getProgramId({programId:x._id}, token)
      data.type='program'
    } 
    if(x?.type=='dispositive') {
      data=await getDispositiveId({dispositiveId:x._id}, token)
      data.type='dispositive'
    }
    setInfoSelect(data)
    charge(false)
  }
  const onSelect=(x)=>{
    setSelect(x)
    info(x)
  }
  

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <>
          <div className={styles.titulo}>
            <div>
              <h2>GESTIÓN DE PROGRAMAS Y DISPOSITIVOS</h2>
            </div>
            <div className={styles.botones}>
              <button className={styles.btnAdd}>+ Añadir Programa</button>
            </div>
          </div>
          <div className={styles.contenidoData}>
          <MenuProgramsDispositive modal={modal} charge={charge} listResponsability={listResponsability} enumsData={enumsData} active={select} onSelect={(x)=>onSelect(x)}/>
          <InfoProgramOrDispositive modal={modal} charge={charge} listResponsability={listResponsability} enumsData={enumsData} info={infoSelect} onSelect={(x)=>onSelect(x)}/>  
          </div>
          
        </>
      </div>
    </div>
  );
};

export default ManagingProgramsDispositive;
