import { useEffect, useState, useCallback } from "react";
import { getToken } from "../../lib/serviceToken";
import { preferentFilter, preferentCreate, preferentUpdate } from "../../lib/data"; // asumo que exportas ambas
import styles from "../styles/preferents.module.css";
import { FaSquarePlus } from "react-icons/fa6";
import ModalForm from "../globals/ModalForm";
import PreferentsList from "./PreferentList";
import ModalConfirmation from "../globals/ModalConfirmation";
import { buildOptionsFromIndex } from "../../lib/utils";

const PreferentsEmployee = ({ user, enumsData, modal, charge, authorized }) => {
  const [preferentsInfoUser, setPreferentsInfoUser] = useState([]);
  const [openModal, setOpenModal] = useState(false);
  const [editPref, setEditPref] = useState(null); // aquí guardas la preferencia a editar
  const [confirmDelete, setConfirmDelete] = useState(null); // id de la preferencia a borrar


  // Trae solo la primera vez
  useEffect(() => {
    const fetchPreferents = async () => {
      charge(true)
      const token = getToken();
      const data = await preferentFilter({ userId: user._id }, token);
      setPreferentsInfoUser(data);
      charge(false)
    };
    fetchPreferents();
  }, [user._id]);

  const toIds = (arr) =>
    Array.isArray(arr)
      ? arr.map(x => (typeof x === "string" ? x : x?._id)).filter(Boolean)
      : [];

  const buildFields = useCallback((pref) => {
    pref = pref || {};
      
        // Estudios (desde studiesIndex, preferimos solo subcategorías si existen)
        const provincesOptions = buildOptionsFromIndex(enumsData?.provincesIndex)
        // Puestos (desde jobsIndex, preferimos solo subcategorías si existen)
        const positionOptions =buildOptionsFromIndex(enumsData?.jobsIndex, { onlySub: true })




    return [
      { name: "section1", type: "section", label: `${user.firstName} ${user.lastName}` },
      {
        name: "jobs",
        label: "Cargo (puesto)",
        type: "multiChips",
        required: true,
        defaultValue: toIds(pref.jobs),     // tu helper para normalizar IDs
        options: [{ value: "", label: "Seleccione" }, ...positionOptions], // o directamente solo las reales
        placeholder: "Busca y añade 1 o varias opciones (puedes pulsar enter o hacer click)",
      },
      {
        name: "provinces",
        label: "Provincias",
        type: "multiChips",
        required: true,
        defaultValue: toIds(pref.provinces),
        options: [{ value: "", label: "Seleccione" }, ...provincesOptions],
        placeholder: "Busca y añade 1 o varias opciones (puedes pulsar enter o hacer click)",
      },
    ];
  }, [enumsData, user]);




  const handleSubmitPref = async (formData) => {
    let res;

      const token = getToken();
      // Llamada a tu endpoint POST /api/preferents
      formData['userId'] = user._id;
      formData["type"] = "traslado";
      formData['authorized'] = authorized;
      
      if (editPref) {
        formData['_id']=editPref._id
        const res = await preferentUpdate(formData, token);
        if (!res.error) {
          setPreferentsInfoUser(prev =>
            prev.map(p => p._id === res._id ? res : p)
          );
        }
      } else {
        const res = await preferentCreate(formData, token);
        if (!res.error) {
          setPreferentsInfoUser(prev => {
            // Desactiva el traslado activo anterior en local
            const prevUpdated = prev.map(p =>
              p.type === 'traslado' && p.active
                ? { ...p, active: false }
                : p
            );
            // Añade el nuevo traslado activo
            return [...prevUpdated, res];
          });
          modal('OK', `Petición de traslado ${(editPref) ? 'editada' : 'añadida'} correctamente`);
        } else{
         modal('Error', `Ha ocurrido un error y no se ha podido ${(editPref) ? 'editar' : 'añadir'} la petición de traslado`); 
        }
      }
      setOpenModal(false);
    
  };

  // ----------- ELIMINAR -------------
  const handleDelete = async (pref) => {
    // await preferentDelete(pref._id, token);
    setPreferentsInfoUser(arr => arr.filter(p => p._id !== pref._id));
    setConfirmDelete(null);
  };

  // --------- BOTÓN EDITAR -----------
  const handleEdit = (pref) => {
    setEditPref(pref);
    setOpenModal(true);
  };

  // --------- BOTÓN AÑADIR -----------
  const handleAdd = () => {
    setEditPref(null);
    setOpenModal(true);
  };

  return (
    <>
      <div className={styles.contenedor}>
        <h2>
          TRASLADOS Y REINCORPORACIONES&nbsp;
          {/* <FaSquarePlus onClick={handleAdd} style={{ cursor: "pointer" }} /> */}
        </h2>
        <PreferentsList
          preferentsInfoUser={preferentsInfoUser}
          onEdit={handleEdit}
          onDelete={setConfirmDelete}
          enumsData={enumsData}
        />
      </div>
      {openModal && (
        <ModalForm
          key={editPref ? `edit-${editPref._id}` : 'add'}
          title={editPref ? "Editar Preferencia" : "Añadir Petición de Traslado"}
          message="Seleccione cargos y provincias"
          fields={buildFields(editPref)}
          onSubmit={handleSubmitPref}
          onClose={() => { setOpenModal(false); setEditPref(null); }}
          modal={modal}
        />
      )}

      {confirmDelete && (
        <ModalConfirmation
          title="Eliminar preferencia"
          message="¿Seguro que quieres eliminar esta preferencia?"
          onConfirm={() => {
            handleDelete(confirmDelete);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </>

  );
};

export default PreferentsEmployee;
