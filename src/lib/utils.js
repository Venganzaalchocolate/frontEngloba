export const dateAndHour = (fechaString) => {
    // Crear un objeto Date a partir de la cadena
    let fecha = new Date(fechaString);

    // Obtener día, mes, año, hora y minutos
    let dia = fecha.getUTCDate();
    let mes = fecha.getUTCMonth() + 1; // Los meses van de 0 a 11, por eso se suma 1
    let anio = fecha.getUTCFullYear();
    let hora = fecha.getUTCHours();
    let minutos = fecha.getUTCMinutes();

    // Ajustar el formato DD/MM/AAAA hora:minuto
    let fechaFormateada = `${dia.toString().padStart(2, '0')}/${mes.toString().padStart(2, '0')}/${anio} ${hora.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;

    return fechaFormateada;
}

export const dateFormated=(date)=>{
    const datePart = date.split('T')[0]

    return datePart;
}