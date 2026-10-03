// 地形マップの検査：物語の目的地・会話の配役・戦闘の場所・住人・宝箱などが、歩いて行ける広い床の上にあるか
//   node tools/check-maps.js            すべての区画を検査
//   node tools/check-maps.js tower -v   区画の地図に地点を重ねて表示（-v）
'use strict';
const vm = require('vm'), fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '..');
const ctx = { clamp: (v, a, b) => Math.max(a, Math.min(b, v)), lerp: (a, b, t) => a + (b - a) * t, console, Math, document: { createElement: () => ({ getContext: () => ({}) }) }, localStorage: { getItem: () => null, setItem() {} }, location: { search: '' } };
ctx.window = ctx; vm.createContext(ctx);
for (const f of ['data.js', 'screens.js', 'field-terrain.js', 'field-zones.js', 'npcs.js', 'scenario.js', 'scenario2.js'])
  vm.runInContext(fs.readFileSync(path.join(root, 'js', f), 'utf8'), ctx, { filename: f });
const G = k => vm.runInContext(k, ctx);
const FIELD_ZONES = G('FIELD_ZONES'), CELL = G('CELL'), STORY = G('STORY'), SCENE_STAGES = G('SCENE_STAGES'), BATTLE_SETS = G('BATTLE_SETS'), Terrain = G('Terrain'), zonePoint = G('zonePoint'), TK = G('TK');

const args = process.argv.slice(2), only = args.find(a => !a.startsWith('-')), verbose = args.includes('-v');
let problems = 0;

