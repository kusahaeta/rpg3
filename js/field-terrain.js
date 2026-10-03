'use strict';
// ============================================================
//  区画の地形（グリッド）：部屋・通路・高低差・階段・昇降機・自動扉、野外の木立・崖・川
//  zone.map の1文字が1マス（CELL m 四方）。1行目が北（-Z）。
//  凡例：
//   #  壁（屋外の区画では木立・崖）   W  窓            （空白） 奈落
//   0〜9  床（数字 = 床の高さ m）
//   ,  土の道（床。高さはとなりの床と同じ）   =  橋（床。下は川）   ~  川・池（通れない）
//   ^ v < >  階段（矢印の向きへ上る。両端の床の高さを結ぶ）
//   E  昇降機（となり合う床の高さのあいだを上下する）
//   D  自動扉（近づくと開く。扉の上は壁）
//   a〜z  区画の出入口（zone.exits の key。門・階段・区画間エレベーターの籠）
//  部屋（扉で区切られた範囲）ごとに天井があり、高さは部屋の最も高い床 + wallH。
// ============================================================
const CELL = 2, STEP = 0.6, ABYSS = -40;
const TK = { SOLID: 0, WINDOW: 1, VOID: 2, FLOOR: 3, STAIR: 4, LIFT: 5, DOOR: 6, EXIT: 7 };
const STAIR_DIR = { '^': ['z', -1], 'v': ['z', 1], '<': ['x', -1], '>': ['x', 1] };
const DIR4 = [[0, -1], [1, 0], [0, 1], [-1, 0]];   // 北・東・南・西
const RING = [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [0.71, 0.71], [-0.71, 0.71], [0.71, -0.71], [-0.71, -0.71]];

