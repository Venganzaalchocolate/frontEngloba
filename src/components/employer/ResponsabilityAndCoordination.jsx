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
  listScopedRoleRules,
  createScopedRoleRule,
  deleteScopedRoleRule,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { useLogin } from "../../hooks/useLogin";

const ROLE_CONFIG = {
  supervisor: {
    title: "SUPERVISIÓN",
    roleType: "supervisors",
    description: "Persona que supervisa a los responsables y coordinadores de un programa o dispositivo",
    directEmpty: "No tiene supervisiones directas asignadas",
    ruleEmpty: "No tiene reglas de supervisión",
    addDirectTitle: "Añadir Supervisión Directa",
    addDirectMessage: "Seleccione un programa o dispositivo",
    addRuleTitle: "Añadir Regla de Supervisión",
    addRuleMessage: "Configure el alcance de la regla",
  },
  responsible: {
    title: "RESPONSABILIDAD",
    roleType: "responsible",
    description: "Persona responsable de un programa o dispositivo",
    directEmpty: "No tiene responsabilidades directas asignadas",
    ruleEmpty: "No tiene reglas de responsabilidad",
    addDirectTitle: "Añadir Responsabilidad Directa",
    addDirectMessage: "Seleccione un programa o dispositivo",
    addRuleTitle: "Añadir Regla de Responsabilidad",
    addRuleMessage: "Configure el alcance de la regla",
  },
  coordinator: {
    title: "COORDINACIÓN",
    roleType: "coordinators",
    description: "Ayudante de un responsable en un programa o dispositivo",
    directEmpty: "No tiene coordinaciones directas asignadas",
    ruleEmpty: "No tiene reglas de coordinación",
    addDirectTitle: "Añadir Coordinación Directa",
    addDirectMessage: "Seleccione un programa o dispositivo",
    addRuleTitle: "Añadir Regla de Coordinación",
    addRuleMessage: "Configure el alcance de la regla",
  },
};

const AREA_OPTIONS = [
  { value: "", label: "Sin área" },
  { value: "igualdad", label: "Igualdad" },
  { value: "desarrollo comunitario", label: "Desarrollo comunitario" },
  { value: "lgtbiq", label: "LGTBIQ" },
  { value: "infancia y juventud", label: "Infancia y juventud" },
  { value: "personas con discapacidad", label: "Personas con discapacidad" },
  { value: "mayores", label: "Mayores" },
  { value: "migraciones", label: "Migraciones" },
  { value: "no identificado", label: "No identificado" },
];

const buildEmptyGroups = () => ({ responsible: [], coordinator: [], supervisor: [] });

