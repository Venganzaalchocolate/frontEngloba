
const urlApi = import.meta.env.VITE_API_URL;

const fetchData = async (endpoint, method, token = null, body = null, isBlob = false) => {
    const url = `${urlApi}${endpoint}`;
    const options = {
        method,
        headers: {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        },
        ...(body && { body: JSON.stringify(body) })
    };

    const response = await fetch(url, options);
    if (isBlob) {
        if (!response.ok) throw new Error(`Error al obtener el archivo: ${response.statusText}`);
        return await response.blob();
    } else {
        const data = await response.json();
        if (data.error) return data;
        return data.data;
    }
};

export const addEmployerBag = (datos, token) => fetchData('/addemployerbag', 'POST', token, datos);

export const deleteEmployerBag = (datos, token) => fetchData('/deleteemployerbag', 'POST', token, datos);

export const createBag = (datos, token) => fetchData('/createbag', 'POST', token, datos);

export const getBags = (token) => fetchData('/getbags', 'GET', token);

export const getPrograms = () => fetchData('/programs', 'GET');

export const tokenUser = async (token) => {
    const data = await fetchData('/validtoken', 'POST', token, { token });
    return data || { error: true, message: 'Token no valido' };
};

export const getData = () => fetchData('/infodata', 'GET');

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

export const modifyUser = (dataUser) => fetchData('/modifyusercv', 'PUT', null, dataUser);

export const loginUser = (email, password) => fetchData('/login', 'POST', null, { email, password });

export const getusercvs = (page, limit, filters, token) => fetchData('/usercvs', 'POST', token, { page, limit, ...filters });

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

export const deleteProgram = (datos, token) => fetchData('/deleteprogram', 'DELETE', token, datos);

export const updateProgram = (datos, token) => fetchData('/updateprogram', 'PUT', token, datos);



// CODIGO SIN REFACTORIZAR POR SI ACASO

// let urlApi = import.meta.env.VITE_API_URL;


// export const addEmployerBag=async(datos,token)=>{
//     const url = `${urlApi}/addemployerbag`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });

//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const deleteEmployerBag=async(datos,token)=>{
//     const url = `${urlApi}/deleteemployerbag`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });

//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const createBag=async(datos, token)=>{

//     const url = `${urlApi}/createbag`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });

//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const getBags=async(token)=>{
//     const url = `${urlApi}/getbags`
//     const response = await fetch(url, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//     });

//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const getPrograms=async()=>{
//     const url = `${urlApi}/programs`
//     const response = await fetch(url, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     });

//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const tokenUser = async (token) => {
//     const datos = {
//         token,
//     };
//     const url = `${urlApi}/validtoken`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });
    
    
//     if (response.status == 401) return { error: true, message: 'Token no valido' }
//     const data = await response.json();

//     if (data.error) return data
//     return data.data
// }

// export const getData = async () => {
//     const url = `${urlApi}/infodata`
//     const response = await fetch(url, {
//         method: 'GET',
//     });
//     const data = await response.json();

//     if (data.error) return data
//     return data.data
// }

// export const changeData = async (token, datos) => {
//     const url = `${urlApi}/changedata`
//     const response = await fetch(url, {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });
//     const data = await response.json();

//     if (data.error) return data
//     return data.data
// }

// export const deleteData = async (token, datos) => {
//     const url = `${urlApi}/deletedata`
//     const response = await fetch(url, {
//         method: 'DELETE',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });
//     const data = await response.json();

//     if (data.error) return data
//     return data.data
// }

// export const createData = async (token, datos) => {
//     const url = `${urlApi}/createdata`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });
//     const data = await response.json();

//     if (data.error) return data
//     return data.data
// }


// export const createSubData = async (token, datos) => {
//     const url = `${urlApi}/createsubcategory`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });
//     const data = await response.json();

//     if (data.error) return data
//     return data.data
// }

// export const deleteSubData = async (token, datos) => {
//     const url = `${urlApi}/deletesubdata`
//     const response = await fetch(url, {
//         method: 'DELETE',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });
//     const data = await response.json();

//     if (data.error) return data
//     return data.data
// }



// export const getCVs = async (id, token) => {
//     const datos = {
//       id
//     };
  
//     const url = `${urlApi}/getFile`; // Endpoint para obtener el archivo PDF
//     try {
//       const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//           'Content-Type': 'application/json',
//           'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//       });
  
//       if (!response.ok) {
//         throw new Error(`Error al obtener el archivo PDF: ${response.statusText}`);
//       }
//       // Obtener el contenido del archivo como un arraybuffer
//       const pdfBlob = await response.arrayBuffer();
  
//       // Crear un Blob a partir del arraybuffer recibido
//       const blob = new Blob([pdfBlob], { type: 'application/pdf' });
  
//       // Convertir el Blob a URL para usarlo en el visor de PDF
//       const pdfUrl = URL.createObjectURL(blob);
//       return {url:pdfUrl}; // Devolver la URL del PDF para mostrarlo en el frontend
//     } catch (error) {
      
//       return {error: true, message: 'Error al obtener el pdf'}; // Manejo del error según sea necesario en tu aplicación
//     }
//   };
  
//   export const modifyUser=async(dataUser)=>{

