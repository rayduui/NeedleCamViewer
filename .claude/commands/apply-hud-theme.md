# Tesla Cam HUD Theme

Apply the project's cinematic HUD design theme to a component or set of components. This theme was established in the WelcomeScreen redesign and extended across all components.

## Theme Specification

### Aesthetic Direction
**Cinematic surveillance HUD** — the interface feels like booting up a precision dashcam system. Think mission control, night-vision monitor, tactical readout. Everything is deliberate, sharp, and purposeful.

### Fonts
Loaded via `next/font/google` in `app/layout.jsx` as CSS variables:
- `var(--font-barlow)` — **Barlow Condensed** (weight 700, 900) — display text, headings, buttons, large numerics
- `var(--font-code)` — **JetBrains Mono** (weight 400, 500) — labels, data readouts, metadata, timestamps, status text

### Color Palette
```
Background:   #000000  (pure black — never #111 or #1a1a1a for surfaces)
Red accent:   #e82127  (Tesla red — primary interactive color)
Red hover:    #cc1c21
Text:         #ffffff
Text muted:   rgba(255, 255, 255, 0.4–0.45)
Text faint:   rgba(255, 255, 255, 0.2–0.28)
Borders:      rgba(255, 255, 255, 0.06–0.10)
Surface:      rgba(255, 255, 255, 0.03–0.06)  (subtle lift over black)
```

**No blue** (`#3b82f6` has been fully replaced with `#e82127` throughout the project).

### Shape Language
- **Zero border-radius** on all interactive elements (buttons, inputs, selects, cards, labels)
- Borders are hairline (`1px`) in low-opacity white
- Active/focus states use `#e82127` border, never a glow ring
- Structural separators: `1px solid rgba(255, 255, 255, 0.06–0.07)`

### Typography Rules
- Headings / brand words: Barlow Condensed 900, `text-transform: uppercase`, tight letter-spacing (`-0.015em` to `0.01em`)
- Subheadings / product words: Barlow Condensed 700, `letter-spacing: 0.2–0.3em`, low opacity (`0.35–0.45`)
- All labels: JetBrains Mono, `font-size: 0.48–0.65rem`, `letter-spacing: 0.1–0.2em`, `text-transform: uppercase`
- Data values: Barlow Condensed 700 (for big display numbers) OR JetBrains Mono 500 (for inline/compact values)
- Timestamps / metadata: JetBrains Mono, `0.6–0.72rem`

### Motion
- Page-entry elements: `animation: fadeUp 0.55s ease Xs forwards` with staggered delays (0.1s increments)
- `@keyframes fadeUp`: `from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); }`
- Hover shimmer on primary CTA: `::before` pseudo with gradient sweep (`left: -120%` → `left: 160%`)
- No scale transforms on hover — use background/border-color transitions only (except for tiny `scale(0.96)` on active)
- Spinners: `border-top-color: #e82127`, all others `rgba(255,255,255,0.06–0.07)`

### Atmosphere (full-screen surfaces only)
Applied on the WelcomeScreen — not on panels/controls:
- Scanline overlay: `repeating-linear-gradient(0deg, transparent 3px, rgba(255,255,255,0.013) 4px)`
- Red radial glow from top: `radial-gradient(ellipse 90% 45% at 50% -5%, rgba(232,33,39,0.1), transparent 65%)`
- Vignette: `radial-gradient(ellipse at center, transparent 50%, rgba(0,0,0,0.65) 100%)`
- Corner brackets: absolute `<span>` elements with `border-color: rgba(232,33,39,0.55)`, `28px × 28px`, L-shaped via border-width

### HUD Data Readouts
Used in TelemetryData, EventList, Sidebar, PlaybackControls time displays:
```css
font-family: var(--font-code), 'Courier New', monospace;
font-size: 0.48–0.65rem;
letter-spacing: 0.1–0.15em;
text-transform: uppercase;
color: rgba(255, 255, 255, 0.28–0.4);
```
Values above their labels use higher opacity (`0.7–1.0`) or full white.

### Accent Pattern (camera labels, info boxes, active list items)
Left-border accent instead of background highlight:
```css
border-left: 2px solid rgba(232, 33, 39, 0.5–1.0);
```

### Buttons
**Primary (red fill):**
```css
background: #e82127;
border-radius: 0;
font-family: var(--font-barlow);
font-weight: 700;
font-size: 0.9–1.3rem;
letter-spacing: 0.08–0.12em;
text-transform: uppercase;
```

**Secondary (ghost):**
```css
background: transparent;
border: 1px solid rgba(255, 255, 255, 0.12–0.2);
color: rgba(255, 255, 255, 0.6–0.7);
/* hover → border-color: 0.22–0.4, color: #fff */
```

**Icon buttons:**
```css
background: rgba(255, 255, 255, 0.06–0.08);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 0;
width/height: 28–40px (scale with context);
```

## How to Apply

When asked to style a new component:
1. Use `var(--font-barlow)` for any display text or button labels
2. Use `var(--font-code)` for any metadata, timestamps, or data labels
3. Replace all `border-radius` values with `0` (or omit entirely)
4. Use `#e82127` for all accent/active/focus states — no blue
5. Keep backgrounds at `#000` or near-black with very low-opacity white surfaces
6. Borders are always `1px solid rgba(255,255,255,0.06–0.1)` — never solid grey
7. Add left-border accents (`border-left: 2px solid rgba(232,33,39,X)`) instead of background highlights
8. Use Barlow Condensed numbers for data values, JetBrains Mono for labels beneath them
