'use strict';
// ============================================================
//  にゃんこファンタジー — ゲームデータ：属性・役割・にゃんこ・敵・章
// ============================================================

// 属性（キーはバトルエンジンと共通。量子＝闇、虚数＝光として使う）
const ELEMENTS = {
  physical:  { name: '物理', color: '#e2dccf', glyph: '爪' },
  fire:      { name: '炎',   color: '#ff6a3c', glyph: '炎' },
  ice:       { name: '氷',   color: '#6fd6f5', glyph: '氷' },
  lightning: { name: '雷',   color: '#ffd23c', glyph: '雷' },
  quantum:   { name: '闇',   color: '#a07bff', glyph: '闇' },
  imaginary: { name: '光',   color: '#fff0a8', glyph: '光' },
};
// 属性は技がもつ（elem）。いくつかの属性を使い分ける技は配列で書き、ふだんは先頭の属性になる
const abElems = ab => (ab && ab.elem ? [].concat(ab.elem) : []);
const abElem = ab => abElems(ab)[0] || null;

// 役割（aggro＝敵に狙われやすさ）
const PATHS = {
  destruction: { name: 'ゆうしゃ', aggro: 125 },
  hunt:        { name: 'かりうど', aggro: 75 },
  erudition:   { name: 'まほう', aggro: 75 },
  harmony:     { name: 'おうえん', aggro: 100 },
  nihility:    { name: 'まおう', aggro: 100 },
  preservation:{ name: 'まもり', aggro: 150 },
  abundance:   { name: 'いやし', aggro: 100 },
};

const lvFactor = lv => 0.2 + 0.8 * (lv - 1) / 79;
const lvMult = lv => 1300 * lvFactor(lv);
const expToNext = lv => 100 + lv * 45;

// 物語の進み具合で変わる力（成長）
const flag = k => !!(typeof Save !== 'undefined' && Save.data && Save.data.flags && Save.data.flags[k]);

function charStats(key, lv, eid, wid) {
  const b = CHARS[key].base, w = Save.data ? weaponStatMult(key, wid) : { hp: 1, atk: 1, def: 1 };
  const f = lvFactor(lv) * (1 + 0.06 * eid);
  return {
    maxHp: b.hp * f * w.hp, atk: b.atk * f * w.atk, def: b.def * f * w.def, spd: b.spd,
    crit: b.crit || 0.05, critDmg: b.critDmg || 0.5, be: b.be || 0,
    ehr: b.ehr || 0, eres: b.eres || 0.1, err: 0,
  };
}

