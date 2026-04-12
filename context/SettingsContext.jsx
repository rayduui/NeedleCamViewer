'use client';

import { createContext, useContext, useState, useEffect } from 'react';

const SettingsContext = createContext({
  theme: 'dark',
  setTheme: () => {},
  speedUnit: 'mph',
  setSpeedUnit: () => {},
  language: 'en',
  setLanguage: () => {},
});

export function SettingsProvider({ children }) {
  const [theme, setThemeState] = useState('dark');
  const [speedUnit, setSpeedUnitState] = useState('mph');
  const [language, setLanguageState] = useState('en');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem('nc-theme') || 'dark';
    const savedSpeedUnit = localStorage.getItem('nc-speedUnit') || 'mph';
    const savedLanguage = localStorage.getItem('nc-language') || 'en';
    setThemeState(savedTheme);
    setSpeedUnitState(savedSpeedUnit);
    setLanguageState(savedLanguage);
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

  const setLanguage = (value) => {
    setLanguageState(value);
    localStorage.setItem('nc-language', value);
  };

  return (
    <SettingsContext.Provider value={{ theme, setTheme, speedUnit, setSpeedUnit, language, setLanguage, mounted }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  return useContext(SettingsContext);
}
