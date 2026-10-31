'use strict';
// ============================================================
//  ことば（日本語・英語）
//  LANG：'ja' か 'en'。設定（localStorage の nyanko_lang）がなければ、端末の言語で決める
//  英語の辞書（js/lang/en-*.js）は、日本語の文をそのまま鍵にして英語を引く。英語のときだけ読みこむ
//  Tx(文, ...差しこむもの)：いまの言語の文を返す。文の中の {0} {1} … に、差しこむものが入る
//    辞書の値は関数でもよい（英語の複数形など）：EN['さかなが {0} ひき'] = n => ...
//  データ（名前・技・道具・村人の台詞など）は、起動時に Lang.apply() で英語に置きかえる
//  台本（SCENES）は、舞台の演出が日本語の文を手がかりにするので、表示の直前で置きかえる
//  辞書の抜けは node tools/lang.js check で調べる
// ============================================================
const LANG_KEY = 'nyanko_lang';
const LANGS = { ja: '日本語', en: 'English' };   // lang:keep（どちらの言語でも、そのまま出す）
const LANG_LABEL = '言語 / Language';   // lang:keep
const LANG = (() => {
  try { const s = localStorage.getItem(LANG_KEY); if (LANGS[s]) return s; } catch (e) { /* 保存できない環境 */ }
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'ja';
  return /^ja/i.test(nav) ? 'ja' : 'en';
})();
const EN = {};
document.documentElement.lang = LANG;
if (LANG === 'en') ['ui', 'data', 'zones', 'scenario', 'scenario2'].forEach(f => document.write(`<script src="js/lang/en-${f}.js"><\/script>`));

function Tx(s, ...a) {
  if (typeof s !== 'string') return s;
  let r = s;
  if (LANG !== 'ja') { const t = EN[s]; if (typeof t === 'function') return t(...a); if (t != null) r = t; }
  return a.length ? r.replace(/\{(\d)\}/g, (m, i) => a[i] != null ? a[i] : m) : r;
}

const Lang = {
  // 言語を変えて、はじめから読みこみなおす
  set(l) { try { localStorage.setItem(LANG_KEY, l); } catch (e) { /* 保存できない環境 */ } location.reload(); },
  // データの文字を、辞書にある分だけ英語に置きかえる（getter と関数はそのまま。getter の中は Tx() で訳す）
  apply() {
    if (LANG === 'ja') return;
    const seen = new Set();
    const walk = o => {
      if (!o || typeof o !== 'object' || seen.has(o)) return;
      seen.add(o);
      for (const k of Object.keys(o)) {
        const d = Object.getOwnPropertyDescriptor(o, k);
        if (!d || !('value' in d)) continue;
        const v = d.value;
        if (typeof v === 'string') { const t = EN[v]; if (typeof t === 'string' && d.writable) o[k] = t; }
        else if (v && typeof v === 'object') walk(v);
      }
    };
    [ELEMENTS, PATHS, CHARS, COMBOS, ALLSTARS, BOND_INFO, ENEMY_MOVES, ENEMIES, CHAPTERS, ITEMS, BANTER,
      WEAPONS, WEAPON_KIND, NPCS, FIELD_ZONES, TIME_CRYS, MIRROR_COLS, FRUIT_KINDS, FRUIT_LINES, SIZE_LINES,
      LOOP_TALK, SHADOW_LINES, CUSHION_LINES, HOLD_LINES, STORY, RECAP, BOND_TAGS, STAT_LABEL, DOT_INFO, TARGET_NAME,
      SHOP_NAMES, SULK_LINES, PASS_STAMPS, GFX_TIERS, OUTFITS, OUTFIT_SLOT_NAME].forEach(walk);
    // シーンの上に出す章の名前は、読みこみのときに章の題名（日本語）から作っているので、作りなおす
    STORY.forEach(ch => ch.steps.forEach(st => [st.id, st.scene, st.after].filter(Boolean).forEach(id => { if (SCENES[id]) SCENES[id].chapter = ch.title.split('　')[0]; })));
    document.title = 'Nyanko Fantasy';
  },
};
