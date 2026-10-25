// メイキング動画を 1 本につなぐ：台本（Markdown の表）の映像・テロップと、ナレーション（voice.mjs）、ゲームの BGM。
//   node tools/promo/assemble.mjs <台本.md> <出力のフォルダ> [--plan]
// 先に `PORT=8937 node .claude/serve.js` を動かしておく（BGM をゲームの音の仕組みで書き出すため。別のポートなら PROMO_URL で指す）。--plan は編集表を出すだけ。
// 台本のとなりに voice/（lines.tsv・narration.wav）と、映像（chat/ viz/ game/ cards/ … の mp4）があること。
//
// つなぎ方：
//   - 行の映像は、ナレーションのその行の頭から次の行の頭まで。場面の最初の行は場面の頭から。映像の欄が空か「のつづき」の行は前の映像をのばす
//   - 映像が長ければ頭から切る（何本かならぶときは長さの比で分ける）。短ければ、歩く場面や戦闘はくり返し、ほかは最後のコマで止める
//   - 「早回し」と書いた行は 2 倍速。「の一部」と書いた戦闘は OFFSET の秒から
//   - 画面の割りふり（FRAME）：映像は横いっぱい（左右に少し余白）。上の帯に場面の見出し（作業1 など）、下の帯に字幕（ナレーションの文言をすべて）を半透明で重ね、
//     右下に立ち絵（台本のとなりの chara/ に closed.png・open.png・blink.png があれば。足は画面の下で切る。口はナレーションの声の大きさで開け閉め、ときどきまばたき）
//   - 映像の中のテロップは出さない（クレジットは動画の説明欄に書く。CREDIT で出せる）
//   - BGM は場面ごとに TRACK_OF の曲。ナレーションの間は小さくする（サイドチェーン）。最後に -14 LUFS にそろえる
import { spawn, execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync, mkdirSync, mkdtempSync, rmSync, existsSync, statSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { tmpdir } from 'node:os';

const FPS = 30, W = 1920, H = 1080;
const LOOP = new Set(['game/boulder.mp4', 'game/battle-hill.mp4', 'game/village.mp4', 'game/hill.mp4', 'game/town.mp4', 'game/fluff.mp4']);
const OFFSET = { 'game/battle-hill.mp4': 6 };
const TRACK_OF = { 1: 'title', 2: 'village', 3: 'hill', 4: 'pass', 5: 'forest', 6: 'cave', 7: 'tower', 8: 'drowsy', 9: 'royal', 10: 'hope', 11: 'title' };
const BGM_LUFS = -31, VOICE_LUFS = -16;
// 画面の割りふり
// 立ち絵（高さ 700）は右の列（charaX から）。上から charaShow ピクセルだけ見せる（足は画面の下で切れる）
// 映像は 1872×1053 を上の帯の下 (24, 72) から（下のはしは画面の外）。下の字幕の帯（subY から subH）は映像に半透明で重ねる。字幕の文字は subW の幅（立ち絵にかからない）
const FRAME = { bg: '0x1f1b18', top: 72, cx: 24, cy: 72, cw: 1872, ch: 1053, subY: 936, subH: 144, subW: 1536, charaX: 1560, charaShow: 440 };
const CREDIT = false;
const SUB_MAX = 56;   // 字幕 1 枚の文字数のめやす（2 行まで）

const args = process.argv.slice(2), PLAN = args.includes('--plan');
const [src, outArg] = args.filter(a => !a.startsWith('--'));
if (!src || !outArg) { console.error('使い方: node tools/promo/assemble.mjs <台本.md> <出力のフォルダ> [--plan]'); process.exit(1); }
const DIR = dirname(resolve(src)), OUT = resolve(outArg), WORK = join(OUT, 'work');
const sh = (cmd, a, o = {}) => execFileSync(cmd, a, { encoding: 'utf8', maxBuffer: 1 << 26, ...o });
const ff = a => sh('ffmpeg', ['-v', 'error', '-y', ...a], { stdio: 'inherit' });
const probe = f => +sh('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).trim();
const lufs = f => +(/I:\s+(-?[\d.]+) LUFS/.exec(sh('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'ebur128', '-f', 'null', '-'], { stdio: ['ignore', 'pipe', 'pipe'] }) + '') ||
  /I:\s+(-?[\d.]+) LUFS/.exec(execFileSync('sh', ['-c', `ffmpeg -hide_banner -nostats -i "${f}" -af ebur128 -f null - 2>&1 | tail -12`], { encoding: 'utf8' })))[1];

// ---- 台本を読む
const sec = s => { const [m, x] = s.split(':').map(Number); return m * 60 + x; };
const lines = Object.fromEntries(readFileSync(join(DIR, 'voice/lines.tsv'), 'utf8').trim().split('\n').slice(1).map(l => { const [f, , st] = l.split('\t'); return [f.slice(0, 5), +st]; }));
const scenes = [], rows = [];
for (const line of readFileSync(src, 'utf8').split('## 用意するもの')[0].split('\n')) {
  const h = line.match(/^## (\d+)\.\s*(.*?)（(\d+:\d+)〜(\d+:\d+)）/);
  if (h) { scenes.push({ no: +h[1], title: h[2], start: sec(h[3]), end: sec(h[4]), n: 0 }); continue; }
  if (!line.startsWith('|') || line.startsWith('|---') || !scenes.length) continue;
  const c = line.slice(1, -1).split('|').map(x => x.trim());
  if (c.length !== 3 || c[1] === 'ナレーション') continue;
  const s = scenes.at(-1), nar = c[1].replace(/【[^】]*】/g, '').trim();
  const key = nar && !nar.startsWith('（') ? `${String(s.no).padStart(2, '0')}-${String(++s.n).padStart(2, '0')}` : null;
  const first = !rows.some(r => r.scene === s);
  rows.push({ scene: s, vis: c[0], tel: c[2], start: first ? s.start : (key ? lines[key] : null) });
}
rows.forEach((r, i) => { if (r.start == null) r.start = rows[i - 1].start; });
rows.forEach((r, i) => { r.end = rows[i + 1] ? rows[i + 1].start : r.scene.end; });

// ---- 映像のかたまり（行の映像と、そのつづきの行）
const blocks = [];
for (const r of rows) {
  const refs = r.vis.includes('のつづき') ? [] : [...r.vis.matchAll(/`([a-z]+\/[\w.-]+\.mp4)`/g)].map(m => m[1]);
  if (refs.length) blocks.push({ rows: [r], clips: refs, fast: r.vis.includes('早回し'), part: r.vis.includes('の一部'), start: r.start });
  else blocks.at(-1).rows.push(r);
}
blocks.forEach((b, i) => { b.end = blocks[i + 1] ? blocks[i + 1].start : scenes.at(-1).end; b.game = b.clips[0].startsWith('game/'); });

// 長さに合わせて、使う区間を決める
const durOf = {};
for (const b of blocks) {
  const span = b.end - b.start, speed = b.fast ? 2 : 1;
  const nat = b.clips.map(c => { durOf[c] ??= probe(join(DIR, c)); return (durOf[c] - (b.part ? OFFSET[c] || 0 : 0)) / speed; });
  const sum = nat.reduce((a, x) => a + x, 0);
  b.pieces = b.clips.map((c, i) => ({ clip: c, off: b.part ? OFFSET[c] || 0 : 0, len: sum > span ? nat[i] * span / sum : nat[i], speed }));
  b.hold = 0;
  if (sum < span) {
    if (b.clips.every(c => LOOP.has(c))) {   // くり返す
      let left = span - sum;
      for (let k = 0; left > 0.05; k = (k + 1) % b.clips.length) { const p = { ...b.pieces[k] }; p.len = Math.min(nat[k], left); b.pieces.push(p); left -= p.len; }
    } else b.hold = span - sum;              // 最後のコマで止める
  }
}

// テロップ
const tels = [];
for (const b of blocks) for (const r of b.rows) {
  const t = r.tel.replace(/（[^）]*）/g, '').trim();
  if (!t) continue;
  const sagyo = /^作業\d/.test(t), credit = r.scene.no === scenes.at(-1).no, top = b.clips.includes('game/talk.mp4');
  // クレジットは動画の説明欄に書くので、映像には出さない（CREDIT を true にすると、エンディングの左上に出す）
  if (credit && CREDIT) tels.push({ text: t, a: r.start + 0.25, b: r.end - 0.15, block: b, top: true });
}

if (PLAN) {
  for (const b of blocks) console.log(`${b.start.toFixed(2).padStart(7)}〜${b.end.toFixed(2).padStart(7)}  ${b.pieces.map(p => `${p.clip}${p.off ? '+' + p.off : ''}×${p.len.toFixed(1)}${p.speed > 1 ? '(x2)' : ''}`).join(' → ')}${b.hold ? `  止め ${b.hold.toFixed(1)}` : ''}`);
  console.log('\nテロップ'); for (const t of tels) console.log(`${t.a.toFixed(1)}〜${t.b.toFixed(1)}  ${t.text}`);
  process.exit(0);
}
mkdirSync(WORK, { recursive: true });

// ---- Chrome（テロップの画像と BGM）
async function chrome(fn, url = 'about:blank') {
  const port = 9400 + Math.floor(Math.random() * 400), profile = mkdtempSync(join(tmpdir(), 'nyanko-asm-'));
  const proc = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', ['--headless=new', `--remote-debugging-port=${port}`,
    `--user-data-dir=${profile}`, '--hide-scrollbars', '--mute-audio', '--autoplay-policy=no-user-gesture-required', `--window-size=${W},${H}`, url], { stdio: 'ignore' });
  try {
    let target; for (let i = 0; i < 60 && !target; i++) { await new Promise(r => setTimeout(r, 200)); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch {} }
    const ws = new WebSocket(target.webSocketDebuggerUrl); await new Promise(r => ws.addEventListener('open', r, { once: true }));
    let id = 0; const wait = new Map();
    ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } });
    const send = (method, params = {}) => new Promise(r => { const i = ++id; wait.set(i, r); ws.send(JSON.stringify({ id: i, method, params })); });
    const ev = async expr => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true });
      if (r.result?.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || expr); return r.result?.result?.value; };
    await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: false });
    const out = await fn({ send, ev });
    ws.close(); return out;
  } finally { proc.kill(); await new Promise(r => setTimeout(r, 300)); rmSync(profile, { recursive: true, force: true }); }
}

