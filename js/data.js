'use strict';
// ============================================================
//  ゲームデータ：属性・運命・キャラクター・敵・ステージ・祝福
// ============================================================

const ELEMENTS = {
  physical:  { name: '物理', color: '#d8d8e0', glyph: '物' },
  fire:      { name: '炎',   color: '#ff5a3c', glyph: '炎' },
  ice:       { name: '氷',   color: '#6fd6f5', glyph: '氷' },
  lightning: { name: '雷',   color: '#c77dff', glyph: '雷' },
  wind:      { name: '風',   color: '#4fe0a5', glyph: '風' },
  quantum:   { name: '量子', color: '#7d6bff', glyph: '量' },
  imaginary: { name: '虚数', color: '#f5d34a', glyph: '虚' },
};

const PATHS = {
  destruction: { name: '壊滅', aggro: 125 },
  hunt:        { name: '巡狩', aggro: 75 },
  erudition:   { name: '知恵', aggro: 75 },
  harmony:     { name: '調和', aggro: 100 },
  nihility:    { name: '虚無', aggro: 100 },
  preservation:{ name: '存護', aggro: 150 },
  abundance:   { name: '豊穣', aggro: 100 },
};

const lvFactor = lv => 0.2 + 0.8 * (lv - 1) / 79;
const lvMult = lv => 1300 * lvFactor(lv);
const expToNext = lv => 100 + lv * 45;

function charStats(key, lv, eid) {
  const b = CHARS[key].base, f = lvFactor(lv) * (1 + 0.06 * eid);
  return {
    maxHp: b.hp * f, atk: b.atk * f, def: b.def * f, spd: b.spd,
    crit: b.crit || 0.05, critDmg: b.critDmg || 0.5, be: b.be || 0,
    ehr: b.ehr || 0, eres: b.eres || 0.1, err: 0,
  };
}

