import { createContext, useState } from "react";

export const BagContext = createContext();

export function BagProvider({ children }) {
    const [Bag, setBag] = useState(null)
    const [schedule, setSchedule] = useState(false)

    const changeBag=(bag)=>{
        setSchedule(false)
        setBag(bag)
    }

    const scheduleInterview=(status)=>{
        if(!!Bag.userCv) setSchedule(true)
    }


    return (
        <BagContext.Provider value={{
            Bag,
            changeBag,
            schedule,
            scheduleInterview
        }}>
            {children}
        </BagContext.Provider>
    )
}