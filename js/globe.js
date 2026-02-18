(() => {
  /* ─── Configuration ───────────────────────────────────── */
  const GLOBE_RADIUS = 1.8;
  const MARKER_SIZE = 0.07;
  const AUTO_ROTATE_SPEED = 0.0006;
  const CAMERA_DISTANCE = 7;
  const FLY_DURATION = 1200; // ms

  const MISSIONS = [
    { id: "about",    label: "About Me",    desc: "Who I am & what I do",       lat: 40,  lon: -100, tpl: "tpl-about",    title: "OPERATIVE DOSSIER" },
    { id: "projects", label: "Projects",    desc: "Featured repositories",      lat: 50,  lon: 10,   tpl: "tpl-projects", title: "ACTIVE OPERATIONS" },
    { id: "stack",    label: "Tech Stack",  desc: "Languages, tools & infra",   lat: 35,  lon: 105,  tpl: "tpl-stack",    title: "ARSENAL" },
    { id: "homelab",  label: "Homelab",     desc: "Self-hosted documentation",  lat: -15, lon: -55,  tpl: "tpl-homelab",  title: "BASE OF OPERATIONS" },
    { id: "naming",   label: "Naming",      desc: "HAA naming convention",      lat: 5,   lon: 25,   tpl: "tpl-naming",   title: "DESIGNATION PROTOCOL" },
    { id: "contact",  label: "Contact",     desc: "Get in touch",               lat: -30, lon: 135,  tpl: "tpl-contact",  title: "COMMS CHANNEL" },
  ];

  /* ─── Helpers ─────────────────────────────────────────── */
  function latLonToVec3(lat, lon, r) {
    const phi = (90 - lat) * (Math.PI / 180);
    const theta = (lon + 180) * (Math.PI / 180);
    return new THREE.Vector3(
      -r * Math.sin(phi) * Math.cos(theta),
       r * Math.cos(phi),
       r * Math.sin(phi) * Math.sin(theta)
    );
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  /* ─── Scene Setup ─────────────────────────────────────── */
  const container = document.getElementById("globe-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
  camera.position.set(0, 1, CAMERA_DISTANCE);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.setClearColor(0x0a0e17, 1);
  container.appendChild(renderer.domElement);

  /* ─── Controls ────────────────────────────────────────── */
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.4;
  controls.minPolarAngle = Math.PI * 0.2;
  controls.maxPolarAngle = Math.PI * 0.8;

  /* ─── Lighting ────────────────────────────────────────── */
  const ambientLight = new THREE.AmbientLight(0x334466, 0.6);
  scene.add(ambientLight);

  const dirLight = new THREE.DirectionalLight(0x00f0ff, 0.3);
  dirLight.position.set(5, 3, 5);
  scene.add(dirLight);

  /* ─── Globe Group ─────────────────────────────────────── */
  const globeGroup = new THREE.Group();
  scene.add(globeGroup);

  /* ─── Wireframe Sphere ────────────────────────────────── */
  const wireGeo = new THREE.SphereGeometry(GLOBE_RADIUS, 48, 48);
  const wireMat = new THREE.MeshBasicMaterial({
    color: 0x00f0ff,
    wireframe: true,
    transparent: true,
    opacity: 0.07,
  });
  const wireSphere = new THREE.Mesh(wireGeo, wireMat);
  globeGroup.add(wireSphere);

  /* ─── Solid inner sphere (subtle fill) ────────────────── */
  const innerGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 0.995, 64, 64);
  const innerMat = new THREE.MeshPhongMaterial({
    color: 0x0a1628,
    transparent: true,
    opacity: 0.85,
    shininess: 5,
  });
  const innerSphere = new THREE.Mesh(innerGeo, innerMat);
  globeGroup.add(innerSphere);

  /* ─── Latitude / Longitude Lines ──────────────────────── */
  const lineMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.12 });

  // Latitude lines
  for (let lat = -60; lat <= 60; lat += 30) {
    const pts = [];
    for (let lon = 0; lon <= 360; lon += 4) {
      pts.push(latLonToVec3(lat, lon, GLOBE_RADIUS + 0.005));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    globeGroup.add(new THREE.Line(geo, lineMat));
  }

  // Longitude lines
  for (let lon = 0; lon < 360; lon += 30) {
    const pts = [];
    for (let lat = -90; lat <= 90; lat += 4) {
      pts.push(latLonToVec3(lat, lon, GLOBE_RADIUS + 0.005));
    }
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    globeGroup.add(new THREE.Line(geo, lineMat));
  }

  /* ─── Atmosphere Glow ─────────────────────────────────── */
  const glowGeo = new THREE.SphereGeometry(GLOBE_RADIUS * 1.12, 64, 64);
  const glowMat = new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      void main() {
        float intensity = pow(0.62 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 3.0);
        gl_FragColor = vec4(0.0, 0.94, 1.0, intensity * 0.35);
      }
    `,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
  });
  const glowMesh = new THREE.Mesh(glowGeo, glowMat);
  globeGroup.add(glowMesh);

  /* ─── Star Particles ──────────────────────────────────── */
  const starCount = 1200;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const r = 15 + Math.random() * 30;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPositions[i * 3 + 2] = r * Math.cos(phi);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6 });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ─── Mission Markers (3D) ────────────────────────────── */
  const markerMeshes = [];
  const markerGeo = new THREE.SphereGeometry(MARKER_SIZE, 16, 16);

  MISSIONS.forEach((m) => {
    const pos = latLonToVec3(m.lat, m.lon, GLOBE_RADIUS + 0.04);
    const mat = new THREE.MeshBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.9 });
    const mesh = new THREE.Mesh(markerGeo, mat);
    mesh.position.copy(pos);
    mesh.userData = m;
    globeGroup.add(mesh);
    markerMeshes.push(mesh);

    // Pillar line from surface
    const pillarGeo = new THREE.BufferGeometry().setFromPoints([
      latLonToVec3(m.lat, m.lon, GLOBE_RADIUS),
      latLonToVec3(m.lat, m.lon, GLOBE_RADIUS + 0.18),
    ]);
    const pillarMat = new THREE.LineBasicMaterial({ color: 0x00f0ff, transparent: true, opacity: 0.35 });
    globeGroup.add(new THREE.Line(pillarGeo, pillarMat));
  });

  /* ─── HTML Mission Labels ─────────────────────────────── */
  const labelContainer = document.getElementById("mission-labels");
  const labelElements = {};

  MISSIONS.forEach((m) => {
    const el = document.createElement("div");
    el.className = "mission-label";
    el.dataset.mission = m.id;
    el.innerHTML = `
      <div class="mission-dot"></div>
      <span class="mission-name">${m.label}</span>
      <span class="mission-desc">${m.desc}</span>
    `;
    el.addEventListener("click", () => {
      selectMission(m.id);
      dismissHint();
    });
    labelContainer.appendChild(el);
    labelElements[m.id] = el;
  });

  /* ─── Quick Select Sidebar ────────────────────────────── */
  const qsToggle = document.getElementById("quickselect-toggle");
  const qsPanel = document.getElementById("quickselect-panel");
  const qsClose = document.getElementById("quickselect-close");
  const qsList = document.getElementById("quickselect-list");
  const qsItems = {};

  MISSIONS.forEach((m, i) => {
    const li = document.createElement("li");
    li.className = "qs-item";
    li.dataset.mission = m.id;
    li.innerHTML = `
      <span class="qs-index">${String(i + 1).padStart(2, "0")}</span>
      <span class="qs-item-label">${m.label}</span>
      <span class="qs-item-desc">${m.desc}</span>
    `;
    li.addEventListener("click", () => {
      selectMission(m.id);
      dismissHint();
      closeQuickSelect();
    });
    qsList.appendChild(li);
    qsItems[m.id] = li;
  });

  function openQuickSelect() {
    qsPanel.classList.remove("qs-hidden");
    qsToggle.classList.add("qs-active");
  }

  function closeQuickSelect() {
    qsPanel.classList.add("qs-hidden");
    qsToggle.classList.remove("qs-active");
  }

  qsToggle.addEventListener("click", () => {
    qsPanel.classList.contains("qs-hidden") ? openQuickSelect() : closeQuickSelect();
  });

  qsClose.addEventListener("click", closeQuickSelect);

  /* ─── Prev / Next Navigation ────────────────────────── */
  const prevBtn = document.getElementById("briefing-prev");
  const nextBtn = document.getElementById("briefing-next");
  const prevLabel = document.getElementById("prev-label");
  const nextLabel = document.getElementById("next-label");
  const counterEl = document.getElementById("briefing-counter");

  function updateNavLabels(currentIdx) {
    const prevIdx = (currentIdx - 1 + MISSIONS.length) % MISSIONS.length;
    const nextIdx = (currentIdx + 1) % MISSIONS.length;
    prevLabel.textContent = MISSIONS[prevIdx].label;
    nextLabel.textContent = MISSIONS[nextIdx].label;
    counterEl.textContent = `${currentIdx + 1} / ${MISSIONS.length}`;
  }

  prevBtn.addEventListener("click", () => {
    if (!activeMission) return;
    const idx = MISSIONS.findIndex((m) => m.id === activeMission);
    const prevIdx = (idx - 1 + MISSIONS.length) % MISSIONS.length;
    selectMission(MISSIONS[prevIdx].id);
  });

  nextBtn.addEventListener("click", () => {
    if (!activeMission) return;
    const idx = MISSIONS.findIndex((m) => m.id === activeMission);
    const nextIdx = (idx + 1) % MISSIONS.length;
    selectMission(MISSIONS[nextIdx].id);
  });

  /* ─── Onboarding Hint ─────────────────────────────────── */
  const hint = document.createElement("div");
  hint.id = "globe-hint";
  hint.innerHTML = `<span class="hint-arrow">&#8599;</span> Click a point to explore`;
  document.body.appendChild(hint);

  function dismissHint() {
    if (hint.parentNode) {
      hint.classList.add("hint-out");
      setTimeout(() => hint.remove(), 600);
    }
  }
  // Auto-dismiss after 6s
  setTimeout(dismissHint, 6000);

  /* ─── Raycaster ───────────────────────────────────────── */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener("click", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(markerMeshes);
    if (hits.length > 0) {
      selectMission(hits[0].object.userData.id);
    }
  });

  /* ─── Hover cursor ────────────────────────────────────── */
  renderer.domElement.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(markerMeshes);
    renderer.domElement.style.cursor = hits.length > 0 ? "pointer" : "grab";
  });

  /* ─── Animated HUD Coordinates ───────────────────────── */
  const coordsEl = document.getElementById("hud-coords");
  let currentLat = 0;
  let currentLon = 0;
  let coordAnimId = null;

  function animateCoords(targetLat, targetLon) {
    if (coordAnimId) cancelAnimationFrame(coordAnimId);

    const startLat = currentLat;
    const startLon = currentLon;
    const startTime = performance.now();
    const duration = 800;

    function tick() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / duration, 1);
      const ease = easeInOutCubic(t);

      currentLat = startLat + (targetLat - startLat) * ease;
      currentLon = startLon + (targetLon - startLon) * ease;

      if (coordsEl) {
        coordsEl.textContent = `LAT ${currentLat.toFixed(2)} / LON ${currentLon.toFixed(2)}`;
      }

      if (t < 1) {
        coordAnimId = requestAnimationFrame(tick);
      } else {
        coordAnimId = null;
      }
    }

    coordAnimId = requestAnimationFrame(tick);
  }

  /* ─── Briefing Panel Logic ────────────────────────────── */
  const briefingPanel = document.getElementById("briefing-panel");
  const briefingTitle = document.getElementById("briefing-title");
  const briefingBody = document.getElementById("briefing-body");
  const briefingClose = document.getElementById("briefing-close");
  let activeMission = null;

  function selectMission(id) {
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission) return;

    // Toggle off if same mission clicked
    if (activeMission === id) {
      closeBriefing();
      return;
    }

    activeMission = id;

    // Update label states
    Object.entries(labelElements).forEach(([mid, el]) => {
      el.classList.toggle("active", mid === id);
    });

    // Update quick select active state
    Object.entries(qsItems).forEach(([mid, el]) => {
      el.classList.toggle("qs-active", mid === id);
    });

    // Update marker colors
    markerMeshes.forEach((mesh) => {
      const isActive = mesh.userData.id === id;
      mesh.material.color.setHex(isActive ? 0xff6b35 : 0x00f0ff);
    });

    // Update prev/next labels
    const currentIdx = MISSIONS.findIndex((m) => m.id === id);
    updateNavLabels(currentIdx);

    // Load template content
    const tpl = document.getElementById(mission.tpl);
    if (tpl) {
      briefingBody.innerHTML = "";
      briefingBody.appendChild(tpl.content.cloneNode(true));

      // Sync data to panel (for dynamically populated fields)
      syncPanelData();
    }

    briefingTitle.textContent = mission.title;
    briefingPanel.classList.remove("panel-hidden");

    // Animate HUD coordinates
    animateCoords(mission.lat, mission.lon);

    // Fly camera toward the marker
    flyToMission(mission);
  }

  function closeBriefing() {
    briefingPanel.classList.add("panel-hidden");
    activeMission = null;

    Object.values(labelElements).forEach((el) => el.classList.remove("active"));
    Object.values(qsItems).forEach((el) => el.classList.remove("qs-active"));
    markerMeshes.forEach((mesh) => mesh.material.color.setHex(0x00f0ff));

    // Animate coords back to the default mission (about)
    const defaultMission = MISSIONS.find((m) => m.id === "about");
    if (defaultMission) {
      animateCoords(defaultMission.lat, defaultMission.lon);
    }
  }

  briefingClose.addEventListener("click", closeBriefing);

  // ESC to close
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeBriefing();
  });

  /* ─── Camera Fly-To ───────────────────────────────────── */
  let flyAnim = null;

  function flyToMission(mission) {
    if (flyAnim) cancelAnimationFrame(flyAnim);

    // Get marker position in world space (accounts for globe rotation)
    const localPos = latLonToVec3(mission.lat, mission.lon, GLOBE_RADIUS + 0.04);
    const worldPos = localPos.clone();
    globeGroup.localToWorld(worldPos);

    // Calculate camera position: offset from marker world position, looking at globe center
    const dir = worldPos.clone().normalize();
    const cameraTarget = dir.multiplyScalar(CAMERA_DISTANCE);
    // Offset slightly upward
    cameraTarget.y += 0.6;

    const startPos = camera.position.clone();
    const startTime = performance.now();

    function animateFly() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / FLY_DURATION, 1);
      const ease = easeInOutCubic(t);

      camera.position.lerpVectors(startPos, cameraTarget, ease);
      camera.lookAt(0, 0, 0);
      controls.update();

      if (t < 1) {
        flyAnim = requestAnimationFrame(animateFly);
      } else {
        flyAnim = null;
      }
    }

    flyAnim = requestAnimationFrame(animateFly);
  }

  /* ─── Sync Panel Data (called after template injection) ── */
  window.syncPanelData = function () {
    // About panel
    const loc = document.getElementById("profile-location");
    const panelLoc = document.getElementById("panel-location");
    if (loc && panelLoc) panelLoc.textContent = loc.textContent;

    const comp = document.getElementById("profile-company");
    const panelComp = document.getElementById("panel-company");
    if (comp && panelComp) panelComp.textContent = comp.textContent;

    const web = document.getElementById("profile-website");
    const panelWeb = document.getElementById("panel-website");
    if (web && panelWeb) panelWeb.textContent = web.textContent;

    // Projects panel
    const repoList = document.getElementById("repo-list");
    const panelRepoList = document.getElementById("panel-repo-list");
    if (repoList && panelRepoList && repoList.children.length > 0) {
      panelRepoList.innerHTML = "";
      const repos = repoList.querySelectorAll("[data-repo]");
      repos.forEach((repo) => {
        const card = document.createElement("div");
        card.className = "brief-repo-card";
        card.innerHTML = `
          <div class="brief-repo-name">${repo.dataset.name || ""}</div>
          <div class="brief-repo-desc">${repo.dataset.desc || "No description."}</div>
          <div class="brief-repo-meta">
            ${repo.dataset.lang ? `<span>${repo.dataset.lang}</span>` : ""}
            <span>★ ${repo.dataset.stars || "0"}</span>
          </div>
          <a class="brief-repo-link" href="${repo.dataset.url || "#"}" target="_blank">VIEW REPO →</a>
        `;
        panelRepoList.appendChild(card);
      });
    }

    // Contact panel
    const emailLink = document.getElementById("email-link");
    const panelEmail = document.getElementById("panel-email");
    if (emailLink && panelEmail) panelEmail.href = emailLink.href;

    const websiteLink = document.getElementById("website-link");
    const panelWebLink = document.getElementById("panel-website-link");
    if (websiteLink && panelWebLink) panelWebLink.href = websiteLink.href;

    const githubLink = document.getElementById("github-link");
    const panelGithub = document.getElementById("panel-github");
    if (githubLink && panelGithub) panelGithub.href = githubLink.href;

    const allRepos = document.getElementById("all-repos-link");
    const panelAllRepos = document.getElementById("panel-all-repos");
    if (allRepos && panelAllRepos) panelAllRepos.href = allRepos.href;
  };

  /* ─── HUD Date ────────────────────────────────────────── */
  const hudDate = document.getElementById("hud-date");
  if (hudDate) {
    const now = new Date();
    hudDate.textContent = now.toISOString().slice(0, 10).replace(/-/g, ".") + " // " +
      now.toTimeString().slice(0, 5) + " UTC";
  }

  /* ─── Project Label Positions to 2D ───────────────────── */
  function updateLabels() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    MISSIONS.forEach((m) => {
      const pos3 = latLonToVec3(m.lat, m.lon, GLOBE_RADIUS + 0.2);
      // Apply globe group rotation
      const worldPos = pos3.clone();
      globeGroup.localToWorld(worldPos);

      // Project to screen
      const projected = worldPos.clone().project(camera);
      const x = (projected.x * 0.5 + 0.5) * width;
      const y = (-projected.y * 0.5 + 0.5) * height;

      const el = labelElements[m.id];
      el.style.left = x + "px";
      el.style.top = y + "px";

      // Check if behind globe
      const cameraDir = camera.position.clone().normalize();
      const markerDir = worldPos.clone().normalize();
      const dot = cameraDir.dot(markerDir);
      el.classList.toggle("behind-globe", dot < 0.15);
    });
  }

  /* ─── Auto-Rotate ─────────────────────────────────────── */
  let isUserInteracting = false;

  controls.addEventListener("start", () => { isUserInteracting = true; });
  controls.addEventListener("end", () => { isUserInteracting = false; });

  /* ─── Marker Pulse Animation ──────────────────────────── */
  let time = 0;

  /* ─── Resize ──────────────────────────────────────────── */
  window.addEventListener("resize", () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });

  /* ─── Animate Loop ────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    // Auto-rotate globe (stop when a mission is focused)
    if (!isUserInteracting && !flyAnim && !activeMission) {
      globeGroup.rotation.y += AUTO_ROTATE_SPEED;
    }

    // Pulse markers
    markerMeshes.forEach((mesh, i) => {
      const scale = 1 + Math.sin(time * 2 + i * 1.2) * 0.2;
      mesh.scale.setScalar(scale);
    });

    controls.update();
    updateLabels();
    renderer.render(scene, camera);
  }

  animate();

  // Select "About Me" as default mission on load
  setTimeout(() => selectMission("about"), 300);

  // Expose selectMission globally for potential external use
  window.selectMission = selectMission;
})();
