import { useState, useMemo } from "react";
import { getToken } from "../../lib/serviceToken";
import { addProgramOrDispositiveToDocumentation } from "../../lib/data";
import styles from "../styles/docsProgram.module.css";
import { FaClock, FaMinus, FaPenFancy, FaPlus } from "react-icons/fa6";

const DocsProgramDevicesSync = ({ program, docs, modal, charge, onSyncChange }) => {
  const [loading, setLoading] = useState(false);

  // 🔹 Filtrar solo documentación de tipo DISPOSITIVE
  const dispositiveDocs = useMemo(
    () => docs.filter((d) => d.model === "Dispositive"),
    [docs]
  );

  // === 🔁 Añadir / Quitar documento a TODOS los dispositivos del programa ===
  const handleToggleForAllDevices = async (doc, isLinked) => {
    const token = getToken();
    setLoading(true);

    const payload = {
      documentationId: doc._id,
      programId: program._id,
      action: isLinked ? "remove" : "add",
    };

    const res = await addProgramOrDispositiveToDocumentation(payload, token);

    if (res?.error) {
      modal("Error", res.error || "No se pudo actualizar la vinculación.");
    } else {
      modal(
        "Actualizado",
        isLinked
          ? `Se ha quitado "${doc.name}" de todos los dispositivos del programa.`
          : `Se ha añadido "${doc.name}" a todos los dispositivos del programa.`
      );

      // ✅ Actualizamos en memoria el estado local para reflejar el cambio visual
      const updatedDocs = docs.map((d) => {
        if (d._id === doc._id) {
          const programs = new Set(d.programs || []);
          if (isLinked) {
            programs.delete(program._id);
          } else {
            programs.add(program._id);
          }
          return { ...d, programs: Array.from(programs) };
        }
        return d;
      });

      if (typeof onSyncChange === "function") {
        onSyncChange(updatedDocs);
      }
    }

    setLoading(false);
  };

  if (!dispositiveDocs.length) {
    return (
      <div className={styles.textEmpty}>
        No hay documentación de tipo Dispositivo configurada.
      </div>
    );
  }

  return (
    <div className={styles.syncContainer}>
      <p className={styles.desc}>
        Desde aquí puedes añadir o quitar documentación de tipo “Dispositivo” a
        todos los dispositivos vinculados al programa{" "}
        <strong>{program.name}</strong>.
      </p>

      {Object.entries(
        dispositiveDocs.reduce((acc, doc) => {
          const cat = doc.categoryFiles || "Sin categoría";
          if (!acc[cat]) acc[cat] = [];
          acc[cat].push(doc);
          return acc;
        }, {})
      ).map(([category, docs]) => (
        <div key={category} className={styles.categoryBlock}>
          <h4 className={styles.categoryTitle}>{category}</h4>
          <ul className={styles.list}>
            {docs.map((doc) => {
              const isLinkedGlobally = (doc.programs || []).includes(program._id);

              return (
                <li key={doc._id} className={styles.listItemLine}>
                  <div className={styles.lineLeft}>
                    <span className={styles.docName}>{doc.name}</span>
                    {doc.duration && (
                      <span className={styles.metaTag}>
                        <FaClock /> {doc.duration} días
                      </span>
                    )}
                    {doc.requiresSignature && (
                      <span className={styles.metaTag}>
                        <FaPenFancy /> Firma
                      </span>
                    )}
                  </div>

                  <button
                    className={`${styles.btnToggle} ${
                      isLinkedGlobally ? styles.btnLinked : styles.btnUnlinked
                    }`}
                    onClick={() => handleToggleForAllDevices(doc, isLinkedGlobally)}
                    disabled={loading}
                  >
                    {isLinkedGlobally ? (
                      <>
                        <FaMinus /> Quitar de todos
                      </>
                    ) : (
                      <>
                        <FaPlus /> Añadir a todos
                      </>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default DocsProgramDevicesSync;
