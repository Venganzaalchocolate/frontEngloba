// src/components/employer/CreateDocumentXLS.jsx
import React, { useState } from "react";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { hiringList } from "../../lib/data";

/* =========================
 * Helpers de nombres/etiquetas
 * ========================= */

/** Devuelve el nombre del estudio buscando en studiesIndex y sus subcategorías */
function getStudyName(enumsData, studyId) {
  const sIdx = enumsData?.studiesIndex || {};
  const key = String(studyId);

  // hit directo por si fuera id de categoría
  const dir = sIdx[key];
  if (dir?.name && !dir?.subcategories) return dir.name;

  // buscar en subcategorías de todas las categorías
  for (const [, cat] of Object.entries(sIdx)) {
    const match = (cat?.subcategories || []).find((s) => String(s._id) === key);
    if (match?.name) return match.name;
  }

  return key;
}

/** Devuelve el nombre del puesto desde enumsData.jobsIndex */
function getPositionName(enumsData, positionId) {
  const idx = enumsData?.jobsIndex || {};
  const key = String(positionId);

  // muy raro que haya hit directo, pero por si acaso
  const direct = idx[key];
  if (direct?.name) return direct.name;

  // buscar en subcategorías
  for (const [, job] of Object.entries(idx)) {
    const sub = (job.subcategories || []).find((s) => String(s._id) === key);
    if (sub?.name) return sub.name;
  }

  return key;
}

/** Intenta extraer el id del dispositivo de un periodo con distintos nombres posibles */
function resolveDeviceId(period) {
  return (
    period?.dispositiveID ??
    period?.device ??
    period?.dispositive ??
    period?.deviceId ??
    null
  );
}

/** Nombre de dispositivo y programa SOLO con dispositiveIndex + programsIndex */
function getDeviceAndProgram(enumsData, deviceId) {
  const dIdx = enumsData?.dispositiveIndex || {};
  const pIdx = enumsData?.programsIndex || {};


  const dev = deviceId ? dIdx[deviceId] : null;

  const deviceName = dev?.name || (deviceId ? deviceId : "(desconocido)");

  const progId = dev?.program || dev?.programId || dev?.parentId || null;
  const prog = progId ? pIdx[progId] : null;

  const programName = prog?.name || (progId ? progId : "(desconocido)");
  const programAcronym = prog?.acronym || programName;
 console.log({ deviceName, programName, programAcronym })
  return { deviceName, programName, programAcronym };
}

/* =========================
 * Componente principal
 * ========================= */

