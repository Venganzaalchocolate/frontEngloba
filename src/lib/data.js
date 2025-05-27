
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
            const responseBody = await response.json();
            throw new Error(`Error en la solicitud: ${responseBody.message}`);
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



export const tokenUser = async (token) => {
    const data = await fetchData('/validtoken', 'POST', token, { token });
    return data || { error: true, message: 'Token no valido' };
};

// enums
export const getData = () => fetchData('/infodata', 'GET');
export const getDataEmployer = () => fetchData('/infodataemployer', 'GET');
export const changeData = (token, datos) => fetchData('/changedata', 'PUT', token, datos);
export const deleteData = (token, datos) => fetchData('/deletedata', 'DELETE', token, datos);
export const createData = (token, datos) => fetchData('/createdata', 'POST', token, datos);
export const createSubData = (token, datos) => fetchData('/createsubcategory', 'POST', token, datos);
export const deleteSubData = (token, datos) => fetchData('/deletesubdata', 'DELETE', token, datos);

//userCv
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
export const getFileUser= async (id, idFile, token) => {
    const pdfBlob = await fetchData('/fileuser', 'POST', token, { id, idFile }, true);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    return { url: pdfUrl };
};
export const deleteUserCv = (token, datos) => fetchData('/deleteusercv', 'DELETE', token, datos);
export const modifyUser = (dataUser) => fetchData('/modifyusercv', 'PUT', null, dataUser);
export const getusercvs = (page, limit, filters, token) => fetchData('/usercvs', 'POST', token, { page, limit, ...filters });
export const getuserscvs=(datos,token)=> fetchData('/userscv', 'POST', token, datos)
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

