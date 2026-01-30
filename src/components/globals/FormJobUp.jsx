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
import { getData, offerId, sendFormCv } from '../../lib/data';
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
import { Link, useNavigate, useParams } from 'react-router';
import logoUrl from '/graphic/logotipo.png';
import ModalForm from './ModalForm';
import { buildOptionsFromIndex } from '../../lib/utils';

export default function FormJobUp({
  modal,
  charge,
  user,
  changeUser,
  closeModalEdit = () => {},
}) {
  const fileInputRef = useRef(null);
  const { id } = useParams();
  const idForm = useId();
  const [isLoadingEnums, startEnums] = useTransition();
  const [enums, setEnums] = useState({
    work_schedule: [],
    studies: [],
    jobs: [],
    provinces: [],
  });
  const [offerInfo, setOffer] = useState(null);
  const navigate = useNavigate();

  // ===== Helpers =====
  const flattenCats = useCallback((arr) => {
    if (!Array.isArray(arr)) return [];
    const out = [];
    for (const x of arr) {
      if (Array.isArray(x?.subcategories) && x.subcategories.length) {
        out.push(...x.subcategories);
      } else {
        out.push(x);
      }
    }
    return out;
  }, []);

  const provincesFlat = useMemo(
    () => flattenCats(enums.provinces),
    [enums.provinces, flattenCats]
  );

  // ===== State (modo CREATE público) =====
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    dni: user?.dni || '',
    email: user?.email || '',
    phone: user?.phone || '',
    gender: user?.gender || '',
    work_schedule: Array.isArray(user?.work_schedule)
      ? user.work_schedule[0] || ''
      : '',
    fostered: user?.fostered ? 'si' : 'no',
    hasDisability: (user?.disability || 0) > 0,
    disability: user?.disability || '',
    about: user?.about || '',
    // IDs
    jobsId: Array.isArray(user?.jobsId) ? user.jobsId : [],
    provincesId: Array.isArray(user?.provincesId) ? user.provincesId : [],
    studiesId: Array.isArray(user?.studiesId) ? user.studiesId : [],
    terms: !!user,
    file: null,
  });

  const [formErrors, setFormErrors] = useState({});
  const initialFormRef = useRef(formData);

  const handleReset = useCallback(() => {
    setFormData(initialFormRef.current);
    setFormErrors({});
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  const removeSelectedFile = useCallback(() => {
    setFormData((fd) => ({ ...fd, file: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, []);

  // ===== Validación =====
  const requiredFields = useMemo(
    () =>
      new Set([
        'firstName',
        'lastName',
        'dni',
        'email',
        'phone',
        'gender',
        'work_schedule',
        'terms',
        'studiesId',
        'jobsId',
        'provincesId',
        'file',
      ]),
    []
  );

  const checks = useMemo(
    () => ({
      firstName: (v) => validText(v, 3, 100),
      lastName: (v) => validText(v, 3, 100),
      dni: (v) => validateDNIorNIE(v),
      email: (v) => validEmail(v),
      phone: (v) => validNumber(v),
      gender: (v) => ['male', 'female', 'others', 'nonBinary'].includes(v),
      work_schedule: (v) => !!v,
      terms: (v) => !!v,
      disability: (v) =>
        !formData.hasDisability || validNumberPercentage(String(v)),
      studiesId: (arr) => Array.isArray(arr) && arr.length > 0,
      jobsId: (arr) => Array.isArray(arr) && arr.length > 0,
      provincesId: (arr) => Array.isArray(arr) && arr.length > 0,
      file: (f) => {
        if (!(f instanceof File)) return false;
        const mime = (f.type || '').toLowerCase();
        const name = (f.name || '').toLowerCase();
        return mime.includes('pdf') || name.endsWith('.pdf');
      },
    }),
    [formData.hasDisability]
  );

  const isEmpty = (name, value) => {
    if (!requiredFields.has(name)) return false;
    if (Array.isArray(value)) return value.length === 0;
    if (typeof value === 'boolean') return value === false;
    return value == null || String(value).trim() === '';
  };

  const validateField = useCallback(
    (name, value) => {
      if (isEmpty(name, value)) return textErrors('vacio') || 'Requerido';
      if (checks[name] && !checks[name](value))
        return textErrors(name) || 'Campo inválido';
      return null;
    },
    [checks]
  );

  const validateAll = useCallback(
    (data) => {
      const errs = {};
      for (const key of Object.keys(checks)) {
        const msg = validateField(key, data[key]);
        if (msg) errs[key] = msg;
      }
      return errs;
    },
    [checks, validateField]
  );

  // ===== Enums & oferta pública =====
  useEffect(() => {
    startEnums(async () => {
      charge(true);
      try {
        const res = await getData();
        if (!res.error) setEnums(res);

        if (id) {
          const offerJob = await offerId({ offerId: id, isPublic: true });
          if (offerJob?.error) {
            modal(
              'Error',
              'Oferta no disponible, por favor inténtelo más tarde'
            );
            navigate('/trabajaconnosotros');
          } else {
            const nameJob =
              (res?.jobs ?? [])
                .flatMap((j) => j.subcategories ?? [])
                .find((sc) => String(sc._id) === String(offerJob.jobId))
                ?.name ?? '';
            offerJob.nameOffer = `${nameJob} - ${
              offerJob?.location?.toUpperCase() || ''
            }`;
            setOffer(offerJob);
          }
        }
      } finally {
        charge(false);
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ===== Handlers (CREATE) =====
  const handleChange = useCallback(
    (e) => {
      const { name, type, value, checked, files } = e.target;
      const val =
        type === 'checkbox'
          ? checked
          : type === 'file'
          ? files?.[0] ?? null
          : value;

      setFormData((fd) => ({ ...fd, [name]: val }));
      if (checks[name]) {
        setFormErrors((fe) => ({ ...fe, [name]: validateField(name, val) }));
      }
    },
    [checks, validateField]
  );

  const handleArrayChange = useCallback(
    (key, nextArr) => {
      setFormData((fd) => ({ ...fd, [key]: nextArr }));
      if (checks[key]) {
        setFormErrors((fe) => ({ ...fe, [key]: validateField(key, nextArr) }));
      }
    },
    [checks, validateField]
  );

  const addJob = useCallback(
    (v) =>
      handleArrayChange('jobsId', [
        ...new Set([...(formData.jobsId || []), v]),
      ]),
    [formData.jobsId, handleArrayChange]
  );
  const removeJob = useCallback(
    (v) =>
      handleArrayChange(
        'jobsId',
        (formData.jobsId || []).filter((x) => x !== v)
      ),
    [formData.jobsId, handleArrayChange]
  );

  const addStudy = useCallback(
    (v) =>
      handleArrayChange('studiesId', [
        ...new Set([...(formData.studiesId || []), v]),
      ]),
    [formData.studiesId, handleArrayChange]
  );
  const removeStudy = useCallback(
    (v) =>
      handleArrayChange(
        'studiesId',
        (formData.studiesId || []).filter((x) => x !== v)
      ),
    [formData.studiesId, handleArrayChange]
  );

  const addProv = useCallback(
    (v) =>
      handleArrayChange('provincesId', [
        ...new Set([...(formData.provincesId || []), v]),
      ]),
    [formData.provincesId, handleArrayChange]
  );
  const removeProv = useCallback(
    (v) =>
      handleArrayChange(
        'provincesId',
        (formData.provincesId || []).filter((x) => x !== v)
      ),
    [formData.provincesId, handleArrayChange]
  );

  // ===== Submit (React 19) — MODO CREATE =====
  const initialSubmit = { ok: false, serverError: null };

  const [submitState, formAction, isSubmitting] = useActionState(
    async (_prevState, fd) => {
      // Solo se usa en CREATE (cuando user es null)
      const ws = fd.get('work_schedule') ?? '';
      const values = {
        firstName: fd.get('firstName') ?? '',
        lastName: fd.get('lastName') ?? '',
        dni: fd.get('dni')?.toUpperCase() ?? '',
        email: fd.get('email') ?? '',
        phone: fd.get('phone') ?? '',
        gender: fd.get('gender') ?? '',
        work_schedule: ws ? [ws] : [],
        fostered: fd.get('fostered') ?? 'no',
        about: fd.get('about') ?? '',
        terms:
          fd.get('terms') === 'true' ||
          fd.get('terms') === 'on' ||
          fd.get('terms') === 'ON',
        jobsId: fd.getAll('jobsId'),
        provincesId: fd.getAll('provincesId'),
        studiesId: fd.getAll('studiesId'),
        user: user?._id || '',
        file: fd.get('file') ?? null,
        disability:
          fd.get('hasDisability') === 'true' ||
          fd.get('hasDisability') === 'on'
            ? fd.get('disability')
            : 0,
        offer: offerInfo?._id || '',
      };

      const errs = validateAll(values);
      if (Object.keys(errs).length > 0) {
        setFormErrors(errs);
        return { ok: false, serverError: null };
      }

      // ✅ Control previo: oferta exclusiva discapacidad
if (offerInfo?.disability === true) {
  const d = Number(values.disability || 0);
  if (!(d > 0)) {
    modal(
      'Oferta exclusiva',
      'No puedes enviar el CV a esta oferta porque es exclusiva para personas con discapacidad. Para inscribirte, debes indicar una discapacidad superior a 0%.'
    );
    // opcional: marcar error en el campo para que se vea en el formulario
    setFormErrors((fe) => ({
      ...fe,
      disability:
        'Esta oferta es exclusiva: debes indicar una discapacidad > 0%',
    }));
    return { ok: false, serverError: null };
  }
}


      const fileToSend = values.file;
      delete values.file;

      charge(true);
      try {
        const res =
          user == null
            ? await sendFormCv(values, fileToSend)
            : await sendFormCv(values, fileToSend, true);

        if (res?.error) {
          modal('Error', res.message || 'No se pudo enviar el CV');
          return { ok: false, serverError: res.message || 'Error' };
        }
        modal(
          'CV enviado',
          user ? 'Modificado con éxito' : 'Enviado con éxito'
        );
        changeUser?.(res);
        setFormErrors({});
        navigate('/');
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

  const boolToAttr = (v) => (v ? 'on' : '');

  // =========================================================
  // ======================= MODO EDIT =======================
  // =========================================================
  if (user) {
    // Helpers para arrays (comparación sin importar orden)
    const areArraysEqual = (a, b) => {
      const aa = (a || []).map(String).sort();
      const bb = (b || []).map(String).sort();
      if (aa.length !== bb.length) return false;
      for (let i = 0; i < aa.length; i++) {
        if (aa[i] !== bb[i]) return false;
      }
      return true;
    };

    // Opciones desde enumsIndex
    const studiesOptions =
      buildOptionsFromIndex(enums?.studiesIndex, { onlySub: true }) ||
      buildOptionsFromIndex(enums?.studiesIndex);

    const positionOptions =
      buildOptionsFromIndex(enums?.jobsIndex, { onlySub: true }) ||
      buildOptionsFromIndex(enums?.jobsIndex);

    let provincesOptions =
      buildOptionsFromIndex(enums?.provincesIndex, { onlySub: false }) ||
      buildOptionsFromIndex(enums?.provincesIndex);

    // Filtramos Ceuta/Melilla si no interesan
    provincesOptions = provincesOptions.filter(
      (x) =>
        x._id !== '66a7369b08bebc63c0f89a05' &&
        x._id !== '66a7366208bebc63c0f8992d'
    );

    const fields = [
      { type: 'section', label: 'Datos personales' },
      {
        label: 'Nombre',
        name: 'firstName',
        type: 'text',
        required: true,
        defaultValue: user.firstName,
      },
      {
        label: 'Apellidos',
        name: 'lastName',
        type: 'text',
        required: true,
        defaultValue: user.lastName,
      },
      {
        label: 'DNI/NIE',
        name: 'dni',
        type: 'text',
        required: true,
        defaultValue: user.dni,
      },
      {
        label: 'Email',
        name: 'email',
        type: 'email',
        required: true,
        defaultValue: user.email,
      },
      {
        label: 'Teléfono',
        name: 'phone',
        type: 'text',
        required: true,
        defaultValue: user.phone,
      },
      {
        label: 'Género',
        name: 'gender',
        type: 'select',
        required: true,
        defaultValue: user.gender,
        options: [
          { value: 'female', label: 'Mujer' },
          { value: 'male', label: 'Hombre' },
          { value: 'nonBinary', label: 'No binario' },
          { value: 'others', label: 'Otro/a' },
        ],
      },
      {
        label: 'Disponibilidad horaria',
        name: 'work_schedule',
        type: 'select',
        required: true,
        defaultValue: Array.isArray(user.work_schedule)
          ? user.work_schedule[0]
          : '',
        options: (enums.work_schedule || []).map((w) => ({
          value: w.name,
          label: w.name,
        })),
      },
      { type: 'section', label: 'Situación personal' },
      {
        label: '¿Eres extutelado?',
        name: 'fostered',
        type: 'select',
        required: true,
        defaultValue: user.fostered ? 'si' : 'no',
        options: [
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
        ],
      },
      {
        label: '¿Tienes discapacidad?',
        name: 'hasDisability',
        type: 'select',
        required: true,
        defaultValue: user.disability > 0 ? 'si' : 'no',
        options: [
          { value: 'si', label: 'Sí' },
          { value: 'no', label: 'No' },
        ],
      },
      ...(user.disability > 0
        ? [
            {
              label: 'Porcentaje discapacidad (1-100)',
              name: 'disability',
              type: 'number',
              required: true,
              defaultValue: user.disability,
            },
          ]
        : []),
      { type: 'section', label: 'Puestos, estudios y zonas' },
      {
        name: 'jobsId',
        label: 'Puestos de interés',
        type: 'multiChips',
        required: true,
        defaultValue: user?.jobsId || [],
        options: [
          ...positionOptions,
        ],
        placeholder:
          'Busca y añade 1 o varias opciones (puedes pulsar enter o hacer click)',
      },
      {
        name: 'studiesId',
        label: 'Estudios Realizados',
        type: 'multiChips',
        required: true,
        defaultValue: user?.studiesId || [],
        options: [
          ...studiesOptions,
        ],
        placeholder:
          'Busca y añade 1 o varias opciones (puedes pulsar enter o hacer click)',
      },
      {
        name: 'provincesId',
        label: 'Provincias de interés',
        type: 'multiChips',
        required: true,
        defaultValue: user?.provincesId || [],
        options: [
          ...provincesOptions,
        ],
        placeholder:
          'Busca y añade 1 o varias opciones (puedes pulsar enter o hacer click)',
      },
      { type: 'section', label: 'Otros datos' },
      {
        label: 'Sobre mí',
        name: 'about',
        type: 'textarea',
        required: false,
        defaultValue: user.about || '',
      },
      {
        label: 'Currículum (PDF)',
        name: 'file',
        type: 'file',
      },
    ];

    const handleModalSubmit = async (formValues) => {
      // Construimos payload solo con cambios respecto a `user`
      const payload = { _id: user._id };
      const fileToUpload = formValues.file instanceof File ? formValues.file : null;

      // firstName
      if (
        typeof formValues.firstName === 'string' &&
        formValues.firstName.trim() !== user.firstName
      ) {
        payload.firstName = formValues.firstName.trim();
      }

      // lastName
      if (
        typeof formValues.lastName === 'string' &&
        formValues.lastName.trim() !== user.lastName
      ) {
        payload.lastName = formValues.lastName.trim();
      }

      // dni
      if (typeof formValues.dni === 'string') {
        const newDni = formValues.dni.trim().toUpperCase();
        if (newDni && newDni !== user.dni) {
          payload.dni = newDni;
        }
      }

      // email
      if (
        typeof formValues.email === 'string' &&
        formValues.email.trim() !== (user.email || '')
      ) {
        payload.email = formValues.email.trim();
      }

      // phone
      if (
        typeof formValues.phone === 'string' &&
        formValues.phone.trim() !== (user.phone || '')
      ) {
        payload.phone = formValues.phone.trim();
      }

      // gender
      if (
        typeof formValues.gender === 'string' &&
        formValues.gender !== user.gender
      ) {
        payload.gender = formValues.gender;
      }

      // work_schedule (array con un solo valor)
      if (typeof formValues.work_schedule === 'string') {
        const newWS = formValues.work_schedule
          ? [formValues.work_schedule]
          : [];
        const oldWS = Array.isArray(user.work_schedule)
          ? user.work_schedule
          : [];
        if (!areArraysEqual(oldWS, newWS)) {
          payload.work_schedule = newWS;
        }
      }

      // fostered
      if (typeof formValues.fostered === 'string') {
        const newFostered = formValues.fostered === 'si';
        if (newFostered !== !!user.fostered) {
          payload.fostered = newFostered;
        }
      }

      // disability
      const hasDisability =
        formValues.hasDisability === 'si' ||
        formValues.hasDisability === true;
      const newDisability = hasDisability
        ? Number(formValues.disability || 0)
        : 0;
      const oldDisability = Number(user.disability || 0);
      if (!Number.isNaN(newDisability) && newDisability !== oldDisability) {
        payload.disability = newDisability;
      }

      // jobsId
      if (Array.isArray(formValues.jobsId)) {
        const oldJobs = Array.isArray(user.jobsId) ? user.jobsId : [];
        if (!areArraysEqual(oldJobs, formValues.jobsId)) {
          payload.jobsId = formValues.jobsId;
        }
      }

      // studiesId
      if (Array.isArray(formValues.studiesId)) {
        const oldStudies = Array.isArray(user.studiesId) ? user.studiesId : [];
        if (!areArraysEqual(oldStudies, formValues.studiesId)) {
          payload.studiesId = formValues.studiesId;
        }
      }

      // provincesId
      if (Array.isArray(formValues.provincesId)) {
        const oldProv = Array.isArray(user.provincesId)
          ? user.provincesId
          : [];
        if (!areArraysEqual(oldProv, formValues.provincesId)) {
          payload.provincesId = formValues.provincesId;
        }
      }

      // about
      if (typeof formValues.about === 'string') {
        const newAbout = formValues.about.trim();
        const oldAbout = (user.about || '').trim();
        if (newAbout !== oldAbout) {
          payload.about = newAbout;
        }
      }

      // Si no hay cambios y no hay archivo nuevo, no llamamos al back
      const keysToUpdate = Object.keys(payload).filter((k) => k !== '_id');
      if (keysToUpdate.length === 0 && !fileToUpload) {
        modal('Sin cambios', 'No has modificado ningún dato del CV.');
        return;
      }

      try {
        charge(true);
        const res = await sendFormCv(payload, fileToUpload || null, true);
        if (res?.error) {
          modal('Error', res.message || 'No se pudo actualizar el CV');
          return;
        }
        modal(
          'CV actualizado',
          'Los datos del usuario se han modificado con éxito.'
        );
        changeUser?.(res);
      } catch (err) {
        modal('Error', err.message || 'Error inesperado');
      } finally {
        charge(false);
      }
    };

    return (
      <ModalForm
        title="Actualizar Currículum"
        message="Revisa o modifica tus datos antes de enviar."
        fields={fields}
        onSubmit={handleModalSubmit}
        onClose={() => closeModalEdit()}
        modal={modal}
      />
    );
  }

  // =========================================================
  // ======================= MODO CREATE =====================
  // =========================================================

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
        <h2>ENVÍANOS TU CURRÍCULUM</h2>
      </div>

      {offerInfo && (
        <div className={styles.offerJob}>
          <p className={styles.tituloOferta}>Inscripción en la oferta: </p>
          <p className={styles.nameOffer}>{offerInfo.nameOffer}</p>
        </div>
      )}

      <form className={styles.formJob} action={formAction} onReset={handleReset}>
        {/* Datos básicos */}
        <div className={styles.field}>
          <label htmlFor={`${idForm}-firstName`}>Nombre</label>
          <input
            id={`${idForm}-firstName`}
            name="firstName"
            value={formData.firstName}
            onChange={handleChange}
            placeholder="Tu nombre"
          />
          {formErrors.firstName && (
            <small className={styles.errorMsg}>{formErrors.firstName}</small>
          )}
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
          {formErrors.lastName && (
            <small className={styles.errorMsg}>{formErrors.lastName}</small>
          )}
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
          {formErrors.dni && (
            <small className={styles.errorMsg}>{formErrors.dni}</small>
          )}
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
          {formErrors.email && (
            <small className={styles.errorMsg}>{formErrors.email}</small>
          )}
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
          {formErrors.phone && (
            <small className={styles.errorMsg}>{formErrors.phone}</small>
          )}
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
          {formErrors.gender && (
            <small className={styles.errorMsg}>{formErrors.gender}</small>
          )}
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
            {enums.work_schedule.map((w) => (
              <option key={w.name} value={w.name}>
                {w.name}
              </option>
            ))}
          </select>
          {formErrors.work_schedule && (
            <small className={styles.errorMsg}>
              {formErrors.work_schedule}
            </small>
          )}
        </div>

        {/* Extutelado */}
        <div className={styles.field}>
          <span className={styles.label}>¿Eres extutelado?</span>
          <label>
            <input
              type="radio"
              name="fostered"
              value="si"
              checked={formData.fostered === 'si'}
              onChange={handleChange}
            />{' '}
            Sí
          </label>
          <label>
            <input
              type="radio"
              name="fostered"
              value="no"
              checked={formData.fostered === 'no'}
              onChange={handleChange}
            />{' '}
            No
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
            />{' '}
            Sí
          </label>
          <input
            type="hidden"
            name="hasDisability"
            value={boolToAttr(formData.hasDisability)}
          />
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
            {formErrors.disability && (
              <small className={styles.errorMsg}>
                {formErrors.disability}
              </small>
            )}
          </div>
        )}

        {/* MultiSelects: IDs */}
        <MultiSelectGrouped
          label="Puestos de interés"
          enums={enums.jobs}
          selected={formData.jobsId}
          onAdd={addJob}
          onRemove={removeJob}
          disabled={isLoadingEnums}
        />
        {formErrors.jobsId && (
          <small className={styles.errorMsg}>{formErrors.jobsId}</small>
        )}
        {formData.jobsId.map((v) => (
          <input key={`jobsId-${v}`} type="hidden" name="jobsId" value={v} />
        ))}

        <MultiSelectFlat
          label="Lugares de interés"
          enums={provincesFlat}
          selected={formData.provincesId}
          onAdd={addProv}
          onRemove={removeProv}
          disabled={isLoadingEnums}
        />
        {formErrors.provincesId && (
          <small className={styles.errorMsg}>{formErrors.provincesId}</small>
        )}
        {formData.provincesId.map((v) => (
          <input
            key={`provincesId-${v}`}
            type="hidden"
            name="provincesId"
            value={v}
          />
        ))}

        <MultiSelectGrouped
          label="Estudios realizados"
          enums={enums.studies}
          selected={formData.studiesId}
          onAdd={addStudy}
          onRemove={removeStudy}
          disabled={isLoadingEnums}
        />
        {formErrors.studiesId && (
          <small className={styles.errorMsg}>{formErrors.studiesId}</small>
        )}
        {formData.studiesId.map((v) => (
          <input
            key={`studiesId-${v}`}
            type="hidden"
            name="studiesId"
            value={v}
          />
        ))}

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
            ref={fileInputRef}
          />
          {formErrors.file && (
            <small className={styles.errorMsg}>{formErrors.file}</small>
          )}
        </div>

        {/* Términos */}
        <div className={`${styles.field} ${styles.full}`}>
          {formData.file ? (
            <div className={styles.fileInfo} aria-live="polite">
              <span>
                <strong>Seleccionado:</strong> {formData.file.name}
              </span>
              <span>
                &nbsp;·{' '}
                {(formData.file.size / (1024 * 1024)).toFixed(2)} MB
              </span>
              <button
                type="button"
                className={styles.linkButton}
                onClick={removeSelectedFile}
              >
                Quitar
              </button>
            </div>
          ) : (
            <small className={styles.muted}>
              Ningún archivo seleccionado
            </small>
          )}

          <label>
            <input
              type="checkbox"
              name="terms"
              checked={formData.terms}
              onChange={handleChange}
            />{' '}
            *Aceptar términos y condiciones:&nbsp;
            <Link to="https://engloba.org.es/privacidad">
              {' '}
              política de privacidad{' '}
            </Link>
          </label>
          <input
            type="hidden"
            name="terms"
            value={boolToAttr(formData.terms)}
          />

          <small>
            *Para cumplir con la normativa vigente en protección de datos de
            carácter personal, tal y como se indica en la correspondiente
            cláusula informativa, tu C.V. se mantendrá en nuestra base de datos
            durante un periodo de dos años a contar desde la fecha de entrega,
            pasado este tiempo se borrarán tus datos.
          </small>
          {formErrors.terms && (
            <small className={styles.errorMsg}>{formErrors.terms}</small>
          )}
        </div>

        {/* Acciones */}
        <div className={styles.actions}>
          <div className={styles.actionsCancel}>
            <button onClick={() => navigate('/')}>Cancelar</button>
            <button type="reset">Limpiar</button>
          </div>

          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enviando…' : 'Enviar'}
          </button>
        </div>
      </form>
    </div>
  );
}
