import { useEffect, useMemo } from 'react';
import styles from '../styles/ManagingMySelf.module.css';
import { useLogin } from '../../hooks/useLogin.jsx';

import InfoEmployer from '../employer/InfoEmployer.jsx';
import Payrolls from '../payroll/Payrolls.jsx';
import DocumentMiscelaneaGeneric from '../globals/DocumentMiscelaneaGeneric.jsx';


const ManagingMySelf = ({
    myself,
    modal,
    charge,                 // ⬅ función que controla el spinner
    listResponsability = 0,
    enumsData,
}) => {
    const { changeLogged } = useLogin();


    /* 4. Helpers */
    const changeUser = user => changeLogged(user);
    const authorized =
        listResponsability > 0 || ['global', 'root'].includes(myself.role);

    /* 5. Render definitivo */
    return (
        <div className={styles.contenedor}>
            <div className={styles.contenido}>
                <div className={styles.titulo}>
                    <h2>Mi Perfil</h2>
                </div>
                <div className={styles.componentes}>
                    <InfoEmployer
                        enumsData={enumsData}
                        listResponsability={listResponsability}
                        user={myself}
                        modal={modal}
                        charge={charge}
                        changeUser={changeUser}
                    />

                    <DocumentMiscelaneaGeneric
                        data={myself}
                        modelName='User'
                        officialDocs={enumsData?.documentation?.filter(d => d.model === 'User') ?? []}
                        modal={modal}
                        charge={charge}
                        onChange={changeUser}
                        authorized={authorized}
                    />

                    <Payrolls
                        user={myself}
                        modal={modal}
                        charge={charge}
                        changeUser={changeUser}
                        listResponsability={listResponsability}
                    />

                </div>

            </div>
        </div>
    );
};



export default ManagingMySelf;
