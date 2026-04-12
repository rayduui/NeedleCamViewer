'use client';

import { memo, useCallback, useState, useRef, useEffect } from 'react';
import { formatDuration } from '@/lib/helpers';
import styles from './PlaybackControls.module.css';

const SPEED_OPTIONS = [0.25, 0.5, 1, 1.5, 2];

function PlaybackControls({
  isPlaying,
  isMuted,
  volume,
  playbackSpeed,
  currentTime,
  duration,
  onTogglePlayPause,
  onToggleMute,
  onVolumeChange,
  onPlaybackSpeedChange,
  onSeek,
  // Trim
  trimActive = false,
  trimStart = 0,
  trimEnd = 100,
  onTrimChange
}) {
  const [speedOpen, setSpeedOpen] = useState(false);
  const speedRef = useRef(null);
  const timelineRef = useRef(null);
  const draggingRef = useRef(null);
  // Refs mirror state so the drag closure always reads fresh values
  const trimStartRef = useRef(trimStart);
  const trimEndRef = useRef(trimEnd);
  useEffect(() => { trimStartRef.current = trimStart; }, [trimStart]);
  useEffect(() => { trimEndRef.current = trimEnd; }, [trimEnd]);

  const handleTimelineChange = useCallback((e) => {
    onSeek(parseFloat(e.target.value));
  }, [onSeek]);

  const handleVolumeChange = useCallback((e) => {
    onVolumeChange(parseInt(e.target.value));
  }, [onVolumeChange]);

  const handleFullscreen = useCallback(() => {
    const videoGrid = document.querySelector('[class*="videoGrid"]');
    if (!document.fullscreenElement) {
      videoGrid?.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen();
    }
  }, []);

  // Close speed dropdown on outside click
  useEffect(() => {
    if (!speedOpen) return;
    const handler = (e) => {
      if (speedRef.current && !speedRef.current.contains(e.target)) setSpeedOpen(false);
    };
    document.addEventListener('mousedown', handler);
    document.addEventListener('touchstart', handler);
    return () => {
      document.removeEventListener('mousedown', handler);
      document.removeEventListener('touchstart', handler);
    };
  }, [speedOpen]);

  // Trim handle drag
  const handleTrimPointerDown = useCallback((e, which) => {
    if (!onTrimChange) return;
    e.preventDefault();
    e.stopPropagation(); // don't let the seek input fire
    draggingRef.current = which;

    const onMove = (moveE) => {
      const container = timelineRef.current;
      if (!container || !draggingRef.current) return;
      const rect = container.getBoundingClientRect();
      const clientX = moveE.touches ? moveE.touches[0].clientX : moveE.clientX;
      const pct = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
      // Minimum gap: 1 second expressed as a percentage
      const minGap = duration > 0 ? Math.max(0.5, (1 / duration) * 100) : 1;

      if (draggingRef.current === 'start') {
        const next = Math.min(pct, trimEndRef.current - minGap);
        trimStartRef.current = next;
        onTrimChange(next, trimEndRef.current);
      } else {
        const next = Math.max(pct, trimStartRef.current + minGap);
        trimEndRef.current = next;
        onTrimChange(trimStartRef.current, next);
      }
    };

    const onUp = () => {
      draggingRef.current = null;
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onUp);
    };

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onUp);
  }, [onTrimChange, duration]);

  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trimStartSec = (trimStart / 100) * duration;
  const trimEndSec   = (trimEnd   / 100) * duration;
  const speedLabel = playbackSpeed === 1 ? '1×' : `${playbackSpeed}×`;

  return (
    <div className={styles.controls}>
      {/* ─── Unified timeline ─── */}
      <div className={styles.timeline}>
        <div className={styles.timelineTrack} ref={timelineRef}>

          {/* Trim regions (below everything else) */}
          {trimActive && (
            <>
              <div className={styles.trimExcLeft}  style={{ width: `${trimStart}%` }} />
              <div className={styles.trimExcRight} style={{ width: `${100 - trimEnd}%` }} />
              <div className={styles.trimRange}
                   style={{ left: `${trimStart}%`, width: `${trimEnd - trimStart}%` }} />
            </>
          )}

          {/* Playback fill + playhead */}
          <div className={styles.progressFill} style={{ width: `${progress}%` }} />
          <div className={styles.playhead}     style={{ left: `${progress}%` }} />

          {/* Seek input — transparent, catches clicks for scrubbing */}
          <input
            type="range"
            className={styles.seekInput}
            min="0" max="100" step="0.1"
            value={progress}
            onChange={handleTimelineChange}
          />

          {/* Trim handles — on top of seek input */}
          {trimActive && (
            <>
              <div
                className={styles.trimHandle}
                style={{ left: `${trimStart}%` }}
                onMouseDown={e => handleTrimPointerDown(e, 'start')}
                onTouchStart={e => handleTrimPointerDown(e, 'start')}
              >
                <div className={styles.trimLine} />
                <div className={styles.trimGrip} />
              </div>
              <div
                className={styles.trimHandle}
                style={{ left: `${trimEnd}%` }}
                onMouseDown={e => handleTrimPointerDown(e, 'end')}
                onTouchStart={e => handleTrimPointerDown(e, 'end')}
              >
                <div className={styles.trimLine} />
                <div className={styles.trimGrip} />
              </div>
            </>
          )}
        </div>

        {/* Time display */}
        <div className={styles.timeDisplay}>
          <span>{formatDuration(currentTime)}</span>
          {trimActive && (
            <span className={styles.trimLabel}>
              TRIM {formatDuration(trimStartSec)} – {formatDuration(trimEndSec)}
            </span>
          )}
          <span>{formatDuration(duration)}</span>
        </div>
      </div>

      {/* ─── Controls row ─── */}
      <div className={styles.playbackControls}>
        <button onClick={onTogglePlayPause} className={`${styles.btnIcon} ${styles.btnPlay}`} title="Play/Pause (Space)">
          {isPlaying ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
            </svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          )}
        </button>

        <button onClick={onToggleMute} className={styles.btnIcon} title="Mute (M)">
          {isMuted ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <line x1="23" y1="9" x2="17" y2="15"/>
              <line x1="17" y1="9" x2="23" y2="15"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
            </svg>
          )}
        </button>

        <input
          type="range"
          className={styles.volumeSlider}
          min="0" max="100"
          value={volume}
          onChange={handleVolumeChange}
        />

        <div className={styles.spacer} />

        <div className={styles.speedContainer} ref={speedRef}>
          {speedOpen && (
            <div className={styles.speedMenu}>
              {SPEED_OPTIONS.map(s => (
                <button
                  key={s}
                  className={`${styles.speedOption} ${s === playbackSpeed ? styles.speedOptionActive : ''}`}
                  onClick={() => { onPlaybackSpeedChange(s); setSpeedOpen(false); }}
                >
                  {s === 1 ? '1×' : `${s}×`}
                </button>
              ))}
            </div>
          )}
          <button
            className={`${styles.speedBtn} ${speedOpen ? styles.speedBtnOpen : ''}`}
            onClick={() => setSpeedOpen(v => !v)}
            title="Playback speed"
          >
            {speedLabel}
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.speedChevron}>
              <polyline points="18 15 12 9 6 15"/>
            </svg>
          </button>
        </div>

        <button onClick={handleFullscreen} className={styles.btnIcon} title="Fullscreen (F)">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
          </svg>
        </button>
      </div>
    </div>
  );
}

export default memo(PlaybackControls);
