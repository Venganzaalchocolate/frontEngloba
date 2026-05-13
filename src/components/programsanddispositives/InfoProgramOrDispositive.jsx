import React, { useEffect, useMemo, useState } from "react";
import styles from "../styles/infoPrgramOrDispositive.module.css";
import { getToken } from "../../lib/serviceToken";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { FaTrash } from "react-icons/fa6";
import { IoArrowUndo, IoRadioButtonOn } from "react-icons/io5";
import { BsPersonFillAdd } from "react-icons/bs";
import { useLogin } from "../../hooks/useLogin";

import {
  scopedRole,
  updateDispositive,
  getWorkplaceId,
  updateWorkplace,
  listWorkplaces,
  addWorkplaceToDispositive,
  removeWorkplaceFromDispositive,
} from "../../lib/data";

import InfoWorkplace from "../workplaces/InfoWorkplace";
import WorkplaceDispositivesPanel from "../workplaces/WorkplaceDispositivesPanel";
import InfoSesameOffice from "../sesame/InfoSesameOffice";

const ROLE_SECTIONS = [
  { key: "responsible", label: "Responsables", field: "responsible" },
  { key: "coordinators", label: "Coordinadores", field: "coordinators" },
  { key: "supervisors", label: "Supervisores", field: "supervisors" },
];

