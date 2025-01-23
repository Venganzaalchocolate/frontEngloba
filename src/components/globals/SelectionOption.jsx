import React from 'react';

const SelectionOption = ({ type, label, enums, datos, addOption }) => {
    return (
        <div>
            <label htmlFor={type}>{label}</label>
            <select id={type} name={type} onChange={(e) => addOption(e, type)} value={datos[type] || 'x'}>
                <option value={'x'}>Selecciona una o varias:</option>
                {enums[type].map((x) => {
                    if (x.subcategories && x.subcategories.length > 0) {
                        return (
                            <optgroup label={x.name} key={x.name}>
                                {x.subcategories.map((y) => { if (y._id != '6791094710c1c8e7e9c42f69') return <option value={y.name} key={y.name}>{y.name}</option> }
                                )}
                            </optgroup>
                        );
                    } else {
                        return <option value={x.name} key={x.name}>{x.name}</option>;
                    }
                })}
            </select>
        </div>
    );
};

export default SelectionOption;