//Employee
export const createEmployer = (token, datos) => fetchData('/createemployer', 'POST', token, datos);
export const deleteEmployer=(token, datos)=>fetchData('/deleteuser', 'POST', token, datos);
export const getEmployers = (token) => fetchData('/users', 'GET', token);
export const infoUser=(token, data)=> fetchData('/user', 'POST', token, data);
export const getusers = (page, limit, filters, token) => fetchData('/users', 'POST', token, { page, limit, ...filters });
export const getusersnotlimit = (filters, token) => fetchData('/usersfilternotlimit', 'POST', token, { ...filters });
export const usersName = (datos, token) => fetchData('/usersname', 'POST', token, datos);
export const hirings=async(data,token)=>fetchData('/hirings', 'POST', token, data)
export const editUser = async (data, token) => {
    const formData = new FormData();
    // Añadir los campos al FormData
    Object.keys(data).forEach(key => {
        if (key === 'files') {
            for (let index = 0; index < data[key].length; index++) {
                const fileName = data[key][index]['nameFile'];
                const fileDate=data[key][index]['date'] 
                const fileData = data[key][index]['file'];
                

                // Si el campo es un archivo, lo añadimos al FormData
                if (fileData instanceof File) {
                    // Agregar el archivo al FormData con el nombre adecuado
                    formData.append(fileName, fileData);
                    if(fileDate){
                        const nameData=fileName+'-date'
                        formData.append(nameData, fileDate)
                        
                    }
                }
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
      const pdfUrl = URL.createObjectURL(result);
      if (result.error) return result;
      return { url: pdfUrl }; 
    } else {
     result = await fetchData(endpoint, method, token, formData); 
      
    }
    return result;
};


//login
export const loginUser = (email, password) => fetchData('/login', 'POST', null, { email, password });
export const loginUserCode=(email) => fetchData('/login', 'POST', null, { email});
export const tokenGenerate=(data)=> fetchData('/validCode', 'POST', null, data);

//Offers
export const sendFormCreateOffer = (datos, token) => fetchData('/createofferjob', 'POST', token, datos);
export const updateOffer = (datos, token) => fetchData('/modifyofferjob', 'PUT', token, datos);
export const getOfferJobs = () => fetchData('/offerjobs', 'GET');
export const getOfferJobId = (datos) => fetchData('/offerjob', 'POST', null, datos);

//program
export const getPrograms = () => fetchData('/programs', 'GET');
export const createProgram = (datos, token) => fetchData('/createprogram', 'POST', token, datos);
export const createDispositive = (dispositiveData, token) => fetchData('/createdispositive', 'POST', token, dispositiveData);
export const updateDispositive = (dispositiveData, token) => fetchData('/updatedevice', 'PUT', token, dispositiveData);
export const deleteDispositive = (dispositiveData, token) => fetchData('/deletedispositive', 'DELETE', token, dispositiveData);
export const getDispositive = (dispositiveData, token) => fetchData('/programs', 'POST', token, dispositiveData);
export const getDispositiveResponsable = (datos, token) => fetchData('/dispositiveresponsable', 'POST', token, datos);
export const deleteProgram = (datos, token) => fetchData('/deleteprogram', 'DELETE', token, datos);
export const updateProgram = (datos, token) => fetchData('/updateprogram', 'PUT', token, datos);
export const coordinators = (datos, token) => fetchData('/coordinators', 'POST', token, datos);
export const responsibles = (datos, token) => fetchData('/responsibles', 'POST', token, datos);
export const listsResponsiblesAndCoordinators=(datos,token)=> fetchData('/listsresponsiblesprogram', 'POST', datos, token)

// filesDrive
export const createFileDrive = async (data, token) => {
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
    const endpoint = '/crfilemodel';
    const method = 'POST';
    const result = await fetchData(endpoint, method, token, formData); 
    return result;
};
export const deleteFileDrive = (datos, token) => fetchData('/dlfilemodel', 'POST', token, datos);
export const updateFileDrive = async (data, token) => {
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
    const endpoint = '/upfilemodel';
    const method = 'POST';
    const result = await fetchData(endpoint, method, token, formData); 
    return result;
};

export const getFileDrive=async (datos,token)=> {
    const pdfBlob = await fetchData('/getfiledrive', 'POST', token, datos, true);
    const pdfUrl = URL.createObjectURL(pdfBlob);
    return { url: pdfUrl };
}


//documentation
export const infoDocumentation=(datos,token)=>fetchData('/documentation', 'POST', token, datos);

//signPDF
export const requestSignature=async (data, token)=> fetchData('/pdf/request-sign','POST',token, data );
export const  confirmSignature=async (data, token)=>fetchData('/pdf/confirm-sign', 'POST', token, data );

//auditoria
export const auditInfoUser=(datos,token)=>fetchData('/auditinfouser', 'POST', token, datos);
export const auditInfoProgram=(datos,token)=>fetchData('/auditinfoprogram', 'POST', token, datos);
export const auditInfoDevice=(datos,token)=>fetchData('/auditinfodevice', 'POST', token, datos);
export const auditDocumentUser=(datos,token)=>fetchData('/auditdocumentuser', 'POST', token, datos);
export const auditDocumentProgram=(datos,token)=>fetchData('/auditdocumentprogram', 'POST', token, datos);
export const auditDocumentDevice=(datos,token)=>fetchData('/auditdocumentdevice', 'POST', token, datos);
export const auditUserPeriod=(datos,token)=>fetchData('/audituserperiod', 'POST', token, datos);

//estadisticas
export const stOverview=(token)=>fetchData('/overview', 'POST', token);
export const stCvMonthly=(datos, token)=>fetchData('/cvmonthly', 'POST', token, datos);
export const stCvDistribution=(datos, token)=>fetchData('/cvdistribution', 'POST', token, datos);
export const stCvConversion=(datos, token)=>fetchData('/cvconversion', 'POST', token, datos);
export const stAuditWorkersStats=(datos, token)=>fetchData('/auditworkersstats', 'POST', token, datos);

export const stgetWorkersStats=(datos, token)=>fetchData('/workersstats', 'POST', token, datos);