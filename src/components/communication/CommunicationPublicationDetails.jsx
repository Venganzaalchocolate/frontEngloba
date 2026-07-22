import { FaExternalLinkAlt, FaInstagram, FaWordpress } from "react-icons/fa";
import styles from "../styles/ManagingCommunicationPublications.module.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("es-ES");
};

const formatDateOnly = (value) => {
  if (!value) return "—";
  const [year, month, day] = String(value).slice(0, 10).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "—";
};

const getUserName = (user) => {
  if (!user) return "—";
  if (typeof user === "string") return user;
  return [user.firstName, user.lastName].filter(Boolean).join(" ") || "—";
};

const getLatestStats = (stats) => Array.isArray(stats) && stats.length ? stats[stats.length - 1] : null;

const STATUS_LABELS = {
  draft: "Borrador",
  scheduled: "Programada",
  partial: "Publicación parcial",
  complete: "Publicación completa",
  error: "Error",
};

const MATCH_STATUS_LABELS = {
  pending: "Pendiente de localizar",
  matched: "Publicación localizada",
  ambiguous: "Varias coincidencias",
};

const CommunicationPublicationDetails = ({ publication }) => {
  const wordpressStats = getLatestStats(publication?.wordpress?.stats);
  const instagramStats = getLatestStats(publication?.instagram?.stats);
  const platforms = publication?.platforms || [];
  const scopeLabel = publication?.scopeType === "dispositive" ? publication?.dispositive?.name : publication?.program?.acronym || publication?.program?.name;
  const scopeProgram = publication?.scopeType === "dispositive" ? publication?.dispositive?.program : null;

  return (
    <div className={styles.details}>
      <div className={styles.detailsHeader}>
        <div>
          <h3>{publication.title}</h3>
          <span className={`${styles.status} ${styles[publication.status] || ""}`}>{STATUS_LABELS[publication.status] || publication.status}</span>
        </div>
      </div>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryItem}><span>Fecha prevista</span><strong>{formatDateOnly(publication.publicationDate)}</strong></div>
        <div className={styles.summaryItem}><span>Creada por</span><strong>{getUserName(publication.createdBy)}</strong></div>
        <div className={styles.summaryItem}><span>Última modificación</span><strong>{formatDate(publication.updatedAt)}</strong></div>
        <div className={styles.summaryItem}><span>Modificada por</span><strong>{getUserName(publication.updatedBy)}</strong></div>
      </div>
      <div className={styles.relations}>
        <div>
          <h4>Ámbito</h4>
          <div className={styles.chips}>
            {scopeLabel ? <span className={styles.chip}>{scopeLabel}{scopeProgram ? ` · ${scopeProgram.acronym || scopeProgram.name}` : ""}</span> : <span className={styles.emptyValue}>Sin ámbito asociado</span>}
          </div>
        </div>
      </div>
      <div className={styles.platformGrid}>
        {platforms.includes("wordpress") && (
          <section className={styles.platformCard}>
            <div className={styles.platformTitle}><FaWordpress /><h4>WordPress</h4></div>
            {publication.wordpress?.postId || publication.wordpress?.url ? (
              <>
                <div className={styles.platformData}><span>ID de entrada</span><strong>{publication.wordpress?.postId || "—"}</strong></div>
                <div className={styles.platformData}><span>Fecha de publicación</span><strong>{formatDate(publication.wordpress?.publishedAt)}</strong></div>
                {publication.wordpress?.url && <a className={styles.externalLink} href={publication.wordpress.url} target="_blank" rel="noreferrer">Abrir noticia<FaExternalLinkAlt /></a>}
                {wordpressStats && <div className={styles.statsGrid}><div><span>Visualizaciones</span><strong>{wordpressStats.views ?? 0}</strong></div><div><span>Usuarios</span><strong>{wordpressStats.users ?? 0}</strong></div><div><span>Sesiones</span><strong>{wordpressStats.sessions ?? 0}</strong></div><div><span>Actualización</span><strong>{formatDate(wordpressStats.collectedAt)}</strong></div></div>}
              </>
            ) : <p className={styles.platformPending}>La publicación todavía no está vinculada con WordPress.</p>}
          </section>
        )}
        {platforms.includes("instagram") && (
          <section className={styles.platformCard}>
            <div className={styles.platformTitle}><FaInstagram /><h4>Instagram</h4></div>
            {publication.instagram?.matchStatus && <div className={styles.platformData}><span>Estado de búsqueda</span><strong>{MATCH_STATUS_LABELS[publication.instagram.matchStatus] || publication.instagram.matchStatus}</strong></div>}
            {publication.instagram?.matchText && <div className={styles.caption}><span>Texto usado para buscar coincidencias</span><p>{publication.instagram.matchText}</p></div>}
            {publication.instagram?.mediaId || publication.instagram?.url ? (
              <>
                <div className={styles.platformData}><span>ID de publicación</span><strong>{publication.instagram?.mediaId || "—"}</strong></div>
                <div className={styles.platformData}><span>Tipo de contenido</span><strong>{publication.instagram?.mediaType || "—"}</strong></div>
                <div className={styles.platformData}><span>Fecha de publicación</span><strong>{formatDate(publication.instagram?.publishedAt)}</strong></div>
                {publication.instagram?.url && <a className={styles.externalLink} href={publication.instagram.url} target="_blank" rel="noreferrer">Abrir publicación<FaExternalLinkAlt /></a>}
                {publication.instagram?.caption && <div className={styles.caption}><span>Texto de Instagram</span><p>{publication.instagram.caption}</p></div>}
                {instagramStats && <div className={styles.statsGrid}><div><span>Visualizaciones</span><strong>{instagramStats.views ?? 0}</strong></div><div><span>Alcance</span><strong>{instagramStats.reach ?? 0}</strong></div><div><span>Me gusta</span><strong>{instagramStats.likes ?? 0}</strong></div><div><span>Comentarios</span><strong>{instagramStats.comments ?? 0}</strong></div><div><span>Guardados</span><strong>{instagramStats.saved ?? 0}</strong></div><div><span>Compartidos</span><strong>{instagramStats.shares ?? 0}</strong></div><div><span>Interacciones</span><strong>{instagramStats.totalInteractions ?? 0}</strong></div><div><span>Actualización</span><strong>{formatDate(instagramStats.collectedAt)}</strong></div></div>}
              </>
            ) : <p className={styles.platformPending}>La publicación todavía no está vinculada con Instagram.</p>}
          </section>
        )}
      </div>
      {!!publication.history?.length && <div className={styles.history}><h4>Historial</h4>{[...publication.history].reverse().map((item, index) => <div className={styles.historyItem} key={`${item.changedAt || index}-${index}`}><div><strong>{item.action || "Modificación"}</strong><span>{getUserName(item.changedBy)}</span></div><span>{formatDate(item.changedAt)}</span></div>)}</div>}
    </div>
  );
};

export default CommunicationPublicationDetails;