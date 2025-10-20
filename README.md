# Susuwatari - Interactive Audio-Reactive Wallpaper

An interactive implementation of the famous Susuwatari (soot sprites) from Studio Ghibli films, especially "Spirited Away" and "My Neighbor Totoro", compatible with both **Wallpaper Engine** and **Lively Wallpaper** with audio-reactive features.



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

#### Background Image URL/Path 
- **Type**: Text Input
- **Default**: Empty
- **Description**: Enter a URL or local file path to a background image. Supports web URLs (https://example.com/image.jpg) and local file paths (C:\path\to\image.png). Uses the same image formats and scaling as Wallpaper Engine. When empty, uses the default blue gradient.

## Installation Instructions

### Wallpaper Engine (Steam)
1. Subscribe to the wallpaper on [Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=3587855531)
2. Apply the wallpaper from Wallpaper Engine's interface

### Lively Wallpaper (Free Alternative)
1. [Download](https://zonaro.github.io/download)
2. Open Lively Wallpaper
3. Click "Add Wallpaper" → "Browse" → Select the .zip file

### Web Browser (Any Modern Browser)
1. Navigate to http://zonaro.github.io/susuwatari
2. Right-click to open settings menu
 

#### Browser Mode Features:
- 🎛️ **Complete Settings Panel**: Full access to all Susuwatari properties
- 🎵 **Web Audio API Integration**: Real-time audio reactivity using microphone input
- � **Privacy-First Audio**: Audio processing happens locally, no data leaves your browser
- �💾 **Persistent Settings**: Configurations saved locally and restored on reload
- 🖱️ **Easy Access**: Right-click or keyboard shortcut to open settings
- 🌐 **Universal Compatibility**: Works in all modern web browsers
- 📱 **Responsive Interface**: Settings panel adapts to different screen sizes
- ⚡ **Real-time Controls**: Audio enable/disable with instant visual feedback
  

## Interaction Controls

### Universal Controls (All Platforms):
```
🖱️ Left Click: Add (empty area) / Remove (on Susuwatari)
```

### Platform-Specific Controls:
**Wallpaper Engine & Lively Wallpaper:**
```
Access settings through wallpaper software
```

**Web Browser Mode:**
```
🎮 Scroll: Adjust Susuwatari size
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

## Background Customization

### Wallpaper Engine:
- **Text Input Field**: Enter any URL (http://, https://) or local file path directly
- **Browse Button**: Use the file picker to select local images (automatically fills the text field)
- **Dual Options**: Both methods work together - file picker updates the text field for easy editing

### Lively Wallpaper:
- **URL/Path Input**: Enter image URLs or local file paths in the background image field

### All Platforms:
- **Supported Formats**: JPEG, PNG, BMP, GIF, SVG, WebP
- **URL Support**: Direct links to online images (https://example.com/image.jpg)
- **Local Files**: Full file paths (C:\path\to\image.jpg or /path/to/image.jpg)
- **Default Gradient**: Beautiful blue gradient when no image is specified

### Tips:
- **High-resolution recommended**: Images look better with moving particles
- **Dark backgrounds preferred**: Ensure Susuwatari remain visible against the background
- **Online images**: Must be accessible via direct URL (some sites block hotlinking)

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
