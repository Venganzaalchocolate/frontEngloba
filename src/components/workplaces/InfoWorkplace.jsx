import { useMemo, useState } from "react";
import styles from "../styles/workplaces.module.css";
import { FaRegEdit } from "react-icons/fa";

import ModalForm from "../globals/ModalForm.jsx";
import { getToken } from "../../lib/serviceToken.js";
import { updateWorkplace } from "../../lib/data";

export default function InfoWorkplace({
  doc,
  modal,
  charge,
  enumsData,
  onDocUpdated,
  canEdit = true,
}) {
  const [openEdit, setOpenEdit] = useState(false);

  const provinceOptions = useMemo(() => {
    return Object.entries(enumsData?.provincesIndex || {})
      .map(([id, p]) => ({ value: id, label: p.name }))
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, []);

  const provinceId = typeof doc?.province === "object" ? doc.province._id : doc?.province || "";
  const provinceLabel = typeof doc?.province === "object"
    ? doc.province.name
    : enumsData?.provincesIndex?.[doc?.province]?.name || "—";

  const fields = useMemo(() => [
    { name: "section1", type: "section", label: "Datos del centro" },
    {
      name: "province",
      label: "Provincia",
      type: "select",
      required: true,
      defaultValue: provinceId,
      options: [{ value: "", label: "Seleccione provincia" }, ...provinceOptions],
    },
    {
      name: "address",
      label: "Dirección",
      type: "text",
      required: true,
      defaultValue: doc?.address || "",
    },
    {
      name: "phone",
      label: "Teléfono de la oficina",
      type: "text",
      defaultValue: doc?.phone || "",
    },
    {
      name: "active",
      label: "Estado",
      type: "select",
      required: true,
      defaultValue: doc?.active === false ? "false" : "true",
      options: [
        { value: "true", label: "Activo" },
        { value: "false", label: "Inactivo" },
      ],
    },
    { name: "section2", type: "section", label: "Dirección resuelta" },
    {
      name: "city",
      label: "Municipio",
      type: "text",
      defaultValue: doc?.resolvedAddress?.city || "",
    },
    {
      name: "postcode",
      label: "Código postal",
      type: "text",
      defaultValue: doc?.resolvedAddress?.postcode || "",
    },
    { name: "section3", type: "section", label: "Coordenadas" },
    {
      name: "lat",
      label: "Latitud",
      type: "text",
      defaultValue: doc?.coordinates?.lat ?? "",
    },
    {
      name: "lng",
      label: "Longitud",
      type: "text",
      defaultValue: doc?.coordinates?.lng ?? "",
    },
{
  name: "entity",
  label: "Entidad Responsable",
  type: "select",
  defaultValue: doc?.entity || "Engloba",
  options: [
    { value: "Engloba", label: "Engloba" },
    { value: "Quiron", label: "Quirón" },
  ],
}
  ], [doc, provinceId, provinceOptions]);

  /**
   * Actualiza el centro enviando solo los campos modificados.
   */
  const handleSubmit = async (values) => {
    const payload = { workplaceId: doc._id };

    const newActive = values.active === true || values.active === "true";
    const oldActive = doc.active !== false;

    const oldCity = doc.resolvedAddress?.city || "";
    const oldPostcode = doc.resolvedAddress?.postcode || "";
    const oldLat = doc.coordinates?.lat ?? "";
    const oldLng = doc.coordinates?.lng ?? "";
    const oldEntity=doc.entity 

    if (values.province !== provinceId) payload.province = values.province;
    if ((values.address || "") !== (doc.address || "")) payload.address = values.address;
    if ((values.phone || "") !== (doc.phone || "")) payload.phone = values.phone || "";
    if (newActive !== oldActive) payload.active = newActive;

    if ((values.city || "") !== oldCity || (values.postcode || "") !== oldPostcode) {
      payload.resolvedAddress = {
        ...(doc.resolvedAddress || {}),
        city: values.city || "",
        postcode: values.postcode || "",
        source: doc.resolvedAddress?.source || "manual",
        resolvedAt: new Date(),
      };
    }

    if ((values.entity || "Engloba") !== (oldEntity || "Engloba")) {
  payload.entity = values.entity || "Engloba";
}

    if (String(values.lat ?? "") !== String(oldLat) || String(values.lng ?? "") !== String(oldLng)) {
      payload.coordinates = values.lat || values.lng
        ? { lat: values.lat, lng: values.lng }
        : null;
    }

    if (Object.keys(payload).length === 1) {
      modal("Sin cambios", "No has modificado ningún campo del centro.");
      return;
    }

    charge(true);

    const updated = await updateWorkplace(payload, getToken());

    if (!updated || updated.error) {
      modal("Error", updated?.message || "No se pudo actualizar el centro.");
      charge(false);
      return;
    }

    setOpenEdit(false);
    onDocUpdated(updated);
    modal("Centros de trabajo", "Centro actualizado correctamente.");
    charge(false);
  };

  return (
    <div className={styles.workplacePanel}>
      <h2>
        INFORMACIÓN DEL CENTRO
          {canEdit && (
    <FaRegEdit
      title="Editar centro"
      onClick={() => setOpenEdit(true)}
    />
  )}
      </h2>

      <div className={styles.workplaceGrid}>
        <div className={styles.workplaceField}>
          <label>Nombre generado</label>
          <input value={doc?.name || ''} readOnly/>
        </div>

        <div className={styles.workplaceField}>
          <label>Provincia</label>
          <input value={provinceLabel} disabled />
        </div>

        <div className={styles.workplaceField}>
          <label>Dirección</label>
          <input value={doc?.address || ""} disabled />
        </div>

        <div className={styles.workplaceField}>
          <label>Teléfono oficina</label>
          <input value={doc?.phone || ""} disabled />
        </div>

        <div className={styles.workplaceField}>
          <label>Municipio</label>
          <input value={doc?.resolvedAddress?.city || ""} disabled />
        </div>

        <div className={styles.workplaceField}>
          <label>Código postal</label>
          <input value={doc?.resolvedAddress?.postcode || ""} disabled />
        </div>

        <div className={styles.workplaceField}>
          <label>Coordenadas</label>
          <input
            value={
              doc?.coordinates?.lat && doc?.coordinates?.lng
                ? `${doc.coordinates.lat}, ${doc.coordinates.lng}`
                : "—"
            }
            disabled
          />
        </div>

        <div className={styles.workplaceField}>
          <label>Oficina de Sesame</label>
          <input value={(doc?.officeIdSesame)?'si':'no'} disabled />
        </div>

        <div className={styles.workplaceField}>
  <label>Entidad</label>
  <input value={doc?.entity || 'No asignado'} readOnly />
</div>

      </div>

      

      {canEdit && openEdit && (
  <ModalForm
    title="Editar centro de trabajo"
    message="El nombre se regenerará automáticamente si cambias municipio, provincia o dirección."
    fields={fields}
    onSubmit={handleSubmit}
    onClose={() => setOpenEdit(false)}
    modal={modal}
  />
)}
    </div>
  );
}