'use strict';
// ============================================================
//  プロシージャル3Dモデル：トゥーン調キャラクター／敵
// ============================================================

const CHAR_3D = {
  aster:  { weapon: 'bat',    hem: 'coat',   legs: '#262a40', style: 'melee', shirt: '#e9e6f2', scarf: '#e8c77a' },
  mizore: { weapon: 'shield', hem: 'skirt',  legs: '#e8eefc', style: 'melee', face: { scale: 1.45, gap: 27, eye2: '#8ff3ff', lash: 1.5, brow: 0.8, mouthW: 4, blush: 0.36 } },
  yue:    { weapon: 'staff',  hem: 'dress',  legs: '#f4efe2', style: 'ranged' },
  polka:  { hem: 'coat', legs: '#2a2d55', style: 'ranged', shirt: '#f2eee6' },
  iris:   { hem: 'coat', legs: '#2a2f45', style: 'ranged', shirt: '#cfe6ff' },
  roa:    { hem: 'coat', legs: '#3a3028', style: 'melee', scarf: '#9fd8ff', shirt: '#6a5a48' },
  sougen: { hem: 'dress', legs: '#1c1418', style: 'melee', weapon: 'katana', shirt: '#e8c77a' },
  kazane: { weapon: 'dagger', hem: 'coat',   legs: '#1a2222', style: 'melee', shirt: '#2f3b3a', scarf: '#4fe0a5' },
  laika:  { weapon: 'katana', hem: 'coat',   legs: '#1c1628', style: 'melee', shirt: '#d8c9f0' },
  homura: { weapon: 'orb',    hem: 'dress',  legs: '#2a1414', style: 'ranged' },
  ciel:   { weapon: 'baton',  hem: 'skirt',  legs: '#f0f0ff', style: 'ranged' },
  nebula: { weapon: 'scythe', hem: 'dress',  legs: '#120e22', style: 'melee' },
  vespa:  { weapon: 'holo',   hem: 'jacket', legs: '#1b1d24', style: 'ranged', shirt: '#f5d34a' },
  touka:  { weapon: 'orb',    hem: 'skirt',  legs: '#2b1d38', style: 'ranged' },
  // 居住区の住人
  r_gant:    { hem: 'jacket', legs: '#3a3a44', shirt: '#2a2a34' },
  r_marta:   { hem: 'dress',  legs: '#4a3a34', shirt: '#ffffff' },
  r_pipi:    { hem: 'skirt',  legs: '#f0f0ff' },
  r_celes:   { hem: 'coat',   legs: '#2a2f45', shirt: '#cfd6ff' },
  r_horst:   { hem: 'jacket', legs: '#1c2438', shirt: '#56c8ff' },
  r_ida:     { hem: 'dress',  legs: '#3a2a24', shirt: '#f2e6d6' },
  r_boris:   { hem: 'coat',   legs: '#26304a', shirt: '#c9d8ff', scarf: '#9fd8ff' },
  r_misha:   { hem: 'coat',   legs: '#3a3a4a', scarf: '#ffffff' },
  r_grigori: { hem: 'coat',   legs: '#3a3028', shirt: '#6a5a48', scarf: '#8a6a4a' },
  r_natasha: { hem: 'coat',   legs: '#2a2a2a', shirt: '#e8dcc8', scarf: '#ffcf6a' },
  r_yunshu:  { hem: 'dress',  legs: '#1c2420', shirt: '#e8dcc8' },
  r_hakuen:  { hem: 'dress',  legs: '#2a1414', shirt: '#e8c77a' },
  r_linlin:  { hem: 'skirt',  legs: '#2a1414' },
  r_xiaochi: { hem: 'jacket', legs: '#3a2a20' },
  r_unki:    { hem: 'coat',   legs: '#1c1c2a', shirt: '#e8c77a', weapon: 'katana' },
};

// 関節角度で定義したポーズ（モデルは +Z 向き）
const POSE_KEYS = ['hipsY', 'lean', 'twist', 'headX', 'headY', 'armLx', 'armLz', 'armRx', 'armRz', 'elbowL', 'elbowR', 'legLx', 'legRx', 'kneeL', 'kneeR'];
const POSES = {
  idle:    { armLz: 0.14, armRz: -0.14, elbowL: -0.2, elbowR: -0.3, armRx: -0.1 },
  ready:   { hipsY: -0.03, lean: 0.06, armRx: -0.5, elbowR: -0.9, armRz: -0.15, armLx: -0.25, armLz: 0.3, elbowL: -0.6, legLx: -0.25, legRx: 0.18, kneeL: 0.25, kneeR: 0.3 },
  windup:  { hipsY: -0.06, twist: 0.55, lean: -0.08, armRx: -2.6, armRz: -0.45, elbowR: -0.5, armLx: -0.7, armLz: 0.45, elbowL: -0.4, legLx: -0.35, legRx: 0.3, kneeL: 0.3, kneeR: 0.3 },
  strike:  { hipsY: -0.1, twist: -0.65, lean: 0.3, armRx: -0.5, armRz: 0.45, elbowR: -0.1, armLx: 0.3, armLz: 0.5, legLx: -0.7, kneeL: 0.5, legRx: 0.45, kneeR: 0.2 },
  cast:    { lean: -0.06, headX: -0.1, armRx: -1.65, armRz: -0.15, elbowR: -0.1, armLx: -0.5, armLz: 0.55, elbowL: -0.4, legLx: -0.2, legRx: 0.15 },
  cast2:   { lean: 0.05, armRx: -1.3, armRz: 0.2, elbowR: 0, armLx: -1.4, armLz: 0.2, elbowL: 0, legLx: -0.3, kneeL: 0.2 },
  hurt:    { hipsY: -0.04, lean: -0.35, headX: -0.35, armLx: 0.4, armLz: 0.6, armRx: 0.4, armRz: -0.6, legLx: 0.2, kneeR: 0.3 },
  victory: { headX: -0.15, armRx: -2.9, armRz: -0.3, elbowR: -0.25, armLz: 0.35, elbowL: -0.5, lean: -0.05, legLx: -0.1 },
  ult:     { hipsY: -0.02, lean: -0.18, headX: -0.3, armRx: -2.7, armRz: -0.55, elbowR: -0.2, armLx: -2.7, armLz: 0.55, elbowL: -0.2, legLx: -0.2, legRx: 0.2 },
  jump:    { hipsY: 0.02, lean: 0.1, armRx: -2.9, armLx: -2.9, armRz: -0.2, armLz: 0.2, legLx: -0.9, legRx: -0.5, kneeL: 1.4, kneeR: 1.2 },
  slam:    { hipsY: -0.25, lean: 0.45, armRx: -0.2, armLx: -0.2, armRz: 0.1, legLx: -0.9, kneeL: 1.0, legRx: 0.7, kneeR: 0.9 },
  // 必殺技の演出用（アステル）
  ultSplash: { hipsY: 0.02, lean: -0.08, twist: 0.3, headX: -0.08, headY: -0.25, armRx: -2.5, armRz: -0.75, elbowR: -1.9, armLx: -0.5, armLz: 1.0, elbowL: -0.7, legLx: -1.1, kneeL: 1.6, legRx: 0.12, kneeR: 0.05 },
  ultSwing:  { hipsY: -0.05, lean: 0.1, twist: -0.25, headY: 0.2, armRx: -1.2, armRz: 1.2, elbowR: -0.3, armLx: -0.4, armLz: 0.5, elbowL: -0.9, legLx: -0.45, kneeL: 0.3, legRx: 0.35, kneeR: 0.25 },
  ultCharge: { hipsY: -0.04, lean: 0.05, twist: 0.1, headX: 0.05, headY: -0.45, armRx: -0.2, armRz: -1.35, elbowR: -0.2, armLx: -0.35, armLz: 0.35, elbowL: -0.9, legLx: -0.3, kneeL: 0.3, legRx: 0.25, kneeR: 0.2 },
  ultRaise:  { hipsY: -0.02, lean: -0.22, twist: 0.35, headX: -0.3, headY: 0.25, armRx: -2.3, armRz: -0.9, elbowR: -1.0, armLx: -0.2, armLz: 0.75, elbowL: -0.4, legLx: -0.4, kneeL: 0.25, legRx: 0.3, kneeR: 0.15 },
  ultAim:    { hipsY: -0.08, lean: 0.14, twist: 0.4, headY: -0.3, armRx: 0.55, armRz: -0.55, elbowR: -0.25, armLx: -0.45, armLz: 0.35, elbowL: -0.8, legLx: -0.5, kneeL: 0.45, legRx: 0.4, kneeR: 0.4 },
  dash:      { hipsY: -0.12, lean: 0.55, twist: 0.3, headX: -0.3, armRx: 0.9, armRz: -0.4, elbowR: -0.2, armLx: -0.9, armLz: 0.3, elbowL: -1.0, legLx: -1.1, kneeL: 0.9, legRx: 0.7, kneeR: 1.1 },
  // 必殺技の演出用（ミゾレ：盾は左前腕）
  mzSplash:  { lean: -0.05, twist: -0.25, headX: -0.05, headY: 0.1, armLx: -0.6, armLz: 1.1, elbowL: -1.0, armRx: -1.2, armRz: -0.3, elbowR: -0.2, legRx: -0.9, kneeR: 1.4, legLx: 0.1 },
  mzGuard:   { hipsY: -0.02, twist: -0.15, headX: 0.12, headY: 0.1, armLx: -0.9, armLz: 0.35, elbowL: -1.4, armRx: -0.4, armRz: -0.2, elbowR: -1.2, legLx: -0.2, legRx: 0.15 },
  mzThrust:  { hipsY: -0.06, lean: 0.1, twist: -0.35, armLx: -1.5, armLz: -0.15, elbowL: -0.15, armRx: -0.3, armRz: -0.4, elbowR: -0.9, legLx: -0.5, kneeL: 0.35, legRx: 0.35, kneeR: 0.2 },
  mzCast:    { lean: -0.1, headX: -0.3, armRx: -2.9, armRz: -0.3, elbowR: -0.1, armLx: -0.3, armLz: 0.5, elbowL: -0.9, legLx: -0.3, legRx: 0.25, kneeR: 0.1 },
  mzSlam:    { hipsY: -0.35, lean: 0.5, armLx: -0.9, armLz: -0.1, elbowL: -0.2, armRx: -0.3, armRz: -0.5, elbowR: -0.4, legLx: -1.0, kneeL: 1.3, legRx: 0.4, kneeR: 1.2 },
  mzAim:     { hipsY: -0.05, lean: 0.08, twist: -0.2, armLx: -1.0, armLz: 0.1, elbowL: -1.0, armRx: -0.5, armRz: -0.4, elbowR: -0.8, legLx: -0.4, kneeL: 0.3, legRx: 0.35, kneeR: 0.3 },
  down:    { hipsY: -0.5, lean: 0.9, headX: 0.4, armLx: -0.4, armRx: -0.4, armLz: 0.4, armRz: -0.4, legLx: -1.4, legRx: -1.4, kneeL: 2.2, kneeR: 2.2 },
};

// ---------- 顔（球のUVで +Z が u=0.25） ----------
// 顔は「土台（肌・頬・鼻）」のテクスチャに、「表情（目・眉・口）」のレイヤーを重ねる。
// 表情・まばたき・口パクは FaceRig がレイヤーのテクスチャを差し替えて表現する
function faceTexture(L) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const g = c.getContext('2d'); g.scale(2, 2);
  g.fillStyle = L.skin || '#ffe4d6'; g.fillRect(0, 0, 512, 256);
  const cx = 128, ey = 139;
  for (const s of [-1, 1]) { g.fillStyle = 'rgba(255,120,130,.28)'; g.beginPath(); g.ellipse(cx + s * 38, ey + 27, 11, 5, 0, 0, Math.PI * 2); g.fill(); }
  g.fillStyle = 'rgba(180,110,100,.5)'; g.beginPath(); g.arc(cx + 1, ey + 27, 1.4, 0, Math.PI * 2); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}

