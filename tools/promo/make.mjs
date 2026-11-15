// 紹介動画の仕上げ：撮った場面（tools/promo/rec.mjs）をつなぎ、BGM と効果音を書き出して重ねる。
//   node tools/promo/make.mjs <場面のフォルダ> <出力のフォルダ> [--plan=tour|ult|world] [--captions]
// --plan で並べかた（PLANS）。tour は街めぐり（もとの 30 秒）、ult は必殺技から始まる版（名前のおしりに -ult）、
//   world は第一章〜第六章をめぐる版（名前のおしりに -world。見出しの文字はいつも入る。場面は scenes.mjs の w_…）
// --captions で字幕入り（CAPTIONS）。字幕はゲームと同じフォントで Chrome に透明な画像として描かせて重ねる（ffmpeg の drawtext がないため）。
//   字幕版の探索の場面は、入ったときの地名が字幕と重なるので、PROMO_NOZONE=1 で撮った場面を使う
// 場面のフォルダには rec.mjs で撮った title/ hill/ … が並んでいること（`for n in …; do node tools/promo/rec.mjs $n <場面のフォルダ>/$n; done`）。
// 書き出すもの：
//   app-store-1920x886.mp4    App Store のプレビュー（iPhone 6.9／6.5 インチ、横。15〜30 秒・30fps・H.264・AAC 256kbps）。
//                             プランに crop があれば、星の帯なしでゲームの画面を横いっぱいに（上下を切る）
//   google-play-1920x1080.mp4 Google Play（YouTube に上げて URL を登録）。まん中のゲームの画面だけを切り出す
//   （字幕入りは、名前のおしりに -captions）
// 場面の並び・字幕・BGM はプランごと（下の PLANS）
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, rmSync, symlinkSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { session, FPS } from './rec.mjs';

const args = process.argv.slice(2), CAP = args.includes('--captions');
const planArg = args.find(a => a.startsWith('--plan='))?.slice(7) || 'tour';
const [clipsArg, outArg] = args.filter(a => !a.startsWith('--'));
if (!clipsArg || !outArg) { console.error('使い方: node tools/promo/make.mjs <場面のフォルダ> <出力のフォルダ> [--plan=tour|ult] [--captions]'); process.exit(1); }
const CLIPS = resolve(clipsArg), OUT = resolve(outArg);
const BAR = 60 / 88 * 4, BAR_F = BAR * FPS;   // 1 小節のコマ数（81.8）
const at = bars => Math.round(bars * BAR_F);

