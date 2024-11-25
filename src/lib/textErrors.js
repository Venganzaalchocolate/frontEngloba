export const textErrors = (tipo) => {
    switch (tipo) {
        case "name":
        case "firstName":
        case "nombre":
            return "El nombre no es correcto, no debe contener números ni carácteres especiales y debe tener mínimo 3 carácteres";
        case "phone":
            return "El teléfono debe contener 9 números y no puede empezar por 0";
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
        case "job_title":
            return "El título no es correcto, no debe contener números ni carácteres especiales, debe tener mínimo 3 carácteres y máximo 100 ";
        case "location":
            return "La zona no es correcta, no debe contener números ni carácteres especiales, debe tener mínimo 3 carácteres y máximo 100 ";
        case "optionals_requirements":
        case "conditions":
        case "essentials_requirements":
            return "El texto no es correcto, carácteres permitidos (º:/()-), debe tener mínimo 3 carácteres y máximo 1000 ";
        case "fileError":
            return "El archivo no es válido, debe ser un pdf";
        case "dni":
            return "El DNI O NIE no es correcto"
        case "bankAccountNumber":
            return "El IBAN debe comenzar con 'ES' seguido de 22 dígitos y debe pasar la validación de control";
        case "socialSecurityNumber":
            return "El número de la seguridad social no es válido"
        case "payrollMonth":
            return "Debe ser un número entero entre 1 y 12"
        case "payrollYear":
            return "Debe tener el formato YYYY y estar comprendido entre el 2000 hasta el año actual"
        case "futureDate":
            return "La fecha no debe ser posterior a la fecha actual"
        default:
            return null;
    }
}

