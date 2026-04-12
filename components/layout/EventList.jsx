'use client';

import { useState, useEffect, useMemo, useCallback, memo, useRef } from 'react';
import { formatDate, formatTime } from '@/lib/helpers';
import styles from './EventList.module.css';

function EventList({ events, currentEvent, currentFilter, onSelectEvent, horizontalMode = false }) {
  const filteredEvents = useMemo(() => {
    return currentFilter === 'all'
      ? events
      : events.filter(e => e.type === currentFilter);
  }, [events, currentFilter]);

  if (filteredEvents.length === 0) {
    return (
      <div className={`${styles.eventsList} ${horizontalMode ? styles.horizontal : ''}`}>
        <div className={styles.loading}>
          {events.length === 0 ? 'Select a folder to begin' : 'No events found'}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.eventsList} ${horizontalMode ? styles.horizontal : ''}`}>
      {filteredEvents.map((event) => (
        <EventListItem
          key={event.name}
          event={event}
          isActive={currentEvent?.name === event.name}
          onSelect={onSelectEvent}
        />
      ))}
    </div>
  );
}

const EventListItem = memo(function EventListItem({ event, isActive, onSelect }) {
  const [thumbnail, setThumbnail] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const itemRef = useRef(null);

  // Use Intersection Observer to only generate thumbnails when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !isGenerating && !thumbnail) {
            setIsVisible(true);
          }
        });
      },
      {
        rootMargin: '50px', // Start loading slightly before visible
        threshold: 0.1
      }
    );

    if (itemRef.current) {
      observer.observe(itemRef.current);
    }

    return () => {
      if (itemRef.current) {
        observer.unobserve(itemRef.current);
      }
    };
  }, [isGenerating, thumbnail]);

  const generateThumbnail = useCallback(async () => {
    if (isGenerating || thumbnail) return;
    
    // Use front camera for thumbnail, or first available camera
    const frontVideo = event.videos.front || Object.values(event.videos)[0];
    if (!frontVideo) {
      console.warn('[Thumbnail] No video file available for event:', event.name);
      return;
    }

    setIsGenerating(true);

    try {
      // Defer to next animation frame to keep UI responsive
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Handle both FileSystemFileHandle (Chrome) and File objects (Safari)
      const file = frontVideo instanceof File 
        ? frontVideo 
        : await frontVideo.getFile();
      if (!file) {
        throw new Error('Failed to get video file');
      }
      
      // Another yield after file load
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      const videoUrl = URL.createObjectURL(file);
      
      const thumbnailUrl = await new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { 
          alpha: false,
          willReadFrequently: false 
        });

        if (!ctx) {
          reject(new Error('Failed to get canvas context'));
          return;
        }

        video.muted = true;
        video.preload = 'metadata';
        video.crossOrigin = 'anonymous';
        
        let timeoutId;
        const cleanup = () => {
          if (timeoutId) clearTimeout(timeoutId);
          URL.revokeObjectURL(videoUrl);
          video.remove();
        };

        const handleError = (error) => {
          cleanup();
          const errorMsg = error?.message || error?.type || 'Unknown error';
          reject(new Error(`Video error: ${errorMsg}`));
        };

        // Timeout after 10 seconds
        timeoutId = setTimeout(() => {
          handleError(new Error('Thumbnail generation timeout'));
        }, 10000);

        video.onloadedmetadata = () => {
          try {
            if (!video.duration || video.duration === Infinity || isNaN(video.duration)) {
              // If duration is invalid, just use time 0
              video.currentTime = 0;
            } else {
              // Seek to 1 second or 10% of duration, whichever is smaller
              video.currentTime = Math.min(1, video.duration * 0.1);
            }
          } catch (err) {
            handleError(err);
          }
        };

        video.onseeked = () => {
          try {
            // Use 16:9 aspect ratio
            canvas.width = 160;
            canvas.height = 90;
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            
            const dataUrl = canvas.toDataURL('image/jpeg', 0.75);
            cleanup();
            resolve(dataUrl);
          } catch (error) {
            handleError(error);
          }
        };

        video.onerror = (e) => {
          handleError(e.error || e);
        };
        
        video.src = videoUrl;
      });

      setThumbnail(thumbnailUrl);
    } catch (error) {
      console.error('[Thumbnail] Error generating thumbnail for', event.name, ':', error.message || error);
      // Set a placeholder thumbnail on error to prevent retries
      setThumbnail('error');
    } finally {
      setIsGenerating(false);
    }
  }, [event, isGenerating, thumbnail]);

  // Only generate thumbnail when visible
  useEffect(() => {
    if (isVisible && !thumbnail && !isGenerating) {
      generateThumbnail();
    }
  }, [isVisible, thumbnail, isGenerating, generateThumbnail]);

  const handleClick = useCallback(() => {
    onSelect(event);
  }, [onSelect, event]);

  return (
    <div
      ref={itemRef}
      className={`${styles.eventItem} ${isActive ? styles.active : ''}`}
      onClick={handleClick}
    >
      <div className={styles.eventThumbnail}>
        {thumbnail && thumbnail !== 'error' ? (
          <img src={thumbnail} alt="Video thumbnail" loading="lazy" />
        ) : isGenerating ? (
          <div className={styles.thumbnailPlaceholder}>
            <div className={styles.thumbnailSpinner}></div>
          </div>
        ) : thumbnail === 'error' ? (
          <div className={styles.thumbnailPlaceholder} title="Thumbnail generation failed">⚠️</div>
        ) : (
          <div className={styles.thumbnailPlaceholder}>📹</div>
        )}
      </div>
      <div className={styles.eventInfo}>
        <div className={styles.eventDate}>{formatDate(event.timestamp)}</div>
        <div className={styles.eventTime}>{formatTime(event.timestamp)}</div>
        <div className={styles.eventCameraCount}>
          {Object.keys(event.videos).length} camera(s)
        </div>
      </div>
    </div>
  );
});

export default memo(EventList);