// ------------------------------------------------------------
//  キャラクター
//  target: single / blast / aoe / bounce / ally / allies / self
// ------------------------------------------------------------
const CHARS = {
  aster: {
    name: 'アステル', title: '星を渡る開拓者', rarity: 4, elem: 'physical', path: 'destruction',
    base: { hp: 3600, atk: 1500, def: 1000, spd: 100, crit: 0.25, critDmg: 0.8, be: 0.3 },
    energyMax: 120,
    look: { hair: '#d9d7e6', eye: '#f0b54a', style: 'short', outfit: '#262c48', accent: '#e8c77a', acc: 'ahoge' },
    basic: { name: '告別の一撃', target: 'single', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '流星の打撃', target: 'blast', desc: '指定した敵単体に攻撃力125%、隣接する敵に攻撃力50%の物理ダメージ。',
      run: (B, s, t) => B.blast(s, t, 1.25, 0.5, 20, 10, 'skill') },
    ult: { name: '星屑の終曲', target: 'single', desc: '指定した敵単体に攻撃力450%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 4.5, 30, 'ult', { heavy: true }) },
    talent: { name: '開拓の意志', desc: '敵を弱点撃破するたび、攻撃力+20%（最大2層）。',
      onBreak(B, s) { B.buff(s, { key: 'aster_t', name: '開拓の意志', stat: 'atk', value: 0.2, turns: Infinity, max: 2 }); } },
    technique: { name: '不意打ち', desc: '戦闘開始時、敵全体に攻撃力80%の物理ダメージ。',
      run: (B, s) => B.aoe(s, 0.8, 0, 'tech') },
  },

  mizore: {
    name: 'ミゾレ', title: '氷壁の守人', rarity: 4, elem: 'ice', path: 'preservation',
    base: { hp: 4200, atk: 1000, def: 1500, spd: 99, crit: 0.05, critDmg: 0.5, eres: 0.2 },
    energyMax: 120,
    look: { hair: '#aee6ff', eye: '#3f8ff0', style: 'bob', outfit: '#dfeaff', accent: '#6fd6f5', acc: 'pin' },
    basic: { name: 'フロストナックル', target: 'single', desc: '指定した敵単体に攻撃力100%の氷ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '氷晶の守り', target: 'ally', desc: '味方単体に防御力60%+300のシールド（3ターン）、他の味方にはその50%のシールドを付与。',
      run: (B, s, t) => {
        const v = s.stat('def') * 0.6 + 300 * lvFactor(s.level);
        B.shield(s, t, v, 3);
        B.aliveAllies().filter(a => a !== t).forEach(a => B.shield(s, a, v * 0.5, 3));
      } },
    ult: { name: '永久凍土', target: 'aoe', desc: '敵全体に防御力90%の氷ダメージ、65%の基礎確率で凍結させる。味方全体に防御力40%+200のシールド。',
      run: async (B, s) => {
        const r = await B.aoe(s, 0.9, 20, 'ult', { stat: 'def', heavy: true });
        r.forEach(x => x.t.alive && B.freeze(s, x.t, 0.65, s.stat('def') * 0.6));
        const v = s.stat('def') * 0.4 + 200 * lvFactor(s.level);
        B.aliveAllies().forEach(a => B.shield(s, a, v, 3));
        return r;
      } },
    talent: { name: '不屈の氷壁', desc: '戦闘中1回、味方が戦闘不能になる攻撃を受けた時、HP25%で耐えさせる。',
      onAllyLethal(B, s, t) {
        if (s.flags.saved) return false;
        s.flags.saved = true; t.hp = t.maxHp * 0.25; B.float(t, '不屈', 'info'); return true;
      } },
    technique: { name: '氷結の罠', desc: '戦闘開始時、敵全体を60%の基礎確率で凍結させる。',
      run: (B, s) => B.aliveEnemies().forEach(e => B.freeze(s, e, 0.6, s.stat('def') * 0.5)) },
    ai(B, s) {
      const low = B.aliveAllies().filter(a => a.hp / a.maxHp < 0.6 && a.shield <= 0);
      if (B.sp >= 1 && (low.length || B.sp >= 4)) return { kind: 'skill', target: low[0] || s };
      return null;
    },
  },

  yue: {
    name: 'ユエ', title: '月華の癒し手', rarity: 4, elem: 'imaginary', path: 'abundance',
    base: { hp: 4400, atk: 1100, def: 900, spd: 102, crit: 0.05, critDmg: 0.5 },
    energyMax: 100,
    look: { hair: '#f4e6b8', eye: '#e6a24a', style: 'long', outfit: '#f3ecdc', accent: '#f5d34a', acc: 'halo' },
    basic: { name: '月光弾', target: 'single', desc: '指定した敵単体に攻撃力100%の虚数ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '月華の癒し', target: 'ally', desc: '味方単体のHPをユエの最大HP25%+250回復し、他の味方は8%回復。',
      run: (B, s, t) => {
        B.heal(s, t, s.maxHp * 0.25 + 250 * lvFactor(s.level));
        B.aliveAllies().filter(a => a !== t).forEach(a => B.heal(s, a, s.maxHp * 0.08));
      } },
    ult: { name: '満月の祈り', target: 'allies', desc: '味方全体のHPをユエの最大HP30%回復し、デバフを1つ解除する。',
      run: (B, s) => B.aliveAllies().forEach(a => { B.heal(s, a, s.maxHp * 0.3); B.cleanse(a); }) },
    talent: { name: '月の加護', desc: '味方が攻撃を受けHPが50%を下回った時、最大HP15%を回復（ターン毎2回まで）。',
      onBattleStart(B, s) { s.flags.charges = 2; },
      onTurnStart(B, s) { s.flags.charges = 2; },
      onAllyHit(B, s, a) {
        if (a.alive && s.flags.charges > 0 && a.hp / a.maxHp < 0.5) { s.flags.charges--; B.heal(s, a, s.maxHp * 0.15); }
      } },
    technique: { name: '月の抱擁', desc: '戦闘開始時、味方全体の最大HP+15%（3ターン）。',
      run: (B, s) => B.aliveAllies().forEach(a => { B.buff(a, { key: 'yue_tech', name: '月の抱擁', stat: 'maxHp', value: 0.15, turns: 3 }); a.hp *= 1.15; }) },
    ai(B, s) {
      const low = B.aliveAllies().sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (B.sp >= 1 && low && low.hp / low.maxHp < 0.65) return { kind: 'skill', target: low };
      return { kind: 'basic' };
    },
  },

  kazane: {
    name: 'カザネ', title: '風読みの刺客', rarity: 4, elem: 'wind', path: 'nihility',
    base: { hp: 3200, atk: 1400, def: 800, spd: 106, crit: 0.1, critDmg: 0.6, ehr: 0.2 },
    energyMax: 110,
    look: { hair: '#2f6b58', eye: '#4fe0a5', style: 'pony', outfit: '#1c2626', accent: '#4fe0a5' },
    basic: { name: '風刃', target: 'single', desc: '指定した敵単体に攻撃力100%の風ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '疾風の刻印', target: 'single', desc: '指定した敵単体に攻撃力160%の風ダメージ、100%の基礎確率で風化（毎ターン攻撃力90%、3ターン）。',
      run: async (B, s, t) => {
        const r = await B.single(s, t, 1.6, 20, 'skill');
        if (t.alive) B.dot(s, t, { type: 'wind', mult: 0.9, turns: 3, chance: 1 });
        return r;
      } },
    ult: { name: '嵐の終曲', target: 'aoe', desc: '敵全体に攻撃力100%の風ダメージ。その後、敵が受けている全ての持続ダメージを即座に発動させる。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.0, 20, 'ult', { heavy: true });
        for (const e of B.aliveEnemies()) await B.detonate(e, 1.0);
        await B.resolveDeaths(s, 'ult');
        return r;
      } },
    talent: { name: '侵蝕', desc: '持続ダメージを受けている敵に対する与ダメージ+25%。',
      dmgMod: (B, s, t) => (t.dots && t.dots.length ? 0.25 : 0) },
    technique: { name: '旋風', desc: '戦闘開始時、敵全体に風化（攻撃力50%、2ターン）を付与。',
      run: (B, s) => B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'wind', mult: 0.5, turns: 2, chance: 1 })) },
  },

  laika: {
    name: 'ライカ', title: '迅雷の狩人', rarity: 5, elem: 'lightning', path: 'hunt',
    base: { hp: 3300, atk: 1850, def: 750, spd: 108, crit: 0.45, critDmg: 1.0 },
    energyMax: 120,
    look: { hair: '#6a4fb0', eye: '#d89bff', style: 'spiky', outfit: '#221a33', accent: '#c77dff', acc: 'horn' },
    basic: { name: '雷光', target: 'single', desc: '指定した敵単体に攻撃力100%の雷ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '雷閃', target: 'single', desc: '指定した敵単体に攻撃力250%の雷ダメージ。その後、行動順が25%早まる。',
      run: (B, s, t) => B.single(s, t, 2.5, 20, 'skill') },
    ult: { name: '神鳴り', target: 'single', desc: '指定した敵単体に攻撃力400%の雷ダメージ、さらにランダムな敵に攻撃力60%の雷ダメージを4回。',
      run: async (B, s, t) => {
        const r = await B.single(s, t, 4.0, 30, 'ult', { heavy: true });
        const r2 = await B.bounce(s, 4, 0.6, 10, 'ult');
        return r.concat(r2);
      } },
    talent: { name: '迅雷', desc: '戦闘スキル使用後、行動順が25%早まる。弱点撃破状態の敵への与ダメージ+20%。',
      afterAction(B, s, kind) { if (kind === 'skill') B.advance(s, 0.25); },
      dmgMod: (B, s, t) => (t.broken ? 0.2 : 0) },
    technique: { name: '先手必勝', desc: '戦闘開始時、自身の行動順が50%早まる。',
      run: (B, s) => B.advance(s, 0.5) },
  },

  homura: {
    name: 'ホムラ', title: '焔の学士', rarity: 5, elem: 'fire', path: 'erudition',
    base: { hp: 3400, atk: 1800, def: 700, spd: 100, crit: 0.35, critDmg: 0.9, ehr: 0.1 },
    energyMax: 140,
    look: { hair: '#d8413a', eye: '#ffb347', style: 'long', outfit: '#3a1718', accent: '#ff7a3c', acc: 'pin' },
    basic: { name: '火花', target: 'single', desc: '指定した敵単体に攻撃力100%の炎ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '焔渦', target: 'aoe', desc: '敵全体に攻撃力110%の炎ダメージ。',
      run: (B, s) => B.aoe(s, 1.1, 10, 'skill') },
    ult: { name: '劫火の宴', target: 'aoe', desc: '敵全体に攻撃力240%の炎ダメージ、100%の基礎確率で燃焼（攻撃力50%、2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 2.4, 20, 'ult', { heavy: true });
        B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'burn', mult: 0.5, turns: 2, chance: 1 }));
        return r;
      } },
    talent: { name: '燎原', desc: '攻撃命中時、40%の基礎確率で燃焼（攻撃力30%、2ターン）。燃焼状態の敵への与ダメージ+20%。',
      onHitEnemy(B, s, t) { if (t.alive && Math.random() < 0.4) B.dot(s, t, { type: 'burn', mult: 0.3, turns: 2, chance: 1, quiet: true }); },
      dmgMod: (B, s, t) => (t.dots && t.dots.some(d => d.type === 'burn') ? 0.2 : 0) },
    technique: { name: '火種', desc: '戦闘開始時、敵全体に燃焼（攻撃力50%、2ターン）。',
      run: (B, s) => B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'burn', mult: 0.5, turns: 2, chance: 1 })) },
  },

  ciel: {
    name: 'シエル', title: '天球の指揮者', rarity: 5, elem: 'quantum', path: 'harmony',
    base: { hp: 3500, atk: 1300, def: 900, spd: 112, crit: 0.1, critDmg: 1.2 },
    energyMax: 120,
    look: { hair: '#eceeff', eye: '#7d6bff', style: 'twin', outfit: '#2a2858', accent: '#9d8cff', acc: 'star' },
    basic: { name: '星屑の囁き', target: 'single', desc: '指定した敵単体に攻撃力100%の量子ダメージ。その後、自身の行動順が30%早まる。',
      run: async (B, s, t) => { const r = await B.single(s, t, 1.0, 10, 'basic'); B.advance(s, 0.3); return r; } },
    skill: { name: '星律の導き', target: 'ally', notSelf: true, desc: '自身以外の味方単体の行動順を100%早め、与ダメージ+50%（1ターン）。',
      run: (B, s, t) => { B.buff(t, { key: 'ciel_s', name: '星律の導き', stat: 'dmg', value: 0.5, turns: 1 }); B.advance(t, 1.0); B.float(t, '行動順UP', 'info'); } },
    ult: { name: '天球の交響', target: 'allies', desc: '味方全体の攻撃力+45%、会心ダメージ+（シエルの会心ダメージの15%+12%）（2ターン）。',
      run: (B, s) => {
        const cd = 0.12 + s.stat('critDmg') * 0.15;
        B.aliveAllies().forEach(a => {
          B.buff(a, { key: 'ciel_u1', name: '天球の交響', stat: 'atk', value: 0.45, turns: 2 });
          B.buff(a, { key: 'ciel_u2', name: '天球の交響', stat: 'critDmg', value: cd, turns: 2 });
        });
      } },
    talent: { name: '指揮', desc: '通常攻撃後、自身の行動順が30%早まる。' },
    technique: { name: '序曲', desc: '戦闘開始時、味方全体の攻撃力+15%（2ターン）。',
      run: (B, s) => B.aliveAllies().forEach(a => B.buff(a, { key: 'ciel_tech', name: '序曲', stat: 'atk', value: 0.15, turns: 2 })) },
    ai(B, s) {
      const dps = B.aliveAllies().filter(a => a !== s).sort((a, b) => b.stat('atk') - a.stat('atk'))[0];
      if (dps && B.sp >= 2) return { kind: 'skill', target: dps };
      return { kind: 'basic' };
    },
  },

  nebula: {
    name: 'ネビュラ', title: '蝶影の剣士', rarity: 5, elem: 'quantum', path: 'hunt',
    base: { hp: 3000, atk: 1950, def: 650, spd: 115, crit: 0.5, critDmg: 1.1 },
    energyMax: 120,
    look: { hair: '#3a2e70', eye: '#c3a6ff', style: 'long', outfit: '#17122e', accent: '#a080ff', acc: 'butterfly' },
    basic: { name: '夜刃', target: 'single', desc: '指定した敵単体に攻撃力100%の量子ダメージ。自身の行動順が20%早まる。',
      run: async (B, s, t) => { const r = await B.single(s, t, 1.0, 10, 'basic'); B.advance(s, 0.2); return r; } },
    skill: { name: '残影斬', target: 'single', desc: '指定した敵単体に攻撃力220%の量子ダメージ。速度+25%（2ターン）。',
      run: async (B, s, t) => { B.buff(s, { key: 'neb_spd', name: '残影', stat: 'spd', value: 0.25, turns: 2 }); return B.single(s, t, 2.2, 20, 'skill'); } },
    ult: { name: '蝶の終幕', target: 'single', desc: '増幅状態になり、指定した敵単体に攻撃力425%の量子ダメージ。',
      run: (B, s, t) => { B.buff(s, { key: 'neb_amp', name: '増幅', stat: 'dmg', value: 0.4, turns: 1 }); return B.single(s, t, 4.25, 30, 'ult', { heavy: true }); } },
    talent: { name: '再現', desc: '敵を倒した時、追加ターンを獲得し増幅状態（与ダメージ+40%）になる。追加ターン中は発動しない。',
      onKill(B, s) { if (!s.flags.inExtra && !B.extraQueue.includes(s)) { B.extraTurn(s); B.float(s, '再現', 'info'); } },
      onExtraStart(B, s) { s.flags.inExtra = true; B.buff(s, { key: 'neb_amp', name: '増幅', stat: 'dmg', value: 0.4, turns: 1 }); },
      onExtraEnd(B, s) { s.flags.inExtra = false; } },
    technique: { name: '幻影', desc: '戦闘開始時、増幅状態（与ダメージ+40%、1ターン）になる。',
      run: (B, s) => B.buff(s, { key: 'neb_amp', name: '増幅', stat: 'dmg', value: 0.4, turns: 1 }) },
  },

  vespa: {
    name: 'ヴェスパ', title: '電脳の侵入者', rarity: 4, elem: 'imaginary', path: 'nihility',
    base: { hp: 3200, atk: 1350, def: 800, spd: 107, crit: 0.1, critDmg: 0.6, ehr: 0.3 },
    energyMax: 110,
    look: { hair: '#5c5d6c', eye: '#f5d34a', style: 'short', outfit: '#1b1d24', accent: '#f5d34a', acc: 'phones' },
    basic: { name: 'ノイズ', target: 'single', desc: '指定した敵単体に攻撃力100%の虚数ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: 'バグ注入', target: 'single', desc: '敵単体に攻撃力190%の虚数ダメージ。味方の属性の弱点を1つ付与（3ターン）、85%の基礎確率で全耐性-15%（2ターン）。',
      run: async (B, s, t) => {
        const els = [...new Set(B.aliveAllies().map(a => a.elem))].filter(e => !t.isWeak(e));
        if (els.length) B.implant(t, pick(els), 3);
        B.debuff(s, t, 0.85, { key: 'ves_res', name: '耐性ダウン', stat: 'resDown', value: 0.15, turns: 2 });
        return B.single(s, t, 1.9, 20, 'skill');
      } },
    ult: { name: 'システム掌握', target: 'single', desc: '敵単体に攻撃力380%の虚数ダメージ、85%の基礎確率で防御力-40%（3ターン）。',
      run: (B, s, t) => { B.debuff(s, t, 0.85, { key: 'ves_def', name: '防御ダウン', stat: 'defDown', value: 0.4, turns: 3 }); return B.single(s, t, 3.8, 30, 'ult', { heavy: true }); } },
    talent: { name: 'エラーコード', desc: '攻撃命中時、60%の基礎確率でランダムなバグ（攻撃力-10%／防御力-8%／速度-6%、3ターン）を付与。',
      onHitEnemy(B, s, t) {
        if (!t.alive || Math.random() > 0.6) return;
        const bug = pick([
          { key: 'bug1', name: 'バグ：攻撃', stat: 'atk', value: -0.1 },
          { key: 'bug2', name: 'バグ：防御', stat: 'defDown', value: 0.08 },
          { key: 'bug3', name: 'バグ：速度', stat: 'spd', value: -0.06 },
        ]);
        B.debuff(s, t, 1, { ...bug, turns: 3 }, true);
      } },
    technique: { name: 'ハッキング', desc: '戦闘開始時、敵全体の防御力-15%（2ターン）。',
      run: (B, s) => B.aliveEnemies().forEach(e => B.debuff(s, e, 1, { key: 'ves_tech', name: 'ハッキング', stat: 'defDown', value: 0.15, turns: 2 })) },
  },

  touka: {
    name: 'トウカ', title: '紫電の歌姫', rarity: 4, elem: 'lightning', path: 'erudition',
    base: { hp: 3200, atk: 1500, def: 700, spd: 102, crit: 0.25, critDmg: 0.7 },
    energyMax: 120,
    look: { hair: '#f6b9d9', eye: '#b56bff', style: 'twin', outfit: '#2d1f3a', accent: '#c77dff', acc: 'pin' },
    basic: { name: '紫電', target: 'single', desc: '指定した敵単体に攻撃力100%の雷ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: '雷雨', target: 'bounce', desc: '指定した敵に1回、その後ランダムな敵に計5回、攻撃力55%の雷ダメージ。',
      run: (B, s, t) => B.bounce(s, 5, 0.55, 5, 'skill', {}, t) },
    ult: { name: '万雷', target: 'aoe', desc: '敵全体に攻撃力180%の雷ダメージ、100%の基礎確率で感電（攻撃力40%、2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.8, 20, 'ult', { heavy: true });
        B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'shock', mult: 0.4, turns: 2, chance: 1 }));
        return r;
      } },
    talent: { name: '帯電', desc: '感電状態の敵への与ダメージ+30%。',
      dmgMod: (B, s, t) => (t.dots && t.dots.some(d => d.type === 'shock') ? 0.3 : 0) },
    technique: { name: '前奏', desc: '戦闘開始時、敵全体に感電（攻撃力40%、2ターン）。',
      run: (B, s) => B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'shock', mult: 0.4, turns: 2, chance: 1 })) },
  },
};

