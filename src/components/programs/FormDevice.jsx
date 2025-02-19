import React from "react";
import ModalForm from "../globals/ModalForm";
import { createDispositive } from "../../lib/data"; // <-- Tu endpoint para crear dispositivo
import { getToken } from "../../lib/serviceToken";
import { validEmail, validNumber, validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";

/**
 * FormDevice
 * ----------
 * Crea un dispositivo dentro de un programa (no edita).
 *
 * Props:
 * - program: El objeto programa donde creamos el dispositivo
 * - device: (Opcional) si existe, estamos en modo edición; si es null, modo creación
 * - modal: función para mostrar mensajes emergentes (alertas)
 * - charge: función para mostrar/cerrar loader
 * - closeModal: cierra este formulario
 * - enumsData: datos enumerados, p.e. provincias
 */
const FormDevice = ({
  modal,
  charge,
  closeModal,
  program,
  device = null, // si no hay device, creamos uno nuevo
  enumsData,
  handleProgramSaved
}) => {
  // Para el futuro, si existe device, isEditing = true → se implementa edición
  const isEditing = !!device;

  // Provincias (opciones del <select>)
  const ProvincesOptions = enumsData?.provinces
    ? enumsData.provinces.map((p) => ({
        value: p._id,
        label: p.name,
      }))
    : [];

  // Campos del formulario
  const buildFields = () => [
    {
      name: "name",
      label: "Nombre del Dispositivo",
      type: "text",
      required: true,
      defaultValue: device?.name || "",
      isValid: (texto) => (validText(texto, 2, 100) ? "" : textErrors("name")),
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
      isValid: (texto) => (validEmail(texto) ? "" : textErrors("email"))
    },
    {
      name: "phone",
      label: "Teléfono",
      type: "text",
      required: false,
      defaultValue: device?.phone || "",
      isValid: (texto) => (validNumber(texto) ? "" : textErrors("phone"))
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
    // Si en el futuro agregas 'responsible', 'coordinators', etc.,
    // aquí puedes añadir más campos (selectMultiple, etc.)
  ];

  // Maneja el envío del formulario
  const handleSubmit = async (formData) => {
    try {
      charge(true);
      const token = getToken();

      // Preparar objeto con datos para crear Dispositivo
      let newDeviceData = {};

      if (!isEditing) {
        // === CREAR ===
        newDeviceData = {
          programId: program._id,
          active: formData.active === "si",
          name: formData.name,
          address: formData.address || "",
          email: formData.email || "",
          phone: formData.phone || "",
          province: formData.province || null, // Si no hay valor, enviamos null
        };

        // Llamamos a tu endpoint createDispositive(...)
        const result = await createDispositive(newDeviceData, token);

        if (result.error) {
          modal("Error", result.message || "No se pudo crear el dispositivo");
        } else {
          handleProgramSaved(result)
          modal("Dispositivo", "El dispositivo se ha creado con éxito");
          closeModal();
        }
      } else {
        // === EDITAR ===
        // (Opcional, si lo implementas en el futuro)
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al crear el dispositivo");
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
