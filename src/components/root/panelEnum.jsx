import { useState } from "react";
import { FaEdit, FaTrashAlt, FaPlusSquare, FaAngleDoubleRight, FaAngleRight  } from "react-icons/fa";

import styles from '../styles/panelEnum.module.css';


const PanelEnum=({type, addEnum, data, delEnum, createSubCategory, delSubCategory})=>{
    const [text, setText]=useState('')
    const [create, setCreate]=useState(false)
    const [createSub, setCreateSub]=useState(false)

    const handleChange=(e)=>{
        setText(e.target.value)
    }

    const deleteEnum=(id)=>{
        delEnum(type, id)
    }

    const createEnum=()=>{
        addEnum(type, text)
    }

    const createSubcategory=(idCategoria)=>{
        createSubCategory(idCategoria, text, type)
    }

    const deleteSubCategory=(id,idCategoria)=>{
        delSubCategory(id,idCategoria, type)
    }

    
    return <div className={styles.contenedor}>
        <h2>{type} <FaPlusSquare onClick={()=>{setCreateSub(false), setCreate(!create), setText('')}}></FaPlusSquare></h2>
        {!!create &&
        <div>
        <input type="text" onChange={(e)=>handleChange(e)} value={text}/>
        <button onClick={()=>createEnum()}>Añadir</button>    
        </div>
        }
        
        {!!data && data.length>0 &&
        data.map((x)=>{
            return <div className={styles.contenedorCategoria}>
                <FaAngleRight/>
                <p>{x.name}</p>
                <FaTrashAlt onClick={()=>deleteEnum(x._id)}></FaTrashAlt>
                <FaPlusSquare onClick={()=>{setCreateSub(x._id), setCreate(false), setText('')}} className={styles.crema}></FaPlusSquare>
                {!!createSub && x._id==createSub &&
                <div className={styles.contenedorSubcategory}>
                <input type="text" onChange={(e)=>handleChange(e)} value={text}/>
                <button onClick={()=>createSubcategory(x._id)}>Añadir Subcategoria</button>
                <button className="tomato" onClick={()=>setCreateSub(false)}>Cancelar</button>    
                </div>
                }
                {!!x.subcategories && x.subcategories.length>0 &&
                x.subcategories.map((y)=>{
                    return <div className={styles.contenedorSubCategoria}>
                        <FaAngleDoubleRight></FaAngleDoubleRight>
                        <p>{y.name}</p>
                        <FaTrashAlt onClick={()=>deleteSubCategory(x._id,y._id)}></FaTrashAlt>
                    </div>
                })
                }
            </div>
        })
        }
    </div>
}

export default PanelEnum;