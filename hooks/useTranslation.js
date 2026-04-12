'use client';

import { useSettings } from '@/context/SettingsContext';
import { localeMap, defaultLocale } from '@/locales';

/**
 * Returns a `t(key, vars?)` function that resolves a translation string for
 * the current language. Falls back to English, then the raw key.
 *
 * @example
 *   const { t } = useTranslation();
 *   t('header.openFolder')              // → "Open TeslaCam Folder"
 *   t('events.cameras', { n: 3 })       // → "3 camera(s)"
 */
export function useTranslation() {
  const { language } = useSettings();
  const locale = localeMap[language] || localeMap[defaultLocale];
  const fallback = localeMap[defaultLocale];

  const t = (key, vars = {}) => {
    let str = locale.translations[key] ?? fallback.translations[key] ?? key;
    return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{${k}}`, v), str);
  };

  return { t };
}
