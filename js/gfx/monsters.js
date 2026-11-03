'use strict';
// ============================================================
//  敵の3Dモデル（ENEMIES[key].shape ごと）
//  ネズミ・魔族・ピエロ・マオウなどは2頭身の骨組み（buildCat）を使い回す
// ============================================================

// 骨組みを使う敵の見た目
const CRITTER_LOOKS = {
  rat:       { look: { species: 'mouse', fur: '#a8a4b8', eye: '#ff5a6a', muzzle: '#e8e4f0', paws: '#f0c8d0', earIn: '#f2b8c0', kerchief: '#5a6a9a', blush: 0 }, gear: { weapon: 'fork' }, scale: 0.9, expr: 'angry' },
  kingrat:   { look: { species: 'mouse', fur: '#b8b0c4', eye: '#ff5a6a', muzzle: '#f0ecf4', paws: '#f0c8d0', earIn: '#f2b8c0', crown: '#ffcf4a', cape: '#8a2a3a', capeIn: '#ffcf4a', belly: '#f0ecf4', blush: 0.2 }, gear: { weapon: 'fork' }, scale: 2.2, expr: 'angry' },
  dog:       { look: { species: 'dog', fur: '#b08050', eye: '#3a2a20', muzzle: '#e8d0b0', paws: '#e8d0b0', earCol: '#7a5030', kerchief: null, scarf: '#c83a3a', scar: true, blush: 0 }, scale: 1.0, expr: 'angry' },
  clown:     { look: { fur: '#ffffff', pattern: 'spots', patches: ['#ff8ab8'], eye: '#6a8aff', muzzle: '#ffffff', paws: '#ffffff', earIn: '#ffb8c8', nose: '#ff3a4a', cap: '#ff6a8a', capType: 'clown', ruff: '#ffe07a', accent: '#6ad8ff', vest: '#8a5ad8', blush: 0.6 }, gear: { weapon: 'juggle', juggleArms: true }, scale: 1.7, expr: 'cry' },
  shadowcat: { look: { fur: '#4a3a6a', eye: '#ffe07a', muzzle: '#5a4a7a', paws: '#4a3a6a', earIn: '#8a6aaa', material: 'ghost', ghostCol: '#6a4aff', blush: 0 }, scale: 1.0, expr: 'serious' },
  shadowkuro:{ look: { fur: '#3a2a5a', eye: '#ff6aff', muzzle: '#4a3a6a', paws: '#3a2a5a', earIn: '#8a6aaa', scarf: '#5a2a6a', armor: '#4a3a6a', material: 'ghost', ghostCol: '#8a4aff', blush: 0 }, gear: { weapon: 'blade' }, scale: 1.6, expr: 'serious' },
  statue:    { look: { fur: '#c8b890', eye: '#8affe0', muzzle: '#c8b890', paws: '#c8b890', earIn: '#b0a078', material: 'stone', blush: 0, line: '#4a4030' }, scale: 1.15, expr: 'serious' },
  guardian:  { look: { fur: '#d8c890', eye: '#ffe07a', muzzle: '#d8c890', paws: '#d8c890', earIn: '#c0b080', material: 'stone', crown: '#e8c870', blush: 0, line: '#4a4030' }, scale: 2.7, expr: 'serious' },
  imp:       { look: { fur: '#8a6ad8', eye: '#ffe07a', muzzle: '#b8a0f0', paws: '#b8a0f0', earIn: '#ff9ac8', horns: '#fff0d8', wings: '#4a2a7a', cap: '#5a5a6a', capType: 'helmet', accent: '#ffcf4a', blush: 0.3 }, gear: { weapon: 'fork' }, scale: 1.0, expr: 'worry' },
  impnurse:  { look: { fur: '#ff9ac8', eye: '#7a4ad8', muzzle: '#ffd0e4', paws: '#ffd0e4', earIn: '#ff6a9a', horns: '#fff0d8', wings: '#8a3a6a', cap: '#ffffff', capType: 'chef', apron: '#ffffff', blush: 0.45 }, scale: 1.0, expr: 'smile' },
  impguard:  { look: { fur: '#c86a8a', eye: '#ffe07a', muzzle: '#f0b0c8', paws: '#f0b0c8', earIn: '#ffd0e0', horns: '#fff0d8', wings: '#6a2a4a', cap: '#4a4a5a', capType: 'helmet', accent: '#ff6a9a', armor: '#5a5a6a', blush: 0 }, gear: { weapon: 'fork' }, scale: 1.15, expr: 'serious' },
  impmaid:   { look: { fur: '#7ac8d8', eye: '#5a3ab8', muzzle: '#d0f0f6', paws: '#d0f0f6', earIn: '#ff9ac8', horns: '#fff0d8', wings: '#2a5a7a', kerchief: '#ffffff', apron: '#ffffff', ribbon: '#3a3a5a', blush: 0.4 }, gear: { weapon: 'broom' }, scale: 0.95, expr: 'worry' },
  impcook:   { look: { fur: '#e8a050', eye: '#5a2a1a', muzzle: '#fbe0b8', paws: '#fbe0b8', earIn: '#ff9ac8', horns: '#fff0d8', wings: '#7a3a1a', kerchief: '#e84a3a', apron: '#f6efe0', blush: 0.35 }, gear: { weapon: 'ladle' }, scale: 1.05, expr: 'neutral' },
  impboss:   { look: { fur: '#6a4ab8', eye: '#ffe07a', muzzle: '#9a80d8', paws: '#9a80d8', earIn: '#ff9ac8', horns: '#fff0d8', wings: '#3a1a5a', glasses: '#1a1a2a', vest: '#2a2a3a', ribbon: '#c83a3a', blush: 0 }, scale: 1.45, expr: 'worry' },
  maou:      { key: 'maou', scale: 1.7, expr: 'smug' },
  // 魔王軍四天王：js/npcs.js の人物の見た目を、そのまま大きくして使う
  k_gutsu:   { key: 'gutsugutsu', scale: 1.55, expr: 'joy' },
  k_nemu:    { key: 'nemunemu', scale: 1.55, expr: 'sleepy' },
  k_choki:   { key: 'chokichoki', scale: 1.5, expr: 'gentle' },
  k_dodon:   { key: 'dodon', scale: 1.6, expr: 'smug' },
  maouplush: { key: 'maou', look: { material: 'plush', fur: '#7a62a8', paws: '#7a62a8', muzzle: '#a890d0', earIn: '#d89ab8', eye: '#1a1a22', eyeScale: 0.7 }, gear: { weapon: null }, scale: 1.0, expr: 'neutral' },
  fakemike:  { key: 'mike', look: { patches: ['#3b302c', '#f29a3e'], eye: '#8a6aff', band: '#3a6ad8', cape: '#3a6ad8' }, scale: 1.0, expr: 'smug' },
  plush:     { key: 'kuro', look: { fur: '#5a5870', muzzle: '#6a6880', eye: '#1a1a22', eyeScale: 0.6, scarf: '#d86a8a', armor: null }, gear: { weapon: null }, scale: 1.25, expr: 'neutral' },
  nekogami:  { look: { fur: '#ffe8a8', pattern: 'tabby', patches: ['#f0c060'], eye: '#ffffff', eye2: '#ffffff', muzzle: '#fff6dc', paws: '#fff6dc', earIn: '#ffb8a8', crown: '#ffcf4a', cape: '#ffffff', capeIn: '#ffcf4a', sleepy: true, blush: 0.35 }, scale: 3.2, expr: 'sleepy' },
};

