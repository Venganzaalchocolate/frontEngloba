import { useEffect, useState } from "react";
import { FaEdit, FaEye, FaInstagram, FaTrashAlt, FaWordpress } from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import { useLogin } from "../../hooks/useLogin";
import useDebounce from "../../lib/utils";
import { getToken } from "../../lib/serviceToken";
import { communicationPublicationCreate, communicationPublicationDelete, communicationPublicationGet, communicationPublications, communicationPublicationUpdate } from "../../lib/data";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import FiltersCommunicationPublications from "./FiltersCommunicationPublications";
import CommunicationPublicationDetails from "./CommunicationPublicationDetails";
import styles from "../styles/ManagingEmployer.module.css";
import publicationStyles from "../styles/ManagingCommunicationPublications.module.css";

const INITIAL_FILTERS = { search: "", status: "", medium: "all", program: "", dispositive: "", dateFrom: "", dateTo: "" };

const STATUS_LABELS = {
  draft: "Borrador",
  scheduled: "Programada",
  partial: "Publicación parcial",
  complete: "Publicación completa",
  error: "Error",
};

const getReferenceId = (value) => {
  if (!value) return "";
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
};

const formatDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const formatDateOnly = (value) => {
  const dateValue = formatDateInput(value);
  if (!dateValue) return "—";
  const [year, month, day] = dateValue.split("-");
  return `${day}/${month}/${year}`;
};

const hasWordpress = (publication) => Boolean(publication?.wordpress?.postId || publication?.wordpress?.url);
const hasInstagram = (publication) => Boolean(publication?.instagram?.mediaId || publication?.instagram?.url);

const getPublicationPlatforms = (publication) => {
  if (Array.isArray(publication?.platforms) && publication.platforms.length) return publication.platforms;
  const platforms = [];
  if (hasWordpress(publication)) platforms.push("wordpress");
  if (hasInstagram(publication) || publication?.instagram?.matchText) platforms.push("instagram");
  return platforms;
};

const getFormPlatforms = (publication) => {
  if (!publication) return ["wordpress", "instagram"];
  const platforms = getPublicationPlatforms(publication);
  return platforms.length ? platforms : ["wordpress", "instagram"];
};

