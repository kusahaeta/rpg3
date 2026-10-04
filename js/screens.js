'use strict';
// ============================================================
//  画面：タイトル／おうち（ハブ）／思い出のたたかい／へんせい／なかま／友情／お店
// ============================================================
const App = {
  el: null,
  mount(node) { [...this.el.children].forEach(c => { if (c.id !== 'gl') c.remove(); }); this.el.appendChild(node); },
  go(fn, ...args) {
    Game.activeBattle = null; Game.activeField = null; Game.activeDialog = null;
    if (GFX.view && GFX.view.persist && fn !== FieldScreen) GFX.view.persist = false;
    const n = fn(...args); if (n) this.mount(n);
  },
};

function h(str) { const t = document.createElement('template'); t.innerHTML = str.trim(); return t.content.firstElementChild; }
function on(root, sel, ev, fn) { root.querySelectorAll(sel).forEach(el => el.addEventListener(ev, e => { Sfx.click(); fn(el, e); })); }

function topBar(title, back = true) {
  const d = Save.data;
  return `<div class="topbar">
    ${back ? '<button class="back" data-back>‹</button>' : ''}
    <div class="tb-title">${title}</div>
    <div class="currency">
      <span class="c-item" title="にぼし（お金）"><i class="ic-jade"></i>${fmt(d.niboshi)}</span>
      <span class="c-item" title="初手技ポイント（初手技に使う）"><i class="ic-tp"></i>${d.tp}/5</span>
    </div></div>`;
}
function wireBack(node, fn = () => App.go(HubScreen)) { const b = node.querySelector('[data-back]'); if (b) b.onclick = () => { Sfx.click(); fn(); }; }

function charChip(key, extra = '') {
  const c = CHARS[key], o = Save.data.owned[key];
  return `<div class="chip r${c.rarity} ${extra}" data-key="${key}" style="--c:${ELEMENTS[c.elem].color}">
    <div class="chip-face">${avatarSVG(key)}</div>
    <div class="chip-el">${elemIcon(c.elem)}</div>
    <div class="chip-name">${c.name}</div>
    ${o ? `<div class="chip-lv">Lv.${o.lv}</div>` : '<div class="chip-lv">？？？</div>'}
  </div>`;
}

// ------------------------------------------------------------
//  タイトル
// ------------------------------------------------------------
function TitleScreen() {
  GFX.show('title', () => new TitleView());
  const s = h(`<div class="screen title">
    <div class="t-logo">
      <div class="t-en">NYANKO FANTASY</div>
      <h1><span>に</span><span>ゃ</span><span>ん</span><span>こ</span><br><span>フ</span><span>ァ</span><span>ン</span><span>タ</span><span>ジ</span><span>ー</span></h1>
      <div class="t-name">〜 一匹では弱くても 〜</div>
    </div>
    <div class="t-start">— <span class="pc-only">クリック</span><span class="touch-only">タップ</span>して はじめる —</div>
    <div class="t-note">3D コマンドRPG ／ にゃんこはみんな2頭身</div>
  </div>`);
  s.onclick = () => { Sfx.init(); Sfx.meow('mike'); Music.play('village'); App.go(Story.state.ch === 0 && Story.state.step === 0 ? StoryScreen : HubScreen); };
  return s;
}

