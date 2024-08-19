import { useState } from "react";
import { FaEdit, FaTrashAlt, FaPlusSquare, FaAngleDoubleRight, FaAngleRight } from "react-icons/fa";
import styles from '../styles/panelEnum.module.css';

const PanelEnum = ({ type, addEnum, data, delEnum, createSubCategory, delSubCategory }) => {
    const [text, setText] = useState('');
    const [create, setCreate] = useState(false);
    const [createSub, setCreateSub] = useState(null);  // Usar null para indicar que no se está creando ninguna subcategoría

    const handleChange = (e) => {
        setText(e.target.value);
    };

    const handleCreateEnum = () => {
        if (text.trim()) {
            addEnum(type, text);
            setText('');  // Limpiar el input después de añadir
            setCreate(false);  // Cerrar la sección de crear después de añadir
        }
    };

    const handleCreateSubcategory = (idCategoria) => {
        if (text.trim()) {
            createSubCategory(idCategoria, text, type);
            setText('');  // Limpiar el input después de añadir
            setCreateSub(null);  // Cerrar la sección de crear subcategoría después de añadir
        }
    };

    return (
        <div className={styles.contenedor}>
            <h2>{type} 
                <FaPlusSquare onClick={() => {
                    setCreateSub(null); 
                    setCreate(!create); 
                    setText('');
                }} 
                className={styles.crema} />
            </h2>
            {create && (
                <div>
                    <input type="text" onChange={handleChange} value={text} />
                    <button onClick={handleCreateEnum}>Añadir</button>
                </div>
            )}
            
            {!!data && data.length > 0 && data.map((x) => (
                <div key={x._id} className={styles.contenedorCategoria}>
                    <FaAngleRight />
                    <p>{x.name}</p>
                    <FaTrashAlt onClick={() => delEnum(type, x._id)} className={styles.iconoEliminar} />
                    <FaPlusSquare onClick={() => {
                        setCreateSub(x._id); 
                        setCreate(false); 
                        setText('');
                    }} className={styles.crema} />
                    
                    {createSub === x._id && (
                        <div className={styles.contenedorSubcategory}>
                            <input type="text" onChange={handleChange} value={text} />
                            <button onClick={() => handleCreateSubcategory(x._id)}>Añadir Subcategoría</button>
                            <button className="tomato" onClick={() => setCreateSub(null)}>Cancelar</button>
                        </div>
                    )}
                    
                    {!!x.subcategories && x.subcategories.length > 0 && x.subcategories.map((y) => (
                        <div key={y._id} className={styles.contenedorSubCategoria}>
                            <FaAngleDoubleRight />
                            <p>{y.name}</p>
                            <FaTrashAlt onClick={() => delSubCategory(y._id, x._id)} className={styles.iconoEliminar} />
                        </div>
                    ))}
                </div>
            ))}
        </div>
    );
};

export default PanelEnum;
