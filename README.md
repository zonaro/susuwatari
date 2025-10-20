# Susuwatari - Interactive Audio-Reactive Wallpaper

An interactive implementation of the famous Susuwatari (soot sprites) from Studio Ghibli films, especially "Spirited Away" and "My Neighbor Totoro", compatible with both **Wallpaper Engine** and **Lively Wallpaper** with audio-reactive features.

## Installation

### Wallpaper Engine (Steam)
[Install from Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=3587855531)

### Lively Wallpaper (Free)
1. Download or clone this repository
2. Copy the project folder to your Lively Wallpaper directory
3. Import the wallpaper through Lively Wallpaper's interface
4. Customize properties through the right-click context menu

## Compatibility
✅ **Wallpaper Engine** - Full compatibility with project.json properties  
✅ **Lively Wallpaper** - Full compatibility with LivelyProperties.json  
✅ **Web Browsers** - Complete settings panel with popup interface and localStorage persistence



## Features

### Basic Interactions
- **Fluid Animation**: Susuwatari move smoothly across the screen with subtle movement
- **Mouse Interaction**: When the mouse approaches, the sprites flee with realistic physics
- **Auto Regeneration**: After 2 seconds without mouse movement, new Susuwatari appear
- **Scroll for Size**: Use mouse wheel to increase/decrease Susuwatari size
- **Click to Add/Remove**: Click on empty area to add, on a Susuwatari to remove

### Audio-Reactive Features
- **Music-Responsive Spikes**: The spikes of each Susuwatari pulse and move to the beat of your music
- **Bass Eye Pulsing**: Susuwatari eyes grow and shrink responding to bass frequencies, creating an expressive reaction
- **Unique Orientations**: Each Susuwatari has a unique fixed rotation, making spikes react differently to audio
- **Static Rotation**: Susuwatari maintain their initial orientation for consistent visual diversity
- **Full Frequency Spectrum**: Uses both left and right audio channels across all frequencies
- **Smooth Audio Processing**: Audio data is smoothed to prevent erratic movement
- **Dual Intensity Controls**: Separate controls for spike reactivity and bass eye pulsing intensity

### Visual Effects
- **Spiky Shape**: Each Susuwatari has a unique shape with 75-120 spikes that react to music
- **Unique Rotation**: Each sprite has its own fixed rotation angle, creating diverse visual patterns
- **Audio-Reactive Spikes**: Spikes that pulse and move to the beat of your music
- **Expressive Eyes**: Pupils that follow the mouse and dilate based on mouse proximity (closer mouse = more scared expression)
- **Blinking System**: Randomly blink between 3-10 seconds
- **Soot Trails**: Leave dark trails when moving
- **Smoke Explosion**: When disappearing, explode into smoke particles
- **Permanent Stains**: Leave soot stains for 10 seconds where they disappeared

### Background Customization
- **Custom Background Images**: Upload your own wallpaper images to personalize the experience
- **Default Gradient**: Beautiful default blue gradient when no image is set

### Customizable Properties (Wallpaper Engine)

#### Initial Susuwatari Size
- **Type**: Slider
- **Range**: 10 - 150 pixels
- **Default**: 18 pixels
- **Description**: Sets the base size of Susuwatari when loading

#### Initial Susuwatari Count
- **Type**: Slider
- **Range**: 1 - 150 particles
- **Default**: 100 particles
- **Description**: Number of Susuwatari on screen initially

#### Mouse Detection Distance
- **Type**: Slider
- **Range**: 10 - 100 pixels
- **Default**: 80 pixels
- **Description**: Distance at which Susuwatari start fleeing from cursor

#### Flee Acceleration
- **Type**: Slider
- **Range**: 1.0 - 8.0x
- **Default**: 4.0x
- **Description**: Maximum acceleration speed when fleeing

## Configuration

### Wallpaper Engine
Configuration is done through the **Customize** menu (right-click on wallpaper in gallery):
- Properties are defined in `project.json`
- Real-time updates through wallpaperPropertyListener
- Audio processing through wallpaperRegisterAudioListener

### Lively Wallpaper
Configuration is done through the **Customize** menu (right-click on wallpaper):
- Properties are defined in `LivelyProperties.json`
- Real-time updates through livelyPropertyListener
- Audio processing through livelyAudioListener

## Customizable Properties

