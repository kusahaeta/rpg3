'use strict';
// ============================================================
//  会話シーンの演出：物語の場所に立ち、にゃんこたちが演技をする
//  ・背景は探索フィールドの区画をそのまま組み立てる（SCENE_STAGES の zone / at / face）
//  ・キャラクターは向き合って立ち、話し手の方を見る。行ごとの演出は台本の行の最後に
//    { f: 表情, g: 身振り, r: 周りの反応, ... } で書く（書かなければ台詞から推測する）
//  ・カメラは全景・話し手の寄り・肩越しを切り替え、ゆっくり動かす
// ============================================================

// ---------- 会話用の姿勢（立ち方）と身振り ----------
Object.assign(POSES, {
  armsCrossed: { armRx: -0.5, armRz: 0.6, elbowR: -1.95, armLx: -0.45, armLz: -0.62, elbowL: -1.9, headX: 0.04 },
  polite:      { armRx: -0.28, armRz: 0.36, elbowR: -1.15, armLx: -0.28, armLz: -0.36, elbowL: -1.15 },
  hipHand:     { armLz: 0.75, armLx: 0.25, elbowL: -1.5, armRz: -0.12, elbowR: -0.3, twist: 0.06 },
  weak:        { hipsY: -0.04, lean: 0.14, headX: 0.22, armLx: -0.55, armLz: -0.2, elbowL: -1.4, armRz: -0.1, elbowR: -0.25, kneeL: 0.12, kneeR: 0.1 },
  kneel:       { hipsY: -0.47, lean: 0.1, headX: 0.18, legLx: -1.5, kneeL: 1.5, legRx: 0.12, kneeR: 1.45, armLx: -0.75, armLz: 0.1, elbowL: -0.35, armRx: -0.2, armRz: -0.25, elbowR: -0.4 },
  crouch:      { hipsY: -0.42, lean: 0.35, headX: -0.25, legLx: -1.2, kneeL: 1.9, legRx: -0.9, kneeR: 1.7, armLx: -0.9, elbowL: -1.2, armRx: -0.9, elbowR: -1.2 },
  guardStaff:  { hipsY: -0.02, armRx: -1.1, armRz: 0.1, elbowR: -0.9, armLx: -0.6, armLz: -0.25, elbowL: -1.1, legLx: -0.25, legRx: 0.2, kneeL: 0.2, kneeR: 0.2 },
  explain:     { armRx: -0.9, armRz: -0.35, elbowR: -0.9, armLz: 0.2, elbowL: -0.3, headY: 0.05 },
  point:       { armRx: -1.45, armRz: -0.05, elbowR: -0.08, lean: 0.04, headX: -0.03 },
  cheer:       { armRx: -2.85, armRz: -0.35, elbowR: -0.25, armLx: -2.85, armLz: 0.35, elbowL: -0.25, headX: -0.15, lean: -0.05 },
  fist:        { armRx: -1.3, armRz: 0.25, elbowR: -2.0, armLz: 0.2, elbowL: -0.4, lean: 0.06 },
  handChest:   { armRx: -0.55, armRz: 0.62, elbowR: -1.7, armLz: 0.15, elbowL: -0.25, headX: 0.08 },
  bothChest:   { armRx: -0.6, armRz: 0.6, elbowR: -1.8, armLx: -0.6, armLz: -0.6, elbowL: -1.8, headX: 0.15 },
  think:       { armRx: -1.05, armRz: 0.4, elbowR: -2.25, armLx: -0.45, armLz: -0.55, elbowL: -1.7, headX: 0.12, headY: 0.12 },
  surprised:   { lean: -0.12, headX: -0.08, armRx: -0.7, armRz: -0.45, elbowR: -1.25, armLx: -0.7, armLz: 0.45, elbowL: -1.25, hipsY: 0.01 },
  recoil:      { lean: -0.2, twist: 0.1, headX: -0.1, armRx: -0.5, armRz: -0.3, elbowR: -1.5, armLx: -0.3, armLz: 0.3, elbowL: -0.8, legLx: 0.25, kneeL: 0.1 },
  shrug:       { armRx: -0.35, armRz: -0.6, elbowR: -1.35, armLx: -0.35, armLz: 0.6, elbowL: -1.35, headY: 0.18, headX: 0.05 },
  offer:       { armRx: -1.15, armRz: -0.15, elbowR: -0.45, lean: 0.06, headX: 0.04 },
  offerL:      { armLx: -1.15, armLz: 0.15, elbowL: -0.45, lean: 0.06, headX: 0.04 },
  present:     { armLx: -0.8, armLz: 0.7, elbowL: -0.35, armRz: -0.1, elbowR: -0.3, twist: 0.15 },
  raise:       { armLx: -2.9, armLz: 0.1, elbowL: -0.25, armRz: -0.2, elbowR: -0.3, headX: -0.18 },
  reach:       { armLx: -1.5, armLz: -0.05, elbowL: -0.12, lean: 0.12, headX: -0.1, legLx: -0.3, kneeL: 0.15 },
  insert:      { armLx: -1.05, armLz: -0.15, elbowL: -0.55, armRx: -0.3, elbowR: -0.5, lean: 0.28, headX: 0.25 },
  bow:         { lean: 0.55, headX: 0.25, armRx: 0.05, armRz: 0.25, elbowR: -0.5, armLx: 0.05, armLz: -0.25, elbowL: -0.5 },
  lookDown:    { headX: 0.4, lean: 0.06, armRz: -0.08, armLz: 0.08 },
  lookUp:      { headX: -0.45, lean: -0.08 },
  wave:        { armRx: -2.4, armRz: -0.75, elbowR: -0.9 },
  wave2:       { armRx: -2.4, armRz: -0.35, elbowR: -1.1 },
  laugh:       { lean: -0.12, headX: -0.18, armRx: -0.6, armRz: 0.5, elbowR: -1.6, armLz: 0.3, elbowL: -0.5 },
  pout:        { armRx: -0.5, armRz: 0.6, elbowR: -1.9, armLx: -0.45, armLz: -0.62, elbowL: -1.9, headY: -0.35, headX: -0.1 },
});
// 身振り：[姿勢の名前または部分的な姿勢, 保つ秒数, { hop: 跳ねる高さ }]
const GESTURES = {
  talk: [['talk', 1.0]], talk2: [['talk2', 1.0]], explain: [['explain', 1.3]], point: [['point', 1.7]],
  cheer: [['cheer', 1.0, { hop: 0.22 }]], fist: [['fist', 1.1, { hop: 0.08 }]], handChest: [['handChest', 1.8]], bothChest: [['bothChest', 1.8]],
  think: [['think', 2.0]], surprise: [['surprised', 1.0, { hop: 0.06 }]], recoil: [['recoil', 1.1]], shrug: [['shrug', 1.1]],
  offer: [['offer', 1.8]], give: [['offerL', 1.6]], present: [['present', 1.4]], raise: [['raise', 2.2]], reach: [['reach', 3.5]], insert: [['insert', 2.4]],
  bow: [['bow', 0.9]], lookDown: [['lookDown', 1.8]], lookUp: [['lookUp', 1.6]], laugh: [['laugh', 0.3, { hop: 0.05 }], [{ ...POSES.laugh, lean: -0.05 }, 0.25], ['laugh', 0.3], [{ ...POSES.laugh, lean: -0.05 }, 0.3]],
  wave: [['wave', 0.3], ['wave2', 0.3], ['wave', 0.3], ['wave2', 0.3]],
  nod: [[{ headX: 0.3 }, 0.18], [{ headX: -0.02 }, 0.16], [{ headX: 0.2 }, 0.16], [{}, 0.1]],
  shake: [[{ headY: 0.32 }, 0.16], [{ headY: -0.32 }, 0.2], [{ headY: 0.24 }, 0.18], [{}, 0.1]],
  tilt: [[{ headY: 0.18, headX: 0.06, twist: 0.06 }, 1.3]],
  turnAway: [[{ headY: -0.7, twist: -0.18 }, 2.2]],
  hop: [[{}, 0.4, { hop: 0.25 }]],
  pout: [['pout', 1.8]],
};
// キャラクターごとの普段の立ち方と表情、戦うときの構え、よく使う身振り
const CHAR_ACT = {
  mike:  { stance: 'idle', face: 'smile', excite: 'joy', ready: 'ready', talk: ['talk2', 'fist', 'explain', 'hop'] },
  kuro:  { stance: 'armsCrossed', face: 'serious', ready: 'ready', talk: ['tilt', null, 'nod', 'turnAway'] },
  shiro: { stance: 'hipHand', face: 'smug', excite: 'joy', ready: 'ready', talk: ['explain', 'point', 'handChest', 'shrug'] },
  tama:  { stance: 'idle', face: 'sleepy', excite: 'smile', ready: 'idle', talk: ['tilt', 'lookUp', null] },
  maou:  { stance: 'armsCrossed', face: 'smug', excite: 'joy', ready: 'ready', talk: ['explain', 'point', 'shrug', 'turnAway'] },
  sonchou: { stance: 'idle', face: 'neutral', talk: ['explain', 'shake', 'nod'] },
  sakanaya: { stance: 'hipHand', face: 'smile', excite: 'joy', talk: ['point', 'talk2', 'laugh'] },
  king_npc: { stance: 'idle', face: 'sad', talk: ['lookDown', 'talk', 'shake'] },
  piero_npc: { stance: 'idle', face: 'cry', talk: ['bothChest', 'lookDown', 'shrug'] },
  nyahaha_ou: { stance: 'idle', face: 'sad', talk: ['explain', 'lookDown', 'shake'] },
};
// 台詞から表情と身振りを推し量る（台本に書かれていないとき）
function inferAct(key, text) {
  const C = CHAR_ACT[key] || {}, t = String(text).replace('（通信）', '').trim();
  const pick = C.talk || ['talk', 'explain'];
  let f = C.face || 'neutral', g = pick[Math.floor(Math.random() * pick.length)];
  if (/！？|！\?|^(えっ|わっ|なっ|ええっ|うそ|にゃっ)/.test(t)) { f = 'surprise'; g = 'surprise'; }
  else if (/^……/.test(t) && t.length < 16) { f = key === 'kuro' ? 'serious' : key === 'tama' ? 'sleepy' : 'worry'; g = 'lookDown'; }
  else if (/？$/.test(t)) { g = 'tilt'; if (f === 'serious' && key !== 'kuro') f = 'neutral'; }
  else if (/！$/.test(t)) { f = C.excite || (f === 'serious' ? 'serious' : 'smile'); }
  if (/ありがとう|よかった|よろしく/.test(t)) f = C.excite || 'smile';
  return { f, g };
}

