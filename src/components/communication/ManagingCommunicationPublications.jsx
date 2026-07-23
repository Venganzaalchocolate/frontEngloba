import { useEffect, useState } from "react";
import ExcelJS from "exceljs";
import {
  FaCalendarAlt,
  FaEdit,
  FaInstagram,
  FaTrashAlt,
  FaWordpress,
} from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import { TbFileTypeXml } from "react-icons/tb";
import { useLogin } from "../../hooks/useLogin";
import useDebounce from "../../lib/utils";
import { getToken } from "../../lib/serviceToken";
import {
  communicationPublicationCreate,
  communicationPublicationDelete,
  communicationPublicationGet,
  communicationPublications,
  communicationPublicationUpdate,
} from "../../lib/data";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import FiltersCommunicationPublications from "./FiltersCommunicationPublications";
import CommunicationPublicationDetails from "./CommunicationPublicationDetails";
import styles from "../styles/ManagingEmployer.module.css";
import publicationStyles from "../styles/ManagingCommunicationPublications.module.css";

const INITIAL_FILTERS = {
  search: "",
  status: "",
  medium: "all",
  program: "",
  dispositive: "",
  dateFrom: "",
  dateTo: "",
};

const STATUS_LABELS = {
  draft: "Borrador",
  scheduled: "Programada",
  partial: "Publicación parcial",
  complete: "Publicación completa",
  error: "Error",
};

const MATCH_STATUS_LABELS = {
  pending: "Pendiente de localizar",
  matched: "Publicación localizada",
  ambiguous: "Varias coincidencias",
};

const MEDIUM_LABELS = {
  all: "Todos",
  both: "WordPress e Instagram",
  wordpress: "Solo WordPress",
  instagram: "Solo Instagram",
  pending: "Sin publicar",
};

const EXPORT_PAGE_SIZE = 100;

const getReferenceId = (value) =>
  typeof value === "object"
    ? String(value?._id || value?.id || "")
    : String(value || "");

const getReferenceIds = (values) =>
  (values || []).map(getReferenceId).filter(Boolean);