#### Initial Susuwatari Size
- **Type**: Slider
- **Range**: 10 - 150px
- **Default**: 18px
- **Description**: Controls the base size of each Susuwatari sprite

#### Initial Susuwatari Count
- **Type**: Slider
- **Range**: 1 - 150 particles
- **Default**: 100
- **Description**: Number of Susuwatari sprites active on screen

#### Mouse Detection Distance
- **Type**: Slider  
- **Range**: 10 - 100px
- **Default**: 80px
- **Description**: How close the mouse cursor can get before Susuwatari start fleeing

#### Flee Acceleration
- **Type**: Slider
- **Range**: 1.0 - 8.0x
- **Default**: 4.0x
- **Description**: How quickly Susuwatari accelerate when fleeing from the mouse cursor

#### Audio Reactivity Intensity
- **Type**: Slider
- **Range**: 0.0 - 3.0x
- **Default**: 1.0x
- **Description**: Controls how strongly the Susuwatari spikes react to music. Set to 0 to disable audio reactivity.

#### Bass Pulse Intensity
- **Type**: Slider
- **Range**: 0.0 - 3.0x
- **Default**: 1.0x
- **Description**: Controls how much the Susuwatari eyes grow and shrink with bass frequencies. Set to 0 to disable bass pulsing effect on eyes.

#### Audio Visualization
- **Type**: Toggle (On/Off) / Checkbox
- **Default**: On
- **Description**: Master toggle to enable or disable all audio visualization effects. When turned off, completely disables spike reactivity, bass pulsing, and audio-reactive rotation, returning to a purely static visual experience.

#### Max Run Distance Before Tired
- **Type**: Slider
- **Range**: 100 - 800px
- **Default**: 300px
- **Description**: Distance Susuwatari can run before getting tired and needing to rest

#### Sleep Time
- **Type**: Slider
- **Range**: 3 - 60 seconds
- **Default**: 10 seconds
- **Description**: Time before Susuwatari fall asleep when mouse cursor is inactive

#### Enable Sleep System
- **Type**: Toggle (On/Off) / Checkbox
- **Default**: On
- **Description**: Allow Susuwatari to fall asleep when mouse cursor is inactive for the specified time

#### Rest Timeout When Dizzy
- **Type**: Slider
- **Range**: 2 - 15 seconds
- **Default**: 5 seconds
- **Description**: Time Susuwatari rest when they become dizzy from rapid mouse movement

#### Background Image *(Wallpaper Engine)*
- **Type**: File Selector (Image)
- **Default**: None
- **Description**: Upload a custom background image for your wallpaper. Supports common image formats (JPEG, PNG, BMP, GIF, SVG, WebP). When an image is selected, it will be displayed as the background with cover scaling and center positioning. When no image is set, uses the default blue gradient.

