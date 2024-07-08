import { useContext } from "react";
import { BagContext} from "../context/BagProvider";

export const useBag = () => {
    const context = useContext(BagContext)
    if (context == undefined) throw new Error('Bag fuera del contexto')
    return context
}
