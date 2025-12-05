import React, { useEffect, useState } from "react";
import styles from "../styles/vacationDays.module.css";
import {
  FaRegCalendarDays,
  FaUmbrellaBeach,
  FaUserClock,
} from "react-icons/fa6";
import { FaRegCalendarAlt } from "react-icons/fa";
import { editUser, getUserListDays } from "../../lib/data";
import { getToken } from "../../lib/serviceToken";
import ModalForm from "../globals/ModalForm";

// ==== CONSTANTES DE NEGOCIO ====
const DAILY_EQUIV_HOURS = 7.5; // día laborable equivalente
const ANNUAL_VACATION_DAYS = 23;
const ANNUAL_VACATION_DAYS_NATURAL=30;
const ANNUAL_PERSONAL_DAYS = 2;

const ANNUAL_VACATION_HOURS = ANNUAL_VACATION_DAYS * DAILY_EQUIV_HOURS;
const ANNUAL_PERSONAL_HOURS = ANNUAL_PERSONAL_DAYS * DAILY_EQUIV_HOURS;


// ==== HELPERS ====
const sameDay = (a, b) =>
  a &&
  b &&
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate();

/**
 * Construye la lista de días con horas:
 * 1) Si hay vacationHours/personalHours → usar esos.
 * 2) Si no, usar vacationDays/personalDays solo como lectura (7,5h por defecto).
 */
const buildInitialEntries = (hoursEntries = [], legacyDates = []) => {
  if (Array.isArray(hoursEntries) && hoursEntries.length > 0) {
    return hoursEntries
      .map((e) => {
        if (!e) return null;
        const d = new Date(e.date);
        if (isNaN(d)) return null;
        const hours =
          typeof e.hours === "number" && e.hours >= 0
            ? e.hours
            : DAILY_EQUIV_HOURS;
        return { date: d, hours };
      })
      .filter(Boolean);
  }

  if (Array.isArray(legacyDates) && legacyDates.length > 0) {
    return legacyDates
      .map((d) => {
        const dateObj = new Date(d);
        if (isNaN(dateObj)) return null;
        return { date: dateObj, hours: DAILY_EQUIV_HOURS };
      })
      .filter(Boolean);
  }

  return [];
};