// ------------------------------------------------------------
//  敵
// ------------------------------------------------------------
const ENEMY_MOVES = {
  strike:  { name: '斬撃',       type: 'single', mult: 1.0 },
  heavy:   { name: '重撃',       type: 'single', mult: 1.8 },
  blast:   { name: '薙ぎ払い',   type: 'blast',  mult: 1.1, adj: 0.5 },
  aoe:     { name: '虚無の波動', type: 'aoe',    mult: 0.6 },
  burn:    { name: '灼熱の爪',   type: 'single', mult: 0.9, eff: { kind: 'dot', type: 'burn', mult: 0.35, turns: 2, chance: 0.6 } },
  frost:   { name: '凍てつく息吹', type: 'blast', mult: 0.8, adj: 0.4, eff: { kind: 'freeze', chance: 0.3 } },
  shock:   { name: '放電',       type: 'single', mult: 0.9, eff: { kind: 'dot', type: 'shock', mult: 0.4, turns: 2, chance: 0.6 } },
  slow:    { name: '粘着弾',     type: 'single', mult: 0.8, eff: { kind: 'buff', chance: 0.7, buff: { key: 'e_slow', name: '減速', stat: 'spd', value: -0.15, turns: 2 } } },
  weaken:  { name: '破甲',       type: 'single', mult: 0.9, eff: { kind: 'buff', chance: 0.7, buff: { key: 'e_def', name: '防御ダウン', stat: 'def', value: -0.25, turns: 2 } } },
  charge:  { name: 'エネルギーを蓄えている…', type: 'charge', next: 'nova' },
  nova:    { name: '星核崩壊',   type: 'aoe', mult: 1.6 },
  gcharge: { name: '砲身が赤熱している…', type: 'charge', next: 'barrage' },
  barrage: { name: '機関砲掃射', type: 'aoe', mult: 1.2 },
  summon:  { name: '増援召喚',   type: 'summon' },
};

