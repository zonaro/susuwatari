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
        this.fleeDistance = 80;
        this.maxParticles = 100;
        this.particleSize = 18;
        this.minSize = 8;
        this.maxSize = 40;

        // Performance tracking
        this.lastFrameTime = Date.now();
        this.frameCount = 0;
        this.fps = 0;

        this.init();
    }

    init() {
        this.setupCanvas();
        this.setupEventListeners();
        this.createInitialParticles();
        this.animate();
    }

    setupCanvas() {
        this.resizeCanvas();
        // Configurar context para melhor performance
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

            // Atualiza o tamanho de todos os Susuwatari existentes
            this.particles.forEach(particle => {
                particle.baseSize = this.particleSize;
                particle.size = this.particleSize * particle.sizeMultiplier;
            });
        });

        // Left click - add particle
        this.canvas.addEventListener('click', (e) => {
            this.createParticle(e.clientX, e.clientY);
        });

        // Right click - remove particle
        this.canvas.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.removeNearestParticle(e.clientX, e.clientY);
        });

        // Window resize
        window.addEventListener('resize', () => {
            this.resizeCanvas();
        });
    }

    createParticle(x = null, y = null) {
        const posX = x !== null ? x : Math.random() * this.canvas.width;
        const posY = y !== null ? y : Math.random() * this.canvas.height;

        // Criar variação de tamanho: entre 85% e 115% do tamanho base
        const sizeVariation = 0.85 + Math.random() * 0.3; // 0.85 to 1.15

        // Gerar forma espinhosa única para cada Susuwatari
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
            baseSize: this.particleSize, // Tamanho base
            sizeMultiplier: sizeVariation, // Multiplicador único para este Susuwatari
            size: this.particleSize * sizeVariation, // Tamanho final com variação
            spikeCount: spikes, // Número de espinhos único
            spikePattern: spikePattern, // Padrão de espinhos único
            isFleeing: false,
            fleeStartTime: 0,
            wobbleOffset: Math.random() * Math.PI * 2,

            // Movement animation properties
            targetX: posX, // Initialize target to current position
            targetY: posY,
            velocityX: 0,
            velocityY: 0,
            fleeSpeed: 0.06, // Velocidade aumentada para movimento mais responsivo mas ainda suave

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

    checkParticleCollisions() {
        this.particles.forEach(particle => {
            const distance = Math.sqrt(
                Math.pow(particle.x - this.mouseX, 2) +
                Math.pow(particle.y - this.mouseY, 2)
            );

            // Sempre faz o Susuwatari correr na direção oposta do mouse
            if (distance < this.fleeDistance) {
                this.makeParticleFlee(particle);
            }
        });
    }

    makeParticleFlee(particle) {
        // Só atualiza se não estiver fugindo ou se for uma nova direção
        if (!particle.isFleeing) {
            particle.isFleeing = true;
            particle.fleeStartTime = Date.now();

            const angle = Math.atan2(particle.y - this.mouseY, particle.x - this.mouseX);
            const fleeDistance = 50 + Math.random() * 25; // Distância ligeiramente maior para movimento mais natural

            const newX = particle.x + Math.cos(angle) * fleeDistance;
            const newY = particle.y + Math.sin(angle) * fleeDistance;

            // Set target position instead of immediately teleporting
            particle.targetX = Math.max(particle.size / 2, Math.min(this.canvas.width - particle.size / 2, newX));
            particle.targetY = Math.max(particle.size / 2, Math.min(this.canvas.height - particle.size / 2, newY));

            setTimeout(() => {
                particle.isFleeing = false;
            }, 1200); // Tempo otimizado para resposta mais ágil
        }
    }

    updateParticleMovement() {
        this.particles.forEach(particle => {
            // Calculate distance to target
            const deltaX = particle.targetX - particle.x;
            const deltaY = particle.targetY - particle.y;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            if (distance > 0.3) { // Threshold menor para desaceleração mais gradual
                // Calculate velocity towards target com aceleração/desaceleração
                const baseSpeed = particle.isFleeing ? particle.fleeSpeed : particle.fleeSpeed * 0.15;

                // Aceleração: movimento mais rápido quando está longe do destino
                const accelerationFactor = particle.isFleeing ?
                    Math.min(2.5, 1 + distance * 0.02) : // Acelera mais quando fugindo
                    Math.min(1.8, 1 + distance * 0.01);  // Acelera menos quando voltando

                // Desaceleração mais suave: só começa a desacelerar muito perto do destino
                const decelerationFactor = distance < 15 ?
                    Math.max(0.3, distance / 15) : // Desaceleração mais gradual
                    1.0;

                const finalSpeed = baseSpeed * accelerationFactor * decelerationFactor;

                particle.velocityX = deltaX * finalSpeed;
                particle.velocityY = deltaY * finalSpeed;

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
        this.ctx.closePath();        // Fill with gradient
        const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, radius);
        gradient.addColorStop(0, '#3a3a3a');
        gradient.addColorStop(0.3, '#2a2a2a');
        gradient.addColorStop(0.7, '#1a1a1a');
        gradient.addColorStop(1, '#000000');

        this.ctx.fillStyle = gradient;
        this.ctx.fill();

        // Add shadow
        this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
        this.ctx.shadowBlur = 8;
        this.ctx.shadowOffsetX = 0;
        this.ctx.shadowOffsetY = 0;
        this.ctx.fill();
        this.ctx.shadowBlur = 0;

        // Add fuzzy texture with multiple small circles
        this.ctx.globalAlpha = 0.3;
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const radius = size * (0.1 + Math.random() * 0.2);
            const fuzzX = x + Math.cos(angle) * radius;
            const fuzzY = y + Math.sin(angle) * radius;

            this.ctx.fillStyle = `rgba(${60 + Math.random() * 20}, ${60 + Math.random() * 20}, ${60 + Math.random() * 20}, ${0.2 + Math.random() * 0.2})`;
            this.ctx.beginPath();
            this.ctx.arc(fuzzX, fuzzY, size * 0.08, 0, Math.PI * 2);
            this.ctx.fill();
        }

        this.ctx.globalAlpha = 1;

        // Draw eyes
        if (particle.eyeOpacity > 0) {
            const eyeSize = size * 0.17;
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
            const pupilSize = eyeSize * 0.4;

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
        // Remove off-screen particles
        this.particles = this.particles.filter(particle => {
            return particle.x > -50 && particle.x < this.canvas.width + 50 &&
                particle.y > -50 && particle.y < this.canvas.height + 50;
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    new SusuwatariCanvas();
});