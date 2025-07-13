import { useState, useEffect } from "react";
import styles from '../styles/infoUser.module.css';

const InfoUser = ({ user }) => {
  const [data, setData] = useState(null);

  useEffect(() => {
    if (!user) return;
    setData({
      ...user,
      fostered: user.fostered ? "sí" : "no",
      work_schedule: user.work_schedule?.[0] ?? null,
      disability: user.disability ?? 0,
    });
  }, [user]);

  if (!data) return null; // mientras carga

  // helper para pintar chips
  const renderChips = (arr) =>
    arr.length ? (
      arr.map((item, i) => (
        <span key={i} className={styles.chip}>
          {item}
        </span>
      ))
    ) : (
      "—"
    );

  return (
    <div className={styles.card}>
      <h3 className={styles.header}>
        {data.firstName} {data.lastName}
      </h3>

      <div className={styles.row}>
        <span className={styles.label}>DNI:</span>
        <span className={styles.value}>{data.dni || "—"}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Email:</span>
        <span className={styles.value}>{data.email}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Tel.:</span>
        <span className={styles.value}>{data.phone}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Discapacidad:</span>
        <span className={styles.value}>{data.disability}%</span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Extutelado:</span>
        <span className={styles.value}>{data.fostered}</span>
      </div>

      {data.work_schedule && (
        <div className={styles.row}>
          <span className={styles.label}>Horario:</span>
          <span className={styles.value}>{data.work_schedule}</span>
        </div>
      )}

      <div className={styles.row}>
        <span className={styles.label}>Estudios:</span>
        <span className={styles.valueFlex}>{renderChips(data.studies)}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Puestos:</span>
        <span className={styles.valueFlex}>{renderChips(data.jobs)}</span>
      </div>

      <div className={styles.row}>
        <span className={styles.label}>Provincias:</span>
        <span className={styles.valueFlex}>{renderChips(data.provinces)}</span>
      </div>
    </div>
  );
};

export default InfoUser;
