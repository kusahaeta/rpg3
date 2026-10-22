'use strict';
// ============================================================
//  物語
//  会話シーン → フィールドの目的地へ → 戦闘 … を順に進める。
//  台本・人物・舞台は js/npcs.js と js/scenario*.js
// ============================================================

function speakerName(key) {
  if (key === 'n') return '';
  if (key.startsWith('e:')) return ENEMIES[key.slice(2).split('#')[0]].name;   // e:iwa#1 ＝ 同じ敵の二匹め
  return (CHARS[key] || NPCS[key]).name;
}
function speakerColor(key) {
  if (key === 'n') return '#ffd27a';
  if (key.startsWith('e:')) return ENEMIES[key.slice(2).split('#')[0]].color;
  const c = CHARS[key] || NPCS[key];
  return (c.look && c.look.accent) || c.color || ELEMENTS.physical.color;
}

const Story = {
  get state() {
    if (!Save.data.story) Save.data.story = { ch: 0, step: 0 };
    const s = Save.data.story;
    // 台本から段階が減ったときの古いセーブ：その章は終えたことにする
    while (STORY[s.ch] && s.step >= STORY[s.ch].steps.length) { s.ch++; s.step = 0; }
    return s;
  },
  current() {
    const s = this.state, ch = STORY[s.ch];
    // 開発中の章（dev）は、デバッグモードのときだけ進める。ほかのときは、すべてのお話を見終えたことにする
    if (ch && ch.dev && !Debug.on) return null;
    return ch && ch.steps[s.step] ? { ch, chIdx: s.ch, step: ch.steps[s.step] } : null;
  },
  // エピローグを見終えたら「クリア後」
  done() { return !this.current() || this.seen('c9_01'); },
  // シーンを見終えたか（そのシーンを含む段階が、現在の段階より前にある）。戦いのあとのシーン（after）も、その段階を終えたら見終えている
  seen(id) {
    const st = this.state;
    for (let ci = 0; ci < STORY.length; ci++) {
      const i = STORY[ci].steps.findIndex(x => x.id === id || x.scene === id || x.after === id);
      if (i >= 0) return ci < st.ch || (ci === st.ch && i < st.step);
    }
    return false;
  },
  advance() {
    const s = this.state;
    s.step++;
    // 章が進んだら、みんなの HP を全回復する（やられた子も起きる。必殺技ゲージは宿と同じく、そのまま）
    if (s.step >= STORY[s.ch].steps.length) { s.ch++; s.step = 0; Save.data.hp = {}; }
    Save.save();
  },
  progress(ci) {
    const s = this.state;
    if (s.ch > ci) return 1;
    if (s.ch < ci) return 0;
    return s.step / STORY[ci].steps.length;
  },
  stageById(id) { return allStages().find(x => x.id === id); },
  // ステージが既にクリア済みなら戦闘を省略
  battle(id, next) {
    if (Save.data.cleared[id]) { next(); return; }
    const st = this.stageById(id);
    startStage(st.ci, st, [], res => { if (res.win) next(); else App.go(FieldScreen); });
  },
  // 続きから：探索の段階なら前回の場所から歩き、ほかの段階（会話・戦闘など）ならその段階を始める
  resume() {
    const cur = this.current();
    if (cur && cur.step.t !== 'field') this.run(); else App.go(FieldScreen);
  },
  run() {
    const cur = this.current();
    if (!cur) { App.go(FieldScreen); return; }
    const step = cur.step;
    const next = () => { this.advance(); this.run(); };
    switch (step.t) {
      case 'scene': App.go(DialogueScreen, step.id, next); break;
      case 'battle': this.battle(step.stage, step.after ? () => App.go(DialogueScreen, step.after, next) : next); break;
      case 'field': {
        // start：この段階を始めるとき、指定の区画・位置から歩き出す（遠い場所へ旅立つときなど）
        const r = Save.data.fieldResume;
        if (step.start && !(r && r.zone && step.near && step.near.includes(r.zone))) {
          const [zone, sx, sz] = step.start, [x, z] = zonePoint(FIELD_ZONES[zone], [sx, sz]);
          Save.data.fieldResume = { ci: FIELD_ZONES[zone].ci, zone, x, z, yaw: step.yaw || 0 };
          Save.save();
        }
        App.go(FieldScreen); break;
      }
      case 'reward': {
        Save.data.niboshi += step.niboshi || 0; this.advance();
        App.go(ChapterClearScreen, cur.chIdx, step.niboshi);
        break;
      }
      case 'ending': this.advance(); App.go(EndingScreen); break;
    }
  },
  // フィールドで目的地に着いた
  arrive() {
    const cur = this.current(); if (!cur || cur.step.t !== 'field') return;
    const step = cur.step;
    const next = () => { this.advance(); this.run(); };
    // clear：戦わずに、そのステージをクリア扱いにする（物語では戦わないステージ。先の区画の鍵になる）
    const fight = () => {
      if (step.clear && !Save.data.cleared[step.clear]) { Save.data.cleared[step.clear] = true; Save.save(); }
      if (step.battle) this.battle(step.battle, step.after ? () => App.go(DialogueScreen, step.after, next) : next); else next();
    };
    // heal：みんなの HP を全回復する（必殺技ゲージは宿と同じく、そのまま）。つぎに作る探索のセッションが、セーブから読む
    if (step.heal) { Save.data.hp = {}; Save.save(); }
    if (step.scene) App.go(DialogueScreen, step.scene, fight); else fight();
  },
};

