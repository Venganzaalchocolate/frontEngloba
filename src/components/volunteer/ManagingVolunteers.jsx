import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/ManagingEmployer.module.css";
import { TbFileTypeXml } from "react-icons/tb";

import { useDebounce } from "../../hooks/useDebounce.jsx";
import { useLogin } from "../../hooks/useLogin.jsx";
import { getToken } from "../../lib/serviceToken.js";
import { capitalizeWords } from "../../lib/utils.js";


import InfoVolunteer from "./InfoVolunteer.jsx";
import VolunteerInternalNotes from "./VolunteerInternalNotes.jsx";
import VolunteerChronology from "./VolunteerChronology.jsx"; // NUEVO
import FiltersVolunteer from "./FiltersVolunteer.jsx"

import {
  volunteerList,
  volunteerGetById,
  volunteerDisable,
  volunteerDelete,
  volunteerUpdate
} from "../../lib/data";
import DocumentMiscelaneaGeneric from "../globals/DocumentMiscelaneaGeneric.jsx";
import ModalConfirmation from "../globals/ModalConfirmation.jsx";
import VolunteerInterviewPanel from "./VolunteerInterviewPanel.jsx";

const ManagingVolunteers = ({ modal, charge, enumsData }) => {
  
  const { logged } = useLogin();
  const isRootOrGlobal = true

  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  // paginación
  const [limit, setLimit] = useState(50);
  const [page, setPage] = useState(1);

  // lista
  const [items, setItems] = useState([]);
  const [totalPages, setTotalPages] = useState(0);

  //modal eliminar/desactivar
  const [showModal, setShowModal]=useState('')

  // filtros
  const [filters, setFilters] = useState({
    q: "",
    province: "",
    programId: "",
    area: "",
    active: "total", // total | active | inactive
  });

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
  return arr.join(", ");
};

const stateKey = (s) =>
  String(s || "no asignado").toLowerCase().trim().replace(/\s+/g, "_");