// 並べかた（--plan=…）。edit：[場面, 使うコマ（はじめ, おわり）, 何小節目まで]。captions：[edit の何番目から, 何番目まで, 文字, 帯の上の位置]。
//   music：[曲, 動画の何秒から, その曲の何秒目から]。次の曲へは 0.5 秒で入れかわり、最後の 1.2 秒で消える
const PLANS = {
  // 街めぐり（30 秒）：タイトルの曲の 2 小節目から。1 小節（88bpm で 2.727 秒）ごとに場面を切りかえ、
  //   A の旋律の終わり（主音にもどるところ）で最後の場面へ。ちょうど 30 秒で曲の区切りになる
  tour: {
    edit: [
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
    ],
    // 探索の場面は、左上の「ぼうけんの目的」にかからないよう下げる（会話はシロの帽子に、戦闘は敵の名前にかからない高さ）。最後はタイトル（ロゴの文字）
    captions: [
      [1, 1, '2頭身のにゃんこと 大冒険', 175],
      [2, 2, 'にぎやかな仲間たち'],
      [3, 3, 'ふしぎな仕掛けの森', 175],
      [4, 4, 'いろんな町をめぐる旅', 175],
      [5, 6, 'ターン制のコマンドバトル'],
      [7, 10, 'にゃんこごとの必殺技'],
      [11, 11, null],
    ],
    music: [['title', 0, BAR + 0.1]],
  },
  // 必殺技から（約 27 秒）：検索結果で音なしで流れる頭の数秒に、いちばん動きのある必殺技を。
  //   技の名前のカットイン → 技 → ダメージの数字まで。選ぶ間・味方のうしろ姿は切る。そのあと魚・タマ・タイトル
  //   曲は戦闘の曲の頭から、魚の場面でタイトルの曲へ。タイトルの曲は、tour と同じ所（A の旋律が主音にもどる所）で終わるように入る
  ult: {
    edit: [
      ['battleUlt', [40, 80]],     // ミケ「炎の大車輪」のカットイン
      ['battleUlt', [100, 140]],   //   とびこんで炎の輪
      ['battleUlt', [160, 196]],   // シロ「ダイヤモンドダスト」のカットイン
      ['battleUlt', [220, 306]],   //   杖をかかげ、氷の粒が渦を巻いて、ダメージ
      ['battleUlt', [322, 356]],   // マオウ「暗黒ねこ波」のカットイン
      ['battleUlt', [378, 492]],   //   笏をかかげ、ねこ耳の闇の大波
      // ここから 6 小節（491 コマ）。タイトルの曲が小節の頭から入るように
      ['talk', [24, 176]],         // シロの「ファイア！」で、空から魚が降る
      ['tamaNap', [6, 135]],       // 綿毛のてっぺんで眠るタマ
      ['title', [0, 210]],         // タイトル：樹を見上げて、5 匹のうしろへ、ロゴ
    ],
    captions: [],
    music: [['battle', 0, 0.1], ['title', 'talk', 'end']],
    // App Store 用は星の帯を入れず、ゲームの画面（16:9）を横いっぱいにして上下を切る。場面ごとの切る位置（0＝上を残す・1＝下を残す）
    //   戦闘は下の仲間のカードを残す。会話はウィンドウを残す。タマは上の Zz を残す。タイトルはロゴと 5 匹（右上の言語ボタンは切れる）
    crop: { battleUlt: 0.85, talk: 1, tamaNap: 0.5, title: 0.6 },
  },
  // 第一章〜第六章をめぐる（30 秒）：頭の 3 秒は、いちばん派手な必殺技（夜空の月へ跳ぶ、クロの「満月」）で目を引く。
  //   見出しは、音なしで流れても伝わる大きな文字で、ゲームの説明（ジャンル・しくみの名前）ではなく、ねこたちの人柄と笑い・仲間の話を言う。
  //   猫の顔が見える画を 0.9〜3 秒で次つぎに切りかえる：必殺技 → 走ってくる 4 匹 → 各地（森・城下町・塔・洞窟・魔王領）→ 仲間 4 匹（それぞれ、ひとネタ）
  //   → 切り通しの特攻隊長 → 戦闘（技を選ぶ・コンボ・暗黒ねこ波・ちょう大ばくはつと、けむりで頭がもこもこのシロ）→ タイトル。
  //   曲はタイトルの曲を 96bpm にして、前奏 4 小節 → A'（弦とドラムが重なる 8 小節。仲間の紹介から）。1 拍（0.625 秒）か半拍で切りかえ、ちょうど 30 秒で主音に落ちつく。
  //   edit：[場面, はじめのコマ（数か、目印の名前±コマ。目印は場面のフォルダの marks.json）, 何拍目まで]
  //   captions：[何拍目から, 何拍目まで, 文字（<b> は黄色、<small> は小さく）]。長い文は、横に収まるまで字を小さくする
  world: {
    bpm: 96, x0: 0,
    edit: [
      ['w_bMoon', 'ult+4', 1],          // くろねこ谷：クロ「満月」のカットイン
      ['w_bMoon', 'ultgo+13', 5],       //   夜空の月へ跳んで、三日月の斬撃
      ['w_run', 22, 8],                 // 風車の丘を、こちらへ走ってくる
      ['w_forest', 4, 9.5],             // ほしふる森の橋
      ['w_town', 10, 11],               // ニャハハ王国の城下町
      ['w_tower', 10, 12.5],            // 笑顔の塔
      ['w_cave', 10, 14],               // 黒影洞窟の光の水晶
      ['w_demon', 10, 16],              // 魔王領（奥に魔王城）
      ['w_mike', 0, 19],                // ミケ「でも、すっごくおいしかったよ！」（魚の「味見」を叱られて）
      ['w_kuro', 20, 22],               // クロ「……もらう。」（魚をすすめられて、照れる）
      ['w_shiro', 'sfx:zap-8', 25],     // シロ「ファイア！」→ 魚が降る
      ['w_tama', 0, 28],                // タマ「……すぴー……。」
      ['w_boar', 55, 30.5],             // ごろごろ切り通しの特攻隊長
      ['w_bField', 'act-4', 32],        // 風車の畑：技を選んで、ミケの「勇者のつるぎ」
      ['w_bField', 'sfx:slam-30', 34],  //   ミケとクロのコンボ技「にゃんこブレイク」
      ['w_bWave', 'sfx:slam+26', 36.5], // ネズミの王国：マオウ「暗黒ねこ波」
      ['w_bBoom', 'sfx:slam-12', 38.5], // 切り通し：シロ「ちょう大ばくはつ」
      ['w_bBoom', 'sfx:slam+25', 40],   //   けむりで頭がもこもこのシロ
      ['w_title', 0, 48],               // タイトル
    ],
    captions: [
      [0, 5, 'かわいい顔して、<b>技はド派手。</b>'],
      [5, 8, 'ゆかいな<b>4匹</b>と、旅に出よう。'],
      [8, 16, '<b>流れ星の丘</b>から、<b>魔王城</b>まで。'],
      [16, 19, '勇者<b>ミケ</b>。今日も魚をつまみ食い。'],
      [19, 22, 'クールな<b>クロ</b>。……でも魚はもらう。'],
      [22, 25, '天才（自称）<b>シロ</b>。炎のはずが、魚。'],
      [25, 28, '<b>タマ</b>は寝てる。だいたい寝てる。'],
      [28, 30.5, '出てくる敵も、<b>クセが強い。</b>'],
      [30.5, 34, '一匹じゃ弱くても、<b>二匹なら。</b>'],
      [34, 38.5, '仲間となら、<b>どこまでも強くなる。</b>'],
      [38.5, 40, '<b>……やりすぎた。</b>'],
      [41, 48, 'このにゃんこたちが、<b>世界を救う。</b><small>……たぶん。</small>', { size: 70, top: -14 }],
    ],
    // 曲：タイトルの曲を 96bpm に。A' のおしまいの小節（旋律が主音に着く）は、ドラムを止めてシンバルだけにし、その前の小節にドラムの締めを移す。
    //   _c は組み立てずみの曲なので写さない（写すと、もとのテンポ・ドラムのまま鳴る）
    tracks: `{ const T = JSON.parse(JSON.stringify({ ...TRACKS.title, _c: null })), put = (k, i, p) => { const d = T.drums; d[k] = d[k].slice(0, i) + p + d[k].slice(i + p.length); };
      T.bpm = 96; put('s', 416, '....x...x.x.xxxx' + '.'.repeat(16)); put('h', 432, '.'.repeat(16)); put('k', 432, 'x' + '.'.repeat(15)); put('c', 432, 'x'); TRACKS.promo = T; }`,
    music: [['promo', 0, 0.1], ['promo', 10, 50.1]],   // 前奏 4 小節（10 秒）→ 20 小節目（50 秒）からの A'
    xfade: 0.05,
    // 効果音は入れない（ユーザーの指定。戦闘の音が短い間に重なって、うるさかった）。曲だけだと小さいので、仕上げの持ち上げを大きくして -16 LUFS あたりにそろえる
    se: 0, gainDb: 11,
    // App Store 用（1920×886）に上下を切る位置（0＝上を残す・1＝下を残す）。会話は顔とウィンドウの文字、戦闘は下の仲間のカード
    crop: { w_run: 0.7, w_forest: 0.7, w_town: 0.7, w_tower: 0.7, w_cave: 0.6, w_demon: 0.6, w_mike: 0.45, w_kuro: 0.45, w_shiro: 0.45, w_tama: 0.4, w_boar: 0.7,
      w_bMoon: 1, w_bField: 1, w_bWave: 1, w_bBoom: 1, w_title: 0.6 },
  },
};
if (!PLANS[planArg]) { console.error('プラン:', Object.keys(PLANS).join(' ')); process.exit(1); }
const PLAN = PLANS[planArg], { edit: EDIT, captions: CAPTIONS } = PLAN;
const SUFFIX = planArg === 'tour' ? '' : '-' + planArg;
const X0 = PLAN.x0 ?? 210;   // 撮った画面の中の、ゲームの画面（1920×1080）の左はし

