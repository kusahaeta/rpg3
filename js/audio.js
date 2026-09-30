'use strict';
// WebAudio による効果音・にゃんこの声・BGM（外部ファイル不要）
const Sfx = {
  ctx: null, master: null, on: true,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    setTimeout(() => { if (typeof Music !== 'undefined' && Music.want) { const w = Music.want; Music.want = null; Music.play(w); } }, 50);
    try {
      this.ctx = new (window.AudioContext || window.webkitAudioContext)();
      this.master = this.ctx.createGain(); this.master.gain.value = 0.5; this.master.connect(this.ctx.destination);
    } catch (e) { this.ctx = null; }
  },
  tone(freq, dur, type = 'sine', vol = 0.15, slide = 0, delay = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + delay, o = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.master); o.start(t); o.stop(t + dur + 0.05);
  },
  noise(dur, vol = 0.2, freq = 2000, delay = 0) {
    if (!this.ctx || !this.on) return;
    const t = this.ctx.currentTime + delay, n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = this.ctx.createBufferSource(), f = this.ctx.createBiquadFilter(), g = this.ctx.createGain();
    s.buffer = buf; f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 0.8; g.gain.value = vol;
    s.connect(f); f.connect(g); g.connect(this.master); s.start(t);
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
  heal() { this.tone(660, 0.2, 'sine', 0.08); this.tone(990, 0.3, 'sine', 0.07, 0, 0.08); },
  shield() { this.tone(440, 0.25, 'triangle', 0.07, 300); },
  kill() { this.tone(300, 0.35, 'sine', 0.1, -240); },
  enemy() { this.noise(0.2, 0.2, 600); this.tone(110, 0.2, 'sawtooth', 0.06, -40); },
  turn() { this.tone(1046, 0.06, 'sine', 0.05); },
  door() { this.noise(0.35, 0.08, 900); this.tone(520, 0.12, 'sine', 0.025, 180); },
  lift() { this.noise(0.9, 0.06, 400); this.tone(180, 0.8, 'triangle', 0.035, 60); this.tone(880, 0.1, 'sine', 0.04, 0, 0.05); },
  // 笑顔の塔の仕掛け：トランポリン（ぼよよーん）、ブーブークッション、笑い袋（ワッハッハ）、びっくり箱（ばあっ）
  boing() { this.tone(150, 0.12, 'sine', 0.14, 260); this.tone(420, 0.45, 'sine', 0.1, -260, 0.1); this.tone(640, 0.3, 'triangle', 0.03, -300, 0.14); },
  boo() { this.tone(118, 0.6, 'sawtooth', 0.08, -52); this.tone(92, 0.55, 'square', 0.035, -30, 0.04); this.noise(0.5, 0.07, 280); },
  laugh() { [660, 600, 560, 520, 480, 450].forEach((f, i) => { this.tone(f, 0.11, 'sawtooth', 0.045, -90, i * 0.13); this.noise(0.06, 0.05, 1800, i * 0.13); }); },
  // まどろみの林：綿毛につかまる（ふわっと風の音）・ねむり花が粉をはく・寝息
  fluff() { this.noise(1.2, 0.06, 2600); this.tone(660, 0.7, 'sine', 0.035, 330); this.tone(990, 0.6, 'sine', 0.025, 260, 0.12); },
  puff() { this.noise(0.9, 0.07, 650); this.tone(520, 0.8, 'sine', 0.025, -260); this.tone(780, 0.6, 'triangle', 0.015, -300, 0.1); },
  snore() { [0, 0.9].forEach(t => { this.noise(0.5, 0.05, 420, t); this.tone(150, 0.45, 'sawtooth', 0.025, -50, t); this.tone(420, 0.35, 'sine', 0.02, 180, t + 0.5); }); },
  // なかよし関所：番犬の声、タマのこもりうた、のろし台の火
  bark() { [0, 0.22].forEach(t => { this.noise(0.09, 0.22, 900, t); this.tone(420, 0.1, 'square', 0.06, -160, t); }); },
  lullaby() { [523, 440, 392, 440, 523, 392].forEach((f, i) => this.tone(f, 0.45, 'sine', 0.05, 0, i * 0.32)); },
  fire() { this.noise(0.8, 0.14, 700); this.tone(180, 0.5, 'sawtooth', 0.04, 220); },
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
    o.connect(bp); bp.connect(g); g.connect(this.master); o.start(t); o.stop(t + 0.42);
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
//  BGM：小さなシーケンサー（メロディ・ベース・和音）
//  音名は MIDI 番号。0 は休符。1拍 = 1要素
// ------------------------------------------------------------
const TRACKS = {
  village: { bpm: 104, wave: 'triangle', mel: [72, 74, 76, 79, 76, 74, 72, 0, 74, 76, 77, 76, 74, 72, 71, 0, 72, 74, 76, 79, 81, 79, 76, 74, 72, 74, 72, 71, 72, 0, 0, 0], bass: [48, 0, 55, 0, 53, 0, 55, 0], chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]] },
  field:   { bpm: 120, wave: 'square', mel: [76, 0, 79, 81, 79, 76, 74, 0, 72, 74, 76, 0, 74, 72, 69, 0, 76, 0, 79, 81, 84, 81, 79, 76, 74, 76, 74, 72, 74, 0, 0, 0], bass: [45, 45, 52, 52, 43, 43, 50, 50], chords: [[57, 60, 64], [52, 55, 59], [55, 59, 62], [57, 60, 64]] },
  battle:  { bpm: 150, wave: 'square', mel: [69, 72, 76, 72, 74, 72, 69, 67, 69, 72, 76, 79, 77, 76, 74, 72, 69, 72, 76, 72, 74, 76, 77, 79, 81, 79, 77, 76, 74, 72, 71, 0], bass: [45, 45, 57, 45, 43, 43, 55, 43, 41, 41, 53, 41, 40, 40, 52, 40], chords: [[57, 60, 64], [55, 59, 62], [53, 57, 60], [52, 56, 59]] },
  boss:    { bpm: 160, wave: 'sawtooth', mel: [64, 0, 64, 67, 0, 64, 70, 69, 64, 0, 64, 67, 0, 71, 72, 71, 64, 0, 64, 67, 0, 64, 70, 69, 67, 69, 70, 71, 72, 71, 70, 69], bass: [40, 40, 40, 40, 43, 43, 46, 45], chords: [[52, 55, 59], [55, 58, 62], [58, 62, 65], [57, 60, 64]] },
  sad:     { bpm: 76, wave: 'sine', mel: [69, 0, 72, 71, 69, 0, 67, 0, 65, 0, 67, 69, 64, 0, 0, 0, 69, 0, 72, 74, 76, 0, 74, 72, 71, 0, 72, 71, 69, 0, 0, 0], bass: [45, 0, 41, 0, 43, 0, 40, 0], chords: [[57, 60, 64], [53, 57, 60], [55, 59, 62], [52, 55, 59]] },
  hope:    { bpm: 112, wave: 'triangle', mel: [67, 72, 76, 79, 77, 76, 74, 72, 74, 76, 77, 79, 81, 79, 77, 76, 72, 76, 79, 84, 83, 81, 79, 77, 76, 77, 79, 81, 79, 0, 0, 0], bass: [48, 48, 53, 53, 55, 55, 48, 48], chords: [[60, 64, 67], [65, 69, 72], [67, 71, 74], [60, 64, 67]] },
  dark:    { bpm: 92, wave: 'sawtooth', mel: [62, 0, 65, 0, 64, 0, 61, 0, 62, 0, 65, 69, 68, 0, 0, 0, 62, 0, 65, 0, 64, 0, 61, 0, 58, 0, 57, 0, 62, 0, 0, 0], bass: [38, 38, 38, 38, 37, 37, 34, 33], chords: [[50, 53, 57], [49, 53, 56], [46, 50, 53], [45, 49, 52]] },
};
const Music = {
  cur: null, timer: null, step: 0, next: 0, gain: null, vol: 0.5, on: true,
  play(name) {
    if (!Sfx.ctx || !this.on) { this.want = name; return; }
    if (this.cur === name) return;
    this.stop(); this.cur = name;
    const T = TRACKS[name]; if (!T) return;
    const ctx = Sfx.ctx;
    this.gain = ctx.createGain(); this.gain.gain.value = 0; this.gain.connect(Sfx.master);
    this.gain.gain.linearRampToValueAtTime(0.16 * this.vol, ctx.currentTime + 1.2);
    this.step = 0; this.next = ctx.currentTime + 0.1;
    const beat = 60 / T.bpm / 2;
    const note = (m, t, dur, type, vol) => {
      if (!m) return;
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type; o.frequency.value = 440 * Math.pow(2, (m - 69) / 12);
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.gain); o.start(t); o.stop(t + dur + 0.05);
    };
    const tick = () => {
      while (this.next < ctx.currentTime + 0.25) {
        const i = this.step, t = this.next;
        note(T.mel[i % T.mel.length], t, beat * 0.9, T.wave, 0.22);
        if (i % 2 === 0) note(T.bass[(i / 2 | 0) % T.bass.length], t, beat * 1.7, 'triangle', 0.35);
        if (i % 8 === 0) T.chords[(i / 8 | 0) % T.chords.length].forEach(m => note(m, t, beat * 7.5, 'sine', 0.08));
        this.step++; this.next += beat;
      }
    };
    tick(); this.timer = setInterval(tick, 60);
  },
  stop() {
    if (this.timer) clearInterval(this.timer);
    if (this.gain && Sfx.ctx) { const g = this.gain; g.gain.cancelScheduledValues(Sfx.ctx.currentTime); g.gain.setValueAtTime(g.gain.value, Sfx.ctx.currentTime); g.gain.linearRampToValueAtTime(0, Sfx.ctx.currentTime + 0.5); setTimeout(() => g.disconnect(), 700); }
    this.timer = null; this.gain = null; this.cur = null;
  },
  toggle() { this.on = !this.on; if (!this.on) { const c = this.cur; this.stop(); this.want = c; } else if (this.want) this.play(this.want); return this.on; },
};
