'use strict';
// ============================================================
//  キャラクターの骨組み：ポーズ・表情・まばたき／口パク
//  にゃんこの体そのものは js/gfx/cats.js、敵は js/gfx/monsters.js
// ============================================================

// 関節角度で定義したポーズ（モデルは +Z 向き）。値は人型の比率で書き、にゃんこ側で縮める
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
  dash:    { hipsY: -0.12, lean: 0.55, twist: 0.3, headX: -0.3, armRx: 0.9, armRz: -0.4, elbowR: -0.2, armLx: -0.9, armLz: 0.3, elbowL: -1.0, legLx: -1.1, kneeL: 0.9, legRx: 0.7, kneeR: 1.1 },
  down:    { hipsY: -0.5, lean: 0.9, headX: 0.4, armLx: -0.4, armRx: -0.4, armLz: 0.4, armRz: -0.4, legLx: -1.4, legRx: -1.4, kneeL: 2.2, kneeR: 2.2 },
  sleep:   { hipsY: -0.55, lean: 0.25, headX: 0.45, headY: 0.2, armLx: -0.9, armLz: 0.1, elbowL: -1.6, armRx: -0.9, armRz: -0.1, elbowR: -1.6, legLx: -1.5, kneeL: 1.2, legRx: -1.5, kneeR: 1.2 },
  // ---- 技ごとのモーション（js/gfx/moves.js） ----
  strike2: { hipsY: -0.1, twist: 0.6, lean: 0.25, armRx: -1.3, armRz: -1.2, elbowR: -0.2, armLx: 0.2, armLz: 0.45, legLx: -0.5, kneeL: 0.4, legRx: 0.4, kneeR: 0.2 },   // 返す刀
  punchUp: { hipsY: -0.06, twist: -0.45, lean: 0.05, armLx: -0.7, armLz: 0.35, elbowL: -1.7, armRx: -0.4, armRz: -0.3, elbowR: -0.9, legLx: -0.4, legRx: 0.3, kneeL: 0.3, kneeR: 0.3 },
  punch:   { hipsY: -0.1, twist: 0.5, lean: 0.3, armLx: -1.6, armLz: -0.05, elbowL: 0, armRx: 0.2, armRz: -0.4, elbowR: -0.9, legLx: -0.7, kneeL: 0.5, legRx: 0.45, kneeR: 0.2 },
  bonkUp:  { lean: -0.15, headX: -0.15, armLx: -2.9, armLz: 0.15, elbowL: -0.5, armRx: -2.9, armRz: -0.15, elbowR: -0.5, legLx: -0.3, legRx: 0.2 },   // 両手で振りかぶる（笏）
  bonk:    { hipsY: -0.15, lean: 0.45, headX: 0.1, armLx: -1.0, armLz: 0.1, elbowL: 0, armRx: -1.0, armRz: -0.1, elbowR: 0, legLx: -0.7, kneeL: 0.6, legRx: 0.5, kneeR: 0.3 },
  swingUp: { twist: -0.6, lean: -0.05, armLx: 0.6, armLz: 1.1, elbowL: -0.3, armRx: -0.6, armRz: -0.3, elbowR: -0.8, legLx: -0.3, legRx: 0.3, kneeR: 0.3 },   // 左手のまくらを横へ引く
  swing:   { hipsY: -0.1, twist: 0.6, lean: 0.35, armLx: -1.5, armLz: -0.35, elbowL: 0, armRx: 0.3, armRz: -0.5, elbowR: -0.6, legLx: -0.7, kneeL: 0.5, legRx: 0.45 },   // まくらを振りぬく
  charge:  { hipsY: -0.2, twist: 0.7, lean: -0.15, headX: 0.1, armRx: -3.0, armRz: -0.5, elbowR: -0.3, armLx: -2.6, armLz: -0.2, elbowL: -0.6, legLx: -0.6, kneeL: 0.8, legRx: 0.5, kneeR: 0.8 },   // 大きく振りかぶってためる
  cleave:  { hipsY: -0.22, twist: -0.1, lean: 0.55, armRx: -0.5, armRz: 0.1, elbowR: 0, armLx: -0.5, armLz: -0.1, elbowL: 0, legLx: -0.8, kneeL: 0.7, legRx: 0.6, kneeR: 0.4 },   // 真上から振りおろす
  spin:    { hipsY: -0.08, lean: 0.1, armRx: -1.4, armRz: -1.2, elbowR: 0, armLx: -0.4, armLz: 1.0, elbowL: -0.3, legLx: -0.4, kneeL: 0.3, legRx: 0.3, kneeR: 0.3 },   // 剣を横に伸ばしてまわる
  raise:   { lean: -0.12, headX: -0.2, armRx: -3.0, armRz: -0.1, elbowR: -0.1, armLx: -0.6, armLz: 0.6, elbowL: -0.5, legLx: -0.3, legRx: 0.2 },   // 杖・笏を高く掲げる
  tailSpin:{ hipsY: -0.1, lean: 0.35, headX: 0.1, armLx: 0.3, armLz: 0.7, elbowL: -0.4, armRx: 0.3, armRz: -0.7, elbowR: -0.4, legLx: -0.5, kneeL: 0.6, legRx: 0.4, kneeR: 0.6 },
  guard:   { hipsY: -0.14, lean: 0.08, armRx: -1.35, armRz: 0.55, elbowR: -0.7, armLx: -1.3, armLz: -0.35, elbowL: -0.7, legLx: -0.55, kneeL: 0.55, legRx: 0.45, kneeR: 0.55 },   // 刀を横に構えて受けとめる
  patUp:   { lean: 0.12, armRx: -2.3, armRz: -0.05, elbowR: -0.9, armLx: -0.8, armLz: 0.3, elbowL: -1.2 },
  patDown: { lean: 0.16, headX: 0.1, armRx: -1.9, armRz: -0.05, elbowR: -0.4, armLx: -0.8, armLz: 0.3, elbowL: -1.2 },
  hugPillow: { headX: -0.25, lean: -0.08, armLx: -0.9, armLz: 0.45, elbowL: -1.5, armRx: -0.9, armRz: -0.45, elbowR: -1.5 },   // まくらを胸に抱える
  cheer:   { headX: -0.2, lean: -0.05, armLx: -2.8, armLz: 0.5, elbowL: -0.2, armRx: -2.8, armRz: -0.5, elbowR: -0.2, legLx: -0.2, legRx: 0.2 },
  hurrah:  { headX: -0.25, lean: -0.08, armLx: -0.3, armLz: 2.3, elbowL: -0.2, armRx: -0.3, armRz: -2.3, elbowR: -0.2, legLx: -0.2, legRx: 0.2 },   // 両手を横から上へ開く（正面から見て Y の字）
  open:    { headX: -0.2, lean: -0.08, armLx: -1.3, armLz: 1.25, elbowL: 0, armRx: -1.3, armRz: -1.25, elbowR: 0 },   // 腕を大きく広げる
};

