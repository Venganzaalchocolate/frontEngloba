import { useState, useEffect, useTransition, useActionState, useMemo, useCallback, useId } from "react";
import { getData, volunteerCreate } from "../../lib/data";
import { textErrors } from "../../lib/textErrors";
import { validEmail, validateDNIorNIE, validNumber, validText } from "../../lib/valid";
import { useNavigate, Link } from "react-router";
import styles from "../styles/formJobUp.module.css";
import logoUrl from "/graphic/logotipo.png";

import MultiSelectFlat from "../globals/MultiSelectFlat";
import { buildOptionsFromIndex } from "../../lib/utils";
import MultiSelectGrouped from "../globals/MultiSelectGrouped";

const OCCUPATION_OPTIONS = [
  { value: "estudiando", label: "Estudiando" },
  { value: "trabajando_media_jornada", label: "Trabajando a media jornada" },
  { value: "trabajando_jornada_completa", label: "Trabajando a jornada completa" },
  { value: "jubilado", label: "Jubilado/a" },
  { value: "desempleado", label: "Desempleado/a" },
  { value: "otro", label: "Otro" },
];

const AREA_OPTIONS = [
  { value: "igualdad", label: "Igualdad" },
  { value: "desarrollo comunitario", label: "Desarrollo comunitario" },
  { value: "lgtbiq", label: "LGTBIQ+" },
  { value: "infancia y juventud", label: "Infancia y juventud" },
  { value: "personas con discapacidad", label: "Personas con discapacidad" },
  { value: "mayores", label: "Mayores" },
  { value: "no identificado", label: "No identificado" },
];

const GENDER_OPTIONS=[
  {value:'male', label:'Masculino'}, 
  {value:'female', label:'Femenino'}, 
  {value:'others', label:'Otros'}, 
  {value:'nonBinary', label:'No Binario'}]

