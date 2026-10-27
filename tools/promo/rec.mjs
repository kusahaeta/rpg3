// 紹介動画の録画：ヘッドレス Chrome の時計を差しかえて、1/30 秒ずつ進めては撮る（コマ落ちしない）。
//   node tools/promo/rec.mjs <場面の名前> <出力のフォルダ>
// 場面は tools/promo/scenes.mjs。PROMO_NOZONE=1 で、探索に入ったときの地名を出さない（字幕版で、字幕と重なるため）。出力のフォルダに 00000.jpg… と、効果音の記録 sfx.json を書く。
// 先に `PORT=8937 node .claude/serve.js` を動かしておく。
// 画面は 936×432 を 2.5 倍（2340×1080）で撮る。iPhone と同じ横長で、まん中の 16:9（1920×1080）がゲームの画面、
// 両はしは星の帯。App Store 用は全体を 1920×886 に縮め、Google Play 用はまん中を切り出す（tools/promo/make.mjs）。
import { spawn } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const FPS = 30, VW = 936, VH = 432, SCALE = 2.5;
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
// PROMO_URL で別のサーバー（古い版を git worktree で出したものなど）を撮れる
const URL = process.env.PROMO_URL || 'http://127.0.0.1:8937/index.html?debug';
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ページより先に読みこむ：時計・タイマー・requestAnimationFrame・乱数を、__step で進める仮の時間にする
const SHIM = `(() => {
  let vt = 0, seed = 20261025;
  const t0 = Date.now(), realNow = performance.now.bind(performance);
  Math.random = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  performance.now = () => vt;
  Date.now = () => t0 + vt;
  const raf = new Map(); let rid = 0;
  window.requestAnimationFrame = cb => { raf.set(++rid, cb); return rid; };
  window.cancelAnimationFrame = id => raf.delete(id);
  const timers = new Map(); let tid = 0;
  window.setTimeout = (fn, ms = 0, ...a) => { timers.set(++tid, { fn, at: vt + Math.max(0, +ms || 0), a, seq: tid }); return tid; };
  window.setInterval = (fn, ms = 0, ...a) => { const every = Math.max(1, +ms || 0); timers.set(++tid, { fn, at: vt + every, a, every, seq: tid }); return tid; };
  window.clearTimeout = window.clearInterval = id => timers.delete(id);
  window.requestIdleCallback = fn => window.setTimeout(() => fn({ didTimeout: false, timeRemaining: () => 50 }), 1);
  window.cancelIdleCallback = id => timers.delete(id);
  const mc = new MessageChannel(), q = [];
  mc.port1.onmessage = () => q.shift()();
  const yieldTask = () => new Promise(r => { q.push(r); mc.port2.postMessage(0); });
  const anims = new WeakMap();
  const syncAnims = ms => {
    document.documentElement.offsetHeight;   // 書きかえた見た目を確定させて、トランジションをここで作らせる
    for (const a of document.getAnimations()) {
      if (!anims.has(a)) { a.pause(); anims.set(a, a.currentTime || 0); }
      else { const t = anims.get(a) + ms; anims.set(a, t); a.currentTime = t; }
    }
  };
  window.__vt = () => vt;
  window.__step = async ms => {
    const end = vt + ms;
    for (let n = 0; n < 2000; n++) {
      let next = null;
      for (const [id, t] of timers) if (t.at <= end && (!next || t.at < next[1].at || (t.at === next[1].at && t.seq < next[1].seq))) next = [id, t];
      if (!next) break;
      const [id, t] = next;
      vt = Math.max(vt, t.at);
      if (t.every) { t.at += t.every; t.seq = ++tid; } else timers.delete(id);
      try { typeof t.fn === 'function' ? t.fn(...t.a) : eval(t.fn); } catch (e) { console.error(e); }
      await yieldTask();
    }
    vt = end;
    const cbs = [...raf.values()]; raf.clear();
    for (const cb of cbs) { try { cb(vt); } catch (e) { console.error(e); } }
    await yieldTask();
    syncAnims(ms);
    return vt;
  };
})();`;

// 効果音を鳴らさずに「いつ・どれが鳴ったか」を記録する（あとで BGM といっしょにオフラインで書き出す）
const SFX_LOG = `(() => {
  window.__sfx = []; window.__sfxT0 = null; let depth = 0;
  for (const k of Object.keys(Sfx)) {
    if (typeof Sfx[k] !== 'function' || ['init', 'tone', 'noise', 'setVol'].includes(k)) continue;
    const f = Sfx[k];
    Sfx[k] = function (...a) {
      if (!depth && window.__sfxT0 != null) __sfx.push({ t: (__vt() - __sfxT0) / 1000, k, a });
      depth++; try { return f.apply(this, a); } finally { depth--; }
    };
  }
  Sfx.init = () => {}; Sfx.ctx = null;
  return true;
})()`;

