"use client";

import { memo } from "react";
import styles from "./WelcomeScreen.module.css";

const specs = [
  { label: "Cameras", value: "04" },
  { label: "Upload", value: "None" },
  { label: "Telemetry", value: "On" },
  { label: "Offline", value: "Ready" },
];

function WelcomeScreen({ onGetStarted }) {
  return (
    <div className={styles.welcome}>
      <div className={styles.scanlines} aria-hidden="true" />
      <div className={styles.glow} aria-hidden="true" />

      <span className={styles.cornerTL} aria-hidden="true" />
      <span className={styles.cornerTR} aria-hidden="true" />
      <span className={styles.cornerBL} aria-hidden="true" />
      <span className={styles.cornerBR} aria-hidden="true" />

      <div className={styles.content}>
        <div className={styles.badge} aria-label="Recording indicator">
          <span className={styles.recDot} />
          <span>REC</span>
        </div>

        <div className={styles.headline}>
          <span className={styles.brand}>Needle</span>
          <span className={styles.product}>Tesla&nbsp;Cam&nbsp;Viewer</span>
        </div>

        <p className={styles.tagline}>Local footage &mdash; total privacy</p>

        <div className={styles.specs} role="list">
          {specs.map(({ label, value }) => (
            <div key={label} className={styles.spec} role="listitem">
              <span className={styles.specLabel}>{label}</span>
              <span className={styles.specValue}>{value}</span>
            </div>
          ))}
        </div>

        <button className={styles.cta} onClick={onGetStarted}>
          <span>Open Footage</span>
          <svg
            className={styles.ctaArrow}
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="square"
            aria-hidden="true"
          >
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </button>

        <p className={styles.hint}>Select your TeslaCam drive or folder</p>
      </div>
    </div>
  );
}

export default memo(WelcomeScreen);