const ENEMIES = {
  scout:      { name: '虚卒・斥候',   shape: 'humanoid', color: '#ff4d6d', hp: 3500, atk: 1000, spd: 83,  tough: 30, weak: ['physical', 'ice', 'quantum'], moves: [['strike', 3], ['weaken', 1]] },
  plunderer:  { name: '虚卒・略奪者', shape: 'brute',    color: '#ff8a3d', hp: 4000, atk: 1100, spd: 100, tough: 30, weak: ['fire', 'lightning', 'imaginary'], moves: [['strike', 2], ['blast', 1], ['burn', 1]] },
  drone:      { name: '巡回ドローン', shape: 'drone',    color: '#4dd2ff', hp: 3000, atk: 950,  spd: 120, tough: 30, weak: ['lightning', 'wind', 'imaginary'], moves: [['shock', 2], ['slow', 1]] },
  frostbeast: { name: '霜咬みの獣',   shape: 'beast',    color: '#7fe3ff', hp: 4500, atk: 1100, spd: 95,  tough: 30, weak: ['fire', 'physical', 'quantum'], moves: [['strike', 2], ['frost', 1]] },
  flamespawn: { name: '炎霊',         shape: 'spirit',   color: '#ff6a3d', hp: 3800, atk: 1150, spd: 105, tough: 30, weak: ['ice', 'wind', 'quantum'], moves: [['burn', 2], ['strike', 1]] },
  wraith:     { name: '虚影',         shape: 'wraith',   color: '#b36bff', hp: 4200, atk: 1200, spd: 110, tough: 30, weak: ['physical', 'fire', 'wind'], moves: [['strike', 1], ['weaken', 1], ['slow', 1]] },
  knight:     { name: '反物質の騎士', shape: 'knight',   color: '#b36bff', elite: true, hp: 15000, atk: 1300, spd: 100, tough: 90, eres: 0.2, weak: ['quantum', 'imaginary', 'wind'], moves: [['blast', 2], ['heavy', 2], ['aoe', 1]] },
  golem:      { name: '鋼鉄の巨像',   shape: 'golem',    color: '#ffb13d', elite: true, hp: 18000, atk: 1250, spd: 80,  tough: 100, eres: 0.2, weak: ['fire', 'lightning', 'quantum'], moves: [['heavy', 2], ['gcharge', 1]] },
  boss_core:    { name: '星核の番人',   shape: 'boss',    color: '#ff4d6d', boss: true, hp: 35000, atk: 1400, spd: 100, tough: 160, eres: 0.3, weak: ['physical', 'fire', 'lightning'],
                  phases: [{ weak: ['ice', 'quantum', 'imaginary'] }], summon: 'scout', moves: [['strike', 2], ['aoe', 2], ['charge', 1], ['summon', 1]] },
  boss_empress: { name: '氷刃の女帝',   shape: 'empress', color: '#7fe3ff', boss: true, hp: 40000, atk: 1450, spd: 105, tough: 180, eres: 0.3, weak: ['fire', 'physical', 'imaginary'],
                  phases: [{ weak: ['fire', 'wind', 'lightning'] }], summon: 'frostbeast', moves: [['frost', 2], ['blast', 2], ['charge', 1], ['summon', 1]] },
  boss_dragon:  { name: '蝕月の龍',     shape: 'dragon',  color: '#ffcf4d', boss: true, hp: 45000, atk: 1500, spd: 110, tough: 180, eres: 0.3, weak: ['ice', 'quantum', 'wind'],
                  phases: [{ weak: ['physical', 'imaginary', 'lightning'] }], summon: 'flamespawn', moves: [['burn', 2], ['aoe', 2], ['charge', 1], ['blast', 1], ['summon', 1]] },
  boss_final:   { name: '終焉の星神 アルケー', shape: 'deity', color: '#e8c77a', boss: true, hp: 45000, atk: 1600, spd: 112, tough: 200, eres: 0.35, weak: ['physical', 'fire', 'ice'],
                  phases: [{ weak: ['lightning', 'wind', 'quantum'] }, { weak: ['imaginary', 'quantum', 'fire'] }], summon: 'wraith', moves: [['aoe', 2], ['blast', 2], ['weaken', 1], ['charge', 1], ['summon', 1]] },
};

