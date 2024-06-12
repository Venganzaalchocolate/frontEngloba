import { useContext } from "react";
import { LoggedContext} from "../context/LoggedProvider";

export const useLogin = () => {
    const context = useContext(LoggedContext)
    if (context == undefined) throw new Error('Login fuera del contexto')
    return context
}