class Terrain {
  constructor(zone) {
    const rows = zone.map;
    this.zone = zone;
    this.rows = rows.length; this.cols = Math.max(...rows.map(r => r.length));
    this.hw = this.cols * CELL / 2; this.hd = this.rows * CELL / 2;
    this.wallH = zone.wallH || (ARCH_STYLES[zone.arch || 'station'] || {}).wallH || 6;
    const n = this.cols * this.rows;
    this.ch = new Array(n); this.kind = new Uint8Array(n); this.h = new Float32Array(n); this.fixed = new Uint8Array(n);
    this.water = new Uint8Array(n); this.paint = new Uint8Array(n); this.bridge = new Uint8Array(n);
    this.stairs = new Map();
    this.liftOf = new Int16Array(n).fill(-1); this.doorOf = new Int16Array(n).fill(-1); this.roomOf = new Int16Array(n).fill(-1);
    this.locked = new Set();     // 封鎖中の出入口の key
    this.cabinKeys = new Set((zone.exits || []).filter(e => e.lift).map(e => e.key));
    for (let r = 0; r < this.rows; r++) for (let c = 0; c < this.cols; c++) {
      const i = r * this.cols + c, ch = rows[r][c] ?? '#';
      this.ch[i] = ch;
      if (ch === '#') this.kind[i] = TK.SOLID;
      else if (ch === 'W') this.kind[i] = TK.WINDOW;
      else if (ch === '~') { this.kind[i] = TK.SOLID; this.water[i] = 1; }
      else if (ch === ' ') { this.kind[i] = TK.VOID; this.h[i] = ABYSS; }
      else if (ch >= '0' && ch <= '9') { this.kind[i] = TK.FLOOR; this.h[i] = +ch; this.fixed[i] = 1; }
      else if (STAIR_DIR[ch]) this.kind[i] = TK.STAIR;
      else if (ch === 'E') this.kind[i] = TK.LIFT;
      else if (ch === 'D') this.kind[i] = TK.DOOR;
      else if (ch >= 'a' && ch <= 'z') this.kind[i] = TK.EXIT;
      else { this.kind[i] = TK.FLOOR; this.paint[i] = ch === ',' ? 1 : 0; this.bridge[i] = ch === '=' ? 1 : 0; }   // その他の記号は、となりの床と同じ高さの床
    }
    this.resolveHeights(); this.buildStairs(); this.buildLifts(); this.buildDoors(); this.buildExits(); this.buildRooms();
    // 屋外の区画（天井なし）：壁の塊ごとに上端の高さを決める（町は建物の並び、崖は岩の起伏、木立は地面の高さ）
    this.style = ARCH_STYLES[zone.arch || 'station'] || ARCH_STYLES.station;
    this.open = this.style.roof === false;
    this.outdoor = this.style.outdoor || null;
    this.computeBase();
    if (this.open) this.computeTops();
  }
  // 歩けないマスの地面の高さ：いちばん近い床の高さ（同じ近さなら高いほう）。dist = 床からのマス数
  computeBase() {
    const n = this.kind.length, base = new Float32Array(n).fill(NaN), dist = new Int16Array(n).fill(-1), q = [];
    for (let i = 0; i < n; i++) if (this.isWalkKind(this.kind[i])) {
      const s = this.stairs.get(i);
      base[i] = s ? Math.max(s.h0, s.h1) : this.kind[i] === TK.LIFT ? this.lifts[this.liftOf[i]].levels[0] : this.h[i];
      dist[i] = 0; q.push(i);
    }
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], c = this.colOf(i), r = this.rowOf(i);
      for (const [dc, dr] of DIR4) {
        const j = this.idx(c + dc, r + dr);
        if (j < 0 || this.isWalkKind(this.kind[j]) || this.kind[j] === TK.VOID) continue;
        if (dist[j] < 0) { dist[j] = dist[i] + 1; base[j] = base[i]; q.push(j); }
        else if (dist[j] === dist[i] + 1 && base[i] > base[j]) base[j] = base[i];
      }
    }
    for (let i = 0; i < n; i++) if (Number.isNaN(base[i])) base[i] = 0;
    this.base = base; this.dist = dist;
    // 川・池の水面
    this.cap = new Float32Array(n);
    for (let i = 0; i < n; i++) if (this.water[i]) this.cap[i] = base[i] - 0.45;
  }
  computeTops() {
    const n = this.kind.length, top = new Float32Array(n), S = this.style, wallH = this.zone.wallH || S.wallH || 7;
    const hi = k => this.kind[k] === TK.STAIR ? Math.max(this.stairs.get(k).h0, this.stairs.get(k).h1) : this.kind[k] === TK.LIFT ? Math.max(...this.lifts[this.liftOf[k]].levels) : this.h[k];
    let maxH = 0;
    for (let i = 0; i < n; i++) if (this.isWalkKind(this.kind[i])) maxH = Math.max(maxH, hi(i));
    const hash = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000;
    for (let i = 0; i < n; i++) {
      if (this.kind[i] > TK.WINDOW) continue;
      if (this.water[i]) { top[i] = this.cap[i]; continue; }
      // 木立：地面はとなりの床と同じ高さ。カメラは木の高さより下に入れない
      if (S.outdoor === 'flora') { this.cap[i] = this.base[i]; top[i] = this.base[i] + (S.canopy || 3.2); continue; }
      // 町の敷地：地面はとなりの床と同じ高さ。建物（ZoneKit の townBlocks）が建つので、カメラは建物の高さより下に入れない
      if (S.outdoor === 'lots') { this.cap[i] = this.base[i]; top[i] = this.base[i] + (S.canopy || 7); continue; }
      const c = this.colOf(i), r = this.rowOf(i);
      let base = -1e9;
      for (let rad = 1; rad <= 3 && base < -1e8; rad++) for (let dr = -rad; dr <= rad; dr++) for (let dc = -rad; dc <= rad; dc++) {
        const k = this.idx(c + dc, r + dr); if (k >= 0 && this.isWalkKind(this.kind[k])) base = Math.max(base, hi(k));
      }
      if (base < -1e8) base = maxH;
      const v = S.skyline === 'town' ? Math.floor(hash(Math.floor(c / 3), Math.floor(r / 3)) * 3) * 1.8
        : S.skyline === 'rock' ? hash(c, r) * 2.6 + hash(Math.floor(c / 2), Math.floor(r / 2)) * 2 : 0;
      top[i] = base + wallH + v;
      this.cap[i] = top[i];
    }
    this.top = top;
  }

  // ---------------- 座標 ----------------
  idx(c, r) { return c < 0 || r < 0 || c >= this.cols || r >= this.rows ? -1 : r * this.cols + c; }
  at(x, z) { return this.idx(Math.floor((x + this.hw) / CELL), Math.floor((z + this.hd) / CELL)); }
  cx(c) { return (c + 0.5) * CELL - this.hw; }
  cz(r) { return (r + 0.5) * CELL - this.hd; }
  colOf(i) { return i % this.cols; }
  rowOf(i) { return (i / this.cols) | 0; }
  // マス座標（小数可、整数 = マスの中心）→ ワールド座標
  point(c, r) { return [(c + 0.5) * CELL - this.hw, (r + 0.5) * CELL - this.hd]; }
  isFloorKind(k) { return k === TK.FLOOR || k === TK.DOOR || k === TK.EXIT; }
  isWalkKind(k) { return k >= TK.FLOOR; }

  // ---------------- 解析 ----------------
  // 扉・出入口・記号の床は、となりの床と同じ高さにする
  resolveHeights() {
    const q = [];
    for (let i = 0; i < this.kind.length; i++) if (this.fixed[i]) q.push(i);
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], c = this.colOf(i), r = this.rowOf(i);
      for (const [dc, dr] of DIR4) {
        const j = this.idx(c + dc, r + dr);
        if (j < 0 || this.fixed[j] || !this.isFloorKind(this.kind[j])) continue;
        this.h[j] = this.h[i]; this.fixed[j] = 1; q.push(j);
      }
    }
  }
  buildStairs() {
    for (let i = 0; i < this.kind.length; i++) {
      if (this.kind[i] !== TK.STAIR) continue;
      const ch = this.ch[i], [axis, up] = STAIR_DIR[ch], c = this.colOf(i), r = this.rowOf(i);
      const dc = axis === 'x' ? up : 0, dr = axis === 'z' ? up : 0;
      let lo = 0, hi = 0;
      while (this.ch[this.idx(c - dc * (lo + 1), r - dr * (lo + 1))] === ch) lo++;
      while (this.ch[this.idx(c + dc * (hi + 1), r + dr * (hi + 1))] === ch) hi++;
      const below = this.idx(c - dc * (lo + 1), r - dr * (lo + 1)), above = this.idx(c + dc * (hi + 1), r + dr * (hi + 1));
      const h0 = below >= 0 && this.fixed[below] ? this.h[below] : 0, h1 = above >= 0 && this.fixed[above] ? this.h[above] : h0;
      const lowC = c - dc * lo, lowR = r - dr * lo;
      const start = axis === 'x' ? (up > 0 ? lowC : lowC + 1) * CELL - this.hw : (up > 0 ? lowR : lowR + 1) * CELL - this.hd;
      this.stairs.set(i, { axis, up, start, len: (lo + hi + 1) * CELL, h0, h1 });
      this.h[i] = Math.min(h0, h1);
    }
  }
  flood(i, same, visit) {
    const st = [i], out = []; visit(i);
    while (st.length) {
      const j = st.pop(); out.push(j);
      const c = this.colOf(j), r = this.rowOf(j);
      for (const [dc, dr] of DIR4) { const k = this.idx(c + dc, r + dr); if (k >= 0 && same(k)) { visit(k); st.push(k); } }
    }
    return out;
  }
  bounds(cells) {
    const b = { c0: 1e9, c1: -1, r0: 1e9, r1: -1 };
    for (const j of cells) { const c = this.colOf(j), r = this.rowOf(j); b.c0 = Math.min(b.c0, c); b.c1 = Math.max(b.c1, c); b.r0 = Math.min(b.r0, r); b.r1 = Math.max(b.r1, r); }
    b.x = (b.c0 + b.c1 + 1) * CELL / 2 - this.hw; b.z = (b.r0 + b.r1 + 1) * CELL / 2 - this.hd;
    b.w = (b.c1 - b.c0 + 1) * CELL; b.d = (b.r1 - b.r0 + 1) * CELL;
    return b;
  }
  buildLifts() {
    this.lifts = [];
    for (let i = 0; i < this.kind.length; i++) {
      if (this.kind[i] !== TK.LIFT || this.liftOf[i] >= 0) continue;
      const id = this.lifts.length;
      const cells = this.flood(i, k => this.kind[k] === TK.LIFT && this.liftOf[k] < 0, k => { this.liftOf[k] = id; });
      const levels = new Set();
      for (const j of cells) {
        const c = this.colOf(j), r = this.rowOf(j);
        for (const [dc, dr] of DIR4) { const k = this.idx(c + dc, r + dr); if (k >= 0 && this.isFloorKind(this.kind[k])) levels.add(Math.round(this.h[k] * 100) / 100); }
      }
      const lv = [...levels].sort((a, b) => a - b);
      const L = { id, cells, levels: lv.length ? lv : [0], ...this.bounds(cells), moving: false };
      L.y = L.levels[0];
      cells.forEach(j => { this.h[j] = L.levels[0]; });
      this.lifts.push(L);
    }
  }
  buildDoors() {
    this.doors = [];
    for (let i = 0; i < this.kind.length; i++) {
      if (this.kind[i] !== TK.DOOR || this.doorOf[i] >= 0) continue;
      const id = this.doors.length;
      const cells = this.flood(i, k => this.kind[k] === TK.DOOR && this.doorOf[k] < 0, k => { this.doorOf[k] = id; });
      const b = this.bounds(cells);
      let alongX = b.c1 - b.c0 > b.r1 - b.r0;
      if (b.c1 === b.c0 && b.r1 === b.r0) {
        const c = b.c0, r = b.r0, solid = j => j < 0 || this.kind[j] <= TK.WINDOW;
        alongX = solid(this.idx(c - 1, r)) && solid(this.idx(c + 1, r));
      }
      this.doors.push({ id, cells, ...b, alongX, h: this.h[i], open: 0 });
    }
  }
  // 出入口：in = 区画の内側を向く方向。outer = 外側の辺（隔壁扉の位置）、inner = 内側の辺（籠の入口）
  buildExits() {
    this.exits = {};
    const seen = new Uint8Array(this.kind.length);
    for (let i = 0; i < this.kind.length; i++) {
      if (this.kind[i] !== TK.EXIT || seen[i]) continue;
      const key = this.ch[i];
      const cells = this.flood(i, k => this.kind[k] === TK.EXIT && this.ch[k] === key && !seen[k], k => { seen[k] = 1; });
      const b = this.bounds(cells), count = [0, 0, 0, 0];
      for (const j of cells) {
        const c = this.colOf(j), r = this.rowOf(j);
        DIR4.forEach(([dc, dr], d) => { const k = this.idx(c + dc, r + dr); if (k >= 0 && this.isWalkKind(this.kind[k]) && this.kind[k] !== TK.EXIT) count[d]++; });
      }
      const d = count.indexOf(Math.max(...count)), [nx, nz] = DIR4[d];
      const x0 = b.c0 * CELL - this.hw, x1 = (b.c1 + 1) * CELL - this.hw, z0 = b.r0 * CELL - this.hd, z1 = (b.r1 + 1) * CELL - this.hd;
      const edge = s => nz ? { x: b.x, z: s > 0 === nz > 0 ? z1 : z0 } : { x: s > 0 === nx > 0 ? x1 : x0, z: b.z };
      this.exits[key] = { key, cells, ...b, h: this.h[i], nx, nz, outer: edge(-1), inner: edge(1), width: nz ? b.w : b.d, cabin: this.cabinKeys.has(key) };
    }
  }
  // 扉で区切られた部屋ごとの天井の高さ
  buildRooms() {
    this.rooms = [];
    // 地底湖などの水面の上にも天井を張る
    const roomy = j => { const k = this.kind[j]; return k === TK.FLOOR || k === TK.STAIR || k === TK.LIFT || k === TK.VOID || k === TK.EXIT || !!this.water[j]; };
    for (let i = 0; i < this.kind.length; i++) {
      if (!roomy(i) || this.roomOf[i] >= 0) continue;
      const id = this.rooms.length, cab = this.kind[i] === TK.EXIT && this.cabinKeys.has(this.ch[i]);
      const same = k => this.roomOf[k] < 0 && roomy(k) && (cab ? this.ch[k] === this.ch[i] : !(this.kind[k] === TK.EXIT && this.cabinKeys.has(this.ch[k])));
      const cells = this.flood(i, same, k => { this.roomOf[k] = id; });
      let top = -1e9;
      for (const j of cells) {
        const k = this.kind[j];
        if (k === TK.STAIR) { const s = this.stairs.get(j); top = Math.max(top, s.h0, s.h1); }
        else if (k === TK.LIFT) top = Math.max(top, ...this.lifts[this.liftOf[j]].levels);
        else if (k !== TK.VOID && !this.water[j]) top = Math.max(top, this.h[j]);
      }
      this.rooms.push({ id, cells, cabin: cab, ceil: cab ? top + 4 : Math.max(top, 0) + this.wallH });
    }
  }
  ceilOf(i) {
    if (i < 0) return 0;
    if (this.open && !(this.roomOf[i] >= 0 && this.rooms[this.roomOf[i]].cabin)) return 1e4;   // 屋外は空が見える
    if (this.roomOf[i] >= 0) return this.rooms[this.roomOf[i]].ceil;
    // 扉などは、となりの部屋の天井
    let top = 0; const c = this.colOf(i), r = this.rowOf(i);
    for (const [dc, dr] of DIR4) { const k = this.idx(c + dc, r + dr); if (k >= 0 && this.roomOf[k] >= 0) top = Math.max(top, this.rooms[this.roomOf[k]].ceil); }
    return top || this.h[i] + this.wallH;
  }

  // ---------------- 高さ・通行 ----------------
  groundAt(x, z) { const i = this.at(x, z); return i < 0 ? NaN : this.groundOf(i, x, z); }
  groundOf(i, x, z) {
    switch (this.kind[i]) {
      case TK.STAIR: { const s = this.stairs.get(i), t = clamp(((s.axis === 'x' ? x : z) - s.start) * s.up / s.len, 0, 1); return s.h0 + (s.h1 - s.h0) * t; }
      case TK.LIFT: return this.lifts[this.liftOf[i]].y;
      case TK.SOLID: case TK.WINDOW: return NaN;
      default: return this.h[i];
    }
  }
  // 壁ぎわの小物などを置く高さ（歩けないマスでは、となりの床の高さ）
  baseAt(x, z) {
    const i = this.at(x, z);
    if (i >= 0 && this.isWalkKind(this.kind[i])) return this.groundOf(i, x, z);
    if (i < 0) return 0;
    if (this.outdoor || this.water[i]) return this.cap[i];   // 屋外の木立・崖・水面は、その上
    let best = -1e9; const c = this.colOf(i), r = this.rowOf(i);
    for (const [dc, dr] of DIR4) { const k = this.idx(c + dc, r + dr); if (k >= 0 && this.isWalkKind(this.kind[k])) best = Math.max(best, this.h[k]); }
    return best > -1e9 ? best : 0;
  }
  walkable(i, o = {}) {
    if (i < 0) return false;
    switch (this.kind[i]) {
      case TK.FLOOR: case TK.STAIR: return true;
      case TK.LIFT: return !o.noLift;
      case TK.DOOR: return !o.noDoor;
      case TK.EXIT: return !o.noExit && !this.locked.has(this.ch[i]);
      default: return false;
    }
  }
  // 半径 r の円を置いたとき、通れない・段差が大きすぎる点の数
  misfits(x, z, r, h0, o) {
    let bad = 0;
    for (const [dx, dz] of RING) {
      const px = x + dx * r, pz = z + dz * r, i = this.at(px, pz);
      if (!this.walkable(i, o) || !(Math.abs(this.groundOf(i, px, pz) - h0) <= STEP)) bad++;
    }
    return bad;
  }
  fits(x, z, r, h0 = this.groundAt(x, z), o) { return this.misfits(x, z, r, h0, o) === 0; }
  // 円を (dx, dz) だけ動かす。壁に沿って滑り、段差は越えない
  move(pos, dx, dz, r, o) {
    const n = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.2));
    for (let s = 0; s < n; s++) {
      for (const ax of ['x', 'z']) {
        const d = (ax === 'x' ? dx : dz) / n; if (!d) continue;
        const h0 = this.groundAt(pos.x, pos.z), cur = this.misfits(pos.x, pos.z, r, h0, o);
        const nx = ax === 'x' ? pos.x + d : pos.x, nz = ax === 'z' ? pos.z + d : pos.z;
        const bad = this.misfits(nx, nz, r, h0, o);
        // めり込んでいるときは、少しでも抜け出せる向きなら動ける
        if (bad === 0 || (cur > 0 && bad <= cur && this.walkable(this.at(nx, nz), o) && Math.abs(this.groundAt(nx, nz) - h0) <= STEP)) { pos.x = nx; pos.z = nz; }
      }
    }
  }
  // 見通し（敵が気づくかどうか）
  clearLine(ax, az, bx, bz, h) {
    const d = Math.hypot(bx - ax, bz - az), n = Math.ceil(d / 0.8);
    for (let s = 1; s < n; s++) {
      const x = ax + (bx - ax) * s / n, z = az + (bz - az) * s / n, i = this.at(x, z);
      if (i < 0 || (this.kind[i] <= TK.WINDOW && !this.water[i])) return false;
      if (this.kind[i] !== TK.VOID && !this.water[i] && Math.abs(this.groundOf(i, x, z) - h) > 1.6) return false;
    }
    return true;
  }
  // カメラがその点に入れないか
  blocksView(x, y, z) {
    const i = this.at(x, z);
    if (i < 0) return true;
    const k = this.kind[i];
    if (this.water[i]) return y < this.cap[i] + 0.15 || y > this.ceilOf(i) - 0.35;
    if (k <= TK.WINDOW) return !this.open || y < (this.viewTop || this.top)[i] + 0.3;
    if (y > this.ceilOf(i) - 0.35) return true;
    if (k === TK.DOOR) return y > this.h[i] + 3.7;
    if (k === TK.VOID) return false;
    return y < this.groundOf(i, x, z) + 0.25;
  }

  // ---------------- 到達できる範囲 ----------------
  // 起点から歩いて（階段・昇降機を使って）行けるマス
  computeReach(x, z) {
    const n = this.kind.length, reach = new Uint8Array(n), start = this.at(x, z);
    this.reach = reach;
    if (start < 0 || !this.isWalkKind(this.kind[start])) return;
    const q = [start]; reach[start] = 1;
    // 綿毛（zone.fluff）：つかまったマスから、降りる先のマスへつながる
    // トランポリン（zone.bounce）：となりのマスから踏みこむと、その向きに跳んだ先のマス（とちゅうで踏んだトランポリン）へつながる
    const jumps = new Map(), link = (i, j) => { if (i >= 0 && j >= 0) jumps.set(i, [...(jumps.get(i) || []), j]); };
    for (const B of this.zone.fluff || []) link(this.at(B.at[0], B.at[1]), this.at(B.to[0], B.to[1]));
    for (const [x, z] of this.zone.bounce || []) {
      const t = this.at(x, z); if (t < 0) continue;
      for (const [dc, dr] of DIR4) {
        const f = this.idx(this.colOf(t) - dc, this.rowOf(t) - dr);
        if (f < 0 || !this.isWalkKind(this.kind[f]) || this.isBounce(f)) continue;
        const { land, hops } = this.bounceTo(t, dc, dr);
        hops.forEach(h => link(f, h)); link(f, land);
      }
    }
    const edgeH = (i, j) => {
      const ci = this.colOf(i), ri = this.rowOf(i), cj = this.colOf(j), rj = this.rowOf(j);
      const mx = (this.cx(ci) + this.cx(cj)) / 2, mz = (this.cz(ri) + this.cz(rj)) / 2;
      const px = mx + (this.cx(ci) - mx) * 0.02, pz = mz + (this.cz(ri) - mz) * 0.02;
      return this.groundOf(i, px, pz);
    };
    for (let qi = 0; qi < q.length; qi++) {
      const i = q[qi], c = this.colOf(i), r = this.rowOf(i);
      for (const j of jumps.get(i) || []) if (!reach[j]) { reach[j] = 1; q.push(j); }
      for (const [dc, dr] of DIR4) {
        const j = this.idx(c + dc, r + dr);
        if (j < 0 || reach[j] || !this.isWalkKind(this.kind[j])) continue;
        let ok;
        const li = this.liftOf[i], lj = this.liftOf[j];
        if (li >= 0 && lj >= 0) ok = li === lj;
        else if (li >= 0) ok = this.lifts[li].levels.some(v => Math.abs(v - edgeH(j, i)) <= STEP);
        else if (lj >= 0) ok = this.lifts[lj].levels.some(v => Math.abs(v - edgeH(i, j)) <= STEP);
        else ok = Math.abs(edgeH(i, j) - edgeH(j, i)) <= STEP;
        if (ok) { reach[j] = 1; q.push(j); }
      }
    }
    // 敵・宝箱を置けるマス（床のみ。扉・昇降機・出入口のとなりは避ける。トランポリンのまわり 2 マスも、小さな島をふさがないよう避ける）
    this.spawnCells = [];
    for (let i = 0; i < n; i++) {
      if (!reach[i] || this.kind[i] !== TK.FLOOR) continue;
      const c = this.colOf(i), r = this.rowOf(i);
      let ok = true;
      for (let dr = -1; dr <= 1 && ok; dr++) for (let dc = -1; dc <= 1; dc++) {
        const k = this.idx(c + dc, r + dr);
        if (k >= 0 && (this.kind[k] === TK.LIFT || this.kind[k] === TK.EXIT || this.kind[k] === TK.DOOR || this.kind[k] === TK.STAIR)) { ok = false; break; }
      }
      for (let dr = -2; dr <= 2 && ok; dr++) for (let dc = -2; dc <= 2; dc++) if (this.isBounce(this.idx(c + dc, r + dr))) { ok = false; break; }
      if (ok) this.spawnCells.push(i);
    }
  }
  // トランポリン（zone.bounce：[[x, z], ...]）のマスか
  isBounce(i) {
    if (!this.bounceSet) this.bounceSet = new Set((this.zone.bounce || []).map(([x, z]) => this.at(x, z)));
    return i >= 0 && this.bounceSet.has(i);
  }
  // マス i のトランポリンに (dc, dr) の向きへ踏みこんだとき、跳んでいく先。zone.bounceLen マス先（3）に着地する。
  //   着地するマスもトランポリンなら、同じ向きにもう一度跳ぶ。{ land: 着地するマス（床がなければ -1。奈落へ落ちる）, hops: とちゅうで踏むトランポリン }
  bounceTo(i, dc, dr) {
    const L = this.zone.bounceLen || 3, hops = [];
    let c = this.colOf(i), r = this.rowOf(i);
    for (let k = 0; k < 16; k++) {
      c += dc * L; r += dr * L;
      const j = this.idx(c, r);
      if (j < 0 || (this.kind[j] !== TK.FLOOR && this.kind[j] !== TK.STAIR)) return { land: -1, hops };
      if (!this.isBounce(j)) return { land: j, hops };
      hops.push(j);
    }
    return { land: -1, hops };
  }
  // (x, z) の近くで立てる場所
  nearestStandable(x, z, r = 0.5, o) {
    for (let d = 0; d < 14; d += 0.5) for (let a = 0; a < Math.PI * 2; a += d ? 0.35 / Math.max(1, d / 2) : 7) {
      const px = x + Math.cos(a) * d, pz = z + Math.sin(a) * d, i = this.at(px, pz);
      if (i >= 0 && (!this.reach || this.reach[i]) && this.fits(px, pz, r, this.groundAt(px, pz), o)) return { x: px, z: pz };
    }
    return { x, z };
  }
  // その高さの呼び名（ミニマップ用。区画が階を持つときはその名前、屋外は出さない）
  floorLabel(h) { return this.zone.floor || (this.outdoor || this.open ? null : h < 2.5 ? '1F' : h < 7.5 ? '2F' : '3F'); }
}