// ------------------------------------------------------------
//  ステージ
// ------------------------------------------------------------
const CHAPTERS = [
  { id: 'c1', name: 'ヘリオス宇宙ステーション', bg: 'station', desc: '反物質軍団に襲撃された研究ステーション。星核の反応が観測されている。',
    stages: [
      { id: '1-1', name: '緊急収容区画', lv: 1,  waves: [['scout', 'scout'], ['scout', 'drone', 'scout']] },
      { id: '1-2', name: '物資保管庫',   lv: 3,  waves: [['drone', 'scout', 'drone'], ['plunderer', 'scout', 'plunderer']] },
      { id: '1-3', name: '主制御区画',   lv: 6,  waves: [['scout', 'plunderer', 'scout'], ['drone', 'knight', 'drone']] },
      { id: '1-4', name: '動力炉',       lv: 9,  waves: [['plunderer', 'drone', 'plunderer'], ['scout', 'golem', 'scout']] },
      { id: '1-5', name: '星核の間',     lv: 12, boss: true, waves: [['scout', 'drone', 'scout'], ['boss_core']] },
    ] },
  { id: 'c2', name: '永久凍土の都ベロワ', bg: 'snow', desc: '永遠の冬に閉ざされた城塞都市。吹雪の奥に女帝が君臨する。',
    stages: [
      { id: '2-1', name: '雪原の外縁',   lv: 16, waves: [['frostbeast', 'frostbeast'], ['frostbeast', 'drone', 'frostbeast']] },
      { id: '2-2', name: '凍てついた街路', lv: 20, waves: [['plunderer', 'frostbeast', 'plunderer'], ['frostbeast', 'golem', 'frostbeast']] },
      { id: '2-3', name: '地下鉱区',     lv: 24, waves: [['frostbeast', 'knight', 'frostbeast'], ['drone', 'drone', 'drone', 'drone']] },
      { id: '2-4', name: '城塞の門',     lv: 28, waves: [['golem', 'frostbeast'], ['frostbeast', 'knight', 'golem']] },
      { id: '2-5', name: '氷晶の玉座',   lv: 32, boss: true, waves: [['frostbeast', 'frostbeast', 'frostbeast'], ['boss_empress']] },
    ] },
  { id: 'c3', name: '雲海の仙舟 ホウライ', bg: 'xian', desc: '雲海を往く巨大な方舟。月蝕とともに古の龍が目を覚ます。',
    stages: [
      { id: '3-1', name: '渡し場',       lv: 38, waves: [['flamespawn', 'flamespawn', 'flamespawn'], ['flamespawn', 'knight', 'flamespawn']] },
      { id: '3-2', name: '丹鼎司',       lv: 42, waves: [['wraith', 'flamespawn', 'wraith'], ['golem', 'flamespawn', 'golem']] },
      { id: '3-3', name: '雲騎の演武場', lv: 48, waves: [['knight', 'flamespawn'], ['flamespawn', 'knight', 'wraith', 'flamespawn']] },
      { id: '3-4', name: '鱗淵境',       lv: 54, waves: [['wraith', 'wraith', 'wraith'], ['knight', 'golem']] },
      { id: '3-5', name: '蝕月の祭壇',   lv: 60, boss: true, waves: [['flamespawn', 'wraith', 'flamespawn'], ['boss_dragon']] },
    ] },
  { id: 'c4', name: '星核の深淵', bg: 'abyss', desc: '全ての星核が生まれた場所。終焉を司る星神が待つ。',
    stages: [
      { id: '4-1', name: '虚無の回廊',   lv: 65, waves: [['wraith', 'scout', 'wraith'], ['knight', 'wraith', 'knight']] },
      { id: '4-2', name: '崩れた星図',   lv: 70, waves: [['golem', 'drone', 'golem'], ['wraith', 'knight', 'wraith', 'drone']] },
      { id: '4-3', name: '終焉の門',     lv: 75, waves: [['knight', 'golem', 'knight'], ['wraith', 'wraith', 'wraith', 'wraith']] },
      { id: '4-4', name: '星神の座',     lv: 80, boss: true, waves: [['knight', 'wraith', 'knight'], ['boss_final']] },
    ] },
];

