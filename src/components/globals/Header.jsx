import styles from '../styles/header.module.css';
import { FaUserAlt } from "react-icons/fa";
import { useState, useMemo, useRef, useEffect } from 'react';
import { useLogin } from '../../hooks/useLogin';
import { useMenuWorker } from '../../hooks/useMenuWorker';
import { useOffer } from '../../hooks/useOffer';
import { getMenuOptions } from '../../lib/menuOptions';
import { FaHouse } from "react-icons/fa6";
import { FaUserAltSlash } from "react-icons/fa";

const Header = ({ listResponsability }) => {
  const [viewMenu, setViewMenu] = useState(false);
  const { logout, logged } = useLogin();
  const { changeMenuWorker, MenuWorker } = useMenuWorker();
  const { changeOffer } = useOffer();
  const dropdownRef = useRef(null); // 👈 ref al contenedor del botón + lista

  // Cerrar al clicar fuera o pulsar Esc
  useEffect(() => {
    const onPointerDown = (e) => {
      if (!viewMenu) return;
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setViewMenu(false);
      }
    };
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setViewMenu(false);
    };

    document.addEventListener('mousedown', onPointerDown, true);
    document.addEventListener('touchstart', onPointerDown, true);
    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('mousedown', onPointerDown, true);
      document.removeEventListener('touchstart', onPointerDown, true);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [viewMenu]);

  const changeOption = (option) => {
    changeOffer(null);
    changeMenuWorker(option);
    setViewMenu(false);
  };

  // Opciones con iconos
  const menuOptions = useMemo(() => {
    return getMenuOptions({
      role: logged.user.role,
      listResponsability,
    });
  }, [logged.user.role, listResponsability]);

return (
    <header className={styles.header}>
      <div className={styles.contenedorLogotipo}>
        <img
          src="/graphic/logotipo_blanco.png"
          alt="logotipo Engloba"
          onClick={() => changeMenuWorker(null)}
        />
      </div>

      <div className={styles.contenedorIconos}>
        {MenuWorker != null && (
          <div className={styles.dropdown} ref={dropdownRef}>
            <button
              className={styles.dropdownBtn}
              onClick={() => setViewMenu((v)=>!v)}
              aria-haspopup="menu"
              aria-expanded={viewMenu}
            >
              MENÚ ▾
            </button>

            {viewMenu && (
              <ul className={styles.dropdownList} role="menu">
                <li role="menuitem" key="home" onClick={() => changeOption(null)}>
                  <span className={styles.menuIcon}><FaHouse/></span>
                  <span>Inicio</span>
                </li>
                {menuOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <li role="menuitem" key={opt.key} onClick={() => changeOption(opt.key)}>
                      <span className={styles.menuIcon}><Icon /></span>
                      <span>{opt.label}</span>
                    </li>
                  );
                })}
                <li role="menuitem" key="closeSesion" onClick={() => logout()}>
                  <span className={styles.menuIcon}><FaUserAltSlash /></span>
                  <span>Cerrar sesión</span>
                </li>
              </ul>
            )}
          </div>
        )}

        {MenuWorker == null &&
          <span className={styles.tooltip}>
            <FaUserAltSlash onClick={() => logout()} />
            <span className={styles.tooltiptext}>Cerrar sesión</span>
          </span>
        }
      </div>
    </header>
  );
};

export default Header;