// ------------------------------------------------------------
//  おうち（ハブ）：先頭の子が座布団の上に。出番の少ない子がすねることも
// ------------------------------------------------------------
function HubScreen() {
  const lead = Save.data.team[0];
  const v3 = GFX.show('hub', () => new ShowcaseView(lead, { screenX: 330 }));
  if (v3 && (!v3.model || v3.model.key !== lead)) v3.setChar(lead);
  Music.play('village');
  const cur = Story.current();
  const pout = sulkyCat();
  const news = (Save.data.bondNews || []).splice(0); Save.save();
  const s = h(`<div class="screen hub">
    ${topBar('ミケのおうち', false)}
    <div class="hub-hero" style="--c:${ELEMENTS[CHARS[lead].elem].color}">
      ${GFX.ok ? '<div class="hero-drag" title="ドラッグで回転"></div>' : `<div class="hero-art">${avatarSVG(lead)}</div>`}
      <div class="hero-cap"><div class="hero-name">${CHARS[lead].name}</div><div class="hero-title">${CHARS[lead].title}</div></div>
      ${pout ? `<div class="hub-pout" style="--c:${ELEMENTS[CHARS[pout.k].elem].color}"><div class="hp-face">${avatarSVG(pout.k)}</div><div class="hp-say"><b>${CHARS[pout.k].name}</b>${pout.line}</div></div>` : ''}
    </div>
    ${cur ? `<div class="hub-quest" data-quest><small>ぼうけん｜${cur.ch.title}</small><b>◆ ${cur.step.g}</b></div>` : ''}
    ${news.length ? `<div class="hub-news">${news.map(n => { const [a, b] = n.k.split('|'); return `<div>♥ ${CHARS[a].name}と${CHARS[b].name}の友情が <b>Lv.${n.lv}</b> に！<small>${BOND_INFO[n.lv - 1]}</small></div>`; }).join('')}</div>` : ''}
    <div class="hub-menu">
      <button class="hm gold" data-go="story"><b>ぼうけんの書</b><small>STORY</small><em>物語を進める</em></button>
      <button class="hm" data-go="field"><b>冒険に出る</b><small>EXPLORE</small><em>ミャオニアを歩いて、敵や宝箱をさがす</em></button>
      <button class="hm" data-go="chars"><b>なかま</b><small>PARTY</small><em>ステータス・わざの確認</em></button>
      <button class="hm" data-go="team"><b>へんせい</b><small>TEAM</small><em>戦いに出る4匹を決める</em></button>
      <button class="hm" data-go="bond"><b>友情</b><small>FRIENDSHIP</small><em>一緒に旅をした時間</em></button>
      <button class="hm" data-go="stages"><b>思い出のたたかい</b><small>BATTLES</small><em>これまでの戦いにもう一度</em></button>
    </div>
    <div class="hub-foot">
      <button class="link" data-bgm>BGM：${Music.on ? 'ON' : 'OFF'}</button>
      <button class="link" data-eco>画質：${GFX.eco ? '省エネ（30fps）' : 'なめらか（60fps）'}</button>
      <button class="link" data-reset>データを初期化</button>
      <span class="pc-only">戦闘：Q 通常攻撃 ／ E スキル ／ R はなす ／ 1〜4 必殺技 ／ C コンボ ／ Space 決定 ／ V オート ／ F 倍速</span>
    </div>
  </div>`);
  const map = { story: () => App.go(StoryScreen), field: () => App.go(FieldScreen), chars: () => App.go(CharScreen), team: () => App.go(TeamScreen), bond: () => App.go(BondScreen), stages: () => App.go(StageScreen) };
  on(s, '[data-go]', 'click', el => map[el.dataset.go]());
  const q = s.querySelector('[data-quest]'); if (q) q.onclick = () => { Sfx.select(); Story.run(); };
  if (v3) v3.bindDrag(s.querySelector('.hero-drag'));
  s.querySelector('[data-bgm]').onclick = e => { Music.toggle(); e.currentTarget.textContent = `BGM：${Music.on ? 'ON' : 'OFF'}`; };
  s.querySelector('[data-eco]').onclick = e => {
    GFX.setEco(!GFX.eco); Save.data.eco = GFX.eco; Save.save();
    e.currentTarget.textContent = `画質：${GFX.eco ? '省エネ（30fps）' : 'なめらか（60fps）'}`;
  };
  s.querySelector('[data-reset]').onclick = () => { if (confirm('セーブデータを初期化しますか？')) { Save.reset(); App.go(TitleScreen); } };
  return s;
}
// 出番の少ない子（仲間が3匹以上で、ほかの子の1/3以下しか戦っていない）
const SULK_LINES = {
  shiro: '……最近、私の出番少なくない？',
  kuro: '……別に、呼ばれなくても気にしていない。……本当だ。',
  tama: '……ぼくも……いっしょに行きたいな……',
  maou: '余を編成に入れぬとは……ふん、退屈だ。',
  mike: 'ねえねえ、たまにはぼくも連れてってよー！',
};
function sulkyCat() {
  const ks = Object.keys(Save.data.owned); if (ks.length < 3) return null;
  const u = k => Save.data.usage[k] || 0, max = Math.max(...ks.map(u));
  if (max < 6) return null;
  const k = ks.filter(k => !Save.data.team.includes(k) && u(k) <= max / 3).sort((a, b) => u(a) - u(b))[0];
  return k ? { k, line: SULK_LINES[k] } : null;
}