const formatDateInput = (value) => {
  if (!value) return "";
  if (typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
};

const formatDateOnly = (value) => {
  const [year, month, day] = formatDateInput(value).split("-");
  return year ? `${day}/${month}/${year}` : "—";
};

const toExcelDateOnly = (value) => {
  const normalized = formatDateInput(value);
  if (!normalized) return "";

  const [year, month, day] = normalized.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const toExcelDateTime = (value) => {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date;
};

const toExcelNumber = (value) => {
  if (value === undefined || value === null || value === "") return "";
  const number = Number(value);
  return Number.isFinite(number) ? number : "";
};

const getLatestStats = (stats) =>
  Array.isArray(stats) && stats.length ? stats[stats.length - 1] : {};

const getUserName = (user) => {
  if (!user) return "";
  if (typeof user === "string") return user;
  return [user.firstName, user.lastName].filter(Boolean).join(" ");
};

const safeFilePart = (value) =>
  String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\\/:*?"<>|]/g, "")
    .replace(/\s+/g, "_")
    .toLowerCase();

const hasWordpress = (publication) =>
  Boolean(publication?.wordpress?.postId || publication?.wordpress?.url);

const hasInstagram = (publication) =>
  Boolean(publication?.instagram?.mediaId || publication?.instagram?.url);

const getPublicationPlatforms = (publication) => {
  if (publication?.platforms?.length) return publication.platforms;

  return [
    hasWordpress(publication) && "wordpress",
    (hasInstagram(publication) || publication?.instagram?.matchText) &&
    "instagram",
  ].filter(Boolean);
};

const getFormPlatforms = (publication) =>
  publication
    ? getPublicationPlatforms(publication)
    : ["wordpress", "instagram"];

const compactLabels = (labels) => {
  if (!labels.length) return "—";
  if (labels.length <= 2) return labels.join(", ");
  return `${labels.slice(0, 2).join(", ")} +${labels.length - 2}`;
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
  const [isExporting, setIsExporting] = useState(false);

  const debouncedFilters = useDebounce(filters, 300);
  const programsIndex = enumsData?.programsIndex || {};
  const dispositiveIndex = enumsData?.dispositiveIndex || {};

  const programs = Object.entries(programsIndex)
    .map(([id, program]) => ({ ...program, _id: program._id || id }))
    .filter(({ active }) => active !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

  const dispositives = Object.entries(dispositiveIndex)
    .map(([id, dispositive]) => ({
      ...dispositive,
      _id: dispositive._id || id,
    }))
    .filter(({ active }) => active !== false)
    .sort((a, b) => (a.name || "").localeCompare(b.name || "", "es"));

  const programOptions = programs.map((program) => ({
    value: String(program._id),
    label: program.acronym
      ? `${program.acronym} - ${program.name}`
      : program.name,
  }));

  const dispositiveOptions = dispositives.map((dispositive) => {
    const program =
      typeof dispositive.program === "object"
        ? dispositive.program
        : programsIndex[getReferenceId(dispositive.program)];

    return {
      value: String(dispositive._id),
      label: `${dispositive.name} [${program?.acronym || program?.name || "Sin programa"}]`,
    };
  });

  const getProgramLabel = (value) => {
    const program =
      typeof value === "object"
        ? value
        : programsIndex[getReferenceId(value)];

    return program?.acronym || program?.name || "";
  };

  const getDispositiveLabel = (value) => {
    const dispositive =
      typeof value === "object"
        ? value
        : dispositiveIndex[getReferenceId(value)];

    return dispositive?.name || "";
  };

  const getScopeLabel = (publication) =>
    compactLabels(
      [
        ...(publication.dispositives || []).map(getDispositiveLabel),
        ...(publication.programs || []).map(getProgramLabel),
      ].filter(Boolean)
    );

  const buildListParams = (sourceFilters, requestedPage, requestedLimit) => ({
    page: requestedPage,
    limit: requestedLimit,
    search: sourceFilters.search?.trim() || undefined,
    status: sourceFilters.status || undefined,
    medium:
      sourceFilters.medium !== "all" ? sourceFilters.medium : undefined,
    program: sourceFilters.program || undefined,
    dispositive: sourceFilters.dispositive || undefined,
    dateFrom: sourceFilters.dateFrom || undefined,
    dateTo: sourceFilters.dateTo || undefined,
  });

  const loadPublications = async () => {
    charge(true);

    const data = await communicationPublications(
      buildListParams(debouncedFilters, page, limit),
      getToken()
    );

    charge(false);

    if (data?.error) {
      modal(
        "Error",
        data.message || "No se pudieron cargar las publicaciones"
      );
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
    const data = await communicationPublicationGet(
      { publicationId },
      getToken()
    );
    charge(false);

    if (data?.error) {
      modal("Error", data.message || "No se pudo cargar la publicación");
      return;
    }

    setSelectedId(publicationId);
    setSelected(data);
  };

  const openEdit = async (publicationId) => {
    charge(true);
    const data = await communicationPublicationGet(
      { publicationId },
      getToken()
    );
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

  const getFormFields = () => [
    { type: "section", label: "DATOS GENERALES" },
    {
      name: "title",
      label: "Título de la actividad",
      type: "text",
      required: true,
      capsGuard: true,
      defaultValue: editingDoc?.title || "",
    },
    {
      name: "publicationDate",
      label: "Día previsto de publicación",
      type: "date",
      required: true,
      defaultValue: formatDateInput(editingDoc?.publicationDate),
    },
    {
      name: "platforms",
      label: "Medios previstos",
      type: "checkboxGroup",
      required: true,
      defaultValue: getFormPlatforms(editingDoc),
      options: [
        { value: "wordpress", label: "Web / WordPress" },
        { value: "instagram", label: "Instagram" },
      ],
    },
    { type: "section", label: "PROGRAMAS Y DISPOSITIVOS" },
    {
      name: "programIds",
      label: "Programas",
      type: "multiChips",
      options: programOptions,
      defaultValue: getReferenceIds(editingDoc?.programs),
      placeholder: "Escribe para buscar programas…",
      hint: "Puedes seleccionar varios programas o dejarlo vacío si es una publicación institucional.",
    },
    {
      name: "dispositiveIds",
      label: "Dispositivos",
      type: "multiChips",
      options: dispositiveOptions,
      defaultValue: getReferenceIds(editingDoc?.dispositives),
      placeholder: "Escribe para buscar dispositivos…",
      hint: "Puedes seleccionar varios dispositivos.",
    },
    {
      type: "section",
      label: "WORDPRESS",
      showIf: ({ platforms }) => platforms?.includes("wordpress"),
    },
    {
      name: "wordpressUrl",
      label: "Enlace de la noticia, si ya está publicada",
      type: "url",
      defaultValue: editingDoc?.wordpress?.url || "",
      placeholder: "https://engloba.org.es/...",
      showIf: ({ platforms }) => platforms?.includes("wordpress"),
    },
    {
      type: "section",
      label: "INSTAGRAM",
      showIf: ({ platforms }) => platforms?.includes("instagram"),
    },
    {
      name: "instagramUrl",
      label: "Enlace de Instagram, si ya está publicado",
      type: "url",
      defaultValue: editingDoc?.instagram?.url || "",
      placeholder: "https://www.instagram.com/p/...",
      showIf: ({ platforms }) => platforms?.includes("instagram"),
    },
    {
      name: "instagramMatchText",
      label: "Fragmento del texto de Instagram",
      type: "text",
      defaultValue: editingDoc?.instagram?.matchText || "",
      placeholder: "Título o frase que aparecerá en el texto programado",
      hint: "Necesario cuando Instagram todavía está programado y no existe enlace.",
      showIf: ({ platforms }) => platforms?.includes("instagram"),
    },
  ];

  const submitPublication = async (values) => {
    const platforms = values.platforms || [];
    const instagramUrl = values.instagramUrl?.trim() || "";
    const instagramMatchText = values.instagramMatchText?.trim() || "";

    if (
      platforms.includes("instagram") &&
      !instagramUrl &&
      !instagramMatchText
    ) {
      modal(
        "Instagram",
        "Introduce un fragmento del texto que tendrá la publicación programada."
      );
      return;
    }

    const dispositiveIds = [...new Set(values.dispositiveIds || [])];
    const parentProgramIds = dispositiveIds
      .map((id) => getReferenceId(dispositiveIndex[id]?.program))
      .filter(Boolean);
    const programIds = [
      ...new Set([...(values.programIds || []), ...parentProgramIds]),
    ];

    const payload = {
      title: values.title.trim(),
      publicationDate: values.publicationDate,
      platforms,
      programs: programIds,
      dispositives: dispositiveIds,
      wordpress: {
        url: platforms.includes("wordpress")
          ? values.wordpressUrl?.trim() || null
          : null,
      },
      instagram: {
        url: platforms.includes("instagram") ? instagramUrl || null : null,
        matchText: platforms.includes("instagram")
          ? instagramMatchText
          : "",
      },
    };

    charge(true);
    const data =
      formMode === "edit"
        ? await communicationPublicationUpdate(
          { publicationId: editingDoc._id, ...payload },
          getToken()
        )
        : await communicationPublicationCreate(payload, getToken());
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
    modal(
      "Comunicación",
      wasEditing
        ? "Publicación actualizada correctamente"
        : "Publicación creada correctamente"
    );
  };

  const confirmDelete = async () => {
    if (!deleteDoc?._id) return;

    charge(true);
    const data = await communicationPublicationDelete(
      { publicationId: deleteDoc._id },
      getToken()
    );
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
    setPage(1);
    setSelectedId("");
    setSelected(null);
    setFilters((current) => ({
      ...current,
      ...(patch || { [target.name]: target.value }),
    }));
  };

  const resetFilters = () => {
    setPage(1);
    setSelectedId("");
    setSelected(null);
    setFilters(INITIAL_FILTERS);
  };

  const handleLimitChange = ({ target }) => {
    setLimit(Number(target.value));
    setPage(1);
    setSelectedId("");
    setSelected(null);
  };

  const handlePageChange = (newPage) => {
    setPage(newPage);
    setSelectedId("");
    setSelected(null);
  };

  const handlePublicationRowKeyDown = (event, publicationId) => {
    if (event.target !== event.currentTarget) return;
    if (event.key !== "Enter" && event.key !== " ") return;

    event.preventDefault();
    openPublication(publicationId);
  };

  const fetchAllFilteredPublications = async () => {
    const token = getToken();
    const firstPage = await communicationPublications(
      buildListParams(filters, 1, EXPORT_PAGE_SIZE),
      token
    );

    if (firstPage?.error) {
      throw new Error(
        firstPage.message || "No se pudieron obtener las publicaciones"
      );
    }

    const publications = [...(firstPage.publications || [])];
    const pages = Math.max(Number(firstPage.totalPages) || 1, 1);

    for (let currentPage = 2; currentPage <= pages; currentPage += 1) {
      const response = await communicationPublications(
        buildListParams(filters, currentPage, EXPORT_PAGE_SIZE),
        token
      );

      if (response?.error) {
        throw new Error(
          response.message ||
          `No se pudo obtener la página ${currentPage} de la exportación`
        );
      }

      publications.push(...(response.publications || []));
    }

    return publications;
  };

  const styleWorksheet = (worksheet) => {
    worksheet.views = [{ state: "frozen", ySplit: 1 }];
    worksheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: 1, column: worksheet.columnCount },
    };

    const header = worksheet.getRow(1);
    header.height = 28;
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF4E4B99" },
    };
    header.alignment = { vertical: "middle", horizontal: "center" };

    worksheet.eachRow((row, rowNumber) => {
      row.eachCell((cell) => {
        if (rowNumber > 1 && rowNumber % 2 === 0) {
          cell.fill = {
            type: "pattern",
            pattern: "solid",
            fgColor: { argb: "FFF7F6FC" },
          };
        }

        cell.alignment = {
          vertical: "top",
          wrapText: true,
        };
      });
    });
  };

  const exportPublicationsToExcel = async () => {
    if (isExporting) return;

    setIsExporting(true);
    charge(true);

    try {
      const publications = await fetchAllFilteredPublications();

      if (!publications.length) {
        modal(
          "Sin datos",
          "No hay publicaciones que coincidan con los filtros actuales."
        );
        return;
      }

      const workbook = new ExcelJS.Workbook();

      workbook.creator = "Asociación Engloba";
      workbook.created = new Date();

      /* =========================================================
         HOJA PRINCIPAL
      ========================================================= */

      const sheet = workbook.addWorksheet("Publicaciones");

      sheet.columns = [
        {
          header: "Fecha de publicación",
          key: "publicationDate",
          width: 16,
        },
        {
          header: "Actividad",
          key: "title",
          width: 48,
        },
        {
          header: "Programas",
          key: "programs",
          width: 30,
        },
        {
          header: "Dispositivos",
          key: "dispositives",
          width: 38,
        },
        {
          header: "WordPress · ID",
          key: "wordpressPostId",
          width: 18,
        },
        {
          header: "WordPress · URL",
          key: "wordpressUrl",
          width: 48,
        },
        {
          header: "WordPress · Fecha publicación",
          key: "wordpressPublishedAt",
          width: 23,
        },
        {
          header: "Instagram · ID",
          key: "instagramMediaId",
          width: 24,
        },
        {
          header: "Instagram · URL",
          key: "instagramUrl",
          width: 48,
        },
        {
          header: "Instagram · Texto",
          key: "instagramCaption",
          width: 70,
        },
        {
          header: "Instagram · Visualizaciones",
          key: "instagramViews",
          width: 21,
        },
        {
          header: "Instagram · Alcance",
          key: "instagramReach",
          width: 18,
        },
        {
          header: "Instagram · Me gusta",
          key: "instagramLikes",
          width: 18,
        },
        {
          header: "Instagram · Comentarios",
          key: "instagramComments",
          width: 19,
        },
        {
          header: "Instagram · Guardados",
          key: "instagramSaved",
          width: 18,
        },
        {
          header: "Instagram · Compartidos",
          key: "instagramShares",
          width: 19,
        },
        {
          header: "Instagram · Interacciones",
          key: "instagramInteractions",
          width: 20,
        },
        {
          header: "Instagram · Métricas actualizadas",
          key: "instagramCollectedAt",
          width: 25,
        },
      ];

      publications.forEach((publication) => {
        const instagramStats = getLatestStats(
          publication.instagram?.stats
        );

        const row = sheet.addRow({
          publicationDate: toExcelDateOnly(
            publication.publicationDate
          ),

          title: publication.title || "",

          programs: (publication.programs || [])
            .map(getProgramLabel)
            .filter(Boolean)
            .join(", "),

          dispositives: (publication.dispositives || [])
            .map(getDispositiveLabel)
            .filter(Boolean)
            .join(", "),

          wordpressPostId:
            publication.wordpress?.postId || "",

          wordpressUrl:
            publication.wordpress?.url || "",

          wordpressPublishedAt: toExcelDateTime(
            publication.wordpress?.publishedAt
          ),

          instagramMediaId:
            publication.instagram?.mediaId || "",

          instagramUrl:
            publication.instagram?.url || "",

          instagramCaption:
            publication.instagram?.caption || "",

          instagramViews: toExcelNumber(
            instagramStats.views
          ),

          instagramReach: toExcelNumber(
            instagramStats.reach
          ),

          instagramLikes: toExcelNumber(
            instagramStats.likes
          ),

          instagramComments: toExcelNumber(
            instagramStats.comments
          ),

          instagramSaved: toExcelNumber(
            instagramStats.saved
          ),

          instagramShares: toExcelNumber(
            instagramStats.shares
          ),

          instagramInteractions: toExcelNumber(
            instagramStats.totalInteractions
          ),

          instagramCollectedAt: toExcelDateTime(
            instagramStats.collectedAt
          ),
        });

        if (publication.wordpress?.url) {
          row.getCell("wordpressUrl").value = {
            text: publication.wordpress.url,
            hyperlink: publication.wordpress.url,
          };

          row.getCell("wordpressUrl").font = {
            color: { argb: "FF0563C1" },
            underline: true,
          };
        }

        if (publication.instagram?.url) {
          row.getCell("instagramUrl").value = {
            text: publication.instagram.url,
            hyperlink: publication.instagram.url,
          };

          row.getCell("instagramUrl").font = {
            color: { argb: "FF0563C1" },
            underline: true,
          };
        }
      });

      sheet.getColumn("publicationDate").numFmt =
        "dd/mm/yyyy";

      sheet.getColumn("wordpressPublishedAt").numFmt =
        "dd/mm/yyyy hh:mm";

      sheet.getColumn("instagramCollectedAt").numFmt =
        "dd/mm/yyyy hh:mm";

      [
        "instagramViews",
        "instagramReach",
        "instagramLikes",
        "instagramComments",
        "instagramSaved",
        "instagramShares",
        "instagramInteractions",
      ].forEach((key) => {
        sheet.getColumn(key).numFmt = "#,##0";
      });

      styleWorksheet(sheet);

      /* =========================================================
         HOJA DE HISTORIAL
      ========================================================= */

      const historySheet = workbook.addWorksheet("Historial");

      historySheet.columns = [
        {
          header: "Actividad",
          key: "title",
          width: 48,
        },
        {
          header: "Fecha prevista",
          key: "publicationDate",
          width: 16,
        },
        {
          header: "Acción",
          key: "action",
          width: 30,
        },
        {
          header: "Fecha del cambio",
          key: "changedAt",
          width: 22,
        },
        {
          header: "Realizado por",
          key: "changedBy",
          width: 28,
        },
      ];

      publications.forEach((publication) => {
        (publication.history || []).forEach(
          (historyItem) => {
            historySheet.addRow({
              title: publication.title || "",

              publicationDate: toExcelDateOnly(
                publication.publicationDate
              ),

              action:
                historyItem.action || "Modificación",

              changedAt: toExcelDateTime(
                historyItem.changedAt
              ),

              changedBy: getUserName(
                historyItem.changedBy
              ),
            });
          }
        );
      });

      historySheet.getColumn(
        "publicationDate"
      ).numFmt = "dd/mm/yyyy";

      historySheet.getColumn(
        "changedAt"
      ).numFmt = "dd/mm/yyyy hh:mm";

      styleWorksheet(historySheet);

      /* =========================================================
         HOJA DE FILTROS
      ========================================================= */

      const filtersSheet = workbook.addWorksheet(
        "Filtros aplicados"
      );

      filtersSheet.columns = [
        {
          header: "Filtro",
          key: "filter",
          width: 30,
        },
        {
          header: "Valor",
          key: "value",
          width: 70,
        },
      ];

      filtersSheet.addRows([
        {
          filter: "Búsqueda",
          value: filters.search || "Sin filtro",
        },
        {
          filter: "Estado",
          value: filters.status
            ? STATUS_LABELS[filters.status] ||
            filters.status
            : "Todos",
        },
        {
          filter: "Medio",
          value:
            MEDIUM_LABELS[filters.medium] ||
            filters.medium ||
            "Todos",
        },
        {
          filter: "Programa",
          value: filters.program
            ? getProgramLabel(filters.program)
            : "Todos",
        },
        {
          filter: "Dispositivo",
          value: filters.dispositive
            ? getDispositiveLabel(filters.dispositive)
            : "Todos",
        },
        {
          filter: "Desde",
          value: filters.dateFrom
            ? formatDateOnly(filters.dateFrom)
            : "Sin fecha",
        },
        {
          filter: "Hasta",
          value: filters.dateTo
            ? formatDateOnly(filters.dateTo)
            : "Sin fecha",
        },
        {
          filter: "Publicaciones exportadas",
          value: publications.length,
        },
        {
          filter: "Fecha de exportación",
          value: new Date().toLocaleString("es-ES"),
        },
      ]);

      styleWorksheet(filtersSheet);

      /* =========================================================
         DESCARGA
      ========================================================= */

      const buffer = await workbook.xlsx.writeBuffer();

      const blob = new Blob([buffer], {
        type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      const dateSuffix = new Date()
        .toISOString()
        .slice(0, 10);

      const filterSuffix = filters.dispositive
        ? `_${safeFilePart(
          getDispositiveLabel(filters.dispositive)
        )}`
        : filters.program
          ? `_${safeFilePart(
            getProgramLabel(filters.program)
          )}`
          : "";

      link.href = url;
      link.download =
        `publicaciones_comunicacion${filterSuffix}_${dateSuffix}.xlsx`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (error) {
      modal(
        "Error",
        error?.message ||
        "No se pudo generar el archivo Excel."
      );
    } finally {
      charge(false);
      setIsExporting(false);
    }
  };

  const mediumIcon = (publication, platform) => {
    const isWordpress = platform === "wordpress";
    const url = publication[platform]?.url;
    const Icon = isWordpress ? FaWordpress : FaInstagram;
    const label = isWordpress ? "WordPress" : "Instagram";

    return url ? (
      <a
        className={publicationStyles.mediumLink}
        href={url}
        target="_blank"
        rel="noreferrer"
        aria-label={`Abrir publicación en ${label}`}
        title={`Abrir ${label}`}
        onClick={(event) => event.stopPropagation()}
      >
        <Icon aria-hidden="true" />
      </a>
    ) : (
      <span
        className={publicationStyles.mediumPending}
        title={`${label} pendiente`}
        aria-label={`${label} pendiente`}
      >
        <Icon aria-hidden="true" />
      </span>
    );
  };

  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <div>
            <h2>PUBLICACIONES Y COMUNICACIÓN</h2>

            {isRoot && (
              <FaSquarePlus
                role="button"
                tabIndex={0}
                title="Nueva publicación"
                aria-label="Nueva publicación"
                onClick={() => {
                  setEditingDoc(null);
                  setFormMode("create");
                }}
                onKeyDown={(event) => {
                  if (event.key !== "Enter" && event.key !== " ") return;

                  event.preventDefault();
                  setEditingDoc(null);
                  setFormMode("create");
                }}
                style={{ cursor: "pointer" }}
              />
            )}

            <TbFileTypeXml
              role="button"
              tabIndex={isExporting ? -1 : 0}
              title={
                isExporting
                  ? "Generando Excel"
                  : "Descargar publicaciones en Excel"
              }
              aria-label={
                isExporting
                  ? "Generando Excel"
                  : "Descargar publicaciones en Excel"
              }
              aria-disabled={isExporting}
              onClick={
                isExporting
                  ? undefined
                  : exportPublicationsToExcel
              }
              onKeyDown={(event) => {
                if (isExporting) return;
                if (event.key !== "Enter" && event.key !== " ") return;

                event.preventDefault();
                exportPublicationsToExcel();
              }}
              style={{
                cursor: isExporting ? "wait" : "pointer",
                opacity: isExporting ? 0.45 : 1,
              }}
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
                type="button"
                aria-label="Página anterior"
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
              >
                {"<"}
              </button>
              <span>
                Página {page}
                {totalPages ? ` de ${totalPages}` : ""}
              </span>
              <button
                type="button"
                aria-label="Página siguiente"
                onClick={() => handlePageChange(page + 1)}
                disabled={!totalPages || page >= totalPages}
              >
                {">"}
              </button>
            </div>
          </div>
        </div>

        <div className={styles.caja}>
          <FiltersCommunicationPublications
            filters={filters}
            programs={programs}
            dispositives={dispositives}
            handleFilterChange={handleFilterChange}
            resetFilters={resetFilters}
          />

          <div className={styles.containerTableContainer}>
            <div>
<div
  className={`${styles.tableContainer} ${
    publicationStyles.publicationHeader
  } ${isRoot ? publicationStyles.withActions : ""}`}
>
                <div className={publicationStyles.dateCell}>
                  <FaCalendarAlt aria-hidden="true" />
                  <span>Fecha</span>
                </div>

                <div className={publicationStyles.titleCell}>
                  Actividad
                </div>

                <div className={publicationStyles.scopeCell}>
                  Ámbito
                </div>

                <div className={publicationStyles.statusCell}>
                  Estado
                </div>

                <div className={publicationStyles.mediumCell}>
                  Medios
                </div>

                {isRoot && (
                  <div className={publicationStyles.actionsCell}>
                    Acciones
                  </div>
                )}
              </div>

              {items.map((publication) => {
                const platforms = getPublicationPlatforms(publication);
                const isOpen = selectedId === publication._id;
                const scopeLabel = getScopeLabel(publication);

                return (
                  <div className={styles.containerEmployer} key={publication._id}>
                    <div>
                      <div
                        className={`${styles.tableContainer} ${publicationStyles.publicationRow} ${isRoot ? publicationStyles.withActions : ""
                          }`}
                        role="button"
                        tabIndex={0}
                        aria-expanded={isOpen}
                        aria-controls={`publication-details-${publication._id}`}
                        aria-label={`${isOpen ? "Cerrar" : "Abrir"
                          } detalles de ${publication.title}`}
                        onClick={() => openPublication(publication._id)}
                        onKeyDown={(event) =>
                          handlePublicationRowKeyDown(event, publication._id)
                        }
                      >
                        <div
                          className={publicationStyles.dateCell}
                          data-label="Fecha"
                        >
                          <FaCalendarAlt aria-hidden="true" />
                          <time dateTime={formatDateInput(publication.publicationDate)}>
                            {formatDateOnly(publication.publicationDate)}
                          </time>
                        </div>

                        <div
                          className={publicationStyles.titleCell}
                          data-label="Actividad"
                        >
                          <span className={publicationStyles.titleText}>
                            {publication.title}
                          </span>
                        </div>

                        <div
                          className={publicationStyles.scopeCell}
                          data-label="Ámbito"
                          title={scopeLabel}
                        >
                          {scopeLabel}
                        </div>

                        <div
                          className={publicationStyles.statusCell}
                          data-label="Estado"
                        >
                          <span
                            className={`${publicationStyles.status} ${publicationStyles[publication.status] || ""
                              }`}
                          >
                            {STATUS_LABELS[publication.status] ||
                              publication.status}
                          </span>
                        </div>

                        <div
                          className={publicationStyles.mediumCell}
                          data-label="Medios"
                        >
                          {platforms.includes("wordpress") &&
                            mediumIcon(publication, "wordpress")}
                          {platforms.includes("instagram") &&
                            mediumIcon(publication, "instagram")}
                          {!platforms.length && "—"}
                        </div>

                        {isRoot && (
                          <div
                            className={publicationStyles.actionsCell}
                            data-label="Acciones"
                            onClick={(event) => event.stopPropagation()}
                          >
                            <button
                              type="button"
                              className={publicationStyles.iconButton}
                              aria-label={`Editar ${publication.title}`}
                              title="Editar publicación"
                              onClick={() => openEdit(publication._id)}
                            >
                              <FaEdit aria-hidden="true" />
                            </button>

                            <button
                              type="button"
                              className={`${publicationStyles.iconButton} ${publicationStyles.dangerButton}`}
                              aria-label={`Eliminar ${publication.title}`}
                              title="Eliminar publicación"
                              onClick={() => setDeleteDoc(publication)}
                            >
                              <FaTrashAlt aria-hidden="true" />
                            </button>
                          </div>
                        )}
                      </div>

                      {isOpen && selected && (
                        <div id={`publication-details-${publication._id}`}>
                          <CommunicationPublicationDetails publication={selected} />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {!items.length && (
                <div className={publicationStyles.emptyState}>
                  No hay publicaciones con estos filtros.
                </div>
              )}
            </div>
          </div>
        </div>

        {!!formMode && isRoot && (
          <ModalForm
            title={
              formMode === "edit"
                ? "Editar publicación"
                : "Crear publicación"
            }
            message="Selecciona el día, los medios y todos los programas o dispositivos relacionados."
            fields={getFormFields()}
            onSubmit={submitPublication}
            onClose={closeForm}
            modal={modal}
          />
        )}

        {!!deleteDoc && isRoot && (
          <ModalConfirmation
            title="Eliminar publicación"
            message={`¿Quieres eliminar la publicación "${deleteDoc.title}"?`}
            onConfirm={confirmDelete}
            onCancel={() => setDeleteDoc(null)}
          />
        )}
      </div>
    </div>
  );
};

export default ManagingCommunicationPublications;
