// src/components/permissions/FormPermissionProfile.jsx
import { useMemo } from "react";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { permissionProfileCreate, permissionProfileUpdate } from "../../lib/data";
import { FRONT_MODULE_LABELS, FRONT_MODULES_FALLBACK, MODULE_ACTION_LABELS, MODULE_ACTIONS_FALLBACK } from "./permissionsLabels";


const asStr = (v) => (v == null ? "" : String(v));
const toBool = (v) => v === true || ["si", "sí", "SI", "Sí", "true"].includes(String(v));
const normArr = (v) => (Array.isArray(v) ? v.map(String) : []);

const keyActions = (module) => `actions__${module}`;
const keyActive = (module) => `grantActive__${module}`;

const buildDefaultsByModule = (profile) => {
  const grants = Array.isArray(profile?.moduleGrants) ? profile.moduleGrants : [];
  const map = {};
  for (const g of grants) {
    const m = asStr(g?.module).trim();
    if (!m) continue;
    map[m] = {
      actions: Array.isArray(g?.actions) ? g.actions.map(String) : [],
      active: g?.active === false ? false : true,
    };
  }
  return map;
};

export default function FormPermissionProfile({
  enumsData,
  closeModal,
  charge,
  modal,
  profile = null,
  onSaved,
}) {
  const isEditing = !!profile;

  const FRONT_MODULES = useMemo(() => {
    const x = enumsData?.permissions?.frontModules;
    return Array.isArray(x) && x.length ? x : FRONT_MODULES_FALLBACK;
  }, [enumsData]);

  const MODULE_ACTIONS = useMemo(() => {
    const x = enumsData?.permissions?.moduleActions;
    return Array.isArray(x) && x.length ? x : MODULE_ACTIONS_FALLBACK;
  }, [enumsData]);

  const defaultsByModule = useMemo(() => buildDefaultsByModule(profile), [profile]);

  const actionOptions = useMemo(
    () =>
      MODULE_ACTIONS.map((a) => ({
        value: a,
        label: MODULE_ACTION_LABELS?.[a] || a,
      })),
    [MODULE_ACTIONS]
  );

  const buildFields = () => {
    const fields = [
      {
        name: "name",
        label: "Nombre",
        type: "text",
        required: true,
        defaultValue: profile?.name || "",
        capsGuard: true,
      },
      {
        name: "active",
        label: "Activo",
        type: "select",
        required: true,
        defaultValue: profile?.active === false ? "no" : "si",
        options: [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ],
      },
      {
        name: "description",
        label: "Descripción",
        type: "textarea",
        required: false,
        defaultValue: profile?.description || "",
        capsGuard: true,
      },
      {
        name: "note",
        label: "Nota interna",
        type: "textarea",
        required: false,
        defaultValue: profile?.note || "",
        capsGuard: true,
      },

      { type: "section", label: "Permisos por módulo" },
      {
        type: "info",
        content:
          "Marca las acciones permitidas por módulo. Solo se guardarán los módulos que tengan al menos 1 acción seleccionada.",
      },
    ];

    // Un bloque por módulo: select activo + checkboxGroup acciones
    FRONT_MODULES.forEach((m) => {
      const label = FRONT_MODULE_LABELS?.[m] || m;
      const def = defaultsByModule[m] || { actions: [], active: false };

      fields.push({ type: "section", label });

      fields.push({
        name: keyActive(m),
        label: "Grant activo",
        type: "select",
        required: true,
        defaultValue: def.active ? "si" : "no",
        options: [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ],
      });

      fields.push({
        name: keyActions(m),
        label: "Acciones",
        type: "checkboxGroup",
        required: false, // validaremos globalmente en submit (al menos 1 acción en algún módulo)
        defaultValue: Array.isArray(def.actions) ? def.actions : [],
        options: actionOptions,
      });
    });

    return fields;
  };

  const handleSubmit = async (formData) => {
    try {
      charge?.(true);


      const moduleGrants = [];

        for (const m of FRONT_MODULES) {
        const isGrantActive = toBool(formData[keyActive(m)]); // true/false

        const rawActions = normArr(formData[keyActions(m)]);
        if (!isGrantActive) {
            // si está en NO, ignoramos acciones (aunque estén marcadas)
            continue;
        }

        if (!rawActions.length) continue;

        const actions = rawActions.includes("*") ? ["*"] : rawActions;

        moduleGrants.push({
            module: m,
            actions,
            active: true, // si el grant está activo, esto va true
        });
        }

      if (!moduleGrants.length) {
        modal?.("Error", "Selecciona al menos 1 acción en algún módulo.");
        return;
      }

      const payload = {
        name: asStr(formData.name).trim(),
        description: asStr(formData.description || ""),
        note: asStr(formData.note || ""),
        active: toBool(formData.active),
        moduleGrants,
      };

      if (!payload.name) {
        modal?.("Error", "Falta el nombre del perfil.");
        return;
      }

      const token = getToken();

      if (!isEditing) {
        const res = await permissionProfileCreate(payload, token);
        if (res?.error) {
          modal?.("Error", res.message || "No se pudo crear el perfil.");
          return;
        }
        modal?.("Éxito", "Perfil creado con éxito.");
        onSaved?.(res);
        closeModal?.();
        return;
      }

      const res = await permissionProfileUpdate({ id: profile?._id, ...payload }, token);
      if (res?.error) {
        modal?.("Error", res.message || "No se pudo actualizar el perfil.");
        return;
      }

      modal?.("Éxito", "Perfil actualizado correctamente.");
      onSaved?.(res);
      closeModal?.();
    } catch (e) {
      modal?.("Error", e.message || "Ocurrió un error.");
      closeModal?.();
    } finally {
      charge?.(false);
    }
  };

  return (
    <ModalForm
      title={isEditing ? "Editar perfil" : "Crear perfil"}
      message={isEditing ? "Modifica los datos del perfil." : "Completa los datos del nuevo perfil."}
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={closeModal}
      modal={modal}
    />
  );
}