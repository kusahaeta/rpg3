'use strict';
// ============================================================
//  バトルエンジン
//  - 行動値（AV）：距離10000 / 速度
//  - SP共有（最大5）、通常攻撃+1 / スキル-1
//  - 必殺技はEP満タンでいつでも割り込み可能（1〜4キー）
//  - 靭性・弱点撃破・撃破効果（裂創/燃焼/凍結/感電/風化/くらやみ/まぶしさ）
//  - にゃんこファンタジー：「話す」（第三章から）、友情ゲージとコンボスキル、にゃんこオールスターズ
// ============================================================
const Game = { speed: 1, auto: false, activeBattle: null, activeField: null };
const wait = ms => new Promise(r => setTimeout(r, ms / Game.speed));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const fmt = n => Math.round(n).toLocaleString();

const MULT_STATS = new Set(['atk', 'def', 'maxHp', 'spd']);
const STAT_LABEL = { atk: '攻撃', def: '防御', maxHp: 'HP', spd: '速度', crit: '会心', critDmg: '会ダメ', dmg: '与ダメ', be: '撃破',
  vuln: '被ダメ', defDown: '防御', resDown: '耐性', err: 'EP', dmg_dot: '持続', dmg_ult: '必殺' };
const DOWN_STATS = new Set(['defDown', 'resDown']);
const DOT_INFO = { burn: ['燃焼', 'fire'], shock: ['感電', 'lightning'], wind: ['風化', 'wind'], bleed: ['裂創', 'physical'] };
const BREAK_COEF = { physical: 2, fire: 2, ice: 1, lightning: 1, wind: 1.5, quantum: 0.5, imaginary: 0.5 };
const ENEMY_TARGETS = new Set(['single', 'blast', 'bounce', 'aoe']);
const NEEDS_TARGET = new Set(['single', 'blast', 'bounce', 'ally']);
// 「話す」：敵の気持ちを聞いて、なごませる
const TALK_AB = { name: 'はなす', target: 'single', desc: '敵に話しかけて気持ちを聞く。はじめて話した敵は、なごんで攻撃力-20%（2ターン）・行動順が25%遅れる。SPは増減しない。' };
const talkOn = () => !!(Save.data.flags && Save.data.flags.talk);

let UID = 0;
// 敵の体力の全体倍率（にゃんこの戦いは、テンポよく）
const FOE_HP = 0.55;

class Unit {
  constructor(side, key, level, opts = {}) {
    this.uid = ++UID; this.side = side; this.key = key; this.level = level;
    this.def = side === 'ally' ? CHARS[key] : ENEMIES[key];
    this.buffs = []; this.dots = []; this.implants = []; this.flags = {};
    this.alive = true; this.gauge = 10000; this.shield = 0; this.shieldTurns = 0;
    this.frozen = null; this.entangle = null;
    if (side === 'ally') {
      this.eid = opts.eid || 0;
      this.base = charStats(key, level, this.eid);
      this.energyMax = this.def.energyMax;
      this.energy = opts.energy != null ? opts.energy : this.energyMax * 0.5;
      this.elem = this.def.elem; this.path = this.def.path;
    } else {
      const d = this.def, f = lvFactor(level);
      this.base = { maxHp: d.hp * f * (d.boss ? 1.25 : 1), atk: d.atk * f * 1.4, def: 0, spd: d.spd, eres: d.eres || 0.1, ehr: 0.1 };
      this.maxTough = d.tough; this.toughness = d.tough; this.weak = [...d.weak];
      this.broken = false; this.phase = 0; this.charging = null; this.elem = 'physical';
    }
    this.hp = this.maxHp;
  }
  get name() { return this.def.name; }
  get maxHp() { return this.stat('maxHp'); }
  stat(k) {
    const base = this.base[k] || 0; let add = 0;
    for (const b of this.buffs) if (b.stat === k) add += b.value * (b.stacks || 1);
    if (MULT_STATS.has(k)) return Math.max(k === 'spd' ? 10 : 0, base * (1 + add));
    return base + add;
  }
  isWeak(el) { return this.weak.includes(el) || this.implants.some(i => i.elem === el); }
}

class Battle {
  constructor(opts) {
    this.opts = opts;
    this.mods = opts.mods || [];
    this.sp = 3; this.spMax = 5;
    this.waveIdx = 0; this.over = false; this.paused = false;
    this.enemies = []; this.ultQueue = []; this.extraQueue = [];
    this.input = null; this.current = null; this.lastTarget = null; this.lastSel = {};
    this.bond = 0; this.comboQueue = []; this.said = 0;
    this.allies = opts.team.map(m => {
      const u = new Unit('ally', m.key, m.lv, m);
      this.applyModStats(u, 'stats');
      u.hp = u.maxHp * (m.hpRatio != null ? m.hpRatio : 1);
      if (u.hp <= 0) { u.hp = 0; u.alive = false; }
      return u;
    });
    this.build();
  }

  applyModStats(u, field) {
    this.mods.forEach((m, mi) => (m[field] || []).forEach(([stat, value], i) =>
      u.buffs.push({ key: `mod${mi}_${i}`, name: m.name, stat, value, turns: Infinity, hidden: true })));
  }

  // ---------------- 基本クエリ ----------------
  aliveAllies() { return this.allies.filter(a => a.alive); }
  aliveEnemies() { return this.enemies.filter(e => e.alive); }
  adjacent(t) {
    const list = t.side === 'enemy' ? this.aliveEnemies() : this.aliveAllies();
    const i = list.indexOf(t);
    return [list[i - 1], list[i + 1]].filter(Boolean);
  }

  // ============================================================
  //  DOM 構築
  // ============================================================
  build() {
    const r = document.createElement('div');
    this.v = GFX.ok ? new BattleView(this, this.opts.bg || 'station') : null;
    r.className = 'screen battle' + (this.v ? ' is3d' : '');
    r.innerHTML = `
      ${this.v ? '<div class="world"></div>' : `<div class="bf-bg bg-${this.opts.bg || 'station'}"><div class="bf-floor"></div></div>`}
      <div class="bf-top"><div class="bf-title">${this.opts.title || ''}</div><div class="bf-wave"></div></div>
      <div class="bf-ctrl">
        <button class="ctl" data-c="auto" title="オート (V)">AUTO</button>
        <button class="ctl" data-c="speed" title="倍速 (F)">×1</button>
        <button class="ctl" data-c="pause" title="メニュー (Esc)">❚❚</button>
      </div>
      <div class="order"></div>
      <div class="enemy-row"></div>
      <div class="announce"></div>
      <div class="ally-row"></div>
      <div class="panel idle">
        <div class="ab-info"><div class="ab-kind"></div><div class="ab-name"></div><div class="ab-desc"></div></div>
        <div class="sp"><div class="sp-delta"></div><div class="sp-gems"></div><div class="sp-num"></div></div>
        <div class="ep"><div class="ep-delta"></div><div class="ep-bar"><i></i></div><div class="ep-num"></div></div>
        <div class="ab-btns">
          <button class="ab-btn" data-ab="basic"><span class="ab-ic">⚔</span><span class="k">Q</span><span class="l">通常攻撃</span></button>
          <button class="ab-btn" data-ab="skill"><span class="ab-ic">✦</span><span class="k">E</span><span class="l">戦闘スキル</span></button>
          <button class="ab-btn talk ${talkOn() ? '' : 'hidden'}" data-ab="talk"><span class="ab-ic">💬</span><span class="k">R</span><span class="l">はなす</span></button>
        </div>
        <div class="ult-hint">Space / クリックで発動　Esc でキャンセル</div>
      </div>
      <div class="bond hidden"><div class="bond-l">友情ゲージ</div><div class="bond-bar"><i></i></div><button class="bond-btn" data-combo disabled><span class="k">C</span><b>コンボ</b></button></div>
      <div class="combo-menu hidden"></div>
      <div class="help">Q 通常攻撃 ／ E スキル${talkOn() ? ' ／ R はなす' : ''} ／ A・D 対象選択 ／ Space 決定 ／ 1〜4 必殺技 ／ C コンボ</div>
      <div class="ultfx"></div>
      <div class="cutin"></div>
      <div class="overlay hidden"></div>`;
    this.root = r;
    this.$ = s => r.querySelector(s);

    const row = this.$('.ally-row');
    this.allies.forEach((u, i) => {
      const c = document.createElement('div');
      c.className = 'ally';
      c.style.setProperty('--c', ELEMENTS[u.elem].color);
      c.innerHTML = `
        <div class="a-face">${avatarSVG(u.key, { wide: true })}<div class="a-el">${elemIcon(u.elem)}</div></div>
        <div class="ult" data-ult="${i}" title="${u.def.ult.name}"><div class="ult-ring"></div><div class="ult-face">${ultIcon(u.key)}</div><span class="ult-key">${i + 1}</span></div>
        <div class="a-name">${u.name}<span>Lv.${u.level}</span></div>
        <div class="bar hp"><i></i><s></s></div>
        <div class="a-hp"></div>
        <div class="status"></div>
        <div class="fx"></div>`;
      c.addEventListener('click', e => {
        if (e.target.closest('.ult')) { this.requestUlt(i); return; }
        this.clickUnit(u);
      });
      u.el = c; row.appendChild(c);
      if (this.v) {
        const a = document.createElement('div'); a.className = 'a-anchor'; a.innerHTML = '<div class="fx"></div>';
        this.$('.world').appendChild(a); u.anchor = a;
      }
    });

    r.querySelectorAll('.ab-btn').forEach(b => b.addEventListener('click', () => this.selectAbility(b.dataset.ab)));
    r.querySelector('[data-combo]').addEventListener('click', e => { e.stopPropagation(); this.requestCombo(); });
    r.querySelector('.bf-ctrl').addEventListener('click', e => {
      const c = e.target.closest('[data-c]'); if (!c) return;
      if (c.dataset.c === 'auto') this.toggleAuto();
      if (c.dataset.c === 'speed') this.toggleSpeed();
      if (c.dataset.c === 'pause') this.togglePause();
    });
    this.syncCtrl();
  }

