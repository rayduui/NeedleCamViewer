"use client";

import { useState, useCallback } from "react";
import { parseTimestamp, getCameraFromFilename } from "@/lib/helpers";

export const useTeslaCam = () => {
  const [folderHandle, setFolderHandle] = useState(null);
  const [folderName, setFolderName] = useState("");
  const [events, setEvents] = useState([]);
  const [currentEvent, setCurrentEvent] = useState(null);
  const [currentFilter, setCurrentFilter] = useState("all");
  const [isScanning, setIsScanning] = useState(false);
  const [eventCounts, setEventCounts] = useState({
    all: 0,
    SavedClips: 0,
    SentryClips: 0,
  });

  const selectFolder = useCallback(async () => {
    try {
      // Check if File System Access API is supported (Chrome, Edge)
      if ("showDirectoryPicker" in window) {
        const handle = await window.showDirectoryPicker({
          mode: "read",
        });

        setFolderHandle(handle);
        setFolderName(handle.name);
        setIsScanning(true);

        // Use setTimeout to allow UI to update before starting scan
        setTimeout(() => {
          scanFolder(handle);
        }, 100);
      } else {
        // Fallback for Safari and other browsers
        const input = document.createElement("input");
        input.type = "file";
        input.webkitdirectory = true;
        input.directory = true;
        
        input.onchange = async (e) => {
          const files = Array.from(e.target.files);
          if (files.length === 0) return;

          // Extract folder name from the first file's path
          const firstFile = files[0];
          const pathParts = firstFile.webkitRelativePath.split("/");
          const rootFolderName = pathParts[0];

          setFolderName(rootFolderName);
          setIsScanning(true);

          // Use setTimeout to allow UI to update before starting scan
          setTimeout(() => {
            scanFolderFromFiles(files);
          }, 100);
        };

        input.click();
      }
    } catch (error) {
      if (error.name !== "AbortError") {
        console.error("Error selecting folder:", error);
        alert("Error accessing folder: " + error.message);
      }
      setIsScanning(false);
    }
  }, []);

  const scanFolderFromFiles = useCallback(async (files) => {
    const scannedEvents = [];
    const eventsByPath = new Map();

    try {
      // Group files by event folder
      for (const file of files) {
        const pathParts = file.webkitRelativePath.split("/");
        if (pathParts.length < 3) continue;

        const eventType = pathParts[1]; // SavedClips, SentryClips, or RecentClips
        const eventName = pathParts[2]; // Event folder name
        const fileName = pathParts[pathParts.length - 1];

        // Only process MP4 files in event type folders
        if (
          !fileName.endsWith(".mp4") ||
          !["SavedClips", "SentryClips", "RecentClips"].includes(eventType)
        ) {
          continue;
        }

        const eventKey = `${eventType}/${eventName}`;
        if (!eventsByPath.has(eventKey)) {
          eventsByPath.set(eventKey, {
            name: eventName,
            type: eventType,
            timestamp: parseTimestamp(eventName),
            videos: {},
            files: {},
          });
        }

        const camera = getCameraFromFilename(fileName);
        if (camera) {
          eventsByPath.get(eventKey).videos[camera] = file;
          eventsByPath.get(eventKey).files[camera] = file;
        }
      }

      // Convert map to array and filter out events without videos
      for (const event of eventsByPath.values()) {
        if (Object.keys(event.videos).length > 0) {
          scannedEvents.push(event);
        }
      }

      // Sort by timestamp
      scannedEvents.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(scannedEvents);
      updateEventCounts(scannedEvents);
    } catch (error) {
      console.error("Error scanning folder:", error);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const scanFolder = useCallback(async (handle) => {
    const scannedEvents = [];
    const eventTypes = ["SavedClips", "SentryClips", "RecentClips"];
    let processedCount = 0;

    try {
      for (const eventType of eventTypes) {
        try {
          const typeHandle = await handle.getDirectoryHandle(eventType);

          // Process events in batches to prevent UI blocking
          await scanEventType(
            typeHandle,
            eventType,
            scannedEvents,
            (batchEvents) => {
              processedCount += batchEvents.length;

              // Update UI incrementally with batches
              if (batchEvents.length > 0) {
                const sortedEvents = [...scannedEvents].sort(
                  (a, b) => b.timestamp - a.timestamp,
                );
                setEvents([...sortedEvents]);
                updateEventCounts(sortedEvents);
              }
            },
          );
        } catch (error) {
          console.log(`${eventType} folder not found`);
        }
      }

      // Final sort and update
      scannedEvents.sort((a, b) => b.timestamp - a.timestamp);
      setEvents(scannedEvents);
      updateEventCounts(scannedEvents);
    } catch (error) {
      console.error("Error scanning folder:", error);
    } finally {
      setIsScanning(false);
    }
  }, []);

  const scanEventType = async (
    typeHandle,
    eventType,
    scannedEvents,
    onBatch,
  ) => {
    const BATCH_SIZE = 5; // Process 5 events at a time
    let batch = [];
    let batchPromises = [];

    for await (const entry of typeHandle.values()) {
      if (entry.kind === "directory") {
        // Add event scanning to batch
        const scanPromise = (async () => {
          const event = {
            name: entry.name,
            type: eventType,
            handle: entry,
            timestamp: parseTimestamp(entry.name),
            videos: {},
          };

          try {
            for await (const fileEntry of entry.values()) {
              if (
                fileEntry.kind === "file" &&
                fileEntry.name.endsWith(".mp4")
              ) {
                const camera = getCameraFromFilename(fileEntry.name);
                if (camera) {
                  event.videos[camera] = fileEntry;
                }
              }
            }

            if (Object.keys(event.videos).length > 0) {
              return event;
            }
          } catch (error) {
            console.error("Error scanning event folder:", entry.name, error);
          }
          return null;
        })();

        batchPromises.push(scanPromise);

        // When we reach batch size, process and yield control
        if (batchPromises.length >= BATCH_SIZE) {
          const results = await Promise.all(batchPromises);
          batch = results.filter((e) => e !== null);

          if (batch.length > 0) {
            scannedEvents.push(...batch);
            onBatch(batch);
          }

          batchPromises = [];
          batch = [];

          // Yield to browser to keep UI responsive
          await new Promise((resolve) => setTimeout(resolve, 0));
        }
      }
    }

    // Process remaining events
    if (batchPromises.length > 0) {
      const results = await Promise.all(batchPromises);
      batch = results.filter((e) => e !== null);

      if (batch.length > 0) {
        scannedEvents.push(...batch);
        onBatch(batch);
      }
    }
  };

  const updateEventCounts = useCallback((eventList) => {
    setEventCounts({
      all: eventList.length,
      SavedClips: eventList.filter((e) => e.type === "SavedClips").length,
      SentryClips: eventList.filter((e) => e.type === "SentryClips").length,
      RecentClips: eventList.filter((e) => e.type === "RecentClips").length,
    });
  }, []);

  const loadEvent = useCallback((event) => {
    setCurrentEvent(event);
  }, []);

  const setFilter = useCallback((filter) => {
    setCurrentFilter(filter);
  }, []);

  return {
    folderHandle,
    folderName,
    events,
    currentEvent,
    currentFilter,
    isScanning,
    eventCounts,
    selectFolder,
    loadEvent,
    setFilter,
  };
};
