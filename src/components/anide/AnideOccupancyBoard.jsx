import {
  FaBed,
  FaCircleExclamation,
  FaNoteSticky,
  FaPenToSquare,
  FaPlus,
  FaRightLeft,
} from "react-icons/fa6";
import { FaSignOutAlt } from "react-icons/fa";
import styles from "../styles/anide.module.css";

const getRoomClass = (status) => {
  switch (status) {
    case "occupied":
      return styles.roomOccupied;
    case "free":
      return styles.roomFree;
    case "semi":
      return styles.roomSemi;
    case "unusable":
      return styles.roomUnusable;
    default:
      return styles.roomUnknown;
  }
};

const getRoomLabel = (status) => {
  switch (status) {
    case "occupied":
      return "Habitación ocupada";
    case "free":
      return "Habitación libre";
    case "semi":
      return "Habitación semi ocupada";
    case "unusable":
      return "Habitación inactiva";
    default:
      return "Sin estado";
  }
};

const getRoomVisualStatus = (room) => {
  if (room.visualStatus) return room.visualStatus;
  if (room.active === false) return "unusable";

  const activeBeds = Number(room.activeBeds || 0);
  const occupiedBeds = Number(room.occupiedBeds || 0);
  const freeBeds = Number(room.freeBeds || 0);

  if (activeBeds === 0) return "unusable";
  if (occupiedBeds === 0) return "free";
  if (freeBeds === 0) return "occupied";

  return "semi";
};

const getProvinceName = (province) => {
  if (!province) return "Sin provincia";

  if (typeof province === "object") {
    return String(province.name || "Sin provincia").trim();
  }

  return "Sin provincia";
};

const getBedUser = (bed) => bed?.usuaria || null;

