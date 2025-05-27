import { useEffect, useState } from 'react';
import { stOverview } from '../../../../lib/data';
import { getToken }   from '../../../../lib/serviceToken';
import styles from '../../../styles/CvStatsDashboard.module.css';

export default function OverviewCards({ modal, charge }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancel = false;
    (async () => {
      charge(true);
      try {
        const d = await stOverview(getToken());
        if (!cancel) setData(d);
      } catch (e) {
        modal('Error', e.message || 'Error overview');
      } finally { charge(false); }
    })();
    return () => { cancel = true; };
  }, []);                                     // ← deps vacías

  if (!data) return null;

  const cards = [
    ['CV totales',          data.total],
    ['Este mes',            data.thisMonth],
    ['CV contratados',      data.hired],
    ['Discapacidad ≥ 33 %', data.disabilityEqualOrAbove33]
  ];

  return (
    <div className={styles.cardsGrid}>
      {cards.map(([t,v])=>(
        <div key={t} className={styles.card}>
          <h4 className={styles.cardTitle}>{t}</h4>
          <p  className={styles.cardValue}>{v}</p>
        </div>
      ))}
    </div>
  );
}
