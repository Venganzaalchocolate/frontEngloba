import { createContext, useState } from "react";
import { deleteToken} from "../lib/serviceToken.js";

export const LoggedContext = createContext();

export function LoggedProvider({ children }) {
    const [logged, setLogged] = useState({
        isLoggedIn: false,
        user: {}
    })

    const changeLogged=(user)=>{
        const auxLogged= structuredClone(logged)
        auxLogged['isLoggedIn']=true
        auxLogged['user']=user
        setLogged(auxLogged)
    }

    const logout=()=>{
        const auxLogged= {}
        auxLogged['isLoggedIn']=false
        auxLogged['user']={}
        deleteToken()
()
        setLogged(auxLogged)
    }

    return (
        <LoggedContext.Provider value={{
            logged,
            changeLogged,
            logout
        }}>
            {children}
        </LoggedContext.Provider>
    )
}