// ============================================================
//  役者：立ち位置・向き・視線・身振り・歩き・登場
// ============================================================
class Actor {
  constructor(view, key, m, o = {}) {
    Object.assign(this, { v: view, key, m, foe: !!o.foe, comm: !!o.comm, base: key.replace(/#\d+$/, '') });
    const C = CHAR_ACT[this.base] || {};
    this.stance = o.stance || C.stance || 'idle';
    this.pos = V3(); this.yaw = 0; this.baseYaw = 0; this.faceT = o.face ?? null; this.look = null;
    this.cur = { ...POSES.idle, ...(POSES[this.stance] || {}) }; this.head = { x: 0, y: 0 };
    this.gest = null; this.gi = 0; this.gt = 0; this.hopT = 1; this.hopH = 0; this.path = null; this.phase = 0; this.speed = 0;
    this.seed = Math.random() * 10; this.alpha = 1; this.lift = o.y || 0; this.dead = 0;
    this.headH = this.foe ? m.height * 0.6 : m.height * 0.88;
    if (!this.foe && m.face) m.face.set(C.face || defaultFace(this.base));
  }
  // ワールド座標の頭の位置
  headPos() { return V3(this.pos.x, this.pos.y + this.lift + this.headH, this.pos.z); }
  place(p) { this.pos.copy(p); this.pos.y = this.v.gy(p.x, p.z); }
  setFace(f) { if (f && this.m.face) this.m.face.set(f); }
  talk(on) { if (this.m.face) this.m.face.talking = on; }
  gesture(name) {
    const G = name && GESTURES[name]; if (!G) return;
    this.gest = G; this.gi = 0; this.gt = 0; this.applyKey();
  }
  applyKey() { const k = this.gest && this.gest[this.gi]; if (k && k[2] && k[2].hop) { this.hopT = 0; this.hopH = k[2].hop; } }
  setStance(s) { if (s) this.stance = s; }
  walkTo(pts, speed = 1.6) { this.path = pts.map(p => p.clone()); this.speed = speed; }
  // 向き先（役者・ワールド座標・角度）の方位
  targetYaw(t) {
    if (t == null) return this.baseYaw;
    if (typeof t === 'number') return t;
    const p = t instanceof THREE.Vector3 ? t : this.v.actors[t] ? this.v.actors[t].pos : null;
    if (!p) return this.baseYaw;
    return Math.atan2(p.x - this.pos.x, p.z - this.pos.z);
  }
  lookPoint() {
    const t = this.look;
    if (!t) return null;
    if (t instanceof THREE.Vector3) return t;
    const a = this.v.actors[t]; return a && a.visible() ? a.headPos() : null;
  }
  visible() { return this.m.group.visible && this.alpha > 0.05; }
  update(dt, t) {
    const m = this.m, P = m.pose;
    // 歩く
    let moving = 0;
    if (this.path && this.path.length) {
      const tg = this.path[0], dx = tg.x - this.pos.x, dz = tg.z - this.pos.z, d = Math.hypot(dx, dz);
      const step = Math.min(d, this.speed * dt);
      if (d > 0.02) { this.pos.x += dx / d * step; this.pos.z += dz / d * step; this.yaw = lerpAngle(this.yaw, Math.atan2(dx, dz), 1 - Math.exp(-12 * dt)); moving = this.speed; }
      if (d < 0.05) this.path.shift();
      this.pos.y = this.v.gy(this.pos.x, this.pos.z);
      if (!this.path.length) this.path = null;
    }
    // 向き：向き先へ体を回し、見ている相手へ少しだけ体をひねる
    if (!moving) {
      let yaw = this.targetYaw(this.faceT);
      const lp = this.lookPoint();
      if (lp) { const dy = ((Math.atan2(lp.x - this.pos.x, lp.z - this.pos.z) - yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI; yaw += clamp(dy * 0.35, -0.5, 0.5); }
      this.yaw = lerpAngle(this.yaw, yaw, 1 - Math.exp(-5 * dt));
    }
    if (this.foe) { this.updateFoe(dt, t); return; }
    // 姿勢：立ち方 + 身振り（なめらかに移る）
    const tgt = { ...POSES.idle, ...(POSES[this.stance] || {}) };
    if (this.gest) {
      const k = this.gest[this.gi];
      Object.assign(tgt, typeof k[0] === 'string' ? POSES[k[0]] : k[0]);
      if ((this.gt += dt) >= k[1]) { this.gt = 0; this.gi++; if (this.gi >= this.gest.length) this.gest = null; else this.applyKey(); }
    }
    const r = 1 - Math.exp(-9 * dt);
    for (const k of POSE_KEYS) this.cur[k] = lerp(this.cur[k] || 0, tgt[k] || 0, r);
    for (const k of POSE_KEYS) P[k] = this.cur[k];
    // 歩きのポーズ
    if (moving) {
      this.phase += dt * (4 + this.speed * 1.35);
      const s = Math.sin(this.phase), a = Math.min(1, this.speed / 3);
      P.legLx = s * 0.7 * a; P.legRx = -s * 0.7 * a; P.kneeL = Math.max(0, -s) * 1.0 * a + 0.05; P.kneeR = Math.max(0, s) * 1.0 * a + 0.05;
      P.armLx = -s * 0.55 * a; P.armRx = s * 0.55 * a - 0.1; P.hipsY = -Math.abs(Math.cos(this.phase)) * 0.04 * a; P.lean = 0.08 * a + (this.speed > 4 ? 0.3 : 0);
      if (this.speed > 4) Object.assign(P, { armRx: 0.9, armRz: -0.4, elbowR: -0.2, armLx: -0.9, armLz: 0.3, elbowL: -1.0 });
    }
    // 視線：頭を見ている相手へ（体の向きとの差ぶん）
    const lp = this.lookPoint();
    let hy = 0, hx = 0;
    if (lp) {
      const h = this.headPos(), dy = ((Math.atan2(lp.x - h.x, lp.z - h.z) - this.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
      hy = clamp(dy, -1.0, 1.0) * 0.85; hx = clamp(-Math.atan2(lp.y - h.y, Math.hypot(lp.x - h.x, lp.z - h.z)), -0.5, 0.5) * 0.8;
    }
    this.head.x = lerp(this.head.x, hx, 1 - Math.exp(-6 * dt)); this.head.y = lerp(this.head.y, hy, 1 - Math.exp(-6 * dt));
    P.headY += this.head.y; P.headX += this.head.x;
    // 息づかい・重心の揺れ
    P.twist += Math.sin(t * 0.6 + this.seed) * 0.025; P.hipsY += Math.sin(t * 0.9 + this.seed) * 0.004;
    // 跳ねる
    let hop = 0;
    if (this.hopT < 1) { this.hopT = Math.min(1, this.hopT + dt / 0.42); hop = Math.sin(this.hopT * Math.PI) * this.hopH; }
    m.group.position.set(this.pos.x, this.pos.y + this.lift + hop, this.pos.z);
    m.group.rotation.y = this.yaw;
    m.update(dt, t);
    if (this.holo) this.updateHolo(dt, t);
  }
  // 敵：こちらを向いて身構える。roar で吠え、defeat で光の粒になって消える
  updateFoe(dt, t) {
    const m = this.m;
    if (this.roarT != null) { this.roarT += dt; const k = Math.max(0, 1 - this.roarT / 0.6); m.group.scale.setScalar(this.scale0 * (1 + Math.sin(this.roarT * 18) * 0.05 * k)); if (this.roarT > 0.6) this.roarT = null; }
    if (this.dead > 0) {
      this.dead = Math.min(1, this.dead + dt / 1.8);
      m.group.scale.setScalar(this.scale0 * (1 - Ease.in(this.dead) * 0.9));
      if (Math.random() < 0.9) this.v.p.emit(this.headPos().add(V3((Math.random() - 0.5) * 1.5, (Math.random() - 0.5) * 2, (Math.random() - 0.5) * 1.5)), V3(0, 1.5 + Math.random() * 2, 0), hdr(m.color || '#ff4d6d', 2.4), { life: 1.2, size: 0.12 });
      if (this.dead >= 1) m.group.visible = false;
    }
    m.group.position.set(this.pos.x, this.pos.y + this.lift, this.pos.z);
    m.group.rotation.y = this.yaw;
    m.update(dt, t);
    if (m.emit) m.emit(this.v.p, m.group.position);
  }
  roar() { this.roarT = 0; this.m.flash(this.m.color || '#ff4d6d', 0.9); }
  // 通信の相手はホログラムで映す
  makeHolo() {
    const mat = new THREE.MeshBasicMaterial({ color: hdr('#7fd8ff', 0.75), transparent: true, opacity: 0.3, blending: THREE.AdditiveBlending, depthWrite: false });
    this.m.group.traverse(o => { if (!o.isMesh) return; if (o.userData.outline || o.userData.face) o.visible = false; else o.material = mat; o.castShadow = false; });
    this.holoMat = mat; this.holo = true; this.alpha = 0; this.want = 0;
    const base = new THREE.Group(); this.v.scene.add(base); this.holoBase = base;
    const disc = new THREE.Mesh(new THREE.CircleGeometry(0.45, 32), new THREE.MeshBasicMaterial({ color: hdr('#7fd8ff', 1.4), transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    disc.rotation.x = -Math.PI / 2; base.add(disc);
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.45, 2.1, 24, 1, true), new THREE.MeshBasicMaterial({ color: hdr('#7fd8ff', 0.8), transparent: true, opacity: 0.12, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    cone.position.y = 1.05; base.add(cone);
    this.holoParts = [disc, cone];
  }
  updateHolo(dt, t) {
    this.alpha = lerp(this.alpha, this.want, 1 - Math.exp(-6 * dt));
    const flick = 0.85 + Math.sin(t * 40) * 0.05 + (Math.random() < 0.03 ? -0.3 : 0);
    this.holoMat.opacity = 0.3 * this.alpha * flick;
    this.m.group.visible = this.alpha > 0.02;
    this.holoBase.position.set(this.pos.x, this.pos.y + this.lift - 0.05, this.pos.z);
    this.holoParts[0].material.opacity = 0.5 * this.alpha; this.holoParts[1].material.opacity = 0.12 * this.alpha;
    this.holoBase.visible = this.alpha > 0.02;
  }
  // 手に小物を持たせる（左手）。null で消す
  hold(item) {
    if (this.item) { this.item.removeFromParent(); this.item = null; }
    if (!item || !this.m.armL) return;
    const g = new THREE.Group();
    if (item === 'fish') {   // 焼き魚
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), toon('#c8a070')); f.scale.set(0.6, 2.2, 0.9); g.add(f);
      const t = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.07, 3), toon('#a8804a')); t.position.y = 0.16; t.scale.z = 0.3; g.add(t);
    } else if (item === 'fruit' || item === 'fruitGray') {   // 笑いの実
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.09, 14, 10), item === 'fruit' ? glowMat('#ffd24a', 2.2) : toon('#9a9488')); g.add(f);
      const lf = new THREE.Mesh(new THREE.SphereGeometry(0.04, 8, 6), toon('#5ab04a')); lf.scale.set(1.4, 0.4, 0.8); lf.position.set(0.04, 0.09, 0); g.add(lf);
      if (item === 'fruit') { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ffd24a', 0.9), blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(0.5); g.add(sp); }
    } else if (item === 'jarashi') {   // 猫じゃらし
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 5), toon('#8ab85a')); st.position.y = 0.18; g.add(st);
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 3, 8), toon('#e8d890')); ear.position.set(0.03, 0.42, 0); ear.rotation.z = -0.5; g.add(ear);
    } else if (item === 'book') {   // 古い記録
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.04), toon('#8a5a3a')); g.add(b);
    } else if (item === 'flower') {
      for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon('#ffffff')); f.position.set((i - 1) * 0.04, 0.18, 0); g.add(f); }
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 5), toon('#5ab04a')); st.position.y = 0.09; g.add(st);
    } else if (item === 'star') {   // 星のかけら
      const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), glowMat('#fff0a8', 2.6)); g.add(s2);
    }
    g.position.y = -0.03;
    this.m.armL.grip.add(g); this.item = g;
  }
  showWeapon(on) { if (this.m.armR && this.m.armR.grip) this.m.armR.grip.visible = on; }
}

