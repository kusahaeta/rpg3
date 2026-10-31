'use strict';
// ============================================================
//  おしゃれの形（js/outfits.js の look）。buildCat が、頭・首・腰・腕・脚の骨組みに着せる
//    specs：メガネ（round まるメガネ・sun サングラス・star ほしがた・nose ピエロのはな）
//    topper：帽子（straw むぎわら・silk シルクハット・beret ベレー・clown ピエロ）
//    capeTex：マントの柄（stars 星・petals 花びら・ermine 毛皮のふち・diamond ひし形）。マントの形は buildCat のまま
//    suit：服（sweater セーター・happi はっぴ・tux タキシード・clown ピエロ）。胴にかぶせる上着と、袖・すそ・襟
//  頭の座標は buildCat の headG（頭の球の中心が原点。半径 CAT.HEAD）。目は顔の画像の (128±36, 132) で、頭の上では (±0.154, -0.015, 0.284)
//  柄の画像はモデルごとに作る（モデルを捨てると disposeTree が画像も捨てるので、使いまわさない）
// ============================================================
const outfitRand = seed => () => (seed = (seed * 16807) % 2147483647) / 2147483647;
function outfitCanvas(w, h, draw) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return t;
}
function outfitStar(g, x, y, R, r, rot = -Math.PI / 2) {
  g.beginPath();
  for (let i = 0; i < 10; i++) { const a = rot + i * Math.PI / 5, d = i % 2 ? r : R; g.lineTo(x + Math.cos(a) * d, y + Math.sin(a) * d); }
  g.closePath();
}

