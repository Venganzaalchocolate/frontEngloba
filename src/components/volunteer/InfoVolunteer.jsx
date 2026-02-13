import { useMemo, useState, useCallback, useEffect } from "react";
import styles from "../styles/infoEmployer.module.css";
import { FaSquarePlus } from "react-icons/fa6";

import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";

import { getToken } from "../../lib/serviceToken";
import { volunteerUpdate } from "../../lib/data";
import { buildModalFormOptionsFromIndex, formatDate } from "../../lib/utils.js";

import {
  validateDNIorNIE,
  validEmail,
  validNumber,
  validText,
} from "../../lib/valid";

import { textErrors } from "../../lib/textErrors";

// =========================
// CONSTS
// =========================
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

// =========================
// HELPERS
// =========================
const deepClone = (x) => JSON.parse(JSON.stringify(x || {}));

const toYMD = (v) => {
  if (!v) return "";
  const d = v instanceof Date ? v : new Date(v);
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

// computed active desde statusEvents (si el back no te manda doc.active)
const getComputedActive = (doc) => {
  if (typeof doc?.active === "boolean") return doc.active;

  const evs = Array.isArray(doc?.statusEvents) ? doc.statusEvents : [];
  const last = evs.length ? evs[evs.length - 1] : null;

  if (last?.type === "disable") return false;
  if (last?.type === "enable") return true;
  return true; // sin eventos => activo por defecto
};

const getLastStatus = (doc) => {
  if (doc?.lastStatus) return doc.lastStatus; // si el back te lo manda
  const evs = Array.isArray(doc?.statusEvents) ? doc.statusEvents : [];
  return evs.length ? evs[evs.length - 1] : null;
};

const isValidBirthDate = (v) => {
  if (!v) return false;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return false;
  return d <= new Date();
};


// =========================
// COMPONENT
// =========================
export default function InfoVolunteer({
  doc,
  modal,
  charge,
  enumsData,
  canEdit,
  onDocUpdated,
}) {
  // -------------------------
  // Normalización (ids puros)
  // -------------------------
  const normalized = useMemo(() => {
    const d = deepClone(doc);

    const programInterestIds = Array.isArray(d?.programInterest)
      ? d.programInterest.map((x) => x?._id || x).filter(Boolean)
      : [];

    const statusEvents = Array.isArray(d?.statusEvents) ? d.statusEvents : [];
    const activeComputed = getComputedActive(d);
    const lastStatus = getLastStatus(d);

    return {
      ...d,
      volunteerApplicationId: d?._id || "",
      gender: d?.gender || "",

      province: d?.province?._id || d?.province || "",
      studies: Array.isArray(d?.studies)
        ? d.studies.map((x) => x?._id || x).filter(Boolean)
        : [],
      programInterest: programInterestIds,

      areaInterest: Array.isArray(d?.areaInterest) ? d.areaInterest : [],
      occupation: Array.isArray(d?.occupation) ? d.occupation : [],

      // 👇 computed (no persistido)
      active: activeComputed,
      lastStatus,
      statusEvents,
    };
  }, [doc]);

  // -------------------------
  // Options
  // -------------------------
  const provincesOptions = useMemo(
    () => buildModalFormOptionsFromIndex(enumsData?.provincesIndex),
    [enumsData?.provincesIndex]
  );

  const studiesOptions = useMemo(() => {
    const idx = enumsData?.studiesIndex || {};
    return Object.entries(idx)
      .filter(([, v]) => v?.isSub || !v?.isRoot)
      .map(([id, v]) => ({ value: String(id), label: v?.name || String(id) }))
      .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
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

  const programsOptions = useMemo(() => {
    const idx=enumsData?.programsIndex || {};
    return Object.entries(idx)
    .map(([id, v]) => ({ value: String(id), label: v?.name || String(id) }))
    .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [enumsData?.programsIndex]);

 

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

  // -------------------------
  // Modales / estado UI
  // -------------------------
  const [openEdit, setOpenEdit] = useState(false);
  const [confirmCtx, setConfirmCtx] = useState(null);
  const [pendingPatch, setPendingPatch] = useState(null);

  useEffect(() => {
    setOpenEdit(false);
    setConfirmCtx(null);
    setPendingPatch(null);
  }, [normalized?.volunteerApplicationId]);

  // -------------------------
  // ModalForm fields (SIN active/disableAt/disabledReason)
  // -------------------------
  const buildEditFields = useCallback(() => {
    const d = normalized;

    return [
      { name: "section1", type: "section", label: `Solicitud: ${d.firstName || ""} ${d.lastName || ""}` },

      {
        name: "firstName",
        label: "Nombre",
        type: "text",
        required: true,
        defaultValue: d.firstName || "",
        isValid: (v) => (validText(v, 2, 120) ? "" : (textErrors("firstName") || textErrors("name") || "Nombre inválido")),
      },
      {
        name: "lastName",
        label: "Apellidos",
        type: "text",
        required: true,
        defaultValue: d.lastName || "",
        isValid: (v) => (validText(v, 2, 180) ? "" : (textErrors("lastName") || textErrors("name") || "Apellidos inválidos")),
      },
      {
        name: "birthDate",
        label: "Fecha de nacimiento",
        type: "date",
        required: true,
        defaultValue: toYMD(d.birthDate),
        isValid: (v) => (isValidBirthDate(v) ? "" : (textErrors("birthDate") || "Fecha inválida")),
      },
      {
        name: "gender",
        label: "Género",
        type: "select",
        required: true,
        defaultValue: GENDER_ENUM.includes(d.gender) ? d.gender : "",
        options: [{ value: "", label: "Selecciona..." }, ...GENDER_OPTIONS],
        isValid: (v) => (GENDER_ENUM.includes(String(v || "")) ? "" : "Género inválido"),
      },
      {
        name: "documentId",
        label: "DNI/NIE",
        type: "text",
        required: true,
        defaultValue: d.documentId || "",
        isValid: (v) => (validateDNIorNIE(v) ? "" : (textErrors("dni") || "DNI/NIE inválido")),
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true,
        defaultValue: d.email || "",
        isValid: (v) => (validEmail(v) ? "" : (textErrors("email") || "Email inválido")),
      },
      {
        name: "phone",
        label: "Teléfono",
        type: "text",
        required: true,
        defaultValue: d.phone || "",
        isValid: (v) => (validNumber(v) ? "" : (textErrors("phone") || "Teléfono inválido")),
      },

      {
        name: "province",
        label: "Provincia",
        type: "select",
        required: true,
        defaultValue: d.province || "",
        options: provincesOptions || [],
        isValid: (v) => (!!v ? "" : (textErrors("province") || "Provincia requerida")),
      },
      {
        name: "localidad",
        label: "Localidad",
        type: "text",
        required: true,
        defaultValue: d.localidad || "",
        isValid: (v) => (validText(v, 2, 120) ? "" : (textErrors("localidad") || "Localidad inválida")),
      },
      {
        name: "occupation",
        label: "Ocupación",
        type: "multiChips",
        required: true,
        defaultValue: Array.isArray(d.occupation) ? d.occupation : [],
        options: occupationOptions,
        isValid: (arr) => (Array.isArray(arr) && arr.length > 0 ? "" : (textErrors("occupation") || "Ocupación requerida")),
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

      {
        name: "availability",
        label: "Disponibilidad",
        type: "text",
        required: true,
        defaultValue: d.availability || "",
        isValid: (v) => (validText(v, 0, 2000) ? "" : (textErrors("availability") || "Campo inválido")),
      },


      {
        name: "areaInterest",
        label: "Áreas de interés",
        type: "multiChips",
        required: false, // 👈 OJO: puede estar vacío si programInterest existe
        defaultValue: Array.isArray(d.areaInterest) ? d.areaInterest : [],
        options: areaOptions,
        placeholder: "Busca y añade…",
      },
      {
        name: "programInterest",
        label: "Justificación en programas",
        type: "multiChips",
        required: false, 
        defaultValue: Array.isArray(d.programInterest) ? d.programInterest : [],
        options: programsOptions,
        placeholder: "Busca y añade…",
      },

      {
        name: "referralSource",
        label: "Cómo nos conoció",
        type: "text",
        required: true,
        defaultValue: d.referralSource || "",
        isValid: (v) => (validText(v, 2, 500) ? "" : (textErrors("referralSource") || "Campo inválido")),
      },
      { name: "userNote", label: "Nota de la persona (userNote)", type: "textarea", required: false, defaultValue: d.userNote || "" },
    ];
  }, [normalized, provincesOptions, occupationOptions, studiesOptions, areaOptions]);

  // -------------------------
  // Patch diff (SIN active/disableAt/disabledReason)
  // + valida: (programInterest o areaInterest)
  // -------------------------
  const computeDiffPatch = useCallback(
    (form) => {
      const base = normalized;

      const patch = {
        firstName: form.firstName,
        lastName: form.lastName,
        birthDate: form.birthDate || null,
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
        areaInterest: Array.isArray(form.areaInterest) ? form.areaInterest : [],
        programInterest:Array.isArray(form.programInterest) ? form.programInterest : [],

        referralSource: form.referralSource || "",
        userNote: form.userNote || "",
      };

      if (!(patch.occupation || []).includes("otro")) patch.occupationOtherText = "";

      if (!GENDER_ENUM.includes(String(patch.gender || ""))) {
        throw new Error("Debes indicar un género válido");
      }

      // ✅ Regla back: programInterest o areaInterest
      const nextAreas = patch.areaInterest ?? base.areaInterest ?? [];
      const basePrograms = Array.isArray(base.programInterest) ? base.programInterest : [];
      if ((!basePrograms || !basePrograms.length) && (!nextAreas || !nextAreas.length)) {
        throw new Error("Debes indicar programInterest o areaInterest");
      }

      const changed = {};
      for (const k of Object.keys(patch)) {
        const a = JSON.stringify(patch[k] ?? null);
        const b = JSON.stringify(base[k] ?? null);
        if (a !== b) changed[k] = patch[k];
      }

      return changed;
    },
    [normalized]
  );

  const handleSubmitEdit = useCallback(
    (form) => {
      try {
        // ✅ fuerza validación de todos los isValid (por si ModalForm no lo hace)
        const fields = buildEditFields();
        for (const f of fields) {
          if (typeof f?.isValid === "function") {
            const msg = f.isValid(form?.[f.name]);
            if (msg) throw new Error(msg);
          }
        }

        const diff = computeDiffPatch(form);

        if (!Object.keys(diff).length) {
          setOpenEdit(false);
          modal?.("Voluntariado", "No hay cambios que guardar");
          return;
        }

        setPendingPatch(diff);
        setOpenEdit(false);
        setConfirmCtx({
          message: "Vas a guardar cambios en la solicitud de voluntariado. ¿Deseas continuar?",
        });
      } catch (e) {
        modal?.("Error", e?.message || "No se pudo validar el formulario");
      }
    },
    [computeDiffPatch, modal, buildEditFields]
  );


  const doConfirmSave = useCallback(async () => {
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
      if (updated?.error) throw new Error(updated.message || "No se pudo actualizar");

      const fullDoc = updated?.data || updated;
      modal?.("Voluntariado", "Solicitud actualizada");
      onDocUpdated?.(fullDoc);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo actualizar");
    } finally {
      charge?.(false);
      setPendingPatch(null);
      setConfirmCtx(null);
    }
  }, [pendingPatch, normalized.volunteerApplicationId, charge, modal, onDocUpdated]);

  // -------------------------
  // UI: chips
  // -------------------------
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

  // status text (solo display)
  const statusText = useMemo(() => {
    const ls = normalized.lastStatus;
    if (!ls) return normalized.active ? "Activo" : "En baja";
    const d = ls.at ? new Date(ls.at) : null;
    const dateTxt = d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("es-ES") : "";
    const reasonTxt = ls.reason ? ` · ${ls.reason}` : "";
    const typeTxt = ls.type === "disable" ? "Baja" : "Alta";
    return `${typeTxt}${dateTxt ? ` (${dateTxt})` : ""}${reasonTxt}`;
  }, [normalized.active, normalized.lastStatus]);

  // =========================
  // Render
  // =========================
  return (
    <div className={styles.contenedor}>
      <h2>
        DATOS DE LA SOLICITUD
        <button onClick={() => setOpenEdit(true)}>Editar</button>

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
          value={normalized.birthDate ? new Date(normalized.birthDate).toLocaleDateString("es-ES") : ""}
          disabled
        />
      </div>

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
        <label>Justificación en programas</label>
        <Chips values={normalized.programInterest || []} options={programsOptions} />
      </div>

      <div>
        <label>Cómo nos conoció</label>
        <input value={normalized.referralSource || ""} disabled />
      </div>
 <div>
        
        <label>Alta/Baja</label>
        <ul className={styles.estados}>
          {normalized.statusEvents.map((x)=>{
            return <li className={x?.type=="enable"?styles.chipAlta:styles.chipBaja}>
              <p >{x?.type=="enable"?'Alta':'Baja'}{': '}{formatDate(x?.at)}</p>
              {x?.type!="enable" && <p>Motivo: {x?.reason}</p>}
            </li>
          })}
        </ul>
      </div>
      { normalized?.userNote &&
      <div className={styles.notaVoluntario}>
        <label>Nota de la persona (userNote)</label>
        <p>{normalized.userNote}</p>
      </div>

      }
      

     

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
