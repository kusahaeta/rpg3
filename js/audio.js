'use strict';
// WebAudio による効果音・にゃんこの声・BGM（外部ファイル不要）
// 音量はオプション画面で決める（vol：bgm・se ともに 0〜1。1 がもとの大きさ）。BGM と効果音は別々の通り道（bgm・se）から master へ
const Sfx = {
  ctx: null, master: null, se: null, bgm: null, on: true, vol: { bgm: 1, se: 1 },
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    setTimeout(() => { if (typeof Music !== 'undefined' && Music.want) { const w = Music.want; Music.want = null; Music.play(w); } }, 50);
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
      for (const k of ['bgm', 'se']) { this[k] = this.ctx.createGain(); this[k].gain.value = this.vol[k]; this[k].connect(this.master); }
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.se); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.2, freq = 2000, delay = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.se); s.start(t);
  },
  setVol(k, v) {
    this.vol[k] = v;
    if (this[k]) this[k].gain.setTargetAtTime(v, this.ctx.currentTime, 0.03);
  },
  click() { this.tone(880, 0.05, 'square', 0.04); },
  select() { this.tone(660, 0.06, 'triangle', 0.06); this.tone(990, 0.08, 'triangle', 0.05, 0, 0.04); },
  swing() { this.noise(0.15, 0.15, 3000); },
  hit() { this.noise(0.12, 0.3, 1500); this.tone(160, 0.12, 'square', 0.06, -80); },
  crit() { this.hit(); this.tone(1200, 0.18, 'triangle', 0.08, 600); },
  brk() { this.noise(0.5, 0.4, 5000); this.tone(1800, 0.4, 'sawtooth', 0.05, -1500); this.tone(2400, 0.3, 'triangle', 0.05, 0, 0.05); },
  ult() { [392, 494, 587, 784].forEach((f, i) => this.tone(f, 0.5, 'sawtooth', 0.04, 0, i * 0.06)); this.noise(0.8, 0.12, 800, 0.2); },
  slam() { this.noise(0.7, 0.5, 350); this.noise(0.35, 0.3, 3200); this.tone(85, 0.6, 'sawtooth', 0.1, -45); this.tone(1500, 0.3, 'triangle', 0.05, -1000, 0.03); },
  zap() { this.noise(0.1, 0.12, 6500); this.tone(2200, 0.06, 'square', 0.02, -900); },
  item() { [784, 988, 1319].forEach((f, i) => this.tone(f, 0.2, 'triangle', 0.05, 0, i * 0.07)); },   // どうぐをかかげる
  toss() { this.noise(0.18, 0.06, 3500); this.tone(520, 0.18, 'sine', 0.03, 420); },   // ぽーんと投げる
  heal() { this.tone(660, 0.2, 'sine', 0.08); this.tone(990, 0.3, 'sine', 0.07, 0, 0.08); },
  shield() { this.tone(440, 0.25, 'triangle', 0.07, 300); },
  kill() { this.tone(300, 0.35, 'sine', 0.1, -240); },
  enemy() { this.noise(0.2, 0.2, 600); this.tone(110, 0.2, 'sawtooth', 0.06, -40); },
  turn() { this.tone(1046, 0.06, 'sine', 0.05); },
  door() { this.noise(0.35, 0.08, 900); this.tone(520, 0.12, 'sine', 0.025, 180); },
  lift() { this.noise(0.9, 0.06, 400); this.tone(180, 0.8, 'triangle', 0.035, 60); this.tone(880, 0.1, 'sine', 0.04, 0, 0.05); },
  // 笑顔の塔の仕掛け：トランポリン（ぼよよーん）、ブーブークッション、笑い声（ワッハッハ）、びっくり箱（ばあっ）
  boing() { this.tone(150, 0.12, 'sine', 0.14, 260); this.tone(420, 0.45, 'sine', 0.1, -260, 0.1); this.tone(640, 0.3, 'triangle', 0.03, -300, 0.14); },
  boo() { this.tone(118, 0.6, 'sawtooth', 0.08, -52); this.tone(92, 0.55, 'square', 0.035, -30, 0.04); this.noise(0.5, 0.07, 280); },
  laugh() { [660, 600, 560, 520, 480, 450].forEach((f, i) => { this.tone(f, 0.11, 'sawtooth', 0.045, -90, i * 0.13); this.noise(0.06, 0.05, 1800, i * 0.13); }); },
  // まどろみの林：綿毛につかまる（ふわっと風の音）・ねむり花が粉をはく・寝息
  fluff() { this.noise(1.2, 0.06, 2600); this.tone(660, 0.7, 'sine', 0.035, 330); this.tone(990, 0.6, 'sine', 0.025, 260, 0.12); },
  puff() { this.noise(0.9, 0.07, 650); this.tone(520, 0.8, 'sine', 0.025, -260); this.tone(780, 0.6, 'triangle', 0.015, -300, 0.1); },
  snore() { [0, 0.9].forEach(t => { this.noise(0.5, 0.05, 420, t); this.tone(150, 0.45, 'sawtooth', 0.025, -50, t); this.tone(420, 0.35, 'sine', 0.02, 180, t + 0.5); }); },
  // ニャハハ王国関所：番犬の声、タマのこもりうた、のろし台の火
  bark() { [0, 0.22].forEach(t => { this.noise(0.09, 0.22, 900, t); this.tone(420, 0.1, 'square', 0.06, -160, t); }); },
  lullaby() { [523, 440, 392, 440, 523, 392].forEach((f, i) => this.tone(f, 0.45, 'sine', 0.05, 0, i * 0.32)); },
  fire() { this.noise(0.8, 0.14, 700); this.tone(180, 0.5, 'sawtooth', 0.04, 220); },
  // ごろごろ切り通し：ごろごろ団のラッパ（パラリラパラリラ）と、空ぶかし（ブォンブォン）
  horn(vol = 1) { [659, 784, 988, 784, 659, 784, 988, 784].forEach((f, i) => this.tone(f, 0.11, 'square', 0.035 * vol, 0, i * 0.12)); },
  vroom() { [0, 0.35].forEach(t => { this.tone(70, 0.3, 'sawtooth', 0.09, 90, t); this.noise(0.3, 0.12, 300, t); }); },
  pop() { this.noise(0.1, 0.3, 4200); this.tone(260, 0.25, 'square', 0.06, 900); this.boing(); },
  // にゃー（キャラごとに声の高さが違う）
  meow(key) {
    if (!this.ctx || !this.on) return;
    const f0 = { mike: 720, kuro: 430, shiro: 840, tama: 920, maou: 360 }[key] || 640 + Math.random() * 200;
    const t = this.ctx.currentTime, o = this.ctx.createOscillator(), g = this.ctx.createGain(), bp = this.ctx.createBiquadFilter();
    o.type = 'sawtooth'; bp.type = 'bandpass'; bp.Q.value = 3;
    o.frequency.setValueAtTime(f0 * 0.85, t); o.frequency.exponentialRampToValueAtTime(f0 * 1.35, t + 0.09); o.frequency.exponentialRampToValueAtTime(f0 * 0.75, t + 0.34);
    bp.frequency.setValueAtTime(f0 * 1.8, t); bp.frequency.exponentialRampToValueAtTime(f0 * 3, t + 0.1); bp.frequency.exponentialRampToValueAtTime(f0 * 1.5, t + 0.34);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.09, t + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.38);
    o.connect(bp); bp.connect(g); g.connect(this.se); o.start(t); o.stop(t + 0.42);
  },
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.08, 0, i * 0.12)); },
  lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.08, 0, i * 0.2)); },
  warp(r) {
    this.noise(1.2, 0.15, 1200);
    const base = r === 5 ? [523, 659, 784, 1046, 1318] : r === 4 ? [440, 554, 659, 880] : [392, 494, 587];
    base.forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.07, 0, 0.3 + i * 0.1));
  },
};