  syncCtrl() {
    this.$('[data-c=auto]').classList.toggle('on', Game.auto);
    this.$('[data-c=speed]').textContent = '×' + Game.speed;
    this.$('[data-c=speed]').classList.toggle('on', Game.speed > 1);
  }

  renderEnemies() {
    const row = this.$('.enemy-row');
    row.innerHTML = '';
    this.enemies.forEach(e => {
      const d = e.def, el = document.createElement('div');
      el.className = 'enemy' + (d.boss ? ' boss' : d.elite ? ' elite' : '');
      el.style.setProperty('--c', d.color);
      el.innerHTML = `
        <div class="e-info">
          <div class="e-name"><span class="lv">Lv.${e.level}</span>${e.name}</div>
          <div class="weak-row"></div>
          <div class="bar hp"><i></i></div>
          <div class="bar tough"><i></i></div>
          <div class="status"></div>
        </div>
        ${this.v ? '<div class="e-hit"><div class="fx"></div><div class="e-intent"></div></div>' : `<div class="e-sprite">${enemySVG(e.key)}</div>
        <div class="e-intent"></div>
        <div class="fx"></div>`}
        <div class="tmark"></div>`;
      el.addEventListener('click', () => this.clickUnit(e));
      e.el = el; row.appendChild(el);
      this.updateUnit(e);
    });
    if (this.v) this.v.syncEnemies(this.enemies);
  }

  statusHTML(u) {
    const out = [];
    if (u.shield > 0) out.push(`<span class="st sh">盾<em>${u.shieldTurns}</em></span>`);
    for (const b of u.buffs) {
      if (b.hidden) continue;
      const down = b.value < 0 || DOWN_STATS.has(b.stat);
      out.push(`<span class="st ${b.debuff ? 'de' : 'bu'}" title="${b.name}">${STAT_LABEL[b.stat] || b.name}${down ? '↓' : '↑'}${b.stacks > 1 ? '×' + b.stacks : ''}<em>${b.turns === Infinity ? '' : b.turns}</em></span>`);
    }
    for (const d of u.dots) out.push(`<span class="st dot" style="--c:${ELEMENTS[d.elem].color}">${DOT_INFO[d.type][0]}${d.stacks > 1 ? '×' + d.stacks : ''}<em>${d.turns}</em></span>`);
    if (u.frozen) out.push(`<span class="st dot" style="--c:${ELEMENTS.ice.color}">凍結</span>`);
    if (u.entangle) out.push(`<span class="st dot" style="--c:${ELEMENTS.quantum.color}">くらやみ×${u.entangle.stacks}</span>`);
    if (u.flags && u.flags.isolated) out.push(`<span class="st de">ひとりぼっち<em>${u.flags.isolated}</em></span>`);
    if (u.flags && u.flags.skip) out.push(`<span class="st bu">夢中</span>`);
    return out.join('');
  }

  updateUnit(u) {
    if (!u.el) return;
    const el = u.el, hpP = clamp(u.hp / u.maxHp, 0, 1) * 100;
    el.querySelector('.bar.hp i').style.width = hpP + '%';
    el.querySelector('.status').innerHTML = this.statusHTML(u);
    el.classList.toggle('dead', !u.alive);
    if (u.side === 'ally') {
      el.querySelector('.bar.hp s').style.width = clamp(u.shield / u.maxHp, 0, 1) * 100 + '%';
      el.querySelector('.a-hp').textContent = `${fmt(u.hp)} / ${fmt(u.maxHp)}`;
      const ult = el.querySelector('.ult');
      ult.style.setProperty('--e', u.energy / u.energyMax);
      ult.classList.toggle('ready', u.alive && u.energy >= u.energyMax);
      ult.classList.toggle('queued', this.ultQueue.includes(u));
    } else {
      el.querySelector('.bar.tough i').style.width = (u.toughness / u.maxTough) * 100 + '%';
      el.querySelector('.weak-row').innerHTML =
        u.weak.map(w => elemIcon(w)).join('') + u.implants.map(i => elemIcon(i.elem, 'implant')).join('');
      el.classList.toggle('broken', u.broken);
      el.classList.toggle('charging', !!u.charging);
      el.querySelector('.e-intent').textContent = u.charging ? '⚠ 強攻撃準備中' : '';
    }
  }

  renderAll() {
    this.allies.forEach(u => this.updateUnit(u));
    this.enemies.forEach(u => this.updateUnit(u));
    this.renderSp(); this.renderOrder(); this.renderBond();
  }

  // 選んでいる技で増減するSPを点滅で予告する（スキル：消費する分／通常攻撃：増える分）
  renderSp() {
    const inp = this.input, sel = inp && inp.mode === 'turn' ? inp.sel : null;
    const d = sel === 'skill' ? -1 : sel === 'basic' && this.sp < this.spMax ? 1 : 0;
    let h = '';
    for (let i = 0; i < this.spMax; i++) {
      const cls = i < this.sp ? (d < 0 && i >= this.sp + d ? 'on cost' : 'on') : (d > 0 && i < this.sp + d ? 'gain' : '');
      h += `<i class="${cls}"></i>`;
    }
    this.$('.sp-gems').innerHTML = h;
    this.$('.sp-num').textContent = `${this.sp}/${this.spMax}`;
    const dl = this.$('.sp-delta');
    dl.textContent = d ? `SP${d > 0 ? '+' : '−'}${Math.abs(d)}` : '';
    dl.className = 'sp-delta' + (d < 0 ? ' cost' : d > 0 ? ' gain' : '');
  }

  // 行動順のシミュレーション表示
  renderOrder() {
    const units = [...this.aliveAllies(), ...this.aliveEnemies()];
    const g = new Map(units.map(u => [u, u.gauge]));
    const list = [];
    this.ultQueue.forEach(u => list.push({ u, label: '必殺', ult: true }));
    if (this.current && this.current.alive) list.push({ u: this.current, label: '行動中', cur: true });
    this.extraQueue.forEach(u => list.push({ u, label: '追加', extra: true }));
    let t = 0;
    for (let n = 0; n < 8 && units.length; n++) {
      let best = null, bt = Infinity;
      for (const u of units) { const tt = g.get(u) / u.stat('spd'); if (tt < bt) { bt = tt; best = u; } }
      t += bt;
      for (const u of units) g.set(u, g.get(u) - u.stat('spd') * bt);
      g.set(best, 10000);
      list.push({ u: best, label: Math.round(t) });
    }
    this.$('.order').innerHTML = list.map(x => `
      <div class="o-item o-${x.u.side} ${x.cur ? 'cur' : ''} ${x.ult ? 'ult' : ''} ${x.extra ? 'extra' : ''}">
        <div class="o-face">${x.u.side === 'ally' ? avatarSVG(x.u.key) : enemyMini(x.u.key)}</div>
        <div class="o-av">${x.label}</div>
      </div>`).join('');
  }

  // ============================================================
  //  エフェクト
  // ============================================================
  float(u, text, cls = '') {
    const host = u.anchor || u.el;
    if (!host) return;
    const f = document.createElement('div');
    u.floatN = ((u.floatN || 0) + 1) % 5;
    f.className = 'float ' + cls;
    f.textContent = text;
    f.style.left = (35 + Math.random() * 30) + '%';
    f.style.top = (u.side === 'enemy' ? 30 : 10) + u.floatN * 9 + '%';
    host.querySelector('.fx').appendChild(f);
    setTimeout(() => f.remove(), 1500);
  }
  impact(u, elem, big) {
    if (this.v) { this.v.hit(u, elem, big, false); return; }
    if (!u.el) return;
    const d = document.createElement('div');
    d.className = 'impact' + (big ? ' big' : '');
    d.style.setProperty('--c', ELEMENTS[elem].color);
    d.style.setProperty('--r', (Math.random() * 180) + 'deg');
    d.innerHTML = '<i></i><b></b><b class="b2"></b>';
    u.el.querySelector('.fx').appendChild(d);
    setTimeout(() => d.remove(), 700);
  }
  shake(big) {
    this.root.classList.remove('shake', 'shake-big'); void this.root.offsetWidth;
    this.root.classList.add(big ? 'shake-big' : 'shake');
  }
  pulse(u, cls, ms = 500) {
    if (!u.el) return;
    u.el.classList.remove(cls); void u.el.offsetWidth; u.el.classList.add(cls);
    setTimeout(() => u.el && u.el.classList.remove(cls), ms);
  }
  announce(kind, name, color) {
    const a = this.$('.announce');
    a.innerHTML = `<span class="an-kind">${kind}</span><span class="an-name">${name}</span>`;
    a.style.setProperty('--c', color || '#e8c77a');
    a.classList.remove('show'); void a.offsetWidth; a.classList.add('show');
  }
  async cutin(u, cine) {
    const c = this.$('.cutin'), col = ELEMENTS[u.elem].color;
    if (cine) return;   // 専用演出は対象選択の前に済んでいる
    if (this.v) {
      c.innerHTML = `<div class="ci-3d" style="--c:${col}"><div class="ci-name">${u.name}</div><div class="ci-ult">${u.def.ult.name}</div></div>`;
      c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
      Sfx.ult();
      await this.v.ultIntro(u);
      c.classList.remove('show');
      return;
    }
    c.innerHTML = `<div class="ci-band" style="--c:${col}"><div class="ci-lines"></div>
      <div class="ci-face">${avatarSVG(u.key)}</div>
      <div class="ci-text"><div class="ci-name">${u.name}</div><div class="ci-ult">${u.def.ult.name}</div></div></div>`;
    c.classList.remove('show'); void c.offsetWidth; c.classList.add('show');
    Sfx.ult();
    await wait(1150);
    c.classList.remove('show');
  }

