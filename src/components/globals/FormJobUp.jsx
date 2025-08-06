import {
  useState,
  useEffect,
  useTransition,
  useActionState, // React 19
  useMemo,
  useCallback,
  useId,
  useRef,
} from 'react';
import { getData, getOfferJobId, sendFormCv } from '../../lib/data';
import { textErrors } from '../../lib/textErrors';
import {
  validEmail,
  validateDNIorNIE,
  validNumber,
  validNumberPercentage,
  validText,
} from '../../lib/valid';
import styles from '../styles/formJobUp.module.css';
import MultiSelectGrouped from './MultiSelectGrouped';
import MultiSelectFlat from './MultiSelectFlat';
import { Link, Navigate, useNavigate, useParams } from 'react-router';

export default function FormJobUp({ modal, charge, user, changeUser }) {
  const { id } = useParams();
  const idForm = useId();
  const [isLoadingEnums, startEnums] = useTransition();
  const [enums, setEnums] = useState({ work_schedule: [], studies: [], jobs: [], provinces: [] });
  const [offerInfo,setOffer]=useState(null)
  const navigate = useNavigate();
  // Estado mínimo: datos que afectan a la UI + arrays + errores
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    dni: user?.dni || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    work_schedule: user?.work_schedule?.[0] || '',
    fostered: user?.fostered || 'no',
    hasDisability: (user?.disability || 0) > 0,
    disability: user?.disability || '',
    about: user?.about || '',
    jobs: user?.jobs || [],
    provinces: user?.provinces || [],
    studies: user?.studies || [],
    terms: !!user,
    file: null,
  });
  
  const [formErrors, setFormErrors] = useState({});

  const initialFormRef = useRef(formData);

  const handleReset = useCallback((e) => {
  setFormData(initialFormRef.current);  // vuelve a valores iniciales
  setFormErrors({});         // limpia errores si quieres
  }, []);
  // --- Validación: primero "vacío", luego "formato" ---
  const requiredFields = useMemo(
    () => new Set(['firstName', 'lastName', 'dni', 'email', 'phone', 'gender', 'work_schedule', 'terms', 'studies', 'jobs', 'provinces', 'file']),
    []
  );

  const checks = useMemo(() => ({
    firstName: v => validText(v, 3, 100),
    lastName: v => validText(v, 3, 100),
    dni: v => validateDNIorNIE(v),
    email: v => validEmail(v),
    phone: v => validNumber(v),
    gender: v => ['male', 'female', 'others', 'nonBinary'].includes(v),
    work_schedule: v => !!v,
    terms: v => !!v,
    disability: v => !formData.hasDisability || validNumberPercentage(String(v)),
    studies: arr => Array.isArray(arr) && arr.length > 0,
    jobs: arr => Array.isArray(arr) && arr.length > 0,
    provinces: arr => Array.isArray(arr) && arr.length > 0,
    file: f => f instanceof File && f.type === 'application/pdf',
  }), [formData.hasDisability]);

  const isEmpty = (name, value) => {
    if (!requiredFields.has(name)) return false;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'boolean') return value === false;
    return value == null || String(value).trim() === '';
  };

  const validateField = useCallback((name, value) => {
    if (isEmpty(name, value)) return textErrors('vacio') || 'Requerido';
    if (checks[name] && !checks[name](value)) return textErrors(name) || 'Campo inválido';
    return null;
  }, [checks]);

  const validateAll = useCallback((data) => {
    const errs = {};
    for (const key of Object.keys(checks)) {
      const msg = validateField(key, data[key]);
      if (msg) errs[key] = msg;
    }
    return errs;
  }, [checks, validateField]);

  // Enums (con transición async de React 19)
  useEffect(() => {
    startEnums(async () => {
      charge(true);
      try {
        
        if (id) {
          const offerJob = await getOfferJobId({ id });
          if (offerJob.error) {
            modal('Error', 'Oferta no disponible, por favor inténtelo más tarde');
            navigate('/trabajaconnosotros');
          } else {
            
            setOffer(offerJob);
          }
        }
        const res = await getData();
        if (!res.error) setEnums(res);
      } finally {
        charge(false);
      }
    });
  }, []);

  // Cambios simples + validación en vivo (orden: vacío -> formato)
  const handleChange = useCallback((e) => {
    const { name, type, value, checked, files } = e.target;
    const val =
      type === 'checkbox' ? checked :
        type === 'file' ? files?.[0] ?? null :
          value;

    setFormData(fd => ({ ...fd, [name]: val }));

    if (checks[name]) {
      setFormErrors(fe => ({ ...fe, [name]: validateField(name, val) }));
    }
  }, [checks, validateField]);

  // Arrays (usamos set + callbacks estables)
  const handleArrayChange = useCallback((key, nextArr) => {
    setFormData(fd => ({ ...fd, [key]: nextArr }));
    if (checks[key]) {
      setFormErrors(fe => ({ ...fe, [key]: validateField(key, nextArr) }));
    }
  }, [checks, validateField]);

  const addJob = useCallback(v => handleArrayChange('jobs', [...new Set([...formData.jobs, v])]), [formData.jobs, handleArrayChange]);
  const removeJob = useCallback(v => handleArrayChange('jobs', formData.jobs.filter(x => x !== v)), [formData.jobs, handleArrayChange]);
  const addStudy = useCallback(v => handleArrayChange('studies', [...new Set([...formData.studies, v])]), [formData.studies, handleArrayChange]);
  const removeStudy = useCallback(v => handleArrayChange('studies', formData.studies.filter(x => x !== v)), [formData.studies, handleArrayChange]);
  const addProv = useCallback(v => handleArrayChange('provinces', [...new Set([...formData.provinces, v])]), [formData.provinces, handleArrayChange]);
  const removeProv = useCallback(v => handleArrayChange('provinces', formData.provinces.filter(x => x !== v)), [formData.provinces, handleArrayChange]);

  // --- Envío con React 19: useActionState + <form action={...}> ---
  const initialSubmit = { ok: false, serverError: null };

  const [submitState, formAction, isSubmitting] = useActionState(
    async (_prevState, fd /* FormData del <form> */) => {
      // Normalizamos valores que van en arrays y booleanos
      const values = {
        firstName: fd.get('firstName') ?? '',
        lastName: fd.get('lastName') ?? '',
        dni: fd.get('dni') ?? '',
        email: fd.get('email') ?? '',
        phone: fd.get('phone') ?? '',
        gender: fd.get('gender') ?? '',
        work_schedule: fd.get('work_schedule') ?? '',
        fostered: fd.get('fostered') ?? 'no',
        about: fd.get('about') ?? '',
        terms: fd.get('terms') === 'true' || fd.get('terms') === 'on',
        jobs: fd.getAll('jobs'),
        provinces: fd.getAll('provinces'),
        studies: fd.getAll('studies'),
        user:(!!user)?user._id:'',
        file: fd.get('file') ?? null,
        disability: (fd.get('hasDisability') === 'true' || fd.get('hasDisability') === 'on')? fd.get('disability') : 0,
        offer:(!!offerInfo)?offerInfo._id:''
      };

      

      // Validación completa antes de enviar (vacío -> formato)
      const errs = validateAll(values);
      if (Object.keys(errs).length > 0) {
        setFormErrors(errs);
        return { ok: false, serverError: null };
      }
      delete values.file;

      charge(true);

      try {
        const res = (user == null
                        ? await sendFormCv(values, fd.get('file'))
                        : await sendFormCv(values, fd.get('file'), true)
        );
        if (res.error) {
          modal('Error', res.message);
          return { ok: false, serverError: res.message };
        }
        modal('CV enviado', user ? 'Modificado con éxito' : 'Enviado con éxito');
        changeUser?.(res);
        setFormErrors({}); // limpio errores tras éxito
        navigate('/')
        return { ok: true, serverError: null };
      } catch (e) {
        const msg = e?.message || 'Error inesperado';
        modal('Error', msg);
        return { ok: false, serverError: msg };
      } finally {
        charge(false);
      }
    },
    initialSubmit
  );

  // Helpers para checkboxes que viajan como "on/true"
  const boolToAttr = v => (v ? 'on' : '');

  return (
    <div className={styles.contenedor}>
      
      <form className={styles.formJob} action={formAction} onReset={handleReset}>
        {(!!offerInfo) &&
        <>
        <p className={styles.tituloOferta}>Inscripción en la oferta: </p>
        <p className={styles.bold}>{offerInfo.job_title}</p>
        </>
        
      }
        
        {/* --- Inputs simples controlados (validación en vivo) --- */}
        <div className={styles.field}>
          <label htmlFor={`${idForm}-firstName`}>Nombre</label>
          <input
            id={`${idForm}-firstName`}
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Tu nombre"
          />
          {formErrors.firstName && <small className={styles.errorMsg}>{formErrors.firstName}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-lastName`}>Apellidos</label>
          <input
            id={`${idForm}-lastName`}
            name="lastName"
            value={formData.lastName}
            onChange={handleChange}
            placeholder="Tus apellidos"
          />
          {formErrors.lastName && <small className={styles.errorMsg}>{formErrors.lastName}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-dni`}>DNI/NIE</label>
          <input
            id={`${idForm}-dni`}
            name="dni"
            value={formData.dni}
            onChange={handleChange}
            placeholder="12345678A"
          />
          {formErrors.dni && <small className={styles.errorMsg}>{formErrors.dni}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-email`}>Email</label>
          <input
            type="email"
            id={`${idForm}-email`}
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="correo@ejemplo.com"
          />
          {formErrors.email && <small className={styles.errorMsg}>{formErrors.email}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-phone`}>Teléfono</label>
          <input
            id={`${idForm}-phone`}
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            placeholder="600123123"
          />
          {formErrors.phone && <small className={styles.errorMsg}>{formErrors.phone}</small>}
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
            <option value="female">Mujer</option>
            <option value="male">Hombre</option>
            <option value="nonBinary">No binario</option>
            <option value="others">Otro/a</option>
          </select>
          {formErrors.gender && <small className={styles.errorMsg}>{formErrors.gender}</small>}
        </div>

        <div className={styles.field}>
          <label htmlFor={`${idForm}-work`}>Disponibilidad horaria</label>
          <select
            id={`${idForm}-work`}
            name="work_schedule"
            value={formData.work_schedule}
            onChange={handleChange}
            disabled={isLoadingEnums}
          >
            <option value="">Selecciona…</option>
            {enums.work_schedule.map(w => (
              <option key={w.name} value={w.name}>{w.name}</option>
            ))}
          </select>
          {formErrors.work_schedule && <small className={styles.errorMsg}>{formErrors.work_schedule}</small>}
        </div>

        {/* Extutelado */}
        <div className={styles.field}>
          <span className={styles.label}>¿Eres extutelado?</span>
          <label>
            <input type="radio" name="fostered" value="si"
              checked={formData.fostered === 'si'} onChange={handleChange} /> Sí
          </label>
          <label>
            <input type="radio" name="fostered" value="no"
              checked={formData.fostered === 'no'} onChange={handleChange} /> No
          </label>
        </div>

        {/* Discapacidad */}
        <div className={styles.field}>
          <span className={styles.label}>¿Tienes discapacidad?</span>
          <label>
            <input
              type="checkbox"
              name="hasDisability"
              checked={formData.hasDisability}
              onChange={handleChange}
            /> Sí
          </label>
          {/* Hidden para que viaje en el FormData como on/true */}
          <input type="hidden" name="hasDisability" value={boolToAttr(formData.hasDisability)} />
        </div>

        {formData.hasDisability && (
          <div className={styles.field}>
            <label htmlFor={`${idForm}-disability`}>Porcentaje (1–100)</label>
            <input
              id={`${idForm}-disability`}
              name="disability"
              type="number"
              min="1"
              max="100"
              value={formData.disability}
              onChange={handleChange}
            />
            {formErrors.disability && <small className={styles.errorMsg}>{formErrors.disability}</small>}
          </div>
        )}

        {/* MultiSelects (ahora con inputs ocultos para enviar arrays) */}
        <MultiSelectGrouped
          label="Puestos de interés"
          enums={enums.jobs}
          selected={formData.jobs}
          onAdd={addJob}
          onRemove={removeJob}
          disabled={isLoadingEnums}
        />
        {formErrors.jobs && <small className={styles.errorMsg}>{formErrors.jobs}</small>}
        {formData.jobs.map(v => <input key={`jobs-${v}`} type="hidden" name="jobs" value={v} />)}

        <MultiSelectFlat
          label="Lugares de interés"
          enums={enums.provinces}
          selected={formData.provinces}
          onAdd={addProv}
          onRemove={removeProv}
          disabled={isLoadingEnums}
        />
        {formErrors.provinces && <small className={styles.errorMsg}>{formErrors.provinces}</small>}
        {formData.provinces.map(v => (
          <input key={`provinces-${v}`} type="hidden" name="provinces" value={v} />
        ))}

        <MultiSelectGrouped
          label="Estudios realizados"
          enums={enums.studies}
          selected={formData.studies}
          onAdd={addStudy}
          onRemove={removeStudy}
          disabled={isLoadingEnums}
        />
        {formErrors.studies && <small className={styles.errorMsg}>{formErrors.studies}</small>}
        {formData.studies.map(v => <input key={`studies-${v}`} type="hidden" name="studies" value={v} />)}

        {/* Sobre mí */}
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor={`${idForm}-about`}>Sobre mí</label>
          <textarea
            id={`${idForm}-about`}
            name="about"
            value={formData.about}
            onChange={handleChange}
          />
        </div>

        {/* CV (PDF) */}
        <div className={`${styles.field} ${styles.full}`}>
          <label htmlFor={`${idForm}-file`}>Currículum (PDF)</label>
          <input
            id={`${idForm}-file`}
            name="file"
            type="file"
            accept="application/pdf"
            onChange={handleChange}
          />
          {formErrors.file && <small className={styles.errorMsg}>{formErrors.file}</small>}
        </div>

        {/* Términos */}
        <div className={`${styles.field} ${styles.full}`}>
          <label>
            <input
              type="checkbox"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
            /> *Aceptar términos y condiciones: &nbsp; <Link to="https://engloba.org.es/privacidad"> política de privacidad </Link>
          </label>
          {/* Hidden para que viaje al servidor */}
          <input type="hidden" name="terms" value={boolToAttr(formData.terms)} />
          <small> *Para cumplir con la normativa vigente en protección de datos
            de carácter personal, tal y como se indica en la correspondiente
            cláusula informativa, tu C.V. se mantendrá en nuestra base de datos
            durante un periodo de dos años a contar desde la fecha de entrega,
            pasado este tiempo se borrarán tus datos.</small>
          {formErrors.terms && <small className={styles.errorMsg}>{formErrors.terms}</small>}
        </div>

        {/* Acciones */}
        <div className={styles.actions}>
          <div className={styles.actionsCancel}>
            <button onClick={()=>navigate('/')}>Cancelar</button>
            <button type="reset">Limpiar</button>  
          </div>
          
          <button type="submit" disabled={isSubmitting}> {isSubmitting ? 'Enviando…' : 'Enviar'} </button>
        </div>
      </form>
    </div>

  );
}