const getState = (v) => (v?.state || "no asignado");
const onChangeStateInline = async (id, nextState) => {
  try {
    charge?.(true);
    const token = getToken();

    const updated = await volunteerUpdate(
      { volunteerApplicationId: id, state: nextState },
      token
    );
    console.log(updated)

    if (updated?.error) {
      modal?.("Error", updated.message || "No se pudo cambiar el estado");
      return;
    }

    // Normaliza por si tu fetchData envuelve en data
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
  const loadList = async (showLoader = false) => {
    if (showLoader) charge(true);
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
      }));

      setItems(normalized);
      setTotalPages(pages || 0);
    } catch (e) {
      modal("Error", e?.message || "Ocurrió un error inesperado");
    } finally {
      if (showLoader) charge(false);
    }
  };

  useEffect(() => {
    if (logged?.isLoggedIn) loadList(true);
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

      const normalized = {
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
      };

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

  // -------------------------
  // DISABLE / DELETE
  // -------------------------
  const onDisable = async () => {
    if (!isRootOrGlobal || !selectedId) return;

    try {
      charge(true);
      const token = getToken();
      const updated = await volunteerDisable(
        { volunteerApplicationId: selectedId },
        token
      );

      if (updated?.error) {
        modal("Error", updated.message || "No se pudo desactivar");
        return;
      }
      setShowModal('')
      modal("Voluntariado", "Solicitud desactivada");
      updateSelectedLocally(updated);
      await loadList(false);
      
    } catch (e) {
      modal("Error", e?.message || "No se pudo desactivar");
    } finally {
      charge(false);
    }
  };

  const onDelete = async () => {
    if (!isRootOrGlobal || !selectedId) return;


    try {
      charge(true);
      const token = getToken();
      const resp = await volunteerDelete(
        { volunteerApplicationId: selectedId },
        token
      );

      if (resp?.error) {
        modal("Error", resp.message || "No se pudo eliminar");
        return;
      }
      setShowModal('')
      modal("Voluntariado", "Solicitud eliminada");
      setSelected(null);
      setSelectedId(null);
      await loadList(false);
      
    } catch (e) {
      modal("Error", e?.message || "No se pudo eliminar");
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

  const renderExpanded = (doc) => (
    <div
      className={styles.contenedorEmployer}
      style={{ flexDirection: "column" }}
    >
      <InfoVolunteer
        doc={doc}
        modal={modal}
        charge={charge}
        enumsData={enumsData}
        canEdit={isRootOrGlobal}
        onUpdated={(u) => {
          updateSelectedLocally(u);
          loadList(false);
        }}
      />

      <VolunteerChronology
        doc={doc}
        modal={modal}
        charge={charge}
        enumsData={enumsData}
        currentUserId={logged?.user?._id}
        canWrite={isRootOrGlobal}
        onChronologyUpdated={(chronology) => {
          updateSelectedLocally({ _id: doc._id, chronology });
        }}
      />

      <VolunteerInternalNotes
        doc={doc}
        modal={modal}
        charge={charge}
        currentUserId={logged?.user?._id}
        canWrite={isRootOrGlobal}
        onNotesUpdated={(notes) => {
          updateSelectedLocally({ _id: doc._id, internalNotes: notes });
        }}
      />

      <VolunteerInterviewPanel
        doc={doc}
        modal={modal}
        charge={charge}
        canEdit={isRootOrGlobal}

        onInterviewsUpdated={(interviews) => {
    updateSelectedLocally({ _id: doc._id, interview: interviews });
  }}
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
          onChange={(x) => updateSelectedLocally(x)}
        />

         {showModal=='eliminar' && (
        <ModalConfirmation
          title="Eliminar voluntario"
          message={`¿Estás seguro de que quieres eliminar el formulario del voluntario ${doc.firstName} ${doc.lastName}?`}
          onConfirm={()=>onDelete()}
          onCancel={()=>setShowModal('')}
        />
      )}
      {showModal=='desactivar' && (
        <ModalConfirmation
          title="Desactivar voluntario"
          message={`¿Estás seguro de que quieres desctivar el formulario de ${doc.firstName} ${doc.lastName}?`}
          onConfirm={()=>onDisable()}
          onCancel={()=>setShowModal('')}
        />
      )}

      
        <div className={styles.contenedorEmployerButtonVolun}>
          
            {isRootOrGlobal && (
            <button onClick={()=>setShowModal('eliminar')} className="tomato">Eliminar</button>  
            )}
            <button onClick={()=>setShowModal('desactivar')} disabled={!doc?.active}>
              Desactivar
            </button>
          
        </div>
    
    </div>
  );

const renderRow = (v) => {
  const rowClass = !v.active
    ? `${styles.tableContainer} ${styles.isOnLeave}`
    : styles.tableContainer;

  const s = getState(v);
  const sClass = styles[`state_${stateKey(s)}`] || "";

  return (
    <div className={styles.containerEmployer} key={v._id}>
      <div>
        <div className={rowClass} onClick={() => openVolunteer(v._id)}>
          <div className={styles.tableCell}>{v.firstName}</div>
          <div className={styles.tableCell}>{v.lastName}</div>

          {/* NUEVO */}
          <div className={styles.tableCell}>{getProvinceLabel(v)}</div>
          <div className={styles.tableCell}>{getAreasLabel(v)}</div>

          {/* Estado con select inline */}
          <div className={styles.tableCellStatus}>
            <select
              className={`${styles.stateSelect} ${sClass}`}
              value={s}
              onClick={(e) => e.stopPropagation()}      // 👈 clave: no abrir/cerrar panel
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


  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>GESTIÓN DE VOLUNTARIADO</h2>
            <TbFileTypeXml
              title="(pendiente) Exportar"
              onClick={() => modal("Info", "Export pendiente de implementar")}
            />
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
              
              <button
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
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
  <div className={styles.tableCell}>Nombre</div>
  <div className={styles.tableCell}>Apellidos</div>

  {/* NUEVO */}
  <div className={styles.tableCell}>Provincia</div>
  <div className={styles.tableCell}>Áreas</div>

  <div className={styles.tableCellStatus}>Estado</div>
</div>


              {activeItems.map(renderRow)}

              {inactiveItems.length > 0 && (
                <>
                  <div className={styles.sectionDivider} />
                  <h3 className={styles.sectionTitle}>INACTIVOS</h3>
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
