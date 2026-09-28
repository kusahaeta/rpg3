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
  wind:      { name: '風',   color: '#5fe0a0', glyph: '風' },
  quantum:   { name: '闇',   color: '#a07bff', glyph: '闇' },
  imaginary: { name: '光',   color: '#fff0a8', glyph: '光' },
};

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

function charStats(key, lv, eid) {
  const b = CHARS[key].base, gear = (Save.data && Save.data.gear && Save.data.gear[key]) || 0;
  const f = lvFactor(lv) * (1 + 0.06 * eid);
  return {
    maxHp: b.hp * f * (1 + gear * 0.04), atk: b.atk * f * (1 + gear * 0.06), def: b.def * f * (1 + gear * 0.05), spd: b.spd,
    crit: b.crit || 0.05, critDmg: b.critDmg || 0.5, be: b.be || 0,
    ehr: b.ehr || 0, eres: b.eres || 0.1, err: 0,
  };
}

// ------------------------------------------------------------
//  にゃんこ（仲間）
//  look：2頭身のにゃんこの見た目（js/gfx/cats.js）。gear：武器と戦い方
//  target: single / blast / aoe / bounce / ally / allies / self
// ------------------------------------------------------------
const CHARS = {
  mike: {
    name: 'ミケ', title: '拾われ勇者の三毛猫', rarity: 5, elem: 'fire', path: 'destruction',
    base: { hp: 3800, atk: 1450, def: 1050, spd: 102, crit: 0.18, critDmg: 0.7, be: 0.3 },
    energyMax: 120,
    look: { fur: '#fffaf2', pattern: 'calico', patches: ['#f29a3e', '#3b302c'], eye: '#f2a91e', muzzle: '#ffffff', paws: '#ffffff', earIn: '#f7b3bd',
      cape: '#e0453a', capeIn: '#ffd76a', accent: '#ffd76a', band: '#e0453a' },
    gear: { weapon: 'sword', style: 'melee' },
    basic: { name: 'ねこパンチ', target: 'single', desc: '指定した敵単体に攻撃力100%の炎ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '勇者のつるぎ', target: 'blast', desc: '指定した敵単体に攻撃力130%、隣接する敵に攻撃力50%の炎ダメージ。',
      run: (B, s, t) => B.blast(s, t, 1.3, 0.5, 20, 10, 'skill') },
    ult: { name: '流星ねこぎり', target: 'single', desc: '指定した敵単体に攻撃力400%の炎ダメージ。味方全体の攻撃力+15%（2ターン）。',
      run: async (B, s, t) => {
        const r = await B.single(s, t, 4.0, 30, 'ult', { heavy: true });
        B.aliveAllies().forEach(a => B.buff(a, { key: 'mike_u', name: '勇者の背中', stat: 'atk', value: 0.15, turns: 2 }));
        return r;
      } },
    talent: { name: '食いしん坊', desc: '戦闘中1回、HPが40%を下回ると隠しておいた焼き魚を食べ、HPを30%回復。第七章からは、仲間の数だけ与ダメージ+5%。',
      onAllyHit(B, s, a) {
        if (a !== s || !s.alive || s.flags.ate || s.hp / s.maxHp >= 0.4) return;
        s.flags.ate = true; B.float(s, 'もぐもぐ', 'info'); B.heal(s, s, s.maxHp * 0.3);
      },
      dmgMod: B => (flag('mikeHero') ? 0.05 * B.aliveAllies().length : 0) },
    technique: { name: 'とびかかり', desc: '戦闘開始時、敵全体に攻撃力80%の炎ダメージ。',
      run: (B, s) => B.aoe(s, 0.8, 0, 'tech') },
    talkName: '猫じゃらし',
  },

  kuro: {
    name: 'クロ', title: '空から落ちてきた黒猫', rarity: 5, elem: 'physical', path: 'preservation',
    base: { hp: 4600, atk: 1250, def: 1500, spd: 96, crit: 0.1, critDmg: 0.6, eres: 0.2 },
    energyMax: 120,
    look: { fur: '#3d3b4a', pattern: 'solid', eye: '#ffd24a', muzzle: '#4a4858', paws: '#3d3b4a', earIn: '#8a6a78',
      scarf: '#8a2f3c', armor: '#5d6a86', accent: '#b8c6e8' },
    gear: { weapon: 'blade', style: 'melee' },
    basic: { name: '黒爪', target: 'single', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '孤高の剣', target: 'single',
      get desc() { return flag('kuroGuard') ? '【守護】味方全体に防御力55%+300のシールド（2ターン）。自身は敵に狙われやすくなる（2ターン）。' : '指定した敵単体に攻撃力200%の物理ダメージ。自身は敵に狙われやすくなる（2ターン）。'; },
      get target() { return flag('kuroGuard') ? 'allies' : 'single'; },
      run: async (B, s, t) => {
        B.buff(s, { key: 'kuro_aggro', name: '挑発', stat: 'aggro', value: 3, turns: 2 });
        if (flag('kuroGuard')) {
          const v = s.stat('def') * 0.55 + 300 * lvFactor(s.level);
          B.aliveAllies().forEach(a => B.shield(s, a, v, 2));
          B.float(s, '守護', 'info');
          return [];
        }
        return B.single(s, t, 2.0, 20, 'skill');
      } },
    ult: { name: '月影一閃', target: 'aoe', desc: '敵全体に攻撃力150%の物理ダメージ。自身に防御力80%のシールド（3ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.5, 20, 'ult', { heavy: true });
        B.shield(s, s, s.stat('def') * 0.8, 3);
        return r;
      } },
    talent: { name: '……面倒だ', desc: '自身の被ダメージ-15%。【守護】を覚えると、味方全体の被ダメージ-8%。',
      onBattleStart(B, s) {
        s.buffs.push({ key: 'kuro_t', name: '……面倒だ', stat: 'vuln', value: -0.15, turns: Infinity, hidden: true });
        if (flag('kuroGuard')) B.aliveAllies().filter(a => a !== s).forEach(a => a.buffs.push({ key: 'kuro_g', name: '守護', stat: 'vuln', value: -0.08, turns: Infinity, hidden: true }));
      } },
    technique: { name: '影の足音', desc: '戦闘開始時、敵全体の行動順を20%遅らせる。',
      run: (B, s) => B.aliveEnemies().forEach(e => { B.delay(e, 0.2); B.float(e, '行動遅延', 'info'); }) },
    ai(B, s) {
      if (flag('kuroGuard')) {
        const low = B.aliveAllies().filter(a => a.hp / a.maxHp < 0.6 && a.shield <= 0);
        if (B.sp >= 1 && (low.length >= 2 || B.sp >= 4)) return { kind: 'skill' };
        return { kind: 'basic' };
      }
      return null;
    },
    talkName: '仲間の話',
  },

  shiro: {
    name: 'シロ', title: '自称・天才魔法使い', rarity: 5, elem: 'lightning', path: 'erudition',
    base: { hp: 3200, atk: 1750, def: 750, spd: 104, crit: 0.3, critDmg: 0.9, ehr: 0.15 },
    energyMax: 130,
    look: { fur: '#ffffff', pattern: 'solid', eye: '#4aa8ff', eye2: '#f2c84a', muzzle: '#ffffff', paws: '#ffffff', earIn: '#ffb8c8',
      hat: '#6a4ad8', hatBand: '#ffd76a', cape: '#6a4ad8', capeIn: '#c9b8ff', accent: '#ffd76a', ribbon: '#ff8ab8' },
    gear: { weapon: 'wand', style: 'ranged' },
    basic: { name: 'マジックアロー', target: 'single', desc: '指定した敵単体に攻撃力100%の雷ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '天才魔法', target: 'single',
      desc: 'ファイア（敵全体に炎110%）・サンダー（単体に雷240%）・ブリザド（単体に氷140%、隣接に60%、凍結）のどれかを唱える。ただし25%の確率で失敗する（魚が降ってきたり、静電気が起きたりする）。',
      run: async (B, s, t) => {
        const spells = ['fire', 'thunder', 'blizzard'];
        const sp = pick(spells), fail = Math.random() < (flag('shiroGrow') ? 0.2 : 0.25);
        const name = { fire: 'ファイア', thunder: 'サンダー', blizzard: 'ブリザド' }[sp];
        let r = [];
        if (!fail) {
          B.announce('天才魔法', name + '！', ELEMENTS[{ fire: 'fire', thunder: 'lightning', blizzard: 'ice' }[sp]].color);
          if (sp === 'fire') r = await B.aoe(s, 1.1, 15, 'skill', { elem: 'fire' });
          else if (sp === 'thunder') r = await B.single(s, t, 2.4, 25, 'skill', { elem: 'lightning' });
          else { r = await B.blast(s, t, 1.4, 0.6, 20, 10, 'skill', { elem: 'ice' }); if (t.alive) B.freeze(s, t, 0.5, s.stat('atk') * 0.5); }
          return r;
        }
        // 失敗：でも、なにかは起きる
        if (sp === 'fire') {
          B.announce('ファイア……？', '魚が降ってきた！', '#8fd8ff');
          r = await B.aoe(s, 0.35, 5, 'skill', { elem: 'physical' });
          B.aliveAllies().forEach(a => { B.heal(s, a, a.maxHp * 0.06); });
          B.float(s, 'ちがう、そうじゃない！', 'info');
        } else if (sp === 'thunder') {
          B.announce('サンダー……？', 'パチッ（静電気）', '#ffd23c');
          r = await B.single(s, t, 0.5, 5, 'skill', { elem: 'lightning' });
          if (t.alive) B.debuff(s, t, 1, { key: 'static', name: '毛が逆立った', stat: 'spd', value: -0.12, turns: 2 });
        } else {
          B.announce('ブリザド……？', 'かき氷ができた', '#bfeaff');
          B.aliveAllies().forEach(a => B.shield(s, a, s.stat('atk') * 0.25, 2));
          B.float(s, 'おいしい……', 'info');
        }
        if (flag('shiroGrow') && B.aliveEnemies().length) {
          B.float(s, '失敗は成功のもと！', 'info');
          r = r.concat(await B.aoe(s, 0.9, 10, 'skill'));
        }
        return r;
      } },
    ult: { name: 'ちょう天才メテオ', target: 'aoe', desc: '敵全体に攻撃力230%の雷ダメージ、100%の基礎確率で感電（攻撃力40%、2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 2.3, 20, 'ult', { heavy: true });
        B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'shock', mult: 0.4, turns: 2, chance: 1 }));
        return r;
      } },
    talent: { name: 'プライド', desc: '敵を倒すと与ダメージ+10%（最大3層）。第七章からは、魔法の失敗が「成功のもと」になり追撃する。',
      onKill(B, s) { B.buff(s, { key: 'shiro_t', name: 'プライド', stat: 'dmg', value: 0.1, turns: Infinity, max: 3 }); } },
    technique: { name: 'ヒール', desc: '戦闘開始時、味方全体のHPを15%回復する。（シロの毛が爆発する）',
      run: (B, s) => { B.aliveAllies().forEach(a => B.heal(s, a, a.maxHp * 0.15)); B.float(s, '毛が爆発した！', 'info'); } },
    talkName: '魔法のうんちく',
  },

  tama: {
    name: 'タマ', title: 'のんびり屋のふしぎな子', rarity: 5, elem: 'imaginary', path: 'abundance',
    base: { hp: 4300, atk: 1050, def: 950, spd: 100, crit: 0.05, critDmg: 0.5 },
    energyMax: 100,
    look: { fur: '#fff4d8', pattern: 'point', patches: ['#e8c890'], eye: '#7ad07a', muzzle: '#fffaf0', paws: '#fffaf0', earIn: '#ffc8c8',
      sleepy: true, sprout: '#7ad86a', scarf: '#9ad88a', accent: '#fff0a8' },
    gear: { weapon: 'pillow', style: 'ranged' },
    basic: { name: 'ぽふっ', target: 'single', desc: '指定した敵単体に攻撃力100%の光ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: 'なでなで', target: 'ally', desc: '味方単体のHPをタマの最大HP25%+250回復し、他の味方は8%回復。',
      run: (B, s, t) => {
        B.heal(s, t, s.maxHp * 0.25 + 250 * lvFactor(s.level));
        B.aliveAllies().filter(a => a !== t).forEach(a => B.heal(s, a, s.maxHp * 0.08));
      } },
    ult: { name: 'おひさまのうた', target: 'allies', desc: '味方全体のHPをタマの最大HP30%回復し、デバフを1つ解除する。',
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
    talkName: 'おひるねのさそい',
  },

  maou: {
    name: 'マオウ', title: '尊大な元・魔王', rarity: 5, elem: 'quantum', path: 'nihility',
    base: { hp: 3900, atk: 1600, def: 1000, spd: 108, crit: 0.2, critDmg: 0.8, ehr: 0.3 },
    energyMax: 120,
    look: { fur: '#352c44', pattern: 'solid', eye: '#ff4a5a', muzzle: '#43385a', paws: '#352c44', earIn: '#7a4a6a',
      cape: '#3a1850', capeIn: '#d8303c', collar: true, horns: '#f0e6d0', crown: '#ffcf4a', accent: '#ffcf4a' },
    gear: { weapon: 'scepter', style: 'ranged' },
    scale: 1.08,
    basic: { name: '魔王のしっぽ', target: 'single', desc: '指定した敵単体に攻撃力100%の闇ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '魔王のいあつ', target: 'aoe', desc: '敵全体に攻撃力90%の闇ダメージ。70%の基礎確率で防御力-25%（2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 0.9, 10, 'skill');
        B.aliveEnemies().forEach(e => B.debuff(s, e, 0.7, { key: 'maou_def', name: '威圧', stat: 'defDown', value: 0.25, turns: 2 }));
        return r;
      } },
    ult: { name: '暗黒ねこ波', target: 'aoe', desc: '敵全体に攻撃力200%の闇ダメージ。味方全体の与ダメージ+25%（2ターン）。',
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
    talkName: '尊大なひとこと',
  },
};
// 主人公（選択肢を選ぶと、この子の台詞になる）
const HERO = 'mike';

