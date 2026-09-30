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
const FIELD_ZONES = G('FIELD_ZONES'), STORY = G('STORY'), SCENE_STAGES = G('SCENE_STAGES'), BATTLE_SETS = G('BATTLE_SETS'), Terrain = G('Terrain'), zonePoint = G('zonePoint'), TK = G('TK');

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
  (Z.bounce || []).forEach((B, i) => { add(id, { k: 'bounce' + i, p: B.at, r: 0.9 }); add(id, { k: 'land' + i, p: B.to, r: 0.6 }); });
  (Z.fluff || []).forEach((B, i) => { add(id, { k: 'fluff' + i, p: B.at, r: 0.9 }); add(id, { k: 'glide' + i, p: B.to, r: 0.6 }); });
  (Z.nemuri || []).forEach((N, i) => { add(id, { k: 'nemuri' + i, p: N.at, r: 0.2 }); add(id, { k: 'wake' + i, p: N.back, r: 0.6 }); });
  if (Z.sleepwalk) Z.sleepwalk.route.forEach((p, i) => add(id, { k: 'walk' + i, p, r: 0.5 }));
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
console.log(problems ? `${problems} problem(s)` : 'all maps ok');
process.exitCode = problems ? 1 : 0;