const InfoProgramOrDispositive = ({
  modal,
  charge,
  enumsData,
  info,
  onSelect,
  searchUsers,
  onManageCronology,
  changeActive,
  deviceWorkers,
}) => {
  const { logged } = useLogin();

  const [showAddModal, setShowAddModal] = useState(false);
  const [addType, setAddType] = useState(null);
  const [quickEditField, setQuickEditField] = useState(null);

  const [selectedWorkplaceId, setSelectedWorkplaceId] = useState(null);
  const [selectedWorkplace, setSelectedWorkplace] = useState(null);
  const [showAddWorkplaceModal, setShowAddWorkplaceModal] = useState(false);
  const [confirmRemoveWorkplace, setConfirmRemoveWorkplace] = useState(null);

  const [confirmDelete, setConfirmDelete] = useState({
    show: false,
    type: null,
    personId: null,
  });

  const [showCronologyModal, setShowCronologyModal] = useState(false);
  const [editCronology, setEditCronology] = useState(null);
  const [confirmCronology, setConfirmCronology] = useState({
    show: false,
    cronology: null,
  });

  const isProgram = info?.type === "program";
  const tokenScopeType = isProgram ? "program" : "dispositive";

  const dispositivos = useMemo(() => {
    if (!info || info.type !== "program") return [];

    return Object.values(enumsData?.dispositiveIndex || {})
      .filter((d) => d.program === info._id)
      .sort((a, b) => {
        const aActive = a.active ? 1 : 0;
        const bActive = b.active ? 1 : 0;
        if (aActive !== bActive) return bActive - aActive;
        return (a.name || "").localeCompare(b.name || "", "es");
      });
  }, [info, enumsData]);

  const workplaces = useMemo(() => {
    if (isProgram) return [];
    return Array.isArray(info?.workplaces) ? info.workplaces : [];
  }, [info, isProgram]);

  const assignedWorkplaceIds = useMemo(() => {
    return new Set(
      workplaces
        .map((workplace) => typeof workplace === "string" ? workplace : workplace?._id)
        .filter(Boolean)
        .map(String)
    );
  }, [workplaces]);

  useEffect(() => {
    setSelectedWorkplaceId(null);
    setSelectedWorkplace(null);
  }, [info?._id, info?.type]);

  const entityId = isProgram
    ? typeof info?.entity === "string"
      ? info.entity
      : info?.entity?._id
    : typeof info?.program?.entity === "string"
      ? info.program.entity
      : info?.program?.entity?._id;

  const entityName = enumsData?.entityIndex?.[entityId]?.name || "—";

  const provinceName = isProgram
    ? "—"
    : typeof info?.province === "object"
      ? info.province?.name || "—"
      : enumsData?.provincesIndex?.[info?.province]?.name || info?.province || "—";

  const openAddModal = (type) => {
    setAddType(type);
    setShowAddModal(true);
  };

  const syncWorkplace = (doc) => {
    if (!doc?._id) return;

    setSelectedWorkplace((prev) => {
      if (!prev || String(prev._id) !== String(doc._id)) return prev;
      return { ...prev, ...doc };
    });
  };

  const handleCreateSesameOffice = async (doc) => {
    if (!doc?._id) return;

    const hasCoordinates =
      Number.isFinite(Number(doc?.coordinates?.lat)) &&
      Number.isFinite(Number(doc?.coordinates?.lng));

    if (!doc.address || !hasCoordinates) {
      modal(
        "Faltan datos",
        "Para crear la oficina en Sesame el centro de trabajo necesita dirección, latitud y longitud."
      );
      return;
    }

    charge(true);

    const res = await updateWorkplace(
      {
        workplaceId: doc._id,
        createSesameOffice: true,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo crear la oficina en Sesame.");
      charge(false);
      return;
    }

    syncWorkplace(res);
    await refreshSelectedWorkplace();
    await onSelect({ type: "dispositive", _id: info._id });

    modal("Sesame", "Oficina creada correctamente en Sesame.");
    charge(false);
  };

  const toggleWorkplace = async (workplaceId) => {
    if (!workplaceId) return;

    if (String(selectedWorkplaceId) === String(workplaceId)) {
      setSelectedWorkplaceId(null);
      setSelectedWorkplace(null);
      return;
    }

    charge(true);

    const res = await getWorkplaceId({ workplaceId }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo cargar el centro de trabajo.");
      charge(false);
      return;
    }

    setSelectedWorkplaceId(workplaceId);
    setSelectedWorkplace(res);
    charge(false);
  };

  const handleAddPerson = async (formData) => {
    if (!info?._id || !addType) return;

    charge(true);

    const personId = formData.person;

    if (!personId) {
      modal("Error", "Debe seleccionar una persona.");
      charge(false);
      return;
    }

    const res = await scopedRole(
      {
        scopeType: tokenScopeType,
        scopeId: info._id,
        roleType: addType,
        action: "add",
        users: [personId],
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo añadir la persona.");
      charge(false);
      return;
    }

    const roleLabel =
      addType === "responsible"
        ? "responsable"
        : addType === "coordinators"
          ? "coordinador"
          : "supervisor";

    modal("Actualizado", `Se ha añadido correctamente el ${roleLabel}.`);
    setShowAddModal(false);
    onSelect({ type: info.type, _id: info._id });
    charge(false);
  };

  const handleRemovePerson = async () => {
    if (!info?._id || !confirmDelete.personId || !confirmDelete.type) return;

    charge(true);

    const res = await scopedRole(
      {
        scopeType: tokenScopeType,
        scopeId: info._id,
        roleType: confirmDelete.type,
        action: "remove",
        removeUserId: confirmDelete.personId,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo eliminar la persona.");
      charge(false);
      return;
    }

    const roleLabel =
      confirmDelete.type === "responsible"
        ? "Responsable"
        : confirmDelete.type === "coordinators"
          ? "Coordinador"
          : "Supervisor";

    modal("Actualizado", `${roleLabel} eliminado correctamente.`);
    setConfirmDelete({ show: false, type: null, personId: null });
    onSelect({ type: info.type, _id: info._id });
    charge(false);
  };

  const refreshSelectedWorkplace = async () => {
    if (!selectedWorkplaceId) return;

    charge(true);

    const res = await getWorkplaceId({ workplaceId: selectedWorkplaceId }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo refrescar el centro de trabajo.");
      charge(false);
      return;
    }

    setSelectedWorkplace(res);
    charge(false);
  };

  const handleQuickUpdateDispositiveField = async (formData) => {
    if (!info?._id || isProgram || !quickEditField) return;

    charge(true);

    const payload = { dispositiveId: info._id };

    if (quickEditField === "address") payload.address = formData.address || "";
    if (quickEditField === "phone") payload.phone = formData.phone || "";
    if (quickEditField === "email") payload.email = formData.email || "";

    const res = await updateDispositive(payload, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo actualizar el dispositivo.");
      charge(false);
      return;
    }

    setQuickEditField(null);
    modal("Actualizado", "Campo actualizado correctamente.");
    onSelect({ type: "dispositive", _id: info._id });
    charge(false);
  };

  const handleCreateDispositiveDepartment = async () => {
    if (!info?._id || isProgram) return;

    charge(true);

    const res = await updateDispositive(
      {
        dispositiveId: info._id,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo crear el departamento Sesame.");
      charge(false);
      return;
    }

    modal("Sesame", "Departamento Sesame creado y asociado correctamente.");
    onSelect({ type: "dispositive", _id: info._id });
    charge(false);
  };

  const fieldsAddPerson = [
    {
      name: "person",
      label:
        addType === "responsible"
          ? "Seleccionar responsable"
          : addType === "coordinators"
            ? "Seleccionar coordinador"
            : "Seleccionar supervisor",
      type: "async-search-select",
      placeholder: "Escriba al menos 3 letras...",
      required: true,
      loadOptions: searchUsers,
    },
  ];

  const quickEditFieldsMap = {
    address: [
      {
        name: "address",
        label: "Dirección",
        type: "text",
        required: false,
        defaultValue: info?.address || "",
      },
    ],
    phone: [
      {
        name: "phone",
        label: "Teléfono",
        type: "text",
        required: false,
        defaultValue: info?.phone || "",
      },
    ],
    email: [
      {
        name: "email",
        label: "Email de grupo",
        type: "text",
        required: false,
        defaultValue: info?.email || "",
      },
    ],
  };

  const quickEditTitles = {
    address: "Editar dirección",
    phone: "Editar teléfono",
    email: "Editar email de grupo",
  };

  const quickEditMessages = {
    address: "Actualiza la dirección del dispositivo.",
    phone: "Actualiza el teléfono del centro.",
    email: "Actualiza el email de grupo del dispositivo.",
  };

  if (!info) {
    return (
      <div className={styles.contenedor}>
        <p style={{ color: "#666" }}>Selecciona un programa o dispositivo.</p>
      </div>
    );
  }

  const searchWorkplaces = async (query) => {
    const q = String(query || "").trim();

    if (q.length < 3) return [];

    const res = await listWorkplaces(
      {
        q,
        active: true,
        page: 1,
        limit: 50,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudieron buscar centros de trabajo.");
      return [];
    }

    const items = Array.isArray(res.items) ? res.items : [];

    return items
      .filter((workplace) => !assignedWorkplaceIds.has(String(workplace._id)))
      .map((workplace) => ({
        value: workplace._id,
        label: [
          workplace.name || "Centro sin nombre",
          workplace.province?.name || "",
          workplace.officeIdSesame ? "Oficina Sesame" : "Sin oficina Sesame",
        ].filter(Boolean).join(" · "),
      }));
  };

  const handleAddWorkplaceToDispositive = async (formData) => {
    if (!info?._id || isProgram || !formData?.workplaceId) {
      modal("Error", "Debes seleccionar un centro de trabajo.");
      return;
    }

    charge(true);

    const res = await addWorkplaceToDispositive(
      {
        dispositiveId: info._id,
        workplaceId: formData.workplaceId,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo asignar el centro de trabajo.");
      charge(false);
      return;
    }

    setShowAddWorkplaceModal(false);
    setSelectedWorkplaceId(null);
    setSelectedWorkplace(null);

    await onSelect({ type: "dispositive", _id: info._id });

    modal("Centros de trabajo", "Centro de trabajo asignado correctamente.");
    charge(false);
  };

  const handleRemoveWorkplaceFromDispositive = async () => {
    if (!info?._id || isProgram || !confirmRemoveWorkplace?._id) return;

    charge(true);

    const res = await removeWorkplaceFromDispositive(
      {
        dispositiveId: info._id,
        workplaceId: confirmRemoveWorkplace._id,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo desasignar el centro de trabajo.");
      charge(false);
      return;
    }

    setConfirmRemoveWorkplace(null);

    if (String(selectedWorkplaceId) === String(confirmRemoveWorkplace._id)) {
      setSelectedWorkplaceId(null);
      setSelectedWorkplace(null);
    }

    await onSelect({ type: "dispositive", _id: info._id });

    modal("Centros de trabajo", "Centro de trabajo desasignado correctamente.");
    charge(false);
  };

  return (
    <div className={styles.contenedor}>
      {!!info && isProgram && (
        <div className={`${styles.fieldContainer} ${styles.fieldContainerInfo}`}>
          <h3></h3>
          <button
            onClick={() => changeActive(info)}
            className={info?.active ? styles.activeDis : styles.inactiveDis}
          >
            {info?.active ? "Desactivar" : "Activar"}
          </button>
        </div>
      )}

      {!isProgram && info?.program && (
        <div className={`${styles.fieldContainer} ${styles.fieldContainerInfo}`}>
          <button
            className={styles.btnInfoProgram}
            onClick={() => onSelect({ type: "program", _id: info.program._id })}
          >
            <IoArrowUndo />
            Info del Programa
          </button>

          <button
            onClick={() => changeActive(info)}
            className={info?.active ? styles.activeDis : styles.inactiveDis}
          >
            {info?.active ? "Desactivar" : "Activar"}
          </button>
        </div>
      )}

      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>Nombre</label>
        <p className={styles.fieldTextStatic}>{info.name || "—"}</p>
      </div>

      {!isProgram && (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>
            Departamento Sesame asociado

            {!info?.departamentSesame && (
              <button
                type="button"
                className={styles.btnInlineEdit}
                onClick={handleCreateDispositiveDepartment}
              >
                Crear
              </button>
            )}
          </label>

          {info?.departamentSesame ? (
            <>
              <p className={styles.fieldTextStatic}>
                {info.name || "Departamento del dispositivo"}
              </p>
            </>
          ) : (
            <p className={styles.fieldTextEmpty}>
              Sin departamento Sesame asociado
            </p>
          )}
        </div>
      )}

      {isProgram && (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Entidad</label>
          <p className={styles.fieldTextStatic}>{entityName}</p>
        </div>
      )}

      {isProgram ? (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Acrónimo</label>
          <p className={styles.fieldTextStatic}>{info.acronym || "—"}</p>
        </div>
      ) : (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>
            Dirección
            <button
              type="button"
              className={styles.btnInlineEdit}
              onClick={() => setQuickEditField("address")}
            >
              Editar
            </button>
          </label>
          <p className={styles.fieldTextStatic}>{info.address || "—"}</p>
        </div>
      )}

      {!isProgram && (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>
            Teléfono del Centro
            <button
              type="button"
              className={styles.btnInlineEdit}
              onClick={() => setQuickEditField("phone")}
            >
              Editar
            </button>
          </label>
          <p className={styles.fieldTextStatic}>{info.phone || "—"}</p>
        </div>
      )}

      {isProgram ? (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Área</label>
          <p className={styles.fieldTextStatic}>{info.area || "—"}</p>
        </div>
      ) : (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Provincia</label>
          <p className={styles.fieldTextStatic}>{provinceName}</p>
        </div>
      )}

      <div className={styles.fieldContainer}>
        <label className={styles.fieldLabel}>
          Email de grupo
          {!isProgram && (
            <button
              type="button"
              className={styles.btnInlineEdit}
              onClick={() => setQuickEditField("email")}
            >
              Editar
            </button>
          )}
        </label>
        <p className={styles.fieldTextStatic}>{info.email || "—"}</p>
      </div>

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
                  <strong>Inicio:</strong>{" "}
                  {c.open ? new Date(c.open).toLocaleDateString() : "—"}
                  <strong style={{ marginLeft: "1rem" }}>Fin:</strong>{" "}
                  {c.closed ? new Date(c.closed).toLocaleDateString() : "—"}
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

      {isProgram && (
        <>
          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Descripción</label>
            <div className={styles.textBlock}>
              {info?.about?.description || "Sin descripción"}
            </div>
          </div>

          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Objetivos</label>
            <div className={styles.textBlock}>
              {info?.about?.objectives || "Sin objetivos"}
            </div>
          </div>

          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Perfil</label>
            <div className={styles.textBlock}>
              {info?.about?.profile || "Sin perfil"}
            </div>
          </div>
        </>
      )}

      {ROLE_SECTIONS.map((section) => (
        <div className={styles.fieldContainer} key={section.key}>
          <label className={styles.fieldLabel}>
            {section.label}
            {logged.user.role === "root" && (
              <BsPersonFillAdd onClick={() => openAddModal(section.key)} />
            )}
          </label>

          {info?.[section.field]?.length > 0 ? (
            info[section.field].map((r, i) => (
              <div className={styles.boxPerson} key={r._id || i}>
                <p
                  className={styles.fieldText}
                  onClick={() =>
                    modal(`${r.firstName} ${r.lastName}`, [
                      ` Email: ${r.email || "—"}`,
                      `Teléfono laboral: ${r.phoneJob?.number || "—"}`,
                    ])
                  }
                >
                  {r.firstName} {r.lastName}
                </p>

                {logged.user.role === "root" && (
                  <FaTrash
                    className={styles.trash}
                    onClick={() =>
                      setConfirmDelete({
                        show: true,
                        type: section.key,
                        personId: r._id,
                      })
                    }
                  />
                )}
              </div>
            ))
          ) : (
            <p className={styles.fieldTextEmpty}>
              Sin {section.label.toLowerCase()}
            </p>
          )}
        </div>
      ))}

      {!isProgram && deviceWorkers?.length > 0 ? (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Lista de Trabajadores</label>

          {deviceWorkers.map((p) => (
            <div className={styles.boxPerson} key={p._id + p.dni}>
              <p
                className={styles.fieldText}
                onClick={() =>
                  modal(`${p.firstName} ${p.lastName}`, [
                    ` Email: ${p.email || "—"}`,
                    `Teléfono laboral: ${p.phoneJob?.number || "—"}`,
                    `Teléfono personal: ${p.phone || "—"}`,
                  ])
                }
              >
                {p.firstName} {p.lastName}
              </p>
            </div>
          ))}
        </div>
      ) : (
        !isProgram && (
          <div className={styles.fieldContainer}>
            <label className={styles.fieldLabel}>Lista de Trabajadores</label>
            <div className={styles.boxPerson}>
              <p>Este dispositivo no tiene trabajadores</p>
            </div>
          </div>
        )
      )}

      {isProgram && (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>Dispositivos asociados</label>

          {dispositivos.length > 0 ? (
            <ul className={styles.list}>
              {dispositivos.map((d) => (
                <li
                  key={d._id}
                  className={styles.listItem}
                  onClick={() => onSelect({ ...d, type: "dispositive" })}
                >
                  <strong>{d.name}</strong>
                  <span className={styles.iconSmall}>
                    <IoRadioButtonOn
                      className={d.active ? styles.activeDis : styles.inactiveDis}
                    />
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

      {!isProgram && (
        <div className={styles.fieldContainer}>
          <label className={styles.fieldLabel}>
            Centros de trabajo asociados

            <button
              type="button"
              className={styles.btnInlineEdit}
              onClick={() => setShowAddWorkplaceModal(true)}
            >
              Asignar
            </button>
          </label>

          {workplaces.length > 0 ? (
            <>
              <ul className={styles.list}>
                {workplaces.map((workplace) => {
                  const workplaceId =
                    typeof workplace === "string" ? workplace : workplace?._id;

                  const isSelected =
                    selectedWorkplaceId &&
                    String(selectedWorkplaceId) === String(workplaceId);

                  return (
                    <li key={workplaceId} className={styles.listItem}>
                      <div
                        className={styles.listItemMain}
                        onClick={() => toggleWorkplace(workplaceId)}
                      >
                        <strong>
                          {typeof workplace === "object"
                            ? workplace.name || "Centro de trabajo"
                            : "Centro de trabajo"}
                        </strong>

                        {typeof workplace === "object" && workplace.address && (
                          <span className={styles.subtext}>{workplace.address}</span>
                        )}

                        {typeof workplace === "object" && workplace.officeIdSesame && (
                          <span className={styles.subtext}>Oficina Sesame vinculada</span>
                        )}

                        <span className={styles.subtext}>
                          {isSelected ? "Ocultar gestión" : "Ver gestión"}
                        </span>
                      </div>

                      <button
                        type="button"
                        className="tomato"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmRemoveWorkplace({
                            _id: workplaceId,
                            name: typeof workplace === "object" ? workplace.name : "Centro de trabajo",
                          });
                        }}
                      >
                        Desasignar
                      </button>
                    </li>
                  );
                })}
              </ul>

              {selectedWorkplace &&
                workplaces.some((workplace) => {
                  const workplaceId = typeof workplace === "string" ? workplace : workplace?._id;
                  return String(workplaceId) === String(selectedWorkplaceId);
                }) && (
                  <div className={styles.workplaceExpandedBox}>
                    <InfoWorkplace
                      doc={selectedWorkplace}
                      modal={modal}
                      charge={charge}
                      enumsData={enumsData}
                      onDocUpdated={syncWorkplace}
                      canEdit={false}
                    />

                    <WorkplaceDispositivesPanel
                      doc={selectedWorkplace}
                      modal={modal}
                      charge={charge}
                      enumsData={enumsData}
                      onChanged={refreshSelectedWorkplace}
                      soloInfo={true}
                    />

                    <InfoSesameOffice
                      workplace={selectedWorkplace}
                      modal={modal}
                      charge={charge}
                      onCreateSesameOffice={handleCreateSesameOffice}
                    />
                  </div>
                )}
            </>
          ) : (
            <p className={styles.fieldTextEmpty}>
              Este dispositivo no tiene centros de trabajo asociados.
            </p>
          )}
        </div>
      )}

      {showAddWorkplaceModal && !isProgram && (
        <ModalForm
          title="Asignar centro de trabajo"
          message="Busca y selecciona el centro de trabajo que quieres vincular a este dispositivo."
          fields={[
            {
              name: "workplaceId",
              label: "Centro de trabajo",
              type: "async-search-select",
              placeholder: "Escribe al menos 3 letras...",
              required: true,
              loadOptions: searchWorkplaces,
            },
          ]}
          onSubmit={handleAddWorkplaceToDispositive}
          onClose={() => setShowAddWorkplaceModal(false)}
          modal={modal}
        />
      )}

      {showAddModal && (
        <ModalForm
          title={`Añadir ${addType === "responsible"
            ? "Responsable"
            : addType === "coordinators"
              ? "Coordinador"
              : "Supervisor"
            }`}
          message={`Busque y seleccione el ${addType === "responsible"
            ? "responsable"
            : addType === "coordinators"
              ? "coordinador"
              : "supervisor"
            } que desea añadir.`}
          fields={fieldsAddPerson}
          onSubmit={handleAddPerson}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {confirmDelete.show && (
        <ModalConfirmation
          title={`Eliminar ${confirmDelete.type === "responsible"
            ? "Responsable"
            : confirmDelete.type === "coordinators"
              ? "Coordinador"
              : "Supervisor"
            }`}
          message={`¿Seguro que deseas eliminar este ${confirmDelete.type === "responsible"
            ? "responsable"
            : confirmDelete.type === "coordinators"
              ? "coordinador"
              : "supervisor"
            }?`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleRemovePerson}
          onCancel={() => setConfirmDelete({ show: false, type: null, personId: null })}
        />
      )}

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

      {quickEditField && !isProgram && (
        <ModalForm
          title={quickEditTitles[quickEditField]}
          message={quickEditMessages[quickEditField]}
          fields={quickEditFieldsMap[quickEditField]}
          onSubmit={handleQuickUpdateDispositiveField}
          onClose={() => setQuickEditField(null)}
          modal={modal}
        />
      )}
      {confirmRemoveWorkplace && !isProgram && (
        <ModalConfirmation
          title="Desasignar centro de trabajo"
          message={`¿Seguro que quieres desasignar "${confirmRemoveWorkplace.name}" de este dispositivo?`}
          onConfirm={handleRemoveWorkplaceFromDispositive}
          onCancel={() => setConfirmRemoveWorkplace(null)}
        />
      )}


    </div>


  );
};

export default InfoProgramOrDispositive;