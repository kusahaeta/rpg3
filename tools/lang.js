#!/usr/bin/env node
'use strict';
// ============================================================
//  英語の辞書（js/lang/en-*.js）の手入れ
//    node tools/lang.js check            抜け・書きかえ漏れ・差しこみの数のずれを数える
//    node tools/lang.js todo [ファイル] [--limit N]
//                                        まだ英語のない文を「id<TAB>日本語」で出す（# の行は場所の手がかり）
//    node tools/lang.js add 訳.tsv       「id<TAB>英語」の行を辞書に足す（\n は改行）
//    node tools/lang.js write            辞書を、台本の順に並べなおして書きなおす
//    node tools/lang.js tpl              日本語を含む `…${}…`（Tx() に書きかえが要る所）を一覧する
//    node tools/lang.js naked [ファイル] Tx() で包んでいない文（ui の側。表示の前に L() を通る所なら、そのままでよい）
//  辞書の鍵は、ソースの日本語の文そのもの。ソースの文を直したら、辞書の鍵も直す（check で分かる）
//  コメント・console・Error の文と、SKIP の範囲（開発用の画面）と、lang:keep のコメントのある行（日本語の印）は数えない
// ============================================================
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.join(__dirname, '..');
const SRC = [...fs.readdirSync(path.join(ROOT, 'js')).filter(f => f.endsWith('.js') && f !== 'lang.js').map(f => 'js/' + f),
  ...fs.readdirSync(path.join(ROOT, 'js/gfx')).filter(f => f.endsWith('.js')).map(f => 'js/gfx/' + f)];
// どのソースの文を、どの辞書に入れるか
const DICT_OF = f => ({ 'js/scenario.js': 'scenario', 'js/scenario2.js': 'scenario2', 'js/field-zones.js': 'zones',
  'js/data.js': 'data', 'js/weapons.js': 'data', 'js/outfits.js': 'data', 'js/npcs.js': 'data' })[f] || 'ui';
const DICTS = ['ui', 'data', 'zones', 'scenario', 'scenario2'];
const dictPath = d => path.join(ROOT, `js/lang/en-${d}.js`);
// 開発用で英語にしない範囲：その名前の宣言から、対になる閉じかっこまで
const SKIP = { 'js/main.js': ['function diagHud'], 'js/story.js': ['const Debug'], 'js/gfx/core.js': [] };

// 起動時に Lang.apply() が置きかえる表（js/lang.js）と、表示の直前で置きかえる台本：ここの文は Tx() で包まなくてよい
const WALKED = new Set(fs.readFileSync(path.join(ROOT, 'js/lang.js'), 'utf8').match(/\[ELEMENTS[^\]]*\]/)[0].match(/[A-Z_]+/g).concat(['SCENES', 'RECAP_1', 'RECAP_2']));
const naked = [];
const JP = /[぀-ヿ㐀-鿿！-｠　-〿…‥]/;

