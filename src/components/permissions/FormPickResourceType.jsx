// src/components/permissions/FormPickResourceType.jsx
import ModalForm from "../globals/ModalForm";

export default function FormPickResourceType({ closeModal, modal, resourceTypeOptions, onPicked }) {
  const buildFields = () => [
    {
      name: "resourceType",
      label: "Tipo de recurso",
      type: "select",
      required: true,
      defaultValue: "",
      options: resourceTypeOptions,
      searchable: false,
    },
  ];

  const handleSubmit = (formData) => {
    const t = formData?.resourceType;
    if (!t) {
      modal?.("Error", "Selecciona un tipo.");
      return;
    }
    onPicked?.(t);
  };

  return (
    <ModalForm
      title="Añadir alcance"
      message="Primero selecciona el tipo de recurso."
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={closeModal}
      modal={modal}
    />
  );
}