// components/ManagingEnum.jsx
import React, { useState, useEffect, useMemo, useCallback } from "react";
import styles from "../styles/managingEnum.module.css";
import ModalConfirmation from "../globals/ModalConfirmation";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import {
  changeData, createData, deleteData,
  createSubData, deleteSubData
} from "../../lib/data";

import EnumCRUD from "./EnumCRUD";
import { ENUM_OPTIONS, NO_SUB_ENUMS } from "./enumConfig";



export default function ManagingEnum({
  enumsData = {},
  charge,
  modal,
  chargeEnums
}) {
  const [selectedKey, setSelectedKey] = useState("");
  const [crudData, setCrudData] = useState({});

 const runWithSpinner = useCallback(async (fn) => {
    try {
      charge(true);
      return await fn();
    } finally {
      charge(false);
    }
 }, [charge]);

  // --- side effects ---------------------------------------------------------
  useEffect(() => setCrudData(enumsData), [enumsData]);
  const closeMessage = () => setMessageModal({ open: false, title: "", message: "" });

  // --- local modal states ---------------------------------------------------
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState({ open: false });
  const [formModal,    setFormModal]    = useState({ open: false });

  // --------------------------------------------------------------------------
  // utilidades (sin cambios en la lógica, pero fuera del render principal)
  // --------------------------------------------------------------------------
  const getFields = useCallback(
    (enumKey, baseFields, item = null) => {
      const fields = [...baseFields];

      if (enumKey === "documentation") {
        fields.push(
          // { name: "name",  label: "Nombre", defaultValue: item?.label || "", required: true },
          {
            name: "date",
            label: "Fecha",
            type: "select",
            defaultValue: item?.date ? "si" : "no",
            required: true,
            options: [
              { value: "si", label: "Si" },
              { value: "no", label: "No" },
            ],
          },
          {
            name: "model",
            label: "Sección",
            type: "select",
            defaultValue: item?.model || "",
            required: true,
            options: [
              { value: "",        label: "Seleccione una opción" },
              { value: "Program", label: "Programas y Dispositivos" },
              { value: "User",    label: "Trabajadores" },
            ],
          },
          {
            name: "duration",
            label: "Duración (Solo si tiene fecha)",
            type: "number",
            defaultValue: item?.duration || 0,
          },
          {
            name: "categoryFiles",
            label: "Categoría del archivo",
            type: "select",
            defaultValue: item?.categoryFiles || "",
            options: [
              { value: "", label: "Seleccione una opción" },
              ...(enumsData.categoryFiles ?? []).map((d) => ({ value: d, label: d })),
            ],
          }
        );
      }

      if (enumKey === "jobs") {
        fields.push({
          name: "public",
          label: "Pública",
          type: "select",
          required: true,
          defaultValue: item?.public ? "si" : "no",
          options: [
            { value: "si", label: "Si" },
            { value: "no", label: "No" },
          ],
        });
      }

      return fields;
    },
    [enumsData.categoryFiles]
  );


  // Editar un item
  const handleEditItem = (enumKey, item) => {

    const baseFields = [
      { name: "name", label: "Nombre", defaultValue: item.name, required: true },
    ];
    setFormModal({
      open: true,
      title: "Editar Elemento",
      message: `Editar elemento: ${item.name}`,
      fields: getFields(enumKey, baseFields, item),
      onSubmit: async (formData) => {
        const payload = { id: item._id, type: enumKey, name: formData.name };
        if (enumKey === "documentation") {
          payload.date = formData.date;
          payload.name = formData.name;
          payload.model = formData.model;
          payload.categoryFiles=formData.categoryFiles
          if((!!item.date || !!formData.date) && !!formData.duration)  payload.duration = formData.duration;
        }
        if (enumKey === "jobs") payload.public = formData.public;
        await runWithSpinner(() => changeData(getToken(), payload));
        setCrudData((prev) => ({
          ...prev,
          [enumKey]: prev[enumKey].map((it) =>
            it._id === item._id
              ? {
                  ...it,
                  name: formData.name,
                  ...(enumKey === "documentation" && {
                    date: formData.date === "si",
                    name: formData.name,
                    model: formData.model,
                    duration: formData.duration || 0,
                    categoryFiles:formData.categoryFiles
                  }),
                  ...(enumKey === "jobs" && { public: formData.public === "si" }),
                }
              : it
          ),
        }));
        modal("Actualizado", "Elemento actualizado con éxito");

        setFormModal({ open: false });
      },
      onClose: () => setFormModal({ open: false }),
    });
  };

  // Borrar un item
  const handleDeleteItem = (enumKey, item) => {

    setConfirmModal({
      open: true,
      title: "Confirmar Eliminación",
      message: `¿Deseas eliminar "${item.name}"?`,
      onConfirm: async () => {
        await runWithSpinner(() => deleteData(getToken(), { id: item._id, type: enumKey }));
        
        setCrudData((prev) => ({
          ...prev,
          [enumKey]: prev[enumKey].filter((it) => it._id !== item._id),
        }));
        modal("Eliminado", "Elemento eliminado con éxito");
        setConfirmModal({ open: false });

      },
      onCancel: () => setConfirmModal({ open: false }),
    });
  };

  // Crear un nuevo item
  const handleCreateItem = (enumKey) => {

    const baseFields = [
      { name: "name", label: "Nombre", defaultValue: "", required: true }
    ];
    setFormModal({
      open: true,
      title: "Crear Nuevo Elemento",
      message: "Ingrese el nombre del nuevo elemento",
      fields: getFields(enumKey, baseFields),
      onSubmit: async (formData) => {
        const payload = { name: formData.name, type: enumKey };
        if (enumKey === "documentation") {
          payload.date = formData.date;
          payload.name = formData.name;
          payload.model = formData.model;
          payload.categoryFiles=formData.categoryFiles
          if(!!payload.date) payload.duration=formData.duration;
        }
        if (enumKey === "jobs") payload.public = formData.public;
        const newItem= await runWithSpinner(() => createData(getToken(), payload));
        setCrudData((prev) => ({
          ...prev,
          [enumKey]: [...(prev[enumKey] || []), newItem],
        }));
        if (newItem.error) {
          modal("Error", "No se pudo crear el elemento.");

        } else {
          modal("Creado", "Elemento creado exitosamente.");

        }
        setFormModal({ open: false });
      },
      onClose: () => setFormModal({ open: false }),
    });
  };

  // Crear subcategoría (solo para enums que lo permiten)
  const handleCreateSub = (enumKey, item) => {
    if (NO_SUB_ENUMS.includes(enumKey)) return;
    // Para subcategorías de "jobs" se añade también el campo "public"
    const baseFields = [{ name: "name", label: "Nombre", defaultValue: "", required: true }];
    const fields = enumKey === "jobs" ? getFields(enumKey, baseFields) : baseFields;
    setFormModal({
      open: true,
      title: "Crear Subcategoría",
      message: `Crear subcategoría para ${item.name}`,
      fields,
      onSubmit: async (formData) => {
        const payload = { id: item._id, type: enumKey, name: formData.name };
        if (enumKey === "jobs") payload.public = formData.public;
        const newSub= await runWithSpinner( ()=> createSubData(getToken(), payload));
        setCrudData((prev) => ({
          ...prev,
          [enumKey]: prev[enumKey].map((it) =>
            it._id === item._id
              ? { ...it, subcategories: [...(it.subcategories || []), newSub] }
              : it
          ),
        }));
        modal("Subcategoría Creada", "Subcategoría agregada.");
        setFormModal({ open: false });
      },
      onClose: () => setFormModal({ open: false }),
    });
  };

  // Editar subcategoría
  const handleEditSub = (enumKey, item, sub) => {
    // Para subcategorías de "jobs" se añade el campo "public"
    const baseFields = [{ name: "name", label: "Nombre", defaultValue: sub.name, required: true }];
    const fields = enumKey === "jobs" ? getFields(enumKey, baseFields, sub) : baseFields;
    setFormModal({
      open: true,
      title: "Editar Subcategoría",
      message: `Editar subcategoría: ${sub.name}`,
      fields,
      onSubmit: async (formData) => {
        const payload = { id: item._id, type: enumKey, name: formData.name, subId: sub._id };
        if (enumKey === "jobs") payload.public = formData.public;
        
        await runWithSpinner( ()=> changeData(getToken(), payload));
        setCrudData((prev) => ({
          ...prev,
          [enumKey]: prev[enumKey].map((it) => {
            if (it._id === item._id && it.subcategories) {
              const updatedSubs = it.subcategories.map((s) =>
                s._id === sub._id
                  ? {
                      ...s,
                      name: formData.name,
                      ...(enumKey === "jobs" && { public: formData.public === "si" }),
                    }
                  : s
              );
              return { ...it, subcategories: updatedSubs };
            }
            return it;
          }),
        }));
        modal("Subcategoría Actualizada", "Subcategoría actualizada.");
        setFormModal({ open: false });
      },
      onClose: () => setFormModal({ open: false }),
    });
  };

  // Borrar subcategoría
  const handleDeleteSub = (enumKey, item, sub) => {
    setConfirmModal({
      open: true,
      title: "Confirmar Eliminación",
      message: `¿Deseas eliminar la subcategoría "${sub.name}"?`,
      onConfirm: async () => {
        await runWithSpinner( ()=> deleteSubData(getToken(), { id: item._id, type: enumKey, idCategory: sub._id }));
        
        setCrudData((prev) => ({
          ...prev,
          [enumKey]: prev[enumKey].map((it) => {
            if (it._id === item._id && it.subcategories) {
              const updatedSubs = it.subcategories.filter((s) => s._id !== sub._id);
              return { ...it, subcategories: updatedSubs };
            }
            return it;
          }),
        }));
        modal("Subcategoría Eliminada", "Subcategoría eliminada.");
        setConfirmModal({ open: false });
      },
      onCancel: () => setConfirmModal({ open: false }),
    });
  };

  // "modal" se recibe desde App y se trata como componente


const actions = useMemo(
    () => ({
      createItem:     () => handleCreateItem(selectedKey),
      createSub:      (item)         => handleCreateSub(selectedKey, item),
      editItem:       (item)         => handleEditItem(selectedKey, item),
      deleteItem:     (item)         => handleDeleteItem(selectedKey, item),
      editSub:        (item, sub)    => handleEditSub(selectedKey, item, sub),
      deleteSub:      (item, sub)    => handleDeleteSub(selectedKey, item, sub),
      noSubEnums:     NO_SUB_ENUMS,   // lo exponemos para EnumCRUD
    }),
    [selectedKey]    // eslint-disable-line react-hooks/exhaustive-deps
  );

  // --------------------------------------------------------------------------
  // JSX
  // --------------------------------------------------------------------------
  const ModalComponent = modal;
  return (
    <div className={styles.contenedor}>
      <h2>GESTIÓN DE ENUMERADOS</h2>

      <div className={styles.contenido}>
        <label htmlFor="enumSelect">Selecciona una categoría:</label>
        <select
          id="enumSelect"
          value={selectedKey}
          onChange={(e) => setSelectedKey(e.target.value)}
        >
          <option value="">Selecciona una opción</option>
          {ENUM_OPTIONS.map(({ key, label }) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {selectedKey && (
          <EnumCRUD
            selectedKey={selectedKey}
            data={crudData[selectedKey] || []}
            actions={actions}
          />
        )}
      </div>

      {/* ---- modales ---- */}
      {messageModal.open && (
        <ModalComponent data={messageModal} closeModal={closeMessage} />
      )}

      {confirmModal.open && (
        <ModalConfirmation {...confirmModal} />
      )}

      {formModal.open && (
        <ModalForm {...formModal} />
      )}

    </div>
  );
}