// ------------------------------------------------------------
//  思い出のたたかい（ステージ一覧）
// ------------------------------------------------------------
function allStages() { return CHAPTERS.flatMap((c, ci) => c.stages.map(s => ({ ...s, ci }))); }
// ひとつ前のステージをクリアすると開く。あとから台本にステージが加わっても、それより先をクリアしていれば開いている
function stageUnlocked(id) {
  const list = allStages(), i = list.findIndex(s => s.id === id);
  return i === 0 || list.slice(i - 1).some(s => Save.data.cleared[s.id]);
}

function StageScreen(ci, sid) {
  const list = allStages();
  if (ci == null) {
    const next = list.filter(s => Save.data.cleared[s.id]).pop() || list[0];
    ci = next.ci; sid = next.id;
  }
  const ch = CHAPTERS[ci];
  const st = ch.stages.find(s => s.id === sid) || ch.stages[0];
  const techs = new Set();
  const played = s => Save.data.cleared[s.id];
  const enemyKeys = [...new Set(st.waves.flat())];
  const v3 = GFX.show('stage:' + ch.bg, () => new SceneryView(ch.bg, { screenX: 936, screenY: 250, close: true }));
  if (v3) v3.setEnemies(played(st) ? enemyKeys : []);
  Music.play('village');
  const s = h(`<div class="screen stages">
    ${topBar('思い出のたたかい')}
    <div class="st-chapters">${CHAPTERS.map((c, i) => (c.hidden && !stageUnlocked(c.stages[0].id)) ? '' : `
      <button class="st-ch ${i === ci ? 'on' : ''} ${c.stages.some(played) ? '' : 'locked'}" data-ci="${i}">
        <small>${c.hidden ? 'おまけ' : `第${i + 1}章`}</small><b>${c.name}</b></button>`).join('')}</div>
    <div class="st-list">
      <div class="st-desc">${ch.desc}</div>
      ${ch.stages.map(x => `
        <button class="st-item ${x.id === st.id ? 'on' : ''} ${played(x) ? '' : 'locked'} ${x.boss ? 'boss' : ''}" data-sid="${x.id}">
          <span class="st-id">${x.id}</span><span class="st-nm">${played(x) ? x.name : '？？？'}</span>
          <span class="st-lv">Lv.${x.lv}</span>${played(x) ? '<span class="st-ok">✓</span>' : ''}
        </button>`).join('')}
    </div>
    <div class="st-detail">
      <div class="sd-head"><span class="st-id">${st.id}</span><h2>${played(st) ? st.name : '？？？'}</h2><span class="sd-lv">推奨Lv.${st.lv}</span></div>
      ${played(st) ? `<div class="sd-sec">出てくる敵</div>
      ${GFX.ok ? `<div class="sd-stage3d"></div><div class="sd-weakrow">${enemyKeys.map(k => `<span style="--c:${ENEMIES[k].color}"><b>${ENEMIES[k].name}</b>${ENEMIES[k].weak.map(w => elemIcon(w)).join('')}</span>`).join('')}</div>` : ''}
      <div class="sd-sec">ごほうび</div>
      <div class="sd-rew"><span><i class="ic-exp"></i>なかまの経験値 ${fmt((80 + st.lv * 30) * st.waves.length)}</span><span><i class="ic-jade"></i>にぼし ${10 + st.lv * 3}</span></div>
      <div class="sd-sec">出るメンバー <small>クリックで初手技を使う（初手技ポイント1）</small></div>
      <div class="sd-team">${Save.data.team.map(k => `
        <div class="sd-mem" data-k="${k}" title="${CHARS[k].technique.name}：${CHARS[k].technique.desc}">
          ${charChip(k)}<div class="tech-tag">初手技</div></div>`).join('')}
        <button class="btn small" data-edit>へんせい</button>
      </div>
      <div class="sd-tech"></div>
      <button class="btn gold big" data-start>たたかう</button>` : '<div class="dim sd-locked">物語で出会った戦いに、ここで何度でも挑める。</div>'}
    </div>
  </div>`);
  wireBack(s);
  on(s, '[data-ci]', 'click', el => { const i = +el.dataset.ci; if (!el.classList.contains('locked')) App.go(StageScreen, i, CHAPTERS[i].stages[0].id); });
  on(s, '[data-sid]', 'click', el => { if (!el.classList.contains('locked')) App.go(StageScreen, ci, el.dataset.sid); });
  const ed = s.querySelector('[data-edit]'); if (ed) ed.onclick = () => { Sfx.click(); App.go(TeamScreen, () => App.go(StageScreen, ci, st.id)); };
  const techInfo = s.querySelector('.sd-tech');
  const refreshTech = () => { if (techInfo) techInfo.innerHTML = techs.size ? [...techs].map(k => `<div><b>${CHARS[k].name}「${CHARS[k].technique.name}」</b> ${CHARS[k].technique.desc}</div>`).join('') : '<div class="dim">初手技は使わない</div>'; };
  refreshTech();
  on(s, '.sd-mem', 'click', el => { const k = el.dataset.k; if (techs.has(k)) techs.delete(k); else if (techs.size < Save.data.tp) techs.add(k); el.classList.toggle('tech', techs.has(k)); refreshTech(); });
  const go = s.querySelector('[data-start]'); if (go) go.onclick = () => { Sfx.select(); startStage(ci, st, [...techs]); };
  return s;
}