// 表情の定義：tilt = 眉の傾き（+ で内側が上がる＝困り顔、- で怒り顔）、browY = 眉の上下、
// lidIn / lidOut = 上まぶたの下がり（目頭／目尻）、low = 下まぶたの持ち上がり（笑み）、
// arc = 笑って閉じた目、squint = ぎゅっと閉じた目、iris = 瞳の大きさ、scale = 目の大きさ、mouth = 口の形
const FACE_EXPR = {
  neutral:  {},
  smile:    { browY: -1, low: 2.5, mouth: 'smile' },
  gentle:   { browY: -0.5, lidIn: 2, lidOut: 2.5, low: 2, mouth: 'smile' },
  joy:      { browY: -2.5, arc: true, mouth: 'grin' },
  surprise: { browY: -4.5, scale: 1.07, iris: 0.82, mouth: 'o' },
  sad:      { tilt: 0.32, browY: 1, lidIn: 2, lidOut: 5, mouth: 'frown' },
  worry:    { tilt: 0.28, browY: -1.5, lidIn: 1, lidOut: 2, mouth: 'wavy' },
  angry:    { tilt: -0.34, browY: 2.5, lidIn: 5.5, lidOut: 1.5, mouth: 'frown' },
  serious:  { tilt: -0.14, browY: 1.2, lidIn: 3, lidOut: 2.5, mouth: 'line' },
  pained:   { tilt: 0.3, browY: 1.5, squint: true, mouth: 'grit' },
  shy:      { browY: -1, lidIn: 1.5, lidOut: 1.5, low: 2, mouth: 'smile', blush: 0.45 },
};
// 口。open = 口パクで開いた口
function drawMouth(g, cx, my, w, type = 'line', open = false, k = 1) {
  g.lineCap = 'round';
  if (open) {
    const big = type === 'grin' || type === 'o' ? 1.35 : type === 'smile' ? 1.1 : 0.9, mw = w * 0.8 * big, mh = w * 0.5 * big;
    g.fillStyle = '#7a2e38'; g.beginPath();
    if (type === 'frown' || type === 'wavy' || type === 'o') g.ellipse(cx, my + mh * 0.7, mw * 0.75, mh * 0.85, 0, 0, Math.PI * 2);
    else { g.moveTo(cx - mw, my); g.quadraticCurveTo(cx, my + mh * 0.3, cx + mw, my); g.quadraticCurveTo(cx, my + mh * 2.3, cx - mw, my); }
    g.fill();
    g.fillStyle = '#e07884'; g.beginPath(); g.ellipse(cx, my + mh * 1.15, mw * 0.45, mh * 0.4, 0, 0, Math.PI * 2); g.fill();
    return;
  }
  g.strokeStyle = '#a4585a'; g.lineWidth = 1.1 * k; g.beginPath();
  switch (type) {
    case 'smile': g.moveTo(cx - w * 1.15, my - 1); g.quadraticCurveTo(cx, my + 3.2, cx + w * 1.05, my - 1.3); g.stroke(); break;
    case 'frown': g.moveTo(cx - w * 0.9, my + 1.5); g.quadraticCurveTo(cx, my - 1.5, cx + w * 0.85, my + 1.5); g.stroke(); break;
    case 'wavy': g.moveTo(cx - w, my + 0.5); g.bezierCurveTo(cx - w * 0.4, my - 1.5, cx + w * 0.2, my + 2, cx + w * 0.9, my); g.stroke(); break;
    case 'o': g.fillStyle = '#7a2e38'; g.ellipse(cx, my + 1.5, w * 0.35, w * 0.48, 0, 0, Math.PI * 2); g.fill(); break;
    case 'grin': {
      const mw = w * 1.3; g.fillStyle = '#8a3440';
      g.moveTo(cx - mw, my - 1); g.quadraticCurveTo(cx, my, cx + mw, my - 1); g.quadraticCurveTo(cx, my + w * 1.4, cx - mw, my - 1); g.fill();
      g.fillStyle = '#e07884'; g.beginPath(); g.ellipse(cx, my + w * 0.78, mw * 0.45, w * 0.28, 0, 0, Math.PI * 2); g.fill(); break;
    }
    case 'grit': g.moveTo(cx - w, my); g.lineTo(cx + w, my); g.stroke(); g.fillStyle = '#ffffff'; g.fillRect(cx - w * 0.8, my - 0.7 * k, w * 1.6, 1.3 * k); break;
    default: g.moveTo(cx - w, my); g.quadraticCurveTo(cx, my + 2 * k * 0.8, cx + w * 0.9, my - 0.5); g.stroke();
  }
}
// 表情のレイヤー（簡易モデル用）。st = { expr, closed（まばたき）, mouth（口パク） }
function drawFeaturesLQ(g, L, st) {
  const E = FACE_EXPR[st.expr] || {}, cx = 128, ey = 139;
  const eye = new THREE.Color(L.eye), dark = '#' + eye.clone().multiplyScalar(0.35).getHexString(), light = '#' + eye.clone().lerp(new THREE.Color('#ffffff'), 0.45).getHexString();
  const brow = '#' + new THREE.Color(L.hair).multiplyScalar(0.6).getHexString();
  for (const s of [-1, 1]) {
    const ex = cx + s * 30, sc = E.scale || 1, li = (E.lidIn || 0) * 2, lo = (E.lidOut || 0) * 2, low = (E.low || 0) * 1.6;
    g.save(); g.translate(ex, ey); g.scale(sc, sc); g.translate(-ex, -ey);
    const inX = ex - s * 14, outX = ex + s * 14;
    const top = () => { g.moveTo(inX, ey + 1); g.bezierCurveTo(ex - s * 13, ey - 23 + li, ex + s * 13, ey - 23 + lo, outX, ey + 1); };
    const bot = () => { g.bezierCurveTo(ex + s * 13, ey + 23 - low, ex - s * 13, ey + 23 - low, inX, ey + 1); };
    g.strokeStyle = '#2a1820'; g.lineCap = 'round';
    if (E.arc) { g.lineWidth = 4; g.beginPath(); g.moveTo(inX + s, ey + 5); g.quadraticCurveTo(ex, ey - 13, outX - s, ey + 5); g.stroke(); }
    else if (st.closed || E.squint) { g.lineWidth = 4; g.beginPath(); g.moveTo(inX, ey + 2); g.quadraticCurveTo(ex, ey + (E.squint ? 5 : 9), outX, ey); g.stroke(); }
    else {
      const ir = E.iris || 1;
      g.save(); g.beginPath(); top(); bot(); g.closePath(); g.fillStyle = '#ffffff'; g.fill(); g.clip();
      const gr = g.createLinearGradient(0, ey - 16, 0, ey + 16);
      gr.addColorStop(0, dark); gr.addColorStop(0.55, L.eye); gr.addColorStop(1, light);
      g.fillStyle = gr; g.beginPath(); g.ellipse(ex, ey + 2, 11.5 * ir, 16 * ir, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = dark; g.beginPath(); g.ellipse(ex, ey + 3, 5.5 * ir, 8 * ir, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.95)'; g.beginPath(); g.ellipse(ex - 4 * s, ey - 6, 4.2, 5, 0, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.arc(ex + 4 * s, ey + 8, 2, 0, Math.PI * 2); g.fill();
      g.restore();
      g.lineWidth = 4.5; g.beginPath(); top(); g.stroke();
      g.beginPath(); g.moveTo(outX - s, ey - 1 + lo * 0.3); g.lineTo(outX + s * 5, ey - 5 + lo * 0.3); g.stroke();
      g.lineWidth = 1.5; g.beginPath(); g.moveTo(ex - 10 * s, ey + 17 - low); g.quadraticCurveTo(ex, ey + 20 - low, ex + 10 * s, ey + 16 - low); g.stroke();
    }
    g.restore();
    const by = ey - 33;
    g.save(); g.translate(ex, by + (E.browY || 0) * 1.4); g.rotate(s * (E.tilt || 0)); g.translate(-ex, -by);
    g.strokeStyle = brow; g.lineWidth = 3; g.lineCap = 'round';
    g.beginPath(); g.moveTo(ex - 12 * s, ey - 30); g.quadraticCurveTo(ex, ey - 36, ex + 13 * s, ey - 31); g.stroke();
    g.restore();
    if (E.blush) { g.fillStyle = `rgba(255,110,130,${E.blush})`; g.beginPath(); g.ellipse(ex + s * 8, ey + 26, 12, 5, 0, 0, Math.PI * 2); g.fill(); }
  }
  drawMouth(g, cx, ey + 43, 6, E.mouth, st.mouth, 1.8);
}

const HIP_Y = 1.03;
function lathe(points, seg = 28) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg); }

