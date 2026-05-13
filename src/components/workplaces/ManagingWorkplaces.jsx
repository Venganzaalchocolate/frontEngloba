import { useCallback, useEffect, useMemo, useState } from "react";
import InfoSesameOffice from "../sesame/InfoSesameOffice.jsx";


import styles from "../styles/workplaces.module.css";
import { FaSquarePlus } from "react-icons/fa6";

import { useDebounce } from "../../hooks/useDebounce.jsx";
import { getToken } from "../../lib/serviceToken.js";

import FiltersWorkplaces from "./FiltersWorkplaces.jsx";
import InfoWorkplace from "./InfoWorkplace.jsx";
import WorkplaceDispositivesPanel from "./WorkplaceDispositivesPanel.jsx";


import ModalForm from "../globals/ModalForm.jsx";
import ModalConfirmation from "../globals/ModalConfirmation.jsx";

import {
  createWorkplace,
  listWorkplaces,
  getWorkplaceId,
  updateWorkplace,
  deleteWorkplace,
} from "../../lib/data";

export default function ManagingWorkplaces({ modal, charge, enumsData }) {
  const [items, setItems] = useState([]);
  const [selected, setSelected] = useState(null);
  const [selectedId, setSelectedId] = useState(null);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(0);

  const [showModal, setShowModal] = useState("");
  const [sesameOfficeTarget, setSesameOfficeTarget] = useState(null);

  const [filters, setFilters] = useState({
  q: "",
  province: "",
  programId: "",
  dispositive: "",
  active: "total",
});


  const debouncedFilters = useDebounce(filters, 300);



  const provinceOptions = useMemo(() => {
    return Object.entries(enumsData?.provincesIndex || {})
      .map(([id, p]) => ({ value: id, label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [enumsData]);

  const createFields = useMemo(() => [
    { name: "section1", type: "section", label: "Datos del centro de trabajo" },
    {
      name: "province",
      label: "Provincia",
      type: "select",
      required: true,
      options: [{ value: "", label: "Seleccione provincia" }, ...provinceOptions],
    },
    {
      name: "address",
      label: "Dirección",
      type: "text",
      required: true,
      defaultValue: "",
    },
    {
      name: "phone",
      label: "Teléfono de la oficina",
      type: "text",
      defaultValue: "",
    },
    { name: "section2", type: "section", label: "Dirección resuelta" },
    {
      name: "city",
      label: "Municipio",
      type: "text",
      defaultValue: "",
    },
    {
      name: "postcode",
      label: "Código postal",
      type: "text",
      defaultValue: "",
    },
    { name: "section3", type: "section", label: "Coordenadas" },
    {
      name: "lat",
      label: "Latitud",
      type: "text",
      defaultValue: "",
    },
    {
      name: "lng",
      label: "Longitud",
      type: "text",
      defaultValue: "",
    },
    {
      name: "createSesameOffice",
      label: "¿Crear oficina en Sesame?",
      type: "select",
      required: true,
      defaultValue: false,
      options: [
        { value: false, label: "No" },
        { value: true, label: "Sí" },
      ],
    },
  ], [provinceOptions]);

  const createSesameOfficeFields = useMemo(() => [
    {
      name: "address",
      label: "Dirección",
      type: "text",
      required: true,
      defaultValue: sesameOfficeTarget?.address || "",
    },
    {
      name: "lat",
      label: "Latitud",
      type: "text",
      required: true,
      defaultValue: sesameOfficeTarget?.coordinates?.lat ?? "",
    },
    {
      name: "lng",
      label: "Longitud",
      type: "text",
      required: true,
      defaultValue: sesameOfficeTarget?.coordinates?.lng ?? "",
    },
  ], [sesameOfficeTarget]);

  /**
   * Carga el listado de centros con filtros y paginación.
   */
  const loadWorkplaces = useCallback(async () => {
    charge(true);

    const payload = {
  page,
  limit,
  ...(debouncedFilters.q?.trim() && { q: debouncedFilters.q.trim() }),
  ...(debouncedFilters.province && { province: debouncedFilters.province }),
  ...(debouncedFilters.programId && { programId: debouncedFilters.programId }),
  ...(debouncedFilters.dispositive && { dispositive: debouncedFilters.dispositive }),
  ...(debouncedFilters.active === "active" && { active: true }),
  ...(debouncedFilters.active === "inactive" && { active: false }),
};

    const res = await listWorkplaces(payload, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudieron cargar los centros.");
      charge(false);
      return;
    }

    setItems(res.items || []);
    setTotalPages(res.pages || 0);
    charge(false);
  }, [page, limit, debouncedFilters]);

  /**
   * Carga el listado cuando cambian página, límite o filtros.
   */
  useEffect(() => {
    loadWorkplaces();
  }, [loadWorkplaces]);

  /**
   * Abre o cierra el detalle de un centro.
   */
  const openWorkplace = async (id) => {
    if (selectedId === id) {
      setSelectedId(null);
      setSelected(null);
      return;
    }

    charge(true);

    const res = await getWorkplaceId({ workplaceId: id }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo cargar el centro.");
      charge(false);
      return;
    }

    setSelectedId(id);
    setSelected(res);
    charge(false);
  };

  /**
   * Sincroniza en pantalla un centro actualizado.
   */
  const syncWorkplace = (doc) => {
    if (!doc?._id) return;

    setItems((prev) => prev.map((x) => (x._id === doc._id ? { ...x, ...doc } : x)));
    setSelected((prev) => (prev?._id === doc._id ? { ...prev, ...doc } : prev));
  };

  /**
   * Comprueba si un centro tiene coordenadas válidas.
   */
  const hasValidCoordinates = (doc) => {
    return (
      Number.isFinite(Number(doc?.coordinates?.lat)) &&
      Number.isFinite(Number(doc?.coordinates?.lng))
    );
  };

  /**
   * Abre el flujo para crear oficina Sesame o la crea directamente si ya tiene datos.
   */
  const handleCreateSesameOffice = async (doc) => {
    if (!doc?._id) return;

    if (!doc.address || !hasValidCoordinates(doc)) {
      setSesameOfficeTarget(doc);
      setShowModal("crear-sesame");
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
    modal("Sesame", "Oficina creada correctamente en Sesame.");
    charge(false);
  };

  /**
   * Crea la oficina Sesame completando dirección y coordenadas desde el modal.
   */
  const handleCreateSesameOfficeSubmit = async (values) => {
    if (!sesameOfficeTarget?._id) return;

    charge(true);

    const res = await updateWorkplace(
      {
        workplaceId: sesameOfficeTarget._id,
        address: values.address,
        coordinates: {
          lat: values.lat,
          lng: values.lng,
        },
        createSesameOffice: true,
      },
      getToken()
    );

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo crear la oficina en Sesame.");
      charge(false);
      return;
    }

    setShowModal("");
    setSesameOfficeTarget(null);
    syncWorkplace(res);
    modal("Sesame", "Oficina creada correctamente en Sesame.");
    charge(false);
  };

  /**
   * Actualiza filtros y reinicia la selección.
   */
  const handleFilterChange = (e) => {
    const { name, value } = e.target;

    setPage(1);
    setSelected(null);
    setSelectedId(null);
    setFilters((prev) => ({ ...prev, [name]: value }));
  };

  /**
   * Limpia todos los filtros.
   */
  const resetFilters = () => {
  setPage(1);
  setSelected(null);
  setSelectedId(null);

  setFilters({
    q: "",
    province: "",
    programId: "",
    dispositive: "",
    active: "total",
  });
};

  /**
   * Cambia de página en el listado.
   */
  const handlePageChange = (nextPage) => {
    if (nextPage < 1 || (totalPages && nextPage > totalPages)) return;

    setPage(nextPage);
    setSelected(null);
    setSelectedId(null);
  };

  /**
   * Cambia el número de registros por página.
   */
  const handleLimitChange = (e) => {
    setLimit(Number(e.target.value));
    setPage(1);
    setSelected(null);
    setSelectedId(null);
  };

  /**
   * Crea un nuevo centro de trabajo.
   */
  const handleCreate = async (values) => {
    charge(true);

    const payload = {
      province: values.province,
      address: values.address,
      phone: values.phone || "",
      createSesameOffice: values.createSesameOffice === true || values.createSesameOffice === "true",
      ...(values.city || values.postcode
        ? {
            resolvedAddress: {
              city: values.city || "",
              postcode: values.postcode || "",
              country: "España",
              source: "manual",
              resolvedAt: new Date(),
            },
          }
        : {}),
      ...(values.lat || values.lng
        ? {
            coordinates: {
              lat: values.lat,
              lng: values.lng,
            },
          }
        : {}),
    };

    const res = await createWorkplace(payload, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo crear el centro.");
      charge(false);
      return;
    }

    setShowModal("");
    await loadWorkplaces();
    modal("Centros de trabajo", "Centro creado correctamente.");
    charge(false);
  };

  /**
   * Elimina el centro seleccionado.
   */
  const handleDelete = async () => {
    if (!selected?._id) return;

    charge(true);

    const res = await deleteWorkplace({ workplaceId: selected._id }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo eliminar el centro.");
      charge(false);
      return;
    }

    setShowModal("");
    setSelected(null);
    setSelectedId(null);
    await loadWorkplaces();
    modal("Centros de trabajo", "Centro eliminado correctamente.");
    charge(false);
  };

  /**
   * Devuelve el nombre de provincia para mostrar en tabla.
   */
  const getProvinceLabel = (doc) => {
    if (!doc.province) return "—";
    if (typeof doc.province === "object") return doc.province.name || "—";
    return enumsData?.provincesIndex?.[doc.province]?.name || "—";
  };

  /**
   * Renderiza el panel expandido del centro seleccionado.
   */
  const renderExpanded = (doc) => (
    <div className={styles.contenedorEmployer}>
      <div className={styles.contenedorEmployerButtonVolun}>
        <button className="tomato" type="button" onClick={() => setShowModal("eliminar")}>
          Eliminar
        </button>
      </div>

      <InfoWorkplace
        doc={doc}
        modal={modal}
        charge={charge}
        enumsData={enumsData}
        onDocUpdated={syncWorkplace}
      />

<WorkplaceDispositivesPanel
  doc={doc}
  modal={modal}
  charge={charge}
  enumsData={enumsData}
  onChanged={async () => {
    const res = await getWorkplaceId({ workplaceId: doc._id }, getToken());

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo refrescar el centro.");
      return;
    }

    syncWorkplace(res);
  }}
/>

      <InfoSesameOffice
        workplace={doc}
        modal={modal}
        charge={charge}
        onCreateSesameOffice={handleCreateSesameOffice}
      />

      {showModal === "eliminar" && (
        <ModalConfirmation
          title="Eliminar centro de trabajo"
          message={`¿Seguro que quieres eliminar el centro "${doc.name}"?`}
          onConfirm={handleDelete}
          onCancel={() => setShowModal("")}
        />
      )}
    </div>
  );

  /**
   * Renderiza una fila del listado.
   */
  const renderRow = (doc) => (
    <div className={styles.containerEmployer} key={doc._id}>
      <div>
        <div
          className={`${styles.tableContainer} ${doc.active === false ? styles.bajaVoluntario : ""}`}
          onClick={() => openWorkplace(doc._id)}
        >
          <div className={styles.tableCell}>{doc.name || "—"}</div>
          <div className={styles.tableCell}>{getProvinceLabel(doc)}</div>
          <div className={styles.tableCell}>{doc.address || "—"}</div>
          <div className={styles.tableCell}>{doc.phone || "—"}</div>
          <div className={styles.tableCellStatus}>
            <p>{doc.active === false ? "Inactivo" : "Activo"}</p>
          </div>
        </div>

        {selectedId === doc._id && selected && renderExpanded(selected)}
      </div>
    </div>
  );

  const activeItems = items.filter((x) => x.active !== false);
  const inactiveItems = items.filter((x) => x.active === false);

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>
              GESTIÓN DE CENTROS DE TRABAJO
              <FaSquarePlus title="Crear centro" onClick={() => setShowModal("crear")} />
            </h2>
          </div>

          <div className={styles.paginacion}>
            <div>
              <label htmlFor="limit">Registros por página:</label>
              <select id="limit" value={limit} onChange={handleLimitChange}>
                <option value={10}>10</option>
                <option value={20}>20</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <div>
              <button type="button" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>
                {"<"}
              </button>
              <span>Página {page}</span>
              <button
                type="button"
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages || totalPages === 0}
              >
                {">"}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.caja}>
          <FiltersWorkplaces
            filters={filters}
            enumsData={enumsData}
            handleFilterChange={handleFilterChange}
            resetFilters={resetFilters}
          />

          <div className={styles.containerTableContainer}>
            <div>
              <div className={`${styles.tableContainer} ${styles.cabeceraTabla}`}>
                <div className={styles.tableCell}>Centro</div>
                <div className={styles.tableCell}>Provincia</div>
                <div className={styles.tableCell}>Dirección</div>
                <div className={styles.tableCell}>Teléfono</div>
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

      {showModal === "crear" && (
        <ModalForm
          title="Crear centro de trabajo"
          message="El nombre se generará automáticamente con el formato Municipio · Dirección."
          fields={createFields}
          onSubmit={handleCreate}
          onClose={() => setShowModal("")}
          modal={modal}
        />
      )}

      {showModal === "crear-sesame" && sesameOfficeTarget && (
        <ModalForm
          title="Crear oficina en Sesame"
          message="Para crear la oficina en Sesame necesitas dirección, latitud y longitud."
          fields={createSesameOfficeFields}
          onSubmit={handleCreateSesameOfficeSubmit}
          onClose={() => {
            setShowModal("");
            setSesameOfficeTarget(null);
          }}
          modal={modal}
        />
      )}
    </div>
  );
}