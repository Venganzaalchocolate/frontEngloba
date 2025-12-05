import CvStatsDashboard from "./statistics/cv/CvStatsDashboard"
import styles from '../styles/ManagingSocial.module.css';
import WorkersStatsDashboard from "./statistics/employee/WorkersStatsDashboard";

const ManagingSocial = ({ enumsData, modal, charge }) => {
    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <>
                    <div className={styles.titulo}>
                        <div>
                            <h2>ESTADISTICAS</h2>
                        </div>
                    </div>

                    <CvStatsDashboard
                        enumsData={enumsData}
                        modal={modal}
                        charge={charge}
                    />

                    <WorkersStatsDashboard
                        enumsData={enumsData}
                        modal={modal}
                        charge={charge}
                    />
                </>
            </div>
        </div>
    )
}

export default ManagingSocial