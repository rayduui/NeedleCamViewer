"use client";

import { useEffect, useRef } from "react";
import { useSettings } from "@/context/SettingsContext";
import styles from "./SettingsPanel.module.css";

const VERSION = "1.0.0";
const COFFEE_URL = "https://buymeacoffee.com/raymondc";
const ISSUES_URL = "https://github.com/issues";

function SettingsPanel({ isOpen, onClose }) {
  const { theme, setTheme, speedUnit, setSpeedUnit } = useSettings();
  const panelRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (isOpen && panelRef.current) {
      panelRef.current.focus();
    }
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`${styles.backdrop} ${isOpen ? styles.backdropOpen : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <aside
        ref={panelRef}
        className={`${styles.panel} ${isOpen ? styles.panelOpen : ""}`}
        role="dialog"
        aria-label="Settings"
        aria-modal="true"
        tabIndex={-1}
      >
        {/* Header */}
        <div className={styles.panelHeader}>
          <div className={styles.panelTitle}>
            <span className={styles.panelTitleAccent}>■</span>
            Settings
          </div>
          <button
            className={styles.closeBtn}
            onClick={onClose}
            aria-label="Close settings"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className={styles.panelBody}>
          {/* ─── Appearance ─── */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Appearance</div>
            <div className={styles.themeGrid}>
              <button
                className={`${styles.themeCard} ${theme === "dark" ? styles.themeCardActive : ""}`}
                onClick={() => setTheme("dark")}
              >
                <div className={styles.themePreview} data-mode="dark">
                  <div className={styles.previewBar} />
                  <div className={styles.previewContent}>
                    <div className={styles.previewLine} />
                    <div
                      className={styles.previewLine}
                      style={{ width: "60%" }}
                    />
                    <div className={styles.previewAccent} />
                  </div>
                </div>
                <span className={styles.themeLabel}>Dark</span>
                {theme === "dark" && (
                  <span className={styles.themeCheck}>✓</span>
                )}
              </button>

              <button
                className={`${styles.themeCard} ${theme === "light" ? styles.themeCardActive : ""}`}
                onClick={() => setTheme("light")}
              >
                <div className={styles.themePreview} data-mode="light">
                  <div className={styles.previewBar} />
                  <div className={styles.previewContent}>
                    <div className={styles.previewLine} />
                    <div
                      className={styles.previewLine}
                      style={{ width: "60%" }}
                    />
                    <div className={styles.previewAccent} />
                  </div>
                </div>
                <span className={styles.themeLabel}>Light</span>
                {theme === "light" && (
                  <span className={styles.themeCheck}>✓</span>
                )}
              </button>
            </div>
          </section>

          {/* ─── Units ─── */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>Units</div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <span className={styles.settingName}>Speed</span>
                <span className={styles.settingDesc}>
                  Displayed in telemetry bar
                </span>
              </div>
              <div className={styles.segmentControl}>
                <button
                  className={`${styles.segment} ${speedUnit === "mph" ? styles.segmentActive : ""}`}
                  onClick={() => setSpeedUnit("mph")}
                >
                  MPH
                </button>
                <button
                  className={`${styles.segment} ${speedUnit === "kph" ? styles.segmentActive : ""}`}
                  onClick={() => setSpeedUnit("kph")}
                >
                  KPH
                </button>
              </div>
            </div>
          </section>

          {/* ─── About ─── */}
          <section className={styles.section}>
            <div className={styles.sectionLabel}>About</div>

            <div className={styles.aboutGrid}>
              <div className={styles.aboutRow}>
                <span className={styles.aboutKey}>App</span>
                <span className={styles.aboutVal}>
                  Needle — Tesla Cam Viewer
                </span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutKey}>Version</span>
                <span className={styles.aboutVal}>{VERSION}</span>
              </div>
              <div className={styles.aboutRow}>
                <span className={styles.aboutKey}>Telemetry</span>
                <span className={styles.aboutVal}>FW 2025.44.25+ · HW3+</span>
              </div>
            </div>

            <div className={styles.linkGroup}>
              <a
                href={COFFEE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.linkBtn}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path
                    d="M18 8h1a4 4 0 0 1 0 8h-1M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8zM6 1v3M10 1v3M14 1v3"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
                Buy Me a Coffee
              </a>

              <a
                href={ISSUES_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.linkBtn} ${styles.linkBtnSecondary}`}
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Report an Issue
              </a>
            </div>
          </section>

          {/* ─── Footer ─── */}
          <div className={styles.panelFooter}>
            <p className={styles.footerNote}>
              All footage is processed locally.&nbsp;
              <span className={styles.footerAccent}>
                No uploads. No servers.
              </span>
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}

export default SettingsPanel;