// 戦いに出る子：編成＋guests（物語で、まだ仲間になる前や、一行を離れている間にいっしょに戦う子。編成に空きがあれば加わる）
function battleTeam(st) {
  const team = teamMembers(), lv = Math.max(...team.map(m => m.lv)), away = awayNow();
  for (const k of st.guests || []) {
    const o = Save.data.owned[k];
    if ((!o || away.includes(k)) && team.length < 4 && !team.some(m => m.key === k)) team.push({ key: k, lv: o ? o.lv : lv, eid: o ? o.eid : 0 });
  }
  return team;
}
function startStage(ci, st, techs, after) {
  Save.data.tp -= techs.length; Save.save();
  const first = !Save.data.cleared[st.id];
  const b = new Battle({
    team: battleTeam(st), techs, bg: CHAPTERS[ci].bg, canRetry: true, loc: st.id, final: st.final || null,
    title: `${st.name}`,
    waves: st.waves.map(w => w.map(k => ({ key: k, lv: st.lv }))),
    onResult: res => {
      if (!res.win) return '<div class="dim">へんせいやレベルを見直してみよう。</div>';
      const d = Save.data, exp = (80 + st.lv * 30) * st.waves.length, nib = (10 + st.lv * 3) * (first ? 3 : 1);
      d.cleared[st.id] = true;
      d.niboshi += nib; d.tp = Math.min(5, d.tp + 1);
      let html = `<div class="rw"><i class="ic-jade"></i>にぼし +${nib}${first ? '（はじめて）' : ''}　<i class="ic-tp"></i>初手技ポイント +1</div>`;
      html += '<div class="rw-team">' + d.team.map(k => { const up = grantExp(k, exp); return `<div class="rw-mem">${avatarSVG(k)}<span>Lv.${d.owned[k].lv}${up ? `<b> ▲${up}</b>` : ''}</span></div>`; }).join('') + '</div>';
      Save.save();
      return html;
    },
    onExit: (res, act) => {
      if (act === 'retry') startStage(ci, st, [], after);
      else if (after) after(res);
      else App.go(StageScreen, ci, st.id);
    },
  });
  b.start();
}

