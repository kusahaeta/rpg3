'use strict';
// ============================================================
//  環境：空（星雲シェーダー）／床／背景オブジェクト／ライト
// ============================================================
const THEMES = {
  station: { top: '#070720', horizon: '#34287a', bottom: '#0a0820', nebA: '#6b3cff', nebB: '#18b8ff', fog: '#1e1a4a', fogD: 0.022,
    floor: '#1a1c30', floor2: '#23263f', line: '#56c8ff', key: '#dfe4ff', sky: '#8f96ff', ground: '#1b1233', rim: '#8a73ff', stars: 1, aurora: 0, metal: 0.55 },
  snow: { top: '#14254a', horizon: '#7fa6cf', bottom: '#c9d8ea', nebA: '#4fe0b8', nebB: '#8a7dff', fog: '#7c98b8', fogD: 0.028,
    floor: '#d6e2f0', floor2: '#c2d2e6', line: '#7fd8ff', key: '#ffffff', sky: '#c7dcff', ground: '#6a7ea0', rim: '#9fe6ff', stars: 0.7, aurora: 1, metal: 0.1 },
  xian: { top: '#1c1430', horizon: '#c9774a', bottom: '#6a4a3a', nebA: '#ff8f4f', nebB: '#ffd27a', fog: '#6e4a44', fogD: 0.02,
    floor: '#2e2530', floor2: '#3a2e38', line: '#e8b35a', key: '#ffe0b8', sky: '#b58a6a', ground: '#2a1a24', rim: '#ffb86a', stars: 0.35, aurora: 0, metal: 0.25 },
  abyss: { top: '#030006', horizon: '#4a0a24', bottom: '#080006', nebA: '#ff2a5a', nebB: '#7a1aff', fog: '#1a0614', fogD: 0.026,
    floor: '#110a12', floor2: '#1a0e18', line: '#ff3a5a', key: '#ffc8d0', sky: '#ff8aa8', ground: '#1a0010', rim: '#ff4d7a', stars: 0.8, aurora: 0, metal: 0.5 },
  space: { top: '#040616', horizon: '#1a1a4a', bottom: '#050612', nebA: '#5a3cff', nebB: '#ff5aa8', fog: '#0c0c26', fogD: 0.022,
    floor: '#161a30', floor2: '#1d2240', line: '#e8c77a', key: '#fff1dc', sky: '#9aa4ff', ground: '#1a1430', rim: '#8a9dff', stars: 1.2, aurora: 0, metal: 0.4 },
};

