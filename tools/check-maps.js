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
  // 樹の地下の光る実：実を運んで置き、根の扉をすべて開いて、下の階の出口まで行けるか。行ける場所は、たどった状態のどれかで行けるマス
  if (Z.roots) {
    const r = solveRoots(T, Z, bad);
    if (r.n < 0) bad.push('roots: no solution');
    else if (r.n === 0) bad.push('roots: already solved at start');
    T.reach = r.reach;
    if (verbose) { console.log(`   roots: solved in ${r.n} move(s)（実を持つ・置く）, ${r.states} state(s)`); r.path.forEach(s => console.log('     ' + s)); }
  }
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
    // 基準の地点と同じ高さの床か（床のくぼみ zone.dents の分は除いて比べる）
    const h0 = s.ref ? T.groundAt(s.ref[0], s.ref[1]) - T.dentAt(s.ref[0], s.ref[1]) + T.dentAt(x, z) : undefined;
    if (!ok(x, z, s.r, h0)) bad.push(`${s.k} at ${x.toFixed(1)},${z.toFixed(1)} blocked`);
  }
  for (const e of Z.exits) { const E = T.exits[e.key]; if (!E) bad.push(`exit key ${e.key} missing in map`); else if (!E.cells.some(i => T.reach[i])) bad.push(`exit ${e.key} (${e.to}) unreachable`); }
  for (const key of Object.keys(T.exits)) if (!Z.exits.some(e => e.key === key)) bad.push(`map exit ${key} not in exits`);
  // 影の回廊：自分と影を、同時にそれぞれの光の輪へ入れられるか（いちばん少ない歩数。0.5m ずつ）
  for (const S of Z.shadows || []) {
    const r = solveShadow(T, S);
    if (r.err) bad.push(`shadow ${S.id}: ${r.err}`);
    else if (r.n < 0) bad.push(`shadow ${S.id} has no solution`);
    if (verbose && !r.err) console.log(`   shadow ${S.id}: ${r.n} step(s) of 0.5m, ${r.states} state(s)  ${r.route || ''}`);
    if (r.direct && !S.teach) bad.push(`shadow ${S.id} is solved just by walking to the goal（影が鏡の位置のまま着く）`);
  }
  // 影の部屋（影の動く範囲）は、行ける場所として数える（同じ部屋なら、もともと行ける）
  for (const S of Z.shadows || []) {
    const both = S.mirror === 'xz', tf = (x, z) => [2 * S.at[0] - x, both ? 2 * S.at[1] - z : z], [a0, b0] = tf(S.area[0], S.area[1]), [a1, b1] = tf(S.area[2], S.area[3]);
    for (let x = Math.min(a0, a1); x <= Math.max(a0, a1) + 0.01; x += CELL) for (let z = Math.min(b0, b1); z <= Math.max(b0, b1) + 0.01; z += CELL) { const i = T.at(x, z); if (i >= 0 && T.isWalkKind(T.kind[i])) T.reach[i] = 1; }
  }
  // 年輪の間：年輪を回して、心臓の間（いちばん内側）まで行けるか（いちばん少ない回す回数）。最初から開いていないか
  if (Z.rings) {
    const r = solveRings(Z.rings);
    if (r.n < 0) bad.push(`rings ${Z.rings.id} has no solution`);
    else if (r.n === 0) bad.push(`rings ${Z.rings.id} is already open at start`);
    if (verbose) console.log(`   rings ${Z.rings.id}: ${r.n} turn(s), ${r.states} state(s)  ${(r.path || []).join(' ')}`);
  }
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
// 樹の地下の光る実（zone.roots）を、実を持つ・置く回数の少ない順に調べる。実は一つずつしか持てず、ゆりかごにだけ置ける。はじめは灰色で、一度持つと光る。
//   歩くときは、持っている実はプレイヤーといっしょに動く：となりのマスへの一歩は、境目と行き先のマスの中心の両方で、根の状態が通れること。
//   根の扉（knots）は、ゆりかごすべてに光る実がそろうと開いたまま。出口（下の階への階段）まで行ければ解けた
function solveRoots(T, Z, bad) {
  const R = Z.roots, live = G('rootsLive'), cellsOf = G('rectCells'), STEP = G('STEP'), n = T.kind.length;
  const bOf = new Int16Array(n).fill(-1), tOf = new Int16Array(n).fill(-1), kOf = new Int16Array(n).fill(-1);
  R.bridges.forEach((b, k) => cellsOf(T, b.cells).forEach(i => { if (!T.rootBridge[i]) bad.push(`roots: bridge ${b.id} cell ${T.colOf(i)},${T.rowOf(i)} is not %`); bOf[i] = k; }));
  R.thickets.forEach((t, k) => cellsOf(T, t.cells).forEach(i => { tOf[i] = k; }));
  R.knots.forEach((o, k) => cellsOf(T, o.cells).forEach(i => { kOf[i] = k; }));
  for (let i = 0; i < n; i++) if (T.rootBridge[i]) { if (bOf[i] < 0) bad.push(`roots: % at ${T.colOf(i)},${T.rowOf(i)} belongs to no bridge`); T.setRootBridge(i, true); }
  // ゆりかごと根元の距離が、輪の半径に近すぎないか（遊ぶときに、ゆりかごの実が根元に届くかが見た目とずれる）
  const nodes = [...R.bridges.flatMap(b => b.nodes), ...R.thickets.map(t => t.node)];
  R.cradles.forEach((c, k) => nodes.forEach(nd => { const d = Math.hypot(c[0] - nd[0], c[1] - nd[1]); if (Math.abs(d - R.r) < 0.5) bad.push(`roots: cradle${k} is ${d.toFixed(2)}m from node ${nd}（輪の半径 ${R.r}m に近い）`); }));
  const cpt = i => [T.cx(T.colOf(i)), T.cz(T.rowOf(i))];
  const ok = (i, pts, km) => {
    if (i < 0) return false;
    if (bOf[i] >= 0) return live(R, pts).bridges[bOf[i]];
    if (!T.isWalkKind(T.kind[i])) return false;
    if (tOf[i] >= 0 && live(R, pts).thickets[tOf[i]]) return false;
    return !(kOf[i] >= 0 && !((km >> kOf[i]) & 1));
  };
  const edgeH = (i, j) => { const [ax, az] = cpt(i), [bx, bz] = cpt(j), mx = (ax + bx) / 2, mz = (az + bz) / 2; return T.groundOf(i, mx + (ax - mx) * 0.02, mz + (az - mz) * 0.02); };
  const region = (s, P, carry, km) => {
    const seen = new Uint8Array(n), q = [s]; seen[s] = 1;
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], c = T.colOf(i), r = T.rowOf(i);
      for (const [dc, dr] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
        const j = T.idx(c + dc, r + dr);
        if (j < 0 || seen[j] || !T.isWalkKind(T.kind[j]) || Math.abs(edgeH(i, j) - edgeH(j, i)) > STEP) continue;
        if (carry) { const [ax, az] = cpt(i), [bx, bz] = cpt(j), pm = [...P, [(ax + bx) / 2, (az + bz) / 2]]; if (!ok(i, pm, km) || !ok(j, pm, km) || !ok(j, [...P, [bx, bz]], km)) continue; }
        else if (!ok(j, P, km)) continue;
        seen[j] = 1; q.push(j);
      }
    }
    return q;
  };
  const placed = (fr, lit) => fr.map((c, f) => (c >= 0 && (lit >> f) & 1 ? R.cradles[c] : null)).filter(Boolean);
  const goal = new Set(T.exits.d ? T.exits.d.cells : []);
  const near = R.cradles.map(([x, z]) => Array.from(T.kind, (_, i) => i).filter(i => T.isWalkKind(T.kind[i]) && Math.hypot(cpt(i)[0] - x, cpt(i)[1] - z) < 2.1));
  const start = { fr: R.fruits.map(f => f.at), lit: 0, km: 0, s: T.at(Z.anchor[0], Z.anchor[1]), n: 0, prev: null, act: '' };
  const reachAll = new Uint8Array(n), seen = new Set(), q = [start];
  const key = st => { const reg = region(st.s, placed(st.fr, st.lit), st.fr.includes(-1), st.km); st.reg = reg; return `${st.fr.join(',')}|${st.lit}|${st.km}|${Math.min(...reg)}`; };
  seen.add(key(start));
  const name = c => `cradle${c}(${R.cradles[c].join(',')})`;
  for (let qi = 0; qi < q.length && qi < 200000; qi++) {
    const st = q[qi];
    st.reg.forEach(i => { reachAll[i] = 1; });
    if (st.reg.some(i => goal.has(i))) {
      const path = []; for (let x = st; x.prev; x = x.prev) path.unshift(x.act);
      return { n: st.n, path, reach: reachAll, states: seen.size };
    }
    const inReg = new Set(st.reg), carrying = st.fr.indexOf(-1);
    R.cradles.forEach((_, c) => {
      const f = st.fr.indexOf(c);
      if ((carrying >= 0) === (f >= 0)) return;   // 持っていれば空のゆりかごへ置く、持っていなければ実のあるゆりかごから取る
      for (const sCell of near[c].filter(i => inReg.has(i))) {
        const fr = st.fr.slice(); let lit = st.lit, km = st.km;
        if (carrying >= 0) fr[carrying] = c; else { fr[f] = -1; lit |= 1 << f; }
        R.knots.forEach((o, k) => { if (o.cradles.every(cc => fr.some((x, ff) => x === cc && (lit >> ff) & 1))) km |= 1 << k; });
        const P = placed(fr, lit), carry = fr.includes(-1);
        if (!ok(sCell, carry ? [...P, cpt(sCell)] : P, km)) continue;   // 足もとの根がしおれる手は使わない
        const nx = { fr, lit, km, s: sCell, n: st.n + 1, prev: st, act: carrying >= 0 ? `put ${R.fruits[carrying].kind} on ${name(c)}` : `take ${R.fruits[f].kind} from ${name(c)}` };
        const k = key(nx); if (seen.has(k)) continue; seen.add(k); q.push(nx);
      }
    });
  }
  return { n: -1, path: [], reach: reachAll, states: seen.size };
}
// 影の回廊（zone.shadows）：プレイヤーが area に入ると、影が鏡の位置（mirror 'x' は x = at[0] の線、'xz' は at の点で折り返す）にあらわれ、
//   プレイヤーが動くと、鏡うつしに動く（壁にぶつかると止まる。影は area を折り返した範囲の外へは出ない）。ひだまり（lights）に入ると、影は消えて、プレイヤーの鏡の位置にあらわれなおす。
//   プレイヤーが goal、影が sgoal の輪（半径 1）に同時に入れば解けた。0.5m ずつの格子で、すべての状態をたどる。
//   direct：影がずっと鏡の位置のまま（壁にもひだまりにもかからず）解けるなら、ただ歩くだけで解けてしまう
function solveShadow(T, S) {
  const [ax, az] = S.at, both = S.mirror === 'xz', tf = (x, z) => [2 * ax - x, both ? 2 * az - z : z];
  // プレイヤーは遊ぶときと同じ当たり判定（体のまわりの 9 点）、影は円がかかるマスをすべて調べる（FieldView.updateShadows と同じ）
  const fit = (x, z) => { const i = T.at(x, z); return i >= 0 && T.isWalkKind(T.kind[i]) && T.fits(x, z, 0.4); };
  const sfit = (x, z) => T.fitsCircle(x, z, 0.4);
  const lit = (x, z) => (S.lights || []).some(([lx, lz, r]) => Math.hypot(x - lx, z - lz) < r);
  // 0.5m の格子。プレイヤーは area の中、影は area を折り返した長方形の中
  const A = S.area, nx = Math.round((A[2] - A[0]) * 2) + 1, nz = Math.round((A[3] - A[1]) * 2) + 1, NP = nx * nz;
  const [bx0, bz0] = tf(A[0], A[1]), [bx1, bz1] = tf(A[2], A[3]), B = [Math.min(bx0, bx1), Math.min(bz0, bz1)];
  const P = k => [A[0] + Math.floor(k / nz) / 2, A[1] + (k % nz) / 2], Q = k => [B[0] + Math.floor(k / nz) / 2, B[1] + (k % nz) / 2];
  const pk = (x, z) => Math.round((x - A[0]) * 2) * nz + Math.round((z - A[1]) * 2), qk = (x, z) => Math.round((x - B[0]) * 2) * nz + Math.round((z - B[1]) * 2);
  const pf = new Uint8Array(NP), qf = new Uint8Array(NP), ql = new Uint8Array(NP), pg = new Uint8Array(NP), qg = new Uint8Array(NP), mir = new Int32Array(NP).fill(-1);
  for (let k = 0; k < NP; k++) {
    const [x, z] = P(k), [u, w] = Q(k);
    pf[k] = fit(x, z); qf[k] = sfit(u, w); ql[k] = lit(u, w);
    pg[k] = Math.hypot(x - S.goal[0], z - S.goal[1]) < 1; qg[k] = Math.hypot(u - S.sgoal[0], w - S.sgoal[1]) < 1;
  }
  for (let k = 0; k < NP; k++) { const [mx, mz] = tf(...P(k)), m = qk(mx, mz); if (Math.abs(Q(m)[0] - mx) < 0.01 && Math.abs(Q(m)[1] - mz) < 0.01 && qf[m] && !ql[m]) mir[k] = m; }
  const p0 = pk(...S.enter);
  if (!pf[p0]) return { err: 'enter is blocked' };
  if (mir[p0] < 0) return { err: 'shadow start is blocked or lit' };
  // 一歩：プレイヤーの格子の番号の差（x が nz、z が 1）。影は x が逆向き、'xz' なら z も逆向き
  const step = [[nz, 1, 0], [-nz, -1, 0], [1, 0, 1], [-1, 0, -1]], col = k => Math.floor(k / nz), row = k => k % nz;
  // ただ歩くだけで解けるか：影がずっと鏡の位置のまま goal へ歩いて行けるか
  let direct = false;
  { const sn = new Uint8Array(NP), st = [p0]; sn[p0] = 1;
    while (st.length) { const k = st.pop(); if (pg[k] && qg[mir[k]]) { direct = true; break; }
      for (const [d, sx, sz] of step) { const c = col(k) + sx, r = row(k) + sz, j = k + d; if (c < 0 || c >= nx || r < 0 || r >= nz || sn[j] || !pf[j] || mir[j] < 0) continue; sn[j] = 1; st.push(j); } } }
  const seen = new Uint8Array(NP * NP), from = new Int32Array(NP * NP).fill(-1), how = new Uint8Array(NP * NP);
  // 答えの歩き方（東西南北に何歩ずつ。0.5m で 1 歩）
  const route = key => { const ds = []; for (let x = key; from[x] >= 0; x = from[x]) ds.unshift('EWSN'[how[x]]); return ds.join('').replace(/(.)\1*/g, m => m[0] + m.length).replace(/(\D)1(?=\D|$)/g, '$1'); };
  let q = [p0 * NP + mir[p0]], n = 0, states = 1; seen[q[0]] = 1;
  for (; q.length; n++) {
    const nq = [];
    for (const key of q) {
      const k = Math.floor(key / NP), m = key % NP;
      if (pg[k] && qg[m]) return { n, states, direct, route: route(key) };
      for (const [di, [d, sx, sz]] of step.entries()) {
        const c = col(k) + sx, r = row(k) + sz;
        if (c < 0 || c >= nx || r < 0 || r >= nz || !pf[k + d]) continue;
        const kk = k + d;
        // 影：x は逆、z は 'xz' のとき逆
        const dc = -sx, dr = both ? -sz : sz, mc = col(m) + dc, mr = row(m) + dr;
        let mm = mc >= 0 && mc < nx && mr >= 0 && mr < nz && qf[mc * nz + mr] ? mc * nz + mr : m;
        if (ql[mm]) { mm = mir[kk]; if (mm < 0) continue; }
        const nk = kk * NP + mm; if (seen[nk]) continue; seen[nk] = 1; from[nk] = key; how[nk] = di; states++; nq.push(nk);
      }
    }
    q = nq;
  }
  return { n: -1, states, direct };
}
// 年輪の間（zone.rings）：年輪 k（0 が内）のすき間は、gaps の角度 + 回した回数 × step。通路 j（0 = 心臓の間、N = 外）は、仕切り（spokes）で弧に分かれ、
//   根のこぶ（solid）の弧には入れない。年輪 k のすき間は、通路 k と k+1 の、その角度の弧どうしをつなぐ。取っ手は、その弧にいれば ±1 回せる。
//   入口（entry の角度の外の通路）から、心臓の間に入れれば解けた
function solveRings(RG) {
  const N = RG.list.length, M = Math.round(360 / RG.step), norm = a => ((a % 360) + 360) % 360;
  const C = j => (RG.corridors || {})[j] || {};
  const arcOf = (j, a) => { const sp = (C(j).spokes || []).map(norm).sort((x, y) => x - y); if (!sp.length) return 0; a = norm(a); for (let i = 0; i < sp.length; i++) if (a < sp[i]) return i; return 0; };
  const solid = (j, a) => (C(j).solid || []).some(([a0, a1]) => { const d = norm(a - a0), w = norm(a1 - a0); return d > 0 && d < w; });
  const region = (rot, j0, a0) => {
    const reg = [[j0, a0]], rs = new Set([j0 + ',' + a0]);
    for (let ri = 0; ri < reg.length; ri++) {
      const [j, a] = reg[ri];
      for (const k of [j - 1, j]) {
        if (k < 0 || k >= N) continue;
        for (const g0 of RG.list[k].gaps) {
          const g = norm(g0 + rot[k] * RG.step), jj = k === j ? j + 1 : j - 1;
          if (arcOf(j, g) !== a || solid(j, g) || solid(jj, g)) continue;
          const aa = arcOf(jj, g), key = jj + ',' + aa; if (!rs.has(key)) { rs.add(key); reg.push([jj, aa]); }
        }
      }
    }
    return rs;
  };
  const st0 = { rot: RG.list.map(() => 0), j: N, a: arcOf(N, RG.entry), n: 0, prev: null, act: '' };
  const key = st => st.rot.join(',') + '|' + st.j + '|' + st.a, seen = new Set([key(st0)]), q = [st0];
  for (let qi = 0; qi < q.length; qi++) {
    const st = q[qi], rs = region(st.rot, st.j, st.a);
    if ([...rs].some(k => k.startsWith('0,'))) { const path = []; for (let x = st; x.prev; x = x.prev) path.unshift(x.act); return { n: st.n, path, states: seen.size }; }
    RG.handles.forEach((h, hi) => {
      if (!rs.has(h.j + ',' + arcOf(h.j, h.a)) || solid(h.j, h.a)) return;
      for (const sg of [1, -1]) {
        const rot = st.rot.slice(); h.turns.forEach(([k, d]) => { rot[k] = ((rot[k] + d * sg) % M + M) % M; });
        const nx = { rot, j: h.j, a: arcOf(h.j, h.a), n: st.n + 1, prev: st, act: `handle${hi}${sg > 0 ? '+' : '-'}` };
        const k = key(nx); if (seen.has(k)) continue; seen.add(k); q.push(nx);
      }
    });
  }
  return { n: -1, states: seen.size };
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
