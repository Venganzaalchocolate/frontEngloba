import { useContext } from "react";
import { OfferContext } from "../context/OfferProvider";

export const useOffer = () => {
    const context = useContext(OfferContext)
    if (context == undefined) throw new Error('Oferta fuera del contexto')
    return context
}