function CreateDocumentXLS({ users, enumsData, closeXls }) {
  const [showModal] = useState(true);
  const ALL = "__ALL__";
  const fieldLabels = {
    firstName: "Nombre",
    lastName: "Apellidos",
    email: "Correo Electrónico Corporativo",
    dni: "DNI",
    birthday: "Fecha de Nacimiento",
    phone: "Teléfono",
    disability: "Discapacidad",
    apafa: "APAFA",
    fostered: "Persona Extutelada",
    gender: "Género",
    employmentStatus: "Estado Laboral",
    hiringPeriods: "Periodos de Contratación (abiertos)",
    socialSecurityNumber: "Nº Seg. Social",
    bankAccountNumber: "Cuenta Bancaria",
    vacationDays: "Días de Vacaciones",
    personalDays: "Días Personales",
    consetmentDataProtection: "Consent. Protección de Datos",
    studies: "Estudios",
  };

  const finalFields = Object.keys(fieldLabels);

  const checkboxOptions = [
    { value: ALL, label: "Todos los campos" },
    ...finalFields.map((field) => ({
      value: field,
      label: fieldLabels[field],
    })),
  ];

  const fields = [
    {
      name: "columnsToInclude",
      label: "Seleccionar Columnas a Exportar",
      type: "checkboxGroup",
      required: true,
      defaultValue: [],
      options: checkboxOptions,
    },
  ];

  const formatDate = (date) => {
    if (!date) return "";
    const d = new Date(date);
    return isNaN(d) ? "" : d.toLocaleDateString("es-ES");
  };

  /* ========== FALLBACK controlado para evitar 429 ========== */
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * Solo se usa si el back NO ha mandado openHirings.
   * Hace peticiones en lotes pequeños con pausas.
   */
  const fetchOpenPeriodsForUsers = async (userIds, token, batchSize = 4, delayMs = 250) => {
    const map = new Map(); // userId -> periods[]
    for (let i = 0; i < userIds.length; i += batchSize) {
      const slice = userIds.slice(i, i + batchSize);
      const results = await Promise.allSettled(
        slice.map((id) =>
          hiringList({ idUser: id, openOnly: true, active: true, page: 1, limit: 200 }, token)
        )
      );
      results.forEach((r, idx) => {
        const uid = slice[idx];
        if (r.status === "fulfilled") {
          const res = r.value || {};
          const periods = Array.isArray(res?.docs)
            ? res.docs
            : Array.isArray(res)
            ? res
            : [];
          map.set(uid, periods);
        } else {
          map.set(uid, []);
        }
      });
      if (i + batchSize < userIds.length) await sleep(delayMs);
    }
    return map;
  };

  /** Genera y descarga el XLS (usando openHirings del back o fallback throttled) */
  const downloadXlsxFromUsers = async (rawUsers, selectedColumns = []) => {
    const ExcelJS = (await import("exceljs/dist/exceljs.min.js")).default;

    // Preferimos lo que ya trae el back
    const backAlreadyGaveOpen = rawUsers.every((u) => Array.isArray(u.openHirings));
    let periodsMap = new Map();

    if (backAlreadyGaveOpen) {
      rawUsers.forEach((u) => periodsMap.set(String(u._id), u.openHirings));
    } else {
      const token = getToken();
      const userIds = rawUsers.map((u) => String(u._id));
      periodsMap = await fetchOpenPeriodsForUsers(userIds, token, 4, 250);
    }

    // Transformar: studies → nombres; open periods → enriquecidos (device/program por índices)
    const transformedUsers = rawUsers.map((user) => {
      const newStudies = (user.studies || []).map((id) => getStudyName(enumsData, id));

      const openPeriods = (periodsMap.get(String(user._id)) || []).map((p) => {
        const positionName = getPositionName(enumsData, p.position);
        const deviceId = resolveDeviceId(p);
        const { deviceName, programName, programAcronym } = getDeviceAndProgram(
          enumsData,
          deviceId
        );
        return {
          ...p,
          position: positionName,
          __deviceName: deviceName,
          __programName: programName,
          __programAcronym: programAcronym,
        };
      });

      return { ...user, studies: newStudies, __openPeriods: openPeriods };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    // Calcular máximo de periodos abiertos
    let maxPeriods = 0;
    transformedUsers.forEach((u) => {
      const count = u.__openPeriods?.length || 0;
      if (count > maxPeriods) maxPeriods = count;
    });

    if (!selectedColumns.length) selectedColumns = finalFields;

    // Definir columnas dinámicas
    const finalCols = [];
    selectedColumns.forEach((col) => {
      switch (col) {
        case "disability":
          finalCols.push({ header: "Discapacidad (%)", key: "disabilityPct" });
          finalCols.push({ header: "Notas Discapacidad", key: "disabilityNotes" });
          break;
        case "hiringPeriods":
          for (let i = 0; i < maxPeriods; i++) {
            const ix = i + 1;
            finalCols.push({ header: `Periodo${ix}_Inicio`, key: `period${ix}_start` });
            finalCols.push({ header: `Periodo${ix}_Programa`, key: `period${ix}_prog` });
            finalCols.push({ header: `Periodo${ix}_Dispositivo`, key: `period${ix}_dev` });
            finalCols.push({ header: `Periodo${ix}_Puesto`, key: `period${ix}_pos` });
          }
          break;
        default:
          finalCols.push({ header: fieldLabels[col] || col, key: col });
          break;
      }
    });

    worksheet.columns = finalCols.map((c) => ({ ...c, width: 25 }));

    // Volcar filas
    transformedUsers.forEach((u) => {
      const row = {};
      selectedColumns.forEach((col) => {
        switch (col) {
          // directos
          case "firstName":
          case "lastName":
          case "dni":
          case "email":
          case "phone":
          case "employmentStatus":
          case "socialSecurityNumber":
          case "bankAccountNumber":
            row[col] = u[col] || "";
            break;

          case "birthday":
            row.birthday = formatDate(u.birthday);
            break;

          case "gender":
            row.gender = u.gender || "";
            break;

          case "apafa":
            row.apafa = u.apafa ? "Sí" : "No";
            break;

          case "fostered":
            row.fostered = u.fostered ? "Sí" : "No";
            break;

          case "consetmentDataProtection":
            row.consetmentDataProtection = u.consetmentDataProtection ? "Sí" : "No";
            break;

          case "vacationDays":
            row.vacationDays = (u.vacationDays || []).map((d) => formatDate(d)).join(", ");
            break;

          case "personalDays":
            row.personalDays = (u.personalDays || []).map((d) => formatDate(d)).join(", ");
            break;

          case "disability":
            row.disabilityPct = u.disability?.percentage ?? "";
            row.disabilityNotes = u.disability?.notes ?? "";
            break;

          case "studies":
            row.studies = (u.studies || []).join(", ");
            break;

          case "hiringPeriods": {
            const arr = u.__openPeriods || [];
            for (let i = 0; i < maxPeriods; i++) {
              const p = arr[i];
              const ix = i + 1;
              if (p) {
                row[`period${ix}_start`] = formatDate(p.startDate);
                row[`period${ix}_prog`] = p.__programName; // <- usa acronym cambiando a p.__programAcronym
                row[`period${ix}_dev`] = p.__deviceName || "";
                row[`period${ix}_pos`] = p.position || "";
              } else {
                row[`period${ix}_start`] = "";
                row[`period${ix}_prog`] = "";
                row[`period${ix}_dev`] = "";
                row[`period${ix}_pos`] = "";
              }
            }
            break;
          }

          default:
            row[col] = u[col] ?? "";
            break;
        }
      });
      worksheet.addRow(row);
    });

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "listado_de_empleados.xlsx";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (formData) => {
    const selected =
      Array.isArray(formData.columnsToInclude) &&
      formData.columnsToInclude.includes(ALL)
        ? finalFields
        : formData.columnsToInclude || [];

    closeXls();
    downloadXlsxFromUsers(users, selected);
  };

  if (!showModal) return null;

  return (
    <ModalForm
      title="Descargar XLS"
      message="Selecciona las columnas a exportar."
      fields={fields}
      onSubmit={handleSubmit}
      onClose={() => closeXls(false)}
    />
  );
}

export default CreateDocumentXLS;
