
const urlApi = import.meta.env.VITE_API_URL;


const fetchData = async (endpoint, method, token = null, body = null, isBlob = false) => {
    const url = `${urlApi}${endpoint}`;

    // Verificamos si el cuerpo es FormData para no añadir Content-Type
    const isFormData = body instanceof FormData;

    const options = {
        method,
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` }),
            // Solo añadimos 'Content-Type' si no es FormData
            ...(body && !isFormData && { 'Content-Type': 'application/json' }),
        },
        // Si es FormData, no lo convertimos a JSON
        ...(body && { body: isFormData ? body : JSON.stringify(body) })
    };

    try {
        const response = await fetch(url, options);

        // Verificar si la respuesta no fue exitosa
        if (!response.ok) {
            throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
        }

        // Manejo de blob si se espera un archivo
        if (isBlob) {
            
            return await response.blob(); // Devolver el blob si es un archivo
        }

        // Manejo de JSON para otro tipo de respuestas
        const data = await response.json();
        if (data.error) {
            return { error: true, message: data.error };
        }

        return data.data ? data.data : data; // Devolver el resultado o el objeto completo si no hay `data.data`

    } catch (error) {
        // Capturar errores de fetch o de lógica
        return { error: true, message: error.message };
    }
};



export const addEmployerBag = (datos, token) => fetchData('/addemployerbag', 'POST', token, datos);

export const deleteEmployerBag = (datos, token) => fetchData('/deleteemployerbag', 'POST', token, datos);

export const createBag = (datos, token) => fetchData('/createbag', 'POST', token, datos);

export const getBags = (token) => fetchData('/getbags', 'GET', token);

export const deactivateBagId = (datos, token) => fetchData('/bagdeactivate', 'POST', token, datos)

export const getPrograms = () => fetchData('/programs', 'GET');

export const tokenUser = async (token) => {
    const data = await fetchData('/validtoken', 'POST', token, { token });
    return data || { error: true, message: 'Token no valido' };
};

export const getData = () => fetchData('/infodata', 'GET');

export const getDataEmployer = () => fetchData('/infodataemployer', 'GET');


export const changeData = (token, datos) => fetchData('/changedata', 'PUT', token, datos);

export const deleteData = (token, datos) => fetchData('/deletedata', 'DELETE', token, datos);

export const createData = (token, datos) => fetchData('/createdata', 'POST', token, datos);

export const createSubData = (token, datos) => fetchData('/createsubcategory', 'POST', token, datos);

export const deleteSubData = (token, datos) => fetchData('/deletesubdata', 'DELETE', token, datos);

export const getCVs = async (id, token) => {
    const pdfBlob = await fetchData('/getFile', 'POST', token, { id }, true);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    return { url: pdfUrl };
};


export const getFile = async (id, token) => {
    const pdfBlob = await fetchData('/getFile', 'POST', token, { id }, true);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    return { url: pdfUrl };
};


export const deleteUserCv = (token, datos) => fetchData('/deleteusercv', 'DELETE', token, datos);

export const modifyUser = (dataUser) => fetchData('/modifyusercv', 'PUT', null, dataUser);


export const createEmployer = async (data, token) => {
    const formData = new FormData();

    // Campos de archivo que queremos subir
    const fileFields = [
        'cv', 'sexualOffenseCertificate', 'model145', 'firePrevention',
        'contract', 'employmentHistory', 'dataProtection', 'ethicalChannel', 'dniCopy'
    ];

    // Añadir los campos al FormData
    Object.keys(data).forEach(key => {
        if (fileFields.includes(key)) {
            // Si el campo es un archivo y existe, lo añadimos al FormData
            if (data[key] instanceof File) {
                formData.append(key, data[key], data[key].name);  // Agregar el archivo al FormData
            }
        } else if (key === 'hiringPeriods' || key === 'responsibleDevices') {
            // Serializar arrays y objetos antes de enviarlos
            formData.append(key, JSON.stringify(data[key]));
        } else {
            // Añadir los demás campos de texto
            formData.append(key, data[key] !== null ? data[key] : '');  // Manejar valores nulos
        }
    });

    const endpoint = '/createemployer';
    const method = 'POST';
    const url = `${urlApi}${endpoint}`;

    const options = {
        method,
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData
    };

    const response = await fetch(url, options);
    const result = await response.json();

    if (result.error) return result;
    return result.data;
};



export const getEmployers = (token) => fetchData('/users', 'GET', token)

export const loginUser = (email, password) => fetchData('/login', 'POST', null, { email, password });

export const getusercvs = (page, limit, filters, token) => fetchData('/usercvs', 'POST', token, { page, limit, ...filters });

export const getusers = (page, limit, filters, token) => fetchData('/users', 'POST', token, { page, limit, ...filters });
/*
export const editUser = async (data, token) => {
    const formData = new FormData();

    // Campos de archivo que queremos subir
    const fileFields = [
        'cv', 'sexualOffenseCertificate', 'model145', 'firePrevention',
        'contract', 'employmentHistory', 'dataProtection', 'ethicalChannel', 'dniCopy'
    ];


    // Añadir los campos al FormData
    Object.keys(data).forEach(key => {
        if (fileFields.includes(key)) {
            // Si el campo es un archivo y existe, lo añadimos al FormData
            if (data[key] instanceof File) {
                formData.append(key, data[key], data[key].name);  // Agregar el archivo al FormData
            }
        } else if (key === 'hiringPeriods' || key === 'responsibleDevices') {
            // Serializar arrays y objetos antes de enviarlos
            formData.append(key, JSON.stringify(data[key]));
        } else {
            // Añadir los demás campos de texto
            formData.append(key, data[key] !== null ? data[key] : '');  // Manejar valores nulos
        }
    });

    // Configuramos el fetch manualmente porque necesitamos modificar los encabezados y no podemos modificar fetchData
    const endpoint = '/modifyuser';
    const method = 'PUT';
    const url = `${urlApi}${endpoint}`;

    const options = {
        method,
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData // Se envía el FormData directamente
    };


    const response = await fetch(url, options);
    const result = await response.json();

    if (result.error) return result;
    return result.data;

}

*/
export const editUser = async (data, token) => {
    const formData = new FormData();

    // Campos de archivo que queremos subir
    const fileFields = [
        'cv', 'sexualOffenseCertificate', 'model145', 'firePrevention',
        'contract', 'employmentHistory', 'dataProtection', 'ethicalChannel', 'dniCopy'
    ];

    // Añadir los campos al FormData
    Object.keys(data).forEach(key => {
        if (fileFields.includes(key)) {
            // Si el campo es un archivo y existe, lo añadimos al FormData
            if (data[key] instanceof File) {
                formData.append(key, data[key], data[key].name);  // Agregar el archivo al FormData
            }
        } else if (key === 'hiringPeriods' || key === 'responsibleDevices') {
            // Serializar arrays y objetos antes de enviarlos
            formData.append(key, JSON.stringify(data[key]));
        } else if (key === 'vacationDays' || key === 'personalDays') {
            // Convertir fechas a cadenas ISO si son arrays de fechas
            const datesArray = data[key]?.map(date => (date instanceof Date ? date.toISOString() : date));
            formData.append(key, JSON.stringify(datesArray));
        } else {
            // Añadir los demás campos de texto
            formData.append(key, data[key] !== null ? data[key] : '');  // Manejar valores nulos
        }
    });

    // Configuramos el fetch manualmente porque necesitamos modificar los encabezados y no podemos modificar fetchData
    const endpoint = '/modifyuser';
    const method = 'PUT';
    const url = `${urlApi}${endpoint}`;

    const options = {
        method,
        headers: {
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: formData // Se envía el FormData directamente
    };

    const response = await fetch(url, options);
    const result = await response.json();

    if (result.error) return result;
    return result.data;
};


// BORRAR
export const createUserTest = () => fetchData('/createusertest', 'GET');
//

export const sendFormCreateOffer = (datos, token) => fetchData('/createofferjob', 'POST', token, datos);

export const updateOffer = (datos, token) => fetchData('/modifyofferjob', 'PUT', token, datos);

export const getOfferJobs = () => fetchData('/offerjobs', 'GET');

export const getOfferJobId = (datos) => fetchData('/offerjob', 'POST', null, datos);

export const sendFormCv = async (dataForm, file, editUser = false) => {
    let userExist = await fetchData('/filterusercv', 'POST', null, (editUser ? { id: dataForm.id } : dataForm));

    if (!userExist || userExist.length === 0) {
        userExist = await fetchData('/createusercv', 'POST', null, dataForm);
    } else {
        dataForm['_id'] = userExist[0]._id;
        if (file) dataForm['numberCV'] = userExist[0].numberCV + 1;
        userExist = await fetchData('/modifyusercv', 'PUT', null, dataForm);
    }

    if (file && userExist && userExist._id) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('nameFile', userExist._id);

        const uploadUrl = `${urlApi}/uploadcv`;
        const uploadResponse = await fetch(uploadUrl, {
            method: 'POST',
            body: formData,
        });

        const uploadData = await uploadResponse.json();
        if (uploadData.error) return uploadData;
    }

    return userExist;
};

export const createProgram = (datos, token) => fetchData('/createprogram', 'POST', token, datos);

export const createDispositive = (dispositiveData, token) => fetchData('/createdispositive', 'POST', token, dispositiveData);

export const updateDispositive = (dispositiveData, token) => fetchData('/updatedevice', 'PUT', token, dispositiveData);

export const deleteDispositive = (dispositiveData, token) => fetchData('/deletedispositive', 'DELETE', token, dispositiveData);

export const getDispositive = (dispositiveData, token) => fetchData('/programs', 'POST', token, dispositiveData);

export const getDispositiveResponsable = (datos, token) => fetchData('/dispositiveresponsable', 'POST', token, datos);

export const deleteProgram = (datos, token) => fetchData('/deleteprogram', 'DELETE', token, datos);

export const updateProgram = (datos, token) => fetchData('/updateprogram', 'PUT', token, datos);

// payrolls
export const updatePayroll = async (data, token) => {
    const formData = new FormData();


    Object.keys(data).forEach(key => {
        // Si el campo es un archivo y existe, lo añadimos al FormData
        if (data[key] instanceof File) {
            formData.append(key, data[key], data[key].name);  // Agregar el archivo al FormData
        } else {
            // Añadir los demás campos de texto
            formData.append(key, data[key] !== null ? data[key] : '');  // Manejar valores nulos
        }
    });


    const endpoint = '/payroll';
    const method = 'POST';

    let result=null;
    // Usamos fetchData sin especificar el 'Content-Type' porque es un FormData

    if(data.type=='get'){
      result = await fetchData(endpoint, method, token, formData, true);
      if (result.error) return result;
    } 
    else result = await fetchData(endpoint, method, token, formData);
    console.log(result)
    return result;
};

export const hirings=async(data,token)=>fetchData('/hirings', 'POST', token, data)