// ============================================================
//  会話シーンの舞台
// ============================================================
class StageView extends BaseView {
  constructor(scene, id) {
    const st = SCENE_STAGES[id], Z = FIELD_ZONES[st.zone], bg = st.bg || Z.bg || CHAPTERS[Z.ci].bg;
    super(bg, 36, { field: true, bare: true, zone: Z });
    this.st = st; this.sc = scene; this.id = id; this.bg = bg;
    this.bloomStrength = { cave: 0.7, root: 0.7, end: 0.7, night: 0.8, tower: 0.6 }[bg] || 0.45; this.exposure = st.exposure || { meadow: 0.95, road: 0.95, dream: 0.9 }[bg] || 1;
    this.hooks = Object.assign({}, STAGE_FX);
    // 舞台の座標系：原点 O、前 F（一行が向いている方向）、右 R
    const [ox, oz] = zonePoint(Z, st.at), th = st.face * Math.PI / 180;
    this.F = V3(Math.sin(th), 0, -Math.cos(th)); this.R = V3(Math.cos(th), 0, Math.sin(th));
    this.O = V3(ox, 0, oz);
    const reserved = [{ x: ox, z: oz, r: 6 }];
    buildZoneSet(this, st.zone, { flags: st.flags, reserved });
    this.O.y = this.gy(ox, oz);
    this.timers = []; this.lineIdx = 0; this.last = null; this.addr = null;
    this.buildCast();
    this.shot('wide', { drift: 0.5, dur: 7 });
    this.snapCam();
  }
  // 舞台の座標（右 lx, 前 lz, 高さ y）→ ワールド
  W(lx, lz, y = 0) { return V3(this.O.x + this.R.x * lx + this.F.x * lz, this.O.y + y, this.O.z + this.R.z * lx + this.F.z * lz); }
  WP(p) { return p.length === 3 ? this.W(p[0], p[2], p[1]) : this.W(p[0], p[1]); }
  point(name) {
    if (name instanceof THREE.Vector3) return name;
    if (this.actors[name]) return this.actors[name].headPos();
    const p = (this.st.points || {})[name]; return p ? this.WP(p) : null;
  }
  // ---------- 配役 ----------
  // 舞台の cast がなければ、仲間は一行の隊列、ほかの人物は向かい、敵はさらに奥へ自動で並べる
  autoCast() {
    const st = this.st, lines = [];
    const walk = ls => ls.forEach(l => { if (Array.isArray(l)) lines.push(l); else if (l.c) l.c.forEach(([t, rs]) => { lines.push([HERO, t]); walk(rs); }); });
    walk(this.sc.lines);
    const speakers = [...new Set(lines.map(l => l[0]).filter(k => k !== 'n'))];
    const comm = k => lines.filter(l => l[0] === k).every(l => String(l[1]).includes('（遠くから）') || String(l[1]).includes('（声）'));
    const party = st.party || partyAt(this.id);
    const cast = {};
    const slots = [[0, 0], [-1.15, 0.3], [1.15, 0.35], [-2.2, -0.35], [2.3, -0.4]];
    party.forEach((k, i) => { cast[k] = { at: slots[i] || [i * 1.1 - 2, -1] }; });
    const others = [...new Set([...speakers, ...(st.extra || []), ...(this.sc.cast || [])])].filter(k => !party.includes(k) && !k.startsWith('e:') && !comm(k));
    others.forEach((k, i) => { cast[k] = { at: [(i - (others.length - 1) / 2) * 1.3, 2.6 + (others.length > 3 ? (i % 2) * 0.8 : 0)], face: HERO }; });
    const foes = [...new Set([...speakers, ...(this.sc.cast || [])])].filter(k => k.startsWith('e:'));
    foes.forEach((k, i) => { const d = ENEMIES[k.slice(2)]; cast[k] = { at: [(i - (foes.length - 1) / 2) * 3, d.boss ? 8 : 6] }; });
    for (const [k, o] of Object.entries(st.cast || {})) cast[k] = o === null ? undefined : { ...(cast[k] || {}), ...o };
    for (const k of Object.keys(cast)) if (!cast[k]) delete cast[k];
    return cast;
  }
  buildCast() {
    this.actors = {}; this.party = [];
    const st = this.st, lines = [];
    const walk = ls => ls.forEach(l => { if (Array.isArray(l)) lines.push(l); else if (l.c) l.c.forEach(([t, rs]) => { lines.push([HERO, t]); walk(rs); }); });
    walk(this.sc.lines);
    const speakers = new Set(lines.map(l => l[0]).filter(k => k !== 'n'));
    const comm = k => lines.filter(l => l[0] === k).every(l => String(l[1]).includes('（遠くから）') || String(l[1]).includes('（声）'));
    const face = f => f == null ? null : typeof f === 'number' ? f : Array.isArray(f) ? this.W(f[0], f[1]) : f;
    for (const [key, spec] of Object.entries(this.autoCast())) {
      const list = Array.isArray(spec) ? spec : [spec];
      list.forEach((o, i) => {
        const foe = key.startsWith('e:'), id = i ? `${key}#${i}` : key;
        const m = foe ? buildEnemy(key.slice(2)) : buildCharacter(key);
        this.scene.add(m.group);
        const a = new Actor(this, id, m, { foe, stance: o.stance, y: o.y });
        a.place(this.W(o.at[0], o.at[1]));
        a.faceT = face(o.face) ?? (foe ? this.O.clone() : this.W(0, 3));
        a.yaw = a.baseYaw = a.targetYaw(a.faceT);
        if (foe) { a.scale0 = m.group.scale.x; m.color = ENEMIES[key.slice(2)].color; }
        if (o.hidden) { m.group.visible = false; a.alpha = 0; }
        // 会話のあいだ、仲間は武器をしまっておく（シロの杖だけは持ったまま）
        if (o.weapon === false || (!foe && o.weapon !== true && key !== 'shiro')) a.showWeapon(false);
        if (o.item) a.hold(o.item);
        if (o.f && m.face) m.face.set(o.f);
        this.actors[id] = a;
        if (!foe) this.party.push(a);
      });
    }
    // 遠くから聞こえる声（姿は見えない）
    for (const k of speakers) {
      if (this.actors[k] || k.startsWith('e:') || !comm(k)) continue;
      const m = buildCharacter(k); this.scene.add(m.group);
      const a = new Actor(this, k, m, { comm: true });
      const c = st.comm || [-1.8, 1.2];
      a.place(this.W(c[0], c[1])); a.lift = 0.12;
      a.faceT = this.W(0, 0); a.yaw = a.baseYaw = a.targetYaw(a.faceT);
      a.makeHolo();
      this.actors[k] = a;
    }
    this.host = st.host || this.party.find(a => a.key !== HERO && !CHARS[a.key])?.key || null;
  }
  // ---------- カメラ ----------
  snapCam() { const c = this.cam; this.camera.position.copy(c.p0); this.lookNow = c.l0.clone(); this.camera.lookAt(this.lookNow); }
  cut(pos, look, { drift = 0.3, dur = 5, snap = true } = {}) {
    pos = this.unblock(look, pos);
    const dir = V3().subVectors(look, pos).setY(0).normalize(), side = V3(dir.z, 0, -dir.x);
    const s = (this.lineIdx % 2 ? 1 : -1) * drift;
    const p1 = pos.clone().addScaledVector(side, s).addScaledVector(dir, drift * 0.4);
    this.cam = { p0: pos, p1: this.unblock(look, p1), l0: look, l1: look.clone(), t: 0, dur };
    if (snap) this.snapCam();
  }
  // 壁・天井に入らないよう、見る点の側へ寄せる
  unblock(look, pos) {
    if (!this.T) return pos;
    const n = 24; let last = look.clone();
    for (let i = 1; i <= n; i++) {
      const p = V3().lerpVectors(look, pos, i / n);
      if (this.T.blocksView(p.x, p.y, p.z)) return i > 3 ? last : V3().lerpVectors(look, pos, 0.15);
      last = p;
    }
    return pos;
  }
  shot(kind, o = {}) {
    const st = this.st;
    let pos, look;
    if (typeof kind === 'object') { pos = this.WP(kind.pos); look = this.WP(kind.look); }
    else if (st.shots && st.shots[kind]) { pos = this.WP(st.shots[kind].pos); look = this.WP(st.shots[kind].look); }
    else if (kind === 'wide') { const w = st.wide || { pos: [-2.6, 1.8, -3.6], look: [0, 0.75, 1.8] }; pos = this.WP(w.pos); look = this.WP(w.look); }
    else if (kind.startsWith('look:')) {   // 一行の後ろから、ある点を見上げる
      // 一行のいちばん後ろの子より、さらに後ろから
      const tgt = kind.slice(5), p = this.point(tgt), vis = this.party.filter(a => a.visible() && a.key !== tgt);
      const c = vis.length ? vis.reduce((v, a) => v.add(a.pos), V3()).multiplyScalar(1 / vis.length) : this.O.clone();
      const back = vis.length ? Math.min(...vis.map(a => V3().subVectors(a.pos, this.O).dot(this.F))) : 0;
      c.addScaledVector(this.F, back - V3().subVectors(c, this.O).dot(this.F));
      pos = c.addScaledVector(this.F, -3.4).addScaledVector(this.R, 1.2); pos.y = this.O.y + 1.0; look = p.clone();
      // 見上げすぎると一行が画面の下（会話ウィンドウの裏）に隠れるので、仰角を抑える
      look.y = Math.min(p.y, pos.y + Math.hypot(p.x - pos.x, p.z - pos.z) * 0.06);
    } else if (kind.startsWith('foe:')) {
      const a = this.actors[kind.slice(4)], vis = this.party.filter(x => x.visible()), c = this.centroid();
      const back = vis.length ? Math.min(...vis.map(x => V3().subVectors(x.pos, this.O).dot(this.F))) : 0;
      c.addScaledVector(this.F, back - V3().subVectors(c, this.O).dot(this.F));
      pos = c.clone().addScaledVector(this.F, -2.4).addScaledVector(this.R, (this.lineIdx % 2 ? 1.3 : -1.3)); pos.y = this.O.y + 1.25;
      look = a.pos.clone(); look.y += a.headH * 0.9;
      const away = V3().subVectors(pos, look), need = Math.max(2.6, a.m.height * 2.2);
      if (away.length() < need) pos = look.clone().addScaledVector(away.normalize(), need);
    } else if (kind.startsWith('ots:')) {   // 肩越し：ots:聞き手>話し手
      const [l, s] = kind.slice(4).split('>'); return this.ots(this.actors[l], this.actors[s], o);
    } else if (this.actors[kind]) return this.single(this.actors[kind], o);
    else { const w = st.wide || { pos: [-2.6, 1.8, -3.6], look: [0, 0.75, 1.8] }; pos = this.WP(w.pos); look = this.WP(w.look); }
    this.cut(pos, look, o);
  }
  centroid() {
    const vis = this.party.filter(a => a.visible()); if (!vis.length) return this.O.clone();
    const c = V3(); vis.forEach(a => c.add(a.pos)); return c.multiplyScalar(1 / vis.length);
  }
  // カメラと見る点のあいだに、ほかの人物が入っていないか
  // （歩いている人物は行き先で判定する。画面の中ほどに、見る点より手前で大きく映るなら邪魔）
  occluded(pos, look, skip) {
    const d = V3().subVectors(look, pos), far = d.length(); d.normalize();
    for (const a of Object.values(this.actors)) {
      if (skip.includes(a) || a.comm || (!a.visible() && !a.path)) continue;
      const sc = a.m.group.scale.y || 1, spots = [a.pos, ...(a.path ? [a.path[a.path.length - 1]] : [])];
      for (const sp of spots) for (const hk of [0.5, 1]) {
        const c = sp.clone(); c.y = a.pos.y + a.headH * hk;
        const v = V3().subVectors(c, pos), dist = v.length();
        // カメラが人物に埋まっている
        if (dist < 0.8 * sc) return true;
        if (dist > far - 0.2) continue;
        const ang = Math.acos(clamp(v.dot(d) / (dist || 1), -1, 1)), size = Math.atan(0.5 * sc / Math.max(0.1, dist));
        if (ang - size < 0.2) return true;
      }
    }
    return false;
  }
  // 話し手の寄り：顔の正面寄りから、聞き手のいる側に少しずらす
  single(a, o = {}) {
    const h = a.headPos(), dir = V3(Math.sin(a.yaw), 0, Math.cos(a.yaw)), left = V3(Math.cos(a.yaw), 0, -Math.sin(a.yaw));
    const to = o.to ? this.point(o.to) : null;
    const s0 = to ? Math.sign(V3().subVectors(to, a.pos).dot(left)) || 1 : (this.lineIdx % 2 ? 1 : -1);
    const sc = a.m.group.scale.y || 1, dist0 = (a.comm ? 2.8 : o.close ? 2.1 : 2.6) * Math.max(1, sc);
    // ang：顔の正面から横へ回りこむ角度（聞き手のいる側が正）
    const make = (ang, dist) => {
      const s = Math.sign(ang) || s0, yaw = a.yaw + ang * s0;
      const pos = h.clone().addScaledVector(V3(Math.sin(yaw), 0, Math.cos(yaw)), dist); pos.y += 0.06;
      // 下の会話ウィンドウに顔がかからないよう、注視点を頭より少し下にする
      const look = h.clone().addScaledVector(left, -0.16 * s * s0 * sc); look.y -= a.comm ? 0.4 : (o.close ? 0.16 : 0.22) * sc;
      return [pos, look];
    };
    // 手前に誰かが立っていたら、反対側から・回りこんで・もう少し寄って撮る
    let pick = null;
    for (const dist of [dist0, dist0 * 0.72]) {
      for (const ang of [0.23, -0.23, 0.6, -0.6, 1.0, -1.0]) { const c = make(ang, dist); if (!this.occluded(c[0], c[1], [a])) { pick = c; break; } }
      if (pick) break;
    }
    const [pos, look] = pick || make(-0.5, 1.5 * sc);
    this.cut(pos, look, o);
  }
  // 肩越し：聞き手 L の肩の後ろから話し手 S を見る
  ots(L, S, o = {}) {
    if (!L || !S) { if (S) this.single(S, o); return; }
    const lh = L.headPos(), sh = S.headPos(), d = V3().subVectors(sh, lh).setY(0).normalize(), p = V3(d.z, 0, -d.x);
    // 聞き手の頭が画面の端に来るまで、横へずらす
    const make = s => {
      let pos, look;
      for (const side of [0.9, 1.15, 1.4]) {
        pos = lh.clone().addScaledVector(d, -1.6).addScaledVector(p, side * s); pos.y += 0.22;
        look = sh.clone().addScaledVector(p, -0.12 * s); look.y -= 0.2;
        const a = V3().subVectors(look, pos).normalize(), b = V3().subVectors(lh, pos), dist = b.length();
        if (Math.acos(clamp(a.dot(b) / dist, -1, 1)) - Math.atan(0.34 / dist) > 0.1) break;
      }
      return [pos, look];
    };
    let s = this.lineIdx % 2 ? 1 : -1, c = make(s);
    if (this.occluded(c[0], c[1], [L, S])) { const c2 = make(-s); if (!this.occluded(c2[0], c2[1], [L, S])) c = c2; else { this.single(S, o); return; } }
    this.cut(c[0], c[1], o);
  }
  // ---------- 台本の1行 ----------
  line(sp, text, dir = {}) {
    this.lineIdx++;
    const A = this.actors[sp];
    const d = A && !A.foe ? { ...inferAct(A.base, text), ...dir } : { ...dir };
    this.stopTalk();
    this.apply(d);
    if (A) {
      if (A.comm) this.commOn = sp;
      if (!A.foe) {
        A.setFace(d.f); A.gesture(d.g); A.talk(true);
        // 誰に話しているか：指定がなければ直前の話し手、アステルなら相手役
        const to = d.to || (this.last && this.last !== sp && this.actors[this.last] ? this.last : sp === HERO ? (this.host || this.party.find(a => a.key !== HERO)?.key) : HERO);
        this.addr = to;
        if (!(d.look && (d.look[sp] || d.look.all))) A.look = to && this.actors[to] ? to : null;
        // 話しかける相手の方へ体を向ける（向きの指定がある行は除く）
        if (to && this.actors[to] && !this.actors[to].comm && !(d.face && (d.face[sp] || d.face.all))) A.faceT = to;
      } else { this.actors[sp].roar(); Object.values(this.actors).filter(a => a.foe && a.base === sp).forEach(a => a !== A && a.roar()); }
      // 聞き手は話し手を見る
      for (const a of this.party) if (a !== A && !(d.look && (d.look[a.key] || d.look.all))) a.look = sp;
      if (A.comm) for (const a of this.party) if (!(d.look && d.look[a.key])) a.look = sp;
    }
    // 通信が終わったらホログラムを消す
    if (this.commOn && this.commOn !== sp && !(A && A.comm)) { const c = this.actors[this.commOn]; if (c && this.sinceComm++ > 0) { c.want = 0; this.commOn = null; } }
    if (A && A.comm) this.sinceComm = 0;
    this.camFor(sp, A, d);
    this.last = sp;
  }
  lineDone() { this.stopTalk(); }
  stopTalk() { for (const a of Object.values(this.actors)) if (!a.foe) a.talk(false); }
  // カメラの選び方
  camFor(sp, A, d) {
    if (d.cam) { this.shot(d.cam, { to: this.addr, drift: d.drift ?? 0.3, dur: d.dur || 5, close: d.close }); this.lastShot = d.cam; return; }
    if (!A) { this.shot('wide', { drift: 0.5, dur: 7 }); this.lastShot = 'wide'; return; }
    // 登場しながら話す行は、歩いてくるところが映るよう引きの画にする
    if (d.enter) { this.shot('wide', { drift: 0.3, dur: 6 }); this.lastShot = 'wide'; return; }
    if (A.foe) { this.shot('foe:' + A.key, { drift: 0.2, dur: 4 }); this.lastShot = 'foe'; return; }
    // 通信（ホログラム）は、アステルの肩越しに映す
    if (A.comm) { const L2 = this.party.find(a => a.visible()); if (this.lastShot !== 'sp:' + sp) { if (L2) this.single(L2, { dur: 6, drift: 0.15 }); else this.shot('wide', { dur: 6 }); } else { this.cam.p0 = this.camera.position.clone(); this.cam.l0 = this.lookNow.clone(); this.cam.t = 0; } this.lastShot = 'sp:' + sp; return; }
    const L = this.actors[this.addr];
    // 同じ話し手が続くときは切らずにゆっくり寄せる
    if (this.lastShot === 'sp:' + sp) { this.cam.p0 = this.camera.position.clone(); this.cam.l0 = this.lookNow.clone(); this.cam.t = 0; return; }
    // 肩越しは、話し手が聞き手の方を向いているときだけ（背中を映さない）
    const facing = L ? Math.cos(A.targetYaw(A.faceT) - Math.atan2(L.pos.x - A.pos.x, L.pos.z - A.pos.z)) : 0;
    if (L && !L.comm && !A.comm && L.visible() && facing > 0.5 && this.lineIdx % 3 !== 0) this.ots(L, A, { dur: 5 });
    else this.single(A, { to: this.addr, dur: 5 });
    this.lastShot = 'sp:' + sp;
  }
  choice() {
    const a = this.actors[HERO]; if (!a) return;
    a.setFace('neutral'); a.gesture('think');
    const L = this.actors[this.last] && !this.actors[this.last].foe && !this.actors[this.last].comm ? this.actors[this.last] : null;
    if (L) this.ots(L, a, { dur: 6, drift: 0.15 }); else this.single(a, { close: true, dur: 6 });
    this.lastShot = 'choice';
  }
  give(k) {
    const a = this.actors[k]; if (!a) return;
    a.setFace('serious'); a.gesture('nod');
    a.m.group.visible = true; a.alpha = 1;
    for (const p of this.party) if (p !== a) { p.look = k; if (p.key === HERO) { p.setFace('joy'); p.gesture('cheer'); } }
    this.shot('wide', { drift: 0.4, dur: 6 }); this.lastShot = 'wide';
  }
  // ---------- 行の演出 ----------
  apply(d) {
    const each = (o, fn) => { if (!o) return; for (const [k, val] of Object.entries(o)) (k === 'all' ? this.party : k === 'foes' ? Object.values(this.actors).filter(a => a.foe) : [this.actors[k]]).forEach(a => a && fn(a, val)); };
    // 周りの反応 r: { キャラ: '表情' | [表情, 身振り] }
    each(d.r, (a, v) => { const [f, g] = Array.isArray(v) ? v : [v]; a.setFace(f); if (g) a.gesture(g); });
    each(d.look, (a, v) => { a.look = v === null ? null : this.point(v) && !this.actors[v] ? this.point(v) : v; });
    each(d.face, (a, v) => { a.faceT = typeof v === 'number' ? v : this.actors[v] ? v : Array.isArray(v) ? this.W(v[0], v[1]) : this.point(v); });
    each(d.stance, (a, v) => { a.setStance(v === 'ready' ? (CHAR_ACT[a.base] || {}).ready || 'ready' : v); if (v === 'ready' && !a.foe) a.showWeapon(true); });
    each(d.move, (a, v) => { const pts = (Array.isArray(v[0]) ? v : [v]).map(p => this.W(p[0], p[1])); a.walkTo(pts, d.speed || 1.6); });
    each(d.hold, (a, v) => a.hold(v));
    each(d.weapon, (a, v) => { a.showWeapon(v); if (v) { this.fx.sprite(a.m.handPos(), ELEMENTS[(CHARS[a.key] || NPCS[a.key] || {}).elem || 'physical'].color, 1.0, 0.5); Sfx.zap(); } });
    each(d.meow, a => Sfx.meow(a.base));
    each(d.lift, (a, v) => { const y0 = a.lift; GFX.tween(0.5, e => { a.lift = lerp(y0, v, e); }); });
    if (d.enter) [].concat(d.enter).forEach(k => this.enter(k, d.enterFx));
    if (d.exit) [].concat(d.exit).forEach(k => { const a = this.actors[k]; if (a) GFX.tween(0.5, e => { a.alpha = 1 - e; }).then(() => { a.m.group.visible = false; }); });
    if (d.defeat) [].concat(d.defeat).forEach(k => Object.values(this.actors).filter(a => a.base === k).forEach(a => { a.dead = 0.001; a.m.flash('#ffffff', 1.2); }));
    if (d.fx) [].concat(d.fx).forEach(f => { const [n, arg] = f.split(':'); const h = this.hooks[n]; if (h) h.call(this, arg); else if (n === 'glow') this.chestGlow(arg); });
    if (d.bgm) Music.play(d.bgm);
    if (d.roar) [].concat(d.roar).forEach(k => Object.values(this.actors).filter(a => a.base === k).forEach(a => a.roar()));
    if (d.shake) GFX.shake(d.shake);
    if (d.flash) GFX.flash(d.flash, 0.5, 0.6);
    if (d.sfx) [].concat(d.sfx).forEach(n => Sfx[n] && Sfx[n]());
    if (d.later) this.timers.push({ t: d.later[0], d: d.later[1] });
  }
  handOf(k) { const a = this.actors[k]; return a ? (a.item ? a.item.getWorldPosition(V3()) : a.m.handPos()) : this.point(k); }
  // 登場：敵は赤い閃光、それ以外は風を巻いて現れる
  enter(k, style) {
    const list = Object.values(this.actors).filter(a => a.key === k || a.base === k);
    list.forEach((a, i) => {
      a.m.group.visible = true; a.alpha = 1;
      const p = a.pos.clone(); p.y += 1 + a.lift;
      if (a.foe) { this.fx.pillar(a.pos, a.m.color || '#ff4d6d', { h: 4, r: 0.8, life: 0.6 }); this.p.burst(p, a.m.color || '#ff4d6d', 40, { speed: 4, life: 0.8 }); a.roar(); }
      else { const pp = a.pos.clone(); pp.y += 0.6 + a.lift; this.p.burst(pp, (CHARS[a.key] ? ELEMENTS[CHARS[a.key].elem].color : '#ffffff'), 40, { speed: 3, life: 0.9, up: 0.5 }); }
    });
    if (list.some(a => a.foe)) { Sfx.enemy(); GFX.flash('#ff3040', 0.35, 0.4); }
    else Sfx.swing();
  }
  // 胸の奥が熱を帯びる（星核と共鳴する光）
  chestGlow(k) {
    const a = this.actors[k]; if (!a) return;
    let t = 0; const col = this.glowCol || '#fff0a8';
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 1.2), blending: THREE.AdditiveBlending, depthWrite: false })); this.scene.add(sp);
    this.zoneTicks.push(dt => {
      if (t > 4) { sp.visible = false; return; }
      t += dt; const p = a.headPos(); p.y -= 0.3; p.addScaledVector(V3(Math.sin(a.yaw), 0, Math.cos(a.yaw)), 0.2);
      sp.position.copy(p); sp.scale.setScalar(0.5 + Math.sin(t * 6) * 0.12); sp.material.opacity = Math.min(1, t * 2, (4 - t) * 1.5);
      if (Math.random() < 0.5) this.p.emit(p, V3((Math.random() - 0.5) * 0.6, 0.6 + Math.random(), (Math.random() - 0.5) * 0.6), hdr(col, 2), { life: 0.8, size: 0.05 });
    });
  }
  // 区画の出入口（隔壁扉）を開ける
  openExit(key) {
    const ph = (this.exitsPhys || []).find(e => e.key === key); if (!ph) return;
    ph.locked = false; ph.want = 1;
    const line = THEMES[this.ch.bg].line;
    ph.g.traverse(o => { if (o.isMesh && o.material && o.material.isMeshBasicMaterial && !o.material.map) o.material.color.copy(hdr(line, 2.4)); });
    Sfx.door(); Sfx.slam();
  }
  // ---------- 毎フレーム ----------
  update(dt, t, rdt) {
    const d = Math.min(rdt, 0.05);
    this.env.update(d, t);
    for (const f of this.zoneTicks) f(d, t);
    for (const f of this.emitters) f(d);
    for (let i = 0; i < this.timers.length; i++) {
      const tm = this.timers[i];
      if ((tm.t -= d) > 0) continue;
      this.timers.splice(i--, 1); this.apply(tm.d);
      if (tm.d.cam) { this.shot(tm.d.cam, { dur: tm.d.dur || 4, drift: 0.3, close: tm.d.close }); this.lastShot = tm.d.cam; }
    }
    for (const a of Object.values(this.actors)) a.update(d, t);
    // 自動扉は近くに誰かいれば開く
    if (this.arch) for (const D of this.arch.doors) {
      const near = Object.values(this.actors).some(a => a.visible() && Math.abs(a.pos.x - D.x) < D.w / 2 + 3 && Math.abs(a.pos.z - D.z) < D.d / 2 + 3 && Math.abs(a.pos.y - D.h) < 2);
      D.open += ((near ? 1 : 0) - D.open) * (1 - Math.exp(-9 * d));
      D.apply(D.open);
    }
    for (const ph of this.exitsPhys || []) {
      ph.open += ((ph.want || 0) - ph.open) * (1 - Math.exp(-(ph.cabin ? 7 : 1.2) * d));
      ph.apply(ph.open);
      if (ph.lamps) ph.lamps.forEach(l => { l.visible = !ph.locked || Math.sin(t * 5) > 0; });
    }
    // カメラ
    const c = this.cam;
    c.t = Math.min(c.dur, c.t + d);
    const e = Ease.out(c.t / c.dur);
    this.camera.position.lerpVectors(c.p0, c.p1, e);
    this.lookNow.lerp(V3().lerpVectors(c.l0, c.l1, e), 1 - Math.exp(-10 * d));
    this.camera.lookAt(this.lookNow);
    const key = this.env.key;
    key.position.set(this.O.x + 6, this.O.y + 12, this.O.z + 8); key.target.position.copy(this.O);
    this.env.focus.copy(this.O);
    this.fx.update(d, this.camera);
    this.p.update(d);
  }
}
// ---------- 物語の出来事の演出（台本の fx: '名前:引数' で呼ぶ。this は StageView） ----------
const STAGE_FX = {
  // 流れ星が落ちる（夜の丘）
  meteor(arg) {
    const to = this.point(arg || 'crater') || this.W(0, 10), from = to.clone().add(V3(-40, 40, -30));
    const m = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#fff0c8', 5), blending: THREE.AdditiveBlending, depthWrite: false }));
    m.scale.setScalar(2.4);
    this.fx.add(m, 2.2, (k, o) => { const e = Ease.in(k); o.position.lerpVectors(from, to, e); for (let i = 0; i < 6; i++) this.p.emit(o.position, V3((Math.random() - 0.5), (Math.random() - 0.5), (Math.random() - 0.5)), hdr(Math.random() < 0.5 ? '#fff0c8' : '#8ad8ff', 3), { life: 1.2, size: 0.5 }); });
    GFX.delay(2.2).then(() => { GFX.flash('#ffffff', 0.9, 1.0); GFX.shake(0.5); Sfx.slam(); this.fx.ring(to, '#fff0c8', { r: 14, life: 1.2, width: 0.5 }); this.p.burst(to, '#fff0c8', 200, { speed: 12, up: 1, life: 1.6, size: 0.2 }); this.fx.pillar(to, '#fff0c8', { h: 30, r: 1.6, life: 1.4, k: 3 }); });
  },
  // 空から魚が降ってくる（シロの魔法の失敗）
  fishRain(arg) {
    const c = this.point(arg || HERO) || this.O.clone();
    for (let i = 0; i < 16; i++) GFX.delay(i * 0.08).then(() => {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(pick(['#8ab8d8', '#b8c8d8', '#ff9a7a']))); f.scale.set(0.5, 0.6, 2);
      const x = c.x + (Math.random() - 0.5) * 5, z = c.z + (Math.random() - 0.5) * 4; f.position.set(x, c.y + 6, z);
      const spin = Math.random() * 10;
      this.fx.add(f, 1.4, (k, o, dt) => { o.position.y = Math.max(this.O.y + 0.05, c.y + 6 - k * k * 14); o.rotation.x += spin * dt; if (o.position.y <= this.O.y + 0.06) o.rotation.set(0, spin, 0); });
    });
    Sfx.tone(600, 0.3, 'triangle', 0.05, -300);
  },
  // 魔法の閃光（シロ）
  spell(arg) {
    const a = this.actors[arg || 'shiro']; if (!a) return;
    const p = a.m.tipPos();
    this.fx.sprite(p, '#ffd23c', 2, 0.6, { k: 3 }); this.p.burst(p, '#ffd23c', 40, { speed: 4, life: 0.8 }); Sfx.zap();
  },
  // シロの毛が爆発する
  poof(arg) { const a = this.actors[arg || 'shiro']; if (!a) return; const h = a.headPos(); this.p.burst(h, '#ffffff', 60, { speed: 3, life: 0.8, size: 0.12 }); this.fx.sprite(h, '#ffffff', 1.4, 0.4); Sfx.noise(0.3, 0.2, 1200); a.m.headPivot.scale.setScalar(1.12); GFX.delay(2).then(() => a.m.headPivot.scale.setScalar(1)); },
  // 笑いがもどる（色とりどりの紙吹雪）
  laugh() { const c = this.O.clone().add(V3(0, 3, 0)); for (let i = 0; i < 6; i++) GFX.delay(i * 0.15).then(() => this.p.burst(c.clone().add(V3((Math.random() - 0.5) * 6, 0, (Math.random() - 0.5) * 6)), pick(['#ff6a8a', '#ffd27a', '#6ad8ff', '#8aff9a']), 50, { speed: 5, up: 1.2, life: 2, grav: 2, size: 0.1 })); Sfx.win(); },
  // きらきら（喜び・友情）
  sparkle(arg) { const a = this.actors[arg]; const c = a ? a.headPos() : this.O.clone().add(V3(0, 1, 0)); this.p.burst(c, '#fff0a8', 30, { speed: 2, up: 1, life: 1.2, size: 0.08 }); this.fx.sprite(c, '#fff0a8', 1.2, 0.5); Sfx.tone(1200, 0.2, 'sine', 0.05); Sfx.tone(1600, 0.25, 'sine', 0.04, 0, 0.08); },
  // 闇がせまる・晴れる
  darkness() { const U = GFX.grade.uniforms; GFX.tween(1.2, k => { U.tint.value.setRGB(1 - 0.45 * k, 1 - 0.5 * k, 1 - 0.3 * k); U.desat.value = 0.4 * k; }, Ease.out, true); Sfx.tone(60, 1.5, 'sawtooth', 0.08, 20); },
  dawn() { const U = GFX.grade.uniforms, r = U.tint.value.r, g = U.tint.value.g, b = U.tint.value.b, d0 = U.desat.value; GFX.tween(1.6, k => { U.tint.value.setRGB(lerp(r, 1, k), lerp(g, 1, k), lerp(b, 1, k)); U.desat.value = d0 * (1 - k); }, Ease.inOut, true); GFX.flash('#fff4d8', 0.5, 1.2); },
  // 影（コドク・過去の幻）がわき上がる
  shadow(arg) { const c = this.point(arg) || this.W(0, 6); for (let i = 0; i < 80; i++) this.p.emit(V3(c.x + (Math.random() - 0.5) * 4, this.O.y + Math.random() * 0.5, c.z + (Math.random() - 0.5) * 3), V3(0, 1 + Math.random() * 2, 0), hdr(Math.random() < 0.3 ? '#8a5aff' : '#2a1a4a', 2), { life: 1.8, size: 0.4, drag: 0.4 }); Sfx.tone(80, 1, 'sawtooth', 0.06, -30); },
  // 光が集まる（樹・仲間のつながり）
  light(arg) { const c = this.point(arg) || this.O.clone().add(V3(0, 1, 0)); this.fx.pillar(c, '#fff0a8', { h: 30, r: 1.4, life: 2, k: 2 }); this.fx.ring(c, '#fff0a8', { r: 10, life: 1.6, width: 0.3 }); this.p.burst(c, '#fff0a8', 160, { speed: 8, life: 2, size: 0.12 }); GFX.flash('#fff8e0', 0.6, 1); Sfx.win(); },
  // 世界中の猫の光（第八章）
  voices() { const cols = ['#ffe08a', '#ff9ab8', '#8ad8ff', '#b8ff8a']; for (let i = 0; i < 60; i++) GFX.delay(i * 0.03).then(() => this.p.emit(this.O.clone().add(V3((Math.random() - 0.5) * 20, 10 + Math.random() * 6, (Math.random() - 0.5) * 20)), V3(0, -3, 0), hdr(pick(cols), 2.6), { life: 3, size: 0.16, drag: 0.3 })); Sfx.tone(880, 0.4, 'sine', 0.05); Sfx.tone(1320, 0.5, 'sine', 0.04, 0, 0.15); },
  // 封印の扉が開く
  seal() { const c = this.point('door') || this.W(0, 8, 3); this.fx.ring(c, '#8affe0', { r: 5, life: 1.2, face: this.camera.position }); this.p.burst(c, '#8affe0', 120, { speed: 6, life: 1.4, size: 0.1 }); GFX.flash('#c8fff0', 0.6, 0.8); Sfx.door(); Sfx.slam(); this.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.geometry.parameters.radius > 2.5) o.visible = false; }); },
  // 樹がよみがえる
  revive() { Save.data.flags.treeRevived = true; Save.save(); STAGE_FX.light.call(this, 'sky'); STAGE_FX.laugh.call(this); },
  // 猫じゃらしにじゃれる
  lure(arg) { const a = this.actors[arg || 'maou']; if (!a) return; a.setFace('joy'); a.gesture('laugh'); Sfx.meow(a.base); },
  // 光を失う（笑いの実が灰色に）
  gray() { const U = GFX.grade.uniforms; GFX.tween(1.0, k => { U.desat.value = 0.55 * k; }, Ease.out, true); },
  color() { const U = GFX.grade.uniforms, d0 = U.desat.value; GFX.tween(1.4, k => { U.desat.value = d0 * (1 - k); }, Ease.inOut, true); },
};
// その場面で旅をしている仲間（台本の give の順に加わる）
function partyAt(sceneId) {
  const joined = [HERO];
  const gives = ls => { const out = []; const walk = l => l.forEach(x => { if (x && x.give) out.push(x.give); else if (x && x.c) x.c.forEach(([, rs]) => walk(rs)); }); walk(ls); return out; };
  for (const ch of STORY) for (const st of ch.steps) for (const id of [st.id, st.scene, st.after].filter(Boolean)) {
    if (id === sceneId) return joined.slice();
    const sc = SCENES[id]; if (sc) for (const k of gives(sc.lines)) if (!joined.includes(k)) joined.push(k);
    if (sc && sc.leave) sc.leave.forEach(k => { const i = joined.indexOf(k); if (i >= 0) joined.splice(i, 1); });
  }
  return joined.slice();
}

