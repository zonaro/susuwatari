# Susuwatari — Project Handbook

Interactive, audio-reactive **Susuwatari** (Studio Ghibli soot sprites) wallpaper that runs on **Wallpaper Engine**, **Lively Wallpaper**, and any modern web browser.

- **Stack**: vanilla JavaScript (ES6+, single file), HTML5 Canvas 2D. No build step, no dependencies, no tests.
- **Entry point**: `index.html` → `susuwatari.js` (one class + global bootstrap layer).
- **Status**: production-ready. Published on Steam Workshop (`workshopid: 3587855531`) and GitHub Pages (`https://zonaro.github.io/susuwatari`).
- **Language**: all code, docs and UI text in English.

## Repository Structure

```
susuwatari/
├── index.html                    # Entry point: single canvas + inline CSS, loads susuwatari.js
├── susuwatari.js                 # ALL application logic (~3.8k lines): class + engine bridges + browser helpers
├── browser-settings.html         # Standalone settings popup for browser mode (postMessage channel)
├── project.json                  # Wallpaper Engine metadata + 16 user properties + audio flag
├── LivelyInfo.json               # Lively Wallpaper metadata (Type 1/Web, Arguments: "--audio")
├── LivelyProperties.json         # Lively Wallpaper property schema
├── copy-to-wallpaper-engine.ps1  # PowerShell deploy script (robocopy → Steam projects folder)
├── backgrounds/                  # Custom background images (scanned by Lively folder dropdown)
├── preview.gif                   # Workshop preview thumbnail
├── shoes.png                     # Shoe obstacle sprite
├── README.md                     # User-facing documentation
├── .github/copilot-instructions.md  # Legacy Copilot instructions (kept; Copilot ignores .agents/)
└── AGENTS.md                     # This file — summary; implementation details live in .agents/
```

## Where to Look

| Task | Go to |
|------|-------|
| Boot sequence, code map, data models, main loop | `.agents/architecture.md` |
| Canvas rendering, sprites, particles, background, browser settings panel | `.agents/frontend.md` |
| Wallpaper Engine / Lively contracts, property schemas, deploy | `.agents/wallpaper-engines.md` |
| Flee physics, sleep, dizzy/zigzag, collisions, collectibles, audio reactivity | `.agents/features.md` |
| Source of truth for settings | `susuwatari.js` → `applyUserProperties()` (~line 290) |

## Golden Rules

1. **Keep the single-file architecture.** All runtime logic stays in `susuwatari.js`. Do not split into modules or add a build step — wallpaper engines load `index.html` as a static file.
2. **No dependencies.** Vanilla JS only.
3. **Properties flow one way through `applyUserProperties()`.** A new setting must be added to all four surfaces with the same camelCase key: `applyUserProperties()` + `project.json` (WE) + `LivelyProperties.json` (Lively) + `browser-settings.html` (browser).
4. **Never break the engine contracts.** These globals are load-bearing:
   - `window.wallpaperPropertyListener.applyUserProperties` (WE properties)
   - `window.wallpaperRegisterAudioListener(wallpaperAudioListener)` (WE audio)
   - `window.livelyPropertyListener(name, value)` (Lively properties)
   - `window.livelyAudioListener(audioArray)` (Lively audio)
5. **Engine mode is detected at boot** (`DOMContentLoaded`, ~line 3104): browser by URL/`browser=1`, WE by presence of `wallpaperRegisterAudioListener`, Lively as fallback. Never hardcode a mode.
6. **Heavy `console.log` debugging is the house style** — keep it.
7. **No tests, no linter.** Verification = open in browser and both engines. Commit style: `feat:` / `fix:` prefixes, messages in Portuguese (per repo history).

## Anti-Patterns

- ✗ Adding ES modules, imports, or a bundler.
- ✗ Renaming/removing the global listener entry points listed above.
- ✗ Adding a setting that bypasses `applyUserProperties()`.
- ✗ Empty `catch {}` blocks that swallow errors.
- ✗ Editing `project.json` / `LivelyProperties.json` without mirroring the code — the three surfaces already drift (see `.agents/wallpaper-engines.md` → Known Discrepancies).

## Commands

```bash
# Run (browser mode)
open index.html        # browser mode = URL host zonaro.github.io/susuwatari or ?browser=1

# Deploy to Wallpaper Engine (Windows)
powershell -File copy-to-wallpaper-engine.ps1

# No build, no test, no lint
```

## Known Gotchas

- `LivelyProperties.json` and `browser-settings.html` declare `sleepTime` + `sleepEnabled`, but the code only reads `sleepStartTime` / `sleepEndTime` / `sleepTimeout` / `minVolumeToKeepAwake` — Lively/browser sleep controls currently have no effect.
- Browser mode is only auto-detected for the `zonaro.github.io/susuwatari` host; anything else needs `?browser=1`.
- Left-click removes a sprite / adds one on empty canvas; mouse wheel resizes (browser only).