// ============================================================
//  あらすじ：見終えたシーンを章ごとに振り返る
// ============================================================
function recapEntries() {
  const st = Story.state;
  return STORY.map((ch, ci) => {
    if (ci > st.ch) return null;
    const scenes = ch.steps.flatMap((step, i) => [step.id, step.scene, step.after].filter(Boolean).map(id => ({ id, i })))
      .filter(x => SCENES[x.id] && RECAP.scenes[x.id] && (ci < st.ch || x.i < st.step))
      .map(x => ({ id: x.id, title: SCENES[x.id].title, text: RECAP.scenes[x.id] }));
    return { ci, title: ch.title, intro: RECAP.chapters[ci] || '', scenes, done: ci < st.ch };
  }).filter(Boolean);
}
function renderRecap(o, onClose, onReplay) {
  const list = recapEntries(), cur = Story.current();
  const body = list.map(c => `<section class="rc-ch">
      <h3>${c.title}${c.done ? '<small>完</small>' : ''}</h3>
      <p class="rc-intro">${c.intro}</p>
      ${c.scenes.length ? c.scenes.map(sc => `<div class="rc-scene">
        <div class="rc-head"><b>${sc.title}</b>${onReplay ? `<button class="btn small" data-replay="${sc.id}">もう一度見る</button>` : ''}</div>
        <p>${sc.text}</p></div>`).join('') : '<p class="rc-none">まだ物語は始まっていない。</p>'}
    </section>`).join('');
  o.innerHTML = `<div class="ov-box recap"><h2>これまでのあらすじ</h2>
    <div class="rc-list">${body}
      ${cur ? `<div class="rc-now"><small>いまの目的</small>◆ ${cur.step.g}</div>` : '<div class="rc-now"><small>ぼうけん</small>すべてのお話を見終えた</div>'}
    </div>
    <div class="rc-foot"><button class="btn gold" data-close>閉じる</button></div></div>`;
  o.classList.remove('hidden');
  const listEl = o.querySelector('.rc-list');
  listEl.scrollTop = listEl.scrollHeight;
  o.querySelector('[data-close]').onclick = () => { Sfx.click(); onClose(); };
  o.querySelectorAll('[data-replay]').forEach(b => b.onclick = () => { Sfx.select(); onReplay(b.dataset.replay); });
}

// ============================================================
//  会話シーン（舞台がない場面は、並び立ちで演じる）
// ============================================================
POSES.talk = { armRx: -0.75, armRz: -0.05, elbowR: -1.35, armLz: 0.14, elbowL: -0.2, headX: -0.04 };
POSES.talk2 = { armRx: -0.5, elbowR: -1.0, armLx: -0.5, elbowL: -1.0, armLz: 0.2, armRz: -0.2, headY: 0.1 };

