import styles from '../../../styles/CvStatsDashboard.module.css';
/**
 * Recibe la foto fija (`data`) ya pre-cargada desde el padre.
 * No hace ninguna llamada a API.
 */
export default function WorkersOverviewCards({ data }) {
  if (!data) return null;               // (el padre mostrará su propio loader)

  const {
    total      = 0,
    disability = 0,
    male       = 0,
    female     = 0,
    fostered   = 0,
    over55     = 0,
    under25    = 0
  } = data;

  const cards = [
    ['Plantilla total',       total],
    ['Discapacidad',          disability],
    ['Hombres',               male],
    ['Mujeres',               female],
    ['Jóvenes extutelados',   fostered],
    ['Mayores de 55 años',    over55],
    ['Menores de 25 años',    under25]
  ];

  return (
    <div className={styles.cardsGrid}>
      {cards.map(([title, value]) => (
        <div key={title} className={styles.card}>
          <h4 className={styles.cardTitle}>{title}</h4>
          <p  className={styles.cardValue}>{value}</p>
        </div>
      ))}
    </div>
  );
}
