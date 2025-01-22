import styles from '../styles/ManagingPayroll.module.css';
import { useLogin } from '../../hooks/useLogin';
import { useEffect } from 'react';
import PayrollList from './PayrollList';
import { getToken } from '../../lib/serviceToken.js';
import { updatePayroll } from '../../lib/data.js';
import Payrolls from './Payrolls.jsx';

const ManagingPayroll=({ modal, charge, listResponsability })=>{
    const { logged, changeLogged } = useLogin();

    return (
         <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <div className={styles.titulo}>
                    <div>
                        <h2>NÓMINAS</h2>
                    </div>
                </div>
                <Payrolls user={logged.user} modal={modal} charge={charge} changeUser={(x)=>changeLogged(x)} listResponsability={listResponsability} title={false}/>
            </div>
        </div>
    )
}

export default ManagingPayroll