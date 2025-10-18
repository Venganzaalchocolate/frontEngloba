// src/components/employer/HiringPeriodsV2.jsx
import { useEffect, useMemo, useState, useCallback } from 'react';
import styles from '../styles/hiringperiods.module.css';
import { FaTrashAlt, FaEdit, FaInfoCircle } from "react-icons/fa";
import { FaSquarePlus } from "react-icons/fa6";
import ModalForm from '../globals/ModalForm';
import ModalConfirmation from '../globals/ModalConfirmation';
import { useLogin } from '../../hooks/useLogin.jsx';
import { getToken } from '../../lib/serviceToken.js';

// API
import {
  hiringList,
  hiringCreate,
  hiringUpdate,
  hiringClose,
  hiringHardDelete,
  leaveList,
  leaveCreate,
  leaveUpdate,
  leaveClose,
  leaveHardDelete,
  preferentCreate,
} from '../../lib/data';
import { formatDate } from '../../lib/utils.js';

/* -------------------- helpers -------------------- */
const todayYMD = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const fmt = (d) => (d ? new Date(d).toLocaleDateString() : '—');
const isPeriodOpen = (hp) => hp.active !== false && !hp.endDate;
const isValidObjectId = (s) => typeof s === 'string' && /^[0-9a-fA-F]{24}$/.test(s);

