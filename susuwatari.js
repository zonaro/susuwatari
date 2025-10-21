class SusuwatariCanvas {
    constructor() {
        this.canvas = document.getElementById('susuwatari-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseMove = Date.now();
        this.isMouseStill = false;
        this.mouseStillTimeout = null;

        // Wallpaper Engine customizable properties (default values)
        this.fleeDistance = 80;
        this.maxParticles = 100;
        this.particleSize = 18;
        this.fleeAcceleration = 4.0;
        this.maxRunDistance = 300; // Maximum distance before getting tired (configurable)
        this.sleepStartTime = "22:00"; // Sleep time start (24h format)
        this.sleepEndTime = "06:00"; // Sleep time end (24h format) 
        this.sleepTimeout = 10; // Time in seconds before Susuwatari fall asleep when mouse is still during sleep hours
        this.minVolumeToKeepAwake = 0.1; // Minimum audio volume required to keep Susuwatari awake (0.0 to 1.0)
        this.restTimeout = 5; // Time in seconds to rest when dizzy/tired (configurable)
        this.zigzagMinDistance = 150; // Minimum distance for zigzag effect (configurable)

        // Limits for manual interaction
        this.minSize = 10;
        this.maxSize = 150;

        // Smoke particle system for explosions
        this.smokeParticles = [];

        // Soot trail system
        this.trailParticles = [];

        // Permanent soot stain system
        this.sootStains = [];

        // Collectibles system (coal stones and colored stars)
        this.collectibles = [];

        // Performance tracking
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.fps = 0;

        // Audio reactive system
        this.audioData = new Array(128).fill(0);
        this.smoothedAudioData = new Array(128).fill(0);
        this.audioSmoothingFactor = 0.5; // Reduced for more responsive bass (was 0.7)
        this.audioIntensity = 1.0; // Multiplier for audio effect intensity
        this.bassPulseIntensity = 1.0; // Multiplier for bass pulse effect on size
        this.audioVisualizationEnabled = true; // Toggle for audio visualization

        // Background image system
        this.backgroundImageUrl = ''; // Stores the base64 data URL for the background image

        // Mouse movement tracking for dizziness detection
        this.mouseHistory = []; // Track recent mouse positions
        this.maxMouseHistoryLength = 20; // Keep last 20 positions (increased from 10)

        // Zigzag detection system
        this.zigzagHistory = []; // Track mouse positions for zigzag detection
        this.lastZigzagTime = 0; // Time of last zigzag effect
        this.zigzagCooldown = 3000; // 3 seconds cooldown between zigzag effects

        // Shoe image for rendering
        this.shoeImage = new Image();
        this.shoeImageLoaded = false;
        this.loadShoeImage();

        this.init();
    }

    // Load the shoe image
    loadShoeImage() {
        this.shoeImage.onload = () => {
            this.shoeImageLoaded = true;
            console.log('Shoe image loaded successfully');
        };
        this.shoeImage.onerror = () => {
            console.error('Failed to load shoe image');
            this.shoeImageLoaded = false;
        };
        this.shoeImage.src = 'shoes.png';
    }

    // Convert file to base64 data URL
    async fileToBase64DataURL(filePath) {
        return new Promise((resolve, reject) => {
            // Create an image element to load the file
            const img = new Image();

            img.onload = () => {
                try {
                    // Create a canvas to convert the image to base64
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');

                    // Set canvas dimensions to match image
                    canvas.width = img.naturalWidth;
                    canvas.height = img.naturalHeight;

                    // Draw the image on the canvas
                    ctx.drawImage(img, 0, 0);

                    // Convert canvas to base64 data URL
                    const dataURL = canvas.toDataURL('image/png', 0.9);
                    console.log('Successfully converted image to base64 data URL, size:', dataURL.length);
                    resolve(dataURL);
                } catch (error) {
                    console.error('Error converting image to base64:', error);
                    reject(error);
                }
            };

            img.onerror = (error) => {
                console.error('Error loading image for base64 conversion:', error);
                reject(new Error(`Failed to load image: ${filePath}`));
            };

            // Set CORS if needed and load the image
            img.crossOrigin = 'anonymous';
            img.src = filePath;
        });
    }

    // Update background image URL property with base64 data
    updateBackgroundImageUrlProperty(dataURL) {
        // Store in internal property for immediate use
        this.backgroundImageUrl = dataURL;

        // Update the property depending on the wallpaper engine
        if (isWallpaperEngine) {
            // For Wallpaper Engine, trigger property update
            const properties = {
                background_image: { value: dataURL }
            };

            // Apply the properties to update the UI
            this.applyUserProperties(properties);

            console.log('Updated Wallpaper Engine backgroundImageUrl property with base64 data');
        } else if (isLivelyWallpaper) {
            // For Lively Wallpaper, call the listener directly
            livelyPropertyListener('backgroundImageUrl', dataURL);
            console.log('Updated Lively Wallpaper backgroundImageUrl property with base64 data');
        }
    }

    // Check if current time is within sleep hours
    isWithinSleepHours() {
        const now = new Date();
        const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes since midnight

        // Parse sleep start and end times
        const parseTime = (timeStr) => {
            const [hours, minutes] = timeStr.split(':').map(Number);
            return hours * 60 + minutes;
        };

        const sleepStart = parseTime(this.sleepStartTime);
        const sleepEnd = parseTime(this.sleepEndTime);

        // Handle overnight sleep periods (e.g., 22:00 to 06:00)
        if (sleepStart > sleepEnd) {
            // Sleep period crosses midnight
            return currentTime >= sleepStart || currentTime <= sleepEnd;
        } else {
            // Sleep period within same day
            return currentTime >= sleepStart && currentTime <= sleepEnd;
        }
    }

    // Get current audio volume level (0.0 to 1.0)
    getCurrentAudioVolume() {
        if (!this.audioVisualizationEnabled || !this.smoothedAudioData) {
            return 0.0;
        }

        // Calculate RMS (Root Mean Square) for overall volume
        let sum = 0;
        for (let i = 0; i < this.smoothedAudioData.length; i++) {
            sum += this.smoothedAudioData[i] * this.smoothedAudioData[i];
        }
        const rms = Math.sqrt(sum / this.smoothedAudioData.length);

        // Apply some smoothing and normalization
        return Math.min(rms * 2.0, 1.0); // Multiply by 2 for better sensitivity, cap at 1.0
    }

    wallpaperAudioListener(audioArray) {
        // Update raw audio data
        for (let i = 0; i < audioArray.length; i++) {
            // Limit audio values to prevent spikes above 1.0
            this.audioData[i] = Math.min(audioArray[i], 1.0);
        }

        // Apply smoothing to prevent erratic movement
        for (let i = 0; i < this.audioData.length; i++) {
            this.smoothedAudioData[i] =
                this.smoothedAudioData[i] * this.audioSmoothingFactor +
                this.audioData[i] * (1 - this.audioSmoothingFactor);
        }
    }

    // Get bass-reactive size multiplier for eye pulsing effect
    getBassPulseMultiplier(particle = null) {
        // Return 1.0 (no effect) if audio visualization is disabled
        if (!this.audioVisualizationEnabled) {
            return 1.0;
        }

        // Dizzy Susuwatari don't react to audio
        if (particle && particle.isDizzy) {
            return 1.0;
        }

        // Focus on bass frequencies (0-15 for deep bass only)
        let maxBassLevel = 0;
        const bassChannels = 16; // Focus on deepest bass frequencies

        // Sample bass from both left and right channels - find the peak
        for (let i = 0; i < bassChannels; i++) {
            const leftBass = this.smoothedAudioData[i] || 0;
            const rightBass = this.smoothedAudioData[i + 64] || 0;
            const peakBass = Math.max(leftBass, rightBass);
            if (peakBass > maxBassLevel) {
                maxBassLevel = peakBass;
            }
        }

        // Apply intensity multiplier and create eye-appropriate pulse effect
        const pulseEffect = maxBassLevel * this.bassPulseIntensity;

        // Return multiplier with moderate effect for eyes: 1.0 (normal) + pulse effect (max +60%)
        const multiplier = 1.0 + (pulseEffect * 0.6); // Eyes grow up to 1.6x size with strong bass

        return multiplier;
    }    // Get audio-reactive spike multiplier for a specific spike index
    getAudioSpikeMultiplier(spikeIndex, totalSpikes, particle = null) {
        // Return 1.0 (no effect) if audio visualization is disabled
        if (!this.audioVisualizationEnabled) {
            return 1.0;
        }

        // Dizzy Susuwatari don't react to audio
        if (particle && particle.isDizzy) {
            return 1.0;
        }

        // Map spike index to audio frequency range
        const frequencyRatio = spikeIndex / totalSpikes;

        // Different frequency ranges for different visual effects
        let audioIndex, channelWeight;

        if (frequencyRatio < 0.3) {
            // Bass frequencies (0-19) - strongest effect on first 30% of spikes
            audioIndex = Math.floor(frequencyRatio * 64);
            channelWeight = 1.5; // Bass hits harder
        } else if (frequencyRatio < 0.7) {
            // Mid frequencies (20-44) - moderate effect on middle 40% of spikes
            audioIndex = Math.floor(20 + (frequencyRatio - 0.3) * 62.5);
            channelWeight = 1.0;
        } else {
            // High frequencies (45-63) - subtle effect on last 30% of spikes
            audioIndex = Math.floor(45 + (frequencyRatio - 0.7) * 60);
            channelWeight = 0.8; // Treble is more subtle
        }

        // Ensure audioIndex is within bounds
        audioIndex = Math.min(Math.max(audioIndex, 0), 63);

        // Use both left and right channels for fuller effect
        const leftChannel = this.smoothedAudioData[audioIndex] || 0;
        const rightChannel = this.smoothedAudioData[audioIndex + 64] || 0;

        // Combine channels with weight and apply intensity multiplier
        const audioLevel = Math.max(leftChannel, rightChannel) * channelWeight * this.audioIntensity;

        // Return multiplier: 1.0 (normal) + audio effect (0-0.8 extra for bass, less for others)
        const maxEffect = frequencyRatio < 0.3 ? 0.8 : (frequencyRatio < 0.7 ? 0.5 : 0.3);
        return 1.0 + (audioLevel * maxEffect);
    }

    // Function to handle Wallpaper Engine properties
    applyUserProperties(properties) {
        console.log('SusuwatariCanvas.applyUserProperties called with:', Object.keys(properties));

        if (properties.susuwatari_size) {
            this.particleSize = properties.susuwatari_size.value;
            // Update size of all existing Susuwatari
            this.particles.forEach(particle => {
                particle.baseSize = this.particleSize;
                particle.size = this.particleSize * particle.sizeMultiplier;
            });
        }

        if (properties.susuwatari_count) {
            this.maxParticles = properties.susuwatari_count.value;
            // Adjust current quantity if needed
            if (this.particles.length > this.maxParticles) {
                this.particles.splice(this.maxParticles);
            } else if (this.particles.length < this.maxParticles) {
                const needed = this.maxParticles - this.particles.length;
                for (let i = 0; i < needed; i++) {
                    this.createParticle();
                }
            }
            this.updateUI();
        }

        if (properties.flee_distance) {
            this.fleeDistance = properties.flee_distance.value;
        }

        if (properties.flee_acceleration) {
            this.fleeAcceleration = properties.flee_acceleration.value;
        }

        if (properties.audio_intensity) {
            this.audioIntensity = properties.audio_intensity.value;
        }

        if (properties.bass_pulse_intensity) {
            this.bassPulseIntensity = properties.bass_pulse_intensity.value;
        }

        if (properties.audio_visualization_enabled) {
            this.audioVisualizationEnabled = properties.audio_visualization_enabled.value;
        }

        if (properties.max_run_distance) {
            this.maxRunDistance = properties.max_run_distance.value;
        }

        if (properties.sleep_start_time) {
            this.sleepStartTime = properties.sleep_start_time.value;
        }

        if (properties.sleep_end_time) {
            this.sleepEndTime = properties.sleep_end_time.value;
        }

        if (properties.sleep_timeout) {
            this.sleepTimeout = properties.sleep_timeout.value;
        }

        if (properties.min_volume_to_keep_awake) {
            this.minVolumeToKeepAwake = properties.min_volume_to_keep_awake.value;
        }

        if (properties.rest_timeout) {
            this.restTimeout = properties.rest_timeout.value;
        }

        if (properties.zigzag_min_distance) {
            this.zigzagMinDistance = properties.zigzag_min_distance.value;
        }

        // Background image property: Local files via FilePicker/FolderDropdown, URLs only via text input
        if (properties.background_image || properties.background_image_picker || properties.backgroundImagePicker || properties.background_image) {
            console.log('Processing background properties:', {
                background_image: properties.background_image,
                background_image_picker: properties.background_image_picker,
                backgroundImagePicker: properties.backgroundImagePicker,
                background_image: properties.background_image
            });

            let imageValue = '';
            let isFileSource = false; // Track if image comes from file picker vs URL input       

            // Priority 0: Check if we already have a base64 data URL (backgroundImageUrl)
            if (properties.background_image && properties.background_image.value && properties.background_image.value.trim() !== '') {
                const dataURLValue = properties.background_image.value.trim();
                if (dataURLValue.startsWith('data:')) {
                    console.log('Using existing base64 data URL from backgroundImageUrl property');
                    document.body.style.backgroundImage = `url('${dataURLValue}')`;
                    document.body.style.background = `url('${dataURLValue}') center/cover no-repeat`;
                    console.log('Background image successfully set from base64 data URL');
                    return; // Exit early, we have our background
                }
            }

            // Priority 1: Check if user used the Lively folder dropdown (backgroundImagePicker)
            if (properties.backgroundImagePicker && properties.backgroundImagePicker.value && properties.backgroundImagePicker.value.trim() !== '') {
                imageValue = properties.backgroundImagePicker.value;
                isFileSource = true;

                // For Lively Wallpaper folder dropdown, prepend the backgrounds folder path
                if (!imageValue.includes('/') && !imageValue.includes('\\')) {
                    imageValue = `backgrounds/${imageValue}`;
                }
                console.log('Using Lively folder dropdown image:', imageValue);
            }
            // Priority 2: Check if user used the Wallpaper Engine file picker
            else if (properties.background_image_picker && properties.background_image_picker.value && properties.background_image_picker.value.trim() !== '') {
                imageValue = properties.background_image_picker.value;
                isFileSource = true;
                console.log('Using Wallpaper Engine file picker image:', imageValue);
            }
            // Priority 3: Otherwise use the text input value (URL only)
            else if (properties.background_image && properties.background_image.value && properties.background_image.value.trim() !== '') {
                const inputValue = properties.background_image.value.trim();
                // Only accept URLs (http:// or https://) in the text input
                if (inputValue.startsWith('http://') || inputValue.startsWith('https://')) {
                    imageValue = inputValue;
                    console.log('Using URL from text input:', imageValue);
                } else if (inputValue.startsWith('file:///') && isWallpaperEngine) {
                    imageValue = inputValue;
                    isFileSource = false;
                    console.log('Using local file from text input (Wallpaper Engine):', imageValue);
                } else {

                    console.warn('Text input only accepts URLs (http:// or https://). For local files, use the file picker or folder dropdown. Ignoring:', inputValue);
                    imageValue = '';
                }
            }

            if (imageValue && imageValue.trim() !== '') {

                if (isFileSource) {
                    // Check which wallpaper engine we're running on
                    console.log('Debug: isWallpaperEngine =', typeof isWallpaperEngine !== 'undefined' ? isWallpaperEngine : 'undefined');
                    console.log('Debug: isLivelyWallpaper =', typeof isLivelyWallpaper !== 'undefined' ? isLivelyWallpaper : 'undefined');

                    if (isWallpaperEngine) {
                        // Wallpaper Engine: Use file path directly with file:/// prefix
                        console.log('Wallpaper Engine: Using file path directly:', imageValue);

                        const fileUrl = 'file:///' + imageValue;

                        // Apply the background immediately using file URL
                        document.body.style.backgroundImage = `url('${fileUrl}')`;
                        document.body.style.background = `url('${fileUrl}') center/cover no-repeat`;
                        console.log('Background image successfully set from file path:', fileUrl);

                        // Update backgroundImageUrl property with the file URL
                        this.updateBackgroundImageUrlProperty(fileUrl);
                    } else {
                        // Lively Wallpaper: Convert local file to base64 data URL and save to backgroundImageUrl property
                        console.log('Lively Wallpaper: Converting local file to base64 data URL:', imageValue);

                        this.fileToBase64DataURL(imageValue)
                            .then(dataURL => {
                                console.log('File successfully converted to base64, updating backgroundImageUrl property');

                                // Update the backgroundImageUrl property with the base64 data
                                this.updateBackgroundImageUrlProperty(dataURL);

                                // Apply the background immediately
                                document.body.style.backgroundImage = `url('${dataURL}')`;
                                document.body.style.background = `url('${dataURL}') center/cover no-repeat`;
                                console.log('Background image successfully set from converted base64 data');
                            })
                            .catch(error => {
                                alert('Error converting file to base64 data URL. Check console for details.');
                                console.error('Failed to convert file to base64:', error);
                                // Fallback to original file path
                                document.body.style.backgroundImage = `url('${imageValue}')`;
                                document.body.style.background = `url('${imageValue}') center/cover no-repeat`;
                                console.log('Using fallback file path for background:', imageValue);
                            });
                    }

                } else {
                    // Handle URLs from text input (already validated to be http:// or https://)
                    // For URLs, always use direct URL (no base64 conversion needed)
                    console.log('Using web URL directly:', imageValue);

                    // Apply the background immediately using URL
                    document.body.style.backgroundImage = `url('${imageValue}')`;
                    document.body.style.background = `url('${imageValue}') center/cover no-repeat`;
                    console.log('Background image successfully set from web URL');

                    // Update backgroundImageUrl property with the URL
                    this.updateBackgroundImageUrlProperty(imageValue);
                }
            } else {
                // No image selected, use default gradient
                document.body.style.backgroundImage = '';
                document.body.style.background = 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)';
                console.log('Background image cleared, using default gradient');
            }
        }
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.createInitialParticles();
        this.animate();
    }

    setupCanvas() {
        this.resizeCanvas();
        // Configure context for better performance
        this.ctx.imageSmoothingEnabled = true;
        this.ctx.imageSmoothingQuality = 'high';
    }

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    }

    setupEventListeners() {
        // Mouse movement
        this.canvas.addEventListener('mousemove', (e) => {
            const currentTime = Date.now();
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.lastMouseMove = currentTime;
            this.isMouseStill = false;

            // Add current position to mouse history
            this.mouseHistory.push({
                x: this.mouseX,
                y: this.mouseY,
                time: currentTime
            });

            // Keep only recent history (last 1000ms for more data)
            this.mouseHistory = this.mouseHistory.filter(pos => currentTime - pos.time < 1000);

            // Add current position to zigzag history
            this.zigzagHistory.push({
                x: this.mouseX,
                y: this.mouseY,
                time: currentTime
            });

            // Keep only recent zigzag history (last 2000ms)
            this.zigzagHistory = this.zigzagHistory.filter(pos => currentTime - pos.time < 2000);

            // Check for zigzag pattern
            this.checkForZigzag();

            // Check for dizziness-inducing rapid movement around Susuwatari
            this.checkForDizziness();

            // Wake up all sleeping Susuwatari when mouse moves (only during sleep hours when volume allows sleep)
            if (this.isWithinSleepHours() && this.getCurrentAudioVolume() < this.minVolumeToKeepAwake) {
                this.particles.forEach(particle => {
                    if (particle.isSleeping) {
                        particle.isSleeping = false;
                        particle.zzz = []; // Clear sleep animation
                    }
                });
            }

            if (this.mouseStillTimeout) {
                clearTimeout(this.mouseStillTimeout);
            }

            this.mouseStillTimeout = setTimeout(() => {
                this.isMouseStill = true;
                this.refillScreen();
            }, 2000);

            this.checkParticleCollisions();
        });

        // Scroll for size control
        this.canvas.addEventListener('wheel', (e) => {
            e.preventDefault();

            if (e.deltaY < 0) {
                this.particleSize = Math.min(this.maxSize, this.particleSize + 1);
            } else {
                this.particleSize = Math.max(this.minSize, this.particleSize - 1);
            }

            // Update size of all existing Susuwatari
            this.particles.forEach(particle => {
                particle.baseSize = this.particleSize;
                particle.size = this.particleSize * particle.sizeMultiplier;
            });
        });


        this.canvas.addEventListener("dblclick", (e) => {
            e.preventDefault();
            this.createCollectible(e.clientX, e.clientY);


        });
        // Left click - add particle
        this.canvas.addEventListener('click', (e) => {
            // Check if there is a susuwatari at the clicked location (considering spiky shape)
            const clickedIndex = this.particles.findIndex(particle => {
                const dx = e.clientX - particle.x;
                const dy = e.clientY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                // Use a slightly larger radius to compensate for the spiky shape
                return distance < (particle.size / 2) * 1.2;
            });

            // Check if there is a collectible at the clicked location
            const clickedCollectibleIndex = this.collectibles.findIndex(collectible => {
                const dx = e.clientX - collectible.x;
                const dy = e.clientY - collectible.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                return distance < collectible.size / 2;
            });

            if (e.ctrlKey && e.shiftKey) {
                this.createParticle(e.clientX, e.clientY);
            } else if (e.ctrlKey) {
                this.createCollectible(e.clientX, e.clientY, 'shoe');
            } else if (e.shiftKey) {
                this.createCollectible(e.clientX, e.clientY, 'star');
            } else if (e.altKey) {
                this.createCollectible(e.clientX, e.clientY, 'coal');
            } else if (clickedCollectibleIndex !== -1) {
                // Handle collectible click
                this.handleCollectibleClick(clickedCollectibleIndex, e.clientX, e.clientY);
            } else {
                // If a Susuwatari was clicked, remove it. If there is no susuwatari, create a new one
                if (clickedIndex !== -1) {
                    const removedParticle = this.particles[clickedIndex];
                    this.createSmokeExplosion(removedParticle.x, removedParticle.y, removedParticle.size);
                    this.createSootStain(removedParticle.x, removedParticle.y, removedParticle.size);
                    this.particles.splice(clickedIndex, 1);
                    this.updateUI();
                } else {
                    if (Math.random() < .20) // 20% chance to add a Susuwatari
                    {
                        this.createParticle(e.clientX, e.clientY);
                    }
                    else {
                        this.createCollectible(e.clientX, e.clientY);

                    }
                }
            }

        });





        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    createParticle(x = null, y = null) {
        let posX = x !== null ? x : Math.random() * this.canvas.width;
        let posY = y !== null ? y : Math.random() * this.canvas.height;

        // Create size variation: between 85% and 115% of base size
        const sizeVariation = 0.85 + Math.random() * 0.3; // 0.85 to 1.15
        const particleSize = this.particleSize * sizeVariation;

        // If specific coordinates provided, find a safe position nearby
        if (x !== null && y !== null) {
            let attempts = 0;
            const maxAttempts = 15;

            while (attempts < maxAttempts) {
                let hasCollision = false;

                // Check collision with existing Susuwatari
                for (let particle of this.particles) {
                    const dx = posX - particle.x;
                    const dy = posY - particle.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = (particleSize + particle.size) / 2 + 15; // Buffer for creation

                    if (distance < minDistance) {
                        hasCollision = true;
                        break;
                    }
                }

                // Check collision with collectibles
                if (!hasCollision) {
                    for (let collectible of this.collectibles) {
                        const dx = posX - collectible.x;
                        const dy = posY - collectible.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const minDistance = (particleSize + collectible.size) / 2 + 15; // Buffer for creation

                        if (distance < minDistance) {
                            hasCollision = true;
                            break;
                        }
                    }
                }

                if (!hasCollision) {
                    break; // Found safe position
                }

                // Try a new position nearby
                const offsetRadius = 30 + (attempts * 5);
                const angle = Math.random() * Math.PI * 2;
                posX = Math.max(particleSize / 2, Math.min(this.canvas.width - particleSize / 2,
                    x + Math.cos(angle) * offsetRadius));
                posY = Math.max(particleSize / 2, Math.min(this.canvas.height - particleSize / 2,
                    y + Math.sin(angle) * offsetRadius));

                attempts++;
            }
        }

        // Generate unique spiky shape for each Susuwatari
        const spikes = 75 + Math.floor(Math.random() * 45); // 75-120 spikes (3x mais)
        const spikePattern = [];
        for (let i = 0; i < spikes; i++) {
            const isOuter = i % 2 === 0;
            const radiusMultiplier = isOuter ?
                (0.85 + Math.random() * 0.3) : // Outer spikes: 85-115%
                (0.45 + Math.random() * 0.25); // Inner valleys: 45-70%
            spikePattern.push(radiusMultiplier);
        }

        const particle = {
            x: posX,
            y: posY,
            originalX: posX,
            originalY: posY,
            baseSize: this.particleSize, // Base size
            sizeMultiplier: sizeVariation, // Unique multiplier for this Susuwatari
            size: particleSize, // Final size with variation
            spikeCount: spikes, // Unique number of spikes
            spikePattern: spikePattern, // Unique spike pattern
            rotation: Math.random() * Math.PI * 2, // Unique fixed rotation for each Susuwatari (0 to 2π)
            isFleeing: false,
            fleeStartTime: 0,
            wobbleOffset: Math.random() * Math.PI * 2,

            // Continuous fleeing system
            isTired: false,
            tiredUntil: 0, // Time when tiredness ends
            energy: 1.0, // Energy level (1.0 = full energy, 0.0 = exhausted)
            maxRunTime: 3000 + Math.random() * 4000, // Can run for 3-7 seconds before getting tired
            restTime: 2000 + Math.random() * 3000, // Rest for 2-5 seconds when tired

            // Distance tracking system
            totalDistanceTraveled: 0, // Total distance traveled while fleeing
            lastPosition: { x: posX, y: posY }, // Track previous position for distance calculation

            // Movement animation properties
            targetX: posX, // Initialize target to current position
            targetY: posY,
            velocityX: 0,
            velocityY: 0,
            fleeSpeed: 0.06, // Increased speed for more responsive but still smooth movement

            // Sleep system
            isSleeping: false,
            sleepStartTime: 0,
            zzz: [], // Array of Z's for sleep animation

            // Dizziness system
            isDizzy: false,
            dizzyStartTime: 0,
            dizzyUntil: 0, // Time when dizziness ends
            dizzinessLevel: 0, // How dizzy (0-1, affects wobble intensity)
            lastDizzyTime: 0, // Last time this particle was made dizzy (for cooldown)

            // Collectible targeting system
            targetCollectible: null, // Which collectible this Susuwatari is going towards
            isSeekingCollectible: false, // Whether actively seeking a collectible

            // Eye properties
            leftPupilX: 0,
            leftPupilY: 0,
            rightPupilX: 0,
            rightPupilY: 0,

            // Blinking properties
            isBlinking: false,
            nextBlinkTime: Date.now() + this.getRandomBlinkInterval(),
            blinkDuration: 150,
            eyeOpacity: 1
        };

        this.particles.push(particle);
        this.updateUI();
        return particle;
    }

    createCollectible(x, y, type) {
        // Randomly choose between coal stone (33%), colored star (33%), or shoe (33%)
        if (type === undefined) {
            const rand = Math.random();
            if (rand < 0.20) {
                type = 'shoe';
            } else if (rand < 0.50) {
                type = 'star';
            } else {
                type = 'coal';
            }
        }

        // Check if we already have 1 shoe on screen
        const existingShoes = this.collectibles.filter(c => c.type === 'shoe');
        if (type === 'shoe' && existingShoes.length >= 1) {
            // Remove existing shoe when creating a new one (only 1 shoe at a time)
            existingShoes.forEach((shoe, index) => {
                const shoeIndex = this.collectibles.indexOf(shoe);
                if (shoeIndex > -1) {
                    // Reset Susuwatari that were targeting the old shoe
                    this.particles.forEach(particle => {
                        if (particle.targetCollectible === shoe) {
                            particle.targetCollectible = null;
                            particle.isSeekingCollectible = false;
                        }
                    });
                    this.collectibles.splice(shoeIndex, 1);
                }
            });
        }

        // Get average Susuwatari size for scaling
        const avgSusuwatariSize = this.particles.length > 0 ?
            this.particles.reduce((sum, p) => sum + p.size, 0) / this.particles.length :
            this.initialSize;

        let collectibleSize;
        if (type === 'coal') {
            // Coal: 50% to 150% of Susuwatari size
            const sizeMultiplier = 0.5 + Math.random() * 1.0; // 0.5 to 1.5
            collectibleSize = avgSusuwatariSize * sizeMultiplier;
        } else if (type === 'star') {
            // Stars: ALWAYS smaller than Susuwatari (30% to 90%)
            const sizeMultiplier = 0.3 + Math.random() * 0.6; // 0.3 to 0.9
            collectibleSize = avgSusuwatariSize * sizeMultiplier;
        } else { // shoe
            // Shoes:  180% of Susuwatari size
            const sizeMultiplier = 1.8;
            collectibleSize = avgSusuwatariSize * sizeMultiplier;
        }

        // Find a safe position that doesn't collide with existing Susuwatari and collectibles
        let safeX = x;
        let safeY = y;
        let attempts = 0;
        const maxAttempts = 20;

        while (attempts < maxAttempts) {
            let hasCollision = false;

            // Check collision with Susuwatari
            for (let particle of this.particles) {
                const dx = safeX - particle.x;
                const dy = safeY - particle.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (collectibleSize + particle.size) / 2 + 20; // Extra buffer for creation

                if (distance < minDistance) {
                    hasCollision = true;
                    break;
                }
            }

            // Check collision with existing collectibles
            if (!hasCollision) {
                for (let existingCollectible of this.collectibles) {
                    const dx = safeX - existingCollectible.x;
                    const dy = safeY - existingCollectible.y;
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    const minDistance = (collectibleSize + existingCollectible.size) / 2 + 15; // Buffer for creation

                    if (distance < minDistance) {
                        hasCollision = true;
                        break;
                    }
                }
            }

            if (!hasCollision) {
                break; // Found safe position
            }

            // Try a new random position nearby
            const offsetRadius = 50 + (attempts * 10); // Expand search radius with attempts
            const angle = Math.random() * Math.PI * 2;
            safeX = Math.max(collectibleSize / 2, Math.min(this.canvas.width - collectibleSize / 2,
                x + Math.cos(angle) * offsetRadius));
            safeY = Math.max(collectibleSize / 2, Math.min(this.canvas.height - collectibleSize / 2,
                y + Math.sin(angle) * offsetRadius));

            attempts++;
        }

        const collectible = {
            x: safeX,
            y: safeY,
            type: type,
            size: collectibleSize,
            color: type === 'coal' ? '#111111' : (type === 'star' ? this.getRandomStarColor() : '#FFD700'), // Yellow for shoes
            rotation: type === 'shoe' ? 0 : Math.random() * Math.PI * 2, // Shoes have fixed rotation (0), others random
            createdTime: Date.now(),
            pulseOffset: Math.random() * Math.PI * 2, // For gentle pulsing animation
            sparkles: type === 'star' ? this.createSparkles() : [], // Only stars have sparkle effects
            coalShape: type === 'coal' ? this.generateCoalShape() : null, // Pre-generated coal shape
            shoeShape: type === 'shoe' ? this.generateShoeShape() : null, // Pre-generated shoe shape
            assignedTo: null, // Which Susuwatari is assigned to collect this
            isLargerThanSusuwatari: collectibleSize > avgSusuwatariSize // Flag for explosion check
        };

        this.collectibles.push(collectible);

        // Special assignment logic for shoes
        if (type === 'shoe') {
            this.assignShoeToAllSusuwatari(collectible);
        } else {
            // Regular assignment for coal and stars
            this.assignCollectibleToSusuwatari(collectible);
        }

        return collectible;
    }

    handleCollectibleClick(collectibleIndex, clickX, clickY) {
        const collectible = this.collectibles[collectibleIndex];

        if (collectible.type === 'star') {
            // Change star color
            collectible.color = this.getRandomStarColor();
        } else if (collectible.type === 'coal') {
            // Split coal into 2 pieces with 50% smaller size
            const newSize = collectible.size * 0.5;

            // Create two new coal pieces slightly offset from original position
            const offset = collectible.size * 0.3;
            this.createCollectibleAt(collectible.x - offset, collectible.y - offset, newSize, true);
            this.createCollectibleAt(collectible.x + offset, collectible.y + offset, newSize, true);

            // Remove original coal
            this.collectibles.splice(collectibleIndex, 1);
        } else if (collectible.type === 'shoe') {
            // Shoes disappear when clicked (only way to remove them)

            // Reset all Susuwatari that were seeking this shoe
            this.particles.forEach(particle => {
                if (particle.targetCollectible === collectible) {
                    particle.targetCollectible = null;
                    particle.isSeekingCollectible = false;
                }
            });

            // Create collection effect
            this.createCollectionEffect(collectible.x, collectible.y, collectible.type, collectible.color);

            // Remove the shoe
            this.collectibles.splice(collectibleIndex, 1);
        }

        // Restart collection animation - reassign collectibles to Susuwatari
        this.reassignAllCollectibles();
    }

    createCollectibleAt(x, y, size, type) {
        const avgSusuwatariSize = this.particles.length > 0 ?
            this.particles.reduce((sum, p) => sum + p.size, 0) / this.particles.length :
            this.initialSize;

        let collectibleType;
        if (type === true || type === 'coal') {
            collectibleType = 'coal';
        } else if (type === 'star') {
            collectibleType = 'star';
        } else if (type === 'shoe') {
            collectibleType = 'shoe';
        } else {
            collectibleType = 'coal'; // Default fallback
        }

        const collectible = {
            x: x,
            y: y,
            type: collectibleType,
            size: size,
            color: collectibleType === 'coal' ? '#111111' : (collectibleType === 'star' ? this.getRandomStarColor() : '#FFD700'),
            rotation: collectibleType === 'shoe' ? 0 : Math.random() * Math.PI * 2, // Shoes have fixed rotation, others random
            createdTime: Date.now(),
            pulseOffset: Math.random() * Math.PI * 2,
            sparkles: collectibleType === 'star' ? this.createSparkles() : [],
            coalShape: collectibleType === 'coal' ? this.generateCoalShape() : null,
            shoeShape: collectibleType === 'shoe' ? this.generateShoeShape() : null,
            assignedTo: null,
            isLargerThanSusuwatari: size > avgSusuwatariSize
        };

        this.collectibles.push(collectible);

        if (collectibleType === 'shoe') {
            this.assignShoeToAllSusuwatari(collectible);
        } else {
            this.assignCollectibleToSusuwatari(collectible);
        }

        return collectible;
    }

    reassignAllCollectibles() {
        // Reset all current assignments
        this.particles.forEach(particle => {
            particle.targetCollectible = null;
            particle.isSeekingCollectible = false;
        });

        this.collectibles.forEach(collectible => {
            collectible.assignedTo = null;
        });

        // First, handle shoes (they have priority and special assignment)
        const shoes = this.collectibles.filter(c => c.type === 'shoe');
        if (shoes.length > 0) {
            this.assignShoeToAllSusuwatari(shoes[0]);
        }

        // Then assign other collectibles to remaining available Susuwatari
        this.collectibles.forEach(collectible => {
            if (collectible.type !== 'shoe') {
                this.assignCollectibleToSusuwatari(collectible);
            }
        });
    }

    getRandomStarColor() {
        const colors = [
            '#FFD700', // Gold
            '#FF69B4', // Hot Pink
            '#00CED1', // Dark Turquoise
            '#FF6347', // Tomato
            '#32CD32', // Lime Green
            '#9370DB', // Medium Purple
            '#FF4500', // Orange Red
            '#00BFFF'  // Deep Sky Blue
        ];
        return colors[Math.floor(Math.random() * colors.length)];
    }

    createSparkles() {
        const sparkles = [];
        const sparkleCount = 3 + Math.floor(Math.random() * 4); // 3-6 sparkles

        for (let i = 0; i < sparkleCount; i++) {
            sparkles.push({
                offsetX: (Math.random() - 0.5) * 25, // Random position around star
                offsetY: (Math.random() - 0.5) * 25,
                size: 1 + Math.random() * 2, // Small sparkles
                phase: Math.random() * Math.PI * 2, // For twinkling animation
                speed: 0.1 + Math.random() * 0.1 // Twinkling speed
            });
        }

        return sparkles;
    }

    generateCoalShape() {
        // Generate a fixed irregular shape for coal that won't change
        const points = 6 + Math.floor(Math.random() * 3); // 6-8 points
        const shape = [];

        for (let i = 0; i < points; i++) {
            const angle = (Math.PI * 2 * i) / points;
            const radiusVariation = 0.6 + Math.random() * 0.4; // 0.6 to 1.0
            shape.push({
                angle: angle,
                radiusMultiplier: radiusVariation
            });
        }

        return shape;
    }

    generateShoeShape() {
        // Generate sandal/slipper shape exactly like in the provided image
        const shoeShape = {
            // Main sole outline - wide, rounded sandal shape
            sole: {
                points: [
                    { x: -0.48, y: 0.15 },  // Back heel rounded
                    { x: -0.5, y: 0.25 },   // Heel bottom curve
                    { x: -0.45, y: 0.4 },   // Heel side
                    { x: -0.25, y: 0.48 },  // Mid heel bottom
                    { x: 0.0, y: 0.5 },     // Center bottom
                    { x: 0.25, y: 0.48 },   // Mid front bottom
                    { x: 0.4, y: 0.4 },     // Front bottom curve
                    { x: 0.48, y: 0.25 },   // Toe tip
                    { x: 0.5, y: 0.1 },     // Toe top curve
                    { x: 0.45, y: -0.05 },  // Toe upper side
                    { x: 0.35, y: -0.15 },  // Front upper
                    { x: 0.1, y: -0.2 },    // Mid upper
                    { x: -0.1, y: -0.2 },   // Mid back upper
                    { x: -0.35, y: -0.15 }, // Back upper
                    { x: -0.45, y: -0.05 }, // Heel upper side
                    { x: -0.48, y: 0.05 }   // Back to start
                ]
            },
            // Inner sole (lighter area inside)
            innerSole: {
                points: [
                    { x: -0.35, y: 0.1 },   // Inner heel
                    { x: -0.38, y: 0.2 },   // Inner heel curve
                    { x: -0.25, y: 0.35 },  // Inner mid
                    { x: 0.0, y: 0.38 },    // Inner center
                    { x: 0.25, y: 0.35 },   // Inner front
                    { x: 0.35, y: 0.25 },   // Inner toe curve
                    { x: 0.38, y: 0.1 },    // Inner toe
                    { x: 0.35, y: -0.05 },  // Inner toe upper
                    { x: 0.2, y: -0.1 },    // Inner front upper
                    { x: -0.2, y: -0.1 },   // Inner back upper
                    { x: -0.35, y: -0.05 }  // Inner heel upper
                ]
            },
            // Foot straps (the beige/pink straps visible in the image)
            straps: [
                // Main diagonal strap across the foot
                {
                    points: [
                        { x: -0.2, y: -0.05 }, // Start at heel side
                        { x: -0.1, y: 0.1 },   // Curve over arch
                        { x: 0.1, y: 0.15 },   // Mid foot
                        { x: 0.25, y: 0.05 },  // Toward toe
                        { x: 0.3, y: -0.05 }   // End at toe area
                    ],
                    width: 0.08  // Strap thickness
                },
                // Secondary strap
                {
                    points: [
                        { x: -0.25, y: 0.05 }, // Heel area
                        { x: -0.05, y: 0.2 },  // Arch area
                        { x: 0.15, y: 0.18 },  // Front
                        { x: 0.25, y: 0.1 }    // Toe area
                    ],
                    width: 0.06  // Slightly thinner
                }
            ],
            // Sole edge highlight
            edgeHighlight: {
                points: [
                    { x: -0.4, y: 0.35 },   // Heel edge
                    { x: -0.2, y: 0.42 },   // Mid edge
                    { x: 0.0, y: 0.44 },    // Center edge
                    { x: 0.2, y: 0.42 },    // Front edge
                    { x: 0.35, y: 0.32 }    // Toe edge
                ]
            }
        };

        return shoeShape;
    }

    assignCollectibleToSusuwatari(collectible) {
        // Find available Susuwatari (not sleeping, not dizzy, not already seeking)
        const availableSusuwatari = this.particles.filter(particle =>
            !particle.isSleeping &&
            !particle.isDizzy &&
            !particle.isSeekingCollectible
        );

        if (availableSusuwatari.length > 0) {
            const randomSusuwatari = availableSusuwatari[Math.floor(Math.random() * availableSusuwatari.length)];
            randomSusuwatari.targetCollectible = collectible;
            randomSusuwatari.isSeekingCollectible = true;
            collectible.assignedTo = randomSusuwatari;
        }
    }

    assignShoeToAllSusuwatari(newShoe) {
        // Get all shoes on screen (should only be 1 now)
        const allShoes = this.collectibles.filter(c => c.type === 'shoe');

        if (allShoes.length === 0) return;

        // Reset all Susuwatari seeking collectibles first
        this.particles.forEach(particle => {
            if (particle.targetCollectible && particle.targetCollectible.type === 'shoe') {
                particle.targetCollectible = null;
                particle.isSeekingCollectible = false;
            }
        });

        // Reset shoe assignments
        allShoes.forEach(shoe => {
            shoe.assignedTo = null;
        });

        // Get available Susuwatari (not sleeping, not dizzy)
        const availableSusuwatari = this.particles.filter(particle =>
            !particle.isSleeping &&
            !particle.isDizzy
        );

        if (availableSusuwatari.length === 0) return;

        // Only one shoe: all Susuwatari go to it
        const shoe = allShoes[0];
        availableSusuwatari.forEach(particle => {
            particle.targetCollectible = shoe;
            particle.isSeekingCollectible = true;
        });
        shoe.assignedTo = availableSusuwatari; // Array of all assigned particles
    }

    reassignShoesToAllSusuwatari() {
        const allShoes = this.collectibles.filter(c => c.type === 'shoe');
        if (allShoes.length > 0) {
            // Use the first shoe to trigger reassignment of all shoes
            this.assignShoeToAllSusuwatari(allShoes[0]);
        }
    }

    createInitialParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.createParticle();
        }
    }

    getRandomBlinkInterval() {
        return (3 + Math.random() * 7) * 1000;
    }

    createSmokeExplosion(x, y, size) {
        const particleCount = 8 + Math.floor(Math.random() * 6); // 8-14 smoke particles

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount + (Math.random() - 0.5) * 0.5;
            const speed = 1 + Math.random() * 2; // Dispersion speed
            const smokeSize = size * (0.3 + Math.random() * 0.4); // 30-70% of original size

            const smokeParticle = {
                x: x,
                y: y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: smokeSize,
                opacity: 0.8,
                life: 1.0,
                decay: 0.02 + Math.random() * 0.01 // Fade speed
            };

            this.smokeParticles.push(smokeParticle);
        }
    }

    updateSmokeParticles() {
        this.smokeParticles = this.smokeParticles.filter(smoke => {
            // Update position
            smoke.x += smoke.velocityX;
            smoke.y += smoke.velocityY;

            // Apply friction
            smoke.velocityX *= 0.95;
            smoke.velocityY *= 0.95;

            // Reduce life and opacity
            smoke.life -= smoke.decay;
            smoke.opacity = smoke.life * 0.8;

            // Increase size slightly
            smoke.size += 0.2;

            // Remove if life is over
            return smoke.life > 0;
        });
    }

    drawSmokeParticles() {
        this.smokeParticles.forEach(smoke => {
            this.ctx.save();
            this.ctx.globalAlpha = smoke.opacity;

            // Smoke gradient
            const gradient = this.ctx.createRadialGradient(
                smoke.x, smoke.y, 0,
                smoke.x, smoke.y, smoke.size / 2
            );
            gradient.addColorStop(0, '#666666');
            gradient.addColorStop(0.5, '#444444');
            gradient.addColorStop(1, 'rgba(68, 68, 68, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(smoke.x, smoke.y, smoke.size / 2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    createTrailParticle(x, y, size, intensity = 1.0) {
        // Only create trail if there is significant movement
        if (Math.random() < 0.3 * intensity) { // 30% base chance, increases with intensity
            const trailParticle = {
                x: x + (Math.random() - 0.5) * size * 0.3, // Small position variation
                y: y + (Math.random() - 0.5) * size * 0.3,
                size: size * (0.1 + Math.random() * 0.15), // 10-25% of original size
                opacity: 0.4 * intensity,
                life: 1.0,
                decay: 0.008 + Math.random() * 0.007, // Fades slower than smoke
                velocityX: (Math.random() - 0.5) * 0.2, // Very subtle movement
                velocityY: (Math.random() - 0.5) * 0.2
            };

            this.trailParticles.push(trailParticle);
        }
    }

    updateTrailParticles() {
        this.trailParticles = this.trailParticles.filter(trail => {
            // Update position slightly
            trail.x += trail.velocityX;
            trail.y += trail.velocityY;

            // Apply friction
            trail.velocityX *= 0.98;
            trail.velocityY *= 0.98;

            // Reduce life and opacity
            trail.life -= trail.decay;
            trail.opacity = trail.life * 0.4;

            // Remove if life is over
            return trail.life > 0;
        });
    }

    drawTrailParticles() {
        this.trailParticles.forEach(trail => {
            this.ctx.save();
            this.ctx.globalAlpha = trail.opacity;

            // Darker soot color
            const gradient = this.ctx.createRadialGradient(
                trail.x, trail.y, 0,
                trail.x, trail.y, trail.size / 2
            );
            gradient.addColorStop(0, '#2a2a2a');
            gradient.addColorStop(0.6, '#1a1a1a');
            gradient.addColorStop(1, 'rgba(26, 26, 26, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(trail.x, trail.y, trail.size / 2, 0, Math.PI * 2);
            this.ctx.fill();

            this.ctx.restore();
        });
    }

    createSootStain(x, y, size) {
        // Create permanent soot stain at location
        const stainSize = size * (0.6 + Math.random() * 0.4); // 60-100% of original size
        const stain = {
            x: x,
            y: y,
            size: stainSize,
            opacity: 0.5 + Math.random() * 0.3, // Opacity between 50-80%
            createdAt: Date.now(),
            duration: 10000, // 10 seconds
            pattern: [] // Unique irregularity pattern
        };

        // Create irregular pattern for the stain
        const spots = 5 + Math.floor(Math.random() * 8); // 5-12 internal spots
        for (let i = 0; i < spots; i++) {
            stain.pattern.push({
                offsetX: (Math.random() - 0.5) * stainSize,
                offsetY: (Math.random() - 0.5) * stainSize,
                size: stainSize * (0.2 + Math.random() * 0.4),
                opacity: 0.3 + Math.random() * 0.4
            });
        }

        this.sootStains.push(stain);
    }

    updateSootStains() {
        const currentTime = Date.now();
        this.sootStains = this.sootStains.filter(stain => {
            const age = currentTime - stain.createdAt;

            // Fade out in the last 2 seconds
            if (age > 8000) {
                const fadeProgress = (age - 8000) / 2000; // 0 to 1 in the last 2 seconds
                stain.currentOpacity = stain.opacity * (1 - fadeProgress);
            } else {
                stain.currentOpacity = stain.opacity;
            }

            return age < stain.duration;
        });
    }

    drawSootStains() {
        this.sootStains.forEach(stain => {
            this.ctx.save();
            this.ctx.globalAlpha = stain.currentOpacity;

            // Draw main stain
            const gradient = this.ctx.createRadialGradient(
                stain.x, stain.y, 0,
                stain.x, stain.y, stain.size / 2
            );
            gradient.addColorStop(0, '#1a1a1a');
            gradient.addColorStop(0.5, '#0d0d0d');
            gradient.addColorStop(1, 'rgba(13, 13, 13, 0)');

            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(stain.x, stain.y, stain.size / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw irregular internal spots
            stain.pattern.forEach(spot => {
                this.ctx.globalAlpha = stain.currentOpacity * spot.opacity;

                const spotGradient = this.ctx.createRadialGradient(
                    stain.x + spot.offsetX, stain.y + spot.offsetY, 0,
                    stain.x + spot.offsetX, stain.y + spot.offsetY, spot.size / 2
                );
                spotGradient.addColorStop(0, '#0a0a0a');
                spotGradient.addColorStop(0.7, '#050505');
                spotGradient.addColorStop(1, 'rgba(5, 5, 5, 0)');

                this.ctx.fillStyle = spotGradient;
                this.ctx.beginPath();
                this.ctx.arc(
                    stain.x + spot.offsetX,
                    stain.y + spot.offsetY,
                    spot.size / 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            });

            this.ctx.restore();
        });
    }

    checkParticleCollisions() {
        this.particles.forEach(particle => {
            const distance = Math.sqrt(
                Math.pow(particle.x - this.mouseX, 2) +
                Math.pow(particle.y - this.mouseY, 2)
            );

            // Only flee if not tired and not dizzy and within flee distance
            if (distance < this.fleeDistance && !particle.isTired && !particle.isDizzy) {
                this.makeParticleFlee(particle);
            } else if (distance >= this.fleeDistance && particle.isFleeing && !particle.isTired && !particle.isDizzy) {
                // Stop fleeing when mouse is far enough (but only if not tired or dizzy)
                particle.isFleeing = false;
            }
        });
    }

    makeParticleFlee(particle) {
        const currentTime = Date.now();

        // Check if particle is tired and should rest
        if (particle.isTired && currentTime < particle.tiredUntil) {
            return; // Too tired to flee, ignore mouse
        }

        // If was tired but rest time is over, restore energy
        if (particle.isTired && currentTime >= particle.tiredUntil) {
            particle.isTired = false;
            particle.energy = 1.0;
            particle.fleeStartTime = currentTime; // Reset flee timer
        }

        // Start fleeing if not already fleeing
        if (!particle.isFleeing) {
            particle.isFleeing = true;
            particle.fleeStartTime = currentTime;
            particle.totalDistanceTraveled = 0; // Reset distance when starting to flee
            particle.lastPosition.x = particle.x;
            particle.lastPosition.y = particle.y;
        }

        // Check if particle has been running too long OR traveled too far and should get tired
        const runningTime = currentTime - particle.fleeStartTime;
        if ((runningTime > particle.maxRunTime || particle.totalDistanceTraveled > this.maxRunDistance) && !particle.isTired) {
            particle.isTired = true;
            particle.tiredUntil = currentTime + particle.restTime;
            particle.isFleeing = false;
            particle.energy = 0.0;
            particle.totalDistanceTraveled = 0; // Reset distance when tired
            return;
        }

        // Continue fleeing - constantly update flee direction
        const angle = Math.atan2(particle.y - this.mouseY, particle.x - this.mouseX);
        const fleeDistance = 60 + Math.random() * 40; // Smaller distance for continuous movement

        const newX = particle.x + Math.cos(angle) * fleeDistance;
        const newY = particle.y + Math.sin(angle) * fleeDistance;

        // Set target position
        particle.targetX = Math.max(particle.size / 2, Math.min(this.canvas.width - particle.size / 2, newX));
        particle.targetY = Math.max(particle.size / 2, Math.min(this.canvas.height - particle.size / 2, newY));

        // Update energy level based on running time
        particle.energy = Math.max(0.2, 1.0 - (runningTime / particle.maxRunTime));
    }

    updateParticleMovement() {
        const currentTime = Date.now();

        this.particles.forEach(particle => {
            // No continuous rotation - particles keep their initial rotation

            // Calculate distance to target
            const deltaX = particle.targetX - particle.x;
            const deltaY = particle.targetY - particle.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 0.3) { // Smaller threshold for more gradual deceleration
                // Calculate velocity towards target with acceleration/deceleration
                const baseSpeed = particle.isFleeing ? particle.fleeSpeed : particle.fleeSpeed * 0.15;

                // Apply energy factor to speed (tired particles move slower)
                const energyFactor = particle.isTired ? 0.3 : particle.energy; // Very slow when tired, proportional when running

                // Acceleration: much faster movement when far from destination
                const accelerationFactor = particle.isFleeing ?
                    Math.min(this.fleeAcceleration, 1 + distance * 0.04) : // Uses customizable property
                    Math.min(1.8, 1 + distance * 0.01);  // Acelera menos quando voltando

                // Smoother deceleration: only starts to decelerate very close to destination
                let decelerationFactor;
                if (particle.isSeekingCollectible && particle.targetCollectible) {
                    // Special deceleration for collectible seeking - minimal deceleration, only milliseconds before contact
                    const collectibleDistance = Math.sqrt(
                        Math.pow(particle.targetCollectible.x - particle.x, 2) +
                        Math.pow(particle.targetCollectible.y - particle.y, 2)
                    );
                    // Much smaller deceleration zone - only 2-3 pixels before contact
                    const collectionThreshold = particle.size / 2 + particle.targetCollectible.size + 2;

                    decelerationFactor = collectibleDistance < collectionThreshold ?
                        Math.max(0.85, collectibleDistance / collectionThreshold) : // Very minimal deceleration only at contact distance
                        1.0;
                } else {
                    // Normal deceleration for other movements
                    decelerationFactor = distance < 15 ?
                        Math.max(0.3, distance / 15) : // More gradual deceleration
                        1.0;
                }

                const finalSpeed = baseSpeed * accelerationFactor * decelerationFactor * energyFactor;

                // Calculate base movement velocity
                let velocityX = deltaX * finalSpeed;
                let velocityY = deltaY * finalSpeed;

                // Add repulsive forces from nearby shoes only (coal and stars are collected automatically)
                this.collectibles.forEach(collectible => {
                    // Only apply repulsion to shoes, not to coal/stars that should be collected
                    if (collectible.type === 'shoe' && (!particle.isSeekingCollectible || particle.targetCollectible !== collectible)) {
                        const dx = particle.x - collectible.x;
                        const dy = particle.y - collectible.y;
                        const distance = Math.sqrt(dx * dx + dy * dy);
                        const repulsionDistance = (particle.size + collectible.size) / 2 + 30; // Repulsion zone

                        if (distance < repulsionDistance && distance > 0) {
                            const repulsionStrength = (repulsionDistance - distance) / repulsionDistance;
                            const repulsionForce = repulsionStrength * 0.02; // Gentle repulsion

                            velocityX += (dx / distance) * repulsionForce;
                            velocityY += (dy / distance) * repulsionForce;
                        }
                    }
                }); particle.velocityX = velocityX;
                particle.velocityY = velocityY;

                // Calcular intensidade do movimento para o rastro
                const movementSpeed = Math.sqrt(particle.velocityX * particle.velocityX + particle.velocityY * particle.velocityY);
                const trailIntensity = Math.min(1.0, movementSpeed * 8); // Intensidade baseada na velocidade

                // Criar rastro de fuligem baseado na velocidade
                if (trailIntensity > 0.1) { // Only create trail if there is significant movement
                    this.createTrailParticle(particle.x, particle.y, particle.size, trailIntensity);
                }

                // Apply velocity to position
                const oldX = particle.x;
                const oldY = particle.y;
                particle.x += particle.velocityX;
                particle.y += particle.velocityY;

                // Track distance traveled if fleeing
                if (particle.isFleeing) {
                    const distanceMoved = Math.sqrt(
                        Math.pow(particle.x - oldX, 2) + Math.pow(particle.y - oldY, 2)
                    );
                    particle.totalDistanceTraveled += distanceMoved;
                }
            } else {
                // Snap to target if very close
                particle.x = particle.targetX;
                particle.y = particle.targetY;
                particle.velocityX = 0;
                particle.velocityY = 0;
            }

            // If not fleeing, check for collectible seeking or natural movement
            if (!particle.isFleeing && distance < 2) {
                // Prioritize collectible seeking over wobbling
                if (particle.isSeekingCollectible && particle.targetCollectible) {
                    // Move towards the collectible
                    const collectible = particle.targetCollectible;
                    const collectibleDistance = Math.sqrt(
                        Math.pow(collectible.x - particle.x, 2) +
                        Math.pow(collectible.y - particle.y, 2)
                    );

                    // Set target towards collectible if not too close
                    if (collectibleDistance > particle.size / 2 + collectible.size) {
                        particle.targetX = collectible.x;
                        particle.targetY = collectible.y;
                    }
                } else {
                    // Normal wobbling behavior
                    let wobbleAmount = 5;

                    // Increase wobble if dizzy
                    if (particle.isDizzy) {
                        wobbleAmount = 15 + (particle.dizzinessLevel * 20); // Much more erratic movement when dizzy
                    }

                    particle.targetX = particle.x + (Math.random() - 0.5) * wobbleAmount;
                    particle.targetY = particle.y + (Math.random() - 0.5) * wobbleAmount;

                    // Keep within canvas bounds
                    particle.targetX = Math.max(particle.size / 2, Math.min(this.canvas.width - particle.size / 2, particle.targetX));
                    particle.targetY = Math.max(particle.size / 2, Math.min(this.canvas.height - particle.size / 2, particle.targetY));
                }
            }
        });

        // Check and resolve collisions between Susuwatari and collectibles
        this.handleCollisions();
    }

    handleCollisions() {
        // Check collisions between Susuwatari and collectibles
        const collectiblesToRemove = [];
        const particlesToRemove = [];

        this.particles.forEach((particle, particleIndex) => {
            this.collectibles.forEach((collectible, collectibleIndex) => {
                const dx = particle.x - collectible.x;
                const dy = particle.y - collectible.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const collisionDistance = (particle.size + collectible.size) / 2 + 2; // Collision threshold

                if (distance < collisionDistance && distance > 0) {
                    // Collision detected
                    if (collectible.type === 'coal' || collectible.type === 'star') {
                        // Collect coal and star items

                        // Check if coal is larger than Susuwatari - explosion case
                        if (collectible.type === 'coal' && collectible.size > particle.size) {
                            // Create explosion effect for the Susuwatari
                            this.createSmokeExplosion(particle.x, particle.y, particle.size);
                            this.createSootStain(particle.x, particle.y, particle.size * 1.2);

                            // Mark Susuwatari for removal
                            if (!particlesToRemove.includes(particleIndex)) {
                                particlesToRemove.push(particleIndex);
                            }

                            console.log('Susuwatari exploded by large coal!');
                        } else {
                            // Normal collection - Susuwatari survives
                            console.log(`Susuwatari collected ${collectible.type}!`);
                        }

                        // Create collection effect
                        this.createCollectionEffect(collectible.x, collectible.y, collectible.type, collectible.color);

                        // Leave soot stain for coal
                        if (collectible.type === 'coal') {
                            this.createSootStain(collectible.x, collectible.y, collectible.size * 1.2);
                        }

                        // Reset any Susuwatari targeting this collectible
                        this.particles.forEach(p => {
                            if (p.targetCollectible === collectible) {
                                p.targetCollectible = null;
                                p.isSeekingCollectible = false;
                            }
                        });

                        // Mark collectible for removal
                        if (!collectiblesToRemove.includes(collectibleIndex)) {
                            collectiblesToRemove.push(collectibleIndex);
                        }

                    } else if (collectible.type === 'shoe') {
                        // Shoes act as physical obstacles - push Susuwatari away
                        const overlap = collisionDistance - distance;
                        const separationX = (dx / distance) * overlap;
                        const separationY = (dy / distance) * overlap;

                        // Move particle away from shoe
                        particle.x += separationX;
                        particle.y += separationY;

                        // Update particle's target position
                        particle.targetX = particle.x;
                        particle.targetY = particle.y;

                        // Keep particle within canvas bounds
                        particle.x = Math.max(particle.size / 2, Math.min(this.canvas.width - particle.size / 2, particle.x));
                        particle.y = Math.max(particle.size / 2, Math.min(this.canvas.height - particle.size / 2, particle.y));
                        particle.targetX = particle.x;
                        particle.targetY = particle.y;

                        // Add small visual effect at collision point
                        if (Math.random() < 0.05) { // 5% chance for small effect
                            this.createTrailParticle(
                                (particle.x + collectible.x) / 2,
                                (particle.y + collectible.y) / 2,
                                Math.min(particle.size, collectible.size) * 0.2,
                                0.3
                            );
                        }
                    }
                }
            });
        });

        // Remove collected collectibles (in reverse order to avoid index issues)
        collectiblesToRemove.sort((a, b) => b - a).forEach(index => {
            this.collectibles.splice(index, 1);
        });

        // Remove exploded Susuwatari (in reverse order to avoid index issues)
        particlesToRemove.sort((a, b) => b - a).forEach(index => {
            this.particles.splice(index, 1);
        });

        // Update UI if particles were removed
        if (particlesToRemove.length > 0) {
            this.updateUI();
        }

        // Reassign collectibles if any were collected
        if (collectiblesToRemove.length > 0) {
            this.reassignAllCollectibles();
        }

        // Check collisions between Susuwatari themselves with directional pushing logic
        for (let i = 0; i < this.particles.length; i++) {
            for (let j = i + 1; j < this.particles.length; j++) {
                const particle1 = this.particles[i];
                const particle2 = this.particles[j];

                const dx = particle1.x - particle2.x;
                const dy = particle1.y - particle2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (particle1.size + particle2.size) / 2 + 2; // Add 2px buffer

                if (distance < minDistance && distance > 0) {
                    // Calculate movement speeds to determine who is moving
                    const particle1Speed = Math.sqrt(particle1.velocityX * particle1.velocityX + particle1.velocityY * particle1.velocityY);
                    const particle2Speed = Math.sqrt(particle2.velocityX * particle2.velocityX + particle2.velocityY * particle2.velocityY);

                    // Consider particles as "moving" if speed > threshold
                    const movementThreshold = 0.1;
                    const particle1IsMoving = particle1Speed > movementThreshold;
                    const particle2IsMoving = particle2Speed > movementThreshold;

                    const overlap = minDistance - distance;
                    const separationX = (dx / distance) * overlap;
                    const separationY = (dy / distance) * overlap;

                    if (particle1IsMoving && !particle2IsMoving) {
                        // Particle1 is moving, particle2 is stationary - particle1 pushes particle2
                        particle2.x -= separationX;
                        particle2.y -= separationY;
                        particle2.targetX = particle2.x;
                        particle2.targetY = particle2.y;

                        // Create stronger pushing effect - give the pushed particle some momentum
                        particle2.velocityX = -separationX * 0.3; // Add momentum in push direction
                        particle2.velocityY = -separationY * 0.3;

                        // Add small visual effect at collision
                        if (Math.random() < 0.08) {
                            this.createTrailParticle(
                                (particle1.x + particle2.x) / 2,
                                (particle1.y + particle2.y) / 2,
                                Math.min(particle1.size, particle2.size) * 0.15,
                                0.4
                            );
                        }

                    } else if (!particle1IsMoving && particle2IsMoving) {
                        // Particle2 is moving, particle1 is stationary - particle2 pushes particle1
                        particle1.x += separationX;
                        particle1.y += separationY;
                        particle1.targetX = particle1.x;
                        particle1.targetY = particle1.y;

                        // Create stronger pushing effect - give the pushed particle some momentum
                        particle1.velocityX = separationX * 0.3; // Add momentum in push direction
                        particle1.velocityY = separationY * 0.3;

                        // Add small visual effect at collision
                        if (Math.random() < 0.08) {
                            this.createTrailParticle(
                                (particle1.x + particle2.x) / 2,
                                (particle1.y + particle2.y) / 2,
                                Math.min(particle1.size, particle2.size) * 0.15,
                                0.4
                            );
                        }

                    } else if (particle1IsMoving && particle2IsMoving) {
                        // Both are moving - larger one pushes smaller one
                        if (particle1.size > particle2.size) {
                            // Particle1 is larger - pushes particle2
                            particle2.x -= separationX * 0.8;
                            particle2.y -= separationY * 0.8;
                            particle1.x += separationX * 0.2; // Larger one moves less
                            particle1.y += separationY * 0.2;

                            // Add momentum to the smaller particle being pushed
                            particle2.velocityX += -separationX * 0.2;
                            particle2.velocityY += -separationY * 0.2;

                        } else if (particle2.size > particle1.size) {
                            // Particle2 is larger - pushes particle1
                            particle1.x += separationX * 0.8;
                            particle1.y += separationY * 0.8;
                            particle2.x -= separationX * 0.2; // Larger one moves less
                            particle2.y -= separationY * 0.2;

                            // Add momentum to the smaller particle being pushed
                            particle1.velocityX += separationX * 0.2;
                            particle1.velocityY += separationY * 0.2;

                        } else {
                            // Equal size - standard mutual separation
                            particle1.x += separationX * 0.5;
                            particle1.y += separationY * 0.5;
                            particle2.x -= separationX * 0.5;
                            particle2.y -= separationY * 0.5;
                        }

                        // Update target positions for both moving particles
                        particle1.targetX = particle1.x;
                        particle1.targetY = particle1.y;
                        particle2.targetX = particle2.x;
                        particle2.targetY = particle2.y;

                        // Enhanced collision effect for moving particles
                        if (Math.random() < 0.12) {
                            this.createTrailParticle(
                                (particle1.x + particle2.x) / 2,
                                (particle1.y + particle2.y) / 2,
                                Math.min(particle1.size, particle2.size) * 0.2,
                                0.6
                            );
                        }

                    } else {
                        // Both are stationary - gentle mutual separation (original behavior)
                        particle1.x += separationX * 0.5;
                        particle1.y += separationY * 0.5;
                        particle2.x -= separationX * 0.5;
                        particle2.y -= separationY * 0.5;

                        particle1.targetX = particle1.x;
                        particle1.targetY = particle1.y;
                        particle2.targetX = particle2.x;
                        particle2.targetY = particle2.y;
                    }

                    // Keep particles within canvas bounds
                    particle1.x = Math.max(particle1.size / 2, Math.min(this.canvas.width - particle1.size / 2, particle1.x));
                    particle1.y = Math.max(particle1.size / 2, Math.min(this.canvas.height - particle1.size / 2, particle1.y));
                    particle2.x = Math.max(particle2.size / 2, Math.min(this.canvas.width - particle2.size / 2, particle2.x));
                    particle2.y = Math.max(particle2.size / 2, Math.min(this.canvas.height - particle2.size / 2, particle2.y));

                    // Ensure target positions are also within bounds
                    particle1.targetX = Math.max(particle1.size / 2, Math.min(this.canvas.width - particle1.size / 2, particle1.targetX));
                    particle1.targetY = Math.max(particle1.size / 2, Math.min(this.canvas.height - particle1.size / 2, particle1.targetY));
                    particle2.targetX = Math.max(particle2.size / 2, Math.min(this.canvas.width - particle2.size / 2, particle2.targetX));
                    particle2.targetY = Math.max(particle2.size / 2, Math.min(this.canvas.height - particle2.size / 2, particle2.targetY));
                }
            }
        }

        // Check collisions between collectibles themselves
        for (let i = 0; i < this.collectibles.length; i++) {
            for (let j = i + 1; j < this.collectibles.length; j++) {
                const collectible1 = this.collectibles[i];
                const collectible2 = this.collectibles[j];

                const dx = collectible1.x - collectible2.x;
                const dy = collectible1.y - collectible2.y;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const minDistance = (collectible1.size + collectible2.size) / 2 + 3; // Add 3px buffer

                if (distance < minDistance && distance > 0) {
                    // Collision detected - push them apart
                    const overlap = minDistance - distance;
                    const separationX = (dx / distance) * overlap * 0.5;
                    const separationY = (dy / distance) * overlap * 0.5;

                    // Move collectibles away from each other
                    collectible1.x += separationX;
                    collectible1.y += separationY;
                    collectible2.x -= separationX;
                    collectible2.y -= separationY;

                    // Keep within canvas bounds
                    collectible1.x = Math.max(collectible1.size / 2, Math.min(this.canvas.width - collectible1.size / 2, collectible1.x));
                    collectible1.y = Math.max(collectible1.size / 2, Math.min(this.canvas.height - collectible1.size / 2, collectible1.y));
                    collectible2.x = Math.max(collectible2.size / 2, Math.min(this.canvas.width - collectible2.size / 2, collectible2.x));
                    collectible2.y = Math.max(collectible2.size / 2, Math.min(this.canvas.height - collectible2.size / 2, collectible2.y));
                }
            }
        }
    }

    updateSleepSystem() {
        const currentTime = Date.now();

        // Update dizziness system
        this.particles.forEach(particle => {
            if (particle.isDizzy) {
                // Update spiral rotation for dizzy particles
                if (particle.spiralRotation !== undefined && particle.spiralRotationSpeed !== undefined) {
                    particle.spiralRotation += particle.spiralRotationSpeed;
                    // Keep rotation within 0-2π range
                    if (particle.spiralRotation > Math.PI * 2) {
                        particle.spiralRotation -= Math.PI * 2;
                    }
                }

                // Check for recovery from dizziness
                if (currentTime > particle.dizzyUntil) {
                    // Recovery from dizziness
                    particle.isDizzy = false;
                    particle.dizzinessLevel = 0;
                    particle.isTired = false;
                    particle.energy = 1.0;
                    particle.spiralRotation = undefined; // Clear spiral rotation
                    particle.spiralRotationSpeed = undefined;
                }
            }
        });

        // Update sleep system based on time schedule and audio volume
        const isWithinSleepHours = this.isWithinSleepHours();
        const currentVolume = this.getCurrentAudioVolume();
        const shouldStayAwakeFromVolume = currentVolume >= this.minVolumeToKeepAwake;

        this.particles.forEach(particle => {
            // Don't make fleeing, tired, dizzy, or collectible-seeking particles sleep
            if (particle.isFleeing || particle.isTired || particle.isDizzy || particle.isSeekingCollectible) {
                // Wake up if outside sleep hours, volume too loud, or if actively fleeing/busy
                if (particle.isSleeping && (!isWithinSleepHours || shouldStayAwakeFromVolume ||
                    particle.isFleeing || particle.isTired || particle.isDizzy || particle.isSeekingCollectible)) {
                    particle.isSleeping = false;
                    particle.zzz = []; // Clear sleep animation
                }
                return;
            }

            // Check if particle should start sleeping (only during sleep hours, after timeout, and when volume is below threshold)
            if (!particle.isSleeping && isWithinSleepHours && !shouldStayAwakeFromVolume &&
                Date.now() - this.lastMouseMove > this.sleepTimeout * 1000) {
                particle.isSleeping = true;
                particle.sleepStartTime = Date.now();
                particle.zzz = []; // Initialize Z animation array
            }

            // Wake up particle if outside sleep hours or volume is too loud to allow sleep
            if (particle.isSleeping && (!isWithinSleepHours || shouldStayAwakeFromVolume)) {
                particle.isSleeping = false;
                particle.zzz = []; // Clear sleep animation
            }            // Update Z animation for sleeping particles
            if (particle.isSleeping && isWithinSleepHours) {
                // Add new Z every 1.5-2.5 seconds
                const timeSinceSleep = Date.now() - particle.sleepStartTime;
                const zCount = Math.floor(timeSinceSleep / 2000); // New Z every 2 seconds

                if (particle.zzz.length < zCount + 1 && particle.zzz.length < 3) {
                    particle.zzz.push({
                        x: particle.x + (Math.random() - 0.5) * 30 + particle.size * 0.3,
                        y: particle.y - particle.size * 0.5 - (particle.zzz.length * 15),
                        size: 8 + Math.random() * 4,
                        opacity: 1.0,
                        lifetime: 0
                    });
                }

                // Update existing Z's
                particle.zzz.forEach(z => {
                    z.lifetime += 16; // Assuming 60fps
                    z.y -= 0.3; // Float upward slowly
                    z.opacity = Math.max(0, 1.0 - z.lifetime / 3000); // Fade over 3 seconds
                });

                // Remove old Z's
                particle.zzz = particle.zzz.filter(z => z.opacity > 0);
            }
        });
    }

    updateCollectibles() {
        const currentTime = Date.now();

        // Update collectibles and check for collection
        this.collectibles = this.collectibles.filter(collectible => {
            // Special handling for shoes - they are NOT collected when touched, only when clicked
            if (collectible.type === 'shoe') {
                // Check if any assigned Susuwatari reached the shoe
                if (Array.isArray(collectible.assignedTo)) {
                    // Multiple Susuwatari assigned (always the case for shoes)
                    for (let i = 0; i < collectible.assignedTo.length; i++) {
                        const susuwatari = collectible.assignedTo[i];
                        const distance = Math.sqrt(
                            Math.pow(susuwatari.x - collectible.x, 2) +
                            Math.pow(susuwatari.y - collectible.y, 2)
                        );

                        const gatherDistance = collectible.size / 2 + susuwatari.size / 2 + 20; // Distance to gather around shoe

                        if (distance < gatherDistance) {
                            // Susuwatari is close enough - position them around the shoe in a circle
                            const angle = Math.atan2(susuwatari.y - collectible.y, susuwatari.x - collectible.x);
                            const targetDistance = collectible.size / 2 + susuwatari.size / 2 + 10; // Desired distance from shoe center

                            const targetX = collectible.x + Math.cos(angle) * targetDistance;
                            const targetY = collectible.y + Math.sin(angle) * targetDistance;

                            // Set new target position around the shoe
                            susuwatari.targetX = Math.max(susuwatari.size / 2, Math.min(this.canvas.width - susuwatari.size / 2, targetX));
                            susuwatari.targetY = Math.max(susuwatari.size / 2, Math.min(this.canvas.height - susuwatari.size / 2, targetY));

                            // Don't stop seeking - keep them gathered around the shoe
                            // Create small effect to show they're gathered
                            if (Math.random() < 0.02) { // Occasional sparkle effect
                                this.createTrailParticle(susuwatari.x, susuwatari.y, susuwatari.size * 0.2, 0.3);
                            }
                        }
                    }

                    // Check if any assigned Susuwatari became unavailable
                    const stillAvailable = collectible.assignedTo.filter(susuwatari =>
                        !susuwatari.isSleeping && !susuwatari.isDizzy
                    );

                    if (stillAvailable.length !== collectible.assignedTo.length) {
                        // Some Susuwatari became unavailable, reassign all shoes
                        this.reassignShoesToAllSusuwatari();
                    }
                }
            } else {
                // Regular handling for coal and stars (single Susuwatari assignment)
                // Collection is now handled by handleCollisions() method, so we only manage assignments here
                if (collectible.assignedTo) {
                    const susuwatari = collectible.assignedTo;

                    // If Susuwatari became unavailable (sleeping, dizzy, etc.), reassign
                    if (susuwatari.isSleeping || susuwatari.isDizzy) {
                        susuwatari.targetCollectible = null;
                        susuwatari.isSeekingCollectible = false;
                        collectible.assignedTo = null;
                        this.assignCollectibleToSusuwatari(collectible);
                    }
                } else {
                    // Try to reassign if no one is assigned
                    this.assignCollectibleToSusuwatari(collectible);
                }
            }

            // Update sparkles for stars
            if (collectible.type === 'star' && collectible.sparkles) {
                collectible.sparkles.forEach(sparkle => {
                    sparkle.phase += sparkle.speed;
                });
            }

            return true; // Keep collectible
        });
    }

    createCollectionEffect(x, y, type, color) {
        // Create small particles effect when collectible is collected
        const particleCount = type === 'star' ? 8 : (type === 'shoe' ? 12 : 5);

        for (let i = 0; i < particleCount; i++) {
            const angle = (Math.PI * 2 * i) / particleCount;
            const speed = 2 + Math.random() * 3;

            this.trailParticles.push({
                x: x,
                y: y,
                velocityX: Math.cos(angle) * speed,
                velocityY: Math.sin(angle) * speed,
                size: 3 + Math.random() * 3,
                opacity: 1.0,
                color: color,
                lifetime: 0,
                maxLifetime: 1000 + Math.random() * 500 // 1-1.5 seconds
            });
        }
    }

    drawCollectibles() {
        const currentTime = Date.now();

        this.collectibles.forEach(collectible => {
            let size;

            if (collectible.type === 'coal') {
                // Coal stones don't pulse/wobble - static size
                size = collectible.size;
            } else if (collectible.type === 'shoe') {
                // Shoes are static - no pulsing
                size = collectible.size;
            } else {
                // Stars continue to pulse
                const pulseTime = (currentTime + collectible.pulseOffset) * 0.003;
                const pulseFactor = 1 + Math.sin(pulseTime) * 0.1; // Gentle pulsing
                size = collectible.size * pulseFactor;
            }

            this.ctx.save();

            if (collectible.type === 'coal') {
                // Draw coal stone with pre-generated shape and rotation
                this.ctx.fillStyle = collectible.color;
                this.ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
                this.ctx.shadowBlur = 6;

                // Use pre-generated irregular coal shape with rotation
                this.ctx.beginPath();
                collectible.coalShape.forEach((point, i) => {
                    const radius = size * point.radiusMultiplier;
                    const rotatedAngle = point.angle + collectible.rotation;
                    const x = collectible.x + Math.cos(rotatedAngle) * radius;
                    const y = collectible.y + Math.sin(rotatedAngle) * radius;

                    if (i === 0) {
                        this.ctx.moveTo(x, y);
                    } else {
                        this.ctx.lineTo(x, y);
                    }
                });
                this.ctx.closePath();
                this.ctx.fill();

            } else if (collectible.type === 'shoe') {
                // Draw shoe using the shoes.png image
                if (this.shoeImageLoaded) {
                    this.ctx.save();

                    // Add shadow/glow effect
                    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.4)';
                    this.ctx.shadowBlur = 8;
                    this.ctx.shadowOffsetX = 0;
                    this.ctx.shadowOffsetY = 0;

                    // Calculate image dimensions to fit the collectible size
                    const imageSize = size;
                    const drawWidth = imageSize;
                    const drawHeight = (imageSize * this.shoeImage.height) / this.shoeImage.width;

                    // Draw the shoe image centered on the collectible position (no rotation)
                    this.ctx.drawImage(
                        this.shoeImage,
                        collectible.x - drawWidth / 2,
                        collectible.y - drawHeight / 2,
                        drawWidth,
                        drawHeight
                    );

                    this.ctx.restore();
                } else {
                    // Fallback: draw simple circle if image not loaded
                    this.ctx.save();
                    this.ctx.fillStyle = '#FFD700';
                    this.ctx.strokeStyle = '#DAA520';
                    this.ctx.lineWidth = 2;
                    this.ctx.shadowColor = 'rgba(255, 215, 0, 0.6)';
                    this.ctx.shadowBlur = 8;

                    this.ctx.beginPath();
                    this.ctx.arc(collectible.x, collectible.y, size / 2, 0, Math.PI * 2);
                    this.ctx.fill();
                    this.ctx.stroke();

                    // Add "SHOE" text as fallback
                    this.ctx.fillStyle = '#000000';
                    this.ctx.font = `${size / 4}px Arial`;
                    this.ctx.textAlign = 'center';
                    this.ctx.textBaseline = 'middle';
                    this.ctx.fillText('SHOE', collectible.x, collectible.y);

                    this.ctx.restore();
                }

            } else { // star
                // Draw colored star with rounded points and rotation
                this.ctx.fillStyle = collectible.color;
                this.ctx.shadowColor = collectible.color;
                this.ctx.shadowBlur = 8;

                // 6-pointed star with rounded points
                this.ctx.beginPath();
                const spikes = 6;
                const outerRadius = size;
                const innerRadius = size * 0.4;
                const cornerRadius = size * 0.15; // Radius for rounded corners

                // Create path with rounded corners
                for (let i = 0; i < spikes; i++) {
                    // Outer point
                    const outerAngle = (Math.PI * 2 * i) / spikes + collectible.rotation;
                    const outerX = collectible.x + Math.cos(outerAngle) * outerRadius;
                    const outerY = collectible.y + Math.sin(outerAngle) * outerRadius;

                    // Inner points (left and right of the outer point)
                    const innerAngle1 = outerAngle - Math.PI / spikes;
                    const innerAngle2 = outerAngle + Math.PI / spikes;
                    const innerX1 = collectible.x + Math.cos(innerAngle1) * innerRadius;
                    const innerY1 = collectible.y + Math.sin(innerAngle1) * innerRadius;
                    const innerX2 = collectible.x + Math.cos(innerAngle2) * innerRadius;
                    const innerY2 = collectible.y + Math.sin(innerAngle2) * innerRadius;

                    if (i === 0) {
                        this.ctx.moveTo(innerX1, innerY1);
                    }

                    // Draw rounded line to outer point and then to next inner point
                    this.ctx.arcTo(outerX, outerY, innerX2, innerY2, cornerRadius);
                    this.ctx.lineTo(innerX2, innerY2);
                }

                this.ctx.closePath();
                this.ctx.fill();

                // Draw sparkles
                if (collectible.sparkles) {
                    this.ctx.fillStyle = '#FFFFFF';
                    this.ctx.shadowBlur = 2;

                    collectible.sparkles.forEach(sparkle => {
                        const sparkleOpacity = (Math.sin(sparkle.phase) + 1) / 2; // 0-1
                        this.ctx.globalAlpha = sparkleOpacity * 0.8;

                        // Apply rotation to sparkles too
                        const sparkleDistance = Math.sqrt(sparkle.offsetX * sparkle.offsetX + sparkle.offsetY * sparkle.offsetY);
                        const sparkleAngle = Math.atan2(sparkle.offsetY, sparkle.offsetX) + collectible.rotation;
                        const rotatedSparkleX = collectible.x + Math.cos(sparkleAngle) * sparkleDistance;
                        const rotatedSparkleY = collectible.y + Math.sin(sparkleAngle) * sparkleDistance;

                        this.ctx.beginPath();
                        this.ctx.arc(
                            rotatedSparkleX,
                            rotatedSparkleY,
                            sparkle.size,
                            0,
                            Math.PI * 2
                        );
                        this.ctx.fill();
                    });

                    this.ctx.globalAlpha = 1.0;
                }
            }

            this.ctx.restore();
        });
    }

    checkForDizziness() {
        if (this.mouseHistory.length < 15) return; // Need at least 15 positions to check (increased from 5)

        this.particles.forEach(particle => {
            // Skip if already dizzy, sleeping, tired, or recently made dizzy
            const dizzinessCooldown = 10000; // 10 seconds cooldown between dizziness
            const currentTime = Date.now();
            if (particle.isDizzy || particle.isSleeping || particle.isTired ||
                (currentTime - particle.lastDizzyTime < dizzinessCooldown)) {
                return;
            }

            const particleDistance = Math.sqrt(
                Math.pow(particle.x - this.mouseX, 2) +
                Math.pow(particle.y - this.mouseY, 2)
            );

            // Only check particles within reasonable distance
            if (particleDistance > this.fleeDistance * 2) return;

            // Calculate if mouse is moving rapidly around this particle
            let totalDistance = 0;
            let circularMovement = 0;
            const centerX = particle.x;
            const centerY = particle.y;

            for (let i = 1; i < this.mouseHistory.length; i++) {
                const curr = this.mouseHistory[i];
                const prev = this.mouseHistory[i - 1];

                // Calculate movement distance
                const moveDist = Math.sqrt(
                    Math.pow(curr.x - prev.x, 2) + Math.pow(curr.y - prev.y, 2)
                );
                totalDistance += moveDist;

                // Calculate angle change relative to particle center
                const prevAngle = Math.atan2(prev.y - centerY, prev.x - centerX);
                const currAngle = Math.atan2(curr.y - centerY, curr.x - centerX);
                let angleDiff = currAngle - prevAngle;

                // Normalize angle difference
                if (angleDiff > Math.PI) angleDiff -= 2 * Math.PI;
                if (angleDiff < -Math.PI) angleDiff += 2 * Math.PI;

                circularMovement += Math.abs(angleDiff);
            }

            // Criteria for dizziness: rapid movement + significant circular motion
            const timeSpan = this.mouseHistory[this.mouseHistory.length - 1].time - this.mouseHistory[0].time;
            const speed = totalDistance / (timeSpan / 1000); // pixels per second
            const totalAngleChange = circularMovement;

            // Make Susuwatari dizzy if mouse moves fast and in circles around them
            // Much more restrictive criteria: need more speed and more circular movement
            if (speed > 500 && totalAngleChange > Math.PI * 4) { // More than 720 degrees (2 full circles) of movement + higher speed
                this.makeSusuwatariDizzy(particle);
            }
        });
    }

    makeSusuwatariDizzy(particle) {
        const currentTime = Date.now();
        particle.isDizzy = true;
        particle.dizzyStartTime = currentTime;
        particle.dizzyUntil = currentTime + (this.restTimeout * 1000); // Use configurable rest timeout
        particle.dizzinessLevel = 0.5 + Math.random() * 0.5; // Random dizziness intensity (0.5-1.0)
        particle.isTired = true; // Consider them tired while dizzy
        particle.isFleeing = false; // Stop fleeing
        particle.energy = 0.2; // Low energy while dizzy
        particle.lastDizzyTime = currentTime; // Record when this particle was made dizzy
        particle.spiralRotation = 0; // Initialize spiral rotation
        particle.spiralRotationSpeed = 0.05 + Math.random() * 0.1; // Random rotation speed (0.05-0.15)
    }

    checkForZigzag() {
        const currentTime = Date.now();

        // Check cooldown
        if (currentTime - this.lastZigzagTime < this.zigzagCooldown) return;

        // Need at least 8 positions to detect zigzag
        if (this.zigzagHistory.length < 8) return;

        // Check if mouse is far enough from all Susuwatari
        let isMouseAway = true;
        for (let particle of this.particles) {
            const distance = Math.sqrt(
                Math.pow(particle.x - this.mouseX, 2) +
                Math.pow(particle.y - this.mouseY, 2)
            );
            if (distance < this.zigzagMinDistance) {
                isMouseAway = false;
                break;
            }
        }

        if (!isMouseAway) return;

        // Analyze movement pattern for zigzag
        const recentPositions = this.zigzagHistory.slice(-8); // Last 8 positions
        let directionChanges = 0;
        let totalDistance = 0;

        for (let i = 2; i < recentPositions.length; i++) {
            const prev = recentPositions[i - 2];
            const curr = recentPositions[i - 1];
            const next = recentPositions[i];

            // Calculate vectors
            const vec1 = {
                x: curr.x - prev.x,
                y: curr.y - prev.y
            };
            const vec2 = {
                x: next.x - curr.x,
                y: next.y - curr.y
            };

            // Calculate movement distance
            const segmentDistance = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);
            totalDistance += segmentDistance;

            // Calculate angle between vectors (direction change)
            const dotProduct = vec1.x * vec2.x + vec1.y * vec2.y;
            const mag1 = Math.sqrt(vec1.x * vec1.x + vec1.y * vec1.y);
            const mag2 = Math.sqrt(vec2.x * vec2.x + vec2.y * vec2.y);

            if (mag1 > 0 && mag2 > 0) {
                const cosAngle = dotProduct / (mag1 * mag2);
                const angle = Math.acos(Math.max(-1, Math.min(1, cosAngle)));

                // Significant direction change (more than 60 degrees)
                if (angle > Math.PI / 3) {
                    directionChanges++;
                }
            }
        }

        // Check for zigzag pattern: multiple direction changes + significant movement
        const timeSpan = recentPositions[recentPositions.length - 1].time - recentPositions[0].time;
        const speed = totalDistance / (timeSpan / 1000); // pixels per second

        // Zigzag criteria: at least 3 direction changes, fast movement (>300 px/s)
        if (directionChanges >= 3 && speed > 300) {
            console.log(`Zigzag detected! Changes: ${directionChanges}, Speed: ${speed.toFixed(0)} px/s`);
            this.triggerZigzagEffect();
        }
    }

    triggerZigzagEffect() {
        const currentTime = Date.now();
        this.lastZigzagTime = currentTime;

        console.log('Triggering zigzag scatter effect for all Susuwatari!');

        // Scatter all Susuwatari randomly across the canvas
        this.particles.forEach(particle => {
            // Generate random position
            const newX = particle.size / 2 + Math.random() * (this.canvas.width - particle.size);
            const newY = particle.size / 2 + Math.random() * (this.canvas.height - particle.size);

            // Set new target position
            particle.targetX = newX;
            particle.targetY = newY;

            // Reset states - they are now scattered and confused
            particle.isFleeing = false;
            particle.isTired = false;
            particle.isDizzy = false;
            particle.energy = 1.0;
            particle.isSeekingCollectible = false;
            particle.targetCollectible = null;

            // Create visual effect at current position
            this.createSmokeExplosion(particle.x, particle.y, particle.size * 0.5);
            this.createTrailParticle(particle.x, particle.y, particle.size, 1.0);
        });

        // Create additional particle effects around the canvas
        for (let i = 0; i < 5; i++) {
            const effectX = Math.random() * this.canvas.width;
            const effectY = Math.random() * this.canvas.height;
            this.createSmokeExplosion(effectX, effectY, 20);
        }

        // Reassign all collectibles since Susuwatari were scattered
        this.reassignAllCollectibles();

        console.log(`Scattered ${this.particles.length} Susuwatari across the canvas!`);
    }

    removeNearestParticle(mouseX, mouseY) {
        if (this.particles.length === 0) return;

        let nearestIndex = -1;
        let nearestDistance = Infinity;

        this.particles.forEach((particle, index) => {
            const distance = Math.sqrt(
                Math.pow(particle.x - mouseX, 2) +
                Math.pow(particle.y - mouseY, 2)
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        if (nearestIndex !== -1 && nearestDistance < 100) {
            this.particles.splice(nearestIndex, 1);
            this.updateUI();
        }
    }

    updatePupils() {
        this.particles.forEach(particle => {
            const eyeSize = particle.size * 0.17;

            let targetX, targetY;

            // Dizzy Susuwatari eyes in X shape look straight ahead (no tracking)
            if (particle.isDizzy) {
                // Eyes look straight ahead when dizzy - no pupil movement
                particle.leftPupilX = 0;
                particle.leftPupilY = 0;
                particle.rightPupilX = 0;
                particle.rightPupilY = 0;
                return;
            }

            // Determine what the Susuwatari should look at
            if (particle.isSeekingCollectible && particle.targetCollectible) {
                // Look at the collectible they're seeking
                targetX = particle.targetCollectible.x;
                targetY = particle.targetCollectible.y;
            } else {
                // Look at the mouse (default behavior)
                targetX = this.mouseX;
                targetY = this.mouseY;
            }

            // Calculate pupil position based on target direction
            const deltaX = targetX - particle.x;
            const deltaY = targetY - particle.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            const maxMove = eyeSize * 0.25;
            const moveX = distance > 0 ? (deltaX / distance) * Math.min(distance / 50, maxMove) : 0;
            const moveY = distance > 0 ? (deltaY / distance) * Math.min(distance / 50, maxMove) : 0;

            // Update pupil positions
            particle.leftPupilX = moveX;
            particle.leftPupilY = moveY;
            particle.rightPupilX = moveX;
            particle.rightPupilY = moveY;
        });
    }

    processBlinks() {
        const currentTime = Date.now();

        this.particles.forEach(particle => {
            if (!particle.isBlinking && currentTime >= particle.nextBlinkTime) {
                particle.isBlinking = true;
                particle.blinkStartTime = currentTime;
                particle.eyeOpacity = 0;

                setTimeout(() => {
                    particle.isBlinking = false;
                    particle.eyeOpacity = 1;
                    particle.nextBlinkTime = currentTime + this.getRandomBlinkInterval();
                }, particle.blinkDuration);
            }
        });
    }

    drawSpiral(centerX, centerY, size, dizzinessLevel, rotation = 0) {
        this.ctx.beginPath();

        // Spiral parameters
        const turns = 2.5 + dizzinessLevel; // Number of turns (more dizzy = more turns)
        const maxRadius = size / 2;
        const steps = 50; // Number of steps to draw the spiral

        // Start from center and spiral outward
        for (let i = 0; i <= steps; i++) {
            const progress = i / steps;
            const angle = progress * turns * Math.PI * 2 + rotation; // Add rotation
            const radius = progress * maxRadius;

            const x = centerX + Math.cos(angle) * radius;
            const y = centerY + Math.sin(angle) * radius;

            if (i === 0) {
                this.ctx.moveTo(x, y);
            } else {
                this.ctx.lineTo(x, y);
            }
        }

        this.ctx.stroke();
    }

    drawSusuwatari(particle) {
        const x = particle.x;
        const y = particle.y;

        // Use original size (no bass pulse effect on body size)
        const size = particle.size;

        this.ctx.save();

        // Add wobble effect if not fleeing
        if (!particle.isFleeing) {
            const time = Date.now() * 0.001;
            const wobbleX = Math.sin(time + particle.wobbleOffset) * 0.5;
            const wobbleY = Math.cos(time * 0.7 + particle.wobbleOffset) * 0.3;
            this.ctx.translate(wobbleX, wobbleY);
        }

        // Draw spiky susuwatari body using stored pattern
        const radius = size / 2;

        // Create spiky path using the particle's unique pattern with audio reactivity and rotation
        this.ctx.beginPath();
        for (let i = 0; i < particle.spikeCount; i++) {
            const angle = (i / particle.spikeCount) * Math.PI * 2 + particle.rotation; // Apply unique rotation
            let radiusMultiplier = particle.spikePattern[i];

            // Apply audio-reactive effect to spike length
            const audioMultiplier = this.getAudioSpikeMultiplier(i, particle.spikeCount, particle);
            radiusMultiplier *= audioMultiplier;

            const currentRadius = radius * radiusMultiplier;

            const pointX = x + Math.cos(angle) * currentRadius;
            const pointY = y + Math.sin(angle) * currentRadius;

            if (i === 0) {
                this.ctx.moveTo(pointX, pointY);
            } else {
                this.ctx.lineTo(pointX, pointY);
            }
        }
        this.ctx.closePath();        // Fill with gradient (muito mais escuro)
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#1a1a1a'); // Centro mais escuro
        gradient.addColorStop(0.3, '#111111'); // Meio escuro
        gradient.addColorStop(0.7, '#080808'); // Quase preto
        gradient.addColorStop(1, '#000000'); // Preto total

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Add shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Add fuzzy texture with multiple small circles (mais escuro)
        this.ctx.globalAlpha = 0.4;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = size * (0.1 + Math.random() * 0.2);
            const fuzzX = x + Math.cos(angle) * radius;
            const fuzzY = y + Math.sin(angle) * radius;

            // Textura muito mais escura (tons de preto/cinza escuro)
            this.ctx.fillStyle = `rgba(${10 + Math.random() * 15}, ${10 + Math.random() * 15}, ${10 + Math.random() * 15}, ${0.3 + Math.random() * 0.3})`;
            this.ctx.beginPath();
            this.ctx.arc(fuzzX, fuzzY, size * 0.08, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;

        // Draw eyes (skip if sleeping during sleep hours)
        if (particle.eyeOpacity > 0 && !particle.isSleeping) {
            // Apply bass pulse effect to eye size only
            const bassPulseMultiplier = this.getBassPulseMultiplier(particle);

            // Calculate mouse proximity for eye dilation effect
            const mouseDistance = Math.sqrt(
                Math.pow(particle.x - this.mouseX, 2) +
                Math.pow(particle.y - this.mouseY, 2)
            );

            // Eye dilation based on mouse proximity (closer = more dilated)
            const maxProximityDistance = this.fleeDistance * 1.5; // 1.5x flee distance for gradual effect
            const proximityRatio = Math.max(0, 1 - (mouseDistance / maxProximityDistance)); // 1 = very close, 0 = far
            const proximityEyeMultiplier = 1 + (proximityRatio * 0.6); // Up to 60% larger when mouse is very close

            // Olhos maiores baseado na proximidade do mouse (efeito de susto)
            // Apply tiredness effect to eyes (tired = smaller, droopy eyes)
            let tirednessMultiplier = particle.isTired ? 0.7 : (1.0 - (1.0 - particle.energy) * 0.3); // Eyes get smaller as energy decreases

            // Dizzy Susuwatari have bigger eyes (dazed/confused look)
            if (particle.isDizzy) {
                tirednessMultiplier = 1.4; // 40% bigger eyes when dizzy
            }

            const baseEyeSize = size * 0.17;
            const proximityEyeSize = baseEyeSize * proximityEyeMultiplier * tirednessMultiplier;
            const eyeSize = proximityEyeSize * bassPulseMultiplier; // Apply bass pulse to eyes
            const eyePosition = size * 0.17;

            this.ctx.globalAlpha = particle.eyeOpacity;

            // Keep eyes in fixed positions (no rotation) - always in the same relative position
            const leftEyeAngle = -Math.PI * 0.75; // Fixed 135 degrees (top-left)
            const rightEyeAngle = -Math.PI * 0.25; // Fixed 45 degrees (top-right)

            // Left eye with fixed position
            const leftEyeX = x + Math.cos(leftEyeAngle) * eyePosition;
            const leftEyeY = y + Math.sin(leftEyeAngle) * eyePosition;

            // Eye gradient
            const eyeGradient = this.ctx.createRadialGradient(leftEyeX, leftEyeY, 0, leftEyeX, leftEyeY, eyeSize / 2);
            eyeGradient.addColorStop(0, '#ffffff');
            eyeGradient.addColorStop(0.8, '#f0f0f0');
            eyeGradient.addColorStop(1, '#e0e0e0');

            this.ctx.fillStyle = eyeGradient;
            this.ctx.beginPath();
            this.ctx.arc(leftEyeX, leftEyeY, eyeSize / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Right eye with fixed position
            const rightEyeX = x + Math.cos(rightEyeAngle) * eyePosition;
            const rightEyeY = y + Math.sin(rightEyeAngle) * eyePosition;

            this.ctx.fillStyle = eyeGradient;
            this.ctx.beginPath();
            this.ctx.arc(rightEyeX, rightEyeY, eyeSize / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Draw pupils
            const pupilGradient = this.ctx.createRadialGradient(0, 0, 0, 0, 0, eyeSize * 0.2);
            pupilGradient.addColorStop(0, '#000000');
            pupilGradient.addColorStop(0.7, '#111111');
            pupilGradient.addColorStop(1, '#333333');

            this.ctx.fillStyle = pupilGradient;
            // Pupilas dilatadas baseado na proximidade do mouse (efeito de susto/medo)
            const basePupilSize = eyeSize * 0.4;
            const proximityPupilMultiplier = 1 + (proximityRatio * 0.8); // Up to 80% larger pupils when mouse is very close
            const pupilSize = basePupilSize * proximityPupilMultiplier;

            // Render pupils or dizziness effect
            if (particle.isDizzy) {
                // Draw spirals instead of X's when dizzy
                this.ctx.strokeStyle = '#000000';
                this.ctx.lineWidth = pupilSize * 0.1;

                // Left eye spiral
                const leftPupilCenterX = leftEyeX + particle.leftPupilX;
                const leftPupilCenterY = leftEyeY + particle.leftPupilY;
                this.drawSpiral(leftPupilCenterX, leftPupilCenterY, eyeSize * 0.9, particle.dizzinessLevel, particle.spiralRotation || 0);

                // Right eye spiral (rotate in opposite direction for more chaotic effect)
                const rightPupilCenterX = rightEyeX + particle.rightPupilX;
                const rightPupilCenterY = rightEyeY + particle.rightPupilY;
                this.drawSpiral(rightPupilCenterX, rightPupilCenterY, eyeSize * 0.9, particle.dizzinessLevel, -(particle.spiralRotation || 0));
            } else {
                // Normal pupils
                // Left pupil
                this.ctx.beginPath();
                this.ctx.arc(
                    leftEyeX + particle.leftPupilX,
                    leftEyeY + particle.leftPupilY,
                    pupilSize / 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();

                // Right pupil
                this.ctx.beginPath();
                this.ctx.arc(
                    rightEyeX + particle.rightPupilX,
                    rightEyeY + particle.rightPupilY,
                    pupilSize / 2,
                    0,
                    Math.PI * 2
                );
                this.ctx.fill();
            }

            // Add eye highlights with fixed positions
            this.ctx.globalAlpha = particle.eyeOpacity * 0.8;
            this.ctx.fillStyle = '#ffffff';

            // Left eye highlight
            this.ctx.beginPath();
            this.ctx.arc(leftEyeX - eyeSize * 0.15, leftEyeY - eyeSize * 0.15, eyeSize * 0.1, 0, Math.PI * 2);
            this.ctx.fill();

            // Right eye highlight
            this.ctx.beginPath();
            this.ctx.arc(rightEyeX - eyeSize * 0.15, rightEyeY - eyeSize * 0.15, eyeSize * 0.1, 0, Math.PI * 2);
            this.ctx.fill();
        }

        // Draw sleep Z's if sleeping
        if (particle.isSleeping && particle.zzz.length > 0) {
            particle.zzz.forEach(z => {
                this.ctx.globalAlpha = z.opacity;
                this.ctx.fillStyle = '#ffffff';
                this.ctx.font = `${z.size}px Arial`;
                this.ctx.textAlign = 'center';
                this.ctx.fillText('Z', z.x, z.y);
            });
            this.ctx.globalAlpha = 1.0; // Reset alpha
        }

        this.ctx.restore();
    }

    refillScreen() {
        // Remove off-screen particles with smoke explosion
        const initialCount = this.particles.length;
        this.particles = this.particles.filter(particle => {
            const isOnScreen = particle.x > -50 && particle.x < this.canvas.width + 50 &&
                particle.y > -50 && particle.y < this.canvas.height + 50;

            // If the particle left the screen, create smoke explosion and stain
            if (!isOnScreen) {
                // Create explosion at the nearest screen edge
                const edgeX = Math.max(-50, Math.min(this.canvas.width + 50, particle.x));
                const edgeY = Math.max(-50, Math.min(this.canvas.height + 50, particle.y));
                this.createSmokeExplosion(edgeX, edgeY, particle.size);
                this.createSootStain(edgeX, edgeY, particle.size);
            }

            return isOnScreen;
        });

        // Add new particles
        const neededCount = this.maxParticles - this.particles.length;
        for (let i = 0; i < neededCount; i++) {
            let x, y, attempts = 0;
            let validPosition = false;

            do {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
                attempts++;

                // Check distance from mouse
                const mouseDistance = Math.sqrt(Math.pow(x - this.mouseX, 2) + Math.pow(y - this.mouseY, 2));
                if (mouseDistance < this.fleeDistance * 1.5) {
                    continue; // Too close to mouse
                }

                // Check distance from collectibles
                let tooCloseToCollectible = false;
                for (let collectible of this.collectibles) {
                    const collectibleDistance = Math.sqrt(Math.pow(x - collectible.x, 2) + Math.pow(y - collectible.y, 2));
                    const minDistance = (this.particleSize + collectible.size) / 2 + 25; // Buffer distance

                    if (collectibleDistance < minDistance) {
                        tooCloseToCollectible = true;
                        break;
                    }
                }

                if (!tooCloseToCollectible) {
                    validPosition = true;
                }

            } while (!validPosition && attempts < 15);

            this.createParticle(x, y);
        }
    }

    updateUI() {
        const countElement = document.getElementById('count');
        if (countElement) {
            countElement.textContent = this.particles.length;
        }
    }

    calculateFPS() {
        this.frameCount++;
        const currentTime = Date.now();

        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
            const fpsElement = document.getElementById('fps');
            if (fpsElement) {
                fpsElement.textContent = this.fps;
            }
        }
    }

    animate() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update particle movement (smooth animation)
        this.updateParticleMovement();

        // Update sleep system
        this.updateSleepSystem();

        // Update collectibles system
        this.updateCollectibles();

        // Update and draw soot stains (manchas de fuligem permanentes)
        this.updateSootStains();
        this.drawSootStains();

        // Update and draw trail particles (rastro de fuligem)
        this.updateTrailParticles();
        this.drawTrailParticles();

        // Update and draw smoke particles
        this.updateSmokeParticles();
        this.drawSmokeParticles();

        // Update pupils and process blinks
        this.updatePupils();
        this.processBlinks();

        // Draw all particles
        this.particles.forEach(particle => {
            this.drawSusuwatari(particle);
        });

        // Draw collectibles
        this.drawCollectibles();

        // Update UI
        this.calculateFPS();

        requestAnimationFrame(() => this.animate());
    }
}

// Global instance for Wallpaper Engine
let susuwatariInstance = null;

// Audio listener function for Wallpaper Engine
function wallpaperAudioListener(audioArray) {
    if (susuwatariInstance) {
        susuwatariInstance.wallpaperAudioListener(audioArray);
    }
}

// Queue for properties received before instance is ready
let pendingProperties = [];

// Global functions required for Wallpaper Engine
window.wallpaperPropertyListener = {
    applyUserProperties: function (properties) {
        console.log('Wallpaper Engine: Received properties:', properties);
        if (susuwatariInstance) {
            susuwatariInstance.applyUserProperties(properties);
        } else {
            console.warn('Wallpaper Engine: susuwatariInstance not ready yet, queuing properties');
            pendingProperties.push(properties);
        }
    }
};

// Function to process queued properties
function processPendingProperties() {
    if (pendingProperties.length > 0) {
        console.log('Processing', pendingProperties.length, 'pending properties');
        pendingProperties.forEach(properties => {
            if (susuwatariInstance) {
                susuwatariInstance.applyUserProperties(properties);
            }
        });
        pendingProperties = [];
    }
}

// Global function required for Lively Wallpaper
function livelyPropertyListener(name, val) {
    if (!susuwatariInstance) return;

    // Convert Lively property names to Wallpaper Engine format
    const livelyToWallpaperMap = {
        'susuwatariSize': 'susuwatari_size',
        'susuwatariCount': 'susuwatari_count',
        'fleeDistance': 'flee_distance',
        'fleeAcceleration': 'flee_acceleration',
        'audioIntensity': 'audio_intensity',
        'bassPulseIntensity': 'bass_pulse_intensity',
        'audioVisualizationEnabled': 'audio_visualization_enabled',
        'maxRunDistance': 'max_run_distance',
        'sleepStartTime': 'sleep_start_time',
        'sleepEndTime': 'sleep_end_time',
        'sleepTimeout': 'sleep_timeout',
        'minVolumeToKeepAwake': 'min_volume_to_keep_awake',
        'restTimeout': 'rest_timeout',
        'zigzagMinDistance': 'zigzag_min_distance',
        'backgroundImageUrl': 'background_image',
        'backgroundImagePicker': 'background_image_picker'
    };

    const wallpaperPropertyName = livelyToWallpaperMap[name];
    if (wallpaperPropertyName) {
        // Create property object in Wallpaper Engine format
        const properties = {};
        properties[wallpaperPropertyName] = { value: val };
        susuwatariInstance.applyUserProperties(properties);
    }
}

let isBrowserMode = false;
let isLivelyWallpaper = true;
let isWallpaperEngine = false;


// Initialize the wallpaper
document.addEventListener('DOMContentLoaded', function () {
    console.log('DOM Content Loaded - Initializing Susuwatari...');
    susuwatariInstance = new SusuwatariCanvas();
    console.log('SusuwatariCanvas instance created');

    // Process any properties that were received before the instance was ready
    processPendingProperties();

    // Detect which wallpaper engine is running
    isBrowserMode = this.location.href.startsWith('https://zonaro.github.io/susuwatari/') || this.location.search.includes('browser=1');
    isWallpaperEngine = typeof window.wallpaperRegisterAudioListener !== 'undefined';
    isLivelyWallpaper = !isBrowserMode && !isWallpaperEngine;

    console.log('Wallpaper Engine Detection:');
    console.log('- Wallpaper Engine:', isWallpaperEngine);
    console.log('- Lively Wallpaper:', isLivelyWallpaper);
    console.log('- Browser Mode:', isBrowserMode);

    // Initialize audio for the detected engine
    if (isWallpaperEngine) {
        console.log('Initializing for Wallpaper Engine...');
        // Register the audio listener with Wallpaper Engine
        try {
            window.wallpaperRegisterAudioListener(wallpaperAudioListener);
        } catch (e) {
            console.warn('Failed to register Wallpaper Engine audio listener:', e);
        }
    } else if (isBrowserMode) {
        console.log('Running in standard web browser mode');
        // Initialize browser mode with settings panel
        initializeBrowserMode();
        // Initialize Web Audio API for browser mode
        initializeBrowserAudio();
        // Pre-load JSZip for download functionality
        loadJSZip().catch(error => {
            console.warn('Failed to pre-load JSZip:', error);
        });

    } else {
        window.livelyAudioListener = function (audioArray) {
            if (susuwatariInstance) {
                susuwatariInstance.wallpaperAudioListener(audioArray);
            }
        }
        // Load default properties for Lively Wallpaper
        const defaultProperties = {
            'susuwatariSize': 18,
            'susuwatariCount': 100,
            'fleeDistance': 80,
            'fleeAcceleration': 4.0,
            'audioIntensity': 1.0,
            'bassPulseIntensity': 1.0,
            'audioVisualizationEnabled': true,
            'maxRunDistance': 300,
            'sleepStartTime': '22:00',
            'sleepEndTime': '06:00',
            'sleepTimeout': 10,
            'minVolumeToKeepAwake': 0.1,
            'restTimeout': 5,
            'zigzagMinDistance': 150,
            'backgroundImageUrl': '',
            'backgroundImagePicker': null
        };

        // Apply each default property
        Object.keys(defaultProperties).forEach(key => {
            livelyPropertyListener(key, defaultProperties[key]);
        });

    }
});

/**
 * Estimate BPM from raw audio samples (Float32Array)
 * @param {Float32Array} audioArray - raw PCM samples
 * @param {number} sampleRate - sample rate (e.g., 44100)
 * @returns {number} estimated BPM
 */
function detectBPM(audioArray, sampleRate = 44100) {
    // Step 1: Compute energy envelope
    const frameSize = 1024; // ~23ms at 44.1kHz
    const energies = [];
    for (let i = 0; i < audioArray.length; i += frameSize) {
        let sum = 0;
        for (let j = 0; j < frameSize && i + j < audioArray.length; j++) {
            const sample = audioArray[i + j];
            sum += sample * sample; // energy = squared amplitude
        }
        energies.push(sum);
    }

    // Step 2: Normalize energies
    const maxEnergy = Math.max(...energies);
    const normEnergies = energies.map(e => e / maxEnergy);

    // Step 3: Peak picking
    const threshold = 0.3; // tweakable
    const peaks = [];
    for (let i = 1; i < normEnergies.length - 1; i++) {
        if (normEnergies[i] > threshold &&
            normEnergies[i] > normEnergies[i - 1] &&
            normEnergies[i] > normEnergies[i + 1]) {
            peaks.push(i * frameSize);
        }
    }

    if (peaks.length < 2) return 0; // not enough data

    // Step 4: Compute intervals between peaks
    const intervals = [];
    for (let i = 1; i < peaks.length; i++) {
        intervals.push((peaks[i] - peaks[i - 1]) / sampleRate);
    }

    // Step 5: Histogram of intervals
    const histogram = {};
    intervals.forEach(interval => {
        const bpm = Math.round(60 / interval);
        if (bpm >= 60 && bpm <= 200) { // reasonable tempo range
            histogram[bpm] = (histogram[bpm] || 0) + 1;
        }
    });

    // Step 6: Pick most common BPM
    let bestBPM = 0, maxCount = 0;
    for (const bpm in histogram) {
        if (histogram[bpm] > maxCount) {
            bestBPM = bpm;
            maxCount = histogram[bpm];
        }
    }

    return bestBPM;
}





// Browser Audio Functions using Web Audio API
let browserAudioContext = null;
let browserAnalyser = null;
let browserAudioDataArray = null;
let browserAudioStream = null;
let browserAudioInitialized = false;

function initializeBrowserAudio() {
    console.log('Initializing Web Audio API for browser mode...');

    // Create audio button overlay for user interaction (required by browser security)
    createAudioButton();
}

function createAudioButton() {
    // Create audio enable button
    const audioButton = document.createElement('div');
    audioButton.id = 'browser-audio-button';
    audioButton.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(22, 33, 62, 0.95);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10001;
            cursor: pointer;
            transition: all 0.3s ease;
        ">
            <div style="font-weight: bold; margin-bottom: 8px;">🎵 Enable Audio Reactivity</div>
            <div style="font-size: 12px; color: #ccc; margin-bottom: 10px;">
                Click to enable microphone for audio-reactive effects.<br>
                Your audio data stays private and local.
            </div>
            <div style="
                background: #4CAF50;
                color: white;
                padding: 8px 12px;
                border-radius: 4px;
                text-align: center;
                font-size: 12px;
                margin-top: 10px;
            ">Enable Audio</div>
        </div>
    `;

    audioButton.addEventListener('click', async function () {
        try {
            await setupBrowserAudio();
            audioButton.remove();
        } catch (error) {
            console.error('Failed to setup browser audio:', error);
            audioButton.innerHTML = `
                <div style="
                    position: fixed;
                    top: 20px;
                    left: 20px;
                    background: rgba(139, 0, 0, 0.95);
                    color: white;
                    padding: 15px 20px;
                    border-radius: 8px;
                    border: 1px solid rgba(255, 255, 255, 0.1);
                    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
                    font-family: Arial, sans-serif;
                    font-size: 14px;
                    z-index: 10001;
                    cursor: pointer;
                ">
                    <div style="font-weight: bold; margin-bottom: 8px;">⚠️ Audio Setup Failed</div>
                    <div style="font-size: 12px; color: #ccc; margin-bottom: 10px;">
                        Could not access microphone. Check permissions or try again.
                    </div>
                    <div onclick="this.parentElement.parentElement.remove()" style="
                        background: rgba(255, 255, 255, 0.1);
                        color: white;
                        padding: 8px 12px;
                        border-radius: 4px;
                        text-align: center;
                        font-size: 12px;
                        margin-top: 10px;
                        cursor: pointer;
                    ">Dismiss</div>
                </div>
            `;
            // Auto-remove error message after 5 seconds
            setTimeout(() => {
                if (audioButton.parentElement) {
                    audioButton.remove();
                }
            }, 5000);
        }
    });

    document.body.appendChild(audioButton);

    // Auto-hide button after 15 seconds if not used
    setTimeout(() => {
        if (audioButton.parentElement && !browserAudioInitialized) {
            audioButton.style.opacity = '0';
            setTimeout(() => {
                if (audioButton.parentElement) {
                    audioButton.remove();
                }
            }, 300);
        }
    }, 15000);
}

async function setupBrowserAudio() {
    try {
        console.log('Setting up Web Audio API...');

        // Request microphone access
        browserAudioStream = await navigator.mediaDevices.getUserMedia({
            audio: {
                echoCancellation: false,
                noiseSuppression: false,
                autoGainControl: false
            }
        });

        // Create audio context
        browserAudioContext = new (window.AudioContext || window.webkitAudioContext)();

        // Create analyser node
        browserAnalyser = browserAudioContext.createAnalyser();
        browserAnalyser.fftSize = 256; // This gives us 128 frequency bins
        browserAnalyser.smoothingTimeConstant = 0.5;

        // Create source from stream
        const source = browserAudioContext.createMediaStreamSource(browserAudioStream);
        source.connect(browserAnalyser);

        // Create data array for frequency data
        browserAudioDataArray = new Uint8Array(browserAnalyser.frequencyBinCount);

        browserAudioInitialized = true;
        console.log('Browser audio initialized successfully');

        // Start audio processing loop
        processBrowserAudio();

        // Show success notification
        showAudioSuccessNotification();

    } catch (error) {
        console.error('Error setting up browser audio:', error);
        throw error;
    }
}

function processBrowserAudio() {
    if (!browserAudioInitialized || !browserAnalyser || !susuwatariInstance) {
        return;
    }

    // Get frequency data
    browserAnalyser.getByteFrequencyData(browserAudioDataArray);

    // Convert to float array matching Wallpaper Engine format (0.0 to 1.0)
    const normalizedAudioData = new Array(128);
    for (let i = 0; i < 128; i++) {
        // Map frequency data to 0.0-1.0 range
        normalizedAudioData[i] = (browserAudioDataArray[i] || 0) / 255.0;
    }

    // Feed to Susuwatari audio system
    if (susuwatariInstance && typeof susuwatariInstance.wallpaperAudioListener === 'function') {
        susuwatariInstance.wallpaperAudioListener(normalizedAudioData);
    }

    // Continue processing
    requestAnimationFrame(processBrowserAudio);
}

function showAudioSuccessNotification() {
    const notification = document.createElement('div');
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            left: 20px;
            background: rgba(76, 175, 80, 0.95);
            color: white;
            padding: 15px 20px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-family: Arial, sans-serif;
            font-size: 14px;
            z-index: 10001;
            transition: opacity 0.3s ease;
        ">
            <div style="font-weight: bold; margin-bottom: 8px;">✅ Audio Reactivity Enabled</div>
            <div style="font-size: 12px; color: rgba(255, 255, 255, 0.9);">
                Your Susuwatari will now react to microphone audio.<br>
                Play music or make sounds to see them dance!
            </div>
        </div>
    `;

    document.body.appendChild(notification);

    // Auto-hide after 4 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.style.opacity = '0';
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, 300);
        }
    }, 4000);
}

// Cleanup function for browser audio
function cleanupBrowserAudio() {
    if (browserAudioStream) {
        browserAudioStream.getTracks().forEach(track => track.stop());
        browserAudioStream = null;
    }

    if (browserAudioContext && browserAudioContext.state !== 'closed') {
        browserAudioContext.close();
        browserAudioContext = null;
    }

    browserAnalyser = null;
    browserAudioDataArray = null;
    browserAudioInitialized = false;

    console.log('Browser audio cleaned up');
}

// Add cleanup on page unload
window.addEventListener('beforeunload', cleanupBrowserAudio);

// Dynamic JSZip loader for browser mode
async function loadJSZip() {
    return new Promise((resolve, reject) => {
        // Check if JSZip is already loaded
        if (typeof JSZip !== 'undefined') {
            console.log('JSZip already loaded');
            resolve(JSZip);
            return;
        }

        console.log('Loading JSZip dynamically for browser mode...');

        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js';
        script.async = true;

        script.onload = () => {
            console.log('JSZip loaded successfully');
            resolve(JSZip);
        };

        script.onerror = () => {
            console.error('Failed to load JSZip');
            reject(new Error('Failed to load JSZip library'));
        };

        document.head.appendChild(script);
    });
}

// Browser Mode Functions
function initializeBrowserMode() {
    console.log('Initializing browser mode with settings panel support...');

    // Load saved settings from localStorage
    loadBrowserSettings();

    // Add settings panel trigger (keyboard shortcut and right-click menu)
    setupBrowserControls();

    // Listen for settings updates from popup
    window.addEventListener('message', function (event) {
        if (event.data && event.data.type === 'susuwatari-settings-update') {
            console.log('Received settings update from popup:', event.data.settings);
            applyBrowserSettings(event.data.settings);
        }
    });

}

function loadBrowserSettings() {
    try {
        const saved = localStorage.getItem('susuwatari-settings');
        if (saved) {
            const settings = JSON.parse(saved);
            console.log('Loading saved browser settings:', settings);
            applyBrowserSettings(settings);
        } else {
            console.log('No saved settings found, using defaults');
            // Apply default settings for browser mode
            const defaultSettings = {
                susuwatariSize: 18,
                susuwatariCount: 100,
                fleeDistance: 80,
                fleeAcceleration: 4.0,
                audioIntensity: 1.0,
                bassPulseIntensity: 1.0,
                audioVisualizationEnabled: true,
                maxRunDistance: 300,
                sleepStartTime: '22:00',
                sleepEndTime: '06:00',
                sleepTimeout: 10,
                minVolumeToKeepAwake: 0.1,
                restTimeout: 5,
                zigzagMinDistance: 150,
                backgroundImageUrl: ''
            };
            applyBrowserSettings(defaultSettings);
        }
    } catch (e) {
        console.warn('Error loading browser settings:', e);
    }
}

function applyBrowserSettings(settings) {
    if (!susuwatariInstance) return;

    // Convert browser settings to Wallpaper Engine format and apply
    const properties = {};

    // Map all settings
    const browserToWallpaperMap = {
        'susuwatariSize': 'susuwatari_size',
        'susuwatariCount': 'susuwatari_count',
        'fleeDistance': 'flee_distance',
        'fleeAcceleration': 'flee_acceleration',
        'audioIntensity': 'audio_intensity',
        'bassPulseIntensity': 'bass_pulse_intensity',
        'audioVisualizationEnabled': 'audio_visualization_enabled',
        'maxRunDistance': 'max_run_distance',
        'sleepStartTime': 'sleep_start_time',
        'sleepEndTime': 'sleep_end_time',
        'sleepTimeout': 'sleep_timeout',
        'minVolumeToKeepAwake': 'min_volume_to_keep_awake',
        'restTimeout': 'rest_timeout',
        'zigzagMinDistance': 'zigzag_min_distance',
        'backgroundImageUrl': 'background_image'
    };

    Object.keys(settings).forEach(key => {
        const wallpaperKey = browserToWallpaperMap[key];
        if (wallpaperKey) {
            properties[wallpaperKey] = { value: settings[key] };
        }
    });

    console.log('Applying browser settings as properties:', properties);
    susuwatariInstance.applyUserProperties(properties);
}

function setupBrowserControls() {
    // Add keyboard shortcut (Ctrl+Shift+S) to open settings
    document.addEventListener('keydown', function (e) {
        if (e.ctrlKey && e.shiftKey && e.key === 'S') {
            e.preventDefault();
            openSettingsPanel();
        }
    });

    // Add right-click context menu for settings
    document.addEventListener('contextmenu', function (e) {
        e.preventDefault();
        openSettingsPanel();
    });

    // Add notification overlay for first-time users
    showBrowserModeNotification();
}

function openSettingsPanel() {
    try {
        // Open settings panel in a new popup window
        const popup = window.open(
            'browser-settings.html',
            'susuwatari-settings',
            'width=600,height=800,scrollbars=yes,resizable=yes,location=no,menubar=no,toolbar=no,status=no'
        );

        if (popup) {
            console.log('Settings panel opened successfully');
            // Focus the popup window
            popup.focus();
        } else {
            console.warn('Failed to open settings panel - popup blocked?');
            // Fallback: show alert with instructions
            alert('Settings Panel\n\nPopup blocked! Please allow popups for this site.\n\nAlternatively, use:\n• Right-click anywhere to open settings\n• Ctrl+Shift+S keyboard shortcut');
        }
    } catch (e) {
        console.error('Error opening settings panel:', e);
        alert('Error opening settings panel. Please check browser console for details.');
    }
}

function showBrowserModeNotification() {
    // Create notification overlay with download options
    const notification = document.createElement('div');
    notification.id = 'browser-mode-notification';
    notification.innerHTML = `
        <div style="
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(22, 33, 62, 0.95);
            color: white;
            padding: 20px;
            border-radius: 8px;
            border: 1px solid rgba(255, 255, 255, 0.1);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            font-family: Arial, sans-serif;
            font-size: 14px;
            max-width: 350px;
            z-index: 10000;
            transition: opacity 0.3s ease;
        ">
            <div style="font-weight: bold; margin-bottom: 12px; font-size: 16px;">Susuwatari Wallpaper</div>
            
            <div style="margin-bottom: 15px; line-height: 1.4; color: #e0e0e0;">
                Interactive soot sprites that react to your mouse and audio!
            </div>

            <div style="margin-bottom: 15px;">
                <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">📥 Download Options:</div>
                <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px;">
                    <a href="steam://url/CommunityFilePage/3587855531" style="
                        background: #4CAF50;
                        color: white;
                        text-decoration: none;
                        padding: 10px 15px;
                        border-radius: 4px;
                        font-size: 12px;
                        text-align: center;
                        transition: background-color 0.2s ease;
                    " onmouseover="this.style.background='#45a049'" onmouseout="this.style.background='#4CAF50'">
                        🎮 Steam Workshop - Wallpaper Engine
                    </a>
                    <button id="downloadSusuwatariBtn" style="
                        background: #2196F3;
                        color: white;
                        border: none;
                        padding: 10px 15px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        transition: background-color 0.2s ease;
                    " onmouseover="this.style.background='#1976D2'" onmouseout="this.style.background='#2196F3'">
                        📦 Download ZIP - Lively Wallpaper
                    </button>
                </div>
            </div>

            <div style="border-top: 1px solid rgba(255, 255, 255, 0.1); padding-top: 12px; margin-top: 12px;">
                <div style="font-weight: bold; margin-bottom: 8px; color: #4CAF50;">⚙️ Customization:</div>
                <div style="font-size: 12px; color: #ccc; margin-bottom: 10px;">
                    • Right-click for settings<br>
                    • Press Ctrl+Shift+S<br>
                    • Settings saved locally
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="openSettingsPanel()" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 8px 12px;
                        border-radius: 4px;
                        cursor: pointer;
                        font-size: 12px;
                        width: 100%;
                    ">Open Settings</button>
                </div>
            </div>

            <div id="download-status" style="
                display: none;
                background: rgba(15, 52, 96, 0.4);
                border-radius: 4px;
                padding: 10px;
                margin-top: 10px;
                font-family: monospace;
                font-size: 11px;
                max-height: 150px;
                overflow-y: auto;
                white-space: pre-wrap;
                line-height: 1.2;
            "></div>
        </div>
    `;

    document.body.appendChild(notification);

    // Add download functionality
    const downloadBtn = notification.querySelector('#downloadSusuwatariBtn');
    const statusDiv = notification.querySelector('#download-status');

    downloadBtn.addEventListener('click', async function () {
        try {
            statusDiv.style.display = 'block';
            statusDiv.textContent = '';

            function addLine(msg) {
                statusDiv.textContent += msg + '\\n';
            }

            downloadBtn.disabled = true;
            downloadBtn.textContent = '⏳ Loading libraries...';
            addLine('🚀 Starting Susuwatari files download...\\n');

            // Load JSZip dynamically
            addLine('📚 Loading JSZip library...');
            const JSZip = await loadJSZip();
            addLine('✅ JSZip library loaded successfully');

            const files = [
                { name: 'LivelyInfo.json', desc: 'Lively Wallpaper metadata' },
                { name: 'LivelyProperties.json', desc: 'Configurable properties' },
                { name: 'index.html', desc: 'Main interface' },
                { name: 'preview.gif', desc: 'Preview' },
                { name: 'susuwatari.js', desc: 'Animation engine' }
            ];

            downloadBtn.textContent = '⏳ Preparing download...';
            const zip = new JSZip();
            let success = 0;

            for (let i = 0; i < files.length; i++) {
                const file = files[i];
                addLine(`📁 Loading [${i + 1}/${files.length}]: ${file.name}`);

                try {
                    const response = await fetch(file.name);
                    if (!response.ok) {
                        throw new Error(`HTTP ${response.status} for ${file.name}`);
                    }
                    const buffer = await response.arrayBuffer();
                    zip.file(file.name, new Uint8Array(buffer));
                    addLine(`✅ Added: ${file.name} - ${file.desc}`);
                    success++;
                } catch (err) {
                    addLine(`❌ Error: ${file.name} - ${err.message}`);
                }
            }

            if (success === 0) {
                addLine('\\n❌ No files were added. Please check if the files are in the correct directory.');
                downloadBtn.disabled = false;
                downloadBtn.textContent = '📦 Download ZIP - Lively Wallpaper';
                return;
            }

            addLine('\\n📦 Creating ZIP file...');

            const blob = await zip.generateAsync({
                type: 'blob',
                compression: 'DEFLATE',
                compressionOptions: { level: 6 }
            });

            const a = document.createElement('a');
            const url = URL.createObjectURL(blob);
            a.href = url;
            a.download = 'Susuwatari.zip';
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);

            addLine(`\\n🎉 Download started: ${a.download}`);
            addLine(`📊 Total files: ${success}/${files.length}`);
            addLine('\\n✨ Ready! Now you can install Susuwatari on Lively Wallpaper!');

        } catch (error) {
            console.error('Download error:', error);
            statusDiv.textContent += `\\n❌ Error: ${error.message}`;
        } finally {
            downloadBtn.disabled = false;
            downloadBtn.textContent = '📦 Download ZIP - Lively Wallpaper';
        }
    });
}

// Make openSettingsPanel and audio functions globally available
window.openSettingsPanel = openSettingsPanel;
window.setupBrowserAudio = setupBrowserAudio;
window.cleanupBrowserAudio = cleanupBrowserAudio;

// Expose browser audio status
Object.defineProperty(window, 'browserAudioInitialized', {
    get: function () { return browserAudioInitialized; }
});





// Exportar para compatibilidade
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SusuwatariCanvas;
}