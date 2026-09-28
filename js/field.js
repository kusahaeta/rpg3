'use strict';
// ============================================================
//  フィールド探索（3D）— 章ごとに複数の区画がゲートでつながる
//  WASD 移動／ドラッグで視点／クリック・J で攻撃（先制）／E 秘技／F 調べる・話す／M 区画マップ
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
  if (!normals.size) normals.add('scout');
  return { normals: [...normals], elites: [...elites], lv: st.lv };
}
function fieldUnlocked(ci) { return stageUnlocked(CHAPTERS[ci].stages[0].id); }

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
    const zone = FIELD_ZONES[zoneId], ch = CHAPTERS[zone.ci];
    super(ch.bg, 50, { field: true, bare: true, zone });
    this.s = session; this.zoneId = zoneId; this.zone = zone; this.ci = zone.ci; this.ch = ch;
    this.persist = true; this.bloomStrength = ch.bg === 'abyss' ? 0.55 : 0.75;
    this.exposure = { abyss: 0.85, snow: 0.9 }[ch.bg] || 1.0;
    this.keys = new Set(); this.busy = false; this.grace = 1.5;
    this.camYaw = 0; this.camPitch = 0.3; this.camDist = 6.5;
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
    this.town = !!zone.town;
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
  }
  // 探索を離れた位置を記録し、同じ章に戻ったときにそこから再開する
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
    if (a.anchor) return { x: Z.anchor[0], z: Z.anchor[1] + 2, yaw: Math.PI };
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
    const npcDefs = (Z.npcs || []).filter(n => !n.after || typeof Story === 'undefined' || Story.seen(n.after));
    this.reserved = [P(Z.anchor, 3.5)];
    if (Z.spawn) this.reserved.push(P(Z.spawn, 4));
    if (Z.portal) this.reserved.push(P(Z.portal, 4));
    if (this.T) Object.values(this.T.exits).forEach(E => this.reserved.push({ x: E.inner.x + E.nx * 2, z: E.inner.z + E.nz * 2, r: 4 }));
    else Z.exits.forEach(e => { const p = exitPos(Z, e); this.reserved.push({ x: p.x + p.nx * 3, z: p.z + p.nz * 3, r: 4.5 }); });
    npcDefs.forEach(n => this.reserved.push(P(n.at, 2)));
    (Z.notes || []).forEach(n => this.reserved.push(P(n.at, 2)));
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
    // 広い区画の外周を土地に合った小物で埋める（住む人のいる区画・作り込んだ地形の区画は除く）
    if (!Z.town && !this.T) this.kit.fill(ZONE_FILL[Z.build] || ['station', 'snow', 'xian', 'void'][Z.ci]);

    // ゲート（区画の出入口）
    if (this.T) this.buildMapExits();
    else this.gates = Z.exits.map(e => {
      const p = exitPos(Z, e), locked = !zoneOpen(e.to);
      const g = this.makeGate(locked);
      g.g.position.set(p.x, 0, p.z); g.g.rotation.y = Math.atan2(p.nx, p.nz);
      this.scene.add(g.g);
      const side = V3(p.nz, 0, -p.nx);
      for (const sd of [-1, 1]) this.colliders.push({ x: p.x + side.x * sd * 2.5, z: p.z + side.z * sd * 2.5, r: 0.5 });
      return { exit: e, x: p.x, z: p.z, nx: p.nx, nz: p.nz, locked, ...g };
    });
    const put = (g, x, z) => { const y = this.gy(x, z); g.position.set(x, y, z); return y; };
    const col = (x, z, r) => this.colliders.push({ x, z, r, y: this.gy(x, z) });
    // 時空アンカー
    this.anchor = this.makeAnchor(); put(this.anchor.g, Z.anchor[0], Z.anchor[1]); this.scene.add(this.anchor.g);
    col(Z.anchor[0], Z.anchor[1], 0.7);
    // 任務ポータル（到着区画のみ）
    if (Z.portal) {
      this.portal = this.makePortal(); put(this.portal.g, Z.portal[0], Z.portal[1]); this.scene.add(this.portal.g);
      col(Z.portal[0] - 1.7, Z.portal[1], 0.4); col(Z.portal[0] + 1.7, Z.portal[1], 0.4);
    }
    // 住人
    this.npcs = npcDefs.map(n => {
      const m = buildCharacter(n.key); m.setPose(POSES.idle);
      const y = put(m.group, n.at[0], n.at[1]); m.group.rotation.y = n.face != null ? n.face : Math.atan2(-n.at[0], -n.at[1] + 6);
      this.scene.add(m.group);
      // 歩き回る住人は固定の当たり判定を持たない
      if (!n.walk) col(n.at[0], n.at[1], 0.5);
      return { ...n, m, pos: V3(n.at[0], y, n.at[1]), home: V3(n.at[0], y, n.at[1]), yaw: m.group.rotation.y, line: 0, wait: this.rand() * 3, wp: null, speed: 0, phase: 0 };
    });
    // 記録（端末・石碑）
    this.notes = (Z.notes || []).map(n => {
      const o = this.makeNote(), y = put(o.g, n.at[0], n.at[1]); o.g.rotation.y = n.face != null ? n.face : Math.atan2(-n.at[0], -n.at[1]);
      this.scene.add(o.g); col(n.at[0], n.at[1], 0.5);
      return { ...n, pos: V3(n.at[0], y, n.at[1]), ...o };
    });
    // 宝箱
    const opened = (Save.data.fieldChests || {})[this.zoneId] || [];
    this.chests = [];
    for (let i = 0; i < Z.chests; i++) {
      const p = this.freeSpot(1.5);
      const c = this.makeChest(), y = put(c.g, p.x, p.z); c.g.rotation.y = this.rand() * Math.PI * 2;
      const done = opened.includes(i);
      if (done) { c.lid.rotation.x = -1.9; c.glow.visible = false; }
      this.scene.add(c.g); col(p.x, p.z, 0.6);
      this.chests.push({ id: i, pos: V3(p.x, y, p.z), opened: done, ...c });
      this.reserved.push({ x: p.x, z: p.z, r: 2 });
    }
    // 秘技の結晶
    const broken = this.s.set(this.s.broken, this.zoneId);
    this.crystals = [];
    for (let i = 0; i < Z.crystals; i++) {
      const p = this.freeSpot(1.2);
      const c = this.makeCrystal(), y = put(c.g, p.x, p.z); this.scene.add(c.g);
      const b = broken.has(i); if (b) c.g.visible = false;
      this.crystals.push({ id: i, pos: V3(p.x, y, p.z), broken: b, ...c });
    }
    // 敵グループ（区画に対応するステージの敵）
    const pool = stagePools(Z.pool || Z.stage), dead = this.s.set(this.s.defeated, this.zoneId);
    this.groups = [];
    const spawnSafe = [...this.reserved.slice(0, 3).map(p => ({ ...p, r: p.r + 6 })), ...this.safe.map(a => ({ ...a, r: a.r + 8 }))];
    for (let i = 0; i < (Z.town ? 0 : Z.groups); i++) {
      const p = this.freeSpot(1.6, [...spawnSafe, ...this.groups.map(g => ({ x: g.home.x, z: g.home.z, r: 6 }))]);
      const elite = pool.elites.length > 0 && (this.rand() < 0.3 || (i === Z.groups - 1 && pool.elites.length > 0));
      const n = () => pool.normals[Math.floor(this.rand() * pool.normals.length)];
      const lead = elite ? pool.elites[Math.floor(this.rand() * pool.elites.length)] : n();
      const lv = pool.lv + (elite ? 2 : 0);
      const keys = elite ? [[n(), lead, n()]] : this.rand() < 0.35 ? [[lead, n()], [n(), n(), n()]] : [[n(), lead, n()]];
      if (dead.has(i)) continue;
      const model = buildEnemy(lead);
      model.group.scale.multiplyScalar(0.85); model.radius *= 0.85; model.height *= 0.85;
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
    if (!cur || cur.step.t !== 'field' || cur.step.ci !== this.ci) return;
    const step = cur.step;
    if (step.zone !== this.zoneId) {
      const path = zonePath(this.zoneId, step.zone);
      const gate = path && this.gates.find(g => g.exit.to === path[1]);
      if (gate) {
        const x = gate.x + gate.nx * 1.5, z = gate.z + gate.nz * 1.5;
        this.quest = { step, pos: V3(x, this.gy(x, z), z), gate, via: FIELD_ZONES[path[1]].name, lift: !!(gate.phys && gate.phys.cabin) };
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
    Sfx.warp(3);
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
  showZoneTitle() {
    const t = this.root.querySelector('.fd-title');
    t.innerHTML = `<small>${this.ch.name}</small><b>${this.zone.name}</b>`;
    t.classList.remove('show'); void t.offsetWidth; t.classList.add('show');
  }

  // ============================================================
  //  オブジェクト
  // ============================================================
  makeGate(locked) {
    const g = new THREE.Group(), col = locked ? '#ff4d6d' : THEMES[this.ch.bg].line;
    const pm = new THREE.MeshStandardMaterial({ color: '#2a2d48', metalness: 0.6, roughness: 0.35 });
    for (const sd of [-1, 1]) { const p = new THREE.Mesh(new THREE.BoxGeometry(0.7, 5.2, 0.7), pm); p.position.set(sd * 2.5, 2.6, 0); p.castShadow = true; g.add(p);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.1, 4.6, 0.74), glowMat(col, 2.5)); l.position.set(sd * 2.5, 2.6, 0); g.add(l); }
    const beam = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.6, 0.8), pm); beam.position.y = 5.3; beam.castShadow = true; g.add(beam);
    const face = new THREE.Mesh(new THREE.PlaneGeometry(4.3, 4.9), new THREE.MeshBasicMaterial({ map: radialTex(locked ? '#ff8098' : '#ffffff', '#000000'), color: hdr(col, locked ? 0.9 : 0.7),
      transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    face.position.y = 2.55; g.add(face);
    const arrows = [];
    if (!locked) for (let i = 0; i < 3; i++) {
      const a = new THREE.Mesh(new THREE.ConeGeometry(0.35, 0.6, 3), glowMat(col, 2.2)); a.rotation.set(-Math.PI / 2, 0, 0); a.scale.set(1, 1, 0.2);
      a.position.set(0, 0.05, 1.4 + i * 0.9); a.rotation.z = Math.PI; g.add(a); arrows.push(a);
    }
    return { g, face, arrows };
  }
  makeNote() {
    const g = new THREE.Group(), bg = this.ch.bg;
    if (bg === 'station' || bg === 'abyss') {
      const base = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.1, 0.5), new THREE.MeshStandardMaterial({ color: '#23263f', metalness: 0.6, roughness: 0.4 }));
      base.position.y = 0.55; base.castShadow = true; g.add(base);
      const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.8, 0.55), glowMat(bg === 'abyss' ? '#ff6b8a' : '#56c8ff', 1.8));
      scr.position.set(0, 1.25, 0.12); scr.rotation.x = -0.5; g.add(scr);
    } else {
      const stele = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.6, 0.25), new THREE.MeshStandardMaterial({ color: bg === 'snow' ? '#8a9ab4' : '#8a8078', roughness: 0.9 }));
      stele.position.y = 0.8; stele.castShadow = true; g.add(stele);
      const rune = new THREE.Mesh(new THREE.CircleGeometry(0.22, 6), glowMat(bg === 'snow' ? '#9fd8ff' : '#ffcf6a', 2));
      rune.position.set(0, 1.1, 0.13); g.add(rune);
    }
    const mark = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ffffff', 0.6), blending: THREE.AdditiveBlending, depthWrite: false }));
    mark.scale.setScalar(0.8); mark.position.y = 2; g.add(mark);
    return { g, mark };
  }
  makeChest() {
    const g = new THREE.Group();
    const body = toon('#2c3f7a'), gold = toon('#e8c77a', { emissive: new THREE.Color('#e8c77a'), emissiveIntensity: 0.3 });
    const base = outlined(new THREEX.RoundedBoxGeometry(0.95, 0.5, 0.62, 2, 0.06), body); base.position.y = 0.25; g.add(base);
    const band = outlined(new THREE.BoxGeometry(0.98, 0.08, 0.65), gold); band.position.y = 0.42; g.add(band);
    const lid = new THREE.Group(); lid.position.set(0, 0.5, -0.31); g.add(lid);
    const top = outlined(new THREE.CylinderGeometry(0.31, 0.31, 0.95, 16, 1, false, 0, Math.PI), body);
    top.rotation.z = Math.PI / 2; top.position.set(0, 0, 0.31); lid.add(top);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.07), glowMat('#7fd8ff', 4)); gem.position.set(0, 0.02, 0.63); lid.add(gem);
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#ffd66b', 0.8), blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.scale.setScalar(2.2); glow.position.y = 0.6; g.add(glow);
    return { g, lid, glow };
  }
  makeCrystal() {
    const g = new THREE.Group();
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.45, 0.2, 8), new THREE.MeshStandardMaterial({ color: '#23213a', metalness: 0.6, roughness: 0.4 }));
    base.position.y = 0.1; g.add(base);
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.32), new THREE.MeshStandardMaterial({ color: '#b4a9ff', emissive: '#7d6bff', emissiveIntensity: 1.6, roughness: 0.1, transparent: true, opacity: 0.9 }));
    gem.scale.y = 1.6; gem.position.y = 0.9; g.add(gem);
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#7d6bff', 0.9), blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(1.6); sp.position.y = 0.9; g.add(sp);
    return { g, gem, sp };
  }
  makeAnchor() {
    const g = new THREE.Group();
    const m = new THREE.MeshStandardMaterial({ color: '#e8e4f5', metalness: 0.5, roughness: 0.3 });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.9, 0.3, 6), m); base.position.y = 0.15; base.castShadow = true; g.add(base);
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 2.6, 8), m); pole.position.y = 1.5; pole.castShadow = true; g.add(pole);
    const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.28), glowMat('#6fd6ff', 3)); core.position.y = 2.9; g.add(core);
    const rings = [0.5, 0.75].map(r => { const t = new THREE.Mesh(new THREE.TorusGeometry(r, 0.025, 8, 48), glowMat('#6fd6ff', 2.5)); t.position.y = 2.9; g.add(t); return t; });
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(), color: hdr('#6fd6ff', 0.9), blending: THREE.AdditiveBlending, depthWrite: false }));
    sp.scale.setScalar(2.5); sp.position.y = 2.9; g.add(sp);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.5, 1.6, 64), glowMat('#6fd6ff', 2, { side: THREE.DoubleSide, transparent: true, opacity: 0.7 }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.02; g.add(ring);
    return { g, core, rings };
  }
  makePortal() {
    const g = new THREE.Group();
    const frame = new THREE.Mesh(new THREE.TorusGeometry(1.7, 0.12, 12, 64), glowMat('#e8c77a', 2.6)); frame.position.y = 1.9; g.add(frame);
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshBasicMaterial({ map: radialTex('#fff2c8', '#4a2a8a'), transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, depthWrite: false }));
    disc.position.y = 1.9; g.add(disc);
    for (const sd of [-1, 1]) {
      const p = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.4, 0.5), toon('#2a2d48')); p.position.set(sd * 1.7, 0.2, 0); g.add(p);
    }
    return { g, frame, disc };
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
      const st = ARCH_STYLES[this.zone.arch || 'station'];
      Object.assign(ph, E.cabin ? this.makeCabin(ph, st) : st.exit === 'bulkhead' ? this.makeBulkhead(ph) : this.makeGate(ph, st));
      if (!ph.apply) ph.apply = o => ph.panels.forEach(q => { q.p.position.x = q.s * o * (ph.width / 2 - 0.3); });
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
    const H = mine ? 4.2 : palace ? 5.4 : 4.6, col = ph.locked ? '#ff4d6d' : st.glow || THEMES[this.ch.bg].line;
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
    const panels = [-1, 1].map(s => {
      const p = new THREE.Group(); p.position.set(s * (W / 2 - 0.65), 0, -0.1); g.add(p);
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
  }
  switchLeader(i) {
    if (this.busy || !this.team[i] || i === this.leader) return;
    if (this.team[i].hpRatio <= 0) { this.toast(`${CHARS[this.team[i].key].name}は戦闘不能です`); return; }
    this.leader = i;
    this.spawnPlayer(this.player.pos, this.player.yaw);
    const col = ELEMENTS[CHARS[this.team[i].key].elem].color;
    this.fx.ring(this.player.pos.clone().add(V3(0, 0.05, 0)), col, { r: 1.8, life: 0.6 });
    this.p.burst(this.player.pos.clone().add(V3(0, 1, 0)), col, 40, { speed: 3, life: 0.7 });
    Sfx.select(); this.renderTeam();
  }

  updatePlayer(d) {
    const p = this.player, k = this.keys, m = p.m;
    const ix = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0);
    const iz = (k.has('s') || k.has('arrowdown') ? 1 : 0) - (k.has('w') || k.has('arrowup') ? 1 : 0);
    const fx = -Math.sin(this.camYaw), fz = -Math.cos(this.camYaw);
    let mx = fx * -iz + -fz * ix, mz = fz * -iz + fx * ix;
    const len = Math.hypot(mx, mz);
    const sprint = k.has('shift');
    const attacking = p.atk > 0;
    let target = 0;
    if (len > 0 && !this.busy) { mx /= len; mz /= len; target = sprint ? 8.2 : 4.6; p.dir.set(mx, 0, mz); }
    if (attacking) target *= 0.15;
    p.speed += (target - p.speed) * (1 - Math.exp(-10 * d));
    if (len > 0 && !attacking) p.yaw = lerpAngle(p.yaw, Math.atan2(p.dir.x, p.dir.z), 1 - Math.exp(-14 * d));
    this.moveBody(p.pos, p.dir.x * p.speed * d, p.dir.z * p.speed * d, 0.4);
    p.vy -= 20 * d; p.y = Math.max(0, p.y + p.vy * d);
    if (p.y === 0) p.vy = Math.max(0, p.vy);
    this.placePlayer(d);
    if (p.speed > 6 && p.y === 0 && Math.random() < d * 20) this.p.emit(p.pos.clone().add(V3(0, 0.1, 0)), V3((Math.random() - 0.5), 0.6, (Math.random() - 0.5)), hdr('#c8d0ff', 0.8), { life: 0.5, size: 0.12 });
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
          if (near && !ph.warned) { ph.warned = true; this.toast(`${FIELD_ZONES[ph.dests[0].to].name}：隔壁が封鎖されている（任務を進めると開く）`); Sfx.enemy(); }
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
    const amp = Math.min(1.3, w.speed / 4.6);
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
    if (p.atk > 0) {
      const at = 0.45 - p.atk;
      const blend = (pose, w) => { for (const k of POSE_KEYS) P[k] = lerp(P[k], pose[k] || 0, w); };
      if (at < 0.14) blend(POSES.windup, at / 0.14);
      else if (at < 0.26) { blend(POSES.windup, 1); blend(POSES.strike, (at - 0.14) / 0.12); }
      else { blend(POSES.strike, 1 - (at - 0.26) / 0.19); }
    }
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
    const at = p.pos.clone().addScaledVector(fwd, 1.1).add(V3(0, 1.0, 0));
    this.fx.slash(at, col, { cam: this.camera, size: 2.2 });
    this.p.burst(at, col, 14, { speed: 3, life: 0.35, size: 0.08 });
    for (const g of this.groups) {
      if (!g.alive) continue;
      const to = g.pos.clone().sub(p.pos); const dist = to.length();
      if (dist < 2.2 + g.model.radius * 0.6 && to.normalize().dot(fwd) > 0.1) {
        g.model.flash('#ffffff', 1.5); Sfx.hit(); GFX.shake(0.15);
        this.encounter(g, 'player');
        return;
      }
    }
    for (const c of this.crystals) {
      if (c.broken || c.pos.distanceTo(p.pos) > 1.9) continue;
      c.broken = true; c.g.visible = false; this.s.set(this.s.broken, this.zoneId).add(c.id);
      this.fx.shards(c.pos.clone().add(V3(0, 0.9, 0)), '#9d8cff', 16, 4);
      this.fx.sprite(c.pos.clone().add(V3(0, 0.9, 0)), '#9d8cff', 2.5, 0.4);
      Sfx.brk();
      if (Save.data.tp < 5) { Save.data.tp++; Save.save(); this.toast('秘技ポイント +1'); } else this.toast('秘技ポイントは最大です');
      this.renderHud();
    }
  }
  useTechnique() {
    if (this.busy) return;
    const key = this.team[this.leader].key, c = CHARS[key];
    if (this.techs.has(key)) { this.toast(`${c.name}の秘技はすでに準備済みです`); return; }
    if (Save.data.tp < 1) { this.toast('秘技ポイントが足りません（結晶を壊すと回復）'); return; }
    Save.data.tp--; Save.save();
    this.techs.add(key);
    const col = ELEMENTS[c.elem].color, pos = this.player.pos;
    this.fx.pillar(pos, col, { h: 5, r: 0.7, life: 0.7, k: 1.5 });
    this.fx.ring(pos.clone().add(V3(0, 0.05, 0)), col, { r: 2.5, life: 0.6 });
    this.p.burst(pos.clone().add(V3(0, 1, 0)), col, 50, { speed: 4, life: 0.8, up: 0.8 });
    this.player.m.flash(col, 0.8);
    Sfx.ult();
    this.toast(`秘技「${c.technique.name}」：次の戦闘開始時に発動`);
    this.renderHud(); this.renderTeam();
  }

  // ============================================================
  //  調べる・話す
  // ============================================================
  nearestInteract() {
    const p = this.player.pos, Z = this.zone;
    for (const n of this.npcs) if (n.pos.distanceTo(p) < 2.2) return { type: 'npc', n, text: `${speakerName(n.key)}と話す` };
    for (const n of this.notes) if (n.pos.distanceTo(p) < 2.0) return { type: 'note', n, text: `調べる：${n.title}` };
    for (const c of this.chests) if (!c.opened && c.pos.distanceTo(p) < 2.0) return { type: 'chest', c, text: '宝箱を開ける' };
    const same = (x, z) => Math.abs(this.gy(x, z) - p.y) < 1.5;
    if (Math.hypot(p.x - Z.anchor[0], p.z - Z.anchor[1]) < 2.6 && same(Z.anchor[0], Z.anchor[1])) return { type: 'anchor', text: '時空アンカー：HP回復／区画マップ' };
    if (Z.portal && Math.hypot(p.x - Z.portal[0], p.z - Z.portal[1]) < 3.0 && same(Z.portal[0], Z.portal[1])) return { type: 'portal', text: '任務へ向かう（ステージ選択）' };
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
      const n = it.n; this.startTalk(speakerName(n.key), n.lines, n);
    } else if (it.type === 'note') {
      this.startTalk(it.n.title, [it.n.text], null, true);
    } else if (it.type === 'chest') {
      const c = it.c; c.opened = true;
      const all = Save.data.fieldChests || (Save.data.fieldChests = {});
      (all[this.zoneId] = all[this.zoneId] || []).push(c.id);
      const jade = 20 + Math.floor(Math.random() * 7) * 5, exp = 300;
      Save.data.jade += jade; Save.data.expPool += exp; Save.save();
      GFX.tween(0.5, t => { c.lid.rotation.x = -1.9 * t; }, Ease.back);
      c.glow.visible = false;
      this.fx.pillar(c.pos, '#ffd66b', { h: 4, r: 0.5, life: 0.8 });
      this.p.burst(c.pos.clone().add(V3(0, 0.7, 0)), '#ffd66b', 60, { speed: 4, up: 1.2, life: 1.0 });
      Sfx.win();
      this.toast(`宝箱：星玉 +${jade}　旅情の記録 +${exp}`);
      this.renderHud();
    } else if (it.type === 'anchor') {
      this.team.forEach(m => { m.hpRatio = 1; });
      const Z = this.zone;
      this.fx.ring(V3(Z.anchor[0], this.gy(Z.anchor[0], Z.anchor[1]) + 0.05, Z.anchor[1]), '#6fd6ff', { r: 3, life: 0.8 });
      this.p.burst(this.player.pos.clone().add(V3(0, 1, 0)), '#6dff9e', 50, { speed: 2, up: 2, life: 1 });
      Sfx.heal();
      this.toast('チーム全員のHPが回復した');
      this.renderTeam();
      this.mapMenu();
    } else if (it.type === 'portal') {
      this.leave(() => App.go(StageScreen, this.ci, CHAPTERS[this.ci].stages[0].id));
    } else if (it.type === 'lift') this.rideLift(it.L);
    else if (it.type === 'call') { this.moveLift(it.L, it.lv); this.toast('エレベーターを呼んだ'); }
    else if (it.type === 'cabin') this.cabinMenu(it.g);
  }
  startTalk(name, lines, npc, isNote) {
    this.busy = true; this.keys.clear();
    this.talk = { lines, i: 0, npc };
    const el = this.root.querySelector('.fd-talk');
    el.classList.remove('hidden'); el.classList.toggle('note', !!isNote);
    el.querySelector('.fd-talk-name').textContent = name;
    if (npc) { npc.m.setPose(POSES.talk || POSES.idle); }
    this.showTalkLine();
    Sfx.select();
  }
  showTalkLine() {
    const el = this.root.querySelector('.fd-talk'), t = this.talk;
    el.querySelector('.fd-talk-text').textContent = t.lines[t.i];
    el.querySelector('.fd-talk-next').textContent = t.i < t.lines.length - 1 ? '▼ F' : '× F';
  }
  advanceTalk() {
    const t = this.talk;
    t.i++;
    if (t.i >= t.lines.length) {
      this.root.querySelector('.fd-talk').classList.add('hidden');
      if (t.npc) t.npc.m.setPose(POSES.idle);
      this.talk = null; this.busy = false;
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
      } else if (n.pos.distanceTo(pp) < 6) {
        n.yaw = lerpAngle(n.yaw, Math.atan2(pp.x - n.pos.x, pp.z - n.pos.z), 1 - Math.exp(-5 * d));
      }
      if (n.walk && !(this.talk && this.talk.npc === n)) this.walkPose(n, d, false);
      n.m.group.position.set(n.pos.x, n.pos.y, n.pos.z);
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
      techs, ambush, bg: this.ch.bg, canRetry: false, waves: g.waves, loc: typeof ZONE_ARENAS !== 'undefined' ? ZONE_ARENAS[this.zoneId] : null,
      title: `探索　${this.zone.name}`,
      onResult: res => this.battleResult(g, res),
      onExit: res => this.backFromBattle(g, res),
    });
    b.start();
  }

  battleResult(g, res) {
    res.team.forEach((t, i) => { this.team[i].hpRatio = t.hpRatio; this.team[i].energy = t.energy; });
    if (!res.win) return '<div class="dim">時空アンカーまで撤退する…</div>';
    const d = Save.data, exp = Math.round((60 + g.lv * 28) * g.waves.length);
    d.expPool += g.lv * 8;
    let html = '';
    if (g.elite) { d.jade += 20; html += '<div class="rw"><i class="ic-jade"></i>星玉 +20（強敵）</div>'; }
    html += `<div class="rw"><i class="ic-exp"></i>旅情の記録 +${g.lv * 8}</div>`;
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
      setTimeout(() => this.toast('全滅した…時空アンカーで態勢を立て直した'), 400);
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
      <div class="fd-zone"><small>第${this.ci + 1}章　${this.ch.name}</small><b>${this.zone.name}</b><em class="fd-safe hidden">安全エリア　敵は現れない</em></div>
      ${q ? `<div class="fd-quest"><small>開拓任務</small><div>◆ ${q.step.g}<b class="fd-qd"></b></div>${q.via ? `<em>→ ${q.lift ? 'エレベーターで' : ''}${q.via}へ進む</em>` : ''}</div>` : ''}
      <div class="fd-tr">
        <div class="currency"></div>
        <button class="ctl" data-map title="区画マップ (M)">MAP</button>
        <button class="ctl" data-menu title="メニュー (Esc)">≡</button>
      </div>
      <canvas class="fd-map" width="200" height="200"></canvas>
      <div class="fd-team"></div>
      <div class="fd-actions">
        <div class="fd-act"><kbd>クリック / J</kbd>攻撃・先制</div>
        <div class="fd-act tech"><kbd>E</kbd>秘技 <b class="tp"></b></div>
        <div class="fd-act"><kbd>Shift</kbd>ダッシュ</div>
        <div class="fd-act"><kbd>M</kbd>区画マップ</div>
      </div>
      <div class="fd-prompt hidden"><kbd>F</kbd><span></span></div>
      <div class="fd-talk hidden"><div class="fd-talk-name"></div><div class="fd-talk-text"></div><div class="fd-talk-next"></div></div>
      <div class="fd-toasts"></div>
      <div class="fd-title"></div>
      <div class="fd-banner"></div>
      <div class="fd-wipe"></div>
      <div class="fd-help">WASD 移動 ／ ドラッグ 視点 ／ ホイール ズーム ／ F 調べる・話す${this.T ? '・エレベーター' : ''} ／ 1〜4 操作キャラ切替</div>
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

    let down = null;
    r.addEventListener('pointerdown', e => {
      if (e.button !== 0 || e.target.closest('button, .fd-team, .overlay, .fd-map, .fd-talk')) return;
      down = { x: e.clientX, y: e.clientY, moved: 0 }; r.setPointerCapture(e.pointerId);
    });
    r.addEventListener('pointermove', e => {
      if (!down) return;
      const dx = e.clientX - down.x, dy = e.clientY - down.y;
      down.moved += Math.abs(dx) + Math.abs(dy); down.x = e.clientX; down.y = e.clientY;
      this.camYaw -= dx * 0.006; this.camPitch = clamp(this.camPitch + dy * 0.004, -0.05, 1.1);
    });
    r.addEventListener('pointerup', () => { if (down && down.moved < 6) this.attack(); down = null; });
    r.addEventListener('wheel', e => { this.camDist = clamp(this.camDist + e.deltaY * 0.004, 3, 11); e.preventDefault(); }, { passive: false });
    r.querySelector('[data-menu]').onclick = () => this.menu();
    r.querySelector('[data-map]').onclick = () => this.mapMenu();
    r.querySelector('.fd-talk').onclick = () => this.talk && this.advanceTalk();
    this.renderHud(); this.renderTeam();
  }

  renderHud() {
    const d = Save.data;
    this.root.querySelector('.currency').innerHTML =
      `<span class="c-item"><i class="ic-jade"></i>${fmt(d.jade)}</span><span class="c-item"><i class="ic-tp"></i>${d.tp}/5</span>`;
    this.root.querySelector('.fd-act.tech .tp').textContent = `${d.tp}/5`;
  }
  renderTeam() {
    const el = this.root.querySelector('.fd-team');
    el.innerHTML = this.team.map((m, i) => `
      <div class="fd-mem ${i === this.leader ? 'on' : ''} ${m.hpRatio <= 0 ? 'dead' : ''}" data-i="${i}" style="--c:${ELEMENTS[CHARS[m.key].elem].color}">
        <div class="fd-face">${avatarSVG(m.key)}</div>
        <span class="fd-key">${i + 1}</span>
        ${this.techs.has(m.key) ? '<span class="fd-tech">秘技</span>' : ''}
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
  closeOverlay() { this.root.querySelector('.overlay').classList.add('hidden'); this.busy = false; this.overlayOpen = false; }
  menu() {
    const o = this.root.querySelector('.overlay');
    if (this.overlayOpen) { this.closeOverlay(); return; }
    if (this.busy) return;
    this.busy = true; this.overlayOpen = true; this.keys.clear();
    const left = this.groups.filter(g => g.alive).length, chests = this.chests.filter(c => !c.opened).length;
    o.innerHTML = `<div class="ov-box"><h2>探索メニュー</h2>
      <div class="dim">${this.zone.name}：${this.town ? '安全エリア' : `残りの敵 ${left}`} ／ 未開封の宝箱 ${chests}</div>
      <button class="btn gold" data-m="resume">探索を続ける</button>
      <button class="btn" data-m="map">区画マップ</button>
      <button class="btn" data-m="recap">あらすじ</button>
      <button class="btn" data-m="stage">任務へ（ステージ選択）</button>
      <button class="btn" data-m="hub">列車に戻る</button></div>`;
    o.classList.remove('hidden');
    o.querySelector('[data-m=resume]').onclick = () => this.closeOverlay();
    o.querySelector('[data-m=map]').onclick = () => { this.closeOverlay(); this.mapMenu(); };
    o.querySelector('[data-m=recap]').onclick = () => renderRecap(o, () => this.closeOverlay(),
      id => this.leave(() => App.go(DialogueScreen, id, () => App.go(FieldScreen, this.ci))));
    o.querySelector('[data-m=stage]').onclick = () => this.leave(() => App.go(StageScreen, this.ci, CHAPTERS[this.ci].stages[0].id));
    o.querySelector('[data-m=hub]').onclick = () => this.leave(() => App.go(HubScreen));
  }
  // 区画マップ：訪れた区画の時空アンカーへワープできる
  mapMenu() {
    const o = this.root.querySelector('.overlay');
    if (this.overlayOpen) { this.closeOverlay(); return; }
    if (this.busy) return;
    this.busy = true; this.overlayOpen = true; this.keys.clear();
    const ids = CHAPTER_ZONES[this.ci], visited = Save.data.fieldVisited || {};
    const cur = typeof Story !== 'undefined' ? Story.current() : null;
    const qz = cur && cur.step.t === 'field' && cur.step.ci === this.ci ? cur.step.zone : null;
    // 簡易レイアウト：BFS の深さで列、同じ深さで行
    const depth = { [ids[0]]: 0 }, q = [ids[0]];
    while (q.length) { const z = q.shift(); for (const e of FIELD_ZONES[z].exits) if (!(e.to in depth)) { depth[e.to] = depth[z] + 1; q.push(e.to); } }
    const cols = {}; ids.forEach(id => (cols[depth[id]] = cols[depth[id]] || []).push(id));
    const pos = {}; Object.entries(cols).forEach(([dp, list]) => list.forEach((id, i) => { pos[id] = { x: 90 + dp * 170, y: 160 + (i - (list.length - 1) / 2) * 120 }; }));
    const W = 90 + (Math.max(...Object.keys(cols).map(Number)) + 1) * 170;
    const lines = []; ids.forEach(id => FIELD_ZONES[id].exits.forEach(e => { if (id < e.to) lines.push(`<line x1="${pos[id].x}" y1="${pos[id].y}" x2="${pos[e.to].x}" y2="${pos[e.to].y}" class="${zoneOpen(e.to) && zoneOpen(id) ? '' : 'locked'}"/>`); }));
    const chestsLeft = id => FIELD_ZONES[id].chests - ((Save.data.fieldChests || {})[id] || []).length;
    o.innerHTML = `<div class="ov-box fd-mapbox"><h2>${this.ch.name}</h2>
      <div class="fd-graph" style="width:${W}px"><svg width="${W}" height="320">${lines.join('')}</svg>
      ${ids.map(id => { const Z = FIELD_ZONES[id], open = zoneOpen(id), vis = visited[id], here = id === this.zoneId;
        return `<button class="fd-node ${here ? 'here' : ''} ${open ? '' : 'locked'} ${vis ? 'vis' : ''}" data-z="${id}" style="left:${pos[id].x}px;top:${pos[id].y}px" ${open && vis && !here ? '' : 'disabled'}>
          ${qz === id ? '<i class="qm">◆</i>' : ''}<b>${Z.name}</b><small>${here ? '現在地' : !open ? '未開放' : vis ? 'ワープ可能' : '未踏'}　宝箱 ${chestsLeft(id)}</small></button>`; }).join('')}
      </div>
      <div class="dim">訪れたことのある区画の時空アンカーへワープできる</div>
      <button class="btn gold" data-close>閉じる</button></div>`;
    o.classList.remove('hidden');
    o.querySelector('[data-close]').onclick = () => this.closeOverlay();
    o.querySelectorAll('[data-z]').forEach(b => b.onclick = () => { this.closeOverlay(); this.gotoZone(b.dataset.z, { anchor: true }); });
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
    if (k === ' ') { e.preventDefault(); if (this.player.y === 0) { this.player.vy = 7; Sfx.click(); } }
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
    for (let r = 0; r < T.rows; r++) for (let c = 0; c < T.cols; c++) {
      const i = T.idx(c, r), kd = T.kind[i], x = c * s, y = r * s;
      if (kd < K.FLOOR) continue;
      const st = T.stairs.get(i), h = st ? (st.h0 + st.h1) / 2 : T.h[i];
      g.fillStyle = mix('#243054', '#6a8fd6', clamp(h / 7, 0, 1)); g.fillRect(x, y, s + 0.5, s + 0.5);
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
        if (nk < K.FLOOR) { g.strokeStyle = nk === K.WINDOW ? '#8ae0ff' : nk === K.VOID ? 'rgba(255,120,150,.7)' : 'rgba(215,228,255,.85)'; g.lineWidth = nk === K.WINDOW ? 3 : 2; }
        else if (T.kind[i] !== K.STAIR && nk !== K.STAIR && T.kind[i] !== K.LIFT && nk !== K.LIFT && Math.abs(T.h[i] - T.h[j]) > STEP) { g.strokeStyle = 'rgba(138,224,255,.55)'; g.lineWidth = 1.2; }
        else return;
        g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke();
      });
    }
    return cv;
  }
  drawMap() {
    if (this.T) { this.drawTerrainMap(); return; }
    const g = this.map, S = 200, c = S / 2, sc = 86 / Math.max(this.hw, this.hd);
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(c, c, 96, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(8,12,30,.8)'; g.fillRect(0, 0, S, S);
    const P = (x, z) => [c + x * sc, c + z * sc];
    g.fillStyle = 'rgba(160,180,255,.1)'; g.fillRect(c - this.hw * sc, c - this.hd * sc, this.hw * 2 * sc, this.hd * 2 * sc);
    if (this.town) { g.fillStyle = 'rgba(109,255,158,.1)'; g.fillRect(c - this.hw * sc, c - this.hd * sc, this.hw * 2 * sc, this.hd * 2 * sc); }
    g.strokeStyle = 'rgba(232,199,122,.45)'; g.lineWidth = 1.5; g.strokeRect(c - this.hw * sc, c - this.hd * sc, this.hw * 2 * sc, this.hd * 2 * sc);
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
    dot(this.zone.anchor[0], this.zone.anchor[1], '#6fd6ff', 4, true);
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
    const [px, py] = P(this.player.pos.x, this.player.pos.z);
    const va = -this.camYaw - Math.PI / 2;
    const cone = g.createRadialGradient(px, py, 0, px, py, 34);
    cone.addColorStop(0, 'rgba(255,255,255,.28)'); cone.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cone; g.beginPath(); g.moveTo(px, py); g.arc(px, py, 34, va - 0.5, va + 0.5); g.fill();
    g.translate(px, py); g.rotate(-this.player.yaw + Math.PI);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(0, 2.5); g.lineTo(-4.5, 5); g.fill();
    g.restore();
    g.strokeStyle = 'rgba(232,199,122,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, 96, 0, Math.PI * 2); g.stroke();
  }

  // プレイヤーを中心にしたミニマップ（北が上）
  drawTerrainMap() {
    const g = this.map, S = 200, c = S / 2, sc = 3.2, T = this.T, pp = this.player.pos;
    if (!this.mapImg) this.mapImg = this.renderTerrainMap(4);
    g.clearRect(0, 0, S, S);
    g.save();
    g.beginPath(); g.arc(c, c, 96, 0, Math.PI * 2); g.clip();
    g.fillStyle = 'rgba(6,9,22,.85)'; g.fillRect(0, 0, S, S);
    const P = (x, z) => [c + (x - pp.x) * sc, c + (z - pp.z) * sc];
    const [ox, oy] = P(-T.hw, -T.hd);
    g.drawImage(this.mapImg, ox, oy, T.hw * 2 * sc, T.hd * 2 * sc);
    for (const a of this.safe) {
      const [x, y] = P(a.x, a.z);
      g.fillStyle = 'rgba(109,255,158,.1)'; g.strokeStyle = 'rgba(109,255,158,.45)'; g.lineWidth = 1; g.setLineDash([3, 3]);
      g.beginPath(); g.arc(x, y, a.r * sc, 0, Math.PI * 2); g.fill(); g.stroke(); g.setLineDash([]);
    }
    // 別の階にあるものは薄く
    const dot = (x, y3, z, col, r, sq) => {
      const [px, py] = P(x, z); if (Math.hypot(px - c, py - c) > 100) return;
      g.globalAlpha = Math.abs(y3 - pp.y) > 2 ? 0.4 : 1; g.fillStyle = col;
      if (sq) g.fillRect(px - r, py - r, r * 2, r * 2); else { g.beginPath(); g.arc(px, py, r, 0, Math.PI * 2); g.fill(); }
      g.globalAlpha = 1;
    };
    const Z = this.zone;
    dot(Z.anchor[0], this.gy(Z.anchor[0], Z.anchor[1]), Z.anchor[1], '#6fd6ff', 4, true);
    if (Z.portal) dot(Z.portal[0], this.gy(Z.portal[0], Z.portal[1]), Z.portal[1], '#e8c77a', 5);
    this.npcs.forEach(n => dot(n.pos.x, n.pos.y, n.pos.z, '#6dff9e', 3));
    this.notes.forEach(n => dot(n.pos.x, n.pos.y, n.pos.z, '#ffffff', 2.5, true));
    this.chests.forEach(ch => { if (!ch.opened) dot(ch.pos.x, ch.pos.y, ch.pos.z, '#ffd66b', 3, true); });
    this.crystals.forEach(cr => { if (!cr.broken) dot(cr.pos.x, cr.pos.y, cr.pos.z, '#9d8cff', 2.5); });
    this.groups.forEach(gr => { if (gr.alive) dot(gr.pos.x, gr.pos.y, gr.pos.z, gr.state === 'chase' ? '#ff3040' : gr.elite ? '#ff9a4d' : '#ff6b81', gr.elite ? 4 : 3); });
    // 昇降機の床板の位置（今いる階に止まっていれば明るく）
    T.lifts.forEach(L => { const [x, y] = P(L.x, L.z); g.strokeStyle = Math.abs(L.y - pp.y) < 0.3 ? '#bff0ff' : 'rgba(191,240,255,.35)'; g.lineWidth = 1.5; g.strokeRect(x - L.w / 2 * sc + 1, y - L.d / 2 * sc + 1, L.w * sc - 2, L.d * sc - 2); });
    // 目的地（範囲外なら縁に矢印）
    if (this.quest) {
      let [qx, qy] = P(this.quest.pos.x, this.quest.pos.z);
      const dd = Math.hypot(qx - c, qy - c), pul = 6 + Math.sin(performance.now() / 200) * 2;
      if (dd > 84) {
        const a = Math.atan2(qy - c, qx - c); qx = c + Math.cos(a) * 84; qy = c + Math.sin(a) * 84;
        g.fillStyle = '#ffd66b'; g.save(); g.translate(qx, qy); g.rotate(a); g.beginPath(); g.moveTo(8, 0); g.lineTo(-4, 6); g.lineTo(-4, -6); g.fill(); g.restore();
      } else {
        g.strokeStyle = '#ffd66b'; g.lineWidth = 2; g.beginPath(); g.arc(qx, qy, pul, 0, Math.PI * 2); g.stroke();
        g.fillStyle = '#ffd66b'; g.save(); g.translate(qx, qy); g.rotate(Math.PI / 4); g.fillRect(-3.5, -3.5, 7, 7); g.restore();
      }
    }
    const va = -this.camYaw - Math.PI / 2;
    const cone = g.createRadialGradient(c, c, 0, c, c, 34);
    cone.addColorStop(0, 'rgba(255,255,255,.28)'); cone.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = cone; g.beginPath(); g.moveTo(c, c); g.arc(c, c, 34, va - 0.5, va + 0.5); g.fill();
    g.save(); g.translate(c, c); g.rotate(-this.player.yaw + Math.PI);
    g.fillStyle = '#ffffff'; g.beginPath(); g.moveTo(0, -6); g.lineTo(4.5, 5); g.lineTo(0, 2.5); g.lineTo(-4.5, 5); g.fill();
    g.restore();
    g.restore();
    g.strokeStyle = 'rgba(232,199,122,.6)'; g.lineWidth = 2; g.beginPath(); g.arc(c, c, 96, 0, Math.PI * 2); g.stroke();
    // 今いる階
    g.fillStyle = 'rgba(6,9,22,.9)'; g.fillRect(c - 18, 172, 36, 20); g.strokeStyle = 'rgba(232,199,122,.8)'; g.lineWidth = 1; g.strokeRect(c - 18, 172, 36, 20);
    g.fillStyle = '#ffe6a8'; g.font = '800 13px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(T.floorLabel(pp.y), c, 182);
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
    if (!this.busy) this.updatePlayer(d);
    else { this.animatePlayer(d, false); if (this.riding) this.placePlayer(d); }
    this.updateEnemies(d, t);
    const p = this.player;
    p.m.update(d, t);
    // 住人は近づくとこちらを向く
    this.updateNpcs(d, t);
    this.updateSafe();
    this.notes.forEach((n, i) => { n.mark.material.opacity = 0.5 + Math.sin(t * 3 + i) * 0.4; });
    this.anchor.rings.forEach((r, i) => { r.rotation.x = t * (0.8 + i * 0.5); r.rotation.y = t * (0.5 + i * 0.3); });
    this.anchor.core.rotation.y = t;
    if (this.portal) this.portal.disc.rotation.z = t * 0.6;
    const cam = this.camera.position;
    if (!this.T) this.gates.forEach(g => {
      g.arrows.forEach((a, i) => { a.scale.setScalar(0.8 + ((t * 1.5 + i * 0.33) % 1) * 0.4); });
      // カメラがゲートの光の面に近づいたら消す（画面全体が染まるのを防ぐ）
      g.face.material.opacity = 0.55 * clamp((Math.hypot(cam.x - g.x, cam.z - g.z) - 2.5) / 4, 0, 1);
    });
    this.crystals.forEach(c => { if (!c.broken) { c.gem.rotation.y = t * 1.2; c.gem.position.y = 0.9 + Math.sin(t * 2 + c.pos.x) * 0.08; } });
    this.chests.forEach(c => { if (!c.opened) c.glow.material.opacity = 0.6 + Math.sin(t * 3 + c.id) * 0.3; });
    // カメラ（壁・天井・障害物にめり込まないよう距離を縮める）
    const T = this.T, foot = p.vis ?? 0;
    const head = V3(p.pos.x, foot + p.y + 1.45, p.pos.z);
    const off = V3(Math.sin(this.camYaw) * Math.cos(this.camPitch), Math.sin(this.camPitch), Math.cos(this.camYaw) * Math.cos(this.camPitch));
    const ceil = T ? T.ceilOf(T.at(p.pos.x, p.pos.z)) - 0.45 : 1e9;
    let dist = this.camDist;
    for (let i = 1; i <= 24; i++) {
      const f = i / 24, x = head.x + off.x * this.camDist * f, y = Math.min(ceil, head.y + off.y * this.camDist * f), z = head.z + off.z * this.camDist * f;
      const prop = y - foot < 4 && this.colliders.some(c => (c.box || c.r > 0.5) && (c.top == null || y - (c.y || 0) < c.top + 0.2) && this.hitsCol(c, x, z, 0.3, T ? p.pos.y : null));
      if (prop || (T && T.blocksView(x, y, z))) { dist = Math.max(1.2, this.camDist * (f - 0.06)); break; }
    }
    this.curDist = this.curDist == null ? dist : dist < this.curDist ? dist : lerp(this.curDist, dist, 1 - Math.exp(-4 * d));
    const cp = head.clone().addScaledVector(off, this.curDist);
    cp.y = clamp(cp.y, foot + 0.35, ceil);
    this.camera.position.lerp(cp, 1 - Math.exp(-12 * d));
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
      const s = dd < 30 && (!this.T || dd > 7) && this.toScreen(g.x, this.T ? g.h + g.H + 2.2 : 6.1, g.z, v);
      g.label.style.display = s ? '' : 'none';
      if (s) g.label.style.transform = `translate(${s[0].toFixed(1)}px, ${s[1].toFixed(1)}px)`;
    }
    for (const n of this.npcs) {
      const s = n.pos.distanceTo(p.pos) < 12 && this.toScreen(n.pos.x, n.pos.y + 2.15 * (n.m.group.scale.y || 1), n.pos.z, v);
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
      q.label.textContent = onScreen ? (q.gate ? `◆ ${q.lift ? 'エレベーターで' : ''}${q.via}へ ${Math.round(dist)}m` : `◆ ${Math.round(dist)}m`) : '◆';
      if (dist >= 2.4) this.questHold = false;
      else if (!q.gate && !this.questHold && !this.busy) this.questArrive();
    }
    const it = this.busy ? null : this.nearestInteract();
    const pr = this.root.querySelector('.fd-prompt');
    pr.classList.toggle('hidden', !it);
    if (it) pr.querySelector('span').textContent = it.text;
    this.drawMap();
  }

  // 安全エリアへの出入りを表示する
  updateSafe() {
    const a = this.safeAt(this.player.pos.x, this.player.pos.z), name = a ? a.name : null;
    if (name === this.safeName) return;
    const first = this.safeName === undefined;
    this.safeName = name;
    const el = this.root.querySelector('.fd-safe');
    el.classList.toggle('hidden', !name);
    if (first) return;
    if (name) this.toast(this.town ? `${name}：人々が暮らす安全エリア` : `安全エリア：${name}`);
    else if (!this.town) this.toast('安全エリアを離れた');
  }

  dispose() {
    this.groups.forEach(g => g.label.remove());
    super.dispose();
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
function FieldScreen(ci, zoneId) {
  if (!GFX.ok) { alert('探索には WebGL（3D表示）が必要です。'); return HubScreen(); }
  if (GFX.view && GFX.view.persist) GFX.view.persist = false;
  const s = new FieldSession(ci);
  // 区画の指定がなければ、前回この章で離れた位置から再開する
  const r = Save.data.fieldResume;
  const resume = !zoneId && r && r.ci === ci && FIELD_ZONES[r.zone] && zoneOpen(r.zone) ? r : null;
  const z = zoneId || (resume ? resume.zone : CHAPTER_ZONES[ci][0]);
  const v = new FieldView(s, z, resume ? { pos: resume } : zoneId ? { anchor: true } : { spawn: true });
  v.key = 'field:' + z;
  GFX.setView(v);
  Game.activeField = v;
  setTimeout(() => { v.showZoneTitle(); v.toast(v.T ? 'WASDで移動、クリックで敵を先制攻撃。扉やエレベーターから別の区画・別の階へ進める' : 'WASDで移動、クリックで敵を先制攻撃。ゲートから別の区画へ進める'); }, 300);
  return v.root;
}

function FieldSelect() {
  const v3 = GFX.show('scene:space', () => new SceneryView('space'));
  if (v3) v3.setEnemies([]);
  const s = h(`<div class="screen field-select">${topBar('探索')}
    <div class="fs-intro"><h2>探索</h2><p>各地の区画を歩き回り、徘徊する敵との戦闘、宝箱の回収、住人との会話ができます。区画はゲートでつながっています。<br>敵に先に攻撃を当てると「先制攻撃」、敵に接触されると「奇襲」になります。</p></div>
    <div class="fs-list">${CHAPTERS.map((c, i) => {
      const open = fieldUnlocked(i), ids = CHAPTER_ZONES[i];
      const total = ids.reduce((a, id) => a + FIELD_ZONES[id].chests, 0), done = ids.reduce((a, id) => a + ((Save.data.fieldChests || {})[id] || []).length, 0);
      const zones = ids.map(id => `<span class="${zoneOpen(id) ? '' : 'off'}">${FIELD_ZONES[id].name}</span>`).join('');
      return `<button class="fs-item bg-${c.bg} ${open ? '' : 'locked'}" data-ci="${i}">
        <small>第${i + 1}章</small><b>${c.name}</b><div class="fs-zones">${zones}</div>
        <em>宝箱 ${done}/${total}　${open ? '' : '（未開放）'}</em></button>`;
    }).join('')}</div></div>`);
  wireBack(s);
  on(s, '[data-ci]', 'click', el => { if (!el.classList.contains('locked')) App.go(FieldScreen, +el.dataset.ci); });
  return s;
}

document.addEventListener('keydown', e => { if (Game.activeField) Game.activeField.onKey(e, true); });
document.addEventListener('keyup', e => { if (Game.activeField) Game.activeField.onKey(e, false); });
window.addEventListener('blur', () => { if (Game.activeField) Game.activeField.keys.clear(); });
