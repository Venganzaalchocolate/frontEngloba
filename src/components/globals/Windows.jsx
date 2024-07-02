
import styles from '../styles/modal.module.css';

const WindowsModal = ({ data, closeModal }) => {
    if (!data.open) {
      return null;
    }

  
    return (
      <div className={styles.ventana}>
        <div className={styles.contenedor}>
          <h2>{data.title}</h2>
          <p>{data.message}</p>
          <button onClick={()=>closeModal()}>Cerrar</button>
        </div>
      </div>
    );
  };
  
  export default WindowsModal;