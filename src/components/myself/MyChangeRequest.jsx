import { useEffect, useMemo, useState } from "react";
import styles from "../styles/MyChangeRequests.module.css";
import { getToken } from "../../lib/serviceToken";
import { getmychangerequest, cancelchangerequest, createChangeRequest, createtimeoffrequest } from "../../lib/data";
import ModalForm from "../globals/ModalForm";
import { formatDate } from "../../lib/utils";
import { validEmail, validateDNIorNIE, validateBankAccount, validText } from "../../lib/valid";

export default function MyChangeRequests({
  userId,
  modal,
  charge,
  enumsData,
  initialItems = [],
}) {
  // ----- Estado -----
  const [serverItems, setServerItems] = useState([]);
  const [optimisticLocal, setOptimisticLocal] = useState([]); // solo optimistas creados aquí
  const [showHistory, setShowHistory] = useState(false);

  // Modales
  const [isReqUploadOpen, setIsReqUploadOpen] = useState(false);
  const [reqUploadForm, setReqUploadForm] = useState(null);

  const [isReqChangeOpen, setIsReqChangeOpen] = useState(false);
  const [reqChangeForm, setReqChangeForm] = useState(null);
  const [changeWizard, setChangeWizard] = useState({ step: 1, path: "" });

  const [uploadWizard, setUploadWizard] = useState({ step: 1, docId: "" });

  // Nuevo: modal para vacaciones / asuntos propios
  const [isReqTimeOffOpen, setIsReqTimeOffOpen] = useState(false);
  const [reqTimeOffForm, setReqTimeOffForm] = useState(null);

  const dateNow = new Date();

  // ------- Datos auxiliares -------
  const officialDocs = useMemo(
    () =>
      Array.isArray(enumsData?.documentation)
        ? enumsData.documentation.filter((d) => d.model === "User")
        : [],
    [enumsData]
  );

  const officialById = useMemo(() => {
    const m = new Map();
    for (const d of officialDocs) m.set(String(d._id), d);
    return m;
  }, [officialDocs]);

  // ---------- helpers de merge/orden ----------
  const mergeDedupe = (a, b) => {
    const m = new Map(a.map((x) => [String(x._id), x]));
    for (const y of b) m.set(String(y._id), y);
    return Array.from(m.values());
  };
  const bySubmittedDesc = (arr) =>
    [...arr].sort(
      (x, y) => new Date(y.submittedAt || 0) - new Date(x.submittedAt || 0)
    );

  // Cargar desde servidor y limpiar optimistas locales ya llegados
  const refresh = async () => {
    charge?.(true);
    try {
      const token = getToken();
      const res = await getmychangerequest({ userId }, token);
      const list = Array.isArray(res?.data?.data)
        ? res.data.data
        : Array.isArray(res?.data)
          ? res.data
          : Array.isArray(res)
            ? res
            : [];
      setServerItems(list);

      const serverIds = new Set(list.map((x) => String(x._id)));
      setOptimisticLocal((prev) =>
        prev.filter((x) => !serverIds.has(String(x._id)))
      );
    } catch (e) {
      modal?.("Error", e?.message || "No se pudieron cargar las solicitudes");
    } finally {
      charge?.(false);
    }
  };

  useEffect(() => {
    refresh(); // eslint-disable-next-line
  }, [userId]);

  // lista fusionada final: servidor + del padre + locales
  const all = useMemo(() => {
    const ext = Array.isArray(initialItems) ? initialItems : [];
    const merged = mergeDedupe(serverItems, ext);
    return bySubmittedDesc(mergeDedupe(optimisticLocal, merged));
  }, [serverItems, initialItems, optimisticLocal]);

  // helper: detectar solicitudes de vacaciones/asuntos propios
  const isTimeOffRequest = (r) =>
    r?.timeOff &&
    Array.isArray(r.timeOff.entries) &&
    r.timeOff.entries.length > 0;

  // split pendientes e histórico
  const pending = all.filter((r) => r.status === "pending");
  const history = all.filter((r) => r.status !== "pending");

  // solicitudes con timeOff (vacaciones / asuntos propios)
  const pendingTimeOff = pending.filter(
    (r) => r.timeOff && Array.isArray(r.timeOff.entries) && r.timeOff.entries.length
  );
  const historyTimeOff = history.filter(
    (r) => r.timeOff && Array.isArray(r.timeOff.entries) && r.timeOff.entries.length
  );


  const pendingChanges = pending.filter(
    (r) => (r.changes?.length || 0) > 0 && !isTimeOffRequest(r)
  );
  const pendingDocs = pending.filter(
    (r) =>
      (r.uploads?.length || 0) > 0 &&
      (r.changes?.length || 0) === 0 &&
      !isTimeOffRequest(r)
  );


  const historyChanges = history.filter(
    (r) => (r.changes?.length || 0) > 0 && !isTimeOffRequest(r)
  );
  const historyDocs = history.filter(
    (r) =>
      (r.uploads?.length || 0) > 0 &&
      (r.changes?.length || 0) === 0 &&
      !isTimeOffRequest(r)
  );


  // cancelar
  const onCancel = async (id) => {
    charge?.(true);
    try {
      const token = getToken();
      await cancelchangerequest({ requestId: id, userId }, token);
      setOptimisticLocal((prev) =>
        prev.map((x) => (x._id === id ? { ...x, status: "cancelled" } : x))
      );
      await refresh();
      modal?.("Cancelada", "La solicitud ha sido cancelada");
    } catch (e) {
      modal?.("Error", e?.message || "No se pudo cancelar la solicitud");
    } finally {
      charge?.(false);
    }
  };

  // ---------- helpers de UI ----------
  const studiesMap = useMemo(() => {
    const map = new Map();
    if (Array.isArray(enumsData?.studies)) {
      for (const cat of enumsData.studies) {
        if (Array.isArray(cat?.subcategories) && cat.subcategories.length) {
          for (const sub of cat.subcategories) map.set(String(sub._id), sub.name);
        } else if (cat?._id) {
          map.set(String(cat._id), cat.name);
        }
      }
    }
    return map;
  }, [enumsData]);

  const labelFor = (path) => {
    const dict = {
      firstName: "Nombre",
      lastName: "Apellidos",
      dni: "DNI",
      birthday: "Fecha de nacimiento",
      email_personal: "Email personal",
      socialSecurityNumber: "Nº Seguridad Social",
      bankAccountNumber: "Cuenta bancaria",
      phone: "Teléfono personal",
      "phoneJob.number": "Teléfono laboral",
      "phoneJob.extension": "Extensión laboral",
      gender: "Género",
      fostered: "Extutelado",
      apafa: "Apafa",
      consetmentDataProtection: "Consentimiento PD",
      "disability.percentage": "% Discapacidad",
      "disability.notes": "Notas discapacidad",
    };
    return dict[path] || path;
  };

  const fmtBool = (v) => (v === true ? "Sí" : v === false ? "No" : "—");
  const fmtDate = (v) => (v ? formatDate(v) : "—");

  const fmtValue = (path, v) => {
    if (v === null || v === undefined || v === "") return "—";
    if (path === "birthday") return fmtDate(v);
    if (["fostered", "apafa", "consetmentDataProtection"].includes(path))
      return fmtBool(v);
    if (path === "studies") {
      const arr = Array.isArray(v) ? v : [];
      if (!arr.length) return "—";
      return arr
        .map((id) => studiesMap.get(String(id)) || String(id))
        .join(", ");
    }
    if (path === "disability.percentage") return `${v}%`;
    return String(v);
  };

  // ===== VALIDACIONES CAMBIO RÁPIDO =====
  const validateValueForPath = (path, value) => {
    const v = String(value ?? "").trim();

    switch (path) {
      case "phone":
      case "phoneJob.number":
        if (!/^\d{9}$/.test(v))
          return "El teléfono debe tener exactamente 9 dígitos.";
        return null;

      case "phoneJob.extension":
        if (v && !/^\d{1,5}$/.test(v))
          return "La extensión debe tener entre 1 y 5 dígitos.";
        return null;

      case "email_personal":
        if (!validEmail(v)) return "Email personal no válido.";
        return null;

      case "dni":
        if (!validateDNIorNIE(v)) return "DNI/NIE no válido.";
        return null;

      case "bankAccountNumber":
        if (v && !validateBankAccount(v)) return "IBAN no válido.";
        return null;

      case "socialSecurityNumber":
        if (v && !/^\d{8,12}$/.test(v))
          return "El Nº de Seguridad Social debe tener entre 8 y 12 dígitos.";
        return null;

      case "firstName":
      case "lastName":
        if (!validText(v, 2, 100, true))
          return "El texto no es válido (2-100 caracteres).";
        return null;

      case "disability.notes":
        if (!validText(v, 0, 200, true)) return "Máximo 200 caracteres.";
        return null;

      case "disability.percentage": {
        if (v === "") return null;
        const n = Number(v);
        if (Number.isNaN(n) || n < 0 || n > 100)
          return "El porcentaje debe estar entre 0 y 100.";
        return null;
      }

      case "birthday":
        if (
          !/^\d{4}-\d{2}-\d{2}$/.test(v) ||
          Number.isNaN(new Date(v).getTime())
        ) {
          return "Fecha inválida. Usa formato YYYY-MM-DD.";
        }
        return null;

      case "gender":
        if (!["male", "female", "others", "nonBinary"].includes(v)) {
          return "Opción de género no válida.";
        }
        return null;

      case "fostered":
      case "apafa":
      case "consetmentDataProtection":
        if (!["si", "no"].includes(v)) return "Debe ser 'si' o 'no'.";
        return null;

      default:
        return null;
    }
  };

  // ====== Constantes/acciones cambio rápido ======
  const ALLOWED_QUICK_FIELDS = [
    "firstName",
    "lastName",
    "dni",
    "birthday",
    "email_personal",
    "socialSecurityNumber",
    "bankAccountNumber",
    "phone",
    "phoneJob.number",
    "phoneJob.extension",
    "gender",
    "fostered",
    "apafa",
    "consetmentDataProtection",
    "disability.percentage",
    "disability.notes",
  ];

  const emitOptimisticChangeCR = ({ path, to, note }) => {
    const clientId = `tmp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const optimisticCR = {
      _id: clientId,
      userId,
      status: "pending",
      submittedAt: new Date().toISOString(),
      note: note || "",
      changes: [{ path, from: undefined, to }],
      uploads: [],
    };
    setOptimisticLocal((prev) => mergeDedupe(prev, [optimisticCR]));
    return clientId;
  };

  // Nuevo: optimismo para vacaciones/asuntos propios
  const emitOptimisticTimeOffCR = ({ kind, entries, note }) => {
    const clientId = `tmp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;
    const optimisticCR = {
      _id: clientId,
      userId,
      status: "pending",
      submittedAt: new Date().toISOString(),
      note: note || "",
      changes: [],
      uploads: [],
      timeOff: {
        kind,
        entries,
      },
    };
    setOptimisticLocal((prev) => mergeDedupe(prev, [optimisticCR]));
    return clientId;
  };

  const openChangeStep1 = () => {
    setChangeWizard({ step: 1, path: "" });
    setReqChangeForm({
      title: "Solicitar cambio de datos",
      message: "Elige el campo que quieres cambiar.",
      fields: [
        {
          label: "Campo",
          name: "path",
          type: "select",
          required: true,
          searchable: false,
          options: [{ value: "", label: "Selecciona un campo" }].concat(
            ALLOWED_QUICK_FIELDS.map((p) => ({ value: p, label: labelFor(p) }))
          ),
        },
      ],
      onSubmit: ({ path }) => {
        if (!path) {
          modal?.("Error", "Selecciona un campo.");
          return;
        }
        setChangeWizard({ step: 2, path });
        openChangeStep2(path);
      },
    });
    setIsReqChangeOpen(true);
  };

  const openChangeStep2 = (path) => {
    const base = [
      {
        label: "Nota para el responsable (opcional)",
        name: "note",
        type: "textarea",
      },
    ];
    let valueField = {
      label: "Nuevo valor",
      name: "value",
      type: "text",
      required: true,
    };

    if (path === "birthday") valueField = { ...valueField, type: "date" };
    if (path === "disability.percentage")
      valueField = { ...valueField, type: "number" };

    if (["fostered", "apafa", "consetmentDataProtection"].includes(path)) {
      valueField = {
        label: "Nuevo valor",
        name: "value",
        type: "select",
        required: true,
        options: [
          { value: "si", label: "Sí" },
          { value: "no", label: "No" },
        ],
      };
    }
    if (path === "gender") {
      valueField = {
        label: "Género",
        name: "value",
        type: "select",
        required: true,
        options: [
          { value: "male", label: "Hombre" },
          { value: "female", label: "Mujer" },
          { value: "others", label: "Otros" },
          { value: "nonBinary", label: "No binario" },
        ],
      };
    }

    setReqChangeForm({
      title: `Cambiar: ${labelFor(path)}`,
      message: "Introduce el nuevo valor.",
      fields: [valueField, ...base],
      onSubmit: async ({ value, note }) => {
        const err = validateValueForPath(path, value);
        if (err) {
          modal?.("Error", err);
          return;
        }

        let to = value;
        if (path === "disability.percentage" && String(value).trim() !== "") {
          to = Number(value);
        }

        const noteText = note || `Solicitud de cambio de ${labelFor(path)}`;
        const clientId = emitOptimisticChangeCR({ path, to, note: noteText });

        try {
          charge?.(true);
          const token = getToken();
          const resp = await createChangeRequest(
            {
              userId,
              note: noteText,
              changes: [{ path, to }],
              uploads: [],
            },
            token
          );

          const created = resp?.data && resp?.data?._id ? resp.data : resp;
          if (!created || created.error)
            throw new Error(
              created?.message || "No se pudo crear la solicitud"
            );

          setOptimisticLocal((prev) => {
            const next = prev.filter(
              (x) => String(x._id) !== String(clientId)
            );
            return mergeDedupe(next, [created]);
          });

          modal?.(
            "Solicitud enviada",
            "Tu petición de cambio de datos está pendiente de revisión."
          );
        } catch (e) {
          setOptimisticLocal((prev) =>
            prev.filter((x) => String(x._id) !== String(clientId))
          );
          modal?.("Error", e?.message || "No se pudo crear la solicitud");
        } finally {
          charge?.(false);
          setIsReqChangeOpen(false);
          setChangeWizard({ step: 1, path: "" });
        }
      },
    });
    setIsReqChangeOpen(true);
  };

  // ======= Optimismo para SUBIDA =======
  const emitOptimisticUploadCR = (params) => {
    const { file, fileName, date, description, note, originDocumentation } =
      params;
    const clientId = `tmp-${Date.now()}-${Math.random()
      .toString(36)
      .slice(2, 7)}`;

    const isOfficial = !!originDocumentation;
    const docName = isOfficial
      ? officialById.get(String(originDocumentation))?.name ||
      "Documento oficial"
      : fileName || file?.name || "Documento";

    const optimisticCR = {
      _id: clientId,
      userId,
      status: "pending",
      submittedAt: new Date().toISOString(),
      note: note || "",
      changes: [],
      uploads: [
        {
          _id: `u-${clientId}`,
          originDocumentation: isOfficial ? originDocumentation : null,
          category: isOfficial ? "Oficial" : "Varios",
          date: date || null,
          description: isOfficial ? docName : description || "Sin Descripción",
          originalName: file?.name || "documento.pdf",
          labelFile: docName,
        },
      ],
    };
    setOptimisticLocal((prev) => mergeDedupe(prev, [optimisticCR]));
    return clientId;
  };

  // ======= Subida de documentos (asistente en 2 pasos) =======
  const openUploadStep1 = () => {
    const options = [
      { value: "__varios__", label: "Varios (documentación complementaria)" },
      ...officialDocs.map((d) => ({ value: String(d._id), label: d.name })),
    ];

    setUploadWizard({ step: 1, docId: "" });
    setReqUploadForm({
      title: "Tipo de documento",
      message: "Selecciona el tipo de documento que quieres subir.",
      fields: [
        {
          label: "Tipo",
          name: "docId",
          type: "select",
          required: true,
          options: [{ value: "", label: "Selecciona…" }, ...options],
        },
      ],
      onSubmit: ({ docId }) => {
        if (!docId) {
          modal?.("Error", "Selecciona un tipo.");
          return;
        }
        setUploadWizard({ step: 2, docId });
        openUploadStep2(docId);
      },
    });
    setIsReqUploadOpen(true);
  };

  const openUploadStep2 = (docId) => {
    const isOfficial = docId !== "__varios__";
    const selDoc = isOfficial ? officialById.get(String(docId)) : null;
    const today = new Date().toISOString().split("T")[0];

    const fields = [
      { label: "Archivo (PDF)", name: "file", type: "file", required: true },
    ];

    if (isOfficial) {
      fields.push({
        label: "Fecha",
        name: "date",
        type: "date",
        defaultValue: today,
        required: true,
      });
      fields.push({
        label: "Nota (opcional)",
        name: "note",
        type: "textarea",
      });
    } else {
      fields.push({
        label: "Nombre del documento",
        name: "fileName",
        type: "text",
        required: true,
      });
      fields.push({
        label: "Fecha (opcional)",
        name: "date",
        type: "date",
        defaultValue: today,
      });
      fields.push({
        label: "Descripción (opcional)",
        name: "description",
        type: "text",
      });
      fields.push({
        label: "Nota (opcional)",
        name: "note",
        type: "textarea",
      });
    }

    setReqUploadForm({
      title: isOfficial
        ? `Subir: ${selDoc?.name || "Documento oficial"}`
        : "Subir documento (Varios)",
      message: isOfficial
        ? "Adjunta el PDF (y la fecha si se solicita)."
        : "Adjunta el PDF y completa los metadatos.",
      fields,
      onSubmit: async ({ file, fileName, date, description, note }) => {
        if (!file) {
          modal?.("Error", "Debes adjuntar un PDF.");
          return;
        }

        const clientId = emitOptimisticUploadCR({
          file,
          fileName,
          date,
          description,
          note,
          originDocumentation: isOfficial ? docId : null,
        });

        try {
          charge?.(true);
          const token = getToken();

          const uploads = isOfficial
            ? [
              {
                file,
                originDocumentation: docId,
                date: date || dateNow,
              },
            ]
            : [
              {
                file,
                category: "Varios",
                date: date || dateNow,
                description:
                  (description || fileName || file.name || "Documento").trim(),
                labelFile: (fileName || file.name || "Documento").trim(),
              },
            ];

          const resp = await createChangeRequest(
            {
              userId,
              note:
                note ||
                (isOfficial
                  ? `Solicitud de ${selDoc?.name || "documento oficial"}`
                  : "Solicitud de documento complementario"),
              changes: [],
              uploads,
            },
            token
          );

          const created = resp?.data && resp?.data?._id ? resp.data : resp;
          if (!created || created.error)
            throw new Error(
              created?.message || "No se pudo crear la solicitud"
            );

          setOptimisticLocal((prev) => {
            const next = prev.filter(
              (x) => String(x._id) !== String(clientId)
            );
            const m = new Map(next.map((x) => [String(x._id), x]));
            m.set(String(created._id), created);
            return Array.from(m.values());
          });

          modal?.(
            "Solicitud enviada",
            "Tu petición está pendiente de revisión."
          );
        } catch (e) {
          setOptimisticLocal((prev) =>
            prev.filter((x) => String(x._id) !== String(clientId))
          );
        } finally {
          charge?.(false);
          setIsReqUploadOpen(false);
          setUploadWizard({ step: 1, docId: "" });
        }
      },
    });
    setIsReqUploadOpen(true);
  };

  const buildTimeOffInfo = (timeOff) => {
    if (!timeOff || !Array.isArray(timeOff.entries)) {
      return { label: "", dates: [] };
    }

    // nos quedamos con fechas únicas por solicitud
    const uniqueDates = Array.from(
      new Set(
        timeOff.entries
          .map((e) => (e?.date ? new Date(e.date) : null))
          .filter((d) => d && !Number.isNaN(d.getTime()))
          .map((d) => d.toISOString().slice(0, 10))
      )
    ).sort();

    const label =
      timeOff.kind === "personal"
        ? "DÍAS DE ASUNTOS PROPIOS SOLICITADOS"
        : "DÍAS DE VACACIONES SOLICITADOS";

    return { label, dates: uniqueDates };
  };

  // ======= Solicitud de vacaciones / asuntos propios =======
  // helper: construir entries de días consecutivos con 7.5h
  const buildTimeOffEntriesFromRange = (fromStr, toStr) => {
    const start = new Date(fromStr);
    const end = new Date(toStr);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { error: "Fechas inválidas." };
    }
    if (start > end) {
      return {
        error: "La fecha de inicio no puede ser posterior a la fecha de fin.",
      };
    }
    const entries = [];
    const cur = new Date(start);
    while (cur <= end) {
      entries.push({ date: new Date(cur), hours: 7.5 }); // 7.5 horas, usuario no lo ve
      cur.setDate(cur.getDate() + 1);
    }
    return { entries };
  };

  const openTimeOffModal = () => {
    setReqTimeOffForm({
      title: "Solicitar días (vacaciones / asuntos propios)",
      message: "Selecciona el tipo y los días que quieres solicitar.",
      fields: [
        {
          label: "Tipo de días",
          name: "type",
          type: "select",
          required: true,
          options: [
            { value: "", label: "Selecciona tipo" },
            { value: "vacation", label: "Vacaciones" },
            { value: "personal", label: "Asuntos propios" },
          ],
        },
        {
          label: "Desde (incluido)",
          name: "from",
          type: "date",
          required: true,
        },
        {
          label: "Hasta (incluido)",
          name: "to",
          type: "date",
          required: true,
        },
        {
          label: "Nota para el responsable (opcional)",
          name: "note",
          type: "textarea",
        },
      ],
      onSubmit: async ({ type, from, to, note }) => {
        if (!type) {
          modal?.("Error", "Selecciona el tipo de días.");
          return;
        }
        if (!from || !to) {
          modal?.("Error", "Debes indicar las fechas de inicio y fin.");
          return;
        }

        const { entries, error } = buildTimeOffEntriesFromRange(from, to);
        if (error) {
          modal?.("Error", error);
          return;
        }

        const noteText =
          note ||
          (type === "vacation"
            ? "Solicitud de días de vacaciones"
            : "Solicitud de días de asuntos propios");

        const clientId = emitOptimisticTimeOffCR({
          kind: type,
          entries,
          note: noteText,
        });

        try {
          charge?.(true);
          const token = getToken();
          const resp = await createtimeoffrequest(
            {
              userId,
              type,
              entries,
              note: noteText,
            },
            token
          );

          const created = resp?.data && resp?.data?._id ? resp.data : resp;
          if (!created || created.error)
            throw new Error(
              created?.message || "No se pudo crear la solicitud de días"
            );

          setOptimisticLocal((prev) => {
            const next = prev.filter(
              (x) => String(x._id) !== String(clientId)
            );
            return mergeDedupe(next, [created]);
          });

          modal?.(
            "Solicitud enviada",
            "Tu solicitud de días está pendiente de revisión."
          );
        } catch (e) {
          setOptimisticLocal((prev) =>
            prev.filter((x) => String(x._id) !== String(clientId))
          );
          modal?.("Error", e?.message || "No se pudo crear la solicitud");
        } finally {
          charge?.(false);
          setIsReqTimeOffOpen(false);
          setReqTimeOffForm(null);
        }
      },
    });
    setIsReqTimeOffOpen(true);
  };

  // =================== Card de solicitud ===================
  const titleForUpload = (u) => {
    if (u?.originDocumentation) {
      const d = officialById.get(String(u.originDocumentation));
      return d?.name || "Documento oficial";
    }
    return u?.labelFile || "Documento";
  };

  const statusChip = (s) => {
    const cls =
      s === "approved"
        ? styles.approved
        : s === "pending"
          ? styles.pending
          : s === "rejected"
            ? styles.rejected
            : s === "stale"
              ? styles.stale
              : s === "failed"
                ? styles.failed
                : styles.cancelled;
    const txt =
      s === "approved"
        ? "Aprobada"
        : s === "pending"
          ? "Pendiente"
          : s === "rejected"
            ? "Rechazada"
            : s === "stale"
              ? "Caducada"
              : s === "failed"
                ? "Fallida"
                : "Cancelada";
    return <span className={`${styles.chip} ${cls}`}>{txt}</span>;
  };

  const ReqCard = ({ req, showCancel }) => (
    <div className={styles.card}>
      <div className={styles.header}>
        <div className={styles.left}>
          {statusChip(req.status)}
          <span className={styles.meta}>
            Enviada: {fmtDate(req.submittedAt)}
            {req.appliedAt ? ` · Aplicada: ${fmtDate(req.appliedAt)}` : ""}
            {req.decision?.decidedAt
              ? ` · Decidida: ${fmtDate(req.decision.decidedAt)}`
              : ""}
          </span>
        </div>
        <div className={styles.right}>
          {showCancel && (
            <button
              className={styles.btnGhost}
              onClick={() => onCancel(req._id)}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      {req.note && <p className={styles.note}>Nota: {req.note}</p>}

      {(req.changes?.length || 0) > 0 && (
        <>
          <h4 className={styles.subTitle}>Cambios solicitados</h4>
          <ul className={styles.changes}>
            {req.changes.map((c, i) => (
              <li key={i} className={styles.changeRow}>
                <span className={styles.path}>{labelFor(c.path)}</span>
                <span className={styles.arrow}>→</span>
                <div className={styles.values}>
                  <span className={styles.from}>
                    {fmtValue(c.path, c.from)}
                  </span>
                  <span className={styles.sep}>→</span>
                  <span className={styles.to}>{fmtValue(c.path, c.to)}</span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {(req.uploads?.length || 0) > 0 && (
        <>
          <h4 className={styles.to}>{titleForUpload(req.uploads[0])}</h4>
          <ul className={styles.changes}>
            {req.uploads.map((u, i) => (
              <li key={i} className={styles.changeRow}>
                <div className={styles.values}>
                  <span className={styles.to}>
                    <span className={styles.path}>
                      {u.originDocumentation ? "TIPO: Oficial" : "TIPO: Varios"}
                      {u.date ? ` · FECHA: ${fmtDate(u.date)}` : ""}
                    </span>
                    <br />
                    {!u.originDocumentation && (
                      <>
                        <span className={styles.path}>DESCRIPCIÓN: </span>
                        <span className={styles.from}>
                          {u.description || "—"}
                        </span>
                      </>
                    )}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

            {(req.decision?.note || (req.status === "failed" && req.error)) && (
        <div className={styles.decisionBox}>
          {req.decision?.note && (
            <p>
              <strong>Comentarios:</strong> {req.decision.note}
            </p>
          )}
          {req.status === "failed" && req.error && (
            <p className={styles.error}>
              <strong>Error técnico:</strong> {req.error}
            </p>
          )}
        </div>
      )}
    </div>
  );

  const TimeOffCard = ({ req, showCancel }) => {
    const { label, dates } = buildTimeOffInfo(req.timeOff);

    return (
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.left}>
            {statusChip(req.status)}
            <span className={styles.meta}>
              Enviada: {fmtDate(req.submittedAt)}
              {req.decision?.decidedAt
                ? ` · Decidida: ${fmtDate(req.decision.decidedAt)}`
                : ""}
            </span>
          </div>
          <div className={styles.right}>
            {showCancel && (
              <button className={styles.btnGhost} onClick={() => onCancel(req._id)}>
                Cancelar
              </button>
            )}
          </div>
        </div>

        {req.note && <p className={styles.note}>Nota: {req.note}</p>}

        <h4 className={styles.sectionTitle}>{label}</h4>
        {dates.length === 0 ? (
          <p className={styles.empty}>No hay días válidos en esta solicitud.</p>
        ) : (
          <ul className={styles.changes}>
            {dates.map((d) => (
              <li key={d} className={styles.changeRow}>
                <span className={styles.to}>{fmtDate(d)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  // =================== Render ===================
  return (
    <div className={styles.contenedor}>
      <h2>
        SOLICITUDES{" "}
        <button className={"btn-secondary"} onClick={openChangeStep1}>
          Solicitar cambio de datos
        </button>
        <button className={"btn-secondary"} onClick={openUploadStep1}>
          Solicitar subida de documento
        </button>
        <button className={"btn-secondary"} onClick={openTimeOffModal}>
          Solicitar días (vacaciones/asuntos propios)
        </button>
      </h2>

      {/* Pendientes */}
      <div className={styles.container}>
        <div className={styles.headerBar}>
          <h3 className={styles.title}>Solicitudes pendientes</h3>
          <div style={{ marginLeft: "auto", display: "flex", gap: 8 }} />
        </div>

        <div className={styles.boxChanges}>
          <h4 className={styles.sectionTitle}>Cambios de datos</h4>
          {pendingChanges.length === 0 && (
            <p className={styles.empty}>
              No hay solicitudes de cambio pendientes.
            </p>
          )}
          {pendingChanges.map((req) => (
            <ReqCard key={req._id} req={req} showCancel />
          ))}
        </div>

        <div className={styles.boxChanges}>
          <h4 className={styles.sectionTitle}>Documentos</h4>
          {pendingDocs.length === 0 && (
            <p className={styles.empty}>
              No hay solicitudes de documentos pendientes.
            </p>
          )}
          {pendingDocs.map((req) => (
            <ReqCard key={req._id} req={req} showCancel />
          ))}
        </div>

        <div className={styles.boxChanges}>
          <h4 className={styles.sectionTitle}>Vacaciones y asuntos propios</h4>
          {pendingTimeOff.length === 0 && (
            <p className={styles.empty}>
              No hay solicitudes de vacaciones ni asuntos propios pendientes.
            </p>
          )}
          {pendingTimeOff.map((req) => (
            <TimeOffCard key={req._id} req={req} showCancel />
          ))}
        </div>

      </div>

      {/* Toggle histórico */}
      <button
        className={styles.historyBtn}
        onClick={() => setShowHistory((s) => !s)}
      >
        {showHistory ? "Ocultar histórico" : "Ver histórico"}
      </button>

      {/* Histórico */}
      {showHistory && (
        <div className={styles.historyWrapper}>
          <h3 className={styles.title}>Histórico de solicitudes</h3>

          <div className={styles.boxChanges}>
            <h4 className={styles.sectionTitle}>Cambios de datos</h4>
            {historyChanges.length === 0 && (
              <p className={styles.empty}>No hay histórico de cambios.</p>
            )}
            {historyChanges.map((req) => (
              <ReqCard key={req._id} req={req} showCancel={false} />
            ))}
          </div>

          <div className={styles.boxChanges}>
            <h4 className={styles.sectionTitle}>Documentos</h4>
            {historyDocs.length === 0 && (
              <p className={styles.empty}>No hay histórico de documentos.</p>
            )}
            {historyDocs.map((req) => (
              <ReqCard key={req._id} req={req} showCancel={false} />
            ))}
          </div>

          <div className={styles.boxChanges}>
            <h4 className={styles.sectionTitle}>Vacaciones y asuntos propios</h4>
            {historyTimeOff.length === 0 && (
              <p className={styles.empty}>No hay histórico de vacaciones ni asuntos propios.</p>
            )}
            {historyTimeOff.map((req) => (
              <TimeOffCard key={req._id} req={req} showCancel={false} />
            ))}
          </div>

        </div>
      )}

      {/* Modal: solicitar subida de documento */}
      {isReqUploadOpen && reqUploadForm && (
        <ModalForm
          title={reqUploadForm.title}
          message={reqUploadForm.message}
          fields={reqUploadForm.fields}
          onSubmit={reqUploadForm.onSubmit}
          onClose={() => setIsReqUploadOpen(false)}
          modal={modal}
        />
      )}

      {/* Modal: solicitar cambio de datos (2 pasos) */}
      {isReqChangeOpen && reqChangeForm && (
        <ModalForm
          title={reqChangeForm.title}
          message={reqChangeForm.message}
          fields={reqChangeForm.fields}
          onSubmit={reqChangeForm.onSubmit}
          onClose={() => {
            setIsReqChangeOpen(false);
            setChangeWizard({ step: 1, path: "" });
          }}
          modal={modal}
        />
      )}

      {/* Modal: solicitar vacaciones / asuntos propios */}
      {isReqTimeOffOpen && reqTimeOffForm && (
        <ModalForm
          title={reqTimeOffForm.title}
          message={reqTimeOffForm.message}
          fields={reqTimeOffForm.fields}
          onSubmit={reqTimeOffForm.onSubmit}
          onClose={() => {
            setIsReqTimeOffOpen(false);
            setReqTimeOffForm(null);
          }}
          modal={modal}
        />
      )}
    </div>
  );
}