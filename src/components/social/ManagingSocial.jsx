import CvStatsDashboard from "./statistics/cv/CvStatsDashboard"
import styles from '../styles/ManagingSocial.module.css';
import WorkersStatsDashboard from "./statistics/employee/WorkersStatsDashboard";
import StatsHeadcount from "./StatsHeadcount";
import StatsUserCv from "./StatsUserCv";
import { useState } from "react";

const ManagingSocial = ({ enumsData, modal, charge }) => {
    const [option, setOption]=useState('trab')
    
    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <>
                    <div className={styles.titulo}>
                        <div>
                            <h2>ESTADÍSTICAS</h2>
                        </div>
                    </div>
                    <div  className={styles.cajaBotones}>
                        <button className={(option=='trab')?styles.seleccionado:styles.noSeleccionado} onClick={()=>setOption('trab')}>Estadísticas de Trabajadores</button>
                        <button className={(option=='cv')?styles.seleccionado:styles.noSeleccionado}  onClick={()=>setOption('cv')}>Estadísticas de Solicitudes de Empleo</button>
                    </div>
                    {/* <CvStatsDashboard
                        enumsData={enumsData}
                        modal={modal}
                        charge={charge}
                    />

                    <WorkersStatsDashboard
                        enumsData={enumsData}
                        modal={modal}
                        charge={charge}
                    /> */}
                    {option=='trab'
                    ? <StatsHeadcount charge={charge} modal={modal} enumsData={enumsData}/>
                    : <StatsUserCv charge={charge} modal={modal} enumsData={enumsData}/>
                    }
                  
                    
                </>
            </div>
        </div>
    )
}

export default ManagingSocial