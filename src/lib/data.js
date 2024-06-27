export const tokenUser = async (token) => {
    const datos = {
        token,
    };
    const url = `${import.meta.env.VITE_API}/validtoken`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datos)
    });
    if (response.status == 401) return { error: true, message: 'Token no valido' }
    const data = await response.json();
    if (data.error) return data
    return data.data
}

export const getData = async () => {
    const url = `${import.meta.env.VITE_API}/infodata`
    const response = await fetch(url, {
        method: 'GET',
    });
    const data = await response.json();
    if (data.error) return data
    return data.data
}

export const getCVs = async (id) => {
    const datos = {
      id
    };
  
    const url = `${import.meta.env.VITE_API}/getFile`; // Endpoint para obtener el archivo PDF
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
      });
  
      if (!response.ok) {
        throw new Error(`Error al obtener el archivo PDF: ${response.statusText}`);
      }
  
      // Obtener el contenido del archivo como un arraybuffer
      const pdfBlob = await response.arrayBuffer();
  
      // Crear un Blob a partir del arraybuffer recibido
      const blob = new Blob([pdfBlob], { type: 'application/pdf' });
  
      // Convertir el Blob a URL para usarlo en el visor de PDF
      const pdfUrl = URL.createObjectURL(blob);
      return {url:pdfUrl}; // Devolver la URL del PDF para mostrarlo en el frontend
    } catch (error) {
      console.error('Error en la solicitud de obtener el archivo PDF:', error);
      return null; // Manejo del error según sea necesario en tu aplicación
    }
  };
  


export const loginUser = async (email, password) => {
    const datos = {
        email,
        password,
    };
    const url = `${import.meta.env.VITE_API}/login`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    });
    const data = await response.json();
    if (data.error) return data
    return data.data
}

export const getusercvs=async (page, limit, filters)=>{
    const datos = {
        page,
        limit,
        ...filters
    };
    const url = `${import.meta.env.VITE_API}/usercvs`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    });
    const data = await response.json();
    if (data.error) return data
    return data.data
}


export const sendFormCv = async (dataForm, file) => {

    
    const formData = new FormData();

    // Check for file presence
    if (file) {
        formData.append('file', file);
    }

    let url = `${import.meta.env.VITE_API}/filterusercv`
    let response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(dataForm)
    });

    const userExist = await response.json()
    if (userExist.data.length == 0) {
        const url = `${import.meta.env.VITE_API}/createusercv`
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dataForm)
        });
        const data = await response.json();
        if (data.error) return data
        else {
            if (!!data.data._id) {
                formData.append('nameFile', data.data._id);
            }
        }
    } else {
        if (!!userExist.data[0]._id) {
            const url = `${import.meta.env.VITE_API}/modifyusercv`
            dataForm['_id']=userExist.data[0]._id;
            dataForm['numberCV']=userExist.data[0].numberCV+1
            const response = await fetch(url, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataForm)
            });

            const data = await response.json();
            console.log(data)
            if (data.error) return data
            else {
                if (!!data.data._id) {
                    formData.append('nameFile', data.data._id);
                }
            }
        }
    }

    const uploadUrl = `${import.meta.env.VITE_API}/uploadcv`;

    const uploadResponse = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
    });

    const uploadData = await uploadResponse.json();
    if (uploadData.error) {
        throw new Error(uploadData.error); // Re-throw error for better handling
    }
    console.log(uploadData)
    // Assuming upload response contains relevant data (e.g., uploaded file info)
    return {
        uploadedFile: uploadData, // Uploaded file information
    };

}