// ------------------------------------------------------------
//  にゃんこ（仲間）
//  color：その子の色（画面やオーラ）。属性はその子ではなく、技ごとの elem
//  look：2頭身のにゃんこの見た目（js/gfx/cats.js）。gear：武器の種類と戦い方
//  basic / skill / ult：はじめの武器の技（ほかの武器は js/weapons.js）
//  target: single / blast / aoe / bounce / ally / allies / self
// ------------------------------------------------------------
const CHARS = {
  mike: {
    name: 'ミケ', title: '拾われ勇者の三毛猫', rarity: 5, color: '#ff6a3c', path: 'destruction',
    base: { hp: 3800, atk: 1450, def: 1050, spd: 102, crit: 0.18, critDmg: 0.7, be: 0.3 },
    energyMax: 120,
    look: { fur: '#fffaf2', pattern: 'calico', patches: ['#f29a3e', '#3b302c'], eye: '#f2a91e', muzzle: '#ffffff', paws: '#ffffff', earIn: '#f7b3bd',
      cape: '#e0453a', capeIn: '#ffd76a', accent: '#ffd76a', band: '#e0453a' },
    gear: { weapon: 'sword', style: 'melee' },
    basic: { name: 'ねこパンチ', elem: 'physical', target: 'single', anim: 'punch', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '勇者のつるぎ', elem: 'physical', target: 'blast', anim: 'hero', desc: '指定した敵単体に攻撃力130%、隣接する敵に攻撃力50%の物理ダメージ。',
      run: (B, s, t) => B.blast(s, t, 1.3, 0.5, 20, 10, 'skill') },
    ult: { name: '流星ねこぎり', elem: 'fire', target: 'single', anim: 'meteor', desc: '指定した敵単体に攻撃力400%の炎ダメージ。味方全体の攻撃力+15%（2ターン）。',
      run: async (B, s, t) => {
        const r = await B.single(s, t, 4.0, 30, 'ult', { heavy: true });
        B.aliveAllies().forEach(a => B.buff(a, { key: 'mike_u', name: '勇者の背中', stat: 'atk', value: 0.15, turns: 2 }));
        return r;
      } },
    // 第七章で「勇者」になると、とくせいに力が加わる
    talent: { name: '食いしん坊',
      get desc() { return '戦闘中1回、HPが40%を下回ると隠しておいた焼き魚を食べ、HPを30%回復。' + (flag('mikeHero') ? '仲間の数だけ与ダメージ+5%。' : ''); },
      onAllyHit(B, s, a) {
        if (a !== s || !s.alive || s.flags.ate || s.hp / s.maxHp >= 0.4) return;
        s.flags.ate = true; B.float(s, 'もぐもぐ', 'info'); B.heal(s, s, s.maxHp * 0.3);
      },
      dmgMod: B => (flag('mikeHero') ? 0.05 * B.aliveAllies().length : 0) },
    technique: { name: 'とびかかり', elem: 'physical', desc: '戦闘開始時、敵全体に攻撃力80%の物理ダメージ。',
      run: (B, s) => B.aoe(s, 0.8, 0, 'tech') },
  },

  kuro: {
    name: 'クロ', title: '空から落ちてきた黒猫', rarity: 5, color: '#e2dccf', path: 'preservation',
    base: { hp: 4600, atk: 1250, def: 1500, spd: 96, crit: 0.1, critDmg: 0.6, eres: 0.2 },
    energyMax: 120,
    look: { fur: '#3d3b4a', pattern: 'solid', eye: '#ffd24a', muzzle: '#4a4858', paws: '#3d3b4a', earIn: '#8a6a78',
      scarf: '#8a2f3c', armor: '#5d6a86', accent: '#b8c6e8' },
    gear: { weapon: 'blade', style: 'melee' },
    basic: { name: '黒爪', elem: 'physical', target: 'single', anim: 'claw', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '孤高の剣', elem: 'physical', target: 'single', anim: 'lone', desc: '指定した敵単体に攻撃力200%の物理ダメージ。自身は敵に狙われやすくなる（2ターン）。',
      run: async (B, s, t) => {
        B.buff(s, { key: 'kuro_aggro', name: '挑発', stat: 'aggro', value: 3, turns: 2 });
        return B.single(s, t, 2.0, 20, 'skill');
      } },
    ult: { name: '月影一閃', elem: 'physical', target: 'aoe', anim: 'issen', desc: '敵全体に攻撃力150%の物理ダメージ。自身に防御力80%のシールド（3ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.5, 20, 'ult', { heavy: true });
        B.shield(s, s, s.stat('def') * 0.8, 3);
        return r;
      } },
    // 第四章で「守護」を覚えると、とくせいが変わる（武器の技ではないので、どの刀を持っていても守る）
    talent: {
      get name() { return flag('kuroGuard') ? '守護' : '……面倒だ'; },
      get desc() { return flag('kuroGuard') ? '自身の被ダメージ-15%、味方全体の被ダメージ-8%。味方が攻撃を受けてHPが50%を下回ると、その味方に防御力60%+300のシールド（2ターン）。クロのターンごとに1回。' : '自身の被ダメージ-15%。'; },
      onBattleStart(B, s) {
        s.buffs.push({ key: 'kuro_t', name: '……面倒だ', stat: 'vuln', value: -0.15, turns: Infinity, hidden: true });
        if (!flag('kuroGuard')) return;
        B.aliveAllies().filter(a => a !== s).forEach(a => a.buffs.push({ key: 'kuro_g', name: '守護', stat: 'vuln', value: -0.08, turns: Infinity, hidden: true }));
        s.flags.guard = true;
      },
      onTurnStart(B, s) { if (flag('kuroGuard')) s.flags.guard = true; },
      onAllyHit(B, s, a) {
        if (!s.flags.guard || !s.alive || !a.alive || a.hp <= 0 || a.hp / a.maxHp >= 0.5) return;
        s.flags.guard = false;
        B.float(s, '守護', 'info');
        B.shield(s, a, s.stat('def') * 0.6 + 300 * lvFactor(s.level), 2);
      } },
    technique: { name: '影の足音', desc: '戦闘開始時、敵全体の行動順を20%遅らせる。',
      run: (B, s) => B.aliveEnemies().forEach(e => { B.delay(e, 0.2); B.float(e, '行動遅延', 'info'); }) },
  },

  shiro: {
    name: 'シロ', title: '自称・天才魔法使い', rarity: 5, color: '#ffd23c', path: 'erudition',
    base: { hp: 3200, atk: 1750, def: 750, spd: 104, crit: 0.3, critDmg: 0.9, ehr: 0.15 },
    energyMax: 130,
    look: { fur: '#ffffff', pattern: 'solid', eye: '#4aa8ff', eye2: '#f2c84a', muzzle: '#ffffff', paws: '#ffffff', earIn: '#ffb8c8',
      hat: '#6a4ad8', hatBand: '#ffd76a', cape: '#6a4ad8', capeIn: '#c9b8ff', accent: '#ffd76a', ribbon: '#ff8ab8' },
    gear: { weapon: 'wand', style: 'ranged' },
    basic: { name: 'マジックアロー', elem: 'lightning', target: 'single', desc: '指定した敵単体に攻撃力100%の雷ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '天才魔法', elem: ['fire', 'lightning', 'ice'], target: 'single',
      desc: 'ファイア（敵全体に炎110%）・サンダー（単体に雷240%）・ブリザド（単体に氷140%、隣接に60%、凍結）のどれかを唱える。ただし25%の確率で失敗する（魚が降ってきたり、静電気が起きたりする）。',
      run: async (B, s, t) => {
        const spells = ['fire', 'thunder', 'blizzard'];
        const sp = pick(spells), fail = Math.random() < (flag('shiroGrow') ? 0.2 : 0.25);
        const name = { fire: 'ファイア', thunder: 'サンダー', blizzard: 'ブリザド' }[sp];
        let r = [];
        if (!fail) {
          B.announce('天才魔法', name + '！', ELEMENTS[{ fire: 'fire', thunder: 'lightning', blizzard: 'ice' }[sp]].color);
          if (sp === 'fire') r = await B.aoe(s, 1.1, 15, 'skill', { elem: 'fire' });
          else if (sp === 'thunder') r = await B.single(s, t, 2.4, 25, 'skill', { elem: 'lightning', anim: 'bolt' });
          else { r = await B.blast(s, t, 1.4, 0.6, 20, 10, 'skill', { elem: 'ice', anim: 'ice' }); if (t.alive) B.freeze(s, t, 0.5, s.stat('atk') * 0.5); }
          return r;
        }
        // 失敗：でも、なにかは起きる
        if (sp === 'fire') {
          B.announce('ファイア……？', '魚が降ってきた！', '#8fd8ff');
          r = await B.aoe(s, 0.35, 5, 'skill', { elem: 'physical', anim: 'fish' });
          B.aliveAllies().forEach(a => { B.heal(s, a, a.maxHp * 0.06); });
          B.float(s, 'ちがう、そうじゃない！', 'info');
        } else if (sp === 'thunder') {
          B.announce('サンダー……？', 'パチッ（静電気）', '#ffd23c');
          r = await B.single(s, t, 0.5, 5, 'skill', { elem: 'lightning' });
          if (t.alive) B.debuff(s, t, 1, { key: 'static', name: '毛が逆立った', stat: 'spd', value: -0.12, turns: 2 });
        } else {
          B.announce('ブリザド……？', 'かき氷ができた', '#bfeaff');
          await B.motion(s, 'snow', B.aliveAllies());
          B.aliveAllies().forEach(a => B.shield(s, a, s.stat('atk') * 0.25, 2));
          B.float(s, 'おいしい……', 'info');
        }
        if (flag('shiroGrow') && B.aliveEnemies().length) {
          B.float(s, '失敗は成功のもと！', 'info');
          r = r.concat(await B.aoe(s, 0.9, 10, 'skill', { elem: 'lightning' }));
        }
        return r;
      } },
    ult: { name: 'ちょう天才メテオ', elem: 'fire', target: 'aoe', desc: '敵全体に攻撃力230%の炎ダメージ、100%の基礎確率で燃焼（攻撃力40%、2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 2.3, 20, 'ult', { heavy: true });
        B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'burn', mult: 0.4, turns: 2, chance: 1 }));
        return r;
      } },
    // 第七章で失敗を受け入れると、とくせいに力が加わる
    talent: { name: 'プライド',
      get desc() { return '敵を倒すと与ダメージ+10%（最大3層）。' + (flag('shiroGrow') ? '魔法の失敗が「成功のもと」になり追撃する。' : ''); },
      onKill(B, s) { B.buff(s, { key: 'shiro_t', name: 'プライド', stat: 'dmg', value: 0.1, turns: Infinity, max: 3 }); } },
    technique: { name: 'ヒール', desc: '戦闘開始時、味方全体のHPを15%回復する。（シロの毛が爆発する）',
      run: (B, s) => { B.aliveAllies().forEach(a => B.heal(s, a, a.maxHp * 0.15)); B.float(s, '毛が爆発した！', 'info'); } },
  },

  tama: {
    name: 'タマ', title: 'のんびり屋のふしぎな子', rarity: 5, color: '#fff0a8', path: 'abundance',
    base: { hp: 4300, atk: 1050, def: 950, spd: 100, crit: 0.05, critDmg: 0.5 },
    energyMax: 100,
    look: { fur: '#fff4d8', pattern: 'point', patches: ['#e8c890'], eye: '#7ad07a', muzzle: '#fffaf0', paws: '#fffaf0', earIn: '#ffc8c8',
      sleepy: true, sprout: '#7ad86a', scarf: '#9ad88a', accent: '#fff0a8' },
    gear: { weapon: 'pillow', style: 'ranged' },
    basic: { name: 'ぽふっ', elem: 'physical', target: 'single', anim: 'bonk', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: 'なでなで', target: 'ally', anim: 'pat', desc: '味方単体のHPをタマの最大HP25%+250回復し、他の味方は8%回復。',
      run: (B, s, t) => {
        B.heal(s, t, s.maxHp * 0.25 + 250 * lvFactor(s.level));
        B.aliveAllies().filter(a => a !== t).forEach(a => B.heal(s, a, s.maxHp * 0.08));
      } },
    ult: { name: 'おひさまのうた', target: 'allies', anim: 'lullaby', desc: '味方全体のHPをタマの最大HP30%回復し、デバフを1つ解除する。',
      run: (B, s) => B.aliveAllies().forEach(a => { B.heal(s, a, s.maxHp * 0.3); B.cleanse(a); }) },
    talent: { name: 'おひるね', desc: '自分のターン開始時、20%の確率で寝てしまい行動できない。そのかわり寝言で味方全体のHPを最大HP6%回復する。（味方がピンチのときは起きている）',
      skipTurn(B, s) {
        if (B.aliveAllies().some(a => a.hp / a.maxHp < 0.3) || Math.random() >= 0.2) return false;
        B.announce('タマ', 'すやすや……', '#fff0a8');
        B.float(s, 'Zzz…', 'info');
        B.aliveAllies().forEach(a => B.heal(s, a, a.maxHp * 0.06, true));
        return true;
      } },
    technique: { name: 'ふかふか', desc: '戦闘開始時、味方全体の最大HP+15%（3ターン）。',
      run: (B, s) => B.aliveAllies().forEach(a => { B.buff(a, { key: 'tama_tech', name: 'ふかふか', stat: 'maxHp', value: 0.15, turns: 3 }); a.hp *= 1.15; }) },
    ai(B, s) {
      const low = B.aliveAllies().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (B.sp >= 1 && low && low.hp / low.maxHp < 0.65) return { kind: 'skill', target: low };
      return { kind: 'basic' };
    },
  },

  maou: {
    name: 'マオウ', title: '尊大な元・魔王', rarity: 5, color: '#a07bff', path: 'nihility',
    base: { hp: 3900, atk: 1600, def: 1000, spd: 108, crit: 0.2, critDmg: 0.8, ehr: 0.3 },
    energyMax: 120,
    look: { fur: '#352c44', pattern: 'solid', eye: '#ff4a5a', muzzle: '#43385a', paws: '#352c44', earIn: '#7a4a6a',
      cape: '#3a1850', capeIn: '#d8303c', collar: true, horns: '#f0e6d0', crown: '#ffcf4a', accent: '#ffcf4a' },
    gear: { weapon: 'scepter', style: 'ranged' },
    scale: 1.08,
    basic: { name: '魔王のしっぽ', elem: 'physical', target: 'single', anim: 'tail', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '魔王のいあつ', elem: 'quantum', target: 'aoe', anim: 'aura', desc: '敵全体に攻撃力90%の闇ダメージ。70%の基礎確率で防御力-25%（2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 0.9, 10, 'skill');
        B.aliveEnemies().forEach(e => B.debuff(s, e, 0.7, { key: 'maou_def', name: '威圧', stat: 'defDown', value: 0.25, turns: 2 }));
        return r;
      } },
    ult: { name: '暗黒ねこ波', elem: 'quantum', target: 'aoe', anim: 'wave', desc: '敵全体に攻撃力200%の闇ダメージ。味方全体の与ダメージ+25%（2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 2.0, 20, 'ult', { heavy: true });
        B.aliveAllies().forEach(a => B.buff(a, { key: 'maou_u', name: '余に続け', stat: 'dmg', value: 0.25, turns: 2 }));
        return r;
      } },
    talent: { name: 'きまぐれ', desc: '自分のターン開始時、攻撃力+20%・速度+10%・会心率+15%のどれかをランダムに得る（2ターン）。',
      onTurnStart(B, s) {
        const b = pick([{ key: 'mw1', name: 'きまぐれ', stat: 'atk', value: 0.2 }, { key: 'mw2', name: 'きまぐれ', stat: 'spd', value: 0.1 }, { key: 'mw3', name: 'きまぐれ', stat: 'crit', value: 0.15 }]);
        B.buff(s, { ...b, turns: 2 });
      } },
    technique: { name: '威光', desc: '戦闘開始時、敵全体の攻撃力-15%（2ターン）。',
      run: (B, s) => B.aliveEnemies().forEach(e => B.debuff(s, e, 1, { key: 'maou_tech', name: '威光', stat: 'atk', value: -0.15, turns: 2 })) },
  },
};
// 主人公（選択肢を選ぶと、この子の台詞になる）
const HERO = 'mike';

