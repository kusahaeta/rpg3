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
      <span class="c-item" title="にぼし（お金）"><i class="ic-jade"></i>${fmt(d.niboshi)}</span>
      <span class="c-item" title="初手技ポイント（初手技に使う）"><i class="ic-tp"></i>${d.tp}/5</span>
    </div></div>`;
}
function wireBack(node, fn = () => App.go(FieldScreen)) { const b = node.querySelector('[data-back]'); if (b) b.onclick = () => { Sfx.click(); fn(); }; }

function charChip(key, extra = '') {
  const c = CHARS[key], o = Save.data.owned[key];
  return `<div class="chip r${c.rarity} ${extra}" data-key="${key}" style="--c:${c.color}">
    <div class="chip-face">${avatarSVG(key)}</div>
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
  s.onclick = () => { Sfx.init(); Sfx.meow('mike'); Music.play('village'); Story.resume(); };
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
      d.niboshi += nib;
      let html = `<div class="rw"><i class="ic-jade"></i>にぼし +${nib}${first ? '（はじめて）' : ''}</div>`;
      html += '<div class="rw-team">' + d.team.map(k => { const up = grantExp(k, exp); return `<div class="rw-mem">${avatarSVG(k)}<span>Lv.${d.owned[k].lv}${up ? `<b> ▲${up}</b>` : ''}</span></div>`; }).join('') + '</div>';
      Save.save();
      return html;
    },
    onExit: (res, act) => {
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
  const s = h(`<div class="screen team">${topBar('へんせい')}
    <div class="tm-slots"></div>
    <div class="tm-hint">枠を選んでから、下のにゃんこをクリック。先頭の子が、冒険でみんなを連れて歩きます。</div>
    <div class="tm-roster"></div></div>`);
  wireBack(s);
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
          <div class="tm-path">${PATHS[CHARS[t[i]].path].name}</div>` : '<div class="tm-empty">あき</div>'}
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
//  武器（なかま画面・武器屋で使う）
// ------------------------------------------------------------
function weaponIcon(id) {
  const w = WEAPONS[id], c = (w.look && w.look.c) || CHARS[w.owner].color, g = (w.look && w.look.g) || '#ffffff';
  return `<span class="wp-ic" style="--wc:${c};--wg:${g}">${WEAPON_GLYPH[CHARS[w.owner].gear.weapon]}</span>`;
}
const weaponTier = id => '★'.repeat(WEAPONS[id].tier + 1);
const weaponHint = id => { const g = WEAPONS[id].get || {}; return g.shop ? '武器屋で売っている' : g.chest ? `${FIELD_ZONES[g.chest[0]].mapName || FIELD_ZONES[g.chest[0]].name}の宝箱に眠っている` : ''; };
function weaponList(key) {
  const eq = equippedWeapon(key), kind = WEAPON_KIND[CHARS[key].gear.weapon];
  return `<div class="ck-wps"><div class="ck-wps-h"><b>武器（${kind}）</b><small>持っている${kind}を選ぶと、通常攻撃・戦闘スキル・必殺技が変わる</small></div>
    ${weaponsFor(key).map(id => hasWeapon(id)
      ? `<button class="wp-row ${id === eq ? 'on' : ''}" data-wp="${id}">${weaponIcon(id)}<span class="wp-info"><b>${weaponName(id)}</b><small>${WEAPONS[id].desc}</small></span><span class="wp-tier">${weaponTier(id)}</span><span class="wp-eq">${id === eq ? '装備中' : 'そうび'}</span></button>`
      : `<div class="wp-row locked"><span class="wp-ic">？</span><span class="wp-info"><b>？？？</b><small>${weaponHint(id)}</small></span><span class="wp-tier">${weaponTier(id)}</span></div>`).join('')}
  </div>`;
}

// ------------------------------------------------------------
//  なかま（ステータス・わざ）
// ------------------------------------------------------------
function CharScreen(sel) {
  const keys = Object.keys(CHARS).filter(k => Save.data.owned[k]);
  sel = sel && Save.data.owned[sel] ? sel : Save.data.team[0];
  const v3 = GFX.show('chars', () => new ShowcaseView(sel, { screenX: 470 }));
  if (v3 && (!v3.model || v3.model.key !== sel)) v3.setChar(sel);
  const c = charKit(sel), o = Save.data.owned[sel], col = c.color, wid = equippedWeapon(sel);
  const st = charStats(sel, o.lv, o.eid);
  const ab = (label, a) => `<div class="ck-ab"><div class="ck-ab-h"><span class="ck-kind">${label}</span>${abElems(a).map(el => elemIcon(el)).join('')}<b>${a.name}</b>${a.target ? `<span class="ck-tg">${{ single: '単体', blast: '拡散', aoe: '全体', bounce: 'バウンド', ally: '味方単体', allies: '味方全体', self: '自分' }[a.target]}</span>` : ''}</div><p>${a.desc}</p></div>`;
  const combos = COMBOS.filter(x => x.pair.includes(sel));
  const s = h(`<div class="screen chars">${topBar('なかま')}
    <div class="ck-list">${keys.map(k => charChip(k, k === sel ? 'on' : '')).join('')}</div>
    <div class="ck-art ${GFX.ok ? 'is3d' : ''}" style="--c:${col}">${GFX.ok ? '' : avatarSVG(sel)}</div>
    <div class="ck-info" style="--c:${col}">
      <div class="ck-head"><h2>${c.name}</h2><div class="ck-title">${c.title}</div>
        <div class="ck-tags"><span class="ck-path">役割：${PATHS[c.path].name}</span><span class="ck-eid">武器：${weaponName(wid)}</span></div></div>
      <div class="ck-lv"><b>Lv.${o.lv}</b><span>/80</span>
        <div class="bar exp"><i style="width:${o.lv >= 80 ? 100 : o.exp / expToNext(o.lv) * 100}%"></i></div>
        <div class="dim">${o.lv >= 80 ? 'レベル最大' : `次のレベルまで あと ${fmt(expToNext(o.lv) - o.exp)}`}</div></div>
      <div class="ck-stats">
        <div><span>HP</span><b>${fmt(st.maxHp)}</b></div><div><span>攻撃力</span><b>${fmt(st.atk)}</b></div>
        <div><span>防御力</span><b>${fmt(st.def)}</b></div><div><span>速度</span><b>${st.spd}</b></div>
        <div><span>会心率</span><b>${Math.round(st.crit * 100)}%</b></div><div><span>会心ダメージ</span><b>${Math.round(st.critDmg * 100)}%</b></div>
        <div><span>撃破特効</span><b>${Math.round(st.be * 100)}%</b></div><div><span>EP上限</span><b>${c.energyMax}</b></div>
      </div>
      ${weaponList(sel)}
      <div class="ck-abs">
        ${ab('通常攻撃', c.basic)}${ab('戦闘スキル', c.skill)}${ab(`必殺技（EP${c.energyMax}）`, c.ult)}
        ${ab('とくせい', c.talent)}${ab('初手技', c.technique)}
        ${combos.map(x => ab(`コンボ（${x.pair[1] === '*' ? 'みんなと' : CHARS[x.pair.find(p => p !== sel)].name + 'と'}・友情Lv3）`, x)).join('')}
      </div>
    </div></div>`);
  wireBack(s);
  on(s, '.ck-list .chip', 'click', el => App.go(CharScreen, el.dataset.key));
  on(s, '.wp-row[data-wp]', 'click', el => {
    if (el.dataset.wp === wid) return;
    equipWeapon(sel, el.dataset.wp); Sfx.select();
    App.go(CharScreen, sel); if (v3) v3.setChar(sel);
  });
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
  let shopTab = 'forge';
  const draw = () => {
    let body = '';
    if (kind === 'weapon') {
      const ks = Object.keys(d.owned).filter(k => CHARS[k]);
      const forge = ks.flatMap(k => weaponsFor(k).filter(hasWeapon)).map(id => {
        const w = WEAPONS[id], p = weaponPlus(id), max = p >= WEAPON_MAX, cost = weaponCost(id);
        return `<div class="sh-row">${weaponIcon(id)}<div class="sh-info"><b>${weaponName(id)}${max ? '' : ` → +${p + 1}`}</b><small>${CHARS[w.owner].name}の${WEAPON_KIND[CHARS[w.owner].gear.weapon]}${equippedWeapon(w.owner) === id ? '（装備中）' : ''}</small></div>
          <button class="btn small" data-forge="${id}" ${max || d.niboshi < cost ? 'disabled' : ''}>${max ? 'これ以上は無理' : `にぼし ${cost}`}</button></div>`;
      }).join('');
      const sale = ks.flatMap(k => weaponsFor(k).filter(id => !hasWeapon(id) && WEAPONS[id].get && WEAPONS[id].get.shop)).map(id => {
        const w = WEAPONS[id];
        return `<div class="sh-row">${weaponIcon(id)}<div class="sh-info"><b>${w.name}</b><small>${CHARS[w.owner].name}の${WEAPON_KIND[CHARS[w.owner].gear.weapon]}　${w.desc}</small></div>
          <button class="btn small" data-wbuy="${id}" ${d.niboshi < w.get.price ? 'disabled' : ''}>にぼし ${w.get.price}</button></div>`;
      }).join('');
      body = `<div class="sh-tabs"><button class="btn small ${shopTab === 'forge' ? 'gold' : ''}" data-tab="forge">鍛える</button><button class="btn small ${shopTab === 'buy' ? 'gold' : ''}" data-tab="buy">買う</button></div>`
        + (shopTab === 'forge'
          ? `<div class="dim">にぼしで武器を鍛えると（+1〜+${WEAPON_MAX}）、その武器を持ったときのHP・攻撃力・防御力が上がる。</div><div class="sh-list">${forge}</div>`
          : `<div class="dim">買った武器は「なかま」の画面で装備できる。武器を替えると、技がまるごと変わる。</div><div class="sh-list">${sale || '<div class="dim">いまは、売れる武器がないな。</div>'}</div>`);
    } else if (kind === 'item') {
      const goods = Object.keys(ITEMS).filter(id => !ITEMS[id].key).map(id => {
        const it = ITEMS[id], n = itemCount(id), full = n >= ITEM_MAX;
        return `<div class="sh-row"><div class="sh-icon">${it.icon}</div><div class="sh-info"><b>${it.name}<em class="sh-have">持っている数 ${n}</em></b><small>${it.desc}</small></div><button class="btn small" data-ibuy="${id}" ${full || d.niboshi < it.price ? 'disabled' : ''}>${full ? 'もう持てない' : `にぼし ${it.price}`}</button></div>`;
      }).join('');
      body = `<div class="dim">どうぐは、戦闘中に「どうぐ」（Rキー）で使える。ひとつにつき ${ITEM_MAX} こまで持てる。</div><div class="sh-list">
        ${goods}
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
    o.querySelectorAll('[data-tab]').forEach(b => b.onclick = () => { shopTab = b.dataset.tab; Sfx.select(); draw(); });
    o.querySelectorAll('[data-forge]').forEach(b => b.onclick = () => {
      const id = b.dataset.forge, k = WEAPONS[id].owner;
      d.niboshi -= weaponCost(id); d.weapons[id] = weaponPlus(id) + 1; Save.save(); Sfx.brk(); Sfx.meow(k);
      field && field.toast(`「${weaponName(id)}」になった！${weaponPlus(id) >= WEAPON_MAX ? '（武器が光りはじめた）' : ''}`);
      draw();
    });
    o.querySelectorAll('[data-wbuy]').forEach(b => b.onclick = () => {
      const id = b.dataset.wbuy, w = WEAPONS[id];
      d.niboshi -= w.get.price; gainWeapon(id); Save.save(); Sfx.win(); Sfx.meow(w.owner);
      field && field.toast(`「${w.name}」を買った！（なかまの画面で${CHARS[w.owner].name}に装備できる）`);
      draw();
    });
    o.querySelectorAll('[data-ibuy]').forEach(b => b.onclick = () => {
      const id = b.dataset.ibuy, it = ITEMS[id];
      d.niboshi -= it.price; d.items[id] = itemCount(id) + 1; Save.save(); Sfx.select();
      field && field.toast(`${it.icon} ${it.name}を買った！（持っている数 ${d.items[id]}）`);
      draw();
    });
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
