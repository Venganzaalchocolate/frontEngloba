import { useMemo, useState, useCallback } from "react";
import styles from "../styles/infoEmployer.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import { FaRegTrashAlt, FaRegEdit } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { volunteerInterview } from "../../lib/data";
import { useLogin } from "../../hooks/useLogin";

const deepClone = (x) => JSON.parse(JSON.stringify(x || {}));

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "realizada", label: "Realizada" },
  { value: "cancelada", label: "Cancelada" },
];

const toDateInputValue = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const toTimeInputValue = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const combineDateTimeToISO = (dateStr, timeStr) => {
  const d = String(dateStr || "").trim();
  const t = String(timeStr || "").trim();

  if (!d && !t) return null;
  if (!d || !t) return "__INVALID__";

  const dt = new Date(`${d}T${t}:00`);
  if (Number.isNaN(dt.getTime())) return "__INVALID__";
  return dt.toISOString();
};

const dateOnlyLabel = (it) => {
  if (!it?.date) return "—";
  const d = new Date(it.date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("es-ES");
};

const timeOnlyLabel = (it) => {
  if (!it?.date) return "—";
  const d = new Date(it.date);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
};

const statusLabel = (it) => {
  const s = it?.status || "pendiente";
  if (s === "pendiente") return "Pendiente";
  if (s === "realizada") return "Realizada";
  if (s === "cancelada") return "Cancelada";
  return s;
};

const interviewerLabel = (it) => {
  const u = it?.userId;
  if (!u) return "—";
  if (typeof u === "string") return "—";
  const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
  return name || "—";
};

export default function VolunteerInterviewsPanel({
  doc,
  modal,
  charge,
  onInterviewsUpdated,
  canEdit = true,
  useReqUserAsInterviewer = false,
}) {
  const { logged } = useLogin();

  const interviews = useMemo(
    () => deepClone(doc?.interview || []),
    [doc?.interview]
  );

  const [openEdit, setOpenEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const openCreate = () => {
    if (!canEdit) return;
    setEditingId(null);
    setOpenEdit(true);
  };

  const openEditOne = (id) => {
    if (!canEdit) return;
    setEditingId(id);
    setOpenEdit(true);
  };

  const currentEditing = useMemo(() => {
    if (!editingId) return null;
    return interviews.find((x) => String(x?._id) === String(editingId)) || null;
  }, [editingId, interviews]);

  const fields = useMemo(() => {
    const it = currentEditing;

    const nameFromLogged = `${logged?.user?.firstName || ""} ${logged?.user?.lastName || ""}`.trim();
    const nameFromIt = it ? interviewerLabel(it) : "—";

    return [
      { name: "section1", type: "section", label: editingId ? "Editar entrevista" : "Nueva entrevista" },
      {
        name: "interviewer",
        label: "Entrevistador/a",
        type: "text",
        disabled: true,
        defaultValue: nameFromIt !== "—" ? nameFromIt : (nameFromLogged || "—"),
      },
      {
        name: "date",
        label: "Fecha",
        type: "date",
        required: false,
        defaultValue: toDateInputValue(it?.date),
      },
      {
        name: "time",
        label: "Hora",
        type: "time",
        required: false,
        defaultValue: toTimeInputValue(it?.date),
      },
      {
        name: "status",
        label: "Estado",
        type: "select",
        required: true,
        options: STATUS_OPTIONS,
        defaultValue: it?.status || "pendiente",
      },
      {
        name: "notes",
        label: "Notas",
        type: "textarea",
        required: false,
        defaultValue: it?.notes || "",
      },
    ];
  }, [currentEditing, editingId, logged?.user]);

  const handleSubmit = async (form) => {
    try {
      charge?.(true);
      const token = getToken();

      const iso = combineDateTimeToISO(form?.date, form?.time);
      if (iso === "__INVALID__") {
        modal?.("Error", "Debes indicar fecha y hora (o dejar ambas vacías)");
        return;
      }

      const payload = {
        volunteerApplicationId: doc?._id,
        interview: {
          date: iso || null,
          status: String(form?.status || "pendiente"),
          notes: String(form?.notes || "").trim(),
        },
      };

      if (!useReqUserAsInterviewer && logged?.user?._id) {
        payload.interview.userId = logged.user._id;
      }

      // update si hay editingId
      if (editingId) payload.interviewId = editingId;

      const resp = await volunteerInterview(payload, token);
      if (resp?.error) {
        modal?.("Error", resp.message || "No se pudo guardar la entrevista");
        return;
      }

      onInterviewsUpdated?.(resp); // resp debería ser updated.interview (array)
      setOpenEdit(false);
      setEditingId(null);
      modal?.("Voluntariado", "Entrevista guardada");
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo guardar la entrevista");
    } finally {
      charge?.(false);
    }
  };

  const removeOne = async (id) => {
    try {
      charge?.(true);
      const token = getToken();
      const resp = await volunteerInterview(
        { volunteerApplicationId: doc?._id, action: "remove_one", interviewId: id },
        token
      );

      if (resp?.error) {
        modal?.("Error", resp.message || "No se pudo borrar la entrevista");
        return;
      }

      onInterviewsUpdated?.(resp);
      modal?.("Voluntariado", "Entrevista eliminada");
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo borrar la entrevista");
    } finally {
      charge?.(false);
    }
  };

  return (
    <div className={styles.contenedor}>
      <h2>
        ENTREVISTAS
        <FaSquarePlus
          title="Añadir entrevista"
          style={{ cursor: "pointer", marginLeft: 10 }}
          onClick={openCreate}
        />
      </h2>

      {interviews?.length ? (
        interviews
          .slice()
          .reverse()
          .map((it) => (
            <div key={it?._id} className="volunteerInterview__body" style={{ marginBottom: 12 }}>
              <div className="volunteerInterview__row">
                <div className="volunteerInterview__label">Entrevistador/a</div>
                <div className="volunteerInterview__value">{interviewerLabel(it)}</div>
              </div>

              <div className="volunteerInterview__row">
                <div className="volunteerInterview__label">Fecha</div>
                <div className="volunteerInterview__value">{dateOnlyLabel(it)}</div>
              </div>

              <div className="volunteerInterview__row">
                <div className="volunteerInterview__label">Hora</div>
                <div className="volunteerInterview__value">{timeOnlyLabel(it)}</div>
              </div>

              <div className="volunteerInterview__row">
                <div className="volunteerInterview__label">Estado</div>
                <div className="volunteerInterview__value">{statusLabel(it)}</div>
              </div>

              <div className="volunteerInterview__row volunteerInterview__row--last">
                <div className="volunteerInterview__label">Notas</div>
                <div className="volunteerInterview__value volunteerInterview__value--pre">
                  {it?.notes?.trim() ? it.notes : "—"}
                </div>
              </div>

              {canEdit && (
                <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
                  <button type="button" onClick={() => openEditOne(it._id)}>
                    <FaRegEdit style={{ marginRight: 6 }} />
                    Editar
                  </button>
                  <button type="button" className="tomato" onClick={() => removeOne(it._id)}>
                    <FaRegTrashAlt style={{ marginRight: 6 }} />
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          ))
      ) : (
        <div style={{ opacity: 0.7 }}>No hay entrevistas.</div>
      )}

      {openEdit && (
        <ModalForm
          title={editingId ? "Editar entrevista" : "Nueva entrevista"}
          message="Define fecha, estado y notas"
          fields={fields}
          onSubmit={handleSubmit}
          onClose={() => {
            setOpenEdit(false);
            setEditingId(null);
          }}
          modal={modal}
        />
      )}
    </div>
  );
}
