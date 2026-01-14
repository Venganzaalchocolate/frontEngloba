import { useMemo, useState } from "react";
import styles from "../styles/infoEmployer.module.css"; // mismo look
import { FaSquarePlus } from "react-icons/fa6";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { volunteerAddNote } from "../../lib/data";
import { useLogin } from "../../hooks/useLogin";

const deepClone = (x) => JSON.parse(JSON.stringify(x || {}));

export default function VolunteerInternalNotes({
  doc,
  modal,
  charge,
  onNotesUpdated, // callback (idealmente actualiza doc en padre)
}) {
  const notes = useMemo(() => deepClone(doc?.internalNotes || []), [doc?.internalNotes]);
  const { logged } = useLogin();
  const [openAdd, setOpenAdd] = useState(false);

  const openCreate = () => {
    setOpenAdd(true);
  };

  const addFields = useMemo(
    () => [
      { name: "section1", type: "section", label: "Añadir nota interna" },
      {
        name: "note",
        label: "Nota",
        type: "textarea",
        required: true,
        defaultValue: "",
      },
    ],
    []
  );

  const handleAdd = async (form) => {
    const text = String(form?.note || "").trim();
    if (!text) {
      modal?.("Error", "Escribe una nota");
      return;
    }

    try {
      charge?.(true);
      const token = getToken();

      const resp = await volunteerAddNote(
        {
          volunteerApplicationId: doc?._id,
          note: text,
          userId: logged.user._id, // si tu back usa req.user, puedes quitar esto
        },
        token
      );

      if (resp?.error) {
        modal?.("Error", resp.message || "No se pudo añadir la nota");
        return;
      }

      // resp suele ser el array updated.internalNotes (según tu controller)
      onNotesUpdated?.(resp);

      setOpenAdd(false);
      modal?.("Voluntariado", "Nota añadida");
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo añadir la nota");
    } finally {
      charge?.(false);
    }
  };

  const authorLabel = (n) => {
    const u = n?.userId;
    if (!u) return "Autor";
    // a veces puede venir populate (obj) o id (string)
    if (typeof u === "string") return "Autor";
    const name = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return name || "Autor";
  };

  return (
    <div className={styles.contenedor}>
      <h2>
        NOTAS INTERNAS
       
          <FaSquarePlus
            title="Añadir nota"
            style={{ cursor: "pointer", marginLeft: 10 }}
            onClick={openCreate}
          />
       
      </h2>

      <div style={{ flex: "1 1 100%" }}>
        <label>Histórico</label>

        {notes?.length ? (
          notes
            .slice()
            .reverse()
            .map((n, i) => (
              <div
                key={n?._id || i}
                style={{ padding: "8px 0", borderBottom: "1px solid #eee" }}
              >
                <div style={{ fontSize: "9pt", opacity: 0.7 }}>
                  {authorLabel(n)}
                  {" · "}
                  {n?.createdAt ? new Date(n.createdAt).toLocaleString("es-ES") : ""}
                </div>
                <div style={{ whiteSpace: "pre-wrap" }}>{n?.note}</div>
              </div>
            ))
        ) : (
          <div style={{ opacity: 0.7 }}>No hay notas internas.</div>
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
    </div>
  );
}
