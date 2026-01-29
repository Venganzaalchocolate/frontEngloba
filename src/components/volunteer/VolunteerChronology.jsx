import { useMemo, useState, useCallback } from "react";
import styles from "../styles/volunteerchronology.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { getToken } from "../../lib/serviceToken";
import { buildModalFormOptionsFromIndex } from "../../lib/utils.js";

import {
  volunteerChronologyAdd,
  volunteerChronologyUpdate,
  volunteerChronologyDelete,
} from "../../lib/data";

// =========================
// CONSTS / HELPERS
// =========================
const toYMD = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const fmt = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "—");

const isValidObjectId = (s) =>
  typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);

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

const pretty = (s) =>
  String(s || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());

const optionsToLabelMap = (opts) =>
  new Map((opts || []).map((o) => [String(o.value), o.label]));

// normaliza a array de ObjectId string (admite [{_id}], ["id"], "id")
const normalizeIdsArray = (value) => {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map((x) => (x && typeof x === "object" ? x?._id : x))
    .map((x) => String(x || "").trim())
    .filter((x) => isValidObjectId(x));
};

const normalizeAreas = (arr) =>
  (Array.isArray(arr) ? arr : [])
    .map((x) => String(x || "").trim())
    .filter(Boolean);

export default function VolunteerChronology({
  doc,
  modal,
  charge,
  enumsData,
  onDocUpdated, // ✅ estándar
}) {
  // -------------------------
  // ids / source of truth
  // -------------------------
  const volunteerApplicationId = useMemo(() => String(doc?._id || ""), [doc?._id]);

  const chronology = useMemo(() => {
    const arr = Array.isArray(doc?.chronology) ? doc.chronology : [];
    // ordena DESC por startAt
    return [...arr].sort((a, b) => new Date(b?.startAt || 0) - new Date(a?.startAt || 0));
  }, [doc?.chronology]);

  // -------------------------
  // Options
  // -------------------------
  const provincesOptions = useMemo(
    () => buildModalFormOptionsFromIndex(enumsData?.provincesIndex),
    [enumsData?.provincesIndex]
  );

  const areaOptions = useMemo(
    () => PROGRAM_AREA_ENUM.map((x) => ({ value: String(x), label: pretty(x) })),
    []
  );

  const dispositivesOptions = useMemo(() => {
    const idx = enumsData?.dispositiveIndex || {};
    return Object.entries(idx)
      .map(([id, v]) => {
        const programId = v?.program ? String(v.program) : null;
        const p = programId ? enumsData?.programsIndex?.[programId] : null;
        const tag = p?.acronym ? ` (${p.acronym})` : p?.name ? ` (${p.name})` : "";
        return { value: String(id), label: `${v?.name || String(id)}${tag}` };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es", { sensitivity: "base" }));
  }, [enumsData?.dispositiveIndex, enumsData?.programsIndex]);

  const toLabels = useCallback((values, options) => {
    const map = optionsToLabelMap(options);
    return (Array.isArray(values) ? values : [])
      .map((v) => map.get(String(v)) || String(v))
      .filter(Boolean);
  }, []);

  // -------------------------
  // UI state
  // -------------------------
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const openCreate = useCallback(() => {
    if (!isValidObjectId(volunteerApplicationId)) {
      modal?.("Error", "volunteerApplicationId no válido");
      return;
    }
    setCreateOpen(true);
  }, [volunteerApplicationId, modal]);

  // -------------------------
  // Modal fields
  // -------------------------
  const createFields = useMemo(
    () => [
      { name: "section1", type: "section", label: "Añadir entrada a cronología" },

      { name: "startAt", label: "Fecha de inicio", type: "date", required: true },
      { name: "endAt", label: "Fecha de fin", type: "date", required: false },

      {
        name: "dispositives",
        label: "Dispositivos (opcional)",
        type: "multiChips",
        required: false,
        defaultValue: [],
        options: dispositivesOptions || [],
        placeholder: "Busca y añade…",
      },

      {
        name: "provinces",
        label: "Provincias",
        type: "multiChips",
        required: false,
        defaultValue: [],
        options: provincesOptions || [],
        placeholder: "Busca y añade…",
      },

      {
        name: "areas",
        label: "Áreas",
        type: "multiChips",
        required: false,
        defaultValue: [],
        options: areaOptions,
        placeholder: "Busca y añade…",
      },

      { name: "hours", label: "Horas", type: "number", defaultValue: "0" },
      { name: "notes", label: "Notas", type: "textarea", required: false, defaultValue: "" },
    ],
    [dispositivesOptions, provincesOptions, areaOptions]
  );

  const editFields = useMemo(() => {
    if (!editItem) return [];

    const d = editItem;

    const defaultDispositives = normalizeIdsArray(d?.dispositives ?? d?.dispositive);
    const defaultProvinces = normalizeIdsArray(d?.provinces ?? d?.province);
    const defaultAreas = Array.isArray(d?.areas) ? d.areas.map(String) : [];

    return [
      { name: "section1", type: "section", label: "Editar entrada de cronología" },

      { name: "startAt", label: "Fecha de inicio", type: "date", required: true, defaultValue: toYMD(d?.startAt) },
      { name: "endAt", label: "Fecha de fin", type: "date", required: false, defaultValue: toYMD(d?.endAt) },

      {
        name: "dispositives",
        label: "Dispositivos (opcional)",
        type: "multiChips",
        required: false,
        defaultValue: defaultDispositives,
        options: dispositivesOptions || [],
        placeholder: "Busca y añade…",
      },

      {
        name: "provinces",
        label: "Provincias",
        type: "multiChips",
        required: false,
        defaultValue: defaultProvinces,
        options: provincesOptions || [],
        placeholder: "Busca y añade…",
      },

      {
        name: "areas",
        label: "Áreas",
        type: "multiChips",
        required: false,
        defaultValue: defaultAreas,
        options: areaOptions,
        placeholder: "Busca y añade…",
      },

      {
        name: "hours",
        label: "Horas",
        type: "number",
        defaultValue: d?.hours === 0 || d?.hours ? String(d.hours) : "0",
      },
      { name: "notes", label: "Notas", type: "textarea", required: false, defaultValue: d?.notes || "" },
    ];
  }, [editItem, dispositivesOptions, provincesOptions, areaOptions]);

  // -------------------------
  // Validations
  // -------------------------
  const validateDates = (startAt, endAt) => {
    const s = startAt ? new Date(startAt) : null;
    const e = endAt ? new Date(endAt) : null;
    if (!s || Number.isNaN(s.getTime())) throw new Error("startAt inválida");
    if (e && Number.isNaN(e.getTime())) throw new Error("endAt inválida");
    if (s && e && e < s) throw new Error("La fecha de fin no puede ser anterior al inicio");
  };

  const validateEntry = (form) => {
    const d = Array.isArray(form.dispositives) ? form.dispositives : [];
    const p = Array.isArray(form.provinces) ? form.provinces : [];
    const a = Array.isArray(form.areas) ? form.areas : [];
    if (!d.length && !p.length && !a.length) {
      throw new Error("Indica al menos un dispositivo, una provincia o un área");
    }
  };

  // -------------------------
  // API calls (esperan doc completo)
  // -------------------------
  const handleCreate = async (form) => {
    if (isBusy) return;          // ✅ evita doble submit
  setIsBusy(true);             // ✅ ponlo lo antes posible
    try {
      validateDates(form.startAt, form.endAt);
      validateEntry(form);

      const hoursNum = Number(form.hours);
      if (Number.isNaN(hoursNum) || hoursNum < 0) throw new Error("Horas no válidas");


      charge?.(true);

      const token = getToken();

      const payload = {
        volunteerApplicationId,
        startAt: form.startAt,
        endAt: form.endAt || null,
        dispositives: normalizeIdsArray(form.dispositives),
        provinces: normalizeIdsArray(form.provinces),
        areas: normalizeAreas(form.areas),
        hours: hoursNum,
        notes: form.notes || "",
      };

      const res = await volunteerChronologyAdd(payload, token);
      if (res?.error) throw new Error(res.message || "No se pudo añadir la entrada");

      const fullDoc = res?.data || res; // ✅ doc completo
      setCreateOpen(false);
      modal?.("Cronología", "Entrada añadida");
      onDocUpdated?.(fullDoc);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo añadir");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  const handleEdit = async (form) => {
    if (isBusy) return;          // ✅ evita doble submit
  setIsBusy(true);             // ✅ ponlo lo antes posible
    try {
      if (!editItem) return;

      validateDates(form.startAt, form.endAt);
      validateEntry(form);

      const hoursNum = Number(form.hours);
      if (Number.isNaN(hoursNum) || hoursNum < 0) throw new Error("Horas no válidas");

      const chronologyId = String(editItem?._id || "");
      if (!isValidObjectId(chronologyId)) throw new Error("chronologyId no válido");


      charge?.(true);

      const token = getToken();

      const payload = {
        volunteerApplicationId,
        chronologyId,
        startAt: form.startAt,
        endAt: form.endAt || null,
        dispositives: normalizeIdsArray(form.dispositives),
        provinces: normalizeIdsArray(form.provinces),
        areas: normalizeAreas(form.areas),
        hours: hoursNum,
        notes: form.notes || "",
      };

      const res = await volunteerChronologyUpdate(payload, token);
      if (res?.error) throw new Error(res.message || "No se pudo actualizar");

      const fullDoc = res?.data || res; // ✅ doc completo
      setEditItem(null);
      modal?.("Cronología", "Entrada actualizada");
      onDocUpdated?.(fullDoc);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo actualizar");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  const doDelete = async () => {
    if (isBusy) return;          // ✅ evita doble submit
  setIsBusy(true);             // ✅ ponlo lo antes posible
    try {
      const item = confirmDelete;
      if (!item) return;

      const chronologyId = String(item?._id || "");
      if (!isValidObjectId(chronologyId)) throw new Error("chronologyId no válido");

      setIsBusy(true);
      charge?.(true);

      const token = getToken();
      const payload = { volunteerApplicationId, chronologyId };

      const res = await volunteerChronologyDelete(payload, token);
      if (res?.error) throw new Error(res.message || "No se pudo eliminar");

      const fullDoc = res?.data || res; // ✅ doc completo
      setConfirmDelete(null);
      modal?.("Cronología", "Entrada eliminada");
      onDocUpdated?.(fullDoc);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo eliminar");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  // -------------------------
  // Chips renderer
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

  const iconClass = `${styles.icon} ${isBusy ? styles.disabled : ""}`;

  // =========================
  // Render
  // =========================
  return (
    <div className={styles.contenedor}>
      <h2 className={styles.title}>
        CRONOLOGÍA
          <FaSquarePlus
            title="Añadir entrada"
            className={iconClass}
            onClick={() => !isBusy && openCreate()}
          />

      </h2>

      {chronology.length === 0 && (
        <p className={styles.empty}>No existen registros.</p>
      )}

      {chronology.length > 0 && (
        <ul className={styles.ulCronologia}>
          {chronology.map((it) => {
            const id = String(it?._id || "");
            const dispositives = normalizeIdsArray(it?.dispositives ?? it?.dispositive);
            const provinces = normalizeIdsArray(it?.provinces ?? it?.province);
            const areas = Array.isArray(it?.areas) ? it.areas.map(String) : [];

            return (
              <li key={id || `${it?.startAt || ""}`} className={styles.itemchronology}>
                <div className={styles.rowchronology}>
                  <div className={styles.mainchronology}>
                    <div className={styles.metaLinechronology}>
                      <span>Inicio: {fmt(it?.startAt)}</span>
                      <span>Fin: {fmt(it?.endAt)}</span>
                      <span>Horas: {Number(it?.hours || 0)}</span>
                    </div>

                    <div className={styles.blockchronology}>
                      <div className={styles.blockTitlechronology}>Dispositivos (opcional)</div>
                      <Chips values={dispositives} options={dispositivesOptions} />
                    </div>

                    <div className={styles.blockchronology}>
                      <div className={styles.blockTitlechronology}>Provincias</div>
                      <Chips values={provinces} options={provincesOptions} />
                    </div>

                    <div className={styles.blockchronology}>
                      <div className={styles.blockTitlechronology}>Áreas</div>
                      <Chips values={areas} options={areaOptions} />
                    </div>

                    {!!it?.notes && <div className={styles.noteschronology}>{it.notes}</div>}
                  </div>

                    <div className={styles.actionschronology}>
                      <FaEdit
                        title="Editar"
                        className={iconClass}
                        onClick={() => !isBusy && setEditItem(it)}
                      />
                      <FaTrashAlt
                        title="Eliminar"
                        className={iconClass}
                        onClick={() => !isBusy && setConfirmDelete(it)}
                      />
                    </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {createOpen && (
        <ModalForm
          title="Añadir entrada de cronología"
          message="Completa los campos"
          fields={createFields}
          onSubmit={handleCreate}
          onClose={() => setCreateOpen(false)}
          modal={modal}
        />
      )}

      {editItem && (
        <ModalForm
          title="Editar entrada de cronología"
          message="Modifica los campos necesarios"
          fields={editFields}
          onSubmit={handleEdit}
          onClose={() => setEditItem(null)}
          modal={modal}
        />
      )}

      {confirmDelete && (
        <ModalConfirmation
          title="Eliminar entrada"
          message="¿Seguro que deseas eliminar esta entrada de la cronología?"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
