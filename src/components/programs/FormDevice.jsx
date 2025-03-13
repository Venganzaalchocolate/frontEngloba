import React from "react";
import ModalForm from "../globals/ModalForm";
import { createDispositive, updateDispositive } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { validEmail, validNumber, validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";

const FormDevice = ({
  modal,
  charge,
  closeModal,
  program,
  device = null, // Si es null, modo creación; si existe, modo edición
  enumsData,
  handleProgramSaved
}) => {
  const isEditing = !!device;

  const ProvincesOptions = enumsData?.provinces
    ? enumsData.provinces.map((p) => ({
        value: p._id,
        label: p.name,
      }))
    : [];

  const buildFields = () => [
    {
      name: "name",
      label: "Nombre del Dispositivo",
      type: "text",
      required: true,
      defaultValue: device?.name || "",
      isValid: (texto) =>
        validText(texto, 2, 100) ? "" : textErrors("name"),
    },
    {
      name: "address",
      label: "Dirección",
      type: "text",
      required: false,
      defaultValue: device?.address || "",
    },
    {
      name: "email",
      label: "Email",
      type: "text",
      required: false,
      defaultValue: device?.email || "",
      isValid: (texto) => (validEmail(texto) ? "" : textErrors("email")),
    },
    {
      name: "phone",
      label: "Teléfono",
      type: "text",
      required: false,
      defaultValue: device?.phone || "",
      isValid: (texto) =>
        validNumber(texto) ? "" : textErrors("phone"),
    },
    {
      name: "active",
      label: "Activo",
      type: "select",
      required: true,
      defaultValue: device?.active === false ? "no" : "si",
      options: [
        { value: "si", label: "Sí" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "province",
      label: "Provincia",
      type: "select",
      required: false,
      defaultValue: device?.province || "",
      options: [
        { value: "", label: "Seleccione una provincia" },
        ...ProvincesOptions,
      ],
    },
  ];
  const handleSubmit = async (formData) => {
    try {
      charge(true);
      const token = getToken();
      // Preparamos el objeto con los datos comunes
      let deviceData = {
        active: formData.active === "si",
        name: formData.name,
        address: formData.address || "",
        email: formData.email || "",
        phone: formData.phone || "",
        province: formData.province || null,
      };
      let result;
      if (!isEditing) {
        // En modo creación, agregamos el ID del programa
        deviceData.programId = program._id;
        result = await createDispositive(deviceData, token);
      } else {
        // En modo edición, debemos enviar además dispositiveId
        deviceData.programId = program._id;
        deviceData.dispositiveId = device._id; // 'device' es el dispositivo en edición
        result = await updateDispositive(deviceData, token);
      }
      if (result.error) {
        modal(
          "Error",
          result.message ||
            (isEditing
              ? "No se pudo actualizar el dispositivo"
              : "No se pudo crear el dispositivo")
        );
      } else {
        handleProgramSaved(result);
        modal(
          "Dispositivo",
          isEditing
            ? "El dispositivo se ha actualizado con éxito"
            : "El dispositivo se ha creado con éxito"
        );
        closeModal();
      }
    } catch (error) {
      modal(
        "Error",
        error.message ||
          (isEditing
            ? "Ocurrió un error al actualizar el dispositivo"
            : "Ocurrió un error al crear el dispositivo")
      );
    } finally {
      charge(false);
    }
  };
  
  return (
    <ModalForm
      title={isEditing ? "Editar Dispositivo" : "Crear Dispositivo"}
      message={
        isEditing
          ? "Modifica los datos del dispositivo."
          : "Complete los datos del nuevo dispositivo."
      }
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={closeModal}
    />
  );
};

export default FormDevice;
