// 台本（Markdown の表）のナレーションを VOICEVOX で読み上げ、台本の時間どおりに並べる。
//   node tools/promo/voice.mjs <台本.md> <出力のフォルダ> [話者の番号（ずんだもん ノーマル＝3）] [--tight]
// --tight：場面の時間をナレーションに合わせて詰める（前の場面の終わりから始め、最後の行の 0.7 秒あとで終わる。
//   場面と場面のあいだの無音がおよそ 1 秒になる）。台本の見出しの時間も書きかえる
// 先に VOICEVOX を起動しておく（エンジンは http://127.0.0.1:50021）。
// 台本の「## 3. 作業1：…（1:10〜2:45）」の見出しで場面の時間を、表の 2 列目（ナレーション）で読む文を取る。
// 台本と同じフォルダに readings.json（{"文": "読ませたい書き方"}）があれば、読み上げのときだけ置きかえる。
// 出力：行ごとの NN-MM.wav、台本の時間どおりにならべた narration.wav、字幕の narration.srt、一覧の lines.tsv
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';

const ENGINE = 'http://127.0.0.1:50021';
const GAP = 0.5;            // 行と行のあいだ（秒）
const LEAD = 0.3;           // 場面の頭から読みはじめるまで（秒）

const argv = process.argv.slice(2), TIGHT = argv.includes('--tight');
const [src, out, speakerArg] = argv.filter(a => !a.startsWith('--'));
if (!src || !out) { console.error('使い方: node tools/promo/voice.mjs <台本.md> <出力のフォルダ> [話者の番号]'); process.exit(1); }
const speaker = Number(speakerArg ?? 3);
const readingsFile = join(dirname(src), 'readings.json');
const readings = existsSync(readingsFile) ? JSON.parse(readFileSync(readingsFile, 'utf8')) : {};
mkdirSync(out, { recursive: true });

