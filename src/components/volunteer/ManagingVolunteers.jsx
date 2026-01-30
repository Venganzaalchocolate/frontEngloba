import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/ManagingEmployer.module.css";
import { TbFileTypeXml } from "react-icons/tb";

import { useDebounce } from "../../hooks/useDebounce.jsx";
import { useLogin } from "../../hooks/useLogin.jsx";
import { getToken } from "../../lib/serviceToken.js";
import { capitalizeWords, formatDatetime } from "../../lib/utils.js";

import InfoVolunteer from "./InfoVolunteer.jsx";
import VolunteerInternalNotes from "./VolunteerInternalNotes.jsx";
import VolunteerChronology from "./VolunteerChronology.jsx";
import FiltersVolunteer from "./FiltersVolunteer.jsx";
import CreateVolunteerDocumentXLS from "./CreateVolunteerDocumentXLS.jsx";


import {
  volunteerList,
  volunteerGetById,
  volunteerDisable,
  volunteerDelete,
  volunteerUpdate,
  volunteerEnable,
  volunteerGetNotLimit
} from "../../lib/data";

import DocumentMiscelaneaGeneric from "../globals/DocumentMiscelaneaGeneric.jsx";
import ModalConfirmation from "../globals/ModalConfirmation.jsx";
import VolunteerInterviewPanel from "./VolunteerInterviewPanel.jsx";
import ModalForm from "../globals/ModalForm.jsx";

