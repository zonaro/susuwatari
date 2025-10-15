<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Susuwatari Project - Wallpaper Engine Ready

This project creates an interactive HTML5 Canvas implementation of Susuwatari (soot sprites) from Studio Ghibli films, optimized for Wallpaper Engine.

## Current Project Status:
✅ **COMPLETED** - Fully functional Wallpaper Engine wallpaper with all features implemented and translated to English

## Project Features:
- Interactive Canvas-based Susuwatari particles with spiky shapes (75-120 spikes each)
- Advanced mouse interactions with realistic physics and smooth movement
- Wallpaper Engine integration with 4 customizable properties
- Multiple particle systems: main sprites, smoke explosions, soot trails, permanent stains
- Expressive eyes with pupils that follow mouse and dilate when fleeing
- Blinking system (3-10 second intervals)
- Performance optimized for 60+ FPS with auto-cleanup
- Complete English localization

## Files Structure:
- `index.html` - Wallpaper Engine compatible interface with property definitions
- `susuwatari.js` - Canvas-based SusuwatariCanvas class with full particle systems
- `project.json` - Wallpaper Engine metadata and configuration
- `README.md` - Complete project documentation

## Wallpaper Engine Properties:
1. **Initial Susuwatari Size** (10-150px, default: 18px)
2. **Initial Susuwatari Count** (1-150 particles, default: 100)
3. **Mouse Detection Distance** (10-100px, default: 80px)
4. **Flee Acceleration** (1.0-8.0x, default: 4.0x)

## Technical Implementation:
- HTML5 Canvas 2D rendering with hardware acceleration
- JavaScript ES6+ class-based architecture
- Real-time property updates via Wallpaper Engine API
- Multiple layered particle systems with collision detection
- Smooth interpolated movement system preventing teleporting
- Memory management with automatic off-screen particle cleanup

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
- [x] Documentation and README completion

## Project Status: 
🎉 **PRODUCTION READY** - The wallpaper is fully functional and ready for Wallpaper Engine use.