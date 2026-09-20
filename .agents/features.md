# Behavior Systems — Physics, Sleep, Collectibles, Audio

Every system is a `SusuwatariCanvas` method in `susuwatari.js`. Line numbers are from the current file.

## Movement & Flee Physics

- Sprites idle-wander subtly and **flee the mouse** when it enters `fleeDistance` (10–100px, default 80): `makeParticleFlee` (1475), acceleration scaled by `fleeAcceleration` (1–8×, default 4).
- Movement is smoothed/interpolated (`updateParticleMovement` 1550) — no teleporting.
- **Tired system**: after running `maxRunDistance` (100–800px, default 300) a sprite gets tired and rests before fleeing again (per-sprite recovery randomness).
- Boundary clamping keeps everything on-canvas; `refillScreen` (2916) respawns sprites when the field empties.
- Click interplay: on empty canvas → `createParticle` at cursor; on a sprite → `removeNearestParticle` (2545) — removal fires the smoke explosion + soot stain.

## Sleep System (`updateSleepSystem` 1974)

Sleep happens only while all of these hold:
1. Time is inside the `[sleepStartTime, sleepEndTime]` window — `isWithinSleepHours` (154); supports overnight windows (e.g. 22:00 → 06:00).
2. No mouse movement for `sleepTimeout` seconds (default 10).
3. Audio volume is below `minVolumeToKeepAwake` (0–1, default 0.1) — `getCurrentAudioVolume` (178).

While asleep: eyes closed, floating "ZZZ", no movement. Wake triggers: mouse activity, volume ≥ threshold, or outside sleep hours. Audio is the "gaming-friendly" gate — loud game audio keeps sprites awake at night; ambient/quiet audio lets them sleep.

⚠️ The `sleepEnabled` / `sleepTime` keys present in `LivelyProperties.json` are **not read** anywhere in the code (see `.agents/wallpaper-engines.md`).

## Dizzy & Scatter Effects

- **Dizzy** (`checkForDizziness` 2353 → `makeSusuwatariDizzy` 2414): rapid circular mouse motion around a sprite → spiral "X" eyes (`drawSpiral` 2631) + wobbling, then rest for `restTimeout` seconds (2–15, default 5), then recover with a random flee direction.
- **Zigzag scatter** (`checkForZigzag` 2428 → `triggerZigzagEffect` 2503): quick zigzag strokes at least `zigzagMinDistance` (50–400px, default 150) away from all sprites → every sprite scatters to a new random position.

## Collision System (`handleCollisions` 1689, `checkParticleCollisions` 1458)

- Moving sprites push stationary ones; when both move, the **larger pushes the smaller**.
- Pushed sprites inherit momentum and keep drifting in the pushed direction.
- Collision points emit particle effects whose size/intensity varies with collision type.
- All objects respect canvas boundaries; new spawns pick safe, non-overlapping positions.

## Collectibles (coal ⚫, stars ⭐, shoe 👞)

| Type | Spawn / behavior | Click behavior |
|------|------------------|----------------|
| Coal | 50–150% of average sprite size; irregular fixed shape (`generateCoalShape` 1073); auto-collected on touch | Splits into two pieces (50% size), keeps shape `createCollectibleAt` (974) |
| Star | 30–90% of sprite size; 8 colors (`getRandomStarColor` 1042: gold, hot pink, turquoise, tomato, lime, purple, orange-red, deep sky blue); sparkles + gentle pulse (`createSparkles` 1056) | Recolor to a random color |
| Shoe | Exactly 1 at a time; 180% of average size; drawn from `shoes.png` (`loadShoeImage` 78); solid obstacle; all sprites gather around it (`assignShoeToAllSusuwatari` 1185) | Removes it — the only way to eliminate a shoe; gatherers reset |

- Coal **larger than the sprite explodes it** into dust (explosion + stain).
- Collection assignment: `assignCollectibleToSusuwatari` (1169) pairs one sprite per collectible; `reassignAllCollectibles` (1017) re-pairs after any click/split/removal; `createCollectionEffect` (2163) bursts colored particles on collection.

## Audio Reactivity

- **Input**: `wallpaperAudioListener(audioArray)` (method, 194) — engines push Float32 frequency arrays (both channels, full spectrum, ~128 bins, ~30 Hz). Data is smoothed to prevent erratic motion.
- **Spike reactivity** — `getAudioSpikeMultiplier(spikeIndex, totalSpikes, particle)` (243): bands map onto the 75–120 spike shape — bass → bottom 30% of spikes (strongest), mids → middle 40% (moderate), treble → top 30% (subtle); scaled by `audioIntensity` (0–3, default 1).
- **Bass eye pulsing** — `getBassPulseMultiplier(particle)` (210): bass bins (first 16 per channel) scale eye size; scaled by `bassPulseIntensity` (0–3, default 1).
- **Master toggle** — `audioVisualizationEnabled` (default true): kills all audio effects for a purely static experience.
- **Unique orientation**: each sprite keeps a fixed random rotation → the same audio produces different spike reactions per sprite.
- `detectBPM(audioArray, sampleRate = 44100)` (3173) estimates BPM from raw samples (available for beat-synced behavior).
- Browser mode replaces the engine feed with the Web Audio microphone analyser (`.agents/frontend.md`).

## Performance & Memory

- ~30 Hz audio processing + smoothing (cheap, non-jittery).
- Off-screen particles removed every frame; count capped by `maxParticles`.
- Ephemeral arrays pruned with `Array.prototype.filter` each frame (smoke/trail/stain).
- `calculateFPS` (2981) tracks FPS for diagnostics.