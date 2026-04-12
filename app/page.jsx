'use client';

import { useState, useEffect, useTransition } from 'react';
import Header from '@/components/layout/Header';
import WelcomeScreen from '@/components/layout/WelcomeScreen';
import Sidebar from '@/components/layout/Sidebar';
import VideoPlayer from '@/components/player/VideoPlayer';
import { useTeslaCam } from '@/hooks/useTeslaCam';

export default function Home() {
  const [showWelcome, setShowWelcome] = useState(true);
  const [isPending, startTransition] = useTransition();
  
  const {
    folderHandle,
    folderName,
    events,
    currentEvent,
    currentFilter,
    isScanning,
    selectFolder,
    loadEvent,
    setFilter,
    eventCounts
  } = useTeslaCam();

  useEffect(() => {
    if (folderHandle) {
      setShowWelcome(false);
    }
  }, [folderHandle]);

  const handleGetStarted = async () => {
    await selectFolder();
  };

  const handleClosePlayer = () => {
    loadEvent(null);
  };

  const handleSelectEvent = (event) => {
    // Use startTransition to keep UI responsive while mounting VideoPlayer
    startTransition(() => {
      loadEvent(event);
    });
  };

  return (
    <div className="app">
      <Header 
        onSelectFolder={selectFolder} 
        folderName={folderName}
        showSelectButton={!showWelcome}
      />
      
      {showWelcome ? (
        <WelcomeScreen onGetStarted={handleGetStarted} />
      ) : (
        <div className={`main-screen ${currentEvent ? 'has-active-player' : ''}`}>
          <Sidebar
            events={events}
            currentEvent={currentEvent}
            currentFilter={currentFilter}
            eventCounts={eventCounts}
            isScanning={isScanning}
            onSelectEvent={handleSelectEvent}
            onFilterChange={setFilter}
          />
          {currentEvent && (
            <VideoPlayer 
              event={currentEvent} 
              onClose={handleClosePlayer}
              events={events}
              currentFilter={currentFilter}
              onSelectEvent={handleSelectEvent}
            />
          )}
        </div>
      )}
    </div>
  );
}
