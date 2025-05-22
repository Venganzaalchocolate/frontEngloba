// components/EnumCRUD.jsx
import React, { useState, useMemo } from "react";
import styles from "../styles/managingEnum.module.css";
import { FaRegEdit, FaTrashAlt, FaPlusSquare } from "react-icons/fa";
import { FaEye, FaEyeSlash } from "react-icons/fa6";
import { ENUM_OPTIONS, NO_SUB_ENUMS } from "./enumConfig";


function EnumCRUD({ selectedKey, data, actions }) {
  const [modelFilter, setModelFilter] = useState("ALL");

  const models = useMemo(() => {
    if (selectedKey !== "documentation") return [];
    return Array.from(new Set(data.map((d) => d.model || "Sin modelo"))).sort();
  }, [selectedKey, data]);

  const filteredData = useMemo(() => {
    if (selectedKey !== "documentation" || modelFilter === "ALL") return data;
    return data.filter((item) => (item.model || "Sin modelo") === modelFilter);
  }, [selectedKey, data, modelFilter]);

  if (!filteredData || filteredData.length === 0)
    return (
      <div>
        <p>No hay elementos disponibles en {selectedKey}.</p>
        <button onClick={actions.createItem}>+ Crear nuevo</button>
      </div>
    );

  const labelCastellano =
    ENUM_OPTIONS.find((o) => o.key === selectedKey)?.name ?? selectedKey;

  const allowSub = !NO_SUB_ENUMS.includes(selectedKey);

  return (
    <div className={styles.enumCrud}>
      <h2>
        Lista de {labelCastellano}
        <FaPlusSquare onClick={actions.createItem} style={{ cursor: "pointer" }} />
      </h2>

      {selectedKey === "documentation" && models.length > 1 && (
        <div className={styles.modelFilters}>
          <button
            onClick={() => setModelFilter("ALL")}
            className={modelFilter === "ALL" ? styles.active : undefined}
          >
            Todos
          </button>
          {models.map((m) => (
            <button
              key={m}
              onClick={() => setModelFilter(m)}
              className={modelFilter === m ? styles.active : undefined}
            >
              {m}
            </button>
          ))}
        </div>
      )}

      {selectedKey === "documentation" ? (
  <>
    {Object.entries(
      filteredData.reduce((acc, item) => {
        const category = item.categoryFiles || "Sin categoría";
        if (!acc[category]) acc[category] = [];
        acc[category].push(item);
        return acc;
      }, {})
    ).map(([category, items]) => (
      <div key={category} className={styles.docGroup}>
        <h3 className={styles.docCategory}>{category}</h3>
        <ul className={styles.docItemList}>
          {items.map((item) => (
            <li key={item._id} className={styles.docItem}>
              <div className={styles.docItemHeader}>
                <p>{item.name}</p>
                <div className={styles.docActions}>
                  <FaRegEdit
                    onClick={() => actions.editItem(item)}
                    style={{ cursor: "pointer" }}
                  />
                  <FaTrashAlt
                    onClick={() => actions.deleteItem(item)}
                    style={{ cursor: "pointer" }}
                  />
                </div>
              </div>

              {item.date && item.duration && (
                <span className={styles.docDuration}>
                  Duración: {item.duration} días
                </span>
              )}

              {!!item.requiresSignature && (
                <span className={styles.docDuration}>
                  Requiere Firma: {(item.requiresSignature)?'Si':'No'}
                </span>
              )}

              {allowSub && item.subcategories?.length > 0 && (
                <div className={styles.docSubcategories}>
                  <ul>
                    {item.subcategories.map((sub) => (
                      <li key={sub._id} className={styles.docSubItem}>
                        <p>{sub.name}</p>
                        <div>
                          <FaRegEdit
                            onClick={() => actions.editSub(item, sub)}
                            style={{ cursor: "pointer" }}
                          />
                          <FaTrashAlt
                            onClick={() => actions.deleteSub(item, sub)}
                            style={{ cursor: "pointer" }}
                          />
                        </div>
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => actions.createSub(item)}>
                    + Subcategoría
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>
    ))}
  </>
)  : (
        <ul>
          {filteredData.map((item) => (
            <li key={item._id} className={styles.enumItem}>
              <h3>
                {selectedKey === "jobs" &&
                  (item.public ? <FaEye /> : <FaEyeSlash />)}
                <p>{item.name}</p>
                <FaRegEdit
                  onClick={() => actions.editItem(item)}
                  style={{ cursor: "pointer" }}
                />
                <FaTrashAlt
                  onClick={() => actions.deleteItem(item)}
                  style={{ cursor: "pointer" }}
                />
              </h3>

              {allowSub && item.subcategories?.length > 0 && (
                <div className={styles.subcategories}>
                  <ul>
                    {item.subcategories.map((sub) => (
                      <li key={sub._id}>
                        {selectedKey === "jobs" &&
                          (sub.public ? <FaEye /> : <FaEyeSlash />)}
                        <p>{sub.name}</p>
                        <FaRegEdit
                          onClick={() => actions.editSub(item, sub)}
                          style={{ cursor: "pointer" }}
                        />
                        <FaTrashAlt
                          onClick={() => actions.deleteSub(item, sub)}
                          style={{ cursor: "pointer" }}
                        />
                      </li>
                    ))}
                  </ul>
                  <button onClick={() => actions.createSub(item)}>
                    + Subcategoría
                  </button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default EnumCRUD;