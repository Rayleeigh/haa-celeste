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

  // ── Load projects from missions.json ──────────────────────────────────────
  fetch('data/missions.json')
    .then((r) => r.json())
    .then((missions) => {
      const grid = document.getElementById('projects-grid');
      if (!grid) return;

      grid.innerHTML = missions
        .map((m) => {
          const type = m.type.charAt(0).toUpperCase() + m.type.slice(1);
          const desc = m.description ? `<p class="project-desc">${m.description}</p>` : '';
          const isExternal = m.link && (m.link.startsWith('http://') || m.link.startsWith('https://'));
          const attrs = isExternal ? 'target="_blank" rel="noopener noreferrer"' : '';
          return `<div class="project-card reveal">
  <span class="project-type">${type}</span>
  <h3 class="project-name">${m.title || m.name}</h3>
  ${desc}
  <a href="${m.link}" class="project-link" ${attrs}>View project</a>
</div>`.trim();
        })
        .join('');

      grid.querySelectorAll('.reveal').forEach((el) => observer.observe(el));
    })
    .catch(() => {});

  // ── Load stack (overview + mission panel) ──────────────────────────────────
  fetch('data/stack.json')
    .then((r) => r.json())
    .then((stack) => {
      const targets = ['stack-list', 'panel-stack-list'];
      targets.forEach((id) => {
        const el = document.getElementById(id);
        if (!el) return;

        if (id === 'stack-list') {
          el.innerHTML = stack
            .map(
              (s) =>
                `<span class="stack-tag">` +
                `<img src="https://skillicons.dev/icons?i=${s.icon}" alt="${s.name}" loading="lazy" />` +
                `${s.name}</span>`
            )
            .join('');
        } else {
          // Mission panel uses plain img elements
          el.innerHTML = stack
            .map(
              (s) =>
                `<img src="https://skillicons.dev/icons?i=${s.icon}" alt="${s.name}" title="${s.name}" loading="lazy" />`
            )
            .join('');
        }
      });
    })
    .catch(() => {});

  // ── Mission section label visibility ──────────────────────────────────────
  const missionSection = document.getElementById('mission-section');
  const missionLabels = document.getElementById('mission-labels');

  if (missionSection && missionLabels) {
    missionLabels.style.display = 'none';

    const missionObserver = new IntersectionObserver(
      ([entry]) => {
        missionLabels.style.display = entry.isIntersecting ? 'block' : 'none';
      },
      { threshold: 0.1 }
    );
    missionObserver.observe(missionSection);
  }

  // ── Sync mission panel data from main.js populated elements ───────────────
  function syncMissionPanel() {
    // Avatar
    const srcAvatar = document.getElementById('avatar-img');
    const panelAvatar = document.getElementById('panel-avatar');
    if (srcAvatar && panelAvatar && srcAvatar.src) panelAvatar.src = srcAvatar.src;

    // Name
    const srcName = document.getElementById('profile-name');
    const panelName = document.getElementById('panel-profile-name');
    if (srcName && panelName) panelName.textContent = srcName.textContent;

    // Stats
    const srcRepos = document.getElementById('stat-repos');
    const panelRepos = document.getElementById('panel-stat-repos');
    if (srcRepos && panelRepos) panelRepos.textContent = srcRepos.textContent;

    const srcFollowers = document.getElementById('stat-followers');
    const panelFollowers = document.getElementById('panel-stat-followers');
    if (srcFollowers && panelFollowers) panelFollowers.textContent = srcFollowers.textContent;
  }

  // Sync on load (main.js may already have run) and expose for globe.js to call
  syncMissionPanel();
  window.addEventListener('load', syncMissionPanel);
  window.syncMissionPanel = syncMissionPanel;

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
