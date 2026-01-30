// src/components/volunteer/CreateVolunteerDocumentXLS.jsx
import React, { useMemo, useState } from "react";
import ModalForm from "../globals/ModalForm";

/* =========================
 * Helpers label resolvers
 * ========================= */

const isValidObjectId = (s) => typeof s === "string" && /^[0-9a-fA-F]{24}$/.test(s);

const formatDate = (date) => {
  if (!date) return "";
  const d = new Date(date);
  return Number.isNaN(d.getTime()) ? "" : d.toLocaleDateString("es-ES");
};

function getProvinceName(enumsData, province) {
  if (!province) return "";
  // populated
  if (typeof province === "object") return (province.name || "").trim();
  const idx = enumsData?.provincesIndex || {};
  return (idx[String(province)]?.name || String(province)).trim();
}

function getProgramName(enumsData, programId) {
  if (!programId) return "";
  const idx = enumsData?.programsIndex || {};
  const p = idx[String(programId)];
  return (p?.acronym || p?.name || String(programId)).trim();
}

function getDeviceName(enumsData, deviceId) {
  if (!deviceId) return "";
  const idx = enumsData?.dispositiveIndex || {};
  const d = idx[String(deviceId)];
  return (d?.name || String(deviceId)).trim();
}

function getStudyName(enumsData, studyId) {
  if (!studyId) return "";
  const sIdx = enumsData?.studiesIndex || {};
  const key = String(studyId);

  const dir = sIdx[key];
  if (dir?.name && !dir?.subcategories) return dir.name;

  for (const [, cat] of Object.entries(sIdx)) {
    const match = (cat?.subcategories || []).find((s) => String(s._id) === key);
    if (match?.name) return match.name;
  }

  return key;
}

function normalizeIdsArray(value) {
  if (!value) return [];
  const arr = Array.isArray(value) ? value : [value];
  return arr
    .map((x) => (x && typeof x === "object" ? x?._id : x))
    .map((x) => String(x || "").trim())
    .filter((x) => isValidObjectId(x));
}

/* =========================
 * Componente principal
 * ========================= */

