// PayrollList.jsx
import { useMemo, useState, useEffect } from "react";
import styles from "../styles/payrollsEmployer.module.css";
import PayrollItem from "./PayrollItem.jsx";

const PayrollList = ({
  userId,
  payrolls = [],
  deletePayroll,
  downloadPayroll,
  listResponsability,
  signPayroll,
}) => {
  // Ordenamos nóminas por año/mes ascendente una sola vez
  const sortedPayrolls = useMemo(() => {
    if (!Array.isArray(payrolls)) return [];
    return [...payrolls].sort((a, b) => {
      const ay = a.payrollYear || 0;
      const by = b.payrollYear || 0;
      if (ay !== by) return ay - by;
      const am = a.payrollMonth || 0;
      const bm = b.payrollMonth || 0;
      return am - bm;
    });
  }, [payrolls]);

  // Última nómina (la más reciente)
  const latestPayroll = useMemo(() => {
    if (!sortedPayrolls.length) return null;
    return sortedPayrolls[sortedPayrolls.length - 1];
  }, [sortedPayrolls]);

  // Años disponibles
  const years = useMemo(() => {
    const set = new Set();
    for (const p of sortedPayrolls) {
      if (p.payrollYear) set.add(p.payrollYear);
    }
    return Array.from(set).sort((a, b) => b - a); // descendente
  }, [sortedPayrolls]);

  // Año seleccionado (por defecto, el de la última nómina)
  const [selectedYear, setSelectedYear] = useState(
    latestPayroll?.payrollYear || null
  );

  useEffect(() => {
    if (latestPayroll?.payrollYear) {
      setSelectedYear(latestPayroll.payrollYear);
    }
  }, [latestPayroll]);

  // Nóminas del año seleccionado, excluyendo la "última" (para no duplicarla)
  const payrollsForYear = useMemo(() => {
    if (!selectedYear) return [];
    return sortedPayrolls.filter(
      (p) =>
        p.payrollYear === selectedYear &&
        (!latestPayroll || String(p._id) !== String(latestPayroll._id))
    );
  }, [sortedPayrolls, selectedYear, latestPayroll]);

  if (!sortedPayrolls.length) {
    return <p>No hay nóminas registradas.</p>;
  }

  return (
    <div className={styles.lista_nominas}>
      {/* Bloque de "última nómina" arriba */}
      {latestPayroll && (
        <section className={styles.actualWrapper}>
          <h3 className={styles.actualTitle}>Última nómina</h3>
          <ul>
            <PayrollItem
              key={latestPayroll._id}
              payroll={latestPayroll}
              userId={userId}
              deletePayroll={deletePayroll}
              downloadPayroll={downloadPayroll}
              signPayroll={signPayroll}
              listResponsability={listResponsability}
              isLatest={true}
            />
          </ul>
        </section>
      )}

      {/* Selector de años */}
      {years.length > 1 && (
        <div className={styles.lista_botonesAnios}>
          {years.map((year) => (
            <button
              key={year}
              type="button"
              className={
                year === selectedYear
                  ? styles.botonesSeleccionado
                  : styles.botonesNoSeleccionado
              }
              onClick={() => setSelectedYear(year)}
            >
              {year}
            </button>
          ))}
        </div>
      )}

      {/* Lista de nóminas del año seleccionado */}
      <ul>
        {payrollsForYear.map((p) => (
          <PayrollItem
            key={p._id}
            payroll={p}
            userId={userId}
            deletePayroll={deletePayroll}
            downloadPayroll={downloadPayroll}
            signPayroll={signPayroll}
            listResponsability={listResponsability}
            isLatest={false}
          />
        ))}
      </ul>
    </div>
  );
};

export default PayrollList;
