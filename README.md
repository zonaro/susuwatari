
![Preview of Susuwatari Wallpaper](preview.gif)


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

### Advanced Sleep System 🌙🎵
- **Time-Based Sleep**: Configure specific hours when Susuwatari can sleep (e.g., 22:00 to 06:00)
- **Volume-Aware Sleep**: Susuwatari won't sleep if music/audio is above the minimum volume threshold
- **Smart Wake-Up**: Automatically wake up when volume increases or when outside sleep hours
- **Gaming-Friendly**: Perfect for night gaming sessions - loud game audio keeps sprites awake and reactive
- **Ambient-Compatible**: Allows sleep during quiet ambient music or low system sounds
- **Real-Time Monitoring**: Continuously monitors audio levels for instant wake-up when music starts

### Special Mouse Effects
- **Dizziness Effect**: Rapidly move mouse in circles around a Susuwatari to make it dizzy with spinning eyes
- **Zigzag Scatter Effect**: Make quick zigzag movements away from all Susuwatari to trigger a dramatic scatter effect that randomly repositions all sprites across the screen

### Visual Effects
- **Spiky Shape**: Each Susuwatari has a unique shape with 75-120 spikes that react to music
- **Unique Rotation**: Each sprite has its own fixed rotation angle, creating diverse visual patterns
- **Audio-Reactive Spikes**: Spikes that pulse and move to the beat of your music
- **Expressive Eyes**: Pupils that follow the mouse and dilate based on mouse proximity (closer mouse = more scared expression)
- **Blinking System**: Randomly blink between 3-10 seconds
- **Soot Trails**: Leave dark trails when moving
- **Smoke Explosion**: When disappearing, explode into smoke particles
- **Permanent Stains**: Leave soot stains for 10 seconds where they disappeared

### Physics & Collision System
- **Automatic Collection**: Susuwatari automatically collect coal and colored stars when they touch them
- **Explosive Coal**: When coal is larger than the Susuwatari, it explodes the sprite into dust
- **Physical Obstacles**: Shoes act as solid obstacles that Susuwatari bounce off
- **Directional Collision Physics**: Smart collision system where moving Susuwatari push stationary ones, and larger sprites push smaller ones when both are moving
- **Momentum Transfer**: Pushed Susuwatari receive momentum and continue moving in the direction they were pushed
- **Enhanced Visual Effects**: Collision points produce particle effects that vary based on collision type and intensity
- **Smart Collision Response**: Different behaviors for different collectible types
- **Safe Spawning**: New sprites and collectibles are created in safe positions without overlapping
- **Boundary Awareness**: All objects respect canvas boundaries and stay within screen limits

### Sleep System Examples 💡
**Scenario 1: Night Gaming**
- Sleep Hours: 23:00 - 07:00
- Min Volume to Keep Awake: 0.3 (30%)
- Result: During night, game audio ≥30% keeps sprites awake, quieter audio allows sleep

**Scenario 2: Sensitive to Music**
- Sleep Hours: 09:00 - 17:00  
- Min Volume to Keep Awake: 0.05 (5%)
- Result: During work, even quiet background music keeps them awake and reactive

**Scenario 3: Ignore Audio Completely**
- Sleep Hours: 22:00 - 06:00
- Min Volume to Keep Awake: 0.0 (0%)
- Result: Volume never affects sleep - only time and mouse activity matter

**Scenario 4: High Threshold Gaming**
- Sleep Hours: 02:00 - 08:00
- Min Volume to Keep Awake: 0.8 (80%) 
- Result: Only very loud audio keeps them awake - allows sleep during ambient sounds

**Scenario 5: Always Audio-Reactive**
- Sleep Hours: 22:00 - 06:00
- Min Volume to Keep Awake: 0.01 (1%)
- Result: Any detectable audio keeps sprites awake and dancing to the beat

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

#### Sleep Time Start (24h format)
- **Type**: Text Input
- **Default**: "22:00"
- **Description**: Start time for sleep period in 24-hour format (HH:MM). Susuwatari will only fall asleep during the configured time window.

#### Sleep Time End (24h format)
- **Type**: Text Input
- **Default**: "06:00"
- **Description**: End time for sleep period in 24-hour format (HH:MM). Supports overnight periods (e.g., 22:00 to 06:00 means sleep from 10 PM to 6 AM).

#### Sleep Timeout (seconds)
- **Type**: Slider
- **Range**: 3 - 60 seconds
- **Default**: 10 seconds
- **Description**: Time before Susuwatari fall asleep when mouse cursor is inactive AND current time is within the configured sleep period AND audio volume is below minimum threshold.

#### Min Volume to Keep Awake
- **Type**: Slider
- **Range**: 0.0 - 1.0 (0% - 100%)
- **Default**: 0.1 (10%)
- **Description**: Minimum audio volume required to keep Susuwatari awake during sleep hours. If current volume is AT OR ABOVE this threshold, they stay awake. If volume is below, they can sleep. Set to 0.0 (0%) to ignore volume completely, or 1.0 (100%) to require maximum volume to stay awake. Perfect for customizing sensitivity to music/gaming audio!

