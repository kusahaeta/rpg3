'use strict';
// ============================================================
//  2頭身のにゃんこ（とネズミ・イヌ）をコードで組み立てる
//  既存のポーズ（POSES）・表情（FaceRig）・武器の持ち方と同じ仕組みで動く。
//  頭が大きいので、腕を上げるポーズは頭の横へ逃がす。
//  座標：+Z が正面、+X がキャラクターの左手側。単位 m。
// ============================================================
const CAT = {
  HIP: 0.22,            // 腰の高さ
  HEAD: [0.36, 0.305, 0.315],   // 頭の半径（横・縦・奥）
  H: 0.98,              // モデルの高さ（目の高さ ≒ 0.88 × H）
  HIPK: 0.22 / 1.03,    // 人型用ポーズの腰の上下を縮める比
};

// 表情の追加（猫用）
Object.assign(FACE_EXPR, {
  sleepy: { lidIn: 5.5, lidOut: 5.5, mouth: 'line' },
  cry:    { tilt: 0.32, browY: 1, lidIn: 2, lidOut: 4, mouth: 'wavy', tears: true },
  smug:   { lidIn: 3.5, lidOut: 1, low: 1.5, mouth: 'smirk' },
  pout:   { tilt: -0.1, lidIn: 1.5, lidOut: 1, mouth: 'frown', blush: 0.5 },
});

// ---------- 毛並み（頭：正距円筒 512×256。u=0.25 が正面、v=0 が頭頂） ----------
function catHeadTex(L) {
  const S = GFX.eco ? 1 : 2, c = document.createElement('canvas'); c.width = 512 * S; c.height = 256 * S;   // 省エネは 512×256
  const g = c.getContext('2d'); g.scale(S, S);
  g.fillStyle = L.fur; g.fillRect(0, 0, 512, 256);
  const blob = (x, y, rx, ry, col, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
  const P = L.patches || [];
  switch (L.pattern) {
    case 'calico':   // 三毛：額の片側に茶、反対の耳まわりに黒、後頭部にも
      for (const [x, y, rx, ry, r] of [[96, 58, 34, 30, 0.4], [74, 84, 26, 22, 0.2], [112, 40, 26, 20, 0], [60, 110, 16, 16, 0]]) blob(x, y, rx, ry, P[0], r);
      for (const [x, y, rx, ry, r] of [[170, 52, 22, 22, -0.3], [186, 70, 16, 14, 0], [158, 40, 16, 12, 0]]) blob(x, y, rx, ry, P[1], r);
      for (const [x, y, rx, ry] of [[350, 60, 44, 34], [390, 90, 36, 28], [320, 96, 24, 20]]) blob(x, y, rx, ry, P[0]);
      for (const [x, y, rx, ry] of [[440, 110, 26, 22], [420, 136, 18, 16], [270, 128, 20, 16]]) blob(x, y, rx, ry, P[1]);
      break;
    case 'tabby': {  // 縞：額の M と頬の縞、頭の後ろの縞
      g.strokeStyle = P[0]; g.lineCap = 'round';
      g.lineWidth = 4; g.beginPath(); g.moveTo(112, 104); g.lineTo(118, 86); g.lineTo(128, 98); g.lineTo(138, 86); g.lineTo(144, 104); g.stroke();
      for (const [x, y] of [[84, 120], [80, 132], [172, 120], [176, 132]]) { g.lineWidth = 3; g.beginPath(); g.moveTo(x, y); g.lineTo(x + (x < 128 ? -20 : 20), y + 2); g.stroke(); }
      for (let i = 0; i < 7; i++) { g.lineWidth = 7; g.beginPath(); g.moveTo(250 + i * 30, 30); g.quadraticCurveTo(260 + i * 30, 90, 248 + i * 30, 150); g.stroke(); }
      for (let i = 0; i < 4; i++) { g.lineWidth = 5; g.beginPath(); g.moveTo(96 + i * 22, 20); g.lineTo(100 + i * 22, 60); g.stroke(); }
      break;
    }
    case 'tuxedo':   // はちわれ：鼻から下が白
      g.fillStyle = L.muzzle; g.beginPath(); g.moveTo(128, 100); g.lineTo(96, 256); g.lineTo(160, 256); g.closePath(); g.fill();
      blob(128, 170, 52, 40, L.muzzle);
      break;
    case 'point': {  // ポイント：鼻のまわりと耳がこい色
      g.globalAlpha = 0.5; blob(128, 162, 26, 18, P[0]); g.globalAlpha = 0.3; blob(128, 158, 36, 26, P[0]); g.globalAlpha = 1;
      break;
    }
    case 'spots':
      for (const [x, y, r] of [[80, 70, 16], [180, 64, 12], [330, 90, 26], [420, 60, 18], [270, 150, 14]]) blob(x, y, r, r * 0.85, P[0]);
      break;
  }
  // 口もと（マズル）と、あご
  if (L.muzzle && L.muzzle !== L.fur && L.pattern !== 'tuxedo') {
    blob(128, 160, 30, 20, L.muzzle); blob(128, 184, 36, 22, L.muzzle);
  }
  if (L.pattern === 'point') { g.globalAlpha = 0.55; blob(128, 158, 16, 11, P[0]); g.globalAlpha = 1; }
  // 毛のゆらぎ
  for (let i = 0; i < 900; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.035})`; g.fillRect(Math.random() * 512, Math.random() * 256, 1 + Math.random() * 3, 3 + Math.random() * 6); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
// 胴体（旋盤：u=0.5 が正面、v=0 が下）
function catBodyTex(L) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = L.fur; g.fillRect(0, 0, 256, 256);
  const blob = (x, y, rx, ry, col, rot = 0) => { g.fillStyle = col; g.beginPath(); g.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2); g.fill(); };
  const P = L.patches || [];
  if (L.pattern === 'calico') { blob(40, 90, 44, 50, P[0], 0.3); blob(220, 150, 40, 44, P[1]); blob(230, 60, 26, 26, P[0]); }
  if (L.pattern === 'tabby') { g.strokeStyle = P[0]; g.lineCap = 'round'; for (let i = 0; i < 9; i++) { if (i === 4) continue; g.lineWidth = 9; g.beginPath(); g.moveTo(i * 28 + 14, 20); g.quadraticCurveTo(i * 28 + 24, 110, i * 28 + 10, 220); g.stroke(); } }
  if (L.pattern === 'spots') for (const [x, y] of [[30, 80], [200, 120], [230, 50], [60, 180]]) blob(x, y, 18, 16, P[0]);
  const belly = L.belly || L.muzzle;
  if (belly && belly !== L.fur) blob(128, 150, 50, 100, belly);
  for (let i = 0; i < 500; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,0,0'},${Math.random() * 0.035})`; g.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 3 + Math.random() * 6); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

