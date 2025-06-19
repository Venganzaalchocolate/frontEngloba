import React, { useState, useMemo } from 'react';
 
import styles from '../styles/ManagingWorkspace.module.css';
import {
  wsInfoGroup, wsCreateGroup, wsAddMember, wsRemoveMember, wsDeleteGroup
} from '../../lib/data';
import { getToken } from '../../lib/serviceToken';
import FormWorkspaceGroup from './FormWorkspaceGroup';
import Tree from './Tree';


/* helpers -------------------------------------------------- */
const norm = (s) => (s ?? '').toLowerCase();

export default function ManagingWorkspace({ charge, enumsData, modal }) {
  /* -------- estado global -------- */
  const [progSel, setProgSel] = useState(null);  // programa seleccionado
  const [gProg, setGProg] = useState(null);  // grupo del programa
  const [gDev, setGDev] = useState(null);  // grupo del dispositivo
  const [selDev, setSelDev] = useState(null);  // dispositivo seleccionado
  const [search, setSearch] = useState('');
  const [formCfg, setFormCfg] = useState(null);  // {mode,scope,target}
 // clave = id/email del sub-grupo, valor = infoGroup completo
 const [openSubs, setOpenSubs] = useState({});

  /* -------- filtros -------- */
  const filtered = useMemo(() => {
    const t = norm(search);
    if (!t) return enumsData.programs;
    return enumsData.programs.filter(p =>
      norm(p.name).includes(t) ||
      norm(p.acronym).includes(t) ||
      (p.devices ?? []).some(d => norm(d.name).includes(t)));
  }, [enumsData.programs, search]);

  const programsByArea = useMemo(() => {
    const grp = {};
    filtered.forEach(p => (grp[p.area || 'Sin área'] ??= []).push(p));
    return Object.entries(grp).sort().map(([area, list]) => ({
      area,
      list: list.sort((a, b) => a.name.localeCompare(b.name, 'es')),
    }));
  }, [filtered]);

  /* -------- fetch grupo -------- */
  const fetchGroup = async (id, scope) => {
    charge(true);
    try {
      const info = await wsInfoGroup({ idGroup: id }, getToken());
      scope === 'Program'
        ? setGProg(info)
        : scope === 'Device'
          ? setGDev(info)
          : setGSub(info);          // scope === 'Sub'
    } catch (e) { modal('Error', e.message); }
    finally { charge(false); }
  }

 const openSubGroup = async (sg) => {
   const key = sg.id || sg.email;
   if(sg.id==gProg.id){
    setSelDev(null)
    setGDev(null)

   }

   // ¿ya está abierto? -> lo colapsamos
   if (openSubs[key]) {
     setOpenSubs(prev => {
       const next = { ...prev };
       delete next[key];
       return next;
     });
     return;
   }

   // si no, lo traemos y lo añadimos
   const info = await wsInfoGroup({ idGroup: key }, getToken());
   setOpenSubs(prev => ({ ...prev, [key]: info }));
 };

const handleDeleteSubMember = (email, subGroup) => {
  const key = subGroup.id || subGroup.email;

  // optimismo local
  setOpenSubs(prev => ({
    ...prev,
    [key]: {
      ...prev[key],
      miembros: prev[key].miembros.filter(m => m.email !== email)
    }
  }));

  crudFunction(
    { memberEmail: email, groupId: key },
    'deleteMember',
    'Sub'
  );
};

/* -------- open programa -------- */
const openProgram = (p) => {
  if (progSel?._id === p._id) {          // pulsas el mismo → colapsar
    setProgSel(null);
    setGProg(null);
    setSelDev(null);
    setGDev(null);
    setOpenSubs({});
    return;                              // 🚪 salimos: no seguimos
  }

  // abrir programa nuevo
  setProgSel(p);
  setSelDev(null);
  setGDev(null);
  setOpenSubs({});
  if (p.groupWorkspace) fetchGroup(p.groupWorkspace, 'Program');
  else                  setGProg(null);
};

/* -------- open device -------- */
const openDevice = (d) => {
  if (selDev?._id === d._id) {           // mismo dispositivo → colapsar
    setSelDev(null);
    setGDev(null);
    setOpenSubs({});
    return;                              // 🚪 salimos
  }

  // abrir dispositivo nuevo
  setSelDev(d);
  setOpenSubs({});
  if (d.groupWorkspace) fetchGroup(d.groupWorkspace, 'Device');
  else setGDev(null);
};

  /* -------- dispatcher para abrir modal -------- */
  const handleAction = (mode, scope, target) =>
    setFormCfg({ mode, scope, target });


  const handleDeleteGroup = (group, parentId, entityId, scope) => {
    crudFunction(
      {
        groupId: group.id || group.email, // id del grupo a eliminar
        idGroupFather: parentId,          // null cuando es grupo raíz
        id: entityId,                     // _id en Mongo
        type: scope === 'Program' ? 'program' : 'device',
      },
      'deleteGroup',
      scope
    );
  };

  const closeModal = () => {
    setFormCfg(null)
  }
  /* ========== helpers para la actualización optimista ========== */

  /* ---------- helpers optimistas ---------- */
  const addMember = (list = [], m) =>
    list.some(x => x.email === m.email) ? list : [...list, m];

  const delMember = (list = [], email) => list.filter(x => x.email !== email);

  const traverseGroups = (group, targetId, mutateFn) => {
    if (!group) return group;

    // caso eliminar: si éste ES el target y mutateFn devuelve null → lo quitamos
    if (group.id === targetId || group.email === targetId) {
      return mutateFn(group);             // puede devolver grupo modificado o null
    }

    if (!Array.isArray(group.miembros)) return group;

    const next = group.miembros
      .map(m => (m.type === 'GROUP' ? traverseGroups(m, targetId, mutateFn) : m))
      .filter(Boolean);                   // filtra nulls (sub-grupo eliminado)

    return next === group.miembros ? group : { ...group, miembros: next };
  };

  /* ---------- helpers sobre openSubs ---------- */
const addMemberOS = (os, key, m) => ({
  ...os,
  [key]: {
    ...os[key],
    miembros: addMember(os[key]?.miembros ?? [], m),
  },
});

const delMemberOS = (os, key, email) => ({
  ...os,
  [key]: {
    ...os[key],
    miembros: delMember(os[key]?.miembros ?? [], email),
  },
});

const addSubGroupOS = (os, parentKey, stub) => ({
  ...os,
  [parentKey]: {
    ...os[parentKey],
    miembros: addMember(os[parentKey]?.miembros ?? [], stub),
  },
});

const delSubGroupOS = (os, key, parentKey) => {
  const next = { ...os };
  delete next[key];                                   // elimina el hijo
  if (parentKey && next[parentKey]) {
    next[parentKey] = {
      ...next[parentKey],
      miembros: next[parentKey].miembros.filter(
        m => (m.id || m.email) !== key
      ),
    };
  }
  return next;
};

/* ---------- crudFunction ---------- */
const crudFunction = async (payload, mode, scope) => {
  charge(true);
  try {
    const token = getToken();
    let resp;

    if      (mode === 'createGroup')  resp = await wsCreateGroup (payload, token);
    else if (mode === 'addMember')    resp = await wsAddMember   (payload, token);
    else if (mode === 'deleteMember') resp = await wsRemoveMember(payload, token);
    else if (mode === 'deleteGroup')  resp = await wsDeleteGroup (payload, token);

    if (resp?.error) { modal('Error', resp.message); return; }

    /* ========== OPTIMISMO ========== */

    /* --- createGroup --- */
    if (mode === 'createGroup') {
      const stub = { ...resp, miembros: [], type: 'GROUP' };
      console.log(stub)
      if (payload.idGroupFather) {
        const inject = g => ({ ...g, miembros: addMember(g.miembros, stub) });
        setGProg(prev => traverseGroups(prev, payload.idGroupFather, inject));
        setGDev (prev => traverseGroups(prev, payload.idGroupFather, inject));

        /* refresca árbol si el padre está desplegado */
        setOpenSubs(os => addSubGroupOS(os, payload.idGroupFather, stub));
      } else {
        scope === 'Program' ? setGProg(stub) : setGDev(stub);
      }
    }

    /* --- addMember / deleteMember --- */
    if (mode === 'addMember' || mode === 'deleteMember') {
      const member = {
        email: payload.memberEmail,
        type : payload.memberType ?? 'USER',
        role : payload.role       ?? 'MEMBER',
      };
      const fn = g => ({
        ...g,
        miembros:
          mode === 'addMember'
            ? addMember(g.miembros, member)
            : delMember(g.miembros, payload.memberEmail),
      });
      setGProg(prev => traverseGroups(prev, payload.groupId, fn));
      setGDev (prev => traverseGroups(prev, payload.groupId, fn));

      /* sincroniza openSubs */
      setOpenSubs(os =>
        mode === 'addMember'
          ? addMemberOS(os, payload.groupId, member)
          : delMemberOS(os, payload.groupId, payload.memberEmail)
      );
    }

    /* --- deleteGroup --- */
    if (mode === 'deleteGroup') {
      const remover = () => null;
      setGProg(prev => traverseGroups(prev, payload.groupId, remover));
      setGDev (prev => traverseGroups(prev, payload.groupId, remover));

      setOpenSubs(os => delSubGroupOS(os, payload.groupId, payload.idGroupFather));
    }

    modal('Éxito', 'Operación realizada correctamente');
  } catch (e) {
    modal('Error', e.message);
  } finally {
    charge(false);
  }
};

 const handleAddMemberGroup = (group, scope) =>
  handleAction('addMember', scope, group);

const handleCreateSubGroup = (group) => {
  const isDevice = !!selDev;

  handleAction('createGroup', 'Sub', {
    ...group,
    owner: {
      id:   isDevice ? selDev._id : progSel._id,
      type: isDevice ? 'device'  : 'program',
    },
  });
};
  
  /* ================= render ================= */
return (
  <>
    <div className={styles.contenedor}>
      <div className={styles.contenido}>
        <header className={styles.titulo}><h2>GESTIÓN DE WORKSPACE</h2></header>

        {/* buscador */}
        <div className={styles.searchBox}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Buscar programa, acrónimo o dispositivo…" />
        </div>

        {/* LISTADO POR ÁREAS */}
        {programsByArea.map(({ area, list }) => (
          <section key={area} className={styles.areaBlock}>
            <h3 className={styles.areaTitle}>{area.toUpperCase()}</h3>

            <ul className={styles.programList}>
              {list.map(p => {
                const opened = progSel?._id === p._id;
                return (
                  <li key={p._id} className={styles.programItem}>
                    {/* CABECERA PROGRAMA */}
                    <div className={styles.programHeader} onClick={() => openProgram(p)}>
                      <h4>{p.acronym} — {p.name}</h4>
                      <span>{opened ? '▲' : '▼'}</span>
                    </div>

                    {/* CUERPO */}
                    {opened && gProg && (
                      <div className={styles.programBody}>
                        {/* PANEL GRUPOS */}
                        <section className={styles.groupPanel}>
                          <Tree
                            node={gProg}
                            onOpen={openSubGroup}
                            openSubs={openSubs}
                            onAddMember={g => handleAddMemberGroup(g, 'Sub')}
                            onRemoveUser={handleDeleteSubMember}
                            onRemoveGroup={g =>
                              handleDeleteGroup(g, gProg.id, p._id, 'Program')}
                            onCreateSub={handleCreateSubGroup}
                          />
                        </section>

                        {/* PANEL DISPOSITIVOS */}
                        <section className={styles.devicePanel}>
                          <h3>DISPOSITIVOS</h3>
                          {p.devices.map(d => {
                            const dOpen = selDev?._id === d._id;
                            return (
                              <div key={d._id} className={`${styles.deviceCard} ${dOpen ? styles.open : ''}`}>
                                <p role="button" onClick={() => openDevice(d)}>
                                  {d.name} {dOpen ? '▲' : '▼'}
                                </p>

                                {dOpen && gDev && (
                                  <Tree
                                    node={gDev}
                                    level={1}
                                    onOpen={openSubGroup}
                                    openSubs={openSubs}
                                    onAddMember={g => handleAddMemberGroup(g, 'Sub')}
                                    onRemoveUser={handleDeleteSubMember}
                                    onRemoveGroup={g =>
                                    handleDeleteGroup(g, gDev.id, d._id, 'Device')}
                                    onCreateSub={handleCreateSubGroup}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </section>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </div>
    </div>

    {/* modal */}
    {formCfg && (
      <FormWorkspaceGroup
        {...formCfg}
        closeModal={closeModal}
        crudWorkspace={crudFunction}
      />
    )}
  </>
);

}
