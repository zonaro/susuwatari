<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Susuwatari Project - Audio-Reactive Wallpaper Engine Ready

This project creates an interactive HTML5 Canvas implementation of Susuwatari (soot sprites) from Studio Ghibli films, optimized for Wallpaper Engine with full audio reactivity.

## Current Project Status:
✅ **COMPLETED** - Fully functional Wallpaper Engine wallpaper with all features implemented, translated to English, and audio-reactive capabilities

## Project Features:
- Interactive Canvas-based Susuwatari particles with audio-reactive spiky shapes (75-120 spikes each)
- **Unique Rotations**: Each Susuwatari has individual rotation angle and speed for diverse visual patterns
- **Audio-Reactive Rotation**: Rotation speed increases during intense audio, creating dynamic movement
- Advanced mouse interactions with realistic physics and smooth movement
- **Audio Reactivity**: Spikes pulse and move to music using Wallpaper Engine Audio API
- Wallpaper Engine integration with 5 customizable properties
- Multiple particle systems: main sprites, smoke explosions, soot trails, permanent stains
- Expressive eyes with pupils that follow mouse and dilate based on proximity (eyes stay in fixed position while body rotates)
- Blinking system (3-10 second intervals)
- Performance optimized for 60+ FPS with auto-cleanup
- Complete English localization

## Files Structure:
- `index.html` - Wallpaper Engine compatible interface with property definitions
- `susuwatari.js` - Canvas-based SusuwatariCanvas class with full particle systems and audio processing
- `project.json` - Wallpaper Engine metadata and configuration (includes supportsaudioprocessing: true)
- `README.md` - Complete project documentation

## Wallpaper Engine Properties:
1. **Initial Susuwatari Size** (10-150px, default: 18px)
2. **Initial Susuwatari Count** (1-150 particles, default: 100)
3. **Mouse Detection Distance** (10-100px, default: 80px)
4. **Flee Acceleration** (1.0-8.0x, default: 4.0x)
5. **Audio Reactivity Intensity** (0.0-3.0x, default: 1.0x) - Controls spike reactions
6. **Bass Pulse Intensity** (0.0-3.0x, default: 1.0x) - Controls eye size pulsing with bass
7. **Audio Visualization** (On/Off, default: On) - Master toggle for all audio effects

## Audio-Reactive Features:
- Real-time audio processing (~30 Hz) with smoothing
- Full frequency spectrum analysis (128 audio data points)
- **Master Toggle**: Audio visualization can be completely disabled for static experience
- **Unique Rotations**: Each Susuwatari has individual fixed rotation angle for diverse visual patterns
- **Static Orientation**: Susuwatari maintain their initial rotation for consistent diversity
- **Bass Eye Pulsing**: Eyes grow and shrink with bass frequencies (first 16 bass ranges from both channels)
- Bass frequencies affect bottom 30% of spikes most strongly
- Mid frequencies affect middle 40% of spikes moderately  
- High frequencies affect top 30% of spikes subtly
- Customizable intensity from 0 (disabled) to 3.0x (very reactive)
- Both left and right audio channels utilized
- **Dynamic Visual Diversity**: Different fixed orientations create varied audio reaction patterns

## Technical Implementation:
- HTML5 Canvas 2D rendering with hardware acceleration
- JavaScript ES6+ class-based architecture
- Real-time property updates via Wallpaper Engine API
- **Wallpaper Engine Audio API integration with wallpaperAudioListener**
- Multiple layered particle systems with collision detection
- Smooth interpolated movement system preventing teleporting
- Memory management with automatic off-screen particle cleanup
- Audio data smoothing to prevent erratic movement
- Bass frequency analysis for eye pulsing effects

## All Development Tasks Completed:
- [x] Initial HTML/JavaScript web page creation
- [x] Mouse interaction and flee behavior implementation
- [x] Canvas conversion for performance optimization
- [x] Spiky shape generation with unique patterns
- [x] Eye tracking and dilation effects
- [x] Blinking animation system
- [x] Particle trail and explosion effects
- [x] Wallpaper Engine integration and property system
- [x] Complete English translation and localization
- [x] Performance optimization and memory management
- [x] **Audio-reactive spike animation with Wallpaper Engine Audio API**
- [x] **Bass eye pulsing system with eye size modulation** - NEW!
- [x] **Audio visualization master toggle for static/dynamic mode switching** - NEW!
- [x] Documentation and README completion

## Project Status: 
🎉 **PRODUCTION READY** - The wallpaper is fully functional with audio reactivity and ready for Wallpaper Engine use.