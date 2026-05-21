import { useMemo } from "react";
import ModalForm from "../globals/ModalForm";
import { NATIONALITIES } from "../../lib/nationalities.js";

const toDateInput = (date) => {
  if (!date) return "";

  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";

  return d.toISOString().slice(0, 10);
};

const FormAttendedUser = ({
  doc = null,
  mode = "create",
  fixedDispositiveId,
  modal,
  onSubmit,
  onClose,
  initialDocumentId = "",
}) => {
  const isEdit = mode === "edit";

  const fields = useMemo(() => {
    const base = [
      {
        name: "documentId",
        label: "Documento",
        type: "text",
        required: true,
        defaultValue: doc?.documentId || initialDocumentId || "",
        disabled: true,
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
        required: true,
        defaultValue: doc?.lastName || "",
      },
    ];

    if (isEdit) {
      base.push({
        name: "aliasReason",
        label: "Motivo del cambio de nombre/apellidos",
        type: "text",
        required: false,
        defaultValue: "",
      });
    }

    base.push(
      {
        name: "birthday",
        label: "Fecha de nacimiento",
        type: "date",
        required: true,
        defaultValue: toDateInput(doc?.birthday),
      },
      {
        name: "nationality",
        label: "Nacionalidad",
        type: "select",
        required: true,
        searchable: true,
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
        required: true,
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
      }
    );

    if (!isEdit) {
      base.push({
        name: "startDate",
        label: "Fecha de alta en el dispositivo",
        type: "date",
        required: true,
        defaultValue: new Date().toISOString().slice(0, 10),
      });
    }

    return base;
  }, [doc, isEdit, initialDocumentId]);

  const getFieldValue = (value) => {
    if (!value) return "";
    if (typeof value === "object") return String(value.value || value._id || value.id || "");
    return String(value);
  };

  const handleSubmit = (values) => {
    if (!isEdit && !fixedDispositiveId) {
      modal?.(
        "Dispositivo requerido",
        "Para crear un usuario atendido debes trabajar con un dispositivo concreto."
      );
      return;
    }

    const payload = {
      ...values,
      nationality: getFieldValue(values.nationality),
    };

    if (isEdit) {
      payload._id = doc?._id;
    } else {
      payload.dispositive = fixedDispositiveId;
    }

    onSubmit(payload);
  };

  return (
    <ModalForm
      title={isEdit ? "Editar usuario atendido" : "Crear usuario atendido"}
      message={
        isEdit
          ? "Modifica los datos principales. Si cambias nombre o apellidos, se guardará el alias anterior."
          : "El usuario se creará asociado al dispositivo seleccionado."
      }
      submitText={isEdit ? "Guardar cambios" : "Crear usuario"}
      cancelText="Cancelar"
      fields={fields}
      onSubmit={handleSubmit}
      onClose={onClose}
      modal={modal}
    />
  );
};

export default FormAttendedUser;