// ------------------------------------------------------------
//  へんせい
// ------------------------------------------------------------
function TeamScreen(backFn) {
  let slot = 0;
  const v3 = GFX.show('scene:team', () => new SceneryView('meadow'));
  if (v3) v3.setEnemies([]);
  const s = h(`<div class="screen team">${topBar('へんせい')}
    <div class="tm-slots"></div>
    <div class="tm-hint">枠を選んでから、下のにゃんこをクリック。先頭の子が、冒険でみんなを連れて歩きます。</div>
    <div class="tm-roster"></div></div>`);
  wireBack(s, backFn || (() => App.go(HubScreen)));
  // 物語の都合で一行を離れている子（awayNow）は、枠をとったまま動かせない
  const away = awayNow(), isAway = k => away.includes(k);
  const free = i => !isAway(Save.data.team[i]);
  if (!free(slot)) slot = [0, 1, 2, 3].find(free);
  const render = () => {
    const t = Save.data.team, lead = t.findIndex(k => !isAway(k));
    s.querySelector('.tm-slots').innerHTML = [0, 1, 2, 3].map(i => isAway(t[i]) ? `
      <div class="tm-slot away">
        ${charChip(t[i], 'big')}
        <div class="tm-path">いまは一行を離れている</div>
      </div>` : `
      <div class="tm-slot ${i === slot ? 'on' : ''}" data-slot="${i}">
        <div class="tm-no">${i === lead ? '先頭' : i + 1}</div>
        ${t[i] ? charChip(t[i], 'big') + `<button class="tm-x" data-x="${i}">×</button>
          <div class="tm-path">${PATHS[CHARS[t[i]].path].name}・${ELEMENTS[CHARS[t[i]].elem].name}</div>` : '<div class="tm-empty">あき</div>'}
      </div>`).join('');
    s.querySelector('.tm-roster').innerHTML = Object.keys(CHARS).filter(k => Save.data.owned[k]).map(k => charChip(k, isAway(k) ? 'away' : t.includes(k) ? 'inteam' : '')).join('');
    on(s, '[data-slot]', 'click', (el, e) => {
      if (e.target.closest('[data-x]')) { const i = +e.target.closest('[data-x]').dataset.x; if (Save.data.team.filter(k => k && !isAway(k)).length > 1) { Save.data.team.splice(i, 1); Save.save(); } slot = Math.min(slot, Save.data.team.length); if (!free(slot)) slot = [0, 1, 2, 3].find(free); render(); return; }
      slot = +el.dataset.slot; render();
    });
    on(s, '.tm-roster .chip', 'click', el => {
      const k = el.dataset.key; if (isAway(k)) return;
      const team = Save.data.team, at = team.indexOf(k), target = Math.min(slot, team.length);
      if (at >= 0) { if (team[target]) { team[at] = team[target]; team[target] = k; } } else team[target] = k;
      Save.data.team = team.filter(Boolean); Save.save(); Sfx.meow(k);
      slot = Math.min(3, Math.min(target + 1, Save.data.team.length)); if (!free(slot)) slot = [0, 1, 2, 3].find(free); render();
    });
  };
  render();
  return s;
}