#### Background Image URL/Path *(Lively Wallpaper)*
- **Type**: Text Input
- **Default**: Empty
- **Description**: Enter a URL or local file path to a background image. Supports web URLs (https://example.com/image.jpg) and local file paths (C:\path\to\image.png). Uses the same image formats and scaling as Wallpaper Engine. When empty, uses the default blue gradient.

## Installation Instructions

### Wallpaper Engine (Steam)
1. Subscribe to the wallpaper on [Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=3587855531)
2. Apply the wallpaper from Wallpaper Engine's interface
3. Right-click → Customize to access properties

### Lively Wallpaper (Free Alternative)
1. Download this project as ZIP or clone the repository
2. Extract to a folder
3. Open Lively Wallpaper
4. Click "Add Wallpaper" → "Browse" → Select the project folder
5. Right-click the wallpaper → Customize to access properties

### Web Browser (Any Modern Browser)
1. Download the project files
2. Open `index.html` in any modern web browser (Chrome, Firefox, Safari, Edge)
3. **Right-click anywhere** or press **Ctrl+Shift+S** to open the settings panel
4. Customize all properties through the popup settings interface
5. Settings are automatically saved to your browser's local storage

#### Browser Mode Features:
- 🎛️ **Complete Settings Panel**: Full access to all Susuwatari properties
- 🎵 **Web Audio API Integration**: Real-time audio reactivity using microphone input
- � **Privacy-First Audio**: Audio processing happens locally, no data leaves your browser
- �💾 **Persistent Settings**: Configurations saved locally and restored on reload
- 🖱️ **Easy Access**: Right-click or keyboard shortcut to open settings
- 🌐 **Universal Compatibility**: Works in all modern web browsers
- 📱 **Responsive Interface**: Settings panel adapts to different screen sizes
- ⚡ **Real-time Controls**: Audio enable/disable with instant visual feedback

## Project Structure

```
├── index.html              # Main HTML file (entry point)
├── susuwatari.js          # Main JavaScript logic with triple compatibility
├── browser-settings.html  # Web browser settings panel interface
├── project.json           # Wallpaper Engine configuration
├── LivelyProperties.json  # Lively Wallpaper properties
├── LivelyInfo.json       # Lively Wallpaper metadata
├── compatibility-test.html # Cross-platform compatibility testing tool
├── preview.gif           # Preview animation
└── README.md            # This documentation
```

## Technical Implementation

### Triple Compatibility System
The wallpaper automatically detects which platform is running:
- **Wallpaper Engine**: Uses `wallpaperPropertyListener` and `wallpaperRegisterAudioListener`
- **Lively Wallpaper**: Uses `livelyPropertyListener` and `livelyAudioListener`
- **Web Browser**: Uses popup settings panel with `localStorage` persistence and `postMessage` communication

### Audio Processing
- **Wallpaper Engine**: Real-time system audio analysis via `wallpaperRegisterAudioListener`
- **Lively Wallpaper**: Audio stream processing through `livelyAudioListener`
- **Web Browsers**: Microphone input via Web Audio API with user permission
- Real-time audio spectrum analysis (128 data points)
- Separate bass frequency isolation for eye pulsing effects
- Smoothed audio data to prevent erratic movement
- Full left/right channel utilization
- Customizable intensity multipliers
- Privacy-focused: browser audio processing stays completely local

### Performance Optimization
- HTML5 Canvas 2D rendering with hardware acceleration
- Efficient particle system with automatic cleanup
- Memory management for off-screen particles
- Optimized for 60+ FPS performance
- Audio processing at ~30 Hz to balance responsiveness and performance

## Interaction Controls

### Universal Controls (All Platforms):
```
🎮 Scroll: Adjust Susuwatari size
🖱️ Left Click: Add (empty area) / Remove (on Susuwatari)
```

### Platform-Specific Controls:
**Wallpaper Engine & Lively Wallpaper:**
```
🖱️ Right Click: Access settings through wallpaper software
```

**Web Browser Mode:**
```
🖱️ Right Click: Open settings panel popup
⌨️ Ctrl+Shift+S: Open settings panel popup (keyboard shortcut)
🎵 Audio Setup: Click "Enable Audio Reactivity" button when prompted
```

### Browser Audio Setup:
1. **Open in Web Browser**: Load `index.html` in any modern browser
2. **Enable Audio**: Click the "🎵 Enable Audio Reactivity" button that appears
3. **Grant Permission**: Allow microphone access when prompted by browser
4. **Start Playing**: Play music or make sounds to see Susuwatari react
5. **Adjust Settings**: Use Right-click → Audio settings to control reactivity intensity

**Note**: Browser audio uses your microphone for reactivity. All processing happens locally - no audio data leaves your browser.

## Background Customization Tips *(Wallpaper Engine only)*

- **For best results with custom images**: Use high-resolution images that look good with moving particles
- **Dark backgrounds recommended**: Choose darker images to ensure Susuwatari remain visible
- **Image formats supported**: JPEG, PNG, BMP, GIF, SVG, WebP
- **Default gradient**: Beautiful blue gradient is used when no custom image is selected

## Technologies Used

- **HTML5 Canvas**: High performance 2D rendering
- **JavaScript ES6+**: Physics simulation and interaction logic
- **Wallpaper Engine API**: Properties and audio integration
- **Lively Wallpaper API**: Properties and audio integration  
- **Dual Compatibility System**: Automatic engine detection and adaptation

## Performance

- **60+ FPS**: Optimized for smooth rendering
- **Canvas 2D**: Much more efficient than DOM manipulation
- **Auto-cleanup**: Automatically removes off-screen particles
- **Memory management**: Intelligent particle control
- **Audio Processing**: ~30 Hz audio data processing with smoothing for optimal performance

## Inspiration

This project was inspired by the adorable Susuwatari from Studio Ghibli films, magical creatures that live in abandoned houses and flee when disturbed, but return when everything is quiet again.

## License

Open source project for educational and entertainment purposes.
