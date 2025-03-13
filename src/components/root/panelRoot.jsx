
import styles from '../styles/panelRoot.module.css';
import ManagingEnum from './ManagingEnum';


const PanelRoot = ({ charge, enumsData, modal, chargeEnums }) => {

    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <div className={styles.titulo}>
                    <h2>PANEL ROOT</h2>
                </div>
                <ManagingEnum chargeEnums={()=>chargeEnums()} charge={charge} enumsData={enumsData} modal={modal}></ManagingEnum>
            </div>
        </div>
                    );
};

                    export default PanelRoot;
