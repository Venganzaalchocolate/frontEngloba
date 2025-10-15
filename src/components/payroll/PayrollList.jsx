import { useState } from 'react';
import PayrollItem from './PayrollItem.jsx';
import styles from '../styles/payrollsEmployer.module.css';

const PayrollList = ({ payrolls, deletePayroll, downloadPayroll, listResponsability, signPayroll, userId }) => {
    const [selectedYear, setSelectedYear] = useState(null);

    const stringMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const uniqueYears = [...new Set(payrolls.map(payroll => payroll.payrollYear))];

    const filteredPayrolls = selectedYear
        ? payrolls.filter(payroll => payroll.payrollYear === selectedYear)
        : [];

    if (payrolls.length === 0) return <p>No hay nóminas disponibles</p>;

    // Mes anterior al actual (JS meses 0–11)
    const now = new Date();
    const currM = now.getMonth();        // 0..11
    const currY = now.getFullYear();
    const prevMIdx = (currM + 11) % 12;  // índice del mes anterior
    const targetYear = currM === 0 ? currY - 1 : currY;
    const targetMonth = prevMIdx + 1;    // 1..12

    // Nómina "actual" = la del mes anterior
    let currentPayroll = payrolls.find(
        p => p.payrollYear === targetYear && p.payrollMonth === targetMonth
    );

    // Fallback: si no existe, usa la más reciente disponible
    const latestPayroll = payrolls.reduce((acc, p) => {
        if (!acc) return p;
        if (p.payrollYear > acc.payrollYear) return p;
        if (p.payrollYear === acc.payrollYear && p.payrollMonth > acc.payrollMonth) return p;
        return acc;
    }, null);

    if (!currentPayroll) currentPayroll = latestPayroll;


    return (
        <div className={styles.lista_nominas}>
            {(currentPayroll) ? (
                <div className={styles.actualWrapper}>
                    <h3 className={styles.actualTitle}>
                        Última Nómina · {stringMeses[currentPayroll.payrollMonth - 1]} {currentPayroll.payrollYear}
                    </h3>
                    <ul>
                        <PayrollItem
                            key={currentPayroll._id}
                            payroll={currentPayroll}
                            stringMeses={stringMeses}
                            deletePayroll={deletePayroll}
                            downloadPayroll={downloadPayroll}
                            listResponsability={listResponsability}
                            signPayroll={signPayroll}
                            userId={userId}
                        />
                    </ul>
                </div>
            ) : <p>No hay nómina del mes actual</p>}
            <h3>Histórico</h3>
            <div className={styles.lista_botonesAnios}>
                {uniqueYears.map(year => (
                    <button
                        key={year}
                        onClick={() => (year === selectedYear) ? setSelectedYear(null) : setSelectedYear(year)}
                        aria-pressed={selectedYear === year}
                        className={selectedYear === year ? styles.botonesSeleccionado : styles.botonesNoSeleccionado}
                    >
                        {year}
                    </button>
                ))}
            </div>

            {selectedYear && (
                <ul>
                    {filteredPayrolls.map(payroll => (
                        <PayrollItem
                            key={payroll._id}
                            payroll={payroll}
                            stringMeses={stringMeses}
                            deletePayroll={deletePayroll}
                            downloadPayroll={downloadPayroll}
                            listResponsability={listResponsability}
                            signPayroll={signPayroll}
                            userId={userId}
                        />
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PayrollList;
