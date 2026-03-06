// src/components/permissions/FormUserScope.jsx
import { useMemo, useCallback, useState } from "react";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { searchusername } from "../../lib/data";

import {
  RESOURCE_ROLE_LABEL,
  RESOURCE_ROLES,
  RESOURCE_TYPE_LABEL,
  RESOURCE_TYPES,
  AREA_FALLBACK,
} from "./permissionsLabels";

const asStr = (v) => (v == null ? "" : String(v));
const isoDay = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

function buildOptionsFromIndex(indexObj) {
  const idx = indexObj && typeof indexObj === "object" ? indexObj : {};
  return Object.entries(idx)
    .map(([id, v]) => ({
      value: String(id),
      label: v?.name || v?.label || v?.title || String(id),
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}

// ✅ AsyncSearchSelect: field.loadOptions(term) -> [{value,label}]
async function loadUserOptions(term) {
  const query = asStr(term || "").trim();
  if (!query || query.length < 3) return [];

  const token = getToken();
  const res = await searchusername({ query }, token);
  if (!res || res?.error) return [];

  const items = Array.isArray(res) ? res : res?.users || res?.items || [];
  return items
    .filter((u) => u?._id)
    .map((u) => ({
      value: u._id,
      label:
        `${asStr(u.firstName)} ${asStr(u.lastName)}`.trim() +
        (u.email ? ` · ${u.email}` : ""),
    }));
}

function resolveScopeResourceLabel(enumsData, s) {
  const t = asStr(s?.resourceType);

  if (t === "area") {
    const key = asStr(s?.resourceKey).trim();
    if (!key) return "—";
    const opt = (Array.isArray(AREA_FALLBACK) ? AREA_FALLBACK : []).find(
      (x) => asStr(x.value) === key
    );
    return opt?.label || key;
  }

  const id = asStr(s?.resourceId).trim();
  if (!id) return "—";
  if (t === "program") return enumsData?.programsIndex?.[id]?.name || id;
  if (t === "dispositive") return enumsData?.dispositiveIndex?.[id]?.name || id;
  if (t === "province") return enumsData?.provincesIndex?.[id]?.name || id;
  return id;
}

export default function FormUserScope({
  enumsData,
  closeModal,
  modal,
  fixedUser = null,
  scope = null,
  onSubmit,
}) {
  const isEditing = !!scope;

  // ✅ 2 pasos SOLO en create (para poder cargar options por tipo sin children)
  const [step, setStep] = useState(isEditing ? "form" : "pickType");
  const [pickedType, setPickedType] = useState("");

  const fixedUserId = asStr(fixedUser?._id || "");
  const fixedUserLabel = useMemo(() => {
    if (!fixedUser) return "";
    const name = `${asStr(fixedUser.firstName)} ${asStr(fixedUser.lastName)}`.trim();
    return name + (fixedUser.email ? ` · ${fixedUser.email}` : "");
  }, [fixedUser]);

  const typeOptions = useMemo(
    () => RESOURCE_TYPES.map((t) => ({ value: t, label: RESOURCE_TYPE_LABEL?.[t] || t })),
    []
  );

  const roleOptions = useMemo(
    () => RESOURCE_ROLES.map((r) => ({ value: r, label: RESOURCE_ROLE_LABEL?.[r] || r })),
    []
  );

  const provinceOptions = useMemo(() => {
    const base = buildOptionsFromIndex(enumsData?.provincesIndex);
    return [{ value: "__ALL__", label: "— Todas —" }, ...base];
  }, [enumsData]);

  const resourceOptions = useMemo(() => {
    const t = isEditing ? asStr(scope?.resourceType) : pickedType;

    if (t === "program") return buildOptionsFromIndex(enumsData?.programsIndex);
    if (t === "dispositive") return buildOptionsFromIndex(enumsData?.dispositiveIndex);
    if (t === "province") return buildOptionsFromIndex(enumsData?.provincesIndex);
    if (t === "area") {
      return (Array.isArray(AREA_FALLBACK) ? AREA_FALLBACK : []).map((x) => ({
        value: asStr(x.value),
        label: asStr(x.label),
      }));
    }
    return [];
  }, [enumsData, isEditing, scope, pickedType]);

  // ---------------- STEP 1: pick type ----------------
  const buildFieldsPickType = () => {
    return [
      { type: "info", content: "Elige el tipo de scope que quieres crear." },
      {
        name: "resourceType",
        label: "Tipo",
        type: "select",
        required: true,
        defaultValue: "",
        options: typeOptions,
        searchable: false,
      },
    ];
  };

  const onPickType = async (formData) => {
    const t = asStr(formData.resourceType).trim();
    if (!t) return modal?.("Error", "Selecciona un tipo.");
    setPickedType(t);
    setStep("form");
  };

  // ---------------- STEP 2: form ----------------
  const buildFieldsForm = () => {
    const fields = [
      {
        type: "info",
        content: isEditing ? "Editando scope (UserScope)" : "Creando scope (UserScope)",
      },
    ];

    // -------- CREATE --------
    if (!isEditing) {
      // usuario
      if (fixedUserId) {
        fields.push({ type: "info", content: `Usuario: ${fixedUserLabel || fixedUserId}` });
      } else {
        fields.push({
          name: "userId",
          label: "Usuario",
          type: "async-search-select",
          placeholder: "Escriba al menos 3 letras...",
          required: true,
          loadOptions: loadUserOptions,
        });
      }

      // tipo (bloqueado por el step 1)
      fields.push({
        type: "info",
        content: `Tipo: ${RESOURCE_TYPE_LABEL?.[pickedType] || pickedType || "—"}`,
      });

      // rol
      fields.push({
        name: "role",
        label: "Rol",
        type: "select",
        required: true,
        defaultValue: "",
        options: roleOptions,
        searchable: false,
      });

      // provincia opcional (siempre, porque el back la soporta siempre)
      fields.push({
        name: "provinceId",
        label: "Provincia (opcional)",
        type: "select",
        required: false,
        defaultValue: "__ALL__",
        options: provinceOptions,
        searchable: true,
      });

      // recurso opcional (según tipo)
      fields.push({
        name: "resourceRef",
        label: "Recurso (opcional)",
        type: "select",
        required: false,
        defaultValue: "__ALL__",
        options: [{ value: "__ALL__", label: "— Todos / Genérico —" }, ...resourceOptions],
        searchable: true,
      });
    }

    // -------- EDIT --------
    if (isEditing) {
      const t = asStr(scope?.resourceType);
      const role = asStr(scope?.role);

      const tLabel = RESOURCE_TYPE_LABEL?.[t] || t || "—";
      const rLabel = resolveScopeResourceLabel(enumsData, scope);

      fields.push(
        { type: "info", content: `Tipo: ${tLabel}` },
        { type: "info", content: `Recurso: ${rLabel}` },
        { type: "info", content: `Rol actual: ${RESOURCE_ROLE_LABEL?.[role] || role || "—"}` }
      );

      fields.push({
        name: "provinceId",
        label: "Provincia (opcional)",
        type: "select",
        required: false,
        defaultValue: scope?.provinceId ? asStr(scope.provinceId) : "__ALL__",
        options: provinceOptions,
        searchable: true,
      });

      fields.push({
        name: "role",
        label: "Rol",
        type: "select",
        required: true,
        defaultValue: asStr(scope?.role || ""),
        options: roleOptions,
        searchable: false,
      });
    }

    // comunes
    fields.push(
      {
        name: "active",
        label: "Activo",
        type: "select",
        required: true,
        defaultValue: scope?.active === false ? "no" : "si",
        options: [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ],
      },
      {
        name: "expiresAt",
        label: "Caduca (opcional)",
        type: "date",
        required: false,
        defaultValue: scope?.expiresAt ? isoDay(scope.expiresAt) : "",
      },
      {
        name: "note",
        label: "Nota (opcional)",
        type: "textarea",
        required: false,
        defaultValue: scope?.note || "",
        capsGuard: true,
      }
    );

    return fields;
  };

  const handleSubmit = useCallback(
    async (formData) => {
      const rawProv = asStr(formData.provinceId).trim();
      const provinceId = rawProv === "__ALL__" || rawProv === "" ? null : rawProv;

      // ---------- CREATE ----------
      if (!isEditing) {
        const rawUser = formData.userId;
        const userId =
          fixedUserId ||
          (typeof rawUser === "object" ? asStr(rawUser?.value) : asStr(rawUser)).trim();

        if (!userId) return modal?.("Error", "Selecciona un usuario.");

        const role = asStr(formData.role).trim();
        if (!pickedType) return modal?.("Error", "Falta tipo (step).");
        if (!role) return modal?.("Error", "Selecciona un rol.");

        const rawRef = asStr(formData.resourceRef).trim();
        const hasRef = rawRef && rawRef !== "__ALL__";

        const base = {
          isEditing: false,
          userId,
          resourceType: pickedType,
          role,
          provinceId,
          active: String(formData.active) === "si",
          expiresAt: formData.expiresAt ? isoDay(formData.expiresAt) : null,
          note: asStr(formData.note || ""),
        };

        // ✅ nuevo back: area => resourceKey, resto => resourceId (opcionales)
        await onSubmit?.(
          pickedType === "area"
            ? { ...base, ...(hasRef ? { resourceKey: rawRef } : {}) }
            : { ...base, ...(hasRef ? { resourceId: rawRef } : {}) }
        );
        return;
      }

      // ---------- EDIT ----------
      const role = asStr(formData.role).trim();
      if (!role) return modal?.("Error", "Selecciona un rol.");

      await onSubmit?.({
        isEditing: true,
        id: asStr(scope?._id),
        role,
        provinceId,
        active: String(formData.active) === "si",
        expiresAt: formData.expiresAt ? isoDay(formData.expiresAt) : null,
        note: asStr(formData.note || ""),
      });
    },
    [isEditing, scope, fixedUserId, modal, onSubmit, pickedType]
  );

  // UI final (2 modales en create)
  if (!isEditing && step === "pickType") {
    return (
      <ModalForm
        title="Añadir scope"
        message="Primero elige el tipo."
        fields={buildFieldsPickType()}
        onSubmit={onPickType}
        onClose={closeModal}
        modal={modal}
      />
    );
  }

  return (
    <ModalForm
      title={isEditing ? "Editar scope" : "Añadir scope"}
      message={isEditing ? "Modifica el scope del usuario." : "Configura el scope del usuario."}
      fields={buildFieldsForm()}
      onSubmit={handleSubmit}
      onClose={closeModal}
      modal={modal}
    />
  );
}