// のぼりの旗の模様：紫の地に、白い太字を縦に（ごろごろ団の総長）
const FLAG_TEX = {};
function bossFlagTex(text) {
  if (FLAG_TEX[text]) return FLAG_TEX[text];
  const c = document.createElement('canvas'); c.width = 64; c.height = 128;
  const g = c.getContext('2d');
  g.fillStyle = '#5a2a8a'; g.fillRect(0, 0, 64, 128);
  g.strokeStyle = '#ffd27a'; g.lineWidth = 4; g.strokeRect(3, 3, 58, 122);
  // 一文字ずつ縦にならべる（英語の BOSS のように文字が多いときは、小さく詰める）
  const chars = [...text], step = Math.min(46, 112 / chars.length);
  g.fillStyle = '#ffffff'; g.font = `bold ${Math.round(Math.min(40, step * 0.9))}px sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
  chars.forEach((ch, i, a) => g.fillText(ch, 32, 64 + (i - (a.length - 1) / 2) * step));
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (FLAG_TEX[text] = t);
}
// look：その場面だけの見た目（カラスの fish：魚の降ったイベントで、盗んだ魚をつかむ）
function buildEnemy(key, look = {}) {
  const d = ENEMIES[key], col = d.color;
  const C = CRITTER_LOOKS[d.shape];
  if (C) return critterEnemy(key, d, C);
  const root = new THREE.Group();
  const inner = new THREE.Group(); root.add(inner);
  const mats = [];
  const tm = (c, ex = {}) => { const m = toon(c, ex); m.userData.e0 = m.emissive.clone(); m.userData.ei0 = m.emissiveIntensity; mats.push(m); return m; };
  const dark = c => '#' + new THREE.Color(c).multiplyScalar(0.25).getHexString();
  const P = (geo, mat, o = {}) => outlined(geo, mat, { oc: o.oc || dark('#' + mat.color.getHexString()), thick: 0.0024, ...o });
  const add = (m, x, y, z, parent = inner) => { m.position.set(x, y, z); parent.add(m); return m; };
  const glow = glowMat(col, 3);
  // かわいい目（白目・黒目・ハイライト）。angry で吊り目のまぶた
  const eyes = (x, y, z, r, parent = inner, o = {}) => {
    const out = [];
    for (const s of [-1, 1]) {
      const g = new THREE.Group(); g.position.set(s * x, y, z); parent.add(g);
      const w = new THREE.Mesh(new THREE.SphereGeometry(r, 16, 12), tm(o.white || '#ffffff')); w.scale.z = 0.5; g.add(w);
      const p = new THREE.Mesh(new THREE.SphereGeometry(r * 0.62, 14, 10), new THREE.MeshBasicMaterial({ color: o.pupil || '#1a1420' })); p.position.z = r * 0.3; p.scale.z = 0.4; g.add(p);
      const h = new THREE.Mesh(new THREE.SphereGeometry(r * 0.22, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })); h.position.set(-r * 0.25, r * 0.28, r * 0.5); g.add(h);
      if (o.angry) { const lid = new THREE.Mesh(new THREE.BoxGeometry(r * 2.4, r * 0.35, r * 0.4), new THREE.MeshBasicMaterial({ color: o.lid || '#1a1420' })); lid.position.set(0, r * 0.75, r * 0.2); lid.rotation.z = s * 0.45; g.add(lid); }
      out.push(g);
    }
    return out;
  };
  const catEars = (x, y, z, s, m, parent = inner) => { for (const sd of [-1, 1]) { const g = new THREE.ConeGeometry(0.09 * s, 0.18 * s, 4); g.rotateY(Math.PI / 4); const e = add(P(g, m), sd * x, y, z, parent); e.scale.z = 0.5; e.rotation.z = -sd * 0.35; } };
  const coreGlow = (y, z, s) => {
    const core = add(new THREE.Mesh(new THREE.SphereGeometry(s, 16, 12), glow), 0, y, z);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 2), blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(s * 8); core.add(sp);
    return core;
  };
  let height = 1.2, radius = 0.6, float = 0, scale = 1, update = null, emitFn = null;

  switch (d.shape) {
    case 'slime': {   // ぷにスライム：ぷるぷる跳ねる。小さな猫耳つき
      const jm = tm(col, { transparent: true, opacity: 0.88 });
      const body = add(P(new THREE.SphereGeometry(0.5, 32, 20), jm), 0, 0.4, 0); body.scale.set(1, 0.8, 0.95);
      const hl = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 8), new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 })), -0.18, 0.62, 0.3); hl.scale.set(1, 0.6, 0.4);
      catEars(0.22, 0.75, 0, 0.9, jm);
      eyes(0.14, 0.45, 0.42, 0.075);
      const mo = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: '#1a3a2a' })), 0, 0.33, 0.46); mo.rotation.z = Math.PI;
      update = (dt, t) => { const b = Math.abs(Math.sin(t * 3 + root.userData.ph)); inner.position.y = b * 0.12; inner.scale.set(1 + (1 - b) * 0.08, 1 - (1 - b) * 0.12, 1 + (1 - b) * 0.08); };
      height = 0.9; radius = 0.55; break;
    }
    case 'mushroom': {   // ねこまたきのこ：ねこまた（しっぽが二股の猫の妖怪）になったきのこ。猫耳と猫の目のある水玉の傘、二股のしっぽ
      const stemM = tm('#f6ead2'), capM = tm(col), earIn = tm('#ffc8d6'), dotM = tm('#fff6f2'), tipM = tm('#fff6f2');
      const lineM = new THREE.MeshBasicMaterial({ color: '#3a2228' });
      // 動かない小さな部品は、一つの形にまとめて描く回数をへらす
      const bake = (list, mat, parent) => {
        const geos = list.map(m => { m.updateMatrix(); const g = m.geometry.clone().applyMatrix4(m.matrix); m.parent.remove(m); return g; });
        return add(new THREE.Mesh(THREEX.BufferGeometryUtils.mergeGeometries(geos), mat), 0, 0, 0, parent);
      };
      // 軸：下ぶくれ。傘は body に入れて、着地でいっしょにつぶれる
      const body = new THREE.Group(); inner.add(body);
      const SP = [[0.001, 0], [0.2, 0], [0.26, 0.04], [0.285, 0.12], [0.28, 0.22], [0.262, 0.34], [0.232, 0.46], [0.2, 0.58], [0.001, 0.6]];
      add(P(lathe(SP, 24), stemM), 0, 0, 0, body);
      // 傘：ふちが内へまるまった、ふっくらした丸い傘
      const cap = new THREE.Group(); cap.position.y = 0.55; body.add(cap);
      const capPt = f => [0.5 * Math.pow(Math.max(0, Math.cos(f)), 0.55), 0.4 * Math.pow(Math.max(0, Math.sin(f)), 0.9)];
      const CP = [[0.43, -0.045], [0.475, -0.035], [0.497, -0.012]];
      for (let i = 0; i <= 18; i++) CP.push(capPt(i / 18 * Math.PI / 2));
      CP[CP.length - 1][0] = 0.001;
      add(P(lathe(CP, 32), capM), 0, 0, 0, cap);
      // 傘の裏のひだ
      add(new THREE.Mesh(lathe([[0.17, 0.03], [0.3, 0.0], [0.44, -0.04]], 32), tm('#f2d8c8', { side: THREE.DoubleSide })), 0, 0, 0, cap);
      const gills = [];
      for (let i = 0; i < 20; i++) { const a = i / 20 * Math.PI * 2, g = add(new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.006, 0.24)), Math.sin(a) * 0.3, -0.012, Math.cos(a) * 0.3, cap); g.rotation.set(0, a, 0); g.rotateX(-0.25); gills.push(g); }
      bake(gills, tm('#d8b4a4'), cap);
      // 傘の上の点：φ（ふちから上へ）・θ（正面から横へ）で、表の位置と外向き
      const capAt = (f, th) => {
        const [r, y] = capPt(f), [r2, y2] = capPt(f + 0.01), n = V3(y2 - y, -(r2 - r), 0).normalize();
        return { p: V3(Math.sin(th) * r, y, Math.cos(th) * r), n: V3(Math.sin(th) * n.x, n.y, Math.cos(th) * n.x) };
      };
      // 白い水玉（傘の表にぴったり）
      const dots = [];
      for (const [f, th, s] of [[1.25, 0, 0.1], [0.8, 0.68, 0.075], [0.76, -0.72, 0.07], [0.25, 1.05, 0.07], [0.3, -1.15, 0.065], [0.3, 1.85, 0.07], [0.85, 2.4, 0.09], [0.55, -2.5, 0.08], [0.3, 3.1, 0.07], [1.2, -3.0, 0.07]]) {
        const { p, n } = capAt(f, th), dot = add(new THREE.Mesh(new THREE.SphereGeometry(s, 16, 10), dotM), p.x, p.y, p.z, cap);
        dot.quaternion.setFromUnitVectors(V3(0, 0, 1), n); dot.scale.set(1, 0.85, 0.28); dots.push(dot);
      }
      bake(dots, dotM, cap);
      // 猫耳：傘から生える。内がわは淡い桃色
      const ears = [-1, 1].map(s => {
        const { p, n } = capAt(0.92, s * 1.12), g = new THREE.Group(); g.position.copy(p).addScaledVector(n, -0.02); cap.add(g);
        g.quaternion.setFromUnitVectors(V3(0, 1, 0), n.clone().multiplyScalar(0.55).add(V3(0, 0.45, 0)).normalize());
        const tw = new THREE.Group(); g.add(tw);
        const eg = new THREE.ConeGeometry(0.13, 0.26, 14); eg.translate(0, 0.13, 0);
        add(P(eg, capM), 0, 0, 0, tw).scale.z = 0.5;
        const ig = new THREE.ConeGeometry(0.085, 0.18, 12); ig.translate(0, 0.09, 0);
        const ei = add(new THREE.Mesh(ig, earIn), 0, 0.02, 0.035, tw); ei.scale.z = 0.3;
        tw.rotation.y = -s * 0.5;
        return tw;
      });
      // 目：傘の正面に、いたずらっぽい半目の猫の目（金の瞳に縦長の黒目）。上まぶたは傘の色
      const eyeG = [-1, 1].map(s => {
        const { p, n } = capAt(0.42, s * 0.3), g = new THREE.Group(); g.position.copy(p).addScaledVector(n, -0.016); cap.add(g);
        g.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
        const w = add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 18, 12), tm('#ffffff')), 0, 0, 0, g); w.scale.set(1, 1.08, 0.45);
        const iris = add(new THREE.Mesh(new THREE.SphereGeometry(0.067, 16, 12), new THREE.MeshBasicMaterial({ color: '#f2b83a' })), s * -0.008, -0.008, 0.018, g); iris.scale.set(1, 1.08, 0.42);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.059, 12, 10), new THREE.MeshBasicMaterial({ color: '#1a1420' })), s * -0.008, -0.008, 0.028, g).scale.set(0.3, 1, 0.4);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })), -0.023, 0.028, 0.05, g);
        // 上まぶた：傘の色で目の上をおおい、ふちに黒い線。目じりが少し上がる
        const lid = new THREE.Group(); lid.rotation.z = s * 0.22; g.add(lid);
        const lg = add(new THREE.Mesh(new THREE.SphereGeometry(0.093, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.36), capM), 0, -0.008, 0, lid); lg.scale.set(1.05, 1.15, 0.5);
        const ln = add(new THREE.Mesh(new THREE.TorusGeometry(0.087, 0.01, 6, 20, Math.PI * 0.8), lineM), 0, 0.028, 0.016, lid); ln.rotation.z = Math.PI * 0.1; ln.scale.set(1.05, 0.55, 1);
        return g;
      });
      // 前足：根もとに、ちょこんと
      for (const s of [-1, 1]) add(P(new THREE.SphereGeometry(0.075, 14, 10), stemM), s * 0.12, 0.03, 0.22).scale.set(1, 0.6, 1.2);
      // 二本のしっぽ：軸のうしろから出て、傘のうしろで左右へ分かれて立つ。先は白い
      // 根もとは寝かせてうしろへのび、傘のうしろで立ちあがって（TC：上へ反る）、左右へ開き（TX）、先は外へくるり
      const TB = 1.25, TY = 1.15, TL = 0.154, TC = [0, 0.175, 0.335, 0.375, 0.225, 0.085, -0.08, -0.3], TX = [0, 0.2, 0.335, 0.3, 0.115, -0.045, -0.125, -0.035];
      const tails = [-1, 1].map(s => {
        const base = new THREE.Group(); base.position.set(s * 0.12, 0.14, -0.19); base.rotation.set(0, s * TY, -s * TB, 'YXZ'); inner.add(base);
        const segs = []; let par = base;
        for (let i = 0; i < TC.length; i++) {
          const q = new THREE.Group(); if (i) q.position.y = TL; par.add(q);
          const m = P(new THREE.CapsuleGeometry(0.078 - i * 0.005, TL * 0.72, 4, 10), i === TC.length - 1 ? tipM : capM); m.position.y = TL / 2; q.add(m);
          segs.push(q); par = q;
        }
        const tip = new THREE.Object3D(); tip.position.y = TL; par.add(tip);
        return { s, segs, tip };
      });
      // root.userData.puff（0〜1）：ねむりの胞子をためて、傘をふくらませる。0 にもどすと、ぶるっとふるえて吐きだす
      let pf = 0, shiver = 0;
      const tipW = V3();
      update = (dt, t) => {
        const ph = root.userData.ph, U = root.userData, want = U.puff || 0;
        if (want < pf - 0.3) shiver = 1;
        pf += (want - pf) * (1 - Math.exp(-(want > pf ? 11 : 14) * dt)); shiver = Math.max(0, shiver - dt * 2.5);
        // ぴょこぴょこ跳ねて、着地で軸と傘がつぶれる（ためているあいだは、じっと）
        const b = Math.abs(Math.sin(t * 3.2 + ph)), sq = Math.pow(1 - b, 6) * (1 - pf);
        inner.position.y = b * 0.07 * (1 - pf);
        body.scale.set(1 + sq * 0.07, 1 - sq * 0.1 - pf * 0.04, 1 + sq * 0.07);
        const sh = Math.sin(t * 60) * shiver * 0.05;
        cap.scale.set(1 + sq * 0.05 + pf * 0.14 + sh, 1 - sq * 0.08 + pf * 0.16 - sh, 1 + sq * 0.05 + pf * 0.14 + sh);
        cap.rotation.z = Math.sin(t * 1.6 + ph) * 0.05; cap.rotation.x = -pf * 0.12;
        // 耳：ときどきぴくっ。ためるときは伏せる
        ears.forEach((g, i) => { const tw = (t * 0.5 + ph + i * 2.3) % 5 > 4.82 ? 0.35 : 0; g.rotation.x = -tw - pf * 0.5; });
        // まばたき（ためるときは目をつむる）
        const bl = (t * 0.37 + ph) % 4 > 3.88 ? 0.12 : 1; eyeG.forEach(g => { g.scale.y = Math.min(bl, 1 - pf * 0.85); });
        // しっぽ：二本をずらして、根もとから先へ波がつたわる
        for (const { s, segs } of tails) {
          segs.forEach((q, i) => { q.rotation.z = s * TC[i] + Math.sin(t * 2.3 - i * 0.75 + ph + s) * 0.09 * (1 + i * 0.12); q.rotation.x = TX[i] + Math.sin(t * 1.7 - i * 0.55 + ph + s * 2) * 0.065; });
          segs[0].rotation.z += Math.sin(t * 1.15 + ph + s * 0.6) * 0.08;
        }
      };
      emitFn = (p, pos) => {
        // 傘のふちから、桃色の胞子がこぼれる。しっぽの先から、ねこまたの青紫の火の粉が立つ
        if (Math.random() < 0.06) { const a = Math.random() * Math.PI * 2; p.emit(V3(pos.x + Math.sin(a) * 0.45 * root.scale.x, pos.y + 0.48 * root.scale.y, pos.z + Math.cos(a) * 0.45 * root.scale.x), V3(Math.sin(a) * 0.1, -0.15, Math.cos(a) * 0.1), hdr('#ffb0d8', 1.3), { life: 1.4, size: 0.06, drag: 0.6 }); }
        for (const { tip } of tails) if (Math.random() < 0.04) { tip.getWorldPosition(tipW); p.emit(tipW.clone(), V3((Math.random() - 0.5) * 0.1, 0.35, (Math.random() - 0.5) * 0.1), hdr('#c9a0ff', 1.4), { life: 0.6, size: 0.05, drag: 0.5 }); }
      };
      height = 1.15; radius = 0.55; break;
    }
    case 'squirrel': {   // おこりリス：どんぐりを守る森の子リス。どんぐりの帽子に、ふさ毛の耳。ほお袋ぱんぱんで、むっとした大きな黒目と出っ歯。両手で大きなどんぐりを抱え、頭より高く立つ S 字のしっぽ。ときどき足を踏み鳴らして、しっぽをぼわっとふくらませる
      const BU = THREEX.BufferGeometryUtils;
      // 描く回数をへらすため、いっしょに動く部品は頂点の色をつけて一つの形にまとめる（boar と同じ）
      const vcM = tm('#ffffff', { vertexColors: true }), flatM = new THREE.MeshBasicMaterial({ vertexColors: true });
      const tint = (g, c) => { if (c != null) { const k = new THREE.Color(c), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) k.toArray(a, i); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); } g.deleteAttribute('uv'); return g; };
      // 面の向き（n）で色を決める。形を変える前に塗る
      const paint = (g, fn) => { const q = g.attributes.normal, n = V3(), c = new THREE.Color(), a = new Float32Array(q.count * 3); for (let k = 0; k < q.count; k++) { fn(n.fromBufferAttribute(q, k), c); c.toArray(a, k * 3); } g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
      const merged = (list, parent, oc, mat = vcM) => add(oc ? P(BU.mergeGeometries(list), mat, { oc }) : new THREE.Mesh(BU.mergeGeometries(list), mat), 0, 0, 0, parent);
      const ss = (x, a, b) => { const k = clamp((x - a) / (b - a), 0, 1); return k * k * (3 - 2 * k); };
      const fur = new THREE.Color(col), furDark = new THREE.Color('#b8703a'), cream = new THREE.Color('#fff0dc');
      const tailC = new THREE.Color('#c97a3e'), tailLight = new THREE.Color('#f6cf98'), browC = '#6a3a1e', ocFur = dark(col);
      // どんぐりの殻斗（帽子）：うろこが互いちがいに並んで、ぽこぽこ盛りあがる半球
      const cupule = (r, c0, c1) => {
        const g = new THREE.SphereGeometry(r, 56, 16, 0, Math.PI * 2, 0, Math.PI / 2), q = g.attributes.position, v = V3(), a = new Float32Array(q.count * 3), c = new THREE.Color(), A = new THREE.Color(c0), B = new THREE.Color(c1);
        for (let k = 0; k < q.count; k++) {
          v.fromBufferAttribute(q, k); const ph = Math.acos(clamp(v.y / r, -1, 1)), az = Math.atan2(v.x, v.z);
          const row = ph / (Math.PI / 2) * 5, u = az / (Math.PI * 2) * 14 + (Math.floor(row) % 2) * 0.5;
          const bump = Math.sin(Math.PI * (u - Math.floor(u))) * Math.sin(Math.PI * (row - Math.floor(row))) * Math.min(1, ph * 3);
          v.multiplyScalar(1 + bump * 0.07); q.setXYZ(k, v.x, v.y, v.z);
          c.copy(B).lerp(A, bump).toArray(a, k * 3);
        }
        g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); g.computeVertexNormals();
        const rim = tint(new THREE.TorusGeometry(r * 1.02, r * 0.1, 6, 32).rotateX(Math.PI / 2), c1);
        return [g, rim];
      };
      // 全体を少し前へ（しっぽがうしろへ大きいぶん、足もとの中心をそろえる）
      const rig = new THREE.Group(); rig.position.z = 0.12; inner.add(rig);
      // ---- 胴：洋なしの形で、すわった太もも。おなかはクリーム色、背は濃い
      {
        const tg = paint(new THREE.SphereGeometry(0.25, 26, 18), (n, c) => {
          c.copy(fur).lerp(furDark, ss(-n.z, 0.2, 0.9) * 0.55).lerp(cream, ss(n.z, 0.15, 0.5) * (1 - ss(n.y, 0.55, 0.85)));
        });
        tg.scale(1, 1.12, 0.95); tg.translate(0, 0.36, 0);
        const thighs = [-1, 1].map(s => paint(new THREE.SphereGeometry(0.14, 16, 12), (n, c) => c.copy(fur).lerp(furDark, ss(-n.z, 0.3, 1) * 0.4)).scale(0.85, 1, 1.15).translate(s * 0.16, 0.16, -0.01));
        merged([tg, ...thighs], rig, ocFur);
      }
      // 足：長い後ろ足。右足を踏み鳴らす
      const feet = [-1, 1].map(s => {
        const g = new THREE.Group(); g.position.set(s * 0.13, 0.03, 0.02); rig.add(g);
        const fg = tint(new THREE.CapsuleGeometry(0.05, 0.13, 4, 10), furDark);
        fg.rotateX(Math.PI / 2); fg.scale(1.1, 0.7, 1); fg.translate(0, 0.01, 0.09);
        merged([fg], g, ocFur);
        return g;
      });
      // ---- 腕と、抱えたどんぐり。どんぐり投げでは、両手で頭の上へふりかぶる（userData.flap）
      const arms = new THREE.Group(); arms.position.set(0, 0.55, 0.06); rig.add(arms);
      const acorn = new THREE.Group(); acorn.position.set(0, -0.1, 0.26); arms.add(acorn);
      {
        const list = [];
        for (const s of [-1, 1]) {
          const a = V3(s * 0.17, 0, -0.02), b = V3(s * 0.085, -0.09, 0.2), d = b.clone().sub(a), L = d.length();
          const g = tint(new THREE.CapsuleGeometry(0.048, L, 4, 10), fur);
          g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d.normalize())); g.translate((a.x + b.x) / 2, (a.y + b.y) / 2, (a.z + b.z) / 2);
          list.push(g, tint(new THREE.SphereGeometry(0.055, 12, 10).scale(0.9, 1, 1).translate(b.x, b.y, b.z), '#f6dcbc'));
        }
        merged(list, arms, ocFur);
        // どんぐり：つやのある実（先が少し明るい）と、うろこの帽子、ちょこんと軸
        const nut = paint(new THREE.SphereGeometry(0.085, 16, 12), (n, c) => c.set('#b06a2a').lerp(new THREE.Color('#d89a50'), ss(-n.y, 0.3, 1) * 0.6));
        nut.scale(1, 1.22, 1);
        const [cg, rim] = cupule(0.09, '#8a5a30', '#5e3a1c');
        cg.scale(1, 0.75, 1); cg.translate(0, 0.035, 0); rim.translate(0, 0.035, 0);
        const stem = tint(new THREE.CylinderGeometry(0.012, 0.016, 0.05, 6).translate(0, 0.12, 0), '#5e3a1c');
        merged([nut, cg, rim, stem], acorn, '#2a1a10');
        acorn.rotation.z = 0.25;
      }
      // ---- 頭：大きな丸い頭に、ぱんぱんのほお袋と鼻づら
      const H = new THREE.Group(); H.position.set(0, 0.8, 0.03); rig.add(H);
      const HS = V3(0.27 * 1.06, 0.27 * 0.96, 0.27 * 0.98);
      const onHead = (az, el, k = 1) => V3(Math.sin(az) * Math.cos(el) * HS.x * k, Math.sin(el) * HS.y * k, Math.cos(az) * Math.cos(el) * HS.z * k);
      const nHead = (az, el) => V3(Math.sin(az) * Math.cos(el) / HS.x, Math.sin(el) / HS.y, Math.cos(az) * Math.cos(el) / HS.z).normalize();
      {
        const hg = paint(new THREE.SphereGeometry(0.27, 30, 22), (n, c) => {
          c.copy(fur).lerp(furDark, ss(n.y, 0.5, 1) * 0.35 + ss(-n.z, 0.4, 1) * 0.3).lerp(cream, ss(n.z, 0.55, 0.85) * (1 - ss(n.y, 0.05, 0.3)) + ss(-n.y, 0.6, 0.9) * ss(n.z, -0.1, 0.4));
        });
        hg.scale(1.06, 0.96, 0.98);
        const cheeks = [-1, 1].map(s => paint(new THREE.SphereGeometry(0.118, 18, 14), (n, c) => c.copy(cream).lerp(fur, ss(n.y, 0.35, 0.8) * 0.7 + ss(-n.z, 0.3, 0.9) * 0.6)).scale(1, 0.88, 0.9).translate(s * 0.15, -0.085, 0.15));
        const snout = tint(new THREE.SphereGeometry(0.075, 16, 12).scale(1.15, 0.85, 1).translate(0, -0.06, 0.232), cream);
        merged([hg, ...cheeks, snout], H, ocFur);
      }
      // 顔の線：鼻、ω の口、出っ歯（陰をつけない）
      {
        const nose = tint(new THREE.SphereGeometry(0.03, 12, 8).scale(1.35, 0.9, 0.8).translate(0, -0.03, 0.305), '#d85a6a');
        const nhl = tint(new THREE.SphereGeometry(0.009, 6, 4).translate(-0.01, -0.02, 0.326), '#ffd8dc');
        const ml = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(-0.046, -0.086, 0.264), V3(-0.036, -0.099, 0.278), V3(-0.018, -0.101, 0.288), V3(0, -0.088, 0.293), V3(0.018, -0.101, 0.288), V3(0.036, -0.099, 0.278), V3(0.046, -0.086, 0.264)]), 16, 0.0055, 4);
        const nl = new THREE.TubeGeometry(new THREE.CatmullRomCurve3([V3(0, -0.05, 0.3), V3(0, -0.07, 0.297), V3(0, -0.088, 0.292)]), 4, 0.005, 4);
        const teeth = [-1, 1].map(s => tint(new THREE.BoxGeometry(0.026, 0.048, 0.012).translate(s * 0.0145, -0.112, 0.282), '#ffffff'));
        const gap = tint(new THREE.BoxGeometry(0.003, 0.046, 0.013).translate(0, -0.112, 0.283), '#c8b8a8');
        merged([nose, nhl, tint(ml, '#3a1a14'), tint(nl, '#3a1a14'), ...teeth, gap], H, null, flatM);
      }
      // 口の中：かみつき（userData.jaw）や、怒って歯をカチカチ鳴らすときに、出っ歯の下にあく
      const jaw = new THREE.Group(); jaw.position.set(0, -0.098, 0.268); H.add(jaw);
      const mouth = add(new THREE.Mesh(new THREE.SphereGeometry(0.042, 14, 10).translate(0, -0.04, 0), new THREE.MeshBasicMaterial({ color: '#5a1a24' })), 0, 0, 0, jaw);
      mouth.scale.set(1, 0.05, 0.45);
      // 目：白目のない、つやつやの大きな黒目（下ほど茶色）に、大小のハイライト。上まぶたと眉は、表情（userData.mood）で動く
      const eyesG = new THREE.Group(); H.add(eyesG);
      const lidM = tm(col), browM = new THREE.MeshBasicMaterial({ color: '#74401f' }), eyeL = [], browL = [];
      {
        const blush = [], eyeTop = new THREE.Color('#1c100c'), eyeLow = new THREE.Color('#8a5230');
        for (const s of [-1, 1]) {
          const az = s * 0.37, el = 0.15, n = nHead(az, el);
          const g = new THREE.Group(); g.position.copy(onHead(az, el, 0.97)); g.quaternion.setFromUnitVectors(V3(0, 0, 1), n); eyesG.add(g);
          merged([
            paint(new THREE.SphereGeometry(0.084, 22, 16), (v, c) => c.copy(eyeTop).lerp(eyeLow, ss(-v.y, 0.15, 0.85) * 0.85)).scale(0.86, 1.06, 0.42),
            tint(new THREE.SphereGeometry(0.02, 12, 8).scale(1, 1.15, 0.4).translate(-s * 0.004 - 0.026, 0.034, 0.036), '#ffffff'),
            tint(new THREE.SphereGeometry(0.01, 8, 6).scale(1, 1, 0.4).translate(-s * 0.004 + 0.024, -0.028, 0.035), '#ffffff'),
          ], g, null, flatM);
          // 上まぶた（毛の色）：目の上はしから下へのびる（lp.scale.y でかぶさる深さ、lr で傾き）
          const lr = new THREE.Group(); g.add(lr);
          const lp = new THREE.Group(); lp.position.y = 0.094; lr.add(lp);
          add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 20, 8, 0, Math.PI * 2, 0, Math.PI * 0.55).scale(1, 1.04, 0.47).translate(0, -0.094, 0), lidM), 0, 0, 0, lp);
          eyeL.push({ s, lr, lp });
          // 眉：短い太まゆ。傾き（br.rotation.z）で、怒り（目がしらが下がる）・こまり（目がしらが上がる）
          const ba = s * 0.23, be = 0.42, bn = nHead(ba, be);
          const bg = new THREE.Group(); bg.position.copy(onHead(ba, be, 1.03)); bg.quaternion.setFromUnitVectors(V3(0, 0, 1), bn); H.add(bg);
          const br = new THREE.Group(); bg.add(br);
          add(new THREE.Mesh(new THREE.CapsuleGeometry(0.014, 0.04, 4, 8).rotateZ(Math.PI / 2).scale(1, 1, 0.5), browM), 0, 0, 0, br);
          browL.push({ s, br });
          // ほっぺの赤み：ほお袋の前に
          const bd = V3(s * 0.55, 0.15, 0.82).normalize(), bp = V3(s * 0.15, -0.085, 0.15).add(V3(bd.x * 0.118, bd.y * 0.104, bd.z * 0.106));
          blush.push(new THREE.SphereGeometry(0.042, 14, 8).scale(1.35, 0.75, 0.25).applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), bd)).translate(bp.x, bp.y, bp.z));
        }
        add(new THREE.Mesh(BU.mergeGeometries(blush), new THREE.MeshBasicMaterial({ color: '#ff8a9a', transparent: true, opacity: 0.5, depthWrite: false })), 0, 0, 0, H);
      }
      // 耳：先にふさ毛。ときどきぴくっ
      const ears = [-1, 1].map(s => {
        const az = s * 1.22, el = 0.6, g = new THREE.Group(); g.position.copy(onHead(az, el, 0.9)); H.add(g);
        g.rotation.set(-0.15, s * 0.25, -s * 0.38, 'YXZ');
        const tw = new THREE.Group(); g.add(tw);
        const outer = tint(new THREE.ConeGeometry(0.075, 0.2, 14).translate(0, 0.1, 0).scale(1, 1, 0.55), fur);
        const inn = tint(new THREE.ConeGeometry(0.048, 0.13, 12).translate(0, 0.075, 0).scale(1, 1, 0.3).translate(0, 0, 0.022), '#ffb8c0');
        const tufts = [[-0.2, 0.026, 0.12], [-0.6, 0.016, 0.07]].map(([r, w, h]) => tint(new THREE.ConeGeometry(w, h, 8).translate(0, h * 0.42, 0).rotateZ(r * s).translate(0, 0.17, 0).scale(1, 1, 0.6), '#9a5a30'));
        merged([outer, inn, ...tufts], tw, ocFur);
        return tw;
      });
      // どんぐりの帽子：頭のてっぺんに、少しななめに
      {
        const capG = new THREE.Group(); capG.position.set(0.015, 0.205, -0.01); capG.rotation.set(-0.12, 0, -0.16); H.add(capG);
        const [cg, rim] = cupule(0.165, '#9a6838', '#62401f');
        cg.scale(1, 0.78, 1);
        const stem = tint(new THREE.CylinderGeometry(0.016, 0.022, 0.07, 7).rotateZ(0.35).translate(-0.012, 0.15, 0), '#5a3a1c');
        merged([cg, rim, stem], capG, '#2a1a10');
      }
      // ---- しっぽ：うしろへ寝かせてから背中にそって立ちあがり、頭より高いところで先がうしろへくるり（S 字）。ふさふさの毛のかたまりを、ふしごとに
      const TA = [-1.5, -0.95, -0.25, 0.12, 0.2, 0.0, -0.6, -1.35], TL = 0.165, TR = [0.1, 0.13, 0.155, 0.17, 0.18, 0.18, 0.165, 0.135];
      const tailBase = new THREE.Group(); tailBase.position.set(0, 0.14, -0.2); rig.add(tailBase);
      const segs = [], blobs = []; {
        let par = tailBase;
        TA.forEach((a, i) => {
          const q = new THREE.Group(); if (i) q.position.y = TL; q.rotation.x = a - (i ? TA[i - 1] : 0); par.add(q);
          const r = TR[i], g = new THREE.SphereGeometry(r, 18, 14), qq = g.attributes.position, v = V3(), ca = new Float32Array(qq.count * 3), c = new THREE.Color();
          for (let k = 0; k < qq.count; k++) {
            v.fromBufferAttribute(qq, k).normalize(); const az = Math.atan2(v.x, v.z), ph = Math.acos(clamp(v.y, -1, 1));
            const cl = Math.max(0, Math.sin(az * 5 + i * 1.7) * Math.sin(ph * 4 + i)), tip = i / (TA.length - 1);
            v.multiplyScalar(r * (1 + cl * 0.09)); qq.setXYZ(k, v.x, v.y, v.z);
            c.copy(tailC).lerp(tailLight, cl * 0.55 + tip * 0.2).toArray(ca, k * 3);
          }
          g.setAttribute('color', new THREE.BufferAttribute(ca, 3)); g.deleteAttribute('uv'); g.computeVertexNormals(); g.scale(1, 1.2, 0.9);
          const b = add(P(g, vcM, { oc: ocFur }), 0, TL * 0.5, 0, q);
          segs.push(q); blobs.push(b); par = q;
        });
      }
      // ---- 動き
      // 走る速さは、体が動いた道のりから（戦闘のとびかかり・舞台で走ってくるとき）。走るとぴょんぴょん跳ねて、しっぽがうしろへ流れる
      // 会話の場面では userData で：mood（表情。なし／'angry' は怒り顔）・talk（しゃべる口）・push（両手で押す）・bow（おじぎ）・drop（抱えたどんぐりを足もとに置く）・swish（しっぽでなでる）
      // look.acorn === false：どんぐりを持たない（手ぶらで押す場面）
      const MOODS = {
        angry:    { brow: 0.42, by: 0, lidA: 0.22, lid: 0.34, ear: 0, puff: 0, shiver: 0, mouth: 0, head: 0, droop: 0 },
        happy:    { brow: -0.12, by: 0.01, lidA: 0, lid: 0.02, ear: -0.1, puff: 0, shiver: 0, mouth: 0, head: -0.05, droop: 0 },
        surprise: { brow: -0.2, by: 0.02, lidA: 0, lid: 0.001, ear: -0.2, puff: 0.35, shiver: 0, mouth: 0.4, head: -0.08, droop: 0 },
        scared:   { brow: -0.55, by: 0.014, lidA: -0.06, lid: 0.001, ear: 0.85, puff: 1, shiver: 1, mouth: 0.22, head: 0.08, droop: 0 },
        sorry:    { brow: -0.5, by: 0.008, lidA: -0.22, lid: 0.48, ear: 0.6, puff: 0, shiver: 0, mouth: 0, head: 0.22, droop: 0.45 },
      };
      const mc = { ...MOODS.angry };
      if (look.acorn === false) acorn.visible = false;
      let gp = 0, spd = 0, lx = null, lz = 0, armA = 0, prevFlap = 0, throwT = 0, regrow = 1, jawS = 0, puff = 0, lastLift = 0, look2 = 0, stompHit = false;
      let pushS = 0, bowS = 0, swishS = 0, dropped = false, dropT = 0;
      const dropFrom = V3(), dropTo = V3();
      update = (dt, t) => {
        const U = root.userData, ph = U.ph, k8 = 1 - Math.exp(-8 * dt);
        if (dt > 0) {
          const px = root.position.x, pz = root.position.z, d = lx == null ? 0 : Math.hypot(px - lx, pz - lz);
          const v = d > 2 ? 0 : d / dt / (root.scale.x || 1);
          spd += (Math.min(v, 8) - spd) * (1 - Math.exp(-8 * dt)); lx = px; lz = pz;
        }
        const run = clamp(Math.max(spd / 2.2, U.run || 0), 0, 1);
        gp += dt * (2.5 + run * 11);
        const M = MOODS[U.mood] || MOODS.angry;
        for (const k in mc) mc[k] += (M[k] - mc[k]) * k8;
        pushS += ((U.push || 0) - pushS) * k8; bowS += ((U.bow || 0) - bowS) * (1 - Math.exp(-6 * dt)); swishS += ((U.swish || 0) - swishS) * (1 - Math.exp(-4 * dt));
        // 怒り：ときどき右足をダンダンと二回踏み鳴らし、しっぽをぼわっとふくらませて、歯をカチカチ（怒り顔のときだけ）
        const angry = !U.mood || U.mood === 'angry';
        const ac = (t * 0.19 + ph * 0.37) % 1, ak = angry && ac > 0.84 ? (ac - 0.84) / 0.16 : 0, ang = ak ? Math.sin(ak * Math.PI) : 0;
        const lift = ak && run < 0.3 ? Math.max(0, Math.sin(ak * Math.PI * 4)) : 0;
        if (lastLift > 0.05 && lift <= 0.05 && ak > 0.1) stompHit = true;
        lastLift = lift;
        // 跳ねる：前のめりになって、弧をえがいて跳ぶ。押しているときは跳ばずに、前かがみで小またに
        const hopA = run * (1 - pushS), hop = Math.abs(Math.sin(gp));
        rig.position.set(Math.sin(t * 55) * 0.008 * mc.shiver, hop * (0.2 * hopA + 0.025 * run * pushS) + Math.sin(t * 2.2 + ph) * 0.006, 0.12 + Math.sin(t * 5 + ph) * 0.02 * pushS);
        rig.rotation.x = hopA * 0.5 + Math.cos(gp * 2) * 0.12 * hopA + pushS * 0.22 + bowS * 0.3;
        rig.rotation.z = Math.sin(t * 1.3 + ph) * 0.025 * (1 - run);
        const fr = -Math.cos(gp * 2) * 0.5 * run;
        feet[0].rotation.x = fr; feet[1].rotation.x = (pushS > 0.3 ? -fr : fr) - lift * 0.35; feet[1].position.y = 0.03 + lift * 0.07;
        // 腕：ふだんはどんぐりを抱きしめる。flap で頭の上へ持ちあげてふりかぶり、0 にもどると前へ投げる（そのあと、ほお袋から次のどんぐりを出す）
        const fl = U.flap || 0;
        if (prevFlap > 0 && fl === 0) { throwT = 0.28; regrow = 0; }
        prevFlap = fl;
        let aT = Math.sin(t * 2 + ph) * 0.04 * (1 - pushS) - pushS * 1.0, rate = 6;
        if (fl) { aT = -2.4; rate = 9; } else if (throwT > 0) { aT = 0.55; rate = 30; throwT -= dt; }
        armA += (aT - armA) * (1 - Math.exp(-rate * dt));
        arms.rotation.x = armA;
        const wind = clamp(-armA / 2.4, 0, 1) * (1 - pushS), fling = clamp(armA / 0.55, 0, 1);
        arms.position.set(0, 0.55 + wind * 0.42, 0.06 - wind * 0.05 + pushS * 0.08);
        if (throwT <= 0 && regrow < 1) regrow = Math.min(1, regrow + dt * 2.2);
        // どんぐりを置く：抱えたどんぐりを舞台へ移して、足もとの前へそっと下ろす（リスが去っても残る）
        if (U.drop && !dropped && root.parent && acorn.visible) {
          dropped = true; dropT = 0;
          root.parent.attach(acorn); dropFrom.copy(acorn.position);
          dropTo.copy(root.localToWorld(V3(0, 0.105, 0.36))); root.parent.worldToLocal(dropTo);
        }
        if (dropped) {
          if (dropT < 1) { dropT = Math.min(1, dropT + dt * 2.2); const e = Ease.out(dropT); acorn.position.lerpVectors(dropFrom, dropTo, e); acorn.position.y += Math.sin(dropT * Math.PI) * 0.06; acorn.rotation.z *= 1 - e * 0.2; }
        } else acorn.scale.setScalar(Math.max(0.001, (regrow < 1 ? Ease.back(regrow) : 1) * (1 - pushS)));
        rig.rotation.x += -wind * 0.15 + fling * 0.15;
        // 頭：リスらしく、ぴっぴっと向きを変える。かみつくときは前へ。押すときは前を見て、しょんぼり・おじぎで下を向く
        const lt = ((Math.floor(t * 0.9 + ph) * 7) % 3 - 1) * 0.18 * clamp(1 - run - bowS - pushS - mc.droop * 1.5, 0, 1);
        look2 += (lt - look2) * (1 - Math.exp(-14 * dt));
        const chat = ang > 0.2 && Math.sin(t * 42) > 0 ? 0.3 : 0, talk = U.talk ? (Math.sin(t * 15 + ph) > 0 ? 0.32 : 0.06) : 0;
        jawS += (Math.max(U.jaw || 0, chat, talk, mc.mouth) - jawS) * (1 - Math.exp(-30 * dt));
        H.rotation.set(Math.sin(t * 1.7 + ph) * 0.04 - run * 0.35 * (1 - pushS) - pushS * 0.3 + jawS * 0.18 - wind * 0.14 + fling * 0.12 + mc.head + bowS * 0.5, look2, Math.sin(t * 38) * ang * 0.035);
        mouth.scale.set(1 + jawS * 0.2, 0.05 + jawS * 1.4, 0.45);
        // 顔：眉の傾き・高さ、まぶたの深さ・傾き
        for (const { s, br } of browL) { br.rotation.z = s * mc.brow; br.position.y = mc.by - ang * 0.012; }
        const bl = (t * 0.33 + ph) % 4 > 3.88 ? 0.12 : 1; eyesG.scale.y = bl;
        for (const { s, lr, lp } of eyeL) { lr.rotation.z = s * mc.lidA; lp.scale.y = Math.max(0.001, mc.lid); }
        ears.forEach((g, i) => { const tw = (t * 0.45 + ph + i * 2.1) % 4.5 > 4.3 ? 0.4 : 0; g.rotation.x = -tw - run * 0.4 - ang * 0.2 - mc.ear * 0.9; });
        // しっぽ：根もとから先へ波がつたわる。怒る・おびえるとぼわっとふくらんで小きざみにふるえ、走るとうしろへ流れる。しょんぼりすると垂れ、swish でうしろの相手を先でなでる
        puff += (Math.max(ang, run * 0.35, mc.puff) - puff) * (1 - Math.exp(-10 * dt));
        const quiver = Math.max(ang, mc.shiver * 0.6);
        segs.forEach((q, i) => {
          const rel = TA[i] - (i ? TA[i - 1] : 0);
          q.rotation.x = rel * (i ? 1 - run * 0.65 - mc.droop * 0.35 : 1) + Math.sin(t * 2.6 - i * 0.6 + ph) * 0.06 * (1 + i * 0.12) + Math.sin(t * 22 - i * 0.9) * 0.05 * quiver + Math.sin(gp * 2 - i * 0.7) * 0.12 * run
            - (i >= 4 ? swishS * 0.2 : 0);
          q.rotation.z = Math.sin(t * 1.4 - i * 0.5 + ph) * 0.03 + Math.sin(t * 3.2 - i * 0.45) * 0.2 * swishS;
        });
        segs[0].rotation.x += run * 0.35;
        blobs.forEach((b, i) => b.scale.setScalar(1 + puff * (0.22 + i * 0.02)));
      };
      const fw = V3();
      emitFn = (p) => {
        if (!stompHit) return;
        stompHit = false;
        feet[1].getWorldPosition(fw);
        for (let i = 0; i < 6; i++) { const a = Math.random() * Math.PI * 2; p.emit(fw.clone().add(V3(0, 0.02, 0.08)), V3(Math.cos(a) * 0.6, 0.25 + Math.random() * 0.3, Math.sin(a) * 0.6), hdr('#d8c0a0', 0.6), { life: 0.45, size: 0.08, drag: 2.5 }); }
      };
      height = 1.3; radius = 0.45; break;
    }
    case 'crow': {   // いたずらカラス：大きな頭にアホ毛、ニヤリと細めた目。風切り羽を広げて羽ばたく。魚の降ったイベントでは、足に盗んだ魚
      const fm = tm(col), deep = tm('#' + new THREE.Color(col).multiplyScalar(0.7).getHexString());
      const belly = tm('#' + new THREE.Color(col).lerp(new THREE.Color('#c8c8e8'), 0.16).getHexString());
      const beakM = tm('#3e3c4a'), legM = tm('#3a3842');
      const fishM = tm('#a8c4d8'), finM = tm('#6a8aa8', { side: THREE.DoubleSide });
      const lineM = new THREE.MeshBasicMaterial({ color: '#1a1420' });
      // 動かない部品は一つの形にまとめる（輪郭つき）
      const bake = (geos, mat, parent, x = 0, y = 0, z = 0) => add(P(THREEX.BufferGeometryUtils.mergeGeometries(geos), mat), x, y, z, parent);
      // 羽一枚：+X へのびる、平たい丸い先の羽（長さ len・幅 w）
      const featherGeo = (len, w) => { const g = new THREE.CapsuleGeometry(w, Math.max(0.01, len - w * 2), 4, 10); g.rotateZ(-Math.PI / 2); g.translate(len / 2, 0, 0); g.scale(1, 0.24, 1); return g; };
      // 向き：+X の羽を、外がわ（s）から後ろへ th だけ回す
      const yawOf = (s, th) => s > 0 ? th : Math.PI - th;
      const bird = new THREE.Group(); bird.position.y = 0.95; inner.add(bird);
      // 胴：少し前のめりの卵形。胸は明るい羽毛
      const body = add(P(new THREE.SphereGeometry(0.29, 22, 16), fm), 0, 0, 0, bird); body.scale.set(0.92, 0.9, 1.12); body.rotation.x = 0.25;
      add(P(new THREE.SphereGeometry(0.22, 18, 12), belly), 0, -0.07, 0.11, bird).scale.set(0.95, 1, 0.75);
      // しっぽ：丸く広がる 5 枚の羽を一つにまとめる
      const tail = new THREE.Group(); tail.position.set(0, -0.04, -0.28); bird.add(tail);
      bake([-2, -1, 0, 1, 2].map(i => { const g = featherGeo(0.36 - Math.abs(i) * 0.03, 0.06); g.rotateY(Math.PI / 2 + i * 0.2); g.translate(0, Math.abs(i) * 0.006, 0); return g; }), deep, tail);
      // 頭：大きくて丸い（2頭身）
      const head = new THREE.Group(); head.position.set(0, 0.29, 0.12); bird.add(head);
      add(P(new THREE.SphereGeometry(0.25, 24, 18), fm), 0, 0, 0, head).scale.set(1, 0.94, 0.97);
      const onHead = (az, el, r = 0.25) => V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).multiplyScalar(r);
      // アホ毛：頭のてっぺんから立つ 3 本の羽（ばねのように遅れてゆれる）
      const crest = new THREE.Group(); crest.position.set(0, 0.2, 0.03); head.add(crest);
      bake([[0.17, -0.25, 0], [0.13, 0.3, 0.45], [0.12, 0.25, -0.5]].map(([len, tx, tz]) => { const g = featherGeo(len, 0.032); g.rotateZ(Math.PI / 2 - 0.35); g.rotateX(tx); g.rotateZ(tz); return g; }), fm, crest);
      // くちばし：上と下に分かれ、下が開く（userData.jaw）。上の先は少し下へ曲がる
      const beak = new THREE.Group(); beak.position.set(0, -0.065, 0.2); head.add(beak);
      const ub = new THREE.ConeGeometry(0.085, 0.2, 14); ub.translate(0, 0.1, 0); ub.rotateX(Math.PI / 2); ub.scale(0.72, 0.95, 1);
      add(P(ub, beakM), 0, 0.016, 0, beak).rotation.x = 0.2;
      const jaw = new THREE.Group(); jaw.position.set(0, -0.02, 0); beak.add(jaw);
      const lb = new THREE.ConeGeometry(0.06, 0.15, 12); lb.translate(0, 0.075, 0); lb.rotateX(Math.PI / 2); lb.scale(0.7, 0.6, 1);
      add(P(lb, beakM), 0, 0, 0, jaw).rotation.x = -0.05;
      // 目：白目に大きな黒目。上まぶたは目じりを上げて、下まぶたも少し上げる（ニヤリと細めた目）
      const eyeG = [-1, 1].map(s => {
        const n = onHead(s * 0.42, 0.1).normalize(), g = new THREE.Group(); g.position.copy(n).multiplyScalar(0.226); head.add(g);
        g.quaternion.setFromUnitVectors(V3(0, 0, 1), n);
        const w = add(new THREE.Mesh(new THREE.SphereGeometry(0.075, 18, 12), tm('#ffffff')), 0, 0, 0, g); w.scale.set(0.9, 1.1, 0.45);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 14, 10), new THREE.MeshBasicMaterial({ color: '#1a1420' })), -s * 0.012, -0.006, 0.02, g).scale.set(0.9, 1.1, 0.45);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffffff' })), -s * 0.02 - 0.008, 0.02, 0.042, g);
        const lid = new THREE.Group(); lid.rotation.z = s * 0.3; g.add(lid);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.082, 18, 8, 0, Math.PI * 2, 0, Math.PI * 0.4), fm), 0, -0.006, 0, lid).scale.set(1.05, 1.1, 0.5);
        const ln = add(new THREE.Mesh(new THREE.TorusGeometry(0.078, 0.011, 6, 20, Math.PI * 0.8), lineM), 0, 0.022, 0.016, lid); ln.rotation.z = Math.PI * 0.1; ln.scale.set(1.05, 0.55, 1);
        const low = add(new THREE.Mesh(new THREE.SphereGeometry(0.082, 18, 6, 0, Math.PI * 2, Math.PI * 0.76, Math.PI * 0.24), fm), 0, 0.004, 0, g); low.scale.set(1.02, 1.1, 0.5); low.rotation.z = -s * 0.12;
        return g;
      });
      // 翼：腕（雨覆いと次列風切りをまとめた形）と、先の手（指のように広がる 5 枚の初列風切り）
      const wings = [-1, 1].map(s => {
        const arm = new THREE.Group(); arm.position.set(s * 0.22, 0.07, -0.02); bird.add(arm);
        const cov = new THREE.SphereGeometry(0.19, 16, 10); cov.scale(1.05, 0.26, 0.62); cov.translate(s * 0.15, 0, 0);
        const sec = [0, 1, 2, 3].map(i => { const g = featherGeo(0.2 - i * 0.012, 0.05); g.rotateY(yawOf(s, 1.42 - i * 0.12)); g.translate(s * (0.05 + i * 0.075), -0.008, -0.04); return g; });
        bake([cov, ...sec], fm, arm);
        const hand = new THREE.Group(); hand.position.set(s * 0.3, 0, -0.01); arm.add(hand);
        add(P(new THREE.SphereGeometry(0.075, 12, 8), fm), s * 0.02, 0, -0.01, hand).scale.set(1.2, 0.3, 1);
        const prim = [0, 1, 2, 3, 4].map(i => {
          const q = new THREE.Group(); q.position.set(s * (0.06 - i * 0.018), 0.012 - i * 0.004, -0.02 * i); hand.add(q);
          q.add(P(featherGeo(0.3 - i * 0.025, 0.048), deep));
          return { q, th: 0.08 + i * 0.26 };
        });
        return { s, arm, hand, prim };
      });
      // 足：ふだんは短くたたんで、指を軽くまるめる。魚の降ったイベント（look.fish）では、のばした指で盗んだ魚を横向きにかかえる
      const legs = [], fishY = -0.42, legL = look.fish ? 0.16 : 0.1, toeY = look.fish ? fishY + 0.075 : -0.2 - legL;
      for (const s of [-1, 1]) {
        const lg = new THREE.CylinderGeometry(0.02, 0.018, legL, 8); lg.translate(0, -legL / 2, 0); lg.rotateZ(s * 0.1); lg.translate(s * 0.08, -0.2, 0.05); legs.push(lg);
        for (const [a, b] of look.fish ? [[-0.4, 0.5], [0, 0.4], [0.4, 0.5], [Math.PI, 0.7]] : [[-0.35, 1.1], [0, 1.0], [0.35, 1.1], [Math.PI, 1.2]]) { const t = new THREE.CapsuleGeometry(0.014, 0.05, 3, 6); t.translate(0, -0.032, 0); t.rotateX(-Math.PI / 2 + b); t.rotateY(a); t.translate(s * (0.08 + legL * 0.1), toeY, 0.05); legs.push(t); }
      }
      bake(legs, legM, bird);
      let fish = null, ftail = null;
      if (look.fish) {
        fish = new THREE.Group(); fish.position.set(0, fishY, 0.05); bird.add(fish);
        const fb = lathe([[0.001, -0.2], [0.03, -0.17], [0.065, -0.1], [0.085, -0.02], [0.082, 0.06], [0.064, 0.12], [0.034, 0.16], [0.001, 0.185]], 18);
        fb.rotateZ(-Math.PI / 2); fb.scale(1, 1, 0.5);   // 頭が +X、体の横の面がこちらを向く
        add(P(fb, fishM), 0, 0, 0, fish);
        const fin = (pts) => { const sh = new THREE.Shape(); sh.moveTo(pts[0][0], pts[0][1]); for (const [x, y] of pts.slice(1)) sh.lineTo(x, y); return new THREE.ShapeGeometry(sh); };
        add(new THREE.Mesh(fin([[-0.07, 0.07], [0.04, 0.075], [-0.11, 0.13]]), finM), 0, 0, 0, fish);   // 背びれ
        ftail = new THREE.Group(); ftail.position.set(-0.19, 0, 0); fish.add(ftail);
        add(P(fin([[0.02, 0], [-0.11, 0.09], [-0.075, 0], [-0.11, -0.09]]), finM, { outline: false }), 0, 0, 0, ftail);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 6), lineM), 0.12, 0.015, 0.027, fish);
      }
      // root.userData.jaw（0〜1）：くちばしをあける（つっつき）。flap（0〜1）：力いっぱい羽ばたく（ねばねば）
      let jw = 0, fl = 0, fp = 0;
      update = (dt, t) => {
        const ph = root.userData.ph, U = root.userData;
        jw += ((U.jaw || 0) - jw) * (1 - Math.exp(-40 * dt)); fl += ((U.flap || 0) - fl) * (1 - Math.exp(-8 * dt));
        // ときどき「カカカ」と笑うように、くちばしをかちかち鳴らす
        const lc = (t * 0.17 + ph * 0.3) % 1, laugh = lc > 0.9 ? Math.abs(Math.sin((lc - 0.9) * 10 * Math.PI * 3)) : 0;
        jaw.rotation.x = Math.max(jw * 0.9, laugh * 0.5);
        // 羽ばたき：振りおろしは速く、風切り羽を広げる。振りあげでたたむ。手先は腕より遅れてしなる
        fp += dt * (8.5 + fl * 5); const p = fp + ph, sn = Math.sin(p), cs = Math.cos(p);
        const amp = 0.62 + fl * 0.3, spread = 0.5 - 0.5 * cs;
        for (const { s, arm, hand, prim } of wings) {
          arm.rotation.z = s * (0.18 + sn * amp); arm.rotation.y = s * (0.1 - cs * 0.12);
          hand.rotation.z = s * Math.sin(p - 0.9) * 0.45;
          prim.forEach(({ q, th }) => { q.rotation.y = yawOf(s, th * (0.5 + 0.5 * spread)); });
        }
        // 振りおろしで体が持ちあがる。頭は少しおくれて、上下を打ち消す
        bird.position.y = 0.95 - Math.cos(p - 0.5) * 0.035;
        bird.rotation.x = Math.sin(p - 1) * 0.04 - fl * 0.12;
        head.position.y = 0.29 + Math.cos(p - 0.5) * 0.015;
        // きょろきょろ見回し、ときどき首をかしげる
        const tilt = (t * 0.21 + ph) % 1 > 0.82 ? 1 : 0;
        head.userData.tz = (head.userData.tz || 0) + (tilt * 0.32 - (head.userData.tz || 0)) * (1 - Math.exp(-10 * dt));
        head.rotation.set(Math.sin(t * 0.9 + ph) * 0.06 - 0.05, Math.sin(t * 0.55 + ph * 2) * 0.35, head.userData.tz);
        crest.rotation.set(Math.sin(p - 1.8) * 0.12, 0, -head.userData.tz * 0.5 + Math.sin(p - 2.2) * 0.06);
        tail.rotation.x = -0.5 + Math.sin(p - 1.2) * 0.08; tail.rotation.y = Math.sin(t * 1.3 + ph) * 0.1;
        // まばたき
        const bl = (t * 0.33 + ph) % 4 > 3.88 ? 0.12 : 1; eyeG.forEach(g => { g.scale.y = bl; });
        // 魚：羽ばたきにゆられ、ときどきぴちぴち跳ねる
        if (fish) {
          const fc = (t * 0.29 + ph * 0.7) % 1, flop = fc > 0.86 ? Math.sin((fc - 0.86) * 7.1 * Math.PI) : 0;
          fish.rotation.set(Math.sin(p + 0.6) * 0.06, Math.sin(t * 40) * flop * 0.22, Math.sin(p) * 0.05 + flop * 0.12);
          ftail.rotation.y = Math.sin(t * 3 + ph) * 0.25 + Math.sin(t * 40) * flop * 0.7;
        }
      };
      float = 0.12; height = 1.6; radius = 0.55; break;
    }
    case 'rock': {   // ごろごろ岩：ごろごろ団（暴走族のような岩の一団）の下っぱ。苔のリーゼントに白いハチマキ、メンチを切る目と金歯のニヤリ口、ほっぺの×ばんそうこう。背中に竹やりマフラー
      const BU = THREEX.BufferGeometryUtils;
      const C0 = V3(0, 0.55, 0), RX = 1.06;   // 岩の中心と、横のふくらみ
      const lineM = new THREE.MeshBasicMaterial({ color: '#1a1420' });
      const flatM = c => { const m = new THREE.MeshStandardMaterial({ color: c, roughness: 0.95, flatShading: true }); m.userData.e0 = new THREE.Color(0); m.userData.ei0 = 0; mats.push(m); return m; };
      const bake = (geos, mat, parent = inner, o) => add(o === false ? new THREE.Mesh(BU.mergeGeometries(geos), mat) : P(BU.mergeGeometries(geos), mat, o), 0, 0, 0, parent);
      // 形を決める乱数（どの岩も同じ形）
      let seed = 11; const rnd = () => (seed = seed * 16807 % 2147483647) / 2147483647;
      const hash = v => { const h = Math.sin(Math.round(v.x * 997) * 12.9898 + Math.round(v.y * 997) * 78.233 + Math.round(v.z * 997) * 37.719) * 43758.5453; return h - Math.floor(h); };
      const rdir = () => V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).normalize();
      const bumps = Array.from({ length: 14 }, () => ({ d: rdir(), a: rnd() * 0.14 - 0.05 })), cuts = Array.from({ length: 8 }, rdir);
      // 岩の表面までの距離：転がる帯（顔・ハチマキの下を通るところ）はすり減って丸く、横はごつごつ。ところどころ平らに欠ける
      const rough = n => 0.25 + 0.75 * n.x ** 4;
      const radAt = n => {
        let d = (hash(n) - 0.5) * 0.03;
        for (const b of bumps) d += b.a * Math.max(0, n.dot(b.d)) ** 4;
        let r = 0.56 + d * rough(n);
        for (const c of cuts) { const k = n.dot(c); if (k > 0.3) r = Math.min(r, (0.56 - 0.035 * rough(c)) / k); }
        return r;
      };
      const surf = n => n.clone().multiplyScalar(radAt(n)).multiply(V3(RX, 1, 1));
      const dirOf = (az, el) => V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      // 顔のがわ（回らない部品）の置き場所：岩の正面の丸みにそって
      const onRock = (az, el, r) => dirOf(az, el).multiplyScalar(r).multiply(V3(RX, 1, 1)).add(C0);
      const frameAt = (az, el, r, rz = 0) => new THREE.Matrix4().compose(onRock(az, el, r), new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), dirOf(az, el)).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), rz)), V3(1, 1, 1));
      // 平らな形を、岩の顔の丸みにそわせて貼る（x・y は表面にそった長さ）
      const decal = (geo, az, el, r, rot = 0) => {
        geo.rotateZ(rot); const p = geo.attributes.position;
        for (let k = 0; k < p.count; k++) { const v = onRock(az + p.getX(k) / r, el + p.getY(k) / r, r + p.getZ(k)); p.setXYZ(k, v.x, v.y, v.z); }
        geo.computeVertexNormals(); return geo;
      };
      // ---- 回る岩の本体：ころがった道のりだけ回る（root.userData.spin）。ひび・苔のかたまりも、いっしょに回る
      const rock = new THREE.Group(); rock.position.copy(C0); inner.add(rock);
      const bg = new THREE.IcosahedronGeometry(1, 2), bp = bg.attributes.position, n = V3();
      for (let k = 0; k < bp.count; k++) { n.fromBufferAttribute(bp, k).normalize(); const v = surf(n); bp.setXYZ(k, v.x, v.y, v.z); }
      // 面ごとに色をゆらす。平らに欠けた面は明るく
      const base = new THREE.Color(col), vc = new Float32Array(bp.count * 3), cc = new THREE.Color(), cen = V3();
      for (let f = 0; f < bp.count; f += 3) {
        cen.set(0, 0, 0); for (let j = 0; j < 3; j++) cen.add(n.fromBufferAttribute(bp, f + j));
        cen.divideScalar(3); const lift = cen.length() < 0.548 ? 0.1 : 0;
        cc.copy(base).multiplyScalar(0.8 + hash(cen) * 0.3 + lift);
        for (let j = 0; j < 3; j++) cc.toArray(vc, (f + j) * 3);
      }
      bg.setAttribute('color', new THREE.BufferAttribute(vc, 3)); bg.computeVertexNormals();
      const rm = flatM('#ffffff'); rm.vertexColors = true;
      add(new THREE.Mesh(bg, rm), 0, 0, 0, rock);
      // 輪郭は、角をつないだなめらかな形で（面ごとの法線だと角にすき間があく）
      const sm = new THREE.BufferGeometry(); sm.setAttribute('position', bp.clone()); const sg = BU.mergeVertices(sm); sg.computeVertexNormals();
      const ol = new THREE.Mesh(sg, outlineMat(dark(col), 0.0024)); ol.userData.outline = true; rock.add(ol);
      // ひび：ぶつかってできた、ぎざぎざの線
      const seg = (a, b) => {
        const na = dirOf(...a), nb = dirOf(...b), pa = surf(na), pb = surf(nb), x = pb.clone().sub(pa), len = x.length(); x.normalize();
        const up = na.clone().add(nb).normalize(), z = x.clone().cross(up).normalize(), y = z.clone().cross(x);
        const g = new THREE.BoxGeometry(len + 0.01, 0.016, 0.011); g.applyMatrix4(new THREE.Matrix4().makeBasis(x, y, z).setPosition(pa.add(pb).multiplyScalar(0.5)));
        return g;
      };
      const cracks = [[[-0.62, -0.1], [-0.5, -0.26], [-0.6, -0.4], [-0.48, -0.58]], [[2.5, 0.42], [2.66, 0.22], [2.55, 0.02], [2.72, -0.2], [2.62, -0.36]], [[0.75, -0.75], [0.6, -0.9], [0.4, -0.85]]];
      bake(cracks.flatMap(c => c.slice(1).map((b, i) => seg(c[i], b))), new THREE.MeshBasicMaterial({ color: '#2a2220' }), rock, false);
      // 苔のかたまり（回るので、転がると前に出てくる）
      bake([[0.95, -0.8], [-0.35, -1.0], [3.4, -0.15], [2.0, 0.55]].flatMap(([az, el], i) => [[0, 0, 0.07], [0.09, 0.05, 0.05], [-0.06, 0.08, 0.04]].map(([da, de, r]) => {
        const d = dirOf(az + da, el + de), g = new THREE.SphereGeometry(r * (1 - i * 0.08), 8, 5); g.scale(1, 0.3, 1);
        g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), d)); g.translate(...surf(d).toArray()); return g;
      })), tm('#3e6e2a'), rock, false);
      // ---- 回らない部品：顔・頭・マフラー（体ごと前のめりになる body に入れる）
      const body = new THREE.Group(); body.position.copy(C0); inner.add(body);
      const B = (geo) => geo.translate(-C0.x, -C0.y, -C0.z);   // inner の高さで作った形を、body の中へ
      // 苔は一つの形にまとめて描く（刈りあげは頂点の色で少し暗く）
      const moss = tm('#ffffff', { vertexColors: true }), shine = tm('#64a046');
      const tint = (g, c) => { const k = new THREE.Color(c), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) k.toArray(a, i); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); g.deleteAttribute('uv'); return g; };
      // 刈りあげた苔：頭のてっぺんをおおう（すそはハチマキにかくれる）
      const cap = new THREE.SphereGeometry(0.612, 26, 12, 0, Math.PI * 2, 0, 1.0); cap.scale(RX, 1, 1);
      // リーゼント：うしろからなでつけて、前へ大きくせり出す。前ほど太く、先は丸いかたまり
      const pomp = new THREE.Group(); pomp.position.set(0, 0.5, -0.1); body.add(pomp);   // つやの筋の置き場（苔の形は body の座標へずらしてまとめる）
      const path = new THREE.CatmullRomCurve3([V3(0, 0.42, -0.36), V3(0, 0.55, -0.14), V3(0, 0.62, 0.12), V3(0, 0.64, 0.36), V3(0, 0.6, 0.56)].map(v => v.sub(V3(0, 0.5, -0.1))));
      const TS = 30, RS = 14, R0 = 0.15, thick = u => 0.7 + 0.62 * Math.sin(Math.min(1, u / 0.85) * Math.PI / 2);
      const pg = new THREE.TubeGeometry(path, TS, R0, RS, false), pp = pg.attributes.position, pc = V3(), pv = V3();
      for (let k = 0; k < pp.count; k++) { const u = Math.floor(k / (RS + 1)) / TS; path.getPointAt(u, pc); pv.fromBufferAttribute(pp, k).sub(pc).multiplyScalar(thick(u)); pv.x *= 1.45; pp.setXYZ(k, pc.x + pv.x, pc.y + pv.y, pc.z + pv.z); }
      const ends = [0, 1].map(u => { const g = new THREE.SphereGeometry(R0 * thick(u), 12, 8); g.scale(1.45, 1, 1); g.translate(...path.getPointAt(u).toArray()); return g; });
      pg.computeVertexNormals();
      add(P(BU.mergeGeometries([tint(cap, '#33652a'), ...[pg, ...ends].map(g => tint(g.translate(0, 0.5, -0.1), '#3f7a2c'))]), moss, { oc: dark('#3f7a2c') }), 0, 0, 0, body);
      // くしの筋：リーゼントの上をなでつけて、先の丸みをくるりと下へ回りこむ（正面から見ても巻いているのがわかる）
      bake([-0.12, 0, 0.12].map(s => {
        // 断面は横 1.45 倍のだ円。上がわ（進む向きに直角な、上を向く向き）の s の位置に乗せる
        const pts = [], w = s / 0.29;
        for (let i = 0; i <= 8; i++) { const u = 0.2 + i / 8 * 0.8, c = path.getPointAt(u), tg = path.getTangentAt(u), up = V3(0, tg.z, -tg.y).normalize(), r = R0 * thick(u); pts.push(c.addScaledVector(up, r * Math.sqrt(1 - w * w) * 1.02).add(V3(w * r * 1.45, 0, 0))); }
        const c1 = path.getPointAt(1), t1 = path.getTangentAt(1), u1 = V3(0, t1.z, -t1.y).normalize(), r1 = R0 * thick(1) * 1.02;
        for (let i = 1; i <= 5; i++) { const f = i / 5 * 1.9; pts.push(c1.clone().addScaledVector(u1, Math.cos(f) * r1 * Math.sqrt(1 - w * w)).addScaledVector(t1, Math.sin(f) * r1 * Math.sqrt(1 - w * w)).add(V3(w * r1 * 1.45, 0, 0))); }
        const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 16, 0.011, 5, false); g.deleteAttribute('uv'); return g;
      }), shine, pomp, false);
      // ハチマキ：白い帯に赤い丸。うしろの結び目から、端が二本なびく
      const bandY = 0.31, white = tm('#ffffff');
      const band = new THREE.TorusGeometry(0.528, 0.036, 8, 40); band.rotateX(Math.PI / 2); band.scale(RX, 1.75, 1); band.translate(0, bandY, 0);
      const knot = new THREE.SphereGeometry(0.06, 10, 8); knot.scale(1.2, 1, 0.8); knot.translate(0, bandY, -0.565);
      bake([band, knot], white, body);
      add(new THREE.Mesh(new THREE.CircleGeometry(0.05, 18), tm('#e8304a')), 0, bandY, 0.566, body);
      const tails = [-1, 1].map(s => {
        const g1 = new THREE.Group(); g1.position.set(s * 0.04, bandY - 0.01, -0.6); g1.rotation.y = s * 0.4; body.add(g1);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.016, 0.2).translate(0, 0, -0.1), white), 0, 0, 0, g1);
        const g2 = new THREE.Group(); g2.position.z = -0.19; g1.add(g2);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.016, 0.18).translate(0, 0, -0.09), white), 0, 0, 0, g2);
        return [g1, g2];
      });
      // 顔：岩の眉、メンチを切る三白眼（目はまとめて eyesG に入れ、まばたきで縦につぶす）
      const eyeEl = 0.15, eyeY = Math.sin(eyeEl) * 0.565;
      const eyesG = new THREE.Group(); eyesG.position.y = eyeY; body.add(eyesG);
      const whites = [], darks = [], hls = [];
      for (const s of [-1, 1]) {
        const M = frameAt(s * 0.215, eyeEl, 0.566).premultiply(new THREE.Matrix4().makeTranslation(-C0.x, -C0.y - eyeY, -C0.z));
        const put = (g, list) => { g.applyMatrix4(M); list.push(g); };
        put(new THREE.SphereGeometry(0.082, 16, 10).scale(1.15, 0.78, 0.45), whites);
        put(new THREE.SphereGeometry(0.031, 10, 8).scale(1, 1.1, 0.4).translate(-s * 0.014, 0.006, 0.027), darks);
        put(new THREE.BoxGeometry(0.21, 0.036, 0.03).rotateZ(s * 0.32).translate(-s * 0.004, 0.05, 0.022), darks);    // 上まぶた：目がしらを下げる
        put(new THREE.BoxGeometry(0.15, 0.013, 0.02).rotateZ(-s * 0.1).translate(0, -0.054, 0.024), darks);             // 下まぶた：少し上げて、にらむ
        put(new THREE.SphereGeometry(0.011, 6, 4).translate(-s * 0.026 + 0.008, 0.016, 0.04), hls);
      }
      add(new THREE.Mesh(BU.mergeGeometries(whites), tm('#ffffff')), 0, 0, 0, eyesG);
      add(new THREE.Mesh(BU.mergeGeometries(darks), lineM), 0, 0, 0, eyesG);
      add(new THREE.Mesh(BU.mergeGeometries(hls), new THREE.MeshBasicMaterial({ color: '#ffffff' })), 0, 0, 0, eyesG);
      // 眉：岩がせり出した、太い八の字（逆さ）
      //   目がしらがわが太く、外へ細くなる、けずった石の形
      const brow = s => { const g = new THREE.BoxGeometry(0.2, 0.065, 0.075, 3, 1, 1), q = g.attributes.position; for (let k = 0; k < q.count; k++) { const f = 1 - 0.55 * (s * q.getX(k) / 0.1 + 1) / 2; q.setY(k, q.getY(k) * f); q.setZ(k, q.getZ(k) * (0.6 + 0.4 * f)); } g.computeVertexNormals(); return g; };
      bake([-1, 1].map(s => B(brow(s).applyMatrix4(frameAt(s * 0.205, 0.335, 0.556, s * 0.38)))), flatM('#' + base.clone().multiplyScalar(0.66).getHexString()), body, { oc: dark(col) });
      // 口：片がわを上げたニヤリ口。歯がのぞいて、一本は金歯
      const mEl = -0.2, mo = new THREE.Shape(); mo.moveTo(-0.12, 0); mo.quadraticCurveTo(0, 0.008, 0.13, 0.048); mo.quadraticCurveTo(0.05, -0.11, -0.12, 0);
      add(new THREE.Mesh(B(decal(new THREE.ShapeGeometry(mo, 10), 0, mEl, 0.584)), tm('#4a2a2a')), 0, 0, 0, body);
      const lipY = x => { const u = (x + 0.12) / 0.25; return 2 * (1 - u) * u * 0.008 + u * u * 0.048; };
      const tooth = x => new THREE.PlaneGeometry(0.03, 0.03).translate(x, lipY(x) - 0.018, 0);
      add(new THREE.Mesh(B(decal(BU.mergeGeometries([-0.068, -0.032, 0.044].map(tooth)), 0, mEl, 0.586)), tm('#fff8ea')), 0, 0, 0, body);
      add(new THREE.Mesh(B(decal(tooth(0.006), 0, mEl, 0.586)), tm('#ffcf4a', { emissive: new THREE.Color('#ffcf4a'), emissiveIntensity: 0.15 })), 0, 0, 0, body);
      // ほっぺの×ばんそうこう
      add(new THREE.Mesh(B(decal(BU.mergeGeometries([new THREE.PlaneGeometry(0.13, 0.036).rotateZ(0.55), new THREE.PlaneGeometry(0.13, 0.036).rotateZ(-0.55).translate(0, 0, 0.003)]), -0.34, -0.06, 0.584)), tm('#f2d2a8')), 0, 0, 0, body);
      // 竹やりマフラー：背中から二本、ななめ上へ。先からけむりを吹く（root.userData.pipes：探索で、けむりを出す所）
      const chrome = tm('#c4cad6', { emissive: new THREE.Color('#5a6070'), emissiveIntensity: 0.15 });
      const pipes = new THREE.Group(); body.add(pipes);
      const pipeG = [], holeG = [], tips = [];
      for (const s of [-1, 1]) {
        const from = V3(s * 0.2, -0.12, -0.4), dir = V3(s * 0.42, 1, -0.6).normalize(), L = 1.08, q = new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir);
        const at = (g, k) => g.applyQuaternion(q).translate(...from.clone().addScaledVector(dir, k).toArray());
        pipeG.push(at(new THREE.CylinderGeometry(0.046, 0.05, L, 12), L / 2));
        pipeG.push(at(new THREE.CylinderGeometry(0.06, 0.06, 0.045, 12), 0.62), at(new THREE.CylinderGeometry(0.058, 0.058, 0.035, 12), L - 0.03));
        holeG.push(at(new THREE.CircleGeometry(0.04, 12).rotateX(-Math.PI / 2), L + 0.003));
        const tip = new THREE.Object3D(); tip.position.copy(from).addScaledVector(dir, L + 0.05); pipes.add(tip);
        const bse = new THREE.Object3D(); bse.position.copy(from).addScaledVector(dir, L - 0.3); pipes.add(bse);
        tips.push({ tip, bse });
      }
      add(P(BU.mergeGeometries(pipeG), chrome), 0, 0, 0, pipes);
      add(new THREE.Mesh(BU.mergeGeometries(holeG), lineM), 0, 0, 0, pipes);
      root.userData.pipes = tips.map(o => o.tip);
      // 空ぶかし（ときどき「ブォンブォン」）：体を前へゆすり、目をほそめ、マフラーから大きなけむり
      let rev = 0;
      update = (dt, t) => {
        const U = root.userData, ph = U.ph, rc = (t * 0.2 + ph * 0.37) % 1;
        rev = rc > 0.82 ? Math.max(0, Math.sin((rc - 0.82) / 0.18 * Math.PI * 3)) : 0;
        rock.rotation.x = (U.spin || 0) + Math.sin(t * 2 + ph) * 0.2 + rev * 0.25;
        inner.position.y = Math.abs(Math.sin(t * 2)) * 0.05;
        body.rotation.x = rev * 0.1; body.position.y = C0.y + Math.sin(t * 50) * 0.004 * (1 + rev * 2);
        pipes.position.set(Math.sin(t * 61) * 0.004 * (1 + rev * 3), 0, 0);
        tails.forEach(([g1, g2], i) => { g1.rotation.x = Math.sin(t * 9 + i * 1.7) * 0.22 - 0.25; g2.rotation.x = Math.sin(t * 9 + i * 1.7 - 1.2) * 0.35; });
        const bl = (t * 0.31 + ph) % 4 > 3.86 ? 0.12 : 1 - rev * 0.35; eyesG.scale.y = bl;
      };
      const tw = V3(), bw = V3();
      emitFn = (p) => {
        for (const { tip, bse } of tips) {
          if (Math.random() > 0.05 + rev * 0.5) continue;
          tip.getWorldPosition(tw); bw.copy(tw).sub(bse.getWorldPosition(bw)).normalize();
          p.emit(tw.clone(), bw.multiplyScalar(0.6 + rev).add(V3((Math.random() - 0.5) * 0.3, 0.4, (Math.random() - 0.5) * 0.3)), hdr(pick(['#8a8a90', '#a8a8ae', '#6a6a72']), 0.5), { life: 1.0, size: 0.16 + rev * 0.12, drag: 0.7 });
        }
      };
      height = 1.25; radius = 0.6; scale = 1.1; break;
    }
    case 'boar': {   // ばくそうイノシシ（ごろごろ団の総長）：前へ大きくせり出す黒いリーゼントに白いハチマキ、肩にはおった紫の特攻服（からの袖がなびく）、腹にさらし。反り上がる牙、傷のある三白眼、くわえた草。背中に「総長」ののぼり
      const BU = THREEX.BufferGeometryUtils;
      // 描く回数をへらすため、いっしょに動く部品は頂点の色をつけて一つの形にまとめる
      //   vcM：陰のつく色つき（輪郭あり）、flatM：陰のない色つき（顔の線・傷など）
      const vcM = tm('#ffffff', { vertexColors: true }), flatM = new THREE.MeshBasicMaterial({ vertexColors: true });
      const tint = (g, c) => { if (c != null) { const k = new THREE.Color(c), a = new Float32Array(g.attributes.position.count * 3); for (let i = 0; i < a.length; i += 3) k.toArray(a, i); g.setAttribute('color', new THREE.BufferAttribute(a, 3)); } g.deleteAttribute('uv'); return g; };
      const merged = (list, parent, oc, mat = vcM) => add(oc ? P(BU.mergeGeometries(list), mat, { oc }) : new THREE.Mesh(BU.mergeGeometries(list), mat), 0, 0, 0, parent);
      // 先ほど細くなる管（牙・くわえ草・しっぽ）
      const taper = (pts, r0, r1, seg = 12, rs = 8) => {
        const cv = new THREE.CatmullRomCurve3(pts), g = new THREE.TubeGeometry(cv, seg, 1, rs, false), q = g.attributes.position, c = V3(), v = V3();
        for (let k = 0; k < q.count; k++) { const u = Math.floor(k / (rs + 1)) / seg; cv.getPointAt(u, c); v.fromBufferAttribute(q, k).sub(c).multiplyScalar(r0 + (r1 - r0) * u); q.setXYZ(k, c.x + v.x, c.y + v.y, c.z + v.z); }
        g.computeVertexNormals(); g.deleteAttribute('uv'); return g;
      };
      const tube = (pts, r, closed = false, seg = 24) => { const g = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, closed), seg, r, 5, closed); g.deleteAttribute('uv'); return g; };
      const fur = new THREE.Color(col), furDark = fur.clone().multiplyScalar(0.62), furLight = new THREE.Color('#c8946a'), hairC = '#241a1e', goldC = '#ffcf4a', coatC = '#4a2a78';
      const ocFur = dark(col);
      // 全体を少しうしろへ（鼻先とリーゼントが前へ長いぶん、足もとの中心をそろえる）
      const rig = new THREE.Group(); rig.position.z = -0.2; inner.add(rig);
      const bodyL = [], bodyFlat = [];
      // ---- 胴：肩が高く盛りあがり、尻へ細くなる樽の形。背は濃く、腹は明るい
      const BY = 0.8;
      const bf = z => clamp((z + 0.95) / 1.85, 0, 1);
      const sec = z => { const zn = (z + 0.02) / 0.93, tp = Math.pow(Math.max(0, 1 - Math.abs(zn) ** 2.4), 0.5); return { w: (0.5 + 0.12 * bf(z)) * tp, t: (0.5 + 0.15 * Math.exp(-(((bf(z) - 0.68) / 0.3) ** 2))) * tp, b: 0.4 * tp }; };
      const bodyPt = (z, a, off = 1) => { const s = sec(z), c = Math.cos(a); return V3(Math.sin(a) * s.w * off, BY + c * (c > 0 ? s.t : s.b) * off, z); };
      {
        const bg = new THREE.SphereGeometry(1, 40, 26); bg.rotateX(Math.PI / 2);
        const q = bg.attributes.position, n = V3(), vc = new Float32Array(q.count * 3), cc = new THREE.Color();
        for (let k = 0; k < q.count; k++) {
          n.fromBufferAttribute(q, k);
          const z = n.z * 0.93 - 0.02, a = Math.atan2(n.x, n.y), p = bodyPt(z, a);
          q.setXYZ(k, p.x, p.y, p.z);
          const c = Math.cos(a), h = Math.sin(k * 12.9898) * 43758.5453;
          cc.copy(fur);
          if (c > 0.2) cc.lerp(furDark, Math.min(1, (c - 0.2) / 0.8) * 0.75);
          if (c < -0.35) cc.lerp(furLight, Math.min(1, (-c - 0.35) / 0.5) * 0.8);
          cc.multiplyScalar(0.94 + (h - Math.floor(h)) * 0.1).toArray(vc, k * 3);
        }
        bg.setAttribute('color', new THREE.BufferAttribute(vc, 3)); bg.computeVertexNormals();
        bodyL.push(tint(bg));
      }
      // 背中のうしろ半分の、逆立った剛毛（特攻服のうしろからのぞく）
      for (let i = 0; i < 7; i++) {
        const z = -0.42 - i * 0.075, p = bodyPt(z, 0), g = new THREE.ConeGeometry(0.07 - i * 0.004, 0.24 - i * 0.015, 5);
        g.translate(0, 0.08, 0); g.rotateX(-0.55 - i * 0.05); g.rotateZ((i % 2 - 0.5) * 0.3); g.translate(p.x, p.y - 0.03, p.z); bodyL.push(tint(g, hairC));
      }
      // しっぽ：細く、先にふさ
      const tail = new THREE.Group(); tail.position.copy(bodyPt(-0.9, 0.5)); rig.add(tail);
      merged([tint(taper([V3(0, 0, 0), V3(0, -0.08, -0.1), V3(0, -0.24, -0.12)], 0.032, 0.022, 8, 6), furDark), tint(new THREE.SphereGeometry(0.055, 8, 6).scale(1, 1.6, 1).translate(0, -0.29, -0.12), hairC)], tail, ocFur);
      // さらし：腹に巻いた白い布（巻いた重なりの線を二本）
      {
        const Z0 = -0.58, Z1 = -0.1, NZ = 6, NA = 36, pos = [], idx = [];
        for (let i = 0; i <= NZ; i++) for (let j = 0; j <= NA; j++) { const p = bodyPt(Z0 + (Z1 - Z0) * i / NZ, j / NA * Math.PI * 2, 1.03); pos.push(p.x, p.y, p.z); }
        for (let i = 0; i < NZ; i++) for (let j = 0; j < NA; j++) { const a = i * (NA + 1) + j, b = a + NA + 1; idx.push(a, b, a + 1, b, b + 1, a + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals();
        bodyL.push(tint(g, '#f4efe4'));
        for (const z of [-0.42, -0.26]) bodyFlat.push(tint(tube(Array.from({ length: 32 }, (_, j) => bodyPt(z + Math.sin(j / 32 * Math.PI * 2) * 0.012, j / 32 * Math.PI * 2, 1.045)), 0.008, true, 48), '#b8b0a0'));
      }
      // ---- 特攻服：肩にはおる。紫の地に金の縁どり、裏は赤。背中に金の牡丹。両わきのすそと、からの袖がなびく
      const liningM = tm('#a8283a', { side: THREE.BackSide });
      const CZ0 = -0.36, CZ1 = 0.56;
      // 格子の面（u：前後、v：まわり）
      const sheet = (fn, nu, nv) => {
        const pos = [], idx = [];
        for (let i = 0; i <= nu; i++) for (let j = 0; j <= nv; j++) { const p = fn(i / nu, j / nv); pos.push(p.x, p.y, p.z); }
        for (let i = 0; i < nu; i++) for (let j = 0; j < nv; j++) { const a = i * (nv + 1) + j, b = a + nv + 1; idx.push(a, a + 1, b, b, a + 1, b + 1); }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
      };
      // 外の生地（縁どりなど extra といっしょに）と裏地の二枚。外の面が、内がわの点 ref（体の芯）から外を向くように、面の向きをそろえる
      const cloth = (fn, nu, nv, parent, extra = [], ref = p => V3(0, BY, p.z)) => {
        const mk = d => {
          const g = sheet((u, v) => fn(u, v, d), nu, nv), q = g.attributes.position, nn = g.attributes.normal, k = Math.floor(q.count / 2), p = V3().fromBufferAttribute(q, k);
          if (V3().fromBufferAttribute(nn, k).dot(p.clone().sub(ref(p))) < 0) { const ix = g.index.array; for (let i = 0; i < ix.length; i += 3) { const a = ix[i]; ix[i] = ix[i + 1]; ix[i + 1] = a; } g.computeVertexNormals(); }
          return g;
        };
        merged([tint(mk(0), coatC), ...extra], parent, '#1e1030');
        add(new THREE.Mesh(mk(-0.012), liningM), 0, 0, 0, parent);
      };
      const coat = new THREE.Group(); rig.add(coat);
      // 肩の上をおおう身ごろ（背の線から両わきまで）。前後の縁は金、背中に金の牡丹（花びら六枚・葉二枚、まん中に赤い玉）
      {
        const zc = -0.02, onBack = (dx, dz, r, lift, c) => { const z = zc + dz, a = dx / sec(z).t, p = bodyPt(z, a, 1.075 + lift), nn = V3(Math.sin(a) / sec(z).w, Math.cos(a) / sec(z).t, 0).normalize(); const g = new THREE.CircleGeometry(r, 12); g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), nn)); g.translate(p.x, p.y, p.z); return tint(g, c); };
        const extra = [
          ...[CZ0, CZ1].map(z => tint(tube(Array.from({ length: 17 }, (_, j) => bodyPt(z, (j / 16 - 0.5) * Math.PI, 1.085)), 0.016), goldC)),
          ...Array.from({ length: 6 }, (_, i) => { const a = i / 6 * Math.PI * 2; return onBack(Math.cos(a) * 0.075, Math.sin(a) * 0.075, 0.06, 0.004, goldC); }),
          ...[-1, 1].map(s => onBack(s * 0.15, 0.1, 0.045, 0.002, goldC)),
          onBack(0, 0, 0.035, 0.008, '#d8303c'),
        ];
        cloth((u, v, d) => bodyPt(CZ0 + (CZ1 - CZ0) * u, (v - 0.5) * Math.PI, 1.07 + d * 2), 10, 20, coat, extra);
      }
      // 両わきのすそ：わきの線を軸に、外へひるがえる（skirts）。すそと前後の縁は金
      const hemY = 0.36;
      const skirts = [-1, 1].map(s => {
        const zc = (CZ0 + CZ1) / 2, hx = s * sec(zc).w * 1.07;
        const g = new THREE.Group(); g.position.set(hx, BY, 0); coat.add(g);
        const at = (u, v, d) => { const z = CZ0 + (CZ1 - CZ0) * u, top = bodyPt(z, s * Math.PI / 2, 1.07 + d * 2); return V3(top.x - hx + s * (v * v * 0.1 - d), (BY - hemY) * -v, z + v * (u - 0.5) * 0.12); };
        const edges = [Array.from({ length: 11 }, (_, i) => at(i / 10, 1, 0.01)), Array.from({ length: 6 }, (_, i) => at(1, i / 5, 0.01)), Array.from({ length: 6 }, (_, i) => at(0, i / 5, 0.01))];
        cloth(at, 10, 5, g, edges.map(p => tint(tube(p, 0.016, false, 16), goldC)), p => V3(-s, p.y, p.z));
        return g;
      });
      // からの袖：肩から垂れて、走るとうしろへなびく（sleeves）。そで口は金で、中は暗い
      const sleeves = [-1, 1].map(s => {
        const g = new THREE.Group(); g.position.copy(bodyPt(0.36, s * Math.PI / 2, 1.08)).add(V3(s * 0.02, 0.06, 0)); coat.add(g);
        merged([
          tint(new THREE.CylinderGeometry(0.075, 0.1, 0.5, 12, 1, true).translate(0, -0.25, 0), coatC),
          tint(new THREE.CylinderGeometry(0.104, 0.104, 0.05, 12, 1, true).translate(0, -0.48, 0), goldC),
          tint(new THREE.CircleGeometry(0.1, 12).rotateX(Math.PI / 2).translate(0, -0.47, 0), '#2a1020'),
        ], g, '#1e1030');
        return g;
      });
      // ---- 脚：太く短い。下は黒っぽく、二つに割れたひづめ。走ると駆け、前足で地面をかく
      const shinC = furDark.clone().multiplyScalar(0.8);
      const legs = [[-1, 0.42], [1, 0.42], [-1, -0.58], [1, -0.58]].map(([s, z], i) => {
        const hip = new THREE.Group(); hip.position.set(s * 0.3, 0.6, z); rig.add(hip);
        merged([tint(taper([V3(0, 0.12, 0), V3(0, -0.12, 0), V3(0, -0.32, 0)], 0.16, 0.11, 6, 12), fur)], hip, ocFur);
        const knee = new THREE.Group(); knee.position.y = -0.3; hip.add(knee);
        merged([tint(taper([V3(0, 0.04, 0), V3(0, -0.2, 0)], 0.1, 0.085, 4, 10), shinC), ...[-1, 1].map(t => tint(new THREE.CylinderGeometry(0.048, 0.058, 0.09, 8).scale(1, 1, 1.2).translate(t * 0.045, -0.245, 0.012), '#2e2422'))], knee, ocFur);
        return { hip, knee, front: i < 2, s };
      });
      // ---- 頭：大きく、鼻先は平たい円盤
      const H = new THREE.Group(); H.position.set(0, 1.02, 0.86); rig.add(H);
      const headL = [], headFlat = [];
      const HR = 0.48, HS = V3(1.08, 0.94, 0.96);
      const dirOf = (az, el) => V3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));
      const onHead = (az, el, r = HR) => dirOf(az, el).multiplyScalar(r).multiply(HS);
      const frameH = (az, el, r = HR, rz = 0) => new THREE.Matrix4().compose(onHead(az, el, r), new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), dirOf(az, el)).multiply(new THREE.Quaternion().setFromAxisAngle(V3(0, 0, 1), rz)), V3(1, 1, 1));
      {
        const hg = new THREE.SphereGeometry(HR, 32, 20), q = hg.attributes.position, vc = new Float32Array(q.count * 3), cc = new THREE.Color();
        for (let k = 0; k < q.count; k++) { const y = q.getY(k) / HR, z = q.getZ(k) / HR; cc.copy(fur); if (y < -0.1 && z > 0) cc.lerp(furLight, Math.min(1, (-y - 0.1) * 2) * 0.6); cc.toArray(vc, k * 3); }
        hg.setAttribute('color', new THREE.BufferAttribute(vc, 3)); hg.scale(HS.x, HS.y, HS.z);
        headL.push(tint(hg));
      }
      // 鼻：前へつき出した筒と、桃色の円盤。鼻の穴（nostrils：鼻息を吹く所）
      const SY = -0.17, SZ0 = 0.28, SZ1 = 0.66;
      headL.push(tint(new THREE.CylinderGeometry(0.235, 0.2, SZ1 - SZ0, 24, 1, true).rotateX(Math.PI / 2).scale(1, 0.78, 1).translate(0, SY, (SZ0 + SZ1) / 2), fur));
      headL.push(tint(new THREE.CylinderGeometry(0.235, 0.235, 0.05, 24).rotateX(Math.PI / 2).scale(1, 0.78, 1).translate(0, SY, SZ1), '#e8a08a'));
      for (const s of [-1, 1]) headFlat.push(tint(new THREE.CircleGeometry(0.05, 12).scale(0.75, 1.15, 1).rotateZ(s * 0.25).translate(s * 0.075, SY - 0.005, SZ1 + 0.027), '#4a1a20'));
      const nostrils = [-1, 1].map(s => { const o = new THREE.Object3D(); o.position.set(s * 0.075, SY - 0.01, SZ1 + 0.06); H.add(o); return o; });
      // 下あご・ニヤリ口・反り上がる牙
      headL.push(tint(new THREE.SphereGeometry(0.2, 16, 10).scale(1.2, 0.5, 1.05).translate(0, -0.34, 0.42), furLight.clone().lerp(fur, 0.4)));
      headFlat.push(tint(taper([V3(-0.19, -0.31, 0.47), V3(-0.08, -0.345, 0.57), V3(0.06, -0.335, 0.585), V3(0.2, -0.27, 0.49)], 0.012, 0.012, 16, 5), '#1a1420'));
      for (const s of [-1, 1]) headL.push(tint(taper([V3(s * 0.17, -0.32, 0.46), V3(s * 0.26, -0.24, 0.55), V3(s * 0.28, -0.08, 0.6), V3(s * 0.24, 0.04, 0.59)], 0.048, 0.006, 14, 8), '#fff4dc'));
      // くわえた草：口の端で、ゆらゆら
      const grass = new THREE.Group(); grass.position.set(0.12, -0.33, 0.56); H.add(grass);
      merged([tint(taper([V3(0, 0, 0), V3(0.12, -0.03, 0.12), V3(0.26, 0.0, 0.26)], 0.01, 0.007, 8, 5), '#8aa84a'), ...[0, 1, 2, 3].map(i => tint(new THREE.SphereGeometry(0.022, 6, 4).scale(0.8, 0.8, 1.6).translate(0.26 + i * 0.022, 0.01 + i * 0.012, 0.27 + i * 0.022), '#d8c060'))], grass);
      // 耳：とがって外へ。片耳に金の輪
      for (const s of [-1, 1]) {
        const ear = (g, c) => { g.rotateX(-0.35); g.rotateZ(-s * 0.75); g.translate(...onHead(s * 0.9, 0.5, HR * 0.92).toArray()); headL.push(tint(g, c)); };
        ear(new THREE.ConeGeometry(0.12, 0.28, 6).scale(1, 1, 0.42).translate(0, 0.12, 0), furDark);
        ear(new THREE.ConeGeometry(0.075, 0.19, 6).scale(1, 1, 0.3).translate(0, 0.1, 0.035), '#d89a8a');
      }
      { const g = new THREE.TorusGeometry(0.045, 0.011, 6, 16); g.rotateY(Math.PI / 2 - 0.4); g.translate(...onHead(-1.05, 0.5, HR * 1.0).add(V3(-0.07, 0.02, 0.02)).toArray()); headFlat.push(tint(g, '#e8b838')); }
      // 黒いリーゼント：頭をおおう髪から、前へ大きくせり出す。前ほど太く、先は丸いかたまり。くしの筋は上の面だけ（先まで回すと、正面から兜の格子に見える）
      const cap = new THREE.SphereGeometry(HR * 1.035, 28, 10, 0, Math.PI * 2, 0, 0.98); cap.scale(HS.x, HS.y, HS.z);
      const path = new THREE.CatmullRomCurve3([V3(0, 0.3, -0.34), V3(0, 0.49, -0.12), V3(0, 0.57, 0.16), V3(0, 0.58, 0.42), V3(0, 0.52, 0.66)]);
      const TS = 30, RS = 14, R0 = 0.15, thick = u => 0.75 + 0.65 * Math.sin(Math.min(1, u / 0.85) * Math.PI / 2);
      const pg = new THREE.TubeGeometry(path, TS, R0, RS, false), pp = pg.attributes.position, pc = V3(), pv = V3();
      for (let k = 0; k < pp.count; k++) { const u = Math.floor(k / (RS + 1)) / TS; path.getPointAt(u, pc); pv.fromBufferAttribute(pp, k).sub(pc).multiplyScalar(thick(u)); pv.x *= 1.5; pp.setXYZ(k, pc.x + pv.x, pc.y + pv.y, pc.z + pv.z); }
      pg.computeVertexNormals();
      headL.push(tint(cap, '#1c1418'), tint(pg, hairC), ...[0, 1].map(u => { const g = new THREE.SphereGeometry(R0 * thick(u), 14, 10); g.scale(1.5, 1, 1); g.translate(...path.getPointAt(u).toArray()); return tint(g, hairC); }));
      for (const s of [-0.12, 0, 0.12]) {
        const pts = [], w = s / 0.31;
        for (let i = 0; i <= 8; i++) { const u = 0.12 + i / 8 * 0.8, c = path.getPointAt(u), tg = path.getTangentAt(u), up = V3(0, tg.z, -tg.y).normalize(), r = R0 * thick(u); pts.push(c.addScaledVector(up, r * Math.sqrt(1 - w * w) * 1.02).add(V3(w * r * 1.5, 0, 0))); }
        headFlat.push(tint(tube(pts, 0.011, false, 16), '#4a4862'));
      }
      // ハチマキ：白い帯に赤い丸。うしろの結び目から、端が二本なびく
      const bandEl = 0.6, bandY = Math.sin(bandEl) * HR * HS.y, bandR = Math.cos(bandEl) * HR, white = tm('#ffffff');
      {
        const band = new THREE.TorusGeometry(bandR * 1.02, 0.034, 8, 40); band.rotateX(Math.PI / 2); band.scale(HS.x, 1.7, HS.z); band.translate(0, bandY, 0);
        const knot = new THREE.SphereGeometry(0.055, 10, 8); knot.scale(1.2, 1, 0.8); knot.translate(0, bandY, -bandR * HS.z - 0.04);
        headL.push(tint(band, '#ffffff'), tint(knot, '#ffffff'));
        headFlat.push(tint(new THREE.CircleGeometry(0.048, 18).translate(0, bandY, bandR * 1.02 * HS.z + 0.036), '#e8304a'));
      }
      const tails = [-1, 1].map(s => {
        const g1 = new THREE.Group(); g1.position.set(s * 0.04, bandY - 0.01, -bandR * HS.z - 0.06); g1.rotation.y = s * 0.4; H.add(g1);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.016, 0.2).translate(0, 0, -0.1), white), 0, 0, 0, g1);
        const g2 = new THREE.Group(); g2.position.z = -0.19; g1.add(g2);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.016, 0.18).translate(0, 0, -0.09), white), 0, 0, 0, g2);
        return [g1, g2];
      });
      // 顔：太い眉、メンチを切る三白眼（eyesG はまばたきで縦につぶす）。左目に刀傷
      const eyeEl = 0.2, eyeY = Math.sin(eyeEl) * HR * HS.y;
      const eyesG = new THREE.Group(); eyesG.position.y = eyeY; H.add(eyesG);
      const whites = [], darks = [], hls = [];
      for (const s of [-1, 1]) {
        const M = frameH(s * 0.36, eyeEl, HR + 0.004).premultiply(new THREE.Matrix4().makeTranslation(0, -eyeY, 0));
        const put = (g, list) => { g.applyMatrix4(M); list.push(g); };
        put(new THREE.SphereGeometry(0.085, 16, 10).scale(1.15, 0.78, 0.45), whites);
        put(new THREE.SphereGeometry(0.032, 10, 8).scale(1, 1.1, 0.4).translate(-s * 0.016, 0.006, 0.028), darks);
        put(new THREE.BoxGeometry(0.22, 0.038, 0.03).rotateZ(s * 0.32).translate(-s * 0.004, 0.052, 0.022), darks);
        put(new THREE.BoxGeometry(0.16, 0.014, 0.02).rotateZ(-s * 0.1).translate(0, -0.056, 0.024), darks);
        put(new THREE.SphereGeometry(0.012, 6, 4).translate(-s * 0.028 + 0.008, 0.017, 0.042), hls);
      }
      add(new THREE.Mesh(BU.mergeGeometries(whites), tm('#ffffff')), 0, 0, 0, eyesG);
      add(new THREE.Mesh(BU.mergeGeometries(darks), new THREE.MeshBasicMaterial({ color: '#1a1420' })), 0, 0, 0, eyesG);
      add(new THREE.Mesh(BU.mergeGeometries(hls), new THREE.MeshBasicMaterial({ color: '#ffffff' })), 0, 0, 0, eyesG);
      // 眉：目がしらがわが太く、外へ細くなる
      const brow = s => { const g = new THREE.BoxGeometry(0.21, 0.07, 0.07, 3, 1, 1), q = g.attributes.position; for (let k = 0; k < q.count; k++) { const f = 1 - 0.55 * (s * q.getX(k) / 0.105 + 1) / 2; q.setY(k, q.getY(k) * f); q.setZ(k, q.getZ(k) * (0.6 + 0.4 * f)); } g.computeVertexNormals(); return g; };
      for (const s of [-1, 1]) headL.push(tint(brow(s).applyMatrix4(frameH(s * 0.34, 0.39, HR - 0.005, s * 0.4)), hairC));
      // 刀傷：左目（見て右）の上から下へ、ななめに。ぬい目つき
      for (let i = 0; i < 5; i++) {
        const el = 0.4 - i * 0.075, az = -0.27 - i * 0.035;
        headFlat.push(tint(new THREE.BoxGeometry(0.05, 0.016, 0.012).rotateZ(1.15).applyMatrix4(frameH(az, el, HR + 0.012)), '#e0ae98'));
        if (i % 2) headFlat.push(tint(new THREE.BoxGeometry(0.045, 0.008, 0.01).rotateZ(-0.35).applyMatrix4(frameH(az, el, HR + 0.016)), '#1a1420'));
      }
      merged(headL, H, ocFur);
      merged(headFlat, H, null, flatM);
      // ---- 背中の「総長」ののぼり：竿の先に金の玉。旗は竿の外がわへ（正面から見てリーゼントにかくれない）。風になびき、走るとうしろへ流れる
      const poleX = 0.3, poleZ = -0.66, poleY0 = 0.95, poleY1 = 2.45;
      bodyL.push(tint(new THREE.CylinderGeometry(0.026, 0.032, poleY1 - poleY0, 8).translate(poleX, (poleY0 + poleY1) / 2, poleZ), '#c8a060'),
        tint(new THREE.SphereGeometry(0.06, 12, 8).translate(poleX, poleY1 + 0.04, poleZ), goldC),
        tint(new THREE.TorusGeometry(0.06, 0.018, 6, 14).rotateX(Math.PI / 2).translate(poleX, 1.18, poleZ), '#5a3a2a'));
      merged(bodyL, rig, ocFur);
      merged(bodyFlat, rig, null, flatM);
      const flag = new THREE.Group(); flag.position.set(poleX, poleY1 - 0.48, poleZ); rig.add(flag);
      const FW = 0.44, fg = new THREE.PlaneGeometry(FW, 0.86, 8, 1).translate(FW / 2 + 0.03, 0, 0), fq = fg.attributes.position, fx0 = Float32Array.from({ length: fq.count }, (_, k) => fq.getX(k));
      add(new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: bossFlagTex(Tx('総長')), side: THREE.DoubleSide, roughness: 0.9 })), 0, 0, 0, flag);
      // ---- 動き
      // 走る速さは、体が動いた道のりから（戦闘の突進・舞台で走ってくるとき）。root.userData.run（0〜1）で走らせ、paw（0〜1）で前足が地面をかく
      let gp = 0, spd = 0, lx = null, lz = 0, snort = 0;
      update = (dt, t) => {
        const U = root.userData, ph = U.ph;
        if (dt > 0) {
          const px = root.position.x, pz = root.position.z, d = lx == null ? 0 : Math.hypot(px - lx, pz - lz);
          const v = d > 2 ? 0 : d / dt / (root.scale.x || 1);
          spd += (Math.min(v, 8) - spd) * (1 - Math.exp(-8 * dt)); lx = px; lz = pz;
        }
        const run = clamp(Math.max(spd / 2.5, U.run || 0), 0, 1), paw = U.paw || 0;
        gp += dt * (2.2 + run * 13);
        // 脚：走ると前後の脚が交互に大きく駆ける（左右は少しずらす）。止まっているときは重心をゆっくり移す
        const amp = 0.05 + run * 0.65;
        for (const L of legs) {
          const p = gp + (L.front ? 0 : Math.PI) + (L.s > 0 ? 0.55 : 0), sw = Math.sin(p);
          L.hip.rotation.x = -sw * amp; L.knee.rotation.x = (L.front ? 1 : -1) * Math.max(0, Math.cos(p)) * run * 0.9;
          if (L.front && L.s > 0 && paw > 0) { L.hip.rotation.x = -paw * 0.75; L.knee.rotation.x = paw * 1.1; }
        }
        rig.position.y = Math.abs(Math.sin(gp)) * 0.07 * run + Math.sin(t * 1.6 + ph) * 0.008;
        rig.rotation.x = Math.sin(gp + 0.6) * 0.06 * run - paw * 0.05;
        // 鼻息：ときどき頭をふり上げて、ブフッと吹く
        const sc = (t * 0.23 + ph * 0.41) % 1; snort = sc > 0.9 ? Math.sin((sc - 0.9) / 0.1 * Math.PI) : 0;
        H.rotation.x = Math.sin(t * 2 + ph) * 0.035 + run * 0.18 - snort * 0.12;
        H.rotation.y = Math.sin(t * 0.7 + ph) * 0.06 * (1 - run);
        grass.rotation.y = Math.sin(t * 3.1 + ph) * 0.18; grass.rotation.z = Math.sin(t * 2.3) * 0.12 - run * 0.2;
        tail.rotation.z = Math.sin(t * 6 + ph) * 0.35 * (1 - run * 0.5); tail.rotation.x = -run * 0.9;
        // 特攻服：すそと袖がひるがえる。走ると大きく
        skirts.forEach((g, i) => { const s = i ? 1 : -1; g.rotation.z = s * (0.04 + Math.sin(t * 2.6 + i * 1.3 + ph) * 0.03 + run * (0.3 + Math.sin(t * 17 + i) * 0.1)); });
        sleeves.forEach((g, i) => { const s = i ? 1 : -1; g.rotation.x = Math.sin(t * 2.2 + i * 2 + ph) * 0.12 + run * (0.9 + Math.sin(t * 15 + i * 1.7) * 0.25); g.rotation.z = s * (0.06 + run * 0.25); });
        tails.forEach(([g1, g2], i) => { g1.rotation.x = Math.sin(t * 9 + i * 1.7) * 0.22 - 0.25 - run * 0.6; g2.rotation.x = Math.sin(t * 9 + i * 1.7 - 1.2) * 0.35; });
        // 旗：竿を軸に、ふだんは前へ少し開き、走るとうしろへ流れる。布は波打つ
        flag.rotation.y = 0.3 + run * 1.0 + Math.sin(t * 1.9 + ph) * 0.15;
        const wv = 0.035 + run * 0.05;
        for (let k = 0; k < fq.count; k++) { const x = fx0[k], f = x / FW; fq.setZ(k, Math.sin(t * (6 + run * 8) + x * 11) * wv * f); }
        fq.needsUpdate = true;
        const bl = (t * 0.29 + ph) % 4 > 3.86 ? 0.12 : 1 - snort * 0.3; eyesG.scale.y = bl;
      };
      const nw = V3();
      emitFn = (p) => {
        const run = clamp(Math.max(spd / 2.5, root.userData.run || 0), 0, 1);
        for (const o of nostrils) {
          if (Math.random() > 0.02 + snort * 0.5 + run * 0.15) continue;
          o.getWorldPosition(nw);
          const f = V3(Math.sin(root.rotation.y), 0, Math.cos(root.rotation.y));
          p.emit(nw.clone(), f.multiplyScalar(0.8 + snort * 1.2).add(V3((Math.random() - 0.5) * 0.3, -0.1 + Math.random() * 0.3, (Math.random() - 0.5) * 0.3)), hdr('#f4f0ea', 0.7), { life: 0.6, size: 0.12 + snort * 0.1, drag: 1.4 });
        }
      };
      height = 2.0; radius = 1.0; scale = 1.5; break;
    }
    case 'ghost': {   // ゲラゲラゴースト：白い布おばけ。目を細めて大笑い
      const gm = tm(col, { transparent: true, opacity: 0.85, emissive: new THREE.Color('#b8b8ff'), emissiveIntensity: 0.25 }); gm.userData.e0 = new THREE.Color('#b8b8ff'); gm.userData.ei0 = 0.25;
      const pts = []; for (let i = 0; i <= 12; i++) { const a = i / 12; pts.push([Math.sin(a * Math.PI * 0.55 + 0.05) * 0.5 * (a < 0.8 ? 1 : 1.1), 1.4 - a * 1.25]); } pts.push([0.001, 1.45]);
      const body = add(P(lathe(pts.reverse(), 24), gm), 0, 0, 0);
      const ml = new THREE.MeshBasicMaterial({ color: '#2a1a3a' });
      for (const s of [-1, 1]) { const e = add(new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.018, 6, 12, Math.PI), ml), s * 0.16, 1.02, 0.42); }
      const mouth = add(new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), ml), 0, 0.85, 0.4); mouth.rotation.x = -0.3;
      for (const s of [-1, 1]) { const arm = add(P(new THREE.SphereGeometry(0.1, 10, 8), gm), s * 0.48, 0.7, 0.1); arm.scale.set(1.4, 0.6, 0.6); }
      update = (dt, t) => { body.rotation.y = Math.sin(t * 1.3) * 0.2; mouth.scale.y = 0.8 + Math.abs(Math.sin(t * 9)) * 0.5; inner.rotation.z = Math.sin(t * 9) * 0.04; };
      emitFn = (p, pos) => { if (Math.random() < 0.3) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.6, pos.y + 0.3, pos.z), V3(0, -0.4, 0), hdr('#d8d8ff', 1.2), { life: 1, size: 0.12, drag: 0.5 }); };
      float = 0.2; height = 1.6; radius = 0.55; break;
    }
    case 'mimic': {   // クスクスミミック：ふたがぱくぱく開く宝箱
      const wm = tm('#8a5a36'), gm = tm('#ffcf4a', { emissive: new THREE.Color('#ffcf4a'), emissiveIntensity: 0.15 }); gm.userData.e0 = new THREE.Color('#ffcf4a'); gm.userData.ei0 = 0.15;
      add(P(new THREEX.RoundedBoxGeometry(1.1, 0.6, 0.75, 2, 0.06), wm), 0, 0.3, 0);
      add(P(new THREE.BoxGeometry(1.14, 0.1, 0.79), gm), 0, 0.52, 0);
      const lid = new THREE.Group(); lid.position.set(0, 0.6, -0.37); inner.add(lid);
      const top = add(P(new THREE.CylinderGeometry(0.37, 0.37, 1.1, 16, 1, false, 0, Math.PI), wm), 0, 0, 0.37, lid); top.rotation.z = Math.PI / 2;
      for (let i = 0; i < 7; i++) { add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.14, 4), tm('#fff6e0')), -0.45 + i * 0.15, 0.62, 0.34).rotation.x = Math.PI; add(new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.12, 4), tm('#fff6e0')), -0.45 + i * 0.15, -0.05, 0.74, lid); }
      const tongue = add(new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 8), tm('#ff6a8a')), 0, 0.62, 0.2); tongue.scale.set(1, 0.3, 1.3);
      const ey = eyes(0.2, 0.12, 0.68, 0.08, lid, { angry: true });
      update = (dt, t) => { lid.rotation.x = -0.25 - Math.max(0, Math.sin(t * 5 + root.userData.ph)) * 0.55; inner.position.y = Math.abs(Math.sin(t * 5)) * 0.04; };
      height = 1.3; radius = 0.75; scale = 1.1; break;
    }
    case 'armor':       // さまよう鎧：中身のない古い鎧。部品は少しずつ浮いて、すき間と首の穴から青白い光がもれる。猫耳のかぶと、欠けた大剣、肉球の盾
    case 'maouarmor': { // 魔王城の飾り甲冑：同じ作りを、魔王の色（紫・赤い裏地のマント・金のふち）で。角と桃色の羽飾りのかぶと、斧槍
      const maou = d.shape === 'maouarmor';
      const C = maou
        ? { eye: '#ff8ad8', steel: '#8a76b8', steel2: '#7c6aa8', trim: '#46346a', cloth: '#3a1850', hollow: '#140a1c' }
        : { eye: '#8affe0', steel: '#949cbc', steel2: '#8890b0', trim: '#565e80', cloth: '#3e6a7a', hollow: '#0a0e18' };
      const eyeCol = C.eye;
      const steel = tm(C.steel), trim = tm(C.trim);
      const brass = maou ? tm('#ffcf4a', { emissive: new THREE.Color('#ffcf4a'), emissiveIntensity: 0.2 }) : tm('#c8a45a');
      const cloth = tm(C.cloth, { side: THREE.DoubleSide }), leather = tm('#5a3a2a');
      const hollow = new THREE.MeshBasicMaterial({ color: C.hollow, side: THREE.DoubleSide });
      const rim = maou ? brass : trim;   // 胸・かぶとのふち（魔王城のものは金）
      const ring = (r, tube, y, parent, m = trim) => { const o = add(P(new THREE.TorusGeometry(r, tube, 6, 24), m), 0, y, 0, parent); o.rotation.x = Math.PI / 2; return o; };
      const rivet = (x, y, z, parent, r = 0.018) => add(new THREE.Mesh(new THREE.SphereGeometry(r, 6, 4), brass), x, y, z, parent);
      // 足：すね当て・ひざ当て・鉄の靴。腰とのあいだは少しあく
      const legs = [-1, 1].map(s => {
        const g = new THREE.Group(); g.position.set(s * 0.15, 0.72, 0); inner.add(g);
        add(P(new THREE.CylinderGeometry(0.1, 0.088, 0.24, 14), steel), 0, -0.12, 0, g);
        const knee = add(P(new THREE.SphereGeometry(0.085, 14, 10), trim), 0, -0.29, 0.035, g); knee.scale.set(1, 0.9, 0.8);
        add(P(new THREE.CylinderGeometry(0.092, 0.072, 0.3, 14), steel), 0, -0.47, 0, g);
        add(P(new THREEX.RoundedBoxGeometry(0.16, 0.1, 0.28, 2, 0.04), steel), 0, -0.67, 0.05, g);
        return g;
      });
      // 腰：重ねた板のスカート、ベルト、紋の入ったぼろぼろの前垂れ
      const skirt = new THREE.Group(); inner.add(skirt);
      add(P(new THREE.CylinderGeometry(0.255, 0.29, 0.11, 18, 1, true), tm(C.steel, { side: THREE.DoubleSide })), 0, 0.8, 0, skirt).scale.z = 0.82;
      add(P(new THREE.CylinderGeometry(0.29, 0.325, 0.11, 18, 1, true), tm(C.steel2, { side: THREE.DoubleSide })), 0, 0.7, 0, skirt).scale.z = 0.82;
      add(new THREE.Mesh(new THREE.CircleGeometry(0.29, 18).rotateX(Math.PI / 2), hollow), 0, 0.66, 0, skirt).scale.z = 0.82;
      const tabard = (z, flip) => {
        const sh = new THREE.Shape(); sh.moveTo(-0.11, 0); sh.lineTo(0.11, 0);
        const bot = [[0.13, -0.4], [0.08, -0.34], [0.05, -0.42], [0, -0.36], [-0.04, -0.43], [-0.08, -0.35], [-0.13, -0.41]];
        for (const [x, y] of bot) sh.lineTo(x, y);
        const g = new THREE.Group(); g.position.set(0, 0.86, z); g.rotation.y = flip ? Math.PI : 0; inner.add(g);
        add(new THREE.Mesh(new THREE.ShapeGeometry(sh), cloth), 0, 0, 0, g);
        return g;
      };
      const front = tabard(0.29, false), back = maou ? null : tabard(-0.29, true);
      // 紋は一つのメッシュにまとめる（大きさ k 倍、中心が原点）。さまよう鎧は肉球、魔王城のものは赤い玉の王冠
      const pawM = tm('#d8c08a');
      const paw = k => THREEX.BufferGeometryUtils.mergeGeometries([new THREE.CircleGeometry(0.045 * k, 14).scale(1, 0.85, 1), ...[[-0.055, 0.065], [-0.02, 0.09], [0.02, 0.09], [0.055, 0.065]].map(([x, y]) => new THREE.CircleGeometry(0.019 * k, 10).translate(x * k, y * k, 0))]);
      if (maou) {
        const cr = new THREE.Shape(); cr.moveTo(-0.07, -0.04); cr.lineTo(0.07, -0.04); cr.lineTo(0.085, 0.05); cr.lineTo(0.04, 0.005); cr.lineTo(0, 0.065); cr.lineTo(-0.04, 0.005); cr.lineTo(-0.085, 0.05); cr.lineTo(-0.07, -0.04);
        add(new THREE.Mesh(new THREE.ShapeGeometry(cr), brass), 0, -0.19, 0.004, front);
        add(new THREE.Mesh(new THREE.CircleGeometry(0.018, 10), tm('#d8303c')), 0, -0.2, 0.006, front);
      } else add(new THREE.Mesh(paw(1), pawM), 0, -0.2, 0.004, front);
      // 上半身：胸当て・肩当て・腕・かぶと。足とは別にゆれる
      const upper = new THREE.Group(); upper.position.y = 0.86; inner.add(upper);
      ring(0.25, 0.03, 0, upper, leather).scale.y = 0.82;
      add(P(new THREEX.RoundedBoxGeometry(0.1, 0.08, 0.03, 2, 0.01), brass), 0, 0, 0.215, upper);
      const chest = add(P(lathe([[0.245, 0.02], [0.285, 0.14], [0.305, 0.26], [0.29, 0.4], [0.2, 0.5], [0.13, 0.53]], 24), steel), 0, 0, 0, upper); chest.scale.z = 0.78;
      add(new THREE.Mesh(new THREE.CircleGeometry(0.13, 18).rotateX(-Math.PI / 2), hollow), 0, 0.525, 0, upper).scale.z = 0.78;
      // 胸のまん中の稜線と、横に走る板のさかい目
      const ridge = add(P(new THREE.CylinderGeometry(0.016, 0.016, 0.36, 6), trim), 0, 0.27, 0.233, upper); ridge.rotation.x = 0.12;
      ring(0.287, 0.012, 0.14, upper, rim).scale.y = 0.79;
      ring(0.13, 0.035, 0.53, upper);   // のど当て
      // 首の穴の奥の光（中身がないしるし）
      const soul = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), glowMat(eyeCol, 1.6)), 0, 0.56, 0, upper);
      const soulSp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(eyeCol, 1.2), blending: THREE.AdditiveBlending, depthWrite: false })); soulSp.scale.setScalar(0.9); soul.add(soulSp);
      // 肩当て：二枚重ねのおわん。体から浮いている
      const pauls = [-1, 1].map(s => {
        const g = new THREE.Group(); g.position.set(s * 0.33, 0.44, 0); g.rotation.z = -s * 0.42; upper.add(g);
        const dome = new THREE.SphereGeometry(0.16, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2);
        add(P(dome, steel), 0, 0, 0, g).scale.set(1.1, 0.75, 0.95);
        add(P(dome.clone(), trim), s * 0.06, -0.07, 0, g).scale.set(1.05, 0.6, 0.9);
        if (maou) ring(0.165, 0.014, 0.005, g, brass).scale.set(1.1, 0.95, 1);
        rivet(0, 0.12, 0, g, 0.022);
        return g;
      });
      // 腕：肩の玉を軸に、二の腕・ひじ当て・こて・手甲。つなぎ目に少しすき間
      const arms = [-1, 1].map(s => {
        const g = new THREE.Group(); g.position.set(s * 0.35, 0.38, 0); upper.add(g);
        add(P(new THREE.CylinderGeometry(0.072, 0.066, 0.2, 12), steel), 0, -0.12, 0, g);
        const elbow = new THREE.Group(); elbow.position.y = -0.25; g.add(elbow);
        add(P(new THREE.SphereGeometry(0.07, 12, 8), trim), 0, 0, 0, elbow);
        add(P(new THREE.CylinderGeometry(0.068, 0.088, 0.2, 12), steel), 0, -0.13, 0, elbow);
        const hand = add(P(new THREEX.RoundedBoxGeometry(0.12, 0.12, 0.14, 2, 0.035), trim), 0, -0.3, 0.01, elbow);
        return { g, elbow, hand };
      });
      // 右手の持ち物は、にぎりが原点で上へのびる
      const held = new THREE.Group(); held.position.set(0, -0.02, 0.02); held.rotation.set(Math.PI / 2 - 0.35, 0, 0); arms[0].hand.add(held);
      let cape = null;
      if (maou) {
        // 斧槍：石突きが地面に届く長い柄、金の口金、穂先と三日月の斧、うしろのとげ、桃色の房
        add(P(new THREE.CylinderGeometry(0.022, 0.022, 1.9, 8), tm('#3a2a4a')), 0, 0.1, 0, held);
        add(P(new THREE.CylinderGeometry(0.03, 0.03, 0.08, 8), brass), 0, -0.84, 0, held);
        add(P(new THREE.CylinderGeometry(0.035, 0.035, 0.1, 8), brass), 0, 1.04, 0, held);
        const tip = new THREE.ConeGeometry(0.045, 0.3, 4); tip.rotateY(Math.PI / 4); add(P(tip, tm('#d8dce8')), 0, 1.24, 0, held).scale.z = 0.4;
        const ax = new THREE.Shape(); ax.moveTo(0, 0.12); ax.quadraticCurveTo(-0.12, 0.14, -0.2, 0.2); ax.quadraticCurveTo(-0.12, 0, -0.2, -0.16); ax.quadraticCurveTo(-0.1, -0.08, 0, -0.06); ax.lineTo(0, 0.12);
        const axGeo = new THREE.ExtrudeGeometry(ax, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.006, bevelSize: 0.005, bevelSegments: 1 }); axGeo.translate(-0.015, 0, -0.006);
        add(P(axGeo, tm('#d8dce8')), 0, 1.02, 0, held);
        add(P(new THREE.ConeGeometry(0.025, 0.14, 6), tm('#d8dce8')), 0.08, 1.02, 0, held).rotation.z = -Math.PI / 2;
        add(P(new THREE.ConeGeometry(0.05, 0.16, 8), tm('#ff8ad8')), 0, 0.92, 0, held).rotation.x = Math.PI;
        // 背中のマント：外は紫、裏は赤。肩の金の留め金からさがる
        cape = new THREE.Group(); cape.position.set(0, 0.47, -0.25); upper.add(cape);
        const cs = new THREE.Shape(); cs.moveTo(-0.22, 0); cs.lineTo(0.22, 0); cs.lineTo(0.32, -0.74); cs.quadraticCurveTo(0.24, -0.82, 0.16, -0.76); cs.quadraticCurveTo(0.08, -0.84, 0, -0.77); cs.quadraticCurveTo(-0.08, -0.84, -0.16, -0.76); cs.quadraticCurveTo(-0.24, -0.82, -0.32, -0.74); cs.lineTo(-0.22, 0);
        add(new THREE.Mesh(new THREE.ShapeGeometry(cs, 4), tm('#4a2468')), 0, 0, 0, cape).rotation.y = Math.PI;
        add(new THREE.Mesh(new THREE.ShapeGeometry(cs, 4), tm('#d8303c')), 0, 0, 0.004, cape);
        for (const s of [-1, 1]) rivet(s * 0.2, 0.47, -0.23, upper, 0.03);
      } else {
        // 欠けた大剣（刃の片がわに欠けのくぼみ）
        add(P(new THREE.CylinderGeometry(0.02, 0.022, 0.2, 8), leather), 0, 0, 0, held);
        add(P(new THREE.SphereGeometry(0.035, 10, 8), brass), 0, -0.12, 0, held);
        add(P(new THREEX.RoundedBoxGeometry(0.3, 0.04, 0.05, 2, 0.015), brass), 0, 0.11, 0, held);
        const bl = new THREE.Shape(); bl.moveTo(-0.055, 0); bl.lineTo(0.055, 0); bl.lineTo(0.05, 0.42); bl.lineTo(0.025, 0.46); bl.lineTo(0.048, 0.52); bl.lineTo(0.04, 0.78); bl.lineTo(0, 0.9); bl.lineTo(-0.045, 0.76); bl.lineTo(-0.05, 0.3); bl.lineTo(-0.055, 0);
        const bladeGeo = new THREE.ExtrudeGeometry(bl, { depth: 0.012, bevelEnabled: true, bevelThickness: 0.008, bevelSize: 0.006, bevelSegments: 1 }); bladeGeo.translate(0, 0, -0.006);
        add(P(bladeGeo, tm('#d4dae8')), 0, 0.13, 0, held);
        add(new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.5, 0.03), trim), 0, 0.42, 0, held);   // 刃のみぞ
        // 左手：肉球の紋の盾（青い地に、鉄のふち）
        const sh = new THREE.Shape(); sh.moveTo(-0.19, 0.22); sh.lineTo(0.19, 0.22); sh.lineTo(0.19, 0.02); sh.quadraticCurveTo(0.17, -0.18, 0, -0.27); sh.quadraticCurveTo(-0.17, -0.18, -0.19, 0.02); sh.lineTo(-0.19, 0.22);
        const shield = new THREE.Group(); shield.position.set(0.04, -0.2, 0.17); shield.rotation.set(0.8, -0.2, 0); arms[1].elbow.add(shield);
        const rimGeo = new THREE.ExtrudeGeometry(sh, { depth: 0.04, bevelEnabled: true, bevelThickness: 0.015, bevelSize: 0.015, bevelSegments: 1 }); rimGeo.translate(0, 0, -0.03);
        add(P(rimGeo, steel), 0, 0, 0, shield);
        const face = add(new THREE.Mesh(new THREE.ShapeGeometry(sh), tm(C.cloth)), 0, 0.005, 0.027, shield); face.scale.setScalar(0.86);
        add(new THREE.Mesh(paw(1.6), pawM), 0, -0.04, 0.03, shield);
        rivet(-0.15, 0.18, 0.04, shield); rivet(0.15, 0.18, 0.04, shield); rivet(0, -0.21, 0.04, shield);
      }
      // かぶと：首から浮いてふわふわ。猫耳、のぞき穴の奥に光る目、頭の上の稜
      const helm = new THREE.Group(); helm.position.y = 0.8; upper.add(helm);
      add(P(lathe([[0.2, -0.17], [0.215, -0.05], [0.218, 0.06], [0.2, 0.15], [0.14, 0.23], [0.001, 0.265]], 24), steel), 0, 0, 0, helm).scale.z = 0.96;
      add(new THREE.Mesh(new THREE.CircleGeometry(0.2, 18).rotateX(Math.PI / 2), hollow), 0, -0.168, 0, helm);
      ring(0.205, 0.016, -0.16, helm, rim);
      const slit = add(new THREE.Mesh(new THREE.CylinderGeometry(0.221, 0.221, 0.065, 16, 1, true, -0.85, 1.7), hollow), 0, 0.0, 0, helm); slit.scale.z = 0.96;
      const nose = add(P(new THREE.BoxGeometry(0.03, 0.15, 0.03), trim), 0, -0.1, 0.208, helm); nose.rotation.x = 0.06;
      const crest = add(P(new THREE.TorusGeometry(0.222, 0.02, 6, 20, Math.PI), rim), 0, 0.03, 0, helm); crest.rotation.y = Math.PI / 2; crest.scale.set(1, 1.07, 0.96);
      const holes = []; for (const s of [-1, 1]) for (let i = 0; i < 3; i++) holes.push(new THREE.CircleGeometry(0.011, 8).rotateY(s * (0.58 + i * 0.1)).translate(s * (0.12 + i * 0.022), -0.08 - (i % 2) * 0.025, 0.177 - i * 0.012));
      add(new THREE.Mesh(THREEX.BufferGeometryUtils.mergeGeometries(holes), hollow), 0, 0, 0, helm);   // 息の穴
      const helmEyes = [-1, 1].map(s => { const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.034, 12, 8), glowMat(eyeCol, 1.8)), s * 0.075, 0.002, 0.212, helm); e.scale.set(1.25, 0.85, 0.35); return e; });
      for (const s of [-1, 1]) {
        const eg = new THREE.ConeGeometry(0.085, 0.17, 4); eg.rotateY(Math.PI / 4);
        const ear = add(P(eg, steel), s * 0.125, 0.25, -0.01, helm); ear.scale.z = 0.5; ear.rotation.z = -s * 0.38;
        const ei = new THREE.ConeGeometry(0.05, 0.1, 4); ei.rotateY(Math.PI / 4);
        const inn = add(new THREE.Mesh(ei, maou ? tm('#d8303c') : trim), 0, -0.02, 0.025, ear); inn.scale.z = 0.4;
      }
      let sway = [];   // ゆれる飾り（さまよう鎧は片耳に結んだ布、魔王城のものは羽飾り）
      if (maou) {
        // 横の角（魔王と同じクリーム色）と、頭のうしろの桃色の羽飾り
        const horn = tm('#f0e6d0');
        for (const s of [-1, 1]) { const h = add(P(new THREE.ConeGeometry(0.045, 0.2, 8), horn), s * 0.27, 0.1, 0, helm); h.rotation.z = -s * 0.75; const h2 = add(P(new THREE.ConeGeometry(0.03, 0.1, 8), horn), 0, 0.12, 0, h); h2.rotation.z = s * 0.5; }
        const plume = new THREE.Group(); plume.position.set(0, 0.24, -0.08); helm.add(plume);
        sway = [0, -0.35, 0.35].map((rz, i) => { const q = new THREE.Group(); q.rotation.z = rz; plume.add(q); add(P(new THREE.ConeGeometry(0.06 - i * 0.012, 0.36 - i * 0.06, 10), tm(i ? '#ffb0e4' : '#ff8ad8')), 0, 0.15, 0, q); return q; });
      } else {
        const ribbon = new THREE.Group(); ribbon.position.set(0.17, 0.27, -0.03); helm.add(ribbon);
        add(new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 6), cloth), 0, 0, 0, ribbon);
        sway = [0.3, -0.3].map((ry, i) => { const q = new THREE.Group(); q.rotation.y = ry; ribbon.add(q); add(new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.012, 0.2 - i * 0.04), cloth), 0, 0, -0.1 + i * 0.02, q); return q; });
      }
      update = (dt, t) => {
        const ph = root.userData.ph, b = Math.sin(t * 2 + ph);
        // 体は少しかしいで、かちゃかちゃゆれる。かぶと・肩当ては、それぞれ遅れて浮きしずみ
        upper.position.y = 0.86 + b * 0.012; upper.rotation.z = Math.sin(t * 1.3 + ph) * 0.035; upper.rotation.y = Math.sin(t * 0.7 + ph) * 0.08;
        helm.position.y = 0.8 + Math.sin(t * 2 + ph - 0.9) * 0.028; helm.rotation.z = Math.sin(t * 0.9 + ph) * 0.1; helm.rotation.x = Math.sin(t * 1.1 + ph) * 0.05;
        pauls.forEach((g, i) => { g.position.y = 0.44 + Math.sin(t * 2 + ph - 0.5 - i * 0.6) * 0.016; });
        arms[0].g.rotation.set(-0.35 + b * 0.04, 0, -0.18); arms[0].elbow.rotation.x = -0.75 + b * 0.05;
        if (maou) { arms[1].g.rotation.set(-0.05 - b * 0.03, 0, 0.2); arms[1].elbow.rotation.x = -0.3 - b * 0.04; }
        else { arms[1].g.rotation.set(-0.2 - b * 0.03, 0, 0.22); arms[1].elbow.rotation.x = -0.6 - b * 0.04; }
        legs.forEach((g, i) => { g.rotation.z = (i ? 1 : -1) * 0.04; });
        front.rotation.x = Math.sin(t * 1.7 + ph) * 0.06 - 0.04; if (back) back.rotation.x = Math.sin(t * 1.7 + ph + 1) * 0.06 - 0.04;
        if (cape) cape.rotation.x = 0.2 + Math.sin(t * 1.7 + ph + 1) * 0.04;
        if (maou) sway.forEach((q, i) => { q.rotation.x = -0.85 + Math.sin(t * 3 + i * 1.1) * 0.12; });
        else sway.forEach((g, i) => { g.rotation.x = Math.sin(t * 6 + i * 1.3) * 0.2 - 1.1; });
        // まばたき（光がふっと細くなる）と、首の光のゆらぎ
        const blink = (t * 0.37 + ph) % 4 > 3.85 ? 0.15 : 1; helmEyes.forEach(e => { e.scale.y = 0.85 * blink; });
        soul.scale.setScalar(1 + Math.sin(t * 5 + ph) * 0.15);
      };
      emitFn = (p, pos) => { if (Math.random() < 0.3) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.25, pos.y + 1.45, pos.z), V3(0, 0.5, 0), hdr(eyeCol, 1.3), { life: 1, size: 0.09, drag: 0.5 }); };
      height = 1.9; radius = 0.6; scale = maou ? 1.15 : 1.1; break;
    }
    case 'wisp': {   // 古代ほたる：光る玉に小さな羽
      coreGlow(1.1, 0, 0.18);
      const wings = [-1, 1].map(s => { const w = add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), glowMat('#ffffff', 1.3, { transparent: true, opacity: 0.55, side: THREE.DoubleSide })), s * 0.2, 1.2, -0.05); w.scale.set(1, 0.55, 1); return w; });
      update = (dt, t) => wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (0.4 + Math.sin(t * 20) * 0.5); });
      emitFn = (p, pos) => { for (let i = 0; i < 2; i++) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.3, pos.y + 1.0 + Math.random() * 0.3, pos.z), V3((Math.random() - 0.5) * 0.4, -0.3, 0), hdr(col, 2), { life: 0.8, size: 0.12, drag: 1 }); };
      float = 0.25; height = 1.5; radius = 0.4; break;
    }
    case 'turtle': {   // こけむしガメ：苔の生えたこうら（草の芽と小さなきのこ）、首をのばして、むすっとした顔。短い四本足でのそのそ
      const sk = tm('#a8b878'), shellM = tm('#6a7a48'), rim = tm('#4a5a34'), belly = tm('#e0d4a0'), moss = tm(col), moss2 = tm('#4f8a34');
      add(P(new THREE.CylinderGeometry(0.62, 0.58, 0.12, 24), belly), 0, 0.3, 0).scale.z = 1.15;
      const shell = add(P(new THREE.SphereGeometry(0.66, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), shellM), 0, 0.34, 0); shell.scale.set(1, 0.78, 1.15);
      const ring = add(new THREE.Mesh(new THREE.TorusGeometry(0.65, 0.05, 6, 32), rim), 0, 0.36, 0); ring.rotation.x = Math.PI / 2; ring.scale.y = 1.15;
      // こうらの甲：上に六角の甲羅もよう、まわりを苔がおおう
      const plate = add(new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 0.02, 6), rim), 0, 0.855, 0); plate.scale.z = 1.15;
      for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2 + 0.3, r = 0.38 + (i % 2) * 0.1; const m = add(P(new THREE.SphereGeometry(0.14 + (i % 3) * 0.03, 10, 8), i % 3 ? moss : moss2), Math.cos(a) * r, 0.34 + Math.sqrt(Math.max(0, 1 - (r / 0.66) ** 2)) * 0.5, Math.sin(a) * r * 1.15); m.scale.y = 0.45; }
      // 草の芽と、小さなきのこ
      const sprout = new THREE.Group(); sprout.position.set(0.05, 0.86, -0.05); inner.add(sprout);
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.02, 0.2, 6), moss2), 0, 0.1, 0, sprout);
      for (const s of [-1, 1]) { const lf = add(P(new THREE.SphereGeometry(0.08, 10, 6), moss), s * 0.07, 0.2, 0, sprout); lf.scale.set(1, 0.3, 0.55); lf.rotation.z = -s * 0.5; }
      add(P(new THREE.CylinderGeometry(0.025, 0.03, 0.08, 8), tm('#f6ead2')), -0.32, 0.72, 0.28);
      add(P(new THREE.SphereGeometry(0.07, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), tm('#e87a6a')), -0.32, 0.76, 0.28);
      // 首と頭
      const neck = new THREE.Group(); neck.position.set(0, 0.42, 0.66); inner.add(neck);
      add(P(new THREE.CylinderGeometry(0.13, 0.16, 0.3, 14), sk), 0, 0.06, 0.06, neck).rotation.x = 0.9;
      const head = add(P(new THREE.SphereGeometry(0.24, 18, 14), sk), 0, 0.22, 0.24, neck); head.scale.set(1, 0.85, 1.05);
      eyes(0.1, 0.27, 0.42, 0.06, neck, { angry: true, lid: '#5a6a3a' });
      const mo = add(new THREE.Mesh(new THREE.TorusGeometry(0.05, 0.012, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: '#2a3a1a' })), 0, 0.14, 0.47, neck);
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff8d9d', transparent: true, opacity: 0.5 })), s * 0.15, 0.17, 0.42, neck).scale.set(1, 0.6, 0.4);
      // 足としっぽ
      const legs = [[-0.42, 0.42], [0.42, 0.42], [-0.42, -0.42], [0.42, -0.42]].map(([x, z]) => { const g = new THREE.Group(); g.position.set(x, 0.3, z); inner.add(g); add(P(new THREE.CylinderGeometry(0.12, 0.13, 0.3, 12), sk), 0, -0.13, 0, g); return g; });
      const tail = add(P(new THREE.ConeGeometry(0.07, 0.2, 8), sk), 0, 0.32, -0.8); tail.rotation.x = -Math.PI / 2 - 0.3;
      update = (dt, t) => {
        const ph = root.userData.ph;
        neck.position.z = 0.66 + Math.sin(t * 1.6 + ph) * 0.04; neck.rotation.y = Math.sin(t * 0.7 + ph) * 0.25;
        legs.forEach((g, i) => { g.rotation.x = Math.sin(t * 3 + ph + (i % 3 ? Math.PI : 0)) * 0.2; });
        sprout.rotation.z = Math.sin(t * 2.2 + ph) * 0.15; inner.rotation.z = Math.sin(t * 1.5 + ph) * 0.03;
      };
      height = 1.05; radius = 0.75; scale = 1.15; break;
    }
    case 'shard': {   // コドクのかけら：黒い結晶の群れに、さみしげな一つ目
      const cm = new THREE.MeshStandardMaterial({ color: '#1a1030', emissive: new THREE.Color(col), emissiveIntensity: 0.4, metalness: 0.4, roughness: 0.25, flatShading: true }); cm.userData.e0 = new THREE.Color(col); cm.userData.ei0 = 0.4; mats.push(cm);
      const cl = new THREE.Group(); cl.position.y = 1.0; inner.add(cl);
      for (let i = 0; i < 7; i++) { const s = add(P(new THREE.OctahedronGeometry(0.2 + Math.random() * 0.15, 0), cm), (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.5, (Math.random() - 0.5) * 0.4, cl); s.scale.y = 1.8; s.rotation.z = (Math.random() - 0.5); }
      const eye = add(new THREE.Mesh(new THREE.SphereGeometry(0.12, 14, 10), glowMat('#e8e0ff', 2.4)), 0, 1.05, 0.32); eye.scale.z = 0.4;
      add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#0a0014' })), 0, 1.03, 0.37);
      update = (dt, t) => { cl.rotation.y = t * 0.6; };
      emitFn = (p, pos) => { if (Math.random() < 0.5) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.8, pos.y + 0.5 + Math.random(), pos.z), V3(0, 0.5, 0), hdr('#6a4aaa', 1.4), { life: 1.2, size: 0.18, drag: 0.5 }); };
      float = 0.2; height = 1.6; radius = 0.55; break;
    }
    case 'void': {   // 虚ろ：うつろな黒い塊と輪
      const vm = new THREE.MeshStandardMaterial({ color: '#0e0818', emissive: new THREE.Color(col), emissiveIntensity: 0.3, roughness: 0.6 }); vm.userData.e0 = new THREE.Color(col); vm.userData.ei0 = 0.3; mats.push(vm);
      const b = add(P(new THREE.SphereGeometry(0.6, 20, 14), vm, { oc: '#8a6aff' }), 0, 1.2, 0); b.scale.set(1, 1.2, 1);
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glowMat('#e8e0ff', 3)), s * 0.2, 1.35, 0.52).scale.set(0.8, 1.4, 0.4);
      const rings = [0, 1].map(i => { const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.95 + i * 0.2, 0.02, 6, 48), glow), 0, 1.2, 0); return r; });
      update = (dt, t) => { rings[0].rotation.set(t * 0.8, t * 0.5, 0); rings[1].rotation.set(-t * 0.6, 0, t * 0.9); b.scale.y = 1.2 + Math.sin(t * 3) * 0.06; };
      emitFn = (p, pos) => { if (Math.random() < 0.6) p.emit(V3(pos.x + (Math.random() - 0.5) * 1.2, pos.y + 0.3, pos.z + (Math.random() - 0.5) * 1.2), V3(0, 0.8, 0), hdr('#4a2a8a', 1.5), { life: 1.4, size: 0.3, drag: 0.4 }); };
      float = 0.15; height = 2.2; radius = 0.8; scale = 1.1; break;
    }
    case 'shadowbeast': {   // コドクの獣：孤独から生まれた影の豹猫。低く構えた四つ足、炎のようにゆらぐ影のたてがみ、縦長の瞳の光る目と牙、ちぎれた鎖の首輪（コドクの鎖のなごり）、しなるしっぽ
      // 体は暗い紫のトゥーン（段のある陰とふちの光で、暗い戦場でも形が読める）。たてがみは少し明るい紫
      const OC = '#6a4aaa';
      const bm = tm('#22152f', { emissive: new THREE.Color(col), emissiveIntensity: 0.3 });
      const maneM = tm('#36224e', { emissive: new THREE.Color('#6a3aaa'), emissiveIntensity: 0.45 });
      const earIn = tm('#4a2258', { emissive: new THREE.Color('#c04ad8'), emissiveIntensity: 0.45 });
      const fangM = tm('#ece0ff', { emissive: new THREE.Color('#b89aff'), emissiveIntensity: 0.3 });
      const clawM = glowMat('#e0c8ff', 1.3), dark = new THREE.MeshBasicMaterial({ color: '#0c0614' });
      const metal = new THREE.MeshStandardMaterial({ color: '#3a3448', metalness: 0.8, roughness: 0.3 });
      const B = (geo, m = bm) => P(geo, m, { oc: OC });
      const UP = V3(0, 1, 0);
      // 向き (x, y, z) へのばす（形の +Y をその向きに）
      const aim = (o, x, y, z) => { o.quaternion.setFromUnitVectors(UP, V3(x, y, z).normalize()); return o; };
      // 先の丸い、太さの変わる棒：原点（太さ r1）から下へ len（太さ r2）
      const taper = (r1, r2, len, seg = 12) => {
        const pts = [];
        for (let i = 0; i <= 4; i++) { const a = Math.PI - i / 4 * Math.PI / 2; pts.push([Math.max(0.001, r2 * Math.sin(a)), -len + r2 * Math.cos(a)]); }
        for (let i = 1; i <= 4; i++) { const a = Math.PI / 2 - i / 4 * Math.PI / 2; pts.push([Math.max(0.001, r1 * Math.sin(a)), r1 * Math.cos(a)]); }
        return lathe(pts, seg);
      };
      const tuft = (r, h) => new THREE.ConeGeometry(r, h, 7).translate(0, h / 2, 0);   // 根もとが原点の毛の房
      // 影の炎：根もとがふくらみ、先は細くとがって、うしろ（-Z）へなびく
      const flame = (r, h, bend = 0.4) => {
        const g = lathe([[0.001, -0.03], [r * 0.9, 0], [r * 1.05, h * 0.18], [r * 0.85, h * 0.4], [r * 0.5, h * 0.68], [r * 0.18, h * 0.9], [0.001, h]], 9), q = g.attributes.position;
        for (let i = 0; i < q.count; i++) { const y = Math.max(0, q.getY(i)) / h; q.setZ(i, q.getZ(i) - y * y * h * bend); }
        return g;
      };
      // 胴：肩が高く、腰はやや低い。胸は厚く、腹はしぼる（前後にのびる一つの回転体）。首は前へ、少し下がる
      const body = new THREE.Group(); body.position.set(0, 0.74, -0.08); body.rotation.x = -0.08; inner.add(body);
      add(B(lathe([[0.001, -0.8], [0.15, -0.76], [0.27, -0.66], [0.32, -0.52], [0.3, -0.34], [0.26, -0.14], [0.3, 0.06], [0.36, 0.24], [0.35, 0.4], [0.27, 0.53], [0.16, 0.6], [0.001, 0.63]], 24).rotateX(Math.PI / 2)), 0, 0, 0, body).scale.set(0.82, 0.92, 1);
      add(B(taper(0.2, 0.17, 0.34)), 0, 0.06, 0.36, body).rotation.x = -1.3;
      // 影のたてがみ：首・肩・背中の三つの束。炎のように、それぞれゆらぐ
      const maneAt = (x, y, z, tufts) => {
        const g = new THREE.Group(); g.position.set(x, y, z); inner.add(g);
        for (const [tx, ty, tz, r, h, dx, dz] of tufts) aim(add(B(flame(r, h), maneM), tx, ty, tz, g), dx, 1, dz);
        return g;
      };
      const manes = [
        maneAt(0, 0.99, 0.44, [[0, 0, 0.06, 0.075, 0.26, 0, -0.4], [-0.075, -0.03, -0.02, 0.06, 0.21, -0.6, -0.5], [0.075, -0.03, -0.02, 0.06, 0.21, 0.6, -0.5]]),
        maneAt(0, 1.02, 0.16, [[0, 0, 0.04, 0.1, 0.42, 0, -0.45], [-0.1, -0.03, -0.02, 0.08, 0.3, -0.65, -0.45], [0.1, -0.03, -0.02, 0.08, 0.3, 0.65, -0.45]]),
        maneAt(0, 0.98, -0.3, [[0, 0, 0.04, 0.085, 0.28, 0, -0.55], [-0.08, -0.03, -0.06, 0.06, 0.19, -0.65, -0.6], [0.08, -0.03, -0.06, 0.06, 0.19, 0.65, -0.6], [0, -0.03, -0.24, 0.06, 0.17, 0, -0.8]]),
      ];
      // 首輪：コドクの鎖とおなじ鉄。ちぎれた鎖が三つ、胸の前にさがる
      const collar = add(P(new THREE.TorusGeometry(0.2, 0.034, 8, 28), metal, { oc: '#1a1624' }), 0, 0.8, 0.46); collar.rotation.x = -0.28;
      const chain = new THREE.Group(); chain.position.set(0, 0.61, 0.53); inner.add(chain);
      for (let i = 0; i < 3; i++) {
        const l = add(new THREE.Mesh(new THREE.TorusGeometry(0.042, 0.012, 6, 12, i === 2 ? Math.PI * 1.45 : Math.PI * 2), metal), 0, -0.04 - i * 0.07, 0, chain);
        l.rotation.set(0, i % 2 ? Math.PI / 2 : 0, Math.PI / 2 + (i === 2 ? 0.6 : 0)); l.scale.set(1.35, 1, 1);
      }
      // 頭：首から前へ。頭の骨・つき出た鼻づら・ほおの毛
      const head = new THREE.Group(); head.position.set(0, 0.87, 0.6); head.scale.setScalar(1.12); inner.add(head);
      add(B(new THREE.SphereGeometry(0.26, 22, 16)), 0, 0, 0.1, head).scale.set(1.05, 0.86, 1);
      add(B(new THREE.SphereGeometry(0.135, 18, 12)), 0, -0.07, 0.31, head).scale.set(1.15, 0.72, 1.05);
      for (const s of [-1, 1]) {
        aim(add(B(tuft(0.07, 0.24)), s * 0.19, -0.05, 0.1, head), s, -0.25, -0.7);
        aim(add(B(tuft(0.055, 0.18)), s * 0.17, -0.12, 0.08, head), s, -0.7, -0.6);
      }
      add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 10, 8), dark), 0, -0.035, 0.445, head).scale.set(1.3, 0.8, 0.8);
      // 耳：片方は先がちぎれている
      const ears = [-1, 1].map(s => {
        const g = new THREE.Group(); g.position.set(s * 0.15, 0.17, 0.03); g.rotation.set(-0.15, 0, -s * 0.32); head.add(g);
        const torn = s < 0;
        const og = (torn ? new THREE.CylinderGeometry(0.028, 0.1, 0.23, 4) : new THREE.ConeGeometry(0.1, 0.31, 4)).rotateY(Math.PI / 4).translate(0, torn ? 0.115 : 0.155, 0);
        add(B(og), 0, 0, 0, g).scale.z = 0.55;
        const ig = (torn ? new THREE.CylinderGeometry(0.02, 0.06, 0.16, 4) : new THREE.ConeGeometry(0.06, 0.21, 4)).rotateY(Math.PI / 4).translate(0, torn ? 0.09 : 0.115, 0);
        add(new THREE.Mesh(ig, earIn), 0, 0.005, 0.03, g).scale.z = 0.35;
        return g;
      });
      // 目：コドクと同じ、瞳のない縦長の白く光るうつろな目
      const eyeM = glowMat('#f4eeff', 2.8);
      // 左右の目は一つの組（まばたきは組ごと縦につぶす）
      const eyesB = new THREE.Group(); eyesB.position.set(0, 0.03, 0.315); head.add(eyesB);
      for (const s of [-1, 1]) { const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.058, 14, 10), eyeM), s * 0.105, 0, 0, eyesB); e.scale.set(0.8, 1.2, 0.35); e.rotation.z = s * 0.1; }
      // ひげ：光る細い線（一つの形にまとめる）
      const wh = [];
      for (const s of [-1, 1]) for (let i = 0; i < 3; i++) { const c = new THREE.CylinderGeometry(0.0045, 0.0025, 0.26, 4).translate(0, 0.13, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, V3(s, 0.18 - i * 0.16, 0.22).normalize())); wh.push(c.translate(s * 0.1, -0.05 - i * 0.02, 0.4)); }
      add(new THREE.Mesh(THREEX.BufferGeometryUtils.mergeGeometries(wh), glowMat('#c8a0ff', 1.2)), 0, 0, 0, head);
      // 牙と顎：上の牙は鼻づらに、下顎は付け根で開く。口の中はぼんやり光る
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.ConeGeometry(0.017, 0.11, 8), fangM), s * 0.075, -0.16, 0.39, head).rotation.x = Math.PI;
      const jawG = new THREE.Group(); jawG.position.set(0, -0.12, 0.16); head.add(jawG);
      add(B(new THREE.SphereGeometry(0.11, 16, 10)), 0, -0.035, 0.14, jawG).scale.set(1.05, 0.42, 1.35);
      add(new THREE.Mesh(new THREE.SphereGeometry(0.085, 14, 8), glowMat('#6a2a8a', 0.9)), 0, 0.012, 0.12, jawG).scale.set(1, 0.35, 1.4);
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.ConeGeometry(0.015, 0.06, 8), fangM), s * 0.06, 0.0, 0.23, jawG);
      // 足：前足は肩・ひじ、うしろ足はもも・ひざ・かかと。足先に光る爪。関節のうしろに毛の房
      const claws = (g, y, z) => add(new THREE.Mesh(THREEX.BufferGeometryUtils.mergeGeometries([-1, 0, 1].map(i => { const c = new THREE.ConeGeometry(0.013, 0.065, 6).translate(0, 0.032, 0); c.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(UP, V3(i * 0.25, -0.45, 1).normalize())); return c.translate(i * 0.04, 0, 0); })), clawM), 0, y, z, g);
      const paw = (g, y) => { add(B(new THREE.SphereGeometry(0.085, 14, 10)), 0, y, 0.04, g).scale.set(1.05, 0.55, 1.35); claws(g, y - 0.005, 0.13); };
      const fronts = [-1, 1].map(s => {
        const g = new THREE.Group(); g.position.set(s * 0.18, 0.74, 0.32); inner.add(g);
        add(B(taper(0.125, 0.08, 0.3)), 0, 0, 0, g);
        const elbow = new THREE.Group(); elbow.position.y = -0.31; g.add(elbow);
        add(B(taper(0.075, 0.06, 0.26)), 0, 0, 0, elbow);
        aim(add(B(tuft(0.045, 0.15)), 0, 0.01, -0.04, elbow), s * 0.2, -0.5, -1);
        paw(elbow, -0.35);
        return { g, elbow };
      });
      const hinds = [-1, 1].map(s => {
        const g = new THREE.Group(); g.position.set(s * 0.19, 0.72, -0.55); inner.add(g);
        add(B(taper(0.18, 0.085, 0.28)), 0, 0, 0, g);
        const knee = new THREE.Group(); knee.position.y = -0.28; g.add(knee);
        add(B(taper(0.085, 0.062, 0.25)), 0, 0, 0, knee);
        const hock = new THREE.Group(); hock.position.y = -0.25; knee.add(hock);
        add(B(taper(0.06, 0.05, 0.16)), 0, 0, 0, hock);
        aim(add(B(tuft(0.045, 0.14)), 0, 0.0, -0.04, hock), s * 0.2, 0.2, -1);
        paw(hock, -0.19);
        return { g, knee, hock };
      });
      // しっぽ：一本の管を、毎コマ曲げなおす（節に分けると、つなぎ目に輪郭の線が出て数珠に見える）。うしろ上へのびて、先は影の炎
      const tailG = new THREE.Group(); tailG.position.set(0, 0.8, -0.8); inner.add(tailG);
      const TN = 14, TR = 8, TL = 0.86, tipI = (TN + 1) * TR;
      const tpos = new Float32Array((tipI + 1) * 3), tnor = new Float32Array(tpos.length), tidx = [];
      for (let j = 0; j < TN; j++) for (let a = 0; a < TR; a++) { const i0 = j * TR + a, i1 = j * TR + (a + 1) % TR; tidx.push(i0, i0 + TR, i1, i1, i0 + TR, i1 + TR); }
      for (let a = 0; a < TR; a++) tidx.push(TN * TR + a, tipI, TN * TR + (a + 1) % TR);
      const tailGeo = new THREE.BufferGeometry();
      tailGeo.setAttribute('position', new THREE.BufferAttribute(tpos, 3).setUsage(THREE.DynamicDrawUsage));
      tailGeo.setAttribute('normal', new THREE.BufferAttribute(tnor, 3).setUsage(THREE.DynamicDrawUsage));
      tailGeo.setIndex(tidx); tailGeo.boundingSphere = new THREE.Sphere(V3(0, 0.4, -0.3), 1.0);
      add(B(tailGeo), 0, 0, 0, tailG);
      const tip = new THREE.Group(); tailG.add(tip);
      for (const [dx, dz, h] of [[0, 0.1, 0.28], [-0.55, 0.3, 0.18], [0.55, 0.3, 0.18]]) aim(add(B(flame(0.055, h, 0.5), maneM), 0, -0.02, 0, tip), dx, 1, dz);
      const tq = new THREE.Quaternion(), tqs = new THREE.Quaternion(), te = new THREE.Euler(), tc = V3(), tax = V3(), taz = V3(), tdir = V3(), tq0 = new THREE.Quaternion().setFromEuler(new THREE.Euler(-1.2, 0, 0));
      // 根もとから先へ、少しずつ曲げながら輪を置く。上へ巻く強さ（kx）と左右のゆれ（kz）は、根もとから先へ波のように伝わる
      const bendTail = (t, ph, gait) => {
        const ds = TL / TN; tq.copy(tq0); tc.set(0, 0, 0);
        for (let j = 0; j <= TN; j++) {
          const sj = j / TN, r = lerp(0.078, 0.032, sj);
          tax.set(1, 0, 0).applyQuaternion(tq); taz.set(0, 0, 1).applyQuaternion(tq);
          for (let a = 0; a < TR; a++) {
            const th = a / TR * Math.PI * 2, cs = Math.cos(th), sn = Math.sin(th), k = (j * TR + a) * 3;
            const nx = tax.x * cs + taz.x * sn, ny = tax.y * cs + taz.y * sn, nz = tax.z * cs + taz.z * sn;
            tpos[k] = tc.x + nx * r; tpos[k + 1] = tc.y + ny * r; tpos[k + 2] = tc.z + nz * r; tnor[k] = nx; tnor[k + 1] = ny; tnor[k + 2] = nz;
          }
          if (j === TN) break;
          tdir.set(0, 1, 0).applyQuaternion(tq); tc.addScaledVector(tdir, ds);
          te.set((1.2 + Math.sin(t * 1.1 + ph - sj * 2.5) * 0.5) * ds, 0, Math.sin(t * 1.6 + ph - sj * 3) * (1.1 + gait * 0.8) * ds);
          tq.multiply(tqs.setFromEuler(te));
        }
        tdir.set(0, 1, 0).applyQuaternion(tq);
        const k = tipI * 3; tpos[k] = tc.x + tdir.x * 0.035; tpos[k + 1] = tc.y + tdir.y * 0.035; tpos[k + 2] = tc.z + tdir.z * 0.035; tnor[k] = tdir.x; tnor[k + 1] = tdir.y; tnor[k + 2] = tdir.z;
        tailGeo.attributes.position.needsUpdate = true; tailGeo.attributes.normal.needsUpdate = true;
        tip.position.copy(tc); tip.quaternion.copy(tq);
      };
      bendTail(0, 0, 0);
      // 動かさない部品をまとめて、描く回数を減らす（動きはすべて Group で付けている）
      mergeRigid(inner);
      // root.userData.jaw（0〜1）：顎をあける（かみつき）。swipe（0〜1）：前足をふりあげる（影の爪あと）
      let last = null, gait = 0, gph = 0, jaw = 0, sw = 0;
      update = (dt, t) => {
        const ph = root.userData.ph, U = root.userData, p = root.position;
        // 動いた速さ（探索で歩く・戦闘でとびかかる）で足を運ぶ。止まると、もとの構えにもどる
        if (!last) last = p.clone();
        if (dt > 0) { const v = Math.min(10, Math.hypot(p.x - last.x, p.z - last.z) / dt); gait += (Math.min(1, v / 2) - gait) * (1 - Math.exp(-8 * dt)); gph += v * dt * 2.6; }
        last.copy(p);
        const k = 1 - Math.exp(-22 * dt);
        jaw += ((U.jaw || 0) - jaw) * k; sw += ((U.swipe || 0) - sw) * (1 - Math.exp(-14 * dt));
        const br = Math.sin(t * 1.8 + ph);
        body.scale.set(1 + br * 0.012, 1 + br * 0.02, 1); body.position.z = -0.08 + Math.sin(t * 0.9 + ph) * 0.012;
        inner.position.y = Math.abs(Math.sin(gph)) * 0.05 * gait;
        // 頭：低くかまえて、獲物をさがすように左右を見る
        head.rotation.set(0.04 + Math.sin(t * 0.9 + ph) * 0.04 + sw * 0.15, Math.sin(t * 0.55 + ph) * 0.22 * (1 - sw), Math.sin(t * 0.7 + ph) * 0.05);
        jawG.rotation.x = 0.04 + Math.max(jaw * 0.75, sw * 0.5, (Math.sin(t * 2.4 + ph) * 0.5 + 0.5) * 0.07);
        ears.forEach((g, i) => { const tw = (t * 0.45 + ph + i * 1.7) % 6 > 5.8 ? 0.35 : 0; g.rotation.x = -0.15 - tw - jaw * 0.3; });
        eyesB.scale.y = (t * 0.33 + ph) % 5 > 4.86 ? 0.15 : 1;
        manes.forEach((g, i) => { g.scale.y = 1 + Math.sin(t * 7 + i * 2.1 + ph) * 0.08 + Math.sin(t * 11.3 + i) * 0.04; g.rotation.x = Math.sin(t * 3 + i * 1.3 + ph) * 0.06 - gait * 0.15; });
        chain.rotation.set(Math.sin(t * 1.8 + ph) * 0.12 + Math.sin(gph * 2) * 0.3 * gait, 0, Math.sin(t * 1.3 + ph) * 0.1);
        bendTail(t, ph, gait);
        // 足：歩くときは対角の足をそろえて運ぶ
        fronts.forEach((L, i) => {
          const c = gph + (i ? Math.PI : 0), lift = Math.max(0, Math.cos(c)) * gait;
          L.g.rotation.x = Math.sin(c) * 0.45 * gait; L.elbow.rotation.x = lift * 0.7;
          if (i === 0 && sw > 0.001) { L.g.rotation.x = lerp(L.g.rotation.x, -1.15, sw); L.elbow.rotation.x = lerp(L.elbow.rotation.x, -0.85, sw); L.g.rotation.z = -0.75 * sw; } else L.g.rotation.z = 0;
        });
        hinds.forEach((L, i) => {
          const c = gph + (i ? 0 : Math.PI), lift = Math.max(0, Math.cos(c)) * gait;
          L.g.rotation.x = -0.5 + Math.sin(c) * 0.4 * gait - sw * 0.2; L.knee.rotation.x = 1.0 + lift * 0.5 + sw * 0.2; L.hock.rotation.x = -0.5 - lift * 0.3;
        });
      };
      emitFn = (p, pos) => {
        // たてがみから影が立ちのぼり、足もとに影がよどむ
        if (Math.random() < 0.5) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.6, pos.y + 1.1 + Math.random() * 0.35, pos.z + (Math.random() - 0.5) * 0.6), V3(0, 0.6, 0), hdr('#5a3a9a', 1.4), { life: 1, size: 0.22, drag: 0.5 });
        if (Math.random() < 0.3) p.emit(V3(pos.x + (Math.random() - 0.5) * 1.1, pos.y + 0.05, pos.z + (Math.random() - 0.5) * 1.1), V3(0, 0.25, 0), hdr('#3a2470', 1.2), { life: 1.2, size: 0.3, drag: 0.8 });
      };
      height = 1.4; radius = 0.85; scale = 1.1; break;
    }
    case 'kodoku': {   // コドク：世界に広がった孤独の化身。巨大な影の猫、うつろな目、鎖、思い出のかけら
      const km = new THREE.MeshStandardMaterial({ color: '#07040f', emissive: new THREE.Color(col), emissiveIntensity: 0.5, roughness: 0.8 }); km.userData.e0 = new THREE.Color(col); km.userData.ei0 = 0.5; mats.push(km);
      const body = add(P(new THREE.SphereGeometry(1.3, 28, 20), km, { oc: '#8a5aff' }), 0, 1.6, 0); body.scale.set(1, 1.15, 0.9);
      const head = add(P(new THREE.SphereGeometry(1.1, 28, 20), km, { oc: '#8a5aff' }), 0, 3.4, 0.2); head.scale.set(1.15, 0.95, 0.95);
      catEars(0.7, 4.45, 0.1, 5, km);
      const eyeM = glowMat('#f4eeff', 3.5), eyesK = [];
      for (const s of [-1, 1]) { const e = add(new THREE.Mesh(new THREE.SphereGeometry(0.26, 16, 12), eyeM), s * 0.45, 3.45, 1.1); e.scale.set(0.8, 1.2, 0.3); eyesK.push(e); }
      // 鎖（ほかの誰にも届かない）
      const chainM = new THREE.MeshStandardMaterial({ color: '#3a3448', metalness: 0.8, roughness: 0.3 });
      const chains = [];
      for (let k = 0; k < 4; k++) { const g = new THREE.Group(); g.position.set(0, 1.8, 0); g.rotation.y = k * Math.PI / 2 + 0.4; inner.add(g); for (let i = 0; i < 9; i++) { const l = new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.035, 6, 12), chainM); l.position.set(1.3 + i * 0.22, -i * 0.12, 0); l.rotation.y = i % 2 ? Math.PI / 2 : 0; g.add(l); } chains.push(g); }
      // 思い出のかけら（色を失った写真のような板）
      const mem = [];
      for (let i = 0; i < 8; i++) { const m = add(new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.36), new THREE.MeshBasicMaterial({ color: hdr('#b8a8e8', 0.9), transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false })), 0, 0, 0); mem.push({ m, a: i / 8 * Math.PI * 2, y: 1 + (i % 3) * 1.1 }); }
      const core = coreGlow(1.7, 1.0, 0.25);
      update = (dt, t) => {
        mem.forEach((o, i) => { const a = o.a + t * 0.35; o.m.position.set(Math.cos(a) * 2.6, o.y + Math.sin(t + i) * 0.2, Math.sin(a) * 2.0); o.m.rotation.y = -a; });
        chains.forEach((g, i) => { g.rotation.z = Math.sin(t * 0.8 + i) * 0.08; });
        eyesK.forEach(e => { e.scale.y = 1.2 * (Math.sin(t * 0.7) > 0.97 ? 0.1 : 1); });
        body.scale.x = 1 + Math.sin(t * 1.4) * 0.03; core.scale.setScalar(1 + Math.sin(t * 3) * 0.15);
      };
      emitFn = (p, pos) => { for (let i = 0; i < 3; i++) p.emit(V3(pos.x + (Math.random() - 0.5) * 3, pos.y + Math.random() * 3.5, pos.z + (Math.random() - 0.5) * 2), V3((Math.random() - 0.5) * 0.3, 0.8 + Math.random(), 0), hdr(Math.random() < 0.3 ? '#8a6aff' : '#2a1a4a', 1.6), { life: 1.6, size: 0.35, drag: 0.4 }); };
      height = 4.6; radius = 1.8; break;
    }
    case 'pudding': {   // 超巨大プリン：ぷるるん
      const pm = tm('#ffe08a'), cm = tm('#8a4a1a'), plate = tm('#ffffff');
      add(P(new THREE.CylinderGeometry(1.1, 1.15, 0.08, 32), plate), 0, 0.04, 0);
      const body = add(P(new THREE.CylinderGeometry(0.62, 0.9, 1.1, 28), pm), 0, 0.63, 0);
      const top = add(P(new THREE.CylinderGeometry(0.6, 0.63, 0.18, 28), cm), 0, 1.22, 0);
      const cream = add(P(new THREE.SphereGeometry(0.2, 12, 10), tm('#ffffff')), 0, 1.4, 0); cream.scale.y = 0.8;
      const cherry = add(new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), tm('#e83a4a')), 0, 1.58, 0);
      eyes(0.2, 0.75, 0.78, 0.09);
      update = (dt, t) => { const w = Math.sin(t * 5 + root.userData.ph) * 0.05; body.scale.set(1 + w, 1 - w, 1 + w); top.position.y = 1.22 - w * 1.1; cream.position.y = 1.4 - w * 1.1; cherry.position.y = 1.58 - w * 1.1; };
      height = 1.7; radius = 1.1; scale = 1.5; break;
    }
    case 'fish': {   // 喋る魚：しっぽで立ち、めがねと蝶ネクタイ
      const fm = tm(col), bm = tm('#e8f6ff');
      const body = add(P(new THREE.SphereGeometry(0.4, 20, 14), fm), 0, 1.0, 0); body.scale.set(0.55, 1.4, 0.8);
      add(P(new THREE.SphereGeometry(0.3, 16, 12), bm), 0, 0.95, 0.12).scale.set(0.45, 1.2, 0.6);
      const tail = add(P(new THREE.ConeGeometry(0.28, 0.4, 3), fm), 0, 0.28, 0); tail.rotation.x = Math.PI; tail.scale.z = 0.3;
      for (const s of [-1, 1]) { const fin = add(P(new THREE.SphereGeometry(0.12, 10, 8), fm), s * 0.24, 0.95, 0.05); fin.scale.set(0.3, 1, 0.6); }
      eyes(0.12, 1.4, 0.26, 0.07);
      const gl = new THREE.MeshBasicMaterial({ color: '#2a2a3a' });
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.012, 6, 16), gl), s * 0.12, 1.4, 0.3);
      const mouth = add(new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.02, 6, 12), tm('#ff8a9a')), 0, 1.2, 0.3);
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 6), tm('#e83a4a')), s * 0.06, 0.62, 0.32).scale.set(1.2, 0.8, 0.5);
      update = (dt, t) => { mouth.scale.y = 0.6 + Math.abs(Math.sin(t * 10)) * 0.8; inner.rotation.z = Math.sin(t * 3) * 0.08; };
      height = 1.7; radius = 0.45; break;
    }
    case 'tamas': {   // 100匹のタマ：小さなタマの山
      const g = new THREE.Group(); inner.add(g);
      const minis = [];
      const spots = [[0, 0, 0], [0.55, 0, 0.1], [-0.55, 0, 0.1], [0.28, 0, -0.45], [-0.28, 0, -0.45], [0, 0.55, -0.15], [0.3, 0.52, 0.2], [-0.3, 0.52, 0.2], [0, 1.02, 0]];
      for (const [x, y, z] of spots) { const m = buildCat('tama', { look: { sprout: y > 0.9 ? '#7ad86a' : null }, gear: { weapon: null } }); m.group.scale.setScalar(0.55); m.group.position.set(x, y, z + 0.1); m.setPose(POSES.idle); m.face.set('sleepy'); g.add(m.group); mats.push(...m.mats); minis.push(m); }
      update = (dt, t) => minis.forEach((m, i) => { m.update(dt, t + i); m.group.position.y = spots[i][1] + Math.abs(Math.sin(t * 2 + i)) * 0.04; });
      height = 1.6; radius = 0.9; break;
    }
    case 'jarashi': {   // 魔界ねこじゃらし：ゆれる茎の先に、ふさふさの穂。穂に目と猫耳、根もとに葉っぱ
      const stemM = tm('#5a8a4a'), plumeM = tm(col), leafM = tm('#6aa85a');
      for (let i = 0; i < 3; i++) { const lf = add(P(new THREE.SphereGeometry(0.22, 10, 6), leafM), Math.cos(i * 2.1) * 0.18, 0.06, Math.sin(i * 2.1) * 0.18); lf.scale.set(1, 0.18, 0.45); lf.rotation.y = -i * 2.1; }
      const sway = new THREE.Group(); inner.add(sway);
      const st = add(P(new THREE.CylinderGeometry(0.025, 0.04, 0.9, 8), stemM), 0, 0.45, 0, sway);
      const head = new THREE.Group(); head.position.y = 0.9; sway.add(head);
      // 穂：細い芯に、長い毛をびっしり放射状に。先へいくほど細く、少しうしろへしなる
      const hairM = tm('#' + new THREE.Color(col).lerp(new THREE.Color('#ffffff'), 0.3).getHexString());
      for (let i = 0; i < 9; i++) {
        const k = i / 8, r = 0.12 * (1 - k * 0.55), y = 0.04 + i * 0.075, z = -k * k * 0.12;
        add(new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), plumeM), 0, y, z, head).scale.y = 1.2;
        const n = Math.round(16 - k * 7), len = 0.22 * (1 - k * 0.45);
        for (let j = 0; j < n; j++) {
          const a = (j + (i % 2) * 0.5) / n * Math.PI * 2, dir = V3(Math.cos(a), 0.55, Math.sin(a)).normalize();
          const hg = new THREE.ConeGeometry(0.03, len, 4); hg.translate(0, len / 2, 0);
          const hair = add(new THREE.Mesh(hg, j % 3 ? plumeM : hairM), Math.cos(a) * r * 0.6, y, z + Math.sin(a) * r * 0.6, head);
          hair.quaternion.setFromUnitVectors(V3(0, 1, 0), dir);
        }
      }
      catEars(0.1, 0.72, -0.1, 0.65, plumeM, head);
      eyes(0.075, 0.3, 0.2, 0.06, head);
      update = (dt, t) => { const ph = root.userData.ph; sway.rotation.z = Math.sin(t * 2.4 + ph) * 0.22; sway.rotation.x = Math.sin(t * 1.7 + ph) * 0.1; head.rotation.z = Math.sin(t * 2.4 + ph - 0.6) * 0.25; };
      height = 1.7; radius = 0.4; scale = 1.1; break;
    }
    case 'candle': {   // 生きている燭台：金の台に三本のろうそく。まん中の太いろうそくに顔、桃色の炎がゆらめく
      const gold = tm('#d8b048', { emissive: new THREE.Color('#d8b048'), emissiveIntensity: 0.15 }), wax = tm('#f6eee0');
      add(P(new THREE.CylinderGeometry(0.22, 0.3, 0.08, 16), gold), 0, 0.04, 0);
      add(P(new THREE.CylinderGeometry(0.04, 0.06, 0.6, 10), gold), 0, 0.36, 0);
      const arm = add(P(new THREE.TorusGeometry(0.32, 0.03, 6, 20, Math.PI), gold), 0, 0.82, 0); arm.rotation.z = Math.PI;
      const flames = [];
      for (const [x, y, r, h] of [[-0.32, 0.82, 0.06, 0.22], [0.32, 0.82, 0.06, 0.22], [0, 0.68, 0.14, 0.56]]) {
        add(P(new THREE.CylinderGeometry(r * 1.4, r * 1.2, 0.05, 12), gold), x, y, 0);
        add(P(new THREE.CylinderGeometry(r, r, h, 14), wax), x, y + h / 2, 0);
        const f = add(new THREE.Mesh(new THREE.SphereGeometry(r * 0.8, 10, 8), glowMat(col, 3)), x, y + h + r * 0.9, 0); f.scale.y = 1.7; flames.push(f);
        const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 1.4), blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(r * 6); f.add(sp);
      }
      // ろうのたれ
      for (const a of [0.4, 2.2, 4.1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), wax), Math.cos(a) * 0.14, 1.1 + Math.sin(a * 3) * 0.04, Math.sin(a) * 0.14).scale.y = 1.8;
      eyes(0.05, 1.0, 0.13, 0.04);
      update = (dt, t) => { const ph = root.userData.ph; flames.forEach((f, i) => { const k = Math.sin(t * 9 + i * 2 + ph) * 0.12 + Math.sin(t * 23 + i) * 0.05; f.scale.set(1 - k * 0.5, 1.7 + k, 1 - k * 0.5); }); inner.position.y = Math.abs(Math.sin(t * 3 + ph)) * 0.06; inner.rotation.z = Math.sin(t * 3 + ph) * 0.05; };
      emitFn = (p, pos) => { if (Math.random() < 0.35) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.3, pos.y + 1.35, pos.z), V3(0, 0.7, 0), hdr(col, 1.6), { life: 0.7, size: 0.08, drag: 0.6 }); };
      height = 1.4; radius = 0.45; scale = 1.15; break;
    }
    case 'yarn': {   // ころころ毛糸玉：巻いた糸の筋の入った玉に猫耳と目、ほどけた糸がしっぽのように
      const ym = tm(col), line = tm('#' + new THREE.Color(col).multiplyScalar(0.7).getHexString());
      const ball = new THREE.Group(); ball.position.y = 0.42; inner.add(ball);
      add(P(new THREE.SphereGeometry(0.42, 24, 16), ym), 0, 0, 0, ball);
      for (let i = 0; i < 6; i++) { const r = add(new THREE.Mesh(new THREE.TorusGeometry(0.425, 0.012, 6, 40), line), 0, 0, 0, ball); r.rotation.set(i * 0.55, i * 1.1, i * 0.3); }
      catEars(0.2, 0.8, 0, 0.9, ym);
      eyes(0.13, 0.5, 0.38, 0.065);
      // ほどけた糸：うしろへのびて、くねくね動く
      const tail = []; let par = inner;
      for (let i = 0; i < 6; i++) { const q = new THREE.Group(); q.position.set(0, i ? 0 : 0.1, i ? -0.1 : -0.4); par.add(q); add(new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.11, 6), ym), 0, 0, -0.05, q).rotation.x = Math.PI / 2; tail.push(q); par = q; }
      update = (dt, t) => { const ph = root.userData.ph, b = Math.abs(Math.sin(t * 4 + ph)); inner.position.y = b * 0.1; ball.rotation.x = t * 1.5; ball.scale.set(1 + (1 - b) * 0.06, 1 - (1 - b) * 0.08, 1 + (1 - b) * 0.06); tail.forEach((q, i) => { q.rotation.y = Math.sin(t * 4 + i * 0.8 + ph) * 0.4; }); };
      height = 1.0; radius = 0.45; break;
    }
    default: {   // 形の分からない敵：光る球
      coreGlow(1, 0, 0.3); float = 0.2; height = 1.6; radius = 0.6;
    }
  }
  root.userData.ph = Math.random() * 6;
  root.scale.setScalar(scale); root.userData.s0 = scale;
  root.traverse(o => { if (o.isMesh && !o.userData.outline) o.castShadow = true; });
  return enemyModel(root, inner, mats, key, d, { height: height * scale, radius: radius * scale, float, update, emitFn });
}

// 骨組みの敵：にゃんこの体を内側に入れ、構えて立たせる
function critterEnemy(key, d, C) {
  const base = C.key ? CHARS[C.key] || NPCS[C.key] : null;
  const def = { look: { ...(base ? base.look : {}), ...(C.look || {}) }, gear: { ...(base ? base.gear : {}), ...(C.gear || {}) }, color: base ? base.color : undefined, scale: C.scale || 1 };
  const m = buildCat(key, { def });
  m.setPose(POSES.ready);
  if (C.expr) m.face.set(C.expr);
  const root = new THREE.Group(), inner = new THREE.Group(); root.add(inner); inner.add(m.group);
  root.userData.s0 = 1;
  const emitFn = C.look && C.look.material === 'ghost'
    ? (p, pos) => { if (Math.random() < 0.4) p.emit(V3(pos.x + (Math.random() - 0.5) * m.radius * 2, pos.y + Math.random() * m.height, pos.z + (Math.random() - 0.5) * m.radius), V3(0, 0.7, 0), hdr(C.look.ghostCol || '#6a4aff', 1.6), { life: 1.1, size: 0.14 * (C.scale || 1), drag: 0.5 }); }
    : d.shape === 'nekogami' || d.shape === 'guardian'
      ? (p, pos) => { if (Math.random() < 0.5) p.emit(V3(pos.x + (Math.random() - 0.5) * m.radius * 3, pos.y + Math.random() * m.height, pos.z + (Math.random() - 0.5) * m.radius * 2), V3(0, 0.8, 0), hdr(d.color, 1.8), { life: 1.4, size: 0.12, drag: 0.4 }); }
      : null;
  // 神さまは雲の上にすわり、背中に光の輪
  let extra = null;
  if (d.shape === 'nekogami') {
    const halo = new THREE.Mesh(new THREE.TorusGeometry(2.2, 0.06, 8, 64), glowMat('#ffe08a', 2.4)); halo.position.set(0, m.height * 0.9, -1.2); inner.add(halo);
    const cloud = new THREE.Group(); inner.add(cloud);
    for (let i = 0; i < 9; i++) { const a = i / 9 * Math.PI * 2; const c = new THREE.Mesh(new THREE.SphereGeometry(0.9, 14, 10), toon('#ffffff')); c.position.set(Math.cos(a) * 1.6, 0.2, Math.sin(a) * 1.1); cloud.add(c); }
    m.group.position.y = 0.6;
    extra = (dt, t) => { halo.rotation.z = t * 0.3; };
  }
  if (d.shape === 'maou') {   // 魔王：背後に紫のオーラ
    const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#8a3aff', 0.6), blending: THREE.AdditiveBlending, depthWrite: false })); aura.scale.setScalar(4); aura.position.set(0, m.height * 0.6, -0.4); inner.add(aura);
  }
  return enemyModel(root, inner, m.mats, key, d, {
    height: m.height + (d.shape === 'nekogami' ? 0.6 : 0), radius: m.radius, float: d.shape === 'nekogami' ? 0.2 : 0,
    update: (dt, t) => { m.update(dt, t); if (extra) extra(dt, t); }, emitFn, critter: m,
    flash: (c, a) => m.flash(c, a),
  });
}

function enemyModel(root, inner, mats, key, d, o) {
  const model = {
    group: root, inner, mats, key, height: o.height, radius: o.radius, color: d.color, flashAmt: 0, flashCol: new THREE.Color(1, 1, 1),
    brokenAmt: 0, isBoss: !!d.boss, critter: o.critter || null, float: o.float || 0,   // float：ふわふわ浮く幅（体の中心は 0.1 の高さ）
    update(dt, t) {
      inner.position.y = o.float ? 0.1 + Math.sin(t * 1.8 + this.seed) * o.float : inner.position.y;
      if (o.critter) o.critter.still = this.still;   // 猫の姿の敵：凍結中はまばたき・耳も止める
      if (o.update) o.update(dt, t);
      // 撃破状態：ふらふらする
      inner.rotation.x = -this.brokenAmt * 0.25;
      inner.rotation.z = this.brokenAmt * 0.1 * Math.sin(t * 7);
      if (o.critter) return;
      if (this.flashAmt > 0.001) {
        this.flashAmt *= Math.pow(0.004, dt);
        for (const m of mats) { if (!m.emissive) continue; m.emissive.copy(this.flashCol); m.emissiveIntensity = this.flashAmt * 0.6; }
      } else if (this.flashAmt !== 0) {
        this.flashAmt = 0;
        for (const m of mats) { if (!m.emissive) continue; m.emissive.copy(m.userData.e0 || new THREE.Color(0)); m.emissiveIntensity = m.userData.ei0 || 0; }
      }
    },
    emit: o.emitFn,
    flash(c = '#ffffff', amt = 1) { if (o.flash) o.flash(c, amt); else { this.flashCol.set(c); this.flashAmt = amt; } },
    seed: Math.random() * 10,
  };
  return model;
}