// ------------------------------------------------------------
//  コンボスキル（友情Lv3で解禁）と、最終スキル
// ------------------------------------------------------------
const COMBOS = [
  { id: 'nyankoBreak', pair: ['mike', 'kuro'], name: 'にゃんこブレイク', desc: 'ミケとクロの連携。指定した敵単体にミケの攻撃力250%＋クロの攻撃力250%の物理ダメージ。靭性を大きく削る。', target: 'single',
    run: async (B, a, t) => { const [m, k] = a; let r = await B.single(m, t, 2.5, 30, 'combo', { heavy: true, elem: 'physical' }); if (t.alive) r = r.concat(await B.single(k, t, 2.5, 30, 'combo', { heavy: true })); return r; } },
  { id: 'fireball', pair: ['mike', 'shiro'], name: 'ファイアボール', desc: 'ミケが投げた魚にシロが火をつける。敵全体にシロの攻撃力180%の炎ダメージ、燃焼（2ターン）。', target: 'aoe',
    run: async (B, a) => { const [, s] = a; const r = await B.aoe(s, 1.8, 20, 'combo', { heavy: true, elem: 'fire' }); B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'burn', mult: 0.5, turns: 2, chance: 1 })); return r; } },
  { id: 'kokubyaku', pair: ['kuro', 'shiro'], name: '黒白連撃', desc: 'クロとシロの交互攻撃。ランダムな敵に、クロとシロが交互に攻撃力80%のダメージを計6回。', target: 'aoe',
    run: async (B, a) => { const [k, s] = a; let r = []; for (let i = 0; i < 6 && B.aliveEnemies().length; i++) r = r.concat(await B.bounce(i % 2 ? s : k, 1, 0.8, 8, 'combo')); return r; } },
  { id: 'nyanHeal', pair: ['tama', '*'], name: 'にゃんにゃんヒール', desc: 'タマとみんなで声を合わせる。味方全体のHPを最大HP40%回復し、デバフを解除、シールドを付与。', target: 'allies',
    run: async (B, a) => { const t = a[0]; B.aliveAllies().forEach(x => { B.heal(t, x, x.maxHp * 0.4); B.cleanse(x); B.cleanse(x); B.shield(t, x, x.maxHp * 0.12, 2); }); return []; } },
  { id: 'gorei', pair: ['maou', '*'], name: '元魔王の号令', desc: 'マオウの号令で全員が奮い立つ。味方全体の行動順を50%早め、攻撃力+30%（2ターン）。敵全体にマオウの攻撃力120%の闇ダメージ。', target: 'aoe',
    run: async (B, a) => { const m = a[0]; const r = await B.aoe(m, 1.2, 20, 'combo', { heavy: true }); B.aliveAllies().forEach(x => { B.buff(x, { key: 'gorei', name: '号令', stat: 'atk', value: 0.3, turns: 2 }); B.advance(x, 0.5); }); return r; } },
];
const ALLSTARS = { id: 'allstars', name: 'にゃんこオールスターズ', desc: '世界中の猫たちの「つながり」が力になる。敵全体に全員の攻撃力の合計300%のダメージ。', target: 'aoe' };

