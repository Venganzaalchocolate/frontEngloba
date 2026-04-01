import FormSesameOfficeAction from "./FormSesameOfficeAction";
import { postSesameAssignEmployeeOfficeRole } from "../../lib/data";

const FormSesameOfficeManagerAssignation = (props) => {
  return (
    <FormSesameOfficeAction
      {...props}
      title="Añadir centro gestionado"
      message="Selecciona el dispositivo sobre el que quieres asignar el rol Workplace administrator."
      submitSuccessMessage="El rol de responsable de centro se ha asignado correctamente"
      submitAction={({ employeeId, officeId, token }) =>
        postSesameAssignEmployeeOfficeRole(
          {
            employeeId,
            officeId,
          },
          token
        )
      }
    />
  );
};

export default FormSesameOfficeManagerAssignation;