// 場面づくりの補助（ページの中の P）
const HELPERS = `(() => {
  const FV = FieldView.prototype, upd = FV.update;
  // cam(v) をセットすると、探索のカメラを毎コマ上書きする
  FV.update = function (...a) { upd.apply(this, a); if (P.cam) P.cam(this); };
  window.P = {
    cam: null,
    // 物語の段階へジャンプして、4 匹の編成にする
    prep(ci, si, lv) {
      Debug.jump(ci, si); const d = Save.data;
      for (const k of ['mike', 'kuro', 'shiro', 'tama']) { if (!d.owned[k]) d.owned[k] = { lv: 1, exp: 0, eid: 0 }; if (lv) d.owned[k].lv = lv; }
      d.team = ['mike', 'kuro', 'shiro', 'tama']; d.fieldTips = true; d.bondNews = []; Save.save(); return true;
    },
    field(zone, x, z, yaw = 0) { Save.data.fieldResume = { ci: FIELD_ZONES[zone].ci, zone, x, z, yaw }; Save.save(); App.go(FieldScreen); return true; },
    noFoes() { const v = Game.activeField; v.groups.forEach(g => { if (g.alive) { g.alive = false; v.scene.remove(g.model.group); if (g.label) g.label.style.display = 'none'; } }); return true; },
    // (x, z) へ向かって歩く（run で走る）。カメラはうしろから、向きはなめらかに
    steer(x, z, run, turn = 0.1) {
      const v = Game.activeField, p = v.player.pos, dx = x - p.x, dz = z - p.z;
      v.camYaw = lerpAngle(v.camYaw, Math.atan2(-dx, -dz), turn);
      v.keys.add('w'); if (run) v.keys.add('shift'); else v.keys.delete('shift');
      return Math.hypot(dx, dz);
    },
    halt() { Game.activeField.keys.clear(); return true; },
  };
  return true;
})()`;

// opts { w, h, scale } で画面の大きさを変えられる（ストアのスクショなど。既定は動画の 936×432・2.5 倍）。
// lang（'ja' か 'en'）でゲームの言語を決める（なければ端末の言語）
export async function session(fn, { w = VW, h = VH, scale = SCALE, lang } = {}) {
  const port = 9400 + Math.floor(Math.random() * 400);
  const profile = mkdtempSync(join(tmpdir(), 'nyanko-rec-'));
  const chrome = spawn(CHROME, ['--headless=new', `--remote-debugging-port=${port}`, '--use-angle=metal',
    `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', 'about:blank'], { stdio: 'ignore' });
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
      else if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') console.error('console.error:', m.params.args.map(a => a.value ?? a.description).join(' ').split('\n')[0]);
    });
    const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => {
      const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.error) throw new Error(r.error.message);
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || expr);
      return r.result?.result?.value;
    };
    await send('Runtime.enable');
    await send('Page.enable');
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: scale, mobile: false });
    await send('Emulation.setTouchEmulationEnabled', { enabled: true, maxTouchPoints: 5 });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: SHIM });
    if (lang) await send('Page.addScriptToEvaluateOnNewDocument', { source: `localStorage.setItem('nyanko_lang', ${JSON.stringify(lang)})` });
    await send('Page.navigate', { url: URL });
    // 読みこみは本物の時間で待ちつつ、仮の時計も進める
    for (let i = 0; i < 200; i++) {
      await sleep(50);
      try {
        if (await ev(`typeof GFX !== 'undefined' && !!GFX.ok && !!document.querySelector('.screen.title')`)) break;
        await ev(`window.__step ? __step(${1000 / FPS}) : 0`);
      } catch {}
    }
    await ev(SFX_LOG);
    await ev(HELPERS);
    // 画質を「なめらか」に固定（ヘッドレスはコマ数が少なく見え、そのままだと軽量に落とされる）。タッチの表示に
    await ev(`GFX.watchFps = () => {}; GFX.setTier(0); GFX.Q.prMax = ${scale}; GFX.resize(GFX.appScale); Touch.set(true);
      { const st = document.createElement('style'); st.textContent = '#diag { display: none !important; }${process.env.PROMO_NOZONE ? " .fd-title { display: none !important; }" : ''}'; document.head.appendChild(st); } true`);
    let frames = 0, dir = null;
    const api = {
      ev, send,
      // 撮らずに時間を進める
      run: async sec => { for (let i = 0, n = Math.round(sec * FPS); i < n; i++) await ev(`__step(${1000 / FPS})`); },
      // 時間が来るまで条件を待つ（撮らない）
      until: async (cond, max = 20) => { for (let i = 0; i < max * FPS; i++) { if (await ev(cond)) return true; await ev(`__step(${1000 / FPS})`); } console.warn('待ちきれなかった:', cond); return false; },
      // 撮りはじめ：dir に書く。効果音の記録も 0 秒にそろえる
      start: async out => { dir = out; mkdirSync(dir, { recursive: true }); frames = 0; await ev(`__sfxT0 = __vt(); __sfx.length = 0; true`); },
      // sec 秒ぶん撮る。each(i) はコマごとに呼ぶ（カメラを動かすなど）
      rec: async (sec, each) => {
        for (let i = 0, n = Math.round(sec * FPS); i < n; i++) {
          if (each) await each(i);
          await ev(`__step(${1000 / FPS})`);
          const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 92, optimizeForSpeed: true });
          writeFileSync(join(dir, String(frames++).padStart(5, '0') + '.jpg'), Buffer.from(s.result.data, 'base64'));
        }
      },
      stop: async () => { writeFileSync(join(dir, 'sfx.json'), JSON.stringify(await ev(`__sfx`), null, 1)); return frames; },
      shot: async file => { const s = await send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }); writeFileSync(file, Buffer.from(s.result.data, 'base64')); },
      // 画面をタップ（CSS ピクセル）
      tap: async (x, y) => {
        await send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
        await send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      },
    };
    return await fn(api);
  } finally {
    chrome.kill();
    await sleep(400);
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 5, retryDelay: 300 }); } catch {}
  }
}

if (process.argv[1] && process.argv[1].endsWith('rec.mjs')) {
  const [name, out] = process.argv.slice(2);
  const { SCENES } = await import('./scenes.mjs');
  if (!SCENES[name]) { console.error('場面:', Object.keys(SCENES).join(' ')); process.exit(1); }
  const t = Date.now();
  await session(async api => {
    await SCENES[name](api, out);
    const n = await api.stop();
    console.log(`${name}: ${n} コマ（${(n / FPS).toFixed(1)} 秒）を ${out} へ。${((Date.now() - t) / 1000).toFixed(0)} 秒かかった`);
  });
}