  // ============================================================
  //  戦闘フロー
  // ============================================================
  async start() {
    Game.activeBattle = this;
    App.mount(this.root);
    if (this.v) GFX.setView(this.v);
    await this.spawnWave();
    if (this.v) { this.v.intro(); await wait(900); }
    // フィールドでの先制／奇襲
    if (this.opts.ambush === 'player') {
      this.enemies.forEach(e => { e.gauge += 3000; });
      this.announce('先制攻撃', '敵の行動が遅れた！', '#e8c77a'); Sfx.select(); await wait(900);
    } else if (this.opts.ambush === 'enemy') {
      this.allies.forEach(a => { a.gauge += 2500; });
      this.announce('奇襲', '敵に先手を取られた！', '#ff4d6d'); Sfx.enemy(); await wait(900);
    }
    this.renderAll();
    await wait(500);
    for (const a of this.aliveAllies()) a.def.talent.onBattleStart && a.def.talent.onBattleStart(this, a);
    for (const m of this.mods) m.onBattleStart && m.onBattleStart(this);
    for (const key of this.opts.techs || []) {
      const u = this.allies.find(a => a.key === key && a.alive);
      if (!u || !this.aliveEnemies().length) continue;
      this.announce('秘技', `${u.name}「${u.def.technique.name}」`, ELEMENTS[u.elem].color);
      await wait(500);
      await u.def.technique.run(this, u);
      if (this.v) await this.v.attackEnd(u);
      await this.resolveDeaths(u, 'tech');
      this.renderAll();
      await wait(400);
    }
    this.renderAll();
    await this.loop();
  }

  // 敵の強さ：にゃんこの人数が少ないうちは、敵の体力と攻撃を控えめにする
  foeScale(u) {
    const n = this.allies.length, hp = [0.5, 0.5, 0.7, 0.85, 1][n] ?? 1, atk = [0.85, 0.85, 0.9, 0.95, 1][n] ?? 1;
    u.base.maxHp *= FOE_HP * hp * (u.def.boss ? 0.75 : 1); u.base.atk *= atk; u.hp = u.maxHp;
    return u;
  }
  async spawnWave() {
    const w = this.opts.waves[this.waveIdx];
    this.enemies = w.map(e => {
      const u = this.foeScale(new Unit('enemy', e.key, e.lv));
      this.applyModStats(u, 'enemyStats');
      return u;
    });
    this.$('.bf-wave').textContent = `WAVE ${this.waveIdx + 1} / ${this.opts.waves.length}`;
    this.renderEnemies();
    this.$('.enemy-row').classList.remove('enter'); void this.root.offsetWidth;
    this.$('.enemy-row').classList.add('enter');
    if (this.enemies.some(e => e.def.boss)) this.announce('BOSS', this.enemies.find(e => e.def.boss).name, '#ff4d6d');
    this.renderAll();
  }

  async gate() { while (this.paused && !this.over) await new Promise(r => setTimeout(r, 100)); }

  // true を返したら戦闘終了
  async checkState() {
    if (this.over) return true;
    if (!this.aliveAllies().length) { await this.finish(false); return true; }
    if (!this.aliveEnemies().length) {
      if (this.waveIdx < this.opts.waves.length - 1) {
        this.waveIdx++;
        this.extraQueue = [];
        await wait(700);
        await this.spawnWave();
        await wait(600);
        return false;
      }
      await this.finish(true); return true;
    }
    return false;
  }
  battleBlocked() { return this.over || !this.aliveEnemies().length || !this.aliveAllies().length; }

  async loop() {
    while (!this.over) {
      await this.gate();
      if (await this.checkState()) break;
      if (Game.auto) this.queueAutoUlts();
      await this.processUlts();
      if (await this.checkState()) break;

      let u, extra = false;
      if (this.extraQueue.length) { u = this.extraQueue.shift(); extra = true; if (!u.alive) continue; }
      else u = this.nextActor();
      this.current = u;
      if (this.v) this.v.onTurn(u);
      if (!extra) u.gauge = 10000;
      this.renderOrder();
      this.root.querySelectorAll('.active').forEach(x => x.classList.remove('active'));
      u.el && u.el.classList.add('active');
      await this.takeTurn(u, extra);
      if (u.el) u.el.classList.remove('active');
      this.current = null;
      this.renderAll();
    }
  }

  nextActor() {
    const units = [...this.aliveAllies(), ...this.aliveEnemies()];
    let best = null, bt = Infinity;
    for (const u of units) { const t = u.gauge / u.stat('spd'); if (t < bt) { bt = t; best = u; } }
    for (const u of units) u.gauge = Math.max(0, u.gauge - u.stat('spd') * bt);
    return best;
  }

  async takeTurn(u, extra) {
    if (u.side === 'enemy') await this.enemyTurn(u);
    else await this.allyTurn(u, extra);
    if (u.alive) this.tickBuffs(u);
  }

  tickBuffs(u) {
    for (const b of u.buffs) {
      if (b.turns === Infinity) continue;
      if (b.fresh) { b.fresh = false; continue; }
      b.turns--;
    }
    u.buffs = u.buffs.filter(b => b.turns > 0);
    u.implants.forEach(i => i.turns--);
    u.implants = u.implants.filter(i => i.turns > 0);
    if (u.shieldTurns > 0 && --u.shieldTurns <= 0) u.shield = 0;
    this.updateUnit(u);
  }

  // ---------------- 味方ターン ----------------
  async allyTurn(u, extra) {
    Sfx.turn();
    if (!extra) {
      await this.tickDots(u);
      if (!u.alive || this.battleBlocked()) return;
      if (u.frozen) {
        const v = u.frozen.raw * this.defResMult(u.frozen.srcLv, u, 'ice');
        this.applyDamage(u, v, null, 'ice');
        this.float(u, '凍結', 'info'); u.frozen = null;
        await this.resolveDeaths(null);
        u.gauge = 5000; await wait(600); return;
      }
      u.def.talent.onTurnStart && u.def.talent.onTurnStart(this, u);
      for (const m of this.mods) m.onTurnStart && m.onTurnStart(this, u);
      if (u.flags.isolated && --u.flags.isolated <= 0) { u.flags.isolated = 0; this.float(u, 'ひとりぼっちが解けた', 'info'); }
      if (u.def.talent.skipTurn && u.def.talent.skipTurn(this, u)) {
        if (this.v) this.v.napFx(u);
        this.gainEnergy(u, 10); this.renderAll();
        await wait(1100); return;
      }
      this.banter(u);
    } else {
      u.def.talent.onExtraStart && u.def.talent.onExtraStart(this, u);
      this.announce('追加ターン', u.name, ELEMENTS[u.elem].color);
    }
    this.updateUnit(u);

    while (!this.over) {
      await this.gate();
      if (Game.auto) this.queueAutoUlts();
      const ulted = await this.processUlts();
      if (this.battleBlocked() || !u.alive) break;
      if (ulted && this.v) this.v.onTurn(u);
      const choice = Game.auto ? await this.aiChoice(u) : await this.awaitChoice(u);
      if (choice.kind === 'ult' || choice.kind === 'combo') continue;
      if (this.battleBlocked() || !u.alive) break;
      if (choice.kind === 'talk') await this.useTalk(u, choice.target);
      else await this.useAbility(u, choice.kind, choice.target);
      break;
    }
    if (extra && u.def.talent.onExtraEnd) u.def.talent.onExtraEnd(this, u);
  }

  async useAbility(u, kind, target) {
    const ab = u.def[kind];
    this.lastSel[u.uid] = kind;
    if (kind === 'basic') this.addSp(1); else this.addSp(-1);
    this.announce(kind === 'basic' ? '通常攻撃' : '戦闘スキル', ab.name, ELEMENTS[u.elem].color);
    if (target && target.side === 'enemy') this.lastTarget = target;
    if (this.v && !ENEMY_TARGETS.has(ab.target)) await this.v.support(u, ab.target === 'ally' ? [target] : this.aliveAllies());
    const res = (await ab.run(this, u, target)) || [];
    if (this.v && ENEMY_TARGETS.has(ab.target)) await this.v.attackEnd(u);
    await this.resolveDeaths(u, kind);
    this.gainEnergy(u, kind === 'basic' ? 20 : 30);
    u.def.talent.afterAction && u.def.talent.afterAction(this, u, kind, res);
    this.addBond(kind === 'basic' ? 10 : 14);
    this.callBack(u);
    this.renderAll();
    await wait(350);
  }

