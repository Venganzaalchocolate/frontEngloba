import { useEffect, useState, useMemo } from "react";
import styles from '../styles/infoUser.module.css';
import { formatESPhone } from "../../lib/utils";
import {
  FaIdCard,
  FaEnvelope,
  FaPhone,
  FaWheelchair,
  FaClock,
  FaGraduationCap,
  FaBriefcase,
  FaLocationDot,
  FaUserCheck,
} from "react-icons/fa6";

/**
 * Props:
 * - user: objeto UserCv con studiesId, jobsId, provincesId (arrays de ObjectId en string)
 * - enumsEmployer: { studiesIndex, jobsIndex, provincesIndex }
 */
const InfoUser = ({ user, enumsEmployer }) => {
  const [data, setData] = useState(null);

  // helpers de mapeo id -> name
  const idsToNames = (ids, idx) =>
    Array.isArray(ids)
      ? ids.map((id) => idx?.[id]?.name).filter(Boolean)
      : [];

  // memoizamos para no recalcular en cada render
  const mapped = useMemo(() => {
    if (!user) return { jobs: [], studies: [], provinces: [] };

    const jobs = idsToNames(user.jobsId, enumsEmployer?.jobsIndex);
    const studies = idsToNames(user.studiesId, enumsEmployer?.studiesIndex);
    const provinces = idsToNames(user.provincesId, enumsEmployer?.provincesIndex);

    return { jobs, studies, provinces };
  }, [user, enumsEmployer]);

  useEffect(() => {
    if (!user) return;
    setData({
      ...user,
      fostered: user.fostered ? "sí" : "no",
      work_schedule: Array.isArray(user.work_schedule) ? user.work_schedule[0] : user.work_schedule || null,
      disability: user.disability ?? 0,
    });
  }, [user]);

  if (!data) return null;

  // pintar chips con texto
  const renderChips = (arr) =>
    Array.isArray(arr) && arr.length
      ? arr.map((item, i) => (
          <span key={i} className={styles.chip}>
            {item}
          </span>
        ))
      : "—";

  return (
    <div className={styles.card}>
      <h3 className={styles.header}>
        {data.firstName} {data.lastName}
      </h3>

      <div className={styles.row}>
        <span className={styles.icon} aria-label="DNI" title="DNI"><FaIdCard /></span>
        <span className={styles.value}>{data.dni || "—"}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.icon} aria-label="Email" title="Email"><FaEnvelope /></span>
        <span className={styles.value}>{data.email || "—"}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.icon} aria-label="Teléfono" title="Teléfono"><FaPhone /></span>
        <span className={styles.value}>{formatESPhone(data.phone) || "—"}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.icon} aria-label="Discapacidad" title="Discapacidad"><FaWheelchair /></span>
        <span className={styles.value}>{data.disability}%</span>
      </div>

      <div className={styles.row}>
        <span className={styles.icon} aria-label="Extutelado" title="Extutelado"><FaUserCheck /></span>
        <span className={styles.value}>{data.fostered}</span>
      </div>

      {data.work_schedule && (
        <div className={styles.row}>
          <span className={styles.icon} aria-label="Horario" title="Horario"><FaClock /></span>
          <span className={styles.value}>{data.work_schedule}</span>
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.icon} aria-label="Estudios" title="Estudios"><FaGraduationCap /></span>
        <span className={styles.valueFlex}>{renderChips(mapped.studies)}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.icon} aria-label="Puestos" title="Puestos"><FaBriefcase /></span>
        <span className={styles.valueFlex}>{renderChips(mapped.jobs)}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.icon} aria-label="Provincias" title="Provincias"><FaLocationDot /></span>
        <span className={styles.valueFlex}>{renderChips(mapped.provinces)}</span>
      </div>
    </div>
  );
};

export default InfoUser;