// ============================================================
//  ジオメトリをまとめて作る（マテリアルごとに1メッシュ）
// ============================================================
class GeoAcc {
  constructor(uvScale = 4) { this.p = []; this.n = []; this.u = []; this.ix = []; this.s = uvScale; }
  // 表から見て反時計回りの4点
  quad(a, b, c, d, uv) {
    const i0 = this.p.length / 3;
    // 法線は対角線どうしから求める（片側の高さが 0 の壁など、三角形の片方がつぶれていても向きが出る）
    const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2], vx = d[0] - b[0], vy = d[1] - b[1], vz = d[2] - b[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz);
    // 面積のない面は作らない（長さ 0 の法線は、iPhone の GPU で光の計算が NaN になり、光のにじみで画面全体に広がる）
    if (l < 1e-9) return;
    nx /= l; ny /= l; nz /= l;
    for (const q of [a, b, c, d]) {
      this.p.push(q[0], q[1], q[2]); this.n.push(nx, ny, nz);
      if (!uv) {
        if (Math.abs(ny) > 0.5) this.u.push(q[0] / this.s, -q[2] / this.s);
        else if (Math.abs(nx) > Math.abs(nz)) this.u.push(-q[2] * Math.sign(nx) / this.s, q[1] / this.s);
        else this.u.push(q[0] * Math.sign(nz) / this.s, q[1] / this.s);
      }
    }
    if (uv) for (const t of uv) this.u.push(t[0], t[1]);
    this.ix.push(i0, i0 + 1, i0 + 2, i0, i0 + 2, i0 + 3);
  }
  // 軸平行の箱。skip = 省く面（'b' 底, 't' 上, 'n' 's' 'e' 'w'）
  box(x0, y0, z0, x1, y1, z1, skip = 'b') {
    if (!skip.includes('t')) this.quad([x0, y1, z1], [x1, y1, z1], [x1, y1, z0], [x0, y1, z0]);
    if (!skip.includes('b')) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1]);
    if (!skip.includes('s')) this.quad([x0, y0, z1], [x1, y0, z1], [x1, y1, z1], [x0, y1, z1]);
    if (!skip.includes('n')) this.quad([x1, y0, z0], [x0, y0, z0], [x0, y1, z0], [x1, y1, z0]);
    if (!skip.includes('e')) this.quad([x1, y0, z1], [x1, y0, z0], [x1, y1, z0], [x1, y1, z1]);
    if (!skip.includes('w')) this.quad([x0, y0, z0], [x0, y0, z1], [x0, y1, z1], [x0, y1, z0]);
  }
  // 法線 (nx, nz) を向く縦の面。中心 (x, z)、幅 w、高さ y0〜y1（左右で高さが違う場合は ya, yb で指定）
  wall(x, z, nx, nz, w, y0, y1, off = 0, ya, yb) {
    const rx = nz, rz = -nx, hx = rx * w / 2, hz = rz * w / 2, ox = x + nx * off, oz = z + nz * off;
    const [a0, a1] = ya || [y0, y1], [b0, b1] = yb || [y0, y1];
    this.quad([ox - hx, a0, oz - hz], [ox + hx, b0, oz + hz], [ox + hx, b1, oz + hz], [ox - hx, a1, oz - hz]);
  }
  // 壁から法線方向に厚み depth だけ張り出す板（正面・上・下・両端）
  slab(x, z, nx, nz, w, y0, y1, depth, off = 0) {
    const rx = nz, rz = -nx, hx = rx * w / 2, hz = rz * w / 2;
    const bx = x + nx * off, bz = z + nz * off, fx = bx + nx * depth, fz = bz + nz * depth;
    this.quad([fx - hx, y0, fz - hz], [fx + hx, y0, fz + hz], [fx + hx, y1, fz + hz], [fx - hx, y1, fz - hz]);
    this.quad([fx - hx, y1, fz - hz], [fx + hx, y1, fz + hz], [bx + hx, y1, bz + hz], [bx - hx, y1, bz - hz]);
    this.quad([bx - hx, y0, bz - hz], [bx + hx, y0, bz + hz], [fx + hx, y0, fz + hz], [fx - hx, y0, fz - hz]);
    this.quad([bx - hx, y0, bz - hz], [fx - hx, y0, fz - hz], [fx - hx, y1, fz - hz], [bx - hx, y1, bz - hz]);
    this.quad([fx + hx, y0, fz + hz], [bx + hx, y0, bz + hz], [bx + hx, y1, bz + hz], [fx + hx, y1, fz + hz]);
  }
  mesh(mat, o = {}) {
    if (!this.ix.length) return null;
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new THREE.Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.u, 2));
    g.setIndex(this.ix);
    g.computeBoundingSphere();
    const m = new THREE.Mesh(g, mat);
    m.receiveShadow = o.receive !== false; m.castShadow = !!o.cast;
    return m;
  }
}

// ============================================================
//  建物の見た目（区画のスタイルごとの色）
// ============================================================
// roof：天井があるか（false は屋外）。skyline：屋外の壁の上端の起伏。rail：手すり。door：扉の開き方。lift：昇降機の作り
const ARCH_STYLES = {
  station: { roof: true, wall: '#d6dae8', wall2: '#aeb4c8', trim: '#262b48', cliff: '#6a7294', ceil: '#23283e', step: '#7a8198', glass: '#9fdcff', light: '#eaf4ff', rail: 'glass', door: 'slide', lift: 'tech', exit: 'bulkhead' },
  // 雪の町：石と漆喰の建物が並ぶ（窓に灯り）、屋根の上に雪
  town: { roof: false, skyline: 'town', wallH: 8, wall: '#e2d8cc', wall2: '#cfc4b6', trim: '#5c5660', cliff: '#9aa0ae', step: '#aab0bc', glass: '#bfe8ff', glow: '#ffd27a', rail: 'iron', door: 'swing', lift: 'cage', exit: 'gate' },
  // 雪原の崖：ごつごつした岩肌に雪が積もる
  cliff: { roof: false, skyline: 'rock', wallH: 6, rock: '#7c8498', trim: '#5c5660', cliff: '#8a90a2', step: '#a4aab6', glass: '#bfe8ff', glow: '#9fd8ff', rail: 'wood', door: 'swing', lift: 'cage', exit: 'gate' },
  // 坑道：岩の天井と坑木、ランタンの灯り
  mine: { roof: true, wallH: 7, rock: '#8a8290', trim: '#5a3a22', cliff: '#8a8290', ceil: '#4a444c', step: '#6a4a30', glass: '#bfe8ff', glow: '#ffb04a', rail: 'wood', door: 'swing', lift: 'cage', exit: 'tunnel' },
  // 氷晶の宮殿：大理石と氷、青く光る縁取り
  palace: { roof: true, wallH: 9, wall: '#dfe8f4', wall2: '#c4d2e4', trim: '#6c84a8', cliff: '#b4c4d8', ceil: '#c8d6e8', step: '#d8e2ee', glass: '#bfeaff', glow: '#9fd8ff', light: '#dff4ff', rail: 'ice', door: 'swing', lift: 'cage', exit: 'gate' },
  // 宮殿の庭：大理石の壁に囲まれた、空の見える庭
  // 城塞：窓のない切り石の城壁（上端に狭間）
  fort: { look: 'town', facade: 'stone', roof: false, wallH: 11, wall: '#c4c8d2', wall2: '#a4aab8', trim: '#5c5660', cliff: '#9aa0ae', step: '#aab0bc', glass: '#bfe8ff', glow: '#ffd27a', rail: 'iron', door: 'swing', lift: 'cage', exit: 'gate' },
  // にゃんこファンタジー：笑顔の塔（ピンクの大理石と金の灯り）・黒影洞窟（紫の水晶）・魔王城（暗い紫の石）
  tower: { look: 'palace', roof: true, wallH: 7, wall: '#f6d6e8', wall2: '#eab8d6', trim: '#8a4a7a', cliff: '#e8c0da', ceil: '#6a3a6a', step: '#f4d8e6', glass: '#ffd8f0', glow: '#ffd27a', light: '#fff0f8', rail: 'ice', door: 'swing', lift: 'cage', exit: 'gate' },
  cave: { look: 'mine', roof: true, wallH: 7, rock: '#6a5a7e', trim: '#3a2a4a', cliff: '#6a5a7e', ceil: '#3a3048', step: '#5a4a6a', glass: '#bfe8ff', glow: '#a07bff', light: '#b89aff', rail: 'wood', door: 'swing', lift: 'cage', exit: 'tunnel' },
  castle: { look: 'palace', roof: true, wallH: 9, wall: '#6a5a80', wall2: '#54466a', trim: '#2a1a3a', cliff: '#5a4a70', ceil: '#2e2240', step: '#7a6a90', glass: '#d8b0ff', glow: '#ff8ad8', light: '#ffd8f8', rail: 'ice', door: 'swing', lift: 'cage', exit: 'gate' },
  court: { look: 'palace', roof: false, skyline: 'town', wallH: 10, wall: '#dfe8f4', wall2: '#c4d2e4', trim: '#6c84a8', cliff: '#b4c4d8', step: '#d8e2ee', glass: '#bfeaff', glow: '#9fd8ff', light: '#dff4ff', rail: 'ice', door: 'swing', lift: 'cage', exit: 'gate' },
  // にゃんこファンタジーの野外：木立（# は木の茂る地面。ZoneKit の flora で木を植える）と、岩の崖（# は切り立った岩）
  // outdoor：flora ＝ 木立、cliff ＝ 岩の崖。cap ＝ 崖の上端の草の色、path ＝ 土の道の色、exit: arch ＝ 木のアーチの門
  woods: { look: 'cliff', outdoor: 'flora', roof: false, canopy: 3.2, rock: '#8a7458', cap: '#6aa048', path: '#c2a070', trim: '#5a3a22', step: '#b0a288', glass: '#bfe8ff', glow: '#ffd27a', rail: 'wood', door: 'swing', lift: 'cage', exit: 'arch' },
  crag: { look: 'cliff', outdoor: 'cliff', roof: false, skyline: 'rock', wallH: 5, rock: '#8a8478', cap: '#7aa858', path: '#b89a70', trim: '#5a3a22', step: '#aaa294', glass: '#bfe8ff', glow: '#ffd27a', rail: 'wood', door: 'swing', lift: 'cage', exit: 'arch' },
  // 世界の果て：奈落に浮かぶ石の道（手すりなし）。# は浮かぶ岩
  abyss: { look: 'cliff', outdoor: 'cliff', roof: false, skyline: 'rock', wallH: 3, rock: '#3a3048', cap: '#4a3a5a', path: '#8a7ab0', trim: '#2a1a3a', step: '#5a4a6a', glass: '#bfe8ff', glow: '#b8a8ff', rail: 'none', door: 'swing', lift: 'cage', exit: 'arch' },
  // ねこ神の夢：お菓子の木立
  sweets: { look: 'cliff', outdoor: 'flora', roof: false, canopy: 3, rock: '#e8b8d8', cap: '#ffd8e8', path: '#fff0c8', trim: '#c88ab8', step: '#ffe8f0', glass: '#bfe8ff', glow: '#ff9ad8', rail: 'wood', door: 'swing', lift: 'cage', exit: 'arch' },
  // ニャハハ王国の城下町：# は建物の敷地（outdoor: lots。ZoneKit の townBlocks で家を建てる）。石畳と石の擁壁、鉄の手すり
  kingdom: { look: 'town', outdoor: 'lots', roof: false, canopy: 7, rock: '#9a948a', cap: '#d8cfc0', cliff: '#b8b0a4', trim: '#5a4a42', step: '#c8c0b2', glass: '#bfe8ff', glow: '#ffd27a', rail: 'iron', door: 'swing', lift: 'cage', exit: 'gate' },
  // ニャハハ城：空の見える中庭を、白い大理石の城壁（金の縁取り、窓に灯り）が囲む
  nyacastle: { look: 'palace', roof: false, skyline: 'town', wallH: 11, wall: '#f4ece0', wall2: '#e2d4c0', trim: '#8a6a3a', cliff: '#e8dccb', cap: '#e8c878', step: '#efe6d8', glass: '#ffe8c0', glow: '#ffd27a', light: '#fff4dc', rail: 'ice', door: 'swing', lift: 'cage', exit: 'gate' },
  // 魔王城の中庭：空の見える庭を、紫の石の城壁（桃色の灯り）が囲む
  demoncourt: { look: 'palace', roof: false, skyline: 'town', wallH: 12, wall: '#6a5a80', wall2: '#54466a', trim: '#2a1a3a', cliff: '#5a4a70', cap: '#8a6aa8', step: '#7a6a90', glass: '#d8b0ff', glow: '#ff8ad8', light: '#ffd8f8', rail: 'ice', door: 'swing', lift: 'cage', exit: 'gate' },
  // ニャハハ城の中：クリーム色の大理石、金の縁取りと灯り、格天井
  nyapalace: { look: 'palace', roof: true, wallH: 8, wall: '#f6eee2', wall2: '#e6d6c0', trim: '#8a6a3a', cliff: '#eadfce', ceil: '#f2e6d4', step: '#efe6d8', glass: '#ffe8c0', glow: '#ffd27a', light: '#fff4dc', rail: 'ice', door: 'swing', lift: 'cage', exit: 'gate' },
  // 壁画の回廊：苔むした古い石の回廊（天井あり、青緑に光る縁取り）
  ruin: { look: 'palace', roof: true, wallH: 8, wall: '#c8c0a4', wall2: '#a8a088', trim: '#5a5a48', cliff: '#b0aa90', ceil: '#6a6a58', step: '#b8b098', glass: '#bfffe8', glow: '#8affe0', light: '#e8fff4', rail: 'ice', door: 'swing', lift: 'cage', exit: 'gate' },
  // 樹の地下・黒影洞窟の奥：根と土の洞窟
  roots: { look: 'mine', roof: true, wallH: 7, rock: '#5a4a38', trim: '#4a3420', cliff: '#5a4a38', ceil: '#2a2218', step: '#6a5238', glass: '#bfe8ff', glow: '#b8ff8a', light: '#d8ffc8', rail: 'wood', door: 'swing', lift: 'cage', exit: 'tunnel', water: '#4ac88a', waterGlow: '#2a9a5a', waterBed: '#10241a' },
};