//     const url = `${urlApi}/modifyusercv`
//     const response = await fetch(url, {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(dataUser)
//     });
//     const data = await response.json();
//     if (data.error) return data
//     return data.data
//   }


// export const loginUser = async (email, password) => {
//     const datos = {
//         email,
//         password,
//     };
//     const url = `${urlApi}/login`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify(datos)
//     });
//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const getusercvs=async (page, limit, filters, token)=>{

//     const datos = {
//         page,
//         limit,
//         ...filters
//     };

//     const url = `${urlApi}/usercvs`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });
//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const sendFormCreateOffer=async (datos, token)=>{
//     const url = `${urlApi}/createofferjob`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });

//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const updateOffer=async (datos, token)=>{

//     const url = `${urlApi}/modifyofferjob`
//     const response = await fetch(url, {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });

//     const data = await response.json();

//     if (data.error) return data
//     return data.data
// }

// export const getOfferJobs=async ()=>{
//     const url = `${urlApi}/offerjobs`
//     const response = await fetch(url, {
//         method: 'GET',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//     });

//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }

// export const getOfferJobId=async (datos)=>{
//     const url = `${urlApi}/offerjob`
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//         },
//         body: JSON.stringify(datos)
//     });

//     const data = await response.json();
//     if (data.error) return data
//     return data.data
// }


// export const sendFormCv = async (dataForm, file, editUser=false) => {
//     const formData = new FormData();

//     // Check for file presence
//     if (file) {
//         formData.append('file', file);
//     }

//     let url = `${urlApi}/filterusercv`
//     let response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify((editUser)?{id:dataForm.id}:dataForm)
//     });


//     const userExist = await response.json()
//     let data='';

//     if (userExist.data==undefined || userExist.data.length == 0) {
//         const url = `${urlApi}/createusercv`
//         const response = await fetch(url, {
//             method: 'POST',
//             headers: {
//                 'Content-Type': 'application/json'
//             },
//             body: JSON.stringify(dataForm)
//         });
//         data = await response.json();
//         if (data.error) return data
//         else {
//             if (!!data.data._id) {
//                 formData.append('nameFile', data.data._id);
//             }
//         }
//     } else {
//         if (!!userExist.data[0]._id) {
//             const url = `${urlApi}/modifyusercv`
//             dataForm['_id']=userExist.data[0]._id;
//             if(file!=null) dataForm['numberCV']=userExist.data[0].numberCV+1;          
//             const response = await fetch(url, {
//                 method: 'PUT',
//                 headers: {
//                     'Content-Type': 'application/json'
//                 },
//                 body: JSON.stringify(dataForm)
//             });

//             data = await response.json();
//             if (data.error) return data
//             else if(file!=null){
//                 if (!!data.data._id) {
//                     formData.append('nameFile', data.data._id);
//                 }
//             }
//         }
//     }

//     if(file!=null){
//         const uploadUrl = `${urlApi}/uploadcv`;

//         const uploadResponse = await fetch(uploadUrl, {
//             method: 'POST',
//             body: formData,
//         });

//         const uploadData = await uploadResponse.json();
//         if (uploadData.error) {
//             return uploadData
//         }
//         // Assuming upload response contains relevant data (e.g., uploaded file info)
   
//     }
//     return data
    
// }


// export const createProgram = async (datos, token) => {
//     const url = `${urlApi}/createprogram`;
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos)
//     });

//     const data = await response.json();
//     if (data.error) return data;
//     return data.data;
// };

// export const createDispositive = async (dispositiveData, token) => {
//     const url = `${urlApi}/programs/devices`;
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(dispositiveData)
//     });

//     const data = await response.json();
//     if (data.error) return data;
//     return data.data;
// };

// export const updateDispositive = async (dispositiveData, token) => {
//     const url = `${urlApi}/programs/device`;
//     const response = await fetch(url, {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(dispositiveData)
//     });

//     const data = await response.json();
//     if (data.error) return data;
//     return data.data;
// };

// export const deleteDispositive = async (dispositiveData, token) => {
//     const url = `${urlApi}/programs/device`;
//     const response = await fetch(url, {
//         method: 'DELETE',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(dispositiveData)
//     });

//     const data = await response.json();
//     if (data.error) return data;
//     return data.data;
// };

// export const getDispositive = async (dispositiveData, token) => {
//     const url = `${urlApi}/programs/device`;
//     const response = await fetch(url, {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(dispositiveData)
//     });

//     const data = await response.json();
//     if (data.error) return data;
//     return data.data;
// };

// export const deleteProgram = async (datos, token) => {
//     const url = `${urlApi}/programs/delete`; // Ajusta la URL si es necesario
//     const response = await fetch(url, {
//         method: 'DELETE',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos) // Se espera que 'datos' contenga el 'programId'
//     });

//     const data = await response.json();
//     if (data.error) return data;
//     return data.data;
// };

// export const updateProgram = async (datos, token) => {
//     const url = `${urlApi}/programs/update`; // Ajusta la URL según tu API
//     const response = await fetch(url, {
//         method: 'PUT',
//         headers: {
//             'Content-Type': 'application/json',
//             'Authorization': `Bearer ${token}`
//         },
//         body: JSON.stringify(datos) // Se espera que 'datos' contenga el 'programId' y los campos a actualizar
//     });

//     const data = await response.json();
//     if (data.error) return data;
//     return data.data;
// };