// ------------------------------------------------------------
//  なかま（ステータス・わざ）
// ------------------------------------------------------------
function CharScreen(sel) {
  const keys = Object.keys(CHARS).filter(k => Save.data.owned[k]);
  sel = sel && Save.data.owned[sel] ? sel : Save.data.team[0];
  const v3 = GFX.show('chars', () => new ShowcaseView(sel, { screenX: 470 }));
  if (v3 && (!v3.model || v3.model.key !== sel)) v3.setChar(sel);
  const c = CHARS[sel], o = Save.data.owned[sel], col = ELEMENTS[c.elem].color, gear = Save.data.gear[sel] || 0;
  const st = charStats(sel, o.lv, o.eid);
  const ab = (label, a) => `<div class="ck-ab"><div class="ck-ab-h"><span class="ck-kind">${label}</span><b>${a.name}</b>${a.target ? `<span class="ck-tg">${{ single: '単体', blast: '拡散', aoe: '全体', bounce: 'バウンド', ally: '味方単体', allies: '味方全体', self: '自分' }[a.target]}</span>` : ''}</div><p>${a.desc}</p></div>`;
  const combos = COMBOS.filter(x => x.pair.includes(sel));
  const s = h(`<div class="screen chars">${topBar('なかま')}
    <div class="ck-list">${keys.map(k => charChip(k, k === sel ? 'on' : '')).join('')}</div>
    <div class="ck-art ${GFX.ok ? 'is3d' : ''}" style="--c:${col}">${GFX.ok ? '' : avatarSVG(sel)}</div>
    <div class="ck-info" style="--c:${col}">
      <div class="ck-head"><h2>${c.name}</h2><div class="ck-title">${c.title}</div>
        <div class="ck-tags">${elemIcon(c.elem)}<span>${ELEMENTS[c.elem].name}</span><span class="ck-path">役割：${PATHS[c.path].name}</span><span class="ck-eid">武器：${GEAR_NAMES[sel][gear]}</span></div></div>
      <div class="ck-lv"><b>Lv.${o.lv}</b><span>/80</span>
        <div class="bar exp"><i style="width:${o.lv >= 80 ? 100 : o.exp / expToNext(o.lv) * 100}%"></i></div>
        <div class="dim">${o.lv >= 80 ? 'レベル最大' : `次のレベルまで あと ${fmt(expToNext(o.lv) - o.exp)}`}</div></div>
      <div class="ck-stats">
        <div><span>HP</span><b>${fmt(st.maxHp)}</b></div><div><span>攻撃力</span><b>${fmt(st.atk)}</b></div>
        <div><span>防御力</span><b>${fmt(st.def)}</b></div><div><span>速度</span><b>${st.spd}</b></div>
        <div><span>会心率</span><b>${Math.round(st.crit * 100)}%</b></div><div><span>会心ダメージ</span><b>${Math.round(st.critDmg * 100)}%</b></div>
        <div><span>撃破特効</span><b>${Math.round(st.be * 100)}%</b></div><div><span>EP上限</span><b>${c.energyMax}</b></div>
      </div>
      <div class="ck-abs">
        ${ab('通常攻撃', c.basic)}${ab('戦闘スキル', c.skill)}${ab(`必殺技（EP${c.energyMax}）`, c.ult)}
        ${ab('とくせい', c.talent)}${ab('初手技', c.technique)}
        ${combos.map(x => ab(`コンボ（${x.pair[1] === '*' ? 'みんなと' : CHARS[x.pair.find(p => p !== sel)].name + 'と'}・友情Lv3）`, x)).join('')}
      </div>
    </div></div>`);
  wireBack(s);
  on(s, '.ck-list .chip', 'click', el => App.go(CharScreen, el.dataset.key));
  if (v3) v3.bindDrag(s.querySelector('.ck-art'));
  return s;
}

