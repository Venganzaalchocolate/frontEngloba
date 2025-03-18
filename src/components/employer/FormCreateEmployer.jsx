import React, { useEffect, useState } from "react";
import ModalForm from "../globals/ModalForm";
import { createEmployer, getDataEmployer, updateOffer } from "../../lib/data";
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
import ModalConfirmation from "../globals/ModalConfirmation";
import { useOffer } from "../../hooks/useOffer";


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
  lockedFields = [],
  chargeOffers = () => { },
  selectedResponsibility = null
}) => {
  const { logged } = useLogin();
  const [enums, setEnumsEmployer] = useState(enumsData);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [pendingFormData, setPendingFormData] = useState(null);
  const { changeOffer } = useOffer();



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

  let idSelectResponsability='';

  try {
    const parsed = JSON.parse(selectedResponsibility);
    idSelectResponsability = parsed.deviceId;
  } catch (error) {
    idSelectResponsability=null
  }
  // ========== BUILD DE CAMPOS =============
  const buildFields = () => {
    const hPeriod = user?.hiringPeriods?.[0] || {};

    // Dispositivo: options a partir de enums.programs
    let deviceOptions = [];

    if (!!selectedResponsibility && idSelectResponsability!=null) {
      const dispositive=enums.programsIndex[idSelectResponsability]
      deviceOptions = [{ value:idSelectResponsability, label: dispositive.name }]
    } else {
      if (enums?.programs) {
        deviceOptions = enums.programs.flatMap((program) =>
          program.devices.map((device) => ({
            value: device._id,
            label: device.name,
          }))
        );
      }
    }



    // Position: options a partir de enums.jobs
    let positionOptions = [];
    let studiesOptions=[];
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

    if (enums?.studies) {
      studiesOptions = enums.studies.flatMap((s) => {
        if (s.subcategories) {
          return s.subcategories.map((sub) => ({
            value: sub._id,
            label: sub.name,
          }));
        } else {
          return [{ value: s._id, label: s.name }];
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
      {
        name: "birthday",
        label: "Fecha de Nacimiento",
        type: "date",
        required: true,
        defaultValue:  user?.birthday
          ? new Date(user?.birthday).toISOString().split("T")[0]
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
        options: [{ value: "", label: "Seleccione una o varias opciones" }, ...studiesOptions],
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
        ...((logged.user.role === "root" || logged.user.apafa)
          ? [
            {
              name: "apafa",
              label: "Es de APAFA?",
              type: "select",
              required: true,
              defaultValue: ((user?.apafa)?'si':'no') || 'no',
              disabled: lockedFields.includes("apafa"),
              options: [
                { value: "", label: "Seleccione un rol" },
                { value: "si", label: "si" },
                { value: "no", label: "no" },
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
      {
        name: "gender",
        label: "Género",
        type: "select",
        required: true,
        defaultValue: user?.gender || "",
        disabled: lockedFields.includes("gender"),
        options: [
          { value: "", label: "Seleccione una opción" },
          { value: "male", label: "Masculino" },
          { value: "female", label: "Femenino" },
        ],
      },
      {
        name: "fostered",
        label: "Ex Tutelado",
        type: "select",
        required: true,
        defaultValue: user?.formerWard === true ? "si" : "no",
        disabled: lockedFields.includes("formerWard"),
        options: [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ],
      },
      {
        name: "disPercentage",
        label: "Porcentaje de Discapacidad",
        type: "number",
        required: false,
        defaultValue: user?.disability?.percentage ?? 0,
        disabled: lockedFields.includes("disability.percentage"),
        isValid: (texto) => {
          const isOk = validNumberPercentage(texto);  // true/false
          return isOk ? "" : textErrors("percentage");
        },
      },
      {
        name: "disNotes",
        label: "Notas sobre Discapacidad",
        type: "textarea",
        required: false,
        defaultValue: user?.disability?.notes || "",
        disabled: lockedFields.includes("disability.notes"),
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
        defaultValue: hPeriod.dispositive || idSelectResponsability || "",
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
      {
        name:"reason",
        label:"Si está sustituyendo a un trabajador introduzca el dni del trabajador que está de baja o excedencia",
        type: "text",
        disabled: lockedFields.includes("reason"),
        isValid: (texto) => {
          const isOk = validateDNIorNIE(texto);  // true/false
          return isOk ? "" : textErrors("dni");
        },
      }
      
    ];
  };

  const handleSubmit = async (formData) => {

    if (user?.offer) {
      // Mostrar la ventana de confirmación
      setPendingFormData(formData);
      setShowConfirmation(true);
    } else {
      // Si no hay oferta, crear el usuario directamente
      await handleConfirmOfferChange(formData);
    }
  };


  // ========== SUBMIT =============
  const handleConfirmOfferChange = async (formData) => {
    try {
      charge(true);

      if (user?.offer) {
        const token = getToken();
        const updatedOffer = { id: user.offer, active: 'no' };
        const res = await updateOffer(updatedOffer, token);
        chargeOffers();
        changeOffer(null);
      }


      let newUser = {
        role: formData.role || "employee",
        email: formData.email,
        dni: formData.dni,
        firstName: formData.firstName,
        lastName: formData.lastName || "",
        phone: formData.phone,
        notes: formData.notes || "",
        birthday: formData.birthday,
        gender: formData.gender,
        fostered: formData.fostered || 'no',
        apafa:formData.apafa || 'no',
        studies:formData.studies || [],
        disability: {
          percentage: formData.disPercentage || 0,
          notes: formData.disNotes || '',
        },
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
            reason: {
              dni:formData.reason,
            }
          },
        ],
        
      };

      const token = getToken();

      if (user?.offer) {
        newUser["offer"] = user.offer;
      }


      const result = await createEmployer(token, newUser);

      if (result.error) {
        modal("Error", result.message || "No se pudo crear el usuario");
      } else {
        modal("Usuario", "El usuario se ha creado con éxito");
        chargeUser();
        closeModal();
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al crear el usuario");
      closeModal();
    } finally {
      charge(false);
      setShowConfirmation(false);
      setPendingFormData(null);
    }
  };

  const handleCancelOfferChange = () => {
    setShowConfirmation(false);
    setPendingFormData(null);
  };


  // Build fields
  const fields = buildFields();

  return (
    <>
      {/* Modal de Confirmación */}
      {showConfirmation && (
        <ModalConfirmation
          title="Cambio de Oferta"
          message="Este usuario ya tiene una oferta asociada. ¿Desea desactivarla y continuar?"
          onConfirm={() => handleConfirmOfferChange(pendingFormData)}
          onCancel={handleCancelOfferChange}
        />
      )}

      {/* Modal Form */}
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
