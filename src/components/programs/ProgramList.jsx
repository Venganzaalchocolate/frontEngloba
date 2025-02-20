import React from "react";
import styles from "../styles/ManagingPrograms.module.css";

/**
 * ProgramList
 * -----------
 * Muestra una lista de programas agrupados por área.
 * Recibe:
 * - programs: array de programas ya ordenados
 * - onSelectProgram: callback para cuando se selecciona un programa
 */
const ProgramList = ({ programs, onSelectProgram }) => {
  if (!programs || programs.length === 0) {
    return <p>No hay programas disponibles.</p>;
  }

  // Agrupar por 'area'
  const groupedByArea = Object.entries(
    programs.reduce((acc, program) => {
      if (!acc[program.area]) acc[program.area] = [];
      acc[program.area].push(program);
      return acc;
    }, {})
  );

  return (
    <div className={styles.contenedorProgram}>
      {groupedByArea.map(([area, programList]) => {
        // Creamos una clase dinámica para cada área, si lo deseas
        const areaClass = area.replace(/\s+/g, "_").toLowerCase();

        return (
          <div key={area} className={styles[areaClass]}>
            <h3>{area.toUpperCase()}</h3>
            <div className={styles.programList}>
              {programList.map((program) => (
                <div
                  key={program._id}
                  className={styles.programItem}
                  onClick={() => onSelectProgram(program)}
                >
                  {program.acronym.toUpperCase()}: {program.name}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProgramList;