class DialogueView extends BaseView {
  constructor(scene) {
    super(scene.bg || 'meadow', 32);
    this.bloomStrength = 0.5;
    this.actors = {};
    const keys = [];
    scene.lines.forEach(l => {
      if (Array.isArray(l) && l[0] !== 'n') keys.push(l[0]);
      if (l.c) { keys.push(HERO); l.c.forEach(([, rs]) => rs.forEach(r => keys.push(r[0]))); }
    });
    (scene.cast || []).forEach(k => keys.push(k));
    const people = [...new Set(keys)].filter(k => k !== 'n' && !k.startsWith('e:'));
    const foes = [...new Set(keys)].filter(k => k.startsWith('e:'));
    if (!people.includes(HERO)) people.unshift(HERO);
    const order = people.filter(k => k !== HERO);
    order.splice(Math.floor(order.length / 2), 0, HERO);
    order.forEach((k, i) => {
      const m = buildCharacter(k), x = (i - (order.length - 1) / 2) * 1.0;
      m.group.position.set(x, 0, Math.abs(x) * 0.25); m.group.rotation.y = -x * 0.25; m.setPose(POSES.idle);
      this.scene.add(m.group); this.actors[k] = { m, x };
    });
    foes.forEach(k => { const m = buildEnemy(k.slice(2)); m.group.position.set(0, 0, -5 - m.radius); this.scene.add(m.group); this.actors[k] = { m, x: 0, foe: true }; });
    this.wide(true);
  }
  wide(snap) { this.setCam(V3(0.4, 1.2, 4.6), V3(0, 0.75, -0.5), { snap, speed: 3 }); }
  focus(key) {
    const a = this.actors[key];
    if (!a) { this.wide(); return; }
    const g = a.m.group.position;
    if (a.foe) { const h = a.m.height; this.setCam(V3(1, h * 0.45 + 0.6, g.z + h * 1.2 + 3.5), V3(0, h * 0.6, g.z), { speed: 3.5 }); a.m.flash(a.m.color, 0.6); return; }
    const head = V3(g.x, 0.86 * (a.m.group.scale.y || 1), g.z), side = a.x > 0.1 ? -0.35 : 0.35;
    this.setCam(V3(head.x + side, head.y + 0.02, head.z + 1.6), head.clone().add(V3(side * 0.25, -0.12, 0)), { speed: 4 });
    if (a.m.face) { a.m.face.talking = true; setTimeout(() => { a.m.face.talking = false; }, 900); }
  }
  update(dt, t, rdt) {
    super.update(rdt, t);
    for (const k in this.actors) { const a = this.actors[k]; a.m.update(rdt, t); if (a.m.emit) a.m.emit(this.p, a.m.group.position); }
  }
}

