(() => {
  /* ─── Configuration ───────────────────────────────────── */
  const SECTOR_RADIUS = 3.5;
  const SECTOR_SIZE = 2.2;
  const PLANET_SIZE = 0.12;
  const CAMERA_OVERVIEW_POS = new THREE.Vector3(0, 14, 6);
  const CAMERA_OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);
  const CAMERA_FOCUS_HEIGHT = 5;
  const CAMERA_FOCUS_DISTANCE = 2;
  const FLY_DURATION = 1200;
  const SHIP_HOVER_Y = 0.5;
  const SHIP_FLY_DURATION = 1500;
  const DEBRIS_COUNT = 300;
  const NEBULA_COUNT = 5;

  let MISSIONS = [];
  let MISSION_TYPES = {};

  /* ─── Super Destroyer State ──────────────────────────── */
  let shipGroup = null;
  let shipMeshes = [];
  let shipName = "";
  let shipFlyAnim = null;
  let shipTooltipEl = null;

  /* ─── Galaxy State ───────────────────────────────────── */
  const sectorGroups = {};
  const sectorBoundaries = [];
  const planetMeshes = [];
  let viewMode = "overview";
  let focusedSectorId = null;
  let activeMission = null;
  let flyAnim = null;
  let time = 0;

  /* ─── Helpers ────────────────────────────────────────── */
  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) - hash) + str.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash);
  }

  /* ─── Scene Setup ────────────────────────────────────── */
  const container = document.getElementById("globe-container");
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    45, container.clientWidth / container.clientHeight, 0.1, 100
  );
  camera.position.copy(CAMERA_OVERVIEW_POS);
  camera.lookAt(CAMERA_OVERVIEW_TARGET);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x0a0e17, 1);
  container.appendChild(renderer.domElement);

  /* ─── Controls ───────────────────────────────────────── */
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.rotateSpeed = 0.4;
  controls.minDistance = 6;
  controls.maxDistance = 22;
  controls.minPolarAngle = 0.3;
  controls.maxPolarAngle = Math.PI / 2.5;
  controls.target.copy(CAMERA_OVERVIEW_TARGET);

  /* ─── Lighting ───────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0x334466, 0.6));
  const dirLight = new THREE.DirectionalLight(0x00f0ff, 0.3);
  dirLight.position.set(5, 8, 5);
  scene.add(dirLight);

  /* ─── Galaxy Group ───────────────────────────────────── */
  const galaxyGroup = new THREE.Group();
  scene.add(galaxyGroup);

  /* ─── War Table Grid ─────────────────────────────────── */
  const gridMat = new THREE.LineBasicMaterial({
    color: 0x00f0ff, transparent: true, opacity: 0.04,
  });
  const gridExtent = 14;
  for (let i = -gridExtent; i <= gridExtent; i += 1) {
    const xPts = [
      new THREE.Vector3(-gridExtent, -0.01, i),
      new THREE.Vector3(gridExtent, -0.01, i),
    ];
    galaxyGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(xPts), gridMat
    ));
    const zPts = [
      new THREE.Vector3(i, -0.01, -gridExtent),
      new THREE.Vector3(i, -0.01, gridExtent),
    ];
    galaxyGroup.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints(zPts), gridMat
    ));
  }

  /* ─── Star Particles ─────────────────────────────────── */
  const starCount = 1200;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPositions[i * 3]     = (Math.random() - 0.5) * 60;
    starPositions[i * 3 + 1] = 5 + Math.random() * 40;
    starPositions[i * 3 + 2] = (Math.random() - 0.5) * 60;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff, size: 0.06, transparent: true, opacity: 0.6,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ─── Debris Particles ───────────────────────────────── */
  const debrisPositions = new Float32Array(DEBRIS_COUNT * 3);
  for (let i = 0; i < DEBRIS_COUNT; i++) {
    debrisPositions[i * 3]     = (Math.random() - 0.5) * 20;
    debrisPositions[i * 3 + 1] = Math.random() * 3;
    debrisPositions[i * 3 + 2] = (Math.random() - 0.5) * 20;
  }
  const debrisGeo = new THREE.BufferGeometry();
  debrisGeo.setAttribute("position", new THREE.BufferAttribute(debrisPositions, 3));
  const debrisMat = new THREE.PointsMaterial({
    color: 0x7a8baa, size: 0.03, transparent: true, opacity: 0.4,
  });
  galaxyGroup.add(new THREE.Points(debrisGeo, debrisMat));

  /* ─── Nebula Sprites ─────────────────────────────────── */
  const nebulaCanvas = document.createElement("canvas");
  nebulaCanvas.width = 128;
  nebulaCanvas.height = 128;
  const nebulaCtx = nebulaCanvas.getContext("2d");
  const grad = nebulaCtx.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, "rgba(0, 240, 255, 0.15)");
  grad.addColorStop(1, "rgba(0, 240, 255, 0)");
  nebulaCtx.fillStyle = grad;
  nebulaCtx.fillRect(0, 0, 128, 128);
  const nebulaTexture = new THREE.CanvasTexture(nebulaCanvas);

  for (let i = 0; i < NEBULA_COUNT; i++) {
    const spriteMat = new THREE.SpriteMaterial({
      map: nebulaTexture,
      blending: THREE.AdditiveBlending,
      transparent: true,
      opacity: 0.12 + Math.random() * 0.08,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(spriteMat);
    sprite.position.set(
      (Math.random() - 0.5) * 16,
      0.5 + Math.random() * 2,
      (Math.random() - 0.5) * 16
    );
    const s = 3 + Math.random() * 3;
    sprite.scale.set(s, s, 1);
    galaxyGroup.add(sprite);
  }

  /* ─── Super Destroyer ────────────────────────────────── */
  function createSuperDestroyer() {
    const ship = new THREE.Group();
    ship.name = "superDestroyer";

    const holoColor = 0xFDD808;

    // Holographic materials
    const matSolid = new THREE.MeshBasicMaterial({
      color: holoColor, transparent: true, opacity: 0.15,
      blending: THREE.AdditiveBlending, depthWrite: false,
    });
    const matWire = new THREE.MeshBasicMaterial({
      color: holoColor, wireframe: true, transparent: true, opacity: 0.8,
      blending: THREE.AdditiveBlending,
    });
    const matEngine = new THREE.MeshBasicMaterial({
      color: 0xff6b35, transparent: true, opacity: 0.9,
    });

    function addPart(geometry, x, y, z, rotX, rotY, rotZ) {
      rotX = rotX || 0; rotY = rotY || 0; rotZ = rotZ || 0;
      const group = new THREE.Group();
      group.position.set(x, y, z);
      group.rotation.set(rotX, rotY, rotZ);
      group.add(new THREE.Mesh(geometry, matSolid.clone()));
      group.add(new THREE.Mesh(geometry, matWire.clone()));
      ship.add(group);
    }

    // --- REAR: Engine Block & Bracket Armor ---
    addPart(new THREE.BoxGeometry(3.8, 3.2, 5), 0, 0, 8.5);
    addPart(new THREE.CylinderGeometry(2.8, 2.8, 1, 4), 0, 0, 11, Math.PI/2, Math.PI/4, 0);
    addPart(new THREE.CylinderGeometry(2.2, 2.2, 5.5, 4), 2.8, 0, 8.2, Math.PI/2, Math.PI/4, 0);
    addPart(new THREE.CylinderGeometry(2.2, 2.2, 5.5, 4), -2.8, 0, 8.2, Math.PI/2, Math.PI/4, 0);

    // 10-Engine Cluster
    const engineGeoLg = new THREE.CylinderGeometry(0.5, 0.4, 0.8, 8);
    const engineGeoSm = new THREE.CylinderGeometry(0.3, 0.2, 0.6, 8);
    addPart(engineGeoLg, 2.5, 1, 11.2, Math.PI/2, 0, 0);
    addPart(engineGeoLg, 2.5, -1, 11.2, Math.PI/2, 0, 0);
    addPart(engineGeoLg, -2.5, 1, 11.2, Math.PI/2, 0, 0);
    addPart(engineGeoLg, -2.5, -1, 11.2, Math.PI/2, 0, 0);

    [[1,0.8], [-1,0.8], [1.2,-0.5], [-1.2,-0.5], [0,-1], [0,0]].forEach(function(pos) {
      addPart(engineGeoSm, pos[0], pos[1], 11.4, Math.PI/2, 0, 0);
    });

    // --- MIDSECTION: Hull & Hangar ---
    addPart(new THREE.BoxGeometry(3.2, 2.8, 8), 0, 0, 2);
    addPart(new THREE.CylinderGeometry(2, 2, 6, 4), 0, -1.2, 2.5, Math.PI/2, Math.PI/4, 0);

    // --- COMMAND BRIDGE ---
    addPart(new THREE.BoxGeometry(2.2, 1.2, 3), 0, 1.8, 3.5);
    addPart(new THREE.CylinderGeometry(1, 1, 2.2, 3), 0, 2, 1.7, 0, 0, Math.PI/2);

    // --- FRONT: Rails & Antenna Array ---
    addPart(new THREE.BoxGeometry(1.4, 1.4, 11), 0, 0, -7.5);
    addPart(new THREE.BoxGeometry(0.6, 1, 14), 1.5, 0, -9);
    addPart(new THREE.BoxGeometry(0.6, 1, 14), -1.5, 0, -9);

    // Struts
    for (var z = -3; z > -12; z -= 2) {
      addPart(new THREE.CylinderGeometry(0.1, 0.1, 3, 4), 0, 0, z, 0, 0, Math.PI/2);
    }

    // Antenna
    addPart(new THREE.CylinderGeometry(0.1, 0.1, 4, 4), 0, 0.2, -15, Math.PI/2, 0, 0);
    addPart(new THREE.CylinderGeometry(0.05, 0.05, 2, 4), 0.3, -0.2, -14, Math.PI/2, 0, 0);
    addPart(new THREE.CylinderGeometry(0.05, 0.05, 2, 4), -0.3, -0.2, -14, Math.PI/2, 0, 0);

    // --- ORBITAL WEAPONS ---
    addPart(new THREE.BoxGeometry(1, 0.8, 2), 0, -1.8, -1);
    addPart(new THREE.CylinderGeometry(0.15, 0.15, 2, 4), 0, -2, -2.5, Math.PI/2, 0, 0);
    addPart(new THREE.BoxGeometry(1, 0.8, 2), 0, -1.2, -5);
    addPart(new THREE.CylinderGeometry(0.15, 0.15, 2, 4), 0, -1.4, -6.5, Math.PI/2, 0, 0);

    // Scale entire ship down to fit the galaxy map and rotate so it faces forward
    ship.scale.set(0.025, 0.025, 0.025);
    ship.rotation.y = Math.PI;

    return ship;
  }

  function flyShipToPosition(targetX, targetZ) {
    if (shipFlyAnim) cancelAnimationFrame(shipFlyAnim);
    if (!shipGroup) return;

    const startPos = shipGroup.position.clone();
    const targetPos = new THREE.Vector3(targetX, SHIP_HOVER_Y, targetZ);
    const startTime = performance.now();

    function tick() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / SHIP_FLY_DURATION, 1);
      const ease = easeInOutCubic(t);

      shipGroup.position.lerpVectors(startPos, targetPos, ease);

      if (t < 1) {
        const dir = new THREE.Vector3().subVectors(targetPos, shipGroup.position);
        if (dir.lengthSq() > 0.001) {
          shipGroup.rotation.y = Math.atan2(dir.x, dir.z);
        }
        shipFlyAnim = requestAnimationFrame(tick);
      } else {
        shipFlyAnim = null;
      }
    }

    shipFlyAnim = requestAnimationFrame(tick);
  }

  function flyShipToDefault() {
    flyShipToPosition(0, 0);
  }

  function initShip(names) {
    shipName = names[Math.floor(Math.random() * names.length)];
    shipGroup = createSuperDestroyer();
    shipGroup.traverse((child) => {
      if (child.isMesh) shipMeshes.push(child);
    });
    shipGroup.position.set(0, SHIP_HOVER_Y, 0);
    galaxyGroup.add(shipGroup);
    shipTooltipEl = document.getElementById("ship-tooltip");
  }

  function updateShipTooltip() {
    if (!shipTooltipEl || !shipGroup) return;

    const rect = container.getBoundingClientRect();
    const worldPos = new THREE.Vector3();
    shipGroup.getWorldPosition(worldPos);

    const projected = worldPos.clone().project(camera);
    const x = rect.left + (projected.x * 0.5 + 0.5) * rect.width;
    const y = rect.top + (-projected.y * 0.5 + 0.5) * rect.height;

    shipTooltipEl.style.left = x + "px";
    shipTooltipEl.style.top = (y - 20) + "px";
  }

  function showShipTooltip(visible) {
    if (!shipTooltipEl) return;
    shipTooltipEl.classList.toggle("hidden", !visible);
    if (visible) shipTooltipEl.textContent = "SES " + shipName;
  }

  /* ─── Planet Shader Material ─────────────────────────── */
  const planetGeo = new THREE.SphereGeometry(PLANET_SIZE, 16, 16);

  const markerShaderMat = new THREE.ShaderMaterial({
    uniforms: {
      uTime: { value: 0 },
      uSelected: { value: 0.0 },
      uColor: { value: new THREE.Color(0x00f0ff) },
    },
    vertexShader: `
      uniform float uTime;
      uniform float uSelected;
      varying vec2 vUv;
      varying float vNoise;

      float rand(vec2 co){
        return fract(sin(dot(co.xy, vec2(12.9898,78.233))) * 43758.5453);
      }

      void main() {
        vUv = uv;
        vec3 pos = position;
        if (uSelected < 0.5) {
          float noise = rand(vec2(uTime * 0.5, position.y));
          vNoise = noise;
          if (noise > 0.92) {
            pos += normal * (rand(vec2(uTime, position.z)) - 0.5) * 0.15;
          }
        } else {
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
          float flicker = sin(uTime * 20.0 + vNoise * 10.0);
          if (flicker > 0.8) alpha = 0.5;
          if (mod(gl_FragCoord.y, 4.0) < 2.0) alpha *= 0.7;
        } else {
          alpha = 1.0;
          color += vec3(0.3) * sin(uTime * 4.0);
        }
        gl_FragColor = vec4(color, alpha);
      }
    `,
    transparent: true,
  });

  /* ─── Sector Geometry Helpers ─────────────────────────── */
  function createHexBoundaryGeo(radius) {
    const points = [];
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      points.push(new THREE.Vector3(
        Math.cos(angle) * radius, 0, Math.sin(angle) * radius
      ));
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }

  function createHexFillGeo(radius) {
    const shape = new THREE.Shape();
    for (let i = 0; i <= 6; i++) {
      const angle = (i / 6) * Math.PI * 2 - Math.PI / 6;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) shape.moveTo(x, y);
      else shape.lineTo(x, y);
    }
    return new THREE.ShapeGeometry(shape);
  }

  function computeSectorPositions(types) {
    const count = types.length;
    const positions = {};
    if (count === 1) {
      positions[types[0].id] = { x: 0, z: 0 };
      return positions;
    }
    const angleStep = (Math.PI * 2) / count;
    const startAngle = -Math.PI / 2;
    types.forEach((type, i) => {
      const angle = startAngle + i * angleStep;
      positions[type.id] = {
        x: Math.cos(angle) * SECTOR_RADIUS,
        z: Math.sin(angle) * SECTOR_RADIUS,
      };
    });
    return positions;
  }

  function scatterPlanetsInSector(missions, sectorSize) {
    const usableRadius = sectorSize * 0.7;
    return missions.map((mission, i) => {
      const h = hashString(mission.id);
      const r = (0.3 + (h % 1000) / 1000 * 0.7) * usableRadius;
      const baseAngle = ((h % 360) / 360) * Math.PI * 2;
      const indexOffset = (i / Math.max(missions.length, 1)) * Math.PI * 2;
      const finalAngle = baseAngle + indexOffset;
      return {
        mission,
        x: Math.cos(finalAngle) * r,
        z: Math.sin(finalAngle) * r,
        y: 0.08,
      };
    });
  }

  /* ─── Build Galaxy Map ───────────────────────────────── */
  function initGalaxyMap(missionsData, typesData) {
    typesData.forEach((t) => (MISSION_TYPES[t.id] = t));

    MISSIONS = missionsData.map((m) => {
      const typeDef = MISSION_TYPES[m.type] || {
        icon: "", name: "Unknown", description: "",
      };
      return {
        ...m,
        icon: typeDef.icon,
        typeName: typeDef.name,
        typeDesc: typeDef.description,
      };
    });

    // Group missions by type
    const missionsByType = {};
    typesData.forEach((t) => (missionsByType[t.id] = []));
    MISSIONS.forEach((m) => {
      if (missionsByType[m.type]) missionsByType[m.type].push(m);
    });

    const sectorPositions = computeSectorPositions(typesData);

    typesData.forEach((type) => {
      const sectorGroup = new THREE.Group();
      sectorGroup.name = "sector-" + type.id;
      const pos = sectorPositions[type.id];
      sectorGroup.position.set(pos.x, 0, pos.z);
      sectorGroup.userData = { typeId: type.id, typeName: type.name };

      // Hex boundary line
      const boundaryLine = new THREE.LineLoop(
        createHexBoundaryGeo(SECTOR_SIZE),
        new THREE.LineBasicMaterial({
          color: 0x00f0ff, transparent: true, opacity: 0.25,
        })
      );
      sectorGroup.add(boundaryLine);

      // Hex fill (for raycasting)
      const fillMesh = new THREE.Mesh(
        createHexFillGeo(SECTOR_SIZE),
        new THREE.MeshBasicMaterial({
          color: 0x00f0ff, transparent: true, opacity: 0.03,
          side: THREE.DoubleSide,
        })
      );
      fillMesh.rotation.x = -Math.PI / 2;
      fillMesh.userData = { isSectorBoundary: true, typeId: type.id };
      sectorGroup.add(fillMesh);
      sectorBoundaries.push(fillMesh);

      // Scatter planets
      const missions = missionsByType[type.id] || [];
      const scattered = scatterPlanetsInSector(missions, SECTOR_SIZE);

      scattered.forEach((pp) => {
        const mat = markerShaderMat.clone();
        const mesh = new THREE.Mesh(planetGeo, mat);
        mesh.position.set(pp.x, pp.y, pp.z);
        mesh.userData = pp.mission;
        sectorGroup.add(mesh);
        planetMeshes.push(mesh);

        // Pillar line
        const pillarGeo = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(pp.x, 0, pp.z),
          new THREE.Vector3(pp.x, pp.y + PLANET_SIZE + 0.05, pp.z),
        ]);
        const pillarMat = new THREE.LineBasicMaterial({
          color: 0x00f0ff, transparent: true, opacity: 0.2,
        });
        sectorGroup.add(new THREE.Line(pillarGeo, pillarMat));
      });

      galaxyGroup.add(sectorGroup);
      sectorGroups[type.id] = sectorGroup;
    });

    initLabels();
    initQuickSelect();
  }

  /* ─── Data Loading ───────────────────────────────────── */
  Promise.all([
    fetch("data/missions.json").then((r) => r.json()),
    fetch("data/mission_types.json").then((r) => r.json()),
    fetch("data/ship_names.json").then((r) => r.json()),
  ]).then(([missions, types, shipNames]) => {
    initGalaxyMap(missions, types);
    initShip(shipNames);
  }).catch((e) => console.error("Failed to load data:", e));

  /* ─── Tech Stack (Arsenal) ───────────────────────────── */
  function initStack(data) {
    const stackContainer = document.getElementById("stack-list");
    if (!stackContainer) return;
    stackContainer.innerHTML = data.map((item) =>
      `<img src="https://skillicons.dev/icons?i=${item.icon}" alt="${item.name}" title="${item.name}" />`
    ).join("");
  }

  fetch("data/stack.json")
    .then((r) => r.json())
    .then((data) => initStack(data))
    .catch((e) => console.error("Failed to load stack:", e));

  /* ─── Labels ─────────────────────────────────────────── */
  const labelContainer = document.getElementById("mission-labels");
  const sectorLabelElements = {};
  const planetLabelElements = {};

  function initLabels() {
    // Sector labels
    Object.entries(MISSION_TYPES).forEach(([typeId, typeDef]) => {
      const el = document.createElement("div");
      el.className = "sector-label";
      el.dataset.sector = typeId;
      el.innerHTML = `
        <img src="${typeDef.icon}" class="sector-icon" alt="${typeDef.name}" onerror="this.style.display='none'" />
        <span class="sector-name">${typeDef.name}</span>
      `;
      el.addEventListener("click", () => focusSector(typeId));
      labelContainer.appendChild(el);
      sectorLabelElements[typeId] = el;
    });

    // Planet labels
    MISSIONS.forEach((m) => {
      const el = document.createElement("div");
      el.className = "mission-label planet-label hidden-label";
      el.dataset.mission = m.id;
      el.innerHTML = `<span class="mission-name">${m.name}</span>`;
      el.addEventListener("click", () => selectMission(m.id));
      labelContainer.appendChild(el);
      planetLabelElements[m.id] = el;
    });
  }

  function updateLabels() {
    const rect = container.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const offsetX = rect.left;
    const offsetY = rect.top;

    // Sector labels
    Object.entries(sectorLabelElements).forEach(([typeId, el]) => {
      const group = sectorGroups[typeId];
      if (!group) return;

      const worldPos = new THREE.Vector3();
      group.getWorldPosition(worldPos);
      worldPos.y += 0.5;

      const projected = worldPos.clone().project(camera);
      el.style.left = (offsetX + (projected.x * 0.5 + 0.5) * width) + "px";
      el.style.top = (offsetY + (-projected.y * 0.5 + 0.5) * height) + "px";
      el.classList.toggle("hidden-label", viewMode === "focus");
    });

    // Planet labels
    MISSIONS.forEach((m) => {
      const el = planetLabelElements[m.id];
      const mesh = planetMeshes.find((pm) => pm.userData.id === m.id);
      if (!mesh || !el) return;

      const worldPos = new THREE.Vector3();
      mesh.getWorldPosition(worldPos);
      worldPos.y += PLANET_SIZE + 0.12;

      const projected = worldPos.clone().project(camera);
      const x = offsetX + (projected.x * 0.5 + 0.5) * width;
      const y = offsetY + (-projected.y * 0.5 + 0.5) * height;

      el.style.left = x + "px";
      el.style.top = y + "px";

      const showPlanet =
        (viewMode === "focus" && m.type === focusedSectorId) ||
        activeMission === m.id;
      el.classList.toggle("hidden-label", !showPlanet);

      const isOccludedByPanel = window.innerWidth > 768 && x > window.innerWidth * 0.68;
      el.classList.toggle("behind-globe", isOccludedByPanel);
    });
  }

  /* ─── Quick Select Sidebar ───────────────────────────── */
  const qsToggle = document.getElementById("quickselect-toggle");
  const qsPanel = document.getElementById("quickselect-panel");
  const qsClose = document.getElementById("quickselect-close");
  const qsList = document.getElementById("quickselect-list");
  const qsItems = {};

  function initQuickSelect() {
    const typeOrder = Object.keys(MISSION_TYPES);

    typeOrder.forEach((typeId) => {
      const typeDef = MISSION_TYPES[typeId];
      const typeMissions = MISSIONS.filter((m) => m.type === typeId);

      // Sector heading
      const header = document.createElement("li");
      header.className = "qs-sector-header";
      header.innerHTML = `<span class="qs-sector-name">SECTOR // ${typeDef.name.toUpperCase()}</span>`;
      header.addEventListener("click", () => {
        focusSector(typeId);
        closeQuickSelect();
      });
      qsList.appendChild(header);

      // Planets under this sector
      typeMissions.forEach((m, i) => {
        const li = document.createElement("li");
        li.className = "qs-item";
        li.dataset.mission = m.id;
        li.innerHTML = `
          <span class="qs-index">${String(i + 1).padStart(2, "0")}</span>
          <span class="qs-item-label">${m.name}</span>
        `;
        li.addEventListener("click", () => {
          focusSector(m.type);
          setTimeout(() => selectMission(m.id), FLY_DURATION + 100);
          closeQuickSelect();
        });
        qsList.appendChild(li);
        qsItems[m.id] = li;
      });
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

  /* ─── Raycaster ──────────────────────────────────────── */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  renderer.domElement.addEventListener("click", (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    if (viewMode === "overview") {
      // Check planets first (more specific)
      const planetHits = raycaster.intersectObjects(planetMeshes);
      if (planetHits.length > 0) {
        const mission = planetHits[0].object.userData;
        focusSector(mission.type);
        setTimeout(() => selectMission(mission.id), FLY_DURATION + 100);
        return;
      }
      // Then check sector fills
      const sectorHits = raycaster.intersectObjects(sectorBoundaries);
      if (sectorHits.length > 0) {
        focusSector(sectorHits[0].object.userData.typeId);
        return;
      }
    } else if (viewMode === "focus") {
      const focusPlanets = planetMeshes.filter(
        (m) => m.userData.type === focusedSectorId
      );
      const hits = raycaster.intersectObjects(focusPlanets);
      if (hits.length > 0) {
        selectMission(hits[0].object.userData.id);
      }
    }
  });

  /* ─── Hover cursor ───────────────────────────────────── */
  renderer.domElement.addEventListener("mousemove", (e) => {
    const rect = container.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const shipHits = shipMeshes.length > 0
      ? raycaster.intersectObjects(shipMeshes, true)
      : [];
    if (shipHits.length > 0) {
      renderer.domElement.style.cursor = "pointer";
      showShipTooltip(true);
      return;
    }
    showShipTooltip(false);

    const planetHits = raycaster.intersectObjects(planetMeshes);
    if (planetHits.length > 0) {
      renderer.domElement.style.cursor = "pointer";
      return;
    }

    if (viewMode === "overview") {
      const sectorHits = raycaster.intersectObjects(sectorBoundaries);
      renderer.domElement.style.cursor = sectorHits.length > 0 ? "pointer" : "grab";
    } else {
      renderer.domElement.style.cursor = "grab";
    }
  });

  /* ─── HUD Coordinates ────────────────────────────────── */
  const coordsEl = document.getElementById("hud-coords");

  function updateHudCoords(text) {
    if (coordsEl) coordsEl.textContent = text;
  }

  /* ─── Camera Animation ───────────────────────────────── */
  function animateCamera(targetPos, targetLookAt) {
    if (flyAnim) cancelAnimationFrame(flyAnim);

    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const startTime = performance.now();

    controls.enabled = false;

    function tick() {
      const elapsed = performance.now() - startTime;
      const t = Math.min(elapsed / FLY_DURATION, 1);
      const ease = easeInOutCubic(t);

      camera.position.lerpVectors(startPos, targetPos, ease);
      controls.target.lerpVectors(startTarget, targetLookAt, ease);
      controls.update();

      if (t < 1) {
        flyAnim = requestAnimationFrame(tick);
      } else {
        flyAnim = null;
        controls.enabled = true;
      }
    }

    flyAnim = requestAnimationFrame(tick);
  }

  /* ─── Sector Focus / Overview ────────────────────────── */
  // Store original opacities for dimming/restoring
  const originalOpacities = new Map();

  function storeSectorOpacities() {
    if (originalOpacities.size > 0) return;
    Object.values(sectorGroups).forEach((group) => {
      group.traverse((child) => {
        if (child.material && child.material.transparent) {
          originalOpacities.set(child.uuid, child.material.opacity);
        }
      });
    });
  }

  function focusSector(typeId) {
    if (viewMode === "focus" && focusedSectorId === typeId) return;

    const sectorGroup = sectorGroups[typeId];
    if (!sectorGroup) return;

    storeSectorOpacities();

    viewMode = "focus";
    focusedSectorId = typeId;

    const sectorWorldPos = new THREE.Vector3();
    sectorGroup.getWorldPosition(sectorWorldPos);

    const targetLookAt = sectorWorldPos.clone();
    const targetPos = new THREE.Vector3(
      sectorWorldPos.x,
      CAMERA_FOCUS_HEIGHT,
      sectorWorldPos.z + CAMERA_FOCUS_DISTANCE
    );

    animateCamera(targetPos, targetLookAt);

    // Dim non-focused sectors
    Object.entries(sectorGroups).forEach(([id, group]) => {
      const isFocused = id === typeId;
      group.traverse((child) => {
        if (child.material && child.material.transparent) {
          const orig = originalOpacities.get(child.uuid) || child.material.opacity;
          child.material.opacity = isFocused ? orig : orig * 0.12;
        }
      });
    });

    const typeDef = MISSION_TYPES[typeId];
    updateHudCoords("SECTOR // " + typeDef.name.toUpperCase());

    const sectorBackBtn = document.getElementById("sector-back-btn");
    if (sectorBackBtn) sectorBackBtn.classList.remove("hidden");

    flyShipToPosition(sectorWorldPos.x, sectorWorldPos.z);
  }

  function returnToOverview() {
    viewMode = "overview";
    focusedSectorId = null;

    animateCamera(CAMERA_OVERVIEW_POS.clone(), CAMERA_OVERVIEW_TARGET.clone());

    // Restore all sector opacities
    Object.values(sectorGroups).forEach((group) => {
      group.traverse((child) => {
        if (child.material && child.material.transparent) {
          const orig = originalOpacities.get(child.uuid);
          if (orig !== undefined) child.material.opacity = orig;
        }
      });
    });

    updateHudCoords("SECTOR // STANDBY");

    const sectorBackBtn = document.getElementById("sector-back-btn");
    if (sectorBackBtn) sectorBackBtn.classList.add("hidden");

    closeBriefing();
    flyShipToDefault();
  }

  /* ─── Briefing Panel Logic ───────────────────────────── */
  const viewOperator = document.getElementById("view-operator");
  const viewMission = document.getElementById("view-mission");
  const missionTitle = document.getElementById("mission-title");
  const missionBody = document.getElementById("mission-body-content");
  const missionBackBtn = document.getElementById("mission-back-btn");

  function selectMission(id) {
    const mission = MISSIONS.find((m) => m.id === id);
    if (!mission) return;

    if (activeMission === id) {
      closeBriefing();
      return;
    }

    activeMission = id;

    // Update planet label states
    Object.entries(planetLabelElements).forEach(([mid, el]) => {
      el.classList.toggle("active", mid === id);
    });

    // Update quick select active state
    Object.entries(qsItems).forEach(([mid, el]) => {
      el.classList.toggle("qs-active", mid === id);
    });

    // Update planet marker colors
    planetMeshes.forEach((mesh) => {
      const isActive = mesh.userData.id === id;
      mesh.material.uniforms.uSelected.value = isActive ? 1.0 : 0.0;
      mesh.material.uniforms.uColor.value.setHex(isActive ? 0xff6b35 : 0x00f0ff);
    });

    // Populate Mission View
    missionTitle.textContent = (mission.title || mission.name).toUpperCase();

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
            <span class="brief-field-label">SECTOR</span>
            <span class="brief-field-value brief-mono">${mission.typeName}</span>
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
        ` : ""}
      </div>
    `;

    const iconCell = missionBody.querySelector(".brief-icon-cell");
    if (iconCell) {
      iconCell.addEventListener("click", () => {
        const classCell = iconCell.nextElementSibling;
        if (classCell) classCell.classList.toggle("brief-class-expanded");
      });
    }

    const actionBtn = document.getElementById("mission-action-btn");
    actionBtn.href = mission.link || "#";
    actionBtn.target = "_blank";
    actionBtn.rel = "noopener noreferrer";
    actionBtn.textContent = (mission.link_text || "INITIATE PROTOCOL").toUpperCase();

    viewOperator.classList.remove("active");
    viewMission.classList.add("active");

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

    updateHudCoords("SECTOR // " + mission.typeName.toUpperCase() + " // " + mission.name.toUpperCase());

    // Fly camera to the planet
    const planetMesh = planetMeshes.find((pm) => pm.userData.id === id);
    if (planetMesh) {
      const worldPos = new THREE.Vector3();
      planetMesh.getWorldPosition(worldPos);
      const camTarget = new THREE.Vector3(
        worldPos.x,
        CAMERA_FOCUS_HEIGHT - 1,
        worldPos.z + CAMERA_FOCUS_DISTANCE
      );
      animateCamera(camTarget, worldPos);
      flyShipToPosition(worldPos.x, worldPos.z);
    }
  }

  function closeBriefing() {
    viewMission.classList.remove("active");
    viewOperator.classList.add("active");
    activeMission = null;

    Object.values(planetLabelElements).forEach((el) => el.classList.remove("active"));
    Object.values(qsItems).forEach((el) => el.classList.remove("qs-active"));
    planetMeshes.forEach((mesh) => {
      mesh.material.uniforms.uSelected.value = 0.0;
      mesh.material.uniforms.uColor.value.setHex(0x00f0ff);
    });

    if (viewMode === "focus" && focusedSectorId) {
      const typeDef = MISSION_TYPES[focusedSectorId];
      updateHudCoords("SECTOR // " + typeDef.name.toUpperCase());
      const sectorGroup = sectorGroups[focusedSectorId];
      if (sectorGroup) {
        const pos = new THREE.Vector3();
        sectorGroup.getWorldPosition(pos);
        flyShipToPosition(pos.x, pos.z);
      }
    } else {
      updateHudCoords("SECTOR // STANDBY");
      flyShipToDefault();
    }
  }

  missionBackBtn.addEventListener("click", closeBriefing);

  // ESC key — close briefing first, then return to overview
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (activeMission) {
        closeBriefing();
      } else if (viewMode === "focus") {
        returnToOverview();
      }
    }
  });

  // Sector back button
  const sectorBackBtn = document.getElementById("sector-back-btn");
  if (sectorBackBtn) {
    sectorBackBtn.addEventListener("click", returnToOverview);
  }

  /* ─── Sync Panel Data ────────────────────────────────── */
  window.syncPanelData = function () {
    const loc = document.getElementById("profile-location");
    const panelLoc = document.getElementById("panel-location");
    if (loc && panelLoc) panelLoc.textContent = loc.textContent;

    const comp = document.getElementById("profile-company");
    const panelComp = document.getElementById("panel-company");
    if (comp && panelComp) panelComp.textContent = comp.textContent;

    const web = document.getElementById("profile-website");
    const panelWeb = document.getElementById("panel-website");
    if (web && panelWeb) panelWeb.textContent = web.textContent;

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

  /* ─── HUD Date ───────────────────────────────────────── */
  const hudDate = document.getElementById("hud-date");
  if (hudDate) {
    const now = new Date();
    hudDate.textContent =
      now.toISOString().slice(0, 10).replace(/-/g, ".") +
      " // " +
      now.toTimeString().slice(0, 5) +
      " UTC";
  }

  /* ─── Resize ─────────────────────────────────────────── */
  function handleResize() {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  }

  window.addEventListener("resize", handleResize);
  handleResize();

  /* ─── Animate Loop ───────────────────────────────────── */
  function animate() {
    requestAnimationFrame(animate);
    time += 0.016;

    // Update planet shaders
    planetMeshes.forEach((mesh) => {
      mesh.material.uniforms.uTime.value = time;
    });

    // Ship idle bob + holographic flicker
    if (shipGroup) {
      if (!shipFlyAnim) {
        shipGroup.position.y = SHIP_HOVER_Y + Math.sin(time * 2.5) * 0.02;
      }
      // Subtle holographic flicker on wireframe materials
      shipGroup.traverse(function(child) {
        if (child.material && child.material.wireframe) {
          child.material.opacity = 0.6 + Math.sin(time * 4 + child.id * 0.1) * 0.2;
        }
      });
      updateShipTooltip();
    }

    controls.update();
    updateLabels();
    renderer.render(scene, camera);
  }

  animate();

  // Expose selectMission globally
  window.selectMission = selectMission;

  /* ─── Mobile Drawer Toggle ───────────────────────────── */
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
