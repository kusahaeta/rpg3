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

// ふかふかの座布団に立つにゃんこ（ハブ・キャラ画面）。ドラッグで回せる
class ShowcaseView extends BaseView {
  constructor(key, { screenX = 640, dist = 3.1, height = 0.62, theme = 'meadow' } = {}) {
    super(theme, 32, { skyTree: true });
    this.bloomStrength = 0.3; this.exposure = 1.0;
    this.rotY = -0.35; this.targetRot = -0.35; this.spin = 0;
    this.dist = dist; this.lookH = height;
    this.env.floor.visible = false;
    const plat = new THREE.Group(); this.scene.add(plat); this.plat = plat;
    // 丸い敷物と座布団
    const rug = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.3, 0.05, 48), toon('#f4e2c8')); rug.position.y = -0.02; rug.receiveShadow = true; plat.add(rug);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(1.27, 0.035, 8, 64), toon('#e0453a')); rim.rotation.x = Math.PI / 2; rim.position.y = 0.01; plat.add(rim);
    const cushion = new THREE.Mesh(new THREEX.RoundedBoxGeometry(0.95, 0.12, 0.95, 4, 0.06), toon('#ff9ab8')); cushion.position.y = 0.05; cushion.receiveShadow = true; plat.add(cushion);
    for (const [x, z] of [[-0.44, -0.44], [0.44, -0.44], [-0.44, 0.44], [0.44, 0.44]]) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon('#ffd76a')); t.position.set(x, 0.1, z); plat.add(t); }
    // 草原と花
    const grass = new THREE.Mesh(new THREE.CircleGeometry(40, 48), new THREE.MeshStandardMaterial({ color: '#8ac468', roughness: 1 })); grass.rotation.x = -Math.PI / 2; grass.position.y = -0.05; grass.receiveShadow = true; this.scene.add(grass);
    const fcols = ['#ffffff', '#ffe07a', '#ffb8d8', '#b8d8ff'];
    for (let i = 0; i < 120; i++) { const a = Math.random() * Math.PI * 2, r = 1.6 + Math.random() * 10; const f = new THREE.Mesh(new THREE.SphereGeometry(0.04 + Math.random() * 0.03, 6, 4), toon(fcols[i % 4])); f.position.set(Math.cos(a) * r, 0.02, Math.sin(a) * r); this.scene.add(f); }
    this.cushion = cushion;
    this.frame(screenX);
    this.setCam(V3(0, 1.0, dist), V3(0, height, 0), { snap: true });
    if (key) this.setChar(key, false);
  }
  frame(screenX) { this.camera.setViewOffset(1280, 720, 640 - screenX, 0, 1280, 720); }
  setChar(key, burst = true) {
    if (this.model) { this.scene.remove(this.model.group); disposeTree(this.model.group); }
    this.model = null;
    if (!key) return;
    const m = buildCharacter(key); this.model = m; this.scene.add(m.group);
    m.group.position.y = 0.11;
    m.setPose(POSES.idle); m.group.rotation.y = this.rotY; m.face.set('smile');
    if (burst) {
      const col = ELEMENTS[CHARS[key].elem].color;
      this.fx.ring(V3(0, 0.12, 0), col, { r: 2, life: 0.7 });
      this.p.burst(V3(0, 0.7, 0), col, 50, { speed: 3, life: 1, size: 0.07, up: 0.6 });
      m.flash('#ffffff', 1.2);
      Sfx.meow && Sfx.meow(key);
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
      // ときどき身振り（手を振る・のびをする）
      const ph = Math.floor(t / 5) % 4;
      const pose = ph === 1 ? { ...POSES.idle, armRx: -2.4, armRz: -0.75, elbowR: -0.9 + Math.sin(t * 10) * 0.4 } : ph === 3 ? POSES.ready : POSES.idle;
      for (const k of POSE_KEYS) this.model.pose[k] += ((pose[k] || 0) - this.model.pose[k]) * (1 - Math.exp(-5 * rdt));
      if (ph === 1 && this.model.face) this.model.face.set('joy'); else if (this.model.face && this.model.face.expr === 'joy') this.model.face.set('smile');
    }
    this.camera.position.x += Math.sin(t * 0.25) * 0.001;
  }
}

