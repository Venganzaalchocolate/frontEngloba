import { useMemo, useState, useCallback } from "react";
import styles from "../styles/infoEmployer.module.css";
import { FaCalendar, FaClock, FaRegClock, FaSquarePlus } from "react-icons/fa6";
import { FaRegTrashAlt, FaRegEdit, FaTimesCircle } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { getToken } from "../../lib/serviceToken";
import { volunteerInterview } from "../../lib/data";
import { useLogin } from "../../hooks/useLogin";

const deepClone = (x) => JSON.parse(JSON.stringify(x || {}));

const STATUS_OPTIONS = [
  { value: "pendiente", label: "Pendiente" },
  { value: "realizada", label: "Realizada" },
  { value: "cancelada", label: "Cancelada" },
];

const pad2 = (n) => String(n).padStart(2, "0");

const toDateInputValue = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
};

const toTimeInputValue = (v) => {
  if (!v) return "";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
};

// devuelve ISO o null. Si solo hay una de las dos -> lanza error
const combineDateTimeToISO = (dateStr, timeStr) => {
  const d = String(dateStr || "").trim();
  const t = String(timeStr || "").trim();

  if (!d && !t) return null;
  if (!d || !t) throw new Error("Debes indicar fecha y hora (o dejar ambas vacías)");

  const dt = new Date(`${d}T${t}:00`);
  if (Number.isNaN(dt.getTime())) throw new Error("Fecha/hora inválida");
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
  const s = String(it?.status || "pendiente");
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
  return name || (u.email ? String(u.email) : "—");
};

export default function VolunteerInterviewsPanel({
  doc,
  modal,
  charge,
  canEdit = true,
  onDocUpdated, // ✅ doc completo
  useReqUserAsInterviewer = false,
}) {
  const { logged } = useLogin();

  const volunteerApplicationId = useMemo(() => String(doc?._id || ""), [doc?._id]);

  // ✅ source of truth: doc.interview
  const interviews = useMemo(() => deepClone(doc?.interview || []), [doc?.interview]);

  const sortedInterviews = useMemo(() => {
    const arr = Array.isArray(interviews) ? [...interviews] : [];
    // más reciente primero (los null al final)
    arr.sort((a, b) => {
      const ta = a?.date ? new Date(a.date).getTime() : -Infinity;
      const tb = b?.date ? new Date(b.date).getTime() : -Infinity;
      return tb - ta;
    });
    return arr;
  }, [interviews]);

  const [openEdit, setOpenEdit] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [isBusy, setIsBusy] = useState(false);

  const openCreate = useCallback(() => {
    if (!canEdit || isBusy) return;
    if (!volunteerApplicationId) {
      modal?.("Error", "volunteerApplicationId no válido");
      return;
    }
    setEditingId(null);
    setOpenEdit(true);
  }, [canEdit, isBusy, volunteerApplicationId, modal]);

  const openEditOne = useCallback(
    (id) => {
      if (!canEdit || isBusy) return;
      setEditingId(String(id || ""));
      setOpenEdit(true);
    },
    [canEdit, isBusy]
  );

  const currentEditing = useMemo(() => {
    if (!editingId) return null;
    return sortedInterviews.find((x) => String(x?._id) === String(editingId)) || null;
  }, [editingId, sortedInterviews]);

  const fields = useMemo(() => {
    const it = currentEditing;

    const nameFromLogged = `${logged?.user?.firstName || ""} ${logged?.user?.lastName || ""}`.trim();
    const nameFromIt = it ? interviewerLabel(it) : "—";
    const interviewer = nameFromIt !== "—" ? nameFromIt : (nameFromLogged || "—");

    return [
      {
        name: "section1",
        type: "section",
        label: editingId ? "Editar entrevista" : "Nueva entrevista",
      },
      {
        name: "interviewer",
        label: "Entrevistador/a",
        type: "text",
        disabled: true,
        defaultValue: interviewer,
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
    if (!canEdit || isBusy) return;

    try {
      const iso = combineDateTimeToISO(form?.date, form?.time);

      const payload = {
        volunteerApplicationId,
        interview: {
          date: iso, // null si vacío
          status: String(form?.status || "pendiente"),
          notes: String(form?.notes || "").trim(),
        },
      };

      // ✅ si NO usas req.user en back, mandamos userId (si existe)
      if (!useReqUserAsInterviewer && logged?.user?._id) {
        payload.interview.userId = logged.user._id;
      }

      if (editingId) payload.interviewId = editingId;

      setIsBusy(true);
      charge?.(true);

      const token = getToken();
      const res = await volunteerInterview(payload, token);

      if (res?.error) throw new Error(res.message || "No se pudo guardar la entrevista");

      const fullDoc = res?.data || res;

      setOpenEdit(false);
      setEditingId(null);
      modal?.("Voluntariado", "Entrevista guardada");
      onDocUpdated?.(fullDoc);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo guardar la entrevista");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  const doDelete = async () => {
    if (!canEdit || isBusy) return;

    const it = confirmDelete;
    if (!it?._id) return;

    try {
      setIsBusy(true);
      charge?.(true);

      const token = getToken();
      const res = await volunteerInterview(
        {
          volunteerApplicationId,
          action: "remove_one",
          interviewId: String(it._id),
        },
        token
      );

      if (res?.error) throw new Error(res.message || "No se pudo borrar la entrevista");

      const fullDoc = res?.data || res;

      setConfirmDelete(null);
      modal?.("Voluntariado", "Entrevista eliminada");
      onDocUpdated?.(fullDoc);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo borrar la entrevista");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  return (
    <div className={styles.contenedor}>
      <h2>
        ENTREVISTAS
        {canEdit && (
          <FaSquarePlus
            title="Añadir entrevista"
            style={{
              cursor: isBusy ? "not-allowed" : "pointer",
              marginLeft: 10,
              opacity: isBusy ? 0.6 : 1,
            }}
            onClick={() => !isBusy && openCreate()}
          />
        )}
      </h2>

{sortedInterviews.length ? (
  sortedInterviews.map((it) => (
    <div
      key={it?._id}
      className={styles.volunteerInterviewBody}
    >
      <div className={styles.volunteerInterviewRow}>
        <div className={styles.volunteerInterviewLabel}>Entrevistador/a</div>
        <div className={styles.volunteerInterviewValue}>{interviewerLabel(it)}</div>
      </div>

      <div className={styles.volunteerInterviewRow}>
        <div className={styles.volunteerInterviewValue}><FaCalendar/>{dateOnlyLabel(it)}</div>
        <div className={styles.volunteerInterviewValue}><FaRegClock/>{timeOnlyLabel(it)}</div>
        <div className={styles.volunteerInterviewValue}>{statusLabel(it)}</div>
      </div>


      <div className={`${styles.volunteerInterviewRow} ${styles.volunteerInterviewRowLast}`}>
        <div className={styles.volunteerInterviewLabel}>Notas</div>
        <div className={`${styles.volunteerInterviewValue} ${styles.volunteerInterviewValuePre}`}>
          {it?.notes?.trim() ? it.notes : "—"}
        </div>
      </div>

      {canEdit && (
        <div className={styles.volunteerInterviewActions}>
          <button onClick={() => openEditOne(it._id)}>
            <FaRegEdit/>
            Editar
          </button>

          <button
            className='tomato'
            onClick={() => setConfirmDelete(it)}
          >
            <FaRegTrashAlt/>
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

      {confirmDelete && (
        <ModalConfirmation
          title="Eliminar entrevista"
          message="¿Seguro que deseas eliminar esta entrevista?"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
