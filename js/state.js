'use strict';
// ============================================================
//  セーブデータ・育成・友情
// ============================================================
const SAVE_KEY = 'nyanko_fantasy_v1';

const Save = {
  data: null,
  defaults() {
    return {
      niboshi: 300, expPool: 600, tp: 3,
      owned: { mike: { lv: 1, exp: 0, eid: 0 } },
      team: ['mike'],
      cleared: {},
      flags: {},          // 物語の進み具合で変わること（talk＝「話す」解禁、kuroGuard＝守護 など）
      bond: {},           // 友情値（2匹の組み合わせごと）
      bondNews: [],       // 友情レベルが上がった知らせ（ハブで表示）
      bondSeen: {},       // 見た特別イベント
      usage: {},          // 戦闘に出た回数（出番の少ない子がすねる）
      gear: {},           // 武器の強化段階
      auto: false, speed: 1, ver: 1,
    };
  },
  load() {
    try { this.data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { this.data = null; }
    const def = this.defaults();
    if (!this.data) this.data = def;
    for (const k in def) if (this.data[k] === undefined) this.data[k] = def[k];
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

function teamMembers() {
  return Save.data.team.map(k => ({ key: k, lv: Save.data.owned[k].lv, eid: Save.data.owned[k].eid }));
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

// 武器の強化（にぼしを使う）
const GEAR_MAX = 5;
const gearCost = lv => 150 + lv * 200;
const GEAR_NAMES = {
  mike: ['木のつるぎ', '銅のつるぎ', '勇者のつるぎ', '流星のつるぎ', 'ひだまりの剣', 'にゃんだーの剣'],
  kuro: ['古びた黒刀', '研いだ黒刀', '月影の刀', '守護の刀', '夜明けの刀', '絆の黒刀'],
  shiro: ['見習いの杖', '星の杖', '天才の杖', '大天才の杖', '失敗しない杖（自称）', '成長の杖'],
  tama: ['ふつうのまくら', 'ふかふかまくら', 'ひだまりまくら', '夢見まくら', '世界樹のまくら', 'みんなのまくら'],
  maou: ['魔王の笏', '尊大な笏', '暗黒の笏', '元魔王の笏', 'カフェの笏', '友だちの笏'],
};
