// 紹介動画の仕上げ：撮った場面（tools/promo/rec.mjs）をつなぎ、BGM と効果音を書き出して重ねる。
//   node tools/promo/make.mjs <場面のフォルダ> <出力のフォルダ> [--captions]
// --captions で字幕入り（CAPTIONS）。字幕はゲームと同じフォントで Chrome に透明な画像として描かせて重ねる（ffmpeg の drawtext がないため）。
//   字幕版の探索の場面は、入ったときの地名が字幕と重なるので、PROMO_NOZONE=1 で撮った場面を使う
// 場面のフォルダには rec.mjs で撮った title/ hill/ … が並んでいること（`for n in …; do node tools/promo/rec.mjs $n <場面のフォルダ>/$n; done`）。
// 書き出すもの：
//   app-store-1920x886.mp4    App Store のプレビュー（iPhone 6.9／6.5 インチ、横。15〜30 秒・30fps・H.264・AAC 256kbps）
//   google-play-1920x1080.mp4 Google Play（YouTube に上げて URL を登録）。まん中のゲームの画面だけを切り出す
//   （字幕入りは、名前のおしりに -captions）
// BGM はタイトルの曲（TRACKS.title）を 2 小節目から。1 小節（88bpm で 2.727 秒）ごとに場面を切りかえ、
// A の旋律の終わり（主音にもどるところ）で最後の場面へ。ちょうど 30 秒で曲の区切りになる
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { session, FPS } from './rec.mjs';

const args = process.argv.slice(2), CAP = args.includes('--captions');
const [clipsArg, outArg] = args.filter(a => !a.startsWith('--'));
if (!clipsArg || !outArg) { console.error('使い方: node tools/promo/make.mjs <場面のフォルダ> <出力のフォルダ>'); process.exit(1); }
const CLIPS = resolve(clipsArg), OUT = resolve(outArg);
const BAR = 60 / 88 * 4, BAR_F = BAR * FPS;   // 1 小節のコマ数（81.8）
const at = bars => Math.round(bars * BAR_F);

// [場面, 使うコマ（はじめ, おわり）, 何小節目まで]。戦闘は 4 小節を、技の見せ場ごとに細かく切る
const EDIT = [
  ['title', [0], 2],           // にゃんだーの樹を見上げて、ロゴ、5 匹のうしろへ
  ['hill', [45], 3],           // 風車の丘をかけ上がる
  ['talk', [24], 4],           // シロの「ファイア！」
  ['fluff', [30], 5],          // 綿毛につかまって、川をこえる
  ['town', [60], 6],           // ニャハハ王国の城下町
  ['battle', [182, 226], null], // にゃんこブレイク
  ['battle', [256, 360], null], // ミケの必殺技「流星ねこぎり」
  ['battle', [448, 486], null], // シロの必殺技「ちょう天才メテオ」の決め
  ['battle', [526, 560], null], //   メテオが落ちる
  ['battle', [610, 642], null], // クロの必殺技「月影一閃」の決め
  ['battle', [664], 10],       //   ひと太刀
  ['vista', [0], 11],          // 見晴らし台から、遠くのお城を見る
];

// 字幕：[EDIT の何番目から, 何番目まで, 文字, 帯の上の位置（ゲームの画面 1280×720 で）]。最後はタイトル（ロゴの文字）
//   探索の場面は、左上の「ぼうけんの目的」にかからないよう下げる（会話はシロの帽子に、戦闘は敵の名前にかからない高さ）
const CAPTIONS = [
  [1, 1, '2頭身のにゃんこと 大冒険', 175],
  [2, 2, 'にぎやかな仲間たち'],
  [3, 3, 'ふしぎな仕掛けの森', 175],
  [4, 4, 'いろんな町をめぐる旅', 175],
  [5, 6, 'ターン制のコマンドバトル'],
  [7, 10, 'にゃんこごとの必殺技'],
  [11, 11, null],
];

// 小節にあわせて、それぞれのコマ数を決める（おわりのない場面は、小節の区切りまで）
const cuts = []; let t = 0;
for (const [clip, [s, e], bar] of EDIT) {
  let n;
  if (e != null) n = e - s;
  else n = at(bar) - t;
  cuts.push({ clip, s, n, t0: t }); t += n;
}
const TOTAL = t, DUR = TOTAL / FPS;
console.log(`全部で ${TOTAL} コマ（${DUR.toFixed(2)} 秒）`);
for (const c of cuts) console.log(`  ${(c.t0 / FPS).toFixed(2).padStart(6)} 秒  ${c.clip} ${c.s}〜${c.s + c.n}`);

// コマを一列に並べる（もとの JPEG へのリンク）
const SEQ = join(OUT, 'frames');
rmSync(SEQ, { recursive: true, force: true }); mkdirSync(SEQ, { recursive: true });
for (const c of cuts) for (let i = 0; i < c.n; i++) {
  const src = join(CLIPS, c.clip, String(c.s + i).padStart(5, '0') + '.jpg');
  if (!existsSync(src)) throw new Error(`コマがない: ${src}`);
  symlinkSync(src, join(SEQ, String(c.t0 + i).padStart(5, '0') + '.jpg'));
}

