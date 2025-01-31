import React, { useEffect, useState } from "react";
import ModalForm from "../globals/ModalForm";
import { createEmployer, getDataEmployer } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import {
  validateDNIorNIE,
  validEmail,
  validNumber,
  validText,
} from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { useLogin } from "../../hooks/useLogin";

/**
 * FormCreateEmployer
 * ------------------
 * Muestra un formulario para crear/editar un usuario y su primer período de contratación.
 */
const FormCreateEmployer = ({
  modal,
  charge,
  closeModal,
  chargeUser,
  enumsData = null,
  user = null,
  lockedFields = []
}) => {
  const { logged } = useLogin();
  const [enums, setEnumsEmployer] = useState(enumsData);

  // ========== CARGA DE ENUMS =============
  const chargeEnums = async () => {
    const enumsDataFetched = await getDataEmployer();
    setEnumsEmployer(enumsDataFetched);
    return enumsDataFetched;
  };

  useEffect(() => {
    if (!enumsData) {
      chargeEnums();
    }
  }, [enumsData]);

  // ========== BUILD DE CAMPOS =============
  const buildFields = () => {
    const hPeriod = user?.hiringPeriods?.[0] || {};

    // Dispositivo: options a partir de enums.programs
    let deviceOptions = [];
    if (enums?.programs) {
      deviceOptions = enums.programs.flatMap((program) =>
        program.devices.map((device) => ({
          value: device._id,
          label: device.name,
        }))
      );
    }

    // Position: options a partir de enums.jobs
    let positionOptions = [];
    if (enums?.jobs) {
      positionOptions = enums.jobs.flatMap((job) => {
        if (job.subcategories) {
          return job.subcategories.map((sub) => ({
            value: sub._id,
            label: sub.name,
          }));
        } else {
          return [{ value: job._id, label: job.name }];
        }
      });
    }

    return [
      {
        name: "firstName",
        label: "Nombre",
        type: "text",
        required: true,
        defaultValue: user?.firstName || "",
        disabled: lockedFields.includes("firstName"),
        // Aquí validText retorna true/false
        // Convertimos a "" o un mensaje
        isValid: (texto) => {
          const isOk = validText(texto, 2, 100);  // por ejemplo min 2, max 100
          return isOk ? "" : textErrors("name");  
        },
      },
      {
        name: "lastName",
        label: "Apellidos",
        type: "text",
        required: true,
        defaultValue: user?.lastName || "",
        disabled: lockedFields.includes("lastName"),
        isValid: (texto) => {
          const isOk = validText(texto, 2, 100);
          return isOk ? "" : textErrors("name");
        },
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
      {
        name: "dni",
        label: "DNI",
        type: "text",
        required: true,
        defaultValue: user?.dni || "",
        disabled: lockedFields.includes("dni"),
        isValid: (valorDNI) => {
          // validateDNIorNIE => true/false
          const isOk = validateDNIorNIE(valorDNI);
          return isOk ? "" : textErrors("dni");
        },
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true,
        defaultValue: user?.email || "",
        disabled: lockedFields.includes("email"),
        isValid: (texto) => {
          const isOk = validEmail(texto);  // true/false
          return isOk ? "" : textErrors("email");
        },
      },
      {
        name: "phone",
        label: "Teléfono",
        type: "text",
        required: true,
        defaultValue: user?.phone || "",
        disabled: lockedFields.includes("phone"),
        isValid: (texto) => {
          const isOk = validNumber(texto);
          return isOk ? "" : textErrors("phone");
        },
      },
      { type: "section", label: "PRIMER PERIODO DE CONTRATACIÓN" },
      {
        name: "startDate",
        label: "Fecha de Inicio",
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
        defaultValue: hPeriod.device || "",
        disabled: lockedFields.includes("device"),
        options: [{ value: "", label: "Seleccione una opción" }, ...deviceOptions],
      },
      {
        name: "workShift",
        label: "Jornada",
        type: "select",
        required: true,
        defaultValue: hPeriod.workShift?.type || "",
        disabled: lockedFields.includes("workShift"),
        options: [
          { value: "", label: "Seleccione una opción" },
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
          { value: "", label: "Seleccione una opción" },
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
        options: [{ value: "", label: "Seleccione una opción" }, ...positionOptions],
      },
      { type: "section", label: "RESPONSABILIDADES" },
      {
        name: "notes",
        label: "Escribe si es responsable, director o coordinador de algún programa o dispositivo",
        type: "text",
        required: false,
        defaultValue: user?.notes || "",
        disabled: lockedFields.includes("notes"),
      },
    ];
  };

  // ========== SUBMIT =============
  const handleSubmit = async (formData) => {
    try {
      charge(true);

      const newUser = {
        role: formData.role || "employee",
        email: formData.email,
        dni: formData.dni,
        firstName: formData.firstName,
        lastName: formData.lastName || "",
        phone: formData.phone,
        notes: formData.notes || "",
        hiringPeriods: [
          {
            startDate: formData.startDate,
            endDate: formData.endDate || null,
            device: formData.device,
            workShift: {
              type: formData.workShift,
              nota: "",
            },
            category: formData.category || "",
            position: formData.position,
            active: true,
          },
        ],
      };

      const token = getToken();
      const result = await createEmployer(token, newUser);

      if (result.error) {
        modal("Error", result.message || "No se pudo crear/actualizar el usuario");
      } else {
        modal("Usuario", "El usuario se ha creado/actualizado con éxito");
        chargeUser();
        closeModal();
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al crear/actualizar el usuario");
      closeModal();
    } finally {
      charge(false);
    }
  };

  // Build fields
  const fields = buildFields();

  return (
    <ModalForm
      title="Añadir/Editar Empleado"
      message="Complete los datos del empleado y su primer periodo de contratación."
      fields={fields}
      onSubmit={handleSubmit}
      onClose={closeModal}
    />
  );
};

export default FormCreateEmployer;
