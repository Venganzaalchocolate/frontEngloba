import { useMemo } from "react";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { buildModalFormOptionsFromIndex } from "../../lib/utils";

const FormSesameOfficeAssignation = (props) => {
  return (
    <FormSesameOfficeAction
      {...props}
      title="Añadir centro de fichaje"
      message="Selecciona el dispositivo que quieres asignar como centro de fichaje en Sesame."
      extraFields={[
        {
          name: "isMainOffice",
          label: "Centro principal",
          type: "select",
          required: true,
          defaultValue: "false",
          options: [
            { value: "false", label: "No" },
            { value: "true", label: "Sí" },
          ],
        },
      ]}
      submitSuccessMessage="El centro de fichaje se ha asignado correctamente"
      submitAction={({ employeeId, officeId, formData, token }) =>
        postSesameAssignEmployeeOffice(
          {
            employeeId,
            officeId,
            isMainOffice: formData.isMainOffice === "true",
          },
          token
        )
      }
    />
  );
};



const FormSesameOfficeAction = ({
  title = "Acción sobre centro Sesame",
  message = "Selecciona un dispositivo.",
  user = null,
  enumsData = null,
  modal,
  charge,
  closeModal,
  onSaved = () => {},
  submitAction,
  submitSuccessMessage = "Acción realizada correctamente",
  extraFields = [],
}) => {
  const deviceOptions = useMemo(() => {
    const options =
      buildModalFormOptionsFromIndex(enumsData?.dispositiveIndex, {
        onlyActive: true,
      }) || [];

    return options.filter((opt) => {
      const dispositive = enumsData?.dispositiveIndex?.[opt.value];
      return !!dispositive?.officeIdSesame;
    });
  }, [enumsData?.dispositiveIndex]);

  const fields = useMemo(() => {
    return [
      {
        name: "dispositiveId",
        label: "Dispositivo",
        type: "select",
        required: true,
        defaultValue: "",
        options: deviceOptions,
        isValid: (v) => (!!v ? "" : "Debes seleccionar un dispositivo"),
      },
      ...extraFields,
    ];
  }, [deviceOptions, extraFields]);

  const handleSubmit = async (formData) => {
    const employeeId = user?._id || "";
    if (!employeeId) {
      modal("Error", "No se ha encontrado el usuario");
      return;
    }

    const selectedDispositive =
      enumsData?.dispositiveIndex?.[formData.dispositiveId] || null;

    if (!selectedDispositive) {
      modal("Error", "No se encontró el dispositivo seleccionado");
      return;
    }

    const officeId = selectedDispositive.officeIdSesame || "";

    if (!officeId) {
      modal("Error", "El dispositivo seleccionado no tiene officeIdSesame");
      return;
    }

    if (typeof submitAction !== "function") {
      modal("Error", "No se ha definido la acción Sesame");
      return;
    }

    charge(true);

    try {
      const token = getToken();

      const res = await submitAction({
        employeeId,
        officeId,
        formData,
        token,
        selectedDispositive,
      });

      if (res?.error) {
        throw new Error(res.message || "No se pudo completar la acción");
      }

      modal("Sesame", submitSuccessMessage);
      closeModal();
      onSaved(res);
    } catch (error) {
      modal("Error", error.message || "No se pudo completar la acción");
    } finally {
      charge(false);
    }
  };

  return (
    <ModalForm
      title={title}
      message={message}
      fields={fields}
      onSubmit={handleSubmit}
      onClose={closeModal}
      modal={modal}
    />
  );
};

export default FormSesameOfficeAction;