// 壁パネルのテクスチャ（4m 四方）
function panelTex(style) {
  const k = 'panel' + style; if (TexCache[k]) return TexCache[k];
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d');
  const gr = g.createLinearGradient(0, 0, 0, S); gr.addColorStop(0, '#f4f5fa'); gr.addColorStop(1, '#e2e5ee');
  g.fillStyle = gr; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 1800; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '90,100,130'},${Math.random() * 0.05})`; g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 10, 1 + Math.random() * 2); }
  g.strokeStyle = 'rgba(70,80,110,.55)'; g.lineWidth = 3;
  for (const x of [2, 256]) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, S); g.stroke(); }
  for (const y of [2, 150, 362]) { g.beginPath(); g.moveTo(0, y); g.lineTo(S, y); g.stroke(); }
  g.strokeStyle = 'rgba(70,80,110,.25)'; g.lineWidth = 2;
  for (const [x, y, w, h] of [[40, 190, 170, 120], [300, 40, 170, 80], [296, 400, 60, 90]]) { g.strokeRect(x, y, w, h); }
  g.fillStyle = 'rgba(60,70,100,.35)';
  for (let i = 0; i < 6; i++) g.fillRect(300, 410 + i * 12, 50, 5);   // 通気口
  for (const [x, y] of [[14, 14], [242, 14], [270, 14], [498, 14], [14, 164], [242, 164], [270, 374], [498, 374]]) { g.beginPath(); g.arc(x, y, 3, 0, 7); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
  return (TexCache[k] = t);
}
// 天井のテクスチャ（格子）
function ceilTex() {
  if (TexCache.ceil) return TexCache.ceil;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = '#9aa0b8'; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(20,24,40,.7)'; g.lineWidth = 4;
  for (const v of [2, 128]) { g.beginPath(); g.moveTo(v, 0); g.lineTo(v, S); g.stroke(); g.beginPath(); g.moveTo(0, v); g.lineTo(S, v); g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (TexCache.ceil = t);
}
// モニターの画面（グラフ・見取り図・棒グラフ）
function screenTex(kind = 0, col = '#56c8ff') {
  const k = 'scr' + kind + col; if (TexCache[k]) return TexCache[k];
  const c = document.createElement('canvas'); c.width = 512; c.height = 288;
  const g = c.getContext('2d');
  g.fillStyle = '#050c1c'; g.fillRect(0, 0, 512, 288);
  g.strokeStyle = col; g.globalAlpha = 0.18; g.lineWidth = 1;
  for (let x = 0; x < 512; x += 32) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 288); g.stroke(); }
  for (let y = 0; y < 288; y += 32) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.globalAlpha = 0.9; g.lineWidth = 3; g.fillStyle = col;
  switch (kind % 3) {
    case 0: for (let k2 = 0; k2 < 2; k2++) { g.globalAlpha = k2 ? 0.45 : 0.9; g.beginPath(); for (let x = 0; x <= 512; x += 12) { const y = 170 - Math.sin(x * 0.018 + kind + k2 * 2) * 50 - Math.sin(x * 0.07) * 14; x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); } break;
    case 1: for (const r of [40, 78, 116]) { g.beginPath(); g.arc(300, 150, r, 0, 7); g.stroke(); }
      for (let i = 0; i < 6; i++) { const a = i * Math.PI / 3 + kind; g.beginPath(); g.moveTo(300, 150); g.lineTo(300 + Math.cos(a) * 126, 150 + Math.sin(a) * 126); g.stroke(); }
      g.beginPath(); g.arc(300 + Math.cos(kind) * 78, 150 + Math.sin(kind) * 78, 10, 0, 7); g.fillStyle = '#ff6a7a'; g.fill(); g.fillStyle = col; break;
    default: for (let i = 0; i < 10; i++) { const h = 40 + Math.abs(Math.sin(i * 1.7 + kind)) * 150; g.globalAlpha = 0.75; g.fillRect(150 + i * 34, 260 - h, 22, h); }
  }
  g.globalAlpha = 1;
  for (let i = 0; i < 7; i++) g.fillRect(18, 18 + i * 16, 40 + ((i * 37 + kind * 13) % 80), 6);
  g.strokeStyle = col; g.lineWidth = 3; g.strokeRect(3, 3, 506, 282);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (TexCache[k] = t);
}
// 深淵の底でうごめくエネルギー（加算合成で重ねる）
function abyssTex() {
  if (TexCache.abyss) return TexCache.abyss;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S;
  const g = c.getContext('2d'); g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 70; i++) {
    const x = Math.random() * S, y = Math.random() * S, r = 10 + Math.random() * 40;
    for (const [ox, oy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) {
      const gr = g.createRadialGradient(x + ox, y + oy, 0, x + ox, y + oy, r);
      gr.addColorStop(0, `rgba(255,${120 + Math.random() * 80 | 0},${150 + Math.random() * 60 | 0},${0.12 + Math.random() * 0.25})`); gr.addColorStop(1, 'rgba(0,0,0,0)');
      g.fillStyle = gr; g.fillRect(x + ox - r, y + oy - r, r * 2, r * 2);
    }
  }
  g.strokeStyle = 'rgba(255,200,220,.55)'; g.lineWidth = 1.5;
  for (let k = 0; k < 14; k++) { let x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 6; j++) { x += (Math.random() - 0.5) * 50; y += (Math.random() - 0.5) * 50; g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return (TexCache.abyss = t);
}
// 隔壁扉の板（警戒色の帯と矢羽根）
function bulkheadTex() {
  if (TexCache.bulk) return TexCache.bulk;
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#8a90a8'; g.fillRect(0, 0, 256, 512);
  g.strokeStyle = 'rgba(30,34,50,.6)'; g.lineWidth = 4; g.strokeRect(10, 10, 236, 492);
  for (const y of [120, 260]) { g.beginPath(); g.moveTo(10, y); g.lineTo(246, y); g.stroke(); }
  g.save(); g.beginPath(); g.rect(0, 420, 256, 92); g.clip();
  for (let x = -120; x < 300; x += 40) { g.fillStyle = '#e8b83a'; g.beginPath(); g.moveTo(x, 512); g.lineTo(x + 20, 512); g.lineTo(x + 112, 420); g.lineTo(x + 92, 420); g.fill(); }
  g.fillStyle = 'rgba(20,20,30,.85)';
  for (let x = -100; x < 300; x += 40) { g.beginPath(); g.moveTo(x, 512); g.lineTo(x + 20, 512); g.lineTo(x + 112, 420); g.lineTo(x + 92, 420); g.fill(); }
  g.restore();
  g.fillStyle = 'rgba(40,44,64,.7)';
  for (let i = 0; i < 3; i++) { g.beginPath(); g.moveTo(90, 300 + i * 34); g.lineTo(128, 280 + i * 34); g.lineTo(166, 300 + i * 34); g.lineTo(166, 312 + i * 34); g.lineTo(128, 292 + i * 34); g.lineTo(90, 312 + i * 34); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (TexCache.bulk = t);
}
// 看板（ホログラムの文字）
function signTex(text, sub, color = '#ffd27a') {
  const k = 'sign' + text + '|' + sub + color; if (TexCache[k]) return TexCache[k];
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  // 木の看板
  const gr = g.createLinearGradient(0, 0, 0, 128); gr.addColorStop(0, '#9a6a40'); gr.addColorStop(1, '#6a4428');
  g.fillStyle = gr; g.beginPath(); g.roundRect(4, 4, 504, 120, 18); g.fill();
  g.strokeStyle = 'rgba(60,34,18,.5)'; g.lineWidth = 2; for (let y = 22; y < 120; y += 22) { g.beginPath(); g.moveTo(14, y + Math.sin(y) * 3); g.bezierCurveTo(180, y - 4, 330, y + 5, 498, y); g.stroke(); }
  g.strokeStyle = '#4a2c18'; g.lineWidth = 6; g.beginPath(); g.roundRect(4, 4, 504, 120, 18); g.stroke();
  g.fillStyle = color; g.beginPath(); g.arc(34, 64, 12, 0, Math.PI * 2); g.fill();
  g.fillStyle = '#fff6e0'; g.strokeStyle = '#3a200e'; g.lineWidth = 7; g.lineJoin = 'round'; g.textAlign = 'left'; g.textBaseline = 'middle';
  g.font = `900 ${sub ? 44 : 52}px "Hiragino Maru Gothic ProN","Hiragino Sans","Yu Gothic",sans-serif`;
  g.strokeText(text, 60, sub ? 50 : 66, 430); g.fillText(text, 60, sub ? 50 : 66, 430);
  if (sub) { g.fillStyle = color; g.font = '800 24px "Hiragino Maru Gothic ProN","Hiragino Sans",sans-serif'; g.lineWidth = 5; g.strokeText(sub, 62, 96, 430); g.fillText(sub, 62, 96, 430); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  return (TexCache[k] = t);
}

// 影の壁：うずまく闇のもや（白黒のノイズ。材質の色とかさねて使う）
function shadowWallTex() {
  if (TexCache.shadowWall) return TexCache.shadowWall;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#000'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 90; i++) { const x = Math.random() * S, y = Math.random() * S, r = 10 + Math.random() * 40, gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, `rgba(255,255,255,${0.25 + Math.random() * 0.35})`); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; for (const [dx, dy] of [[0, 0], [S, 0], [-S, 0], [0, S], [0, -S]]) { g.beginPath(); g.arc(x + dx, y + dy, r, 0, Math.PI * 2); g.fill(); } }
  g.strokeStyle = 'rgba(255,255,255,.35)'; g.lineWidth = 2; for (let k = 0; k < 14; k++) { let x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 8; j++) { x += (Math.random() - 0.5) * 50; y -= 10 + Math.random() * 20; g.lineTo(x, y); } g.stroke(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (TexCache.shadowWall = t);
}
// むすっと幕：赤いビロードのひだに、大きな顔（smile = 笑った顔）
function curtainTex(smile) {
  const k = 'curtain' + (smile ? 1 : 0);
  if (TexCache[k]) return TexCache[k];
  const W = 512, H = 320, c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  for (let x = 0; x < W; x += 32) { const gr = g.createLinearGradient(x, 0, x + 32, 0); gr.addColorStop(0, '#6a1020'); gr.addColorStop(0.5, '#c8304a'); gr.addColorStop(1, '#6a1020'); g.fillStyle = gr; g.fillRect(x, 0, 32, H); }
  g.fillStyle = '#ffd27a'; g.fillRect(0, H - 22, W, 22); for (let x = 8; x < W; x += 24) { g.beginPath(); g.arc(x, H - 22, 7, 0, Math.PI); g.fill(); }
  const cx = W / 2, cy = H * 0.46;
  g.fillStyle = '#fff4e8'; g.beginPath(); g.ellipse(cx, cy, 120, 104, 0, 0, Math.PI * 2); g.fill();
  g.strokeStyle = '#3a1a2a'; g.lineWidth = 12; g.lineCap = 'round'; g.fillStyle = '#3a1a2a';
  if (smile) {
    for (const s of [-1, 1]) { g.beginPath(); g.arc(cx + s * 44, cy - 16, 20, Math.PI * 1.1, Math.PI * 1.9); g.stroke(); }
    g.beginPath(); g.moveTo(cx - 70, cy + 20); g.quadraticCurveTo(cx, cy + 110, cx + 70, cy + 20); g.closePath(); g.fill();
    g.fillStyle = '#ff7a8a'; g.beginPath(); g.ellipse(cx, cy + 58, 30, 16, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,120,150,.5)'; for (const s of [-1, 1]) { g.beginPath(); g.ellipse(cx + s * 78, cy + 16, 18, 11, 0, 0, Math.PI * 2); g.fill(); }
  } else {
    for (const s of [-1, 1]) { g.beginPath(); g.moveTo(cx + s * 70, cy - 44); g.lineTo(cx + s * 22, cy - 30); g.stroke(); g.beginPath(); g.arc(cx + s * 44, cy - 10, 9, 0, Math.PI * 2); g.fill(); }
    g.beginPath(); g.moveTo(cx - 56, cy + 58); g.quadraticCurveTo(cx, cy + 20, cx + 56, cy + 58); g.stroke();
    g.fillStyle = '#e05a6a'; g.beginPath(); g.arc(cx, cy + 16, 14, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (TexCache[k] = t);
}
// ---------- 雪の町・坑道・宮殿のテクスチャ ----------
const noiseCanvas = (g, S, n, a, dark = '0,0,0') => { for (let i = 0; i < n; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : dark},${Math.random() * a})`; g.fillRect(Math.random() * S, Math.random() * S, 2 + Math.random() * 12, 1 + Math.random() * 3); } };
const texOf = (c, rep) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8; if (rep) t.repeat.set(...rep); return t; };
// 建物の外壁（幅4m × 高さ8m）：石の土台、漆喰、2階分の窓（灯りは発光マップ）
function facadeTex() {
  if (TexCache.facade) return TexCache.facade;
  const W = 512, H = 1024, mk = () => { const c = document.createElement('canvas'); c.width = W; c.height = H; return c; };
  const c = mk(), e = mk(), g = c.getContext('2d'), ge = e.getContext('2d');
  g.fillStyle = '#ece4da'; g.fillRect(0, 0, W, H); noiseCanvas(g, W, 2500, 0.05, '90,80,70');
  ge.fillStyle = '#000'; ge.fillRect(0, 0, W, H);
  const Y = m => H - m / 8 * H, X = m => m / 4 * W;   // m：床からの高さ／左端からの距離（m）
  // 土台の石積み
  g.fillStyle = '#8a8490'; g.fillRect(0, Y(0.9), W, Y(0) - Y(0.9));
  g.strokeStyle = 'rgba(40,36,48,.6)'; g.lineWidth = 3;
  for (let row = 0; row < 3; row++) { const y = Y(0.3 * row); g.beginPath(); g.moveTo(0, y); g.lineTo(W, y); g.stroke(); for (let x = (row % 2) * 48; x < W; x += 96) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, Y(0.3 * row + 0.3)); g.stroke(); } }
  // 階を分ける蛇腹
  for (const m of [3.6, 7.4]) { g.fillStyle = '#bdb2a4'; g.fillRect(0, Y(m + 0.25), W, Y(m) - Y(m + 0.25)); g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, Y(m), W, 5); }
  // 窓（木枠・十字の桟・灯り）
  for (const [x0, y0] of [[0.55, 1.4], [2.35, 1.4], [0.55, 4.9], [2.35, 4.9]]) {
    const x = X(x0), y = Y(y0 + 1.7), w = X(1.1), h = Y(y0) - Y(y0 + 1.7);
    g.fillStyle = '#4a3428'; g.fillRect(x - 8, y - 8, w + 16, h + 16);
    g.fillStyle = '#2a3446'; g.fillRect(x, y, w, h);
    const lit = Math.random() < 0.75;
    if (lit) { const gr = ge.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, '#ffb45a'); gr.addColorStop(1, '#ffdf9a'); ge.fillStyle = gr; ge.fillRect(x, y, w, h); }
    for (const t of [g, ge]) { t.fillStyle = t === g ? '#4a3428' : '#000'; t.fillRect(x + w / 2 - 4, y, 8, h); t.fillRect(x, y + h * 0.42, w, 8); }
    g.fillStyle = '#eef4ff'; g.fillRect(x - 12, y + h + 6, w + 24, 12);   // 窓台の雪
  }
  const t1 = texOf(c, [1, 0.5]), t2 = texOf(e, [1, 0.5]);
  return (TexCache.facade = [t1, t2]);
}
// 石積み（段差の擁壁・階段の側面）
function stoneTex() {
  if (TexCache.stone) return TexCache.stone;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#9ea2ae'; g.fillRect(0, 0, S, S);
  for (let row = 0; row < 8; row++) for (let x = -(row % 2) * 64; x < S; x += 128) {
    const v = 150 + Math.random() * 40 | 0; g.fillStyle = `rgb(${v},${v + 4},${v + 14})`; g.fillRect(x + 3, row * 64 + 3, 122, 58);
  }
  noiseCanvas(g, S, 2500, 0.08, '40,40,60');
  return (TexCache.stone = texOf(c));
}
// 岩肌
function rockTex() {
  if (TexCache.rock) return TexCache.rock;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#8a8e9a'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 220; i++) { const v = 100 + Math.random() * 70 | 0; g.fillStyle = `rgba(${v},${v},${v + 12},.5)`; g.beginPath(); g.ellipse(Math.random() * S, Math.random() * S, 20 + Math.random() * 60, 8 + Math.random() * 20, Math.random() * 0.4, 0, 7); g.fill(); }
  g.strokeStyle = 'rgba(30,30,40,.35)'; g.lineWidth = 2;
  for (let k = 0; k < 18; k++) { let x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 5; j++) { x += (Math.random() - 0.3) * 60; y += (Math.random() - 0.5) * 20; g.lineTo(x, y); } g.stroke(); }
  noiseCanvas(g, S, 3000, 0.1, '20,20,30');
  return (TexCache.rock = texOf(c));
}
// 大理石（宮殿の壁）
function marbleTex() {
  if (TexCache.marble) return TexCache.marble;
  const S = 512, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#f2f6fb'; g.fillRect(0, 0, S, S);
  g.strokeStyle = 'rgba(120,140,170,.28)'; g.lineWidth = 1.5;
  for (let k = 0; k < 26; k++) { let x = Math.random() * S, y = Math.random() * S; g.beginPath(); g.moveTo(x, y); for (let j = 0; j < 8; j++) { x += (Math.random() - 0.5) * 70; y += Math.random() * 40; g.lineTo(x, y); } g.stroke(); }
  g.strokeStyle = 'rgba(90,110,150,.45)'; g.lineWidth = 3;
  for (const v of [2, 256]) { g.beginPath(); g.moveTo(0, v); g.lineTo(S, v); g.stroke(); g.beginPath(); g.moveTo(v, 0); g.lineTo(v, S); g.stroke(); }
  return (TexCache.marble = texOf(c));
}
// 板材（坑木・足場）
function woodTex() {
  if (TexCache.wood) return TexCache.wood;
  const S = 256, c = document.createElement('canvas'); c.width = c.height = S; const g = c.getContext('2d');
  g.fillStyle = '#7a5236'; g.fillRect(0, 0, S, S);
  for (let i = 0; i < 8; i++) { g.fillStyle = i % 2 ? 'rgba(0,0,0,.12)' : 'rgba(255,220,180,.06)'; g.fillRect(0, i * 32, S, 30); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(0, i * 32 + 30, S, 2); }
  g.strokeStyle = 'rgba(40,24,12,.25)'; for (let k = 0; k < 40; k++) { const y = Math.random() * S; g.beginPath(); g.moveTo(0, y); g.bezierCurveTo(80, y + 4, 160, y - 4, S, y + 2); g.stroke(); }
  return (TexCache.wood = texOf(c));
}
// 値ノイズ（岩肌の凹凸に使う。ワールド座標の関数なので隣り合う面がつながる）
const hash3 = (x, y, z) => { const h = Math.sin(x * 127.1 + y * 311.7 + z * 74.7) * 43758.5453; return h - Math.floor(h); };
function vnoise(x, y, z) {
  const xi = Math.floor(x), yi = Math.floor(y), zi = Math.floor(z), xf = x - xi, yf = y - yi, zf = z - zi;
  const s = t => t * t * (3 - 2 * t), u = s(xf), v = s(yf), w = s(zf), L = (a, b, t) => a + (b - a) * t;
  const h = (a, b, c) => hash3(xi + a, yi + b, zi + c);
  return L(L(L(h(0, 0, 0), h(1, 0, 0), u), L(h(0, 1, 0), h(1, 1, 0), u), v), L(L(h(0, 0, 1), h(1, 0, 1), u), L(h(0, 1, 1), h(1, 1, 1), u), v), w);
}

