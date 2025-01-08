import { useState } from 'react';
import { FaTrashAlt, FaFileDownload } from "react-icons/fa";
import styles from '../styles/payrollsEmployer.module.css';
import DeleteConfirmation from './DeleteConfirmation.jsx';
import { AiOutlineSignature, AiFillSignature } from "react-icons/ai";
import stylesTooltip from '../styles/tooltip.module.css';

const PayrollItem = ({ payroll, stringMeses, deletePayroll, downloadPayroll }) => {
    const [wDelete, setWDelete] = useState(false);
    const name = `${payroll.payrollMonth}_${payroll.payrollYear}`
    return (
        <li className={styles.payrollItem}>
            <div className={styles.payrollmonth} onClick={() => downloadPayroll(payroll.pdf, name)}>
                <div>{stringMeses[payroll.payrollMonth - 1]}</div>
                <div>
                    <FaFileDownload className={styles.botonNomina} />
                </div>
            </div>
            <div className={styles.botonBorrar} onClick={() => setWDelete(true)}>
                <FaTrashAlt
                    className={styles.botonNomina}
                />
            </div>
            <div className={styles.firma}>
                {!!payroll.sign && payroll.sign.length > 0
                    ? <span className={stylesTooltip.tooltip}><AiFillSignature /><span className={stylesTooltip.tooltiptext}>Firmada</span></span>
                    : <span className={stylesTooltip.tooltip}><AiOutlineSignature /><span className={stylesTooltip.tooltiptext}>No firmada</span></span>
                }

            </div>

            {wDelete && (
                <DeleteConfirmation
                    onConfirm={() => deletePayroll(payroll._id, payroll.pdf)}
                    onCancel={() => setWDelete(false)}
                    payroll={payroll}
                    stringMeses={stringMeses}
                />
            )}
        </li>
    );
};

export default PayrollItem;
