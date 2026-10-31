'use strict';
// ============================================================
//  画面：タイトル／へんせい／なかま／友情／お店
//  （おうちの画面はない。それぞれの画面へは探索のメニューから行き、戻ると探索の続きから）
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
      <span class="c-item" title="${Tx('にぼし（お金）')}"><i class="ic-jade"></i>${fmt(d.niboshi)}</span>
    </div></div>`;
}
function wireBack(node, fn = () => App.go(FieldScreen)) {
  const b = node.querySelector('[data-back]'); if (!b) return;
  b.onclick = () => { Sfx.click(); fn(); };
  // タッチのときは、となりの題（「なかま」など）を押しても戻る
  const t = node.querySelector('.topbar .tb-title'); if (t) t.onclick = () => { if (document.body.classList.contains('touch')) b.onclick(); };
}

function charChip(key, extra = '') {
  const c = CHARS[key], o = Save.data.owned[key];
  return `<div class="chip r${c.rarity} ${extra}" data-key="${key}" style="--c:${c.color}">
    <div class="chip-face">${avatarSVG(key)}</div>
    <div class="chip-name">${c.name}</div>
    ${o ? `<div class="chip-lv">Lv.${o.lv}</div>` : `<div class="chip-lv">${Tx('？？？')}</div>`}
  </div>`;
}

// ------------------------------------------------------------
//  タイトル
// ------------------------------------------------------------
function TitleScreen() {
  GFX.show('title', () => new TitleView());
  const s = h(`<div class="screen title">
    <div class="t-logo">
      <h1>${Tx('にゃんこ|ファンタジー').split('|').map(w => [...w].map(c => `<span>${c}</span>`).join('')).join('<br>')}</h1>
      <div class="t-name">${Tx('〜 流れ星のおちた丘から 〜')}</div>
    </div>
    <div class="t-start"><i></i>${Tx('<span class="pc-only">クリック</span><span class="touch-only">タップ</span>して はじめる')}<i></i></div>
    <div class="t-flash"></div>
    <div class="t-lang">${Object.entries(LANGS).map(([k, n]) => `<button class="${k === LANG ? 'on' : ''}" data-lang="${k}">${n}</button>`).join('')}</div>
  </div>`);
  s.querySelectorAll('[data-lang]').forEach(b => b.onclick = e => { e.stopPropagation(); if (b.dataset.lang !== LANG) { Sfx.click(); Lang.set(b.dataset.lang); } });
  // タイトルの曲。ブラウザでは最初のタップまで音が止められているので、そのときの最初のタップは曲を鳴らすだけにする
  Sfx.init(); Music.play('title');
  //   （音が出ないままでも、二度目のタップからははじまる）
  let wake = false, woke = false, going = false;
  s.addEventListener('pointerdown', () => { wake = !woke && !!Sfx.ctx && Sfx.ctx.state === 'suspended' && Music.on; });
  s.onclick = () => {
    Sfx.init();
    if (wake) { wake = false; woke = true; return; }
    if (going) return;
    // はじめる：文字がはねて、白い光につつまれてから、続きへ
    going = true; s.classList.add('leaving');
    // 曲は行き先の画面（探索・会話・戦闘）が決めるので、ここではタイトルの曲を消すだけ
    Sfx.meow('mike'); Music.stop();
    if (GFX.ok) GFX.flash('#fff6e4', 0.5, 0.7);
    setTimeout(() => Story.resume(), 650);
  };
  return s;
}

// 出番の少ない子（仲間が3匹以上で、ほかの子の1/3以下しか戦っていない）。探索のメニューで、すねてみせる
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
//  物語の戦い
// ------------------------------------------------------------
function allStages() { return CHAPTERS.flatMap((c, ci) => c.stages.map(s => ({ ...s, ci }))); }
// ひとつ前のステージをクリアすると開く。あとから台本にステージが加わっても、それより先をクリアしていれば開いている
function stageUnlocked(id) {
  const list = allStages(), i = list.findIndex(s => s.id === id);
  return i === 0 || list.slice(i - 1).some(s => Save.data.cleared[s.id]);
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
// after(res)：戦いを終えたあと（負けて「もどる」を選んだときも）
function startStage(ci, st, techs, after) {
  const first = !Save.data.cleared[st.id];
  const b = new Battle({
    team: battleTeam(st).map(carried), techs, bg: CHAPTERS[ci].bg, canRetry: true, loc: st.id, final: st.final || null,
    title: `${st.name}`,
    waves: st.waves.map(w => w.map(k => ({ key: k, lv: st.lv }))),
    onResult: res => {
      // 負けたら、探索でやられたときと同じく、みんな目を覚ます（やりなおしも元気な状態から）
      keepCarried(res.win ? res.team : res.team.map(t => ({ key: t.key, hpRatio: 1, energy: null }))); Save.save();
      if (!res.win) return `<div class="dim">${Tx('へんせいやレベルを見直してみよう。')}</div>`;
      const d = Save.data, exp = (80 + st.lv * 30) * st.waves.length, nib = (10 + st.lv * 3) * (first ? 3 : 1);
      d.cleared[st.id] = true;
      d.niboshi += nib;
      let html = `<div class="rw"><i class="ic-jade"></i>${Tx('にぼし +{0}', nib)}</div>`;
      html += '<div class="rw-team">' + d.team.map(k => { const up = grantExp(k, exp, st.lv); return `<div class="rw-mem">${avatarSVG(k)}<span>Lv.${d.owned[k].lv}${up ? `<b> ▲${up}</b>` : ''}</span></div>`; }).join('') + '</div>';
      Save.save();
      return html;
    },
    onExit: (res, act) => {
      if (res.retreat) { keepCarried(res.team); Save.save(); }
      if (act === 'retry') startStage(ci, st, [], after);
      else after(res);
    },
  });
  b.start();
}

// ------------------------------------------------------------
//  へんせい
// ------------------------------------------------------------
function TeamScreen() {
  let slot = 0;
  const v3 = GFX.show('scene:team', () => new SceneryView('meadow'));
  if (v3) v3.setEnemies([]);
  const s = h(`<div class="screen team">${topBar(Tx('へんせい'))}
    <div class="tm-slots"></div>
    <div class="tm-hint">${Tx('枠を選んでから、下のにゃんこを<span class="pc-only">クリック</span><span class="touch-only">タップ</span>。先頭の子が、冒険でみんなを連れて歩きます。')}</div>
    <div class="tm-roster"></div></div>`);
  wireBack(s);
  // 物語の都合で一行を離れている子（awayNow）は、枠をとったまま動かせない
  const away = awayNow(), isAway = k => away.includes(k);
  const free = i => !isAway(Save.data.team[i]);
  if (!free(slot)) slot = [0, 1, 2, 3].find(free);
  // 探索で戦闘不能の子（宿・焼き魚で回復するまで）。全員が戦闘不能になる編成はできない
  const isDown = k => (Save.data.hp || {})[k] <= 0;
  const canForm = team => team.some(k => k && !isAway(k) && !isDown(k));
  const hint = s.querySelector('.tm-hint'), hintText = hint.innerHTML;
  const refuse = () => { hint.textContent = Tx('みんな戦闘不能になってしまう。元気な子を一匹は入れておこう。'); hint.classList.add('warn'); };
  const unrefuse = () => { hint.innerHTML = hintText; hint.classList.remove('warn'); };
  const render = () => {
    const t = Save.data.team, lead = t.findIndex(k => !isAway(k));
    s.querySelector('.tm-slots').innerHTML = [0, 1, 2, 3].map(i => isAway(t[i]) ? `
      <div class="tm-slot away">
        ${charChip(t[i], 'big')}
        <div class="tm-path">${Tx('いまは一行を離れている')}</div>
      </div>` : `
      <div class="tm-slot ${i === slot ? 'on' : ''}" data-slot="${i}">
        <div class="tm-no">${i === lead ? Tx('先頭') : i + 1}</div>
        ${t[i] ? charChip(t[i], 'big' + (isDown(t[i]) ? ' down' : '')) + `<button class="tm-x" data-x="${i}">×</button>
          <div class="tm-path">${PATHS[CHARS[t[i]].path].name}</div>` : `<div class="tm-empty">${Tx('あき')}</div>`}
      </div>`).join('');
    s.querySelector('.tm-roster').innerHTML = Object.keys(CHARS).filter(k => Save.data.owned[k]).map(k => charChip(k, isAway(k) ? 'away' : (t.includes(k) ? 'inteam' : '') + (isDown(k) ? ' down' : ''))).join('');
    on(s, '[data-slot]', 'click', (el, e) => {
      if (e.target.closest('[data-x]')) {
        const i = +e.target.closest('[data-x]').dataset.x, next = Save.data.team.filter((k, j) => j !== i);
        if (!canForm(next)) refuse();
        else if (Save.data.team.filter(k => k && !isAway(k)).length > 1) { Save.data.team = next; Save.save(); unrefuse(); }
        slot = Math.min(slot, Save.data.team.length); if (!free(slot)) slot = [0, 1, 2, 3].find(free); render(); return; }
      slot = +el.dataset.slot; render();
    });
    on(s, '.tm-roster .chip', 'click', el => {
      const k = el.dataset.key; if (isAway(k)) return;
      const team = [...Save.data.team], at = team.indexOf(k), target = Math.min(slot, team.length);
      if (at >= 0) { if (team[target]) { team[at] = team[target]; team[target] = k; } } else team[target] = k;
      if (!canForm(team)) { refuse(); return; }
      unrefuse();
      Save.data.team = team.filter(Boolean); Save.save(); Sfx.meow(k);
      slot = Math.min(3, Math.min(target + 1, Save.data.team.length)); if (!free(slot)) slot = [0, 1, 2, 3].find(free); render();
    });
  };
  render();
  return s;
}

// ------------------------------------------------------------
//  武器（なかま画面・武器屋で使う）
// ------------------------------------------------------------
function weaponIcon(id) {
  const w = WEAPONS[id], c = (w.look && w.look.c) || CHARS[w.owner].color, g = (w.look && w.look.g) || '#ffffff';
  const kind = CHARS[w.owner].gear.weapon;
  return `<span class="wp-ic" style="--wc:${c};--wg:${g}">${LANG === 'ja' ? WEAPON_GLYPH[kind] : WEAPON_KIND[kind][0]}</span>`;
}
const weaponTier = id => '★'.repeat(WEAPONS[id].tier + 1);
// 宝箱の武器は、場所の名前がネタバレになるので、何章で手に入るかだけを出す（章の副題も出さない）
const weaponHint = id => { const g = WEAPONS[id].get || {}; return g.shop ? Tx('武器屋で売っている') : g.chest ? Tx('{0}の宝箱に眠っている', STORY[FIELD_ZONES[g.chest[0]].ci].title.split('　')[0]) : ''; };
// 武器の行：持っている武器には、その武器の技の名前と、持ちかえたときの HP・攻撃力・防御力の増減も出す
function weaponList(key) {
  const eq = equippedWeapon(key), kind = WEAPON_KIND[CHARS[key].gear.weapon], o = Save.data.owned[key];
  const now = charStats(key, o.lv, o.eid);
  const techs = id => { const w = WEAPONS[id].start ? CHARS[key] : WEAPONS[id]; return [w.basic, w.skill, w.ult].map(a => a.name).join(Tx('・')); };
  const diff = id => {
    const st = charStats(key, o.lv, o.eid, id);
    return [['HP', 'maxHp'], [Tx('攻撃力'), 'atk'], [Tx('防御力'), 'def']].map(([n, k]) => [n, Math.round(st[k]) - Math.round(now[k])])
      .filter(([, d]) => d).map(([n, d]) => `<span class="${d > 0 ? 'up' : 'down'}">${n} ${d > 0 ? '+' : '−'}${fmt(Math.abs(d))}</span>`).join('');
  };
  return `<div class="ck-wps"><div class="ck-wps-h"><b>${Tx('武器（{0}）', kind)}</b><small>${Tx('武器を替えると、通常攻撃・戦闘スキル・必殺技が変わる')}</small></div>
    ${weaponsFor(key).map(id => hasWeapon(id)
      ? `<button class="wp-row ${id === eq ? 'on' : ''}" data-wp="${id}">${weaponIcon(id)}<span class="wp-info"><b>${weaponName(id)}</b><small>${WEAPONS[id].desc}</small>
          <span class="wp-techs">${Tx('技：{0}', techs(id))}</span>${id === eq ? '' : `<span class="wp-diff">${diff(id) || `<span>${Tx('力は変わらない')}</span>`}</span>`}</span>
          <span class="wp-side"><span class="wp-tier">${weaponTier(id)}</span><span class="wp-eq">${id === eq ? Tx('装備中') : Tx('そうび')}</span></span></button>`
      : `<div class="wp-row locked"><span class="wp-ic">${Tx('？')}</span><span class="wp-info"><b>${Tx('？？？')}</b><small>${weaponHint(id)}</small></span><span class="wp-side"><span class="wp-tier">${weaponTier(id)}</span></span></div>`).join('')}
  </div>`;
}

// ------------------------------------------------------------
//  なかま（ステータス・わざ）
//  右側は「ステータス」（力と武器）と「わざ」のタブ。タブは子を替えても、そのまま
//  ←→ キーでも子を替えられる
// ------------------------------------------------------------
let charTab = 'stat';
const TARGET_NAME = { single: '単体', blast: '拡散', aoe: '全体', bounce: 'バウンド', ally: '味方単体', allies: '味方全体', self: '自分' };
function CharScreen(sel) {
  const keys = Object.keys(CHARS).filter(k => Save.data.owned[k]);
  sel = sel && Save.data.owned[sel] ? sel : Save.data.team[0];
  const v3 = GFX.show('chars', () => new ShowcaseView(sel, { screenX: 470 }));
  if (v3 && (!v3.model || v3.model.key !== sel)) v3.setChar(sel);
  const c = charKit(sel), o = Save.data.owned[sel], col = c.color, wid = equippedWeapon(sel);
  const st = charStats(sel, o.lv, o.eid);
  const ab = (label, a) => `<div class="ck-ab"><div class="ck-ab-h"><span class="ck-kind">${label}</span>${abElems(a).map(el => elemIcon(el)).join('')}<b>${a.name}</b>${a.target ? `<span class="ck-tg">${TARGET_NAME[a.target]}</span>` : ''}</div><p>${a.desc}</p></div>`;
  // 覚えたコンボだけ（相手と友情Lv3。「みんなと」は友情Lv3の仲間が2匹以上いれば、組み方しだいで戦闘で使える）
  const learned = ([a, b]) => b === '*' ? keys.filter(k => k !== a && bondLv(a, k) >= 3).length >= 2 : bondLv(a, b) >= 3;
  const combos = COMBOS.filter(x => x.pair.includes(sel) && learned(x.pair));
  const max = o.lv >= 80;
  const s = h(`<div class="screen chars">${topBar(Tx('なかま'))}
    <div class="ck-list">${keys.map(k => charChip(k, (k === sel ? 'on ' : '') + (Save.data.team.includes(k) ? 'inteam' : ''))).join('')}</div>
    <div class="ck-art ${GFX.ok ? 'is3d' : ''}" style="--c:${col}">${GFX.ok ? '' : avatarSVG(sel)}</div>
    ${keys.length > 1 ? `<button class="ck-nav prev" data-nav="-1" title="${Tx('前の子（←）')}">‹</button><button class="ck-nav next" data-nav="1" title="${Tx('次の子（→）')}">›</button>` : ''}
    <div class="ck-info" style="--c:${col}">
      <div class="ck-head"><h2>${c.name}</h2><div class="ck-title">${c.title}</div>
        <div class="ck-tags"><span class="ck-path">${Tx('役割：{0}', PATHS[c.path].name)}</span><span class="ck-eid">${Tx('武器：{0}', weaponName(wid))}</span></div></div>
      <div class="ck-lv"><div class="ck-lv-n"><b>Lv.${o.lv}</b><span>/80</span><small>${max ? Tx('レベル最大') : Tx('次のレベルまで あと {0}', fmt(expToNext(o.lv) - o.exp))}</small></div>
        <div class="bar exp"><i style="width:${max ? 100 : o.exp / expToNext(o.lv) * 100}%"></i></div></div>
      <div class="ck-tabs"><button data-tab="stat">${Tx('ステータス・武器')}</button><button data-tab="abs">${Tx('わざ')}</button></div>
      <div class="ck-pane" data-pane="stat">
        <div class="ck-stats">
          <div><span>HP</span><b>${fmt(st.maxHp)}</b></div><div><span>${Tx('攻撃力')}</span><b>${fmt(st.atk)}</b></div>
          <div><span>${Tx('防御力')}</span><b>${fmt(st.def)}</b></div><div><span>${Tx('速度')}</span><b>${st.spd}</b></div>
          <div><span>${Tx('会心率')}</span><b>${Math.round(st.crit * 100)}%</b></div><div><span>${Tx('会心ダメージ')}</span><b>${Math.round(st.critDmg * 100)}%</b></div>
        </div>
        ${weaponList(sel)}
      </div>
      <div class="ck-pane ck-abs" data-pane="abs">
        ${ab(Tx('通常攻撃'), c.basic)}${ab(Tx('戦闘スキル'), c.skill)}${ab(Tx('必殺技'), c.ult)}
        ${ab(Tx('とくせい'), c.talent)}${ab(Tx('初手技'), c.technique)}
        ${combos.map(x => ab(x.pair[1] === '*' ? Tx('コンボ（みんなと・友情Lv3）') : Tx('コンボ（{0}と・友情Lv3）', CHARS[x.pair.find(p => p !== sel)].name), x)).join('')}
      </div>
    </div></div>`);
  const showTab = t => {
    charTab = t;
    s.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    s.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== t));
  };
  showTab(charTab);
  wireBack(s);
  on(s, '[data-tab]', 'click', el => showTab(el.dataset.tab));
  on(s, '.ck-list .chip', 'click', el => App.go(CharScreen, el.dataset.key));
  on(s, '[data-nav]', 'click', el => App.go(CharScreen, keys[(keys.indexOf(sel) + +el.dataset.nav + keys.length) % keys.length]));
  on(s, '.wp-row[data-wp]', 'click', el => {
    if (el.dataset.wp === wid) return;
    equipWeapon(sel, el.dataset.wp); Sfx.select();
    App.go(CharScreen, sel); if (v3) v3.setChar(sel);
  });
  if (v3) v3.bindDrag(s.querySelector('.ck-art'));
  return s;
}
document.addEventListener('keydown', e => {
  if (e.repeat || (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight')) return;
  const b = App.el && App.el.querySelector(`.screen.chars [data-nav="${e.key === 'ArrowLeft' ? -1 : 1}"]`);
  if (b) b.click();
});

// ------------------------------------------------------------
//  友情：2匹の組み合わせごとの友情レベルと、特別イベント
// ------------------------------------------------------------
// 見た特別イベントの記録：Lv4 は組み合わせの名前のまま（前からのセーブと同じ）、Lv5 は「組み合わせ#5」
const bondSeenKey = (k, n) => +n === 4 ? k : `${k}#${n}`;
function BondScreen() {
  const v3 = GFX.show('scene:bond', () => new SceneryView('meadow'));
  if (v3) v3.setEnemies([]);
  const ks = Object.keys(CHARS).filter(k => Save.data.owned[k]);
  const pairs = []; for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++) pairs.push([ks[i], ks[j]]);
  const s = h(`<div class="screen bondscr">${topBar(Tx('友情'))}
    <div class="bd-intro">${Tx('友情は「一緒に旅をした時間」。一緒に戦ったり、話したり、物語を進めると深まります。<br>Lv2：戦闘中の掛け合い　Lv3：コンボスキル　Lv4・Lv5：特別イベント')}</div>
    <div class="bd-list">${pairs.length ? pairs.map(([a, b]) => {
      const lv = bondLv(a, b), p = bondPts(a, b), nx = BOND_LV[lv] ?? null, pr = nx ? (p - BOND_LV[lv - 1]) / (nx - BOND_LV[lv - 1]) : 1;
      const k = bondKey(a, b), ev = BOND_EVENTS[k];
      const combo = COMBOS.find(c => c.pair.join('|') === bondKey(a, b) || (c.pair[0] === b && c.pair[1] === a));
      return `<div class="bd-pair">
        <div class="bd-faces"><div>${avatarSVG(a)}</div><div>${avatarSVG(b)}</div></div>
        <div class="bd-info"><b>${CHARS[a].name} × ${CHARS[b].name}</b><small>${BOND_TAGS[bondKey(a, b)] || ''}</small>
          <div class="bd-hearts">${[1, 2, 3, 4, 5].map(i => `<i class="${i <= lv ? 'on' : ''}">♥</i>`).join('')}<span>Lv.${lv}</span></div>
          <div class="bar bondbar"><i style="width:${pr * 100}%"></i></div>
          <div class="bd-perks">${combo ? `<span class="${lv >= 3 ? 'on' : ''}">${Tx('コンボ「{0}」', combo.name)}</span>` : ''}${ev ? Object.keys(BOND_EVENT_LV).map(n => { const seen = Save.data.bondSeen[bondSeenKey(k, n)], ok = lv >= n;
            return `<button class="btn small ${ok ? '' : 'dis'}" data-ev="${k}" data-lv="${n}" ${ok ? '' : 'disabled'}>${seen ? Tx('♥ もう一度見る（Lv{0}）', n) : ok ? Tx('♥ 特別イベント（Lv{0}）', n) : Tx('特別イベント（Lv{0}）', n)}</button>`; }).join('') : ''}</div>
        </div></div>`;
    }).join('') : `<div class="dim">${Tx('仲間がふえると、ここに友情が記録されます。')}</div>`}</div></div>`);
  wireBack(s);
  on(s, '[data-ev]', 'click', el => { const k = el.dataset.ev, n = el.dataset.lv; Save.data.bondSeen[bondSeenKey(k, n)] = true; Save.save(); App.go(DialogueScreen, BOND_EVENTS[k] + BOND_EVENT_LV[n], () => App.go(BondScreen)); });
  return s;
}

