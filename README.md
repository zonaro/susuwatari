# Susuwatari - Interactive Wallpaper Engine Wallpaper

An interactive implementation of the famous Susuwatari (soot sprites) from Studio Ghibli films, especially "Spirited Away" and "My Neighbor Totoro", optimized for Wallpaper Engine.

## Features

### Basic Interactions
- **Fluid Animation**: Susuwatari move smoothly across the screen with subtle movement
- **Mouse Interaction**: When the mouse approaches, the sprites flee with realistic physics
- **Auto Regeneration**: After 2 seconds without mouse movement, new Susuwatari appear
- **Scroll for Size**: Use mouse wheel to increase/decrease Susuwatari size
- **Click to Add/Remove**: Click on empty area to add, on a Susuwatari to remove

### Visual Effects
- **Spiky Shape**: Each Susuwatari has a unique shape with 75-120 spikes
- **Expressive Eyes**: Pupils that follow the mouse and dilate when scared
- **Blinking System**: Randomly blink between 3-10 seconds
- **Soot Trails**: Leave dark trails when moving
- **Smoke Explosion**: When disappearing, explode into smoke particles
- **Permanent Stains**: Leave soot stains for 10 seconds where they disappeared

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

## Performance

- **60+ FPS**: Optimized for smooth rendering
- **Canvas 2D**: Much more efficient than DOM manipulation
- **Auto-cleanup**: Automatically removes off-screen particles
- **Memory management**: Intelligent particle control

## Inspiration

This project was inspired by the adorable Susuwatari from Studio Ghibli films, magical creatures that live in abandoned houses and flee when disturbed, but return when everything is quiet again.

## License

Open source project for educational and entertainment purposes.