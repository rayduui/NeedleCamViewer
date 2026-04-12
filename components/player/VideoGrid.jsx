'use client';

import { memo, useState } from 'react';
import styles from './VideoGrid.module.css';

function VideoGrid({ videoRefs, videoSources }) {
  const [selectedCamera, setSelectedCamera] = useState('front');

  const cameras = [
    { name: 'front', label: 'Front' },
    { name: 'back', label: 'Back' },
    { name: 'left', label: 'Left Repeater' },
    { name: 'right', label: 'Right Repeater' }
  ];

  return (
    <div className={styles.videoGrid}>
      {cameras.map(({ name, label }) => {
        const isMain = name === selectedCamera;
        return (
          <div
            key={name}
            className={`${styles.cameraCell} ${isMain ? styles.mainCell : styles.thumbCell}`}
            onClick={() => !isMain && setSelectedCamera(name)}
          >
            <div className={styles.cameraLabel}>{label}</div>
            <video
              ref={videoRefs[name]}
              src={videoSources[name]}
              playsInline
              preload="metadata"
              className={styles.videoElement}
              crossOrigin="anonymous"
              muted={!isMain}
            />
            {!videoSources[name] && (
              <div className={styles.loadingPlaceholder}>
                <div className={styles.spinner}></div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default memo(VideoGrid);
