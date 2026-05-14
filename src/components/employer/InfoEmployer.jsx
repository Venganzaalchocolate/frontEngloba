import React, { useState, useMemo, useCallback, useEffect, useRef } from "react";
import styles from "../styles/infoEmployer.module.css";
import { FaEdit, FaTrashAlt } from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import {
  validateBankAccount,
  validateDNIorNIE,
  validEmail,
  validNumber,
  validText,
} from "../../lib/valid";
import { textErrors } from "../../lib/textErrors";
import { getToken } from "../../lib/serviceToken";
import {
  createChangeRequest,
  editUser,
  recreateCorporateEmail,
  profilePhotoSet,
  profilePhotoGet,
  postSesameAssignEmployeeToDispositiveScopes,
} from "../../lib/data";
import { deepClone, formatDate } from "../../lib/utils";
import { useLogin } from "../../hooks/useLogin";
import ModalConfirmation from "../globals/ModalConfirmation";
import ModalForm from "../globals/ModalForm";
import perfil512 from "../../assets/perfil_512.png";
import { processProfileImageSet } from "../../lib/imageProfile";

const toDateInputValue = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const InfoEmployer = ({
  user,
  modal,
  charge,
  changeUser,
  listResponsability,
  enumsData,
  chargeUser = () => {},
  soloInfo = false,
  onRequestCreated,
}) => {
  const { logged, changeLogged } = useLogin();

  const initialState = useMemo(
  () => ({
    ...user,
    fostered: user.fostered ? "si" : "no",
    apafa: user.apafa ? "si" : "no",
    consetmentDataProtection: user.consetmentDataProtection ? "si" : "no",
    tracking: user.tracking === true ? "si" : "no",
    hasDrivingLicenceCar: user.drivingLicenceIssueDate ? "si" : "no",
    drivingLicenceIssueDate: toDateInputValue(user.drivingLicenceIssueDate),
  }),
  [user]
);



  const [originalData, setOriginalData] = useState(() => deepClone(initialState));
  const [datos, setDatos] = useState(initialState);
  const [isEditing, setIsEditing] = useState(false);
  const [errores, setErrores] = useState({});
  const [confirmRecreateEmail, setConfirmRecreateEmail] = useState(false);
  const [selectedStudy, setSelectedStudy] = useState("");
  const [quickStatusTarget, setQuickStatusTarget] = useState(null);
  const [activateSesameModal, setActivateSesameModal] = useState(false);
  const [pendingStatusResponse, setPendingStatusResponse] = useState(null);
  const [previousEmploymentStatus, setPreviousEmploymentStatus] = useState(null);

const [pendingSesameDispositiveId, setPendingSesameDispositiveId] = useState(null);
const [selectSesameWorkplaceModal, setSelectSesameWorkplaceModal] = useState(false);

  const [photoUrl, setPhotoUrl] = useState("");
  const [photoError, setPhotoError] = useState("");
  const [photoVersion, setPhotoVersion] = useState(0);
  const fileInputRef = useRef(null);

  const isSupervisor = Array.isArray(listResponsability)
    ? listResponsability.length > 0
    : Number(listResponsability) > 0;

  const canDirectEdit = isSupervisor || ["global", "root", "rrhh"].includes(logged.user.role);


  const studiesOptions = useMemo(() => {
    const idx = enumsData?.studiesIndex;
    if (!idx) return [];

    return Object.entries(idx)
      .filter(([, value]) => value?.isSub || !value?.isRoot)
      .map(([id, value]) => ({ value: id, label: value?.name || id }));
  }, [enumsData?.studiesIndex]);

  const availableStudiesOptions = useMemo(() => {
    const taken = new Set(Array.isArray(datos.studies) ? datos.studies : []);
    return studiesOptions.filter((option) => !taken.has(option.value));
  }, [datos.studies, studiesOptions]);

  const textFields = [
  ["employmentStatus", "Estado Laboral"],
  ["dni", "DNI"],
  ["firstName", "Nombre"],
  ["lastName", "Apellidos"],
  ["birthday", "Fecha de Nacimiento"],
  ["email", "Email Corporativo"],
  ["email_personal", "Email Personal"],
  ["socialSecurityNumber", "Número de Seguridad Social"],
  ["bankAccountNumber", "Número de Cuenta Bancaria"],
  ["phone", "Teléfono Personal"],
  ["hasDrivingLicenceCar", "Carnet de conducir Coche"],
  ["drivingLicenceIssueDate", "Fecha de Expedición"],
  ["tracking", "Justificación"],
];

  const ALLOW_EMPTY = new Set([
    "socialSecurityNumber",
    "bankAccountNumber",
    "phoneJobNumber",
    "phoneJobExtension",
    "disability.percentage",
    "disability.notes",
    "studies",
  ]);

  const REQUIRED_TOP = [
    "firstName",
    "lastName",
    "dni",
    "birthday",
    "employmentStatus",
    "email_personal",
    "gender",
    "fostered",
    "apafa",
    "consetmentDataProtection",
    "phone",
  ];

useEffect(() => {
  const nextState = {
  ...user,
  fostered: user.fostered ? "si" : "no",
  apafa: user.apafa ? "si" : "no",
  consetmentDataProtection: user.consetmentDataProtection ? "si" : "no",
  tracking: user.tracking === true ? "si" : "no",
  hasDrivingLicenceCar: user.drivingLicenceIssueDate ? "si" : "no",
  drivingLicenceIssueDate: toDateInputValue(user.drivingLicenceIssueDate),
};

  setOriginalData(deepClone(nextState));
  setDatos(nextState);
  setErrores({});
  setIsEditing(false);
}, [user]);

  // Carga la foto de perfil normal del usuario desde backend.
  const loadPhoto = useCallback(async () => {
    try {
      if (!datos?._id) return;
      setPhotoError("");

      const token = getToken();
      const blob = await profilePhotoGet(token, { idUser: datos._id, size: "normal" });

      if (blob?.error) {
        setPhotoUrl("");
        return;
      }

      const objectUrl = URL.createObjectURL(blob);
      setPhotoUrl((prev) => {
        if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
        return objectUrl;
      });
    } catch {
      setPhotoUrl("");
    }
  }, [datos?._id]);

  useEffect(() => {
    loadPhoto();
  }, [loadPhoto, photoVersion]);

  useEffect(() => {
    return () => {
      if (photoUrl?.startsWith("blob:")) URL.revokeObjectURL(photoUrl);
    };
  }, [photoUrl]);

const sesameDispositiveOptions = useMemo(() => {
  return Object.values(enumsData?.dispositiveIndex || {})
    .filter((item) => item?.active !== false)
    .filter((item) => !!item?.departamentSesame)
    .filter((item) => {
      const workplaces = Array.isArray(item?.workplaces) ? item.workplaces : [];
      return workplaces.some((workplace) => workplace?.active !== false && !!workplace?.officeIdSesame);
    })
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"))
    .map((item) => ({
      value: String(item._id),
      label: `${item.name}${
        item.program ? ` - ${enumsData?.programsIndex?.[String(item.program)]?.name || ""}` : ""
      }`,
    }));
}, [enumsData?.dispositiveIndex, enumsData?.programsIndex]);

const getDispositiveWorkplacesWithOffice = useCallback(
  (dispositiveId) => {
    const dispositive = enumsData?.dispositiveIndex?.[String(dispositiveId)] || null;
    const workplaces = Array.isArray(dispositive?.workplaces) ? dispositive.workplaces : [];

    return workplaces
      .filter((workplace) => workplace?.active !== false)
      .filter((workplace) => !!workplace?.officeIdSesame);
  },
  [enumsData?.dispositiveIndex]
);

const sesameWorkplaceOptions = useMemo(() => {
  if (!pendingSesameDispositiveId) return [];

  return getDispositiveWorkplacesWithOffice(pendingSesameDispositiveId)
    .sort((a, b) => String(a.name || "").localeCompare(String(b.name || ""), "es"))
    .map((workplace) => ({
      value: String(workplace._id),
      label: workplace.name || "Centro de trabajo sin nombre",
    }));
}, [pendingSesameDispositiveId, getDispositiveWorkplacesWithOffice]);

  // Convierte una fecha ISO a formato YYYY-MM-DD para inputs type="date".
  function toInputDate(isoString) {
    if (!isoString) return "";
    const date = new Date(isoString);
    return date.toISOString().slice(0, 10);
  }

  // Comprueba si un valor se considera vacío para validaciones.
  function isEmpty(value) {
    return value == null || String(value).trim() === "";
  }

  // Abre el selector nativo de archivos para cambiar la foto.
  const openFilePicker = () => fileInputRef.current?.click();

  

  // Sube, procesa y actualiza la foto de perfil del usuario.
  const onPickProfileImage = async (e) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;

    setPhotoError("");
    charge(true);

    try {
      const processed = await processProfileImageSet(selectedFile, {
        normalSize: 512,
        thumbSize: 96,
        mimeType: "image/jpeg",
        normalQuality: 0.86,
        thumbQuality: 0.8,
      });

      const token = getToken();
      const updated = await profilePhotoSet(token, {
        idUser: datos._id,
        file: processed.normalFile,
        thumb: processed.thumbFile,
      });

      if (updated?.error) throw new Error(updated.message || "No se pudo subir la foto");

      changeUser(updated);
      setDatos((prev) => ({ ...prev, ...updated }));

      if (logged.user?._id === updated?._id) changeLogged(updated);

      if (processed.previewUrl) {
        setPhotoUrl((prev) => {
          if (prev?.startsWith("blob:")) URL.revokeObjectURL(prev);
          return processed.previewUrl;
        });
      }

      setPhotoVersion((value) => value + 1);
    } catch (error) {
      setPhotoError(error.message || "Error subiendo la foto");
    } finally {
      charge(false);
      e.target.value = "";
    }
  };

  // Maneja cambios en inputs y selects, incluyendo campos anidados y validaciones en vivo.
  const handleChange = (e) => {
    const { name, value } = e.target;
    const auxErrores = { ...errores };
    const auxDatos = { ...datos };

    auxErrores.mensajeError = null;

    if (name.includes(".")) {
      const [parentKey, childKey] = name.split(".");
      if (!auxDatos[parentKey]) auxDatos[parentKey] = {};
      auxDatos[parentKey][childKey] = value;

      if (parentKey === "disability" && childKey === "percentage") {
        auxErrores[name] = value === "" ? null : validNumber(value) ? null : textErrors("disPercentage");
      } else {
        auxErrores[name] = null;
      }
    } else {
      if (name === "firstName") {
        auxErrores[name] = validText(value, 3, 100) ? null : textErrors(name);
      } else if (name === "email_personal") {
        auxErrores[name] = validEmail(value) ? null : textErrors(name);
      } else if (name === "phone") {
        auxErrores[name] = validNumber(value) ? null : textErrors(name);
      } else if (name === "dni") {
        auxErrores[name] = value ? (validateDNIorNIE(value) ? null : textErrors(name)) : null;
      } else if (name === "bankAccountNumber") {
        auxErrores[name] = value ? (validateBankAccount(value) ? null : textErrors(name)) : null;
      } else if (name === "phoneJobNumber") {
        auxErrores[name] = value ? (validNumber(value) ? null : textErrors("phone")) : null;
      } else if (name === "hasDrivingLicenceCar" && value === "no") {
        auxDatos.drivingLicenceIssueDate = "";
        auxErrores.drivingLicenceIssueDate = null;
      } else {
        auxErrores[name] = null;
      }

      auxDatos[name] = value;

      
    }

    setDatos(auxDatos);
    setErrores(auxErrores);
  };

  // Valida todos los campos requeridos antes de guardar.
  const validateFields = () => {
    const newErrors = {};

    for (const key in errores) {
      if (errores[key] != null) return false;
    }

    for (const field of REQUIRED_TOP) {
      if (ALLOW_EMPTY.has(field)) continue;
      if (isEmpty(datos[field])) newErrors[field] = textErrors(field) || "Campo requerido.";
    }

    if (datos.hasDrivingLicenceCar === "si" && isEmpty(datos.drivingLicenceIssueDate)) {
      newErrors.drivingLicenceIssueDate = "La fecha de expedición es obligatoria.";
    }

    setErrores(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Obtiene solo los campos modificados respecto al estado original.
  const getModifiedFields = () => {
    const changed = {};
    const fieldsToCompare = [
      "firstName",
      "lastName",
      "dni",
      "email_personal",
      "employmentStatus",
      "socialSecurityNumber",
      "bankAccountNumber",
      "gender",
      "fostered",
      "apafa",
      "consetmentDataProtection",
      "role",
      "birthday",
      "phone",
      "tracking",
      "drivingLicenceIssueDate"
    ];

    fieldsToCompare.forEach((field) => {
  if (datos[field] !== originalData[field]) changed[field] = datos[field];
});

if (datos.hasDrivingLicenceCar === "no" && originalData.drivingLicenceIssueDate) {
  changed.drivingLicenceIssueDate = null;
}

    const oldP = originalData.disability?.percentage || "";
    const oldN = originalData.disability?.notes || "";
    const newP = datos.disability?.percentage || "";
    const newN = datos.disability?.notes || "";

    if (newP !== oldP) changed.disPercentage = newP;
    if (newN !== oldN) changed.disNotes = newN;

    if (JSON.stringify(datos.studies) !== JSON.stringify(originalData.studies)) {
      changed.studies = datos.studies;
    }

    const oldJobPhone = originalData.phoneJob?.number || "";
    const newJobPhone = datos.phoneJob?.number ?? datos.phoneJobNumber ?? "";
    if (oldJobPhone !== newJobPhone) changed.phoneJobNumber = newJobPhone;

    const oldJobExt = originalData.phoneJob?.extension || "";
    const newJobExt = datos.phoneJob?.extension ?? datos.phoneJobExtension ?? "";
    if (oldJobExt !== newJobExt) changed.phoneJobExtension = newJobExt;

    return changed;
  };

  // Convierte los cambios detectados al formato de solicitudes de cambio para supervisión.
  const toChangeLines = (modified, original) => {
    const map = {
      disPercentage: "disability.percentage",
      disNotes: "disability.notes",
      phoneJobNumber: "phoneJob.number",
      phoneJobExtension: "phoneJob.extension",
    };

    const changes = [];

    for (const key of Object.keys(modified)) {
      const path = map[key] || key;

      let to = modified[key];
      if (["fostered", "apafa", "consetmentDataProtection", "tracking"].includes(path)) {
        if (to === "si") to = true;
        else if (to === "no") to = false;
      }

      const from = path.split(".").reduce((acc, item) => (acc ? acc[item] : undefined), original);
      changes.push({ path, from, to });
    }

    return changes;
  };

  // Activa o desactiva el modo edición.
  const handleEdit = () => setIsEditing(!isEditing);

  // Guarda cambios directos o crea una solicitud de cambio si el usuario no puede editar directamente.
  const handleSave = async () => {
    if (!validateFields()) return;

    const modifiedData = getModifiedFields();
    if (Object.keys(modifiedData).length === 0) {
      setIsEditing(false);
      return;
    }

    setIsEditing(false);
    charge(true);

    try {
      const token = getToken();

      if (canDirectEdit) {
        const payload = { ...modifiedData, _id: originalData._id };
        const response = await editUser(payload, token);

        if (response?.error) throw new Error(response.message || "Error al editar");

        changeUser(response);
        if (logged.user._id === user._id) changeLogged(response);

        modal("Editar Usuario", "Usuario editado con éxito");
        chargeUser();
        return;
      }

      const changes = toChangeLines(modifiedData, originalData);
      const payload = { userId: originalData._id, changes, note: "" };
      const resp = await createChangeRequest(payload, token);

      if (resp?.error) throw new Error(resp.message || "No se pudo crear la solicitud");

      const created = resp?.data && resp?.data?._id ? resp.data : resp;
      onRequestCreated?.(created);
      modal("Solicitud enviada", "Tu supervisor revisará los cambios");
      setDatos(deepClone(originalData));
    } catch (e) {
      setDatos(deepClone(originalData));
      modal("Error", e.message || "No se pudo procesar la operación");
    } finally {
      charge(false);
    }
  };

  // Cancela la edición y restaura los datos originales.
  const reset = () => {
    setErrores({});
    setIsEditing(false);
    setDatos(deepClone(originalData));
  };

  // Añade un estudio a la lista de estudios del usuario.
  const handleAddStudy = () => {
    if (!selectedStudy) return;

    setDatos((prev) => ({
      ...prev,
      studies: prev.studies ? [...prev.studies, selectedStudy] : [selectedStudy],
    }));

    setSelectedStudy("");
  };

  // Elimina un estudio de la lista de estudios del usuario.
  const handleDeleteStudy = (studyToDelete) => {
    setDatos((prev) => ({
      ...prev,
      studies: prev.studies.filter((study) => study !== studyToDelete),
    }));
  };

  // Devuelve la etiqueta legible de un estudio a partir de su id.
  const getStudyLabel = useCallback(
    (id) => {
      const byOption = studiesOptions.find((option) => option.value === id)?.label;
      if (byOption) return byOption;

      const idx = enumsData?.studiesIndex;
      if (idx && !Array.isArray(idx)) return idx?.[id]?.name || id;

      return id;
    },
    [studiesOptions, enumsData?.studiesIndex]
  );

  // Abre la confirmación para recrear el correo corporativo.
  const recreateEmail = () => {
    if (!datos?._id) return;
    setConfirmRecreateEmail(true);
  };

  // Recrea el correo corporativo del usuario en Workspace.
  const doRecreateEmail = async () => {
    const idUser = datos?._id;
    if (!idUser) return;

    setConfirmRecreateEmail(false);
    charge(true);

    try {
      const token = getToken();
      const resp = await recreateCorporateEmail({ userId: idUser }, token);

      if (resp?.error) {
        modal("Error", "No se pudo recrear el correo");
        return;
      }

      setDatos((prev) => ({ ...prev, email: resp.email }));
      changeUser(resp);

      if (logged.user?._id === idUser) changeLogged(resp);

      modal(
        "Email recreado",
        "Se ha generado un nuevo email corporativo. El anterior usuario de Workspace se ha eliminado."
      );

      chargeUser?.();
    } catch (e) {
      modal("Error", e.message || "No se pudo recrear el email corporativo");
    } finally {
      charge(false);
    }
  };

  // Cambia el estado laboral del usuario y, si pasa a activo, prepara el flujo posterior de Sesame.
const handleChangeStatus = async (formData) => {
  charge(true);

  try {
    const token = getToken();
    const prevStatus = datos.employmentStatus;

    const response = await editUser({ _id: datos._id, employmentStatus: formData.status }, token);

    if (response?.error) {
      modal("Error", response.message || "Error al cambiar el estado");
      return;
    }

    changeUser(response);
    setDatos((prev) => ({
      ...prev,
      employmentStatus: response.employmentStatus,
      userIdSesame: response.userIdSesame || prev.userIdSesame,
    }));

    if (logged.user._id === user._id) changeLogged(response);

    setQuickStatusTarget(null);

    if (formData.status === "activo") {
      setPreviousEmploymentStatus(prevStatus);
      setPendingStatusResponse(response);
      setActivateSesameModal(true);
      return;
    }

    setOriginalData((prev) => ({
      ...deepClone(prev),
      employmentStatus: response.employmentStatus,
      userIdSesame: response.userIdSesame || prev.userIdSesame,
    }));

    chargeUser();
    modal("Estado actualizado", "El estado laboral se ha actualizado correctamente");
  } catch (e) {
    modal("Error", e.message || "No se pudo cambiar el estado");
  } finally {
    charge(false);
  }
};

  // Activa o crea al usuario en Sesame y lo asigna a un centro principal.
const completeSesameActivation = async ({ dispositiveId, workplaceId = null }) => {
  const token = getToken();

  const scopeRes = await postSesameAssignEmployeeToDispositiveScopes(
    {
      userId: datos._id,
      dispositiveId,
      workplaceId,
      isMainOffice: true,
    },
    token
  );

  if (scopeRes?.error) {
    modal(
      "Error",
      scopeRes.message || "No se pudo activar el usuario en Sesame y asignarlo al departamento/oficina"
    );
    return false;
  }

  if (scopeRes?.sesameId && (!datos?.userIdSesame || String(datos.userIdSesame) !== String(scopeRes.sesameId))) {
    const updatedUser = { ...datos, userIdSesame: scopeRes.sesameId };

    changeUser(updatedUser);
    setDatos(updatedUser);

    if (logged.user._id === user._id) changeLogged(updatedUser);
  }

  setOriginalData((prev) => ({
    ...deepClone(prev),
    employmentStatus: "activo",
    userIdSesame: scopeRes?.sesameId || datos?.userIdSesame || prev.userIdSesame,
  }));

  setPreviousEmploymentStatus(null);
  setActivateSesameModal(false);
  setPendingStatusResponse(null);
  setPendingSesameDispositiveId(null);
  setSelectSesameWorkplaceModal(false);

  chargeUser();
  modal("Sesame", "Usuario activado en Sesame y asignado al departamento y oficina correctamente");

  return true;
};

const handleActivateInSesame = async (formData) => {
  try {
    const dispositiveId = formData?.dispositiveId;

    if (!dispositiveId) {
      modal("Error", "Debes seleccionar un dispositivo");
      return;
    }

    const workplaces = getDispositiveWorkplacesWithOffice(dispositiveId);

    if (!workplaces.length) {
      modal("Error", "El dispositivo seleccionado no tiene oficinas Sesame asociadas");
      return;
    }

    if (workplaces.length > 1) {
  setPendingSesameDispositiveId(dispositiveId);
  setActivateSesameModal(false);
  setSelectSesameWorkplaceModal(true);
  return;
}

    charge(true);

    await completeSesameActivation({
      dispositiveId,
      workplaceId: workplaces[0]._id,
    });
  } catch (e) {
    modal("Error", e.message || "No se pudo activar en Sesame");
  } finally {
    charge(false);
  }
};

const handleSelectSesameWorkplace = async (formData) => {
  try {
    if (!pendingSesameDispositiveId || !formData?.workplaceId) {
      modal("Error", "Debes seleccionar un centro de trabajo");
      return;
    }

    charge(true);

    await completeSesameActivation({
      dispositiveId: pendingSesameDispositiveId,
      workplaceId: formData.workplaceId,
    });
  } catch (e) {
    modal("Error", e.message || "No se pudo activar en Sesame");
  } finally {
    charge(false);
  }
};

  // Cancela el modal de activación en Sesame y revierte el estado laboral al anterior.
const handleCancelActivateSesame = async () => {
  try {
    charge(true);
    const token = getToken();

    const previousStatus = previousEmploymentStatus;
if (!previousStatus) {
  setActivateSesameModal(false);
  setPendingStatusResponse(null);
  setPendingSesameDispositiveId(null);
  setSelectSesameWorkplaceModal(false);
  return;
}

    const response = await editUser({ _id: datos._id, employmentStatus: previousStatus }, token);

    if (response?.error) {
      modal("Error", response.message || "No se pudo revertir el estado");
      return;
    }

    changeUser(response);
    setDatos((prev) => ({
      ...prev,
      employmentStatus: response.employmentStatus,
      userIdSesame: response.userIdSesame || prev.userIdSesame,
    }));

    setOriginalData((prev) => ({
      ...deepClone(prev),
      employmentStatus: response.employmentStatus,
      userIdSesame: response.userIdSesame || prev.userIdSesame,
    }));

    if (logged.user._id === user._id) changeLogged(response);

setPreviousEmploymentStatus(null);
setActivateSesameModal(false);
setPendingStatusResponse(null);
setPendingSesameDispositiveId(null);
setSelectSesameWorkplaceModal(false);
chargeUser();
modal("Cambio cancelado", "Se ha restaurado el estado laboral anterior.");
  } catch (e) {
    modal("Error", e.message || "No se pudo revertir el estado");
  } finally {
    charge(false);
  }
};



  // Renderiza los botones superiores según el modo actual del formulario.
  const boton = () => {
    if (soloInfo) return "";

    if (!isEditing) {
      return !canDirectEdit ? (
        <button onClick={handleEdit}>Pedir cambios</button>
      ) : (
        <FaEdit onClick={handleEdit} />
      );
    }

    return (
      <>
        <button onClick={handleSave}>{canDirectEdit ? "Guardar" : "Enviar solicitud"}</button>
        <button onClick={reset}>Cancelar</button>
      </>
    );
  };

  return (
    <div className={styles.contenedor}>
      <h2>
        INFORMACIÓN PERSONAL
        {boton()}
        {(logged.user.role === "root" || logged.user.role === "rrhh") && (
          <div className={styles.cajaBotonesSuperiores}>
            {logged.user.role === "root" && (
              <button onClick={recreateEmail}>Volver a crear el email coorporativo</button>
            )}

            <button
              className={
                datos.employmentStatus === "activo"
                  ? styles.activo
                  : datos.employmentStatus === "en proceso de contratación"
                  ? styles.enproceso
                  : styles.noactivo
              }
              onClick={() => setQuickStatusTarget(datos.employmentStatus)}
            >
              Estado: {datos.employmentStatus}
            </button>
          </div>
        )}
      </h2>

      <div className={styles.photoContainer}>
        <button
          type="button"
          className={styles.photoButton}
          onClick={openFilePicker}
          title="Cambiar foto de perfil"
        >
          <img
            src={photoUrl || perfil512}
            alt="Foto de perfil"
            className={styles.photoNormal}
            decoding="async"
            onError={(e) => {
              e.currentTarget.src = perfil512;
            }}
          />
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          capture="user"
          onChange={onPickProfileImage}
          className={styles.photoFileHidden}
        />

        {photoError && <span className={styles.errorSpan}>{photoError}</span>}
      </div>

      {logged.user.role === "root" && (
        <div className={styles.roleContainer}>
          <label className={styles.roleLabel}>Rol</label>
          <select
            className={styles.role}
            name="role"
            value={datos.role || ""}
            onChange={handleChange}
            disabled={!isEditing}
          >
            <option value="">Seleccionar</option>
            <option value="root">Root</option>
            <option value="global">Global</option>
            <option value="employee">Empleado</option>
            <option value="rrhh">Recursos Humanos</option>
            <option value="auditor">Auditor</option>
          </select>
        </div>
      )}

      <div className={styles.apafaContainer}>
        <label className={styles.apafaLabel}>Apafa</label>
        <select
          className={styles.apafa}
          name="apafa"
          value={datos.apafa || "no"}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        {errores.apafa && <span className={styles.errorSpan}>{errores.apafa}</span>}
      </div>

      {textFields.map(([fieldName, label]) => {
        if (fieldName === "birthday" || fieldName === "drivingLicenceIssueDate") {
  if (fieldName === "drivingLicenceIssueDate" && datos.hasDrivingLicenceCar !== "si") {
    return null;
  }

  return (
    <div key={fieldName} className={styles[fieldName + "Container"]}>
      <label className={styles[fieldName + "Label"]}>{label}</label>

      {!isEditing ? (
        <input
          className={styles[fieldName]}
          type="text"
          value={datos[fieldName] ? formatDate(datos[fieldName]) : ""}
          disabled
        />
      ) : (
        <input
          className={styles[fieldName]}
          type="date"
          name={fieldName}
          value={toInputDate(datos[fieldName])}
          onChange={handleChange}
        />
      )}

      {errores[fieldName] && <span className={styles.errorSpan}>{errores[fieldName]}</span>}
    </div>
  );
}

        const isRootOrGlobal = logged.user.role === "global" || logged.user.role === "root" || logged.user.role === "rrhh";
        let control = null;

        if (fieldName === "hasDrivingLicenceCar") {
  control = (
    <select
      className={styles[fieldName]}
      name="hasDrivingLicenceCar"
      value={datos.hasDrivingLicenceCar || "no"}
      onChange={handleChange}
      disabled={!isEditing}
    >
      <option value="si">Sí</option>
      <option value="no">No</option>
    </select>
  );
} else if (fieldName === "tracking") {
          if (isRootOrGlobal) {
            control = (
              <select
                className={styles[fieldName]}
                name="tracking"
                value={datos.tracking || "no"}
                onChange={handleChange}
                disabled={!isEditing}
              >
                <option value="si">Sí</option>
                <option value="no">No</option>
              </select>
            );
          } else {
            control = (
              <input
                className={styles[fieldName]}
                type="text"
                value={datos.tracking === "si" ? "Sí" : "No"}
                disabled
              />
            );
          }
        } else if (fieldName === "employmentStatus") {
          control = <input className={styles[fieldName]} type="text" value={datos[fieldName] || ""} disabled />;
        } else if (fieldName === "email") {
          control = (
            <input
              className={styles[fieldName]}
              type="text"
              name={fieldName}
              value={datos[fieldName] || ""}
              onChange={handleChange}
              disabled
            />
          );
        } else {
          control = (
            <input
              className={styles[fieldName]}
              type="text"
              name={fieldName}
              value={datos[fieldName] || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
          );
        }

        return (
          <div key={fieldName} className={styles[fieldName + "Container"]}>
            <label className={styles[fieldName + "Label"]}>{label}</label>
            {control}
            {errores[fieldName] && <span className={styles.errorSpan}>{errores[fieldName]}</span>}
          </div>
        );
      })}

      <div className={styles.phoneJobContainer}>
        <label className={styles.phoneJobLabel}>Teléfono Laboral</label>
        <input
          className={styles.phoneJob}
          type="text"
          name="phoneJobNumber"
          value={datos.phoneJob?.number || datos.phoneJobNumber || ""}
          onChange={handleChange}
          disabled={!isEditing}
        />
        {errores.phoneJobNumber && <span className={styles.errorSpan}>{errores.phoneJobNumber}</span>}
      </div>

      <div className={styles.phoneJobExtensionContainer}>
        <label className={styles.phoneJobExtensionLabel}>Extensión</label>
        <input
          className={styles.phoneJobExtension}
          type="text"
          name="phoneJobExtension"
          value={datos.phoneJob?.extension || datos.phoneJobExtension || ""}
          onChange={handleChange}
          disabled={!isEditing}
        />
      </div>

      

      <div className={styles.genderContainer}>
        <label className={styles.genderLabel}>Género</label>
        <select
          className={styles.gender}
          name="gender"
          value={datos.gender || ""}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="">Seleccionar</option>
          <option value="male">Hombre</option>
          <option value="female">Mujer</option>
          <option value="others">Otros</option>
          <option value="nonBinary">No binario</option>
        </select>
        {errores.gender && <span className={styles.errorSpan}>{errores.gender}</span>}
      </div>

      <div className={styles.fosteredContainer}>
        <label className={styles.fosteredLabel}>Extutelado</label>
        <select
          className={styles.fostered}
          name="fostered"
          value={datos.fostered || "no"}
          onChange={handleChange}
          disabled={!isEditing}
        >
          <option value="si">Sí</option>
          <option value="no">No</option>
        </select>
        {errores.fostered && <span className={styles.errorSpan}>{errores.fostered}</span>}
      </div>

      {(isEditing || (!!datos && datos.consetmentDataProtection === "no")) && (
        <div className={styles.consetmentDataProtectionContainer}>
          <label className={styles.consetmentDataProtectionLabel}>Consentimiento PD</label>
          <select
            className={styles.consetmentDataProtection}
            name="consetmentDataProtection"
            value={datos.consetmentDataProtection || "si"}
            onChange={handleChange}
            disabled={!isEditing}
          >
            <option value="si">Sí</option>
            <option value="no">No</option>
          </select>
          {errores.consetmentDataProtection && (
            <span className={styles.errorSpan}>{errores.consetmentDataProtection}</span>
          )}
        </div>
      )}

      {(isEditing || (datos?.disability?.percentage || 0) > 0) && (
        <>
          <div className={styles.disabilityPercentageContainer}>
            <label className={styles.disabilityPercentageLabel}>Porcentaje de Discapacidad</label>
            <input
              className={styles.disabilityPercentage}
              type="number"
              name="disability.percentage"
              value={datos?.disability?.percentage || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
            {errores["disability.percentage"] && (
              <span className={styles.errorSpan}>{errores["disability.percentage"]}</span>
            )}
          </div>

          <div className={styles.disabilityNotesContainer}>
            <label className={styles.disabilityNotesLabel}>Notas sobre la discapacidad</label>
            <input
              className={styles.disabilityNotes}
              type="text"
              name="disability.notes"
              value={datos?.disability?.notes || ""}
              onChange={handleChange}
              disabled={!isEditing}
            />
            {errores["disability.notes"] && (
              <span className={styles.errorSpan}>{errores["disability.notes"]}</span>
            )}
          </div>
        </>
      )}

      <div className={styles.studiesContainer}>
        <label className={styles.studiesLabel}>Estudios</label>

        {!isEditing ? (
          datos.studies?.length ? (
            datos.studies.map((study, index) => (
              <p key={index} className={styles.studyItem}>
                {getStudyLabel(study)}
              </p>
            ))
          ) : (
            <p className={styles.noStudies}>No hay información sobre estudios</p>
          )
        ) : (
          <>
            <div className={styles.studiesList}>
              {datos.studies?.length ? (
                datos.studies.map((study, index) => (
                  <div key={index} className={styles.studyItem}>
                    <p>{getStudyLabel(study)}</p>
                    <FaTrashAlt onClick={() => handleDeleteStudy(study)} className={styles.trashIcon} />
                  </div>
                ))
              ) : (
                <p className={styles.noStudies}>No hay estudios seleccionados</p>
              )}
            </div>

            <div className={styles.addStudy}>
              <select
                className={styles.studySelect}
                value={selectedStudy}
                onChange={(e) => setSelectedStudy(e.target.value)}
              >
                <option value="">Añadir estudios</option>
                {availableStudiesOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>

              <FaSquarePlus onClick={handleAddStudy} className={styles.plusIcon} />
            </div>
          </>
        )}
      </div>

      {confirmRecreateEmail && (
        <ModalConfirmation
          title="Volver a crear el email corporativo"
          message={
            "Esta acción eliminará el usuario actual de Google Workspace y se creará uno nuevo.\n\n" +
            "Esta acción NO ES REVERSIBLE y el buzón anterior se perderá si no existe copia.\n\n" +
            "¿Quieres continuar?"
          }
          onCancel={() => setConfirmRecreateEmail(false)}
          onConfirm={doRecreateEmail}
          textConfirm="Sí, recrear email"
        />
      )}

      {quickStatusTarget && (
        <ModalForm
          title="Cambiar estado laboral"
          fields={[
            {
              name: "status",
              label: "Estado",
              type: "select",
              required: true,
              options: [
                { value: "activo", label: "Activo" },
                { value: "en proceso de contratación", label: "En proceso de contratación" },
                { value: "ya no trabaja con nosotros", label: "Ya no trabaja con nosotros" },
              ].filter((option) => option.value !== datos.employmentStatus),
            },
          ]}
          onSubmit={handleChangeStatus}
          onClose={() => setQuickStatusTarget(null)}
          modal={modal}
        />
      )}

      {activateSesameModal && (
  <ModalForm
    title="Activar en Sesame"
    message="Selecciona el dispositivo al que quieres asignar a la persona en Sesame"
    fields={[
      {
        name: "dispositiveId",
        label: "Dispositivo",
        type: "select",
        required: true,
        options: sesameDispositiveOptions,
      },
    ]}
    onSubmit={handleActivateInSesame}
    onClose={handleCancelActivateSesame}
    modal={modal}
  />
)}
{selectSesameWorkplaceModal && (
  <ModalForm
    title="Seleccionar centro de trabajo"
    message="Este dispositivo tiene varias oficinas Sesame asociadas. Selecciona a cuál debe asignarse como oficina principal."
    fields={[
      {
        name: "workplaceId",
        label: "Centro de trabajo",
        type: "select",
        required: true,
        options: sesameWorkplaceOptions,
      },
    ]}
    onSubmit={handleSelectSesameWorkplace}
    onClose={handleCancelActivateSesame}
    modal={modal}
  />
)}
    </div>
  );
};

export default InfoEmployer;