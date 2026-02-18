/**
 * Animation Utilities Library
 * Provides reusable micro-interaction and animation functions
 */

(() => {
  // ============================================================================
  // RIPPLE EFFECT
  // ============================================================================

  const createRipple = (event) => {
    const button = event.currentTarget;
    const ripple = document.createElement('span');
    const rect = button.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;

    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    ripple.classList.add('ripple');

    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  };

  window.addRippleEffect = (selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      el.addEventListener('click', createRipple);
    });
  };

  // ============================================================================
  // COUNT-UP ANIMATION
  // ============================================================================

  window.countUp = (element, target, duration = 1000) => {
    if (!element || !target) return;

    target = parseInt(target);
    let current = 0;
    const increment = target / (duration / 16);
    const start = Date.now();

    const animate = () => {
      const elapsed = Date.now() - start;
      const progress = Math.min(elapsed / duration, 1);

      current = Math.floor(target * progress);
      element.textContent = current.toLocaleString();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  };

  // ============================================================================
  // STAGGER ANIMATION FOR LIST ITEMS
  // ============================================================================

  window.staggerChildren = (parentSelector, itemSelector, delay = 0.1) => {
    const parent = document.querySelector(parentSelector);
    if (!parent) return;

    const items = parent.querySelectorAll(itemSelector);
    items.forEach((item, index) => {
      item.style.setProperty('--stagger-delay', `${delay * index}s`);
      item.style.animation = `stagger-in 0.6s ease-out both var(--stagger-delay)`;
    });
  };

  // ============================================================================
  // SMOOTH HOVER LIFT EFFECT
  // ============================================================================

  window.addHoverLift = (selector, liftDistance = 4) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      el.addEventListener('mouseenter', () => {
        el.style.transform = `translateY(-${liftDistance}px)`;
        el.style.boxShadow = `0 ${liftDistance * 2}px ${liftDistance * 4}px rgba(0, 0, 0, 0.3)`;
      });

      el.addEventListener('mouseleave', () => {
        el.style.transform = 'translateY(0)';
        el.style.boxShadow = '';
      });
    });
  };

  // ============================================================================
  // GLOW PULSE EFFECT
  // ============================================================================

  window.addGlowPulse = (selector) => {
    const elements = document.querySelectorAll(selector);
    elements.forEach((el) => {
      el.style.animation = 'glow-pulse 2.5s ease-in-out infinite';
    });
  };

  // ============================================================================
  // SCROLL PARALLAX
  // ============================================================================

  window.enableParallax = (selector, speed = 0.5) => {
    const elements = document.querySelectorAll(selector);
    if (elements.length === 0) return;

    let ticking = false;
    let scrollY = 0;

    const updateParallax = () => {
      elements.forEach((el) => {
        const elementOffset = el.getBoundingClientRect().top;
        const distance = elementOffset * speed;
        el.style.transform = `translateY(${distance}px)`;
      });
      ticking = false;
    };

    window.addEventListener('scroll', () => {
      scrollY = window.scrollY;
      if (!ticking) {
        window.requestAnimationFrame(updateParallax);
        ticking = true;
      }
    });
  };

  // ============================================================================
  // SCROLL-TRIGGERED FADE-IN
  // ============================================================================

  window.enableScrollFadeIn = (selector, threshold = 0.1) => {
    const elements = document.querySelectorAll(selector);
    if (!('IntersectionObserver' in window)) {
      // Fallback: show all elements if IntersectionObserver not supported
      elements.forEach((el) => el.style.opacity = '1');
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          observer.unobserve(entry.target);
        }
      });
    }, { threshold });

    elements.forEach((el) => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.6s ease-out, transform 0.6s ease-out';
      observer.observe(el);
    });
  };

  // ============================================================================
  // MAGNETIC BUTTON EFFECT
  // ============================================================================

  window.enableMagneticButtons = (selector) => {
    const buttons = document.querySelectorAll(selector);
    buttons.forEach((button) => {
      button.addEventListener('mousemove', (e) => {
        const rect = button.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        const distance = Math.sqrt(x * x + y * y);

        if (distance < 50) {
          const angle = Math.atan2(y, x);
          const moveX = Math.cos(angle) * (50 - distance) * 0.3;
          const moveY = Math.sin(angle) * (50 - distance) * 0.3;

          button.style.transform = `translate(${moveX}px, ${moveY}px)`;
        }
      });

      button.addEventListener('mouseleave', () => {
        button.style.transform = 'translate(0, 0)';
      });
    });
  };

  // ============================================================================
  // CURSOR TRAIL EFFECT
  // ============================================================================

  window.enableCursorTrail = (selector, color = 'rgba(0, 240, 255, 0.6)') => {
    const targets = document.querySelectorAll(selector);

    targets.forEach((target) => {
      target.addEventListener('mousemove', (e) => {
        const trail = document.createElement('div');
        trail.style.position = 'fixed';
        trail.style.left = e.clientX + 'px';
        trail.style.top = e.clientY + 'px';
        trail.style.width = '8px';
        trail.style.height = '8px';
        trail.style.borderRadius = '50%';
        trail.style.background = color;
        trail.style.pointerEvents = 'none';
        trail.style.animation = 'trail-fade 0.8s ease-out forwards';
        trail.style.zIndex = '999';

        document.body.appendChild(trail);

        setTimeout(() => trail.remove(), 800);
      });
    });
  };

  // ============================================================================
  // TYPEWRITER EFFECT
  // ============================================================================

  window.typewriterEffect = (element, text, speed = 50) => {
    if (!element) return;

    element.textContent = '';
    let index = 0;

    const type = () => {
      if (index < text.length) {
        element.textContent += text.charAt(index);
        index++;
        setTimeout(type, speed);
      }
    };

    type();
  };

  // ============================================================================
  // THEME TOGGLE SUPPORT
  // ============================================================================

  window.initThemeToggle = () => {
    const htmlElement = document.documentElement;
    const savedTheme = localStorage.getItem('theme') || 'dark';

    // Set initial theme
    htmlElement.setAttribute('data-theme', savedTheme);

    // Create theme toggle button (optional, can be added to UI)
    window.toggleTheme = () => {
      const currentTheme = htmlElement.getAttribute('data-theme');
      const newTheme = currentTheme === 'dark' ? 'light' : 'dark';

      htmlElement.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);

      // Emit custom event for other scripts to listen to
      window.dispatchEvent(
        new CustomEvent('themechange', { detail: { theme: newTheme } })
      );
    };

    return savedTheme;
  };

  // ============================================================================
  // INITIALIZE ON DOM READY
  // ============================================================================

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAnimations);
  } else {
    initAnimations();
  }

  function initAnimations() {
    // Initialize theme
    initThemeToggle();

    // Add ripple effect to all buttons
    addRippleEffect('.hq-btn, .brief-btn, .briefing-nav-btn');

    // Add hover lift to cards and panels
    addHoverLift('.hq-stat, .brief-repo-card');

    // Add parallax to ambient elements
    enableParallax('.blob', 0.3);

    // Add scroll fade-in to doc content
    if (document.querySelector('.doc-body')) {
      enableScrollFadeIn('.brief-section');
    }

    // Add scroll triggered particles to interactive elements
    ScrollTriggeredParticles('.hq-btn, .brief-btn');

    // Count up stats when on homepage
    const statsElements = document.querySelectorAll('.hq-stat-value');
    if (statsElements.length > 0) {
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && !entry.target.classList.contains('counted')) {
              const target = entry.target.textContent;
              countUp(entry.target, target, 2000);
              entry.target.classList.add('counted');
            }
          });
        },
        { threshold: 0.5 }
      );

      statsElements.forEach((el) => observer.observe(el));
    }
  }
})();
