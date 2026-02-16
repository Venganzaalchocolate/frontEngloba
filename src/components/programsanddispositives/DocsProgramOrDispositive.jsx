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
import DocsProgramDevicesSync from "./DocsProgramDevicesSync";

/**
 * ===========================================================
 *  COMPONENTE PRINCIPAL — DOCUMENTACIÓN DE PROGRAMAS / DISPOSITIVOS
 * -----------------------------------------------------------
 *  - Si es PROGRAM → dos pestañas:
 *        • Documentación del Programa (solo model === "Program")
 *        • Documentación de los Dispositivos
 *
 *  - Si es DISPOSITIVO → sin pestañas:
 *        • Muestra únicamente documentación del dispositivo
 *
 *  - Incluye gestión: añadir/quitar docs del programa/dispositivo
 *  - Incluye bloque de subida/carga de archivos oficiales
 * ===========================================================
 */

const DocsProgramOrDispositive = ({ info, modal, charge }) => {
  const { logged } = useLogin();

  const [currentInfo, setCurrentInfo] = useState(info || null);
  const [listDocumentation, setListDocumentation] = useState([]);
  const [linkedDocs, setLinkedDocs] = useState([]);

  const [loading, setLoading] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [activeTab, setActiveTab] = useState("program");

  // ===========================================================
  //  Si no hay entidad seleccionada, mostrar placeholder
  // ===========================================================
  if (!info) {
    return (
      <div className={styles.contenedor}>
        <h3>Documentación</h3>
        <p className={styles.textEmpty}>Selecciona un programa o dispositivo.</p>
      </div>
    );
  }

  // ===========================================================
  //  Sincronizar entidad seleccionada
  // ===========================================================
  useEffect(() => setCurrentInfo(info), [info]);

  // ===========================================================
  //  Cargar documentación desde backend
  // ===========================================================
  useEffect(() => {
    if (!info?.type || !info?._id) return;

    const load = async () => {
      charge(true);
      try {
        const token = getToken();
        const res = await infoListDocumentationProgramDispositive(
          {
            type: info.type === "program" ? "Program" : "Dispositive",
            id: info._id,
          },
          token
        );

        if (res?.error) {
          modal("Error", res.error || "Error al cargar la documentación.");
          setListDocumentation([]);
          setLinkedDocs([]);
          return;
        }

        setListDocumentation(res.list || []);
        setLinkedDocs(res.linkedDocs?.map((d) => d._id) || []);
      } catch (e) {
        modal("Error", e.message);
      } finally {
        charge(false);
      }
    };

    load();
  }, [info]);

  // ===========================================================
  //  Agrupar documentación por categoría (genérico)
  // ===========================================================
  const groupedDocs = useMemo(() => {
    const out = {};
    for (const doc of listDocumentation) {
      const cat = doc.categoryFiles || "Sin categoría";
      if (!out[cat]) out[cat] = [];
      out[cat].push(doc);
    }
    return out;
  }, [listDocumentation]);

  // ===========================================================
  //  Agrupación filtrada SOLO para PROGRAMAS (model === "Program")
  // ===========================================================
  const groupedDocsProgramModel = useMemo(() => {
    const out = {};
    for (const doc of listDocumentation) {
      if (doc.model !== "Program") continue;
      const cat = doc.categoryFiles || "Sin categoría";
      if (!out[cat]) out[cat] = [];
      out[cat].push(doc);
    }
    return out;
  }, [listDocumentation]);

  // ===========================================================
  //  Vincular / Desvincular documento
  // ===========================================================
  const handleToggleLink = async (doc, isLinked) => {
    setLoading(true);
    const token = getToken();

    const payload = {
      documentationId: doc._id,
      ...(info.type === "program"
        ? { programId: info._id }
        : { dispositiveId: info._id }),
      action: isLinked ? "remove" : "add",
    };

    const res = await addProgramOrDispositiveToDocumentation(payload, token);

    if (res?.error) {
      modal("Error", res.error || "No se pudo actualizar el vínculo.");
    } else {
      setLinkedDocs((prev) =>
        isLinked ? prev.filter((id) => id !== doc._id) : [...prev, doc._id]
      );
    }

    setLoading(false);
  };

  // ===========================================================
  //  Permiso de gestión
  // ===========================================================
  const canManage =
    logged?.user?.role === "global" || logged?.user?.role === "root";

  // ===========================================================
  //  RENDER: Vista
  // ===========================================================
  return (
    <div className={styles.contenedor}>
      <h3>
        Documentación del {info.type === "program" ? "Programa" : "Dispositivo"}
      </h3>

      {/* PANEL PARA ROOT/GLOBAL */}
      {canManage && (
        <div className={styles.panelContainer}>
          <button
            className={styles.btnPanelToggle}
            onClick={() => setShowPanel((p) => !p)}
          >
            {showPanel ? (
              <>
                <FaChevronUp /> Ocultar gestión documental
              </>
            ) : (
              <>
                <FaChevronDown /> Gestionar documentación del{" "}
                {info.type === "program" ? "Programa" : "Dispositivo"}
              </>
            )}
          </button>

          {/* CONTENIDO DEL PANEL */}
          {showPanel && (
            <div className={styles.panelContent}>
              {/* ================================
                  TABS — SOLO SI ES PROGRAMA
                 ================================ */}
              {info.type === "program" && (
                <div className={styles.tabButtons}>
                  <button
                    className={`${styles.tabBtn} ${
                      activeTab === "program" ? styles.active : ""
                    }`}
                    onClick={() => setActiveTab("program")}
                  >
                    <FaFolder /> Documentación del Programa
                  </button>

                  <button
                    className={`${styles.tabBtn} ${
                      activeTab === "devices" ? styles.active : ""
                    }`}
                    onClick={() => setActiveTab("devices")}
                  >
                    <FaNetworkWired /> Documentación de los Dispositivos
                  </button>
                </div>
              )}

              {/* ================================
                  TAB: DOCUMENTACIÓN DEL PROGRAMA
                 ================================ */}
              {info.type === "program" && activeTab === "program" && (
                <>
                  {Object.keys(groupedDocsProgramModel).length === 0 ? (
                    <p className={styles.textEmpty}>
                      No hay documentación del programa.
                    </p>
                  ) : (
                    Object.entries(groupedDocsProgramModel).map(
                      ([category, docs]) => (
                        <div key={category} className={styles.categoryBlock}>
                          <h4 className={styles.categoryTitle}>{category}</h4>
                          <ul className={styles.list}>
                            {docs.map((doc) => {
                              const isLinked = linkedDocs.includes(doc._id);
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
                                      isLinked ? styles.btnLinked : styles.btnUnlinked
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
                      )
                    )
                  )}
                </>
              )}

              {/* ================================
                  TAB: DOCUMENTACIÓN DE DISPOSITIVOS (SOLO PROGRAMAS)
                 ================================ */}
              {info.type === "program" && activeTab === "devices" && (
                <DocsProgramDevicesSync
                  program={info}
                  docs={listDocumentation}
                  linkedDocs={linkedDocs}
                  modal={modal}
                  charge={charge}
                  onSyncChange={(updated) => setListDocumentation(updated)}
                />
              )}

              {/* ================================
                  VISTA PARA DISPOSITIVOS
                 ================================ */}
                            {info.type === "dispositive" && (
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
                                    isLinked
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
            </div>
          )}
        </div>
      )}

      {/* ===========================================================
          SUBIDA / GESTIÓN DE ARCHIVOS DEL PROGRAMA O DISPOSITIVO
         =========================================================== */}
      <div className={styles.uploadBlock}>
        <DocumentMiscelaneaGeneric
          data={currentInfo}
          modelName={info.type === "program" ? "Program" : "Dispositive"}
          officialDocs={
            info.type === "program"
              ? listDocumentation.filter(
                  (doc) =>
                    linkedDocs.includes(doc._id) &&
                    doc.model === "Program"
                )
              : listDocumentation.filter((doc) =>
                  linkedDocs.includes(doc._id)
                )
          }
          modal={modal}
          charge={charge}
          authorized={true}
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