// ------------------------------------------------------------
//  友情：2匹の組み合わせごとの友情レベルと、特別イベント
// ------------------------------------------------------------
function BondScreen() {
  const v3 = GFX.show('scene:bond', () => new SceneryView('meadow'));
  if (v3) v3.setEnemies([]);
  const ks = Object.keys(CHARS).filter(k => Save.data.owned[k]);
  const pairs = []; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) pairs.push([ks[i], ks[j]]);
  const s = h(`<div class="screen bondscr">${topBar('友情')}
    <div class="bd-intro">友情は「一緒に旅をした時間」。一緒に戦ったり、話したり、物語を進めると深まります。<br>
      Lv2：戦闘中の掛け合い　Lv3：コンボスキル　Lv4：特別イベント　Lv5：最終スキル</div>
    <div class="bd-list">${pairs.length ? pairs.map(([a, b]) => {
      const lv = bondLv(a, b), p = bondPts(a, b), nx = BOND_LV[lv] ?? null, pr = nx ? (p - BOND_LV[lv - 1]) / (nx - BOND_LV[lv - 1]) : 1;
      const ev = BOND_EVENTS[bondKey(a, b)], seen = Save.data.bondSeen[bondKey(a, b)];
      const combo = COMBOS.find(c => c.pair.join('|') === bondKey(a, b) || (c.pair[0] === b && c.pair[1] === a));
      return `<div class="bd-pair">
        <div class="bd-faces"><div>${avatarSVG(a)}</div><div>${avatarSVG(b)}</div></div>
        <div class="bd-info"><b>${CHARS[a].name} × ${CHARS[b].name}</b><small>${BOND_TAGS[bondKey(a, b)] || ''}</small>
          <div class="bd-hearts">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lv ? 'on' : ''}">♥</i>`).join('')}<span>Lv.${lv}</span></div>
          <div class="bar bondbar"><i style="width:${pr * 100}%"></i></div>
          <div class="bd-perks">${combo ? `<span class="${lv >= 3 ? 'on' : ''}">コンボ「${combo.name}」</span>` : ''}${ev ? `<button class="btn small ${lv >= 4 ? '' : 'dis'}" data-ev="${bondKey(a, b)}" ${lv >= 4 ? '' : 'disabled'}>${seen ? '♥ もう一度見る' : lv >= 4 ? '♥ 特別イベント' : '特別イベント（Lv4）'}</button>` : ''}</div>
        </div></div>`;
    }).join('') : '<div class="dim">仲間がふえると、ここに友情が記録されます。</div>'}</div></div>`);
  wireBack(s);
  on(s, '[data-ev]', 'click', el => { const k = el.dataset.ev; Save.data.bondSeen[k] = true; Save.save(); App.go(DialogueScreen, BOND_EVENTS[k], () => App.go(BondScreen)); });
  return s;
}

