"use client";

import { memo, useMemo } from "react";
import EventList from "./EventList";
import styles from "./Sidebar.module.css";

function Sidebar({
  events,
  currentEvent,
  currentFilter,
  eventCounts,
  isScanning,
  onSelectEvent,
  onFilterChange,
}) {
  const eventTypes = useMemo(
    () => [
      { type: "all", label: "All", count: eventCounts.all },
      {
        type: "SavedClips",
        label: "Saved",
        count: eventCounts.SavedClips,
      },
      {
        type: "SentryClips",
        label: "Sentry",
        count: eventCounts.SentryClips,
      },
    ],
    [eventCounts],
  );

  return (
    <aside className={styles.sidebar}>
      {isScanning && (
        <div className={styles.scanningBadge}>
          <div className={styles.smallSpinner}></div>
          <span>Scanning... ({eventCounts.all})</span>
        </div>
      )}

      <nav className={styles.tabs}>
        {eventTypes.map(({ type, label, count }) => (
          <button
            key={type}
            className={`${styles.tab} ${currentFilter === type ? styles.active : ""}`}
            onClick={() => onFilterChange(type)}
          >
            <span className={styles.tabLabel}>{label}</span>
            <span className={styles.tabCount}>{count}</span>
          </button>
        ))}
      </nav>

      <EventList
        events={events}
        currentEvent={currentEvent}
        currentFilter={currentFilter}
        onSelectEvent={onSelectEvent}
      />
    </aside>
  );
}

export default memo(Sidebar);
