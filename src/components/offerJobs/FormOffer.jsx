// src/components/offers/FormOffer.jsx
import { useMemo } from "react";
import { getToken } from "../../lib/serviceToken";
import { textErrors } from "../../lib/textErrors";
import { validText } from "../../lib/valid";
import ModalForm from "../globals/ModalForm";
import { useLogin } from "../../hooks/useLogin";

// DATA LAYER (sin fetch manual)
import { offerCreate, offerUpdate } from "../../lib/data";
import { buildModalFormOptionsFromIndex } from "../../lib/utils";

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

  const normalizeUrlSepe = (v) => String(v ?? "").trim();

  const isValidHttpUrl = (value) => {
    if (!value) return false;

    try {
      const url = new URL(String(value).trim());
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  };

  const resolveOfferTypeFront = ({ sepe, urlSepe, manualType }) => {
    if (sepe) return urlSepe ? "external" : "internal";
    return manualType || "external";
  };

  // Horarios
  const workScheduleOptions = useMemo(() => {
    const arr = Array.isArray(enumsData?.work_schedule) ? enumsData.work_schedule : [];
    return arr.map((x) => ({ value: x.name, label: x.name }));
  }, [enumsData]);

  // Valor por defecto del dispositivo
  const dispositiveDefault = useMemo(
    () => offer?.dispositive?.newDispositiveId || "",
    [offer]
  );

  const isRoot = logged?.user?.role === "root";
  const responsabilities = Array.isArray(logged?.listResponsability)
    ? logged.listResponsability
    : [];

  const allowedDispositiveOptions = useMemo(() => {
    const allDevices = enumsData?.dispositiveIndex || {};

    if (isRoot) {
      return buildModalFormOptionsFromIndex(allDevices, { onlyActive: true });
    }

    const allowedDeviceIds = new Set();
    const allowedProgramIds = new Set();

    responsabilities.forEach((r) => {
      if (r?.isProgramResponsible && r?.idProgram) {
        allowedProgramIds.add(String(r.idProgram));
      }

      if ((r?.isDeviceResponsible || r?.isDeviceCoordinator) && r?.dispositiveId) {
        allowedDeviceIds.add(String(r.dispositiveId));
      }
    });

    Object.entries(allDevices).forEach(([deviceId, device]) => {
      const programId = String(device?.program || "");
      if (allowedProgramIds.has(programId)) {
        allowedDeviceIds.add(String(deviceId));
      }
    });

    const filteredIndex = {};
    Object.entries(allDevices).forEach(([deviceId, device]) => {
      if (!allowedDeviceIds.has(String(deviceId))) return;
      if (device?.active === false) return;
      filteredIndex[deviceId] = device;
    });

    return buildModalFormOptionsFromIndex(filteredIndex, { onlyActive: true });
  }, [isRoot, responsabilities, enumsData]);

  const sepeDefault = offer?.sepe ? "si" : "no";
  const urlSepeDefault = offer?.urlSepe || "";
  const resolvedTypeDefault = resolveOfferTypeFront({
    sepe: offer?.sepe === true,
    urlSepe: normalizeUrlSepe(offer?.urlSepe),
    manualType: offer?.type || "",
  });

  // ===== Definición de campos =====
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
      options: allowedDispositiveOptions,
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
      defaultValue: sepeDefault,
      options: [
        { value: "si", label: "Sí" },
        { value: "no", label: "No" },
      ],
    },
    {
      name: "urlSepe",
      label: "URL del SEPE",
      type: "text",
      required: false,
      defaultValue: urlSepeDefault,
      isValid: (v, allValues) => {
        const sepe = toBool(allValues?.sepe);
        const url = normalizeUrlSepe(v);

        if (!sepe && url) return "La URL del SEPE solo debe informarse en ofertas SEPE.";
        if (sepe && url && !isValidHttpUrl(url)) return "La URL del SEPE no es válida.";
        return "";
      },
      placeholder: "https://...",
    },
    {
      type: "info",
      content:
        "Si la oferta es del SEPE, el tipo real se calculará automáticamente al guardar: sin URL será interna y con URL será pública.",
    },
    {
      name: "disability",
      label: "¿Es una oferta exclusiva para personas con discapacidad?",
      type: "select",
      required: true,
      defaultValue: offer?.disability ? "si" : "no",
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
      defaultValue: resolvedTypeDefault,
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

  // ===== Submit =====
  const handleSubmit = async (formData) => {
    try {
      charge?.(true);

      const newDispositiveId = asStr(formData.newDispositiveId || "");

      if (!isRoot) {
        const isAllowed = allowedDispositiveOptions.some(
          (opt) => String(opt.value) === String(newDispositiveId)
        );

        if (!isAllowed) {
          modal?.("Error", "No tienes permisos para crear o editar ofertas en ese dispositivo.");
          charge?.(false);
          return;
        }
      }

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

      const normalizedUrlSepe = normalizeUrlSepe(formData.urlSepe);
      const sepeValue = toBool(formData.sepe);

      if (!sepeValue && normalizedUrlSepe) {
        modal?.("Error", "La URL del SEPE solo puede usarse en ofertas marcadas como SEPE.");
        charge?.(false);
        return;
      }

      if (sepeValue && normalizedUrlSepe && !isValidHttpUrl(normalizedUrlSepe)) {
        modal?.("Error", "La URL del SEPE no es válida.");
        charge?.(false);
        return;
      }

      const resolvedType = resolveOfferTypeFront({
        sepe: sepeValue,
        urlSepe: normalizedUrlSepe,
        manualType: asStr(formData.type || ""),
      });

      const newValues = {
        jobId: asStr(formData.functions || ""),
        work_schedule: asStr(formData.work_schedule || ""),
        location: asStr(formData.location || ""),
        expected_incorporation_date: asStr(formData.expected_incorporation_date || ""),
        dispositive: { programId: newProgramId, newDispositiveId },
        programId: newProgramId,
        provinceId: newProvinceId,
        sepe: sepeValue,
        urlSepe: sepeValue ? normalizedUrlSepe : "",
        type: resolvedType,
        datecreate: isoDay(formData.datecreate),
        essentials_requirements: asStr(formData.essentials_requirements || ""),
        optionals_requirements: asStr(formData.optionals_requirements || ""),
        conditions: asStr(formData.conditions || ""),
        studiesId: Array.isArray(formData.studiesId) ? formData.studiesId.map(String) : [],
        disability: toBool(formData.disability),
      };

      const token = getToken();

      if (!isEditing) {
        const payload = {
          work_schedule: newValues.work_schedule,
          essentials_requirements: newValues.essentials_requirements,
          optionals_requirements: newValues.optionals_requirements,
          conditions: newValues.conditions,
          location: newValues.location,
          create: logged?.user?._id,
          expected_incorporation_date: newValues.expected_incorporation_date,
          programId: newValues.programId,
          newDispositiveId: newValues.dispositive.newDispositiveId,
          studiesId: newValues.studiesId,
          sepe: newValues.sepe,
          urlSepe: newValues.urlSepe || undefined,
          type: newValues.type,
          datecreate: newValues.datecreate,
          active: true,
          jobId: newValues.jobId,
          provinceId: newValues.provinceId,
          disability: newValues.disability,
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
        urlSepe: asStr(offer?.urlSepe ?? ""),
        type: asStr(offer?.type ?? ""),
        datecreate: isoDay(offer?.datecreate),
        essentials_requirements: asStr(offer?.essentials_requirements ?? ""),
        optionals_requirements: asStr(offer?.optionals_requirements ?? ""),
        conditions: asStr(offer?.conditions ?? ""),
        studiesId: Array.isArray(offer?.studiesId) ? offer.studiesId.map(String) : [],
        provinceId: asStr(offer?.provinceId ?? ""),
        disability: !!offer?.disability,
      };

      const patch = {};

      if (newValues.jobId && newValues.jobId !== curr.jobId) patch.jobId = newValues.jobId;
      if (newValues.work_schedule !== curr.work_schedule) patch.work_schedule = newValues.work_schedule;
      if (newValues.location !== curr.location) patch.location = newValues.location;
      if (newValues.expected_incorporation_date !== curr.expected_incorporation_date) {
        patch.expected_incorporation_date = newValues.expected_incorporation_date;
      }

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
      if (newValues.urlSepe !== curr.urlSepe) patch.urlSepe = newValues.urlSepe || "";
      if (newValues.disability !== curr.disability) patch.disability = newValues.disability;
      if (newValues.type !== curr.type) patch.type = newValues.type;
      if (newValues.datecreate !== curr.datecreate) patch.datecreate = newValues.datecreate;
      if (newValues.essentials_requirements !== curr.essentials_requirements) {
        patch.essentials_requirements = newValues.essentials_requirements;
      }
      if (newValues.optionals_requirements !== curr.optionals_requirements) {
        patch.optionals_requirements = newValues.optionals_requirements;
      }
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

  if (!isRoot && allowedDispositiveOptions.length === 0) {
    return (
      <ModalForm
        title={isEditing ? "Editar Oferta de Empleo" : "Crear Oferta de Empleo"}
        message="No tienes dispositivos disponibles para gestionar ofertas."
        fields={[]}
        onSubmit={closeModal}
        onClose={closeModal}
        modal={modal}
      />
    );
  }

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