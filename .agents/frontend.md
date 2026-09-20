# Frontend — Canvas Rendering & Browser Mode

Vanilla HTML5 Canvas 2D. Sprites are never DOM elements — everything draws on a single fullscreen `<canvas id="susuwatari-canvas">`.

## index.html (51 lines)

- Canvas + inline CSS only. Body background = default blue gradient `linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)`.
- `overflow: hidden`, `user-select: none`; canvas is a plain block without cursor styling.
- Loads `susuwatari.js` at the end of `<body>`.

## Canvas Pipeline

- `setupCanvas` (500) / `resizeCanvas` (507): canvas fills the viewport and tracks window resize.
- `animate()` (2996) `clearRect`s then redraws all layers each frame (order in `.agents/architecture.md` → Main Loop).
- Performance: 60+ FPS target, off-screen cleanup, count capped by `maxParticles` (`susuwatariCount`).

## Render Layers (bottom → top)

1. Body background — CSS `background` on `<body>`, **not** the canvas.
2. Soot stains (`drawSootStains` 1411) — dark radial-gradient patches, persist ~10s.
3. Trail particles (`drawTrailParticles` 1344) — tiny fading dark speckles.
4. Smoke particles (`drawSmokeParticles` 1284) — radial gradients `#666 → #444 → transparent`.
5. Susuwatari sprites (`drawSusuwatari` 2658) — one call per particle.
6. Collectibles (`drawCollectibles` 2185) — coal, stars, shoe.

## Susuwatari Sprite (`drawSusuwatari` 2658)

- Spiky radial body: 75–120 spikes per sprite; spike geometry reacts to audio (`.agents/features.md`).
- Each sprite gets a unique fixed `rotation` at creation → visual diversity and per-sprite audio reactions.
- Fur/pelage patterns on the body (added in `feat: Melhora a aparência do Susuwatari com padrões de pelagem...`).
- Eyes: pupils track the mouse (`updatePupils` 2569); dilation scales with mouse proximity × `eyeDilationIntensity`; random blink every 3–10s (`processBlinks` 2613); dizzy eyes via `drawSpiral` (2631); sleeping eyes closed + floating "ZZZ".
- Eyes hold a fixed position on the body while the body rotation animates (intentional).

## Particle Systems (plain object arrays, filtered each frame)

| System | Create | Update | Draw | Notes |
|--------|--------|--------|------|-------|
| Smoke explosion | `createSmokeExplosion` 1239 (8–14 particles) | `updateSmokeParticles` 1262 | `drawSmokeParticles` 1284 | Radial gradient, fades out |
| Soot trail | `createTrailParticle` 1307 (30% chance, scales with intensity) | `updateTrailParticles` 1325 | `drawTrailParticles` 1344 | 10–25% of sprite size |
| Soot stain | `createSootStain` 1367 | `updateSootStains` 1394 (expires ~10s) | `drawSootStains` 1411 | Left where a sprite disappears |
| Collection burst | `createCollectionEffect` 2163 (5–12 colored particles) | — (reuses trail array) | — | 1–1.5s lifetime |

## Background System

Applied through `document.body.style.background` (never the canvas). Decision chain in `applyUserProperties` (368–490), in priority order:

1. Existing `data:` base64 URL in `backgroundImageUrl` (from an earlier file conversion) → use as-is.
2. Lively folder dropdown `backgroundImagePicker` → prepend `backgrounds/`.
3. Wallpaper Engine file picker `backgroundImagePicker` → `file:///` URL.
4. Text input `backgroundImageUrl` → **only** `http://` / `https://` accepted (WE also allows `file:///`); anything else is ignored with a warning.
5. Nothing valid → default blue gradient.

Lively local files go through `fileToBase64DataURL` (91) because Lively cannot serve raw local paths.

## Browser Mode

Triggered when the page URL is `https://zonaro.github.io/susuwatari/...` or contains `?browser=1`.

**Settings popup** — `browser-settings.html` (standalone page opened from `openSettingsPanel` 3595):
- Right-click anywhere or `Ctrl+Shift+S` opens it (`setupBrowserControls` 3576).
- Sliders + checkboxes + text input; live updates on `input`/`change` (text debounced 500ms).
- Persists to `localStorage` key `susuwatari-settings` (both page and panel read it).
- Sends changes to the parent via `window.opener.postMessage({ type: 'susuwatari-settings-update', settings }, '*')`; the main page listens on `window.message` → `applyBrowserSettings` (3562) → `applyUserProperties`.
- Also has "reset to defaults" (removes the localStorage key) and a mic audio init button.

**Browser audio** (Web Audio API, privacy-first): `initializeBrowserAudio` (3241) builds AudioContext + AnalyserNode from the microphone; `createAudioButton` (3248) renders the in-page "🎵 Enable Audio Reactivity" button; `processBrowserAudio` (3391) writes smoothed frequency data into the same fields the engine audio path uses; `cleanupBrowserAudio` (3457) tears it all down. All processing is local — nothing leaves the browser.

**Browser-only interactions**: mouse wheel resizes sprites; left-click on empty canvas adds a sprite, on a sprite removes it; JSZip is preloaded for download features (`loadJSZip`).

## Settings keys in browser-settings.html (defaultSettings, ~line 415)

`susuwatariSize`, `susuwatariCount`, `fleeDistance`, `fleeAcceleration`, `eyeDilationIntensity`, `audioVisualizationEnabled`, `audioIntensity`, `bassPulseIntensity`, `sleepTime`, `sleepEnabled`, `maxRunDistance`, `restTimeout`, `zigzagMinDistance`, `backgroundImageUrl`.

⚠️ `sleepTime` + `sleepEnabled` do NOT match the code keys (`sleepTimeout`, `sleepStartTime`, ...) — browser sleep controls currently have no effect. See `.agents/wallpaper-engines.md` → Known Discrepancies.