// タイトル：草原の丘から、遠くのにゃんだーの樹を見上げる5匹
class TitleView extends BaseView {
  constructor() {
    super('meadow', 42, { skyTree: false });
    this.bloomStrength = 0.3;
    const { g, fruits } = worldTree(0.95, 1.4); g.position.set(8, -8, -150); this.scene.add(g); this.fruits = fruits;
    this.cats = ['mike', 'kuro', 'shiro', 'tama', 'maou'].map((k, i) => {
      const m = buildCharacter(k); m.group.position.set((i - 2) * 0.95, 0, 2.5 + Math.abs(i - 2) * 0.35); m.group.rotation.y = Math.PI + (i - 2) * 0.08; m.setPose(POSES.idle); this.scene.add(m.group); return m;
    });
    this.setCam(V3(-1.6, 1.3, 7.2), V3(0.6, 3.5, -40), { snap: true, speed: 0.4 });
  }
  update(dt, t, rdt) {
    this.camPos.set(-1.6 + Math.sin(t * 0.07) * 0.8, 1.3 + Math.sin(t * 0.1) * 0.15, 7.2);
    super.update(rdt, t);
    this.cats.forEach((m, i) => {
      m.update(rdt, t + i);
      const wave = Math.sin(t * 0.5 + i * 1.3) > 0.93;
      m.pose.armRx += ((wave ? -2.5 : -0.1) - m.pose.armRx) * (1 - Math.exp(-4 * rdt));
    });
    this.fruits.forEach((f, i) => f.scale.setScalar(1 + Math.sin(t * 2 + i) * 0.2));
  }
}

// ============================================================
//  バトルビュー（演出ディレクター）
// ============================================================
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
// 第二形態の演出の型（ボスごと）：足もとの魔法陣・周りを巡る結晶・渦・稲妻や棘
const P2_STYLES = {
  king_nezumi: { sub: '#fff0b8', dark: '#8a5a10', crown: { color: '#ffcf4a', emissive: '#ffb020', ei: 0.8 }, pulse: '#ffb040', fog: '#8a7a50', swirl: ['#ffffff', null, '#ffcf4a'], tint: [0.1, 0.25, 0.45], desat: 0.2, charge: '#fff0b8', tone: [110, 90, 80] },
  inoshishi: { sub: '#ffd8a8', dark: '#8a3a10', crown: { color: '#8a5a3a', ei: 0.4 }, pulse: '#ff8a3a', fog: '#8a6a4a', swirl: ['#ffffff', null, '#ff9a4a'], tint: [0.1, 0.3, 0.45], desat: 0.2, charge: '#ffd8a8', tone: [90, 70, 64] },
  piero: { sub: '#ffe8f4', dark: '#ff3a9a', crown: { color: '#ffd76a', emissive: '#ff6ab8', ei: 0.9 }, pulse: '#ff6ab8', fog: '#6a2a5a', swirl: ['#ffffff', '#6ad8ff', '#ffd76a'], tint: [0.2, 0.45, 0.2], desat: 0.3, charge: '#ffe8f4', tone: [180, 140, 120] },
  kako_kuro: { sub: '#e8d8ff', dark: '#5a2aff', crown: { color: '#2a1a4a', emissive: '#8a4aff', ei: 1.2 }, pulse: '#6a3aff', fog: '#2a1a48', swirl: ['#ffffff', null, '#6a3aff'], tint: [0.4, 0.5, 0.15], desat: 0.4, charge: '#1a0a38', bolts: true, tone: [80, 62, 56] },
  guardian: { sub: '#fff8d8', dark: '#e8b830', crown: { color: '#e8d8a8', emissive: '#ffd24a', ei: 0.9 }, pulse: '#ffd24a', fog: '#8a8a60', swirl: ['#ffffff', '#8affe0', '#ffd24a'], tint: [0.15, 0.2, 0.5], desat: 0.2, charge: '#fff8d8', spikes: true, tone: [140, 110, 100] },
  boss_maou: { sub: '#ffd8ff', dark: '#8a2aff', crown: { color: '#2a1040', emissive: '#c04aff', ei: 1.3 }, pulse: '#9a3aff', fog: '#3a1450', swirl: ['#ffffff', '#ff6ad8', '#8a2aff'], tint: [0.35, 0.6, 0.2], desat: 0.3, charge: '#1a0428', bolts: true, tone: [74, 58, 52] },
  kodoku_kage: { sub: '#d8c8ff', dark: '#2a0a5a', crown: { color: '#0a0418', emissive: '#6a3aff', ei: 1.1 }, pulse: '#3a1a8a', fog: '#140a28', swirl: ['#ffffff', null, '#3a1a8a'], tint: [0.5, 0.55, 0.3], desat: 0.55, charge: '#05020c', bolts: true, tone: [64, 50, 46] },
  kodoku: { sub: '#e8e0ff', dark: '#1a0a4a', crown: { color: '#05020c', emissive: '#8a5aff', ei: 1.4 }, pulse: '#2a1070', fog: '#0c0620', swirl: ['#ffffff', '#ff8ab8', '#2a1070'], tint: [0.55, 0.6, 0.35], desat: 0.65, charge: '#020108', bolts: true, tone: [56, 44, 40] },
  nekogami: { sub: '#fffff0', dark: '#ffd24a', crown: { color: '#fff4c8', emissive: '#ffe08a', ei: 1.0 }, pulse: '#ffe08a', fog: '#f8e8f0', swirl: ['#ffffff', '#ff9ad8', '#ffe08a'], tint: [0.05, 0.15, 0.4], desat: 0.1, charge: '#fffff0', spikes: false, tone: [220, 180, 160] },
};