// 必殺技の決めポーズ（正面から映す。キャラごとに個性を出す）。face：表情。ないキャラは POSES.ult
//   腕は頭より上へは上がらない。持ち物は前腕にほぼ直角につくので、前腕を前へ出すと立ち、腕を横へ伸ばすと横を向く
const ULT_POSES = {
  // ミケ：剣を斜め上へ掲げ、もう片手を広げて大きく踏みこむ（勇者）
  mike:  { face: 'joy', pose: { hipsY: -0.1, lean: -0.05, twist: -0.15, headX: -0.2, headY: 0.15, armRx: -0.3, armRz: -2.4, elbowR: -0.1, armLx: -0.4, armLz: 1.3, elbowL: -0.3, legLx: -0.6, kneeL: 0.6, legRx: 0.5, kneeR: 0.3 } },
  // クロ：腰を落とし、刀を低く横へ払ったまま、そっぽを向く（斬ったあとの残心）
  kuro:  { face: 'serious', pose: { hipsY: -0.12, lean: 0.1, twist: -0.3, headY: -0.4, armRx: -0.4, armRz: -1.0, elbowR: 0, armLx: -0.3, armLz: 0.3, elbowL: -0.6, legLx: -0.6, kneeL: 0.6, legRx: 0.5, kneeR: 0.5 } },
  // シロ：楽しそうに体を揺らしながら、斜め前へ伸ばした杖の先でくるくる円を描く（move: twirl。腕を真横にすると円が正面から線に見える）
  shiro: { face: 'joy', move: 'twirl', pose: { lean: -0.1, headX: -0.15, armRx: -1.5, armRz: -0.9, elbowR: 0, armLx: 0.3, armLz: 0.6, elbowL: -1.9, legLx: -0.2, legRx: 0.25, kneeR: 0.15 } },
  // タマ：まくらを抱きしめて、にっこり（片足をうしろへ上げる）
  tama:  { face: 'joy', pose: { headX: -0.25, lean: -0.08, armLx: -0.9, armLz: 0.45, elbowL: -1.5, armRx: -0.9, armRz: -0.45, elbowR: -1.5, legLx: 0.1, legRx: -0.5, kneeR: 0.9 } },
  // マオウ：笏を斜めに立て、片手は腰。あごを上げて見くだす（元・魔王）
  maou:  { face: 'smug', pose: { lean: -0.25, headX: -0.35, armRx: -0.3, armRz: -0.4, elbowR: -1.3, armLx: 0.2, armLz: 0.7, elbowL: -1.9, legLx: -0.3, legRx: 0.3 } },
};
// 動きのある決めポーズ（ULT_POSES の move）：t 秒目にポーズへ足す揺れ。w はポーズへの寄り（0→1）
//   roll：体ごと左右に傾ける。sparkle：持ち物の先に光を残す（軌跡が見える）
const ULT_MOVES = {
  twirl: (t, w) => {
    const a = t * 7, b = t * 4.2;
    return { armRx: Math.sin(a) * 0.4 * w, armRz: Math.cos(a) * 0.4 * w, twist: Math.sin(b) * 0.15 * w, headY: Math.sin(b + 0.6) * 0.15 * w,
      hipsY: -Math.abs(Math.sin(b)) * 0.03 * w, roll: Math.sin(b) * 0.12 * w, sparkle: w > 0.6 };
  },
};

