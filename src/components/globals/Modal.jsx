import styles from '../styles/modal.module.css';

const Modal = ({ data, closeModal }) => {
  if (!data.open) return null;

  const renderMessage = (message) => {
    if (!Array.isArray(message)) {
      return <p>{message}</p>;
    }

    return message.map((item, i) => {
      if (!Array.isArray(item)) {
        return <p key={i}>{item}</p>;
      }

      return (
        <div className={styles.modalInfoBlock} key={i}>
          {item.map((line, j) => (
            <p
              key={j}
              className={j === 0 ? styles.modalInfoTitle : styles.modalInfoLine}
            >
              {line}
            </p>
          ))}
        </div>
      );
    });
  };

  return (
    <div className={styles.ventana}>
      <div className={styles.contenedor}>
        <h2>{data.title}</h2>

        <div className={styles.modalMessage}>
          {renderMessage(data.message)}
        </div>

        <button onClick={closeModal}>Cerrar</button>
      </div>
    </div>
  );
};

export default Modal;