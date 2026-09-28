'use strict';
// ============================================================
//  3Dビュー：ショーケース（ハブ／キャラ）／ワープ／バトル
// ============================================================
class BaseView {
  constructor(theme, fov = 38, envOpts = {}) {
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(fov, 1280 / 720, 0.1, 800);
    this.env = buildEnvironment(this.scene, theme, GFX.renderer, envOpts);
    this.p = this.env.particles;
    this.fx = new FX(this.scene, this.p);
    this.camPos = V3(0, 2, 8); this.camLook = V3(0, 1, 0); this.curLook = V3(0, 1, 0);
    this.camSpeed = 3;
  }
  setCam(pos, look, { snap = false, speed = 3 } = {}) {
    this.camPos.copy(pos); this.camLook.copy(look); this.camSpeed = speed;
    if (snap) { this.camera.position.copy(pos); this.curLook.copy(look); }
  }
  update(dt, t) {
    this.env.update(dt, t);
    const k = 1 - Math.exp(-this.camSpeed * dt);
    this.camera.position.lerp(this.camPos, k);
    this.curLook.lerp(this.camLook, k);
    this.camera.lookAt(this.curLook);
    this.fx.update(dt, this.camera);
    this.p.update(dt);
  }
  dispose() {
    if (this.scene.environment) this.scene.environment.dispose();
    disposeTree(this.scene);
    if (this.onDispose) this.onDispose();
  }
}

// 台座に立つキャラクター（ハブ・キャラ画面・ワープ演出）
class ShowcaseView extends BaseView {
  constructor(key, { screenX = 640, dist = 4.4, height = 1.0 } = {}) {
    super('space', 32);
    this.bloomStrength = 0.9;
    this.rotY = -0.35; this.targetRot = -0.35; this.spin = 0;
    this.dist = dist; this.lookH = height;
    const plat = new THREE.Group(); this.scene.add(plat); this.plat = plat;
    const disk = new THREE.Mesh(new THREE.CylinderGeometry(1.3, 1.45, 0.2, 64), new THREE.MeshStandardMaterial({ color: '#12152a', metalness: 0.4, roughness: 0.55 }));
    disk.position.y = -0.1; disk.receiveShadow = true; plat.add(disk);
    this.rings = [1.32, 1.1, 0.7].map((r, i) => {
      const m = new THREE.Mesh(new THREE.RingGeometry(r - 0.02, r, 96), glowMat(i ? '#9d8cff' : '#e8c77a', 2.5, { side: THREE.DoubleSide }));
      m.rotation.x = -Math.PI / 2; m.position.y = 0.005 + i * 0.001; plat.add(m); return m;
    });
    this.halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#7d6bff', 0.25), blending: THREE.AdditiveBlending, depthWrite: false }));
    this.halo.scale.set(3.2, 3.2, 1); this.halo.position.set(0, 1.1, -1.2); this.scene.add(this.halo);
    this.frame(screenX);
    this.setCam(V3(0, 1.3, dist), V3(0, height, 0), { snap: true });
    if (key) this.setChar(key, false);
  }
  frame(screenX) { this.camera.setViewOffset(1280, 720, 640 - screenX, 0, 1280, 720); }
  setChar(key, burst = true) {
    if (this.model) { this.scene.remove(this.model.group); disposeTree(this.model.group); }
    this.model = null;
    if (!key) return;
    const m = buildCharacter(key); this.model = m; this.scene.add(m.group);
    m.setPose(POSES.idle); m.group.rotation.y = this.rotY;
    const col = ELEMENTS[CHARS[key].elem].color;
    this.halo.material.color.copy(hdr(col, 0.3));
    this.rings[1].material.color.copy(hdr(col, 2.5));
    if (burst) {
      this.fx.pillar(V3(0, 0, 0), col, { h: 6, r: 0.9, life: 0.9 });
      this.fx.ring(V3(0, 0.05, 0), col, { r: 3, life: 0.8 });
      this.p.burst(V3(0, 1, 0), col, 80, { speed: 4, life: 1.2, size: 0.1, up: 0.5 });
      m.flash('#ffffff', 1.5);
    }
  }
  bindDrag(el) {
    let down = false, lx = 0;
    el.addEventListener('pointerdown', e => { down = true; lx = e.clientX; el.setPointerCapture(e.pointerId); });
    el.addEventListener('pointermove', e => { if (down) { this.targetRot += (e.clientX - lx) * 0.012; lx = e.clientX; } });
    el.addEventListener('pointerup', () => { down = false; });
  }
  update(dt, t, rdt) {
    super.update(rdt, t);
    this.rotY += (this.targetRot - this.rotY) * (1 - Math.exp(-6 * rdt));
    if (this.model) {
      this.model.group.rotation.y = this.rotY + this.spin;
      this.model.update(rdt, t);
      // 時々ポーズを変える
      const ph = Math.floor(t / 6) % 3;
      const pose = ph === 2 ? POSES.ready : POSES.idle;
      for (const k of POSE_KEYS) this.model.pose[k] += ((pose[k] || 0) - this.model.pose[k]) * (1 - Math.exp(-3 * rdt));
    }
    this.rings.forEach((r, i) => { r.rotation.z = t * (0.2 + i * 0.15) * (i % 2 ? -1 : 1); });
    this.camera.position.x += Math.sin(t * 0.25) * 0.002;
    if (Math.random() < rdt * 12) this.p.emit(V3((Math.random() - 0.5) * 2.4, 0.05, (Math.random() - 0.5) * 2.4), V3(0, 0.6 + Math.random() * 0.8, 0), hdr('#9d8cff', 1.5), { life: 2, size: 0.05, drag: 0 });
  }
}

// タイトル：宇宙と星海列車
class TitleView extends BaseView {
  constructor() {
    super('space', 45);
    this.bloomStrength = 1.0;
    this.setCam(V3(-10, 8, 22), V3(10, 6, -40), { snap: true, speed: 0.4 });
  }
  update(dt, t, rdt) {
    this.camPos.set(-10 + Math.sin(t * 0.05) * 6, 8 + Math.sin(t * 0.08) * 2, 22);
    super.update(rdt, t);
  }
}

// ワープ：星のトンネル → キャラ登場
class WarpView extends ShowcaseView {
  constructor() {
    super(null, { screenX: 440, dist: 4.6 });
    this.tunnel = 0; this.meteorCol = null;
    this.plat.visible = false;
    // ハイパースペースの光条
    const N = 700, pos = new Float32Array(N * 6), col = new Float32Array(N * 6);
    this.streak = { N, pos, col, z: new Float32Array(N), sp: new Float32Array(N), ang: new Float32Array(N), rad: new Float32Array(N) };
    for (let i = 0; i < N; i++) this.resetStreak(i, true);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.lines = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false }));
    this.lines.frustumCulled = false; this.lines.visible = false; this.scene.add(this.lines);
  }
  resetStreak(i, init) {
    const s = this.streak;
    s.z[i] = init ? -Math.random() * 120 : -120 - Math.random() * 20;
    s.sp[i] = 40 + Math.random() * 60; s.ang[i] = Math.random() * Math.PI * 2; s.rad[i] = 1.2 + Math.pow(Math.random(), 0.6) * 14;
    const c = Math.random() < 0.35 && this.meteorCol ? hdr(this.meteorCol, 3) : hdr(Math.random() < 0.5 ? '#bcd0ff' : '#e6dcff', 2.2);
    for (let k = 0; k < 2; k++) { s.col[i * 6 + k * 3] = c.r * (k ? 0.1 : 1); s.col[i * 6 + k * 3 + 1] = c.g * (k ? 0.1 : 1); s.col[i * 6 + k * 3 + 2] = c.b * (k ? 0.1 : 1); }
  }
  startTunnel(color) {
    this.tunnel = 1; this.tunnelT = 0; this.meteorCol = color; this.plat.visible = false; this.setChar(null); this.frame(640);
    for (let i = 0; i < this.streak.N; i++) this.resetStreak(i, true);
    this.lines.visible = true;
    this.setCam(V3(0, 40, 6), V3(0, 40, -20), { snap: true });
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(color, 6), blending: THREE.AdditiveBlending, depthWrite: false }));
    m.scale.setScalar(1.2);
    const from = V3(-14, 48, -40), to = V3(0, 40, -6);
    this.fx.add(m, 2.0, (tt, o) => {
      const e = Ease.in(tt);
      o.position.lerpVectors(from, to, e);
      o.scale.setScalar(1.2 + e * 4);
      for (let i = 0; i < 6; i++) this.p.emit(o.position, V3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)), hdr(color, 4), { life: 0.8, size: 0.4 + e * 0.6 });
    });
    GFX.tween(2.0, () => {}, Ease.linear, true).then(() => { if (this.tunnel) GFX.flash(color, 0.9, 0.6); });
  }
  reveal(key, rarity) {
    this.tunnel = 0; this.plat.visible = true; this.lines.visible = false; this.frame(440); this.camera.rotation.z = 0;
    this.setCam(V3(0, 1.3, this.dist), V3(0, this.lookH, 0), { snap: true });
    this.targetRot = this.rotY = -0.3; this.spin = rarity >= 5 ? Math.PI * 2 : 0;
    GFX.tween(1.0, t => { this.spin = (rarity >= 5 ? Math.PI * 2 : 0) * (1 - t); }, Ease.out, true);
    if (key) this.setChar(key, true);
    else {
      this.setChar(null);
      const book = new THREE.Mesh(new THREEX.RoundedBoxGeometry(0.7, 0.9, 0.15, 3, 0.04), toon('#4b77d8', { emissive: new THREE.Color('#2a4aa8'), emissiveIntensity: 0.4 }));
      book.position.y = 1.1; this.fx.add(book, 60, (t, o, dt) => { o.rotation.y += dt; });
      this.fx.pillar(V3(0, 0, 0), '#7fb6ff', { h: 5, r: 0.7 });
    }
    const col = rarity === 5 ? '#ffd66b' : rarity === 4 ? '#c58bff' : '#7fb6ff';
    this.fx.ring(V3(0, 0.05, 0), col, { r: 4, life: 1.2 });
    this.p.burst(V3(0, 1.2, 0), col, rarity * 30, { speed: 6, life: 1.5, size: 0.12 });
  }
  update(dt, t, rdt) {
    if (this.tunnel) {
      const s = this.streak, acc = 1 + this.tunnelT * 1.5;
      this.tunnelT = (this.tunnelT || 0) + rdt;
      for (let i = 0; i < s.N; i++) {
        s.z[i] += s.sp[i] * rdt * acc;
        if (s.z[i] > 8) this.resetStreak(i, false);
        const x = Math.cos(s.ang[i]) * s.rad[i], y = 40 + Math.sin(s.ang[i]) * s.rad[i], len = s.sp[i] * 0.06 * acc;
        s.pos.set([x, y, s.z[i], x, y, s.z[i] - len], i * 6);
      }
      this.lines.geometry.attributes.position.needsUpdate = true;
      this.lines.geometry.attributes.color.needsUpdate = true;
      this.camera.rotation.z = Math.sin(t * 0.8) * 0.05;
    } else this.tunnelT = 0;
    super.update(dt, t, rdt);
  }
}

