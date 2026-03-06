// src/components/permissions/FormAssignment.jsx
import { useMemo } from "react";
import ModalForm from "../globals/ModalForm";

const asStr = (v) => (v == null ? "" : String(v));
const isoDay = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");

export default function FormAssignment({
  closeModal,
  modal,
  assignment = null,
  profileOptions = [],
  onSubmit,
}) {
  const isEditing = !!assignment;

  const defaultProfileId = useMemo(() => {
    if (!isEditing) return "";
    // puede venir populate: profileId es obj
    return asStr(assignment?.profileId?._id || assignment?.profileId || "");
  }, [isEditing, assignment]);

  const buildFields = () => [
    {
      name: "profileId",
      label: "Perfil",
      type: "select",
      required: true,
      disabled: isEditing, // no cambiar perfil en edit (si quieres, lo permitimos)
      defaultValue: defaultProfileId,
      options: profileOptions,
      searchable: true,
    },
    {
      name: "active",
      label: "Activa",
      type: "select",
      required: true,
      defaultValue: assignment?.active === false ? "no" : "si",
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
      defaultValue: assignment?.expiresAt ? isoDay(assignment.expiresAt) : "",
    },
    {
      name: "note",
      label: "Nota (opcional)",
      type: "textarea",
      required: false,
      defaultValue: assignment?.note || "",
      capsGuard: true,
    },
  ];

  const handleSubmit = async (formData) => {
    const profileId = asStr(formData.profileId).trim();
    if (!profileId) {
      modal?.("Error", "Selecciona un perfil.");
      return;
    }

    const payload = {
      isEditing,
      id: isEditing ? asStr(assignment?._id) : "",
      profileId,
      active: String(formData.active) === "si",
      expiresAt: formData.expiresAt ? isoDay(formData.expiresAt) : null,
      note: asStr(formData.note || ""),
    };

    await onSubmit(payload);
  };

  return (
    <ModalForm
      title={isEditing ? "Editar asignación" : "Asignar perfil"}
      message={isEditing ? "Modifica la asignación." : "Asigna un perfil al usuario seleccionado."}
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={closeModal}
      modal={modal}
    />
  );
}