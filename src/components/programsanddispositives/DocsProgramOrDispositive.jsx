import { useEffect, useState, useMemo } from "react";
import {
  infoListDocumentationProgramDispositive,
  addProgramOrDispositiveToDocumentation,
} from "../../lib/data";
import styles from "../styles/docsProgram.module.css";
import {
  FaClock,
  FaPenFancy,
  FaChevronDown,
  FaChevronUp,
  FaFolder,
  FaNetworkWired,
} from "react-icons/fa6";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from "../../hooks/useLogin";
import DocumentMiscelaneaGeneric from "../globals/DocumentMiscelaneaGeneric";
import DocsProgramDevicesSync from "./DocsProgramDevicesSync"; // submódulo secundario

const DocsProgramOrDispositive = ({ info, modal, charge }) => {
  const [currentInfo, setCurrentInfo] = useState(info || null);
  const [listDocumentation, setListDocumentation] = useState([]);
  const [linkedDocs, setLinkedDocs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("program"); // pestaña activa
  const { logged } = useLogin();

  // 🧩 Evitar render si no hay info
  if (!info) {
    return (
      <div className={styles.contenedor}>
        <h3>Documentación</h3>
        <p className={styles.textEmpty}>
          Selecciona un programa o dispositivo.
        </p>
      </div>
    );
  }

  // 🔁 Sincronizar info cuando cambia
  useEffect(() => {
    setCurrentInfo(info);
  }, [info]);

  // === 📦 Cargar lista desde backend ===
  useEffect(() => {
    if (!info?.type || !info?._id) return;

    const fetchData = async () => {
      charge(true);
      const token = getToken();
      try {
        const res = await infoListDocumentationProgramDispositive(
          {
            type: info.type === "program" ? "Program" : "Dispositive",
            id: info._id,
          },
          token
        );

        if (res?.error) {
          modal("Error", res.error || "No se pudo obtener la documentación.");
          setListDocumentation([]);
          setLinkedDocs([]);
        } else {
          setListDocumentation(res.list || []);
          setLinkedDocs(res.linkedDocs?.map((d) => d._id) || []);
        }
      } catch (e) {
        modal("Error", e.message || "Error al cargar la documentación.");
      } finally {
        charge(false);
      }
    };

    fetchData();
  }, [info]);

  // === 📂 Agrupar por categoría ===
  const groupedDocs = useMemo(() => {
    const groups = {};
    for (const doc of listDocumentation) {
      const cat = doc.categoryFiles || "Sin categoría";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(doc);
    }
    return groups;
  }, [listDocumentation]);

  // === 🔁 Añadir / Quitar vínculo ===
  const handleToggleLink = async (doc, isLinked) => {
    const token = getToken();
    setLoading(true);

    const payload = {
      documentationId: doc._id,
      ...(info.type === "program"
        ? { programId: info._id }
        : { dispositiveId: info._id }),
      action: isLinked ? "remove" : "add",
    };

    const res = await addProgramOrDispositiveToDocumentation(payload, token);

    if (res?.error) {
      modal("Error", res.error || "No se pudo actualizar la vinculación.");
    } else {
      setLinkedDocs((prev) =>
        isLinked ? prev.filter((id) => id !== doc._id) : [...prev, doc._id]
      );
    }

    setLoading(false);
  };

  // === 🔐 Permisos ===
  const canManage =
    logged?.user?.role === "global" || logged?.user?.role === "root";

  return (
    <div className={styles.contenedor}>
      <h3>
        Documentación del{" "}
        {info?.type === "program" ? "Programa" : "Dispositivo"}
      </h3>

      {/* === Panel visible solo para root/global === */}
      {canManage && (
        <div className={styles.panelContainer}>
          <button
            className={styles.btnPanelToggle}
            onClick={() => setShowPanel((prev) => !prev)}
          >
            {showPanel ? (
              <>
                <FaChevronUp /> Ocultar gestión documental
              </>
            ) : (
              <>
                <FaChevronDown /> Gestionar documentación del{" "}
                {info?.type === "program" ? "Programa" : "Dispositivo"}
              </>
            )}
          </button>

          {showPanel && (
            <div className={styles.panelContent}>
              {/* === Tabs visibles solo para Programas === */}
              {info?.type === "program" && (
                <div className={styles.tabButtons}>
                  <button
                    className={`${styles.tabBtn} ${activeTab === "program" ? styles.active : ""
                      }`}
                    onClick={() => setActiveTab("program")}
                  >
                    <FaFolder /> Documentación del Programa
                  </button>
                  <button
                    className={`${styles.tabBtn} ${activeTab === "devices" ? styles.active : ""
                      }`}
                    onClick={() => setActiveTab("devices")}
                  >
                    <FaNetworkWired /> Documentación de los Dispositivos
                  </button>
                </div>
              )}

              {/* === Contenido según pestaña === */}
              {activeTab === "program" && (
                <>
                  {listDocumentation.length === 0 ? (
                    <p className={styles.textEmpty}>
                      No hay documentación disponible.
                    </p>
                  ) : (
                    Object.entries(groupedDocs).map(([category, docs]) => (
                      <div key={category} className={styles.categoryBlock}>
                        <h4 className={styles.categoryTitle}>{category}</h4>
                        <ul className={styles.list}>
                          {docs.map((doc) => {
                            const isLinked = linkedDocs.includes(doc._id);
                            return (
                              <li key={doc._id} className={styles.listItemLine}>
                                <div className={styles.lineLeft}>
                                  <span className={styles.docName}>
                                    {doc.name}
                                  </span>
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
                                  className={`${styles.btnToggle} ${isLinked
                                      ? styles.btnLinked
                                      : styles.btnUnlinked
                                    }`}
                                  onClick={() =>
                                    handleToggleLink(doc, isLinked)
                                  }
                                  disabled={loading}
                                >
                                  {isLinked ? "Quitar" : "Añadir"}
                                </button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ))
                  )}
                </>
              )}

              {activeTab === "devices" && info?.type === "program" && (
               <DocsProgramDevicesSync
  program={info}
  docs={listDocumentation}
  linkedDocs={linkedDocs}
  modal={modal}
  charge={charge}
  onSyncChange={(updatedDocs) => setListDocumentation(updatedDocs)}
/>
              )}
            </div>
          )}
        </div>
      )}

      {/* === Subida y gestión de archivos === */}
      <div className={styles.uploadBlock}>
        <DocumentMiscelaneaGeneric
          data={currentInfo}
          modelName={info.type === "program" ? "Program" : "Dispositive"}
          officialDocs={
            info.type === "program"
              ? listDocumentation.filter(
                (doc) =>
                  linkedDocs.includes(doc._id) && doc.model === "Program"
              )
              : listDocumentation.filter((doc) =>
    linkedDocs.includes(doc._id)
  ) // En dispositivos no mostramos docs oficiales
          }
          modal={modal}
          charge={charge}
          authorized={canManage}
          onChange={(updated) => {
            if (updated && updated._id === currentInfo?._id) {
              setCurrentInfo(updated);
            }
          }}
        />
      </div>
    </div>
  );
};

export default DocsProgramOrDispositive;
