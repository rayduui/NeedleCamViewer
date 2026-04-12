'use client';

import { memo } from 'react';
import styles from './ViewModeSelector.module.css';

function ViewModeSelector({ viewMode, onViewModeChange }) {
  const viewModes = [
    { id: 'grid', label: 'Grid View', icon: 'grid' },
    { id: 'map', label: 'Map View', icon: 'map' }
  ];

  const renderIcon = (iconType) => {
    switch (iconType) {
      case 'grid':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7"/>
            <rect x="14" y="3" width="7" height="7"/>
            <rect x="3" y="14" width="7" height="7"/>
            <rect x="14" y="14" width="7" height="7"/>
          </svg>
        );
      case 'map':
        return (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.viewModeButtons}>
        {viewModes.map(mode => (
          <button
            key={mode.id}
            className={`${styles.modeButton} ${viewMode === mode.id ? styles.active : ''}`}
            onClick={() => onViewModeChange(mode.id)}
            title={mode.label}
          >
            {renderIcon(mode.icon)}
            <span className={styles.modeLabel}>{mode.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default memo(ViewModeSelector);
