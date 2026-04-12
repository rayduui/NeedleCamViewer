# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # Start dev server (localhost:3000)
npm run build     # Production build + static export to out/
npm run lint      # ESLint check
npm test          # Jest unit tests
npm run test:watch  # Jest in watch mode
```

Tests live in `__tests__/lib/`. Jest is configured via `jest.config.js` using `next/jest`.

## Architecture

**Tesla Cam Viewer** is a static PWA (Next.js `output: 'export'`) that lets users view Tesla dashcam footage locally in the browser — no uploads, no server, all processing is client-side.

### Stack

- **Next.js 14** (App Router, static export) + **React 18**
- **next-pwa** — service worker / offline support via Workbox
- **Leaflet / react-leaflet** — GPS map visualization
- **protobufjs** — decode SEI metadata embedded in H.264 video streams

### Data Flow

1. User grants folder access via the **File System Access API** (Chrome/Edge) or `webkitdirectory` fallback (Safari/Firefox).
2. `useTeslaCam` hook scans `SavedClips/`, `SentryClips/`, `RecentClips/` subfolders, groups video files by timestamp into events (batched in groups of 5 to keep the UI responsive).
3. User selects an event → `useVideoPlayer` hook loads all four camera video files (`front`, `back`, `left_repeater`, `right_repeater`) as Blob URLs.
4. `dashcam-mp4.js` parses the MP4 container, extracts SEI NAL units from the H.264 stream, and decodes them with `dashcam.proto` (protobuf schema in `public/`).
5. Decoded telemetry (speed, throttle, steering, GPS, autopilot state, blinkers) is synced per-frame to the current playback time.
6. View modes: **Grid** (4 cameras), **Single** (one camera), **Map** (GPS route via Leaflet).

### Component Tree

```
page.jsx (Home)
├── Header
├── WelcomeScreen           ← shown before folder is opened
└── Main layout
    ├── Sidebar → EventList ← event navigation
    └── VideoPlayer
        ├── VideoGrid / single-camera view / MapView
        ├── PlaybackControls
        ├── ViewModeSelector
        ├── TelemetryData
        └── VideoEditor (modal) ← watermarked clip export
```

### Directory Structure

```
app/                        ← Next.js routing only (layout, page, globals.css)
components/
  layout/                   ← Header, Sidebar, EventList, WelcomeScreen
  player/                   ← VideoPlayer, VideoGrid, PlaybackControls,
                               ViewModeSelector, TelemetryData, MapView
  settings/                 ← SettingsPanel
context/                    ← SettingsContext (theme, speed units)
hooks/                      ← useTeslaCam, useVideoPlayer
lib/                        ← dashcam-mp4.js, helpers.js
__tests__/lib/              ← unit tests (mirrors lib/)
public/                     ← dashcam.proto, manifest.json
```

### Key Files

| File | Purpose |
|------|---------|
| `hooks/useTeslaCam.js` | Folder selection, event scanning & grouping |
| `hooks/useVideoPlayer.js` | Synchronized multi-camera playback, telemetry, keyboard shortcuts |
| `lib/dashcam-mp4.js` | MP4 binary parser + SEI extraction |
| `public/dashcam.proto` | Protobuf schema for SEI telemetry (speed, GPS, autopilot, etc.) |
| `next.config.js` | PWA config, custom webpack to bundle protobufjs in the main chunk |

### Styling

CSS Modules per component; global CSS variables in `globals.css`.

The UI follows a **cinematic HUD theme** established across all components. To apply it to new components, run `/apply-hud-theme` — the full spec lives in `.claude/commands/apply-hud-theme.md`.

Key rules:
- **Fonts**: `var(--font-barlow)` (Barlow Condensed 700/900) for display text, headings, buttons; `var(--font-code)` (JetBrains Mono 400/500) for labels, timestamps, data readouts. Both loaded in `app/layout.jsx` via `next/font/google`.
- **Colors**: Pure black `#000` backgrounds, Tesla red `#e82127` for all accents/active states. No blue anywhere. Borders are `1px solid rgba(255,255,255,0.06–0.10)`.
- **Shape**: `border-radius: 0` everywhere — buttons, inputs, selects, cards, labels.
- **Accent pattern**: Left-border `border-left: 2px solid rgba(232,33,39,X)` instead of background highlights on active/focused items.
- **Atmosphere** (full-screen surfaces only): scanline overlay, red radial glow from top, vignette, corner bracket decorations.
- **Spinners**: `border-top-color: #e82127`.
- **Buttons**: Primary = solid red, Barlow Condensed uppercase. Secondary = ghost with `rgba(255,255,255,0.12)` border.

### Telemetry Details

SEI metadata is supported on **firmware 2025.44.25+, Hardware 3+**. The protobuf fields include: `speed` (m/s), `accelerator_pedal`, `steering_angle`, `gear`, `blinker_left/right`, `brake`, `autopilot_state` (NONE/TACC/AUTOSTEER/SELF_DRIVING), `gps` (lat/lon/heading), `accel_xyz`.

### Browser Compatibility

- Full support: Chrome 86+, Edge 86+, Opera 72+ (File System Access API)
- Partial (no folder picker UI): Safari, Firefox (falls back to `<input webkitdirectory>`)
