// src/components/employer/ResponsabilityAndCoordination.jsx
import { useEffect, useMemo, useState, useCallback } from "react";
import styles from "../styles/responsability.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import {
  scopedRole,
  getUserScopedRoles,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from "../../hooks/useLogin";

const ROLE_CONFIG = {
  supervisor: {
    title: "SUPERVISIÓN",
    roleType: "supervisors",
    empty: "No tiene supervisiones asignadas",
    addTitle: "Añadir Supervisión",
    addMessage: "Seleccione un programa o dispositivo",
  },
  responsible: {
    title: "RESPONSABILIDAD",
    roleType: "responsible",
    empty: "No tiene responsabilidades asignadas",
    addTitle: "Añadir Responsabilidad",
    addMessage: "Seleccione un programa o dispositivo",
  },
  coordinator: {
    title: "COORDINACIÓN",
    roleType: "coordinators",
    empty: "No tiene coordinaciones asignadas",
    addTitle: "Añadir Coordinación",
    addMessage: "Seleccione un programa o dispositivo",
  },

};

const ResponsabilityAndCoordination = ({ user, modal, charge, enumsData }) => {
  const token = getToken();
  const { logged } = useLogin();
  const canEdit = logged?.user?.role === "global" || logged?.user?.role === "root";

  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(null); // responsible | coordinator | supervisor | null
  const [confirm, setConfirm] = useState(null); // { roleKey, item }

  const [roleGroups, setRoleGroups] = useState({
    responsible: [],
    coordinator: [],
    supervisor: [],
  });

  const programsIdx = enumsData?.programsIndex || {};
  const dispositiveIdx = enumsData?.dispositiveIndex || {};

  const getProgAcr = useCallback(
    (programId, fallbackAcr, fallbackName) => {
      const meta = programsIdx[String(programId)] || {};
      return meta.acronym || fallbackAcr || fallbackName || meta.name || "—";
    },
    []
  );

  const normalizeRowsToGroups = useCallback((rows = []) => {
    const seen = {
      responsible: new Set(),
      coordinator: new Set(),
      supervisor: new Set(),
    };

    const next = {
      responsible: [],
      coordinator: [],
      supervisor: [],
    };

    const pushIfMissing = (roleKey, item) => {
      const key = `${item.scopeType}:${item._id}`;
      if (seen[roleKey].has(key)) return;
      seen[roleKey].add(key);
      next[roleKey].push(item);
    };

    rows.forEach((r) => {
      const commonProgram = {
        programId: r.idProgram ? String(r.idProgram) : undefined,
        programAcronym: getProgAcr(r.idProgram, r.programAcronym, r.programName),
      };

      if (r.isProgramResponsible && r.idProgram) {
        pushIfMissing("responsible", {
          _id: String(r.idProgram),
          scopeType: "program",
          name: r.programName || "Programa",
          ...commonProgram,
        });
      }

      if (r.isProgramCoordinator && r.idProgram) {
        pushIfMissing("coordinator", {
          _id: String(r.idProgram),
          scopeType: "program",
          name: r.programName || "Programa",
          ...commonProgram,
        });
      }

      if (r.isProgramSupervisor && r.idProgram) {
        pushIfMissing("supervisor", {
          _id: String(r.idProgram),
          scopeType: "program",
          name: r.programName || "Programa",
          ...commonProgram,
        });
      }

      if (r.isDeviceResponsible && r.dispositiveId) {
        pushIfMissing("responsible", {
          _id: String(r.dispositiveId),
          scopeType: "dispositive",
          name: r.dispositiveName || "Dispositivo",
          ...commonProgram,
        });
      }

      if (r.isDeviceCoordinator && r.dispositiveId) {
        pushIfMissing("coordinator", {
          _id: String(r.dispositiveId),
          scopeType: "dispositive",
          name: r.dispositiveName || "Dispositivo",
          ...commonProgram,
        });
      }

      if (r.isDeviceSupervisor && r.dispositiveId) {
        pushIfMissing("supervisor", {
          _id: String(r.dispositiveId),
          scopeType: "dispositive",
          name: r.dispositiveName || "Dispositivo",
          ...commonProgram,
        });
      }
    });

    Object.keys(next).forEach((k) => {
      next[k].sort((a, b) => {
        if (a.scopeType === "program" && b.scopeType !== "program") return -1;
        if (a.scopeType !== "program" && b.scopeType === "program") return 1;
        return (a.name || "").localeCompare(b.name || "", "es");
      });
    });

    return next;
  }, [getProgAcr]);

  const refresh = useCallback(async () => {
    if (!user?._id) {
      setRoleGroups({
        responsible: [],
        coordinator: [],
        supervisor: [],
      });
      return;
    }

    try {
      setLoading(true);
      charge?.(true);

      const rows = await getUserScopedRoles({ userId: user._id }, token);
      if (rows?.error) throw new Error(rows?.message || "No se pudo cargar.");

      setRoleGroups(normalizeRowsToGroups(Array.isArray(rows) ? rows : []));
    } catch (e) {
      modal?.("Error", e.message || "Error al cargar asignaciones.");
      setRoleGroups({
        responsible: [],
        coordinator: [],
        supervisor: [],
      });
    } finally {
      charge?.(false);
      setLoading(false);
    }
  }, [user?._id, normalizeRowsToGroups]);

  useEffect(() => {
    if (user?._id) refresh();
    else {
      setRoleGroups({
        responsible: [],
        coordinator: [],
        supervisor: [],
      });
    }
  }, [user?._id, refresh]);

  const programOptions = useMemo(() => {
    return Object.entries(programsIdx)
      .map(([id, p]) => ({
        value: `program:${id}`,
        label: `(Programa) ${p?.acronym || p?.name || id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [programsIdx]);

  const deviceOptions = useMemo(() => {
    return Object.entries(dispositiveIdx)
      .map(([did, d]) => {
        const pid = d?.program ? String(d.program) : "";
        const pacr = programsIdx[pid]?.acronym || programsIdx[pid]?.name || "";
        return {
          value: `dispositive:${did}`,
          label: `(Dispositivo) ${d?.name || did}${pacr ? ` [${pacr}]` : ""}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [dispositiveIdx, programsIdx]);

  const buildFields = () => [
    {
      name: "selected",
      label: "Asignación",
      type: "select",
      required: true,
      options: [...programOptions, ...deviceOptions],
    },
  ];

  const handleDelete = (roleKey, item) => setConfirm({ roleKey, item });
  const onCancel = () => setConfirm(null);

  const onConfirm = async () => {
    if (!confirm) return;

    const { roleKey, item } = confirm;

    try {
      charge?.(true);

      const result = await scopedRole(
        {
          scopeType: item.scopeType,
          scopeId: item._id,
          roleType: ROLE_CONFIG[roleKey].roleType,
          action: "remove",
          removeUserId: user._id,
        },
        token
      );

      if (result?.error) throw new Error(result.message || "No se pudo eliminar.");

      await refresh();
      modal?.("Eliminado", "Se ha eliminado correctamente.");
    } catch (e) {
      modal?.("Error", e.message || "No se pudo eliminar.");
    } finally {
      charge?.(false);
      setConfirm(null);
    }
  };

  const handleSubmitAdd = async (roleKey, form) => {
    try {
      charge?.(true);

      const [scopeType, scopeId] = String(form.selected || "").split(":");
      if (!scopeType || !scopeId) {
        throw new Error("Seleccione un programa o dispositivo válido.");
      }

      const result = await scopedRole(
        {
          scopeType,
          scopeId,
          roleType: ROLE_CONFIG[roleKey].roleType,
          action: "add",
          users: [user._id],
        },
        token
      );

      if (result?.error) throw new Error(result.message || "No se pudo añadir.");

      await refresh();
      modal?.("Añadido", "Se ha añadido correctamente.");
      setOpenModal(null);
    } catch (e) {
      modal?.("Error", e.message || "No se pudo añadir.");
    } finally {
      charge?.(false);
    }
  };

  const renderItem = (roleKey, item) => (
    <li key={`${roleKey}-${item.scopeType}-${item._id}`} className={styles.dispositivos}>
      <p>
        <span className={styles.tag}>
          {item.scopeType === "program" ? "Programa" : "Dispositivo"}
        </span>
        {item.scopeType === "program" ? (
          getProgAcr(item._id, item.programAcronym, item.name)
        ) : (
          <>
            {item.name}{" "}
            {item.programId && (
              <small>
                (Pertenece a: {getProgAcr(item.programId, item.programAcronym)})
              </small>
            )}
          </>
        )}
      </p>

      {canEdit && (
        <span>
          <FaTrashAlt onClick={() => handleDelete(roleKey, item)} />
        </span>
      )}
    </li>
  );

  return (
    <div className={styles.rcGrid}>
      {Object.entries(ROLE_CONFIG).map(([roleKey, conf]) => (
        <div className={styles.contenedor} key={roleKey}>
          <h2>
            {conf.title}
            {canEdit && <FaSquarePlus onClick={() => setOpenModal(roleKey)} />}
          </h2>

          <div className={styles.contenedorBotones}>
            {loading ? (
              <p>Cargando…</p>
            ) : roleGroups[roleKey]?.length > 0 ? (
              <ul>{roleGroups[roleKey].map((item) => renderItem(roleKey, item))}</ul>
            ) : (
              <p>{conf.empty}</p>
            )}
          </div>
        </div>
      ))}

      {openModal && (
        <ModalForm
          title={ROLE_CONFIG[openModal].addTitle}
          message={ROLE_CONFIG[openModal].addMessage}
          fields={buildFields()}
          onSubmit={(form) => handleSubmitAdd(openModal, form)}
          onClose={() => setOpenModal(null)}
          modal={modal}
        />
      )}

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