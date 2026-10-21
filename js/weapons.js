'use strict';
// ============================================================
//  武器：にゃんこごとに1種類（ミケ＝剣、クロ＝刀、シロ＝杖、タマ＝まくら、マオウ＝笏）
//  武器を替えると、通常攻撃・戦闘スキル・必殺技がまるごと変わる（とくせい・初手技はその子のまま）
//  属性は技ごと（elem）。同じ子でも、武器が替われば属性も替えられる
//  鍛冶屋で +1〜+5 に鍛えると、HP・攻撃力・防御力が上がる
//  start：はじめから持っている武器。技は CHARS のもの（物語とともに育つ）
//  tier：段（0〜3）。段が高いほど素の力が強く、鍛えるのに にぼしがかかる
//  look：見た目の色（c＝本体、g＝光るところ）。形は武器ごと（js/gfx/weapon-models.js）
//  get：手に入れ方（shop＝武器屋で price で買う、chest＝zone の宝箱 i 番）
// ============================================================
const WEAPON_MAX = 5;
const TIER_POW = [1, 1.05, 1.1, 1.16];
const TIER_COST = [1, 1.3, 1.6, 2];
const WEAPON_KIND = { sword: '剣', blade: '刀', wand: '杖', pillow: 'まくら', scepter: '笏' };
const WEAPON_GLYPH = { sword: '剣', blade: '刀', wand: '杖', pillow: '枕', scepter: '笏' };   // アイコンの一文字

// 自分にかえってくるダメージ（倒れはしない）
function selfHurt(B, s, ratio) {
  const v = Math.min(s.hp - 1, s.maxHp * ratio);
  if (v > 0) B.applyDamage(s, v, s, abElem(B.curAb));
}