// 小節にあわせて、それぞれのコマ数を決める（おわりのない場面は、小節の区切りまで）
const cuts = []; let t = 0;
// 拍で切るプラン（bpm あり）：はじめのコマは、数か「目印±コマ」
const BEAT_F = PLAN.bpm ? 60 / PLAN.bpm * FPS : 0, beatAt = b => Math.round(b * BEAT_F);
const marks = {}, frameOf = (clip, s) => {
  if (typeof s === 'number') return s;
  const m = /^(.*?)([+-]\d+)?$/.exec(s), all = (marks[clip] ??= JSON.parse(readFileSync(join(CLIPS, clip, 'marks.json'), 'utf8')));
  if (all[m[1]] == null) throw new Error(`目印がない: ${clip} の ${m[1]}（あるのは ${Object.keys(all).join(' ')}）`);
  return all[m[1]] + (+m[2] || 0);
};
if (PLAN.bpm) for (const [clip, s0, beat] of EDIT) { const n = beatAt(beat) - t; cuts.push({ clip, s: frameOf(clip, s0), n, t0: t }); t += n; }
else for (const [clip, [s, e], bar = null] of EDIT) {
  let n;
  if (e != null) n = e - s;
  else n = at(bar) - t;
  cuts.push({ clip, s, n, t0: t }); t += n;
}
const TOTAL = t, DUR = TOTAL / FPS;
console.log(`全部で ${TOTAL} コマ（${DUR.toFixed(2)} 秒）`);
// 曲：動画の何秒から（場面の名前なら、その場面の頭から）・曲の何秒目から（'end' なら、tour の終わりと同じ所で終わるように）
const TOUR_END = BAR + 0.1 + 30;
const MUSIC = PLANS[planArg].music.map(([track, t0, ofs]) => {
  const a = typeof t0 === 'string' ? cuts.find(c => c.clip === t0).t0 / FPS : t0;
  return { track, a, ofs: ofs === 'end' ? TOUR_END - (DUR - a) : ofs };
});
MUSIC.forEach((m, i) => { m.b = MUSIC[i + 1]?.a ?? DUR; console.log(`  曲 ${m.track}：${m.a.toFixed(2)}〜${m.b.toFixed(2)} 秒（曲の ${m.ofs.toFixed(2)} 秒目から）`); });
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
    const SR = 48000, DUR = ${DUR}, MUSIC = ${JSON.stringify(MUSIC)}, events = ${JSON.stringify(events)}, X = ${PLAN.xfade ?? 0.5};
    ${PLAN.tracks || ''}
    // 曲ごとに先に書き出す（曲の頭は 0.1 秒から鳴る）
    const musics = [];
    for (const m of MUSIC) {
      const len = m.ofs + (m.b - m.a) + X + 1;
      const mctx = new OfflineAudioContext(2, Math.ceil(SR * len), SR);
      const mp = new MusicPlayer(mctx, mctx.destination, TRACKS[m.track]); mp.schedule(len);
      musics.push(await mctx.startRendering());
    }
    // ゲームと同じ通り道：bgm・se → master（2.5 倍）→ リミッター
    const ctx = new OfflineAudioContext(2, Math.ceil(SR * DUR), SR);
    const master = ctx.createGain(); master.gain.value = 2.5;
    const lim = ctx.createDynamicsCompressor();
    lim.threshold.value = -3; lim.knee.value = 0; lim.ratio.value = 20; lim.attack.value = 0.002; lim.release.value = 0.2;
    master.connect(lim); lim.connect(ctx.destination);
    const bgm = ctx.createGain(), se = ctx.createGain(); bgm.connect(master); se.connect(master);
    se.gain.value = ${PLAN.se ?? 1};   // 効果音の音量（プランの se。なければゲームと同じ 1）
    const v = 0.16 * Music.vol;
    // 曲の入れかわりは、前の曲の終わり X 秒と次の曲の頭を重ねる。最後の曲は 1.2 秒で消える
    MUSIC.forEach((m, i) => {
      const g = ctx.createGain(); g.connect(bgm); const G = g.gain, last = i === MUSIC.length - 1;
      const a = i ? m.a - X / 2 : 0, end = last ? DUR : m.b + X / 2;
      G.setValueAtTime(0, a); G.linearRampToValueAtTime(v, a + (i ? X : 0.04));
      if (last) { G.setValueAtTime(v, DUR - 1.2); G.linearRampToValueAtTime(0, DUR); }
      else { G.setValueAtTime(v, end - X); G.linearRampToValueAtTime(0, end); }
      const src = ctx.createBufferSource(); src.buffer = musics[i]; src.connect(g); src.start(a, Math.max(0, m.ofs - (m.a - a)), end - a + 0.01);
    });
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

