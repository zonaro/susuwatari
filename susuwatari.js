class Susuwatari {
    constructor() {
        this.particles = [];
        this.mouseX = 0;
        this.mouseY = 0;
        this.lastMouseMove = Date.now();
        this.isMouseStill = false;
        this.mouseStillTimeout = null;
        this.fleeDistance = 80;
        this.maxParticles = 100;
        this.particleSize = 18; // Tamanho atual dos Susuwatari
        this.minSize = 10;       // Tamanho mínimo
        this.maxSize = 120;      // Tamanho máximo
        this.cleanupCounter = 0; // Contador para otimizar limpeza

        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createInitialParticles();
        this.animate();
    }

    setupEventListeners() {
        document.addEventListener('mousemove', (e) => {
            this.mouseX = e.clientX;
            this.mouseY = e.clientY;
            this.lastMouseMove = Date.now();
            this.isMouseStill = false;

            // Limpar timeout anterior
            if (this.mouseStillTimeout) {
                clearTimeout(this.mouseStillTimeout);
            }

            // Configurar novo timeout para mouse parado
            this.mouseStillTimeout = setTimeout(() => {
                this.isMouseStill = true;
                this.refillScreen();
            }, 2000);

            this.checkParticleCollisions();
            this.updatePupils();
        });

        // Controle de scroll para alterar tamanho
        document.addEventListener('wheel', (e) => {
            e.preventDefault();

            if (e.deltaY < 0) {
                // Scroll up - aumentar tamanho
                this.particleSize = Math.min(this.maxSize, this.particleSize + 1);
            } else {
                // Scroll down - diminuir tamanho
                this.particleSize = Math.max(this.minSize, this.particleSize - 1);
            }

            this.updateParticlesSizes();
        });

        // Clique esquerdo - adicionar Susuwatari
        document.addEventListener('click', (e) => {
            this.createParticle(e.clientX, e.clientY);
        });

        // Clique direito - remover Susuwatari
        document.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.removeNearestParticle(e.clientX, e.clientY);
        });
    }

    updateParticlesSizes() {
        this.particles.forEach(particle => {
            particle.element.style.width = this.particleSize + 'px';
            particle.element.style.height = this.particleSize + 'px';

            // Atualizar tamanho dos olhos e pupilas proporcionalmente
            const eyeSize = Math.max(2, Math.floor(this.particleSize * 0.17));
            const eyePosition = Math.max(2, Math.floor(this.particleSize * 0.17));
            const pupilSize = Math.max(1, Math.floor(eyeSize * 0.4));

            particle.element.style.setProperty('--eye-size', eyeSize + 'px');
            particle.element.style.setProperty('--eye-position', eyePosition + 'px');
            particle.element.style.setProperty('--pupil-size', pupilSize + 'px');
        });
    }

    updatePupils() {
        this.particles.forEach(particle => {
            if (!particle.leftPupil || !particle.rightPupil) return;

            const rect = particle.element.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;

            const eyeSize = Math.max(2, Math.floor(this.particleSize * 0.17));
            const eyePosition = Math.max(2, Math.floor(this.particleSize * 0.17));

            // Calcular posição das pupilas baseada na direção do mouse
            const deltaX = this.mouseX - centerX;
            const deltaY = this.mouseY - centerY;
            const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

            // Limitar movimento da pupila dentro do olho
            const maxMove = eyeSize * 0.25;
            const moveX = distance > 0 ? (deltaX / distance) * Math.min(distance / 50, maxMove) : 0;
            const moveY = distance > 0 ? (deltaY / distance) * Math.min(distance / 50, maxMove) : 0;

            // Posições base dos olhos
            const leftEyeBaseX = eyePosition + eyeSize / 2;
            const rightEyeBaseX = this.particleSize - eyePosition - eyeSize / 2;
            const eyeBaseY = eyePosition + eyeSize / 2;

            // Atualizar posição das pupilas
            particle.leftPupil.style.left = (leftEyeBaseX + moveX) + 'px';
            particle.leftPupil.style.top = (eyeBaseY + moveY) + 'px';

            particle.rightPupil.style.left = (rightEyeBaseX + moveX) + 'px';
            particle.rightPupil.style.top = (eyeBaseY + moveY) + 'px';
        });
    }

    removeNearestParticle(mouseX, mouseY) {
        if (this.particles.length === 0) return;

        let nearestParticle = null;
        let nearestDistance = Infinity;

        this.particles.forEach((particle, index) => {
            const distance = Math.sqrt(
                Math.pow(particle.x - mouseX, 2) +
                Math.pow(particle.y - mouseY, 2)
            );

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestParticle = { particle, index };
            }
        });

        if (nearestParticle && nearestDistance < 100) { // Só remove se estiver próximo
            nearestParticle.particle.element.remove();
            this.particles.splice(nearestParticle.index, 1);
        }
    }

    createParticle(x = null, y = null) {
        const particle = document.createElement('div');
        particle.className = 'susuwatari';

        // Definir tamanho atual
        particle.style.width = this.particleSize + 'px';
        particle.style.height = this.particleSize + 'px';

        // Configurar variáveis CSS para olhos e pupilas
        const eyeSize = Math.max(2, Math.floor(this.particleSize * 0.17));
        const eyePosition = Math.max(2, Math.floor(this.particleSize * 0.17));
        const pupilSize = Math.max(1, Math.floor(eyeSize * 0.4));

        particle.style.setProperty('--eye-size', eyeSize + 'px');
        particle.style.setProperty('--eye-position', eyePosition + 'px');
        particle.style.setProperty('--pupil-size', pupilSize + 'px');

        // Criar pupilas
        const leftPupil = document.createElement('div');
        leftPupil.className = 'left-pupil';
        const rightPupil = document.createElement('div');
        rightPupil.className = 'right-pupil';

        particle.appendChild(leftPupil);
        particle.appendChild(rightPupil);

        // Posição aleatória se não especificada
        const posX = x !== null ? x : Math.random() * window.innerWidth;
        const posY = y !== null ? y : Math.random() * window.innerHeight; particle.style.left = posX + 'px';
        particle.style.top = posY + 'px';

        // Adicionar movimento sutil
        const wobbleX = (Math.random() - 0.5) * 2;
        const wobbleY = (Math.random() - 0.5) * 2;
        particle.style.transform = `translate(${wobbleX}px, ${wobbleY}px)`;

        document.body.appendChild(particle);

        const particleData = {
            element: particle,
            leftPupil: leftPupil,
            rightPupil: rightPupil,
            x: posX,
            y: posY,
            originalX: posX,
            originalY: posY,
            isFleeing: false,
            fleeStartTime: 0,
            wobbleOffset: Math.random() * Math.PI * 2
        };

        this.particles.push(particleData);
        return particleData;
    }

    createInitialParticles() {
        for (let i = 0; i < this.maxParticles; i++) {
            this.createParticle();
        }
    }

    checkParticleCollisions() {
        this.particles.forEach(particle => {
            const distance = Math.sqrt(
                Math.pow(particle.x - this.mouseX, 2) +
                Math.pow(particle.y - this.mouseY, 2)
            );

            if (distance < this.fleeDistance && !particle.isFleeing) {
                this.makeParticleFlee(particle);
            }
        });
    }

    makeParticleFlee(particle) {
        particle.isFleeing = true;
        particle.fleeStartTime = Date.now();
        particle.element.classList.add('fleeing');

        // Calcular direção de fuga
        const angle = Math.atan2(particle.y - this.mouseY, particle.x - this.mouseX);
        const fleeDistance = 100 + Math.random() * 50;

        const newX = particle.x + Math.cos(angle) * fleeDistance;
        const newY = particle.y + Math.sin(angle) * fleeDistance;

        // Manter dentro da tela
        const clampedX = Math.max(0, Math.min(window.innerWidth - this.particleSize, newX));
        const clampedY = Math.max(0, Math.min(window.innerHeight - this.particleSize, newY));

        particle.x = clampedX;
        particle.y = clampedY;

        particle.element.style.left = clampedX + 'px';
        particle.element.style.top = clampedY + 'px';

        // Resetar após um tempo
        setTimeout(() => {
            if (particle.element) {
                particle.element.classList.remove('fleeing');
                particle.isFleeing = false;
            }
        }, 1000);
    }

    refillScreen() {
        // Usar o método otimizado de limpeza
        this.cleanupOffscreenParticles();

        // Adicionar novas partículas se necessário
        const currentCount = this.particles.length;
        const neededCount = this.maxParticles - currentCount;

        for (let i = 0; i < neededCount; i++) {
            // Criar partículas longe do mouse
            let x, y, attempts = 0;
            do {
                x = Math.random() * window.innerWidth;
                y = Math.random() * window.innerHeight;
                attempts++;
            } while (
                attempts < 10 &&
                Math.sqrt(Math.pow(x - this.mouseX, 2) + Math.pow(y - this.mouseY, 2)) < this.fleeDistance * 1.5
            );

            this.createParticle(x, y);
        }
    }

    cleanupOffscreenParticles() {
        // Remover partículas que saíram completamente da tela para otimização
        const initialCount = this.particles.length;

        this.particles = this.particles.filter(particle => {
            const rect = particle.element.getBoundingClientRect();
            const margin = 100; // Margem extra antes de remover

            const isOffscreen = rect.right < -margin ||
                rect.left > window.innerWidth + margin ||
                rect.bottom < -margin ||
                rect.top > window.innerHeight + margin;

            if (isOffscreen) {
                // Remover elemento do DOM
                particle.element.remove();
                return false; // Remove do array
            }
            return true; // Mantém no array
        });

        // Debug opcional para monitorar performance
        // const removedCount = initialCount - this.particles.length;
        // if (removedCount > 0) {
        //     console.log(`Removidas ${removedCount} partículas fora da tela. Total restante: ${this.particles.length}`);
        // }
    }

    animate() {
        // Adicionar movimento sutil às partículas
        this.particles.forEach((particle, index) => {
            if (!particle.isFleeing) {
                const time = Date.now() * 0.001;
                const wobbleX = Math.sin(time + particle.wobbleOffset) * 0.5;
                const wobbleY = Math.cos(time * 0.7 + particle.wobbleOffset) * 0.3;

                particle.element.style.transform = `translate(${wobbleX}px, ${wobbleY}px)`;
            }
        });

        // Atualizar pupilas constantemente
        this.updatePupils();

        // Limpar partículas que saíram da tela (otimização - a cada 60 frames)
        this.cleanupCounter++;
        if (this.cleanupCounter >= 60) {
            this.cleanupOffscreenParticles();
            this.cleanupCounter = 0;
        }

        requestAnimationFrame(() => this.animate());
    }
}

// Inicializar quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    new Susuwatari();
});

// Recriar partículas quando a janela for redimensionada
window.addEventListener('resize', () => {
    // Aguardar um pouco para a janela terminar de redimensionar
    setTimeout(() => {
        const existingParticles = document.querySelectorAll('.susuwatari');
        existingParticles.forEach(particle => particle.remove());

        new Susuwatari();
    }, 100);
});