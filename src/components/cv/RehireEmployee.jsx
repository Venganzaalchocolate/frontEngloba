import React, { useMemo } from 'react';
import ModalForm from '../globals/ModalForm';
import { validateDNIorNIE } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';

/* Utilidades */
const todayStr = () => new Date().toISOString().slice(0, 10);
const extractJobName = (s="") => s.split('-')[0]?.trim() || "";

/** Busca por nombre en jobsIndex y devuelve {id,label} (tolerante a acentos/guiones) */
function getIdLabelByName(name, jobsIndex) {
  if (!name || !jobsIndex) return null;
  const norm = (s) => String(s||"")
    .normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase().trim();

  const targetFull = norm(name);
  const targetBase = norm(name.split("-")[0]);

  const entries = Object.entries(jobsIndex);
  let m = entries.find(([, o]) => norm(o?.name) === targetFull)
       || entries.find(([, o]) => norm(o?.name) === targetBase)
       || entries.find(([, o]) => {
            const c = norm(o?.name);
            return c.startsWith(targetBase) || c.includes(targetBase);
          });
  if (!m) return null;
  const [id, obj] = m;
  return { id, label: obj.name };
}

export default function RehireEmployee({
  enumsEmployer,
  save = () => {},
  onClose,
  offer,
  lockedFields = ["device", "position"]
}) {
  // ViewModel derivado de props (sin estados intermedios)
  const vm = useMemo(() => {
    if (!enumsEmployer || !offer) return null;

    // DEVICE
    const deviceId = offer?.dispositive?.dispositiveId || "";
    // 1º intenta con programsIndex, 2º busca en programs/devices
    let deviceLabel =
      enumsEmployer?.programsIndex?.[deviceId]?.name || "";
    if (!deviceLabel && Array.isArray(enumsEmployer?.programs)) {
      const allDevices = enumsEmployer.programs.flatMap(p => p.devices || []);
      deviceLabel = allDevices.find(d => d._id === deviceId)?.name || "";
    }

    // POSITION (toma primero offer.functions; si no, prefijo de nameOffer)
    const baseName = offer?.functions || extractJobName(offer?.nameOffer || "");
    const pos = getIdLabelByName(baseName, enumsEmployer?.jobsIndex || {}) 
             || { id: "", label: baseName || "(Puesto)" };

    return {
      deviceId,
      deviceLabel: deviceLabel || "(Dispositivo)",
      positionId: pos.id,
      positionLabel: pos.label || "(Puesto)",
    };
  }, [enumsEmployer, offer]);

  const fields = useMemo(() => {
    if (!vm) return [];
    return [
      { name: "startDate", label: "Fecha Inicio", type: "date", required: true, defaultValue: todayStr() },
      { name: "deviceText", label: "Dispositivo", type: "text", defaultValue: vm.deviceLabel, readOnly: true, disabled: true },
      {
        name: "workShift", label: "Jornada", type: "select", required: true,
        disabled: lockedFields.includes("workShift"),
        options: [
          { value: "", label: "Seleccione" },
          { value: "completa", label: "Completa" },
          { value: "parcial", label: "Parcial" },
        ],
      },
      {
        name: "category", label: "Categoría", type: "select", required: true,
        disabled: lockedFields.includes("category"),
        options: [
          { value: "", label: "Seleccione" },
          { value: "1", label: "Categoría 1" },
          { value: "2", label: "Categoría 2" },
          { value: "3", label: "Categoría 3" },
        ],
      },
      { name: "positionText", label: "Cargo (puesto)", type: "text", defaultValue: vm.positionLabel, readOnly: true, disabled: true },
      {
        name: "reason", label: "DNI trabajador sustituido (si aplica)", type: "text",
        isValid: (v) => (v ? (validateDNIorNIE(v) ? "" : textErrors("dni")) : ""),
      },
    ];
  }, [vm, lockedFields]);

  const handleSubmit = async (formData) => {
    if (!vm?.positionId) {
      alert("No se ha podido resolver el puesto. Revisa el nombre en la oferta.");
      return;
    }
    const hiringNew = {
      startDate: formData.startDate,
      device: vm.deviceId,                     // id real al back
      workShift: { type: formData.workShift, nota: "" },
      category: formData.category || "",
      position: vm.positionId,                 // id real al back
      active: true,
      reason: { dni: formData.reason },
    };
    await save(hiringNew);
    onClose();
  };

  if (!vm || !fields.length) return null;

  return (
    <ModalForm
      title="Añadir Periodo de Contratación"
      message="Completa los siguientes campos"
      fields={fields}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
