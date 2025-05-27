import styles from '../../../styles/CvStatsDashboard.module.css';
import OverviewCards        from './OverviewCards.jsx';
import MonthlyCVChart       from './MonthlyCVChart.jsx';
import DistributionCVChart  from './DistributionCVChart.jsx';
import ConversionCVChart    from './ConversionCVChart.jsx';

export default function CvStatsDashboard({ enumsData, modal, charge }) {
  return (
    <div className={styles.container}>
      <h2>ESTADÍSTICAS CV</h2>

      <OverviewCards   modal={modal} charge={charge} />

      <MonthlyCVChart  modal={modal} charge={charge} />

      <DistributionCVChart
        enumsData={enumsData}
        modal={modal}
        charge={charge}
      />

      <ConversionCVChart modal={modal} charge={charge} />
    </div>
  );
}