// 効果音：場面ごとの記録から、使ったコマのあいだに鳴ったものを、動画の時間へ
const events = [];
for (const c of cuts) {
  const log = JSON.parse(readFileSync(join(CLIPS, c.clip, 'sfx.json'), 'utf8'));
  for (const ev of log) {
    const f = ev.t * FPS - 1;   // コマ n は、撮りはじめから n+1 コマぶん進めたところ
    if (f >= c.s - 4 && f < c.s + c.n) events.push({ ...ev, t: Math.max(0, c.t0 + f - c.s) / FPS });
  }
}
console.log(`効果音 ${events.length} こ`);

// 音をオフラインで書き出す（ゲームの audio.js をそのまま使う）。BGM はタイトルの曲の 2 小節目から
const wav = join(OUT, 'audio.wav');
await session(async api => {
  const b64 = await api.ev(`(async () => {
    const SR = 48000, DUR = ${DUR}, OFS = ${BAR} + 0.1, events = ${JSON.stringify(events)};
    // BGM だけを先に（曲の頭は 0.1 秒から鳴る）
    const mctx = new OfflineAudioContext(2, Math.ceil(SR * (DUR + OFS + 1)), SR);
    const mp = new MusicPlayer(mctx, mctx.destination, TRACKS.title); mp.schedule(DUR + OFS + 0.5);
    const music = await mctx.startRendering();
    // ゲームと同じ通り道：bgm・se → master（2.5 倍）→ リミッター
    const ctx = new OfflineAudioContext(2, Math.ceil(SR * DUR), SR);
    const master = ctx.createGain(); master.gain.value = 2.5;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.2;
    master.connect(lim); lim.connect(ctx.destination);
    const bgm = ctx.createGain(), se = ctx.createGain(); bgm.connect(master); se.connect(master);
    const mout = ctx.createGain(); mout.connect(bgm);
    const v = 0.16 * Music.vol, G = mout.gain;
    G.setValueAtTime(0, 0); G.linearRampToValueAtTime(v, 0.04); G.setValueAtTime(v, DUR - 1.2); G.linearRampToValueAtTime(0, DUR);
    const src = ctx.createBufferSource(); src.buffer = music; src.connect(mout); src.start(0, OFS);
    // 効果音：Sfx の関数を、時計だけ差しかえた ctx で呼ぶ
    let now = 0;
    const px = new Proxy(ctx, { get(t, k) { if (k === 'currentTime') return now; const x = Reflect.get(t, k, t); return typeof x === 'function' ? x.bind(t) : x; } });
    const S = Object.create(Sfx); S.ctx = px; S.se = se; S.on = true;
    for (const e of events) { now = e.t; try { S[e.k](...e.a); } catch (err) { console.error(e.k, err); } }
    const buf = await ctx.startRendering();
    // 16bit の WAV に
    const n = buf.length, L = buf.getChannelData(0), R = buf.getChannelData(1), dv = new DataView(new ArrayBuffer(44 + n * 4));
    const w = (o, s) => [...s].forEach((c, i) => dv.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); dv.setUint32(4, 36 + n * 4, true); w(8, 'WAVE'); w(12, 'fmt '); dv.setUint32(16, 16, true); dv.setUint16(20, 1, true); dv.setUint16(22, 2, true);
    dv.setUint32(24, SR, true); dv.setUint32(28, SR * 4, true); dv.setUint16(32, 4, true); dv.setUint16(34, 16, true); w(36, 'data'); dv.setUint32(40, n * 4, true);
    let peak = 0;
    for (let i = 0; i < n; i++) { for (const [c, d] of [[0, L], [1, R]]) { const x = Math.max(-1, Math.min(1, d[i])); peak = Math.max(peak, Math.abs(x)); dv.setInt16(44 + i * 4 + c * 2, x * 32767, true); } }
    console.log('peak', peak);
    const u8 = new Uint8Array(dv.buffer); let s = '';
    for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
    return btoa(s);
  })()`);
  writeFileSync(wav, Buffer.from(b64, 'base64'));
});

