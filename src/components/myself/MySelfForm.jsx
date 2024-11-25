import { useEffect, useState } from 'react';
import styles from '../styles/formMySelf.module.css';
import { validEmail, validNumber, validPassword, validText } from '../../lib/valid';
import { textErrors } from '../../lib/textErrors';
import { getToken, saveToken } from '../../lib/serviceToken';
import { createEmployer, editUser, loginUser } from '../../lib/data';
import { FaCircleCheck, FaCircleXmark } from "react-icons/fa6";  // Importamos los íconos
import HiringPeriodForm from '../employer/HiringPeriodForm';
import { deepClone } from '../../lib/utils';
import SelectDispositive from '../globals/SelectDispositive';
import { useLogin } from '../../hooks/useLogin.jsx';
import { useNavigate } from 'react-router-dom';

const MySelfForm = ({ user = null, closeForm, isEditing, setIsEditing, modal, charge }) => {

    const { logged, changeLogged } = useLogin();
    const initialFormState = {
        firstName: '',
        lastName: '',
        dni: '',
        email: '',
        phone: '',
        employmentStatus: 'en proceso de contratación',
        dispositiveNow: null,
        socialSecurityNumber: '',
        bankAccountNumber: '',
        cv: null,
        sexualOffenseCertificate: null,
        model145: null,
        firePrevention: null,
        contract: null,
        employmentHistory: null,
        dataProtection: null,
        ethicalChannel: null,
        dniCopy: null,
        _id: '',
        hiringPeriods: [],
        password: '',
        responsibleDevices: {}
    };

    const [datos, setDatos] = useState(initialFormState);
    const [errores, setError] = useState({});
    // Campos de nombre
    const textFields = [['firstName', 'Nombre'], ['lastName', 'Apellidos'], ['dni', 'DNI'], ['email', 'Email'], ['password', 'Contraseña'], ['phone', 'Teléfono']];

    // Campos de archivo
    const fileFields = [
        { label: 'Curriculum', name: 'cv' },
        { label: 'Certificado de delitos sexuales', name: 'sexualOffenseCertificate' },
        { label: 'Modelo 145', name: 'model145' },
        { label: 'Prevención de incendios', name: 'firePrevention' },
        { label: 'Contrato', name: 'contract' },
        { label: 'Vida Laboral', name: 'employmentHistory' },
        { label: 'Protección de datos', name: 'dataProtection' },
        { label: 'Canal Ético', name: 'ethicalChannel' },
        { label: 'DNI', name: 'dniCopy' }
    ];

    const navigate = useNavigate();
    // Función para establecer los datos del usuario o inicializar el formulario vacío
    const setInitialData = (user) => {
        if (user) {
            setDatos({
                ...initialFormState,
                ...user, // Sobrescribe con los datos del usuario
            });
        } else {
            setDatos(initialFormState);  // Vacía los datos para crear un nuevo responsable
        }
    };

    useEffect(() => {
        setInitialData(user);  // Establece los datos al cargar el componente
    }, [user]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        const auxDatos = { ...datos, [name]: value };
        setDatos(auxDatos);

        // Validaciones según el tipo de campo
        let valido = false;
        if (name === 'firstName' || name === 'lastName') valido = validText(value, 3, 100);
        if (name === 'email') valido = validEmail(value);
        if (name === 'phone') valido = validNumber(value);
        if (name === 'password') valido = validPassword(value);

        setError((prevErrors) => ({
            ...prevErrors,
            [name]: valido ? null : textErrors(name),
        }));
    };

    const handleChangeFile = (e) => {
        const { name, files } = e.target;
        const file = files[0];  // Obtenemos el primer archivo subido
    
        // Verificamos que se haya seleccionado un archivo y que sea un archivo PDF
        if (file && file.type === 'application/pdf') {
            
            // Actualizamos el estado 'datos' añadiendo el archivo
            setDatos((prevDatos) => ({ 
                ...prevDatos, 
                [name]: file 
            }));
    
            // Limpiamos cualquier error asociado
            setError((prevErrores) => ({ 
                ...prevErrores, 
                [name]: null 
            }));
        } else {
            // Si el archivo no es válido, mostramos un mensaje de error
            setError((prevErrores) => ({ 
                ...prevErrores, 
                [name]: textErrors('fileError') 
            }));
        }
    };
    


    const handleSubmit = async () => {
        let valid = true
        let errorsAux = deepClone(errores)
        textFields.map((x) => {
            if (datos[x[0]] == '') {
                if (!user || (user && x[0] != 'password')) {
                    valid = false
                    errorsAux[x[0]] = textErrors('vacio')
                }

            }
        })
        if (!user && datos.hiringPeriods.length == 0) {
            valid = false
            errorsAux['hiringPeriod'] = 'Cuando haya una contratación nueva debe tener un periodo de contratación'
        }

        if (!user && Object.keys(datos.responsibleDevices).length === 0) {
            valid = false
            errorsAux['responsibleDevices'] = 'Mínimo debe ser responsable de un dispositivo'
        }


        if (valid) {
            const token = getToken();
            charge(true)
            let response = false;
            if (user) {
                response = await editUser(datos, token);
            } else {
                if (logged.user.email === 'responsable@engloba.org.es') {
                    let datosAux = deepClone(datos)
                    datosAux['role'] = 'responsable';
                    response = await createEmployer(datosAux, token);
                } else {
                    response = await createEmployer(datosAux, token);
                }
                if(!!response) {
                    const login = await loginUser(datos.email, datos.password);
                    changeLogged(login.user);
                    saveToken(login.token);
                    closeForm()
                    charge(false);

                }
            }
            // closeForm();  // Cierra el formulario después de guardar   
            charge(false)
        } else {
            setError(errorsAux)
        }

    };


    const handleHiringPeriodChange = (hiringPeriod) => {
        setError(prevDateError => ({
            ...prevDateError,
            hiringPeriod: null
        }))
        setDatos(prevDatos => ({
            ...prevDatos,
            hiringPeriods: (hiringPeriod == null) ? [] : [hiringPeriod]
        }));

    };


    // Campos de texto
    const reset = () => {
        setDatos({
            ...initialFormState,
            ...user, // Sobrescribe con los datos del usuario
        });
        setError({});
        setIsEditing(false);
        closeForm();

    }

    const changeDeviceSelect = (idDevice, nameDevice) => {

        if (idDevice != null) {
            setError(prevDateError => ({
                ...prevDateError,
                responsibleDevices: null
            }))
            const auxData = deepClone(datos)
            auxData['responsibleDevices'][idDevice] = nameDevice
            setDatos(auxData)
        }

    }

    const deleteDispositive = (id) => {
        const auxData = deepClone(datos)
        delete auxData['responsibleDevices'][id];
        setDatos(auxData)
    }




    return (
        <div className={styles.ventana}>
            <div className={styles.contenedorMySelfForm}>
                <div className={styles.contenedorForm}>
                    <h2>Datos</h2>
                    {textFields.map((field) => (
                        <div key={field[0]} className={styles.formGroup}>
                            <label htmlFor={field[0]}>{field[1]}</label>
                            <input
                                type="text"
                                id={field[0]}
                                name={field[0]}
                                value={datos[field[0]]}
                                onChange={handleChange}
                                disabled={!isEditing}
                            />
                            {errores[field[0]] && <span className="errorSpan">{errores[field[0]]}</span>}
                        </div>
                    ))}
                    <h2>Documentación</h2>
                    {/* Campos de archivo */}
                    {fileFields.map(({ label, name }) => (
                        <div key={name} className={styles.formGroup}>
                            <label htmlFor={name}>
                                {label} {(user && user[name]) ? <FaCircleCheck /> : <FaCircleXmark />}
                            </label>
                            {
                                isEditing && <>
                                    <input
                                        type="file"
                                        id={name}
                                        name={name}
                                        onChange={handleChangeFile}
                                        disabled={!isEditing}
                                    />
                                    {errores[name] && <span className="errorSpan">{errores[name]}</span>}
                                </>
                            }

                        </div>
                    ))}

                    {isEditing && user == null && (
                        <div className={styles.hiringPeriodForm}>
                            {datos.hiringPeriods.length == 0
                                ? <HiringPeriodForm
                                    onHiringPeriodChange={handleHiringPeriodChange}
                                    isEditing={isEditing}
                                />

                                :
                                <div>
                                    <h2>Periodo de contratación</h2>
                                    <p>Cargo: {datos.hiringPeriods[0]?.position}</p>
                                    <p>Categoría: {datos.hiringPeriods[0]?.category}</p>
                                    <p>Fecha de inicio: {datos.hiringPeriods[0]?.startDate}</p>
                                    <p>Jornada: {datos.hiringPeriods[0]?.workShift?.type}</p>
                                    <p>Notas: {datos.hiringPeriods[0]?.workShift?.note}</p>
                                    <p>Dispositivo: {datos.hiringPeriods[0]?.nameDevice}</p>
                                    <button className='tomato' onClick={() => handleHiringPeriodChange(null)}>Eliminar Periodo de Contratación</button>
                                </div>
                            }
                            <span className='errorSpan'>{errores.hiringPeriod}</span>
                        </div>
                    )}
                    {isEditing && user == null && (
                        <>
                            <div className={styles.deviceSelect}>
                                <h2>Dispositivos de los cuales eres responsable</h2>
                                <SelectDispositive onDeviceSelect={(idDevice, nameDevice) => changeDeviceSelect(idDevice, nameDevice)} />
                                <span className='errorSpan'>{errores.responsibleDevices}</span>
                            </div>
                            <div className={styles.deviceSelected}>
                                <h3>Dispositivos Seleccionados</h3>
                                {Object.keys(datos.responsibleDevices).length === 0 ? (
                                    <p>No se han asignado dispositivos.</p>
                                ) : (
                                    <ul>
                                        {Object.entries(datos.responsibleDevices).map(([id, name]) => (
                                            <li key={id}>{name} <button className='tomato' onClick={() => deleteDispositive(id)}>x</button></li>
                                        ))}
                                    </ul>
                                )}

                            </div>

                        </>

                    )}
                    <div>

                    </div>
                    <div>



                    </div>

                </div>

                <div className={styles.formButton}>
                    {isEditing ? (
                        <>
                            <button onClick={handleSubmit}>Guardar</button>
                            <button onClick={() => reset()}>Cancelar</button>
                        </>
                    ) : (
                        <>
                            <button onClick={() => setIsEditing(true)}>Editar</button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default MySelfForm;
