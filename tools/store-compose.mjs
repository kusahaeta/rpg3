// ストアのスクショを組み立てる：tools/shoot-store.mjs・shoot-title.mjs で撮ったゲームの画面（16:9・3840×2160）を、
// iPhone の横長の枠いっぱいに広げ（左右の帯なし。はみ出す上下を切る）、おしゃれ（4 匹）・会話（3 枚）は 1 枚に並べ、見出しを上に重ねる。
//   node tools/store-compose.mjs <撮ったフォルダ> <ja|en> [出力の根=.]
// 撮ったフォルダには combo.png demon.png woods.png tower.png yoroi.png fit-mike.png fit-kuro.png fit-shiro.png fit-tama.png shiro.png kuro.png oishii.png tama.png title.png。
// 書き出すもの（ja は ios/screenshots/、en は ios/screenshots/en/ の下）：6.9 インチ（すぐ下）・6.3inch/・6.5inch/。
// ja は Google Play（android/store/screenshots/、1920×1080）も。見出しはゲームと同じ丸ゴシックで、Chrome に描かせる。
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [rawDir, lang, root = '.'] = process.argv.slice(2);
if (!rawDir || !['ja', 'en'].includes(lang)) { console.error('使い方: node tools/store-compose.mjs <撮ったフォルダ> <ja|en> [出力の根]'); process.exit(1); }

// 書き出す大きさ（出力のフォルダ・幅・高さ）
const iosDir = join(root, 'ios/screenshots', lang === 'en' ? 'en' : '');
const SIZES = [[iosDir, 2868, 1320], [join(iosDir, '6.3inch'), 2622, 1206], [join(iosDir, '6.5inch'), 2778, 1284]];
if (lang === 'ja') SIZES.push([join(root, 'android/store/screenshots'), 1920, 1080]);

// 並べ方。one：1 枚を枠のはばいっぱいに（y は上下の切り方。0 で下を切る・1 で上を切る）。
// cols：縦に分けて並べる（cx・cy はその絵の中の、列のまん中に来る点。zoom は列の高さに対する絵の高さ）。
// trio：左に大きく 1 枚、右に 2 枚（見出しは左の大きい絵の上）。grid：2×2（4 つ目の要素は、その絵の下に入れる紹介文。上の行が名前、下の行がひとこと）。
// cap は見出し（null で見出しなし）。
// タイトルは tools/shoot-store.mjs の title（5 匹がこちらを向く。「タップして はじめる」と言語ボタンなし）
const CAP = {
  ja: { combo: '仲間とのコンボ技', field: 'かわいいにゃんこと不思議な世界を大冒険', yoroi: 'ターン制のコマンドバトル\n弱点を狙って有利に導こう', fit: '帽子にマントに服 おしゃれも楽しい', 
    // 05 は見出しの代わりに、猫ごとの紹介文（会話ウィンドウなしで撮る）。魚の話はミケだけ（ほかの子と重ねない）
    shiro: ['天才（自称）シロ。', '魔法はだいたい予想外。'], kuro: ['クールなクロ。', '……でも、すぐ照れる。'],
    mike: ['勇者ミケ。', '今日も魚をつまみ食い。'], tama: ['タマは寝てる。', 'だいたい寝てる。'] },
  en: { combo: 'Combo Moves with Your Friends', field: 'A Big Adventure Through a Wondrous World', yoroi: 'Turn-Based Command Battles\nStrike Weak Points to Gain the Upper Hand', fit: 'Hats, Capes, Outfits: Dress Up!', friends: 'A Fun and Quirky Crew of Friends',
    shiro: ['Shiro, Genius (Self-Proclaimed).', 'Her spells rarely go as planned.'], kuro: ['Cool, Calm Kuro.', '...But easily flustered.'],
    mike: ['Mike the Hero.', 'Snacking on fish again today.'], tama: ['Tama is asleep.', 'Tama is usually asleep.'] },
}[lang];
const SLIDES = [
  ['01-combo', { one: 'combo', y: 0.8 }, CAP.combo],
  ['02-field', { cols: [['demon', 0.43, 0.5], ['woods', 0.46, 0.5], ['tower', 0.48, 0.5]], zoom: 1 }, CAP.field],   // 魔王城（外から）・まどろみの林（地面から）・笑顔の塔
  ['03-yoroi', { one: 'yoroi', y: 1 }, CAP.yoroi],   // 下（仲間・技のボタン）を切らない。上の鎧の弱点の印は見出しと重なってよい
  ['04-fit', { cols: [['fit-mike', 0.285, 0.5], ['fit-kuro', 0.3, 0.5], ['fit-shiro', 0.28, 0.5], ['fit-tama', 0.29, 0.5]], zoom: 1.05 }, CAP.fit],
  // 下に紹介文が入るので、猫は画面の上寄りに撮る（shoot-store.mjs の faceCam の lift）。上の段は耳・帽子が切れないよう、上を残す
  ['05-friends', { grid: [['shiro', 0.5, 0.44, CAP.shiro], ['kuro', 0.5, 0.44, CAP.kuro], ['oishii', 0.5, 0.5, CAP.mike], ['tama', 0.5, 0.5, CAP.tama]] }, null],
  ['06-title', { one: 'title', y: 0.5 }, null],
];

