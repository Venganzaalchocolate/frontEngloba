import React, { useState, useEffect } from "react";
import styles from "../styles/managingEnum.module.css";
import ModalConfirmation from "../globals/ModalConfirmation";
import ModalForm from "../globals/ModalForm";
import { getToken } from "../../lib/serviceToken";
import { changeData, createData, deleteData, createSubData, deleteSubData } from "../../lib/data";
import { FaRegEdit, FaTrashAlt, FaPlusSquare } from "react-icons/fa";
import { FaEye, FaEyeSlash } from "react-icons/fa6";

// Lista de opciones (se añadió "leavetype")
const optionsList = ["documentation", "studies", "jobs", "provinces", "work_schedule", "finantial", "leavetype"];
const optionListCastellano = [
  "Documentación",
  "Estudios",
  "Trabajos",
  "Provincias",
  "Horarios",
  "Financiación",
  "Excedencias"
];

// Los enumerados que NO deben permitir subcategorías
const noSubEnums = ["documentation", "leavetype", "work_schedule"];

/* 
  Componente EnumCRUD:
  Muestra la lista de elementos y, cuando el enumerado lo permita, sus subcategorías.
  Para "documentation" se muestra si tiene fecha; para "jobs" se muestra si es pública.
*/
function EnumCRUD({
  selectedKey,
  data,
  onEditItem,
  onDeleteItem,
  onCreateItem,
  onCreateSub,
  onEditSub,
  onDeleteSub,
}) {
  if (!data || data.length === 0)
    return (
      <div>
        <p>No hay elementos disponibles en {selectedKey}.</p>
        <button onClick={() => onCreateItem(selectedKey)}>+ Crear nuevo</button>
      </div>
    );

  // Obtener el nombre en castellano
  const index = optionsList.indexOf(selectedKey);
  const labelCastellano = index !== -1 ? optionListCastellano[index] : selectedKey;

  return (
    <div className={styles.enumCrud}>
      <h2>
        Lista de {labelCastellano}
        <FaPlusSquare onClick={() => onCreateItem(selectedKey)} style={{ cursor: "pointer" }} />
      </h2>
      <ul>
        {data.map((item) => (
          <li key={item._id} className={styles.enumItem}>
            <h3>
              {selectedKey === "jobs" && item.public && <FaEye />}
              {selectedKey === "jobs" && !item.public && <FaEyeSlash />}
              <p>{item.name}</p>
              <FaRegEdit onClick={() => onEditItem(selectedKey, item)} style={{ cursor: "pointer" }} />{" "}
              <FaTrashAlt onClick={() => onDeleteItem(selectedKey, item)} style={{ cursor: "pointer" }} />
            </h3>
            {selectedKey === "documentation" && item.date && (
              <span className={styles.dateInfo}>
                Duración: {item.duration} días
              </span>
            )}
            {/* Sólo se muestran subcategorías si el enum lo permite */}
            {!noSubEnums.includes(selectedKey) &&
              item.subcategories &&
              item.subcategories.length > 0 && (
                <div className={styles.subcategories}>
                  <ul>
                    {item.subcategories.map((sub) => (
                      <li key={sub._id}>
                        {selectedKey === "jobs" && sub.public && <FaEye />}
                        {selectedKey === "jobs" && !sub.public && <FaEyeSlash />}
                        <p>{sub.name}</p>
                        <FaRegEdit
                          onClick={() => onEditSub(selectedKey, item, sub)}
                          style={{ cursor: "pointer" }}
                        />
                        <FaTrashAlt
                          onClick={() => onDeleteSub(selectedKey, item, sub)}
                          style={{ cursor: "pointer" }}
                        />
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => onCreateSub(selectedKey, item)}>
                    + Subcategoría
                  </button>
                </div>
              )}
          </li>
        ))}
      </ul>
    </div>
  );
}

/*
  Componente ManagingEnum:
  - Recibe por props: enumsData (datos iniciales), charge y modal (componente Modal).
  - Inicializa su estado local a partir de enumsData.
  - Permite editar, borrar y crear elementos y subelementos.
  - Para "documentation" se añade en el formulario los campos "label", "date" y el nuevo campo "model".
  - Para "jobs" se añade el campo "public".
  - En los enumerados que no permiten subcategorías (documentation, leavetype, work_schedule) no se renderizan opciones para subcategorías.
*/
export default function ManagingEnum({ enumsData = {}, charge, modal, chargeEnums }) {
  const [selectedKey, setSelectedKey] = useState(""); // Categoría seleccionada
  const [crudData, setCrudData] = useState({});

  // Inicializamos crudData con los datos recibidos por props
  useEffect(() => {
    setCrudData(enumsData);
  }, [enumsData]);

  // Estados de los modales internos
  const [messageModal, setMessageModal] = useState({ open: false, title: "", message: "" });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    title: "",
    message: "",
    onConfirm: null,
    onCancel: null,
  });
  const [formModal, setFormModal] = useState({
    open: false,
    title: "",
    message: "",
    fields: [],
    onSubmit: null,
    onClose: null,
  });

  // Función auxiliar para armar los campos del formulario según el tipo.
  // Para "documentation" se añaden los campos "label", "date" y "model"; para "jobs" se añade "public".
  const getFields = (enumKey, baseFields, item = null) => {
    const fields = [...baseFields];
    if (enumKey === "documentation") {
      const defaultLabel = item ? (item.label || "") : "";
      fields.push({
        name: "label",
        label: "Etiqueta",
        defaultValue: defaultLabel,
        required: true,
        type: "text",
      });
      const defaultDate = item ? (item.date ? "si" : "no") : "no";
      fields.push({
        name: "date",
        label: "Fecha",
        defaultValue: defaultDate,
        required: true,
        type: "select",
        options: [
          { value: "si", label: "Si" },
          { value: "no", label: "No" },
        ],
      });
      fields.push({
        name: "model",
        label: "Sección",
        defaultValue: item ? (item.model || "") : "",
        required: true,
        type: "select",
        options: [
          { value: "", label: "Seleccione una opción" },
          { value: "Program", label: "Programas y Dispositivos" },
          { value: "User", label: "Trabajadores" },
        ],
      });
      fields.push({
        name: "duration",
        label: "Duración (Solo si tiene fecha)",
        defaultValue: item ? (item.duration || 0) : 0,
        type: "number",
      });
    }
    if (enumKey === "jobs") {
      const defaultPublic = item ? (item.public ? "si" : "no") : "no";
      fields.push({
        name: "public",
        label: "Pública",
        defaultValue: defaultPublic,
        required: true,
        type: "select",
        options: [
          { value: "si", label: "Si" },
          { value: "no", label: "No" },
        ],
      });
    }
    return fields;
  };

  // Manejo del select de categoría
  const handleChange = (e) => {
    setSelectedKey(e.target.value);
  };

  const selectedEnumData = selectedKey ? crudData[selectedKey] || [] : [];

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
          payload.label = formData.label;
          payload.model = formData.model;
          if((!!item.date || !!formData.date) && !!formData.duration)  payload.duration = formData.duration;
        }
        if (enumKey === "jobs") payload.public = formData.public;
        await changeData(getToken(), payload);
        setCrudData((prev) => ({
          ...prev,
          [enumKey]: prev[enumKey].map((it) =>
            it._id === item._id
              ? {
                  ...it,
                  name: formData.name,
                  ...(enumKey === "documentation" && {
                    date: formData.date === "si",
                    label: formData.label,
                    model: formData.model,
                    duration: formData.duration || 0
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
        await deleteData(getToken(), { id: item._id, type: enumKey });
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
          payload.label = formData.label;
          payload.model = formData.model;
          if(!!payload.date) payload.duration=formData.duration;
        }
        if (enumKey === "jobs") payload.public = formData.public;
        const newItem = await createData(getToken(), payload);
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
    if (noSubEnums.includes(enumKey)) return;
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
        const newSub = await createSubData(getToken(), payload);
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
        await changeData(getToken(), payload);
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
        await deleteSubData(getToken(), { id: item._id, type: enumKey, idCategory: sub._id });
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
  const ModalComponent = modal;

  return (
    <div className={styles.contenedor}>
      <h2>GESTIÓN DE ENUMERADOS</h2>
      <div className={styles.contenido}>
        <label htmlFor="enumSelect">Selecciona una categoría:</label>
        <select id="enumSelect" value={selectedKey} onChange={handleChange}>
          <option value="">Selecciona una opción</option>
          {optionsList.map((key, i) => (
            <option key={key} value={key}>
              {optionListCastellano[i]}
            </option>
          ))}
        </select>

        {selectedKey && (
          <EnumCRUD
            selectedKey={selectedKey}
            data={crudData[selectedKey] || []}
            onEditItem={handleEditItem}
            onDeleteItem={handleDeleteItem}
            onCreateItem={handleCreateItem}
            onCreateSub={handleCreateSub}
            onEditSub={handleEditSub}
            onDeleteSub={handleDeleteSub}
          />
        )}
      </div>

      {/* Modal de Mensajes */}
      {messageModal.open && (
        <ModalComponent
          data={messageModal}
          closeModal={() =>
            setMessageModal({ open: false, title: "", message: "" })
          }
        />
      )}

      {/* Modal de Confirmación */}
      {confirmModal.open && (
        <ModalConfirmation
          title={confirmModal.title}
          message={confirmModal.message}
          onConfirm={confirmModal.onConfirm}
          onCancel={confirmModal.onCancel}
        />
      )}

      {/* Modal de Formulario */}
      {formModal.open && (
        <ModalForm
          title={formModal.title}
          message={formModal.message}
          fields={formModal.fields}
          onSubmit={formModal.onSubmit}
          onClose={formModal.onClose}
        />
      )}
      <button onClick={() => chargeEnums()}>Actualizar enumerados globales</button>
    </div>
  );
}
