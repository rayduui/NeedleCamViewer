"use client";

import { memo, useMemo } from "react";
import EventList from "./EventList";
import styles from "./Sidebar.module.css";
import { useTranslation } from "@/hooks/useTranslation";

function Sidebar({
  events,
  currentEvent,
  currentFilter,
  eventCounts,
  isScanning,
  onSelectEvent,
  onFilterChange,
}) {
  const { t } = useTranslation();

  const eventTypes = useMemo(
    () => [
      { type: "all", labelKey: "sidebar.all", count: eventCounts.all },
      { type: "SavedClips", labelKey: "sidebar.saved", count: eventCounts.SavedClips },
      { type: "SentryClips", labelKey: "sidebar.sentry", count: eventCounts.SentryClips },
    ],
    [eventCounts],
  );

  return (
    <aside className={styles.sidebar}>
      {isScanning && (
        <div className={styles.scanningBadge}>
          <div className={styles.smallSpinner}></div>
          <span>{t('sidebar.scanning')} ({eventCounts.all})</span>
        </div>
      )}

      <nav className={styles.tabs}>
        {eventTypes.map(({ type, labelKey, count }) => (
          <button
            key={type}
            className={`${styles.tab} ${currentFilter === type ? styles.active : ""}`}
            onClick={() => onFilterChange(type)}
          >
            <span className={styles.tabLabel}>{t(labelKey)}</span>
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
