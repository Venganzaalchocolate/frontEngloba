// src/components/worker/WorkerMenu.jsx
import React, {
  useEffect,
  useMemo,
  useState,
  Suspense,
  useTransition,
} from "react";
import styles from "../styles/workMenu.module.css";

import { useMenuWorker } from "../../hooks/useMenuWorker";
import { useLogin } from "../../hooks/useLogin";
import { getDataEmployer } from "../../lib/data";
import { getMenuOptions } from "../../lib/menuOptions";
import Spinnning from "./Spinning";


// === Importación diferida (lazy) de los módulos pesados ===
// Nota: con esto React hace code-splitting y cada panel se descarga solo cuando se usa.
// Así evitamos que toda la app se cargue de golpe.
const ManagingResumenes = React.lazy(() => import("../cv/ManagingResumes"));
const ManagingSocial = React.lazy(() => import("../social/ManagingSocial"));
const OfferJobsPanelV2 = React.lazy(() => import("../offerJobs/OfferJobsPanelV2"));
const ManagingPrograms = React.lazy(() => import("../programs/ManagingPrograms"));
const ManagingEmployer = React.lazy(() => import("../employer/ManagingEmployer"));
const PanelRoot = React.lazy(() => import("../root/panelRoot"));
const ManagingMySelf = React.lazy(() => import("../myself/ManagingMySelf"));
const ManagingAuditors = React.lazy(() => import("../auditor/ManagingAuditors"));
const ManagingLists = React.lazy(() => import("../lists/ManagingLists"));
const ManagingWorkspace = React.lazy(() => import("../woprkspace/Managingworkspace"));
const FormCreateEmployer = React.lazy(() => import("../employer/FormCreateEmployer"));
const ManagingProgramsDispositive=React.lazy(() => import("../programsanddispositives/ManagingProgramsDispositive"));

/* === Tile reutilizable (card clickable con icono y texto) ===
   Le paso un icono, label, color de acento y callback onClick */
function MenuTile({ label, icon, onClick, accent = "#6C5CE7", disabled = false }) {
  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      className={styles.tile}
      onClick={() => !disabled && onClick?.()}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick?.();
        }
      }}
      style={{ ["--tile-accent"]: accent }}
    >
      <div className={styles.tileIcon}>{icon}</div>
      <div className={styles.tileLabel}>{label}</div>
    </div>
  );
}

/* === Fallbacks visuales (skeletons / loading states) ===
   Los muestro mientras React descarga los módulos en lazy */
function GridSkeleton() {
  return (
    <div className={styles.grid}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className={styles.tile + " " + styles.tileSkeleton}>
          <div className={styles.tileIconSkeleton} />
          <div className={styles.tileLabelSkeleton} />
        </div>
      ))}
    </div>
  );
}

function ModuleFallback() {
  return (
    <div className={styles.moduleFallback}>
      <Spinnning status={true}></Spinnning>
    </div>
  );
}