// ---------- 顔のパーツ（目・鼻・口・頬）。表情ごとにテクスチャを作ってキャッシュ ----------
function drawCatFeatures(g, L, st) {
  const E = FACE_EXPR[st.expr] || {}, cx = 128, ey = 132;
  const hex = col => '#' + col.getHexString();
  const lash = L.line || '#2b1c22';
  const sleepy = L.sleepy && !E.arc && !['surprise', 'angry', 'pained'].includes(st.expr);
  for (const s of [-1, 1]) {
    const ex = cx + s * 36;
    const eyeCol = s > 0 && L.eye2 ? L.eye2 : L.eye;
    const ec = new THREE.Color(eyeCol), deep = hex(ec.clone().multiplyScalar(0.3)), lite = hex(ec.clone().lerp(new THREE.Color('#fffbe8'), 0.55));
    const sc = (E.scale || 1) * (L.eyeScale || 1), rx = 15 * sc, ry = 19.5 * sc;
    let li = (E.lidIn || 0) * 2.2, lo = (E.lidOut || 0) * 2.2;
    if (sleepy) { li = Math.max(li, 15); lo = Math.max(lo, 15); }
    const low = (E.low || 0) * 1.8;
    g.lineCap = 'round'; g.lineJoin = 'round';
    if (E.arc) {   // 笑って閉じた目「^ ^」
      g.strokeStyle = lash; g.lineWidth = 4; g.beginPath(); g.moveTo(ex - rx, ey + 5); g.quadraticCurveTo(ex, ey - 16, ex + rx, ey + 5); g.stroke();
    } else if (st.closed || E.squint) {   // まばたき・ぎゅっ
      g.strokeStyle = lash; g.lineWidth = 3.6; g.beginPath();
      if (E.squint) { g.moveTo(ex - rx, ey - 6); g.lineTo(ex + s * 2, ey); g.lineTo(ex - rx, ey + 6); }
      else { g.moveTo(ex - rx, ey + 1); g.quadraticCurveTo(ex, ey + 9, ex + rx, ey + 1); }
      g.stroke();
    } else {
      // 目の形（上まぶたは目頭・目尻で下がる）
      const top = (y0 = 0) => { g.moveTo(ex - rx, ey + (s < 0 ? lo : li) * 0.3); g.bezierCurveTo(ex - rx * 0.7, ey - ry + (s < 0 ? lo : li), ex + rx * 0.7, ey - ry + (s < 0 ? li : lo), ex + rx, ey + (s < 0 ? li : lo) * 0.3); };
      g.save(); g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.clip();
      // まぶたで隠れる部分を除いた目
      g.beginPath(); top(); g.lineTo(ex + rx, ey + ry); g.lineTo(ex - rx, ey + ry); g.closePath();
      g.save(); g.clip();
      g.fillStyle = '#fbfaff'; g.fillRect(ex - rx, ey - ry, rx * 2, ry * 2);
      const ir = E.iris || 1;
      const gr = g.createLinearGradient(0, ey - ry, 0, ey + ry);
      gr.addColorStop(0, deep); gr.addColorStop(0.5, eyeCol); gr.addColorStop(1, lite);
      g.fillStyle = gr; g.beginPath(); g.ellipse(ex + s * 0.5, ey + 1, rx * 0.92 * ir, ry * 0.95 * ir, 0, 0, Math.PI * 2); g.fill();
      // 瞳孔：驚くと丸く大きく、怒ると細い縦長
      const slit = ['angry', 'serious', 'smug'].includes(st.expr) ? 0.28 : st.expr === 'surprise' ? 0.75 : 0.55;
      g.fillStyle = deep; g.beginPath(); g.ellipse(ex + s * 0.5, ey + 2, rx * slit * ir, ry * 0.68 * ir, 0, 0, Math.PI * 2); g.fill();
      // 下まぶた（にっこり）
      if (low) { g.fillStyle = L.fur; g.beginPath(); g.ellipse(ex, ey + ry + 6 - low, rx * 1.3, 12, 0, 0, Math.PI * 2); g.fill(); }
      // ハイライト
      g.fillStyle = '#ffffff'; g.beginPath(); g.ellipse(ex - s * 1 - 4.5, ey - 7, 5.2, 6.4, -0.3, 0, Math.PI * 2); g.fill();
      g.beginPath(); g.ellipse(ex + 5, ey + 8, 2.4, 2.2, 0, 0, Math.PI * 2); g.fill();
      g.restore(); g.restore();
      // ふち（上は太く）
      g.strokeStyle = lash; g.lineWidth = 1.4; g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2);
      g.save(); g.beginPath(); top(); g.lineTo(ex + rx, ey + ry); g.lineTo(ex - rx, ey + ry); g.closePath(); g.clip();
      g.beginPath(); g.ellipse(ex, ey, rx, ry, 0, 0, Math.PI * 2); g.stroke(); g.restore();
      g.lineWidth = 3.4; g.beginPath(); top(); g.stroke();
      // 目尻のまつげ
      g.lineWidth = 2.4; g.beginPath(); g.moveTo(ex + s * rx * 0.92, ey - ry * 0.35 + lo * 0.3); g.lineTo(ex + s * (rx + 5), ey - ry * 0.62 + lo * 0.3); g.stroke();
    }
    // 眉（猫なので短い毛の筋。表情があるときだけ）
    if (E.tilt || (E.browY && E.browY > 1)) {
      const bx = ex - s * 2, by = ey - ry - 8 + (E.browY || 0) * 0.8;
      g.save(); g.translate(bx, by); g.rotate(s * (E.tilt || 0) * 1.1);
      g.strokeStyle = hex(new THREE.Color(L.fur).multiplyScalar(0.45).lerp(new THREE.Color(lash), 0.5)); g.lineWidth = 3.2;
      g.beginPath(); g.moveTo(-8, 0); g.lineTo(8, 0); g.stroke(); g.restore();
    }
    // 頬の赤み
    const bl = E.blush != null ? E.blush : (L.blush ?? 0.32);
    if (bl > 0) { const bg = g.createRadialGradient(ex + s * 12, ey + 22, 0, ex + s * 12, ey + 22, 13); bg.addColorStop(0, `rgba(255,120,140,${bl})`); bg.addColorStop(1, 'rgba(255,120,140,0)'); g.fillStyle = bg; g.beginPath(); g.ellipse(ex + s * 12, ey + 22, 14, 8, 0, 0, Math.PI * 2); g.fill(); }
    // 涙
    if (E.tears) { g.fillStyle = 'rgba(140,210,255,.9)'; g.beginPath(); g.ellipse(ex + s * 6, ey + 24, 3.2, 6, 0, 0, Math.PI * 2); g.fill(); }
  }
  // 鼻（ピンクの逆三角）
  g.fillStyle = L.nose || '#f08aa0'; g.strokeStyle = 'rgba(120,50,60,.6)'; g.lineWidth = 0.8;
  g.beginPath(); g.moveTo(cx - 5, 151); g.quadraticCurveTo(cx, 149, cx + 5, 151); g.quadraticCurveTo(cx + 1, 157, cx, 157.5); g.quadraticCurveTo(cx - 1, 157, cx - 5, 151); g.fill(); g.stroke();
  // 口（ω）
  const my = 160, mk = E.mouth || 'cat';
  g.strokeStyle = lash; g.lineWidth = 1.7; g.lineCap = 'round';
  const omega = (w, up) => { g.beginPath(); g.moveTo(cx, my - 2); g.quadraticCurveTo(cx - w * 0.25, my + 4 + up, cx - w, my + up * 0.6); g.moveTo(cx, my - 2); g.quadraticCurveTo(cx + w * 0.25, my + 4 + up, cx + w, my + up * 0.6); g.stroke(); };
  g.beginPath(); g.moveTo(cx, 157.5); g.lineTo(cx, my - 2); g.stroke();
  if (st.mouth || mk === 'grin' || mk === 'o') {
    const big = mk === 'grin' || mk === 'o' ? 1.25 : 1, w = 7 * big, h = (mk === 'o' ? 9 : 8) * big;
    g.fillStyle = '#8a2c3a'; g.beginPath();
    if (mk === 'o') g.ellipse(cx, my + 5, w * 0.6, h * 0.6, 0, 0, Math.PI * 2);
    else { g.moveTo(cx - w, my + 1); g.quadraticCurveTo(cx, my + 3, cx + w, my + 1); g.quadraticCurveTo(cx, my + h + 3, cx - w, my + 1); }
    g.fill(); g.fillStyle = '#f07a8a'; g.beginPath(); g.ellipse(cx, my + h * 0.72, w * 0.5, h * 0.3, 0, 0, Math.PI * 2); g.fill();
    if (mk !== 'o') omega(8, 0);
  } else {
    switch (mk) {
      case 'smile': omega(9, -2); break;
      case 'frown': g.beginPath(); g.moveTo(cx - 8, my + 5); g.quadraticCurveTo(cx, my - 1, cx + 8, my + 5); g.stroke(); break;
      case 'wavy': g.beginPath(); g.moveTo(cx - 9, my + 3); g.bezierCurveTo(cx - 4, my - 2, cx + 2, my + 7, cx + 9, my + 2); g.stroke(); break;
      case 'line': omega(6, 1); break;
      case 'smirk': g.beginPath(); g.moveTo(cx - 7, my + 2); g.quadraticCurveTo(cx + 2, my + 5, cx + 9, my - 2); g.stroke(); break;
      case 'grit': g.beginPath(); g.moveTo(cx - 8, my + 2); g.lineTo(cx + 8, my + 2); g.stroke(); g.fillStyle = '#ffffff'; g.fillRect(cx - 6, my, 12, 2.4); break;
      default: omega(7.5, 0);
    }
  }
}
const CAT_FACE_TEX = {};
function catFeatureTex(key, L, st) {
  const id = `${key}|${st.expr}|${st.closed ? 1 : 0}|${st.mouth ? 1 : 0}`;
  if (CAT_FACE_TEX[id]) return CAT_FACE_TEX[id];
  const R = { x0: 40, y0: 90, w: 176, h: 100, S: 4 };
  const c = document.createElement('canvas'); c.width = R.w * R.S; c.height = R.h * R.S;
  const g = c.getContext('2d'); g.scale(R.S, R.S); g.translate(-R.x0, -R.y0);
  drawCatFeatures(g, L, st);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
  t.repeat.set(512 / R.w, 256 / R.h);
  t.offset.set(-R.x0 / R.w, (R.y0 + R.h - 256) / R.h);
  return (CAT_FACE_TEX[id] = t);
}
class CatFace extends FaceRig {
  apply() { const t = catFeatureTex(this.key, this.L, this); if (this.mat.map !== t) { this.mat.map = t; this.mat.needsUpdate = true; } }
  set(expr) {
    if (expr && FACE_EXPR[expr] && expr !== this.expr) { this.expr = expr; this.apply(); }
  }
}