  // ---------------- 話す ----------------
  async useTalk(u, t) {
    this.lastSel[u.uid] = 'basic';
    if (!t || !t.alive) return;
    if (this.v) await this.v.talkFx(u, t);
    Sfx.meow(u.key);
    const first = !t.flags.talked; t.flags.talked = true;
    if (t.def.lure && !t.flags.lured) {
      t.flags.lured = true; t.flags.skip = 1;
      this.announce(`${u.name}は猫じゃらしを見せた！`, `${t.name}は夢中になっている……（1ターン行動できない）`, '#ffcf4a');
      this.say(t, '「……！？　こ、これは……っ」');
      if (this.v) this.v.lureFx(t);
    } else {
      this.announce(`${u.name}は${t.name}に話しかけた`, t.def.talk || '……', ELEMENTS[u.elem].color);
      this.say(t, t.def.talk || '……');
      if (first) {
        this.debuff(u, t, 1, { key: 'nagomi', name: 'なごみ', stat: 'atk', value: -0.2, turns: 2 }, true);
        this.delay(t, 0.25); this.float(t, 'なごんだ', 'info');
      } else this.float(t, 'もう聞いた', 'res');
    }
    this.gainEnergy(u, 15); this.addBond(8);
    this.renderAll();
    await wait(1400);
    if (this.v) await this.v.attackEnd(u);
  }

  // ---------------- 友情ゲージとコンボ ----------------
  addBond(n) {
    if (!this.bondOn()) return;
    this.bond = clamp(this.bond + n, 0, 100); this.renderBond();
  }
  bondOn() { return this.allies.length >= 2; }
  // 使えるコンボ（友情Lv3の組み合わせ。最終決戦では「にゃんこオールスターズ」）
  combos() {
    const al = this.aliveAllies(), has = k => al.find(a => a.key === k);
    if (this.opts.final && this.allstars) return [ALLSTARS];
    return COMBOS.filter(c => {
      const [a, b] = c.pair;
      if (!has(a)) return false;
      if (b === '*') { const others = al.filter(x => x.key !== a); return others.length >= 2 && others.every(x => bondLv(a, x.key) >= 3); }
      return has(b) && bondLv(a, b) >= 3;
    });
  }
  renderBond() {
    const el = this.$('.bond'); if (!el) return;
    el.classList.toggle('hidden', !this.bondOn());
    el.querySelector('.bond-bar i').style.width = this.bond + '%';
    const list = this.bond >= 100 ? this.combos() : [];
    const btn = el.querySelector('[data-combo]');
    btn.disabled = !list.length || this.over;
    btn.classList.toggle('ready', !!list.length);
    btn.querySelector('b').textContent = list.length === 1 ? list[0].name : 'コンボ';
    el.classList.toggle('full', this.bond >= 100);
    el.classList.toggle('allstars', !!this.allstars);
  }
  requestCombo(id) {
    if (this.over || this.bond < 100 || this.comboQueue.length) return;
    const list = this.combos(); if (!list.length) return;
    const menu = this.$('.combo-menu');
    if (!id && list.length > 1) {
      menu.innerHTML = list.map(c => `<button data-cid="${c.id}"><b>${c.name}</b><small>${c.desc}</small></button>`).join('') + '<button class="x" data-cid="">やめる</button>';
      menu.classList.remove('hidden'); this.$('.bond').classList.add('spend');
      menu.querySelectorAll('[data-cid]').forEach(b => b.onclick = e => { e.stopPropagation(); menu.classList.add('hidden'); this.$('.bond').classList.remove('spend'); if (b.dataset.cid) this.requestCombo(b.dataset.cid); });
      Sfx.click(); return;
    }
    const c = id ? list.find(x => x.id === id) : list[0]; if (!c) return;
    this.comboQueue.push(c); Sfx.select();
    if (this.input && this.input.mode === 'turn') { const r = this.input.resolve; this.input = null; this.renderInput(); r({ kind: 'combo' }); }
  }
  comboMembers(c) {
    const al = this.aliveAllies();
    if (c.id === 'allstars') return al;
    const [a, b] = c.pair;
    return b === '*' ? [al.find(x => x.key === a), ...al.filter(x => x.key !== a)] : [al.find(x => x.key === a), al.find(x => x.key === b)];
  }
  async castCombo(c) {
    const mem = this.comboMembers(c).filter(Boolean);
    this.bond = 0; this.renderBond();
    this.announce(c.id === 'allstars' ? '最終スキル' : 'コンボスキル', c.name, '#ffcf4a');
    Sfx.ult();
    await this.comboCutin(c, mem);
    const target = this.lastTarget && this.lastTarget.alive ? this.lastTarget : this.aiTarget(mem[0], { target: 'single' });
    if (c.id === 'allstars') await this.allStars(mem);
    else {
      if (this.v && c.target === 'allies') await this.v.support(mem[0], this.aliveAllies());
      await c.run(this, mem, target);
      if (this.v && c.target !== 'allies') await this.v.attackEnd(mem[mem.length - 1]);
      await this.resolveDeaths(mem[0], 'combo');
    }
    mem.forEach(m => this.gainEnergy(m, 10));
    for (let i = 0; i < mem.length; i++) for (let j = i + 1; j < mem.length; j++) addBond(mem[i].key, mem[j].key, 2);
    this.renderAll();
    await wait(300);
  }
  async comboCutin(c, mem) {
    const box = this.$('.cutin');
    box.innerHTML = `<div class="ci-combo ${c.id === 'allstars' ? 'all' : ''}"><div class="ci-faces">${mem.map(m => `<div class="ci-f" style="--c:${ELEMENTS[m.elem].color}">${avatarSVG(m.key)}</div>`).join('')}</div><div class="ci-ult">${c.name}</div></div>`;
    box.classList.remove('show'); void box.offsetWidth; box.classList.add('show');
    if (this.v) await this.v.comboIntro(mem, c);
    else await wait(1200);
    box.classList.remove('show');
  }
  // にゃんこオールスターズ：世界中の猫たちの「つながり」
  async allStars(mem) {
    const lines = [['mike', '「ぼくたちは――」'], ['all', '「ずっと仲間だ！」']];
    for (const [k, line] of lines) {
      if (k === 'all') mem.forEach(m => this.say(m, line)); else { const m = mem.find(x => x.key === k) || mem[0]; this.say(m, line); }
      await wait(1300);
    }
    if (this.v) await this.v.allStarsFx(mem);
    const sum = mem.reduce((a, m) => a + m.stat('atk'), 0), lv = Math.max(...mem.map(m => m.level));
    for (const t of this.aliveEnemies()) {
      const v = Math.max(sum * 3 * this.defResMult(lv, t, 'imaginary', mem[0]), t.maxHp * 0.62);
      if (this.v) this.v.hit(t, 'imaginary', true, true);
      this.applyDamage(t, v, mem[0], 'imaginary', 'crit');
      if (!t.broken && t.alive) { t.toughness = 0; await this.doBreak(mem[0], t, 'imaginary'); }
    }
    this.shake(true);
    await wait(500);
    await this.resolveDeaths(mem[0], 'combo');
  }
  // 掛け合い（友情Lv2から）：ターンのはじめに、ときどき仲間とひとこと
  banter(u) {
    if (this.said > 0) { this.said--; return; }
    if (Math.random() > 0.3) return;
    const others = this.aliveAllies().filter(a => a !== u && bondLv(u.key, a.key) >= 2 && (BANTER[u.key + '>' + a.key]));
    if (!others.length) return;
    const a = pick(others), [l1, l2] = pick(BANTER[u.key + '>' + a.key]);
    this.say(u, l1);
    if (l2) setTimeout(() => this.say(a, l2), 1100 / Game.speed);
    this.said = 2;
  }
  // 吹き出し
  say(u, text) {
    const host = u.anchor || u.el; if (!host) return;
    const b = document.createElement('div'); b.className = 'say say-' + u.side; b.textContent = text;
    host.querySelector('.fx').appendChild(b);
    // 画面端（左は行動順バー）からはみ出さないよう横にずらす
    const r = b.getBoundingClientRect(), box = this.root.getBoundingClientRect(), s = box.width / this.root.offsetWidth || 1;
    const cx = (r.left + r.right) / 2 / s, hw = b.offsetWidth / 2;
    const minX = (Math.max(box.left, this.$('.order').getBoundingClientRect().right) / s) + 8, maxX = box.right / s - 8;
    const dx = cx - hw < minX ? minX - (cx - hw) : cx + hw > maxX ? maxX - (cx + hw) : 0;
    if (dx) { b.style.marginLeft = dx + 'px'; b.style.setProperty('--tail', Math.max(16 - hw, Math.min(hw - 16, -dx)) + 'px'); }
    setTimeout(() => b.remove(), 2600);
  }
  // ひとりぼっちの仲間を呼び戻す（「一人じゃない！」）
  callBack(u) {
    for (const a of this.aliveAllies()) {
      if (a === u || !a.flags.isolated) continue;
      if (Math.random() < (bondLv(u.key, a.key) >= 3 ? 1 : 0.6)) {
        a.flags.isolated = 0; this.say(u, '「一人じゃない！」'); this.float(a, '呼び戻された', 'info');
        this.heal(u, a, a.maxHp * 0.08); this.updateUnit(a);
      }
    }
  }

  // ---------------- 必殺技 ----------------
  queueAutoUlts() {
    if (this.bond >= 100 && !this.comboQueue.length) { const l = this.combos(); if (l.length) this.comboQueue.push(l[0]); }
    for (const a of this.aliveAllies())
      if (a.energy >= a.energyMax && !this.ultQueue.includes(a)) this.ultQueue.push(a);
  }

  requestUlt(i) {
    const u = this.allies[i];
    if (!u || !u.alive || this.over || u.energy < u.energyMax || this.ultQueue.includes(u)) return;
    if (this.input && this.input.mode === 'ult' && this.input.unit === u) return;
    this.ultQueue.push(u);
    Sfx.select();
    this.updateUnit(u); this.renderOrder();
    if (this.input && this.input.mode === 'turn') {
      const r = this.input.resolve; this.input = null; this.renderInput(); r({ kind: 'ult' });
    }
  }

