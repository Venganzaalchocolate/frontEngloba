const buildGroupedOptionsFromIndex = (
  idx,
  { onlyPublic = false, onlyActive = false } = {}
) => {
  const entries = Object.entries(idx || {});
  if (!entries.length) return { groups: [], singles: [] };

  const metaById = new Map(entries); // id -> meta

  // Soporta public/isPublic y active/isActive
  const getPublic = (m) => (m?.public ?? m?.isPublic ?? false) === true;
  const getActive = (m) => (m?.active ?? m?.isActive ?? false) === true;

  const pass = (meta) => {
    if (onlyPublic && !getPublic(meta)) return false;
    if (onlyActive && !getActive(meta)) return false;
    return true;
  };

  // parentId -> hijos visibles
  const byParent = new Map();

  for (const [id, meta] of entries) {
    const parent = meta?.parent;
    if (meta?.isSub && parent && pass(meta)) {
      if (!byParent.has(parent)) byParent.set(parent, []);
      byParent.get(parent).push({ id, name: meta?.name ?? "" });
    }
  }

  const groups = [];
  const singles = [];

  // 1) Crear grupos para TODOS los padres que tengan hijos visibles
  //    (aunque el padre no pase filtros)
  for (const [parentId, children] of byParent.entries()) {
    const parentMeta = metaById.get(parentId);
    const parentLabel = parentMeta?.name ?? "Sin categoría";

    groups.push({
      parentId,
      label: parentLabel,
      options: children
        .sort((a, b) => a.name.localeCompare(b.name))
        .map((c) => ({ value: c.id, label: c.name })),
    });
  }

  // Ordena grupos por label
  groups.sort((a, b) => a.label.localeCompare(b.label));

  // 2) Raíces visibles SIN hijos visibles -> singles
  for (const [id, meta] of entries) {
    if (meta?.isRoot && pass(meta)) {
      const hasVisibleChildren = byParent.has(id) && (byParent.get(id) || []).length > 0;
      if (!hasVisibleChildren) {
        singles.push({ value: id, label: meta?.name ?? "" });
      }
    }
  }

  // 3) Huérfanos (ni root ni sub) visibles -> singles
  for (const [id, meta] of entries) {
    const isRoot = !!meta?.isRoot;
    const isSub = !!meta?.isSub;
    if (!isRoot && !isSub && pass(meta)) {
      singles.push({ value: id, label: meta?.name ?? "" });
    }
  }

  // Dedupe + sort
  const seen = new Set();
  const singlesDedup = singles
    .filter(({ value }) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    })
    .sort((a, b) => a.label.localeCompare(b.label));

  // Si no quieres exponer parentId, quítalo aquí:
  const groupsOut = groups.map(({ label, options }) => ({ label, options }));

  return { groups: groupsOut, singles: singlesDedup };
};





export default function getOptionsEnums(idx, types={}) {

    const { groups, singles } = buildGroupedOptionsFromIndex(idx, types);
    return (
      <>
        {groups.map((g) => (
          <optgroup label={g.label} key={`grp-${g.label}`}>
            {g.options.map((opt) => (
              <option value={opt.value} key={opt.value}>{opt.label}</option>
            ))}
          </optgroup>
        ))}
        {singles.map((opt) => (
          <option value={opt.value} key={opt.value}>{opt.label}</option>
        ))}
      </>
    );
}