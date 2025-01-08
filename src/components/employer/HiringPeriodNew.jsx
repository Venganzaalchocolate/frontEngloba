import React, { useState, useEffect } from 'react';
import ModalForm from '../globals/ModalForm';
import { getDataEmployer } from '../../lib/data'; // o la función que uses para cargar enums

// Ejemplo: Generar fields dinámicamente
function buildHiringFields(enums) {
  // Construimos las opciones de "device" a partir de enumsData.programs
  // 1. Tomamos todos los devices de cada program
  // 2. Creamos un array de { value: device._id, label: device.name }
  let deviceOptions = [];
  if (enums?.programs) {
    deviceOptions = enums.programs.flatMap(program =>
      program.devices.map(device => ({
        value: device._id,
        label: device.name
      }))
    );
  }

  // Construimos las opciones de "position" a partir de enumsData.jobs
  // Tienes “jobs” con subcategories. Cada subcategory es un { name, _id }.
  let positionOptions = [];
  if (enums?.jobs) {
    positionOptions = enums.jobs.flatMap(job => {
      if (job.subcategories) {
        return job.subcategories.map(sub => ({
          value: sub._id,
          label: sub.name
        }));
      } else {
        // job sin subcategorías
        return [{ value: job._id, label: job.name }];
      }
    });
  }
  // Ejemplo de fields
  return [
    {
      name: "startDate",
      label: "Fecha de Inicio",
      type: "date",
      required: true,

    },
    {
      name: 'endDate',
      label: 'Fecha de Fin',
      type: 'date',
    },
    {
      name: "device",
      label: "Dispositivo",
      type: "select",
      required: true,
      options: [
        { value: "", label: "Seleccione una opción" },
        ...deviceOptions], // a partir de enumsData.programs
    },
    {
      name: "workShift",
      label: "Jornada",
      type: "select",
      required: true,
      options: [
        { value: "", label: "Seleccione una opción" },
        { value: "completa", label: "Completa" },
        { value: "parcial", label: "Parcial" },
      ],
    },
    {
      name: "category",
      label: "Categoría",
      type: "select",
      required: true,
      options: [
        { value: "", label: "Seleccione una opción" },
        { value: "1", label: "Categoría 1" },
        { value: "2", label: "Categoría 2" },
        { value: "3", label: "Categoría 3" },
        // ajusta con tus 15 categorías si deseas
      ],
    },
    {
      name: "position",
      label: "Cargo (puesto)",
      type: "select",
      required: true,
      options: [
        { value: "", label: "Seleccione una opción" },
        ...positionOptions], // a partir de enumsData.jobs
    },
  ];
};
//

export default function HiringPeriodNew({ user, enumsData = null, save = () => { }, onClose }) {
  // Estado local para guardar los enumerados, si no los pasan por props
  const [enums, setEnums] = useState(null);
  // Generamos "fields" a partir de enums
  const [fields, setFields] = useState([]);

  // Cargar enums si no se pasaron
  useEffect(() => {
    async function chargeData() {
      const dataEnum = await getDataEmployer();
      setEnums(dataEnum);
    }
    if (enumsData) {
      setEnums(enumsData);
    } else {
      chargeData();
    }
  }, [enumsData]);

  // Cada vez que `enums` cambie, regeneramos fields
  useEffect(() => {
    if (enums) {
      const newFields = buildHiringFields(enums);
      setFields(newFields);
    }
  }, [enums]);

  /**
   * onSubmit: se llama cuando el usuario hace clic en "Aceptar" dentro del ModalForm
   */
  const handleSubmit = (formData) => {
    // Construimos el objeto "User" con el primer "hiringPeriod"

    // 1) Validaciones específicas:
    if (new Date(formData.startDate) > new Date(formData.endDate)) {
      alert("La fecha de fin debe ser posterior a la fecha de inicio.");
      return; // Cancela el envío
    }

    // 2) Construir la estructura "hiringNew" similar a la que usabas en HiringPeriodNew
    const hiringNew =
    {
      startDate: formData.startDate,
      endDate: formData.endDate || null,
      device: formData.device,   // ObjectId (Device)
      workShift: {
        type: formData.workShift,
        nota: "",
      },
      category: formData.category || "",
      position: formData.position, // ObjectId (job / subcategory)
      active: true,
    };
    // 3) Llamar a tu función "save", pasando (hiringNew, 'create')
    save(hiringNew, 'create');

    // 4) Cerrar el modal
    onClose();
  };

  // Si aún no tenemos fields listos (porque está cargando enumerados), retornamos null o un loader
  if (!fields.length) {
    return null;
  }

  return (
    <ModalForm
      title="Añadir Periodo de Contratación"
      message="Completa los siguientes campos"
      fields={fields}
      onSubmit={handleSubmit}
      onClose={onClose}
    />
  );
}
