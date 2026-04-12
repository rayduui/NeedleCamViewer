'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { DashcamMP4, initProtobuf, formatSeiData } from '@/lib/dashcam-mp4';

export const useVideoPlayer = (videoRefs) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolumeState] = useState(50);
  const [playbackSpeed, setPlaybackSpeedState] = useState(1);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [videoSources, setVideoSources] = useState({
    front: '',
    back: '',
    left: '',
    right: ''
  });
  const [telemetryData, setTelemetryData] = useState([]);
  const [currentTelemetry, setCurrentTelemetry] = useState(null);

  const objectUrlsRef = useRef([]);
  const syncTimeoutRef = useRef(null);

  // Cleanup object URLs and timeouts when component unmounts
  useEffect(() => {
    return () => {
      objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
  }, []);

  // Setup video event listeners
  useEffect(() => {
    const frontVideo = videoRefs.front?.current;
    if (!frontVideo) return;

    const handleTimeUpdate = () => {
      setCurrentTime(frontVideo.currentTime);
      
      // Update current telemetry based on video time
      if (telemetryData.length > 0) {
        const currentIndex = Math.floor((frontVideo.currentTime / frontVideo.duration) * telemetryData.length);
        if (currentIndex >= 0 && currentIndex < telemetryData.length) {
          const telemetry = telemetryData[currentIndex];
          // Debug log every 30 updates (about once per second)
          if (Math.floor(frontVideo.currentTime) % 30 === 0) {
            console.log('[Telemetry Update]', {
              time: frontVideo.currentTime.toFixed(2),
              index: currentIndex,
              totalFrames: telemetryData.length,
              telemetry
            });
          }
          setCurrentTelemetry(telemetry);
        }
      }
    };

    const handleLoadedMetadata = () => {
      setDuration(frontVideo.duration);
    };

    const handleEnded = () => {
      setIsPlaying(false);
    };

    frontVideo.addEventListener('timeupdate', handleTimeUpdate);
    frontVideo.addEventListener('loadedmetadata', handleLoadedMetadata);
    frontVideo.addEventListener('ended', handleEnded);

    return () => {
      frontVideo.removeEventListener('timeupdate', handleTimeUpdate);
      frontVideo.removeEventListener('loadedmetadata', handleLoadedMetadata);
      frontVideo.removeEventListener('ended', handleEnded);
    };
  }, [videoRefs, telemetryData]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Only handle if we have videos loaded
      if (!videoSources.front) return;

      switch(e.key) {
        case ' ':
        case 'k':
          e.preventDefault();
          togglePlayPause();
          break;
        case 'f':
          e.preventDefault();
          handleFullscreen();
          break;
        case 'm':
          e.preventDefault();
          toggleMute();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skipTime(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skipTime(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          adjustVolume(5);
          break;
        case 'ArrowDown':
          e.preventDefault();
          adjustVolume(-5);
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [videoSources.front]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadVideos = useCallback(async (event) => {
    // Stop current playback and reset state immediately
    setIsLoading(true);
    pause();
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);

    // Clear any pending sync operations
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    // Revoke old object URLs
    objectUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
    objectUrlsRef.current = [];

    const newSources = {
      front: '',
      back: '',
      left: '',
      right: ''
    };

    try {
      // Initialize protobuf once at the start
      await initProtobuf();

      // Load telemetry data first (in parallel with videos)
      const telemetryPromise = (async () => {
        // Try to extract SEI metadata from front camera video
        if (event.videos.front) {
          try {
            // Handle both FileSystemFileHandle (Chrome) and File objects (Safari)
            const frontFile = event.videos.front instanceof File 
              ? event.videos.front 
              : await event.videos.front.getFile();
            const arrayBuffer = await frontFile.arrayBuffer();
            const seiData = await extractSeiFromVideo(arrayBuffer);
            
            if (seiData && seiData.length > 0) {
              console.log(`Extracted ${seiData.length} SEI telemetry frames from video`);
              return seiData;
            }
          } catch (error) {
            console.warn('Could not extract SEI metadata from video:', error);
          }
        }
        
        // Fallback: Try loading separate telemetry file
        if (event.telemetryHandle) {
          try {
            // Handle both FileSystemFileHandle and File objects
            const telemetryFile = event.telemetryHandle instanceof File
              ? event.telemetryHandle
              : await event.telemetryHandle.getFile();
            const telemetryText = await telemetryFile.text();
            return parseTelemetryData(telemetryText);
          } catch (error) {
            console.error('Error loading telemetry:', error);
          }
        }
        
        // Last resort: Generate mock telemetry data for demo purposes
        console.log('No real telemetry data found, using mock data');
        return generateMockTelemetry();
      })();

      // Load all video files in parallel for better performance
      const videoLoadPromises = Object.entries(event.videos).map(async ([camera, fileHandle]) => {
        try {
          // Handle both FileSystemFileHandle (Chrome) and File objects (Safari)
          const file = fileHandle instanceof File 
            ? fileHandle 
            : await fileHandle.getFile();
          const url = URL.createObjectURL(file);
          objectUrlsRef.current.push(url);
          return { camera, url };
        } catch (error) {
          console.error(`Error loading ${camera} video:`, error);
          return { camera, url: '' };
        }
      });

      // Wait for both videos and telemetry to load
      const [results, parsedTelemetry] = await Promise.all([
        Promise.all(videoLoadPromises),
        telemetryPromise
      ]);
      
      // Assign URLs to newSources
      results.forEach(({ camera, url }) => {
        if (url) {
          newSources[camera] = url;
        }
      });

      // Update telemetry first (before videos to prevent flashing)
      console.log('[VideoPlayer] Setting telemetry data, length:', parsedTelemetry.length);
      console.log('[VideoPlayer] First telemetry sample:', parsedTelemetry[0]);
      setTelemetryData(parsedTelemetry);
      setCurrentTelemetry(parsedTelemetry[0] || null);

      // Update video sources
      setVideoSources(newSources);
      
      // Wait a bit for videos to start loading
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Initialize video properties
      Object.values(videoRefs).forEach(ref => {
        const video = ref?.current;
        if (video && video.src) {
          video.volume = volume / 100;
          video.muted = isMuted;
          video.playbackRate = playbackSpeed;
        }
      });

      setIsLoading(false);

    } catch (error) {
      console.error('Error loading videos:', error);
      setVideoSources(newSources);
      setIsLoading(false);
    }
  }, [volume, isMuted, playbackSpeed, videoRefs]);

  const extractSeiFromVideo = async (arrayBuffer) => {
    try {
      console.log('[SEI] Starting SEI extraction from video...');
      console.log('[SEI] Video buffer size:', arrayBuffer.byteLength, 'bytes');
      
      // Import protobuf and get SeiMetadata type
      const { SeiMetadata } = await initProtobuf();
      console.log('[SEI] Protobuf initialized successfully');
      
      // Parse MP4 and extract SEI messages
      const mp4 = new DashcamMP4(arrayBuffer);
      console.log('[SEI] MP4 parser created, extracting SEI messages...');
      
      const seiMessages = mp4.extractSeiMessages(SeiMetadata);
      console.log('[SEI] Extraction complete. Found', seiMessages?.length || 0, 'SEI messages');
      
      if (!seiMessages || seiMessages.length === 0) {
        console.warn('[SEI] No SEI metadata found in video');
        return null;
      }
      
      // Convert SEI messages to telemetry format
      // Debug first message with detailed logging
      const telemetryData = seiMessages.map((sei, index) => formatSeiData(sei, index === 0));
      console.log('[SEI] Successfully formatted', telemetryData.length, 'telemetry frames');
      console.log('[SEI] Sample telemetry:', telemetryData[0]);
      console.log('[SEI] Sample telemetry (JSON):', JSON.stringify(telemetryData[0], null, 2));
      
      return telemetryData;
    } catch (error) {
      console.error('[SEI] Error extracting SEI from video:', error);
      console.error('[SEI] Error stack:', error.stack);
      return null;
    }
  };

  const parseTelemetryData = (text) => {
    // Tesla telemetry files are typically JSON or CSV format
    // This is a simplified parser - adjust based on actual Tesla format
    try {
      const data = JSON.parse(text);
      return Array.isArray(data) ? data : [data];
    } catch {
      // If not JSON, try parsing as CSV
      const lines = text.split('\n');
      const headers = lines[0].split(',');
      return lines.slice(1).map(line => {
        const values = line.split(',');
        const obj = {};
        headers.forEach((header, i) => {
          obj[header.trim()] = values[i]?.trim();
        });
        return obj;
      }).filter(obj => Object.keys(obj).length > 0);
    }
  };

  const generateMockTelemetry = () => {
    // Generate 100 data points for demo
    return Array.from({ length: 100 }, (_, i) => ({
      speed: 25 + Math.random() * 20,
      throttle: Math.random() * 100,
      braking: Math.random() < 0.3 ? Math.random() * 50 : 0,
      leftSignal: Math.random() < 0.1,
      rightSignal: Math.random() < 0.1,
      autopilotActive: Math.random() < 0.5,
      latitude: 37.7749 + (Math.random() - 0.5) * 0.01,
      longitude: -122.4194 + (Math.random() - 0.5) * 0.01
    }));
  };

  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying]);

  const play = useCallback(async () => {
    const playPromises = Object.values(videoRefs).map(ref => {
      const video = ref?.current;
      if (video && video.src && video.readyState >= 2) {
        return video.play().catch(e => {
          console.error('Error playing video:', e);
          return Promise.resolve();
        });
      }
      return Promise.resolve();
    });
    
    await Promise.all(playPromises);
    setIsPlaying(true);
  }, [videoRefs]);

  const pause = useCallback(() => {
    Object.values(videoRefs).forEach(ref => {
      const video = ref?.current;
      if (video && video.src) {
        video.pause();
      }
    });
    setIsPlaying(false);
  }, [videoRefs]);

  const toggleMute = useCallback(() => {
    const newMuted = !isMuted;
    Object.values(videoRefs).forEach(ref => {
      const video = ref?.current;
      if (video) {
        video.muted = newMuted;
      }
    });
    setIsMuted(newMuted);
  }, [isMuted, videoRefs]);

  const setVolume = useCallback((value) => {
    const volumeValue = value / 100;
    Object.values(videoRefs).forEach(ref => {
      const video = ref?.current;
      if (video) {
        video.volume = volumeValue;
      }
    });
    setVolumeState(value);
  }, [videoRefs]);

  const setPlaybackSpeed = useCallback((speed) => {
    Object.values(videoRefs).forEach(ref => {
      const video = ref?.current;
      if (video) {
        video.playbackRate = speed;
      }
    });
    setPlaybackSpeedState(speed);
  }, [videoRefs]);

  const seek = useCallback((percentage) => {
    const frontVideo = videoRefs.front?.current;
    if (frontVideo && frontVideo.duration) {
      const time = (percentage / 100) * frontVideo.duration;
      
      // Pause all videos first for smoother seeking
      const wasPlaying = isPlaying;
      if (wasPlaying) {
        pause();
      }
      
      // Seek all videos
      Object.values(videoRefs).forEach(ref => {
        const video = ref?.current;
        if (video && video.src) {
          video.currentTime = time;
        }
      });
      
      // Resume playback after a short delay if was playing
      if (wasPlaying) {
        if (syncTimeoutRef.current) {
          clearTimeout(syncTimeoutRef.current);
        }
        syncTimeoutRef.current = setTimeout(() => {
          play();
        }, 100);
      }
    }
  }, [videoRefs, isPlaying, pause, play]);

  const skipTime = useCallback((seconds) => {
    Object.values(videoRefs).forEach(ref => {
      const video = ref?.current;
      if (video && video.src) {
        video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + seconds));
      }
    });
  }, [videoRefs]);

  const adjustVolume = useCallback((delta) => {
    const newVolume = Math.max(0, Math.min(100, volume + delta));
    setVolume(newVolume);
  }, [volume, setVolume]);

  const handleFullscreen = useCallback(() => {
    const videoGrid = document.querySelector('[class*="videoGrid"]');
    if (!document.fullscreenElement) {
      videoGrid?.requestFullscreen().catch(err => {
        console.error('Error attempting to enable fullscreen:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }, []);

  return {
    isPlaying,
    isMuted,
    volume,
    playbackSpeed,
    currentTime,
    duration,
    isLoading,
    videoSources,
    telemetryData,
    currentTelemetry,
    play,
    togglePlayPause,
    toggleMute,
    setVolume,
    setPlaybackSpeed,
    seek,
    loadVideos
  };
};