// 探索フィールドの部品（床の高さ・当たり判定・出入口）を借りる
for (const k of ['gy', 'hitsCol', 'blocked', 'freeSpot', 'safeAt', 'buildMapExits', 'makeBulkhead', 'makeCabin', 'makeGate', 'exitTop']) StageView.prototype[k] = FieldView.prototype[k];

function resolveBattleSet(loc) {
  const s = typeof loc === 'string' ? BATTLE_SETS[loc] : loc;
  return s && FIELD_ZONES[s.zone] ? s : null;
}
// 戦場の空と光：区画の bg（なければ章の bg）
function battleTheme(loc, fallback) {
  const s = loc && resolveBattleSet(loc); if (!s) return fallback;
  const Z = FIELD_ZONES[s.zone]; return Z.bg || CHAPTERS[Z.ci].bg;
}
// 区画を組み立てて、戦場の中心が原点・敵の方向が -Z になるよう回して置く
function buildBattleSet(view, loc) {
  const Z = FIELD_ZONES[loc.zone], [cx, cz] = loc.world ? loc.at : zonePoint(Z, loc.at);
  const root = new THREE.Group(); view.scene.add(root);
  const lp = new Particles(root, 1500);
  // 組み立て用の代理：部品は root に、区画の粒子は root の座標で出す
  const pv = Object.create(view);
  Object.assign(pv, { scene: root, p: lp });
  const flags = typeof loc.flags === 'function' ? loc.flags() : loc.flags;
  buildZoneSet(pv, loc.zone, { flags, reserved: [{ x: cx, z: cz, r: 9 }], light: view });
  const h = pv.T ? pv.T.groundAt(cx, cz) : 0, a = loc.face * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  root.rotation.y = a;
  root.position.set(-(cx * c + cz * s), -h, -(-cx * s + cz * c));
  // 戦場の近くの自動扉は閉じたまま、区画の出入口は封鎖の表示のまま
  view.set = { root, pv, lp, hooks: pv.hooks || {}, update(dt, t) { for (const f of pv.zoneTicks) f(dt, t); for (const f of pv.emitters) f(dt); lp.update(dt); } };
  return view.set;
}
for (const k of ['gy', 'hitsCol', 'blocked', 'freeSpot', 'safeAt', 'buildMapExits', 'makeBulkhead', 'makeCabin', 'makeGate', 'exitTop']) if (!BattleView.prototype[k]) BattleView.prototype[k] = FieldView.prototype[k];
