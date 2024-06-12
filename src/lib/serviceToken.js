export const saveToken = (token) => {
    try {
        window.localStorage.setItem('token', token);
    } catch (error) {
        return false;
    }
    return true
}

export const getToken = () => {
    return window.localStorage.getItem('token')
}

export const deleteToken=()=>{
    window.localStorage.clear()
}