import { useState } from 'react';
import PayrollItem from './PayrollItem.jsx';
import styles from '../styles/payrollsEmployer.module.css';

const PayrollList = ({ payrolls, deletePayroll, downloadPayroll }) => {
    const [selectedYear, setSelectedYear] = useState(null);

    const stringMeses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const uniqueYears = [...new Set(payrolls.map(payroll => payroll.payrollYear))];

    const filteredPayrolls = selectedYear
        ? payrolls.filter(payroll => payroll.payrollYear === selectedYear)
        : [];

    if (payrolls.length === 0) return <p>No hay nóminas disponibles</p>;

    return (
        <div className={styles.lista_nominas}>
            <div className={styles.lista_botonesAnios}>
                {uniqueYears.map(year => (
                    <button
                        key={year}
                        onClick={() => setSelectedYear(year)}
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
                        />
                    ))}
                </ul>
            )}
        </div>
    );
};

export default PayrollList;
