import styles from '../styles/header.module.css';
import { FaUserAlt } from "react-icons/fa";
import { useState, useMemo } from 'react';
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
          <div className={styles.dropdown}>
            <button
              className={styles.dropdownBtn}
              onClick={() => setViewMenu(!viewMenu)}
            >
              MENÚ ▾
            </button>

            {viewMenu && (
              <ul className={styles.dropdownList}>
                <li key="home" onClick={() => changeOption(null)}>
                  <span className={styles.menuIcon}><FaHouse/></span>
                  <span>Inicio</span>
                </li>
                {menuOptions.map((opt) => {
                  const Icon = opt.icon;
                  return (
                    <li key={opt.key} onClick={() => changeOption(opt.key)}>
                      <span className={styles.menuIcon}><Icon /></span>
                      <span>{opt.label}</span>
                    </li>
                  );
                })}
                <li key={'closeSesion'} onClick={() => logout()}>
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
