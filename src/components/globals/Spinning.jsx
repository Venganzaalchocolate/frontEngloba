import styles from '../styles/modal.module.css';
import stylesDos from '../styles/spinning.module.css';

const Spinnning = ({status}) => {
    if (!status) {
      return null;
    }

  
    return (
      <div className={styles.ventana}>
        <div className={stylesDos.contenedor}>
            <span className={stylesDos.loader}></span>
        </div>
      </div>
    );
  };
  
  export default Spinnning;