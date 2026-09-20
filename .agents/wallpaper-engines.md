# Wallpaper Engine & Lively Wallpaper Integration

Identical experience on Wallpaper Engine (Steam), Lively Wallpaper, the browser, and Linux web-page wallpapers (Hidamari, Komorebi, webkit_wallpaper, xwinwrap…). Platform-specific code lives only in the global bootstrap layer of `susuwatari.js` (lines 3040+).

## Engine Detection (DOMContentLoaded, 3104)

| Engine | Detection | Mode init |
|--------|-----------|-----------|
| Browser | URL host `zonaro.github.io/susuwatari/` or `?browser=1` | Browser helpers + Web Audio mic |
| Wallpaper Engine | `typeof window.wallpaperRegisterAudioListener !== 'undefined'` | Register audio listener; properties via WE bridge |
| Universal/embedded (Lively, Hidamari, Komorebi…) | Fallback (no flag matched) | `window.livelyAudioListener` + boot defaults + inline settings panel |

## Global Contracts (load-bearing — never rename)

| Engine | Properties | Audio |
|--------|-----------|-------|
| WE | `window.wallpaperPropertyListener.applyUserProperties(props)` (3054) | `window.wallpaperRegisterAudioListener(wallpaperAudioListener)` → method (194) |
| Lively / embedded | `window.livelyPropertyListener(name, val)` (3080) | `window.livelyAudioListener(audioArray)` (3143) |

- WE may push properties before the instance exists → queued in `pendingProperties` (3051), flushed by `processPendingProperties` (3067).
- Embedded/universal mode gets defaults at boot from the `defaultProperties` map (3149–3167) via `livelyPropertyListener`, then calls `setupEmbeddedControls()` (3176) to add the inline settings panel (gear button, Ctrl+Shift+S, right-click; persists to `localStorage` under `susuwatari-settings`).
- Property keys are **camelCase** on both engines (code comment at 3083: "no conversion needed").

## Property Schemas

`applyUserProperties()` (290) is the source of truth; the JSON files declare the engine UIs.

| Property | Type | Range (step) | Default | WE `project.json` | Lively `LivelyProperties.json` |
|----------|------|--------------|---------|-------------------|--------------------------------|
| `susuwatariSize` | slider | 10–150 | 18 | ✅ | ✅ |
| `susuwatariCount` | slider | 1–150 | 100 | ✅ | ✅ |
| `fleeDistance` | slider | 10–100 | 80 | ✅ | ✅ |
| `fleeAcceleration` | slider | 1–8 (.1) | 4 | ✅ | ✅ |
| `audioIntensity` | slider | 0–3 (.1) | 1 | ✅ | ✅ |
| `bassPulseIntensity` | slider | 0–3 (.1) | 1 | ✅ | ✅ |
| `audioVisualizationEnabled` | bool | — | true | ✅ | ✅ (checkbox) |
| `maxRunDistance` | slider | 100–800 (10) | 300 | ✅ | ✅ |
| `sleepStartTime` | textinput | "22:00" | "22:00" | ✅ | ❌ |
| `sleepEndTime` | textinput | "06:00" | "06:00" | ✅ | ❌ |
| `sleepTimeout` | slider | 3–60 | 10 | ✅ | ❌ |
| `minVolumeToKeepAwake` | slider | 0–1 (.05) | 0.1 | ✅ | ❌ |
| `restTimeout` | slider | 2–15 | 5 | ✅ | ✅ |
| `zigzagMinDistance` | slider | 50–400 (10) | 150 | ✅ | ✅ |
| `eyeDilationIntensity` | slider | 1–10 | 1 | ✅ | ✅ |
| `backgroundImageUrl` | textinput | — | "" | ✅ | ✅ (textbox) |
| `backgroundImagePicker` | file | — | — | ✅ (file) | ✅ (folderDropdown) |
| `sleepTime` | slider | 3–60 | 10 | ❌ | ✅ (⚠️ NOT read by code) |
| `sleepEnabled` | bool | — | true | ❌ | ✅ (⚠️ NOT read by code) |

Engine config extras: `project.json` → `"supportsaudioprocessing": true` (top-level **and** under `general`), `workshopid: 3587855531`; `LivelyInfo.json` → `Type: 1` (web), `Arguments: "--audio"`.

## Known Discrepancies (danger)

1. **Sleep key mismatch**: code reads only `sleepStartTime` / `sleepEndTime` / `sleepTimeout` / `minVolumeToKeepAwake`. `LivelyProperties.json` and `browser-settings.html` instead declare `sleepTime` + `sleepEnabled` (and Lively lacks the window/volume keys). Consequence: Lively sleep controls and browser-panel sleep controls have **no effect** — boot defaults (3149–3167) cover the real keys, but user changes to `sleepTime`/`sleepEnabled` are ignored. Note: the embedded-mode panel (3610+) uses the **real** keys, so Linux/Hidamari sleep controls work.
2. ~~**Missing boot default**: `eyeDilationIntensity` absent from the Lively `defaultProperties` map~~ — **FIXED** (3164): now present in the universal-mode defaults, matching the class default (1).
3. **`resetToDefaults` drift**: the browser panel resets to its own `defaultSettings` (~line 415), not to the code defaults — the two lists can diverge.

## Local Background Files — per engine

- **Wallpaper Engine**: the file picker returns a path → used directly as `file:///…` (lines 433–444).
- **Lively Wallpaper**: the folder dropdown returns a filename relative to `backgrounds/` → read and converted to base64 via `fileToBase64DataURL` (91), then written back into `backgroundImageUrl` (future loads short-circuit at the base64 branch).

## Deploy (Windows only)

`copy-to-wallpaper-engine.ps1`:
- `robocopy . <dest> /E /XD .vscode .vs .github .git`, where dest = `D:\SteamLibrary\steamapps\common\wallpaper_engine\projects\myprojects\susuwatari`.
- Post-copy deletions: `copy-to-wallpaper-engine.ps1`, `README.md`, `LICENSE`, `susuwatari.code-workspace`, `.gitignore`, `steam.txt`.
- `robocopy` exit codes ≤ 1 = success.

## Adding a New Property (checklist)

1. `susuwatari.js` → `applyUserProperties()` (290): add the `if (properties.xxx)` branch and the instance field default.
2. `project.json` → `general.properties`: add the UI control (keep `index`/`order` sequential).
3. `LivelyProperties.json`: add the matching control.
4. `browser-settings.html`: add the control, a `defaultSettings` key, and a value-display updater.
5. Embedded/universal mode: add the control to `EMBEDDED_CONTROLS` (3623) — the inline Linux/Hidamari panel is generated from this array.
6. Keep the key identically camelCase everywhere; test in both engines + browser + a Linux web-wallpaper host (e.g. Hidamari).