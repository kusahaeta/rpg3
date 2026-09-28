'use strict';
// ============================================================
//  会話シーンの演出：物語の場所に立ち、キャラクターが演技をする
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
// キャラクターごとの普段の立ち方と表情、戦うときの構え
const CHAR_ACT = {
  aster:  { stance: 'idle', face: 'neutral', ready: 'ready', talk: ['talk', 'explain', 'tilt'] },
  mizore: { stance: 'idle', face: 'smile', excite: 'joy', ready: 'mzGuard', talk: ['talk2', 'explain', 'fist'] },
  yue:    { stance: 'polite', face: 'gentle', ready: 'guardStaff', talk: ['explain', 'talk', 'handChest'] },
  kazane: { stance: 'armsCrossed', face: 'serious', ready: 'ready', talk: ['tilt', null, 'nod'] },
  iris:   { stance: 'polite', face: 'worry', talk: ['explain', 'handChest', 'think'] },
  polka:  { stance: 'polite', face: 'smile', excite: 'joy', talk: ['explain', 'bow', 'wave'] },
  roa:    { stance: 'idle', face: 'serious', ready: 'ready', talk: ['explain', 'talk', 'nod'] },
  laika:  { stance: 'hipHand', face: 'smile', excite: 'joy', ready: 'ready', talk: ['talk2', 'shrug', 'tilt'] },
};
// 台詞から表情と身振りを推し量る（台本に書かれていないとき）
function inferAct(key, text) {
  const C = CHAR_ACT[key] || {}, t = String(text).replace('（通信）', '').trim();
  const pick = C.talk || ['talk', 'explain'];
  let f = C.face || 'neutral', g = pick[Math.floor(Math.random() * pick.length)];
  if (/！？|！\?|^(えっ|わっ|なっ|ええっ|うそ)/.test(t)) { f = 'surprise'; g = 'surprise'; }
  else if (/^……/.test(t) && t.length < 16) { f = key === 'kazane' ? 'serious' : 'worry'; g = 'lookDown'; }
  else if (/？$/.test(t)) { g = 'tilt'; if (f === 'serious' && key !== 'kazane') f = 'neutral'; }
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
    if (!this.foe && m.face) m.face.set(C.face || 'neutral');
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
    const col = { key: '#56c8ff', container: '#e8c77a' }[item] || '#ffffff';
    const g = new THREE.Group();
    const body = new THREE.Mesh(item === 'container' ? new THREE.CylinderGeometry(0.07, 0.07, 0.2, 12) : new THREE.BoxGeometry(0.05, 0.14, 0.03), new THREE.MeshStandardMaterial({ color: '#2a2f4a', metalness: 0.8, roughness: 0.3 }));
    const glow = new THREE.Mesh(item === 'container' ? new THREE.TorusGeometry(0.075, 0.012, 6, 20) : new THREE.BoxGeometry(0.055, 0.03, 0.035), glowMat(col, 3));
    if (item === 'container') glow.rotation.x = Math.PI / 2;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 0.8), blending: THREE.AdditiveBlending, depthWrite: false })); sp.scale.setScalar(0.35);
    g.add(body, glow, sp); g.position.y = -0.04;
    this.m.armL.grip.add(g); this.item = g;
  }
  showWeapon(on) { if (this.m.armR && this.m.armR.grip) this.m.armR.grip.visible = on; }
}

