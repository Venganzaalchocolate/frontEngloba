import { FaHeart, FaRegHeart } from "react-icons/fa6";
import { IoEye, IoEyeOff } from "react-icons/io5";
import { TbNotes, TbNotesOff } from "react-icons/tb";

const CandidateStatusIcons = ({
  userId,
  user,
  Offer,
  updateOfferArray,
  onNeedOffer,
  addUserToOffer,
  onDeferredField // 👈 nuevo
}) => {

  const isFavorite = Offer?.favoritesCv?.includes(userId);
  const isRejected = Offer?.rejectCv?.includes(userId);
  const isViewed   = Offer?.viewCv?.includes(userId);

  const isCandidate = Offer?.userCv?.includes(userId);
  const isSolicitant = Offer?.solicitants?.includes(userId);

  const handle = async (field) => {
    // 1) NO hay oferta seleccionada → abrir selector y guardar qué queríamos hacer
    if (!Offer) {
      onDeferredField?.(field, user);  
      return onNeedOffer?.(user);
    }

    // 2) Hay oferta → si no está dentro, añadirlo primero
    if (!isCandidate && !isSolicitant) {
      await addUserToOffer(userId);
    }

    // 3) Aplicar el estado
    updateOfferArray(field, userId);
  };

  return (
    <div style={{ display: "flex", gap: "0.5rem"}}>
      {isFavorite ? (
        <FaHeart color="tomato" onClick={() => handle("favoritesCv")}/>
      ) : (
        <FaRegHeart onClick={() => handle("favoritesCv")}/>
      )}

      {isRejected ? (
        <TbNotesOff color="grey" onClick={() => handle("rejectCv")}/>
      ) : (
        <TbNotes onClick={() => handle("rejectCv")}/>
      )}

      {isViewed ? (
        <IoEye color="LightSeaGreen" onClick={() => handle("viewCv")}/>
      ) : (
        <IoEyeOff onClick={() => handle("viewCv")}/>
      )}
    </div>
  );
};

export default CandidateStatusIcons;
