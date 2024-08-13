import { useState, useEffect } from 'react';
import { getData, getOfferJobId } from '../lib/data';
import { useNavigate, useParams } from 'react-router-dom';

export const useJobFormData = (charge, modal) => {
    const [enums, setEnums] = useState({ studies: [], provinces: [], jobs: [], work_schedule: [] });
    const [offer, setIdOffer] = useState(null);
    const { id } = useParams();
    const navigate = useNavigate();

    useEffect(() => {
        charge(true);
        const cargarDatos = async () => {
            const enumsData = await getData();
            if (!enumsData.error) {
                setEnums({
                    jobs: enumsData.jobs,
                    provinces: enumsData.provinces,
                    work_schedule: enumsData.work_schedule,
                    studies: enumsData.studies,
                });
                charge(false);
                if (id) {
                    const offerJob = await getOfferJobId({ id });
                    if (offerJob.error) {
                        modal('Error', 'Oferta no disponible, por favor inténtelo más tarde');
                        navigate('/trabajaconnosotros');
                    } else {
                        setIdOffer(offerJob);
                    }
                }
            } else {
                modal('Error', 'Servicio no disponible, por favor inténtelo más tarde');
                navigate('/');
                charge(false);
            }
        };
        cargarDatos();
    }, []);

    return { enums, offer };
};