// ============================================================
//  組み立て
// ============================================================
// def：キャラ定義（CHARS / NPCS / 敵の見た目）。opt.look / opt.gear で上書き
function buildCat(key, opt = {}) {
  const c = opt.def || CHARS[key] || NPCS[key];
  const L = { ...c.look, ...(opt.look || {}) }, G = { ...(c.gear || {}), ...(opt.gear || {}) };
  const sp = L.species || 'cat';
  const elemCol = ELEMENTS[c.elem || 'physical'].color;
  const root = new THREE.Group();
  const mats = [];
  const T = (col, ex = {}, fb = 0) => { const m = toon(col, ex, fb); m.userData.e0 = (m.emissive || new THREE.Color()).clone(); m.userData.ei0 = m.emissiveIntensity || 0; mats.push(m); return m; };
  const dark = col => '#' + new THREE.Color(col).multiplyScalar(0.25).getHexString();
  const P = (geo, mat, o = {}) => outlined(geo, mat, { thick: 0.0026, oc: o.oc || dark(mat.color ? '#' + mat.color.getHexString() : '#000'), ...o });
  const furM = T(L.fur), pawM = T(L.paws || L.fur), accM = T(L.accent || '#ffd76a', { emissive: new THREE.Color(L.accent || '#ffd76a'), emissiveIntensity: 0.15 });
  accM.userData.e0 = new THREE.Color(L.accent || '#ffd76a'); accM.userData.ei0 = 0.15;
  const glow = glowMat(L.accent || elemCol, 2.4);
  const lineCol = dark(L.fur);
  const stone = L.material === 'stone', ghost = L.material === 'ghost', plush = L.material === 'plush';

  const hips = new THREE.Group(); hips.position.y = CAT.HIP; root.add(hips);

  // ---------- 胴体 ----------
  const bodyGeo = lathe([[0.001, -0.07], [0.12, -0.065], [0.18, 0.0], [0.2, 0.09], [0.185, 0.19], [0.15, 0.27], [0.1, 0.33], [0.001, 0.35]], 28);
  bodyGeo.rotateY(Math.PI);   // 継ぎ目を背中へ
  const bodyM = T('#ffffff', { map: catBodyTex(L) });
  const body = P(bodyGeo, bodyM, { oc: lineCol }); body.scale.z = 0.86; hips.add(body);
  let bellyTip = null;

  // ---------- 脚（短い） ----------
  const leg = side => {
    const pv = new THREE.Group(); pv.position.set(0.095 * side, -0.02, 0.01); hips.add(pv);
    const th = P(new THREE.CapsuleGeometry(0.065, 0.04, 4, 10), furM, { oc: lineCol }); th.position.y = -0.05; pv.add(th);
    const kn = new THREE.Group(); kn.position.y = -0.1; pv.add(kn);
    const paw = P(new THREE.SphereGeometry(0.07, 14, 10), pawM, { oc: lineCol }); paw.scale.set(1, 0.72, 1.3); paw.position.set(0, -0.055, 0.03); kn.add(paw);
    return { pv, kn };
  };
  const legR = leg(-1), legL = leg(1);

  // ---------- 腕（短い） ----------
  const arm = side => {
    const pv = new THREE.Group(); pv.position.set(0.16 * side, 0.27, 0.01); hips.add(pv);
    const up = P(new THREE.CapsuleGeometry(0.052, 0.06, 4, 10), furM, { oc: lineCol }); up.position.y = -0.05; pv.add(up);
    const el = new THREE.Group(); el.position.y = -0.1; pv.add(el);
    const fo = P(new THREE.CapsuleGeometry(0.048, 0.03, 4, 10), furM, { oc: lineCol }); fo.position.y = -0.02; el.add(fo);
    const paw = P(new THREE.SphereGeometry(0.058, 14, 10), pawM, { oc: lineCol }); paw.position.y = -0.07; paw.scale.set(1, 0.95, 0.9); el.add(paw);
    const grip = new THREE.Group(); grip.position.y = -0.085; el.add(grip);
    return { pv, el, grip, paw };
  };
  const armR = arm(-1), armL = arm(1);

  // ---------- しっぽ ----------
  const tail = [];
  {
    const n = sp === 'mouse' ? 9 : sp === 'dog' ? 4 : 6, r0 = sp === 'mouse' ? 0.018 : sp === 'dog' ? 0.05 : 0.048, seg = sp === 'mouse' ? 0.07 : 0.075;
    const tailM = sp === 'mouse' ? T('#f2b8c0') : furM, tipM = L.tailTip ? T(L.tailTip) : tailM;
    let parent = new THREE.Group(); parent.position.set(0, 0.03, -0.16); hips.add(parent);
    for (let i = 0; i < n; i++) {
      const g = new THREE.Group(); if (i) g.position.y = seg; parent.add(g);
      const m = P(new THREE.CapsuleGeometry(r0 * (1 - i * 0.05), seg * 0.7, 3, 8), i >= n - 2 ? tipM : tailM, { oc: lineCol }); m.position.y = seg / 2; g.add(m);
      tail.push(g); parent = g;
    }
  }

  // ---------- 頭 ----------
  const headPivot = new THREE.Group(); headPivot.position.y = 0.34; hips.add(headPivot);
  const headG = new THREE.Group(); headG.position.set(0, 0.28, 0.01); headPivot.add(headG);
  const [HX, HY, HZ] = CAT.HEAD;
  const headGeo = new THREE.SphereGeometry(1, 48, 32);
  const headMat = T('#ffffff', { map: catHeadTex(L) }, 0.1);
  const head = P(headGeo, headMat, { oc: lineCol }); head.scale.set(HX, HY, HZ); headG.add(head);
  // 頬のふくらみ（猫らしい輪郭）
  const cheekM = L.pattern === 'tuxedo' || L.pattern === 'point' ? T(L.muzzle || L.fur) : furM;
  for (const s of [-1, 1]) { const ck = P(new THREE.SphereGeometry(0.15, 16, 12), cheekM, { oc: lineCol }); ck.scale.set(1, 0.8, 0.9); ck.position.set(s * 0.225, -0.13, 0.06); headG.add(ck); }
  // 表情のレイヤー
  const featMat = T('#ffffff', { map: catFeatureTex(key, L, { expr: 'neutral' }), transparent: true, depthWrite: false }, 0.1);
  const feat = new THREE.Mesh(headGeo, featMat); feat.scale.setScalar(1.004); feat.renderOrder = 1; feat.userData.face = true; head.add(feat);
  const face = new CatFace(key, L, false, null, featMat);
  // ひげ
  const whM = new THREE.MeshBasicMaterial({ color: L.whisker || (new THREE.Color(L.fur).getHSL({}).l < 0.4 ? '#e8e8f0' : '#8a8490') });
  for (const s of [-1, 1]) for (let i = 0; i < 3; i++) {
    const w = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0025, sp === 'mouse' ? 0.24 : 0.19, 4), whM);
    w.rotation.z = s * (Math.PI / 2 + (i - 1) * 0.2); w.rotation.y = -s * 0.35;
    w.position.set(s * 0.19, -0.115 - i * 0.02, 0.23); headG.add(w);
  }
  // 耳
  const ears = [];
  for (const s of [-1, 1]) {
    const e = new THREE.Group(); headG.add(e);
    if (sp === 'mouse') {
      e.position.set(s * 0.25, 0.19, -0.02); e.rotation.z = -s * 0.35;
      const o = P(new THREE.CylinderGeometry(0.13, 0.13, 0.03, 20), furM, { oc: lineCol }); o.rotation.x = Math.PI / 2; o.position.y = 0.1; e.add(o);
      const i = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.032, 20), T(L.earIn || '#f2b8c0')); i.rotation.x = Math.PI / 2; i.position.set(0, 0.1, 0.004); e.add(i);
    } else if (sp === 'dog') {
      e.position.set(s * 0.3, 0.12, -0.02); e.rotation.z = s * 0.5;
      const o = P(new THREE.SphereGeometry(0.1, 12, 10), T(L.earCol || L.fur), { oc: lineCol }); o.scale.set(0.55, 1.3, 0.35); o.position.y = -0.08; e.add(o);
    } else {
      e.position.set(s * 0.2, 0.2, -0.01); e.rotation.set(-0.06, 0, -s * 0.4);
      const earGeo = new THREE.ConeGeometry(0.11, 0.21, 4, 1); earGeo.rotateY(Math.PI / 4);
      const o = P(earGeo, L.pattern === 'point' ? T((L.patches || [])[0] || L.fur) : furM, { oc: lineCol }); o.scale.z = 0.5; o.position.y = 0.09; e.add(o);
      const inGeo = new THREE.ConeGeometry(0.07, 0.14, 4, 1); inGeo.rotateY(Math.PI / 4);
      const i = new THREE.Mesh(inGeo, T(L.earIn || '#f7b8c0')); i.scale.z = 0.35; i.position.set(0, 0.07, 0.022); e.add(i);
    }
    e.userData.base = e.rotation.clone();
    ears.push(e);
  }
  // 鼻先（ネズミ・イヌ）
  if (sp === 'mouse' || sp === 'dog') {
    const sn = P(new THREE.SphereGeometry(sp === 'dog' ? 0.11 : 0.08, 16, 12), T(L.muzzle || L.fur), { oc: lineCol }); sn.scale.set(1, 0.75, 1); sn.position.set(0, -0.1, 0.27); headG.add(sn);
    const no = new THREE.Mesh(new THREE.SphereGeometry(sp === 'dog' ? 0.035 : 0.025, 10, 8), T(sp === 'dog' ? '#2a2226' : '#f08aa0')); no.position.set(0, -0.08, sp === 'dog' ? 0.37 : 0.34); headG.add(no);
  }

  // ---------- 衣装・小物 ----------
  const upd = [];   // 揺れ物の更新
  const neck = new THREE.Group(); neck.position.set(0, 0.32, 0); hips.add(neck);
  // マント（外側と内側の2色、背中で揺れる）
  if (L.cape) {
    const cp = new THREE.Group(); cp.position.set(0, 0.0, -0.13); neck.add(cp);
    const geo = capeGeo(0.26, 0.4, 0.34, 0.1);
    const outer = new THREE.Mesh(geo, T(L.cape, { side: THREE.FrontSide })); outer.castShadow = true; cp.add(outer);
    const inner = new THREE.Mesh(geo, T(L.capeIn || L.cape, { side: THREE.BackSide })); cp.add(inner);
    const ol = new THREE.Mesh(geo, outlineMat(dark(L.cape), 0.0026)); ol.userData.outline = true; cp.add(ol);
    for (const s of [-1, 1]) { const clasp = new THREE.Mesh(new THREE.SphereGeometry(0.022, 8, 6), accM); clasp.position.set(s * 0.11, 0.0, 0.07); neck.add(clasp); }
    if (L.collar) {   // 立ち襟（マオウ）
      const cg = capeGeo(0.34, 0.26, 0.2, 0.12); cg.rotateX(Math.PI); cg.translate(0, 0.0, 0);
      const col = new THREE.Group(); col.position.set(0, 0.02, -0.1); col.rotation.x = -0.25; neck.add(col);
      col.add(new THREE.Mesh(cg, T(L.cape, { side: THREE.BackSide })), new THREE.Mesh(cg, T(L.capeIn || L.cape, { side: THREE.FrontSide })), olMesh(cg, dark(L.cape), 0.0026));
    }
    upd.push((dt, t, P) => { cp.rotation.x = 0.16 + Math.sin(t * 2.2) * 0.05 - P.lean * 0.7 + Math.max(0, -P.legLx, -P.legRx) * 0.3; });
  }
  // マフラー・首巻き（しっぽが背中で揺れる）
  if (L.scarf) {
    const scM = T(L.scarf);
    const ring = P(new THREE.TorusGeometry(0.13, 0.04, 8, 24), scM); ring.rotation.x = Math.PI / 2; ring.position.y = 0.0; ring.scale.y = 0.9; neck.add(ring);
    const tailG = new THREE.Group(); tailG.position.set(0.06, -0.01, -0.12); neck.add(tailG);
    let par = tailG; const segs = [];
    for (let i = 0; i < 3; i++) { const g2 = new THREE.Group(); g2.position.y = i ? -0.07 : 0; par.add(g2); const m = P(new THREE.BoxGeometry(0.07, 0.08, 0.02), scM); m.position.y = -0.035; g2.add(m); segs.push(g2); par = g2; }
    upd.push((dt, t, P) => segs.forEach((g2, i) => { g2.rotation.x = 0.5 + (i ? 0.1 : 0.4) + Math.sin(t * 3 - i) * 0.12 - P.lean * 0.4; g2.rotation.z = Math.sin(t * 2 - i) * 0.1; }));
  }
  // 首輪と鈴
  if (L.bell) {
    const band = new THREE.Mesh(new THREE.TorusGeometry(0.125, 0.018, 6, 24), T(L.bell)); band.rotation.x = Math.PI / 2; neck.add(band);
    const b = P(new THREE.SphereGeometry(0.03, 12, 10), T('#ffd24a', { emissive: new THREE.Color('#ffd24a'), emissiveIntensity: 0.2 })); b.position.set(0, -0.035, 0.13); neck.add(b);
  }
  // リボン（首もと）
  if (L.ribbon) {
    const rM = T(L.ribbon);
    for (const s of [-1, 1]) { const r = P(new THREE.SphereGeometry(0.045, 10, 8), rM); r.scale.set(1.2, 0.8, 0.5); r.position.set(s * 0.045, -0.01, 0.14); neck.add(r); }
  }
  // 鎧（クロ：肩当てと胸当て）
  if (L.armor) {
    const aM = T(L.armor, { emissive: new THREE.Color(L.armor), emissiveIntensity: 0.05 });
    for (const a of [armR, armL]) { const sh = P(new THREE.SphereGeometry(0.075, 14, 10, 0, Math.PI * 2, 0, Math.PI / 2), aM); sh.position.y = 0.01; sh.scale.set(1.05, 0.9, 1.05); a.pv.add(sh); }
    const belt = P(new THREE.TorusGeometry(0.19, 0.022, 6, 28), T('#3a2e2a')); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.86; belt.position.y = 0.06; hips.add(belt);
    const bk = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.02), accM); bk.position.set(0, 0.06, 0.168); hips.add(bk);
  }
  // エプロン（魚屋のおばちゃんなど）
  if (L.apron) {
    const ag = new THREE.CylinderGeometry(0.205, 0.24, 0.3, 16, 1, true, -Math.PI * 0.3, Math.PI * 0.6); ag.translate(0, -0.02, 0);
    const ap = new THREE.Mesh(ag, T(L.apron, { side: THREE.DoubleSide })); ap.position.y = 0.11; ap.scale.z = 0.9; hips.add(ap);
    ap.add(olMesh(ag, dark(L.apron), 0.002));
  }
  // ベスト・服（胴にかぶせる）
  if (L.vest) {
    const vg = lathe([[0.19, 0.0], [0.205, 0.09], [0.19, 0.19], [0.155, 0.27], [0.11, 0.32]], 24); vg.rotateY(Math.PI);
    const v = P(vg, T(L.vest, { side: THREE.DoubleSide })); v.scale.set(1.04, 1, 0.9); hips.add(v);
  }
  // はちまき（ミケ）
  if (L.band) {
    const bM = T(L.band);
    const b = P(new THREE.TorusGeometry(1, 0.1, 8, 40), bM, { thick: 0.002 }); b.rotation.x = Math.PI / 2 - 0.1; b.scale.set(HX * 0.955, HZ * 0.94, 0.42); b.position.y = 0.105; headG.add(b);
    const knot = new THREE.Group(); knot.position.set(0, 0.13, -HZ * 0.93); headG.add(knot);
    const ends = [-1, 1].map(s => { const g2 = new THREE.Group(); g2.position.x = s * 0.02; knot.add(g2); const m = P(new THREE.BoxGeometry(0.05, 0.15, 0.012), bM); m.position.y = -0.07; g2.add(m); return g2; });
    upd.push((dt, t) => ends.forEach((g2, i) => { g2.rotation.set(0.7 + Math.sin(t * 4 + i) * 0.15, 0, (i ? 1 : -1) * (0.35 + Math.sin(t * 3 + i * 2) * 0.1)); }));
  }
  // 三角帽子（シロ）：先が折れた魔法使いの帽子
  if (L.hat) {
    const hM = T(L.hat), hg = new THREE.Group(); hg.position.set(0, 0.24, -0.03); hg.rotation.x = -0.18; headG.add(hg);
    const brim = P(new THREE.CylinderGeometry(0.33, 0.34, 0.025, 28), hM); hg.add(brim);
    const cone1 = P(new THREE.CylinderGeometry(0.12, 0.2, 0.26, 20), hM); cone1.position.y = 0.14; hg.add(cone1);
    const tip = new THREE.Group(); tip.position.y = 0.27; tip.rotation.z = -0.9; hg.add(tip);
    const cone2 = P(new THREE.ConeGeometry(0.12, 0.26, 20), hM); cone2.position.y = 0.12; tip.add(cone2);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.205, 0.04, 28, 1, true), T(L.hatBand || '#ffd76a', { side: THREE.DoubleSide })); band.position.y = 0.035; hg.add(band);
    const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.035), glowMat(L.hatBand || '#ffd76a', 2.5)); star.position.set(0, 0.24, 0.02); tip.add(star);
    upd.push((dt, t) => { tip.rotation.z = -0.9 + Math.sin(t * 1.7) * 0.08; });
  }
  // 冠と角（マオウ・王さま）
  if (L.crown) {
    const cM = T(L.crown, { emissive: new THREE.Color(L.crown), emissiveIntensity: 0.25 });
    const cr = P(new THREE.CylinderGeometry(0.1, 0.09, 0.07, 10, 1, true), cM); cr.material.side = THREE.DoubleSide; cr.position.y = 0.3; headG.add(cr);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; const p = P(new THREE.ConeGeometry(0.022, 0.07, 4), cM); p.position.set(Math.cos(a) * 0.095, 0.365, Math.sin(a) * 0.095); cr.parent.add(p); }
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.025), glowMat(L.gem || '#ff4a6a', 2.5)); gem.position.set(0, 0.3, 0.1); headG.add(gem);
  }
  if (L.horns) {
    const hm = T(L.horns);
    for (const s of [-1, 1]) {
      const hg = new THREE.Group(); hg.position.set(s * 0.26, 0.14, 0.02); hg.rotation.z = -s * 0.9; headG.add(hg);
      let par = hg;
      for (let i = 0; i < 3; i++) { const g2 = new THREE.Group(); g2.position.y = i ? 0.05 : 0; g2.rotation.z = s * 0.35; par.add(g2); const m = P(new THREE.CylinderGeometry(0.018 - i * 0.005, 0.026 - i * 0.005, 0.06, 8), hm); m.position.y = 0.03; g2.add(m); par = g2; }
    }
  }
  // 若葉（タマ：頭のてっぺんに小さな芽）
  if (L.sprout) {
    const sM = T(L.sprout), sg = new THREE.Group(); sg.position.set(0.02, HY - 0.01, 0.02); headG.add(sg);
    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.008, 0.08, 6), sM); stem.position.y = 0.04; sg.add(stem);
    for (const s of [-1, 1]) { const lf = P(new THREE.SphereGeometry(0.04, 10, 8), sM, { thick: 0.0018 }); lf.scale.set(1.3, 0.35, 0.7); lf.position.set(s * 0.04, 0.085, 0); lf.rotation.z = s * 0.4; sg.add(lf); }
    upd.push((dt, t) => { sg.rotation.z = Math.sin(t * 1.3) * 0.12; });
  }
  // 頭巾・バンダナ
  if (L.kerchief) {
    const k = P(new THREE.SphereGeometry(1, 28, 16, 0, Math.PI * 2, 0, Math.PI * 0.42), T(L.kerchief, { side: THREE.DoubleSide })); k.scale.set(HX * 1.04, HY * 1.06, HZ * 1.04); k.rotation.x = -0.35; headG.add(k);
  }
  // めがね
  if (L.glasses) {
    const gm = new THREE.MeshBasicMaterial({ color: L.glasses });
    for (const s of [-1, 1]) { const r = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 20), gm); r.position.set(s * 0.13, -0.02, 0.3); r.rotation.y = s * 0.35; headG.add(r); }
  }
  // ひげ（村長：あごの白いひげ、長い眉毛）
  if (L.beard) {
    const bM = T(L.beard);
    for (const [x, y, z, s] of [[0, -0.23, 0.2, 0.09], [-0.07, -0.21, 0.19, 0.07], [0.07, -0.21, 0.19, 0.07], [0, -0.3, 0.17, 0.065]]) { const b = P(new THREE.SphereGeometry(s, 12, 10), bM); b.position.set(x, y, z); headG.add(b); }
    for (const s of [-1, 1]) { const b = P(new THREE.SphereGeometry(0.04, 10, 8), bM); b.scale.set(1.6, 0.6, 0.6); b.position.set(s * 0.14, 0.07, 0.27); b.rotation.z = -s * 0.3; headG.add(b); }
  }
  // コック帽・とんがり頭巾などの帽子
  if (L.cap) {
    const cM = T(L.cap);
    if (L.capType === 'chef') { const h1 = P(new THREE.CylinderGeometry(0.13, 0.13, 0.14, 16), cM); h1.position.y = 0.3; headG.add(h1); const h2 = P(new THREE.SphereGeometry(0.17, 16, 12), cM); h2.scale.y = 0.6; h2.position.y = 0.4; headG.add(h2); }
    else if (L.capType === 'night') { const cg = new THREE.ConeGeometry(0.2, 0.34, 16); cg.translate(0, 0.17, 0); const h = P(cg, cM); h.position.set(0, 0.22, -0.03); h.rotation.set(-0.3, 0, -0.5); headG.add(h); const pom = P(new THREE.SphereGeometry(0.04, 10, 8), T('#ffffff')); pom.position.set(0, 0.34, 0); h.add(pom); }
    else if (L.capType === 'helmet') { const h = P(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI * 0.4), cM); h.scale.set(HX * 1.06, HY * 1.08, HZ * 1.06); headG.add(h); const sp2 = P(new THREE.ConeGeometry(0.03, 0.12, 6), T(L.accent || '#ffd76a')); sp2.position.y = HY + 0.07; headG.add(sp2); }
    else if (L.capType === 'clown') { const cg = new THREE.ConeGeometry(0.13, 0.36, 12); cg.translate(0, 0.18, 0); const h = P(cg, cM); h.position.set(0.05, 0.25, 0); h.rotation.z = -0.2; headG.add(h); const pom = new THREE.Mesh(new THREE.SphereGeometry(0.05, 10, 8), glowMat(L.accent || '#ffd76a', 1.6)); pom.position.y = 0.37; h.add(pom); }
    else if (L.capType === 'shrine') { const h = P(new THREE.CylinderGeometry(0.1, 0.12, 0.2, 12), cM); h.position.set(0, 0.32, -0.02); h.rotation.x = -0.2; headG.add(h); }
  }
  // 道化の襟（ピエロ）
  if (L.ruff) {
    const rM = T(L.ruff);
    for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; const r = P(new THREE.SphereGeometry(0.06, 10, 8), rM); r.scale.set(1, 0.5, 1); r.position.set(Math.cos(a) * 0.15, 0.0, Math.sin(a) * 0.13); neck.add(r); }
  }
  // 羽（魔族：小さなコウモリの羽）
  if (L.wings) {
    const wM = T(L.wings, { side: THREE.DoubleSide });
    for (const s of [-1, 1]) {
      const wg = new THREE.Group(); wg.position.set(s * 0.08, 0.2, -0.15); hips.add(wg);
      const shape = new THREE.Shape(); shape.moveTo(0, 0); shape.lineTo(0.22, 0.12); shape.lineTo(0.19, 0.02); shape.lineTo(0.15, 0.05); shape.lineTo(0.12, -0.03); shape.lineTo(0.08, 0.01); shape.lineTo(0.05, -0.05); shape.closePath();
      const w = new THREE.Mesh(new THREE.ShapeGeometry(shape), wM); w.scale.x = s; w.rotation.y = s * 0.5; wg.add(w);
      upd.push((dt, t) => { wg.rotation.y = s * (0.3 + Math.sin(t * 8 + s) * 0.35); });
    }
  }
  // ほっぺの傷（歴戦の猫）
  if (L.scar) { const sc = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.012, 0.01), new THREE.MeshBasicMaterial({ color: '#5a3438' })); sc.position.set(0.2, 0.08, 0.26); sc.rotation.set(0, 0.6, 0.6); headG.add(sc); }

  // ---------- 武器 ----------
  const extras = buildCatWeapon(G.weapon, armR, armL, hips, L, elemCol, P, T, glow, G);

  if (c.scale) root.scale.setScalar(c.scale);
  // 素材の特殊な見た目（石像・幽霊・ぬいぐるみ）
  if (stone || ghost || plush) root.traverse(o => {
    if (!o.isMesh || o.userData.outline || o.userData.face) return;
    if (stone) { o.material = o.material.clone(); o.material.color.lerp(new THREE.Color('#c8b890'), 0.85); if (o.material.map && o !== feat) o.material.map = null; }
    if (ghost) { o.material = o.material.clone(); o.material.transparent = true; o.material.opacity = 0.6; if (o.material.emissive) { o.material.emissive.set(L.ghostCol || '#8a6aff'); o.material.emissiveIntensity = 0.5; o.material.userData.e0 = o.material.emissive.clone(); o.material.userData.ei0 = 0.5; } }
  });
  if (stone || ghost) { mats.length = 0; root.traverse(o => { if (o.isMesh && o.material.emissive && !mats.includes(o.material)) mats.push(o.material); }); }
  root.traverse(o => { if (o.isMesh && !o.userData.outline && !o.userData.face) o.castShadow = true; });

  // ---------- ポーズ → 関節 ----------
  const pose = {}; POSE_KEYS.forEach(k => pose[k] = 0);
  Object.assign(pose, POSES.idle);
  const E = new THREE.Euler(), down = V3(0, -1, 0), tmpV = V3(), tmpQ = new THREE.Quaternion();
  // 腕の向き：人型のポーズの角度から腕の方向を出し、頭にめり込むときは外側へ逃がす
  const setArm = (a, x, z, side) => {
    tmpV.copy(down).applyEuler(E.set(x, 0, z));
    if (tmpV.y > -0.35) {
      const k = clamp((tmpV.y + 0.35) / 1.2, 0, 1), need = lerp(0.3, 0.86, k), ox = Math.abs(tmpV.x);
      if (ox < need) {
        const rest = Math.sqrt(Math.max(0, 1 - need * need)), yz = Math.hypot(tmpV.y, tmpV.z) || 1;
        tmpV.set(side * need, tmpV.y / yz * rest, tmpV.z / yz * rest);
      }
    }
    a.pv.quaternion.setFromUnitVectors(down, tmpV.normalize());
    // ひねり：腕を前に出すときは手のひらが内を向く
    a.pv.quaternion.multiply(tmpQ.setFromAxisAngle(down, 0));
  };
  let mood = 0, earT = 2 + Math.random() * 4, earFlick = 0;
  const model = {
    group: root, hips, headPivot, armR, armL, legR, legL, mats, pose, height: CAT.H * (c.scale || 1), radius: 0.4 * (c.scale || 1), key,
    style: G.style || 'melee', elemCol, idleAmp: 1, flashAmt: 0, flashCol: new THREE.Color(1, 1, 1), extras, face, cat: true, tail, ears,
    setPose(p) { POSE_KEYS.forEach(k => pose[k] = p[k] || 0); },
    update(dt, t) {
      face.update(dt);
      const br = Math.sin(t * 2.2) * this.idleAmp;
      hips.position.y = CAT.HIP + pose.hipsY * CAT.HIPK + br * 0.004;
      hips.rotation.x = pose.lean; hips.rotation.y = pose.twist;
      headPivot.rotation.x = pose.headX + br * 0.025; headPivot.rotation.y = pose.headY;
      headPivot.rotation.z = Math.sin(t * 0.7 + this.seed) * 0.03;
      // 武器が腕の動きを決めるもの（お手玉の腕）は、ポーズより優先する
      const ja = extras.arms && extras.arms(t);
      if (ja) { setArm(armR, ja[0], ja[1], -1); setArm(armL, ja[2], ja[3], 1); armR.el.rotation.x = ja[4] * 0.8; armL.el.rotation.x = ja[5] * 0.8; }
      else {
        setArm(armR, pose.armRx + br * 0.03, pose.armRz, -1); setArm(armL, pose.armLx - br * 0.03, pose.armLz, 1);
        armR.el.rotation.x = pose.elbowR * 0.8; armL.el.rotation.x = pose.elbowL * 0.8;
      }
      legR.pv.rotation.x = pose.legRx; legL.pv.rotation.x = pose.legLx;
      legR.kn.rotation.x = pose.kneeR * 0.6; legL.kn.rotation.x = pose.kneeL * 0.6;
      // しっぽ：気分で上がり下がり、ゆらゆら（rotation.x が 0 で真上、負へ回すほど後ろへ倒れる。正へ回すと体の前へ入りこむ）
      //   うれしいと根もとから立てて先を後ろへ丸め、しょんぼりすると後ろへ垂らして、先は地面につかないよう少し持ち上げる
      const ex = face.expr, want = ['sad', 'worry', 'pained', 'cry'].includes(ex) ? -1 : ['joy', 'smile', 'surprise'].includes(ex) ? 1 : 0;
      mood += (want - mood) * Math.min(1, dt * 3);
      const wag = mood > 0.5 ? 6 : 2.4;
      tail.forEach((g, i) => {
        const base = sp === 'mouse' ? -0.35 + i * 0.12 : sp === 'dog' ? -0.9 : i === 0 ? -1.15 + mood * (mood > 0 ? 0.55 : 0.8) : -0.12 - mood * (mood > 0 ? 0.08 : 0.18);
        g.rotation.x = base + (i ? Math.sin(t * 1.3 - i * 0.5) * 0.05 : 0) - pose.lean * (i ? 0 : 0.6);
        g.rotation.z = Math.sin(t * wag - i * 0.6 + this.seed) * (0.08 + i * 0.03);
      });
      // 耳：ときどきぴくっと動く。しょんぼりすると伏せる
      if ((earT -= dt) <= 0) { earT = 2 + Math.random() * 5; earFlick = 1; }
      earFlick = Math.max(0, earFlick - dt * 6);
      ears.forEach((e, i) => { const s = i ? 1 : -1, b = e.userData.base; e.rotation.set(b.x - (mood < 0 ? -mood * 0.5 : 0), b.y, b.z - s * (mood < 0 ? -mood * 0.45 : 0) + (i ? earFlick * 0.25 : 0)); });
      for (const f of upd) f(dt, t, pose);
      if (extras.update) extras.update(dt, t);
      if (this.flashAmt > 0.001) {
        this.flashAmt *= Math.pow(0.004, dt);
        for (const m of mats) { if (!m.emissive) continue; m.emissive.copy(this.flashCol); m.emissiveIntensity = this.flashAmt; }
      } else if (this.flashAmt !== 0) {
        this.flashAmt = 0;
        for (const m of mats) { if (!m.emissive) continue; m.emissive.copy(m.userData.e0 || new THREE.Color(0)); m.emissiveIntensity = m.userData.ei0 || 0; }
      }
    },
    flash(col = '#ffffff', amt = 1) { this.flashCol.set(col); this.flashAmt = amt; },
    handPos() { return armR.grip.getWorldPosition(V3()); },
    tipPos() { return (extras.tip || armR.grip).getWorldPosition(V3()); },
    seed: Math.random() * 10,
  };
  model.update(0, 0);
  return model;
}

