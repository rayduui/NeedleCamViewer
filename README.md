# NeedleCamViewer

> A privacy-first, open-source Progressive Web App for viewing Tesla dashcam footage — entirely in your browser.

![License: MIT](https://img.shields.io/badge/License-MIT-red.svg)
![Next.js](https://img.shields.io/badge/Next.js-14-black)
![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)

All video processing happens client-side — no uploads, no server, complete privacy.

> **Note:** iOS is not supported. iOS does not support the File System Access API or the `webkitdirectory` input attribute required to read local folders in the browser.

---

## Features

- **Complete Privacy** — Videos never leave your device. Zero uploads.
- **Multi-Angle Replay** — Grid (4 cameras), Single, and Map view modes
- **Real Telemetry from SEI Metadata** — Speed, throttle, braking, blinkers, autopilot state, steering angle, gear, GPS, heading, acceleration (requires firmware 2025.44.25+, HW3+)
- **GPS Map Mode** — Interactive route visualization via OpenStreetMap (Leaflet)
- **Video Editor** — Watermark support for privacy and sharing
- **Event Organization** — Browse SavedClips, SentryClips, and RecentClips
- **Synchronized Playback** — All camera angles in perfect sync
- **Keyboard Shortcuts** — Efficient navigation
- **Offline Support** — PWA via Workbox; works after first load
- **Installable** — Desktop and mobile app install support

## Browser Compatibility

| Browser | Support |
|---------|---------|
| Chrome 86+, Edge 86+, Opera 72+ | Full (File System Access API) |
| Safari, Firefox | Partial (fallback to `<input webkitdirectory>`) |

---

## Quick Start

```bash
# Clone the repo
git clone https://github.com/rayduui/NeedleCamViewer.git
cd NeedleCamViewer

# Install dependencies
npm install

# Start development server (http://localhost:3000)
npm run dev
```

Other commands:

```bash
npm run build       # Production build + static export → out/
npm run lint        # ESLint check
npm test            # Jest unit tests
npm run test:watch  # Jest in watch mode
```

---

## Usage

1. Open `http://localhost:3000` in a supported browser.
2. Click **"Select TeslaCam Folder"** and navigate to the `TeslaCam` folder on your USB drive (the folder containing `SavedClips`, `SentryClips`, `RecentClips`).
3. Grant read permission when prompted.
4. Select any event from the sidebar to play footage.

### View Modes

| Mode | Description |
|------|-------------|
| Grid | All 4 cameras simultaneously |
| Single | One camera at a time (select from dropdown) |
| Map | GPS route on an interactive map |

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` / `K` | Play / Pause |
| `F` | Toggle Fullscreen |
| `M` | Mute / Unmute |
| `←` | Skip back 5 seconds |
| `→` | Skip forward 5 seconds |
| `↑` | Increase volume |
| `↓` | Decrease volume |

---

## Project Structure

```
NeedleCamViewer/
├── app/                    ← Next.js routing (layout, page, globals.css)
├── components/
│   ├── layout/             ← Header, Sidebar, EventList, WelcomeScreen
│   ├── player/             ← VideoPlayer, VideoGrid, PlaybackControls,
│   │                          ViewModeSelector, TelemetryData, MapView
│   └── settings/           ← SettingsPanel
├── context/                ← SettingsContext (theme, speed units)
├── hooks/                  ← useTeslaCam, useVideoPlayer
├── lib/                    ← dashcam-mp4.js, helpers.js
├── __tests__/lib/          ← Jest unit tests
├── public/
│   ├── dashcam.proto       ← Protobuf schema for SEI telemetry
│   └── icons/              ← PWA icons
├── next.config.js
└── package.json
```

## Technology Stack

- **Next.js 14** — App Router, static export
- **React 18** — Hooks-based UI
- **Leaflet / react-leaflet** — GPS map visualization
- **next-pwa** — Service worker / offline support via Workbox
- **protobufjs** — SEI NAL unit decoding
- **Canvas API** — Video editing and watermark rendering
- **File System Access API** — Local file access without uploads
- **CSS Modules** — Component-scoped styling

## Tesla Cam Folder Structure

```
TeslaCam/
├── SavedClips/
│   └── 2024-03-01_10-30-45/
│       ├── front.mp4
│       ├── back.mp4
│       ├── left_repeater.mp4
│       └── right_repeater.mp4
├── SentryClips/
└── RecentClips/
```

---

## Deployment

### Vercel

```bash
npm run build
vercel --prod
```

### Netlify

```bash
npm run build
netlify deploy --prod --dir=out
```

### GitHub Pages

1. Set `basePath` in `next.config.js`:
   ```js
   basePath: '/NeedleCamViewer',
   ```
2. Build and deploy:
   ```bash
   npm run build
   gh-pages -d out
   ```

---

## Contributing

Contributions are welcome and appreciated!

### How to Contribute

1. **Fork** the repository
2. **Create a branch**: `git checkout -b feature/your-feature-name`
3. **Make your changes** and add tests where appropriate
4. **Lint**: `npm run lint`
5. **Test**: `npm test`
6. **Commit**: `git commit -m "feat: describe your change"`
7. **Push**: `git push origin feature/your-feature-name`
8. **Open a Pull Request** against `main`

### Ideas for Contributions

- Picture-in-picture mode
- Event search and filtering by date/time
- Support for additional camera configurations
- Video quality selection
- Event bookmarking and notes
- Multi-language support
- Export video clips (not just snapshots)

### Reporting Issues

Please open a GitHub issue with:
- Your browser and version
- Steps to reproduce
- Expected vs actual behavior
- Any relevant console errors

---

## Privacy & Security

- **No uploads** — Videos stay on your device
- **No tracking** — No analytics or third-party scripts
- **Local processing** — All video decoding happens in your browser
- **Read-only** — The app only requests read permission, never write
- **Temporary access** — Browser file access is cleared when you close the tab

---

## Troubleshooting

**Videos not loading** — Ensure you selected the `TeslaCam` folder (the parent containing `SavedClips`, `SentryClips`, `RecentClips`). Verify files are standard H.264 MP4.

**Telemetry not showing** — SEI metadata requires firmware 2025.44.25+ and Hardware 3+. Not all clips will have embedded telemetry.

**Browser not supported** — Use Chrome 86+, Edge 86+, or Opera 72+ for full support.

**PWA not installing** — Ensure you're on HTTPS or localhost.

---

## License

```
MIT License

Copyright (c) 2026 Raymond Chu

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

> **Disclaimer**: Needle CamViewer is an independent, community-built tool. It is not affiliated with, endorsed by, or connected to Tesla, Inc. in any way.
