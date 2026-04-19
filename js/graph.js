(() => {
  const container = document.getElementById('graph-container');
  if (!container) return;

  /* ── Scene ───────────────────────────────────────────────────── */
  const scene = new THREE.Scene();

  const camera = new THREE.PerspectiveCamera(
    50, container.clientWidth / container.clientHeight, 0.1, 100
  );
  camera.position.set(0, 2, 14);
  camera.lookAt(0, 0, 0);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setClearColor(0x1a0a0e, 1);
  container.appendChild(renderer.domElement);

  /* ── Controls ────────────────────────────────────────────────── */
  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.07;
  controls.enableZoom = true;
  controls.enablePan = false;
  controls.rotateSpeed = 0.5;
  controls.minDistance = 4;
  controls.maxDistance = 22;

  /* ── Lighting ────────────────────────────────────────────────── */
  scene.add(new THREE.AmbientLight(0xffffff, 0.5));
  const dirLight = new THREE.DirectionalLight(0xf2e8ea, 0.7);
  dirLight.position.set(6, 10, 6);
  scene.add(dirLight);

  /* ── Background particles ────────────────────────────────────── */
  const pCount = 900;
  const pPos = new Float32Array(pCount * 3);
  for (let i = 0; i < pCount; i++) {
    pPos[i * 3]     = (Math.random() - 0.5) * 50;
    pPos[i * 3 + 1] = (Math.random() - 0.5) * 50;
    pPos[i * 3 + 2] = (Math.random() - 0.5) * 50;
  }
  const pGeo = new THREE.BufferGeometry();
  pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
  scene.add(new THREE.Points(pGeo, new THREE.PointsMaterial({
    color: 0xf2e8ea, size: 0.045, transparent: true, opacity: 0.2,
  })));

  /* ── DOM refs ────────────────────────────────────────────────── */
  const labelsEl   = document.getElementById('graph-labels');
  const panel      = document.getElementById('graph-panel');
  const panelClose = document.getElementById('graph-panel-close');
  const panelType  = document.getElementById('graph-panel-type');
  const panelTitle = document.getElementById('graph-panel-title');
  const panelDesc  = document.getElementById('graph-panel-desc');
  const panelTags  = document.getElementById('graph-panel-tags');
  const panelLink  = document.getElementById('graph-panel-link');

  /* ── State ───────────────────────────────────────────────────── */
  let nodes      = [];
  let edges      = [];
  let nodeMeshes = [];
  let labelEls   = [];
  let hoveredIdx = -1;
  let flyAnim    = null;
  let running    = false;

  const OVERVIEW_POS    = new THREE.Vector3(0, 2, 14);
  const OVERVIEW_TARGET = new THREE.Vector3(0, 0, 0);

  /* ── Force simulation ────────────────────────────────────────── */
  function simulate(positions, edgeList, iterations) {
    const N  = positions.length;
    const vx = new Float32Array(N);
    const vy = new Float32Array(N);
    const vz = new Float32Array(N);
    const REST = 3.8;

    for (let iter = 0; iter < iterations; iter++) {
      // Repulsion
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = positions[j].x - positions[i].x;
          const dy = positions[j].y - positions[i].y;
          const dz = positions[j].z - positions[i].z;
          const d2 = dx*dx + dy*dy + dz*dz || 0.0001;
          const d  = Math.sqrt(d2);
          const f  = 1.4 / d2;
          vx[i] -= dx/d*f;  vy[i] -= dy/d*f;  vz[i] -= dz/d*f;
          vx[j] += dx/d*f;  vy[j] += dy/d*f;  vz[j] += dz/d*f;
        }
      }
      // Spring attraction
      for (const e of edgeList) {
        const a = positions[e.source];
        const b = positions[e.target];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dz = b.z - a.z;
        const d  = Math.sqrt(dx*dx + dy*dy + dz*dz) || 0.0001;
        const f  = (d - REST) * 0.04;
        vx[e.source] += dx/d*f;  vy[e.source] += dy/d*f;  vz[e.source] += dz/d*f;
        vx[e.target] -= dx/d*f;  vy[e.target] -= dy/d*f;  vz[e.target] -= dz/d*f;
      }
      // Centre gravity
      for (let i = 0; i < N; i++) {
        vx[i] -= positions[i].x * 0.012;
        vy[i] -= positions[i].y * 0.012;
        vz[i] -= positions[i].z * 0.012;
      }
      // Integrate + dampen
      for (let i = 0; i < N; i++) {
        positions[i].x += vx[i];
        positions[i].y += vy[i];
        positions[i].z += vz[i];
        vx[i] *= 0.82;
        vy[i] *= 0.82;
        vz[i] *= 0.82;
      }
    }
  }

  /* ── Build graph ─────────────────────────────────────────────── */
  function buildGraph(stack, missions) {
    const rand = () => (Math.random() - 0.5) * 8;

    const techNodes = stack.map(s => ({
      id: s.icon, label: s.name, type: 'tech',
      radius: 0.32, color: 0x6B1E2E, glowColor: 0x8B2E42,
      data: s,
      x: rand(), y: rand(), z: rand(),
    }));

    const projectNodes = missions.map(m => ({
      id: m.id, label: m.name || m.title, type: 'project',
      radius: 0.20, color: 0xF8F5F5, glowColor: 0xA85068,
      data: m,
      x: rand(), y: rand(), z: rand(),
    }));

    nodes = [...techNodes, ...projectNodes];

    const techIndex = {};
    techNodes.forEach((n, i) => { techIndex[n.id] = i; });

    missions.forEach((m, mi) => {
      const pIdx = techNodes.length + mi;
      (m.technologies || []).forEach(t => {
        if (techIndex[t] !== undefined) {
          edges.push({ source: techIndex[t], target: pIdx });
        }
      });
    });

    simulate(nodes, edges, 300);
    buildMeshes();
    buildEdgeLines();
    buildLabels();
  }

  /* ── Three.js objects ────────────────────────────────────────── */
  function buildMeshes() {
    nodeMeshes = nodes.map((n, i) => {
      const group = new THREE.Group();
      group.position.set(n.x, n.y, n.z);

      const core = new THREE.Mesh(
        new THREE.SphereGeometry(n.radius, 22, 22),
        new THREE.MeshStandardMaterial({
          color: n.color,
          emissive: n.glowColor,
          emissiveIntensity: n.type === 'tech' ? 0.55 : 0.3,
          roughness: 0.35,
          metalness: 0.15,
        })
      );
      group.add(core);

      // Soft glow halo
      group.add(new THREE.Mesh(
        new THREE.SphereGeometry(n.radius * 3.0, 16, 16),
        new THREE.MeshBasicMaterial({
          color: n.glowColor, transparent: true,
          opacity: n.type === 'tech' ? 0.09 : 0.06,
          side: THREE.BackSide,
        })
      ));

      group._idx  = i;
      group._core = core;
      scene.add(group);
      return group;
    });
  }

  function buildEdgeLines() {
    if (!edges.length) return;
    const pts = [];
    for (const e of edges) {
      const a = nodes[e.source], b = nodes[e.target];
      pts.push(a.x, a.y, a.z, b.x, b.y, b.z);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({
      color: 0x8B2E42, transparent: true, opacity: 0.28,
    })));
  }

  function buildLabels() {
    labelsEl.innerHTML = '';
    labelEls = nodes.map(n => {
      const el = document.createElement('span');
      el.className = 'graph-node-label';
      el.textContent = n.label;
      labelsEl.appendChild(el);
      return el;
    });
  }

  /* ── Interaction ─────────────────────────────────────────────── */
  const raycaster = new THREE.Raycaster();
  const mouse     = new THREE.Vector2();

  container.addEventListener('mousemove', e => {
    const r = container.getBoundingClientRect();
    mouse.x =  ((e.clientX - r.left) / r.width)  * 2 - 1;
    mouse.y = -((e.clientY - r.top)  / r.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);

    const coreMeshes = nodeMeshes.map(g => g._core);
    const hits = raycaster.intersectObjects(coreMeshes);
    const newIdx = hits.length ? hits[0].object.parent._idx : -1;

    if (newIdx !== hoveredIdx) {
      if (hoveredIdx >= 0) {
        nodeMeshes[hoveredIdx].scale.setScalar(1);
        labelEls[hoveredIdx].classList.remove('hovered');
      }
      hoveredIdx = newIdx;
      if (hoveredIdx >= 0) {
        nodeMeshes[hoveredIdx].scale.setScalar(1.3);
        labelEls[hoveredIdx].classList.add('hovered');
        container.style.cursor = 'pointer';
      } else {
        container.style.cursor = '';
      }
    }
  });

  container.addEventListener('click', () => {
    if (hoveredIdx >= 0) openPanel(hoveredIdx);
    else closePanel();
  });

  /* ── Panel ───────────────────────────────────────────────────── */
  function openPanel(idx) {
    const n = nodes[idx];

    if (n.type === 'tech') {
      panelType.textContent = 'Technology';
      panelTitle.textContent = n.data.name;
      const linked = edges
        .filter(e => e.source === idx || e.target === idx)
        .map(e => nodes[e.source === idx ? e.target : e.source].label);
      panelDesc.textContent = linked.length
        ? `Used in: ${linked.join(', ')}.`
        : 'No linked projects yet.';
      panelTags.innerHTML = '';
      panelLink.style.display = 'none';
    } else {
      const m = n.data;
      panelType.textContent = m.type
        ? m.type.charAt(0).toUpperCase() + m.type.slice(1)
        : 'Project';
      panelTitle.textContent = m.title || m.name;
      panelDesc.textContent  = m.description || '';
      panelTags.innerHTML = (m.technologies || []).map(t => {
        const tech = nodes.find(nd => nd.type === 'tech' && nd.id === t);
        return `<span class="graph-tag">${tech ? tech.label : t}</span>`;
      }).join('');
      if (m.link) {
        panelLink.href        = m.link;
        panelLink.textContent = m.link_text || 'View Project';
        panelLink.style.display = '';
      } else {
        panelLink.style.display = 'none';
      }
    }

    panel.classList.add('open');

    // Ease camera toward node
    const target = new THREE.Vector3(n.x, n.y, n.z);
    const offset = camera.position.clone().sub(target).normalize().multiplyScalar(5.5);
    easeCamera(target.clone().add(offset), target, 850);
  }

  function closePanel() {
    panel.classList.remove('open');
    easeCamera(OVERVIEW_POS.clone(), OVERVIEW_TARGET.clone(), 850);
  }

  panelClose.addEventListener('click', closePanel);

  /* ── Camera easing ───────────────────────────────────────────── */
  function easeCamera(destPos, destTarget, ms) {
    flyAnim = null;
    const p0 = camera.position.clone();
    const t0 = controls.target.clone();
    const t1 = performance.now();
    flyAnim = now => {
      const t = Math.min((now - t1) / ms, 1);
      const e = t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3) / 2;
      camera.position.lerpVectors(p0, destPos, e);
      controls.target.lerpVectors(t0, destTarget, e);
      if (t >= 1) flyAnim = null;
    };
  }

  /* ── Label positions ─────────────────────────────────────────── */
  const _v = new THREE.Vector3();
  function updateLabels() {
    if (!labelEls.length) return;
    const w = container.clientWidth;
    const h = container.clientHeight;
    nodes.forEach((n, i) => {
      _v.set(n.x, n.y - nodes[i].radius - 0.05, n.z);
      _v.project(camera);
      if (_v.z > 1) { labelEls[i].style.display = 'none'; return; }
      labelEls[i].style.display = '';
      labelEls[i].style.left = ((_v.x + 1) / 2 * w) + 'px';
      labelEls[i].style.top  = ((-_v.y + 1) / 2 * h) + 'px';
    });
  }

  /* ── Render loop ─────────────────────────────────────────────── */
  function animate(now) {
    if (!running) return;
    requestAnimationFrame(animate);
    if (flyAnim) flyAnim(now);
    controls.update();
    updateLabels();
    renderer.render(scene, camera);
  }

  /* ── Resize ──────────────────────────────────────────────────── */
  window.addEventListener('resize', () => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });

  /* ── Start on scroll into view ───────────────────────────────── */
  const section = document.getElementById('graph-section');
  if (section) {
    new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !running) {
        running = true;
        container.classList.add('graph-ready');
        requestAnimationFrame(animate);
      }
    }, { threshold: 0.1 }).observe(section);
  }

  /* ── Load data ───────────────────────────────────────────────── */
  Promise.all([
    fetch('data/stack.json').then(r => r.json()),
    fetch('data/missions.json').then(r => r.json()),
  ]).then(([stack, missions]) => buildGraph(stack, missions))
    .catch(() => {});
})();
