import { getToken } from "../../lib/serviceToken";
import { textErrors } from "../../lib/textErrors";
import { validText } from "../../lib/valid";
import ModalForm from "../globals/ModalForm";
import { useLogin } from '../../hooks/useLogin';
import { sendFormCreateOffer, updateOffer } from "../../lib/data";

const FormOffer = ({ enumsData, closeModal, charge, modal, offer = null, changeOffers }) => {
    const { logged } = useLogin();
    const isEditing = !!offer; // Si hay oferta, estamos editando

    const buildFields = () => {
        let studiesOptions = [];
        if (enumsData?.studies) {
            studiesOptions = enumsData.studies.flatMap((x) =>
                x.subcategories
                    ? x.subcategories.map((sub) => ({ value: sub.name, label: sub.name }))
                    : [{ value: x.name, label: x.name }]
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
                          .map((sub) => ({ value: sub.name, label: sub.name }))
                    : [{ value: job.name, label: job.name }]
            );
        };

        let provinces = [];
        if (enumsData?.provinces) {
            provinces = enumsData.provinces.flatMap((x) =>
                x.subcategories
                    ? x.subcategories.map((sub) => ({ value: sub.name, label: sub.name }))
                    : [{ value: x.name, label: x.name }]
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

        return [
            {
                name: "functions",
                label: "Funciones",
                type: "select",
                required: true,
                defaultValue: offer?.functions || "",
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
                defaultValue: offer?.province || "",
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

            const updatedOffer = {
                entity: 'ASOCIACIÓN ENGLOBA',
                job_title: formData.functions + '-' + formData.location + '(' + formData.province + ')',
                functions: formData.functions,
                work_schedule: formData.work_schedule,
                essentials_requirements: formData.essentials_requirements,
                optionals_requirements: formData.optionals_requirements,
                conditions: formData.conditions,
                province: formData.province,
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
                active: true
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