// 区画ごとに調べる地点 [種類, x, z, 半径, 基準の高さの地点, ラベル]
const spots = {};
const add = (z, o) => (spots[z] = spots[z] || []).push(o);
const rot = (ox, oz, face, lx, lz) => { const th = face * Math.PI / 180, F = [Math.sin(th), -Math.cos(th)], R = [Math.cos(th), Math.sin(th)]; return [ox + R[0] * lx + F[0] * lz, oz + R[1] * lx + F[1] * lz]; };
for (const [id, Z] of Object.entries(FIELD_ZONES)) {
  add(id, { k: 'anchor', p: Z.anchor, r: 1.2 });
  if (Z.spawn) add(id, { k: 'spawn', p: Z.spawn, r: 0.6 });
  (Z.npcs || []).forEach(n => add(id, { k: 'npc ' + n.key, p: n.at, r: 0.5 }));
  (Z.notes || []).forEach(n => add(id, { k: 'note ' + n.title, p: n.at, r: 0.5 }));
  (Z.chestAt || []).forEach((p, i) => add(id, { k: 'chest' + i, p, r: 0.6 }));
  (Z.seals || []).forEach(S => { S.lamps.forEach((p, i) => add(id, { k: `lamp ${S.id}_${i}`, p, r: 0.6 })); add(id, { k: `wall ${S.id}`, p: [(S.wall[0] + S.wall[2]) / 2, (S.wall[1] + S.wall[3]) / 2], r: 0.3 }); });
  (Z.rubble || []).forEach(R => add(id, { k: 'rubble ' + R.id, p: R.at, r: 0.5 }));
  (Z.cushions || []).forEach((p, i) => add(id, { k: 'cushion' + i, p, r: 0.5 }));
  (Z.bounce || []).forEach((p, i) => add(id, { k: 'bounce' + i, p, r: 0.9 }));
  if (Z.bounceBack) add(id, { k: 'bounceBack', p: Z.bounceBack, r: 0.6 });
  (Z.stroke || []).forEach(P => { add(id, { k: 'stroke ' + P.id + ' start', p: P.start, r: 0.8 }); add(id, { k: 'stroke ' + P.id + ' goal', p: P.goal, r: 0.8 }); add(id, { k: 'stroke ' + P.id + ' gate', p: [(P.gate[0] + P.gate[2]) / 2, (P.gate[1] + P.gate[3]) / 2], r: 0.3 }); });
  if (Z.timeShift) Z.timeShift.crystals.forEach((p, i) => add(id, { k: 'crystal' + i, p: p.slice(0, 2), r: 0.8 }));
  if (Z.balls) { const P = Z.balls; [...P.balls, ...P.targets, ...P.blocks].forEach((p, i) => add(id, { k: 'ball ' + P.id + '_' + i, p, r: 0.9 })); add(id, { k: 'reset ' + P.id, p: P.reset, r: 0.5 }); }
  (Z.fluff || []).forEach((B, i) => { add(id, { k: 'fluff' + i, p: B.at, r: 0.9 }); add(id, { k: 'glide' + i, p: B.to, r: 0.6 }); });
  (Z.nemuri || []).forEach((N, i) => { add(id, { k: 'nemuri' + i, p: N.at, r: 0.2 }); add(id, { k: 'wake' + i, p: N.back, r: 0.6 }); });
  if (Z.sleepwalk) Z.sleepwalk.route.forEach((p, i) => add(id, { k: 'walk' + i, p, r: 0.5 }));
  (Z.seals || []).forEach(S => { if (S.beam) { add(id, { k: `beam ${S.id} from`, p: S.beam.from, r: 0.6 }); add(id, { k: `beam ${S.id} to`, p: S.beam.to, r: 0.4 }); S.beam.mirrors.forEach((m, i) => add(id, { k: `mirror ${S.id}_${i}`, p: m, r: 0.6 })); } });
  (Z.plates || []).forEach(P => { P.at.forEach((p, i) => add(id, { k: `pad ${P.id}_${i}`, p, r: 0.9 })); add(id, { k: `gate ${P.id}`, p: [(P.wall[0] + P.wall[2]) / 2, (P.wall[1] + P.wall[3]) / 2], r: 0.3 }); });
  (Z.guards || []).forEach(G => { G.route.forEach((p, i) => add(id, { k: `guard ${G.id}_${i}`, p, r: 0.6 })); add(id, { k: `back ${G.id}`, p: G.back, r: 0.6 }); });
  (Z.rollers || []).forEach((R, i) => { add(id, { k: 'rollA' + i, p: R.a, r: 0.9 }); add(id, { k: 'rollB' + i, p: R.b, r: 0.9 }); add(id, { k: 'bump' + i, p: R.back, r: 0.6 }); });
  (Z.arenas || []).forEach((a, i) => { const [x, z] = zonePoint(Z, [a[0], a[1]]); add(id, { k: 'arena' + i, p: [x, z], area: a[2] || 0 }); });
}
STORY.forEach(ch => ch.steps.forEach(st => {
  if (st.t !== 'field') return;
  add(st.zone, { k: 'quest ' + (st.scene || st.battle || ''), p: zonePoint(FIELD_ZONES[st.zone], st.at), r: 1.0 });
  if (st.start) add(st.start[0], { k: 'start', p: zonePoint(FIELD_ZONES[st.start[0]], [st.start[1], st.start[2]]), r: 0.6 });
}));
for (const [id, s] of Object.entries(SCENE_STAGES)) {
  const Z = FIELD_ZONES[s.zone], [ox, oz] = zonePoint(Z, s.at), pts = [[0, 0], [-1.15, 0.3], [1.15, 0.35], [-2.2, -0.35], [2.3, -0.4], [0, 2.6]];
  for (const v of Object.values(s.cast || {})) (Array.isArray(v) ? v : [v]).forEach(o => { if (o && o.at && !o.y) pts.push(o.at); });
  pts.forEach(([lx, lz], i) => add(s.zone, { k: `scene ${id}#${i}`, p: rot(ox, oz, s.face, lx, lz), r: 0.45, ref: [ox, oz] }));
}
for (const [k, b] of Object.entries(BATTLE_SETS)) { const [x, z] = zonePoint(FIELD_ZONES[b.zone], b.at); add(b.zone, { k: 'battle ' + k, p: [x, z], area: b.face }); }

