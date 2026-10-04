'use strict';
// ============================================================
//  フィールド探索（3D）— 章ごとに複数の区画がゲートでつながる
//  WASD 移動／ドラッグで視点／クリック・J で攻撃（先制）／E 初手技／F 調べる・話す／M ワールドマップ
//  仲間は先頭の子のうしろを一列になってついてくる
// ============================================================
function seeded(seed) {
  return () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const hashStr = s => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) | 0, 7);
// 敵・住人は昇降機・扉・出入口を通らない（部屋の中を歩き回る）
const NPC_PASS = { noLift: true, noDoor: true, noExit: true };
const lerpAngle = (a, b, t) => { let d = ((b - a + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI; return a + d * t; };

function stagePools(stageId) {
  const st = allStages().find(s => s.id === stageId), normals = new Set(), elites = new Set();
  st.waves.flat().forEach(k => { const d = ENEMIES[k]; if (!d.boss) (d.elite ? elites : normals).add(k); });
  if (!normals.size) normals.add('slime');
  return { normals: [...normals], elites: [...elites], lv: st.lv };
}

// 探索セッション：区画を移動しても引き継ぐ状態
class FieldSession {
  constructor(ci) {
    this.ci = ci;
    this.team = teamMembers().map(m => ({ ...m, hpRatio: 1, energy: null }));
    this.leader = 0; this.techs = new Set();
    this.defeated = {}; this.broken = {};
  }
  set(map, zone) { return map[zone] || (map[zone] = new Set()); }
}

class FieldView extends BaseView {
  constructor(session, zoneId, arrival = { spawn: true }) {
    const zone = FIELD_ZONES[zoneId], ch = CHAPTERS[zone.ci], bg = zone.bg || ch.bg;
    super(bg, 50, { field: true, bare: true, zone });
    this.s = session; this.zoneId = zoneId; this.zone = zone; this.ci = zone.ci; this.ch = ch; this.bg = bg;
    this.persist = true; this.bloomStrength = { cave: 0.7, root: 0.7, end: 0.7, tower: 0.6 }[bg] || 0.45;
    this.exposure = { meadow: 0.95, road: 0.95, dream: 0.9 }[bg] || 1.0;
    this.keys = new Set(); this.busy = false; this.grace = 1.5;
    this.camYaw = 0; this.camPitch = 0.4; this.camDist = 4.8;
    this.colliders = [];
    this.zoneTicks = []; this.emitters = [];
    this.rand = seeded(hashStr(zoneId));
    this.hw = zone.w / 2; this.hd = zone.d / 2;
    // マップのある区画：部屋・通路・段差・昇降機でできた地形（ない区画は平らな床）
    this.T = zone.map ? new Terrain(zone) : null;
    if (this.T) {
      interiorLighting(this, zone);
      (zone.exits || []).forEach(e => { if (!e.lift && !zoneOpen(e.to)) this.T.locked.add(e.key); });
    }
    // 安全エリア（人が暮らす区画・区画内の居住地）：敵が出現せず、中へ追ってもこない
    this.town = zoneCalm(zone);
    this.safe = (zone.safe || []).map(a => ({ x: a.at[0], z: a.at[1], r: a.r, name: a.name }));
    (Save.data.fieldVisited || (Save.data.fieldVisited = {}))[zoneId] = true; Save.save();
    this.buildWorld();
    this.setupQuest();
    this.buildUI();
    const sp = this.arrivalPoint(arrival);
    this.spawnPlayer(V3(sp.x, 0, sp.z), sp.yaw);
    this.camYaw = sp.yaw + Math.PI;
    const gy = this.gy(sp.x, sp.z);
    this.camera.position.set(sp.x + Math.sin(this.camYaw) * 7, gy + 3.5, sp.z + Math.cos(this.camYaw) * 7);
    this.curLook.set(sp.x, gy + 1.4, sp.z);
    // 目的地の上から再開した場合は、一度離れるまで到着扱いにしない
    this.questHold = !!(this.quest && !this.quest.gate && Math.hypot(this.quest.pos.x - sp.x, this.quest.pos.z - sp.z) < 2.4);
    this.rememberPos();
    Music.play(zone.bgm || (zone.town ? 'village' : ['cave', 'root', 'end'].includes(bg) ? 'dark' : 'field'));
  }
  // 探索を離れた位置を記録し、次に探索するときにそこから再開する
  rememberPos() {
    const p = this.player.pos;
    Save.data.fieldResume = { ci: this.ci, zone: this.zoneId, x: +p.x.toFixed(2), z: +p.z.toFixed(2), yaw: +this.player.yaw.toFixed(3) };
    Save.save();
  }
  get team() { return this.s.team; }
  get leader() { return this.s.leader; }
  set leader(v) { this.s.leader = v; }
  get techs() { return this.s.techs; }

  arrivalPoint(a) {
    const Z = this.zone;
    if (a.from) {
      const g = this.gates.find(x => x.exit.to === a.from);
      // 区画間エレベーターで来たときは籠の中から
      if (g && g.phys && g.phys.cabin) return { x: g.phys.cx, z: g.phys.cz, yaw: Math.atan2(g.nx, g.nz) };
      if (g) return { x: g.x + g.nx * 3.5, z: g.z + g.nz * 3.5, yaw: Math.atan2(g.nx, g.nz) };
    }
    // 前回の位置（地形が変わって立てない場所になっていたら時空アンカーから）
    if (a.pos && (!this.T || this.T.fits(a.pos.x, a.pos.z, 0.4))) return a.pos;
    // ねこ地蔵のそばに、区画の中ほどを向いて立つ（カメラが地蔵にかからないよう少し横へ）
    if (a.anchor) {
      const [ax, az] = Z.anchor, l = Math.hypot(ax, az), dx = l > 1 ? -ax / l : 0, dz = l > 1 ? -az / l : 1;
      const x = ax + dx * 5 + dz * 0.6, z = az + dz * 5 - dx * 0.6;
      if (!this.T || this.T.fits(x, z, 0.4)) return { x, z, yaw: Math.atan2(dx, dz) };
      return { x: ax, z: az + 2, yaw: Math.PI };
    }
    const s = Z.spawn || Z.anchor;
    return { x: s[0], z: s[1] + (Z.spawn ? 0 : 2), yaw: Math.PI };
  }

  // ============================================================
  //  当たり判定（円と軸平行の箱）
  // ============================================================
  // 床の高さ（平らな区画は 0）
  gy(x, z) {
    if (!this.T) return 0;
    const h = this.T.groundAt(x, z);
    return Number.isFinite(h) && h > ABYSS ? h : this.T.baseAt(x, z);
  }
  hitsCol(c, x, z, pad, h) {
    // 別の階の小物にはぶつからない
    if (h != null && c.y != null && Math.abs(c.y - h) > 2) return false;
    if (c.box) return Math.abs(x - c.x) < c.hw + pad && Math.abs(z - c.z) < c.hd + pad;
    return Math.hypot(c.x - x, c.z - z) < c.r + pad;
  }
  blocked(x, z, pad) {
    if (this.T) {
      const h = this.T.groundAt(x, z);
      if (!this.T.fits(x, z, pad, h, NPC_PASS)) return true;
      return this.colliders.some(c => this.hitsCol(c, x, z, pad, h));
    }
    if (Math.abs(x) > this.hw - 2 || Math.abs(z) > this.hd - 2) return true;
    return this.colliders.some(c => this.hitsCol(c, x, z, pad));
  }
  safeAt(x, z) {
    if (this.town) return { name: this.zone.name };
    return this.safe.find(a => Math.hypot(a.x - x, a.z - z) < a.r) || null;
  }
  freeSpot(pad = 2, avoid = []) {
    const T = this.T, cells = T && T.spawnCells;
    for (let i = 0; i < 400; i++) {
      let x, z;
      if (T) {
        const ci = cells[Math.floor(this.rand() * cells.length)];
        x = T.cx(T.colOf(ci)) + (this.rand() - 0.5) * CELL * 0.9; z = T.cz(T.rowOf(ci)) + (this.rand() - 0.5) * CELL * 0.9;
      } else { x = (this.rand() - 0.5) * (this.zone.w - 6); z = (this.rand() - 0.5) * (this.zone.d - 6); }
      if (this.blocked(x, z, pad)) continue;
      if (this.reserved.some(p => Math.hypot(p.x - x, p.z - z) < p.r + pad)) continue;
      if (avoid.some(p => Math.hypot(p.x - x, p.z - z) < p.r)) continue;
      return { x, z };
    }
    if (T) { const a = this.zone.anchor; return T.nearestStandable(a[0] + 3, a[1] + 3, pad); }
    return { x: (this.rand() - 0.5) * 8, z: (this.rand() - 0.5) * 8 };
  }
  // 体（半径 r）を動かす。地形のある区画は壁・段差に沿って滑る
  moveBody(pos, dx, dz, r, o) {
    if (!this.T) { pos.x += dx; pos.z += dz; this.collide(pos, r); return; }
    this.T.move(pos, dx, dz, r, o);
    const bx = pos.x, bz = pos.z, h = this.T.groundAt(bx, bz);
    this.collide(pos, r, h);
    if ((pos.x !== bx || pos.z !== bz) && !this.T.fits(pos.x, pos.z, r, h, o)) { pos.x = bx; pos.z = bz; }
  }
  collide(pos, rad, h) {
    for (const c of this.colliders) {
      if (h != null && c.y != null && Math.abs(c.y - h) > 2) continue;
      if (c.box) {
        const dx = pos.x - c.x, dz = pos.z - c.z, ox = c.hw + rad - Math.abs(dx), oz = c.hd + rad - Math.abs(dz);
        if (ox > 0 && oz > 0) { if (ox < oz) pos.x += Math.sign(dx || 1) * ox; else pos.z += Math.sign(dz || 1) * oz; }
      } else {
        const dx = pos.x - c.x, dz = pos.z - c.z, d = Math.hypot(dx, dz), min = c.r + rad;
        if (d < min && d > 1e-4) { pos.x = c.x + dx / d * min; pos.z = c.z + dz / d * min; }
      }
    }
    if (this.T) return;
    pos.x = clamp(pos.x, -this.hw + 0.5, this.hw - 0.5);
    pos.z = clamp(pos.z, -this.hd + 0.5, this.hd - 0.5);
  }

  // ============================================================
  //  ワールド構築
  // ============================================================
  buildWorld() {
    const Z = this.zone, P = (a, r) => ({ x: a[0], z: a[1], r });
    // 物語でまだ出会っていない人物はいない
    // when / until：その条件を満たしてから出る／満たすと消える（storyCond の条件）
    const npcDefs = (Z.npcs || []).filter(n => (!n.after || typeof Story === 'undefined' || Story.seen(n.after)) && storyCond(n.when) && !(n.until && storyCond(n.until)));
    const noteDefs = (Z.notes || []).filter(n => (!n.when || storyCond(n.when)) && !(n.until && storyCond(n.until)));
    this.reserved = [P(Z.anchor, 3.5), ...zoneArenas(Z).map(a => ({ x: a.x, z: a.z, r: 7 }))];
    if (Z.spawn) this.reserved.push(P(Z.spawn, 4));
    if (Z.portal) this.reserved.push(P(Z.portal, 4));
    (Z.chestAt || []).forEach(p => this.reserved.push(P(p, 2)));
    if (this.T) Object.values(this.T.exits).forEach(E => this.reserved.push({ x: E.inner.x + E.nx * 2, z: E.inner.z + E.nz * 2, r: 4 }));
    else Z.exits.forEach(e => { const p = exitPos(Z, e); this.reserved.push({ x: p.x + p.nx * 3, z: p.z + p.nz * 3, r: 4.5 }); });
    npcDefs.forEach(n => this.reserved.push(P(n.at, 2)));
    noteDefs.forEach(n => this.reserved.push(P(n.at, 2)));
    const cur = typeof Story !== 'undefined' ? Story.current() : null;
    if (cur && cur.step.t === 'field' && cur.step.zone === this.zoneId) this.reserved.push(P(zonePoint(Z, cur.step.at), 4));

    // 地形（部屋・通路・段差・昇降機・扉）
    if (this.T) {
      this.arch = buildArchitecture(this, this.T);
      this.T.computeReach(Z.anchor[0], Z.anchor[1]);
    }
    // 区画固有の小物
    this.kit = new ZoneKit(this);
    ZONE_BUILD[Z.build](this.kit);
    this.kit.flush();

    // ゲート（区画の出入口）
    if (this.T) this.buildMapExits();
    else this.gates = Z.exits.filter(e => zoneOpen(e.to) || !CHAPTERS[FIELD_ZONES[e.to].ci].hidden).map(e => {
      const p = exitPos(Z, e), locked = !zoneOpen(e.to);
      const g = this.makeFieldGate(locked, FIELD_ZONES[e.to].name);
      g.g.position.set(p.x, 0, p.z); g.g.rotation.y = Math.atan2(p.nx, p.nz);
      this.scene.add(g.g);
      const side = V3(p.nz, 0, -p.nx);
      for (const sd of [-1, 1]) this.colliders.push({ x: p.x + side.x * sd * 2.5, z: p.z + side.z * sd * 2.5, r: 0.5 });
      return { exit: e, x: p.x, z: p.z, nx: p.nx, nz: p.nz, locked, ...g };
    });
    const put = (g, x, z) => { const y = this.gy(x, z); g.position.set(x, y, z); return y; };
    const col = (x, z, r) => this.colliders.push({ x, z, r, y: this.gy(x, z) });
    // 時空アンカー
    if (!Z.noAnchor) { this.anchor = this.makeAnchor(); put(this.anchor.g, Z.anchor[0], Z.anchor[1]); this.scene.add(this.anchor.g); col(Z.anchor[0], Z.anchor[1], 0.7); }
    // 住人
    this.npcs = npcDefs.map(n => {
      const m = buildCharacter(n.key); m.setPose(POSES[n.pose || 'idle']); if (m.face) m.face.set(n.pose === 'sleep' ? 'sleepy' : n.play ? 'joy' : defaultFace(n.key));
      // play：猫じゃらしを左手に持って、ひとりでじゃれている（魔王）
      let toy = null;
      if (n.play && m.armL) {
        if (POSES.jarashi) m.setPose(POSES.jarashi);   // 猫じゃらしを頭の上にかかげる（js/stage.js）
        toy = new THREE.Group(); toy.rotation.x = Math.PI;
        const st = new THREE.Mesh(new THREE.CylinderGeometry(0.008, 0.008, 0.5, 5), toon('#8ab85a')); st.position.y = 0.22; toy.add(st);
        const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.035, 0.14, 3, 8), toon('#e8d890')); ear.position.set(0.03, 0.5, 0); ear.rotation.z = -0.5; toy.add(ear);
        m.armL.grip.add(toy);
      }
      const y = put(m.group, n.at[0], n.at[1]); m.group.rotation.y = n.face != null ? n.face : Math.atan2(-n.at[0], -n.at[1] + 6);
      this.scene.add(m.group);
      // 歩き回る住人は固定の当たり判定を持たない
      if (!n.walk) col(n.at[0], n.at[1], 0.5);
      return { ...n, m, toy, pos: V3(n.at[0], y, n.at[1]), home: V3(n.at[0], y, n.at[1]), yaw: m.group.rotation.y, line: 0, wait: this.rand() * 3, wp: null, speed: 0, phase: 0 };
    });
    // 眠っている子（zone.naps）と、ねぼけ歩きの子（zone.sleepwalk）：物語でその場面を追っているあいだだけ出る
    const sceneNow = cur && cur.step.t === 'field' && cur.step.zone === this.zoneId ? cur.step.scene : null;
    // when：その場面のあとも、条件を満たすあいだは眠っている
    this.naps = (Z.naps || []).filter(n => n.scene === sceneNow || (n.when && storyCond(n.when) && !(n.until && storyCond(n.until)))).map(n => {
      const m = buildCharacter(n.key); m.setPose(POSES.sleep); if (m.face) m.face.set('sleepy');
      const y = this.gy(n.at[0], n.at[1]) + (n.y || 0);
      m.group.position.set(n.at[0], y, n.at[1]); m.group.rotation.y = n.face || 0; this.scene.add(m.group);
      return { ...n, m, pos: V3(n.at[0], y, n.at[1]), zt: 0 };
    });
    this.sleeper = null;
    const SW = Z.sleepwalk;
    if (SW && SW.scene === sceneNow) {
      const m = buildCharacter(SW.key), [x, z] = SW.route[0], [x1, z1] = SW.route[1];
      if (m.face) m.face.set('sleepy'); this.scene.add(m.group);
      this.sleeper = { SW, m, pos: V3(x, this.gy(x, z), z), i: 0, target: null, yaw: Math.atan2(x1 - x, z1 - z), speed: 0, phase: 0, zt: 0, nap: 0 };
    }
    // 見張りの番犬（zone.guards）：見回りの道の最初の点から。眠らせた番犬は眠ったまま
    const gflags = Save.data.flags || {};
    this.guards = (Z.guards || []).filter(G => !G.after || storyCond('scene:' + G.after)).map(G => {
      const m = buildEnemy(G.key || 'noraInu'), [x, z] = G.route[0], [x1, z1] = G.route[1] || [x, z + 1];
      this.scene.add(m.group);
      const N = 18, geo = new THREE.BufferGeometry(), idx = [];
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array((N + 2) * 3), 3));
      for (let k = 0; k < N; k++) idx.push(0, k + 1, k + 2);
      geo.setIndex(idx);
      const cone = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: hdr('#ffd27a', 1.1), transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      cone.frustumCulled = false; cone.renderOrder = 2; this.scene.add(cone);
      const yaw = Math.atan2(x1 - x, z1 - z);
      return { G, m, cone, pos: V3(x, this.gy(x, z), z), i: 1, dir: 1, wait: 0, yaw, baseYaw: yaw, alert: 0, zt: 0, asleep: !!gflags[G.id] };
    });
    // ごろごろ岩（zone.rollers）：a と b のあいだを、行ったり来たりころがる（rollersUntil を満たすと、もう走っていない）
    this.rollers = (Z.rollersUntil && storyCond(Z.rollersUntil) ? [] : Z.rollers || []).map(R => {
      // 当たりの大きさ（R.r）に見た目をそろえる
      const m = buildEnemy('iwa'); m.group.scale.multiplyScalar((R.r || 1.1) / m.radius); this.scene.add(m.group);
      const a = V3(R.a[0], 0, R.a[1]), b = V3(R.b[0], 0, R.b[1]);
      return { R, m, a, b, pos: a.clone(), roll: 0, yaw: Math.atan2(b.x - a.x, b.z - a.z), honk: 2 + Math.random() * 4 };
    });
    // 調べられるもの：道しるべ（post）・看板（board）を立てるか、区画の小物（mark）の上に目印の光を出す。どれでもなければ石碑
    this.notes = noteDefs.map(n => {
      const stele = !n.post && !n.board && n.mark == null;
      const mark = n.mark != null ? (Array.isArray(n.mark) ? n.mark : [0, n.mark, 0]) : [0, n.post ? 2.6 : n.board ? 2.3 : 1.8, 0];
      const o = this.makeNote(stele, mark), y = put(o.g, n.at[0], n.at[1]);
      if (stele) { o.g.rotation.y = n.face != null ? n.face : Math.atan2(-n.at[0], -n.at[1]); col(n.at[0], n.at[1], 0.5); }
      this.scene.add(o.g);
      if (n.post) this.kit.signpost(n.at[0], n.at[1], n.face || 0, ...n.post);
      if (n.board) this.kit.board(n.at[0], n.at[1], n.face || 0, ...n.board);
      // 目印を小物の上にずらしたときは、目印の真下に近づいても調べられる
      const mx = n.at[0] + mark[0], mz = n.at[1] + mark[2], markAt = mark[0] || mark[2] ? { x: mx, z: mz, y: this.gy(mx, mz) } : null;
      return { ...n, pos: V3(n.at[0], y, n.at[1]), markAt, ...o };
    });
    // 宝箱
    const opened = (Save.data.fieldChests || {})[this.zoneId] || [];
    this.chests = [];
    for (let i = 0; i < Z.chests; i++) {
      // 置き場所が決まっている宝箱（行き止まりなど）。なければ空いているところ
      const at = Z.chestAt && Z.chestAt[i], p = at ? { x: at[0], z: at[1] } : this.freeSpot(1.5);
      const c = this.makeChest(), y = put(c.g, p.x, p.z); c.g.rotation.y = this.rand() * Math.PI * 2;
      const done = opened.includes(i);
      if (done) { c.lid.rotation.x = -1.9; c.glow.visible = false; }
      this.scene.add(c.g); col(p.x, p.z, 0.6);
      this.chests.push({ id: i, pos: V3(p.x, y, p.z), opened: done, ...c });
      this.reserved.push({ x: p.x, z: p.z, r: 2 });
    }
    // 爪とぎの丸太（爪を研ぐと初手技ポイントが回復。使ったあとは爪あとが残る）
    const broken = this.s.set(this.s.broken, this.zoneId);
    this.crystals = [];
    for (let i = 0; i < Z.crystals; i++) {
      const p = this.freeSpot(1.2);
      const c = this.makeScratchPost(), y = put(c.g, p.x, p.z); this.scene.add(c.g); col(p.x, p.z, 0.25);
      const b = broken.has(i); if (b) c.setUsed(this.rand() * Math.PI * 2);
      this.crystals.push({ id: i, pos: V3(p.x, y, p.z), broken: b, ...c });
    }
    // 敵グループ（区画に対応するステージの敵）
    const pool = stagePools(Z.pool || Z.stage), dead = this.s.set(this.s.defeated, this.zoneId);
    // foes：区画ならではの敵（強さはステージのまま）
    if (Z.foes) pool.normals = Z.foes;
    this.groups = [];
    const spawnSafe = [...this.reserved.slice(0, 3).map(p => ({ ...p, r: p.r + 6 })), ...this.safe.map(a => ({ ...a, r: a.r + 8 }))];
    for (let i = 0; i < (this.town ? 0 : Z.groups); i++) {
      const p = this.freeSpot(1.6, [...spawnSafe, ...this.groups.map(g => ({ x: g.home.x, z: g.home.z, r: 6 }))]);
      const elite = pool.elites.length > 0 && (this.rand() < 0.3 || (i === Z.groups - 1 && pool.elites.length > 0));
      const n = () => pool.normals[Math.floor(this.rand() * pool.normals.length)];
      const lead = elite ? pool.elites[Math.floor(this.rand() * pool.elites.length)] : n();
      const lv = pool.lv + (elite ? 2 : 0);
      const keys = elite ? [[n(), lead, n()]] : this.rand() < 0.35 ? [[lead, n()], [n(), n(), n()]] : [[n(), lead, n()]];
      if (dead.has(i)) continue;
      const model = buildEnemy(lead);
      if (model.isBoss) { model.group.scale.multiplyScalar(0.7); model.radius *= 0.7; model.height *= 0.7; }
      const home = V3(p.x, this.gy(p.x, p.z), p.z);
      model.group.position.copy(home); model.group.rotation.y = this.rand() * Math.PI * 2;
      this.scene.add(model.group);
      const label = document.createElement('div'); label.className = 'fd-en' + (elite ? ' elite' : '');
      label.innerHTML = `<i>!</i><span>Lv.${lv}</span>`;
      this.groups.push({ id: i, home, pos: home.clone(), yaw: model.group.rotation.y, state: 'idle', wait: this.rand() * 2, wp: null, model, lv, elite, alive: true, label,
        waves: keys.map(w => w.map(k => ({ key: k, lv }))) });
    }
  }

  // 開拓任務：この区画が目的地なら目印を、別区画ならそこへ続くゲートに案内を出す
  setupQuest() {
    const cur = typeof Story !== 'undefined' ? Story.current() : null;
    if (!cur || cur.step.t !== 'field') return;
    const step = cur.step;
    if (step.zone !== this.zoneId) {
      const path = zonePath(this.zoneId, step.zone);
      const gate = path && this.gates.find(g => g.exit.to === path[1]);
      if (gate) {
        const x = gate.x + gate.nx * 1.5, z = gate.z + gate.nz * 1.5;
        this.quest = { step, pos: V3(x, this.gy(x, z), z), gate, via: FIELD_ZONES[path[1]].name, lift: !!(gate.phys && gate.phys.cabin), far: path.length > 2 ? FIELD_ZONES[step.zone].name : null };
      }
      return;
    }
    const [qx, qz] = zonePoint(this.zone, step.at);
    let spot = { x: qx, z: qz };
    if (this.blocked(qx, qz, 1.2)) for (let r = 0.5; r < 12; r += 0.5) {
      let found = false;
      for (let a = 0; a < Math.PI * 2; a += 0.4) { const x = qx + Math.cos(a) * r, z = qz + Math.sin(a) * r; if (!this.blocked(x, z, 1.2) && (!this.T || this.T.reach[this.T.at(x, z)])) { spot = { x, z }; found = true; break; } }
      if (found) break;
    }
    const sy = this.gy(spot.x, spot.z), bh = this.T ? Math.min(40, this.T.ceilOf(this.T.at(spot.x, spot.z)) - sy) : 40;
    const g = new THREE.Group(); g.position.set(spot.x, sy, spot.z); this.scene.add(g);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.6, bh, 16, 1, true), new THREE.MeshBasicMaterial({ color: hdr('#ffd66b', 1.4), transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    beam.position.y = bh / 2; g.add(beam);
    const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.35), glowMat('#ffd66b', 3)); dia.position.y = 2.2; dia.scale.y = 1.5; g.add(dia);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 1.75, 64), glowMat('#ffd66b', 2.5, { side: THREE.DoubleSide, transparent: true, opacity: 0.8 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.03; g.add(ring);
    this.groups.forEach(gr => { if (Math.hypot(gr.home.x - spot.x, gr.home.z - spot.z) < 7) { gr.alive = false; this.scene.remove(gr.model.group); } });
    this.quest = { step, pos: V3(spot.x, sy, spot.z), g, dia, ring };
  }
  questArrive() {
    if (this.busy || !this.quest || this.quest.gate) return;
    this.busy = true; this.keys.clear();
    const banner = this.root.querySelector('.fd-banner');
    banner.className = 'fd-banner show good'; banner.textContent = '目的地に到着';
    this.fx.pillar(this.quest.pos, '#ffd66b', { h: 8, r: 1.2, life: 0.8 });
    Sfx.win();
    this.root.querySelector('.fd-wipe').classList.add('on');
    setTimeout(() => this.leave(() => Story.arrive()), 900);
  }

  // ============================================================
  //  区画の移動
  // ============================================================
  gotoZone(to, arrival) {
    if (this.moving) return;
    this.moving = true; this.busy = true; this.keys.clear();
    this.root.querySelector('.fd-wipe').classList.add('on');
    const banner = this.root.querySelector('.fd-banner');
    banner.className = 'fd-banner show zone'; banner.textContent = FIELD_ZONES[to].name;
    Sfx.door();
    setTimeout(() => {
      this.persist = false;
      const v = new FieldView(this.s, to, arrival);
      v.key = 'field:' + to;
      GFX.setView(v);
      App.mount(v.root);
      Game.activeField = v;
      v.root.querySelector('.fd-wipe').classList.add('on');
      requestAnimationFrame(() => requestAnimationFrame(() => v.root.querySelector('.fd-wipe').classList.remove('on')));
      v.showZoneTitle();
    }, 750);
  }
  // 今いる場所の名前：区画に部屋の範囲（areas）があれば、その部屋の名前
  placeName() {
    const p = this.player && this.player.pos, a = p && (this.zone.areas || []).find(o => p.x >= o.at[0] && p.x <= o.at[2] && p.z >= o.at[1] && p.z <= o.at[3]);
    return a ? a.name : this.zone.name;
  }
  updateArea() {
    if (!this.zone.areas) return;
    const name = this.placeName();
    if (name === this.areaName) return;
    this.areaName = name;
    this.root.querySelector('.fd-zone b').textContent = name;
  }
  showZoneTitle() {
    const t = this.root.querySelector('.fd-title');
    t.innerHTML = `<small>${this.ch.name}</small><b>${this.placeName()}</b>`;
    if (this.zone.town) Sfx.meow(this.team[this.leader].key);
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  }

  // ============================================================
  //  オブジェクト
  // ============================================================
  // 平らな区画の出入口：木のアーチと行き先の立て札。封鎖中は板でふさがれている
  // plain：木の柱と葉・横木をつけず、光のまくと札だけ（建物の扉の奥など）
  makeFieldGate(locked, to, W = 4.8, plain = false) {
    const g = new THREE.Group(), hw = W / 2;
    const wood = toon('#8a5a36'), dark = toon('#5a3a22');
    if (!plain) for (const sd of [-1, 1]) { const p = outlined(new THREE.CylinderGeometry(0.22, 0.26, 4.2, 8), wood, { thick: 0.002 }); p.position.set(sd * hw, 2.1, 0); g.add(p); }
    if (!plain) { const beam = outlined(new THREE.BoxGeometry(W + 0.8, 0.45, 0.45), dark, { thick: 0.002 }); beam.position.y = 4.1; g.add(beam); }
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: signTex(to, locked ? '通れない' : '▶ この先', locked ? '#ff6a6a' : '#ffd27a'), transparent: true, toneMapped: false, side: THREE.DoubleSide }));
    sign.position.set(0, 4.75, 0.05); g.add(sign);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.5, 3.8), new THREE.MeshBasicMaterial({ map: radialTex('#ffffff', '#000000'), color: hdr(locked ? '#ff8a8a' : '#fff0c8', 0.5),
      transparent: true, opacity: 0.4, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    face.position.y = 1.9; g.add(face);
    if (locked) for (const y of [1.0, 2.2]) { const b = outlined(new THREE.BoxGeometry(W + 0.2, 0.3, 0.15), wood, { thick: 0.002 }); b.position.set(0, y, 0.1); b.rotation.z = (y > 2 ? -1 : 1) * 0.18; g.add(b); }
    const arrows = [];
    if (!locked) for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.3, 0.5, 3), glowMat('#ffd27a', 2)); a.rotation.set(-Math.PI / 2, 0, Math.PI); a.scale.set(1, 1, 0.2);
      a.position.set(0, 0.05, 1.4 + i * 0.8); g.add(a); arrows.push(a);
    }
    return { g, face, arrows };
  }
  // 記録：石碑と、その上の光る目印（stele でなければ目印だけ。mark = 目印の位置）
  makeNote(stele = true, at = [0, 1.8, 0]) {
    const g = new THREE.Group();
    if (stele) {
      const s = outlined(new THREEX.RoundedBoxGeometry(0.9, 1.4, 0.28, 2, 0.08), toon('#b8b0a0'), { thick: 0.002 });
      s.position.y = 0.7; g.add(s);
      const rune = new THREE.Mesh(new THREE.CircleGeometry(0.2, 6), glowMat('#ffd27a', 1.8)); rune.position.set(0, 1.0, 0.15); g.add(rune);
    }
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ffffff', 0.6), blending: THREE.AdditiveBlending, depthWrite: false }));
    mark.scale.setScalar(0.8); mark.position.set(...at); g.add(mark);
    return { g, mark };
  }
  // 宝箱
  makeChest() {
    const g = new THREE.Group();
    const body = toon('#b0503a'), gold = toon('#ffd24a', { emissive: new THREE.Color('#ffd24a'), emissiveIntensity: 0.3 });
    const base = outlined(new THREEX.RoundedBoxGeometry(0.9, 0.5, 0.6, 2, 0.06), body); base.position.y = 0.25; g.add(base);
    const band = outlined(new THREE.BoxGeometry(0.93, 0.08, 0.63), gold); band.position.y = 0.42; g.add(band);
    const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.3); g.add(lid);
    const top = outlined(new THREE.CylinderGeometry(0.3, 0.3, 0.9, 16, 1, false, 0, Math.PI), body);
    top.rotation.z = Math.PI / 2; top.position.set(0, 0, 0.3); lid.add(top);
    const gem = new THREE.Mesh(new THREE.SphereGeometry(0.07, 10, 8), glowMat('#8ad8ff', 3)); gem.position.set(0, 0.02, 0.61); lid.add(gem);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ffd66b', 0.8), blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(2.0); glow.position.y = 0.6; g.add(glow);
    return { g, lid, glow };
  }
  // 爪とぎの丸太：短い丸太を立て、まん中に縄を巻いたもの。上には、研げる目印のピンクに光る肉球
  //   setUsed(向き)：爪あと（明るい筋）をその向きに出し、肉球の光を消す
  makeScratchPost() {
    const g = new THREE.Group();
    const log = outlined(new THREE.CylinderGeometry(0.22, 0.25, 0.95, 14), toon('#9a6a42'), { thick: 0.002 }); log.position.y = 0.475; g.add(log);
    const top = new THREE.Mesh(new THREE.CylinderGeometry(0.215, 0.215, 0.02, 14), toon('#e8c890')); top.position.y = 0.955; g.add(top);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.11, 0.008, 4, 20), toon('#b88a5a')); ring.rotation.x = Math.PI / 2; ring.position.y = 0.967; g.add(ring);
    // 縄（ひとつのジオメトリにまとめる）
    g.add(new THREE.Mesh(THREEX.BufferGeometryUtils.mergeGeometries([0, 1, 2, 3, 4, 5, 6].map(k => new THREE.TorusGeometry(0.24, 0.026, 6, 22).rotateX(Math.PI / 2).translate(0, 0.3 + k * 0.058, 0))), toon('#d8c08a')));
    // 爪あと：四本の明るい筋（+z の側。使ったときに、研いだ向きへまわす）
    const marks = new THREE.Group(); marks.visible = false; g.add(marks);
    const markM = toon('#fff0d0');
    for (let k = 0; k < 4; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.3, 0.014), markM); m.position.set((k - 1.5) * 0.055, 0.48 + (k % 2) * 0.03, 0.28 - Math.abs(k - 1.5) * 0.012); m.rotation.set(-0.05, (k - 1.5) * 0.2, 0.18); marks.add(m); }
    // 研げる目印：ピンクに光る肉球（まわる）と、やわらかい光
    const gem = new THREE.Group(); gem.position.y = 1.3; g.add(gem);
    const pawM = glowMat('#ff9ad8', 1.8);
    const pad = new THREE.Mesh(new THREE.SphereGeometry(0.075, 12, 8), pawM); pad.scale.set(1.1, 0.85, 0.45); gem.add(pad);
    for (const [x, y] of [[-0.075, 0.07], [-0.028, 0.105], [0.028, 0.105], [0.075, 0.07]]) { const t = new THREE.Mesh(new THREE.SphereGeometry(0.03, 10, 8), pawM); t.scale.z = 0.5; t.position.set(x, y, 0); gem.add(t); }
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ff9ad8', 0.5), blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(1.0); sp.position.y = 1.3; g.add(sp);
    const setUsed = ang => { marks.visible = true; marks.rotation.y = ang; gem.visible = false; sp.visible = false; };
    return { g, gem, sp, marks, setUsed };
  }
  // ねこ地蔵（ここで休める。赤いよだれかけ）
  makeAnchor() {
    const g = new THREE.Group();
    const stone = toon('#b8b4a8'), red = toon('#e0453a');
    const base = outlined(new THREE.CylinderGeometry(0.7, 0.8, 0.35, 10), toon('#8a847a')); base.position.y = 0.17; g.add(base);
    const body = outlined(new THREE.SphereGeometry(0.42, 16, 12), stone); body.scale.set(1, 1.2, 0.9); body.position.y = 0.8; g.add(body);
    const head = outlined(new THREE.SphereGeometry(0.4, 16, 12), stone); head.scale.set(1.12, 0.95, 1); head.position.y = 1.45; g.add(head);
    for (const sd of [-1, 1]) { const eg = new THREE.ConeGeometry(0.13, 0.26, 4); eg.rotateY(Math.PI / 4); const e = outlined(eg, stone); e.scale.z = 0.5; e.position.set(sd * 0.24, 1.8, 0); e.rotation.z = -sd * 0.35; g.add(e); }
    for (const sd of [-1, 1]) { const ey = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.012, 6, 12, Math.PI), new THREE.MeshBasicMaterial({ color: '#3a3430' })); ey.position.set(sd * 0.15, 1.5, 0.37); g.add(ey); }
    const bib = new THREE.Mesh(new THREE.CircleGeometry(0.34, 16, Math.PI, Math.PI), red); bib.position.set(0, 1.17, 0.36); bib.rotation.x = -0.25; g.add(bib);
    const core = new THREE.Mesh(new THREE.SphereGeometry(0.14, 12, 10), glowMat('#8affc8', 2.6)); core.position.set(0, 2.35, 0); g.add(core);
    const rings = [0.3, 0.45].map(r => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.018, 8, 40), glowMat('#8affc8', 2.2)); t.position.y = 2.35; g.add(t); return t; });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#8affc8', 0.7), blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(1.8); sp.position.y = 2.35; g.add(sp);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.4, 1.5, 64), glowMat('#8affc8', 1.6, { side: THREE.DoubleSide, transparent: true, opacity: 0.6 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    return { g, core, rings };
  }

  // ============================================================
  //  地形のある区画の出入口：隔壁扉と、区画間エレベーター
  // ============================================================
  buildMapExits() {
    const T = this.T, byKey = {};
    this.exitsPhys = []; this.gates = [];
    for (const e of this.zone.exits) (byKey[e.key] = byKey[e.key] || []).push(e);
    for (const [key, list] of Object.entries(byKey)) {
      const E = T.exits[key]; if (!E) continue;
      const dests = list.map(e => ({ exit: e, to: e.to, locked: !zoneOpen(e.to) }));
      const pl = E.cabin ? E.inner : E.outer;
      const ph = { key, cabin: E.cabin, cells: E.cells, x: pl.x, z: pl.z, nx: E.nx, nz: E.nz, h: E.h, width: E.width, depth: E.nz ? E.d : E.w,
        cx: E.x, cz: E.z, dests, locked: !E.cabin && dests[0].locked, open: 0 };
      ph.name = (list.find(e => e.name) || {}).name;
      const st = ARCH_STYLES[this.zone.arch || 'station'], stair = (list.find(e => e.stair) || {}).stair;
      Object.assign(ph, E.cabin ? this.makeCabin(ph, st) : stair ? this.makeStairGate(ph, st, stair) : st.exit === 'arch' ? this.makeArchGate(ph, list.some(e => e.plain))
        : st.exit === 'bulkhead' ? this.makeBulkhead(ph) : this.makeGate(ph, st));
      if (!ph.apply) ph.apply = o => ph.panels.forEach(q => { q.p.position.x = q.s * o * (ph.width / 2 - 0.3); });
      if (!E.cabin) ph.camTop = ph.h + Math.max(6.4, this.exitTop(ph) + 0.3);
      this.exitsPhys.push(ph);
      for (const d of dests) this.gates.push({ exit: d.exit, x: ph.x, z: ph.z, nx: ph.nx, nz: ph.nz, locked: d.locked, phys: ph });
    }
  }
  // 区画の境の隔壁扉（奥に通路が続く）
  makeBulkhead(ph) {
    const g = new THREE.Group(), W = ph.width, H = 4.6, col = ph.locked ? '#ff4d6d' : THEMES[this.ch.bg].line;
    g.position.set(ph.x, ph.h, ph.z); g.rotation.y = Math.atan2(ph.nx, ph.nz);   // ローカル +Z が区画の内側
    this.scene.add(g);
    const top = this.exitTop(ph);
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2f4a', metalness: 0.7, roughness: 0.35 });
    const above = new THREE.Mesh(new THREE.PlaneGeometry(W, top - H), this.arch.mats.wall); above.position.set(0, H + (top - H) / 2, 0); g.add(above);
    for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.5, H + 0.5, 0.5), dark); j.position.set(s * (W / 2 - 0.25), (H + 0.5) / 2, 0.1); g.add(j);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, H, 0.52), glowMat(col, 2.5)); l.position.set(s * (W / 2 - 0.5), H / 2, 0.1); g.add(l); }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(W, 0.6, 0.6), dark); lintel.position.set(0, H + 0.2, 0.1); g.add(lintel);
    const lb = new THREE.Mesh(new THREE.BoxGeometry(W - 1, 0.08, 0.62), glowMat(col, 2.5)); lb.position.set(0, H - 0.05, 0.1); g.add(lb);
    // 左右に開く扉板（下に警戒色の帯）
    const pm = new THREE.MeshStandardMaterial({ color: '#4a5070', map: bulkheadTex(), metalness: 0.6, roughness: 0.4 });
    const panels = [-1, 1].map(s => {
      const p = new THREE.Group(); g.add(p);
      const m = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.5, H, 0.3), pm); m.position.set(s * (W / 4 - 0.25), H / 2, -0.15); p.add(m);
      const seam = new THREE.Mesh(new THREE.BoxGeometry(0.1, H * 0.7, 0.32), glowMat(col, 2)); seam.position.set(s * 0.1, H / 2, -0.15); p.add(seam);
      return { p, s };
    });
    // 奥の通路
    const A = new GeoAcc(4), L = 9, hw = W / 2 - 0.5;
    A.quad([-hw, 0, -0.3], [hw, 0, -0.3], [hw, 0, -L], [-hw, 0, -L]);
    A.quad([-hw, H, -L], [hw, H, -L], [hw, H, -0.3], [-hw, H, -0.3]);
    A.quad([-hw, 0, -0.3], [-hw, 0, -L], [-hw, H, -L], [-hw, H, -0.3]);
    A.quad([hw, 0, -L], [hw, 0, -0.3], [hw, H, -0.3], [hw, H, -L]);
    A.quad([-hw, 0, -L], [hw, 0, -L], [hw, H, -L], [-hw, H, -L]);
    g.add(A.mesh(new THREE.MeshStandardMaterial({ color: '#1a1e32', metalness: 0.5, roughness: 0.5 })));
    const G2 = new GeoAcc(4);
    for (let z = -1.5; z > -L; z -= 2) { G2.quad([-hw + 0.05, 3.2, z], [-hw + 0.05, 3.2, z - 0.8], [-hw + 0.05, 3.3, z - 0.8], [-hw + 0.05, 3.3, z]); G2.quad([hw - 0.05, 3.2, z - 0.8], [hw - 0.05, 3.2, z], [hw - 0.05, 3.3, z], [hw - 0.05, 3.3, z - 0.8]); }
    G2.quad([-0.08, 0.02, -0.4], [0.08, 0.02, -0.4], [0.08, 0.02, -L], [-0.08, 0.02, -L]);
    g.add(G2.mesh(glowMat(col, 1.6), { receive: false }));
    // 行き先の看板
    const d = ph.dests[0], sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: signTex(FIELD_ZONES[d.to].name, ph.locked ? '封鎖中' : '▶ この先', col), transparent: true, toneMapped: false }));
    sign.position.set(0, H + 1.2, 0.42); g.add(sign);
    const lamps = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), glowMat(col, 4)); m.position.set(s * (W / 2 - 0.25), H + 0.65, 0.4); g.add(m); return m; });
    return { g, panels, lamps, H };
  }
  // カメラが入れない場所か。カメラは太さ R の玉として、まわり 8 方向も調べる
  // （屋根のひさし・壁の厚み・家の角・画面の手前の面が壁を切らないように）
  viewBlocked(x, y, z, R = 0.45) {
    const T = this.T; if (!T) return false;
    if (T.blocksView(x, y, z) || this.inGate(x, y, z)) return true;
    const D = R * 0.7071;
    return T.blocksView(x + R, y, z) || T.blocksView(x - R, y, z) || T.blocksView(x, y, z + R) || T.blocksView(x, y, z - R)
      || T.blocksView(x + D, y, z + D) || T.blocksView(x - D, y, z + D) || T.blocksView(x + D, y, z - D) || T.blocksView(x - D, y, z - D);
  }
  // 頭から off の向きに、カメラをどこまで離せるか（壁・天井・障害物にぶつかる手前まで）
  viewDist(head, off, foot, ceil, py) {
    const T = this.T, cd = this.camDist;
    const blocked = f => {
      const x = head.x + off.x * cd * f, y = Math.min(ceil, head.y + off.y * cd * f), z = head.z + off.z * cd * f;
      // 太さは頭から離れるほど大きく（頭のそばで太いと、壁ぞいを歩くだけでカメラが寄ってしまう）
      const R = Math.min(0.55, 0.15 + 0.3 * cd * f);
      // 小物：高さの決まったもの（門の柱など）はその高さまで、決まっていないものは足もとから 4m まで
      const prop = this.colliders.some(c => (c.box || c.r > 0.5) && (c.top == null ? y - foot < 4 : y - (c.y || 0) < c.top + 0.2) && this.hitsCol(c, x, z, 0.3, T ? py : null));
      return prop || this.viewBlocked(x, y, z, R);
    };
    for (let i = 1; i <= 24; i++) {
      if (!blocked(i / 24)) continue;
      // ぶつかる手前まで細かく詰める（壁ぎわでは主人公のすぐ後ろまで寄る）
      let lo = (i - 1) / 24, hi = i / 24;
      for (let k = 0; k < 5; k++) { const m = (lo + hi) / 2; if (blocked(m)) hi = m; else lo = m; }
      return cd * lo;
    }
    return cd;
  }
  // 出入口の門：門の面の近く（柱が張り出している）と門の外側（扉・奥の通路）には、門の高さまでカメラを入れない
  inGate(x, y, z) {
    for (const ph of this.exitsPhys) {
      if (ph.camTop == null || y > ph.camTop) continue;
      const dx = x - ph.x, dz = z - ph.z, along = dx * ph.nx + dz * ph.nz, lat = Math.abs(dx * ph.nz - dz * ph.nx);
      if (along < 0.6 && along > -12 && lat < ph.width / 2 + 0.4) return true;
    }
    return false;
  }
  // 出入口の上端（屋外の区画は外側の壁の高さ）
  exitTop(ph) {
    const T = this.T;
    if (!T.open) return T.ceilOf(T.at(ph.x + ph.nx * 0.5, ph.z + ph.nz * 0.5)) - ph.h;
    const i = T.at(ph.x - ph.nx * 0.6, ph.z - ph.nz * 0.6);
    return (i >= 0 && T.top[i] > ph.h ? T.top[i] : ph.h + (ARCH_STYLES[this.zone.arch].wallH || 6)) - ph.h;
  }
  // 石の門・坑道の入口（観音開きの扉、奥に通路）
  makeGate(ph, st) {
    const g = new THREE.Group(), W = ph.width, mine = st.exit === 'tunnel', palace = (st.look || this.zone.arch) === 'palace';
    // 門の高さ：出入口ごとの指定（exit.gateH：城の玄関など）がなければ、建物の作りで決まる
    const gh = (ph.dests.find(d => d.exit.gateH) || { exit: {} }).exit.gateH;
    const H = gh || (mine ? 4.2 : palace ? 5.4 : 4.6), col = ph.locked ? '#ff4d6d' : st.glow || THEMES[this.ch.bg].line;
    g.position.set(ph.x, ph.h, ph.z); g.rotation.y = Math.atan2(ph.nx, ph.nz);   // ローカル +Z が区画の内側
    this.scene.add(g);
    const top = Math.max(H + 1.2, this.exitTop(ph));
    const M = this.arch.mats, frameM = mine ? M.wood : palace ? M.wall2 : M.stone;
    const above = new THREE.Mesh(new THREE.PlaneGeometry(W, top - H), M.wall); above.position.set(0, H + (top - H) / 2, 0); g.add(above);
    for (const s of [-1, 1]) {
      const j = new THREE.Mesh(new THREE.BoxGeometry(mine ? 0.45 : 0.7, H + 0.6, mine ? 0.45 : 0.7), frameM); j.position.set(s * (W / 2 - 0.35), (H + 0.6) / 2, 0.15); j.castShadow = true; g.add(j);
      if (palace) { const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, H - 0.6, 0.72), glowMat(col, 1.6)); l.position.set(s * (W / 2 - 0.35), H / 2, 0.15); g.add(l); }
    }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, mine ? 0.45 : 0.8, mine ? 0.5 : 0.8), frameM); lintel.position.set(0, H + 0.3, 0.15); lintel.castShadow = true; g.add(lintel);
    if (!mine) { const key = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.9, 0.9), frameM); key.position.set(0, H + 0.5, 0.2); g.add(key); }
    // 観音開きの扉（奥へ開く）
    const dm = palace ? new THREE.MeshStandardMaterial({ color: '#e8eef8', map: marbleTex(), metalness: 0.2, roughness: 0.35 }) : new THREE.MeshStandardMaterial({ color: '#7a5436', map: woodTex(), roughness: 0.85, metalness: 0 });
    const band = palace ? glowMat(col, 1.2) : M.iron, dw = W / 2 - 0.6;
    // 重い扉：建物の作り（st.heavy）か、出入口ごとの指定（exit.heavy：町から城へ入る門など）。true は魔王城の配色
    const heavy = st.heavy || (ph.dests.find(d => d.exit.heavy) || { exit: {} }).exit.heavy;
    const panels = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(s * (W / 2 - 0.65), 0, -0.1); g.add(p);
      if (heavy) { p.add(heavyDoorLeaf(dw, H - 0.05, s, null, heavy === true ? 'demon' : heavy)); return { p, s }; }
      const m = new THREE.Mesh(new THREE.BoxGeometry(dw, H - 0.05, 0.18), dm); m.position.set(-s * dw / 2, H / 2, 0); m.castShadow = true; p.add(m);
      for (const y of [0.2, 0.8]) { const b = new THREE.Mesh(new THREE.BoxGeometry(dw - 0.1, 0.12, 0.21), band); b.position.set(-s * dw / 2, H * y, 0); p.add(b); }
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.025, 6, 14), M.iron); ring.position.set(-s * (dw - 0.3), H * 0.45, 0.12); p.add(ring);
      return { p, s };
    });
    const apply = o => panels.forEach(q => { q.p.rotation.y = q.s * o * 1.45; });
    // 奥の通路
    const A = new GeoAcc(4), L = 9, hw = W / 2 - 0.6, TH = H + (mine ? 0.3 : 0.6);
    A.quad([-hw, 0, -0.3], [hw, 0, -0.3], [hw, 0, -L], [-hw, 0, -L]);
    A.quad([-hw, TH, -L], [hw, TH, -L], [hw, TH, -0.3], [-hw, TH, -0.3]);
    A.quad([-hw, 0, -0.3], [-hw, 0, -L], [-hw, TH, -L], [-hw, TH, -0.3]);
    A.quad([hw, 0, -L], [hw, 0, -0.3], [hw, TH, -0.3], [hw, TH, -L]);
    A.quad([-hw, 0, -L], [hw, 0, -L], [hw, TH, -L], [-hw, TH, -L]);
    g.add(A.mesh(mine ? M.rock : palace ? M.wall2 : M.stone));
    const G2 = new GeoAcc(4);
    for (let z = -2.5; z > -L; z -= 3) {
      if (mine) { G2.box(-hw, 0, z - 0.2, -hw + 0.3, TH, z + 0.2, 'b'); G2.box(hw - 0.3, 0, z - 0.2, hw, TH, z + 0.2, 'b'); G2.box(-hw, TH - 0.35, z - 0.2, hw, TH, z + 0.2, 't'); }
      else G2.box(-hw, 0, z - 0.3, -hw + 0.25, TH, z + 0.3, 'b'), G2.box(hw - 0.25, 0, z - 0.3, hw, TH, z + 0.3, 'b');
    }
    g.add(G2.mesh(mine ? M.wood : frameM));
    const G3 = new GeoAcc(4);
    for (let z = -2.5; z > -L; z -= 3) for (const s of [-1, 1]) G3.box(s * (hw - 0.45) - 0.12, TH - 1.4, z - 0.12, s * (hw - 0.45) + 0.12, TH - 1.05, z + 0.12, '');
    g.add(G3.mesh(glowMat(st.glow || col, 2), { receive: false }));
    // 行き先の看板（木の札）と、門の灯り
    const d = ph.dests[0], sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: signTex(FIELD_ZONES[d.to].name, ph.locked ? '封鎖中' : '▶ この先', col), transparent: true, toneMapped: false }));
    sign.position.set(0, H + 1.3, 0.62); g.add(sign);
    const lamps = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.26), glowMat(col, 3)); m.position.set(s * (W / 2 + 0.15), H - 0.6, 0.6); g.add(m); return m; });
    return { g, panels, lamps, H, apply };
  }
  // 野外の区画の出入口：木のアーチと行き先の立て札（地図の端に立つ）
  makeArchGate(ph, plain) {
    // 岩の崖の区画では、柱が岩にうもれないよう、通路の内側に立てる（柱に当たり判定をつける）
    const cliff = this.T && this.T.outdoor === 'cliff', W = cliff ? ph.width - 0.9 : ph.width + 0.4;
    const { g, face, arrows } = this.makeFieldGate(ph.locked, FIELD_ZONES[ph.dests[0].to].name, W, plain);
    g.position.set(ph.x, ph.h, ph.z); g.rotation.y = Math.atan2(ph.nx, ph.nz);
    this.scene.add(g);
    if (cliff && !plain) for (const sd of [-1, 1]) this.colliders.push({ x: ph.x + sd * W / 2 * Math.cos(g.rotation.y), z: ph.z - sd * W / 2 * Math.sin(g.rotation.y), r: 0.3, top: 4.2, y: ph.h });
    return { g, face, arrows, panels: [], apply() {}, H: 4.2 };
  }
  // 階段の出入口（塔・城・洞窟の上の階／下の階へ）：アーチの奥に、上り（up）または下り（down）の階段が続く
  makeStairGate(ph, st, dir) {
    const g = new THREE.Group(), W = ph.width, up = dir === 'up', H = 4.4, L = 7, n = 12, rise = up ? 3.6 : -3.6;
    const col = ph.locked ? '#ff4d6d' : st.glow || THEMES[this.ch.bg].line;
    g.position.set(ph.x, ph.h, ph.z); g.rotation.y = Math.atan2(ph.nx, ph.nz);   // ローカル +Z が区画の内側
    this.scene.add(g);
    const M = this.arch.mats, cave = (st.look || this.zone.arch) === 'mine', frameM = cave ? M.wood : M.wall2 || M.stone;
    const hw = W / 2 - 0.35;
    // 段（奥へ上る／下る）と、両側の壁・天井
    const A = new GeoAcc(4), B = new GeoAcc(4);
    for (let k = 0; k < n; k++) {
      const z0 = -k * L / n, z1 = -(k + 1) * L / n, y = rise * (k + 1) / n;
      if (up) A.box(-hw, 0, z1, hw, y, z0, 'b'); else A.box(-hw, y - 0.3, z1, hw, y, z0, 'b');
    }
    const lo = Math.min(0, rise) - 0.3, hi = Math.max(H, rise + H);
    B.quad([-hw, lo, 0], [-hw, lo, -L], [-hw, hi, -L], [-hw, hi, 0]);
    B.quad([hw, lo, -L], [hw, lo, 0], [hw, hi, 0], [hw, hi, -L]);
    B.quad([-hw, H, -0.01], [hw, H, -0.01], [hw, rise + H, -L], [-hw, rise + H, -L]);
    B.quad([hw, rise - 1, -L], [-hw, rise - 1, -L], [-hw, rise + H, -L], [hw, rise + H, -L]);
    if (!up) B.quad([-hw, lo, 0], [hw, lo, 0], [hw, 0, 0], [-hw, 0, 0]);
    g.add(A.mesh(M.step)); g.add(B.mesh(cave ? M.rock : M.wall));
    // 奥の暗がりと、先の階の灯り
    const dark = new THREE.Mesh(new THREE.PlaneGeometry(W - 0.8, H), new THREE.MeshBasicMaterial({ color: '#05030a', transparent: true, opacity: 0.85 }));
    dark.position.set(0, rise + H / 2 - 0.5, -L + 0.05); g.add(dark);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr(col, 0.5), blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(3); glow.position.set(0, rise + 2.4, -L + 0.8); g.add(glow);
    // アーチの枠
    const top = Math.max(H + 1.2, this.exitTop(ph));
    const above = new THREE.Mesh(new THREE.PlaneGeometry(W, top - H), M.wall); above.position.set(0, H + (top - H) / 2, 0); g.add(above);
    for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.6, H + 0.4, 0.7), frameM); j.position.set(s * (W / 2 - 0.3), (H + 0.4) / 2, 0.15); j.castShadow = true; g.add(j); }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(W + 0.2, 0.7, 0.8), frameM); lintel.position.set(0, H + 0.3, 0.15); g.add(lintel);
    const d = ph.dests[0], label = FIELD_ZONES[d.to].floor || FIELD_ZONES[d.to].name;
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 0.8), new THREE.MeshBasicMaterial({ map: signTex(`${up ? '▲' : '▼'} ${label}`, ph.locked ? '封鎖中' : up ? '上り階段' : '下り階段', col), transparent: true, toneMapped: false }));
    sign.position.set(0, H + 1.25, 0.6); g.add(sign);
    const lamps = [-1, 1].map(s => { const m = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.36, 0.26), glowMat(col, 3)); m.position.set(s * (W / 2 + 0.2), H - 0.7, 0.6); g.add(m); return m; });
    // 封鎖中は柵でふさぐ
    if (ph.locked) for (const y of [0.9, 2.0]) { const b = new THREE.Mesh(new THREE.BoxGeometry(W - 0.6, 0.25, 0.14), M.wood || M.trim); b.position.set(0, y, 0.2); b.rotation.z = (y > 1.5 ? -1 : 1) * 0.12; g.add(b); }
    return { g, panels: [], apply() {}, lamps, H };
  }
  // 区画間エレベーターの籠（入口に扉、奥に操作盤）。ステーション以外は鉄格子の籠
  makeCabin(ph, st = ARCH_STYLES.station) {
    const cage = st.lift === 'cage', g = new THREE.Group(), W = ph.width, H = 3.9, col = cage ? (st.glow || '#ffd27a') : '#ffd27a';
    g.position.set(ph.x, ph.h, ph.z); g.rotation.y = Math.atan2(ph.nx, ph.nz);   // ローカル +Z が籠の外、-Z が籠の奥
    this.scene.add(g);
    const dark = new THREE.MeshStandardMaterial({ color: '#2a2f4a', metalness: 0.7, roughness: 0.35 });
    for (const s of [-1, 1]) { const j = new THREE.Mesh(new THREE.BoxGeometry(0.4, H + 0.3, 0.5), dark); j.position.set(s * (W / 2 - 0.2), (H + 0.3) / 2, 0.05); g.add(j);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.07, H, 0.52), glowMat(col, 2.4)); l.position.set(s * (W / 2 - 0.42), H / 2, 0.05); g.add(l); }
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(W, 0.4, 0.5), dark); lintel.position.set(0, H + 0.1, 0.05); g.add(lintel);
    const pm = new THREE.MeshStandardMaterial({ color: '#c8ccd8', metalness: 0.8, roughness: 0.25 });
    const panels = [-1, 1].map(s => {
      const p = new THREE.Group(); g.add(p);
      if (cage) {   // 鉄格子の引き戸
        const w = W / 2 - 0.4, M = this.arch.mats.iron;
        for (const y of [0.1, H / 2, H - 0.1]) { const b = new THREE.Mesh(new THREE.BoxGeometry(w, 0.08, 0.08), M); b.position.set(s * (W / 4 - 0.2), y, -0.1); p.add(b); }
        for (let n = 0; n < 6; n++) { const b = new THREE.Mesh(new THREE.BoxGeometry(0.05, H, 0.05), M); b.position.set(s * (W / 4 - 0.2) - w / 2 + 0.1 + n * (w - 0.2) / 5, H / 2, -0.1); p.add(b); }
        return { p, s };
      }
      const m = new THREE.Mesh(new THREE.BoxGeometry(W / 2 - 0.4, H, 0.12), pm); m.position.set(s * (W / 4 - 0.2), H / 2, -0.1); p.add(m);
      const w = new THREE.Mesh(new THREE.BoxGeometry(0.5, H * 0.55, 0.14), this.arch.mats.glass); w.position.set(s * (W / 4 - 0.2), H * 0.55, -0.1); p.add(w);
      return { p, s };
    });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 0.85), new THREE.MeshBasicMaterial({ map: signTex(ph.name || 'エレベーター', cage ? '▲▼ 昇降機' : 'STATION ELEVATOR ▲▼', col), transparent: true, toneMapped: false }));
    sign.position.set(0, H + 0.95, 0.35); g.add(sign);
    // 奥の操作盤と床の円
    const back = -ph.depth + 0.25;
    if (cage) {   // 木の操作箱とレバー
      const box = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), this.arch.mats.wood); box.position.set(0, 0.55, back + 0.1); g.add(box);
      const lever = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.9, 6), this.arch.mats.iron); lever.position.set(0.15, 1.4, back + 0.15); lever.rotation.x = 0.4; g.add(lever);
      const knob = new THREE.Mesh(new THREE.SphereGeometry(0.09, 10, 8), glowMat('#ff5a3a', 2)); knob.position.set(0.15, 1.82, back + 0.33); g.add(knob);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.3, 0.22), glowMat(col, 2.2)); lamp.position.set(-0.3, 1.35, back + 0.1); g.add(lamp);
    } else {
      const con = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.6, 0.25), dark); con.position.set(0, 1.3, back); g.add(con);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.5), glowMat('#8ae0ff', 1.5)); scr.position.set(0, 1.75, back + 0.13); g.add(scr);
      for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(new THREE.CircleGeometry(0.07, 12), glowMat(i ? col : '#6dff9e', 2.5)); b.position.set(-0.3 + i * 0.2, 1.1, back + 0.13); g.add(b); }
    }
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1.0, 48), glowMat(col, 2, { side: THREE.DoubleSide })); ring.rotation.x = -Math.PI / 2; ring.position.set(0, 0.03, -ph.depth / 2); g.add(ring);
    return { g, panels, H };
  }
  // 扉・昇降機・籠の動き
  updateMapParts(d, t) {
    const p = this.player, pp = p.pos, T = this.T;
    // 自動扉
    for (const D of this.arch.doors) {
      const near = Math.abs(pp.x - D.x) < D.w / 2 + 3 && Math.abs(pp.z - D.z) < D.d / 2 + 3 && Math.abs(pp.y - D.h) < 2;
      if (near && !D.was) Sfx.door();
      D.was = near;
      D.open += ((near ? 1 : 0) - D.open) * (1 - Math.exp(-9 * d));
      D.apply(D.open);
    }
    // 区画の出入口
    for (const ph of this.exitsPhys) {
      const dx = pp.x - ph.x, dz = pp.z - ph.z, along = dx * ph.nx + dz * ph.nz, lat = Math.abs(dx * ph.nz - dz * ph.nx);
      let want;
      if (ph.cabin) want = !ph.closing && (ph.cells.includes(T.at(pp.x, pp.z)) || (along > -0.5 && along < 4 && lat < ph.width / 2 + 1.5));
      else want = !ph.locked && along > -0.5 && along < 7 && lat < ph.width / 2 + 2.5 && Math.abs(pp.y - ph.h) < 2;
      if (want && !ph.was) Sfx.door();
      ph.was = want;
      ph.open += ((want ? 1 : 0) - ph.open) * (1 - Math.exp(-7 * d));
      ph.apply(ph.open);
      if (ph.lamps) ph.lamps.forEach(l => { l.visible = !ph.locked || Math.sin(t * 5) > 0; });
    }
    // 昇降機
    for (const A of this.arch.lifts) {
      const L = A.L;
      if (L.moving) {
        L.t = Math.min(1, L.t + d / L.dur);
        L.y = lerp(L.from, L.to, Ease.inOut(L.t));
        if (L.t >= 1) { L.moving = false; L.y = L.to; Sfx.turn(); if (this.riding === L) { this.riding = null; this.busy = false; } }
      }
      A.plat.position.y = L.y; A.update();
      A.arrows.forEach((a, i) => { a.material.opacity = 1; a.visible = !L.moving || Math.sin(t * 10 + i * 3) > 0; });
      for (const gt of A.gates) {
        // 床板がその階に止まっているときだけ柵が下がる
        const open = !L.moving && Math.abs(L.y - gt.y) < 0.05 ? 1 : 0;
        gt.o = (gt.o ?? open) + (open - (gt.o ?? open)) * (1 - Math.exp(-8 * d));
        gt.m.position.y = gt.y + 0.55 - gt.o * 1.02;
      }
    }
    if (this.riding) {
      const L = this.riding;
      pp.x += (L.x - pp.x) * (1 - Math.exp(-6 * d)); pp.z += (L.z - pp.z) * (1 - Math.exp(-6 * d));
    }
  }
  moveLift(L, to) {
    if (L.moving || Math.abs(L.y - to) < 0.05) return;
    Object.assign(L, { moving: true, from: L.y, to, t: 0, dur: 0.8 + Math.abs(to - L.y) * 0.3 });
    Sfx.lift();
  }
  // 乗っている昇降機で次の階へ
  rideLift(L) {
    const lv = L.levels, cur = lv.findIndex(v => Math.abs(v - L.y) < 0.05);
    const to = cur >= 0 && cur < lv.length - 1 ? lv[cur + 1] : lv[0];
    this.busy = true; this.keys.clear(); this.riding = L;
    this.moveLift(L, to);
  }
  // 区画間エレベーター：行き先を選ぶ
  cabinMenu(ph) {
    const o = this.root.querySelector('.overlay');
    if (this.overlayOpen || this.busy) return;
    this.busy = true; this.overlayOpen = true; this.keys.clear();
    o.innerHTML = `<div class="ov-box fd-liftbox"><h2>${ph.name || 'ステーション・エレベーター'}</h2><div class="dim">行き先の区画を選んでください</div>
      <div class="fd-floors"><div class="fd-floor here"><b>${this.zone.name}</b><small>現在地</small></div>
      ${ph.dests.map(d => `<button class="fd-floor" data-to="${d.to}" ${d.locked ? 'disabled' : ''}><b>${FIELD_ZONES[d.to].name}</b><small>${d.locked ? '封鎖中（任務を進めると開放）' : '▶ 移動する'}</small></button>`).join('')}</div>
      <button class="btn" data-close>閉じる</button></div>`;
    o.classList.remove('hidden');
    Sfx.select();
    o.querySelector('[data-close]').onclick = () => this.closeOverlay();
    o.querySelectorAll('[data-to]').forEach(b => b.onclick = () => {
      this.closeOverlay(); this.busy = true; ph.closing = true; Sfx.select();
      setTimeout(() => { Sfx.lift(); this.gotoZone(b.dataset.to, { from: this.zoneId }); }, 650);
    });
  }

  // ============================================================
  //  プレイヤー
  // ============================================================
  spawnPlayer(pos, yaw) {
    if (this.player) { this.scene.remove(this.player.m.group); disposeTree(this.player.m.group); }
    const m = buildCharacter(this.team[this.leader].key);
    m.setPose(POSES.idle);
    this.scene.add(m.group);
    this.player = { m, pos: pos.clone(), y: 0, vy: 0, yaw, phase: 0, speed: 0, dir: V3(Math.sin(yaw), 0, Math.cos(yaw)), atk: 0, hitDone: true };
    this.placePlayer(0);
    this.spawnFollowers();
  }
  // 仲間：先頭の子の足あとをたどって一列でついてくる
  spawnFollowers() {
    (this.followers || []).forEach(f => { this.scene.remove(f.m.group); disposeTree(f.m.group); });
    const p = this.player, back = V3(-Math.sin(p.yaw), 0, -Math.cos(p.yaw));
    this.trail = [];
    for (let i = 0; i < 40; i++) this.trail.push(p.pos.clone().addScaledVector(back, i * 0.2));
    // 踏み板で待っている仲間（先頭になった子は、もう待っていない）
    this.holds = (this.holds || []).filter(h => h.key !== this.team[this.leader].key);
    let k = 0;
    this.followers = this.team.map((mem, i) => ({ mem, i })).filter(x => x.i !== this.leader && x.mem.hpRatio > 0).map(x => {
      const m = buildCharacter(x.mem.key); m.setPose(POSES.idle); this.scene.add(m.group);
      const h = this.holds.find(q => q.key === x.mem.key);
      if (h) return { mem: x.mem, m, pos: h.pad.pos.clone(), yaw: p.yaw, phase: 5, speed: 0, gap: 0, side: 0, hold: h.pad };
      // 二匹ずつ横にならんで、先頭の子の後ろをついてくる（カメラと先頭の子のあいだをふさがない）
      const gap = [1.0, 1.0, 2.0][k] ?? 1.0 * (k + 1), side = [-0.62, 0.62, 0][k] ?? 0;
      const pos = p.pos.clone().addScaledVector(back, gap).add(V3(back.z, 0, -back.x).multiplyScalar(side));
      return { mem: x.mem, m, pos, yaw: p.yaw, phase: k++, speed: 0, gap, side };
    });
  }
  updateFollowers(d, t) {
    const p = this.player, tr = this.trail;
    if (tr[0].distanceTo(p.pos) > 0.2) { tr.unshift(p.pos.clone()); if (tr.length > 60) tr.pop(); }
    for (const f of this.followers) {
      // 足あとの列にそって gap だけ後ろの点
      let need = f.gap, target = tr[tr.length - 1].clone(), dir = null;
      for (let i = 1; i < tr.length; i++) { const seg = tr[i - 1].distanceTo(tr[i]); if (need <= seg) { target = tr[i - 1].clone().lerp(tr[i], need / seg); dir = V3().subVectors(tr[i - 1], tr[i]).setY(0).normalize(); break; } need -= seg; }
      if (f.side) { const fw = dir && dir.lengthSq() > 0.5 ? dir : V3(Math.sin(p.yaw), 0, Math.cos(p.yaw)); target.x += fw.z * f.side; target.z -= fw.x * f.side; }
      // 踏み板で待っている子は、踏み板の上へ（着いたら、先頭の子のほうを見る）
      if (f.hold) target = f.hold.pos.clone();
      const dx = target.x - f.pos.x, dz = target.z - f.pos.z, dist = Math.hypot(dx, dz);
      const want = dist > 0.05 ? Math.min(9, dist * 6) : 0;
      f.speed += (want - f.speed) * (1 - Math.exp(-10 * d));
      if (dist > 0.02) { const st = Math.min(dist, f.speed * d); f.pos.x += dx / dist * st; f.pos.z += dz / dist * st; f.yaw = lerpAngle(f.yaw, Math.atan2(dx, dz), 1 - Math.exp(-10 * d)); }
      if (dist > 6 && !f.hold) f.pos.copy(target);
      if (f.hold && dist < 0.1) f.yaw = lerpAngle(f.yaw, Math.atan2(p.pos.x - f.pos.x, p.pos.z - f.pos.z), 1 - Math.exp(-5 * d));
      f.pos.y = this.gy(f.pos.x, f.pos.z);
      this.walkPose(f, d, f.speed > 6);
      f.m.group.position.set(f.pos.x, f.pos.y, f.pos.z); f.m.group.rotation.y = f.yaw;
      // カメラのすぐ前に来たら見えなくする
      f.m.group.visible = this.camera.position.distanceTo(V3(f.pos.x, f.pos.y + 0.5, f.pos.z)) > 1.3;
      f.m.update(d, t + f.phase);
    }
  }
  switchLeader(i) {
    if (this.busy || !this.team[i] || i === this.leader) return;
    if (this.team[i].hpRatio <= 0) { this.toast(`${CHARS[this.team[i].key].name}は戦闘不能です`); return; }
    this.leader = i;
    this.spawnPlayer(this.player.pos, this.player.yaw);
    const col = ELEMENTS[CHARS[this.team[i].key].elem].color;
    this.fx.ring(this.player.pos.clone().add(V3(0, 0.05, 0)), col, { r: 1.4, life: 0.6 });
    this.p.burst(this.player.pos.clone().add(V3(0, 0.6, 0)), col, 40, { speed: 3, life: 0.7 });
    Sfx.meow(this.team[i].key); this.renderTeam();
  }

  updatePlayer(d) {
    const p = this.player, k = this.keys, m = p.m;
    let ix = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    let iz = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    let sprint = k.has('shift');
    const st = this.stick;
    if (st && (st.x || st.y)) { ix = st.x; iz = st.y; if (Math.hypot(ix, iz) > 0.9) sprint = true; }
    const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
    let mx = fx * -iz + -fz * ix, mz = fz * -iz + fx * ix;
    const len = Math.hypot(mx, mz);
    const attacking = p.atk > 0;
    let target = 0;
    if (len > 0 && !this.busy) { mx /= len; mz /= len; target = sprint ? 7.4 : 4.2; p.dir.set(mx, 0, mz); }
    if (attacking) target *= 0.15;
    p.speed += (target - p.speed) * (1 - Math.exp(-10 * d));
    if (len > 0 && !attacking) p.yaw = lerpAngle(p.yaw, Math.atan2(p.dir.x, p.dir.z), 1 - Math.exp(-14 * d));
    this.moveBody(p.pos, p.dir.x * p.speed * d, p.dir.z * p.speed * d, 0.4);
    p.vy -= 20 * d; p.y = Math.max(0, p.y + p.vy * d);
    if (p.y === 0) p.vy = Math.max(0, p.vy);
    this.placePlayer(d);
    if (p.speed > 5.5 && p.y === 0 && Math.random() < d * 20) this.p.emit(p.pos.clone().add(V3(0, 0.1, 0)), V3((Math.random() - 0.5), 0.6, (Math.random() - 0.5)), hdr('#e8dcc8', 0.6), { life: 0.5, size: 0.12 });
    if (attacking) {
      p.atk -= d;
      if (!p.hitDone && p.atk <= 0.29) { p.hitDone = true; this.attackHit(); }
    }
    this.animatePlayer(d, sprint);
    // 地形のある区画の出入口（隔壁扉は近づくと開き、くぐると次の区画へ）
    if (this.T) {
      for (const ph of this.exitsPhys) {
        if (ph.cabin) continue;
        const dx = p.pos.x - ph.x, dz = p.pos.z - ph.z, along = dx * ph.nx + dz * ph.nz, lat = Math.abs(dx * ph.nz - dz * ph.nx);
        const near = along < 3.2 && lat < ph.width / 2 + 1 && Math.abs(p.pos.y - ph.h) < 2;
        if (ph.locked) {
          if (near && !ph.warned) { ph.warned = true; this.toast(`${FIELD_ZONES[ph.dests[0].to].name}：まだ先へは進めない（物語を進めると通れる）`); Sfx.enemy(); }
          else if (!near && along > 6) ph.warned = false;
        } else if (along < 0.75 && lat < ph.width / 2) { this.gotoZone(ph.dests[0].to, { from: this.zoneId }); return; }
      }
      return;
    }
    // ゲート
    for (const g of this.gates) {
      const dist = Math.hypot(p.pos.x - g.x, p.pos.z - g.z);
      if (dist < 1.4) {
        if (g.locked) {
          if (!g.warned) { g.warned = true; this.toast(`${FIELD_ZONES[g.exit.to].name}：封鎖中（任務を進めると通れる）`); Sfx.enemy(); }
          p.pos.x += g.nx * 1.2; p.pos.z += g.nz * 1.2;
        } else { this.gotoZone(g.exit.to, { from: this.zoneId }); return; }
      } else if (dist > 4) g.warned = false;
    }
  }

  // 足もとの高さに合わせて置く（段差はすばやく追う）
  placePlayer(d) {
    const p = this.player, m = p.m;
    p.pos.y = this.gy(p.pos.x, p.pos.z);
    p.vis = p.vis == null || this.riding ? p.pos.y : p.vis + (p.pos.y - p.vis) * (1 - Math.exp(-28 * d));
    m.group.position.set(p.pos.x, p.vis + p.y, p.pos.z);
    m.group.rotation.y = p.yaw;
  }
  // 歩き・走りのポーズ（プレイヤーと住人で共用）
  walkPose(w, d, sprint) {
    const P = w.m.pose;
    const amp = Math.min(1.3, w.speed / 4.2);
    w.phase += d * (4 + w.speed * 1.35);
    const s = Math.sin(w.phase);
    for (const k of POSE_KEYS) P[k] = POSES.idle[k] || 0;
    if (amp > 0.03) {
      const a = Math.min(1, amp);
      P.legLx = s * 0.75 * amp; P.legRx = -s * 0.75 * amp;
      P.kneeL = Math.max(0, -s) * 1.1 * a + 0.05; P.kneeR = Math.max(0, s) * 1.1 * a + 0.05;
      P.armLx = -s * 0.65 * amp; P.armRx = s * 0.65 * amp - 0.1;
      P.elbowL = -0.3 - 0.6 * a; P.elbowR = -0.3 - 0.6 * a;
      P.lean = 0.06 * a + (sprint ? 0.16 * a : 0);
      P.hipsY = -Math.abs(Math.cos(w.phase)) * 0.04 * a;
      P.twist = s * 0.12 * a;
    }
    w.m.idleAmp = amp > 0.1 ? 0.2 : 1;
  }
  animatePlayer(d, sprint) {
    const p = this.player, P = p.m.pose;
    this.walkPose(p, d, sprint);
    if (p.y > 0.05) {
      const w = Math.min(1, p.y * 2);
      for (const k of POSE_KEYS) P[k] = lerp(P[k], POSES.jump[k] || 0, w * 0.7);
    }
    if (p.doze) for (const k of POSE_KEYS) P[k] = lerp(P[k], POSES.sleep[k] || 0, p.doze);
    // 爪とぎ：前のめりになり、両前足を交互に上下させる
    if (p.scratch > 0) {
      p.scratch -= d;
      const sw = Math.sin(p.scratch * 26);
      Object.assign(P, { lean: 0.22, armLx: -1.45 + sw * 0.35, armRx: -1.45 - sw * 0.35, armLz: 0.2, armRz: -0.2, elbowL: -0.5, elbowR: -0.5 });
    }
    if (p.atk > 0) {
      const at = 0.45 - p.atk;
      const blend = (pose, w) => { for (const k of POSE_KEYS) P[k] = lerp(P[k], pose[k] || 0, w); };
      if (at < 0.14) blend(POSES.windup, at / 0.14);
      else if (at < 0.26) { blend(POSES.windup, 1); blend(POSES.strike, (at - 0.14) / 0.12); }
      else { blend(POSES.strike, 1 - (at - 0.26) / 0.19); }
    }
  }

  jump() {
    if (this.player.y === 0) { this.player.vy = 7; Sfx.click(); }
  }
  attack() {
    const p = this.player;
    if (this.busy || p.atk > 0) return;
    p.atk = 0.45; p.hitDone = false;
    let best = null, bd = 3.5;
    for (const g of this.groups) { if (!g.alive) continue; const dd = g.pos.distanceTo(p.pos); if (dd < bd) { bd = dd; best = g; } }
    if (best) p.yaw = Math.atan2(best.pos.x - p.pos.x, best.pos.z - p.pos.z);
    Sfx.swing();
  }
  attackHit() {
    const p = this.player, fwd = V3(Math.sin(p.yaw), 0, Math.cos(p.yaw));
    const col = ELEMENTS[CHARS[this.team[this.leader].key].elem].color;
    const at = p.pos.clone().addScaledVector(fwd, 0.9).add(V3(0, 0.55, 0));
    this.fx.slash(at, col, { cam: this.camera, size: 1.6 });
    this.p.burst(at, col, 14, { speed: 3, life: 0.35, size: 0.08 });
    for (const g of this.groups) {
      if (!g.alive) continue;
      const to = g.pos.clone().sub(p.pos); const dist = to.length();
      if (dist < 1.9 + g.model.radius * 0.6 && to.normalize().dot(fwd) > 0.1) {
        g.model.flash('#ffffff', 1.5); Sfx.hit(); GFX.shake(0.15);
        this.encounter(g, 'player');
        return;
      }
    }
    for (const o of this.rubbleObjs || []) {
      if (o.broken) continue;
      const to = V3(o.pos.x - p.pos.x, 0, o.pos.z - p.pos.z), dist = to.length();
      if (dist < (o.R.r || 1.6) + 1.6 && to.normalize().dot(fwd) > 0.2) { if (o.R.look === 'jackbox') this.hitJackbox(o); else this.breakRubble(o); }
    }
  }
  // 爪を研ぐ：先頭の子が丸太のほうを向き、前足でカリカリ。爪あとが残り、初手技ポイント +1（満タンなら研がない）
  scratch(c) {
    if (this.busy) return;
    if (Save.data.tp >= 5) { this.toast('爪はもう、じゅうぶんとがっている（初手技ポイントは満タン）'); return; }
    const p = this.player, grip = p.m.armR && p.m.armR.grip;
    // 丸太のすぐ前へ寄り、持ち物はしまう
    const away = V3(p.pos.x - c.pos.x, 0, p.pos.z - c.pos.z); if (away.lengthSq() < 1e-4) away.set(0, 0, 1);
    away.normalize(); p.pos.x = c.pos.x + away.x * 0.66; p.pos.z = c.pos.z + away.z * 0.66;
    p.yaw = Math.atan2(c.pos.x - p.pos.x, c.pos.z - p.pos.z); p.scratch = 0.9; this.busy = true;
    this.placePlayer(0);   // 動けないあいだは位置の更新が止まるので、ここでモデルを寄せる
    if (grip) grip.visible = false;
    for (let k = 0; k < 4; k++) Sfx.noise(0.07, 0.16, 4200 + k * 300, k * 0.18);
    setTimeout(() => {
      c.broken = true; this.s.set(this.s.broken, this.zoneId).add(c.id);
      c.setUsed(Math.atan2(p.pos.x - c.pos.x, p.pos.z - c.pos.z));
      this.p.burst(c.pos.clone().add(V3(0, 0.55, 0)), '#d8b07a', 16, { speed: 2, up: 0.6, life: 0.5, size: 0.06 });
      Sfx.meow(this.team[this.leader].key);
      Save.data.tp++; Save.save(); this.toast('バリバリッ！　爪がとがった。初手技ポイント +1');
      this.renderHud(); this.busy = false;
      if (grip) grip.visible = true;
    }, 900);
  }
  useTechnique() {
    if (this.busy) return;
    const key = this.team[this.leader].key, c = CHARS[key];
    if (this.techs.has(key)) { this.toast(`${c.name}の初手技はすでに準備済みです`); return; }
    if (Save.data.tp < 1) { this.toast('初手技ポイントが足りません（爪とぎの丸太で爪を研ぐと回復）'); return; }
    Save.data.tp--; Save.save();
    this.techs.add(key);
    const col = ELEMENTS[c.elem].color, pos = this.player.pos;
    this.fx.pillar(pos, col, { h: 3.5, r: 0.5, life: 0.7, k: 1.5 });
    this.fx.ring(pos.clone().add(V3(0, 0.05, 0)), col, { r: 2, life: 0.6 });
    this.p.burst(pos.clone().add(V3(0, 0.6, 0)), col, 50, { speed: 4, life: 0.8, up: 0.8 });
    this.player.m.flash(col, 0.8);
    Sfx.ult();
    this.toast(`初手技「${c.technique.name}」：次の戦闘開始時に発動`);
    this.renderHud(); this.renderTeam();
  }

  // ============================================================
  //  調べる・話す
  // ============================================================
  nearestInteract() {
    const p = this.player.pos, Z = this.zone;
    for (const n of this.npcs) if (n.pos.distanceTo(p) < 2.2) return { type: 'npc', n, text: `${speakerName(n.key)}と話す${n.shop ? '（' + SHOP_NAMES[n.shop] + '）' : ''}` };
    for (const n of this.notes) {
      const m = n.markAt, nearMark = m && Math.hypot(m.x - p.x, m.z - p.z) < (n.reach || 2.0) + 0.4 && Math.abs(m.y - p.y) < 1.6;
      if (n.pos.distanceTo(p) < (n.reach || 2.0) || nearMark) return { type: 'note', n, text: `調べる：${n.title}` };
    }
    // 玉のりのリング：やりなおしのベルと、大玉（前後・左右にまっすぐ並んだとき、向こう側へ押せる）
    const bo = this.ballObj;
    if (bo && !bo.open) {
      if (Math.hypot(bo.P.reset[0] - p.x, bo.P.reset[1] - p.z) < 1.8) return { type: 'ballReset', text: 'リングのベルを鳴らす（大玉を元の場所へもどす）' };
      for (const b of bo.balls) {
        const dx = b.col.x - p.x, dz = b.col.z - p.z, ax = Math.abs(dx), az = Math.abs(dz);
        if (Math.hypot(dx, dz) > 2.3 || Math.max(ax, az) < 1.0 || Math.min(ax, az) > 0.9 || b.dest) continue;
        return { type: 'ball', b, dx: ax > az ? Math.sign(dx) : 0, dz: ax > az ? 0 : Math.sign(dz), text: bo.ready() ? '大玉を押す' : '調べる：大玉' };
      }
    }
    // 時の水晶
    const to = this.timeObj;
    if (to) for (const q of to.crystals) if (Math.hypot(q.pos.x - p.x, q.pos.z - p.z) < 2.0 && Math.abs(q.pos.y - p.y) < 1.5) {
      const name = TIME_CRYS[q.k];
      return { type: 'time', o: to, q, text: !to.ready() || !to.can(q) ? `調べる：${name}` : to.past ? `${name}にふれる（今にもどす）` : `${name}にふれる（昔の姿を見る）` };
    }
    // 昔の猫たち（昔のあいだだけ見える）
    if (to && to.past) for (const g of to.talkers || []) if (Math.hypot(g.pos.x - p.x, g.pos.z - p.z) < 1.9 && Math.abs(g.pos.y - p.y) < 1.5) return { type: 'ghost', g, text: '昔の猫と話す' };
    for (const o of this.sealObjs || []) if (o.beam && !o.open) for (const m of o.beam.mirrors) if (Math.hypot(m.pos.x - p.x, m.pos.z - p.z) < 1.8 && Math.abs(m.pos.y - p.y) < 1) return { type: 'mirror', o, m, text: `${MIRROR_COLS[m.g][0]}の光の鏡の向きを変える（${MIRROR_COLS[m.g][0]}の鏡はみんな回る）` };
    for (const o of this.sealObjs || []) { if (o.open) continue; const name = o.S.name || '光の水晶'; for (const L of o.lamps) if (!L.lit && L.pos.distanceTo(p) < (o.S.reach || 2.0)) return { type: 'lamp', o, L, text: !o.ready() ? `調べる：${name}` : o.S.verb ? `${o.S.verb}（${speakerName(o.S.who)}）` : o.S.look === 'laugh' ? `${name}を押す` : o.S.labels ? `${name}（${o.S.labels[L.i]}）にふれる` : `${name}に触れる` }; }
    // 二匹の門の踏み板：乗っていれば「ここで待ってて」、仲間が待っていれば「よびもどす」
    for (const o of this.plateObjs || []) {
      if (o.open) continue;
      for (const pad of o.pads) {
        const h = this.holds.find(x => x.pad === pad), f = h && this.followers.find(x => x.mem.key === h.key);
        if (f && f.pos.distanceTo(p) < 1.8) return { type: 'unhold', o, pad, text: `${CHARS[h.key].name}をよびもどす` };
        if (!h && Math.hypot(pad.pos.x - p.x, pad.pos.z - p.z) < 1.0) { const free = this.followers.find(x => !x.hold); return { type: 'hold', o, pad, f: free, text: free ? `${CHARS[free.mem.key].name}に、ここで待っていてもらう` : `調べる：${o.P.name || '踏み板'}` }; }
      }
    }
    // 見張りの番犬：タマが先頭なら、こもりうたで眠らせられる
    for (const g of this.guards || []) if (!g.asleep && g.pos.distanceTo(p) < 2.6) return { type: 'guard', g, text: this.team[this.leader].key === 'tama' ? 'こもりうたを歌う（タマ）' : '調べる：見張りの番犬' };
    for (const o of this.rubbleObjs || []) if (!o.broken && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < (o.R.r || 1.6) + 1.2) return { type: 'rubble', o, text: o.R.look !== 'jackbox' ? '調べる：落石の岩山' : o.seen ? `ねじを巻く（いま ${o.turns}回）` : '調べる：巨大びっくり箱' };
    if (this.sleeper && this.sleeper.pos.distanceTo(p) < 2.0) return { type: 'sleeper', text: `${this.sleeper.SW.name || speakerName(this.sleeper.SW.key)}に話しかける` };
    for (const n of this.naps) if (Math.hypot(n.pos.x - p.x, n.pos.z - p.z) < 2.4) return { type: 'nap', n, text: `${n.name || speakerName(n.key)}に話しかける` };
    for (const o of this.fluffObjs || []) if (o.ready && Math.hypot(o.pos.x - p.x, o.pos.z - p.z) < 1.8 && Math.abs(o.pos.y - p.y) < 1) return { type: 'fluff', o, text: '綿毛につかまる' };
    for (const c of this.chests) if (!c.opened && c.pos.distanceTo(p) < 2.0) return { type: 'chest', c, text: '宝箱を開ける' };
    for (const c of this.crystals) if (c.pos.distanceTo(p) < 1.8) return { type: 'post', c, text: c.broken ? '調べる：爪とぎの丸太' : '爪を研ぐ：爪とぎの丸太' };
    const same = (x, z) => Math.abs(this.gy(x, z) - p.y) < 1.5;
    if (!Z.noAnchor && Math.hypot(p.x - Z.anchor[0], p.z - Z.anchor[1]) < 2.6 && same(Z.anchor[0], Z.anchor[1])) return { type: 'anchor', text: 'ねこ地蔵：ひと休み（HP回復）／ワールドマップ' };
    if (this.T) {
      const i = this.T.at(p.x, p.z);
      // 区画間エレベーターの籠の中
      const cab = this.exitsPhys.find(g => g.cabin && g.cells.includes(i));
      if (cab) return { type: 'cabin', g: cab, text: 'エレベーター：行き先を選ぶ' };
      // 昇降機に乗っている
      const li = i >= 0 ? this.T.liftOf[i] : -1;
      if (li >= 0) {
        const L = this.T.lifts[li];
        if (!L.moving && L.levels.length > 1) return { type: 'lift', L, text: L.y < L.levels[L.levels.length - 1] - 0.05 ? 'エレベーター：上の階へ' : 'エレベーター：下の階へ' };
      }
      // 乗り場（昇降機が別の階にいる）
      for (const L of this.T.lifts) {
        if (L.moving || L.levels.length < 2) continue;
        const dx = Math.max(Math.abs(p.x - L.x) - L.w / 2, 0), dz = Math.max(Math.abs(p.z - L.z) - L.d / 2, 0);
        const lv = L.levels.find(v => Math.abs(v - p.y) < 0.3);
        if (Math.hypot(dx, dz) < 1.3 && lv != null && Math.abs(L.y - lv) > 0.05) return { type: 'call', L, lv, text: 'エレベーターを呼ぶ' };
      }
    }
    return null;
  }
  interact() {
    if (this.talk) { this.advanceTalk(); return; }
    if (this.busy) return;
    const it = this.nearestInteract(); if (!it) return;
    if (it.type === 'npc') {
      const n = it.n; this.startTalk(speakerName(n.key), npcLines(n), n);
    } else if (it.type === 'note') {
      this.startTalk(it.n.title, [it.n.text], null, true);
    } else if (it.type === 'lamp') {
      this.lightLamp(it.o, it.L);
    } else if (it.type === 'rubble') {
      const o = it.o, R = o.R;
      if (R.look !== 'jackbox') this.startTalk('落石の岩山', ['崩れた岩が、石段の上り口をふさいでいる。……攻撃すれば、砕けそうだ。'], null, true);
      else if (o.seen) this.windBox(o);
      else {
        // はじめて調べたとき：札と、ねじまきハンドルのこと。二度目からは、F でねじを巻く
        o.seen = true;
        this.startTalk('巨大びっくり箱', [`「${R.act || '？'}」と書かれた札の、大きなびっくり箱。横に、ねじまきハンドルがついている。`, ...(R.hint ? [R.hint] : []),
          '……ねじを巻いて（F）、ふたをたたけば（攻撃）、開きそうだ。でも、何回巻けばいいんだろう？'], null, true);
      }
    } else if (it.type === 'ball') {
      this.pushBall(it.b, it.dx, it.dz);
    } else if (it.type === 'ballReset') {
      this.resetBalls();
    } else if (it.type === 'ghost') {
      this.talkGhost(it.g);
    } else if (it.type === 'time') {
      this.touchTime(it.o, it.q);
    } else if (it.type === 'mirror') {
      this.turnMirror(it.o, it.m);
    } else if (it.type === 'hold') {
      this.holdPad(it.o, it.pad, it.f);
    } else if (it.type === 'unhold') {
      this.holds = this.holds.filter(h => h.pad !== it.pad); this.followers.forEach(f => { if (f.hold === it.pad) f.hold = null; });
      Sfx.select(); this.toast('……よびもどした。いっしょに行こう');
    } else if (it.type === 'guard') {
      this.lullaby(it.g);
    } else if (it.type === 'fluff') {
      this.glide(it.o);
    } else if (it.type === 'sleeper') {
      this.startTalk(this.sleeper.SW.name || speakerName(this.sleeper.SW.key), this.sleeper.SW.talk || ['……すぴー……']);
    } else if (it.type === 'nap') {
      this.startTalk(it.n.name || speakerName(it.n.key), it.n.talk || ['……すぴー……']);
    } else if (it.type === 'post') {
      if (it.c.broken) this.startTalk('爪とぎの丸太', ['縄に、くっきりと爪あとが残っている。……ここではもう、研いだばかりだ。', '爪とぎの丸太で爪を研ぐと、初手技ポイントが1回復する（最大5）。初手技ポイントを使うと、E で先頭の子の初手技を準備できる。次の戦闘のはじめに発動する。'], null, true);
      else this.scratch(it.c);
    } else if (it.type === 'chest') {
      const c = it.c; c.opened = true;
      const all = Save.data.fieldChests || (Save.data.fieldChests = {});
      (all[this.zoneId] = all[this.zoneId] || []).push(c.id);
      const nib = 40 + Math.floor(Math.random() * 7) * 10;
      Save.data.niboshi += nib; Save.save();
      GFX.tween(0.5, t => { c.lid.rotation.x = -1.9 * t; }, Ease.back);
      c.glow.visible = false;
      this.fx.pillar(c.pos, '#ffd66b', { h: 3, r: 0.4, life: 0.8 });
      this.p.burst(c.pos.clone().add(V3(0, 0.7, 0)), '#ffd66b', 60, { speed: 4, up: 1.2, life: 1.0 });
      Sfx.win();
      this.toast(`宝箱：にぼし +${nib}`);
      this.renderHud();
    } else if (it.type === 'anchor') {
      this.team.forEach(m => { m.hpRatio = 1; });
      const Z = this.zone;
      this.fx.ring(V3(Z.anchor[0], this.gy(Z.anchor[0], Z.anchor[1]) + 0.05, Z.anchor[1]), '#6fd6ff', { r: 3, life: 0.8 });
      this.p.burst(this.player.pos.clone().add(V3(0, 1, 0)), '#6dff9e', 50, { speed: 2, up: 2, life: 1 });
      Sfx.heal();
      this.toast('ねこ地蔵に手を合わせた。みんなのHPが回復した');
      this.spawnFollowers();
      this.renderTeam();
      this.mapMenu();
    } else if (it.type === 'lift') this.rideLift(it.L);
    else if (it.type === 'call') { this.moveLift(it.L, it.lv); this.toast('エレベーターを呼んだ'); }
    else if (it.type === 'cabin') this.cabinMenu(it.g);
  }
  // 光の水晶を灯す。影の壁の水晶をすべて灯すと、壁が消える
  lightLamp(o, L) {
    const S = o.S, name = S.name || '光の水晶';
    if (!o.ready()) { this.startTalk(name, [S.idle || 'かすかに光る水晶。……今は、ふれても何も起きない。'], null, true); return; }
    const flags = Save.data.flags || (Save.data.flags = {});
    if (S.who && !this.featReady(S)) return;
    // のろし台：シロの魔法は、ときどき失敗する（最初の一回は、かならず魚）
    if (S.fails && !L.tried && (!flags[S.id + '_miss'] || Math.random() < 0.3)) {
      L.tried = true; flags[S.id + '_miss'] = true; Save.save();
      this.fishRain(L.pos.clone().add(V3(0, 1.2, 0)));
      this.startTalk('', pick(S.fails));
      return;
    }
    if (S.look === 'beacon' || S.look === 'bar') { this.doFeat(o, L); return; }
    // 順番（S.order）：決まった順にふれないと、灯した光はみんな消えてしまう
    if (S.order && S.order[o.lamps.filter(x => x.lit).length] !== L.i) { this.wrongOrder(o); return; }
    L.setLit(); flags[o.S.id + '_' + L.i] = true;
    if (S.hold) { L.left = S.hold; flags[S.id + '_t' + L.i] = S.hold; }
    const at = L.pos.clone().add(V3(0, 1.3, 0)), laugh = S.look === 'laugh';
    const col = S.look === 'memory' ? '#ffe2a8' : laugh ? '#ffe07a' : '#cfefff';
    this.fx.pillar(L.pos, col, { h: 5, r: 0.6, life: 0.8 }); this.p.burst(at, col, 50, { speed: 3, up: 1, life: 0.9 });
    if (laugh) { Sfx.laugh(); this.p.burst(at, '#ff9ad8', 30, { speed: 4, up: 2, life: 1.2, size: 0.1 }); } else Sfx.heal();
    const n = o.lamps.filter(x => x.lit).length, all = n === o.lamps.length;
    if (all && o.beam) {
      // 光の筋：大水晶が光を放つ。受けの水晶に届いていれば、そのまま壁が消える
      o.beam.active = true; o.beam.update(); o.lamps.forEach(x => { x.left = 0; delete flags[S.id + '_t' + x.i]; });
      this.fx.pillar(V3(o.beam.B.from[0], this.gy(...o.beam.B.from), o.beam.B.from[1]), '#cfefff', { h: 8, r: 1, life: 1 });
      if (o.beam.hit) this.openSeal(o);
      else setTimeout(() => { Sfx.heal(); this.toast(S.beamToast || '三つの光が、大水晶に集まった！　光の鏡で、光の筋を影の壁まで導こう'); }, 500);
    } else if (all) {
      o.lamps.forEach(x => { x.left = 0; delete flags[S.id + '_t' + x.i]; });
      this.openSeal(o);
    } else this.toast(S.hold && n === 1 ? `光の水晶が灯った（1/${o.lamps.length}）　……この光は、${S.hold}びょうで消えてしまう！` : S.look === 'memory' || laugh ? `${name}（${n}/${o.lamps.length}）` : `光の水晶が灯った（${n}/${o.lamps.length}）`);
    Save.save();
    // 記憶のかけら：その仲間の思い出を、クロが語る。笑い袋：袋が笑い出して、みんなの掛け合い
    if (S.memories && S.memories[L.i]) this.startTalk(speakerName('kuro'), S.memories[L.i]);
    if (laugh) this.startTalk('', [['n', `笑い袋が「${(S.laughs || [])[L.i] || 'ワッハッハ！'}」と笑い出した！`], ...((S.gags || [])[L.i] || []).filter(([k]) => k === 'n' || this.team.some(m => m.key === k))]);
  }
  openSeal(o) {
    Save.data.flags[o.S.id] = true; o.dissolve(); Save.save();
    setTimeout(() => { Sfx.win(); GFX.shake(0.2); this.toast(o.S.openToast || '影の壁が、光にとけて消えた！'); }, 500);
  }
  // 光の鏡の向きを変える（「/」⇔「＼」）。同じ色の鏡は、みんないっしょに回る。光の筋が受けの水晶に届けば、影の壁が消える
  turnMirror(o, m) {
    const b = o.beam, flags = Save.data.flags || (Save.data.flags = {}), g = m.g;
    b.gst[g] ^= 1; flags[`${o.S.id}_g${g}`] = b.gst[g]; Save.save();
    Sfx.tone(880, 0.12, 'triangle', 0.05, 220); Sfx.tone(1320, 0.18, 'sine', 0.03, 0, 0.06);
    for (const q of b.mirrors) if (q.g === g) { q.target = q.ry(b.gst[g]); this.p.burst(q.pos.clone().add(V3(0, 1.2, 0)), MIRROR_COLS[g][1], 16, { speed: 2, up: 0.5, life: 0.5, size: 0.08 }); }
    b.update();
    if (!b.active) { this.toast('光の鏡の向きが変わった。……今は、光が来ていない'); return; }
    if (b.hit && !o.open) this.openSeal(o);
  }
  // 記憶のかけらを、ちがう順にさわった：灯した光がみんな消えて、遠くへ押しもどされる
  wrongOrder(o) {
    const S = o.S, flags = Save.data.flags;
    o.lamps.forEach(x => { if (x.lit) { x.setUnlit(); delete flags[S.id + '_' + x.i]; } });
    Save.save();
    Sfx.tone(90, 1.2, 'sawtooth', 0.06, -40); GFX.flash('#2a1040', 0.6, 0.8); GFX.shake(0.25);
    const say = S.wrong || [['n', '……光が、すうっと消えていく。']];
    this.startTalk('', say);
    if (S.back) this.talk.after = () => this.sendBack(S.back, V3(0, 0, 0), S.backToast || '……気がつくと、ずっと手前に立っていた', 900);
  }
  // 灯りの時間（S.hold）：いちばん先に灯した水晶の残りの秒を数える。その光が消えたら、灯した水晶はみんな消えて、やりなおし
  //   （知らせも、いちばん先に灯した水晶のぶんだけ出す）
  updateSealTimers(d) {
    const flags = Save.data.flags;
    for (const o of this.sealObjs || []) {
      const S = o.S; if (!S.hold || o.open) continue;
      const lit = o.lamps.filter(L => L.lit && L.left > 0); if (!lit.length) continue;
      lit.forEach(L => { L.left -= d; flags[S.id + '_t' + L.i] = Math.max(0, L.left); });
      const first = lit.reduce((a, b) => (b.left < a.left ? b : a));
      // 30・20・10・5 秒をこえるたびに知らせる（戦闘から戻ったときも、残りの秒をそのまま出す）
      const mark = [30, 20, 10, 5].filter(v => first.left <= v).pop();
      if (mark && mark !== o.warned) { o.warned = mark; this.toast(`光の水晶の光が消えるまで、あと ${Math.ceil(first.left)} びょう！`); Sfx.tone(660, 0.08, 'square', 0.03); }
      if (first.left > 0) continue;
      o.lamps.forEach(L => { if (L.lit) { L.setUnlit(); delete flags[S.id + '_' + L.i]; delete flags[S.id + '_t' + L.i]; } });
      o.warned = 0; Save.save();
      Sfx.tone(300, 0.6, 'sine', 0.06, -200); this.toast(S.fadeToast || '……光の水晶の光が、影に食べられて消えてしまった。はじめから灯しなおそう');
    }
  }
  // わざの仕掛け：S.who の子が先頭でなければ、先頭の子のひとことと手がかり（1〜4で交代）
  featReady(S) {
    const lead = this.team[this.leader].key, name = speakerName(S.who);
    if (lead === S.who) return true;
    const say = (S.tries || {})[lead], inTeam = this.team.some(m => m.key === S.who);
    this.startTalk('', [...(say ? [[lead, say]] : []), ['n', (S.hint || `${name}なら、なんとかできそうだ。`) + (inTeam ? '（1〜4で先頭の子を交代）' : `（${name}は、いま一行にいない。編成に入れよう）`)]]);
    return false;
  }
  // のろし台に火をつける／かんぬきを外す
  doFeat(o, L) {
    const S = o.S, flags = Save.data.flags;
    L.setLit(); flags[S.id + '_' + L.i] = true;
    const n = o.lamps.filter(x => x.lit).length, all = n === o.lamps.length, beacon = S.look === 'beacon';
    if (beacon) { this.fx.pillar(L.pos, '#ff9a3a', { h: 6, r: 0.7, life: 0.9 }); this.p.burst(L.pos.clone().add(V3(0, 1.4, 0)), '#ffb04a', 60, { speed: 4, up: 2, life: 1 }); Sfx.fire(); }
    else { Sfx.slam(); GFX.shake(0.25); this.p.burst(L.pos.clone().add(V3(0, 1.4, 0)), '#c8a070', 40, { speed: 3, up: 1, life: 0.8, size: 0.12 }); }
    if (all) { flags[S.id] = true; o.dissolve(); setTimeout(() => { Sfx.door(); Sfx.win(); GFX.shake(0.2); this.toast(S.openToast || '門が開いた！'); }, beacon ? 700 : 500); }
    else this.toast(`${S.name}（${n}/${o.lamps.length}）`);
    Save.save();
    const say = (all && S.done) || S.lit;
    if (say) this.startTalk('', say.filter(([k]) => k === 'n' || this.team.some(m => m.key === k)));
  }
  // 空から魚が降ってくる（シロの魔法の失敗）
  fishRain(at) {
    for (let i = 0; i < 10; i++) {
      const f = new THREE.Mesh(new THREE.SphereGeometry(0.1, 8, 6), toon(pick(['#8ab8d8', '#b8c8d8', '#ff9a7a']))); f.scale.set(0.5, 0.6, 2);
      const x = at.x + (Math.random() - 0.5) * 3, z = at.z + (Math.random() - 0.5) * 3, y0 = at.y + 5 + Math.random() * 2, g = this.gy(x, z) + 0.06, spin = Math.random() * 10;
      f.position.set(x, y0, z);
      this.fx.add(f, 2.2, (k, o, dt) => { o.position.y = Math.max(g, y0 - k * k * 16); if (o.position.y > g) o.rotation.x += spin * dt; });
    }
    this.p.burst(at, '#ffd23c', 30, { speed: 3, life: 0.6 }); Sfx.tone(600, 0.3, 'triangle', 0.05, -300);
  }
  // 二匹の門：先頭の子が乗っている踏み板で、仲間に待っていてもらう
  holdPad(o, pad, f) {
    if (!o.ready()) { this.startTalk(o.P.name || '踏み板', [o.P.idle || '肉球の形の踏み板。……今は、踏んでも何も起きない。'], null, true); return; }
    if (!f) { this.startTalk(o.P.name || '踏み板', ['踏み板は、ふたつそろって踏まないと動かないようだ。……いっしょに踏んでくれる仲間がいない。'], null, true); return; }
    const key = f.mem.key;
    this.holds.push({ pad, key }); f.hold = pad;
    Sfx.meow(key); this.toast(`${CHARS[key].name}「${pick(HOLD_LINES[key] || ['ここで待ってる！'])}」`);
  }
  // 踏み板をすべて踏んでいれば、門が開く（待っていた仲間は、またついてくる）
  updatePlates() {
    const p = this.player;
    for (const o of this.plateObjs || []) {
      if (o.open) continue;
      let all = o.ready();
      for (const pad of o.pads) {
        const f = this.followers.find(x => x.hold === pad);
        pad.on = f ? Math.hypot(f.pos.x - pad.pos.x, f.pos.z - pad.pos.z) < 0.6 : Math.hypot(p.pos.x - pad.pos.x, p.pos.z - pad.pos.z) < 1.0 && Math.abs(p.pos.y - pad.pos.y) < 0.6 && p.y < 0.2;
        if (!pad.on) all = false;
      }
      if (!all) continue;
      const helpers = this.holds.filter(h => o.pads.includes(h.pad)).map(h => h.key);
      (Save.data.flags || (Save.data.flags = {}))[o.P.id] = true; Save.save();
      o.dissolve(); this.holds = this.holds.filter(h => !o.pads.includes(h.pad)); this.followers.forEach(f => { if (o.pads.includes(f.hold)) f.hold = null; });
      Sfx.slam(); GFX.shake(0.3); setTimeout(() => { Sfx.win(); this.toast(o.P.openToast || 'ゴゴゴ……門が開いた！'); }, 600);
      const lead = this.team[this.leader].key;
      const say = (o.P.done || []).map(([k, t]) => { const who = k === 'lead' ? lead : k === 'helper' ? helpers[0] : k; return [who, typeof t === 'string' ? t : t && t[who]]; });
      this.startTalk('', [['n', '踏み板の肉球が光り、石の門が、ゴゴゴ……と左右に開いた。'], ...say.filter(([k, t]) => k && t && (k === 'n' || this.team.some(m => m.key === k)))]);
    }
  }
  // 見張りの番犬：道を見回り、前の扇（見える範囲。壁の向こうは見えない）に入ると見つかって、back へ追い返される
  updateGuards(d, t) {
    const p = this.player, T = this.T;
    for (const g of this.guards || []) {
      const G = g.G, m = g.m;
      if (g.asleep) {
        g.sleepK = Math.min(1, (g.sleepK || 0) + d * 1.5);
        m.group.position.set(g.pos.x, g.pos.y - g.sleepK * 0.15, g.pos.z); m.group.rotation.set(0, g.yaw, g.sleepK * 1.2);
        g.cone.material.opacity = Math.max(0, g.cone.material.opacity - d);
        if ((g.zt -= d) <= 0) { g.zt = 1.3; floatZ(this.fx, g.pos.clone().add(V3(0.3, m.height * 0.7, 0))); }
        m.update(d * 0.2, t);
        continue;
      }
      // 見回り：道の点を行ったり来たり。点に着くと、しばらく左右を見まわす
      const R = G.route, tgt = R[g.i];
      if (g.wait > 0) { g.wait -= d; g.yaw = g.baseYaw + Math.sin(((G.wait || 1.8) - g.wait) * 2.4) * 0.9; }
      else {
        const dx = tgt[0] - g.pos.x, dz = tgt[1] - g.pos.z, l = Math.hypot(dx, dz), st = Math.min(l, (G.speed || 2.2) * d);
        if (l < 0.1) { g.wait = G.wait || 1.8; g.baseYaw = g.yaw; if (g.i + g.dir < 0 || g.i + g.dir >= R.length) g.dir = -g.dir; g.i += g.dir; }
        else { g.pos.x += dx / l * st; g.pos.z += dz / l * st; g.yaw = lerpAngle(g.yaw, Math.atan2(dx, dz), 1 - Math.exp(-8 * d)); }
      }
      g.pos.y = this.gy(g.pos.x, g.pos.z);
      m.group.position.copy(g.pos); m.group.rotation.set(0, g.yaw, 0); m.update(d, t);
      // 見える範囲の扇：光線ごとに、壁や段差でさえぎられるところまで
      const r = G.r || 6.5, fov = G.fov || 0.6, N = 18, pos = g.cone.geometry.attributes.position;
      pos.setXYZ(0, g.pos.x, g.pos.y + 0.07, g.pos.z);
      for (let k = 0; k <= N; k++) {
        const a = g.yaw - fov + 2 * fov * k / N, sx = Math.sin(a), sz = Math.cos(a);
        let dist = 0.4;
        for (; dist < r; dist += 0.35) { const i = T.at(g.pos.x + sx * dist, g.pos.z + sz * dist); if (i < 0 || !T.isWalkKind(T.kind[i]) || Math.abs(T.h[i] - g.pos.y) > 0.6) break; }
        pos.setXYZ(k + 1, g.pos.x + sx * dist, g.pos.y + 0.07, g.pos.z + sz * dist);
      }
      pos.needsUpdate = true; g.cone.geometry.computeBoundingSphere();
      g.alert = Math.max(0, g.alert - d);
      g.cone.material.color.copy(hdr(g.alert ? '#ff4a3a' : '#ffc84a', 1.2)); g.cone.material.opacity = 0.3 + Math.sin(t * 4) * 0.05;
      // 見つかる：扇の中で、あいだに壁がないとき
      if (this.busy || this.flight || this.grace > 0) continue;
      const vx = p.pos.x - g.pos.x, vz = p.pos.z - g.pos.z, dist = Math.hypot(vx, vz);
      const dAng = Math.abs(((Math.atan2(vx, vz) - g.yaw + Math.PI * 3) % (Math.PI * 2)) - Math.PI);
      if (dist < r && dAng < fov && Math.abs(p.pos.y - g.pos.y) < 1.2 && T.clearLine(g.pos.x, g.pos.z, p.pos.x, p.pos.z, g.pos.y)) this.spotted(g);
    }
  }
  spotted(g) {
    g.alert = 2.5; Sfx.bark(); GFX.shake(0.15);
    this.p.burst(g.pos.clone().add(V3(0, g.m.height + 0.3, 0)), '#ff3040', 30, { speed: 3, up: 2, life: 0.6 });
    this.toast('ワンワンッ！　見張りの番犬に見つかった！');
    this.sendBack(g.G.back, g.pos, '……番犬に、庭の入口まで追い返されてしまった。扇の光に入らないように進もう', 900);
  }
  // こもりうた：タマが先頭なら、番犬は眠ってしまう
  lullaby(g) {
    const lead = this.team[this.leader].key;
    if (lead !== 'tama') {
      const say = { mike: 'そーっと……そーっと……。……これ以上近づいたら、ほえられちゃう！', kuro: '……眠らせるか、見つからずに抜けるか、だな。', shiro: 'しーっ……。こういうときは、魔法より、子守歌よね。', maou: '……犬は苦手だ。' }[lead];
      const inTeam = this.team.some(m => m.key === 'tama');
      this.startTalk('', [...(say ? [[lead, say]] : []), ['n', '見張りの番犬は、まだこちらに気づいていない。……タマのこもりうたなら、眠らせられるかもしれない。' + (inTeam ? '（1〜4で先頭の子を交代）' : '（タマを編成に入れよう）')]]);
      return;
    }
    g.asleep = true; (Save.data.flags || (Save.data.flags = {}))[g.G.id] = true; Save.save();
    Sfx.lullaby();
    for (let i = 0; i < 6; i++) setTimeout(() => this.p.emit(this.player.pos.clone().add(V3((Math.random() - 0.5) * 0.6, 1.2, (Math.random() - 0.5) * 0.6)), V3((g.pos.x - this.player.pos.x) * 0.5, 0.6, (g.pos.z - this.player.pos.z) * 0.5), hdr(pick(['#fff0a8', '#ffc8ec', '#c8e8ff']), 2), { life: 1.8, size: 0.12, drag: 0.2 }), i * 180);
    this.startTalk('', [['tama', '……ねんねん、ころりよ……おころりよ……。'], ['n', '番犬は、大きなあくびをひとつすると、その場で丸くなって眠ってしまった。'], ['tama', '……おやすみ。……ぼくも、ねむく……なってきた……。']]);
  }
  // ごろごろ岩：谷を行ったり来たり爆走する（後ろに土けむりと排気のけむり、近くを通るとラッパ）。ぶつかると、はねとばされる
  updateRollers(d, t) {
    const p = this.player;
    for (const o of this.rollers || []) {
      const R = o.R, len = o.a.distanceTo(o.b), per = len / (R.speed || 5);
      const c = ((t / per + (R.ph || 0) * 2) % 2 + 2) % 2, u = c < 1 ? c : 2 - c, e = u * u * (3 - 2 * u) * 0.3 + u * 0.7;
      const x = lerp(o.a.x, o.b.x, e), z = lerp(o.a.z, o.b.z, e), y = this.gy(x, z), dirSign = c < 1 ? 1 : -1;
      o.roll += Math.hypot(x - o.pos.x, z - o.pos.z) / (R.r || 1.1);
      o.pos.set(x, y, z);
      // 岩の本体だけがころがり、顔とリーゼントは進む向きを向いたまま（向きを変えるときは、くるっとふり返る）。前のめりに、はねながら走る
      const rr = R.r || 1.1, fx = Math.sin(o.yaw), fz = Math.cos(o.yaw);
      const want = o.yaw + (dirSign < 0 ? Math.PI : 0); o.face = o.face == null ? want : o.face + Math.atan2(Math.sin(want - o.face), Math.cos(want - o.face)) * (1 - Math.exp(-10 * d));
      o.m.group.userData.spin = o.roll;
      o.m.group.rotation.set(0.12, o.face, 0, 'YXZ');
      o.m.group.position.set(x, y + Math.abs(Math.sin(t * 9 + (R.ph || 0) * 7)) * 0.12 * rr, z);
      o.m.update(d, t);
      if (Math.random() < d * 10) this.p.emit(V3(x + (Math.random() - 0.5), y + 0.1, z + (Math.random() - 0.5)), V3(0, 0.6, 0), hdr('#c8b89a', 0.8), { life: 0.6, size: 0.12, drag: 1 });
      if (Math.random() < d * 14) { const bx = -fx * dirSign, bz = -fz * dirSign; this.p.emit(V3(x + bx * rr, y + 0.35, z + bz * rr), V3(bx * 1.6 + (Math.random() - 0.5) * 0.4, 0.5 + Math.random() * 0.4, bz * 1.6), hdr(pick(['#8a8a90', '#a8a8ae', '#6a6a72']), 0.5), { life: 1.1, size: 0.32, drag: 0.6 }); }
      const near = Math.hypot(p.pos.x - x, p.pos.z - z);
      if ((o.honk -= d) <= 0) { o.honk = 5 + Math.random() * 5; if (near < 14 && !this.busy) Sfx.horn(Math.max(0.25, 1 - near / 14)); }
      if (this.busy || this.flight || this.grace > 0) continue;
      if (near < (R.r || 1.1) + 0.45 && Math.abs(p.pos.y - y) < 1.2) this.knock(o);
    }
  }
  // はねとばされる：弧をえがいて back へ（トランポリンと同じ飛び方）
  knock(o) {
    const p = this.player, from = p.pos.clone(), to = V3(o.R.back[0], this.gy(o.R.back[0], o.R.back[1]), o.R.back[1]);
    this.busy = true; this.keys.clear();
    this.flight = { from, to, t: 0, dur: 0.9, h: 2.4, yaw: p.yaw, bump: true };
    (this.followers || []).forEach(f => { f.m.group.visible = false; });
    Sfx.hit(); Sfx.boing(); GFX.shake(0.3);
    this.p.burst(from.clone().add(V3(0, 0.6, 0)), '#c8b89a', 30, { speed: 4, up: 1.5, life: 0.7, size: 0.12 });
    this.toast(pick(['ごろごろ……どーん！　ごろごろ岩に、はねとばされた！', 'ごろごろ岩「どけどけぇ〜っ！　ごろごろ団のお通りっス！」', 'ごろごろ岩「わりぃっス！　ブレーキ、ついてねえんス！」', 'パラリラパラリラ〜♪　……ごろごろ岩は、ごきげんに走っていった']));
  }
  // 見つかった・眠った：画面を暗くして、pos で目をさます（faceTo のほうを向く）
  sendBack(pos, faceTo, msg, delay = 1500, then = null) {
    this.busy = true; this.keys.clear();
    setTimeout(() => this.root.querySelector('.fd-wipe').classList.add('on'), delay - 800);
    setTimeout(() => {
      const p = this.player, b = V3(pos[0], 0, pos[1]);
      p.pos.set(b.x, this.gy(b.x, b.z), b.z); p.vis = null; p.y = 0; p.vy = 0; p.speed = 0; p.doze = 0;
      p.yaw = Math.atan2(faceTo.x - b.x, faceTo.z - b.z); this.camYaw = p.yaw + Math.PI;
      if (then) then();
      this.placePlayer(0); this.spawnFollowers();
      this.camera.position.set(p.pos.x + Math.sin(this.camYaw) * 4, p.pos.y + 2.4, p.pos.z + Math.cos(this.camYaw) * 4); this.curLook.set(p.pos.x, p.pos.y + 0.8, p.pos.z);
      this.root.querySelector('.fd-wipe').classList.remove('on');
      this.busy = false; this.grace = 1.5;
      if (msg) this.toast(msg);
    }, delay);
  }
  // 落石の岩山を砕く
  breakRubble(o) {
    o.broken = true; (Save.data.flags || (Save.data.flags = {}))[o.R.id] = true; Save.save();
    const i = this.colliders.indexOf(o.col); if (i >= 0) this.colliders.splice(i, 1);
    if (o.R.look === 'jackbox') { this.popJackbox(o); return; }
    const at = o.pos.clone().add(V3(0, 0.8, 0));
    this.p.burst(at, '#8a8478', 70, { speed: 5, up: 1.4, life: 0.9, size: 0.14 }); this.fx.ring(o.pos.clone().add(V3(0, 0.05, 0)), '#c8b8a0', { r: 2.5, life: 0.5 });
    Sfx.hit(); GFX.shake(0.35);
    GFX.tween(0.35, t => { o.g.scale.setScalar(1 - t); o.g.position.y = o.pos.y - t * 0.5; }, Ease.inOut);
    setTimeout(() => o.g.removeFromParent(), 400);
    this.toast('岩山を砕いた！　石段を上れるようになった');
  }
  // 巨大びっくり箱：ふたが跳ね上がり、ばねの先のピエロの顔が「ばあっ！」と飛び出して、箱ごとしぼんで消える
  popJackbox(o) {
    const at = o.pos.clone().add(V3(0, 2.5, 0));
    Sfx.pop(); GFX.shake(0.3);
    this.p.burst(at, '#ffd27a', 40, { speed: 6, up: 3, life: 1.2, size: 0.12 }); this.p.burst(at, '#ff6a8a', 40, { speed: 6, up: 3, life: 1.2, size: 0.12 }); this.p.burst(at, '#6ad8ff', 30, { speed: 5, up: 3, life: 1.2, size: 0.1 });
    o.jack.visible = true; o.jack.scale.set(1, 0.05, 1);
    GFX.tween(0.25, t => { o.lid.rotation.x = -t * 2.2; }, Ease.out);
    GFX.tween(0.7, t => { const k = 1 + Math.sin(t * Math.PI * 3) * (1 - t) * 0.5; o.jack.scale.set(1, t * k + 0.05, 1); o.jack.rotation.z = Math.sin(t * 18) * (1 - t) * 0.3; });
    this.toast('びっくり箱が開いた！　「ばあっ！」');
    setTimeout(() => { GFX.tween(0.5, t => { o.g.scale.setScalar(1 - t); }, Ease.inOut); }, 1300);
    setTimeout(() => { o.g.removeFromParent(); this.toast('……びっくり箱がしぼんで、通れるようになった'); }, 1850);
  }
  // 出し物のびっくり箱のねじを巻く（F）。巻いた数は、ふたをたたくまで箱が覚えている
  windBox(o) {
    o.turns = Math.min(9, o.turns + 1); o.spin = 1;
    Sfx.tone(520 + o.turns * 50, 0.05, 'square', 0.04); Sfx.tone(400 + o.turns * 50, 0.05, 'square', 0.04, 0, 0.09);
    this.toast(`ギリギリ……ねじを巻いた（${o.turns}回）　攻撃で、ふたをたたく`);
  }
  // 出し物のびっくり箱のふたをたたく：巻いた数がちょうど（R.turns）なら開く。足りなければ「ぽすっ」。
  //   巻きすぎると「ばあっ！」と飛び出して、一行は R.back まで飛ばされる。ちょうどでなければ、ねじは元にもどる
  hitJackbox(o) {
    const R = o.R, n = o.turns;
    if (R.turns == null || n === R.turns) { this.breakRubble(o); return; }
    o.turns = 0;
    if (!n) { Sfx.tone(260, 0.1, 'sine', 0.05); this.toast('ぽこん。……ねじが巻かれていないので、何も起きない（F でねじを巻く）'); return; }
    if (n < R.turns) {
      Sfx.puff(); GFX.tween(0.5, t => { o.lid.rotation.x = -Math.sin(t * Math.PI) * 0.3; });
      this.toast('ぽすっ……ふたが少しだけ浮いて、また閉じた。ばねの力が足りないみたいだ（ねじがもどった）');
      return;
    }
    // 巻きすぎ：ピエロの顔が勢いよく飛び出して、しばらくしてから、しゅるしゅると箱にもどる
    Sfx.pop(); Sfx.laugh(); GFX.shake(0.45); GFX.flash('#ffe8f0', 0.3, 0.4);
    this.p.burst(o.pos.clone().add(V3(0, 3, 0)), '#ff6a8a', 50, { speed: 7, up: 3, life: 1, size: 0.12 });
    o.jack.visible = true; o.jack.scale.set(1, 0.05, 1);
    GFX.tween(0.2, t => { o.lid.rotation.x = -t * 2.2; }, Ease.out);
    GFX.tween(0.6, t => { const k = 1 + Math.sin(t * Math.PI * 4) * (1 - t) * 0.8; o.jack.scale.set(1, 1.3 * t * k + 0.05, 1); o.jack.rotation.z = Math.sin(t * 20) * (1 - t) * 0.4; });
    setTimeout(() => { if (o.broken) return; GFX.tween(0.5, t => { o.jack.scale.set(1, 1.3 * (1 - t) + 0.05, 1); o.lid.rotation.x = -2.2 * (1 - t); }); setTimeout(() => { if (!o.broken) o.jack.visible = false; }, 520); }, 2200);
    const lead = this.team[this.leader].key;
    this.startTalk('', [['n', 'ばあああああっ！！　巻きすぎたばねで、ピエロの顔が、ものすごい勢いで飛び出した！'], ...(JACKBOX_LINES[lead] ? [[lead, JACKBOX_LINES[lead]]] : [])]);
    if (R.back) this.talk.after = () => this.sendBack(R.back, o.pos, '……気がつくと、ずっと手前まで飛ばされていた。巻きすぎだったみたいだ（ねじがもどった）', 900);
  }
  // 玉のりの大玉を押す：向こう側へ、何かにぶつかるか、スポットライトの輪に入るまで転がる（rollBall）。位置は Save.data.flags に残す
  pushBall(b, dx, dz) {
    const o = this.ballObj, P = o.P;
    if (!o.ready()) { this.startTalk('大玉', [P.idle || 'サーカスの大玉。'], null, true); return; }
    if (o.balls.some(q => q.dest)) return;
    const [x, z] = o.pos[b.k], to = rollBall(P, o.pos, b.k, dx, dz);
    if (to[0] === x && to[1] === z) { Sfx.tone(140, 0.15, 'sine', 0.06); this.toast('……大玉は、びくともしない。向こう側に、何かあるみたいだ'); return; }
    o.pos[b.k] = to; b.dest = to;
    (Save.data.flags || (Save.data.flags = {}))[P.id] = o.pos.map(q => q.slice()); Save.save();
    Sfx.tone(90, 0.5, 'triangle', 0.08, 40); Sfx.noise(0.5, 0.1, 300);
  }
  // 大玉が止まった（ZoneKit.ballRing から）：スポットライトの輪の上なら知らせる。三つそろえば、ショーの始まり（むすっと幕が上がる）
  ballStopped(o, b) {
    const P = o.P, on = (x, z) => o.pos.some(q => Math.abs(q[0] - x) < 0.5 && Math.abs(q[1] - z) < 0.5);
    const [x, z] = o.pos[b.k], y = this.gy(x, z);
    Sfx.hit(); GFX.shake(0.08);
    if (!P.targets.some(t => Math.abs(t[0] - x) < 0.5 && Math.abs(t[1] - z) < 0.5)) return;
    const n = P.targets.filter(t => on(t[0], t[1])).length;
    this.fx.pillar(V3(x, y, z), '#fff0c8', { h: 6, r: 0.9, life: 0.7 }); Sfx.tone(880, 0.15, 'triangle', 0.06); Sfx.tone(1320, 0.25, 'triangle', 0.05, 0, 0.1);
    if (n < P.targets.length) { this.toast(`スポットライトの下に、大玉がぴたり！（${n}/${P.targets.length}）`); return; }
    // ショーの始まり：紙吹雪と、幕の大笑い
    o.open = true;
    for (const [tx, tz] of P.targets) this.p.burst(V3(tx, y + 3, tz), pick(['#ff6a8a', '#ffd27a', '#6ad8ff', '#8aff9a']), 60, { speed: 5, up: 3, life: 1.6, size: 0.1 });
    const seal = (this.sealObjs || []).find(s => s.S.id === P.seal);
    if (seal && !seal.open) this.openSeal(seal);
    Sfx.laugh();
    if (P.done) this.startTalk('', P.done.filter(([k]) => k === 'n' || this.team.some(m => m.key === k)));
  }
  // リングのベル：大玉を、はじめの場所へもどす
  resetBalls() {
    const o = this.ballObj, P = o.P;
    if (!o.ready()) { this.startTalk('リングのベル', ['小さな金のベル。……今は、鳴らしても何も起きない。'], null, true); return; }
    if (o.balls.some(q => q.dest)) return;
    o.pos = P.balls.map(q => q.slice());
    o.balls.forEach(b => { const [x, z] = o.pos[b.k]; b.g.position.x = x; b.g.position.z = z; b.col.x = x; b.col.z = z; this.p.burst(V3(x, b.g.position.y, z), '#ffd27a', 20, { speed: 2, up: 1, life: 0.6, size: 0.1 }); });
    delete (Save.data.flags || {})[P.id]; Save.save();
    Sfx.tone(1568, 0.3, 'triangle', 0.06); Sfx.tone(2093, 0.4, 'triangle', 0.05, 0, 0.12);
    this.toast('チリリン！　……大玉が、ころころと元の場所へもどった');
  }
  // 時の水晶にふれる：遺跡が「今」と「昔」で切りかわる（ZoneKit.timeShift）。仲間は、すぐそばへ呼びよせる
  touchTime(o, q) {
    if (!o.ready()) { this.startTalk('時の水晶', ['かすかに鳴っている、縦長の水晶。……ふれても、今は何も起きない。'], null, true); return; }
    // 片道の水晶（金は昔へ、青は今へ）：もうその姿なら、光は沈んだまま
    const flags = Save.data.flags || (Save.data.flags = {}), fk = q && q.k !== 'W' ? `${o.S.id}_${q.k}` : null;
    const about = q && (q.k === 'P' ? ['金の水晶は、遺跡を「昔」へもどすことしかできない、片道の水晶らしい。', '「今」へもどすには、青の水晶か、入口の間の白い水晶をさがそう。'] : ['青の水晶は、遺跡を「今」へもどすことしかできない、片道の水晶らしい。', '「昔」へもどすには、金の水晶か、入口の間の白い水晶をさがそう。']);
    if (q && !o.can(q)) { flags[fk] = true; Save.save(); this.startTalk(TIME_CRYS[q.k], [q.k === 'P' ? '金の水晶は、暗く沈んでいる。……遺跡はもう「昔」の姿なので、ふれても何も起きない。' : '青の水晶は、暗く沈んでいる。……遺跡はもう「今」の姿なので、ふれても何も起きない。', ...about], null, true); this.checkTimeTrap(o); return; }
    const past = !o.past, first = fk && !flags[fk];
    o.set(past); flags[o.S.id] = past; if (fk) flags[fk] = true; Save.save();
    const p = this.player.pos, col = past ? '#ffc86a' : '#8affe0';
    GFX.flash(past ? '#ffe8c0' : '#d8fff4', 0.5, 0.7);
    this.fx.ring(p.clone().add(V3(0, 0.1, 0)), col, { r: 9, life: 1.0, width: 0.3 });
    this.p.burst(p.clone().add(V3(0, 1.2, 0)), col, 60, { speed: 5, up: 1, life: 1.0, size: 0.1 });
    Sfx.tone(past ? 660 : 880, 0.8, 'sine', 0.06, past ? -330 : 440); Sfx.tone(past ? 990 : 1320, 0.6, 'triangle', 0.03, 0, 0.1);
    this.spawnFollowers();
    this.toast(past ? '……遺跡が、昔の姿を思い出した。瓦礫は消え、かわりに古い石の壁や門がよみがえった' : '……遺跡は、今の姿にもどった。昔の壁や門は崩れ、瓦礫が道をふさいでいる');
    // 金・青の水晶にはじめてふれたときは、片道の水晶だと説明する
    if (first) this.startTalk(TIME_CRYS[q.k], about, null, true);
    this.checkTimeTrap(o);
  }
  // 昔の猫と話す：こちらを向いて話し、話し終えると元の向きにもどる
  talkGhost(g) {
    const p = this.player.pos, grp = g.m.group;
    grp.rotation.y = Math.atan2(p.x - g.pos.x, p.z - g.pos.z);
    this.startTalk('昔の猫', g.lines, { m: g.m, key: 'ghost', face2: 'gentle' });
    this.talk.after = () => { grp.rotation.y = g.ry; };
  }
  // 閉じこめられたら（どの水晶で切りかえても、入口へ戻れない）、入口の間へもどす。遺跡は今の姿にもどる。
  //   ①「閉じこめられた！」の文字 → ② 水晶の光に包まれて暗転 → ③ 入口の間で光とともに現れる
  checkTimeTrap(o) {
    const p = this.player.pos;
    if (this.trapWait || !o.trapped || !o.trapped(p.x, p.z)) return;
    // もどす場所：ねこ地蔵（anchor）のそばの、区画の中ほど寄り（地蔵に重ならないように）
    const [ax, az] = zonePoint(this.zone, this.zone.anchor), l = Math.hypot(ax, az), dx = l > 1 ? -ax / l : 0, dz = l > 1 ? -az / l : 1;
    const bx = ax + dx * 5 + dz * 0.6, bz = az + dz * 5 - dx * 0.6;
    this.trapWait = true;
    const later = (ms, fn) => setTimeout(() => { if (GFX.view === this) fn(); }, ms);
    setTimeout(() => {
      if (this.talk) { const wait = setInterval(() => { if (!this.talk) { clearInterval(wait); go(); } }, 200); } else go();
    }, 900);
    const go = () => {
      this.trapWait = false;
      // 戦闘などで区画をはなれていたら、もどってきたときに調べなおす
      if (GFX.view !== this) return;
      this.busy = true; this.keys.clear();
      const banner = this.root.querySelector('.fd-banner');
      banner.className = 'fd-banner'; void banner.offsetWidth; banner.className = 'fd-banner show trap'; banner.textContent = '閉じこめられた！';
      later(1800, () => { banner.className = 'fd-banner'; });
      GFX.shake(0.3); Sfx.tone(220, 0.5, 'sawtooth', 0.05, -80); Sfx.tone(165, 0.7, 'sine', 0.06, -60, 0.15);
      later(1600, rewind);
    };
    // 水晶の光に包まれて、入口の間へ
    const rewind = () => {
      if (GFX.view !== this) return;
      this.busy = true; this.keys.clear();
      this.toast('時の水晶の光が、一行を包みこむ——');
      Sfx.tone(1320, 1.4, 'sine', 0.05, -1100); Sfx.tone(990, 1.2, 'triangle', 0.03, -700, 0.2);
      for (let k = 0; k < 5; k++) later(k * 260, () => {
        const c = k % 2 ? '#8affe0' : '#ffc86a', pp = p.clone().add(V3(0, 0.1 + k * 0.35, 0));
        this.fx.ring(pp, c, { r: 3.2 - k * 0.4, life: 0.7, width: 0.18 });
        this.p.burst(p.clone().add(V3(0, 0.6, 0)), c, 24, { speed: 2.5, up: 1.5, life: 0.9, size: 0.09 });
      });
      later(1100, () => GFX.flash('#fff4e0', 0.6, 0.6));
      this.sendBack([bx, bz], V3(bx + dx * 10, 0, bz + dz * 10), null, 2000, () => {
        o.set(false); (Save.data.flags || (Save.data.flags = {}))[o.S.id] = false; Save.save();
        // 入口の間：光とともに現れる
        later(250, () => {
          const q = this.player.pos;
          this.fx.ring(q.clone().add(V3(0, 0.08, 0)), '#8affe0', { r: 4, life: 0.9, width: 0.2 });
          this.fx.pillar(q.clone(), '#d8fff4', { h: 5, r: 0.9, life: 0.8 });
          this.p.burst(q.clone().add(V3(0, 1, 0)), '#ffffff', 40, { speed: 3, up: 1, life: 0.9, size: 0.1 });
          Sfx.tone(660, 0.6, 'sine', 0.05, 330); Sfx.tone(990, 0.5, 'triangle', 0.03, 0, 0.12);
          const bn = this.root.querySelector('.fd-banner');
          bn.className = 'fd-banner'; void bn.offsetWidth; bn.className = 'fd-banner show good'; bn.textContent = '入口の間にもどった';
          later(1800, () => { bn.className = 'fd-banner'; });
          this.toast('遺跡は、今の姿にもどっている。……ちがう水晶の順番を、ためしてみよう');
        });
      });
    };
  }
  // つながりの石畳（ZoneKit.strokeBoards）：踏んだ石が光る。始まりの石から、すべての石を一度ずつ踏み、最後に終わりの石を踏むと、結界が消える。
  //   光った石をまた踏む・石畳から出る・となりでない石へ跳ぶ・終わりの石を先に踏むと、光は消えてやりなおし。ひとつ前の石へもどると、一歩取り消せる
  updateStroke() {
    const pl = this.player, p = pl.pos;
    if (pl.y > 0.05) return;
    for (const o of this.strokeObjs || []) {
      if (o.solved) continue;
      const t = o.tiles.find(q => Math.abs(q.x - p.x) <= 1 && Math.abs(q.z - p.z) <= 1 && Math.abs(q.y - p.y) < 1);
      const last = o.path[o.path.length - 1];
      if (t === last) continue;
      if (!t) { if (o.path.length) this.breakStroke(o, '石畳の外へ出たので、光がとぎれてしまった……。始まりの石から、やりなおそう'); o.hinted = null; continue; }
      if (!o.path.length) {
        if (t.isS) { t.set(true); o.path.push(t); Sfx.tone(523, 0.18, 'triangle', 0.05); }
        else if (o.hinted !== t) { o.hinted = t; this.toast('石は光らない。……始まりの石（足あとの印）から歩きはじめよう'); }
        continue;
      }
      if (t === o.path[o.path.length - 2]) { last.set(false); o.path.pop(); Sfx.tone(392, 0.12, 'sine', 0.04); continue; }
      if (t.lit) { o.hinted = t; this.breakStroke(o, '光った石を、もう一度踏んでしまった……。光がとぎれた'); continue; }
      if (Math.abs(t.x - last.x) + Math.abs(t.z - last.z) > CELL + 0.1) { o.hinted = t; this.breakStroke(o, '石をとばしてしまった……。となりの石へ、一歩ずつ進もう'); continue; }
      t.set(true); o.path.push(t);
      const n = o.path.length, all = n === o.tiles.length;
      Sfx.tone(523 * Math.pow(2, (n % 12) / 12), 0.18, 'triangle', 0.05);
      if (t.isG && !all) { o.hinted = t; this.breakStroke(o, '終わりの石を、先に踏んでしまった……。終わりの石は、いちばん最後に'); continue; }
      if (all) this.solveStroke(o);
    }
  }
  breakStroke(o, msg) {
    o.path.forEach(q => q.set(true, '#ff8a8a')); const path = o.path; o.path = [];
    setTimeout(() => path.forEach(q => { if (!o.solved && !o.path.includes(q)) q.set(false); }), 450);
    Sfx.tone(220, 0.5, 'sine', 0.06, -120); this.toast(msg);
  }
  solveStroke(o) {
    const P = o.P; o.open(); (Save.data.flags || (Save.data.flags = {}))[P.id] = true; Save.save();
    o.tiles.forEach((q, i) => setTimeout(() => { q.set(true, '#ffe8a0'); this.p.burst(V3(q.x, q.y + 0.3, q.z), '#ffe8a0', 8, { speed: 2, up: 1.5, life: 0.8, size: 0.08 }); }, i * 40));
    setTimeout(() => { Sfx.win(); GFX.shake(0.15); this.toast(P.openToast || '結界が消えた！'); }, 500);
    if (P.done) this.startTalk('', P.done.filter(([k]) => k === 'n' || this.team.some(m => m.key === k)));
  }
  // 笑顔の塔の仕掛け：ブーブークッション（踏むと鳴る）とトランポリン（乗ると跳ぶ）
  updateGags(d) {
    const p = this.player.pos;
    for (const c of this.cushionObjs || []) {
      const dist = Math.hypot(c.pos.x - p.x, c.pos.z - p.z);
      if (c.armed && dist < 0.7 && Math.abs(c.pos.y - p.y) < 0.5 && this.player.y === 0) {
        c.armed = false; c.squish = 1; Sfx.boo();
        this.p.burst(c.pos.clone().add(V3(0, 0.3, 0)), '#f4e8f0', 20, { speed: 1.5, up: 0.6, life: 0.8, size: 0.14 });
        const who = this.team.map(m => m.key).filter(k => CUSHION_LINES[k]), k = pick(who.length ? who : ['mike']);
        this.toast(`ぶぅ〜〜っ！　……${speakerName(k)}「${pick(CUSHION_LINES[k])}」`);
      } else if (!c.armed && dist > 2) c.armed = true;
      c.squish = Math.max(0, c.squish - d * 2.5);
      c.pad.scale.set(1 + c.squish * 0.3, 0.22 * (1 - c.squish * 0.6), 1 + c.squish * 0.3);
    }
    for (const b of this.bounceObjs || []) {
      const dist = Math.hypot(b.pos.x - p.x, b.pos.z - p.z);
      // 踏みこんだ向き（歩いてきた向きを、前後左右のどれかにそろえる）へ跳ぶ
      if (b.armed && dist < 0.8 && Math.abs(b.pos.y - p.y) < 0.5) { const v = this.player.dir, ax = Math.abs(v.x) > Math.abs(v.z); this.launch(b, ax ? Math.sign(v.x) : 0, ax ? 0 : Math.sign(v.z) || -1); return; }
      if (!b.armed && dist > 1.6) b.armed = true;
    }
  }
  // トランポリンで跳ぶ：(dc, dr) の向きへ zone.bounceLen マス先まで、弧をえがいて（そのあいだは操作できない。仲間は着地してから追いつく）。
  //   着地するマスもトランポリンなら、そこでもう一度跳ぶ（chain）。床がなければ、奈落へ落ちて、安全ネットで zone.bounceBack へもどる（fall）
  launch(b, dc, dr, chain = 0) {
    const p = this.player, T = this.T, L = this.zone.bounceLen || 3, from = p.pos.clone();
    const j = T.idx(T.colOf(b.i) + dc * L, T.rowOf(b.i) + dr * L), next = (this.bounceObjs || []).find(q => q.i === j);
    const land = j >= 0 && (T.kind[j] === TK.FLOOR || T.kind[j] === TK.STAIR);
    const tx = b.pos.x + dc * L * CELL, tz = b.pos.z + dr * L * CELL, to = V3(tx, land ? this.gy(tx, tz) : b.pos.y - 16, tz);
    const dist = L * CELL;
    this.busy = true; this.keys.clear(); b.armed = false;
    this.flight = { from, to, t: 0, dur: 0.8 + dist * 0.035 + (land ? 0 : 0.5), h: 3 + dist * 0.12, yaw: Math.atan2(dc, dr), next, dc, dr, chain, fall: !land };
    (this.followers || []).forEach(f => { f.m.group.visible = false; });
    Sfx.boing();
    GFX.tween(0.3, t => { b.mat.position.y = 0.4 - Math.sin(t * Math.PI) * 0.25; });
    this.p.burst(from.clone().add(V3(0, 0.5, 0)), '#ffd27a', 24, { speed: 3, up: 2, life: 0.6, size: 0.1 });
    this.toast(chain ? 'ぼよよよーん！　もう一回！' : 'ぼよよーん！');
    if (!land) setTimeout(() => { if (this.flight && this.flight.fall) Sfx.tone(900, 1.2, 'sine', 0.05, -700); }, 450);
  }
  // 綿毛につかまって飛ぶ：ふわりと浮き上がり、風にゆられながら o.to へ降りる（そのあいだは操作できない）
  glide(o) {
    const p = this.player, from = p.pos.clone(), to = o.to.clone(), dist = Math.hypot(to.x - from.x, to.z - from.z);
    this.busy = true; this.keys.clear();
    const puff = o.pluck(); this.scene.add(puff);
    this.flight = { from, to, t: 0, dur: 2 + dist * 0.17, h: o.h || 3 + dist * 0.07, yaw: Math.atan2(to.x - from.x, to.z - from.z), glide: true, puff };
    (this.followers || []).forEach(f => { f.m.group.visible = false; });
    Sfx.fluff();
    this.p.burst(o.pos.clone().add(V3(0, 2.4, 0)), '#ffffff', 30, { speed: 2, up: 1, life: 1.2, size: 0.08 });
    this.toast(this.team.length > 1 ? 'ふわ〜り……みんなで綿毛につかまって、風に乗った！' : 'ふわ〜り……綿毛につかまって、風に乗った！');
  }
  updateFlight(d) {
    const p = this.player, F = this.flight;
    F.t = Math.min(1, F.t + d / F.dur);
    const t = F.t;
    let u = t, lift = 4 * F.h * t * (1 - t), side = 0;
    // 綿毛：すっと浮き上がってから、右へ左へゆられて、ゆっくり降りる
    if (F.glide) {
      const s = clamp((t - 0.15) / 0.85, 0, 1);
      u = t * t * (3 - 2 * t);
      lift = t < 0.15 ? F.h * Ease.out(t / 0.15) : F.h * (1 - s * s * (3 - 2 * s));
      side = Math.sin(t * Math.PI * 3) * Math.sin(t * Math.PI) * 0.9;
    }
    const base = lerp(F.from.y, F.to.y, u);
    p.pos.set(lerp(F.from.x, F.to.x, u) + Math.cos(F.yaw) * side, base, lerp(F.from.z, F.to.z, u) - Math.sin(F.yaw) * side);
    p.vis = base; p.y = lift; p.yaw = lerpAngle(p.yaw, F.yaw, 1 - Math.exp(-10 * d));
    p.m.group.position.set(p.pos.x, base + p.y, p.pos.z); p.m.group.rotation.y = p.yaw;
    if (F.puff) {
      F.puff.position.set(p.pos.x, base + p.y + 1.75, p.pos.z); F.puff.rotation.y += d * 0.8; F.puff.rotation.z = Math.sin(t * 9) * 0.12;
      if (Math.random() < d * 5) this.p.emit(F.puff.position.clone().add(V3((Math.random() - 0.5) * 1.2, (Math.random() - 0.5) * 0.8, (Math.random() - 0.5) * 1.2)), V3((Math.random() - 0.5) * 0.6, 0.2, (Math.random() - 0.5) * 0.6), hdr('#ffffff', 1.4), { life: 1.6, size: 0.06, drag: 0.6 });
    }
    if (t < 1) return;
    // トランポリンの上に着いたら、同じ向きにもう一度。床のないところへ跳んだら、安全ネットではね返されて舞台へ
    if (F.next) { p.pos.copy(F.to); this.flight = null; this.launch(F.next, F.dc, F.dr, F.chain + 1); return; }
    if (F.fall) {
      this.flight = null; p.y = 0; p.vy = 0; p.speed = 0;
      const back = this.zone.bounceBack || this.zone.anchor;
      this.sendBack(back, V3(back[0], 0, back[1] - 10), '……ひゅるるる……ぼよーん！　安全ネットにはね返されて、舞台にもどってきた', 600);
      return;
    }
    this.flight = null; p.y = 0; p.vy = 0; p.speed = 0;
    this.placePlayer(1);
    if (F.glide) {
      // 綿毛から手をはなすと、綿毛は空へのぼっていく
      const puff = F.puff; this.scene.remove(puff);
      this.fx.add(puff, 3, (k, o, dt) => { o.position.y += dt * (0.6 + k * 1.5); o.position.x += dt * 0.5; o.rotation.y += dt; o.scale.setScalar(1.35 * (1 - k * 0.6)); });
      this.p.burst(p.pos.clone().add(V3(0, 0.3, 0)), '#ffffff', 20, { speed: 1.5, up: 0.6, life: 0.8, size: 0.08 });
      Sfx.select();
      this.spawnFollowers();
      this.busy = false; this.grace = 1.2;
      return;
    }
    if (!F.bump) this.fx.ring(p.pos.clone().add(V3(0, 0.05, 0)), '#ffd27a', { r: 1.6, life: 0.5 });
    this.p.burst(p.pos.clone().add(V3(0, 0.2, 0)), '#e8dcc8', 20, { speed: 2, up: 0.5, life: 0.5, size: 0.1 });
    Sfx.hit(); GFX.shake(0.12); this.grace = 1;
    for (const b of this.bounceObjs || []) if (Math.hypot(b.pos.x - p.pos.x, b.pos.z - p.pos.z) < 1.6) b.armed = false;
    this.spawnFollowers();
    this.busy = false;
  }
  // ねむり花：粉をはいているあいだに入ると、一行は眠ってしまう。粉を吸った敵も、しばらく眠る
  updateNemuri(t) {
    const p = this.player;
    for (const o of this.nemuriObjs || []) {
      const S = o.state(t);
      if (S.st === 'puff' && !o.puffing) { o.puffing = true; if (o.pos.distanceTo(p.pos) < 14) Sfx.puff(); }
      else if (S.st !== 'puff') o.puffing = false;
      if (S.st !== 'puff' || S.k > 0.8) continue;
      for (const g of this.groups) if (g.alive && !(g.sleep > 0) && Math.hypot(g.pos.x - o.pos.x, g.pos.z - o.pos.z) < o.r) { g.sleep = 7; g.state = 'idle'; g.wp = null; }
      if (!this.busy && !this.flight && Math.hypot(p.pos.x - o.pos.x, p.pos.z - o.pos.z) < o.r - 0.2 && Math.abs(p.pos.y - o.pos.y) < 1.5) this.doze(o);
    }
  }
  // 眠ってしまう：その場で丸くなって、少し手前（o.back）で目をさます
  doze(o) {
    this.busy = true; this.keys.clear();
    const p = this.player, tama = this.team.some(m => m.key === 'tama') && this.team[this.leader].key !== 'tama';
    Sfx.snore();
    this.toast(tama ? 'ふわぁ……ねむり花の粉を吸って、みんな眠ってしまった……。タマ「……いいにおい……すぴー」' : 'ふわぁ……ねむり花の粉を吸って、みんな眠ってしまった……');
    GFX.tween(0.8, k => { p.doze = k; });
    let n = 0; const zz = setInterval(() => { if (n++ < 5) floatZ(this.fx, p.pos.clone().add(V3(0.3, 1.2 - (p.doze || 0) * 0.5, 0))); }, 380);
    const b = o.back || V3(this.zone.anchor[0], 0, this.zone.anchor[1] + 2);
    this.sendBack([b.x, b.z], o.pos, '……はっ！　ねむり花がしぼんでいるうちに、通り抜けよう', 2500);
    setTimeout(() => { clearInterval(zz); GFX.flash('#ffe8f4', 0.35, 0.6); }, 2500);
  }
  // 眠っている子と、ねぼけ歩きの子
  updateSleepers(d, t) {
    for (const n of this.naps) {
      n.m.update(d, t);
      if ((n.zt -= d) <= 0) { n.zt = 1.2; floatZ(this.fx, n.pos.clone().add(V3(0.3, 0.9, 0))); }
    }
    const s = this.sleeper; if (!s) return;
    const R = s.SW.route, pp = this.player.pos, end = R.length - 1;
    // 近づくと、むにゃむにゃ言いながら次の場所へ歩いていく（最後の場所に着くと、丸くなって寝る）
    if (!s.target && s.i < end && s.pos.distanceTo(pp) < (s.SW.near || 6)) {
      s.target = V3(R[s.i + 1][0], 0, R[s.i + 1][1]);
      const line = (s.SW.lines || [])[s.i]; if (line) this.toast(`${s.SW.name || speakerName(s.SW.key)}「${line}」`);
    }
    if (s.target) {
      const dx = s.target.x - s.pos.x, dz = s.target.z - s.pos.z, l = Math.hypot(dx, dz);
      s.speed += (2.3 - s.speed) * (1 - Math.exp(-4 * d));
      if (l < 0.12) { s.target = null; s.i++; if (s.i >= end && s.SW.end) this.toast(s.SW.end); }
      else { const st = Math.min(l, s.speed * d); s.pos.x += dx / l * st; s.pos.z += dz / l * st; s.yaw = lerpAngle(s.yaw, Math.atan2(dx, dz) + Math.sin(t * 2.6) * 0.4, 1 - Math.exp(-6 * d)); }
    } else s.speed += (0 - s.speed) * (1 - Math.exp(-8 * d));
    s.pos.y = this.gy(s.pos.x, s.pos.z);
    this.walkPose(s, d, false);
    // ねぼけ歩き：首をかくんと垂れて、両手を前に出して、ふらふら
    const P = s.m.pose; P.headX += 0.4; P.armLx = -1.35; P.armRx = -1.35; P.elbowL = -0.15; P.elbowR = -0.15; P.armLz = 0.1; P.armRz = -0.1;
    if (s.i >= end && !s.target) s.nap = Math.min(1, s.nap + d * 1.2);
    if (s.nap) for (const k of POSE_KEYS) P[k] = lerp(P[k], POSES.sleep[k] || 0, s.nap);
    s.m.group.position.set(s.pos.x, s.pos.y, s.pos.z); s.m.group.rotation.set(0, s.yaw, s.nap ? 0 : Math.sin(t * 1.7) * 0.1);
    s.m.update(d, t);
    if ((s.zt -= d) <= 0) { s.zt = 1.1; floatZ(this.fx, s.pos.clone().add(V3(0.25, 1.3 - s.nap * 0.4, 0))); }
  }
  startTalk(name, lines, npc, isNote) {
    this.busy = true; this.keys.clear();
    this.talk = { lines, i: 0, npc };
    const el = this.root.querySelector('.fd-talk');
    el.classList.remove('hidden'); el.classList.toggle('note', !!isNote);
    el.querySelector('.fd-talk-name').textContent = name;
    if (npc) { npc.m.setPose(POSES.talk || POSES.idle); if (npc.m.face) { npc.m.face.set(npc.face2 || (defaultFace(npc.key) === 'neutral' ? 'smile' : defaultFace(npc.key))); npc.m.face.talking = true; setTimeout(() => { if (npc.m.face) npc.m.face.talking = false; }, 900); } }
    this.showTalkLine();
    Sfx.select();
  }
  // 台詞は文字列か、[話し手, 台詞]（掛け合い。話し手ごとに名前を出す）
  showTalkLine() {
    const el = this.root.querySelector('.fd-talk'), t = this.talk, L = t.lines[t.i], text = Array.isArray(L) ? L[1] : L;
    if (Array.isArray(L)) { el.querySelector('.fd-talk-name').textContent = speakerName(L[0]); el.classList.toggle('note', L[0] === 'n'); if (L[0] !== 'n') Sfx.meow(L[0]); }
    el.querySelector('.fd-talk-text').textContent = text;
    if (t.npc && t.npc.m.face) { t.npc.m.face.talking = true; clearTimeout(this.talkT); this.talkT = setTimeout(() => { if (t.npc.m.face) t.npc.m.face.talking = false; }, 300 + text.length * 45); }
    el.querySelector('.fd-talk-next').textContent = t.i < t.lines.length - 1 ? '▼ F' : '× F';
  }
  advanceTalk() {
    const t = this.talk;
    t.i++;
    if (t.i >= t.lines.length) {
      this.root.querySelector('.fd-talk').classList.add('hidden');
      if (t.npc) { t.npc.m.setPose(POSES.idle); if (t.npc.m.face) t.npc.m.face.talking = false; }
      this.talk = null; this.busy = false;
      if (t.npc && t.npc.shop) this.shopMenu(t.npc);
      if (t.after) t.after();
      return;
    }
    Sfx.click(); this.showTalkLine();
  }

  // ============================================================
  //  敵
  // ============================================================
  updateEnemies(d, t) {
    const pp = this.player.pos;
    if (this.grace > 0) this.grace -= d;
    const sheltered = !!this.safeAt(pp.x, pp.z);
    for (const g of this.groups) {
      if (!g.alive) continue;
      const m = g.model;
      const to = V3(pp.x - g.pos.x, 0, pp.z - g.pos.z), dist = to.length();
      let speed = 0, dest = null;
      const calm = this.busy || this.grace > 0 || sheltered;
      // ねむり花の粉を吸った敵は、しばらく眠っている（近づいても気づかない）
      if (g.sleep > 0) {
        g.sleep -= d; g.state = 'idle';
        if (Math.random() < d * 1.2) floatZ(this.fx, g.pos.clone().add(V3(0.3, m.height + 0.1, 0)));
        m.group.position.set(g.pos.x, g.pos.y, g.pos.z); m.update(d * 0.3, t);
        continue;
      }
      // 地形のある区画では、同じ階で見通しがきくときだけ気づく
      const sees = r => dist < r && (!this.T || (Math.abs(pp.y - g.pos.y) < 1.8 && this.T.clearLine(g.pos.x, g.pos.z, pp.x, pp.z, g.pos.y)));
      switch (g.state) {
        case 'idle':
          g.wait -= d;
          if (g.wp && Math.hypot(g.pos.x - g.wp.x, g.pos.z - g.wp.z) > 0.3) { dest = g.wp; speed = 1.1; }
          else if (g.wait <= 0) {
            const wx = g.home.x + (Math.random() - 0.5) * 7, wz = g.home.z + (Math.random() - 0.5) * 7;
            g.wp = !this.T || this.T.fits(wx, wz, m.radius * 0.6, g.home.y, NPC_PASS) ? V3(wx, 0, wz) : null;
            g.wait = 1.5 + Math.random() * 2.5;
          }
          if (!calm && sees(8)) { g.state = 'alert'; g.t = 0.55; Sfx.turn(); }
          break;
        case 'alert':
          g.yaw = lerpAngle(g.yaw, Math.atan2(to.x, to.z), 1 - Math.exp(-10 * d));
          g.t -= d; if (g.t <= 0) g.state = 'chase';
          if (calm) g.state = 'return';
          break;
        case 'chase':
          dest = pp; speed = g.elite ? 3.6 : 4.1;
          if (calm || dist > 16 || g.pos.distanceTo(g.home) > 22 || g.stuck > 1.2) { g.state = 'return'; g.stuck = 0; }
          else if (dist < m.radius * 0.7 + 0.6 && Math.abs(pp.y - g.pos.y) < 1.5) { this.encounter(g, 'enemy'); }
          break;
        case 'return':
          dest = g.home; speed = 2.6;
          // 壁に阻まれて戻れないときは持ち場へ戻す
          if (g.pos.distanceTo(g.home) < 0.6 || g.stuck > 2.5) { g.state = 'idle'; g.wp = null; if (g.stuck > 2.5) g.pos.copy(g.home); g.stuck = 0; }
          else if (!calm && sees(6)) { g.state = 'alert'; g.t = 0.4; }
          break;
      }
      if (dest && speed) {
        const dir = V3(dest.x - g.pos.x, 0, dest.z - g.pos.z); const l = dir.length();
        if (l > 0.05) {
          dir.multiplyScalar(1 / l);
          const bx = g.pos.x, bz = g.pos.z, step = Math.min(l, speed * d);
          this.moveBody(g.pos, dir.x * step, dir.z * step, m.radius * 0.6, NPC_PASS);
          g.yaw = lerpAngle(g.yaw, Math.atan2(dir.x, dir.z), 1 - Math.exp(-8 * d));
          for (const a of this.safe) {
            const dx = g.pos.x - a.x, dz = g.pos.z - a.z, dd = Math.hypot(dx, dz), min = a.r + 1;
            if (dd < min && dd > 1e-4) { g.pos.x = a.x + dx / dd * min; g.pos.z = a.z + dz / dd * min; }
          }
          if (this.T && g.state !== 'idle') g.stuck = Math.hypot(g.pos.x - bx, g.pos.z - bz) < step * 0.3 ? (g.stuck || 0) + d : 0;
          else if (this.T && Math.hypot(g.pos.x - bx, g.pos.z - bz) < step * 0.3) g.wp = null;
        }
      }
      g.pos.y = this.gy(g.pos.x, g.pos.z);
      m.group.position.set(g.pos.x, g.pos.y, g.pos.z);
      m.group.rotation.y = g.yaw;
      m.update(d, t);
      if (m.emit) m.emit(this.p, m.group.position);
      if (g.state === 'chase' && Math.random() < d * 15) this.p.emit(g.pos.clone().add(V3(0, m.height * 0.9, 0)), V3(0, 1.2, 0), hdr('#ff3040', 2.5), { life: 0.4, size: 0.1 });
    }
  }

  // 住人：walk を持つ住人は家の近くをぶらぶら歩き、話しかけられそうになると立ち止まる
  updateNpcs(d, t) {
    const pp = this.player.pos;
    for (const n of this.npcs) {
      const near = n.pos.distanceTo(pp) < 3.2;
      let target = 0;
      if (n.walk && !near && !(this.talk && this.talk.npc === n)) {
        if (n.wp && n.pos.distanceTo(n.wp) > 0.4) target = 1.3;
        else if ((n.wait -= d) <= 0) {
          n.wait = 2 + Math.random() * 4; n.wp = null;
          for (let i = 0; i < 8 && !n.wp; i++) {
            const a = Math.random() * Math.PI * 2, r = Math.random() * n.walk, x = n.home.x + Math.cos(a) * r, z = n.home.z + Math.sin(a) * r;
            if (!this.blocked(x, z, 0.8) && Math.abs(this.gy(x, z) - n.home.y) < 0.3) n.wp = V3(x, n.home.y, z);
          }
        }
      }
      n.speed += (target - n.speed) * (1 - Math.exp(-6 * d));
      if (target && n.wp) {
        const dir = V3(n.wp.x - n.pos.x, 0, n.wp.z - n.pos.z).normalize();
        const before = n.pos.clone();
        this.moveBody(n.pos, dir.x * n.speed * d, dir.z * n.speed * d, 0.4, NPC_PASS);
        n.pos.y = this.gy(n.pos.x, n.pos.z);
        // 引っかかったら行き先を選び直す
        if (n.pos.distanceTo(before) < n.speed * d * 0.3) { n.wp = null; n.wait = 0.5; }
        n.yaw = lerpAngle(n.yaw, Math.atan2(dir.x, dir.z), 1 - Math.exp(-8 * d));
      } else if (n.pos.distanceTo(pp) < 6 && n.pose !== 'sleep' && !n.play) {
        n.yaw = lerpAngle(n.yaw, Math.atan2(pp.x - n.pos.x, pp.z - n.pos.z), 1 - Math.exp(-5 * d));
      }
      if (n.walk && !(this.talk && this.talk.npc === n)) this.walkPose(n, d, false);
      n.m.group.position.set(n.pos.x, n.pos.y + (n.play ? Math.abs(Math.sin(t * 5)) * 0.12 : 0), n.pos.z);
      if (n.toy) { n.toy.rotation.z = Math.sin(t * 7) * 0.5; n.toy.rotation.x = Math.PI + Math.cos(t * 5) * 0.2; }
      n.m.group.rotation.y = n.yaw;
      n.m.update(d, t);
    }
  }

  // ============================================================
  //  戦闘への移行
  // ============================================================
  async encounter(g, ambush) {
    if (this.busy || !g.alive) return;
    this.busy = true; this.keys.clear();
    g.state = 'idle';
    const banner = this.root.querySelector('.fd-banner');
    banner.className = 'fd-banner show ' + (ambush === 'player' ? 'good' : 'bad');
    banner.textContent = ambush === 'player' ? '先制攻撃！' : '奇襲された！';
    GFX.flash(ambush === 'player' ? '#ffffff' : '#ff3040', 0.55, 0.5);
    this.root.querySelector('.fd-wipe').classList.add('on');
    ambush === 'player' ? Sfx.crit() : Sfx.enemy();
    await new Promise(r => setTimeout(r, 850));
    Game.activeField = null;
    const techs = [...this.techs].filter(k => this.team.some(m => m.key === k && m.hpRatio > 0));
    this.techs.clear();
    const b = new Battle({
      team: this.team.map(m => ({ ...m, energy: m.energy == null ? undefined : m.energy })),
      techs, ambush, bg: this.bg, canRetry: false, waves: g.waves, loc: zoneArena(this.zoneId, g.pos),
      title: `${this.zone.name}`,
      onResult: res => this.battleResult(g, res),
      onExit: res => this.backFromBattle(g, res),
    });
    b.start();
  }

  battleResult(g, res) {
    res.team.forEach((t, i) => { this.team[i].hpRatio = t.hpRatio; this.team[i].energy = t.energy; });
    if (!res.win) return '<div class="dim">時空アンカーまで撤退する…</div>';
    const d = Save.data, exp = Math.round((60 + g.lv * 28) * g.waves.length);
    let html = '';
    const nib = 10 + g.lv * 2 + (g.elite ? 40 : 0); d.niboshi += nib;
    html += `<div class="rw"><i class="ic-jade"></i>にぼし +${nib}${g.elite ? '（つよい敵）' : ''}</div>`;
    html += '<div class="rw-team">' + this.team.map(m => {
      const up = grantExp(m.key, exp);
      m.lv = d.owned[m.key].lv;
      return `<div class="rw-mem">${avatarSVG(m.key)}<span>Lv.${m.lv}${up ? `<b> ▲${up}</b>` : ''}</span></div>`;
    }).join('') + '</div>';
    Save.save();
    return html;
  }

  backFromBattle(g, res) {
    if (res.win) {
      g.alive = false; this.s.set(this.s.defeated, this.zoneId).add(g.id);
      this.scene.remove(g.model.group); disposeTree(g.model.group);
      g.label.remove();
    } else if (res.retreat) {
      res.team.forEach((t, i) => { this.team[i].hpRatio = t.hpRatio; this.team[i].energy = t.energy; });
      const away = this.player.pos.clone().sub(g.pos).setY(0).normalize().multiplyScalar(5);
      this.moveBody(this.player.pos, away.x, away.z, 0.4);
    } else {
      this.team.forEach(m => { m.hpRatio = 1; m.energy = null; });
      const a = this.zone.anchor, sp = this.T ? this.T.nearestStandable(a[0], a[1] + 2, 0.5) : { x: a[0], z: a[1] + 2 };
      this.player.pos.set(sp.x, 0, sp.z);
      setTimeout(() => this.toast('やられちゃった……ねこ地蔵のところで目を覚ました'), 400);
    }
    if (this.team[this.leader].hpRatio <= 0) {
      const i = this.team.findIndex(m => m.hpRatio > 0);
      if (i >= 0) { this.leader = i; this.spawnPlayer(this.player.pos, this.player.yaw); }
    }
    this.groups.forEach(x => { if (x.alive && x.state !== 'idle') x.state = 'return'; });
    // 戦闘中に止まった昇降機は行き先に着いたことにする
    if (this.T) this.T.lifts.forEach(L => { if (L.moving) { L.moving = false; L.y = L.to; } });
    this.placePlayer(1);
    App.mount(this.root);
    GFX.setView(this);
    Game.activeField = this;
    this.root.querySelector('.fd-wipe').classList.remove('on');
    this.root.querySelector('.fd-banner').className = 'fd-banner';
    this.busy = false; this.grace = 2.5;
    this.spawnFollowers();
    if (this.timeObj) this.checkTimeTrap(this.timeObj);
    Music.play(this.zone.bgm || (this.zone.town ? 'village' : ['cave', 'root', 'end'].includes(this.bg) ? 'dark' : 'field'));
    this.renderHud(); this.renderTeam();
    if (res.win && this.groups.every(x => !x.alive)) setTimeout(() => this.toast(`${this.zone.name}の敵をすべて倒した！`), 600);
  }

  leave(then) {
    this.rememberPos();
    this.persist = false;
    Game.activeField = null;
    then();
  }

  // ============================================================
  //  UI
  // ============================================================
  buildUI() {
    const r = document.createElement('div');
    r.className = 'screen field';
    const q = this.quest;
    r.innerHTML = `
      <div class="fd-world"></div>
      <div class="fd-zone"><small>${this.ch.name}</small><b>${this.zone.name}</b><em class="fd-safe hidden">安全なところ　敵は出ない</em></div>
      ${q ? `<div class="fd-quest"><small>ぼうけんの目的</small><div>◆ ${q.step.g}<b class="fd-qd"></b></div>${q.via ? `<em>→ ${q.via}へ進む${q.far ? `（目的地：${q.far}）` : ''}</em>` : ''}</div>` : ''}
      <div class="fd-tr">
        <div class="currency"></div>
        <button class="ctl" data-map title="ワールドマップ (M)">MAP</button>
        <button class="ctl" data-menu title="メニュー (Esc)">≡</button>
      </div>
      <canvas class="fd-map" width="200" height="200"></canvas>
      <div class="fd-team"></div>
      <div class="fd-actions">
        <div class="fd-act"><kbd>クリック / J</kbd>攻撃・先制</div>
        <div class="fd-act tech"><kbd>E</kbd>初手技 <b class="tp"></b></div>
        <div class="fd-act"><kbd>Shift</kbd>ダッシュ</div>
        <div class="fd-act"><kbd>M</kbd>ワールドマップ</div>
      </div>
      <div class="fd-prompt hidden"><kbd>F</kbd><span></span></div>
      <div class="fd-stick hidden"><i></i></div>
      <div class="fd-pad">
        <button class="pad-btn talk" data-pad="talk">調べる</button>
        <button class="pad-btn tech" data-pad="tech">初手技<b class="tp"></b></button>
        <button class="pad-btn jump" data-pad="jump">ジャンプ</button>
        <button class="pad-btn atk" data-pad="atk">攻撃</button>
      </div>
      <div class="fd-talk hidden"><div class="fd-talk-name"></div><div class="fd-talk-text"></div><div class="fd-talk-next"></div></div>
      <div class="fd-toasts"></div>
      <div class="fd-title"></div>
      <div class="fd-banner"></div>
      <div class="fd-wipe"></div>
      <div class="fd-help">WASD 移動 ／ Space ジャンプ ／ ドラッグ 視点 ／ ホイール ズーム ／ F 調べる・話す ／ 1〜4 先頭の子を交代</div>
      <div class="overlay hidden"></div>`;
    this.root = r;
    this.map = r.querySelector('.fd-map').getContext('2d');
    const world = r.querySelector('.fd-world');
    this.groups.forEach(g => { if (g.alive) world.appendChild(g.label); });
    if (this.T) this.exitsPhys.forEach(g => {
      g.label = document.createElement('div'); g.label.className = 'fd-gate' + (g.locked ? ' locked' : '');
      const to = FIELD_ZONES[g.dests[0].to].name;
      g.label.innerHTML = g.cabin ? '<b>▲▼</b>エレベーター' : g.locked ? `<b>封鎖中</b>${to}` : `<b>→</b>${to}`;
      world.appendChild(g.label);
    });
    else this.gates.forEach(g => {
      g.label = document.createElement('div'); g.label.className = 'fd-gate' + (g.locked ? ' locked' : '');
      g.label.innerHTML = g.locked ? `<b>封鎖中</b>${FIELD_ZONES[g.exit.to].name}` : `<b>→</b>${FIELD_ZONES[g.exit.to].name}`;
      world.appendChild(g.label);
    });
    this.npcs.forEach(n => { n.label = document.createElement('div'); n.label.className = 'fd-npc'; n.label.textContent = speakerName(n.key); world.appendChild(n.label); });
    if (q) { q.label = document.createElement('div'); q.label.className = 'fd-qmark'; world.appendChild(q.label); }

    // マウス：ドラッグで視点、クリックで攻撃
    // タッチ：画面の左半分はスティック（端まで倒すとダッシュ）、右半分はドラッグで視点・2本指でズーム・タップで攻撃
    const pts = new Map(), stick = r.querySelector('.fd-stick'), STICK_R = 80;
    const local = e => { const b = r.getBoundingClientRect(), k = b.width / 1280; return { x: (e.clientX - b.left) / k, y: (e.clientY - b.top) / k }; };
    const pinchDist = () => { const c = [...pts.values()].filter(q => !q.stick); return c.length === 2 ? Math.hypot(c[0].x - c[1].x, c[0].y - c[1].y) : 0; };
    r.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button, .fd-team, .overlay, .fd-map, .fd-talk, .fd-prompt')) return;
      const q = { x: e.clientX, y: e.clientY, moved: 0 };
      if (e.pointerType === 'touch') {
        const at = local(e);
        if (at.x < 640 && ![...pts.values()].some(o => o.stick)) {
          q.stick = at; this.stick = { x: 0, y: 0 };
          stick.style.transform = `translate(${at.x}px, ${at.y}px)`; stick.firstChild.style.transform = ''; stick.classList.remove('hidden');
        }
      }
      pts.set(e.pointerId, q); this.pinch = pinchDist();
      r.setPointerCapture(e.pointerId);
    });
    r.addEventListener('pointermove', e => {
      const q = pts.get(e.pointerId); if (!q) return;
      const dx = e.clientX - q.x, dy = e.clientY - q.y;
      q.moved += Math.abs(dx) + Math.abs(dy); q.x = e.clientX; q.y = e.clientY;
      if (q.stick) {
        const at = local(e); let sx = (at.x - q.stick.x) / STICK_R, sy = (at.y - q.stick.y) / STICK_R;
        const m = Math.hypot(sx, sy); if (m > 1) { sx /= m; sy /= m; }
        this.stick = m < 0.2 ? { x: 0, y: 0 } : { x: sx, y: sy };
        stick.firstChild.style.transform = `translate(${sx * STICK_R}px, ${sy * STICK_R}px)`;
        return;
      }
      const pd = pinchDist();
      if (pd) {
        if (this.pinch) this.camDist = clamp(this.camDist * this.pinch / pd, 2.4, 9);
        this.pinch = pd; q.moved += 99; return;
      }
      const k = e.pointerType === 'touch' ? 1.6 : 1;
      this.camYaw -= dx * 0.006 * k; this.camPitch = clamp(this.camPitch + dy * 0.004 * k, -0.05, 1.1);
    });
    const up = e => {
      const q = pts.get(e.pointerId); if (!q) return;
      pts.delete(e.pointerId); this.pinch = pinchDist();
      if (q.stick) { this.stick = null; stick.classList.add('hidden'); }
      else if (e.type === 'pointerup' && q.moved < 6 && !pts.size) this.attack();
    };
    r.addEventListener('pointerup', up);
    r.addEventListener('pointercancel', up);
    r.querySelectorAll('[data-pad]').forEach(b => b.addEventListener('pointerdown', e => {
      e.preventDefault(); e.stopPropagation();
      const a = b.dataset.pad;
      if (a === 'talk') this.interact();
      else if (a === 'atk') this.attack();
      else if (this.busy) return;
      else if (a === 'jump') this.jump();
      else if (a === 'tech') this.useTechnique();
    }));
    r.querySelector('.fd-prompt').onclick = () => this.interact();
    r.addEventListener('wheel', e => { this.camDist = clamp(this.camDist + e.deltaY * 0.004, 2.4, 9); e.preventDefault(); }, { passive: false });
    r.querySelector('[data-menu]').onclick = () => this.menu();
    r.querySelector('[data-map]').onclick = () => this.mapMenu();
    r.querySelector('.fd-map').onclick = () => this.zoneMapMenu();
    r.querySelector('.fd-talk').onclick = () => this.talk && this.advanceTalk();
    this.renderHud(); this.renderTeam();
  }

  renderHud() {
    const d = Save.data;
    this.root.querySelector('.currency').innerHTML =
      `<span class="c-item" title="にぼし"><i class="ic-jade"></i>${fmt(d.niboshi)}</span><span class="c-item" title="初手技ポイント"><i class="ic-tp"></i>${d.tp}/5</span>`;
    this.root.querySelectorAll('.fd-act.tech .tp, .pad-btn.tech .tp').forEach(x => { x.textContent = `${d.tp}/5`; });
  }
  renderTeam() {
    const el = this.root.querySelector('.fd-team');
    el.innerHTML = this.team.map((m, i) => `
      <div class="fd-mem ${i === this.leader ? 'on' : ''} ${m.hpRatio <= 0 ? 'dead' : ''}" data-i="${i}" style="--c:${ELEMENTS[CHARS[m.key].elem].color}">
        <div class="fd-face">${avatarSVG(m.key)}</div>
        <span class="fd-key">${i + 1}</span>
        ${this.techs.has(m.key) ? '<span class="fd-tech">初手技</span>' : ''}
        <div class="bar hp"><i style="width:${m.hpRatio * 100}%"></i></div>
      </div>`).join('');
    el.querySelectorAll('.fd-mem').forEach(x => x.onclick = () => this.switchLeader(+x.dataset.i));
  }
  toast(text) {
    const box = this.root.querySelector('.fd-toasts');
    const t = document.createElement('div'); t.className = 'fd-toast'; t.textContent = text;
    box.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }
  closeOverlay() { this.root.querySelector('.overlay').classList.add('hidden'); this.busy = false; this.overlayOpen = false; this.zoneMap = null; }
  menu() {
    const o = this.root.querySelector('.overlay');
    if (this.overlayOpen) { this.closeOverlay(); return; }
    if (this.busy) return;
    this.busy = true; this.overlayOpen = true; this.keys.clear();
    const left = this.groups.filter(g => g.alive).length, chests = this.chests.filter(c => !c.opened).length;
    o.innerHTML = `<div class="ov-box"><h2>メニュー</h2>
      <div class="dim">${this.zone.name}：${this.town ? '安全なところ' : `残りの敵 ${left}`} ／ まだ開けていない宝箱 ${chests}</div>
      <button class="btn gold" data-m="resume">冒険を続ける</button>
      <button class="btn" data-m="map">ワールドマップ</button>
      <button class="btn" data-m="recap">あらすじ</button>
      <button class="btn" data-m="hub">おうちに帰る</button></div>`;
    o.classList.remove('hidden');
    o.querySelector('[data-m=resume]').onclick = () => this.closeOverlay();
    o.querySelector('[data-m=map]').onclick = () => { this.closeOverlay(); this.mapMenu(); };
    o.querySelector('[data-m=recap]').onclick = () => renderRecap(o, () => this.closeOverlay(),
      id => this.leave(() => App.go(DialogueScreen, id, () => App.go(FieldScreen))));
    o.querySelector('[data-m=hub]').onclick = () => this.leave(() => App.go(HubScreen));
  }
  // ワールドマップ：訪れた場所のねこ地蔵へひとっとび
  mapMenu() {
    const o = this.root.querySelector('.overlay');
    if (this.overlayOpen) { this.closeOverlay(); return; }
    if (this.busy) return;
    this.busy = true; this.overlayOpen = true; this.keys.clear();
    o.innerHTML = worldMapHTML(this.zoneId) + '<div class="wm-foot"><span class="dim">行ったことのある場所の「ねこ地蔵」へ、ひとっとびできる</span><button class="btn gold" data-close>閉じる</button></div></div>';
    o.classList.remove('hidden');
    o.querySelector('[data-close]').onclick = () => this.closeOverlay();
    o.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { this.closeOverlay(); this.gotoZone(b.dataset.z, { anchor: true }); });
  }
  // 区画の全体図（ミニマップをクリックで開く）
  zoneMapMenu() {
    const o = this.root.querySelector('.overlay');
    if (this.overlayOpen) { this.closeOverlay(); return; }
    if (this.busy) return;
    this.busy = true; this.overlayOpen = true; this.keys.clear();
    o.innerHTML = `<div class="ov-box zm-box"><h2>${this.zone.name}</h2><canvas class="zm-map" width="1000" height="520"></canvas>
      <div class="wm-foot"><span class="dim">地図をクリックしても閉じられる</span><button class="btn gold" data-close>閉じる</button></div></div>`;
    o.classList.remove('hidden');
    this.zoneMap = o.querySelector('.zm-map').getContext('2d');
    this.drawZoneMap();
    o.querySelector('.zm-map').onclick = o.querySelector('[data-close]').onclick = () => this.closeOverlay();
  }
  onKey(e, isDown) {
    const k = e.key.toLowerCase();
    if (isDown && k === 'escape') { this.talk ? this.advanceTalk() : this.menu(); return; }
    if (isDown && k === 'm' && !this.talk) { this.mapMenu(); return; }
    if (isDown && (k === 'f' || k === ' ' || k === 'enter') && this.talk) { e.preventDefault(); this.advanceTalk(); return; }
    if (this.busy) return;
    if (['w', 'a', 's', 'd', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
      if (isDown) this.keys.add(k); else this.keys.delete(k);
      if (k.startsWith('arrow')) e.preventDefault();
      return;
    }
    if (!isDown || e.repeat) return;
    if (k === ' ') { e.preventDefault(); this.jump(); }
    else if (k === 'j') this.attack();
    else if (k === 'e') this.useTechnique();
    else if (k === 'f') this.interact();
    else if ('1234'.includes(k) && k.length === 1) this.switchLeader(+k - 1);
  }

  // 地形のある区画の見取り図（一度だけ描く。1m = k px）
  renderTerrainMap(k) {
    const T = this.T, cv = document.createElement('canvas'), s = CELL * k;
    cv.width = T.cols * s; cv.height = T.rows * s;
    const g = cv.getContext('2d'), K = TK;
    const mix = (a, b, t) => '#' + new THREE.Color(a).lerp(new THREE.Color(b), t).getHexString();
    // 野外は草地の緑・土の道・水の青・木立の濃い緑、屋内は高さで青の濃さを変える
    const out = !!T.outdoor, town = T.outdoor === 'lots', lo = town ? '#6a6258' : out ? '#3a6a34' : '#243054', hi = town ? '#e0d6c4' : out ? '#a8d878' : '#6a8fd6';
    for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) {
      const i = T.idx(c, r), kd = T.kind[i], x = c * s, y = r * s;
      if (T.water[i]) { g.fillStyle = '#3a8ad0'; g.fillRect(x, y, s + 0.5, s + 0.5); continue; }
      if (kd < K.FLOOR) { if (out && kd === K.SOLID) { g.fillStyle = T.outdoor === 'flora' ? '#16301c' : town ? '#8a4a3e' : '#3a3530'; g.fillRect(x, y, s + 0.5, s + 0.5); } continue; }
      const st = T.stairs.get(i), h = st ? (st.h0 + st.h1) / 2 : T.h[i];
      g.fillStyle = mix(lo, hi, clamp(h / 7, 0, 1)); g.fillRect(x, y, s + 0.5, s + 0.5);
      if (T.paint[i]) { g.fillStyle = mix('#a8845a', '#e8c890', clamp(h / 7, 0, 1)); g.fillRect(x, y, s + 0.5, s + 0.5); }
      if (T.bridge[i]) { g.fillStyle = '#c8965a'; g.fillRect(x, y + s * 0.15, s + 0.5, s * 0.7); }
      if (kd === K.STAIR) { g.strokeStyle = 'rgba(220,235,255,.45)'; g.lineWidth = 1; for (let q = 1; q < 4; q++) { g.beginPath(); if (st.axis === 'z') { g.moveTo(x, y + q * s / 4); g.lineTo(x + s, y + q * s / 4); } else { g.moveTo(x + q * s / 4, y); g.lineTo(x + q * s / 4, y + s); } g.stroke(); } }
      if (kd === K.LIFT) { g.fillStyle = '#2f9fd8'; g.fillRect(x + 1, y + 1, s - 2, s - 2); }
      if (kd === K.DOOR) { g.fillStyle = '#8ae0ff'; g.fillRect(x + s * 0.3, y + s * 0.3, s * 0.4, s * 0.4); }
      if (kd === K.EXIT) { const E = T.exits[T.ch[i]]; g.fillStyle = E.cabin ? '#e8c77a' : T.locked.has(E.key) ? '#ff4d6d' : '#8ae0ff'; g.globalAlpha = 0.8; g.fillRect(x, y, s, s); g.globalAlpha = 1; }
    }
    // 壁・窓・段差の輪郭
    for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) {
      const i = T.idx(c, r); if (T.kind[i] < K.FLOOR) continue;
      DIR4.forEach(([dc, dr]) => {
        const j = T.idx(c + dc, r + dr), nk = j < 0 ? K.SOLID : T.kind[j];
        const x0 = (c + (dc > 0 ? 1 : 0)) * s, y0 = (r + (dr > 0 ? 1 : 0)) * s, x1 = dc ? x0 : x0 + s, y1 = dr ? y0 : y0 + s;
        if (nk < K.FLOOR) { if (j >= 0 && T.water[j]) return; g.strokeStyle = nk === K.WINDOW ? '#8ae0ff' : nk === K.VOID ? 'rgba(255,120,150,.7)' : out ? 'rgba(20,40,20,.9)' : 'rgba(215,228,255,.85)'; g.lineWidth = nk === K.WINDOW ? 3 : 2; }
        else if (T.kind[i] !== K.STAIR && nk !== K.STAIR && T.kind[i] !== K.LIFT && nk !== K.LIFT && Math.abs(T.h[i] - T.h[j]) > STEP) { g.strokeStyle = 'rgba(138,224,255,.55)'; g.lineWidth = 1.2; }
        else return;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      });
    }
    return cv;
  }
  drawMap() {
    if (this.zoneMap) this.drawZoneMap();
    if (this.T) { this.drawTerrainMap(); return; }
    const g = this.map, S = 200, c = S / 2, sc = 86 / Math.max(this.hw, this.hd);
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(c, c, 96, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(8,12,30,.8)'; g.fillRect(0, 0, S, S);
    this.drawFlatMap(g, c, c, sc);
    g.restore();
    g.strokeStyle = 'rgba(232,199,122,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, 96, 0, Math.PI * 2); g.stroke();
  }
  // 地形のない区画の地図（区画の中心を (cx, cy) に、1m = sc px）
  drawFlatMap(g, cx, cy, sc) {
    const P = (x, z) => [cx + x * sc, cy + z * sc];
    g.fillStyle = 'rgba(160,180,255,.1)'; g.fillRect(cx - this.hw * sc, cy - this.hd * sc, this.hw * 2 * sc, this.hd * 2 * sc);
    if (this.town) { g.fillStyle = 'rgba(109,255,158,.1)'; g.fillRect(cx - this.hw * sc, cy - this.hd * sc, this.hw * 2 * sc, this.hd * 2 * sc); }
    g.strokeStyle = 'rgba(232,199,122,.45)'; g.lineWidth = 1.5; g.strokeRect(cx - this.hw * sc, cy - this.hd * sc, this.hw * 2 * sc, this.hd * 2 * sc);
    for (const a of this.safe) {
      const [x, y] = P(a.x, a.z);
      g.fillStyle = 'rgba(109,255,158,.12)'; g.strokeStyle = 'rgba(109,255,158,.45)'; g.lineWidth = 1; g.setLineDash([3, 3]);
      g.beginPath(); g.arc(x, y, a.r * sc, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
    }
    g.fillStyle = 'rgba(200,210,255,.22)';
    for (const o of this.colliders) {
      const [x, y] = P(o.x, o.z);
      if (o.box) g.fillRect(x - o.hw * sc, y - o.hd * sc, o.hw * 2 * sc, o.hd * 2 * sc);
      else { g.beginPath(); g.arc(x, y, Math.max(1.2, o.r * sc), 0, Math.PI * 2); g.fill(); }
    }
    const dot = (x, z, col, r, sq) => { const [px, py] = P(x, z); g.fillStyle = col; if (sq) g.fillRect(px - r, py - r, r * 2, r * 2); else { g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); } };
    for (const gt of this.gates) { const [x, y] = P(gt.x, gt.z); g.fillStyle = gt.locked ? '#ff4d6d' : '#8ae0ff'; g.save(); g.translate(x, y); g.rotate(Math.atan2(-gt.nx, gt.nz)); g.beginPath(); g.moveTo(0, 5); g.lineTo(5, -3); g.lineTo(-5, -3); g.fill(); g.restore(); }
    if (!this.zone.noAnchor) dot(this.zone.anchor[0], this.zone.anchor[1], '#6fd6ff', 4, true);
    if (this.zone.portal) dot(this.zone.portal[0], this.zone.portal[1], '#e8c77a', 5);
    this.npcs.forEach(n => dot(n.pos.x, n.pos.z, '#6dff9e', 3));
    this.notes.forEach(n => dot(n.pos.x, n.pos.z, '#ffffff', 2.5, true));
    this.chests.forEach(ch => { if (!ch.opened) dot(ch.pos.x, ch.pos.z, '#ffd66b', 3, true); });
    this.crystals.forEach(cr => { if (!cr.broken) dot(cr.pos.x, cr.pos.z, '#9d8cff', 2.5); });
    this.groups.forEach(gr => { if (gr.alive) dot(gr.pos.x, gr.pos.z, gr.state === 'chase' ? '#ff3040' : gr.elite ? '#ff9a4d' : '#ff6b81', gr.elite ? 4 : 3); });
    if (this.quest) {
      const [qx, qy] = P(this.quest.pos.x, this.quest.pos.z), pul = 6 + Math.sin(performance.now() / 200) * 2;
      g.strokeStyle = '#ffd66b'; g.lineWidth = 2; g.beginPath(); g.arc(qx, qy, pul, 0, Math.PI * 2); g.stroke();
      g.fillStyle = '#ffd66b'; g.save(); g.translate(qx, qy); g.rotate(Math.PI / 4); g.fillRect(-3.5, -3.5, 7, 7); g.restore();
    }
    this.drawPlayerMark(g, ...P(this.player.pos.x, this.player.pos.z));
  }
  // 主人公の印（白い矢印）とカメラの向き（水色の扇形を加算合成で光らせ、ゆっくり明るさを揺らす）
  drawPlayerMark(g, px, py) {
    const va = -this.camYaw - Math.PI / 2;
    const cone = g.createRadialGradient(px, py, 0, px, py, 34);
    cone.addColorStop(0, `rgba(120,215,255,${0.55 + Math.sin(performance.now() / 600) * 0.1})`); cone.addColorStop(1, 'rgba(120,215,255,0)');
    g.globalCompositeOperation = 'lighter';
    g.fillStyle = cone; g.beginPath(); g.moveTo(px, py); g.arc(px, py, 34, va - 0.5, va + 0.5); g.fill();
    g.globalCompositeOperation = 'source-over';
    g.save(); g.translate(px, py); g.rotate(-this.player.yaw + Math.PI);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(0, 2.5); g.lineTo(-4.5, 5); g.fill();
    g.restore();
  }

  // プレイヤーを中心にしたミニマップ（北が上）
  drawTerrainMap() {
    const g = this.map, S = 200, c = S / 2, sc = 3.2, T = this.T, pp = this.player.pos;
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(c, c, 96, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(6,9,22,.85)'; g.fillRect(0, 0, S, S);
    this.drawTerrainLayer(g, (x, z) => [c + (x - pp.x) * sc, c + (z - pp.z) * sc], sc, c);
    g.restore();
    g.strokeStyle = 'rgba(232,199,122,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, 96, 0, Math.PI * 2); g.stroke();
    // 今いる階
    const fl = T.floorLabel(pp.y);
    if (fl) {
      const w = Math.max(36, fl.length * 11 + 12);
      g.fillStyle = 'rgba(6,9,22,.9)'; g.fillRect(c - w / 2, 172, w, 20); g.strokeStyle = 'rgba(232,199,122,.8)'; g.lineWidth = 1; g.strokeRect(c - w / 2, 172, w, 20);
      g.fillStyle = '#ffe6a8'; g.font = '800 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(fl, c, 182);
    }
  }
  // 地形のある区画の地図。P = 位置 → 地図上の座標、sc = 1m の px。
  // c を渡すとミニマップ：中心 (c, c) から遠い印は描かず、範囲外の目的地は縁に矢印を出す
  drawTerrainLayer(g, P, sc, c) {
    const T = this.T, pp = this.player.pos;
    if (!this.mapImg) this.mapImg = this.renderTerrainMap(4);
    const [ox, oy] = P(-T.hw, -T.hd);
    g.drawImage(this.mapImg, ox, oy, T.hw * 2 * sc, T.hd * 2 * sc);
    for (const a of this.safe) {
      const [x, y] = P(a.x, a.z);
      g.fillStyle = 'rgba(109,255,158,.1)'; g.strokeStyle = 'rgba(109,255,158,.45)'; g.lineWidth = 1; g.setLineDash([3, 3]);
      g.beginPath(); g.arc(x, y, a.r * sc, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
    }
    // 別の階にあるものは薄く
    const dot = (x, y3, z, col, r, sq) => {
      const [px, py] = P(x, z); if (c && Math.hypot(px - c, py - c) > 100) return;
      g.globalAlpha = Math.abs(y3 - pp.y) > 2 ? 0.4 : 1; g.fillStyle = col;
      if (sq) g.fillRect(px - r, py - r, r * 2, r * 2); else { g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
    };
    const Z = this.zone;
    if (!Z.noAnchor) dot(Z.anchor[0], this.gy(Z.anchor[0], Z.anchor[1]), Z.anchor[1], '#6fd6ff', 4, true);
    if (Z.portal) dot(Z.portal[0], this.gy(Z.portal[0], Z.portal[1]), Z.portal[1], '#e8c77a', 5);
    this.npcs.forEach(n => dot(n.pos.x, n.pos.y, n.pos.z, '#6dff9e', 3));
    this.notes.forEach(n => dot(n.pos.x, n.pos.y, n.pos.z, '#ffffff', 2.5, true));
    this.chests.forEach(ch => { if (!ch.opened) dot(ch.pos.x, ch.pos.y, ch.pos.z, '#ffd66b', 3, true); });
    this.crystals.forEach(cr => { if (!cr.broken) dot(cr.pos.x, cr.pos.y, cr.pos.z, '#9d8cff', 2.5); });
    this.groups.forEach(gr => { if (gr.alive) dot(gr.pos.x, gr.pos.y, gr.pos.z, gr.state === 'chase' ? '#ff3040' : gr.elite ? '#ff9a4d' : '#ff6b81', gr.elite ? 4 : 3); });
    (this.sealObjs || []).forEach(o => { if (!o.open && o.ready()) o.lamps.forEach(L => { if (!L.lit) dot(L.pos.x, L.pos.y, L.pos.z, { memory: '#ffe2a8', laugh: '#ffe07a', beacon: '#ff9a3a', bar: '#e8c080' }[o.S.look] || '#cfefff', 3.5); }); });
    (this.bounceObjs || []).forEach(b => dot(b.pos.x, b.pos.y, b.pos.z, '#ff9ad8', 2.5));
    // つながりの石畳：始まりの石（青緑の四角）。時の水晶（今は青緑・昔は琥珀色）
    (this.strokeObjs || []).forEach(o => { if (!o.solved) o.tiles.forEach(q => { if (q.isS) dot(q.x, q.y, q.z, '#8affe0', 3, true); }); });
    if (this.timeObj) this.timeObj.crystals.forEach(q => dot(q.pos.x, q.pos.y, q.pos.z, this.timeObj.can(q) ? q.col : '#5a5a5a', 3.5));
    // 玉のりのリング：スポットライト（金の四角）と大玉（赤い点）
    const bo = this.ballObj;
    if (bo && !bo.open && bo.ready()) { const y = this.gy(bo.P.ring[0], bo.P.ring[1]); bo.P.targets.forEach(([x, z]) => dot(x, y, z, '#ffe07a', 3, true)); bo.balls.forEach(b => dot(b.g.position.x, y, b.g.position.z, '#ff6a8a', 3.5)); }
    (this.fluffObjs || []).forEach(o => dot(o.pos.x, o.pos.y, o.pos.z, '#ffffff', 2.5));
    (this.sealObjs || []).forEach(o => { if (o.beam && !o.open) o.beam.mirrors.forEach(m => dot(m.pos.x, m.pos.y, m.pos.z, '#9ad8ff', 2.5, true)); });
    (this.plateObjs || []).forEach(o => { if (!o.open && o.ready()) o.pads.forEach(pad => dot(pad.pos.x, pad.pos.y, pad.pos.z, '#8ad8ff', 3.5, true)); });
    (this.guards || []).forEach(g => dot(g.pos.x, g.pos.y, g.pos.z, g.asleep ? '#8a8a96' : '#ffb04a', 3.5));
    (this.rollers || []).forEach(o => dot(o.pos.x, o.pos.y, o.pos.z, '#c8b89a', 3.5));
    (this.nemuriObjs || []).forEach(o => { if (o.awake) dot(o.pos.x, o.pos.y, o.pos.z, '#ff9ad8', 2); });
    this.naps.forEach(n => dot(n.pos.x, n.pos.y, n.pos.z, '#fff0a8', 3.5));
    if (this.sleeper) dot(this.sleeper.pos.x, this.sleeper.pos.y, this.sleeper.pos.z, '#fff0a8', 3.5);
    // 昇降機の床板の位置（今いる階に止まっていれば明るく）
    T.lifts.forEach(L => { const [x, y] = P(L.x, L.z); g.strokeStyle = Math.abs(L.y - pp.y) < 0.3 ? '#bff0ff' : 'rgba(191,240,255,.35)'; g.lineWidth = 1.5; g.strokeRect(x - L.w / 2 * sc + 1, y - L.d / 2 * sc + 1, L.w * sc - 2, L.d * sc - 2); });
    // 目的地（範囲外なら縁に矢印）
    if (this.quest) {
      let [qx, qy] = P(this.quest.pos.x, this.quest.pos.z);
      const dd = c ? Math.hypot(qx - c, qy - c) : 0, pul = 6 + Math.sin(performance.now() / 200) * 2;
      if (dd > 84) {
        const a = Math.atan2(qy - c, qx - c); qx = c + Math.cos(a) * 84; qy = c + Math.sin(a) * 84;
        g.fillStyle = '#ffd66b'; g.save(); g.translate(qx, qy); g.rotate(a); g.beginPath(); g.moveTo(8, 0); g.lineTo(-4, 6); g.lineTo(-4, -6); g.fill(); g.restore();
      } else {
        g.strokeStyle = '#ffd66b'; g.lineWidth = 2; g.beginPath(); g.arc(qx, qy, pul, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ffd66b'; g.save(); g.translate(qx, qy); g.rotate(Math.PI / 4); g.fillRect(-3.5, -3.5, 7, 7); g.restore();
      }
    }
    this.drawPlayerMark(g, ...P(pp.x, pp.z));
  }
  // 区画の全体図（開いている間は毎フレーム描き直す）
  drawZoneMap() {
    const g = this.zoneMap, W = g.canvas.width, H = g.canvas.height, pad = 24;
    const hw = this.T ? this.T.hw : this.hw, hd = this.T ? this.T.hd : this.hd;
    const sc = Math.min((W - pad * 2) / (hw * 2), (H - pad * 2) / (hd * 2));
    g.clearRect(0, 0, W, H);
    g.fillStyle = 'rgba(6,9,22,.9)'; g.fillRect(0, 0, W, H);
    if (this.T) this.drawTerrainLayer(g, (x, z) => [W / 2 + x * sc, H / 2 + z * sc], sc);
    else this.drawFlatMap(g, W / 2, H / 2, sc);
  }

  // 3D 位置 → 画面座標（画面外なら null）
  toScreen(x, y, z, v) {
    v.set(x, y, z).project(this.camera);
    if (v.z >= 1 || Math.abs(v.x) > 1.05 || Math.abs(v.y) > 1.05) return null;
    return [(v.x + 1) * 640, (1 - v.y) * 360];
  }

  // ============================================================
  //  毎フレーム
  // ============================================================
  update(dt, t, rdt) {
    const d = Math.min(rdt, 0.05);
    this.env.update(d, t);
    for (const f of this.zoneTicks) f(d, t);
    for (const f of this.emitters) f(d);
    if (this.T) this.updateMapParts(d, t);
    if (this.flight) { this.updateFlight(d); this.animatePlayer(d, false); }
    else if (!this.busy) { this.updatePlayer(d); if (!this.busy) this.updateGags(d); }
    else { this.animatePlayer(d, false); if (this.riding) this.placePlayer(d); }
    this.updateNemuri(t);
    if (!this.busy && !this.flight) { this.updatePlates(); this.updateSealTimers(d); this.updateStroke(); }
    this.updateGuards(d, t); this.updateRollers(d, t);
    if (this.followers && !this.flight) this.updateFollowers(d, t);
    this.updateEnemies(d, t);
    const p = this.player;
    p.m.update(d, t);
    // 住人は近づくとこちらを向く
    this.updateNpcs(d, t);
    this.updateSleepers(d, t);
    this.updateSafe(); this.updateArea();
    this.notes.forEach((n, i) => { n.mark.material.opacity = 0.5 + Math.sin(t * 3 + i) * 0.4; });
    if (this.anchor) { this.anchor.rings.forEach((r, i) => { r.rotation.x = t * (0.8 + i * 0.5); r.rotation.y = t * (0.5 + i * 0.3); }); this.anchor.core.rotation.y = t; }
    const cam = this.camera.position;
    (this.T ? this.exitsPhys.filter(g => g.arrows) : this.gates).forEach(g => {
      g.arrows.forEach((a, i) => { a.scale.setScalar(0.8 + ((t * 1.5 + i * 0.33) % 1) * 0.4); });
      // カメラがゲートの光の面に近づいたら消す（画面全体が染まるのを防ぐ）
      g.face.material.opacity = 0.55 * clamp((Math.hypot(cam.x - g.x, cam.z - g.z) - 2.5) / 4, 0, 1);
    });
    this.crystals.forEach(c => { if (!c.broken) { c.gem.rotation.y = t * 0.8; c.gem.position.y = 1.3 + Math.sin(t * 2 + c.pos.x) * 0.06; } });
    this.chests.forEach(c => { if (!c.opened) c.glow.material.opacity = 0.6 + Math.sin(t * 3 + c.id) * 0.3; });
    // カメラ（壁・天井・障害物にめり込まないよう距離を縮める）
    const T = this.T, foot = p.vis ?? 0;
    const head = V3(p.pos.x, foot + p.y + 0.8, p.pos.z);
    const offAt = pitch => V3(Math.sin(this.camYaw) * Math.cos(pitch), Math.sin(pitch), Math.cos(this.camYaw) * Math.cos(pitch));
    const ceil = T ? T.ceilOf(T.at(p.pos.x, p.pos.z)) - 0.45 : 1e9;
    // 頭からカメラまでの実際の距離（天井で頭打ちになる分も入れる）
    const reach = (o, dd) => Math.hypot(Math.hypot(o.x, o.z) * dd, Math.min(o.y * dd, ceil - head.y));
    const base = this.viewDist(head, offAt(this.camPitch), foot, ceil, p.pos.y);
    // 細い通路などで後ろがつかえるときは、カメラを上へ持ち上げて見下ろす（寄りすぎて前が見えなくならないように）。
    // 持ち上げる角度はなめらかに変え、広い所へ出たらゆっくり元の角度へ戻す。
    // 遠くへ引いているときは、まず 3.4m までは寄せるだけにして、それでも足りない所でだけ持ち上げる（部屋の壁ぎわで真上から見下ろさないように）
    let want = 0;
    const need = Math.min(this.camDist * 0.8, 3.4);
    if (reach(offAt(this.camPitch), base) < need) {
      let best = reach(offAt(this.camPitch), base);
      for (let k = 1; k <= 4; k++) {
        const pt = Math.min(1.35, this.camPitch + 0.25 * k), o = offAt(pt), r = reach(o, this.viewDist(head, o, foot, ceil, p.pos.y));
        if (r > best + 0.3) { best = r; want = pt - this.camPitch; }
        if (r >= need * 0.94 || pt >= 1.35) break;
      }
    }
    this.camLift = lerp(this.camLift || 0, want, 1 - Math.exp(-(want > (this.camLift || 0) ? 5 : 2) * d));
    let off = offAt(this.camPitch + this.camLift), dist = this.camLift > 0.01 ? this.viewDist(head, off, foot, ceil, p.pos.y) : base;
    // 壁ぎわで後ろがつかえるときは、カメラを上にずらして見下ろす（主人公が画面から消えないように）
    for (let k = 1; k <= 3 && dist < 1.2; k++) {
      const o2 = offAt(Math.min(1.35, this.camPitch + 0.35 * k)), d2 = this.viewDist(head, o2, foot, ceil, p.pos.y);
      if (d2 > dist) { off = o2; dist = d2; }
    }
    this.curDist = this.curDist == null ? dist : dist < this.curDist ? dist : lerp(this.curDist, dist, 1 - Math.exp(-4 * d));
    const cp = head.clone().addScaledVector(off, this.curDist);
    cp.y = clamp(cp.y, foot + 0.3, ceil);
    this.camera.position.lerp(cp, 1 - Math.exp(-12 * d));
    // すばやく回したとき、追いかけ途中のカメラが壁や屋根を横切らないようにする
    if (this.viewBlocked(cam.x, cam.y, cam.z)) cam.copy(cp);
    // カメラが主人公の頭に近いときは、主人公を消して前が見えるようにする
    p.m.group.visible = this.curDist > 0.9;
    this.curLook.lerp(head, 1 - Math.exp(-14 * d));
    this.camera.lookAt(this.curLook);
    const key = this.env.key;
    key.position.set(p.pos.x + 6, foot + 12, p.pos.z + 8); key.target.position.set(p.pos.x, foot, p.pos.z);
    this.env.focus.set(p.pos.x, foot, p.pos.z);
    this.fx.update(d, this.camera);
    this.p.update(d);
    // ラベル
    const v = V3(), avg = this.team.reduce((a, m) => a + m.lv, 0) / this.team.length;
    for (const g of this.groups) {
      if (!g.alive) continue;
      const s = g.pos.distanceTo(p.pos) < 22 && this.toScreen(g.pos.x, g.pos.y + g.model.height + 0.35, g.pos.z, v);
      g.label.style.display = s ? '' : 'none';
      if (s) {
        g.label.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px)`;
        g.label.classList.toggle('alert', g.state === 'alert' || g.state === 'chase');
        g.label.classList.toggle('danger', g.lv > avg + 5);
      }
    }
    for (const g of this.T ? this.exitsPhys : this.gates) {
      // 地形のある区画では、近づくと看板が読めるのでラベルは遠くからだけ
      const dd = Math.hypot(g.x - p.pos.x, g.z - p.pos.z);
      const s = dd < 30 && (!this.T || dd > 7) && dd > 6 && this.toScreen(g.x, this.T ? g.h + g.H + 2.2 : 5.6, g.z, v);
      g.label.style.display = s ? '' : 'none';
      if (s) g.label.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px)`;
    }
    for (const n of this.npcs) {
      const s = n.pos.distanceTo(p.pos) < 12 && this.toScreen(n.pos.x, n.pos.y + 1.45 * (n.m.group.scale.y || 1), n.pos.z, v);
      n.label.style.display = s ? '' : 'none';
      if (s) n.label.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px)`;
    }
    // 任務の目的地
    if (this.quest) {
      const q = this.quest, dist = q.pos.distanceTo(p.pos);
      if (q.dia) { q.dia.rotation.y = t * 2; q.dia.position.y = 2.2 + Math.sin(t * 2.5) * 0.15; q.ring.scale.setScalar(1 + Math.sin(t * 3) * 0.05); }
      this.root.querySelector('.fd-qd').textContent = `　${Math.round(dist)}m`;
      v.set(q.pos.x, q.pos.y + 3, q.pos.z).project(this.camera);
      const onScreen = v.z < 1 && Math.abs(v.x) < 0.95 && Math.abs(v.y) < 0.95;
      let sx = (v.x + 1) * 640, sy = (1 - v.y) * 360;
      if (!onScreen) {
        let dx = v.x, dy = -v.y; if (v.z > 1) { dx = -dx; dy = -dy; }
        const k = Math.min(560 / Math.abs(dx * 640 || 1), 300 / Math.abs(dy * 360 || 1));
        sx = 640 + dx * 640 * k; sy = 360 + dy * 360 * k;
      }
      q.label.style.transform = `translate(${sx.toFixed(1)}px, ${sy.toFixed(1)}px)`;
      q.label.classList.toggle('edge', !onScreen);
      q.label.textContent = onScreen ? (q.gate ? `◆ ${q.via}へ ${Math.round(dist)}m` : `◆ ${Math.round(dist)}m`) : '◆';
      if (dist >= 2.4) this.questHold = false;
      else if (!q.gate && !this.questHold && !this.busy) this.questArrive();
    }
    const it = this.busy ? null : this.nearestInteract();
    const pr = this.root.querySelector('.fd-prompt');
    pr.classList.toggle('hidden', !it);
    this.root.querySelector('.pad-btn.talk').classList.toggle('ready', !!it || !!this.talk);
    if (it) pr.querySelector('span').textContent = it.text;
    this.drawMap();
  }

  // 安全エリアへの出入りを表示する
  updateSafe() {
    const a = this.safeAt(this.player.pos.x, this.player.pos.z), name = a ? a.name : null;
    if (name === this.safeName) return;
    const first = this.safeName === undefined;
    this.safeName = name;
    // 町や村の区画は、どこでも敵が出ないので表示しない（敵の出る区画の中の集落などでだけ出す）
    const el = this.root.querySelector('.fd-safe');
    el.classList.toggle('hidden', !name || this.town);
    if (first) return;
    if (name) this.toast(this.town ? `${name}：にゃんこたちが暮らす、安全なところ` : `安全なところ：${name}`);
    else if (!this.town) this.toast('安全なところを離れた');
  }

  dispose() {
    this.groups.forEach(g => g.label.remove());
    super.dispose();
  }

  // ---------------- お店（武器屋・道具屋・宿屋・魚屋） ----------------
  shopMenu(n) {
    const o = this.root.querySelector('.overlay');
    this.busy = true; this.overlayOpen = true; this.keys.clear();
    renderShop(o, n.shop, speakerName(n.key), () => { this.closeOverlay(); this.renderHud(); this.renderTeam(); }, this);
  }
}

// 区画の地形と小物だけを組み立てる（会話シーン・戦闘の背景）。o.flags で炉や星核の状態を指定できる。
// o.light：照明を整えるビュー（v が組み立て用の代理のとき、本来のシーンの照明に反映する）
function buildZoneSet(v, zoneId, o = {}) {
  const Z = FIELD_ZONES[zoneId];
  Object.assign(v, { zone: Z, zoneId, ci: Z.ci, ch: CHAPTERS[Z.ci], rand: seeded(hashStr(zoneId)), hw: Z.w / 2, hd: Z.d / 2,
    colliders: [], reserved: o.reserved || [], zoneTicks: [], emitters: [], safe: [], town: !!Z.town, flags: o.flags || {}, hooks: v.hooks || {} });
  v.T = Z.map ? new Terrain(Z) : null;
  if (v.T) {
    interiorLighting(o.light || v, Z);
    (Z.exits || []).forEach(e => { if (!e.lift && !zoneOpen(e.to)) v.T.locked.add(e.key); });
    v.arch = buildArchitecture(v, v.T);
    v.T.computeReach(Z.anchor[0], Z.anchor[1]);
  }
  v.kit = new ZoneKit(v); ZONE_BUILD[Z.build](v.kit); v.kit.flush();
  if (v.T) v.buildMapExits();
}

// ------------------------------------------------------------
//  画面
// ------------------------------------------------------------
// zoneId を指定すればその区画のねこ地蔵から。なければ前回の場所（なければ物語の場所か、ぽかぽか村）から
function FieldScreen(zoneId) {
  if (!GFX.ok) { alert('探索には WebGL（3D表示）が必要です。'); return HubScreen(); }
  if (GFX.view && GFX.view.persist) GFX.view.persist = false;
  const s = new FieldSession();
  const r = Save.data.fieldResume;
  const resume = !zoneId && r && FIELD_ZONES[r.zone] && zoneOpen(r.zone) ? r : null;
  const cur = typeof Story !== 'undefined' ? Story.current() : null;
  const z = zoneId || (resume ? resume.zone : cur && cur.step.zone && zoneOpen(cur.step.zone) ? cur.step.zone : 'pokapoka');
  const v = new FieldView(s, z, resume ? { pos: resume } : zoneId ? { anchor: true } : { spawn: true });
  v.key = 'field:' + z;
  GFX.setView(v);
  Game.activeField = v;
  if (v.timeObj) v.checkTimeTrap(v.timeObj);
  setTimeout(() => { v.showZoneTitle(); if (!Save.data.fieldTips) { Save.data.fieldTips = true; Save.save(); v.toast(document.body.classList.contains('touch') ? '左側をなぞって移動。敵に先に「攻撃」を当てると「先制攻撃」！ 「調べる」で話す・調べる' : 'WASDで移動。敵に先にクリックで攻撃すると「先制攻撃」！ Fで話す・調べる'); } }, 300);
  return v.root;
}

// ワールドマップ（ミャオニアの地図）の HTML。here = 現在地
function worldMapHTML(here) {
  const visited = Save.data.fieldVisited || {}, cur = typeof Story !== 'undefined' ? Story.current() : null;
  let qz = cur && cur.step.t === 'field' ? cur.step.zone : null;
  // 塔・城などの上の階（parent のある区画）は、入口の階にまとめて表示する
  const ids = Object.keys(FIELD_ZONES).filter(id => !FIELD_ZONES[id].parent && (!CHAPTERS[FIELD_ZONES[id].ci].hidden || zoneOpen(id)));
  // real = 本当にいる区画。上の階・奥の区画にいるときは、入口の区画のねこ地蔵へひとっとびできる
  const real = here;
  if (here && FIELD_ZONES[here] && FIELD_ZONES[here].parent) here = FIELD_ZONES[here].parent;
  if (qz && FIELD_ZONES[qz].parent) qz = FIELD_ZONES[qz].parent;
  const lines = [];
  // 上の階・奥の区画（parent）の出入口も、入口の区画どうしの線にまとめる
  const top = k => FIELD_ZONES[k].parent || k, drawn = new Set();
  Object.keys(FIELD_ZONES).forEach(id => FIELD_ZONES[id].exits.forEach(e => {
    const a0 = top(id), b0 = top(e.to), key = [a0, b0].sort().join('|');
    if (a0 === b0 || !ids.includes(a0) || !ids.includes(b0) || drawn.has(key)) return;
    drawn.add(key);
    const a = FIELD_ZONES[a0].map2d, b = FIELD_ZONES[b0].map2d;
    lines.push(`<line x1="${a[0]}" y1="${a[1]}" x2="${b[0]}" y2="${b[1]}" class="${zoneOpen(e.to) && zoneOpen(id) ? '' : 'locked'}"/>`);
  }));
  const floorsOf = id => Object.keys(FIELD_ZONES).filter(k => k === id || FIELD_ZONES[k].parent === id);
  const chestsLeft = id => floorsOf(id).reduce((n, k) => n + FIELD_ZONES[k].chests - ((Save.data.fieldChests || {})[k] || []).length, 0);
  return `<div class="ov-box wm-box"><h2>ミャオニアの地図</h2>
    <div class="wm-graph"><svg width="1000" height="580" viewBox="0 0 1000 580"><defs><radialGradient id="wmtree"><stop offset="0" stop-color="#8ad86a"/><stop offset="1" stop-color="#8ad86a" stop-opacity="0"/></radialGradient></defs>
      <circle cx="470" cy="522" r="70" fill="url(#wmtree)" opacity=".35"/>${lines.join('')}</svg>
    ${ids.map(id => { const Z = FIELD_ZONES[id], open = zoneOpen(id), vis = floorsOf(id).some(k => visited[k]), h = id === here;
      return `<button class="wm-node ${h ? 'here' : ''} ${open ? '' : 'locked'} ${vis ? 'vis' : ''} ${Z.town ? 'town' : ''}" data-z="${id}" style="left:${Z.map2d[0]}px;top:${Z.map2d[1]}px" ${open && vis && id !== real && !Z.noAnchor ? '' : 'disabled'}>
        ${qz === id ? '<i class="qm">◆</i>' : ''}<b>${open ? Z.mapName || Z.name : '？？？'}</b><small>${id === real ? '現在地' : !open ? 'まだ行けない' : !vis ? 'まだ行ってない' : Z.noAnchor ? 'ねこ地蔵なし' : h ? '現在地・ひとっとび' : 'ひとっとび'}${open ? `　宝箱 ${chestsLeft(id)}` : ''}</small></button>`; }).join('')}
    </div>`;
}

// 区画の戦場：battleAt があればそこ、なければ区画の arena（それもなければ、出会った場所）で戦う
function zoneArena(zoneId, pos) {
  const Z = FIELD_ZONES[zoneId];
  if (Z.battleAt) return Z.battleAt;
  const A = zoneArenas(Z);
  if (!A.length) return pos ? { zone: zoneId, at: [pos.x, pos.z], face: 0, world: true } : null;
  const best = pos ? A.reduce((b, a) => Math.hypot(a.x - pos.x, a.z - pos.z) < Math.hypot(b.x - pos.x, b.z - pos.z) ? a : b) : A[0];
  return { zone: zoneId, at: [best.x, best.z], face: best.face, world: true };
}

document.addEventListener('keydown', e => { if (Game.activeField) Game.activeField.onKey(e, true); });
document.addEventListener('keyup', e => { if (Game.activeField) Game.activeField.onKey(e, false); });
window.addEventListener('blur', () => { if (Game.activeField) Game.activeField.keys.clear(); });
