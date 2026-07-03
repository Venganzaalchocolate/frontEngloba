import { useCallback, useMemo, useState } from "react";

import ModalForm from "../globals/ModalForm";
import styles from "../styles/ManagingMoodle.module.css";

import { searchusername } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";

const EMPTY_TARGETS = {
  userIds: [],
  filters: {
    allActive: false,
    dispositiveIds: [],
    positionIds: [],
    areas: [],
  },
};

const AREA_OPTIONS = [
  { value: "igualdad", label: "Igualdad" },
  { value: "desarrollo comunitario", label: "Desarrollo comunitario" },
  { value: "lgtbiq", label: "LGTBIQ" },
  { value: "infancia y juventud", label: "Infancia y juventud" },
  { value: "personas con discapacidad", label: "Personas con discapacidad" },
  { value: "mayores", label: "Mayores" },
  { value: "migraciones", label: "Migraciones" },
  { value: "no identificado", label: "No identificado" },
];

const normalizeTargets = (value = EMPTY_TARGETS) => ({
  userIds: Array.isArray(value.userIds) ? value.userIds : [],
  filters: {
    allActive: Boolean(value.filters?.allActive),
    dispositiveIds: Array.isArray(value.filters?.dispositiveIds)
      ? value.filters.dispositiveIds
      : [],
    positionIds: Array.isArray(value.filters?.positionIds)
      ? value.filters.positionIds
      : [],
    areas: Array.isArray(value.filters?.areas) ? value.filters.areas : [],
  },
});

