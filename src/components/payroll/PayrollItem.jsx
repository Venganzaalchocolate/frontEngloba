// PayrollItem.jsx
import { useState } from "react";
import { FaTrashAlt, FaFileDownload } from "react-icons/fa";
import { AiOutlineSignature, AiFillSignature } from "react-icons/ai";
import { FaCloudUploadAlt } from "react-icons/fa";
import styles from "../styles/payrollsEmployer.module.css";
import stylesTooltip from "../styles/tooltip.module.css";
import { useLogin } from "../../hooks/useLogin.jsx";
import { obtenerNombreMes } from "../../lib/utils.js";
import ModalConfirmation from "../globals/ModalConfirmation.jsx";

const PayrollItem = ({
  payroll,
  deletePayroll,
  downloadPayroll,
  signPayroll,
  userId,
  listResponsability,
  isLatest = false,
}) => {
  const { logged } = useLogin();
  const [wDelete, setWDelete] = useState(false);

  if (!payroll) return null;

  const monthName = obtenerNombreMes(payroll.payrollMonth);
  const labelBase = `${monthName || payroll.payrollMonth}_${payroll.payrollYear}`;
  const canManage =
    logged?.user?.role === "global" ||
    logged?.user?.role === "root" ||
    !!listResponsability?.payrolls;

  const handleDownloadPdf = () => {
    if (!payroll.pdf) return;
    downloadPayroll(payroll.pdf, labelBase);
  };

  const handleDownloadSigned = () => {
    if (!payroll.sign) return;
    downloadPayroll(payroll.sign, `${labelBase}_firmada`);
  };

  const handleSign = () => {
    if (!canManage) return;
    signPayroll(payroll);
  };

  const openDeleteConfirm = () => {
    if (!canManage) return;
    setWDelete(true);
  };

  const handleConfirmDelete = () => {
    setWDelete(false);
    deletePayroll(payroll._id);
  };

  const handleCancelDelete = () => setWDelete(false);
const isUserPayroll= logged.user._id ===userId
  return (
    <li className={styles.payrollItem}>
      {/* Celda principal: clic completo = descargar nómina */}
      <button
        type="button"
        className={styles.payrollmonth}
        onClick={handleDownloadPdf}
        title={`Descargar nómina de ${monthName} ${payroll.payrollYear}`}
      >
        <span>
          {monthName || "Mes"} {payroll.payrollYear}
          {isLatest && " · (última)"}
        </span>
        <FaFileDownload className={styles.botonNomina} />
      </button>

      {/* Columna: firma / subir firma */}
      <div className={styles.firma}>
        {payroll.sign ? (
          <span
            className={stylesTooltip.tooltip}
            onClick={handleDownloadSigned}
          >
            <AiFillSignature className={styles.botonNomina} />
            <span className={stylesTooltip.tooltiptext}>Descargar firmada</span>
          </span>
        ) : isUserPayroll ? (
          <button
            type="button"
            className={styles.botonSubir}
            onClick={handleSign}
            title="Subir nómina firmada"
          >
            <FaCloudUploadAlt className={styles.botonNomina} />
            Firmar
          </button>
        ) : (
          <span className={stylesTooltip.tooltip}>
            <AiOutlineSignature className={styles.botonNomina} />
            <span className={stylesTooltip.tooltiptext}>
              Nómina pendiente de firma
            </span>
          </span>
        )}
      </div>

      {/* Borrar nómina */}
      {canManage && (
        <div
          className={styles.botonBorrar}
          onClick={openDeleteConfirm}
          title="Eliminar nómina"
        >
          <FaTrashAlt className={styles.botonNomina} />
        </div>
      )}

      {wDelete && (
        <ModalConfirmation
          title="Eliminar nómina"
          message={`¿Seguro que quieres eliminar la nómina de ${monthName} ${payroll.payrollYear}?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}
    </li>
  );
};

export default PayrollItem;
