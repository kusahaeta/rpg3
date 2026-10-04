'use strict';
// ============================================================
//  環境：空（雲と光のシェーダー）／床／遠景／ライト
//  遠くには、いつも「にゃんだーの樹」が見える（物語が進むと葉が色あせ、最後によみがえる）
// ============================================================
const THEMES = {
  // 晴れた草原（ぽかぽか村）
  meadow: { top: '#5aa8f0', horizon: '#cfe8ff', bottom: '#9ac878', nebA: '#ffffff', nebB: '#ffe8c8', fog: '#cfe4f4', fogD: 0.006, clouds: 1, sun: '#fff4d0', stars: 0,
    floor: '#86c064', floor2: '#76b056', line: '#ffe08a', key: '#fff6e0', sky: '#d8ecff', ground: '#6a9a4a', rim: '#ffe8b8', metal: 0, pattern: 'grass', floorGlow: 0, rough: 0.95, light: 1.1 },
  // 夜の村（流星の夜）
  night: { top: '#0c1638', horizon: '#3a4a8a', bottom: '#1a2a2a', nebA: '#6a7aff', nebB: '#ffb8e8', fog: '#1a2448', fogD: 0.009, clouds: 0.3, sun: '#c8d8ff', stars: 1.2,
    floor: '#3a5a3a', floor2: '#34503a', line: '#ffe08a', key: '#b8c8ff', sky: '#6a7ab8', ground: '#1a2a2a', rim: '#8aa8ff', metal: 0, pattern: 'grass', floorGlow: 0, rough: 0.95, light: 0.8 },
  // ほしふる森：こもれびと、降ってくる星の粒
  forest: { top: '#3a7ab8', horizon: '#b8e0c8', bottom: '#4a7a3a', nebA: '#c8ffd8', nebB: '#fff0a8', fog: '#8ab8a0', fogD: 0.014, clouds: 0.6, sun: '#fff0c0', stars: 0.2,
    floor: '#5a8a44', floor2: '#4e7a3a', line: '#fff0a8', key: '#fff0d0', sky: '#b8e0c8', ground: '#3a5a2a', rim: '#d8ffb8', metal: 0, pattern: 'moss', floorGlow: 0, rough: 0.95, light: 1.0 },
  // ミャオ街道：金色の午後
  road: { top: '#4a9ae8', horizon: '#ffe0b0', bottom: '#b8a870', nebA: '#ffffff', nebB: '#ffd8a8', fog: '#f0dcc0', fogD: 0.005, clouds: 0.9, sun: '#ffe8b0', stars: 0,
    floor: '#9ac068', floor2: '#8ab058', line: '#ffd27a', key: '#fff0d0', sky: '#ffe8c8', ground: '#8a8a5a', rim: '#ffd8a8', metal: 0, pattern: 'grass', floorGlow: 0, rough: 0.95, light: 1.1 },
  // ニャハハ王国：青空と、あたたかい色の石畳
  kingdom: { top: '#4a9ae8', horizon: '#ffe4ec', bottom: '#c8b8a0', nebA: '#ffffff', nebB: '#ffd8e8', fog: '#f4e2e6', fogD: 0.006, clouds: 1, sun: '#fff0d0', stars: 0,
    floor: '#dcc8aa', floor2: '#cbb392', line: '#ffb8d8', key: '#fff4e0', sky: '#ffeef4', ground: '#a8987e', rim: '#ffd8e8', metal: 0.05, pattern: 'cobble', floorGlow: 0, rough: 0.9, light: 1.1 },
  // 笑顔の塔（屋内）：サーカスのような塔
  tower: { top: '#3a1a4a', horizon: '#8a3a7a', bottom: '#2a1a2a', nebA: '#ff8ad8', nebB: '#ffd27a', fog: '#3a1a3a', fogD: 0.014, clouds: 0, sun: '#ffd8f0', stars: 0.5,
    floor: '#5a2a4a', floor2: '#6a3458', line: '#ffd27a', key: '#ffe8f4', sky: '#ffb8e0', ground: '#3a1a2a', rim: '#ff9ad8', metal: 0.1, pattern: 'checker', floorGlow: 0.15, rough: 0.6, light: 1.05 },
  // くろねこ谷：たそがれ、墓標の谷
  valley: { top: '#2a2a58', horizon: '#e8906a', bottom: '#3a3448', nebA: '#ff9a7a', nebB: '#b88aff', fog: '#6a5a78', fogD: 0.01, clouds: 0.7, sun: '#ffb88a', stars: 0.4,
    floor: '#5a5a58', floor2: '#4e4e50', line: '#c8a8ff', key: '#ffd0b8', sky: '#b8a0c8', ground: '#2a2a38', rim: '#ff9a7a', metal: 0, pattern: 'dirt', floorGlow: 0, rough: 0.95, light: 0.95 },
  // 黒影洞窟：光る水晶の洞窟
  cave: { top: '#0a0818', horizon: '#1a1438', bottom: '#0a0810', nebA: '#6a4aff', nebB: '#4ae0ff', fog: '#141028', fogD: 0.022, clouds: 0, sun: '#8a7aff', stars: 0,
    floor: '#3a3444', floor2: '#34303e', line: '#8a6aff', key: '#c8b8ff', sky: '#8a7ab8', ground: '#1a1428', rim: '#8a6aff', metal: 0.1, pattern: 'rock', floorGlow: 0.35, rough: 0.9, light: 1.0 },
  // 古代遺跡：朝もやと苔むした石
  ruins: { top: '#5a9ac8', horizon: '#d8f0e8', bottom: '#7a9a78', nebA: '#c8fff0', nebB: '#fff0c8', fog: '#b8d8d0', fogD: 0.009, clouds: 0.8, sun: '#fff8e0', stars: 0,
    floor: '#a8a890', floor2: '#98987e', line: '#8affe0', key: '#fff8e8', sky: '#d0f0e8', ground: '#5a7a5a', rim: '#b8ffe8', metal: 0, pattern: 'tiles', floorGlow: 0.15, rough: 0.9, light: 1.05 },
  // 魔王領：紫の空。こわいはずなのに、どこか間が抜けている
  demon: { top: '#2a1048', horizon: '#c05a8a', bottom: '#2a1a30', nebA: '#ff6ad8', nebB: '#8a5aff', fog: '#4a2a58', fogD: 0.009, clouds: 0.8, sun: '#ff9ad8', stars: 0.6,
    floor: '#4a3a50', floor2: '#40324a', line: '#ff8ad8', key: '#ffd8f0', sky: '#c8a0e0', ground: '#2a1a30', rim: '#ff8ad8', metal: 0.05, pattern: 'cobble', floorGlow: 0.1, rough: 0.9, light: 1.0 },
  // にゃんだーの樹：金色の光
  tree: { top: '#4a78c8', horizon: '#ffe8b8', bottom: '#8a7a50', nebA: '#fff0b8', nebB: '#b8ffc8', fog: '#e8dcb8', fogD: 0.007, clouds: 0.6, sun: '#fff0c0', stars: 0.2,
    floor: '#8a7a4a', floor2: '#7a6a40', line: '#ffe08a', key: '#fff4d8', sky: '#fff0c8', ground: '#6a5a3a', rim: '#ffe8a8', metal: 0, pattern: 'roots', floorGlow: 0.2, rough: 0.9, light: 1.05 },
  // 樹の地下：暗い根と光る樹液
  root: { top: '#0a0a14', horizon: '#1a2418', bottom: '#080a08', nebA: '#8aff8a', nebB: '#ffe08a', fog: '#10180e', fogD: 0.02, clouds: 0, sun: '#b8ffb8', stars: 0,
    floor: '#3a3024', floor2: '#34281e', line: '#b8ff8a', key: '#d8ffc8', sky: '#8ab88a', ground: '#1a1a10', rim: '#b8ff8a', metal: 0, pattern: 'roots', floorGlow: 0.45, rough: 0.95, light: 0.95 },
  // 世界の果て：孤独が満ちる夜明け前
  end: { top: '#08061a', horizon: '#3a2a6a', bottom: '#0a0818', nebA: '#8a5aff', nebB: '#ff8ab8', fog: '#1a1438', fogD: 0.012, clouds: 0.4, sun: '#b8a8ff', stars: 1.2,
    floor: '#2a2438', floor2: '#241e30', line: '#b8a8ff', key: '#d8d0ff', sky: '#8a7ab8', ground: '#141024', rim: '#b8a8ff', metal: 0.05, pattern: 'dirt', floorGlow: 0.1, rough: 0.9, light: 0.95 },
  // ねこ神の夢：パステルのへんてこな夢
  dream: { top: '#ffb8e0', horizon: '#fff0d8', bottom: '#b8d8ff', nebA: '#ffffff', nebB: '#b8f0ff', fog: '#ffe0f0', fogD: 0.006, clouds: 1, sun: '#fffff0', stars: 0.3,
    floor: '#ffd8e8', floor2: '#ffe8f0', line: '#ff9ad8', key: '#fff8f0', sky: '#ffe8f8', ground: '#d8b8e8', rim: '#b8e8ff', metal: 0, pattern: 'checker', floorGlow: 0.1, rough: 0.7, light: 1.1 },
};