const SkyShader = {
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `
    uniform vec3 top, horizon, bottom, nebA, nebB; uniform float time, stars, aurora;
    varying vec3 vDir;
    float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 col = mix(horizon, top, smoothstep(0.0, 0.65, h));
      col = mix(col, bottom, smoothstep(0.0, -0.35, h));
      float n = fbm(d * 2.2 + vec3(time * 0.004, 0.0, 0.0));
      float n2 = fbm(d * 4.5 + vec3(3.1, time * 0.006, 1.7));
      float band = exp(-pow((d.y - 0.25 + 0.2 * sin(d.x * 2.0)) * 2.5, 2.0));
      col += nebA * pow(n, 3.0) * 2.2 * band;
      col += nebB * pow(n2, 4.0) * 2.6 * smoothstep(-0.1, 0.5, h) * band;
      if (aurora > 0.0) {
        float a = sin(d.x * 6.0 + time * 0.3 + fbm(d * 3.0) * 4.0) * 0.5 + 0.5;
        float ah = smoothstep(0.15, 0.35, h) * smoothstep(0.75, 0.4, h);
        col += mix(nebA, nebB, a) * pow(a, 3.0) * ah * 1.6 * aurora;
      }
      vec3 p = d * 260.0; vec3 id = floor(p); float r = hash(id);
      float s = step(1.0 - 0.012 * stars, r) * smoothstep(0.35, 0.0, length(fract(p) - 0.5));
      s *= 0.6 + 0.4 * sin(time * 2.0 + r * 80.0);
      vec3 p2 = d * 90.0; float r2 = hash(floor(p2));
      s += step(1.0 - 0.004 * stars, r2) * smoothstep(0.25, 0.0, length(fract(p2) - 0.5)) * 2.5;
      col += vec3(0.9, 0.95, 1.0) * s * smoothstep(-0.05, 0.1, h) * 2.0;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

function makeSky(th) {
  const u = { time: { value: 0 }, stars: { value: th.stars }, aurora: { value: th.aurora } };
  for (const k of ['top', 'horizon', 'bottom', 'nebA', 'nebB']) u[k] = { value: new THREE.Color(th[k]) };
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 32), new THREE.ShaderMaterial({ uniforms: u, ...SkyShader, side: THREE.BackSide, depthWrite: false }));
  m.renderOrder = -10; m.frustumCulled = false;
  return m;
}

function floorTextures(th, theme) {
  const S = 1024, mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const base = mk(), em = mk(), g = base.getContext('2d'), e = em.getContext('2d');
  g.fillStyle = th.floor; g.fillRect(0, 0, S, S);
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  if (th.pattern && th.pattern !== 'grid') return patternFloor(th, g, e, base, em, S);
  const n = 8, step = S / n;
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    g.fillStyle = (x + y) % 2 ? th.floor : th.floor2;
    g.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
    // ノイズ
    for (let i = 0; i < 40; i++) { g.fillStyle = `rgba(255,255,255,${Math.random() * 0.03})`; g.fillRect(x * step + Math.random() * step, y * step + Math.random() * step, 2 + Math.random() * 8, 2); }
  }
  e.strokeStyle = th.line; e.lineWidth = 3; e.globalAlpha = 0.5;
  for (let i = 0; i <= n; i++) { e.beginPath(); e.moveTo(i * step, 0); e.lineTo(i * step, S); e.stroke(); e.beginPath(); e.moveTo(0, i * step); e.lineTo(S, i * step); e.stroke(); }
  if (theme === 'abyss') {
    e.globalAlpha = 1; e.lineWidth = 2.5;
    for (let k = 0; k < 18; k++) { let x = Math.random() * S, y = Math.random() * S; e.beginPath(); e.moveTo(x, y); for (let j = 0; j < 8; j++) { x += (Math.random() - 0.5) * 90; y += (Math.random() - 0.5) * 90; e.lineTo(x, y); } e.stroke(); }
  }
  if (theme === 'xian') {
    e.globalAlpha = 0.8; e.lineWidth = 2;
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) { e.beginPath(); e.arc(x * step + step / 2, y * step + step / 2, step * 0.28, 0, Math.PI * 2); e.stroke(); }
  }
  const t1 = new THREE.CanvasTexture(base), t2 = new THREE.CanvasTexture(em);
  t1.colorSpace = t2.colorSpace = THREE.SRGBColorSpace;
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(6, 6); t.anisotropy = 8; }
  return [t1, t2];
}

// 区画用の床パターン（板張り・岩・雪・石畳・虚空・六角）
function patternFloor(th, g, e, base, em, S) {
  const noise = (n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * a})`; g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 14, 2 + Math.random() * 3); } };
  switch (th.pattern) {
    case 'planks': {
      const h = S / 16;
      for (let y = 0; y < 16; y++) {
        let x = -Math.random() * 200;
        while (x < S) { const w = 160 + Math.random() * 220; g.fillStyle = y % 2 ? th.floor : th.floor2; g.fillRect(x + 2, y * h + 2, w - 4, h - 4);
          g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(x + w - 3, y * h, 3, h); x += w; }
      }
      noise(3000, 0.06);
      e.strokeStyle = th.line; e.globalAlpha = 0.25; e.lineWidth = 2;
      for (let y = 0; y <= 16; y++) { e.beginPath(); e.moveTo(0, y * h); e.lineTo(S, y * h); e.stroke(); }
      break;
    }
    case 'rock': case 'snow': {
      for (let i = 0; i < 260; i++) { g.fillStyle = Math.random() < 0.5 ? th.floor2 : th.floor; g.beginPath(); g.arc(Math.random() * S, Math.random() * S, 20 + Math.random() * 70, 0, Math.PI * 2); g.fill(); }
      noise(5000, th.pattern === 'snow' ? 0.04 : 0.12);
      if (th.pattern === 'rock') { e.strokeStyle = th.line; e.globalAlpha = 0.5; e.lineWidth = 2;
        for (let k = 0; k < 30; k++) { let x = Math.random() * S, y = Math.random() * S; e.beginPath(); e.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (Math.random() - 0.5) * 60; y += (Math.random() - 0.5) * 60; e.lineTo(x, y); } e.stroke(); } }
      break;
    }
    case 'tiles': {
      const n = 12, st = S / n;
      for (let y = 0; y < n; y++) for (let x = -1; x < n; x++) {
        const off = y % 2 ? st / 2 : 0;
        g.fillStyle = Math.random() < 0.5 ? th.floor : th.floor2; g.fillRect(x * st + off + 3, y * st + 3, st - 6, st - 6);
      }
      noise(2500, 0.08);
      e.strokeStyle = th.line; e.globalAlpha = 0.35; e.lineWidth = 2;
      for (let y = 0; y < n; y++) for (let x = 0; x < n; x += 3) e.strokeRect(x * st + (y % 2 ? st / 2 : 0) + 3, y * st + 3, st - 6, st - 6);
      break;
    }
    case 'void': {
      for (let i = 0; i < 120; i++) { g.fillStyle = th.floor2; const x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + Math.random() * 80, y + (Math.random() - 0.5) * 60); g.lineTo(x + 20, y + 50 + Math.random() * 60); g.fill(); }
      e.strokeStyle = th.line; e.globalAlpha = 1; e.lineWidth = 2;
      for (let k = 0; k < 26; k++) { let x = Math.random() * S, y = Math.random() * S; e.beginPath(); e.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (Math.random() - 0.5) * 90; y += (Math.random() - 0.5) * 90; e.lineTo(x, y); } e.stroke(); }
      break;
    }
    case 'hex': {
      const r = 42, hh = r * Math.sqrt(3);
      e.strokeStyle = th.line; e.globalAlpha = 0.55; e.lineWidth = 2.5;
      for (let y = -1; y < S / hh + 1; y++) for (let x = -1; x < S / (r * 1.5) + 1; x++) {
        const cx = x * r * 1.5, cy = y * hh + (x % 2 ? hh / 2 : 0);
        g.fillStyle = (x + y) % 3 ? th.floor : th.floor2;
        g.beginPath(); e.beginPath();
        for (let k = 0; k < 6; k++) { const a = k * Math.PI / 3, px = cx + Math.cos(a) * (r - 2), py = cy + Math.sin(a) * (r - 2); if (k) { g.lineTo(px, py); e.lineTo(px, py); } else { g.moveTo(px, py); e.moveTo(px, py); } }
        g.closePath(); g.fill(); e.closePath(); e.stroke();
      }
      noise(1500, 0.05);
      break;
    }
  }
  const t1 = new THREE.CanvasTexture(base), t2 = new THREE.CanvasTexture(em);
  t1.colorSpace = t2.colorSpace = THREE.SRGBColorSpace;
  for (const t of [t1, t2]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(th.repeat || 6, th.repeat || 6); t.anisotropy = 8; }
  return [t1, t2];
}