// ============================================================
//  会話シーンの舞台
// ============================================================
class StageView extends BaseView {
  constructor(scene, id) {
    const st = SCENE_STAGES[id], Z = FIELD_ZONES[st.zone];
    super(CHAPTERS[Z.ci].bg, 36, { field: true, bare: true, zone: Z });
    this.st = st; this.sc = scene; this.bloomStrength = CHAPTERS[Z.ci].bg === 'snow' ? 0.35 : 0.72; this.exposure = st.exposure || { snow: 0.9, abyss: 0.85 }[CHAPTERS[Z.ci].bg] || 1;
    this.hooks = {};
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
  buildCast() {
    this.actors = {}; this.party = [];
    const st = this.st, lines = [];
    const walk = ls => ls.forEach(l => { if (Array.isArray(l)) lines.push(l); else if (l.c) l.c.forEach(([t, rs]) => { lines.push(['aster', t]); walk(rs); }); });
    walk(this.sc.lines);
    const speakers = new Set(lines.map(l => l[0]).filter(k => k !== 'n'));
    const comm = k => lines.filter(l => l[0] === k).every(l => String(l[1]).includes('（通信）'));
    const face = f => f == null ? null : typeof f === 'number' ? f : Array.isArray(f) ? this.W(f[0], f[1]) : f;
    for (const [key, spec] of Object.entries(st.cast)) {
      const list = Array.isArray(spec) ? spec : [spec];
      list.forEach((o, i) => {
        const foe = key.startsWith('e:'), id = i ? `${key}#${i}` : key;
        const m = foe ? buildEnemy(key.slice(2)) : buildCharacter(key);
        this.scene.add(m.group);
        const a = new Actor(this, id, m, { foe, stance: o.stance, y: o.y });
        a.place(this.W(o.at[0], o.at[1]));
        // roof：建物・岩の塊の上に立つ（屋外の区画）
        if (o.roof && this.T && this.T.top) { const i = this.T.at(a.pos.x, a.pos.z); if (i >= 0 && this.T.kind[i] <= TK.WINDOW) a.lift = this.T.top[i] - a.pos.y; }
        a.faceT = face(o.face) ?? (foe ? this.O.clone() : this.W(0, 3));
        a.yaw = a.baseYaw = a.targetYaw(a.faceT);
        if (foe) { a.scale0 = m.group.scale.x; m.color = ENEMIES[key.slice(2)].color; }
        if (o.hidden) { m.group.visible = false; a.alpha = 0; }
        if (o.weapon === false) a.showWeapon(false);
        if (o.item) a.hold(o.item);
        this.actors[id] = a;
        if (!foe) this.party.push(a);
      });
    }
    // 通信で話す人物（ホログラム）
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
    this.host = st.host || this.party.find(a => a.key !== 'aster' && !CHARS[a.key])?.key || null;
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
    else if (kind === 'wide') { const w = st.wide || { pos: [-2.8, 2.6, -4.2], look: [0, 1.2, 2] }; pos = this.WP(w.pos); look = this.WP(w.look); }
    else if (kind.startsWith('look:')) {   // 一行の後ろから、ある点を見上げる
      const p = this.point(kind.slice(5)), c = this.centroid();
      pos = c.clone().addScaledVector(this.F, -2.6).addScaledVector(this.R, 1.3); pos.y = this.O.y + 1.5; look = p;
    } else if (kind.startsWith('foe:')) {
      const a = this.actors[kind.slice(4)], c = this.centroid();
      pos = c.clone().addScaledVector(this.F, -1.4).addScaledVector(this.R, (this.lineIdx % 2 ? 1.5 : -1.5)); pos.y = this.O.y + 1.7;
      look = a.pos.clone(); look.y += a.headH * 0.9;
    } else if (kind.startsWith('ots:')) {   // 肩越し：ots:聞き手>話し手
      const [l, s] = kind.slice(4).split('>'); return this.ots(this.actors[l], this.actors[s], o);
    } else if (this.actors[kind]) return this.single(this.actors[kind], o);
    else { const w = st.wide; pos = this.WP(w.pos); look = this.WP(w.look); }
    this.cut(pos, look, o);
  }
  centroid() {
    const vis = this.party.filter(a => a.visible()); if (!vis.length) return this.O.clone();
    const c = V3(); vis.forEach(a => c.add(a.pos)); return c.multiplyScalar(1 / vis.length);
  }
  // 話し手の寄り：顔の正面寄りから、聞き手のいる側に少しずらす
  single(a, o = {}) {
    const h = a.headPos(), dir = V3(Math.sin(a.yaw), 0, Math.cos(a.yaw)), left = V3(Math.cos(a.yaw), 0, -Math.sin(a.yaw));
    const to = o.to ? this.point(o.to) : null;
    let s = to ? Math.sign(V3().subVectors(to, a.pos).dot(left)) || 1 : (this.lineIdx % 2 ? 1 : -1);
    const dist = a.comm ? 3.3 : o.close ? 1.35 : 1.9;
    const pos = h.clone().addScaledVector(dir, dist).addScaledVector(left, 0.55 * s); pos.y += 0.05;
    const look = h.clone().addScaledVector(left, -0.18 * s); look.y -= a.comm ? 0.55 : 0.08;
    this.cut(pos, look, o);
  }
  // 肩越し：聞き手 L の肩の後ろから話し手 S を見る
  ots(L, S, o = {}) {
    if (!L || !S) { if (S) this.single(S, o); return; }
    const lh = L.headPos(), sh = S.headPos(), d = V3().subVectors(sh, lh).setY(0).normalize(), p = V3(d.z, 0, -d.x);
    const s = this.lineIdx % 2 ? 1 : -1;
    const pos = lh.clone().addScaledVector(d, -1.15).addScaledVector(p, 0.62 * s); pos.y += 0.16;
    const look = sh.clone().addScaledVector(p, -0.12 * s); look.y -= 0.08;
    this.cut(pos, look, o);
  }
  // ---------- 台本の1行 ----------
  line(sp, text, dir = {}) {
    this.lineIdx++;
    const A = this.actors[sp];
    const d = A && !A.foe ? { ...inferAct(A.base, text), ...dir } : { ...dir };
    this.stopTalk();
    this.apply(d);
    if (A) {
      if (A.comm) { A.want = 1; this.commOn = sp; }
      if (!A.foe) {
        A.setFace(d.f); A.gesture(d.g); A.talk(true);
        // 誰に話しているか：指定がなければ直前の話し手、アステルなら相手役
        const to = d.to || (this.last && this.last !== sp && this.actors[this.last] ? this.last : sp === 'aster' ? (this.host || this.party.find(a => a.key !== 'aster')?.key) : 'aster');
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
    if (A.foe) { this.shot('foe:' + A.key, { drift: 0.2, dur: 4 }); this.lastShot = 'foe'; return; }
    // 通信（ホログラム）は、アステルの肩越しに映す
    if (A.comm) { if (this.lastShot !== 'sp:' + sp) this.ots(this.actors.aster, A, { dur: 6, drift: 0.2 }); else { this.cam.p0 = this.camera.position.clone(); this.cam.l0 = this.lookNow.clone(); this.cam.t = 0; } this.lastShot = 'sp:' + sp; return; }
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
    const a = this.actors.aster; if (!a) return;
    a.setFace('neutral'); a.gesture('think');
    const L = this.actors[this.last] && !this.actors[this.last].foe && !this.actors[this.last].comm ? this.actors[this.last] : null;
    if (L) this.ots(L, a, { dur: 6, drift: 0.15 }); else this.single(a, { close: true, dur: 6 });
    this.lastShot = 'choice';
  }
  give(k) {
    const a = this.actors[k]; if (!a) return;
    a.setFace('serious'); a.gesture('nod');
    for (const p of this.party) if (p !== a) { p.look = k; if (p.key === 'mizore') { p.setFace('joy'); p.gesture('cheer'); } }
    this.shot('wide', { drift: 0.4, dur: 6 }); this.lastShot = 'wide';
  }
  // ---------- 行の演出 ----------
  apply(d) {
    const each = (o, fn) => { if (!o) return; for (const [k, val] of Object.entries(o)) (k === 'all' ? this.party : k === 'foes' ? Object.values(this.actors).filter(a => a.foe) : [this.actors[k]]).forEach(a => a && fn(a, val)); };
    // 周りの反応 r: { キャラ: '表情' | [表情, 身振り] }
    each(d.r, (a, v) => { const [f, g] = Array.isArray(v) ? v : [v]; a.setFace(f); if (g) a.gesture(g); });
    each(d.look, (a, v) => { a.look = v === null ? null : this.point(v) && !this.actors[v] ? this.point(v) : v; });
    each(d.face, (a, v) => { a.faceT = typeof v === 'number' ? v : this.actors[v] ? v : Array.isArray(v) ? this.W(v[0], v[1]) : this.point(v); });
    each(d.stance, (a, v) => a.setStance(v === 'ready' ? (CHAR_ACT[a.base] || {}).ready || 'ready' : v));
    each(d.move, (a, v) => { const pts = (Array.isArray(v[0]) ? v : [v]).map(p => this.W(p[0], p[1])); a.walkTo(pts, d.speed || 1.6); });
    each(d.hold, (a, v) => a.hold(v));
    each(d.weapon, (a, v) => { a.showWeapon(v); if (v) { this.fx.sprite(a.m.handPos(), ELEMENTS[CHARS[a.key].elem].color, 1.4, 0.5); Sfx.zap(); } });
    each(d.lift, (a, v) => { const y0 = a.lift; GFX.tween(0.5, e => { a.lift = lerp(y0, v, e); }); });
    if (d.enter) [].concat(d.enter).forEach(k => this.enter(k, d.enterFx));
    if (d.exit) [].concat(d.exit).forEach(k => { const a = this.actors[k]; if (a) GFX.tween(0.5, e => { a.alpha = 1 - e; }).then(() => { a.m.group.visible = false; }); });
    if (d.defeat) [].concat(d.defeat).forEach(k => Object.values(this.actors).filter(a => a.base === k).forEach(a => { a.dead = 0.001; a.m.flash('#ffffff', 1.2); }));
    if (d.fx) [].concat(d.fx).forEach(f => { const [n, arg] = f.split(':'); const h = this.hooks[n]; if (h) h(arg ? this.handOf(arg) : undefined); else if (n === 'glow') this.chestGlow(arg); else if (n === 'open') this.openExit(arg); });
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
      else { this.p.burst(p, (CHARS[a.key] ? ELEMENTS[CHARS[a.key].elem].color : '#ffffff'), 50, { speed: 5, life: 0.9, up: 0.5 }); }
    });
    if (list.some(a => a.foe)) { Sfx.enemy(); GFX.flash('#ff3040', 0.35, 0.4); }
    else Sfx.swing();
  }
  // 胸の奥が熱を帯びる（星核と共鳴する光）
  chestGlow(k) {
    const a = this.actors[k]; if (!a) return;
    let t = 0; const col = '#ff6a8a';
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 1.2), blending: THREE.AdditiveBlending, depthWrite: false })); this.scene.add(sp);
    this.zoneTicks.push(dt => {
      if (t > 4) { sp.visible = false; return; }
      t += dt; const p = a.headPos(); p.y -= 0.42; p.addScaledVector(V3(Math.sin(a.yaw), 0, Math.cos(a.yaw)), 0.14);
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
// 探索フィールドの部品（床の高さ・当たり判定・出入口）を借りる
for (const k of ['gy', 'hitsCol', 'blocked', 'freeSpot', 'safeAt', 'buildMapExits', 'makeBulkhead', 'makeCabin', 'makeGate', 'exitTop']) StageView.prototype[k] = FieldView.prototype[k];

// ============================================================
//  会話シーンの舞台（第一章・第二章）：どの区画のどこで演じるか
//  zone / at（マス座標）/ face（一行が向く方角：0 北・90 東・180 南・270 西）
//  cast：立ち位置 at は舞台の座標 [右, 前]（m）。face は向く相手・舞台の点 [右, 前]
//  points：視線やカメラが向かう点 [右, 高さ, 前]。wide / shots：カメラ { pos, look }
// ============================================================
const SCENE_STAGES = {
  // カプセルホールの壇の上：目覚めたばかりのアステルを、ミゾレとユエがのぞき込む
  c1_01: { zone: 'c1_cryo', at: [7.5, 3], face: 180,
    cast: { aster: { at: [0, -1.4], face: 'mizore', stance: 'kneel', weapon: false }, mizore: { at: [-0.5, 0.5], face: 'aster' }, yue: { at: [0.9, 0.3], face: 'aster' } },
    points: { exit: [0.5, 1.5, 21], alarm: [-5, 4, 8], capsule: [0, 1.4, -3.3] },
    wide: { pos: [-4.4, 2.2, 0.8], look: [0.1, 0.9, -0.6] } },
  // 検問扉の手前：通路をふさぐ斥候
  c1_01b: { zone: 'c1_cryo', at: [7, 11.2], face: 180,
    cast: { aster: { at: [0, 0], weapon: false }, mizore: { at: [-1.3, 0.4] }, yue: { at: [1.3, 0.3] },
      'e:scout': [{ at: [1.2, 5.8] }, { at: [0, 6.6] }, { at: [-1.3, 5.9] }] },
    wide: { pos: [2.2, 2.3, -3.2], look: [0, 1.1, 4.5] },
    shots: { hero: { pos: [0.7, 0.55, 2.8], look: [0.1, 1.45, 0] } } },
  // 上の回廊の奥の医務室：端末の陰に隠れていたイリス
  c1_02: { zone: 'c1_cryo', at: [28, 21.4], face: 0, host: 'iris',
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.35] }, mizore: { at: [1.3, 0.4] }, iris: { at: [-1.4, 4.9], face: 'aster', stance: 'crouch' } },
    points: { storage: [-12, 1.5, 0], door: [-6, 1.8, -0.2] },
    wide: { pos: [2.4, 2.3, -2.6], look: [-0.6, 1.1, 3.2] } },
  // 保管棚ギャラリー、C-7 の棚の前：ミゾレがキーを見つけ、ギャラリーの奥から敵が迫る
  c1_03: { zone: 'c1_storage', at: [4.2, 12], face: 180,
    cast: { aster: { at: [0, 0] }, yue: { at: [1.4, 0.4] }, mizore: { at: [0.8, 2.6], face: [0.8, 6] },
      'e:drone': { at: [-4.6, 1.4], hidden: true }, 'e:plunderer': [{ at: [-5.4, -0.4], hidden: true }, { at: [-5.1, 3.0], hidden: true }] },
    points: { key: [0.8, 1.6, 3.4] },
    wide: { pos: [2.2, 2.6, -3.4], look: [-0.8, 1.2, 2.4] },
    shots: { rack: { pos: [-0.4, 1.9, 0.9], look: [0.9, 1.5, 3.4] } } },
  // 同じ場所、戦いのあと：風とともにカザネが駆け込んでくる。イリスから通信
  c1_04: { zone: 'c1_storage', at: [4.2, 12], face: 180,
    cast: { aster: { at: [0, 0] }, yue: { at: [1.4, 0.4] }, mizore: { at: [0.6, 1.5], item: 'key' }, kazane: { at: [-4.4, -8], hidden: true, face: 'aster' } },
    comm: [1.9, 2.3],
    wide: { pos: [2.4, 2.2, 2.6], look: [-1.6, 1.2, 0.2] } },
  // エレベーターを出た先の切り通し：中央管制室を埋める反物質軍団
  c1_04b: { zone: 'c1_control', at: [18, 21.5], face: 0,
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.5] }, mizore: { at: [1.3, 0.4] }, kazane: { at: [2.5, 1.2] },
      'e:knight': { at: [0, 13] }, 'e:scout': [{ at: [-2.4, 11.6] }, { at: [2.6, 11.8] }] },
    comm: [-1.8, 2.6],
    wide: { pos: [-2.2, 3.4, -4.6], look: [0.5, 1.6, 8] },
    shots: { hero: { pos: [0.6, 0.6, 3.0], look: [0.2, 1.5, 0] } } },
  // 炉へ入る前室：桟橋の入口に立ちはだかる巨像
  c1_05: { zone: 'c1_reactor', at: [8.5, 17], face: 90,
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.4] }, mizore: { at: [1.3, 0.4] }, kazane: { at: [0.4, 1.6] }, 'e:golem': { at: [0, 8.8] } },
    comm: [-1.7, 2.6],
    points: { core: [1, 8, 28] },
    wide: { pos: [-2.6, 2.6, -3.4], look: [0, 2.2, 7] },
    shots: { hero: { pos: [0.8, 0.6, 3.0], look: [0.2, 1.5, 0] } } },
  // 炉の底、炉心の足もとの制御端末：炉を止めると、北の隔壁がひとりでに開く
  c1_05b: { zone: 'c1_reactor', at: [22.5, 24.6], face: 0, flags: { reactorStopped: false },
    cast: { aster: { at: [0, 0.9] }, mizore: { at: [1.2, 0.4], item: 'key' }, yue: { at: [-1.3, 0.3] }, kazane: { at: [-2.4, -0.5] } },
    comm: [2.3, 2.0],
    points: { core: [0, 8, 14.2], terminal: [0, 1.1, 2.6], bulkhead: [1, 3, 49] },
    wide: { pos: [2.6, 2.2, -3.4], look: [0, 3.2, 6] },
    shots: { core: { pos: [1.8, 1.3, -1], look: [0, 7.5, 14] }, bulkhead: { pos: [9, 8, 18], look: [1, 2.5, 49] }, terminal: { pos: [1.6, 1.8, 3.8], look: [0, 1.2, 1.2] } } },
  // 深淵に架かる橋の上：壇の上で脈打つ星核と、目を覚ます番人
  c1_06: { zone: 'c1_core', at: [12.5, 10], face: 0, flags: { coreTaken: false },
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.4] }, mizore: { at: [1.3, 0.4] }, kazane: { at: [2.5, -0.6] }, 'e:boss_core': { at: [0, 8.5], hidden: true } },
    points: { core: [0, 6.5, 14] },
    wide: { pos: [-2.4, 2.2, -4.4], look: [0, 3.5, 8] },
    shots: { core: { pos: [1.2, 1.2, -1.6], look: [0, 6, 14] }, hero: { pos: [0.6, 0.6, 3.0], look: [0.2, 1.5, 0] } } },
  // 星核の壇の前：番人を倒し、アステルが星核を鎮め、ユエが封じる
  c1_06b: { zone: 'c1_core', at: [12.5, 6.8], face: 0, flags: { coreTaken: false },
    cast: { aster: { at: [0, 0], stance: 'ready' }, yue: { at: [-1.3, 0.3], stance: 'guardStaff' }, mizore: { at: [1.3, 0.3], stance: 'mzGuard' }, kazane: { at: [2.6, -0.5], stance: 'ready' }, 'e:boss_core': { at: [0, 2.8] } },
    comm: [-2.2, 1.9],
    points: { core: [0, 6.5, 7.6] },
    wide: { pos: [-2.6, 2.4, -4.2], look: [0, 3, 4] },
    shots: { core: { pos: [1.4, 1.1, -1.8], look: [0, 6, 7.6] }, reach: { pos: [-0.5, 1.15, -1.0], look: [0.35, 2.7, 5.5] }, seal: { pos: [-4.0, 1.5, -1.6], look: [-0.4, 2.3, 3.2] } } },
  // 停泊ドックのホーム：列車の前でポルカが出迎える
  c1_07: { zone: 'c1_dock', at: [11.5, 10], face: 270, host: 'polka',
    cast: { polka: { at: [0.3, 3.0], face: 'aster' }, aster: { at: [0, 0] }, mizore: { at: [-1.3, 0.3] }, yue: { at: [1.3, 0.3] }, kazane: { at: [2.5, -0.5] } },
    points: { train: [11, 2.5, 14] },
    wide: { pos: [-3.2, 2.4, -2.6], look: [0.8, 1.6, 6] },
    shots: { depart: { pos: [-4.5, 3.2, -4], look: [4, 2, 12] } } },

  // ---------------- 第二章 ----------------
  // 雪原の外縁の停車場：列車を降りた一行のもとへ、谷の階段からロアが上がってくる（右が北、前が西）
  c2_01: { zone: 'c2_outskirts', at: [41, 21], face: 270, host: 'roa',
    cast: { aster: { at: [0, 0] }, mizore: { at: [-1.3, 0.4] }, yue: { at: [1.3, 0.3] }, kazane: { at: [2.6, -0.6] }, roa: { at: [-1, 10], face: 'aster' } },
    points: { valley: [0, -1, 20], train: [0, 2, -9], gate: [2, 5, 80] },
    wide: { pos: [-3.8, 2.2, -2.6], look: [0.5, 1.3, 3] },
    shots: { arrive: { pos: [2.6, 3, 7], look: [0, 1.4, -3] } } },
  // 凍てついた街路、運河の橋の先：大階段を背にロアが立ち、東の屋根の上にライカが現れる（前が北）
  c2_02: { zone: 'c2_street', at: [20, 38], face: 0, host: 'roa',
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.3] }, mizore: { at: [1.3, 0.4] }, kazane: { at: [2.6, -0.5] }, roa: { at: [0.3, 2.6], face: 'aster' },
      laika: { at: [11.3, 3], roof: true, hidden: true, face: 'aster' } },
    points: { stair: [0, 3, 14], roof: [11.3, 10.5, 3], mine: [15, 0.5, -14] },
    wide: { pos: [-3.2, 2.4, -3.6], look: [1.5, 2, 4] },
    shots: { roofUp: { pos: [-6, 0.8, -1], look: [11.3, 10.6, 3] } } },
  // 地下鉱区・深層、中央の足場：青く光る古い鉱脈の前で（前が北、奥に北の岩棚）
  c2_03: { zone: 'c2_mine_deep', at: [23, 24.5], face: 0, host: 'roa',
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.3] }, mizore: { at: [1.3, 0.4] }, kazane: { at: [2.6, -0.6] }, laika: { at: [-2.6, -0.6] }, roa: { at: [-0.9, 2.8], face: 'aster' } },
    points: { vein: [0, 2.5, 6.6], north: [-3, 1.5, 47] },
    wide: { pos: [-3.4, 2.4, -2.4], look: [0.4, 1.8, 4] },
    shots: { vein: { pos: [3.4, 2.9, -3.4], look: [0, 2.2, 6.6] }, shaft: { pos: [4.6, 2.4, -1.2], look: [-2, 1.5, 30] } } },
  // 城塞の門の東、見張りの死角：前庭の先に門と鋼鉄の巨像（右が北、前が西）
  c2_04: { zone: 'c2_gate', at: [45.5, 19], face: 270, host: 'roa',
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.3] }, mizore: { at: [1.3, 0.4] }, kazane: { at: [2.6, -0.5] }, roa: { at: [-0.6, 2.4], face: 'aster' }, laika: { at: [3.4, 1.6], face: 'aster' } },
    points: { gate: [36, 6, 40], golems: [16, 6, 40] },
    wide: { pos: [-3.6, 2.4, -3.2], look: [1, 1.4, 3] },
    shots: { gate: { pos: [-14, 3.2, 39.5], look: [26, 5.5, 39.5] }, hero: { pos: [0.6, 0.6, 3.0], look: [0.2, 1.5, 0] } } },
  // 玉座の間、壇の階段の手前：玉座の前に女帝、頭上に氷の星核（前が北）
  c2_05: { zone: 'c2_palace', at: [19.5, 10], face: 0, host: 'roa',
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.3] }, mizore: { at: [1.3, 0.4] }, kazane: { at: [2.6, -0.5] }, laika: { at: [-2.6, -0.5] }, roa: { at: [-0.5, 1.5] },
      'e:boss_empress': { at: [0, 12.2] } },
    points: { core: [0, 10, 15] },
    wide: { pos: [-3.4, 2.6, -3.6], look: [0, 2.4, 6] },
    shots: { throne: { pos: [1.8, 1.3, -2.8], look: [0, 3.5, 12] }, hero: { pos: [0.6, 0.6, 3.0], look: [0.2, 1.5, 0] } } },
  // 同じ場所、戦いのあと：星核が砕けて氷が溶け、ロアが女帝のもとへ駆け寄る
  c2_06: { zone: 'c2_palace', at: [19.5, 10], face: 0, host: 'roa',
    cast: { aster: { at: [0, 0] }, yue: { at: [-1.3, 0.3] }, mizore: { at: [1.3, 0.4] }, kazane: { at: [2.6, -0.5] }, laika: { at: [-2.6, -0.5] }, roa: { at: [-0.5, 1.5] },
      'e:boss_empress': { at: [0, 12.2] } },
    comm: [0.4, 3.2],
    points: { core: [0, 10, 15] },
    wide: { pos: [-3.4, 2.6, -3.6], look: [0, 2.4, 6] },
    shots: { throne: { pos: [1.8, 1.3, -2.8], look: [0, 4.5, 13] }, reunion: { pos: [4.4, 2.4, 5.2], look: [-0.4, 3.9, 11] }, window: { pos: [-5, 4, -6], look: [0, 3.5, 9] } } },
};