const SkyShader = {
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `
    uniform vec3 top, horizon, bottom, nebA, nebB, sun; uniform float time, stars, clouds;
    varying vec3 vDir;
    float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 col = mix(horizon, top, smoothstep(0.0, 0.6, h));
      col = mix(col, bottom, smoothstep(0.0, -0.3, h));
      // 太陽のにじみ
      vec3 sd = normalize(vec3(0.45, 0.35, -0.8));
      float s = max(dot(d, sd), 0.0);
      col += sun * (pow(s, 64.0) * 1.4 + pow(s, 6.0) * 0.25);
      // もこもこの雲（地平線近くに多い）
      if (clouds > 0.0) {
        vec2 uv = d.xz / max(0.08, h + 0.12);
        float c = fbm(vec3(uv * 0.55 + vec2(time * 0.006, 0.0), 1.3));
        c = smoothstep(0.52, 0.78, c) * smoothstep(-0.02, 0.12, h) * smoothstep(0.95, 0.25, h);
        vec3 cc = mix(vec3(1.0), nebA, 0.35) + sun * pow(s, 4.0) * 0.4;
        col = mix(col, cc * (0.85 + 0.25 * fbm(vec3(uv * 1.7, 4.0))), c * clouds);
      }
      // 星（夜や洞窟）
      if (stars > 0.0) {
        float n = fbm(d * 3.0 + vec3(time * 0.004, 0.0, 0.0));
        col += nebB * pow(n, 4.0) * 1.6 * stars * smoothstep(0.0, 0.5, h);
        vec3 p = d * 220.0; float r = hash(floor(p));
        float st = step(1.0 - 0.01 * stars, r) * smoothstep(0.35, 0.0, length(fract(p) - 0.5)) * (0.6 + 0.4 * sin(time * 2.0 + r * 80.0));
        col += vec3(1.0, 0.97, 0.9) * st * smoothstep(-0.05, 0.1, h) * 2.0;
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

function makeSky(th) {
  const u = { time: { value: 0 }, stars: { value: th.stars || 0 }, clouds: { value: th.clouds || 0 } };
  for (const k of ['top', 'horizon', 'bottom', 'nebA', 'nebB', 'sun']) u[k] = { value: new THREE.Color(th[k] || '#ffffff') };
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 32), new THREE.ShaderMaterial({ uniforms: u, ...SkyShader, side: THREE.BackSide, depthWrite: false }));
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

// ---------- 床のテクスチャ ----------
function floorTextures(th, theme) {
  const S = 1024, mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const base = mk(), em = mk(), g = base.getContext('2d'), e = em.getContext('2d');
  g.fillStyle = th.floor; g.fillRect(0, 0, S, S);
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  const noise = (n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * a})`; g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 14, 2 + Math.random() * 3); } };
  const blobs = (n, cols, r0, r1) => { for (let i = 0; i < n; i++) { g.fillStyle = cols[i % cols.length]; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, r0 + Math.random() * (r1 - r0), 0, Math.PI * 2); g.fill(); } };
  switch (th.pattern || 'grid') {
    case 'grass': case 'moss': {
      blobs(220, [th.floor2, th.floor], 30, 90);
      g.globalAlpha = 0.5;
      for (let i = 0; i < 9000; i++) { const x = Math.random() * S, y = Math.random() * S; g.strokeStyle = Math.random() < 0.5 ? 'rgba(40,90,30,.5)' : 'rgba(200,240,150,.35)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 4, y - 6 - Math.random() * 6); g.stroke(); }
      g.globalAlpha = 1;
      if (th.pattern === 'grass') for (let i = 0; i < 90; i++) { const x = Math.random() * S, y = Math.random() * S, c = ['#ffffff', '#ffe07a', '#ffb8d8', '#b8d8ff'][i % 4]; for (let k = 0; k < 5; k++) { g.fillStyle = c; g.beginPath(); g.arc(x + Math.cos(k * 1.26) * 3, y + Math.sin(k * 1.26) * 3, 2.4, 0, Math.PI * 2); g.fill(); } g.fillStyle = '#ffcf4a'; g.beginPath(); g.arc(x, y, 1.6, 0, Math.PI * 2); g.fill(); }
      else { blobs(60, ['rgba(160,210,120,.35)'], 20, 50); for (let i = 0; i < 40; i++) { e.fillStyle = `rgba(255,240,160,${0.2 + Math.random() * 0.4})`; e.beginPath(); e.arc(Math.random() * S, Math.random() * S, 1.5 + Math.random() * 2, 0, Math.PI * 2); e.fill(); } }
      break;
    }
    case 'dirt': blobs(260, [th.floor2, th.floor], 20, 70); noise(6000, 0.08); for (let i = 0; i < 120; i++) { g.fillStyle = 'rgba(0,0,0,.18)'; g.beginPath(); g.ellipse(Math.random() * S, Math.random() * S, 4 + Math.random() * 6, 3 + Math.random() * 4, Math.random() * 3, 0, Math.PI * 2); g.fill(); } break;
    case 'cobble': {
      const r = 34;
      for (let y = 0; y < S / (r * 1.7) + 1; y++) for (let x = 0; x < S / (r * 2) + 1; x++) {
        const cx = x * r * 2 + (y % 2) * r, cy = y * r * 1.7;
        g.fillStyle = Math.random() < 0.5 ? th.floor : th.floor2; g.beginPath(); g.ellipse(cx, cy, r * 0.92, r * 0.8, Math.random() * 0.4, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(0,0,0,.25)'; g.lineWidth = 3; g.stroke();
      }
      noise(3000, 0.06); break;
    }
    case 'checker': {
      const n = 8, st = S / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? th.floor : th.floor2; g.fillRect(x * st, y * st, st, st); }
      e.strokeStyle = th.line; e.globalAlpha = 0.35; e.lineWidth = 3; for (let i = 0; i <= n; i++) { e.beginPath(); e.moveTo(i * st, 0); e.lineTo(i * st, S); e.stroke(); e.beginPath(); e.moveTo(0, i * st); e.lineTo(S, i * st); e.stroke(); }
      noise(1500, 0.05); break;
    }
    case 'roots': {
      blobs(200, [th.floor2, th.floor], 30, 80);
      g.lineCap = 'round';
      for (let k = 0; k < 26; k++) { let x = Math.random() * S, y = Math.random() * S, a = Math.random() * 6; g.strokeStyle = 'rgba(60,40,20,.55)'; e.strokeStyle = th.line; e.globalAlpha = 0.35; for (let j = 0; j < 12; j++) { const nx = x + Math.cos(a) * 30, ny = y + Math.sin(a) * 30; g.lineWidth = 14 - j; g.beginPath(); g.moveTo(x, y); g.lineTo(nx, ny); g.stroke(); e.lineWidth = 2; e.beginPath(); e.moveTo(x, y); e.lineTo(nx, ny); e.stroke(); x = nx; y = ny; a += (Math.random() - 0.5) * 0.8; } }
      noise(3000, 0.06); break;
    }
    case 'rock': case 'snow': {
      blobs(260, [th.floor2, th.floor], 20, 70); noise(5000, th.pattern === 'snow' ? 0.04 : 0.12);
      if (th.pattern === 'rock') { e.strokeStyle = th.line; e.globalAlpha = 0.5; e.lineWidth = 2;
        for (let k = 0; k < 30; k++) { let x = Math.random() * S, y = Math.random() * S; e.beginPath(); e.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; e.lineTo(x, y); } e.stroke(); } }
      break;
    }
    case 'tiles': {
      const n = 12, st = S / n;
      for (let y = 0; y < n; y++) for (let x = -1; x < n; x++) { const off = y % 2 ? st / 2 : 0; g.fillStyle = Math.random() < 0.5 ? th.floor : th.floor2; g.fillRect(x * st + off + 3, y * st + 3, st - 6, st - 6); }
      noise(2500, 0.08);
      for (let i = 0; i < 70; i++) { g.fillStyle = 'rgba(90,140,70,.35)'; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 6 + Math.random() * 18, 0, Math.PI * 2); g.fill(); }
      e.strokeStyle = th.line; e.globalAlpha = 0.25; e.lineWidth = 2;
      for (let y = 0; y < n; y += 4) for (let x = 0; x < n; x += 4) { e.beginPath(); e.arc(x * st + st / 2, y * st + st / 2, st * 0.3, 0, Math.PI * 2); e.stroke(); }
      break;
    }
    case 'planks': {
      const h = S / 16;
      for (let y = 0; y < 16; y++) { let x = -Math.random() * 200; while (x < S) { const w = 160 + Math.random() * 220; g.fillStyle = y % 2 ? th.floor : th.floor2; g.fillRect(x + 2, y * h + 2, w - 4, h - 4); g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w - 3, y * h, 3, h); x += w; } }
      noise(3000, 0.06); break;
    }
    default: {
      const n = 8, step = S / n;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { g.fillStyle = (x + y) % 2 ? th.floor : th.floor2; g.fillRect(x * step + 3, y * step + 3, step - 6, step - 6); }
    }
  }
  const t1 = new THREE.CanvasTexture(ecoShrink(base)), t2 = new THREE.CanvasTexture(ecoShrink(em));
  t1.colorSpace = t2.colorSpace = THREE.SRGBColorSpace;
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(th.repeat || 6, th.repeat || 6); t.anisotropy = 8; }
  return [t1, t2];
}