// ---------- JS の字句から、文字列とテンプレートを拾う ----------
function scan(src) {
  const out = [];
  let i = 0, line = 1, prev = '';   // prev：直前の意味のある文字（/ が割り算か正規表現かを見分ける）
  const n = src.length;
  const adv = () => { if (src[i] === '\n') line++; i++; };
  const regexOK = () => !prev || /[(,=:[!&|?{};+\-*%<>~^]/.test(prev) || /\b(return|typeof|case|in|of|new|delete|void|throw)$/.test(src.slice(Math.max(0, i - 8), i).trimEnd());
  function readString(q) {
    const start = i, l0 = line; adv();
    readString.before = src.slice(Math.max(0, start - 300), start);
    while (i < n && src[i] !== q) { if (src[i] === '\\') adv(); adv(); }
    adv();
    return { raw: src.slice(start, i), line: l0 };
  }
  // テンプレート：quasis（文字の部分）と、${} の中の字句をたどる
  function readTemplate() {
    const l0 = line, start = i; adv();
    const quasis = [], inner = [];
    let q = '';
    while (i < n && src[i] !== '`') {
      if (src[i] === '\\') { q += src[i] + src[i + 1]; adv(); adv(); continue; }
      if (src[i] === '$' && src[i + 1] === '{') {
        quasis.push(q); q = ''; adv(); adv();
        const r = code('}'); inner.push(...r);
        adv(); continue;
      }
      q += src[i]; adv();
    }
    quasis.push(q); adv();
    return { quasis, inner, line: l0, raw: src.slice(start, i) };
  }
  function code(end) {
    const res = [];
    let depth = 0;
    while (i < n) {
      const c = src[i];
      if (end && c === '}' && depth === 0) return res;
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') adv(); continue; }
      if (c === '/' && src[i + 1] === '*') { adv(); adv(); while (i < n && !(src[i] === '*' && src[i + 1] === '/')) adv(); adv(); adv(); continue; }
      if (c === "'" || c === '"') { const s = readString(c); res.push({ kind: 'str', ...s, before: readString.before }); prev = 'a'; continue; }
      if (c === '`') { const t = readTemplate(); res.push({ kind: 'tpl', ...t }, ...t.inner); prev = 'a'; continue; }
      if (c === '/' && regexOK()) {
        adv(); let cls = false;
        while (i < n && (cls || src[i] !== '/')) { if (src[i] === '\\') adv(); else if (src[i] === '[') cls = true; else if (src[i] === ']') cls = false; adv(); }
        adv(); while (/[a-z]/.test(src[i])) adv();
        prev = 'a'; continue;
      }
      if (c === '{') depth++;
      if (c === '}') depth--;
      if (!/\s/.test(c)) prev = c;
      adv();
    }
    return res;
  }
  return code(null);
}
const evalStr = raw => vm.runInNewContext('(' + raw + ')');

// 宣言の範囲（SKIP 用）：名前の行から、かっこが閉じる行まで
function skipRanges(src, names) {
  const lines = src.split('\n'), out = [];
  for (const nm of names) {
    const a = lines.findIndex(l => l.startsWith(nm));
    if (a < 0) continue;
    let depth = 0, b = a, opened = false;
    for (; b < lines.length; b++) { for (const ch of lines[b]) { if (ch === '{') { depth++; opened = true; } if (ch === '}') depth--; } if (opened && depth <= 0) break; }
    out.push([a + 1, b + 1]);
  }
  return out;
}

// 場所の手がかり：いちばん近い「  名前: {」の行（台本のシーン・区画・にゃんこ）と、その行の先頭の英字だけの文字列（話し手）
function contexts(src) {
  const lines = src.split('\n'), ctx = [];
  let top = '', key = '';
  lines.forEach((l, k) => {
    let m = l.match(/^(?:const|let|function|class)\s+([A-Za-z_$][\w$]*)/); if (m) { top = m[1]; key = ''; }
    m = l.match(/^ {2}([A-Za-z_$][\w$]*):\s*[{[]/); if (m) key = m[1];
    ctx[k + 1] = key ? `${top}.${key}` : top;
  });
  return ctx;
}

function collect() {
  const strs = new Map(), tpls = [];
  naked.length = 0;
  for (const f of SRC) {
    const src = fs.readFileSync(path.join(ROOT, f), 'utf8'), lines = src.split('\n');
    const skip = skipRanges(src, SKIP[f] || []), ctx = contexts(src);
    const skipped = ln => skip.some(([a, b]) => ln >= a && ln <= b) || /lang:keep/.test(lines[ln - 1]) || /console\.|new Error\(|alert\(|confirm\(/.test(lines[ln - 1]) && !/Tx\(/.test(lines[ln - 1]);
    const toks = scan(src);
    let lastAscii = null, lastLine = 0;
    for (const t of toks) {
      if (t.line !== lastLine) { lastAscii = null; lastLine = t.line; }
      if (t.kind === 'str') {
        const v = evalStr(t.raw);
        if (!JP.test(v.replace(/^　+$/, '')) || /gl_FragColor|void main\(/.test(v)) { if (/^[a-z_][\w:#]*$/.test(v) && !lastAscii) lastAscii = v; continue; }
        if (skipped(t.line)) continue;
        if (!strs.has(v)) strs.set(v, { s: v, file: f, line: t.line, ctx: ctx[t.line], who: lastAscii });
        if (!/scenario/.test(f) && !WALKED.has((ctx[t.line] || '').split('.')[0]) && !/(\bTx|toast|float|say|announce|startTalk|signTex|sign|signpost|board|paper|catHouse|grave|portrait|sendBack|breakStroke)\((?:[^()]|\([^()]*\))*$/.test(t.before)) naked.push({ file: f, line: t.line, s: v });
      } else if (t.kind === 'tpl') {
        if (!t.quasis.some(q => JP.test(q.replace(/　/g, ''))) || /gl_FragColor|void main\(/.test(t.raw)) continue;
        if (skipped(t.line)) continue;
        if (t.quasis.length === 1) { const v = evalStr(t.raw); if (!strs.has(v)) strs.set(v, { s: v, file: f, line: t.line, ctx: ctx[t.line], who: lastAscii }); }
        else tpls.push({ file: f, line: t.line, text: t.quasis.join('${…}') });
      }
    }
  }
  return { strs: [...strs.values()], tpls };
}

// ---------- 辞書 ----------
function loadDicts() {
  const all = {}, by = {};
  for (const d of DICTS) {
    const p = dictPath(d); by[d] = {};
    if (!fs.existsSync(p)) continue;
    const EN = {};
    vm.runInNewContext(fs.readFileSync(p, 'utf8'), { EN, Object, LANG: 'en' }, { filename: p });
    Object.assign(by[d], EN); Object.assign(all, EN);
  }
  return { all, by };
}
const hash = s => { let h = 0x811c9dc5; for (const c of s) { h ^= c.codePointAt(0); h = Math.imul(h, 16777619) >>> 0; } return h.toString(36).padStart(7, '0').slice(-6); };
const q = s => "'" + s.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n') + "'";
const valStr = v => typeof v === 'function' ? v.toString() : q(v);

function writeDicts(strs, dict) {
  const used = new Set();
  for (const d of DICTS) {
    const mine = strs.filter(x => DICT_OF(x.file) === d && dict[x.s] != null);
    let out = `'use strict';\n// 英語の辞書（${d}）：日本語の文 → 英語。node tools/lang.js write で、ソースの順に並べなおされる（値は手で直してよい）\nObject.assign(EN, {\n`;
    let lastCtx = null;
    for (const x of mine) {
      if (x.ctx !== lastCtx) { out += `  // ── ${x.file.replace('js/', '')} ${x.ctx || ''}\n`; lastCtx = x.ctx; }
      out += `  ${q(x.s)}: ${valStr(dict[x.s])},\n`; used.add(x.s);
    }
    out += '});\n';
    fs.mkdirSync(path.dirname(dictPath(d)), { recursive: true });
    fs.writeFileSync(dictPath(d), out);
  }
  // ソースから消えた文は、ui の末尾に残す（check で知らせる）
  const orphan = Object.keys(dict).filter(k => !used.has(k));
  if (orphan.length) {
    let out = fs.readFileSync(dictPath('ui'), 'utf8').replace(/\}\);\n$/, '');
    out += '  // ── ソースに見当たらない文（直したか、消したもの）\n' + orphan.map(k => `  ${q(k)}: ${valStr(dict[k])},\n`).join('') + '});\n';
    fs.writeFileSync(dictPath('ui'), out);
  }
  return orphan.length;
}

// 訳の点検：{0} の数・{PC|タッチ} の数・HTML のタグ
function lint(s, t) {
  if (typeof t !== 'string') return [];
  const cnt = (x, re) => (x.match(re) || []).sort().join(',');
  const p = [];
  if (cnt(s, /\{\d\}/g) !== cnt(t, /\{\d\}/g)) p.push('{n} の数がちがう');
  if ((s.match(/\{[^{}|]*\|[^{}]*\}/g) || []).length !== (t.match(/\{[^{}|]*\|[^{}]*\}/g) || []).length) p.push('{PC|タッチ} の数がちがう');
  if (cnt(s, /<\/?[a-z]+/g) !== cnt(t, /<\/?[a-z]+/g)) p.push('タグがちがう');
  if (JP.test(t.replace(/[　…・〜]/g, ''))) p.push('日本語が残っている');
  return p;
}

const [cmd, ...args] = process.argv.slice(2);
const { strs, tpls } = collect();
const { all: dict } = loadDicts();
if (cmd === 'check') {
  const miss = strs.filter(x => dict[x.s] == null);
  const by = {}; miss.forEach(x => { by[x.file] = (by[x.file] || 0) + 1; });
  const chars = miss.reduce((a, x) => a + x.s.length, 0);
  console.log(`文 ${strs.length}（訳あり ${strs.length - miss.length}／まだ ${miss.length}・${chars} 字）`);
  Object.entries(by).sort((a, b) => b[1] - a[1]).forEach(([f, c]) => console.log(`  ${f}: ${c}`));
  console.log(`Tx() への書きかえが要るテンプレート ${tpls.length}・Tx() で包んでいない文 ${naked.length}`);
  const bad = strs.filter(x => dict[x.s] != null).map(x => [x, lint(x.s, dict[x.s])]).filter(([, p]) => p.length);
  bad.forEach(([x, p]) => console.log(`  訳の点検 ${x.file}:${x.line} ${p.join('・')}：${x.s.slice(0, 40)}`));
  const live = new Set(strs.map(x => x.s)), orphan = Object.keys(dict).filter(k => !live.has(k));
  if (orphan.length) { console.log(`ソースに見当たらない訳 ${orphan.length}`); orphan.slice(0, 20).forEach(k => console.log('  ' + k.slice(0, 60))); }
  // CSS の content の日本語には、html[lang=en] の同じセレクタで英語が要る
  const css = fs.readFileSync(path.join(ROOT, 'css/style.css'), 'utf8');
  const cssMiss = css.split('\n').map(l => l.match(/^([^{}]+?)\s*\{[^}]*content:\s*['"]([^'"]*)['"]/)).filter(m => m && JP.test(m[2]) && !m[1].startsWith('html[lang=en]'))
    .filter(m => !css.includes(`html[lang=en] ${m[1].trim()} {`));
  cssMiss.forEach(m => console.log(`  CSS の文字に英語がない：${m[1].trim()}（${m[2]}）`));
  process.exitCode = miss.length || tpls.length || bad.length || cssMiss.length ? 1 : 0;
} else if (cmd === 'todo') {
  const lim = args.includes('--limit') ? +args[args.indexOf('--limit') + 1] : Infinity, file = args.find(a => a.endsWith('.js'));
  let lastCtx = null, k = 0;
  for (const x of strs) {
    if (dict[x.s] != null || (file && x.file !== file)) continue;
    if (k++ >= lim) break;
    const c = `${x.file}:${x.line} ${x.ctx || ''}`;
    if (x.ctx !== lastCtx) { console.log(`# ${c}`); lastCtx = x.ctx; }
    console.log(`${hash(x.s)}\t${x.who ? `[${x.who}] ` : ''}${x.s.replace(/\n/g, '\\n')}`);
  }
} else if (cmd === 'add') {
  const ids = new Map(strs.map(x => [hash(x.s), x.s]));
  let n = 0;
  const lines = fs.readFileSync(args[0], 'utf8').split('\n');
  for (const l of lines) {
    if (!l.trim() || l.startsWith('#')) continue;
    const m = l.match(/^(\w{6})\t(.*)$/);
    if (!m) { console.error('読めない行：' + l.slice(0, 60)); continue; }
    const s = ids.get(m[1]);
    if (!s) { console.error('id が見つからない：' + m[1]); continue; }
    const v = m[2].replace(/\\n/g, '\n');
    const p = lint(s, v); if (p.length) console.error(`点検 ${m[1]} ${p.join('・')}：${s.slice(0, 40)}`);
    dict[s] = v; n++;
  }
  writeDicts(strs, dict);
  console.log(`${n} 件 足した`);
} else if (cmd === 'write') {
  const o = writeDicts(strs, dict); console.log('書きなおした' + (o ? `（ソースに見当たらない訳 ${o}）` : ''));
} else if (cmd === 'naked') {
  naked.filter(t => !args[0] || t.file === args[0]).forEach(t => console.log(`${t.file}:${t.line}  ${t.s.slice(0, 80)}`));
} else if (cmd === 'tpl') {
  const file = args[0];
  tpls.filter(t => !file || t.file === file).forEach(t => console.log(`${t.file}:${t.line}  ${t.text.slice(0, 150)}`));
} else {
  console.log('使い方：node tools/lang.js check | todo [ファイル] [--limit N] | add 訳.tsv | write | tpl [ファイル]');
}