// 第六章の魔王城の面会許可証：ハンコの欄 [欄の名前, ハンコの字, 押し方]
const PASS_STAMPS = [['健康診断', '異常なし'], ['グツグツ', '通って<br>よし'], ['ネムネム', '通って<br>よし', 'tilt'], ['チョキチョキ', '通って<br>よし'], ['ドドン', '通って<br>よし', 'big']];
function passCardHTML(n, fresh) {
  return `<b>魔王さま 面会許可証</b><div class="dc-slots">${PASS_STAMPS.map(([lab, st, cls], i) =>
    `<div class="dc-slot"><small>${lab}</small>${i < n ? `<i class="${cls || ''} ${fresh && i === n - 1 ? 'new' : ''}">${st}</i>` : ''}</div>`).join('')}</div>`;
}
// replay：あらすじから見直すとき。スキップはこのときだけ出す
function DialogueScreen(id, done, replay) {
  const scene = SCENES[id];
  let v = GFX.ok ? (SCENE_STAGES[id] ? new StageView(scene, id) : new DialogueView(scene)) : null;
  if (v) { v.key = 'dialog:' + id; GFX.setView(v); }
  // bgm: 'zone' は舞台の区画の曲（舞台のない場面は街道の曲）
  Music.play(scene.bgm === 'zone' ? (SCENE_STAGES[id] ? zoneBgm(FIELD_ZONES[SCENE_STAGES[id].zone]) : 'field') : scene.bgm || 'village');
  const s = h(`<div class="screen dialog ${v ? '' : 'flat'}">
    <div class="dl-fade"></div>
    <div class="dl-title"><small>${scene.chapter || 'ぼうけん'}</small><b>${scene.title}</b></div>
    <div class="dl-ctrl">${Debug.on ? '<button class="ctl" data-auto>AUTO</button>' : ''}${replay ? '<button class="ctl" data-skip>スキップ</button>' : ''}</div>
    <div class="dl-portrait"></div>
    <div class="dl-choices"></div>
    <div class="dl-card"></div>
    <div class="dl-meter"></div>
    <div class="dl-box"><div class="dl-name"></div><div class="dl-text"></div><div class="dl-next">▼</div></div>
    <div class="overlay dl-skipask hidden"><div class="ov-box"><h2>スキップ</h2><div class="dim">このシーンをスキップしますか？</div>
      <div class="dl-skipbtns"><button class="btn gold" data-skip-yes>スキップする</button><button class="btn" data-skip-no>つづきを見る</button></div></div></div>
  </div>`);
  const queue = scene.lines.slice();
  let typing = null, full = '', auto = false, autoTimer = null, waitingChoice = false, finished = false, currentChoice = null, holding = false, asking = false, locked = false, lockTimer = null;
  const nameEl = s.querySelector('.dl-name'), textEl = s.querySelector('.dl-text'), box = s.querySelector('.dl-box');
  const choicesEl = s.querySelector('.dl-choices'), portrait = s.querySelector('.dl-portrait');
  // 行の card: n で、ハンコ n 個の面会許可証を出す。card のない行で消える
  //   stamp: true の行で、いちばん新しいハンコが押される（音と、ハンコが降りてくる動き）
  const cardEl = s.querySelector('.dl-card');
  const showCard = (n, stamp) => {
    if (n == null) { cardEl.classList.remove('show'); return; }
    cardEl.innerHTML = passCardHTML(n, stamp); cardEl.classList.add('show');
    if (stamp) setTimeout(() => Sfx.tone(180, 0.12, 'square', 0.06, -60), 380);
  };
  // わらいメーター（scene.meter: { name, max, moods }）：行の meter: n で、笑わせる相手のごきげんを n にする。一度出したら、シーンの終わりまで出しておく
  const meterEl = s.querySelector('.dl-meter');
  let meterN = null;
  const setMeter = n => {
    const M = scene.meter; if (!M) return;
    const up = meterN != null && n > meterN, moods = M.moods || ['むすっ……', 'にやり', 'くすくす', '大わらい！'];
    meterN = n;
    meterEl.innerHTML = `<small>${M.name}のごきげん</small><b class="${up ? 'up' : ''}">${moods[Math.min(n, moods.length - 1)]}</b>
      <div class="dm-bar">${Array.from({ length: M.max }, (_, i) => `<i class="${i < n ? 'on' : ''} ${up && i === n - 1 ? 'new' : ''}"></i>`).join('')}</div>`;
    meterEl.classList.add('show'); meterEl.classList.toggle('full', n >= M.max);
    if (up) Sfx.laugh();
  };
  // 台本の「そのシーンで起きること」（仲間になる・友情・物語のフラグ）は、スキップしても必ず反映する
  const applied = new Set();
  const applyMeta = l => {
    if (applied.has(l)) return; applied.add(l);
    if (l.give) joinParty(l.give);
    if (l.flag) { Save.data.flags[l.flag] = true; Save.save(); }
    if (l.bond) { const [a, b, n] = l.bond; if (a === 'all') { const ks = Object.keys(Save.data.owned); for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) addBond(ks[i], ks[j], n); } else addBond(a, b, n); Save.save(); }
  };
  const finish = () => {
    if (finished) return; finished = true;
    clearInterval(typing); clearTimeout(autoTimer); clearTimeout(lockTimer);
    // 読み飛ばした行の仲間・フラグも反映
    const walk = ls => ls.forEach(l => { if (!Array.isArray(l) && (l.give || l.flag)) applyMeta(l); });
    walk(scene.lines);
    const U = GFX.ok && GFX.grade.uniforms; if (U) { U.tint.value.setRGB(1, 1, 1); U.desat.value = 0; }
    Game.activeDialog = null;
    done();
  };
  const scheduleAuto = () => { clearTimeout(autoTimer); if (auto && !waitingChoice) autoTimer = setTimeout(advance, 1200 + full.length * 45); };
  const show = (speaker, text, nameOverride, dir) => {
    full = text = forInput(text);
    const nm = nameOverride || speakerName(speaker);
    nameEl.textContent = nm; nameEl.style.display = nm ? '' : 'none';
    box.classList.toggle('narr', speaker === 'n');
    box.style.setProperty('--c', speakerColor(speaker));
    showCard(dir && dir.card != null ? dir.card : null, dir && dir.stamp);
    if (dir && dir.meter != null) setMeter(dir.meter);
    // lock：演出（流れ星が落ちるなど）を見せるあいだ、クリックやキーで先へ進めない。解けたら、オートの続きを
    clearTimeout(lockTimer); locked = !!(dir && dir.lock);
    if (locked) lockTimer = setTimeout(() => { locked = false; if (!typing) scheduleAuto(); }, dir.lock * 1000);
    if (v) { if (v.line) v.line(speaker, text, dir || {}); else speaker === 'n' ? v.wide() : v.focus(speaker); }
    else portrait.innerHTML = speaker === 'n' || speaker.startsWith('e:') ? '' : avatarSVG(speaker);
    let i = 0; textEl.textContent = '';
    clearInterval(typing);
    typing = setInterval(() => {
      i += 1; textEl.textContent = full.slice(0, i);
      if (i >= full.length) { clearInterval(typing); typing = null; if (v && v.lineDone) v.lineDone(); scheduleAuto(); }
    }, 30);
    if (speaker !== 'n' && !speaker.startsWith('e:') && Math.random() < 0.25) Sfx.meow(speaker); else Sfx.tone(700 + Math.random() * 200, 0.03, 'sine', 0.02);
  };
  // 場面転換：会話ウィンドウを空にして暗転し、そのあいだに舞台を組みかえて、明るくしながら次の行へ
  const fade = s.querySelector('.dl-fade');
  const changeSet = (set, then) => {
    textEl.textContent = ''; nameEl.style.display = 'none'; showCard(null);
    fade.classList.add('on');
    setTimeout(() => {
      if (finished) return;
      v = new StageView(scene, id, set); v.key = `dialog:${id}:${set}`; GFX.setView(v);
      setTimeout(() => { if (finished) return; fade.classList.remove('on'); then(); }, 150);
    }, 550);
  };
  const advance = () => {
    if (finished || waitingChoice || holding || asking || locked) return;
    if (typing) { clearInterval(typing); typing = null; textEl.textContent = full; if (v && v.lineDone) v.lineDone(); scheduleAuto(); return; }
    const l = queue.shift();
    if (!l) { finish(); return; }
    if (l.give) {
      const k = l.give, isNew = !Save.data.owned[k];
      applyMeta(l);
      show('n', isNew ? `${CHARS[k].name}が仲間になった！` : `${CHARS[k].name}がいっしょに旅をすることになった。`);
      if (v && v.give) v.give(k);
      Sfx.win(); Sfx.meow(k);
      return;
    }
    if (l.flag || l.bond) {
      applyMeta(l);
      if (l.say) { show('n', l.say); return; }
      advance(); return;
    }
    if (l.c) {
      currentChoice = l; waitingChoice = true;
      textEl.textContent = ''; nameEl.style.display = 'none';
      choicesEl.innerHTML = l.c.map(([t], i) => `<button class="dl-choice" data-i="${i}"><kbd>${i + 1}</kbd>${t}</button>`).join('');
      choicesEl.querySelectorAll('.dl-choice').forEach(b => b.onclick = e => { e.stopPropagation(); choose(+b.dataset.i); });
      if (v) v.choice ? v.choice() : v.focus(HERO);
      return;
    }
    const dir = l.find((x, i) => i >= 2 && x && typeof x === 'object'), go = () => show(l[0], l[1], typeof l[2] === 'string' ? l[2] : undefined, dir);
    // set：暗転して、別の舞台（scene.sets）に組みかえてから、この行を出す
    if (dir && dir.set && v && v.set !== undefined && v.set !== dir.set) { holding = true; changeSet(dir.set, () => { holding = false; go(); }); return; }
    // waitMove：前の行で歩きはじめた人物が着くまで待ってから、この行を出す（待つのは長くても 8 秒）
    if (dir && dir.waitMove && v && v.walking && v.walking()) {
      holding = true; const t0 = Date.now();
      const tm = setInterval(() => { if (finished || !v.walking() || Date.now() - t0 > 8000) { clearInterval(tm); holding = false; if (!finished) go(); } }, 100);
      return;
    }
    go();
  };
  const choose = i => {
    const node = currentChoice;
    if (!waitingChoice || !node || !node.c[i]) return;
    waitingChoice = false; choicesEl.innerHTML = '';
    Sfx.select();
    const [text, replies, dir] = node.c[i];
    if (dir && dir.bond) { const [a, b, n] = dir.bond; addBond(a, b, n); Save.save(); }
    // miss：すべった選択肢。応答のあと、その選択肢をのぞいて、もう一度えらぶ
    const again = dir && dir.miss ? [{ ...node, c: node.c.filter((_, j) => j !== i) }] : [];
    queue.unshift([HERO, text, dir || {}], ...replies, ...again);
    advance();
  };
  s.addEventListener('click', e => { if (e.target.closest('button, .dl-skipask')) return; Sfx.init(); advance(); });
  if (Debug.on) s.querySelector('[data-auto]').onclick = e => { auto = !auto; e.currentTarget.classList.toggle('on', auto); if (auto && !typing) scheduleAuto(); else clearTimeout(autoTimer); };
  // スキップの確認はゲーム画面の中に出す（ブラウザの confirm はダイアログを止めている環境だと何も出ずに「いいえ」になる）
  const ask = s.querySelector('.dl-skipask');
  const openAsk = () => { if (finished || asking) return; Sfx.click(); asking = true; clearTimeout(autoTimer); ask.classList.remove('hidden'); };
  const closeAsk = () => { if (!asking) return; asking = false; ask.classList.add('hidden'); if (!typing) scheduleAuto(); };
  if (replay) {
    s.querySelector('[data-skip]').onclick = openAsk;
    s.querySelector('[data-skip-yes]').onclick = () => { Sfx.click(); finish(); };
    s.querySelector('[data-skip-no]').onclick = () => { Sfx.click(); closeAsk(); };
    ask.addEventListener('click', e => { if (e.target === ask) closeAsk(); });
  }
  Game.activeDialog = {
    key(e) {
      const k = e.key;
      if (asking) { if (k === 'Escape') closeAsk(); return; }
      if (k === ' ' || k === 'Enter') { e.preventDefault(); advance(); }
      else if (waitingChoice && '123'.includes(k)) choose(+k - 1);
    },
  };
  setTimeout(advance, v ? 600 : 100);
  return s;
}
document.addEventListener('keydown', e => { if (Game.activeDialog) Game.activeDialog.key(e); });