// にゃんだーの樹の元気（0＝枯れかけ、1＝満開）。物語の進み具合で変わる
function treeHealth() {
  if (typeof Story === 'undefined' || !Save.data) return 0.8;
  const f = Save.data.flags || {};
  if (f.treeRevived) return 1;
  const ch = Story.state.ch;
  return [0.85, 0.75, 0.62, 0.52, 0.42, 0.32, 0.18, 0.12][ch] ?? 0.12;
}

// scene に環境を構築し { update, particles } を返す
function buildEnvironment(scene, theme, renderer, opts = {}) {
  const th = { ...(THEMES[theme] || THEMES.meadow), ...((opts.zone && opts.zone.th) || {}) };
  const root = new THREE.Group(); scene.add(root);
  scene.fog = new THREE.FogExp2(th.fog, th.fogD);
  const sky = makeSky(th); root.add(sky);

  try {
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene(); envScene.add(makeSky(th));
    const rt = pm.fromScene(envScene, 0.02);
    scene.environment = rt.texture; scene.userData.envRT = rt;   // 場面を片付けるときに描画先ごと手放す
    scene.environmentIntensity = 0.35;
    pm.dispose(); disposeTree(envScene);
  } catch (e) { /* 環境マップなしでも描画可能 */ }

  root.add(new THREE.HemisphereLight(th.sky, th.ground, 0.85 * (th.light || 1)));
  const key = new THREE.DirectionalLight(th.key, 1.8 * Math.min(th.light || 1, 1.2));
  key.position.set(6, 12, 8); key.castShadow = true;
  key.shadow.mapSize.set(GFX.shadowSize(), GFX.shadowSize());
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  root.add(key); root.add(key.target);
  const rim = new THREE.DirectionalLight(th.rim, 1.1); rim.position.set(-6, 5, -10); root.add(rim);
  const fill = new THREE.DirectionalLight(th.rim, 0.3); fill.position.set(-4, 3, 10); root.add(fill);

  const [map, emap] = floorTextures(th, theme);
  if (opts.field && !th.floorRect) for (const t of [map, emap]) t.repeat.multiplyScalar(1.5);
  const floor = new THREE.Mesh(th.floorRect ? new THREE.PlaneGeometry(th.floorRect[0], th.floorRect[1]) : new THREE.CircleGeometry(opts.field ? 90 : 60, 96), new THREE.MeshStandardMaterial({
    map, emissiveMap: emap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: th.floorGlow ?? 0.3,
    metalness: th.metal || 0, roughness: th.rough ?? 0.85,
  }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  if (th.floorRect) floor.position.z = th.floorRect[2] || 0;

  const particles = new Particles(scene, 4000);
  const updaters = [];
  const T = { root, th, updaters, particles, colliders: [], field: !!opts.field, bare: !!opts.bare, focus: V3(), zone: opts.zone, turn: opts.turn || 0, theme,
    indoor: !!(opts.zone && opts.zone.map && (ARCH_STYLES[opts.zone.arch || 'station'] || {}).roof !== false) };
  (ENV_PROPS[theme] || ENV_PROPS.meadow)(T);
  if (!T.indoor && !T.noTree && opts.skyTree !== false && !(opts.zone && opts.zone.skyTree === false)) farTree(T);

  return {
    particles, key, colliders: T.colliders, root, focus: T.focus, floor,
    update(dt, t) {
      sky.material.uniforms.time.value = t;
      for (const f of updaters) f(dt, t);
    },
  };
}

// ---------- 遠景の部品 ----------
// にゃんだーの樹（遠くの地平線に。health で葉の色と実の数が変わる）
function worldTree(health = 0.8, s = 1) {
  const g = new THREE.Group();
  const bark = new THREE.MeshStandardMaterial({ color: '#8a7a6a', roughness: 0.95, fog: false });
  const trunk = new THREE.Mesh(lathe([[9, 0], [6, 6], [4.5, 20], [4, 34], [5.5, 42], [0.1, 46]], 16), bark); g.add(trunk);
  // 根
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = new THREE.Mesh(new THREE.ConeGeometry(2.4, 16, 8), bark); r.position.set(Math.cos(a) * 8, 1.5, Math.sin(a) * 8); r.rotation.set(Math.sin(a) * 1.2, 0, -Math.cos(a) * 1.2); g.add(r); }
  // 枝葉（元気がないほど灰色で、すき間が多い）
  const leafCol = new THREE.Color('#9a9a88').lerp(new THREE.Color('#5ad06a'), health);
  const leaf = new THREE.MeshStandardMaterial({ color: leafCol.clone().lerp(new THREE.Color('#c8dcf0'), 0.25), roughness: 0.9, emissive: leafCol.clone().multiplyScalar(0.15), fog: false });
  const n = Math.round(10 + health * 18);
  for (let i = 0; i < n; i++) {
    const a = i * 2.4, r = 8 + (i % 5) * 4, y = 40 + (i % 4) * 5 + Math.sin(i) * 3;
    const m = new THREE.Mesh(new THREE.SphereGeometry(9 + (i % 3) * 3, 14, 10), leaf); m.position.set(Math.cos(a) * r, y, Math.sin(a) * r * 0.8); m.scale.y = 0.72; g.add(m);
  }
  // 感情の実（光る）
  const fruitCols = ['#ffd24a', '#ff8ab8', '#8ad8ff', '#b8ff8a'];
  const fruits = [];
  for (let i = 0; i < Math.round(health * 16); i++) {
    const a = i * 1.7, r = 10 + (i % 4) * 5;
    const f = new THREE.Mesh(new THREE.SphereGeometry(1.1, 10, 8), glowMat(fruitCols[i % 4], 2.2, { fog: false })); f.position.set(Math.cos(a) * r, 36 + (i % 5) * 4, Math.sin(a) * r * 0.8 + 6); g.add(f); fruits.push(f);
  }
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#fff4c8', 0.35 * health + 0.08), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.setScalar(120); halo.position.y = 44; g.add(halo);
  g.scale.setScalar(s);
  return { g, fruits };
}
// にゃんだーの樹の方角：区画の地図上の位置（map2d）から見た、樹の根もとの向き（北が 0、東が π/2）
function treeAngle(Z) {
  const R = typeof FIELD_ZONES !== 'undefined' && FIELD_ZONES.tree_root;
  if (!Z || !Z.map2d || !R || Z === R) return -0.6;
  return Math.atan2(R.map2d[0] - Z.map2d[0], -(R.map2d[1] - Z.map2d[1]));
}
function farTree(T) {
  const h = treeHealth(), zt = T.zone && T.zone.treeAt;
  const { g, fruits } = worldTree(h, 1.6);
  // turn：戦場のように区画を回して置くときは、その分だけ樹も回す
  const a = (zt ? zt[0] : treeAngle(T.zone)) - T.turn, d = zt ? zt[1] : 230;
  g.position.set(Math.sin(a) * d, -6, -Math.cos(a) * d);
  T.root.add(g);
  T.updaters.push((dt, t) => fruits.forEach((f, i) => { f.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.15); }));
}
// なだらかな丘の遠景
function hills(T, col, r = 140, n = 16, hgt = 18, y0 = -4) {
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 1 });
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + Math.random() * 0.2, rr = r + Math.random() * 40;
    const h = new THREE.Mesh(new THREE.SphereGeometry(30 + Math.random() * 30, 16, 10), m);
    h.position.set(Math.cos(a) * rr, y0 - 10, Math.sin(a) * rr); h.scale.y = (hgt + Math.random() * hgt) / 45; T.root.add(h);
  }
}
// 遠くの木々（ぽこぽこした木）
function farTrees(T, col, n = 40, r0 = 70, r1 = 120, trunkCol = '#6a4a2a') {
  const lm = new THREE.MeshStandardMaterial({ color: col, roughness: 1 }), tm = new THREE.MeshStandardMaterial({ color: trunkCol, roughness: 1 });
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = r0 + Math.random() * (r1 - r0), s = 2 + Math.random() * 3;
    const tr = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * s, 0.4 * s, 2 * s, 6), tm); tr.position.set(Math.cos(a) * r, s, Math.sin(a) * r); T.root.add(tr);
    const c = new THREE.Mesh(new THREE.SphereGeometry(1.6 * s, 10, 8), lm); c.position.set(tr.position.x, s * 2.8, tr.position.z); c.scale.y = 1.15; T.root.add(c);
  }
}
// 浮かぶ島・雲のかたまり
function puffClouds(T, n = 10, col = '#ffffff', y0 = 30) {
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 1, emissive: col, emissiveIntensity: 0.25, fog: false });
  const list = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(), a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 80;
    for (let k = 0; k < 5; k++) { const p = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 4, 12, 8), m); p.position.set(k * 5 - 10, Math.random() * 3, Math.random() * 3); p.scale.y = 0.7; g.add(p); }
    g.position.set(Math.cos(a) * r, y0 + Math.random() * 25, Math.sin(a) * r); g.lookAt(0, g.position.y, 0);
    T.root.add(g); list.push([g, a, r, Math.random() * 0.5 + 0.2]);
  }
  T.updaters.push((dt, t) => list.forEach(([g, a, r, s]) => { const b = a + t * 0.002 * s; g.position.x = Math.cos(b) * r; g.position.z = Math.sin(b) * r; }));
}
// 舞う粒（花びら・星・蛍）
function motes(T, col, rate = 20, o = {}) {
  T.updaters.push(dt => {
    if (Math.random() > dt * rate) return;
    const f = T.focus;
    T.particles.emit(V3(f.x + (Math.random() - 0.5) * 26, f.y + (o.fall ? 8 + Math.random() * 4 : 0.2 + Math.random() * 2), f.z + (Math.random() - 0.5) * 20),
      V3((Math.random() - 0.5) * (o.drift || 0.4), o.fall ? -(0.6 + Math.random() * 0.6) : 0.3 + Math.random() * 0.5, (Math.random() - 0.5) * 0.3), hdr(col, o.k || 1.4), { life: o.life || 5, size: o.size || 0.06, drag: 0 });
  });
}