// ------------------------------------------------------------
//  お店（フィールドの住人から）
// ------------------------------------------------------------
const SHOP_NAMES = { weapon: '武器を鍛える', item: '道具屋', inn: 'ひと休み', fish: '魚屋' };
function renderShop(o, kind, name, close, field) {
  const d = Save.data;
  let shopTab = 'forge';
  const draw = (keepScroll = true) => {
    // 鍛える・買うたびに作り直すので、一覧のスクロール位置を引きつぐ
    const prevList = o.querySelector('.ov-box.shop .sh-list'), scroll = keepScroll && prevList ? prevList.scrollTop : 0;
    let body = '';
    if (kind === 'weapon') {
      const ks = Object.keys(d.owned).filter(k => CHARS[k]);
      const forge = ks.flatMap(k => weaponsFor(k).filter(hasWeapon)).map(id => {
        const w = WEAPONS[id], p = weaponPlus(id), max = p >= WEAPON_MAX, cost = weaponCost(id);
        return `<div class="sh-row">${weaponIcon(id)}<div class="sh-info"><b>${weaponName(id)}${max ? '' : ` → +${p + 1}`}</b><small>${Tx('{0}の{1}', CHARS[w.owner].name, WEAPON_KIND[CHARS[w.owner].gear.weapon])}${equippedWeapon(w.owner) === id ? Tx('（装備中）') : ''}</small></div>
          <button class="btn small" data-forge="${id}" ${max || d.niboshi < cost ? 'disabled' : ''}>${max ? Tx('これ以上は無理') : Tx('にぼし {0}', cost)}</button></div>`;
      }).join('');
      const sale = ks.flatMap(k => weaponsFor(k).filter(id => !hasWeapon(id) && WEAPONS[id].get && WEAPONS[id].get.shop)).map(id => {
        const w = WEAPONS[id];
        return `<div class="sh-row">${weaponIcon(id)}<div class="sh-info"><b>${w.name}</b><small>${Tx('{0}の{1}', CHARS[w.owner].name, WEAPON_KIND[CHARS[w.owner].gear.weapon])}　${w.desc}</small></div>
          <button class="btn small" data-wbuy="${id}" ${d.niboshi < w.get.price ? 'disabled' : ''}>${Tx('にぼし {0}', w.get.price)}</button></div>`;
      }).join('');
      body = `<div class="sh-tabs"><button class="btn small ${shopTab === 'forge' ? 'gold' : ''}" data-tab="forge">${Tx('鍛える')}</button><button class="btn small ${shopTab === 'buy' ? 'gold' : ''}" data-tab="buy">${Tx('買う')}</button></div>`
        + (shopTab === 'forge'
          ? `<div class="dim">${Tx('にぼしで武器を鍛えると（+1〜+{0}）、その武器を持ったときのHP・攻撃力・防御力が上がる。', WEAPON_MAX)}</div><div class="sh-list">${forge}</div>`
          : `<div class="dim">${Tx('買った武器は「なかま」の画面で装備できる。武器を替えると、技がまるごと変わる。')}</div><div class="sh-list">${sale || `<div class="dim">${Tx('いまは、売れる武器がないな。')}</div>`}</div>`);
    } else if (kind === 'item') {
      const goods = Object.keys(ITEMS).filter(id => !ITEMS[id].key && !ITEMS[id].rare).map(id => {
        const it = ITEMS[id], n = itemCount(id), full = n >= ITEM_MAX;
        return `<div class="sh-row"><div class="sh-icon">${it.icon}</div><div class="sh-info"><b>${it.name}<em class="sh-have">${Tx('持っている数 {0}', n)}</em></b><small>${it.desc}</small></div><button class="btn small" data-ibuy="${id}" ${full || d.niboshi < it.price ? 'disabled' : ''}>${full ? Tx('もう持てない') : Tx('にぼし {0}', it.price)}</button></div>`;
      }).join('');
      body = `<div class="dim">${Tx('どうぐは、戦闘中に「どうぐ」<span class="pc-only">（Rキー）</span>で使える。ひとつにつき {0} こまで持てる。', ITEM_MAX)}</div><div class="sh-list">
        ${goods}
      </div>`;
    } else if (kind === 'fish') {
      body = `<div class="sh-list">
        <div class="sh-row"><div class="sh-icon">🐟</div><div class="sh-info"><b>${Tx('焼き魚')}</b><small>${Tx('冒険中のみんなのHPが全回復する')}</small></div><button class="btn small" data-item="fish" ${d.niboshi < 30 ? 'disabled' : ''}>${Tx('にぼし {0}', 30)}</button></div>
      </div>`;
    } else if (kind === 'inn') {
      body = `<div class="sh-list">
        <div class="sh-row"><div class="sh-icon">🛏</div><div class="sh-info"><b>${Tx('ひと晩休む')}</b><small>${Tx('みんなのHPが全回復し、ちょっとだけ友情が深まる')}</small></div><button class="btn small" data-item="rest">${Tx('休む（無料）')}</button></div>
      </div>`;
    }
    o.innerHTML = `<div class="ov-box shop"><h2>${name}</h2>${body}<div class="sh-foot"><span class="c-item"><i class="ic-jade"></i>${fmt(d.niboshi)}</span><button class="btn gold" data-close>${Tx('閉じる')}</button></div></div>`;
    o.classList.remove('hidden');
    const list = o.querySelector('.sh-list'); if (list) list.scrollTop = scroll;
    o.querySelector('[data-close]').onclick = () => { Sfx.click(); o.classList.add('hidden'); close(); };
    o.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { shopTab = b.dataset.tab; Sfx.select(); draw(false); });
    o.querySelectorAll('[data-forge]').forEach(b => b.onclick = () => {
      const id = b.dataset.forge, k = WEAPONS[id].owner;
      d.niboshi -= weaponCost(id); d.weapons[id] = weaponPlus(id) + 1; Save.save(); Sfx.brk(); Sfx.meow(k);
      field && field.toast(Tx('「{0}」になった！', weaponName(id)) + (weaponPlus(id) >= WEAPON_MAX ? Tx('（武器が光りはじめた）') : ''));
      draw();
    });
    o.querySelectorAll('[data-wbuy]').forEach(b => b.onclick = () => {
      const id = b.dataset.wbuy, w = WEAPONS[id];
      d.niboshi -= w.get.price; gainWeapon(id); Save.save(); Sfx.win(); Sfx.meow(w.owner);
      field && field.toast(Tx('「{0}」を買った！（なかまの画面で{1}に装備できる）', w.name, CHARS[w.owner].name));
      draw();
    });
    o.querySelectorAll('[data-ibuy]').forEach(b => b.onclick = () => {
      const id = b.dataset.ibuy, it = ITEMS[id];
      d.niboshi -= it.price; d.items[id] = itemCount(id) + 1; Save.save(); Sfx.select();
      field && field.toast(Tx('{0} {1}を買った！（持っている数 {2}）', it.icon, it.name, d.items[id]));
      draw();
    });
    o.querySelectorAll('[data-item]').forEach(b => b.onclick = () => {
      const it = b.dataset.item;
      if (it === 'fish') { d.niboshi -= 30; if (field) { field.team.forEach(m => { m.hpRatio = 1; }); field.s.keep(); field.spawnFollowers(); field.toast(Tx('焼き魚をみんなで食べた。HPが全回復！')); } }
      if (it === 'rest') { if (field) { field.team.forEach(m => { m.hpRatio = 1; }); field.s.keep(); field.spawnFollowers(); } const ts = d.team; for (let i = 0; i < ts.length; i++) for (let j = i + 1; j < ts.length; j++) addBond(ts[i], ts[j], 1); field && field.toast(Tx('ぐっすり眠った。みんなのHPが全回復！')); Sfx.heal(); }
      Save.save(); Sfx.select(); draw();
    });
  };
  draw(false);
}
