import React, { useState } from "react";
import ExcelJS from "exceljs";
import ModalForm from "../globals/ModalForm";
import { TbFileTypeXml } from "react-icons/tb";

/** 
 * Dado el ID de estudio, busca su nombre en enumsData.studies.
 */
function getStudyName(enumsData, studyId) {
  for (const block of enumsData.studies) {
    for (const sub of block.subcategories || []) {
      if (String(sub._id) === String(studyId)) return sub.name;
    }
  }
  return String(studyId);
}

/** Dado el ID de puesto, retorna su nombre, o el ID si no existe en jobsIndex. */
function getPositionName(enumsData, positionId) {
  const found = enumsData.jobsIndex[positionId];
  return found ? found.name : String(positionId);
}

/** Dado el ID de dispositivo, retorna { deviceName, programName }. */
function getDeviceAndProgram(enumsData, deviceId) {
  const deviceEntry = enumsData.programsIndex[deviceId];
  if (!deviceEntry || deviceEntry.type !== "device") {
    return { deviceName: "(desconocido)", programName: "(desconocido)" };
  }
  const deviceName = deviceEntry.name || "(sin nombre)";
  let programName = "(desconocido)";
  const pId = deviceEntry.programId;
  if (pId && enumsData.programsIndex[pId]) {
    programName = enumsData.programsIndex[pId].name || "(sin nombre)";
  }
  return { deviceName, programName };
}

function DocumentXLS({ users, enumsData }) {
  const [showModal, setShowModal] = useState(false);

  const fieldLabels = {
    firstName: "Nombre",
    lastName: "Apellidos",
    email: "Correo Electrónico",
    dni: "DNI",
    birthday:"Fecha de Nacimiento",
    phone: "Teléfono",
    disability: "Discapacidad",
    apafa: "APAFA",
    fostered: "Persona Extutelada",
    gender: "Género",
    employmentStatus: "Estado Laboral",
    hiringPeriods: "Periodos de Contratación",
    socialSecurityNumber: "Nº Seg. Social",
    bankAccountNumber: "Cuenta Bancaria",
    vacationDays: "Días de Vacaciones",
    personalDays: "Días Personales",
    consetmentDataProtection: "Consent. Protección de Datos",
    studies: "Estudios",
  };

  const finalFields = Object.keys(fieldLabels);

  const checkboxOptions = finalFields.map((field) => ({
    value: field,
    label: fieldLabels[field],
  }));

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
    return new Date(date).toLocaleDateString("es-ES");
  };

  /** 
   * Función principal: genera y descarga el XLSX.
   * En ella aprovechamos para transformar ids → nombres.
   */
  const downloadXlsxFromUsers = async (rawUsers, selectedColumns = []) => {
    // 1) Transformamos a un array nuevo, reemplazando ids por nombres en 'studies' y 'hiringPeriods'.
    const transformedUsers = rawUsers.map((user) => {
      // Reemplazar IDs de estudios
      const newStudies = (user.studies || []).map((id) =>
        getStudyName(enumsData, id)
      );

      // Reemplazar periodos
      const newPeriods = (user.hiringPeriods || []).map((p) => {
        const { deviceName, programName } = p.device
          ? getDeviceAndProgram(enumsData, p.device)
          : { deviceName: "", programName: "" };
        return {
          ...p,
          // Reemplazamos p.position
          position: getPositionName(enumsData, p.position),
          __deviceName: deviceName,
          __programName: programName,
        };
      });

      return { ...user, studies: newStudies, hiringPeriods: newPeriods };
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Users");

    // 2) Determinamos cuántos periodos máximos hay
    let maxPeriods = 0;
    transformedUsers.forEach((u) => {
      const count = u.hiringPeriods?.length || 0;
      if (count > maxPeriods) maxPeriods = count;
    });

    // 3) Si no se eligen columnas, marcamos todas
    if (!selectedColumns.length) {
      selectedColumns = finalFields;
    }

    // 4) Definimos columnas dinámicas
    const finalCols = [];
    selectedColumns.forEach((col) => {
      switch (col) {
        case "disability":
          finalCols.push({ header: "Discapacidad (%)", key: "disabilityPct" });
          finalCols.push({ header: "Notas Discapacidad", key: "disabilityNotes" });
          break;
        case "hiringPeriods":
          // 5 subcolumnas por periodo
          for (let i = 0; i < maxPeriods; i++) {
            const ix = i + 1;
            finalCols.push({ header: `Periodo${ix}_Inicio`, key: `period${ix}_start` });
            finalCols.push({ header: `Periodo${ix}_Fin`, key: `period${ix}_end` });
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

    // 5) Llenamos las filas
    transformedUsers.forEach((u) => {
      const row = {};
      selectedColumns.forEach((col) => {
        switch (col) {
          // Campos directos
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

          // Array de fechas
          case "vacationDays":
            row.vacationDays = (u.vacationDays || [])
              .map((d) => formatDate(d))
              .join(", ");
            break;

          case "personalDays":
            row.personalDays = (u.personalDays || [])
              .map((d) => formatDate(d))
              .join(", ");
            break;

          // Discapacidad
          case "disability":
            row.disabilityPct = u.disability?.percentage ?? "";
            row.disabilityNotes = u.disability?.notes ?? "";
            break;

          // Estudios (ya transformados en newStudies)
          case "studies":
            row.studies = (u.studies || []).join(", ");
            break;

          // Periodos
          case "hiringPeriods": {
            const arr = u.hiringPeriods || [];
            for (let i = 0; i < maxPeriods; i++) {
              const p = arr[i];
              const ix = i + 1;
              if (p) {
                row[`period${ix}_start`] = formatDate(p.startDate);
                row[`period${ix}_end`] = formatDate(p.endDate);
                row[`period${ix}_prog`] = p.__programName || "";
                row[`period${ix}_dev`] = p.__deviceName || "";
                row[`period${ix}_pos`] = p.position || "";
              } else {
                row[`period${ix}_start`] = "";
                row[`period${ix}_end`] = "";
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

    // 6) Generamos y descargamos el XLSX
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "listado_de_empleados.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleSubmit = (formData) => {
    setShowModal(false);
    downloadXlsxFromUsers(users, formData.columnsToInclude);
  };

  return (
    <>
      <TbFileTypeXml onClick={() => setShowModal(true)} />

      {showModal && (
        <ModalForm
          title="Descargar XLS"
          message="Selecciona las columnas a exportar."
          fields={fields}
          onSubmit={handleSubmit}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
}

export default DocumentXLS;