// 字幕の画像（撮った画面と同じ 2340×1080、透明）。ゲームの画面（1280×720 を 0.6 倍してまん中）の上のほうに、会話ウィンドウと同じ色の帯で
const caps = [];
if (CAP) {
  const dir = join(OUT, 'captions'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  await session(async api => {
    await api.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await api.ev(`{ document.head.innerHTML = '<style>' + ${JSON.stringify(`
      html, body { margin: 0; background: transparent !important; overflow: hidden; width: 100vw; height: 100vh; }
      body { font-family: "Hiragino Maru Gothic ProN", "Hiragino Sans", sans-serif; }
      #g { position: absolute; left: 50%; top: 50%; width: 1280px; height: 720px; transform: translate(-50%, -50%) scale(0.6); }
      .cap { position: absolute; left: 50%; top: 88px; transform: translateX(-50%); white-space: nowrap; padding: 10px 40px 12px;
        border-radius: 999px; background: rgba(62, 40, 34, .86); border: 3px solid #ffcf6a; box-shadow: 0 6px 22px rgba(0, 0, 0, .35);
        color: #fff4d8; font-size: 38px; font-weight: 700; letter-spacing: .08em; text-shadow: 0 2px 0 #a8502e; }
      .logo { position: absolute; left: 0; right: 0; top: 70px; text-align: center; color: #fff; }
      .logo h1 { margin: 0; font-size: 84px; font-weight: 900; letter-spacing: .06em; }
      .logo h1 span { text-shadow: 0 4px 0 #c8603a, 0 8px 18px rgba(120, 50, 20, .5); }
      .logo h1 span:nth-child(odd) { color: #fff4d8; } .logo h1 span:nth-child(3n) { color: #ffd0e0; }
      .logo .en { font-size: 16px; letter-spacing: .6em; margin-bottom: 8px; text-shadow: 0 2px 6px rgba(120, 60, 20, .6); }
      .logo .sub { font-size: 24px; letter-spacing: .3em; margin-top: 6px; text-shadow: 0 2px 6px rgba(120, 60, 20, .8); }`)} + '</style>';
      document.body.innerHTML = '<div id="g"></div>'; } true`);
    for (const [i, j, text, top = 88] of CAPTIONS) {
      const html = text ? `<div class="cap" style="top: ${top}px">${text}</div>`
        : `<div class="logo"><div class="en">NYANKO FANTASY</div><h1>${[...'にゃんこファンタジー'].map(c => `<span>${c}</span>`).join('')}</h1><div class="sub">〜 流れ星のおちた丘から 〜</div></div>`;
      await api.ev(`{ document.getElementById('g').innerHTML = ${JSON.stringify(html)}; } true`);
      const file = join(dir, `${caps.length}.png`);
      const shot = await api.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
      const a = cuts[i].t0 / FPS, b = (cuts[j].t0 + cuts[j].n) / FPS;
      caps.push({ file, a, b, last: j === cuts.length - 1 });
    }
  });
}

const ff = args => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit' });
const enc = ['-c:v', 'libx264', '-profile:v', 'high', '-level:v', '4.0', '-pix_fmt', 'yuv420p', '-r', String(FPS),
  '-b:v', '11M', '-maxrate', '12M', '-bufsize', '24M', '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-ac', '2', '-movflags', '+faststart', '-shortest'];
const input = ['-framerate', String(FPS), '-i', join(SEQ, '%05d.jpg'), '-i', wav,
  ...caps.flatMap(c => ['-loop', '1', '-framerate', String(FPS), '-t', String(DUR), '-i', c.file])];
// 字幕は切りかわりの 0.15 秒あとから 0.3 秒でうかび、次の切りかわりの前に 0.25 秒で消える（最後のタイトルは消えない）
const overlay = () => {
  let g = '', last = '0:v';
  caps.forEach((c, k) => {
    const a = c.a + (c.last ? 0.4 : 0.15), b = c.last ? DUR : c.b - 0.08;
    g += `[${k + 2}:v]format=rgba,fade=t=in:st=${a.toFixed(3)}:d=${c.last ? 0.8 : 0.3}:alpha=1${c.last ? '' : `,fade=t=out:st=${(b - 0.25).toFixed(3)}:d=0.25:alpha=1`}[c${k}];`;
    g += `[${last}][c${k}]overlay=0:0:enable='between(t,${(a - 0.05).toFixed(3)},${b.toFixed(3)})'[v${k}];`;
    last = `v${k}`;
  });
  return { g, last };
};
// ゲームの音量のままだと小さい（-22 LUFS）ので、ストアの動画のふつう（-16 LUFS）まで上げて、ピークはリミッターで抑える
const AF = 'volume=6.5dB,alimiter=limit=0.85:level=false';
const out = (vf, name) => {
  const { g, last } = overlay();
  ff([...input, '-filter_complex', `${g}[${last}]${vf}[vo];[1:a]${AF}[ao]`, '-map', '[vo]', '-map', '[ao]', ...enc, join(OUT, name + (CAP ? '-captions' : '') + '.mp4')]);
};
// App Store：iPhone と同じ横長（両はしの星の帯ごと）を 1920×886 に
out('scale=1920:886:flags=lanczos,setsar=1', 'app-store-1920x886');
// Google Play：まん中の 16:9（1920×1080。撮った画面の左から 210 ピクセル）
out('crop=1920:1080:210:0,setsar=1', 'google-play-1920x1080');
console.log(`書き出した：${OUT}`);