// ------------------------------------------------------------
//  お店（フィールドの住人から）
// ------------------------------------------------------------
const SHOP_NAMES = { weapon: '武器を鍛える', item: '道具屋', inn: 'ひと休み', fish: '魚屋' };
function renderShop(o, kind, name, close, field) {
  const d = Save.data;
  const draw = () => {
    let body = '';
    if (kind === 'weapon') {
      body = `<div class="dim">にぼしで仲間の武器を鍛えると、HP・攻撃力・防御力が上がる。</div><div class="sh-list">` + Object.keys(d.owned).map(k => {
        const g = d.gear[k] || 0, max = g >= GEAR_MAX, cost = gearCost(g);
        return `<div class="sh-row"><div class="sh-face">${avatarSVG(k)}</div><div class="sh-info"><b>${CHARS[k].name}</b><small>${GEAR_NAMES[k][g]}${max ? '（最強）' : ` → ${GEAR_NAMES[k][g + 1]}`}</small></div>
          <button class="btn small" data-buy="${k}" ${max || d.niboshi < cost ? 'disabled' : ''}>${max ? 'これ以上は無理' : `にぼし ${cost}`}</button></div>`;
      }).join('') + '</div>';
    } else if (kind === 'item') {
      body = `<div class="sh-list">
        <div class="sh-row"><div class="sh-icon">🌿</div><div class="sh-info"><b>またたびの小袋</b><small>初手技ポイントが満タンになる</small></div><button class="btn small" data-item="tp" ${d.niboshi < 60 || d.tp >= 5 ? 'disabled' : ''}>にぼし 60</button></div>
      </div>`;
    } else if (kind === 'fish') {
      body = `<div class="sh-list">
        <div class="sh-row"><div class="sh-icon">🐟</div><div class="sh-info"><b>焼き魚</b><small>冒険中のみんなのHPが全回復する</small></div><button class="btn small" data-item="fish" ${d.niboshi < 30 ? 'disabled' : ''}>にぼし 30</button></div>
      </div>`;
    } else if (kind === 'inn') {
      const ks = Object.keys(d.owned);
      const talks = [];
      for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) { const k = bondKey(ks[i], ks[j]); if (BOND_EVENTS[k] && bondLv(ks[i], ks[j]) >= 4) talks.push(k); }
      body = `<div class="sh-list">
        <div class="sh-row"><div class="sh-icon">🛏</div><div class="sh-info"><b>ひと晩休む</b><small>みんなのHPが全回復し、ちょっとだけ友情が深まる</small></div><button class="btn small" data-item="rest">休む（無料）</button></div>
        ${talks.map(k => { const [a, b] = k.split('|'); return `<div class="sh-row"><div class="sh-face">${avatarSVG(a)}</div><div class="sh-info"><b>夜のおしゃべり</b><small>${CHARS[a].name}と${CHARS[b].name}（友情Lv4）</small></div><button class="btn small" data-talk="${k}">聞く</button></div>`; }).join('')}
      </div>`;
    }
    o.innerHTML = `<div class="ov-box shop"><h2>${name}</h2>${body}<div class="sh-foot"><span class="c-item"><i class="ic-jade"></i>${fmt(d.niboshi)}</span><button class="btn gold" data-close>おしまい</button></div></div>`;
    o.classList.remove('hidden');
    o.querySelector('[data-close]').onclick = () => { Sfx.click(); o.classList.add('hidden'); close(); };
    o.querySelectorAll('[data-buy]').forEach(b => b.onclick = () => { const k = b.dataset.buy, g = d.gear[k] || 0; d.niboshi -= gearCost(g); d.gear[k] = g + 1; Save.save(); Sfx.brk(); Sfx.meow(k); field && field.toast(`${CHARS[k].name}の武器が「${GEAR_NAMES[k][g + 1]}」になった！`); draw(); });
    o.querySelectorAll('[data-item]').forEach(b => b.onclick = () => {
      const it = b.dataset.item;
      if (it === 'tp') { d.niboshi -= 60; d.tp = 5; field && field.toast('初手技ポイントが満タンになった'); }
      if (it === 'fish') { d.niboshi -= 30; if (field) { field.team.forEach(m => { m.hpRatio = 1; }); field.spawnFollowers(); field.toast('焼き魚をみんなで食べた。HPが全回復！'); } }
      if (it === 'rest') { if (field) { field.team.forEach(m => { m.hpRatio = 1; }); field.spawnFollowers(); } const ts = d.team; for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) addBond(ts[i], ts[j], 1); field && field.toast('ぐっすり眠った。みんなのHPが全回復！'); Sfx.heal(); }
      Save.save(); Sfx.select(); draw();
    });
    o.querySelectorAll('[data-talk]').forEach(b => b.onclick = () => { const k = b.dataset.talk; Save.data.bondSeen[k] = true; Save.save(); field.leave(() => App.go(DialogueScreen, BOND_EVENTS[k], () => App.go(FieldScreen))); });
  };
  draw();
}
