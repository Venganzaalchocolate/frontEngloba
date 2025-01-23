import React, { useEffect, useState } from "react";
import ModalForm from "../globals/ModalForm";
import { createEmployer, tokenUser } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import { isNotFutureDateString, validateDNIorNIE, validEmail, validNumber, validText } from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { useLogin } from "../../hooks/useLogin";
// Supongamos que tienes una función para crear el usuario en el servidor


/**
 * Componente que muestra un formulario para crear un nuevo usuario
 * (datos básicos) + su primer periodo de contratación (position, device, etc.).
 *
 * Usa un objeto "enums" para generar las opciones de select (programs, jobs, etc.).

 */
export default function FormCreateEmployer({ enumsData, modal, charge, closeModal,chargeUser }) {
  const { logged } = useLogin()
  /**
   * 1) Genera el array de "fields" para el `ModalForm`,
   *    mezclando campos de "User" y un primer "hiringPeriod".
   */
  const buildFields = () => {
    // Construimos las opciones de "device" a partir de enumsData.programs
    // 1. Tomamos todos los devices de cada program
    // 2. Creamos un array de { value: device._id, label: device.name }
    let deviceOptions = [];
    if (enumsData?.programs) {
      deviceOptions = enumsData.programs.flatMap(program =>
        program.devices.map(device => ({
          value: device._id,
          label: device.name
        }))
      );
    }

    // Construimos las opciones de "position" a partir de enumsData.jobs
    // Tienes “jobs” con subcategories. Cada subcategory es un { name, _id }.
    let positionOptions = [];
    if (enumsData?.jobs) {
      positionOptions = enumsData.jobs.flatMap(job => {
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
    return [
      // =========== DATOS DEL USUARIO ===========

      {
        name: "firstName",
        label: "Nombre",
        type: "text",
        required: true,
        isValid: (texto) => {
          const valid = validText(texto);
          return (!valid) ? textErrors('name') : valid; // asume que regresa "" si es válido, o un string con el mensaje de error
        }
      },
      {
        name: "lastName",
        label: "Apellidos",
        type: "text",
        required: true,
        isValid: (texto) => {
          const valid = validText(texto);
          return (!valid) ? textErrors('name') : valid; // asume que regresa "" si es válido, o un string con el mensaje de error
        }
      },
      ...(logged.user.role === "root" // Solo incluir este campo si el rol es "root"
        ? [
          {
            name: "role",
            label: "Rol",
            type: "select",
            required: true,
            options: [
              { value: "", label: "Seleccione un rol" },
              { value: "root", label: "Root" },
              { value: "global", label: "Global" },
              { value: "auditor", label: "Auditor" },
              { value: "employer", label: "Employer" },
              { value: "responsable", label: "Responsable" },
            ],
          }
        ]
        : []),
      {
        name: "dni",
        label: "DNI",
        type: "text",
        required: true,
        isValid: (valorDNI) => {
          const valid = validateDNIorNIE(valorDNI);
          return (!valid) ? textErrors('dni') : valid; // asume que regresa "" si es válido, o un string con el mensaje de error
        }
      },
      {
        name: "email",
        label: "Email",
        type: "text",
        required: true,
        isValid: (texto) => {
          const valid = validEmail(texto);
          return (!valid) ? textErrors('email') : valid; // asume que regresa "" si es válido, o un string con el mensaje de error
        }
      },
      {
        name: "phone",
        label: "Teléfono",
        type: "text",
        required: true,
        isValid: (texto) => {
          const valid = validNumber(texto);
          return (!valid) ? textErrors('phone') : valid; // asume que regresa "" si es válido, o un string con el mensaje de error
        }
      },

      // =========== PRIMER HIRING PERIOD ===========
      {
        name: "startDate",
        label: "Fecha de Inicio",
        type: "date",
        required: true,
        
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

  /**
   * 2) Manejar el envío (submit) del formulario
   */
  const handleSubmit = async (formData) => {
    try {
      // Muestra el loader
      charge(true);

      // Construimos el objeto "User" con el primer "hiringPeriod"
      const newUser = {
        pass: formData.pass || null,
        role: formData.role || "user",
        email:formData.email,
        dni: formData.dni,
        firstName: formData.firstName,
        lastName: formData.lastName || "",
        phone: formData.phone,
        // otros campos si los deseas

        hiringPeriods: [
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
          },
        ],
      };
      const token = getToken();
      // Llamar a tu API para guardar en DB
      const result = await createEmployer(token, newUser);
      if (result.error) {
        modal("Error", result.message || "No se pudo crear el usuario");
      } else {
        modal("Usuario Creado", "El usuario se ha creado con éxito");
        chargeUser();
        closeModal();
      }
    } catch (error) {
      modal("Error", error.message || "Ocurrió un error al crear el usuario");
      closeModal();
    } finally {
      charge(false);
    }
  };

  // 3) Preparamos los fields
  const fields = buildFields();

  // 4) Retornamos ModalForm con los campos y la función handleSubmit
  return (
    <ModalForm
      title="Añadir Empleado"
      message="Complete los datos del nuevo empleado y su primer período de contratación."
      fields={fields}
      onSubmit={handleSubmit}
      onClose={closeModal}
    />
  );
}
