// src/components/employer/ResponsabilityAndCoordination.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import styles from "../styles/responsability.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import {
  responsibles,
  coordinators,
  getDispositiveResponsable,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from "../../hooks/useLogin";

const ResponsabilityAndCoordination = ({ user, modal, charge, enumsData }) => {
  const token = getToken();
  const { logged } = useLogin();
  const canEdit = logged?.user?.role === "global" || logged?.user?.role === "root";

  // estado UI
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(null); // "resp" | "coord" | null
  const [confirm, setConfirm] = useState(null);     // { type: "resp"|"coord", id: string }

  // listas render
  const [responsabilities, setResponsabilities] = useState([]); // [{_id,type:"program"|"device",name,programId?,programAcronym?}]
  const [coordinations, setCoordinations] = useState([]);       // [{_id,name,programId,programAcronym?}]

  // índices
  const programsIdx = enumsData?.programsIndex || {};
  const dispositiveIdx = enumsData?.dispositiveIndex || {};

  // helper: resolver siempre ACRÓNIMO
  const getProgAcr = useCallback(
    (programId, fallbackAcr, fallbackName) => {
      const meta = programsIdx[String(programId)] || {};
      return meta.acronym || fallbackAcr || fallbackName || meta.name || "—";
    },
    [programsIdx]
  );

  /* ---------------- carga inicial desde API ---------------- */
  const refresh = useCallback(async () => {
    if (!user?._id) {
      setResponsabilities([]);
      setCoordinations([]);
      return;
    }
    try {
      setLoading(true);
      charge?.(true);

      const rows = await getDispositiveResponsable({ _id: user._id }, token);
      if (rows?.error) throw new Error(rows?.message || "No se pudo cargar.");

      // Deduplicadores
      const progSet = new Set();
      const devRespSet = new Set();
      const devCoordSet = new Set();

      const respList = [];
      const coordList = [];

      (Array.isArray(rows) ? rows : []).forEach((r) => {
        // Responsable de PROGRAMA
        if (r.isProgramResponsible && r.idProgram && !progSet.has(r.idProgram)) {
          progSet.add(r.idProgram);
          respList.push({
            _id: String(r.idProgram),
            type: "program",
            // guardamos acrónimo para render
            programAcronym: getProgAcr(r.idProgram, r.programAcronym, r.programName),
            name: r.programName || "Programa", // solo como fallback si hiciera falta
          });
        }

        // Responsable de DISPOSITIVO
        if (r.isDeviceResponsible && r.dispositiveId && !devRespSet.has(r.dispositiveId)) {
          devRespSet.add(r.dispositiveId);
          respList.push({
            _id: String(r.dispositiveId),
            type: "device",
            name: r.dispositiveName || "Dispositivo",
            programId: r.idProgram ? String(r.idProgram) : undefined,
            programAcronym: getProgAcr(r.idProgram, r.programAcronym, r.programName),
          });
        }

        // Coordinador de DISPOSITIVO
        if (r.isDeviceCoordinator && r.dispositiveId && !devCoordSet.has(r.dispositiveId)) {
          devCoordSet.add(r.dispositiveId);
          coordList.push({
            _id: String(r.dispositiveId),
            name: r.dispositiveName || "Dispositivo",
            programId: r.idProgram ? String(r.idProgram) : undefined,
            programAcronym: getProgAcr(r.idProgram, r.programAcronym, r.programName),
          });
        }
      });

      // Orden
      respList.sort((a, b) => (a.type === "program" && b.type !== "program" ? -1 : 0) || (a.name || "").localeCompare(b.name || "", "es"));
      coordList.sort((a, b) => (a.programAcronym || "").localeCompare(b.programAcronym || "", "es") || (a.name || "").localeCompare(b.name || "", "es"));

      setResponsabilities(respList);
      setCoordinations(coordList);
    } catch (e) {
      modal?.("Error", e.message || "Error al cargar responsabilidades/coord.");
      setResponsabilities([]);
      setCoordinations([]);
    } finally {
      charge?.(false);
      setLoading(false);
    }
  }, [user?._id, token, charge, modal, getProgAcr]);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);

  /* ---------------- opciones “Añadir” usando ACRÓNIMO ---------------- */
  const programOptions = useMemo(() => {
    // (Programa) <ACRÓNIMO>
    return Object.entries(programsIdx)
      .map(([id, p]) => ({
        value: `program:${id}`,
        label: `(Programa) ${p?.acronym || p?.name || id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [programsIdx]);

  const deviceOptions = useMemo(() => {
    // (Dispositivo) <nombre> [<ACRÓNIMO>]
    return Object.entries(dispositiveIdx)
      .map(([did, d]) => {
        const pid = d?.program ? String(d.program) : "";
        const pacr = programsIdx[pid]?.acronym || programsIdx[pid]?.name || "";
        return {
          value: `device:${pid}:${did}`,
          label: `(Dispositivo) ${d?.name || did}${pacr ? ` [${pacr}]` : ""}`,
          did,
          pid,
          pacr,
        };
      })
      .sort((a, b) => a.pacr.localeCompare(b.pacr, "es") || a.label.localeCompare(b.label, "es"));
  }, [dispositiveIdx, programsIdx]);

  const buildFields = (type) => {
    const base = [{ value: "", label: "Seleccione una opción" }];
    if (type === "resp") {
      return [
        {
          name: "selected",
          label: "Responsabilidad",
          type: "select",
          required: true,
          options: [...base, ...programOptions, ...deviceOptions],
        },
      ];
    }
    // coord -> solo dispositivos “programId:deviceId”
    const coordDeviceOpts = deviceOptions.map((o) => ({
      value: `${o.pid}:${o.did}`,
      label: o.label,
    }));
    return [
      {
        name: "selected",
        label: "Dispositivo",
        type: "select",
        required: true,
        options: [...base, ...coordDeviceOpts],
      },
    ];
  };

  /* ---------------- eliminar ---------------- */
  const handleDelete = (type, id) => setConfirm({ type, id });
  const onCancel = () => setConfirm(null);

  const onConfirm = async () => {
    if (!confirm) return;
    const { type, id } = confirm;

    try {
      charge?.(true);

      if (type === "resp") {
        const item = responsabilities.find((r) => r._id === id);
        if (!item) return;

        if (item.type === "program") {
          await responsibles(
            { type: "program", action: "remove", programId: item._id, responsibleId: user._id },
            token
          );
        } else {
          if (!item.programId) throw new Error("No se pudo resolver el programa del dispositivo.");
          await responsibles(
            { type: "device", action: "remove", programId: item.programId, deviceId: item._id, responsibleId: user._id },
            token
          );
        }
      } else {
        const dev = coordinations.find((d) => d._id === id);
        if (!dev?.programId) throw new Error("No se pudo resolver el programa del dispositivo.");
        await coordinators(
          { action: "remove", programId: dev.programId, deviceId: id, coordinatorId: user._id },
          token
        );
      }

      await refresh();
      modal?.("Eliminado", "Se ha eliminado correctamente.");
    } catch (e) {
      modal?.("Error", e.message || "No se pudo eliminar.");
    } finally {
      charge?.(false);
      setConfirm(null);
    }
  };

  /* ---------------- añadir ---------------- */
  const handleSubmitAdd = async (type, form) => {
    try {
      charge?.(true);

      if (type === "resp") {
        const parts = String(form.selected || "").split(":");
        if (parts[0] === "program") {
          const programId = parts[1];
          if (!programId) throw new Error("Seleccione un programa válido.");
          await responsibles({ type: "program", action: "add", programId, responsible: user._id }, token);
        } else if (parts[0] === "device") {
          const programId = parts[1];
          const deviceId = parts[2];
          if (!programId || !deviceId) throw new Error("Seleccione un dispositivo válido.");
          await responsibles({ type: "device", action: "add", programId, deviceId, responsible: user._id }, token);
        } else {
          throw new Error("Seleccione un programa o dispositivo válido.");
        }
      } else {
        // coord -> "programId:deviceId"
        const [programId, deviceId] = String(form.selected || "").split(":");
        if (!programId || !deviceId) throw new Error("Seleccione un dispositivo válido.");
        await coordinators({ action: "add", programId, deviceId, coordinators: user._id }, token);
      }

      await refresh();
      modal?.("Añadido", "Se ha añadido correctamente.");
      setOpenModal(null);
    } catch (e) {
      modal?.("Error", e.message || "No se pudo añadir.");
    } finally {
      charge?.(false);
    }
  };

  /* ---------------- render ---------------- */
  return (
    <div className={styles.rcGrid}>
      {/* RESPONSABILIDAD */}
      <div className={styles.contenedor}>
        <h2>
          RESPONSABILIDAD
          {canEdit && <FaSquarePlus onClick={() => setOpenModal("resp")} />}
        </h2>

        <div className={styles.contenedorBotones}>
          {loading ? (
            <p>Cargando…</p>
          ) : responsabilities.length > 0 ? (
            <ul>
              {responsabilities.map((item) => (
                <li key={`resp-${item.type}-${item._id}`} className={styles.dispositivos}>
                  <p>
                    <span className={styles.tag}>
                      {item.type === "program" ? "Programa" : "Dispositivo"}
                    </span>{" "}
                    {item.type === "program"
                      ? // Mostrar SIEMPRE el acrónimo del programa
                        getProgAcr(item._id, item.programAcronym, item.name)
                      : // Dispositivo + (Pertenece a: ACRÓNIMO)
                        <>
                          {item.name}{" "}
                          {item.programId && (
                            <small>
                              (Pertenece a: {getProgAcr(item.programId, item.programAcronym)})
                            </small>
                          )}
                        </>}
                  </p>
                  {canEdit && (
                    <span>
                      <FaTrashAlt onClick={() => handleDelete("resp", item._id)} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No es responsable de ningún programa o dispositivo</p>
          )}
        </div>
      </div>

      {/* COORDINACIÓN */}
      <div className={styles.contenedor}>
        <h2>
          COORDINACIÓN
          {canEdit && <FaSquarePlus onClick={() => setOpenModal("coord")} />}
        </h2>

        <div className={styles.contenedorBotones}>
          {loading ? (
            <p>Cargando…</p>
          ) : coordinations.length > 0 ? (
            <ul>
              {coordinations.map((device) => (
                <li key={`coord-${device._id}`} className={styles.dispositivos}>
                  <p>
                    <span className={styles.tag}>Dispositivo</span> {device.name}{" "}
                    {device.programId && (
                      <small>(Programa: {getProgAcr(device.programId, device.programAcronym)})</small>
                    )}
                  </p>
                  {canEdit && (
                    <span>
                      <FaTrashAlt onClick={() => handleDelete("coord", device._id)} />
                    </span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p>No es coordinador de ningún dispositivo</p>
          )}
        </div>
      </div>

      {/* Modal añadir */}
      {openModal && (
        <ModalForm
          title={openModal === "resp" ? "Añadir Responsabilidad" : "Añadir Coordinación"}
          message={openModal === "resp" ? "Seleccione un programa o dispositivo" : "Seleccione un dispositivo"}
          fields={buildFields(openModal)}
          onSubmit={(form) => handleSubmitAdd(openModal, form)}
          onClose={() => setOpenModal(null)}
        />
      )}

      {/* Modal eliminar */}
      {confirm && (
        <ModalConfirmation
          title="Eliminar asignación"
          message="¿Seguro que quieres eliminar esta asignación?"
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </div>
  );
};

export default ResponsabilityAndCoordination;