// ============================================================
//  キャラクター
// ============================================================
function buildCharacter(key) {
  if (GLB_CHARS[key]) return buildCharacterGLB(key);
  const c = CHARS[key] || NPCS[key], L = c.look, S = CHAR_3D[key] || {};
  const elemCol = ELEMENTS[c.elem].color;
  const root = new THREE.Group();
  const mats = [];
  const T = (col, ex) => { const m = toon(col, ex); mats.push(m); return m; };
  const M = {
    skin: T(L.skin || '#ffe4d6'),
    hair: T(L.hair),
    outfit: T(L.outfit),
    outfit2: T(L.outfit, { side: THREE.DoubleSide }),
    legs: T(S.legs || '#1d1c2a'),
    accent: T(L.accent, { emissive: new THREE.Color(L.accent), emissiveIntensity: 0.25 }),
    dark: T('#1c1b28'),
  };
  const glow = glowMat(L.accent, 2.6);
  const P = (geo, mat, opts) => outlined(geo, mat, opts);

  const hips = new THREE.Group(); hips.position.y = HIP_Y; root.add(hips);

  // 胴体
  const body = P(lathe([[0.001, -0.02], [0.13, 0], [0.145, 0.1], [0.165, 0.26], [0.17, 0.34], [0.14, 0.44], [0.06, 0.5], [0.001, 0.51]]), M.outfit);
  body.scale.z = 0.74; hips.add(body);
  const belt = new THREE.Mesh(new THREE.TorusGeometry(0.143, 0.014, 8, 32), M.accent); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.74; belt.position.y = 0.06; hips.add(belt);
  const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.03), glow); gem.position.set(0, 0.3, 0.13); hips.add(gem);
  const collar = P(new THREE.CylinderGeometry(0.075, 0.1, 0.05, 20), M.accent, { thick: 0.0015 }); collar.position.y = 0.48; hips.add(collar);

  // 裾（コート／スカート）
  const hemLen = { jacket: 0.12, skirt: 0.26, coat: 0.46, dress: 0.52 }[S.hem] || 0.26;
  const flare = S.hem === 'coat' ? 0.27 : S.hem === 'dress' ? 0.3 : S.hem === 'skirt' ? 0.28 : 0.18;
  const open = S.hem === 'coat';
  const hemPts = [[0.145, 0.02], [0.17, -0.06], [flare * 0.9, -hemLen * 0.7], [flare, -hemLen]].map(([r, y]) => new THREE.Vector2(r, y));
  const skirt = P(open ? new THREE.LatheGeometry(hemPts, 28, 0.55, Math.PI * 2 - 1.1) : new THREE.LatheGeometry(hemPts, 28), M.outfit2);
  skirt.scale.z = 0.8; hips.add(skirt);
  const trim = new THREE.Mesh(new THREE.TorusGeometry(flare, 0.01, 6, 40, open ? Math.PI * 2 - 1.1 : Math.PI * 2), glow);
  trim.rotation.set(Math.PI / 2, 0, open ? Math.PI / 2 + 0.55 : 0); trim.position.y = -hemLen; trim.scale.y = 0.8; hips.add(trim);
  if (open) {
    // コートの襟（ラペル）
    for (const sd of [-1, 1]) {
      const lp = P(new THREE.BoxGeometry(0.05, 0.3, 0.02), M.accent, { thick: 0.0015 });
      lp.position.set(sd * 0.06, 0.3, 0.125); lp.rotation.set(-0.15, 0, sd * 0.35); hips.add(lp);
    }
  }
  if (S.shirt) {
    const shM = T(S.shirt);
    const sh = P(new THREE.SphereGeometry(0.1, 16, 12), shM, { thick: 0.0012 });
    sh.scale.set(0.9, 1.5, 0.4); sh.position.set(0, 0.25, 0.1); hips.add(sh);
  }
  let scarfSegs = null;
  if (S.scarf) {
    const scM = T(S.scarf);
    const ring = P(new THREE.TorusGeometry(0.075, 0.03, 8, 20), scM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.49; hips.add(ring);
    const tail = new THREE.Group(); tail.position.set(0.05, 0.47, -0.08); hips.add(tail);
    scarfSegs = [];
    let parent = tail;
    for (let i = 0; i < 5; i++) {
      const g2 = new THREE.Group(); g2.position.y = i ? -0.09 : 0; parent.add(g2);
      const m = P(new THREE.BoxGeometry(0.07, 0.1, 0.015), scM, { thick: 0.0012 }); m.position.y = -0.045; g2.add(m);
      scarfSegs.push(g2); parent = g2;
    }
  }

  // 首・頭
  const neck = P(new THREE.CylinderGeometry(0.045, 0.05, 0.12, 12), M.skin); neck.position.y = 0.53; hips.add(neck);
  const headPivot = new THREE.Group(); headPivot.position.y = 0.54; headPivot.scale.setScalar(0.84); hips.add(headPivot);
  const headMat = toon('#ffffff', { map: faceTexture(L), emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 }, 0.18);
  mats.push(headMat);
  const head = P(new THREE.SphereGeometry(0.2, 48, 32), headMat, { oc: '#3a2426' });
  head.scale.set(1, 1.04, 0.96); head.position.y = 0.18; headPivot.add(head);
  // 表情のレイヤー（目・眉・口）
  const featMat = toon('#ffffff', { map: faceFeatureTex(key, L, false, null, { expr: 'neutral' }), transparent: true, depthWrite: false, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0 }, 0.18);
  mats.push(featMat);
  const feat = new THREE.Mesh(head.geometry, featMat); feat.scale.setScalar(1.004); feat.renderOrder = 1; feat.userData.face = true; head.add(feat);
  const face = new FaceRig(key, L, false, null, featMat);
  buildHair(headPivot, L, M.hair, glow, P);

  // 腕
  const arm = side => {
    const pv = new THREE.Group(); pv.position.set(0.2 * side, 0.43, 0); hips.add(pv);
    const sh = P(new THREE.SphereGeometry(0.062, 16, 12), M.outfit); pv.add(sh);
    const up = P(new THREE.CapsuleGeometry(0.05, 0.18, 4, 12), M.outfit); up.position.y = -0.13; pv.add(up);
    const el = new THREE.Group(); el.position.y = -0.26; pv.add(el);
    const fo = P(new THREE.CapsuleGeometry(0.042, 0.16, 4, 12), M.skin); fo.position.y = -0.1; el.add(fo);
    const cuff = new THREE.Mesh(new THREE.TorusGeometry(0.046, 0.01, 6, 16), M.accent); cuff.rotation.x = Math.PI / 2; cuff.position.y = -0.02; el.add(cuff);
    const hand = P(new THREE.SphereGeometry(0.046, 12, 10), M.skin); hand.position.y = -0.22; hand.scale.set(0.9, 1.1, 0.8); el.add(hand);
    const grip = new THREE.Group(); grip.position.y = -0.23; el.add(grip);
    return { pv, el, grip };
  };
  const armR = arm(-1), armL = arm(1);

  // 脚
  const leg = side => {
    const pv = new THREE.Group(); pv.position.set(0.085 * side, 0, 0); hips.add(pv);
    const th = P(new THREE.CapsuleGeometry(0.068, 0.36, 4, 12), M.legs); th.position.y = -0.24; pv.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.49; pv.add(kn);
    const sh = P(new THREE.CapsuleGeometry(0.055, 0.36, 4, 12), M.legs); sh.position.y = -0.23; kn.add(sh);
    const boot = P(new THREEX.RoundedBoxGeometry(0.11, 0.12, 0.21, 2, 0.035), M.dark); boot.position.set(0, -0.48, 0.03); kn.add(boot);
    const bt = new THREE.Mesh(new THREE.TorusGeometry(0.058, 0.009, 6, 16), M.accent); bt.rotation.x = Math.PI / 2; bt.position.y = -0.34; kn.add(bt);
    return { pv, kn };
  };
  const legR = leg(-1), legL = leg(1);

  const extras = buildWeapon(S.weapon, armR, armL, root, L, elemCol, P, M, glow);

  if (c.scale) root.scale.setScalar(c.scale);
  root.traverse(o => { if (o.isMesh && !o.userData.outline && !o.userData.face) o.castShadow = true; });

  const pose = {}; POSE_KEYS.forEach(k => pose[k] = 0);
  Object.assign(pose, POSES.idle);
  const model = {
    group: root, hips, headPivot, armR, armL, legR, legL, mats, pose, height: 1.85, radius: 0.45, key,
    style: S.style || 'melee', elemCol, idleAmp: 1, flashAmt: 0, flashCol: new THREE.Color(1, 1, 1), extras, face,
    setPose(p) { POSE_KEYS.forEach(k => pose[k] = p[k] || 0); },
    update(dt, t) {
      face.update(dt);
      const br = Math.sin(t * 2.2) * this.idleAmp;
      hips.position.y = HIP_Y + pose.hipsY + br * 0.008;
      hips.rotation.x = pose.lean; hips.rotation.y = pose.twist;
      headPivot.rotation.x = pose.headX + br * 0.02; headPivot.rotation.y = pose.headY;
      armR.pv.rotation.set(pose.armRx + br * 0.03, 0, pose.armRz); armL.pv.rotation.set(pose.armLx - br * 0.03, 0, pose.armLz);
      armR.el.rotation.x = pose.elbowR; armL.el.rotation.x = pose.elbowL;
      legR.pv.rotation.x = pose.legRx; legL.pv.rotation.x = pose.legLx;
      legR.kn.rotation.x = pose.kneeR; legL.kn.rotation.x = pose.kneeL;
      if (extras.update) extras.update(dt, t);
      if (scarfSegs) scarfSegs.forEach((g2, i) => { g2.rotation.x = 0.35 + (i ? 0.12 : 0.6) + Math.sin(t * 3 - i * 0.8) * 0.12 + pose.lean * 0.3; g2.rotation.z = Math.sin(t * 2.1 - i) * 0.08; });
      if (this.flashAmt > 0.001) {
        this.flashAmt *= Math.pow(0.004, dt);
        for (const m of mats) { m.emissive.copy(this.flashCol); m.emissiveIntensity = this.flashAmt; }
      } else if (this.flashAmt !== 0) {
        this.flashAmt = 0;
        for (const m of mats) { m.emissive.set(m === M.accent ? L.accent : '#ffffff'); m.emissiveIntensity = m === M.accent ? 0.25 : 0; }
      }
    },
    flash(col = '#ffffff', amt = 1) { this.flashCol.set(col); this.flashAmt = amt; },
    handPos() { return armR.grip.getWorldPosition(V3()); },
    tipPos() { return (extras.tip || armR.grip).getWorldPosition(V3()); },
  };
  return model;
}

// ============================================================
//  Blender製キャラクター（tools/blender/ で作成 → assets/models/<key>.js に GLB を埋め込み）
// ============================================================
const GLB_CHARS = {};
function preloadCharModels() {
  const src = window.GLB_MODELS || {};
  const loader = new THREEX.GLTFLoader();
  return Promise.all(Object.entries(src).map(([key, b64]) => {
    const bin = Uint8Array.from(atob(b64), ch => ch.charCodeAt(0)).buffer;
    return loader.parseAsync(bin, '').then(g => { GLB_CHARS[key] = g.scene; }).catch(e => console.warn('GLB model', key, e));
  }));
}

// スキンメッシュ用のアウトライン（反転ハル）
const SkinOutlineCache = {};
function skinOutlineMat(color, thick) {
  const k = color + thick; if (SkinOutlineCache[k]) return SkinOutlineCache[k];
  return (SkinOutlineCache[k] = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) }, thickness: { value: thick } },
    vertexShader: `#include <common>
      #include <skinning_pars_vertex>
      uniform float thickness;
      void main(){
        #include <skinbase_vertex>
        #include <beginnormal_vertex>
        #include <skinnormal_vertex>
        #include <begin_vertex>
        #include <skinning_vertex>
        vec4 mv = modelViewMatrix * vec4(transformed, 1.0); vec3 n = normalize(normalMatrix * objectNormal);
        mv.xyz += n * thickness * max(1.0, -mv.z); gl_Position = projectionMatrix * mv; }`,
    fragmentShader: 'uniform vec3 color; void main(){ gl_FragColor = vec4(color,1.0); }',
    side: THREE.BackSide,
  }));
}

// セル調（2階調）：影を黒ではなく素材ごとの色味で落とす。頂点カラー（Blenderで焼いたAO）を乗算
const CEL_LIGHT_CHUNK = `uniform vec3 shadowTint;
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
  float d = dot( normal, lightDirection );
  float w = fwidth( d ) * 1.5 + 0.015;
  return mix( shadowTint, vec3( 1.0 ), smoothstep( 0.03 - w, 0.03 + w, d ) );
}`;
function celMat(color, { shadow = '#8f93c4', map = null, emissive = '#000000', emissiveIntensity = 0, vc = false, face = 0 } = {}) {
  const m = new THREE.MeshToonMaterial({ color, map, vertexColors: vc, emissive, emissiveIntensity });
  const tint = new THREE.Color(shadow);
  m.onBeforeCompile = sh => {
    sh.uniforms.shadowTint = { value: tint };
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <gradientmap_pars_fragment>', CEL_LIGHT_CHUNK)
      .replace('#include <emissivemap_fragment>', RIM_CHUNK + (face ? `\n totalEmissiveRadiance += diffuseColor.rgb * ${face.toFixed(2)};` : ''));
  };
  m.customProgramCacheKey = () => 'cel' + face;
  m.userData.e0 = m.emissive.clone(); m.userData.ei0 = m.emissiveIntensity;
  return m;
}
// 素材ごとの影色・輪郭線（Blender のマテリアル名で引く）
const CEL_STYLE = {
  skin: { shadow: '#f0b9b4', oc: '#7a4a48', thick: 0.0014 },
  face: { shadow: '#f0b9b4', oc: '#5a3434', thick: 0.0013 },
  hair: { shadow: '#a9a7cf', thick: 0.0015 },
  shirt: { shadow: '#aeb2d8' },
  accent: { shadow: '#b8875a', outline: false, emissive: 0.12 },
  scarf: { shadow: '#c9905e', thick: 0.0015 },
  metal: { shadow: '#9ea3c4', thick: 0.0014 },
  outfit: { shadow: '#7d82bd' }, outfit_dark: { shadow: '#7d82bd' }, legs: { shadow: '#7d82bd' }, dark: { shadow: '#8a8ab0' }, glove: { shadow: '#8a8ab0' },
  skirt: { shadow: '#7d82bd' }, ribbon: { shadow: '#8a9ad8', thick: 0.0014 },
  ice: { outline: false },
};

