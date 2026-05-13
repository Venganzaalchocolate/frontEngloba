import { useMemo, useState } from "react";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { buildModalFormOptionsFromIndex } from "../../lib/utils";
import { getDispositiveId } from "../../lib/data";

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
  const [pendingData, setPendingData] = useState(null);

  const deviceOptions = useMemo(() => {
    return buildModalFormOptionsFromIndex(enumsData?.dispositiveIndex, {
      onlyActive: true,
    }) || [];
  }, [enumsData?.dispositiveIndex]);

  const fields = useMemo(() => [
    {
      name: "dispositiveId",
      label: "Dispositivo",
      type: "select",
      required: true,
      defaultValue: "",
      options: [{ value: "", label: "Seleccione dispositivo" }, ...deviceOptions],
      isValid: (v) => (!!v ? "" : "Debes seleccionar un dispositivo"),
    },
    ...extraFields,
  ], [deviceOptions, extraFields]);

  const workplaceFields = useMemo(() => [
    {
      name: "workplaceId",
      label: "Centro de trabajo / oficina Sesame",
      type: "select",
      required: true,
      defaultValue: "",
      options: [
        { value: "", label: "Seleccione centro de trabajo" },
        ...(pendingData?.workplaces || []).map((workplace) => ({
          value: workplace._id,
          label: `${workplace.name || "Centro de trabajo"}${workplace.address ? ` · ${workplace.address}` : ""}`,
        })),
      ],
      isValid: (v) => (!!v ? "" : "Debes seleccionar un centro de trabajo"),
    },
  ], [pendingData]);

  const runSubmitAction = async ({ formData, selectedDispositive, selectedWorkplace }) => {
    const employeeId = user?._id || "";

    if (!employeeId) {
      modal("Error", "No se ha encontrado el usuario");
      return;
    }

    if (!selectedWorkplace?.officeIdSesame) {
      modal("Error", "El centro de trabajo seleccionado no tiene oficina Sesame enlazada");
      return;
    }

    if (typeof submitAction !== "function") {
      modal("Error", "No se ha definido la acción Sesame");
      return;
    }

    charge(true);

    const res = await submitAction({
      employeeId,
      officeId: selectedWorkplace.officeIdSesame,
      workplace: selectedWorkplace,
      formData,
      token: getToken(),
      selectedDispositive,
    });

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo completar la acción");
      charge(false);
      return;
    }

    modal("Sesame", submitSuccessMessage);
    closeModal();
    onSaved(res);
    charge(false);
  };

  const handleSubmit = async (formData) => {
    const employeeId = user?._id || "";

    if (!employeeId) {
      modal("Error", "No se ha encontrado el usuario");
      return;
    }

    if (!formData?.dispositiveId) {
      modal("Error", "Debes seleccionar un dispositivo");
      return;
    }

    charge(true);

    const res = await getDispositiveId(
      { dispositiveId: formData.dispositiveId },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo cargar el dispositivo");
      charge(false);
      return;
    }

    const selectedDispositive = res;
    const workplaces = Array.isArray(selectedDispositive?.workplaces)
      ? selectedDispositive.workplaces.filter((workplace) => !!workplace?.officeIdSesame)
      : [];

    if (!workplaces.length) {
      modal(
        "Sin oficina Sesame",
        "Este dispositivo no tiene ningún centro de trabajo asociado con oficina Sesame enlazada."
      );
      charge(false);
      return;
    }

    if (workplaces.length === 1) {
      charge(false);
      await runSubmitAction({
        formData,
        selectedDispositive,
        selectedWorkplace: workplaces[0],
      });
      return;
    }

    setPendingData({
      formData,
      selectedDispositive,
      workplaces,
    });

    charge(false);
  };

  const handleWorkplaceSubmit = async (values) => {
    const selectedWorkplace = pendingData?.workplaces?.find(
      (workplace) => String(workplace._id) === String(values.workplaceId)
    );

    if (!selectedWorkplace) {
      modal("Error", "No se encontró el centro de trabajo seleccionado");
      return;
    }

    await runSubmitAction({
      formData: pendingData.formData,
      selectedDispositive: pendingData.selectedDispositive,
      selectedWorkplace,
    });
  };

  if (pendingData) {
    return (
      <ModalForm
        title="Seleccionar oficina Sesame"
        message="Este dispositivo tiene varios centros de trabajo asociados. Elige cuál quieres usar para esta acción."
        fields={workplaceFields}
        onSubmit={handleWorkplaceSubmit}
        onClose={() => setPendingData(null)}
        modal={modal}
      />
    );
  }

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