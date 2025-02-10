import React, { useState } from 'react';
import ModalForm from "../globals/ModalForm";
import ModalConfirmation from "../globals/ModalConfirmation"; // Importa el modal de confirmación
import { updateOffer } from '../../lib/data';
import { getToken } from "../../lib/serviceToken";
import { useOffer } from '../../hooks/useOffer';
import { deepClone } from '../../lib/utils';

const OfferSelect = ({offers, closeModal, userSelected, type}) => {
    const { Offer, changeOffer } = useOffer();
    const [showConfirmation, setShowConfirmation] = useState(false);
    const [selectedOffer, setSelectedOffer] = useState(null);

    const handleSubmit = async (formData) => {
        if (!!formData.offer) {
            const offerAux = offers.find(offer => offer._id === formData.offer);
            if (type!='select' && !!userSelected && !(offerAux.userCv.some((x)=>x==userSelected._id))) {
                // Mostrar el modal de confirmación
                setSelectedOffer(offerAux);
                setShowConfirmation(true);
            } else {
                // Si no hay usuario seleccionado, cambiar la oferta directamente
                changeOffer(offerAux);
                closeModal();
            }
        }
    };

    // Confirmación del usuario en el modal
    const handleConfirm = async () => {
        if (selectedOffer && userSelected) {

            // Copia la oferta y agrega el usuario si no está en la lista
            let updatedOffer =deepClone(selectedOffer);
            
            if (!updatedOffer.userCv.includes(userSelected._id)) {
                updatedOffer.userCv.push(userSelected._id);
                updatedOffer.id = updatedOffer._id;
                
                const token = getToken();
                const upOffer = await updateOffer(updatedOffer, token);
                
                changeOffer(upOffer);
            } 
        }
        
        setShowConfirmation(false);
        closeModal();
    };

    const buildFields = () => {
        let offerOptions = [];

        if (!!offers) {
            offerOptions = offers.map(offer => ({
                value: offer._id,
                label: offer.job_title
            }));
        }

        return [
            {
                name: "offer",
                label: "Ofertas de Empleo",
                type: "select",
                required: true,
                options: [
                    { value: "", label: "Seleccione una opción" },
                    ...offerOptions
                ],
            },
        ];
    };

    const fields = buildFields();

    return (
        <>
            {/* Modal de confirmación */}
            {showConfirmation && (
                <ModalConfirmation
                    title="Confirmar selección"
                    message={`¿Quieres agregar a ${userSelected.name} a la oferta ${selectedOffer?.job_title}?`}
                    onConfirm={handleConfirm}
                    onCancel={() => setShowConfirmation(false)}
                />
            )}

            {/* Modal de selección de oferta */}
            <ModalForm
                title="Oferta de empleo"
                message="Selecciona una oferta de empleo"
                fields={fields}
                onSubmit={handleSubmit}
                onClose={closeModal}
            />
        </>
    );
}

export default OfferSelect;
