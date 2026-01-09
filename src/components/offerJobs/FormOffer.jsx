// src/components/offers/FormOffer.jsx
import { useMemo } from "react";
import { getToken } from "../../lib/serviceToken";
import { textErrors } from "../../lib/textErrors";
import { validText } from "../../lib/valid";
import ModalForm from "../globals/ModalForm";
import { useLogin } from "../../hooks/useLogin";

// DATA LAYER (sin fetch manual)
import { offerCreate, offerUpdate } from "../../lib/data";
import { buildModalFormOptionsFromIndex} from "../../lib/utils";

const FormOffer = ({
  enumsData,
  closeModal,
  charge,
  modal,
  offer = null,
  changeOffers,
}) => {
  const { logged } = useLogin();
  const isEditing = !!offer;

  // === Helpers ===
  const asStr = (v) => (v == null ? "" : String(v));
  const isoDay = (d) => (d ? new Date(d).toISOString().split("T")[0] : "");
  const toBool = (v) => v === true || ["si", "sí", "SI", "Sí"].includes(String(v));
  const eqArrayAsSet = (a = [], b = []) => {
    const A = new Set(a.map(String));
    const B = new Set(b.map(String));
    if (A.size !== B.size) return false;
    for (const x of A) if (!B.has(x)) return false;
    return true;
  };

  // Horarios: de work_schedule (array con { _id, name })
  const workScheduleOptions = useMemo(() => {
    const arr = Array.isArray(enumsData?.work_schedule) ? enumsData.work_schedule : [];
    return arr.map((x) => ({ value: x.name, label: x.name }));
  }, [enumsData]);
  

  // Valor por defecto del dispositivo (acepta varias variantes en offer)
  const dispositiveDefault = useMemo(
    () =>
      offer?.dispositive?.newDispositiveId ||
      "",
    [offer]
  );


  // ===== Definición de campos (ModalForm) =====
  const buildFields = () => [
    {
      name: "functions",
      label: "Funciones",
      type: "select",
      required: true,
      defaultValue: offer?.jobId || "",
      options: buildModalFormOptionsFromIndex(enumsData.jobsIndex, {
      onlyPublic: true,
      }),
    },
    {
      name: "work_schedule",
      label: "Horario de Trabajo",
      type: "select",
      required: true,
      defaultValue: offer?.work_schedule || "",
      options: workScheduleOptions,
    },
    {
      name: "location",
      label: "Localidad",
      type: "text",
      required: true,
      defaultValue: offer?.location || "",
      isValid: (v) => (validText(v, 2, 100) ? "" : textErrors("location")),
      capsGuard: true,
    },
    {
      name: "expected_incorporation_date",
      label: "Fecha de Incorporación Esperada",
      type: "text",
      required: true,
      defaultValue: offer?.expected_incorporation_date || "",
      capsGuard: true,
    },
    {
      name: "newDispositiveId",
      label: "Dispositivo",
      type: "select",
      required: true,
      defaultValue: dispositiveDefault,
       options: buildModalFormOptionsFromIndex(enumsData.dispositiveIndex, {
        onlyActive: true,
    }),
    },
    {
      name: "studiesId",
      label: "Estudios",
      type: "multiChips",
      required: true,
      defaultValue: Array.isArray(offer?.studiesId) ? offer.studiesId : [],
      options: buildModalFormOptionsFromIndex(enumsData.studiesIndex),
      placeholder: "Busca y añade 1 o varias opciones (puedes pulsar enter o hacer click)",
    },
    {
      name: "essentials_requirements",
      label: "Requisitos Esenciales",
      type: "textarea",
      required: false,
      defaultValue: offer?.essentials_requirements || "",
      isValid: (v) => (validText(v, 2, 500, true) ? "" : textErrors("essentials_requirements")),
      capsGuard: true,
    },
    {
      name: "optionals_requirements",
      label: "Requisitos Opcionales",
      type: "textarea",
      required: false,
      defaultValue: offer?.optionals_requirements || "",
      isValid: (v) => (validText(v, 2, 500, true) ? "" : textErrors("essentials_requirements")),
      capsGuard: true,
    },
    {
      name: "conditions",
      label: "Condiciones",
      type: "textarea",
      required: false,
      defaultValue: offer?.conditions || "",
      isValid: (v) => (validText(v, 2, 500, true) ? "" : textErrors("essentials_requirements")),
      capsGuard: true,
    },
    {
      name: "sepe",
      label: "¿Es una oferta del SEPE?",
      type: "select",
      required: true,
      defaultValue: offer?.sepe ? "si" : "no",
      options: [
        { value: "si", label: "Sí" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "type",
      label: "Tipo de oferta",
      type: "select",
      required: true,
      defaultValue: offer?.type || "",
      options: [
        { value: "internal", label: "Oferta Interna" },
        { value: "external", label: "Oferta Pública" },
      ],
    },
    {
      name: "datecreate",
      label: "Fecha de creación",
      type: "date",
      required: true,
      disabled: logged?.user?.role !== "root",
      defaultValue: offer?.datecreate
        ? new Date(offer.datecreate).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0],
    },
  ];

  // ===== Submit (ajustado a dispositiveIndex) =====
  const handleSubmit = async (formData) => {
    try {
      charge?.(true);

      const newDispositiveId = asStr(formData.newDispositiveId || "");

      // Resolver programa y provincia desde dispositiveIndex
      const dispositiveEntry = enumsData?.dispositiveIndex?.[newDispositiveId] || {};
      const newProgramId = asStr(dispositiveEntry?.program || "");
      const newProvinceId = asStr(dispositiveEntry?.province || "");

      if (!newProgramId) {
        modal?.("Error", "No se pudo resolver el programa a partir del dispositivo seleccionado.");
        charge?.(false);
        return;
      }
      if (!newProvinceId) {
        modal?.("Error", "No se pudo resolver la provincia a partir del dispositivo seleccionado.");
        charge?.(false);
        return;
      }

      // Normalizar valores del formulario
      const newValues = {
        jobId: asStr(formData.functions || ""),
        work_schedule: asStr(formData.work_schedule || ""),
        location: asStr(formData.location || ""),
        expected_incorporation_date: asStr(formData.expected_incorporation_date || ""),
        dispositive: { programId: newProgramId, newDispositiveId: newDispositiveId },
        programId: newProgramId, // para tu backend
        provinceId: newProvinceId, // útil en create/patch
        sepe: toBool(formData.sepe),
        type: asStr(formData.type || ""),
        datecreate: isoDay(formData.datecreate),
        essentials_requirements: asStr(formData.essentials_requirements || ""),
        optionals_requirements: asStr(formData.optionals_requirements || ""),
        conditions: asStr(formData.conditions || ""),
        studiesId: Array.isArray(formData.studiesId) ? formData.studiesId.map(String) : [],
      };

      const token = getToken();

      if (!isEditing) {
        // CREATE
        const payload = {
          work_schedule: newValues.work_schedule,
          essentials_requirements: newValues.essentials_requirements,
          optionals_requirements: newValues.optionals_requirements,
          conditions: newValues.conditions,
          location: newValues.location,
          create: logged?.user?._id,
          expected_incorporation_date: newValues.expected_incorporation_date,
          programId: newValues.programId,
          newDispositiveId: newValues.dispositive.newDispositiveId, // según tu backend actual
          studiesId: newValues.studiesId,
          sepe: newValues.sepe,
          type: newValues.type,
          datecreate: newValues.datecreate,
          active: true,
          jobId: newValues.jobId,
          provinceId: newValues.provinceId, // lo incluimos también en create
        };

        const result = await offerCreate(payload, token);
        if (result?.error) {
          modal?.("Error", result.message || "No se pudo guardar la oferta.");
          return;
        }
        modal?.("Éxito", "Oferta creada con éxito.");
        changeOffers?.(result);
        closeModal?.();
        return;
      }

      // EDIT → construir diff
      const curr = {
        jobId: asStr(offer?.jobId ?? ""),
        work_schedule: asStr(offer?.work_schedule ?? ""),
        location: asStr(offer?.location ?? ""),
        expected_incorporation_date: asStr(offer?.expected_incorporation_date ?? ""),
        newDispositiveId: asStr(
          offer?.dispositive?.newDispositiveId ??
            offer?.dispositiveId ??
            offer?.dispositiveID ??
            ""
        ),
        programId: asStr(offer?.dispositive?.programId ?? ""),
        sepe: !!offer?.sepe,
        type: asStr(offer?.type ?? ""),
        datecreate: isoDay(offer?.datecreate),
        essentials_requirements: asStr(offer?.essentials_requirements ?? ""),
        optionals_requirements: asStr(offer?.optionals_requirements ?? ""),
        conditions: asStr(offer?.conditions ?? ""),
        studiesId: Array.isArray(offer?.studiesId) ? offer.studiesId.map(String) : [],
        provinceId: asStr(offer?.provinceId ?? ""),
      };

      const patch = {};
      if (newValues.jobId && newValues.jobId !== curr.jobId) patch.jobId = newValues.jobId;
      if (newValues.work_schedule !== curr.work_schedule)
        patch.work_schedule = newValues.work_schedule;
      if (newValues.location !== curr.location) patch.location = newValues.location;
      if (newValues.expected_incorporation_date !== curr.expected_incorporation_date)
        patch.expected_incorporation_date = newValues.expected_incorporation_date;

      const dispositiveChanged =
        newValues.dispositive.newDispositiveId !== curr.newDispositiveId ||
        newValues.programId !== curr.programId;

      if (dispositiveChanged) {
        patch.newDispositiveId = newValues.dispositive.newDispositiveId;
        patch.programId = newValues.programId;
        if (newValues.provinceId && newValues.provinceId !== curr.provinceId) {
          patch.provinceId = newValues.provinceId;
        }
      }

      if (newValues.sepe !== curr.sepe) patch.sepe = newValues.sepe;
      if (newValues.type !== curr.type) patch.type = newValues.type;
      if (newValues.datecreate !== curr.datecreate) patch.datecreate = newValues.datecreate;
      if (newValues.essentials_requirements !== curr.essentials_requirements)
        patch.essentials_requirements = newValues.essentials_requirements;
      if (newValues.optionals_requirements !== curr.optionals_requirements)
        patch.optionals_requirements = newValues.optionals_requirements;
      if (newValues.conditions !== curr.conditions) patch.conditions = newValues.conditions;
      if (!eqArrayAsSet(newValues.studiesId, curr.studiesId)) patch.studiesId = newValues.studiesId;

      if (Object.keys(patch).length === 0) {
        modal?.("Sin cambios", "No se han detectado modificaciones.");
        closeModal?.();
        return;
      }
      const result = await offerUpdate({ ...patch, offerId: offer?._id }, token);
      if (result?.error) {
        modal?.("Error", result.message || "No se pudo actualizar la oferta.");
        return;
      }

      modal?.("Éxito", "Oferta actualizada correctamente.");
      changeOffers?.(result);
      closeModal?.();
    } catch (e) {
      modal?.("Error", e.message || "Ocurrió un error.");
      closeModal?.();
    } finally {
      charge?.(false);
    }
  };

  return (
    <ModalForm
      title={isEditing ? "Editar Oferta de Empleo" : "Crear Oferta de Empleo"}
      message={isEditing ? "Modifica los datos de la oferta." : "Complete los datos de la oferta."}
      fields={buildFields()}
      onSubmit={handleSubmit}
      onClose={closeModal}
      modal={modal}
    />
  );
};

export default FormOffer;