// 輪郭線だけのメッシュ（旋盤や板の衣装用）
function olMesh(geo, col, th) { const m = new THREE.Mesh(geo, outlineMat(col, th)); m.userData.outline = true; m.castShadow = false; return m; }
// マントの形：上辺 wt・下辺 wb・丈 h、背中に沿って丸める（原点が上辺の中央、-Z が外側）
function capeGeo(wt, wb, h, curve) {
  const g = new THREE.PlaneGeometry(1, 1, 8, 6), p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const u = p.getX(i), v = p.getY(i) + 0.5, w = lerp(wb, wt, v), x = u * w;
    p.setXYZ(i, x, -(1 - v) * h, -curve * (1 - (2 * u) ** 2) * (0.6 + (1 - v) * 0.6) - (1 - v) * 0.05);
  }
  g.computeVertexNormals();
  return g;
}

// ---------- 武器（右手。持ち方は人型と同じ：腕を下ろすと先が前下を向く） ----------
function buildCatWeapon(type, armR, armL, hips, L, elemCol, P, T, glow, G = {}) {
  const ex = {}, eg = glowMat(elemCol, 3);
  const hold = new THREE.Group(); hold.rotation.x = Math.PI - 0.55; armR.grip.add(hold);
  const tipAt = (y, parent = hold) => { ex.tip = new THREE.Object3D(); ex.tip.position.y = y; parent.add(ex.tip); };
  switch (type) {
    case 'sword': {   // 勇者の片手剣
      const bl = P(new THREE.BoxGeometry(0.045, 0.36, 0.012), T('#e8ecf4')); bl.position.y = 0.24; hold.add(bl);
      const tipM = P(new THREE.ConeGeometry(0.032, 0.06, 4), T('#e8ecf4')); tipM.scale.z = 0.3; tipM.position.y = 0.45; tipM.rotation.y = Math.PI / 4; hold.add(tipM);
      const ed = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.34, 0.016), eg); ed.position.set(0, 0.24, 0); hold.add(ed);
      const gd = P(new THREE.BoxGeometry(0.14, 0.025, 0.035), T('#ffd76a', { emissive: new THREE.Color('#ffd76a'), emissiveIntensity: 0.2 })); gd.position.y = 0.055; hold.add(gd);
      const hi = P(new THREE.CylinderGeometry(0.014, 0.014, 0.08, 8), T('#7a3a2a')); hi.position.y = 0.0; hold.add(hi);
      const pm = new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), T('#ffd76a')); pm.position.y = -0.045; hold.add(pm);
      tipAt(0.47); break;
    }
    case 'blade': {   // クロの黒刀（少し長い）
      const bl = P(new THREE.BoxGeometry(0.035, 0.52, 0.01), T('#3a3848')); bl.position.y = 0.32; bl.rotation.z = 0.04; hold.add(bl);
      const ed = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.5, 0.012), glowMat('#b8c6ff', 2.4)); ed.position.set(0.017, 0.32, 0); hold.add(ed);
      const gd = P(new THREE.CylinderGeometry(0.04, 0.04, 0.012, 10), T('#b8c6e8')); gd.position.y = 0.05; hold.add(gd);
      const hi = P(new THREE.CylinderGeometry(0.014, 0.014, 0.1, 8), T('#8a2f3c')); hi.position.y = -0.01; hold.add(hi);
      tipAt(0.6); break;
    }
    case 'wand': {    // シロの星の杖
      const st = P(new THREE.CylinderGeometry(0.012, 0.016, 0.42, 8), T('#f4ecd8')); st.position.y = 0.18; hold.add(st);
      const star = new THREE.Mesh(new THREE.OctahedronGeometry(0.05, 0), glowMat('#ffe07a', 3)); star.position.y = 0.42; star.scale.set(1, 1, 0.45); hold.add(star);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.008, 6, 20), glowMat(elemCol, 2.4)); ring.position.y = 0.42; hold.add(ring);
      ex.tip = star; ex.update = (dt, t) => { star.rotation.y = t * 2; ring.rotation.x = t * 1.5; }; break;
    }
    case 'pillow': {  // タマのまくら（左手で抱える）
      const pl = P(new THREEX.RoundedBoxGeometry(0.3, 0.2, 0.1, 4, 0.045), T('#ffe0ea')); pl.position.set(0.03, -0.02, 0.05); pl.rotation.set(0.1, 0.2, 1.25); armL.grip.add(pl);
      for (const y of [-0.05, 0.05]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.302, 0.018, 0.101), T('#ff9ab8')); st.position.y = y; pl.add(st); }
      for (const x of [-0.15, 0.15]) { const ts = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), T('#ffd76a')); ts.position.set(x, 0.1, 0); pl.add(ts); }
      ex.tip = pl; break;
    }
    case 'scepter': { // マオウの笏
      const rod = P(new THREE.CylinderGeometry(0.014, 0.018, 0.5, 8), T('#2a2238')); rod.position.y = 0.2; hold.add(rod);
      const orb = new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), glowMat('#c070ff', 2.6)); orb.position.y = 0.48; hold.add(orb);
      for (let i = 0; i < 3; i++) { const a = i / 3 * Math.PI * 2; const s = P(new THREE.ConeGeometry(0.012, 0.08, 5), T('#ffcf4a')); s.position.set(Math.cos(a) * 0.045, 0.46, Math.sin(a) * 0.045); s.rotation.z = Math.cos(a) * -0.5; s.rotation.x = Math.sin(a) * 0.5; hold.add(s); }
      ex.tip = orb; break;
    }
    case 'cane': {    // 村長の杖
      hold.rotation.x = 0.15;
      const st = P(new THREE.CylinderGeometry(0.013, 0.016, 0.34, 8), T('#8a5a36')); st.position.y = -0.13; hold.add(st);
      const hk = P(new THREE.TorusGeometry(0.04, 0.013, 6, 12, Math.PI), T('#8a5a36')); hk.position.set(0.04, 0.03, 0); hold.add(hk);
      tipAt(-0.3); break;
    }
    case 'fork': {    // キングネズミの大きなフォーク
      const st = P(new THREE.CylinderGeometry(0.015, 0.015, 0.6, 8), T('#c8c8d8')); st.position.y = 0.26; hold.add(st);
      for (const x of [-0.04, 0, 0.04]) { const p = P(new THREE.BoxGeometry(0.014, 0.14, 0.014), T('#e8e8f0')); p.position.set(x, 0.62, 0); hold.add(p); }
      const bar = P(new THREE.BoxGeometry(0.1, 0.02, 0.016), T('#e8e8f0')); bar.position.y = 0.55; hold.add(bar);
      tipAt(0.68); break;
    }
    case 'fish': {    // 魚（魚屋・ミケの非常食）
      const f = P(new THREE.SphereGeometry(0.06, 12, 10), T('#8ab8d8')); f.scale.set(0.6, 2.2, 0.9); f.position.y = 0.1; hold.add(f);
      const tl = P(new THREE.ConeGeometry(0.05, 0.07, 3), T('#8ab8d8')); tl.position.y = 0.25; tl.scale.z = 0.3; hold.add(tl);
      tipAt(0.2); break;
    }
    case 'juggle': {  // ピエロのお手玉
      const balls = [0, 1, 2].map(i => { const b = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), glowMat(['#ff6a8a', '#ffd76a', '#6ad8ff'][i], 1.8)); hips.add(b); return b; });
      ex.tip = balls[0];
      if (!G.juggleArms) { ex.update = (dt, t) => balls.forEach((b, i) => { const a = t * 3 + i * 2.1; b.position.set(Math.cos(a) * 0.18, 0.62 + Math.abs(Math.sin(a)) * 0.35, 0.22); }); break; }
      // juggleArms：両腕を横に広げ、投げるたびに手を振り上げる。三つの球は、右手 → 左手 → 右手と、両手のあいだを弧をえがいて行き来する
      //   一周（右 → 左 → 右）は 1.8 秒、三つの球は 1/3 周ずつずらす → どちらの手も 0.6 秒ごとに投げる（左は右の 0.3 秒あと）。手は投げる直前に振り上がる
      const C = 1.8, hR = V3(), hL = V3(), toss = k => Math.max(0, Math.sin((k + 0.3) % 1 * Math.PI * 2)) ** 2;
      ex.arms = t => {
        const kR = (t / (C / 3)) % 1, kL = ((t + C / 6) / (C / 3)) % 1, uR = toss(kR), uL = toss(kL);
        return [-0.65 - uR * 0.3, -1.1 + uR * 0.25, -0.65 - uL * 0.3, 1.1 - uL * 0.25, -0.6 - uR * 0.5, -0.6 - uL * 0.5];
      };
      ex.update = (dt, t) => {
        hips.updateWorldMatrix(true, false);
        hips.worldToLocal(armR.grip.getWorldPosition(hR)); hips.worldToLocal(armL.grip.getWorldPosition(hL));
        balls.forEach((b, i) => {
          const p = (t / C + i / 3) % 1, rl = p < 0.5, s = rl ? p * 2 : p * 2 - 1, [a, c] = rl ? [hR, hL] : [hL, hR];
          b.position.lerpVectors(a, c, s);
          // 顔とえりにかからないよう、低めの弧で、体の前へふくらませる
          b.position.y += 4 * 0.24 * s * (1 - s);
          b.position.z += Math.sin(s * Math.PI) * 0.34;
        });
      };
      break;
    }
    case 'ladle': {   // おたま（四天王グツグツ）
      const st = P(new THREE.CylinderGeometry(0.012, 0.012, 0.44, 8), T('#c8c8d8')); st.position.y = 0.2; hold.add(st);
      const cup = P(new THREE.SphereGeometry(0.075, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), T('#e8e8f0', { side: THREE.DoubleSide })); cup.position.y = 0.46; cup.rotation.x = Math.PI; hold.add(cup);
      tipAt(0.46); break;
    }
    case 'shears': {  // せんていバサミ（四天王チョキチョキ）
      for (const s of [-1, 1]) {
        const g = new THREE.Group(); g.rotation.z = s * 0.18; hold.add(g);
        const bl = P(new THREE.BoxGeometry(0.03, 0.24, 0.012), T('#d8dce8')); bl.position.set(s * 0.012, 0.28, 0); g.add(bl);
        const hd = P(new THREE.CylinderGeometry(0.016, 0.016, 0.16, 8), T('#c84a3a')); hd.position.set(s * 0.02, 0.06, 0); g.add(hd);
      }
      tipAt(0.4); break;
    }
    case 'broom': {   // ほうき（宿屋・掃除係）
      const st = P(new THREE.CylinderGeometry(0.012, 0.012, 0.5, 8), T('#a07a4a')); st.position.y = 0.18; hold.add(st);
      const br = P(new THREE.ConeGeometry(0.07, 0.14, 10), T('#e8c870')); br.position.y = -0.1; br.rotation.x = Math.PI; hold.add(br);
      tipAt(-0.15); break;
    }
    default: ex.tip = armR.grip;
  }
  return ex;
}

// 2頭身の肖像を撮る（ハブ・戦闘の顔アイコン）
function catPortraitCam(m) {
  m.group.updateMatrixWorld(true);
  const h = m.headPivot.getWorldPosition(V3()); h.y += 0.25 * (m.group.scale.y || 1);
  const cam = new THREE.PerspectiveCamera(30, 1, 0.05, 20);
  const s = m.group.scale.y || 1;
  cam.position.set(h.x + 0.35 * s, h.y + 0.08 * s, h.z + 1.55 * s);
  cam.lookAt(h.x + 0.02 * s, h.y - 0.04 * s, h.z);
  return cam;
}
