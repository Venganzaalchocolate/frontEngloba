
import { useMemo, useState, useCallback, useEffect } from "react";
import styles from "../styles/infoEmployer.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { getToken } from "../../lib/serviceToken";
import { volunteerUpdate } from "../../lib/data";
import { buildModalFormOptionsFromIndex } from "../../lib/utils.js";

// ✅ Ahora SOLO áreas (sin programas)
const PROGRAM_AREA_ENUM = [
  "igualdad",
  "desarrollo comunitario",
  "lgtbiq",
  "infancia y juventud",
  "personas con discapacidad",
  "mayores",
  "migraciones",
  "no identificado",
];

const OCCUPATION_FALLBACK = [
  "estudiando",
  "trabajando_media_jornada",
  "trabajando_jornada_completa",
  "jubilado",
  "otro",
];

const GENDER_ENUM = ["male", "female", "others", "nonBinary"];
const GENDER_OPTIONS = [
  { value: "male", label: "Masculino" },
  { value: "female", label: "Femenino" },
  { value: "others", label: "Otros" },
  { value: "nonBinary", label: "No binario" },
];

const deepClone = (x) => JSON.parse(JSON.stringify(x || {}));

const toYMD = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const pretty = (s) =>
  String(s || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const optionsToLabelMap = (opts) =>
  new Map((opts || []).map((o) => [String(o.value), o.label]));

const genderLabel = (g) => {
  const hit = GENDER_OPTIONS.find((x) => x.value === g);
  return hit?.label || "—";
};

export default function InfoVolunteer({
  doc,
  modal,
  charge,
  enumsData,
  canEdit,
  onUpdated,
}) {
  // =========================
  // Normalizado (ids puros)
  // =========================
  const normalized = useMemo(() => {
    const d = deepClone(doc);

    return {
      ...d,
      volunteerApplicationId: d?._id,
      gender: d?.gender || "", // ✅ nuevo
      province: d?.province?._id || d?.province || "",
      studies: Array.isArray(d?.studies)
        ? d.studies.map((x) => x?._id || x).filter(Boolean)
        : [],
      areaInterest: Array.isArray(d?.areaInterest) ? d.areaInterest : [],
      occupation: Array.isArray(d?.occupation) ? d.occupation : [],
    };
  }, [doc?._id]);

  // =========================
  // Options (para ModalForm + labels chips)
  // =========================
  const provincesOptions = useMemo(
    () => buildModalFormOptionsFromIndex(enumsData?.provincesIndex),
    [enumsData?.provincesIndex]
  );

  const studiesOptions = useMemo(() => {
    const idx = enumsData?.studiesIndex || {};
    return Object.entries(idx)
      .filter(([, v]) => v?.isSub || !v?.isRoot)
      .map(([id, v]) => ({ value: String(id), label: v?.name || String(id) }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "es", { sensitivity: "base" })
      );
  }, [enumsData?.studiesIndex]);

  const occupationOptions = useMemo(() => {
    const list = Array.isArray(enumsData?.volunteerOccupation)
      ? enumsData.volunteerOccupation
      : OCCUPATION_FALLBACK;
    return list.map((x) => ({ value: String(x), label: pretty(x) }));
  }, [enumsData?.volunteerOccupation]);

  const areaOptions = useMemo(
    () => PROGRAM_AREA_ENUM.map((x) => ({ value: String(x), label: pretty(x) })),
    []
  );

  const provinceLabel = useMemo(() => {
    const idx = enumsData?.provincesIndex || {};
    const hit = idx?.[normalized.province];
    return hit?.name || "";
  }, [enumsData?.provincesIndex, normalized.province]);

  const toLabels = useCallback((values, options) => {
    const map = optionsToLabelMap(options);
    return (Array.isArray(values) ? values : [])
      .map((v) => map.get(String(v)) || String(v))
      .filter(Boolean);
  }, []);

  // =========================
  // Modales
  // =========================
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmCtx, setConfirmCtx] = useState(null); // { message }
  const [pendingPatch, setPendingPatch] = useState(null);

  useEffect(() => {
    setOpenEdit(false);
    setConfirmCtx(null);
    setPendingPatch(null);
  }, [normalized?.volunteerApplicationId]);

  const buildEditFields = useCallback(() => {
    const d = normalized;

    return [
      {
        name: "section1",
        type: "section",
        label: `Solicitud: ${d.firstName || ""} ${d.lastName || ""}`,
      },

      { name: "firstName", label: "Nombre", type: "text", required: true, defaultValue: d.firstName || "" },
      { name: "lastName", label: "Apellidos", type: "text", required: true, defaultValue: d.lastName || "" },
      { name: "birthDate", label: "Fecha de nacimiento", type: "date", required: true, defaultValue: toYMD(d.birthDate) },

      // ✅ NUEVO: Género
      {
        name: "gender",
        label: "Género",
        type: "select",
        required: true,
        defaultValue: GENDER_ENUM.includes(d.gender) ? d.gender : "",
        options: [{ value: "", label: "Selecciona..." }, ...GENDER_OPTIONS],
      },

      { name: "documentId", label: "DNI/NIE", type: "text", required: true, defaultValue: d.documentId || "" },
      { name: "email", label: "Email", type: "text", required: true, defaultValue: d.email || "" },
      { name: "phone", label: "Teléfono", type: "text", required: true, defaultValue: d.phone || "" },

      { name: "province", label: "Provincia", type: "select", required: true, defaultValue: d.province || "", options: provincesOptions || [] },
      { name: "localidad", label: "Localidad", type: "text", required: true, defaultValue: d.localidad || "" },

      {
        name: "occupation",
        label: "Ocupación",
        type: "multiChips",
        required: true,
        defaultValue: Array.isArray(d.occupation) ? d.occupation : [],
        options: occupationOptions,
        placeholder: "Busca y añade una o varias…",
      },
      { name: "occupationOtherText", label: "Ocupación (otro)", type: "text", required: false, defaultValue: d.occupationOtherText || "" },

      {
        name: "studies",
        label: "Estudios",
        type: "multiChips",
        required: false,
        defaultValue: Array.isArray(d.studies) ? d.studies : [],
        options: studiesOptions || [],
        placeholder: "Busca y añade…",
      },
      { name: "studiesOtherText", label: "Estudios (otro)", type: "text", required: false, defaultValue: d.studiesOtherText || "" },

      { name: "availability", label: "Disponibilidad", type: "text", required: true, defaultValue: d.availability || "" },

      // ✅ Quitado: programInterest
      {
        name: "areaInterest",
        label: "Áreas de interés",
        type: "multiChips",
        required: true, // ✅ ahora debe haber áreas
        defaultValue: Array.isArray(d.areaInterest) ? d.areaInterest : [],
        options: areaOptions,
        placeholder: "Busca y añade…",
      },

      { name: "referralSource", label: "Cómo nos conoció", type: "text", required: true, defaultValue: d.referralSource || "" },
      { name: "userNote", label: "Nota de la persona (userNote)", type: "textarea", required: false, defaultValue: d.userNote || "" },

      {
        name: "active",
        label: "Activo",
        type: "select",
        required: true,
        defaultValue: d.active ? "true" : "false",
        options: [
          { value: "true", label: "Sí" },
          { value: "false", label: "No" },
        ],
      },
      { name: "disableAt", label: "DisableAt", type: "date", required: false, defaultValue: toYMD(d.disableAt) },
      { name: "disabledReason", label: "Motivo desactivación", type: "textarea", required: false, defaultValue: d.disabledReason || "" },
    ];
  }, [normalized, provincesOptions, occupationOptions, studiesOptions, areaOptions]);

  const computeDiffPatch = (form) => {
    const base = normalized;

    const patch = {
      firstName: form.firstName,
      lastName: form.lastName,
      birthDate: form.birthDate || null,

      // ✅ nuevo
      gender: form.gender,

      documentId: form.documentId,
      email: form.email,
      phone: form.phone,
      province: form.province,
      localidad: form.localidad,

      occupation: Array.isArray(form.occupation) ? form.occupation : [],
      occupationOtherText: form.occupationOtherText || "",

      studies: Array.isArray(form.studies) ? form.studies : [],
      studiesOtherText: form.studiesOtherText || "",

      availability: form.availability || "",

      // ✅ solo áreas
      areaInterest: Array.isArray(form.areaInterest) ? form.areaInterest : [],

      referralSource: form.referralSource || "",
      userNote: form.userNote || "",

      active: form.active === "true",
      disableAt: form.disableAt || null,
      disabledReason: form.disabledReason || "",
    };

    if (!(patch.occupation || []).includes("otro")) patch.occupationOtherText = "";

    // ✅ regla negocio: debe haber áreas
    const nextAreas = patch.areaInterest ?? base.areaInterest ?? [];
    if (!nextAreas || !nextAreas.length) {
      throw new Error("Debes indicar areaInterest");
    }

    // ✅ validación género
    if (!GENDER_ENUM.includes(String(patch.gender || ""))) {
      throw new Error("Debes indicar un género válido");
    }

    // diff real
    const changed = {};
    for (const k of Object.keys(patch)) {
      const a = JSON.stringify(patch[k] ?? null);
      const b = JSON.stringify(base[k] ?? null);
      if (a !== b) changed[k] = patch[k];
    }
    return changed;
  };

  const handleSubmitEdit = (form) => {
    try {
      const diff = computeDiffPatch(form);

      if (!Object.keys(diff).length) {
        setOpenEdit(false);
        modal?.("Voluntariado", "No hay cambios que guardar");
        return;
      }

      setPendingPatch(diff);
      setOpenEdit(false);
      setConfirmCtx({
        message:
          "Vas a guardar cambios en la solicitud de voluntariado. ¿Deseas continuar?",
      });
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo validar el formulario");
    }
  };

  const doConfirmSave = async () => {
    if (!pendingPatch) {
      setConfirmCtx(null);
      return;
    }

    try {
      charge?.(true);
      const token = getToken();

      const payload = {
        volunteerApplicationId: normalized.volunteerApplicationId,
        ...pendingPatch,
      };

      const updated = await volunteerUpdate(payload, token);
      if (updated?.error)
        throw new Error(updated.message || "No se pudo actualizar");

      modal?.("Voluntariado", "Solicitud actualizada");
      onUpdated?.(updated);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo actualizar");
    } finally {
      charge?.(false);
      setPendingPatch(null);
      setConfirmCtx(null);
    }
  };

  // =========================
  // Render helpers (chips)
  // =========================
  const Chips = ({ values, options }) => {
    const labels = toLabels(values, options);
    return (
      <div className={styles.multiChipsWrap}>
        {labels.map((txt) => (
          <span key={txt} className={styles.chip}>
            {txt}
          </span>
        ))}
        {labels.length === 0 && <span className={styles.muted}>—</span>}
      </div>
    );
  };

  // =========================
  // Render (solo lectura)
  // =========================
  return (
    <div className={styles.contenedor}>
      <h2>
        DATOS DE LA SOLICITUD
        {canEdit && (
          <FaSquarePlus
            title="Editar solicitud"
            style={{ cursor: "pointer", marginLeft: 10 }}
            onClick={() => setOpenEdit(true)}
          />
        )}
      </h2>

      <div>
        <label>Nombre</label>
        <input value={normalized.firstName || ""} disabled />
      </div>

      <div>
        <label>Apellidos</label>
        <input value={normalized.lastName || ""} disabled />
      </div>

      <div>
        <label>Fecha de nacimiento</label>
        <input
          value={
            normalized.birthDate
              ? new Date(normalized.birthDate).toLocaleDateString("es-ES")
              : ""
          }
          disabled
        />
      </div>

      {/* ✅ NUEVO */}
      <div>
        <label>Género</label>
        <input value={genderLabel(normalized.gender)} disabled />
      </div>

      <div>
        <label>DNI/NIE</label>
        <input value={normalized.documentId || ""} disabled />
      </div>

      <div>
        <label>Email</label>
        <input value={normalized.email || ""} disabled />
      </div>

      <div>
        <label>Teléfono</label>
        <input value={normalized.phone || ""} disabled />
      </div>

      <div>
        <label>Provincia</label>
        <input value={provinceLabel || ""} disabled />
      </div>

      <div>
        <label>Localidad</label>
        <input value={normalized.localidad || ""} disabled />
      </div>

      <div>
        <label>Ocupación</label>
        <Chips values={normalized.occupation || []} options={occupationOptions} />
      </div>

      {(normalized.occupation || []).includes("otro") && (
        <div>
          <label>Ocupación (otro)</label>
          <input value={normalized.occupationOtherText || ""} disabled />
        </div>
      )}

      <div>
        <label>Estudios</label>
        <Chips values={normalized.studies || []} options={studiesOptions} />
      </div>

      <div>
        <label>Estudios (otro)</label>
        <input value={normalized.studiesOtherText || ""} disabled />
      </div>

      <div>
        <label>Disponibilidad</label>
        <input value={normalized.availability || ""} disabled />
      </div>

      <div>
        <label>Áreas de interés</label>
        <Chips values={normalized.areaInterest || []} options={areaOptions} />
      </div>

      <div>
        <label>Cómo nos conoció</label>
        <input value={normalized.referralSource || ""} disabled />
      </div>

      <div>
        <label>Nota de la persona (userNote)</label>
        <input value={normalized.userNote || ""} disabled />
      </div>

      <div>
        <label>Activo</label>
        <input value={normalized.active ? "Sí" : "No"} disabled />
      </div>

      {normalized.disableAt && (
        <div>
          <label>DisableAt</label>
          <input
            value={new Date(normalized.disableAt).toLocaleDateString("es-ES")}
            disabled
          />
        </div>
      )}

      {!!normalized.disabledReason && (
        <div>
          <label>Motivo desactivación</label>
          <input value={normalized.disabledReason} disabled />
        </div>
      )}

      {/* ===== Modales ===== */}
      {openEdit && (
        <ModalForm
          title="Editar solicitud de voluntariado"
          message="Modifica los campos necesarios"
          fields={buildEditFields()}
          onSubmit={handleSubmitEdit}
          onClose={() => setOpenEdit(false)}
          modal={modal}
        />
      )}

      {confirmCtx && (
        <ModalConfirmation
          title="Confirmar cambios"
          message={confirmCtx.message}
          onConfirm={doConfirmSave}
          onCancel={() => {
            setConfirmCtx(null);
            setPendingPatch(null);
          }}
        />
      )}
    </div>
  );
}