// HSR 風の顔（正距円筒：u=0.25 が正面）。2048×1024 に 512×256 の座標で描く
const faceOptHQ = opt => ({ scale: 1.3, gap: 28.5, ey: 130, eye2: null, lash: 1, brow: 1, mouthW: 5.5, blush: 0.28, ...(opt || {}) });
// 土台：肌・頬の赤み・鼻
function faceTextureHQ(L, opt = {}) {
  const o = faceOptHQ(opt);
  const S = 4, c = document.createElement('canvas'); c.width = 512 * S; c.height = 256 * S;
  const g = c.getContext('2d'); g.scale(S, S);
  g.fillStyle = L.skin || '#ffe7dc'; g.fillRect(0, 0, 512, 256);
  const cx = 128, ey = o.ey;
  for (const s of [-1, 1]) {
    const ex = cx + s * o.gap;
    const bg = g.createRadialGradient(ex + s * 3, ey + 19, 0, ex + s * 3, ey + 19, 10);
    bg.addColorStop(0, `rgba(255,140,150,${o.blush})`); bg.addColorStop(1, 'rgba(255,140,150,0)');
    g.fillStyle = bg; g.beginPath(); g.ellipse(ex + s * 3, ey + 19, 11, 6, 0, 0, Math.PI * 2); g.fill();
  }
  g.strokeStyle = 'rgba(190,120,110,.55)'; g.lineWidth = 0.9; g.lineCap = 'round';
  g.beginPath(); g.moveTo(cx + 1.5, ey + 18); g.lineTo(cx + 0.5, ey + 21); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; t.flipY = false;
  return t;
}
// 表情のレイヤー：目・眉・口
function drawFeaturesHQ(g, L, o, st) {
  const E = FACE_EXPR[st.expr] || {};
  const hex = col => '#' + col.getHexString();
  const eye = new THREE.Color(L.eye), deep = hex(eye.clone().multiplyScalar(0.28)), mid = hex(eye.clone().multiplyScalar(0.7));
  const light = o.eye2 || hex(eye.clone().lerp(new THREE.Color('#fff6d8'), 0.5)), lash = '#2b1a20';
  const brow = hex(new THREE.Color(L.hair).multiplyScalar(0.55).lerp(new THREE.Color('#3a2a30'), 0.35));
  const cx = 128, ey = o.ey;
  for (const s of [-1, 1]) {
    const ex = cx + s * o.gap, sc = o.scale * (E.scale || 1);
    g.save(); g.translate(ex, ey); g.scale(sc, sc); g.translate(-ex, -ey);   // 目は大きめに
    const inX = ex - s * 11.5, outX = ex + s * 12.5, inY = ey + 3, outY = ey - 1;
    const li = (E.lidIn || 0) * 1.5, lo = (E.lidOut || 0) * 1.5, low = (E.low || 0) * 1.4;
    const top = () => { g.moveTo(inX, inY); g.bezierCurveTo(ex - s * 7, ey - 13 + li, ex + s * 7, ey - 14 + lo, outX, outY + lo * 0.2); };
    const bot = () => { g.bezierCurveTo(ex + s * 8, ey + 13 - low, ex - s * 6, ey + 13 - low, inX, inY); };
    g.strokeStyle = lash; g.fillStyle = lash; g.lineCap = 'round';
    if (E.arc) {   // 笑って閉じた目
      g.lineWidth = 2.2; g.beginPath(); g.moveTo(inX, inY + 2); g.quadraticCurveTo(ex, ey - 10, outX + s, outY + 3); g.stroke();
    } else if (st.closed || E.squint) {   // まばたき・ぎゅっと閉じた目
      g.lineWidth = 2; g.beginPath(); g.moveTo(inX, inY); g.quadraticCurveTo(ex, ey + (E.squint ? 2 : 6), outX + s * 1.5, outY + 0.5); g.stroke();
      g.lineWidth = 1.2; g.beginPath(); g.moveTo(outX + s * 1, outY + 0.5); g.lineTo(outX + s * 4, outY - 2); g.stroke();
    } else {
      // 白目
      g.save(); g.beginPath(); top(); bot(); g.closePath();
      const sg = g.createLinearGradient(0, ey - 13, 0, ey + 12); sg.addColorStop(0, '#c8cbe6'); sg.addColorStop(0.45, '#fbfbff'); sg.addColorStop(1, '#ffffff');
      g.fillStyle = sg; g.fill(); g.clip();
      // 虹彩
      const ir = E.iris || 1, ix = ex + s * 0.5, iy = ey + 1.5;
      const ig = g.createLinearGradient(0, iy - 12, 0, iy + 12);
      ig.addColorStop(0, deep); ig.addColorStop(0.45, mid); ig.addColorStop(0.8, L.eye); ig.addColorStop(1, light);
      g.fillStyle = ig; g.beginPath(); g.ellipse(ix, iy, 8.6 * ir, 11.5 * ir, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = deep; g.lineWidth = 0.9; g.stroke();
      g.fillStyle = 'rgba(255,245,210,.45)'; g.beginPath(); g.ellipse(ix, iy + 6.5 * ir, 5.5 * ir, 3.2 * ir, 0, 0, Math.PI * 2); g.fill();
      g.strokeStyle = 'rgba(0,0,0,.18)'; g.lineWidth = 0.4;
      for (let k = 0; k < 12; k++) { const a = k / 12 * Math.PI * 2; g.beginPath(); g.moveTo(ix + Math.cos(a) * 3.5 * ir, iy + Math.sin(a) * 4.5 * ir); g.lineTo(ix + Math.cos(a) * 8 * ir, iy + Math.sin(a) * 10.5 * ir); g.stroke(); }
      // 瞳孔
      g.fillStyle = deep; g.beginPath(); g.ellipse(ix, iy + 0.5, 3.2 * ir, 5.2 * ir, 0, 0, Math.PI * 2); g.fill();
      // まぶたの影
      const lg = g.createLinearGradient(0, ey - 13 + Math.min(li, lo), 0, ey - 2 + Math.min(li, lo)); lg.addColorStop(0, 'rgba(40,20,50,.55)'); lg.addColorStop(1, 'rgba(40,20,50,0)');
      g.fillStyle = lg; g.fillRect(ex - 16, ey - 16, 32, 15 + Math.max(li, lo));
      // ハイライト
      g.fillStyle = '#ffffff';
      g.beginPath(); g.ellipse(ix - 3, iy - 5, 2.8, 3.6, -0.3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(ix + 3.4, iy + 5.2, 1.3, 1.1, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,.7)'; g.beginPath(); g.arc(ix + 4, iy - 3, 0.9, 0, Math.PI * 2); g.fill();
      g.restore();
      // 上まぶたのライン（目尻で太く跳ねる）
      g.fillStyle = lash; g.beginPath(); g.moveTo(inX - s * 0.5, inY + 0.5);
      g.bezierCurveTo(ex - s * 7, ey - 14.5 + li, ex + s * 7, ey - 15.5 + lo, outX + s * 1.5, outY - 0.5 + lo * 0.2);
      g.lineTo(outX + s * 4.5, outY - 3.2 + lo * 0.2); g.lineTo(outX + s * 2.2, outY + 1.5 + lo * 0.2);
      g.bezierCurveTo(ex + s * 7, ey - 11.5 - (o.lash - 1) * 2 + lo, ex - s * 7, ey - 11 - (o.lash - 1) * 1.5 + li, inX + s * 0.5, inY + 0.5); g.closePath(); g.fill();
      if (o.lash > 1) {  // 目尻のまつ毛の跳ね
        g.strokeStyle = lash;
        [[3, -8.5, 7, -13, 1.1], [7, -6, 11.5, -9, 1.0], [10, -3, 14.5, -4.5, 0.9]].forEach(([x0, y0, x1, y1, w]) => {
          g.lineWidth = w * o.lash * 0.8; g.beginPath(); g.moveTo(ex + s * x0, ey + y0 + lo * 0.6); g.quadraticCurveTo(ex + s * (x0 + x1) / 2, ey + y1 + 1 + lo * 0.6, ex + s * x1, ey + y1 + lo * 0.6); g.stroke();
        });
      }
      // 二重のライン
      g.strokeStyle = 'rgba(120,70,70,.55)'; g.lineWidth = 0.7;
      g.beginPath(); g.moveTo(ex - s * 3, ey - 16.5 + (li + lo) * 0.5); g.quadraticCurveTo(ex + s * 7, ey - 18 + lo * 0.8, outX + s * 1, outY - 5 + lo * 0.5); g.stroke();
      // 下まつ毛
      g.strokeStyle = 'rgba(80,40,45,.7)'; g.lineWidth = 0.8 * Math.max(1, o.lash * 0.8);
      g.beginPath(); g.moveTo(ex + s * 2, ey + 10.5 - low); g.quadraticCurveTo(ex + s * 8, ey + 9.5 - low, outX + s * 0.5, outY + 3 - low * 0.5); g.stroke();
    }
    g.restore();
    // 眉（表情で上下・傾き）
    const bx = ex + s * 2, by = ey - 28;
    g.save(); g.translate(bx, by + (E.browY || 0)); g.rotate(s * (E.tilt || 0)); g.translate(-bx, -by);
    g.fillStyle = brow; g.beginPath();
    g.moveTo(ex - s * 12, ey - 25); g.quadraticCurveTo(ex + s * 2, ey - 31, ex + s * 16, ey - 27);
    g.quadraticCurveTo(ex + s * 2, ey - 31 + 2.2 * o.brow, ex - s * 12, ey - 25 + 2 * o.brow); g.closePath(); g.fill();
    g.restore();
    if (E.blush) {
      const bg = g.createRadialGradient(ex + s * 3, ey + 19, 0, ex + s * 3, ey + 19, 11);
      bg.addColorStop(0, `rgba(255,110,130,${E.blush})`); bg.addColorStop(1, 'rgba(255,110,130,0)');
      g.fillStyle = bg; g.beginPath(); g.ellipse(ex + s * 3, ey + 19, 12, 6.5, 0, 0, Math.PI * 2); g.fill();
    }
  }
  drawMouth(g, cx, ey + 31.5, o.mouthW, E.mouth, st.mouth, 1);
  if (!st.mouth && (!E.mouth || E.mouth === 'line' || E.mouth === 'smile')) {   // 下唇の影
    g.strokeStyle = 'rgba(200,120,120,.35)'; g.lineWidth = 0.8;
    g.beginPath(); g.moveTo(cx - 2.5, ey + 35); g.quadraticCurveTo(cx, ey + 35.8, cx + 2.5, ey + 35); g.stroke();
  }
}

// 表情レイヤーのテクスチャ：顔の周りだけを小さなキャンバスに描き、UV のずらしで顔に重ねる
const FACE_TEX = {};
function faceFeatureTex(key, L, hq, opt, st) {
  const id = `${key}|${st.expr}|${st.closed ? 1 : 0}|${st.mouth ? 1 : 0}`;
  if (FACE_TEX[id]) return FACE_TEX[id];
  const o = hq ? faceOptHQ(opt) : null;
  const R = hq ? { x0: 56, y0: o.ey - 46, w: 144, h: 92, S: 4 } : { x0: 70, y0: 91, w: 116, h: 104, S: 2 };
  const c = document.createElement('canvas'); c.width = R.w * R.S; c.height = R.h * R.S;
  const g = c.getContext('2d'); g.scale(R.S, R.S); g.translate(-R.x0, -R.y0);
  if (hq) drawFeaturesHQ(g, L, o, st); else drawFeaturesLQ(g, L, st);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(512 / R.w, 256 / R.h);
  if (hq) { t.flipY = false; t.offset.set(-R.x0 / R.w, -R.y0 / R.h); }
  else t.offset.set(-R.x0 / R.w, (R.y0 + R.h - 256) / R.h);
  return (FACE_TEX[id] = t);
}
// 表情・まばたき・口パクの制御
class FaceRig {
  constructor(key, L, hq, opt, mat) {
    Object.assign(this, { key, L, hq, opt, mat, expr: 'neutral', closed: false, mouth: false, talking: false, blinkT: 1 + Math.random() * 3, mouthT: 0 });
    this.apply();
  }
  set(expr) { if (expr && FACE_EXPR[expr] && expr !== this.expr) { this.expr = expr; this.apply(); } }
  apply() { const t = faceFeatureTex(this.key, this.L, this.hq, this.opt, this); if (this.mat.map !== t) this.mat.map = t; }
  update(dt) {
    if (!dt) return;
    let ch = false;
    if ((this.blinkT -= dt) <= 0) { this.closed = !this.closed; this.blinkT = this.closed ? 0.11 : 1.8 + Math.random() * 3.6; ch = true; }
    if (this.talking) { if ((this.mouthT -= dt) <= 0) { this.mouth = !this.mouth; this.mouthT = this.mouth ? 0.07 + Math.random() * 0.1 : 0.05 + Math.random() * 0.08; ch = true; } }
    else if (this.mouth) { this.mouth = false; ch = true; }
    if (ch) this.apply();
  }
}

// Blender側は腕を ARM_REST だけ開いた A ポーズ（tools/blender/build_aster.py と一致させる）
const GLB_ARM_REST = 0.2;
// ボーン → ポーズの関節（プロシージャルモデルのグループに相当）
const GLB_BONES = [
  ['hips', 'hips'], ['spine', 'hips'], ['chest', 'hips'], ['neck', 'hips'], ['head', 'head'],
  ['upper_armL', 'armL', 1], ['forearmL', 'elL', 1], ['handL', 'elL', 1],
  ['upper_armR', 'armR', -1], ['forearmR', 'elR', -1], ['handR', 'elR', -1],
  ['thighL', 'legL'], ['shinL', 'knL'], ['footL', 'knL'],
  ['thighR', 'legR'], ['shinR', 'knR'], ['footR', 'knR'],
  ['scarf0', 'sc0'], ['scarf1', 'sc1'], ['scarf2', 'sc2'], ['scarf3', 'sc3'],
];

function buildCharacterGLB(key) {
  const c = CHARS[key] || NPCS[key], L = c.look, S = CHAR_3D[key] || {};
  const elemCol = ELEMENTS[c.elem].color;
  const root = new THREE.Group();
  const scn = THREEX.SkeletonUtils.clone(GLB_CHARS[key]); root.add(scn);
  const mats = [];
  const glow = glowMat(L.accent, 2.6);

  // マテリアル：Blender のマテリアル名（役割）と色からセル調材質に置き換える
  const byName = {};
  const matFor = (src, vc) => {
    const k = src.name + (vc ? ':vc' : '');
    if (byName[k]) return byName[k];
    const col = src.color.clone(), hex = '#' + col.getHexString(), st = CEL_STYLE[src.name] || {};
    let m, oc = st.oc || '#' + col.clone().multiplyScalar(0.2).getHexString(), thick = st.thick || 0.0018, outline = st.outline !== false;
    if (src.name === 'glow') { m = glowMat(hex, 2.6); outline = false; }
    else if (src.name === 'ice') {
      m = new THREE.MeshStandardMaterial({ color: hex, metalness: 0.25, roughness: 0.12, transparent: true, opacity: 0.86, emissive: '#3aa8e0', emissiveIntensity: 0.35, vertexColors: vc });
      m.userData.e0 = m.emissive.clone(); m.userData.ei0 = m.emissiveIntensity; mats.push(m);
    }
    else {
      const face = src.name === 'face';
      m = celMat(face ? '#ffffff' : hex, {
        shadow: st.shadow, vc, map: face ? faceTextureHQ(L, S.face) : null, face: face ? 0.12 : 0,
        emissive: st.emissive ? hex : '#000000', emissiveIntensity: st.emissive || 0,
      });
      mats.push(m);
    }
    return (byName[k] = { m, oc, thick, outline });
  };
  const meshes = []; scn.traverse(o => { if (o.isMesh) meshes.push(o); });
  for (const o of meshes) {
    const info = matFor(o.material, !!o.geometry.attributes.color && o.material.name !== 'face');
    o.material = info.m; o.castShadow = true; o.frustumCulled = false;
    if (info.outline && o.isSkinnedMesh) {
      const ol = new THREE.SkinnedMesh(o.geometry, skinOutlineMat(info.oc, info.thick));
      ol.bind(o.skeleton, o.bindMatrix); ol.userData.outline = true; ol.frustumCulled = false;
      o.add(ol);
    } else if (info.outline) {
      const ol = new THREE.Mesh(o.geometry, outlineMat(info.oc, info.thick)); ol.userData.outline = true; o.add(ol);
    }
  }
  // 表情のレイヤー（目・眉・口）を顔のメッシュに重ねる
  let face = null;
  const faceMesh = byName.face && meshes.find(o => o.material === byName.face.m);
  if (faceMesh) {
    const fm = celMat('#ffffff', { shadow: CEL_STYLE.face.shadow, map: faceFeatureTex(key, L, true, S.face, { expr: 'neutral' }), face: 0.12 });
    Object.assign(fm, { transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    mats.push(fm);
    const ov = faceMesh.isSkinnedMesh ? new THREE.SkinnedMesh(faceMesh.geometry, fm) : new THREE.Mesh(faceMesh.geometry, fm);
    if (faceMesh.isSkinnedMesh) ov.bind(faceMesh.skeleton, faceMesh.bindMatrix);
    ov.frustumCulled = false; ov.renderOrder = 1; ov.userData.face = true; faceMesh.add(ov);
    face = new FaceRig(key, L, true, S.face, fm);
  }
  const M = { accent: matFor({ name: 'accent', color: new THREE.Color(L.accent) }).m, dark: matFor({ name: 'dark', color: new THREE.Color('#1c1b28') }).m };
  // Blender で作った武器（"Weapon" オブジェクト）は手に持たせる。ローカル +Y が柄→先端
  const weapon = scn.getObjectByName('Weapon'), shield = scn.getObjectByName('Shield');
  if (weapon) weapon.removeFromParent();
  if (shield) shield.removeFromParent();
  const bbox = new THREE.Box3().setFromObject(scn);

  // ボーンの静止姿勢（root 基準）
  scn.updateMatrixWorld(true);
  const bones = {}; scn.traverse(o => { if (o.isBone) bones[o.name] = o; });
  // 骨に付いていない飾り（マフラーの巻き・背中のリボン）は胸・首の骨に付け、しゃがむ・お辞儀するなどの動きに追従させる
  [...scn.children].forEach(c => {
    let skinned = c.isBone; c.traverse(o => { if (o.isSkinnedMesh || o.isBone) skinned = true; });
    const b = bones.neck || bones.chest || bones.spine;
    if (!skinned && b && c !== weapon && c !== shield) b.attach(c);
  });
  const rig = bones.hips.parent, rigQ = rig.getWorldQuaternion(new THREE.Quaternion());
  const armC = s => new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), GLB_ARM_REST * s);
  const rigs = GLB_BONES.filter(([n]) => bones[n]).map(([n, src, side]) => {
    const b = bones[n], restW = b.getWorldQuaternion(new THREE.Quaternion());
    const K = side ? armC(side).invert().multiply(restW) : restW;
    return { b, src, K, target: new THREE.Quaternion(), parent: null };
  });
  const byBone = new Map(rigs.map(r => [r.b, r]));
  rigs.forEach(r => { r.parent = byBone.get(r.b.parent) || null; });
  const hipsRest = bones.hips.position.clone(), rigQinv = rigQ.clone().invert();

  // 武器などを付けるための、プロシージャルモデルと同じ向きの取り付け点
  const socket = (boneName, side, along = 0) => {
    const b = bones[boneName], s = new THREE.Object3D();
    const restW = b.getWorldQuaternion(new THREE.Quaternion());
    s.quaternion.copy(restW.invert().multiply(armC(side)));
    if (along) {
      const w = b.getWorldPosition(V3()), dir = V3(Math.sin(GLB_ARM_REST) * side, -Math.cos(GLB_ARM_REST), 0);
      s.position.copy(b.worldToLocal(w.addScaledVector(dir, along)));
    }
    b.add(s); return s;
  };
  const armR = { pv: socket('upper_armR', -1), el: socket('forearmR', -1), grip: socket('handR', -1, 0.06) };
  const armL = { pv: socket('upper_armL', 1), el: socket('forearmL', 1), grip: socket('handL', 1, 0.06) };
  const headPivot = socket('head', 0);
  let extras;
  if (weapon) {
    const hold = new THREE.Group(); hold.rotation.x = Math.PI - 0.55; armR.grip.add(hold);
    weapon.position.set(0, 0, 0); weapon.quaternion.identity(); weapon.scale.setScalar(1); hold.add(weapon);
    const tip = new THREE.Object3D(); tip.position.y = 0.75; hold.add(tip);
    extras = { tip };
  } else if (shield) {
    // プロシージャルの盾と同じ取り付け：左前腕の外側、盾の表が外向き
    const hold = new THREE.Group(); hold.position.set(0.07, -0.12, 0.02); hold.rotation.set(0, Math.PI / 2, 0); armL.el.add(hold);
    shield.position.set(0, 0, 0); shield.quaternion.identity(); shield.scale.setScalar(1); hold.add(shield);
    const tip = new THREE.Object3D(); armR.grip.add(tip);
    extras = { tip, shield: hold };
  } else extras = buildWeapon(S.weapon, armR, armL, root, L, elemCol, (g, m, o) => outlined(g, m, o), M, glow);

  if (c.scale) root.scale.setScalar(c.scale);
  root.traverse(o => { if (o.isMesh && !o.userData.outline && !o.userData.face) o.castShadow = true; });

  // ポーズ → 関節ごとの回転（root 基準）
  const E = new THREE.Euler(), Q = {}, q = () => new THREE.Quaternion();
  ['hips', 'head', 'armL', 'elL', 'armR', 'elR', 'legL', 'knL', 'legR', 'knR', 'sc0', 'sc1', 'sc2', 'sc3'].forEach(k => Q[k] = q());
  const tmp = q();
  const rot = (out, parent, x, y, z) => out.copy(parent).multiply(tmp.setFromEuler(E.set(x, y, z)));

  const pose = {}; POSE_KEYS.forEach(k => pose[k] = 0);
  Object.assign(pose, POSES.idle);
  const model = {
    group: root, hips: bones.hips, headPivot, armR, armL, legR: null, legL: null, mats, pose, height: bbox.max.y * (c.scale || 1), radius: 0.45, key,
    style: S.style || 'melee', elemCol, idleAmp: 1, flashAmt: 0, flashCol: new THREE.Color(1, 1, 1), extras, face,
    setPose(p) { POSE_KEYS.forEach(k => pose[k] = p[k] || 0); },
    update(dt, t) {
      if (face) face.update(dt);
      const br = Math.sin(t * 2.2) * this.idleAmp;
      bones.hips.position.copy(hipsRest).add(V3(0, pose.hipsY + br * 0.008, 0).applyQuaternion(rigQinv));
      Q.hips.setFromEuler(E.set(pose.lean, pose.twist, 0));
      rot(Q.head, Q.hips, pose.headX + br * 0.02, pose.headY, 0);
      rot(Q.armR, Q.hips, pose.armRx + br * 0.03, 0, pose.armRz); rot(Q.elR, Q.armR, pose.elbowR, 0, 0);
      rot(Q.armL, Q.hips, pose.armLx - br * 0.03, 0, pose.armLz); rot(Q.elL, Q.armL, pose.elbowL, 0, 0);
      rot(Q.legR, Q.hips, pose.legRx, 0, 0); rot(Q.knR, Q.legR, pose.kneeR, 0, 0);
      rot(Q.legL, Q.hips, pose.legLx, 0, 0); rot(Q.knL, Q.legL, pose.kneeL, 0, 0);
      let prev = Q.hips;   // 垂れ物：揺れ＋体の傾きを打ち消して下へ垂らす
      for (let i = 0; i < 4; i++) {
        rot(Q['sc' + i], prev, (i ? 0.07 : 0.26) + Math.sin(t * 3 - i * 0.8) * 0.1 - pose.lean * (i ? 0 : 0.8), 0, Math.sin(t * 2.1 - i) * 0.06);
        prev = Q['sc' + i];
      }
      for (const r of rigs) {
        r.target.copy(Q[r.src]).multiply(r.K);
        r.b.quaternion.copy(r.parent ? r.parent.target : rigQ).invert().multiply(r.target);
      }
      if (extras.update) extras.update(dt, t);
      if (this.flashAmt > 0.001) {
        this.flashAmt *= Math.pow(0.004, dt);
        for (const m of mats) { m.emissive.copy(this.flashCol); m.emissiveIntensity = this.flashAmt; }
      } else if (this.flashAmt !== 0) {
        this.flashAmt = 0;
        for (const m of mats) { m.emissive.copy(m.userData.e0); m.emissiveIntensity = m.userData.ei0; }
      }
    },
    flash(col = '#ffffff', amt = 1) { this.flashCol.set(col); this.flashAmt = amt; },
    handPos() { return armR.grip.getWorldPosition(V3()); },
    tipPos() { return (extras.tip || armR.grip).getWorldPosition(V3()); },
  };
  model.update(0, 0);
  return model;
}

function buildHair(pivot, L, mat, glow, P) {
  const g = new THREE.Group(); g.position.y = 0.18; pivot.add(g);
  const capMat = mat.clone(); capMat.side = THREE.DoubleSide; capMat.onBeforeCompile = mat.onBeforeCompile; capMat.customProgramCacheKey = mat.customProgramCacheKey;
  const cap = P(new THREE.SphereGeometry(0.216, 40, 24, 0, Math.PI * 2, 0, Math.PI * 0.6), capMat);
  cap.rotation.x = -0.5; g.add(cap);
  // 天使の輪（ツヤ）
  const shine = new THREE.Mesh(new THREE.TorusGeometry(0.19, 0.012, 6, 48, Math.PI * 1.2), new THREE.MeshBasicMaterial({ color: new THREE.Color(L.hair).lerp(new THREE.Color('#ffffff'), 0.55), transparent: true, opacity: 0.8 }));
  shine.rotation.set(-Math.PI / 2 - 0.5, 0, -Math.PI * 0.1); shine.position.set(0, 0.105, 0.075); shine.scale.set(1.06, 1.06, 1); g.add(shine);
  // 前髪
  const bang = (phi, len, w = 0.055, tilt = 0.25, y = 0.1) => {
    const pv = new THREE.Group(); pv.rotation.y = phi; g.add(pv);
    const m = new THREE.Mesh(new THREE.ConeGeometry(w, len, 5), mat); m.castShadow = true;
    m.scale.z = 0.45; m.rotation.x = Math.PI - tilt; m.position.set(0, y - len * 0.42, 0.195 - Math.abs(phi) * 0.01);
    pv.add(m); return m;
  };
  [[0, 0.075], [0.2, 0.085], [-0.2, 0.085], [0.55, 0.1], [-0.55, 0.1], [0.88, 0.16], [-0.88, 0.16]].forEach(([p, l]) => bang(p, l, 0.06, 0.35, 0.115));
  bang(1.35, 0.3, 0.055, 0.05, 0.06); bang(-1.35, 0.3, 0.055, 0.05, 0.06);
  // 後ろ髪
  const style = L.style;
  if (style === 'long' || style === 'bob' || style === 'short' || style === 'spiky') {
    const len = { long: 0.75, bob: 0.3, short: 0.16, spiky: 0.22 }[style];
    const back = P(new THREE.CylinderGeometry(0.2, style === 'long' ? 0.24 : 0.19, len, 24, 1, true, Math.PI * 0.25, Math.PI * 1.5), mat.clone());
    back.material.side = THREE.DoubleSide;
    back.position.set(0, -len / 2 + 0.02, -0.02); back.scale.z = 0.85; g.add(back);
    for (let i = -2; i <= 2; i++) {
      const s = new THREE.Mesh(new THREE.ConeGeometry(0.07, len * 0.5, 5), mat); s.scale.z = 0.5;
      s.position.set(i * 0.08, -len + 0.02, -0.12 + Math.abs(i) * 0.03); s.rotation.x = Math.PI; g.add(s);
    }
  }
  if (style === 'spiky') {
    for (let i = 0; i < 7; i++) {
      const a = -1.2 + i * 0.4;
      const s = P(new THREE.ConeGeometry(0.06, 0.22, 5), mat);
      s.position.set(Math.sin(a) * 0.14, 0.14, Math.cos(a) * 0.06 - 0.08); s.rotation.set(-0.6, 0, -a * 0.6); g.add(s);
    }
  }
  if (style === 'twin') {
    for (const sd of [-1, 1]) {
      const tail = P(new THREE.ConeGeometry(0.1, 0.8, 8), mat);
      tail.position.set(sd * 0.25, -0.28, -0.05); tail.rotation.set(Math.PI, 0, sd * 0.25); g.add(tail);
      const rib = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), glow); rib.position.set(sd * 0.21, 0.08, -0.05); rib.scale.set(1.4, 0.8, 0.6); g.add(rib);
    }
    const back = P(new THREE.SphereGeometry(0.21, 24, 16, Math.PI / 2 + 1.2, Math.PI * 2 - 2.4), mat.clone()); back.material.side = THREE.DoubleSide; back.position.set(0, -0.04, -0.03); back.scale.set(1, 0.9, 0.9); g.add(back);
  }
  if (style === 'pony') {
    const b = P(new THREE.SphereGeometry(0.21, 24, 16, Math.PI / 2 + 1.2, Math.PI * 2 - 2.4), mat.clone()); b.material.side = THREE.DoubleSide; b.position.set(0, -0.03, -0.03); b.scale.set(1, 0.85, 0.92); g.add(b);
    let prev = V3(0, 0.1, -0.2);
    for (let i = 0; i < 4; i++) {
      const s = P(new THREE.SphereGeometry(0.085 - i * 0.012, 12, 10), mat);
      prev = V3(0, prev.y - 0.13, prev.z - 0.07 + i * 0.03); s.position.copy(prev); s.scale.y = 1.8; g.add(s);
    }
    const tie = new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.015, 6, 16), glow); tie.position.set(0, 0.07, -0.21); g.add(tie);
  }
  if (style === 'bob') {
    const b = P(new THREE.SphereGeometry(0.225, 32, 20, Math.PI / 2 + 0.95, Math.PI * 2 - 1.9, Math.PI * 0.2, Math.PI * 0.45), mat.clone());
    b.material.side = THREE.DoubleSide; b.rotation.x = -0.35; g.add(b);
  }
  // アクセサリー
  switch (L.acc) {
    case 'ahoge': { const a = P(new THREE.TorusGeometry(0.07, 0.012, 6, 16, Math.PI * 1.2), mat); a.position.set(0, 0.25, 0); a.rotation.set(0, Math.PI / 2, 0.4); g.add(a); break; }
    case 'halo': { const h = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.012, 8, 48), glow); h.position.set(0, 0.34, -0.05); h.rotation.x = Math.PI / 2 - 0.3; g.add(h); break; }
    case 'horn': for (const sd of [-1, 1]) { const h = P(new THREE.ConeGeometry(0.035, 0.18, 6), toon(L.accent)); h.position.set(sd * 0.12, 0.22, 0.02); h.rotation.set(-0.3, 0, -sd * 0.4); g.add(h); } break;
    case 'pin': { const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.04), glow); p.position.set(-0.15, 0.1, 0.12); g.add(p); break; }
    case 'star': { const p = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), glow); p.scale.set(1, 1, 0.4); p.position.set(0.16, 0.12, 0.08); g.add(p); break; }
    case 'butterfly': for (const sd of [-1, 1]) { const w = new THREE.Mesh(new THREE.CircleGeometry(0.06, 3), glowMat(L.accent, 2, { side: THREE.DoubleSide })); w.position.set(0.15 + sd * 0.04, 0.12, 0.05); w.rotation.set(0, 0.6, sd * 0.5); g.add(w); } break;
    case 'hat': {
      const hm = toon(L.outfit), gm = toon(L.accent, { emissive: new THREE.Color(L.accent), emissiveIntensity: 0.3 });
      const crown = P(new THREE.CylinderGeometry(0.2, 0.22, 0.14, 24), hm); crown.position.set(0, 0.2, -0.01); crown.rotation.x = -0.15; g.add(crown);
      const brim = P(new THREE.CylinderGeometry(0.24, 0.24, 0.015, 24, 1, false, -Math.PI / 2, Math.PI), gm); brim.position.set(0, 0.14, 0.03); brim.rotation.x = -0.15; g.add(brim);
      const badge = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), glow); badge.position.set(0, 0.22, 0.2); g.add(badge);
      break;
    }
    case 'phones': {
      for (const sd of [-1, 1]) { const p = P(new THREE.CylinderGeometry(0.06, 0.06, 0.05, 16), toon('#222')); p.rotation.z = Math.PI / 2; p.position.set(sd * 0.21, -0.02, 0); g.add(p);
        const l = new THREE.Mesh(new THREE.TorusGeometry(0.035, 0.008, 6, 16), glow); l.rotation.y = Math.PI / 2; l.position.set(sd * 0.24, -0.02, 0); g.add(l); }
      const band = P(new THREE.TorusGeometry(0.22, 0.012, 6, 32, Math.PI), toon('#222')); band.rotation.y = Math.PI / 2; band.position.y = 0.01; g.add(band); break;
    }
  }
}