const WEAPONS = {
  // ---------------- ミケ（剣） ----------------
  mike_wood: { owner: 'mike', name: '木のつるぎ', tier: 0, start: true,
    desc: '村で拾った木のつるぎ。勇者の技は、旅とともに育っていく。' },
  mike_katsuo: { owner: 'mike', name: 'かつおぶしソード', tier: 1, get: { shop: true, price: 500 },
    desc: 'かつおぶしを削って作った剣。振るたびに、いいにおいがする。', look: { c: '#c8884a', g: '#ffd8a0' },
    basic: { name: 'ひとけずり', elem: 'physical', target: 'single', anim: 'shave', desc: '指定した敵単体に攻撃力100%の物理ダメージ。自身のHPを最大HP4%回復。',
      run: async (B, s, t) => { const r = await B.single(s, t, 1.0, 10, 'basic'); B.heal(s, s, s.maxHp * 0.04, true); return r; } },
    skill: { name: 'けずり節', elem: 'physical', target: 'bounce', anim: 'flakes', desc: 'ランダムな敵に攻撃力55%の物理ダメージを4回。そのあと、だしの香りで味方全体のHPを最大HP5%回復。',
      run: async (B, s, t) => {
        const r = await B.bounce(s, 4, 0.55, 8, 'skill', {}, t);
        B.aliveAllies().forEach(a => B.heal(s, a, a.maxHp * 0.05));
        return r;
      } },
    ult: { name: 'だしの大波', elem: 'fire', target: 'aoe', anim: 'dashi', desc: '敵全体に攻撃力170%の炎ダメージ。味方全体のHPを最大HP15%回復。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.7, 20, 'ult', { heavy: true });
        B.aliveAllies().forEach(a => B.heal(s, a, a.maxHp * 0.15));
        return r;
      } } },
  mike_flame: { owner: 'mike', name: 'ほのおのつるぎ', tier: 2, get: { chest: ['woods_deep', 0] },
    desc: '大樹のうろで眠っていた、刃が燃えているつるぎ。', look: { c: '#ff9a6a', g: '#ff5a2a' },
    basic: { name: '火の粉', elem: 'fire', target: 'single', anim: 'ember', desc: '指定した敵単体に攻撃力100%の炎ダメージ。40%の基礎確率で燃焼（攻撃力30%、2ターン）。',
      run: async (B, s, t) => { const r = await B.single(s, t, 1.0, 10, 'basic'); B.dot(s, t, { type: 'burn', mult: 0.3, turns: 2, chance: 0.4, quiet: true }); return r; } },
    skill: { name: '燃えうつり', elem: 'fire', target: 'blast', anim: 'spread', desc: '指定した敵単体に攻撃力120%、隣接する敵に攻撃力50%の炎ダメージ。指定した敵を燃焼（攻撃力50%、2ターン）、隣接する敵も50%の基礎確率で燃焼。',
      run: async (B, s, t) => {
        const adj = B.adjacent(t);
        const r = await B.blast(s, t, 1.2, 0.5, 20, 10, 'skill');
        B.dot(s, t, { type: 'burn', mult: 0.5, turns: 2 });
        adj.forEach(a => B.dot(s, a, { type: 'burn', mult: 0.5, turns: 2, chance: 0.5 }));
        return r;
      } },
    ult: { name: '炎の大車輪', elem: 'fire', target: 'aoe', anim: 'spin', desc: '敵全体に攻撃力170%の炎ダメージ。燃焼している敵は、燃焼のダメージがその場でもう一度発生する。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.7, 20, 'ult', { heavy: true });
        for (const e of B.aliveEnemies()) if (e.dots.some(d => d.type === 'burn')) await B.detonate(e, 1);
        await B.resolveDeaths(s, 'ult');
        return r;
      } } },
  mike_big: { owner: 'mike', name: 'ねこじゃらしの大剣', tier: 3, get: { chest: ['tree_under_2', 0] }, mod: { atk: 1.08, def: 0.94 }, energyMax: 140,
    desc: 'にゃんだーの樹の根にからまっていた大剣。ふさふさの先っぽが、つい気になる。', look: { c: '#f4e8b0', g: '#ffe07a' },
    basic: { name: 'ぶんまわし', elem: 'physical', target: 'blast', anim: 'bigSwing', desc: '指定した敵単体に攻撃力90%、隣接する敵に攻撃力30%の物理ダメージ。',
      run: (B, s, t) => B.blast(s, t, 0.9, 0.3, 10, 5, 'basic') },
    skill: { name: 'ためぎり', elem: 'physical', target: 'single', anim: 'charge', desc: '指定した敵単体に攻撃力300%の物理ダメージ。大きく振りかぶるので、自身の行動順が20%遅れる。',
      run: async (B, s, t) => { const r = await B.single(s, t, 3.0, 30, 'skill', { heavy: true }); B.delay(s, 0.2); return r; } },
    ult: { name: 'にゃんだー斬り', elem: 'imaginary', target: 'single', anim: 'nyander', desc: '指定した敵単体に攻撃力550%の光ダメージ。弱点撃破されている敵には、与ダメージ+50%。',
      run: (B, s, t) => B.single(s, t, 5.5, 40, 'ult', { heavy: true, dmgBonus: t.broken ? 0.5 : 0 }) } },

  // ---------------- クロ（刀） ----------------
  kuro_black: { owner: 'kuro', name: '古びた黒刀', tier: 0, start: true,
    desc: '空から落ちてきたときに持っていた刀。ひとりで戦ってきた、するどい技が身についている。' },
  kuro_bokuto: { owner: 'kuro', name: 'まもりの木刀', tier: 1, get: { shop: true, price: 500 },
    desc: '道場で使う、かたい木刀。斬るより、受けとめるための刀。', look: { c: '#b08a5a', g: '#ffe0a0' },
    basic: { name: '受け流し', elem: 'physical', target: 'single', anim: 'parry', desc: '指定した敵単体に防御力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic', { stat: 'def' }) },
    skill: { name: 'かばう構え', target: 'allies', anim: 'guard', desc: '自身は敵に狙われやすくなり（2ターン）、防御力80%+300のシールドを得る。味方全体の被ダメージ-15%（2ターン）。',
      run: (B, s) => {
        B.buff(s, { key: 'kuro_aggro', name: '挑発', stat: 'aggro', value: 3, turns: 2 });
        B.shield(s, s, s.stat('def') * 0.8 + 300 * lvFactor(s.level), 2);
        B.aliveAllies().forEach(a => B.buff(a, { key: 'kuro_kabau', name: 'かばう構え', stat: 'vuln', value: -0.15, turns: 2 }));
        B.float(s, 'まかせろ', 'info');
        return [];
      } },
    ult: { name: '不動の壁', elem: 'physical', target: 'aoe', anim: 'wall', desc: '味方全体に防御力60%+300のシールド（3ターン）。敵全体に防御力120%の物理ダメージ。',
      run: async (B, s) => {
        const v = s.stat('def') * 0.6 + 300 * lvFactor(s.level);
        B.aliveAllies().forEach(a => B.shield(s, a, v, 3));
        return B.aoe(s, 1.2, 20, 'ult', { heavy: true, stat: 'def' });
      } },
    ai(B, s) {
      const low = B.aliveAllies().filter(a => a.hp / a.maxHp < 0.6);
      if (B.sp >= 1 && (low.length >= 1 || B.sp >= 4) && !s.buffs.some(b => b.key === 'kuro_aggro')) return { kind: 'skill' };
      return { kind: 'basic' };
    } },
  kuro_twin: { owner: 'kuro', name: '双子の小太刀', tier: 1, get: { chest: ['forest_deep', 0] }, mod: { atk: 1.06, def: 0.95 },
    desc: 'ほしふる森に落ちていた、二本ひと組の小太刀。すばやく何度も斬る。', look: { c: '#8a96b8', g: '#d8e4ff' },
    basic: { name: '二連', elem: 'physical', target: 'single', anim: 'twin', desc: '指定した敵単体に攻撃力55%の物理ダメージを2回。',
      run: (B, s, t) => B.doHits(s, [{ t, mult: 0.55, tough: 5 }, { t, mult: 0.55, tough: 5 }], 'basic') },
    skill: { name: '三連影', elem: 'physical', target: 'single', anim: 'triple', desc: '指定した敵単体に攻撃力75%の物理ダメージを3回。自身の速度+15%（2ターン）。',
      run: async (B, s, t) => {
        const r = await B.doHits(s, [0, 1, 2].map(() => ({ t, mult: 0.75, tough: 7 })), 'skill');
        B.buff(s, { key: 'kuro_twin', name: '身軽', stat: 'spd', value: 0.15, turns: 2 });
        return r;
      } },
    ult: { name: '影分身', elem: 'quantum', target: 'bounce', anim: 'shadow', desc: 'ランダムな敵に攻撃力60%の闇ダメージを8回。自身に防御力50%のシールド（2ターン）。',
      run: async (B, s, t) => {
        const r = await B.bounce(s, 8, 0.6, 5, 'ult', { heavy: true }, t);
        B.shield(s, s, s.stat('def') * 0.5, 2);
        return r;
      } } },
  kuro_moon: { owner: 'kuro', name: '月影の刀', tier: 2, get: { chest: ['cave_deep', 3] },
    desc: '黒影洞窟の奥にしまわれていた刀。むかし、だれかがクロのために打ったものらしい。', look: { c: '#2a2840', g: '#c8b8ff' },
    basic: { name: '月の爪', elem: 'physical', target: 'single', anim: 'moonClaw', desc: '指定した敵単体に攻撃力100%の物理ダメージ。40%の基礎確率で裂創（攻撃力40%、2ターン）。',
      run: async (B, s, t) => { const r = await B.single(s, t, 1.0, 10, 'basic'); B.dot(s, t, { type: 'bleed', mult: 0.4, turns: 2, chance: 0.4, quiet: true }); return r; } },
    skill: { name: '月影斬り', elem: 'physical', target: 'single', anim: 'moonCut', desc: '指定した敵単体に攻撃力170%の物理ダメージ、裂創（攻撃力60%、2ターン）。自身は敵に狙われやすくなる（2ターン）。',
      run: async (B, s, t) => {
        B.buff(s, { key: 'kuro_aggro', name: '挑発', stat: 'aggro', value: 3, turns: 2 });
        const r = await B.single(s, t, 1.7, 20, 'skill');
        B.dot(s, t, { type: 'bleed', mult: 0.6, turns: 2 });
        return r;
      } },
    ult: { name: '満月', elem: 'imaginary', target: 'aoe', anim: 'fullMoon', desc: '敵全体に攻撃力140%の光ダメージ、80%の基礎確率で裂創（攻撃力50%、2ターン）。持続ダメージを受けている敵は、それがその場でもう一度発生する。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.4, 20, 'ult', { heavy: true });
        for (const e of B.aliveEnemies()) { B.dot(s, e, { type: 'bleed', mult: 0.5, turns: 2, chance: 0.8 }); if (e.dots.length) await B.detonate(e, 1); }
        await B.resolveDeaths(s, 'ult');
        return r;
      } } },

  // ---------------- シロ（杖） ----------------
  shiro_star: { owner: 'shiro', name: '見習いの杖', tier: 0, start: true,
    desc: '魔法学校でもらった杖。天才魔法は、ときどき失敗する。' },
  shiro_majime: { owner: 'shiro', name: 'まじめな杖', tier: 1, get: { shop: true, price: 500 },
    desc: '「説明書どおりに唱えれば、失敗しません」と書いてある杖。シロは少し不満そう。', look: { c: '#8a9ab8', g: '#9ad8ff' },
    basic: { name: 'ていねいアロー', elem: 'lightning', target: 'single', desc: '指定した敵単体に攻撃力100%の雷ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: 'ちゃんとサンダー', elem: 'lightning', target: 'blast', anim: 'bolt', desc: '指定した敵単体に攻撃力160%、隣接する敵に攻撃力60%の雷ダメージ。失敗しない。',
      run: (B, s, t) => B.blast(s, t, 1.6, 0.6, 20, 10, 'skill') },
    ult: { name: 'きちょうめんな雷雨', elem: 'lightning', target: 'bounce', anim: 'bolt', desc: 'ランダムな敵に攻撃力70%の雷ダメージを7回。そのあと敵全体を50%の基礎確率で感電（攻撃力40%、2ターン）。',
      run: async (B, s, t) => {
        const r = await B.bounce(s, 7, 0.7, 6, 'ult', { heavy: true }, t);
        B.aliveEnemies().forEach(e => B.dot(s, e, { type: 'shock', mult: 0.4, turns: 2, chance: 0.5 }));
        return r;
      } } },
  shiro_ice: { owner: 'shiro', name: 'こおりの杖', tier: 2, get: { chest: ['tower_top', 0] },
    desc: '笑顔の塔の大舞台にあった、ひんやりした杖。この杖の魔法は、すべて氷になる。', look: { c: '#d8f4ff', g: '#6fd6f5' },
    basic: { name: 'つらら', elem: 'ice', target: 'single', desc: '指定した敵単体に攻撃力100%の氷ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: 'アイス・改', elem: 'ice', target: 'blast', anim: 'ice', desc: '指定した敵単体に攻撃力150%、隣接する敵に攻撃力60%の氷ダメージ。指定した敵を30%の基礎確率で凍結。',
      run: async (B, s, t) => {
        const r = await B.blast(s, t, 1.5, 0.6, 20, 10, 'skill');
        if (t.alive) B.freeze(s, t, 0.3, s.stat('atk') * 0.5);
        return r;
      } },
    ult: { name: 'ダイヤモンドダスト', elem: 'ice', target: 'aoe', anim: 'ice', desc: '敵全体に攻撃力210%の氷ダメージ。敵全体を35%の基礎確率で凍結。',
      run: async (B, s) => {
        const r = await B.aoe(s, 2.1, 20, 'ult', { heavy: true });
        B.aliveEnemies().forEach(e => B.freeze(s, e, 0.35, s.stat('atk') * 0.5));
        return r;
      } } },
  shiro_boom: { owner: 'shiro', name: '大ばくはつの杖', tier: 3, get: { chest: ['ruins_maze', 0] }, mod: { atk: 1.1, hp: 0.92 },
    desc: '古代の魔法使いが「危ないので封印」と書き残した杖。シロは大よろこび。', look: { c: '#4a2a3a', g: '#ff8a3a' },
    basic: { name: 'ぼんっ', elem: 'fire', target: 'blast', desc: '指定した敵単体に攻撃力80%、隣接する敵に攻撃力30%の炎ダメージ。',
      run: (B, s, t) => B.blast(s, t, 0.8, 0.3, 10, 5, 'basic') },
    skill: { name: 'ばくはつ魔法', elem: 'fire', target: 'aoe', desc: '敵全体に攻撃力150%の炎ダメージ。25%の確率で大成功（与ダメージ+60%）、25%の確率で自分もまきこまれる（最大HP10%のダメージ）。',
      run: async (B, s) => {
        const roll = Math.random();
        if (roll < 0.25) B.announce('ばくはつ魔法', '大成功！', ELEMENTS.fire.color);
        const r = await B.aoe(s, 1.5, 15, 'skill', { dmgBonus: roll < 0.25 ? 0.6 : 0 });
        if (roll >= 0.75) { B.float(s, 'けほっ', 'info'); selfHurt(B, s, 0.1); }
        return r;
      } },
    ult: { name: 'ちょう大ばくはつ', elem: 'fire', target: 'aoe', desc: '敵全体に攻撃力300%の炎ダメージ。自身も最大HP15%のダメージを受ける（倒れはしない）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 3.0, 25, 'ult', { heavy: true });
        selfHurt(B, s, 0.15); B.float(s, '毛が爆発した！', 'info');
        return r;
      } } },

  // ---------------- タマ（まくら） ----------------
  tama_plain: { owner: 'tama', name: 'ふつうのまくら', tier: 0, start: true,
    desc: 'いつも抱えているまくら。なでなでと、おひさまのうたで仲間をいやす。' },
  tama_soba: { owner: 'tama', name: 'そばがらまくら', tier: 1, get: { shop: true, price: 500 },
    desc: 'かためのまくら。ふかふかではないけれど、しっかり支えてくれる。', look: { c: '#e8d0a0', g: '#a07840' },
    basic: { name: 'ざくっ', elem: 'physical', target: 'single', anim: 'bonk', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: 'しっかり支える', target: 'ally', anim: 'pat', desc: '味方単体にタマの最大HP22%+300のシールド（2ターン）、HPを最大HP10%回復。',
      run: (B, s, t) => {
        B.shield(s, t, s.maxHp * 0.22 + 300 * lvFactor(s.level), 2);
        B.heal(s, t, t.maxHp * 0.1, true);
      } },
    ult: { name: 'まくらの砦', target: 'allies', anim: 'fort', desc: '味方全体にタマの最大HP18%+250のシールド（2ターン）、HPを最大HP15%回復。',
      run: (B, s) => B.aliveAllies().forEach(a => { B.shield(s, a, s.maxHp * 0.18 + 250 * lvFactor(s.level), 2); B.heal(s, a, a.maxHp * 0.15); }) },
    ai(B, s) {
      const low = B.aliveAllies().filter(a => a.shield <= 0).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      if (B.sp >= 1 && low && low.hp / low.maxHp < 0.75) return { kind: 'skill', target: low };
      return { kind: 'basic' };
    } },
  tama_cushion: { owner: 'tama', name: 'ねこ型クッション', tier: 2, get: { chest: ['tower_2f', 0] },
    desc: '笑顔の塔の楽屋に置いてあったクッション。抱きしめると、元気が出る。', look: { c: '#ffb870', g: '#ff8ab8' },
    basic: { name: 'もふっ', elem: 'physical', target: 'single', anim: 'bonk', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: 'もふもふ応援', target: 'ally', anim: 'cheer', notSelf: true, desc: '自分以外の味方単体の攻撃力+35%（2ターン）、行動順を25%早める。',
      run: (B, s, t) => {
        B.buff(t, { key: 'tama_ouen', name: 'もふもふ応援', stat: 'atk', value: 0.35, turns: 2 });
        B.advance(t, 0.25); B.float(t, 'がんばれ〜', 'info');
      } },
    ult: { name: 'みんなでぎゅっ', target: 'allies', anim: 'hug', desc: '味方全体の攻撃力+25%・会心率+15%（2ターン）、HPを最大HP10%回復。',
      run: (B, s) => B.aliveAllies().forEach(a => {
        B.buff(a, { key: 'tama_gyu', name: 'ぎゅっ', stat: 'atk', value: 0.25, turns: 2 });
        B.buff(a, { key: 'tama_gyu2', name: 'ぎゅっ', stat: 'crit', value: 0.15, turns: 2 });
        B.heal(s, a, a.maxHp * 0.1);
      }) },
    ai(B, s) {
      const t = B.aliveAllies().filter(a => a !== s && !a.buffs.some(b => b.key === 'tama_ouen')).sort((a, b) => b.stat('atk') - a.stat('atk'))[0];
      if (B.sp >= 1 && t) return { kind: 'skill', target: t };
      return { kind: 'basic' };
    } },
  tama_dream: { owner: 'tama', name: '夢見まくら', tier: 3, get: { chest: ['ruins_seal', 0] },
    desc: '封印の間で、ずっとだれかを眠らせていたまくら。敵もつい、うとうとする。', look: { c: '#b8b0ff', g: '#fff0a8' },
    basic: { name: 'ねむねむ', elem: 'imaginary', target: 'single', anim: 'bonk', desc: '指定した敵単体に攻撃力100%の光ダメージ。行動順を10%遅らせる。',
      run: async (B, s, t) => { const r = await B.single(s, t, 1.0, 10, 'basic'); if (t.alive) B.delay(t, 0.1); return r; } },
    skill: { name: '子守歌', elem: 'imaginary', target: 'single', anim: 'lullaby', desc: '指定した敵単体に攻撃力60%の光ダメージ、行動順を40%遅らせる。味方全体のHPをタマの最大HP10%回復。',
      run: async (B, s, t) => {
        const r = await B.single(s, t, 0.6, 15, 'skill');
        if (t.alive) { B.delay(t, 0.4); B.float(t, 'うとうと', 'info'); }
        B.aliveAllies().forEach(a => B.heal(s, a, s.maxHp * 0.1));
        return r;
      } },
    ult: { name: 'みんなでおひるね', target: 'aoe', desc: '敵全体の行動順を35%遅らせる。味方全体のHPをタマの最大HP25%回復し、デバフを1つ解除する。',
      run: async (B, s) => {
        await B.motion(s, 'lullaby', B.aliveEnemies());
        B.aliveEnemies().forEach(e => { B.delay(e, 0.35); B.float(e, 'Zzz…', 'info'); });
        B.aliveAllies().forEach(a => { B.heal(s, a, s.maxHp * 0.25); B.cleanse(a); });
        return [];
      } },
    ai(B, s) {
      const hurt = B.aliveAllies().some(a => a.hp / a.maxHp < 0.6);
      if (B.sp >= 1 && (hurt || B.sp >= 4)) return { kind: 'skill' };
      return { kind: 'basic' };
    } },

  // ---------------- マオウ（笏） ----------------
  maou_scepter: { owner: 'maou', name: '魔王の笏', tier: 0, start: true,
    desc: '魔王の座についたときから持っている笏。' },
  maou_toy: { owner: 'maou', name: 'おもちゃの笏', tier: 2, get: { shop: true, price: 900 },
    desc: 'ふると「ピコッ」と鳴る笏。なにが起きるかは、ふってみるまでわからない。', look: { c: '#ff8ab8', g: '#6ad8ff' },
    basic: { name: 'ピコッ', elem: 'physical', target: 'single', anim: 'bonk', desc: '指定した敵単体に攻撃力100%の物理ダメージ。',
      run: (B, s, t) => B.single(s, t, 1.0, 10, 'basic') },
    skill: { name: 'なにが出るかな', elem: 'physical', target: 'aoe', desc: '次のどれかが起きる：敵全体に攻撃力130%の物理ダメージ／ランダムな敵単体に攻撃力320%の物理ダメージ／敵全体の防御力-30%（2ターン）／味方全体の攻撃力+25%（2ターン）。',
      run: async (B, s) => {
        const n = Math.floor(Math.random() * 4);
        await B.motion(s, 'surprise');
        B.announce('なにが出るかな', ['ピコピコハンマー！', 'おおきなパンチ！', 'こちょこちょ！', 'がんばれの旗！'][n], B.abColor(s));
        if (n === 0) return B.aoe(s, 1.3, 15, 'skill', { anim: 'hammer' });
        if (n === 1) return B.single(s, pick(B.aliveEnemies()), 3.2, 25, 'skill', { heavy: true, anim: 'glove' });
        if (n === 2) { await B.motion(s, 'tickle', B.aliveEnemies()); B.aliveEnemies().forEach(e => B.debuff(s, e, 1, { key: 'maou_koch', name: 'こちょこちょ', stat: 'defDown', value: 0.3, turns: 2 })); return []; }
        await B.motion(s, 'flag', B.aliveAllies());
        B.aliveAllies().forEach(a => B.buff(a, { key: 'maou_flag', name: 'がんばれ', stat: 'atk', value: 0.25, turns: 2 }));
        return [];
      } },
    ult: { name: 'びっくり箱の行進', elem: 'physical', target: 'bounce', anim: 'box', desc: 'ランダムな敵に攻撃力50%の物理ダメージを10回。味方全体の必殺技ゲージ+15。',
      run: async (B, s, t) => {
        const r = await B.bounce(s, 10, 0.5, 5, 'ult', { heavy: true }, t);
        B.aliveAllies().filter(a => a !== s).forEach(a => B.gainEnergy(a, 15));
        return r;
      } } },
  maou_curse: { owner: 'maou', name: 'のろいの笏', tier: 2, get: { chest: ['demon_cellar', 0] },
    desc: '魔王城の宝物庫にしまってあった笏。「さわるな」と書いた紙がはってある。', look: { c: '#3a4a2a', g: '#8aff6a' },
    basic: { name: 'のろいのしっぽ', elem: 'quantum', target: 'single', anim: 'tail', desc: '指定した敵単体に攻撃力100%の闇ダメージ。40%の基礎確率で感電（攻撃力30%、2ターン）。',
      run: async (B, s, t) => { const r = await B.single(s, t, 1.0, 10, 'basic'); B.dot(s, t, { type: 'shock', mult: 0.3, turns: 2, chance: 0.4, quiet: true }); return r; } },
    skill: { name: '三つののろい', elem: 'quantum', target: 'single', anim: 'curse3', desc: '指定した敵単体に攻撃力130%の闇ダメージ。燃焼・感電・裂創（攻撃力40%、2ターン）を、それぞれ40%の基礎確率で付与。',
      run: async (B, s, t) => {
        const r = await B.single(s, t, 1.3, 20, 'skill');
        ['burn', 'shock', 'bleed'].forEach(type => B.dot(s, t, { type, mult: 0.4, turns: 2, chance: 0.4 }));
        return r;
      } },
    ult: { name: 'のろい返し', elem: 'quantum', target: 'aoe', anim: 'aura', desc: '敵全体に攻撃力150%の闇ダメージ。持続ダメージを受けている敵は、それが150%の威力でその場でもう一度発生する。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.5, 20, 'ult', { heavy: true });
        for (const e of B.aliveEnemies()) if (e.dots.length) await B.detonate(e, 1.5);
        await B.resolveDeaths(s, 'ult');
        return r;
      } } },
  maou_dark: { owner: 'maou', name: '漆黒の大笏', tier: 3, get: { chest: ['world_end', 0] }, mod: { atk: 1.08 },
    desc: '世界の果てに突きささっていた、大きな笏。持つと、少しだけ昔の魔王にもどった気がする。', look: { c: '#1a1424', g: '#ff3a5a' },
    basic: { name: '闇のつぶて', elem: 'quantum', target: 'blast', desc: '指定した敵単体に攻撃力80%、隣接する敵に攻撃力30%の闇ダメージ。',
      run: (B, s, t) => B.blast(s, t, 0.8, 0.3, 10, 5, 'basic') },
    skill: { name: '闇の重圧', elem: 'quantum', target: 'aoe', anim: 'aura', desc: '敵全体に攻撃力100%の闇ダメージ。50%の基礎確率で防御力-30%・速度-10%（2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 1.0, 10, 'skill');
        B.aliveEnemies().forEach(e => {
          if (B.debuff(s, e, 0.5, { key: 'maou_def', name: '重圧', stat: 'defDown', value: 0.3, turns: 2 }, true))
            B.buff(e, { key: 'maou_spd', name: '重圧', stat: 'spd', value: -0.1, turns: 2, debuff: true });
        });
        return r;
      } },
    ult: { name: '漆黒の帳', elem: 'quantum', target: 'aoe', anim: 'curtain', desc: '敵全体に攻撃力260%の闇ダメージ。味方全体の与ダメージ+30%（2ターン）。',
      run: async (B, s) => {
        const r = await B.aoe(s, 2.6, 25, 'ult', { heavy: true });
        B.aliveAllies().forEach(a => B.buff(a, { key: 'maou_u', name: '余に続け', stat: 'dmg', value: 0.3, turns: 2 }));
        return r;
      } } },
};