// ============================================================
//  バトルビュー（演出ディレクター）
// ============================================================
// 専用の必殺技演出を持つキャラ（ready＝対象選択前の発動演出、strike＝攻撃）
// splash / aim はポーズ名、aura は光らせる物（weapon＝武器、shield＝盾）
const ULT_CINE = {
  aster:  { ready: 'asterReady', strike: 'asterStrike', col: '#4f9dff', splash: 'ultSplash', aim: 'ultAim', aura: 'weapon' },
  mizore: { ready: 'mizoreReady', strike: 'mizoreStrike', col: '#6fd6f5', splash: 'mzSplash', aim: 'mzAim', aura: 'shield', snow: true },
};
// 魔法陣のテクスチャ（加算合成用、白地に黒は透過扱い）
function runeTex() {
  if (TexCache.rune) return TexCache.rune;
  const S = 1024, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.translate(S / 2, S / 2); g.strokeStyle = '#fff'; g.fillStyle = '#fff'; g.lineCap = 'round';
  const circ = (r, w) => { g.lineWidth = w; g.beginPath(); g.arc(0, 0, r, 0, Math.PI * 2); g.stroke(); };
  circ(500, 8); circ(470, 3); circ(330, 5); circ(300, 2); circ(150, 6);
  for (const rot of [0, Math.PI]) { g.lineWidth = 4; g.beginPath(); for (let i = 0; i <= 3; i++) { const a = rot + i * Math.PI * 2 / 3 - Math.PI / 2; g.lineTo(Math.cos(a) * 470, Math.sin(a) * 470); } g.stroke(); }
  for (let i = 0; i < 48; i++) {   // 外周の文字のような刻み
    const a = i / 48 * Math.PI * 2; g.save(); g.rotate(a); g.translate(0, -400);
    g.lineWidth = 3; g.beginPath(); const k = i * 7 % 5;
    g.moveTo(-12, -20); g.lineTo(k * 5 - 10, 0); g.lineTo(12, 20 - k * 6); if (k % 2) { g.moveTo(-10, 18); g.lineTo(10, 18); } g.stroke(); g.restore();
  }
  for (let i = 0; i < 12; i++) { const a = i / 12 * Math.PI * 2; g.lineWidth = 3; g.beginPath(); g.moveTo(Math.cos(a) * 150, Math.sin(a) * 150); g.lineTo(Math.cos(a) * 300, Math.sin(a) * 300); g.stroke(); g.beginPath(); g.arc(Math.cos(a) * 225, Math.sin(a) * 225, 14, 0, Math.PI * 2); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.anisotropy = 4;
  return (TexCache.rune = t);
}

// 第二形態の演出の型：星核の番人は赤黒い雷、氷刃の女帝は吹雪と氷の棘
const P2_STYLES = {
  boss_core: { sub: '#ffb0c0', dark: '#ff1030', crown: { color: '#2a0810', ei: 1.6 }, pulse: '#b0001c', fog: '#3a0612', swirl: ['#ffffff', null, '#8a0018'],
    tint: [0.45, 0.7, 0.65], desat: 0.35, charge: '#200008', hook: 'coreSurge', bolts: true, tone: [70, 55, 52] },
  boss_empress: { sub: '#e8fbff', dark: '#3aa8ff', crown: { color: '#cfefff', emissive: '#3aa0e0', ei: 0.9, opacity: 0.9 }, pulse: '#bff0ff', fog: '#3a5a8e', swirl: ['#ffffff', null, '#bfeaff'],
    tint: [0.5, 0.25, 0.02], desat: 0.3, charge: '#e8f8ff', hook: 'blizzard', spikes: true, snow: true, tone: [180, 90, 70] },
};

class BattleView extends BaseView {
  constructor(battle, theme) {
    // 物語の場所で戦う（第一章）：探索フィールドの区画を背景に組み立てる
    const loc = battle.opts.loc && typeof resolveBattleSet === 'function' ? resolveBattleSet(battle.opts.loc) : null;
    super(theme, 38, loc ? { field: true, bare: true, zone: FIELD_ZONES[loc.zone] } : {});
    this.b = battle;
    if (loc) buildBattleSet(this, loc);
    this.bloomStrength = 0.85;
    // 雪の場所は白が飛びやすいので、光のにじみと露出を抑える
    if (loc && theme === 'snow') { this.bloomStrength = 0.45; this.exposure = 0.9; }
    this.ents = new Map();
    this.markGeo = new THREE.RingGeometry(0.75, 0.9, 64);
    this.sway = 0.4; this.swayOff = V3(); this.roll = 0;
    this.scene.add(this.camera);   // カメラ子のスプラッシュ背景を描くため
    this.wide();
    this.setCam(V3(0, 9, 16), V3(0, 1, -3), { snap: true });
    battle.allies.forEach((u, i) => this.addAlly(u, i, battle.allies.length));
  }

  // ---------- 配置 ----------
  ent(u) { return this.ents.get(u.uid); }
  addAlly(u, i, n) {
    const m = buildCharacter(u.key);
    const home = V3((i - (n - 1) / 2) * 1.6, 0, 3.0);
    m.group.position.copy(home); m.group.rotation.y = Math.PI;
    m.setPose(POSES.ready);
    this.scene.add(m.group);
    const e = { u, model: m, home, ally: true };
    e.mark = this.makeMark(); this.ents.set(u.uid, e);
    if (!u.alive) this.allyDown(u, true);
  }
  makeMark() {
    const mat = new THREE.MeshBasicMaterial({ color: hdr('#e8c77a', 3), transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
    const m = new THREE.Mesh(this.markGeo, mat); m.rotation.x = -Math.PI / 2; m.position.y = 0.03; this.scene.add(m);
    return m;
  }
  layoutEnemies(list) {
    const alive = list;
    const gap = 0.9;
    const widths = alive.map(u => (this.ent(u) ? this.ent(u).model.radius : 0.7) * 2 + gap);
    const total = widths.reduce((a, b) => a + b, 0);
    let x = -total / 2;
    alive.forEach((u, i) => {
      const e = this.ent(u); if (!e) return;
      const w = widths[i];
      const d = u.def;
      e.home = V3(x + w / 2, 0, d.boss ? -5.6 : d.elite ? -3.4 : -2.9);
      x += w;
    });
  }
  syncEnemies(list) {
    const ids = new Set(list.map(u => u.uid));
    for (const [id, e] of this.ents) {
      if (!e.ally && !ids.has(id)) {
        this.scene.remove(e.model.group); disposeTree(e.model.group); this.scene.remove(e.mark); if (e.ice) this.scene.remove(e.ice);
        if (e.p2 && e.p2.g) { this.scene.remove(e.p2.g); disposeTree(e.p2.g); if (e.p2.fog0 && this.scene.fog) this.scene.fog.color.copy(e.p2.fog0); }
        this.ents.delete(id);
      }
    }
    const fresh = [];
    for (const u of list) {
      if (this.ents.has(u.uid)) continue;
      const m = buildEnemy(u.key);
      m.group.rotation.y = 0;
      this.scene.add(m.group);
      const e = { u, model: m, ally: false, home: V3() };
      e.mark = this.makeMark();
      this.ents.set(u.uid, e); fresh.push(e);
    }
    this.layoutEnemies(list);
    for (const u of list) {
      const e = this.ent(u);
      if (fresh.includes(e)) {
        e.model.group.position.copy(e.home).add(V3(0, -e.model.height, 0));
        const col = e.model.color;
        this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), col, { r: e.model.radius * 2.2, life: 0.9 });
        this.p.burst(e.home.clone().add(V3(0, 0.5, 0)), col, 40, { speed: 3, up: 1.5, life: 1 });
        GFX.tween(0.7, t => { e.model.group.position.y = -e.model.height * (1 - t); }, Ease.out);
      } else {
        const from = e.model.group.position.clone();
        GFX.tween(0.4, t => e.model.group.position.lerpVectors(from, e.home, t));
      }
    }
  }

  // ---------- カメラ ----------
  enemyCenter() {
    const es = this.b.aliveEnemies().map(u => this.ent(u)).filter(Boolean);
    if (!es.length) return V3(0, 0, -3);
    return es.reduce((a, e) => a.add(e.home), V3()).multiplyScalar(1 / es.length);
  }
  wide() {
    const hasBoss = this.b.enemies.some(e => e.def.boss);
    this.unfocus(); this.setFov(38); this.roll = 0; this.sway = 0.4;
    this.setCam(V3(0, hasBoss ? 3.0 : 2.5, hasBoss ? 10.8 : 9.6), V3(0, hasBoss ? 2.4 : 1.5, -2.5), { speed: 2.5 });
  }
  // 本家風の肩越し視点：手前左に行動キャラ、奥の中央に敵
  shoulder(e, { snap = false, speed = 2.6 } = {}) {
    const h = e.home, c = this.enemyCenter(), boss = this.b.enemies.some(x => x.def.boss);
    const f = V3(c.x - h.x, 0, c.z - h.z).normalize(), r = V3(-f.z, 0, f.x);
    const pos = h.clone().addScaledVector(f, -3.3).addScaledVector(r, 1.3); pos.y = 1.4;
    const look = h.clone().addScaledVector(f, 6).addScaledVector(r, 2.05); look.y = boss ? 1.9 : 1.25;
    this.setFov(38); this.roll = 0; this.sway = 1;
    this.setCam(pos, look, { snap, speed });
  }
  // 行動キャラ以外の味方を隠す（肩越し視点で敵が隠れないように）
  focus(e) { for (const x of this.ents.values()) if (x.ally) x.model.group.visible = x === e; }
  unfocus() { for (const x of this.ents.values()) if (x.ally) x.model.group.visible = true; }
  setFov(f) { if (this.camera.fov !== f) { this.camera.fov = f; this.camera.updateProjectionMatrix(); } }
  cut(pos, look, { fov = 38, roll = 0 } = {}) { this.setCam(pos, look, { snap: true }); this.setFov(fov); this.roll = roll; }
  // カメラのレール移動（毎フレーム位置を直接指定）
  rail(dur, p0, p1, l0, l1, { ease = Ease.inOut, fov0 = 38, fov1 = fov0, roll0 = 0, roll1 = roll0 } = {}) {
    const P = V3(), L = V3();
    return GFX.tween(dur, t => {
      this.setCam(P.lerpVectors(p0, p1, t), L.lerpVectors(l0, l1, t), { snap: true });
      this.setFov(lerp(fov0, fov1, t)); this.roll = lerp(roll0, roll1, t);
    }, ease);
  }
  onTurn(u) {
    const e = this.ent(u); if (!e) return;
    if (e.ally) {
      this.focus(e);
      this.face(e, this.enemyCenter());
      this.shoulder(e);
      e.model.flash(e.model.elemCol, 0.5);
    } else {
      this.unfocus(); this.sway = 0.4;
      this.setCam(V3(e.home.x * 0.4 - 1.2, 2.6, 9.8), V3(e.home.x * 0.5, 1.6, e.home.z * 0.5), { speed: 2.5 });
    }
  }
  intro() {
    const hasBoss = this.b.enemies.some(e => e.def.boss);
    this.setCam(V3(-6, 4, hasBoss ? -12 : -9), V3(0, hasBoss ? 3 : 1.4, -3), { snap: true });
    this.setCam(V3(0, hasBoss ? 3.0 : 2.5, hasBoss ? 10.8 : 9.6), V3(0, hasBoss ? 2.4 : 1.5, -2.5), { speed: 1.1 });
  }

  // ---------- 位置ヘルパー ----------
  hitPoint(u) {
    const e = this.ent(u); if (!e) return V3();
    const g = e.model.group.position;
    return V3(g.x, g.y + e.model.height * (e.ally ? 0.62 : 0.55), g.z);
  }
  face(e, p) { const g = e.model.group; g.rotation.y = Math.atan2(p.x - g.position.x, p.z - g.position.z); }
  tweenPose(m, pose, dur) {
    const from = { ...m.pose };
    return GFX.tween(dur, t => { for (const k of POSE_KEYS) m.pose[k] = lerp(from[k], pose[k] || 0, t); });
  }

  // ---------- 味方の攻撃 ----------
  async attack(src, targets, kind, opt = {}) {
    const e = this.ent(src); if (!e || !targets.length) return;
    const m = e.model, col = ELEMENTS[src.elem].color;
    const tEnts = targets.map(t => this.ent(t)).filter(Boolean);
    const main = tEnts[0]; if (!main) return;
    const ult = kind === 'ult';
    this.lastAttack = { src, moved: false };
    if (ult && ULT_CINE[src.key]) return this[ULT_CINE[src.key].strike](e, tEnts);
    this.unfocus(); this.sway = 0;
    if (m.style === 'melee' && !opt.ranged) {
      const multi = tEnts.length > 2;
      const c = this.enemyCenter();
      const dest = multi ? V3(c.x, 0, Math.max(...tEnts.map(t => t.home.z)) + 2.2)
        : main.home.clone().add(V3(0, 0, main.model.radius + 0.95));
      if (multi || main.u.def.boss) dest.z = Math.min(dest.z, 1.0);
      this.setCam(V3(dest.x + 4.2, 1.9, dest.z + 3.4), V3(dest.x - 0.4, 1.2, dest.z - 1.4), { speed: 5 });
      this.face(e, dest);
      const from = e.model.group.position.clone();
      this.tweenPose(m, multi ? POSES.jump : POSES.windup, 0.22);
      await GFX.tween(0.3, t => {
        m.group.position.lerpVectors(from, dest, t);
        m.group.position.y = Math.sin(t * Math.PI) * (multi ? 1.6 : 0.35);
        for (let i = 0; i < 3; i++) this.p.emit(this.hitPoint(src), V3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)), hdr(col, 2.5), { life: 0.4, size: 0.12 });
      }, Ease.inOut);
      this.face(e, main.home);
      this.lastAttack.moved = true;
      await this.tweenPose(m, multi ? POSES.slam : POSES.strike, 0.09);
      if (multi) { this.fx.ring(dest.clone().add(V3(0, 0.05, 0)), col, { r: 6, life: 0.6 }); GFX.shake(0.25); }
      for (const t of tEnts) this.fx.slash(this.hitPoint(t.u), col, { cam: this.camera, size: ult ? 3.6 : 2.4 });
      if (ult) for (const t of tEnts) { this.fx.pillar(t.home, col, { h: 10, r: 1.0 }); this.fx.slash(this.hitPoint(t.u), '#ffffff', { cam: this.camera, size: 3.0, angle: Math.random() * 3 }); }
    } else {
      this.setCam(V3(e.home.x + 1.6, 2.1, e.home.z + 3.4), V3(main.home.x * 0.7, 1.4, main.home.z), { speed: 5 });
      this.face(e, main.home);
      await this.tweenPose(m, tEnts.length > 1 ? POSES.cast2 : POSES.cast, 0.2);
      const tip = m.tipPos();
      this.fx.sprite(tip, col, 0.9, 0.35);
      if (ult) {
        this.setCam(V3(0, 4.5, 8.5), V3(this.enemyCenter().x, 1.2, -3), { speed: 5 });
        this.fx.sprite(this.enemyCenter().add(V3(0, 9, 0)), col, 9, 0.9, { k: 2, grow: 1.3 });
        await GFX.delay(0.25);
        await Promise.all(tEnts.map((t, i) => GFX.delay(i * 0.08).then(() =>
          this.fx.projectile(t.home.clone().add(V3(2.5, 14, 4)), this.hitPoint(t.u), col, { dur: 0.32, size: 2.6, arc: 0 }))));
        for (const t of tEnts) {
          this.fx.pillar(t.home, col, { h: 14, r: 1.4, k: 2 });
          this.fx.ring(t.home.clone().add(V3(0, 0.05, 0)), col, { r: 5, life: 0.8, width: 0.3 });
          this.fx.sprite(this.hitPoint(t.u), col, 6, 0.5, { k: 3 });
          this.fx.shards(this.hitPoint(t.u), col, 10, 7);
        }
        GFX.flash(col, 0.3, 0.3);
      } else {
        await Promise.all(tEnts.map(t => this.fx.projectile(tip, this.hitPoint(t.u), col, { dur: 0.26, size: 0.6 })));
      }
    }
    if (ult) GFX.shake(0.3);
  }
  async quickShot(src, t) {
    const e = this.ent(src), te = this.ent(t); if (!e || !te) return;
    const from = e.model.tipPos();
    await this.fx.projectile(from, this.hitPoint(t), ELEMENTS[src.elem].color, { dur: 0.16, size: 0.5, arc: 0.3 });
  }
  async attackEnd(src) {
    const e = this.ent(src); if (!e) return;
    const m = e.model;
    if (this.ultArmed === e) await this.ultFinish(e);
    if (this.lastAttack && this.lastAttack.src === src && this.lastAttack.moved && src.alive) {
      await GFX.delay(0.12);
      const from = m.group.position.clone();
      this.tweenPose(m, POSES.ready, 0.3);
      await GFX.tween(0.3, t => { m.group.position.lerpVectors(from, e.home, t); m.group.position.y = Math.sin(t * Math.PI) * 0.5; });
    } else if (src.alive) this.tweenPose(m, POSES.ready, 0.3);
    m.group.rotation.y = Math.PI;
    this.lastAttack = null;
    this.wide();
  }

  // 味方対象のスキル（回復・シールド・バフ）
  async support(src, targets) {
    const e = this.ent(src); if (!e) return;
    const col = ELEMENTS[src.elem].color;
    this.unfocus(); this.sway = 0;
    this.setCam(V3(e.home.x + 2.4, 1.75, e.home.z - 1.9), V3(e.home.x - 0.2, 1.25, e.home.z + 0.3), { speed: 4 });
    e.model.group.rotation.y = 0.9;
    await this.tweenPose(e.model, POSES.cast2, 0.22);
    const tip = e.model.tipPos();
    this.fx.sprite(tip, col, 1.2, 0.4);
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), col, { r: 2, life: 0.6 });
    for (const t of targets) {
      const te = this.ent(t); if (!te || t === src) continue;
      const to = this.hitPoint(t);
      for (let i = 0; i < 20; i++) this.p.emit(tip.clone().lerp(to, i / 20), V3(0, 0.5, 0), hdr(col, 2.5), { life: 0.5 + i * 0.02, size: 0.12 });
    }
    await GFX.delay(0.25);
    this.tweenPose(e.model, POSES.ready, 0.3).then(() => { e.model.group.rotation.y = Math.PI; });
  }

  // ---------- 被弾・撃破 ----------
  hit(t, elem, big, crit) {
    const e = this.ent(t); if (!e) return;
    const col = ELEMENTS[elem].color, p = this.hitPoint(t);
    this.fx.sprite(p, col, big ? 2.6 : 1.5, 0.3, { k: 4 });
    this.fx.sprite(p, '#ffffff', big ? 1.2 : 0.7, 0.15, { k: 4 });
    this.fx.ring(p, col, { r: big ? 1.6 : 1.0, life: 0.35, face: this.camera.position, width: 0.1 });
    this.p.burst(p, col, big ? 50 : 24, { speed: big ? 7 : 4.5, life: 0.5, size: 0.09, drag: 4 });
    if (crit) this.p.burst(p, '#ffe066', 30, { speed: 8, life: 0.6, size: 0.07, drag: 4 });
    e.model.flash(e.ally ? '#ff3040' : '#ffffff', e.ally ? 1.2 : 1.6);
    const g = e.model.group, home = e.home.clone();
    const dir = e.ally ? 1 : -1;
    if (!this.lastAttack || this.lastAttack.src !== t) {
      GFX.tween(0.22, k => { g.position.z = home.z + dir * Math.sin(k * Math.PI) * (big ? 0.35 : 0.18); });
    }
    if (e.ally) { const m = e.model; this.tweenPose(m, POSES.hurt, 0.08).then(() => GFX.delay(0.15)).then(() => t.alive && this.tweenPose(m, POSES.ready, 0.3)); }
    GFX.shake(big ? 0.12 : 0.05);
  }
  breakFx(t, elem) {
    const e = this.ent(t); if (!e) return;
    const col = ELEMENTS[elem].color, p = this.hitPoint(t);
    GFX.slowmo(0.25, 0.55);
    GFX.flash('#ffffff', 0.45, 0.35);
    GFX.shake(0.35);
    this.fx.shards(p, col, 22, 6);
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), col, { r: e.model.radius * 4, life: 0.8, width: 0.25 });
    this.fx.ring(p, '#ffffff', { r: 3, life: 0.5, face: this.camera.position, width: 0.05 });
    this.fx.sprite(p, col, 5, 0.6, { k: 3 });
    this.p.burst(p, col, 90, { speed: 10, life: 0.9, size: 0.1, drag: 3 });
  }
  dotFx(t, elem) {
    const e = this.ent(t); if (!e) return;
    const p = this.hitPoint(t);
    this.p.burst(p, ELEMENTS[elem].color, 26, { speed: 2, up: 2, life: 0.8, size: 0.12 });
    e.model.flash(ELEMENTS[elem].color, 0.8);
  }
  healFx(t) {
    const e = this.ent(t); if (!e) return;
    const h = e.model.group.position;
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), '#6dff9e', { r: 1.4, life: 0.8 });
    for (let i = 0; i < 40; i++) this.p.emit(V3(h.x + (Math.random() - 0.5) * 1.1, h.y + Math.random() * 0.4, h.z + (Math.random() - 0.5) * 1.1), V3(0, 1.5 + Math.random() * 1.5, 0), hdr('#6dff9e', 2.5), { life: 1.0, size: 0.1, drag: 1 });
    e.model.flash('#6dff9e', 0.8);
  }
  shieldFx(t) {
    const e = this.ent(t); if (!e) return;
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), '#8fe0ff', { r: 1.6, life: 0.7 });
    this.fx.sprite(this.hitPoint(t), '#8fe0ff', 2.4, 0.5, { k: 1.5 });
  }
  buffFx(t, good = true) {
    const e = this.ent(t); if (!e) return;
    const h = e.model.group.position, col = good ? '#ffd66b' : '#b36bff';
    for (let i = 0; i < 24; i++) this.p.emit(V3(h.x + (Math.random() - 0.5) * 1.2, h.y + (good ? 0.2 : e.model.height), h.z + (Math.random() - 0.5) * 1.2), V3(0, good ? 2 : -1.5, 0), hdr(col, 2.5), { life: 0.8, size: 0.09, drag: 1 });
  }
  deathFx(t) {
    const e = this.ent(t); if (!e) return;
    e.dying = true;
    const g = e.model.group, col = e.model.color;
    g.traverse(o => { if (o.userData.outline) o.visible = false; if (o.material && !o.userData.outline) { o.material = o.material.clone(); o.material.transparent = true; } });
    for (let i = 0; i < 80; i++) {
      const p = V3(g.position.x + (Math.random() - 0.5) * e.model.radius * 2, Math.random() * e.model.height, g.position.z + (Math.random() - 0.5) * e.model.radius);
      this.p.emit(p, V3((Math.random() - 0.5) * 0.5, 1 + Math.random() * 2.5, (Math.random() - 0.5) * 0.5), hdr(col, 3), { life: 1.2, size: 0.1, drag: 0.8 });
    }
    this.fx.ring(e.home.clone().add(V3(0, 0.05, 0)), col, { r: e.model.radius * 2.5, life: 0.6 });
    GFX.tween(0.5, k => {
      g.scale.setScalar((e.model.group.userData.s0 || 1) * (1 - k * 0.3));
      g.position.y = -k * 0.3;
      g.traverse(o => { if (o.material && o.material.transparent !== undefined && !o.userData.outline) o.material.opacity = 1 - k; });
    });
  }
  allyDown(u, instant) {
    const e = this.ent(u); if (!e) return;
    const m = e.model;
    this.tweenPose(m, POSES.down, instant ? 0 : 0.5);
    this.p.burst(this.hitPoint(u), '#ff4d6d', instant ? 0 : 30, { speed: 2, life: 0.8 });
  }
  // 形態変化：番人に寄り、力を吸い込んでから解放する
  async phaseFx(t) {
    const e = this.ent(t); if (!e) return;
    const col = e.model.color, h = e.home, U = GFX.grade.uniforms, core = this.hitPoint(t), S = P2_STYLES[t.key];
    if (!S) {
      GFX.flash(col, 0.6, 0.8); GFX.shake(0.4);
      this.fx.ring(h.clone().add(V3(0, 0.05, 0)), col, { r: 10, life: 1.2, width: 0.4 });
      this.fx.pillar(h, col, { h: 20, r: 2.2, life: 1.2 });
      this.p.burst(core, col, 150, { speed: 12, life: 1.4, size: 0.14 });
      e.model.flash('#ffffff', 2);
      await GFX.delay(0.9); return;
    }
    this.sway = 0;
    for (const x of this.ents.values()) if (x.ally) x.model.group.visible = false;   // 寄りの画面に味方が入らないように
    // ① 画面が沈み、周囲の光が番人の核へ吸い込まれる
    this.cut(V3(h.x + 3.4, 0.8, h.z + 11.5), V3(h.x, core.y + 0.2, h.z), { fov: 34 });
    this.setCam(V3(h.x + 2.4, 1.0, h.z + 9.2), V3(h.x, core.y + 0.4, h.z), { speed: 1.2 });
    GFX.tween(0.35, k => { U.tint.value.setRGB(1 - S.tint[0] * k, 1 - S.tint[1] * k, 1 - S.tint[2] * k); U.desat.value = S.desat * k; }, Ease.out, true);
    Sfx.tone(S.tone[0], 1.2, 'sawtooth', 0.08, 40); Sfx.noise(1.1, 0.1, S.snow ? 1800 : 300);
    let pull = true;
    const suck = () => { if (!pull) return; for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = 4 + Math.random() * 4, p = core.clone().add(V3(Math.cos(a) * r, (Math.random() - 0.3) * 4, Math.sin(a) * r)); this.p.emit(p, core.clone().sub(p).multiplyScalar(2.2), hdr(Math.random() < 0.3 ? '#ffffff' : col, 3), { life: 0.45, size: 0.1, drag: 0 }); } requestAnimationFrame(suck); };
    suck();
    e.model.flash(S.charge, 1.5);
    if (S.bolts) for (let i = 0; i < 4; i++) GFX.delay(0.15 + i * 0.18).then(() => this.fx.bolt(core, core.clone().add(V3((Math.random() - 0.5) * 7, Math.random() * 3 - 2.5, (Math.random() - 0.5) * 5)), col, { life: 0.25, r: 0.03 }));
    if (S.spikes) for (let i = 0; i < 3; i++) GFX.delay(0.2 + i * 0.25).then(() => this.fx.ring(h.clone().add(V3(0, 0.06, 0)), '#ffffff', { r: 3 + i * 1.5, life: 0.5, width: 0.08 }));
    await GFX.delay(1.0);
    pull = false;
    // ② 解放：閃光・幾重もの衝撃波・天を突く光柱・破片・稲妻
    U.tint.value.setRGB(1, 1, 1); U.desat.value = 0;
    this.unfocus();
    GFX.flash('#ffffff', 0.9, 0.5); GFX.flash(col, 0.5, 1.2); GFX.shake(0.8); GFX.slowmo(0.3, 0.9);
    e.p2go = true;
    Sfx.brk(); Sfx.slam(); Sfx.tone(S.tone[1], 1.4, 'sawtooth', 0.12, -30);
    this.cut(V3(h.x - 3.5, 2.2, h.z + 11), V3(h.x, core.y, h.z), { fov: 42, roll: 0.04 });
    this.setCam(V3(h.x - 2.2, 3.2, h.z + 13.5), V3(h.x, core.y + 0.5, h.z), { speed: 0.8 });
    for (let i = 0; i < 3; i++) GFX.delay(i * 0.12).then(() => this.fx.ring(h.clone().add(V3(0, 0.06, 0)), i === 1 ? '#ffffff' : col, { r: 11 + i * 3, life: 1.1, width: 0.5 - i * 0.1 }));
    this.fx.ring(core, col, { r: 6, life: 0.9, width: 0.35, face: this.camera.position });
    this.fx.pillar(h, col, { h: 36, r: 3, life: 1.6, k: 3 });
    this.fx.pillar(h, '#ffffff', { h: 36, r: 1.2, life: 0.9, k: 4 });
    this.fx.sprite(core, col, 14, 0.9, { k: 3, grow: 1.6 });
    this.fx.shards(core, col, 26, 11);
    this.p.burst(core, col, 220, { speed: 14, life: 1.6, size: 0.16 });
    if (S.bolts) for (let i = 0; i < 10; i++) this.fx.bolt(core, h.clone().add(V3((Math.random() - 0.5) * 16, Math.random() * 6, (Math.random() - 0.5) * 10)), i % 3 ? col : '#ffffff', { life: 0.35, r: 0.04 });
    if (S.spikes) for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2, r = 3 + (i % 3) * 2.2; GFX.delay(i * 0.04).then(() => this.iceSpike(V3(h.x + Math.cos(a) * r, 0, h.z + Math.sin(a) * r), 1.4 + Math.random() * 1.6, 1.3)); }
    e.model.flash('#ffffff', 2.4);
    if (this.set && this.set.hooks[S.hook]) this.set.hooks[S.hook]();
    await GFX.delay(1.2);
    this.roll = 0;
    this.wide();
  }
  // 第二形態のあいだ続く威圧感：足もとの魔法陣、赤黒い渦、稲妻、鼓動のような衝撃波、灼けた空気
  updatePhase2(e, dt, t) {
    const u = e.u, m = e.model, col = m.color, S = P2_STYLES[u.key];
    if (!e.p2 && !e.p2go) return;   // 形態変化の演出で「解放」されてから
    if (!e.p2) {
      const root = new THREE.Group(); this.scene.add(root);
      const g = new THREE.Group(); g.position.set(e.home.x, 0, e.home.z); root.add(g);
      const addMat = (c, k, o) => new THREE.MeshBasicMaterial({ color: hdr(c, k), map: runeTex(), transparent: true, opacity: o, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
      const big = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), addMat(col, 1.6, 0.85)); big.rotation.x = -Math.PI / 2; big.position.y = 0.05; g.add(big);
      const small = new THREE.Mesh(new THREE.PlaneGeometry(6.5, 6.5), addMat(S.sub, 1.4, 0.7)); small.rotation.x = -Math.PI / 2; small.position.y = 0.07; g.add(small);
      const halo = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 7.5), addMat(col, 1.2, 0.35)); halo.position.y = m.height * 0.64 + 0.2; halo.position.z = -1.2; g.add(halo);
      const veil = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.6, 16, 32, 1, true), new THREE.MeshBasicMaterial({ color: hdr(col, 0.8), transparent: true, opacity: 0.1, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
      veil.position.y = 8; g.add(veil);
      const dark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(S.dark, 0.7), blending: THREE.AdditiveBlending, depthWrite: false })); dark.scale.setScalar(9); dark.position.y = m.height * 0.64; g.add(dark);
      const crowns = [];
      const cm = new THREE.MeshStandardMaterial({ color: S.crown.color, emissive: S.crown.emissive || col, emissiveIntensity: S.crown.ei, metalness: 0.4, roughness: 0.2, flatShading: true, transparent: !!S.crown.opacity, opacity: S.crown.opacity || 1 });
      for (let i = 0; i < 9; i++) { const c = new THREE.Mesh(new THREE.OctahedronGeometry(0.35, 0), cm); c.scale.y = 2.4; g.add(c); crowns.push({ c, a: i / 9 * Math.PI * 2, y: 1.2 + (i % 3) * 1.6 }); }
      const light = new THREE.PointLight(col, 26, 22, 1.4); light.position.y = m.height * 0.6; g.add(light);
      e.p2 = { g: root, body: g, big, small, halo, veil, dark, crowns, light, beat: 0, bolt: 0, spike: 1, scale0: m.group.scale.x, fog0: this.scene.fog ? this.scene.fog.color.clone() : null, k: 0 };
      if (u.key === 'boss_core' && this.set && this.set.hooks.coreSurge) this.set.hooks.coreSurge();
    }
    const P = e.p2;
    if (!u.alive || e.dying) {
      P.k = Math.max(0, P.k - dt * 1.5);
      if (P.k <= 0) { this.scene.remove(P.g); disposeTree(P.g); if (P.fog0) this.scene.fog.color.copy(P.fog0); e.p2 = { dead: true }; return; }
    } else P.k = Math.min(1, P.k + dt * 1.2);
    const k = P.k, core = V3(e.home.x, m.group.position.y + m.height * 0.64, e.home.z);
    P.body.position.set(m.group.position.x, 0, m.group.position.z);
    P.big.rotation.z = t * 0.25; P.small.rotation.z = -t * 0.6; P.halo.rotation.z = t * 0.4;
    P.big.material.opacity = (0.65 + Math.sin(t * 3) * 0.2) * k; P.small.material.opacity = 0.7 * k; P.halo.material.opacity = (0.22 + Math.sin(t * 2.4) * 0.08) * k;
    P.veil.material.opacity = (0.08 + Math.sin(t * 5) * 0.03) * k; P.veil.rotation.y = t * 0.5;
    P.dark.scale.setScalar((8 + Math.sin(t * 4.8) * 1.4) * k); P.dark.position.y = core.y;
    P.light.intensity = (22 + Math.sin(t * 13) * 5 + (Math.random() < 0.05 ? 20 : 0)) * k;
    P.crowns.forEach((c, i) => { const a = c.a + t * 0.9; c.c.position.set(Math.cos(a) * 4.2, c.y + Math.sin(t * 2 + i) * 0.4, Math.sin(a) * 4.2); c.c.rotation.y = -a; c.c.scale.setScalar(k); c.c.scale.y = 2.4 * k; });
    m.group.scale.setScalar(P.scale0 * (1 + 0.12 * k));
    // 装甲の継ぎ目が赤黒く脈打つ
    if (u.alive && !u.charging) m.flash(S.pulse, 0.08 + Math.max(0, Math.sin(t * 4.8)) * 0.22);
    if (this.scene.fog && P.fog0) this.scene.fog.color.lerpColors(P.fog0, new THREE.Color(S.fog), 0.7 * k);
    if (!u.alive) return;
    // 赤黒い渦（らせんに昇る）
    for (let i = 0; i < 6; i++) {
      const a = Math.random() * Math.PI * 2, r = 2.6 + Math.random() * 1.4, y = Math.random() * 1.2;
      const sc = S.swirl, pc = Math.random() < 0.25 ? sc[0] : Math.random() < 0.5 ? (sc[1] || col) : sc[2];
      this.p.emit(V3(core.x + Math.cos(a) * r, y, core.z + Math.sin(a) * r), V3(-Math.sin(a) * (S.snow ? 6 : 3), 2.5 + Math.random() * 2.5, Math.cos(a) * (S.snow ? 6 : 3)), hdr(pc, 2.4), { life: 1.1, size: S.snow ? 0.13 : 0.09, drag: 0.6 });
    }
    if (S.snow) {
      // 吹雪：戦場全体を横なぐりの雪が吹き抜ける
      for (let i = 0; i < dt * 160; i++) this.p.emit(V3(-12 + Math.random() * 4, 0.3 + Math.random() * 6, (Math.random() - 0.5) * 16 - 1), V3(9 + Math.random() * 5, -1 - Math.random(), (Math.random() - 0.5) * 2), hdr(Math.random() < 0.5 ? '#ffffff' : '#bfeaff', 1.8), { life: 2.2, size: 0.1, drag: 0 });
    } else if (Math.random() < dt * 40) {
      // 灼けた空気：戦場全体に舞う火の粉
      this.p.emit(V3((Math.random() - 0.5) * 16, 0.1, (Math.random() - 0.5) * 12 - 1), V3((Math.random() - 0.5) * 0.4, 0.8 + Math.random(), 0), hdr(col, 1.8), { life: 2.6, size: 0.06, drag: 0 });
    }
    // 氷の棘：味方の足もとから突き出し、砕け散る
    if (S.spikes && (P.spike -= dt) <= 0) {
      P.spike = 0.9 + Math.random() * 0.9;
      const c = V3((Math.random() - 0.5) * 10, 0, 1 + Math.random() * 4);
      for (let i = 0; i < 4; i++) this.iceSpike(c.clone().add(V3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 1.5)), 0.8 + Math.random() * 1.2, 0.9);
      this.fx.ring(c.clone().add(V3(0, 0.05, 0)), '#bfeaff', { r: 2.2, life: 0.6, width: 0.1 });
    }
    // 稲妻
    if (S.bolts && (P.bolt -= dt) <= 0) {
      P.bolt = 0.12 + Math.random() * 0.3;
      const to = Math.random() < 0.6 ? V3(core.x + (Math.random() - 0.5) * 9, 0.05, core.z + (Math.random() - 0.5) * 6) : core.clone().add(V3((Math.random() - 0.5) * 6, 2 + Math.random() * 3, (Math.random() - 0.5) * 4));
      this.fx.bolt(core, to, Math.random() < 0.3 ? '#ffffff' : col, { life: 0.18, r: 0.025 });
    }
    // 鼓動：一定の間隔で床を走る衝撃波
    if ((P.beat -= dt) <= 0) {
      P.beat = 2.4;
      this.fx.ring(V3(core.x, 0.06, core.z), col, { r: 13, life: 1.3, width: 0.22 });
      GFX.delay(0.22).then(() => this.fx.ring(V3(core.x, 0.06, core.z), S.sub, { r: 9, life: 1.0, width: 0.12 }));
      GFX.shake(0.07);
      Sfx.tone(S.tone[2], 0.4, 'sine', 0.14, -12); Sfx.tone(S.tone[2] - 4, 0.35, 'sine', 0.1, -10, 0.22);
    }
  }
  // 床から突き出す氷の棘（伸びて、少し留まり、砕けて消える）
  iceSpike(p, h, hold = 1) {
    const mat = this.iceMat || (this.iceMat = new THREE.MeshStandardMaterial({ color: '#cfefff', emissive: '#3aa0e0', emissiveIntensity: 0.6, metalness: 0.2, roughness: 0.1, transparent: true, opacity: 0.9, flatShading: true }));
    const m = new THREE.Mesh(new THREE.ConeGeometry(0.28 + Math.random() * 0.15, 1, 5), mat);
    m.position.copy(p); m.rotation.set((Math.random() - 0.5) * 0.5, Math.random() * 3, (Math.random() - 0.5) * 0.5); m.scale.set(1, 0.01, 1);
    this.scene.add(m);
    Sfx.tone(900 + Math.random() * 400, 0.08, 'triangle', 0.03, -300);
    GFX.tween(0.14, k => { m.scale.y = h * k; m.position.y = p.y + h * k / 2; }, Ease.out, true)
      .then(() => GFX.delay(hold))
      .then(() => { this.p.burst(m.position.clone(), '#dff4ff', 14, { speed: 3, life: 0.6, size: 0.08 }); this.scene.remove(m); m.geometry.dispose(); });
  }
  chargeFx(t) {
    const e = this.ent(t); if (!e) return;
    this.fx.ring(this.hitPoint(t), '#ff3040', { r: 3, life: 0.8, face: this.camera.position });
    e.model.flash('#ff3040', 1.5);
  }

  // ---------- 必殺技の導入 ----------
  async ultIntro(u) {
    const e = this.ent(u); if (!e) return;
    const m = e.model, col = ELEMENTS[u.elem].color, h = e.home;
    GFX.grade.uniforms.desat.value = 0.3;
    m.group.rotation.y = 0;
    // 他の味方は一時的に隠す（カメラの邪魔になるため）
    const others = [...this.ents.values()].filter(x => x.ally && x !== e);
    others.forEach(x => { x.model.group.visible = false; });
    this.setCam(V3(h.x + 0.3, 1.7, h.z + 1.05), V3(h.x, 1.66, h.z), { snap: true });
    this.setCam(V3(h.x + 1.1, 1.15, h.z + 3.0), V3(h.x, 1.3, h.z), { speed: 1.8 });
    this.tweenPose(m, POSES.ult, 0.45);
    this.fx.pillar(h.clone().add(V3(0, 0, -1.2)), col, { h: 14, r: 0.7, life: 1.3, k: 1.2 });
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), col, { r: 3, life: 1.0 });
    m.flash(col, 0.45);
    await GFX.tween(1.15, t => {
      for (let i = 0; i < 4; i++) {
        const a = t * 20 + i * Math.PI / 2, r = 0.75 - t * 0.3;
        this.p.emit(V3(h.x + Math.cos(a) * r, 0.2 + t * 2.0, h.z - 0.2 + Math.sin(a) * r * 0.6), V3(0, 1.2, 0), hdr(col, 2), { life: 0.45, size: 0.045 });
      }
    }, Ease.linear);
    GFX.grade.uniforms.desat.value = 0;
    GFX.flash(col, 0.4, 0.3);
    others.forEach(x => { x.model.group.visible = true; });
    m.group.rotation.y = Math.PI;
    this.tweenPose(m, POSES.ready, 0.2);
    this.wide();
  }

  // ============================================================
  //  専用の必殺技演出（発動 → スプラッシュ → クローズアップ → 肩越しで対象選択 → 叩きつけ）
  // ============================================================
  // dur 秒のあいだに n 回、等間隔で fn を呼ぶ（フレームレートに依存しない）
  every(dur, n, fn) {
    let i = 0;
    return GFX.tween(dur, (_, p) => { const k = Math.floor(p * n); while (i < k) fn(i++); }, Ease.linear);
  }
  hasUltCine(u) { return !!ULT_CINE[u.key] && !!this.ent(u); }
  ui(kind, u) { if (this.b.ultUi) this.b.ultUi(kind, u); }
  // キャラの向きを基準にした座標（+Z が正面、+X がキャラの左手側）
  loc(e, x, y, z) {
    const g = e.model.group, a = g.rotation.y, c = Math.cos(a), s = Math.sin(a);
    return V3(g.position.x + x * c + z * s, g.position.y + y, g.position.z - x * s + z * c);
  }
  headPos(e) { e.model.group.updateMatrixWorld(true); return e.model.headPivot.getWorldPosition(V3()); }
  gripPos(e) { return e.model.armR.grip.getWorldPosition(V3()); }

  // 指定した物以外（環境・敵・他の味方）を一時的に非表示にする
  isolate(keep) {
    const hidden = [], keepSet = new Set([...keep, this.camera, this.p.points]);
    for (const root of this.scene.children) {
      if (keepSet.has(root) || root.isLight) continue;
      root.traverse(o => { if ((o.isMesh || o.isPoints || o.isSprite || o.isLine) && o.visible) { o.visible = false; hidden.push(o); } });
    }
    return hidden;
  }
  unisolate(hidden) { hidden.forEach(o => { o.visible = true; }); }

  // スプラッシュの背景：星海を閉じ込めた円盤と光条（カメラに固定）
  splashBackdrop(col) {
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, amt: { value: 0 }, c: { value: hdr(col, 1) } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float time, amt; uniform vec3 c; varying vec2 vUv;
        float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float noise(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
          return mix(mix(hash(i), hash(i+vec2(1,0)), f.x), mix(hash(i+vec2(0,1)), hash(i+vec2(1,1)), f.x), f.y); }
        float fbm(vec2 p){ float v = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ v += a * noise(p); p *= 2.03; a *= 0.5; } return v; }
        float stars(vec2 p, float d){ vec2 id = floor(p), f = fract(p) - 0.5; float h = hash(id);
          return step(d, h) * smoothstep(0.16, 0.0, length(f + (vec2(hash(id+3.1), hash(id+7.7)) - 0.5) * 0.6)) * (0.5 + 0.5 * sin(time * 3.0 + h * 40.0)); }
        void main(){
          vec2 p = (vUv - 0.5) * vec2(1.7778, 1.0);
          vec3 col = mix(vec3(0.004, 0.006, 0.02), vec3(0.02, 0.03, 0.09), vUv.y);
          vec2 cc = p - vec2(-0.26, 0.0); float d = length(cc), R = 0.42;
          float inside = smoothstep(R, R - 0.006, d);
          float n = fbm(cc * 3.2 + vec2(time * 0.06, -time * 0.03));
          float ra = d * 7.0 - time * 0.35; vec2 q = mat2(cos(ra), -sin(ra), sin(ra), cos(ra)) * cc;
          float sw = fbm(q * vec2(9.0, 2.5) + 3.0);
          vec3 neb = mix(vec3(0.01, 0.03, 0.16), c * 0.45, n * n * 1.2) + vec3(0.15, 0.3, 0.8) * pow(sw, 4.0) * 1.2;
          neb += vec3(0.4, 0.6, 1.2) * pow(1.0 - d / R, 4.0) * 0.35;
          col = mix(col, neb, inside);
          col += vec3(0.5, 0.7, 1.4) * exp(-abs(d - R) * 120.0) * 0.9;
          col += vec3(0.3, 0.45, 1.0) * exp(-abs(d - R * 1.12) * 260.0) * 0.5;
          col += vec3(1.0) * stars(p * 70.0, 0.93) * (inside * 1.6 + 0.5);
          col += vec3(0.8, 0.9, 1.0) * stars(p * 28.0 + 5.0, 0.975) * inside * 2.2;
          float beam = pow(max(0.0, 1.0 - abs(p.y - p.x * 0.42 - 0.05) * 7.0), 10.0) * (1.0 - inside * 0.7);
          col += vec3(0.3, 0.5, 1.1) * beam * 0.45;
          gl_FragColor = vec4(col * amt, 1.0);
        }`,
      depthWrite: false, fog: false,
    });
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    const d = 7, hgt = 2 * d * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)) * 1.08;
    m.scale.set(hgt * 1.7778, hgt, 1); m.position.set(0, 0, -d); m.renderOrder = -5;
    this.camera.add(m);
    return m;
  }

  // 武器・盾に纏う光（level 0〜1）
  chargeWeapon(e, col, level, dur = 0.25) {
    if (!e.aura) e.aura = (ULT_CINE[e.u.key] || {}).aura === 'shield' ? this.shieldAura(e, col) : this.weaponAura(e, col);
    const a = e.aura; if (!a) return;
    const from = a.level;
    return GFX.tween(dur, t => { a.level = lerp(from, level, t); });
  }
  // 武器（バット）：縞の流れる光の筒と先端の光、稲妻
  weaponAura(e, col) {
    const tip = e.model.extras && e.model.extras.tip; if (!tip || !tip.parent) return null;
    const len = tip.position.y || 0.75;
    const mat = new THREE.ShaderMaterial({
      uniforms: { c: { value: hdr(col, 1) }, time: { value: 0 }, amt: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec2 vUv; void main(){ vUv = uv; vN = normalize(normalMatrix * normal); vec4 mv = modelViewMatrix * vec4(position, 1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix * mv; }',
      fragmentShader: `uniform vec3 c; uniform float time, amt; varying vec3 vN; varying vec3 vV; varying vec2 vUv;
        void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 1.5);
          float band = 0.6 + 0.4 * sin(vUv.y * 34.0 - time * 16.0 + vUv.x * 18.85);
          float ends = smoothstep(0.0, 0.18, vUv.y) * smoothstep(1.0, 0.85, vUv.y);
          gl_FragColor = vec4((c * (f * 2.4 + 0.3) * band + vec3(0.6, 0.8, 1.0) * pow(f, 4.0)) * ends * amt, 1.0); }`,
      blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, fog: false, side: THREE.DoubleSide,
    });
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.07, len * 1.25, 20, 1, true), mat);
    shell.position.y = len * 0.55; shell.renderOrder = 12;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 1.4), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    halo.position.y = len; halo.renderOrder = 12;
    tip.parent.add(shell); tip.parent.add(halo);
    return {
      level: 0, col,
      update: (L, dt, t) => {
        mat.uniforms.time.value = t; mat.uniforms.amt.value = L * 0.75;
        shell.scale.set(0.6 + L * 1.4, 1, 0.6 + L * 1.4);
        halo.material.opacity = Math.min(0.8, L); halo.scale.setScalar(0.15 + L * 0.4 + Math.sin(t * 20) * 0.03 * L);
        if (L < 0.05) return;
        // 武器から青い光の粒と火花がこぼれる
        const g = this.gripPos(e), tp = e.model.tipPos();
        const n = Math.random() < dt * 60 * L ? 2 : 0;
        for (let i = 0; i < n; i++) {
          const p = g.clone().lerp(tp, 0.2 + Math.random() * 0.85);
          this.p.emit(p, V3((Math.random() - 0.5) * 0.6, 0.3 + Math.random() * 0.8, (Math.random() - 0.5) * 0.6), hdr(Math.random() < 0.2 ? '#ffb45a' : col, 3), { life: 0.35 + Math.random() * 0.3, size: 0.03 + Math.random() * 0.04, drag: 2 });
        }
        if (L > 0.6 && Math.random() < dt * 5 * L) this.fx.bolt(() => this.gripPos(e), () => e.model.tipPos(), '#cfe6ff', { life: 0.12, jag: 0.06, r: 0.008 });
      },
    };
  }
  // 盾：表面に雪の結晶の紋が灯り、縁が光り、細かな氷の粒が舞う
  shieldAura(e, col) {
    const hold = e.model.extras && e.model.extras.shield; if (!hold) return null;
    const g = new THREE.Group(); g.position.z = 0.06; hold.add(g);
    const add = (geo, map, k) => {
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map, color: hdr(col, k), blending: THREE.AdditiveBlending, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide, fog: false }));
      m.renderOrder = 12; g.add(m); return m;
    };
    const face = add(new THREE.PlaneGeometry(0.62, 0.62), snowTex(), 1.2);
    const rim = add(new THREE.RingGeometry(0.3, 0.325, 6), null, 1.8); rim.rotation.z = Math.PI / 2;
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 1.2), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0 }));
    halo.renderOrder = 12; g.add(halo);
    return {
      level: 0, col,
      update: (L, dt, t) => {
        face.material.opacity = Math.min(0.85, L); face.rotation.z = t * 0.7;
        rim.material.opacity = Math.min(1, L * 1.5);
        g.scale.setScalar(1 + L * 0.15 + Math.sin(t * 6) * 0.02 * L);
        halo.material.opacity = Math.min(0.45, L * 0.5); halo.scale.setScalar(0.3 + L * 0.5);
        if (L < 0.05) return;
        const c = g.getWorldPosition(V3());
        if (Math.random() < dt * 50 * L) {
          const a = Math.random() * Math.PI * 2, r = 0.2 + Math.random() * 0.4;
          this.p.emit(c.clone().add(V3(Math.cos(a) * r, Math.sin(a) * r, (Math.random() - 0.5) * 0.3)), V3((Math.random() - 0.5) * 0.3, 0.2 + Math.random() * 0.4, (Math.random() - 0.5) * 0.3), hdr(Math.random() < 0.5 ? '#ffffff' : col, 2.5), { life: 0.6 + Math.random() * 0.5, size: 0.025 + Math.random() * 0.03, drag: 1 });
        }
      },
    };
  }
  updateAuras(dt, t) {
    for (const e of this.ents.values()) if (e.aura) e.aura.update(e.aura.level, dt, t);
  }

  // 発動演出。共通の「発動 → スプラッシュ」のあとにキャラごとのクローズアップ（C.ready）を流し、
  // 最後は肩越し視点・武器が光った状態で対象選択に入る
  async ultReady(u) {
    const e = this.ent(u); if (!e) return;
    const C = ULT_CINE[u.key], m = e.model, g = m.group, h = e.home, col = C.col, U = GFX.grade.uniforms;
    this.ultArmed = e;
    this.focus(e); this.sway = 0;

    // ① 発動：肩越しのまま画面が沈む
    this.face(e, this.enemyCenter()); this.shoulder(e, { snap: true }); this.sway = 0;
    this.ui('cine', u);
    m.flash(col, 0.9);
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), col, { r: 2.6, life: 0.5 });
    this.p.burst(this.hitPoint(u), col, 40, { speed: 3, life: 0.6, size: 0.06 });
    GFX.tween(0.3, t => { U.tint.value.setScalar(1 - 0.65 * t); U.desat.value = 0.5 * t; }, Ease.out);
    await GFX.delay(0.42);

    // ② スプラッシュ：星海の円盤を背に決めポーズ、右に技名
    const hidden = this.isolate([g]);
    U.tint.value.setScalar(1); U.desat.value = 0;
    g.rotation.y = C.splashRot ?? 0.4; g.position.y = 0.1;
    m.setPose(POSES[C.splash]); m.idleAmp = 0.4;
    this.chargeWeapon(e, col, 0.3, 0.01);
    const bd = this.splashBackdrop(col);
    this.fx.add(new THREE.Object3D(), 1.25, t => { bd.material.uniforms.time.value = t * 3; bd.material.uniforms.amt.value = Math.min(1, t * 8); });
    this.ui('splash', u);
    GFX.flash('#ffffff', 0.6, 0.25);
    for (let i = 0; i < 26; i++) this.p.emit(V3(h.x + (Math.random() - 0.5) * 2.4, 0.2 + Math.random() * 2.2, h.z + (Math.random() - 0.5) * 1.2), V3(0, C.snow ? -0.25 : 0.15, 0), hdr(Math.random() < 0.5 ? '#ffffff' : col, 3), { life: 1.2, size: 0.03 + Math.random() * 0.05, drag: 0 });
    await this.rail(1.25, V3(h.x + 0.55, 0.85, h.z + 3.9), V3(h.x + 0.5, 0.95, h.z + 3.4), V3(h.x + 0.65, 1.0, h.z), V3(h.x + 0.6, 1.05, h.z), { ease: Ease.out, fov0: 36, fov1: 34 });
    this.ui('splash-off', u);
    this.camera.remove(bd); disposeTree(bd);
    this.unisolate(hidden);
    g.position.y = 0; m.idleAmp = 1;

    // ③〜⑤ キャラ固有のクローズアップ
    await this[C.ready](e, col);
    GFX.flash('#ffffff', 0.7, 0.3);

    // ⑥ 肩越しに戻して対象選択へ（武器は光ったまま）
    this.ui('cine-off', u);
    this.face(e, this.enemyCenter()); m.setPose(POSES[C.aim]);
    this.shoulder(e, { snap: true });
  }

  // アステル：顔のアップ → バットを水平に構えて帯電 → あおりで光のバットを構える
  async asterReady(e, col) {
    const m = e.model, g = m.group, h = e.home, u = e.u;
    // ③ 顔のアップ：振り抜いたバットと青い光の帯が渦巻く
    g.rotation.y = 0.15;
    m.setPose(POSES.windup); this.tweenPose(m, POSES.ultSwing, 0.3); Sfx.swing();
    this.chargeWeapon(e, col, 0.55, 0.3);
    for (let i = 0; i < 5; i++) GFX.delay(i * 0.1).then(() => this.fx.swirl(V3(h.x, 1.0 + i * 0.12, h.z), i % 2 ? '#8fc8ff' : col, { r: 0.5 + i * 0.07, life: 0.6, tilt: (Math.random() - 0.5) * 0.9, speed: 10 + i * 2, y0: -0.3, y1: 0.4, width: 0.012 + Math.random() * 0.012, k: 2.2 }));
    this.every(0.8, 30, () => this.p.emit(this.gripPos(e), V3((Math.random() - 0.5) * 3, Math.random() * 2, (Math.random() - 0.5) * 3), hdr('#ffa040', 3), { life: 0.5, size: 0.03, drag: 1.5 }));
    await this.rail(0.8, this.loc(e, 0.45, 1.45, 1.25), this.loc(e, -0.35, 1.48, 1.15), this.loc(e, 0.05, 1.36, 0), this.loc(e, 0.0, 1.38, 0), { ease: Ease.inOut, fov0: 36, fov1: 33, roll0: 0.14, roll1: -0.08 });
    // 青い光条で画面を払う
    this.ui('wipe', u); GFX.flash('#9fd0ff', 0.55, 0.25);

    // ④ 横顔：バットを水平に構え、稲妻が這う
    g.rotation.y = 0;
    m.setPose(POSES.ultCharge);
    this.chargeWeapon(e, col, 0.7, 0.6);
    const zap = this.every(0.95, 16, i => {
      if (i % 4 === 0) Sfx.zap();
      this.fx.bolt(() => this.gripPos(e), () => m.tipPos(), i % 3 ? '#d8ecff' : col, { life: 0.1 + Math.random() * 0.1, jag: 0.05, r: 0.006 + Math.random() * 0.006 });
      for (let k = 0; k < 2; k++) this.p.emit(m.tipPos(), V3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2), hdr('#ffb45a', 3), { life: 0.4, size: 0.025 });
    });
    await this.rail(0.95, this.loc(e, 0.5, 1.45, 1.3), this.loc(e, 0.4, 1.43, 1.05), this.loc(e, -0.3, 1.35, 0), this.loc(e, -0.25, 1.34, 0), { ease: Ease.out, fov0: 38, fov1: 35, roll0: -0.05, roll1: 0.03 });
    await zap;

    // ⑤ あおり：バットを掲げると光が膨れ上がり、振り下ろして構える
    g.rotation.y = 0;
    m.setPose(POSES.ultRaise);
    this.chargeWeapon(e, col, 1, 0.5);
    this.fx.pillar(h.clone().add(V3(0, 0, -0.4)), col, { h: 12, r: 0.5, life: 1.0, k: 2 });
    GFX.delay(0.22).then(() => {
      this.tweenPose(m, POSES.ultAim, 0.16); Sfx.swing();
      for (let i = 0; i < 3; i++) this.fx.swirl(V3(h.x, 0.7 + i * 0.25, h.z), i % 2 ? '#8fc8ff' : col, { r: 0.7, life: 0.45, tilt: 0.5 - i * 0.3, speed: 16, width: 0.015, k: 2.5 });
    });
    for (let i = 0; i < 6; i++) GFX.delay(0.15 + i * 0.1).then(() => {
      const tp = m.tipPos(); if (i % 2) Sfx.zap();
      this.fx.bolt(tp, tp.clone().add(V3((Math.random() - 0.5) * 2.4, Math.random() * 1.6, (Math.random() - 0.5) * 2.4)), '#cfe6ff', { life: 0.14, jag: 0.14, r: 0.01 });
    });
    await this.rail(1.0, this.loc(e, -0.9, 0.4, 1.7), this.loc(e, -1.15, 0.5, 2.05), this.loc(e, -0.3, 1.35, 0), this.loc(e, -0.28, 1.22, 0), { ease: Ease.out, fov0: 46, fov1: 42, roll0: 0.1, roll1: 0.04 });
  }

  // 雪が舞う（カメラまわりに降らせる）
  snowfall(center, n, spread = 1.6) {
    for (let i = 0; i < n; i++) this.p.emit(center.clone().add(V3((Math.random() - 0.5) * spread * 2, Math.random() * spread, (Math.random() - 0.5) * spread * 2)),
      V3((Math.random() - 0.5) * 0.3, -0.3 - Math.random() * 0.4, (Math.random() - 0.5) * 0.3), hdr(Math.random() < 0.6 ? '#ffffff' : '#9fe6ff', 2.2), { life: 1.2 + Math.random() * 0.8, size: 0.02 + Math.random() * 0.035, drag: 0 });
  }
  // ミゾレ：雪の舞う顔のアップ → 盾を突き出し結晶の紋が咲く → あおりで氷柱が足元から噴き出す
  async mizoreReady(e, col) {
    const m = e.model, g = m.group, h = e.home, u = e.u;
    // ③ 顔のアップ：盾を胸に構え、背後に雪の結晶の紋、冷気の帯が渦巻く
    g.rotation.y = 0.15;
    m.setPose(POSES.idle); this.tweenPose(m, POSES.mzGuard, 0.3);
    this.chargeWeapon(e, col, 0.5, 0.4);
    const cam0 = this.loc(e, 0.45, 1.42, 1.25);
    this.fx.sigil(this.loc(e, 0, 1.4, -0.45), col, { r: 0.9, life: 0.9, face: cam0, spin: 0.8, k: 1.8 });
    for (let i = 0; i < 4; i++) GFX.delay(i * 0.12).then(() => this.fx.swirl(V3(h.x, 0.9 + i * 0.15, h.z), i % 2 ? '#ffffff' : col, { r: 0.55 + i * 0.06, life: 0.65, tilt: (Math.random() - 0.5) * 0.8, speed: 7 + i, y0: -0.2, y1: 0.35, width: 0.01 + Math.random() * 0.01, k: 1.8 }));
    this.every(0.8, 8, () => this.snowfall(this.loc(e, 0, 1.2, 0.5), 5, 0.9));
    await this.rail(0.8, cam0, this.loc(e, -0.35, 1.46, 1.15), this.loc(e, 0.05, 1.34, 0), this.loc(e, 0.0, 1.36, 0), { ease: Ease.inOut, fov0: 36, fov1: 33, roll0: -0.12, roll1: 0.08 });
    this.ui('wipe', u); GFX.flash('#dff6ff', 0.55, 0.25);

    // ④ 盾の寄り：突き出した盾に結晶の紋が咲き、氷の粒が吸い寄せられる
    g.rotation.y = 0;
    m.setPose(POSES.mzThrust);
    this.chargeWeapon(e, col, 0.8, 0.6);
    m.update(0, 0); g.updateMatrixWorld(true);
    const sc = e.model.extras.shield.getWorldPosition(V3());
    const camA = this.loc(e, -0.75, 1.4, 1.25), camB = this.loc(e, -0.6, 1.38, 1.0);
    this.fx.sigil(sc.clone().add(this.loc(e, 0, 0, 0.3).sub(g.position)), col, { r: 0.7, life: 1.0, face: camA, spin: -1.2, k: 1.6 });
    const draw = this.every(0.95, 24, i => {
      const a = Math.random() * Math.PI * 2, r = 0.9 + Math.random() * 0.6, p = sc.clone().add(V3(Math.cos(a) * r, Math.sin(a) * r, 0.3 + Math.random() * 0.4));
      for (let k = 0; k < 2; k++) this.p.emit(p, sc.clone().sub(p).multiplyScalar(1.6), hdr(k ? '#ffffff' : col, 3), { life: 0.55, size: 0.03, drag: 0 });
      if (i % 6 === 0) Sfx.zap();
    });
    await this.rail(0.95, camA, camB, this.loc(e, 0.2, 1.3, 0.2), this.loc(e, 0.2, 1.3, 0.25), { ease: Ease.out, fov0: 38, fov1: 34, roll0: 0.04, roll1: -0.02 });
    await draw;

    // ⑤ あおり：右手を掲げると足元に紋が広がり、氷柱が輪になって噴き出す
    g.rotation.y = 0;
    this.tweenPose(m, POSES.mzCast, 0.2);
    this.chargeWeapon(e, col, 1, 0.5);
    this.fx.sigil(h.clone().add(V3(0, 0.04, 0)), col, { r: 2.6, life: 1.1, spin: 0.6 });
    this.fx.pillar(h.clone().add(V3(0, 0, -0.3)), col, { h: 12, r: 0.5, life: 1.0, k: 1.8 });
    GFX.delay(0.25).then(() => {
      Sfx.slam(); GFX.shake(0.15);
      for (let i = 0; i < 9; i++) {
        const a = i / 9 * Math.PI * 2 + 0.3;
        this.fx.iceSpike(h.clone().add(V3(Math.cos(a) * 1.3, 0, Math.sin(a) * 1.3)), { h: 0.7 + Math.random() * 0.8, r: 0.12 + Math.random() * 0.08, tilt: 0.35, dir: a + Math.PI / 2, life: 0.9, color: col });
      }
      this.p.burst(h.clone().add(V3(0, 0.3, 0)), '#ffffff', 60, { speed: 4, up: 2, life: 1.0, size: 0.05, drag: 1.5 });
    });
    this.every(1.0, 10, () => this.snowfall(h.clone().add(V3(0, 1.4, 0)), 4, 1.4));
    await this.rail(1.0, this.loc(e, -0.9, 0.4, 1.9), this.loc(e, -1.15, 0.5, 2.25), this.loc(e, -0.2, 1.4, 0), this.loc(e, -0.2, 1.25, 0), { ease: Ease.out, fov0: 46, fov1: 42, roll0: 0.1, roll1: 0.04 });
    this.tweenPose(m, POSES.mzAim, 0.15);
  }

  // 専用演出のないキャラ：対象選択は肩越し視点で
  ultAim(u) {
    const e = this.ent(u); if (!e) return;
    this.focus(e); this.face(e, this.enemyCenter()); this.shoulder(e);
    e.model.flash(e.model.elemCol, 0.6);
  }
  // 対象選択でキャンセルされた
  ultCancel(u) {
    const e = this.ent(u); if (!e) return;
    if (this.ultArmed === e) {
      this.chargeWeapon(e, e.aura ? e.aura.col : '#ffffff', 0, 0.3);
      this.tweenPose(e.model, POSES.ready, 0.3);
      this.ultArmed = null;
    }
    e.model.group.rotation.y = Math.PI;
    this.wide();
  }
  async ultFinish(e) {
    await GFX.delay(0.5);
    this.ui('lines-off', e.u);
    this.chargeWeapon(e, e.aura ? e.aura.col : '#ffffff', 0, 0.4);
    GFX.grade.uniforms.aberr.value = 0;
    this.ultArmed = null;
  }

  // アステル「星屑の終曲」：踏み込み → 跳躍 → 光のバットを叩きつける
  async asterStrike(e, tEnts) {
    const m = e.model, g = m.group, main = tEnts[0], col = ULT_CINE[e.u.key].col, U = GFX.grade.uniforms;
    this.ultArmed = e; this.focus(e); this.sway = 0;
    if (!e.aura || e.aura.level < 0.9) this.chargeWeapon(e, col, 1, 0.2);
    const from = g.position.clone();
    const dest = main.home.clone().add(V3(0, 0, main.model.radius + 1.0));
    if (main.u.def.boss) dest.z = Math.min(dest.z, 1.0);
    const tc = main.home;

    // S1 踏み込み：横から追うカメラ、集中線
    this.ui('lines-on', e.u);
    this.face(e, dest); this.tweenPose(m, POSES.dash, 0.1);
    Sfx.swing();
    // 走る向きの右側から並走するカメラ
    const dir = V3(dest.x - from.x, 0, dest.z - from.z).normalize(), side = V3(-dir.z, 0, dir.x);
    this.setFov(46); this.roll = -0.04;
    await GFX.tween(0.34, t => {
      g.position.lerpVectors(from, dest, t); g.position.y = Math.sin(t * Math.PI) * 0.15;
      const c = g.position;
      this.setCam(c.clone().addScaledVector(side, 2.5).addScaledVector(dir, 0.9 - t * 0.6).add(V3(0, 1.15, 0)), c.clone().addScaledVector(dir, 1.2).add(V3(0, 1.0, 0)), { snap: true });
      for (let i = 0; i < 3; i++) this.p.emit(this.hitPoint(e.u).add(V3((Math.random() - 0.5) * 0.4, (Math.random() - 0.5) * 0.8, 0)), V3(0, 0.2, 0), hdr(col, 2.5), { life: 0.35, size: 0.08, drag: 3 });
    }, Ease.in);

    // S2 跳躍：下からあおって光のバットを振りかぶる
    this.face(e, tc); this.tweenPose(m, POSES.windup, 0.16);
    const apex = dest.clone().add(V3(0, 1.8, 0.35));
    GFX.slowmo(0.4, 0.45);
    this.rail(0.42, apex.clone().add(V3(2.6, -1.5, -1.4)), apex.clone().add(V3(2.2, -1.4, -1.1)), apex.clone().add(V3(0, 0.3, 0)), apex.clone().add(V3(0, 0.1, 0)), { ease: Ease.out, fov0: 50, fov1: 46, roll0: -0.14, roll1: -0.08 });
    this.every(0.42, 7, () => this.fx.bolt(m.tipPos(), m.tipPos().add(V3((Math.random() - 0.5) * 1.6, Math.random() * 1.2, (Math.random() - 0.5) * 1.6)), '#cfe6ff', { life: 0.1, jag: 0.12, r: 0.009 }));
    await GFX.tween(0.42, t => g.position.lerpVectors(dest, apex, Ease.out(t)), Ease.linear);

    // S3 叩きつけ
    this.tweenPose(m, POSES.slam, 0.08);
    await GFX.tween(0.1, t => g.position.lerpVectors(apex, dest, t), Ease.in);
    this.lastAttack.moved = true;
    const ip = this.hitPoint(main.u);
    Sfx.slam && Sfx.slam();
    this.cut(tc.clone().add(V3(-3.6, 1.5, main.model.radius + 4.2)), tc.clone().add(V3(0.2, 1.1, 0)), { fov: 48, roll: 0.06 });
    this.rail(0.9, tc.clone().add(V3(-3.6, 1.5, main.model.radius + 4.2)), tc.clone().add(V3(-3.0, 1.4, main.model.radius + 3.6)), tc.clone().add(V3(0.2, 1.1, 0)), tc.clone().add(V3(0.1, 1.2, 0)), { ease: Ease.out, fov0: 48, fov1: 44, roll0: 0.06, roll1: 0.02 });
    GFX.slowmo(0.12, 0.3);
    GFX.flash('#ffffff', 0.85, 0.3);
    GFX.shake(0.7);
    GFX.tween(0.6, t => { U.aberr.value = 0.035 * (1 - t); }, Ease.out, true);
    this.ui('impact', e.u);
    for (const t of tEnts) {
      const p = this.hitPoint(t.u);
      this.fx.pillar(t.home, col, { h: 18, r: 1.5, life: 0.9, k: 2.5 });
      this.fx.pillar(t.home, '#ffffff', { h: 18, r: 0.35, life: 0.5, k: 4 });
      this.fx.ring(t.home.clone().add(V3(0, 0.06, 0)), col, { r: 8, life: 0.9, width: 0.35 });
      this.fx.ring(t.home.clone().add(V3(0, 0.08, 0)), '#ffffff', { r: 5, life: 0.5, width: 0.1 });
      this.fx.ring(p, col, { r: 4, life: 0.5, face: this.camera.position, width: 0.15 });
      this.fx.sprite(p, col, 7, 0.6, { k: 3 });
      this.fx.sprite(p, '#ffffff', 3, 0.3, { k: 5 });
      for (let i = 0; i < 3; i++) this.fx.slash(p, i ? col : '#ffffff', { cam: this.camera, size: 7 - i, angle: -0.3 + i * 1.1, life: 0.45 });
      this.fx.shards(p, col, 26, 8);
      for (let i = 0; i < 8; i++) {
        const a = Math.random() * Math.PI * 2;
        this.fx.bolt(p, p.clone().add(V3(Math.cos(a) * (2 + Math.random() * 2), (Math.random() - 0.3) * 2.5, Math.sin(a) * (2 + Math.random() * 2))), i % 2 ? '#ffffff' : col, { life: 0.25, jag: 0.25, r: 0.02, segs: 12 });
      }
      this.p.burst(p, col, 140, { speed: 12, life: 0.9, size: 0.1, drag: 3 });
      this.p.burst(p, '#ffb45a', 50, { speed: 9, life: 0.7, size: 0.05, drag: 2 });
    }
  }

  // ミゾレ「永久凍土」：盾を地面に叩きつける → 冷気が床を走る → 敵全員の足元から氷山が噴き出す
  async mizoreStrike(e, tEnts) {
    const m = e.model, g = m.group, h = e.home, col = ULT_CINE[e.u.key].col, U = GFX.grade.uniforms;
    this.ultArmed = e; this.focus(e); this.sway = 0;
    if (!e.aura || e.aura.level < 0.9) this.chargeWeapon(e, col, 1, 0.2);
    const c = this.enemyCenter();
    this.face(e, c);

    // S1 盾を振り上げて叩きつける（右斜め前の低い位置から）
    this.tweenPose(m, POSES.mzCast, 0.14);
    this.rail(0.5, this.loc(e, -1.9, 0.45, 1.3), this.loc(e, -1.6, 0.4, 1.0), this.loc(e, 0.1, 1.0, -0.2), this.loc(e, 0.2, 0.8, -0.6), { ease: Ease.out, fov0: 44, fov1: 40, roll0: 0.08, roll1: 0.03 });
    await GFX.delay(0.2);
    await this.tweenPose(m, POSES.mzSlam, 0.08);
    const front = this.loc(e, 0.05, 0.05, 0.55);
    Sfx.slam(); GFX.shake(0.35); GFX.flash('#dff6ff', 0.4, 0.2);
    this.fx.sigil(front.clone().setY(0.04), col, { r: 3.2, life: 1.6, spin: 0.5 });
    this.fx.ring(front.clone().setY(0.06), '#ffffff', { r: 4, life: 0.5, width: 0.08 });
    this.p.burst(front.clone().setY(0.2), '#ffffff', 70, { speed: 5, up: 1.5, life: 0.8, size: 0.05, drag: 2 });
    for (let i = 0; i < 5; i++) { const a = Math.random() * Math.PI * 2; this.fx.iceSpike(front.clone().add(V3(Math.cos(a) * 0.5, 0, Math.sin(a) * 0.5)), { h: 0.5 + Math.random() * 0.5, r: 0.1, tilt: 0.5, dir: a + Math.PI / 2, life: 1.2, color: col }); }
    await GFX.delay(0.12);

    // S2 冷気が床を走り、各敵へ小さな氷柱の列が伸びる（後ろ上方から見下ろす）
    this.ui('lines-on', e.u);
    const back = V3(h.x - c.x, 0, h.z - c.z).normalize();
    this.rail(0.42, h.clone().addScaledVector(back, 1.2).add(V3(1.6, 3.4, 0)), h.clone().addScaledVector(back, -0.6).add(V3(1.4, 3.0, 0)), front.clone().lerp(c, 0.35).setY(0), c.clone().setY(0.4), { ease: Ease.inOut, fov0: 50, fov1: 46 });
    const N = 7;
    await this.every(0.42, N, i => {
      const k = (i + 1) / (N + 1);
      for (const t of tEnts) {
        const p = front.clone().lerp(t.home, k); p.x += (Math.random() - 0.5) * 0.3; p.y = 0;
        this.fx.iceSpike(p, { h: 0.35 + k * 0.6, r: 0.09 + k * 0.06, tilt: 0.45, dir: Math.random() * Math.PI * 2, life: 1.6 - k * 0.3, color: col });
        this.p.burst(p.clone().setY(0.1), '#dff6ff', 6, { speed: 1.5, up: 1, life: 0.5, size: 0.04 });
      }
      if (i % 2 === 0) Sfx.zap();
    });

    // S3 氷山が噴き出す：敵の正面斜めから、ヒットストップと色収差
    const pos0 = c.clone().add(V3(-4.2, 1.3, 6.2)), pos1 = c.clone().add(V3(-3.6, 1.5, 5.4));
    this.cut(pos0, c.clone().add(V3(0.3, 1.4, 0)), { fov: 50, roll: 0.05 });
    this.rail(1.0, pos0, pos1, c.clone().add(V3(0.3, 1.4, 0)), c.clone().add(V3(0.2, 1.7, 0)), { ease: Ease.out, fov0: 50, fov1: 46, roll0: 0.05, roll1: 0.02 });
    Sfx.slam();
    GFX.slowmo(0.15, 0.3);
    GFX.flash('#e8fbff', 0.8, 0.3);
    GFX.shake(0.6);
    GFX.tween(0.6, t => { U.aberr.value = 0.03 * (1 - t); }, Ease.out, true);
    this.ui('impact', e.u);
    for (const t of tEnts) {
      const b = t.home, R = t.model.radius, p = this.hitPoint(t.u);
      this.fx.sigil(b.clone().setY(0.05), col, { r: R * 3 + 0.8, life: 1.8, spin: -0.8 });
      this.fx.iceSpike(b.clone().add(V3(0, 0, 0.1)), { h: t.model.height * 1.5 + 0.8, r: R * 0.55 + 0.15, tilt: 0.08, life: 2.2, color: col, grow: 0.1 });
      for (let i = 0; i < 7; i++) {
        const a = i / 7 * Math.PI * 2 + Math.random() * 0.4, d = R * 0.8 + 0.25 + Math.random() * 0.3;
        this.fx.iceSpike(b.clone().add(V3(Math.cos(a) * d, 0, Math.sin(a) * d)), { h: t.model.height * (0.6 + Math.random() * 0.6) + 0.3, r: 0.14 + Math.random() * 0.12, tilt: 0.45 + Math.random() * 0.2, dir: a + Math.PI / 2, life: 2.0 + Math.random() * 0.3, color: col, grow: 0.12 + i * 0.015 });
      }
      this.fx.pillar(b, '#e8fbff', { h: 14, r: 0.22, life: 0.45, k: 1.5 });
      this.fx.ring(b.clone().add(V3(0, 0.06, 0)), '#ffffff', { r: 6, life: 0.7, width: 0.2 });
      this.fx.sprite(p, col, 3, 0.25, { k: 1.5 });
      this.p.burst(p, '#ffffff', 90, { speed: 9, life: 1.0, size: 0.06, drag: 2.5 });
      this.p.burst(p, col, 80, { speed: 6, up: 2, life: 1.2, size: 0.09, drag: 2 });
    }
    // 空から細かな雪が降り続ける
    this.every(1.4, 14, () => this.snowfall(c.clone().add(V3(0, 2.5, 0)), 8, 3.5));
  }

  // ---------- 敵の攻撃 ----------
  async enemyAttack(src, targets, mv) {
    const e = this.ent(src); if (!e) return;
    const col = e.model.color, tEnts = targets.map(t => this.ent(t)).filter(Boolean);
    if (!tEnts.length) return;
    this.unfocus(); this.sway = 0.2;
    const ranged = ['drone', 'spirit', 'boss', 'empress', 'dragon', 'deity', 'wraith'].includes(src.def.shape);
    const aoe = mv.type === 'aoe';
    this.setCam(V3(e.home.x * 0.3 + 3.2, 2.4, 7.2), V3(e.home.x * 0.5, 1.5, (e.home.z + 3) / 2), { speed: 4 });
    e.model.flash(col, 1.2);
    this.fx.sprite(this.hitPoint(src), col, 2.5, 0.5, { k: 2 });
    await GFX.delay(0.25);
    if (aoe) {
      const p = this.hitPoint(src);
      this.fx.ring(e.home.clone().add(V3(0, 0.1, 0)), col, { r: 11, life: 0.7, width: 0.5 });
      this.p.burst(p, col, 100, { speed: 12, life: 0.7, size: 0.14 });
      GFX.flash(col, 0.25, 0.3);
      await GFX.delay(0.3);
    } else if (ranged) {
      await Promise.all(tEnts.map(t => this.fx.projectile(this.hitPoint(src), this.hitPoint(t.u), col, { dur: 0.3, size: 0.9, arc: 0.4 })));
    } else {
      const main = tEnts[0], g = e.model.group;
      this.lastEnemy = { src, from: g.position.clone() };
      const dest = main.home.clone().add(V3(0, 0, -(e.model.radius + 0.9)));
      await GFX.tween(0.28, t => { g.position.lerpVectors(this.lastEnemy.from, dest, Ease.in(t)); g.position.y = Math.sin(t * Math.PI) * 0.3; });
      for (const t of tEnts) this.fx.slash(this.hitPoint(t.u), col, { cam: this.camera, size: 2.2 });
    }
  }
  async enemyAttackEnd(src) {
    const e = this.ent(src);
    if (e && this.lastEnemy && this.lastEnemy.src === src) {
      const g = e.model.group, from = g.position.clone();
      await GFX.tween(0.3, t => g.position.lerpVectors(from, e.home, t));
    }
    this.lastEnemy = null;
    this.wide();
  }

  victory() {
    this.unfocus();
    const al = [...this.ents.values()].filter(e => e.ally && e.u.alive);
    al.forEach((e, i) => { e.model.group.rotation.y = 0; GFX.delay(i * 0.1).then(() => this.tweenPose(e.model, POSES.victory, 0.5)); });
    this.setCam(V3(0.6, 1.6, -1.2), V3(0, 1.2, 3), { speed: 1.6 });
    for (const e of al) this.p.burst(this.hitPoint(e.u), '#ffd66b', 40, { speed: 3, up: 1, life: 1.5 });
  }

  // ---------- 毎フレーム ----------
  update(dt, t, rdt) {
    // 手持ちカメラのような揺れ（肩越し視点で強め）とロール
    this.camera.position.sub(this.swayOff);
    super.update(dt, t);
    this.swayOff.set(Math.sin(t * 0.53) * 0.06, Math.sin(t * 0.41 + 1.3) * 0.035, Math.sin(t * 0.31) * 0.04).multiplyScalar(this.sway);
    this.camera.position.add(this.swayOff);
    if (this.roll) this.camera.rotateZ(this.roll);
    const cam = this.camera, v = V3();
    const b = this.b;
    this.updateAuras(dt, t);
    if (this.set) this.set.update(dt, t);
    for (const e of this.ents.values()) {
      const u = e.u, m = e.model;
      m.update(dt, t);
      if (!e.ally && P2_STYLES[u.key] && u.phase >= 1 && !(e.p2 && e.p2.dead)) this.updatePhase2(e, dt, t);
      // 状態の可視化
      if (!e.ally) {
        m.brokenAmt += ((u.broken ? 1 : 0) - m.brokenAmt) * Math.min(1, dt * 6);
        if (m.emit && !e.dying) m.emit(this.p, m.group.position);
        if (u.charging && Math.random() < dt * 40) this.p.emit(V3(m.group.position.x + (Math.random() - 0.5) * m.radius * 2, Math.random() * m.height, m.group.position.z + (Math.random() - 0.5) * m.radius), V3(0, 2, 0), hdr('#ff3040', 3), { life: 0.6, size: 0.14 });
        if (u.charging) m.flash('#ff2030', 0.3 + Math.sin(t * 10) * 0.2);
      }
      if (u.dots && u.dots.length && Math.random() < dt * 8 && u.alive) {
        const d = u.dots[Math.floor(Math.random() * u.dots.length)];
        const hp = m.group.position;
        this.p.emit(V3(hp.x + (Math.random() - 0.5) * m.radius, Math.random() * m.height, hp.z + (Math.random() - 0.5) * m.radius * 0.6), V3(0, 1.2, 0), hdr(ELEMENTS[d.elem].color, 2.5), { life: 0.7, size: 0.1 });
      }
      // 凍結
      if (u.frozen && u.alive && !e.ice) {
        e.ice = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 1), new THREE.MeshStandardMaterial({ color: '#bfefff', emissive: '#4ab8ff', emissiveIntensity: 0.6, transparent: true, opacity: 0.45, roughness: 0.05, metalness: 0.2, flatShading: true, depthWrite: false }));
        e.ice.scale.set(m.radius * 1.2, m.height * 0.6, m.radius * 1.0); this.scene.add(e.ice);
        this.fx.shards(this.hitPoint(u), '#9fe6ff', 10, 3);
      }
      if (e.ice) {
        e.ice.position.set(m.group.position.x, m.height * 0.5, m.group.position.z);
        if (!u.frozen || !u.alive) { this.fx.shards(e.ice.position, '#9fe6ff', 16, 4); this.scene.remove(e.ice); disposeTree(e.ice); e.ice = null; }
      }
      // シールド
      if (e.ally) {
        if (u.shield > 0 && u.alive && !e.bubble) {
          e.bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), new THREE.ShaderMaterial({
            uniforms: { c: { value: hdr('#8fe0ff', 1.6) }, time: { value: 0 } },
            vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vN = normalize(normalMatrix*normal); vP = position; vec4 mv = modelViewMatrix*vec4(position,1.0); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }',
            fragmentShader: 'uniform vec3 c; uniform float time; varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); float hex = step(0.92, fract(vP.y * 10.0 + time * 0.5)) * 0.3; gl_FragColor = vec4(c * (f + hex * f), 1.0); }',
            blending: THREE.AdditiveBlending, transparent: true, depthWrite: false,
          }));
          e.bubble.scale.set(0.75, 1.05, 0.75); this.scene.add(e.bubble);
        }
        if (e.bubble) {
          e.bubble.position.set(m.group.position.x, 0.95, m.group.position.z);
          e.bubble.material.uniforms.time.value = t;
          if (!(u.shield > 0) || !u.alive) { this.scene.remove(e.bubble); disposeTree(e.bubble); e.bubble = null; }
        }
      }
      // 対象マーカー
      const el = u.el;
      const tgt = el && el.classList.contains('tgt'), tgt2 = el && el.classList.contains('tgt2');
      const active = b.current === u && e.ally;
      const mk = e.mark;
      const want = tgt ? 0.9 : tgt2 ? 0.45 : active ? 0.7 : 0;
      mk.material.opacity += (want - mk.material.opacity) * Math.min(1, dt * 10);
      mk.material.color.copy(hdr(e.ally && tgt ? '#6dff9e' : '#e8c77a', 3));
      mk.position.set(m.group.position.x, 0.03, m.group.position.z);
      mk.scale.setScalar(m.radius * 1.4 * (1 + Math.sin(t * 5) * 0.04));
      mk.rotation.z = t;
      // DOM オーバーレイの追従
      if (!e.ally && el && !e.dying) {
        v.copy(m.group.position); v.y = m.height * m.group.scale.y / (m.group.userData.s0 || 1) + 0.25; v.project(cam);
        const x = (v.x + 1) * 640, yTop = (1 - v.y) * 360;
        v.copy(m.group.position); v.y = 0; v.project(cam);
        const yBot = (1 - v.y) * 360;
        v.copy(m.group.position); v.x += m.radius; v.project(cam);
        const w = Math.abs((v.x + 1) * 640 - x) * 2;
        el.style.transform = `translate(${clamp(x, 90, 1190).toFixed(1)}px, ${clamp(yTop, 150, 640).toFixed(1)}px)`;
        el.style.setProperty('--dy', (yTop - clamp(yTop, 150, 640)).toFixed(1) + 'px');
        const hit = el.querySelector('.e-hit');
        if (hit) { hit.style.height = Math.max(40, yBot - yTop) + 'px'; hit.style.width = Math.max(60, w) + 'px'; }
      }
      if (e.ally && u.anchor) {
        v.copy(this.hitPoint(u)); v.y += 0.4; v.project(cam);
        u.anchor.style.transform = `translate(${((v.x + 1) * 640).toFixed(1)}px, ${((1 - v.y) * 360).toFixed(1)}px)`;
      }
    }
  }
}

// メニュー背景：ステージの風景をゆっくり周回（敵を並べることも可能）
class SceneryView extends BaseView {
  constructor(theme, { screenX = 640, screenY = 360, radius = 13, height = 3.2, close = false } = {}) {
    super(theme, 40);
    this.bloomStrength = 0.8;
    this.radius = radius; this.h = height; this.models = []; this.enemyKeys = ''; this.close = close;
    this.camera.setViewOffset(1280, 720, 640 - screenX, 360 - screenY, 1280, 720);
    this.setCam(V3(0, height, radius), V3(0, 1.4, 0), { snap: true, speed: 2 });
  }
  setEnemies(keys) {
    const sig = keys.join();
    if (sig === this.enemyKeys) return;
    this.enemyKeys = sig;
    for (const m of this.models) { this.scene.remove(m.group); disposeTree(m.group); }
    this.models = keys.map(k => buildEnemy(k));
    const total = this.models.reduce((a, m) => a + m.radius * 2 + 1, 0);
    let x = -total / 2;
    for (const m of this.models) {
      x += m.radius + 0.5;
      m.group.position.set(x, 0, m.isBoss ? -2 : 0); x += m.radius + 0.5;
      this.scene.add(m.group);
      this.fx.ring(m.group.position.clone().add(V3(0, 0.05, 0)), m.color, { r: m.radius * 2, life: 0.8 });
    }
    const big = this.models.some(m => m.isBoss);
    const H = Math.max(1.5, ...this.models.map(m => m.height));
    this.lookY = big ? 2.6 : H * 0.5;
    if (this.close) { this.radius = Math.max(6, 4.6 * H, 1.8 * total); this.h = this.lookY + 0.8; }
    else this.radius = big ? 15 : 11;
  }
  update(dt, t, rdt) {
    const a = t * 0.06;
    const sw = this.close ? 0.15 : 0.5;
    this.camPos.set(Math.sin(a) * this.radius * sw, this.h + Math.sin(t * 0.2) * 0.3, Math.cos(a * 0.7) * (this.close ? 0.5 : 2) + this.radius);
    this.camLook.set(0, this.lookY || 1.4, 0);
    super.update(rdt, t);
    for (const m of this.models) { m.update(rdt, t); if (m.emit) m.emit(this.p, m.group.position); }
  }
}