// ------------------------------------------------------------
//  コンボスキル（友情Lv3で解禁）と、最終決戦の最終スキル
// ------------------------------------------------------------
const COMBOS = [
  { id: 'nyankoBreak', pair: ['mike', 'kuro'], name: 'にゃんこブレイク', elem: 'physical', desc: 'ミケとクロの連携。指定した敵単体にミケの攻撃力250%＋クロの攻撃力250%の物理ダメージ。靭性を大きく削る。', target: 'single',
    run: async (B, a, t) => { const [m, k] = a; let r = await B.single(m, t, 2.5, 30, 'combo', { heavy: true, anim: 'pairIn' }); if (t.alive) r = r.concat(await B.single(k, t, 2.5, 30, 'combo', { heavy: true, anim: 'pairX' })); return r; } },
  { id: 'fireball', pair: ['mike', 'shiro'], name: 'ファイアボール', elem: 'fire', desc: 'ミケが投げた魚にシロが火をつける。敵全体にシロの攻撃力180%の炎ダメージ、燃焼（2ターン）。', target: 'aoe',
    run: async (B, a) => { const [, s] = a; const r = await B.aoe(s, 1.8, 20, 'combo', { heavy: true, anim: 'fireball' }); B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'burn', mult: 0.5, turns: 2, chance: 1 })); return r; } },
  { id: 'kokubyaku', pair: ['kuro', 'shiro'], name: '黒白連撃', elem: ['physical', 'lightning'], desc: 'クロとシロの交互攻撃。ランダムな敵に、クロ（物理）とシロ（雷）が交互に攻撃力80%のダメージを計6回。', target: 'aoe',
    run: async (B, a) => { const [k, s] = a; let r = []; for (let i = 0; i < 6 && B.aliveEnemies().length; i++) r = r.concat(await B.bounce(i % 2 ? s : k, 1, 0.8, 8, 'combo', { anim: 'kokubyaku', elem: i % 2 ? 'lightning' : 'physical' })); return r; } },
  { id: 'nyanHeal', pair: ['tama', '*'], name: 'にゃんにゃんヒール', desc: 'タマとみんなで声を合わせる。味方全体のHPを最大HP40%回復し、デバフを解除、シールドを付与。', target: 'allies', anim: 'chorus',
    run: async (B, a) => { const t = a[0]; B.aliveAllies().forEach(x => { B.heal(t, x, x.maxHp * 0.4); B.cleanse(x); B.cleanse(x); B.shield(t, x, x.maxHp * 0.12, 2); }); return []; } },
  { id: 'gorei', pair: ['maou', '*'], name: '元魔王の号令', elem: 'quantum', desc: 'マオウの号令で全員が奮い立つ。味方全体の行動順を50%早め、攻撃力+30%（2ターン）。敵全体にマオウの攻撃力120%の闇ダメージ。', target: 'aoe',
    run: async (B, a) => { const m = a[0]; const r = await B.aoe(m, 1.2, 20, 'combo', { heavy: true, anim: 'gorei' }); B.aliveAllies().forEach(x => { B.buff(x, { key: 'gorei', name: '号令', stat: 'atk', value: 0.3, turns: 2 }); B.advance(x, 0.5); }); return r; } },
];
const ALLSTARS = { id: 'allstars', name: 'にゃんこオールスターズ', elem: 'imaginary', desc: '世界中の猫たちの「つながり」が力になる。敵全体に全員の攻撃力の合計300%の光ダメージ。', target: 'aoe' };

// 友情（2匹の組み合わせごと）：一緒に旅をした時間
const BOND_LV = [0, 30, 80, 150, 250];   // Lv1〜5 に必要な友情値
const BOND_INFO = ['通常会話', '戦闘中の掛け合い', 'コンボスキル', '特別イベント', '特別イベント'];
const bondKey = (a, b) => [a, b].sort().join('|');
function bondPts(a, b) { return ((Save.data && Save.data.bond) || {})[bondKey(a, b)] || 0; }
function bondLv(a, b) { const p = bondPts(a, b); let lv = 1; for (let i = 1; i < BOND_LV.length; i++) if (p >= BOND_LV[i]) lv = i + 1; return lv; }
function addBond(a, b, n) {
  if (a === b || !CHARS[a] || !CHARS[b]) return;
  const d = Save.data.bond || (Save.data.bond = {}), k = bondKey(a, b), lv0 = bondLv(a, b);
  d[k] = Math.min(400, (d[k] || 0) + n);
  const lv1 = bondLv(a, b);
  if (lv1 > lv0) (Save.data.bondNews || (Save.data.bondNews = [])).push({ k, lv: lv1 });
}

