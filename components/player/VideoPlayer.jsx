'use client';

import { useEffect, useRef, memo, useState, useCallback } from 'react';
import VideoGrid from './VideoGrid';
import PlaybackControls from './PlaybackControls';
import ViewModeSelector from './ViewModeSelector';
import TelemetryData from './TelemetryData';
import MapView from './MapView';
import { useVideoPlayer } from '@/hooks/useVideoPlayer';
import styles from './VideoPlayer.module.css';

const CAMERAS = [
  { id: 'front', label: 'Front' },
  { id: 'back', label: 'Back' },
  { id: 'left', label: 'Left' },
  { id: 'right', label: 'Right' }
];

const POSITIONS = [
  { id: 'top-left', label: 'Top Left' },
  { id: 'top-right', label: 'Top Right' },
  { id: 'bottom-left', label: 'Bottom Left' },
  { id: 'bottom-right', label: 'Bottom Right' }
];

function VideoPlayer({ event, onClose }) {
  const [viewMode, setViewMode] = useState('grid');
  const [showTelemetry, setShowTelemetry] = useState(true);

  // Panels
  const [trimActive, setTrimActive] = useState(false);
  const [showWatermarkPanel, setShowWatermarkPanel] = useState(false);

  // Trim (percentages 0–100 of the main video duration)
  const [trimStart, setTrimStart] = useState(0);
  const [trimEnd, setTrimEnd] = useState(100);

  // Shared export settings
  const [selectedCamera, setSelectedCamera] = useState('front');
  const [watermarkText, setWatermarkText] = useState('');
  const [watermarkPosition, setWatermarkPosition] = useState('bottom-right');

  // Export progress
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState(0);

  const exportVideoRef = useRef(null);
  const exportCanvasRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);

  const videoRefs = {
    front: useRef(null),
    back: useRef(null),
    left: useRef(null),
    right: useRef(null)
  };

  const {
    isPlaying, isMuted, volume, playbackSpeed,
    currentTime, duration, isLoading, videoSources,
    telemetryData, currentTelemetry,
    play, togglePlayPause, toggleMute, setVolume, setPlaybackSpeed, seek, loadVideos
  } = useVideoPlayer(videoRefs);

  const [currentEventId, setCurrentEventId] = useState(null);

  useEffect(() => {
    if (event && event.name !== currentEventId) {
      setCurrentEventId(event.name);
      setShowTelemetry(false);
      loadVideos(event).then(() => setTimeout(() => setShowTelemetry(true), 300));
    }
  }, [event, currentEventId, loadVideos]);

  useEffect(() => {
    return () => {
      Object.values(videoRefs).forEach(ref => {
        const video = ref?.current;
        if (video) { video.pause(); video.src = ''; video.load(); }
      });
    };
  }, []);

  const isPlayingRef = useRef(false);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);

  const hasMountedRef = useRef(false);
  useEffect(() => {
    if (!hasMountedRef.current) { hasMountedRef.current = true; return; }
    if (!isPlayingRef.current) return;
    const timer = setTimeout(() => play(), 100);
    return () => clearTimeout(timer);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape' && onClose) onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Sync export video source
  useEffect(() => {
    const video = exportVideoRef.current;
    if (!video) return;
    const src = videoSources[selectedCamera];
    if (src) { video.src = src; video.load(); }
  }, [selectedCamera, videoSources]);

  // ─── Trim ────────────────────────────────────────────────────────────────

  const handleTrimToggle = () => {
    if (trimActive) {
      // Turning off → reset to full
      setTrimStart(0);
      setTrimEnd(100);
    }
    setTrimActive(v => !v);
  };

  const handleTrimChange = useCallback((start, end) => {
    setTrimStart(start);
    setTrimEnd(end);
  }, []);

  // ─── Export helpers ──────────────────────────────────────────────────────

  const drawWatermark = useCallback((ctx, canvas) => {
    if (!watermarkText) return;
    const fontSize = Math.floor(canvas.height / 20);
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = 'white';
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 3;
    const padding = 20;
    const w = ctx.measureText(watermarkText).width;
    let x, y;
    switch (watermarkPosition) {
      case 'top-left':    x = padding; y = padding + fontSize; break;
      case 'top-right':   x = canvas.width - w - padding; y = padding + fontSize; break;
      case 'bottom-left': x = padding; y = canvas.height - padding; break;
      default:            x = canvas.width - w - padding; y = canvas.height - padding;
    }
    ctx.strokeText(watermarkText, x, y);
    ctx.fillText(watermarkText, x, y);
  }, [watermarkText, watermarkPosition]);

  const handleExportSnapshot = useCallback(async () => {
    const video = exportVideoRef.current;
    const canvas = exportCanvasRef.current;
    if (!video || !canvas) return;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    drawWatermark(ctx, canvas);
    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event?.name || 'video'}_${selectedCamera}_snapshot.jpg`;
      a.click();
      URL.revokeObjectURL(url);
    }, 'image/jpeg', 0.95);
  }, [event, selectedCamera, drawWatermark]);

  const handleExportVideo = useCallback(async () => {
    const video = exportVideoRef.current;
    const canvas = exportCanvasRef.current;
    if (!video || !canvas || isExporting) return;

    setIsExporting(true);
    setExportProgress(0);
    chunksRef.current = [];

    try {
      if (!video.duration || isNaN(video.duration)) {
        await new Promise((resolve, reject) => {
          video.onloadedmetadata = resolve;
          video.onerror = reject;
          setTimeout(reject, 10000);
        });
      }

      const totalDur = video.duration || duration;
      // Use current trim settings (0/100 = full video when trim is off)
      const startSec = (trimStart / 100) * totalDur;
      const endSec   = (trimEnd   / 100) * totalDur;
      const trimDur  = endSec - startSec;

      canvas.width  = video.videoWidth  || 1280;
      canvas.height = video.videoHeight || 720;

      const renderFrame = () => {
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        drawWatermark(ctx, canvas);
      };

      const stream = canvas.captureStream(30);
      if (video.captureStream) {
        const audioTracks = video.captureStream().getAudioTracks();
        if (audioTracks.length > 0) stream.addTrack(audioTracks[0]);
      }

      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9' : 'video/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2500000 });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${event?.name || 'video'}_${selectedCamera}.webm`;
        a.click();
        URL.revokeObjectURL(url);
        setIsExporting(false);
        setExportProgress(0);
      };

      video.currentTime = startSec;
      await new Promise(r => setTimeout(r, 150));
      mediaRecorder.start(100);
      await video.play();

      const t0 = Date.now();
      const frameLoop = setInterval(() => {
        renderFrame();
        const elapsed = (Date.now() - t0) / 1000;
        setExportProgress(Math.min(99, (elapsed / trimDur) * 100));
        if (video.currentTime >= endSec) {
          clearInterval(frameLoop);
          video.pause();
          mediaRecorder.stop();
        }
      }, 1000 / 30);

      // Fallback timeout
      await new Promise(r => setTimeout(r, (trimDur + 2) * 1000));
      clearInterval(frameLoop);
      if (mediaRecorder.state !== 'inactive') { video.pause(); mediaRecorder.stop(); }

    } catch (err) {
      console.error('Export failed:', err);
      setIsExporting(false);
      setExportProgress(0);
    }
  }, [event, selectedCamera, isExporting, trimStart, trimEnd, duration, drawWatermark]);

  const hasSource = !!videoSources[selectedCamera];

  return (
    <main className={`${styles.playerContainer} video-player-active`}>
      {/* ── Header ── */}
      <div className={styles.playerHeader}>
        <ViewModeSelector viewMode={viewMode} onViewModeChange={setViewMode} />
        <div className={styles.headerActions}>
          <button
            className={`${styles.topBtn} ${trimActive ? styles.topBtnActive : ''}`}
            onClick={handleTrimToggle}
          >
            Trim
          </button>
          <button
            className={`${styles.topBtn} ${showWatermarkPanel ? styles.topBtnActive : ''}`}
            onClick={() => setShowWatermarkPanel(v => !v)}
          >
            + Watermark
          </button>
          <button
            className={`${styles.topBtn} ${styles.topBtnExport}`}
            onClick={handleExportVideo}
            disabled={isExporting || !hasSource}
          >
            {isExporting ? `${Math.round(exportProgress)}%` : 'Export'}
          </button>
          <button className={styles.closePlayerBtn} onClick={onClose} title="Close (Esc)">×</button>
        </div>
      </div>

      {/* ── Watermark panel ── */}
      {showWatermarkPanel && (
        <div className={styles.watermarkPanel}>
          <div className={styles.wmField}>
            <label>Camera</label>
            <select
              value={selectedCamera}
              onChange={e => setSelectedCamera(e.target.value)}
              className={styles.wmSelect}
            >
              {CAMERAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
            </select>
          </div>
          <div className={`${styles.wmField} ${styles.wmFieldGrow}`}>
            <label>Watermark Text</label>
            <input
              type="text"
              value={watermarkText}
              onChange={e => setWatermarkText(e.target.value)}
              placeholder="Enter text..."
              className={styles.wmInput}
            />
          </div>
          <div className={styles.wmField}>
            <label>Position</label>
            <select
              value={watermarkPosition}
              onChange={e => setWatermarkPosition(e.target.value)}
              className={styles.wmSelect}
              disabled={!watermarkText}
            >
              {POSITIONS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </div>
          <button
            className={`${styles.topBtn} ${styles.snapshotBtn}`}
            onClick={handleExportSnapshot}
            disabled={!hasSource}
          >
            Snapshot
          </button>
        </div>
      )}

      {/* Hidden export elements */}
      <video ref={exportVideoRef} className={styles.hiddenExport} />
      <canvas ref={exportCanvasRef} className={styles.hiddenExport} />

      {/* ── Content ── */}
      <div className={styles.contentArea}>
        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.spinner} />
            <p>Loading videos...</p>
          </div>
        ) : (
          <>
            {viewMode === 'grid' && (
              <VideoGrid videoRefs={videoRefs} videoSources={videoSources} event={event} />
            )}
            {viewMode === 'map' && (
              <MapView telemetryData={telemetryData} event={event} />
            )}
          </>
        )}
        {!isLoading && viewMode !== 'map' && showTelemetry && (
          <TelemetryData telemetry={currentTelemetry} />
        )}
      </div>

      <PlaybackControls
        isPlaying={isPlaying}
        isMuted={isMuted}
        volume={volume}
        playbackSpeed={playbackSpeed}
        currentTime={currentTime}
        duration={duration}
        onTogglePlayPause={togglePlayPause}
        onToggleMute={toggleMute}
        onVolumeChange={setVolume}
        onPlaybackSpeedChange={setPlaybackSpeed}
        onSeek={seek}
        trimActive={trimActive}
        trimStart={trimStart}
        trimEnd={trimEnd}
        onTrimChange={handleTrimChange}
      />
    </main>
  );
}

export default memo(VideoPlayer);
