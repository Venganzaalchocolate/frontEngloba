import { createContext, useState } from "react";

export const OfferContext = createContext();

export function OfferProvider({ children }) {
    const [Offer, setOffer] = useState(null)

    const changeOffer=(data)=>{
        setOffer(data)
    }

    const resetOffer=()=>{
        setOffer(null)
    }



    return (
        <OfferContext.Provider value={{
            Offer,
           changeOffer,
           resetOffer,
        }}>
            {children}
        </OfferContext.Provider>
    )
}