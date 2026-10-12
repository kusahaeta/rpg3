'use strict';
// ============================================================
//  セーブデータ・育成・友情
// ============================================================
const SAVE_KEY = 'nyanko_fantasy_v1';

const Save = {
  data: null,
  defaults() {
    return {
      niboshi: 300, tp: 3,
      owned: { mike: { lv: 1, exp: 0, eid: 0 } },
      team: ['mike'],
      cleared: {},
      flags: {},          // 物語の進み具合で変わること（talk＝「話す」解禁、kuroGuard＝守護 など）
      bond: {},           // 友情値（2匹の組み合わせごと）
      bondNews: [],       // 友情レベルが上がった知らせ（ハブで表示）
      bondSeen: {},       // 見た特別イベント
      usage: {},          // 戦闘に出た回数（出番の少ない子がすねる）
      weapons: {},        // 持っている武器と強化段階（はじめの武器は持っていなくても使える。js/weapons.js）
      equip: {},          // にゃんこごとに装備している武器
      auto: false, speed: 1, ver: 7,
      eco: null,          // 省エネ（30fps）。null はおまかせ（スマホなら省エネ）
    };
  },
  // 古いセーブを今の台本に合わせる
  migrate(d, ver) {
    // ver 2：第二章に「風車の畑」（2-3）が入り、関所の戦いが 2-4 に。段階も増えた
    if (ver < 2) {
      if (d.cleared['2-3']) d.cleared['2-4'] = true;
      if (d.story && d.story.ch === 1) d.story.step = [0, 1, 3, 4, 7][d.story.step] ?? d.story.step;
      d.ver = 2;
    }
    // ver 3：まどろみの林が三つの区画になり、タマが仲間になるまでの段階が増えた（第二章の c2_03 のあと 4 段階）
    if (ver < 3) {
      if (d.story && d.story.ch === 1 && d.story.step >= 4) d.story.step += 4;
      d.ver = 3;
    }
    // ver 4：関所が切り通しと「ニャハハ王国関所」の砦になり、第二章の最後の戦いの前に 1 段階増えた
    if (ver < 4) {
      if (d.story && d.story.ch === 1 && d.story.step >= 12) d.story.step += 1;
      d.ver = 4;
    }
    // ver 5：「けいけんち」をためてあとでレベルアップする仕組みをやめた。ためていた分は消える
    if (ver < 5) {
      delete d.expPool;
      d.ver = 5;
    }
    // ver 6：武器がにゃんこごとに何本も持てるようになった。鍛えた段階は、はじめの武器の +1〜+5 に引きつぐ。
    // すでに開けた宝箱に武器が入っていたら、その武器も持っていることにする
    if (ver < 6) {
      d.weapons = d.weapons || {};
      for (const k in d.gear || {}) if (d.gear[k] && startWeapon(k)) d.weapons[startWeapon(k)] = Math.min(WEAPON_MAX, d.gear[k]);
      delete d.gear;
      for (const z in d.fieldChests || {}) for (const i of d.fieldChests[z]) { const id = (CHEST_WEAPONS[z] || {})[i]; if (id && d.weapons[id] == null) d.weapons[id] = 0; }
      d.ver = 6;
    }
    // ver 7：ごろごろ切り通しに入ったときの会話（c2_03k）が入り、第二章の切り通しの戦いの前に 1 段階増えた
    if (ver < 7) {
      if (d.story && d.story.ch === 1 && d.story.step >= 12) d.story.step += 1;
      d.ver = 7;
    }
  },
  load() {
    try { this.data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { this.data = null; }
    const def = this.defaults();
    if (!this.data) this.data = def;
    const ver = this.data.ver || 1;
    for (const k in def) if (this.data[k] === undefined) this.data[k] = def[k];
    this.migrate(this.data, ver);
    this.data.team = this.data.team.filter(k => this.data.owned[k]);
    if (!this.data.team.length) this.data.team = ['mike'];
    Game.auto = !!this.data.auto; Game.speed = this.data.speed || 1;
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* 保存不可の環境 */ } },
  reset() { localStorage.removeItem(SAVE_KEY); this.data = null; this.load(); },
};

// 経験値付与。上がったレベル数を返す
function grantExp(key, amount) {
  const o = Save.data.owned[key]; if (!o) return 0;
  const before = o.lv;
  o.exp += amount;
  while (o.lv < 80 && o.exp >= expToNext(o.lv)) { o.exp -= expToNext(o.lv); o.lv++; }
  if (o.lv >= 80) o.exp = 0;
  return o.lv - before;
}

// 物語の都合で、いまは一行を離れている子（STORY の段階の away）
function awayNow() {
  const cur = typeof Story !== 'undefined' ? Story.current() : null;
  return (cur && cur.step.away) || [];
}

function teamMembers() {
  const away = awayNow();
  return Save.data.team.filter(k => !away.includes(k)).map(k => ({ key: k, lv: Save.data.owned[k].lv, eid: Save.data.owned[k].eid }));
}

// 仲間になる（編成に空きがあれば編成にも加わる）
function joinParty(k, lv) {
  const d = Save.data;
  if (!d.owned[k]) {
    const top = Math.max(...Object.values(d.owned).map(x => x.lv));
    d.owned[k] = { lv: lv || Math.max(1, top - 1), exp: 0, eid: 0 };
  }
  if (d.team.length < 4 && !d.team.includes(k)) d.team.push(k);
  Save.save();
}

// 戦闘に勝ったあと：一緒に戦った仲間どうしの友情が深まり、出番が記録される
function afterBattleBonds(keys, boss) {
  const d = Save.data;
  keys.forEach(k => { d.usage[k] = (d.usage[k] || 0) + 1; });
  for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++) addBond(keys[i], keys[j], boss ? 8 : 3);
  Save.save();
}

