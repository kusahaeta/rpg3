// ストア用に、タイトル画面をヘッドレス Chrome で撮る（Node 22 以降：WebSocket が組みこみ）。
//   node tools/shoot-title.mjs <出力.png> [倍率=1.5] [start|nostart] [幅x高さ=1280x720]
// ゲームの画面は 1280×720 固定なので、倍率 1.5 で 1920×1080、3 で 3840×2160 になる。
// iPhone の枠は、その画面の大きさ（たとえば 956x440）を倍率 3 で撮る。16:9 より横長だと両はしに余白が出る（実機と同じ）。
// 「タップして はじめる」は start で出す（既定）、nostart で隠す（フィーチャー画像・ヘッダ用。右上の言語ボタンも隠す）。
// SHOT_LANG=en で英語の画面（既定は日本語）。
// 先に `PORT=8937 node .claude/serve.js` を動かしておく。セーブは空の新しいプロフィールで撮る（はじめて遊ぶ人と同じ画面）
import { spawn } from 'node:child_process';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [out, scaleArg = '1.5', startArg = 'start', sizeArg = '1280x720'] = process.argv.slice(2);
if (!out) { console.error('使い方: node tools/shoot-title.mjs <出力.png> [倍率] [start|nostart]'); process.exit(1); }
const scale = Number(scaleArg), showStart = startArg !== 'nostart', [W, H] = sizeArg.split('x').map(Number);
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 9333, URL = 'http://127.0.0.1:8937/index.html';

const profile = mkdtempSync(join(tmpdir(), 'nyanko-shot-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${PORT}`, '--use-angle=metal',
  `--user-data-dir=${profile}`, '--autoplay-policy=no-user-gesture-required', '--hide-scrollbars', 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));

try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${PORT}/json`)).json()).find(t => t.type === 'page'); } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const wait = new Map();
  ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || expr);
    return r.result?.result?.value;
  };

  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: scale, mobile: false });
  await send('Page.enable');
  await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('nyanko_lang', ${JSON.stringify(process.env.SHOT_LANG || 'ja')})` });
  await send('Page.navigate', { url: URL });
  for (let i = 0; i < 100; i++) { await sleep(300); if (await ev(`typeof GFX !== 'undefined' && !!(GFX.view && GFX.view.key === 'title' && document.querySelector('.screen.title'))`)) break; }
  // 画質を「なめらか」に固定し、細かさの上限を倍率まで上げる（ヘッドレスはコマ数が少なく見え、そのままだと軽量に落とされる）
  await ev(`GFX.watchFps = () => {}; GFX.setTier(0); GFX.Q.prMax = ${scale}; GFX.resize(GFX.appScale); document.body.classList.add('touch');
    for (const el of document.querySelectorAll('.t-start, .t-lang')) el.style.visibility = '${showStart ? 'visible' : 'hidden'}'; true`);
  // はじめは樹を見上げていて、数秒かけて 5 匹の後ろへ下りてくる。下りきって、ロゴの文字がそろうまで待つ
  for (let i = 0; i < 120; i++) {
    await sleep(250);
    if (await ev(`(v => v.camera.position.distanceTo(v.camPos) < 0.02 && v.curLook.distanceTo(v.camLook) < 0.05)(GFX.view)`)) break;
  }
  await sleep(2500);
  const shot = await send('Page.captureScreenshot', { format: 'png' });
  writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
  const png = Buffer.from(shot.result.data, 'base64');
  console.log(`${out}（${png.readUInt32BE(16)}×${png.readUInt32BE(20)}）`);
  ws.close();
} finally {
  chrome.kill();
  await sleep(500);
  rmSync(profile, { recursive: true, force: true });
}