// ---------- マントの柄（板の UV：上が首もと） ----------
function outfitCapeTex(L) {
  const [c0, c1] = L.capeTexCol || ['#888888', '#ffffff'];
  return outfitCanvas(256, 256, (g, W, H) => {
    const rnd = outfitRand(7);
    g.fillStyle = c0; g.fillRect(0, 0, W, H);
    switch (L.capeTex) {
      case 'stars': {   // 夜空：下へいくほど少し明るい紺に、大小の星と小さな点
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(0,0,0,.25)'); gr.addColorStop(1, 'rgba(120,140,255,.18)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.fillStyle = 'rgba(255,255,255,.7)';
        for (let i = 0; i < 70; i++) { g.beginPath(); g.arc(rnd() * W, rnd() * H, 0.8 + rnd() * 1.2, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = c1;
        for (let i = 0; i < 16; i++) { const R = 6 + rnd() * 8; outfitStar(g, 14 + rnd() * (W - 28), 14 + rnd() * (H - 28), R, R * 0.45, -Math.PI / 2 + rnd() * 0.6); g.fill(); }
        // 三日月
        g.beginPath(); g.arc(196, 70, 20, 0, Math.PI * 2); g.fill();
        g.fillStyle = c0; g.beginPath(); g.arc(206, 62, 18, 0, Math.PI * 2); g.fill();
        break;
      }
      case 'petals': {  // 花びら：上は白っぽく、下へいくほど濃いもも色。五弁の花と、散った花びら
        const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, 'rgba(255,255,255,.55)'); gr.addColorStop(1, 'rgba(255,90,150,.25)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        for (let i = 0; i < 12; i++) {
          const x = 16 + rnd() * (W - 32), y = 16 + rnd() * (H - 32), r = 8 + rnd() * 7, a0 = rnd() * 6;
          g.fillStyle = i % 3 ? c1 : '#ff8ab4';
          for (let k = 0; k < 5; k++) { const a = a0 + k * Math.PI * 2 / 5; g.beginPath(); g.ellipse(x + Math.cos(a) * r * 0.6, y + Math.sin(a) * r * 0.6, r * 0.55, r * 0.38, a, 0, Math.PI * 2); g.fill(); }
          g.fillStyle = '#ffd24a'; g.beginPath(); g.arc(x, y, r * 0.22, 0, Math.PI * 2); g.fill();
        }
        for (let i = 0; i < 26; i++) { g.fillStyle = rnd() < 0.5 ? c1 : '#ff9ac0'; g.beginPath(); g.ellipse(rnd() * W, rnd() * H, 4, 2.4, rnd() * 6, 0, Math.PI * 2); g.fill(); }
        break;
      }
      case 'ermine': {  // 王さま：ビロードの赤に金の縁どり、すその白い毛皮に黒いしっぽの点
        const gr = g.createLinearGradient(0, 0, W, 0); gr.addColorStop(0, 'rgba(0,0,0,.18)'); gr.addColorStop(0.5, 'rgba(255,255,255,.08)'); gr.addColorStop(1, 'rgba(0,0,0,.18)');
        g.fillStyle = gr; g.fillRect(0, 0, W, H);
        g.fillStyle = '#ffd24a'; g.fillRect(0, H - 62, W, 8); g.fillRect(0, 0, 8, H - 54); g.fillRect(W - 8, 0, 8, H - 54);
        g.fillStyle = c1; g.fillRect(0, H - 54, W, 54);
        g.fillStyle = '#1a1418';
        for (let row = 0; row < 2; row++) for (let i = 0; i < 8; i++) { const x = 12 + i * 32 + row * 16, y = H - 42 + row * 22; g.beginPath(); g.moveTo(x, y - 6); g.quadraticCurveTo(x + 5, y + 2, x, y + 8); g.quadraticCurveTo(x - 5, y + 2, x, y - 6); g.fill(); }
        break;
      }
      case 'diamond': { // ピエロ：ひし形を二色で市松に並べ、かどに金の点
        const nx = 4, ny = 4, w = W / nx, h = H / ny;
        for (let j = -1; j <= ny; j++) for (let i = -1; i <= nx; i++) {
          const x = (i + 0.5) * w + (j % 2 ? w / 2 : 0), y = (j + 0.5) * h;
          g.fillStyle = (i + j) % 2 ? c1 : c0;
          g.beginPath(); g.moveTo(x, y - h / 2); g.lineTo(x + w / 2, y); g.lineTo(x, y + h / 2); g.lineTo(x - w / 2, y); g.closePath(); g.fill();
        }
        g.fillStyle = '#ffe066';
        for (let j = 0; j <= ny; j++) for (let i = 0; i <= nx * 2; i++) { g.beginPath(); g.arc(i * w / 2, j * h, 5, 0, Math.PI * 2); g.fill(); }
        break;
      }
    }
  });
}
// マントのふちの飾り（王さまのマントの白い毛皮のすそ）。cp：マントの板の親、wb・h・curve：capeGeo の下辺の幅・丈・丸み
function outfitCapeTrim(cp, L, wb, h, curve, P, T) {
  if (L.capeTex !== 'ermine') return;
  const fur = T((L.capeTexCol || [])[1] || '#ffffff');
  for (let i = 0; i <= 8; i++) {
    const u = i / 8 - 0.5, x = u * wb, z = -curve * (1 - (2 * u) ** 2) * 1.2 - 0.05;
    const b = P(new THREE.SphereGeometry(0.032, 10, 8), fur, { oc: '#8a8090', thick: 0.0018 }); b.scale.set(1.15, 0.85, 0.8); b.position.set(x, -h + 0.008, z); cp.add(b);
  }
}

// ---------- 頭と体に着せる ----------
// c：buildCat の部品（headG・neck・hips・armR・armL・legR・legL・P・T・upd）
function buildCatOutfit(L, c) {
  if (L.specs) outfitSpecs(L, c);
  if (L.topper) outfitTopper(L, c);
  if (L.suit) outfitSuit(L, c);
}

// メガネ：目の前に、頭の面に沿って傾けたふちと、耳のほうへのびるつる
function outfitSpecs(L, { headG, P, T }) {
  const col = L.specsCol || '#3a2a2a', kind = L.specs;
  if (kind === 'nose') {   // ピエロのはな：鼻の上に、まっかな玉
    const n = P(new THREE.SphereGeometry(0.058, 18, 14), T(col, { emissive: new THREE.Color(col), emissiveIntensity: 0.18 }), { oc: '#5a1018' });
    n.position.set(0, -0.085, 0.318); headG.add(n);
    const hl = new THREE.Mesh(new THREE.SphereGeometry(0.014, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); hl.position.set(-0.018, -0.062, 0.366); headG.add(hl);
    return;
  }
  const fm = T(col), Z = V3(0, 0, 1), R = kind === 'star' ? 0.11 : 0.084;
  const lensM = kind === 'sun' ? T('#14141c', { transparent: true, opacity: 0.9 })
    : new THREE.MeshBasicMaterial({ color: kind === 'star' ? '#ffd0ea' : '#e8f4ff', transparent: true, opacity: kind === 'star' ? 0.22 : 0.14, depthWrite: false });
  let outer = null;
  for (const s of [-1, 1]) {
    const e = V3(s * 0.154, -0.012, 0.284), n = V3(e.x / 0.1296, e.y / 0.093, e.z / 0.0992).normalize();
    const g = new THREE.Group(); g.position.copy(e).addScaledVector(n, 0.024); g.quaternion.setFromUnitVectors(Z, n); headG.add(g);
    if (kind === 'star') {   // 星の形のふち（まん中をくりぬいた星を薄く押し出す）
      const sh = new THREE.Shape(), hole = new THREE.Path(), pt = (path, R2, r2, i) => { const a = Math.PI / 2 + i * Math.PI / 5, d = i % 2 ? r2 : R2; return [Math.cos(a) * d, Math.sin(a) * d]; };
      for (let i = 0; i < 10; i++) { const [x, y] = pt(sh, R, R * 0.55, i); i ? sh.lineTo(x, y) : sh.moveTo(x, y); }
      for (let i = 9; i >= 0; i--) { const [x, y] = pt(hole, R * 0.74, R * 0.4, i); i === 9 ? hole.moveTo(x, y) : hole.lineTo(x, y); }
      sh.holes.push(hole);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: 0.012, bevelEnabled: false }); geo.translate(0, 0, -0.006);
      g.add(P(geo, fm, { oc: '#6a1040', thick: 0.0016 }));
      const lg = new THREE.ShapeGeometry(new THREE.Shape(hole.getPoints().reverse())); g.add(new THREE.Mesh(lg, lensM));
    } else {
      const ring = P(new THREE.TorusGeometry(R, kind === 'sun' ? 0.012 : 0.0085, 8, 36), fm, { oc: dark2(col), thick: 0.0014 });
      const lens = new THREE.Mesh(new THREE.CircleGeometry(R, 36), lensM);
      if (kind === 'sun') { ring.scale.set(1.1, 0.86, 1); lens.scale.set(1.1, 0.86, 1);
        const gl = new THREE.Mesh(new THREE.PlaneGeometry(0.05, 0.012), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })); gl.position.set(-0.03, 0.035, 0.004); gl.rotation.z = 0.6; g.add(gl); }
      g.add(ring, lens);
    }
    if (s > 0) outer = g;
  }
  // ブリッジ（鼻の上で少し持ち上げた弧）とつる（頭の横に沿って耳の下へ）
  const tube = (pts, r) => P(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, r, 6), fm, { oc: dark2(col), thick: 0.0012 });
  const inner = 0.154 - R * 0.92, w = kind === 'sun' ? 1.1 : 1;
  headG.add(tube([V3(-inner * w + 0.004, 0.0, 0.338), V3(0, 0.018, 0.348), V3(inner * w - 0.004, 0.0, 0.338)], kind === 'sun' ? 0.009 : 0.0065));
  for (const s of [-1, 1]) {
    const ox = 0.154 + R * 0.92 * w, pts = [V3(s * ox, 0.008, 0.262)];
    for (const a of [0.86, 1.1, 1.34, 1.56]) pts.push(V3(s * 0.36 * Math.sin(a) * 1.05, 0.03, 0.315 * Math.cos(a) * 1.05));
    headG.add(tube(pts, 0.0055));
  }
}
const dark2 = col => '#' + new THREE.Color(col).multiplyScalar(0.3).getHexString();

