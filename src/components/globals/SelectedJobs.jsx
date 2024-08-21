import React from 'react';
import { IoCloseCircle } from "react-icons/io5";

const SelectedJobs = ({ data, type, errores, removeOption }) => {
    return (
        <div>
            <label>Seleccionados:</label>
            <ul>
                {data[type].map((x, i) => (
                    <li key={`${type}-${i}`}>
                        <p>{x}</p>
                        <IoCloseCircle className='iconTomato' onClick={() => removeOption(type, i)}/>
                    </li>
                ))}
                {errores[type] && <li><span className='errorSpan'>{errores[type]}</span></li>}
            </ul>
        </div>
    );
};

export default SelectedJobs;