#### Rest Timeout When Dizzy
- **Type**: Slider
- **Range**: 2 - 15 seconds
- **Default**: 5 seconds
- **Description**: Time Susuwatari rest when they become dizzy from rapid mouse movement

#### Zigzag Effect Min Distance
- **Type**: Slider
- **Range**: 50 - 400px
- **Default**: 150px
- **Description**: Minimum distance from Susuwatari required to trigger zigzag scatter effect. Make quick zigzag movements away from all sprites (farther than this distance) to trigger the effect.

#### Background Image URL 
- **Type**: Text Input
- **Default**: Empty
- **Description**: Enter a URL to a background image (e.g., https://example.com/image.jpg). Only web URLs (http:// or https://) are accepted. For local files, use the FilePicker (Wallpaper Engine) or Folder Dropdown (Lively Wallpaper). When empty, uses the default blue gradient.

#### Background Image File
- **Type**: FilePicker
- **Default**: None
- **Supported Formats**: JPG, PNG, JPEG, GIF, BMP, WebP
- **Description**: Select a background image from the backgrounds folder or use the file picker to add new images. This control automatically scans the backgrounds folder and provides easy access to your custom images. Has higher priority than the URL/Path input when both are set.

#### Eye Dilation Intensity
- **Type**: Slider
- **Range**: 1 - 10x
- **Default**: 1x
- **Description**: Controls how much the Susuwatari eyes dilate when the mouse approaches. Higher values create more dramatic "scared" eye expressions.

## Installation Instructions

### Wallpaper Engine (Steam)
1. Subscribe to the wallpaper on [Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=3587855531)
2. Apply the wallpaper from Wallpaper Engine's interface

### Lively Wallpaper (Free Alternative)
1. [Download](https://zonaro.github.io/susuwatari)
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

## Collectible Items

### Coal Stones 🪨
- **Behavior**: Automatically collected when Susuwatari touch them
- **Size Variation**: 50% to 150% of average Susuwatari size
- **Special Effect**: Large coal (bigger than Susuwatari) causes explosion and destroys the sprite
- **Visual**: Black irregular shape with realistic coal texture
- **Interaction**: Click to split into two smaller pieces

### Colored Stars ⭐
- **Behavior**: Automatically collected when Susuwatari touch them
- **Size**: Always smaller than Susuwatari (30% to 90% of their size)
- **Colors**: 8 different vibrant colors (gold, pink, turquoise, tomato, lime, purple, orange, sky blue)
- **Visual**: 6-pointed star with sparkle effects and gentle pulsing
- **Interaction**: Click to change color randomly

### Shoes 👞
- **Behavior**: Physical obstacles that Susuwatari bounce off
- **Size**: Always 180% of average Susuwatari size
- **Special**: Only one shoe can exist at a time, all Susuwatari gather around it
- **Visual**: Realistic sandal design with detailed straps and sole
- **Interaction**: Click to remove (only way to eliminate shoes)

## Background Customization

### Wallpaper Engine:
- **Text Input Field**: Enter image URLs (http://, https://) only
- **Browse Button**: Use the file picker to select local images
- **Separate Controls**: URL field for web images, file picker for local files

### Lively Wallpaper:
- **Folder Dropdown**: Select images from the `backgrounds/` folder with visual preview
- **FilePicker Integration**: Add new images directly through the folder dropdown interface
- **URL Input**: Alternative text input for web image URLs only (http://, https://)
- **Automatic Scanning**: The dropdown automatically scans the backgrounds folder for supported images
- **Priority System**: Folder dropdown takes priority over URL input when both are set

### All Platforms:
- **Supported Formats**: JPEG, PNG, BMP, GIF, SVG, WebP
- **URL Support**: Direct links to online images (https://example.com/image.jpg) via text input
- **Local Files**: Via file pickers and folder dropdown only (no manual path input)
- **Default Gradient**: Beautiful blue gradient when no image is specified

### How to Add Custom Backgrounds (Lively Wallpaper):
1. **Copy images** to the `backgrounds/` folder in the wallpaper directory
2. **Use the dropdown** to select from available images
3. **Or use FilePicker** to browse and automatically copy new images to the folder
4. **Supported formats**: JPG, PNG, JPEG, GIF, BMP, WebP

### Tips:
- **High-resolution recommended**: Images look better with moving particles
- **Light backgrounds preferred**: Ensure Susuwatari remain visible against the background
- **Online images**: Must be accessible via direct URL (some sites block hotlinking)
- **Organization**: Use descriptive filenames for easier selection in dropdown
- **URL validation**: Text input only accepts valid web URLs (http://, https://)

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
