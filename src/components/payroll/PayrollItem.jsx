// PayrollItem.jsx
import { useState, useMemo } from "react";
import { FaTrashAlt, FaFileDownload } from "react-icons/fa";
import { AiOutlineSignature } from "react-icons/ai";
import { FaCloudUploadAlt } from "react-icons/fa";
import styles from "../styles/payrollsEmployer.module.css";
import stylesTooltip from "../styles/tooltip.module.css";
import { useLogin } from "../../hooks/useLogin.jsx";
import { obtenerNombreMes } from "../../lib/utils.js";
import ModalConfirmation from "../globals/ModalConfirmation.jsx";

const hasSignature = (u) =>
  Array.isArray(u?.signature?.strokes) && u.signature.strokes.length > 0;

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
  const [wNoSig, setWNoSig] = useState(false);

  if (!payroll) return null;

  const monthName = obtenerNombreMes(payroll.payrollMonth);
  const labelBase = `${monthName || payroll.payrollMonth}_${payroll.payrollYear}`;

  const canManage =
    logged?.user?.role === "global" ||
    logged?.user?.role === "root" ||
    !!listResponsability?.payrolls;

  const isUserPayroll = logged?.user?._id === userId;

  const userHasSignature = useMemo(
    () => hasSignature(logged?.user),
    [logged?.user]
  );

  const handleDownloadPdf = () => {
    if (!payroll.pdf) return;
    downloadPayroll(payroll.pdf, labelBase);
  };

  const handleDownloadSigned = () => {
    if (!payroll.sign) return;
    downloadPayroll(payroll.sign, `${labelBase}_firmada`);
  };

  const handleSign = () => {
    // 1) si no hay firma guardada, NO dejamos firmar
    if (!userHasSignature) {
      setWNoSig(true);
      return;
    }
    // 2) si hay firma, seguimos flujo normal
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

  return (
    <li className={styles.payrollItem}>
      {/* Descargar nómina */}
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

      {/* Firma / subir firmada */}
      <div className={styles.firma}>
        {payroll.sign ? (
          <button type="button" onClick={handleDownloadSigned}>
            Descargar firmada
          </button>
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

      {/* Modal borrar */}
      {wDelete && (
        <ModalConfirmation
          title="Eliminar nómina"
          message={`¿Seguro que quieres eliminar la nómina de ${monthName} ${payroll.payrollYear}?`}
          onConfirm={handleConfirmDelete}
          onCancel={handleCancelDelete}
        />
      )}

      {/* Modal “no hay firma guardada” */}
      {wNoSig && (
        <ModalConfirmation
          title="No tienes firma guardada"
          message={
            "Para poder firmar una nómina necesitas registrar tu firma primero.\n\n" +
            "Ve a “Mi Perfil” → “FIRMA”, crea tu firma y guárdala. " +
            "Este paso solo tendrás que hacerlo una vez."
          }
          textConfirm="Entendido"
          deleteCancel={true}   // solo botón confirm
          onConfirm={() => setWNoSig(false)}
        />
      )}
    </li>
  );
};

export default PayrollItem;