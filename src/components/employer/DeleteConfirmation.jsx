import styles from '../styles/payrollsEmployer.module.css';

const DeleteConfirmation = ({ onConfirm, onCancel, payroll, stringMeses }) => {
    return (
        <div className={styles.confirmacionBorrar}>
            <p>¿Estás seguro que deseas borrar la nómina {stringMeses[payroll.payrollMonth - 1]}?</p>
            <button onClick={onConfirm}>Sí</button>
            <button onClick={onCancel}>No</button>
        </div>
    );
};

export default DeleteConfirmation;
