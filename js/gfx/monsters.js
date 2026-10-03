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
  impboss:   { look: { fur: '#6a4ab8', eye: '#ffe07a', muzzle: '#9a80d8', paws: '#9a80d8', earIn: '#ff9ac8', horns: '#fff0d8', wings: '#3a1a5a', glasses: '#1a1a2a', vest: '#2a2a3a', ribbon: '#c83a3a', blush: 0 }, scale: 1.45, expr: 'worry' },
  maou:      { key: 'maou', scale: 1.7, expr: 'smug' },
  // 魔王軍四天王：js/npcs.js の人物の見た目を、そのまま大きくして使う
  k_gutsu:   { key: 'gutsugutsu', scale: 1.55, expr: 'joy' },
  k_nemu:    { key: 'nemunemu', scale: 1.55, expr: 'sleepy' },
  k_choki:   { key: 'chokichoki', scale: 1.5, expr: 'gentle' },
  k_dodon:   { key: 'dodon', scale: 1.6, expr: 'smug' },
  fakemike:  { key: 'mike', look: { patches: ['#3b302c', '#f29a3e'], eye: '#8a6aff', band: '#3a6ad8', cape: '#3a6ad8' }, scale: 1.0, expr: 'smug' },
  plush:     { key: 'kuro', look: { fur: '#5a5870', muzzle: '#6a6880', eye: '#1a1a22', eyeScale: 0.6, scarf: '#d86a8a', armor: null }, gear: { weapon: null }, scale: 1.25, expr: 'neutral' },
  nekogami:  { look: { fur: '#ffe8a8', pattern: 'tabby', patches: ['#f0c060'], eye: '#ffffff', eye2: '#ffffff', muzzle: '#fff6dc', paws: '#fff6dc', earIn: '#ffb8a8', crown: '#ffcf4a', cape: '#ffffff', capeIn: '#ffcf4a', sleepy: true, blush: 0.35 }, scale: 3.2, expr: 'sleepy' },
};