const ResponsabilityAndCoordination = ({ user, modal, charge, enumsData }) => {
  const { logged } = useLogin();
  const canEdit = logged?.user?.role === "global" || logged?.user?.role === "root";

  const [loading, setLoading] = useState(false);
  const [openDirectModal, setOpenDirectModal] = useState(null);
  const [openRuleModal, setOpenRuleModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [directGroups, setDirectGroups] = useState(buildEmptyGroups());
  const [ruleGroups, setRuleGroups] = useState(buildEmptyGroups());

  const programsIdx = enumsData?.programsIndex || {};
  const dispositiveIdx = enumsData?.dispositiveIndex || {};
  const provincesIdx = enumsData?.provincesIndex || {};
  const entityIdx = enumsData?.entityIndex || enumsData?.entitiesIndex || {};

  const getProgAcr = useCallback((programId, fallbackAcr, fallbackName) => {
    const meta = programsIdx[String(programId)] || {};
    return meta.acronym || fallbackAcr || fallbackName || meta.name || "—";
  }, [programsIdx]);

  const normalizeRowsToDirectGroups = useCallback((rows = []) => {
    const seen = { responsible: new Set(), coordinator: new Set(), supervisor: new Set() };
    const next = buildEmptyGroups();

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

      if (r.isProgramResponsible && r.idProgram && r.sources?.programResponsible?.type === "direct") {
        pushIfMissing("responsible", { _id: String(r.idProgram), scopeType: "program", name: r.programName || "Programa", ...commonProgram });
      }
      if (r.isProgramCoordinator && r.idProgram && r.sources?.programCoordinator?.type === "direct") {
        pushIfMissing("coordinator", { _id: String(r.idProgram), scopeType: "program", name: r.programName || "Programa", ...commonProgram });
      }
      if (r.isProgramSupervisor && r.idProgram && r.sources?.programSupervisor?.type === "direct") {
        pushIfMissing("supervisor", { _id: String(r.idProgram), scopeType: "program", name: r.programName || "Programa", ...commonProgram });
      }
      if (r.isDeviceResponsible && r.dispositiveId && r.sources?.deviceResponsible?.type === "direct") {
        pushIfMissing("responsible", { _id: String(r.dispositiveId), scopeType: "dispositive", name: r.dispositiveName || "Dispositivo", ...commonProgram });
      }
      if (r.isDeviceCoordinator && r.dispositiveId && r.sources?.deviceCoordinator?.type === "direct") {
        pushIfMissing("coordinator", { _id: String(r.dispositiveId), scopeType: "dispositive", name: r.dispositiveName || "Dispositivo", ...commonProgram });
      }
      if (r.isDeviceSupervisor && r.dispositiveId && r.sources?.deviceSupervisor?.type === "direct") {
        pushIfMissing("supervisor", { _id: String(r.dispositiveId), scopeType: "dispositive", name: r.dispositiveName || "Dispositivo", ...commonProgram });
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

  const normalizeRulesToGroups = useCallback((rules = []) => {
    const next = buildEmptyGroups();
    const roleKeyByType = { responsible: "responsible", coordinators: "coordinator", supervisors: "supervisor" };

    rules.forEach((rule) => {
      const roleKey = roleKeyByType[rule.roleType];
      if (!roleKey) return;

      next[roleKey].push({
        _id: String(rule._id),
        roleType: rule.roleType,
        scopeType: rule.scopeType,
        filters: {
          area: rule.filters?.area || "",
          provinceId: rule.filters?.provinceId ? String(rule.filters.provinceId) : "",
          provinceName: rule.filters?.provinceName || "",
          entityId: rule.filters?.entityId ? String(rule.filters.entityId) : "",
          entityName: rule.filters?.entityName || "",
          programId: rule.filters?.programId ? String(rule.filters.programId) : "",
          programName: rule.filters?.programName || "",
          programAcronym: rule.filters?.programAcronym || "",
          onlyActive: rule.filters?.onlyActive !== false,
        },
        note: rule.note || "",
        active: !!rule.active,
      });
    });

    Object.keys(next).forEach((k) => {
      next[k].sort((a, b) => {
        const aText = `${a.scopeType} ${a.filters?.area || ""} ${a.filters?.provinceName || ""} ${a.filters?.programAcronym || a.filters?.programName || ""}`;
        const bText = `${b.scopeType} ${b.filters?.area || ""} ${b.filters?.provinceName || ""} ${b.filters?.programAcronym || b.filters?.programName || ""}`;
        return aText.localeCompare(bText, "es");
      });
    });

    return next;
  }, []);

  const refresh = useCallback(async () => {
    if (!user?._id) {
      setDirectGroups(buildEmptyGroups());
      setRuleGroups(buildEmptyGroups());
      return;
    }

    try {
      setLoading(true);
      charge?.(true);
      const token = getToken();

      const [rows, rules] = await Promise.all([
        getUserScopedRoles({ userId: user._id }, token),
        listScopedRoleRules({ userId: user._id, active: true }, token),
      ]);

      if (rows?.error) throw new Error(rows?.message || "No se pudieron cargar las asignaciones.");
      if (rules?.error) throw new Error(rules?.message || "No se pudieron cargar las reglas.");

      setDirectGroups(normalizeRowsToDirectGroups(Array.isArray(rows) ? rows : []));
      setRuleGroups(normalizeRulesToGroups(Array.isArray(rules) ? rules : []));
    } catch (e) {
      modal?.("Error", e.message || "Error al cargar asignaciones.");
      setDirectGroups(buildEmptyGroups());
      setRuleGroups(buildEmptyGroups());
    } finally {
      charge?.(false);
      setLoading(false);
    }
  }, [user?._id, normalizeRowsToDirectGroups, normalizeRulesToGroups]);

  useEffect(() => {
    if (user?._id) refresh();
    else {
      setDirectGroups(buildEmptyGroups());
      setRuleGroups(buildEmptyGroups());
    }
  }, [user?._id, refresh]);

  const programOptions = useMemo(() => {
    return Object.entries(programsIdx)
      .map(([id, p]) => ({ value: id, label: p?.acronym || p?.name || id }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [programsIdx]);

  const directAssignOptions = useMemo(() => {
    const programItems = Object.entries(programsIdx).map(([id, p]) => ({
      value: `program:${id}`,
      label: `(Programa) ${p?.acronym || p?.name || id}`,
    }));

    const dispositiveItems = Object.entries(dispositiveIdx).map(([did, d]) => {
      const pid = d?.program ? String(d.program) : "";
      const pacr = programsIdx[pid]?.acronym || programsIdx[pid]?.name || "";
      return {
        value: `dispositive:${did}`,
        label: `(Dispositivo) ${d?.name || did}${pacr ? ` [${pacr}]` : ""}`,
      };
    });

    return [...programItems, ...dispositiveItems].sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [programsIdx, dispositiveIdx]);

  const provinceOptions = useMemo(() => {
    return [
      { value: "", label: "Sin provincia" },
      ...Object.entries(provincesIdx)
        .map(([id, p]) => ({ value: id, label: p?.name || id }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    ];
  }, [provincesIdx]);

  const entityOptions = useMemo(() => {
    return [
      { value: "", label: "Sin entidad" },
      ...Object.entries(entityIdx)
        .map(([id, e]) => ({ value: id, label: e?.name || e?.acronym || id }))
        .sort((a, b) => a.label.localeCompare(b.label, "es")),
    ];
  }, [entityIdx]);

  const buildDirectFields = () => [
    {
      name: "selected",
      label: "Asignación",
      type: "select",
      required: true,
      options: directAssignOptions,
    },
  ];

  const buildRuleFields = () => [
    {
      name: "scopeType",
      label: "Aplica sobre",
      type: "select",
      required: true,
      options: [
        { value: "program", label: "Programas" },
        { value: "dispositive", label: "Dispositivos" },
      ],
    },
    { name: "area", label: "Área", type: "select", options: AREA_OPTIONS },
    { name: "provinceId", label: "Provincia", type: "select", options: provinceOptions },
    { name: "programId", label: "Programa", type: "select", options: [{ value: "", label: "Sin programa" }, ...programOptions] },
    { name: "entityId", label: "Entidad", type: "select", options: entityOptions },
    {
      name: "onlyActive",
      label: "Solo activos",
      type: "select",
      defaultValue: "true",
      options: [
        { value: "true", label: "Sí" },
        { value: "false", label: "No" },
      ],
    },
    { name: "note", label: "Nota", type: "textarea" },
  ];

  const handleDelete = (mode, roleKey, item) => setConfirm({ mode, roleKey, item });
  const onCancel = () => setConfirm(null);

  const onConfirm = async () => {
    if (!confirm) return;
    const { mode, roleKey, item } = confirm;

    try {
      charge?.(true);
      const token = getToken();

      if (mode === "rule") {
        const result = await deleteScopedRoleRule({ ruleId: item._id }, token);
        if (result?.error) throw new Error(result.message || "No se pudo eliminar la regla.");
      } else {
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
      }

      await refresh();
      modal?.("Eliminado", mode === "rule" ? "Se ha eliminado la regla correctamente." : "Se ha eliminado correctamente.");
    } catch (e) {
      modal?.("Error", e.message || "No se pudo eliminar.");
    } finally {
      charge?.(false);
      setConfirm(null);
    }
  };

  const handleSubmitDirectAdd = async (roleKey, form) => {
    try {
      charge?.(true);
      const token = getToken();

      const [scopeType, scopeId] = String(form.selected || "").split(":");
      if (!scopeType || !scopeId) throw new Error("Seleccione un programa o dispositivo válido.");

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
      setOpenDirectModal(null);
    } catch (e) {
      modal?.("Error", e.message || "No se pudo añadir.");
    } finally {
      charge?.(false);
    }
  };

  const handleSubmitRuleAdd = async (roleKey, form) => {
    try {
      charge?.(true);
      const token = getToken();

      const payload = {
        userId: user._id,
        roleType: ROLE_CONFIG[roleKey].roleType,
        scopeType: form.scopeType,
        filters: {
          area: form.area || null,
          provinceId: form.provinceId || null,
          entityId: form.entityId || null,
          programId: form.programId || null,
          onlyActive: String(form.onlyActive) !== "false",
        },
        note: form.note || "",
      };

      const result = await createScopedRoleRule(payload, token);
      if (result?.error) throw new Error(result.message || "No se pudo crear la regla.");

      await refresh();
      modal?.("Añadido", "Se ha creado la regla correctamente.");
      setOpenRuleModal(null);
    } catch (e) {
      modal?.("Error", e.message || "No se pudo crear la regla.");
    } finally {
      charge?.(false);
    }
  };

  const renderDirectItem = (roleKey, item) => (
    <li key={`${roleKey}-${item.scopeType}-${item._id}`} className={styles.dispositivos}>
      <p>
        <span className={styles.tag}>{item.scopeType === "program" ? "Programa" : "Dispositivo"}</span>
        {item.scopeType === "program" ? (
          getProgAcr(item._id, item.programAcronym, item.name)
        ) : (
          <>
            <span className={styles.itemTitle}>{item.name}</span>
            {item.programId && <small>Pertenece a: {getProgAcr(item.programId, item.programAcronym)}</small>}
          </>
        )}
      </p>

      {canEdit && (
        <span>
          <FaTrashAlt onClick={() => handleDelete("direct", roleKey, item)} />
        </span>
      )}
    </li>
  );

  const renderRuleItem = (roleKey, item) => (
    <li key={`${roleKey}-rule-${item._id}`} className={styles.dispositivos}>
      <div className={styles.ruleBody}>
        <div className={styles.ruleHeader}>
          <span className={styles.tag}>Regla</span>
          <span className={styles.ruleScope}>{item.scopeType === "program" ? "Programas" : "Dispositivos"}</span>
        </div>

        <div className={styles.ruleFields}>
          {item.filters?.area && (
            <div className={styles.ruleField}>
              <span>Área</span>
              <strong>{item.filters.area}</strong>
            </div>
          )}

          {item.filters?.provinceName && (
            <div className={styles.ruleField}>
              <span>Provincia</span>
              <strong>{item.filters.provinceName}</strong>
            </div>
          )}

          {item.filters?.programId && (
            <div className={styles.ruleField}>
              <span>Programa</span>
              <strong>{getProgAcr(item.filters.programId, item.filters.programAcronym, item.filters.programName)}</strong>
            </div>
          )}

          {item.filters?.entityName && (
            <div className={styles.ruleField}>
              <span>Entidad</span>
              <strong>{item.filters.entityName}</strong>
            </div>
          )}

          <div className={styles.ruleField}>
            <span>Estado</span>
            <strong>{item.filters?.onlyActive ? "Solo activos" : "Activos e inactivos"}</strong>
          </div>
        </div>

        {!!item.note && <div className={styles.ruleNote}>{item.note}</div>}
      </div>

      {canEdit && (
        <span>
          <FaTrashAlt onClick={() => handleDelete("rule", roleKey, item)} />
        </span>
      )}
    </li>
  );

  const renderSection = (mode, groups) => (
    <div className={styles.groupGrid}>
      {Object.entries(ROLE_CONFIG).map(([roleKey, conf]) => (
        <div className={styles.contenedor} key={`${mode}-${roleKey}`}>
          <h2>
            {conf.title}
            {canEdit && (
              <FaSquarePlus onClick={() => mode === "direct" ? setOpenDirectModal(roleKey) : setOpenRuleModal(roleKey)} />
            )}
          </h2>
          {conf?.description && <p className={styles.description}>{conf?.description}</p>}
          <div className={styles.contenedorBotones}>
            {loading ? (
              <p>Cargando…</p>
            ) : groups[roleKey]?.length > 0 ? (
              <ul>
                {groups[roleKey].map((item) =>
                  mode === "direct" ? renderDirectItem(roleKey, item) : renderRuleItem(roleKey, item)
                )}
              </ul>
            ) : (
              <p>{mode === "direct" ? conf.directEmpty : conf.ruleEmpty}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <div className={styles.blocks}>
      <section className={styles.mainBlock}>
        <div className={styles.blockHeader}>
          <h1>ASIGNACIONES DIRECTAS</h1>
          <p>Programas y dispositivos asignados manualmente a la persona.</p>
        </div>
        {renderSection("direct", directGroups)}
      </section>

      <section className={styles.mainBlock}>
        <div className={styles.blockHeader}>
          <h1>REGLAS</h1>
          <p>Permisos heredados por área, provincia, programa o entidad.</p>
        </div>
        {renderSection("rule", ruleGroups)}
      </section>

      {openDirectModal && (
        <ModalForm
          title={ROLE_CONFIG[openDirectModal].addDirectTitle}
          message={ROLE_CONFIG[openDirectModal].addDirectMessage}
          fields={buildDirectFields()}
          onSubmit={(form) => handleSubmitDirectAdd(openDirectModal, form)}
          onClose={() => setOpenDirectModal(null)}
          modal={modal}
        />
      )}

      {openRuleModal && (
        <ModalForm
          title={ROLE_CONFIG[openRuleModal].addRuleTitle}
          message={ROLE_CONFIG[openRuleModal].addRuleMessage}
          fields={buildRuleFields()}
          onSubmit={(form) => handleSubmitRuleAdd(openRuleModal, form)}
          onClose={() => setOpenRuleModal(null)}
          modal={modal}
        />
      )}

      {confirm && (
        <ModalConfirmation
          title={confirm.mode === "rule" ? "Eliminar regla" : "Eliminar asignación"}
          message={confirm.mode === "rule" ? "¿Seguro que quieres eliminar esta regla?" : "¿Seguro que quieres eliminar esta asignación?"}
          onConfirm={onConfirm}
          onCancel={onCancel}
        />
      )}
    </div>
  );
};

export default ResponsabilityAndCoordination;