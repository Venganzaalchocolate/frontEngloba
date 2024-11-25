import { useState } from 'react';
import styles from '../styles/payrollsEmployer.module.css';
import { deepClone } from '../../lib/utils';
import { validMonth, validYear, parseIfInteger, isNotFutureDate } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';
import { getToken } from '../../lib/serviceToken';
import { updatePayroll } from '../../lib/data';

const PayrollForm = ({ user, charge, modal, changeUser, reset }) => {
    const [errores, setErrores] = useState({});
    const [datos, setDatos] = useState({});

    const handleChangeFile = (e) => {
        const { name, files } = e.target;
        let auxDatos = deepClone(datos);
        let auxErrores = deepClone(errores);
        const file = files[0];

        if (!file) {
            auxErrores[name] = `No hay archivo`;
            setErrores(auxErrores);
            return;
        }

        if (file.type !== "application/pdf") {
            auxErrores[name] = `Debe ser un pdf`;
            setErrores(auxErrores);
            return;
        }

        const maxFileSize = 10 * 1024 * 1024;
        if (file.size > maxFileSize) {
            auxErrores[name] = `No puede ser mayor a 10MB`;
            setErrores(auxErrores);
            return;
        }

        auxDatos[name] = file;
        setDatos(auxDatos);
        setErrores(auxErrores);
    };

    const handleChange = (e) => {
        const { id, value } = e.target;
        let auxErrores = deepClone(errores);
        let auxDatos = deepClone(datos);
        let valido = id === 'payrollMonth' ? validMonth(value) : validYear(value);

        auxErrores[id] = valido ? null : textErrors(id);
        auxDatos[id] = value;
        setDatos(auxDatos);
        setErrores(auxErrores);
    };

    const savePayroll = async () => {
        let erroresAux = deepClone(errores);
        let datosAux = deepClone(datos);

        if (!datosAux.payrollYear || !datosAux.payrollMonth || !datosAux.pdf) {
            erroresAux['generalCreate'] = textErrors('vacio');
            setErrores(erroresAux);
            return;
        }

        const month = parseIfInteger(datosAux.payrollMonth);
        const year = parseIfInteger(datosAux.payrollYear);
        if (!isNotFutureDate(month, year)) {
            erroresAux['generalCreate'] = textErrors('futureDate');
            setErrores(erroresAux);
            return;
        }

        charge(true);
        try {
            const token = getToken();
            datosAux['userId'] = user._id;
            datosAux['type'] = 'create';
            const data = await updatePayroll(datosAux, token);
            if (!data.error) {
                modal('Subir nómina nueva', 'Nómina añadida con éxito');
                changeUser(data);
            }
        } catch (error) {
            modal('Error', 'Los datos no son correctos');
        }
        charge(false);
    };

    const fiveYearsOld = () => {
        const dateNow = new Date();
        return Array.from({ length: 5 }, (_, i) => dateNow.getFullYear() - i);
    };

    return (
        <div className={styles.createPayroll}>
            <div>
                <label htmlFor='payrollMonth'>Mes</label>
                <select id="payrollMonth" value={datos['payrollMonth'] || ''} onChange={handleChange}>
                    <option value={'0'}>Selecciona una opción</option>
                    {Array.from({ length: 12 }, (_, i) => (
                        <option key={i + 1} value={i + 1}>
                            {['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'][i]}
                        </option>
                    ))}
                </select>
                {errores['payrollMonth'] && <span className="errorSpan">{errores['payrollMonth']}</span>}
            </div>

            <div>
                <label htmlFor='payrollYear'>Año</label>
                <select id="payrollYear" value={datos['payrollYear'] || ''} onChange={handleChange}>
                    <option value={'0'}>Selecciona una opción</option>
                    {fiveYearsOld().map((year) => (
                        <option key={year} value={year}>{year}</option>
                    ))}
                </select>
                {errores['payrollYear'] && <span className="errorSpan">{errores['payrollYear']}</span>}
            </div>

            <div>
                <label htmlFor='pdf'>PDF de la Nómina</label>
                <input type="file" id='pdf' name='pdf' onChange={handleChangeFile} />
                {errores['pdf'] && <span className="errorSpan">{errores['pdf']}</span>}
            </div>

            <div className={styles.contenedorBotones}>
                <button onClick={savePayroll}>Guardar</button>
                <button onClick={reset}>Cancelar</button>
            </div>

            {errores['generalCreate'] && <span className="errorSpan">{errores['generalCreate']}</span>}
        </div>
    );
};

export default PayrollForm;
