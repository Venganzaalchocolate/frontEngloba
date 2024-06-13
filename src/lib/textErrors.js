export const textErrors = (tipo) => {
    switch (tipo) {
        case "name":
        case "nombre":
            return "El nombre no es correcto, no debe contener números ni carácteres especiales";
        case "from":
        case "email":
            return "El email no está bien escrito ej: email@gmail.com";
        case "password":
            return "8 carácteres, una minúscula, una mayúscula, un número y un carácter especial";
        case "direccion":
            return "La dirección no es correcta, no debe contener carácteres especiales ni tener mas de 200 carácteres";
        case "passwordR":
            return "La contraseña debe ser la misma"
        case "vacio":
            return "No puedes dejar el campo vacio";
        case "nombreDuplicado":
            return "El nombre de usuario ya existe, porfavor introduzca otro nombre";
        case "emailDuplicado":
            return "El email ya existe, porfavor inicie sesión";
        case "name":
            return "El nombre del juego no es correcto, tiene carácteres no permitidos";
        case "category":
            return "Debe seleccionar una opción válida";
        case "author":
            return "El autor no es correcto, no debe contener números ni carácteres especiales";
        case "publisher":
            return "El editor contiene caractéres no permitidos";
        case "numberOfPlayers":
            return "El número de jugadores debe ser un número entero mayor de 0";
        case "recommendedAge":
            return "La edad recomendada debe ser un número entero mayor de 0";
        case "duration":
            return "La duración debe ser un número entero mayor de 0, expresado en minutos";
        case "description":
            return "La descripción no es correcta, no debe contener carácteres especiales ni tener mas de 500 carácteres";
        case "price":
            return "El precio debe ser un número entero o decimal mayor que 0";
        case "stock":
            return "El stock debe ser un número entero igual o mayor que 0";
        case "subject":
            return "El asunto no es correcto, debe tener mínimo 10 carácteres y no debe contener carácteres especiales ni tener mas de 100 carácteres";
        case "message":
            return "El motivo no es correcto, debe tener mínimo 10 carácteres y no debe contener carácteres especiales ni tener mas de 500 carácteres";
        default:
            return null;
    }
}

