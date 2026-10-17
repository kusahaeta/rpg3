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
  // 猫じゃらしで遊ぶ：左手の猫じゃらしを頭の上にかかげ、右の前足でじゃれつく（猫じゃらしは jarashiUp で持たせる）
  jarashi:     { armLx: -2.5, armLz: 0.3, elbowL: -0.55, armRx: -1.7, armRz: -0.25, elbowR: -1.1, headX: -0.32, lean: -0.04 },
  armsCrossed: { armRx: -0.5, armRz: 0.6, elbowR: -1.95, armLx: -0.45, armLz: -0.62, elbowL: -1.9, headX: 0.04 },
  polite:      { armRx: -0.28, armRz: 0.36, elbowR: -1.15, armLx: -0.28, armLz: -0.36, elbowL: -1.15 },
  hipHand:     { armLz: 0.75, armLx: 0.25, elbowL: -1.5, armRz: -0.12, elbowR: -0.3, twist: 0.06 },
  weak:        { hipsY: -0.04, lean: 0.14, headX: 0.22, armLx: -0.55, armLz: -0.2, elbowL: -1.4, armRz: -0.1, elbowR: -0.25, kneeL: 0.12, kneeR: 0.1 },
  kneel:       { hipsY: -0.47, lean: 0.1, headX: 0.18, legLx: -1.5, kneeL: 1.5, legRx: 0.12, kneeR: 1.45, armLx: -0.75, armLz: 0.1, elbowL: -0.35, armRx: -0.2, armRz: -0.25, elbowR: -0.4 },
  sit:         { hipsY: -0.3, lean: 0.04, legLx: -1.45, kneeL: 1.35, legRx: -1.45, kneeR: 1.35, armLx: -0.55, armLz: 0.1, elbowL: -0.9, armRx: -0.55, armRz: -0.1, elbowR: -0.9 },   // いすに腰かける（cast の y でいすの高さまで持ち上げる）
  crouch:      { hipsY: -0.42, lean: 0.35, headX: -0.25, legLx: -1.2, kneeL: 1.9, legRx: -0.9, kneeR: 1.7, armLx: -0.9, elbowL: -1.2, armRx: -0.9, elbowR: -1.2 },
  guardStaff:  { hipsY: -0.02, armRx: -1.1, armRz: 0.1, elbowR: -0.9, armLx: -0.6, armLz: -0.25, elbowL: -1.1, legLx: -0.25, legRx: 0.2, kneeL: 0.2, kneeR: 0.2 },
  explain:     { armRx: -0.9, armRz: -0.35, elbowR: -0.9, armLz: 0.2, elbowL: -0.3, headY: 0.05 },
  // 空中ブランコ：両手でバーにぶらさがる（hang）。受け手は、ひざをバーにかけて、さかさまにぶらさがる（hangKnees。体ごと上下さかさまにして使う）
  hang:        { hipsY: 0, lean: 0, twist: 0, headX: -0.12, headY: 0, armLx: -3.05, armLz: 0.14, elbowL: -0.05, armRx: -3.05, armRz: -0.14, elbowR: -0.05, legLx: 0.12, legRx: 0.04, kneeL: 0.3, kneeR: 0.35 },
  hangKnees:   { hipsY: 0, lean: 0, twist: 0, headX: 0.3, headY: 0, armLx: -3.05, armLz: 0.18, elbowL: -0.05, armRx: -3.05, armRz: -0.18, elbowR: -0.05, legLx: -0.3, legRx: -0.3, kneeL: 1.7, kneeR: 1.7 },
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
  gazeHand: [[{ armLx: -1.35, armLz: -0.2, elbowL: -0.9, headX: 0.22 }, 8]],   // 左手に持った物（手紙など）を、胸の前で見つめる
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
  uketsuke: { stance: 'idle', face: 'smile', excite: 'joy', talk: ['bow', 'explain', 'point'] },
  gutsugutsu: { stance: 'hipHand', face: 'joy', excite: 'joy', talk: ['explain', 'point', 'laugh', 'fist'] },
  nemunemu: { stance: 'idle', face: 'sleepy', talk: ['tilt', 'lookDown', null] },
  chokichoki: { stance: 'idle', face: 'gentle', talk: ['nod', 'explain', 'lookUp'] },
  dodon: { stance: 'armsCrossed', face: 'smug', excite: 'joy', talk: ['nod', 'explain', 'laugh', 'fist'] },
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
    this.lie = (o.lie || 0) * Math.PI / 180;   // 横になる（度）：体を前後の軸で倒す。-90 で頭が左、90 で頭が右（寝袋で眠るなど）
    // still：骨組みの敵を、動かない石像として立たせる（目を閉じ、息づかいも止める）。enter で目をさまして身構える
    this.still = !!(o.still && this.foe && m.critter); this.stillT = 0;
    if (this.still) { m.critter.setPose(POSES.idle); m.critter.face.shut = true; }
    this.headH = this.foe ? m.height * 0.6 : m.height * 0.88;
    if (!this.foe && m.face) m.face.set(C.face || defaultFace(this.base));
  }
  // ワールド座標の頭の位置
  headPos() {
    if (!this.lie) return V3(this.pos.x, this.pos.y + this.lift + this.headH, this.pos.z);
    const s = -Math.sin(this.lie) * this.headH, c = Math.cos(this.lie) * this.headH;   // 体の上向きを、倒した向きと体の向きで回す
    return V3(this.pos.x + s * Math.cos(this.yaw), this.pos.y + this.lift + c, this.pos.z - s * Math.sin(this.yaw));
  }
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
      // ごろごろ岩は、進んだぶん本体がころがる（userData.spin。ほかの敵は使わない）
      if (this.foe) this.m.group.userData.spin = (this.m.group.userData.spin || 0) + step / (this.m.radius || 1);
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
    if (this.item && this.item.userData.swing) this.item.rotation.z = Math.sin(t * 7) * 0.45;
    if (this.foe) { this.updateFoe(dt, t); return; }
    if (m.face) m.face.shut = this.stance === 'sleep';   // 眠っているあいだは目を閉じる
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
    m.group.rotation.set(0, this.yaw, this.lie);
    // rig：ほかのしくみ（空中ブランコなど）が、体の置き場所・かたむき・姿勢を決める
    if (this.rig) this.rig(P, dt);
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
    // 石像のあいだは時間を止めて描く（はじめの少しだけ dt を進めて、ポーズと閉じた目をのせる）
    if (this.still) { m.update((this.stillT += dt) < 0.6 ? dt : 0, 0); return; }
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
    } else if (item === 'jarashi' || item === 'jarashiUp') {   // 猫じゃらし（jarashiUp：手の先へのばして持ち、ゆらゆら振る）
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.4, 5), toon('#8ab85a')); st.position.y = 0.18; g.add(st);
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.03, 0.12, 3, 8), toon('#e8d890')); ear.position.set(0.03, 0.42, 0); ear.rotation.z = -0.5; g.add(ear);
    } else if (item === 'book') {   // 古い記録
      const b = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.04), toon('#8a5a3a')); g.add(b);
    } else if (item === 'flower') {
      for (let i = 0; i < 3; i++) { const f = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), toon('#ffffff')); f.position.set((i - 1) * 0.04, 0.18, 0); g.add(f); }
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.18, 5), toon('#5ab04a')); st.position.y = 0.09; g.add(st);
    } else if (item === 'card') {   // 魔王城の面会許可証（ハンコの欄が五つ）
      const c = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.14, 0.01), toon('#f8f0e0')); c.position.y = 0.06; g.add(c);
      for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(new THREE.CircleGeometry(0.014, 10), toon('#d84a4a')); s.position.set(-0.07 + i * 0.035, 0.04, 0.006); g.add(s); }
    } else if (item === 'letter') {   // 手紙：水色の封筒に、桃色のハートの封（白い毛の子が持っても見えるように）
      const e = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.16, 0.014), toon('#a8d4ff')); e.position.y = 0.07; g.add(e);
      for (const sd of [-1, 1]) { const s = new THREE.Mesh(new THREE.SphereGeometry(0.02, 10, 8), toon('#ff5a8a')); s.scale.z = 0.6; s.position.set(sd * 0.012, 0.078, 0); g.add(s); }
    } else if (item === 'manju') {   // 温泉まんじゅう
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 12, 8), toon('#c8885a')); b.scale.y = 0.7; b.position.y = 0.05; g.add(b);
      const s = new THREE.Mesh(new THREE.CircleGeometry(0.025, 10), toon('#6a3a2a')); s.position.set(0, 0.09, 0.03); s.rotation.x = -0.9; g.add(s);
    } else if (item === 'ladle') {   // おたま
      const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.3, 6), toon('#c8c8d8')); st.position.y = 0.12; g.add(st);
      const cup = new THREE.Mesh(new THREE.SphereGeometry(0.05, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), toon('#e8e8f0', { side: THREE.DoubleSide })); cup.position.y = 0.28; cup.rotation.x = Math.PI; g.add(cup);
    } else if (item === 'star') {   // 星のかけら
      const s2 = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), glowMat('#fff0a8', 2.6)); g.add(s2);
    }
    g.position.y = -0.03;
    if (item === 'jarashiUp') { g.rotation.x = Math.PI; g.userData.swing = true; }   // 手の先（腕の向き）へのばす
    if (item === 'letter') g.rotation.x = Math.PI / 2;   // 封筒の面を、手のひらの向き（見ている人の側）へ
    this.m.armL.grip.add(g); this.item = g;
  }
  showWeapon(on) { if (this.m.armR && this.m.armR.grip) this.m.armR.grip.visible = on; }
}