  // 必殺技を1つでも処理したら true（カメラを行動中のキャラへ戻すため）
  async processUlts() {
    let handled = false;
    while (this.comboQueue.length && !this.battleBlocked()) {
      await this.gate();
      const c = this.comboQueue.shift(); handled = true;
      await this.castCombo(c);
    }
    while (this.ultQueue.length && !this.battleBlocked()) {
      await this.gate();
      const u = this.ultQueue[0];
      if (!u.alive || u.energy < u.energyMax) { this.ultQueue.shift(); continue; }
      handled = true;
      const ult = u.def.ult;
      // 専用演出のあるキャラは、発動演出 → 肩越し視点で対象選択（本家の流れ）
      const cine = this.v && this.v.hasUltCine(u);
      if (cine) { Sfx.ult(); await this.v.ultReady(u); }
      let target = null;
      // 専用演出のある全体攻撃も、本家同様に確認（決定）を挟む
      if (NEEDS_TARGET.has(ult.target) || (cine && ult.target === 'aoe')) {
        if (Game.auto) target = this.aiTarget(u, ult);
        else {
          if (this.v && !cine) this.v.ultAim(u);
          const r = await this.awaitUltTarget(u);
          if (r.kind === 'cancel') { this.ultQueue.shift(); if (this.v) this.v.ultCancel(u); this.updateUnit(u); this.renderOrder(); continue; }
          target = r.target;
        }
      }
      this.ultQueue.shift();
      await this.castUlt(u, target, cine);
      if (this.battleBlocked()) break;
    }
    return handled;
  }

  // 専用演出の画面側（HUDを隠す・技名・光条・集中線）
  ultUi(kind, u) {
    const fx = this.$('.ultfx'), col = ELEMENTS[u.elem].color;
    const add = (cls, ms, html = '') => {
      const d = document.createElement('div'); d.className = cls; d.style.setProperty('--c', col); d.innerHTML = html; fx.appendChild(d);
      if (ms) setTimeout(() => d.remove(), ms);
      return d;
    };
    switch (kind) {
      case 'cine': this.root.classList.add('cine'); break;
      case 'cine-off': this.root.classList.remove('cine'); break;
      case 'splash': add('us-splash', 0, `<div class="us-name">${u.name}</div><div class="us-ult">${u.def.ult.name}</div><div class="us-bar"><i></i></div>`); break;
      case 'splash-off': fx.querySelectorAll('.us-splash').forEach(d => d.remove()); break;
      case 'wipe': add('us-wipe', 450); break;
      case 'lines-on': if (!fx.querySelector('.us-lines')) add('us-lines'); break;
      case 'lines-off': fx.querySelectorAll('.us-lines').forEach(d => d.remove()); break;
      case 'impact': add('us-impact', 700); break;
    }
  }

  async castUlt(u, target, cine) {
    u.energy = 0; this.updateUnit(u); this.renderOrder();
    await this.cutin(u, cine);
    this.announce('必殺技', u.def.ult.name, ELEMENTS[u.elem].color);
    if (target && target.side === 'enemy') this.lastTarget = target;
    const ult = u.def.ult;
    if (this.v && !ENEMY_TARGETS.has(ult.target)) await this.v.support(u, ult.target === 'ally' ? [target] : this.aliveAllies());
    const res = (await ult.run(this, u, target)) || [];
    if (this.v && ENEMY_TARGETS.has(ult.target)) await this.v.attackEnd(u);
    await this.resolveDeaths(u, 'ult');
    this.gainEnergy(u, 5); this.addBond(15); this.callBack(u);
    u.def.talent.afterAction && u.def.talent.afterAction(this, u, 'ult', res);
    for (const m of this.mods) m.afterUlt && m.afterUlt(this, u);
    this.renderAll();
    await wait(300);
  }

  // ---------------- 入力 ----------------
  abilityOf(inp) { return inp.mode === 'ult' ? inp.unit.def.ult : inp.sel === 'talk' ? TALK_AB : inp.unit.def[inp.sel]; }

  targetList(u, ab) {
    if (ab.target === 'ally') return this.aliveAllies().filter(a => !(ab.notSelf && a === u));
    if (ENEMY_TARGETS.has(ab.target)) return this.aliveEnemies();
    return [];
  }

