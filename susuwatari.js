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
        this.sleepTime = 10; // Time in seconds before Susuwatari fall asleep when mouse is still
        this.sleepEnabled = true; // Toggle to enable/disable sleep system
        this.restTimeout = 5; // Time in seconds to rest when dizzy/tired (configurable)

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

        // Mouse movement tracking for dizziness detection
        this.mouseHistory = []; // Track recent mouse positions
        this.maxMouseHistoryLength = 20; // Keep last 20 positions (increased from 10)

        this.init();
    }

    // Audio listener function for Wallpaper Engine
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

        if (properties.sleep_time) {
            this.sleepTime = properties.sleep_time.value;
        }

        if (properties.sleep_enabled) {
            this.sleepEnabled = properties.sleep_enabled.value;

            // If sleep is disabled, wake up all sleeping particles
            if (!this.sleepEnabled) {
                this.particles.forEach(particle => {
                    if (particle.isSleeping) {
                        particle.isSleeping = false;
                        particle.zzz = []; // Clear sleep animation
                    }
                });
            }
        }

        if (properties.rest_timeout) {
            this.restTimeout = properties.rest_timeout.value;
        }

        // Background image property (supports both Wallpaper Engine file paths and Lively Wallpaper URLs/paths)
        if (properties.background_image || properties.background_image_picker) {
            let imageValue = '';

            // Check if user used the file picker
            if (properties.background_image_picker && properties.background_image_picker.value && properties.background_image_picker.value.trim() !== '') {
                imageValue = properties.background_image_picker.value;

                // Update the text input field with the selected file path (for Wallpaper Engine sync)
                if (typeof window.wallpaperPropertyListener !== 'undefined') {
                    // Set the text input to match the file picker selection
                    setTimeout(() => {
                        window.wallpaperPropertyListener.applyUserProperties({
                            background_image: { value: imageValue }
                        });
                    }, 100);
                }
            }
            // Otherwise use the text input value
            else if (properties.background_image && properties.background_image.value && properties.background_image.value.trim() !== '') {
                imageValue = properties.background_image.value;
            }

            if (imageValue && imageValue.trim() !== '') {
                let imageUrl;

                // Check if it's already a URL (starts with http:// or https://)
                if (imageValue.startsWith('http://') || imageValue.startsWith('https://')) {
                    imageUrl = imageValue;
                } else if (imageValue.startsWith('file://')) {
                    // Already a file URL
                    imageUrl = imageValue;
                } else {
                    // Assume it's a local file path (from Wallpaper Engine or Lively with local path)
                    imageUrl = 'file:///' + imageValue.replace(/\\/g, '/');
                }

                document.body.style.backgroundImage = `url('${imageUrl}')`;
                document.body.style.background = `url('${imageUrl}') center/cover no-repeat`;
                console.log('Background image set:', imageUrl);
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

            // Check for dizziness-inducing rapid movement around Susuwatari
            this.checkForDizziness();

            // Wake up all sleeping Susuwatari when mouse moves (only if sleep is enabled)
            if (this.sleepEnabled) {
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

            if (e.ctrlKey) {
                this.createParticle(e.clientX, e.clientY);
            } else if (e.shiftKey) {
                this.createCollectible(e.clientX, e.clientY, true);
            } else if (e.altKey) {
                this.createCollectible(e.clientX, e.clientY, false);
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
        const posX = x !== null ? x : Math.random() * this.canvas.width;
        const posY = y !== null ? y : Math.random() * this.canvas.height;

        // Create size variation: between 85% and 115% of base size
        const sizeVariation = 0.85 + Math.random() * 0.3; // 0.85 to 1.15

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
            size: this.particleSize * sizeVariation, // Final size with variation
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

    createCollectible(x, y, isCoal) {
        // Randomly choose between coal stone (50%) or colored star (50%)
        if (isCoal === undefined) {
            isCoal = Math.random() < 0.5;
        }

        // Get average Susuwatari size for scaling
        const avgSusuwatariSize = this.particles.length > 0 ?
            this.particles.reduce((sum, p) => sum + p.size, 0) / this.particles.length :
            this.initialSize;

        let collectibleSize;
        if (isCoal) {
            // Coal: 50% to 150% of Susuwatari size
            const sizeMultiplier = 0.5 + Math.random() * 1.0; // 0.5 to 1.5
            collectibleSize = avgSusuwatariSize * sizeMultiplier;
        } else {
            // Stars: ALWAYS smaller than Susuwatari (30% to 90%)
            const sizeMultiplier = 0.3 + Math.random() * 0.6; // 0.3 to 0.9
            collectibleSize = avgSusuwatariSize * sizeMultiplier;
        }

        const collectible = {
            x: x,
            y: y,
            type: isCoal ? 'coal' : 'star',
            size: collectibleSize,
            color: isCoal ? '#111111' : this.getRandomStarColor(), // Much darker coal color
            rotation: Math.random() * Math.PI * 2, // Random rotation for visual variety
            createdTime: Date.now(),
            pulseOffset: Math.random() * Math.PI * 2, // For gentle pulsing animation
            sparkles: isCoal ? [] : this.createSparkles(), // Stars have sparkle effects
            coalShape: isCoal ? this.generateCoalShape() : null, // Pre-generated coal shape
            assignedTo: null, // Which Susuwatari is assigned to collect this
            isLargerThanSusuwatari: collectibleSize > avgSusuwatariSize // Flag for explosion check
        };

        this.collectibles.push(collectible);

        // Assign a random Susuwatari to collect this item
        this.assignCollectibleToSusuwatari(collectible);

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
        }

        // Restart collection animation - reassign collectibles to Susuwatari
        this.reassignAllCollectibles();
    }

    createCollectibleAt(x, y, size, isCoal) {
        const avgSusuwatariSize = this.particles.length > 0 ?
            this.particles.reduce((sum, p) => sum + p.size, 0) / this.particles.length :
            this.initialSize;

        const collectible = {
            x: x,
            y: y,
            type: isCoal ? 'coal' : 'star',
            size: size,
            color: isCoal ? '#111111' : this.getRandomStarColor(),
            rotation: Math.random() * Math.PI * 2,
            createdTime: Date.now(),
            pulseOffset: Math.random() * Math.PI * 2,
            sparkles: isCoal ? [] : this.createSparkles(),
            coalShape: isCoal ? this.generateCoalShape() : null,
            assignedTo: null,
            isLargerThanSusuwatari: size > avgSusuwatariSize
        };

        this.collectibles.push(collectible);
        this.assignCollectibleToSusuwatari(collectible);
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

        // Reassign all collectibles
        this.collectibles.forEach(collectible => {
            this.assignCollectibleToSusuwatari(collectible);
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
                } const finalSpeed = baseSpeed * accelerationFactor * decelerationFactor * energyFactor;

                particle.velocityX = deltaX * finalSpeed;
                particle.velocityY = deltaY * finalSpeed;

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

        // Update sleep system (only if sleep is enabled)
        if (this.sleepEnabled && (this.isMouseStill || Date.now() - this.lastMouseMove > this.sleepTime * 1000)) {
            const currentTime = Date.now();

            this.particles.forEach(particle => {
                // Don't make fleeing, tired, dizzy, or collectible-seeking particles sleep
                if (particle.isFleeing || particle.isTired || particle.isDizzy || particle.isSeekingCollectible) {
                    return;
                }

                // Check if particle should start sleeping
                if (!particle.isSleeping && Date.now() - this.lastMouseMove > this.sleepTime * 1000) {
                    particle.isSleeping = true;
                    particle.sleepStartTime = currentTime;
                    particle.zzz = []; // Initialize Z animation array
                }

                // Update Z animation for sleeping particles
                if (particle.isSleeping) {
                    // Add new Z every 1.5-2.5 seconds
                    const timeSinceSleep = currentTime - particle.sleepStartTime;
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
    }

    updateCollectibles() {
        const currentTime = Date.now();

        // Update collectibles and check for collection
        this.collectibles = this.collectibles.filter(collectible => {
            // Check if assigned Susuwatari reached the collectible
            if (collectible.assignedTo) {
                const susuwatari = collectible.assignedTo;
                const distance = Math.sqrt(
                    Math.pow(susuwatari.x - collectible.x, 2) +
                    Math.pow(susuwatari.y - collectible.y, 2)
                );

                // Collection distance threshold
                const collectionDistance = susuwatari.size / 2 + collectible.size;

                if (distance < collectionDistance) {
                    // Check if collectible is larger than Susuwatari - if so, explode!
                    if (collectible.isLargerThanSusuwatari && collectible.size > susuwatari.size) {
                        // Create explosion effect like when clicked
                        this.createSmokeExplosion(susuwatari.x, susuwatari.y, susuwatari.size);

                        // Remove the Susuwatari that touched the large collectible
                        const particleIndex = this.particles.indexOf(susuwatari);
                        if (particleIndex > -1) {
                            this.particles.splice(particleIndex, 1);
                        }                        // Create collection effect for the collectible
                        this.createCollectionEffect(collectible.x, collectible.y, collectible.type, collectible.color);

                        // If it's a coal stone, leave soot stain at the location
                        if (collectible.type === 'coal') {
                            this.createSootStain(collectible.x, collectible.y, collectible.size * 1.5);
                        }

                        return false; // Remove collectible
                    } else {
                        // Normal collection for smaller collectibles
                        susuwatari.targetCollectible = null;
                        susuwatari.isSeekingCollectible = false;

                        // Create collection effect
                        this.createCollectionEffect(collectible.x, collectible.y, collectible.type, collectible.color);

                        // If it's a coal stone, leave soot stain at the location
                        if (collectible.type === 'coal') {
                            this.createSootStain(collectible.x, collectible.y, collectible.size * 1.5);
                        }

                        return false; // Remove collectible
                    }
                }

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
        const particleCount = type === 'star' ? 8 : 5;

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

        // Draw eyes (skip if sleeping and sleep is enabled)
        if (particle.eyeOpacity > 0 && !(this.sleepEnabled && particle.isSleeping)) {
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

        // Draw sleep Z's if sleeping and sleep is enabled
        if (this.sleepEnabled && particle.isSleeping && particle.zzz.length > 0) {
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
            do {
                x = Math.random() * this.canvas.width;
                y = Math.random() * this.canvas.height;
                attempts++;
            } while (
                attempts < 10 &&
                Math.sqrt(Math.pow(x - this.mouseX, 2) + Math.pow(y - this.mouseY, 2)) < this.fleeDistance * 1.5
            );

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

// Global functions required for Wallpaper Engine
window.wallpaperPropertyListener = {
    applyUserProperties: function (properties) {
        if (susuwatariInstance) {
            susuwatariInstance.applyUserProperties(properties);
        }
    }
};

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
        'sleepTime': 'sleep_time',
        'sleepEnabled': 'sleep_enabled',
        'restTimeout': 'rest_timeout',
        'backgroundImageUrl': 'background_image'
    };

    const wallpaperPropertyName = livelyToWallpaperMap[name];
    if (wallpaperPropertyName) {
        // Create property object in Wallpaper Engine format
        const properties = {};
        properties[wallpaperPropertyName] = { value: val };
        susuwatariInstance.applyUserProperties(properties);
    }
}




// Initialize the wallpaper
document.addEventListener('DOMContentLoaded', function () {
    susuwatariInstance = new SusuwatariCanvas();

    // Detect which wallpaper engine is running
    const isBrowserMode = this.location.href == 'https://zonaro.github.io/susuwatari/' || this.location.search.includes('browser=1');
    const isWallpaperEngine = typeof window.wallpaperRegisterAudioListener !== 'undefined';
    const isLivelyWallpaper = !isBrowserMode && !isWallpaperEngine;

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
            'sleepTime': 10,
            'sleepEnabled': true,
            'restTimeout': 5,
            'backgroundImageUrl': ''
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
                sleepTime: 10,
                sleepEnabled: true,
                restTimeout: 5,
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
        'sleepTime': 'sleep_time',
        'sleepEnabled': 'sleep_enabled',
        'restTimeout': 'rest_timeout',
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