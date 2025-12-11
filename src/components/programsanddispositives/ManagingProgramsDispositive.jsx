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

  // Helper: desempaqueta { error, data } o devuelve el objeto tal cual
  const normalizeEntity = (res, type) => {
    const payload = res && typeof res === "object" && "data" in res ? res.data : res;
    return { ...(payload || {}), type };
  };

  // === CARGAR INFO DEL SELECCIONADO ===
  const info = async (x) => {
    if (!x) return;

    charge(true);

    let res;
    if (x.type === "program") {
      res = await getProgramId({ programId: x._id }, token);
    } else {
      res = await getDispositiveId({ dispositiveId: x._id }, token);
    }

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo cargar la información.");
      setInfoSelect(null);
      charge(false);
      return;
    }

    const dataWithType = normalizeEntity(res, x.type);
    setInfoSelect(dataWithType);
    charge(false);
  };

  const onSelect = (x) => {
    setSelect(x);
    info(x);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // === SELECCIÓN AUTOMÁTICA INICIAL ===
  useEffect(() => {
    if (select || !enumsData?.programsIndex) return;

    if (listResponsability && listResponsability.length > 0) {
      const first = listResponsability[0];

      if (first?.dispositiveId) {
        onSelect({ type: "dispositive", _id: first.dispositiveId });
      } else if (first?.idProgram) {
        onSelect({ type: "program", _id: first.idProgram });
      }
    } else {
      const firstProgramId = Object.keys(enumsData.programsIndex)[0];
      if (firstProgramId) {
        onSelect({ type: "program", _id: firstProgramId });
      }
    }
  }, [listResponsability, enumsData, select]);

  // === OPTIONS ===
  const programsOptions = useMemo(() => {
    const idx = enumsData?.programsIndex || {};
    return Object.entries(idx)
      .map(([id, p]) => ({
        value: id,
        label: `${p?.name || id}${
          p?.acronym ? ` (${p.acronym.toUpperCase()})` : ""
        }`,
        acronym: (p?.acronym || "").toUpperCase(),
      }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [enumsData]);

  const provinceOptions = useMemo(() => {
    const idx = enumsData?.provincesIndex || {};
    const excludedIds = ["66a7366208bebc63c0f8992d", "66a7369b08bebc63c0f89a05"];

    return Object.entries(idx)
      .filter(([id]) => !excludedIds.includes(id))
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
          label: `📘 Programa · ${p?.name || id}${
            p?.acronym ? ` (${p.acronym.toUpperCase()})` : ""
          }`,
        })),
        ...Object.entries(enumsData?.dispositiveIndex || {}).map(([id, d]) => ({
          value: JSON.stringify({ type: "dispositive", _id: id }),
          label: `🏢 Dispositivo · ${d?.name || id}`,
        })),
      ],
    },
  ];

  // === CRONOLOGÍA (optimista) ===
  const handleCronology = async (infoItem, formData, type) => {
    if (!infoItem?._id) return;

    const prevInfo = structuredClone(infoSelect);
    let newCronology = [...(infoSelect?.cronology || [])];

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

    const payload = {
      type,
      cronology: {
        _id: formData._id || undefined,
        open: formData.open || null,
        closed: formData.closed || null,
      },
    };

    const res =
      infoItem.type === "program"
        ? await updateProgram({ id: infoItem._id, ...payload }, token)
        : await updateDispositive({ dispositiveId: infoItem._id, ...payload }, token);

    if (res?.error) {
      modal("Error", res.message || "No se pudo actualizar la cronología.");
      setInfoSelect(prevInfo);
      return;
    }

    const freshRes =
      infoItem.type === "program"
        ? await getProgramId({ programId: infoItem._id }, token)
        : await getDispositiveId({ dispositiveId: infoItem._id }, token);

    if (!freshRes || freshRes.error) {
      modal("Aviso", "Guardado pero no se pudo refrescar la información.");
      return;
    }

    const fresh = normalizeEntity(freshRes, infoItem.type);
    setInfoSelect(fresh);

    modal(
      "Actualizado",
      type === "delete"
        ? "Registro eliminado correctamente."
        : `Cronología ${
            type === "edit" ? "actualizada" : "añadida"
          } correctamente.`
    );
  };

  // === CREAR PROGRAMA ===
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

    charge(true);
    const res = await createProgram(payload, token);

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo crear el programa.");
      charge(false);
      return;
    }

    await chargeEnums();
    modal("Programa creado", `${payload.name} creado correctamente`);
    setShowProgramForm(false);
    charge(false);
  };

  // === CREAR DISPOSITIVO ===
  const handleCreateDevice = async (formData) => {
    const selected = programsOptions.find((p) => p.value === formData.program);
    const acronym = selected?.acronym || "";
    const finalName = (() => {
      if (!acronym) return formData.name;
      const regex = new RegExp(`^${acronym}\\b`, "i");
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

    charge(true);
    const res = await createDispositive(payload, token);

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo crear el dispositivo.");
      charge(false);
      return;
    }

    await chargeEnums();
    modal("Dispositivo creado", `${payload.name} creado correctamente`);
    setShowDeviceForm(false);
    charge(false);
  };

  // === EDITAR (solo envía campos modificados) ===
  const handleEdit = async (formData) => {
    if (!editTarget?._id || !editTarget.type) return;

    charge(true);

    let res;
    if (editTarget.type === "program") {
      const original = editTarget;
      const update = {};

      const newName = formData.name?.trim() || "";
      const oldName = original.name || "";

      const newAcronym = (formData.acronym || "").toUpperCase();
      const oldAcronym = (original.acronym || "").toUpperCase();

      const newArea = formData.area || "no identificado";
      const oldArea = original.area || "no identificado";

      const newActive = formData.active === true || formData.active === "true";
      const oldActive = Boolean(original.active);

      const newDesc = formData.description || "";
      const oldDesc = original.about?.description || "";

      const newObj = formData.objectives || "";
      const oldObj = original.about?.objectives || "";

      const newProfile = formData.profile || "";
      const oldProfile = original.about?.profile || "";

      if (newName !== oldName) update.name = newName;
      if (newAcronym !== oldAcronym) update.acronym = newAcronym;
      if (newArea !== oldArea) update.area = newArea;
      if (newActive !== oldActive) update.active = newActive;

      const about = {};
      if (newDesc !== oldDesc) about.description = newDesc;
      if (newObj !== oldObj) about.objectives = newObj;
      if (newProfile !== oldProfile) about.profile = newProfile;
      if (Object.keys(about).length > 0) update.about = about;

      if (Object.keys(update).length === 0) {
        modal("Sin cambios", "No has modificado ningún campo del programa.");
        charge(false);
        return;
      }

      res = await updateProgram({ id: original._id, ...update }, token);
    } else {
      const original = editTarget;
      const update = {};

      const newName = formData.name?.trim() || "";
      const oldName = original.name || "";

      const newActive = formData.active === true || formData.active === "true";
      const oldActive = Boolean(original.active);

      const newAddress = formData.address || "";
      const oldAddress = original.address || "";

      const newEmail = formData.email || "";
      const oldEmail = original.email || "";

      const newPhone = formData.phone || "";
      const oldPhone = original.phone || "";

      const newProvince = formData.province || null;
      const oldProvince =
        typeof original.province === "string"
          ? original.province
          : original.province?._id || null;

      const newProgram = formData.program || null;
      const oldProgram =
        typeof original.program === "string"
          ? original.program
          : original.program?._id || null;

      if (newName !== oldName) update.name = newName;
      if (newActive !== oldActive) update.active = newActive;
      if (newAddress !== oldAddress) update.address = newAddress;
      if (newEmail !== oldEmail) update.email = newEmail;
      if (newPhone !== oldPhone) update.phone = newPhone;
      if (newProvince !== oldProvince) update.province = newProvince;
      if (newProgram !== oldProgram) update.program = newProgram;

      if (Object.keys(update).length === 0) {
        modal("Sin cambios", "No has modificado ningún campo del dispositivo.");
        charge(false);
        return;
      }

      res = await updateDispositive(
        { dispositiveId: original._id, ...update },
        token
      );
    }

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo actualizar.");
      charge(false);
      return;
    }

    await chargeEnums();
    await info({ type: editTarget.type, _id: editTarget._id });
    setShowEditForm(false);
    modal("Actualización correcta", "Se ha actualizado el elemento.");
    charge(false);
  };

  // === ELIMINAR ===
  const handleDelete = async () => {
    if (!deleteTarget?._id || !deleteTarget.type) return;

    charge(true);

    let res;
    if (deleteTarget.type === "program") {
      res = await deleteProgram({ id: deleteTarget._id }, token);
    } else {
      res = await deleteDispositive({ dispositiveId: deleteTarget._id }, token);
    }

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo eliminar.");
      charge(false);
      return;
    }

    await chargeEnums();
    modal("Eliminado", "El registro se ha eliminado correctamente.");
    setShowDeleteConfirm(false);
    setInfoSelect(null);
    charge(false);
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

    charge(true);

    let res;
    if (parsed.type === "program") {
      res = await getProgramId({ programId: parsed._id }, token);
    } else {
      res = await getDispositiveId({ dispositiveId: parsed._id }, token);
    }

    if (!res || res.error) {
      modal("Error", res?.message || "No se pudo cargar el elemento.");
      charge(false);
      return;
    }

    const data = normalizeEntity(res, parsed.type);

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

    charge(false);
    setShowSelectModal(false);
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

  // === ACTIVAR / DESACTIVAR PROGRAMA O DISPOSITIVO ===
  const handleToggleActive = async (item) => {
    if (!item?._id || !item?.type) return;

    const isProgram = item.type === "program";
    const nextActive = !item.active;

    let error = false;
    let message = "";

    charge(true);

    if (isProgram) {
      const originalActive = Boolean(item.active);

      const programRes = await updateProgram(
        { id: item._id, active: nextActive },
        token
      );

      if (!programRes || programRes.error) {
        error = true;
        message = programRes?.message || "No se pudo actualizar el programa.";
      } else if (!nextActive) {
        const allDevices = Object.values(enumsData?.dispositiveIndex || {}).filter(
          (d) => d.program === item._id
        );

        const previouslyActiveDevices = allDevices.filter((d) => d.active);

        if (previouslyActiveDevices.length > 0) {
          const results = await Promise.all(
            previouslyActiveDevices.map((d) =>
              updateDispositive({ dispositiveId: d._id, active: false }, token)
            )
          );

          const failing = results
            .map((r, idx) => ({ r, idx }))
            .filter((x) => x.r?.error);

          if (failing.length > 0) {
            error = true;
            message =
              failing[0].r?.message ||
              "Error al desactivar algunos dispositivos asociados.";

            await updateProgram(
              { id: item._id, active: originalActive },
              token
            );

            const succeededDevices = previouslyActiveDevices.filter(
              (_, idx) => !results[idx]?.error
            );

            if (succeededDevices.length > 0) {
              await Promise.all(
                succeededDevices.map((d) =>
                  updateDispositive({ dispositiveId: d._id, active: true }, token)
                )
              );
            }
          }
        }
      }
    } else {
      const programId =
        typeof item.program === "string" ? item.program : item.program?._id;

      const programIsActive =
        programId && enumsData?.programsIndex?.[programId]?.active;

      if (nextActive) {
        if (!programIsActive) {
          error = true;
          message =
            "No se puede activar un dispositivo si el programa asociado está desactivado.";
        } else {
          const res = await updateDispositive(
            { dispositiveId: item._id, active: nextActive },
            token
          );
          if (!res || res.error) {
            error = true;
            message = res?.message || "No se pudo actualizar el dispositivo.";
          }
        }
      } else {
        const res = await updateDispositive(
          { dispositiveId: item._id, active: nextActive },
          token
        );
        if (!res || res.error) {
          error = true;
          message = res?.message || "No se pudo actualizar el dispositivo.";
        }
      }
    }

    await chargeEnums();

    const sameCurrent =
      infoSelect && infoSelect._id === item._id && infoSelect.type === item.type;

    if (sameCurrent) {
      await info({ type: item.type, _id: item._id });
    }

    charge(false);

    const label = isProgram ? "Programa" : "Dispositivo";

    if (error) {
      modal("Error", message || "No se pudo actualizar el estado activo.");
    } else {
      modal(
        "Actualizado",
        `${label} ${nextActive ? "activado" : "desactivado"} correctamente.`
      );
    }
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
            <button className={styles.btnEdit} onClick={openEdit}>
              Editar <FaEdit />
            </button>
            {logged?.user?.role === "root" && (
              <button className={styles.btnDelete} onClick={openDelete}>
                Eliminar <FaTrashAlt />
              </button>
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
            changeActive={handleToggleActive}
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
            changeActive={handleToggleActive}
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
          message={`¿Seguro que deseas eliminar este ${
            deleteTarget?.type === "program" ? "programa" : "dispositivo"
          }?`}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteConfirm(false)}
        />
      )}

      {showSelectModal && (
        <ModalForm
          title={`Seleccionar elemento para ${
            actionType === "edit" ? "editar" : "eliminar"
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
