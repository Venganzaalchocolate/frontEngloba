import { createContext, useState } from "react";

export const BagContext = createContext();

export function BagProvider({ children }) {
    const [Bag, setBag] = useState(null)
    const [schedule, setSchedule] = useState(false)

    const changeBag=(data)=>{
        setSchedule(false)
        setBag(data)
    }

    const resetBag=()=>{
        setBag(null)
    }

    const scheduleInterview=(status)=>{
        if(!!Bag.userCv) setSchedule(true)
    }


    return (
        <BagContext.Provider value={{
            Bag,
            changeBag,
            schedule,
            scheduleInterview,
            resetBag
        }}>
            {children}
        </BagContext.Provider>
    )
}