export default function CreateVolunteerDocumentXLS({
  volunteers,
  enumsData,
  closeXls,
  modal,
}) {
  const [showModal] = useState(true);
  const ALL = "__ALL__";

  const fieldLabels = useMemo(
    () => ({
      createdAt: "Fecha Creación",
      firstName: "Nombre",
      lastName: "Apellidos",
      documentId: "DNI/NIE",
      email: "Email",
      phone: "Teléfono",
      gender: "Género",
      birthDate: "Fecha Nacimiento",

      province: "Provincia",
      localidad: "Localidad",

      state: "Estado",
      active: "Activo",
      lastStatus_type: "Último estado (tipo)",
      lastStatus_at: "Último estado (fecha)",
      lastStatus_reason: "Último estado (motivo)",

      programInterest: "Programas de interés",
      areaInterest: "Áreas de interés",
      studies: "Estudios",
      occupation: "Ocupación",
      occupationOtherText: "Ocupación (otro)",
      availability: "Disponibilidad",
      referralSource: "Origen derivación",
      userNote: "Nota del usuario",

      chronology: "Cronología (dinámica)",
    }),
    []
  );

  const finalFields = useMemo(() => Object.keys(fieldLabels), [fieldLabels]);

  const checkboxOptions = useMemo(
    () => [
      { value: ALL, label: "Todos los campos" },
      ...finalFields.map((field) => ({ value: field, label: fieldLabels[field] })),
    ],
    [finalFields, fieldLabels]
  );

  const fields = useMemo(
    () => [
      {
        name: "columnsToInclude",
        label: "Seleccionar Columnas a Exportar",
        type: "checkboxGroup",
        required: true,
        defaultValue: [],
        options: checkboxOptions,
      },
    ],
    [checkboxOptions]
  );

  const downloadXlsxFromVolunteers = async (rawVolunteers, selectedColumns = []) => {
    const ExcelJS = (await import("exceljs/dist/exceljs.min.js")).default;

    // normaliza y calcula max cronologías
    const normalized = (rawVolunteers || []).map((v) => ({
      ...v,
      provinceLabel: getProvinceName(enumsData, v?.province),
      programInterestLabels: (Array.isArray(v?.programInterest) ? v.programInterest : [])
        .map((x) => (typeof x === "object" ? x?._id : x))
        .map((id) => getProgramName(enumsData, id))
        .filter(Boolean),
      areaInterestLabels: (Array.isArray(v?.areaInterest) ? v.areaInterest : [])
        .map((x) => String(x || "").trim())
        .filter(Boolean),
      studiesLabels: (Array.isArray(v?.studies) ? v.studies : [])
        .map((x) => (typeof x === "object" ? x?._id : x))
        .map((id) => getStudyName(enumsData, id))
        .filter(Boolean),
      chronologyArr: Array.isArray(v?.chronology) ? v.chronology : [],
    }));

    let maxChrono = 0;
    normalized.forEach((v) => {
      if ((v.chronologyArr?.length || 0) > maxChrono) maxChrono = v.chronologyArr.length;
    });

    if (!selectedColumns.length) selectedColumns = finalFields;

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Volunteers");

    // columnas dinámicas
    const finalCols = [];
    selectedColumns.forEach((col) => {
      switch (col) {
        case "chronology": {
          for (let i = 0; i < maxChrono; i++) {
            const ix = i + 1;
            finalCols.push({ header: `Crono${ix}_Inicio`, key: `chrono${ix}_start` });
            finalCols.push({ header: `Crono${ix}_Fin`, key: `chrono${ix}_end` });
            finalCols.push({ header: `Crono${ix}_Horas`, key: `chrono${ix}_hours` });
            finalCols.push({ header: `Crono${ix}_Áreas`, key: `chrono${ix}_areas` });
            finalCols.push({ header: `Crono${ix}_Provincias`, key: `chrono${ix}_provinces` });
            finalCols.push({ header: `Crono${ix}_Dispositivos`, key: `chrono${ix}_devices` });
            finalCols.push({ header: `Crono${ix}_Notas`, key: `chrono${ix}_notes` });
          }
          break;
        }
        default:
          finalCols.push({ header: fieldLabels[col] || col, key: col });
          break;
      }
    });

    worksheet.columns = finalCols.map((c) => ({ ...c, width: 25 }));

    // filas
    normalized.forEach((v) => {
      const row = {};

      selectedColumns.forEach((col) => {
        switch (col) {
          case "createdAt":
            row.createdAt = formatDate(v.createdAt);
            break;

          case "birthDate":
            row.birthDate = formatDate(v.birthDate);
            break;

          case "province":
            row.province = v.provinceLabel || "";
            break;

          case "programInterest":
            row.programInterest = (v.programInterestLabels || []).join(", ");
            break;

          case "areaInterest":
            row.areaInterest = (v.areaInterestLabels || []).join(", ");
            break;

          case "studies":
            row.studies = (v.studiesLabels || []).join(", ");
            break;

          case "occupation":
            row.occupation = (Array.isArray(v.occupation) ? v.occupation : [])
              .map((x) => String(x).replaceAll("_", " "))
              .join(", ");
            break;

          case "active":
            row.active = v.active === false ? "No" : "Sí";
            break;

          case "lastStatus_type":
            row.lastStatus_type = v?.lastStatus?.type || "";
            break;

          case "lastStatus_at":
            row.lastStatus_at = v?.lastStatus?.at ? formatDate(v.lastStatus.at) : "";
            break;

          case "lastStatus_reason":
            row.lastStatus_reason = v?.lastStatus?.reason || "";
            break;

          case "chronology": {
            const arr = Array.isArray(v.chronologyArr) ? v.chronologyArr : [];
            for (let i = 0; i < maxChrono; i++) {
              const item = arr[i];
              const ix = i + 1;

              if (!item) {
                row[`chrono${ix}_start`] = "";
                row[`chrono${ix}_end`] = "";
                row[`chrono${ix}_hours`] = "";
                row[`chrono${ix}_areas`] = "";
                row[`chrono${ix}_provinces`] = "";
                row[`chrono${ix}_devices`] = "";
                row[`chrono${ix}_notes`] = "";
                continue;
              }

              const areas = (Array.isArray(item?.areas) ? item.areas : [])
                .map((x) => String(x || "").trim())
                .filter(Boolean)
                .join(", ");

              const provs = normalizeIdsArray(item?.provinces)
                .map((id) => getProvinceName(enumsData, id))
                .filter(Boolean)
                .join(", ");

              const devs = normalizeIdsArray(item?.dispositives)
                .map((id) => getDeviceName(enumsData, id))
                .filter(Boolean)
                .join(", ");

              row[`chrono${ix}_start`] = formatDate(item?.startAt);
              row[`chrono${ix}_end`] = formatDate(item?.endAt);
              row[`chrono${ix}_hours`] = String(item?.hours ?? "");
              row[`chrono${ix}_areas`] = areas;
              row[`chrono${ix}_provinces`] = provs;
              row[`chrono${ix}_devices`] = devs;
              row[`chrono${ix}_notes`] = item?.notes || "";
            }
            break;
          }

          default:
            row[col] = v[col] ?? "";
            break;
        }
      });

      worksheet.addRow(row);
    });

    // descarga
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "listado_de_voluntariado.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (formData) => {
    const selected =
      Array.isArray(formData.columnsToInclude) && formData.columnsToInclude.includes(ALL)
        ? finalFields
        : formData.columnsToInclude || [];

    closeXls?.();
    downloadXlsxFromVolunteers(volunteers, selected);
  };

  if (!showModal) return null;

  return (
    <ModalForm
      title="Descargar XLS (Voluntariado)"
      message="Selecciona las columnas a exportar."
      fields={fields}
      onSubmit={handleSubmit}
      onClose={() => closeXls?.(false)}
      modal={modal}
    />
  );
}