// 帽子：耳は帽子のつばや山から突きでる（猫なので）
function outfitTopper(L, { headG, P, T, upd }) {
  const c0 = L.topCol || '#888888', c1 = L.topCol2 || '#ffffff', kind = L.topper;
  const g = new THREE.Group(); headG.add(g);
  if (kind === 'straw') {
    const weave = outfitCanvas(128, 128, (x, W, H) => {
      x.fillStyle = c0; x.fillRect(0, 0, W, H);
      for (let i = 0; i < 16; i++) { x.fillStyle = i % 2 ? 'rgba(160,110,30,.28)' : 'rgba(255,250,220,.25)'; x.fillRect(0, i * 8, W, 4); x.fillRect(i * 8, 0, 3, H); }
    });
    weave.wrapS = weave.wrapT = THREE.RepeatWrapping; weave.repeat.set(4, 2);
    const sm = T('#ffffff', { map: weave, side: THREE.DoubleSide }), oc = dark2(c0);
    g.position.set(0, 0.2, -0.01); g.rotation.x = -0.14;
    const brim = P(lathe([[0.2, 0.012], [0.32, 0.0], [0.44, -0.03], [0.445, -0.045], [0.33, -0.016], [0.2, -0.004]], 40), sm, { oc }); g.add(brim);
    const crown = P(lathe([[0.25, 0.0], [0.25, 0.08], [0.23, 0.14], [0.16, 0.175], [0.001, 0.182]], 32), sm, { oc }); crown.scale.set(1.08, 1, 0.98); g.add(crown);
    const rib = new THREE.Mesh(new THREE.CylinderGeometry(0.253, 0.253, 0.045, 32, 1, true), T(c1, { side: THREE.DoubleSide })); rib.scale.set(1.08, 1, 0.98); rib.position.y = 0.03; g.add(rib);
    // 後ろのリボンの結び目と、たれ
    const rm = T(c1), knot = new THREE.Group(); knot.position.set(0.0, 0.03, -0.25); g.add(knot);
    const k = P(new THREE.SphereGeometry(0.03, 10, 8), rm); k.scale.set(1, 0.8, 0.6); knot.add(k);
    const tails = [-1, 1].map(s => { const t = new THREE.Group(); t.position.x = s * 0.02; knot.add(t); const m = P(new THREE.BoxGeometry(0.04, 0.13, 0.01), rm); m.position.y = -0.065; t.add(m); return t; });
    upd.push((dt, t) => tails.forEach((tg, i) => tg.rotation.set(0.35 + Math.sin(t * 3 + i) * 0.1, 0, (i ? 1 : -1) * (0.25 + Math.sin(t * 2.4 + i * 2) * 0.08))));
  } else if (kind === 'silk') {
    const hm = T(c0), oc = '#0a0a10';
    g.position.set(0.015, 0.272, -0.03); g.rotation.set(-0.14, 0, -0.14);
    const brim = P(lathe([[0.1, 0.01], [0.155, 0.006], [0.172, 0.022], [0.176, 0.012], [0.16, -0.008], [0.1, -0.006]], 32), T(c0, { side: THREE.DoubleSide }), { oc }); g.add(brim);
    const crown = P(new THREE.CylinderGeometry(0.122, 0.108, 0.22, 28), hm, { oc }); crown.position.y = 0.12; g.add(crown);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.111, 0.11, 0.045, 28, 1, true), T(c1, { side: THREE.DoubleSide })); band.position.y = 0.04; g.add(band);
    // 帯の横の小さな花かざり
    const fl = new THREE.Group(); fl.position.set(0.1, 0.045, 0.04); fl.rotation.y = 1.1; g.add(fl);
    for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2, p = P(new THREE.SphereGeometry(0.016, 8, 6), T('#ffffff'), { thick: 0.0012 }); p.position.set(Math.cos(a) * 0.016, Math.sin(a) * 0.016, 0); fl.add(p); }
    const cen = new THREE.Mesh(new THREE.SphereGeometry(0.011, 8, 6), T('#ffd24a')); cen.position.z = 0.006; fl.add(cen);
  } else if (kind === 'beret') {
    const bm = T(c0), oc = dark2(c0);
    g.position.set(0.03, 0.262, -0.03); g.rotation.set(-0.1, 0, -0.3);
    const top = P(new THREE.SphereGeometry(0.27, 32, 16), bm, { oc }); top.scale.set(1, 0.3, 0.95); g.add(top);
    const rim = P(new THREE.TorusGeometry(0.205, 0.022, 8, 32), T(c1), { oc }); rim.rotation.x = Math.PI / 2; rim.scale.set(1, 0.95, 1); rim.position.y = -0.03; g.add(rim);
    const stem = P(new THREE.CylinderGeometry(0.01, 0.014, 0.05, 8), T(c1), { oc }); stem.position.y = 0.09; g.add(stem);
  } else if (kind === 'clown') {
    const stripes = outfitCanvas(256, 64, (x, W, H) => { for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? c1 : c0; x.fillRect(i * W / 8, 0, W / 8 + 1, H); } });
    g.position.set(0.02, 0.255, -0.02); g.rotation.set(-0.12, 0, -0.26);
    const cg = new THREE.ConeGeometry(0.15, 0.4, 24, 1, true); cg.translate(0, 0.2, 0);
    const cone = P(cg, T('#ffffff', { map: stripes, side: THREE.DoubleSide }), { oc: dark2(c0) }); g.add(cone);
    // ふちのひだ（小さな玉を輪に）と、てっぺんのゆれるぽんぽん
    const fm = T(c1);
    for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, b = P(new THREE.SphereGeometry(0.032, 10, 8), fm, { oc: dark2(c1), thick: 0.0015 }); b.scale.set(1, 0.7, 1); b.position.set(Math.cos(a) * 0.15, 0.005, Math.sin(a) * 0.15); g.add(b); }
    const tip = new THREE.Group(); tip.position.y = 0.4; g.add(tip);
    const pom = P(new THREE.SphereGeometry(0.05, 14, 10), T(c1, { emissive: new THREE.Color(c1), emissiveIntensity: 0.2 }), { oc: dark2(c1) }); pom.position.y = 0.03; tip.add(pom);
    upd.push((dt, t) => { tip.rotation.z = Math.sin(t * 3.1) * 0.25; tip.rotation.x = Math.sin(t * 2.3) * 0.15; });
  }
}

