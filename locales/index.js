// ─── Locale Registry ─────────────────────────────────────────────────────────
//
// To add a new language:
//   1. Create a new JSON file in this folder (e.g. `fr.json`) with the shape:
//      { "code": "fr", "name": "Français", "translations": { ... } }
//
// That's it — no imports needed. It will automatically appear in Settings.
// ─────────────────────────────────────────────────────────────────────────────

const context = require.context('./', false, /\.json$/);

export const locales = context
  .keys()
  .map((key) => context(key))
  .filter((locale) => locale.code && locale.name && locale.translations);

export const defaultLocale = 'en';
export const localeMap = Object.fromEntries(locales.map((l) => [l.code, l]));
