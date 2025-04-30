// utils/auditUtils.js

/**
 * Lee un valor de un objeto anidado a partir de un "path" con puntos
 */
export const getValue = (obj, path) =>
    path.split('.').reduce((o, key) => (o ? o[key] : undefined), obj);
  
  /**
   * Dado un periodo de dispositiveNow y el índice enumsData.programsIndex,
   * devuelve { programName, deviceName } muy rápidamente.
   */
  export const getDispositiveInfo = (period, programsIndex = {}) => {
    if (!period || !period.device) {
      return { programName: '', deviceName: '' };
    }
  
    // Nombre del dispositivo por lookup directo
    const deviceEntry = programsIndex[period.device];
    const deviceName = deviceEntry?.name || '';
  
    // Buscar el programa que contenga este dispositivo
    // (solo recorremos las entradas de tipo "program")
    const programEntry = Object.values(programsIndex).find(
      e => e.type === 'program' && Array.isArray(e.devices) &&
           e.devices.some(d => String(d._id) === String(period.device))
    );
    const programName = programEntry?.name || '';
  
    return { programName, deviceName };
  };
  