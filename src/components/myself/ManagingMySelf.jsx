import { useEffect, useMemo } from 'react';
import styles from '../styles/ManagingMySelf.module.css';
import { useLogin } from '../../hooks/useLogin.jsx';

import InfoEmployer from '../employer/InfoEmployer.jsx';
import Payrolls from '../payroll/Payrolls.jsx';
import DocumentMiscelaneaGeneric from '../globals/DocumentMiscelaneaGeneric.jsx';
import MyChangeRequests from './MyChangeRequest.jsx';
import { useState } from 'react';


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
        listResponsability > 0 || ['global'].includes(myself.role);

const [optimisticReqs, setOptimisticReqs] = useState([]);

const handleRequestCreated = (payload) => {
  if (!payload) return;

  const replaceId = payload.__replaceClientId;   // id temporal a reemplazar
  const deleteId  = payload.__deleteOptimistic;  // id temporal a borrar

  setOptimisticReqs(prev => {
    let next = [...prev];

    // si hay que borrar (fallo en la llamada)
    if (deleteId) {
      return next.filter(x => String(x._id) !== String(deleteId));
    }

    // si hay que reemplazar el optimista por el real
    if (replaceId) {
      next = next.filter(x => String(x._id) !== String(replaceId));
    }

    // normaliza por si viene envuelto en { data }
    const created = payload?.data && payload?.data?._id ? payload.data : payload;
    if (!created?._id) return next;

    const map = new Map(next.map(x => [String(x._id), x]));
    map.set(String(created._id), created); // dedupe por _id
    return Array.from(map.values());
  });
};


  

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
                        onRequestCreated={handleRequestCreated}
                    />

                    

                    <DocumentMiscelaneaGeneric
                        data={myself}
                        modelName='User'
                        officialDocs={enumsData?.documentation?.filter(d => d.model === 'User') ?? []}
                        modal={modal}
                        charge={charge}
                        onChange={changeUser}
                        authorized={authorized}
                        onRequestCreated={handleRequestCreated}
                    />

                    <Payrolls
                        user={myself}
                        modal={modal}
                        charge={charge}
                        changeUser={changeUser}
                        listResponsability={listResponsability}
                    />

                    <MyChangeRequests
                        userId={myself._id}
                        modal={modal}
                        charge={charge}
                        enumsData={enumsData}
                        initialItems={optimisticReqs}
                    />

                </div>

            </div>
        </div>
    );
};



export default ManagingMySelf;