// world の見出し：ゲームの画面の上のほうに、大きな太字（白に焦げ茶のふち、<b> は黄色）。音なしで流れても、小さな画面でも読めるように。
//   App Store 用は上下を切ったあとに重ねるので、高さ 886 と 1080 の 2 組を描く
const heads = { 886: [], 1080: [] };
if (PLAN.bpm && CAPTIONS.length) {
  const dir = join(OUT, 'captions'); rmSync(dir, { recursive: true, force: true }); mkdirSync(dir, { recursive: true });
  for (const H of [886, 1080]) await session(async api => {
    await api.send('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });
    await api.ev(`{ document.head.innerHTML = '<style>' + ${JSON.stringify(`
      html, body { margin: 0; background: transparent !important; overflow: hidden; width: 100vw; height: 100vh; }
      .cap { position: absolute; left: 0; right: 0; top: ${H === 886 ? 34 : 54}px; text-align: center; white-space: nowrap;
        font-family: "Hiragino Sans", "Hiragino Kaku Gothic ProN", sans-serif; font-weight: 800; font-size: 96px; letter-spacing: .03em; color: #fff;
        -webkit-text-stroke: 16px #4a2a1c; paint-order: stroke fill; filter: drop-shadow(0 8px 0 #4a2a1c) drop-shadow(0 10px 16px rgba(40, 16, 8, .55)); }
      .cap b { color: #ffd84a; font-weight: 800; } .cap small { font-size: 0.8em; }`)} + '</style>';
      document.body.innerHTML = '<div class="cap"></div>'; } true`);
    for (const [k, [b0, b1, html, o = {}]] of CAPTIONS.entries()) {
      // 文字の大きさ（size。なければ 96）から、横 1800 に収まるまで小さくする。top：上からの位置のずれ
      await api.ev(`{ const c = document.querySelector('.cap'); c.innerHTML = ${JSON.stringify(html)}; c.style.marginTop = '${o.top || 0}px';
        c.style.left = 'auto'; c.style.right = 'auto'; let fs = ${o.size || 96}; c.style.fontSize = fs + 'px';
        while (c.getBoundingClientRect().width > 1800 && fs > 40) c.style.fontSize = (fs -= 2) + 'px';
        c.style.left = (1920 - c.getBoundingClientRect().width) / 2 + 'px'; } true`);
      await api.run(0.1);
      const file = join(dir, `${H}-${k}.png`);
      const shot = await api.send('Page.captureScreenshot', { format: 'png' });
      writeFileSync(file, Buffer.from(shot.result.data, 'base64'));
      heads[H].push({ file, a: beatAt(b0) / FPS, b: beatAt(b1) / FPS });
    }
  }, { w: 1920, h: H, scale: 1 });
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
const AF = `volume=${PLAN.gainDb ?? 6.5}dB,alimiter=limit=0.85:level=false`;
const out = (vf, name) => {
  const { g, last } = overlay();
  ff([...input, '-filter_complex', `${g}[${last}]${vf}[vo];[1:a]${AF}[ao]`, '-map', '[vo]', '-map', '[ao]', ...enc, join(OUT, name + SUFFIX + (CAP ? '-captions' : '') + '.mp4')]);
};
// App Store：iPhone と同じ横長。crop があれば、ゲームの画面（撮った画面の左から 210 ピクセルの 1920×1080）を横いっぱいにして、
//   場面ごとの位置で 886 の高さに切る。なければ両はしの星の帯ごと 1920×886 に縮める
const CROP = PLANS[planArg].crop;
if (PLAN.bpm) {
  // world：ゲームの画面だけを撮った場面（1920×1080）。App Store 用は場面ごとの位置で上下を切ってから、見出しを重ねる。
  //   見出しは切りかわりと同時に、下から 0.2 秒ではね上がって出て、次の切りかわりの直前に消える
  const outW = (H, name) => {
    const hs = heads[H], yOf = c => Math.round((1080 - H) * (CROP[c.clip] ?? 0.5));
    const y = cuts.slice(1).reduceRight((e, c, i) => `if(lt(n\\,${c.t0})\\,${yOf(cuts[i])}\\,${e})`, String(yOf(cuts.at(-1))));
    let g = `[0:v]crop=1920:${H}:${X0}:'${y}',setsar=1[b];`, last = 'b';
    hs.forEach((c, k) => {
      g += `[${k + 2}:v]format=rgba,fade=t=in:st=${c.a.toFixed(3)}:d=0.1:alpha=1,fade=t=out:st=${(c.b - 0.1).toFixed(3)}:d=0.1:alpha=1[c${k}];`;
      g += `[${last}][c${k}]overlay=0:'if(lt(t\\,${(c.a + 0.2).toFixed(3)})\\,30*pow(1-(t-${c.a.toFixed(3)})/0.2\\,2)\\,0)':enable='between(t,${c.a.toFixed(3)},${c.b.toFixed(3)})'[v${k}];`;
      last = `v${k}`;
    });
    ff(['-framerate', String(FPS), '-i', join(SEQ, '%05d.jpg'), '-i', wav, ...hs.flatMap(c => ['-loop', '1', '-framerate', String(FPS), '-t', String(DUR), '-i', c.file]),
      '-filter_complex', `${g}[1:a]${AF}[ao]`, '-map', `[${last}]`, '-map', '[ao]', ...enc, join(OUT, name + SUFFIX + '.mp4')]);
  };
  outW(886, 'app-store-1920x886');
  outW(1080, 'google-play-1920x1080');
  console.log(`書き出した：${OUT}`);
  process.exit(0);
}
if (CROP) {
  const yOf = c => Math.round((1080 - 886) * (CROP[c.clip] ?? 0.5));
  const y = cuts.slice(1).reduceRight((e, c, i) => `if(lt(n\\,${c.t0})\\,${yOf(cuts[i])}\\,${e})`, String(yOf(cuts.at(-1))));
  out(`crop=1920:886:210:'${y}',setsar=1`, 'app-store-1920x886');
} else out('scale=1920:886:flags=lanczos,setsar=1', 'app-store-1920x886');
// Google Play：まん中の 16:9（1920×1080。撮った画面の左から 210 ピクセル）
out('crop=1920:1080:210:0,setsar=1', 'google-play-1920x1080');
console.log(`書き出した：${OUT}`);
