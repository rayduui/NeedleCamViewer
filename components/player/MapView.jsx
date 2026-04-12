'use client';

import { memo, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import styles from './MapView.module.css';

// Dynamically import map components to avoid SSR issues
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false }
);

const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false }
);

const Marker = dynamic(
  () => import('react-leaflet').then((mod) => mod.Marker),
  { ssr: false }
);

const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false }
);

const Polyline = dynamic(
  () => import('react-leaflet').then((mod) => mod.Polyline),
  { ssr: false }
);

function MapView({ telemetryData, event }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient || !telemetryData || telemetryData.length === 0) {
    return (
      <div className={styles.mapPlaceholder}>
        <div className={styles.placeholderContent}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <p>No GPS data available for this event</p>
        </div>
      </div>
    );
  }

  // Get the route from telemetry data
  const route = telemetryData
    .filter(t => t.latitude && t.longitude)
    .map(t => [t.latitude, t.longitude]);

  if (route.length === 0) {
    return (
      <div className={styles.mapPlaceholder}>
        <div className={styles.placeholderContent}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
          <p>No GPS data available for this event</p>
        </div>
      </div>
    );
  }

  const center = route[0];
  const currentPosition = route[route.length - 1];

  return (
    <div className={styles.mapContainer}>
      <MapContainer
        center={center}
        zoom={15}
        scrollWheelZoom={true}
        className={styles.map}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        {/* Route path */}
        <Polyline
          positions={route}
          color="#3b82f6"
          weight={4}
          opacity={0.7}
        />

        {/* Start marker */}
        <Marker position={route[0]}>
          <Popup>
            <strong>Start Location</strong><br/>
            {event?.name}
          </Popup>
        </Marker>

        {/* Current/End marker */}
        <Marker position={currentPosition}>
          <Popup>
            <strong>Current Location</strong><br/>
            {currentPosition[0].toFixed(5)}, {currentPosition[1].toFixed(5)}
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}

export default memo(MapView);