// ------------------------------------------------------------
//  敵の技（anim・obj・glyph は動き、elem は命中の光の色。js/gfx/foe-moves.js）
// ------------------------------------------------------------
const ENEMY_MOVES = {
  strike:  { name: 'ひっかき', anim: 'claw',       type: 'single', mult: 1.0 },
  bite:    { name: 'かみつき', anim: 'bite',       type: 'single', mult: 1.2 },
  heavy:   { name: 'たいあたり', anim: 'tackle',     type: 'single', mult: 1.8 },
  blast:   { name: 'なぎはらい', anim: 'sweep',     type: 'blast',  mult: 1.1, adj: 0.5 },
  aoe:     { name: 'おおあばれ', anim: 'quake',     type: 'aoe',    mult: 0.6 },
  burn:    { name: 'ほのおのいき', anim: 'breath', obj: 'fire', elem: 'fire',   type: 'single', mult: 0.9, eff: { kind: 'dot', type: 'burn', mult: 0.35, turns: 2, chance: 0.6 } },
  frost:   { name: 'こおりのいき', anim: 'breath', obj: 'ice', elem: 'ice',   type: 'blast',  mult: 0.8, adj: 0.4, eff: { kind: 'freeze', chance: 0.3 } },
  shock:   { name: 'びりびり', anim: 'zap', elem: 'lightning',       type: 'single', mult: 0.9, eff: { kind: 'dot', type: 'shock', mult: 0.4, turns: 2, chance: 0.6 } },
  slow:    { name: 'ねばねば', anim: 'toss', obj: 'goo',       type: 'single', mult: 0.8, eff: { kind: 'buff', chance: 0.7, buff: { key: 'e_slow', name: '減速', stat: 'spd', value: -0.15, turns: 2 } } },
  weaken:  { name: 'よわよわの術', anim: 'gloom', elem: 'quantum',   type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.7, buff: { key: 'e_def', name: '防御ダウン', stat: 'def', value: -0.25, turns: 2 } } },
  charge:  { name: 'ちからをためている…', type: 'charge', next: 'nova' },
  nova:    { name: 'だいばくはつ', anim: 'nova',   type: 'aoe', mult: 1.6 },
  summon:  { name: 'なかまをよんだ', type: 'summon' },
  // 敵ごとの技
  puni:    { name: 'ぷにぷにアタック', anim: 'press', type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_puni', name: 'べとべと', stat: 'spd', value: -0.1, turns: 2 } } },
  spore:   { name: 'ねむりの胞子', anim: 'breath', obj: 'spore',   type: 'blast', mult: 0.6, adj: 0.4, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_spore', name: 'ねむけ', stat: 'spd', value: -0.2, turns: 1 } } },
  acorn:   { name: 'どんぐり投げ', anim: 'toss', obj: 'acorn',   type: 'blast', mult: 0.8, adj: 0.4 },
  cheese:  { name: 'チーズどろぼう', anim: 'claw', type: 'single', mult: 1.1 },
  kingPress: { name: 'キングプレス', anim: 'press', type: 'single', mult: 1.9 },
  ratCharge: { name: '腹ぺこで目が回っている…', type: 'charge', next: 'ratStorm' },
  ratStorm: { name: 'ネズミ大行進', anim: 'march', type: 'aoe', mult: 1.4 },
  peck:    { name: 'つっつき', anim: 'bite', glyph: 'peck',       type: 'single', mult: 1.0 },
  roll:    { name: 'ごろごろ爆走', anim: 'roll',       type: 'blast',  mult: 1.2, adj: 0.6 },
  howl:    { name: 'とおぼえ', anim: 'shout', glyph: 'ォ',       type: 'aoe',    mult: 0.5, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_howl', name: 'びくびく', stat: 'atk', value: -0.15, turns: 2 } } },
  rush:    { name: 'まっしぐら', anim: 'tackle', glyph: 'rush',     type: 'single', mult: 1.7 },
  boarCharge: { name: '鼻息があらい…', type: 'charge', next: 'boarRush' },
  boarRush: { name: 'はらぺこ大突進', anim: 'stampede', glyph: 'boar', type: 'aoe', mult: 1.3 },
  giggle:  { name: 'ゲラゲラ笑い', anim: 'shout', glyph: 'ハ',   type: 'aoe',    mult: 0.55, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_giggle', name: '笑いすぎ', stat: 'def', value: -0.15, turns: 2 } } },
  chomp:   { name: 'クスクスがぶり', anim: 'bite', type: 'single', mult: 1.5 },
  laughgas:{ name: 'わらいガス', anim: 'breath', obj: 'gas',     type: 'aoe',    mult: 0.7, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_laugh', name: '笑い転げ', stat: 'spd', value: -0.15, turns: 2 } } },
  juggle:  { name: 'ジャグリング', anim: 'toss', obj: 'ball',   type: 'blast',  mult: 1.1, adj: 0.6 },
  tears:   { name: 'なみだの雨', anim: 'rain', obj: 'drop', elem: 'ice',     type: 'aoe',    mult: 0.8 },
  showtime:{ name: '最後のショーの準備をしている…', type: 'charge', next: 'finale' },
  finale:  { name: 'さみしいフィナーレ', anim: 'finale', type: 'aoe', mult: 1.5 },
  shade:   { name: 'かげぬい', anim: 'spike', elem: 'quantum',       type: 'single', mult: 1.1, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_shade', name: 'かげぬい', stat: 'spd', value: -0.15, turns: 2 } } },
  cleave:  { name: '重い一撃', anim: 'slash',       type: 'single', mult: 1.8 },
  lonely:  { name: '孤高の剣', anim: 'slash',       type: 'single', mult: 1.6 },
  kuroCharge: { name: '影が、刀のまわりに集まっていく…', type: 'charge', next: 'kuroNova' },
  kuroNova: { name: '影の乱れ斬り', anim: 'phantom', elem: 'quantum', type: 'aoe', mult: 1.6 },
  pastEcho:{ name: 'あの日の記憶', anim: 'shout', obj: 'dark', elem: 'quantum',   type: 'aoe',    mult: 0.8, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_past', name: '後悔', stat: 'atk', value: -0.15, turns: 2 } } },
  stoneGaze: { name: '石のまなざし', anim: 'beam', glyph: 'gaze', type: 'single', mult: 1.0, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_stone', name: 'かちこち', stat: 'spd', value: -0.2, turns: 1 } } },
  beam:    { name: '古代ビーム', anim: 'beam',     type: 'blast',  mult: 1.2, adj: 0.6 },
  mossDust:{ name: 'こけのこな', anim: 'breath', obj: 'moss', type: 'blast', mult: 0.8, adj: 0.4, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_moss', name: 'こけまみれ', stat: 'def', value: -0.2, turns: 2 } } },
  shellDrop:{ name: 'こうらおとし', anim: 'press', type: 'single', mult: 1.7 },
  sealCharge: { name: '封印の光が集まっている…', type: 'charge', next: 'sealBurst' },
  sealBurst: { name: '封印の光', anim: 'pillars', elem: 'imaginary',     type: 'aoe', mult: 1.5 },
  paperwork: { name: '書類の山', anim: 'toss', obj: 'paper',     type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_paper', name: '事務作業', stat: 'spd', value: -0.15, turns: 2 } } },
  checkup: { name: '健康診断', anim: 'checkup',       type: 'single', mult: 0.7, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_check', name: '要再検査', stat: 'def', value: -0.2, turns: 2 } } },
  halt:    { name: '止まれーっ！', anim: 'halt',   type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_halt', name: '足止め', stat: 'spd', value: -0.2, turns: 1 } } },
  swish:   { name: 'ふりふり', anim: 'claw',       type: 'single', mult: 1.1 },
  tickle:  { name: 'こしょこしょ', anim: 'tickle',   type: 'aoe',    mult: 0.55, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_tickle', name: 'くすぐったい', stat: 'def', value: -0.15, turns: 2 } } },
  sweep:   { name: 'ほうきでサッサッ', anim: 'sweep', obj: 'dust', type: 'blast', mult: 0.9, adj: 0.5 },
  dust:    { name: 'ほこりはらい', anim: 'breath', obj: 'dust',   type: 'aoe',    mult: 0.5, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_dust', name: 'けほけほ', stat: 'atk', value: -0.15, turns: 2 } } },
  hotSoup: { name: 'あつあつスープ', anim: 'toss', obj: 'soup', elem: 'fire', type: 'single', mult: 0.9, eff: { kind: 'dot', type: 'burn', mult: 0.35, turns: 2, chance: 0.6 } },
  waxDrip: { name: 'ろうのしずく', anim: 'rain', obj: 'wax',   type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_wax', name: 'ろうでかちかち', stat: 'spd', value: -0.15, turns: 2 } } },
  tangle:  { name: 'こんがらがり', anim: 'whirl',   type: 'single', mult: 0.8, eff: { kind: 'buff', chance: 0.7, buff: { key: 'e_tangle', name: 'からまった', stat: 'spd', value: -0.2, turns: 2 } } },
  darkPaw: { name: '暗黒ねこパンチ', anim: 'punch', elem: 'quantum', type: 'single', mult: 1.5 },
  darkWave:{ name: '魔王の波動', anim: 'shout', obj: 'dark', elem: 'quantum',     type: 'aoe',    mult: 0.8 },
  maouCharge: { name: '「余と遊べ……！」', type: 'charge', next: 'maouNova' },
  maouNova:{ name: 'さびしんぼメテオ', anim: 'rain', obj: 'meteor', elem: 'quantum', type: 'aoe', mult: 1.6 },
  // 魔王軍四天王（ゆるい）
  ladlePoka: { name: 'おたまでポカリ', anim: 'punch', type: 'single', mult: 1.4 },
  curryRain: { name: '魔界カレーのおすそわけ', anim: 'rain', obj: 'curry', type: 'aoe', mult: 0.7, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_curry', name: 'おなかいっぱい', stat: 'spd', value: -0.15, turns: 2 } } },
  simmer:  { name: '大なべを、ぐつぐつ煮こんでいる…', type: 'charge', next: 'curryNova' },
  curryNova: { name: 'おかわり自由', anim: 'pot', type: 'aoe', mult: 1.4 },
  hotLadle: { name: 'あつあつおたま', anim: 'punch', elem: 'fire', type: 'single', mult: 1.4, eff: { kind: 'dot', type: 'burn', mult: 0.4, turns: 2, chance: 0.7 } },
  spicyRain: { name: '激辛カレーの雨', anim: 'rain', obj: 'spicy', elem: 'fire', type: 'aoe', mult: 0.75, eff: { kind: 'dot', type: 'burn', mult: 0.3, turns: 2, chance: 0.5 } },
  pillowSlam: { name: 'まくらアタック', anim: 'sweep', obj: 'feather', type: 'blast', mult: 1.1, adj: 0.5 },
  snore:   { name: 'ごうおんいびき', anim: 'shout', glyph: 'Z', type: 'aoe', mult: 0.6, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_snore', name: 'ねむけ', stat: 'spd', value: -0.2, turns: 1 } } },
  nidone:  { name: '二度寝', type: 'rest', value: 0.08 },
  nemuCharge: { name: 'ふとんにくるまって、もぞもぞしている…', type: 'charge', next: 'negaeri' },
  negaeri: { name: '寝返り大回転', anim: 'negaeri', type: 'aoe', mult: 1.4 },
  snip:    { name: 'せんていバサミ', anim: 'slash', glyph: 'x', type: 'single', mult: 1.3 },
  leafStorm: { name: '落ち葉そうじ旋風', anim: 'whirl', type: 'aoe', mult: 0.7, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_leaf', name: 'はっぱまみれ', stat: 'atk', value: -0.15, turns: 2 } } },
  pruneCharge: { name: 'はさみを、しゃきしゃき研いでいる…', type: 'charge', next: 'topiary' },
  topiary: { name: '猫の形に刈りこみ', anim: 'topiary', type: 'aoe', mult: 1.45 },
  yuagariPunch: { name: '湯上がりパンチ', anim: 'punch', type: 'single', mult: 1.45 },
  manjuToss: { name: 'おみやげまんじゅう投げ', anim: 'toss', obj: 'manju', type: 'blast', mult: 1.0, adj: 0.5, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_manju', name: 'もちもち', stat: 'spd', value: -0.15, turns: 2 } } },
  onsenCharge: { name: '「ふう……いい湯だった……」と、くつろいでいる…', type: 'charge', next: 'daichiQuake' },
  daichiQuake: { name: '大地ゆらし', anim: 'fissure', type: 'aoe', mult: 1.5 },
  hollow:  { name: 'うつろな声', anim: 'gloom', elem: 'quantum',     type: 'single', mult: 1.0, eff: { kind: 'energy', chance: 1, value: 15 } },
  // コドク：仲間を引き離す
  isolate: { name: '孤独', anim: 'sever', elem: 'quantum',           type: 'single', mult: 1.0, eff: { kind: 'isolate', chance: 1 } },
  despair: { name: '絶望', anim: 'tide', elem: 'quantum',           type: 'aoe',    mult: 0.9 },
  // コドクの手下の全体技（絶望はコドク専用）
  voidSwirl: { name: 'からっぽの渦', anim: 'vortex', elem: 'quantum', type: 'aoe', mult: 0.9 },
  shadowRake: { name: '影の爪あと', anim: 'rake', elem: 'quantum', type: 'aoe', mult: 0.9 },
  doubt:   { name: '疑心', anim: 'crack', elem: 'quantum',           type: 'aoe',    mult: 0.6, eff: { kind: 'bondDrain', chance: 1, value: 20 } },
  erase:   { name: '思い出消去', anim: 'shatter', elem: 'quantum',     type: 'single', mult: 1.2, eff: { kind: 'energy', chance: 1, value: 40 } },
  kodokuCharge: { name: 'すべての声が遠ざかっていく…', type: 'charge', next: 'kodokuNova' },
  kodokuNova: { name: 'ひとりぼっちの世界', anim: 'dome', elem: 'quantum', type: 'aoe', mult: 1.7 },
  // ラスボスのコドクだけの大技（コドクの影は、ひとりぼっちの世界のまま）
  eclipseCharge: { name: '空から、光が消えていく…', type: 'charge', next: 'eclipse' },
  eclipse: { name: '孤独の月蝕', anim: 'eclipse', elem: 'quantum', type: 'aoe', mult: 1.7 },
  // ねこ神の夢
  purin:   { name: 'ぷるるんボディ', anim: 'quake', type: 'aoe', mult: 0.7 },
  splash:  { name: 'ぴちぴちビンタ', anim: 'punch', elem: 'ice', type: 'single', mult: 1.2 },
  chatter: { name: 'おしゃべり攻撃', anim: 'shout', glyph: '…', type: 'aoe', mult: 0.5, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_chat', name: 'うんざり', stat: 'atk', value: -0.15, turns: 2 } } },
  swarm:   { name: '100匹でおしくらまんじゅう', anim: 'stampede', glyph: 'swarm', type: 'aoe', mult: 0.8 },
  copycat: { name: 'ものまねパンチ', anim: 'punch', type: 'single', mult: 1.3 },
  plushHug:{ name: 'もふもふハグ', anim: 'press', glyph: 'heart',   type: 'single', mult: 1.0, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_hug', name: 'ふわふわ', stat: 'spd', value: -0.15, turns: 2 } } },
  godPaw:  { name: '神のねこパンチ', anim: 'punch', elem: 'imaginary', type: 'blast', mult: 1.4, adj: 0.7 },
  godCharge: { name: '「めんどうだが、少し本気を出そう」', type: 'charge', next: 'godNova' },
  godNova: { name: '天地創造にゃんこ', anim: 'creation', elem: 'imaginary', type: 'aoe', mult: 1.8 },
};

// ------------------------------------------------------------
//  敵（shape は js/gfx/monsters.js の形）
//  boss の山場：turn は HP が at を切ったとき一度だけ起きる（HP は戻らない）。phases は HP が戻る形態変化で、守護神・コドク・ねこ神だけ。
//  turn の中身：summon 呼ぶ / buffs ずっと続く強化（debuff は弱体として表示）/ weak 弱点替え / moves 技の入れ替え / heal 回復 / guard 被ダメ減 / regen 毎ターン回復
//  strip 味方の強化とバリアを消す / isolate 味方みなをひとりぼっちに。until（'break' 弱点撃破 / 'summon' 呼んだ仲間が全滅）で guard・regen・moves が解け、end を言う
// ------------------------------------------------------------
const ENEMIES = {
  // 第一章：ほしふる森
  slime:    { name: 'ぷにスライム',   shape: 'slime',    color: '#7ee0a0', hp: 2800, atk: 900,  spd: 90,  tough: 20, weak: ['fire', 'lightning', 'physical'], moves: [['puni', 3], ['strike', 1]] },
  kinoko:   { name: 'ねこまたきのこ', shape: 'mushroom', color: '#e87a9a', hp: 3200, atk: 950,  spd: 85,  tough: 30, weak: ['fire', 'physical', 'imaginary'], moves: [['strike', 2], ['spore', 1]] },
  risu:     { name: 'おこりリス',     shape: 'squirrel', color: '#e0a060', hp: 2800, atk: 1000, spd: 115, tough: 20, weak: ['ice', 'physical', 'quantum'], moves: [['acorn', 2], ['bite', 1]] },
  nezumi:   { name: 'はぐれネズミ',   shape: 'rat',      color: '#a8a4b8', hp: 3000, atk: 1000, spd: 105, tough: 30, weak: ['fire', 'physical', 'imaginary'], moves: [['cheese', 2], ['bite', 1]] },
  king_nezumi: { name: 'キングネズミ', shape: 'kingrat', color: '#d8a840', boss: true, hp: 31000, atk: 1150, spd: 100, tough: 110, eres: 0.25, weak: ['fire', 'physical', 'lightning'],
    turn: { at: 0.5, name: '子分総動員', cry: 'キングネズミ「子分ども、集まれチュウ！」', summon: ['nezumi', 2], moves: [['kingPress', 2], ['ratCharge', 1], ['summon', 2]] }, summon: 'nezumi', moves: [['kingPress', 2], ['aoe', 1], ['ratCharge', 1], ['summon', 1]] },
  // 第二章：ミャオ街道
  karasu:   { name: 'いたずらカラス', shape: 'crow',     color: '#4a4a6a', hp: 3000, atk: 1050, spd: 125, tough: 20, weak: ['lightning', 'imaginary', 'fire'], moves: [['peck', 2], ['slow', 1]] },
  iwa:      { name: 'ごろごろ岩',     shape: 'rock',     color: '#9a8a7a', hp: 5200, atk: 1000, spd: 75,  tough: 40, weak: ['physical', 'lightning', 'ice'], moves: [['roll', 2], ['heavy', 1]] },
  noraInu:  { name: 'のら犬',         shape: 'dog',      color: '#b08050', hp: 3600, atk: 1100, spd: 100, tough: 30, weak: ['fire', 'quantum', 'physical'], moves: [['bite', 2], ['howl', 1]] },
  inoshishi:{ name: 'ばくそうイノシシ', shape: 'boar',   color: '#8a5a3a', boss: true, hp: 37000, atk: 1250, spd: 95, tough: 130, eres: 0.25, weak: ['ice', 'lightning', 'fire'],
    turn: { at: 0.5, name: '暴走', cry: 'ばくそうイノシシは鼻息あらく地面をけった！「もう止まれねえブヒ！」', buffs: [{ stat: 'spd', value: 0.35 }, { stat: 'atk', value: 0.2 }, { stat: 'vuln', value: 0.25, debuff: true }] }, summon: 'iwa', moves: [['rush', 2], ['aoe', 1], ['boarCharge', 1], ['summon', 1]] },
  // 第三章：笑顔の塔
  ghost:    { name: 'ゲラゲラゴースト', shape: 'ghost',  color: '#e8e8ff', hp: 3800, atk: 1150, spd: 110, tough: 30, weak: ['imaginary', 'fire', 'ice'], moves: [['giggle', 2], ['strike', 1]] },
  mimic:    { name: 'クスクスミミック', shape: 'mimic',  color: '#d8a040', elite: true, hp: 12000, atk: 1250, spd: 90, tough: 80, eres: 0.2, weak: ['lightning', 'physical', 'ice'], moves: [['chomp', 2], ['giggle', 1], ['heavy', 1]] },
  piero:    { name: '泣き虫ピエロ',   shape: 'clown',    color: '#ff7aa8', boss: true, hp: 48000, atk: 1350, spd: 104, tough: 160, eres: 0.3, weak: ['imaginary', 'fire', 'lightning'],
    turn: { at: 0.5, name: '泣き顔の仮面', cry: '泣き虫ピエロ「笑ってくれないなら……みんな泣かせてやる！」', weak: ['ice', 'fire', 'physical'], moves: [['tears', 2], ['laughgas', 1], ['juggle', 1], ['showtime', 1], ['summon', 1]] }, summon: 'ghost', moves: [['laughgas', 2], ['juggle', 2], ['tears', 1], ['showtime', 1], ['summon', 1]] },
  // 第四章：くろねこ谷・黒影洞窟
  kageneko: { name: 'かげねこ',       shape: 'shadowcat', color: '#6a5a9a', hp: 4200, atk: 1250, spd: 110, tough: 30, weak: ['imaginary', 'fire', 'physical'], moves: [['shade', 2], ['strike', 1]] },
  yoroi:    { name: 'さまよう鎧',     shape: 'armor',    color: '#8a8aa8', elite: true, hp: 15000, atk: 1350, spd: 85, tough: 90, eres: 0.2, weak: ['lightning', 'imaginary', 'fire'], moves: [['cleave', 2], ['blast', 1], ['aoe', 1]] },
  kako_kuro:{ name: '過去の影クロ',   shape: 'shadowkuro', color: '#7a5aff', boss: true, hp: 56000, atk: 1450, spd: 105, tough: 170, eres: 0.3, weak: ['imaginary', 'fire', 'lightning'],
    turn: { at: 0.5, name: '心の殻', cry: '過去の影クロ「近づくな……近づくなッ！」', guard: 0.6, until: 'break', end: ['殻が割れた！', '「……っ。なんで、そこまで……」'] }, summon: 'kageneko', moves: [['lonely', 2], ['pastEcho', 2], ['kuroCharge', 1], ['summon', 1]] },
  // 第五章：古代遺跡
  sekizou:  { name: '石のねこ像',     shape: 'statue',   color: '#c8b890', hp: 5600, atk: 1250, spd: 80, tough: 40, weak: ['physical', 'lightning', 'ice'], moves: [['stoneGaze', 2], ['heavy', 1]] },
  // 苔むす古道にだけ出る（石のねこ像は、外庭で目をさますまで古道には出ない）
  kokegame: { name: 'こけむしガメ',   shape: 'turtle',   color: '#7aa860', hp: 6000, atk: 1200, spd: 70, tough: 40, weak: ['fire', 'ice', 'lightning'], moves: [['mossDust', 2], ['shellDrop', 1]] },
  hotaru:   { name: '古代ほたる',     shape: 'wisp',     color: '#8affe0', hp: 4000, atk: 1300, spd: 120, tough: 30, weak: ['quantum', 'ice', 'fire'], moves: [['beam', 2], ['shock', 1]] },
  guardian: { name: '遺跡の守護神',   shape: 'guardian', color: '#e8c870', boss: true, hp: 52000, atk: 1500, spd: 100, tough: 180, eres: 0.3, weak: ['quantum', 'physical', 'lightning'],
    phases: [{ weak: ['fire', 'ice', 'lightning'], cry: '守護神の封印紋が、赤く燃えあがった！' }], summon: 'sekizou', moves: [['beam', 2], ['stoneGaze', 1], ['sealCharge', 1], ['summon', 1]] },
  // 第六章：魔王領
  mazoku:   { name: '魔族兵',         shape: 'imp',      color: '#9a7ae8', hp: 5000, atk: 1350, spd: 105, tough: 30, weak: ['imaginary', 'fire', 'physical'], moves: [['strike', 2], ['paperwork', 1]] },
  // 保健係（ナース）は、魔王城の保健の間（6-2）にしか出ない
  kangoshi: { name: '魔族の保健係',   shape: 'impnurse', color: '#ff9ac8', hp: 4600, atk: 1300, spd: 110, tough: 30, weak: ['quantum', 'ice', 'physical'], moves: [['checkup', 2], ['strike', 1]] },
  monban:   { name: '魔族の門番',     shape: 'impguard', color: '#c86a8a', hp: 6200, atk: 1300, spd: 90,  tough: 40, weak: ['fire', 'lightning', 'quantum'], moves: [['strike', 2], ['halt', 1], ['heavy', 1]] },
  jarashi:  { name: '魔界ねこじゃらし', shape: 'jarashi', color: '#c8a0ff', hp: 4200, atk: 1300, spd: 120, tough: 30, weak: ['fire', 'ice', 'physical'], moves: [['swish', 2], ['tickle', 1]] },
  souji:    { name: '魔族の掃除係',   shape: 'impmaid',  color: '#7ac8d8', hp: 4600, atk: 1300, spd: 115, tough: 30, weak: ['fire', 'imaginary', 'ice'], moves: [['sweep', 2], ['dust', 1]] },
  ryouri:   { name: '魔族の料理番',   shape: 'impcook',  color: '#e8a050', hp: 5400, atk: 1400, spd: 100, tough: 30, weak: ['ice', 'physical', 'quantum'], moves: [['strike', 1], ['hotSoup', 2]] },
  shokudai: { name: '生きている燭台', shape: 'candle',   color: '#ff8ad8', hp: 4000, atk: 1350, spd: 110, tough: 30, weak: ['ice', 'physical', 'imaginary'], moves: [['burn', 2], ['waxDrip', 1]] },
  keito:    { name: 'ころころ毛糸玉', shape: 'yarn',     color: '#ff7a9a', hp: 4400, atk: 1300, spd: 115, tough: 30, weak: ['fire', 'lightning', 'quantum'], moves: [['tangle', 2], ['roll', 1]] },
  nuigurumi:{ name: 'マオウのぬいぐるみ', shape: 'maouplush', color: '#9a6ad8', hp: 5000, atk: 1350, spd: 100, tough: 30, weak: ['fire', 'lightning', 'physical'], moves: [['plushHug', 2], ['strike', 1]] },
  kacchu:   { name: '魔王城の飾り甲冑', shape: 'maouarmor', color: '#a890d0', elite: true, hp: 17000, atk: 1400, spd: 85, tough: 90, eres: 0.2, weak: ['lightning', 'quantum', 'ice'], moves: [['cleave', 2], ['blast', 1], ['halt', 1]] },
  kanbu:    { name: '魔族の中間管理職', shape: 'impboss', color: '#6a4ab8', elite: true, hp: 18000, atk: 1450, spd: 95, tough: 100, eres: 0.2, weak: ['imaginary', 'lightning', 'fire'], moves: [['paperwork', 2], ['cleave', 1], ['aoe', 1]] },
  // 魔王軍四天王
  k_gutsu:  { name: '四天王 炎のグツグツ', shape: 'k_gutsu', color: '#ff8a4a', boss: true, hp: 42000, atk: 1450, spd: 100, tough: 150, eres: 0.25, weak: ['ice', 'physical', 'quantum'],
    turn: { at: 0.5, name: '強火', cry: 'グツグツの大鍋が煮えたぎった！「ここからは強火だァ！」', moves: [['hotLadle', 2], ['spicyRain', 2], ['simmer', 1], ['summon', 1]] }, summon: 'mazoku', moves: [['ladlePoka', 2], ['curryRain', 2], ['simmer', 1], ['summon', 1]] },
  k_nemu:   { name: '四天王 眠りのネムネム', shape: 'k_nemu', color: '#8ab8ff', boss: true, hp: 40000, atk: 1450, spd: 92, tough: 150, eres: 0.25, weak: ['fire', 'lightning', 'physical'],
    turn: { at: 0.5, name: '熟睡', cry: 'ネムネムは、すやすや眠りこんでしまった……「……むにゃ……あと五分……」', regen: 0.05, until: 'break', moves: [['snore', 2], ['nidone', 1], ['nemuCharge', 1]], end: ['目をさました！', '「……はっ！　寝てない、寝てないぞ！」'] }, summon: 'mazoku', moves: [['pillowSlam', 2], ['snore', 2], ['nidone', 1], ['nemuCharge', 1]] },
  k_choki:  { name: '四天王 風のチョキチョキ', shape: 'k_choki', color: '#6ad88a', boss: true, hp: 45000, atk: 1500, spd: 104, tough: 160, eres: 0.25, weak: ['fire', 'quantum', 'physical'],
    turn: { at: 0.5, name: '剪定', cry: 'チョキチョキ「ほっほっ、のびすぎた枝は、切りそろえんとな！」', strip: true, buffs: [{ stat: 'spd', value: 0.2 }] }, summon: 'mazoku', moves: [['snip', 2], ['leafStorm', 2], ['pruneCharge', 1], ['summon', 1]] },
  k_dodon:  { name: '四天王 大地のドドン', shape: 'k_dodon', color: '#c8884a', boss: true, hp: 44000, atk: 1500, spd: 98, tough: 170, eres: 0.25, weak: ['fire', 'ice', 'quantum'],
    turn: { at: 0.5, name: 'ひとっ風呂', cry: 'ドドン「ちょいと、ひとっ風呂……ぬおお、のぼせてきたわい！」', heal: 0.2, buffs: [{ stat: 'atk', value: 0.35 }, { stat: 'spd', value: -0.2, debuff: true }] }, summon: 'mazoku', moves: [['yuagariPunch', 2], ['manjuToss', 2], ['onsenCharge', 1], ['summon', 1]] },
  boss_maou:{ name: '魔王マオウ',     shape: 'maou',     color: '#b04aff', boss: true, lure: true, hp: 84000, atk: 1600, spd: 108, tough: 190, eres: 0.35, weak: ['imaginary', 'fire', 'physical'],
    turn: { at: 0.5, name: 'ぬいぐるみの守り', cry: '魔王マオウ「ぬいぐるみたちよ……余のそばにいろ！」', summon: ['nuigurumi', 2], guard: 0.5, until: 'summon', end: ['守りが消えた！', '「……みんな、いなくなった……」'] }, summon: 'mazoku', moves: [['darkPaw', 2], ['darkWave', 2], ['maouCharge', 1], ['summon', 1]] },
  // 第七章：にゃんだーの樹の根
  kakera:   { name: 'コドクのかけら', shape: 'shard',    color: '#5a4a8a', hp: 6200, atk: 1500, spd: 110, tough: 40, weak: ['imaginary', 'fire', 'lightning'], moves: [['hollow', 2], ['strike', 1]] },
  utsuro:   { name: '虚ろ',           shape: 'void',     color: '#3a2a5a', elite: true, hp: 22000, atk: 1600, spd: 100, tough: 110, eres: 0.25, weak: ['imaginary', 'lightning', 'physical'], moves: [['hollow', 2], ['voidSwirl', 1], ['cleave', 1]] },
  kodoku_kage: { name: 'コドクの影',  shape: 'kodoku',   color: '#2a1a4a', boss: true, hp: 100000, atk: 1700, spd: 105, tough: 200, eres: 0.35, weak: ['imaginary', 'fire', 'physical'],
    turn: { at: 0.5, name: '孤独の闇', cry: 'コドクの影がふくれあがった！「……見るな。わたしを、見るな」', isolate: true, buffs: [{ stat: 'atk', value: 0.2 }] }, summon: 'kakera', moves: [['isolate', 2], ['despair', 2], ['erase', 1], ['kodokuCharge', 1], ['summon', 1]] },
  // 第八章：世界の果て
  kagejuu:  { name: 'コドクの獣',     shape: 'shadowbeast', color: '#4a2a6a', hp: 7200, atk: 1650, spd: 108, tough: 40, weak: ['imaginary', 'fire', 'physical'], moves: [['bite', 2], ['shadowRake', 1]] },
  kodoku:   { name: 'コドク',         shape: 'kodoku',   color: '#1a0a36', boss: true, final: true, hp: 80000, atk: 1800, spd: 112, tough: 220, eres: 0.4, weak: ['imaginary', 'fire', 'physical'],
    phases: [{ weak: ['lightning', 'ice', 'quantum'], cry: 'コドク「まだ手を伸ばすか。ならば、闇の底まで沈めてやろう」' }, { weak: ['imaginary', 'ice', 'fire'], cry: 'コドク「消えろ……ひとりのほうが、楽だと言っている！」' }], summon: 'kakera', moves: [['isolate', 2], ['despair', 2], ['doubt', 1], ['erase', 1], ['eclipseCharge', 1], ['summon', 1]] },
  // 隠しダンジョン：ねこ神の夢
  purin:    { name: '超巨大プリン',   shape: 'pudding',  color: '#ffd27a', elite: true, hp: 30000, atk: 1600, spd: 80, tough: 120, eres: 0.2, weak: ['fire', 'lightning', 'physical'], moves: [['purin', 2], ['heavy', 1]] },
  sakana:   { name: '喋る魚',         shape: 'fish',     color: '#6ac8ff', hp: 8000, atk: 1700, spd: 115, tough: 40, weak: ['fire', 'lightning', 'physical'], moves: [['splash', 2], ['chatter', 1]] },
  tamas:    { name: '100匹のタマ',    shape: 'tamas',    color: '#fff4d8', elite: true, hp: 36000, atk: 1650, spd: 95, tough: 120, eres: 0.2, weak: ['quantum', 'fire', 'ice'], moves: [['swarm', 2], ['heavy', 1]] },
  nisemike: { name: 'ミケそっくりの偽物', shape: 'fakemike', color: '#f29a3e', hp: 9000, atk: 1800, spd: 105, tough: 40, weak: ['ice', 'quantum', 'physical'], moves: [['copycat', 2], ['strike', 1]] },
  kuroPlush:{ name: 'クロのぬいぐるみ', shape: 'plush',  color: '#3a3844', hp: 9500, atk: 1650, spd: 100, tough: 40, weak: ['fire', 'ice', 'lightning'], moves: [['plushHug', 2], ['strike', 1]] },
  nekogami: { name: 'ねこ神',         shape: 'nekogami', color: '#ffe08a', boss: true, hp: 110000, atk: 1900, spd: 112, tough: 240, eres: 0.4, weak: ['quantum', 'physical', 'ice'],
    phases: [{ weak: ['fire', 'lightning', 'ice'], cry: 'ねこ神「ふむ。少しは本気で遊んでやろう」' }, { weak: ['imaginary', 'quantum', 'physical'], cry: 'ねこ神「よかろう。世界をもう一度作るつもりで、相手をしてやる！」' }], summon: 'sakana', moves: [['godPaw', 2], ['chatter', 1], ['purin', 1], ['godCharge', 1], ['summon', 1]] },
};

// ------------------------------------------------------------
//  章とステージ（物語の戦闘）
//  bg：戦闘・探索の空と光（js/gfx/env.js の THEMES）
//  guests：まだ仲間になっていない、または一行を離れている（STORY の away）が、物語でいっしょに戦う子（js/screens.js の battleTeam）
// ------------------------------------------------------------
const CHAPTERS = [
  { id: 'c1', name: 'ぽかぽか村・ほしふる森', bg: 'meadow', desc: '流星が落ちた夜が明けて、ミケの冒険が始まる。',
    stages: [
      { id: '1-1', name: 'ほしふる森の入口', lv: 1,  waves: [['slime', 'slime'], ['slime', 'kinoko', 'slime']] },
      { id: '1-2', name: 'ほしふる森の奥',   lv: 3,  waves: [['risu', 'kinoko', 'risu'], ['nezumi', 'slime', 'nezumi']] },
      { id: '1-3', name: 'ネズミの王国',     lv: 6,  boss: true, waves: [['nezumi', 'nezumi', 'nezumi'], ['king_nezumi']] },
    ] },
  { id: 'c2', name: 'ミャオ街道', bg: 'road', desc: '世界の異変を調べる旅。街道の先で、ふしぎな仲間と出会う。',
    stages: [
      { id: '2-1', name: '街道の丘',         lv: 8,  guests: ['shiro'], waves: [['karasu', 'noraInu'], ['noraInu', 'karasu', 'noraInu']] },
      { id: '2-2', name: 'まどろみの林',     lv: 11, waves: [['noraInu', 'karasu', 'noraInu'], ['kinoko', 'noraInu', 'kinoko']] },
      { id: '2-3', name: '風車の畑',         lv: 13, guests: ['shiro'], waves: [['karasu', 'noraInu', 'karasu'], ['noraInu', 'karasu', 'noraInu']] },
      { id: '2-4', name: 'ごろごろ切り通し', lv: 15, boss: true, waves: [['iwa', 'noraInu', 'iwa'], ['inoshishi']] },
    ] },
  { id: 'c3', name: 'ニャハハ王国', bg: 'kingdom', desc: '名前とは正反対に、誰も笑わない街。笑顔の塔に何かがいる。',
    stages: [
      { id: '3-1', name: '笑顔の塔・下層',   lv: 17, waves: [['ghost', 'ghost'], ['ghost', 'mimic', 'ghost']] },
      { id: '3-2', name: '笑顔の塔・上層',   lv: 20, waves: [['mimic', 'ghost'], ['ghost', 'ghost', 'ghost', 'ghost']] },
      { id: '3-3', name: '笑顔の塔・大舞台', lv: 23, boss: true, waves: [['ghost', 'mimic', 'ghost'], ['piero']] },
    ] },
  { id: 'c4', name: 'くろねこ谷', bg: 'valley', desc: 'クロの故郷。黒影洞窟の奥に、過去が眠っている。',
    stages: [
      { id: '4-1', name: '谷の墓標',         lv: 26, waves: [['kageneko', 'kageneko'], ['kageneko', 'yoroi', 'kageneko']] },
      { id: '4-2', name: '黒影洞窟',         lv: 29, waves: [['yoroi', 'kageneko'], ['kageneko', 'kageneko', 'kageneko']] },
      { id: '4-3', name: '黒影洞窟・最奥',   lv: 32, boss: true, waves: [['kageneko', 'yoroi', 'kageneko'], ['kako_kuro']] },
    ] },
  { id: 'c5', name: '古代遺跡', bg: 'ruins', desc: 'クロの旧仲間の記録が示した場所。壁画が、世界の歴史を語る。',
    stages: [
      { id: '5-1', name: '遺跡の外庭',       lv: 35, waves: [['sekizou', 'hotaru'], ['hotaru', 'sekizou', 'hotaru']] },
      { id: '5-2', name: '壁画の大広間',     lv: 38, waves: [['sekizou', 'sekizou'], ['hotaru', 'hotaru', 'hotaru']] },
      { id: '5-3', name: '封印の間',         lv: 41, boss: true, waves: [['hotaru', 'sekizou', 'hotaru'], ['guardian']] },
    ] },
  { id: 'c6', name: '魔王領', bg: 'demon', desc: '怖い場所のはずなのに、なんだか妙にコミカル。',
    stages: [
      { id: '6-1', name: '魔王領の門',       lv: 44, waves: [['mazoku', 'jarashi'], ['monban', 'kanbu', 'mazoku']] },
      { id: '6-2', name: '魔王城の保健の間', lv: 46, waves: [['kangoshi', 'mazoku', 'kangoshi'], ['kanbu', 'mazoku']] },
      { id: '6-k1', name: '四天王・炎のグツグツ', lv: 47, boss: true, waves: [['mazoku', 'ryouri', 'mazoku'], ['k_gutsu']] },
      { id: '6-k2', name: '四天王・眠りのネムネム', lv: 48, boss: true, waves: [['mazoku', 'shokudai'], ['k_nemu']] },
      { id: '6-k3', name: '四天王・風のチョキチョキ', lv: 48, boss: true, waves: [['jarashi', 'mazoku', 'jarashi'], ['k_choki']] },
      { id: '6-k4', name: '四天王・大地のドドン', lv: 49, boss: true, waves: [['souji', 'kacchu', 'nuigurumi'], ['k_dodon']] },
      { id: '6-3', name: '魔王の間',         lv: 50, boss: true, waves: [['mazoku', 'kanbu', 'mazoku'], ['boss_maou']] },
    ] },
  { id: 'c7', name: 'にゃんだーの樹', bg: 'tree', desc: 'ぽかぽか村の南にそびえる生命樹。その根元に、黒い何かがいる。',
    stages: [
      { id: '7-1', name: '樹の根の道',       lv: 53, waves: [['kakera', 'kakera'], ['kakera', 'utsuro', 'kakera']] },
      { id: '7-2', name: '樹の地下',         lv: 56, waves: [['utsuro', 'kakera'], ['kakera', 'kakera', 'kakera']] },
      { id: '7-3', name: '根元の闇',         lv: 59, boss: true, waves: [['kakera', 'utsuro', 'kakera'], ['kodoku_kage']] },
    ] },
  { id: 'c8', name: '世界の果て', bg: 'end', desc: '旅で出会った猫たちが集まる。最後の戦いへ。',
    stages: [
      { id: '8-1', name: 'ぽかぽか村の防衛', lv: 62, waves: [['kagejuu', 'kagejuu'], ['kagejuu', 'utsuro', 'kagejuu']] },
      { id: '8-2', name: '世界の果ての道',   lv: 66, waves: [['kakera', 'kagejuu', 'kakera'], ['utsuro', 'utsuro']] },
      { id: '8-3', name: 'コドク',           lv: 70, boss: true, waves: [['kagejuu', 'utsuro', 'kagejuu'], ['kodoku']] },
    ] },
  { id: 'c9', name: 'ねこ神の夢', bg: 'dream', desc: 'クリア後に見つかる、ふしぎな夢の世界。この世界を作った者が待つ。', hidden: true,
    stages: [
      { id: '9-1', name: '夢の入口',         lv: 72, waves: [['sakana', 'sakana'], ['purin']] },
      { id: '9-2', name: 'へんてこ回廊',     lv: 76, waves: [['nisemike', 'kuroPlush'], ['tamas']] },
      { id: '9-3', name: '夢の玉座',         lv: 80, boss: true, waves: [['nisemike', 'sakana', 'kuroPlush'], ['nekogami']] },
    ] },
];

// ------------------------------------------------------------
//  戦闘で使うどうぐ（R キー）。持っている数は Save.data.items。道具屋で買える（ひとつ ITEM_MAX こまで）
//  target：ally 味方単体 / allies 味方全体 / down 戦闘不能の味方 / single 敵単体。
//  col：使うときの演出の色。key：だいじなもの（使ってもなくならない。has で持っているか決まる）。once：その敵には一戦闘に一度だけ
// ------------------------------------------------------------
const ITEM_MAX = 9;
const ITEMS = {
  onigiri:  { name: 'にぼしおにぎり', icon: '🍙', col: '#fff1c8', price: 40, target: 'ally', desc: '味方単体のHPを最大HPの30%回復する。',
    run: (B, s, t) => B.heal(s, t, t.maxHp * 0.3) },
  katsuo:   { name: 'かつおぶし', icon: '🪵', col: '#f0b070', price: 100, target: 'allies', desc: '味方全体のHPを最大HPの20%回復する。',
    run: (B, s) => B.aliveAllies().forEach(a => B.heal(s, a, a.maxHp * 0.2)) },
  matatabi: { name: 'またたびの実', icon: '🫐', col: '#ff8ad8', price: 80, target: 'ally', byEnergy: true, desc: '味方単体の必殺技エネルギーを最大値の30%ためる。',
    run: (B, s, t) => { B.gainEnergy(t, t.energyMax * 0.3); B.float(t, 'ごろごろ', 'info'); if (B.v) B.v.energyFx(t); } },
  nekokan:  { name: 'ねこ缶', icon: '🥫', col: '#ffd166', price: 150, target: 'down', desc: '戦闘不能の味方単体を、HP10%で起こす。',
    run: (B, s, t) => B.revive(t, 0.1) },
  jarashi:  { name: '猫じゃらし', icon: '🌾', key: true, has: () => storyCond('scene:c6_k3b'), target: 'single',
    desc: 'チョキチョキにもらった、だいじな猫じゃらし。敵の前で振る。猫じゃらしに目がない相手は、夢中になって1ターン行動できない（その敵には1戦闘に1回）。',
    run: (B, s, t) => {
      if (!t.def.lure || t.flags.lured) { B.float(t, 'みむきもしない', 'res'); return; }
      t.flags.lured = true; t.flags.skip = 1;
      B.announce(`${s.name}は猫じゃらしを振った！`, `${t.name}は夢中になっている……（1ターン行動できない）`, '#ffcf4a');
      B.say(t, '「……！？　こ、これは……っ」');
      if (B.v) B.v.lureFx(t);
    } },
};
// いま持っている数（だいじなものは、持っていれば 1）
function itemCount(id) {
  const it = ITEMS[id];
  if (it.key) return it.has() ? 1 : 0;
  return (Save.data.items || {})[id] || 0;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// ------------------------------------------------------------
//  戦闘中の掛け合い（友情Lv2から）。'話す子>相手'：[ひとこと, 返事]
// ------------------------------------------------------------
const BANTER = {
  'mike>kuro': [['「クロ、どっちが多く倒すか勝負ね！」', '「……面倒だ」'], ['「おなか空いてきた！」', '「……戦闘中だぞ」'], ['「クロの剣、かっこいいよね！」', '「……前を見ろ」']],
  'kuro>mike': [['「……突っ込みすぎるな」', '「だいじょうぶ、クロがいるもん！」'], ['「……おい、魚をくわえたまま戦うな」', '「ふぁい！」']],
  'mike>shiro': [['「シロ、今度は魚じゃなくて火を出してね」', '「う、うるさいわね！」'], ['「すごいじゃん天才！」', '「と、当然でしょ！」']],
  'shiro>mike': [['「わたしの魔法の邪魔しないでよね！」', '「へへん、そっちこそ！」'], ['「ミケ、口のまわりに何かついてるわよ」', '「味見のあと！」']],
  'mike>tama': [['「タマ、起きてる？」', '「……おきてる……すぴー」'], ['「タマ、危ないから後ろにいてね」', '「うん……ミケにいちゃん……」']],
  'tama>mike': [['「ミケ……いっしょに、あそぼ……」', '「これが終わったらね！」']],
  'mike>maou': [['「マオウ、元・魔王の本気を見せてよ！」', '「フン、言われずとも」'], ['「猫じゃらし、持ってきたよ」', '「……い、いらぬ！」']],
  'maou>mike': [['「勇者よ、余の前に立つな。……危ないから」', '「やさしいじゃん！」']],
  'kuro>shiro': [['「……魔法、落ち着いて撃て」', '「わ、わかってるわよ」'], ['「……さっきのは、よかった」', '「……え？　今ほめた？」']],
  'shiro>kuro': [['「クロ、前は任せたわよ」', '「……ああ」']],
  'kuro>tama': [['「……タマ、無理はするな」', '「……クロ、やさしいね……」'], ['「……寝るなら、俺の後ろで寝ろ」', '「……すぅ……」']],
  'tama>kuro': [['「クロ……けが、なおすね……」', '「……助かる」']],
  'shiro>tama': [['「タマ、ほら起きて！　ヒールの時間よ！」', '「……あと五分……」'], ['「タマ、はぐれないでね」', '「……うん……」']],
  'tama>shiro': [['「シロの魔法……きれい……」', '「で、でしょ！」']],
  'kuro>maou': [['「……」', '「……」'], ['「……やるか」', '「……うむ」']],
  'maou>kuro': [['「……黒猫」', '「……なんだ」']],
  'shiro>maou': [['「マオウ、あとで魔法の実験台になってね」', '「ことわる」'], ['「新しい魔法、試していい？」', '「よ、余に向けるでない！」']],
  'maou>shiro': [['「白いの、魔法が外れておるぞ」', '「わざとよ！」']],
  'tama>maou': [['「マオウも……いっしょにおひるね……する？」', '「……す、少しだけならな」']],
  'maou>tama': [['「……小さいの、下がっておれ」', '「……うん。ありがと……」']],
};
