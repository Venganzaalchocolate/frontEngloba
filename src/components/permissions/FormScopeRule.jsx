// src/components/permissions/FormScopeRule.jsx
import { useMemo } from "react";
import ModalForm from "../globals/ModalForm";

import {
  RESOURCE_TYPES,
  RESOURCE_ROLES,
  RESOURCE_TYPE_LABEL,
  RESOURCE_ROLE_LABEL,
} from "./permissionsLabels";

const asStr = (v) => (v == null ? "" : String(v));
const toBool = (v) => v === true || ["si", "sí", "SI", "Sí", "true"].includes(String(v));

export default function FormScopeRule({
  enumsData,
  closeModal,
  modal,
  rule = null, // si viene -> edit
  profileOptions = [], // [{value,label}]
  onSubmit,
}) {
  const isEditing = !!rule;

  const provinceOptions = useMemo(() => {
    const idx = enumsData?.provincesIndex && typeof enumsData.provincesIndex === "object"
      ? enumsData.provincesIndex
      : {};

    const opts = Object.entries(idx)
      .map(([id, v]) => ({
        value: String(id),
        label: v?.name || v?.label || v?.title || String(id),
        public: v?.public,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));

    // "__ALL__" -> null en backend
    return [{ value: "__ALL__", label: "Todas las provincias" }, ...opts];
  }, [enumsData]);

  const typeOptions = useMemo(
    () => RESOURCE_TYPES.map((t) => ({ value: t, label: RESOURCE_TYPE_LABEL?.[t] || t })),
    []
  );

  const roleOptions = useMemo(
    () => RESOURCE_ROLES.map((r) => ({ value: r, label: RESOURCE_ROLE_LABEL?.[r] || r })),
    []
  );

  const buildFields = () => {
    const fields = [
      {
        type: "info",
        content: isEditing
          ? "Editando regla (solo puedes activar/desactivar y cambiar nota). Para cambiar tipo/rol/provincia/perfil: elimina y crea otra."
          : "Crea una regla: cuando un usuario tenga un rol en un scope, se le aplicará este perfil.",
      },
    ];

    if (!isEditing) {
      fields.push(
        {
          name: "resourceType",
          label: "Tipo de recurso",
          type: "select",
          required: true,
          defaultValue: "",
          options: typeOptions,
        },
        {
          name: "role",
          label: "Rol",
          type: "select",
          required: true,
          defaultValue: "",
          options: roleOptions,
        },
        {
          name: "provinceId",
          label: "Provincia (opcional)",
          type: "select",
          required: true,
          defaultValue: "__ALL__",
          options: provinceOptions,
          searchable: true,
        },
        {
          name: "profileId",
          label: "Perfil",
          type: "select",
          required: true,
          defaultValue: "",
          options: profileOptions,
          searchable: true,
        }
      );
    } else {
      const t = asStr(rule?.resourceType || "");
      const r = asStr(rule?.role || "");
      const pName = rule?.profileId?.name || asStr(rule?.profileId || "");
      const provName = rule?.provinceId?.name || "Todas las provincias";

      fields.push(
        { type: "info", content: `Tipo: ${RESOURCE_TYPE_LABEL?.[t] || t || "—"}` },
        { type: "info", content: `Rol: ${RESOURCE_ROLE_LABEL?.[r] || r || "—"}` },
        { type: "info", content: `Provincia: ${provName}` },
        { type: "info", content: `Perfil: ${pName || "—"}` }
      );
    }

    fields.push(
      {
        name: "active",
        label: "Activa",
        type: "select",
        required: true,
        defaultValue: rule?.active === false ? "no" : "si",
        options: [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ],
      },
      {
        name: "note",
        label: "Nota (opcional)",
        type: "textarea",
        required: false,
        defaultValue: rule?.note || "",
        capsGuard: true,
      }
    );

    return fields;
  };

  const handleSubmit = async (formData) => {
    try {
      if (!isEditing) {
        const resourceType = asStr(formData.resourceType).trim();
        const role = asStr(formData.role).trim();
        const provinceIdRaw = asStr(formData.provinceId).trim();
        const profileId = asStr(formData.profileId).trim();

        if (!resourceType) return modal?.("Error", "Selecciona el tipo de recurso.");
        if (!role) return modal?.("Error", "Selecciona el rol.");
        if (!profileId) return modal?.("Error", "Selecciona el perfil.");

        const provinceId = provinceIdRaw === "__ALL__" ? null : provinceIdRaw;

        await onSubmit?.({
          isEditing: false,
          resourceType,
          role,
          provinceId,
          profileId,
          active: toBool(formData.active),
          note: asStr(formData.note || ""),
        });
        return;
      }

      await onSubmit?.({
        isEditing: true,
        id: asStr(rule?._id),
        active: toBool(formData.active),
        note: asStr(formData.note || ""),
      });
    } catch (e) {
      modal?.("Error", e?.message || "Ocurrió un error.");
    }
  };

  return (
    <ModalForm
      title={isEditing ? "Editar regla de rol → perfil" : "Nueva regla de rol → perfil"}
      message={isEditing ? "Activa/desactiva la regla o añade una nota." : "Define qué perfil se aplica a un rol dentro de un scope."}
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={closeModal}
      modal={modal}
    />
  );
}