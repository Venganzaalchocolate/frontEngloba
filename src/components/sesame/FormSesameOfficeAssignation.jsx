import FormSesameOfficeAction from "./FormSesameOfficeAction";
import { postSesameAssignEmployeeOffice } from "../../lib/data";

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

export default FormSesameOfficeAssignation;