const AnideOccupancyBoard = ({
  center,
  centers = [],
  selectedCenterId,
  onSelectCenter,
  onRoomClick,
  onAssignStay,
  onEditRoom,
  onCreateBed,
  onEditBed,
  onMoveStay,
  onCloseStay,
  onViewNotes,
onAddNote,
}) => {
  const selectedCenter =
    center ||
    centers.find((item) => String(item._id) === String(selectedCenterId));

  const provinceGroups = centers.reduce((acc, item) => {
    const provinceName = getProvinceName(item.province);

    if (!acc[provinceName]) acc[provinceName] = [];
    acc[provinceName].push(item);

    return acc;
  }, {});



  return (
    <div className={styles.boardWrapper}>
      <div className={styles.legend}>
        <div>
          <span className={`${styles.legendDot} ${styles.roomOccupied}`} />
          Habitación ocupada
        </div>

        <div>
          <span className={`${styles.legendDot} ${styles.roomFree}`} />
          Habitación libre
        </div>

        <div>
          <span className={`${styles.legendDot} ${styles.roomSemi}`} />
          Semi ocupada
        </div>

        <div>
          <span className={`${styles.legendDot} ${styles.roomUnusable}`} />
          Habitación inactiva
        </div>
      </div>

      {!!selectedCenter && (
        <section className={styles.selectedCenterPanel}>
          <div className={styles.centerTitle}>
            <div>
              <h3>{selectedCenter.name}</h3>
              <p>{getProvinceName(selectedCenter.province)}</p>
            </div>

            <div className={styles.summaryCards}>
              <div>
                <strong>{selectedCenter.summary?.totalBeds ?? 0}</strong>
                <span>Camas</span>
              </div>

              <div>
                <strong>{selectedCenter.summary?.occupiedBeds ?? 0}</strong>
                <span>Ocupadas</span>
              </div>

              <div>
                <strong>{selectedCenter.summary?.freeBeds ?? 0}</strong>
                <span>Libres</span>
              </div>
            </div>
          </div>

          <div className={styles.roomsDetailGrid}>
            {(selectedCenter.habitaciones || []).map((room) => {
              const visualStatus = getRoomVisualStatus(room);

              return (
                <article className={styles.roomDetailCard} key={room._id}>
                  <div className={styles.roomDetailHeader}>
                    <button
                      type="button"
                      className={`${styles.roomDotLarge} ${getRoomClass(
                        visualStatus
                      )}`}
                      onClick={() => onRoomClick?.(selectedCenter, room)}
                      title={getRoomLabel(visualStatus)}
                    >
                      {room.freeBeds > 0 ? room.freeBeds : ""}
                    </button>

                    <div>
                      <h4>{room.name}</h4>
                      <p>{getRoomLabel(visualStatus)}</p>
                    </div>

                    <button
                      type="button"
                      className={styles.iconButton}
                      onClick={() => onEditRoom?.(room)}
                      title="Editar habitación"
                    >
                      <FaPenToSquare />
                    </button>
                  </div>

                  <div className={styles.roomStats}>
                    <span>{room.activeBeds || 0} camas activas</span>
                    <span>{room.occupiedBeds || 0} ocupadas</span>
                    <span>{room.freeBeds || 0} libres</span>
                  </div>

                  <div className={styles.bedsGrid}>
                    {(room.camas || []).map((bed) => {
                      const user = getBedUser(bed);
                      const occupied = !!user;
                      const bedBlocked = bed.active === false;

                      return (
                        <div
                          className={[
                            styles.bedCard,
                            occupied ? styles.bedOccupied : "",
                            bedBlocked ? styles.bedBlocked : "",
                          ]
                            .filter(Boolean)
                            .join(" ")}
                          key={bed._id}
                        >
                          <div className={styles.bedTitle}>
                            <span>
                              <FaBed /> {bed.name}
                            </span>

                            <button
                              type="button"
                              className={styles.iconButton}
                              onClick={() => onEditBed?.(room, bed)}
                              title="Editar cama"
                            >
                              <FaPenToSquare />
                            </button>
                          </div>

                          {bedBlocked ? (
                            <p className={styles.bedMuted}>Cama inactiva</p>
                          ) : occupied ? (
                            <>
                              <button
  type="button"
  className={styles.bedUserButton}
  onClick={() => onViewNotes?.(user)}
  title="Ver notas de la usuaria"
>
  {user.name || "Usuaria"}
</button>

                              <small>
                                Entrada:{" "}
                                {user.startDate
                                  ? new Date(user.startDate).toLocaleDateString(
                                      "es-ES"
                                    )
                                  : "—"}
                              </small>

                              <div className={styles.bedActions}>
                                <button
                                  type="button"
                                  onClick={() => onAddNote?.(user)}
                                >
                                  <FaNoteSticky /> + Notas
                                </button>

                                <button
                                  type="button"
                                  onClick={() =>
                                    onMoveStay?.(user, selectedCenter)
                                  }
                                >
                                  <FaRightLeft /> Trasladar
                                </button>

                                <button
                                  type="button"
                                  onClick={() => onCloseStay?.(user)}
                                >
                                  <FaSignOutAlt /> Salida
                                </button>
                              </div>
                            </>
                          ) : (
                            <>
                              <p className={styles.bedFree}>Libre</p>

                              <button
                                type="button"
                                className={styles.assignButton}
                                onClick={() =>
                                  onAssignStay?.(selectedCenter, room, bed)
                                }
                              >
                                <FaPlus /> Asignar
                              </button>
                            </>
                          )}
                        </div>
                      );
                    })}

                    <button
                      type="button"
                      className={styles.addBedCard}
                      onClick={() => onCreateBed?.(room)}
                    >
                      <FaPlus /> Añadir cama
                    </button>
                  </div>

                  {room.notes && (
                    <p className={styles.roomNotes}>
                      <FaCircleExclamation /> {room.notes}
                    </p>
                  )}
                </article>
              );
            })}

            {!selectedCenter.habitaciones?.length && (
              <div className={styles.emptyState}>
                Este centro todavía no tiene habitaciones.
              </div>
            )}
          </div>
        </section>
      )}

      <section className={styles.globalBoard}>
        <h3>Vista global por provincias</h3>

        <div className={styles.provinceGrid}>
          {Object.entries(provinceGroups).map(
            ([provinceName, provinceCenters]) => (
              //seleccionado
              <article className={styles.provinceBlock} key={provinceName}>
                <h4>{provinceName}</h4>

                <div className={styles.centersByProvince}>
                  {provinceCenters.map((item) => (
                    <div className={ String(item._id) === String(selectedCenterId)
                            ? styles.centerGlobalRowSelected
                            : styles.centerGlobalRow} key={item._id}>
                      <button
                        type="button"
                        className={[
                          styles.centerGlobalName,
                          String(item._id) === String(selectedCenterId)
                            ? styles.centerGlobalNameActive
                            : "",
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        onClick={() => onSelectCenter?.(item._id)}
                        title={item.name}
                      >
                        {item.name}
                      </button>

                      <div className={styles.roomDotsLine}>
                        {(item.habitaciones || []).map((room) => {
                          const visualStatus = getRoomVisualStatus(room);

                          return (
                            <button
                              type="button"
                              key={`${item._id}-${room._id}`}
                              className={[
                                styles.roomDot,
                                getRoomClass(visualStatus),
                                String(item._id) === String(selectedCenterId)
                                  ? styles.roomDotSelected
                                  : "",
                              ]
                                .filter(Boolean)
                                .join(" ")}
                              onClick={() => {
                                onSelectCenter?.(item._id);
                                onRoomClick?.(item, room);
                              }}
                              title={`${item.name} · ${
                                room.name
                              } · ${getRoomLabel(visualStatus)}`}
                            >
                              {room.freeBeds > 0 ? room.freeBeds : ""}
                            </button>
                          );
                        })}

                        {!item.habitaciones?.length && (
                          <span className={styles.noRooms}>
                            Sin habitaciones
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            )
          )}

          {!Object.keys(provinceGroups).length && (
            <div className={styles.emptyState}>
              No hay centros ANIDE creados.
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AnideOccupancyBoard;