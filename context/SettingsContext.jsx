'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  speedUnit: 'mph',
  setSpeedUnit: () => {},
});

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [speedUnit, setSpeedUnitState] = useState('mph');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('nc-theme') || 'dark';
    const savedSpeedUnit = localStorage.getItem('nc-speedUnit') || 'mph';
    setThemeState(savedTheme);
    setSpeedUnitState(savedSpeedUnit);
    document.documentElement.setAttribute('data-theme', savedTheme);
  }, []);

  const setTheme = (value) => {
    setThemeState(value);
    document.documentElement.setAttribute('data-theme', value);
    localStorage.setItem('nc-theme', value);
  };

  const setSpeedUnit = (value) => {
    setSpeedUnitState(value);
    localStorage.setItem('nc-speedUnit', value);
  };

  return (
    <SettingsContext.Provider value={{ theme, setTheme, speedUnit, setSpeedUnit, mounted }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
