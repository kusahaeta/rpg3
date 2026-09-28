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
    Object.assign(this, { key, L, hq, opt, mat, expr: 'neutral', closed: false, mouth: false, talking: false, blinkT: 1 + Math.random() * 3, mouthT: 0 });
    this.apply();
  }
  set(expr) { if (expr && FACE_EXPR[expr] && expr !== this.expr) { this.expr = expr; this.apply(); } }
  apply() {}
  update(dt) {
    if (!dt) return;
    let ch = false;
    if ((this.blinkT -= dt) <= 0) { this.closed = !this.closed; this.blinkT = this.closed ? 0.11 : 1.8 + Math.random() * 3.6; ch = true; }
    if (this.talking) { if ((this.mouthT -= dt) <= 0) { this.mouth = !this.mouth; this.mouthT = this.mouth ? 0.07 + Math.random() * 0.1 : 0.05 + Math.random() * 0.08; ch = true; } }
    else if (this.mouth) { this.mouth = false; ch = true; }
    if (ch) this.apply();
  }
}

function lathe(points, seg = 28) { return new THREE.LatheGeometry(points.map(([r, y]) => new THREE.Vector2(r, y)), seg); }

// 仲間・住人はすべて2頭身のにゃんこ（ネズミ・イヌも同じ骨組み）
function buildCharacter(key) { return buildCat(key); }
