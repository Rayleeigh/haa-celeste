(() => {
  /* ─── Configuration ───────────────────────────────────── */
  const GLOBE_RADIUS = 1.8;
  const MARKER_SIZE = 0.07;
  const AUTO_ROTATE_SPEED = 0.0006;
  const CAMERA_DISTANCE = 7;
  const FLY_DURATION = 1200; // ms
  const SHIP_ALTITUDE = GLOBE_RADIUS + 0.28;
  const SHIP_FLY_DURATION = 1500; // ms

  let MISSIONS = [];
  let MISSION_TYPES = {};

  /* ─── Super Destroyer State ──────────────────────────── */
  let shipGroup = null;
  let shipMeshes = [];
  let shipName = "";
  let shipFlyAnim = null;
  let shipTooltipEl = null;

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

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 100);
  camera.position.set(0, 1, CAMERA_DISTANCE);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x0a0e17, 1);
  container.appendChild(renderer.domElement);

  /* ─── Controls ────────────────────────────────────────── */
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.rotateSpeed = 0.4;
  controls.minPolarAngle = 0; // Allow full rotation by poles
  controls.maxPolarAngle = Math.PI;

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
    depthWrite: true, // Help with occlusion
    depthTest: true,
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

  /* ─── Super Destroyer ─────────────────────────────────── */
  function createSuperDestroyer() {
    const ship = new THREE.Group();
    ship.name = "superDestroyer";

    // Main hull — 4-sided cone on its side (diamond/wedge cross-section)
    const hullGeo = new THREE.ConeGeometry(0.025, 0.12, 4);
    const hullMat = new THREE.MeshPhongMaterial({
      color: 0x1a2a3a,
      emissive: 0x0a1a2a,
      emissiveIntensity: 0.3,
      flatShading: true,
    });
    const hull = new THREE.Mesh(hullGeo, hullMat);
    hull.rotation.z = Math.PI / 2;
    hull.rotation.y = Math.PI / 4;
    ship.add(hull);

    // Bridge tower — small box raised at the rear
    const bridgeGeo = new THREE.BoxGeometry(0.02, 0.015, 0.015);
    const bridgeMat = new THREE.MeshPhongMaterial({
      color: 0x0a1628,
      emissive: 0x00f0ff,
      emissiveIntensity: 0.2,
    });
    const bridge = new THREE.Mesh(bridgeGeo, bridgeMat);
    bridge.position.set(-0.02, 0.015, 0);
    ship.add(bridge);

    // Engine glows — two small orange spheres at the back
    const engGeo = new THREE.SphereGeometry(0.006, 6, 6);
    const engMat = new THREE.MeshBasicMaterial({
      color: 0xff6b35,
      transparent: true,
      opacity: 0.9,
    });
    [-0.012, 0.012].forEach((z) => {
      const eng = new THREE.Mesh(engGeo, engMat);
      eng.position.set(-0.06, 0, z);
      ship.add(eng);
    });

    // Cyan accent edge lines
    const edgeMat = new THREE.LineBasicMaterial({
      color: 0x00f0ff,
      transparent: true,
      opacity: 0.4,
    });
    const pts = [
      new THREE.Vector3(-0.06, 0, -0.025),
      new THREE.Vector3(0.06, 0, 0),
      new THREE.Vector3(-0.06, 0, 0.025),
      new THREE.Vector3(-0.06, 0, -0.025),
    ];
    ship.add(
      new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), edgeMat)
    );

    return ship;
  }

  function orientShipAtPosition(ship, position) {
    const up = position.clone().normalize();
    const worldUp = new THREE.Vector3(0, 1, 0);
    let tangent = new THREE.Vector3().crossVectors(worldUp, up).normalize();
    if (tangent.lengthSq() < 0.001) tangent.set(1, 0, 0);
    const right = new THREE.Vector3().crossVectors(up, tangent).normalize();
    const m = new THREE.Matrix4();
    m.makeBasis(tangent, up, right);
    ship.setRotationFromMatrix(m);
  }

  function orientShipTowardTarget(ship, currentPos, targetPos) {
    const up = currentPos.clone().normalize();
    const toTarget = targetPos.clone().sub(currentPos);
    const d = toTarget.dot(up);
    const tangentForward = toTarget.sub(up.clone().multiplyScalar(d));
    if (tangentForward.lengthSq() < 0.0001) return;
    tangentForward.normalize();
    const right = new THREE.Vector3().crossVectors(up, tangentForward).normalize();
    const corrected = new THREE.Vector3().crossVectors(right, up).normalize();
    const m = new THREE.Matrix4();
    m.makeBasis(corrected, up, right);
    ship.setRotationFromMatrix(m);
  }

  function flyShipToMission(mission) {
    if (shipFlyAnim) cancelAnimationFrame(shipFlyAnim);
    if (!shipGroup) return;

    const targetPos = latLonToVec3(mission.lat, mission.lon, SHIP_ALTITUDE);
    const startPos = shipGroup.position.clone();
    const startDir = startPos.clone().normalize();
    const targetDir = targetPos.clone().normalize();
    const startTime = performance.now();

    function animateShip() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / SHIP_FLY_DURATION, 1);
      const ease = easeInOutCubic(t);

      const currentDir = new THREE.Vector3()
        .copy(startDir)
        .lerp(targetDir, ease)
        .normalize();
      const currentPos = currentDir.multiplyScalar(SHIP_ALTITUDE);
      shipGroup.position.copy(currentPos);
      orientShipTowardTarget(shipGroup, currentPos, targetPos);

      if (t < 1) {
        shipFlyAnim = requestAnimationFrame(animateShip);
      } else {
        shipFlyAnim = null;
        orientShipAtPosition(shipGroup, currentPos);
      }
    }

    shipFlyAnim = requestAnimationFrame(animateShip);
  }

  function flyShipToDefault() {
    flyShipToMission({ lat: 0, lon: 0 });
  }

  function initShip(names) {
    shipName = names[Math.floor(Math.random() * names.length)];
    shipGroup = createSuperDestroyer();

    shipGroup.traverse((child) => {
      if (child.isMesh) shipMeshes.push(child);
    });

    const defaultPos = latLonToVec3(0, 0, SHIP_ALTITUDE);
    shipGroup.position.copy(defaultPos);
    orientShipAtPosition(shipGroup, defaultPos);
    globeGroup.add(shipGroup);

    shipTooltipEl = document.getElementById("ship-tooltip");
  }

  function updateShipTooltip() {
    if (!shipTooltipEl || !shipGroup || !shipGroup.visible) return;

    const worldPos = shipGroup.position.clone();
    globeGroup.localToWorld(worldPos);

    const projected = worldPos.clone().project(camera);
    const x = (projected.x * 0.5 + 0.5) * container.clientWidth;
    const y = (-projected.y * 0.5 + 0.5) * container.clientHeight;

    shipTooltipEl.style.left = x + "px";
    shipTooltipEl.style.top = (y - 20) + "px";

    const cameraDir = camera.position.clone().normalize();
    const markerDir = worldPos.clone().normalize();
    const dot = cameraDir.dot(markerDir);
    shipTooltipEl.classList.toggle("behind-globe", dot < 0.15);
  }

  function showShipTooltip(visible) {
    if (!shipTooltipEl) return;
    shipTooltipEl.classList.toggle("hidden", !visible);
    if (visible) shipTooltipEl.textContent = "SES " + shipName;
  }

  /* ─── Mission Markers (Shader) ────────────────────────── */
  const markerMeshes = [];
  const markerGeo = new THREE.SphereGeometry(MARKER_SIZE, 16, 16);

  // Custom shader for Glitch/Ping effect (reused for all markers)
  const markerShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSelected: { value: 0.0 }, // 0 = glitch, 1 = ping
      uColor: { value: new THREE.Color(0x00f0ff) }
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSelected;
      varying vec2 vUv;
      varying float vNoise;
      
      float rand(vec2 co){
          return fract(sin(dot(co.xy ,vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        vUv = uv;
        vec3 pos = position;
        
        if (uSelected < 0.5) {
          // Glitch / Static Jitter
          float noise = rand(vec2(uTime * 0.5, position.y));
          vNoise = noise;
          if (noise > 0.92) {
            pos += normal * (rand(vec2(uTime, position.z)) - 0.5) * 0.15;
          }
        } else {
          // Ping Pulse
          float pulse = 1.0 + sin(uTime * 4.0) * 0.15;
          pos *= pulse;
        }
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform float uTime;
      uniform float uSelected;
      uniform vec3 uColor;
      varying float vNoise;

      void main() {
        vec3 color = uColor;
        float alpha = 0.9;
        
        if (uSelected < 0.5) {
          // Static flicker
          float flicker = sin(uTime * 20.0 + vNoise * 10.0);
          if (flicker > 0.8) alpha = 0.5;
          if (mod(gl_FragCoord.y, 4.0) < 2.0) alpha *= 0.7; // Scanline
        } else {
          // Selected glow
          alpha = 1.0;
          color += vec3(0.3) * sin(uTime * 4.0);
        }
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true
  });

  function initMissions(missionsData, typesData) {
    // Create lookup map for types
    typesData.forEach(t => MISSION_TYPES[t.id] = t);

    // Merge type data into missions
    MISSIONS = missionsData.map(m => {
      const typeDef = MISSION_TYPES[m.type] || { icon: '', name: 'Unknown', description: '' };
      // Attach type info to the mission object for easy access
      return { ...m, icon: typeDef.icon, typeName: typeDef.name, typeDesc: typeDef.description };
    });
    
    MISSIONS.forEach((m) => {
      const pos = latLonToVec3(m.lat, m.lon, GLOBE_RADIUS + 0.04);
      
      // Clone material so each marker has independent uniforms
      const mat = markerShaderMat.clone();
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

    initLabels();
    initQuickSelect();
  }

  // Fetch missions, types, and ship names in parallel
  Promise.all([
    fetch('data/missions.json').then(r => r.json()),
    fetch('data/mission_types.json').then(r => r.json()),
    fetch('data/ship_names.json').then(r => r.json())
  ]).then(([missions, types, shipNames]) => {
    initMissions(missions, types);
    initShip(shipNames);
  }).catch(e => console.error("Failed to load mission data:", e));

  /* ─── Tech Stack (Arsenal) ────────────────────────────── */
  function initStack(data) {
    const container = document.getElementById("stack-list");
    if (!container) return;
    
    container.innerHTML = data.map(item => `
      <img src="https://skillicons.dev/icons?i=${item.icon}" alt="${item.name}" title="${item.name}" />
    `).join('');
  }

  // Fetch stack from data directory
  fetch('data/stack.json')
    .then(r => r.json())
    .then(data => initStack(data))
    .catch(e => console.error("Failed to load stack:", e));

  /* ─── HTML Mission Labels ─────────────────────────────── */
  const labelContainer = document.getElementById("mission-labels");
  const labelElements = {};

  function initLabels() {
    MISSIONS.forEach((m) => {
      const el = document.createElement("div");
      el.className = "mission-label";
      el.dataset.mission = m.id;
      el.innerHTML = `
        <span class="mission-name">${m.name}</span>
      `;
      el.addEventListener("click", () => {
        selectMission(m.id);

      });
      labelContainer.appendChild(el);
      labelElements[m.id] = el;
    });
  }

  /* ─── Quick Select Sidebar ────────────────────────────── */
  const qsToggle = document.getElementById("quickselect-toggle");
  const qsPanel = document.getElementById("quickselect-panel");
  const qsClose = document.getElementById("quickselect-close");
  const qsList = document.getElementById("quickselect-list");
  const qsItems = {};

  function initQuickSelect() {
    MISSIONS.forEach((m, i) => {
      const li = document.createElement("li");
      li.className = "qs-item";
      li.dataset.mission = m.id;
      li.innerHTML = `
        <span class="qs-index">${String(i + 1).padStart(2, "0")}</span>
        <span class="qs-item-label">${m.name}</span>
      `;
      li.addEventListener("click", () => {
        selectMission(m.id);

        closeQuickSelect();
      });
      qsList.appendChild(li);
      qsItems[m.id] = li;
    });
  }

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


  /* ─── Raycaster ───────────────────────────────────────── */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener("click", (e) => {
    mouse.x = (e.clientX / container.clientWidth) * 2 - 1;
    mouse.y = -(e.clientY / container.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(markerMeshes);
    if (hits.length > 0) {
      selectMission(hits[0].object.userData.id);
    }
  });

  /* ─── Hover cursor ────────────────────────────────────── */
  renderer.domElement.addEventListener("mousemove", (e) => {
    mouse.x = (e.clientX / container.clientWidth) * 2 - 1;
    mouse.y = -(e.clientY / container.clientHeight) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    const markerHits = raycaster.intersectObjects(markerMeshes);
    const shipHits = shipMeshes.length > 0
      ? raycaster.intersectObjects(shipMeshes, true)
      : [];

    if (shipHits.length > 0) {
      renderer.domElement.style.cursor = "pointer";
      showShipTooltip(true);
    } else if (markerHits.length > 0) {
      renderer.domElement.style.cursor = "pointer";
      showShipTooltip(false);
    } else {
      renderer.domElement.style.cursor = "grab";
      showShipTooltip(false);
    }
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
  const viewOperator = document.getElementById("view-operator");
  const viewMission = document.getElementById("view-mission");
  const missionTitle = document.getElementById("mission-title");
  const missionBody = document.getElementById("mission-body-content");
  const missionBackBtn = document.getElementById("mission-back-btn");
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
      mesh.material.uniforms.uSelected.value = isActive ? 1.0 : 0.0;
      mesh.material.uniforms.uColor.value.setHex(isActive ? 0xff6b35 : 0x00f0ff);
    });

    // Populate Mission View
    missionTitle.textContent = (mission.title || mission.name).toUpperCase();
    
    // Inject mission dossier
    missionBody.innerHTML = `
      <div class="brief-dossier">

        <div class="brief-header-row">
          <div class="brief-icon-cell">
            <img src="${mission.icon}" class="brief-icon" alt="${mission.typeName}" onerror="this.closest('.brief-header-row').style.display='none'"/>
          </div>
          <div class="brief-class-cell">
            <span class="brief-type-badge">${mission.typeName}</span>
            <span class="brief-type-desc">${mission.typeDesc}</span>
          </div>
        </div>

        <div class="brief-divider"><span>MISSION INTEL</span></div>

        <div class="brief-intel-grid">
          <div class="brief-field">
            <span class="brief-field-label">CODENAME</span>
            <span class="brief-field-value">${mission.name}</span>
          </div>
          <div class="brief-field">
            <span class="brief-field-label">OPERATION</span>
            <span class="brief-field-value">${mission.title}</span>
          </div>
          <div class="brief-field">
            <span class="brief-field-label">COORDINATES</span>
            <span class="brief-field-value brief-mono">${mission.lat.toFixed(4)}, ${mission.lon.toFixed(4)}</span>
          </div>
          <div class="brief-field brief-field-full">
            <span class="brief-field-label">TARGET LINK</span>
            <a href="${mission.link}" target="_blank" class="brief-field-link">${mission.link}</a>
          </div>
        </div>

        ${mission.description ? `
        <div class="brief-divider"><span>BRIEFING</span></div>
        <div class="brief-narrative">
          <p>${mission.description}</p>
        </div>
        ` : ''}

      </div>
    `;

    // Toggle type description on click (for touch / mobile)
    const iconCell = missionBody.querySelector('.brief-icon-cell');
    if (iconCell) {
      iconCell.addEventListener('click', () => {
        const classCell = iconCell.nextElementSibling;
        if (classCell) classCell.classList.toggle('brief-class-expanded');
      });
    }

    // Update Action Button
    const actionBtn = document.getElementById("mission-action-btn");
    actionBtn.href = mission.link || "#";
    actionBtn.target = "_blank";
    actionBtn.rel = "noopener noreferrer";
    actionBtn.textContent = (mission.link_text || "INITIATE PROTOCOL").toUpperCase();

    // Switch Views
    viewOperator.classList.remove("active");
    viewMission.classList.add("active");

    // Auto-open drawer on mobile so the mission briefing is visible
    if (window.innerWidth <= 768) {
      const panel = document.getElementById("operator-panel");
      const toggle = document.getElementById("drawer-toggle");
      if (panel) panel.classList.add("drawer-open");
      if (toggle) {
        toggle.classList.add("active");
        const label = toggle.querySelector(".drawer-toggle-label");
        if (label) label.textContent = "CLOSE";
      }
    }

    // Animate HUD coordinates
    animateCoords(mission.lat, mission.lon);

    // Fly camera toward the marker
    flyToMission(mission);

    // Fly Super Destroyer to mission
    flyShipToMission(mission);
  }

  function closeBriefing() {
    viewMission.classList.remove("active");
    viewOperator.classList.add("active");
    activeMission = null;

    Object.values(labelElements).forEach((el) => el.classList.remove("active"));
    Object.values(qsItems).forEach((el) => el.classList.remove("qs-active"));
    markerMeshes.forEach((mesh) => {
      mesh.material.uniforms.uSelected.value = 0.0;
      mesh.material.uniforms.uColor.value.setHex(0x00f0ff);
    });

    // Reset coords to 0,0 or keep last
    animateCoords(0, 0);

    // Return ship to idle orbit
    flyShipToDefault();
  }

  missionBackBtn.addEventListener("click", closeBriefing);

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
    const width = container.clientWidth;
    const height = container.clientHeight;

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
      
      // Check if behind globe OR occluded by right panel (desktop only)
      const isBehindGlobe = dot < 0.15;
      const isOccludedByPanel = window.innerWidth > 768 && x > window.innerWidth * 0.68;
      el.classList.toggle("behind-globe", isBehindGlobe || isOccludedByPanel);
    });
  }

  /* ─── Auto-Rotate ─────────────────────────────────────── */
  let isUserInteracting = false;

  controls.addEventListener("start", () => { isUserInteracting = true; });
  controls.addEventListener("end", () => { isUserInteracting = false; });

  /* ─── Marker Pulse Animation ──────────────────────────── */
  let time = 0;

  /* ─── Resize ──────────────────────────────────────────── */
  function updateCameraForViewport() {
    camera.aspect = container.clientWidth / container.clientHeight;
    // On mobile, camera at globe equator for true vertical centering
    camera.position.y = window.innerWidth <= 768 ? 0 : 1;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener("resize", updateCameraForViewport);
  updateCameraForViewport();

  /* ─── Animate Loop ────────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    // Auto-rotate globe (stop when a mission is focused)
    if (!isUserInteracting && !flyAnim && !activeMission) {
      globeGroup.rotation.y += AUTO_ROTATE_SPEED;
    }

    // Update markers (Uniforms + Occlusion)
    markerMeshes.forEach((mesh, i) => {
      // Update shader time
      mesh.material.uniforms.uTime.value = time;

      // Occlusion Logic: Hide if behind globe
      const worldPos = mesh.position.clone();
      globeGroup.localToWorld(worldPos);
      
      // Vector from camera to mesh
      const viewVector = worldPos.clone().sub(camera.position);
      // Normal at mesh position (approximate for sphere)
      const normal = worldPos.clone().normalize();
      
      // If dot product is positive, the surface is facing away from camera
      const dot = viewVector.dot(normal);
      mesh.visible = dot < 0.2; // Threshold to hide slightly before horizon
    });

    // Update Super Destroyer
    if (shipGroup) {
      // Idle bob when not flying
      if (!shipFlyAnim) {
        const bobAmount = Math.sin(time * 2.5) * 0.003;
        shipGroup.position.addScaledVector(
          shipGroup.position.clone().normalize(),
          bobAmount
        );
      }

      // Engine glow pulsation
      shipGroup.children.forEach((child) => {
        if (
          child.material &&
          child.material.color &&
          child.material.color.getHex() === 0xff6b35
        ) {
          child.material.opacity = 0.7 + Math.sin(time * 6) * 0.3;
        }
      });

      // Occlusion: hide ship if behind globe
      const shipWorldPos = shipGroup.position.clone();
      globeGroup.localToWorld(shipWorldPos);
      const viewVec = shipWorldPos.clone().sub(camera.position);
      const shipNormal = shipWorldPos.clone().normalize();
      shipGroup.visible = viewVec.dot(shipNormal) < 0.2;

      updateShipTooltip();
    }

    controls.update();
    updateLabels();
    renderer.render(scene, camera);
  }

  animate();

  // Expose selectMission globally for potential external use
  window.selectMission = selectMission;

  /* ─── Mobile Drawer Toggle ─────────────────────────────── */
  const drawerToggle = document.getElementById("drawer-toggle");
  const operatorPanel = document.getElementById("operator-panel");

  if (drawerToggle && operatorPanel) {
    drawerToggle.addEventListener("click", () => {
      const isOpen = operatorPanel.classList.toggle("drawer-open");
      drawerToggle.classList.toggle("active", isOpen);
      const label = drawerToggle.querySelector(".drawer-toggle-label");
      if (label) label.textContent = isOpen ? "CLOSE" : "OPERATOR";
    });
  }
})();
