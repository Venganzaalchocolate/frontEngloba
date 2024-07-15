import { createContext, useState } from "react";

export const MenuWorkerContext = createContext();

export function MenuWorkerProvider({ children }) {
    const [MenuWorker, setMenuWorker] = useState(null)

    const changeMenuWorker=(MenuWorker)=>{
        setMenuWorker(MenuWorker)
    }



    return (
        <MenuWorkerContext.Provider value={{
            MenuWorker,
            changeMenuWorker,
        }}>
            {children}
        </MenuWorkerContext.Provider>
    )
}