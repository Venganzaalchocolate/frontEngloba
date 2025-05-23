// statistics/WorkersOverviewCards.jsx
import { useEffect, useState } from 'react';
import { stAuditWorkersStats } from '../../../lib/data';
import { getToken } from '../../../lib/serviceToken';
import styles from '../../styles/CvStatsDashboard.module.css';

export default function WorkersOverviewCards({ filters, modal, charge }) {
  const [stats, setStats] = useState(null);

  const loadData = async () => {
    charge(true);
    try {
      const data = await stAuditWorkersStats(filters, getToken());
      if(!data.error)setStats(data)
      else modal('Error', err.message || 'No se pudo cargar estadísticas');
    } catch (err) {
      modal('Error', err.message || 'No se pudo cargar estadísticas');
    } finally {
      charge(false);
    }
  }
  useEffect(() => {
    loadData();
  }, [filters]);

  if (!stats) return null;

  const cards = [
    ['Plantilla total', stats.total],
    ['Discapacidad', stats.disability],
    ['Hombres', stats.male],
    ['Mujeres', stats.female],
    ['Jóvenes extutelados', stats.fostered],
    ['Mayores de 55 años', stats.over55],
    ['Menores de 25 años', stats.under25]
  ];

  return (
    <div className={styles.cardsGrid}>
      {cards.map(([title, value]) => (
        <div key={title} className={styles.card}>
          <h4 className={styles.cardTitle}>{title}</h4>
          <p className={styles.cardValue}>{value}</p>
        </div>
      ))}
    </div>
  );
}