// 友情（2匹の組み合わせごと）：一緒に旅をした時間
const BOND_LV = [0, 30, 80, 150, 250];   // Lv1〜5 に必要な友情値
const BOND_INFO = ['通常会話', '戦闘中の掛け合い', 'コンボスキル', '特別イベント', '最終スキル'];
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
//  敵の技
// ------------------------------------------------------------
const ENEMY_MOVES = {
  strike:  { name: 'ひっかき',       type: 'single', mult: 1.0 },
  bite:    { name: 'かみつき',       type: 'single', mult: 1.2 },
  heavy:   { name: 'たいあたり',     type: 'single', mult: 1.8 },
  blast:   { name: 'なぎはらい',     type: 'blast',  mult: 1.1, adj: 0.5 },
  aoe:     { name: 'おおあばれ',     type: 'aoe',    mult: 0.6 },
  burn:    { name: 'ほのおのいき',   type: 'single', mult: 0.9, eff: { kind: 'dot', type: 'burn', mult: 0.35, turns: 2, chance: 0.6 } },
  frost:   { name: 'こおりのいき',   type: 'blast',  mult: 0.8, adj: 0.4, eff: { kind: 'freeze', chance: 0.3 } },
  shock:   { name: 'びりびり',       type: 'single', mult: 0.9, eff: { kind: 'dot', type: 'shock', mult: 0.4, turns: 2, chance: 0.6 } },
  slow:    { name: 'ねばねば',       type: 'single', mult: 0.8, eff: { kind: 'buff', chance: 0.7, buff: { key: 'e_slow', name: '減速', stat: 'spd', value: -0.15, turns: 2 } } },
  weaken:  { name: 'よわよわの術',   type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.7, buff: { key: 'e_def', name: '防御ダウン', stat: 'def', value: -0.25, turns: 2 } } },
  charge:  { name: 'ちからをためている…', type: 'charge', next: 'nova' },
  nova:    { name: 'だいばくはつ',   type: 'aoe', mult: 1.6 },
  summon:  { name: 'なかまをよんだ', type: 'summon' },
  // 敵ごとの技
  puni:    { name: 'ぷにぷにアタック', type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_puni', name: 'べとべと', stat: 'spd', value: -0.1, turns: 2 } } },
  spore:   { name: 'ねむりの胞子',   type: 'blast', mult: 0.6, adj: 0.4, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_spore', name: 'ねむけ', stat: 'spd', value: -0.2, turns: 1 } } },
  acorn:   { name: 'どんぐり投げ',   type: 'blast', mult: 0.8, adj: 0.4 },
  cheese:  { name: 'チーズどろぼう', type: 'single', mult: 1.1 },
  kingPress: { name: 'キングプレス', type: 'single', mult: 1.9 },
  ratCharge: { name: '腹ぺこで目が回っている…', type: 'charge', next: 'ratStorm' },
  ratStorm: { name: 'ネズミ大行進', type: 'aoe', mult: 1.4 },
  peck:    { name: 'つっつき',       type: 'single', mult: 1.0 },
  roll:    { name: 'ころころ',       type: 'blast',  mult: 1.2, adj: 0.6 },
  howl:    { name: 'とおぼえ',       type: 'aoe',    mult: 0.5, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_howl', name: 'びくびく', stat: 'atk', value: -0.15, turns: 2 } } },
  rush:    { name: 'まっしぐら',     type: 'single', mult: 1.7 },
  boarCharge: { name: '鼻息があらい…', type: 'charge', next: 'boarRush' },
  boarRush: { name: 'はらぺこ大突進', type: 'aoe', mult: 1.3 },
  giggle:  { name: 'ゲラゲラ笑い',   type: 'aoe',    mult: 0.55, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_giggle', name: '笑いすぎ', stat: 'def', value: -0.15, turns: 2 } } },
  chomp:   { name: 'クスクスがぶり', type: 'single', mult: 1.5 },
  laughgas:{ name: 'わらいガス',     type: 'aoe',    mult: 0.7, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_laugh', name: '笑い転げ', stat: 'spd', value: -0.15, turns: 2 } } },
  juggle:  { name: 'ジャグリング',   type: 'blast',  mult: 1.1, adj: 0.6 },
  tears:   { name: 'なみだの雨',     type: 'aoe',    mult: 0.8 },
  showtime:{ name: '最後のショーの準備をしている…', type: 'charge', next: 'finale' },
  finale:  { name: 'さみしいフィナーレ', type: 'aoe', mult: 1.5 },
  shade:   { name: 'かげぬい',       type: 'single', mult: 1.1, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_shade', name: 'かげぬい', stat: 'spd', value: -0.15, turns: 2 } } },
  cleave:  { name: '重い一撃',       type: 'single', mult: 1.8 },
  lonely:  { name: '孤高の剣',       type: 'single', mult: 1.6 },
  pastEcho:{ name: 'あの日の記憶',   type: 'aoe',    mult: 0.8, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_past', name: '後悔', stat: 'atk', value: -0.15, turns: 2 } } },
  stoneGaze: { name: '石のまなざし', type: 'single', mult: 1.0, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_stone', name: 'かちこち', stat: 'spd', value: -0.2, turns: 1 } } },
  beam:    { name: '古代ビーム',     type: 'blast',  mult: 1.2, adj: 0.6 },
  sealCharge: { name: '封印の光が集まっている…', type: 'charge', next: 'sealBurst' },
  sealBurst: { name: '封印の光',     type: 'aoe', mult: 1.5 },
  paperwork: { name: '書類の山',     type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_paper', name: '事務作業', stat: 'spd', value: -0.15, turns: 2 } } },
  checkup: { name: '健康診断',       type: 'single', mult: 0.7, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_check', name: '要再検査', stat: 'def', value: -0.2, turns: 2 } } },
  darkPaw: { name: '暗黒ねこパンチ', type: 'single', mult: 1.5 },
  darkWave:{ name: '魔王の波動',     type: 'aoe',    mult: 0.8 },
  maouCharge: { name: '「余と遊べ……！」', type: 'charge', next: 'maouNova' },
  maouNova:{ name: 'さびしんぼメテオ', type: 'aoe', mult: 1.6 },
  hollow:  { name: 'うつろな声',     type: 'single', mult: 1.0, eff: { kind: 'energy', chance: 1, value: 15 } },
  // コドク：仲間を引き離す
  isolate: { name: '孤独',           type: 'single', mult: 1.0, eff: { kind: 'isolate', chance: 1 } },
  despair: { name: '絶望',           type: 'aoe',    mult: 0.9 },
  doubt:   { name: '疑心',           type: 'aoe',    mult: 0.6, eff: { kind: 'bondDrain', chance: 1, value: 20 } },
  erase:   { name: '思い出消去',     type: 'single', mult: 1.2, eff: { kind: 'energy', chance: 1, value: 40 } },
  kodokuCharge: { name: 'すべての声が遠ざかっていく…', type: 'charge', next: 'kodokuNova' },
  kodokuNova: { name: 'ひとりぼっちの世界', type: 'aoe', mult: 1.7 },
  // ねこ神の夢
  purin:   { name: 'ぷるるんボディ', type: 'aoe', mult: 0.7 },
  splash:  { name: 'ぴちぴちビンタ', type: 'single', mult: 1.2 },
  chatter: { name: 'おしゃべり攻撃', type: 'aoe', mult: 0.5, eff: { kind: 'buff', chance: 0.5, buff: { key: 'e_chat', name: 'うんざり', stat: 'atk', value: -0.15, turns: 2 } } },
  swarm:   { name: '100匹でおしくらまんじゅう', type: 'aoe', mult: 0.8 },
  copycat: { name: 'ものまねパンチ', type: 'single', mult: 1.3 },
  plushHug:{ name: 'もふもふハグ',   type: 'single', mult: 1.0, eff: { kind: 'buff', chance: 0.6, buff: { key: 'e_hug', name: 'ふわふわ', stat: 'spd', value: -0.15, turns: 2 } } },
  godPaw:  { name: '神のねこパンチ', type: 'blast', mult: 1.4, adj: 0.7 },
  godCharge: { name: '「めんどうだが、少し本気を出そう」', type: 'charge', next: 'godNova' },
  godNova: { name: '天地創造にゃんこ', type: 'aoe', mult: 1.8 },
};

// ------------------------------------------------------------
//  敵（shape は js/gfx/monsters.js の形。talk は「話す」で聞ける気持ち）
// ------------------------------------------------------------
const ENEMIES = {
  // 第一章：ほしふる森
  slime:    { name: 'ぷにスライム',   shape: 'slime',    color: '#7ee0a0', hp: 2800, atk: 900,  spd: 90,  tough: 20, weak: ['fire', 'lightning', 'physical'], moves: [['puni', 3], ['strike', 1]], talk: 'ぷに……（なでてほしいらしい）' },
  kinoko:   { name: 'ねこまたきのこ', shape: 'mushroom', color: '#e87a9a', hp: 3200, atk: 950,  spd: 85,  tough: 30, weak: ['fire', 'wind', 'imaginary'], moves: [['strike', 2], ['spore', 1]], talk: '「しっぽが二本あるのが自慢なんだ……だれも見てくれないけど」' },
  risu:     { name: 'おこりリス',     shape: 'squirrel', color: '#e0a060', hp: 2800, atk: 1000, spd: 115, tough: 20, weak: ['ice', 'physical', 'quantum'], moves: [['acorn', 2], ['bite', 1]], talk: '「冬のどんぐり、集めても集めても足りないの！」' },
  nezumi:   { name: 'はぐれネズミ',   shape: 'rat',      color: '#a8a4b8', hp: 3000, atk: 1000, spd: 105, tough: 30, weak: ['fire', 'physical', 'imaginary'], moves: [['cheese', 2], ['bite', 1]], talk: '「王さまにごはんを持っていかないと……」' },
  king_nezumi: { name: 'キングネズミ', shape: 'kingrat', color: '#d8a840', boss: true, hp: 22000, atk: 1150, spd: 100, tough: 110, eres: 0.25, weak: ['fire', 'physical', 'lightning'],
    phases: [{ weak: ['physical', 'ice', 'wind'] }], summon: 'nezumi', moves: [['kingPress', 2], ['aoe', 1], ['ratCharge', 1], ['summon', 1]], talk: '「俺だって……食べたかったんだよ……」' },
  // 第二章：ミャオ街道
  karasu:   { name: 'いたずらカラス', shape: 'crow',     color: '#4a4a6a', hp: 3000, atk: 1050, spd: 125, tough: 20, weak: ['lightning', 'wind', 'fire'], moves: [['peck', 2], ['slow', 1]], talk: '「光るもの、ちょうだい！　……ひとりで集めるの、つまんないんだ」' },
  iwa:      { name: 'ころころ岩',     shape: 'rock',     color: '#9a8a7a', hp: 5200, atk: 1000, spd: 75,  tough: 40, weak: ['physical', 'wind', 'ice'], moves: [['roll', 2], ['heavy', 1]], talk: '「……ころがってないと、さみしいんだ」' },
  noraInu:  { name: 'のら犬',         shape: 'dog',      color: '#b08050', hp: 3600, atk: 1100, spd: 100, tough: 30, weak: ['fire', 'quantum', 'physical'], moves: [['bite', 2], ['howl', 1]], talk: '「群れからはぐれちまってよ……」' },
  inoshishi:{ name: 'はらぺこイノシシ', shape: 'boar',   color: '#8a5a3a', boss: true, hp: 26000, atk: 1250, spd: 95, tough: 130, eres: 0.25, weak: ['ice', 'lightning', 'wind'],
    phases: [{ weak: ['fire', 'physical', 'imaginary'] }], summon: 'noraInu', moves: [['rush', 2], ['aoe', 1], ['boarCharge', 1], ['summon', 1]], talk: '「冬ごもりのごはんが見つからないんだブヒ……」' },
  // 第三章：笑顔の塔
  ghost:    { name: 'ゲラゲラゴースト', shape: 'ghost',  color: '#e8e8ff', hp: 3800, atk: 1150, spd: 110, tough: 30, weak: ['imaginary', 'fire', 'wind'], moves: [['giggle', 2], ['strike', 1]], talk: '「ゲラ……ゲラ……。ほんとは、なにがおかしいのか、もうわからないんだ」' },
  mimic:    { name: 'クスクスミミック', shape: 'mimic',  color: '#d8a040', elite: true, hp: 12000, atk: 1250, spd: 90, tough: 80, eres: 0.2, weak: ['lightning', 'physical', 'ice'], moves: [['chomp', 2], ['giggle', 1], ['heavy', 1]], talk: '「クスクス……開けてくれるの、待ってたんだよ。ずっと」' },
  piero:    { name: '泣き虫ピエロ',   shape: 'clown',    color: '#ff7aa8', boss: true, hp: 34000, atk: 1350, spd: 104, tough: 160, eres: 0.3, weak: ['imaginary', 'fire', 'lightning'],
    phases: [{ weak: ['ice', 'wind', 'physical'] }], summon: 'ghost', moves: [['laughgas', 2], ['juggle', 2], ['tears', 1], ['showtime', 1], ['summon', 1]], talk: '「笑ってよ……ねえ、ぼくのショーで笑ってよ……！」' },
  // 第四章：くろねこ谷・黒影洞窟
  kageneko: { name: 'かげねこ',       shape: 'shadowcat', color: '#6a5a9a', hp: 4200, atk: 1250, spd: 110, tough: 30, weak: ['imaginary', 'fire', 'physical'], moves: [['shade', 2], ['strike', 1]], talk: '「……ひとりでいれば、もう失わない」' },
  yoroi:    { name: 'さまよう鎧',     shape: 'armor',    color: '#8a8aa8', elite: true, hp: 15000, atk: 1350, spd: 85, tough: 90, eres: 0.2, weak: ['lightning', 'imaginary', 'fire'], moves: [['cleave', 2], ['blast', 1], ['aoe', 1]], talk: '「守れなかった……守れなかった……」' },
  kako_kuro:{ name: '過去の影クロ',   shape: 'shadowkuro', color: '#7a5aff', boss: true, hp: 42000, atk: 1450, spd: 105, tough: 170, eres: 0.3, weak: ['imaginary', 'fire', 'lightning'],
    phases: [{ weak: ['physical', 'wind', 'ice'] }], summon: 'kageneko', moves: [['lonely', 2], ['pastEcho', 2], ['charge', 1], ['summon', 1]], talk: '「仲間なんか……いらない。失うくらいなら」' },
  // 第五章：古代遺跡
  sekizou:  { name: '石のねこ像',     shape: 'statue',   color: '#c8b890', hp: 5600, atk: 1250, spd: 80, tough: 40, weak: ['physical', 'lightning', 'wind'], moves: [['stoneGaze', 2], ['heavy', 1]], talk: '「……ずっと、ここで待っていた。最後の子を」' },
  hotaru:   { name: '古代ほたる',     shape: 'wisp',     color: '#8affe0', hp: 4000, atk: 1300, spd: 120, tough: 30, weak: ['quantum', 'ice', 'fire'], moves: [['beam', 2], ['shock', 1]], talk: 'ほたるは、遠い昔の歌をうたっている……' },
  guardian: { name: '遺跡の守護神',   shape: 'guardian', color: '#e8c870', boss: true, hp: 52000, atk: 1500, spd: 100, tough: 180, eres: 0.3, weak: ['quantum', 'physical', 'wind'],
    phases: [{ weak: ['fire', 'ice', 'lightning'] }], summon: 'sekizou', moves: [['beam', 2], ['stoneGaze', 1], ['sealCharge', 1], ['summon', 1]], talk: '「封印を開けられるのは、最後のにゃんこだけ……」' },
  // 第六章：魔王領
  mazoku:   { name: '魔族兵',         shape: 'imp',      color: '#9a7ae8', hp: 5000, atk: 1350, spd: 105, tough: 30, weak: ['imaginary', 'fire', 'physical'], moves: [['strike', 2], ['paperwork', 1]], talk: '「有給休暇の申請、通らないかなぁ……」' },
  kangoshi: { name: '魔族の保健係',   shape: 'impnurse', color: '#ff9ac8', hp: 4600, atk: 1300, spd: 110, tough: 30, weak: ['quantum', 'ice', 'wind'], moves: [['checkup', 2], ['strike', 1]], talk: '「魔王城では、年に一度の健康診断をしております」' },
  kanbu:    { name: '魔族の中間管理職', shape: 'impboss', color: '#6a4ab8', elite: true, hp: 18000, atk: 1450, spd: 95, tough: 100, eres: 0.2, weak: ['imaginary', 'lightning', 'fire'], moves: [['paperwork', 2], ['cleave', 1], ['aoe', 1]], talk: '「上からも下からも……胃が痛い……」' },
  boss_maou:{ name: '魔王マオウ',     shape: 'maou',     color: '#b04aff', boss: true, lure: true, hp: 62000, atk: 1600, spd: 108, tough: 190, eres: 0.35, weak: ['imaginary', 'fire', 'physical'],
    phases: [{ weak: ['lightning', 'wind', 'ice'] }], summon: 'mazoku', moves: [['darkPaw', 2], ['darkWave', 2], ['maouCharge', 1], ['summon', 1]], talk: '「……余と遊んでくれる者など、どこにもおらぬ」' },
  // 第七章：にゃんだーの樹の根
  kakera:   { name: 'コドクのかけら', shape: 'shard',    color: '#5a4a8a', hp: 6200, atk: 1500, spd: 110, tough: 40, weak: ['imaginary', 'fire', 'wind'], moves: [['hollow', 2], ['strike', 1]], talk: '「……だれも、わたしを見ない」' },
  utsuro:   { name: '虚ろ',           shape: 'void',     color: '#3a2a5a', elite: true, hp: 22000, atk: 1600, spd: 100, tough: 110, eres: 0.25, weak: ['imaginary', 'lightning', 'physical'], moves: [['hollow', 2], ['despair', 1], ['cleave', 1]], talk: '（なにも聞こえない。ただ冷たい）' },
  kodoku_kage: { name: 'コドクの影',  shape: 'kodoku',   color: '#2a1a4a', boss: true, hp: 70000, atk: 1700, spd: 105, tough: 200, eres: 0.35, weak: ['imaginary', 'fire', 'wind'],
    phases: [{ weak: ['physical', 'lightning', 'ice'] }], summon: 'kakera', moves: [['isolate', 2], ['despair', 2], ['erase', 1], ['kodokuCharge', 1], ['summon', 1]], talk: '「……ひとりでいれば、傷つかない」' },
  // 第八章：世界の果て
  kagejuu:  { name: 'コドクの獣',     shape: 'shadowbeast', color: '#4a2a6a', hp: 7200, atk: 1650, spd: 108, tough: 40, weak: ['imaginary', 'fire', 'physical'], moves: [['bite', 2], ['despair', 1]], talk: '「……さみしい」' },
  kodoku:   { name: 'コドク',         shape: 'kodoku',   color: '#1a0a36', boss: true, final: true, hp: 80000, atk: 1800, spd: 112, tough: 220, eres: 0.4, weak: ['imaginary', 'fire', 'physical'],
    phases: [{ weak: ['lightning', 'wind', 'quantum'] }, { weak: ['imaginary', 'ice', 'fire'] }], summon: 'kakera', moves: [['isolate', 2], ['despair', 2], ['doubt', 1], ['erase', 1], ['kodokuCharge', 1], ['summon', 1]], talk: '「なぜ手を伸ばす。ひとりのほうが、楽だろう」' },
  // 隠しダンジョン：ねこ神の夢
  purin:    { name: '超巨大プリン',   shape: 'pudding',  color: '#ffd27a', elite: true, hp: 30000, atk: 1600, spd: 80, tough: 120, eres: 0.2, weak: ['fire', 'lightning', 'wind'], moves: [['purin', 2], ['heavy', 1]], talk: '「たべて……ぷるん」' },
  sakana:   { name: '喋る魚',         shape: 'fish',     color: '#6ac8ff', hp: 8000, atk: 1700, spd: 115, tough: 40, weak: ['fire', 'lightning', 'physical'], moves: [['splash', 2], ['chatter', 1]], talk: '「いいかい、そもそも魚というのはだね……（話が長い）」' },
  tamas:    { name: '100匹のタマ',    shape: 'tamas',    color: '#fff4d8', elite: true, hp: 36000, atk: 1650, spd: 95, tough: 120, eres: 0.2, weak: ['quantum', 'fire', 'ice'], moves: [['swarm', 2], ['heavy', 1]], talk: '「「「すやすや……」」」' },
  nisemike: { name: 'ミケそっくりの偽物', shape: 'fakemike', color: '#f29a3e', hp: 9000, atk: 1800, spd: 105, tough: 40, weak: ['ice', 'quantum', 'physical'], moves: [['copycat', 2], ['strike', 1]], talk: '「ぼくが本物のミケだよ！　……あれ？」' },
  kuroPlush:{ name: 'クロのぬいぐるみ', shape: 'plush',  color: '#3a3844', hp: 9500, atk: 1650, spd: 100, tough: 40, weak: ['fire', 'wind', 'lightning'], moves: [['plushHug', 2], ['strike', 1]], talk: '「……めんどうだ（録音）」' },
  nekogami: { name: 'ねこ神',         shape: 'nekogami', color: '#ffe08a', boss: true, hp: 110000, atk: 1900, spd: 112, tough: 240, eres: 0.4, weak: ['quantum', 'physical', 'ice'],
    phases: [{ weak: ['fire', 'lightning', 'wind'] }, { weak: ['imaginary', 'quantum', 'physical'] }], summon: 'sakana', moves: [['godPaw', 2], ['chatter', 1], ['purin', 1], ['godCharge', 1], ['summon', 1]], talk: '「世界を作るのは、案外めんどうなのだ」' },
};

// ------------------------------------------------------------
//  章とステージ（物語の戦闘）
//  bg：戦闘・探索の空と光（js/gfx/env.js の THEMES）
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
      { id: '2-1', name: '街道の丘',         lv: 8,  waves: [['karasu', 'noraInu'], ['iwa', 'karasu', 'noraInu']] },
      { id: '2-2', name: 'まどろみの林',     lv: 11, waves: [['noraInu', 'karasu', 'noraInu'], ['iwa', 'iwa']] },
      { id: '2-3', name: '街道の関所あと',   lv: 14, boss: true, waves: [['noraInu', 'iwa', 'noraInu'], ['inoshishi']] },
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
      { id: '5-2', name: '壁画の回廊',       lv: 38, waves: [['sekizou', 'sekizou'], ['hotaru', 'hotaru', 'hotaru']] },
      { id: '5-3', name: '封印の間',         lv: 41, boss: true, waves: [['hotaru', 'sekizou', 'hotaru'], ['guardian']] },
    ] },
  { id: 'c6', name: '魔王領', bg: 'demon', desc: '怖い場所のはずなのに、なんだか妙にコミカル。',
    stages: [
      { id: '6-1', name: '魔王領の門',       lv: 44, waves: [['mazoku', 'kangoshi'], ['mazoku', 'kanbu', 'mazoku']] },
      { id: '6-2', name: '魔王城の廊下',     lv: 47, waves: [['kangoshi', 'mazoku', 'kangoshi'], ['kanbu', 'mazoku']] },
      { id: '6-3', name: '魔王の間',         lv: 50, boss: true, waves: [['mazoku', 'kanbu', 'mazoku'], ['boss_maou']] },
    ] },
  { id: 'c7', name: 'にゃんだーの樹', bg: 'tree', desc: '世界の中心の生命樹。その根元に、黒い何かがいる。',
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
