import { useState, useEffect } from 'react';
import styles from '../styles/bag.module.css';
import { getToken } from '../../lib/serviceToken';
import { getBags, addEmployerBag, createBag, getPrograms, deactivateBagId } from '../../lib/data';
import { useBag } from "../../hooks/useBag.jsx";
import { useLogin } from '../../hooks/useLogin';
import { formatDatetime } from '../../lib/utils.js';


const BagCreate = ({offer=false, style=null}) => {
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
    const [error, setError] = useState(null)
    const [confirmDeactivate, setConfirmDeactivate]=useState(null)


    const createBagEmployer = async () => {
        let auxData={}
        auxData['dispositive']=dispositiveSelected;
        auxData['create']=logged.user._id;
        (optionAction=='createBagInternal'?auxData['sepe']='false':auxData['sepe']='true')
        if (dispositiveSelected!=null) {
            const token = getToken();
            const response = await createBag(auxData, token)
            
            if (!response.error) {
                
                changeBag(response)
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

    const optionsSelect = async () => {
        const token = getToken();
        const bags = await getBags(token);
        const programs = await getPrograms(token);
        if (!bags.error) setOptions(bags)
        if (!programs.error) setPrograms(programs)    
    }

    useEffect(() => {
        optionsSelect();
    }, [Bag])

    const handleChangeSelected = (e) => {
        const { value, name } = e.target;
        if(name=='bags' && value!=-1)setBag(value);
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

    const resetOptionBag=()=>{
        setViewCreate(false)
        setBag(null)
        setProgramSelected(null)
        setDispositiveSelected(null)
        setOptionAction(null)
        setConfirmDeactivate(null)
        
    }

    const closeProcess = () => {
        setOptions(null)
        setOptionAction(null)
        changeBag(null)
        setView(null)
    }

    const bagDeactivate=async ()=>{
        resetOptionBag()
        if(bagselected!=-1 || bagselected!=null){
            const token = getToken();
            const data = {_id:bagselected}
            const response = await deactivateBagId(data, token)
            if (!response.error) {
                setView(false)
                setViewCreate(false)
                changeBag(null)
                optionsSelect()
            } else {
                setError('Error al crear el proceso de selección')
            }
        }
    }

    
    if (Bag != null) {
        return <div className={styles.botonesBag}>
            <button className={`${styles.botonDestacado} ${styles.tomato}`} onClick={() => closeProcess()}>{(!offer)?'CERRAR PROCESO':`Quitar ${Bag.name}`}</button>
            {!schedule && !!Bag.userCv && Bag.userCv.length>0 && !offer &&<button className={`${styles.botonDestacado}`} onClick={() => scheduleInterview()}>COMENZAR ENTREVISTAS</button>}
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
                                {!offer && <button onClick={() => setOptionAction('deactivate')}>Desactivar proceso</button>}
                            </div>

                        }
                        {(optionAction == 'select' || optionAction == 'deactivate') &&
                            <div className={styles.contenedorSelect}>
                                <label htmlFor="bags">Selecciona un proceso</label>
                                <div>
                                    <select id='bags' name='bags' onChange={handleChangeSelected} value={bagselected}>
                                        <option key='selectBag' value={-1}>Selecciona una opción</option>
                                        {options.map((x) => {
                                            return <option value={x._id} key={`SelectBag${x._id}`}>{x.name}</option>
                                        })}
                                    </select>
                                </div>
                                <div>
                                    {(optionAction == 'deactivate') ? <button onClick={() => setConfirmDeactivate(true)}>Desactivar</button> : <button onClick={() => selectedBag()}>Seleccionar</button>}
                                    
                                    <button onClick={() => resetOptionBag()}>Atrás</button>
                                </div>
                                {confirmDeactivate && 
                                    <div className={styles.contenedorConfirmar}>
                                        <p>¿Estas seguro que quieres desactivar este proceso?</p>
                                        <p>Este acto es irreversible y eliminará todas las ofertas asociadas</p>
                                        <div >
                                            <button  onClick={() => bagDeactivate()}>Sí</button>
                                            <button className='tomato' onClick={() => setConfirmDeactivate(false)}>No</button>
                                        </div>
                                        
                                    </div>}
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
                                    <button onClick={() => resetOptionBag()}>Atrás</button>
                                </div>
                            </div>

                        }
                        <div>
                            <button className={styles.tomato} onClick={() => { viewBagEmployer(); resetOptionBag() }}>Cancelar</button>
                        </div>


                    </div>
                </div>
            }
        </div>
    }


}

export default BagCreate;