// ============================================================
//  会話シーンの舞台
// ============================================================
// 場面転換：台本の行に set: '名前' と書くと、暗転して scene.sets の舞台に組みかえる（エピローグで、仲間それぞれの暮らしを映すなど）
// その舞台で演じる行：set: の行から、次の set: の行の手前まで（set が null なら、最初の舞台 stage の行）
function setLines(scene, set) {
  if (!scene.sets) return scene.lines;
  const out = []; let cur = null;
  for (const l of scene.lines) {
    const d = Array.isArray(l) && l.find((x, i) => i >= 2 && x && typeof x === 'object');
    if (d && d.set) cur = d.set;
    if (cur === set) out.push(l);
  }
  return out;
}
class StageView extends BaseView {
  constructor(scene, id, set = null) {
    const st = set ? scene.sets[set] : SCENE_STAGES[id], Z = FIELD_ZONES[st.zone], bg = st.bg || Z.bg || CHAPTERS[Z.ci].bg;
    super(bg, 36, { field: true, bare: true, zone: Z });
    this.st = st; this.sc = scene; this.id = id; this.bg = bg; this.set = set; this.lines = setLines(scene, set);
    this.bloomStrength = { cave: 0.7, root: 0.7, end: 0.7, night: 0.8, tower: 0.6 }[bg] || 0.45; this.exposure = st.exposure || { meadow: 0.95, road: 0.95, dream: 0.9 }[bg] || 1;
    this.hooks = Object.assign({}, STAGE_FX);
    // 舞台の座標系：原点 O、前 F（一行が向いている方向）、右 R
    const [ox, oz] = zonePoint(Z, st.at), th = st.face * Math.PI / 180;
    this.F = V3(Math.sin(th), 0, -Math.cos(th)); this.R = V3(Math.cos(th), 0, Math.sin(th));
    this.O = V3(ox, 0, oz);
    const reserved = [{ x: ox, z: oz, r: 6 }];
    buildZoneSet(this, st.zone, { flags: st.flags, reserved });
    this.O.y = this.gy(ox, oz);
    // props：その場面だけの小道具 [ZoneKit の部品名, 右, 前, 向き（度。0 で舞台の前へ長く、90 で右へ）, 材質]（野宿のたき火・寝袋など）
    for (const [kind, lx, lz, deg = 0, mat] of st.props || []) { const p = this.W(lx, lz); this.kit[kind](p.x, p.z, Math.PI - th - deg * Math.PI / 180, mat); }
    this.timers = []; this.lineIdx = 0; this.last = null; this.addr = null;
    this.buildCast();
    if (st.trapeze) this.tz = new TrapezeRig(this, st.trapeze);
    this.shot('wide', { drift: 0.5, dur: 7 });
    this.snapCam();
  }
  // 舞台の座標（右 lx, 前 lz, 高さ y）→ ワールド
  W(lx, lz, y = 0) { return V3(this.O.x + this.R.x * lx + this.F.x * lz, this.O.y + y, this.O.z + this.R.z * lx + this.F.z * lz); }
  WP(p) { return p.length === 3 ? this.W(p[0], p[2], p[1]) : this.W(p[0], p[1]); }
  point(name) {
    if (name instanceof THREE.Vector3) return name;
    if (Array.isArray(name)) return this.WP(name);   // 舞台から見た座標 [右, 前] または [右, 高さ, 前]
    if (this.actors[name]) return this.actors[name].headPos();
    const p = (this.st.points || {})[name]; return p ? this.WP(p) : null;
  }
  // ---------- 配役 ----------
  // 舞台の cast がなければ、仲間は一行の隊列、ほかの人物は向かい、敵はさらに奥へ自動で並べる
  // 場面転換の舞台（set）には、その舞台で演じる行の話し手と、舞台の cast だけを立たせる（シーンの cast は最初の舞台だけ）
  autoCast() {
    const st = this.st, lines = [], sceneCast = this.set ? [] : this.sc.cast || [];
    const walk = ls => ls.forEach(l => { if (Array.isArray(l)) lines.push(l); else if (l.c) l.c.forEach(([t, rs]) => { lines.push([HERO, t]); walk(rs); }); });
    walk(this.lines);
    const speakers = [...new Set(lines.map(l => l[0]).filter(k => k !== 'n'))];
    const comm = k => lines.filter(l => l[0] === k).every(l => String(l[1]).includes('（遠くから）') || String(l[1]).includes('（声）'));
    const party = st.party || partyAt(this.id);
    const cast = {};
    const slots = [[0, 0], [-1.15, 0.3], [1.15, 0.35], [-2.2, -0.35], [2.3, -0.4]];
    party.forEach((k, i) => { cast[k] = { at: slots[i] || [i * 1.1 - 2, -1] }; });
    // voices：姿のない話し手（しゃべる幕やびっくり箱など。区画の小物が演じる）は立たせない
    const others = [...new Set([...speakers, ...(st.extra || []), ...sceneCast])].filter(k => !party.includes(k) && !k.startsWith('e:') && !comm(k) && !(st.voices || {})[k]);
    others.forEach((k, i) => { cast[k] = { at: [(i - (others.length - 1) / 2) * 1.3, 2.6 + (others.length > 3 ? (i % 2) * 0.8 : 0)], face: HERO }; });
    const foes = [...new Set([...speakers, ...sceneCast].map(k => k.split('#')[0]))].filter(k => k.startsWith('e:'));   // e:iwa#1（二匹め）は e:iwa の配役から
    foes.forEach((k, i) => { const d = ENEMIES[k.slice(2)]; cast[k] = { at: [(i - (foes.length - 1) / 2) * 3, d.boss ? 8 : 6] }; });
    for (const [k, o] of Object.entries(st.cast || {})) cast[k] = o === null ? undefined : Array.isArray(o) ? o.map(x => ({ ...(cast[k] || {}), ...x })) : { ...(cast[k] || {}), ...o };   // 配列 ＝ 同じ役を何匹も
    for (const k of Object.keys(cast)) if (!cast[k]) delete cast[k];
    return cast;
  }
  buildCast() {
    this.actors = {}; this.party = [];
    const st = this.st, lines = [];
    const walk = ls => ls.forEach(l => { if (Array.isArray(l)) lines.push(l); else if (l.c) l.c.forEach(([t, rs]) => { lines.push([HERO, t]); walk(rs); }); });
    walk(this.lines);
    const speakers = new Set(lines.map(l => l[0]).filter(k => k !== 'n'));
    const comm = k => lines.filter(l => l[0] === k).every(l => String(l[1]).includes('（遠くから）') || String(l[1]).includes('（声）'));
    const face = f => f == null ? null : typeof f === 'number' ? f : Array.isArray(f) ? this.W(f[0], f[1]) : f;
    for (const [key, spec] of Object.entries(this.autoCast())) {
      const list = Array.isArray(spec) ? spec : [spec];
      list.forEach((o, i) => {
        const foe = key.startsWith('e:'), id = i ? `${key}#${i}` : key;
        const m = foe ? buildEnemy(key.slice(2)) : buildCharacter(key);
        if (o.scale) m.group.scale.multiplyScalar(o.scale);   // scale：その場面だけ大きく（探索で見る大きさにそろえる）
        this.scene.add(m.group);
        const a = new Actor(this, id, m, { foe, stance: o.stance, y: o.y, lie: o.lie, still: o.still });
        if (o.carry === 'hammer') a.hammer = pikoHammer(m);
        if (o.juggle === false && m.extras) m.extras.off = true;   // juggle: false：ピエロのお手玉の球を出さない（戦いのあとの会話など）   // carry：手のない敵の姿に持たせる物（ピコピコハンマー。演出 piko で振る）
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
  cut(pos, look, { drift = 0.3, dur = 5, snap = true, free = false, fov = null } = {}) {
    if (!free) pos = this.unblock(look, pos);
    // fov：このカットだけ画角を広げる（大きなものを全体で映す）
    this.fov0 = this.fov0 || this.camera.fov;
    const f = fov || this.fov0; if (this.camera.fov !== f) { this.camera.fov = f; this.camera.updateProjectionMatrix(); }
    const dir = V3().subVectors(look, pos).setY(0).normalize(), side = V3(dir.z, 0, -dir.x);
    const s = (this.lineIdx % 2 ? 1 : -1) * drift;
    const p1 = pos.clone().addScaledVector(side, s).addScaledVector(dir, drift * 0.4);
    this.cam = { p0: pos, p1: free ? p1 : this.unblock(look, p1), l0: look, l1: look.clone(), t: 0, dur };
    if (snap) this.snapCam();
  }
  // 壁・天井に入らないよう、見る点の側へ寄せる
  unblock(look, pos) {
    if (!this.T) return pos;
    // 区画の外や遠く（遠景の城・樹・空）を見るときは、一行のいる所からカメラへ向かって調べる
    // （見る点の側から調べると、区画の外はすべて壁あつかいなので、カメラが見る点のそばまで飛んでしまう）
    const from = this.T.at(look.x, look.z) < 0 || look.distanceTo(pos) > 40 ? V3(this.O.x, pos.y, this.O.z) : look;
    const n = 24; let last = from.clone();
    for (let i = 1; i <= n; i++) {
      const p = V3().lerpVectors(from, pos, i / n);
      if (this.T.blocksView(p.x, p.y, p.z)) return i > 3 ? last : V3().lerpVectors(from, pos, 0.15);
      last = p;
    }
    return pos;
  }
  shot(kind, o = {}) {
    const st = this.st;
    let pos, look;
    if (typeof kind === 'object') { pos = this.WP(kind.pos); look = this.WP(kind.look); }
    else if (st.shots && st.shots[kind]) { pos = this.WP(st.shots[kind].pos); look = this.WP(st.shots[kind].look); const S = st.shots[kind]; if (S.free || S.fov) o = { ...o, free: !!S.free, fov: S.fov }; }   // free：区画の外までカメラを引く／fov：画角（遠くから全体を映す）
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
    return this.sceneryBlocks(pos, look);
  }
  // 話し手の顔が隠れずに映るか：顔の中心・左右・頭の上・あごへの線が、景色やほかの子に当たらないかを調べる
  // 隠れている点の数を返す（0 なら顔がぜんぶ見える）
  faceBlocked(pos, a) {
    const sc = a.m.group.scale.y || 1, h = a.headPos(), up = V3(0, 1, 0), right = V3().subVectors(h, pos).setY(0).normalize().cross(up);
    const pts = [h, h.clone().addScaledVector(right, 0.28 * sc), h.clone().addScaledVector(right, -0.28 * sc), h.clone().addScaledVector(up, 0.42 * sc), h.clone().addScaledVector(up, -0.18 * sc)];
    const others = Object.values(this.actors).filter(b => b !== a && !b.comm && b.visible());
    const hits = (p, c, r) => { const d = V3().subVectors(p, pos), t = clamp(V3().subVectors(c, pos).dot(d) / d.lengthSq(), 0, 1); return t < 0.97 && pos.clone().addScaledVector(d, t).distanceTo(c) < r; };
    let n = 0;
    for (const p of pts) if (this.sceneryBlocks(pos, p) || others.some(b => { const bs = b.m.group.scale.y || 1, body = b.pos.clone(); body.y += b.headH * 0.4; return hits(p, b.headPos(), 0.42 * bs) || hits(p, body, 0.36 * bs); })) n++;
    // ほかの子がカメラのすぐ前にいて、画面を大きくふさぐのも避ける
    const fd = V3().subVectors(h, pos), dist = fd.length(); fd.normalize();
    for (const b of others) { const v = V3().subVectors(b.headPos(), pos), d = v.length(); if (d < dist * 0.75 && Math.acos(clamp(v.dot(fd) / d, -1, 1)) < 0.5) n++; }
    return n;
  }
  // 景色（鳥居の柱・灯籠・建物・木など）が、カメラと見る点のあいだに入っているか
  sceneryBlocks(pos, look) {
    if (!this.blockers) {
      const mine = new Set(); for (const a of Object.values(this.actors)) a.m.group.traverse(o => mine.add(o));
      const shown = o => { for (let p = o; p; p = p.parent) if (!p.visible) return false; return true; };
      this.blockers = [];
      this.scene.traverse(o => { const m = o.material; if (o.isMesh && !mine.has(o) && m && !m.transparent && m.blending !== THREE.AdditiveBlending && shown(o)) this.blockers.push(o); });
      this.rc = new THREE.Raycaster();
    }
    const d = V3().subVectors(look, pos), far = d.length() - 0.35;
    if (far <= 0) return false;
    this.rc.set(pos, d.normalize()); this.rc.near = 0.05; this.rc.far = far; this.rc.camera = this.camera;
    return this.rc.intersectObjects(this.blockers, false).length > 0;
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
    // 手前に誰かや何かがあったら、反対側から・回りこんで・もう少し寄って撮る。どこからも隠れるなら、いちばん隠れが少ない所から
    let pick = null, best = null;
    for (const dist of [dist0, dist0 * 0.8, dist0 * 0.66]) {
      for (const ang of [0.23, -0.23, 0.6, -0.6, 1.0, -1.0, 1.4, -1.4]) {
        const c = make(ang, dist), n = this.faceBlocked(c[0], a) + (this.occluded(c[0], c[1], [a]) ? 0.5 : 0);
        if (n === 0) { pick = c; break; }
        if (!best || n < best.n) best = { c, n };
      }
      if (pick) break;
    }
    const [pos, look] = pick || best.c;
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
    // 姿のない話し手（voices）：みんなは、その小物のほうを見る
    const vp = !A && (this.st.voices || {})[sp];
    if (vp) for (const a of this.party) if (!(d.look && (d.look[a.key] || d.look.all))) a.look = this.point(vp);
    // 通信が終わったらホログラムを消す
    if (this.commOn && this.commOn !== sp && !(A && A.comm)) { const c = this.actors[this.commOn]; if (c && this.sinceComm++ > 0) { c.want = 0; this.commOn = null; } }
    if (A && A.comm) this.sinceComm = 0;
    this.camFor(sp, A, d);
    this.last = sp;
  }
  lineDone() { this.stopTalk(); }
  // 歩いている人物がいるか（台本の waitMove で、着くまで次の行を待つ）。空中ブランコで跳んだり落ちたりしているあいだも
  walking() { return Object.values(this.actors).some(a => a.path && a.path.length) || !!(this.tz && this.tz.moving()); }
  stopTalk() { for (const a of Object.values(this.actors)) if (!a.foe) a.talk(false); }
  // カメラの選び方
  camFor(sp, A, d) {
    // keep：前の行のカメラのまま（切りかえは later の cam で）
    if (d.cam === 'keep') { this.lastShot = 'keep'; return; }
    if (d.cam) { this.shot(d.cam, { to: this.addr, drift: d.drift ?? 0.3, dur: d.dur || 5, close: d.close }); this.lastShot = d.cam; return; }
    // 姿のない話し手は、その小物を映す（shots に同じ名前の画があれば、その画）。続けて話すあいだは切りかえない
    if (!A && (this.st.voices || {})[sp]) { const v = this.st.voices[sp], k = (this.st.shots || {})[v] ? v : 'look:' + v; if (this.lastShot !== k) this.shot(k, { drift: 0.3, dur: 6 }); this.lastShot = k; return; }
    if (!A) { this.shot('wide', { drift: 0.5, dur: 7 }); this.lastShot = 'wide'; return; }
    // 登場しながら話す行は、歩いてくるところが映るよう引きの画にする
    if (d.enter) { this.shot('wide', { drift: 0.3, dur: 6 }); this.lastShot = 'wide'; return; }
    if (A.foe) { this.shot('foe:' + A.key, { drift: 0.2, dur: 4 }); this.lastShot = 'foe'; return; }
    // 横になっている子（寝袋で眠るなど）は、寄りの画が地面すれすれになるので引きで
    if (A.lie) { this.shot('wide', { drift: 0.3, dur: 5 }); this.lastShot = 'wide'; return; }
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
    // 直前の話し手の肩越しに（ミケ自身が話したあとなら、ミケだけを映す。自分の肩越しにはできない）
    const L = this.last !== HERO && this.actors[this.last] && !this.actors[this.last].foe && !this.actors[this.last].comm ? this.actors[this.last] : null;
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
    // 自分自身は見ない（all でまとめて指定したとき。頭の向きが決まらなくなる）
    each(d.look, (a, v) => { if (v === a.key) return; a.look = v === null ? null : this.point(v) && !this.actors[v] ? this.point(v) : v; });
    each(d.face, (a, v) => { a.faceT = typeof v === 'number' ? v : this.actors[v] ? v : Array.isArray(v) ? this.W(v[0], v[1]) : this.point(v); });
    each(d.stance, (a, v) => { a.setStance(v === 'ready' ? (CHAR_ACT[a.base] || {}).ready || 'ready' : v); if (v === 'ready' && !a.foe) a.showWeapon(true); });
    each(d.move, (a, v) => { const pts = (Array.isArray(v[0]) ? v : [v]).map(p => this.W(p[0], p[1])); a.walkTo(pts, d.speed || 1.6); });
    each(d.hold, (a, v) => a.hold(v));
    each(d.weapon, (a, v) => { a.showWeapon(v); if (v) { this.fx.sprite(a.m.handPos(), (CHARS[a.key] || NPCS[a.key] || {}).color || ELEMENTS.physical.color, 1.0, 0.5); Sfx.zap(); } });
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
  // 登場：敵は赤い閃光、それ以外は風を巻いて現れる（style 'quiet'：演出なしで姿だけ見せる。遠くから転がってくる岩など）
  enter(k, style) {
    const list = Object.values(this.actors).filter(a => a.key === k || a.base === k);
    list.forEach((a, i) => {
      a.m.group.visible = true; a.alpha = 1;
      if (a.still) { a.still = false; a.m.critter.setPose(POSES.ready); a.m.critter.face.shut = false; a.faceT = this.O.clone(); }   // 石像が目をさまして、一行のほうを向く
      if (style === 'quiet') return;
      const p = a.pos.clone(); p.y += 1 + a.lift;
      if (a.foe) { this.fx.pillar(a.pos, a.m.color || '#ff4d6d', { h: 4, r: 0.8, life: 0.6 }); this.p.burst(p, a.m.color || '#ff4d6d', 40, { speed: 4, life: 0.8 }); a.roar(); }
      else { const pp = a.pos.clone(); pp.y += 0.6 + a.lift; this.p.burst(pp, (CHARS[a.key] ? CHARS[a.key].color : '#ffffff'), 40, { speed: 3, life: 0.9, up: 0.5 }); }
    });
    if (style === 'quiet') return;
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
// ---------- 空中ブランコ（舞台の st.trapeze：{ bars: [[右, 前], ...], top: 支点の高さ, len: 綱の長さ }） ----------
//   支点からつるしたバーが、舞台の左右の向きにふり子のようにゆれる。台本の fx 'tz:命令,引数,…' で、役者を乗せて演じさせる
//   mount,役,バー[,hang|knees|sit[,秒]] … 床から跳びついて、バーにぶらさがる（knees：ひざをかけて、さかさまの受け手。sit：バーの上で丸くなる）
//   swing[,バー]                         … ゆれはじめる（となりのバーとは逆向きに。まん中で近づく）。バーを書けば、そのバーだけ
//   fly,跳ぶ役[,受ける役]                … つぎに相手へいちばん近づいたときに手をはなし、受ける役の手へ跳ぶ（受ける役がいなければ、そのまま落ちる）
//   drop,役[,下の役]                      … バーがいちばん下をすぎるときに手をはなして落ちる（その役の手にぶらさがっている役も、いっしょに）。下の役がいれば、その上に重なる
//   down                                  … みんなブランコから下りて、乗る前の場所へもどり、バーのゆれもおさまっていく
const TZ_HANG = 1.18, TZ_W = 2.42;   // ぶらさがった手から足までの長さ（m）、ゆれの速さ（ひとゆれ 2.6 秒）
class TrapezeRig {
  constructor(v, o) {
    this.v = v; this.len = o.len || 3.6; this.time = 0; this.riders = {};
    const th = v.st.face * Math.PI / 180, top = o.top || 8.2;
    this.yaw = Math.atan2(-v.F.x, -v.F.z);   // 乗った役は、一行（カメラ）のほうを向く
    this.bars = o.bars.map(([lx, lz], i) => {
      const piv = v.W(lx, lz, top), g = new THREE.Group(); g.position.copy(piv); g.rotation.y = -th; v.scene.add(g);
      const sw = new THREE.Group(); g.add(sw);
      const rope = toon('#ffd27a'), gold = toon('#e8b84a');
      for (const sz of [-0.8, 0.8]) { const r = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, this.len, 6), rope); r.position.set(0, -this.len / 2, sz); sw.add(r); }
      const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.8, 10), gold); bar.rotation.x = Math.PI / 2; bar.position.y = -this.len; bar.castShadow = true; sw.add(bar);
      // 支点の金具と、天井へのびる吊り綱
      const cap = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 1.9), gold); g.add(cap);
      for (const sz of [-0.9, 0.9]) { const c = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 4, 5), rope); c.position.set(0, 2, sz); g.add(c); }
      return { piv, sw, amp: 0, ampT: 0, ph: i % 2 ? Math.PI : 0, theta: 0 };
    });
    v.zoneTicks.push(dt => this.update(dt));
  }
  update(dt) {
    this.time += dt;
    for (const b of this.bars) { b.amp += Math.sign(b.ampT - b.amp) * Math.min(Math.abs(b.ampT - b.amp), dt * 0.45); b.theta = b.amp * Math.sin(TZ_W * this.time + b.ph); b.sw.rotation.z = b.theta; }
  }
  cmd(arg) { const [c, ...p] = String(arg).split(','); if (this[c]) this[c](...p); }
  moving() { return Object.values(this.riders).some(r => r.state !== 'ride' && r.state !== 'lie'); }
  // バーの位置と、綱の向き（支点から下へ）
  barAt(b) { const v = this.v, s = Math.sin(b.theta), c = Math.cos(b.theta); const d = v.R.clone().multiplyScalar(s).add(V3(0, -c, 0)); return { d, bar: b.piv.clone().addScaledVector(d, this.len) }; }
  // 乗っている役の足もとの位置と、体のかたむき（hang：手がバー。knees：さかさまで、足がバー。under：受ける役の手に、手でぶらさがる。sit：バーの上）
  seat(r) {
    if (r.mode === 'under') {
      const q = this.riders[r.on], { d, bar } = this.barAt(this.bars[q.bar]), hands = bar.clone().addScaledVector(d, TZ_HANG - 0.15);
      return { pos: hands.addScaledVector(d, TZ_HANG), roll: this.bars[q.bar].theta };
    }
    const b = this.bars[r.bar], { d, bar } = this.barAt(b);
    if (r.mode === 'knees') return { pos: bar.addScaledVector(d, -0.15), roll: b.theta + Math.PI };
    if (r.mode === 'sit') return { pos: bar.addScaledVector(d, -0.02), roll: b.theta };
    return { pos: bar.addScaledVector(d, TZ_HANG), roll: b.theta };
  }
  mount(key, bi, mode = 'hang', sec = 0.9) {
    const a = this.v.actors[key]; if (!a) return;
    if (!a.home) a.home = a.pos.clone();
    const old = this.riders[key], from = old ? old.p.clone() : a.pos.clone();
    const r = this.riders[key] = { a, bar: +bi, mode, state: 'jump', t: 0, dur: +sec, from, p: from.clone(), roll0: old ? old.roll || 0 : 0 };
    a.path = null; Sfx.swing();
    a.rig = (P, dt) => this.drive(r, P, dt);
  }
  swing(bi) { this.bars.forEach((b, i) => { if (bi == null || +bi === i) b.ampT = 0.72; }); }
  // 相手のバーへいちばん近づく時（fly）、いちばん下をすぎる時（drop）まで待つ
  nextPhase(b, target, period) { const cur = TZ_W * this.time + b.ph; let dt = ((target - cur) % period + period * 4) % period / TZ_W; if (dt < 0.3) dt += period / TZ_W; return this.time + dt; }
  fly(key, to) {
    const r = this.riders[key]; if (!r) return;
    const b = this.bars[r.bar], other = to && this.riders[to] ? this.bars[this.riders[to].bar] : this.bars.find(x => x !== b) || b;
    const s = Math.sign(V3().subVectors(other.piv, b.piv).dot(this.v.R)) || 1;
    Object.assign(r, { state: 'wait', release: this.nextPhase(b, s > 0 ? Math.PI / 2 : Math.PI * 1.5, Math.PI * 2), to: to && this.riders[to] ? to : null, s });
  }
  drop(key, onto) {
    const r = this.riders[key]; if (!r) return;
    Object.assign(r, { state: 'wait', release: this.nextPhase(this.bars[r.bar], 0, Math.PI), drop: true, onto: onto || null });
  }
  down() {
    for (const r of Object.values(this.riders)) Object.assign(r, { state: 'down', t: 0, dur: 0.9, from: r.p.clone(), roll0: r.roll || 0, lie0: r.lie || 0 });
    this.bars.forEach(b => { b.ampT = 0; });
  }
  // 落ちはじめる（手にぶらさがっている役も、いっしょに）
  fall(r, vx) {
    Object.assign(r, { state: 'fall', vel: this.v.R.clone().multiplyScalar(vx || 0), stack: 0 });
    // 手にぶらさがっていた役は、下にいるので先に着く。落としたほうは、その上に重なる
    for (const q of Object.values(this.riders)) if (q.mode === 'under' && q.on === r.a.key && q.state === 'ride') { Object.assign(q, { state: 'fall', vel: r.vel.clone(), onto: r.onto, stack: 0 }); r.stack = 1; }
  }
  drive(r, P, dt) {
    const a = r.a, g = a.m.group, v = this.v;
    let pos, roll;
    const pose = k => { const Q = POSES[k]; for (const key of POSE_KEYS) if (Q[key] != null) P[key] = Q[key]; };
    if (r.state === 'jump' || r.state === 'fly') {
      r.t += dt; const k = Math.min(1, r.t / r.dur), e = k * k * (3 - 2 * k), S = this.seat(r);
      pos = r.from.clone().lerp(S.pos, e); pos.y += Math.sin(k * Math.PI) * (r.state === 'fly' ? 0.7 : 1.2); roll = lerp(r.roll0, S.roll, e);
      if (k >= 1) { r.state = 'ride'; if (r.mode === 'under') { Sfx.tone(880, 0.12, 'triangle', 0.05); v.p.burst(pos.clone().add(V3(0, 1.1, 0)), '#ffe8a0', 16, { speed: 2, life: 0.5, size: 0.08 }); } }
    } else if (r.state === 'ride' || r.state === 'wait') {
      const S = this.seat(r); pos = S.pos; roll = S.roll;
      // 下で受ける役が、まだ歩いているあいだは、つぎにいちばん下をすぎるときまで待つ
      if (r.state === 'wait' && this.time >= r.release && r.drop && r.onto && v.actors[r.onto] && v.actors[r.onto].path) r.release = this.nextPhase(this.bars[r.bar], 0, Math.PI);
      if (r.state === 'wait' && this.time >= r.release) {
        if (r.drop) this.fall(r, 0);
        else if (r.to) Object.assign(r, { state: 'fly', t: 0, dur: 0.55, from: pos.clone(), roll0: roll, mode: 'under', on: r.to });
        else this.fall(r, r.s * 2.6);
        Sfx.swing();
      }
    } else if (r.state === 'fall') {
      r.vel.y -= 13 * dt; pos = r.p.clone().addScaledVector(r.vel, dt); roll = (r.roll || 0) * Math.exp(-4 * dt);
      const under = r.onto && v.actors[r.onto], land = under ? under.pos.y + 0.5 + (r.stack || 0) * 0.42 : v.gy(pos.x, pos.z);
      if (pos.y <= land) {
        pos.y = land; r.state = 'lie'; r.lie = (r.stack ? -1 : 1) * Math.PI / 2; r.landAt = pos.clone();
        Sfx.hit(); GFX.shake(0.25); v.p.burst(pos.clone().add(V3(0, 0.3, 0)), '#f4e8f0', 24, { speed: 2.5, up: 0.8, life: 0.7, size: 0.12 });
        if (under) { under.setStance('crouch'); under.setFace('pained'); }
      }
    } else if (r.state === 'lie') { pos = r.landAt; roll = 0; }
    else if (r.state === 'down') {
      r.t += dt; const k = Math.min(1, r.t / r.dur), e = k * k * (3 - 2 * k);
      pos = r.from.clone().lerp(a.home, e); pos.y += Math.sin(k * Math.PI) * 1.0; roll = lerp(r.roll0, 0, e); r.lie = lerp(r.lie0 || 0, 0, e);
      if (k >= 1) {
        a.rig = null; a.pos.copy(a.home); a.home = null; a.lie = 0; a.lift = 0; delete this.riders[a.key];
        for (const q of Object.values(v.actors)) if (q.stance === 'crouch' && !this.riders[q.key]) q.setStance((CHAR_ACT[q.base] || {}).stance || 'idle');
        return;
      }
    }
    r.roll = roll; r.p = pos.clone();
    if (r.state === 'lie') { g.position.copy(pos); g.rotation.set(0, this.yaw, r.lie); pose('hang'); return; }
    if (r.state === 'down') { g.position.copy(pos); g.rotation.set(0, this.yaw, roll + (r.lie || 0)); return; }
    g.position.copy(pos); g.rotation.set(0, this.yaw, roll);
    if (r.mode === 'sit' && r.state === 'ride') pose('sleep'); else pose(r.mode === 'knees' ? 'hangKnees' : 'hang');
  }
}

