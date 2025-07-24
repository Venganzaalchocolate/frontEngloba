import { useState, useEffect, useMemo } from 'react';
import ModalForm from '../globals/ModalForm';
import { getToken } from '../../lib/serviceToken';
import { getusersnotlimit } from '../../lib/data';
import useDebounce, { buildUserEmail } from '../../lib/utils';

export default function FormWorkspaceGroup({
    mode,                   // 'createGroup' | 'addMember'
    scope = 'Program',
    target = null,
    closeModal,
    crudWorkspace,
}) {
    /* ───── estados de los buscadores ───── */
    const [firstNameTxt, setFirstNameTxt] = useState('');
    const [lastNameTxt, setLastNameTxt] = useState('');
    const [dniTxt, setDniTxt] = useState('');
    const [selectOpts, setSelectOpts] = useState([]);

    const debFirst = useDebounce(firstNameTxt, 400);
    const debLast = useDebounce(lastNameTxt, 400);
    const debDni = useDebounce(dniTxt, 400);

    /* ───── petición dinámica para addMember ───── */
    useEffect(() => {
        if (mode !== 'addMember') return;

        const filters = {};
        if (debDni.length >= 3) filters.dni = debDni;
        if (debFirst.length >= 3) filters.firstName = debFirst;
        if (debLast.length >= 3) filters.lastName = debLast;

        if (Object.keys(filters).length === 0) {
            setSelectOpts([]);
            return;
        }

        let ignore = false;
        (async () => {
            try {
                const token = getToken();
                const { users = [] } = await getusersnotlimit(filters, token);
                if (ignore) return;
                setSelectOpts(
                    users.map((u) => ({
                        value: `${buildUserEmail(u)}`,
                        label: `${u.firstName} ${u.lastName} (${u.dni})`,
                    })),
                );
            } catch (err) {
                console.error(err);
                if (!ignore) setSelectOpts([]);
            }
        })();

        return () => { ignore = true; };
    }, [debFirst, debLast, debDni, mode]);

    /* ───── opciones fijas para crear grupo ───── */
    const GROUP_TYPES = [
        { value: 'coordination', label: 'Coordinación' },
        { value: 'direction', label: 'Dirección' },
        { value: 'social', label: 'Trabajadores Sociales' },
        { value: 'psychology', label: 'Psicólogos' },
        { value: 'tecnicos', label: 'Equipo Técnico' },
        { value:'education', label: 'Equipo Educativo'}
    ];

    const isCreate = mode === 'createGroup';

    /* ───── campos del ModalForm ───── */
    const fields = useMemo(() => {
        if (isCreate) {
            return [
                {
                    name: 'groupType',
                    type: 'select',
                    label: 'Tipo de grupo',
                    required: true,
                    options: [{ value: '', label: 'Selecciona un tipo' }, ...GROUP_TYPES],
                }
            ];
        }

        /* ---- addMember ---- */
        return [
            /* buscadores (no requeridos) */
            {
                name: 'firstNameSearch',
                type: 'text',
                label: 'Nombre (mín. 3)',
                required: false,
                placeholder: 'Nombre…',
                isValid: (v) => { setFirstNameTxt(v); return ''; },
            },
            {
                name: 'lastNameSearch',
                type: 'text',
                label: 'Apellido (mín. 3)',
                required: false,
                placeholder: 'Apellido…',
                isValid: (v) => { setLastNameTxt(v); return ''; },
            },
            {
                name: 'dniSearch',
                type: 'text',
                label: 'DNI (mín. 3)',
                required: false,
                placeholder: 'DNI…',
                isValid: (v) => { setDniTxt(v); return ''; },
            },

            /* selector con resultados */
            {
                name: 'memberEmail',
                type: 'select',
                required: true,
                firstSelect: true,
                label: 'Selecciona empleado',
                placeholder: 'Resultados…',
                options: selectOpts.length ? selectOpts : [{ value: '', label: 'Sin resultados' }],
            },

            /* rol */
            {
                name: 'role',
                type: 'select',
                label: 'Rol en el grupo',
                required: true,
                defaultValue: 'MEMBER',
                options: [
                    { value: '', label: 'Seleccione rol' },
                    { value: 'MEMBER', label: 'Miembro' },
                    { value: 'MANAGER', label: 'Manager' },
                    { value: 'OWNER', label: 'Propietario' },
                ],
            },
        ];
    }, [isCreate, selectOpts]);

    /* ───── submit ───── */
    const handleSubmit = async (data) => {
       if (isCreate) {
  const payload = {
    idGroupFather:
      scope === 'Sub'
        ? target?.id || target?.email           // padre = grupo donde clicas
        : target?.groupWorkspace || undefined,  // raíz programa/dispositivo
    typeGroup: data.groupType,
    id:   scope === 'Sub' ? target?.owner?.id  : target?._id,
    type: scope === 'Sub' ? target?.owner?.type
                          : scope === 'Program' ? 'program' : 'device',
  };
  await crudWorkspace(payload, 'createGroup', scope);
} else {



            let groupId = null;
            if (scope === 'Sub') {
                groupId = target?.id || target?.email;        // sub-grupo
            } else {
                groupId = target?.groupWorkspace;             // programa o dispositivo
            }

            const payload = {
                memberEmail: data.memberEmail,
                role: data.role,
                groupId,                                       // siempre string
            };
            await crudWorkspace(payload, 'addMember', scope);
        }
        closeModal();
    };

    /* ───── render ───── */
    return (
        <ModalForm
            title={
                isCreate
                    ? `Crear grupo en ${scope === 'Program' ? 'programa' : 'dispositivo'}`
                    : 'Añadir empleado al grupo'
            }
            message=""
            fields={fields}
            onSubmit={handleSubmit}
            onClose={closeModal}
        />
    );
}
