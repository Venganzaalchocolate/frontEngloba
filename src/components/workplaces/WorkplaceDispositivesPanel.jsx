import { useEffect, useMemo, useState } from "react";
import styles from "../styles/workplaces.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import { FaRegTrashAlt } from "react-icons/fa";

import ModalForm from "../globals/ModalForm.jsx";
import ModalConfirmation from "../globals/ModalConfirmation.jsx";
import { getToken } from "../../lib/serviceToken.js";

import {
  addWorkplaceToDispositive,
  removeWorkplaceFromDispositive,
  listDispositivesByWorkplace,
} from "../../lib/data";

export default function WorkplaceDispositivesPanel({
  doc,
  modal,
  charge,
  enumsData,
  onChanged,
  soloInfo = false,
}) {
  const [items, setItems] = useState([]);
  const [openAdd, setOpenAdd] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(null);

  const workplaceId = doc?._id || "";

  const deviceOptions = useMemo(() => {
    const assigned = new Set(items.map((x) => String(x._id)));
    const programsIndex = enumsData?.programsIndex || {};

    return Object.entries(enumsData?.dispositiveIndex || {})
      .filter(([id]) => !assigned.has(String(id)))
      .map(([id, d]) => {
        const programId = d?.program?._id || d?.program || d?.programId || "";
        const program = programsIndex[String(programId)] || null;
        const programName = program?.acronym || program?.name || "";

        return {
          value: id,
          label: `${d.name || "Dispositivo sin nombre"}${programName ? ` · ${programName}` : ""}`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [items]);

  const fields = useMemo(() => [
    {
      name: "dispositiveId",
      label: "Dispositivo",
      type: "select",
      required: true,
      defaultValue: "",
      options: [{ value: "", label: "Seleccione dispositivo" }, ...deviceOptions],
    },
  ], [deviceOptions]);

  /**
   * Carga los dispositivos asignados al centro.
   */
  const loadAssigned = async () => {
    if (!workplaceId) return;

    charge(true);

    const res = await listDispositivesByWorkplace({ workplaceId, active: true }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudieron cargar los dispositivos.");
      charge(false);
      return;
    }

    setItems(res);
    charge(false);
  };

  /**
   * Carga los dispositivos asignados al cambiar de centro.
   */
  useEffect(() => {
    loadAssigned();
  }, [workplaceId]);

  /**
   * Asigna un dispositivo al centro.
   */
  const handleAdd = async (values) => {
    charge(true);

    const res = await addWorkplaceToDispositive(
      {
        workplaceId,
        dispositiveId: values.dispositiveId,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo asignar el dispositivo.");
      charge(false);
      return;
    }

    setOpenAdd(false);
    await loadAssigned();
    await onChanged?.();

    modal("Centros de trabajo", "Dispositivo asignado correctamente.");
    charge(false);
  };

  /**
   * Desvincula un dispositivo del centro.
   */
  const handleRemove = async () => {
    if (!confirmRemove?._id) return;

    charge(true);

    const res = await removeWorkplaceFromDispositive(
      {
        workplaceId,
        dispositiveId: confirmRemove._id,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo desvincular el dispositivo.");
      charge(false);
      return;
    }

    setConfirmRemove(null);
    await loadAssigned();
    await onChanged?.();

    modal("Centros de trabajo", "Dispositivo desvinculado correctamente.");
    charge(false);
  };

  return (
    <div className={styles.workplacePanel}>
      <h2>
        DISPOSITIVOS ASIGNADOS
        {!soloInfo && <FaSquarePlus title="Asignar dispositivo" onClick={() => setOpenAdd(true)} />}
      </h2>

      {items.length ? (
        <ul className={styles.assignedList}>
          {items.map((d) => (
            <li className={styles.assignedItem} key={d._id}>
              <div className={styles.assignedInfo}>
                <p className={styles.assignedName}>{d.name}</p>
                <p className={styles.assignedSub}>
                  {d.program?.acronym || d.program?.name || "Sin programa"}
                </p>
              </div>
              {!soloInfo &&
                <div className={styles.assignedActions}>
                  <button
                    className="tomato"
                    type="button"
                    onClick={() => setConfirmRemove(d)}
                  >
                    <FaRegTrashAlt />
                    Desvincular
                  </button>
                </div>
              }

            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.emptyMessage}>
          No hay dispositivos asignados a este centro.
        </p>
      )}

      {openAdd && !soloInfo && (
        <ModalForm
          title="Asignar dispositivo"
          message="Selecciona el dispositivo que trabaja en este centro."
          fields={fields}
          onSubmit={handleAdd}
          onClose={() => setOpenAdd(false)}
          modal={modal}
        />
      )}

      {confirmRemove && !soloInfo && (
        <ModalConfirmation
          title="Desvincular dispositivo"
          message={`¿Seguro que quieres desvincular "${confirmRemove.name}" de este centro? La oficina de Sesame se actualizará automáticamente.`}
          onConfirm={handleRemove}
          onCancel={() => setConfirmRemove(null)}
        />
      )}
    </div>
  );
}