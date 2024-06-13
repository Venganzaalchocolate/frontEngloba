export const tokenUser = async (token) => {
    const datos = {
        token,
    };
    const url=`${import.meta.env.VITE_API}/validtoken`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(datos)
    });
    if(response.status==401) return {error:true,message:'Token no valido'}
    const data = await response.json();
    if(data.error) return data
    return data.data
}

export const loginUser= async (email,password) =>{
    const datos = {
        email,
        password,
    };
    const url=`${import.meta.env.VITE_API}/login`
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(datos)
    });
    const data = await response.json();
    if(data.error) return data
    return data.data
}