// テロップ：下の帯（透明な 1920×1080 の PNG）
const esc = s => s.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);
await chrome(async ({ send, ev }) => {
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await ev(`document.head.innerHTML = '<style>' + ${JSON.stringify(`
    html, body { margin: 0; width: ${W}px; height: ${H}px; background: transparent; overflow: hidden; font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; -webkit-font-smoothing: antialiased; }
    .band { position: absolute; left: 50%; bottom: 54px; transform: translateX(-50%); display: flex; align-items: center; gap: 22px; white-space: nowrap;
      background: rgba(28, 25, 22, 0.82); color: #fff; border-radius: 18px; padding: 18px 40px; box-shadow: 0 6px 24px rgba(0,0,0,.25); }
    .band.top { top: 40px; bottom: auto; left: 60px; transform: none; }   /* クレジットはロゴにかからないよう左上に */
    .t { font-size: 44px; font-weight: 700; line-height: 1.35; text-align: center; letter-spacing: .02em; }
    .chip { font-size: 34px; font-weight: 800; background: #c96442; border-radius: 12px; padding: 6px 18px; }`)} + '</style>'; true`);
  await ev('document.fonts.ready.then(() => true)');
  for (const [i, t] of tels.entries()) {
    const m = t.text.match(/^(作業\d)\s*(.*)$/);
    const chip = m ? `<span class="chip">${m[1]}</span>` : '';
    const body = (m ? m[2] : t.text).split(' ／ ').map(esc).join('<br>');
    await ev(`document.body.innerHTML = ${JSON.stringify(`<div class="band${t.top ? ' top' : ''}">${chip}<div class="t">${body}</div></div>`)}; true`);
    const s = await send('Page.captureScreenshot', { format: 'png' });
    t.png = join(WORK, `tel-${String(i).padStart(2, '0')}.png`); writeFileSync(t.png, Buffer.from(s.result.data, 'base64'));
  }
});
console.log(`テロップ ${tels.length} 枚`);

// ---- 映像：かたまりごとに書き出して、つなぐ
const list = [];
for (const [bi, b] of blocks.entries()) {
  const frames = Math.round(b.end * FPS) - Math.round(b.start * FPS), span = frames / FPS;
  const inA = [], fl = [];
  b.pieces.forEach((p, i) => { inA.push('-ss', String(p.off), '-t', (p.len * p.speed + 0.05).toFixed(3), '-i', join(DIR, p.clip));
    fl.push(`[${i}:v]setpts=(PTS-STARTPTS)/${p.speed},fps=${FPS},scale=${W}:${H},setsar=1,format=yuv420p,trim=duration=${p.len.toFixed(3)},setpts=PTS-STARTPTS[v${i}]`); });
  let g = fl.join(';') + ';' + b.pieces.map((_, i) => `[v${i}]`).join('') + `concat=n=${b.pieces.length}:v=1:a=0[c];[c]tpad=stop_mode=clone:stop_duration=${(b.hold + 1).toFixed(2)}[x0]`;
  let last = 'x0', n = b.pieces.length;
  for (const t of tels.filter(t => t.block === b)) {
    inA.push('-loop', '1', '-framerate', String(FPS), '-t', span.toFixed(3), '-i', t.png);
    const a = (t.a - b.start).toFixed(2), z = (t.b - b.start).toFixed(2);
    g += `;[${n}:v]format=rgba,fade=t=in:st=${a}:d=0.25:alpha=1,fade=t=out:st=${(+z - 0.25).toFixed(2)}:d=0.25:alpha=1[t${n}];[${last}][t${n}]overlay=0:0:enable='between(t,${a},${z})'[x${n}]`;
    last = `x${n}`; n++;
  }
  const seg = join(WORK, `seg-${String(bi).padStart(2, '0')}.mp4`);
  // 中身（使う映像とその更新時刻・区間・テロップ）が前と同じなら、書き出し直さない
  const key = JSON.stringify({ frames, hold: b.hold, pieces: b.pieces.map(p => [p.clip, statSync(join(DIR, p.clip)).mtimeMs, p.off, p.len.toFixed(3), p.speed]),
    tels: tels.filter(t => t.block === b).map(t => [t.text, t.top, (t.a - b.start).toFixed(2), (t.b - b.start).toFixed(2)]) });
  if (!(existsSync(seg) && existsSync(seg + '.key') && readFileSync(seg + '.key', 'utf8') === key)) {
    ff([...inA, '-filter_complex', g, '-map', `[${last}]`, '-frames:v', String(frames), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-an', seg]);
    writeFileSync(seg + '.key', key);
  }
  list.push(`file '${seg}'`);
  process.stdout.write(`\r映像 ${bi + 1}/${blocks.length}`);
}
console.log();
writeFileSync(join(WORK, 'list.txt'), list.join('\n') + '\n');
const video = join(WORK, 'video.mp4');
ff(['-f', 'concat', '-safe', '0', '-i', join(WORK, 'list.txt'), '-c', 'copy', video]);

// ---- BGM：場面ごとの曲を、ゲームの音の仕組み（MusicPlayer）でオフラインに書き出す
const need = {};
for (const s of scenes) { const k = TRACK_OF[s.no]; need[k] = Math.max(need[k] || 0, s.end - s.start + 3); }
await chrome(async ({ ev }) => {
  for (let i = 0; i < 100 && !(await ev(`typeof MusicPlayer !== 'undefined' && typeof TRACKS !== 'undefined'`).catch(() => false)); i++) await new Promise(r => setTimeout(r, 200));
  for (const [name, len] of Object.entries(need)) {
    const f = join(WORK, `bgm-${name}.wav`);
    if (existsSync(f) && probe(f) >= len - 0.01) continue;
    const b64 = await ev(`(async () => {
      const SR = 48000, LEN = ${len.toFixed(2)};
      const ctx = new OfflineAudioContext(2, Math.ceil(SR * LEN), SR);
      new MusicPlayer(ctx, ctx.destination, TRACKS[${JSON.stringify(name)}]).schedule(LEN);
      const buf = await ctx.startRendering(), n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1), dv = new DataView(new ArrayBuffer(44 + n * 4));
      const w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
      w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
      dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 4, true);
      for (let i = 0; i < n; i++) { dv.setInt16(44 + i * 4, Math.max(-1, Math.min(1, L[i])) * 32767, true); dv.setInt16(46 + i * 4, Math.max(-1, Math.min(1, R[i])) * 32767, true); }
      const u8 = new Uint8Array(dv.buffer); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
      return btoa(s);
    })()`);
    writeFileSync(join(WORK, `bgm-${name}.wav`), Buffer.from(b64, 'base64'));
  }
}, process.env.PROMO_URL || 'http://127.0.0.1:8937/index.html');
console.log('BGM:', Object.keys(need).join(' '));

// ---- 音：BGM を場面ごとにならべ（つなぎ目は 1.5 秒で入れかえ）、ナレーションの間は下げて、ナレーションと混ぜる
const total = scenes.at(-1).end;
const bgIn = [], bgF = [];
scenes.forEach((s, i) => {
  const f = join(WORK, `bgm-${TRACK_OF[s.no]}.wav`), g = BGM_LUFS - lufs(f);
  const st = Math.max(0, s.start - (i ? 0.75 : 0)), len = (s.end + (i < scenes.length - 1 ? 0.75 : 0)) - st;
  bgIn.push('-i', f);
  bgF.push(`[${i}:a]atrim=0:${len.toFixed(3)},asetpts=PTS-STARTPTS,volume=${g.toFixed(2)}dB,afade=t=in:d=${i ? 1.5 : 0.5},afade=t=out:st=${(len - 1.5).toFixed(3)}:d=1.5,adelay=${Math.round(st * 1000)}|${Math.round(st * 1000)}[b${i}]`);
});
const bgm = join(WORK, 'bgm.wav');
ff([...bgIn, '-filter_complex', bgF.join(';') + ';' + scenes.map((_, i) => `[b${i}]`).join('') + `amix=inputs=${scenes.length}:normalize=0,atrim=0:${total}[o]`, '-map', '[o]', '-ar', '48000', bgm]);
const nar = join(DIR, 'voice/narration.wav'), vg = VOICE_LUFS - lufs(nar);
const mix = join(WORK, 'mix.wav');
ff(['-i', nar, '-i', bgm, '-filter_complex',
  `[0:a]aresample=48000,pan=stereo|c0=c0|c1=c0,volume=${vg.toFixed(2)}dB,apad=whole_dur=${total},asplit=2[n1][n2];` +
  `[1:a][n1]sidechaincompress=threshold=0.03:ratio=5:attack=30:release=500:makeup=1[duck];` +
  `[n2][duck]amix=inputs=2:normalize=0,loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[o]`, '-map', '[o]', '-t', String(total), mix]);

// ---- 字幕：ナレーションの行を文の切れ目で分け、読む長さの比で時刻をわりふる
const said = readFileSync(join(DIR, 'voice/lines.tsv'), 'utf8').trim().split('\n').slice(1).map(l => { const [, , st, du, text] = l.split('\t'); return { st: +st, du: +du, text }; });
const subs = [];
said.forEach((s, li) => {
  let parts = s.text.split(/(?<=[。！？])/).filter(x => x.trim());
  parts = parts.flatMap(p => {   // 長い文は、まん中に近い「、」で分ける
    const out = []; let q = p;
    while ([...q].length > SUB_MAX) { const c = [...q], mid = c.length / 2; let best = -1;
      c.forEach((ch, i) => { if (ch === '、' && i > 8 && i < c.length - 6 && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i; });
      if (best < 0) break; out.push(c.slice(0, best + 1).join('')); q = c.slice(best + 1).join(''); }
    return [...out, q];
  });
  const merged = []; for (const p of parts) { if (merged.length && [...merged.at(-1)].length + [...p].length <= SUB_MAX - 16) merged[merged.length - 1] += p; else merged.push(p); }
  const len = [...s.text].length; let c0 = 0;
  merged.forEach((m, i) => { const c1 = c0 + [...m].length;
    const next = said[li + 1] ? said[li + 1].st : total;
    subs.push({ text: m, a: s.st + s.du * c0 / len, b: i === merged.length - 1 ? Math.min(next, s.st + s.du + 0.6) : s.st + s.du * c1 / len }); c0 = c1; });
});
// 字幕の改行：1 行に入りきらないときは、まん中に近い文の切れ目（。、！？のあと）で折る。切れ目がなければブラウザにまかせる
const LINE_MAX = 31;
const breakSub = s => {
  const c = [...s]; if (c.length <= LINE_MAX) return s;
  let best = -1;
  c.forEach((ch, i) => { const L = i + 1, R = c.length - L;
    if ('。、！？'.includes(ch) && L <= LINE_MAX + 1 && R <= LINE_MAX && R > 0 && (best < 0 || Math.abs(L - c.length / 2) < Math.abs(best + 1 - c.length / 2))) best = i; });
  return best < 0 ? s : c.slice(0, best + 1).join('') + '\n' + c.slice(best + 1).join('');
};
// 見出し：場面の題（「作業1：まず企画書を書かせる」は、作業1 の札と題）
const heads = scenes.map(s => ({ a: s.start, b: s.end, text: s.title }));

// 字幕・見出しの画像（透明の PNG）
const subDir = join(WORK, 'subs'); mkdirSync(subDir, { recursive: true });
await chrome(async ({ send, ev }) => {
  await send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
  await ev(`document.head.innerHTML = '<style>' + ${JSON.stringify(`
    html, body { margin: 0; background: transparent; overflow: hidden; font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; -webkit-font-smoothing: antialiased; }
    .sub { width: ${FRAME.subW}px; height: ${FRAME.subH}px; display: flex; align-items: center; justify-content: center; }
    .sub div { max-width: ${FRAME.subW - 80}px; color: #fff; font-size: 44px; font-weight: 700; line-height: 1.38; text-align: center; letter-spacing: .02em; white-space: pre-line; line-break: strict; text-wrap: balance; }
    .head { width: ${W}px; height: ${FRAME.top}px; display: flex; align-items: center; gap: 18px; padding: 0 ${FRAME.cx}px; box-sizing: border-box; color: #f3ede4; }
    .head .chip { font-size: 28px; font-weight: 800; background: #c96442; color: #fff; border-radius: 10px; padding: 4px 14px; }
    .head .t { font-size: 32px; font-weight: 700; }
    .head .r { margin-left: auto; font-size: 24px; color: #a99f92; }`)} + '</style>'; true`);
  await ev(`document.documentElement.lang = 'ja'; document.fonts.ready.then(() => true)`);   // 日本語の文節で折る（auto-phrase）
  const shot = async (html, w, h, file) => { await ev(`document.body.innerHTML = ${JSON.stringify(html)}; true`);
    const s = await send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: w, height: h, scale: 1 } }); writeFileSync(file, Buffer.from(s.result.data, 'base64')); };
  await shot('<div class="sub"></div>', FRAME.subW, FRAME.subH, join(subDir, 'sub-blank.png'));
  for (const [i, s] of subs.entries()) await shot(`<div class="sub"><div>${esc(breakSub(s.text))}</div></div>`, FRAME.subW, FRAME.subH, s.png = join(subDir, `sub-${String(i).padStart(3, '0')}.png`));
  for (const [i, h] of heads.entries()) {
    const m = h.text.match(/^(作業\d)：(.*)$/);
    await shot(`<div class="head">${m ? `<span class="chip">${m[1]}</span><span class="t">${esc(m[2])}</span>` : `<span class="t">${esc(h.text)}</span>`}<span class="r">AIでRPGを作ってみた</span></div>`, W, FRAME.top, h.png = join(subDir, `head-${String(i).padStart(2, '0')}.png`));
  }
});
console.log(`字幕 ${subs.length} 枚・見出し ${heads.length} 枚`);
// 時刻つきの画像の並び → concat の一覧（あいだは blank）
const seqList = (items, blank, file) => {
  let t = 0, txt = '';
  const add = (png, d) => { if (d > 0.001) { txt += `file '${png}'\nduration ${d.toFixed(4)}\n`; t += d; } };
  for (const it of items) { add(blank, it.a - t); add(it.png, Math.min(it.b, total) - Math.max(it.a, t)); }
  add(blank, total - t); txt += `file '${blank ?? items.at(-1).png}'\n`;
  writeFileSync(file, txt); return file;
};
const subList = seqList(subs, join(subDir, 'sub-blank.png'), join(WORK, 'subs.txt'));
const headList = seqList(heads, heads[0].png, join(WORK, 'heads.txt'));

// 立ち絵：口はナレーションの声の大きさ（1 コマごとの RMS）で開け閉め。ときどきまばたき
const CH = join(DIR, 'chara'), hasChara = ['closed', 'open', 'blink'].every(k => existsSync(join(CH, k + '.png')));
let charaList = null, cw = 0, chh = 0;
if (hasChara) {
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', nar, '-ac', '1', '-ar', String(FPS * 800), '-f', 's16le', '-'], { maxBuffer: 1 << 28 });
  const pcm = new Int16Array(raw.buffer, raw.byteOffset, raw.length >> 1), per = 800, nF = Math.round(total * FPS);
  const open = []; for (let f = 0; f < nF; f++) { let s = 0; for (let k = f * per; k < (f + 1) * per && k < pcm.length; k++) s += pcm[k] * pcm[k]; open.push(Math.sqrt(s / per) / 32768 > 0.035); }
  for (let f = 1; f < nF - 1; f++) if (!open[f] && open[f - 1] && open[f + 1]) open[f] = true;   // 1 コマだけ閉じるのはうめる
  let state = [], seed = 7; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  for (let f = 0, nextBlink = FPS * 3; f < nF; f++) { let k = open[f] ? 'open' : 'closed';
    if (f >= nextBlink && f < nextBlink + 4 && !open[f]) k = 'blink'; if (f >= nextBlink + 4) nextBlink = f + Math.round(FPS * (2.5 + rnd() * 3)); state.push(k); }
  let txt = ''; for (let f = 0; f < nF;) { let g = f; while (g < nF && state[g] === state[f]) g++; txt += `file '${join(CH, state[f] + '.png')}'\nduration ${((g - f) / FPS).toFixed(4)}\n`; f = g; }
  txt += `file '${join(CH, 'closed.png')}'\n`; charaList = join(WORK, 'chara.txt'); writeFileSync(charaList, txt);
  [cw, chh] = sh('ffprobe', ['-v', 'error', '-select_streams', 'v', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', join(CH, 'closed.png')]).trim().split(',').map(Number);
}

// ---- 仕上げ：枠の上に、映像・字幕・見出し・立ち絵を重ねる
const final = join(OUT, 'making-of.mp4');
const inF = ['-f', 'lavfi', '-i', `color=c=${FRAME.bg}:s=${W}x${H}:r=${FPS}:d=${total}`, '-i', video, '-f', 'concat', '-safe', '0', '-i', subList, '-f', 'concat', '-safe', '0', '-i', headList];
let gF = `[1:v]scale=${FRAME.cw}:${FRAME.ch}[cv];[0:v][cv]overlay=${FRAME.cx}:${FRAME.cy},` +
  `drawbox=x=0:y=0:w=${W}:h=${FRAME.top}:color=0x1f1b18@0.9:t=fill,drawbox=x=0:y=${FRAME.subY}:w=${W}:h=${FRAME.subH}:color=0x141210@0.72:t=fill[a];` +
  `[2:v]fps=${FPS},format=rgba[s];[a][s]overlay=${FRAME.cx}:${FRAME.subY}[b];[3:v]fps=${FPS},format=rgba[h];[b][h]overlay=0:0[c]`;
let lastF = 'c', aIdx = 4;
if (hasChara) { inF.push('-f', 'concat', '-safe', '0', '-i', charaList); gF += `;[4:v]fps=${FPS},format=rgba[z];[c][z]overlay=${FRAME.charaX}:${H - FRAME.charaShow}[d]`; lastF = 'd'; aIdx = 5; }
inF.push('-i', mix);
ff([...inF, '-filter_complex', gF, '-map', `[${lastF}]`, '-map', `${aIdx}:a`, '-t', String(total), '-r', String(FPS), '-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p',
  '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', final]);
console.log(hasChara ? '立ち絵あり' : '立ち絵なし（chara/ に closed.png・open.png・blink.png がない）');
writeFileSync(join(OUT, 'making-of.srt'), readFileSync(join(DIR, 'voice/narration.srt')));
console.log(`できた：${final}（${probe(final).toFixed(1)} 秒）。字幕は making-of.srt（YouTube にそのまま上げられる）`);
