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

// 上の帯：戻るボタンと題（へんせい・友情。にぼしの表示は使わないので出さない）
function topBar(title, back = true) {
  return `<div class="topbar">
    ${back ? '<button class="back" data-back>‹</button>' : ''}
    <div class="tb-title">${title}</div></div>`;
}
function wireBack(node, fn = () => App.go(FieldScreen)) {
  const b = node.querySelector('[data-back]'); if (!b) return;
  b.onclick = () => { Sfx.click(); fn(); };
  // タッチのときは、となりの題（「なかま」など）を押しても戻る
  const t = node.querySelector('.tb-title'); if (t) t.onclick = () => { if (document.body.classList.contains('touch')) b.onclick(); };
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
//  へんせい専用の景色（TEAM_BG）に、一行が横一列に並んで立つ（TeamView。左が先頭）。足もとに名札、下に「ひかえ」の子の顔。
//  子を選んでから相手を選ぶと入れかわる（ならびの子どうしなら場所を、ひかえの子ならメンバーを）。ひかえの子は、あきがあればそのまま入る。
//  選んだ子の名札の下に「先頭にする」「ひかえへ」。右上には、この編成で使えるコンボ（友情Lv3）の技名（ないときは出さない）。
//  3D が使えないときは、景色の一枚絵を CSS で敷き、名札の上に顔の絵を出す
// ------------------------------------------------------------
function TeamScreen() {
  const d = Save.data;
  const v3 = GFX.show('team', () => new TeamView());
  const s = h(`<div class="screen team">
    ${GFX.ok ? '' : `<div class="tm-bg" style="background-image:url(${TEAM_BG.url})"></div>`}<div class="ck-top"><button class="back" data-back>‹</button><div class="tb-title">${Tx('へんせい')}</div></div>
    <div class="tm-say"></div><div class="tm-combo"></div><div class="tm-row"></div><div class="tm-bench"></div></div>`);
  wireBack(s);
  // 物語の都合で一行を離れている子（awayNow）は、枠をとったまま動かせない。探索で戦闘不能の子（宿・焼き魚で回復するまで）もいる
  const away = awayNow(), isAway = k => away.includes(k), isDown = k => (d.hp || {})[k] <= 0;
  const canForm = team => team.some(k => k && !isAway(k) && !isDown(k));   // 全員が戦闘不能になる編成はできない
  const owned = Object.keys(CHARS).filter(k => d.owned[k]);
  let sel = null, warn = '', first = true;   // sel：{ slot: 枠 } か { bench: 子 }
  const apply = (team, k) => {
    team = team.filter(Boolean);
    if (!canForm(team)) { warn = Tx('みんな戦闘不能になってしまう。元気な子を一匹は入れておこう。'); render(); return; }
    d.team = team; Save.save(); sel = null; warn = ''; if (k) Sfx.meow(k); render();
  };
  const leadAt = () => d.team.findIndex(k => !isAway(k));
  const pickSlot = i => {
    const t = [...d.team];
    if (t[i] && isAway(t[i])) return;
    if (sel && sel.bench) { t[Math.min(i, t.length)] = sel.bench; return apply(t, sel.bench); }   // ひかえの子を、この枠へ
    if (sel && sel.slot != null && sel.slot !== i) { const j = sel.slot; [t[i], t[j]] = [t[j], t[i]]; return apply(t, t[j] || t[i]); }   // ならびの子どうし（あきの枠へは、いちばん後ろへ）
    sel = sel && sel.slot === i ? null : { slot: i }; warn = ''; render();
  };
  const pickBench = k => {
    if (isAway(k)) return;
    const t = [...d.team];
    if (sel && sel.slot != null) { t[Math.min(sel.slot, t.length)] = k; return apply(t, k); }
    if (t.length < 4) { t.push(k); return apply(t, k); }
    sel = sel && sel.bench === k ? null : { bench: k }; warn = ''; render();
  };
  const render = () => {
    const t = d.team, lead = leadAt(), here = t.filter(k => !isAway(k));
    s.querySelector('.tm-row').innerHTML = [0, 1, 2, 3].map(i => {
      const k = t[i], on = sel && sel.slot === i ? ' on' : '', col = `left:${TEAM_SLOT_X[i]}px`;
      if (!k) return `<div class="tm-col" style="${col}"><button class="tm-hit" data-slot="${i}"></button>
        <button class="tm-plate empty${on}" data-slot="${i}"><span class="tm-no">${i + 1}</span><span class="tm-empty">${Tx('あき')}</span></button></div>`;
      const c = charKit(k), o = d.owned[k], art = GFX.ok ? '' : avatarSVG(k);
      if (isAway(k)) return `<div class="tm-col away" style="${col};--c:${c.color}"><div class="tm-hit">${art}</div>
        <div class="tm-plate"><span class="tm-name"><b>${c.name}</b><small>Lv.${o.lv}</small></span><span class="tm-away">${Tx('いまは一行を離れている')}</span></div></div>`;
      const els = [...new Set([c.basic, c.skill, c.ult].flatMap(abElems))], hp = Math.max(0, Math.min(1, (d.hp || {})[k] ?? 1));
      return `<div class="tm-col" style="${col};--c:${c.color}">
        <button class="tm-hit" data-slot="${i}">${art}</button>
        <button class="tm-plate${on}${isDown(k) ? ' down' : ''}" data-slot="${i}">
          <span class="tm-no${i === lead ? ' lead' : ''}">${i === lead ? Tx('先頭') : i + 1}</span>
          <span class="tm-name"><b>${c.name}</b><small>Lv.${o.lv}</small></span>
          <span class="tm-role"><span class="tm-path">${PATHS[c.path].name}</span>${els.map(e => elemIcon(e)).join('')}</span>
          ${isDown(k) ? `<span class="tm-ko">${Tx('戦闘不能')}</span>` : `<span class="bar"><i style="width:${hp * 100}%"></i></span>`}
        </button>
        ${on ? `<div class="tm-acts">${i !== lead ? `<button data-lead="${i}">${Tx('先頭にする')}</button>` : ''}${here.length > 1 ? `<button data-out="${i}">${Tx('ひかえへ')}</button>` : ''}</div>` : ''}
      </div>`;
    }).join('');
    // ひかえ：編成にいない子。出番の少ない子は、ふきだしで すねてみせる
    const bench = owned.filter(k => !t.includes(k)), pout = sulkyCat();
    s.querySelector('.tm-bench').innerHTML = `<span class="tm-bench-h">${Tx('ひかえ')}</span>` + (bench.length
      ? bench.map(k => `<button class="tm-bf${sel && sel.bench === k ? ' on' : ''}${isDown(k) ? ' down' : ''}${isAway(k) ? ' away' : ''}" data-bench="${k}" style="--c:${CHARS[k].color}">
          <span class="tm-bf-img">${avatarSVG(k)}</span><span class="tm-bf-name"><b>${CHARS[k].name}</b><small>Lv.${d.owned[k].lv}</small></span></button>`).join('')
        + (pout && bench.includes(pout.k) ? `<div class="tm-pout" style="--c:${CHARS[pout.k].color}"><b>${CHARS[pout.k].name}</b>${pout.line}</div>` : '')
      : `<span class="tm-bench-none">${Tx('ひかえの子はいない')}</span>`);
    // この編成で使えるコンボ（戦闘と同じ決まり。いま戦闘不能の子も、回復すれば使えるので数える）
    const combos = teamCombos(here);
    //   使えるコンボがなければ、板ごと出さない
    s.querySelector('.tm-combo').innerHTML = combos.length ? `<div class="tm-combo-h">${Tx('この編成のコンボ')}</div>`
      + combos.map(c => `<div class="tm-cb"><span class="tm-cb-faces">${(c.pair[1] === '*' ? [c.pair[0]] : c.pair).map(k => `<i>${avatarSVG(k)}</i>`).join('')}</span><b>${c.name}</b></div>`).join('') : '';
    // 上の一行：いま何をすればよいか
    const say = s.querySelector('.tm-say'), selKey = sel && (sel.bench || t[sel.slot]);
    say.classList.toggle('warn', !!warn);
    say.textContent = warn || (sel && sel.bench ? Tx('{0}と入れかわる子を選んでね', CHARS[sel.bench].name)
      : selKey ? Tx('{0}と入れかえる子を選んでね（ならび・ひかえ）', CHARS[selKey].name)
      : sel ? Tx('ひかえの子を選ぶと、ここに入る')
      : Tx('にゃんこをえらんでから相手をえらぶと、入れかわる'));
    on(s, '[data-slot]', 'click', el => pickSlot(+el.dataset.slot));
    on(s, '[data-bench]', 'click', el => pickBench(el.dataset.bench));
    on(s, '[data-lead]', 'click', el => { const i = +el.dataset.lead, t = [...d.team], [k] = t.splice(i, 1); t.splice(leadAt(), 0, k); apply(t, k); });
    on(s, '[data-out]', 'click', el => { const t = [...d.team], [k] = t.splice(+el.dataset.out, 1); apply(t, k); });
    if (v3) {
      v3.setTeam(t.map((k, i) => ({ key: k, slot: i, down: isDown(k) })).filter(m => !isAway(m.key)), first);
      v3.select(selKey && !sel.bench ? selKey : null);
    }
    first = false;
  };
  // 何もないところを押すと、選ぶのをやめる
  s.addEventListener('click', e => { if (sel && !e.target.closest('button')) { sel = null; warn = ''; render(); } });
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

// おしゃれの枠ごとの選びかた（なかまの画面）：いつもの（その枠にいつものものがなければ「なし」）・はずす・買ったもの
// 第二章までは王国のおしゃれ屋に行けないので、第三章から買えると出す
function outfitList(key) {
  const open = outfitShopOpen();
  return `<div class="ck-fits"><div class="ck-wps-h"><b>${Tx('おしゃれ')}</b><small>${Tx('見た目だけで、力は変わらない。おしゃれ屋で買うと、だれでも着られる')}</small></div>
    ${open ? '' : `<div class="fit-soon">${Tx('第3章からニャハハ王国のおしゃれ屋で買えるようになる')}</div>`}
    ${OUTFIT_SLOTS.map(slot => {
      const cur = outfitOf(key, slot) || '', def = outfitHasDefault(key, slot);
      const owned = Object.keys(OUTFITS).filter(id => OUTFITS[id].slot === slot && hasOutfit(id));
      const opts = [['', def ? Tx('いつもの') : Tx('なし')], ...(def ? [['none', Tx('はずす')]] : []), ...owned.map(id => [id, `<i>${OUTFITS[id].icon}</i>${OUTFITS[id].name}`])];
      return `<div class="fit-slot"><span class="fit-h">${OUTFIT_SLOT_NAME[slot]}</span><div class="fit-opts">${opts.map(([v, n]) => `<button class="fit-op ${v === cur ? 'on' : ''}" data-fit="${slot}" data-v="${v}">${n}</button>`).join('')}
        ${owned.length || !open ? '' : `<small class="fit-none">${Tx('おしゃれ屋で買うと、ここで選べる')}</small>`}</div></div>`;
    }).join('')}
  </div>`;
}

// ------------------------------------------------------------
//  なかま（ステータス・わざ・武器・おしゃれ）
//  左はしに顔の列、まんなかにネコと足もとの名札（役割・名前・Lv）、右にステータスと「わざ」「武器」のタブ。
//  背景はその子に合う場所の景色の一枚絵（ShowcaseView・SHOWCASE_BG）。右の板と名札は、その景色に合う暗めの色（pane）
//  上の帯（帯の影と、はばいっぱいの帯）はなく、左上の角に戻るボタンと題だけ。右のステータスと一覧は、画面の上から使う
//  ステータスはタブの外に出して、いつも見える（武器を選ぶときの増減と見くらべられる）。タブは子を替えても、そのまま
//  ←→（↑↓）キーでも子を替えられる
// ------------------------------------------------------------
let charTab = 'abs';
const TARGET_NAME = { single: '単体', blast: '拡散', aoe: '全体', bounce: 'バウンド', ally: '味方単体', allies: '味方全体', self: '自分' };
function CharScreen(sel) {
  const keys = Object.keys(CHARS).filter(k => Save.data.owned[k]);
  sel = sel && Save.data.owned[sel] ? sel : Save.data.team[0];
  const v3 = GFX.show('chars', () => new ShowcaseView(sel));
  if (v3 && (!v3.model || v3.model.key !== sel)) v3.setChar(sel);
  const c = charKit(sel), o = Save.data.owned[sel], col = c.color, wid = equippedWeapon(sel);
  const st = charStats(sel, o.lv, o.eid);
  const ab = (label, a) => `<div class="ck-ab"><div class="ck-ab-h"><span class="ck-kind">${label}</span>${abElems(a).map(el => elemIcon(el)).join('')}<b>${a.name}</b>${a.target ? `<span class="ck-tg">${TARGET_NAME[a.target]}</span>` : ''}</div><p>${a.desc}</p></div>`;
  // 覚えたコンボだけ（相手と友情Lv3。「みんなと」は友情Lv3の仲間が2匹以上いれば、組み方しだいで戦闘で使える）
  const learned = ([a, b]) => b === '*' ? keys.filter(k => k !== a && bondLv(a, k) >= 3).length >= 2 : bondLv(a, b) >= 3;
  const combos = COMBOS.filter(x => x.pair.includes(sel) && learned(x.pair));
  const max = o.lv >= 80;
  const stats = [['HP', fmt(st.maxHp)], [Tx('攻撃力'), fmt(st.atk)], [Tx('防御力'), fmt(st.def)],
    [Tx('速度'), st.spd], [Tx('会心率'), Math.round(st.crit * 100) + '%'], [Tx('会心ダメージ'), Math.round(st.critDmg * 100) + '%']];
  const bg = SHOWCASE_BG[sel] || SHOWCASE_BG.mike;
  const s = h(`<div class="screen chars" style="--pane:${bg.pane}">${GFX.ok ? '' : `<div class="ck-bg" style="background-image:url(${showcaseBgUrl(sel)})"></div>`}<div class="ck-top"><button class="back" data-back>‹</button><div class="tb-title">${Tx('なかま')}</div></div>
    <div class="ck-dock">${keys.map(k => `<button class="ck-face ${k === sel ? 'on' : ''} ${Save.data.team.includes(k) ? 'inteam' : ''}" data-key="${k}" style="--c:${CHARS[k].color}">
      <span class="ck-face-img">${avatarSVG(k)}</span><span class="ck-face-name">${CHARS[k].name}</span></button>`).join('')}</div>
    <div class="ck-art ${GFX.ok ? 'is3d' : ''}" style="--c:${col}">${GFX.ok ? '' : avatarSVG(sel)}</div>
    <div class="ck-plate" style="--c:${col}">
      <div class="ck-tags"><span class="ck-path">${Tx('役割：{0}', PATHS[c.path].name)}</span><span class="ck-eid">${Tx('武器：{0}', weaponName(wid))}</span></div>
      <div class="ck-name"><h2>${c.name}</h2><span class="ck-title">${c.title}</span></div>
      <div class="ck-lv"><b>Lv.${o.lv}</b><span>/80</span><div class="bar exp"><i style="width:${max ? 100 : o.exp / expToNext(o.lv) * 100}%"></i></div>
        <small>${max ? Tx('レベル最大') : Tx('次のレベルまで あと {0}', fmt(expToNext(o.lv) - o.exp))}</small></div>
    </div>
    <div class="ck-info" style="--c:${col}">
      <div class="ck-stats">${stats.map(([n, v]) => `<div><span>${n}</span><b>${v}</b></div>`).join('')}</div>
      <div class="ck-tabs"><button data-tab="abs">${Tx('わざ')}</button><button data-tab="wp">${Tx('武器')}</button><button data-tab="fit">${Tx('おしゃれ')}</button></div>
      <div class="ck-pane ck-abs" data-pane="abs">
        ${ab(Tx('通常攻撃'), c.basic)}${ab(Tx('戦闘スキル'), c.skill)}${ab(Tx('必殺技'), c.ult)}
        ${ab(Tx('とくせい'), c.talent)}${ab(Tx('初手技'), c.technique)}
        ${combos.map(x => ab(x.pair[1] === '*' ? Tx('コンボ（みんなと・友情Lv3）') : Tx('コンボ（{0}と・友情Lv3）', CHARS[x.pair.find(p => p !== sel)].name), x)).join('')}
      </div>
      <div class="ck-pane" data-pane="wp">${weaponList(sel)}</div>
      <div class="ck-pane" data-pane="fit">${outfitList(sel)}</div>
    </div></div>`);
  const showTab = t => {
    charTab = t;
    s.querySelectorAll('[data-tab]').forEach(b => b.classList.toggle('on', b.dataset.tab === t));
    s.querySelectorAll('[data-pane]').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== t));
  };
  showTab(['wp', 'fit'].includes(charTab) ? charTab : 'abs');
  wireBack(s);
  on(s, '[data-tab]', 'click', el => showTab(el.dataset.tab));
  on(s, '.ck-face', 'click', el => { if (el.dataset.key !== sel) App.go(CharScreen, el.dataset.key); });
  on(s, '.wp-row[data-wp]', 'click', el => {
    if (el.dataset.wp === wid) return;
    equipWeapon(sel, el.dataset.wp); Sfx.select();
    App.go(CharScreen, sel); if (v3) v3.setChar(sel);
  });
  // 着がえ：選びなおすと、モデルを着せかえる（スクロールの位置はそのまま）
  on(s, '.fit-op', 'click', el => {
    const v = el.dataset.v; if (v === (outfitOf(sel, el.dataset.fit) || '')) return;
    const top = s.querySelector('[data-pane="fit"]').scrollTop;
    setOutfit(sel, el.dataset.fit, v || null); Sfx.select();
    App.go(CharScreen, sel); if (v3) v3.setChar(sel);
    const p2 = App.el && App.el.querySelector('.screen.chars [data-pane="fit"]'); if (p2) p2.scrollTop = top;
  });
  if (v3) v3.bindDrag(s.querySelector('.ck-art'));
  return s;
}
document.addEventListener('keydown', e => {
  const d = { ArrowLeft: -1, ArrowUp: -1, ArrowRight: 1, ArrowDown: 1 }[e.key];
  if (e.repeat || !d || !App.el) return;
  const fs = [...App.el.querySelectorAll('.screen.chars .ck-face')]; if (fs.length < 2) return;
  e.preventDefault();
  fs[(fs.findIndex(f => f.classList.contains('on')) + d + fs.length) % fs.length].click();
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
const SHOP_NAMES = { weapon: '武器を鍛える', item: '道具屋', inn: 'ひと休み', fish: '魚屋', fashion: 'おしゃれ屋' };
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
    } else if (kind === 'fashion') {
      const goods = Object.keys(OUTFITS).map(id => {
        const it = OUTFITS[id], own = hasOutfit(id);
        return `<div class="sh-row"><div class="sh-icon">${it.icon}</div><div class="sh-info"><b>${it.name}<em class="sh-have">${OUTFIT_SLOT_NAME[it.slot]}</em></b><small>${it.desc}</small></div><button class="btn small" data-obuy="${id}" ${own || d.niboshi < it.price ? 'disabled' : ''}>${own ? Tx('買ってある') : Tx('にぼし {0}', it.price)}</button></div>`;
      }).join('');
      body = `<div class="dim">${Tx('おしゃれは見た目だけ。一度買えば、だれでも着られる。「なかま」の画面の「おしゃれ」で着がえよう。')}</div><div class="sh-list">${goods}</div>`;
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
    o.querySelectorAll('[data-obuy]').forEach(b => b.onclick = () => {
      const id = b.dataset.obuy, it = OUTFITS[id];
      d.niboshi -= it.price; gainOutfit(id); Save.save(); Sfx.win();
      field && field.toast(Tx('「{0}」を買った！（なかまの画面の「おしゃれ」で着がえられる）', it.name));
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
