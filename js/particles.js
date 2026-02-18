/**
 * Particle System
 * Creates ambient floating particles and connected networks for visual interest
 */

(() => {
  const ParticleSystem = class {
    constructor(containerSelector, options = {}) {
      this.container = document.querySelector(containerSelector);
      if (!this.container) return;

      this.options = {
        particleCount: options.particleCount || 50,
        particleSize: options.particleSize || 2,
        color: options.color || 'rgba(0, 240, 255, 0.3)',
        connectionColor: options.connectionColor || 'rgba(0, 240, 255, 0.1)',
        connectionDistance: options.connectionDistance || 150,
        speed: options.speed || 0.5,
        ...options,
      };

      this.particles = [];
      this.canvas = null;
      this.ctx = null;
      this.animationId = null;

      this.init();
    }

    init() {
      // Create canvas
      this.canvas = document.createElement('canvas');
      this.canvas.style.position = 'absolute';
      this.canvas.style.top = '0';
      this.canvas.style.left = '0';
      this.canvas.style.width = '100%';
      this.canvas.style.height = '100%';
      this.canvas.style.pointerEvents = 'none';
      this.canvas.style.zIndex = '0';

      this.container.style.position = 'relative';
      this.container.insertBefore(this.canvas, this.container.firstChild);

      this.ctx = this.canvas.getContext('2d');
      this.resize();

      // Create particles
      for (let i = 0; i < this.options.particleCount; i++) {
        this.particles.push(this.createParticle());
      }

      // Start animation
      this.animate();

      // Handle window resize
      window.addEventListener('resize', () => this.resize());
    }

    createParticle() {
      return {
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * this.options.speed,
        vy: (Math.random() - 0.5) * this.options.speed,
        radius: this.options.particleSize,
        opacity: Math.random() * 0.5 + 0.5,
      };
    }

    resize() {
      this.canvas.width = this.container.clientWidth;
      this.canvas.height = this.container.clientHeight;
    }

    animate = () => {
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      // Update and draw particles
      this.particles.forEach((particle, index) => {
        particle.x += particle.vx;
        particle.y += particle.vy;

        // Wrap around edges
        if (particle.x < 0) particle.x = this.canvas.width;
        if (particle.x > this.canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = this.canvas.height;
        if (particle.y > this.canvas.height) particle.y = 0;

        // Draw particle
        this.ctx.fillStyle = this.options.color.replace(')', `, ${particle.opacity})`);
        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
        this.ctx.fill();

        // Draw connections
        for (let i = index + 1; i < this.particles.length; i++) {
          const otherParticle = this.particles[i];
          const dx = particle.x - otherParticle.x;
          const dy = particle.y - otherParticle.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < this.options.connectionDistance) {
            const opacity =
              (1 - distance / this.options.connectionDistance) * 0.5;
            this.ctx.strokeStyle = this.options.connectionColor.replace(
              ')',
              `, ${opacity})`
            );
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(otherParticle.x, otherParticle.y);
            this.ctx.stroke();
          }
        }
      });

      this.animationId = requestAnimationFrame(this.animate);
    };

    destroy() {
      if (this.animationId) {
        cancelAnimationFrame(this.animationId);
      }
      if (this.canvas) {
        this.canvas.remove();
      }
    }
  };

  // ============================================================================
  // FLOATING PARTICLES EFFECT
  // ============================================================================

  window.FloatingParticles = class {
    constructor(options = {}) {
      this.particles = [];
      this.options = {
        count: options.count || 30,
        speed: options.speed || 0.5,
        size: options.size || 3,
        color: options.color || '#00f0ff',
        ...options,
      };

      this.init();
    }

    init() {
      const container = document.querySelector('body');
      if (!container) return;

      for (let i = 0; i < this.options.count; i++) {
        this.createFloatingParticle(container);
      }
    }

    createFloatingParticle(container) {
      const particle = document.createElement('div');
      particle.style.position = 'fixed';
      particle.style.width = this.options.size + 'px';
      particle.style.height = this.options.size + 'px';
      particle.style.borderRadius = '50%';
      particle.style.background = this.options.color;
      particle.style.opacity = Math.random() * 0.3 + 0.1;
      particle.style.pointerEvents = 'none';
      particle.style.zIndex = '0';

      const startX = Math.random() * window.innerWidth;
      const startY = Math.random() * window.innerHeight;
      const duration = Math.random() * 20 + 10;

      particle.style.left = startX + 'px';
      particle.style.top = startY + 'px';
      particle.style.animation = `float-up ${duration}s linear infinite`;
      particle.style.setProperty('--start-x', startX + 'px');
      particle.style.setProperty('--duration', duration + 's');

      container.appendChild(particle);
      this.particles.push(particle);
    }

    destroy() {
      this.particles.forEach((p) => p.remove());
      this.particles = [];
    }
  };

  // ============================================================================
  // SCROLL TRIGGERED PARTICLES
  // ============================================================================

  window.ScrollTriggeredParticles = (selector) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    elements.forEach((element) => {
      element.addEventListener('mouseenter', () => {
        const rect = element.getBoundingClientRect();
        for (let i = 0; i < 10; i++) {
          createBurstParticle(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2
          );
        }
      });
    });
  };

  function createBurstParticle(x, y) {
    const particle = document.createElement('div');
    particle.style.position = 'fixed';
    particle.style.left = x + 'px';
    particle.style.top = y + 'px';
    particle.style.width = '4px';
    particle.style.height = '4px';
    particle.style.borderRadius = '50%';
    particle.style.background = '#00f0ff';
    particle.style.pointerEvents = 'none';
    particle.style.zIndex = '999';

    const angle = Math.random() * Math.PI * 2;
    const velocity = Math.random() * 5 + 2;
    const vx = Math.cos(angle) * velocity;
    const vy = Math.sin(angle) * velocity;

    particle.style.animation = 'burst-fade 0.8s ease-out forwards';

    document.body.appendChild(particle);

    let px = x;
    let py = y;
    const duration = 800;
    const startTime = Date.now();

    const updatePosition = () => {
      const elapsed = Date.now() - startTime;
      const progress = elapsed / duration;

      if (progress < 1) {
        px += vx;
        py += vy;
        particle.style.left = px + 'px';
        particle.style.top = py + 'px';
        requestAnimationFrame(updatePosition);
      } else {
        particle.remove();
      }
    };

    updatePosition();
  }

  // ============================================================================
  // ADD ANIMATION KEYFRAMES TO DOCUMENT
  // ============================================================================

  const style = document.createElement('style');
  style.textContent = `
    @keyframes float-up {
      0% {
        transform: translateY(0) translateX(0);
        opacity: 0;
      }
      10% {
        opacity: var(--opacity, 0.3);
      }
      90% {
        opacity: var(--opacity, 0.3);
      }
      100% {
        transform: translateY(-100vh) translateX(var(--float-offset, 20px));
        opacity: 0;
      }
    }

    @keyframes burst-fade {
      0% {
        opacity: 1;
        transform: scale(1);
      }
      100% {
        opacity: 0;
        transform: scale(0);
      }
    }
  `;
  document.head.appendChild(style);

  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  window.ParticleSystem = ParticleSystem;

  // Initialize particle system if ambient container exists
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const ambient = document.querySelector('.ambient');
      if (ambient) {
        // Subtle ambient particles for the background
        new ParticleSystem('.ambient', {
          particleCount: 30,
          particleSize: 1.5,
          color: 'rgba(0, 240, 255, 0.15)',
          connectionColor: 'rgba(0, 240, 255, 0.05)',
          connectionDistance: 100,
          speed: 0.2,
        });
      }
    });
  } else {
    const ambient = document.querySelector('.ambient');
    if (ambient) {
      new ParticleSystem('.ambient', {
        particleCount: 30,
        particleSize: 1.5,
        color: 'rgba(0, 240, 255, 0.15)',
        connectionColor: 'rgba(0, 240, 255, 0.05)',
        connectionDistance: 100,
        speed: 0.2,
      });
    }
  }
})();