// 表情の定義：tilt = 眉の傾き（+ で困り顔、- で怒り顔）、browY = 眉の上下、
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
  shy:      { browY: -1, lidIn: 1.5, lidOut: 1.5, low: 2, mouth: 'smile', blush: 0.55 },
};

// 表情・まばたき・口パクの制御（表情ごとのテクスチャは apply で差し替える）
class FaceRig {
  constructor(key, L, hq, opt, mat) {
    Object.assign(this, { key, L, hq, opt, mat, expr: 'neutral', closed: false, shut: false, mouth: false, talking: false, blinkT: 1 + Math.random() * 3, mouthT: 0 });
    this.apply();
  }
  set(expr) { if (expr && FACE_EXPR[expr] && expr !== this.expr) { this.expr = expr; this.apply(); } }
  apply() {}
  update(dt) {
    if (!dt) return;
    let ch = false;
    // shut：眠っているあいだは、まばたきせずに目を閉じたまま
    if (this.shut) { if (!this.closed) { this.closed = true; this.blinkT = 0.3; ch = true; } }
    else if ((this.blinkT -= dt) <= 0) { this.closed = !this.closed; this.blinkT = this.closed ? 0.11 : 1.8 + Math.random() * 3.6; ch = true; }
    if (this.talking) { if ((this.mouthT -= dt) <= 0) { this.mouth = !this.mouth; this.mouthT = this.mouth ? 0.07 + Math.random() * 0.1 : 0.05 + Math.random() * 0.08; ch = true; } }
    else if (this.mouth) { this.mouth = false; ch = true; }
    if (ch) this.apply();
  }
}

function lathe(points, seg = 28) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg); }

// 仲間・住人はすべて2頭身のにゃんこ（ネズミ・イヌも同じ骨組み）
// 仲間は、いま装備している武器を持つ
function buildCharacter(key) { return buildCat(key, CHARS[key] && Save.data ? { gear: weaponGear(key) } : {}); }
