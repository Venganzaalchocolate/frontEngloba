import React from "react";
import ModalForm from "../globals/ModalForm";
import { createProgram, updateProgram } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";

const FormProgram = ({
  modal,
  charge,
  closeModal,
  enumsData,
  program = null, // si viene un objeto, es edición
  handleProgramSaved
}) => {
  // Detectamos si estamos en modo edición
  const isEditing = !!program;

  // Generamos las opciones de financiación
  const finantialOptions = enumsData?.finantial
    ? enumsData.finantial.map((f) => ({
        value: f._id,
        label: f.name,
      }))
    : [];

  // Preparamos campos: si `program` existe, cargamos sus valores en `defaultValue`.
  // Así aparecerán en el formulario y el usuario solo cambiará lo que desee.
  const buildFields = () => {
    return [
      {
        name: "name",
        label: "Nombre del Programa",
        type: "text",
        required: true,
        defaultValue: program?.name || "",
        isValid: (texto) =>
          validText(texto, 2, 100) ? "" : textErrors("name"),
      },
      {
        name: "acronym",
        label: "Acrónimo",
        type: "text",
        required: true,
        defaultValue: program?.acronym || "",
        isValid: (texto) =>
          validText(texto, 2, 10) ? "" : textErrors("acronym"),
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
        // NOTA: en tu esquema, funding es un único ObjectId
        // si quieres permitir múltiples, tu backend debe estar listo.
        // Aquí solo cargamos 1 como ejemplo (array de 1).
        defaultValue: program?.funding ? [program.funding] : [],
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
  };

  // Función para tomar la data del formulario y:
  //  - Crear un nuevo programa si NO hay program
  //  - Editar (update) si hay program y enviar solo los campos cambiados
  const handleSubmit = async (formData) => {
    try {
      charge(true);
      const token = getToken();

      if (!isEditing) {
        // Modo CREAR
        const newProgram = {
          name: formData.name,
          acronym: formData.acronym,
          area: formData.area,
          funding:
            formData.finantial && formData.finantial.length
              ? formData.finantial[0]
              : null, // asumiendo 1
          about: {
            description: formData.description || "",
            objectives: formData.objectives || "",
            profile: formData.profile || "",
          },
        };

        const result = await createProgram(newProgram, token);
        if (result.error) {
          modal("Error", result.message || "No se pudo crear el programa");
        } else {
          handleProgramSaved(result)
          modal("Programa", "El programa se ha creado con éxito");
          closeModal();
        }
      } else {
        // Modo EDITAR -> partial update
        // Comparamos los valores del formData con los del program
        const changes = {};

        // Comparar campo a campo. Solo guardamos en `changes` lo que cambie.
        if (formData.name !== program.name) changes.name = formData.name;
        if (formData.acronym !== program.acronym) changes.acronym = formData.acronym;
        if (formData.area !== program.area) changes.area = formData.area;

        // Funding: en tu esquema, es 1 ID
        const newFunding =
          formData.finantial && formData.finantial.length
            ? formData.finantial[0]
            : null;

        if (newFunding !== program.funding) {
          changes.funding = newFunding;
        }

        // About: comparamos cada subcampo
        const aboutChanges = {};
        if ((program.about?.description || "") !== (formData.description || "")) {
          aboutChanges.description = formData.description || "";
        }
        if ((program.about?.objectives || "") !== (formData.objectives || "")) {
          aboutChanges.objectives = formData.objectives || "";
        }
        if ((program.about?.profile || "") !== (formData.profile || "")) {
          aboutChanges.profile = formData.profile || "";
        }

        if (Object.keys(aboutChanges).length > 0) {
          changes.about = {
            ...program.about,
            ...aboutChanges,
          };
        }

        // Solo hacemos request si hay algún cambio
        if (Object.keys(changes).length === 0) {
          modal("Programa", "No hay cambios que guardar.");
          closeModal();
          return;
        }

        // Llamamos a update
        const payload = {
          id: program._id, // Asumiendo que updateProgram necesita un { id, ...changes }
          ...changes,
        };

        const result = await updateProgram(payload, token);
        if (result.error) {
          modal("Error", result.message || "No se pudo actualizar el programa");
        } else {
          handleProgramSaved(result)
          modal("Programa", "El programa se ha actualizado con éxito");
          closeModal();
        }
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error en el envío");
    } finally {
      charge(false);
    }
  };

  return (
    <ModalForm
      title={isEditing ? "Editar Programa" : "Crear Programa"}
      message={
        isEditing
          ? "Modifica los datos del programa, los campos que no cambies se mantienen."
          : "Complete los datos del programa."
      }
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={closeModal}
    />
  );
};

export default FormProgram;
