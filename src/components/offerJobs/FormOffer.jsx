import { getToken } from "../../lib/serviceToken";
import { textErrors } from "../../lib/textErrors";
import { validText } from "../../lib/valid";
import ModalForm from "../globals/ModalForm";
import { useLogin } from '../../hooks/useLogin';
import { sendFormCreateOffer, updateOffer } from "../../lib/data";

const FormOffer = ({ enumsData, closeModal, charge, modal, offer = null, changeOffers }) => {
    const { logged } = useLogin();
    const isEditing = !!offer; // Si hay oferta, estamos editando

    // Helpers de normalización
const normalizeSelectDefault = (value, options) => {
  if (!value) return "";
  // Si ya es un id presente en options.value, úsalo
  if (options.some(o => o.value === value)) return value;
  // Si vino etiqueta, busca su id
  const found = options.find(o => o.label === value);
  return found ? found.value : "";
};

const normalizeMultiDefaults = (values, options) => {
  if (!Array.isArray(values)) return [];
  return values
    .map(v => {
      if (options.some(o => o.value === v)) return v;            // ya id
      const byLabel = options.find(o => o.label === v);          // venía etiqueta
      return byLabel ? byLabel.value : null;
    })
    .filter(Boolean);
};

    const buildFields = () => {
        
        let studiesOptions = [];
        if (enumsData?.studies) {
            studiesOptions = enumsData.studies.flatMap((x) =>
                x.subcategories
                    ? x.subcategories.map((sub) => ({ value: sub._id, label: sub.name }))
                    : [{ value: x._id, label: x.name }]
            );
        }

        let deviceOptions = [];
        if (enumsData?.programs) {
            deviceOptions = enumsData.programs.flatMap((program) =>
                program.devices.map((device) => ({
                    value: device._id,
                    label: device.name,
                }))
            );
        }

        let positionOptions = [];
        if (enumsData?.jobs) {
            positionOptions = enumsData.jobs.flatMap((job) =>
                job.subcategories
                    ? job.subcategories
                          .filter((sub) => sub.name !== "Director/a")
                          .map((sub) => ({ value: sub._id, label: sub.name }))
                    : [{ value: job._id, label: job.name }]
            );
        };

        let provinces = [];
        if (enumsData?.provinces) {
            provinces = enumsData.provinces.flatMap((x) =>
                x.subcategories
                    ? x.subcategories.map((sub) => ({ value: sub._id, label: sub.name }))
                    : [{ value: x._id, label: x.name }]
            );
        }

        let workScheduleOptions = [];
        if (enumsData?.work_schedule) {
            workScheduleOptions = enumsData.work_schedule.flatMap((x) =>
                x.subcategories
                    ? x.subcategories.map((sub) => ({ value: sub.name, label: sub.name }))
                    : [{ value: x.name, label: x.name }]
            );
        }

        const functionsDefault = normalizeSelectDefault(
        offer?.jobId ?? offer?.functions,       // prioriza jobId si existe
        positionOptions
        );
        const provinceDefault = normalizeSelectDefault(
  offer?.provinceId ?? offer?.province,   // prioriza id si existe
  provinces
);
        return [
            {
                name: "functions",
                label: "Funciones",
                type: "select",
                required: true,
                defaultValue: functionsDefault,
                options: [{ value: "", label: "Seleccione una función" }, ...positionOptions]
            },
            {
                name: "work_schedule",
                label: "Horario de Trabajo",
                type: "select",
                required: true,
                defaultValue: offer?.work_schedule || "",
                options: [{ value: "", label: "Seleccione un horario" }, ...workScheduleOptions]
            },
            {
                name: "province",
                label: "Provincia",
                type: "select",
                required: true,
                defaultValue: provinceDefault,
                options: [{ value: "", label: "Seleccione una provincia" }, ...provinces]
            },
            {
                name: "location",
                label: "Localidad",
                type: "text",
                required: true,
                defaultValue: offer?.location || "",
                isValid: (value) =>
                    validText(value, 2, 100) ? "" : textErrors("essentials_requirements"),
            },
            {
                name: "expected_incorporation_date",
                label: "Fecha de Incorporación Esperada",
                type: "text",
                required: true,
                defaultValue: offer?.expected_incorporation_date || "",
            },
            {
                name: "dispositiveID",
                label: "Dispositivo",
                type: "select",
                required: true,
                defaultValue: offer?.dispositive?.dispositiveId || "",
                options: [{ value: "", label: "Seleccione un dispositivo" }, ...deviceOptions]
            },
            {
                name: "studies",
                label: "Estudios requeridos",
                type: "selectMultiple",
                required: true,
                defaultValue: offer?.studies || [],
                options: [{ value: "", label: "Seleccione una formación" }, ...studiesOptions],
            },
            {
                name: "essentials_requirements",
                label: "Requisitos Esenciales",
                type: "textarea",
                required: false,
                defaultValue: offer?.essentials_requirements || "",
                isValid: (value) =>
                    validText(value, 2, 500, true) ? "" : textErrors("essentials_requirements"),
            },
            {
                name: "optionals_requirements",
                label: "Requisitos Opcionales",
                type: "textarea",
                required: false,
                defaultValue: offer?.optionals_requirements || "",
                isValid: (value) =>
                    validText(value, 2, 500, true) ? "" : textErrors("essentials_requirements"),
            },
            {
                name: "conditions",
                label: "Condiciones",
                type: "textarea",
                required: false,
                defaultValue: offer?.conditions || "",
                isValid: (value) =>
                    validText(value, 2, 500, true) ? "" : textErrors("essentials_requirements"),
            },
            {
                name: "sepe",
                label: "¿Es una oferta del SEPE?",
                type: "select",
                required: true,
                defaultValue: offer?.sepe ? "si" : "no",
                options: [{ value: "", label: "Seleccione una opción" }, { value: 'si', label: 'Sí' }, { value: 'no', label: 'No' }],
            },
            {
                name: "type",
                label: "Tipo de oferta",
                type: "select",
                required: true,
                defaultValue: offer?.type || "",
                options: [{ value: "", label: "Seleccione una opción" }, { value: 'internal', label: 'Oferta Interna' }, { value: 'external', label: 'Oferta Pública' }],
            },
            {
                name:'datecreate',
                label: "Fecha de creación",
                type: "date",
                required:true,
                disabled:logged.user.role!='root',
                defaultValue: (offer?.datecreate) ?new Date(offer?.datecreate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]
            }
        ];
    };


    const handleSubmit = async (formData) => {
        try {
            charge(true);
            const dispositive = enumsData.programsIndex[formData.dispositiveID];
            const dataNow = new Date();

            const fields = buildFields();
            // obtener label de functions
            const functionField = fields.find(f => f.name === "functions");
            const startsWithNumber = (str) => /^[0-9]/.test(str);
            const functionLabel =(startsWithNumber(formData.functions))? functionField?.options.find(o => o.value === formData.functions)?.label || "":formData.functions;
            // obtener label de province
            const provinceField = fields.find(f => f.name === "province");
            const provinceLabel = provinceField?.options.find(o => o.value === formData.province)?.label || "";

            const updatedOffer = {
                entity: 'ASOCIACIÓN ENGLOBA',
                job_title: functionLabel + '-' + formData.location + '(' + provinceLabel + ')',
                functions: functionLabel,
                work_schedule: formData.work_schedule,
                essentials_requirements: formData.essentials_requirements,
                optionals_requirements: formData.optionals_requirements,
                conditions: formData.conditions,
                province: provinceLabel,
                location: formData.location,
                date: dataNow,
                create: logged.user._id,
                expected_incorporation_date: formData.expected_incorporation_date,
                programId: dispositive.programId,
                dispositiveId: formData.dispositiveID,
                studies: formData.studies,
                sepe: formData.sepe,
                type: formData.type,
                datecreate:formData.datecreate,
                active: true,
                jobId:formData.functions,
                provinceId:formData.province,
            };

            const token = getToken();
            const result = isEditing
                ? await updateOffer({ ...updatedOffer, id: offer._id }, token)
                : await sendFormCreateOffer(updatedOffer, token);

            if (result.error) {
                modal("Error", result.message || "No se pudo guardar la oferta.");
            } else {
                
                modal("Éxito", isEditing ? "Oferta actualizada correctamente." : "Oferta creada con éxito.");
                changeOffers(result)
                closeModal();
            }
        } catch (error) {
            modal("Error", error.message || "Ocurrió un error.");
            closeModal();
        } finally {
            charge(false);
        }
    };

    return (
        <ModalForm
            title={isEditing ? "Editar Oferta de Empleo" : "Crear Oferta de Empleo"}
            message={isEditing ? "Modifica los datos de la oferta." : "Complete los datos de la oferta."}
            fields={buildFields()}
            onSubmit={handleSubmit}
            onClose={closeModal}
        />
    );
};

export default FormOffer;