// ------------------------------------------------------------
//  BGM：小さなシーケンサー
//  1 マス = 16 分音符。曲はパートの重ね合わせで、どのパートも自分の長さでくり返す
//   prog   和音の進行。ひとつが bar マス（4 拍子は 16、3 拍子は 12）。'Em,A' は 1 小節を半分ずつ、'-' は前の和音のまま
//   lead / lead2  旋律。音名（C5・F#4・Bb3）、'-' はのばす、'.' は休み、'|' は小節の目じるし。div は 1 拍のマス数（2 = 8 分音符）
//   bass   和音にあわせた型：r 根音（分数和音なら分母）・f 5 度・o 1 オクターブ上・t 3 度・s 7 度（なければ o）
//   arp    和音の音を下から番号で（和音の数をこえると 1 オクターブ上）
//   stab   x のマスで和音をまとめて鳴らす（伴奏のきざみ）
//   pad    和音の変わり目からのばす和音
//   drums  k キック・s スネア・h ハイハット・o 開いたハイハット・t タム・T ティンパニ・c シンバル（16 分音符ごとに x、X は強く）
//  音色：wave（sine / triangle / square / sawtooth）、env（norm / pluck / bell / pad）、echo（やまびこ）、vib（ゆれのセント）、det（ふたつずらして厚く）
//  曲：sw（はねるリズム）、lp（こもらせる周波数）、gain（音量のそろえ）
//  昔の書き方（mel / bass / chords を MIDI 番号の配列で）もそのまま鳴る
// ------------------------------------------------------------
const CR = bars => 'x' + '.'.repeat(bars * 16 - 1);   // bars 小節ごとのシンバル
const TRACKS = {
  // ---- タイトル ----
  // ぽかぽか村（village）とかなしい場面（sad）に共通する旋律を、倍の長さにのばしてつないだテーマ。
  //   前奏（回り音形のファンファーレ）→ A：village の旋律 → B：sad の旋律（平行調のイ短調）→ A'：弦も重ねて village → 後奏
  title: {
    bpm: 88, gain: 0.93, lp: 6000,
    prog: `C C Am G
      C Am Dm G C FM7 Gsus4,G C
      Am Am/G F E F Am,G E Am,G
      C Am Dm G C FM7 Gsus4,G C
      F G`,
    lead: { wave: 'triangle', vol: 0.2, echo: 0.2, vib: 5, seq: `
      G5 - - A5 G5 - F5 - | G5 - - - - - . . | A5 - - B5 A5 - G5 - | G5 - - - D5 - B4 - |
      C5 - D5 - E5 - G5 - | E5 - D5 - C5 - - - | D5 - E5 - F5 - E5 - | D5 - C5 - B4 - - - |
      C5 - D5 - E5 - G5 - | A5 - G5 - E5 - D5 - | C5 - D5 - C5 - B4 - | C5 - - - - - . . |
      A4 - - - C5 - B4 - | A4 - - - G4 - - - | F4 - - - G4 - A4 - | E4 - - - - - - - |
      A4 - - - C5 - D5 - | E5 - - - D5 - C5 - | B4 - - - C5 - B4 - | A4 - - - . . . . |
      C5 - D5 - E5 - G5 - | E5 - D5 - C5 - - - | D5 - E5 - F5 - E5 - | D5 - C5 - B4 - - - |
      C5 - D5 - E5 - G5 - | A5 - G5 - E5 - D5 - | C5 - D5 - C5 - B4 - | C5 - - - - - . . |
      A5 - - - C6 - - - | B5 - - - - - . .` },
    // 前奏・A'・後奏だけ、1 オクターブ下で弦が重なる
    lead2: { wave: 'sawtooth', det: 6, oct: -12, vol: 0.07, seq: `
      G5 - - A5 G5 - F5 - | G5 - - - - - . . | A5 - - B5 A5 - G5 - | G5 - - - D5 - B4 - |
      ${'. . . . . . . . | '.repeat(16)}
      C5 - D5 - E5 - G5 - | E5 - D5 - C5 - - - | D5 - E5 - F5 - E5 - | D5 - C5 - B4 - - - |
      C5 - D5 - E5 - G5 - | A5 - G5 - E5 - D5 - | C5 - D5 - C5 - B4 - | C5 - - - - - . . |
      A5 - - - C6 - - - | B5 - - - - - . .` },
    bass: { pat: 'r - - - f - o -', vol: 0.28 },
    // 前奏はなし、A と A' は 16 分の上り下り、B はゆっくり、後奏はかけ上がる
    arp: { pat: '. '.repeat(64) + '0 1 2 3 4 3 2 1 '.repeat(16) + '0 . 2 . 4 . 2 . '.repeat(16) + '0 1 2 3 4 3 2 1 '.repeat(16) + '0 1 2 3 4 5 6 7 '.repeat(4), vol: 0.035 },
    pad: { wave: 'triangle', vol: 0.03 },
    drums: {
      vol: 0.65,
      k: '.'.repeat(64) + 'x.......x.......'.repeat(8) + '.'.repeat(128) + 'x.......x.......'.repeat(8) + '.'.repeat(32),
      s: '.'.repeat(320) + '....x.......x...'.repeat(7) + '....x...x.x.xxxx' + '.'.repeat(32),
      h: '.'.repeat(320) + 'x.x.x.x.x.x.x.x.'.repeat(8) + '.'.repeat(32),
      T: 'x.......x.......'.repeat(3) + 'x...x...x.x.xxxx' + '.'.repeat(128) + 'x...............'.repeat(7) + 'x.......x.x.xxxx' + '.'.repeat(128) + 'x...x...x...x...' + 'x.x.x.x.xxxxxxxx',
      c: CR(4) + CR(8) + '.'.repeat(128) + CR(4).repeat(2) + CR(2),
    },
  },
  // ---- 物語の場面（昔からの曲） ----
  village: { bpm: 104, wave: 'triangle', mel: [72, 74, 76, 79, 76, 74, 72, 0, 74, 76, 77, 76, 74, 72, 71, 0, 72, 74, 76, 79, 81, 79, 76, 74, 72, 74, 72, 71, 72, 0, 0, 0], bass: [48, 0, 55, 0, 53, 0, 55, 0], chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]] },
  field:   { bpm: 120, wave: 'square', mel: [76, 0, 79, 81, 79, 76, 74, 0, 72, 74, 76, 0, 74, 72, 69, 0, 76, 0, 79, 81, 84, 81, 79, 76, 74, 76, 74, 72, 74, 0, 0, 0], bass: [45, 45, 52, 52, 43, 43, 50, 50], chords: [[57, 60, 64], [52, 55, 59], [55, 59, 62], [57, 60, 64]] },
  sad:     { bpm: 76, wave: 'sine', mel: [69, 0, 72, 71, 69, 0, 67, 0, 65, 0, 67, 69, 64, 0, 0, 0, 69, 0, 72, 74, 76, 0, 74, 72, 71, 0, 72, 71, 69, 0, 0, 0], bass: [45, 0, 41, 0, 43, 0, 40, 0], chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]] },
  hope:    { bpm: 112, wave: 'triangle', mel: [67, 72, 76, 79, 77, 76, 74, 72, 74, 76, 77, 79, 81, 79, 77, 76, 72, 76, 79, 84, 83, 81, 79, 77, 76, 77, 79, 81, 79, 0, 0, 0], bass: [48, 48, 53, 53, 55, 55, 48, 48], chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]] },
  dark:    { bpm: 92, wave: 'sawtooth', mel: [62, 0, 65, 0, 64, 0, 61, 0, 62, 0, 65, 69, 68, 0, 0, 0, 62, 0, 65, 0, 64, 0, 61, 0, 58, 0, 57, 0, 62, 0, 0, 0], bass: [38, 38, 38, 38, 37, 37, 34, 33], chords: [[50, 53, 57], [49, 53, 56], [46, 50, 53], [45, 49, 52]] },
  // ---- 街 ----
  // 街道の宿場：はねるリズムで、ひと休み
  inn: {
    bpm: 92, sw: 0.33, prog: 'F Am7 Bb C7 F Dm7 Gm7,C7 F Bb F/A Gm7 C7 Am7 Dm7 Gm7,C7 F',
    lead: { wave: 'triangle', vol: 0.21, echo: 0.12, seq: `
      C5 - A4 C5 F5 - E5 D5 | C5 - - A4 E5 - - . | D5 - Bb4 D5 F5 - D5 C5 | Bb4 - G4 - E4 - . . |
      F4 - A4 C5 F5 - G5 A5 | F5 - - D5 C5 - A4 - | Bb4 - D5 - C5 - Bb4 G4 | F4 - - - - - . . |
      F5 - - D5 Bb4 - D5 F5 | E5 - - C5 A4 - C5 - | D5 - Bb4 G4 F5 - D5 - | E5 - - C5 Bb4 - G4 - |
      C5 - E5 G5 A5 - G5 E5 | F5 - D5 C5 A4 - C5 - | D5 - Bb4 - E5 - G5 - | F5 - - - - - . .` },
    bass: { pat: 'r - f - o - f -', vol: 0.28 },
    stab: { pat: '....x.......x...', wave: 'triangle', vol: 0.05, dec: 0.18 },
    drums: { vol: 0.5, k: 'x.......x.......', h: 'x...x.x.x...x.x.' },
  },
  // ニャハハ王国（城下町・城）：チェンバロのメヌエット
  royal: {
    bpm: 108, gain: 2.2, bar: 12, prog: 'D A/C# Bm F#m G D/F# Em A G D/F# Em A Bm G A7 D',
    lead: { wave: 'square', env: 'pluck', dec: 0.25, vol: 0.13, echo: 0.1, seq: `
      F#5 - A5 - D6 - | C#6 - B5 A5 E5 - | F#5 - B5 - A5 G5 | F#5 - - - C#5 - |
      D5 - G5 - B5 - | A5 - F#5 E5 D5 - | E5 - G5 - B5 - | A5 - - - . . |
      B5 - - A5 G5 - | F#5 - - E5 D5 - | E5 - G5 F#5 E5 - | C#5 - E5 - A5 - |
      F#5 - D5 - B4 - | G5 - F#5 E5 D5 - | E5 - C#5 - G5 - | F#5 - - - D5 -` },
    bass: { pat: 'r - f - o -', wave: 'square', env: 'pluck', dec: 0.2, vol: 0.13 },
    pad: { wave: 'triangle', vol: 0.02 },
  },
  // ニャハハ王国関所：砦の行進
  fort: {
    bpm: 112, lp: 3200, prog: 'Bb Eb F Bb Gm Cm F Bb Eb Bb Cm F Bb Eb F7 Bb',
    lead: { wave: 'sawtooth', vol: 0.14, det: 5, seq: `
      F4 . Bb4 . D5 - - Bb4 | Eb5 - - G5 F5 - Eb5 - | A4 - C5 - F5 - - Eb5 | D5 - - - Bb4 - . . |
      G4 . Bb4 . D5 - - G5 | G5 - - Eb5 C5 - - Eb5 | F5 - - Eb5 D5 - C5 - | Bb4 - - - - . . . |
      G5 - - F5 Eb5 - Bb4 - | F5 - - D5 Bb4 - - . | Eb5 - - D5 C5 - G4 - | A4 - C5 - F5 - - . |
      D5 - F5 - Bb5 - - A5 | G5 - - F5 Eb5 - G5 - | F5 - - Eb5 C5 - A4 - | Bb4 - - - - . . .` },
    bass: { pat: 'r - f - r - f -', vol: 0.3 },
    pad: { wave: 'triangle', vol: 0.025 },
    drums: { vol: 0.7, k: 'x.......x.......', s: '....x..x....x.xx' },
  },

  // ---- 野と道 ----
  // 村はずれの丘：ゆったりした 3 拍子。笛と、つまびくギター
  hill: {
    bpm: 100, gain: 1.15, bar: 12, prog: 'G D/F# Em C G/B C D G C G/B Am D G Em D G',
    lead: { wave: 'triangle', vol: 0.2, echo: 0.25, vib: 6, seq: `
      B4 - - - D5 - | A4 - - - F#4 G4 | G4 - E4 - B4 - | A4 - - - . . |
      B4 - - - D5 - | E5 - D5 - C5 - | C5 - B4 - A4 - | G4 - - - - . |
      E5 - - - G5 - | D5 - - - B4 - | C5 - B4 - A4 - | F#4 - G4 - A4 - |
      B4 - - - D5 - | G5 - F#5 - E5 - | C5 - B4 - A4 - | G4 - - - - .` },
    bass: { pat: 'r - - - f -', vol: 0.26 },
    arp: { div: 2, pat: '. . 1 2 3 2', vol: 0.045 },
    pad: { vol: 0.025 },
  },
  // ほしふる森：星のまたたく鈴と、木もれ日の笛
  forest: {
    bpm: 108, gain: 1.15, prog: 'D A/C# Bm G D/F# G Em,A D D A/C# Bm F#m G D/F# Em,A D',
    lead: { wave: 'triangle', vol: 0.2, echo: 0.2, seq: `
      F#5 - - E5 D5 - A4 - | E5 - - D5 C#5 - A4 - | D5 - C#5 - B4 - F#4 - | G4 - A4 - B4 - D5 - |
      A5 - - F#5 E5 - D5 - | B5 - - A5 G5 - E5 - | G5 - F#5 - E5 - C#5 - | D5 - - - - - . . |
      F#5 - - E5 D5 - A4 - | E5 - - F#5 G5 - E5 - | F#5 - - D5 B4 - D5 - | C#5 - - - A4 - - - |
      B4 - D5 - G5 - - B5 | A5 - - - F#5 - D5 - | E5 - G5 - F#5 - E5 - | D5 - - - - - . .` },
    bass: { pat: 'r - - . f - - .', vol: 0.26 },
    arp: { pat: '4 . 2 . 3 . 2 . 4 . 2 . 3 . 5 .', env: 'bell', wave: 'sine', oct: 12, vol: 0.03 },
    pad: { vol: 0.025 },
    drums: { vol: 0.45, k: 'x.......x.......', h: '..x...x...x...x.' },
  },
  // まどろみの林：ねむたい 6/8 の子守うた
  drowsy: {
    bpm: 80, gain: 0.87, bar: 12, prog: 'Eb Cm Ab Bb Eb Gm Ab,Bb Eb Ab Eb/G Fm Bb Cm Ab Fm,Bb Eb',
    lead: { wave: 'sine', vol: 0.24, echo: 0.3, vib: 5, seq: `
      Bb4 - G4 Bb4 - Eb5 | D5 - C5 - - . | C5 - Ab4 C5 - Eb5 | D5 - - Bb4 - . |
      Eb5 - F5 G5 - Bb5 | Bb5 - G5 D5 - . | C5 - Eb5 D5 - F5 | Eb5 - - - - . |
      Eb5 - C5 Ab4 - C5 | Bb4 - - G4 - . | Ab4 - C5 F5 - Eb5 | D5 - - - - . |
      G5 - F5 Eb5 - G5 | C6 - Bb5 Ab5 - Eb5 | F5 - Ab5 D5 - Bb4 | Eb5 - - - - .` },
    bass: { pat: 'r - - f - -', wave: 'sine', vol: 0.26 },
    arp: { pat: '0 . 2 . 4 . 3 . 2 . 1 .', env: 'bell', wave: 'sine', oct: 12, dec: 0.4, vol: 0.03 },
    pad: { vol: 0.03 },
  },
  // ごろごろ切り通し：ごろごろ団の、がらの悪いロック
  pass: {
    bpm: 144, gain: 1.1, lp: 4500, prog: 'Em Em G A Em Em C,D Em C D Em Em C D B7 Em',
    lead: { wave: 'square', vol: 0.12, det: 6, seq: `
      E5 . E5 G5 . E5 A5 G5 | E5 - D5 - B4 - . . | D5 . D5 G5 . D5 B5 A5 | A5 - G5 - E5 - . . |
      E5 . G5 A5 B5 . A5 G5 | E5 - G5 - A5 - Bb5 B5 | C6 - B5 A5 D6 - C6 A5 | B5 - - - E5 . . . |
      G5 - - E5 G5 - A5 - | F#5 - - D5 F#5 - A5 - | G5 - F#5 E5 D5 - B4 - | E5 - - - - . . . |
      E5 - G5 - C6 - B5 - | A5 - F#5 - D5 - E5 F#5 | D#5 - F#5 - A5 - B5 - | E5 - - - - . . .` },
    bass: { pat: 'r . r r . r f o', wave: 'sawtooth', env: 'pluck', dec: 0.12, vol: 0.2 },
    drums: { vol: 0.8, k: 'x.....x.x.......', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.' },
  },
  // くろねこ谷（谷・集落）：風のふく、さびしい谷
  kuroneko: {
    bpm: 76, gain: 0.8, prog: 'Am F C G Am F Dm E F G Em Am Dm Am F E',
    lead: { wave: 'sine', vol: 0.24, echo: 0.35, vib: 6, seq: `
      E5 - - - A5 - - G5 | F5 - - - C5 - - . | E5 - - D5 C5 - G4 - | D5 - - - - - . . |
      E5 - - - A5 - B5 - | C6 - - B5 A5 - - . | F5 - - E5 D5 - A4 - | B4 - - - G#4 - . . |
      A4 - - C5 F5 - - E5 | D5 - - - B4 - . . | G5 - - - E5 - B4 - | C5 - - - A4 - - . |
      F5 - - - D5 - A5 - | E5 - - - C5 - - . | A5 - G5 - F5 - C5 - | B4 - - - - - . .` },
    bass: { pat: 'r - - - f - - -', wave: 'sine', vol: 0.26 },
    arp: { div: 2, pat: '0 . 1 . 2 . 1 .', dec: 0.3, vol: 0.035 },
    pad: { vol: 0.03 },
  },
  // 苔むす古道・古代遺跡の外：なぞめいた冒険
  ancient: {
    bpm: 100, prog: 'Em C D Em Em C Am B C D Bm Em Am C Am B',
    lead: { wave: 'triangle', vol: 0.2, echo: 0.25, seq: `
      B4 - E5 - F#5 - G5 - | G5 - - E5 C5 - . . | D5 - F#5 - A5 - G5 F#5 | E5 - - - - - . . |
      B5 - - A5 G5 - F#5 G5 | E5 - - - C5 - E5 - | A5 - G5 - E5 - C5 - | D#5 - - - B4 - . . |
      E5 - G5 - C6 - B5 - | A5 - - F#5 D5 - . . | B5 - A5 - F#5 - D5 - | E5 - - - G5 - . . |
      C6 - - B5 A5 - E5 - | G5 - - E5 C5 - . . | A5 - C6 - E5 - A5 - | F#5 - - - D#5 - . .` },
    bass: { pat: 'r - - . r - f -', vol: 0.28 },
    arp: { div: 2, pat: '0 . 1 . 2 . 1 .', vol: 0.035 },
    drums: { vol: 0.6, k: 'x.......x...x...', t: '......x.......x.' },
  },
  // 魔王領・魔王城：どこかとぼけた、魔族の行進
  demonland: {
    bpm: 108, gain: 1.7, lp: 3000, prog: 'Cm Cm Ab G Cm Fm G Cm Ab Bb Eb G Fm Cm Ab G',
    lead: { wave: 'sawtooth', vol: 0.13, det: 4, seq: `
      C5 . C5 . Eb5 - D5 C5 | G5 - - - F5 Eb5 D5 - | C5 . C5 . Eb5 - Ab5 G5 | G5 - - - B4 - . . |
      C5 . Eb5 . G5 - C6 - | Ab5 - G5 - F5 - C5 - | D5 - B4 - G4 - B4 D5 | C5 - - - - . . . |
      Eb5 - - C5 Ab4 - C5 Eb5 | D5 - - Bb4 F4 - Bb4 D5 | G5 - F5 Eb5 Bb4 - Eb5 - | D5 - - - B4 - G4 - |
      Ab5 - - G5 F5 - C5 - | Eb5 - - D5 C5 - G4 - | Ab4 - C5 - Eb5 - Ab5 - | G5 - F5 - D5 - B4 -` },
    bass: { pat: 'r . f . r . f .', wave: 'square', env: 'pluck', dec: 0.12, vol: 0.16 },
    drums: { vol: 0.6, k: 'x.......x.......', s: '....x.......x.x.' },
  },
  // にゃんだーの樹・根もと：おごそかで、すこし悲しい
  tree: {
    bpm: 72, gain: 0.75, prog: 'Ab Eb/G Fm Db Ab Eb Db Eb Fm Db Ab Eb/G Fm Db Bbm Eb',
    lead: { wave: 'sine', vol: 0.24, echo: 0.35, vib: 5, seq: `
      C5 - - - Eb5 - - Ab5 | G5 - - - Bb4 - - . | Ab4 - - C5 F5 - - Eb5 | F5 - - - - - . . |
      Eb5 - - - C5 - Ab4 - | Bb4 - - - G5 - Eb5 - | F5 - - Eb5 Db5 - Ab4 - | G4 - - - - - . . |
      C5 - - - F5 - Ab5 - | Ab5 - - - F5 - Db5 - | Eb5 - - - Ab5 - C6 - | Bb5 - - - G5 - - . |
      Ab5 - - G5 F5 - C5 - | Db5 - - - F5 - Ab5 - | F5 - - - Db5 - Bb4 - | G4 - - - Bb4 - Eb5 -` },
    bass: { pat: 'r - - - - - - -', wave: 'sine', vol: 0.28 },
    arp: { pat: '0 . 2 . 4 . 2 . 3 . 2 . 4 . 2 .', env: 'bell', wave: 'sine', oct: 12, vol: 0.025 },
    pad: { vol: 0.03 },
  },
  // 世界の果て：なにもない、果てしない景色
  worldend: {
    bpm: 92, gain: 0.93, prog: 'Dm Bb F C Dm Bb Gm A Bb C Am Dm Gm Bb Gm A',
    lead: { wave: 'triangle', vol: 0.2, echo: 0.35, vib: 5, seq: `
      A4 - - - D5 - - E5 | F5 - - - D5 - - . | C5 - - - F5 - - G5 | E5 - - - - - . . |
      A5 - - - G5 - F5 - | F5 - - - D5 - Bb4 - | D5 - - - Bb4 - G4 - | C#5 - - - - - . . |
      D5 - - - F5 - Bb5 - | G5 - - - E5 - C5 - | E5 - - - A5 - C6 - | A5 - - - - - . . |
      Bb5 - - - G5 - D5 - | F5 - - - D5 - Bb4 - | G4 - - - Bb4 - D5 - | E5 - - - C#5 - - .` },
    bass: { pat: 'r - - - - - f -', vol: 0.28 },
    arp: { div: 2, pat: '0 . 1 . 2 . 1 .', vol: 0.03 },
    pad: { vol: 0.035 },
    drums: { vol: 0.6, T: 'x...............x.......x.......' },
  },
  // ねこ神の夢：オルゴールのワルツ。ときどき、ありえない和音へ
  dream: {
    bpm: 132, gain: 1.25, bar: 12, prog: 'E G#m A E C#m F# B B7 A E F#m B C A B7 E',
    lead: { wave: 'sine', env: 'bell', dec: 0.35, vol: 0.22, echo: 0.2, seq: `
      B5 - G#5 - E5 - | D#6 - B5 - G#5 - | C#6 - - B5 A5 - | G#5 - - - . . |
      E5 - G#5 - C#6 - | A#5 - - G#5 F#5 - | D#5 - F#5 - B5 - | A5 - - - . . |
      C#6 - A5 - E5 - | B5 - G#5 - E5 - | A5 - - G#5 F#5 - | D#5 - - - B4 - |
      E5 - G5 - C6 - | C#6 - - - A5 - | D#6 - C#6 B5 A5 - | G#5 - - - . .` },
    bass: { pat: 'r - . . f .', wave: 'sine', env: 'pluck', dec: 0.25, vol: 0.3 },
    arp: { div: 2, pat: '. . 1 . 2 .', env: 'bell', wave: 'sine', dec: 0.3, vol: 0.04 },
  },

  // ---- ダンジョン ----
  // ネズミの王国：ぬき足さし足の、こそこそ行進
  ratnest: {
    bpm: 138, gain: 1.7, lp: 3500, prog: 'Am Am Dm E Am F Dm,E Am F G Em Am Dm Am Dm,E Am',
    lead: { wave: 'square', env: 'pluck', dec: 0.1, vol: 0.15, seq: `
      A4 . C5 . E5 . C5 . | D#5 E5 . C5 A4 . . . | D5 . F5 . A5 . F5 . | G#4 . B4 . D5 - C5 B4 |
      A4 . E5 . A4 . E5 . | F5 . E5 . D5 . C5 . | D5 . F5 . E5 . G#4 . | A4 . . . . . . . |
      C5 . . A4 C5 . F5 . | D5 . . B4 D5 . G5 . | E5 . G5 . B5 . G5 . | A5 - - - E5 . . . |
      F5 . E5 . D5 . A4 . | C5 . B4 . A4 . E4 . | D5 . B4 . G#4 . B4 . | A4 . . . . . . .` },
    bass: { pat: 'r . f . r . f .', env: 'pluck', dec: 0.15, vol: 0.32 },
    drums: { vol: 0.5, k: 'x...............', s: '............x...', h: '..x...x...x...x.' },
  },
  // 笑顔の塔：笑いの消えたサーカスの、あやしいワルツ
  tower: {
    bpm: 160, gain: 1.33, bar: 12, lp: 4000, prog: 'Dm Dm A7 A7 A7 A7 Dm Dm Gm Dm A7 Dm Gm Dm A7 Dm',
    lead: { wave: 'square', vol: 0.12, vib: 18, seq: `
      D5 - - C#5 D5 - | F5 - - E5 D5 - | C#5 - - C5 C#5 - | E5 - - G5 - . |
      G5 - - F5 E5 - | C#5 - E5 - A5 - | A5 - - G#5 A5 - | F5 - - - . . |
      Bb5 - - A5 G5 - | F5 - - E5 D5 - | E5 - - D5 C#5 - | D5 - F5 - A5 - |
      G5 - - Bb5 D6 - | A5 - - F5 D5 - | G5 - E5 - C#5 - | D5 - - - . .` },
    bass: { pat: 'r - . . . . f - . . . .', vol: 0.32 },
    stab: { pat: '....x...x...', wave: 'square', vol: 0.035, dec: 0.08 },
    drums: { vol: 0.5, k: 'x...........' },
  },
  // 黒影洞窟：しずくの落ちる、暗い洞窟
  cave: {
    bpm: 64, gain: 0.72, lp: 1500, prog: 'C#m A C#m G#m C#m F#m A G#',
    lead: { wave: 'triangle', vol: 0.22, echo: 0.45, vib: 4, seq: `
      C#5 - - - - - E5 - | D#5 - - - - - . . | C#5 - - - G#4 - - - | B4 - - - - - . . |
      G#5 - - - - - E5 - | F#5 - - - A5 - - - | G#5 - - - E5 - - - | C5 - - - G#4 - . .` },
    bass: { pat: 'r - - - - - - -', wave: 'sine', vol: 0.32 },
    arp: { div: 2, pat: '. . . . . . 4 . | . . . . . . . . | . . 3 . . . . . | . . . . . 5 . .', env: 'bell', wave: 'sine', oct: 12, dec: 0.5, vol: 0.035 },
    pad: { wave: 'triangle', vol: 0.025 },
    drums: { vol: 0.6, T: 'x...............................' },
  },
  // 古代遺跡の中：なぞの壁画と、時の水晶。C の持続音の上で、中東の旋法を笛と弦が重ねて歌う。手太鼓はドゥム・テク
  ruins: {
    bpm: 104, gain: 0.82, lp: 5000, prog: 'C Db/C C Bbm/C C Db/C Fm/C C Fm Bbm Fm C Db Bbm Db C',
    lead: { wave: 'triangle', vol: 0.2, echo: 0.2, vib: 10, seq: `
      G4 - C5 - Db5 - E5 - | F5 - - E5 Db5 - - C5 | E5 - G5 F5 E5 - Db5 E5 | Db5 C5 Db5 C5 Bb4 - - - |
      C5 - E5 - G5 - Ab5 G5 | F5 - - E5 F5 - Ab5 - | Ab5 - - G5 F5 - C5 - | E5 - Db5 - C5 - - . |
      C5 - F5 - Ab5 - G5 Ab5 | Bb5 - - Ab5 F5 - Db5 - | F5 - - G5 Ab5 - G5 F5 | G5 - - F5 E5 - - - |
      Ab5 - - - F5 - Db5 - | F5 - - E5 F5 - Bb5 - | Ab5 - - G5 F5 - E5 Db5 | C5 - - - - - . .` },
    // 同じ旋律を、1 オクターブ下で弦がなぞる
    lead2: { from: 'lead', wave: 'sawtooth', env: 'pluck', dec: 0.18, oct: -12, vol: 0.09 },
    bass: { pat: 'r - - - - - - -', wave: 'sine', vol: 0.3 },
    // ウードのような刻み
    arp: { pat: '0 . 0 0 . . 2 . 0 . 0 0 . . 1 .', wave: 'sawtooth', dec: 0.09, oct: -12, vol: 0.07 },
    pad: { vol: 0.03 },
    drums: { vol: 0.6, t: 'x.......x.......', h: '..x...x.....x.x.' },
  },
  // 樹の地下：しおれた根の奥で、かすかな鼓動
  root: {
    bpm: 66, gain: 0.72, lp: 1600, prog: 'Bm G Bm F# Bm Em C F#',
    lead: { wave: 'triangle', vol: 0.22, echo: 0.4, seq: `
      F#4 - - - B4 - - - | D5 - - - - - B4 - | C#5 - - - D5 - - . | A#4 - - - - - . . |
      B4 - - - F#5 - - - | G5 - - - E5 - - . | E5 - - - G5 - - - | F#5 - - - C#5 - . .` },
    bass: { pat: 'r - - - - - - -', wave: 'sine', vol: 0.32 },
    pad: { wave: 'triangle', vol: 0.025 },
    drums: { vol: 0.7, k: 'x..x............' },
  },

  // ---- 戦闘 ----
  // ふつうの戦い
  battle: {
    bpm: 168, gain: 1.1, prog: 'Am F G Am Am F G E F G Em Am Dm F E E',
    lead: { wave: 'square', vol: 0.12, det: 5, seq: `
      A4 . A4 C5 E5 . D5 C5 | F5 - E5 - C5 - A4 - | B4 . B4 D5 G5 . F5 E5 | E5 - - - A4 - . . |
      A5 . A5 G5 E5 . C5 E5 | F5 - E5 - D5 - C5 - | D5 . D5 E5 G5 - B5 - | G#5 - - - E5 - B4 - |
      C6 - - A5 F5 - A5 C6 | B5 - - G5 D5 - G5 B5 | G5 - - E5 B4 - E5 G5 | A5 - - - E5 - - . |
      F5 . F5 E5 D5 . A4 D5 | C5 . C5 D5 F5 . A5 C6 | B5 - G#5 - E5 - D5 - | G#4 - B4 - D5 - E5 -` },
    bass: { pat: 'r r o r r r o r', wave: 'sawtooth', env: 'pluck', dec: 0.1, vol: 0.2 },
    arp: { pat: '0 2 4 2', wave: 'square', dec: 0.05, vol: 0.025 },
    drums: { vol: 0.8, k: 'x.......x.x.....', s: '....x.......x...', h: 'x.x.x.x.x.x.x.x.', c: CR(8) },
  },
  // ボス戦
  boss: {
    bpm: 176, prog: 'Em Em C D Em Em F B C D Em Em C D F B',
    lead: { wave: 'sawtooth', vol: 0.11, det: 9, seq: `
      E5 - - E5 F5 - E5 D5 | E5 - B4 - G4 - B4 - | C5 - - E5 G5 - - E5 | F#5 - - - D5 - A4 - |
      E5 . E5 . G5 . E5 . | B5 - A5 - G5 - F#5 - | A5 - - - F5 - C5 - | D#5 - - - F#5 - B5 - |
      G5 - - - E5 - C5 - | A5 - - - F#5 - D5 - | B5 - - A5 G5 - - E5 | F5 - E5 - D5 - B4 - |
      E5 - G5 - C6 - B5 - | A5 - F#5 - D5 - F#5 - | A5 - C6 - F5 - A5 - | B5 - - - D#5 - F#5 -` },
    lead2: { from: 'lead', wave: 'square', oct: -12, vol: 0.06 },
    bass: { div: 4, pat: 'r . r r r . r r r . r r o . f .', wave: 'sawtooth', env: 'pluck', dec: 0.08, vol: 0.2 },
    pad: { wave: 'sawtooth', vol: 0.015 },
    drums: { vol: 0.85, k: 'x...x...x...x...', s: '....x.......x..x', h: '..x...x...x...x.', c: CR(8) },
  },
  // ラスボス戦（コドク）：タイトルのテーマ（ぽかぽか村とかなしい場面の旋律）を、ハ短調で。
  //   前奏：回り音形の低いリフ → A：村の旋律を 4 分音符で大きく → B：かなしい場面の旋律（ドラムは半分の速さ）
  //   → C：村の旋律をもとの速さで、回り音形を一段ずつ上げて前奏へ
  lastboss: {
    bpm: 152,
    prog: `Cm Ab Fm G
      Cm Ab Bb G Cm Ab Gsus4,G Cm
      Cm Cm/Bb Ab G Ab Cm,Bb G Cm,G
      Cm G7 Cm,Ab Ab,Cm Ab Bb Cm G`,
    lead: { wave: 'sawtooth', vol: 0.11, det: 9, vib: 5, seq: `
      C5 D5 C5 B4 C5 . G4 . | Ab4 Bb4 Ab4 G4 Ab4 . Eb4 . | F4 G4 F4 E4 F4 . C5 . | G5 . F5 . D5 . B4 . |
      C5 - D5 - Eb5 - G5 - | Eb5 - D5 - C5 - - - | D5 - Eb5 - F5 - Eb5 - | D5 - C5 - B4 - - - |
      C5 - D5 - Eb5 - G5 - | Ab5 - G5 - Eb5 - D5 - | C5 - D5 - C5 - B4 - | C5 - - - - - . . |
      C5 - - - Eb5 - D5 - | C5 - - - Bb4 - - - | Ab4 - - - Bb4 - C5 - | G4 - - - - - - - |
      C5 - - - Eb5 - F5 - | G5 - - - F5 - Eb5 - | D5 - - - Eb5 - D5 - | C5 - - - . . . . |
      C5 D5 Eb5 G5 Eb5 D5 C5 . | D5 Eb5 F5 Eb5 D5 C5 B4 . | C5 D5 Eb5 G5 Ab5 G5 Eb5 D5 | C5 D5 C5 B4 C5 . . . |
      Eb5 F5 Eb5 D5 Eb5 . C5 . | F5 G5 F5 Eb5 F5 . D5 . | G5 Ab5 G5 F5 G5 . Eb5 . | G5 - B5 - D6 - - - |` },
    lead2: { from: 'lead', wave: 'sawtooth', oct: -12, vol: 0.05 },
    arp: { pat: '0 1 2 3 4 3 2 1', wave: 'square', dec: 0.05, vol: 0.025 },
    bass: { pat: 'r - r r o - r r', wave: 'sawtooth', env: 'pluck', dec: 0.12, vol: 0.22 },
    pad: { wave: 'sawtooth', vol: 0.02 },
    // 各段の終わりに小太鼓のフィル。B は半分の速さ、C は 4 つ打ち
    drums: {
      vol: 0.85,
      k: 'x.....x...x.....'.repeat(12) + 'x.........x.....'.repeat(8) + 'x...x...x...x...'.repeat(8),
      s: '....x.......x...'.repeat(3) + '....x...x.x.xxxx' + '....x.......x...'.repeat(7) + '....x...x.x.xxxx' +
        '........x.......'.repeat(7) + '....x...x.x.xxxx' + '....x.......x...'.repeat(7) + '....x...x.x.xxxx',
      h: '..x...x...x...x.'.repeat(12) + 'x...x...x...x...'.repeat(8) + 'x.x.x.x.x.x.x.x.'.repeat(8),
      T: 'x...............',
      c: CR(4) + CR(8).repeat(3),
    },
  },
};

