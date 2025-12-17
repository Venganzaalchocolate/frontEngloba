// src/components/employer/WorkspaceGroupAliases.jsx
import React, { useMemo, useState } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { FaTrash } from "react-icons/fa6";
import { MdGroups } from "react-icons/md";

import { addGroupAliasWS, deleteGroupAliasWS } from "../../lib/data";

const DEFAULT_DOMAIN = "engloba.org.es";

const normalizeString = (str = "") =>
  String(str)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "")
    .replace(/[^a-z0-9]/g, "");

const isValidEmail = (email) => /^[\w.+-]+@[\w.-]+\.[\w]{2,}$/i.test(email);

export default function WorkspaceGroupAliases({
  group,        // { id, nombre, email, aliases, totalAliases }
  groups,       // array completo (para rollback)
  setGroups,    // setter del padre
  token,
  modal,
  charge,
  styles,       // reutiliza tu CSS module del padre
  domain = DEFAULT_DOMAIN,
}) {
  const [showAliasModal, setShowAliasModal] = useState(false);
  const [confirmAliasDelete, setConfirmAliasDelete] = useState({
    show: false,
    groupId: null,
    aliasEmail: null,
  });

  const aliasFields = useMemo(
    () => [
      {
        name: "aliasEmail",
        label: "Alias del grupo",
        type: "text",
        required: true,
        placeholder: `alias@${domain} (o solo "alias")`,
      },
    ],
    [domain]
  );

  const normalizeAliasEmail = (raw) => {
    const v = String(raw || "").trim().toLowerCase();
    if (!v) return "";
    if (v.includes("@")) return v;
    return `${normalizeString(v)}@${domain}`;
  };

  const handleAddAlias = async (formData) => {
    if (!group?.id) return;

    const aliasEmail = normalizeAliasEmail(formData.aliasEmail);

    if (!aliasEmail || !isValidEmail(aliasEmail)) {
      modal("Aviso", "El alias no tiene un formato de email válido.");
      return;
    }

    // evitar duplicado en UI
    const existing = Array.isArray(group.aliases) ? group.aliases : [];
    if (existing.includes(aliasEmail)) {
      modal("Aviso", "Ese alias ya está añadido en este grupo.");
      return;
    }

    const prevGroups = groups;

    // ✅ optimista
    setGroups((prev) =>
      prev.map((g) =>
        g.id === group.id
          ? {
              ...g,
              aliases: Array.from(new Set([...(g.aliases || []), aliasEmail])),
              totalAliases:
                typeof g.totalAliases === "number"
                  ? g.totalAliases + 1
                  : (g.aliases?.length || 0) + 1,
            }
          : g
      )
    );

    charge(true);
    const res = await addGroupAliasWS({ groupKey: group.id, aliasEmail }, token);
    charge(false);

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo añadir el alias.");
      setGroups(prevGroups); // 🔙 rollback
      return;
    }

    modal("Actualizado", "Alias añadido correctamente.");
    setShowAliasModal(false);
  };

  const handleConfirmRemoveAlias = async () => {
    const { groupId, aliasEmail } = confirmAliasDelete;
    if (!groupId || !aliasEmail) return;

    const prevGroups = groups;

    // ✅ optimista
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId
          ? {
              ...g,
              aliases: (g.aliases || []).filter((a) => a !== aliasEmail),
              totalAliases:
                typeof g.totalAliases === "number"
                  ? Math.max(0, g.totalAliases - 1)
                  : Math.max(0, (g.aliases?.length || 1) - 1),
            }
          : g
      )
    );

    charge(true);
    const res = await deleteGroupAliasWS({ groupKey: groupId, aliasEmail }, token);
    charge(false);

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo eliminar el alias.");
      setGroups(prevGroups); // 🔙 rollback
      return;
    }

    modal("Actualizado", "Alias eliminado correctamente.");
    setConfirmAliasDelete({ show: false, groupId: null, aliasEmail: null });
  };

  const aliasCount = group?.totalAliases ?? group?.aliases?.length ?? 0;
  const aliasList = Array.isArray(group?.aliases) ? group.aliases : [];

  return (
    <>
      {/* Bloque Aliases */}
      <div className={styles.membersBlock}>
        <div className={styles.cabecera}>
          <h4 className={styles.membersTitle}>Alias</h4>

          <div className={styles.groupActions}>
            <span className={styles.badge}>Total Alias: {aliasCount}</span>
            <button
              type="button"
              className={styles.btnAddSubgroup}
              onClick={() => setShowAliasModal(true)}
              title="Añadir alias"
            >
              <MdGroups />
              Añadir alias
            </button>
          </div>
        </div>

        {aliasList.length > 0 ? (
          <div className={styles.pillsRow}>
            {aliasList.map((a) => (
              <div key={a} className={styles.memberPillGroup}>
                <span className={styles.memberEmail}>{a}</span>
                <button
                  type="button"
                  className={styles.btnRemove}
                  title="Eliminar alias"
                  onClick={() =>
                    setConfirmAliasDelete({
                      show: true,
                      groupId: group.id,
                      aliasEmail: a,
                    })
                  }
                >
                  <FaTrash />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className={styles.noMembers}>Este grupo no tiene alias.</p>
        )}
      </div>

      {/* Modal añadir alias */}
      {showAliasModal && (
        <ModalForm
          title={`Añadir alias a ${group?.nombre || group?.email}`}
          message={`Escribe el alias. Puedes poner solo "alias" o "alias@${domain}".`}
          fields={aliasFields}
          onSubmit={handleAddAlias}
          onClose={() => setShowAliasModal(false)}
        />
      )}

      {/* Modal confirmar eliminación */}
      {confirmAliasDelete.show && (
        <ModalConfirmation
          title="Eliminar alias"
          message={`¿Seguro que deseas eliminar el alias ${confirmAliasDelete.aliasEmail}?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleConfirmRemoveAlias}
          onCancel={() =>
            setConfirmAliasDelete({ show: false, groupId: null, aliasEmail: null })
          }
        />
      )}
    </>
  );
}
