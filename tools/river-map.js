// 川（zone.river）に合わせて、区画の地図の岸を作る小さな道具
//   node tools/river-map.js <区画> '<path の JSON>' '<橋の列の JSON>' [r] [depth] [lv]
//   例：node tools/river-map.js forest_in '[[-36,0,3],[0,1.4,2.6],[36,-0.8,3]]' '[14,15,26,27]'
//   南北に流れる川の橋は、橋の行で渡す：'{"rows":[9,10,11]}'。いくつかの線（zone.river.paths）は、path の JSON を線の配列にする
// 川のくぼみが 0.16m より深くかかるマスを、木立（#）・旧の川（~）なら床（0）に、橋の列なら橋（=）にする。
// 木立と床の境目は、くぼみが 0.16m 以下になる（それより深いと、境目に土の崖の黒い帯が出る）。
// 変わる行を「旧の行・新しい行・水の様子（~ 水、- 水ぎわ）」で並べ、最後に新しい地図を JSON で出す。
// 新しい行は、そのまま区画の map に貼る。地図の外へ出る川の両はしは、path を地図の外までのばす。
// --walls：木立（#）は床にせず、そのまま崖として残す（谷川のように、崖のきわを流れる川。岸の細い道ができない）。
//   旧の川（~）は、水が 1/4 より多くかかるか、旧の床ととなり合えば床、そうでなければ木立にする（崖のあいだに、乾いた岸を残さない）
'use strict';
const fs = require('fs'), path = require('path');
const src = fs.readFileSync(path.join(__dirname, '../js/field-terrain.js'), 'utf8');
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
// ゲームと同じ曲線・近さの計算を、field-terrain.js から取り出して使う
const grab = name => {
  const i = src.indexOf('function ' + name + '(');
  let d = 0, k = src.indexOf('{', i);
  for (; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}' && --d === 0) break; }
  return src.slice(i, k + 1);
};
const { riverLine, lineNear } = new Function('clamp', grab('riverLine') + grab('lineNear') + 'return { riverLine, lineNear };')(clamp);

const walls = process.argv.includes('--walls'), [zone, pathJ, bcJ = '[]', R = 3, depth = 1.5, lv = 0.45] = process.argv.slice(2).filter(a => a !== '--walls');
if (!zone || !pathJ) { console.log('使い方：node tools/river-map.js <区画> \'<path の JSON>\' \'<橋の列の JSON>\' [r] [depth] [lv]'); process.exit(1); }
const zsrc = fs.readFileSync(path.join(__dirname, '../js/field-zones.js'), 'utf8');
const zi = zsrc.indexOf('\n  ' + zone + ': {'), mi = zsrc.indexOf('map: [', zi), me = zsrc.indexOf('],', mi);
if (zi < 0 || mi < 0) { console.log('区画が見つからない：' + zone); process.exit(1); }
const rows = [...zsrc.slice(mi, me).matchAll(/'([^']*)'/g)].map(m => m[1].split(''));
const C = 2, W = rows[0].length, H = rows.length, hw = W * C / 2, hd = H * C / 2;
const PJ = JSON.parse(pathJ), Ls = (Array.isArray(PJ[0][0]) ? PJ : [PJ]).map(P => riverLine(P.map(p => [p[0], p[1], p[2] ?? +R]))), BJ = JSON.parse(bcJ), byRow = !Array.isArray(BJ), bridgeSet = new Set(byRow ? BJ.rows : BJ);
const isBridge = (r, c) => bridgeSet.has(byRow ? r : c);
const dep = (x, z) => Math.max(...Ls.map(L => { const [s, r] = lineNear(L, x, z); if (s >= r) return 0; const u = 1 - (s / r) ** 2; return depth * u * u; }));

const out = rows.map(r => r.slice());
for (let r = 0; r < H; r++) for (let c = 0; c < W; c++) {
  const x0 = c * C - hw, z0 = r * C - hd;
  let edge = 0;   // マスのふちでの、いちばん深いくぼみ（--walls では、マスの中も）
  for (let a = 0; a <= 8; a++) for (let b = 0; b <= 8; b++) if (walls || a === 0 || b === 0 || a === 8 || b === 8) edge = Math.max(edge, dep(x0 + a / 4, z0 + b / 4));
  const ch = rows[r][c];
  let need = edge > 0.16;
  if (walls && ch === '#') continue;
  if (walls && ch === '~') {
    let w = 0; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (dep(x0 + 0.25 + a * 0.5, z0 + 0.25 + b * 0.5) > lv) w++;
    const nearFloor = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dc, dr]) => { const q = rows[r + dr] && rows[r + dr][c + dc]; return q && q !== '#' && q !== '~'; });
    need = w > 4 || nearFloor;
  }
  if (isBridge(r, c) && (need || ch === '=' || ch === '~')) out[r][c] = need ? '=' : ',';
  else if (need && (ch === '#' || ch === '~')) out[r][c] = '0';
  else if (!need && ch === '~') out[r][c] = '#';
}
// 橋は、となり合う橋の列（行）でそろえる（片方の列だけ長い橋にしない）
for (let k = 0; k < (byRow ? W : H); k++) for (let pass = 0; pass < 2; pass++) for (const b of bridgeSet) {
  const [r, c] = byRow ? [b, k] : [k, b];
  if (out[r][c] === '=') for (const d of [-1, 1]) if (bridgeSet.has(b + d)) { if (byRow) out[r + d][c] = '='; else out[r][c + d] = '='; }
}
for (let r = 0; r < H; r++) {
  let vis = '';
  for (let c = 0; c < W; c++) {
    let w = 0;
    for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (dep(c * C - hw + 0.25 + a * 0.5, r * C - hd + 0.25 + b * 0.5) > lv) w++;
    vis += w >= 8 ? '~' : w > 0 ? '-' : out[r][c];
  }
  if (out[r].join('') !== rows[r].join('') || /[~-]/.test(vis)) console.log(String(r).padStart(2), rows[r].join(''), out[r].join(''), vis);
}
console.log(JSON.stringify(out.map(r => r.join(''))));
