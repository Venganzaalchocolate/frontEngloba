// src/components/employee/FormCreateEmployer.jsx
import React, { useEffect, useMemo, useState } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { createEmployer, getDataEmployer, offerUpdate } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import {
  validateDNIorNIE,
  validEmail,
  validNumber,
  validNumberPercentage,
  validText,
} from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { useLogin } from "../../hooks/useLogin";
import { useOffer } from "../../hooks/useOffer";
import { buildOptionsFromIndex } from "../../lib/utils";

const FormCreateEmployer = ({
  modal,
  charge,
  closeModal,
  chargeUser = () => {},
  enumsData = null,
  user = null,
  lockedFields = [],
  chargeOffers = () => {},
  selectedResponsibility = null, // string JSON con { deviceId } (opcional)
  offerId = null,
  changeUser,
}) => {
  const { logged } = useLogin();
  const { changeOffer } = useOffer();

  const [enums, setEnumsEmployer] = useState(enumsData);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  // Cargar enums si no llegan por props
  useEffect(() => {
    if (!enumsData) {
      (async () => {
        const fetched = await getDataEmployer();
        setEnumsEmployer(fetched);
      })();
    }
  }, [enumsData]);

  /* helpers para opciones desde *index* */


  /** Crear usuario en backend */
  const createUser = async (formData) => {
    charge(true);
    const token = getToken();

    const newUser = {
      role: formData.role || "employee",
      email: formData.email,
      dni: formData.dni,
      firstName: formData.firstName,
      lastName: formData.lastName || "",
      phone: formData.phone,
      birthday: formData.birthday,
      gender: formData.gender,
      fostered: formData.fostered || "no",
      apafa: formData.apafa || "no",
      disability: {
        percentage: formData.disPercentage || 0,
        notes: formData.disNotes || "",
      },
      phoneJobNumber: formData.phoneJobNumber,
      phoneJobExtension: formData.phoneJobExtension,

      // 👇 ahora enviamos los IDs directamente
      studiesId: Array.isArray(formData.studiesId) ? formData.studiesId : [],

      // Primer periodo de contratación
      hiringPeriods: [
        {
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          dispositiveId: formData.dispositiveId, // id de Dispositive
          workShift: { type: formData.workShift },
          position: formData.position, // id de Job
          active: true,
          dnireplacement: formData.reason,
          ...(offerId ? { selectionProcess: offerId } : {}),
        },
      ],
    };

    const res = await createEmployer(token, newUser);

    if (res.error) {
      charge(false);
      modal("Error", res.message || "No se pudo crear el usuario");
    } else {
      modal("Usuario", "El usuario se ha creado con éxito");
      closeModal();
      chargeUser();
      changeUser(res);
    }
  };

  /** Confirmación de desactivar oferta previa (si existe) */
  const handleConfirmOfferChange = async (formData, deactivate) => {
    try {
      if (deactivate && offerId) {
        const token = getToken();
        const updated = await offerUpdate({ offerId, active: false }, token);
        chargeOffers(updated);
        changeOffer(null);
      }
      await createUser(formData);
    } catch (e) {
      closeModal();
      modal("Error", e.message || "Ocurrió un error al crear el usuario");
    }
    setShowConfirmation(false);
    setPendingFormData(null);
  };

  /** Submit */
  const handleSubmit = async (formData) => {
    if (offerId) {
      setPendingFormData(formData);
      setShowConfirmation(true);
    } else {
      await createUser(formData);
    }
  };

  /* -------- build fields con NUEVOS enums ---------- */
  const fields = useMemo(() => {
    const hPeriod = user?.hiringPeriods?.[0] || {};

    // Preselección de dispositivo si viene en selectedResponsibility
    let selectedDeviceId = null;
    if (selectedResponsibility) {
      try {
        selectedDeviceId = JSON.parse(selectedResponsibility).deviceId;
      } catch {
        selectedDeviceId = null;
      }
    }

    // Dispositivos (desde dispositiveIndex)
    const deviceOptions =
      selectedDeviceId && enums?.dispositiveIndex?.[selectedDeviceId]
        ? [
            {
              value: selectedDeviceId,
              label: enums.dispositiveIndex[selectedDeviceId].name,
            },
          ]
        : buildOptionsFromIndex(enums?.dispositiveIndex);

    // Estudios (desde studiesIndex, preferimos solo subcategorías si existen)
    const studiesOptions =
      buildOptionsFromIndex(enums?.studiesIndex, { onlySub: true }) ||
      buildOptionsFromIndex(enums?.studiesIndex);

    // Puestos (desde jobsIndex, preferimos solo subcategorías si existen)
    const positionOptions =
      buildOptionsFromIndex(enums?.jobsIndex, { onlySub: true }) ||
      buildOptionsFromIndex(enums?.jobsIndex);
   
    return [
      // Datos personales
      {
        name: "firstName",
        label: "Nombre",
        type: "text",
        required: true,
        defaultValue: user?.firstName || "",
        disabled: lockedFields.includes("firstName"),
        isValid: (v) => (validText(v, 2, 100) ? "" : textErrors("name")),
      },
      {
        name: "lastName",
        label: "Apellidos",
        type: "text",
        required: true,
        defaultValue: user?.lastName || "",
        disabled: lockedFields.includes("lastName"),
        isValid: (v) => (validText(v, 2, 100) ? "" : textErrors("name")),
      },
      {
        name: "birthday",
        label: "Fecha de Nacimiento",
        type: "date",
        required: true,
        defaultValue: "",
        disabled: lockedFields.includes("birthday"),
      },

      // 👇 ahora el campo se llama studiesId y usa IDs
      {
        name: "studies",
        label: "Estudios",
        type: "multiChips",
        required: true,
        defaultValue: user?.studiesId || [],
        options: [{ value: "", label: "Seleccione una o varias opciones" }, ...studiesOptions],
        placeholder:
          "Busca y añade 1 o varias opciones (puedes pulsar enter o hacer click)",
      },

      ...(logged.user.role === "root"
        ? [
            {
              name: "role",
              label: "Rol",
              type: "select",
              required: true,
              defaultValue: user?.role || "employee",
              disabled: lockedFields.includes("role"),
              options: [
                { value: "", label: "Seleccione un rol" },
                { value: "root", label: "Root" },
                { value: "global", label: "Global" },
                { value: "auditor", label: "Auditor" },
                { value: "employee", label: "Employer" },
                { value: "responsable", label: "Responsable" },
              ],
            },
          ]
        : []),
      ...(logged.user.role === "root" || logged.user.apafa
        ? [
            {
              name: "apafa",
              label: "Es de APAFA?",
              type: "select",
              required: true,
              defaultValue: user?.apafa ? "si" : "no",
              disabled: lockedFields.includes("apafa"),
              options: [
                { value: "", label: "Seleccione una opción" },
                { value: "si", label: "Sí" },
                { value: "no", label: "No" },
              ],
            },
          ]
        : []),
      {
        name: "dni",
        label: "DNI",
        type: "text",
        required: true,
        defaultValue: user?.dni || "",
        disabled: lockedFields.includes("dni"),
        isValid: (v) => (validateDNIorNIE(v) ? "" : textErrors("dni")),
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true,
        defaultValue: user?.email || "",
        disabled: lockedFields.includes("email"),
        isValid: (v) => (validEmail(v) ? "" : textErrors("email")),
      },
      {
        name: "phone",
        label: "Teléfono Personal",
        type: "text",
        required: true,
        defaultValue: user?.phone || "",
        disabled: lockedFields.includes("phone"),
        isValid: (v) => (validNumber(v) ? "" : textErrors("phone")),
      },
      {
        name: "phoneJobNumber",
        label: "Teléfono Laboral",
        type: "text",
        defaultValue: user?.phoneJob?.number || "",
        isValid: (v) => (validNumber(v) ? "" : textErrors("phone")),
      },
      {
        name: "phoneJobExtension",
        label: "Extensión",
        type: "text",
        defaultValue: user?.phoneJob?.extension || "",
      },
      {
        name: "gender",
        label: "Género",
        type: "select",
        required: true,
        defaultValue: user?.gender || "",
        disabled: lockedFields.includes("gender"),
        options: [
          { value: "", label: "Seleccione" },
          { value: "male", label: "Masculino" },
          { value: "female", label: "Femenino" },
          { value: "nonBinary", label: "No binario" },
          { value: "others", label: "Otros" },
        ],
      },
      {
        name: "fostered",
        label: "Ex Tutelado",
        type: "select",
        required: true,
        defaultValue: user?.fostered ? "si" : "no",
        disabled: lockedFields.includes("fostered"),
        options: [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ],
      },
      {
        name: "disPercentage",
        label: "Porcentaje Discapacidad",
        type: "number",
        defaultValue: user?.disability?.percentage ?? 0,
        disabled: lockedFields.includes("disability.percentage"),
        isValid: (v) => (validNumberPercentage(v) ? "" : textErrors("percentage")),
      },
      {
        name: "disNotes",
        label: "Notas Discapacidad",
        type: "textarea",
        defaultValue: user?.disability?.notes || "",
        disabled: lockedFields.includes("disability.notes"),
      },

      // Contratación
      { type: "section", label: "PRIMER PERIODO DE CONTRATACIÓN" },
      {
        name: "startDate",
        label: "Fecha Inicio",
        type: "date",
        required: true,
        defaultValue: hPeriod.startDate
          ? new Date(hPeriod.startDate).toISOString().split("T")[0]
          : "",
        disabled: lockedFields.includes("startDate"),
      },
      {
        name: "dispositiveId",
        label: "Dispositivo",
        type: "select",
        required: true,
        defaultValue: hPeriod.dispositiveId || selectedDeviceId || "",
        disabled: lockedFields.includes("dispositiveId"),
        options: [{ value: "", label: "Seleccione" }, ...deviceOptions],
      },
      {
        name: "workShift",
        label: "Jornada",
        type: "select",
        required: true,
        defaultValue: hPeriod.workShift?.type || "",
        disabled: lockedFields.includes("workShift"),
        options: [
          { value: "", label: "Seleccione" },
          { value: "completa", label: "Completa" },
          { value: "parcial", label: "Parcial" },
        ],
      },
      {
        name: "position",
        label: "Cargo (puesto)",
        type: "select",
        required: true,
        defaultValue: hPeriod.position || "",
        disabled: lockedFields.includes("position"),
        options: [{ value: "", label: "Seleccione" }, ...positionOptions],
      },
      {
        name: "reason",
        label: "DNI trabajador sustituido (si aplica)",
        type: "text",
        disabled: lockedFields.includes("reason"),
        isValid: (v) => (v ? (validateDNIorNIE(v) ? "" : textErrors("dni")) : ""),
      },
    ];
  }, [enums, lockedFields, selectedResponsibility, user]);

  return (
    <>
      {showConfirmation && (
        <ModalConfirmation
          title="Desactivar oferta"
          message="¿Quieres desactivar la oferta?"
          onConfirm={() => handleConfirmOfferChange(pendingFormData, true)}
          onCancel={() => handleConfirmOfferChange(pendingFormData, false)}
        />
      )}

      <ModalForm
        title="Añadir Empleado"
        message="Complete los datos del empleado y su primer periodo de contratación."
        fields={fields}
        onSubmit={handleSubmit}
        onClose={closeModal}
      />
    </>
  );
};

export default FormCreateEmployer;
