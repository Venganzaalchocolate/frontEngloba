// src/components/employee/FormCreateEmployer.jsx
import React, { useEffect, useState } from "react";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import {
  createEmployer,
  getDataEmployer,
  updateOffer,
} from "../../lib/data";
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
import { deepClone } from "../../lib/utils";

/**
 * FormCreateEmployer
 * ------------------
 * • Crea un empleado y su primer periodo de contratación.  
 * • Si el candidato ya tiene oferta, pregunta si quieres desactivarla.
 */
const FormCreateEmployer = ({
  modal,
  charge,
  closeModal,
  chargeUser= () => {},
  enumsData = null,
  user = null,
  lockedFields = [],
  chargeOffers = () => {},
  selectedResponsibility = null,
  offerId=null,
  changeUser
}) => {
  const { logged } = useLogin();
  const {changeOffer } = useOffer();
  
  const [enums, setEnumsEmployer] = useState(enumsData);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);

  
  /* ------------------------------------------------------------------
   *  Cargar enumeraciones si no llegan por props
   * -----------------------------------------------------------------*/
  useEffect(() => {
    if (!enumsData) {
      (async () => {
        const fetched = await getDataEmployer();
        setEnumsEmployer(fetched);
      })();
    }
  }, [enumsData]);

  /* ═════════════════════════════════════════════════════════════════
   *  HELPERS
   * ═════════════════════════════════════════════════════════════════ */

  /** Construye el payload y llama a createEmployer */
  const createUser = async (formData) => {
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
      studies: formData.studies || [],
      disability: {
        percentage: formData.disPercentage || 0,
        notes: formData.disNotes || "",
      },
      phoneJobNumber: formData.phoneJobNumber,
      phoneJobExtension: formData.phoneJobExtension,
      hiringPeriods: [
        {
          startDate: formData.startDate,
          endDate: formData.endDate || null,
          device: formData.device,
          workShift: { type: formData.workShift },
          category: formData.category || "",
          position: formData.position,
          active: true,
          reason: { dni: formData.reason },
        },
      ],
    };

  
    if (offerId) newUser.hiringPeriods[0].selectionProcess = offerId;

    const res = await createEmployer(token, newUser);

    if (res.error) {
      modal("Error", res.message || "No se pudo crear el usuario");
    } else {
      modal("Usuario", "El usuario se ha creado con éxito");
      res.workedInEngloba=true
      chargeUser();
      changeUser(res)
      closeModal();
    }
  };

  /** Confirma (o no) la desactivación de la oferta previa */
  const handleConfirmOfferChange = async (formData, deactivate) => {
  try {
    charge(true);

    if (deactivate && offerId) {
      const token = getToken();
      const updated = await updateOffer({ id: offerId, active: "no" }, token);
      
      chargeOffers(updated);
      changeOffer(null);
    }

    await createUser(formData);
  } catch (e) {
    modal("Error", e.message || "Ocurrió un error al crear el usuario");
    closeModal();
  } finally {
    charge(false);
    setShowConfirmation(false);
    setPendingFormData(null);
  }
};


  /* ═════════════════════════════════════════════════════════════════
   *  HANDLE SUBMIT
   * ═════════════════════════════════════════════════════════════════ */
  const handleSubmit = (formData) => {
  if (offerId) {
    setPendingFormData(formData);
    setShowConfirmation(true);
  } else {
    createUser(formData);
  }
};


  /* ═════════════════════════════════════════════════════════════════
   *  BUILD FIELDS (idéntico a tu versión original)
   * ═════════════════════════════════════════════════════════════════ */
  const buildFields = () => {
    const hPeriod = user?.hiringPeriods?.[0] || {};

    /* ------------- dispositive options ------------------- */
    let deviceOptions = [];
    let selectedDeviceId = null;
    if (selectedResponsibility) {
      try {
        selectedDeviceId = JSON.parse(selectedResponsibility).deviceId;
      } catch {
        selectedDeviceId = null;
      }
    }
    if (selectedDeviceId && enums?.programsIndex) {
      const d = enums.programsIndex[selectedDeviceId];
      deviceOptions = [{ value: d._id, label: d.name }];
    } else if (enums?.programs) {
      deviceOptions = enums.programs.flatMap((p) =>
        p.devices.map((d) => ({ value: d._id, label: d.name }))
      );
    }

    /* ------------- studies & jobs options ---------------- */
    const studiesOptions = enums?.studies?.flatMap((s) =>
      s.subcategories
        ? s.subcategories.map((sub) => ({ value: sub._id, label: sub.name }))
        : [{ value: s._id, label: s.name }]
    ) || [];

    const positionOptions = enums?.jobs?.flatMap((j) =>
      j.subcategories
        ? j.subcategories.map((sub) => ({ value: sub._id, label: sub.name }))
        : [{ value: j._id, label: j.name }]
    ) || [];

    /* ------------- fields array -------------------------- */
    return [
      /* Datos personales ------------------------------------------------ */
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
        defaultValue: user?.birthday
          ? new Date(user.birthday).toISOString().split("T")[0]
          : "",
        disabled: lockedFields.includes("birthday"),
      },
      {
        name: "studies",
        label: "Estudios",
        type: "selectMultiple",
        required: true,
        defaultValue: user?.studies || [],
        disabled: lockedFields.includes("studies"),
        options: [
          { value: "", label: "Seleccione una o varias opciones" },
          ...studiesOptions,
        ],
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
        isValid: (v) =>
          validNumberPercentage(v) ? "" : textErrors("percentage"),
      },
      {
        name: "disNotes",
        label: "Notas Discapacidad",
        type: "textarea",
        defaultValue: user?.disability?.notes || "",
        disabled: lockedFields.includes("disability.notes"),
      },
      /* --- Sección contratación --------------------------------------- */
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
        name: "device",
        label: "Dispositivo",
        type: "select",
        required: true,
        defaultValue:
          hPeriod.device || selectedDeviceId || "",
        disabled: lockedFields.includes("device"),
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
        name: "category",
        label: "Categoría",
        type: "select",
        required: true,
        defaultValue: hPeriod.category || "",
        disabled: lockedFields.includes("category"),
        options: [
          { value: "", label: "Seleccione" },
          { value: "1", label: "Categoría 1" },
          { value: "2", label: "Categoría 2" },
          { value: "3", label: "Categoría 3" },
        ],
      },
      {
        name: "position",
        label: "Cargo (puesto)",
        type: "select",
        required: true,
        defaultValue: hPeriod.position || "",
        disabled: lockedFields.includes("position"),
        options: [
          { value: "", label: "Seleccione" },
          ...positionOptions,
        ],
      },
      {
        name: "reason",
        label: "DNI trabajador sustituido (si aplica)",
        type: "text",
        disabled: lockedFields.includes("reason"),
        isValid: (v) =>
          v ? (validateDNIorNIE(v) ? "" : textErrors("dni")) : "",
      },
    ];
  };

  const fields = buildFields();

  /* ═════════════════════════════════════════════════════════════════
   *  RENDER
   * ═════════════════════════════════════════════════════════════════ */
  return (
    <>
          {showConfirmation && (
      <ModalConfirmation
        title="Desactivar oferta"
        message="¿Quieres desactivar la oferta?"
        onConfirm={() => handleConfirmOfferChange(pendingFormData, true)}
        onCancel={()  => handleConfirmOfferChange(pendingFormData, false)}
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
