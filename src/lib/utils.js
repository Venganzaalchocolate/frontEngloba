import { DateTime } from 'luxon';


export const formatDatetime=(date)=>{
    const dateAux=DateTime.fromISO(date, { zone: 'utc' })
    .toFormat('dd-MM-yyyy HH:mm:ss');
    return dateAux
}