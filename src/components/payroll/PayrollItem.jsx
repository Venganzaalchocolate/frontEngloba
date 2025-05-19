import { useState } from 'react';
import { FaTrashAlt, FaFileDownload } from "react-icons/fa";
import styles from '../styles/payrollsEmployer.module.css';
import { AiOutlineSignature, AiFillSignature } from "react-icons/ai";
import stylesTooltip from '../styles/tooltip.module.css';
import { FaCloudUploadAlt } from "react-icons/fa";
import { useLogin } from '../../hooks/useLogin.jsx';
import { obtenerNombreMes } from '../../lib/utils.js';
import ModalConfirmation from '../globals/ModalConfirmation.jsx';

const PayrollItem = ({ payroll, stringMeses, deletePayroll, downloadPayroll, signPayroll, userId }) => {
    const { logged } = useLogin();
    const [wDelete, setWDelete] = useState(false);
    const name = `${payroll.payrollMonth}_${payroll.payrollYear}`


    const onConfirm = () => {
        deletePayroll(payroll._id)
        setWDelete(false);
    };

    const onCancel = () => {
        setWDelete(false);
    };

    const modalConfirmation = () => {
        const title = `Eliminar nómina`;
        const messageAux = `¿Estás seguro de que deseas eliminar la nómina del mes ${obtenerNombreMes(payroll.payrollMonth)} y año ${payroll.payrollYear}?`;
        return (
            <ModalConfirmation
                title={title}
                message={messageAux}
                onConfirm={onConfirm}
                onCancel={onCancel}
            />
        );
    };

    return (
        <li className={styles.payrollItem}>
            <div className={styles.payrollmonth} onClick={() => downloadPayroll(payroll.pdf, name)}>
                <div>{stringMeses[payroll.payrollMonth - 1]}</div>
                <div>
                    <FaFileDownload className={styles.botonNomina} />
                </div>
            </div>




            {userId == logged.user._id && !payroll.sign &&
                <button className={styles.botonSubir} onClick={() => signPayroll(payroll)}>
                    Firmar Nómina
                    <FaCloudUploadAlt
                        className={styles.botonNomina}
                    />
                </button>
            }

            <div className={styles.firma}>
                {!!payroll.sign && payroll.sign.length > 0
                    ? <span className={stylesTooltip.tooltip}><AiFillSignature className={styles.dowSig} onClick={() => downloadPayroll(payroll.sign, name)} /><span className={stylesTooltip.tooltiptext}>Firmada</span></span>
                    : <span className={stylesTooltip.tooltip}><AiOutlineSignature /><span className={stylesTooltip.tooltiptext}>No firmada</span></span>
                }

            </div>

            {(logged.user.role == 'root' || logged.user.role == 'global') &&
                <div className={styles.botonBorrar} onClick={() => setWDelete(true)}>
                    <FaTrashAlt
                        className={styles.botonNomina}
                    />
                </div>}

            {wDelete && (
                modalConfirmation()
            )}

        </li>
    );
};
//
export default PayrollItem;
