(() => {
  // ── Reveal on scroll ───────────────────────────────────────────────────────
  const reveals = document.querySelectorAll('.reveal');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach(({ target, isIntersecting }) => {
        if (isIntersecting) target.classList.add('visible');
      });
    },
    { threshold: 0.12 }
  );

  reveals.forEach((el) => observer.observe(el));

  // ── Nav scrolled state ─────────────────────────────────────────────────────
  const nav = document.getElementById('nav');
  if (nav) {
    const updateNav = () => nav.classList.toggle('scrolled', window.scrollY > 40);
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  // ── Mobile nav toggle ───────────────────────────────────────────────────────
  const navBrand = document.getElementById('nav-brand');
  const navLinks = document.getElementById('nav-links');
  if (navBrand && navLinks && nav) {
    const openMenu  = () => { nav.classList.add('menu-open');    navBrand.setAttribute('aria-expanded', 'true'); };
    const closeMenu = () => { nav.classList.remove('menu-open'); navBrand.setAttribute('aria-expanded', 'false'); };
    const toggleMenu = () => nav.classList.contains('menu-open') ? closeMenu() : openMenu();

    navBrand.addEventListener('click', toggleMenu);

    // Close when any link is tapped
    navLinks.querySelectorAll('.site-nav-link').forEach(link => {
      link.addEventListener('click', closeMenu);
    });

    // Close on outside tap
    document.addEventListener('click', e => {
      if (nav.classList.contains('menu-open') && !nav.contains(e.target)) closeMenu();
    }, { passive: true });

    // Close on scroll (user is navigating)
    window.addEventListener('scroll', () => {
      if (nav.classList.contains('menu-open')) closeMenu();
    }, { passive: true });
  }

  // ── Load stack tags ────────────────────────────────────────────────────────
  fetch('data/stack.json')
    .then((r) => r.json())
    .then((stack) => {
      const el = document.getElementById('stack-list');
      if (!el) return;

      const validStack = stack.filter((item) => item && item.name && item.icon);
      el.innerHTML = validStack
        .map(
          (item) =>
            `<span class="stack-tag">` +
            `<img src="https://skillicons.dev/icons?i=${item.icon}" alt="${item.name}" loading="lazy" />` +
            `${item.name}</span>`
        )
        .join('');
    })
    .catch(() => {});

  // ── Discord link from profile.json ────────────────────────────────────────
  fetch('data/profile.json')
    .then((r) => r.json())
    .then((profile) => {
      const discordLink = document.getElementById('discord-link');
      const discordHandle = document.getElementById('discord-handle');
      if (profile.discord && discordLink) {
        discordLink.href = profile.discord;
        discordLink.setAttribute('target', '_blank');
        discordLink.setAttribute('rel', 'noopener noreferrer');
        if (discordHandle) {
          discordHandle.textContent = profile.discord_handle || 'Discord';
        }
      }
    })
    .catch(() => {});
})();
