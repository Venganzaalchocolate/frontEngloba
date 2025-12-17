// src/components/employer/WorkspaceProgramOrDispositive.jsx
import React, { useEffect, useState, useCallback, useMemo } from "react";
import styles from "../styles/WorkspaceProgramOrDispositive.module.css";
import { getToken } from "../../lib/serviceToken";
import {
  wsgetModelWorkspaceGroups,
  wsAddMember,
  wsRemoveMember,
  wsCreateGroup,
  searchusername,
  wsDeleteGroup,
} from "../../lib/data";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import WorkspaceGroupAliases from "./WorkspaceGroupAliases";
import { BsPersonFillAdd } from "react-icons/bs";
import { FaTrash } from "react-icons/fa6";
import { MdGroups } from "react-icons/md";

const DOMAIN = "engloba.org.es";

const suffixMap = {
  coordination: "coor",
  direction: "dir",
  social: "trab",
  psychology: "psico",
  education: "edu",
  tecnicos: "tec",
  blank: "",
};

const typeGroupNamePrefixes = {
  direction: "Dirección de",
  social: "Equipo trabajadores sociales",
  tecnicos: "Equipo Técnico",
  psychology: "Equipo de Psicólogos",
  education: "Equipo de Educadores",
  coordination: "Equipo de Coordinadores",
  blank: "Subgrupo de",
};

const normalizeString = (str = "") =>
  String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

const WorkspaceProgramOrDispositive = ({ info, modal, charge, deviceWorkers }) => {
  const [groups, setGroups] = useState([]);
  const [loadingLocal, setLoadingLocal] = useState(false);

  const [showAddModal, setShowAddModal] = useState(false);
  const [targetGroup, setTargetGroup] = useState(null);

  const [confirmSubDelete, setConfirmSubDelete] = useState({
    show: false,
    parentGroup: null,
    subgroup: null,
  });

  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    groupId: null,
    member: null,
  });

  const [showSubgroupModal, setShowSubgroupModal] = useState(false);
  const [targetGroupSub, setTargetGroupSub] = useState(null);

  const token = getToken();

  const searchUsersWorkspace = useCallback(
    async (query) => {
      if (!query || query.trim().length < 3) return [];

      const res = await searchusername({ query }, token);
      if (!res || res.error) return [];

      const users = res.users || [];
      return users.map((u) => ({
        value: u.email,
        label: `${u.firstName || ""} ${u.lastName || ""} (${u.email || "sin email"})`,
      }));
    },
    [token]
  );

 const infoId = info?._id || null;
const infoType = info?.type || null;

