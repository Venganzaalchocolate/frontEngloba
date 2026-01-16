import { useMemo, useState, useCallback } from "react";
import styles from "../styles/infoEmployer.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import { FaTrashAlt } from "react-icons/fa";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { getToken } from "../../lib/serviceToken";
import { volunteerAddNote, volunteerDeleteNote } from "../../lib/data"; 
import { useLogin } from "../../hooks/useLogin";

const deepClone = (x) => JSON.parse(JSON.stringify(x || {}));

export default function VolunteerInternalNotes({
  doc,
  modal,
  charge,
  onDocUpdated, // ✅ doc completo
}) {
  const { logged } = useLogin();

  const volunteerApplicationId = useMemo(() => String(doc?._id || ""), [doc?._id]);

  const notes = useMemo(() => deepClone(doc?.internalNotes || []), [doc?.internalNotes]);

  const sortedNotes = useMemo(() => {
    const arr = Array.isArray(notes) ? [...notes] : [];
    arr.sort((a, b) => new Date(b?.createdAt || 0) - new Date(a?.createdAt || 0));
    return arr;
  }, [notes]);

  const [openAdd, setOpenAdd] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null); // nota a borrar
  const [isBusy, setIsBusy] = useState(false);

  const openCreate = useCallback(() => {
    if (!volunteerApplicationId) return modal?.("Error", "volunteerApplicationId no válido");
    setOpenAdd(true);
  }, [volunteerApplicationId, modal]);

  const addFields = useMemo(
    () => [
      { name: "section1", type: "section", label: "Añadir nota interna" },
      { name: "note", label: "Nota", type: "textarea", required: true, defaultValue: "" },
    ],
    []
  );

  const authorLabel = (n) => {
    const u = n?.userId;
    if (!u || typeof u === "string") return "Autor";
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return name || (u.email ? String(u.email) : "Autor");
  };

  const handleAdd = async (form) => {
    if (isBusy) return;

    const text = String(form?.note || "").trim();
    if (!text) return modal?.("Error", "Escribe una nota");

    const authorId = logged?.user?._id || null;

    try {
      setIsBusy(true);
      charge?.(true);

      const token = getToken();
      const payload = {
        volunteerApplicationId,
        note: text,
        ...(authorId ? { userId: authorId } : {}),
      };

      const res = await volunteerAddNote(payload, token);
      if (res?.error) throw new Error(res.message || "No se pudo añadir la nota");

      const fullDoc = res?.data || res;

      setOpenAdd(false);
      modal?.("Voluntariado", "Nota añadida");
      onDocUpdated?.(fullDoc);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo añadir la nota");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  const askDelete = (note) => {
    if (isBusy) return;
    if (!note?._id) return;
    setConfirmDelete(note);
  };

  const doDelete = async () => {
    if (isBusy) return;
    const note = confirmDelete;
    if (!note?._id) return;

    try {
      setIsBusy(true);
      charge?.(true);

      const token = getToken();
      const res = await volunteerDeleteNote(
        { volunteerApplicationId, noteId: String(note._id) },
        token
      );

      if (res?.error) throw new Error(res.message || "No se pudo eliminar la nota");

      const fullDoc = res?.data || res;

      setConfirmDelete(null);
      modal?.("Voluntariado", "Nota eliminada");
      onDocUpdated?.(fullDoc);
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo eliminar la nota");
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  return (
    <div className={styles.contenedor}>
      <h2>
        NOTAS INTERNAS

          <FaSquarePlus
            title="Añadir nota"
            className={`${styles.icon} ${isBusy ? styles.disabled : ""}`}
            onClick={() => !isBusy && openCreate()}
          />

      </h2>

      <div className={styles.notesWrap}>
        <label>Histórico</label>

        {sortedNotes.length ? (
          <div className={styles.notesList}>
            {sortedNotes.map((n, i) => (
              <div key={n?._id || i} className={styles.noteItem}>
                <div className={styles.noteHead}>
                  <div className={styles.noteMeta}>
                    <span className={styles.noteAuthor}>{authorLabel(n)}</span>
                    <span className={styles.noteDot}>·</span>
                    <span className={styles.noteDate}>
                      {n?.createdAt ? new Date(n.createdAt).toLocaleString("es-ES") : "—"}
                    </span>
                  </div>


                    <FaTrashAlt
                      title="Eliminar nota"
                      className={`${styles.noteTrash} ${isBusy ? styles.disabled : ""}`}
                      onClick={() => askDelete(n)}
                    />
                 
                </div>

                <div className={styles.noteBody}>{n?.note || ""}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.muted}>No hay notas internas.</div>
        )}
      </div>

      {openAdd && (
        <ModalForm
          title="Añadir nota interna"
          message="Escribe la nota"
          fields={addFields}
          onSubmit={handleAdd}
          onClose={() => setOpenAdd(false)}
          modal={modal}
        />
      )}

      {confirmDelete && (
        <ModalConfirmation
          title="Eliminar nota"
          message="¿Seguro que deseas eliminar esta nota interna?"
          onConfirm={doDelete}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
