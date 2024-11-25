import { useState } from 'react';
import styles from '../styles/payrollsEmployer.module.css';
import PayrollForm from './PayrollForm.jsx';
import PayrollList from './PayrollList.jsx';
import { FaSquarePlus } from "react-icons/fa6";
import { getToken } from '../../lib/serviceToken.js';
import { updatePayroll } from '../../lib/data.js';

const Payrolls = ({ user, modal, charge, changeUser }) => {
    const [upW, setUpW] = useState(false);
    const reset = () => setUpW(false);

    const deletePayroll = async (id, pdf) => {
        let datosAux = {};
        const token = getToken();
        datosAux['userId'] = user._id;
        datosAux['idPayroll'] = id;
        datosAux['type'] = 'delete';
        datosAux['pdf'] = pdf;
        const data = await updatePayroll(datosAux, token);
        if (!data.error) {
            modal('Borrar Nómina', 'Nómina borrada con éxito');
            changeUser(data)
        }
    };
    const downloadPayroll = async (id,namePdf) => {
        // Activar indicador de carga
        charge(true);
    
        const token = getToken();
        const datosAux = {
            userId: user._id,
            pdf: id,
            type: 'get'
        };
    
        try {
            // Obtener el archivo y su nombre desde el servidor
            const response = await updatePayroll(datosAux, token);
    
            // Aquí suponemos que la respuesta contiene el archivo en formato Blob
            // y el nombre original del archivo en `response.filename`.
            const data = response;  // El archivo Blob
            const filename = `${namePdf}_${user.firstName}_${user.lastName}`; 
            const fileUrl = URL.createObjectURL(data);
    
            // Abrir una nueva ventana para visualizar el archivo
            window.open(fileUrl);
    
            // Crear el enlace de descarga
            const link = document.createElement('a');
            link.href = fileUrl;
            link.download = filename; // Usar el nombre original del archivo
    
            // Añadir el link al DOM, hacer clic en él y luego eliminarlo
            document.body.appendChild(link);
            link.click();
    
            // Liberar la URL del objeto después de la descarga
            URL.revokeObjectURL(fileUrl);
    
            // Eliminar el enlace del DOM
            document.body.removeChild(link);
        } catch (error) {
            // Mostrar mensaje de error si no se pudo descargar
            modal('Error', 'No se ha podido encontrar el archivo, inténtelo más tarde');
        } finally {
            // Siempre ocultar el indicador de carga
            charge(false);
        }
    };
    



    return (
        <div className={styles.contenedor}>
            <h2>NÓMINAS <FaSquarePlus onClick={() => setUpW(!upW)} /></h2>
            {upW && <PayrollForm user={user} modal={modal} charge={charge} changeUser={changeUser} reset={reset} />}
            <PayrollList payrolls={user.payrolls} deletePayroll={deletePayroll} downloadPayroll={downloadPayroll} />
        </div>
    );
};

export default Payrolls;