// ---------- 動く小道具（台本の fx 'item:名前,動き,引数…'。名前ごとに一つ。はじめて使うときに作る） ----------
//   futon（ふとん）：show,右,前（床に置く）／lift,役（頭の上にかかげる）／throw,役（放り投げて、その役の頭にばさっとかぶさる）／
//                    bed,役（その役の下に敷く）／tug（ゆさゆさ引っぱられる）／back（床の元の場所へ）／hide
//   can（アルミ缶）：show,右,前（床に立てる）／stand,役（その役が、ぴょんと缶の上にのる）／crush（べこっとつぶれる）／
//                    slice（輪切りになって、ころころ並ぶ）／fish（魚が一ぴき、上にぽとっとのる）／reset（新しい缶。のっていた役は元の場所へ）／hide
const STAGE_ITEMS = {
  futon(v) {
    const g = new THREE.Group(); g.visible = false; v.scene.add(g);
    const flat = new THREE.Group(); g.add(flat);
    const pink = toon('#ff9ab8'), white = toon('#fff4f0');
    const q = new THREE.Mesh(new THREEX.RoundedBoxGeometry(1.3, 0.12, 0.95, 2, 0.05), pink); q.position.y = 0.06; q.castShadow = true; flat.add(q);
    for (const x of [-0.4, 0, 0.4]) { const st = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.125, 0.96), white); st.position.set(x, 0.06, 0); flat.add(st); }
    const pil = new THREE.Mesh(new THREEX.RoundedBoxGeometry(0.42, 0.12, 0.3, 2, 0.05), white); pil.position.set(-0.42, 0.16, 0); flat.add(pil);
    // 頭にかぶさった形：頭をすっぽりおおう、ふくらんだおわん（どの向きから見ても顔がかくれる）。すそは少し波打つ
    const dg = new THREE.SphereGeometry(0.62, 22, 12, 0, Math.PI * 2, 0, 2.0), dp = dg.attributes.position;
    for (let i = 0; i < dp.count; i++) { const x = dp.getX(i), z = dp.getZ(i), y = dp.getY(i); if (y < 0) dp.setY(i, y + Math.sin(Math.atan2(z, x) * 5) * 0.05); }
    dg.computeVertexNormals();
    const dr = new THREE.Mesh(dg, new THREE.MeshToonMaterial({ color: '#ff9ab8', side: THREE.DoubleSide })); dr.scale.set(1, 1.05, 1); dr.visible = false; dr.castShadow = true; g.add(dr);
    for (const x of [-0.25, 0.25]) { const st = new THREE.Mesh(new THREE.TorusGeometry(Math.sqrt(0.62 * 0.62 - x * x) + 0.005, 0.022, 6, 24, Math.PI), white); st.rotation.y = Math.PI / 2; st.position.x = x; dr.add(st); }   // しま模様（おわんの面にそって）
    const it = { g, home: null,
      put(p, yaw = 0) { v.scene.attach(g); g.position.copy(p); g.rotation.set(0, yaw, 0); g.scale.set(1, 1, 1); flat.visible = true; dr.visible = false; g.visible = true; },
      show(lx, lz) { it.home = v.W(+lx, +lz); it.put(it.home, Math.PI / 2 - v.st.face * Math.PI / 180); Sfx.fluff(); },
      back() { if (it.home) it.put(it.home, Math.PI / 2 - v.st.face * Math.PI / 180); },
      hide() { v.scene.attach(g); g.visible = false; },
      lift(k) { const a = v.actors[k]; if (!a) return; g.visible = true; flat.visible = true; dr.visible = false; a.m.group.attach(g); const h = a.headH / (a.m.group.scale.y || 1); GFX.tween(0.35, e => { g.position.lerp(V3(0, h + 0.45, 0.05), e); g.rotation.set(0, 0, 0); }); },
      throw(k) {
        const a = v.actors[k]; if (!a) return;
        v.scene.attach(g); const from = g.position.clone(), r0 = g.rotation.y; Sfx.swing();
        GFX.tween(0.75, e => { const to = a.headPos(); g.position.lerpVectors(from, to, e); g.position.y += Math.sin(e * Math.PI) * 1.6; g.rotation.set(Math.sin(e * Math.PI * 2) * 0.6, r0 + e * Math.PI * 2, 0); }).then(() => {
          a.m.group.attach(g); g.position.set(0, a.headH / (a.m.group.scale.y || 1) - 0.08, 0); g.rotation.set(0, 0, 0); flat.visible = false; dr.visible = true;
          Sfx.fluff(); GFX.tween(0.3, e => { g.scale.set(1 + Math.sin(e * Math.PI) * 0.15, 1 - Math.sin(e * Math.PI) * 0.2, 1); });
        });
      },
      bed(k) { const a = v.actors[k]; if (!a) return; it.put(a.pos.clone(), a.yaw + Math.PI / 2); a.lift = 0.1; it.sleeper = a; },
      tug() { const p0 = g.position.clone(), d = v.R.clone(); GFX.tween(1.2, e => { g.position.copy(p0).addScaledVector(d, Math.sin(e * Math.PI * 6) * 0.08 * (1 - e)); }); },
    };
    const back0 = it.back; it.back = () => { if (it.sleeper) { it.sleeper.lift = 0; it.sleeper = null; } back0(); };
    return it;
  },
  can(v) {
    const g = new THREE.Group(); g.visible = false; v.scene.add(g);
    const body = new THREE.Group(); g.add(body);
    const metal = new THREE.MeshStandardMaterial({ color: '#d8dce4', metalness: 0.8, roughness: 0.3 });
    const c = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.32, 18), metal); c.position.y = 0.16; c.castShadow = true; body.add(c);
    const band = new THREE.Mesh(new THREE.CylinderGeometry(0.113, 0.113, 0.12, 18), toon('#e04a5a')); band.position.y = 0.16; body.add(band);
    const top = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.012, 6, 18), metal); top.rotation.x = Math.PI / 2; top.position.y = 0.32; body.add(top);
    const rings = [0, 1, 2, 3, 4].map(i => { const r = new THREE.Group(); const m1 = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.055, 18), i === 2 ? toon('#e04a5a') : metal); r.add(m1); r.visible = false; g.add(r); return r; });
    const fish = new THREE.Group(); fish.visible = false; g.add(fish);
    { const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 12, 8), toon('#8ab8d8')); f.scale.set(0.6, 0.55, 2.0); fish.add(f); const t = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 3), toon('#6a98b8')); t.rotation.x = -Math.PI / 2; t.position.z = -0.24; t.scale.y = 0.35; fish.add(t); const e = new THREE.Mesh(new THREE.SphereGeometry(0.018, 6, 4), toon('#2a1a2a')); e.position.set(0.05, 0.03, 0.12); fish.add(e); }
    const it = { g,
      show(lx, lz) { g.position.copy(v.W(+lx, +lz)); g.visible = true; it.reset(); },
      hide() { g.visible = false; if (it.on) it.off(); },
      reset() { body.visible = true; body.scale.set(1, 1, 1); rings.forEach(r => { r.visible = false; }); fish.visible = false; if (it.on) it.off(); },
      // のっている役を、のる前の場所へ
      off() { const a = it.on; it.on = null; const p0 = a.pos.clone(); GFX.tween(0.4, e => { a.pos.lerpVectors(p0, it.from, e); a.lift = Math.sin(e * Math.PI) * 0.4; }).then(() => { a.lift = 0; }); },
      stand(k) { const a = v.actors[k]; if (!a) return; it.on = a; it.from = a.pos.clone(); a.path = null; const p0 = a.pos.clone(), to = g.position.clone(); Sfx.swing(); GFX.tween(0.5, e => { a.pos.lerpVectors(p0, to, e); a.lift = 0.32 * e + Math.sin(e * Math.PI) * 0.5; }); },
      // べこっ：缶がつぶれて、のっていた子は、しりもちをつくように元の場所へぴょんとおりる（つぶれた缶が見えるように）
      crush() { Sfx.hit(); GFX.shake(0.12); GFX.tween(0.15, e => { body.scale.set(1 + e * 0.4, 1 - e * 0.8, 1 + e * 0.4); if (it.on) it.on.lift = 0.32 * (1 - e * 0.8); }).then(() => GFX.delay(0.35)).then(() => { if (it.on) it.off(); }); v.p.burst(g.position.clone().add(V3(0, 0.1, 0)), '#e8ecf4', 16, { speed: 2, up: 0.5, life: 0.5, size: 0.06 }); },
      slice() {
        body.visible = false; Sfx.zap(); v.fx.sprite(g.position.clone().add(V3(0, 0.2, 0)), '#ffffff', 1, 0.3);
        rings.forEach((r, i) => { r.visible = true; const to = v.R.clone().multiplyScalar((i - 2) * 0.26); GFX.tween(0.6, e => { r.position.set(to.x * e, lerp(0.03 + 0.06 * i, 0.11, e) + Math.sin(e * Math.PI) * 0.15, to.z * e); r.rotation.set(Math.PI / 2 * e, 0, 0); }); });   // 輪は、ころがるように立って並ぶ（立つと、半径ぶん浮く）
      },
      fish() { fish.visible = true; GFX.tween(0.6, e => { const b = e < 0.7 ? 1 - (e / 0.7) ** 2 : Math.sin((e - 0.7) / 0.3 * Math.PI) * 0.08; fish.position.set(0, 0.36 + 0.06 + b * 2.4, 0); fish.rotation.set(0, e * 3, 0); }).then(() => { Sfx.tone(320, 0.12, 'sine', 0.05, -80); }); },
    };
    return it;
  },
};

