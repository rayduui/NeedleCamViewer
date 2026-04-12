'use client';

import { memo, useRef, useState, useCallback } from 'react';
import styles from './TelemetryData.module.css';
import { useSettings } from '@/context/SettingsContext';

// ─── Icons ────────────────────────────────────────────────────────────────────

const SignalLeftIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M15 5L7 12L15 19V5Z" />
  </svg>
);

const SignalRightIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M9 5L17 12L9 19V5Z" />
  </svg>
);

const TeslaSteeringIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="2.5" />
    <line x1="12" y1="9.5" x2="12" y2="3" />
    <line x1="14.17" y1="13.25" x2="19.79" y2="16.5" />
    <line x1="9.83" y1="13.25" x2="4.21" y2="16.5" />
  </svg>
);

const ThrottleIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
  </svg>
);

const BrakeDiscIcon = ({ className }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" className={className}>
    <circle cx="12" cy="12" r="9" />
    <circle cx="12" cy="12" r="4.5" />
    <line x1="8.82" y1="8.82" x2="5.64" y2="5.64" />
    <line x1="15.18" y1="8.82" x2="18.36" y2="5.64" />
    <line x1="15.18" y1="15.18" x2="18.36" y2="18.36" />
    <line x1="8.82" y1="15.18" x2="5.64" y2="18.36" />
  </svg>
);

// ─── Component ────────────────────────────────────────────────────────────────

function TelemetryData({ telemetry }) {
  const { speedUnit } = useSettings();
  const overlayRef = useRef(null);
  const [pos, setPos] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const dragState = useRef({ dragging: false, offsetX: 0, offsetY: 0 });

  const handleMouseDown = useCallback((e) => {
    e.preventDefault();
    const overlay = overlayRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    dragState.current = {
      dragging: true,
      offsetX: e.clientX - rect.left,
      offsetY: e.clientY - rect.top,
    };
    setIsDragging(true);

    const onMove = (e) => {
      if (!dragState.current.dragging) return;
      const parentRect = overlayRef.current.parentElement.getBoundingClientRect();
      setPos({
        x: e.clientX - parentRect.left - dragState.current.offsetX,
        y: e.clientY - parentRect.top  - dragState.current.offsetY,
      });
    };
    const onUp = () => {
      dragState.current.dragging = false;
      setIsDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }, []);

  const handleTouchStart = useCallback((e) => {
    const touch = e.touches[0];
    const overlay = overlayRef.current;
    if (!overlay) return;
    const rect = overlay.getBoundingClientRect();
    dragState.current = {
      dragging: true,
      offsetX: touch.clientX - rect.left,
      offsetY: touch.clientY - rect.top,
    };

    const onMove = (e) => {
      e.preventDefault();
      if (!dragState.current.dragging) return;
      const t = e.touches[0];
      const parentRect = overlayRef.current.parentElement.getBoundingClientRect();
      setPos({
        x: t.clientX - parentRect.left - dragState.current.offsetX,
        y: t.clientY - parentRect.top  - dragState.current.offsetY,
      });
    };
    const onEnd = () => {
      dragState.current.dragging = false;
      window.removeEventListener('touchmove', onMove);
      window.removeEventListener('touchend', onEnd);
    };
    window.addEventListener('touchmove', onMove, { passive: false });
    window.addEventListener('touchend', onEnd);
  }, []);

  if (!telemetry) return null;

  const {
    speed = 0,
    throttle = 0,
    braking = 0,
    leftSignal = false,
    rightSignal = false,
    autopilotActive = false,
    autopilotState = 'NONE',
    gearState,
  } = telemetry;

  const displaySpeed = speedUnit === 'mph' ? speed : speed * 1.60934;
  const speedLabel   = speedUnit === 'mph' ? 'MPH' : 'KPH';

  const gearLabel =
    gearState === 0 ? 'P' :
    gearState === 1 ? 'D' :
    gearState === 2 ? 'R' :
    gearState === 3 ? 'N' : '—';

  const apLabel =
    autopilotState === 'SELF_DRIVING' ? 'FSD' :
    autopilotState === 'AUTOSTEER'    ? 'AP'  : 'TACC';

  const overlayStyle = pos
    ? { left: pos.x, top: pos.y, transform: 'none' }
    : {};

  return (
    <div
      ref={overlayRef}
      className={`${styles.telemetryOverlay} ${isDragging ? styles.dragging : ''}`}
      style={overlayStyle}
      onMouseDown={handleMouseDown}
      onTouchStart={handleTouchStart}
    >
      {/* Speed */}
      <span className={styles.speedValue}>{displaySpeed.toFixed(0)}</span>
      <span className={styles.speedUnit}>{speedLabel}</span>

      {/* Gear */}
      <span className={styles.gearBadge}>{gearLabel}</span>

      <span className={styles.separator} />

      {/* Signals — always shown, active when on */}
      <SignalLeftIcon  className={`${styles.icon} ${leftSignal  ? styles.signalOn : styles.iconDim}`} />
      <SignalRightIcon className={`${styles.icon} ${rightSignal ? styles.signalOn : styles.iconDim}`} />

      {/* Autopilot — always shown */}
      <TeslaSteeringIcon className={`${styles.icon} ${autopilotActive ? styles.iconAp : styles.iconDim}`} />
      <span className={`${styles.apLabel} ${autopilotActive ? styles.apLabelActive : ''}`}>{apLabel}</span>

      <span className={styles.separator} />

      {/* Throttle — always shown */}
      <ThrottleIcon className={`${styles.icon} ${throttle > 5 ? styles.iconThrottle : styles.iconDim}`} />
      <span className={`${styles.metricVal} ${throttle > 5 ? styles.throttleVal : ''}`}>
        {throttle.toFixed(0)}<span className={styles.metricUnit}>%</span>
      </span>

      {/* Brake — always shown */}
      <BrakeDiscIcon className={`${styles.icon} ${braking > 5 ? styles.iconBrake : styles.iconDim}`} />
      <span className={`${styles.metricVal} ${braking > 5 ? styles.brakeVal : ''}`}>
        {braking.toFixed(0)}<span className={styles.metricUnit}>%</span>
      </span>
    </div>
  );
}

export default memo(TelemetryData);