const WorkerMenu = ({ modal, charge, listResponsability }) => {
  const { MenuWorker, changeMenuWorker } = useMenuWorker();
  const { logged } = useLogin();
  const [enumsEmployer, setEnumsEmployer] = useState(null);

  // === Hook de transición (para que el cambio de menú no bloquee la UI) ===
  const [isPending, startTransition] = useTransition();

  // Cargar enumeraciones iniciales (programas, dispositivos, etc.)
  // IMPORTANTE: ya no activo el spinner global aquí porque no quiero ver el logo gigante
  useEffect(() => {
    const fetchAll = async () => {
      try {
        await chargeEnums(); // lo cargo en background
      } catch (error) {
        modal("Error", "Error al cargar los datos");
      }
    };
    fetchAll();
  }, []);

  // Función que obtiene enumeraciones de la API
  const chargeEnums = async () => {
    const enumsData = await getDataEmployer();
    setEnumsEmployer(enumsData);
    return enumsData;
  };




  // Actualizar lista de ofertas en memoria
  const chargeOffers = (updatedOffers) => {
    setEnumsEmployer((prev) => {
      let list;
      if (Array.isArray(updatedOffers)) {
        list = updatedOffers;
      } else {
        const exists = prev.offers.some((o) => o._id === updatedOffers._id);
        list = exists
          ? prev.offers.map((o) => (o._id === updatedOffers._id ? updatedOffers : o))
          : [...prev.offers, updatedOffers];
      }
      list = list.filter((o) => o.active === true || o.active === "si");
      return { ...prev, offers: list };
    });
  };

  // Opciones del menú (tiles) usando helper centralizado
  const tiles = useMemo(() => {
    return getMenuOptions({
      role: logged.user.role,
      listResponsability,
    });
  }, [logged.user.role, listResponsability]);

  // Función helper para cambiar de módulo sin bloquear
  const go = (key) => {
    startTransition(() => {
      changeMenuWorker(key);
    });
  };


    
  

  // === Render de módulos ===
  if (MenuWorker != null) {
    return (
      <Suspense fallback={<ModuleFallback />}>
        {MenuWorker === "cv" && (
          <ManagingResumenes
            chargeOffers={chargeOffers}
            chargeEnums={chargeEnums}
            enumsEmployer={enumsEmployer}
            closeAction={() => changeMenuWorker(null)}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
          />
        )}
        {MenuWorker === "socialForm" && (
          <ManagingSocial enumsData={enumsEmployer} modal={modal} charge={charge} />
        )}
        {MenuWorker === "offersJobs" && (
          <OfferJobsPanelV2
            chargeOffers={chargeOffers}
            enumsData={enumsEmployer}
            closeAction={() => changeMenuWorker(null)}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
          />
        )}
        {MenuWorker === "programs" && (
          <ManagingProgramsDispositive
            listResponsability={listResponsability}
            enumsData={enumsEmployer}
            closeAction={() => changeMenuWorker(null)}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
            chargeEnums={chargeEnums}
          />
        )}
        {MenuWorker === "employer" && (
          <ManagingEmployer
            enumsData={enumsEmployer}
            listResponsability={listResponsability}
            closeAction={() => changeMenuWorker(null)}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
          />
        )}
        {MenuWorker === "myself" && (
          <ManagingMySelf
            myself={logged.user}
            enumsData={enumsEmployer}
            listResponsability={listResponsability}
            closeAction={() => changeMenuWorker(null)}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
          />
        )}
        {MenuWorker === "root" && (
          <PanelRoot
            chargeEnums={() => chargeEnums()}
            enumsData={enumsEmployer}
            closeAction={() => changeMenuWorker(null)}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
          />
        )}
        {MenuWorker === "formCreatePersonal" && (
          <FormCreateEmployer
            enumsData={enumsEmployer}
            modal={modal}
            charge={charge}
            closeModal={() => changeMenuWorker(null)}
            chargeUser={() => changeMenuWorker(null)}
          />
        )}
        {MenuWorker === "auditor" && (
          <ManagingAuditors
            closeModule={() => changeMenuWorker(null)}
            listResponsability={listResponsability}
            enumsData={enumsEmployer}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
          />
        )}
        {MenuWorker === "lists" && (
          <ManagingLists
            listResponsability={listResponsability}
            enumsData={enumsEmployer}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
          />
        )}
        {MenuWorker === "workspace" && (
          <ManagingWorkspace
            listResponsability={listResponsability}
            enumsData={enumsEmployer}
            modal={(title, message) => modal(title, message)}
            charge={(x) => charge(x)}
          />
        )}
      </Suspense>
    );
  }

  // === Pantalla inicial con la parrilla de tiles ===
  return (
    <div className={styles.contenedor} id={styles.contenedorWorkerMenu}>
      <div className={styles.menuHeader}>
        <h2>
          {logged.user.gender=='female'?'Bienvenida':'Bienvenido'}, <span className={styles.name}>{logged.user.firstName}</span>
        </h2>
        <p className={styles.subtitle}>¿Qué quieres hacer hoy?</p>
      </div>

      {/* Suspense aquí me permitiría incluso poner un skeleton del grid si quiero */}
      <Suspense fallback={<GridSkeleton />}>
        <div className={styles.grid}>
          {tiles.map((t) => {
            const Icon = t.icon;
            return (
              <MenuTile
                key={t.key ?? "home"}
                label={t.label}
                icon={<Icon />}
                accent={t.accent}
                onClick={() => go(t.key)}
              />
            );
          })}
        </div>
      </Suspense>

      {/* Si isPending es true, puedo enseñar un indicador sutil */}
      <Spinnning status={isPending}></Spinnning>
    </div>
  );
};

export default WorkerMenu;