const MoodleTargetSelector = ({
  value = EMPTY_TARGETS,
  onChange,
  enumsData,
  modal,
  allowAllActive = true,
}) => {
  const [openModal, setOpenModal] = useState(false);
  const [userLabels, setUserLabels] = useState({});

  const targets = normalizeTargets(value);

  const programsIndex = enumsData?.programsIndex || {};
  const dispositiveIndex = enumsData?.dispositiveIndex || {};
  const jobsIndex = enumsData?.jobsIndex || {};

  const updateTargets = (nextTargets) => {
    onChange?.(normalizeTargets(nextTargets));
  };

  const programName = useCallback(
    (programId) => {
      const program = programsIndex[String(programId || "")];
      return program?.acronym || program?.name || "";
    },
    [programsIndex]
  );

  const dispositiveOptions = useMemo(() => {
    return Object.entries(dispositiveIndex)
      .filter(([, dispositive]) => dispositive?.active !== false)
      .map(([id, dispositive]) => {
        const programLabel = programName(dispositive?.program);

        return {
          value: id,
          label: `${dispositive?.name || id}${
            programLabel ? ` [${programLabel}]` : ""
          }`,
        };
      })
      .sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, [dispositiveIndex, programName]);

  const positionOptions = useMemo(() => {
    const entries = Object.entries(jobsIndex);
    const roots = entries.filter(([, item]) => item?.isRoot);

    return roots
      .map(([rootId, root]) => {
        const subcategories = entries
          .filter(
            ([, item]) =>
              item?.isSub && String(item?.parent) === String(rootId)
          )
          .map(([id, item]) => ({
            value: id,
            label: item?.name || id,
            public: item?.public,
          }))
          .sort((a, b) => a.label.localeCompare(b.label, "es"));

        return {
          value: rootId,
          label: root?.name || "Puestos",
          subcategories,
        };
      })
      .filter((group) => group.subcategories.length);
  }, [jobsIndex]);

  const positionLabelById = useMemo(() => {
    const labels = {};

    positionOptions.forEach((group) => {
      group.subcategories?.forEach((position) => {
        labels[String(position.value)] = position.label;
      });
    });

    return labels;
  }, [positionOptions]);

  const dispositiveLabelById = useMemo(() => {
    return dispositiveOptions.reduce((acc, option) => {
      acc[String(option.value)] = option.label;
      return acc;
    }, {});
  }, [dispositiveOptions]);

  const areaLabelById = useMemo(() => {
    return AREA_OPTIONS.reduce((acc, option) => {
      acc[String(option.value)] = option.label;
      return acc;
    }, {});
  }, []);

  const scopeTypeOptions = useMemo(() => {
    const options = [
      { value: "user", label: "Trabajador individual" },
      { value: "dispositive", label: "Dispositivo" },
      { value: "position", label: "Puesto" },
      { value: "area", label: "Área" },
    ];

    if (allowAllActive) {
      options.push({
        value: "allActive",
        label: "Toda la plantilla activa",
      });
    }

    return options;
  }, [allowAllActive]);

  const loadUserOptions = useCallback(async (query) => {
    const token = getToken();
    const data = await searchusername({ query }, token);

    if (data?.error) return [];

    const users = Array.isArray(data?.users) ? data.users : [];

    const options = users.map((user) => {
      const label = `${user.firstName || ""} ${user.lastName || ""}${
        user.email ? ` · ${user.email}` : ""
      }`.trim();

      return {
        value: String(user._id),
        label,
      };
    });

    setUserLabels((prev) => {
      const next = { ...prev };

      options.forEach((option) => {
        next[String(option.value)] = option.label;
      });

      return next;
    });

    return options;
  }, []);

  const addArrayValue = (key, itemValue) => {
    const current = targets.filters[key] || [];
    const valueAsString = String(itemValue);

    if (current.includes(valueAsString)) return;

    updateTargets({
      ...targets,
      filters: {
        ...targets.filters,
        [key]: [...current, valueAsString],
      },
    });
  };

  const removeArrayValue = (key, itemValue) => {
    updateTargets({
      ...targets,
      filters: {
        ...targets.filters,
        [key]: (targets.filters[key] || []).filter(
          (item) => String(item) !== String(itemValue)
        ),
      },
    });
  };

  const addUser = (userId) => {
    const valueAsString = String(userId);

    if (targets.userIds.includes(valueAsString)) return;

    updateTargets({
      ...targets,
      userIds: [...targets.userIds, valueAsString],
    });
  };

  const removeUser = (userId) => {
    updateTargets({
      ...targets,
      userIds: targets.userIds.filter(
        (item) => String(item) !== String(userId)
      ),
    });
  };

  const setAllActive = (checked) => {
    updateTargets({
      ...targets,
      filters: {
        ...targets.filters,
        allActive: checked,
      },
    });
  };

  const buildFields = () => [
    {
      name: "scopeType",
      label: "Tipo de criterio",
      type: "select",
      required: true,
      defaultValue: "user",
      options: scopeTypeOptions,
    },
    {
      name: "userId",
      label: "Trabajador",
      type: "async-search-select",
      required: true,
      placeholder: "Buscar por nombre, apellido o correo...",
      loadOptions: loadUserOptions,
      showIf: (form) => form.scopeType === "user",
    },
    {
      name: "dispositiveId",
      label: "Dispositivo",
      type: "select",
      required: true,
      searchable: true,
      options: dispositiveOptions,
      showIf: (form) => form.scopeType === "dispositive",
    },
    {
      name: "positionId",
      label: "Puesto",
      type: "select",
      required: true,
      searchable: true,
      options: positionOptions,
      showIf: (form) => form.scopeType === "position",
    },
    {
      name: "area",
      label: "Área",
      type: "select",
      required: true,
      searchable: true,
      options: AREA_OPTIONS,
      showIf: (form) => form.scopeType === "area",
    },
    {
      name: "confirmAllActive",
      label: "Confirmación",
      type: "info",
      content:
        "Se seleccionará toda la plantilla activa. Úsalo solo cuando quieras aplicar la acción de forma masiva.",
      showIf: (form) => form.scopeType === "allActive",
    },
  ];

  const handleSubmit = (form) => {
    if (form.scopeType === "user") {
      if (!form.userId) {
        modal("Falta trabajador", "Selecciona un trabajador.");
        return;
      }

      addUser(form.userId);
      setOpenModal(false);
      return;
    }

    if (form.scopeType === "dispositive") {
      if (!form.dispositiveId) {
        modal("Falta dispositivo", "Selecciona un dispositivo.");
        return;
      }

      addArrayValue("dispositiveIds", form.dispositiveId);
      setOpenModal(false);
      return;
    }

    if (form.scopeType === "position") {
      if (!form.positionId) {
        modal("Falta puesto", "Selecciona un puesto.");
        return;
      }

      addArrayValue("positionIds", form.positionId);
      setOpenModal(false);
      return;
    }

    if (form.scopeType === "area") {
      if (!form.area) {
        modal("Falta área", "Selecciona un área.");
        return;
      }

      addArrayValue("areas", form.area);
      setOpenModal(false);
      return;
    }

    if (form.scopeType === "allActive") {
      setAllActive(true);
      setOpenModal(false);
    }
  };

  const selectedCriteria = useMemo(() => {
    const criteria = [];

    targets.userIds.forEach((userId) => {
      criteria.push({
        key: `user-${userId}`,
        tag: "Trabajador",
        label: userLabels[String(userId)] || String(userId),
        onRemove: () => removeUser(userId),
      });
    });

    targets.filters.dispositiveIds.forEach((dispositiveId) => {
      criteria.push({
        key: `dispositive-${dispositiveId}`,
        tag: "Dispositivo",
        label:
          dispositiveLabelById[String(dispositiveId)] ||
          String(dispositiveId),
        onRemove: () => removeArrayValue("dispositiveIds", dispositiveId),
      });
    });

    targets.filters.positionIds.forEach((positionId) => {
      criteria.push({
        key: `position-${positionId}`,
        tag: "Puesto",
        label: positionLabelById[String(positionId)] || String(positionId),
        onRemove: () => removeArrayValue("positionIds", positionId),
      });
    });

    targets.filters.areas.forEach((area) => {
      criteria.push({
        key: `area-${area}`,
        tag: "Área",
        label: areaLabelById[String(area)] || String(area),
        onRemove: () => removeArrayValue("areas", area),
      });
    });

    if (targets.filters.allActive) {
      criteria.push({
        key: "allActive",
        tag: "Plantilla",
        label: "Toda la plantilla activa",
        onRemove: () => setAllActive(false),
      });
    }

    return criteria;
  }, [
    targets,
    userLabels,
    dispositiveLabelById,
    positionLabelById,
    areaLabelById,
  ]);

  return (
    <div className={styles.targetSelector}>
      <div className={styles.selectorHeader}>
        <div>
          <h4>Destinatarios</h4>
          <p>
            Añade criterios de selección. Se pueden combinar trabajadores,
            dispositivos, puestos y áreas.
          </p>
        </div>

        <button
          type="button"
          className={styles.secondaryButton}
          onClick={() => setOpenModal(true)}
        >
          Añadir criterio
        </button>
      </div>

      {selectedCriteria.length > 0 ? (
        <div className={styles.criteriaList}>
          {selectedCriteria.map((criterion) => (
            <div key={criterion.key} className={styles.criteriaChip}>
              <div>
                <span className={styles.criteriaTag}>{criterion.tag}</span>
                <strong>{criterion.label}</strong>
              </div>

              <button
                type="button"
                className={styles.chipRemove}
                onClick={criterion.onRemove}
                aria-label="Eliminar criterio"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      ) : (
        <p className={styles.emptyCriteria}>
          Todavía no has seleccionado ningún criterio.
        </p>
      )}

      {openModal && (
        <ModalForm
          title="Añadir criterio de destinatarios"
          message="Selecciona cómo quieres localizar a los trabajadores."
          fields={buildFields()}
          onSubmit={handleSubmit}
          onClose={() => setOpenModal(false)}
          modal={modal}
        />
      )}
    </div>
  );
};

export default MoodleTargetSelector;