// にゃんこの武器の一覧（start が先頭、あとは段の順）
const weaponsFor = key => Object.keys(WEAPONS).filter(id => WEAPONS[id].owner === key).sort((a, b) => WEAPONS[a].tier - WEAPONS[b].tier);
const startWeapon = key => weaponsFor(key).find(id => WEAPONS[id].start);
const CHEST_WEAPONS = {};
for (const id in WEAPONS) { const c = WEAPONS[id].get && WEAPONS[id].get.chest; if (c) (CHEST_WEAPONS[c[0]] = CHEST_WEAPONS[c[0]] || {})[c[1]] = id; }

// 持っている武器（はじめの武器はいつも持っている）と、その強化段階
const hasWeapon = id => !!(WEAPONS[id] && (WEAPONS[id].start || (Save.data.weapons || {})[id] != null));
const weaponPlus = id => (Save.data && Save.data.weapons && Save.data.weapons[id]) || 0;
const weaponName = id => WEAPONS[id].name + (weaponPlus(id) ? ' +' + weaponPlus(id) : '');
const weaponCost = id => Math.round((150 + weaponPlus(id) * 200) * TIER_COST[WEAPONS[id].tier] / 10) * 10;
function equippedWeapon(key) {
  const id = Save.data && Save.data.equip && Save.data.equip[key];
  return id && WEAPONS[id] && WEAPONS[id].owner === key && hasWeapon(id) ? id : startWeapon(key);
}
function gainWeapon(id) {
  const d = Save.data;
  if (!d.weapons) d.weapons = {};
  if (d.weapons[id] == null) d.weapons[id] = 0;
}
function equipWeapon(key, id) {
  if (!hasWeapon(id) || WEAPONS[id].owner !== key) return;
  (Save.data.equip || (Save.data.equip = {}))[key] = id;
  Save.save();
}