const ManagingCommunicationPublications = ({ modal, charge, enumsData }) => {
  const { logged } = useLogin();
  const isRoot = logged?.user?.role === "root";
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState("");
  const [selected, setSelected] = useState(null);
  const [formMode, setFormMode] = useState("");
  const [editingDoc, setEditingDoc] = useState(null);
  const [deleteDoc, setDeleteDoc] = useState(null);
  const [filters, setFilters] = useState(INITIAL_FILTERS);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(50);
  const [totalPages, setTotalPages] = useState(0);
  const debouncedFilters = useDebounce(filters, 300);
  const programsIndex = enumsData?.programsIndex || {};
  const dispositiveIndex = enumsData?.dispositiveIndex || {};

  const programs = Object.entries(programsIndex)
    .map(([id, program]) => ({ ...program, _id: program._id || id }))
    .filter((program) => program.active !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

  const dispositives = Object.entries(dispositiveIndex)
    .map(([id, dispositive]) => ({ ...dispositive, _id: dispositive._id || id }))
    .filter((dispositive) => dispositive.active !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

  const programOptions = programs.map((program) => ({ value: String(program._id), label: program.acronym ? `${program.acronym} - ${program.name}` : program.name }));

  const dispositiveOptions = dispositives.map((dispositive) => {
    const programId = getReferenceId(dispositive.program);
    const program = typeof dispositive.program === "object" ? dispositive.program : programsIndex[programId];
    const programLabel = program?.acronym || program?.name || "Sin programa";
    return { value: String(dispositive._id), label: `${dispositive.name} [${programLabel}]` };
  });

  const getProgramLabel = (value) => {
    if (!value) return "—";
    const id = getReferenceId(value);
    const program = typeof value === "object" ? value : programsIndex[id];
    return program?.acronym || program?.name || "—";
  };

  const getDispositiveLabel = (value) => {
    if (!value) return "—";
    const id = getReferenceId(value);
    const dispositive = typeof value === "object" ? value : dispositiveIndex[id];
    return dispositive?.name || "—";
  };

  const loadPublications = async () => {
    charge(true);
    const data = await communicationPublications({
      page,
      limit,
      search: debouncedFilters.search || undefined,
      status: debouncedFilters.status || undefined,
      medium: debouncedFilters.medium !== "all" ? debouncedFilters.medium : undefined,
      program: debouncedFilters.program || undefined,
      dispositive: debouncedFilters.dispositive || undefined,
      dateFrom: debouncedFilters.dateFrom || undefined,
      dateTo: debouncedFilters.dateTo || undefined,
    }, getToken());
    charge(false);
    if (data?.error) {
      modal("Error", data.message || "No se pudieron cargar las publicaciones");
      return;
    }
    setItems(data.publications || []);
    setTotalPages(data.totalPages || 0);
  };

  useEffect(() => {
    loadPublications();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, limit, debouncedFilters]);

  const openPublication = async (publicationId) => {
    if (selectedId === publicationId) {
      setSelectedId("");
      setSelected(null);
      return;
    }
    charge(true);
    const data = await communicationPublicationGet({ publicationId }, getToken());
    charge(false);
    if (data?.error) {
      modal("Error", data.message || "No se pudo cargar la publicación");
      return;
    }
    setSelectedId(publicationId);
    setSelected(data);
  };

  const openCreate = () => {
    setEditingDoc(null);
    setFormMode("create");
  };

  const openEdit = async (publicationId) => {
    charge(true);
    const data = await communicationPublicationGet({ publicationId }, getToken());
    charge(false);
    if (data?.error) {
      modal("Error", data.message || "No se pudo cargar la publicación");
      return;
    }
    setEditingDoc(data);
    setFormMode("edit");
  };

  const closeForm = () => {
    setEditingDoc(null);
    setFormMode("");
  };

  const getFormFields = () => {
    const editingScope = editingDoc?.scopeType || (editingDoc?.dispositive ? "dispositive" : "program");
    return [
      { type: "section", label: "DATOS GENERALES" },
      { name: "title", label: "Título de la actividad", type: "text", required: true, capsGuard: true, defaultValue: editingDoc?.title || "" },
      { name: "publicationDate", label: "Día previsto de publicación", type: "date", required: true, defaultValue: formatDateInput(editingDoc?.publicationDate) },
      { name: "platforms", label: "Medios previstos", type: "checkboxGroup", required: true, defaultValue: getFormPlatforms(editingDoc), options: [{ value: "wordpress", label: "Web / WordPress" }, { value: "instagram", label: "Instagram" }] },
      { type: "section", label: "ÁMBITO DE LA PUBLICACIÓN" },
      { name: "scopeType", label: "La publicación pertenece a", type: "select", required: true, defaultValue: editingScope, options: [{ value: "program", label: "Un programa completo" }, { value: "dispositive", label: "Un dispositivo concreto" }] },
      { name: "programId", label: "Programa", type: "multiChips", required: true, max: 1, options: programOptions, defaultValue: editingScope === "program" && editingDoc?.program ? [getReferenceId(editingDoc.program)] : [], placeholder: "Escribe para buscar un programa…", hint: "Selecciona un programa.", showIf: (formData) => formData.scopeType === "program" },
      { name: "dispositiveId", label: "Dispositivo", type: "multiChips", required: true, max: 1, options: dispositiveOptions, defaultValue: editingScope === "dispositive" && editingDoc?.dispositive ? [getReferenceId(editingDoc.dispositive)] : [], placeholder: "Escribe para buscar un dispositivo…", hint: "Selecciona un dispositivo.", showIf: (formData) => formData.scopeType === "dispositive" },
      { type: "section", label: "WORDPRESS", showIf: (formData) => formData.platforms?.includes("wordpress") },
      { name: "wordpressUrl", label: "Enlace de la noticia, si ya está publicada", type: "url", defaultValue: editingDoc?.wordpress?.url || "", placeholder: "https://engloba.org.es/...", showIf: (formData) => formData.platforms?.includes("wordpress") },
      { type: "section", label: "INSTAGRAM", showIf: (formData) => formData.platforms?.includes("instagram") },
      { name: "instagramUrl", label: "Enlace de Instagram, si ya está publicado", type: "url", defaultValue: editingDoc?.instagram?.url || "", placeholder: "https://www.instagram.com/p/...", showIf: (formData) => formData.platforms?.includes("instagram") },
      { name: "instagramMatchText", label: "Fragmento del texto de Instagram", type: "text", defaultValue: editingDoc?.instagram?.matchText || "", placeholder: "Una frase o varias palabras que aparezcan en la publicación", showIf: (formData) => formData.platforms?.includes("instagram") },
    ];
  };

  const submitPublication = async (values) => {
    const platforms = values.platforms || [];
    const instagramUrl = values.instagramUrl?.trim() || "";
    const instagramMatchText = values.instagramMatchText?.trim() || "";
    if (platforms.includes("instagram") && !instagramUrl && !instagramMatchText) {
      modal("Instagram", "Introduce el enlace de Instagram o un fragmento del texto para poder localizar la publicación.");
      return;
    }
    const programId = Array.isArray(values.programId) ? values.programId[0] : values.programId;
    const dispositiveId = Array.isArray(values.dispositiveId) ? values.dispositiveId[0] : values.dispositiveId;
    const payload = {
      title: values.title.trim(),
      publicationDate: values.publicationDate,
      platforms,
      scopeType: values.scopeType,
      program: values.scopeType === "program" ? programId : null,
      dispositive: values.scopeType === "dispositive" ? dispositiveId : null,
      wordpress: { url: platforms.includes("wordpress") ? values.wordpressUrl?.trim() || null : null },
      instagram: { url: platforms.includes("instagram") ? instagramUrl || null : null, matchText: platforms.includes("instagram") ? instagramMatchText : "" },
    };
    charge(true);
    const data = formMode === "edit" ? await communicationPublicationUpdate({ publicationId: editingDoc._id, ...payload }, getToken()) : await communicationPublicationCreate(payload, getToken());
    charge(false);
    if (data?.error) {
      modal("Error", data.message || "No se pudo guardar la publicación");
      return;
    }
    const wasEditing = formMode === "edit";
    closeForm();
    setSelectedId("");
    setSelected(null);
    await loadPublications();
    modal("Comunicación", wasEditing ? "Publicación actualizada correctamente" : "Publicación creada correctamente");
  };

  const confirmDelete = async () => {
    if (!deleteDoc?._id) return;
    charge(true);
    const data = await communicationPublicationDelete({ publicationId: deleteDoc._id }, getToken());
    charge(false);
    if (data?.error) {
      modal("Error", data.message || "No se pudo eliminar la publicación");
      return;
    }
    setDeleteDoc(null);
    setSelectedId("");
    setSelected(null);
    await loadPublications();
    modal("Comunicación", "Publicación eliminada correctamente");
  };

  const handleFilterChange = ({ target, patch }) => {
    const nextFilters = patch || { [target.name]: target.value };
    setPage(1);
    setSelectedId("");
    setSelected(null);
    setFilters((current) => ({ ...current, ...nextFilters }));
  };

  const resetFilters = () => {
    setPage(1);
    setSelectedId("");
    setSelected(null);
    setFilters(INITIAL_FILTERS);
  };

  const handleLimitChange = (event) => {
    setLimit(Number(event.target.value));
    setPage(1);
    setSelectedId("");
    setSelected(null);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSelectedId("");
    setSelected(null);
  };

  const getScopeLabel = (publication) => publication.scopeType === "dispositive" ? getDispositiveLabel(publication.dispositive) : getProgramLabel(publication.program);

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>PUBLICACIONES Y COMUNICACIÓN</h2>
            {isRoot && <FaSquarePlus title="Crear publicación" onClick={openCreate} />}
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
              <button type="button" onClick={() => handlePageChange(page - 1)} disabled={page === 1}>{"<"}</button>
              <span>Página {page}{totalPages ? ` de ${totalPages}` : ""}</span>
              <button type="button" onClick={() => handlePageChange(page + 1)} disabled={!totalPages || page >= totalPages}>{">"}</button>
            </div>
          </div>
        </div>
        <div className={styles.caja}>
          <FiltersCommunicationPublications filters={filters} programs={programs} dispositives={dispositives} handleFilterChange={handleFilterChange} resetFilters={resetFilters} />
          <div className={styles.containerTableContainer}>
            <div>
              <div className={styles.tableContainer} id={styles.cabeceraTabla}>
                <div className={styles.tableCell}>Fecha</div>
                <div className={publicationStyles.titleCell}>Actividad</div>
                <div className={styles.tableCell}>Ámbito</div>
                <div className={styles.tableCell}>Estado</div>
                <div className={styles.tableCell}>Medios</div>
                <div className={styles.tableCellStatus}>Acciones</div>
              </div>
              {items.map((publication) => {
                const platforms = getPublicationPlatforms(publication);
                return (
                  <div className={styles.containerEmployer} key={publication._id}>
                    <div>
                      <div className={styles.tableContainer} onClick={() => openPublication(publication._id)}>
                        <div className={styles.tableCell}>{formatDateOnly(publication.publicationDate)}</div>
                        <div className={publicationStyles.titleCell}>{publication.title}</div>
                        <div className={styles.tableCell}>{getScopeLabel(publication)}</div>
                        <div className={styles.tableCell}><span className={`${publicationStyles.status} ${publicationStyles[publication.status] || ""}`}>{STATUS_LABELS[publication.status] || publication.status}</span></div>
                        <div className={styles.tableCell}>
                          {platforms.includes("wordpress") && <FaWordpress title={hasWordpress(publication) ? "WordPress localizado" : "WordPress pendiente"} />}
                          {platforms.includes("instagram") && <FaInstagram title={hasInstagram(publication) ? "Instagram localizado" : "Instagram pendiente"} />}
                          {!platforms.length && "—"}
                        </div>
                        <div className={styles.tableCellStatus} onClick={(event) => event.stopPropagation()}>
                          <FaEye title="Ver publicación" onClick={() => openPublication(publication._id)} />
                          {isRoot && <><FaEdit title="Editar publicación" onClick={() => openEdit(publication._id)} /><FaTrashAlt title="Eliminar publicación" onClick={() => setDeleteDoc(publication)} /></>}
                        </div>
                      </div>
                      {selectedId === publication._id && selected && <CommunicationPublicationDetails publication={selected} />}
                    </div>
                  </div>
                );
              })}
              {!items.length && <div className={styles.tableContainer}><div className={styles.tableCell}>No hay publicaciones con estos filtros.</div></div>}
            </div>
          </div>
        </div>
        {!!formMode && isRoot && <ModalForm title={formMode === "edit" ? "Editar publicación" : "Crear publicación"} message="Selecciona el ámbito, el día y los medios en los que se publicará la actividad." fields={getFormFields()} onSubmit={submitPublication} onClose={closeForm} modal={modal} />}
        {!!deleteDoc && isRoot && <ModalConfirmation title="Eliminar publicación" message={`¿Quieres eliminar la publicación "${deleteDoc.title}"?`} onConfirm={confirmDelete} onCancel={() => setDeleteDoc(null)} />}
      </div>
    </div>
  );
};

export default ManagingCommunicationPublications;