import { useMemo } from "react";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { postSesameAssignEmployeeManager } from "../../lib/data";

const FormSesameEmployeeManagerAssignation = ({
  user = null,
  modal,
  charge,
  closeModal,
  onSaved = () => {},
  searchUsers,
}) => {
  const fields = useMemo(() => {
    return [
      {
        name: "managerId",
        label: "Persona que gestiona",
        type: "async-search-select",
        placeholder: "Escriba al menos 3 letras...",
        required: true,
        loadOptions: searchUsers,
      },
      {
        name: "permission",
        label: "Tipo de gestión",
        type: "select",
        required: true,
        defaultValue: "absencesManagement",
        options: [
          { value: "absencesManagement", label: "Vacaciones" },
          {
            value: "checksManageRequestsAndIncidences",
            label: "Fichajes e incidencias",
          },
        ],
      },
    ];
  }, [searchUsers]);

  const handleSubmit = async (formData) => {
    const employeeId = user?._id || "";
    if (!employeeId) {
      modal("Error", "No se ha encontrado el usuario");
      return;
    }

    const managerId = formData?.managerId || formData?.manager || "";
    if (!managerId) {
      modal("Error", "Debe seleccionar una persona");
      return;
    }

    try {
      charge(true);
      const token = getToken();

      const res = await postSesameAssignEmployeeManager(
        {
          employeeId,
          managerId,
          permission: formData.permission,
          order: 0,
        },
        token
      );

      if (res?.error) {
        throw new Error(res.message || "No se pudo asignar la persona gestora");
      }

      modal(
        "Gestión asignada",
        "La persona gestora se ha asignado correctamente"
      );
      closeModal();
      onSaved(res);
    } catch (error) {
      modal("Error", error.message || "No se pudo asignar la persona gestora");
    } finally {
      charge(false);
    }
  };

  return (
    <ModalForm
      title="Añadir persona que gestiona"
      message="Busque y seleccione la persona que gestionará a este trabajador."
      fields={fields}
      onSubmit={handleSubmit}
      onClose={closeModal}
      modal={modal}
    />
  );
};

export default FormSesameEmployeeManagerAssignation;