  defaultTarget(u, ab) {
    if (ab.target === 'ally') {
      const l = this.targetList(u, ab);
      if (ab.notSelf) return l.sort((a, b) => b.stat('atk') - a.stat('atk'))[0] || null;
      return l.sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0] || null;
    }
    if (NEEDS_TARGET.has(ab.target)) {
      if (this.lastTarget && this.lastTarget.alive && this.enemies.includes(this.lastTarget)) return this.lastTarget;
      const en = this.aliveEnemies();
      return en[Math.floor((en.length - 1) / 2)] || null;
    }
    return null;
  }

  awaitChoice(u) {
    return new Promise(resolve => {
      const sel = this.lastSel[u.uid] === 'skill' && this.sp > 0 ? 'skill' : 'basic';
      this.input = { mode: 'turn', unit: u, sel, resolve };
      this.input.target = this.defaultTarget(u, u.def[sel]);
      this.renderInput();
    });
  }
  awaitUltTarget(u) {
    return new Promise(resolve => {
      this.input = { mode: 'ult', unit: u, resolve };
      this.input.target = this.defaultTarget(u, u.def.ult);
      this.renderInput();
    });
  }

  selectAbility(kind) {
    const inp = this.input;
    if (!inp || inp.mode !== 'turn') return;
    if (inp.sel === kind) { this.confirm(); return; }
    if (kind === 'skill' && this.sp < 1) { this.flashSp(); return; }
    Sfx.click();
    const prevSide = this.abilityOf(inp).target === 'ally';
    inp.sel = kind;
    const ab = this.abilityOf(inp);
    if ((ab.target === 'ally') !== prevSide || !inp.target || !inp.target.alive) inp.target = this.defaultTarget(inp.unit, ab);
    else if (ab.target === 'ally' && ab.notSelf && inp.target === inp.unit) inp.target = this.defaultTarget(inp.unit, ab);
    this.renderInput();
  }

  flashSp() {
    const s = this.$('.sp'); s.classList.remove('flash'); void s.offsetWidth; s.classList.add('flash');
    this.announce('にくきゅう不足', 'にくきゅうポイント（SP）が足りない', '#ff6b6b');
  }

  confirm() {
    const inp = this.input; if (!inp) return;
    const ab = this.abilityOf(inp);
    if (inp.mode === 'turn' && inp.sel === 'skill' && this.sp < 1) { this.flashSp(); return; }
    if (NEEDS_TARGET.has(ab.target) && (!inp.target || !inp.target.alive)) return;
    Sfx.select();
    this.input = null; this.renderInput();
    inp.resolve({ kind: inp.mode === 'ult' ? 'ultgo' : inp.sel, target: inp.target });
  }

  cancelUlt() {
    if (this.input && this.input.mode === 'ult') {
      const r = this.input.resolve; this.input = null; this.renderInput(); r({ kind: 'cancel' });
    }
  }

  moveTarget(dir) {
    const inp = this.input; if (!inp) return;
    const ab = this.abilityOf(inp), list = this.targetList(inp.unit, ab);
    if (!list.length || !NEEDS_TARGET.has(ab.target)) return;
    let i = list.indexOf(inp.target);
    i = clamp(i + dir, 0, list.length - 1);
    if (list[i] !== inp.target) Sfx.click();
    inp.target = list[i];
    this.renderInput();
  }

  clickUnit(u) {
    const inp = this.input; if (!inp || !u.alive) return;
    const ab = this.abilityOf(inp);
    if (!this.targetList(inp.unit, ab).includes(u)) {
      if (!NEEDS_TARGET.has(ab.target) && ((ab.target === 'aoe' && u.side === 'enemy') || (ab.target !== 'aoe' && u.side === 'ally'))) this.confirm();
      return;
    }
    if (inp.target === u) this.confirm();
    else { Sfx.click(); inp.target = u; this.renderInput(); }
  }

  renderInput() {
    this.root.querySelectorAll('.tgt, .tgt2').forEach(x => x.classList.remove('tgt', 'tgt2'));
    const panel = this.$('.panel'), inp = this.input;
    panel.classList.toggle('idle', !inp);
    panel.classList.toggle('ultmode', !!inp && inp.mode === 'ult');
    // 必殺技の対象選択中は、使い切るEPのリングを点滅させる
    this.allies.forEach(a => a.el.querySelector('.ult').classList.toggle('spend', !!inp && inp.mode === 'ult' && inp.unit === a));
    this.renderSp();
    if (!inp) return;
    const ab = this.abilityOf(inp), u = inp.unit;
    if (inp.mode === 'ult') {
      this.$('.ep-delta').textContent = `EP−${fmt(u.energy)}`;
      this.$('.ep-num').textContent = `${fmt(u.energy)}/${fmt(u.energyMax)}`;
    }
    panel.style.setProperty('--c', ELEMENTS[u.elem].color);
    this.$('.ab-kind').textContent = inp.mode === 'ult' ? `${u.name}・必殺技` : `${u.name}・${inp.sel === 'basic' ? '通常攻撃' : inp.sel === 'talk' ? 'はなす' : '戦闘スキル'}`;
    this.$('.ab-name').textContent = ab.name;
    this.$('.ab-desc').textContent = ab.desc;
    this.root.querySelectorAll('.ab-btn').forEach(b => {
      b.classList.toggle('sel', inp.mode === 'turn' && b.dataset.ab === inp.sel);
      b.querySelector('.l').textContent = b.dataset.ab === 'talk' ? TALK_AB.name : u.def[b.dataset.ab].name;
    });
    this.$('[data-ab=skill]').classList.toggle('disabled', this.sp < 1);

    const t = inp.target;
    switch (ab.target) {
      case 'single': case 'bounce': case 'ally': t && t.el.classList.add('tgt'); break;
      case 'blast': if (t) { t.el.classList.add('tgt'); this.adjacent(t).forEach(a => a.el.classList.add('tgt2')); } break;
      case 'aoe': this.aliveEnemies().forEach(e => e.el.classList.add('tgt')); break;
      case 'allies': this.aliveAllies().forEach(a => a.el.classList.add('tgt')); break;
      case 'self': u.el.classList.add('tgt'); break;
    }
  }

  onKey(e) {
    const k = e.key.toLowerCase();
    if (this.over) return;
    if (this.paused) { if (k === 'escape') this.togglePause(); return; }
    if (k === 'q') this.selectAbility('basic');
    else if (k === 'r' && talkOn()) this.selectAbility('talk');
    else if (k === 'c') this.requestCombo();
    else if (k === 'e') this.selectAbility('skill');
    else if (k === ' ' || k === 'enter') { e.preventDefault(); this.confirm(); }
    else if (k === 'a' || k === 'arrowleft') this.moveTarget(-1);
    else if (k === 'd' || k === 'arrowright') this.moveTarget(1);
    else if ('1234'.includes(k) && k.length === 1) this.requestUlt(+k - 1);
    else if (k === 'escape') { if (this.input && this.input.mode === 'ult') this.cancelUlt(); else this.togglePause(); }
    else if (k === 'v') this.toggleAuto();
    else if (k === 'f') this.toggleSpeed();
  }

  toggleAuto() {
    Game.auto = !Game.auto; Save.data.auto = Game.auto; Save.save();
    this.syncCtrl();
    if (Game.auto && this.input) {
      const inp = this.input; this.input = null; this.renderInput();
      if (inp.mode === 'turn') { const c = this.aiPick(inp.unit); inp.resolve(c); }
      else inp.resolve({ kind: 'ultgo', target: this.aiTarget(inp.unit, inp.unit.def.ult) });
    }
  }
  toggleSpeed() {
    Game.speed = Game.speed === 1 ? 1.5 : Game.speed === 1.5 ? 2 : 1;
    Save.data.speed = Game.speed; Save.save(); this.syncCtrl();
  }
  togglePause() {
    if (this.over) return;
    this.paused = !this.paused;
    const o = this.$('.overlay');
    if (this.paused) {
      o.innerHTML = `<div class="ov-box"><h2>一時停止</h2>
        <button class="btn gold" data-p="resume">戦闘に戻る</button>
        <button class="btn" data-p="retreat">撤退する</button></div>`;
      o.classList.remove('hidden');
      o.querySelector('[data-p=resume]').onclick = () => this.togglePause();
      o.querySelector('[data-p=retreat]').onclick = () => {
        this.over = true; this.paused = false; Game.activeBattle = null;
        if (this.input) { this.input = null; }
        this.opts.onExit({ win: false, retreat: true, team: this.teamState() }, 'back');
      };
    } else o.classList.add('hidden');
  }

  // ---------------- AI ----------------
  aiPick(u) {
    const d = u.def;
    let c = d.ai ? d.ai(this, u) : null;
    if (!c) {
      const dps = ['hunt', 'erudition', 'destruction', 'nihility'].includes(u.path);
      c = { kind: (dps && this.sp >= 1) || this.sp >= 3 ? 'skill' : 'basic' };
    }
    if (c.kind === 'skill' && this.sp < 1) c = { kind: 'basic' };
    if (!c.target || !c.target.alive) c.target = this.aiTarget(u, d[c.kind]);
    return c;
  }
  async aiChoice(u) { await wait(300); return this.aiPick(u); }

  aiTarget(u, ab) {
    if (ab.target === 'ally') return this.defaultTarget(u, ab);
    if (!ENEMY_TARGETS.has(ab.target)) return null;
    const en = this.aliveEnemies();
    const score = e => (e.isWeak(u.elem) && !e.broken ? 1000 - e.toughness : 0) + (1 - e.hp / e.maxHp) * 100 + (e.def.boss ? 50 : 0);
    if (ab.target === 'blast') {
      return en.map(e => ({ e, s: score(e) + this.adjacent(e).reduce((a, x) => a + score(x) * 0.5 + 200, 0) }))
        .sort((a, b) => b.s - a.s)[0].e;
    }
    return en.slice().sort((a, b) => score(b) - score(a))[0];
  }

  // ============================================================
  //  ダメージ計算
  // ============================================================
  defResMult(srcLv, t, elem, src) {
    if (t.side === 'enemy') {
      const shred = clamp(t.stat('defDown'), 0, 1);
      const defM = (srcLv + 20) / ((t.level + 20) * (1 - shred) + srcLv + 20);
      let res = (t.isWeak(elem) ? 0 : 0.2) - t.stat('resDown') - (src ? src.stat('resPen') : 0);
      return defM * (1 - res) * (1 + t.stat('vuln'));
    }
    const d = t.stat('def');
    return (1 - d / (d + 200 + 10 * srcLv)) * Math.max(0.1, 1 + t.stat('vuln'));
  }

  calcDamage(src, t, mult, kind, opt = {}) {
    const elem = opt.elem || src.elem;
    const base = src.stat(opt.stat || 'atk') * mult;
    let bonus = 1 + src.stat('dmg') + src.stat('dmg_' + kind) + (opt.dmgBonus || 0);
    if (src.side === 'ally') {
      if (src.def.talent.dmgMod) bonus += src.def.talent.dmgMod(this, src, t, kind);
      for (const m of this.mods) if (m.dmgMod) bonus += m.dmgMod(this, src, t, kind);
    }
    let crit = false, cm = 1;
    if (!opt.noCrit && src.side === 'ally' && Math.random() < src.stat('crit')) { crit = true; cm = 1 + src.stat('critDmg'); }
    const brk = t.side === 'enemy' && !t.broken ? 0.9 : 1;
    const value = Math.max(1, Math.round(base * bonus * cm * this.defResMult(src.level, t, elem, src) * brk));
    return { value, crit, elem };
  }

  applyDamage(t, value, src, elem, cls = '') {
    if (!t.alive) return 0;
    let v = Math.round(value);
    if (t.side === 'ally' && t.shield > 0) {
      const ab = Math.min(t.shield, v); t.shield -= ab; v -= ab;
      if (ab > 0) this.float(t, '-' + fmt(ab), 'shieldf');
    }
    t.hp -= v;
    if (v > 0 || t.side === 'enemy') this.float(t, fmt(v), `dmg ${cls}`.trim());
    if (elem) { const f = t.el && t.el.querySelector('.fx .float:last-child'); if (f) f.style.color = cls.includes('crit') ? '' : ELEMENTS[elem].color; }
    if (t.side === 'ally' && t.hp <= 0) {
      for (const a of this.aliveAllies()) if (a.def.talent.onAllyLethal && a.def.talent.onAllyLethal(this, a, t)) break;
    }
    if (t.hp < 0) t.hp = 0;
    this.updateUnit(t);
    return v;
  }

  // ---------------- 攻撃ヘルパー（キャラ定義から使用） ----------------
  single(src, t, mult, tough, kind, opt = {}) { return this.doHits(src, [{ t, mult, tough }], kind, opt); }
  blast(src, t, mult, adjMult, tough, adjTough, kind, opt = {}) {
    const adj = this.adjacent(t);
    return this.doHits(src, [{ t, mult, tough }, ...adj.map(a => ({ t: a, mult: adjMult, tough: adjTough }))], kind, opt);
  }
  aoe(src, mult, tough, kind, opt = {}) {
    return this.doHits(src, this.aliveEnemies().map(t => ({ t, mult, tough })), kind, opt);
  }
  async bounce(src, n, mult, tough, kind, opt = {}, first) {
    let all = [];
    for (let i = 0; i < n; i++) {
      const en = this.aliveEnemies(); if (!en.length) break;
      const t = i === 0 && first && first.alive ? first : pick(en);
      all = all.concat(await this.doHits(src, [{ t, mult, tough }], kind, { ...opt, noAnim: i > 0 }));
      await wait(140);
    }
    return all;
  }

  async doHits(src, list, kind, opt = {}) {
    if (this.v) {
      Sfx.swing();
      const ts = list.map(h => h.t).filter(t => t.alive);
      if (opt.noAnim) await this.v.quickShot(src, ts[0]);
      else await this.v.attack(src, ts, kind, opt);
    } else if (!opt.noAnim) {
      this.pulse(src, 'lunge', 450); Sfx.swing();
      await wait(kind === 'tech' ? 150 : 260);
    }
    const results = [];
    for (const h of list) {
      if (!h.t.alive) continue;
      results.push(await this.hitOne(src, h.t, h.mult, h.tough, kind, opt));
    }
    if (opt.heavy) this.shake(true);
    await wait(180);
    await this.resolveDeaths(src, kind);
    return results;
  }

  async hitOne(src, t, mult, tough, kind, opt) {
    const r = this.calcDamage(src, t, mult, kind, opt);
    if (this.v) this.v.hit(t, r.elem, opt.heavy || r.crit, r.crit); else this.impact(t, r.elem, opt.heavy || r.crit);
    this.pulse(t, 'hit', 300);
    r.crit ? Sfx.crit() : Sfx.hit();
    this.applyDamage(t, r.value, src, r.elem, r.crit ? 'crit' : '');
    let broke = false;
    if (t.side === 'enemy' && tough > 0 && !t.broken && t.isWeak(r.elem) && t.alive) {
      t.toughness = Math.max(0, t.toughness - tough * (1 + src.stat('toughBoost')));
      if (t.toughness <= 0 && t.hp > 0) { broke = true; await this.doBreak(src, t, r.elem); }
    }
    if (t.entangle && t.side === 'enemy') t.entangle.stacks = Math.min(5, t.entangle.stacks + 1);
    if (src.side === 'ally' && src.def.talent.onHitEnemy) src.def.talent.onHitEnemy(this, src, t, kind);
    this.updateUnit(t);
    return { t, dmg: r.value, crit: r.crit, broke };
  }

  async doBreak(src, t, elem = src.elem) {
    t.broken = true;
    this.addBond(15);
    const lvM = lvMult(src.level), tm = 0.5 + t.maxTough / 120, be = 1 + src.stat('be');
    const col = ELEMENTS[elem].color;
    Sfx.brk(); this.shake(true);
    if (this.v) this.v.breakFx(t, elem);
    const bt = document.createElement('div');
    bt.className = 'break-text'; bt.style.setProperty('--c', col); bt.innerHTML = '<span>弱点撃破</span>';
    t.el.querySelector('.fx').appendChild(bt); setTimeout(() => bt.remove(), 1400);
    this.impact(t, elem, true);
    const bd = BREAK_COEF[elem] * lvM * tm * be * this.defResMult(src.level, t, elem, src);
    this.applyDamage(t, bd, src, elem, 'brk');
    t.gauge += 2500;
    const dotBase = { srcLv: src.level, src, turns: 2 };
    switch (elem) {
      case 'physical': this.setDot(t, { ...dotBase, type: 'bleed', elem, raw: Math.min(t.maxHp * 0.16, 2 * lvM * tm) * be }); break;
      case 'fire': this.setDot(t, { ...dotBase, type: 'burn', elem, raw: lvM * be }); break;
      case 'lightning': this.setDot(t, { ...dotBase, type: 'shock', elem, raw: 2 * lvM * be }); break;
      case 'wind': { const st = t.def.boss || t.def.elite ? 3 : 1; this.setDot(t, { ...dotBase, type: 'wind', elem, raw: lvM * be * st, stacks: st }); break; }
      case 'ice': t.frozen = { raw: lvM * be, srcLv: src.level }; this.float(t, '凍結', 'info'); break;
      case 'quantum': t.gauge += 2000 * be; t.entangle = { raw: 0.6 * lvM * tm * be, srcLv: src.level, stacks: 1 }; this.float(t, 'くらやみ', 'info'); break;
      case 'imaginary': t.gauge += 3000 * be;
        t.buffs.push({ key: 'imprison', name: 'まぶしさ', stat: 'spd', value: -0.1, turns: 1, debuff: true });
        this.float(t, 'まぶしい！', 'info'); break;
    }
    if (t.charging) { t.charging = null; this.float(t, '溜め中断！', 'info'); }
    src.def.talent.onBreak && src.def.talent.onBreak(this, src, t);
    for (const m of this.mods) m.onBreak && m.onBreak(this, src, t);
    this.updateUnit(t);
    await wait(350);
  }

  // ---------------- 状態異常 ----------------
  setDot(t, d) {
    const i = t.dots.findIndex(x => x.type === d.type);
    if (i >= 0) t.dots[i] = d; else t.dots.push(d);
    this.updateUnit(t);
  }
  dot(src, t, { type, mult, turns, chance = 1, quiet }) {
    if (!t.alive) return false;
    if (Math.random() >= chance * (1 + src.stat('ehr')) * (1 - t.stat('eres'))) { if (!quiet) this.float(t, '抵抗', 'res'); return false; }
    const elem = DOT_INFO[type][1];
    const raw = src.stat('atk') * mult * (1 + src.stat('dmg') + src.stat('dmg_dot'));
    this.setDot(t, { type, elem, raw, turns, srcLv: src.level, src });
    if (!quiet) this.float(t, DOT_INFO[type][0], 'info');
    return true;
  }
  dotDamage(t, d, ratio = 1) {
    const v = d.raw * ratio * this.defResMult(d.srcLv, t, d.elem, d.src) * (t.side === 'enemy' && !t.broken ? 0.9 : 1);
    if (this.v) this.v.dotFx(t, d.elem); else this.impact(t, d.elem, false);
    this.applyDamage(t, v, d.src, d.elem, 'dotf');
  }
  async tickDots(u) {
    if (!u.dots.length) return;
    for (const d of u.dots) { if (!u.alive) break; this.dotDamage(u, d); d.turns--; Sfx.hit(); await wait(250); }
    u.dots = u.dots.filter(d => d.turns > 0);
    this.updateUnit(u);
    await this.resolveDeaths(null);
  }
  async detonate(t, ratio) {
    for (const d of t.dots) { if (!t.alive) break; this.dotDamage(t, d, ratio); await wait(150); }
  }
  freeze(src, t, chance, raw) {
    if (!t.alive) return false;
    if (Math.random() >= chance * (1 + src.stat('ehr')) * (1 - t.stat('eres'))) { this.float(t, '抵抗', 'res'); return false; }
    t.frozen = { raw, srcLv: src.level }; this.float(t, '凍結', 'info'); this.updateUnit(t);
    return true;
  }
  implant(t, elem, turns) {
    const ex = t.implants.find(i => i.elem === elem);
    if (ex) ex.turns = turns; else t.implants.push({ elem, turns });
    this.float(t, ELEMENTS[elem].name + '弱点付与', 'info'); this.updateUnit(t);
  }
  buff(t, b, src) {
    if (!t.alive) return;
    const ex = t.buffs.find(x => x.key === b.key);
    if (ex) {
      ex.turns = Math.max(ex.turns, b.turns); ex.value = b.value;
      if (b.max) ex.stacks = Math.min(b.max, (ex.stacks || 1) + 1);
      ex.fresh = t === this.current;
    } else t.buffs.push({ ...b, stacks: b.max ? 1 : undefined, fresh: t === this.current });
    this.updateUnit(t);
  }
  debuff(src, t, chance, b, quiet) {
    if (!t.alive) return false;
    if (Math.random() < chance * (1 + src.stat('ehr')) * (1 - t.stat('eres'))) { this.buff(t, { ...b, debuff: true }, src); if (this.v && !quiet) this.v.buffFx(t, false); return true; }
    if (!quiet) this.float(t, '抵抗', 'res');
    return false;
  }
  cleanse(t) {
    const i = t.buffs.map(b => !!b.debuff).lastIndexOf(true);
    if (i >= 0) t.buffs.splice(i, 1);
    else if (t.dots.length) t.dots.pop();
    else if (t.frozen) t.frozen = null;
    this.updateUnit(t);
  }
  heal(src, t, amount, quiet) {
    if (!t.alive) return;
    const v = amount * (1 + src.stat('heal'));
    const real = Math.min(t.maxHp - t.hp, v);
    t.hp += real;
    if (real > 0 || !quiet) { this.float(t, '+' + fmt(real), 'heal'); this.pulse(t, 'healed', 600); Sfx.heal(); if (this.v) this.v.healFx(t); }
    this.updateUnit(t);
  }
  shield(src, t, amount, turns) {
    if (!t.alive) return;
    t.shield = Math.max(t.shield, amount); t.shieldTurns = turns;
    this.pulse(t, 'shielded', 600); Sfx.shield();
    if (this.v) this.v.shieldFx(t);
    this.updateUnit(t);
  }
  advance(u, p) { u.gauge = Math.max(0, u.gauge - 10000 * p); this.renderOrder(); }
  delay(u, p) { u.gauge += 10000 * p; this.renderOrder(); }
  addSp(n) { this.sp = clamp(this.sp + n, 0, this.spMax); this.renderSp(); }
  gainEnergy(u, n) {
    if (!u.alive || u.side !== 'ally') return;
    u.energy = Math.min(u.energyMax, u.energy + n * (1 + u.stat('err')));
    this.updateUnit(u);
  }
  extraTurn(u) { if (!this.extraQueue.includes(u)) this.extraQueue.push(u); }

  // ---------------- 撃破・戦闘不能 ----------------
  async resolveDeaths(src, kind) {
    let changed = false;
    for (const e of this.enemies) {
      if (!e.alive || e.hp > 0) continue;
      if (e.def.phases && e.phase < e.def.phases.length) { await this.phaseShift(e); continue; }
      e.alive = false; changed = true;
      e.el.classList.add('dying'); Sfx.kill();
      if (this.v) this.v.deathFx(e);
      if (src && src.side === 'ally' && src.alive) {
        this.gainEnergy(src, 10);
        src.def.talent.onKill && src.def.talent.onKill(this, src, e, kind);
      }
    }
    for (const a of this.allies) {
      if (a.alive && a.hp <= 0) {
        a.alive = false; a.hp = 0; a.shield = 0; a.buffs = []; a.dots = [];
        this.ultQueue = this.ultQueue.filter(x => x !== a);
        this.extraQueue = this.extraQueue.filter(x => x !== a);
        this.float(a, '戦闘不能', 'res');
        if (this.v) this.v.allyDown(a);
        this.updateUnit(a);
      }
    }
    if (changed) {
      await wait(500);
      this.enemies = this.enemies.filter(e => e.alive);
      this.renderEnemies();
    }
    this.renderOrder();
  }

  // 最終決戦：世界中の猫たちの声が届き、友情ゲージが満ちる
  async finale() {
    if (this.allstars) return;
    this.allstars = true;
    for (const [name, line] of this.opts.final.voices || []) {
      this.announce(name, line, '#ffcf4a'); Sfx.tone(880, 0.2, 'sine', 0.05); Sfx.tone(1320, 0.3, 'sine', 0.04, 0, 0.1);
      if (this.v) this.v.voiceFx();
      await wait(1500);
      if (this.over) return;
    }
    this.bond = 100; this.renderBond();
    this.announce('友情ゲージ MAX', '「にゃんこオールスターズ」が使える！（C キー）', '#ffcf4a');
    this.aliveAllies().forEach(a => { a.flags.isolated = 0; a.buffs = a.buffs.filter(b => b.key !== 'e_iso'); this.say(a, '「一人じゃない！」'); this.updateUnit(a); });
    Sfx.win();
  }

  async phaseShift(e) {
    e.phase++;
    const ph = e.def.phases[e.phase - 1];
    e.hp = e.maxHp * 0.5; e.weak = [...ph.weak]; e.implants = [];
    e.maxTough += 20; e.toughness = e.maxTough; e.broken = false;
    e.dots = []; e.frozen = null; e.entangle = null; e.charging = null;
    e.buffs = e.buffs.filter(b => !b.debuff);
    this.announce(`PHASE ${e.phase + 1}`, `${e.name}が力を解放した！`, '#ff4d6d');
    if (this.opts.final && e.def.final && e.phase >= e.def.phases.length) setTimeout(() => this.finale(), 1600 / Game.speed);
    this.pulse(e, 'phase', 1200); this.shake(true); Sfx.brk();
    this.updateUnit(e);
    if (this.v) { await this.v.phaseFx(e); await wait(300); }
    else await wait(1200);
  }

  // ---------------- 敵ターン ----------------
  async enemyTurn(e) {
    if (e.broken) { e.broken = false; e.toughness = e.maxTough; this.float(e, '靭性回復', 'info'); }
    e.buffs = e.buffs.filter(b => b.key !== 'imprison');
    this.updateUnit(e);
    await this.tickDots(e);
    if (!e.alive || this.battleBlocked()) return;
    if (e.entangle) {
      const v = e.entangle.raw * e.entangle.stacks * this.defResMult(e.entangle.srcLv, e, 'quantum');
      e.entangle = null; this.applyDamage(e, v, null, 'quantum', 'dotf'); this.impact(e, 'quantum');
      await wait(300); await this.resolveDeaths(null);
      if (!e.alive || this.battleBlocked()) return;
    }
    if (e.frozen) {
      const v = e.frozen.raw * this.defResMult(e.frozen.srcLv, e, 'ice');
      e.frozen = null; this.applyDamage(e, v, null, 'ice', 'dotf'); this.float(e, '凍結中', 'info');
      await wait(500); await this.resolveDeaths(null);
      e.gauge = 5000; this.updateUnit(e);
      return;
    }
    if (e.flags.skip) {
      e.flags.skip = 0; this.float(e, '猫じゃらしに夢中……', 'info'); this.say(e, '「ま、まて……もう少しだけ……」');
      if (this.v) this.v.lureFx(e);
      this.updateUnit(e); await wait(1100); return;
    }
    let mv;
    if (e.charging) { mv = ENEMY_MOVES[e.charging]; e.charging = null; }
    else mv = this.pickMove(e);
    await this.execEnemyMove(e, mv);
  }

  pickMove(e) {
    const opts = e.def.moves.filter(([id]) => !(id === 'summon' && this.aliveEnemies().length >= 4));
    const total = opts.reduce((a, [, w]) => a + w, 0);
    let r = Math.random() * total;
    for (const [id, w] of opts) { r -= w; if (r <= 0) return { ...ENEMY_MOVES[id], id }; }
    return ENEMY_MOVES.strike;
  }

  aggroPick() {
    const al = this.aliveAllies();
    const ws = al.map(a => PATHS[a.path].aggro * (1 + a.stat('aggro')));
    let r = Math.random() * ws.reduce((a, b) => a + b, 0);
    for (let i = 0; i < al.length; i++) { r -= ws[i]; if (r <= 0) return al[i]; }
    return al[al.length - 1];
  }

  async execEnemyMove(e, mv) {
    this.announce(e.name, mv.name, e.def.color);
    if (mv.type === 'charge') {
      e.charging = mv.next; this.pulse(e, 'powerup', 900); Sfx.enemy();
      if (this.v) this.v.chargeFx(e);
      this.updateUnit(e); await wait(900); return;
    }
    if (mv.type === 'summon') {
      const key = e.def.summon || 'scout';
      const lv = e.level;
      const n = Math.min(2, 5 - this.aliveEnemies().length);
      for (let i = 0; i < n; i++) {
        const u = this.foeScale(new Unit('enemy', key, lv)); this.applyModStats(u, 'enemyStats');
        if (i === 0) this.enemies.unshift(u); else this.enemies.push(u);
      }
      this.renderEnemies(); await wait(800); return;
    }
    const main = this.aggroPick();
    let targets;
    if (mv.type === 'single') targets = [[main, mv.mult]];
    else if (mv.type === 'blast') targets = [[main, mv.mult], ...this.adjacent(main).map(a => [a, mv.adj])];
    else targets = this.aliveAllies().map(a => [a, mv.mult]);

    Sfx.enemy();
    if (this.v) await this.v.enemyAttack(e, targets.map(x => x[0]), mv);
    else { this.pulse(e, 'elunge', 600); await wait(380); }
    for (const [t, m] of targets) {
      if (!t.alive) continue;
      const r = this.calcDamage(e, t, m, 'enemy', { noCrit: true, elem: 'physical' });
      this.impact(t, 'physical', mv.type !== 'single' || m > 1.2);
      this.pulse(t, 'hurt', 400);
      Sfx.hit();
      this.applyDamage(t, r.value, e);
      this.gainEnergy(t, 10);
      this.addBond(4);
      if (mv.eff && t.alive && t.hp > 0) {
        const f = mv.eff;
        if (f.kind === 'dot') this.dot(e, t, f);
        else if (f.kind === 'freeze') this.freeze(e, t, f.chance, e.stat('atk') * 0.5);
        else if (f.kind === 'buff') this.debuff(e, t, f.chance, f.buff);
        else if (f.kind === 'isolate') { t.flags.isolated = 2; this.float(t, 'ひとりぼっち', 'res'); this.debuff(e, t, 1, { key: 'e_iso', name: 'ひとりぼっち', stat: 'dmg', value: -0.3, turns: 2 }, true); }
        else if (f.kind === 'energy') { t.energy = Math.max(0, t.energy - f.value); this.float(t, f.value >= 30 ? '思い出が薄れる…' : 'EP減少', 'res'); }
        else if (f.kind === 'bondDrain') { if (this.bond > 0) { this.bond = Math.max(0, this.bond - f.value); this.renderBond(); this.float(t, '疑心…', 'res'); } }
      }
    }
    if (mv.type === 'aoe' || mv.mult > 1.2) this.shake(mv.mult > 1.2);
    for (const [t] of targets)
      for (const a of this.aliveAllies()) if (a.def.talent.onAllyHit) a.def.talent.onAllyHit(this, a, t);
    await wait(350);
    if (this.v) await this.v.enemyAttackEnd(e);
    await this.resolveDeaths(e, 'enemy');
  }

  // ============================================================
  //  終了
  // ============================================================
  teamState() {
    return this.allies.map(u => ({ key: u.key, hpRatio: u.alive ? clamp(u.hp / u.maxHp, 0, 1) : 0, energy: u.energy, alive: u.alive }));
  }

  async finish(win) {
    this.over = true;
    this.input = null; this.renderInput();
    await wait(600);
    Game.activeBattle = null;
    win ? Sfx.win() : Sfx.lose();
    if (win && this.v) { this.v.victory(); await wait(900); }
    const res = { win, team: this.teamState() };
    let info = this.opts.onResult ? this.opts.onResult(res) : '';
    if (win) {
      const before = (Save.data.bondNews || []).length;
      afterBattleBonds(this.allies.map(a => a.key), this.opts.waves.some(w => w.some(e => ENEMIES[e.key].boss)));
      const news = (Save.data.bondNews || []).slice(before);
      if (news.length) info += news.map(n => { const [a, b] = n.k.split('|'); return `<div class="rw bondup">♥ ${CHARS[a].name}と${CHARS[b].name}の友情が Lv.${n.lv} になった！<small>${BOND_INFO[n.lv - 1]}</small></div>`; }).join('');
    }
    const o = this.$('.overlay');
    o.innerHTML = `<div class="ov-box result ${win ? 'win' : 'lose'}">
      <div class="res-title">${win ? 'しょうり！' : 'まけちゃった……'}</div>
      <div class="res-sub">${win ? 'VICTORY' : 'DEFEAT'}</div>
      <div class="res-info">${info || ''}</div>
      <div class="res-btns">
        ${!win && this.opts.canRetry ? '<button class="btn" data-r="retry">再挑戦</button>' : ''}
        <button class="btn gold" data-r="next">${win ? '続ける' : '戻る'}</button>
      </div></div>`;
    o.classList.remove('hidden');
    o.querySelectorAll('[data-r]').forEach(b => b.onclick = () => { Sfx.click(); this.opts.onExit(res, b.dataset.r); });
  }
}

document.addEventListener('keydown', e => { if (Game.activeBattle) Game.activeBattle.onKey(e); });
