'use strict';
// ============================================================
//  セーブデータ・育成・友情
// ============================================================
const SAVE_KEY = 'nyanko_fantasy_v1';

const Save = {
  data: null,
  defaults() {
    return {
      niboshi: 300,
      owned: { mike: { lv: 1, exp: 0, eid: 0 } },
      team: ['mike'],
      cleared: {},
      flags: {},          // 物語の進み具合で変わること（kuroGuard＝守護 など）
      items: { onigiri: 3, nekokan: 1 },   // 戦闘で使うどうぐの数（ITEMS。はじめから少し持っている）
      bond: {},           // 友情値（2匹の組み合わせごと）
      bondNews: [],       // 友情レベルが上がった知らせ（戦闘の結果か、探索に出たときに表示）
      bondSeen: {},       // 見た特別イベント
      usage: {},          // 戦闘に出た回数（出番の少ない子がすねる）
      weapons: {},        // 持っている武器と強化段階（はじめの武器は持っていなくても使える。js/weapons.js）
      equip: {},          // にゃんこごとに装備している武器
      auto: false, speed: 1, ver: 12,
      eco: null,          // 画質（false なめらか・true 省エネ・'low' 軽量）。null はおまかせ（スマホなら省エネ）
      gfxAuto: null,      // おまかせのとき、コマ数が足りなくて落とした画質の段階（GFX.watchFps）
      bgm: true, bgmVol: 1, seVol: 1,   // オプション：BGM を鳴らすか・BGM と効果音の音量（0〜1）
      hp: {},             // HP の割合（にゃんこごと）。探索・物語の戦闘で引きつぐ（carried）
      energy: {},         // 必殺技ゲージ（にゃんこごと）。ないときは戦闘のはじめの量
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
    // ver 8：ごろごろ切り通しの見晴らし台の会話（c2_05b）が入り、第二章の切り通しの戦いのあとに 1 段階増えた。
    //   切り通しの戦いを終えたところ（関所へ向かう段階）は、まだ切り通しにいれば見晴らし台から、もう関所にいればそのまま
    if (ver < 8) {
      const s = d.story;
      if (s && s.ch === 1 && s.step >= 14) s.step += 1;
      else if (s && s.ch === 1 && s.step === 13 && !(d.fieldResume && d.fieldResume.zone === 'road2')) s.step = 14;
      d.ver = 8;
    }
    // ver 9：ごろごろ切り通しが、入口からたまり場まで（road2）と、外門の広場から見晴らし台まで（road2_gate）の二区画になり、たまり場から先の道を作りなおした。
    //   切り通しにいた場所と、開けた宝箱（もとの 0 番は外門の区画の 0 番、1〜3 番は切り通しの 0〜2 番）を、新しい区画に移す
    if (ver < 9) {
      const r = d.fieldResume;
      // 外門の広場から北は外門の区画へ。たまり場は広げて作りなおしたので、たまり場（とその北の細い道）にいたら、たまり場の南のはしへ
      if (r && r.zone === 'road2') {
        if (r.z < -22 && r.x < 24) { r.zone = 'road2_gate'; r.z += 52; }
        else if (r.z < -16 && r.x >= 24) r.z -= 37;   // 東の岩棚
        else if (r.z < 17) { r.x = 0; r.z = 1; }
        else r.z -= 13;
      }
      const opened = d.fieldChests && d.fieldChests.road2;
      if (opened) {
        if (opened.includes(0)) d.fieldChests.road2_gate = [0];
        d.fieldChests.road2 = opened.filter(i => i > 0).map(i => i - 1);
      }
      d.ver = 9;
    }
    // ver 10：ミャオ街道が、ひょうたん池の野原（road1）と、風車の立つ丘（road1_hill）の二つの広い区画になり、地図を作りなおした。
    //   街道にいた場所は、南の池のあたりなら池の区画の入口へ、風車の畑なら丘の頂上へ、宿場へ向かう道なら丘の北のふもとへ、休み場なら丘の南のふもとへ。
    //   開けた宝箱：もとの 1 番（池）は池の区画の 0 番、0 番（北の見晴らし台）と 2 番（風車の畑）は丘の区画の 0 番と 1 番
    if (ver < 10) {
      const r = d.fieldResume;
      if (r && r.zone === 'road1') {
        if (r.z >= 12) { r.x = -1; r.z = 68; }
        else {
          r.zone = 'road1_hill';
          if (r.x > 8) { r.x = -3; r.z = -10; } else if (r.z < -10) { r.x = -1; r.z = -88; } else { r.x = 12; r.z = 80; }
        }
      }
      const opened = d.fieldChests && d.fieldChests.road1;
      if (opened) {
        d.fieldChests.road1_hill = [[0, 0], [2, 1]].filter(([o]) => opened.includes(o)).map(([, n]) => n);
        d.fieldChests.road1 = opened.includes(1) ? [0] : [];
      }
      d.ver = 10;
    }
    // ver 11：笑顔の塔の仕掛けを、笑いの会話（漫才・コント・空中ブランコ）にした。二階のびっくり箱の会話（c3_03e）が入り、第三章の三階へ向かう段階の前に 1 段階増えた
    if (ver < 11) {
      if (d.story && d.story.ch === 2 && d.story.step >= 5) d.story.step += 1;
      d.ver = 11;
    }
    // ver 12：初手技ポイントをやめた。爪とぎの丸太で爪を研ぐと、その場で初手技が準備される
    if (ver < 12) {
      delete d.tp;
      d.ver = 12;
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
    // AUTO はデバッグのときだけ（?debug）。ふだんは前に入れたままの AUTO も切る
    Game.auto = Debug.on && !!this.data.auto; Game.speed = this.data.speed || 1;
    Sfx.setVol('bgm', this.data.bgmVol); Sfx.setVol('se', this.data.seVol);
    if (Music.on !== this.data.bgm) Music.toggle();
  },
  save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(this.data)); } catch (e) { /* 保存不可の環境 */ } },
  reset() { localStorage.removeItem(SAVE_KEY); this.data = null; this.load(); },
};