function buildEnemy(key) {
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
    case 'mushroom': {   // ねこまたきのこ：猫耳の傘、しっぽが二本
      const stemM = tm('#f6ead2'), capM = tm(col);
      add(P(new THREE.CylinderGeometry(0.2, 0.26, 0.55, 16), stemM), 0, 0.3, 0);
      const cap = add(P(new THREE.SphereGeometry(0.46, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), capM), 0, 0.52, 0); cap.scale.y = 0.75;
      for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2, sp = add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), tm('#ffffff')), Math.cos(a) * 0.3, 0.72, Math.sin(a) * 0.3); sp.scale.y = 0.4; }
      catEars(0.26, 0.82, 0, 1, capM);
      eyes(0.09, 0.36, 0.245, 0.06, inner, { angry: false });
      const tails = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.08, 0.15, -0.2); inner.add(g); let par = g; for (let i = 0; i < 4; i++) { const q = new THREE.Group(); if (i) q.position.y = 0.09; par.add(q); const m = P(new THREE.CapsuleGeometry(0.035, 0.06, 3, 8), capM); m.position.y = 0.045; q.add(m); par = q; } return g; });
      update = (dt, t) => { inner.position.y = Math.abs(Math.sin(t * 4 + root.userData.ph)) * 0.08; tails.forEach((g, i) => { g.rotation.set(-0.9, 0, (i ? 1 : -1) * 0.4 + Math.sin(t * 3 + i) * 0.3); let q = g.children[0]; while (q) { q.rotation.x = -0.15; q = q.children.find(c => c.isGroup); } }); };
      height = 1.1; radius = 0.5; break;
    }
    case 'squirrel': {   // おこりリス：大きなしっぽ、どんぐり
      const fm = tm(col), bm = tm('#fff0dc');
      const body = add(P(new THREE.SphereGeometry(0.28, 20, 14), fm), 0, 0.38, 0); body.scale.set(1, 1.15, 0.95);
      add(P(new THREE.SphereGeometry(0.17, 14, 10), bm), 0, 0.34, 0.16).scale.set(1, 1.3, 0.6);
      const head = add(P(new THREE.SphereGeometry(0.26, 20, 14), fm), 0, 0.82, 0.03);
      add(P(new THREE.SphereGeometry(0.12, 12, 8), bm), 0, 0.74, 0.2).scale.set(1.2, 0.8, 0.8);
      for (const s of [-1, 1]) { const e = add(P(new THREE.ConeGeometry(0.07, 0.18, 6), fm), s * 0.14, 1.08, 0); e.rotation.z = -s * 0.2; }
      eyes(0.09, 0.86, 0.22, 0.06, inner, { angry: true });
      const tailG = new THREE.Group(); tailG.position.set(0, 0.25, -0.25); inner.add(tailG);
      for (let i = 0; i < 7; i++) { const a = i / 6; add(P(new THREE.SphereGeometry(0.16 + Math.sin(a * Math.PI) * 0.08, 12, 10), fm), 0, a * 0.8, -Math.sin(a * Math.PI) * 0.35 + a * 0.15, tailG); }
      const acorn = add(new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), tm('#a0602a')), 0.2, 0.5, 0.2); acorn.scale.y = 1.2;
      update = (dt, t) => { tailG.rotation.x = Math.sin(t * 5 + root.userData.ph) * 0.12; inner.position.y = Math.abs(Math.sin(t * 5)) * 0.03; };
      height = 1.2; radius = 0.45; break;
    }
    case 'crow': {   // いたずらカラス：宙に浮いて羽ばたく
      const fm = tm(col), bk = tm('#ffcf4a');
      const body = add(P(new THREE.SphereGeometry(0.3, 18, 14), fm), 0, 1.0, 0); body.scale.set(1, 0.9, 1.3);
      const head = add(P(new THREE.SphereGeometry(0.22, 16, 12), fm), 0, 1.3, 0.25);
      const beak = add(P(new THREE.ConeGeometry(0.07, 0.2, 8), bk), 0, 1.27, 0.5); beak.rotation.x = Math.PI / 2;
      eyes(0.1, 1.35, 0.42, 0.055, inner, { angry: true });
      const wings = [-1, 1].map(s => { const g = new THREE.Group(); g.position.set(s * 0.25, 1.05, 0); inner.add(g); const w = add(P(new THREE.SphereGeometry(0.3, 12, 8), fm), s * 0.25, 0, 0, g); w.scale.set(1.1, 0.15, 0.6); return g; });
      const tail = add(P(new THREE.ConeGeometry(0.15, 0.35, 6), fm), 0, 0.95, -0.42); tail.rotation.x = -Math.PI / 2.4; tail.scale.x = 1.6;
      update = (dt, t) => wings.forEach((g, i) => { g.rotation.z = (i ? -1 : 1) * Math.sin(t * 12 + root.userData.ph) * 0.6; });
      float = 0.18; height = 1.6; radius = 0.55; break;
    }
    case 'rock': {   // ころころ岩：ころがる岩に顔、頭に苔
      const rm = new THREE.MeshStandardMaterial({ color: col, roughness: 0.95, flatShading: true }); rm.userData.e0 = new THREE.Color(0); rm.userData.ei0 = 0; mats.push(rm);
      const r = add(P(new THREE.DodecahedronGeometry(0.55, 1), rm), 0, 0.55, 0);
      const moss = add(new THREE.Mesh(new THREE.SphereGeometry(0.36, 12, 8, 0, Math.PI * 2, 0, Math.PI / 3), tm('#6aa84a')), 0, 0.9, -0.05); moss.scale.y = 0.6;
      eyes(0.17, 0.62, 0.5, 0.08, inner, { angry: true });
      update = (dt, t) => { r.rotation.x = Math.sin(t * 2 + root.userData.ph) * 0.2; inner.position.y = Math.abs(Math.sin(t * 2)) * 0.05; };
      height = 1.15; radius = 0.6; scale = 1.1; break;
    }
    case 'boar': {   // はらぺこイノシシ：大きな体、牙、毛のたてがみ
      const fm = tm(col), sn = tm('#e8a888'), tusk = tm('#fff6e0');
      const body = add(P(new THREE.SphereGeometry(0.7, 24, 16), fm), 0, 0.75, -0.1); body.scale.set(0.95, 0.8, 1.3);
      const head = add(P(new THREE.SphereGeometry(0.45, 20, 14), fm), 0, 0.85, 0.75);
      const snout = add(P(new THREE.CylinderGeometry(0.2, 0.24, 0.2, 16), sn), 0, 0.72, 1.18); snout.rotation.x = Math.PI / 2;
      for (const s of [-1, 1]) { add(new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), new THREE.MeshBasicMaterial({ color: '#4a2020' })), s * 0.07, 0.74, 1.29); const tk = add(P(new THREE.ConeGeometry(0.05, 0.28, 8), tusk), s * 0.24, 0.72, 1.05); tk.rotation.set(-0.6, 0, -s * 0.4); }
      for (const s of [-1, 1]) { const e = add(P(new THREE.ConeGeometry(0.12, 0.22, 6), fm), s * 0.3, 1.25, 0.6); e.rotation.z = -s * 0.5; }
      eyes(0.18, 0.98, 1.08, 0.075, inner, { angry: true });
      for (let i = 0; i < 6; i++) add(P(new THREE.ConeGeometry(0.08, 0.3, 5), tm('#5a3a2a')), 0, 1.3 - i * 0.03, 0.4 - i * 0.2).rotation.x = -0.4;
      for (const [x, z] of [[-0.35, 0.4], [0.35, 0.4], [-0.35, -0.6], [0.35, -0.6]]) add(P(new THREE.CylinderGeometry(0.12, 0.1, 0.4, 10), fm), x, 0.2, z);
      update = (dt, t) => { head.rotation.x = Math.sin(t * 2) * 0.05; };
      height = 1.6; radius = 1.0; scale = 1.5; break;
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
    case 'armor': {   // さまよう鎧：中身のない、猫耳かぶとの鎧
      const am = new THREE.MeshStandardMaterial({ color: col, metalness: 0.7, roughness: 0.35 }); am.userData.e0 = new THREE.Color(0); am.userData.ei0 = 0; mats.push(am);
      for (const s of [-1, 1]) add(P(new THREE.CylinderGeometry(0.1, 0.12, 0.5, 10), am), s * 0.15, 0.25, 0);
      add(P(new THREEX.RoundedBoxGeometry(0.6, 0.55, 0.4, 2, 0.08), am), 0, 0.8, 0);
      const helm = add(P(new THREE.SphereGeometry(0.3, 18, 12), am), 0, 1.32, 0.02);
      catEars(0.17, 1.58, 0, 1.1, am);
      add(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.06, 0.05), glowMat('#8affe0', 3)), 0, 1.32, 0.29);
      for (const s of [-1, 1]) add(P(new THREE.SphereGeometry(0.15, 12, 8), am), s * 0.4, 1.02, 0);
      const sw = add(P(new THREE.BoxGeometry(0.08, 1.1, 0.02), tm('#c8d0e0')), -0.5, 0.8, 0.3); sw.rotation.set(0.5, 0, 0.2);
      emitFn = (p, pos) => { if (Math.random() < 0.3) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.4, pos.y + 1.3, pos.z), V3(0, 0.6, 0), hdr('#8affe0', 1.4), { life: 1, size: 0.1, drag: 0.5 }); };
      height = 1.8; radius = 0.6; scale = 1.15; break;
    }
    case 'wisp': {   // 古代ほたる：光る玉に小さな羽
      coreGlow(1.1, 0, 0.18);
      const wings = [-1, 1].map(s => { const w = add(new THREE.Mesh(new THREE.CircleGeometry(0.22, 12), glowMat('#ffffff', 1.3, { transparent: true, opacity: 0.55, side: THREE.DoubleSide })), s * 0.2, 1.2, -0.05); w.scale.set(1, 0.55, 1); return w; });
      update = (dt, t) => wings.forEach((w, i) => { w.rotation.y = (i ? -1 : 1) * (0.4 + Math.sin(t * 20) * 0.5); });
      emitFn = (p, pos) => { for (let i = 0; i < 2; i++) p.emit(V3(pos.x + (Math.random() - 0.5) * 0.3, pos.y + 1.0 + Math.random() * 0.3, pos.z), V3((Math.random() - 0.5) * 0.4, -0.3, 0), hdr(col, 2), { life: 0.8, size: 0.12, drag: 1 }); };
      float = 0.25; height = 1.5; radius = 0.4; break;
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
    case 'shadowbeast': {   // コドクの獣：影の四つ足、光る目
      const bm = new THREE.MeshStandardMaterial({ color: '#1a1028', emissive: new THREE.Color(col), emissiveIntensity: 0.35, roughness: 0.7 }); bm.userData.e0 = new THREE.Color(col); bm.userData.ei0 = 0.35; mats.push(bm);
      const body = add(P(new THREE.SphereGeometry(0.45, 20, 14), bm, { oc: '#6a4aaa' }), 0, 0.75, -0.1); body.scale.set(0.9, 0.75, 1.4);
      const head = add(P(new THREE.SphereGeometry(0.32, 18, 12), bm, { oc: '#6a4aaa' }), 0, 1.0, 0.55);
      catEars(0.16, 1.28, 0.5, 1.1, bm);
      for (const s of [-1, 1]) add(new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), glowMat('#ff6aff', 4)), s * 0.12, 1.04, 0.84).scale.set(1, 0.6, 0.5);
      for (const [x, z] of [[-0.25, 0.35], [0.25, 0.35], [-0.25, -0.55], [0.25, -0.55]]) add(P(new THREE.CylinderGeometry(0.08, 0.06, 0.55, 8), bm, { oc: '#6a4aaa' }), x, 0.28, z);
      emitFn = (p, pos) => { if (Math.random() < 0.6) p.emit(V3(pos.x + (Math.random() - 0.5) * 1, pos.y + Math.random() * 1.2, pos.z + (Math.random() - 0.5) * 1), V3(0, 0.6, 0), hdr('#5a3a9a', 1.4), { life: 1, size: 0.25, drag: 0.5 }); };
      height = 1.4; radius = 0.8; scale = 1.1; break;
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
  const def = { look: { ...(base ? base.look : {}), ...(C.look || {}) }, gear: { ...(base ? base.gear : {}), ...(C.gear || {}) }, elem: base ? base.elem : 'physical', scale: C.scale || 1 };
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
    brokenAmt: 0, isBoss: !!d.boss, critter: o.critter || null,
    update(dt, t) {
      inner.position.y = o.float ? 0.1 + Math.sin(t * 1.8 + this.seed) * o.float : inner.position.y;
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
