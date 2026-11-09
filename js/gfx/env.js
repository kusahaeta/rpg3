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
    floor: '#5a8a44', floor2: '#4e7a3a', line: '#fff0a8', key: '#fff0d0', sky: '#b8e0c8', ground: '#3a5a2a', rim: '#d8ffb8', metal: 0, pattern: 'moss', floorGlow: 0, rough: 0.95, light: 1.0, lush: true },
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
  // タイトルの丘：日がしずむころ。地平線は夕焼け、空の上のほうから星が出はじめる
  //   sunDir：太陽の向き（右手の地平線のすぐ上）。starLo：星が見えはじめる高さ（地平線の近くの明るい空には出さない）。cloudDim：雲を夕方の色に沈める。
  //   hzW：地平線の色から空の上の色へ変わる高さ（せまくして、夕焼けを地平線の近くの帯に）
  dusk: { top: '#1e2660', horizon: '#ffa070', bottom: '#5a4a48', nebA: '#ff9aa8', nebB: '#a890ff', fog: '#e8a890', fogD: 0.0055, clouds: 0.6, sun: '#ffc890', stars: 0.8,
    sunDir: [0.55, 0.07, -0.83], starLo: 0.14, cloudDim: 0.62, hzW: 0.34,
    floor: '#7aa458', floor2: '#6a944a', line: '#ffe08a', key: '#ffbc80', sky: '#a8a8e0', ground: '#5a4a3a', rim: '#ffb070', metal: 0, pattern: 'grass', floorGlow: 0, rough: 0.95, light: 1.0 },
  // なかまの画面（景色は一枚絵を貼り、床と空は描かない。ここは子を照らす光と照り返しの元だけ。光の色は子ごとに場所の光へ差しかえる）
  studio: { top: '#ffe8d8', horizon: '#fff4ea', bottom: '#d8c0b0', nebA: '#ffffff', nebB: '#ffffff', fog: '#ffffff', fogD: 0, clouds: 0, sun: '#ffffff', stars: 0,
    floor: '#e8d6c0', floor2: '#e8d6c0', line: '#ffffff', key: '#fff8ee', sky: '#fff4ea', ground: '#b89a8a', rim: '#ffffff', metal: 0, pattern: 'grid', floorGlow: 0, rough: 0.9, light: 1.05 },
  // ねこ神の夢：パステルのへんてこな夢
  dream: { top: '#ffb8e0', horizon: '#fff0d8', bottom: '#b8d8ff', nebA: '#ffffff', nebB: '#b8f0ff', fog: '#ffe0f0', fogD: 0.006, clouds: 1, sun: '#fffff0', stars: 0.3,
    floor: '#ffd8e8', floor2: '#ffe8f0', line: '#ff9ad8', key: '#fff8f0', sky: '#ffe8f8', ground: '#d8b8e8', rim: '#b8e8ff', metal: 0, pattern: 'checker', floorGlow: 0.1, rough: 0.7, light: 1.1 },
};

const SkyShader = {
  vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_Position = p.xyww; }`,
  fragmentShader: `
    uniform vec3 top, horizon, bottom, nebA, nebB, sun, sunDir; uniform float time, stars, clouds, starLo, cloudDim, hzW;
    varying vec3 vDir;
    float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
    float noise(vec3 x){ vec3 i = floor(x), f = fract(x); f = f*f*(3.0-2.0*f);
      return mix(mix(mix(hash(i), hash(i+vec3(1,0,0)), f.x), mix(hash(i+vec3(0,1,0)), hash(i+vec3(1,1,0)), f.x), f.y),
                 mix(mix(hash(i+vec3(0,0,1)), hash(i+vec3(1,0,1)), f.x), mix(hash(i+vec3(0,1,1)), hash(i+vec3(1,1,1)), f.x), f.y), f.z); }
    float fbm(vec3 p){ float v = 0.0, a = 0.5; for (int i = 0; i < OCT; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
    void main(){
      vec3 d = normalize(vDir); float h = d.y;
      vec3 col = mix(horizon, top, smoothstep(0.0, hzW, h));
      col = mix(col, bottom, smoothstep(0.0, -0.3, h));
      // 太陽のにじみ
      vec3 sd = normalize(sunDir);
      float s = max(dot(d, sd), 0.0);
      col += sun * (pow(s, 64.0) * 1.4 + pow(s, 6.0) * 0.25);
      // もこもこの雲（地平線近くに多い）
      if (clouds > 0.0) {
        vec2 uv = d.xz / max(0.08, h + 0.12);
        float c = fbm(vec3(uv * 0.55 + vec2(time * 0.006, 0.0), 1.3));
        c = smoothstep(0.52, 0.78, c) * smoothstep(-0.02, 0.12, h) * smoothstep(0.95, 0.25, h);
        vec3 cc = mix(vec3(1.0), nebA, 0.35) * cloudDim + sun * pow(s, 4.0) * 0.4;
        col = mix(col, cc * (0.85 + 0.25 * fbm(vec3(uv * 1.7, 4.0))), c * clouds);
      }
      // 星（夜や洞窟）
      if (stars > 0.0) {
        float n = fbm(d * 3.0 + vec3(time * 0.004, 0.0, 0.0));
        col += nebB * pow(n, 4.0) * 1.6 * stars * smoothstep(0.0, 0.5, h);
        vec3 p = d * 220.0; float r = hash(floor(p));
        float st = step(1.0 - 0.01 * stars, r) * smoothstep(0.35, 0.0, length(fract(p) - 0.5)) * (0.6 + 0.4 * sin(time * 2.0 + r * 80.0));
        col += vec3(1.0, 0.97, 0.9) * st * smoothstep(starLo, starLo + 0.15, h) * 2.0;
      }
      gl_FragColor = vec4(col, 1.0);
    }`,
};

function skyOctaves() { return GFX.low ? 3 : 5; }
function makeSky(th) {
  const u = { time: { value: 0 }, stars: { value: th.stars || 0 }, clouds: { value: th.clouds || 0 }, starLo: { value: th.starLo ?? -0.05 }, cloudDim: { value: th.cloudDim ?? 1 }, hzW: { value: th.hzW ?? 0.6 },
    sunDir: { value: new THREE.Vector3(...(th.sunDir || [0.45, 0.35, -0.8])) } };
  for (const k of ['top', 'horizon', 'bottom', 'nebA', 'nebB', 'sun']) u[k] = { value: new THREE.Color(th[k] || '#ffffff') };
  // OCT：雲・星のもようの細かさ（重ねる回数）。軽量の画質では減らす（空は画面の半分ほどをしめ、1 画素ごとの計算が重い）
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 48, 32), new THREE.ShaderMaterial({ uniforms: u, ...SkyShader, defines: { OCT: skyOctaves() }, side: THREE.BackSide, depthWrite: false }));
  // 不透明なものをすべて描いたあとに描く。いちばん奥（深さ 1）にあるので、手前のもので隠れたところは計算しないですむ
  m.renderOrder = 100; m.frustumCulled = false; m.userData.sky = true;
  return m;
}

// ---------- 床のテクスチャ ----------
function floorTextures(th, theme) {
  const S = 1024, mk = () => { const c = document.createElement('canvas'); c.width = c.height = S; return c; };
  const base = mk(), em = mk(), g = base.getContext('2d'), e = em.getContext('2d');
  g.fillStyle = th.floor; g.fillRect(0, 0, S, S);
  e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
  const noise = (n, a) => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * a})`; g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 14, 2 + Math.random() * 3); } };
  const blobs = (n, cols, r0, r1, c = g) => { for (let i = 0; i < n; i++) { c.fillStyle = cols[i % cols.length]; c.beginPath(); c.arc(Math.random() * S, Math.random() * S, r0 + Math.random() * (r1 - r0), 0, Math.PI * 2); c.fill(); } };
  // ぼかす絵は、別の canvas にまとめて描いてから、一度だけぼかして重ねる（図形ごとに filter をかけると、とても重い）
  //   ぼかす層はやわらかい形だけなので、4 分の 1 の大きさで描いて、ぼかしながら引きのばす（大きな canvas のぼかしは重い）
  const layer = (px, draw, alpha = 1) => {
    const q = 4, small = () => { const c = document.createElement('canvas'); c.width = c.height = S / q; return c; }, lc = small(), bc = small(), lg = lc.getContext('2d'), bg = bc.getContext('2d');
    lg.scale(1 / q, 1 / q); draw(lg);
    bg.filter = `blur(${px / q}px)`; bg.drawImage(lc, 0, 0);
    g.globalAlpha = alpha; g.imageSmoothingEnabled = true; g.drawImage(bc, 0, 0, S, S); g.globalAlpha = 1; lc.width = lc.height = bc.width = bc.height = 0;
  };
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
    // 乾いた土と砂利（ごろごろ切り通し）：土の色むら、小石、地面のひび、ところどころに草の生えた所（草の色 th.grass）
    case 'canyon': {
      layer(8, lg => blobs(240, [th.floor2, th.floor], 24, 80, lg));
      layer(10, lg => blobs(50, ['rgba(255,240,210,.18)', 'rgba(110,80,50,.14)'], 40, 110, lg));
      // 草の生えた所：ぼかした緑の島と、草の線
      const isl = []; for (let i = 0; i < 6; i++) isl.push([Math.random() * S, Math.random() * S, 50 + Math.random() * 80]);
      layer(28, lg => { lg.fillStyle = th.grass || '#8aa860'; lg.beginPath(); for (const [x, y, r] of isl) for (const ox of [0, -S, S]) for (const oy of [0, -S, S]) { lg.moveTo(x + ox + r, y + oy); lg.ellipse(x + ox, y + oy, r, r * 0.7, 0, 0, 7); } lg.fill(); }, 0.55);
      // 草の線・小石は、色ごとに一つの path にまとめて描く（一本ずつ stroke・fill すると重い）
      g.lineWidth = 1.5;
      for (const col of ['rgba(60,90,35,.55)', 'rgba(200,230,140,.4)']) {
        g.strokeStyle = col; g.beginPath();
        for (let i = 0; i < 1500; i++) {
          const [ix, iy, ir] = isl[i % isl.length], a = Math.random() * 6.28, d = Math.pow(Math.random(), 0.8) * ir * 1.1, x = (ix + Math.cos(a) * d + S) % S, y = (iy + Math.sin(a) * d * 0.7 + S) % S;
          g.moveTo(x, y); g.lineTo(x + (Math.random() - 0.5) * 4, y - 5 - Math.random() * 6);
        }
        g.stroke();
      }
      // 小石（影と、明るい上の面。上の面の明るさは 5 段）
      const peb = []; for (let i = 0; i < 700; i++) peb.push([Math.random() * S, Math.random() * S, 1.5 + Math.random() * Math.random() * 7, Math.random() * 3, Math.floor(Math.random() * 5)]);
      g.fillStyle = 'rgba(70,50,32,.35)'; g.beginPath(); for (const [x, y, r] of peb) { g.moveTo(x + 1 + r, y + 1.5); g.ellipse(x + 1, y + 1.5, r, r * 0.7, 0, 0, 7); } g.fill();
      for (let b = 0; b < 5; b++) {
        const v = 176 + b * 12; g.fillStyle = `rgb(${v},${v - 14},${v - 34})`; g.beginPath();
        for (const [x, y, r, rot, k] of peb) if (k === b) { g.moveTo(x + Math.cos(rot) * r, y + Math.sin(rot) * r); g.ellipse(x, y, r, r * 0.7, rot, 0, 7); }
        g.fill();
      }
      // 乾いた地面のひび
      g.strokeStyle = 'rgba(90,64,40,.3)'; g.lineWidth = 1.2;
      for (let k = 0; k < 40; k++) { let x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 4; j++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
      noise(5000, 0.07); break;
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
    particles, key, colliders: T.colliders, root, focus: T.focus, floor, farTree: T.farTree || null,
    update(dt, t) {
      sky.material.uniforms.time.value = t; LUSH.time.value = t; LUSH.dap.value = GFX.low ? 0 : 1;
      for (const f of updaters) f(dt, t);
    },
  };
}