// ============================================================
//  デバッグ：章・段階へジャンプ（URL に ?debug。?debug=0 で無効）
// ============================================================
const Debug = {
  KEY: 'nyanko_debug', BACKUP: 'nyanko_debug_backup',
  init() {
    try {
      const q = new URLSearchParams(location.search);
      if (q.has('debug')) { if (q.get('debug') === '0') localStorage.removeItem(this.KEY); else localStorage.setItem(this.KEY, '1'); }
    } catch (e) { /* 保存不可の環境 */ }
  },
  get on() { try { return localStorage.getItem(this.KEY) === '1'; } catch (e) { return false; } },
  get hasBackup() { try { return !!localStorage.getItem(this.BACKUP); } catch (e) { return false; } },
  metas(step) {
    const out = [], walk = ls => ls.forEach(l => { if (l && (l.give || l.flag || l.bond)) out.push(l); else if (l && l.c) l.c.forEach(([, rs]) => walk(rs)); });
    for (const id of [step.id, step.scene, step.after].filter(Boolean)) { const sc = SCENES[id]; if (sc) walk(sc.lines); }
    return out;
  },
  levelAt(ci, si) {
    const ch = STORY[ci];
    if (!ch) return 70;
    const st = ch.steps.slice(si).find(x => x.stage || x.battle), id = st ? st.stage || st.battle : null;
    return (id && (allStages().find(s => s.id === id) || {}).lv) || Math.max(1, ...ch.steps.map(x => (allStages().find(s => s.id === (x.stage || x.battle)) || {}).lv || 1));
  },
  jump(ci, si, { level = true } = {}) {
    const d = Save.data;
    try { if (!this.hasBackup) localStorage.setItem(this.BACKUP, JSON.stringify(d)); } catch (e) { /* 続ける */ }
    const before = [];
    for (let c = 0; c < STORY.length; c++) STORY[c].steps.forEach((st, i) => { if (c < ci || (c === ci && i < si)) before.push(st); });
    d.story = { ch: ci, step: si };
    const cleared = {};
    before.forEach(st => { if (st.stage) cleared[st.stage] = true; if (st.battle) cleared[st.battle] = true; if (st.clear) cleared[st.clear] = true; });
    // 物語で戦わないステージ（章の前半の戦闘）も、先の章へ進むならクリア扱い
    for (const s of allStages()) { const cIdx = CHAPTERS.findIndex(c => c.stages.some(x => x.id === s.id)); if (cIdx < Math.min(ci, CHAPTERS.length)) cleared[s.id] = true; }
    d.cleared = cleared;
    d.flags = {};
    for (const l of before.flatMap(st => this.metas(st))) {
      if (l.give) { if (!d.owned[l.give]) d.owned[l.give] = { lv: 1, exp: 0, eid: 0 }; if (d.team.length < 4 && !d.team.includes(l.give)) d.team.push(l.give); }
      if (l.flag) d.flags[l.flag] = true;
      if (l.bond) { const [a, b, n] = l.bond; if (a !== 'all') addBond(a, b, n); }
    }
    if (level) { const lv = this.levelAt(ci, si); for (const k of Object.keys(d.owned)) if (d.owned[k].lv < lv) Object.assign(d.owned[k], { lv, exp: 0 }); }
    delete d.fieldResume;
    // 行ける区画はすべて「行ったことがある」ことにして、ミャオニアの地図からひとっとびできるようにする
    const visited = d.fieldVisited || (d.fieldVisited = {});
    for (const id of Object.keys(FIELD_ZONES)) if (zoneOpen(id)) visited[id] = true;
    const tgt = STORY[ci] && STORY[ci].steps[si];
    // 探索の段階：ふつうに遊んだときと同じく、ひとつ前の探索の段階の目的地（そこで物語が進んだ場所）から歩き出す。
    // 目的地の区画のねこ地蔵からだと、その手前の仕掛け（光の鏡など）を飛びこえてしまうことがある
    if (tgt && tgt.t === 'field') {
      const prev = STORY[ci].steps.slice(0, si).reverse().find(st => st.t === 'field');
      if (tgt.start) { const [zone, x, z] = tgt.start, [wx, wz] = zonePoint(FIELD_ZONES[zone], [x, z]); d.fieldResume = { ci: FIELD_ZONES[zone].ci, zone, x: wx, z: wz, yaw: tgt.yaw || 0 }; }
      else if (prev) { const [wx, wz] = zonePoint(FIELD_ZONES[prev.zone], prev.at); d.fieldResume = { ci: FIELD_ZONES[prev.zone].ci, zone: prev.zone, x: wx, z: wz, yaw: 0 }; }
      else { const Z = FIELD_ZONES[tgt.zone]; d.fieldResume = { ci: Z.ci, zone: tgt.zone, x: Z.anchor[0], z: Z.anchor[1], yaw: 0 }; }
    }
    Save.save();
  },
  // まだ持っていない武器をすべて手に入れる（はじめの武器はいつも持っている）。手に入れた本数を返す
  giveAllWeapons() {
    const ids = Object.keys(WEAPONS).filter(id => !hasWeapon(id));
    ids.forEach(gainWeapon);
    Save.save();
    return ids.length;
  },
  restore() {
    try { const b = localStorage.getItem(this.BACKUP); if (!b) return false; localStorage.setItem(SAVE_KEY, b); localStorage.removeItem(this.BACKUP); } catch (e) { return false; }
    Save.load();
    return true;
  },
  render(o, onDone, onClose = () => o.classList.add('hidden')) {
    const cur = Story.current(), icon = { scene: '💬', battle: '⚔', field: '◆', reward: '★', ending: '✿' };
    const btn = (ci, si, label, now) => `<button class="dbg-step ${now ? 'now' : ''}" data-j="${ci},${si}">${label}</button>`;
    o.innerHTML = `<div class="ov-box dbg"><h2>デバッグ</h2>
      <div class="dbg-note">選んだ段階の直前まで進めた状態にします。前の章のステージはクリア済み、途中で加わる仲間も加入します。最初のジャンプの前にセーブデータを退避します。</div>
      <label class="dbg-opt"><input type="checkbox" data-lv checked>仲間のレベルを推奨レベルまで上げる</label>
      <div class="dbg-list">${STORY.map((ch, ci) => `<section><h3>${ch.title}<small>推奨 Lv.${this.levelAt(ci, 0)}</small></h3>
        ${ch.steps.map((st, si) => btn(ci, si, `<span>${icon[st.t]}</span>${st.g}`, cur && cur.chIdx === ci && Story.state.step === si)).join('')}</section>`).join('')}
        <section><h3>クリア後</h3>${btn(STORY.length, 0, '<span>★</span>すべてのお話を見終えた状態', !cur)}</section></div>
      <div class="dbg-foot"><button class="btn small" data-weapons>全ての武器を入手</button>${this.hasBackup ? '<button class="btn small" data-restore>ジャンプ前のセーブに戻す</button>' : ''}<button class="btn gold" data-close>閉じる</button></div></div>`;
    o.classList.remove('hidden');
    const now = o.querySelector('.dbg-step.now'); if (now) now.scrollIntoView({ block: 'center' });
    o.querySelector('[data-close]').onclick = () => { Sfx.click(); onClose(); };
    o.querySelectorAll('[data-j]').forEach(b => b.onclick = () => { const [ci, si] = b.dataset.j.split(',').map(Number); Sfx.select(); this.jump(ci, si, { level: o.querySelector('[data-lv]').checked }); onDone(); });
    o.querySelector('[data-weapons]').onclick = e => {
      const n = this.giveAllWeapons(), b = e.currentTarget;
      Sfx.win(); b.disabled = true; b.textContent = n ? `武器を${n}本 手に入れた` : 'すべて持っている';
    };
    const r = o.querySelector('[data-restore]');
    if (r) r.onclick = () => { Sfx.click(); if (this.restore()) onDone(); };
  },
};
Debug.init();