// 台本を読む：場面（時間）と、その中のナレーションの行
const sec = s => { const [m, x] = s.split(':').map(Number); return m * 60 + x; };
const scenes = [];
for (const line of readFileSync(src, 'utf8').split('## 用意するもの')[0].split('\n')) {
  const h = line.match(/^## (\d+)\.\s*(.*?)（(\d+:\d+)〜(\d+:\d+)）/);
  if (h) { scenes.push({ no: +h[1], title: h[2], start: sec(h[3]), end: sec(h[4]), lines: [] }); continue; }
  if (!line.startsWith('|') || line.startsWith('|---') || !scenes.length) continue;
  const cols = line.slice(1, -1).split('|').map(c => c.trim());
  if (cols.length !== 3 || cols[1] === 'ナレーション') continue;
  const text = cols[1].replace(/【[^】]*】/g, '').trim();
  if (text && !text.startsWith('（')) scenes.at(-1).lines.push(text);
}

const post = async (path, body) => {
  const r = await fetch(ENGINE + path, { method: 'POST', headers: body ? { 'Content-Type': 'application/json' } : {}, body });
  if (!r.ok) throw new Error(`${path}: ${r.status} ${await r.text()}`);
  return r;
};

// WAV（16bit・モノラル）を読み書きする
const readPcm = buf => {
  let p = 12, rate = 24000;
  while (p < buf.length) {
    const id = buf.toString('ascii', p, p + 4), size = buf.readUInt32LE(p + 4);
    if (id === 'fmt ') rate = buf.readUInt32LE(p + 12);
    if (id === 'data') return { rate, pcm: new Int16Array(buf.buffer.slice(buf.byteOffset + p + 8, buf.byteOffset + p + 8 + size)) };
    p += 8 + size + (size & 1);
  }
  throw new Error('WAV の data がない');
};
const writeWav = (file, pcm, rate) => {
  const h = Buffer.alloc(44);
  h.write('RIFF', 0); h.writeUInt32LE(36 + pcm.byteLength, 4); h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(rate, 24);
  h.writeUInt32LE(rate * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write('data', 36); h.writeUInt32LE(pcm.byteLength, 40);
  writeFileSync(file, Buffer.concat([h, Buffer.from(pcm.buffer, pcm.byteOffset, pcm.byteLength)]));
};
const srtTime = t => { const ms = Math.round(t * 1000); const p = (n, w = 2) => String(n).padStart(w, '0');
  return `${p(Math.floor(ms / 3600000))}:${p(Math.floor(ms / 60000) % 60)}:${p(Math.floor(ms / 1000) % 60)},${p(ms % 1000, 3)}`; };

let rate = 24000;
const placed = [];
let prevEnd = 0;
for (const s of scenes) {
  if (TIGHT) s.start = prevEnd;
  let t = s.start + LEAD;
  for (const [i, text] of s.lines.entries()) {
    let say = text;
    for (const [a, b] of Object.entries(readings)) say = say.split(a).join(b);
    const q = await (await post(`/audio_query?speaker=${speaker}&text=${encodeURIComponent(say)}`)).json();
    q.prePhonemeLength = 0.05; q.postPhonemeLength = 0.05;
    const wav = Buffer.from(await (await post(`/synthesis?speaker=${speaker}`, JSON.stringify(q))).arrayBuffer());
    const name = `${String(s.no).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}.wav`;
    writeFileSync(join(out, name), wav);
    const { rate: r, pcm } = readPcm(wav); rate = r;
    const dur = pcm.length / r;
    placed.push({ name, scene: s, text, start: t, dur, pcm });
    t += dur + GAP;
  }
  if (TIGHT) s.end = s === scenes.at(-1) ? Math.max(Math.round(t - GAP + 3), s.start + 6) : Math.round(t - GAP + 0.7);
  prevEnd = s.end;
  const over = t - GAP - s.end;
  console.log(`${s.no}. ${s.title}：読み ${(t - GAP - s.start).toFixed(1)} 秒／枠 ${s.end - s.start} 秒` + (over > 0 ? `　← ${over.toFixed(1)} 秒はみ出す` : ''));
}

// 台本の時間どおりにならべた 1 本（場面の頭から読みはじめる。はみ出した行は次の場面と重なる）
const total = Math.max(scenes.at(-1).end, ...placed.map(p => p.start + p.dur)) + 1;
const mix = new Int16Array(Math.ceil(total * rate));
for (const p of placed) {
  const o = Math.round(p.start * rate);
  for (let k = 0; k < p.pcm.length; k++) mix[o + k] = Math.max(-32768, Math.min(32767, mix[o + k] + p.pcm[k]));
}
writeWav(join(out, 'narration.wav'), mix, rate);
// 詰めたときは、台本の見出しの時間を書きかえる
if (TIGHT) {
  const mmss = x => `${Math.floor(x / 60)}:${String(x % 60).padStart(2, '0')}`;
  let md = readFileSync(src, 'utf8');
  for (const s of scenes) md = md.replace(new RegExp(`^(## ${s.no}\\.\\s*.*?)（\\d+:\\d+〜\\d+:\\d+）`, 'm'), `$1（${mmss(s.start)}〜${mmss(s.end)}）`);
  writeFileSync(src, md);
}
writeFileSync(join(out, 'narration.srt'), placed.map((p, i) => `${i + 1}\n${srtTime(p.start)} --> ${srtTime(p.start + p.dur)}\n${p.text}\n`).join('\n'));
writeFileSync(join(out, 'lines.tsv'), 'file\tscene\tstart\tdur\ttext\n' + placed.map(p => `${p.name}\t${p.scene.no}\t${p.start.toFixed(2)}\t${p.dur.toFixed(2)}\t${p.text}`).join('\n') + '\n');
console.log(`${placed.length} 行・ナレーション ${placed.reduce((a, p) => a + p.dur, 0).toFixed(0)} 秒・全体 ${total.toFixed(0)} 秒 → ${out}`);
