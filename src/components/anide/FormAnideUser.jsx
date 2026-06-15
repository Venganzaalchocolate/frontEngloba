import { useMemo } from "react";
import ModalForm from "../globals/ModalForm.jsx";
import { NATIONALITIES } from "../../lib/nationalities.js";

const toDateInput = (date) => {
  if (!date) return "";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  return d.toISOString().slice(0, 10);
};

const getFieldValue = (value) => {
  if (!value) return "";

  if (typeof value === "object") {
    return String(value.value || value._id || value.id || "");
  }

  return String(value);
};

const normalizeDocumentId = (value = "") =>
  String(value || "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, "")
    .replace(/-/g, "");

const FormAnideUser = ({
  doc = null,
  mode = "create",
  modal,
  onSubmit,
  onClose,
}) => {
  const isEdit = mode === "edit";

  const fields = useMemo(() => {
    const base = [
      {
        name: "documentId",
        label: "Documento / Identificador",
        type: "text",
        required: true,
        defaultValue: doc?.documentId || "",
        disabled: isEdit,
      },
      {
        name: "firstName",
        label: "Nombre",
        type: "text",
        required: true,
        defaultValue: doc?.firstName || "",
      },
      {
        name: "lastName",
        label: "Apellidos",
        type: "text",
        required: false,
        defaultValue: doc?.lastName || "",
      },
      {
        name: "birthday",
        label: "Fecha de nacimiento",
        type: "date",
        required: false,
        defaultValue: toDateInput(doc?.birthday),
      },
      {
        name: "nationality",
        label: "Nacionalidad",
        type: "select",
        searchable: true,
        required: false,
        defaultValue: doc?.nationality || "",
        options: [
          { value: "", label: "Seleccionar nacionalidad" },
          ...NATIONALITIES,
        ],
      },
      {
        name: "gender",
        label: "Género",
        type: "select",
        required: false,
        defaultValue: doc?.gender || "",
        options: [
          { value: "", label: "Seleccionar" },
          { value: "male", label: "Hombre" },
          { value: "female", label: "Mujer" },
          { value: "others", label: "Otros" },
          { value: "nonBinary", label: "No binario" },
        ],
      },
      {
        name: "notes",
        label: "Notas",
        type: "textarea",
        required: false,
        defaultValue: doc?.notes || "",
      },
    ];

    if (isEdit) {
      base.push({
        name: "active",
        label: "Usuaria activa",
        type: "select",
        required: true,
        defaultValue: doc?.active === false ? "false" : "true",
        options: [
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ],
      });
    }

    return base;
  }, [doc, isEdit]);

  const handleSubmit = (values) => {
    const payload = {
      documentId: normalizeDocumentId(values.documentId),
      firstName: String(values.firstName || "").trim(),
      lastName: String(values.lastName || "").trim(),
      birthday: values.birthday || null,
      nationality: getFieldValue(values.nationality),
      gender: values.gender || "",
      notes: values.notes || "",
    };

    if (isEdit) {
      payload.usuariaId = doc?._id;
      payload.active = values.active === true || values.active === "true";
    }

    if (!payload.documentId) {
      modal("Documento requerido", "Debes indicar un documento o identificador.");
      return;
    }

    if (!payload.firstName) {
      modal("Nombre requerido", "Debes indicar el nombre de la usuaria.");
      return;
    }

    onSubmit(payload);
  };

  return (
    <ModalForm
      title={isEdit ? "Editar usuaria ANIDE" : "Crear usuaria ANIDE"}
      message={
        isEdit
          ? "Modifica los datos principales de la usuaria. Las estancias se gestionan desde el mapa de ocupación."
          : "Crea la usuaria. Después podrás asignarla a una cama libre desde el mapa de ocupación."
      }
      submitText={isEdit ? "Guardar cambios" : "Crear usuaria"}
      cancelText="Cancelar"
      fields={fields}
      onSubmit={handleSubmit}
      onClose={onClose}
      modal={modal}
    />
  );
};

export default FormAnideUser;