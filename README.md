# Susuwatari - Interactive Audio-Reactive Wallpaper Engine Wallpaper

An interactive implementation of the famous Susuwatari (soot sprites) from Studio Ghibli films, especially "Spirited Away" and "My Neighbor Totoro", optimized for Wallpaper Engine with audio-reactive features.

## Install from Steam Workshop
[Open Steam Workshop](https://steamcommunity.com/sharedfiles/filedetails/?id=3587855531)



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
- **Type**: Toggle (On/Off)
- **Default**: On
- **Description**: Master toggle to enable or disable all audio visualization effects. When turned off, completely disables spike reactivity, bass pulsing, and audio-reactive rotation, returning to a purely static visual experience.

#### Background Image
- **Type**: File Selector (Image)
- **Default**: None
- **Description**: Upload a custom background image for your wallpaper. Supports common image formats (JPEG, PNG, BMP, GIF, SVG, WebP). When an image is selected, it will be displayed as the background with cover scaling and center positioning. When no image is set, uses the default blue gradient.

## Wallpaper Engine Installation

1. Copy all files to a folder
2. Open Wallpaper Engine
3. Go to "Browse" → "Create Wallpaper"
4. Select "Web-based wallpaper"
5. Choose the `index.html` file
6. Configure properties as desired

## Interaction Controls

```
🎮 Scroll: Adjust Susuwatari size
🖱️ Left Click: Add (empty area) / Remove (on Susuwatari)
🖱️ Right Click: Show/hide UI information
```

## Background Customization Tips

- **For best results with custom images**: Use high-resolution images that look good with moving particles
- **Dark backgrounds recommended**: Choose darker images to ensure Susuwatari remain visible
- **Image formats supported**: JPEG, PNG, BMP, GIF, SVG, WebP
- **Default gradient**: Beautiful blue gradient is used when no custom image is selected

## Project Structure

```
├── index.html          # Main page with WE properties
├── susuwatari.js       # JavaScript logic for the sprites
├── project.json        # Wallpaper Engine configuration
└── README.md          # This file
```

## Technologies Used

- **HTML5 Canvas**: High performance rendering
- **JavaScript ES6+**: Physics and interaction logic
- **Wallpaper Engine API**: Integration with customizable properties
- **Wallpaper Engine Audio API**: Real-time audio processing for music reactivity

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
