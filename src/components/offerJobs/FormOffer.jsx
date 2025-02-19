import React, { useEffect, useState } from "react";
import ModalForm from "../globals/ModalForm";
import { createProgram, updateProgram } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";

const FormProgram = ({ modal, charge, closeModal, enumsData, program = null }) => {
  // Detectamos si estamos en modo edición o creación
  const isEditing = !!program;

  const [files, setFiles] = useState([]);

  // Generamos las opciones de financiación
  const finantialOptions = enumsData?.finantial
    ? enumsData.finantial.map((f) => ({
        value: f._id,
        label: f.name,
      }))
    : [];

  // Construimos los campos del formulario, dando defaultValue según sea edición o no
  const buildFields = () => [
    {
      name: "name",
      label: "Nombre del Programa",
      type: "text",
      required: true,
      defaultValue: program?.name || "",
      isValid: (texto) => (validText(texto, 2, 100) ? "" : textErrors("name")),
    },
    {
      name: "acronym",
      label: "Acrónimo",
      type: "text",
      required: true,
      defaultValue: program?.acronym || "",
      isValid: (texto) => (validText(texto, 2, 10) ? "" : textErrors("acronym")),
    },
    {
      name: "area",
      label: "Área",
      type: "select",
      required: true,
      defaultValue: program?.area || "",
      options: [
        { value: "igualdad", label: "Igualdad" },
        { value: "desarrollo comunitario", label: "Desarrollo Comunitario" },
        { value: "lgtbiq", label: "LGTBIQ+" },
        { value: "infancia y juventud", label: "Infancia y Juventud" },
        { value: "personas con discapacidad", label: "Personas con Discapacidad" },
        { value: "mayores", label: "Mayores" },
        { value: "no identificado", label: "No Identificado" },
      ],
    },
    {
      name: "finantial",
      label: "Financiación",
      type: "selectMultiple",
      required: false,
      defaultValue: program?.funding ? [program.funding] : [],
      // Notar que, en tu esquema, el campo "funding" es un único ObjectId, no un array.
      // Si deseas varios, cambia la lógica en el backend.
      options: [
        { value: "", label: "Seleccione una financiación" },
        ...finantialOptions,
      ],
    },
    {
      name: "description",
      label: "Descripción",
      type: "textarea",
      required: false,
      defaultValue: program?.about?.description || "",
    },
    {
      name: "objectives",
      label: "Objetivos",
      type: "textarea",
      required: false,
      defaultValue: program?.about?.objectives || "",
    },
    {
      name: "profile",
      label: "Perfil de Participantes",
      type: "textarea",
      required: false,
      defaultValue: program?.about?.profile || "",
    },
  ];

  // Manejamos el envío del formulario para crear o editar
  const handleSubmit = async (formData) => {
    try {
      charge(true);
      const token = getToken();

      // Armamos objeto para enviar al backend
      // Notar que en tu esquema programSchema se guardan "name, acronym, area, funding, about"...
      // Ajustamos fields según el schema

      const dataProgram = {
        name: formData.name,
        acronym: formData.acronym,
        area: formData.area,
        // Tomamos el primer valor de finantial si es que viene. (En tu schema "funding" es un ObjectId)
        funding:
          formData.finantial && formData.finantial.length > 0 && formData.finantial[0]
            ? formData.finantial[0]
            : null,
        about: {
          description: formData.description || "",
          objectives: formData.objectives || "",
          profile: formData.profile || "",
        },
      };

      let result;

      if (isEditing) {
        // Actualizar
        result = await updateProgram({ ...dataProgram, id: program._id }, token);
      } else {
        // Crear
        result = await createProgram(token, dataProgram);
      }

      if (result.error) {
        modal("Error", result.message || "No se pudo guardar el programa.");
      } else {
        modal(
          "Programa",
          isEditing ? "El programa se ha actualizado con éxito." : "El programa se ha creado con éxito."
        );
        closeModal();
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al guardar el programa");
    } finally {
      charge(false);
    }
  };

  return (
    <ModalForm
      title={isEditing ? "Editar Programa" : "Crear Programa"}
      message={isEditing ? "Modifica los datos del programa." : "Complete los datos del programa."}
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={closeModal}
    />
  );
};

export default FormProgram;