// ============================================================
//  地形から建物（床・壁・窓・天井・段差・手すり・階段）を組み立てる
//  戻り値：動く部品（扉・昇降機）
// ============================================================
function buildArchitecture(view, T) {
  const zone = view.zone, S = ARCH_STYLES[zone.arch || 'station'], style = S.look || zone.arch || 'station', th = { ...THEMES[view.ch.bg], ...(zone.th || {}) };
  const line = S.glow || th.line, scene = view.scene, open = T.open, wallH = zone.wallH || S.wallH || 6;
  const A = {};                       // マテリアルごとの GeoAcc
  const acc = (k, s) => A[k] || (A[k] = new GeoAcc(s));
  const std = (color, o = {}) => new THREE.MeshStandardMaterial({ color, metalness: 0.15, roughness: 0.75, ...o });
  const rockM = std(S.rock || '#8a8e9a', { map: rockTex(), roughness: 0.95, metalness: 0.03, flatShading: true });
  const [fac, facE] = style === 'town' && !S.facade ? facadeTex() : [null, null];
  const mats = {
    wall: style === 'station' ? std(S.wall, { map: panelTex('station'), metalness: 0.2, roughness: 0.55 })
      : S.facade === 'stone' ? std(S.wall, { map: stoneTex(), roughness: 0.9, metalness: 0.02 })
      : style === 'town' ? std(S.wall, { map: fac, emissiveMap: facE, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 1.2, roughness: 0.85, metalness: 0.02 })
      : style === 'palace' ? std(S.wall, { map: marbleTex(), metalness: 0.12, roughness: 0.35 }) : rockM,
    wall2: style === 'station' ? std(S.wall2, { map: panelTex('station'), metalness: 0.25, roughness: 0.5 }) : std(S.wall2 || S.wall || '#aaa', { map: style === 'palace' ? marbleTex() : stoneTex(), metalness: 0.15, roughness: 0.4 }),
    trim: style === 'station' ? std(S.trim, { metalness: 0.6, roughness: 0.35 }) : style === 'mine' ? std(S.trim, { map: woodTex(), roughness: 0.9, metalness: 0 }) : std(S.trim, { metalness: 0.35, roughness: 0.55 }),
    cliff: style === 'station' ? std(S.cliff, { map: panelTex('station'), metalness: 0.35, roughness: 0.5 })
      : style === 'palace' ? std(S.cliff, { map: marbleTex(), metalness: 0.12, roughness: 0.4 }) : style === 'town' ? std(S.cliff, { map: stoneTex(), roughness: 0.9, metalness: 0.02 }) : rockM,
    rock: rockM,
    stone: std('#a4a8b4', { map: stoneTex(), roughness: 0.9, metalness: 0.02 }),
    ceil: style === 'mine' ? std(S.ceil, { map: rockTex(), roughness: 0.95, metalness: 0, flatShading: true })
      : style === 'palace' ? std(S.ceil, { map: marbleTex(), roughness: 0.4, metalness: 0.1 }) : std(S.ceil || '#23283e', { map: ceilTex(), metalness: 0.3, roughness: 0.7 }),
    step: style === 'station' ? std(S.step, { metalness: 0.35, roughness: 0.45 }) : style === 'mine' ? std(S.step, { map: woodTex(), roughness: 0.9, metalness: 0 })
      : style === 'palace' ? std(S.step, { map: marbleTex(), roughness: 0.35, metalness: 0.12 }) : std(S.step, { map: stoneTex(), roughness: 0.9, metalness: 0.02 }),
    cap: std(S.cap || '#f2f6ff', { roughness: 0.95, metalness: 0 }),
    wood: std('#8a6040', { map: woodTex(), roughness: 0.9, metalness: 0 }),
    iron: std('#2e3038', { metalness: 0.7, roughness: 0.45 }),
    pit: std('#0c0e1a', { metalness: 0.4, roughness: 0.6 }),
    glow: glowMat(line, 1.6),
    glowSoft: glowMat(line, 0.8),
    lamp: glowMat(S.light || line, 1.6),
    glass: new THREE.MeshStandardMaterial({ color: S.glass, transparent: true, opacity: 0.16, metalness: 0.9, roughness: 0.05, depthWrite: false, side: THREE.DoubleSide }),
    rail: new THREE.MeshStandardMaterial({ color: S.glass, transparent: true, opacity: style === 'palace' ? 0.35 : 0.22, metalness: 0.6, roughness: 0.1, depthWrite: false, side: THREE.DoubleSide }),
    // 川・池・地底湖の水面と底
    water: new THREE.MeshStandardMaterial({ color: th.water || S.water || '#5ab8e8', transparent: true, opacity: 0.8, roughness: 0.06, metalness: 0.25, emissive: th.waterGlow || S.waterGlow || '#2a78b8', emissiveIntensity: 0.3, depthWrite: false }),
    bed: std(th.waterBed || S.waterBed || '#23404a', { roughness: 1, metalness: 0 }),
  };
  // 床：区画のテーマの模様（1マス = 1タイル）
  const [fmap, femap] = floorTextures(th, view.ch.bg);
  for (const t of [fmap, femap]) t.repeat.set(1, 1);
  mats.floor = new THREE.MeshStandardMaterial({ map: fmap, emissiveMap: femap, emissive: new THREE.Color('#ffffff'), emissiveIntensity: th.floorGlow ?? 0.9, metalness: style === 'station' ? 0.3 : 0.05, roughness: style === 'station' ? 0.5 : 0.85 });
  const { cols, rows, kind } = T, K = TK;
  const X = c => c * CELL - T.hw, Zc = r => r * CELL - T.hd;
  const walk = i => i >= 0 && kind[i] >= K.FLOOR;
  // マス i の、辺の端点での高さ（階段は傾き、昇降機はいちばん低い階）
  const hAt = (i, x, z) => kind[i] === K.LIFT ? T.lifts[T.liftOf[i]].levels[0] : kind[i] === K.VOID ? ABYSS : T.groundOf(i, x, z);
  const cabinRoom = i => T.roomOf[i] >= 0 && T.rooms[T.roomOf[i]].cabin;
  const hasRoof = i => !open || cabinRoom(i);
  const flora = T.outdoor === 'flora', lots = T.outdoor === 'lots', EDGE = -1.3;   // 屋外の区画の外側の地面（環境の床）の高さ
  const flat = (key, y, x0, z0, x1, z1, s = 4) => acc(key, s).quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]);

  // 岩肌：面を細かく割り、ワールド座標のノイズで内側の頂点を凹凸させる（隣の面とつながる）
  function rockFace(key, ex, ez, nx, nz, w, ya, yb, amp = 0.4) {
    const G = acc(key, 4), rx = nz, rz = -nx, nu = 3, h = Math.max(ya[1] - ya[0], yb[1] - yb[0]), nv = Math.max(1, Math.ceil(h / 1.3));
    const P = (u, v) => {
      const f = u / nu, y0 = lerp(ya[0], yb[0], f), y1 = lerp(ya[1], yb[1], f), y = lerp(y0, y1, v / nv);
      const x = ex + rx * (f - 0.5) * w, z = ez + rz * (f - 0.5) * w;
      const d = u > 0 && u < nu && v > 0 && v < nv ? (vnoise(x * 0.9, y * 0.8, z * 0.9) - 0.35) * amp * 2 : 0;
      return [x + nx * d, y, z + nz * d];
    };
    for (let u = 0; u < nu; u++) for (let v = 0; v < nv; v++) G.quad(P(u, v), P(u + 1, v), P(u + 1, v + 1), P(u, v + 1));
  }
  // 屋外の壁の上端：雪が張り出す
  const snowLip = (ex, ez, nx, nz, w, y) => acc('cap').slab(ex, ez, nx, nz, w, y - 0.08, y + 0.14, 0.26);

  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const i = r * cols + c, k = kind[i];
    const x0 = X(c), x1 = X(c + 1), z0 = Zc(r), z1 = Zc(r + 1), cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
    // 床（橋は板張り。下に川が流れる）
    if (T.bridge[i]) {
      const y = T.h[i];
      acc('wood', 4).box(x0, y - 0.22, z0, x1, y, z1, 'b');
      flat('water', y - 0.45, x0, z0, x1, z1, 8); flat('bed', y - 1.25, x0, z0, x1, z1, 8);
    } else if (k === K.FLOOR || k === K.DOOR || k === K.EXIT) acc('floor', lots ? 5 : 16).quad([x0, T.h[i], z1], [x1, T.h[i], z1], [x1, T.h[i], z0], [x0, T.h[i], z0]);
    if (k === K.LIFT) { const y = T.lifts[T.liftOf[i]].levels[0] - 0.45; acc('pit').quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]); }
    // 水面：底と、壁・地図の端に面した側面（屋内は天井も）
    if (T.water[i]) {
      const y = T.cap[i];
      flat('water', y, x0, z0, x1, z1, 8); flat('bed', y - 0.8, x0, z0, x1, z1, 8);
      DIR4.forEach(([dc, dr]) => {
        const j = T.idx(c + dc, r + dr), ex = cx + dc * CELL / 2, ez = cz + dr * CELL / 2;
        if (j < 0) { if (open) rockFace('rock', ex, ez, dc, dr, CELL, [EDGE, y], [EDGE, y], 0); }
        else if (!open && kind[j] <= K.WINDOW && !T.water[j]) rockFace('rock', ex, ez, -dc, -dr, CELL, [y - 0.9, T.ceilOf(i)], [y - 0.9, T.ceilOf(i)], 0.4);
      });
      if (hasRoof(i)) acc('ceil', 4).quad([x0, T.ceilOf(i), z0], [x1, T.ceilOf(i), z0], [x1, T.ceilOf(i), z1], [x0, T.ceilOf(i), z1]);
      continue;
    }
    // 木立：地面は床と同じ草地。低いとなり（道・水面・別の高さ）に向いた土の崖
    if (flora && k <= K.WINDOW) {
      const y = T.cap[i];
      acc('floor', 16).quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]);
      DIR4.forEach(([dc, dr]) => {
        const j = T.idx(c + dc, r + dr), ex = cx + dc * CELL / 2, ez = cz + dr * CELL / 2;
        const A = [ex - dr * CELL / 2, ez + dc * CELL / 2], B = [ex + dr * CELL / 2, ez - dc * CELL / 2];
        const low = p => j < 0 ? EDGE : walk(j) ? hAt(j, p[0] + dc * 0.02, p[1] + dr * 0.02) : kind[j] === K.VOID ? ABYSS : T.cap[j];
        const la = low(A), lb = low(B);
        if (Math.max(la, lb) > y - 0.05) return;
        rockFace('rock', ex, ez, dc, dr, CELL, [la, y], [lb, y], j < 0 ? 0 : 0.3);
        if (j >= 0 && walk(j)) snowLip(ex, ez, dc, dr, CELL, y);
      });
      continue;
    }
    // 町の敷地：石敷きの地面と、低いとなりに向いた石の擁壁（上端に笠石）。建物は区画の組み立てで建てる
    if (lots && k <= K.WINDOW) {
      const y = T.cap[i];
      acc('stone', 4).quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]);
      DIR4.forEach(([dc, dr]) => {
        const j = T.idx(c + dc, r + dr), ex = cx + dc * CELL / 2, ez = cz + dr * CELL / 2;
        const lo = j < 0 ? EDGE : walk(j) ? Math.min(hAt(j, ex - dr * 0.9 + dc * 0.02, ez + dc * 0.9 + dr * 0.02), hAt(j, ex + dr * 0.9 + dc * 0.02, ez - dc * 0.9 + dr * 0.02)) : kind[j] === K.VOID ? ABYSS : T.water[j] ? T.cap[j] - 0.8 : T.cap[j];
        if (lo > y - 0.05) return;
        acc('stone', 4).wall(ex, ez, dc, dr, CELL, lo, y);
        if (j >= 0 && walk(j)) snowLip(ex, ez, dc, dr, CELL, y);
      });
      continue;
    }
    // 屋外の壁の塊：上面の雪と、隣の塊より高い部分の側面
    if (open && k <= K.WINDOW) {
      const y = T.top[i];
      acc('cap', 4).quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0]);
      DIR4.forEach(([dc, dr]) => {
        const j = T.idx(c + dc, r + dr), lo = j < 0 ? y - wallH - 6 : T.top[j];   // 地図の外側は下まで
        if (j >= 0 && (kind[j] > K.WINDOW || lo >= y - 0.01)) return;
        const ex = cx + dc * CELL / 2, ez = cz + dr * CELL / 2;
        if (style === 'town' || style === 'palace') { acc('wall', 4).wall(ex, ez, dc, dr, CELL, lo, y); snowLip(ex, ez, dc, dr, CELL, y); }
        else rockFace('rock', ex, ez, dc, dr, CELL, [lo, y], [lo, y], 0.35);
      });
      continue;
    }
    // 天井（屋内・区画間の籠）
    if (hasRoof(i) && (walk(i) && k !== K.DOOR || k === K.VOID)) {
      const y = T.ceilOf(i);
      acc('ceil', 4).quad([x0, y, z0], [x1, y, z0], [x1, y, z1], [x0, y, z1]);
      if (style === 'station') {
        if (c % 3 === 1 && r % 3 === 1) acc('lamp').quad([cx - 0.7, y - 0.05, cz - 0.7], [cx + 0.7, y - 0.05, cz - 0.7], [cx + 0.7, y - 0.05, cz + 0.7], [cx - 0.7, y - 0.05, cz + 0.7]);
        if (r % 4 === 0) acc('trim').box(x0, y - 0.45, z0 - 0.15, x1, y, z0 + 0.15, 't');
      } else if (style === 'mine' && !cabinRoom(i)) {
        if (r % 3 === 0) acc('wood').box(x0, y - 0.55, z0 - 0.22, x1, y, z0 + 0.22, 't');   // 坑木の梁
        if (c % 4 === 2 && r % 4 === 2) { acc('iron').box(cx - 0.02, y - 1.1, cz - 0.02, cx + 0.02, y, cz + 0.02, 't'); acc('lamp').box(cx - 0.16, y - 1.5, cz - 0.16, cx + 0.16, y - 1.1, cz + 0.16, ''); }
      } else if (style === 'palace' && !cabinRoom(i)) {
        if (r % 4 === 0) acc('wall2', 4).box(x0, y - 0.6, z0 - 0.25, x1, y, z0 + 0.25, 't');   // 格天井の梁
        if (c % 4 === 2 && r % 4 === 2) acc('glowSoft').quad([cx - 0.9, y - 0.03, cz - 0.9], [cx + 0.9, y - 0.03, cz - 0.9], [cx + 0.9, y - 0.03, cz + 0.9], [cx - 0.9, y - 0.03, cz + 0.9]);
      }
    }
    if (!walk(i) && k !== K.VOID) continue;
    // 四方の辺
    DIR4.forEach(([dc, dr]) => {
      const j = T.idx(c + dc, r + dr), nk = j < 0 ? K.SOLID : kind[j];
      // 辺の中心と両端（法線は i の内側を向く）
      const ex = cx + dc * CELL / 2, ez = cz + dr * CELL / 2, nx = -dc, nz = -dr;
      const rx = nz, rz = -nx, pa = [ex - rx * CELL / 2, ez - rz * CELL / 2], pb = [ex + rx * CELL / 2, ez + rz * CELL / 2];
      const pull = (p, s = 0.02) => [p[0] + nx * s, p[1] + nz * s];
      const wallTop = j2 => open && j2 >= 0 && kind[j2] <= K.WINDOW ? T.top[j2] : open ? T.h[i] + wallH : T.ceilOf(i);
      if (k === K.VOID) {
        if (nk <= K.WINDOW) { const tp = wallTop(j); if (style === 'station' || style === 'palace' || style === 'town') acc('cliff', 4).wall(ex, ez, nx, nz, CELL, ABYSS, tp); else rockFace('rock', ex, ez, nx, nz, CELL, [ABYSS, tp], [ABYSS, tp], 0.5); }
        return;
      }
      const yA = hAt(i, ...pull(pa)), yB = hAt(i, ...pull(pb)), top = wallTop(j);
      const base = Math.min(yA, yB);
      if (nk <= K.WINDOW) {
        // 出入口の外側（隔壁扉）とエレベーターの籠の内壁は別に作る
        if (k === K.EXIT && !T.exits[T.ch[i]].cabin && T.exits[T.ch[i]].nx === dc * -1 && T.exits[T.ch[i]].nz === dr * -1) return;
        // 水辺：橋は欄干、岸は水面の下まで続く土の斜面
        if (j >= 0 && T.water[j]) {
          if (T.bridge[i]) railing(pa, pb, yA, yB, nx, nz, lots ? 'iron' : 'wood');
          else if (lots) { acc('stone', 4).wall(ex, ez, dc, dr, CELL, T.cap[j] - 0.8, Math.min(yA, yB)); snowLip(ex, ez, -nx, -nz, CELL, Math.min(yA, yB)); railing(pa, pb, yA, yB, nx, nz); }   // 町の運河：石の護岸と手すり
          else rockFace('rock', ex, ez, dc, dr, CELL, [T.cap[j] - 0.8, yB], [T.cap[j] - 0.8, yA], 0.15);
          return;
        }
        if (flora || lots) return;   // 木立の側（崖）は木立のマスで、町の敷地の側は建物で作る
        if (nk === K.WINDOW) wallWindow(ex, ez, nx, nz, base, top, c, r, dc, dr);
        else wallFace(ex, ez, nx, nz, base, top, c, r, dc, dr, k, yA, yB);
        return;
      }
      if (nk === K.DOOR || k === K.DOOR) return;
      const yA2 = hAt(j, pa[0] - nx * 0.02, pa[1] - nz * 0.02), yB2 = hAt(j, pb[0] - nx * 0.02, pb[1] - nz * 0.02);
      // 部屋の境目（天井の高さが違う）：高い部屋の側に下がり壁
      if (hasRoof(i) || hasRoof(j)) {
        const ti = hasRoof(i) ? T.ceilOf(i) : 1e4, tj = hasRoof(j) ? T.ceilOf(j) : 1e4;
        if (tj < ti - 0.05) acc({ station: 'wall', town: 'wall', palace: 'wall2' }[style] || 'rock', 4).wall(ex, ez, nx, nz, CELL, tj, Math.min(ti, tj + wallH));
      }
      // 段差：高い側から低い側を見下ろす面と、高い側の手すり
      const dA = yA - yA2, dB = yB - yB2;
      if (Math.max(dA, dB) <= STEP) return;
      if (k === K.LIFT || nk === K.LIFT) return;                 // 昇降機のまわりは別に作る
      if (k === K.STAIR && nk !== K.VOID && Math.min(yA2, yB2) >= T.h[i] - 0.01) { railing(pa, pb, yA, yB, nx, nz); return; }
      cliffFace(ex, ez, nx, nz, yA, yB, yA2, yB2);
      railing(pa, pb, yA, yB, nx, nz);
    });
  }

  // 段差の面（低い側を向く）と上端の縁
  function cliffFace(ex, ez, nx, nz, yA, yB, yA2, yB2) {
    const flat = Math.abs(yA - yB) < 0.01, top = Math.max(yA, yB);
    if (style === 'cliff' || style === 'mine') rockFace('rock', ex, ez, -nx, -nz, CELL, [yB2, yB], [yA2, yA], 0.3);
    else acc(style === 'town' ? 'stone' : 'cliff', 4).wall(ex, ez, -nx, -nz, CELL, 0, 0, 0, [yB2, yB], [yA2, yA]);
    if (style === 'station') {
      if (flat) { acc('trim').slab(ex, ez, -nx, -nz, CELL, yA - 0.45, yA, 0.08); acc('glow').slab(ex, ez, -nx, -nz, CELL, yA - 0.62, yA - 0.54, 0.04); }
      else acc('glow').wall(ex, ez, -nx, -nz, CELL, 0, 0, 0.03, [yB - 0.16, yB - 0.08], [yA - 0.16, yA - 0.08]);
    } else if (style === 'palace') {
      if (flat) { acc('wall2', 4).slab(ex, ez, -nx, -nz, CELL, yA - 0.5, yA, 0.12); acc('glow').slab(ex, ez, -nx, -nz, CELL, yA - 0.62, yA - 0.56, 0.06); }
    } else if (style === 'mine') {
      if (flat) acc('wood').slab(ex, ez, -nx, -nz, CELL, yA - 0.35, yA, 0.12);
    } else if (flat) snowLip(ex, ez, -nx, -nz, CELL, top);
  }
  // 壁の面
  function wallFace(ex, ez, nx, nz, y0, top, c, r, dc, dr, k, yA, yB) {
    const along = dr ? c : r, slope = k === K.STAIR && Math.abs(yA - yB) > 0.01;
    const px = dr ? X(c) : ex, pz = dr ? ez : Zc(r);   // 付け柱の位置（辺の端）
    const pc = c - (dr ? 1 : 0), pr = r - (dc ? 1 : 0), pi = T.idx(pc, pr), pj = T.idx(pc + dc, pr + dr);
    const straight = walk(pi) && pj >= 0 && kind[pj] <= K.WINDOW && Math.abs(T.h[pi] - y0) < 0.05 && k !== K.LIFT;
    if (style === 'station') return wallPanel(ex, ez, nx, nz, y0, top, c, r, dc, dr, k, yA, yB);
    const lo = slope ? T.h[T.idx(c, r)] - 0.02 : y0;
    if (style === 'cliff' || style === 'mine') {
      rockFace('rock', ex, ez, nx, nz, CELL, [lo - 0.3, top], [lo - 0.3, top], style === 'mine' ? 0.45 : 0.55);
      if (style === 'cliff') snowLip(ex, ez, nx, nz, CELL, top);
      if (style === 'mine' && straight && along % 3 === 0) {      // 坑木の柱と、壁のランタン
        acc('wood').slab(px, pz, nx, nz, 0.4, y0, top, 0.42);
        if (along % 6 === 0) { acc('iron').slab(ex, ez, nx, nz, 0.06, y0 + 2.6, y0 + 2.7, 0.45); acc('lamp').slab(ex, ez, nx, nz, 0.26, y0 + 2.15, y0 + 2.55, 0.5, 0.2); }
      }
      return;
    }
    // 町（石の土台＋漆喰の外壁）と宮殿（大理石）
    acc('wall', 4).wall(ex, ez, nx, nz, CELL, lo, top);
    if (slope) { acc(style === 'town' ? 'stone' : 'wall2', 4).wall(ex, ez, nx, nz, CELL, 0, 0, 0.05, [yA - 0.05, yA + 0.5], [yB - 0.05, yB + 0.5]); return; }
    if (style === 'town') {
      acc('stone', 4).slab(ex, ez, nx, nz, CELL, y0, y0 + 0.9, 0.1);
      acc('trim').slab(ex, ez, nx, nz, CELL, top - 0.4, top - 0.05, 0.22);
      snowLip(ex, ez, nx, nz, CELL, top);
      if (S.facade === 'stone' && along % 2 === 0) {   // 城壁の狭間
        const mx = ex - nx * 0.5, mz = ez - nz * 0.5;
        acc('wall', 4).box(mx - 0.5, top, mz - 0.5, mx + 0.5, top + 1.1, mz + 0.5, 'b');
        acc('cap').box(mx - 0.55, top + 1.1, mz - 0.55, mx + 0.55, top + 1.22, mz + 0.55, 'b');
      }
      if (straight && along % 5 === 2) { acc('iron').slab(ex, ez, nx, nz, 0.06, y0 + 3.3, y0 + 3.4, 0.5); acc('lamp').slab(ex, ez, nx, nz, 0.3, y0 + 2.9, y0 + 3.3, 0.55, 0.15); }
    } else {   // palace
      acc('wall2', 4).slab(ex, ez, nx, nz, CELL, y0, y0 + 0.55, 0.12);
      acc('glow').slab(ex, ez, nx, nz, CELL, y0 + 0.55, y0 + 0.6, 0.08);
      const cy = Math.min(top - 0.6, y0 + 6.2);
      acc('wall2', 4).slab(ex, ez, nx, nz, CELL, cy, cy + 0.45, 0.18);
      acc('glowSoft').slab(ex, ez, nx, nz, CELL, cy - 0.06, cy, 0.1);
      if (straight && along % 4 === 0) { acc('wall2', 4).slab(px, pz, nx, nz, 0.9, y0, cy, 0.34); acc('glow').slab(px, pz, nx, nz, 0.12, y0 + 0.9, cy - 0.5, 0.36); }
    }
  }
  // 宇宙ステーションの壁パネル：幅木・光の帯・付け柱
  function wallPanel(ex, ez, nx, nz, y0, top, c, r, dc, dr, k, yA, yB) {
    const W = acc('wall', 4), trim = acc('trim'), glow = acc('glow');
    if (k === K.STAIR && Math.abs(yA - yB) > 0.01) {
      W.wall(ex, ez, nx, nz, CELL, T.h[T.idx(c, r)] - 0.02, top);
      trim.wall(ex, ez, nx, nz, CELL, 0, 0, 0.04, [yA - 0.05, yA + 0.3], [yB - 0.05, yB + 0.3]);
      glow.wall(ex, ez, nx, nz, CELL, 0, 0, 0.05, [yA + 0.3, yA + 0.36], [yB + 0.3, yB + 0.36]);
      return;
    }
    W.wall(ex, ez, nx, nz, CELL, y0, top);
    trim.slab(ex, ez, nx, nz, CELL, y0, y0 + 0.32, 0.08);
    glow.slab(ex, ez, nx, nz, CELL, y0 + 0.32, y0 + 0.38, 0.05);
    glow.slab(ex, ez, nx, nz, CELL, y0 + 3.0, y0 + 3.07, 0.04);
    if (top - y0 > 5.5) {
      trim.slab(ex, ez, nx, nz, CELL, y0 + 4.4, y0 + 4.9, 0.14);
      acc('wall2', 4).wall(ex, ez, nx, nz, CELL, y0 + 4.9, top, 0.01);
    }
    if (k !== K.STAIR && k !== K.LIFT) {
      const rx = nz, rz = -nx, fx = ex + nx * 0.42, fz = ez + nz * 0.42, gx = ex + nx * 0.5, gz = ez + nz * 0.5;
      acc('glowSoft').quad([fx - rx, y0 + 0.02, fz - rz], [gx - rx, y0 + 0.02, gz - rz], [gx + rx, y0 + 0.02, gz + rz], [fx + rx, y0 + 0.02, fz + rz]);
    }
    const along = dr ? c : r;
    if (along % 4 === 0 && k !== K.LIFT) {
      const px = dr ? X(c) : ex, pz = dr ? ez : Zc(r);
      const pc = c - (dr ? 1 : 0), pr = r - (dc ? 1 : 0), pi = T.idx(pc, pr), pj = T.idx(pc + dc, pr + dr);
      if (walk(pi) && pj >= 0 && kind[pj] === K.SOLID && Math.abs(T.h[pi] - y0) < 0.05) {
        trim.slab(px, pz, nx, nz, 0.7, y0, top, 0.32);
        glow.slab(px, pz, nx, nz, 0.1, y0 + 0.6, top - 0.6, 0.34);
      }
    }
  }
  // 窓：腰壁・ガラス・縦桟・欄間
  function wallWindow(ex, ez, nx, nz, y0, top, c, r) {
    const winTop = Math.min(top - 0.9, y0 + 7.5), W = acc('wall', 4), trim = acc(style === 'palace' ? 'wall2' : 'trim', 4);
    W.wall(ex, ez, nx, nz, CELL, y0, y0 + 0.75);
    trim.slab(ex, ez, nx, nz, CELL, y0 + 0.75, y0 + 0.85, 0.25);
    acc('glow').slab(ex, ez, nx, nz, CELL, y0 + 0.85, y0 + 0.9, 0.2);
    acc('glass').wall(ex, ez, nx, nz, CELL, y0 + 0.85, winTop, -0.3);
    W.wall(ex, ez, nx, nz, CELL, winTop, top);
    trim.slab(ex, ez, nx, nz, CELL, winTop - 0.12, winTop, 0.2);
    const rx = nz, rz = -nx;
    for (const s of [-1, 1]) trim.slab(ex + rx * s * (CELL / 2 - 0.08), ez + rz * s * (CELL / 2 - 0.08), nx, nz, 0.16, y0 + 0.85, winTop, 0.12, -0.3);
  }
  // 手すり：ガラス（ステーション）／氷の欄干（宮殿）／鉄柵（町）／木の柵（崖・坑道）
  function railing(pa, pb, ya, yb, nx, nz, kindOf = S.rail) {
    if (kindOf === 'none') return;
    const ins = 0.12, a = [pa[0] + nx * ins, pa[1] + nz * ins], b = [pb[0] + nx * ins, pb[1] + nz * ins];
    const mx = (a[0] + b[0]) / 2, mz = (a[1] + b[1]) / 2;
    const bar = (key, h0, h1) => { acc(key, 4).wall(mx, mz, nx, nz, CELL, 0, 0, 0.03, [ya + h0, ya + h1], [yb + h0, yb + h1]); acc(key, 4).wall(mx, mz, -nx, -nz, CELL, 0, 0, 0.03, [yb + h0, yb + h1], [ya + h0, ya + h1]); };
    const post = (key, p, y, w, h) => acc(key, 4).box(p[0] - w, y, p[1] - w, p[0] + w, y + h, p[1] + w);
    if (kindOf === 'glass' || kindOf === 'ice') {
      acc('rail').wall(mx, mz, nx, nz, CELL, 0, 0, 0, [ya + 0.05, ya + 1.0], [yb + 0.05, yb + 1.0]);
      bar('glow', 1.0, 1.08);
      for (const [p, y] of [[a, ya], [b, yb]]) post(kindOf === 'ice' ? 'wall2' : 'trim', p, y, kindOf === 'ice' ? 0.09 : 0.05, 1.1);
    } else if (kindOf === 'iron') {
      bar('iron', 1.0, 1.07); bar('iron', 0.12, 0.18);
      for (const f of [0, 0.25, 0.5, 0.75]) { const y = lerp(ya, yb, f); post('iron', [lerp(a[0], b[0], f), lerp(a[1], b[1], f)], y, f ? 0.02 : 0.05, 1.05); }
      bar('cap', 1.07, 1.12);
    } else {   // 木の柵
      bar('wood', 0.95, 1.08); bar('wood', 0.45, 0.56);
      for (const [p, y] of [[a, ya], [b, yb]]) post('wood', p, y - 0.1, 0.07, 1.2);
    }
  }

  // 階段：段ごとの箱（ステーションと宮殿は光る段鼻）
  const stairSeen = new Uint8Array(kind.length);
  for (let i = 0; i < kind.length; i++) {
    if (kind[i] !== K.STAIR || stairSeen[i]) continue;
    const ch = T.ch[i], cells = T.flood(i, k => kind[k] === K.STAIR && T.ch[k] === ch && !stairSeen[k], k => { stairSeen[k] = 1; });
    const b = T.bounds(cells), s = T.stairs.get(i), steps = Math.max(2, Math.round(Math.abs(s.h1 - s.h0) / 0.3));
    const base = Math.min(s.h0, s.h1) - 0.02, nose = style === 'station' || style === 'palace';
    for (let n = 0; n < steps; n++) {
      const t0 = n / steps, t1 = (n + 1) / steps, y = s.h0 + (s.h1 - s.h0) * (n + 0.5) / steps;
      const a0 = s.start + s.up * s.len * t0, a1 = s.start + s.up * s.len * t1;
      const lo = Math.min(a0, a1), hi = Math.max(a0, a1);
      const X0 = b.c0 * CELL - T.hw, X1 = (b.c1 + 1) * CELL - T.hw, Z0 = b.r0 * CELL - T.hd, Z1 = (b.r1 + 1) * CELL - T.hd;
      const f = s.up < 0 ? hi : lo;   // 段鼻（下の段の側）
      if (s.axis === 'z') {
        acc('step', 4).box(X0, base, lo, X1, y, hi);
        if (nose) acc('glowSoft').box(X0 + 0.1, y - 0.04, f - 0.03, X1 - 0.1, y + 0.005, f + 0.03, 'b');
      } else {
        acc('step', 4).box(lo, base, Z0, hi, y, Z1);
        if (nose) acc('glowSoft').box(f - 0.03, y - 0.04, Z0 + 0.1, f + 0.03, y + 0.005, Z1 - 0.1, 'b');
      }
    }
  }

  // 扉（D）：上の壁と扉板。ステーションは左右に滑り、それ以外は観音開き
  const doorMat = style === 'station' ? new THREE.MeshStandardMaterial({ color: '#3a4266', metalness: 0.7, roughness: 0.3 })
    : style === 'palace' ? new THREE.MeshStandardMaterial({ color: '#e8eef8', map: marbleTex(), metalness: 0.2, roughness: 0.35 })
    : new THREE.MeshStandardMaterial({ color: '#8a6040', map: woodTex(), metalness: 0, roughness: 0.85 });
  const doors = T.doors.map(d => {
    const X0 = d.c0 * CELL - T.hw, X1 = (d.c1 + 1) * CELL - T.hw, Z0 = d.r0 * CELL - T.hd, Z1 = (d.r1 + 1) * CELL - T.hd;
    let top = 0;
    if (open) d.cells.forEach(i => { const c = T.colOf(i), r = T.rowOf(i); DIR4.forEach(([dc, dr]) => { const j = T.idx(c + dc, r + dr); if (j >= 0 && kind[j] <= K.WINDOW) top = Math.max(top, T.top[j]); }); });
    else d.cells.forEach(i => { top = Math.max(top, T.ceilOf(i)); });
    if (!top) top = d.h + wallH;
    const dh = Math.min(style === 'station' ? 4 : style === 'palace' ? 5.5 : 4.2, top - d.h - 0.5);
    acc(style === 'station' || style === 'palace' || style === 'town' ? 'wall' : 'rock', 4).box(X0, d.h + dh, Z0, X1, top, Z1, 't');
    if (open) { acc('cap', 4).box(X0, top, Z0, X1, top + 0.12, Z1, 'b'); }
    acc(style === 'mine' ? 'wood' : style === 'palace' ? 'wall2' : 'trim', 4).box(X0 - 0.02, d.h + dh - 0.25, Z0 - 0.02, X1 + 0.02, d.h + dh, Z1 + 0.02, 't');
    const g = new THREE.Group(); g.position.set(d.x, d.h, d.z); if (!d.alongX) g.rotation.y = Math.PI / 2;
    scene.add(g);
    const w = d.alongX ? d.w : d.d;
    let panels, apply;
    if (S.door === 'slide') {
      panels = [-1, 1].map(s => {
        const p = new THREE.Group(); g.add(p);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w / 2, dh, 0.22), doorMat); m.position.set(s * w / 4, dh / 2, 0); p.add(m);
        const strip = new THREE.Mesh(new THREE.BoxGeometry(0.08, dh * 0.8, 0.24), mats.glow); strip.position.set(s * 0.12, dh / 2, 0); p.add(strip);
        const band = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.4, 0.1, 0.24), mats.glowSoft); band.position.set(s * w / 4, dh * 0.62, 0); p.add(band);
        return { p, s };
      });
      apply = o => panels.forEach(q => { q.p.position.x = q.s * o * (w / 2 - 0.1); });
    } else {
      // 観音開き：蝶番は両端、扉は奥（-Z）へ開く
      const band = style === 'palace' ? glowMat(line, 1.2) : mats.iron;
      panels = [-1, 1].map(s => {
        const p = new THREE.Group(); p.position.x = s * w / 2; g.add(p);
        const m = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.04, dh, 0.16), doorMat); m.position.set(-s * w / 4, dh / 2, 0); m.castShadow = true; p.add(m);
        for (const y of [0.25, 0.75]) { const bnd = new THREE.Mesh(new THREE.BoxGeometry(w / 2 - 0.1, 0.1, 0.19), band); bnd.position.set(-s * w / 4, dh * y, 0); p.add(bnd); }
        const ring = new THREE.Mesh(new THREE.TorusGeometry(0.1, 0.02, 6, 12), mats.iron); ring.position.set(-s * (w / 2 - 0.35), dh * 0.45, 0.1); p.add(ring);
        return { p, s };
      });
      apply = o => panels.forEach(q => { q.p.rotation.y = q.s * o * 1.5; });
    }
    return { ...d, g, panels, w, dh, apply };
  });

  // 昇降機：床板・柱・枠・乗り場の柵（ステーションは光る近未来の昇降機、それ以外は鉄の籠と鎖）
  const cage = S.lift === 'cage';
  const lifts = T.lifts.map(L => {
    const lo = L.levels[0], hi = L.levels[L.levels.length - 1];
    const X0 = L.c0 * CELL - T.hw, X1 = (L.c1 + 1) * CELL - T.hw, Z0 = L.r0 * CELL - T.hd, Z1 = (L.r1 + 1) * CELL - T.hd;
    const tr = acc(cage ? 'iron' : 'trim', 4), gl = acc('glow');
    for (const [px, pz] of [[X0, Z0], [X1, Z0], [X0, Z1], [X1, Z1]]) {
      tr.box(px - 0.16, lo - 0.45, pz - 0.16, px + 0.16, hi + 3.6, pz + 0.16);
      if (!cage) { acc('glowSoft').box(px - 0.03, lo, pz - 0.17, px + 0.03, hi + 3.4, pz + 0.17, 'bt'); acc('glowSoft').box(px - 0.17, lo, pz - 0.03, px + 0.17, hi + 3.4, pz + 0.03, 'bt'); }
    }
    tr.box(X0 - 0.2, hi + 3.4, Z0 - 0.2, X1 + 0.2, hi + 3.8, Z1 + 0.2, '');
    if (!cage) gl.box(X0 + 0.2, hi + 3.35, Z0 + 0.2, X1 - 0.2, hi + 3.4, Z1 - 0.2, 't');
    else { tr.box(L.x - 0.12, hi + 3.8, Z0 - 0.2, L.x + 0.12, hi + 4.3, Z1 + 0.2, ''); }
    const shaft = acc(style === 'station' ? 'cliff' : style === 'palace' ? 'wall2' : style === 'town' ? 'stone' : 'rock', 4);
    const plat = new THREE.Group(); scene.add(plat);
    const pm = cage ? new THREE.MeshStandardMaterial({ color: '#8a6040', map: woodTex(), metalness: 0, roughness: 0.85 }) : new THREE.MeshStandardMaterial({ color: '#3d4466', metalness: 0.7, roughness: 0.3 });
    const deck = new THREE.Mesh(new THREE.BoxGeometry(L.w - 0.08, 0.35, L.d - 0.08), pm); deck.position.y = -0.175; deck.receiveShadow = true; plat.add(deck);
    const ring = new THREE.Mesh(new THREE.BoxGeometry(L.w - 0.3, 0.03, L.d - 0.3), cage ? mats.iron : mats.glowSoft); ring.position.y = 0.01; plat.add(ring);
    const inner = new THREE.Mesh(new THREE.BoxGeometry(L.w - 0.5, 0.035, L.d - 0.5), pm); inner.position.y = 0.015; plat.add(inner);
    const arrows = [], chains = [];
    for (const s of [-1, 1]) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 3), mats.glow); a.rotation.set(-Math.PI / 2, 0, s > 0 ? 0 : Math.PI); a.scale.z = 0.15; a.position.set(0, 0.05, s * 0.4); plat.add(a); arrows.push(a);
    }
    if (cage) {
      // 鎖（床板から上の枠まで、長さは毎フレーム合わせる）と、隅のランタン
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 1, 6), mats.iron); m.position.set(dx * (L.w / 2 - 0.3), 0.5, dz * (L.d / 2 - 0.3)); plat.add(m);
        chains.push({ m, top: hi + 3.4 });
      }
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), mats.lamp); lamp.position.set(L.w / 2 - 0.35, 1.3, -(L.d / 2 - 0.35)); plat.add(lamp);
      const pole = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.3, 0.06), mats.iron); pole.position.set(L.w / 2 - 0.35, 0.65, -(L.d / 2 - 0.35)); plat.add(pole);
    }
    plat.position.set(L.x, L.y, L.z);
    const gates = [];
    const gateMat = cage ? mats.iron : mats.rail;
    for (const j of L.cells) {
      const c = T.colOf(j), r = T.rowOf(j);
      DIR4.forEach(([dc, dr]) => {
        const k = T.idx(c + dc, r + dr); if (k < 0 || !T.isFloorKind(kind[k]) && kind[k] !== K.STAIR) return;
        const hk = T.h[k], ex = T.cx(c) + dc * CELL / 2, ez = T.cz(r) + dr * CELL / 2;
        if (hk > lo + 0.05) shaft.wall(ex, ez, -dc, -dr, CELL, lo - 0.45, hk);
        let gm;
        if (cage) {   // 鉄格子の柵
          gm = new THREE.Group();
          for (const y of [-0.5, 0.5]) { const b = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.1, 0.06, 0.06), gateMat); b.position.y = y; gm.add(b); }
          for (let n = 0; n < 7; n++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.04, 1.05, 0.04), gateMat); b.position.x = -CELL / 2 + 0.15 + n * (CELL - 0.3) / 6; gm.add(b); }
        } else {
          gm = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.1, 1.05, 0.06), gateMat);
          const gt = new THREE.Mesh(new THREE.BoxGeometry(CELL - 0.1, 0.07, 0.1), mats.glow); gt.position.y = 0.55; gm.add(gt);
        }
        gm.position.set(ex + dc * 0.05, hk + 0.55, ez + dr * 0.05); if (dc) gm.rotation.y = Math.PI / 2;
        scene.add(gm); gates.push({ m: gm, y: hk });
      });
    }
    const update = () => chains.forEach(ch => { const len = Math.max(0.1, ch.top - L.y); ch.m.scale.y = len; ch.m.position.y = len / 2; });
    update();
    return { L, plat, arrows, gates, update };
  });

  // 土の道（,）：マスの形がそのまま出ないよう、ぼかした塗り絵を床に重ねる
  if (T.paint.some(v => v)) {
    const P = 16, cv = document.createElement('canvas'); cv.width = cols * P; cv.height = rows * P;
    const g = cv.getContext('2d'), col = th.path || S.path || '#b8946a', rnd = seeded(cols * 31 + rows);
    g.filter = `blur(${P * 0.32}px)`; g.fillStyle = col;
    for (let i = 0; i < kind.length; i++) if (T.paint[i]) {
      const c = T.colOf(i), r = T.rowOf(i);
      g.beginPath(); g.ellipse((c + 0.5) * P + (rnd() - 0.5) * P * 0.3, (r + 0.5) * P + (rnd() - 0.5) * P * 0.3, P * 0.72, P * 0.72, 0, 0, Math.PI * 2); g.fill();
    }
    g.filter = 'none';
    // 小石とわだち
    for (let i = 0; i < kind.length; i++) if (T.paint[i]) for (let n = 0; n < 5; n++) {
      g.fillStyle = rnd() < 0.5 ? 'rgba(255,245,220,.35)' : 'rgba(70,50,30,.3)';
      g.beginPath(); g.arc((T.colOf(i) + rnd()) * P, (T.rowOf(i) + rnd()) * P, 0.6 + rnd() * 1.2, 0, Math.PI * 2); g.fill();
    }
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 8;
    const pm = new THREE.MeshStandardMaterial({ map: tex, transparent: true, depthWrite: false, roughness: 1, metalness: 0, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
    const G = new GeoAcc(), W = cols * CELL, D = rows * CELL, uv = (x, z) => [(x + T.hw) / W, 1 - (z + T.hd) / D];
    for (let i = 0; i < kind.length; i++) {
      if (!(kind[i] === K.FLOOR || kind[i] === K.EXIT) || T.bridge[i]) continue;
      const c = T.colOf(i), r = T.rowOf(i);
      let near = false;
      for (let dr = -1; dr <= 1 && !near; dr++) for (let dc = -1; dc <= 1; dc++) { const j = T.idx(c + dc, r + dr); if (j >= 0 && T.paint[j] && Math.abs(T.h[j] - T.h[i]) < 0.05) { near = true; break; } }
      if (!near) continue;
      const x0 = X(c), x1 = X(c + 1), z0 = Zc(r), z1 = Zc(r + 1), y = T.h[i] + 0.01;
      G.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], [uv(x0, z1), uv(x1, z1), uv(x1, z0), uv(x0, z0)]);
    }
    const pmesh = G.mesh(pm); if (pmesh) { pmesh.renderOrder = 1; scene.add(pmesh); }
  }
  // 水面のきらめき
  if (A.water && view.zoneTicks) view.zoneTicks.push((dt, t) => { mats.water.emissiveIntensity = 0.26 + Math.sin(t * 1.3) * 0.06; });

  // まとめて追加
  const noRecv = ['glow', 'glowSoft', 'lamp', 'glass', 'rail', 'water'];
  for (const [k, G] of Object.entries(A)) { const m = G.mesh(mats[k], { receive: !noRecv.includes(k) }); if (m) { if (k === 'glass' || k === 'rail' || k === 'water') m.renderOrder = 2; scene.add(m); } }
  return { doors, lifts, mats };
}

