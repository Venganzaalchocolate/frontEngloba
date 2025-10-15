import React, { useState } from 'react';
import styles from '../styles/vacationDays.module.css';
import { FaCalendarDay, FaCalendarDays } from "react-icons/fa6";
import { editUser } from '../../lib/data';
import { getToken } from '../../lib/serviceToken';
import { FaEdit } from "react-icons/fa";

const VacationDays = ({ user, modal, charge, changeUser }) => {
    const [selectedVacationDays, setSelectedVacationDays] = useState(
        user.vacationDays.map((d) => new Date(d)) || []
    );
    const [selectedPersonalDays, setSelectedPersonalDays] = useState(
        user.personalDays.map((d) => new Date(d)) || []
    );
    const [isEditing, setIsEditing] = useState(false);
    const [selectedType, setSelectedType] = useState('Vacaciones');
    const [currentMonth, setCurrentMonth] = useState(new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
    const [monthView, setMonthView] = useState(1);

    // Filtra los días totales de vacaciones y asuntos propios para el año seleccionado
    const totalVacationDays = selectedVacationDays.filter(
        (date) => date.getFullYear() === currentYear
    ).length;

    const totalPersonalDays = selectedPersonalDays.filter(
        (date) => date.getFullYear() === currentYear
    ).length;

    // Calcula los días excedidos si superan los límites
    const exceededVacationDays = totalVacationDays > 30 ? totalVacationDays - 30 : 0;
    const exceededPersonalDays = totalPersonalDays > 3 ? totalPersonalDays - 3 : 0;

    // Navegar al mes anterior
    const handlePreviousMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear((prevYear) => prevYear - 1);
        } else {
            setCurrentMonth((prevMonth) => prevMonth - 1);
        }
    };

    // Navegar al mes siguiente
    const handleNextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear((prevYear) => prevYear + 1);
        } else {
            setCurrentMonth((prevMonth) => prevMonth + 1);
        }
    };

    const getAvailableYears = () => {
        const years = new Set();
        selectedVacationDays.forEach((date) => years.add(date.getFullYear()));
        selectedPersonalDays.forEach((date) => years.add(date.getFullYear()));
        years.add(currentYear - 1);
        years.add(currentYear);
        years.add(currentYear + 1);
        return [...years].sort((a, b) => b - a);
    };

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

    const handleDayClick = (date) => {
        if (!date || !isEditing || !selectedType) return;

        // Verificar si el día está en la lista opuesta
        const isDayInOtherList =
            selectedType === 'Vacaciones'
                ? selectedPersonalDays.some((d) => d.toDateString() === date.toDateString())
                : selectedVacationDays.some((d) => d.toDateString() === date.toDateString());

        if (isDayInOtherList) return;

        if (selectedType === 'Vacaciones') {
            const updatedDays = selectedVacationDays.some(
                (d) => d.toDateString() === date.toDateString()
            )
                ? selectedVacationDays.filter(
                    (d) => d.toDateString() !== date.toDateString()
                ) // Eliminar si ya está seleccionado
                : [...selectedVacationDays, date]; // Agregar si no está
            setSelectedVacationDays(updatedDays);
        } else if (selectedType === 'Asuntos Propios') {
            const updatedDays = selectedPersonalDays.some(
                (d) => d.toDateString() === date.toDateString()
            )
                ? selectedPersonalDays.filter(
                    (d) => d.toDateString() !== date.toDateString()
                ) // Eliminar si ya está seleccionado
                : [...selectedPersonalDays, date]; // Agregar si no está
            setSelectedPersonalDays(updatedDays);
        }
    };


    const saveDays = async () => {
        const updatedUser = {
            ...user,
            vacationDays: selectedVacationDays,
            personalDays: selectedPersonalDays,
        };
        setIsEditing(false);
        const token = getToken();
        charge(true);
        const response = await editUser(updatedUser, token);
        if (!response.error) {
            changeUser(updatedUser);
        }
        modal('Editar Usuario', 'Usuario editado con éxito');
        charge(false);
    };

    const handleCancelEdit = () => {
        setSelectedVacationDays(
            user.vacationDays.map((d) => new Date(d)) || []
        );
        setSelectedPersonalDays(
            user.personalDays.map((d) => new Date(d)) || []
        );
        setIsEditing(false);
        setSelectedType('Vacaciones');
    };

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
                                const isSelectedVacationDay = selectedVacationDays.some(
                                    (d) => d.toDateString() === (day ? day.toDateString() : '')
                                );
                                const isSelectedPersonalDay = selectedPersonalDays.some(
                                    (d) => d.toDateString() === (day ? day.toDateString() : '')
                                );
                                const isToday = day && new Date().toDateString() === day.toDateString();

                                return (
                                    <td
                                        key={j}
                                        onClick={() => handleDayClick(day)}
                                        className={[
                                            day ? styles.dayCell : '',
                                            !day ? styles.dayDisabled : '',
                                            isSelectedVacationDay ? styles.vacationDay : '',
                                            isSelectedPersonalDay ? styles.personalDay : '',
                                            isToday ? styles.dayToday : '',
                                        ].join(' ').trim()}
                                    >
                                        {day ? day.getDate() : ''}
                                    </td>
                                );
                            })}
                        </tr>
                    ))}
                </tbody>
            </table>
        );
    };

    return (
        <div className={styles.contenedor}>

            <h2>VACACIONES Y ASUNTOS PROPIOS</h2>
            <div>
                <p>Total de días de vacaciones: {totalVacationDays}</p>
                <p>Total de días de asuntos propios: {totalPersonalDays}</p>
                {exceededVacationDays > 0 && (
                    <p>Días excedidos de vacaciones: {exceededVacationDays}</p>
                )}
                {exceededPersonalDays > 0 && (
                    <p>Días excedidos de asuntos propios: {exceededPersonalDays}</p>
                )}
            </div>
            {/* Resto del componente intacto */}

            <div className={styles.contenedorSelectorvista}>
                <FaCalendarDay
                    onClick={() => setMonthView(1)}
                    className={monthView === 1 ? styles.contenedorSelectorVistaMes : ''}
                />
                <FaCalendarDays
                    onClick={() => setMonthView(12)}
                    className={monthView === 12 ? styles.contenedorSelectorVistaMes : ''}
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

                {isEditing && (
                    <div className={styles.selectionTypeBox}>
                        <button
                            className={selectedType !== 'Vacaciones' ? styles.NotSelectedTypeButton : styles.SelectedTypeButton}
                            onClick={() => setSelectedType('Vacaciones')}
                        >
                            Vacaciones
                        </button>
                        <button
                            className={selectedType !== 'Asuntos Propios' ? styles.NotSelectedTypeButton : styles.SelectedTypeButton}
                            onClick={() => setSelectedType("Asuntos Propios")}
                        >
                            Asuntos Propios
                        </button>
                        <button onClick={saveDays}>Guardar</button>
                    </div>
                )}
                {isEditing ? (
                    <button className="tomato" onClick={handleCancelEdit}>Cancelar</button>
                ) : (
                    <FaEdit onClick={() => setIsEditing(true)} />
                )}
            </div>
            <div className={styles.legend}>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.swatchVacation}`} />
                    Vacaciones
                </span>
                <span className={styles.legendItem}>
                    <span className={`${styles.legendSwatch} ${styles.swatchPersonal}`} />
                    Asuntos propios
                </span>
            </div>
            {monthView === 1 && (
                <div className={styles.navigationContainer}>
                    <button className={styles.navButton} onClick={handlePreviousMonth}>
                        &lt;
                    </button>
                    <h3>
                        {new Date(currentYear, currentMonth).toLocaleString('es-ES', {
                            month: 'long',
                            year: 'numeric',
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
            <div className={styles.calendarBox}>
                {monthView === 1 ? (
                    <div className={styles.calendarMonth}>
                        <h3>
                            {new Date(currentYear, currentMonth).toLocaleString('es-ES', {
                                month: 'long',
                                year: 'numeric',
                            })}
                        </h3>
                        {renderCalendar(currentMonth, currentYear)}
                    </div>
                ) : (
                    [...Array(12)].map((_, i) => (
                        <div key={i} className={styles.calendarMonth}>
                            <h3>
                                {new Date(currentYear, i).toLocaleString('es-ES', {
                                    month: 'long',
                                    year: 'numeric',
                                })}
                            </h3>
                            {renderCalendar(i, currentYear)}
                        </div>
                    ))
                )}
            </div>

        </div>
    );
};

export default VacationDays;