// ============================================================
//  戦闘の舞台（第一章・第二章）：区画のどこで戦うか
//  at（マス座標）が戦場の中心、face は味方が敵を向く方角（0 北・90 東・180 南・270 西）。
//  戦闘は中心の手前（+Z）に味方、奥（-Z）に敵が並ぶので、そのまま区画を回して重ねる
// ============================================================
const BATTLE_SETS = {
  '1-1': { zone: 'c1_cryo', at: [7.5, 9.2], face: 180 },                   // カプセルホール、検問扉の方へ
  '1-2': { zone: 'c1_storage', at: [23, 11], face: 270 },                  // 倉庫の床、コンテナの通路
  '1-3': { zone: 'c1_control', at: [17.5, 17.5], face: 0 },                // 中央管制室、ホロテーブルの前
  '1-4': { zone: 'c1_reactor', at: [19, 23], face: 0, flags: () => ({ reactorStopped: typeof Story !== 'undefined' && Story.seen('c1_05b') }) },   // 炉の底
  '1-5': { zone: 'c1_core', at: [12.5, 9.5], face: 0, flags: { coreTaken: false } },   // 深淵の橋、背後に星核
  dock: { zone: 'c1_dock', at: [26.5, 17], face: 0 },                      // コンコース
  // 第二章
  '2-1': { zone: 'c2_outskirts', at: [25, 29], face: 0 },                  // 谷の雪原、奥に氷の裂け目と北の尾根
  '2-2': { zone: 'c2_street', at: [20, 45], face: 0 },                     // 凍てついた街路、運河の橋の手前
  '2-3': { zone: 'c2_mine_deep', at: [23, 24.2], face: 0 },                // 大縦穴の中央の足場、背後に古い鉱脈
  '2-4': { zone: 'c2_gate', at: [26, 23], face: 0 },                       // 城塞の前庭、奥に大階段と門
  '2-5': { zone: 'c2_palace', at: [19.5, 12.4], face: 0 },                 // 玉座の間、壇の前
  mineUpper: { zone: 'c2_mine', at: [17, 21], face: 0 },                  // 上層坑道の大空洞
  mineNorth: { zone: 'c2_mine_north', at: [20, 32], face: 0 },            // 北坑道の下の広間
  palaceHall: { zone: 'c2_palace_hall', at: [21.5, 26], face: 0 },        // 大広間、奥に大階段
  gallery: { zone: 'c2_palace_gallery', at: [19.5, 36], face: 0 },        // 肖像の回廊
  garden: { zone: 'c2_palace_garden', at: [24, 31], face: 0 },            // 凍てついた庭園、奥に凍った泉
};
// 探索中の戦闘：区画ごとの戦場
const ZONE_ARENAS = { c1_dock: 'dock', c1_cryo: '1-1', c1_storage: '1-2', c1_control: '1-3', c1_reactor: '1-4',
  c1_core: { zone: 'c1_core', at: [12.5, 9.5], face: 0 },
  c2_outskirts: '2-1', c2_street: '2-2', c2_mine: 'mineUpper', c2_mine_deep: '2-3', c2_mine_north: 'mineNorth', c2_gate: '2-4',
  c2_palace_hall: 'palaceHall', c2_palace_gallery: 'gallery', c2_palace_garden: 'garden', c2_palace: '2-5' };
function resolveBattleSet(loc) {
  const s = typeof loc === 'string' ? BATTLE_SETS[loc] : loc;
  return s && FIELD_ZONES[s.zone] ? s : null;
}
// 区画を組み立てて、戦場の中心が原点・敵の方向が -Z になるよう回して置く
function buildBattleSet(view, loc) {
  const Z = FIELD_ZONES[loc.zone], [cx, cz] = zonePoint(Z, loc.at);
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