// 武器による力の倍率（段 × 武器ごとのくせ × 鍛えた分）。id を渡すと、その武器を持ったときの倍率（なかまの画面のくらべ）
function weaponStatMult(key, id = equippedWeapon(key)) {
  const w = WEAPONS[id], p = weaponPlus(id), pow = TIER_POW[w.tier], m = w.mod || {};
  return { hp: pow * (m.hp || 1) * (1 + p * 0.04), atk: pow * (m.atk || 1) * (1 + p * 0.06), def: pow * (m.def || 1) * (1 + p * 0.05) };
}

// 戦闘で使う技一式（武器の技で上書き。とくせい・初手技などはその子のまま）
function charKit(key) {
  const c = CHARS[key], w = WEAPONS[equippedWeapon(key)];
  if (!w || w.start) return c;
  const k = Object.create(c);
  k.basic = w.basic; k.skill = w.skill; k.ult = w.ult; k.ai = w.ai;
  if (w.energyMax) k.energyMax = w.energyMax;
  return k;
}

// 3Dモデルの武器（形と色は武器ごと。js/gfx/weapon-models.js にない武器は、その子の種類の形）
function weaponGear(key) {
  const c = CHARS[key]; if (!c) return null;
  const id = equippedWeapon(key), w = WEAPONS[id];
  return { ...c.gear, model: id, tint: w.look || null, shine: weaponPlus(id) >= WEAPON_MAX };
}