export default function FormVolunteerUp({ modal, charge }) {
  const idForm = useId();
  const navigate = useNavigate();
  const [isLoadingEnums, startEnums] = useTransition();

  const [enums, setEnums] = useState({ studies: [], provinces: [], programs: [], studiesIndex: null, provincesIndex: null });


  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    birthDate: "",
    documentId: "",
    email: "",
    phone: "",
    province: "",
    localidad: "",
    occupation: [],
    occupationOtherText: "",
    studies: [],
    studiesOtherText: "",
    availability: "",
    areaInterest: [],
    referralSource: "",
    userNote: "",
    terms: false,
    gender:''
  });

  const [formErrors, setFormErrors] = useState({});

  const flattenCats = useCallback((arr) => {
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const x of arr) {
      if (Array.isArray(x?.subcategories) && x.subcategories.length) out.push(...x.subcategories);
      else out.push(x);
    }
    return out;
  }, []);

  const provincesFlat = useMemo(() => flattenCats(enums.provinces), [enums.provinces, flattenCats]);





  const isValidBirthDate = (v) => {
    if (!v) return false;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) return false;
    const now = new Date();
    return d <= now;
  };

  const requiredFields = useMemo(
    () =>
      new Set([
        "firstName",
        "lastName",
        "birthDate",
        "documentId",
        "email",
        "phone",
        "province",
        "localidad",
        "occupation",
        "studies",
        "availability",
        "referralSource",
        "terms",
        "gender"
      ]),
    []
  );

  const checks = useMemo(
    () => ({
      firstName: (v) => validText(v, 2, 120),
      lastName: (v) => validText(v, 2, 180),
      birthDate: (v) => isValidBirthDate(v),
      documentId: (v) => validateDNIorNIE(v),
      email: (v) => validEmail(v),
      phone: (v) => validNumber(v),
      province: (v) => !!v,
      localidad: (v) => validText(v, 2, 120),
      occupation: (arr) => Array.isArray(arr) && arr.length > 0,
      studies: (arr) => Array.isArray(arr) && arr.length > 0,
      availability: (v) => validText(v, 0, 2000),
      referralSource: (v) => validText(v, 2, 500),
      terms: (v) => !!v,
      programOrArea: () =>
        (Array.isArray(formData.areaInterest) && formData.areaInterest.length > 0),
      gender: (v) => !!String(v || "").trim()
    }),
    [formData.areaInterest]
  );

  const isEmpty = (name, value) => {
    if (!requiredFields.has(name)) return false;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === "boolean") return value === false;
    return value == null || String(value).trim() === "";
  };

  const validateField = useCallback(
    (name, value) => {
      if (name === "programOrArea") return checks.programOrArea() ? null : "Indica programas o áreas de interés";
      if (isEmpty(name, value)) return textErrors("vacio") || "Requerido";
      if (checks[name] && !checks[name](value)) return textErrors(name) || "Campo inválido";
      return null;
    },
    [checks]
  );

  const validateAll = useCallback(
    (data) => {
      const errs = {};
      const keys = Object.keys(checks).filter((k) => k !== "programOrArea");
      for (const key of keys) {
        const msg = validateField(key, data[key]);
        if (msg) errs[key] = msg;
      }
      const msgPA = validateField("programOrArea", null);
      if (msgPA) errs.programOrArea = msgPA;
      if (!data.occupation?.includes("otro")) data.occupationOtherText = "";
      return errs;
    },
    [checks, validateField]
  );

  useEffect(() => {
    startEnums(async () => {
      charge(true);
      try {
        const res = await getData();
        if (!res?.error) setEnums(res);
      } finally {
        charge(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleChange = useCallback(
    (e) => {
      const { name, type, value, checked } = e.target;
      const val = type === "checkbox" ? checked : value;
      setFormData((fd) => ({ ...fd, [name]: val }));
      if (checks[name]) setFormErrors((fe) => ({ ...fe, [name]: validateField(name, val) }));
    },
    [checks, validateField]
  );

const toggleInArray = useCallback((key, v) => {
  setFormData((fd) => {
    const cur = Array.isArray(fd[key]) ? fd[key] : [];
    const has = cur.includes(v);
    const next = has ? cur.filter((x) => x !== v) : [...cur, v];
    setFormErrors((fe) => ({ ...fe, [key]: checks[key] ? validateField(key, next) : fe[key] }));
    if (key === "areaInterest") {
      const nextAreas = key === "areaInterest" ? next : (Array.isArray(fd.areaInterest) ? fd.areaInterest : []);
      const ok = nextAreas.length > 0;
      setFormErrors((fe) => ({ ...fe, programOrArea: ok ? null : "Indica áreas de interés" }));
    }
    return { ...fd, [key]: next };
  });
}, [checks, validateField]);

  const handleArrayChange = useCallback(
    (key, nextArr) => {
      setFormData((fd) => ({ ...fd, [key]: nextArr }));
      if (checks[key]) setFormErrors((fe) => ({ ...fe, [key]: validateField(key, nextArr) }));
      if (key === "areaInterest") {
        setFormErrors((fe) => ({ ...fe, programOrArea: validateField("programOrArea", null) }));
      }
    },
    [checks, validateField]
  );

  const addStudy = useCallback(
    (v) => handleArrayChange("studies", [...new Set([...(formData.studies || []), v])]),
    [formData.studies, handleArrayChange]
  );
  const removeStudy = useCallback(
    (v) => handleArrayChange("studies", (formData.studies || []).filter((x) => x !== v)),
    [formData.studies, handleArrayChange]
  );


  const initialSubmit = { ok: false, serverError: null };

  const [submitState, formAction, isSubmitting] = useActionState(async (_prev, fd) => {
    const values = {
      firstName: fd.get("firstName") ?? "",
      lastName: fd.get("lastName") ?? "",
      birthDate: fd.get("birthDate") ?? "",
      documentId: (fd.get("documentId") ?? "").toUpperCase(),
      email: fd.get("email") ?? "",
      phone: fd.get("phone") ?? "",
      province: fd.get("province") ?? "",
      localidad: fd.get("localidad") ?? "",
      occupation: fd.getAll("occupation"),
      occupationOtherText: fd.get("occupationOtherText") ?? "",
      studies: fd.getAll("studies"),
      studiesOtherText: fd.get("studiesOtherText") ?? "",
      availability: fd.get("availability") ?? "",
      areaInterest: fd.getAll("areaInterest"),
      referralSource: fd.get("referralSource") ?? "",
      userNote: fd.get("userNote") ?? "",
      terms: fd.get("terms") === "true" || fd.get("terms") === "on" || fd.get("terms") === "ON",
      gender: fd.get("gender") ?? "",
    };

    const errs = validateAll(values);
    if (Object.keys(errs).length) {
      setFormErrors(errs);
      return { ok: false, serverError: null };
    }

    const payload = {
      firstName: values.firstName,
      lastName: values.lastName,
      birthDate: values.birthDate,
      documentId: values.documentId,
      phone: values.phone,
      email: values.email,
      province: values.province,
      localidad: values.localidad,
      occupation: values.occupation,
      occupationOtherText: values.occupationOtherText,
      studies: values.studies,
      studiesOtherText: values.studiesOtherText,
      availability: values.availability,
      areaInterest: values.areaInterest,
      referralSource: values.referralSource,
      userNote: values.userNote,
      gender: values.gender,
    };

    charge(true);
    try {
      const res = await volunteerCreate(payload);
      if (res?.error) {
        modal("Error", res.message || "No se pudo enviar el formulario");
        return { ok: false, serverError: res.message || "Error" };
      }
      modal("Formulario enviado", "Gracias. Hemos recibido tu solicitud de voluntariado.");
      setFormErrors({});
      navigate("/");
      return { ok: true, serverError: null };
    } catch (e) {
      const msg = e?.message || "Error inesperado";
      modal("Error", msg);
      return { ok: false, serverError: msg };
    } finally {
      charge(false);
    }
  }, initialSubmit);

  const boolToAttr = (v) => (v ? "on" : "");

  const studiesOptions = buildOptionsFromIndex(enums?.studiesIndex, { onlySub: true }) || enums.studies || [];

  return (
    <div className={styles.contenedor}>
      <div className={styles.cabecera}>
        <div className={styles.areas}>
          <div className={styles.igualdad}></div>
          <div className={styles.infancia}></div>
          <div className={styles.mayores}></div>
          <div className={styles.lgtbi}></div>
          <div className={styles.desarrollo}></div>
          <div className={styles.discapacidad}></div>
        </div>
        <div className={styles.areaMenu}>
          <div className={styles.logo}>
            <img src={logoUrl} alt="logoEngloba" />
            <p>Integración Laboral, Educativa y Social</p>
          </div>
        </div>
        <h2>FORMULARIO DE VOLUNTARIADO</h2>
      </div>

      <form className={styles.formJob} action={formAction}>
        <div className={styles.field}>
          <label htmlFor={`${idForm}-firstName`}>Nombre</label>
          <input id={`${idForm}-firstName`} name="firstName" value={formData.firstName} onChange={handleChange} placeholder="Tu nombre" />
          {formErrors.firstName && <small className={styles.errorMsg}>{formErrors.firstName}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-lastName`}>Apellidos</label>
          <input id={`${idForm}-lastName`} name="lastName" value={formData.lastName} onChange={handleChange} placeholder="Tus apellidos" />
          {formErrors.lastName && <small className={styles.errorMsg}>{formErrors.lastName}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-birthDate`}>Fecha de nacimiento</label>
          <input id={`${idForm}-birthDate`} name="birthDate" type="date" value={formData.birthDate} onChange={handleChange} />
          {formErrors.birthDate && <small className={styles.errorMsg}>{formErrors.birthDate}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-documentId`}>DNI/NIE</label>
          <input id={`${idForm}-documentId`} name="documentId" value={formData.documentId} onChange={handleChange} placeholder="12345678A" />
          {formErrors.documentId && <small className={styles.errorMsg}>{formErrors.documentId}</small>}
        </div>

<div className={styles.field}>
  <label htmlFor={`${idForm}-gender`}>Género</label>
  <select
    id={`${idForm}-gender`}
    name="gender"
    value={formData.gender}
    onChange={handleChange}
  >
    <option value="">Selecciona…</option>
    {GENDER_OPTIONS.map((g) => (
      <option key={g.value} value={g.value}>
        {g.label}
      </option>
    ))}
  </select>

  {formErrors.gender && <small className={styles.errorMsg}>{formErrors.gender}</small>}
</div>
        <div className={styles.field}>
          <label htmlFor={`${idForm}-email`}>Email</label>
          <input id={`${idForm}-email`} name="email" type="email" value={formData.email} onChange={handleChange} placeholder="correo@ejemplo.com" />
          {formErrors.email && <small className={styles.errorMsg}>{formErrors.email}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-phone`}>Teléfono</label>
          <input id={`${idForm}-phone`} name="phone" value={formData.phone} onChange={handleChange} placeholder="600123123" />
          {formErrors.phone && <small className={styles.errorMsg}>{formErrors.phone}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-province`}>Provincia</label>
          <select id={`${idForm}-province`} name="province" value={formData.province} onChange={handleChange} disabled={isLoadingEnums}>
            <option value="">Selecciona…</option>
            {provincesFlat.map((p) => (
              <option key={p._id} value={p._id}>
                {p.name}
              </option>
            ))}
          </select>
          {formErrors.province && <small className={styles.errorMsg}>{formErrors.province}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-localidad`}>Localidad</label>
          <input id={`${idForm}-localidad`} name="localidad" value={formData.localidad} onChange={handleChange} placeholder="Tu localidad" />
          {formErrors.localidad && <small className={styles.errorMsg}>{formErrors.localidad}</small>}
        </div>



        <MultiSelectGrouped label="Estudios (selecciona 1 o varios)" enums={enums.studies} selected={formData.studies} onAdd={addStudy} onRemove={removeStudy} disabled={isLoadingEnums} />
        {formErrors.studies && <small className={styles.errorMsg}>{formErrors.studies}</small>}
        {formData.studies.map((v) => (
          <input key={`studies-${v}`} type="hidden" name="studies" value={v} />
        ))}

{formData.studies.includes("68ef4cca3ba2b1b62b5d7810") && 
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor={`${idForm}-studiesOtherText`}>Otros estudios (opcional)</label>
          <input id={`${idForm}-studiesOtherText`} name="studiesOtherText" value={formData.studiesOtherText} onChange={handleChange} placeholder="Si quieres añadir algo más" />
        </div>
}



        <div className={`${styles.field} ${styles.full}`}>
          <span className={styles.label}>Áreas que te interesan (puedes marcar varias)</span>
          <div className={styles.columnChoices}>
            {AREA_OPTIONS.map((a) => (
              <label key={a.value} className={styles.choice}>
                <input type="checkbox" checked={formData.areaInterest.includes(a.value)} onChange={() => toggleInArray("areaInterest", a.value)} />
                <span>{a.label}</span>
              </label>
            ))}
          </div>
          {formData.areaInterest.map((v) => (
            <input key={`areaInterest-${v}`} type="hidden" name="areaInterest" value={v} />
          ))}
          {formErrors.programOrArea && <small className={styles.errorMsg}>{formErrors.programOrArea}</small>}
        </div>

                <div className={`${styles.field} ${styles.full}`}>
          <span className={styles.label}>Ocupación (puedes marcar varias)</span>
          <div className={styles.columnChoices}>
            {OCCUPATION_OPTIONS.map((o) => (
              <label key={o.value} className={styles.choice}>
                <input type="checkbox" checked={formData.occupation.includes(o.value)} onChange={() => toggleInArray("occupation", o.value)} />
                <span>{o.label}</span>
              </label>
            ))}
          </div>
          {formErrors.occupation && <small className={styles.errorMsg}>{formErrors.occupation}</small>}
          {formData.occupation.map((v) => (
            <input key={`occupation-${v}`} type="hidden" name="occupation" value={v} />
          ))}
        </div>

        {formData.occupation.includes("otro") && (
          <div className={`${styles.field} ${styles.full}`}>
            <label htmlFor={`${idForm}-occupationOtherText`}>Especifica (otro)</label>
            <input id={`${idForm}-occupationOtherText`} name="occupationOtherText" value={formData.occupationOtherText} onChange={handleChange} placeholder="Cuéntanos un poco" />
          </div>
        )}

                <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor={`${idForm}-availability`}>Disponibilidad</label>
          <textarea id={`${idForm}-availability`} name="availability" value={formData.availability} onChange={handleChange} />
          {formErrors.availability && <small className={styles.errorMsg}>{formErrors.availability}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-referralSource`}>¿Cómo nos has conocido?</label>
          <input id={`${idForm}-referralSource`} name="referralSource" value={formData.referralSource} onChange={handleChange} placeholder="Redes, amistades, web, etc." />
          {formErrors.referralSource && <small className={styles.errorMsg}>{formErrors.referralSource}</small>}
        </div>

        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor={`${idForm}-userNote`}>Notas / carta de presentación (opcional)</label>
          <textarea id={`${idForm}-userNote`} name="userNote" value={formData.userNote} onChange={handleChange} />
        </div>

        <div className={`${styles.field} ${styles.full}`}>
          <label>
            <input type="checkbox" name="terms" checked={formData.terms} onChange={handleChange} /> Acepto la política de privacidad
            <Link to="https://engloba.org.es/privacidad"> (ver)</Link>
          </label>
          <input type="hidden" name="terms" value={boolToAttr(formData.terms)} />
          <small>
            *Para cumplir con la normativa vigente en protección de datos de
            carácter personal, tal y como se indica en la correspondiente
            cláusula informativa, tu formulario se mantendrá en nuestra base de datos
            durante un periodo de dos años a contar desde la fecha de entrega,
            pasado este tiempo se borrarán tus datos.
          </small>
          {formErrors.terms && <small className={styles.errorMsg}>{formErrors.terms}</small>}
        </div>

        <div className={styles.actions}>
          <div className={styles.actionsCancel}>
            <button type="button" onClick={() => navigate("/")}>Cancelar</button>
            <button type="button" onClick={() => { setFormData((fd) => ({ ...fd, firstName: "", lastName: "", birthDate: "", documentId: "", email: "", phone: "", province: "", localidad: "", occupation: [], occupationOtherText: "", studies: [], studiesOtherText: "", availability: "", programInterest: [], areaInterest: [], referralSource: "", userNote: "", terms: false })); setFormErrors({}); }}>Limpiar</button>
          </div>
          <button type="submit" disabled={isSubmitting}>{isSubmitting ? "Enviando…" : "Enviar"}</button>
        </div>
      </form>
    </div>
  );
}