// scene に環境を構築し { update, particles } を返す
function buildEnvironment(scene, theme, renderer, opts = {}) {
  // opts.zone.th で区画ごとに床・霧・明るさを上書きできる
  const th = { ...(THEMES[theme] || THEMES.station), ...((opts.zone && opts.zone.th) || {}) };
  const root = new THREE.Group(); scene.add(root);
  scene.fog = new THREE.FogExp2(th.fog, th.fogD);
  const sky = makeSky(th); root.add(sky);

  // 環境マップ（金属の映り込み用）
  try {
    const pm = new THREE.PMREMGenerator(renderer);
    const envScene = new THREE.Scene(); envScene.add(makeSky(th));
    scene.environment = pm.fromScene(envScene, 0.02).texture;
    scene.environmentIntensity = 0.35;
    pm.dispose(); disposeTree(envScene);
  } catch (e) { /* 環境マップなしでも描画可能 */ }

  // ライト
  root.add(new THREE.HemisphereLight(th.sky, th.ground, 0.75 * (th.light || 1)));
  // 区画の th.light は屋内の環境光を明るくするためのもの。太陽（キーライト）は強くしすぎない
  const key = new THREE.DirectionalLight(th.key, 1.7 * Math.min(th.light || 1, 1.2));
  key.position.set(6, 12, 8); key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  Object.assign(key.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 40 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.02;
  root.add(key); root.add(key.target);
  const rim = new THREE.DirectionalLight(th.rim, 1.6); rim.position.set(-6, 5, -10); root.add(rim);
  const fill = new THREE.DirectionalLight(th.rim, 0.25); fill.position.set(-4, 3, 10); root.add(fill);

  // 床
  const [map, emap] = floorTextures(th, theme);
  // 探索フィールドは床を広げるので、タイルの大きさが変わらないよう繰り返しを増やす
  if (opts.field && !th.floorRect) for (const t of [map, emap]) t.repeat.multiplyScalar(1.5);
  const floor = new THREE.Mesh(th.floorRect ? new THREE.PlaneGeometry(th.floorRect[0], th.floorRect[1]) : new THREE.CircleGeometry(opts.field ? 90 : 60, 96), new THREE.MeshStandardMaterial({
    map, emissiveMap: emap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: th.floorGlow ?? (theme === 'snow' ? 0.4 : theme === 'xian' ? 0.55 : 1.1),
    metalness: th.metal, roughness: th.rough ?? (theme === 'snow' ? 0.75 : 0.38),
  }));
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; root.add(floor);
  if (th.floorRect) floor.position.z = th.floorRect[2] || 0;
  // アリーナのリング
  const ringMat = glowMat(th.line, 2.2, { transparent: true, opacity: 0.8, side: THREE.DoubleSide });
  for (const [r, w] of opts.bare ? [] : [[8.5, 0.05], [8.8, 0.02], [4.2, 0.02]]) {
    const ring = new THREE.Mesh(new THREE.RingGeometry(r - w, r + w, 160), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = 0.01; root.add(ring);
  }

  const particles = new Particles(scene, 4000);
  const updaters = [];
  // focus：環境パーティクルを発生させる中心（探索ではプレイヤーの位置に追従させる）
  const T = { root, th, updaters, particles, colliders: [], field: !!opts.field, bare: !!opts.bare, focus: V3(), zone: opts.zone,
    indoor: !!(opts.zone && opts.zone.map && (ARCH_STYLES[opts.zone.arch || 'station'] || {}).roof !== false) };
  (ENV_PROPS[theme] || ENV_PROPS.station)(T);

  return {
    particles, key, colliders: T.colliders, root, focus: T.focus, floor,
    update(dt, t) {
      sky.material.uniforms.time.value = t;
      for (const f of updaters) f(dt, t);
    },
  };
}

// ---------- テーマ別の背景 ----------
function planet(color, r, atm) {
  const g = new THREE.Group();
  const c = document.createElement('canvas'); c.width = 512; c.height = 256;
  const x = c.getContext('2d'); const base = new THREE.Color(color);
  for (let y = 0; y < 256; y++) { const k = 0.6 + 0.4 * Math.sin(y * 0.09 + Math.sin(y * 0.02) * 3); x.fillStyle = '#' + base.clone().multiplyScalar(k).getHexString(); x.fillRect(0, y, 512, 1); }
  for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(255,255,255,${Math.random() * 0.08})`; x.fillRect(Math.random() * 512, Math.random() * 256, 30 + Math.random() * 80, 2 + Math.random() * 4); }
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const p = new THREE.Mesh(new THREE.SphereGeometry(r, 64, 48), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9, metalness: 0, fog: false }));
  g.add(p);
  const atmM = new THREE.ShaderMaterial({
    uniforms: { c: { value: hdr(atm, 2.5) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vN = normalize(normalMatrix*normal); vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
    fragmentShader: 'uniform vec3 c; varying vec3 vN; varying vec3 vV; void main(){ float f = pow(1.0 - max(dot(vN, vV), 0.0), 3.0); gl_FragColor = vec4(c * f, f); }',
    blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false,
  });
  g.add(new THREE.Mesh(new THREE.SphereGeometry(r * 1.06, 64, 48), atmM));
  return { g, p };
}

const ENV_PROPS = {
  station(T) {
    const { root, th, updaters } = T;
    const pl = planet('#6b5bd6', 14, '#7fb0ff'); pl.g.position.set(-38, 22, -90); root.add(pl.g);
    const ringM = new THREE.Mesh(new THREE.RingGeometry(18, 26, 128), new THREE.MeshBasicMaterial({ color: hdr('#b9a8ff', 0.6), transparent: true, opacity: 0.35, side: THREE.DoubleSide, fog: false }));
    ringM.rotation.x = Math.PI / 2.4; pl.g.add(ringM);
    updaters.push((dt, t) => { pl.p.rotation.y = t * 0.01; });
    // 背景の構造物
    const win = document.createElement('canvas'); win.width = 64; win.height = 256;
    const w = win.getContext('2d'); w.fillStyle = '#000'; w.fillRect(0, 0, 64, 256);
    for (let y = 0; y < 256; y += 8) for (let x = 0; x < 64; x += 8) if (Math.random() < 0.35) { w.fillStyle = Math.random() < 0.7 ? '#7fd0ff' : '#ffcf6a'; w.fillRect(x + 2, y + 2, 4, 3); }
    const wt = new THREE.CanvasTexture(win); wt.colorSpace = THREE.SRGBColorSpace;
    for (let i = 0; i < 26; i++) {
      const a = (i / 26) * Math.PI * 2, r = 48 + Math.random() * 30;
      if (Math.sin(a) > 0.3) continue;
      const hgt = 14 + Math.random() * 40, wd = 4 + Math.random() * 6;
      const m = new THREE.Mesh(new THREE.BoxGeometry(wd, hgt, wd), new THREE.MeshStandardMaterial({ color: '#1a1c2e', metalness: 0.7, roughness: 0.4, emissive: '#ffffff', emissiveMap: wt, emissiveIntensity: 1.6 }));
      m.position.set(Math.cos(a) * r, hgt / 2, Math.sin(a) * r); root.add(m);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.25, 8, 6), glowMat(i % 2 ? '#ff4d6d' : th.line, 5)); beacon.position.set(m.position.x, hgt + 0.3, m.position.z); root.add(beacon);
    }
    // 浮遊するデブリ
    const debris = [];
    for (let i = 0; i < (T.bare ? 0 : 14); i++) {
      const m = new THREE.Mesh(new THREEX.RoundedBoxGeometry(0.6 + Math.random() * 1.5, 0.15, 0.6 + Math.random(), 2, 0.05), new THREE.MeshStandardMaterial({ color: '#2a2d48', metalness: 0.8, roughness: 0.3 }));
      const a = Math.random() * Math.PI * 2, r = 11 + Math.random() * 8;
      m.position.set(Math.cos(a) * r, 2 + Math.random() * 6, Math.sin(a) * r - 4); m.rotation.set(Math.random(), Math.random(), Math.random());
      root.add(m); debris.push([m, Math.random()]);
    }
    updaters.push((dt, t) => debris.forEach(([m, s]) => { m.rotation.y += dt * 0.1 * (s + 0.2); m.position.y += Math.sin(t + s * 10) * dt * 0.1; }));
    updaters.push((dt) => { if (Math.random() < dt * 30) T.particles.emit(V3(T.focus.x + (Math.random() - 0.5) * 24, T.focus.y + Math.random() * 0.5, T.focus.z + (Math.random() - 0.5) * 16), V3(0, 0.4 + Math.random() * 0.4, 0), hdr(th.line, 1.2), { life: 4, size: 0.06, drag: 0 }); });
  },

  snow(T) {
    const { root, th, updaters } = T;
    const ice = new THREE.MeshStandardMaterial({ color: '#a8e4ff', emissive: '#3aa0e0', emissiveIntensity: 0.35, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.85 });
    for (let i = 0; i < (T.bare ? 0 : 40); i++) {
      const a = Math.random() * Math.PI * 2, r = 12 + Math.random() * 22;
      if (Math.sin(a) > 0.5 && r < 20) continue;
      const hgt = 2 + Math.random() * 7;
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(1, 0), ice); m.scale.set(0.5 + Math.random() * 0.8, hgt, 0.5 + Math.random() * 0.8);
      m.position.set(Math.cos(a) * r, hgt * 0.4, Math.sin(a) * r); m.rotation.set((Math.random() - 0.5) * 0.4, Math.random() * 3, (Math.random() - 0.5) * 0.4);
      m.castShadow = true; root.add(m);
      T.colliders.push({ x: m.position.x, z: m.position.z, r: Math.max(m.scale.x, m.scale.z) * 0.8 });
    }
    const snowM = new THREE.MeshStandardMaterial({ color: '#eef4ff', roughness: 0.9 });
    for (let i = 0; i < (T.bare ? 0 : 24); i++) {
      const a = Math.random() * Math.PI * 2, r = 10 + Math.random() * 25;
      const m = new THREE.Mesh(new THREE.SphereGeometry(2 + Math.random() * 3, 20, 12), snowM); m.scale.y = 0.35;
      m.position.set(Math.cos(a) * r, 0, Math.sin(a) * r); m.receiveShadow = true; root.add(m);
      T.colliders.push({ x: m.position.x, z: m.position.z, r: m.geometry.parameters.radius * 0.75 });
    }
    if (T.indoor) return;   // 坑道・城内は雪も遠景もない
    // 城塞のシルエット（地形のある区画では地図の外、遠くに大きく）
    const dark = new THREE.MeshStandardMaterial({ color: '#28344e', roughness: 0.8 });
    const Zm = T.zone && T.zone.map ? T.zone : null, far = Zm ? Zm.d / 2 + 70 : 60, sc = Zm ? 2.6 : 1, y0 = Zm ? -10 : 0;
    for (let i = 0; i < 9; i++) {
      const x = (-40 + i * 10) * sc, hgt = (10 + Math.random() * 14) * sc;
      const tw = new THREE.Mesh(new THREE.CylinderGeometry(2 * sc, 2.4 * sc, hgt, 12), dark); tw.position.set(x, y0 + hgt / 2, -far); root.add(tw);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(2.8 * sc, 5 * sc, 12), dark); roof.position.set(x, y0 + hgt + 2.5 * sc, -far); root.add(roof);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.6 * sc, sc, 0.2), glowMat('#ffd27a', 4)); l.position.set(x, y0 + hgt * 0.7, -far + 2.2 * sc); root.add(l);
    }
    updaters.push((dt) => {
      for (let i = 0; i < dt * 90; i++) T.particles.emit(V3(T.focus.x + (Math.random() - 0.5) * 30, T.focus.y + 10, T.focus.z + (Math.random() - 0.5) * 24), V3(0.4 + Math.random() * 0.3, -1.1 - Math.random() * 0.6, 0), hdr('#ffffff', 1.1), { life: 9, size: 0.07, drag: 0 });
    });
  },

  xian(T) {
    const { root, th, updaters } = T;
    const moon = new THREE.Mesh(new THREE.SphereGeometry(9, 48, 32), glowMat('#ffe6b8', 0.95, { fog: false })); moon.position.set(45, 42, -150); root.add(moon);
    const red = toon('#b3342e'), roof = toon('#2c2a3a'), gold = glowMat('#ffcf6a', 2);
    const pavilion = (x, z, s) => {
      const g = new THREE.Group();
      for (const [px, pz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 5, 10), red); c.position.set(px, 2.5, pz); g.add(c); }
      const r1 = new THREE.Mesh(new THREE.ConeGeometry(4.2, 2.2, 4), roof); r1.position.y = 6; r1.rotation.y = Math.PI / 4; g.add(r1);
      const r2 = new THREE.Mesh(new THREE.ConeGeometry(2.6, 1.8, 4), roof); r2.position.y = 7.6; r2.rotation.y = Math.PI / 4; g.add(r2);
      const tip = new THREE.Mesh(new THREE.SphereGeometry(0.3, 8, 6), gold); tip.position.y = 8.7; g.add(tip);
      g.position.set(x, 0, z); g.scale.setScalar(s); g.traverse(o => { if (o.isMesh) o.castShadow = true; }); root.add(g);
      T.colliders.push({ x, z, r: 2.9 * s });
    };
    if (T.bare) { pavilion(-48, -40, 2.2); pavilion(46, -44, 2.6); pavilion(0, -62, 3); }
    else { pavilion(-16, -18, 1.3); pavilion(18, -22, 1.6); pavilion(-26, 4, 1.1); pavilion(24, 2, 1.2); pavilion(0, -40, 2.2); }
    const lanterns = [];
    for (let i = 0; i < 30; i++) {
      const l = new THREE.Group();
      const body = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.5, 12), glowMat('#ff8a3a', 1.6)); l.add(body);
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.32, 0.1, 12), roof); cap.position.y = 0.3; l.add(cap);
      const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ff9a4a', 0.45), blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(1.6); l.add(sp);
      const a = Math.random() * Math.PI * 2, r = 9 + Math.random() * 20;
      l.position.set(Math.cos(a) * r, (T.field ? 5 : 3) + Math.random() * 9, Math.sin(a) * r - 6); root.add(l); lanterns.push([l, Math.random() * 10, l.position.y]);
    }
    updaters.push((dt, t) => lanterns.forEach(([l, s, y]) => { l.position.y = y + Math.sin(t * 0.5 + s) * 0.5; l.rotation.y = t * 0.2 + s; }));
    updaters.push((dt) => { if (Math.random() < dt * 20) T.particles.emit(V3(T.focus.x + (Math.random() - 0.5) * 24, 0.2, T.focus.z + (Math.random() - 0.5) * 16), V3((Math.random() - 0.5) * 0.3, 0.6 + Math.random() * 0.6, 0), hdr('#ffb04a', 2), { life: 5, size: 0.07, drag: 0 }); });
  },

  abyss(T) {
    const { root, th, updaters } = T;
    const hole = new THREE.Group(); hole.position.set(0, 30, -120); root.add(hole);
    hole.add(new THREE.Mesh(new THREE.SphereGeometry(12, 48, 32), new THREE.MeshBasicMaterial({ color: '#000', fog: false })));
    const disks = [18, 22, 28].map((r, i) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r - 3 + i, r, 128), new THREE.MeshBasicMaterial({ color: hdr(i ? th.nebA : '#ffb0c0', 2 - i * 0.4), transparent: true, opacity: 0.6 - i * 0.15, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, fog: false }));
      m.rotation.x = Math.PI / 2.3; hole.add(m); return m;
    });
    updaters.push((dt, t) => disks.forEach((d, i) => { d.rotation.z = t * (0.05 + i * 0.02); }));
    const shardM = new THREE.MeshStandardMaterial({ color: '#15101a', metalness: 0.8, roughness: 0.25, emissive: th.line, emissiveIntensity: 0.15, flatShading: true });
    const shards = [];
    for (let i = 0; i < 40; i++) {
      const m = new THREE.Mesh(new THREE.OctahedronGeometry(0.5 + Math.random() * 2.2, 0), shardM); m.scale.y = 1.5 + Math.random() * 2;
      const a = Math.random() * Math.PI * 2, r = T.bare ? 38 + Math.random() * 20 : 12 + Math.random() * 30;
      m.position.set(Math.cos(a) * r, (T.bare ? 4 : 1) + Math.random() * 14, Math.sin(a) * r - 5); m.castShadow = true; root.add(m);
      const e = new THREE.LineSegments(new THREE.EdgesGeometry(m.geometry), new THREE.LineBasicMaterial({ color: hdr(th.line, 2.5) })); m.add(e);
      shards.push([m, Math.random()]);
    }
    updaters.push((dt, t) => shards.forEach(([m, s]) => { m.rotation.y += dt * 0.15 * (s + 0.3); m.position.y += Math.sin(t * 0.6 + s * 10) * dt * 0.2; }));
    updaters.push((dt) => { if (Math.random() < dt * 40) T.particles.emit(V3(T.focus.x + (Math.random() - 0.5) * 28, 0.1, T.focus.z + (Math.random() - 0.5) * 20), V3(0, 0.8 + Math.random(), 0), hdr(th.line, 2), { life: 3, size: 0.08, drag: 0 }); });
  },

  space(T) {
    const { root, th, updaters } = T;
    const pl = planet('#3b5bd6', 30, '#6fd0ff'); pl.g.position.set(70, 14, -150); root.add(pl.g);
    const pl2 = planet('#d68a5b', 6, '#ffb07a'); pl2.g.position.set(-50, 30, -140); root.add(pl2.g);
    updaters.push((dt, t) => { pl.p.rotation.y = t * 0.01; pl2.p.rotation.y = -t * 0.02; });
    // 星海列車のレール
    const railM = glowMat('#e8c77a', 2.5);
    const curve = new THREE.CatmullRomCurve3([V3(-80, 6, -60), V3(-30, 10, -40), V3(10, 4, -50), V3(60, 14, -70), V3(120, 8, -60)]);
    root.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 200, 0.12, 8, false), railM));
    const train = new THREE.Group(); root.add(train);
    for (let i = 0; i < 5; i++) {
      const car = new THREE.Mesh(new THREEX.RoundedBoxGeometry(3.2, 1.3, 1.3, 3, 0.35), new THREE.MeshStandardMaterial({ color: i === 0 ? '#e8e4f5' : '#2a2d55', metalness: 0.6, roughness: 0.3 }));
      car.position.x = -i * 3.5; train.add(car);
      const w = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.3, 1.32), glowMat('#ffd27a', 3)); w.position.set(-i * 3.5, 0.2, 0); train.add(w);
    }
    let prog = 0;
    updaters.push((dt) => {
      prog = (prog + dt * 0.012) % 1;
      const p = curve.getPointAt(prog), q = curve.getTangentAt(prog);
      train.position.copy(p).add(V3(0, 0.9, 0)); train.lookAt(p.clone().add(q)); train.rotateY(-Math.PI / 2);
      if (Math.random() < 0.6) T.particles.emit(train.position.clone(), V3(0, 0, 0), hdr('#ffd27a', 2), { life: 1.2, size: 0.5, drag: 0 });
    });
    updaters.push((dt) => { if (Math.random() < dt * 25) T.particles.emit(V3(T.focus.x + (Math.random() - 0.5) * 20, Math.random() * 6, T.focus.z + (Math.random() - 0.5) * 12), V3(0, 0.2, 0), hdr('#bcd0ff', 1.4), { life: 5, size: 0.05, drag: 0 }); });
  },
};
