// components/OptionSelector.jsx
import React from 'react';
import styles from '../styles/ManagingAuditors.module.css';

const OptionSelector = ({
  type,
  optionsType,
  allSubOptions,
  subOption,
  onTypeClick,
  onSubClick
}) => (
  <aside className={styles.optionsPanel}>
    <div className={styles.optionGroup}>
      {optionsType.map(([value, label]) => (
        <button
          key={value}
          className={type === value ? styles.optionButtonActive : styles.optionButton}
          onClick={() => onTypeClick(value)}
        >
          {label}
        </button>
      ))}
    </div>
    {type && (
      <div className={styles.optionGroup}>
        <h4 className={styles.groupTitle}>Opciones</h4>
        {allSubOptions.map(([value, label]) => (
          <button
            key={value}
            className={subOption === value ? styles.optionButtonActive : styles.optionButton}
            onClick={() => onSubClick(value)}
          >
            {label}
          </button>
        ))}
      </div>
    )}
  </aside>
);

export default OptionSelector;