// ONLY=05-friends,06-title のように、作る絵をしぼれる（撮った絵がそろっていなくても、その絵だけ作り直せる）
const ONLY = process.env.ONLY ? process.env.ONLY.split(',') : null;
const IMG = {};
const img = name => IMG[name] || (IMG[name] = 'data:image/png;base64,' + readFileSync(join(rawDir, name + '.png')).toString('base64'));

// 1 枚の HTML（W×H）。絵はすべて 16:9
function page(spec, cap, W, H) {
  const g = Math.round(H * 0.008), A = 16 / 9;
  // (x, y, w, h) の窓に、絵を cover で入れる（まん中に来る点 cx・cy、拡大 zoom）。窓からはみ出さないようにずらす
  // lx をわたすと、絵の左を切るのはそのはばまで（会話のセリフの頭を残す）
  const pane = (name, x, y, w, h, cx = 0.5, cy = 0.5, zoom = 1, lx = 1) => {
    const s = Math.max(w / A, h) * zoom, iw = s * A, ih = s;
    const left = Math.min(0, Math.max(w - iw, -lx * iw, w / 2 - cx * iw)), top = Math.min(0, Math.max(h - ih, h / 2 - cy * ih));
    return `<div class="p" style="left:${x}px;top:${y}px;width:${w}px;height:${h}px"><img src="${img(name)}" style="left:${left}px;top:${top}px;width:${iw}px;height:${ih}px"></div>`;
  };
  let body = '';
  if (spec.one) {
    const ih = W / A; body = pane(spec.one, 0, 0, W, H, 0.5, (H / 2 + (ih - H) * spec.y) / ih);
  } else if (spec.cols) {
    const n = spec.cols.length, w = (W - g * (n - 1)) / n;
    body = spec.cols.map(([name, cx, cy], i) => pane(name, i * (w + g), 0, w, H, cx, cy, spec.zoom)).join('');
  } else if (spec.grid) {
    const w = (W - g) / 2, h = (H - g) / 2;
    body = spec.grid.map(([name, cx, cy, label], i) => {
      const x = (i % 2) * (w + g), y = Math.floor(i / 2) * (h + g);
      return pane(name, x, y, w, h, cx, cy, 1, 0.12) + (label ? `<div class="lshade" style="left:${x}px;top:${y + h * 0.62}px;width:${w}px;height:${h * 0.38}px"></div>
        <div class="label" style="left:${x + w / 2}px;bottom:${H - y - h + Math.round(H * 0.025)}px"><div>${label[0]}</div><div class="sub">${label[1]}</div></div>` : '');
    }).join('');
  } else if (spec.trio) {
    // 大きい絵はセリフの行（はばの 13〜88%）が切れないはばにする（iPhone の横長は 3 分の 2、Google Play の 16:9 は 4 分の 3）
    const [a, b, c] = spec.trio, bw = Math.round((W - g) * (W / H > 2 ? 2 / 3 : 3 / 4)), rw = W - g - bw, rh = (H - g) / 2;
    body = pane(a[0], 0, 0, bw, H, a[1], a[2], 1, 0.12) + pane(b[0], bw + g, 0, rw, rh, b[1], b[2], 1, 0.12) + pane(c[0], bw + g, rh + g, rw, rh, c[1], c[2], 1, 0.12);
  }
  const fs = Math.round(H * (lang === 'en' ? 0.07 : 0.08));
  const cx = Math.round(spec.trio ? Math.round((W - g) * (W / H > 2 ? 2 / 3 : 3 / 4)) / 2 : W / 2);
  // 見出しは \n で 2 行に（2 行目は少し小さく）
  const lines = cap ? cap.split('\n') : [];
  const capHtml = cap ? `<div class="shade" style="height:${Math.round(H * (lines.length > 1 ? 0.4 : 0.3))}px"></div><div class="cap">${lines.map((l, i) => i ? `<div class="sub">${l}</div>` : `<div>${l}</div>`).join('')}</div>` : '';
  return `<!doctype html><html><head><meta charset="utf-8"><style>
    html, body { margin: 0; width: ${W}px; height: ${H}px; overflow: hidden; background: #2a1c18; }
    .p { position: absolute; overflow: hidden; } .p img { position: absolute; display: block; }
    .shade { position: absolute; left: 0; right: 0; top: 0; height: ${Math.round(H * 0.3)}px;
      background: linear-gradient(to bottom, rgba(42, 24, 16, .62), rgba(42, 24, 16, .32) 55%, rgba(42, 24, 16, 0)); }
    .cap { position: absolute; left: ${cx}px; transform: translateX(-50%); top: ${Math.round(H * 0.03)}px; text-align: center; white-space: nowrap;
      font-family: "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif; font-weight: 700; font-size: ${fs}px; letter-spacing: .04em;
      color: #fff4d8; text-shadow: 0 ${Math.round(fs * 0.07)}px 0 #a8502e, 0 0 ${Math.round(fs * 0.25)}px rgba(40, 18, 8, .55); line-height: 1.25; }
    .cap .sub { font-size: ${Math.round(fs * 0.72)}px; }
    .lshade { position: absolute; background: linear-gradient(to top, rgba(42, 24, 16, .6), rgba(42, 24, 16, .3) 50%, rgba(42, 24, 16, 0)); }
    .label { position: absolute; transform: translateX(-50%); text-align: center; white-space: nowrap;
      font-family: "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif; font-weight: 700; font-size: ${Math.round(H * 0.052)}px; letter-spacing: .04em;
      color: #fff4d8; text-shadow: 0 ${Math.round(H * 0.005)}px 0 #a8502e, 0 0 ${Math.round(H * 0.016)}px rgba(40, 18, 8, .6); line-height: 1.3; }
    .label .sub { font-size: ${Math.round(H * 0.038)}px; }
  </style></head><body>${body}${capHtml}</body></html>`;
}

// ---- ヘッドレス Chrome（DevTools プロトコル） ----
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));
const port = 9800 + Math.floor(Math.random() * 100), profile = mkdtempSync(join(tmpdir(), 'nyanko-compose-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) { await sleep(200); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const wait = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  const frameId = (await send('Page.getFrameTree')).result.frameTree.frame.id;
  for (const [dir, W, H] of SIZES) {
    mkdirSync(dir, { recursive: true });
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    for (const [file, spec, cap] of SLIDES) {
      if (ONLY && !ONLY.includes(file)) continue;
      await send('Page.setDocumentContent', { frameId, html: page(spec, cap, W, H) });
      await send('Runtime.evaluate', { expression: `Promise.all([...document.images].map(i => i.decode())).then(() => document.fonts.ready).then(() => true)`, awaitPromise: true });
      const shot = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92 });
      const out = join(dir, file + '.jpg');
      writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
      console.log(`${out}（${W}×${H}）`);
    }
  }
  ws.close();
} finally {
  chrome.kill(); await sleep(300);
  try { rmSync(profile, { recursive: true, force: true }); } catch {}
}
