import { useState, useEffect } from 'react';
import styles from '../styles/bag.module.css';
import { getToken } from '../../lib/serviceToken';
import { getBags, addEmployerBag, createBag, getPrograms } from '../../lib/data';
import { IoBagAdd } from "react-icons/io5";
import { dateAndHour } from '../../lib/utils';
import { useBag } from "../../hooks/useBag.jsx";
import { useLogin } from '../../hooks/useLogin';


const BagCreate = () => {
    const [options, setOptions] = useState(null)
    const { logged} = useLogin()
    const { Bag, changeBag, scheduleInterview, schedule } = useBag()
    const [view, setView] = useState(false)
    const [viewCreate, setViewCreate] = useState(false)
    const [bagselected, setBag] = useState(null)
    const [programSelected, setProgramSelected]=useState(null)
    const [dispositiveSelected, setDispositiveSelected]=useState(null)
    const [optionAction, setOptionAction] = useState(null)
    const [programs, setPrograms]=useState(null)
    const [data, setData] = useState({
        name: null,
    })
    const [error, setError] = useState(null)


    const handleChange = (e) => {
        if (data.name != '' || data.name != null) setError(null)
        const { name, value } = e.target;
        setData(prevData => ({
            ...prevData,
            [name]: value
        }));
    }

    const createBagEmployer = async () => {
        let auxData={...data}
        auxData['dispositive']=dispositiveSelected;
        
        auxData['create']=logged.user._id;
        (optionAction=='createBagInternal'?auxData['sepe']='false':auxData['sepe']='true')
        console.log(auxData)
        if (data.name != null && data.name != '' && dispositiveSelected!=null) {
            const token = getToken();
            const response = await createBag(auxData, token)
            if (!response.error) {
                changeBag(response)
                setData({ name: null, sepe: "false" })
                setView(false)
                setViewCreate(false)
            } else {
                setError('Error al crear el proceso de selección')
            }
        } else {
            setError('No puedes dejar el campo vacio')
        }
    }

    const viewBagEmployer = (status) => {
        setView(status)
    }

    useEffect(() => {
        const options = async () => {
            const token = getToken();
            const bags = await getBags(token);
            const programs = await getPrograms(token);
            if (!bags.error) setOptions(bags)
            if (!programs.error) setPrograms(programs)    
        }
        options();
    }, [Bag])

    const handleChangeSelected = (e) => {
        const { value, name } = e.target;
        if(name=='bag')setBag(value);
        if(name=='programs') setProgramSelected(value);
        if(name=='dispositive') setDispositiveSelected(value);
    }

    const selectedBag = () => {
        const bagSelectedData = options.filter((x) => x._id == bagselected)[0]
        if (bagselected != null && bagSelectedData != null) {
            setOptions(null)
            setOptionAction(null)
            changeBag(bagSelectedData)
            setView(null)
        }
    }

    const closeProcess = () => {
        changeBag(null)
    }



    if (Bag != null) {
        return <div className={styles.botonesBag}>
            <button className={`${styles.botonDestacado} ${styles.tomato}`} onClick={() => closeProcess()}>CERRAR PROCESO</button>
            {!schedule && !!Bag.userCv && <button className={`${styles.botonDestacado}`} onClick={() => scheduleInterview()}>COMENZAR ENTREVISTAS</button>}
        </div>

    } else {
        return <div>
            <button className={styles.botonDestacado} onClick={() => viewBagEmployer(true)}>Procesos de selección</button>
            {
                !!view && !!options &&

                <div className={styles.ventana}>
                    <div className={styles.contenedor}>
                        <h2>Procesos de selección</h2>
                        {optionAction == null &&
                            <div className={styles.botonesMenu}>
                                <button onClick={() => setOptionAction('select')}>Seleccionar proceso</button>
                                <button onClick={() => setOptionAction('create')}>Crear proceso</button>
                                <button onClick={() => setOptionAction('delete')}>Eliminar proceso</button>
                            </div>

                        }
                        {(optionAction == 'select' || optionAction == 'delete') &&
                            <div className={styles.contenedorSelect}>
                                <label htmlFor="bags">Selecciona un proceso</label>
                                <div>
                                    <select id='bags' name='bags' onChange={handleChangeSelected} value={bagselected}>
                                        <option key='selectBag'>Selecciona una opción</option>
                                        {options.map((x) => {
                                            return <option value={x._id} key={`SelectBag${x._id}`}>{x.name} - Sepe:{(x.sepe) ? 'Si' : 'No'} - Fecha:{dateAndHour(x.date)}</option>
                                        })}
                                    </select>
                                </div>
                                <div>
                                    {(optionAction == 'delete') ? <button onClick={() => selectedBag()}>Borrar</button> : <button onClick={() => selectedBag()}>Seleccionar</button>}
                                    <button onClick={() => setOptionAction(null)}>Atrás</button>
                                </div>
                            </div>
                        }
                        {optionAction == 'create' &&
                            <div className={styles.contenedorSelect}>
                                <label>Crear proceso</label>
                                <div>
                                    <button onClick={() => setOptionAction('createBagInternal')}>Proceso Interno</button>
                                    <button onClick={() => setOptionAction('createBagSepe')}>Proceso Sepe</button>
                                </div>
                                
                            </div>
                        }
                        {(optionAction == 'createBagInternal' || optionAction == 'createBagSepe') &&
                            <div className={styles.contenedorSelect}>
                                <label>Crear Proceso de selección {(optionAction == 'createBagInternal')?'interno':'Sepe'}</label>
                                <div>
                                    <label htmlFor="name">Nombre:</label>
                                    <input type='text' name='name' id='name' onChange={handleChange} />
                                </div>
                                {!!error && <span className="errorSpan">{error}</span>}
                                <label htmlFor='programs'>Programa:</label>
                                <div>
                                    <select id='programs' name='programs' onChange={handleChangeSelected} value={programSelected}>
                                        <option key='selectBag'>Selecciona una opción</option>
                                        {programs.map((x) => {
                                            return <option value={x._id} key={`SelectProgram${x._id}`}>{x.name}</option>
                                        })}
                                    </select>
                                </div>
                                {!!programSelected && <>
                                    <label htmlFor='dispositive'>Dispositivo:</label>
                                    <div>
                                        <select id='dispositive' name='dispositive' onChange={handleChangeSelected} value={dispositiveSelected}>
                                            <option key='selectBag'>Selecciona una opción</option>
                                            {programs.filter((x)=>x._id==programSelected).map((x) => {
                                            return x.devices.map((y)=>{
                                                   return <option value={y._id} key={`SelectDispositive${y._id}`}>{y.name}</option> 
                                                })
                                                
                                            })}
                                        </select>
                                    </div>
                                </>}
                                <div>
                                    <button onClick={() => createBagEmployer()}>Crear</button>
                                    <button onClick={() => setOptionAction(null)}>Atrás</button>
                                </div>
                            </div>

                        }
                        <div>
                            <button className={styles.tomato} onClick={() => { viewBagEmployer(); setOptionAction(null) }}>Cancelar</button>
                        </div>


                    </div>
                </div>
            }
        </div>
    }


}

export default BagCreate;