# Architecture — susuwatari.js

Single-file ES6+ application in two layers, both inside `susuwatari.js` (~3.8k lines):

1. **`SusuwatariCanvas` class** (lines 1–3038) — simulation + rendering engine.
2. **Global bootstrap layer** (lines 3040+) — wallpaper engine bridges + browser-mode helpers + embedded-mode (Linux/Hidamari) inline settings panel.

No modules, no imports: the file is loaded via `<script src="susuwatari.js">` in `index.html`.

## Boot Sequence

1. `DOMContentLoaded` (line 3095) fires.
2. `susuwatariInstance = new SusuwatariCanvas()` — constructor seeds defaults, loads `shoes.png`.
3. `processPendingProperties()` — flushes props that arrived before the instance existed.
4. **Engine detection** (lines 3104–3113):
   - **Browser**: URL starts with `https://zonaro.github.io/susuwatari/` **OR** query contains `browser=1`
   - **Wallpaper Engine**: `typeof window.wallpaperRegisterAudioListener !== 'undefined'`
   - **Universal/embedded mode** (Lively + Hidamari, Komorebi, webkit_wallpaper, xwinwrap…): the fallback (no flags matched) → `isLivelyWallpaper = isEmbeddedMode = true`
5. Per-mode init:
   - WE → `window.wallpaperRegisterAudioListener(wallpaperAudioListener)`.
   - Browser → `initializeBrowserMode()` + `initializeBrowserAudio()` + JSZip preload.
   - Embedded → set `window.livelyAudioListener` (3143) + apply the `defaultProperties` map (3149–3167) via `livelyPropertyListener` + `setupEmbeddedControls()` (3176) for the inline settings panel.

## Class Map (SusuwatariCanvas)

| Area | Methods (line) |
|------|----------------|
| Lifecycle | `constructor` (2), `init` (493), `setupCanvas` (500), `resizeCanvas` (507), `setupEventListeners` (512), `animate` (2996) |
| Properties | `applyUserProperties` (290), `updateBackgroundImageUrlProperty` (131) |
| Audio | `wallpaperAudioListener` (194), `getBassPulseMultiplier` (210), `getAudioSpikeMultiplier` (243) |
| Sleep | `isWithinSleepHours` (154), `getCurrentAudioVolume` (178), `updateSleepSystem` (1974) |
| Particles | `createParticle` (655), `createInitialParticles` (1229), `getRandomBlinkInterval` (1235) |
| Smoke | `createSmokeExplosion` (1239), `updateSmokeParticles` (1262), `drawSmokeParticles` (1284) |
| Trails | `createTrailParticle` (1307), `updateTrailParticles` (1325), `drawTrailParticles` (1344) |
| Stains | `createSootStain` (1367), `updateSootStains` (1394), `drawSootStains` (1411) |
| Movement | `makeParticleFlee` (1475), `updateParticleMovement` (1550) |
| Collisions | `checkParticleCollisions` (1458), `handleCollisions` (1689) |
| Collectibles | `createCollectible` (802), `handleCollectibleClick` (935), `createCollectibleAt` (974), `reassignAllCollectibles` (1017), `getRandomStarColor` (1042), `createSparkles` (1056), `generateCoalShape` (1073), `generateShoeShape` (1090), `assignCollectibleToSusuwatari` (1169), `assignShoeToAllSusuwatari` (1185), `reassignShoesToAllSusuwatari` (1221), `updateCollectibles` (2084), `createCollectionEffect` (2163), `drawCollectibles` (2185) |
| Effects | `checkForDizziness` (2353), `makeSusuwatariDizzy` (2414), `checkForZigzag` (2428), `triggerZigzagEffect` (2503), `refillScreen` (2916) |
| Rendering | `updatePupils` (2569), `processBlinks` (2613), `drawSpiral` (2631), `drawSusuwatari` (2658) |
| Misc | `loadShoeImage` (78), `fileToBase64DataURL` (91), `removeNearestParticle` (2545), `updateUI` (2974), `calculateFPS` (2981) |

## Global Bootstrap Layer (lines 3040+)

| Symbol | Line | Role |
|--------|------|------|
| `susuwatariInstance` | 3041 | Singleton instance |
| `wallpaperAudioListener(audioArray)` | 3044 | WE audio bridge → instance method |
| `pendingProperties` / `processPendingProperties()` | 3051 / 3067 | Pre-init WE property queue |
| `window.wallpaperPropertyListener.applyUserProperties` | 3054 | WE property bridge (normalizes + forwards) |
| `livelyPropertyListener(name, val)` | 3080 | Lively property bridge (camelCase, "no conversion needed") |
| `isBrowserMode` / `isLivelyWallpaper` / `isWallpaperEngine` / `isEmbeddedMode` | 3089–3092 | Mode flags (default: embedded/Lively=true) |
| `detectBPM(audioArray, sampleRate = 44100)` | 3188 | BPM estimation from raw audio samples |
| Browser audio module | 3256–3523 | Web Audio API (mic), enable button, notifications, cleanup |
| Browser mode module | 3524–3608 | Settings load/apply, controls, settings popup, JSZip |
| Embedded mode module | 3610–3875 | Inline settings panel (no popup), gear button, Ctrl+Shift+S, right-click, localStorage |

## Main Loop — `animate()` (2996)

Per frame: `clearRect` → `updateParticleMovement` → `updateSleepSystem` → `updateCollectibles` → `updateSootStains` + `drawSootStains` → `updateTrailParticles` + `drawTrailParticles` → `updateSmokeParticles` + `drawSmokeParticles` → `updatePupils` + `processBlinks` → `drawSusuwatari` per particle → `drawCollectibles` → `calculateFPS` → `requestAnimationFrame`.

New per-frame systems go between the particle updates and the final `drawCollectibles`.

## Data Models (plain object literals — no subclasses)

- **Susuwatari particle** (`createParticle`, 655): position/velocity, `baseSize`, `size`, `sizeMultiplier`, unique `rotation`, 75–120 spike shape data, eye/pupil state, state flags (`isSleeping`, `sleepStartTime`, `isDizzy`, `isTired`, `targetCollectible`, `isSeekingCollectible`), per-particle audio offsets.
- **Collectible** (`createCollectibleAt`, 974): `type` (`'coal' | 'star' | 'shoe'`), `size`, `color`, `rotation`, `createdTime`, `pulseOffset`, `sparkles` (stars only), pre-generated `coalShape`/`shoeShape`, `assignedTo`, `isLargerThanSusuwatari`.
- **Ephemeral particles** (smoke/trail/stain): `x, y, size, opacity, life, decay, velocityX, velocityY` — pruned per frame via `Array.prototype.filter` (e.g. `updateSmokeParticles` 1262).

## Property Flow

1. Engine bridge (WE `wallpaperPropertyListener`, Lively `livelyPropertyListener`, or browser `applyBrowserSettings`) receives `{ key: value }`.
2. Bridge normalizes to `{ key: { value } }` and calls `instance.applyUserProperties(properties)`.
3. `applyUserProperties` (290) writes the instance field and re-renders side effects (e.g. resizing all existing sprites on `susuwatariSize`).

## Audio Flow

Engine pushes `Float32Array` frequency data at ~30 Hz → instance `wallpaperAudioListener` (194) smooths and stores it → per-frame readers: `getBassPulseMultiplier` (210, eye size) and `getAudioSpikeMultiplier` (243, per-spike scale). Full math in `.agents/features.md`.