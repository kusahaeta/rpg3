'use strict';
// ============================================================
//  セーブデータ・育成・ワープ
// ============================================================
const SAVE_KEY = 'galaxy_rail_nocturne_v1';

const Save = {
  data: null,
  defaults() {
    return {
      jade: 4800, expPool: 2000, tp: 5,
      owned: {
        aster: { lv: 1, exp: 0, eid: 0 }, mizore: { lv: 1, exp: 0, eid: 0 },
        yue: { lv: 1, exp: 0, eid: 0 },
      },
      team: ['aster', 'mizore', 'yue'],
      cleared: {},
      gacha: { limited: { p5: 0, p4: 0, guarantee: false }, standard: { p5: 0, p4: 0 } },
      history: [],
      suBest: 0, suClears: {},
      auto: false, speed: 1, ver: 2,
    };
  },
  load() {
    try { this.data = JSON.parse(localStorage.getItem(SAVE_KEY)); } catch (e) { this.data = null; }
    const def = this.defaults();
    if (!this.data) this.data = def;
    // ver 2：カザネは第一章「風の刺客」で仲間になる。まだ出会っていない初期データのカザネは外す
    // （第一章の段階4が「風の刺客」。育成・星魂の跡があれば、ワープ等で得たものとして残す）
    if (!this.data.ver) {
      const st = this.data.story, k = this.data.owned.kazane;
      if (k && k.lv === 1 && !k.exp && !k.eid && (!st || (st.ch === 0 && st.step <= 4))) delete this.data.owned.kazane;
      this.data.ver = 2;
    }
    for (const k in def) if (this.data[k] === undefined) this.data[k] = def[k];
    this.data.team = this.data.team.filter(k => this.data.owned[k]);
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

// ------------------------------------------------------------
//  ワープ（本家準拠：5★基礎0.6%、74連目から確率上昇、90連天井／4★は10連保証）
// ------------------------------------------------------------
function warpOnce(bannerKey) {
  const g = Save.data.gacha[bannerKey], banner = BANNERS[bannerKey];
  g.p5++; g.p4++;
  const rate5 = g.p5 >= 90 ? 1 : g.p5 >= 74 ? 0.006 + (g.p5 - 73) * 0.06 : 0.006;
  let rarity, key;
  if (Math.random() < rate5) {
    rarity = 5; g.p5 = 0;
    if (banner.type === 'limited') {
      if (g.guarantee || Math.random() < 0.5) { key = banner.featured; g.guarantee = false; }
      else { key = pick(POOL5); g.guarantee = true; }
    } else key = pick(POOL5);
  } else if (g.p4 >= 10 || Math.random() < 0.051) {
    rarity = 4; g.p4 = 0;
    key = banner.rateUp4 && Math.random() < 0.5 ? pick(banner.rateUp4) : pick(POOL4);
  } else rarity = 3;

  const res = { rarity, key, isNew: false, bonus: '' };
  if (rarity === 3) { Save.data.expPool += 300; res.bonus = '旅情の記録 ×300EXP'; }
  else {
    const o = Save.data.owned[key];
    if (!o) {
      const top = Math.max(...Object.values(Save.data.owned).map(x => x.lv));
      Save.data.owned[key] = { lv: Math.max(1, top - 5), exp: 0, eid: 0 };
      res.isNew = true;
    } else if (o.eid < 6) { o.eid++; res.bonus = `星魂 ${o.eid} 解放`; }
    else { const j = rarity === 5 ? 40 : 8; Save.data.jade += j; res.bonus = `星玉 +${j}`; }
  }
  Save.data.history.unshift({ key: key || null, rarity, banner: bannerKey, t: Date.now() });
  Save.data.history = Save.data.history.slice(0, 100);
  return res;
}

function warp(bannerKey, n) {
  const cost = 160 * n;
  if (Save.data.jade < cost) return null;
  Save.data.jade -= cost;
  const out = [];
  for (let i = 0; i < n; i++) out.push(warpOnce(bannerKey));
  Save.save();
  return out;
}
