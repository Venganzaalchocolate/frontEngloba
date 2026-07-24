import {
  FaBuilding,
  FaChevronDown,
  FaClock,
  FaExternalLinkAlt,
  FaInstagram,
  FaLayerGroup,
  FaWordpress,
} from "react-icons/fa";
import styles from "../styles/ManagingCommunicationPublications.module.css";

const formatDate = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("es-ES");
};

const formatDateOnly = (value) => {
  const [year, month, day] = String(value || "")
    .slice(0, 10)
    .split("-");

  return year && month && day
    ? `${day}/${month}/${year}`
    : "—";
};

const formatNumber = (value) =>
  value === undefined || value === null
    ? "—"
    : Number(value).toLocaleString("es-ES");

const getLatestStats = (stats) =>
  stats?.length ? stats[stats.length - 1] : {};

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

const MetaItem = ({ icon: Icon, label, children }) => (
  <div className={styles.metaItem}>
    <span className={styles.metaIcon} aria-hidden="true">
      <Icon />
    </span>
    <div>
      <span className={styles.metaLabel}>{label}</span>
      <div className={styles.metaValue}>{children}</div>
    </div>
  </div>
);

const StatItem = ({ label, value }) => (
  <div className={styles.statItem}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

const Chips = ({ items, emptyText, getLabel }) => {
  if (!items.length) {
    return <span className={styles.emptyValue}>{emptyText}</span>;
  }

  return (
    <div className={styles.chips}>
      {items.map((item, index) => (
        <span
          className={styles.chip}
          key={item._id || `${getLabel(item)}-${index}`}
        >
          {getLabel(item)}
        </span>
      ))}
    </div>
  );
};

const TextDisclosure = ({ title, children }) => (
  <details className={styles.textDisclosure}>
    <summary>
      <span>{title}</span>
      <FaChevronDown aria-hidden="true" />
    </summary>
    <p>{children}</p>
  </details>
);

const CommunicationPublicationDetails = ({ publication }) => {
  const wordpressStats = getLatestStats(
    publication.wordpress?.stats
  );
  const instagramStats = getLatestStats(
    publication.instagram?.stats
  );
  const platforms = publication.platforms || [];
  const programs = publication.programs || [];
  const dispositives = publication.dispositives || [];

  const titleId = `publication-detail-title-${
    publication._id || "current"
  }`;

  return (
    <article className={styles.details} aria-labelledby={titleId}>
      <header className={styles.detailsHeader}>
        <div>
          <p className={styles.detailsEyebrow}>
            Detalle de publicación
          </p>
          <h3 id={titleId}>{publication.title}</h3>
        </div>

        <span
          className={`${styles.status} ${
            styles[publication.status] || ""
          }`}
        >
          {STATUS_LABELS[publication.status] || publication.status}
        </span>
      </header>

      <div className={styles.metadataGrid}>
        {platforms.includes("wordpress") && (
          <MetaItem
            icon={FaWordpress}
            label="Fecha prevista · WordPress"
          >
            <time
              dateTime={String(
                publication.wordpress?.publicationDate || ""
              )}
            >
              {formatDateOnly(
                publication.wordpress?.publicationDate
              )}
            </time>
          </MetaItem>
        )}

        {platforms.includes("instagram") && (
          <MetaItem
            icon={FaInstagram}
            label="Fecha prevista · Instagram"
          >
            <time
              dateTime={String(
                publication.instagram?.publicationDate || ""
              )}
            >
              {formatDateOnly(
                publication.instagram?.publicationDate
              )}
            </time>
          </MetaItem>
        )}

        <MetaItem icon={FaClock} label="Última modificación">
          {formatDate(publication.updatedAt)}
        </MetaItem>

        <MetaItem icon={FaLayerGroup} label="Programas">
          <Chips
            items={programs}
            emptyText="Sin programas asociados"
            getLabel={(program) =>
              program.acronym || program.name || "—"
            }
          />
        </MetaItem>

        <MetaItem icon={FaBuilding} label="Dispositivos">
          <Chips
            items={dispositives}
            emptyText="Sin dispositivos asociados"
            getLabel={(dispositive) =>
              dispositive.name || "—"
            }
          />
        </MetaItem>
      </div>

      <div className={styles.platformGrid}>
        {platforms.includes("wordpress") && (
          <section className={styles.platformCard}>
            <div className={styles.platformTitle}>
              <span
                className={styles.platformIcon}
                aria-hidden="true"
              >
                <FaWordpress />
              </span>
              <div>
                <p>Web</p>
                <h4>WordPress</h4>
              </div>
            </div>

            {publication.wordpress?.postId ||
            publication.wordpress?.url ? (
              <>
                <div className={styles.platformMetaGrid}>
                  <div className={styles.platformData}>
                    <span>ID de entrada</span>
                    <strong>
                      {publication.wordpress?.postId || "—"}
                    </strong>
                  </div>

                  <div className={styles.platformData}>
                    <span>Fecha real de publicación</span>
                    <strong>
                      {formatDate(
                        publication.wordpress?.publishedAt
                      )}
                    </strong>
                  </div>
                </div>

                {publication.wordpress?.url && (
                  <a
                    className={styles.externalLink}
                    href={publication.wordpress.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir noticia
                    <FaExternalLinkAlt aria-hidden="true" />
                  </a>
                )}

                <div className={styles.statsSection}>
                  <h5>Rendimiento</h5>
                  <div
                    className={`${styles.statsGrid} ${
                      styles.wordpressStats
                    }`}
                  >
                    <StatItem
                      label="Visualizaciones"
                      value={formatNumber(wordpressStats.views)}
                    />
                    <StatItem
                      label="Actualización"
                      value={formatDate(
                        wordpressStats.collectedAt
                      )}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.platformPending}>
                La publicación todavía no está vinculada con
                WordPress.
              </p>
            )}
          </section>
        )}

        {platforms.includes("instagram") && (
          <section className={styles.platformCard}>
            <div className={styles.platformTitle}>
              <span
                className={styles.platformIcon}
                aria-hidden="true"
              >
                <FaInstagram />
              </span>
              <div>
                <p>Red social</p>
                <h4>Instagram</h4>
              </div>
            </div>

            {publication.instagram?.matchStatus && (
              <div className={styles.matchStatus}>
                <span>Estado de búsqueda</span>
                <strong>
                  {MATCH_STATUS_LABELS[
                    publication.instagram.matchStatus
                  ] || publication.instagram.matchStatus}
                </strong>
              </div>
            )}

            {publication.instagram?.matchText && (
              <TextDisclosure title="Texto usado para localizar la publicación">
                {publication.instagram.matchText}
              </TextDisclosure>
            )}

            {publication.instagram?.mediaId ||
            publication.instagram?.url ? (
              <>
                <div className={styles.platformMetaGrid}>
                  <div className={styles.platformData}>
                    <span>ID de publicación</span>
                    <strong>
                      {publication.instagram?.mediaId || "—"}
                    </strong>
                  </div>

                  <div className={styles.platformData}>
                    <span>Fecha real de publicación</span>
                    <strong>
                      {formatDate(
                        publication.instagram?.publishedAt
                      )}
                    </strong>
                  </div>
                </div>

                {publication.instagram?.url && (
                  <a
                    className={styles.externalLink}
                    href={publication.instagram.url}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Abrir publicación
                    <FaExternalLinkAlt aria-hidden="true" />
                  </a>
                )}

                {publication.instagram?.caption && (
                  <TextDisclosure title="Ver texto de Instagram">
                    {publication.instagram.caption}
                  </TextDisclosure>
                )}

                <div className={styles.statsSection}>
                  <h5>Rendimiento</h5>
                  <div className={styles.statsGrid}>
                    <StatItem
                      label="Visualizaciones"
                      value={formatNumber(instagramStats.views)}
                    />
                    <StatItem
                      label="Alcance"
                      value={formatNumber(instagramStats.reach)}
                    />
                    <StatItem
                      label="Me gusta"
                      value={formatNumber(instagramStats.likes)}
                    />
                    <StatItem
                      label="Comentarios"
                      value={formatNumber(instagramStats.comments)}
                    />
                    <StatItem
                      label="Guardados"
                      value={formatNumber(instagramStats.saved)}
                    />
                    <StatItem
                      label="Compartidos"
                      value={formatNumber(instagramStats.shares)}
                    />
                    <StatItem
                      label="Interacciones"
                      value={formatNumber(
                        instagramStats.totalInteractions
                      )}
                    />
                    <StatItem
                      label="Actualización"
                      value={formatDate(
                        instagramStats.collectedAt
                      )}
                    />
                  </div>
                </div>
              </>
            ) : (
              <p className={styles.platformPending}>
                La publicación todavía no está vinculada con
                Instagram.
              </p>
            )}
          </section>
        )}
      </div>

      {!!publication.history?.length && (
        <details className={styles.history}>
          <summary>
            Historial ({publication.history.length})
          </summary>
          <div>
            {[...publication.history]
              .reverse()
              .map((item, index) => (
                <div
                  className={styles.historyItem}
                  key={`${item.changedAt || index}-${index}`}
                >
                  <strong>
                    {item.action || "Modificación"}
                  </strong>
                  <span>{formatDate(item.changedAt)}</span>
                </div>
              ))}
          </div>
        </details>
      )}
    </article>
  );
};

export default CommunicationPublicationDetails;