/* ==================================================
   Componente
================================================== */
export default function HiringPeriodsV2({
  user,
  modal,
  charge,
  enumsData,
  chargeUser,
}) {
  const token = getToken();
  const { logged } = useLogin();
  const canEdit = logged?.user?.role === 'global' || logged?.user?.role === 'root';

  // Acepta user.status o user.employmentStatus
  const statusField = (user?.employmentStatus ?? user?.status) || '';
  const userStatusActive = statusField !== 'ya no trabaja con nosotros';

  const [periods, setPeriods] = useState([]);

  // UI/busy
  const [isBusy, setIsBusy] = useState(false);

  // Modales / contexto
  const [showCreateHiring, setShowCreateHiring] = useState(false);
  const [editHiring, setEditHiring] = useState(null);
  const [closeHiringCtx, setCloseHiringCtx] = useState(null);   // { hiringId }
  const [confirmDeleteHiringId, setConfirmDeleteHiringId] = useState(null);

  const [infoLeaveData, setInfoLeaveData] = useState(null);
  const [showInfoModal, setShowInfoModal] = useState(false);

  // Leaves por periodo (clave: String(periodId))
  const [openLeaves, setOpenLeaves] = useState({});
  const [leavesLoading, setLeavesLoading] = useState({});
  const [leavesByPeriod, setLeavesByPeriod] = useState({});
  const [createLeaveCtx, setCreateLeaveCtx] = useState(null);   // { periodId }
  const [editLeave, setEditLeave] = useState(null);             // { ...leave, periodId }
  const [closeLeaveCtx, setCloseLeaveCtx] = useState(null);     // { leaveId }

  // Reincorporación
  const [rejoinCtx, setRejoinCtx] = useState(null);             // { periodId, leave }
  const [rejoinConfirm, setRejoinConfirm] = useState(null);

  const [openModalPreferents, setOpenModalPreferents] = useState(false);

  /* -------------------- cargar periodos -------------------- */
  useEffect(() => {
    const fetchHiring = async () => {
      if (!user?._id) return;
      try {
        charge?.(true);
        const res = await hiringList({ userId: user._id, page: 1, limit: 200 }, token);
        console.log(res)
        if (res?.error) throw new Error(res.message || 'No se pudo cargar periodos');
        setPeriods(res.docs || []);
      } catch (e) {
        modal?.('Error', e.message || 'Error cargando periodos');
      } finally {
        charge?.(false);
      }
    };
    fetchHiring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?._id]);



  /* -------------------- helpers enums -------------------- */
  const objectValues = (o) => (o && typeof o === 'object' ? Object.values(o) : []);

  const buildJobOptions = useCallback(() => {
    const out = [];
    if (Array.isArray(enumsData?.jobs)) {
      enumsData.jobs.forEach(job => {
        if (Array.isArray(job.subcategories) && job.subcategories.length) {
          job.subcategories.forEach(sub => out.push({ value: String(sub._id), label: sub.name }));
        } else {
          out.push({ value: String(job._id), label: job.name });
        }
      });
    } else if (enumsData?.jobsIndex) {
      Object.entries(enumsData.jobsIndex).forEach(([rootId, job]) => {
        if (Array.isArray(job.subcategories) && job.subcategories.length) {
          job.subcategories.forEach(sub => out.push({ value: String(sub._id), label: sub.name }));
        } else {
          out.push({ value: String(rootId), label: job.name });
        }
      });
    }
    return out;
  }, [enumsData]);

  const buildProvinceOptions = useCallback(() => {
    const out = [];
    if (Array.isArray(enumsData?.provinces)) {
      enumsData.provinces.forEach(p => {
        if (Array.isArray(p.subcategories) && p.subcategories.length) {
          p.subcategories.forEach(sub => out.push({ value: String(sub._id), label: sub.name }));
        } else {
          out.push({ value: String(p._id), label: p.name });
        }
      });
    } else if (enumsData?.provincesIndex) {
      Object.entries(enumsData.provincesIndex).forEach(([id, meta]) => {
        out.push({ value: String(id), label: meta.name });
      });
    }
    return out;
  }, [enumsData]);

  /* -------------------- helpers nombres/ids -------------------- */
  const getProgramById = (id) => enumsData?.programsIndex[id] || null;
  const getProgramOfDevice = (deviceId) => enumsData?.dispositiveIndex[deviceId]?.program || '';
  const getProgramDisplay = (programId) => {
    const p = getProgramById(programId);
    if (!p) return '—';
    return p.acronym ? `${p.name} (${p.acronym})` : p.name;
  };
  const getProgramShort = (programId) => {
    const p = getProgramById(programId);
    return p?.acronym || p?.name || '';
  };

  const getDeviceName = (id) =>{
    return enumsData?.dispositiveIndex[id]?.name || 'No  disponible';
  } 
  const getDeviceProvince = (id) => enumsData?.dispositiveIndex[id]?.province || '';

  const getPositionName = (id) => {
    const key = String(id || '');
    if (!key) return 'No asignado';
    const jr = enumsData?.jobsIndex[key];
    if (jr?.name) return jr.name;
    if (enumsData?.jobsIndex) {
      for (const [, j] of Object.entries(enumsData.jobsIndex)) {
        const sub = (j.subcategories || []).find(sc => String(sc._id) === key);
        if (sub) return sub.name;
      }
    }
    const arr = enumsData?.jobs || [];
    const hit = arr.flatMap(j => (j.subcategories?.length ? j.subcategories : [j]))
      .find(x => String(x._id) === key);
    return hit?.name || 'No asignado';
  };

  const getLeaveTypeName = (id) => {
    const key = String(id || '');
    if (Array.isArray(enumsData?.leavetype)) {
      return enumsData.leavetype.find(lt => String(lt._id) === key)?.name || 'No especificado';
    }
    return enumsData?.leavesIndex?.[key]?.name || 'No especificado';
  };

  /* -------------------- opciones selects -------------------- */
  const positionOptions = useMemo(
    () => [{ value: '', label: 'Seleccione un puesto' }, ...buildJobOptions()],
    [buildJobOptions]
  );

  const scheduleOptions = useMemo(() => {
    const list = Array.isArray(enumsData?.work_schedule) ? enumsData.work_schedule : [];
    return [{ value: '', label: 'Seleccione un horario' }, ...list.map(s => ({ value: String(s._id), label: s.name }))];
  }, [enumsData?.work_schedule]);

  const deviceOptions = useMemo(() => {
    const out = [{ value: '', label: 'Seleccione un dispositivo' }];
    const dict = enumsData?.dispositiveIndex || {};
    const arr = objectValues(dict).map(d => {
      const short = getProgramShort(d.program);
      const label = short ? `${d.name} — ${short}` : d.name;
      return { value: String(d._id), label, sortKey: `${short} ${d.name}`.trim() };
    });
    arr.sort((a, b) => a.sortKey.localeCompare(b.sortKey, 'es'));
    return [...out, ...arr];
  }, [enumsData?.dispositiveIndex]);

  const leaveTypeOptions = useMemo(() => {
    const out = [{ value: '', label: 'Selecciona una opción' }];
    if (Array.isArray(enumsData?.leavetype)) {
      enumsData.leavetype.forEach(lt => out.push({ value: String(lt._id), label: lt.name }));
    } else if (enumsData?.leavesIndex) {
      Object.entries(enumsData.leavesIndex)
        .forEach(([id, meta]) => out.push({ value: String(id), label: meta?.name || '—' }));
    }
    return out;
  }, [enumsData]);

  const voluntaryLeaveIds = useMemo(() => {
    if (Array.isArray(enumsData?.leavetype)) {
      return enumsData.leavetype
        .filter(lt => lt?.name?.toLowerCase().includes('voluntari'))
        .map(lt => String(lt._id));
    }
    if (enumsData?.leavesIndex) {
      return Object.entries(enumsData.leavesIndex)
        .filter(([, meta]) => meta?.name?.toLowerCase().includes('voluntari'))
        .map(([id]) => String(id));
    }
    return [];
  }, [enumsData]);

  const isExcedenciaVoluntaria = (leaveTypeId) => voluntaryLeaveIds.includes(String(leaveTypeId));

  /* -------------------- crear / editar periodo -------------------- */
  const openCreateHiring = () => {
    if (!userStatusActive) {
      modal?.('Error al Crear', 'No se puede crear un periodo si el estado laboral es "Ya no trabaja con nosotros"');
      return;
    }
    setShowCreateHiring(true);
  };

  const createHiringFields = [
    { name: 'startDate', label: 'Fecha de Inicio', type: 'date', required: true },
    { name: 'endDate', label: 'Fecha de Fin', type: 'date' },
    { name: 'dispositiveId', label: 'Dispositivo', type: 'select', required: true, options: deviceOptions },
    {
      name: 'workShift.type', label: 'Jornada', type: 'select', required: true,
      options: [
        { value: '', label: 'Seleccione un tipo de jornada' },
        { value: 'completa', label: 'Completa' },
        { value: 'parcial', label: 'Parcial' }
      ]
    },
    {
      name: 'workShift.schedule', label: 'Horario', type: 'select', required: false, options: scheduleOptions
    },
    { name: 'position', label: 'Puesto', type: 'select', required: true, options: positionOptions },
    { name: 'reason.dni', label: 'DNI de sustitución (opcional)', type: 'text' },
  ];

  const handleCreateHiring = async (form) => {
    if (form.endDate && new Date(form.startDate) > new Date(form.endDate)) {
      modal?.('Error', 'La fecha de fin no puede ser anterior al inicio');
      return;
    }
    if (!isValidObjectId(String(form.dispositiveId || ''))) {
      modal?.('Falta dato', 'Selecciona un dispositivo válido.');
      return;
    }
    if (!isValidObjectId(String(form.position || ''))) {
      modal?.('Falta dato', 'Selecciona un puesto válido.');
      return;
    }
    try {
      setIsBusy(true); charge?.(true);
      const payload = {
        idUser: user._id,
        startDate: form.startDate || null,
        endDate: form.endDate || undefined,
        dispositiveId: form.dispositiveId || null,
        workShift: {
          type: form['workShift.type'] || '',
          schedule: form['workShift.schedule'] || undefined,
        },
        position: form.position || null,
        reason: form['reason.dni'] ? { dni: form['reason.dni'] } : undefined,
      };
      const created = await hiringCreate(payload, token);
      if (created?.error) throw new Error(created.message || 'No se pudo crear el periodo');
      setPeriods(prev => [created, ...prev].sort((a, b) => new Date(b.startDate) - new Date(a.startDate)));
      setShowCreateHiring(false);
      modal?.('Periodo de contratación', 'Periodo de contratación creado correctamente');
      chargeUser?.();
    } catch (e) {
      modal?.('Error', e.message);
    } finally {
      charge?.(false); setIsBusy(false);
    }
  };

  const openEditHiring = (hp) => {
    if (!userStatusActive) {
      modal?.('Error al Editar', 'No se puede editar un periodo si el estado laboral es "Ya no trabaja con nosotros"');
      return;
    }
    setEditHiring(hp);
  };

  const resolveScheduleDefault = (h) => {
    const raw = h?.workShift?.schedule;
    if (!raw) return '';
    // Puede venir como id, nombre o {_id, name}
    const list = Array.isArray(enumsData?.work_schedule) ? enumsData.work_schedule : [];
    if (typeof raw === 'string') {
      if (list.some(ws => String(ws._id) === raw)) return raw;
      const hit = list.find(ws => ws.name === raw);
      return hit ? String(hit._id) : '';
    }
    if (typeof raw === 'object') return String(raw._id || '');
    return '';
  };

  const editHiringFields = editHiring ? [
    {
      name: 'startDate', label: 'Fecha de Inicio', type: 'date', required: true,
      defaultValue: editHiring.startDate ? new Date(editHiring.startDate).toISOString().split('T')[0] : ''
    },
    {
      name: 'endDate', label: 'Fecha de Fin', type: 'date',
      defaultValue: editHiring.endDate ? new Date(editHiring.endDate).toISOString().split('T')[0] : ''
    },
    {
      name: 'dispositiveId', label: 'Dispositivo', type: 'select', required: true,
      defaultValue: editHiring.dispositiveId || '', options: deviceOptions
    },
    {
      name: 'workShift.type', label: 'Jornada', type: 'select', required: true,
      defaultValue: editHiring.workShift?.type || '',
      options: [
        { value: '', label: 'Seleccione un tipo de jornada' },
        { value: 'completa', label: 'Completa' },
        { value: 'parcial', label: 'Parcial' }
      ]
    },
    {
      name: 'workShift.schedule', label: 'Horario', type: 'select',
      defaultValue: resolveScheduleDefault(editHiring),
      options: scheduleOptions
    },
    {
      name: 'position', label: 'Puesto', type: 'select', required: true,
      defaultValue: editHiring.position || '', options: positionOptions
    },
    { name: 'reason.dni', label: 'DNI de sustitución (opcional)', type: 'text', defaultValue: editHiring?.reason?.dni || '' },
  ] : [];

  const handleUpdateHiring = async (form) => {
    if (form.endDate && form.startDate && new Date(form.startDate) > new Date(form.endDate)) {
      modal?.('Error', 'La fecha de fin no puede ser anterior al inicio');
      return;
    }
    try {
      setIsBusy(true); charge?.(true);
      const patch = {
        hiringId: editHiring._id,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        dispositiveId: form.dispositiveId || undefined,
        position: form.position || undefined,
        workShift: (form['workShift.type'] || form['workShift.schedule'])
          ? { type: form['workShift.type'] || editHiring?.workShift?.type || '', schedule: form['workShift.schedule'] || undefined }
          : undefined,
        reason: form['reason.dni'] ? { dni: form['reason.dni'] } : undefined,
      };
      const updated = await hiringUpdate(patch, token);
      if (updated?.error) throw new Error(updated.message || 'No se pudo actualizar el periodo');
      setPeriods(prev => prev.map(p => String(p._id) === String(updated._id) ? updated : p));
      setEditHiring(null);
      modal?.('Periodo guardado', 'Periodo actualizado con éxito');
      chargeUser?.();
    } catch (e) {
      modal?.('Error', e.message);
    } finally {
      charge?.(false); setIsBusy(false);
    }
  };

  /* -------------------- cierres -------------------- */

  // Cierra bajas abiertas del periodo con fecha segura. Excluye una leave opcional.
  const closeAllLeavesForPeriod = useCallback(
    async (rawPeriodId, endDateISO, excludeLeaveId = null) => {
      const periodId = String(rawPeriodId);
      const endRef = new Date(endDateISO);

      const res = await leaveList({ periodId, openOnly: true, page: 1, limit: 500 }, token);
      const leaves = res?.docs || [];

      let closed = 0, failed = 0;

      for (const l of leaves) {
        if (String(l._id) === String(excludeLeaveId)) continue;

        const start = new Date(l.startLeaveDate);
        const effectiveIso =
          endRef >= start
            ? endDateISO
            : new Date(l.startLeaveDate).toISOString().split('T')[0];

        try {
          const closedLeave = await leaveClose(
            { leaveId: l._id, actualEndLeaveDate: effectiveIso, active: false },
            token
          );
        
          if (!closedLeave?.error) {
            setLeavesByPeriod(prev => {
              const pid = String(periodId);
              const prevArr = prev[pid] || [];
              const nextArr = prevArr.length ? prevArr.map(x => (String(x._id) === String(closedLeave._id) ? { ...closedLeave, periodId: pid } : x))
                : [{ ...closedLeave, periodId: pid }];
              return { ...prev, [pid]: nextArr };
            });
            closed++;
          } else failed++;
        } catch {
          failed++;
        }
      }
      return { closed, failed };
    },
    [token]
  );

  const handleCloseHiring = async (form) => {
    const endDateISO = form.closeDate;
    setCloseHiringCtx(null);
    setIsBusy(true); charge?.(true);

    try {
      const res = await hiringClose({ hiringId: closeHiringCtx.hiringId, endDate: endDateISO }, token);
      if (res?.error) throw new Error(res.message || 'No se pudo cerrar el periodo');

      setPeriods(prev => prev.map(p => String(p._id) === String(res._id) ? res : p));

      const { closed, failed } = await closeAllLeavesForPeriod(res._id, endDateISO);

      if (failed === 0) {
        modal?.('Periodo cerrado', `Se cerró el periodo. Bajas cerradas: ${closed}.`);
      } else {
        modal?.('Periodo cerrado con Incidencias', `Se cerró el periodo. Bajas cerradas: ${closed}. Fallos: ${failed} baja(s).`);
      }

      chargeUser?.();
    } catch (e) {
      modal?.('Error', e.message);
    } finally {
      charge?.(false); setIsBusy(false);
    }
  };

  // Eliminar PERMANENTEMENTE un periodo (y sus bajas en backend)
  const doHardDeleteHiring = async () => {
    const targetId = String(confirmDeleteHiringId);
    try {
      setIsBusy(true);
      charge?.(true);

      const res = await hiringHardDelete({ hiringId: targetId }, token);
      if (res?.error || res?.deleted !== true) {
        throw new Error(res?.message || 'No se pudo eliminar el periodo');
      }

      setPeriods((prev) => prev.filter((p) => String(p._id) !== targetId));

      setLeavesByPeriod((prev) => {
        const { [targetId]: _omit, ...rest } = prev;
        return rest;
      });
      setOpenLeaves((prev) => {
        const { [targetId]: _omit, ...rest } = prev;
        return rest;
      });
      setLeavesLoading((prev) => {
        const { [targetId]: _omit, ...rest } = prev;
        return rest;
      });

      setConfirmDeleteHiringId(null);
      chargeUser?.();
      modal?.('Periodo eliminado', 'Periodo eliminado permanentemente.');
    } catch (e) {
      modal?.('Error', e.message);
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };


  /* -------------------- sustitución: info -------------------- */
  const openInfoSustitucion = (hp) => {
    const { leave, personDni, personName } = hp?.replacement || {};
    setInfoLeaveData({
      name: personName || 'Empleado sustituido',
      dni: personDni || '',
      startLeaveDate: formatDate(leave?.startLeaveDate) || '—',
      expectedEndLeaveDate: formatDate(leave?.expectedEndLeaveDate) || '—',
      reason: leave?.typeName,
      fin: (leave?.finished) ? 'si' : 'no'
    });
    setShowInfoModal(true);
  };

  /* -------------------- bajas: carga perezosa -------------------- */
  const toggleLeaves = (rawPeriodId) => {
    const periodId = String(rawPeriodId);
    setOpenLeaves(prev => {
      const willOpen = !prev[periodId];

      if (willOpen && !leavesByPeriod[periodId]) {
        setLeavesLoading(s => ({ ...s, [periodId]: true }));
        leaveList({ periodId, page: 1, limit: 200 }, token)
          .then(res => {
            if (res?.error) throw new Error(res.message);
            const docs = (res.docs || []).map(l => ({ ...l, periodId }));
            setLeavesByPeriod(b => ({ ...b, [periodId]: docs }));
          })
          .catch(e => modal?.('Error', e.message || 'No se pudieron cargar las bajas/excedencias'))
          .finally(() => setLeavesLoading(s => ({ ...s, [periodId]: false })));
      }

      return { ...prev, [periodId]: willOpen };
    });
  };

  /* -------------------- crear / editar / cerrar baja -------------------- */
  const createLeaveFields = [
    { name: 'leaveType', label: 'Tipo de Baja/Excedencia', type: 'select', required: true, options: leaveTypeOptions },
    { name: 'startLeaveDate', label: 'Fecha de Inicio', type: 'date', required: true },
    { name: 'expectedEndLeaveDate', label: 'Fecha Prevista de Fin', type: 'date', required: true },
    { name: 'actualEndLeaveDate', label: 'Fecha Real de Fin', type: 'date' },
  ];

  const handleCreateLeave = async (form) => {
    try {
      setIsBusy(true); charge?.(true);
      const pid = String(createLeaveCtx.periodId);
      const payload = {
        idUser: user._id,
        idPeriod: pid,
        leaveType: form.leaveType,
        startLeaveDate: form.startLeaveDate,
        expectedEndLeaveDate: form.expectedEndLeaveDate || undefined,
        actualEndLeaveDate: form.actualEndLeaveDate || undefined,
        active: true,
      };
      const created = await leaveCreate(payload, token);
      if (created?.error) throw new Error(created.message || 'No se pudo crear la baja/excedencia');

      setLeavesByPeriod(prev => ({
        ...prev,
        [pid]: [{ ...created, periodId: pid }, ...(prev[pid] || [])]
          .sort((a, b) => new Date(b.startLeaveDate) - new Date(a.startLeaveDate))
      }));
      setCreateLeaveCtx(null);
      modal?.('Baja/Excedencia', 'Baja/Excedencia creada correctamente');
    } catch (e) {
      modal?.('Error', e.message);
    } finally {
      charge?.(false); setIsBusy(false);
    }
  };

  const editLeaveFields = editLeave ? [
    {
      name: 'startLeaveDate', label: 'Fecha de Inicio', type: 'date', required: true,
      defaultValue: editLeave.startLeaveDate ? new Date(editLeave.startLeaveDate).toISOString().split('T')[0] : ''
    },
    {
      name: 'expectedEndLeaveDate', label: 'Fecha Prevista de Fin', type: 'date',  required: true,
      defaultValue: editLeave.expectedEndLeaveDate ? new Date(editLeave.expectedEndLeaveDate).toISOString().split('T')[0] : ''
    },
    {
      name: 'actualEndLeaveDate', label: 'Fecha Real de Fin', type: 'date',
      defaultValue: editLeave.actualEndLeaveDate ? new Date(editLeave.actualEndLeaveDate).toISOString().split('T')[0] : ''
    },
    {
      name: 'leaveType', label: 'Tipo de Baja/Excedencia', type: 'select', required: true,
      defaultValue: editLeave.leaveType || '', options: leaveTypeOptions
    },
  ] : [];

  const handleCloseLeave = async (form) => {
    try {
      setIsBusy(true); charge?.(true);
      const closeDateISO = form.closeDate;

      let found = null, periodId = null;
      for (const pid of Object.keys(leavesByPeriod)) {
        const l = (leavesByPeriod[pid] || []).find(x => String(x._id) === String(closeLeaveCtx.leaveId));
        if (l) { found = l; periodId = String(pid); break; }
      }
      if (!found || !periodId) throw new Error('No se encontró la baja/excedencia a cerrar');

      const isVol = isExcedenciaVoluntaria(found.leaveType);

      if (isVol) {
        const endDateForPeriod = new Date(found.startLeaveDate).toISOString().split('T')[0];
        const updatedPeriod = await hiringClose({ hiringId: periodId, endDate: endDateForPeriod }, token);
        if (!updatedPeriod?.error) {
          setPeriods(prev => prev.map(p => String(p._id) === String(updatedPeriod._id) ? updatedPeriod : p));
          await closeAllLeavesForPeriod(periodId, endDateForPeriod, found._id);
        }

        const closedLeave = await leaveClose(
          { leaveId: found._id, actualEndLeaveDate: closeDateISO, active: false },
          token
        );
        if (closedLeave?.error) throw new Error(closedLeave.message || 'No se pudo cerrar la excedencia');

        setLeavesByPeriod(prev => ({
          ...prev,
          [periodId]: (prev[periodId] || []).map(l => String(l._id) === String(closedLeave._id) ? { ...closedLeave, periodId } : l)
        }));
        setCloseLeaveCtx(null);
        modal?.('Excedencia', 'Excedencia voluntaria cerrada y periodo finalizado.');
      } else {
        const closedLeave = await leaveClose(
          { leaveId: found._id, actualEndLeaveDate: closeDateISO, active: false },
          token
        );
        if (closedLeave?.error) throw new Error(closedLeave.message || 'No se pudo cerrar la baja/excedencia');

        setLeavesByPeriod(prev => ({
          ...prev,
          [periodId]: (prev[periodId] || []).map(l => String(l._id) === String(closedLeave._id) ? { ...closedLeave, periodId } : l)
        }));
        setCloseLeaveCtx(null);
        modal?.('Baja/Excedencia', 'Baja/Excedencia cerrada');
      }
    } catch (e) {
      modal?.('Error', e.message);
    } finally {
      charge?.(false); setIsBusy(false);
    }
  };

  const handleUpdateLeave = async (form) => {
    try {
      setIsBusy(true); charge?.(true);
      const pid = String(editLeave.periodId);
      const patch = {
        leaveId: editLeave._id,
        startLeaveDate: form.startLeaveDate || undefined,
        expectedEndLeaveDate: form.expectedEndLeaveDate || undefined,
        actualEndLeaveDate: form.actualEndLeaveDate || undefined,
        leaveType: form.leaveType || undefined,
      };
      const updated = await leaveUpdate(patch, token);
      if (updated?.error) throw new Error(updated.message || 'No se pudo actualizar la baja/excedencia');

      setLeavesByPeriod(prev => ({
        ...prev,
        [pid]: (prev[pid] || []).map(l => String(l._id) === String(updated._id) ? { ...updated, periodId: pid } : l)
      }));
      setEditLeave(null);
      modal?.('Baja/Excedencia', 'Baja/Excedencia actualizada con éxito');
    } catch (e) {
      modal?.('Error', e.message);
    } finally {
      charge?.(false); setIsBusy(false);
    }
  };

  const handleHardDeleteLeave = async (leave) => {
    const targetId = String(leave?._id);
    try {
      setIsBusy(true);
      charge?.(true);

      const res = await leaveHardDelete({ leaveId: targetId }, token);
      if (res?.error || res?.deleted !== true) {
        throw new Error(res?.message || 'No se pudo eliminar la baja/excedencia');
      }

      const pid =
        String(leave?.periodId) ||
        Object.keys(leavesByPeriod).find((pid) =>
          (leavesByPeriod[pid] || []).some((l) => String(l._id) === targetId)
        ) ||
        null;

      if (pid) {
        setLeavesByPeriod((prev) => ({
          ...prev,
          [pid]: (prev[pid] || []).filter((l) => String(l._id) !== targetId),
        }));
      }

      modal?.('Baja/Excedencia', 'Baja/Excedencia eliminada permanentemente.');
    } catch (e) {
      modal?.('Error', e.message);
    } finally {
      charge?.(false);
      setIsBusy(false);
    }
  };

  /* -------------------- reincorporación -------------------- */
  const openRejoinModal = (periodId, leave) => setRejoinCtx({ periodId: String(periodId), leave });

  const handleRejoinSubmit = async (form) => {
    try {
      const { periodId, leave } = rejoinCtx || {};
      const period = periods.find(p => String(p._id) === String(periodId));
      if (!period) throw new Error('No se encontró el periodo');
      const deviceId=period?.dispositiveId ?? period?.dispositiveId
      const provinceId = getDeviceProvince(deviceId);
      if (!isValidObjectId(provinceId)) throw new Error('No se pudo resolver la provincia (_id).');
      if (!isValidObjectId(String(period.position))) throw new Error('No se pudo resolver el puesto (position).');

      const payload = {
        userId: user._id,
        provinces: [provinceId],
        jobs: [String(period.position)],
        type: 'reincorporacion',
        authorized: logged?.user?._id,
      };

      const inicioExc = leave?.startLeaveDate ? new Date(leave.startLeaveDate).toLocaleDateString() : 'la fecha de inicio de la excedencia';
      setRejoinConfirm({
        message:
          `Vas a registrar una reincorporación.\n\n` +
          `Se cerrará la excedencia voluntaria y también se cerrará el periodo ` +
          `con fecha de fin igual a ${inicioExc}.\n\n¿Deseas continuar?`,
        payload,
        periodId,
        leave,
        rejoinDateISO: form.rejoinDate,
      });
    } catch (e) {
      modal?.('Error', e.message || 'Error al preparar la reincorporación');
    }
  };

  const doConfirmRejoin = async () => {
    try {
      setIsBusy(true); charge?.(true);
      const { payload, periodId, leave, rejoinDateISO } = rejoinConfirm || {};
      if (!payload || !periodId || !leave) return;

      const pref = await preferentCreate(payload, token);
      if (pref?.error) throw new Error(pref.message || 'No se pudo registrar la reincorporación');

      const closedLeave = await leaveClose({ leaveId: leave._id, actualEndLeaveDate: rejoinDateISO, active: false }, token);
      if (closedLeave?.error) throw new Error(closedLeave.message || 'No se pudo cerrar la excedencia');
      setLeavesByPeriod(prev => ({
        ...prev,
        [periodId]: (prev[periodId] || []).map(l => String(l._id) === String(closedLeave._id) ? { ...closedLeave, periodId } : l),
      }));

      const endDateForPeriod = new Date(leave.startLeaveDate).toISOString().split('T')[0];
      const updatedPeriod = await hiringClose({ hiringId: periodId, endDate: endDateForPeriod }, token);
      if (updatedPeriod?.error) throw new Error(updatedPeriod.message || 'No se pudo cerrar el periodo');

      setPeriods(prev => prev.map(p => String(p._id) === String(updatedPeriod._id) ? updatedPeriod : p));
      
      const clossAll=await closeAllLeavesForPeriod(periodId, endDateForPeriod);
      
      modal?.('Reincorporación', 'Reincorporación registrada. Excedencia y periodo cerrados correctamente.');
      setRejoinCtx(null);
    } catch (e) {
      modal?.('Error', e.message || 'Error al procesar la reincorporación');
    } finally {
      setRejoinConfirm(null);
      charge?.(false); setIsBusy(false);
    }
  };

  const handleAdd = () => {
    if (currentPeriods.length === 0) {
      modal?.('No hay periodos abiertos', 'Debes tener al menos un periodo de contratación abierto para registrar una solicitud de traslado.');
      return;
    }
    setOpenModalPreferents(true);
  };

  /* -------------------- render -------------------- */
  const currentPeriods = periods.filter(isPeriodOpen);

  const pastPeriods = periods.filter(p => !isPeriodOpen(p)).sort((a, b) => new Date(b.startDate) - new Date(a.startDate));

  const [showPast, setShowPast] = useState(false);

  const labelForPeriod = (p) => {
    const ini = p.startDate ? new Date(p.startDate).toLocaleDateString() : '—';
    const dev = getDeviceName(p.dispositiveId) || 'Sin dispositivo';
    const pos = getPositionName(p.position) || 'Sin puesto';
    const progShort = getProgramShort(getProgramOfDevice(p.dispositiveId));
    const progTag = progShort ? ` — ${progShort}` : '';
    return `${ini} — ${dev}${progTag} — ${pos}`;
  };

  const toIds = (arr) => (Array.isArray(arr) ? arr.map(String) : []); // helper mínimo para chips

  const buildFields = useCallback((pref) => {
    pref = pref || {};
    const positionOptions = buildJobOptions();
    const provincesOptions = buildProvinceOptions();

    return [
      { name: "section1", type: "section", label: `${user.firstName} ${user.lastName}` },
      {
        name: "jobs",
        label: "Cargo (puesto)",
        type: "multiChips",
        required: true,
        defaultValue: toIds(pref.jobs),
        options: [{ value: "", label: "Seleccione" }, ...positionOptions],
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
  }, [enumsData, user, buildJobOptions, buildProvinceOptions]);

  const handleSubmitPref = async (formData) => {
    const token = getToken();

    formData.userId = user._id;
    formData.type = "traslado";
    formData.authorized = logged.user._id;

    let hiringsId = [];

    if (currentPeriods.length === 1) {
      hiringsId = [String(currentPeriods[0]._id)];
    } else {
      const choice = formData.associateScope; // '', 'ALL' o un ObjectId (string)
      if (choice === 'ALL') {
        hiringsId = [...currentPeriods]
          .sort((a, b) => new Date(b.startDate) - new Date(a.startDate))
          .slice(0, 2)
          .map(p => String(p._id));
      } else if (choice && /^[0-9a-fA-F]{24}$/.test(choice)) {
        hiringsId = [choice];
      } else {
        modal('Falta dato', 'Selecciona un periodo al que asociar la solicitud.');
        return;
      }
    }

    formData.hiringsId = hiringsId;

    const res = await preferentCreate(formData, token);
    if (!res?.error) {
      modal('OK', 'Petición de traslado añadida correctamente');
      setOpenModalPreferents(false);
    } else {
      modal('Error', res.message || 'Ha ocurrido un error y no se ha podido añadir la petición de traslado');
    }
  };

  const buildFieldsPreferents = useCallback(() => {
    const jobOpts = buildJobOptions();
    const provOpts = buildProvinceOptions();

    const periodOptions = currentPeriods.map((p) => ({
      value: String(p._id),
      label: labelForPeriod(p),
    }));

    const hasMany = currentPeriods.length > 1;

    const baseFields = [
      { name: "section1", type: "section", label: `${user.firstName} ${user.lastName}` },
      {
        name: "jobs",
        label: "Cargo (puesto)",
        type: "multiChips",
        required: true,
        defaultValue: [],
        options: [{ value: "", label: "Seleccione" }, ...jobOpts],
        placeholder: "Busca y añade uno o varios",
      },
      {
        name: "provinces",
        label: "Provincias",
        type: "multiChips",
        required: true,
        defaultValue: [],
        options: [{ value: "", label: "Seleccione" }, ...provOpts],
        placeholder: "Busca y añade una o varias",
      },
    ];

    if (!hasMany) return baseFields;

    return [
      ...baseFields,
      {
        name: "associateScope",
        label: "Asociar a periodo(s)",
        type: "select",
        required: true,
        defaultValue: "ALL",
        options: [
          { value: "", label: "Seleccione una opción" },
          ...periodOptions,
          { value: "ALL", label: "Todos los periodos abiertos" },
        ],
      },
    ];
  }, [enumsData, user, currentPeriods, buildJobOptions, buildProvinceOptions]);

  return (
    <div className={styles.contenedor}>
      <h2>
        PERIODOS DE CONTRATACIÓN
        {canEdit && <FaSquarePlus title="Añadir periodo" onClick={openCreateHiring} />}
        <button onClick={handleAdd} style={{ cursor: "pointer" }}> Crear solicitud de traslado</button>
      </h2>

      {currentPeriods.length === 0 && <p>No hay periodos de contratación activos.</p>}

      {currentPeriods.map(hp => {
        const pid = String(hp._id);
        const programDisplay = getProgramDisplay(getProgramOfDevice(hp.dispositiveId));
        return (
          <article key={pid} className={`${styles.cardPrincipal} ${hp.reason?.replacement ? styles.cardReplacement : ''}`}>
            <header className={styles.cardHeader}>
              <div className={styles.headerMain}>
                <h3 className={styles.cardTitle}>{hp.reason?.replacement ? 'Periodo de sustitución' : 'Periodo de contratación (actual)'}</h3>
                {hp?.replacement && (
                  <button className={styles.linkButton} onClick={() => openInfoSustitucion(hp)}>Ver información de sustitución</button>
                )}
              </div>
              {canEdit && isPeriodOpen(hp) && (
                <nav className={styles.headerActions} aria-label="Acciones del periodo">
                  <button disabled={isBusy} onClick={() => setCloseHiringCtx({ hiringId: pid })}>Cerrar periodo</button>
                  <FaEdit role="button" tabIndex={0} title="Editar periodo" className={styles.iconAction} onClick={() => openEditHiring(hp)} />
                  <FaTrashAlt role="button" tabIndex={0} title="Eliminar periodo" className={styles.iconActionDanger} onClick={() => setConfirmDeleteHiringId(pid)} />
                </nav>
              )}
            </header>

              <section className={styles.meta} aria-label="Información del periodo">
                <dl className={styles.metaGrid}>
                  <div><dt>Inicio</dt><dd className={styles.mono}>{fmt(hp.startDate)}</dd></div>
                  <div><dt>Fin</dt><dd className={styles.mono}>{fmt(hp.endDate)}</dd></div>
                  <div><dt>Dispositivo</dt><dd>{getDeviceName(hp.dispositiveId) }</dd></div>
                  <div><dt>Jornada</dt><dd>{hp.workShift?.type || '—'}</dd></div>
                  <div><dt>Puesto</dt><dd>{getPositionName(hp.position)}</dd></div>
                </dl>
              </section>

            <section className={styles.leaves} aria-label="Bajas o excedencias">
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                {openLeaves[pid] && <h4 className={styles.tituloBajas}>BAJAS O EXCEDENCIAS</h4>}
                <button className={styles.buttonBajas} onClick={() => toggleLeaves(pid)}>
                  {openLeaves[pid] ? 'Ocultar' : 'Mostrar Bajas y Excedencias'}
                </button>
                {openLeaves[pid] && (
                  <button className={styles.buttonBajas} onClick={() => setCreateLeaveCtx({ periodId: pid })}>
                    Añadir baja/excedencia
                  </button>
                )}
              </div>

              {openLeaves[pid] && (
                <>
                  {leavesLoading[pid] && <p>Cargando…</p>}
                  {!leavesLoading[pid] && (
                    <ul className={styles.leafList}>
                      <li className={styles.leafHeader} aria-hidden="true">
                        <span>Inicio</span><span>Prevista</span><span>Fin</span><span>Descripción</span><span>Acciones</span>
                      </li>

                      {(leavesByPeriod[pid] || []).map(leave => {
                        const isOpenLeave = leave.active !== false && !leave.actualEndLeaveDate;
                        return (
                          <li className={styles.leafRow} key={leave._id}>
                            <span className={`${styles.leafCell} ${styles.mono}`}>{fmt(leave.startLeaveDate)}</span>
                            <span className={`${styles.leafCell} ${styles.mono}`}>{fmt(leave.expectedEndLeaveDate)}</span>
                            <span className={`${styles.leafCell} ${styles.mono}`}>{fmt(leave.actualEndLeaveDate)}</span>
                            <span className={styles.leafCell}>{getLeaveTypeName(leave.leaveType)}</span>
                            <span className={`${styles.leafCell} ${styles.leafActions}`}>
                              <>
                                {isOpenLeave && <button disabled={isBusy} onClick={() => setCloseLeaveCtx({ leaveId: leave._id })}>Finalizar</button>}
                                {isOpenLeave && isExcedenciaVoluntaria(leave.leaveType) && (
                                  <button title="Reincorporación" disabled={isBusy} onClick={() => openRejoinModal(pid, leave)}>Reincorporación</button>
                                )}
                                <FaEdit role="button" tabIndex={0} title="Editar baja/excedencia" className={styles.iconAction} onClick={() => setEditLeave({ ...leave, periodId: pid })} />
                                {canEdit && <FaTrashAlt role="button" tabIndex={0} title="Eliminar baja/excedencia" className={styles.iconActionDanger} onClick={() => handleHardDeleteLeave({ ...leave, periodId: pid })} />}
                              </>
                            </span>
                          </li>
                        );
                      })}

                      {(leavesByPeriod[pid]?.length ?? 0) === 0 && (
                        <li className={styles.leafRow}><span>No hay bajas o excedencias</span></li>
                      )}
                    </ul>
                  )}
                </>
              )}
            </section>
          </article>
        );
      })}

      {/* Periodos anteriores */}
      {pastPeriods.length > 0 && (
        <div className={styles.pastWrapper}>
          <button className={styles.togglePast} aria-expanded={showPast} onClick={() => setShowPast(v => !v)}>
            {showPast ? 'Ocultar periodos anteriores' : `Mostrar periodos anteriores (${pastPeriods.length})`}
          </button>

          <div className={`${styles.pastPanel} ${showPast ? styles.pastOpen : ''}`} role="region" aria-label="Periodos anteriores">
            {showPast && pastPeriods.map(hp => {
              const pid = String(hp._id);

              return (
                <article key={pid} className={`${styles.card} ${hp.reason?.replacement ? styles.cardReplacement : ''}`}>
                  <header className={styles.cardHeader}>
                    <div className={styles.headerMain}>
                      <h3 className={styles.cardTitle}>{hp.reason?.replacement ? 'Periodo de sustitución' : 'Periodo de contratación (anterior)'}</h3>
                      {hp.reason?.replacement && <FaInfoCircle className={styles.iconAction} onClick={() => openInfoSustitucion(hp)} />}
                    </div>
                    {canEdit && (
                      <nav className={styles.headerActions} aria-label="Acciones del periodo">
                        <FaEdit role="button" tabIndex={0} title="Editar periodo" className={styles.iconAction} onClick={() => setEditHiring(hp)} />
                        <FaTrashAlt role="button" tabIndex={0} title="Eliminar periodo" className={styles.iconActionDanger} onClick={() => setConfirmDeleteHiringId(pid)} />
                      </nav>
                    )}
                  </header>

                  <section className={styles.meta} aria-label="Información del periodo">
                    <dl className={styles.metaGrid}>
                      <div><dt>Inicio</dt><dd className={styles.mono}>{fmt(hp.startDate)}</dd></div>
                      <div><dt>Fin</dt><dd className={styles.mono}>{fmt(hp.endDate)}</dd></div>
                      <div><dt>Dispositivo</dt><dd>{getDeviceName(hp.dispositiveId)}</dd></div>
                      <div><dt>Jornada</dt><dd>{hp.workShift?.type || '—'}</dd></div>
                      <div><dt>Puesto</dt><dd>{getPositionName(hp.position)}</dd></div>
                    </dl>
                  </section>

                  <section className={styles.leaves} aria-label="Bajas o excedencias">
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.5rem' }}>
                      {openLeaves[pid] && <h4 className={styles.tituloBajas}>BAJAS O EXCEDENCIAS</h4>}
                      <button className={styles.buttonBajas} onClick={() => toggleLeaves(pid)}>
                        {openLeaves[pid] ? 'Ocultar' : 'Mostrar Bajas y Excedencias'}
                      </button>
                    </div>
                    {openLeaves[pid] && (
                      <>
                        {leavesLoading[pid] && <p>Cargando…</p>}
                        {!leavesLoading[pid] && (
                          <ul className={styles.leafList}>
                            <li className={styles.leafHeader} aria-hidden="true">
                              <span>Inicio</span><span>Prevista</span><span>Fin</span><span>Descripción</span><span>Acciones</span>
                            </li>
                            {(leavesByPeriod[pid] || []).map(leave => (
                              <li className={styles.leafRow} key={leave._id}>
                                <span className={`${styles.leafCell} ${styles.mono}`}>{fmt(leave.startLeaveDate)}</span>
                                <span className={`${styles.leafCell} ${styles.mono}`}>{fmt(leave.expectedEndLeaveDate)}</span>
                                <span className={`${styles.leafCell} ${styles.mono}`}>{fmt(leave.actualEndLeaveDate)}</span>
                                <span className={styles.leafCell}>{getLeaveTypeName(leave.leaveType)}</span>
                                <span className={`${styles.leafCell} ${styles.leafActions}`}>
                                  <>
                                    <FaEdit role="button" tabIndex={0} title="Editar baja/excedencia" className={styles.iconAction} onClick={() => setEditLeave({ ...leave, periodId: pid })} />
                                    <FaTrashAlt role="button" tabIndex={0} title="Eliminar baja/excedencia" className={styles.iconActionDanger} onClick={() => handleHardDeleteLeave({ ...leave, periodId: pid })} />
                                  </>
                                </span>
                              </li>
                            ))}
                            {(leavesByPeriod[pid]?.length ?? 0) === 0 && (
                              <li className={styles.leafRow}><span>No hay bajas o excedencias</span></li>
                            )}
                          </ul>
                        )}
                      </>
                    )}
                  </section>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {/* --------- Modales --------- */}

      {showCreateHiring && (
        <ModalForm
          title="Añadir Periodo de Contratación"
          message="Completa los siguientes campos"
          fields={createHiringFields}
          onSubmit={handleCreateHiring}
          onClose={() => setShowCreateHiring(false)}
          modal={modal}
        />
      )}

      {editHiring && (
        <ModalForm
          title="Editar Periodo de Contratación"
          message="Modifica los campos necesarios"
          fields={editHiringFields}
          onSubmit={handleUpdateHiring}
          onClose={() => setEditHiring(null)}
          modal={modal}
        />
      )}

      {closeHiringCtx && (
        <ModalForm
          title="Cerrar periodo de contratación"
          message="Selecciona la fecha de fin del periodo."
          fields={[{ name: 'closeDate', label: 'Fecha', type: 'date', required: true, defaultValue: todayYMD() }]}
          onSubmit={handleCloseHiring}
          onClose={() => setCloseHiringCtx(null)}
          modal={modal}
        />
      )}

      {confirmDeleteHiringId && (
        <ModalConfirmation
          title="Eliminar periodo"
          message="¿Seguro que deseas eliminar PERMANENTEMENTE este periodo? (también se borrarán sus bajas)."
          onConfirm={doHardDeleteHiring}
          onCancel={() => setConfirmDeleteHiringId(null)}
        />
      )}

      {showInfoModal && infoLeaveData && (
        <ModalForm
          title="Información"
          message="Datos del periodo de baja/excedencia del trabajador sustituido"
          fields={[
            { name: 'name', label: 'Nombre', defaultValue: infoLeaveData.name || '', disabled: true },
            { name: 'dni', label: 'DNI', defaultValue: infoLeaveData.dni || '', disabled: true },
            { name: 'startLeaveDate', label: 'Inicio', defaultValue: infoLeaveData.startLeaveDate || '—', disabled: true },
            { name: 'expectedEndLeaveDate', label: 'Fin previsto', defaultValue: infoLeaveData.expectedEndLeaveDate || '—', disabled: true },
            { name: 'reason', label: 'Motivo', defaultValue: infoLeaveData.reason || '—', disabled: true },
            { name: 'fin', label: 'Terminada', defaultValue: infoLeaveData.fin || 'no', disabled: true }
          ]}
          onSubmit={() => setShowInfoModal(false)}
          onClose={() => setShowInfoModal(false)}
          modal={modal}
        />
      )}

      {createLeaveCtx && (
        <ModalForm
          title="Añadir Baja/Excedencia"
          message="Completa los siguientes campos"
          fields={createLeaveFields}
          onSubmit={handleCreateLeave}
          onClose={() => setCreateLeaveCtx(null)}
          modal={modal}
        />
      )}

      {editLeave && (
        <ModalForm
          title="Editar Baja/Excedencia"
          message="Modifica los campos necesarios"
          fields={editLeaveFields}
          onSubmit={handleUpdateLeave}
          onClose={() => setEditLeave(null)}
          modal={modal}
        />
      )}

      {closeLeaveCtx && (
        <ModalForm
          title="Cerrar baja/excedencia"
          message="Selecciona la fecha de fin real."
          fields={[{ name: 'closeDate', label: 'Fecha', type: 'date', required: true, defaultValue: todayYMD() }]}
          onSubmit={handleCloseLeave}
          onClose={() => setCloseLeaveCtx(null)}
          modal={modal}
        />
      )}

      {rejoinCtx && (
        <ModalForm
          title="Reincorporación por excedencia voluntaria"
          message="Indique la fecha de reincorporación."
          fields={[{ name: 'rejoinDate', label: 'Fecha de reincorporación', type: 'date', required: true, defaultValue: todayYMD() }]}
          onSubmit={handleRejoinSubmit}
          onClose={() => setRejoinCtx(null)}
          modal={modal}
        />
      )}

      {rejoinConfirm && (
        <ModalConfirmation
          title="Confirmar reincorporación"
          message={rejoinConfirm.message}
          onConfirm={doConfirmRejoin}
          onCancel={() => setRejoinConfirm(null)}
          
        />
      )}

      {openModalPreferents && (
        <ModalForm
          key={'add'}
          title={"Añadir Solicitud de Traslado"}
          message="Seleccione cargos y provincias"
          fields={buildFieldsPreferents()}
          onSubmit={handleSubmitPref}
          onClose={() => { setOpenModalPreferents(false); }}
          modal={modal}
        />
      )}
    </div>
  );
}