const VacationDays = ({ user, modal, charge, soloInfo = false }) => {
  const userId = user?._id;

  // ==== ESTADO PRINCIPAL ====
  const [selectedVacationDays, setSelectedVacationDays] = useState([]);
  const [selectedPersonalDays, setSelectedPersonalDays] = useState([]);

  const [selectedType, setSelectedType] = useState("Vacaciones");
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [monthView, setMonthView] = useState(1); // 1 = mes actual, 12 = año entero

  // ==== MODAL PARA HORAS ====
  const [showHoursModal, setShowHoursModal] = useState(false);
  const [hoursModalData, setHoursModalData] = useState({
    date: null,
    type: "Vacaciones",
    initialHours: "",
  });

  useEffect(() => {
    if (!userId) {
      setSelectedVacationDays([]);
      setSelectedPersonalDays([]);
      return;
    }

    const fetchDays = async () => {
      const token = getToken();
      charge(true);

      try {
        const data = await getUserListDays(token, { idUser: userId });

        const vacEntries = buildInitialEntries(
          data?.vacationHours,
          data?.vacationDays
        );
        const perEntries = buildInitialEntries(
          data?.personalHours,
          data?.personalDays
        );

        setSelectedVacationDays(vacEntries);
        setSelectedPersonalDays(perEntries);
      } catch (err) {
        modal(
          "Error",
          "No se han podido cargar los días de vacaciones/asuntos propios."
        );
      } finally {
        charge(false);
      }
    };

    fetchDays();
  }, [userId]);

  // ==== AÑOS DISPONIBLES EN SELECT ====
  const getAvailableYears = () => {
  const FIRST_YEAR = 2024;
  const currentRealYear = new Date().getFullYear();
  const lastYear = currentRealYear + 1;

  const years = [];
  for (let y = lastYear; y >= FIRST_YEAR; y--) {
    years.push(y);   // queda en orden descendente: 2026, 2025, 2024...
  }

  return years;
};

  // ==== GENERAR CALENDARIO ====
  const generateCalendar = (month, year) => {
    const firstDay = new Date(year, month, 1).getDay();
    const adjustedFirstDay = firstDay === 0 ? 6 : firstDay - 1;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const weeks = [];
    let day = 1;

    for (let i = 0; i < 6; i++) {
      const week = [];
      for (let j = 0; j < 7; j++) {
        if (i === 0 && j < adjustedFirstDay) {
          week.push(null);
        } else if (day > daysInMonth) {
          week.push(null);
        } else {
          week.push(new Date(year, month, day));
          day++;
        }
      }
      weeks.push(week);
      if (day > daysInMonth) break;
    }
    return weeks;
  };

  // ==== NAVEGACIÓN MESES ====
  const handlePreviousMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((prevYear) => prevYear - 1);
    } else {
      setCurrentMonth((prevMonth) => prevMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((prevYear) => prevYear + 1);
    } else {
      setCurrentMonth((prevMonth) => prevMonth + 1);
    }
  };

  // ==== CÁLCULOS EN HORAS / DÍAS EQUIVALENTES ====
  const currentYearVacationEntries = selectedVacationDays.filter(
    (e) => e.date.getFullYear() === currentYear
  );
  const currentYearPersonalEntries = selectedPersonalDays.filter(
    (e) => e.date.getFullYear() === currentYear
  );

  const totalVacationHours = currentYearVacationEntries.reduce(
    (acc, e) => acc + (e.hours || 0),
    0
  );
  const totalPersonalHours = currentYearPersonalEntries.reduce(
    (acc, e) => acc + (e.hours || 0),
    0
  );

  const totalVacationDaysEquiv = totalVacationHours / DAILY_EQUIV_HOURS;
  const totalPersonalDaysEquiv = totalPersonalHours / DAILY_EQUIV_HOURS;

  const remainingVacationHours = ANNUAL_VACATION_HOURS - totalVacationHours;
  const remainingPersonalHours = ANNUAL_PERSONAL_HOURS - totalPersonalHours;

  const remainingVacationDaysEquiv = remainingVacationHours / DAILY_EQUIV_HOURS;
  const remainingPersonalDaysEquiv = remainingPersonalHours / DAILY_EQUIV_HOURS;

  const exceededVacationHours =
    remainingVacationHours < 0 ? Math.abs(remainingVacationHours) : 0;
  const exceededPersonalHours =
    remainingPersonalHours < 0 ? Math.abs(remainingPersonalHours) : 0;

  const currentMonthVacationHours = currentYearVacationEntries
    .filter((e) => e.date.getMonth() === currentMonth)
    .reduce((acc, e) => acc + (e.hours || 0), 0);

  const currentMonthPersonalHours = currentYearPersonalEntries
    .filter((e) => e.date.getMonth() === currentMonth)
    .reduce((acc, e) => acc + (e.hours || 0), 0);

  // DÍAS NATURALES (cada fecha con horas > 0 cuenta 1 día)
  const naturalVacationDaysUsed = currentYearVacationEntries.filter(
    (e) => (e.hours || 0) > 0
  ).length;

  const naturalPersonalDaysUsed = currentYearPersonalEntries.filter(
    (e) => (e.hours || 0) > 0
  ).length;

  const naturalVacationDaysRemaining =
    ANNUAL_VACATION_DAYS_NATURAL - naturalVacationDaysUsed;

  const naturalPersonalDaysRemaining =
    ANNUAL_PERSONAL_DAYS - naturalPersonalDaysUsed;

  // ==== PERSISTIR EN BACKEND (AUTO-GUARDADO) ====
  const persistHours = async (vacationList, personalList) => {
    // En modo soloInfo nunca persistimos
    if (!userId || soloInfo) return;

    const vacationHoursPayload = vacationList.map((d) => ({
      date: d.date.toISOString(),
      hours: d.hours,
    }));

    const personalHoursPayload = personalList.map((d) => ({
      date: d.date.toISOString(),
      hours: d.hours,
    }));

    const payload = {
      _id: userId,
      vacationHours: vacationHoursPayload,
      personalHours: personalHoursPayload,
    };

    const token = getToken();
    charge(true);

    const responseApi = await editUser(payload, token);

    if (!responseApi || responseApi.error) {
      charge(false);
      modal(
        "Error",
        responseApi?.message ||
          "No se han podido guardar los días de vacaciones/asuntos propios"
      );
      return;
    }

    const vacEntries = buildInitialEntries(
      responseApi?.vacationHours,
      responseApi?.vacationDays
    );
    const perEntries = buildInitialEntries(
      responseApi?.personalHours,
      responseApi?.personalDays
    );
    setSelectedVacationDays(vacEntries);
    setSelectedPersonalDays(perEntries);

    charge(false);
  };

  // ==== CLICK EN DÍA → ABRIR MODAL HORAS ====
  const handleDayClick = (date) => {
    // En modo soloInfo el clic NO hace nada
    if (soloInfo) return;
    if (!date || !selectedType) return;

    const isDayInOtherList =
      selectedType === "Vacaciones"
        ? selectedPersonalDays.some((d) => sameDay(d.date, date))
        : selectedVacationDays.some((d) => sameDay(d.date, date));

    if (isDayInOtherList) return;

    const isVacation = selectedType === "Vacaciones";
    const list = isVacation ? selectedVacationDays : selectedPersonalDays;

    const existing = list.find((d) => sameDay(d.date, date));
    const initialHours =
      typeof existing?.hours === "number" ? existing.hours : "";

    setHoursModalData({
      date,
      type: selectedType,
      initialHours,
    });
    setShowHoursModal(true);
  };

  // ==== SUBMIT DEL MODAL DE HORAS (AUTO-GUARDADO) ====
  const handleSubmitHours = async (values) => {
    // Salvaguarda extra: si alguien llegara aquí en soloInfo, no hacer nada
    if (soloInfo) return;

    let raw = values.hours;

    if (raw === undefined || raw === null || raw === "") {
      raw = DAILY_EQUIV_HOURS;
    }

    if (typeof raw === "string") {
      raw = raw.replace(",", ".");
    }
    const hours = parseFloat(raw);

    if (isNaN(hours) || hours < 0) {
      return;
    }

    const { date, type } = hoursModalData;
    const isVacation = type === "Vacaciones";

    const [list, setList] = isVacation
      ? [selectedVacationDays, setSelectedVacationDays]
      : [selectedPersonalDays, setSelectedPersonalDays];

    const existing = list.find((d) => sameDay(d.date, date));

    let newList;
    if (hours === 0) {
      newList = list.filter((d) => !sameDay(d.date, date));
    } else if (existing) {
      newList = list.map((d) =>
        sameDay(d.date, date) ? { ...d, hours } : d
      );
    } else {
      newList = [...list, { date, hours }];
    }

    setList(newList);
    setShowHoursModal(false);

    const finalVacationList = isVacation ? newList : selectedVacationDays;
    const finalPersonalList = isVacation ? selectedPersonalDays : newList;

    await persistHours(finalVacationList, finalPersonalList);
  };

  // ==== RENDER DEL CALENDARIO ====
  const renderCalendar = (month, year) => {
    const weeks = generateCalendar(month, year);
    return (
      <table>
        <thead>
          <tr>
            <th>Lun</th>
            <th>Mar</th>
            <th>Mié</th>
            <th>Jue</th>
            <th>Vie</th>
            <th>Sáb</th>
            <th>Dom</th>
          </tr>
        </thead>
        <tbody>
          {weeks.map((week, i) => (
            <tr key={i}>
              {week.map((day, j) => {
                const vacationEntry = selectedVacationDays.find((d) =>
                  day ? sameDay(d.date, day) : false
                );
                const personalEntry = selectedPersonalDays.find((d) =>
                  day ? sameDay(d.date, day) : false
                );

                const isSelectedVacationDay = !!vacationEntry;
                const isSelectedPersonalDay = !!personalEntry;
                const isToday =
                  day && new Date().toDateString() === day.toDateString();

                return (
                  <td
                    key={j}
                    onClick={
                      soloInfo ? undefined : () => handleDayClick(day)
                    }
                    className={[
                      day ? styles.dayCell : "",
                      !day ? styles.dayDisabled : "",
                      isSelectedVacationDay ? styles.vacationDay : "",
                      isSelectedPersonalDay ? styles.personalDay : "",
                      isToday ? styles.dayToday : "",
                      soloInfo ? styles.dayReadOnly : "",
                    ]
                      .join(" ")
                      .trim()}
                    title={
                      vacationEntry
                        ? `${vacationEntry.hours.toFixed(
                            1
                          )} h de vacaciones`
                        : personalEntry
                        ? `${personalEntry.hours.toFixed(
                            1
                          )} h de asuntos propios`
                        : ""
                    }
                  >
                    {day ? day.getDate() : ""}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  // ==== RENDER PRINCIPAL ====
  return (
    <div className={styles.contenedor}>
      <h2>VACACIONES Y ASUNTOS PROPIOS</h2>

      {/* PÍLDORAS DE RESUMEN */}
      <div className={styles.infoResumenContainer}>
        {/* Píldora VACACIONES */}
        <div className={`${styles.infoPill} ${styles.infoPillVacation}`}>
          <div className={styles.infoPillIcon}>
            <FaUmbrellaBeach />
          </div>
          <div className={styles.infoPillContent}>
            <span className={styles.infoPillTitle}>
              Vacaciones {currentYear}
            </span>
            <span className={styles.infoPillMain}>
              Usadas en días naturales: {naturalVacationDaysUsed} días
            </span>
            <span className={styles.infoPillSecondary}>
              Te quedan en días naturales:{" "}
              {Math.max(0, naturalVacationDaysRemaining)} días
            </span>
            {!soloInfo &&
            <>
            <span className={styles.infoPillMain}>
              Usadas en horas: {totalVacationHours.toFixed(1)} h (
              {totalVacationDaysEquiv.toFixed(2)} días)
            </span>
            <span className={styles.infoPillSecondary}>
              Te quedan en horas:{" "}
              {Math.max(0, remainingVacationHours).toFixed(1)} h (
              {Math.max(0, remainingVacationDaysEquiv).toFixed(2)} días)
            </span>
            {exceededVacationHours > 0 && (
              <span className={styles.exceededText}>
                Exceso: {exceededVacationHours.toFixed(1)} h (
                {(exceededVacationHours / DAILY_EQUIV_HOURS).toFixed(2)} días)
              </span>
            )}
            </>
            }
            
          </div>
        </div>

        {/* Píldora ASUNTOS PROPIOS */}
        <div className={`${styles.infoPill} ${styles.infoPillPersonal}`}>
          <div className={styles.infoPillIcon}>
            <FaUserClock />
          </div>
          <div className={styles.infoPillContent}>
            <span className={styles.infoPillTitle}>
              Asuntos propios {currentYear}
            </span>
            <span className={styles.infoPillMain}>
              Usados en días naturales: {naturalPersonalDaysUsed} días
            </span>
            <span className={styles.infoPillSecondary}>
              Te quedan en días naturales:{" "}
              {Math.max(0, naturalPersonalDaysRemaining)} días
            </span>
            {!soloInfo && 
            <>
            <span className={styles.infoPillMain}>
              Usados en horas: {totalPersonalHours.toFixed(1)} h (
              {totalPersonalDaysEquiv.toFixed(2)} días)
            </span>
            <span className={styles.infoPillSecondary}>
              Te quedan en horas:{" "}
              {Math.max(0, remainingPersonalHours).toFixed(1)} h (
              {Math.max(0, remainingPersonalDaysEquiv).toFixed(2)} días)
            </span>
            {exceededPersonalHours > 0 && (
              <span className={styles.exceededText}>
                Exceso: {exceededPersonalHours.toFixed(1)} h (
                {(exceededPersonalHours / DAILY_EQUIV_HOURS).toFixed(2)} días)
              </span>
            )}
            </>
            }
            
          </div>
        </div>
      </div>

      {/* Selector de vista y tipo */}
      <div className={styles.contenedorSelectorvista}>
        <FaRegCalendarDays
          onClick={() => setMonthView(1)}
          className={
            monthView === 1 ? styles.contenedorSelectorVistaMes : ""
          }
        />
        <FaRegCalendarDays
          onClick={() => setMonthView(12)}
          className={
            monthView === 12 ? styles.contenedorSelectorVistaMes : ""
          }
        />
        <select
          value={currentYear}
          onChange={(e) => setCurrentYear(Number(e.target.value))}
        >
          {getAvailableYears().map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>

        {/* En modo soloInfo NO mostramos los botones de tipo */}
        {!soloInfo && (
          <div className={styles.selectionTypeBox}>
            <button
              className={
                selectedType !== "Vacaciones"
                  ? styles.NotSelectedTypeButton
                  : styles.SelectedTypeButton
              }
              onClick={() => setSelectedType("Vacaciones")}
            >
              Vacaciones
            </button>
            <button
              className={
                selectedType !== "Asuntos Propios"
                  ? styles.NotSelectedTypeButton
                  : styles.SelectedTypeButton
              }
              onClick={() => setSelectedType("Asuntos Propios")}
            >
              Asuntos Propios
            </button>
          </div>
        )}
      </div>

      {/* Leyenda */}
      <div className={styles.legend}>
        <span className={styles.legendItem}>
          <span
            className={`${styles.legendSwatch} ${styles.swatchVacation}`}
          />
          Vacaciones
        </span>
        <span className={styles.legendItem}>
          <span
            className={`${styles.legendSwatch} ${styles.swatchPersonal}`}
          />
          Asuntos propios
        </span>
      </div>

      {/* Navegación mensual */}
      {monthView === 1 && (
        <div className={styles.navigationContainer}>
          <button className={styles.navButton} onClick={handlePreviousMonth}>
            &lt;
          </button>
          <h3>
            {new Date(currentYear, currentMonth).toLocaleString("es-ES", {
              month: "long",
              year: "numeric",
            })}
          </h3>
          <button className={styles.navButton} onClick={handleNextMonth}>
            &gt;
          </button>
          <button
            className={styles.navButtonToday}
            onClick={() => {
              const today = new Date();
              setCurrentMonth(today.getMonth());
              setCurrentYear(today.getFullYear());
            }}
          >
            Hoy
          </button>
        </div>
      )}

      {/* Calendario */}
      <div className={styles.calendarBox}>
        {monthView === 1 ? (
          <div className={styles.calendarMonth}>
            <h3>
              {new Date(currentYear, currentMonth).toLocaleString("es-ES", {
                month: "long",
                year: "numeric",
              })}
            </h3>
            {renderCalendar(currentMonth, currentYear)}
          </div>
        ) : (
          [...Array(12)].map((_, i) => (
            <div key={i} className={styles.calendarMonth}>
              <h3>
                {new Date(currentYear, i).toLocaleString("es-ES", {
                  month: "long",
                  year: "numeric",
                })}
              </h3>
              {renderCalendar(i, currentYear)}
            </div>
          ))
        )}
      </div>

      {/* ==== MODAL PARA EDITAR HORAS ==== */}
      {!soloInfo && showHoursModal && hoursModalData.date && (
        <ModalForm
          isOpen={showHoursModal}
          title={`Horas - ${hoursModalData.type} (${hoursModalData.date.toLocaleDateString(
            "es-ES"
          )})`}
          onClose={() => setShowHoursModal(false)}
          onSubmit={handleSubmitHours}
          initialValues={{ hours: hoursModalData.initialHours }}
          fields={[
            {
              name: "hours",
              label:
                "Horas a contabilizar (0 para eliminar el día, vacío = 7,5 h)",
              type: "number",
              step: 0.5,
              min: 0,
              placeholder: "7.5",
            },
          ]}
        />
      )}
    </div>
  );
};

export default VacationDays;
