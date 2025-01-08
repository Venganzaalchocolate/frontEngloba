import React, { useEffect, useState } from 'react';
import { FaSave } from "react-icons/fa";
import { MdEditOff } from "react-icons/md";
import { getDataEmployer } from '../../lib/data';
import ModalForm from '../globals/ModalForm';


export default function LeavePeriodNew({
    enumsData = null,
    saveHiring = null,
    close,
    idHiring
  }) {
    /**
     * 1) Construir array de `fields` para tu ModalForm.
     *    Cada campo corresponde a lo que antes hacías con <input> o <select>.
     */
    const buildFields = () => {
      // Obtenemos opciones para `leaveType` (Tipos de Excedencia) desde `enumsData`
      const leaveTypeOptions = enumsData?.leavetype?.map((type) => ({
        value: type._id,
        label: type.name,
      })) || [];
      //
  
      return [
        {
          name: "leaveType",
          label: "Tipo de Excedencia",
          type: "select",
          required: true,
          options: [
            { value: "", label: "Seleccione una opción" },
            ...leaveTypeOptions
          ],
        },
        {
          name: "startLeaveDate",
          label: "Fecha de Inicio",
          type: "date",
          required: true,
        },
        {
          name: "expectedEndLeaveDate",
          label: "Fecha de Fin Prevista",
          type: "date",
          required: false, // si deseas que no sea obligatoria
        },
        {
          name: "actualEndLeaveDate",
          label: "Fecha de Fin Real",
          type: "date",
          required: false,
        },
      ];
    };
  
    /**
     * 2) onSubmit del ModalForm: 
     *    Valida fechas si es necesario, y llama `saveHiring(...)`.
     */
    const handleSubmit = (formData) => {
      // Validación específica: "fecha de fin prevista" >= "fecha de inicio"
      if (
        formData.startLeaveDate &&
        formData.expectedEndLeaveDate &&
        new Date(formData.startLeaveDate) > new Date(formData.expectedEndLeaveDate)
      ) {
        // NO podemos mostrar inline en este punto (ModalForm no tiene validate extra),
        // así que lanzamos un alert, o no permitimos cerrar:
        alert("La fecha de fin prevista debe ser posterior a la fecha de inicio");
        return;
      }
  
      // Construir el objeto con la misma estructura que usabas en tu LeavePeriodNew anterior
      const leaveData = {
        idHiring: idHiring,
        leaveNew: {
          leaveType: formData.leaveType,
          startLeaveDate: formData.startLeaveDate,
          expectedEndLeaveDate: formData.expectedEndLeaveDate || null,
          actualEndLeaveDate: formData.actualEndLeaveDate || null,
          active: true,
        },
      };
  
      // Llamamos a la función del padre para guardar
      if (saveHiring) {
        saveHiring(leaveData, "createLeave");
      }
  
      // Finalmente, cierra el modal
      close();
    };
  
    // 3) Generamos los `fields`:
    const fields = buildFields();
  
    return (
      <ModalForm
        title="Añadir Período de Excedencia"
        message="Completa los siguientes campos"
        fields={fields}
        onSubmit={handleSubmit}
        onClose={close}
      />
    );
  }
  
  