// 敵より上のレベルの子は、もらえる経験値が減る（1 レベル上で 8 割、2 で 6 割 … 5 以上は 1 割）
const expScale = (lv, foeLv) => lv <= foeLv ? 1 : Math.max(0.1, 1 - 0.2 * (lv - foeLv));

// 戦闘でもらえる経験値の倍率（1 戦で 1 レベル上がらないくらい）
const EXP_RATE = 0.6;

// 経験値付与。foeLv（敵のレベル）を渡すと、レベル差で減らす。上がったレベル数を返す
function grantExp(key, amount, foeLv) {
  const o = Save.data.owned[key]; if (!o) return 0;
  const before = o.lv;
  o.exp += Math.round(amount * EXP_RATE * (foeLv == null ? 1 : expScale(o.lv, foeLv)));
  while (o.lv < 80 && o.exp >= expToNext(o.lv)) { o.exp -= expToNext(o.lv); o.lv++; }
  if (o.lv >= 80) o.exp = 0;
  return o.lv - before;
}

// HP と必殺技ゲージは、探索を離れても・物語の戦闘でも引きつぐ。回復するのは宿・焼き魚・やられたとき・章が進んだとき（Story.advance）・heal の印の目的地に着いたとき（Story.arrive）だけ
function carried(m) {
  const d = Save.data;
  return { ...m, hpRatio: (d.hp || {})[m.key] ?? 1, energy: (d.energy || {})[m.key] ?? null };
}
// list：{ key, hpRatio, energy } の並び（戦闘の結果の team など）。保存はよび出し側で
function keepCarried(list) {
  const d = Save.data; d.hp = d.hp || {}; d.energy = d.energy || {};
  list.filter(m => d.owned[m.key]).forEach(m => {
    d.hp[m.key] = m.hpRatio;
    if (m.energy == null) delete d.energy[m.key]; else d.energy[m.key] = m.energy;
  });
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

// keys の子たちで使えるコンボ（友情Lv3の組み合わせ。「みんなと」は、ほかの子が2匹以上いて、みんなと友情Lv3）。戦闘とへんせいの画面で使う
function teamCombos(keys) {
  return COMBOS.filter(({ pair: [a, b] }) => {
    if (!keys.includes(a)) return false;
    if (b === '*') { const others = keys.filter(k => k !== a); return others.length >= 2 && others.every(k => bondLv(a, k) >= 3); }
    return keys.includes(b) && bondLv(a, b) >= 3;
  });
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

