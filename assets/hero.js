// Creator OS hero scene: one topic at the core, eleven modules on three orbits
// (Create, Grow, Run), signal pulses travelling from the core to every module.
import * as THREE from './three.module.min.js';

const host = document.getElementById('system');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function webglOK() {
  try {
    const c = document.createElement('canvas');
    return !!(window.WebGLRenderingContext && (c.getContext('webgl2') || c.getContext('webgl')));
  } catch (e) { return false; }
}

if (host && webglOK()) init();

function init() {
  const TEAL = 0x4cb1ca, SIGNAL = 0x00adef, PANEL = 0x171f30, INK = 0xf1f5f9;

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(38, 1, 0.1, 100);
  camera.position.set(0, 0.6, 15.5);

  // Soft round glow texture, drawn once.
  const glowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const g = c.getContext('2d');
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,255,255,1)');
    r.addColorStop(0.25, 'rgba(255,255,255,.55)');
    r.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = r; g.fillRect(0, 0, 128, 128);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const glow = (color, size, opacity) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({
      map: glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending
    }));
    s.scale.setScalar(size); return s;
  };

  const system = new THREE.Group();
  system.rotation.set(0.38, 0, -0.12);
  scene.add(system);

  // Core: the one topic everything starts from.
  const core = new THREE.Group();
  const coreGeo = new THREE.IcosahedronGeometry(1.05, 1);
  core.add(new THREE.Mesh(coreGeo, new THREE.MeshBasicMaterial({ color: 0x0e1525, transparent: true, opacity: 0.92 })));
  core.add(new THREE.LineSegments(new THREE.EdgesGeometry(coreGeo),
    new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.95 })));
  const inner = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.IcosahedronGeometry(0.55, 0)),
    new THREE.LineBasicMaterial({ color: SIGNAL, transparent: true, opacity: 0.8 }));
  core.add(inner);
  const coreGlow = glow(TEAL, 5.2, 0.35);
  core.add(coreGlow);
  system.add(core);

  // Three orbits: Create (4), Grow (4), Run (3).
  const ORBITS = [
    { r: 3.1, n: 4, tilt: [0.0, 0.0, 0.0], speed: 0.16 },
    { r: 4.6, n: 4, tilt: [0.32, 0.0, 0.22], speed: -0.11 },
    { r: 6.1, n: 3, tilt: [-0.22, 0.0, -0.3], speed: 0.075 },
  ];
  const nodes = [];
  const nodeGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
  const nodeEdges = new THREE.EdgesGeometry(nodeGeo);

  ORBITS.forEach((o, oi) => {
    const tiltGroup = new THREE.Group();
    tiltGroup.rotation.set(o.tilt[0], o.tilt[1], o.tilt[2]);
    system.add(tiltGroup);

    const pts = new THREE.EllipseCurve(0, 0, o.r, o.r, 0, Math.PI * 2).getPoints(160)
      .map(p => new THREE.Vector3(p.x, 0, p.y));
    tiltGroup.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts),
      new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.18 - oi * 0.03 })));

    const spin = new THREE.Group();
    tiltGroup.add(spin);
    for (let i = 0; i < o.n; i++) {
      const a = (i / o.n) * Math.PI * 2 + oi * 0.7;
      const node = new THREE.Group();
      node.position.set(Math.cos(a) * o.r, 0, Math.sin(a) * o.r);
      node.add(new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color: PANEL })));
      node.add(new THREE.LineSegments(nodeEdges, new THREE.LineBasicMaterial({ color: TEAL })));
      const g = glow(TEAL, 1.5, 0.22);
      node.add(g);
      node.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      node.userData = { spinRate: 0.25 + Math.random() * 0.35, glow: g, phase: Math.random() };
      spin.add(node);
      nodes.push(node);
    }
    o.spin = spin;
  });

  // The community: a wide ring of members around the whole system.
  const members = [];
  const crowd = new THREE.Group();
  crowd.rotation.set(0.1, 0, 0.08);
  system.add(crowd);
  for (let i = 0; i < 64; i++) {
    const a = (i / 64) * Math.PI * 2 + (Math.random() - 0.5) * 0.06;
    const r = 7.2 + (Math.random() - 0.5) * 0.5;
    const m = glow(i % 5 === 0 ? SIGNAL : INK, 0.32, 0.5);
    m.position.set(Math.cos(a) * r, (Math.random() - 0.5) * 0.35, Math.sin(a) * r);
    m.userData = { tw: Math.random() * Math.PI * 2, base: i % 5 === 0 ? 0.75 : 0.4 };
    crowd.add(m); members.push(m);
  }

  // Links from the core to every module, plus a pulse riding each link.
  const linkPos = new Float32Array(nodes.length * 6);
  const linkGeo = new THREE.BufferGeometry();
  linkGeo.setAttribute('position', new THREE.BufferAttribute(linkPos, 3));
  system.add(new THREE.LineSegments(linkGeo,
    new THREE.LineBasicMaterial({ color: TEAL, transparent: true, opacity: 0.16 })));

  const pulses = nodes.map(() => { const p = glow(SIGNAL, 0.55, 0.95); system.add(p); return p; });

  // Faint field of points behind the system.
  const N = 700, field = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) {
    const r = 9 + Math.random() * 9, th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1);
    field.set([r * Math.sin(ph) * Math.cos(th), r * Math.cos(ph) * 0.6, r * Math.sin(ph) * Math.sin(th) - 4], i * 3);
  }
  const fieldGeo = new THREE.BufferGeometry();
  fieldGeo.setAttribute('position', new THREE.BufferAttribute(field, 3));
  const stars = new THREE.Points(fieldGeo, new THREE.PointsMaterial({
    color: INK, size: 0.045, transparent: true, opacity: 0.45, depthWrite: false
  }));
  scene.add(stars);

  // Sizing.
  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the outer orbit in frame on narrow screens.
    camera.position.z = w / h < 0.9 ? 24 : 20.5;
    camera.updateProjectionMatrix();
    if (!running) render(lastT);
  }
  new ResizeObserver(resize).observe(host);

  // Gentle pointer parallax.
  const target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
  window.addEventListener('pointermove', e => {
    target.x = (e.clientX / window.innerWidth - 0.5) * 0.5;
    target.y = (e.clientY / window.innerHeight - 0.5) * 0.3;
  }, { passive: true });

  const wp = new THREE.Vector3();
  let lastT = 0;
  function render(t) {
    lastT = t;
    const s = t / 1000;
    ORBITS.forEach(o => { o.spin.rotation.y = s * o.speed; });
    core.rotation.y = s * 0.25; core.rotation.x = s * 0.12;
    inner.rotation.y = -s * 0.6;
    coreGlow.material.opacity = 0.3 + Math.sin(s * 1.6) * 0.06;

    system.updateMatrixWorld(true);
    nodes.forEach((n, i) => {
      n.rotation.x += 0.004 * n.userData.spinRate; n.rotation.y += 0.006 * n.userData.spinRate;
      n.getWorldPosition(wp); system.worldToLocal(wp);
      linkPos.set([0, 0, 0, wp.x, wp.y, wp.z], i * 6);
      const ph = (s * 0.42 + n.userData.phase) % 1;
      pulses[i].position.copy(wp).multiplyScalar(ph);
      pulses[i].material.opacity = Math.sin(Math.PI * ph) * 0.95;
      // A module brightens as its pulse arrives.
      n.userData.glow.material.opacity = 0.18 + Math.max(0, (ph - 0.82) / 0.18) * 0.5;
    });
    linkGeo.attributes.position.needsUpdate = true;
    crowd.rotation.y = -s * 0.03;
    members.forEach(m => { m.material.opacity = m.userData.base * (0.65 + 0.35 * Math.sin(s * 1.3 + m.userData.tw)); });

    cur.x += (target.x - cur.x) * 0.04; cur.y += (target.y - cur.y) * 0.04;
    system.rotation.y = cur.x + s * 0.03;
    system.rotation.x = 0.38 + cur.y;
    stars.rotation.y = s * 0.008;

    renderer.render(scene, camera);
  }

  let running = false, raf = 0, visible = true;
  function loop(t) { render(t); raf = requestAnimationFrame(loop); }
  function start() { if (!running && !reduceMotion && visible && !document.hidden) { running = true; raf = requestAnimationFrame(loop); } }
  function stop() { running = false; cancelAnimationFrame(raf); }

  new IntersectionObserver(([e]) => { visible = e.isIntersecting; visible ? start() : stop(); }).observe(host);
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  resize();
  render(6000); // a settled still frame, used as-is when motion is reduced
  host.classList.add('ready');
  start();
}
