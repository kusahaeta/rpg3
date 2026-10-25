// 時間で決まる画面（tools/promo の chat.html・viz.html）を、1920×1080・30fps の mp4 に書き出す。
//   node tools/promo/page-rec.mjs <画面.html> <場面の JSON> <出力のフォルダ> [場面の名前…]
// 画面は setClip(場面のデータ, 名前) で長さ（秒）を返し、render(秒) でその時刻の絵になること。
// 場面の名前を省くと、JSON の場面をぜんぶ書き出す。出力は <画面の名前>-<場面の名前>.mp4（例：chat-iphone.mp4）。
import { spawn, execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve, basename } from 'node:path';
import { pathToFileURL } from 'node:url';

const FPS = 30, W = 1920, H = 1080;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const [pageFile, src, outDir, ...only] = process.argv.slice(2);
if (!pageFile || !src || !outDir) { console.error('使い方: node tools/promo/page-rec.mjs <画面.html> <場面の JSON> <出力のフォルダ> [場面の名前…]'); process.exit(1); }
const PAGE = pathToFileURL(resolve(pageFile)).href, PREFIX = basename(pageFile, '.html');
const clips = JSON.parse(readFileSync(src, 'utf8'));
const names = only.length ? only : Object.keys(clips).filter(k => !k.startsWith('_'));
mkdirSync(outDir, { recursive: true });

const port = 9400 + Math.floor(Math.random() * 400);
const profile = mkdtempSync(join(tmpdir(), 'nyanko-page-'));
const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
  '--hide-scrollbars', '--force-device-scale-factor=1', `--window-size=${W},${H}`, 'about:blank'], { stdio: 'ignore' });
try {
  let target;
  for (let i = 0; i < 50 && !target; i++) {
    await sleep(200);
    try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {}
  }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(r => ws.addEventListener('open', r, { once: true }));
  let id = 0; const wait = new Map();
  ws.addEventListener('message', e => {
    const m = JSON.parse(e.data);
    if (wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
    else if (m.method === 'Runtime.exceptionThrown') console.error('ページのエラー:', m.params.exceptionDetails.exception?.description?.split('\n')[0]);
  });
  const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async expr => {
    const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
    if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || expr);
    return r.result?.result?.value;
  };
  await send('Runtime.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
  await send('Page.navigate', { url: PAGE });
  for (let i = 0; i < 50 && await ev('document.readyState') !== 'complete'; i++) await sleep(100);
  await ev('document.fonts.ready.then(() => true)');

  for (const name of names) {
    const clip = clips[name];
    if (!clip) { console.error('場面がない:', name); continue; }
    const frames = mkdtempSync(join(tmpdir(), `nyanko-${PREFIX}-${name}-`));
    const total = await ev(`setClip(${JSON.stringify(clip)}, ${JSON.stringify(name)})`);
    const n = Math.ceil(total * FPS);
    for (let i = 0; i < n; i++) {
      await ev(`render(${i / FPS}); true`);
      const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 94, optimizeForSpeed: true });
      writeFileSync(join(frames, String(i).padStart(5, '0') + '.jpg'), Buffer.from(s.result.data, 'base64'));
    }
    const out = resolve(outDir, `${PREFIX}-${name}.mp4`);
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-framerate', String(FPS), '-i', join(frames, '%05d.jpg'),
      '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out], { stdio: 'inherit' });
    rmSync(frames, { recursive: true, force: true });
    console.log(`${name}: ${total.toFixed(1)} 秒 → ${out}`);
  }
  ws.close();
} finally {
  chrome.kill();
  await sleep(300);
  rmSync(profile, { recursive: true, force: true });
}
