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

        // Limits for manual interaction
        this.minSize = 10;
        this.maxSize = 150;

        // Smoke particle system for explosions
        this.smokeParticles = [];

        // Soot trail system
        this.trailParticles = [];

        // Permanent soot stain system
        this.sootStains = [];

        // Performance tracking
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.fps = 0;

        this.init();
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
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.lastMouseMove = Date.now();
            this.isMouseStill = false;

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

            // If a Susuwatari was clicked, remove it. If there is no susuwatari, create a new one
            if (clickedIndex !== -1) {
                const removedParticle = this.particles[clickedIndex];
                this.createSmokeExplosion(removedParticle.x, removedParticle.y, removedParticle.size);
                this.createSootStain(removedParticle.x, removedParticle.y, removedParticle.size);
                this.particles.splice(clickedIndex, 1);
                this.updateUI();
            } else {
                this.createParticle(e.clientX, e.clientY);
            }
        });

        // Toggle UI info with right click on screen
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            const uiInfo = document.querySelector('.ui-info');
            if (uiInfo.style.display === 'none') {
                uiInfo.style.display = 'block';
            } else {
                uiInfo.style.display = 'none';
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
            isFleeing: false,
            fleeStartTime: 0,
            wobbleOffset: Math.random() * Math.PI * 2,

            // Movement animation properties
            targetX: posX, // Initialize target to current position
            targetY: posY,
            velocityX: 0,
            velocityY: 0,
            fleeSpeed: 0.06, // Increased speed for more responsive but still smooth movement

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

            // Desenhar manchas internas irregulares
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

            // Always makes the Susuwatari run in the opposite direction from the mouse
            if (distance < this.fleeDistance) {
                this.makeParticleFlee(particle);
            }
        });
    }

    makeParticleFlee(particle) {
        // Only update if not fleeing or if it's a new direction
        if (!particle.isFleeing) {
            particle.isFleeing = true;
            particle.fleeStartTime = Date.now();

            const angle = Math.atan2(particle.y - this.mouseY, particle.x - this.mouseX);
            const fleeDistance = 80 + Math.random() * 60; // Much larger distance: 80-140 pixels

            const newX = particle.x + Math.cos(angle) * fleeDistance;
            const newY = particle.y + Math.sin(angle) * fleeDistance;

            // Set target position instead of immediately teleporting
            particle.targetX = Math.max(particle.size / 2, Math.min(this.canvas.width - particle.size / 2, newX));
            particle.targetY = Math.max(particle.size / 2, Math.min(this.canvas.height - particle.size / 2, newY));

            setTimeout(() => {
                particle.isFleeing = false;
            }, 1200); // Optimized time for more agile response
        }
    }

    updateParticleMovement() {
        this.particles.forEach(particle => {
            // Calculate distance to target
            const deltaX = particle.targetX - particle.x;
            const deltaY = particle.targetY - particle.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 0.3) { // Smaller threshold for more gradual deceleration
                // Calculate velocity towards target with acceleration/deceleration
                const baseSpeed = particle.isFleeing ? particle.fleeSpeed : particle.fleeSpeed * 0.15;

                // Acceleration: much faster movement when far from destination
                const accelerationFactor = particle.isFleeing ?
                    Math.min(this.fleeAcceleration, 1 + distance * 0.04) : // Uses customizable property
                    Math.min(1.8, 1 + distance * 0.01);  // Acelera menos quando voltando

                // Smoother deceleration: only starts to decelerate very close to destination
                const decelerationFactor = distance < 15 ?
                    Math.max(0.3, distance / 15) : // More gradual deceleration
                    1.0;

                const finalSpeed = baseSpeed * accelerationFactor * decelerationFactor;

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
                particle.x += particle.velocityX;
                particle.y += particle.velocityY;
            } else {
                // Snap to target if very close
                particle.x = particle.targetX;
                particle.y = particle.targetY;
                particle.velocityX = 0;
                particle.velocityY = 0;
            }

            // If not fleeing, slowly return to a more natural position
            if (!particle.isFleeing && distance < 2) {
                // Set target to slightly wobble around current position
                const wobbleAmount = 5;
                particle.targetX = particle.x + (Math.random() - 0.5) * wobbleAmount;
                particle.targetY = particle.y + (Math.random() - 0.5) * wobbleAmount;

                // Keep within canvas bounds
                particle.targetX = Math.max(particle.size / 2, Math.min(this.canvas.width - particle.size / 2, particle.targetX));
                particle.targetY = Math.max(particle.size / 2, Math.min(this.canvas.height - particle.size / 2, particle.targetY));
            }
        });
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

            // Calculate pupil position based on mouse direction
            const deltaX = this.mouseX - particle.x;
            const deltaY = this.mouseY - particle.y;
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

    drawSusuwatari(particle) {
        const x = particle.x;
        const y = particle.y;
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

        // Create spiky path using the particle's unique pattern
        this.ctx.beginPath();
        for (let i = 0; i < particle.spikeCount; i++) {
            const angle = (i / particle.spikeCount) * Math.PI * 2;
            const radiusMultiplier = particle.spikePattern[i];
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

        // Draw eyes
        if (particle.eyeOpacity > 0) {
            // Olhos maiores e pupilas dilatadas quando fugindo (efeito de susto)
            const baseEyeSize = size * 0.17;
            const eyeSize = particle.isFleeing ? baseEyeSize * 1.4 : baseEyeSize; // 40% maiores quando fugindo
            const eyePosition = size * 0.17;

            this.ctx.globalAlpha = particle.eyeOpacity;

            // Left eye
            const leftEyeX = x - eyePosition;
            const leftEyeY = y - eyePosition;

            // Eye gradient
            const eyeGradient = this.ctx.createRadialGradient(leftEyeX, leftEyeY, 0, leftEyeX, leftEyeY, eyeSize / 2);
            eyeGradient.addColorStop(0, '#ffffff');
            eyeGradient.addColorStop(0.8, '#f0f0f0');
            eyeGradient.addColorStop(1, '#e0e0e0');

            this.ctx.fillStyle = eyeGradient;
            this.ctx.beginPath();
            this.ctx.arc(leftEyeX, leftEyeY, eyeSize / 2, 0, Math.PI * 2);
            this.ctx.fill();

            // Right eye
            const rightEyeX = x + eyePosition;
            const rightEyeY = y - eyePosition;

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
            // Pupilas dilatadas quando fugindo (efeito de susto/medo)
            const basePupilSize = eyeSize * 0.4;
            const pupilSize = particle.isFleeing ? basePupilSize * 1.6 : basePupilSize; // 60% maiores quando fugindo

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

            // Add eye highlights
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
        document.getElementById('count').textContent = this.particles.length;
    }

    calculateFPS() {
        this.frameCount++;
        const currentTime = Date.now();

        if (currentTime - this.lastFrameTime >= 1000) {
            this.fps = this.frameCount;
            this.frameCount = 0;
            this.lastFrameTime = currentTime;
            document.getElementById('fps').textContent = this.fps;
        }
    }

    animate() {
        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Update particle movement (smooth animation)
        this.updateParticleMovement();

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

        // Update UI
        this.calculateFPS();

        requestAnimationFrame(() => this.animate());
    }
}

// Global instance for Wallpaper Engine
let susuwatariInstance = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    susuwatariInstance = new SusuwatariCanvas();
});

// Global functions required for Wallpaper Engine
window.wallpaperPropertyListener = {
    applyUserProperties: function (properties) {
        if (susuwatariInstance) {
            susuwatariInstance.applyUserProperties(properties);
        }
    }
};

// Alternative function for compatibility
if (typeof window.wallpaperRegisterAudioListener === 'undefined') {
    window.wallpaperRegisterAudioListener = function () { };
}

// Exportar para compatibilidade
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SusuwatariCanvas;
}