// ---------- 物語の出来事の演出（台本の fx: '名前:引数' で呼ぶ。this は StageView） ----------
const STAGE_FX = {
  // 流れ星が落ちる（夜の丘）
  meteor(arg) {
    // 一行の後ろから見て、左上の空の奥から飛んでくる（look: のカメラの画に、はじめから入るように）
    const to = this.point(arg || 'crater') || this.W(0, 10), from = to.clone().addScaledVector(this.R, -32).addScaledVector(this.F, 15).add(V3(0, 26, 0));
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
  // 笑顔の塔：むすっと幕が、ぷっと吹き出して、笑った顔になって巻き上がる（区画の seals の look: 'laugh'）
  curtain() { const o = (this.sealObjs || []).find(q => q.S.look === 'laugh' && !q.open); if (!o) return; o.open = true; GFX.shake(0.25); STAGE_FX.confetti.call(this, 'curtain'); },
  // 大きなびっくり箱が笑って「ばあっ！」と開く（jackPop）。わきへ跳びのく（jackHop）。しょんぼり顔でのぞいて、ひっこむ（jackPeek）。区画の rubble の look: 'jackbox'
  jackPop() { const o = (this.rubbleObjs || []).find(q => q.R.look === 'jackbox'); if (o && o.pop) o.pop(); },
  jackPeek() { const o = (this.rubbleObjs || []).find(q => q.R.look === 'jackbox'); if (o && o.peek) o.peek(); },
  jackHop() { const o = (this.rubbleObjs || []).find(q => q.R.look === 'jackbox'); if (o && o.hop) o.hop(); },
  // ピコッ！：ピコピコハンマーを持った役が、arg の子のところへ飛んでいって、頭をたたいて、元の場所へもどる
  piko(arg) {
    const a = Object.values(this.actors).find(q => q.hammer), b = this.actors[arg || HERO]; if (!a || !b || a.bonking) return;
    const pv = a.hammer, g = a.m.group, rest = pv.userData.rest, tilt = pv.userData.tilt, HIT = PIKO.hit;
    // ななめ前（右）から来て、ななめうしろ向きにたたく（正面から映しても、両方が見える）
    const f = this.R.clone().add(this.F).multiplyScalar(-1).normalize(), yawT = Math.atan2(f.x, f.z);
    // 振りおろした形（rotation.x = HIT、かたむきなし）で、たたく面のまん中が体の足もとからどこにあるかを測る
    //   ふわふわ浮く体は、上下のゆれのまん中で測り、たたくあいだは、ゆれのぶんを浮きの高さで打ち消す
    const inner = a.m.inner, mid = a.m.float ? 0.1 : inner.position.y, bob = () => mid - inner.position.y;
    const sp = g.position.clone(), sr = g.rotation.clone(), px = pv.rotation.x, pz = pv.rotation.z, iy = inner.position.y;
    g.position.set(0, 0, 0); g.rotation.set(0, yawT, 0); pv.rotation.set(HIT, 0, 0); inner.position.y = mid; g.updateMatrixWorld(true);
    const face = pv.userData.head.localToWorld(V3(0, PIKO.half + 0.03, 0));
    g.position.copy(sp); g.rotation.copy(sr); pv.rotation.set(px, 0, pz); inner.position.y = iy;
    // たたく面が、ちょうど頭のてっぺんにのる場所へ（足もとの高さの差は、浮いてうめる）
    const top = b.pos.clone(); top.y += b.m.height * 1.02;
    const to = top.clone().sub(face), lift = to.y - b.pos.y; to.y = b.pos.y;
    const home = a.pos.clone(), y0 = a.yaw, face0 = a.faceT;
    a.bonking = true; a.faceT = yawT;
    GFX.tween(0.45, e => { a.pos.lerpVectors(home, to, e); a.lift = (lift + bob()) * e; a.yaw = lerpAngle(y0, yawT, e); pv.rotation.x = lerp(rest, -0.7, e); pv.rotation.z = lerp(tilt, 0, e); }, Ease.inOut).then(() =>
      GFX.tween(0.14, e => { a.lift = lift + bob(); pv.rotation.x = lerp(-0.7, HIT, e * e); }).then(() => {
        Sfx.tone(1400, 0.06, 'square', 0.05); Sfx.tone(1900, 0.08, 'square', 0.04, 0, 0.05); STAGE_FX.poof.call(this, b.key); b.setFace('pained'); b.gesture('recoil');
        // ピコッ：頭がぺこっとつぶれて、はねかえる
        GFX.tween(0.4, e => { a.lift = lift + bob(); pv.userData.head.scale.set(1, 1 - Math.sin(Math.min(1, e / 0.6) * Math.PI) * 0.35, 1); pv.rotation.x = HIT - Math.sin(Math.min(1, e / 0.6) * Math.PI) * 0.25; }).then(() => GFX.tween(0.5, e => { a.pos.lerpVectors(to, home, e); a.lift = (lift + bob()) * (1 - e); pv.rotation.x = lerp(HIT, rest, e); pv.rotation.z = lerp(0, tilt, e); }, Ease.inOut).then(() => { a.bonking = false; a.faceT = face0; a.lift = 0; }));
      }));
  },
  // 動く小道具：item:名前,動き,引数…（STAGE_ITEMS）
  item(arg) { const [name, act, ...p] = String(arg).split(','); const items = this.items || (this.items = {}); const it = items[name] || (STAGE_ITEMS[name] && (items[name] = STAGE_ITEMS[name](this))); if (it && it[act]) it[act](...p); },
  // ふわふわとのぼっていく：rise:役[,balloons]（敵は e: をはぶいて書ける。fx の引数は : で切れるため）。左右にゆれながら天井をすりぬけて、見えなくなる。
  //   ピコピコハンマーを持っていれば、振りながら。balloons：頭の上に風船を三つ持って
  rise(arg) {
    const [k, opt] = String(arg || '').split(','), a = this.actors[k] || this.actors['e:' + k]; if (!a || a.rising) return;
    a.rising = true;
    if (opt === 'balloons') {
      const cols = ['#ff6a8a', '#ffd27a', '#6ad8ff'], h = (a.m.height || 1.4) / (a.m.group.scale.x || 1);
      cols.forEach((c, i) => {
        const x = (i - 1) * 0.32, y = h + 0.9 + (i === 1 ? 0.2 : 0);
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.26, 14, 10), toon(c)); b.scale.y = 1.18; b.position.set(x, y, 0); a.m.group.add(b);
        const str = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, y - h + 0.2, 4), toon('#ffffff')); str.position.set(x / 2, (y + h - 0.2) / 2, 0); str.rotation.z = Math.atan2(x / 2, y - h + 0.2); a.m.group.add(str);
      });
    }
    const x0 = a.pos.clone(), l0 = a.lift, pv = a.hammer;
    Sfx.tone(523, 0.6, 'sine', 0.04, 260); Sfx.tone(784, 0.7, 'triangle', 0.03, 300, 0.2);
    GFX.tween(3.6, e => {
      a.lift = l0 + e * e * 9;
      a.pos.copy(x0).addScaledVector(this.R, Math.sin(e * Math.PI * 3) * 0.35 * (1 - e * 0.5));
      if (pv) pv.rotation.x = pv.userData.rest + Math.sin(e * Math.PI * 8) * 0.6;
      if (Math.random() < 0.3) this.p.emit(a.pos.clone().add(V3(0, a.lift + 0.4, 0)), V3((Math.random() - 0.5) * 0.4, -0.3, (Math.random() - 0.5) * 0.4), hdr(pick(['#ffe8a0', '#ffd8f4', '#d8d8ff']), 1.6), { life: 1.2, size: 0.08, drag: 0.4 });
    }).then(() => { a.m.group.visible = false; a.alpha = 0; });
  },
  // 空中ブランコ：tz:命令,引数…（TrapezeRig）
  tz(arg) { if (this.tz) this.tz.cmd(arg); },
  // 紙吹雪：arg の点（なければ舞台のまん中）の上から、色とりどりの紙が舞い落ちる
  confetti(arg) {
    const c = (this.point(arg) || this.O.clone().add(V3(0, 2, 0))).clone(), cols = ['#ff6a8a', '#ffd27a', '#6ad8ff', '#8aff9a', '#c88aff'];
    for (let i = 0; i < 5; i++) GFX.delay(i * 0.12).then(() => this.p.burst(c.clone().add(V3((Math.random() - 0.5) * 5, 1.5 + Math.random(), (Math.random() - 0.5) * 3)), pick(cols), 40, { speed: 4, up: 1.5, life: 2.2, grav: 1.5, size: 0.11 }));
    Sfx.laugh();
  },
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
  // 遠くのにゃんだーの樹が光る（第八章の終わり。村から見上げる）
  treeShine() {
    const ft = this.env.farTree; if (!ft) return;
    const h0 = ft.halo.material.color.clone(), e0 = ft.leaf.emissive.clone(), glow = hdr('#fff4c8', 0.9), green = new THREE.Color('#5ad06a').multiplyScalar(0.22);
    GFX.tween(3, k => { ft.halo.material.color.copy(h0).lerp(glow, k); ft.halo.scale.setScalar(120 + k * 50); ft.leaf.emissive.copy(e0).lerp(green, k); }, Ease.out);
    ft.fruits.forEach((f, i) => { f.userData.s = 0; GFX.delay(0.6 + i * 0.12).then(() => GFX.tween(0.8, k => { f.userData.s = k; }, Ease.out)); });
    Sfx.tone(660, 0.6, 'sine', 0.05); Sfx.tone(990, 0.8, 'sine', 0.04, 0, 0.3); Sfx.win();
  },
  // 呼び声が根を伝って、世界じゅうへ広がる（第七章の終わり。タマの呼びかけ）
  rootcall(arg) {
    const c = this.point(arg || 'tama') || this.O.clone(), g = V3(c.x, this.O.y + 0.1, c.z), cols = ['#ffe08a', '#ff9ab8', '#8ad8ff', '#b8ff8a'];
    this.fx.pillar(g, '#fff0a8', { h: 6, r: 0.8, life: 1.2, k: 2 }); GFX.flash('#fff8e0', 0.4, 0.8);
    for (let w = 0; w < 3; w++) GFX.delay(w * 0.6).then(() => {
      this.fx.ring(g, '#fff0a8', { r: 26, life: 2.2, width: 0.25 });
      for (let i = 0; i < 48; i++) { const a = Math.random() * Math.PI * 2, s = 8 + Math.random() * 6; this.p.emit(g.clone().add(V3(0, 0.15, 0)), V3(Math.cos(a) * s, 0.2, Math.sin(a) * s), hdr(pick(cols), 2.6), { life: 2, size: 0.14, drag: 0.2 }); }
      Sfx.tone(660 + w * 220, 0.5, 'sine', 0.05);
    });
  },
  // 封印の扉が開く
  // 時の水晶：遺跡が「今」と「昔」で切りかわる（ZoneKit.timeShift。シーンの中だけで、セーブには残さない）
  timeshift() { const o = this.timeObj; if (!o) return; o.set(!o.past); const c = this.point('crystal') || this.O; GFX.flash(o.past ? '#ffe8c0' : '#d8fff4', 0.5, 0.7); this.fx.ring(c.clone().add(V3(0, 0.1, 0)), o.past ? '#ffc86a' : '#8affe0', { r: 10, life: 1.0, width: 0.3 }); this.p.burst(c.clone().add(V3(0, 1.5, 0)), o.past ? '#ffc86a' : '#8affe0', 80, { speed: 5, up: 1, life: 1.2, size: 0.1 }); Sfx.tone(o.past ? 660 : 880, 0.8, 'sine', 0.06, o.past ? -330 : 440); },
  // 封印が解ける：光の輪と粒、白い閃光。封印の扉（ZoneKit.sealDoor）があれば、模様が消えて扉が奥へ開く。seal:出入口の key で、扉の奥の出入口も通れる色にする
  seal(exit) { const c = this.point('door') || this.W(0, 8, 3); this.fx.ring(c, '#8affe0', { r: 5, life: 1.2, face: this.camera.position }); this.p.burst(c, '#8affe0', 120, { speed: 6, life: 1.4, size: 0.1 }); GFX.flash('#c8fff0', 0.6, 0.8); if (exit) this.openExit(exit); else { Sfx.door(); Sfx.slam(); } if (this.sealDoorObj) this.sealDoorObj.openUp(); else this.scene.traverse(o => { if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry' && o.geometry.parameters.radius > 2.5) o.visible = false; }); },
  // 樹がよみがえる
  revive() { Save.data.flags.treeRevived = true; Save.save(); STAGE_FX.light.call(this, 'sky'); STAGE_FX.laugh.call(this); },
  // 猫じゃらしにじゃれる
  lure(arg) { const a = this.actors[arg || 'maou']; if (!a) return; a.setFace('joy'); a.gesture('laugh'); Sfx.meow(a.base); },
  // まどろみの林：春風がふきぬける
  gust() {
    for (let i = 0; i < 110; i++) GFX.delay(i * 0.012).then(() => this.p.emit(this.W(-10 + Math.random() * 3, Math.random() * 10 - 1, 0.2 + Math.random() * 8), this.R.clone().multiplyScalar(10 + Math.random() * 5).add(V3(0, 0.8 + Math.random(), 0)), hdr(Math.random() < 0.7 ? '#ffffff' : '#c8f0a8', 1.3), { life: 1.2, size: 0.06, drag: 0.2 }));
    Sfx.noise(1.4, 0.12, 1300); Sfx.fluff();
  },
  // その子の頭の上に綿毛の玉（区画の大たんぽぽの綿毛が抜けて、つかまった形）
  fluff(arg) {
    const a = this.actors[arg || 'tama']; if (!a) return;
    if (this.hooks.pluckBig) this.hooks.pluckBig.call(this);
    const puff = makePuff(1.5); puff.position.y = a.headH + 1.3; a.m.group.add(puff);
    this.p.burst(a.headPos().add(V3(0, 1.3, 0)), '#ffffff', 50, { speed: 2.5, up: 1, life: 1.6, size: 0.08, drag: 0.8 });
    Sfx.fluff();
  },
  // ねむり花が眠りの粉をはく（桃色の雲が広がり、画面が少し桃色に）
  pollen(arg) {
    const c = this.point(arg || 'flower') || this.W(0, 4, 1);
    const cl = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ff9ad8', 0.9), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true }));
    cl.position.copy(c); this.fx.add(cl, 3.4, (k, o) => { o.scale.setScalar(2 + Ease.out(Math.min(1, k * 2)) * 13); o.material.opacity = k < 0.6 ? 0.7 : 0.7 * (1 - (k - 0.6) / 0.4); });
    for (let i = 0; i < 5; i++) GFX.delay(i * 0.2).then(() => this.p.burst(c, pick(['#ff9ad8', '#ffc8ec', '#e8b8ff']), 60, { speed: 4, up: 0.5, life: 2.6, size: 0.14, drag: 1.2 }));
    const U = GFX.grade.uniforms; GFX.tween(1.4, k => { U.tint.value.setRGB(1, 1 - 0.14 * k, 1 - 0.05 * k); }, Ease.out, true);
    if (this.hooks.bigBloom) this.hooks.bigBloom.call(this);
    Sfx.puff();
  },
  // 寝息の「Z」（all ＝ 一行みんな）
  zzz(arg) {
    const list = !arg || arg === 'all' ? this.party.filter(a => a.visible()) : [this.actors[arg]].filter(Boolean);
    list.forEach(a => { for (let i = 0; i < 4; i++) GFX.delay(i * 0.55 + Math.random() * 0.3).then(() => floatZ(this.fx, a.headPos().add(V3(0.2, 0.1, 0)))); });
    Sfx.snore();
  },
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
for (const k of ['gy', 'hitsCol', 'blocked', 'freeSpot', 'safeAt', 'buildMapExits', 'makeBulkhead', 'makeCabin', 'makeGate', 'makeArchGate', 'makeFieldGate', 'makeStairGate', 'hideGateDoors', 'exitTop']) StageView.prototype[k] = FieldView.prototype[k];

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
  if (Z.battleSet && !loc.full) return buildLightBattleSet(view, loc, Z, cx, cz);   // full：軽い背景を使わず、区画をまるごと組み立てる（章のおしまいの画面など、一度きりの景色）
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
// 戦闘用の背景（zone.battleSet）：広い区画は、戦闘のたびに区画をまるごと組み立てると重いので、戦場のまわりだけを軽く組み立てる。
//   地面は、区画の高さ（丘など）にそった草地の板（環境の床と同じ模様）。小物は battleSet.build の組み立て（座標は戦場から見た位置。
//   pv.world で区画の座標へ、K.gy は区画の地面の高さ）。戦場の向き（loc.face）と中心は、区画を組み立てるときと同じ
function buildLightBattleSet(view, loc, Z, cx, cz) {
  const root = new THREE.Group(); view.scene.add(root);
  const lp = new Particles(root, 600);
  const T = Z.map ? new Terrain(Z) : null, a = loc.face * Math.PI / 180, c = Math.cos(a), s = Math.sin(a);
  const world = (lx, lz) => [cx + lx * c - lz * s, cz + lx * s + lz * c];
  const ground = (x, z) => {
    const i = T ? T.at(x, z) : -1; if (i < 0) return 0;
    const h = T.isWalkKind(T.kind[i]) ? T.groundOf(i, x, z) : T.baseAt(x, z);
    return Number.isFinite(h) ? h : 0;
  };
  const h0 = ground(cx, cz), hAt = (lx, lz) => ground(...world(lx, lz)) - h0;
  const geo = new THREE.PlaneGeometry(180, 180, 90, 90); geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  for (let k = 0; k < pos.count; k++) pos.setY(k, hAt(pos.getX(k), pos.getZ(k)));
  geo.computeVertexNormals();
  const floor = new THREE.Mesh(geo, view.env.floor.material); floor.receiveShadow = true; root.add(floor);
  view.env.floor.visible = false;
  const pv = Object.create(view);
  Object.assign(pv, { scene: root, p: lp, zone: Z, zoneId: loc.zone, ci: Z.ci, ch: CHAPTERS[Z.ci], rand: seeded(hashStr(loc.zone)), T: null,
    colliders: [], reserved: [{ x: 0, z: 0, r: 9 }], zoneTicks: [], emitters: [], safe: [], flags: {}, hooks: {}, world, hAt, zt: T, face: a,
    local: (x, z) => { const dx = x - cx, dz = z - cz; return [dx * c + dz * s, -dx * s + dz * c]; } });
  const K = new ZoneKit(pv); K.gy = hAt;
  ZONE_BUILD[Z.battleSet.build](K); K.flush();
  view.set = { root, pv, lp, hooks: {}, update(dt, t) { for (const f of pv.zoneTicks) f(dt, t); for (const f of pv.emitters) f(dt); lp.update(dt); } };
  return view.set;
}
// 区画を背景に組み立てる画面（戦闘・章のおしまい）も、探索フィールドの部品を借りる
for (const V of [BattleView, SceneryView]) for (const k of ['gy', 'hitsCol', 'blocked', 'freeSpot', 'safeAt', 'buildMapExits', 'makeBulkhead', 'makeCabin', 'makeGate', 'makeArchGate', 'makeFieldGate', 'makeStairGate', 'hideGateDoors', 'exitTop']) if (!V.prototype[k]) V.prototype[k] = FieldView.prototype[k];
