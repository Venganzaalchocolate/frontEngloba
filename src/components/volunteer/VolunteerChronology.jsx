import { useMemo, useState, useCallback, useEffect } from "react";
import styles from "../styles/volunteerchronology.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { getToken } from "../../lib/serviceToken";

// 👉 estas 3 funciones en ../../lib/data
import {
  volunteerChronologyAdd,
  volunteerChronologyUpdate,
  volunteerChronologyDelete,
} from "../../lib/data";

const deepClone = (x) => JSON.parse(JSON.stringify(x || {}));

const toYMD = (iso) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
};

const fmt = (d) => (d ? new Date(d).toLocaleDateString("es-ES") : "—");

const isValidObjectId = (s) =>
  typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);

export default function VolunteerChronology({
  doc,
  modal,
  charge,
  enumsData,
  onUpdated,
}) {
  const volunteerApplicationId = useMemo(
    () => String(doc?._id || ""),
    [doc?._id]
  );

  // -------- local state (lista) --------
  const [items, setItems] = useState(() => deepClone(doc?.chronology || []));

  useEffect(() => {
    setItems(deepClone(doc?.chronology || []));
  }, [doc?.chronology]);

  const sortedItems = useMemo(() => {
    const arr = Array.isArray(items) ? [...items] : [];
    // ✅ schema: startAt
    arr.sort((a, b) => new Date(b?.startAt || 0) - new Date(a?.startAt || 0));
    return arr;
  }, [items]);

  // -------- device options --------
  const deviceOptions = useMemo(() => {
    const idx = enumsData?.dispositiveIndex || {};
    return Object.entries(idx)
      .map(([id, v]) => ({
        value: String(id),
        label: v?.name ? v.name : String(id),
      }))
      .sort((a, b) =>
        a.label.localeCompare(b.label, "es", { sensitivity: "base" })
      );
  }, [enumsData?.dispositiveIndex]);

  const deviceLabel = useCallback(
    (deviceId) => {
      const d = enumsData?.dispositiveIndex?.[String(deviceId)];
      if (!d) return String(deviceId || "—");
      const programId = d?.program;
      const p = programId ? enumsData?.programsIndex?.[String(programId)] : null;
      const tag = p?.acronym ? ` (${p.acronym})` : p?.name ? ` (${p.name})` : "";
      return `${d?.name || "Dispositivo"}${tag}`;
    },
    [enumsData?.dispositiveIndex, enumsData?.programsIndex]
  );

  // -------- modals state --------
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const openCreate = () => {
    if (!isValidObjectId(volunteerApplicationId)) {
      modal?.("Error", "volunteerApplicationId no válido");
      return;
    }
    setCreateOpen(true);
  };

  // ✅ schema: startAt/endAt/dispositive/hours/notes
  const createFields = useMemo(() => {
    return [
      { name: "section1", type: "section", label: "Añadir entrada a cronología" },
      { name: "startAt", label: "Fecha de inicio", type: "date", required: true },
      {
        name: "dispositive",
        label: "Dispositivo",
        type: "select",
        required: true,
        options: deviceOptions,
      },
      { name: "hours", label: "Horas", type: "number", defaultValue: "0" },
      { name: "notes", label: "Notas", type: "textarea", required: false, defaultValue: "" },
    ];
  }, [deviceOptions]);

  const editFields = useMemo(() => {
    if (!editItem) return [];
    return [
      { name: "section1", type: "section", label: "Editar entrada de cronología" },
      {
        name: "startAt",
        label: "Fecha de inicio",
        type: "date",
        required: true,
        defaultValue: toYMD(editItem?.startAt),
      },
      {
        name: "endAt",
        label: "Fecha de fin",
        type: "date",
        required: false,
        defaultValue: toYMD(editItem?.endAt),
      },
      {
        name: "dispositive",
        label: "Dispositivo",
        type: "select",
        required: true,
        defaultValue: String(editItem?.dispositive?._id || editItem?.dispositive || ""),
        options: deviceOptions,
      },
      {
        name: "hours",
        label: "Horas",
        type: "number",
        defaultValue:
          editItem?.hours === 0 || editItem?.hours ? String(editItem.hours) : "0",
      },
      {
        name: "notes",
        label: "Notas",
        type: "textarea",
        required: false,
        defaultValue: editItem?.notes || "",
      },
    ];
  }, [editItem, deviceOptions]);

  const validateDates = (startAt, endAt) => {
    const s = startAt ? new Date(startAt) : null;
    const e = endAt ? new Date(endAt) : null;
    if (!s || Number.isNaN(s.getTime())) throw new Error("startAt inválida");
    if (e && Number.isNaN(e.getTime())) throw new Error("endAt inválida");
    if (s && e && e < s)
      throw new Error("La fecha de fin no puede ser anterior al inicio");
  };

  const handleCreate = async (form) => {
    try {
      validateDates(form.startAt, form.endAt);

      if (!isValidObjectId(String(form.dispositive || ""))) {
        modal?.("Falta dato", "Selecciona un dispositivo válido");
        return;
      }

      const hoursNum = Number(form.hours);
      if (Number.isNaN(hoursNum) || hoursNum < 0) {
        modal?.("Error", "Horas no válidas");
        return;
      }

      setIsBusy(true);
      charge?.(true);

      const token = getToken();
      const payload = {
        volunteerApplicationId,
        startAt: form.startAt,
        endAt: form.endAt || null,
        dispositive: form.dispositive,
        hours: hoursNum,
        notes: form.notes || "",
      };

      const res = await volunteerChronologyAdd(payload, token);
      if (res?.error) throw new Error(res.message || "No se pudo añadir la entrada");

      if (Array.isArray(res)) setItems(deepClone(res));
      else if (Array.isArray(res?.chronology)) setItems(deepClone(res.chronology));
      else setItems(deepClone(res || []));

      setCreateOpen(false);
      modal?.("Cronología", "Entrada añadida");
      onUpdated?.(res);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo añadir");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  const handleEdit = async (form) => {
    try {
      if (!editItem) return;

      validateDates(form.startAt, form.endAt);

      if (!isValidObjectId(String(form.dispositive || ""))) {
        modal?.("Falta dato", "Selecciona un dispositivo válido");
        return;
      }

      const hoursNum = Number(form.hours);
      if (Number.isNaN(hoursNum) || hoursNum < 0) {
        modal?.("Error", "Horas no válidas");
        return;
      }

      const chronologyId = String(editItem?._id || "");
      if (!isValidObjectId(chronologyId)) {
        modal?.("Error", "chronologyId no válido");
        return;
      }

      setIsBusy(true);
      charge?.(true);

      const token = getToken();
      const payload = {
        volunteerApplicationId,
        chronologyId,
        startAt: form.startAt,
        endAt: form.endAt || null,
        dispositive: form.dispositive,
        hours: hoursNum,
        notes: form.notes || "",
      };

      const res = await volunteerChronologyUpdate(payload, token);
      if (res?.error) throw new Error(res.message || "No se pudo actualizar");

      if (Array.isArray(res)) setItems(deepClone(res));
      else if (Array.isArray(res?.chronology)) setItems(deepClone(res.chronology));
      else setItems(deepClone(res || []));

      setEditItem(null);
      modal?.("Cronología", "Entrada actualizada");
      onUpdated?.(res);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo actualizar");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  const doDelete = async () => {
    try {
      const item = confirmDelete;
      if (!item) return;

      const chronologyId = String(item?._id || "");
      if (!isValidObjectId(chronologyId)) {
        modal?.("Error", "chronologyId no válido");
        return;
      }

      setIsBusy(true);
      charge?.(true);

      const token = getToken();
      const payload = { volunteerApplicationId, chronologyId };

      const res = await volunteerChronologyDelete(payload, token);
      if (res?.error) throw new Error(res.message || "No se pudo eliminar");

      if (Array.isArray(res)) setItems(deepClone(res));
      else if (Array.isArray(res?.chronology)) setItems(deepClone(res.chronology));
      else setItems(deepClone(res || []));

      setConfirmDelete(null);
      modal?.("Cronología", "Entrada eliminada");
      onUpdated?.(res);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo eliminar");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  const iconClass = `${styles.icon} ${isBusy ? styles.disabled : ""}`;

  return (
    <div className={styles.contenedor}>
      <h2>
        CRONOLOGÍA
        <FaSquarePlus
          title="Añadir entrada"
          className={iconClass}
          onClick={() => !isBusy && openCreate()}
        />
      </h2>

      {sortedItems.length === 0 && (
        <p className={styles.empty}>— No hay entradas en la cronología.</p>
      )}

      {sortedItems.length > 0 && (
        <ul className={styles.ulCronologia}>
          {sortedItems.map((it) => {
            const id = String(it?._id || "");
            const devId = String(it?.dispositive?._id || it?.dispositive || "");

            return (
              <li key={id || `${it.startAt}-${devId}`} className={styles.item}>
                <div className={styles.row}>
                  <div className={styles.main}>
                    <div className={styles.deviceTitle}>{deviceLabel(devId)}</div>

                    <div className={styles.metaLine}>
                      <span>Inicio: {fmt(it?.startAt)}</span>
                      <span>Fin: {fmt(it?.endAt)}</span>
                      <span>Horas: {Number(it?.hours || 0)}</span>
                    </div>

                    {!!it?.notes && (
                      <div className={styles.notes}>{it.notes}</div>
                    )}
                  </div>

                  <div className={styles.actions}>
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