// ---- 楽譜を読む ----
const NOTE_PC = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const pcOf = s => (NOTE_PC[s[0]] + (s[1] === '#' ? 1 : s[1] === 'b' ? 11 : 0)) % 12;
function midiOf(s) {
  const m = /^([A-G][#b]?)(\d)$/.exec(s);
  if (!m) throw new Error('BGM：読めない音名 ' + s);
  return pcOf(m[1]) + 12 * (+m[2] + 1);
}
const CHORD_IV = { '': [0, 4, 7], m: [0, 3, 7], 7: [0, 4, 7, 10], m7: [0, 3, 7, 10], M7: [0, 4, 7, 11], dim: [0, 3, 6], m7b5: [0, 3, 6, 10], aug: [0, 4, 8], sus4: [0, 5, 7] };
// 和音記号 → 和音の音（E3〜D#4 に根音）・ベースの音（E2〜D#3）
function chordOf(s) {
  const m = /^([A-G][#b]?)([^/]*)(?:\/([A-G][#b]?))?$/.exec(s), iv = m && CHORD_IV[m[2]];
  if (!iv) throw new Error('BGM：読めない和音 ' + s);
  const pc = pcOf(m[1]), r = 52 + (pc + 8) % 12;
  return { tones: iv.map(i => r + i), iv, root: 40 + (pc + 8) % 12, bass: 40 + ((m[3] ? pcOf(m[3]) : pc) + 8) % 12 };
}
// 旋律や型の文字列 → マスごとの { v, len }（len はのばすマスもふくめた長さ）
function seqOf(str, read) {
  const ev = []; let last = null;
  str.split(/\s+/).filter(t => t && t !== '|').forEach(t => {
    if (t === '-') { if (last) last.len++; ev.push(null); }
    else if (t === '.') { last = null; ev.push(null); }
    else ev.push(last = { v: read(t), len: 1 });
  });
  return ev;
}
const hitsOf = str => [...str.replace(/\s/g, '')].map(c => c === '.' ? null : { v: c === 'X' ? 1.4 : 1, len: 1 });
const PART_DEF = {
  note: { div: 2, wave: 'square', env: 'norm', vol: 0.2, gate: 0.92, oct: 0 },
  bass: { div: 2, wave: 'triangle', env: 'norm', vol: 0.3, gate: 0.9, oct: 0 },
  arp: { div: 4, wave: 'triangle', env: 'pluck', vol: 0.05, gate: 0.9, oct: 0 },
  stab: { div: 4, wave: 'square', env: 'pluck', vol: 0.04, gate: 1, oct: 0 },
  pad: { wave: 'sine', env: 'pad', vol: 0.04, gate: 0.98, oct: 0 },
};
function compileTrack(T) {
  if (T._c) return T._c;
  const C = { bpm: T.bpm, sw: T.sw || 0, lp: T.lp, gain: T.gain || 1, dly: T.dly || 3, parts: [], drums: [] };
  const add = (kind, spec, ev) => C.parts.push({ ...PART_DEF[kind], ...spec, kind, ev });
  if (T.prog) {
    const bar = T.bar || 16, slots = [];
    T.prog.split(/\s+/).filter(Boolean).forEach(tok => tok.split(',').forEach((p, _, a) => {
      const len = bar / a.length;
      if (p === '-') slots[slots.length - 1].len += len; else slots.push({ c: chordOf(p), len });
    }));
    C.at = []; slots.forEach((s, i) => { s.start = C.at.length; for (let k = 0; k < s.len; k++) C.at.push(i); });
    C.slots = slots;
  }
  if (T.mel) {   // 昔の書き方
    add('note', { wave: T.wave, vol: 0.22, gate: 0.9 }, T.mel.map(m => m ? { v: m, len: 1 } : null));
    add('note', { div: 1, wave: 'triangle', vol: 0.35, gate: 0.85 }, T.bass.map(m => m ? { v: m, len: 1 } : null));
    add('note', { div: 0.25, wave: 'sine', vol: 0.08, gate: 0.94 }, T.chords.map(c => ({ v: c, len: 1 })));
    return T._c = C;
  }
  ['lead', 'lead2'].forEach(k => { const p = T[k]; if (p) add('note', p, seqOf(p.seq || T[p.from].seq, midiOf)); });
  if (T.bass && typeof T.bass === 'object') add('bass', T.bass, seqOf(T.bass.pat, t => { if (!'rfots'.includes(t)) throw new Error('BGM：ベースの型 ' + t); return t; }));
  if (T.arp) add('arp', T.arp, seqOf(T.arp.pat, t => { if (!/^\d$/.test(t)) throw new Error('BGM：アルペジオの型 ' + t); return +t; }));
  if (T.stab) add('stab', T.stab, hitsOf(T.stab.pat));
  if (T.pad) add('pad', T.pad, null);
  if (T.drums) Object.entries(T.drums).forEach(([k, row]) => { if (k !== 'vol') C.drums.push({ key: k, ev: hitsOf(row), vol: T.drums.vol || 1 }); });
  return T._c = C;
}

// ---- 鳴らす ----
const DRUM_VOL = { k: 0.9, s: 0.35, h: 0.1, o: 0.09, t: 0.45, T: 0.7, c: 0.12 };
const noiseBufs = new WeakMap();
function noiseBuf(ctx) {
  let b = noiseBufs.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBufs.set(ctx, b);
  }
  return b;
}
const bassNote = (t, c) => t === 'r' ? c.bass : t === 'o' ? c.bass + 12 : t === 'f' ? c.root + 7 : t === 't' ? c.root + c.iv[1] : c.root + (c.iv[3] || 12);
// ひとつの曲を、ctx の時間で out へ流す（オフラインでの書き出しにも使える）
class MusicPlayer {
  constructor(ctx, out, T) {
    this.ctx = ctx; this.T = compileTrack(T); this.tick = 60 / this.T.bpm / 4;
    this.i = 0; this.next = ctx.currentTime + 0.1;
    const bus = this.bus = ctx.createGain(); bus.gain.value = this.T.gain;
    this.nodes = [bus];
    let o = bus;
    if (this.T.lp) { const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = this.T.lp; f.Q.value = 0.4; bus.connect(f); o = f; this.nodes.push(f); }
    o.connect(out);
    const P = this.T.parts;
    if (P.some(p => p.echo)) {
      const d = ctx.createDelay(2), fb = ctx.createGain();
      d.delayTime.value = this.T.dly * this.tick; fb.gain.value = 0.38;
      d.connect(fb); fb.connect(d); d.connect(bus); this.echo = d; this.nodes.push(d, fb);
    }
    if (P.some(p => p.vib)) { this.lfo = ctx.createOscillator(); this.lfo.frequency.value = 5.5; this.lfo.start(); this.nodes.push(this.lfo); }
    // パートごとの、やまびこへの送り・ゆれの深さ
    this.pn = P.map(p => {
      const n = {};
      if (p.echo) { n.send = ctx.createGain(); n.send.gain.value = p.echo; n.send.connect(this.echo); this.nodes.push(n.send); }
      if (p.vib) { n.vib = ctx.createGain(); n.vib.gain.value = p.vib; this.lfo.connect(n.vib); this.nodes.push(n.vib); }
      return n;
    });
  }
  chord(i) { const C = this.T; return C.slots[C.at[i % C.at.length]]; }
  schedule(until, now = 0) {
    const C = this.T;
    while (this.next < now) { this.i++; this.next += this.tick; }   // 画面が止まっていたぶんは鳴らさずに飛ばす
    while (this.next < until) {
      const i = this.i, t = this.next + (C.sw && i % 4 === 2 ? C.sw * this.tick * 2 : 0);
      C.parts.forEach((p, k) => this.part(p, k, i, t));
      C.drums.forEach(d => { const e = d.ev[i % d.ev.length]; if (e) this.drum(d.key, t, e.v * d.vol); });
      this.i++; this.next += this.tick;
    }
  }
  part(p, k, i, t) {
    if (p.kind === 'pad') {
      const s = this.chord(i);
      if (s.start === i % this.T.at.length) s.c.tones.forEach(m => this.note(m + p.oct, t, s.len * this.tick * p.gate, p, k));
      return;
    }
    const every = 4 / p.div; if (i % every) return;
    const e = p.ev[(i / every) % p.ev.length]; if (!e) return;
    const dur = e.len * every * this.tick * p.gate;
    if (p.kind === 'note') { [].concat(e.v).forEach(m => this.note(m + p.oct, t, dur, p, k)); return; }
    const c = this.chord(i).c;
    if (p.kind === 'bass') this.note(bassNote(e.v, c) + p.oct, t, dur, p, k);
    else if (p.kind === 'arp') { const n = c.tones.length; this.note(c.tones[e.v % n] + 12 * Math.floor(e.v / n) + p.oct, t, dur, p, k); }
    else c.tones.forEach(m => this.note(m + p.oct, t, dur, p, k));
  }
  note(m, t, dur, p, k) {
    const ctx = this.ctx, f = 440 * Math.pow(2, (m - 69) / 12), g = ctx.createGain(), G = g.gain, n = this.pn[k];
    const v = p.det ? p.vol * 0.65 : p.vol, dec = p.dec || (p.env === 'bell' ? 0.35 : 0.12);
    let end;
    if (p.env === 'pluck' || p.env === 'bell') {
      G.setValueAtTime(0.0001, t); G.exponentialRampToValueAtTime(v, t + 0.005); G.setTargetAtTime(0.0001, t + 0.005, dec); end = t + dec * 6;
    } else if (p.env === 'pad') {
      G.setValueAtTime(0, t); G.linearRampToValueAtTime(v, t + Math.min(0.4, dur * 0.4)); G.setTargetAtTime(0, t + dur, 0.15); end = t + dur + 0.8;
    } else {
      G.setValueAtTime(0.0001, t); G.exponentialRampToValueAtTime(v, t + 0.012);
      G.setTargetAtTime(v * 0.55, t + 0.012, Math.max(0.05, dur * 0.6)); G.setTargetAtTime(0.0001, t + dur, 0.03); end = t + dur + 0.2;
    }
    const osc = (freq, dt) => {
      const o = ctx.createOscillator(); o.type = p.wave; o.frequency.value = freq;
      if (dt) o.detune.value = dt;
      if (n.vib) { n.vib.connect(o.detune); o.onended = () => { try { n.vib.disconnect(o.detune); } catch (e) { /* 曲を止めたときに、もう外れている */ } }; }
      o.start(t); o.stop(end); return o;
    };
    (p.det ? [-p.det, p.det] : [0]).forEach(dt => osc(f, dt).connect(g));
    // 鈴：上の倍音を少しだけ、早く消えるように
    if (p.env === 'bell') {
      const g2 = ctx.createGain(); g2.gain.setValueAtTime(v * 0.25, t); g2.gain.setTargetAtTime(0.0001, t + 0.002, dec / 3);
      const o = ctx.createOscillator(); o.type = 'sine'; o.frequency.value = f * 3; o.connect(g2); g2.connect(g); o.start(t); o.stop(end);
    }
    g.connect(this.bus); if (n.send) g.connect(n.send);
  }
  drum(key, t, a) {
    const ctx = this.ctx, g = ctx.createGain(), G = g.gain, v = a * DRUM_VOL[key];
    const hit = dec => { G.setValueAtTime(v, t); G.setTargetAtTime(0.0001, t + 0.002, dec); return t + dec * 7; };
    g.connect(this.bus);
    if ('ktT'.includes(key)) {
      const [f0, f1, dec] = { k: [150, 42, 0.07], t: [170, 95, 0.12], T: [95, 58, 0.3] }[key], o = ctx.createOscillator();
      o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dec * 1.5);
      o.connect(g); o.start(t); o.stop(hit(dec));
      return;
    }
    const [type, fq, dec] = { s: ['highpass', 1300, 0.06], h: ['highpass', 7500, 0.018], o: ['highpass', 6500, 0.09], c: ['highpass', 4000, 0.45] }[key];
    const s = ctx.createBufferSource(), f = ctx.createBiquadFilter();
    s.buffer = noiseBuf(ctx); s.loop = true; f.type = type; f.frequency.value = fq;
    s.connect(f); f.connect(g); s.start(t, Math.random()); s.stop(hit(dec));
    if (key === 's') {   // スネアの胴鳴り
      const o = ctx.createOscillator(), g2 = ctx.createGain(); o.type = 'triangle';
      o.frequency.setValueAtTime(200, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.06);
      g2.gain.setValueAtTime(v * 0.8, t); g2.gain.setTargetAtTime(0.0001, t + 0.002, 0.04);
      o.connect(g2); g2.connect(this.bus); o.start(t); o.stop(t + 0.3);
    }
  }
  dispose() { if (this.lfo) this.lfo.stop(); this.nodes.forEach(n => n.disconnect()); }
}

const Music = {
  cur: null, timer: null, player: null, out: null, vol: 0.5, on: true,
  play(name) {
    if (!Sfx.ctx || !this.on) { this.want = name; return; }
    if (this.cur === name) return;
    this.stop(); this.cur = name;
    const T = TRACKS[name]; if (!T) return;
    const ctx = Sfx.ctx, out = this.out = ctx.createGain(), now = ctx.currentTime;
    out.gain.setValueAtTime(0, now); out.gain.linearRampToValueAtTime(0.16 * this.vol, now + 1.2); out.connect(Sfx.bgm);
    const p = this.player = new MusicPlayer(ctx, out, T);
    // 画面が隠れているとタイマーが間引かれるので、そのぶん先まで書いておく
    const tick = () => p.schedule(ctx.currentTime + (document.hidden ? 1.5 : 0.4), ctx.currentTime);
    tick(); this.timer = setInterval(tick, 80);
  },
  stop() {
    if (this.timer) clearInterval(this.timer);
    const ctx = Sfx.ctx, out = this.out, p = this.player;
    if (out && ctx) {
      const g = out.gain, now = ctx.currentTime;
      g.cancelScheduledValues(now); g.setValueAtTime(g.value, now); g.linearRampToValueAtTime(0, now + 0.5);
      setTimeout(() => { out.disconnect(); p.dispose(); }, 700);
    }
    this.timer = null; this.out = null; this.player = null; this.cur = null;
  },
  toggle() { this.on = !this.on; if (!this.on) { const c = this.cur; this.stop(); this.want = c || this.want; } else if (this.want) this.play(this.want); return this.on; },
};
// 戦いの曲：ラスボス（final）がいればラスボス戦、ボスがいればボス戦、ほかはふつうの戦い
function battleBgm(waves) {
  const foes = waves.flat().map(e => ENEMIES[e.key]);
  return foes.some(d => d.final) ? 'lastboss' : foes.some(d => d.boss) ? 'boss' : 'battle';
}