// 光の柱の材質（足し算で光る）。面を正面から見るまん中ほど濃く、上下の端へうすれる
function lightShaftMat(col, k) {
  return new THREE.ShaderMaterial({
    uniforms: { color: { value: hdr(col, k) }, op: { value: 0.15 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide,
    vertexShader: `varying vec2 vUv; varying float vF;
      void main(){ vUv = uv; vec4 mv = modelViewMatrix * vec4(position, 1.0); vF = abs(dot(normalize(normalMatrix * normal), normalize(-mv.xyz))); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: `uniform vec3 color; uniform float op; varying vec2 vUv; varying float vF;
      void main(){ float a = smoothstep(0.03, 0.3, vUv.y) * smoothstep(1.0, 0.45, vUv.y) * vF * vF * op; gl_FragColor = vec4(color, a); }`,
  });
}

// ---------- 遠景の部品 ----------
// にゃんだーの樹：タイトルの画と、フィールド・戦闘の遠景で同じ形（座標は、根もとが 0、樹冠のてっぺんが 77 ほど）。
//   幹は、よじれた 6 本の太い筋がより合わさって一本になり、根もとで地面へ広がり、上で大枝に分かれて樹冠の下へ入っていく。
//   樹冠は、でこぼこの茂みを丸屋根の形に重ね、下のふちはひさしのように垂れる。茂みの色は、下と奥ほど暗い青緑、上ほど明るい黄緑。
//   日の当たるがわの輪郭が光り（rim）、遠くのものらしく、下ほど空の色にかすむ（haze）。光の色は look で決める（タイトルは夕日の TITLE_TREE_LOOK）。
//   形は決まった乱数で作り、毎回同じ。元気がないほど葉が灰色に（遠景では、ひさしの茂みと葉の房もまばらに）
// 葉の房の絵（白黒。色は板の頂点の色をかける）：小さな丸い葉を、まるい房の形に二十いくつ重ねる。奥の葉ほど暗く、ふちはぎざぎざ
function leafTuftTex() {
  if (TexCache.leafTuft) return TexCache.leafTuft;
  const S = 128, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.translate(S / 2, S / 2);
  let sd = 5; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const N = 26;
  for (let i = 0; i < N; i++) {
    const k = i / N, rr = 44 * Math.sqrt(1 - k) * (0.6 + 0.4 * rnd()), a = rnd() * 6.28, x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    const L = 20 + rnd() * 10, W = L * 0.5, v = Math.round(190 + k * 65 * (0.8 + 0.2 * rnd()));
    g.save(); g.translate(x, y); g.rotate(Math.atan2(y, x) + (rnd() - 0.5) * 1.6);
    g.fillStyle = `rgb(${v},${v},${v})`;
    g.beginPath(); g.moveTo(-L * 0.35, 0); g.quadraticCurveTo(0, -W, L * 0.65, 0); g.quadraticCurveTo(0, W, -L * 0.35, 0); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(-L * 0.3, 0); g.lineTo(L * 0.5, 0); g.stroke();
    g.restore();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (TexCache.leafTuft = t);
}
// 葉のもよう（つなぎ目なしにくり返せる）：暗い地に、小さな明るい葉をすきまなく。茂みの面に三方向から貼る
function leafTileTex() {
  if (TexCache.leafTile) return TexCache.leafTile;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = 'rgb(70,70,70)'; g.fillRect(0, 0, S, S);
  let sd = 9; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 170; i++) {
    const x = rnd() * S, y = rnd() * S, a = rnd() * 6.28, L = 22 + rnd() * 12, W = L * 0.48, v = Math.round(150 + rnd() * 105);
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      if (x + ox < -L || x + ox > S + L || y + oy < -L || y + oy > S + L) continue;
      g.save(); g.translate(x + ox, y + oy); g.rotate(a); g.fillStyle = `rgb(${v},${v},${v})`;
      g.beginPath(); g.moveTo(-L * 0.4, 0); g.quadraticCurveTo(0, -W, L * 0.6, 0); g.quadraticCurveTo(0, W, -L * 0.4, 0); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.2)'; g.lineWidth = 1.3; g.beginPath(); g.moveTo(-L * 0.35, 0); g.lineTo(L * 0.45, 0); g.stroke();
      g.restore();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (TexCache.leafTile = t);
}
// 樹皮のもよう（つなぎ目なしにくり返せる）：縦にのびる、うねった筋と割れ目
function barkTileTex() {
  if (TexCache.barkTile) return TexCache.barkTile;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = 'rgb(175,175,175)'; g.fillRect(0, 0, S, S);
  let sd = 3; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  g.lineCap = 'round';
  for (let i = 0; i < 60; i++) {
    const x0 = rnd() * S, w = 2 + rnd() * 7, v = rnd() < 0.55 ? Math.round(60 + rnd() * 50) : Math.round(210 + rnd() * 45), ph = rnd() * 6.28, amp = 3 + rnd() * 6;
    const y0 = rnd() * S, len = 60 + rnd() * 200;
    for (const ox of [-S, 0, S]) for (const oy of [-S, 0, S]) {
      g.strokeStyle = `rgb(${v},${v},${v})`; g.lineWidth = w; g.beginPath();
      for (let y = 0; y <= len; y += 8) g.lineTo(x0 + ox + Math.sin((y0 + y) / S * Math.PI * 2 * 2 + ph) * amp, y0 + oy + y);
      g.stroke();
    }
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4;
  return (TexCache.barkTile = t);
}
// タイトルの夕暮れの光：夕日は樹のうしろ右手にあるので、夕日がわの輪郭が金色に光る。下ほど夕焼けの色にかすむ
//   sun：日の向き／rim：輪郭の光の色 [樹皮, 茂み, 葉の房]／rimK：その強さ／haze：[下の色, 上の色]／hz：かすみの [根もとの濃さ, 高さで減る分, 下限, 上限]／
//   glow：自分で光る分 [樹皮, 葉]（暗い空の前でも沈まないように）
// 感情の実の色：笑い・友情・思い出・優しさ
const TREE_FRUIT_COLS = ['#ffd24a', '#ff4f9a', '#5ac8ff', '#9aff6a'];
// 軽量の画質（光のにじみなし）でも、樹の感情の実だけは光って見せる：実の玉（白っぽく明るい芯）のまわりに、足し算の小さな色の光の輪。
//   にじみがある画質の見え方（明るい芯に、すぐまわりだけ色がにじむ）に合わせる。にじみがあるときは輪を出さない。
//   実の玉 f に光の輪を子として足す。fruitGlowSync(fruits)：いまの画質に合わせる（毎コマ。画質はとちゅうで変わる）
function fruitHalo(f, c, r) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(c, 2.0 * lumaBoost(c)), blending: THREE.AdditiveBlending, depthWrite: false, fog: false, transparent: true }));
  s.scale.setScalar(r * 4.6 / Math.max(1e-3, f.scale.x)); s.visible = false; s.raycast = () => {}; f.add(s);
  f.userData.glow = s;
  return f;
}
function fruitGlowSync(fruits) {
  const on = !(GFX.bloom && GFX.bloom.enabled);
  for (const f of fruits) if (f.userData.glow) f.userData.glow.visible = on;
}
const TITLE_TREE_LOOK = { sun: [0.55, 0.07, -0.83], rim: ['#ff9a5a', '#ffc27a', '#e0a870'], rimK: 1.5, haze: ['#e8a088', '#8a86c0'], hz: [0.3, 0.0022, 0.08, 0.32], glow: [0.05, 0.55] };
// 値ノイズ（0〜1）：茂みのでこぼこと、樹皮のうねり
const treeHash = (x, y, z) => { const s = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return s - Math.floor(s); };
function treeNoise(x, y, z) {
  const ix = Math.floor(x), iy = Math.floor(y), iz = Math.floor(z), u = x - ix, v = y - iy, w = z - iz;
  const su = u * u * (3 - 2 * u), sv = v * v * (3 - 2 * v), sw = w * w * (3 - 2 * w), L = (a, b, t) => a + (b - a) * t;
  const c = (dx, dy, dz) => treeHash(ix + dx, iy + dy, iz + dz);
  return L(L(L(c(0, 0, 0), c(1, 0, 0), su), L(c(0, 1, 0), c(1, 1, 0), su), sv), L(L(c(0, 0, 1), c(1, 0, 1), su), L(c(0, 1, 1), c(1, 1, 1), su), sv), sw);
}
const treeSS = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
// 茂みのふくらみ：茂みの面の点 (x, y, z)（樹の中の座標）を、半径の何倍だけ外へ出すか（茂みの中の小さな茂みと、葉のかたまりの細かいでこぼこ）
const canopyBump = (x, y, z) => (treeNoise(x * 0.11, y * 0.11, z * 0.11) - 0.5) * 0.55 + (treeNoise(x * 0.32 + 7, y * 0.32, z * 0.32) - 0.5) * 0.2;
// 樹の材質。L：光（TITLE_TREE_LOOK と同じ形）
//   card：葉の房の板。いつもカメラのほうを向き（aCorner の向きに aSize だけ広げ、aRot だけ回す）、光の当たり方は茂みの面の向き（normal）で決める
//   tri：[もようの絵, くり返しの細かさ, 暗いところの明るさ, 明るいところの足し分]（面の向きに合わせて三方向から貼る）
//   x.fog：かすみの代わりに、区画の霧をかける（区画の中に立つ樹）。x.green：{ value: 0〜1 }。0 で葉を x.gray の色の灰色に（弱った樹。よみがえるとき 1 へ）
function treeMat(L, opts, rim, glow, card = false, tri = null, x = {}) {
  const sun = V3(...L.sun).normalize(), haze = L.haze.map(c => new THREE.Color(c)), hz = new THREE.Vector4(...L.hz);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, fog: !!x.fog, ...opts });
  let gray = null;
  if (x.green) { m.userData.green = x.green; gray = new THREE.Color(x.gray || '#9a9a88'); gray.multiplyScalar(1.2 / (gray.r * 0.3 + gray.g * 0.59 + gray.b * 0.11)); }   // みどりのときより少し明るい、色あせた灰色
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uSun: { value: sun }, uRim: { value: new THREE.Color(rim).multiplyScalar(L.rimK) }, uGlow: { value: glow }, uHazeLo: { value: haze[0] }, uHazeHi: { value: haze[1] }, uHz: { value: hz } });
    if (tri) sh.uniforms.uTile = { value: tri[0] };
    if (x.green) Object.assign(sh.uniforms, { uGreen: x.green, uGray: { value: gray } });
    sh.vertexShader = (card ? 'attribute vec2 aCorner; attribute float aSize, aRot;\n' : '') + (tri ? 'varying vec3 vOP, vON;\n' : '') + 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', (tri ? 'vOP = position; vON = normal;\n' : '') + (card ? `
  vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
  float cr = cos(aRot), sr = sin(aRot);
  // カメラに背を向けた面（樹の奥がわ）の板は、小さくして消す（茂みのうしろから手前へ突き出して、日の光で光ってしまう）
  float face = smoothstep(-0.3, 0.05, dot(normalize(normalMatrix * objectNormal), normalize(-mvPosition.xyz)));
  mvPosition.xy += mat2(cr, sr, -sr, cr) * aCorner * aSize * face * length(modelMatrix[0].xyz);
  gl_Position = projectionMatrix * mvPosition;` : '#include <project_vertex>') + '\n  vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'uniform vec3 uSun, uRim, uHazeLo, uHazeHi; uniform vec4 uHz; uniform float uGlow; varying float vWY;\n' + (tri ? 'uniform sampler2D uTile; varying vec3 vOP, vON;\n' : '') + (x.green ? 'uniform float uGreen; uniform vec3 uGray;\n' : '') + sh.fragmentShader
      .replace('#include <color_fragment>', '#include <color_fragment>' + (tri ? `
          vec3 bw = pow(abs(vON), vec3(4.0)); bw /= bw.x + bw.y + bw.z;
          float lf = texture2D(uTile, vOP.zy * ${tri[1].toFixed(3)}).r * bw.x + texture2D(uTile, vOP.xz * ${tri[1].toFixed(3)}).r * bw.y + texture2D(uTile, vOP.xy * ${tri[1].toFixed(3)}).r * bw.z;
          diffuseColor.rgb *= ${tri[2].toFixed(2)} + lf * ${tri[3].toFixed(2)};` : '') + (x.green ? `
          diffuseColor.rgb = mix(uGray * dot(diffuseColor.rgb, vec3(0.3, 0.59, 0.11)), diffuseColor.rgb, uGreen);` : ''))
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
          vec3 sv = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
          float fr = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          float side = clamp(dot(normal, sv) * 0.7 + 0.3, 0.0, 1.0);
          totalEmissiveRadiance += uRim * pow(fr, 2.0) * side * side + diffuseColor.rgb * uGlow;`)
      .replace('#include <fog_fragment>', x.fog ? '#include <fog_fragment>' : `float hz = clamp(uHz.x - vWY * uHz.y, uHz.z, uHz.w);
          gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uHazeLo, uHazeHi, smoothstep(0.0, 90.0, vWY)), hz);`);
  };
  m.customProgramCacheKey = () => 'nyanderTree' + card + (tri ? tri.slice(1).join() : '') + (x.fog ? 'F' : '') + (x.green ? 'G' : '');
  return m;
}
// 樹冠の茂み（タイトル・遠景の樹と、樹の根もとの区画の樹で同じ作り）：clumps [[x, y, z, 半径], …] の一つずつを、ノイズででこぼこにした、上下につぶれた球に。
//   色は下と奥ほど暗い青緑、上ほど明るい黄緑。ほかの茂みとの重なりのきわと、上の茂みの陰は暗く。
//   葉の房の板を置くところも選ぶ（ほかの茂みにうもれていない頂点から、少し外へ浮かせて）。座標は樹の中の座標（根もとのまん中が原点）
//   o：rnd（板の乱数）、detail（球の細かさ）、col：[暗, 中, 明, [茂みごとの色 ×3]]、hy：[暗い高さ, 明るい高さ]、out：[内, 外]（幹からの横の距離。外ほど少し明るく）、
//      want(r, n)：一つの頂点に板を置く割合、size：板の大きさの倍率、lift：板を面から浮かせる倍率、spot(x, y, z, nx, ny, nz, i, buried)：頂点ごとに呼ぶ（実の置き場所を集める）
//   返すもの：geo（茂みをまとめた形）、cards（板：[x, y, z, nx, ny, nz, r, g, b, 大きさ, 回り]）、dist(x, y, z, C)（茂み C との近さ。1 より小さいと中）
function treeCanopy(clumps, o) {
  const BU = THREEX.BufferGeometryUtils, rnd = o.rnd, ss = treeSS, noise = treeNoise, [Csh, Cmid, Clit, tints] = o.col, [hy0, hy1] = o.hy, [out0, out1] = o.out, cs = o.size || 1, lk = o.lift || 1;
  const leaves = [], cards = [], P0 = V3();
  // 茂みの形の元（細かい球）。一度だけ作って、茂みごとに写す
  const base = BU.mergeVertices((() => { const q = new THREE.IcosahedronGeometry(1, o.detail); q.deleteAttribute('normal'); q.deleteAttribute('uv'); return q; })());
  // ほかの茂みとの近さ（y は 0.8 倍につぶした形）。d < k のとき、その茂みの中（k：半径の何倍か）
  const dist = (x, y, z, C) => { const dx = x - C[0], dy = (y - C[1]) / 0.8, dz = z - C[2]; return Math.sqrt(dx * dx + dy * dy + dz * dz) / C[3]; };
  clumps.forEach(([cx, cy, cz, r], ci) => {
    // 重なりを調べるのは、とどきうる茂みだけ（near：まわり、over：上にかぶさる）
    const near = clumps.filter((C, j) => j !== ci && Math.sqrt((C[0] - cx) ** 2 + ((C[1] - cy) / 0.8) ** 2 + (C[2] - cz) ** 2) < r * 1.4 + C[3] * 1.35);
    const over = clumps.filter((C, j) => j !== ci && C[1] > cy - r && Math.sqrt((C[0] - cx) ** 2 + (C[2] - cz) ** 2) < r * 1.4 + C[3] * 1.05);
    const buried = (x, y, z) => near.some(C => dist(x, y, z, C) < 1.1);
    const q = base.clone(), P = q.attributes.position, n = P.count, bump = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      P0.fromBufferAttribute(P, i);
      const b = canopyBump(cx + P0.x * r, cy + P0.y * r, cz + P0.z * r);
      bump[i] = b; const rr = r * (1 + b);
      P.setXYZ(i, cx + P0.x * rr, cy + P0.y * rr * 0.8, cz + P0.z * rr);
    }
    q.computeVertexNormals();
    const aboveA = new Float32Array(n), N = q.attributes.normal, col = new Float32Array(n * 3), tint = tints[ci % 3], c = new THREE.Color();
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), up = N.getY(i);
      // ほかの茂みに近い（くぼみ・重なりのきわ）ほど暗く
      let occ = 0;
      for (const C of near) { const d = dist(x, y, z, C); if (d < 1.35) occ += (1.35 - d) * 0.9; }
      // 上の茂みの陰：真上にほかの茂みがかぶさっているほど暗く
      let above = 0;
      for (const C of over) if (C[1] > y + 1 && (x - C[0]) ** 2 + (z - C[2]) ** 2 < (C[3] * 1.05) ** 2) above += 0.35;
      occ += Math.min(0.5, above); aboveA[i] = above;
      const h = ss(hy0, hy1, y), out = ss(out0, out1, Math.sqrt(x * x + z * z));
      c.copy(Csh).lerp(Cmid, ss(-0.9, 0.3, up) * 0.65 + h * 0.35).lerp(tint, 0.25);
      c.lerp(Clit, ss(0.15, 1, up) * (0.35 + h * 0.65) * 0.85);
      const lit = (0.74 + 0.26 * ss(-0.15, 0.2, bump[i])) * (1 - Math.min(0.5, occ)) * (0.85 + 0.15 * out) * (0.9 + 0.2 * noise(x * 0.9, y * 0.9, z * 0.9));
      c.multiplyScalar(lit); col.set([c.r, c.g, c.b], i * 3);
    }
    q.setAttribute('color', new THREE.BufferAttribute(col, 3));
    leaves.push(q);
    // 葉の房の板：大きい茂みほど多く
    const want = o.want(r, n);
    for (let i = 0; i < n; i++) {
      const x = P.getX(i), y = P.getY(i), z = P.getZ(i), nx = N.getX(i), ny = N.getY(i), nz = N.getZ(i);
      if (o.spot) o.spot(x, y, z, nx, ny, nz, i, buried);
      if (rnd() > want || (aboveA[i] > 0 && ny > -0.25)) continue;   // 上の茂みの陰の、上向きの面には置かない（上の茂みを突きぬけて光る）
      if (buried(x, y, z)) continue;
      const lift = (0.2 + rnd() * 0.5) * lk;
      cards.push([x + nx * lift, y + ny * lift, z + nz * lift, nx, ny, nz, col[i * 3], col[i * 3 + 1], col[i * 3 + 2], (1.2 + rnd() * 0.7) * cs, rnd() * 6.28]);
    }
  });
  base.dispose();
  return { geo: BU.mergeGeometries(leaves), cards, dist };
}
// 葉の房の板をまとめた形（treeCanopy の cards から。材質は treeMat の card）
function treeCardGeo(cards) {
  const n = cards.length, pos = new Float32Array(n * 12), nor = new Float32Array(n * 12), col = new Float32Array(n * 12), uv = new Float32Array(n * 8), cor = new Float32Array(n * 8), size = new Float32Array(n * 4), rot = new Float32Array(n * 4), idx = [];
  const C4 = [-1, -1, 1, -1, 1, 1, -1, 1];
  cards.forEach(([x, y, z, nx, ny, nz, r, gg, b, s, a], i) => {
    for (let k = 0; k < 4; k++) {
      const v = i * 4 + k, l = 0.85 + 0.3 * ((i * 7 + k) % 5) / 4;
      pos.set([x, y, z], v * 3); nor.set([nx, ny, nz], v * 3); col.set([r * l, gg * l, b * l], v * 3);
      cor.set([C4[k * 2], C4[k * 2 + 1]], v * 2); uv.set([(C4[k * 2] + 1) / 2, (C4[k * 2 + 1] + 1) / 2], v * 2); size[v] = s; rot[v] = a;
    }
    idx.push(i * 4, i * 4 + 1, i * 4 + 2, i * 4, i * 4 + 2, i * 4 + 3);
  });
  const q = new THREE.BufferGeometry();
  q.setAttribute('position', new THREE.BufferAttribute(pos, 3)); q.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); q.setAttribute('color', new THREE.BufferAttribute(col, 3));
  q.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); q.setAttribute('aCorner', new THREE.BufferAttribute(cor, 2)); q.setAttribute('aSize', new THREE.BufferAttribute(size, 1)); q.setAttribute('aRot', new THREE.BufferAttribute(rot, 1));
  q.setIndex(idx);
  return q;
}
// eye：実を置くための、いつもの画のカメラ（樹の中の座標での位置 pos と、画面のどこに写るか screen(x, y, z) → [横, 縦]（-1〜1））
// o.far：遠景の樹（フィールド・戦闘）。茂みの面を粗く、葉の房を大きく少なく、樹皮の筋も少なく（タイトルほど大きく写らないので）
// o.look：光（TITLE_TREE_LOOK と同じ形）
// 返すもの：g（樹）、fruits（感情の実）、halo（うしろの光）、leaf（茂みの材質。第八章で光らせる）
function worldTree(health = 0.8, fruit = 0, eye = null, o = {}) {
  const g = new THREE.Group(), BU = THREEX.BufferGeometryUtils, far = !!o.far, low = GFX.low, lo = low || far, L = o.look || TITLE_TREE_LOOK;
  let seed = 11; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const hash = treeHash, noise = treeNoise, ss = treeSS;
  const prof = pts => t => { for (let i = 1; i < pts.length; i++) if (t <= pts[i][0]) { const [t0, a] = pts[i - 1], [t1, b] = pts[i]; return a + (b - a) * (t - t0) / (t1 - t0); } return pts[pts.length - 1][1]; };

  // ---------- 幹・枝・根 ----------
  // 太さの変わる管：曲線に沿って、r(t) の太さで。樹皮の縦の溝（まわりに 7 本の波と、ノイズのうねり）で表面をでこぼこに。溝の底ほど暗い色
  const bark = [], barkCol = new THREE.Color('#9c7a5c'), barkDark = new THREE.Color('#34241a'), tmp = new THREE.Color();
  const tube = (pts, r, seg, rs) => {
    const curve = new THREE.CatmullRomCurve3(pts), fr = curve.computeFrenetFrames(seg, false), pos = [], col = [], idx = [];
    for (let i = 0; i <= seg; i++) {
      const t = i / seg, p = curve.getPointAt(t), N = fr.normals[i], B = fr.binormals[i], R = r(t);
      for (let j = 0; j <= rs; j++) {
        const a = j / rs * Math.PI * 2, d = N.clone().multiplyScalar(Math.cos(a)).addScaledVector(B, Math.sin(a));
        const o = p.clone().addScaledVector(d, R), gr = 0.5 + 0.5 * Math.sin(a * (rs > 12 ? 6 : 3) + t * 9 + noise(o.x * 0.3, o.y * 0.08, o.z * 0.3) * 4);
        const k = 1 + (gr - 0.5) * 0.2 + (noise(o.x * 0.5, o.y * 0.5, o.z * 0.5) - 0.5) * 0.12;
        o.copy(p).addScaledVector(d, R * k); pos.push(o.x, o.y, o.z);
        tmp.copy(barkDark).lerp(barkCol, 0.35 + 0.65 * gr * ss(-4, 14, o.y)); col.push(tmp.r, tmp.g, tmp.b);
      }
    }
    for (let i = 0; i < seg; i++) for (let j = 0; j < rs; j++) { const a = i * (rs + 1) + j, b = a + rs + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    const q = new THREE.BufferGeometry(); q.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); q.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    q.setIndex(idx); q.computeVertexNormals(); bark.push(q);
    return curve;
  };
  const K = 6, S1 = lo ? 28 : 64, R1 = lo ? 10 : 22;
  for (let k = 0; k < K; k++) {
    const a0 = k / K * Math.PI * 2 + 0.25, at = (R, y, da) => V3(Math.cos(a0 + da) * R, y, Math.sin(a0 + da) * R), reach = 20 + rnd() * 5;
    // 根もと（地面へ広がる）→ よじれて一本の幹に → 大枝になって樹冠の下へ
    const limb = tube([at(16, -4, -0.3), at(9.5, 1, -0.05), at(5.6, 7, 0.35), at(4.6, 16, 1.2), at(4.4, 26, 2.1), at(5.4, 33, 2.6), at(10.5, 40, 2.85), at(reach, 47 + rnd() * 3, 2.95)],
      prof([[0, 1.6], [0.12, 3.6], [0.3, 2.8], [0.6, 2.6], [0.78, 2.2], [1, 0.7]]), S1, R1);
    // 大枝から分かれる枝：樹冠の下のふちのほうへ。さらに先で細い枝を二本
    for (const [t0, da, R2, y2] of [[0.8, 0.55, 22, 45], [0.86, -0.35, 27, 43]]) {
      const p0 = limb.getPointAt(t0), p2 = at(R2 + rnd() * 4, y2 + rnd() * 2, 2.95 + da), p1 = p0.clone().lerp(p2, 0.5).add(V3(0, -1.5, 0));
      const br = tube([p0, p1, p2], prof([[0, 1.5], [1, 0.35]]), lo ? 10 : 18, lo ? 5 : 7);
      for (const [t1, s] of [[0.55, 1], [0.75, -1]]) {
        const q0 = br.getPointAt(t1), q2 = q0.clone().add(V3(Math.cos(a0 + 2.95 + da + s * 0.6) * 6, 2 + rnd() * 2, Math.sin(a0 + 2.95 + da + s * 0.6) * 6));
        tube([q0, q0.clone().lerp(q2, 0.5).add(V3(0, -0.6, 0)), q2], prof([[0, 0.6], [1, 0.15]]), lo ? 6 : 10, 5);
      }
    }
    // 筋と筋のあいだの根：地面をはって遠くへ
    const b = a0 + Math.PI / K;
    tube([V3(Math.cos(b) * 5, 4, Math.sin(b) * 5), V3(Math.cos(b) * 11, 0.5, Math.sin(b) * 11), V3(Math.cos(b + 0.1) * 19, -1.5, Math.sin(b + 0.1) * 19), V3(Math.cos(b + 0.15) * 26, -4, Math.sin(b + 0.15) * 26)],
      prof([[0, 2.6], [0.4, 1.8], [1, 0.4]]), lo ? 10 : 16, lo ? 6 : 8);
  }
  // 筋のあいだを埋める芯
  const core = new THREE.LatheGeometry([[7, -2], [5.4, 4], [3.8, 12], [3.6, 24], [3.9, 32], [2.4, 38], [0.2, 40]].map(([r, y]) => new THREE.Vector2(r, y)), R1 + 4);
  const coreC = barkDark.clone().lerp(barkCol, 0.35);
  core.deleteAttribute('uv'); core.setAttribute('color', new THREE.Float32BufferAttribute(new Array(core.attributes.position.count).fill(0).flatMap(() => [coreC.r, coreC.g, coreC.b]), 3));
  bark.push(core.index ? core.toNonIndexed() : core);
  for (let i = 0; i < bark.length; i++) if (bark[i].index) bark[i] = bark[i].toNonIndexed();
  g.add(new THREE.Mesh(BU.mergeGeometries(bark), treeMat(L, {}, L.rim[0], L.glow[0], false, [barkTileTex(), 0.09, 0.3, 0.95])));

  // ---------- 樹冠 ----------
  // [x, y, z, 半径]：上の丸屋根（つぶれた楕円の面に、フィボナッチの並びで）、下のふち（ひさし）、内がわの底、芯
  const clumps = [];
  const ND = lo ? 26 : 34;
  for (let i = 0; i < ND; i++) {
    const v = (i + 0.5) / ND, ph = Math.acos(1 - v * 1.12), th = i * 2.39996 + 0.4, sx = Math.sin(ph);
    clumps.push([Math.cos(th) * sx * 27, 53 + Math.cos(ph) * 14, Math.sin(th) * sx * 27, 9.5 + rnd() * 3.5 - sx * 1.5]);
  }
  const NR = lo ? 14 : 18;
  for (let i = 0; i < NR; i++) {
    const th = (i + rnd() * 0.4) / NR * Math.PI * 2, R = 25 + rnd() * 5, droop = i % 3 === 1 ? 3 : 0;
    const c = [Math.cos(th) * R, 44 - droop + rnd() * 2, Math.sin(th) * R, 6.5 + rnd() * 2.5];
    if (!far || hash(i, 3, 7) < 0.3 + health * 0.7) clumps.push(c);   // 遠景では、元気がないほど、ひさしの茂みが欠ける
  }
  for (let i = 0; i < 6; i++) { const th = (i + 0.5) / 6 * Math.PI * 2; clumps.push([Math.cos(th) * 14, 46, Math.sin(th) * 14, 9.5]); }
  clumps.push([0, 54, 0, 22]);
  // 色：下と奥ほど暗い青緑、上ほど明るい黄緑。元気がないほど灰色に（タイトルではいつも元気。遠景は物語の進み具合で）。茂みごとに少し色をずらす
  const gray = new THREE.Color('#8a8a7a'), fade = c => new THREE.Color(c).lerp(gray, Math.max(0, 1 - health) * 0.9);
  const Csh = fade('#2e7464'), Cmid = fade('#5cc066'), Clit = fade('#e4f89a'), tints = [fade('#80d874'), fade('#4cbc98'), fade('#b8e070')];
  const spots = [], P0 = V3();
  // 葉の房の板：遠景では、大きく少なく（輪郭の葉のぎざぎざが見えるくらい）。元気がないほどまばら
  const { geo, cards, dist } = treeCanopy(clumps, {
    rnd, detail: far ? (low ? 3 : 4) : lo ? 4 : 7, col: [Csh, Cmid, Clit, tints], hy: [36, 76], out: [10, 36], size: far ? 1.7 : 1,
    want: (r, n) => r * r * (far ? (low ? 0.25 : 0.55) * (0.35 + 0.65 * health) : lo ? 0.7 : 1.8) / n,
    // 実をつけられるところ：カメラのほうを向いた、うもれていない面
    spot: fruit && eye ? (x, y, z, nx, ny, nz, i, buried) => {
      if (i % 3) return;
      P0.set(eye.pos.x - x, eye.pos.y - y, eye.pos.z - z).normalize();
      if (nx * P0.x + ny * P0.y + nz * P0.z > 0.35 && !buried(x, y, z)) spots.push([x, y, z, nx, ny, nz, ...eye.screen(x, y, z)]);
    } : null,
  });
  const leaf = treeMat(L, {}, L.rim[1], L.glow[1], false, [leafTileTex(), 0.14, 0.5, 0.7]);
  g.add(new THREE.Mesh(geo, leaf));
  const cm = new THREE.Mesh(treeCardGeo(cards), treeMat(L, { map: leafTuftTex(), alphaTest: 0.5 }, L.rim[2], L.glow[1], true)); cm.frustumCulled = false; g.add(cm);

  // 感情の実（光る）：樹冠の手前の面に、ばらばらに散らす。
  //   いつもの画で見えるのは樹冠の下のふちだけなので、まずそこに NF 個、つづけて画面の外の上のほう（はじめに樹を見上げたときに見える）に NU 個。
  //   置くところは乱数の順に試し、もう置いた実と近すぎるところはとばす。近さの下限は一つずつちがう長さにして、
  //   間がつまったところ・あいたところが混ざるように（きっちり同じ間隔だと、作りものっぽい）。近さは画面の上で測る（下から見上げる面もあるので）。
  //   手前の茂みのかげになるところもとばす
  const fruitCols = TREE_FRUIT_COLS, fruits = [], LIFT = 1.3;
  const NF = fruit && spots.length ? Math.round(health * 16) : 0, NU = NF ? Math.round(health * 12) : 0;
  const Q = V3(), D = V3(), AS = 16 / 9, placed = [];
  const hidden = (x, y, z) => {
    D.set(eye.pos.x - x, eye.pos.y - y, eye.pos.z - z).normalize();
    for (let t = 2; t < 40; t += 1.5) { Q.set(x + D.x * t, y + D.y * t, z + D.z * t); if (clumps.some(C => dist(Q.x, Q.y, Q.z, C) < 0.85)) return true; }
    return false;
  };
  const inBand = s => Math.abs(s[6]) < 0.9 && s[7] < 0.88;
  for (const [band, want] of [[true, NF], [false, NU]]) {
    const pool = spots.filter(s => inBand(s) === band);
    if (!want || !pool.length) continue;
    for (let k = pool.length - 1; k > 0; k--) { const m = Math.floor(rnd() * (k + 1)); [pool[k], pool[m]] = [pool[m], pool[k]]; }
    // 同じ間隔で敷きつめたときの間隔（樹冠の画面での広さから）。下限はその 0.35〜1.05 倍
    let x0 = 9, x1 = -9, y0 = 9, y1 = -9;
    for (const s of pool) { x0 = Math.min(x0, s[6]); x1 = Math.max(x1, s[6]); y0 = Math.min(y0, s[7]); y1 = Math.max(y1, s[7]); }
    const gap = Math.sqrt((x1 - x0) * AS * (y1 - y0) * 0.7 / want);
    let n = 0;
    for (const s of pool) {
      if (n >= want) break;
      const [x, y, z, nx, ny, nz, sx, sy] = s, dmin = gap * (0.35 + 0.7 * rnd());
      if (placed.some(([px, py]) => Math.hypot((px - sx) * AS, py - sy) < dmin)) continue;
      if (hidden(x + nx * LIFT, y + ny * LIFT, z + nz * LIFT)) continue;
      placed.push([sx, sy]);
      const i = fruits.length, c = fruitCols[i % 4], r = 1.1 * fruit * (0.8 + 0.4 * rnd());   // 大きさも少しずつちがう
      const f = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), glowMat(c, 4 * lumaBoost(c), { fog: false }));
      if (!far) fruitHalo(f, c, r);   // 遠景の絵の実は、あとで farTree が作りなおす
      // 葉の房（面から 0.7 ほど浮く）にうもれないよう、面から少し前へ
      f.position.set(x + nx * LIFT, y + ny * LIFT, z + nz * LIFT); g.add(f); fruits.push(f); n++;
    }
  }
  // 樹のうしろの、ほのかな光
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#fff0c8', 0.3 * health + 0.08), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.setScalar(120); halo.position.y = 52; g.add(halo);
  return { g, fruits, halo, leaf };
}
// 区画の地図上の位置：ミャオニアの地図で、ほかの区画にまとめている区画（parent）は、まとめ先の位置
const zoneMap2d = Z => Z && (Z.map2d || (Z.parent && typeof FIELD_ZONES !== 'undefined' && FIELD_ZONES[Z.parent] && FIELD_ZONES[Z.parent].map2d));
// にゃんだーの樹の方角：区画の地図上の位置（map2d）から見た、樹の根もとの向き（北が 0、東が π/2）
function treeAngle(Z) {
  const R = typeof FIELD_ZONES !== 'undefined' && FIELD_ZONES.tree_root, M = zoneMap2d(Z);
  if (!M || !R || Z === R) return -0.6;
  return Math.atan2(R.map2d[0] - M[0], -(R.map2d[1] - M[1]));
}
// にゃんだーの樹の大きさ（距離230に置くとき）：区画の地図上で根もとから遠いほど小さく。ぽかぽか村（treeLook）の見え方を基準に、
// 近い森では大きすぎず、遠い魔族の地でも見えなくならないよう、距離の 0.7 乗で小さくする
function treeSize(Z) {
  const R = typeof FIELD_ZONES !== 'undefined' && FIELD_ZONES.tree_root, P = R && FIELD_ZONES.pokapoka, M = zoneMap2d(Z);
  if (!M || !R || Z === R) return 1.6;
  const md = p => Math.hypot(R.map2d[0] - p[0], R.map2d[1] - p[1]), [d0, s0] = P.treeLook;
  return s0 * 230 / d0 * Math.min(1.3, Math.max(0.3, (md(P.map2d) / md(M)) ** 0.7));
}
// 遠景の樹の一枚絵：3D の樹（worldTree）を、正面から一度だけ裏で描いて絵にする。区画を移っても使い回し、元気（物語の進み具合）が変わったら描きなおす。
//   白い昼の光で描き、区画の空の色は貼るときにかける（farTree の tint・かすみ）。感情の実は絵に入れず、位置だけ覚えておく（光る玉のまま絵の前に置く）。
//   絵の中身は CPU にも持っておく（WebGL が止まって作り直しても、もう一度送れる）
//   返すもの：tex（絵。色は透明度をかけてある）、frame：[絵のまん中の x, y, 一辺]（樹の中の座標）、fruits：[[x, y, r], …]
function farTreeImage(health) {
  const low = GFX.low, C = TexCache.farTree;
  if (C && C.health === health && C.low === low) return C;
  if (C) C.tex.dispose();
  const r = GFX.renderer, S = low ? 512 : 1024;
  // 実は、正面のずっと先から見える面に散らす（樹ぜんたいが、実を置く帯に入るように）
  const fr = health >= 1 ? 0.55 : 0, eye = fr ? { pos: V3(0, 25, 500), screen: (x, y) => [x / 60, (y - 40) / 60] } : null;
  const look = { sun: [-0.35, 0.55, -0.75], rim: ['#fff0d8', '#fff0d8', '#fff0d8'], rimK: 0.3, haze: ['#000000', '#000000'], hz: [0, 0, 0, 0], glow: [0.04, 0.25] };
  const { g, fruits, halo } = worldTree(health, fr, eye, { far: true, look });
  const fd = fruits.map(f => [f.position.x, f.position.y, f.geometry.parameters.radius]);
  for (const o of [...fruits, halo]) { g.remove(o); disposeTree(o); }
  const box = new THREE.Box3().setFromObject(g), c = box.getCenter(V3()), sz = box.getSize(V3()), side = Math.max(sz.x, sz.y) + 8;
  const sc = new THREE.Scene(); sc.add(g);
  sc.add(new THREE.HemisphereLight('#f4f8ff', '#6a6a58', 0.95));
  const key = new THREE.DirectionalLight('#fffaf0', 1.9); key.position.set(0.5, 1, 0.8); sc.add(key);
  const fill = new THREE.DirectionalLight('#ffffff', 0.35); fill.position.set(-0.8, 0.3, 0.6); sc.add(fill);
  const cam = new THREE.OrthographicCamera(-side / 2, side / 2, side / 2, -side / 2, 1, 1000); cam.position.set(c.x, c.y, 500); cam.lookAt(c.x, c.y, 0);
  const rt = new THREE.WebGLRenderTarget(S, S, { colorSpace: THREE.SRGBColorSpace }), px = new Uint8Array(S * S * 4);
  const prev = r.getRenderTarget(), cc = r.getClearColor(new THREE.Color()), ca = r.getClearAlpha();
  r.setRenderTarget(rt); r.setClearColor(0x000000, 0); r.clear(); r.render(sc, cam);
  r.readRenderTargetPixels(rt, 0, 0, S, S, px);
  r.setRenderTarget(prev); r.setClearColor(cc, ca);
  rt.dispose(); disposeTree(sc);
  const tex = new THREE.DataTexture(px, S, S, THREE.RGBAFormat);
  tex.colorSpace = THREE.SRGBColorSpace; tex.generateMipmaps = true; tex.minFilter = THREE.LinearMipmapLinearFilter; tex.magFilter = THREE.LinearFilter; tex.needsUpdate = true;
  return (TexCache.farTree = { health, low, tex, frame: [c.x, c.y, side], fruits: fd });
}
// 区画の空の色：昼の草原（meadow）を 1 として、光の色と明るさの比
function treeTint(th) {
  const m = THEMES.meadow, mix = t => new THREE.Color(t.key).lerp(new THREE.Color(t.sky), 0.4).multiplyScalar(t.light || 1), a = mix(th), b = mix(m);
  return new THREE.Color(Math.min(1.2, a.r / b.r), Math.min(1.2, a.g / b.g), Math.min(1.2, a.b / b.b));
}
function farTree(T) {
  // treeLook：[距離, 大きさ, 高さ]。ぽかぽか村の見え方が基準。ほかの区画は、樹から遠いほど小さく（treeSize）
  const h = treeHealth(), zt = T.zone && T.zone.treeAt, [dist, sc, y] = (T.zone && T.zone.treeLook) || [230, treeSize(T.zone), -6], th = T.th;
  // turn：戦場のように区画を回して置くときは、その分だけ樹も回す
  const a = (zt ? zt[0] : treeAngle(T.zone)) - T.turn, d = zt ? zt[1] : dist, P = V3(Math.sin(a) * d, y, -Math.cos(a) * d);
  const I = farTreeImage(h), [fx, fy, side] = I.frame;
  // 一枚絵の板：いつもカメラのほうへ向く（樹はどこから見てもほぼ同じ形）。区画の空の色をかけ、下ほど地平線の霧の色にかすむ。
  //   leaf.emissive：第八章で樹が光るとき（treeShine）に足す色
  const g = new THREE.Group(), leaf = { emissive: new THREE.Color(0, 0, 0) };
  const m = new THREE.MeshBasicMaterial({ map: I.tex, transparent: true, depthWrite: false, fog: false,
    blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor });   // 絵の色は透明度をかけてある
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { uTint: { value: treeTint(th) }, uEm: { value: leaf.emissive }, uHazeLo: { value: new THREE.Color(th.fog) }, uHazeHi: { value: new THREE.Color(th.horizon) } });
    sh.vertexShader = 'varying float vWY;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>\n  vWY = (modelMatrix * vec4(transformed, 1.0)).y;');
    sh.fragmentShader = 'uniform vec3 uTint, uEm, uHazeLo, uHazeHi; varying float vWY;\n' + sh.fragmentShader
      .replace('#include <map_fragment>', '#include <map_fragment>\n  diffuseColor.rgb = diffuseColor.rgb * uTint + uEm * diffuseColor.a;')
      .replace('#include <fog_fragment>', `float hz = clamp(0.26 - vWY * 0.0022, 0.08, 0.28);
  gl_FragColor.rgb = mix(gl_FragColor.rgb, mix(uHazeLo, uHazeHi, smoothstep(0.0, 90.0, vWY)) * gl_FragColor.a, hz);`);
  };
  m.customProgramCacheKey = () => 'farTreeImg';
  const board = new THREE.Mesh(new THREE.PlaneGeometry(side, side), m); board.position.set(fx, fy, 0); g.add(board);
  board.onBeforeRender = (rr, s, cam) => { g.rotation.y = Math.atan2(cam.position.x - P.x, cam.position.z - P.z); };
  // 感情の実：絵のすぐ前に
  const fruits = I.fruits.map(([x, fy2, rad], i) => { const c = TREE_FRUIT_COLS[i % 4], f = new THREE.Mesh(new THREE.SphereGeometry(rad, 10, 8), glowMat(c, 4 * lumaBoost(c), { fog: false })); f.position.set(x, fy2, 2); g.add(f); return fruitHalo(f, c, rad); });
  // うしろの光：樹冠のうしろに（光るのは輪郭のまわりだけ）
  const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#fff0c8', 0.3 * h + 0.08), blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  halo.scale.setScalar(120); halo.position.set(0, 52, -40); g.add(halo);
  T.farTree = { g, fruits, halo, leaf };
  g.scale.setScalar(sc); g.position.copy(P);
  g.rotation.y = Math.atan2(-P.x, -P.z);   // はじめは、区画のまん中のほうへ
  T.root.add(g);
  T.updaters.push((dt, t) => { fruitGlowSync(fruits); fruits.forEach((f, i) => { f.scale.setScalar((f.userData.s ?? 1) * (1 + Math.sin(t * 2 + i) * 0.15)); }); });
}
// なだらかな丘の遠景
// 区画が遠景の小物をよけてほしいところ（zone.envSkip(x, z)：遠くに見せたいものの手前など）
const envSkip = (T, x, z) => !!(T.zone && T.zone.envSkip && T.zone.envSkip(x, z));
// とても広い区画（中心から角まで 90m をこえる）は、遠景の丘を、そのぶん遠くへ（区画の中にめりこまないように）
const envPush = T => { const Z = T.zone; return Z && Z.w ? Math.max(0, Math.hypot(Z.w / 2, Z.d / 2) - 90) : 0; };
//   o.rnd：置き方の乱数（ふつうは毎回ちがう。タイトルのように、いつも同じ景色にしたいときは seeded を渡す）
//   o.skip(x, z, rad)：この丘を置かないとき true（大きな樹にめりこむところなど。rad は丘の半径）
function hills(T, col, r = 140, n = 16, hgt = 18, y0 = -4, o = {}) {
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 1 }), push = envPush(T), rnd = o.rnd || Math.random;
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd() * 0.2, rr = r + push + rnd() * 40, rad = 30 + rnd() * 30, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (envSkip(T, x, z) || (o.skip && o.skip(x, z, rad))) continue;
    const h = new THREE.Mesh(new THREE.SphereGeometry(rad, 16, 10), m);
    h.position.set(x, y0 - 10, z); h.scale.y = (hgt + rnd() * hgt) / 45; T.root.add(h);
  }
}
// 地層の岩山の遠景（ごろごろ切り通し。zone.th.mesa）：なだらかな丘の代わりに、上が平らな岩山（側面は区画の崖と同じ地層、上は草）。
//   o.r：置く半径、o.n：数、o.skip(x, z)：置かない所（緑の林を見せたい方角など）
function mesas(T, o = {}) {
  const push = envPush(T), rnd = seeded(23), r0 = o.r || 150, n = o.n || 16;
  const side = new THREE.MeshStandardMaterial({ color: '#f0e0cc', roughness: 1, flatShading: true }), top = new THREE.MeshStandardMaterial({ color: '#9ab068', roughness: 1, flatShading: true });
  for (let i = 0; i < n; i++) {
    const a = i / n * Math.PI * 2 + rnd() * 0.25, rr = r0 + push + rnd() * 50, rad = 22 + rnd() * 26, h = 10 + rnd() * 14, x = Math.cos(a) * rr, z = Math.sin(a) * rr;
    if (envSkip(T, x, z) || (o.skip && o.skip(x, z))) continue;
    // 上が少しせまい 9 角の柱。側面を 3 段に割り、角の位置をずらしてごつごつに
    const geo = new THREE.CylinderGeometry(rad * (0.62 + rnd() * 0.18), rad, h, 11, 3), p = geo.attributes.position;
    for (let k = 0; k < p.count; k++) {
      const px = p.getX(k), py = p.getY(k), pz = p.getZ(k), q = Math.hypot(px, pz);
      if (q < 1e-3) continue;
      const j = 1 + Math.sin(px * 0.21 + py * 0.13 + i) * 0.12 + Math.sin(pz * 0.17 - py * 0.31 + i * 2) * 0.08 + Math.sin(Math.atan2(pz, px) * 3 + i) * 0.1;
      p.setXYZ(k, px * j, py + (py > h / 2 - 0.01 ? Math.sin(px * 0.3 + pz * 0.2) * 1.2 : 0), pz * j);
    }
    geo.computeVertexNormals();
    const tex = strataTex().clone(); tex.needsUpdate = true; tex.repeat.set(Math.round(rad * 2 * Math.PI / 16), h / 16);
    const sm = side.clone(); sm.map = tex;
    const m = new THREE.Mesh(geo, [sm, top, top]);
    m.position.set(x, h / 2 - 6, z); m.rotation.y = rnd() * 6; T.root.add(m);
  }
}
// 浮かぶ島・雲のかたまり
function puffClouds(T, n = 10, col = '#ffffff', y0 = 30) {
  const m = new THREE.MeshStandardMaterial({ color: col, roughness: 1, emissive: col, emissiveIntensity: 0.25, fog: false });
  const list = [];
  for (let i = 0; i < n; i++) {
    const g = new THREE.Group(), a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 80;
    // 雲ひとつ（玉 5 つ）を一つの形にまとめる（玉ごとに描くと、雲 14 個で 70 回。非力なスマホでは描く回数が重い）
    const puffs = [];
    for (let k = 0; k < 5; k++) { const p = new THREE.SphereGeometry(4 + Math.random() * 4, 12, 8); p.scale(1, 0.7, 1); p.translate(k * 5 - 10, Math.random() * 3, Math.random() * 3); puffs.push(p); }
    g.add(new THREE.Mesh(THREEX.BufferGeometryUtils.mergeGeometries(puffs), m)); puffs.forEach(p => p.dispose());
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
  studio(T) { T.noTree = true; },
  meadow(T) {
    hills(T, '#7ab85a'); puffClouds(T, 12);
    motes(T, '#ffe8f0', 14, { fall: true, drift: 1.2, size: 0.07, life: 7 });   // 花びら
  },
  night(T) {
    hills(T, '#1e3424'); motes(T, '#fff4b8', 12, { size: 0.05, life: 4, k: 2.2 });   // 蛍
  },
  forest(T) {
    hills(T, '#4a7a3a', 130, 16, 24);
    motes(T, '#fff4a8', 30, { fall: true, size: 0.07, life: 6, k: 2.6, drift: 0.2 });   // ほしふる：光の粒が降る
    // こもれびの光の柱：ふち（面を斜めに見るところ）と上下の端は、ぼかして消す（筒の形が見えないように）
    const rays = [];
    for (let i = 0; i < (T.bare ? 4 : GFX.low ? 3 : 8); i++) {   // 軽量の画質では少なく（足し算の大きな面は、非力なスマホで重い）
      const m = new THREE.Mesh(new THREE.CylinderGeometry(0.8, 2.4, 26, 16, 1, true), lightShaftMat('#fff6c8', 0.5));
      const a = Math.random() * Math.PI * 2, r = 8 + Math.random() * 30; m.position.set(Math.cos(a) * r, 12, Math.sin(a) * r); m.rotation.z = 0.3; T.root.add(m); rays.push([m, Math.random() * 6]);
    }
    T.updaters.push((dt, t) => rays.forEach(([m, p]) => { m.material.uniforms.op.value = 0.2 + Math.sin(t * 0.5 + p) * 0.08; }));
  },
  road(T) { if (T.zone && T.zone.th && T.zone.th.mesa) mesas(T, T.zone.th.mesa); else hills(T, '#9ab868', 150, 18, 20); puffClouds(T, 14, '#fff6ec'); motes(T, '#ffe8b8', 8, { size: 0.05, life: 5 }); },
  kingdom(T) {
    hills(T, '#8ab870', 160, 14, 14); puffClouds(T, 14, '#ffffff', 26);
    motes(T, '#ffb8d8', 12, { fall: true, drift: 1.2, size: 0.07, life: 7 });   // 紙ふぶき・花びら
    const cols = ['#e87aa8', '#5a8ad8', '#ffd27a'], wm = new THREE.MeshStandardMaterial({ color: '#f4ece0', roughness: 1 });
    for (let i = 0; i < 7; i++) { const x = -60 + i * 20, h = 20 + (i % 3) * 12; const tw = new THREE.Mesh(new THREE.CylinderGeometry(4, 4.5, h, 10), wm); tw.position.set(x, h / 2 - 4, -150); T.root.add(tw); const rf = new THREE.Mesh(new THREE.ConeGeometry(5.5, 9, 10), new THREE.MeshStandardMaterial({ color: cols[i % 3], roughness: 0.8 })); rf.position.set(x, h - 4 + 4.5, -150); T.root.add(rf); }
  },
  // 夕暮れの丘（タイトル）：遠くの丘は夕もやに沈み、夕日の色の雲。金色の光の粒が、草のあいだから立ちのぼる
  dusk(T) {
    // 遠くの丘は、開くたびに変わらないよう決まった乱数で置き、にゃんだーの樹（TitleView で (8, -8, -150) に置く）の根もとにかかる丘は置かない
    hills(T, '#6a7a5a', 140, 16, 18, -4, { rnd: seeded(3), skip: (x, z, rad) => Math.hypot(x - 8, z + 150) < rad + 12 });
    motes(T, '#ffd890', 16, { size: 0.055, life: 6, k: 2.4, drift: 0.5 });
  },
  tower(T) { motes(T, '#ffd27a', 14, { size: 0.06, life: 4, k: 2 }); T.noTree = true; },
  // くろねこ谷・魔王領からは、にゃんだーの樹は見えない（区画・戦闘・会話の場面とも、このテーマ。古代遺跡の ruins も同じ）
  valley(T) {
    T.noTree = true;
    hills(T, '#3a3448', 120, 18, 34);
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
  // 古代遺跡・苔むす古道からも、にゃんだーの樹は見えない
  ruins(T) {
    T.noTree = true;
    hills(T, '#6a8a6a', 140, 16, 26); puffClouds(T, 8);
    const sm = new THREE.MeshStandardMaterial({ color: '#b8b098', roughness: 1 });
    for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 60 + Math.random() * 50, h = 8 + Math.random() * 20; const c = new THREE.Mesh(new THREE.CylinderGeometry(1.8, 2, h, 10), sm); c.position.set(Math.cos(a) * r, h / 2 - 1, Math.sin(a) * r); c.rotation.z = (Math.random() - 0.5) * 0.3; T.root.add(c); }
    motes(T, '#b8ffe8', 10, { size: 0.05, life: 5, k: 2 });
  },
  demon(T) {
    T.noTree = true;
    hills(T, '#3a2440', 130, 16, 30); puffClouds(T, 10, '#b88ad8', 34);
    // 魔王城のシルエット（とげとげ）
    const m = new THREE.MeshStandardMaterial({ color: '#2a1a38', roughness: 1, emissive: '#3a1050', emissiveIntensity: 0.3 });
    for (let i = 0; i < 5; i++) { const x = -30 + i * 15, h = 26 + (i === 2 ? 26 : (i % 2) * 10); const tw = new THREE.Mesh(new THREE.CylinderGeometry(3, 4, h, 8), m); tw.position.set(x, h / 2 - 4, -160); T.root.add(tw); const rf = new THREE.Mesh(new THREE.ConeGeometry(4.5, 12, 8), m); rf.position.set(x, h + 2, -160); T.root.add(rf); const w = new THREE.Mesh(new THREE.BoxGeometry(1.4, 2, 0.2), glowMat('#ffcf4a', 2.5)); w.position.set(x, h * 0.7, -155.8); T.root.add(w); }
    motes(T, '#ff9ad8', 10, { size: 0.06, life: 5, k: 2 });
  },
  tree(T) { hills(T, '#8a9a5a', 140, 14, 18); puffClouds(T, 10, '#fff6dc'); motes(T, '#fff0a8', 24, { size: 0.07, life: 6, k: 2.4, drift: 0.3 }); },
  root(T) { T.noTree = true; motes(T, '#b8ff8a', 22, { size: 0.06, life: 5, k: 2.6 }); },
  // 世界の果て（地の底）からは、にゃんだーの樹は見えない（区画の world_end も skyTree: false）
  end(T) {
    T.noTree = true;
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

// ============================================================
//  森の豊かな見た目（テーマの lush。いまは ほしふる森 の forest だけ）
//   地面：大きな色むら・木立のきわの影だまり・こもれびのまだら（lushGround）
//   木：幹から枝分かれした枝に、小枝の葉（葉の絵の板）をつける（ZoneKit.lushTree・lushFir・lushShrub。材質は lushBarkMat・lushLeafMat）
//   草むら：風にゆれる草の束（ZoneKit.lushGrass。材質は lushGrassMat）
// ============================================================
const LUSH = { time: { value: 0 }, dap: { value: 1 } };   // dap：こもれびのまだらを描くか（軽量の画質では描かない。画質はとちゅうで変わるので毎コマ）
// 値ノイズ（格子の点に乱数、あいだはなめらかにつなぐ）を、くり返す画像に焼いたもの。4 つの色の段に、別々のノイズ。
//   LUSH_NZ_P 格子でひとまわり（1 格子 8 画素）。シェーダーでは格子の座標 p を 1 / LUSH_NZ_P 倍して読む
const LUSH_NZ_P = 32;
function lushNoiseTex() {
  if (TexCache.lushNz) return TexCache.lushNz;
  const P = LUSH_NZ_P, K = 8, N = P * K, data = new Uint8Array(N * N * 4), H = new Float32Array(P * P * 4), rnd = seeded(5);
  for (let i = 0; i < H.length; i++) H[i] = rnd();
  const h = (x, y, c) => H[(((y % P) * P) + (x % P)) * 4 + c];
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const px = (x + 0.5) / K, py = (y + 0.5) / K, ix = Math.floor(px), iy = Math.floor(py);
    let fx = px - ix, fy = py - iy; fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
    for (let c = 0; c < 4; c++) {
      const a = h(ix, iy, c) + (h(ix + 1, iy, c) - h(ix, iy, c)) * fx, b = h(ix, iy + 1, c) + (h(ix + 1, iy + 1, c) - h(ix, iy + 1, c)) * fx;
      data[(y * N + x) * 4 + c] = Math.round((a + (b - a) * fy) * 255);
    }
  }
  const t = new THREE.DataTexture(data, N, N, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true;
  return (TexCache.lushNz = t);
}   // 草のゆれ・こもれびの動きの時計（buildEnvironment の update で進める）
// 区画のテーマが lush で、木立（flora）の区画か。地面の模様は章の bg、空と光は区画の bg なので、区画の bg を見る
function lushZone(v) {
  const th = v.zone && THEMES[v.zone.bg || (v.ch && v.ch.bg)];
  return !!(th && th.lush && v.T && v.T.outdoor === 'flora');
}
// ノイズは画像（lushNoiseTex）から読む。1 画素ごとに sin のハッシュでノイズを作ると、非力なスマホでは地面だけで 1 コマ 20ms ほど重かった（Galaxy A21）
const LUSH_GLSL = `
  uniform sampler2D lushNz;
  vec4 lushN(vec2 p){ return texture2D(lushNz, p * ${(1 / LUSH_NZ_P).toFixed(6)}); }
  // 地面の色：大きな色むら（日なたは黄みに明るく、ところどころ青みに沈む）と、木立のきわの影だまり（o：木立の濃さ）
  vec3 lushTint(vec2 w, float o){
    float n = lushN(w * 0.07).r * 0.65 + lushN(w * 0.23 + 7.0).g * 0.35;
    return mix(vec3(0.82, 0.9, 0.86), vec3(1.12, 1.1, 0.9), n) * mix(vec3(1.0), vec3(0.5, 0.62, 0.6), o);
  }
  // こもれび：木立のそばほど、ゆっくり流れる光のまだら（1 が日なた）
  uniform float lushDap;
  float lushDapple(vec2 w, float o, float t){
    if (lushDap < 0.5) return mix(1.0, 0.66, smoothstep(0.06, 0.42, o) * 0.9);   // 軽量の画質：まだらの平均の暗さだけ
    vec2 q = w * 0.45 + vec2(t * 0.06, t * 0.035);
    float d = smoothstep(0.4, 0.62, lushN(q).b * 0.6 + lushN(q * 2.3 + 3.1).a * 0.4);
    return mix(1.0, 0.28 + d * 1.25, smoothstep(0.06, 0.42, o) * 0.9);
  }`;

// 木立の濃さの地図：地図の木立（#）を 1、ほかを 0 にして、ぼかす（1 マス 4 画素）。
//   地面・草のシェーダーで使う画像（tex）と、置き場所を決めるための at(x, z)
function canopyMap(T) {
  const P = 4, W = T.cols * P, H = T.rows * P;
  let a = new Float32Array(W * H), b = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = T.idx((x / P) | 0, (y / P) | 0);
    a[y * W + x] = i >= 0 && T.kind[i] <= TK.WINDOW && !T.water[i] ? 1 : 0;
  }
  // 箱のぼかしを縦横に 3 回（ほぼガウスのぼかし）。地図の外は木立とみなす
  const R = 5, blur = (src, dst, dx, dy, n, len) => {
    for (let o = 0; o < n; o++) for (let k = 0; k < len; k++) {
      let s = 0;
      for (let d = -R; d <= R; d++) { const q = k + d; s += q < 0 || q >= len ? 1 : src[dx ? o * W + q : q * W + o]; }
      dst[dx ? o * W + k : k * W + o] = s / (R * 2 + 1);
    }
  };
  for (let p = 0; p < 3; p++) { blur(a, b, 1, 0, H, W); blur(b, a, 0, 1, W, H); }
  const data = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) data[i] = Math.round(a[i] * 255);
  const tex = new THREE.DataTexture(data, W, H, THREE.RedFormat);
  tex.magFilter = tex.minFilter = THREE.LinearFilter; tex.needsUpdate = true;
  const x0 = -T.hw, z0 = -T.hd, w = T.cols * CELL, d = T.rows * CELL;
  return {
    tex, rect: new THREE.Vector4(x0, z0, 1 / w, 1 / d),
    at(x, z) { const px = clamp(Math.floor((x - x0) / w * W), 0, W - 1), py = clamp(Math.floor((z - z0) / d * H), 0, H - 1); return a[py * W + px]; },
  };
}
// ワールド座標を、シェーダーの vLushW に渡す（instanced なら instanceMatrix もかける）
const LUSH_VERT = sh => {
  sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vLushW;')
    .replace('#include <project_vertex>', `#include <project_vertex>
      #ifdef USE_INSTANCING
        vLushW = (modelMatrix * instanceMatrix * vec4(transformed, 1.0)).xyz;
      #else
        vLushW = (modelMatrix * vec4(transformed, 1.0)).xyz;
      #endif`);
};
const lushFragHead = sh => sh.fragmentShader.replace('#include <common>', `#include <common>
  uniform sampler2D lushOcc; uniform vec4 lushRect; uniform float lushTime; varying vec3 vLushW;${LUSH_GLSL}`);
// 地面（床・土の道）の材質に、色むら・影だまり・こもれびを足す
function lushGround(mat, cm) {
  mat.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { lushOcc: { value: cm.tex }, lushRect: { value: cm.rect }, lushTime: LUSH.time, lushNz: { value: lushNoiseTex() }, lushDap: LUSH.dap });
    LUSH_VERT(sh);
    sh.fragmentShader = lushFragHead(sh)
      .replace('#include <map_fragment>', `#include <map_fragment>
        float lushO = texture2D(lushOcc, (vLushW.xz - lushRect.xy) * lushRect.zw).r;
        diffuseColor.rgb *= lushTint(vLushW.xz, lushO);`)
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        reflectedLight.directDiffuse *= lushDapple(vLushW.xz, lushO, lushTime);`);
  };
  mat.customProgramCacheKey = () => 'lushGround'; mat.userData.lushOcc = cm.tex;   // 場面を片付けるときに手放す（disposeTree）
  mat.needsUpdate = true;
}
// 草の束の材質：根もとは暗く先は明るい。地面と同じ色むら・影だまり・こもれびで、地面になじませる。
//   面の向きは上向き（地面と同じ光の当たり方）にして、裏から見ても暗くしない。風で先をゆらす
function lushGrassMat(cm) {
  const m = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: 1, metalness: 0, side: THREE.DoubleSide });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { lushOcc: { value: cm.tex }, lushRect: { value: cm.rect }, lushTime: LUSH.time, lushNz: { value: lushNoiseTex() }, lushDap: LUSH.dap });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aT; uniform float lushTime; varying float vT;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vT = aT;
        { vec2 ip = vec2(instanceMatrix[3].x, instanceMatrix[3].z);
          float w = sin(lushTime * 1.6 + ip.x * 0.35 + ip.y * 0.22) * 0.6 + sin(lushTime * 2.7 + ip.x * 0.9 - ip.y * 0.5) * 0.4;
          transformed.xz += vec2(0.1, 0.05) * w * aT * aT; }`);
    LUSH_VERT(sh);
    sh.fragmentShader = lushFragHead(sh).replace('#include <common>', '#include <common>\nvarying float vT;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        float lushO = texture2D(lushOcc, (vLushW.xz - lushRect.xy) * lushRect.zw).r;
        diffuseColor.rgb *= lushTint(vLushW.xz, lushO) * mix(0.68, 1.2, vT);`)
      .replace('#include <normal_fragment_begin>', '#include <normal_fragment_begin>\nnormal = normalize(vNormal);')
      .replace('#include <lights_fragment_end>', `#include <lights_fragment_end>
        reflectedLight.directDiffuse *= lushDapple(vLushW.xz, lushO, lushTime);`);
  };
  m.customProgramCacheKey = () => 'lushGrass'; m.userData.lushOcc = cm.tex;
  return m;
}
// 草の束の形：細い葉を 6 枚、まわりへ少しずつ倒して。aT は根もと 0・先 1。法線はすべて上向き
function lushTuftGeo() {
  if (TexCache.lushTuft) return TexCache.lushTuft;
  const pos = [], nrm = [], at = [], idx = [], rnd = seeded(11);
  for (let b = 0; b < 6; b++) {
    const a = b / 6 * Math.PI * 2 + rnd() * 0.8, r0 = 0.02 + rnd() * 0.06, h = 0.16 + rnd() * 0.18, lean = 0.1 + rnd() * 0.12, w = 0.045 + rnd() * 0.02;
    const cx = Math.cos(a), cz = Math.sin(a), px = -cz, pz = cx, n = pos.length / 3;
    const P = (t, side) => { const o = r0 + lean * t * t, ww = w * (1 - t) * side; pos.push(cx * o + px * ww, h * t, cz * o + pz * ww); nrm.push(0, 1, 0); at.push(t); };
    P(0, -1); P(0, 1); P(0.55, -1); P(0.55, 1); P(1, 0);
    idx.push(n, n + 1, n + 3, n, n + 3, n + 2, n + 2, n + 3, n + 4);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nrm, 3));
  g.setAttribute('aT', new THREE.Float32BufferAttribute(at, 1)); g.setIndex(idx);
  return (TexCache.lushTuft = g);
}
// 区画の森の木の形（ZoneKit.flushTrees）：`${区画}|${軽量}|${木の数}|${植える木の一覧のハッシュ}` → [[BufferGeometry, 葉か], …]。最近の二つだけ取っておく
const LUSH_TREE_CACHE = new Map();
const lushPick = (a, r) => a[Math.floor(r() * a.length)];
const lushTint = (c, k, r) => new THREE.Color(c).multiplyScalar(1 + (r() - 0.5) * k * 2);   // 色を少しだけばらつかせる（ZoneKit.tint の、乱数を選べるもの）
// のびる型つき配列（森の木の形を、ふつうの配列を通さずに直接ためる。非力なスマホで、大きなふつうの配列に数を足していくのと、
//   あとで型つき配列へ写すのが重かった）。room(k)：k 個ぶんの空きを用意して配列を返す（書いたら n を進める）。out()：ちょうどの長さに切った写し
class LushBuf {
  constructor(T, n = 1 << 14) { this.T = T; this.a = new T(n); this.n = 0; }
  room(k) { if (this.n + k > this.a.length) { const b = new this.T(Math.max(this.a.length * 2, this.n + k)); b.set(this.a); this.a = b; } return this.a; }
  out() { return this.a.slice(0, this.n); }
}
const lushU16 = v => v <= 0 ? 0 : v >= 1 ? 65535 : (v * 65535 + 0.5) | 0;   // 0〜1 を 16 ビットに
const lushI8 = v => Math.round(Math.max(-1, Math.min(1, v)) * 127);         // -1〜1 を 8 ビットに（法線）
// 三点 P0・P1・P2 を通る曲線（P1 を t = 0.5 で通る二次ベジェ）。返す関数 (t, out) は、out に [x, y, z, 接線 x, y, z] を書く（長さを測りなおさないので速い）
function lushCurve(P0, P1, P2) {
  const cx = 2 * P1.x - (P0.x + P2.x) / 2, cy = 2 * P1.y - (P0.y + P2.y) / 2, cz = 2 * P1.z - (P0.z + P2.z) / 2;
  return (t, out) => {
    const u = 1 - t, a = u * u, b = 2 * u * t, c = t * t;
    out[0] = a * P0.x + b * cx + c * P2.x; out[1] = a * P0.y + b * cy + c * P2.y; out[2] = a * P0.z + b * cz + c * P2.z;
    out[3] = 2 * u * (cx - P0.x) + 2 * t * (P2.x - cx); out[4] = 2 * u * (cy - P0.y) + 2 * t * (P2.y - cy); out[5] = 2 * u * (cz - P0.z) + 2 * t * (P2.z - cz);
    return out;
  };
}
// 小枝の葉の絵（白黒。色は頂点の色をかける）。左半分は広葉樹の小枝（下のまん中から上へのびる茎に、葉が互い違いに 9 枚と先に 1 枚）、
//   右半分は針葉樹の小枝（まっすぐな茎に、針の葉が両がわへ斜め前にびっしり。横へ小さな枝も）。
//   板の下のまん中を枝につけ、上へのばして使う（uv の v が 0 の辺が枝のがわ）。遠くで葉がやせないよう、葉は太めに
function leafSprayTex() {
  if (TexCache.leafSpray) return TexCache.leafSpray;
  const W = 512, H = 256, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); let sd = 21; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
  const gray = v => `rgb(${v | 0},${v | 0},${v | 0})`;
  // 広葉樹：葉は先のとがった卵形。葉脈と、半分だけ少し暗く（葉の折れ目）
  const leaf = (x, y, ang, L, w, v) => {
    g.save(); g.translate(x, y); g.rotate(ang);
    g.fillStyle = gray(v); g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(L * 0.2, -w * 1.1, L * 0.7, -w * 0.9, L, 0); g.bezierCurveTo(L * 0.7, w * 0.9, L * 0.2, w * 1.1, 0, 0); g.fill();
    g.fillStyle = 'rgba(0,0,0,.13)'; g.beginPath(); g.moveTo(0, 0); g.bezierCurveTo(L * 0.2, w * 1.1, L * 0.7, w * 0.9, L, 0); g.closePath(); g.fill();
    g.strokeStyle = 'rgba(0,0,0,.28)'; g.lineWidth = 1.6; g.beginPath(); g.moveTo(2, 0); g.lineTo(L * 0.86, 0); g.stroke();
    g.lineWidth = 0.9; for (let k = 1; k <= 3; k++) { const t = k / 4.2; g.beginPath(); g.moveTo(L * t, 0); g.lineTo(L * (t + 0.12), -w * 0.55); g.moveTo(L * t, 0); g.lineTo(L * (t + 0.12), w * 0.55); g.stroke(); }
    g.restore();
  };
  const stem = (pts, w0, w1, v) => { g.strokeStyle = gray(v); g.lineCap = 'round'; for (let i = 1; i < pts.length; i++) { g.lineWidth = lerp(w0, w1, i / (pts.length - 1)); g.beginPath(); g.moveTo(...pts[i - 1]); g.lineTo(...pts[i]); g.stroke(); } };
  const bend = (x0, y0, x1, y1, k, n = 8) => [...Array(n + 1)].map((_, i) => { const t = i / n; return [lerp(x0, x1, t) + Math.sin(t * Math.PI) * k, lerp(y0, y1, t)]; });
  {
    const S = bend(128, 252, 124, 44, 10); stem(S, 7, 3, 120);
    const at = t => { const f = t * (S.length - 1), i = Math.min(S.length - 2, f | 0), u = f - i; return [lerp(S[i][0], S[i + 1][0], u), lerp(S[i][1], S[i + 1][1], u)]; };
    for (let i = 0; i < 9; i++) {
      const t = 0.12 + i * 0.095, [x, y] = at(t), side = i % 2 ? 1 : -1, L = 66 + Math.sin(t * Math.PI) * 18 + rnd() * 8;
      leaf(x, y, -Math.PI / 2 + side * (1.05 - t * 0.45 + (rnd() - 0.5) * 0.2), L, L * 0.36, 170 + t * 70 + rnd() * 15);
    }
    const [tx, ty] = at(1); leaf(tx, ty + 4, -Math.PI / 2 - 0.05, 64, 23, 245);
  }
  // 針葉樹：針は細い線を、茎の両がわへ。先へいくほど短く
  {
    const ox = 256, S = bend(ox + 128, 252, ox + 128, 22, 6); stem(S, 6, 2.5, 110);
    const needles = (x0, y0, x1, y1, len, dir, n, v) => {
      g.lineCap = 'round';
      for (let i = 0; i < n; i++) {
        const t = i / n, x = lerp(x0, x1, t), y = lerp(y0, y1, t), a = Math.atan2(y1 - y0, x1 - x0), l = len * (1 - t * 0.45) * (0.85 + rnd() * 0.3);
        for (const sdn of [-1, 1]) { const b = a + sdn * (0.95 + rnd() * 0.25); g.strokeStyle = gray(v + rnd() * 50); g.lineWidth = 5; g.beginPath(); g.moveTo(x, y); g.lineTo(x + Math.cos(b) * l, y + Math.sin(b) * l); g.stroke(); }
      }
    };
    needles(ox + 128, 240, ox + 128, 24, 46, 1, 46, 150);
    for (const [y, sdn] of [[190, -1], [150, 1], [110, -1], [78, 1]]) {
      const x1 = ox + 128 + sdn * (56 - (190 - y) * 0.15), y1 = y - 40; stem([[ox + 128, y], [x1, y1]], 3.5, 2, 110);
      needles(ox + 128 + sdn * 6, y - 4, x1, y1, 26, sdn, 16, 160);
    }
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (TexCache.leafSpray = t);
}
// 枝・幹の材質（区切りごとにまとめた形）：頂点の色に陰を焼きこみ済み。樹皮の模様を三方向から。
//   風でゆらす（aWind：16 ビットの 0〜1。x：ゆれの位相（木ごと。2π 倍）、y：枝全体のゆれの大きさ（0.5 倍））
function lushBarkMat() {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0 });
  m.onBeforeCompile = sh => {
    Object.assign(sh.uniforms, { lushTime: LUSH.time, lushBark: { value: barkTileTex() } });
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aWind; uniform float lushTime; varying vec3 vTP, vTN;')
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        vTP = position; vTN = normal;
        { float ph = aWind.x * 6.2832;
          transformed.xz += vec2(sin(lushTime * 1.1 + ph) + 0.4 * sin(lushTime * 2.3 + ph * 1.7), 0.6 * cos(lushTime * 0.9 + ph)) * aWind.y * 0.0225; }`);
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D lushBark; varying vec3 vTP, vTN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec3 bw = pow(abs(normalize(vTN)), vec3(4.0)); bw /= bw.x + bw.y + bw.z;
          float bk = texture2D(lushBark, vTP.zy * vec2(2.2, 0.7)).r * bw.x + texture2D(lushBark, vTP.xz * 2.2).r * bw.y + texture2D(lushBark, vTP.xy * vec2(2.2, 0.7)).r * bw.z;
          diffuseColor.rgb *= mix(0.55, 1.15, bk); }`);
  };
  m.customProgramCacheKey = () => 'lushBark';
  return m;
}
// 大きな根の樹皮の絵：根にそって（絵の縦に）のびる割れ目と、そのあいだの盛り上がった皮。色（map）と、高さから作った凹凸（normal）。
//   縦横ともくり返す。根の uv は、u が根のまわり、v が根にそった長さ（ZoneKit.lushRoot）
function lushRootTex() {
  if (TexCache.lushRoot) return TexCache.lushRoot;
  const W = 256, H = 512, rnd = seeded(11);
  // くり返す値ノイズ（格子 px × py。縦の格子を粗くすると、縦にのびた形になる）。x・y は 0〜1 でひとまわり
  const vn = (px, py) => {
    const g = new Float32Array(px * py); for (let i = 0; i < g.length; i++) g[i] = rnd();
    return (x, y) => {
      const fx = x * px, fy = y * py, ix = Math.floor(fx), iy = Math.floor(fy); let u = fx - ix, v = fy - iy; u = u * u * (3 - 2 * u); v = v * v * (3 - 2 * v);
      const x0 = ((ix % px) + px) % px, x1 = (x0 + 1) % px, y0 = ((iy % py) + py) % py, y1 = (y0 + 1) % py;
      const a = g[y0 * px + x0], b = g[y0 * px + x1], c = g[y1 * px + x0], d = g[y1 * px + x1];
      return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
  };
  const warp = vn(6, 4); vn(9, 3);   // 太い割れ目（細い影に見えたのでやめた）の分も乱数を進めて、ほかの模様を変えない
  const f2 = vn(20, 5), brk = vn(7, 10), fine = vn(64, 40), hue = vn(4, 3);
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  const Hm = new Float32Array(W * H), V = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const u = x / W, v = y / H, wu = u + (warp(u, v) - 0.5) * 0.09;
    // 割れ目：ノイズが 0.5 をまたぐ細い筋（縦にのびる）。皮は、ところどころ横に切れる
    const c2 = ss(0, 0.22, Math.abs(f2(wu * 1.03, v) - 0.5)), b = ss(0, 0.1, Math.abs(brk(wu, v) - 0.5));
    Hm[y * W + x] = (0.62 + c2 * 0.26 + fine(u, v) * 0.12) * (0.72 + 0.28 * b);   // 0.62：太い割れ目があったころの皮の分（細い線の濃さはそのまま）
    V[y * W + x] = hue(u, v);
  }
  const mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const cm = mk(), cn = mk(), gm = cm.getContext('2d'), gn = cn.getContext('2d'), im = gm.createImageData(W, H), inn = gn.createImageData(W, H);
  const dk = [74, 50, 34], lt = [196, 150, 104], gr = [168, 158, 134], K = 5.5;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, h = Hm[i], hv = V[i], t = Math.pow(h, 0.85), gk = ss(0.55, 0.85, hv) * 0.45 * t, k = 0.86 + 0.28 * hv, o = i * 4;
    for (let c = 0; c < 3; c++) im.data[o + c] = Math.min(255, ((dk[c] + (lt[c] - dk[c]) * t) * (1 - gk) + gr[c] * gk) * k);
    im.data[o + 3] = 255;
    // 凹凸：高さの傾き（まわりはくり返しでつなぐ）。絵は上下が裏返って貼られる（flipY）ので、縦の傾きはそのまま
    const hx = Hm[y * W + (x + 1) % W] - Hm[y * W + (x + W - 1) % W], hy = Hm[((y + 1) % H) * W + x] - Hm[((y + H - 1) % H) * W + x];
    const nx = -hx * K, ny = hy * K, l = Math.sqrt(nx * nx + ny * ny + 1);
    inn.data[o] = (nx / l * 0.5 + 0.5) * 255; inn.data[o + 1] = (ny / l * 0.5 + 0.5) * 255; inn.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; inn.data[o + 3] = 255;
  }
  gm.putImageData(im, 0, 0); gn.putImageData(inn, 0, 0);
  const map = new THREE.CanvasTexture(cm), normal = new THREE.CanvasTexture(cn);
  map.colorSpace = THREE.SRGBColorSpace;
  for (const t of [map, normal]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 4; }
  return (TexCache.lushRoot = { map, normal });
}
// 大きな根の材質：樹皮の絵（lushRootTex）の色と凹凸に、頂点の色（地面ぎわ・筋のくぼみの陰）をかける。
//   上を向いた所には、まだらに苔（区画の座標で、地面のノイズの絵 lushNoiseTex から。割れ目より皮の上に）
function lushRootMat() {
  const t = lushRootTex();
  const m = new THREE.MeshStandardMaterial({ map: t.map, normalMap: t.normal, normalScale: new THREE.Vector2(1, 1), vertexColors: true, roughness: 0.93, metalness: 0 });
  m.onBeforeCompile = sh => {
    sh.uniforms.lushNz = { value: lushNoiseTex() };
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vRP, vRN;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vRP = position; vRN = normal;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D lushNz; varying vec3 vRP, vRN;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        { vec4 nz = texture2D(lushNz, vRP.xz * 0.03 + vRP.y * 0.011);
          float bk = texture2D(map, vMapUv).g;
          float moss = smoothstep(0.55, 0.85, normalize(vRN).y + (nz.r - 0.5) * 0.8) * smoothstep(0.35, 0.6, nz.g * 0.8 + bk * 0.9 - 0.2);
          vec3 mc = mix(vec3(0.15, 0.34, 0.05), vec3(0.3, 0.52, 0.09), nz.b) * (0.8 + 0.8 * bk);
          diffuseColor.rgb = mix(diffuseColor.rgb, mc, moss * 0.9); }`);
  };
  m.customProgramCacheKey = () => 'lushRoot';
  return m;
}
// 小枝の葉の材質：葉の絵（leafSprayTex）の板を、両面で。
//   光の当たり方は板の向きではなく、樹冠のまるみ（頂点の法線）で決めるので、なめらかに変わる。そこで光の計算は頂点ごとにして
//   （画素ごとの計算は、絵を読んで透けるところを抜き、色をかけるだけ）、葉が何枚も重なる森でも軽くする（非力なスマホで葉がいちばん重かった）。
//   光は、場面の平行光・半球光・環境光と、空の映り込みの代わりの分（sky）。葉は影を受けない（奥の葉の暗さは頂点の色に焼きこみ済み）。
//   envUp・envDown：空の照り返し（場面の環境マップ）の代わり。上向き・下向きの面が受ける色（ZoneKit.flushTrees が区画の空の色から決める。ほしふる森は 0）。
//   ふつうの材質は環境マップで空の明るさを受けるので、空の明るい区画（遺跡・村）ほど、これがないと葉だけ暗く灰色がかって見えた
//   風で枝ごとゆれ（aWind は lushBarkMat と同じ）、葉先（絵の上の辺）はこまかくそよぐ。日が透けたように、少しだけ自分で光る。
//   遠くで絵が小さくなっても葉がやせないよう、透けるところのふちを画面の細かさに合わせてくっきりさせる。
//   影を落とすときは、map と alphaTest から three.js が葉の形で抜く
function lushLeafMat() {
  const tex = leafSprayTex();
  const m = new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.lights, THREE.UniformsLib.fog, { leafMap: { value: null }, lushTime: { value: 0 }, sky: { value: 0.35 }, envUp: { value: new THREE.Color(0) }, envDown: { value: new THREE.Color(0) } }]),
    lights: true, fog: true, vertexColors: true, side: THREE.DoubleSide,
    vertexShader: `
      #include <common>
      #include <lights_pars_begin>
      #include <fog_pars_vertex>
      attribute vec2 aWind; uniform float lushTime, sky; uniform vec3 envUp, envDown; varying vec2 vUv; varying vec3 vCol;
      void main() {
        vec3 transformed = position;
        float ph = aWind.x * 6.2832, q = ph * 5.3 + position.x * 2.1 + position.z * 1.7;
        transformed.xz += vec2(sin(lushTime * 1.1 + ph) + 0.4 * sin(lushTime * 2.3 + ph * 1.7), 0.6 * cos(lushTime * 0.9 + ph)) * aWind.y * 0.0225;
        transformed += vec3(sin(lushTime * 4.1 + q), 0.6 * sin(lushTime * 5.3 + q * 1.3), cos(lushTime * 3.7 + q)) * mix(0.25, 1.0, uv.y) * 0.025;
        vec4 mvPosition = modelViewMatrix * vec4(transformed, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        vec3 n = normalize(normalMatrix * normal);
        vec3 irr = ambientLightColor;
        #if NUM_DIR_LIGHTS > 0
          for (int i = 0; i < NUM_DIR_LIGHTS; i++) irr += directionalLights[i].color * max(dot(n, directionalLights[i].direction), 0.0);
        #endif
        #if NUM_HEMI_LIGHTS > 0
          for (int i = 0; i < NUM_HEMI_LIGHTS; i++) { irr += getHemisphereLightIrradiance(hemisphereLights[i], n); irr += getHemisphereLightIrradiance(hemisphereLights[i], n) * sky; }
        #endif
        vCol = color * irr * RECIPROCAL_PI + color * 0.16 + color * mix(envDown, envUp, normalize(mat3(modelMatrix) * normal).y * 0.5 + 0.5);
        vUv = uv;
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      uniform sampler2D leafMap; varying vec2 vUv; varying vec3 vCol;
      void main() {
        vec4 t = texture2D(leafMap, vUv);
        float a = clamp((t.a - 0.5) / max(fwidth(t.a), 0.0001) + 0.5, 0.0, 1.0);
        if (a < 0.5) discard;
        gl_FragColor = vec4(vCol * t.rgb, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
  m.uniforms.leafMap.value = tex; m.uniforms.lushTime = LUSH.time;
  m.map = tex; m.alphaTest = 0.5;   // 影を落とすときの、葉の形の抜き（three.js の影の材質が使う）
  return m;
}
// 森のきのこ（ZoneKit.shroom）の材質：トゥーン。色は頂点の色。陰は日なたと日かげの二段でくっきり分け（SHROOM_GRAD）、
//   まわりからの光（半球光・環境光）は弱めて、二段の差が見えるようにする。ふちに、くっきりした輪郭光。
//   aGlow：自分で光る強さ（光るきのこ。傘 0.45・ひだ 1.26・水玉 1.62）。光は、ゆっくり息をするように強まり弱まる（位置で、一本ずつ間をずらす）
const SHROOM_GRAD = (() => {
  const t = new THREE.DataTexture(new Uint8Array([90, 255]), 2, 1, THREE.RedFormat);
  t.minFilter = t.magFilter = THREE.NearestFilter; t.generateMipmaps = false; t.needsUpdate = true;
  return t;
})();
function shroomToonMat() {
  const m = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: SHROOM_GRAD });
  m.onBeforeCompile = sh => {
    sh.uniforms.lushTime = LUSH.time;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute float aGlow; uniform float lushTime; varying float vGlow;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n  vGlow = aGlow * (0.8 + 0.2 * sin(lushTime * 1.7 + position.x * 1.9 + position.z * 1.3));');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying float vGlow;')
      .replace('#include <aomap_fragment>', 'reflectedLight.indirectDiffuse *= 0.6;\n#include <aomap_fragment>')
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        { float rimF = 1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0);
          totalEmissiveRadiance += diffuseColor.rgb * (step(0.68, rimF) * 0.22 + vGlow * 0.5); }`);
  };
  m.customProgramCacheKey = () => 'shroomToon';
  return m;
}
// 森のきのこのふち取り：裏返した外殻を、法線の向きに画面でほぼ同じ太さだけふくらませる。色は面の色を暗くしたもの（光るきのこは明るめ）
function shroomLineMat() {
  return new THREE.ShaderMaterial({
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, { thick: { value: 0.0024 } }]),
    fog: true, vertexColors: true, side: THREE.BackSide,
    vertexShader: `
      #include <common>
      #include <fog_pars_vertex>
      attribute float aGlow; uniform float thick; varying vec3 vCol;
      void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        mvPosition.xyz += normalize(normalMatrix * normal) * thick * max(1.0, -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
        vCol = color * mix(0.2, 0.55, min(aGlow, 1.0));
        #include <fog_vertex>
      }`,
    fragmentShader: `
      #include <common>
      #include <fog_pars_fragment>
      varying vec3 vCol;
      void main() {
        gl_FragColor = vec4(vCol, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }`,
  });
}