function buildWeapon(type, armR, armL, root, L, elemCol, P, M, glow) {
  const ex = {};
  const eg = glowMat(elemCol, 3);
  const holdR = new THREE.Group(); holdR.rotation.x = Math.PI - 0.55; armR.grip.add(holdR);
  switch (type) {
    case 'bat': {
      const b = P(new THREE.CylinderGeometry(0.045, 0.022, 0.85, 12), toon('#c9c3b4')); b.position.y = 0.35; holdR.add(b);
      const s = new THREE.Mesh(new THREE.TorusGeometry(0.037, 0.008, 6, 16), glow); s.rotation.x = Math.PI / 2; s.position.y = 0.55; holdR.add(s);
      ex.tip = new THREE.Object3D(); ex.tip.position.y = 0.75; holdR.add(ex.tip); break;
    }
    case 'katana': {
      const bl = P(new THREE.BoxGeometry(0.03, 0.95, 0.008), toon('#dfe3f5')); bl.position.y = 0.55; holdR.add(bl);
      const ed = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.93, 0.01), eg); ed.position.set(0.017, 0.55, 0); holdR.add(ed);
      const gd = P(new THREE.CylinderGeometry(0.05, 0.05, 0.015, 12), M.accent); gd.position.y = 0.07; holdR.add(gd);
      const gr = P(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), M.dark); gr.position.y = -0.02; holdR.add(gr);
      ex.tip = new THREE.Object3D(); ex.tip.position.y = 1.0; holdR.add(ex.tip); break;
    }
    case 'scythe': {
      const sh = P(new THREE.CylinderGeometry(0.018, 0.018, 1.5, 8), M.dark); sh.position.y = 0.35; holdR.add(sh);
      const bl = new THREE.Mesh(new THREE.TorusGeometry(0.35, 0.03, 6, 24, Math.PI * 0.7), eg); bl.position.set(0.3, 1.05, 0); bl.rotation.z = Math.PI * 0.45; bl.scale.z = 0.3; holdR.add(bl);
      ex.tip = new THREE.Object3D(); ex.tip.position.y = 1.1; holdR.add(ex.tip); break;
    }
    case 'dagger': {
      for (const [arm, flip] of [[armR, 1], [armL, -1]]) {
        const h = new THREE.Group(); h.rotation.x = Math.PI - 0.55; arm.grip.add(h);
        const bl = P(new THREE.ConeGeometry(0.035, 0.38, 4), toon('#d8f5ea')); bl.position.y = 0.22; bl.scale.z = 0.3; h.add(bl);
        const ed = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.36, 4), eg); ed.position.y = 0.22; h.add(ed);
        if (flip === 1) { ex.tip = new THREE.Object3D(); ex.tip.position.y = 0.4; h.add(ex.tip); }
      }
      break;
    }
    case 'shield': {
      const sh = new THREE.Group(); armL.el.add(sh); sh.position.set(0.07, -0.12, 0.02); sh.rotation.set(0, Math.PI / 2, 0);
      const plate = P(new THREE.CylinderGeometry(0.3, 0.3, 0.035, 6), new THREE.MeshStandardMaterial({ color: '#bfe9ff', metalness: 0.3, roughness: 0.15, transparent: true, opacity: 0.85, emissive: '#3aa8e0', emissiveIntensity: 0.4 }));
      plate.rotation.x = Math.PI / 2; sh.add(plate);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.015, 6, 6), eg); sh.add(rim);
      ex.tip = new THREE.Object3D(); armR.grip.add(ex.tip); ex.shield = sh; break;
    }
    case 'staff': {
      const st = P(new THREE.CylinderGeometry(0.016, 0.02, 1.4, 8), toon('#f3e9cc')); st.position.y = 0.35; holdR.rotation.x = 0; holdR.add(st);
      const moon = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.02, 8, 24, Math.PI * 1.4), eg); moon.position.y = 1.12; moon.rotation.z = -0.9; holdR.add(moon);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 16, 12), glowMat('#ffffff', 3)); orb.position.y = 1.1; holdR.add(orb);
      ex.tip = orb; break;
    }
    case 'baton': {
      const b = P(new THREE.CylinderGeometry(0.01, 0.014, 0.45, 8), toon('#f5f5ff')); b.position.y = 0.2; holdR.add(b);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.05), eg); star.position.y = 0.45; holdR.add(star);
      ex.tip = star; break;
    }
    case 'orb': {
      const orbs = [];
      for (let i = 0; i < 3; i++) {
        const o = new THREE.Mesh(new THREE.IcosahedronGeometry(0.07, 1), eg); root.add(o); orbs.push(o);
        const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(elemCol, 1.5), blending: THREE.AdditiveBlending, depthWrite: false }));
        halo.scale.setScalar(0.4); o.add(halo);
      }
      const book = P(new THREEX.RoundedBoxGeometry(0.2, 0.26, 0.05, 2, 0.01), M.accent); armL.grip.add(book); book.rotation.set(0.3, 0, 0);
      ex.tip = orbs[0];
      ex.update = (dt, t) => orbs.forEach((o, i) => {
        const a = t * 1.6 + i * Math.PI * 2 / 3;
        o.position.set(Math.cos(a) * 0.55, 1.25 + Math.sin(t * 2 + i) * 0.1, Math.sin(a) * 0.35);
      });
      break;
    }
    case 'holo': {
      const panel = new THREE.Mesh(new THREE.PlaneGeometry(0.4, 0.26), new THREE.MeshBasicMaterial({ color: hdr(L.accent, 0.7), transparent: true, opacity: 0.45, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
      root.add(panel);
      const gun = P(new THREE.BoxGeometry(0.05, 0.22, 0.08), M.dark); gun.position.y = 0.08; holdR.add(gun);
      const sight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.04, 0.02), eg); sight.position.y = 0.2; holdR.add(sight);
      ex.tip = sight;
      ex.update = (dt, t) => { panel.position.set(0.42, 1.2 + Math.sin(t * 1.5) * 0.04, 0.25); panel.rotation.y = -0.6; };
      break;
    }
  }
  return ex;
}

