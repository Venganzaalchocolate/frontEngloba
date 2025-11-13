import React, { useState, useMemo, useEffect } from "react";
import styles from "../styles/ManagingProgramsDispositive.module.css";
import MenuProgramsDispositive from "./MenuProgramsDispositive";
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation";
import { useLogin } from "../../hooks/useLogin";
import { RiBuilding2Line } from "react-icons/ri";
import { FaEdit, FaFolderOpen, FaTrashAlt } from "react-icons/fa";
import {
  getProgramId,
  getDispositiveId,
  createProgram,
  createDispositive,
  updateProgram,
  updateDispositive,
  deleteProgram,
  deleteDispositive,
  searchusername,
} from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import ProgramTabs from "./ProgramTabs";

const ManagingProgramsDispositive = ({
  modal,
  charge,
  listResponsability,
  enumsData,
  chargeEnums,
}) => {
  const { logged } = useLogin();
  const token = getToken();

  const [select, setSelect] = useState(null);
  const [infoSelect, setInfoSelect] = useState(null);
  const [showProgramForm, setShowProgramForm] = useState(false);
  const [showDeviceForm, setShowDeviceForm] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showSelectModal, setShowSelectModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [actionType, setActionType] = useState(null); // "edit" o "delete"
  const [activeTab, setActiveTab] = useState("info"); // "info" | "docs"

  // === CARGAR INFO DEL SELECCIONADO ===
  const info = async (x) => {
    if (!x) return;
    charge(true);
    try {
      let data;
      if (x.type === "program") {
        data = await getProgramId({ programId: x._id }, token);
        data.type = "program";
      } else {
        data = await getDispositiveId({ dispositiveId: x._id }, token);
        data.type = "dispositive";
      }
      setInfoSelect(data);
    } catch (e) {
      modal("Error", e.message || "No se pudo cargar la información.");
    }
    charge(false);
  };

  const onSelect = (x) => {
    setSelect(x);
    info(x);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // === SELECCIÓN AUTOMÁTICA INICIAL ===
  useEffect(() => {
    // si ya hay algo seleccionado o aún no se ha cargado enumsData, no hacer nada
    if (select || !enumsData?.programsIndex) return;

    // si el usuario tiene responsabilidades
    if (listResponsability && listResponsability.length > 0) {
      const first = listResponsability[0];
      // si tiene dispositivo asignado, selecciona ese
      if (first.dispositiveId) {
        onSelect({ type: "dispositive", _id: first.dispositiveId });
      } else if (first.idProgram) {
        // si solo tiene programa
        onSelect({ type: "program", _id: first.idProgram });
      }
    } else {
      // si no tiene responsabilidades, seleccionar el primer programa general
      const firstProgramId = Object.keys(enumsData.programsIndex)[0];
      if (firstProgramId) {
        onSelect({ type: "program", _id: firstProgramId });
      }
    }
  }, [listResponsability, enumsData]);

  // === OPTIONS ===
  const programsOptions = useMemo(() => {
    const idx = enumsData?.programsIndex || {};
    return Object.entries(idx)
      .map(([id, p]) => ({
        value: id,
        label: `${p?.name || id}${p?.acronym ? ` (${p.acronym.toUpperCase()})` : ""}`,
        acronym: (p?.acronym || "").toUpperCase(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [enumsData]);

const provinceOptions = useMemo(() => {
  const idx = enumsData?.provincesIndex || {};
  const excludedIds = ["66a7366208bebc63c0f8992d", "66a7369b08bebc63c0f89a05"];

  return Object.entries(idx)
    .filter(([id]) => !excludedIds.includes(id)) // ❌ excluye las provincias no deseadas
    .map(([id, p]) => ({ value: id, label: p?.name || id }))
    .sort((a, b) => a.label.localeCompare(b.label, "es"));
}, [enumsData]);

  // === CAMPOS BASE ===
  const programFields = [
    { name: "name", label: "Nombre del Programa", type: "text", required: true },
    { name: "acronym", label: "Acrónimo", type: "text", required: true },
    {
      name: "area",
      label: "Área",
      type: "select",
      options: [
        { value: "no identificado", label: "No identificado" },
        { value: "igualdad", label: "Igualdad" },
        { value: "desarrollo comunitario", label: "Desarrollo comunitario" },
        { value: "lgtbiq", label: "LGTBIQ+" },
        { value: "infancia y juventud", label: "Infancia y juventud" },
        { value: "personas con discapacidad", label: "Personas con discapacidad" },
        { value: "mayores", label: "Mayores" },
      ],
      defaultValue: "no identificado",
    },
    {
      name: "active",
      label: "Activo",
      type: "select",
      options: [
        { value: true, label: "Sí" },
        { value: false, label: "No" },
      ],
      defaultValue: true,
    },
    { name: "description", label: "Descripción", type: "textarea" },
    { name: "objectives", label: "Objetivos", type: "textarea" },
    { name: "profile", label: "Perfil", type: "textarea" },
  ];

  const deviceFields = [
    {
      name: "program",
      label: "Programa vinculado",
      type: "select",
      options: [{ value: "", label: "— Ninguno —" }, ...programsOptions],
    },
    { name: "name", label: "Nombre del Dispositivo", type: "text", required: true },
    { name: "address", label: "Dirección", type: "text" },
    { name: "email", label: "Correo electrónico", type: "text" },
    { name: "phone", label: "Teléfono", type: "text" },
    {
      name: "province",
      label: "Provincia",
      type: "select",
      options: [{ value: "", label: "Seleccione provincia" }, ...provinceOptions],
    },
    {
      name: "active",
      label: "Activo",
      type: "select",
      options: [
        { value: true, label: "Sí" },
        { value: false, label: "No" },
      ],
      defaultValue: true,
    },
  ];

  const selectFields = [
    {
      name: "item",
      label: "Seleccione un Programa o Dispositivo",
      type: "select",
      required: true,
      searchable: true,
      options: [
        ...Object.entries(enumsData?.programsIndex || {}).map(([id, p]) => ({
          value: JSON.stringify({ type: "program", _id: id }),
          label: `📘 Programa · ${p?.name || id}${p?.acronym ? ` (${p.acronym.toUpperCase()})` : ""
            }`,
        })),
        ...Object.entries(enumsData?.dispositiveIndex || {}).map(([id, d]) => ({
          value: JSON.stringify({ type: "dispositive", _id: id }),
          label: `🏢 Dispositivo · ${d?.name || id}`,
        })),
      ],
    },
  ];

  // === CRONOLOGÍA ===
 // === CRONOLOGÍA (optimista y sin try/catch) ===
const handleCronology = async (info, formData, type) => {
  if (!info?._id) return;

  const prevInfo = structuredClone(infoSelect);
  let newCronology = [...(infoSelect?.cronology || [])];

  // 🔹 Actualización local optimista
  if (type === "add") {
    const tempId = `temp-${Date.now()}`;
    newCronology.push({
      _id: tempId,
      open: formData.open || null,
      closed: formData.closed || null,
    });
  } else if (type === "edit") {
    newCronology = newCronology.map((c) =>
      c._id === formData._id
        ? { ...c, open: formData.open || null, closed: formData.closed || null }
        : c
    );
  } else if (type === "delete") {
    newCronology = newCronology.filter((c) => c._id !== formData._id);
  }

  setInfoSelect((prev) => ({
    ...prev,
    cronology: newCronology,
  }));

  // 🔹 Enviar actualización al backend
  const payload = {
    type,
    cronology: {
      _id: formData._id || undefined,
      open: formData.open || null,
      closed: formData.closed || null,
    },
  };

  const res =
    info.type === "program"
      ? await updateProgram({ id: info._id, ...payload }, token)
      : await updateDispositive({ dispositiveId: info._id, ...payload }, token);

  // 🔹 Si el backend devuelve error → revertimos
  if (res?.error) {
    modal("Error", res.error || "No se pudo actualizar la cronología.");
    setInfoSelect(prevInfo);
    return;
  }

  // 🔹 Si ok → sincronizamos con backend actualizado
  const fresh =
    info.type === "program"
      ? await getProgramId({ programId: info._id }, token)
      : await getDispositiveId({ dispositiveId: info._id }, token);

  if (fresh?.error) {
    // opcional: si también puede fallar esta petición, revertimos
    modal("Aviso", "Guardado pero no se pudo refrescar la información.");
    return;
  }

  setInfoSelect({ ...fresh, type: info.type });
  modal(
    "Actualizado",
    type === "delete"
      ? "Registro eliminado correctamente."
      : `Cronología ${type === "edit" ? "actualizada" : "añadida"} correctamente.`
  );
};


  // === CREAR ===
  const handleCreateProgram = async (formData) => {
    const payload = {
      name: formData.name,
      acronym: formData.acronym?.toUpperCase(),
      area: formData.area || "no identificado",
      active: formData.active === true || formData.active === "true",
      responsible: [],
      finantial: [],
      about: {
        description: formData.description || "",
        objectives: formData.objectives || "",
        profile: formData.profile || "",
      },
      userCreate: logged?.user?.email || logged?.user?.firstName || "usuario",
    };
    try {
      charge(true);
      await createProgram(payload, token);
      await chargeEnums();
      modal("Programa creado", `${payload.name} creado correctamente`);
      setShowProgramForm(false);
    } catch (e) {
      modal("Error", e.message || "No se pudo crear el programa.");
    } finally {
      charge(false);
    }
  };

  const handleCreateDevice = async (formData) => {
    const selected = programsOptions.find((p) => p.value === formData.program);
    const acronym = selected?.acronym || "";
    const finalName = (() => {
  if (!acronym) return formData.name;
  const regex = new RegExp(`^${acronym}\\b`, "i"); // busca si empieza con el acrónimo
  return regex.test(formData.name.trim())
    ? formData.name.trim()
    : `${acronym} ${formData.name.trim()}`;
})();

    const payload = {
      name: finalName.trim(),
      active: formData.active === true || formData.active === "true",
      address: formData.address || "",
      email: formData.email || "",
      phone: formData.phone || "",
      province: formData.province || null,
      program: formData.program || null,
      userCreate: logged?.user?.email || logged?.user?.firstName || "usuario",
    };
    try {
      charge(true);
      await createDispositive(payload, token);
      await chargeEnums();
      modal("Dispositivo creado", `${payload.name} creado correctamente`);
      setShowDeviceForm(false);
    } catch (e) {
      modal("Error", e.message || "No se pudo crear el dispositivo.");
    } finally {
      charge(false);
    }
  };

  // === EDITAR ===
  const handleEdit = async (formData) => {
    try {
      charge(true);
      if (editTarget?.type === "program") {
        const payload = {
          id: editTarget._id,
          name: formData.name,
          acronym: formData.acronym?.toUpperCase(),
          area: formData.area,
          active: formData.active === true || formData.active === "true",
          about: {
            description: formData.description || "",
            objectives: formData.objectives || "",
            profile: formData.profile || "",
          },
        };
        await updateProgram(payload, token);
      } else {
        const payload = {
          dispositiveId: editTarget._id,
          name: formData.name,
          active: formData.active === true || formData.active === "true",
          address: formData.address || "",
          email: formData.email || "",
          phone: formData.phone || "",
          province: formData.province || null,
          program: formData.program || null,
        };
        await updateDispositive(payload, token);
      }
      await chargeEnums();
      modal("Actualización correcta", "Se ha actualizado el elemento.");
      setShowEditForm(false);
      info(editTarget);
    } catch (e) {
      modal("Error", e.message || "No se pudo actualizar.");
    } finally {
      charge(false);
    }
  };

  // === ELIMINAR ===
  const handleDelete = async () => {
    try {
      charge(true);
      if (deleteTarget?.type === "program")
        await deleteProgram({ id: deleteTarget._id }, token);
      else
        await deleteDispositive({ dispositiveId: deleteTarget._id }, token);

      await chargeEnums();
      modal("Eliminado", "El registro se ha eliminado correctamente.");
      setShowDeleteConfirm(false);
      setInfoSelect(null);
    } catch (e) {
      modal("Error", e.message || "No se pudo eliminar.");
    } finally {
      charge(false);
    }
  };

  // === SELECCIONAR ELEMENTO PARA EDITAR/ELIMINAR ===
  const handleSelectForAction = async (formData) => {
    let parsed;
    try {
      parsed = JSON.parse(formData.item);
    } catch {
      modal("Error", "Selección no válida.");
      return;
    }

    if (!parsed?._id || !parsed?.type) {
      modal("Aviso", "Debe seleccionar un elemento válido.");
      return;
    }

    try {
      charge(true);
      let data;
      if (parsed.type === "program") {
        data = await getProgramId({ programId: parsed._id }, token);
        data.type = "program";
      } else {
        data = await getDispositiveId({ dispositiveId: parsed._id }, token);
        data.type = "dispositive";
      }

      if (actionType === "edit") {
        const fieldsWithValues =
          data.type === "program"
            ? programFields.map((f) => ({
              ...f,
              defaultValue:
                f.name === "area"
                  ? data.area
                  : f.name === "active"
                    ? Boolean(data.active)
                    : f.name === "description"
                      ? data.about?.description || ""
                      : f.name === "objectives"
                        ? data.about?.objectives || ""
                        : f.name === "profile"
                          ? data.about?.profile || ""
                          : data[f.name] ?? f.defaultValue ?? "",
            }))
            : deviceFields.map((f) => ({
              ...f,
              defaultValue:
                f.name === "program"
                  ? data.program?._id || data.program || ""
                  : f.name === "province"
                    ? data.province?._id || data.province || ""
                    : f.name === "active"
                      ? Boolean(data.active)
                      : data[f.name] ?? f.defaultValue ?? "",
            }));

        setEditTarget({ ...data, fieldsWithValues });
        setShowEditForm(true);
      } else if (actionType === "delete") {
        setDeleteTarget(data);
        setShowDeleteConfirm(true);
      }
    } catch (e) {
      modal("Error", e.message || "No se pudo cargar el elemento.");
    } finally {
      charge(false);
      setShowSelectModal(false);
    }
  };

  // === ABRIR FORMULARIOS ===
  const openEdit = () => {
    const openFormWithData = (data) => {
      if (!data) return;
      const fieldsWithValues =
        data.type === "program"
          ? programFields.map((f) => ({
            ...f,
            defaultValue:
              f.name === "area"
                ? data.area
                : f.name === "active"
                  ? Boolean(data.active)
                  : f.name === "description"
                    ? data.about?.description || ""
                    : f.name === "objectives"
                      ? data.about?.objectives || ""
                      : f.name === "profile"
                        ? data.about?.profile || ""
                        : data[f.name] ?? f.defaultValue ?? "",
          }))
          : deviceFields.map((f) => ({
            ...f,
            defaultValue:
              f.name === "program"
                ? data.program?._id || data.program || ""
                : f.name === "province"
                  ? data.province?._id || data.province || ""
                  : f.name === "active"
                    ? Boolean(data.active)
                    : data[f.name] ?? f.defaultValue ?? "",
          }));

      setEditTarget({ ...data, fieldsWithValues });
      setShowEditForm(true);
    };

    if (infoSelect) openFormWithData(infoSelect);
    else {
      setActionType("edit");
      setShowSelectModal(true);
    }
  };

  const openDelete = () => {
    if (infoSelect) {
      setDeleteTarget(infoSelect);
      setShowDeleteConfirm(true);
    } else {
      setActionType("delete");
      setShowSelectModal(true);
    }
  };



  const searchUsers = async (query) => {
    const token = getToken();
    if (!query || query.trim().length < 3) return [];

    const res = await searchusername({ query }, token);
    const users = res?.users || [];

    return users.map((u) => ({
      value: u._id,
      label: `${u.firstName || ""} ${u.lastName || ""} (${u.email || "sin email"})`,
    }));
  };


  // === RENDER ===
  return (
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <div className={styles.titulo}>
          <h2>GESTIÓN DE PROGRAMAS Y DISPOSITIVOS</h2>
          <div className={styles.botones}>
            <button className={styles.btnAdd} onClick={() => setShowProgramForm(true)}>
              + Añadir Programa <FaFolderOpen />
            </button>
            <button className={styles.btnAdd} onClick={() => setShowDeviceForm(true)}>
              + Añadir Dispositivo <RiBuilding2Line />
            </button>
            <button className={styles.btnEdit} onClick={openEdit}>Editar <FaEdit /></button>
            {logged?.user?.role === "root" && (
              <button className={styles.btnDelete} onClick={openDelete}>Eliminar <FaTrashAlt /></button>
            )}
          </div>
        </div>

        <div className={styles.contenidoData}>
          <MenuProgramsDispositive
            modal={modal}
            charge={charge}
            listResponsability={listResponsability}
            enumsData={enumsData}
            active={select}
            onSelect={onSelect}
          />
          <ProgramTabs
            modal={modal}
            charge={charge}
            listResponsability={listResponsability}
            enumsData={enumsData}
            info={infoSelect}
            onSelect={onSelect}
            searchUsers={searchUsers}
            onManageCronology={handleCronology}
          />

        </div>
      </div>

      {/* === MODALES === */}
      {showProgramForm && (
        <ModalForm
          title="Crear nuevo Programa"
          message="Complete los datos del nuevo programa."
          fields={programFields}
          onSubmit={handleCreateProgram}
          onClose={() => setShowProgramForm(false)}
        />
      )}

      {showDeviceForm && (
        <ModalForm
          title="Crear nuevo Dispositivo"
          message="Seleccione primero el programa. El nombre se completará con su acrónimo automáticamente."
          fields={deviceFields}
          onSubmit={handleCreateDevice}
          onClose={() => setShowDeviceForm(false)}
        />
      )}

      {showEditForm && editTarget && (
        <ModalForm
          title={`Editar ${editTarget.type === "program" ? "Programa" : "Dispositivo"}`}
          fields={editTarget.fieldsWithValues}
          onSubmit={handleEdit}
          onClose={() => setShowEditForm(false)}
        />
      )}

      {showDeleteConfirm && (
        <ModalConfirmation
          title="Confirmar eliminación"
          message={`¿Seguro que deseas eliminar este ${deleteTarget?.type === "program" ? "programa" : "dispositivo"
            }?`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showSelectModal && (
        <ModalForm
          title={`Seleccionar elemento para ${actionType === "edit" ? "editar" : "eliminar"
            }`}
          message="Busca y selecciona el programa o dispositivo que deseas gestionar."
          fields={selectFields}
          onSubmit={handleSelectForAction}
          onClose={() => setShowSelectModal(false)}
        />
      )}
    </div>
  );
};

export default ManagingProgramsDispositive;