for (const [id, Z] of Object.entries(FIELD_ZONES)) {
  if (only && id !== only) continue;
  const bad = [];
  // 出入口の行き先が、向こうからもつながっているか
  for (const e of Z.exits) { const B = FIELD_ZONES[e.to]; if (!B) bad.push(`exit to unknown ${e.to}`); else if (!B.exits.some(x => x.to === id)) bad.push(`exit ${e.to} has no way back`); }
  if (!Z.map) { if (bad.length) { console.log(`== ${id}`); bad.forEach(b => console.log('  ' + b)); problems += bad.length; } continue; }
  const T = new Terrain(Z);
  if (Z.w !== T.cols * 2 || Z.d !== T.rows * 2) bad.push(`size ${Z.w}x${Z.d} != map ${T.cols * 2}x${T.rows * 2}`);
  T.computeReach(Z.anchor[0], Z.anchor[1]);
  if (Z.map.some(r => r.length !== T.cols)) bad.push('rows have different lengths');
  const ok = (x, z, r, h0) => { const i = T.at(x, z); return i >= 0 && T.reach[i] && T.fits(x, z, r, h0 ?? T.groundAt(x, z)); };
  const mark = {};
  for (const s of spots[id] || []) {
    const [x, z] = s.p;
    mark[T.at(x, z)] = s.k[0].toUpperCase();
    if (s.area != null) {
      // 戦場：味方（手前 2.6m）から敵（奥 6m）まで、左右 5m が平らな床
      const h0 = T.groundAt(x, z); let miss = 0;
      for (let lx = -5; lx <= 5; lx += 1) for (let lz = -3.5; lz <= 6; lz += 1) { const [px, pz] = rot(x, z, s.area, lx, lz), i = T.at(px, pz); if (i < 0 || !T.isWalkKind(T.kind[i]) || Math.abs(T.groundAt(px, pz) - h0) > 0.7) miss++; }
      if (!ok(x, z, 0.5)) bad.push(`${s.k} at ${x.toFixed(1)},${z.toFixed(1)} not reachable`);
      else if (miss > 6) bad.push(`${s.k} at ${x.toFixed(1)},${z.toFixed(1)} too cramped (${miss} bad cells)`);
      continue;
    }
    const h0 = s.ref ? T.groundAt(s.ref[0], s.ref[1]) : undefined;
    if (!ok(x, z, s.r, h0)) bad.push(`${s.k} at ${x.toFixed(1)},${z.toFixed(1)} blocked`);
  }
  for (const e of Z.exits) { const E = T.exits[e.key]; if (!E) bad.push(`exit key ${e.key} missing in map`); else if (!E.cells.some(i => T.reach[i])) bad.push(`exit ${e.key} (${e.to}) unreachable`); }
  for (const key of Object.keys(T.exits)) if (!Z.exits.some(e => e.key === key)) bad.push(`map exit ${key} not in exits`);
  // 光の鏡：どこかの向きの組み合わせで光が届くか（解けるか）。最初の向きのままでは届かないか
  for (const S of Z.seals || []) {
    if (!S.beam) continue;
    // 同じ色の鏡はいっしょに回るので、色ごとの向きの組み合わせを数える
    const B = S.beam, trace = G('traceBeam'), st = G('beamStates'), n = (B.init || [0]).length; let sols = 0;
    for (let m = 0; m < 1 << n; m++) if (trace(T, B, st(B, [...Array(n)].map((_, g) => (m >> g) & 1))).hit) sols++;
    if (!sols) bad.push(`beam ${S.id} has no solution`);
    if (trace(T, B, st(B, B.init || [0])).hit) bad.push(`beam ${S.id} is already solved at start`);
    if (verbose) console.log(`   beam ${S.id}: ${sols} solution state(s) of ${1 << n}`);
  }
  // 大玉ころがし：解けるか（最短の押す回数）。最初の置き方のままでは、そろっていないか
  if (Z.balls) {
    const P = Z.balls, roll = G('rollBall'), n = solveBalls(T, P, roll);
    if (n < 0) bad.push(`balls ${P.id} has no solution`);
    if (n === 0) bad.push(`balls ${P.id} is already solved at start`);
    if (verbose) console.log(`   balls ${P.id}: solved in ${n} push(es)`);
  }
  // つながりの石畳：始まりの石から終わりの石まで、すべての石を一度ずつ通る道があるか（道の数は -v で表示）。石は床の上で、同じ高さか
  for (const P of Z.stroke || []) {
    const n = strokePaths(T, P);
    if (!n) bad.push(`stroke ${P.id} has no solution`);
    if (verbose) console.log(`   stroke ${P.id}: ${n} solution(s)`);
  }
  // 時の水晶：入口（anchor）から、今の姿で歩きはじめて、物語の目的地・宝箱・出入口へ行けるか。目的地までの切りかえの回数は -v で表示
  if (Z.timeShift) {
    const r = timeReach(T, Z);
    // 入口へ戻れない状態（閉じこめ）は、遊ぶときは入口の間へもどされるので許す。目的地と出口からは、戻れること
    if (verbose) console.log(`   time: ${r.stuck} trapped state(s)（入口の間へもどされる）`);
    (Z.timeShift.ghosts || []).forEach(([x, z, , lines], i) => { if (lines && !r.past(x, z)) bad.push(`time: ghost${i} cannot be met in the past`); });
    for (const st of STORY.flatMap(c => c.steps).filter(st => st.t === 'field' && st.zone === id)) { const [x, z] = zonePoint(Z, st.at), n = r(x, z); if (n < 0) bad.push(`time: quest ${st.scene} unreachable`); else { if (!r.back(x, z)) bad.push(`time: quest ${st.scene} cannot get back to the entrance`); if (verbose) console.log(`   time: quest ${st.scene} needs ${n} switch(es)`); } }
    (Z.chestAt || []).forEach((p, i) => { if (r(p[0], p[1]) < 0) bad.push(`time: chest${i} unreachable`); });
    for (const e of Z.exits) { const E = T.exits[e.key]; if (!E) continue; const xs = E.cells.map(i => [T.cx(T.colOf(i)), T.cz(T.rowOf(i))]); if (!xs.some(([x, z]) => r(x, z) >= 0)) bad.push(`time: exit ${e.key} unreachable`); else if (!xs.some(([x, z]) => r.back(x, z))) bad.push(`time: exit ${e.key} cannot get back to the entrance`); }
  }
  // 階段が急すぎないか（歩くときは、体のまわりの段差が STEP 以内でないと進めない。半径 0.4m で 0.6m まで）
  const steep = new Set();
  for (const [i, s] of T.stairs) if (Math.abs(s.h1 - s.h0) / s.len > 1.25) steep.add(`${T.colOf(i)},${T.rowOf(i)} (${s.h0}→${s.h1}m / ${s.len}m)`);
  steep.forEach(k => bad.push(`stairs too steep at cell ${k}`));
  const walk = T.kind.filter((k, i) => T.isWalkKind(k)).length, reach = T.reach.reduce((a, v) => a + v, 0);
  if (reach < walk) bad.push(`${walk - reach} walkable cells unreachable from anchor`);
  if (bad.length || verbose) { console.log(`== ${id} (${T.cols}x${T.rows})`); bad.forEach(b => console.log('  ' + b)); problems += bad.length; }
  if (verbose) {
    for (let r = 0; r < T.rows; r++) {
      let line = '';
      for (let c = 0; c < T.cols; c++) { const i = T.idx(c, r); line += mark[i] || (T.isWalkKind(T.kind[i]) && !T.reach[i] ? '?' : Z.map[r][c]); }
      console.log(String(r).padStart(3) + ' ' + line);
    }
    for (const s of spots[id] || []) console.log(`   ${s.k[0].toUpperCase()} ${s.k} [${s.p.map(v => v.toFixed(1))}] cell ${Math.floor((s.p[0] + T.hw) / 2)},${Math.floor((s.p[1] + T.hd) / 2)}`);
  }
}
// つながりの石畳の道の数（すべての石を一度ずつ、始まりの石から終わりの石まで）
function strokePaths(T, P) {
  const near = (q, x, z) => q && Math.abs(q[0] - x) < 0.5 && Math.abs(q[1] - z) < 0.5, cells = [];
  for (let z = P.area[1]; z <= P.area[3] + 0.01; z += CELL) for (let x = P.area[0]; x <= P.area[2] + 0.01; x += CELL) if (!(P.holes || []).some(q => near(q, x, z))) cells.push([x, z]);
  const h0 = T.groundAt(...P.start); if (cells.some(([x, z]) => { const i = T.at(x, z); return i < 0 || !T.isWalkKind(T.kind[i]) || Math.abs(T.groundAt(x, z) - h0) > 0.1; })) return 0;
  const key = (x, z) => x + ',' + z, seen = new Set([key(...P.start)]); let n = 0;
  const dfs = (x, z) => {
    if (seen.size === cells.length) { if (near(P.goal, x, z)) n++; return; }
    if (near(P.goal, x, z)) return;
    for (const [dx, dz] of [[0, -CELL], [CELL, 0], [0, CELL], [-CELL, 0]]) { const nx = x + dx, nz = z + dz, k = key(nx, nz); if (seen.has(k) || !cells.some(c => near(c, nx, nz))) continue; seen.add(k); dfs(nx, nz); seen.delete(k); }
  };
  dfs(...P.start);
  return n;
}
// 時の水晶：入口から、今の姿で歩きはじめて、そのマスまで最小で何回切りかえるか（行けなければ -1）。R は今、A は昔に通れない
// 水晶の向き（[x, z, 'P'] は昔へだけ、'N' は今へだけ、ほかはどちらへも）。stuck：たどりつける状態のうち、入口（今）へ戻れないものの数
function timeReach(T, Z) {
  const S = Z.timeShift, n = T.kind.length, crys = new Map(S.crystals.map(([x, z, k]) => [T.at(x, z), k || 'W']));
  const ok = (i, p) => i >= 0 && T.isWalkKind(T.kind[i]) && !(p ? T.ch[i] === 'A' : T.ch[i] === 'R');
  const flip = (i, p) => { const k = crys.get(i); return k != null && (k === 'W' || (k === 'P' && !p) || (k === 'N' && p)); };
  const steps = (i, p) => {
    const c = T.colOf(i), r = T.rowOf(i), out = [];
    for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const j = T.idx(c + dc, r + dr); if (ok(j, p) && Math.abs(T.groundAt(T.cx(c + dc), T.cz(r + dr)) - T.groundAt(T.cx(c), T.cz(r))) <= 0.7) out.push(j); }
    return out;
  };
  const dist = [new Int32Array(n).fill(-1), new Int32Array(n).fill(-1)], s = T.at(Z.anchor[0], Z.anchor[1]), dq = [[s, 0]]; dist[0][s] = 0;
  while (dq.length) {
    const [i, p] = dq.shift(), d = dist[p][i];
    if (flip(i, p) && (dist[1 - p][i] < 0 || dist[1 - p][i] > d + 1)) { dist[1 - p][i] = d + 1; dq.push([i, 1 - p]); }
    for (const j of steps(i, p)) if (dist[p][j] < 0 || dist[p][j] > d) { dist[p][j] = d; dq.unshift([j, p]); }
  }
  // 逆向きに、入口（今）へ戻れる状態をさがす（歩くのは行き来できる。水晶の切りかえだけ逆にたどる）
  const back = [new Uint8Array(n), new Uint8Array(n)], st = [[s, 0]]; back[0][s] = 1;
  while (st.length) {
    const [i, p] = st.pop();
    for (const j of steps(i, p)) if (!back[p][j]) { back[p][j] = 1; st.push([j, p]); }
    if (flip(i, 1 - p) && !back[1 - p][i]) { back[1 - p][i] = 1; st.push([i, 1 - p]); }
  }
  let stuck = 0; for (let i = 0; i < n; i++) for (const p of [0, 1]) if (dist[p][i] >= 0 && !back[p][i]) stuck++;
  const f = (x, z) => { const i = T.at(x, z), a = dist[0][i], b = dist[1][i]; return a < 0 ? b : b < 0 ? a : Math.min(a, b); };
  f.stuck = stuck;
  // そのマスに、入口へ戻れる姿（今か昔）で立てるか
  // 昔の姿で、閉じこめられずに立てるか（昔の猫と話せるか）
  f.past = (x, z) => { const i = T.at(x, z); return dist[1][i] >= 0 && !!back[1][i]; };
  f.back = (x, z) => { const i = T.at(x, z); return [0, 1].some(p => dist[p][i] >= 0 && back[p][i]); };
  return f;
}
// 大玉ころがしを、押す回数の少ない順に調べる（プレイヤーは、大玉と台のないマスを歩いて、押す側に回りこめるか）
function solveBalls(T, P, roll) {
  const on = (list, x, z) => list.some(q => Math.abs(q[0] - x) < 0.5 && Math.abs(q[1] - z) < 0.5);
  const key = pos => pos.map(p => p.join(',')).sort().join('|'), done = pos => P.targets.every(t => on(pos, t[0], t[1]));
  const start = P.balls.map(p => p.slice()), seen = new Set([key(start)]), q = [[start, 0]];
  for (let qi = 0; qi < q.length && qi < 200000; qi++) {
    const [pos, n] = q[qi];
    if (done(pos)) return n;
    // リングのベルから歩いて行けるマス
    const reach = new Uint8Array(T.kind.length), st = [T.at(P.reset[0], P.reset[1])]; reach[st[0]] = 1;
    const free = i => T.isWalkKind(T.kind[i]) && !on(pos, T.cx(T.colOf(i)), T.cz(T.rowOf(i))) && !on(P.blocks, T.cx(T.colOf(i)), T.cz(T.rowOf(i)));
    while (st.length) { const i = st.pop(); for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) { const j = T.idx(T.colOf(i) + dc, T.rowOf(i) + dr); if (j >= 0 && !reach[j] && free(j) && Math.abs(T.h[j] - T.h[i]) < 0.6) { reach[j] = 1; st.push(j); } } }
    pos.forEach(([x, z], k) => { for (const [dx, dz] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
      if (!reach[T.at(x - dx * CELL, z - dz * CELL)]) continue;
      const to = roll(P, pos, k, dx, dz); if (to[0] === x && to[1] === z) continue;
      const np = pos.map(p => p.slice()); np[k] = to; const kk = key(np); if (seen.has(kk)) continue; seen.add(kk); q.push([np, n + 1]);
    } });
  }
  return -1;
}
console.log(problems ? `${problems} problem(s)` : 'all maps ok');
process.exitCode = problems ? 1 : 0;