// ============================================================
//  章クリア・エンディング
// ============================================================
function ChapterClearScreen(ci, niboshi) {
  const ch = STORY[ci], [a, b] = ch.title.split('　'), nx = STORY[ci + 1];
  // 背景：章の clearSet（区画のその場所）があれば、その景色。なければ章の空と地面だけの景色（同じ鍵だと、前の章の景色が残ってしまうので章ごとに）
  const bg = (CHAPTERS[ci] || CHAPTERS[0]).bg, loc = ch.clearSet || null;
  const v3 = GFX.show('scene:clear:' + ci, () => new SceneryView(bg, loc ? { loc, radius: loc.radius || 13, height: loc.height || 3.2, lookY: loc.lookY, cam: loc.cam } : {}));
  if (v3) v3.setEnemies([]);
  const s = h(`<div class="screen chclear-scr"><div class="ov-box result win chclear">
    <div class="res-title">${a}　おしまい</div>
    <div class="res-sub">${b || ''}</div>
    <div class="res-info">${niboshi ? `<div class="rw"><i class="ic-jade"></i>章のごほうび　にぼし +${niboshi}</div>` : ''}
    ${nx && !nx.hidden ? `<div class="dim">次のお話「${nx.title}」</div>` : ''}</div>
    <button class="btn gold" data-ok>${nx && !nx.hidden ? '次のお話へ' : '冒険にもどる'}</button></div></div>`);
  Save.save(); Sfx.win(); Music.play(ch.clearBgm || 'hope');
  s.querySelector('[data-ok]').onclick = () => { Sfx.click(); nx && !nx.hidden ? Story.run() : App.go(FieldScreen); };
  return s;
}

// エンディング：Fin
function EndingScreen() {
  const v3 = GFX.ok ? GFX.show('title', () => new TitleView()) : null;
  Music.stop();   // Fin は曲なしで、静かに
  // 夢の世界への道のお知らせは、夢に入れるとき（開発中のあいだは、デバッグモード）だけ
  const s = h(`<div class="screen ending">
    <div class="en-roll">
      <h1>Fin</h1>
      <p class="dim">クリアおめでとう！${zoneOpen('dream') ? '　村の猫神社の奥で、ふしぎな夢の世界への道が開いたらしい……' : ''}</p>
    </div>
    <button class="btn gold" data-ok>冒険にもどる</button></div>`);
  s.querySelector('[data-ok]').onclick = () => { Sfx.click(); App.go(FieldScreen); };
  return s;
}
