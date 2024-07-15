import { useContext } from "react";
import { MenuWorkerContext} from "../context/MenuWorkerProvider";

export const useMenuWorker = () => {
    const context = useContext(MenuWorkerContext)
    if (context == undefined) throw new Error('Menu Worker fuera de contexto')
    return context
}
