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
 *  - Si es DISPOSITIVO:
 *        • Gestiona documentación propia del dispositivo
 *        • Muestra/carga también documentación de sus centros de trabajo asociados
 *
 *  - La documentación de Workplace se muestra desde el dispositivo,
 *    pero se guarda realmente contra originModel: "Workplace".
 * ===========================================================
 */

const DocsProgramOrDispositive = ({ info, modal, charge }) => {
  const { logged } = useLogin();

  const [currentInfo, setCurrentInfo] = useState(info || null);
  const [listDocumentation, setListDocumentation] = useState([]);
  const [linkedDocs, setLinkedDocs] = useState([]);
  const [workplaces, setWorkplaces] = useState([]);

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
  useEffect(() => {
    setCurrentInfo(info);
  }, [info]);

  // ===========================================================
  //  Cargar documentación desde backend
  // ===========================================================
  useEffect(() => {
    if (!info?.type || !info?._id) return;

    const load = async () => {
      charge(true);

      try {
        const token = getToken();
        const type = info.type === "program" ? "Program" : "Dispositive";

        const res = await infoListDocumentationProgramDispositive(
          {
            type,
            id: info._id,
            includeWorkplaces: info.type === "dispositive",
          },
          token
        );

        if (res?.error) {
          modal("Error", res.error || "Error al cargar la documentación.");
          setListDocumentation([]);
          setLinkedDocs([]);
          setWorkplaces([]);
          return;
        }

        setListDocumentation(res.list || []);
        setLinkedDocs(res.linkedDocs?.map((d) => d._id) || []);
        setWorkplaces(res.workplaces || []);
      } catch (e) {
        modal("Error", e.message || "Error al cargar la documentación.");
        setListDocumentation([]);
        setLinkedDocs([]);
        setWorkplaces([]);
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
  //  Agrupación SOLO para PROGRAMAS (model === "Program")
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
  //  Agrupación SOLO para DISPOSITIVOS (model === "Dispositive")
  //  Importante: el panel de gestión del dispositivo NO gestiona
  //  documentos Workplace para evitar enviar workplace docs con dispositiveId.
  // ===========================================================
  const groupedDocsDispositiveModel = useMemo(() => {
    const out = {};

    for (const doc of listDocumentation) {
      if (doc.model !== "Dispositive") continue;

      const cat = doc.categoryFiles || "Sin categoría";
      if (!out[cat]) out[cat] = [];
      out[cat].push(doc);
    }

    return out;
  }, [listDocumentation]);

  // ===========================================================
  //  Centros de trabajo relacionados para DocumentMiscelaneaGeneric
  // ===========================================================
  const relatedFileSources = useMemo(() => {
    if (info.type !== "dispositive") return [];

    return (workplaces || []).map((workplace) => ({
      modelName: "Workplace",
      data: workplace,
      label: `Centro de trabajo: ${workplace.name || "Sin nombre"}`,
    }));
  }, [info.type, workplaces]);

  // ===========================================================
  //  Documentos oficiales que verá el componente de subida
  //  - Program: solo documentos vinculados de Program
  //  - Dispositive: documentos vinculados de Dispositive
  //                 + documentos Workplace disponibles para subir/ver desde el dispositivo
  // ===========================================================
  const officialDocsToUpload = useMemo(() => {
    if (info.type === "program") {
      return listDocumentation.filter(
        (doc) => linkedDocs.includes(doc._id) && doc.model === "Program"
      );
    }

    return listDocumentation.filter((doc) => {
      if (doc.model === "Dispositive") {
        return linkedDocs.includes(doc._id);
      }

      if (doc.model === "Workplace") {
        return true;
      }

      return false;
    });
  }, [info.type, listDocumentation, linkedDocs]);

  // ===========================================================
  //  Vincular / Desvincular documento
  // ===========================================================
  const handleToggleLink = async (doc, isLinked) => {
    setLoading(true);

    try {
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
    } catch (e) {
      modal("Error", e.message || "No se pudo actualizar el vínculo.");
    } finally {
      setLoading(false);
    }
  };

  // ===========================================================
  //  Permiso de gestión
  // ===========================================================
  const canManage =
    logged?.user?.role === "global" || logged?.user?.role === "root";

  // ===========================================================
  //  RENDER
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
                                    onClick={() => handleToggleLink(doc, isLinked)}
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
                  TAB: DOCUMENTACIÓN DE DISPOSITIVOS
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
                  Solo gestiona docs model === "Dispositive".
                  Los docs Workplace se muestran/suben abajo en el bloque genérico.
                 ================================ */}
              {info.type === "dispositive" && (
                <>
                  {Object.keys(groupedDocsDispositiveModel).length === 0 ? (
                    <p className={styles.textEmpty}>
                      No hay documentación de dispositivo disponible.
                    </p>
                  ) : (
                    Object.entries(groupedDocsDispositiveModel).map(
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
                                    onClick={() => handleToggleLink(doc, isLinked)}
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
          officialDocs={officialDocsToUpload}
          relatedFileSources={relatedFileSources}
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