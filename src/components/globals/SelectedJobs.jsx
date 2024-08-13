import React from 'react';

const SelectedJobs = ({ data, type, errores, removeOption }) => {
    return (
        <div>
            <label>Seleccionados:</label>
            <ul>
                {data[type].map((x, i) => (
                    <li key={`${type}-${i}`}>
                        <p>{x}</p>
                        <button onClick={() => removeOption(type, i)}>X</button>
                    </li>
                ))}
                {errores[type] && <li><span className='errorSpan'>{errores[type]}</span></li>}
            </ul>
        </div>
    );
};

export default SelectedJobs;