// 屋内：空の映り込みを弱め、環境光を明るく白っぽく（探索と会話シーンで共用）
function interiorLighting(view, zone) {
  const th = zone.th || {}, S = ARCH_STYLES[zone.arch || 'station'] || {};
  view.env.floor.visible = false;
  // 屋外（雪の町・崖・木立）は空とテーマの光のまま。野外の区画は地図の外にも地面が続く（少し低く）
  if (S.roof === false) {
    if (S.outdoor) { view.env.floor.visible = true; view.env.floor.position.y = -1.3; }
    if (th.fog) view.scene.fog.color.set(th.fog); if (th.fogD) view.scene.fog.density = th.fogD; return;
  }
  view.scene.environmentIntensity = 0.12;
  view.env.root.traverse(o => {
    if (o.isHemisphereLight) { o.color.set(th.sky || '#dfe6ff'); o.groundColor.set(th.ground || '#3a3a58'); o.intensity = 1.25 * (th.light || 1); }
    else if (o.isDirectionalLight && o !== view.env.key) { o.color.set('#b8c6ff'); o.intensity *= 0.35; }
  });
  view.scene.fog.color.set(th.fog || '#141a2e'); view.scene.fog.density = th.fogD || 0.012;
}

// ------------------------------------------------------------
//  区画データの整理：マップのある区画は寸法を決め、マス座標をワールド座標に直す
// ------------------------------------------------------------
// world：地図があっても座標はワールド（m）で書く区画（野外の区画）
function zonePoint(zone, p) {
  if (!zone.map || !p || zone.world) return p;
  const w = zone.map[0].length * CELL, d = zone.map.length * CELL;
  return [(p[0] + 0.5) * CELL - w / 2, (p[1] + 0.5) * CELL - d / 2];
}
function prepareMapZones(zones) {
  for (const Z of Object.values(zones)) {
    if (!Z.map || Z.prepared) continue;
    Z.prepared = true;
    Z.w = Z.map[0].length * CELL; Z.d = Z.map.length * CELL;
    for (const k of ['anchor', 'spawn', 'portal']) if (Z[k]) Z[k] = zonePoint(Z, Z[k]);
    for (const list of [Z.npcs, Z.notes, Z.safe]) (list || []).forEach(o => { o.at = zonePoint(Z, o.at); });
    if (Z.chestAt) Z.chestAt = Z.chestAt.map(p => zonePoint(Z, p));
    // エレベーターの行き先ごとに出口を分ける（区画の経路探索・区画マップ用）
    Z.exits = Z.exits.flatMap(e => e.lift ? e.lift.map(to => ({ key: e.key, to, lift: e.lift, name: e.name })) : [e]);
  }
}
