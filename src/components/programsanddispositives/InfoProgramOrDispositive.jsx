import React, { useMemo, useState } from "react";
import styles from "../styles/infoPrgramOrDispositive.module.css";
import { getToken } from "../../lib/serviceToken";
import { coordinators, responsibles } from "../../lib/data";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { FaTrash } from "react-icons/fa6";
import { IoArrowUndo, IoRadioButtonOn} from "react-icons/io5";
import { BsPersonFillAdd } from "react-icons/bs";

const InfoProgramOrDispositive = ({
  modal,
  charge,
  listResponsability,
  enumsData,
  info,
  onSelect,
  searchUsers,
  onManageCronology,
  changeActive,
  deviceWorkers
}) => {
  const token = getToken();
  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, type: null, personId: null });


  //cronologia
  // === Cronología ===
  const [showCronologyModal, setShowCronologyModal] = useState(false);
  const [editCronology, setEditCronology] = useState(null);
  const [confirmCronology, setConfirmCronology] = useState({ show: false, cronology: null });




  const openAddModal = (type) => {
    setAddType(type);
    setShowAddModal(true);
  };

  const handleAddPerson = async (formData) => {
    if (!info?._id || !addType) return;

    try {
      charge(true);
      const personId = formData.person;
      if (!personId) throw new Error("Debe seleccionar una persona.");

      if (addType === "coordinator") {
        await coordinators(
          { action: "add", deviceId: info._id, coordinators: [personId] },
          token
        );
      } else {
        await responsibles(
          {
            type: info.type === "program" ? "program" : "device",
            action: "add",
            [info.type === "program" ? "programId" : "deviceId"]: info._id,
            responsible: [personId],
          },
          token
        );
      }

      modal("Actualizado", `Se ha añadido correctamente el ${addType === "responsible" ? "responsable" : "coordinador"}.`);
      setShowAddModal(false);
      onSelect(info);
    } catch (e) {
      console.error(e);
      modal("Error", e.message || "No se pudo añadir la persona.");
    } finally {
      charge(false);
    }
  };

  const fieldsAddPerson = [
    {
      name: "person",
      label: `Seleccionar ${addType === "responsible" ? "responsable" : "coordinador"}`,
      type: "async-search-select",
      placeholder: "Escriba al menos 3 letras...",
      required: true,
      loadOptions: searchUsers,
    },
  ];

 const dispositivos = useMemo(() => {
  if (!info || info.type !== "program") return [];

  // `filter` ya devuelve un array nuevo, podemos ordenar directamente
  return Object.values(enumsData?.dispositiveIndex || {})
    .filter((d) => d.program === info._id)
    .sort((a, b) => {
      const aActive = a.active ? 1 : 0;
      const bActive = b.active ? 1 : 0;

      // 1) activos primero
      if (aActive !== bActive) return bActive - aActive;

      // 2) dentro de cada grupo, orden alfabético por nombre (opcional)
      return (a.name || "").localeCompare(b.name || "");
    });
}, [info, enumsData]);

  if (!info) {
    return (
      <div className={styles.contenedor}>
        <p style={{ color: "#666" }}>Selecciona un programa o dispositivo.</p>
      </div>
    );
  }

  const isProgram = info?.type === "program";

  const handleRemovePerson = async () => {
    if (!info?._id || !confirmDelete.personId) return;
    const { type, personId } = confirmDelete;
    const isCoordinator = type === "coordinator";

    try {
      charge(true);
      if (isCoordinator) {
        await coordinators({ action: "remove", deviceId: info._id, coordinatorId: personId }, token);
      } else {
        await responsibles(
          {
            type: info.type === "program" ? "program" : "device",
            action: "remove",
            [info.type === "program" ? "programId" : "deviceId"]: info._id,
            responsibleId: personId,
          },
          token
        );
      }

      modal("Actualizado", `${isCoordinator ? "Coordinador" : "Responsable"} eliminado correctamente.`);
      setConfirmDelete({ show: false, type: null, personId: null });
      onSelect(info);
    } catch (e) {
      console.error(e);
      modal("Error", e.message || "No se pudo eliminar la persona.");
    } finally {
      charge(false);
    }
  };

  return (
    <div className={styles.contenedor}>
      {!!info && isProgram &&
      <div className={`${styles.fieldContainer} ${styles.fieldContainerInfo}`}>
        <h3></h3>
       <IoRadioButtonOn onClick={()=>changeActive(info)} className={(info?.active)?styles.activeDis:styles.inactiveDis}/> 
      </div>
       
      }
      {/* ✅ Botón para ir al programa si el info actual es un dispositivo */}
      {!isProgram && info?.program && (
        <div className={`${styles.fieldContainer} ${styles.fieldContainerInfo}`}>
          <button
            className={styles.btnInfoProgram}
            onClick={() => onSelect({ type: "program", _id: info.program._id })}
          >
            <IoArrowUndo />
            Info del Programa

          </button>
          <button onClick={()=>changeActive(info)} className={(info?.active)?styles.activeDis:styles.inactiveDis}>{(info?.active)?'Activar':'Desactivar'}</button>
        </div>
      )}
      {/* Nombre */}
      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>Nombre</label>
        <p className={styles.fieldTextStatic}>{info.name || "—"}</p>
      </div>

      {/* Acrónimo o Dirección */}
      {isProgram ? (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Acrónimo</label>
          <p className={styles.fieldTextStatic}>{info.acronym || "—"}</p>
        </div>
      ) : (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Dirección</label>
          <p className={styles.fieldTextStatic}>{info.address || "—"}</p>
        </div>
      )}

      {/* Área o Provincia */}
      {isProgram ? (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Área</label>
          <p className={styles.fieldTextStatic}>{info.area || "—"}</p>
        </div>
      ) : (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Provincia</label>
          <p className={styles.fieldTextStatic}>
            {enumsData?.provincesIndex?.[info.province]?.name || info.province || "—"}
          </p>
        </div>
      )}

      <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Email de grupo</label>
          <p className={styles.fieldTextStatic}>{info.email || "—"}</p>
        </div>

      {/* === CRONOLOGÍA === */}
<div className={styles.fieldContainer}>
  <label className={styles.fieldLabel}>
    Cronología
    <button
      className={styles.btnSmallAdd}
      onClick={() => {
        setEditCronology(null);
        setShowCronologyModal(true);
      }}
    >
      + Añadir
    </button>
  </label>

  {info.cronology?.length > 0 ? (
    <ul className={styles.list}>
      {info.cronology.map((c) => (
        <li key={c._id} className={styles.listItem}>
          <div>
            <strong>Inicio:</strong> {c.open ? new Date(c.open).toLocaleDateString() : "—"}  
            <strong style={{ marginLeft: "1rem" }}>Fin:</strong> {c.closed ? new Date(c.closed).toLocaleDateString() : "—"}
          </div>
          <div className={styles.listItemActions}>
            <button
              className={styles.btnTiny}
              onClick={() => {
                setEditCronology(c);
                setShowCronologyModal(true);
              }}
            >
              Editar
            </button>
            <FaTrash
              className={styles.trash}
              onClick={() => setConfirmCronology({ show: true, cronology: c })}
            />
          </div>
        </li>
      ))}
    </ul>
  ) : (
    <p className={styles.fieldTextEmpty}>Sin registros de cronología</p>
  )}
</div>


      {/* Descripción / Objetivos / Perfil */}
      {isProgram && (
        <>
          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Descripción</label>
            <div className={styles.textBlock}>{info?.about?.description || "Sin descripción"}</div>
          </div>

          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Objetivos</label>
            <div className={styles.textBlock}>{info?.about?.objectives || "Sin objetivos"}</div>
          </div>

          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Perfil</label>
            <div className={styles.textBlock}>{info?.about?.profile || "Sin perfil"}</div>
          </div>
        </>
      )}

      {/* Responsables */}
      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>
          Responsables
          <BsPersonFillAdd onClick={() => openAddModal("responsible")} />

        </label>

        {info.responsible?.length > 0 ? (
          info.responsible.map((r, i) => (
            <div className={styles.boxPerson} key={r._id || i}>
              <p
                className={styles.fieldText}
                onClick={() =>
                  modal(
                    `${r.firstName} ${r.lastName}`,
                    [` Email: ${r.email || "—"}`, `Teléfono laboral: ${r.phoneJob?.number || "—"}`]
                  )
                }
              >
                {r.firstName} {r.lastName}
              </p>
              <FaTrash
                className={styles.trash}
                onClick={() =>
                  setConfirmDelete({
                    show: true,
                    type: "responsible",
                    personId: r._id,
                  })
                }
              />
            </div>
          ))
        ) : (
          <p className={styles.fieldTextEmpty}>Sin responsables</p>
        )}
      </div>

      {/* Coordinadores */}
      {!isProgram && (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>
            Coordinadores
            <BsPersonFillAdd onClick={() => openAddModal("coordinator")} />

          </label>

          {info.coordinators?.length > 0 ? (
            info.coordinators.map((r, i) => (
              <div className={styles.boxPerson} key={r._id || i}>
                <p
                  className={styles.fieldText}
                  onClick={() =>
                    modal(
                      `${r.firstName} ${r.lastName}`,
                      [` Email: ${r.email || "—"}`, `Teléfono laboral: ${r.phoneJob?.number || "—"}`]
                    )
                  }
                >
                  {r.firstName} {r.lastName}
                </p>
                <FaTrash
                  className={styles.trash}
                  onClick={() =>
                    setConfirmDelete({
                      show: true,
                      type: "coordinator",
                      personId: r._id,
                    })
                  }
                />
              </div>
            ))
          ) : (
            <p className={styles.fieldTextEmpty}>Sin coordinadores</p>
          )}
        </div>
      )}

      {
        !isProgram && (deviceWorkers && deviceWorkers.length>0)
        ? <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Lista de Trabajadores</label>
            {deviceWorkers.map((p)=>(
              <div className={styles.boxPerson} key={p._id+p.dni}>
              <p
                  className={styles.fieldText}
                  onClick={() =>
                    modal(
                      `${p.firstName} ${p.lastName}`,
                      [` Email: ${p.email || "—"}`, `Teléfono laboral: ${p.phoneJob?.number || "—"}`, `Teléfono personal: ${p.phone || "—"}`]
                    )
                  }
                >
                  {p.firstName} {p.lastName}
                </p>
                </div>
            ))}
            
            
        </div>
        : (!isProgram) && <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Lista de Trabajadores</label>
            <div className={styles.boxPerson}>
              <p>Este dispositivo no tiene trabajadores</p>
            </div>
        </div>
      }

      {/* Dispositivos asociados */}
      {isProgram && (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Dispositivos asociados</label>
          {dispositivos.length > 0 ? (
            <ul className={styles.list}>
              {dispositivos.map((d) => (
                <li key={d._id} className={styles.listItem} onClick={() => onSelect(d)}>
                  
                  <strong>{d.name}</strong>
                  <span className={styles.iconSmall}>
                    <IoRadioButtonOn className={(d.active)?styles.activeDis:styles.inactiveDis}/>                                                                                          
                  </span>
                  {d.address && <span className={styles.subtext}>{d.address}</span>}
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.fieldTextEmpty}>No hay dispositivos asociados</p>
          )}
        </div>
      )}

      {/* === Modal añadir persona === */}
      {showAddModal && (
        <ModalForm
          title={`Añadir ${addType === "responsible" ? "Responsable" : "Coordinador"}`}
          message={`Busque y seleccione el ${addType === "responsible" ? "responsable" : "coordinador"} que desea añadir.`}
          fields={fieldsAddPerson}
          onSubmit={handleAddPerson}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* === Modal confirmar eliminación === */}
      {confirmDelete.show && (
        <ModalConfirmation
          title={`Eliminar ${confirmDelete.type === "coordinator" ? "Coordinador" : "Responsable"}`}
          message={`¿Seguro que deseas eliminar este ${confirmDelete.type === "coordinator" ? "coordinador" : "responsable"}?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleRemovePerson}
          onCancel={() => setConfirmDelete({ show: false, type: null, personId: null })}
        />
      )}

      {/* === Modal añadir/editar cronología === */}
{/* === Modal añadir/editar cronología === */}
{showCronologyModal && (
  <ModalForm
    title={`${editCronology ? "Editar" : "Añadir"} Cronología`}
    message="Complete las fechas de inicio y fin."
    fields={[
      {
        name: "open",
        label: "Fecha de inicio",
        type: "date",
        defaultValue: editCronology?.open
          ? new Date(editCronology.open).toISOString().slice(0, 10)
          : "",
      },
      {
        name: "closed",
        label: "Fecha de fin",
        type: "date",
        defaultValue: editCronology?.closed
          ? new Date(editCronology.closed).toISOString().slice(0, 10)
          : "",
      },
    ]}
    onSubmit={(formData) => {
      const type = editCronology ? "edit" : "add";
      onManageCronology(info, { ...formData, _id: editCronology?._id }, type);
      setShowCronologyModal(false);
    }}
    onClose={() => setShowCronologyModal(false)}
  />
)}

{/* === Modal eliminar cronología === */}
{confirmCronology.show && (
  <ModalConfirmation
    title="Eliminar registro de cronología"
    message="¿Seguro que deseas eliminar este registro de cronología?"
    confirmText="Eliminar"
    cancelText="Cancelar"
    onConfirm={() => {
      onManageCronology(info, { _id: confirmCronology.cronology._id }, "delete");
      setConfirmCronology({ show: false, cronology: null });
    }}
    onCancel={() => setConfirmCronology({ show: false, cronology: null })}
  />
)}


    </div>
  );
};

export default InfoProgramOrDispositive;