const ENV_PROPS = {
  meadow(T) {
    hills(T, '#7ab85a'); farTrees(T, '#5aa048', T.bare ? 30 : 40); puffClouds(T, 12);
    motes(T, '#ffe8f0', 14, { fall: true, drift: 1.2, size: 0.07, life: 7 });   // 花びら
  },
  night(T) {
    hills(T, '#1e3424'); farTrees(T, '#1e3a2a', 40); motes(T, '#fff4b8', 12, { size: 0.05, life: 4, k: 2.2 });   // 蛍
  },
  forest(T) {
    hills(T, '#4a7a3a', 130, 16, 24); farTrees(T, '#3a7a3a', 70, 50, 110, '#4a3422'); farTrees(T, '#4a8a44', 50, 110, 150);
    motes(T, '#fff4a8', 30, { fall: true, size: 0.07, life: 6, k: 2.6, drift: 0.2 });   // ほしふる：光の粒が降る
    // こもれびの光の柱
    const rays = [];
    for (let i = 0; i < (T.bare ? 4 : 8); i++) {
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.4, 26, 12, 1, true), new THREE.MeshBasicMaterial({ color: hdr('#fff6c8', 0.4), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 30; m.position.set(Math.cos(a) * r, 12, Math.sin(a) * r); m.rotation.z = 0.3; T.root.add(m); rays.push([m, Math.random() * 6]);
    }
    T.updaters.push((dt, t) => rays.forEach(([m, p]) => { m.material.opacity = 0.08 + Math.sin(t * 0.5 + p) * 0.05; }));
  },
  road(T) { hills(T, '#9ab868', 150, 18, 20); farTrees(T, '#6aa850', 30, 80, 140); puffClouds(T, 14, '#fff6ec'); motes(T, '#ffe8b8', 8, { size: 0.05, life: 5 }); },
  kingdom(T) {
    hills(T, '#8ab870', 160, 14, 14); puffClouds(T, 14, '#ffffff', 26);
    motes(T, '#ffb8d8', 12, { fall: true, drift: 1.2, size: 0.07, life: 7 });   // 紙ふぶき・花びら
    const cols = ['#e87aa8', '#5a8ad8', '#ffd27a'], wm = new THREE.MeshStandardMaterial({ color: '#f4ece0', roughness: 1 });
    for (let i = 0; i < 7; i++) { const x = -60 + i * 20, h = 20 + (i % 3) * 12; const tw = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, h, 10), wm); tw.position.set(x, h / 2 - 4, -150); T.root.add(tw); const rf = new THREE.Mesh(new THREE.ConeGeometry(5.5, 9, 10), new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.8 })); rf.position.set(x, h - 4 + 4.5, -150); T.root.add(rf); }
  },
  tower(T) { motes(T, '#ffd27a', 14, { size: 0.06, life: 4, k: 2 }); T.noTree = true; },
  valley(T) {
    hills(T, '#3a3448', 120, 18, 34); farTrees(T, '#2a2a3a', 30, 60, 120, '#1a1a24');
    motes(T, '#c8a8ff', 16, { size: 0.06, life: 5, k: 2 });
  },
  cave(T) {
    T.noTree = true;
    const cm = new THREE.MeshStandardMaterial({ color: '#1a1428', emissive: '#6a4aff', emissiveIntensity: 0.5, roughness: 0.3, flatShading: true });
    // まわりに小さな水晶の群れ。区画のある場面（探索・会話・その場所での戦闘）は、区画の小物（ZoneKit.ore）にまかせる
    if (!T.zone) for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 20, cx = Math.cos(a) * r, cz = Math.sin(a) * r;
      for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.15 + Math.random() * 0.15, 0), cm); m.position.set(cx + (Math.random() - 0.5) * 0.8, 0.3, cz + (Math.random() - 0.5) * 0.8); m.scale.y = 2 + Math.random() * 1.5; m.rotation.set((Math.random() - 0.5) * 0.6, Math.random() * 3, (Math.random() - 0.5) * 0.6); T.root.add(m); }
    }
    motes(T, '#8a6aff', 18, { size: 0.06, life: 5, k: 2.4 });
  },
  ruins(T) {
    hills(T, '#6a8a6a', 140, 16, 26); farTrees(T, '#5a8a5a', 30, 70, 130); puffClouds(T, 8);
    const sm = new THREE.MeshStandardMaterial({ color: '#b8b098', roughness: 1 });
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 50, h = 8 + Math.random() * 20; const c = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, h, 10), sm); c.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); c.rotation.z = (Math.random() - 0.5) * 0.3; T.root.add(c); }
    motes(T, '#b8ffe8', 10, { size: 0.05, life: 5, k: 2 });
  },
  demon(T) {
    hills(T, '#3a2440', 130, 16, 30); puffClouds(T, 10, '#b88ad8', 34);
    // 魔王城のシルエット（とげとげ）
    const m = new THREE.MeshStandardMaterial({ color: '#2a1a38', roughness: 1, emissive: '#3a1050', emissiveIntensity: 0.3 });
    for (let i = 0; i < 5; i++) { const x = -30 + i * 15, h = 26 + (i === 2 ? 26 : (i % 2) * 10); const tw = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, h, 8), m); tw.position.set(x, h / 2 - 4, -160); T.root.add(tw); const rf = new THREE.Mesh(new THREE.ConeGeometry(4.5, 12, 8), m); rf.position.set(x, h + 2, -160); T.root.add(rf); const w = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, 0.2), glowMat('#ffcf4a', 2.5)); w.position.set(x, h * 0.7, -155.8); T.root.add(w); }
    motes(T, '#ff9ad8', 10, { size: 0.06, life: 5, k: 2 });
  },
  tree(T) { hills(T, '#8a9a5a', 140, 14, 18); puffClouds(T, 10, '#fff6dc'); motes(T, '#fff0a8', 24, { size: 0.07, life: 6, k: 2.4, drift: 0.3 }); },
  root(T) { T.noTree = true; motes(T, '#b8ff8a', 22, { size: 0.06, life: 5, k: 2.6 }); },
  end(T) {
    const rm = new THREE.MeshStandardMaterial({ color: '#1a1428', roughness: 1, flatShading: true });
    for (let i = 0; i < 14; i++) { const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 60; const m = new THREE.Mesh(new THREE.DodecahedronGeometry(6 + Math.random() * 8, 0), rm); m.position.set(Math.cos(a) * r, 4 + Math.random() * 30, Math.sin(a) * r); T.root.add(m); const y0 = m.position.y, ph = Math.random() * 6; T.updaters.push((dt, t) => { m.position.y = y0 + Math.sin(t * 0.3 + ph) * 1.5; m.rotation.y += dt * 0.02; }); }
    motes(T, '#b8a8ff', 20, { size: 0.07, life: 6, k: 2.2 });
  },
  dream(T) {
    puffClouds(T, 18, '#ffe8f8', 10);
    // 空に浮かぶお菓子と魚
    const cols = ['#ff9ab8', '#b8e8ff', '#ffe07a', '#b8ffb8'];
    for (let i = 0; i < 14; i++) {
      const a = Math.random() * Math.PI * 2, r = 50 + Math.random() * 60, m = new THREE.Mesh(i % 2 ? new THREE.TorusGeometry(3, 1.4, 10, 20) : new THREE.SphereGeometry(3, 12, 10), new THREE.MeshStandardMaterial({ color: cols[i % 4], roughness: 0.6, emissive: cols[i % 4], emissiveIntensity: 0.2 }));
      m.position.set(Math.cos(a) * r, 10 + Math.random() * 30, Math.sin(a) * r); T.root.add(m); const y0 = m.position.y, ph = Math.random() * 6; T.updaters.push((dt, t) => { m.position.y = y0 + Math.sin(t * 0.5 + ph) * 2; m.rotation.x += dt * 0.2; });
    }
    motes(T, '#ffffff', 20, { size: 0.08, life: 6, k: 2 });
  },
};