// ============================================================
//  敵
// ============================================================
function buildEnemy(key) {
  const d = ENEMIES[key], col = d.color;
  const root = new THREE.Group();
  const inner = new THREE.Group(); root.add(inner);
  const mats = [];
  const armor = (c = '#1b1828') => { const m = new THREE.MeshStandardMaterial({ color: c, metalness: 0.65, roughness: 0.32, emissive: new THREE.Color(col), emissiveIntensity: 0.04 }); mats.push(m); return m; };
  const crystal = () => { const m = new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 1.3, metalness: 0.1, roughness: 0.15, transparent: true, opacity: 0.92 }); mats.push(m); return m; };
  const glow = glowMat(col, 4);
  const A = armor(), A2 = armor('#2a2538'), C = crystal();
  const P = (geo, mat, o) => outlined(geo, mat, { oc: '#05040a', thick: 0.0018, ...o });
  const add = (m, x, y, z, parent = inner) => { m.position.set(x, y, z); parent.add(m); return m; };
  const orbiters = [];
  const orbit = (n, r, y, size, speed = 1) => {
    for (let i = 0; i < n; i++) {
      const o = new THREE.Mesh(new THREE.OctahedronGeometry(size), C); o.scale.y = 1.8; inner.add(o);
      orbiters.push({ o, r, y, a: i * Math.PI * 2 / n, speed });
    }
  };
  const coreGlow = (y, z, s) => {
    const core = add(new THREE.Mesh(new THREE.SphereGeometry(s, 20, 16), glow), 0, y, z);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 2), blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(s * 8); core.add(sp);
    return core;
  };
  let height = 2, radius = 0.6, float = 0, scale = 1, update = null, emitFn = null;

  switch (d.shape) {
    case 'humanoid': case 'brute': {
      const big = d.shape === 'brute';
      for (const sd of [-1, 1]) {
        add(P(new THREE.CapsuleGeometry(0.09, 0.5, 4, 10), A2), sd * 0.14, 0.4, 0);
        add(P(new THREE.OctahedronGeometry(0.1), C), sd * 0.14, 0.72, 0.06).scale.set(1, 0.6, 1);
      }
      add(P(new THREEX.RoundedBoxGeometry(0.52, 0.62, 0.32, 3, 0.08), A), 0, 1.12, 0);
      add(P(new THREE.ConeGeometry(0.3, 0.3, 4), A2), 0, 0.8, 0).rotation.set(Math.PI, Math.PI / 4, 0);
      coreGlow(1.15, 0.17, 0.08);
      const head = add(P(new THREE.OctahedronGeometry(0.2), A), 0, 1.66, 0); head.scale.set(0.9, 1.35, 0.9);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.035, 0.03), glow), 0, 1.66, 0.15);
      for (const sd of [-1, 1]) {
        add(P(new THREE.SphereGeometry(0.13, 12, 10), A2), sd * 0.34, 1.36, 0).scale.set(1, 0.8, 1);
        const a = add(P(new THREE.CapsuleGeometry(0.07, 0.45, 4, 10), A2), sd * 0.38, 1.05, 0.05); a.rotation.z = sd * 0.2;
        if (big) add(P(new THREE.ConeGeometry(0.07, 0.35, 5), C), sd * 0.36, 1.58, -0.05).rotation.z = -sd * 0.4;
      }
      const blade = add(P(new THREE.BoxGeometry(0.06, big ? 0.9 : 1.0, 0.02), C), -0.5, 0.95, 0.3);
      blade.rotation.set(0.9, 0, 0.25);
      if (big) { const ax = add(P(new THREE.CylinderGeometry(0.28, 0.28, 0.04, 3), C), -0.52, 1.35, 0.55); ax.rotation.set(Math.PI / 2, 0, 0); }
      orbit(3, 0.65, 1.3, 0.06, 1.2);
      scale = big ? 1.22 : 1; height = 1.95; radius = 0.6;
      break;
    }
    case 'drone': {
      add(P(new THREE.SphereGeometry(0.42, 32, 24), A), 0, 0, 0);
      add(P(new THREE.CylinderGeometry(0.22, 0.22, 0.12, 24), A2), 0, 0, 0.36).rotation.x = Math.PI / 2;
      coreGlow(0, 0.44, 0.13);
      const rings = [0, 1].map(i => { const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.62 + i * 0.12, 0.018, 8, 64), glow), 0, 0, 0); return r; });
      for (const sd of [-1, 1]) {
        const arm = add(P(new THREE.BoxGeometry(0.5, 0.05, 0.1), A2), sd * 0.6, 0.15, 0);
        add(new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.01, 20), glowMat(col, 1.5, { transparent: true, opacity: 0.6 })), sd * 0.85, 0.2, 0);
        arm.rotation.z = sd * 0.15;
      }
      for (let i = 0; i < 3; i++) add(P(new THREE.ConeGeometry(0.04, 0.3, 5), C), (i - 1) * 0.18, -0.52, 0.05).rotation.x = Math.PI;
      inner.children.forEach(c => c.position.y += 1.5);
      update = (dt, t) => { rings[0].rotation.set(t * 1.3, t * 0.7, 0); rings[1].rotation.set(-t * 0.8, 0, t * 1.1); };
      float = 0.12; height = 2.1; radius = 0.8;
      break;
    }
    case 'beast': {
      const body = add(P(new THREE.SphereGeometry(0.5, 28, 20), A), 0, 0.85, -0.1); body.scale.set(0.95, 0.72, 1.45);
      const head = add(P(new THREE.SphereGeometry(0.3, 24, 18), A2), 0, 1.05, 0.72); head.scale.set(1, 0.85, 1.25);
      add(P(new THREE.ConeGeometry(0.18, 0.35, 6), A), 0, 0.95, 1.05).rotation.x = Math.PI / 2;
      for (const sd of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), glow), sd * 0.13, 1.12, 0.98);
      for (const [x, z] of [[-0.3, 0.45], [0.3, 0.45], [-0.3, -0.6], [0.3, -0.6]]) add(P(new THREE.CapsuleGeometry(0.09, 0.45, 4, 10), A2), x, 0.35, z);
      for (let i = 0; i < 6; i++) { const s = add(P(new THREE.ConeGeometry(0.09, 0.45 - Math.abs(i - 2) * 0.05, 5), C), 0, 1.3, 0.45 - i * 0.22); s.rotation.x = -0.35; }
      add(P(new THREE.ConeGeometry(0.1, 0.8, 6), A2), 0, 0.85, -1.05).rotation.x = -Math.PI / 2 - 0.4;
      coreGlow(0.85, 0.5, 0.07);
      height = 1.5; radius = 0.9; scale = 1.1;
      break;
    }
    case 'spirit': {
      coreGlow(1.3, 0, 0.2);
      const shell = add(new THREE.Mesh(new THREE.IcosahedronGeometry(0.45, 1), new THREE.MeshStandardMaterial({ color: col, emissive: new THREE.Color(col), emissiveIntensity: 0.9, transparent: true, opacity: 0.35, flatShading: true })), 0, 1.3, 0);
      mats.push(shell.material);
      for (const sd of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), glowMat('#ffffff', 4)), sd * 0.14, 1.42, 0.38);
      orbit(4, 0.7, 1.3, 0.07, 2);
      update = (dt, t) => { shell.rotation.y = t * 0.8; shell.scale.setScalar(1 + Math.sin(t * 6) * 0.05); };
      emitFn = (p, pos) => { for (let i = 0; i < 2; i++) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.5, pos.y + 1.0 + Math.random() * 0.4, pos.z + (Math.random() - 0.5) * 0.5), V3(0, 1.5 + Math.random(), 0), hdr(col, 1.3), { life: 0.6, size: 0.22, drag: 1 }); };
      float = 0.15; height = 2.0; radius = 0.7;
      break;
    }
    case 'wraith': {
      const cloak = add(P(new THREE.ConeGeometry(0.6, 1.8, 20, 1, true), A.clone()), 0, 1.2, 0);
      cloak.material.side = THREE.DoubleSide; mats.push(cloak.material);
      add(P(new THREE.SphereGeometry(0.24, 20, 16), A2), 0, 2.0, 0.02);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 16, 12), new THREE.MeshBasicMaterial({ color: '#000' })), 0, 1.97, 0.1);
      for (const sd of [-1, 1]) {
        add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), glowMat(col, 6)), sd * 0.08, 2.0, 0.27);
        const a = add(P(new THREE.CapsuleGeometry(0.05, 0.6, 4, 8), A2), sd * 0.55, 1.5, 0.2); a.rotation.z = sd * 0.9;
        add(P(new THREE.ConeGeometry(0.05, 0.3, 4), C), sd * 0.85, 1.25, 0.28).rotation.z = sd * 2.4;
      }
      coreGlow(1.5, 0.3, 0.1);
      emitFn = (p, pos) => { if (Math.random() < 0.5) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.3, pos.z + (Math.random() - 0.5) * 0.8), V3(0, 0.6, 0), hdr(col, 1.5), { life: 1.2, size: 0.3, drag: 0.5 }); };
      float = 0.18; height = 2.3; radius = 0.7;
      break;
    }
    case 'knight': {
      for (const sd of [-1, 1]) { add(P(new THREE.CapsuleGeometry(0.13, 0.7, 4, 10), A2), sd * 0.22, 0.55, 0); add(P(new THREEX.RoundedBoxGeometry(0.26, 0.14, 0.4, 2, 0.04), A), sd * 0.22, 0.07, 0.06); }
      add(P(new THREEX.RoundedBoxGeometry(0.8, 0.9, 0.45, 3, 0.12), A), 0, 1.5, 0);
      add(P(new THREE.CylinderGeometry(0.45, 0.3, 0.35, 8), A2), 0, 0.95, 0);
      coreGlow(1.55, 0.25, 0.13);
      add(P(new THREE.CylinderGeometry(0.2, 0.22, 0.4, 8), A), 0, 2.15, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.05), glow), 0, 2.15, 0.2);
      add(P(new THREE.ConeGeometry(0.06, 0.5, 4), C), 0, 2.55, -0.05);
      for (const sd of [-1, 1]) {
        add(P(new THREE.SphereGeometry(0.26, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2), A2), sd * 0.52, 1.85, 0);
        const a = add(P(new THREE.CapsuleGeometry(0.11, 0.6, 4, 10), A2), sd * 0.56, 1.35, 0.05); a.rotation.z = sd * 0.15;
      }
      const sw = add(P(new THREE.BoxGeometry(0.12, 1.9, 0.03), C), -0.75, 1.2, 0.45); sw.rotation.set(0.5, 0, 0.1);
      const sh = add(P(new THREE.CylinderGeometry(0.4, 0.4, 0.06, 6), A), 0.7, 1.3, 0.3); sh.rotation.set(Math.PI / 2, 0, 0.3);
      add(new THREE.Mesh(new THREE.TorusGeometry(0.4, 0.02, 6, 6), glow), 0.7, 1.3, 0.34);
      orbit(4, 1.0, 1.6, 0.08, 0.8);
      height = 2.7; radius = 0.95; scale = 1.15;
      break;
    }
    case 'golem': {
      for (const sd of [-1, 1]) add(P(new THREEX.RoundedBoxGeometry(0.4, 0.8, 0.45, 2, 0.08), A2), sd * 0.35, 0.4, 0);
      add(P(new THREEX.RoundedBoxGeometry(1.3, 1.1, 0.8, 3, 0.15), A), 0, 1.4, 0);
      coreGlow(1.45, 0.42, 0.2);
      add(P(new THREEX.RoundedBoxGeometry(0.45, 0.35, 0.4, 2, 0.06), A2), 0, 2.15, 0.1);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.06, 0.05), glow), 0, 2.17, 0.31);
      add(P(new THREEX.RoundedBoxGeometry(0.45, 1.0, 0.45, 2, 0.08), A2), 0.9, 1.35, 0);
      const can = add(P(new THREE.CylinderGeometry(0.2, 0.25, 1.1, 12), A), -0.95, 1.2, 0.25); can.rotation.x = Math.PI / 2.4;
      add(new THREE.Mesh(new THREE.CircleGeometry(0.16, 16), glow), -0.95, 0.98, 0.78).rotation.x = -0.3;
      for (let i = 0; i < 3; i++) add(P(new THREE.ConeGeometry(0.1, 0.4, 5), C), -0.4 + i * 0.4, 2.0, -0.35).rotation.x = -0.5;
      height = 2.5; radius = 1.1; scale = 1.25;
      break;
    }
    case 'boss': {
      const core = coreGlow(0, 0, 0.45);
      const shell = add(P(new THREE.IcosahedronGeometry(1.1, 0), A), 0, 0, 0);
      shell.material.flatShading = true;
      const spikes = new THREE.Group(); inner.add(spikes);
      const ico = new THREE.IcosahedronGeometry(1.1, 0).attributes.position;
      const seen = new Set();
      for (let i = 0; i < ico.count; i++) {
        const v = V3(ico.getX(i), ico.getY(i), ico.getZ(i)); const k = v.toArray().map(n => n.toFixed(2)).join();
        if (seen.has(k)) continue; seen.add(k);
        const s = P(new THREE.ConeGeometry(0.16, 0.9, 6), C); s.position.copy(v.clone().multiplyScalar(1.25));
        s.quaternion.setFromUnitVectors(V3(0, 1, 0), v.clone().normalize()); spikes.add(s);
      }
      const rings = [2.0, 2.5, 3.0].map((r, i) => { const m = add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.03, 8, 96), glow), 0, 0, 0); m.rotation.x = Math.PI / 2 + i * 0.4; return m; });
      inner.children.forEach(c => c.position.y += 3.2);
      update = (dt, t) => {
        shell.rotation.set(t * 0.2, t * 0.3, 0); spikes.rotation.copy(shell.rotation);
        rings.forEach((r, i) => { r.rotation.z = t * (0.3 + i * 0.2) * (i % 2 ? -1 : 1); r.rotation.y = Math.sin(t * 0.3 + i) * 0.4; });
        core.scale.setScalar(1 + Math.sin(t * 4) * 0.1);
      };
      float = 0.2; height = 5; radius = 2.2;
      break;
    }
    case 'empress': {
      const gown = add(P(new THREE.ConeGeometry(1.2, 2.8, 24, 1, true), A.clone()), 0, 1.4, 0); gown.material.side = THREE.DoubleSide; mats.push(gown.material);
      add(P(new THREE.CylinderGeometry(0.25, 0.35, 0.8, 16), A), 0, 3.0, 0);
      add(P(new THREE.SphereGeometry(0.26, 24, 18), toon('#dfe8f5')), 0, 3.65, 0.02);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.04, 0.05), glow), 0, 3.66, 0.24);
      for (let i = 0; i < 7; i++) { const a = (i - 3) * 0.32; const s = add(P(new THREE.ConeGeometry(0.05, 0.4 + (3 - Math.abs(i - 3)) * 0.1, 5), C), Math.sin(a) * 0.22, 4.0, Math.cos(a) * 0.05 - 0.05); s.rotation.z = -a * 0.8; }
      for (const sd of [-1, 1]) {
        for (let i = 0; i < 4; i++) { const w = add(P(new THREE.ConeGeometry(0.12, 1.6 - i * 0.25, 4), C), sd * (0.6 + i * 0.28), 3.3 + i * 0.12, -0.35); w.rotation.z = sd * (0.9 + i * 0.25); w.scale.z = 0.3; }
        const a = add(P(new THREE.CapsuleGeometry(0.07, 0.8, 4, 8), A2), sd * 0.45, 2.9, 0.1); a.rotation.z = sd * 0.5;
      }
      coreGlow(2.9, 0.3, 0.15);
      orbit(6, 1.8, 2.4, 0.12, 0.6);
      height = 4.3; radius = 1.5;
      break;
    }
    case 'dragon': {
      const segs = [];
      for (let i = 0; i < 26; i++) {
        const r = 0.42 * (1 - i / 32);
        const s = P(new THREE.SphereGeometry(r, 18, 14), i % 2 ? A : A2); inner.add(s); segs.push(s);
        if (i % 3 === 0 && i < 22) { const f = P(new THREE.ConeGeometry(0.1, 0.5 * (1 - i / 30), 4), C); f.position.y = r * 0.9; f.scale.z = 0.3; s.add(f); }
      }
      const head = new THREE.Group(); inner.add(head);
      const skull = P(new THREE.SphereGeometry(0.5, 24, 18), A); skull.scale.set(1, 0.75, 1.3); head.add(skull);
      const snout = P(new THREE.ConeGeometry(0.3, 0.8, 8), A2); snout.rotation.x = Math.PI / 2; snout.position.z = 0.7; head.add(snout);
      for (const sd of [-1, 1]) {
        const h = P(new THREE.ConeGeometry(0.07, 0.9, 6), C); h.position.set(sd * 0.25, 0.4, -0.3); h.rotation.set(-1.0, 0, sd * 0.3); head.add(h);
        const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 10, 8), glowMat(col, 6)); e.position.set(sd * 0.25, 0.12, 0.42); head.add(e);
        const w = new THREE.Mesh(new THREE.TorusGeometry(0.6, 0.01, 4, 24, Math.PI * 0.6), glow); w.position.set(sd * 0.2, -0.1, 0.9); w.rotation.set(0, sd * 1.2, Math.PI); head.add(w);
      }
      coreGlow(0, 0, 0.001);
      update = (dt, t) => {
        segs.forEach((s, i) => {
          const u = i / segs.length;
          s.position.set(Math.sin(u * 5 - t * 1.4) * 1.6 * u + Math.sin(t * 0.7) * 0.2, 2.6 + Math.sin(u * 7 - t * 1.8) * 0.6 * (0.3 + u) - u * 1.2, -u * 4.2);
        });
        head.position.set(Math.sin(t * 0.7) * 0.2, 3.1 + Math.sin(t * 1.8) * 0.15, 0.55);
        head.rotation.set(Math.sin(t * 1.3) * 0.1, Math.sin(t * 0.9) * 0.2, 0);
      };
      height = 4.2; radius = 1.8;
      break;
    }
    case 'deity': {
      const body = add(P(new THREE.ConeGeometry(0.9, 3.2, 20, 1, true), A.clone()), 0, 2.6, 0); body.material.side = THREE.DoubleSide; mats.push(body.material);
      add(P(new THREE.CylinderGeometry(0.3, 0.4, 1.0, 16), A), 0, 4.4, 0);
      add(P(new THREE.SphereGeometry(0.32, 24, 18), toon('#f5ecd0')), 0, 5.2, 0);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.05, 0.05), glow), 0, 5.22, 0.29);
      const halos = [1.4, 2.0, 2.7].map((r, i) => add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.035 - i * 0.008, 8, 128), glow), 0, 5.0, -0.6 - i * 0.2));
      for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const s = add(new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.5, 4), glow), Math.cos(a) * 2.35, 5.0 + Math.sin(a) * 2.35, -0.75); s.rotation.z = a - Math.PI / 2; }
      for (const sd of [-1, 1]) for (let i = 0; i < 5; i++) {
        const w = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 2.2 - i * 0.25), glowMat(col, 1.4, { transparent: true, opacity: 0.5, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })), sd * (0.9 + i * 0.4), 4.4 + i * 0.1, -0.3);
        w.rotation.z = sd * (0.5 + i * 0.25);
      }
      coreGlow(4.1, 0.4, 0.2);
      orbit(8, 3.2, 3.8, 0.15, 0.4);
      update = (dt, t) => halos.forEach((h, i) => { h.rotation.z = t * (0.15 + i * 0.1) * (i % 2 ? -1 : 1); });
      float = 0.25; height = 5.8; radius = 2.3;
      break;
    }
  }
  root.scale.setScalar(scale); root.userData.s0 = scale;
  root.traverse(o => { if (o.isMesh && !o.userData.outline) { o.castShadow = true; } });

  const model = {
    group: root, inner, mats, key, height: height * scale, radius: radius * scale, color: col, flashAmt: 0, flashCol: new THREE.Color(1, 1, 1),
    brokenAmt: 0, isBoss: !!d.boss,
    update(dt, t) {
      inner.position.y = float ? Math.sin(t * 1.8 + this.seed) * float : 0;
      for (const ob of orbiters) {
        const a = ob.a + t * ob.speed;
        ob.o.position.set(Math.cos(a) * ob.r, ob.y + Math.sin(t * 2 + ob.a) * 0.15 + (d.shape === 'drone' ? 1.5 : 0), Math.sin(a) * ob.r);
        ob.o.rotation.y = t * 2;
      }
      if (update) update(dt, t);
      // 撃破状態：傾いて暗くなる
      inner.rotation.x = -this.brokenAmt * 0.25;
      inner.rotation.z = this.brokenAmt * 0.08 * Math.sin(t * 7);
      if (this.flashAmt > 0.001) {
        this.flashAmt *= Math.pow(0.004, dt);
        for (const m of mats) { m.emissive.copy(this.flashCol); m.emissiveIntensity = this.flashAmt * 0.45; }
      } else if (this.flashAmt !== 0) {
        this.flashAmt = 0;
        for (const m of mats) { m.emissive.set(col); m.emissiveIntensity = m === C ? 1.3 : m.opacity < 1 ? 0.9 : 0.04; }
      }
    },
    emit: emitFn,
    flash(c = '#ffffff', amt = 1) { this.flashCol.set(c); this.flashAmt = amt; },
    seed: Math.random() * 10,
  };
  return model;
}
