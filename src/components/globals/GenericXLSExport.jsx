import React, { useState } from "react";
import ExcelJS from "exceljs";
import ModalForm from "./ModalForm";

/**
 * @typedef {Object} FieldDefinition
 * @property {string} key            – Propiedad en cada objeto de `data`.
 * @property {string} label         – Texto a mostrar en el selector y/o cabecera.
 * @property {"text"|"date"|"boolean"|"array"} [type]  – Tipo de campo para formateo (por defecto "text").
 * @property {function(any, object): any} [transform]  – Función custom para transformar valor.
 * @property {FieldDefinition[]} [subFields]  – Si es "array", definición de campos internos.
 * @property {number} [maxItems]      – Para arrays, máximo de elementos.
 */

/**
 * Componente genérico de exportación. Abre un modal para seleccionar campos y llama a
 * la función `onExport` con los datos y los campos seleccionados.
 * Si no se proporciona `onExport`, exporta a Excel usando ExcelJS según `fields`.
 *
 * Props:
 * @param {object[]} data               – Array de objetos a exportar.
 * @param {FieldDefinition[]} fields    – Definición de cada campo.
 * @param {(data: object[], keys: string[]) => void} [onExport]
 *                                         – Callback de export; recibe datos y campos seleccionados.
 * @param {string} fileName             – Nombre por defecto del archivo (para Excel).
 * @param {string} modalTitle           – Título del modal.
 * @param {string} modalMessage         – Mensaje dentro del modal.
 * @param {function(): void} onClose    – Callback al cerrar.
 */
export default function GenericXLSExport({
  data,
  fields,
  onExport,
  fileName = "export.xlsx",
  modalTitle = "Exportar datos",
  modalMessage = "Selecciona los campos a exportar:",
  onClose,
}) {
  const [showModal, setShowModal] = useState(true);

  // Opciones para el checkbox group
  const options = fields.map(f => ({ value: f.key, label: f.label }));

  const formFields = [
    {
      name: "fieldsToInclude",
      label: modalMessage,
      type: "checkboxGroup",
      required: true,
      defaultValue: fields.map(f => f.key),
      options,
    },
  ];

  // Formateo genérico según definición
  const formatValue = (def, value, row) => {
    if (def.transform) return def.transform(value, row);
    switch (def.type) {
      case "date":
        return value ? new Date(value).toLocaleDateString("es-ES") : "";
      case "boolean":
        return value ? "Sí" : "No";
      default:
        return value != null ? String(value) : "";
    }
  };

  // Exportación por defecto a ExcelJS
  const defaultExport = async (selectedKeys) => {
    const workbook = new ExcelJS.Workbook();
    const ws = workbook.addWorksheet("Export");

    // Definir columnas dinámicas
    const cols = [];
    fields.forEach(def => {
      if (!selectedKeys.includes(def.key)) return;
      if (def.type === "array" && def.subFields) {
        const max = def.maxItems || Math.max(...data.map(d => (d[def.key] || []).length));
        for (let i = 0; i < max; i++) {
          def.subFields.forEach(sub => {
            cols.push({
              header: `${def.label}_${i + 1}_${sub.label}`,
              key: `${def.key}_${i}_${sub.key}`
            });
          });
        }
      } else {
        cols.push({ header: def.label, key: def.key });
      }
    });
    ws.columns = cols.map(c => ({ ...c, width: 25 }));

    // Rellenar filas
    data.forEach(row => {
      const rowData = {};
      fields.forEach(def => {
        if (!selectedKeys.includes(def.key)) return;
        if (def.type === "array" && def.subFields) {
          const arr = row[def.key] || [];
          const max = def.maxItems || arr.length;
          for (let i = 0; i < max; i++) {
            const item = arr[i] || {};
            def.subFields.forEach(sub => {
              rowData[`${def.key}_${i}_${sub.key}`] = formatValue(sub, item[sub.key], item);
            });
          }
        } else {
          rowData[def.key] = formatValue(def, row[def.key], row);
        }
      });
      ws.addRow(rowData);
    });

    // Descargar
    const buffer = await workbook.xlsx.writeBuffer();
    const blob = new Blob([buffer], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Al enviar el modal
  const handleSubmit = async (vals) => {
    const selected = vals.fieldsToInclude;
    if (onExport) {
      await onExport(data, selected);
    } else {
      await defaultExport(selected);
    }
    setShowModal(false);
    onClose();
  };

  return showModal ? (
    <ModalForm
      title={modalTitle}
      message={modalMessage}
      fields={formFields}
      onSubmit={handleSubmit}
      onClose={() => { setShowModal(false); onClose(); }}
    />
  ) : null;
}