const ManagingVolunteers = ({ modal, charge, enumsData }) => {
  const { logged } = useLogin();
  const isRootOrGlobal = true;

  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // paginación
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // lista
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  // modal eliminar/desactivar/activar
  const [showModal, setShowModal] = useState("");

  //EXCEL
  const [volunteerXLS, setVolunteerXLS] = useState(null);


  // filtros
  const [filters, setFilters] = useState({
    q: "",
    province: "",
    programId: "",
    area: "",
    active: "total", // total | active | inactive
  });

  const todayISO = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const debouncedFilters = useDebounce(filters, 300);

  const getProvinceLabel = (v) => {
    const p = v?.province;
    if (!p) return "—";
    // si viene populate
    if (typeof p === "object") return (p.name || "—").trim();
    // si viene como id, intenta enumsData
    const name = enumsData?.provincesIndex?.[p]?.name;
    return (name || "—").trim();
  };

  const getAreasLabel = (v) => {
    const arr = Array.isArray(v?.areaInterest) ? v.areaInterest : [];
    if (!arr.length) return "—";
    return arr.join(", ").toUpperCase();
  };

  const stateKey = (s) =>
    String(s || "no asignado")
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "_");

  const getState = (v) => v?.state || "no asignado";

  const onChangeStateInline = async (id, nextState) => {
    try {
      charge?.(true);
      const token = getToken();

      const updated = await volunteerUpdate(
        { volunteerApplicationId: id, state: nextState },
        token
      );

      if (updated?.error) {
        modal?.("Error", updated.message || "No se pudo cambiar el estado");
        return;
      }

      const doc = updated?.data || updated;
      updateSelectedLocally({ _id: id, state: doc?.state || nextState });
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo cambiar el estado");
    } finally {
      charge?.(false);
    }
  };

  // -------------------------
  // LIST
  // -------------------------
  const loadList = async () => {
    charge(true);
    try {
      const token = getToken();

      const payload = {
        q: debouncedFilters.q || undefined,
        page,
        limit,
        province: debouncedFilters.province || undefined,
        programId: debouncedFilters.programId || undefined,
        area: debouncedFilters.area || undefined,
      };

      if (debouncedFilters.active === "active") payload.active = true;
      if (debouncedFilters.active === "inactive") payload.active = false;

      const hasExtra = !!debouncedFilters.email || !!debouncedFilters.phone;
      if (hasExtra && !payload.q) {
        payload.q = debouncedFilters.email || debouncedFilters.phone;
      }

      const data = await volunteerList(payload, token);

      if (data?.error) {
        modal("Error", data.message || "No se pudo cargar el listado");
        return;
      }

      const rawItems = data?.items || data?.data?.items || [];
      const pages = data?.pages || data?.data?.pages || 0;

      const normalized = rawItems.map((v) => ({
        ...v,
        firstName: v.firstName ? capitalizeWords(v.firstName) : "",
        lastName: v.lastName ? capitalizeWords(v.lastName) : "",
        // ✅ computed por backend (mientras migramos)
        active: v?.active ?? true,
        lastStatus: v?.lastStatus || null,
      }));

      setItems(normalized);
      setTotalPages(pages || 0);
    } catch (e) {
      modal("Error", e?.message || "Ocurrió un error inesperado");
    } finally {
      charge(false);
    }
  };

  useEffect(() => {
    if (logged?.isLoggedIn) loadList();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedFilters, page, limit]);

  // -------------------------
  // GET BY ID
  // -------------------------
  const openVolunteer = async (id) => {
    if (selectedId === id) {
      setSelected(null);
      setSelectedId(null);
      return;
    }

    try {
      charge(true);
      const token = getToken();
      const doc = await volunteerGetById({ volunteerApplicationId: id }, token);

      if (doc?.error) {
        modal("Error", doc.message || "No se pudo cargar la solicitud");
        return;
      }

      const normalized = normalizeVolunteerDoc(doc?.data || doc);
      setSelected(normalized);
      setSelectedId(id);
    } catch (e) {
      modal("Error", e?.message || "No se pudo cargar la solicitud");
    } finally {
      charge(false);
    }
  };

  // -------------------------
  // UPDATE LOCAL
  // -------------------------
  const updateSelectedLocally = (updatedDoc) => {
    if (!updatedDoc?._id) return;

    setItems((prev) =>
      prev.map((x) => (x._id === updatedDoc._id ? { ...x, ...updatedDoc } : x))
    );

    if (selectedId === updatedDoc._id) {
      setSelected((prev) => ({ ...(prev || {}), ...updatedDoc }));
    }
  };

  // snapshot optimistic patch
  const optimisticPatch = (patch) => {
    const prevItems = items;
    const prevSelected = selected;

    if (patch?._id) updateSelectedLocally(patch);

    return () => {
      setItems(prevItems);
      setSelected(prevSelected);
    };
  };

  // -------------------------
  // DELETE
  // -------------------------
  const optimisticRemove = (id) => {
    const prevItems = items;
    const prevSelected = selected;
    const prevSelectedId = selectedId;

    setItems((prev) => prev.filter((x) => x._id !== id));
    if (prevSelectedId === id) {
      setSelected(null);
      setSelectedId(null);
    }

    return () => {
      setItems(prevItems);
      setSelected(prevSelected);
      setSelectedId(prevSelectedId);
    };
  };

  const onDelete = async () => {
    if (!isRootOrGlobal || !selectedId) return;

    const id = selectedId;
    const rollback = optimisticRemove(id);

    try {
      charge(true);
      const token = getToken();

      const resp = await volunteerDelete({ volunteerApplicationId: id }, token);

      if (resp?.error) {
        rollback();
        modal("Error", resp.message || "No se pudo eliminar");
        return;
      }

      setShowModal("");
      modal("Voluntariado", "Solicitud eliminada");
    } catch (e) {
      rollback();
      modal("Error", e?.message || "No se pudo eliminar");
    } finally {
      charge(false);
    }
  };

  // -------------------------
  // DISABLE / ENABLE (statusEvents)
  // -------------------------
  const onDisable = async (dateDisable, disabledReason) => {
    if (!isRootOrGlobal || !selectedId) return;

    const rollback = optimisticPatch({ _id: selectedId, active: false });

    try {
      charge(true);
      const token = getToken();

      const updated = await volunteerDisable(
        { volunteerApplicationId: selectedId, dateDisable, disabledReason },
        token
      );

      if (updated?.error) {
        rollback();
        modal("Error", updated.message || "No se pudo desactivar");
        return;
      }

      setShowModal("");
      modal("Voluntariado", "Solicitud desactivada");

      const doc = normalizeVolunteerDoc(updated?.data || updated);
      updateSelectedLocally({
        _id: selectedId,
        active: doc?.active ?? false,
        lastStatus: doc?.lastStatus || null,
        statusEvents: doc?.statusEvents || [],
      });
    } catch (e) {
      rollback();
      modal("Error", e?.message || "No se pudo desactivar");
    } finally {
      charge(false);
    }
  };

  const onEnable = async (dateEnable) => {
    if (!isRootOrGlobal || !selectedId) return;

    const rollback = optimisticPatch({ _id: selectedId, active: true });

    try {
      charge(true);
      const token = getToken();

      const updated = await volunteerEnable(
        { volunteerApplicationId: selectedId, dateEnable },
        token
      );

      if (updated?.error) {
        rollback();
        modal("Error", updated.message || "No se pudo activar");
        return;
      }

      setShowModal("");
      modal("Voluntariado", "Solicitud activada");

      const doc = normalizeVolunteerDoc(updated?.data || updated);
      updateSelectedLocally({
        _id: selectedId,
        active: doc?.active ?? true,
        lastStatus: doc?.lastStatus || null,
        statusEvents: doc?.statusEvents || [],
      });
    } catch (e) {
      rollback();
      modal("Error", e?.message || "No se pudo activar");
    } finally {
      charge(false);
    }
  };

  // -------------------------
  // Agrupar activos/inactivos
  // -------------------------
  const { activeItems, inactiveItems } = useMemo(() => {
    const a = [];
    const b = [];
    for (const it of items) (it.active ? a : b).push(it);
    return { activeItems: a, inactiveItems: b };
  }, [items]);

  // -------------------------
  // Handlers filtros/paginación
  // -------------------------
  const handleLimitChange = useCallback((e) => {
    setLimit(parseInt(e.target.value, 10));
    setPage(1);
    setSelected(null);
    setSelectedId(null);
  }, []);

  const handlePageChange = useCallback((newPage) => {
    setPage(newPage);
  }, []);

  const handleFilterChange = useCallback((e) => {
    const { name, value } = e.target;
    setPage(1);
    setSelected(null);
    setSelectedId(null);
    setFilters((prev) => ({ ...prev, [name]: value || "" }));
  }, []);

  const resetFilters = useCallback(() => {
    setPage(1);
    setSelected(null);
    setSelectedId(null);
    setFilters({
      q: "",
      email: "",
      phone: "",
      province: "",
      programId: "",
      area: "",
      active: "total",
    });
  }, []);

  // -------------------------
  // Normalización doc back -> front
  // -------------------------
  const normalizeVolunteerDoc = (doc) => {
    if (!doc?._id) return doc;

    return {
      ...doc,

      province: doc?.province?._id || doc?.province || "",
      studies: Array.isArray(doc?.studies)
        ? doc.studies.map((x) => x?._id || x).filter(Boolean)
        : [],
      programInterest: Array.isArray(doc?.programInterest)
        ? doc.programInterest.map((x) => x?._id || x).filter(Boolean)
        : [],
      areaInterest: Array.isArray(doc?.areaInterest) ? doc.areaInterest : [],
      occupation: Array.isArray(doc?.occupation) ? doc.occupation : [],
      chronology: Array.isArray(doc?.chronology) ? doc.chronology : [],
      interview: Array.isArray(doc?.interview) ? doc.interview : [],
      internalNotes: Array.isArray(doc?.internalNotes) ? doc.internalNotes : [],

      firstName: doc.firstName ? capitalizeWords(doc.firstName) : "",
      lastName: doc.lastName ? capitalizeWords(doc.lastName) : "",

      // ✅ computed por backend mientras migramos
      active: doc?.active ?? true,
      lastStatus: doc?.lastStatus || null,
      statusEvents: Array.isArray(doc?.statusEvents) ? doc.statusEvents : [],
    };
  };

  // ✅ sync general para hijos (doc completo del back)
  const syncVolunteerDoc = useCallback(
    (incoming) => {
      const doc = normalizeVolunteerDoc(incoming);
      if (!doc?._id) return;

      setItems((prev) => prev.map((x) => (x._id === doc._id ? { ...x, ...doc } : x)));

      setSelected((prev) => {
        if (selectedId === doc._id) return { ...(prev || {}), ...doc };
        return prev;
      });
    },
    [selectedId]
  );

  const getVolunteersNotLimit = async () => {
    try {
      charge(true);
      const token = getToken();

      const payload = {
        q: debouncedFilters.q || undefined,
        province: debouncedFilters.province || undefined,
        programId: debouncedFilters.programId || undefined,
        area: debouncedFilters.area || undefined,
      };

      if (debouncedFilters.active === "active") payload.active = true;
      if (debouncedFilters.active === "inactive") payload.active = false;

      const data = await volunteerGetNotLimit(payload, token);
      if (data?.error) throw new Error(data.message || "No se pudo exportar");

      return data?.items || data?.data?.items || [];
    } catch (e) {
      modal("Error", e?.message || "Error al obtener voluntariado");
      return [];
    } finally {
      charge(false);
    }
  };

  const openXlsForm = async () => {
    const all = await getVolunteersNotLimit();
    if (!all || all.length === 0) {
      modal?.("Info", "No hay voluntarios para exportar con los filtros actuales");
      return;
    }
    setVolunteerXLS(all);
  };


  // -------------------------
  // Render expandido
  // -------------------------
  const renderExpanded = (doc) => (
    <div className={styles.contenedorEmployer} style={{ flexDirection: "column" }}>
      <div className={styles.contenedorEmployerButtonVolun}>
        {isRootOrGlobal && (
          <button onClick={() => setShowModal("eliminar")} className="tomato">
            Eliminar
          </button>
        )}
        {!doc?.active
          ? (
            <button onClick={() => setShowModal("activar")}>
              Dar de Alta
            </button>
          )
          : <button onClick={() => setShowModal("desactivar")} disabled={!doc?.active}>
            Dar de Baja
          </button>
        }
      </div>
      <InfoVolunteer
        doc={doc}
        modal={modal}
        charge={charge}
        enumsData={enumsData}
        canEdit={isRootOrGlobal}
        onDocUpdated={(fullDocFromBack) => syncVolunteerDoc(fullDocFromBack)}
      />

      <VolunteerChronology
        doc={doc}
        modal={modal}
        charge={charge}
        enumsData={enumsData}
        currentUserId={logged?.user?._id}
        canWrite={isRootOrGlobal}
        onDocUpdated={(fullDocFromBack) => syncVolunteerDoc(fullDocFromBack)}
      />

      <VolunteerInternalNotes
        doc={doc}
        modal={modal}
        charge={charge}
        currentUserId={logged?.user?._id}
        canWrite={isRootOrGlobal}
        onDocUpdated={(fullDocFromBack) => syncVolunteerDoc(fullDocFromBack)}
      />

      <VolunteerInterviewPanel
        doc={doc}
        modal={modal}
        charge={charge}
        canEdit={isRootOrGlobal}
        onDocUpdated={(fullDocFromBack) => syncVolunteerDoc(fullDocFromBack)}
      />

      <DocumentMiscelaneaGeneric
        key="docs"
        data={doc}
        modelName="VolunteerApplication"
        modal={modal}
        charge={charge}
        authorized={true}
        enumsData={enumsData}
        categoryFiles={enumsData.categoryFiles}
        officialDocs={enumsData.documentation.filter((x) => x.model === "VolunteerApplication")}
        onChange={(fullDocFromBack) => syncVolunteerDoc(fullDocFromBack)}
      />

      {showModal === "eliminar" && (
        <ModalConfirmation
          title="Eliminar voluntario"
          message={`¿Estás seguro de que quieres eliminar el formulario del voluntario ${doc.firstName} ${doc.lastName}?`}
          onConfirm={() => onDelete()}
          onCancel={() => setShowModal(false)}
        />
      )}

      {showModal === "desactivar" && (
        <ModalForm
          title="Dar de Baja voluntario"
          submitText="Confirmar baja"
          cancelText="Cancelar"
          initialValues={{ dateDisable: todayISO, disabledReason: "" }}
          fields={[
            { name: "dateDisable", label: "Fecha de baja", type: "date", required: true },
            { name: "disabledReason", label: "Motivo de la baja", type: "textarea" },
          ]}
          onSubmit={(values) => onDisable(values.dateDisable, values.disabledReason)}
          onClose={() => setShowModal(false)}
        />
      )}

      {showModal === "activar" && (
        <ModalForm
          title="Dar de Alta voluntario"
          submitText="Confirmar alta"
          cancelText="Cancelar"
          initialValues={{ dateEnable: todayISO }}
          fields={[{ name: "dateEnable", label: "Fecha de alta", type: "date", required: true }]}
          onSubmit={(values) => onEnable(values.dateEnable)}
          onClose={() => setShowModal(false)}
        />
      )}



    </div>
  );

  // -------------------------
  // Render row
  // -------------------------
  const renderRow = (v) => {
    const s = getState(v);
    const sKey = stateKey(s);

    const rowClass = [
      styles.tableContainer,
      !v.active ? styles.bajaVoluntario : "",
      styles[`row_${sKey}`] || "",
    ]
      .filter(Boolean)
      .join(" ");

    const sClass = styles[`state_${sKey}`] || "";

    return (
      <div className={styles.containerEmployer} key={v._id}>
        <div>
          <div className={rowClass} onClick={() => openVolunteer(v._id)}>
            <div className={styles.tableCell}>{formatDatetime(v.createdAt)}</div>
            <div className={styles.tableCell}>{v.firstName}</div>
            <div className={styles.tableCell}>{v.lastName}</div>
            <div className={styles.tableCell}>{getProvinceLabel(v)}</div>
            <div className={styles.tableCell}>{getAreasLabel(v)}</div>

            <div className={styles.tableCellStatus}>
              <select
                className={`${styles.stateSelect} ${sClass}`}
                value={s}
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => {
                  e.stopPropagation();
                  onChangeStateInline(v._id, e.target.value);
                }}
              >
                <option value="no asignado">No asignado</option>
                <option value="activo">Activo</option>
                <option value="pendiente">Pendiente</option>
                <option value="descartado">Descartado</option>
              </select>
            </div>
          </div>

          {selectedId === v._id && selected && renderExpanded(selected)}
        </div>
      </div>
    );
  };

  // -------------------------
  // Render component
  // -------------------------
  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>GESTIÓN DE VOLUNTARIADO</h2>
            <TbFileTypeXml
              title="Exportar XLS"
              onClick={openXlsForm}
              style={{ cursor: "pointer" }}
            />

            {!!volunteerXLS && (
              <CreateVolunteerDocumentXLS
                volunteers={volunteerXLS}
                enumsData={enumsData}
                closeXls={() => setVolunteerXLS(null)}
                modal={modal}
              />
            )}
          </div>

          <div className={styles.paginacion}>
            <div>
              <label htmlFor="limit">Items por página:</label>
              <select id="limit" value={limit} onChange={handleLimitChange}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div>
              <button onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                {"<"}
              </button>
              <span>Página {page}</span>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || totalPages === 0}
              >
                {">"}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.caja}>
          <FiltersVolunteer
            filters={filters}
            enums={enumsData}
            handleFilterChange={handleFilterChange}
            resetFilters={resetFilters}
            setFilters={setFilters}
          />

          <div className={styles.containerTableContainer}>
            <div>
              <div className={styles.tableContainer} id={styles.cabeceraTabla}>
                <div className={styles.tableCell}>Fecha Creación</div>
                <div className={styles.tableCell}>Nombre</div>
                <div className={styles.tableCell}>Apellidos</div>

                <div className={styles.tableCell}>Provincia</div>
                <div className={styles.tableCell}>Áreas</div>

                <div className={styles.tableCellStatus}>Estado</div>
              </div>

              {activeItems.map(renderRow)}

              {inactiveItems.length > 0 && (
                <>
                  <div className={styles.sectionDivider} />
                  <h3 className={styles.sectionTitle}>BAJA</h3>
                  {inactiveItems.map(renderRow)}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ManagingVolunteers;
