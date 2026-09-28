'use strict';
// WebAudio による簡易効果音（外部ファイル不要）
const Sfx = {
  ctx: null, master: null, on: true,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
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
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.08, 0, i * 0.12)); },
  lose() { [392, 330, 262].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.08, 0, i * 0.2)); },
  warp(r) {
    this.noise(1.2, 0.15, 1200);
    const base = r === 5 ? [523, 659, 784, 1046, 1318] : r === 4 ? [440, 554, 659, 880] : [392, 494, 587];
    base.forEach((f, i) => this.tone(f, 0.6, 'triangle', 0.07, 0, 0.3 + i * 0.1));
  },
};