useEffect(() => {
  if (!infoId || !infoType) { setGroups([]); return; }

  let cancelled = false;

  const fetchWorkspace = async () => {
    setLoadingLocal(true);
    charge(true);

    const body = { type: infoType === "program" ? "program" : "device", id: infoId };
    const res = await wsgetModelWorkspaceGroups(body, token);

    if (cancelled) return;

    if (!res || res.error) {
      modal("Error", res?.message || "No se ha podido cargar la información de Workspace de este elemento.");
      setGroups([]);
    } else {
      const payload = (res && typeof res === "object" && "data" in res) ? res.data : res;
      setGroups(Array.isArray(payload) ? payload : []);
    }

    charge(false);
    setLoadingLocal(false);
  };

  fetchWorkspace();

  return () => { cancelled = true; };
}, [infoId, infoType]);

  const openAddMemberModal = (group) => {
    setTargetGroup(group);
    setShowAddModal(true);
  };

  const fieldsAddMember = useMemo(() => {
    const existingEmails = (targetGroup?.miembros || [])
      .map((m) => m.email)
      .filter(Boolean);

    const filteredDeviceWorkers = Array.isArray(deviceWorkers)
      ? deviceWorkers.filter((u) => u && u.email && !existingEmails.includes(u.email))
      : [];

    const deviceWorkerOptions =
      filteredDeviceWorkers.length > 0
        ? [
          { value: "", label: "— Seleccione —" },
          ...filteredDeviceWorkers.map((u) => ({
            value: u.email,
            label: `${u.firstName || ""} ${u.lastName || ""} (${u.email})`,
          })),
        ]
        : [
          {
            value: "",
            label:
              existingEmails.length > 0
                ? "Todos los trabajadores del dispositivo ya están en el grupo"
                : "No hay trabajadores vinculados al dispositivo",
          },
        ];

    return [
      {
        name: "memberSearch",
        label: "Busca un trabajador (por nombre o email)",
        type: "async-search-select",
        placeholder: "Escriba al menos 3 letras...",
        required: false,
        loadOptions: searchUsersWorkspace,
      },
      {
        name: "memberDevice",
        label: "Selecciona un trabajador del dispositivo",
        type: "select",
        required: false,
        options: deviceWorkerOptions,
      },
      {
        name: "role",
        label: "Rol en el grupo",
        type: "select",
        required: true,
        defaultValue: "MEMBER",
        options: [
          { value: "MEMBER", label: "Miembro" },
          { value: "MANAGER", label: "Manager" },
          { value: "OWNER", label: "Owner" },
        ],
      },
    ];
  }, [targetGroup, deviceWorkers, searchUsersWorkspace]);

  const handleConfirmRemoveSubgroup = async () => {
    const { parentGroup, subgroup } = confirmSubDelete;
    if (!parentGroup?.id || !subgroup?.id || !info?._id || !info?.type) return;

    const prevGroups = groups;

    const payload = {
      groupId: subgroup.id,
      idGroupFather: parentGroup.id,
      id: info._id,
      type: info.type === "program" ? "program" : "device",
    };

    setGroups((prev) =>
      prev
        .filter((g) => g.id !== subgroup.id)
        .map((g) =>
          g.id === parentGroup.id
            ? {
              ...g,
              miembros: (g.miembros || []).filter((m) => m.id !== subgroup.id),
              totalMiembros:
                typeof g.totalMiembros === "number"
                  ? Math.max(0, g.totalMiembros - 1)
                  : Math.max(0, (g.miembros?.length || 1) - 1),
            }
            : g
        )
    );

    charge(true);
    const res = await wsDeleteGroup(payload, token);
    charge(false);

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo eliminar el subgrupo en Workspace.");
      setGroups(prevGroups);
      setConfirmSubDelete({ show: false, parentGroup: null, subgroup: null });
      return;
    }

    modal("Actualizado", "Subgrupo eliminado correctamente.");
    setConfirmSubDelete({ show: false, parentGroup: null, subgroup: null });
  };

  const handleAddMember = async (formData) => {
    if (!targetGroup?.id) return;

    const memberEmail = formData.memberDevice || formData.memberSearch;
    const role = formData.role || "MEMBER";

    if (!memberEmail) {
      modal(
        "Aviso",
        "Debes seleccionar una persona (bien buscándola o desde la lista del dispositivo)."
      );
      return;
    }

    const prevGroups = groups;

    const tempMember = {
      id: `temp-${Date.now()}`,
      email: memberEmail,
      role,
      type: "USER",
      status: "ACTIVE",
    };

    setGroups((prev) =>
      prev.map((g) =>
        g.id === targetGroup.id
          ? {
            ...g,
            miembros: [...(g.miembros || []), tempMember],
            totalMiembros:
              typeof g.totalMiembros === "number"
                ? g.totalMiembros + 1
                : (g.miembros?.length || 0) + 1,
          }
          : g
      )
    );

    charge(true);
    const res = await wsAddMember(
      { groupId: targetGroup.id, memberEmail, role },
      token
    );
    charge(false);

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo añadir el miembro al grupo.");
      setGroups(prevGroups);
      return;
    }

    modal("Actualizado", "Miembro añadido correctamente al grupo.");
    setShowAddModal(false);
    setTargetGroup(null);
  };

  const handleConfirmRemove = async () => {
    if (!confirmDelete.groupId || !confirmDelete.member?.email) return;

    const { groupId, member } = confirmDelete;
    const prevGroups = groups;

    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
            ...g,
            miembros: (g.miembros || []).filter((m) => m.email !== member.email),
            totalMiembros:
              typeof g.totalMiembros === "number"
                ? Math.max(0, g.totalMiembros - 1)
                : Math.max(0, (g.miembros?.length || 1) - 1),
          }
          : g
      )
    );

    charge(true);
    const res = await wsRemoveMember(
      { groupId, memberEmail: member.email },
      token
    );
    charge(false);

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo eliminar el miembro del grupo.");
      setGroups(prevGroups);
      return;
    }

    modal("Actualizado", "Miembro eliminado correctamente del grupo.");
    setConfirmDelete({ show: false, groupId: null, member: null });
  };

  const openSubgroupModal = (group) => {
    setTargetGroupSub(group);
    setShowSubgroupModal(true);
  };

  const baseSubgroupTypeOptions = [
    { value: "coordination", label: "Coordinación" },
    { value: "direction", label: "Dirección" },
    { value: "social", label: "Trabajo social" },
    { value: "psychology", label: "Psicología" },
    { value: "education", label: "Educación" },
    { value: "tecnicos", label: "Equipo técnico" },
  ];

  const getSubgroupFields = () => {
    if (!info) {
      return [
        {
          name: "typeGroup",
          label: "Tipo de subgrupo",
          type: "select",
          required: true,
          defaultValue: "coordination",
          options: baseSubgroupTypeOptions,
        },
      ];
    }

    const baseName =
      info.type === "program" ? info.acronym || info.name || "" : info.name || "";
    const normalizedBase = normalizeString(baseName);

    const usedTypes = new Set();

    groups.forEach((g) => {
      const email = g.email || "";
      const local = email.split("@")[0] || "";
      if (!local.startsWith(normalizedBase)) return;

      const rest = local.slice(normalizedBase.length);
      if (!rest.startsWith(".")) return;

      const suffix = rest.slice(1);
      const found = Object.entries(suffixMap).find(([, suf]) => suf === suffix);
      if (found) usedTypes.add(found[0]);
    });

    const availableOptions = baseSubgroupTypeOptions.filter(
      (opt) => !usedTypes.has(opt.value)
    );

    return [
      {
        name: "typeGroup",
        label: "Tipo de subgrupo",
        type: "select",
        required: true,
        defaultValue: availableOptions[0]?.value || baseSubgroupTypeOptions[0].value,
        options: availableOptions,
      },
    ];
  };

  const handleCreateSubgroup = async (formData) => {
    if (!targetGroupSub?.id || !info?._id || !info?.type) return;

    const typeGroup = formData.typeGroup;
    const prevGroups = groups;

    const baseName =
      info.type === "program" ? info.acronym || info.name || "" : info.name || "";
    const normalized = normalizeString(baseName);
    const suffix = suffixMap[typeGroup] ? `.${suffixMap[typeGroup]}` : "";
    const predictedEmail = `${normalized}${suffix}@${DOMAIN}`;

    const prefix = typeGroupNamePrefixes[typeGroup] || typeGroupNamePrefixes.blank;
    const predictedName = `${prefix}: ${baseName}`;

    const tempId = `temp-sub-${Date.now()}`;

    const tempSubGroup = {
      id: tempId,
      email: predictedEmail,
      nombre: predictedName,
      descripcion: "",
      miembros: [],
      totalMiembros: 0,
      aliases: [],
      totalAliases: 0,
    };

    const tempMemberRef = {
      id: tempId,
      email: predictedEmail,
      role: "MEMBER",
      type: "GROUP",
      status: "ACTIVE",
    };

    setGroups((prev) =>
      [
        ...prev.map((g) =>
          g.id === targetGroupSub.id
            ? {
              ...g,
              miembros: [...(g.miembros || []), tempMemberRef],
              totalMiembros:
                typeof g.totalMiembros === "number"
                  ? g.totalMiembros + 1
                  : (g.miembros?.length || 0) + 1,
            }
            : g
        ),
        tempSubGroup,
      ].sort((a, b) => (a.nombre || "").localeCompare(b.nombre || ""))
    );

    const payload = {
      idGroupFather: targetGroupSub.id,
      typeGroup,
      id: info._id,
      type: info.type === "program" ? "program" : "device",
    };

    charge(true);
    const res = await wsCreateGroup(payload, token);
    charge(false);

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo crear el subgrupo en Workspace.");
      setGroups(prevGroups);
      return;
    }

    const created = res.group || (res.data && res.data.group) || null;

    if (created && created.id && created.email) {
      setGroups((prev) =>
        prev.map((g) => {
          if (g.id === tempId) {
            return {
              ...g,
              id: created.id,
              email: created.email,
              nombre: created.nombre || predictedName,
              descripcion: created.descripcion || "",
              aliases: created.aliases || g.aliases || [],
              totalAliases:
                typeof created.totalAliases === "number"
                  ? created.totalAliases
                  : (created.aliases?.length || g.aliases?.length || 0),
            };
          }
          if (g.id === targetGroupSub.id) {
            return {
              ...g,
              miembros: (g.miembros || []).map((m) =>
                m.id === tempId ? { ...m, id: created.id, email: created.email } : m
              ),
            };
          }
          return g;
        })
      );
    }

    modal("Actualizado", "Subgrupo creado correctamente.");
    setShowSubgroupModal(false);
    setTargetGroupSub(null);
  };

  const mainGroupId = info?.groupWorkspace || null;

  const orderedGroups = useMemo(() => {
    return [...groups].sort((a, b) => {
      const aIsMain = mainGroupId && a.id === mainGroupId;
      const bIsMain = mainGroupId && b.id === mainGroupId;
      if (aIsMain && !bIsMain) return -1;
      if (bIsMain && !aIsMain) return 1;
      return (a.nombre || "").localeCompare(b.nombre || "");
    });
  }, [groups, mainGroupId]);

  if (!info?._id) {
    return (
      <div className={styles.empty}>
        Selecciona primero un programa o dispositivo para ver su Workspace.
      </div>
    );
  }

  if (loadingLocal) {
    return <div className={styles.loading}>Cargando información de Workspace…</div>;
  }

  if (!groups.length) {
    return (
      <div className={styles.empty}>
        Este {info.type === "program" ? "programa" : "dispositivo"} no tiene grupos
        configurados en Workspace.
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {orderedGroups.map((g) => {
        const userMembers = (g.miembros || []).filter((m) => m.type === "USER");
        const groupMembers = (g.miembros || []).filter((m) => m.type === "GROUP");

        const parentGroup = orderedGroups.find((gg) =>
          (gg.miembros || []).some((m) => m.type === "GROUP" && m.id === g.id)
        );

        const isMainGroup = mainGroupId && g.id === mainGroupId;
        const isSubgroupOfModel = !!parentGroup && !isMainGroup;
        const canAddSubgroup = !!isMainGroup;
        const canDeleteSubgroup = !!isSubgroupOfModel;

        return (
          <div key={g.id} className={styles.groupCard}>
            <div className={styles.groupHeader}>
              <div>
                <h3>{g.nombre || "Grupo sin nombre"}</h3>
                <p className={styles.groupEmail}>{g.email}</p>
                {g.descripcion && (
                  <p className={styles.groupDescription}>{g.descripcion}</p>
                )}
              </div>

              <div className={styles.groupMeta}>
                <div className={styles.groupActions}>
                  {canDeleteSubgroup && (
                    <button
                      type="button"
                      className={styles.btnRemoveSubCard}
                      title="Eliminar este subgrupo"
                      onClick={() =>
                        setConfirmSubDelete({
                          show: true,
                          parentGroup,
                          subgroup: { id: g.id, email: g.email },
                        })
                      }
                    >
                      Borrar Subgrupo
                    </button>
                  )}
                </div>
              </div>
            </div>

            {groupMembers.length > 0 && (
              <div className={styles.membersBlock}>
                <div className={styles.cabecera}>
                  <h4 className={styles.membersTitle}>Subgrupos</h4>
                  {canAddSubgroup && (
                    <button
                      className={styles.btnAddSubgroup}
                      onClick={() => openSubgroupModal(g)}
                      type="button"
                    >
                      <MdGroups />
                      Añadir subgrupo
                    </button>
                  )}
                </div>

                <div className={styles.pillsRow}>
                  {groupMembers.map((m) => (
                    <div key={m.id} className={styles.memberPillGroup}>
                      <span className={styles.memberEmail}>{m.email}</span>
                      

                      {(Array.isArray(info?.subGroupWorkspace) &&
                        info.subGroupWorkspace.includes(m.id)) ||
                        (isMainGroup && orderedGroups.some((gg) => gg.id === m.id)) ? (
                        <button
                          type="button"
                          className={styles.btnRemove}
                          title="Eliminar este subgrupo"
                          onClick={() =>
                            setConfirmSubDelete({
                              show: true,
                              parentGroup: g,
                              subgroup: { id: m.id, email: m.email },
                            })
                          }
                        >
                          <FaTrash />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Aliases (componente aparte) */}
            <WorkspaceGroupAliases
              group={g}
              groups={groups}
              setGroups={setGroups}
              token={token}
              modal={modal}
              charge={charge}
              styles={styles}
            />

            <div className={styles.membersBlock}>
              <div className={styles.cabecera}>
                <h4 className={styles.membersTitle}>Miembros (personas)</h4>



                <div className={styles.groupActions}>
                  <span className={styles.badge}>
                    Total miembros: {g.totalMiembros ?? g.miembros?.length ?? 0}
                  </span>
                  <button
                    className={styles.btnAddMember}
                    onClick={() => openAddMemberModal(g)}
                    type="button"
                  >
                    <BsPersonFillAdd />
                    Añadir miembro
                  </button>

                </div>


              </div>
              {userMembers.length > 0 ? (
                <div className={styles.membersList}>
                  {userMembers.map((m) => (
                    <div key={m.id} className={styles.memberRow}>
                      <div className={styles.memberInfo}>
                        <span className={styles.memberEmail}>{m.email}</span>
                        <span className={styles.memberRole}>
                          {m.role} {m.type ? `· ${m.type}` : ""}
                        </span>
                        {m.status && (
                          <span
                            className={`${styles.memberStatus} ${m.status === "ACTIVE" ? styles.active : styles.inactive
                              }`}
                          >
                            {m.status}
                          </span>
                        )}
                      </div>
                      <button
                        className={styles.btnRemove}
                        onClick={() =>
                          setConfirmDelete({
                            show: true,
                            groupId: g.id,
                            member: m,
                          })
                        }
                        type="button"
                      >
                        <FaTrash />
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className={styles.noMembers}>
                  Este grupo no tiene miembros (personas).
                </p>
              )}
            </div>
          </div>
        );
      })}

      {showAddModal && targetGroup && (
        <ModalForm
          title={`Añadir miembro a ${targetGroup.nombre || targetGroup.email}`}
          message="Busque y seleccione la persona que desea añadir al grupo."
          fields={fieldsAddMember}
          onSubmit={handleAddMember}
          onClose={() => {
            setShowAddModal(false);
            setTargetGroup(null);
          }}
        />
      )}

      {confirmDelete.show && (
        <ModalConfirmation
          title="Eliminar miembro"
          message={`¿Seguro que deseas eliminar a ${confirmDelete.member?.email} de este grupo?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleConfirmRemove}
          onCancel={() =>
            setConfirmDelete({ show: false, groupId: null, member: null })
          }
        />
      )}

      {showSubgroupModal && targetGroupSub && (
        <ModalForm
          title={`Crear subgrupo dentro de ${targetGroupSub.nombre || targetGroupSub.email
            }`}
          message="Selecciona el tipo de subgrupo que quieres crear. El email se generará automáticamente."
          fields={getSubgroupFields()}
          onSubmit={handleCreateSubgroup}
          onClose={() => {
            setShowSubgroupModal(false);
            setTargetGroupSub(null);
          }}
        />
      )}

      {confirmSubDelete.show && (
        <ModalConfirmation
          title="Eliminar subgrupo"
          message={`¿Seguro que deseas eliminar el subgrupo ${confirmSubDelete.subgroup?.email}?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleConfirmRemoveSubgroup}
          onCancel={() =>
            setConfirmSubDelete({ show: false, parentGroup: null, subgroup: null })
          }
        />
      )}
    </div>
  );
};

export default WorkspaceProgramOrDispositive;
