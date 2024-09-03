import { useState } from 'react';
import styles from '../styles/formCreateEmpoyers.module.css';
import { validEmail, validNumber, validText } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';
import { getToken } from '../../lib/serviceToken';
import { createEmployer } from '../../lib/data';

const FormCreateEmployers = ({ modal, charge, user = null, changeUser = null, closeModal }) => {
    const [multipleData, setMultipleData] = useState({
        hiringPeriods: user ? user.hiringPeriods : [],
        leavePeriods: user ? user.leavePeriods : [],
        degree: user ? user.degree : [],
        payrolls: user ? user.payrolls : [],
    });

    const [datos, setDatos] = useState({
        firstName: user ? user.firstName : null,
        lastName: user ? user.lastName : null,
        dni: user ? user.dni : null,
        email: user ? user.email : null,
        phone: user ? user.phone : null,
        employmentStatus: user ? user.employmentStatus : 'en proceso de contratación',
        dispositiveNow: user ? user.dispositiveNow : null,
        socialSecurityNumber: user ? user.socialSecurityNumber : null,
        bankAccountNumber: user ? user.bankAccountNumber : null,
        cv: user ? user.cv : null,
        sexualOffenseCertificate: user ? user.sexualOffenseCertificate : null,
        model145: user ? user.model145 : null,
        firePrevention: user ? user.firePrevention : null,
        contract: user ? user.contract : null,
        employmentHistory: user ? user.employmentHistory : null,
        dataProtection: user ? user.dataProtection : null,
        ethicalChannel: user ? user.ethicalChannel : null,
        dniCopy: user ? user.dniCopy : null,
        id: user ? user._id : ""
    });

    const [errores, setError] = useState({
        firstName: null,
        lastName: null,
        dni: null,
        email: null,
        phone: null,
        employmentStatus: null,
        dispositiveNow: null,
        socialSecurityNumber: null,
        bankAccountNumber: null,
        cv: null,
        sexualOffenseCertificate: null,
        model145: null,
        firePrevention: null,
        contract: null,
        employmentHistory: null,
        dataProtection: null,
        ethicalChannel: null,
        dniCopy: null
    });

    const handleChange = (e) => {
        let auxErrores = { ...errores };
        let auxDatos = { ...datos };
        auxErrores['mensajeError'] = null;
        let valido = false;

        // Validar según el tipo de input
        if (e.target.name === 'firstName' || e.target.name === 'lastName') valido = validText(e.target.value, 3, 100);
        if (e.target.name === 'email') valido = validEmail(e.target.value);
        if (e.target.name === 'phone') valido = validNumber(e.target.value);

        auxDatos[e.target.name] = e.target.value;
        setDatos(auxDatos);

        // Manejo de errores
        if (!valido) {
            auxErrores[e.target.name] = textErrors(e.target.name);
        } else {
            auxErrores[e.target.name] = null;
        }
        setError(auxErrores);
    };

    const handleChangeFile = (e) => {
        const { name, files } = e.target;
        const file = files[0];

        if (file.type === 'application/pdf') {
            setError({ ...errores, [name]: null });
            setDatos({ ...datos, [name]: file });
        } else {
            setError({ ...errores, [name]: textErrors('fileError') });
        }
    };

    const sendFormCreateOffer=async ()=>{
        const token= getToken();
        const response=await createEmployer(datos,token)
    }

    return (
        <div className={styles.ventana}>
            <div className={styles.contenedor}>
                <div className={styles.contenedorForm}>
                    <h2 id={styles.formtitle}>Añadir Empleado</h2>
                    <div id={styles.formFirstName}>
                        <label htmlFor="firstName">Nombre</label>
                        <input type="text" id="firstName" name="firstName" onChange={handleChange} value={datos.firstName} />
                        <span className="errorSpan">{errores.firstName}</span>
                    </div>
                    <div id={styles.formLastName}>
                        <label htmlFor="lastName">Apellidos</label>
                        <input type="text" id="lastName" name="lastName" onChange={handleChange} value={datos.lastName} />
                        <span className="errorSpan">{errores.lastName}</span>
                    </div>
                    <div id={styles.formDni}>
                        <label htmlFor="dni">DNI</label>
                        <input type="text" id="dni" name="dni" onChange={handleChange} value={datos.dni} />
                        <span className="errorSpan">{errores.dni}</span>
                    </div>
                    <div id={styles.formEmail}>
                        <label htmlFor="email">Email</label>
                        <input type="email" id="email" name="email" onChange={handleChange} value={datos.email} />
                        <span className="errorSpan">{errores.email}</span>
                    </div>
                    <div id={styles.formPhone}>
                        <label htmlFor="phone">Teléfono</label>
                        <input type="text" id="phone" name="phone" onChange={handleChange} value={datos.phone} />
                        <span className="errorSpan">{errores.phone}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.formCV}>
                        <label htmlFor="cv">Curriculum</label>
                        <input type="file" id="cv" name="cv" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.cv}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.formSex}>
                        <label htmlFor="sexualOffenseCertificate">Certificado de delitos sexuales</label>
                        <input type="file" id="sexualOffenseCertificate" name="sexualOffenseCertificate" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.sexualOffenseCertificate}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.form145}>
                        <label htmlFor="model145">Modelo 145</label>
                        <input type="file" id="model145" name="model145" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.model145}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.formFire}>
                        <label htmlFor="firePrevention">Prevención de incendios</label>
                        <input type="file" id="firePrevention" name="firePrevention" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.firePrevention}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.formContract}>
                        <label htmlFor="contract">Contrato</label>
                        <input type="file" id="contract" name="contract" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.contract}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.formHistory}>
                        <label htmlFor="employmentHistory">Vida Laboral</label>
                        <input type="file" id="employmentHistory" name="employmentHistory" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.employmentHistory}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.formProtection}>
                        <label htmlFor="dataProtection">Protección de datos</label>
                        <input type="file" id="dataProtection" name="dataProtection" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.dataProtection}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.formEthic}>
                        <label htmlFor="ethicalChannel">Canal Ético</label>
                        <input type="file" id="ethicalChannel" name="ethicalChannel" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.ethicalChannel}</span>
                    </div>
                    <div className={styles.inputGrande} id={styles.formDniFile}>
                        <label htmlFor="ethicalChannel">DNI</label>
                        <input type="file" id="dniCopy" name="dniCopy" onChange={handleChangeFile} />
                        <span className="errorSpan">{errores.dniCopy}</span>
                    </div>
                </div>
                <div id={styles.formButton}>
                    <button onClick={()=>sendFormCreateOffer()}>Crear</button>
                    <button onClick={closeModal}>Cerrar</button>
                </div>
                
            </div>
        </div>
    );
};

export default FormCreateEmployers;
