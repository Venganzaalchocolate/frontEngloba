import { useState, useEffect } from 'react';
import { getToken } from '../../../lib/serviceToken';
import { stgetworkershiredended, stgetworkerspie, stgetworkerspyramid, stgetworkerstenure, stgetworkersworkshift } from '../../../lib/data';


/**
 * Devuelve los 5 datasets extra del dashboard.
 *  - filters     → objeto con year, month, programId, deviceId, apafa
 *  - modal,charge→ helpers para UX (ya los usas en otros hooks)
 */
export default function useWorkersExtraStats(filters, modal, charge) {
  const [state, setState] = useState({
    pyramid     : null,
    pieGender   : null,
    hiredEnded  : null,
    workShift   : null,
    tenure      : null
  });

  useEffect(() => {
    (async () => {
      charge(true);
      try {
        const token = getToken();
        const [
          pyramid,
          pieGender,
          hiredEnded,
          workShift,
          tenure
        ] = await Promise.all([
          stgetworkerspyramid    (filters, token),
          stgetworkerspie        ({ ...filters, field:'gender' }, token),
          stgetworkershiredended (filters, token),
          stgetworkersworkshift  (filters, token),
          stgetworkerstenure     (filters, token)
        ]);

        
        if ([pyramid,pieGender,hiredEnded,workShift,tenure].some(r => r?.error)) {
          throw new Error('Respuesta incorrecta del servidor');
        }

        setState({ pyramid, pieGender, hiredEnded, workShift, tenure });

      } catch (err) {
        modal('Error', err.message || 'No se pudieron cargar estadísticas');
      } finally {
        charge(false);
      }
    })();
  }, [JSON.stringify(filters)]);   // stringify para que el efecto se dispare correctamente

  return state;
}