// ------------------------------------------------------------
//  模擬宇宙：祝福
// ------------------------------------------------------------
const BLESSINGS = [
  { id: 'd1', path: 'destruction', name: '破壊の衝動', desc: '味方全体の攻撃力+15%。', stats: [['atk', 0.15]] },
  { id: 'd2', path: 'destruction', name: '最後の足掻き', desc: 'HP50%以下の味方の与ダメージ+35%。', dmgMod: (B, s) => (s.hp / s.maxHp <= 0.5 ? 0.35 : 0) },
  { id: 'd3', path: 'destruction', name: '崩壊の連鎖', desc: '弱点撃破時、敵全体に撃破した味方の攻撃力50%のダメージ。',
    onBreak: (B, s) => B.aliveEnemies().forEach(e => { const v = B.calcDamage(s, e, 0.5, 'tech', { noCrit: true }).value; B.applyDamage(e, v, s); }) },
  { id: 'h1', path: 'hunt', name: '狩人の眼', desc: '味方全体の会心率+10%。', stats: [['crit', 0.1]] },
  { id: 'h2', path: 'hunt', name: '致命の一撃', desc: '味方全体の会心ダメージ+30%。', stats: [['critDmg', 0.3]] },
  { id: 'h3', path: 'hunt', name: '追撃の構え', desc: '必殺技を発動した後、その味方の行動順が25%早まる。', afterUlt: (B, s) => B.advance(s, 0.25) },
  { id: 'e1', path: 'erudition', name: '叡智の光', desc: '味方全体の与ダメージ+15%。', stats: [['dmg', 0.15]] },
  { id: 'e2', path: 'erudition', name: '充電', desc: '味方全体のEP回復効率+20%。', stats: [['err', 0.2]] },
  { id: 'e3', path: 'erudition', name: '全知の瞳', desc: '必殺技の与ダメージ+40%。', stats: [['dmg_ult', 0.4]] },
  { id: 'm1', path: 'harmony', name: '共鳴', desc: '味方全体の撃破特効+40%。', stats: [['be', 0.4]] },
  { id: 'm2', path: 'harmony', name: '律動', desc: '味方全体の速度+8%。', stats: [['spd', 0.08]] },
  { id: 'm3', path: 'harmony', name: '協奏', desc: '戦闘開始時、SPを2回復する。', onBattleStart: B => B.addSp(2) },
  { id: 'n1', path: 'nihility', name: '侵蝕の囁き', desc: '味方全体の持続ダメージ+40%。', stats: [['dmg_dot', 0.4]] },
  { id: 'n2', path: 'nihility', name: '脆弱', desc: '敵全体の被ダメージ+10%。', enemyStats: [['vuln', 0.1]] },
  { id: 'n3', path: 'nihility', name: '鈍化', desc: '敵全体の速度-10%。', enemyStats: [['spd', -0.1]] },
  { id: 'p1', path: 'preservation', name: '守護の盾', desc: '戦闘開始時、味方全体に最大HP20%のシールド（3ターン）。',
    onBattleStart: B => B.aliveAllies().forEach(a => B.shield(a, a, a.maxHp * 0.2, 3)) },
  { id: 'p2', path: 'preservation', name: '鉄壁', desc: '味方全体の防御力+30%、被ダメージ-10%。', stats: [['def', 0.3], ['vuln', -0.1]] },
  { id: 'a1', path: 'abundance', name: '生命の泉', desc: '味方のターン開始時、HPを最大HPの6%回復。', onTurnStart: (B, s) => B.heal(s, s, s.maxHp * 0.06, true) },
  { id: 'a2', path: 'abundance', name: '再生', desc: '味方全体の最大HP+20%。', stats: [['maxHp', 0.2]] },
  { id: 'a3', path: 'abundance', name: '祝福の雨', desc: '戦闘に勝利した後、味方全体のHPを30%回復。', afterWin: true },
];

// ワープ（ガチャ）
const BANNERS = {
  limited: { name: '蝶影の夜想曲', type: 'limited', featured: 'nebula', rateUp4: ['vespa', 'touka', 'kazane'],
    desc: '限定5★「ネビュラ」の排出確率UP！ 5★を獲得した時、50%の確率でネビュラ。すり抜けた場合、次の5★は必ずネビュラ。' },
  standard: { name: '群星の跳躍', type: 'standard',
    desc: '常設ワープ。5★「ライカ」「ホムラ」「シエル」のいずれかを獲得できる。' },
};
const POOL5 = ['laika', 'homura', 'ciel'];
const POOL4 = ['mizore', 'yue', 'kazane', 'vespa', 'touka'];

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
