import React from 'react';

const SelectionOption = ({ type, label, enums, datos, addOption }) => {
  // Función auxiliar para decidir si mostrar un item
  const shouldShow = (item) =>
    item.public === undefined || item.public === true;

  const filteredItems = enums[type].filter(shouldShow);

  return (
    <div>
      <label htmlFor={type}>{label}</label>
      <select
        id={type}
        name={type}
        onChange={(e) => addOption(e, type)}
        value={datos[type] || 'x'}
      >
        <option value="x">Selecciona una o varias:</option>
        {filteredItems.map((item) => {
          // Si hay subcategorías, también las filtramos
          if (item.subcategories && item.subcategories.length > 0) {
            const filteredSubcats = item.subcategories.filter(shouldShow);

            // Si no queda ninguna subcategoría, no renderizamos este <optgroup>
            if (filteredSubcats.length === 0) return null;

            return (
              <optgroup
                label={item.name}
                key={item._id || item.name} // Usa _id si existe, o item.name
              >
                {filteredSubcats.map((sub) => (
                  <option
                    value={sub.name}
                    key={sub._id || sub.name}
                  >
                    {sub.name}
                  </option>
                ))}
              </optgroup>
            );
          } else {
            // Si no hay subcategorías, mostramos este ítem como <option>
            return (
              <option
                value={item.name}
                key={item._id || item.name}
              >
                {item.name}
              </option>
            );
          }
        })}
      </select>
    </div>
  );
};

export default SelectionOption;