// ---------- 服 ----------
// 胴の旋盤（buildCat の胴より少し大きく。u=0.5 が正面、u<0.5 がキャラクターの右側。v=0 が下）
const SUIT_PROFILE = [[0.136, -0.072], [0.194, -0.004], [0.214, 0.09], [0.2, 0.19], [0.165, 0.27], [0.118, 0.322]];
function suitRadius(y) {   // 高さ y での上着の半径（ボタンを面に置く）
  const p = SUIT_PROFILE; for (let i = 1; i < p.length; i++) if (y <= p[i][1]) { const k = (y - p[i - 1][1]) / (p[i][1] - p[i - 1][1]); return lerp(p[i - 1][0], p[i][0], k); }
  return p[p.length - 1][0];
}
function suitTex(L) {
  const [c0, c1, c2, c3] = L.suitCol || ['#888888', '#ffffff', '#ff0000', '#00aaff'];
  return outfitCanvas(512, 256, (g, W, H) => {
    g.fillStyle = c0; g.fillRect(0, 0, W, H);
    switch (L.suit) {
      case 'sweater': {   // 横じま。すそと首もとはゴム編み
        for (let i = 0; i < 8; i++) if (i % 2) { g.fillStyle = c1; g.fillRect(0, 20 + i * 27, W, 27); }
        g.fillStyle = 'rgba(0,0,0,.18)'; for (let x = 0; x < W; x += 6) { g.fillRect(x, H - 22, 2, 22); g.fillRect(x, 0, 2, 16); }
        g.fillStyle = 'rgba(255,255,255,.06)'; for (let y = 0; y < H; y += 5) for (let x = (y / 5 % 2) * 4; x < W; x += 8) g.fillRect(x, y, 3, 2);
        break;
      }
      case 'happi': {     // 前あわせの白い襟（首の後ろから前へ）、すその白い波、腰の帯は形で
        g.fillStyle = c1; g.fillRect(0, 0, W, 14);
        g.fillRect(W * 0.425, 0, W * 0.05, H); g.fillRect(W * 0.525, 0, W * 0.05, H);
        g.fillStyle = 'rgba(0,0,0,.25)'; g.fillRect(W * 0.522, 0, 3, H);
        g.fillStyle = c1; g.beginPath(); g.moveTo(0, H);
        for (let x = 0; x <= W; x += 16) g.quadraticCurveTo(x + 8, H - 40, x + 16, H - 24);
        g.lineTo(W, H); g.closePath(); g.fill();
        g.strokeStyle = c1; g.lineWidth = 3;
        for (let x = 0; x < W; x += 32) { g.beginPath(); g.arc(x + 16, H - 52, 9, Math.PI, 0); g.stroke(); }
        break;
      }
      case 'tux': {       // 黒い上着の前に、白いシャツの V と黒いボタン、えりの光るふち
        const cx = W / 2;
        g.fillStyle = c1; g.beginPath(); g.moveTo(cx - 46, 0); g.lineTo(cx + 46, 0); g.lineTo(cx, H * 0.62); g.closePath(); g.fill();
        g.strokeStyle = 'rgba(255,255,255,.22)'; g.lineWidth = 10; g.beginPath(); g.moveTo(cx - 60, 0); g.lineTo(cx - 4, H * 0.66); g.moveTo(cx + 60, 0); g.lineTo(cx + 4, H * 0.66); g.stroke();
        g.fillStyle = '#16161c'; for (const y of [0.3, 0.45]) { g.beginPath(); g.arc(cx, H * y, 5, 0, Math.PI * 2); g.fill(); }
        g.fillStyle = 'rgba(255,255,255,.15)'; for (const y of [0.72, 0.84]) { g.beginPath(); g.arc(cx - 12, H * y, 6, 0, Math.PI * 2); g.fill(); }
        break;
      }
      case 'clown': {     // 右と左で色ちがい（まん中と背中で分かれる）、それぞれに水玉
        g.fillStyle = c1; g.fillRect(W / 2, 0, W / 2, H);
        const rnd = outfitRand(11);
        for (let i = 0; i < 30; i++) {
          const x = rnd() * W, y = 16 + rnd() * (H - 32), right = x < W / 2;
          if (Math.abs(x - W / 2) < 18 || x < 10 || x > W - 10) continue;
          g.fillStyle = right ? c2 : c3; g.beginPath(); g.arc(x, y, 9 + rnd() * 5, 0, Math.PI * 2); g.fill();
        }
        break;
      }
    }
  });
}
function outfitSuit(L, { neck, hips, armR, armL, legR, legL, P, T }) {
  const [c0, c1, c2, c3] = L.suitCol || ['#888888', '#ffffff', '#ff0000', '#00aaff'], kind = L.suit, oc = dark2(c0);
  const geo = lathe(SUIT_PROFILE, 32); geo.rotateY(Math.PI);
  const sm = T('#ffffff', { map: suitTex(L) });
  const coat = P(geo, sm, { oc }); coat.scale.z = 0.88; hips.add(coat);
  const onFront = (y, out = 0.012) => V3(0, y, suitRadius(y) * 0.88 + out);
  // 袖：上腕と前腕に、ひとまわり太い筒をかぶせる（puff：肩をふくらませる）
  const sleeve = (a, col, o = {}) => {
    const m = T(col);
    if (o.puff) { const p = P(new THREE.SphereGeometry(0.085, 14, 10), m, { oc: dark2(col) }); p.position.y = -0.045; p.scale.set(1, 0.95, 1); a.pv.add(p); }
    else { const u = P(new THREE.CapsuleGeometry(0.062, 0.06, 4, 12), m, { oc: dark2(col) }); u.position.y = -0.05; a.pv.add(u); }
    if (o.long) { const f = P(new THREE.CapsuleGeometry(0.057, 0.03, 4, 12), m, { oc: dark2(col) }); f.position.y = -0.02; a.el.add(f); }
    if (o.wide) { const w = P(new THREE.CylinderGeometry(0.068, 0.088, 0.1, 14, 1, true), T(col, { side: THREE.DoubleSide }), { oc: dark2(col) }); w.position.y = -0.085; a.pv.add(w); }
    if (o.cuff) { const cf = P(new THREE.TorusGeometry(0.056, 0.016, 6, 18), T(o.cuff), { oc: dark2(o.cuff), thick: 0.0015 }); cf.rotation.x = Math.PI / 2; cf.position.y = o.long ? -0.045 : -0.1; (o.long ? a.el : a.pv).add(cf); }
  };
  const pants = (lg, col) => { const t = P(new THREE.CapsuleGeometry(0.076, 0.04, 4, 12), T(col), { oc: dark2(col) }); t.position.y = -0.05; lg.pv.add(t); };
  if (kind === 'sweater') {
    for (const a of [armR, armL]) sleeve(a, c0, { long: true, cuff: c1 });
    const tn = P(new THREE.TorusGeometry(0.112, 0.036, 8, 28), T(c0), { oc }); tn.rotation.x = Math.PI / 2; tn.scale.y = 0.88; tn.position.y = 0.004; neck.add(tn);
  } else if (kind === 'happi') {
    for (const a of [armR, armL]) sleeve(a, c0, { wide: true });
    const belt = P(new THREE.TorusGeometry(0.212, 0.024, 6, 32), T(c2), { oc: dark2(c2) }); belt.rotation.x = Math.PI / 2; belt.scale.y = 0.88; belt.position.y = 0.05; hips.add(belt);
    const kn = P(new THREE.SphereGeometry(0.03, 10, 8), T(c2), { oc: dark2(c2) }); kn.scale.set(1.3, 0.8, 0.6); kn.position.copy(onFront(0.05, 0.03)).setX(0.08); hips.add(kn);
    // はちまきは帽子の枠なので、ここでは首もとのたたんだ襟だけ
    const col = P(new THREE.TorusGeometry(0.118, 0.02, 6, 28), T(c1), { oc: '#8a8a96' }); col.rotation.x = Math.PI / 2; col.scale.y = 0.88; col.position.y = 0.0; neck.add(col);
  } else if (kind === 'tux') {
    for (const a of [armR, armL]) sleeve(a, c0, { long: true, cuff: c1 });
    for (const lg of [legR, legL]) pants(lg, c0);
    // 蝶ネクタイ：二つの三角と、まん中の結び目
    const bm = T(c2), bow = new THREE.Group(); bow.position.set(0, 0.0, 0.118); neck.add(bow);
    for (const s of [-1, 1]) { const w = P(new THREE.ConeGeometry(0.03, 0.06, 4), bm, { oc: dark2(c2), thick: 0.0015 }); w.rotation.z = s * Math.PI / 2; w.scale.z = 0.5; w.position.x = s * 0.03; bow.add(w); }
    const k = P(new THREE.SphereGeometry(0.016, 8, 6), bm, { oc: dark2(c2), thick: 0.0015 }); k.position.z = 0.006; bow.add(k);
    // 白い立ち襟
    const cl = new THREE.Mesh(new THREE.CylinderGeometry(0.108, 0.118, 0.035, 28, 1, true), T(c1, { side: THREE.DoubleSide })); cl.scale.z = 0.88; cl.position.y = 0.012; neck.add(cl);
  } else if (kind === 'clown') {
    // 袖とズボンは、胴と反対の色（右の胴が c0 なら右の袖は c1）
    sleeve(armR, c1, { puff: true, cuff: c2 }); sleeve(armL, c0, { puff: true, cuff: c2 });
    pants(legR, c1); pants(legL, c0);
    // ぽんぽんのボタン
    [0.04, 0.13, 0.22].forEach((y, i) => { const b = P(new THREE.SphereGeometry(0.03, 12, 10), T(i % 2 ? c3 : c2), { oc: dark2(i % 2 ? c3 : c2), thick: 0.0015 }); b.position.copy(onFront(y, 0.014)); hips.add(b); });
    // ひらひらの襟：外の白い大きなひだと、内の色のひだ
    const ruff = (n, r, sz, col, y, rx) => { const m = T(col); for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, b = P(new THREE.SphereGeometry(sz, 10, 8), m, { oc: dark2(col), thick: 0.0016 }); b.scale.set(1, 0.42, 1); b.position.set(Math.cos(a) * r, y + Math.sin(a * 2) * 0.004, Math.sin(a) * r * 0.9); b.rotation.set(rx * Math.sin(a), 0, -rx * Math.cos(a)); neck.add(b); } };
    ruff(16, 0.185, 0.07, c2, -0.03, 0.4); ruff(14, 0.14, 0.055, c3, -0.006, 0.3);
  }
}