class BattleView extends BaseView {
  constructor(battle, theme) {
    // 物語の場所で戦う（第一章）：探索フィールドの区画を背景に組み立てる
    const loc = battle.opts.loc && typeof resolveBattleSet === 'function' ? resolveBattleSet(battle.opts.loc) : null;
    super(loc ? battleTheme(loc, theme) : theme, 38, loc ? { field: true, bare: true, zone: FIELD_ZONES[loc.zone] } : {});
    this.b = battle;
    if (loc) buildBattleSet(this, loc);
    this.bloomStrength = 0.55;
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
    const home = V3((i - (n - 1) / 2) * 1.25, 0, 2.6);
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
    this.setCam(V3(0, hasBoss ? 2.8 : 2.1, hasBoss ? 10.2 : 8.2), V3(0, hasBoss ? 2.1 : 1.0, -2.5), { speed: 2.5 });
  }
  // 本家風の肩越し視点：手前左に行動キャラ、奥の中央に敵
  shoulder(e, { snap = false, speed = 2.6 } = {}) {
    const h = e.home, c = this.enemyCenter(), boss = this.b.enemies.some(x => x.def.boss);
    const f = V3(c.x - h.x, 0, c.z - h.z).normalize(), r = V3(-f.z, 0, f.x);
    const pos = h.clone().addScaledVector(f, -3.5).addScaledVector(r, 2.0); pos.y = 1.4;
    const look = h.clone().addScaledVector(f, 6).addScaledVector(r, 1.0); look.y = boss ? 1.6 : 0.8;
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
      this.setCam(V3(e.home.x * 0.4 - 1.2, 2.3, 8.6), V3(e.home.x * 0.5, 1.2, e.home.z * 0.5), { speed: 2.5 });
    }
  }
  intro() {
    const hasBoss = this.b.enemies.some(e => e.def.boss);
    this.setCam(V3(-6, 4, hasBoss ? -12 : -9), V3(0, hasBoss ? 3 : 1.4, -3), { snap: true });
    this.setCam(V3(0, hasBoss ? 2.8 : 2.1, hasBoss ? 10.2 : 8.2), V3(0, hasBoss ? 2.1 : 1.0, -2.5), { speed: 1.1 });
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
    this.unfocus(); this.sway = 0;
    if (m.style === 'melee' && !opt.ranged) {
      const multi = tEnts.length > 2;
      const c = this.enemyCenter();
      const dest = multi ? V3(c.x, 0, Math.max(...tEnts.map(t => t.home.z)) + 2.2)
        : main.home.clone().add(V3(0, 0, main.model.radius + 0.7));
      if (multi || main.u.def.boss) dest.z = Math.min(dest.z, 1.0);
      this.setCam(V3(dest.x + 3.3, 1.5, dest.z + 2.8), V3(dest.x - 0.4, 0.9, dest.z - 1.4), { speed: 5 });
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
      this.setCam(V3(e.home.x + 1.3, 1.6, e.home.z + 2.8), V3(main.home.x * 0.7, 1.0, main.home.z), { speed: 5 });
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
    this.setCam(V3(e.home.x + 2.0, 1.3, e.home.z - 1.6), V3(e.home.x - 0.2, 0.8, e.home.z + 0.3), { speed: 4 });
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
    this.setCam(V3(h.x + 0.25, 0.95, h.z + 1.15), V3(h.x, 0.88, h.z), { snap: true });
    this.setCam(V3(h.x + 0.9, 0.75, h.z + 2.5), V3(h.x, 0.75, h.z), { speed: 1.8 });
    this.tweenPose(m, POSES.ult, 0.45);
    this.fx.pillar(h.clone().add(V3(0, 0, -1.2)), col, { h: 14, r: 0.7, life: 1.3, k: 1.2 });
    this.fx.ring(h.clone().add(V3(0, 0.05, 0)), col, { r: 3, life: 1.0 });
    m.flash(col, 0.45);
    await GFX.tween(1.15, t => {
      for (let i = 0; i < 4; i++) {
        const a = t * 20 + i * Math.PI / 2, r = 0.75 - t * 0.3;
        this.p.emit(V3(h.x + Math.cos(a) * r * 0.7, 0.15 + t * 1.2, h.z - 0.2 + Math.sin(a) * r * 0.5), V3(0, 0.9, 0), hdr(col, 2), { life: 0.45, size: 0.04 });
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
  //  必殺技の対象選択（肩越し視点）
  // ============================================================
  // dur 秒のあいだに n 回、等間隔で fn を呼ぶ（フレームレートに依存しない）
  every(dur, n, fn) {
    let i = 0;
    return GFX.tween(dur, (_, p) => { const k = Math.floor(p * n); while (i < k) fn(i++); }, Ease.linear);
  }
  hasUltCine() { return false; }
  ui(kind, u) { if (this.b.ultUi) this.b.ultUi(kind, u); }
  headPos(e) { e.model.group.updateMatrixWorld(true); return e.model.headPivot.getWorldPosition(V3()); }
  ultAim(u) {
    const e = this.ent(u); if (!e) return;
    this.focus(e); this.face(e, this.enemyCenter()); this.shoulder(e);
    e.model.flash(e.model.elemCol, 0.6);
  }
  ultCancel(u) {
    const e = this.ent(u); if (!e) return;
    this.tweenPose(e.model, POSES.ready, 0.3);
    e.model.group.rotation.y = Math.PI;
    this.wide();
  }

  // ---------- にゃんこファンタジーの演出 ----------
  // 話す：敵のほうへ歩み寄って手を振る
  async talkFx(u, t) {
    const e = this.ent(u), te = this.ent(t); if (!e || !te) return;
    this.unfocus(); this.sway = 0.2;
    const m = e.model;
    this.face(e, te.home);
    if (m.face) m.face.set('smile');
    this.setCam(V3(e.home.x + 1.6, 1.3, e.home.z + 2.2), V3((e.home.x + te.home.x) / 2, 0.9, (e.home.z + te.home.z) / 2), { speed: 4 });
    const wave = { ...POSES.idle, armRx: -2.4, armRz: -0.75, elbowR: -0.9 };
    await this.tweenPose(m, wave, 0.2);
    for (let i = 0; i < 3; i++) this.fx.sprite(this.hitPoint(u).add(V3(0.2 + i * 0.25, 0.5 + i * 0.15, -0.3 - i * 0.4)), '#fff4c8', 0.3 + i * 0.1, 0.8, { k: 2 });
    await GFX.delay(0.35);
    te.model.flash('#ffe8f0', 0.8);
    this.fx.ring(this.hitPoint(t), '#ffb8d8', { r: 1.2, life: 0.6, face: this.camera.position });
  }
  // 猫じゃらしに夢中（マオウ）
  lureFx(t) {
    const te = this.ent(t); if (!te) return;
    const p = this.hitPoint(t).add(V3(0.6, 0.6, 0.8));
    const g = new THREE.Group(); g.position.copy(p);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.8, 6), toon('#c8a060')); stick.position.y = -0.4; g.add(stick);
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon('#fff0a8')); tuft.scale.set(0.6, 1.4, 0.6); tuft.position.y = 0.05; g.add(tuft);
    this.fx.add(g, 2.2, (k, o) => { o.rotation.z = Math.sin(k * 30) * 0.6; o.position.x = p.x + Math.sin(k * 20) * 0.3; });
    for (let i = 0; i < 12; i++) GFX.delay(i * 0.12).then(() => this.p.emit(this.hitPoint(t).add(V3(0, 0.8, 0)), V3((Math.random() - 0.5), 1.2, 0), hdr('#ff8ab8', 2.4), { life: 0.9, size: 0.14 }));
  }
  // おひるね（タマ）：丸くなって Zzz
  napFx(u) {
    const e = this.ent(u); if (!e) return;
    const m = e.model;
    if (m.face) m.face.set('sleepy');
    this.tweenPose(m, POSES.sleep, 0.4);
    const h = this.hitPoint(u);
    for (let i = 0; i < 3; i++) GFX.delay(i * 0.3).then(() => { const z = this.zSprite(); z.position.copy(h).add(V3(0.2, 0.4, 0)); this.fx.add(z, 1.4, (k, o) => { o.position.y += 0.012; o.position.x += Math.sin(k * 8) * 0.004; o.material.opacity = 1 - k; }); });
    GFX.delay(1.2).then(() => { if (u.alive) { this.tweenPose(m, POSES.ready, 0.3); if (m.face) m.face.set('neutral'); } });
  }
  zSprite() {
    if (!TexCache.zzz) { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); g.font = '800 48px sans-serif'; g.fillStyle = '#ffffff'; g.strokeStyle = '#6a8aff'; g.lineWidth = 6; g.textAlign = 'center'; g.textBaseline = 'middle'; g.strokeText('Z', 32, 34); g.fillText('Z', 32, 34); TexCache.zzz = new THREE.CanvasTexture(c); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: TexCache.zzz, transparent: true, depthWrite: false })); sp.scale.setScalar(0.3); return sp;
  }
  // コンボ：ふたり（みんな）が並んで光る
  async comboIntro(mem, c) {
    const es = mem.map(u => this.ent(u)).filter(Boolean); if (!es.length) return;
    this.unfocus(); this.sway = 0;
    const cx = es.reduce((a, e) => a + e.home.x, 0) / es.length;
    this.setCam(V3(cx + 0.4, 1.0, 5.4), V3(cx, 0.7, 2.6), { snap: true });
    this.setCam(V3(cx + 0.9, 0.9, 4.6), V3(cx, 0.75, 2.6), { speed: 1.5 });
    es.forEach((e, i) => { e.model.group.rotation.y = 0; if (e.model.face) e.model.face.set('joy'); GFX.delay(i * 0.08).then(() => this.tweenPose(e.model, POSES.ult, 0.35)); e.model.flash(ELEMENTS[e.u.elem].color, 0.8); this.fx.pillar(e.home, ELEMENTS[e.u.elem].color, { h: 6, r: 0.5, life: 1.1, k: 1.4 }); });
    if (es.length > 1) for (let i = 0; i < es.length - 1; i++) this.fx.beam(this.hitPoint(es[i].u), this.hitPoint(es[i + 1].u), '#ffcf4a', { life: 1.0, r: 0.03 });
    this.p.burst(V3(cx, 0.8, 2.6), '#ffcf4a', 80, { speed: 4, life: 1.2, size: 0.08, up: 0.8 });
    GFX.flash('#fff4c8', 0.35, 0.5);
    await GFX.delay(1.2);
    es.forEach(e => { e.model.group.rotation.y = Math.PI; this.tweenPose(e.model, POSES.ready, 0.2); });
    this.wide();
  }
  // にゃんこオールスターズ：世界中の猫の光が集まり、虹の柱が敵を貫く
  async allStarsFx(mem) {
    const c = this.enemyCenter();
    this.unfocus();
    this.setCam(V3(0, 3.6, 9.5), V3(c.x, 2.2, c.z), { speed: 1.2 });
    const cols = ['#ff6a8a', '#ffb84a', '#ffe84a', '#6aff8a', '#6ad8ff', '#8a6aff', '#ff8ad8'];
    await this.every(1.4, 40, i => {
      const a = Math.random() * Math.PI * 2, r = 14 + Math.random() * 8, from = V3(Math.cos(a) * r, 6 + Math.random() * 6, Math.sin(a) * r - 3);
      this.fx.projectile(from, c.clone().add(V3(0, 1.5, 0)), cols[i % 7], { dur: 0.6, size: 0.6, arc: 1.5 });
    });
    GFX.flash('#ffffff', 0.9, 0.8); GFX.shake(0.6); GFX.slowmo(0.35, 0.8);
    cols.forEach((col, i) => GFX.delay(i * 0.05).then(() => this.fx.pillar(c, col, { h: 30, r: 1.2 + i * 0.25, life: 1.4, k: 2 })));
    this.fx.ring(c.clone().add(V3(0, 0.1, 0)), '#ffffff', { r: 16, life: 1.2, width: 0.4 });
    this.p.burst(c.clone().add(V3(0, 2, 0)), '#ffffff', 220, { speed: 14, life: 1.8, size: 0.14 });
    Sfx.slam(); Sfx.win();
    await GFX.delay(0.9);
  }
  // 世界中の猫の声が届く（光の粒が空から降りてくる）
  voiceFx() {
    const cols = ['#ffe08a', '#ff9ab8', '#8ad8ff', '#b8ff8a'];
    for (let i = 0; i < 30; i++) this.p.emit(V3((Math.random() - 0.5) * 16, 8 + Math.random() * 4, (Math.random() - 0.5) * 8 + 1), V3(0, -3 - Math.random() * 2, 0), hdr(pick(cols), 2.4), { life: 2.2, size: 0.14, drag: 0.4 });
    for (const e of this.ents.values()) if (e.ally && e.u.alive) e.model.flash('#fff4c8', 0.6);
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
    al.forEach((e, i) => { e.model.group.rotation.y = 0; if (e.model.face) e.model.face.set('joy'); GFX.delay(i * 0.1).then(() => this.tweenPose(e.model, i % 2 ? POSES.victory : POSES.ult, 0.5)); });
    this.setCam(V3(0.5, 1.15, -0.4), V3(0, 0.72, 2.6), { speed: 1.6 });
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
          e.bubble.scale.set(0.62, 0.72, 0.62); this.scene.add(e.bubble);
        }
        if (e.bubble) {
          e.bubble.position.set(m.group.position.x, 0.6, m.group.position.z);
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
  constructor(theme = 'meadow', { screenX = 640, screenY = 360, radius = 13, height = 3.2, close = false } = {}) {
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
